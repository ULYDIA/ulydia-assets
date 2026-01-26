/* =========================================================
   ULYDIA — INDICATORS HOTFIX (V4) — STABLE
   Fixes:
   - Devise: show "EUR (€)" (or USD/GBP/JPY) even if only symbol is provided
   - Demande du marché: convert long text to short qualitative label
   Robustness:
   - Re-applies after render (bounded rAF up to 6s)
   - Also hooks ULYDIA event bus if present
   - No MutationObserver, no infinite polling
========================================================= */
(function(){
  if (window.__ULYDIA_INDICATORS_HOTFIX4__) return;
  window.__ULYDIA_INDICATORS_HOTFIX4__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a)=>DEBUG && console.log("[IND.HOTFIX4]", ...a);

  function norm(s){
    return String(s||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .trim();
  }

  function formatCurrencyStrict(v){
    const s = String(v||"").trim();
    if (!s) return "";
    // already formatted like "EUR (€)"
    if (/\b[A-Z]{3}\b\s*\(/.test(s)) return s;
    if (/eur/i.test(s) || s === "€") return "EUR (€)";
    if (/usd/i.test(s) || s === "$") return "USD ($)";
    if (/gbp/i.test(s) || s === "£") return "GBP (£)";
    if (/jpy/i.test(s) || s === "¥") return "JPY (¥)";
    return s;
  }

  function mapDemand(v){
    const n = norm(v);
    if (!n) return "";
    // if it's already short (<= 20 chars), keep it
    if (String(v).trim().length <= 20) return String(v).trim();

    if (/(tres|tr[eè]s).*(fort|eleve)/.test(n) || /very strong|high demand/.test(n)) return "Très forte";
    if (/(fort|eleve)/.test(n)) return "Forte";
    if (/(faible|low)/.test(n)) return "Faible";
    if (/(moyen|moderate)/.test(n)) return "Moyenne";
    // fallback for long paragraphs
    return "Soutenue";
  }

  function applyOnce(){
    const root = document.querySelector("[data-ulydia-indicators]");
    if (!root) return false;

    let changed = false;

    root.querySelectorAll(".ul-ind-item").forEach(item=>{
      const k = item.querySelector(".ul-ind-k")?.textContent || "";
      const vEl = item.querySelector(".ul-ind-v");
      if (!vEl) return;

      if (/devise/i.test(k)) {
        const next = formatCurrencyStrict(vEl.textContent);
        if (next && next !== vEl.textContent) { vEl.textContent = next; changed = true; }
      }

      if (/demande du march/i.test(norm(k))) {
        const next = mapDemand(vEl.textContent);
        if (next && next !== vEl.textContent) { vEl.textContent = next; changed = true; }
      }
    });

    return true; // root existed
  }

  function runBounded(){
    const t0 = Date.now();
    const MAX = 6000;

    (function loop(){
      const exists = applyOnce();
      if (exists) {
        // re-apply a few frames because the right column can re-render once
        if (Date.now() - t0 < MAX) return requestAnimationFrame(loop);
        log("done");
        return;
      }
      if (Date.now() - t0 >= MAX) { log("timeout"); return; }
      requestAnimationFrame(loop);
    })();
  }

  // Hook into ULYDIA ready event if present (most reliable)
  try{
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", function(){
        log("event ULYDIA:METIER_READY");
        runBounded();
      });
    }
  }catch(e){}

  // Always run once now (covers hard refresh / cache)
  runBounded();
})();