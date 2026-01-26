(function(){
  "use strict";
  // =========================================================
  // ULYDIA — SALARY PATCH10 (metier fields first)
  // - Reads salary_* from:
  //   1) window.__ULYDIA_METIER_PAGE_CTX__.metier.fieldData
  //   2) window.__ULYDIA_BLOC__ (flattened)
  //   3) window.__ULYDIA_METIER_PAGE_CTX__.blocFields (fallback)
  // - Fills existing DOM ids:
  //   js-sal-junior-min/max, js-sal-mid-min/max, js-sal-senior-min/max,
  //   js-sal-variable-share, js-sal-currency, js-sal-notes
  // - Shows/Hides the salary card based on available data
  // - Formats amounts as K (e.g., 35-45K€ / 45–60K$) depending on currency
  // =========================================================
  window.__ULYDIA_SALARY_PATCH10__ = true;

  function log(){ if (window.__METIER_PAGE_DEBUG__) console.log.apply(console, ["[SALARY.P10]"].concat([].slice.call(arguments))); }
  function qs(id){ return document.getElementById(id); }
  function txt(el, v){ if (!el) return; el.textContent = String(v==null ? "" : v); }

  function pickCurrencySymbol(cur){
    cur = String(cur||"").trim();
    if (!cur) return "";
    // If already a symbol like €, $, £
    if (cur.length <= 3 && /[€$£]/.test(cur)) return cur;
    const up = cur.toUpperCase();
    if (up.includes("EUR")) return "€";
    if (up.includes("USD")) return "$";
    if (up.includes("GBP")) return "£";
    if (up.includes("CHF")) return "CHF";
    if (up.includes("CAD")) return "CAD";
    if (up.includes("AUD")) return "AUD";
    // last resort keep as-is (short)
    return cur;
  }

  function readNumber(x){
    if (x == null) return null;
    if (typeof x === "number" && isFinite(x)) return Math.round(x);
    const s = String(x).replace(/[^\d.-]/g,"").trim();
    if (!s) return null;
    const n = parseFloat(s);
    if (!isFinite(n)) return null;
    return Math.round(n);
  }

  function getData(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__ || {};
    const met = (ctx.metier && (ctx.metier.fieldData || ctx.metier.fields || ctx.metier)) || {};
    const flat = window.__ULYDIA_BLOC__ || {};
    const bf  = ctx.blocFields || {};

    function g(key){
      return met[key] != null ? met[key]
        : (flat[key] != null ? flat[key]
        : (bf[key] != null ? bf[key] : null));
    }

    const data = {
      currency: g("currency") || g("Currency") || "",
      junior_min: readNumber(g("salary_junior_min")),
      junior_max: readNumber(g("salary_junior_max")),
      mid_min:    readNumber(g("salary_mid_min")),
      mid_max:    readNumber(g("salary_mid_max")),
      senior_min: readNumber(g("salary_senior_min")),
      senior_max: readNumber(g("salary_senior_max")),
      variable_share: readNumber(g("salary_variable_share")),
      notes: String(g("salary_notes") || "").trim()
    };
    return data;
  }

  function toK(n){
    if (!isFinite(n) || n <= 0) return null;
    // If user stores monthly amounts (e.g. 2000-4500), we can keep as-is (no K) would look odd.
    // He wants K format: we assume stored values are annual when > 12000, else treat as monthly and convert to annual.
    let annual = n;
    if (annual < 12000) annual = annual * 12;
    // 35000 -> 35K
    return Math.round(annual/1000);
  }

  function formatRange(minV, maxV, curSym){
    const a = toK(minV), b = toK(maxV);
    if (a == null && b == null) return "";
    if (a != null && b != null) return a + "–" + b + "K" + curSym;
    if (a != null) return a + "K" + curSym;
    return b + "K" + curSym;
  }

  function setBarWidth(barId, minV, maxV, allMax){
    const bar = qs(barId);
    if (!bar) return;
    const kMax = toK(allMax || maxV || minV || 0) || 0;
    const kVal = toK(maxV || minV || 0) || 0;
    let pct = 0;
    if (kMax > 0) pct = Math.max(10, Math.min(100, Math.round((kVal / kMax) * 100)));
    bar.style.width = pct + "%";
  }

  function findSalaryCard(){
    // Prefer explicit wrapper
    const byId = document.getElementById("js-salary-wrap") || document.querySelector("[data-ulydia='salary-card']");
    if (byId) return byId;

    // Find a card header containing "Grille salariale"
    const headers = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span")).filter(el=>{
      const t = (el.textContent||"").trim().toLowerCase();
      return t.includes("grille salariale");
    });
    if (!headers.length) return null;
    // climb to nearest card container (heuristic)
    let el = headers[0];
    for (let i=0;i<8 && el;i++){
      if (el.classList && (el.classList.contains("u-card") || el.classList.contains("card") || el.getAttribute("data-card")==="true")) return el;
      el = el.parentElement;
    }
    return headers[0].closest("section,div") || null;
  }

  function render(){
    const d = getData();
    const curSym = pickCurrencySymbol(d.currency);

    const hasAny =
      (d.junior_min || d.junior_max || d.mid_min || d.mid_max || d.senior_min || d.senior_max || d.variable_share || d.notes);

    const card = findSalaryCard();
    if (!hasAny) {
      if (card) card.style.display = "none";
      log("no salary data -> hide");
      return;
    }
    if (card) card.style.display = "";

    // Fill text nodes if present
    txt(qs("js-sal-currency"), curSym ? ("(" + curSym + ")") : "");
    txt(qs("js-sal-junior-range"), formatRange(d.junior_min, d.junior_max, curSym));
    txt(qs("js-sal-mid-range"),    formatRange(d.mid_min, d.mid_max, curSym));
    txt(qs("js-sal-senior-range"), formatRange(d.senior_min, d.senior_max, curSym));

    // If your design uses min/max separate nodes:
    txt(qs("js-sal-junior-min"), d.junior_min != null ? d.junior_min : "");
    txt(qs("js-sal-junior-max"), d.junior_max != null ? d.junior_max : "");
    txt(qs("js-sal-mid-min"),    d.mid_min != null ? d.mid_min : "");
    txt(qs("js-sal-mid-max"),    d.mid_max != null ? d.mid_max : "");
    txt(qs("js-sal-senior-min"), d.senior_min != null ? d.senior_min : "");
    txt(qs("js-sal-senior-max"), d.senior_max != null ? d.senior_max : "");

    txt(qs("js-sal-variable-share"), (d.variable_share != null && d.variable_share !== 0) ? (d.variable_share + "%") : "");
    txt(qs("js-sal-notes"), d.notes || "");

    // Progress bars (if ids exist)
    const allMax = Math.max(d.junior_max||0, d.mid_max||0, d.senior_max||0);
    setBarWidth("js-sal-bar-junior", d.junior_min, d.junior_max, allMax);
    setBarWidth("js-sal-bar-mid",    d.mid_min,    d.mid_max,    allMax);
    setBarWidth("js-sal-bar-senior", d.senior_min, d.senior_max, allMax);
    setBarWidth("js-sal-bar-variable", 0, d.variable_share || 0, 100);

    log("rendered", d);
  }

  // Run after base renders
  let tries = 0;
  function boot(){
    tries++;
    if (tries > 120) return; // ~24s
    if (!window.__ULYDIA_METIER_PAGE_CTX__) { setTimeout(boot, 200); return; }
    // Wait a bit for DOM blocks
    const card = findSalaryCard();
    if (!card && tries < 15) { setTimeout(boot, 200); return; }
    try { render(); } catch(e){ log("error", e); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();