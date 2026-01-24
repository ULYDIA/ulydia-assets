/* metier-page.v2026-01-24.FIX29.1.js — ULYDIA
   -------------------------------------------------
   PURPOSE
   - Consume CMS globals prepared by CMS readers:
       window.__ULYDIA_METIER_PAYS_BLOCS__
       window.__ULYDIA_FAQS__
   - Never block rendering if CMS data is missing
   - No DOM CMS querying (zero wait loops)
   - Safe fallbacks + clear debug logs

   EXPECTED GLOBALS (optional)
   - window.__METIER_PAGE_DEBUG__ (boolean)
   - window.ULYDIA_WORKER_URL
   - window.ULYDIA_PROXY_SECRET

   URL PARAMS
   - metier or slug : job slug
   - country or iso : country ISO (FR, EN, etc.)

   ROOT
   - <div id="ulydia-metier-root"></div>
*/

(() => {
  // -------------------------------------------------
  // Guard: anti double-load
  // -------------------------------------------------
  if (window.__ULYDIA_METIER_PAGE_FIX291__) return;
  window.__ULYDIA_METIER_PAGE_FIX291__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page FIX29.1]", ...a);
  const warn = (...a) => console.warn("[metier-page FIX29.1]", ...a);

  // -------------------------------------------------
  // Root
  // -------------------------------------------------
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  const norm = s => String(s || "").trim();
  const lower = s => norm(s).toLowerCase();
  const upper = s => norm(s).toUpperCase();

  function qs(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name);
  }

  function getSlug() {
    return qs("metier") || qs("slug") || "";
  }

  function getISO() {
    return upper(qs("country") || qs("iso") || "");
  }

  function clearLoading() {
    try { document.documentElement.classList.remove("ul-metier-loading"); } catch(e){}
    try { ROOT.style.opacity = "1"; } catch(e){}
  }

  // -------------------------------------------------
  // Data access (CMS globals)
  // -------------------------------------------------
  function getBlocs() {
    const arr = window.__ULYDIA_METIER_PAYS_BLOCS__;
    return Array.isArray(arr) ? arr : [];
  }

  function getFaqs() {
    const arr = window.__ULYDIA_FAQS__;
    return Array.isArray(arr) ? arr : [];
  }

  function matchBloc(bloc, slug, iso) {
    if (!bloc) return false;
    if (iso && upper(bloc.iso) !== upper(iso)) return false;
    if (!slug) return true;
    return lower(bloc.metier).includes(lower(slug));
  }

  // -------------------------------------------------
  // Rendering (minimal but safe)
  // -------------------------------------------------
  function renderHeader(slug, iso) {
    ROOT.insertAdjacentHTML("beforeend", `
      <section class="ul-metier-header">
        <h1 class="ul-metier-title">${slug || "Fiche métier"}</h1>
        ${iso ? `<div class="ul-metier-iso">${iso}</div>` : ""}
      </section>
    `);
  }

  function renderBlocs(blocs) {
    if (!blocs.length) {
      ROOT.insertAdjacentHTML("beforeend", `
        <section class="ul-metier-empty">
          <p>Aucun contenu spécifique par pays.</p>
        </section>
      `);
      return;
    }

    blocs.forEach(b => {
      const sections = (b.sections || []).map(s => `
        <div class="ul-metier-section">
          <h3>${s.label}</h3>
          <div class="ul-metier-section-body">${s.type === "html" ? s.value : `<p>${s.value}</p>`}</div>
        </div>
      `).join("");

      ROOT.insertAdjacentHTML("beforeend", `
        <section class="ul-metier-bloc">
          ${sections}
        </section>
      `);
    });
  }

  function renderFaqs(faqs) {
    if (!faqs.length) return;

    const items = faqs.map(f => `
      <details class="ul-faq-item">
        <summary>${f.question}</summary>
        <div class="ul-faq-answer">${f.answer}</div>
      </details>
    `).join("");

    ROOT.insertAdjacentHTML("beforeend", `
      <section class="ul-metier-faq">
        <h2>Questions fréquentes</h2>
        ${items}
      </section>
    `);
  }

  // -------------------------------------------------
  // Boot
  // -------------------------------------------------
  (function boot(){
    const slug = getSlug();
    const iso  = getISO();

    log("boot", { slug, iso });

    renderHeader(slug, iso);

    const blocsAll = getBlocs();
    const faqsAll  = getFaqs();

    const blocs = blocsAll.filter(b => matchBloc(b, slug, iso));
    const faqs  = faqsAll.filter(f => (!iso || upper(f.iso) === upper(iso)) &&
                                      (!slug || lower(f.metier).includes(lower(slug))));

    log("data", { blocs: blocs.length, faqs: faqs.length });

    renderBlocs(blocs);
    renderFaqs(faqs);

    clearLoading();
  })();

})();
