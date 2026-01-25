/* metier-page.v2026-01-25.FINAL.SALARY.PATCH6.js
   ULYDIA — Salary block renderer (ROBUST: id OR class)

   Fixes: "Bloc salaire pas correct / vide"
   - Supports elements addressed by ID (#js-sal-...) OR class (.js-sal-...)
   - Fills either combined range nodes (..-range) OR min/max nodes (..-min/max)
   - Converts monthly ranges (<= 20000) to annual, then displays in K (e.g., 35–45K€)
   - Fills variable share as percentage if present
   - Attempts to fill progress bars if present

   Load AFTER BASE.
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH6__) return;
  window.__ULYDIA_SALARY_PATCH6__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[salary.patch6]", ...a);

  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
  function nodesFor(token){
    // accept id OR class
    const safe = token.replace(/[^\w\-]/g,"");
    return [
      ...$all("#"+safe),
      ...$all("."+safe)
    ];
  }
  function setText(token, value){
    const nodes = nodesFor(token);
    if (!nodes.length) return 0;
    nodes.forEach(n => { n.textContent = (value == null ? "" : String(value)); });
    return nodes.length;
  }
  function setWidth(token, pct){
    const nodes = nodesFor(token);
    if (!nodes.length) return 0;
    const p = Math.max(0, Math.min(100, Number(pct)||0));
    nodes.forEach(n => { n.style.width = p.toFixed(1) + "%"; });
    return nodes.length;
  }

  function getBloc(){
    return window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || window.__ULYDIA_METIER_PAGE_CTX__ || {};
  }

  function currencySymbol(bloc){
    const disp = String(bloc.currency_display || "").trim();
    if (disp) {
      const m = disp.match(/\(([^)]+)\)/);
      if (m && m[1]) return m[1];
      return disp;
    }
    const c = String(bloc.currency || "").trim();
    return c || "€";
  }

  function normalizeAnnual(minVal, maxVal){
    const a = Number(minVal)||0, b = Number(maxVal)||0;
    const mx = Math.max(a,b);
    const treatMonthly = mx > 0 && mx <= 20000;
    if (treatMonthly) return [a*12, b*12];
    return [a, b];
  }

  function fmtRangeK(minVal, maxVal, sym){
    const a = Number(minVal)||0, b = Number(maxVal)||0;
    const lo = Math.min(a,b), hi = Math.max(a,b);
    if (hi <= 0) return "";
    const loK = Math.round(lo/1000);
    const hiK = Math.round(hi/1000);
    const dash = "–";
    const suffix = sym ? sym : "";
    if (loK === hiK) return `${loK}K${suffix}`;
    return `${loK}${dash}${hiK}K${suffix}`;
  }

  function computePct(v, minAll, maxAll){
    v = Number(v); minAll = Number(minAll); maxAll = Number(maxAll);
    if (!isFinite(v) || !isFinite(minAll) || !isFinite(maxAll) || maxAll <= minAll) return 0;
    return ((v - minAll) / (maxAll - minAll)) * 100;
  }

  function run(){
    const bloc = getBloc();
    const sym = currencySymbol(bloc);

    const [jMinA,jMaxA] = normalizeAnnual(bloc.salary_junior_min, bloc.salary_junior_max);
    const [mMinA,mMaxA] = normalizeAnnual(bloc.salary_mid_min, bloc.salary_mid_max);
    const [sMinA,sMaxA] = normalizeAnnual(bloc.salary_senior_min, bloc.salary_senior_max);

    const has = [jMinA,jMaxA,mMinA,mMaxA,sMinA,sMaxA].some(x => Number(x) > 0);
    if (!has) { log("no salary data"); return; }

    // 1) Prefer combined range nodes if present
    const wroteJR = setText("js-sal-junior-range", fmtRangeK(jMinA,jMaxA,sym));
    const wroteMR = setText("js-sal-mid-range",    fmtRangeK(mMinA,mMaxA,sym));
    const wroteSR = setText("js-sal-senior-range", fmtRangeK(sMinA,sMaxA,sym));

    // 2) Fallback to min/max nodes (display raw monthly/annual? keep numbers as provided + currency)
    function setNum(token, val){
      const n = Number(val);
      if (!isFinite(n) || n <= 0) return 0;
      // keep as provided (could be monthly) but show with symbol
      return setText(token, `${Math.round(n)}${sym ? " " + sym : ""}`);
    }
    const wroteLegacy =
      setNum("js-sal-junior-min", bloc.salary_junior_min) +
      setNum("js-sal-junior-max", bloc.salary_junior_max) +
      setNum("js-sal-mid-min",    bloc.salary_mid_min) +
      setNum("js-sal-mid-max",    bloc.salary_mid_max) +
      setNum("js-sal-senior-min", bloc.salary_senior_min) +
      setNum("js-sal-senior-max", bloc.salary_senior_max);

    // 3) Variable share
    const v = Number(bloc.salary_variable_share);
    if (isFinite(v)) {
      setText("js-sal-variable-range", `${Math.round(v)}%`);
      setText("js-sal-variable-share", `${Math.round(v)}%`);
      setWidth("js-sal-variable-fill", v);
    }

    // 4) Notes (optional)
    const notes = String(bloc.salary_notes || "").trim();
    if (notes) setText("js-sal-notes", notes);

    // 5) Bars fill (optional)
    const maxAll = Math.max(jMaxA,mMaxA,sMaxA);
    const minAll = Math.min(...[jMinA,mMinA,sMinA].filter(x=>x>0));
    if (maxAll > 0 && isFinite(minAll)) {
      setWidth("js-sal-junior-fill", computePct(jMaxA, minAll, maxAll));
      setWidth("js-sal-mid-fill",    computePct(mMaxA, minAll, maxAll));
      setWidth("js-sal-senior-fill", computePct(sMaxA, minAll, maxAll));
    }

    log("rendered", { wroteJR, wroteMR, wroteSR, wroteLegacy });
  }

  // re-run on ready events / retries
  function onReady(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 60);
        setTimeout(run, 250);
        setTimeout(run, 800);
      });
      return;
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 20) clearInterval(t);
    }, 250);
  }
  onReady();
})();