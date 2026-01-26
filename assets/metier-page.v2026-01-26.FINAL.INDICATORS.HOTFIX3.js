/* =========================================================
   ULYDIA — INDICATORS HOTFIX (V3)
   - Normalise devise to "EUR (€)" even if only symbol is provided
   - Map long market demand text to qualitative labels
========================================================= */
(function(){
  if (window.__ULYDIA_INDICATORS_HOTFIX3__) return;
  window.__ULYDIA_INDICATORS_HOTFIX3__ = true;

  function norm(s){
    return String(s||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .trim();
  }

  function formatCurrencyStrict(v){
    const s = String(v||"").trim();
    if (!s) return "";
    if (/eur/i.test(s) || s === "€") return "EUR (€)";
    if (/usd/i.test(s) || s === "$") return "USD ($)";
    if (/gbp/i.test(s) || s === "£") return "GBP (£)";
    if (/jpy/i.test(s) || s === "¥") return "JPY (¥)";
    return s;
  }

  function mapDemand(v){
    const n = norm(v);
    if (!n) return "";
    if (/(tres|tr[eè]s).*(fort|eleve)/.test(n) || /very strong|high demand/.test(n)) {
      return "Très forte";
    }
    if (/(fort|eleve)/.test(n)) return "Forte";
    if (/(faible|low)/.test(n)) return "Faible";
    if (/(moyen|moderate)/.test(n)) return "Moyenne";
    return "Soutenue";
  }

  function run(){
    const root = document.querySelector("[data-ulydia-indicators]");
    if (!root) return;

    root.querySelectorAll(".ul-ind-item").forEach(item=>{
      const k = item.querySelector(".ul-ind-k")?.textContent || "";
      const v = item.querySelector(".ul-ind-v");
      if (!v) return;
      if (/devise/i.test(k)) {
        v.textContent = formatCurrencyStrict(v.textContent);
      }
      if (/demande du march/i.test(k)) {
        v.textContent = mapDemand(v.textContent);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();