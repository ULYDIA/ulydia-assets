(() => {
  if (window.UlydiaBilling) return;

  function apiBase(workerUrl){ return String(workerUrl||"").replace(/\/$/, ""); }

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

async function postJson(workerUrl, proxySecret, path, payload){
  const base = String(workerUrl || "").trim().replace(/\/$/, "");
  const url  = base + path;

  let res, txt = "";
  try{
    res = await fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-proxy-secret": proxySecret,
      },
      body: JSON.stringify(payload || {}),
    });
    txt = await res.text().catch(()=> "");
  }catch(e){
    // Ici : CSP / blocage navigateur / réseau / extension
    throw new Error(`Fetch blocked (network/CSP) on ${url}: ${e?.message || e}`);
  }

  let data = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }

  if (!res.ok) {
    throw new Error(`API ${path} failed (${res.status}): ${data.error || data.message || txt || "unknown"}`);
  }

  return data;
}


  async function open(opts){
    const token = String(opts?.token || "").trim();
    const workerUrl = String(opts?.workerUrl || "").trim();
    const proxySecret = String(opts?.proxySecret || "").trim();
    const pk = String(opts?.stripePublishableKey || "").trim();
    if (!token || !workerUrl || !proxySecret || !pk) {
      alert("Billing module: missing config.");
      return;
    }

    // modal: soit tu utilises celui du host, soit fallback simple
    const openModal = opts.openModal || null;

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

    let modal = null;
    if (openModal) {
      modal = openModal({ title: "Change payment method", content });
    } else {
      // fallback minimal si pas de modal host
      alert("No modal provided by host. (You can pass openModal.)");
      return;
    }

    try{
      await loadStripeJsOnce();
      const stripe = window.Stripe(pk);

      // 1) SetupIntent
      const si = await postJson(workerUrl, proxySecret, "/billing/setup-intent", { token });
      const clientSecret = String(si.client_secret || "");
      if (!clientSecret) throw new Error("Missing client_secret");

      // 2) Elements
      const elements = stripe.elements();
      const card = elements.create("card", { hidePostalCode: true });
      card.mount(content.querySelector("#ub_card"));

      const btnSave = content.querySelector("#ub_save");
      const btnCancel = content.querySelector("#ub_cancel");
      const err = content.querySelector("#ub_err");

      btnCancel.onclick = () => modal?.close?.();

      btnSave.onclick = async () => {
        try{
          btnSave.disabled = true;
          err.textContent = "";

          const result = await stripe.confirmCardSetup(clientSecret, {
            payment_method: { card }
          });

          if (result.error) {
            err.textContent = result.error.message || "Card error";
            btnSave.disabled = false;
            return;
          }

          const pmId = result.setupIntent?.payment_method;
          if (!pmId) throw new Error("Missing payment_method id");

          await postJson(workerUrl, proxySecret, "/billing/set-default", {
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
