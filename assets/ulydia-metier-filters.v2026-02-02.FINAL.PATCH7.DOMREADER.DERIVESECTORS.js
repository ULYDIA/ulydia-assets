/*!
 * ULYDIA — Filters (Pays / Secteur / Métier) — DERIVE SECTORS FROM METIERS + DOM EXPORT
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH7.DOMREADER.DERIVESECTORS.js
 *
 * Why PATCH7:
 *  - Your __ULYDIA_CATALOG__ only has countries.
 *  - You DO have sector labels on each metier item (js-fiche-secteur-fr/en/de/es/it).
 *  - So we can:
 *      1) Read metiers from hidden Webflow Collection List DOM (no Webflow API)
 *      2) Build Sector options from metier sector labels (per final language)
 *      3) Filter Metier autocomplete by (country.final_lang) + sector
 *
 * Important business rule implemented:
 *  - If a country is EN-final, we show EN metiers + EN sectors (from metier fields)
 *  - Sponsorship still per country because navigation always includes &country=XX
 *
 * Expected DOM (flexible):
 *  - Each metier item is a Webflow CMS item (.w-dyn-item) containing these classed fields:
 *      .js-fiche-global-id   (optional)
 *      .js-fiche-slug        (recommended) OR a link containing ?metier=slug OR /metier/slug
 *      .js-fiche-title-fr / -en / -de / -es / -it   (optional but recommended)
 *      .js-fiche-secteur-fr / -en / -de / -es / -it (sector labels)
 *      .js-fiche-accroche    (optional)
 *
 * If you don't have js-fiche-slug yet:
 *  - Add a hidden text field in the Metiers list item that outputs the slug and give it class "js-fiche-slug".
 *
 * UI:
 *  - Inputs + datalists (no <select>) to avoid your global select-bug.
 */
