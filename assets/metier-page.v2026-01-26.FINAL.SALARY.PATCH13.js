/* metier-page.v2026-01-26.FINAL.SALARY.PATCH13.js
   ULYDIA — Salary card renderer (nested salary-aware)

   FIX:
   - If salary_* fields are NOT flattened, reads from:
       bloc.salary.junior.min/max
       bloc.salary.mid.min/max
       bloc.salary.senior.min/max
       bloc.salary.variable_share_pct
   - Still supports flattened fields:
       bloc.salary_junior_min / max / mid / senior / salary_variable_share
   - Keeps existing robust DOM token strategy (id OR class)

   Load AFTER BASE + BLOCFLATTEN (ok even if flatten doesn't include salary).
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH13__) return;
  window.__ULYDIA_SALARY_PATCH13__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[salary.patch13]", ...a);

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
    const disp = String(bloc.currency_display || bloc.Currency || "").trim();
    if (disp) {
      const m = disp.match(/\(([^)]+)\)/);
      if (m && m[1]) return m[1].trim();
    }
    const c = String(bloc.currency || bloc.Currency || "").trim();
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
    const safe = String(token||"").replace(/[^\w\-]/g,"");
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

  function getSalaryValue(bloc, path, flatKey){
    // flatKey: salary_junior_min, etc.
    const fv = bloc?.[flatKey];
    if (fv !== undefined && fv !== null && Number(fv) !== 0) return fv;

    // nested path, e.g. ["salary","junior","min"]
    let cur = bloc;
    for (const k of path){
      cur = cur?.[k];
      if (cur === undefined || cur === null) break;
    }
    return cur;
  }

  function getVarShare(bloc){
    // flattened
    const v = bloc.salary_variable_share;
    if (typeof v === "number" && isFinite(v) && v > 0) return {min:v, max:v};

    // nested
    const nv = bloc?.salary?.variable_share_pct;
    if (typeof nv === "number" && isFinite(nv) && nv > 0) return {min:nv, max:nv};

    // string fallbacks
    const s = String(v || nv || "").trim();
    const m = s.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
    if (m) return {min:Number(m[1]), max:Number(m[2])};
    const m2 = s.match(/(\d{1,2})/);
    if (m2) return {min:Number(m2[1]), max:Number(m2[1])};
    return null;
  }

  function render(){
    const bloc = getBloc();
    const sym = currencySymbol(bloc);

    const jMin = getSalaryValue(bloc, ["salary","junior","min"], "salary_junior_min");
    const jMax = getSalaryValue(bloc, ["salary","junior","max"], "salary_junior_max");
    const mMin = getSalaryValue(bloc, ["salary","mid","min"], "salary_mid_min");
    const mMax = getSalaryValue(bloc, ["salary","mid","max"], "salary_mid_max");
    const sMin = getSalaryValue(bloc, ["salary","senior","min"], "salary_senior_min");
    const sMax = getSalaryValue(bloc, ["salary","senior","max"], "salary_senior_max");

    const [jMinA,jMaxA] = normalizeAnnual(jMin, jMax);
    const [mMinA,mMaxA] = normalizeAnnual(mMin, mMax);
    const [sMinA,sMaxA] = normalizeAnnual(sMin, sMax);

    const has = [jMinA,jMaxA,mMinA,mMaxA,sMinA,sMaxA].some(x => Number(x) > 0);
    if (!has) return {ok:false, reason:"no salary data"};

    const jr = fmtRangeK(jMinA,jMaxA,sym);
    const mr = fmtRangeK(mMinA,mMaxA,sym);
    const sr = fmtRangeK(sMinA,sMaxA,sym);

    const wroteJR = setTextAny(TOKENS_RANGE.junior, jr);
    const wroteMR = setTextAny(TOKENS_RANGE.mid, mr);
    const wroteSR = setTextAny(TOKENS_RANGE.senior, sr);

    const maxAll = Math.max(jMaxA,mMaxA,sMaxA);
    const minAll = Math.min(...[jMinA,mMinA,sMinA].filter(x=>x>0));
    if (maxAll > 0 && isFinite(minAll)) {
      setWidthAny(TOKENS_FILL.junior, computePct(jMaxA, minAll, maxAll));
      setWidthAny(TOKENS_FILL.mid,    computePct(mMaxA, minAll, maxAll));
      setWidthAny(TOKENS_FILL.senior, computePct(sMaxA, minAll, maxAll));
    }

    const vr = getVarShare(bloc);
    if (vr && vr.max > 0) {
      const txt = (vr.min !== vr.max) ? `${vr.min}–${vr.max}%` : `${vr.max}%`;
      setTextAny(TOKENS_VAR_TEXT, txt);
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
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries >= 10) clearInterval(t);
    }, 300);
  }
  boot();
})();
