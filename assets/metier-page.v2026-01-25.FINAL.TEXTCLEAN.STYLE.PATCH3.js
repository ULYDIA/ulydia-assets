/* metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH3.js
   ULYDIA — NBSP cleanup + LEFT typography stronger + comma line breaks + currency format + salary fallback (SAFE)

   Fixes:
   ✅ Removes literal "&nbsp;" as well as entity/encoded variants: &nbsp; &#160; &#xA0; \u00A0 &amp;nbsp;
   ✅ Applies cleanup not only to LEFT, but ALSO to RIGHT chips wrappers (skills/softskills/tools/etc.)
   ✅ LEFT text color: clearly visible gray; bold stays near-black (uses !important)
   ✅ In 3 RIGHT text blocks (Certifications / Schools / Portfolio): converts ", " to ",<br>"
   ✅ Currency display: formats "$" -> "USD ($)", "€" -> "EUR (€)", "£" -> "GBP (£)", etc.
      (writes into #js-chip-currency if present)
   ✅ Salary LEFT fallback: if salaire bloc empty but salary ranges exist, renders a small summary.

   Place AFTER rendering patches (LEFT/RIGHT/INDICATORS/SALARY/FAQ) so it can sanitize final DOM.
*/
(() => {
  if (window.__ULYDIA_TEXTCLEAN_STYLE_PATCH3__) return;
  window.__ULYDIA_TEXTCLEAN_STYLE_PATCH3__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[textclean.style.patch3]", ...a);

  const LEFT_IDS = ["js-bf-formation","js-bf-acces","js-bf-marche","js-bf-salaire"];

  const CHIP_WRAP_IDS = [
    "js-skills-wrap","js-softskills-wrap","js-tools-wrap",
    "js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"
  ];

  const COMMA_BREAK_IDS = ["js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"];

  function ensureStyle(){
    if (document.getElementById("ulydia-left-typography-patch3")) return;

    const css = `
/* LEFT: force visible gray for normal text */
#js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire{
  color: #9CA3AF !important; /* visible gray */
}
#js-bf-formation *, #js-bf-acces *, #js-bf-marche *, #js-bf-salaire *{
  color: inherit;
}
#js-bf-formation strong, #js-bf-acces strong, #js-bf-marche strong, #js-bf-salaire strong,
#js-bf-formation b, #js-bf-acces b, #js-bf-marche b, #js-bf-salaire b{
  color: #111827 !important; /* near-black */
}

/* Rhythm */
#js-bf-formation p, #js-bf-acces p, #js-bf-marche p, #js-bf-salaire p{ margin: 0.35rem 0 !important; }
#js-bf-formation ul, #js-bf-acces ul, #js-bf-marche ul, #js-bf-salaire ul{ margin: 0.35rem 0 0.35rem 1.1rem !important; }
#js-bf-formation li, #js-bf-acces li, #js-bf-marche li, #js-bf-salaire li{ margin: 0.2rem 0 !important; }
    `.trim();

    const st = document.createElement("style");
    st.id = "ulydia-left-typography-patch3";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function cleanStr(s){
    if (!s) return s;
    return String(s)
      // literal strings
      .replace(/&amp;nbsp;/gi, " ")
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      // actual NBSP char
      .replace(/\u00A0/g, " ")
      // collapse excessive spaces
      .replace(/\s{2,}/g, " ");
  }

  function sanitizeEl(el){
    if (!el) return false;

    const before = el.innerHTML;
    const after = cleanStr(before);
    if (after !== before) el.innerHTML = after;

    // Clean text nodes too
    let changed = (after !== before);
    try {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        const t0 = node.nodeValue || "";
        const t1 = cleanStr(t0);
        if (t1 !== t0) { node.nodeValue = t1; changed = true; }
      }
    } catch(e){}

    return changed;
  }

  function commaToBreaks(el){
    if (!el) return false;
    // don't break if structured list exists
    if (el.querySelector("ul,ol,li")) return false;
    const before = el.innerHTML || "";
    const after = before.replace(/,\s+/g, ",<br>");
    if (after !== before) { el.innerHTML = after; return true; }
    return false;
  }

  function currencyCodeFromSymbol(sym){
    const s = String(sym || "").trim();
    if (!s) return "";
    if (s === "€") return "EUR";
    if (s === "$") return "USD";
    if (s === "£") return "GBP";
    if (s.toUpperCase() === "CHF") return "CHF";
    if (s.toUpperCase() === "CAD") return "CAD";
    if (s.toUpperCase() === "AUD") return "AUD";
    return "";
  }

  function formatCurrencyDisplay(sym){
    const s = String(sym || "").trim();
    if (!s) return "";
    // If already like "EUR (€)" keep it
    if (/\b[A-Z]{3}\b/.test(s) && /\(.+\)/.test(s)) return s;

    const code = currencyCodeFromSymbol(s) || (s.length === 3 ? s.toUpperCase() : "");
    const symbol = (s.length === 1 || s === "CHF") ? s : (code && ["CHF","CAD","AUD"].includes(code) ? code : s);
    if (!code) return s;
    // prefer "EUR (€)" etc.
    const symOut = (code === "CHF" || code === "CAD" || code === "AUD") ? code : symbol;
    const paren = (code === "CHF" || code === "CAD" || code === "AUD") ? code : symbol;
    // if symbol is code, show code only
    if (code === paren) return code;
    return `${code} (${paren})`;
  }

  function setCurrencyDisplay(){
    const b = window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || {};
    const iso = (b.iso || window.__ULYDIA_METIER_PAGE_CTX__?.iso || "").toString().toUpperCase();
    let cur = (b.currency || b.Currency || "").toString().trim();

    // Fallback for Europe if missing
    if (!cur && iso && ["FR","DE","ES","IT","NL","BE","PT","IE","AT","FI","GR","LU","SI","SK","EE","LV","LT","MT","CY"].includes(iso)) cur = "€";
    if (!cur) return false;

    const disp = formatCurrencyDisplay(cur);
    if (!disp) return false;

    // update chip if exists
    const el = document.getElementById("js-chip-currency");
    if (el) el.textContent = disp;

    // keep data for other patches
    try {
      if (window.__ULYDIA_BLOC__) window.__ULYDIA_BLOC__.currency_display = disp;
      if (window.__ULYDIA_METIER_PAGE_CTX__?.blocFields) window.__ULYDIA_METIER_PAGE_CTX__.blocFields.currency_display = disp;
    } catch(e){}

    return true;
  }

  function formatMoney(n, dispOrSym){
    const x = Number(n);
    if (!Number.isFinite(x) || x <= 0) return "";
    // Use display if it's like "EUR (€)" -> extract symbol "€" for money
    let sym = String(dispOrSym || "").trim();
    const m = sym.match(/\(([^)]+)\)/);
    if (m && m[1]) sym = m[1];
    // don't add symbol if still empty
    return `${Math.round(x)}${sym ? " " + sym : ""}`.trim();
  }

  function salaryFallback(){
    const el = document.getElementById("js-bf-salaire");
    if (!el) return false;

    const isEmpty = !String(el.textContent || "").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
    if (!isEmpty) return false;

    const b = window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || {};
    const curDisp = b.currency_display || b.currency || window.__ULYDIA_METIER_PAGE_CTX__?.currency || "";

    const jMin = b.salary_junior_min, jMax = b.salary_junior_max;
    const mMin = b.salary_mid_min,    mMax = b.salary_mid_max;
    const sMin = b.salary_senior_min, sMax = b.salary_senior_max;

    const hasAny = [jMin,jMax,mMin,mMax,sMin,sMax].some(v => Number(v) > 0);
    if (!hasAny) return false;

    const parts = [];
    if (Number(jMin)>0 || Number(jMax)>0) parts.push(`<li><strong>Junior</strong> : ${formatMoney(jMin,curDisp)} – ${formatMoney(jMax,curDisp)}</li>`);
    if (Number(mMin)>0 || Number(mMax)>0) parts.push(`<li><strong>Confirmé</strong> : ${formatMoney(mMin,curDisp)} – ${formatMoney(mMax,curDisp)}</li>`);
    if (Number(sMin)>0 || Number(sMax)>0) parts.push(`<li><strong>Senior</strong> : ${formatMoney(sMin,curDisp)} – ${formatMoney(sMax,curDisp)}</li>`);

    const notes = cleanStr((b.salary_notes || "").toString().trim());
    const noteHtml = notes ? `<p>${notes}</p>` : "";

    el.innerHTML = `
      <p><strong>Fourchettes indicatives</strong> (selon expérience, région et statut).</p>
      <ul>${parts.join("")}</ul>
      ${noteHtml}
    `.trim();

    return true;
  }

  function run(){
    ensureStyle();

    let changed = 0;

    // sanitize LEFT blocks
    LEFT_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (sanitizeEl(el)) changed++;
    });

    // sanitize chip wraps / right blocks
    CHIP_WRAP_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (sanitizeEl(el)) changed++;
    });

    // comma -> line breaks in specific blocks
    COMMA_BREAK_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (commaToBreaks(el)) changed++;
    });

    if (setCurrencyDisplay()) changed++;
    if (salaryFallback()) changed++;

    log("run", { changed });
  }

  // Observe dynamic updates (chips can be re-rendered)
  function observe(){
    const targets = [];
    [...LEFT_IDS, ...CHIP_WRAP_IDS].forEach(id => {
      const el = document.getElementById(id);
      if (el) targets.push(el);
    });
    if (!targets.length) return;

    const obs = new MutationObserver(() => {
      // debounce-ish
      if (observe._t) clearTimeout(observe._t);
      observe._t = setTimeout(run, 25);
    });
    targets.forEach(el => obs.observe(el, { childList: true, subtree: true, characterData: true }));
  }

  function onReady(){
    run();
    observe();

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(() => { run(); observe(); }, 30);
        setTimeout(run, 220);
        setTimeout(run, 600);
      });
      return;
    }

    // fallback
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      observe();
      if (tries > 25) clearInterval(t);
    }, 200);
  }

  onReady();
})();
