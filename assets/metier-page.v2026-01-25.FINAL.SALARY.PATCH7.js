/* metier-page.v2026-01-25.FINAL.SALARY.PATCH7.js
   ULYDIA — Ensure the Salary block is visible AND rendered like the design
   - Uses the existing Salary.PATCH6 renderer (range + bars)
   - Additionally UNHIDES the salary card wrapper (some are display:none by default)
   - Looks for any salary token node and climbs to a reasonable container

   Load AFTER SALARY.PATCH6 (or instead of it; this file includes the render logic by calling it).
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH7__) return;
  window.__ULYDIA_SALARY_PATCH7__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[salary.patch7]", ...a);

  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
  function pickFirst(sel){ return document.querySelector(sel); }

  // --- Minimal re-implementation of PATCH6 render (to keep this patch standalone) ---
  function nodesFor(token){
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

  function render(){
    const bloc = getBloc();
    const sym = currencySymbol(bloc);

    const [jMinA,jMaxA] = normalizeAnnual(bloc.salary_junior_min, bloc.salary_junior_max);
    const [mMinA,mMaxA] = normalizeAnnual(bloc.salary_mid_min, bloc.salary_mid_max);
    const [sMinA,sMaxA] = normalizeAnnual(bloc.salary_senior_min, bloc.salary_senior_max);

    const has = [jMinA,jMaxA,mMinA,mMaxA,sMinA,sMaxA].some(x => Number(x) > 0);
    if (!has) return {ok:false, reason:"no salary data"};

    const wroteJR = setText("js-sal-junior-range", fmtRangeK(jMinA,jMaxA,sym));
    const wroteMR = setText("js-sal-mid-range",    fmtRangeK(mMinA,mMaxA,sym));
    const wroteSR = setText("js-sal-senior-range", fmtRangeK(sMinA,sMaxA,sym));

    // variable share
    const v = Number(bloc.salary_variable_share);
    if (isFinite(v) && v > 0) {
      setText("js-sal-variable-range", `${Math.round(v)}%`);
      setText("js-sal-variable-share", `${Math.round(v)}%`);
      setWidth("js-sal-variable-fill", v);
    }

    // bars
    const maxAll = Math.max(jMaxA,mMaxA,sMaxA);
    const minAll = Math.min(...[jMinA,mMinA,sMinA].filter(x=>x>0));
    if (maxAll > 0 && isFinite(minAll)) {
      setWidth("js-sal-junior-fill", computePct(jMaxA, minAll, maxAll));
      setWidth("js-sal-mid-fill",    computePct(mMaxA, minAll, maxAll));
      setWidth("js-sal-senior-fill", computePct(sMaxA, minAll, maxAll));
    }

    return {ok:true, wroteJR, wroteMR, wroteSR};
  }

  function unhideSalaryBlock(){
    // Find any salary token node
    const tokenNode =
      pickFirst("#js-sal-junior-range, .js-sal-junior-range, #js-sal-junior-min, .js-sal-junior-min, #js-sal-senior-range, .js-sal-senior-range, #js-sal-variable-share, .js-sal-variable-share");
    if (!tokenNode) return {ok:false, reason:"no salary nodes found"};

    // Climb to a likely card/container
    let el = tokenNode;
    for (let i=0; i<10 && el; i++){
      // If we reach the right column container or a card-like wrapper, stop
      const cls = (el.className || "");
      if (typeof cls === "string" && (cls.includes("card") || cls.includes("u-card") || cls.includes("salary") || cls.includes("grille"))) break;
      el = el.parentElement;
    }
    const container = el || tokenNode;

    // Unhide chain up to 3 parents
    let cur = container;
    for (let k=0; k<4 && cur; k++){
      const st = window.getComputedStyle(cur);
      if (st && (st.display === "none" || st.visibility === "hidden" || st.opacity === "0")) {
        cur.style.display = "block";
        cur.style.visibility = "visible";
        cur.style.opacity = "1";
      }
      cur = cur.parentElement;
    }

    return {ok:true};
  }

  function run(){
    const r1 = render();
    const r2 = unhideSalaryBlock();
    log("run", {render:r1, unhide:r2});
  }

  function boot(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 80);
        setTimeout(run, 250);
        setTimeout(run, 800);
      });
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 20) clearInterval(t);
    }, 250);
  }
  boot();
})();