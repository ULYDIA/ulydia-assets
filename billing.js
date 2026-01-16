(() => {
  if (window.UlydiaBilling) return;
  // 🔒 hard safety: never allow TEST_SECRET / api.ulydia.com in prod
  if (location.hostname.endsWith("ulydia.com")) {
    if (String(opts?.proxySecret || "").includes("TEST")) {
      throw new Error("Billing blocked: TEST_SECRET detected in production.");
    }
  }

  // -------------------------
  // utils
  // -------------------------
  function normBase(u){ return String(u||"").trim().replace(/\/$/, ""); }

  function setText(el, txt){
    if (!el) return;
    el.textContent = String(txt || "");
  }

  function isNetworkFetchError(e){
    const msg = String(e?.message || e || "");
    return (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("ERR_NAME_NOT_RESOLVED") ||
      msg.includes("aborted") ||
      msg.includes("AbortError") ||
      msg.includes("The user aborted a request")
    );
  }

  function loadStripeJsOnce(){
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(true);

      // avoid double insert
      const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once:true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Stripe.js")), { once:true });
        return;
      }

      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3/";
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load Stripe.js"));
      document.head.appendChild(s);
    });
  }

  async function fetchWithTimeout(url, opts = {}, ms = 4000){
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try{
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      return res;
    }catch(e){
      clearTimeout(t);
      throw e;
    }
  }

  // -------------------------
  // base resolver (Worker-first strict)
  // -------------------------
  async function resolveApiBase(opts){
    const worker = normBase(opts?.workerUrl);
    const api    = normBase(opts?.apiUrl || "");

    const key = `${worker}|${api}|${opts?.preferWorker === false ? "apiFirst" : "workerFirst"}`;

    if (opts?.resetCache) {
      try { delete window.__ULYDIA_BILLING_API_BASE__; } catch(_){}
      try { delete window.__ULYDIA_BILLING_API_BASE_KEY__; } catch(_){}
    }

    if (window.__ULYDIA_BILLING_API_BASE__ && window.__ULYDIA_BILLING_API_BASE_KEY__ === key) {
      return window.__ULYDIA_BILLING_API_BASE__;
    }

    const preferWorker = (opts?.preferWorker !== false); // default true

    // candidates order
    const candidates = preferWorker
      ? [worker, api].filter(Boolean)
      : [api, worker].filter(Boolean);

    // strict test: must return 200 on /debug/cors
    const testBase = async (base) => {
      const url = base + "/debug/cors";
      try{
        const r = await fetchWithTimeout(url, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
        }, 2500);
        return r.status === 200;
      }catch(_e){
        return false;
      }
    };

    for (const b of candidates){
      if (await testBase(b)){
        window.__ULYDIA_BILLING_API_BASE__ = b;
        window.__ULYDIA_BILLING_API_BASE_KEY__ = key;
        return b;
      }
    }

    // fallback: if worker exists, keep worker; else api; else empty
    const chosen = worker || api || "";
    window.__ULYDIA_BILLING_API_BASE__ = chosen;
    window.__ULYDIA_BILLING_API_BASE_KEY__ = key;
    return chosen;
  }

  // -------------------------
  // API helpers
  // -------------------------
  async function postJsonOnce(baseUrl, proxySecret, path, payload){
    const base = normBase(baseUrl);
    const url  = base + path;

    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-proxy-secret": String(proxySecret || ""),
      },
      body: JSON.stringify(payload || {}),
    });

    const txt = await res.text().catch(()=> "");
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }

    if (!res.ok) {
      // keep server message
      throw new Error(`API ${path} failed (${res.status}): ${data.error || data.message || txt || "unknown"}`);
    }
    return data;
  }

  // Worker-first: fallback ONLY on network errors (never on 401/403/500 etc.)
  async function postJsonWorkerFirst(basePrimary, baseFallback, proxySecret, path, payload){
    try{
      return await postJsonOnce(basePrimary, proxySecret, path, payload);
    }catch(e){
      if (baseFallback && isNetworkFetchError(e)) {
        return await postJsonOnce(baseFallback, proxySecret, path, payload);
      }
      throw e;
    }
  }

  // -------------------------
  // UI
  // -------------------------
  function buildContent(){
    const content = document.createElement("div");
    content.innerHTML = `
      <div style="font-weight:900;margin-bottom:10px">Enter a new card:</div>
      <div id="ub_card" style="padding:12px;border:1px solid rgba(0,0,0,.12);border-radius:12px;"></div>
      <div id="ub_err" style="margin-top:10px;color:#a10f0f;font-weight:800;min-height:18px;"></div>

      <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;align-items:center">
        <div id="ub_hint" style="margin-right:auto;color:rgba(0,0,0,.55);font-weight:800;font-size:12px"></div>
        <button id="ub_cancel" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;font-weight:800;cursor:pointer">Cancel</button>
        <button id="ub_save" style="padding:10px 12px;border-radius:12px;border:1px solid #c00102;background:#c00102;color:#fff;font-weight:900;cursor:pointer">Save</button>
      </div>
    `;
    return content;
  }

  // -------------------------
  // main
  // -------------------------
  async function open(opts){
    const token = String(opts?.token || "").trim();
    const proxySecret = String(opts?.proxySecret || "").trim();
    const pk = String(opts?.stripePublishableKey || "").trim();

    const workerUrl = normBase(opts?.workerUrl);
    const apiUrl    = normBase(opts?.apiUrl || "");

    if (!token || !proxySecret || !pk) {
      alert("Billing module: missing config (token / proxySecret / stripePublishableKey).");
      return;
    }
    if (!workerUrl && !apiUrl) {
      alert("Billing module: missing workerUrl/apiUrl.");
      return;
    }

    const openModal = opts?.openModal || null;
    if (!openModal) { alert("Billing module: host modal missing."); return; }

    const content = buildContent();
    const modal = openModal({ title: "Change payment method", content });

    const btnSave = content.querySelector("#ub_save");
    const btnCancel = content.querySelector("#ub_cancel");
    const errEl = content.querySelector("#ub_err");
    const hintEl = content.querySelector("#ub_hint");
    const cardMount = content.querySelector("#ub_card");

    btnCancel.onclick = () => modal?.close?.();

    // STRATEGY:
    // - choose base (prefer worker)
    // - use apiUrl only as network fallback (optional)
    const resolvedBase = await resolveApiBase({
      ...opts,
      preferWorker: true,         // ✅ strict worker-first
      resetCache: !!opts.resetCache,
    });

    // primary = resolvedBase, fallback = "other"
    const primary = resolvedBase || workerUrl || apiUrl;
    const fallback = (primary === workerUrl ? apiUrl : workerUrl) || "";

    setText(hintEl, `Using: ${primary.replace(/^https?:\/\//, "")}`);

    try{
      await loadStripeJsOnce();
      const stripe = window.Stripe(pk);

      // 1) SetupIntent
      btnSave.disabled = true;
      setText(errEl, "");
      setText(hintEl, `Creating secure session…`);

      const si = await postJsonWorkerFirst(primary, fallback, proxySecret, "/billing/setup-intent", { token });
      const clientSecret = String(si.client_secret || "");
      if (!clientSecret) throw new Error("Missing client_secret");

      // 2) Stripe Elements
      setText(hintEl, `Enter card details…`);
      const elements = stripe.elements();
      const card = elements.create("card", { hidePostalCode: true });
      card.mount(cardMount);

      btnSave.disabled = false;

      btnSave.onclick = async () => {
        try{
          btnSave.disabled = true;
          setText(errEl, "");
          setText(hintEl, `Confirming with Stripe…`);

          const result = await stripe.confirmCardSetup(clientSecret, { payment_method: { card } });
          if (result.error) {
            setText(errEl, result.error.message || "Card error");
            btnSave.disabled = false;
            setText(hintEl, "");
            return;
          }

          const pmId = result.setupIntent?.payment_method;
          if (!pmId) throw new Error("Missing payment_method id");

          setText(hintEl, `Saving as default…`);

          // 3) Set default PM
          await postJsonWorkerFirst(primary, fallback, proxySecret, "/billing/set-default", {
            token,
            payment_method: pmId
          });

          modal?.close?.();
          alert("Payment method updated ✅");
        }catch(e){
          setText(errEl, e?.message || "Failed");
          setText(hintEl, "");
          btnSave.disabled = false;
        }
      };

    }catch(e){
      // Keep modal open and show error
      setText(errEl, e?.message || "Payment update failed");
      setText(hintEl, "");
      btnSave.disabled = false;
    }
  }

  window.UlydiaBilling = { open };
})();
