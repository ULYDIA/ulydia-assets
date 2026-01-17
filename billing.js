/* billing.js — Ulydia (V1.0 SAFE)
   - No auto-open
   - Opens ONLY from user click (opts.fromUserClick === true)
   - Sends correct proxy header (x-proxy-secret)
   - Forces Worker base URL (opts.apiUrl or opts.workerUrl)
*/
(() => {
  if (window.UlydiaBilling) return;

  // ---------------- helpers ----------------
  function normBase(u){ return String(u || "").trim().replace(/\/$/, ""); }

  function loadStripeJsOnce(){
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3/";
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load Stripe.js"));
      document.head.appendChild(s);
    });
  }

  async function postJson(baseUrl, proxySecret, path, payload){
    const base = normBase(baseUrl);
    const url = base + path;

    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        // ✅ IMPORTANT: worker expects this header name
        "x-proxy-secret": proxySecret,
        // optional compatibility (won’t hurt if allowed by Worker)
        "x-ulydia-proxy-secret": proxySecret,
      },
      body: JSON.stringify(payload || {}),
    });

    const txt = await res.text().catch(() => "");
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }

    if (!res.ok) {
      const msg = data.error || data.message || txt || "unknown";
      throw new Error(`API ${path} failed (${res.status}): ${msg}`);
    }
    return data;
  }

  function defaultHostModal({ title, content }){
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:999999;padding:18px;";
    const box = document.createElement("div");
    box.style.cssText =
      "background:#fff;border-radius:16px;min-width:320px;max-width:min(560px,92vw);padding:16px;border:1px solid rgba(0,0,0,.12);";
    const top = document.createElement("div");
    top.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;";
    const h = document.createElement("div");
    h.textContent = title || "Billing";
    h.style.cssText = "font-weight:900;";
    const closeBtn = document.createElement("button");
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

  // ---------------- main open ----------------
  async function open(opts){
    // ✅ MUST be user click
    if (!opts || opts.fromUserClick !== true) {
      console.warn("[Billing] blocked: open() must be triggered by user click.");
      return;
    }

    // ✅ anti rafale
    if (window.__ULYDIA_BILLING_OPENING__) {
      console.warn("[Billing] already opening, skip.");
      return;
    }
    window.__ULYDIA_BILLING_OPENING__ = true;

    const token = String(opts?.token || "").trim();
    const proxySecret = String(opts?.proxySecret || "").trim();
    const pk = String(opts?.stripePublishableKey || "").trim();

    // ✅ Force Worker only
    const base = normBase(opts?.apiUrl || opts?.workerUrl);

    try {
      if (!token || !proxySecret || !pk || !base) {
        throw new Error("Missing config (token / proxySecret / stripePublishableKey / apiUrl)");
      }

      const openModalFn = (typeof opts?.openModal === "function") ? opts.openModal : null;

      const content = document.createElement("div");
      content.innerHTML = `
        <div style="font-weight:900;margin-bottom:10px">Enter a new card:</div>
        <div id="ub_card" style="padding:12px;border:1px solid rgba(0,0,0,.12);border-radius:12px;"></div>
        <div id="ub_err" style="margin-top:10px;color:#a10f0f;font-weight:800;"></div>
        <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end">
          <button id="ub_cancel" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;font-weight:800;cursor:pointer">Cancel</button>
          <button id="ub_save" style="padding:10px 12px;border-radius:12px;border:1px solid #c00102;background:#c00102;color:#fff;font-weight:900;cursor:pointer">Save</button>
        </div>
      `;

      let modal = null;
      try{
        modal = openModalFn ? openModalFn({ title: "Change payment method", content }) : defaultHostModal({ title:"Change payment method", content });
      }catch(_e){
        modal = defaultHostModal({ title:"Change payment method", content });
      }

      const btnSave = content.querySelector("#ub_save");
      const btnCancel = content.querySelector("#ub_cancel");
      const err = content.querySelector("#ub_err");

      const closeAll = () => {
        try{ modal?.close?.(); }catch(_){}
      };
      btnCancel.onclick = () => { closeAll(); };

      await loadStripeJsOnce();
      const stripe = window.Stripe(pk);

      // 1) SetupIntent (Worker)
      const si = await postJson(base, proxySecret, "/billing/setup-intent", { token });
      const clientSecret = String(si.client_secret || "");
      if (!clientSecret) throw new Error("Missing client_secret");

      // 2) Elements
      const elements = stripe.elements();
      const card = elements.create("card", { hidePostalCode: true });
      card.mount(content.querySelector("#ub_card"));

      btnSave.onclick = async () => {
        if (btnSave.disabled) return;
        try{
          btnSave.disabled = true;
          err.textContent = "";

          const result = await stripe.confirmCardSetup(clientSecret, { payment_method: { card } });
          if (result.error) {
            err.textContent = result.error.message || "Card error";
            btnSave.disabled = false;
            return;
          }

          const pmId = result.setupIntent?.payment_method;
          if (!pmId) throw new Error("Missing payment_method id");

          // 3) set default (Worker)
          await postJson(base, proxySecret, "/billing/set-default", { token, payment_method: pmId });

          closeAll();
          alert("Payment method updated ✅");
        }catch(e){
          err.textContent = e?.message || "Failed";
          btnSave.disabled = false;
        }
      };

    } catch (e) {
      alert("Payment update failed: " + (e?.message || "unknown"));
    } finally {
      window.__ULYDIA_BILLING_OPENING__ = false;
    }
  }

  window.UlydiaBilling = { open };
})();
