(() => {
  if (window.UlydiaBilling) return;

  // ---------------- utils ----------------
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

  async function fetchWithTimeout(url, opts = {}, ms = 3000){
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

  function isNetworkFetchError(e){
    const msg = String(e?.message || e || "");
    return (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("ERR_NAME_NOT_RESOLVED") ||
      msg.includes("aborted") ||
      msg.includes("AbortError")
    );
  }

  // ---------------- API base resolution ----------------
  async function resolveApiBase(opts){
    const worker = normBase(opts?.workerUrl);
    const api    = normBase(opts?.apiUrl);

    // ✅ reset cache on demand
    if (opts?.resetCache) {
      try{
        delete window.__ULYDIA_BILLING_API_BASE__;
        delete window.__ULYDIA_BILLING_API_BASE_KEY__;
      }catch(_){}
    }

    // ✅ cache keyed by config
    const key = `${worker}|${api}`;
    if (
      window.__ULYDIA_BILLING_API_BASE__ &&
      window.__ULYDIA_BILLING_API_BASE_KEY__ === key
    ) {
      return window.__ULYDIA_BILLING_API_BASE__;
    }

    // ✅ Worker FIRST, then apiUrl
    const candidates = [worker, api].filter(Boolean);

    const testBase = async (base) => {
      // We test /debug/cors on the worker (you already added it)
      const url = base + "/debug/cors";
      try{
        const r = await fetchWithTimeout(url, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
        }, 1500);
        return r.status === 200; // must be 200 for our worker route
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

    // fallback final
    window.__ULYDIA_BILLING_API_BASE__ = worker || api;
    window.__ULYDIA_BILLING_API_BASE_KEY__ = key;
    return window.__ULYDIA_BILLING_API_BASE__;
  }

  // ---------------- POST helpers ----------------
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
        "x-proxy-secret": String(proxySecret || "").trim(),
      },
      body: JSON.stringify(payload || {}),
    });

    const txt = await res.text().catch(()=> "");
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }

    if (!res.ok) {
      throw new Error(`API ${path} failed (${res.status}): ${data.error || data.message || txt || "unknown"}`);
    }
    return data;
  }

  async function postJsonSmart(primaryBase, fallbackBase, proxySecret, path, payload){
    try{
      return await postJsonOnce(primaryBase, proxySecret, path, payload);
    }catch(e){
      // only retry on genuine network fetch error
      if (fallbackBase && isNetworkFetchError(e)) {
        return await postJsonOnce(fallbackBase, proxySecret, path, payload);
      }
      throw e;
    }
  }

  // ---------------- open ----------------
  async function open(opts){
    const token = String(opts?.token || "").trim();
    const proxySecret = String(opts?.proxySecret || "").trim();
    const pk = String(opts?.stripePublishableKey || "").trim();

    const workerUrl = normBase(opts?.workerUrl);
    const apiUrl    = normBase(opts?.apiUrl || workerUrl); // ✅ default: worker

    if (!token || !proxySecret || !pk) {
      alert("Billing module: missing config (token / proxySecret / stripePublishableKey).");
      return;
    }

    const openModal = opts?.openModal || null;
    if (!openModal) { alert("No modal provided by host."); return; }

    const content = document.createElement("div");
    content.innerHTML = `
      <div style="font-weight:800;margin-bottom:10px">Enter a new card:</div>
      <div id="ub_card" style="padding:12px;border:1px solid rgba(0,0,0,.12);border-radius:12px;"></div>
      <div id="ub_err" style="margin-top:10px;color:#a10f0f;font-weight:700;"></div>
      <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end">
        <button id="ub_cancel" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;font-weight:700;cursor:pointer">Cancel</button>
        <button id="ub_save" style="padding:10px 12px;border-radius:12px;border:1px solid #c00102;background:#c00102;color:#fff;font-weight:800;cursor:pointer">Save</button>
      </div>
    `;

    const modal = openModal({ title: "Change payment method", content });
    const btnSave = content.querySelector("#ub_save");
    const btnCancel = content.querySelector("#ub_cancel");
    const err = content.querySelector("#ub_err");
    btnCancel.onclick = () => modal?.close?.();

    try{
      // ✅ choose base (worker first) + fallback
      const preferred = await resolveApiBase({ workerUrl, apiUrl, resetCache: opts?.resetCache });
      const fallback  = (preferred === workerUrl ? apiUrl : workerUrl) || workerUrl || apiUrl;

      await loadStripeJsOnce();
      const stripe = window.Stripe(pk);

      // 1) SetupIntent
      const si = await postJsonSmart(preferred, fallback, proxySecret, "/billing/setup-intent", { token });
      const clientSecret = String(si.client_secret || "");
      if (!clientSecret) throw new Error("Missing client_secret");

      // 2) Elements
      const elements = stripe.elements();
      const card = elements.create("card", { hidePostalCode: true });
      card.mount(content.querySelector("#ub_card"));

      btnSave.onclick = async () => {
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

          // 3) Set default
          await postJsonSmart(preferred, fallback, proxySecret, "/billing/set-default", {
            token,
            payment_method: pmId
          });

          modal?.close?.();
          alert("Payment method updated ✅");
        }catch(e){
          err.textContent = e?.message || "Failed";
          btnSave.disabled = false;
        }
      };

    }catch(e){
      modal?.close?.();
      alert("Payment update failed: " + (e?.message || "unknown"));
    }
  }

  window.UlydiaBilling = { open };
})();
