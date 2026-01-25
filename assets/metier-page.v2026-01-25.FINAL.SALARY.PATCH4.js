/* metier-page.v2026-01-25.FINAL.SALARY.PATCH4.js
   ULYDIA — Salary card renderer (SAFE)
   - Supports your existing numeric fields:
     salary_junior_min/max, salary_mid_min/max, salary_senior_min/max, salary_variable_share, salary_notes, currency (+ iso)
   - Renders either:
     A) "new card" layout (recommended) if the required IDs exist (ranges + bars)
     B) legacy granular fields (js-sal-junior-min etc.) if present

   NEW CARD expected IDs (add these in Webflow inside your salary card):
     - js-sal-title                (e.g., "Grille salariale (France)")
     - js-sal-junior-range         (e.g., "35–45K€")
     - js-sal-mid-range
     - js-sal-senior-range
     - js-sal-junior-fill          (bar fill div)
     - js-sal-mid-fill
     - js-sal-senior-fill
     - js-sal-junior-exp           (e.g., "0–2 ans d'expérience")
     - js-sal-mid-exp              (e.g., "3–5 ans d'expérience")
     - js-sal-senior-exp           (e.g., "5+ ans d'expérience")
     - js-sal-variable-range       (e.g., "5–15%")
     - js-sal-variable-fill        (bar fill div)
     - js-sal-variable-note        (e.g., "Bonus, intéressement, participation")
     - js-sal-notes                (optional paragraph for salary_notes)

   LEGACY IDs (already in your page):
     - js-sal-junior-min / js-sal-junior-max / js-sal-mid-min / js-sal-mid-max / js-sal-senior-min / js-sal-senior-max
     - js-sal-variable-share / js-statut-generation
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH4__) return;
  window.__ULYDIA_SALARY_PATCH4__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[salary.patch4]", ...a);

  function q(id){ return document.getElementById(id); }
  function txt(el, v){ if (el) el.textContent = (v == null ? "" : String(v)); }
  function clamp(n, a, b){ n = Number(n); if(!isFinite(n)) return a; return Math.max(a, Math.min(b, n)); }

  function getBloc(){
    return window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || window.__ULYDIA_METIER_PAGE_CTX__ || {};
  }

  function currencySymbol(bloc){
    // prefer display prepared by TEXTCLEAN patch3
    const disp = (bloc.currency_display || "").toString().trim();
    if (disp) {
      const m = disp.match(/\(([^)]+)\)/);
      if (m && m[1]) return m[1];
      // CHF/CAD/AUD might be code-only
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
    // Heuristic: if values look like monthly (<= 20000), convert to annual (x12)
    const a = Number(minVal)||0, b = Number(maxVal)||0;
    const scaleMonthly = (Math.max(a,b) > 0 && Math.max(a,b) <= 20000);
    if (scaleMonthly) return [a*12, b*12, "annual_from_monthly"];
    return [a, b, "annual_or_unknown"];
  }

  function formatRangeK(minVal, maxVal, sym){
    // Display as "35–45K€" if values are annual euros in absolute numbers
    const a = Number(minVal)||0, b = Number(maxVal)||0;
    if (a<=0 && b<=0) return "";
    const lo = Math.min(a,b), hi = Math.max(a,b);
    // round to nearest 1k
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

  function renderNewCard(bloc){
    const elTitle = q("js-sal-title");
    const elJRange = q("js-sal-junior-range");
    const elMRange = q("js-sal-mid-range");
    const elSRange = q("js-sal-senior-range");
    const elJFill = q("js-sal-junior-fill");
    const elMFill = q("js-sal-mid-fill");
    const elSFill = q("js-sal-senior-fill");
    const elJExp = q("js-sal-junior-exp");
    const elMExp = q("js-sal-mid-exp");
    const elSExp = q("js-sal-senior-exp");
    const elVRange = q("js-sal-variable-range");
    const elVFill = q("js-sal-variable-fill");
    const elVNote = q("js-sal-variable-note");
    const elNotes = q("js-sal-notes");

    const hasNew = !!(elJRange && elMRange && elSRange && (elJFill||elMFill||elSFill));
    if (!hasNew) return false;

    const sym = currencySymbol(bloc);

    const [jMinA,jMaxA] = normalizeAnnual(bloc.salary_junior_min, bloc.salary_junior_max);
    const [mMinA,mMaxA] = normalizeAnnual(bloc.salary_mid_min, bloc.salary_mid_max);
    const [sMinA,sMaxA] = normalizeAnnual(bloc.salary_senior_min, bloc.salary_senior_max);

    const jr = formatRangeK(jMinA,jMaxA,sym);
    const mr = formatRangeK(mMinA,mMaxA,sym);
    const sr = formatRangeK(sMinA,sMaxA,sym);

    // Compute global scale (use max of each level, ignore zeros)
    const maxima = [jMaxA,mMaxA,sMaxA].map(x=>Number(x)||0).filter(x=>x>0);
    const minima = [jMinA,mMinA,sMinA].map(x=>Number(x)||0).filter(x=>x>0);
    const minAll = minima.length ? Math.min(...minima) : 0;
    const maxAll = maxima.length ? Math.max(...maxima) : 0;

    txt(elJRange, jr);
    txt(elMRange, mr);
    txt(elSRange, sr);

    // Experience labels (static, as in your mock)
    txt(elJExp, "0–2 ans d'expérience");
    txt(elMExp, "3–5 ans d'expérience");
    txt(elSExp, "5+ ans d'expérience");

    // Bar fills based on max salary for each level
    setFill(elJFill, computePct(jMaxA, minAll, maxAll));
    setFill(elMFill, computePct(mMaxA, minAll, maxAll));
    setFill(elSFill, computePct(sMaxA, minAll, maxAll));

    // Title: if already set in design, keep it; otherwise set default
    if (elTitle && !String(elTitle.textContent||"").trim()) {
      const country = (bloc.iso || "").toString().toUpperCase() || "—";
      txt(elTitle, `Grille salariale (${country})`);
    }

    // Variable share
    const v = Number(bloc.salary_variable_share);
    if (elVRange) {
      if (isFinite(v) && v > 0) txt(elVRange, `${Math.round(v)}%`);
      else txt(elVRange, "0%");
    }
    if (elVFill) {
      if (isFinite(v) && v > 0) setFill(elVFill, clamp(v,0,100));
      else setFill(elVFill, 0);
    }
    if (elVNote && !String(elVNote.textContent||"").trim()) {
      txt(elVNote, "Bonus, intéressement, participation");
    }

    // Notes
    const notes = (bloc.salary_notes || "").toString().trim();
    if (elNotes) txt(elNotes, notes);

    return true;
  }

  function renderLegacyFields(bloc){
    const sym = currencySymbol(bloc);
    // legacy expects raw values; keep as-is but add symbol
    function setNum(id, val){
      const el = q(id);
      if (!el) return;
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
      const v = Number(bloc.salary_variable_share);
      vEl.textContent = (isFinite(v) ? `${Math.round(v)}%` : "");
    }
    const nEl = q("js-statut-generation");
    if (nEl) nEl.textContent = (bloc.salary_notes || "").toString().trim();
    return true;
  }

  function run(){
    const bloc = getBloc();
    const okNew = renderNewCard(bloc);
    const okLegacy = renderLegacyFields(bloc);
    log("run", { okNew, okLegacy });
  }

  function onReady(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 30);
        setTimeout(run, 200);
      });
      return;
    }
    // fallback
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 25) clearInterval(t);
    }, 200);
  }

  onReady();
})();
