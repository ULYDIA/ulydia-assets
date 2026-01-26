(function(){
  "use strict";
  // =========================================================
  // ULYDIA — SALARY PATCH9 (robust)
  // - Fills salary texts + bars
  // - Formats as K€ / K$ / K£ / KCHF (or plain if < 1000)
  // - Works with ids OR classes:
  //   js-sal-junior-min/max, js-sal-mid-min/max, js-sal-senior-min/max, js-sal-variable-share
  //   Optional: js-sal-range-junior/mid/senior, js-sal-range-variable, js-sal-notes
  //   Optional bars: js-sal-bar-fill-junior/mid/senior/variable (id or class)
  // =========================================================
  window.__ULYDIA_SALARY_PATCH9__ = true;

  function log(){ if (window.__METIER_PAGE_DEBUG__) console.log.apply(console, ["[SALARY.P9]"].concat([].slice.call(arguments))); }

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function byToken(token){
    // prefer id, else class
    return document.getElementById(token) || document.querySelector("."+token);
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || window.__ULYDIA_PAGE_CTX__ || {};
  }

  function pickCurrency(ctx){
    var s = (ctx && ctx.salary) ? ctx.salary : (window.__ULYDIA_BLOC__ || {}).salary || {};
    var c = (s && (s.currency || s.Currency)) || ctx.currency || (window.__ULYDIA_BLOC__||{}).currency || "";
    c = String(c||"").trim();
    // allow "EUR (€)" etc -> extract symbol inside ()
    var m = c.match(/\(([^)]+)\)/);
    if (m && m[1]) return m[1].trim();
    return c;
  }

  function symToPrefix(sym){
    var map = { "€":"€", "$":"$", "£":"£", "CHF":"CHF", "CAD":"CAD", "AUD":"AUD" };
    return map[sym] || sym || "€";
  }

  function formatK(n, sym){
    if (n === null || n === undefined || n === "") return "";
    var v = Number(n);
    if (!isFinite(v)) return "";
    var prefix = symToPrefix(sym);
    if (v >= 1000) {
      var k = Math.round(v/100)/10; // 1 decimal
      // if integer
      if (Math.abs(k - Math.round(k)) < 1e-9) k = Math.round(k);
      return k + "K" + prefix;
    }
    return Math.round(v) + prefix;
  }

  function setText(token, txt){
    var el = byToken(token);
    if (!el) return false;
    el.textContent = txt;
    return true;
  }

  function setFill(token, frac){
    var el = byToken(token);
    if (!el) return false;
    var f = Math.max(0, Math.min(1, frac));
    el.style.width = (f*100).toFixed(0) + "%";
    return true;
  }

  function computeFrac(min, max, globalMin, globalMax){
    if (!isFinite(min) || !isFinite(max) || globalMax<=globalMin) return 0;
    var mid = (min+max)/2;
    return (mid - globalMin) / (globalMax - globalMin);
  }

  function render(){
    var ctx = getCtx();
    var b = window.__ULYDIA_BLOC__ || {};
    var s = (b && b.salary) ? b.salary : (ctx && ctx.salary) ? ctx.salary : {};

    var jm = Number(s.salary_junior_min ?? s.salaryJuniorMin ?? s.junior_min);
    var jx = Number(s.salary_junior_max ?? s.salaryJuniorMax ?? s.junior_max);
    var mm = Number(s.salary_mid_min ?? s.salaryMidMin ?? s.mid_min);
    var mx = Number(s.salary_mid_max ?? s.salaryMidMax ?? s.mid_max);
    var sm = Number(s.salary_senior_min ?? s.salarySeniorMin ?? s.senior_min);
    var sx = Number(s.salary_senior_max ?? s.salarySeniorMax ?? s.senior_max);
    var varShare = Number(s.salary_variable_share ?? s.salaryVariableShare ?? s.variable_share);

    // if missing, try from flattened fields
    function pickNum(k){
      var v = b[k];
      if (v===undefined) v = (ctx.blocFields||{})[k];
      var n = Number(v);
      return isFinite(n) ? n : NaN;
    }
    if (!isFinite(jm)) jm = pickNum("salary_junior_min");
    if (!isFinite(jx)) jx = pickNum("salary_junior_max");
    if (!isFinite(mm)) mm = pickNum("salary_mid_min");
    if (!isFinite(mx)) mx = pickNum("salary_mid_max");
    if (!isFinite(sm)) sm = pickNum("salary_senior_min");
    if (!isFinite(sx)) sx = pickNum("salary_senior_max");
    if (!isFinite(varShare)) varShare = pickNum("salary_variable_share");

    var sym = pickCurrency(ctx) || "€";

    // Show/hide whole card if no data at all
    var hasAny = [jm,jx,mm,mx,sm,sx,varShare].some(function(x){ return isFinite(x) && x>0; });
    var card = document.getElementById("js-salary-wrap") || document.querySelector(".js-salary-wrap") || null;
    if (card && !hasAny) { card.style.display="none"; return true; }
    if (card) card.style.display="";

    // Render ranges (K format)
    var jr = (isFinite(jm)&&isFinite(jx)) ? (formatK(jm,sym)+"–"+formatK(jx,sym)) : "";
    var mr = (isFinite(mm)&&isFinite(mx)) ? (formatK(mm,sym)+"–"+formatK(mx,sym)) : "";
    var sr = (isFinite(sm)&&isFinite(sx)) ? (formatK(sm,sym)+"–"+formatK(sx,sym)) : "";
    var vr = (isFinite(varShare)&&varShare>0) ? (Math.round(varShare)+"%") : "";

    // Fill min/max tokens too (for debug / hidden fields)
    setText("js-sal-junior-min", isFinite(jm)? String(Math.round(jm)) : "");
    setText("js-sal-junior-max", isFinite(jx)? String(Math.round(jx)) : "");
    setText("js-sal-mid-min", isFinite(mm)? String(Math.round(mm)) : "");
    setText("js-sal-mid-max", isFinite(mx)? String(Math.round(mx)) : "");
    setText("js-sal-senior-min", isFinite(sm)? String(Math.round(sm)) : "");
    setText("js-sal-senior-max", isFinite(sx)? String(Math.round(sx)) : "");
    setText("js-sal-variable-share", isFinite(varShare)? String(Math.round(varShare)) : "");

    // Range display tokens (preferred)
    setText("js-sal-range-junior", jr);
    setText("js-sal-range-mid", mr);
    setText("js-sal-range-senior", sr);
    setText("js-sal-range-variable", vr);

    // If those don't exist, try to place into nearby UI (best-effort)
    function setFirstVisible(selector, txt){
      var el = document.querySelector(selector);
      if (!el) return false;
      el.textContent = txt;
      return true;
    }
    if (jr) setFirstVisible(".js-sal-range-junior", jr);
    if (mr) setFirstVisible(".js-sal-range-mid", mr);
    if (sr) setFirstVisible(".js-sal-range-senior", sr);
    if (vr) setFirstVisible(".js-sal-range-variable", vr);

    // Bars
    var gmin = Math.min.apply(null, [jm,mm,sm].filter(isFinite));
    var gmax = Math.max.apply(null, [jx,mx,sx].filter(isFinite));
    if (!isFinite(gmin) || !isFinite(gmax) || gmax<=gmin) { gmin=0; gmax=1; }

    var jf = computeFrac(jm,jx,gmin,gmax);
    var mf = computeFrac(mm,mx,gmin,gmax);
    var sf = computeFrac(sm,sx,gmin,gmax);
    var vf = (isFinite(varShare) && varShare>0) ? Math.min(1, varShare/30) : 0;

    // token bars (if present)
    setFill("js-sal-bar-fill-junior", jf);
    setFill("js-sal-bar-fill-mid", mf);
    setFill("js-sal-bar-fill-senior", sf);
    setFill("js-sal-bar-fill-variable", vf);

    // Try fallback: within salary card, pick first 4 progress fills
    if (card){
      var fills = card.querySelectorAll(".u-sal-fill, .u-salary-fill, .u-bar-fill, .u-progress-fill");
      if (fills && fills.length >= 3){
        fills[0].style.width = (jf*100).toFixed(0)+"%";
        fills[1].style.width = (mf*100).toFixed(0)+"%";
        fills[2].style.width = (sf*100).toFixed(0)+"%";
        if (fills[3]) fills[3].style.width = (vf*100).toFixed(0)+"%";
      }
    }

    log("rendered", {jr,mr,sr,vr,sym});
    return true;
  }

  function wait(){
    // ensure ctx ready
    if (!window.__ULYDIA_BLOC__ && !window.__ULYDIA_METIER_PAGE_CTX__) { setTimeout(wait, 120); return; }
    render();
  }
  wait();
})();