/* billing.js — Ulydia (V1.0 SAFE)
   - Uses Stripe SetupIntent + confirmCardSetup
   - Calls your Worker endpoints:
       POST /billing/setup-intent   { token }
       POST /billing/set-default    { token, payment_method }
   - Sends ONLY: x-proxy-secret (CORS friendly)
   - No duplicate open(), no opts scope bugs
*/
(() => {
  if (window.UlydiaBilling) return;

  // ----------------------------
  // Internal state (fixes opts scope)
  // ----------------------------
  let __BILLING_OPTS__ = null;

  // ----------------------------
  // Helpers
  // ----------------------------
  function normBase(u){ return String(u || "").trim().replace(/\/$/, ""); }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function loadStripeJsOnce(){
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(true);
      const existing = document.querySelector('script[src^="https://js.stripe.com/v3"]');
      if (existing) {
        // Stripe.js is loading already
        existing.addEventListener("load", () => resolve(true), { once:true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Stripe.js")), { once:true });
        return;
      }
      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3/";
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load Stripe.js"));
      document.head.appendChild(s);
    });
  }

  async function fetchText(url, options){
    const res = await fetch(url, options);
    const txt = await res.text().catch(() => "");
    return { res, txt };
  }

  async function postJson(baseUrl, proxySecret, path, payload){
    const base = normBase(baseUrl);
    const url  = base + path;

    const { res, txt } = await fetchText(url, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-proxy-secret": String(proxySecret || "").trim(),
      },
      body: JSON.stringify(payload || {}),
    });

    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }

    if (!res.ok) {
      const msg = data?.error || data?.message || txt || "unknown";
      throw new Error(`API ${path} failed (${res.status}): ${msg}`);
    }
    return data;
  }

  // Small default modal if host didn't provide one
  function defaultHostModal({ title, content }){
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:999999;padding:18px;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#fff;border-radius:16px;min-width:320px;max-width:min(560px,92vw);padding:16px;border:1px solid rgba(0,0,0,.12);";

    const top = document.createElement("div");
    top.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:12px;";

    const h = document.createElement("div");
    h.textContent = title || "Billing";
    h.style.cssText = "font-weight:900;";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.style.cssText =
      "padding:8px 10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;font-weight:800;cursor:pointer;";

    top.appendChild(h);
    top.appendChild(closeBtn);
    box.appendChild(top);
    box.appendChild(content);
    wrap.appendChild(box);
    document.body.appendChild(wrap);

    function close(){ try{ wrap.remove(); }catch(_){} }
    closeBtn.onclick = close;
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });

    return { close };
  }

  function setBusy(btn, on){
    if (!btn) return;
    btn.disabled = !!on;
    btn.style.opacity = on ? "0.7" : "1";
    btn.style.cursor  = on ? "not-allowed" : "pointer";
  }

  // ----------------------------
  // Main
  // ----------------------------
  async function open(opts){
    __BILLING_OPTS__ = opts || {};
    const o = __BILLING_OPTS__;

    // Anti double-open
    if (window.__ULYDIA_BILLING_OPENING__) return;
    window.__ULYDIA_BILLING_OPENING__ = true;

    const token       = String(o?.token || "").trim();
    const proxySecret = String(o?.proxySecret || "").trim();
    const pk          = String(o?.stripePublishableKey || "").trim();

    // Prefer apiUrl, fallback workerUrl
    const base = normBase(o?.apiUrl || o?.workerUrl);

    if (!token || !proxySecret || !pk || !base) {
      window.__ULYDIA_BILLING_OPENING__ = false;
      alert("Billing module: missing config (token / proxySecret / stripePublishableKey / apiUrl).");
      return;
    }

    // host modal if provided
    const openModalFn = (typeof o?.openModal === "function") ? o.openModal : null;

    // Build UI
    const content = document.createElement("div");
    content.innerHTML = `
      <div style="font-weight:900;margin-bottom:10px">Enter a new card:</div>
      <div id="ub_card" style="padding:12px;border:1px solid rgba(0,0,0,.12);border-radius:12px;"></div>
      <div id="ub_err" style="margin-top:10px;color:#a10f0f;font-weight:800;min-height:18px"></div>
      <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end">
        <button id="ub_cancel" type="button" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;font-weight:800;cursor:pointer">Cancel</button>
        <button id="ub_save" type="button" style="padding:10px 12px;border-radius:12px;border:1px solid #c00102;background:#c00102;color:#fff;font-weight:900;cursor:pointer">Save</button>
      </div>
    `;

    let modal = null;
    try{
      modal = openModalFn
        ? openModalFn({ title: "Change payment method", content })
        : defaultHostModal({ title:"Change payment method", content });
    }catch(_e){
      modal = defaultHostModal({ title:"Change payment method", content });
    }

    const btnSave   = content.querySelector("#ub_save");
    const btnCancel = content.querySelector("#ub_cancel");
    const errEl     = content.querySelector("#ub_err");

    const closeAll = () => {
      try{ modal?.close?.(); }catch(_){}
      window.__ULYDIA_BILLING_OPENING__ = false;
    };

    btnCancel.onclick = closeAll;

    try{
      // Make sure Stripe.js is loaded
      await loadStripeJsOnce();

      // Extra tiny delay can help Safari in some cases (optional)
      await sleep(0);

      const stripe = window.Stripe(pk);

      // 1) Create SetupIntent on your Worker
      const si = await postJson(base, proxySecret, "/billing/setup-intent", { token });
      const clientSecret = String(si?.client_secret || "");
      if (!clientSecret) throw new Error("Missing client_secret from /billing/setup-intent");

      // 2) Mount card element
      const elements = stripe.elements();
      const card = elements.create("card", { hidePostalCode: true });
      card.mount(content.querySelector("#ub_card"));

      // 3) Save handler
      btnSave.onclick = async () => {
        const oo = __BILLING_OPTS__ || {};
        const base2 = normBase(oo?.apiUrl || oo?.workerUrl) || base;

        if (btnSave.disabled) return;
        setBusy(btnSave, true);
        errEl.textContent = "";

        try{
          const result = await stripe.confirmCardSetup(clientSecret, {
            payment_method: { card }
          });

          if (result?.error) {
            errEl.textContent = result.error.message || "Card error";
            setBusy(btnSave, false);
            return;
          }

          const pmId = result?.setupIntent?.payment_method;
          if (!pmId) throw new Error("Missing payment_method id from Stripe");

          // 4) Set default payment method on your Worker
          await postJson(base2, proxySecret, "/billing/set-default", {
            token,
            payment_method: pmId
          });

          closeAll();
          alert("Payment method updated ✅");
        }catch(e){
          errEl.textContent = String(e?.message || e || "Failed");
          setBusy(btnSave, false);
        }
      };

    }catch(e){
      closeAll();
      alert("Payment update failed: " + String(e?.message || e || "unknown"));
    }
  }

  window.UlydiaBilling = { open };
})();
