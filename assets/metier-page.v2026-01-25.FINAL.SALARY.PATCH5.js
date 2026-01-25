/* metier-page.v2026-01-25.FINAL.SALARY.PATCH5.js
   ULYDIA — Salary renderer + auto-unhide (SAFE)

   - Fills BOTH:
     A) New salary card IDs (ranges + bar fills) if present (see PATCH4 header)
     B) Legacy granular IDs if present:
        js-sal-junior-min/max, js-sal-mid-min/max, js-sal-senior-min/max,
        js-sal-variable-share, js-statut-generation

   - NEW: auto-unhide salary area:
     If salary numeric fields exist AND we find salary DOM nodes, we force-show their nearest ".card"
     and their parent wrappers (display/visibility/opacity).

   Load AFTER BASE + other patches.
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH5__) return;
  window.__ULYDIA_SALARY_PATCH5__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[salary.patch5]", ...a);

  const IDS_NEW = [
    "js-sal-title",
    "js-sal-junior-range","js-sal-mid-range","js-sal-senior-range",
    "js-sal-junior-fill","js-sal-mid-fill","js-sal-senior-fill",
    "js-sal-junior-exp","js-sal-mid-exp","js-sal-senior-exp",
    "js-sal-variable-range","js-sal-variable-fill","js-sal-variable-note",
    "js-sal-notes"
  ];

  const IDS_LEGACY = [
    "js-sal-junior-min","js-sal-junior-max",
    "js-sal-mid-min","js-sal-mid-max",
    "js-sal-senior-min","js-sal-senior-max",
    "js-sal-variable-share",
    "js-statut-generation"
  ];

  function q(id){ return document.getElementById(id); }
  function txt(el, v){ if (el) el.textContent = (v == null ? "" : String(v)); }
  function clamp(n, a, b){ n = Number(n); if(!isFinite(n)) return a; return Math.max(a, Math.min(b, n)); }

  function getBloc(){
    return window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || window.__ULYDIA_METIER_PAGE_CTX__ || {};
  }

  function currencySymbol(bloc){
    const disp = (bloc.currency_display || "").toString().trim();
    if (disp) {
      const m = disp.match(/\(([^)]+)\)/);
      if (m && m[1]) return m[1];
      return disp;
    }
    let c = (bloc.currency || "").toString().trim();
    if (!c) {
      const iso = (bloc.iso || "").toString().toUpperCase();
      if (["FR","DE","ES","IT","NL","BE","PT","IE","AT","FI","GR","LU","SI","SK","EE","LV","LT","MT","CY"].includes(iso)) c = "€";
    }
    return c;
  }

  function normalizeAnnual(minVal, maxVal){
    const a = Number(minVal)||0, b = Number(maxVal)||0;
    const scaleMonthly = (Math.max(a,b) > 0 && Math.max(a,b) <= 20000);
    if (scaleMonthly) return [a*12, b*12];
    return [a, b];
  }

  function formatRangeK(minVal, maxVal, sym){
    const a = Number(minVal)||0, b = Number(maxVal)||0;
    if (a<=0 && b<=0) return "";
    const lo = Math.min(a,b), hi = Math.max(a,b);
    const loK = Math.round(lo/1000);
    const hiK = Math.round(hi/1000);
    const dash = "–";
    const suffix = sym ? sym : "";
    if (loK === hiK) return `${loK}K${suffix}`;
    return `${loK}${dash}${hiK}K${suffix}`;
  }

  function setFill(el, pct){
    if (!el) return;
    const p = clamp(pct, 0, 100);
    el.style.width = p.toFixed(1) + "%";
  }

  function computePct(value, minAll, maxAll){
    const v = Number(value);
    const mn = Number(minAll), mx = Number(maxAll);
    if (!isFinite(v) || !isFinite(mn) || !isFinite(mx) || mx <= mn) return 0;
    return ((v - mn) / (mx - mn)) * 100;
  }

  function forceShow(el){
    if (!el) return;
    const chain = [];
    // include element, closest card, and 2 parents
    chain.push(el);
    const card = el.closest ? el.closest(".card") : null;
    if (card) chain.push(card);
    let p = card ? card.parentElement : el.parentElement;
    for (let i=0; i<3 && p; i++){ chain.push(p); p = p.parentElement; }

    chain.forEach(x => {
      try {
        x.style.display = "";
        x.style.visibility = "visible";
        x.style.opacity = "1";
        x.hidden = false;
        x.removeAttribute && x.removeAttribute("hidden");
      } catch(e){}
    });
  }

  function hasSalaryData(bloc){
    const fields = [
      bloc.salary_junior_min, bloc.salary_junior_max,
      bloc.salary_mid_min, bloc.salary_mid_max,
      bloc.salary_senior_min, bloc.salary_senior_max
    ];
    return fields.some(v => Number(v) > 0);
  }

  function renderNewCard(bloc){
    const elJRange = q("js-sal-junior-range");
    const elMRange = q("js-sal-mid-range");
    const elSRange = q("js-sal-senior-range");
    const elJFill = q("js-sal-junior-fill");
    const elMFill = q("js-sal-mid-fill");
    const elSFill = q("js-sal-senior-fill");

    const hasNew = !!(elJRange && elMRange && elSRange);
    if (!hasNew) return false;

    const sym = currencySymbol(bloc);
    const [jMinA,jMaxA] = normalizeAnnual(bloc.salary_junior_min, bloc.salary_junior_max);
    const [mMinA,mMaxA] = normalizeAnnual(bloc.salary_mid_min, bloc.salary_mid_max);
    const [sMinA,sMaxA] = normalizeAnnual(bloc.salary_senior_min, bloc.salary_senior_max);

    txt(elJRange, formatRangeK(jMinA,jMaxA,sym));
    txt(elMRange, formatRangeK(mMinA,mMaxA,sym));
    txt(elSRange, formatRangeK(sMinA,sMaxA,sym));

    const maxima = [jMaxA,mMaxA,sMaxA].map(x=>Number(x)||0).filter(x=>x>0);
    const minima = [jMinA,mMinA,sMinA].map(x=>Number(x)||0).filter(x=>x>0);
    const minAll = minima.length ? Math.min(...minima) : 0;
    const maxAll = maxima.length ? Math.max(...maxima) : 0;

    setFill(elJFill, computePct(jMaxA, minAll, maxAll));
    setFill(elMFill, computePct(mMaxA, minAll, maxAll));
    setFill(elSFill, computePct(sMaxA, minAll, maxAll));

    // other labels are optional
    const exJ = q("js-sal-junior-exp"); if (exJ && !exJ.textContent.trim()) exJ.textContent = "0–2 ans d'expérience";
    const exM = q("js-sal-mid-exp");    if (exM && !exM.textContent.trim()) exM.textContent = "3–5 ans d'expérience";
    const exS = q("js-sal-senior-exp"); if (exS && !exS.textContent.trim()) exS.textContent = "5+ ans d'expérience";

    const v = Number(bloc.salary_variable_share);
    const elVR = q("js-sal-variable-range"); if (elVR) txt(elVR, isFinite(v) ? `${Math.round(v)}%` : "");
    const elVF = q("js-sal-variable-fill");  if (elVF) setFill(elVF, isFinite(v) ? clamp(v,0,100) : 0);
    const elVN = q("js-sal-variable-note");  if (elVN && !elVN.textContent.trim()) elVN.textContent = "Bonus, intéressement, participation";

    const notes = (bloc.salary_notes || "").toString().trim();
    const elN = q("js-sal-notes"); if (elN) txt(elN, notes);

    forceShow(elJRange);
    return true;
  }

  function renderLegacyFields(bloc){
    let anyEl = null;
    const sym = currencySymbol(bloc);

    function setNum(id, val){
      const el = q(id);
      if (!el) return;
      anyEl = anyEl || el;
      const n = Number(val);
      if (!isFinite(n) || n<=0) { el.textContent = ""; return; }
      el.textContent = `${Math.round(n)}${sym ? " " + sym : ""}`;
    }

    setNum("js-sal-junior-min", bloc.salary_junior_min);
    setNum("js-sal-junior-max", bloc.salary_junior_max);
    setNum("js-sal-mid-min", bloc.salary_mid_min);
    setNum("js-sal-mid-max", bloc.salary_mid_max);
    setNum("js-sal-senior-min", bloc.salary_senior_min);
    setNum("js-sal-senior-max", bloc.salary_senior_max);

    const vEl = q("js-sal-variable-share");
    if (vEl) {
      anyEl = anyEl || vEl;
      const v = Number(bloc.salary_variable_share);
      vEl.textContent = (isFinite(v) ? `${Math.round(v)}%` : "");
    }

    const nEl = q("js-statut-generation");
    if (nEl) {
      anyEl = anyEl || nEl;
      nEl.textContent = (bloc.salary_notes || "").toString().trim();
    }

    if (anyEl) forceShow(anyEl);
    return !!anyEl;
  }

  function run(){
    const bloc = getBloc();
    const hasData = hasSalaryData(bloc);

    const okNew = renderNewCard(bloc);
    const okLegacy = renderLegacyFields(bloc);

    // If we have data but no nodes, log for debug
    if (DEBUG && hasData && !okNew && !okLegacy) {
      console.warn("[salary.patch5] salary data exists but no salary DOM IDs found. Add IDs or check they are IDs (not classes).", {
        needOneOf: IDS_NEW.concat(IDS_LEGACY)
      });
    }

    log("run", { hasData, okNew, okLegacy });
  }

  function onReady(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 30);
        setTimeout(run, 200);
        setTimeout(run, 650);
      });
      return;
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 25) clearInterval(t);
    }, 200);
  }

  onReady();
})();
