/* metier-page — INDICATORS.PATCH12.clean (SAFE)
   Fills KPI placeholders from Metier_Pays_Blocs:
   - #js-chip-remote_level      <- Remote_level / remote_level / remote
   - #js-chip-automation_risk   <- Automation_risk / automation_risk / automation
   Also supports existing KPI text fields if you have ids:
   - #js-chip-currency
   - #js-chip-time_to_employability
   - #js-chip-growth_outlook
   - #js-chip-market_demand
*/
(() => {
  if (window.__ULYDIA_INDICATORS_PATCH12__) return;
  window.__ULYDIA_INDICATORS_PATCH12__ = true;

  const norm = (x) => String(x || "").replace(/\u00a0/g," ").trim();

  function textSummary(htmlOrText){
    const s = String(htmlOrText || "");
    if (!s) return "";
    const t = s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r]+/g, " ")
      .trim();
    const first = (t.split("\n").map(x=>x.trim()).filter(Boolean)[0] || "").trim();
    return first || t;
  }

  function getBlocFields(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAYS_BLOC__ || null;
    if (!b) return null;
    return b.fieldData || b.fields || b;
  }

  function setText(id, val){
    const el = document.getElementById(id);
    const v = norm(val);
    if (!el || !v) return false;
    el.textContent = v;
    return true;
  }

  function showCard(){
    const hs = document.querySelectorAll(".card-header .section-title, .section-title");
    for (const h of hs) {
      const t = norm(h.textContent);
      if (t && t.toLowerCase().includes("indicateurs clés")) {
        const card = h.closest(".card") || h.closest("section") || h.closest("div");
        if (card) card.style.display = "";
      }
    }
  }

  function render(ctx){
    const b = getBlocFields(ctx);
    if (!b) return;

    const remote = b.Remote_level ?? b.remote_level ?? b.remote ?? b["Remote level"] ?? "";
    const autoR  = b.Automation_risk ?? b.automation_risk ?? b.automation ?? b["Automation risk"] ?? "";
    const cur    = b.Currency ?? b.currency ?? b.Devise ?? b.devise ?? "";
    const tte    = textSummary(b.Time_to_employability ?? b.time_to_employability ?? "");
    const grow   = textSummary(b.Growth_outlook ?? b.growth_outlook ?? "");
    const dem    = textSummary(b.Market_demand ?? b.market_demand ?? "");

    const ok = [
      setText("js-chip-remote_level", remote),
      setText("js-chip-automation_risk", autoR),
      setText("js-chip-currency", cur),
      setText("js-chip-time_to_employability", tte),
      setText("js-chip-growth_outlook", grow),
      setText("js-chip-market_demand", dem),
    ].some(Boolean);

    if (ok) showCard();
  }

  function hook(){
    const bus = window.__ULYDIA_METIER_BUS__;
    if (bus?.on){
      bus.on("ULYDIA:METIER_READY", render);
      bus.on("ULYDIA:RENDER_DONE", render);
    }

    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
      if (ctx) render(ctx);
      if (tries > 250) clearInterval(t);
    }, 50);

    const root = document.getElementById("ulydia-metier-root") || document.body;
    if (root && window.MutationObserver){
      const obs = new MutationObserver(() => {
        const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
        if (ctx) render(ctx);
      });
      obs.observe(root, { childList:true, subtree:true });
      setTimeout(()=>obs.disconnect(), 15000);
    }
  }

  hook();
})();