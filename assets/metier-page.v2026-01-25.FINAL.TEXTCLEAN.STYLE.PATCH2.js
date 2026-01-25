/* metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH2.js
   ULYDIA — Text cleanup + typography tweaks + small formatting helpers (SAFE)

   ✅ Removes &nbsp; / &#160; / NBSP artifacts in injected HTML
   ✅ LEFT column typography: normal text in a *more visible* gray, bold in near-black
   ✅ For specific RIGHT blocks (Certifications / Schools / Portfolio): turn ", " into line breaks
   ✅ Optional fallback: if LEFT salaire bloc is empty but salary ranges exist, render a short salary summary

   Targets:
   - LEFT containers: #js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire
   - RIGHT list-text containers: #js-bf-certifications, #js-bf-schools_or_paths, #js-bf-portfolio_projects
*/
(() => {
  if (window.__ULYDIA_TEXTCLEAN_STYLE_PATCH2__) return;
  window.__ULYDIA_TEXTCLEAN_STYLE_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[textclean.style.patch2]", ...a);

  const LEFT_IDS = ["js-bf-formation","js-bf-acces","js-bf-marche","js-bf-salaire"];
  const COMMA_BREAK_IDS = ["js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"];

  function ensureStyle(){
    if (document.getElementById("ulydia-left-typography-patch2")) return;

    // More visible gray for non-bold (user request)
    const css = `
/* LEFT column: clearer gray text; bold in near-black */
#js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire{
  color: #9CA3AF; /* gray-400 (very visible vs black) */
}
#js-bf-formation strong, #js-bf-acces strong, #js-bf-marche strong, #js-bf-salaire strong,
#js-bf-formation b, #js-bf-acces b, #js-bf-marche b, #js-bf-salaire b{
  color: #111827; /* near-black */
}
/* Comfortable rhythm */
#js-bf-formation p, #js-bf-acces p, #js-bf-marche p, #js-bf-salaire p{ margin: 0.35rem 0; }
#js-bf-formation ul, #js-bf-acces ul, #js-bf-marche ul, #js-bf-salaire ul{ margin: 0.35rem 0 0.35rem 1.1rem; }
#js-bf-formation li, #js-bf-acces li, #js-bf-marche li, #js-bf-salaire li{ margin: 0.2rem 0; }

/* Ensure line breaks look good inside the three RIGHT blocks */
#js-bf-certifications, #js-bf-schools_or_paths, #js-bf-portfolio_projects{
  white-space: normal;
}
    `.trim();

    const st = document.createElement("style");
    st.id = "ulydia-left-typography-patch2";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function cleanHTML(html){
    if (!html) return html;
    return String(html)
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\s{2,}/g, " ");
  }

  function sanitizeEl(el){
    if (!el) return false;
    const before = el.innerHTML;
    const after = cleanHTML(before);
    if (after !== before) el.innerHTML = after;

    // Also clean text nodes
    try {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let node, changed = false;
      while ((node = walker.nextNode())) {
        const t0 = node.nodeValue || "";
        const t1 = cleanHTML(t0);
        if (t1 !== t0) { node.nodeValue = t1; changed = true; }
      }
      return (after !== before) || changed;
    } catch(e){
      return (after !== before);
    }
  }

  function commaToBreaks(el){
    if (!el) return false;
    // Only do it if there isn't already a list or multiple chips (avoid breaking complex markup)
    const hasList = !!el.querySelector("ul,ol,li");
    if (hasList) return false;

    const before = el.innerHTML || "";
    // Replace comma+spaces only when it's plain text-ish
    const after = before.replace(/,\s+/g, ",<br>");
    if (after !== before) {
      el.innerHTML = after;
      return true;
    }
    return false;
  }

  function formatMoney(n, currency){
    const x = Number(n);
    if (!Number.isFinite(x) || x <= 0) return "";
    // keep it simple, no thousand separators (can be added later)
    return `${Math.round(x)} ${currency || ""}`.trim();
  }

  function salaryFallback(){
    const el = document.getElementById("js-bf-salaire");
    if (!el) return false;

    const isEmpty = !String(el.textContent || "").replace(/\s+/g," ").trim();
    if (!isEmpty) return false;

    const b = window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || {};
    const currency = b.currency || window.__ULYDIA_METIER_PAGE_CTX__?.currency || "";

    const jMin = b.salary_junior_min, jMax = b.salary_junior_max;
    const mMin = b.salary_mid_min,    mMax = b.salary_mid_max;
    const sMin = b.salary_senior_min, sMax = b.salary_senior_max;

    const hasAny = [jMin,jMax,mMin,mMax,sMin,sMax].some(v => Number(v) > 0);
    if (!hasAny) return false;

    const parts = [];
    if (Number(jMin)>0 || Number(jMax)>0) parts.push(`<li><strong>Junior</strong> : ${formatMoney(jMin,currency)} – ${formatMoney(jMax,currency)}</li>`);
    if (Number(mMin)>0 || Number(mMax)>0) parts.push(`<li><strong>Confirmé</strong> : ${formatMoney(mMin,currency)} – ${formatMoney(mMax,currency)}</li>`);
    if (Number(sMin)>0 || Number(sMax)>0) parts.push(`<li><strong>Senior</strong> : ${formatMoney(sMin,currency)} – ${formatMoney(sMax,currency)}</li>`);

    const notes = (b.salary_notes || "").toString().trim();
    const noteHtml = notes ? `<p>${cleanHTML(notes)}</p>` : "";

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

    // Clean NBSP artifacts in LEFT
    LEFT_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (sanitizeEl(el)) changed++;
    });

    // Clean NBSP + comma breaks in the 3 RIGHT blocks
    COMMA_BREAK_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (sanitizeEl(el)) changed++;
      if (commaToBreaks(el)) changed++;
    });

    // Fill salaire bloc if empty but salary ranges exist
    if (salaryFallback()) changed++;

    log("run", { changed });
  }

  function onReady(){
    run();

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 30);
        setTimeout(run, 180);
      });
      return;
    }

    // fallback: try a few times
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 25) clearInterval(t);
    }, 200);
  }

  onReady();
})();
