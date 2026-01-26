(function(){
  // =========================================================
  // ULYDIA — SALARY PATCH14 (reads nested salary + currency from chips)
  // Fix: Currency stored under bloc.chips.Currency
  // Safe: no throw, no blocking
  // =========================================================
  if (window.__ULYDIA_SALARY_PATCH14__) return;
  window.__ULYDIA_SALARY_PATCH14__ = true;

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function setText(el, v){ if (!el) return; el.textContent = (v==null? "" : String(v)); }
  function isNum(x){ return typeof x === "number" && isFinite(x); }

  function getVal(bloc, key){
    if (!bloc) return undefined;
    if (bloc[key] !== undefined) return bloc[key];
    const dk = Object.keys(bloc||{}).find(x => x && x.toLowerCase() === String(key).toLowerCase());
    if (dk) return bloc[dk];
    if (bloc.chips){
      if (bloc.chips[key] !== undefined) return bloc.chips[key];
      const ck = Object.keys(bloc.chips||{}).find(x => x && x.toLowerCase() === String(key).toLowerCase());
      if (ck) return bloc.chips[ck];
    }
    return undefined;
  }

  function getSalaryValue(bloc, flatKey, pathArr){
    const fv = getVal(bloc, flatKey);
    if (fv !== undefined && fv !== null && fv !== "" && !(isNum(fv) && fv === 0)) return fv;

    let cur = bloc;
    for (const k of (pathArr||[])){
      cur = cur?.[k];
      if (cur === undefined || cur === null) break;
    }
    return cur;
  }

  function toK(n){
    const num = (typeof n === "string") ? parseFloat(String(n).replace(/\s/g,"").replace(",", ".")) : n;
    if (!isFinite(num)) return null;
    // assume input is annual EUR in absolute, e.g. 24000
    if (num >= 1000) return Math.round(num/1000);
    // already in K
    if (num > 0 && num < 1000) return Math.round(num);
    return null;
  }

  function formatRange(min, max, cur){
    const k1 = toK(min);
    const k2 = toK(max);
    const suffix = cur ? String(cur).trim() : "";
    if (k1 && k2) return `${k1}–${k2}K${suffix? " " + suffix : ""}`.trim();
    if (k1) return `${k1}K${suffix? " " + suffix : ""}`.trim();
    if (k2) return `${k2}K${suffix? " " + suffix : ""}`.trim();
    return "";
  }

  function render(){
    const bloc = window.__ULYDIA_BLOC__ || window.__ULYDIA_BLOC;
    if (!bloc) return;

    // currency from chips
    const cur = (getVal(bloc, "Currency") || getVal(bloc, "currency") || "").toString().trim();
    // typical you store "EUR (€)" already
    const curSuffix = cur ? cur : "";

    const jMin = getSalaryValue(bloc, "salary_junior_min", ["salary","junior","min"]);
    const jMax = getSalaryValue(bloc, "salary_junior_max", ["salary","junior","max"]);
    const mMin = getSalaryValue(bloc, "salary_mid_min",    ["salary","mid","min"]);
    const mMax = getSalaryValue(bloc, "salary_mid_max",    ["salary","mid","max"]);
    const sMin = getSalaryValue(bloc, "salary_senior_min", ["salary","senior","min"]);
    const sMax = getSalaryValue(bloc, "salary_senior_max", ["salary","senior","max"]);

    const vShare = getSalaryValue(bloc, "salary_variable_share", ["salary","variable_share_pct"]);
    const vPct = (vShare!==undefined && vShare!==null && vShare!=="") ? String(vShare).trim() : "";

    // DOM nodes in salary card
    const elJunior = qs(".js-sal-junior-range");
    const elMid    = qs(".js-sal-mid-range");
    const elSenior = qs(".js-sal-senior-range");
    const elVar    = qs(".js-sal-variable-range, .js-sal-variable");
    // optional legacy nodes (direct)
    const elJMin = qs(".js-sal-junior-min"), elJMax = qs(".js-sal-junior-max");
    const elMMin = qs(".js-sal-mid-min"),    elMMax = qs(".js-sal-mid-max");
    const elSMin = qs(".js-sal-senior-min"), elSMax = qs(".js-sal-senior-max");

    const jr = formatRange(jMin, jMax, curSuffix);
    const mr = formatRange(mMin, mMax, curSuffix);
    const sr = formatRange(sMin, sMax, curSuffix);

    if (elJunior) setText(elJunior, jr);
    if (elMid)    setText(elMid, mr);
    if (elSenior) setText(elSenior, sr);

    if (elJMin) setText(elJMin, jMin);
    if (elJMax) setText(elJMax, jMax);
    if (elMMin) setText(elMMin, mMin);
    if (elMMax) setText(elMMax, mMax);
    if (elSMin) setText(elSMin, sMin);
    if (elSMax) setText(elSMax, sMax);

    if (elVar){
      if (vPct){
        // if already like 15, show "15%"
        const pctNum = parseFloat(String(vPct).replace(",", "."));
        setText(elVar, isFinite(pctNum) ? `${Math.round(pctNum)}%` : vPct);
      } else {
        setText(elVar, "");
        const row = elVar.closest(".u-sal-row, .u-sal-item, .w-layout-grid > div");
        if (row) row.style.display = "none";
      }
    }

    // Hide empty rows
    const card = qs(".u-salary-card, .js-salary-card");
    if (card){
      const hasAny = !!(jr || mr || sr);
      card.style.display = hasAny ? "" : "none";
    }
  }

  let n=0;
  (function loop(){
    n++;
    try{ render(); }catch(e){}
    const bloc = window.__ULYDIA_BLOC__ || window.__ULYDIA_BLOC;
    if (bloc || n>80) return;
    setTimeout(loop, 50);
  })();
})();