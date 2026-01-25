/* metier-page — INDICATORS.PATCH1
   Fills KPI card placeholders from Metier_Pays_Blocs:
   - #js-chip-remote_level      <- remote_level
   - #js-chip-automation_risk   <- automation_risk
   - #js-chip-currency          <- currency
   - #js-chip-time_to_employability <- time_to_employability (summary)
   - #js-chip-growth_outlook    <- growth_outlook (summary)
   - #js-chip-market_demand     <- market_demand (summary)
*/
(() => {
  if (window.__ULYDIA_INDICATORS_PATCH1__) return;
  window.__ULYDIA_INDICATORS_PATCH1__ = true;

  function isEmpty(x){
    return !String(x || "").replace(/\u00a0/g," ").trim();
  }

  function textSummary(htmlOrText){
    const s = String(htmlOrText || "");
    if (!s) return "";
    // strip tags
    const t = s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r]+/g, " ")
      .trim();
    // take first line-ish
    const first = (t.split("\n").map(x=>x.trim()).filter(Boolean)[0] || "").trim();
    return first || t;
  }

  function showCardByHeaderContains(label){
    const hs = document.querySelectorAll(".card-header .section-title");
    for (const h of hs) {
      const t = (h.textContent || "").trim();
      if (t && t.includes(label)) {
        const card = h.closest(".card") || h.closest("section") || h.parentElement;
        if (card) card.style.display = "";
      }
    }
  }

  function setText(id, val){
    const el = document.getElementById(id);
    if (!el) return false;
    const v = String(val || "").trim();
    if (!v) return false;
    el.textContent = v;
    return true;
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b) return;

    const remote = b.remote_level || b.Remote_level || b.remote || "";
    const autoR  = b.automation_risk || b.Automation_risk || b.automation || "";
    const cur    = b.currency || b.Currency || "";
    const tte    = textSummary(b.time_to_employability || b.Time_to_employability || "");
    const grow   = textSummary(b.growth_outlook || b.Growth_outlook || "");
    const dem    = textSummary(b.market_demand || b.Market_demand || "");

    const ok = [
      setText("js-chip-remote_level", remote),
      setText("js-chip-automation_risk", autoR),
      setText("js-chip-currency", cur),
      setText("js-chip-time_to_employability", tte),
      setText("js-chip-growth_outlook", grow),
      setText("js-chip-market_demand", dem),
    ].some(Boolean);

    if (ok) showCardByHeaderContains("Indicateurs clés");
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);
    if (window.__ULYDIA_METIER_BUS__?.on) return window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);

    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();