(() => {
  if (window.__ULYDIA_METIER_FILTERS_PATCH7__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH7__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[ULYDIA:filters]", ...a);

  const norm  = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();

  const escHtml = (s) =>
    String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const escAttr = (s) => String(s || "").replace(/"/g, "&quot;");

  const LANGS = ["fr","en","de","es","it"];

  function slugify(s) {
    return lower(norm(s))
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }

  // ---------------------------
  // Countries (from catalog)
  // ---------------------------
  function getCountries() {
    const cat = window.__ULYDIA_CATALOG__;
    if (cat && Array.isArray(cat.countries) && cat.countries.length) return cat.countries;
    // fallback
    const arr = window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || window.__ULYDIA_COUNTRY_LIST__;
    return Array.isArray(arr) ? arr : [];
  }
  function countryIso(c) { return upper(c?.iso || c?.code || c?.alpha2 || c?.country_iso || c?.country || c?.value); }
  function countryFinalLang(c) { return lower(c?.langue_finale || c?.final_lang || c?.default_lang || c?.lang || c?.language); }
  function countryLabelByLang(c, lang) {
    const v = c?.[`label_${lang}`] || c?.[`name_${lang}`] || c?.[`title_${lang}`] || c?.label || c?.name || c?.title || countryIso(c);
    return norm(v);
  }

  // ---------------------------
  // DOM Reader — Metiers
  // ---------------------------
  function getText(root, sel) {
    const el = root.querySelector(sel);
    return el ? norm(el.textContent || "") : "";
  }
  function findNearestItem(el) {
    if (!el) return null;
    return el.closest(".w-dyn-item") || el.closest("[data-ulydia-metier-item]") || el.parentElement;
  }

  function extractSlugFromItem(item) {
    // 1) explicit slug field
    let slug = getText(item, ".js-fiche-slug");
    if (slug) return slug;

    // 2) look for link containing ?metier=...
    const a = item.querySelector('a[href*="metier="], a[href*="/metier"], a[href*="/metiers"]');
    if (a && a.getAttribute("href")) {
      const href = a.getAttribute("href");
      try {
        // query param
        const u = new URL(href, window.location.origin);
        const m = u.searchParams.get("metier");
        if (m) return norm(m);
      } catch(e) {}
      // path /metier/slug
      const m2 = href.match(/\/metier\/([^/?#]+)/i);
      if (m2 && m2[1]) return norm(m2[1]);
    }

    // 3) as fallback, use global id (not ideal)
    const gid = getText(item, ".js-fiche-global-id");
    if (gid && /^[a-z0-9\-]+$/i.test(gid)) return gid;

    return "";
  }

  function readMetiersFromDOM() {
    // Find any elements that indicate metier items exist
    const markers = Array.from(document.querySelectorAll(".js-fiche-global-id, .js-fiche-secteur-fr, .js-fiche-secteur-en, .js-fiche-secteur-de, .js-fiche-secteur-es, .js-fiche-secteur-it"));
    const itemsSet = new Set();
    markers.forEach(m => {
      const it = findNearestItem(m);
      if (it) itemsSet.add(it);
    });

    // If no markers, try w-dyn-items under a known wrapper
    if (!itemsSet.size) {
      document.querySelectorAll(".w-dyn-item").forEach(it => itemsSet.add(it));
    }

    const items = Array.from(itemsSet);
    const metiers = [];

    items.forEach(item => {
      const slug = extractSlugFromItem(item);
      if (!slug) return;

      const titles = {};
      const sectors = {};
      LANGS.forEach(l => {
        titles[l]  = getText(item, `.js-fiche-title-${l}`) || getText(item, `.js-fiche-nom-${l}`) || "";
        sectors[l] = getText(item, `.js-fiche-secteur-${l}`) || getText(item, `.js-fiche-sector-${l}`) || "";
      });

      // If no per-lang title, try generic title
      const titleAny = getText(item, ".js-fiche-title") || getText(item, ".js-fiche-nom") || "";
      if (titleAny) {
        LANGS.forEach(l => { if (!titles[l]) titles[l] = titleAny; });
      }

      const accroche = getText(item, ".js-fiche-accroche") || "";

      metiers.push({
        slug,
        titles,
        sectors,
        accroche
      });
    });

    // Deduplicate by slug
    const seen = new Set();
    const out = [];
    metiers.forEach(m => {
      if (seen.has(m.slug)) return;
      seen.add(m.slug);
      out.push(m);
    });

    return out;
  }

  // Cache metiers globally (so you can inspect)
  function ensureMetiersCache() {
    if (Array.isArray(window.__ULYDIA_FICHE_METIERS__) && window.__ULYDIA_FICHE_METIERS__.length) {
      return window.__ULYDIA_FICHE_METIERS__;
    }
    const m = readMetiersFromDOM();
    window.__ULYDIA_FICHE_METIERS__ = m;
    return m;
  }

  // ---------------------------
  // QS / navigation
  // ---------------------------
  function getQS() {
    const p = new URLSearchParams(window.location.search);
    return { country: upper(p.get("country") || ""), sector: norm(p.get("sector") || ""), metier: norm(p.get("metier") || "") };
  }
  function navigateTo(country, metier, sector) {
    const p = new URLSearchParams(window.location.search);
    if (country) p.set("country", country); else p.delete("country");
    if (metier)  p.set("metier", metier);   else p.delete("metier");
    if (sector)  p.set("sector", sector);   else p.delete("sector");
    window.location.href = `${window.location.pathname}?${p.toString()}`;
  }

  // ---------------------------
  // UI labels (based on selected country's final lang)
  // ---------------------------
  const UI = {
    fr: { country: "Pays", sector: "Secteur d’activité", metier: "Métier", typeCountry: "Rechercher un pays…", typeSector: "Rechercher un secteur…", typeJob: "Rechercher un métier…", go: "Voir la fiche" },
    en: { country: "Country", sector: "Industry sector", metier: "Job", typeCountry: "Search a country…", typeSector: "Search a sector…", typeJob: "Search a job…", go: "Open" },
    de: { country: "Land", sector: "Branche", metier: "Beruf", typeCountry: "Land suchen…", typeSector: "Branche suchen…", typeJob: "Beruf suchen…", go: "Öffnen" },
    es: { country: "País", sector: "Sector", metier: "Profesión", typeCountry: "Buscar país…", typeSector: "Buscar sector…", typeJob: "Buscar profesión…", go: "Abrir" },
    it: { country: "Paese", sector: "Settore", metier: "Mestiere", typeCountry: "Cerca un paese…", typeSector: "Cerca un settore…", typeJob: "Cerca un mestiere…", go: "Apri" },
  };

  // ---------------------------
  // Styles — in-line with fiche
  // ---------------------------
  function injectStyles(){
    if (document.getElementById("ulydia-metier-filters-style")) return;
    const st = document.createElement("style");
    st.id = "ulydia-metier-filters-style";
    st.textContent = `
      #ulydia-metier-filters{ width:100%; }
      .ulydia-filterbar{
        display:flex; flex-wrap:wrap; gap:14px;
        padding:16px 16px;
        margin: 18px 0 18px;
        border-radius:20px;
        background: rgba(107,78,255,.06);
        box-shadow: 0 14px 30px rgba(16,24,40,.08);
        align-items:flex-end;
        position:relative;
        z-index: 9999;
        overflow: visible;
      }
      .ulydia-filter{ min-width:220px; flex: 1 1 220px; }
      .ulydia-filter-actions{ min-width:160px; flex: 0 0 auto; }
      .ulydia-filter-label{
        display:block; font-size:12px; font-weight:600;
        margin:0 0 8px; color: rgba(17,24,39,.85);
      }
      .ulydia-filter-input{
        width:100%; height:44px; border-radius:14px;
        border: 1px solid rgba(17,24,39,.12);
        padding: 0 12px; outline:none; background: #fff;
        font-family: inherit; font-size: 15px;
      }
      .ulydia-filter-input:focus{
        border-color: rgba(107,78,255,.55);
        box-shadow: 0 0 0 4px rgba(107,78,255,.14);
      }
      .ulydia-filter-input:disabled{ opacity:.55; cursor:not-allowed; }
      .ulydia-filter-btn{
        height:44px; border-radius:14px; border:none;
        padding: 0 18px; cursor:pointer;
        background: var(--ulydia-primary, #6b4eff);
        color:#fff; font-weight:700; font-family: inherit;
        font-size: 15px; box-shadow: 0 10px 18px rgba(107,78,255,.25);
      }
      .ulydia-filter-btn:disabled{ opacity:.55; cursor:not-allowed; box-shadow:none; }
      .ulydia-filter-hint{ font-size:11px; margin-top:8px; opacity:.75; color: rgba(17,24,39,.75); }
      @media (max-width: 640px){
        .ulydia-filter-actions{ width:100%; }
        .ulydia-filter-btn{ width:100%; }
      }
    `;
    document.head.appendChild(st);
  }

  // ---------------------------
  // Mount
  // ---------------------------
  function ensureMountBeforeRoot(rootEl){
    let el = document.getElementById("ulydia-metier-filters");
    if (el) return el;
    el = document.createElement("section");
    el.id = "ulydia-metier-filters";
    (rootEl.parentNode || document.body).insertBefore(el, rootEl);
    return el;
  }

  // ---------------------------
  // Resolve label -> value
  // ---------------------------
  function resolveByLabel(label, options){
    const v = norm(label).toLowerCase();
    if (!v) return "";
    const exact = options.find(o => norm(o.label).toLowerCase() === v);
    if (exact) return exact.value;
    const byValue = options.find(o => norm(o.value).toLowerCase() === v);
    if (byValue) return byValue.value;
    return "";
  }

  // ---------------------------
  // Render
  // ---------------------------
  function render(mount, state){
    const countries = getCountries();
    const metiers = ensureMetiersCache();

    // Country options
    const countryOptions = (countries||[])
      .map(c => {
        const iso = countryIso(c);
        const lang = countryFinalLang(c) || "fr";
        return { value: iso, label: countryLabelByLang(c, lang) || iso, lang };
      })
      .filter(x => x.value)
      .sort((a,b) => a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    // determine finalLang from selected country
    const cObj = state.country ? countries.find(c => countryIso(c) === state.country) : null;
    const finalLang = cObj ? (countryFinalLang(cObj) || "fr") : "fr";
    const ui = UI[finalLang] || UI.fr;

    // Build sector options from metiers (using js-fiche-secteur-<lang>)
    const sectorMap = new Map(); // key -> label
    (metiers||[]).forEach(m => {
      const label = norm(m?.sectors?.[finalLang] || "");
      if (!label) return;
      const key = slugify(label);
      if (key) sectorMap.set(key, label);
    });

    const sectorOptions = Array.from(sectorMap.entries())
      .map(([value,label]) => ({ value, label }))
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    // Filter metiers by sectorKey (if chosen)
    const jobOptions = (metiers||[])
      .filter(m => {
        const label = norm(m?.sectors?.[finalLang] || "");
        if (!state.sector) return !!label;
        const key = slugify(label);
        return key && key === state.sector;
      })
      .map(m => ({
        value: m.slug,
        label: norm(m?.titles?.[finalLang] || m.slug)
      }))
      .filter(o => o.value && o.label)
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    // Prefill labels
    const countryLabel = state.country ? (countryOptions.find(o => o.value === state.country)?.label || state.country) : (state.country_label || "");
    const sectorLabel  = state.sector  ? (sectorOptions.find(o => o.value === state.sector)?.label || state.sector) : (state.sector_label || "");
    const jobLabel     = state.metier  ? (jobOptions.find(o => o.value === state.metier)?.label || state.metier) : (state.metier_label || "");

    const hint = [];
    if (!metiers.length) hint.push("⚠️ aucun métier exporté (liste CMS cachée manquante ou champs non trouvés)");
    if (!sectorOptions.length) hint.push("⚠️ aucun secteur détecté (champs js-fiche-secteur-xx)");
    const hintHtml = hint.length ? `<div class="ulydia-filter-hint">${escHtml(hint.join(" — "))}</div>` : "";

    const canGo = !!(state.country && state.metier);

    mount.innerHTML = `
      <div class="ulydia-filterbar" id="ulydia-filterbar">
        <div class="ulydia-filter">
          <label class="ulydia-filter-label" for="ulydia-filter-country-input">${escHtml(ui.country)}</label>
          <input id="ulydia-filter-country-input" class="ulydia-filter-input"
                 list="ulydia-country-datalist"
                 placeholder="${escAttr(ui.typeCountry)}"
                 value="${escAttr(countryLabel)}" />
          <datalist id="ulydia-country-datalist">
            ${countryOptions.slice(0, 400).map(o=>`<option value="${escAttr(o.label)}" data-iso="${escAttr(o.value)}"></option>`).join("")}
          </datalist>
          ${state.country ? `<div class="ulydia-filter-hint">ISO: ${escHtml(state.country)} — langue: ${escHtml(finalLang)}</div>` : ``}
        </div>

        <div class="ulydia-filter">
          <label class="ulydia-filter-label" for="ulydia-filter-sector-input">${escHtml(ui.sector)}</label>
          <input id="ulydia-filter-sector-input" class="ulydia-filter-input"
                 ${(!sectorOptions.length) ? "disabled":""}
                 list="ulydia-sector-datalist"
                 placeholder="${escAttr(ui.typeSector)}"
                 value="${escAttr(sectorLabel)}" />
          <datalist id="ulydia-sector-datalist">
            ${sectorOptions.slice(0, 400).map(o=>`<option value="${escAttr(o.label)}" data-key="${escAttr(o.value)}"></option>`).join("")}
          </datalist>
        </div>

        <div class="ulydia-filter">
          <label class="ulydia-filter-label" for="ulydia-filter-metier-input">${escHtml(ui.metier)}</label>
          <input id="ulydia-filter-metier-input" class="ulydia-filter-input"
                 ${(!state.country || !jobOptions.length) ? "disabled":""}
                 list="ulydia-job-datalist"
                 placeholder="${escAttr(ui.typeJob)}"
                 value="${escAttr(jobLabel)}" />
          <datalist id="ulydia-job-datalist">
            ${jobOptions.slice(0, 400).map(o=>`<option value="${escAttr(o.label)}" data-slug="${escAttr(o.value)}"></option>`).join("")}
          </datalist>
          ${hintHtml}
        </div>

        <div class="ulydia-filter ulydia-filter-actions">
          <button id="ulydia-filter-go" class="ulydia-filter-btn" ${canGo ? "" : "disabled"}>${escHtml(ui.go)}</button>
        </div>
      </div>
    `;

    wire(mount, state, { countryOptions, sectorOptions, jobOptions });
    log("built", { metiers: metiers.length, sectorOptions: sectorOptions.length, jobOptions: jobOptions.length, finalLang });
  }

  function wire(mount, state, lists){
    const elCountry = mount.querySelector("#ulydia-filter-country-input");
    const elSector  = mount.querySelector("#ulydia-filter-sector-input");
    const elJob     = mount.querySelector("#ulydia-filter-metier-input");
    const elGo      = mount.querySelector("#ulydia-filter-go");
    if (!elCountry || !elSector || !elJob || !elGo) return;

    const syncGo = () => { elGo.disabled = !(state.country && state.metier); };

    const onCountry = () => {
      state.country_label = elCountry.value || "";
      const iso = resolveByLabel(state.country_label, lists.countryOptions || []);
      if (iso && iso !== state.country) {
        state.country = iso;
        state.sector = "";
        state.metier = "";
        state.sector_label = "";
        state.metier_label = "";
        render(mount, state);
      } else {
        const maybeIso = upper(state.country_label);
        if ((lists.countryOptions||[]).some(o => o.value === maybeIso) && maybeIso !== state.country) {
          state.country = maybeIso;
          state.sector = "";
          state.metier = "";
          state.sector_label = "";
          state.metier_label = "";
          render(mount, state);
        }
      }
      syncGo();
    };

    const onSector = () => {
      state.sector_label = elSector.value || "";
      const key = resolveByLabel(state.sector_label, lists.sectorOptions || []);
      state.sector = key || "";
      state.metier = "";
      state.metier_label = "";
      render(mount, state);
      syncGo();
    };

    const onJob = () => {
      state.metier_label = elJob.value || "";
      const slug = resolveByLabel(state.metier_label, lists.jobOptions || []);
      state.metier = slug || "";
      syncGo();
    };

    elCountry.addEventListener("input", onCountry);
    elCountry.addEventListener("change", onCountry);
    elSector.addEventListener("input", onSector);
    elSector.addEventListener("change", onSector);
    elJob.addEventListener("input", onJob);
    elJob.addEventListener("change", onJob);

    elJob.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        onJob();
        if (state.country && state.metier) {
          e.preventDefault();
          navigateTo(state.country, state.metier, state.sector);
        }
      }
    });

    elGo.addEventListener("click", () => {
      onJob();
      if (!state.country || !state.metier) return;
      navigateTo(state.country, state.metier, state.sector);
    });

    syncGo();
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function bootWithRoot(rootEl){
    injectStyles();
    const mount = ensureMountBeforeRoot(rootEl);

    const qs = getQS();
    const state = {
      country: qs.country || "",
      sector:  qs.sector || "",
      metier:  qs.metier || "",
      country_label: "",
      sector_label: "",
      metier_label: ""
    };

    render(mount, state);

    // Rerender a few times because Webflow lists might hydrate after
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      // refresh cache if still empty
      if (!Array.isArray(window.__ULYDIA_FICHE_METIERS__) || !window.__ULYDIA_FICHE_METIERS__.length) {
        window.__ULYDIA_FICHE_METIERS__ = readMetiersFromDOM();
      }
      render(mount, state);
      if (tries > 10) clearInterval(timer);
    }, 700);
  }

  function waitForRoot(){
    const now = document.getElementById("ulydia-metier-root");
    if (now) return bootWithRoot(now);

    let tries = 0;
    const poll = setInterval(()=>{
      tries++;
      const r = document.getElementById("ulydia-metier-root");
      if (r){ clearInterval(poll); bootWithRoot(r); }
      if (tries > 40) clearInterval(poll);
    }, 250);

    try{
      const obs = new MutationObserver(()=>{
        const r = document.getElementById("ulydia-metier-root");
        if (r){ obs.disconnect(); clearInterval(poll); bootWithRoot(r); }
      });
      obs.observe(document.documentElement, { childList:true, subtree:true });
    }catch(e){}
  }

  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", waitForRoot);
  else waitForRoot();
})();
