/* metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH4.js
   ULYDIA — NBSP cleanup + LEFT typography (configurable) + currency format + comma line breaks (SAFE)

   What it does:
   ✅ Removes "&nbsp;" in ALL forms (including literal "&nbsp;" and "&amp;nbsp;") from LEFT + RIGHT chips/text blocks
   ✅ LEFT typography:
      - normal text color = window.ULYDIA_LEFT_TEXT_COLOR || "#4B5563" (change here or set global)
      - bold/strong color = "#111827"
   ✅ Currency chip formatting into "EUR (€)", "USD ($)", "GBP (£)"... (writes into #js-chip-currency if present)
   ✅ In 3 RIGHT blocks (Certifications / Schools / Portfolio): converts ", " into ",<br>"
   ✅ Uses MutationObserver so chips re-renders are cleaned automatically

   Place AFTER render patches (LEFT/RIGHT/INDICATORS/SALARY/FAQ).
*/
(() => {
  if (window.__ULYDIA_TEXTCLEAN_STYLE_PATCH4__) return;
  window.__ULYDIA_TEXTCLEAN_STYLE_PATCH4__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[textclean.style.patch4]", ...a);

  const LEFT_COLOR = (window.ULYDIA_LEFT_TEXT_COLOR || "#4B5563").toString().trim(); // ← default: darker gray (recommended)

  const LEFT_IDS = ["js-bf-formation","js-bf-acces","js-bf-marche","js-bf-salaire"];
  const CHIP_WRAP_IDS = [
    "js-skills-wrap","js-softskills-wrap","js-tools-wrap",
    "js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"
  ];
  const COMMA_BREAK_IDS = ["js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"];

  function q(id){ return document.getElementById(id); }

  function ensureStyle(){
    if (document.getElementById("ulydia-left-typography-patch4")) return;
    const css = `
/* LEFT: normal text */
#js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire{
  color: ${LEFT_COLOR} !important;
}
#js-bf-formation strong, #js-bf-acces strong, #js-bf-marche strong, #js-bf-salaire strong,
#js-bf-formation b, #js-bf-acces b, #js-bf-marche b, #js-bf-salaire b{
  color: #111827 !important;
}
/* Rhythm */
#js-bf-formation p, #js-bf-acces p, #js-bf-marche p, #js-bf-salaire p{ margin: 0.35rem 0 !important; }
#js-bf-formation ul, #js-bf-acces ul, #js-bf-marche ul, #js-bf-salaire ul{ margin: 0.35rem 0 0.35rem 1.1rem !important; }
#js-bf-formation li, #js-bf-acces li, #js-bf-marche li, #js-bf-salaire li{ margin: 0.2rem 0 !important; }
    `.trim();
    const st = document.createElement("style");
    st.id = "ulydia-left-typography-patch4";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function cleanStr(s){
    if (!s) return s;
    return String(s)
      .replace(/&amp;nbsp;/gi, " ")
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\s{2,}/g, " ");
  }

  function sanitizeEl(el){
    if (!el) return false;
    const before = el.innerHTML;
    const after = cleanStr(before);
    if (after !== before) el.innerHTML = after;
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
    if (/\b[A-Z]{3}\b/.test(s) && /\(.+\)/.test(s)) return s;
    const code = currencyCodeFromSymbol(s) || (s.length === 3 ? s.toUpperCase() : "");
    if (!code) return s;
    if (["CHF","CAD","AUD"].includes(code)) return code;
    return `${code} (${s})`;
  }

  function setCurrencyDisplay(){
    const b = window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || {};
    const iso = (b.iso || window.__ULYDIA_METIER_PAGE_CTX__?.iso || "").toString().toUpperCase();
    let cur = (b.currency || b.Currency || "").toString().trim();
    if (!cur && iso && ["FR","DE","ES","IT","NL","BE","PT","IE","AT","FI","GR","LU","SI","SK","EE","LV","LT","MT","CY"].includes(iso)) cur = "€";
    if (!cur) return false;
    const disp = formatCurrencyDisplay(cur);
    if (!disp) return false;
    const el = q("js-chip-currency");
    if (el) el.textContent = disp;
    try {
      if (window.__ULYDIA_BLOC__) window.__ULYDIA_BLOC__.currency_display = disp;
      if (window.__ULYDIA_METIER_PAGE_CTX__?.blocFields) window.__ULYDIA_METIER_PAGE_CTX__.blocFields.currency_display = disp;
    } catch(e){}
    return true;
  }

  function run(){
    ensureStyle();
    let changed = 0;

    LEFT_IDS.forEach(id => { const el = q(id); if (sanitizeEl(el)) changed++; });
    CHIP_WRAP_IDS.forEach(id => { const el = q(id); if (sanitizeEl(el)) changed++; });
    COMMA_BREAK_IDS.forEach(id => { const el = q(id); if (commaToBreaks(el)) changed++; });

    if (setCurrencyDisplay()) changed++;
    log("run", { changed, LEFT_COLOR });
  }

  function observe(){
    const targets = [];
    [...LEFT_IDS, ...CHIP_WRAP_IDS].forEach(id => { const el = q(id); if (el) targets.push(el); });
    if (!targets.length) return;
    const obs = new MutationObserver(() => {
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
