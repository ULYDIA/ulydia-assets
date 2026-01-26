/* ULYDIA — Salary block renderer (K formatting + currency) — PATCH11 SAFE
   - Fills placeholders:
     #js-sal-junior-min, #js-sal-junior-max, #js-sal-mid-min, #js-sal-mid-max,
     #js-sal-senior-min, #js-sal-senior-max, #js-sal-variable-share
   - Monthly/annual detection:
     if max < 10000 => monthly => x12
   - Never throws
*/
(function(){
  try{
    function $(id){ return document.getElementById(id); }
    function num(x){
      var n = parseFloat(String(x||"").replace(/[^\d.]/g,""));
      return isFinite(n) ? n : null;
    }

    var d = window.__ULYDIA_JOB__ || window.__ULYDIA_METIER__ || window.__ULYDIA_METIER_DATA__ || window.__ULYDIA_DATA__ || {};
    var f = (d && (d.fieldData || d.fields || (d.item && (d.item.fieldData||d.item.fields)))) || d || {};

    var flat = window.__ULYDIA_FLAT__ || window.__ULYDIA_FLAT_DATA__ || {};

    function getN(key){
      var v = f[key];
      if (v==null) v = flat[key];
      return num(v);
    }

    var jMin = getN("salary_junior_min"), jMax = getN("salary_junior_max");
    var mMin = getN("salary_mid_min"),    mMax = getN("salary_mid_max");
    var sMin = getN("salary_senior_min"), sMax = getN("salary_senior_max");
    var vShare = getN("salary_variable_share");

    var cur = String(f.currency || flat.currency || "€").trim();
    var curSymbol = cur;
    if (/€/.test(cur) || /EUR/i.test(cur)) curSymbol = "€";
    else if (/\$/.test(cur) || /USD/i.test(cur)) curSymbol = "$";
    else if (/£/.test(cur) || /GBP/i.test(cur)) curSymbol = "£";
    else if (/CHF/i.test(cur)) curSymbol = "CHF";
    else if (/CAD/i.test(cur)) curSymbol = "CAD";
    else if (/AUD/i.test(cur)) curSymbol = "AUD";

    function annualizePair(min, max){
      if (max!=null && max < 10000) return [min!=null? min*12:null, max!=null? max*12:null];
      return [min,max];
    }
    var jm = annualizePair(jMin,jMax); jMin=jm[0]; jMax=jm[1];
    var mm = annualizePair(mMin,mMax); mMin=mm[0]; mMax=mm[1];
    var sm = annualizePair(sMin,sMax); sMin=sm[0]; sMax=sm[1];

    function fmtK(n){
      if (n==null) return "";
      var k = Math.round(n/1000);
      return k + "K" + curSymbol;
    }
    function fmtPct(n){
      if (n==null) return "";
      return String(Math.round(n)) + "%";
    }

    if ($("js-sal-junior-min")) $("js-sal-junior-min").textContent = jMin!=null? fmtK(jMin):"";
    if ($("js-sal-junior-max")) $("js-sal-junior-max").textContent = jMax!=null? fmtK(jMax):"";
    if ($("js-sal-mid-min"))    $("js-sal-mid-min").textContent    = mMin!=null? fmtK(mMin):"";
    if ($("js-sal-mid-max"))    $("js-sal-mid-max").textContent    = mMax!=null? fmtK(mMax):"";
    if ($("js-sal-senior-min")) $("js-sal-senior-min").textContent = sMin!=null? fmtK(sMin):"";
    if ($("js-sal-senior-max")) $("js-sal-senior-max").textContent = sMax!=null? fmtK(sMax):"";
    if ($("js-sal-variable-share")) $("js-sal-variable-share").textContent = vShare!=null? fmtPct(vShare):"";

    var hasAny = (jMin!=null||jMax!=null||mMin!=null||mMax!=null||sMin!=null||sMax!=null||vShare!=null);
    var card = document.querySelector("[data-ulydia='salary-card'], .js-salary-card, #js-salary-card");
    if (card) card.style.display = hasAny ? "" : "none";
  }catch(e){
    try{ console.warn("[ULYDIA][SALARY][PATCH11] skipped:", e); }catch(_){}
  }
})();