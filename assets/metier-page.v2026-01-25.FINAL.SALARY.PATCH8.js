/* metier-page.v2026-01-25.FINAL.SALARY.PATCH8.js
   ULYDIA — Salary card renderer (robust selectors) + K formatting per currency

   Fixes:
   - Ensures Junior / Mid / Senior ranges are filled even if your nodes are named
     js-sal-junior, js-sal-mid, js-sal-senior (not *-range)
   - Ensures bars are filled for junior/mid/senior if fill nodes exist
   - Formats as "35–45K€" or "35–45K$" etc (K + symbol suffix)
   - Variable share: accepts either a single % (e.g. 10) or range text (e.g. "5-15")
   - Unhides the salary card if hidden

   Load AFTER BASE + bloc flattening.
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH8__) return;
  window.__ULYDIA_SALARY_PATCH8__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[salary.patch8]", ...a);

  const $ = (sel, root) => (root||document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root||document).querySelectorAll(sel));

  const TOKENS_RANGE = {
    junior: ["js-sal-junior-range","js-sal-junior","js-sal-junior-txt","js-sal-junior-text"],
    mid:    ["js-sal-mid-range","js-sal-mid","js-sal-mid-txt","js-sal-mid-text","js-sal-confirme-range","js-sal-confirme"],
    senior: ["js-sal-senior-range","js-sal-senior","js-sal-senior-txt","js-sal-senior-text"]
  };
  const TOKENS_FILL = {
    junior: ["js-sal-junior-fill","js-sal-junior-bar","js-sal-junior-progress"],
    mid:    ["js-sal-mid-fill","js-sal-mid-bar","js-sal-mid-progress","js-sal-confirme-fill"],
    senior: ["js-sal-senior-fill","js-sal-senior-bar","js-sal-senior-progress"]
  };
  const TOKENS_VAR_TEXT = ["js-sal-variable-range","js-sal-variable-share","js-sal-variable","js-sal-var-range","js-sal-var-share"];
  const TOKENS_VAR_FILL = ["js-sal-variable-fill","js-sal-var-fill","js-sal-variable-bar","js-sal-var-bar"];

  function getBloc(){
    return window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || window.__ULYDIA_METIER_PAGE_CTX__ || {};
  }

  function currencySymbol(bloc){
    // currency_display example: "EUR (€)" or "USD ($)"
    const disp = String(bloc.currency_display || "").trim();
    if (disp) {
      const m = disp.match(/\(([^)]+)\)/);
      if (m && m[1]) return m[1].trim();
    }
    const c = String(bloc.currency || "").trim();
    return c || "€";
  }

  function normalizeAnnual(minVal, maxVal){
    const a = Number(minVal)||0, b = Number(maxVal)||0;
    const mx = Math.max(a,b);
    const treatMonthly = mx > 0 && mx <= 20000; // heuristic
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
    const suffix = (sym || "").trim();
    if (loK === hiK) return `${loK}K${suffix}`;
    return `${loK}${dash}${hiK}K${suffix}`;
  }

  function findNodes(token){
    const safe = token.replace(/[^\w\-]/g,"");
    return [
      ...$$("#"+safe),
      ...$$("."+safe)
    ];
  }

  function setTextAny(tokens, text){
    let n = 0;
    tokens.forEach(t => {
      findNodes(t).forEach(el => { el.textContent = text; n++; });
    });
    return n;
  }

  function setWidthAny(tokens, pct){
    const p = Math.max(0, Math.min(100, Number(pct)||0));
    let n = 0;
    tokens.forEach(t => {
      findNodes(t).forEach(el => { el.style.width = p.toFixed(1) + "%"; n++; });
    });
    return n;
  }

  function computePct(v, minAll, maxAll){
    v = Number(v); minAll = Number(minAll); maxAll = Number(maxAll);
    if (!isFinite(v) || !isFinite(minAll) || !isFinite(maxAll) || maxAll <= minAll) return 0;
    return ((v - minAll) / (maxAll - minAll)) * 100;
  }

  function unhideSalaryCard(){
    // try to locate salary card root
    const probe = $(
      "#js-sal-junior-range, .js-sal-junior-range, #js-sal-junior, .js-sal-junior, #js-sal-senior, .js-sal-senior, #js-sal-variable-share, .js-sal-variable-share"
    );
    if (!probe) return false;

    let cur = probe;
    for (let i=0;i<10 && cur;i++){
      const cls = String(cur.className||"");
      if (cls.includes("grille") || cls.includes("salary") || cls.includes("card") || cls.includes("u-card")) break;
      cur = cur.parentElement;
    }
    cur = cur || probe;

    // unhide up the chain a bit
    let p = cur;
    for (let k=0;k<5 && p;k++){
      const st = getComputedStyle(p);
      if (st.display === "none") p.style.display = "block";
      if (st.visibility === "hidden") p.style.visibility = "visible";
      if (st.opacity === "0") p.style.opacity = "1";
      p = p.parentElement;
    }
    return true;
  }

  function parseVariableShare(bloc){
    // Prefer numeric field
    const v = bloc.salary_variable_share;
    if (typeof v === "number" && isFinite(v) && v > 0) return {min:v, max:v};
    const s = String(v||"").trim();
    // accept "5-15" or "5–15" or "5 - 15 %"
    const m = s.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
    if (m) return {min:Number(m[1]), max:Number(m[2])};
    const m2 = s.match(/(\d{1,2})/);
    if (m2) return {min:Number(m2[1]), max:Number(m2[1])};
    return null;
  }

  function render(){
    const bloc = getBloc();
    const sym = currencySymbol(bloc);

    const [jMinA,jMaxA] = normalizeAnnual(bloc.salary_junior_min, bloc.salary_junior_max);
    const [mMinA,mMaxA] = normalizeAnnual(bloc.salary_mid_min, bloc.salary_mid_max);
    const [sMinA,sMaxA] = normalizeAnnual(bloc.salary_senior_min, bloc.salary_senior_max);

    const has = [jMinA,jMaxA,mMinA,mMaxA,sMinA,sMaxA].some(x => Number(x) > 0);
    if (!has) return {ok:false, reason:"no salary data"};

    const jr = fmtRangeK(jMinA,jMaxA,sym);
    const mr = fmtRangeK(mMinA,mMaxA,sym);
    const sr = fmtRangeK(sMinA,sMaxA,sym);

    const wroteJR = setTextAny(TOKENS_RANGE.junior, jr);
    const wroteMR = setTextAny(TOKENS_RANGE.mid, mr);
    const wroteSR = setTextAny(TOKENS_RANGE.senior, sr);

    // bars scale by max
    const maxAll = Math.max(jMaxA,mMaxA,sMaxA);
    const minAll = Math.min(...[jMinA,mMinA,sMinA].filter(x=>x>0));
    if (maxAll > 0 && isFinite(minAll)) {
      setWidthAny(TOKENS_FILL.junior, computePct(jMaxA, minAll, maxAll));
      setWidthAny(TOKENS_FILL.mid,    computePct(mMaxA, minAll, maxAll));
      setWidthAny(TOKENS_FILL.senior, computePct(sMaxA, minAll, maxAll));
    }

    // variable share
    const vr = parseVariableShare(bloc);
    if (vr && vr.max > 0) {
      const txt = (vr.min !== vr.max) ? `${vr.min}–${vr.max}%` : `${vr.max}%`;
      setTextAny(TOKENS_VAR_TEXT, txt);
      // fill based on max
      setWidthAny(TOKENS_VAR_FILL, vr.max);
    }

    return {ok:true, wroteJR, wroteMR, wroteSR};
  }

  function run(){
    const unhid = unhideSalaryCard();
    const res = render();
    log("run", {unhid, res});
  }

  function boot(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 120);
        setTimeout(run, 400);
      });
    }
    // a few retries only (no UI flicker)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries >= 8) clearInterval(t);
    }, 300);
  }
  boot();
})();