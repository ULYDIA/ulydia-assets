// =========================================================
// ULYDIA — FINSWEET FILTERS (Country -> Lang -> Sector -> Metier)
// v1.1 — fixes:
// 1) Ensure #fs-triggers is a Finsweet "filters" container
// 2) Generate sector triggers BEFORE cmsfilter initializes (critical)
// 3) More robust selectors + rebuild metier list after filters apply
// =========================================================
(() => {
  if (window.__ULYDIA_FS_FILTERS__) return;
  window.__ULYDIA_FS_FILTERS__ = true;

  const CFG = {
    selCountry: "#uf-country",
    selSector:  "#uf-sector",
    selMetier:  "#uf-metier",
    triggers:   "#fs-triggers",
    results:    "#metier-results",

    // Sources in DOM
    countryIsoSel:  ".js-country-iso, .is-country-iso",
    countryNameSel: ".js-country-name",
    countryLangSel: ".js-country-lang",

    sectorSlugSel: ".js-sector-slug",
    sectorNameSel: ".js-sector-name",

    metierSlugSel: ".js-metier-slug",
    metierNameSel: ".js-metier-name",

    // Redirect
    metierBasePath: "/metier"
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  function setDisabled(el, v) {
    if (!el) return;
    el.disabled = !!v;
    el.style.opacity = v ? "0.65" : "";
    el.style.pointerEvents = v ? "none" : "";
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (el.hasAttribute("hidden")) return false;
    if (el.offsetParent === null && cs.position !== "fixed") return false;
    return true;
  }

  function readSectorsFromDOM() {
    const out = [];
    $$(CFG.sectorSlugSel).forEach(slugEl => {
      const item = slugEl.closest(".w-dyn-item") || slugEl.parentElement;
      const slug = norm(slugEl.textContent);
      if (!slug) return;
      const name = norm($(CFG.sectorNameSel, item)?.textContent || slug);
      out.push({ slug, name });
    });
    const map = new Map();
    out.forEach(s => { if (!map.has(s.slug)) map.set(s.slug, s); });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }

  function readCountriesFromDOM() {
    const out = [];
    $$(CFG.countryIsoSel).forEach(isoEl => {
      const item = isoEl.closest(".w-dyn-item") || isoEl.parentElement;
      const iso  = norm(isoEl.textContent).toUpperCase();
      if (!iso) return;
      const name = norm($(CFG.countryNameSel, item)?.textContent || iso);
      const lang = norm($(CFG.countryLangSel, item)?.textContent || "").toLowerCase();
      out.push({ iso, name, lang });
    });
    const map = new Map();
    out.forEach(c => { if (!map.has(c.iso)) map.set(c.iso, c); });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }

  function ensureTriggersContainerIsFilters() {
    const root = $(CFG.triggers);
    if (!root) return;
    root.setAttribute("fs-cmsfilter-element", "filters");
  }

  function ensureSectorTriggersExist(sectors) {
    const root = $(CFG.triggers);
    if (!root) return;

    const existing = new Set(
      $$(`a[fs-cmsfilter-field="sector"]`, root).map(a => a.getAttribute("fs-cmsfilter-value") || "")
    );

    sectors.forEach(sec => {
      if (!sec.slug) return;
      if (existing.has(sec.slug)) return;

      const a = document.createElement("a");
      a.setAttribute("fs-cmsfilter-field", "sector");
      a.setAttribute("fs-cmsfilter-value", sec.slug);
      a.textContent = sec.slug;
      root.appendChild(a);
      existing.add(sec.slug);
    });
  }

  // IMPORTANT: run early, BEFORE cmsfilter initializes
  function earlyPrepare() {
    ensureTriggersContainerIsFilters();
    const sectors = readSectorsFromDOM();
    ensureSectorTriggersExist(sectors);
  }

  function clickTrigger(field, value) {
    const root = $(CFG.triggers);
    if (!root) return false;

    const v = value == null ? "" : String(value);
    const anchors = $$(`a[fs-cmsfilter-field="${CSS.escape(field)}"]`, root);
    const a = anchors.find(x => (x.getAttribute("fs-cmsfilter-value") || "") === v);
    if (!a) return false;

    a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }

  function fillSelect(sel, placeholder, items, getVal, getLab) {
    if (!sel) return;
    const current = sel.value;

    sel.innerHTML = "";
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholder;
    sel.appendChild(ph);

    items.forEach(it => {
      const opt = document.createElement("option");
      opt.value = getVal(it);
      opt.textContent = getLab(it);
      sel.appendChild(opt);
    });

    if (current && sel.querySelector(`option[value="${CSS.escape(current)}"]`)) {
      sel.value = current;
    }
  }

  function readVisibleMetiers() {
    const root = $(CFG.results);
    if (!root) return [];
    const out = [];
    $$(`[fs-cmsfilter-element="item"]`, root).forEach(item => {
      if (!isVisible(item)) return;
      const slug = norm($(CFG.metierSlugSel, item)?.textContent || "");
      const name = norm($(CFG.metierNameSel, item)?.textContent || slug);
      if (!slug) return;
      out.push({ slug, name });
    });
    const map = new Map();
    out.forEach(m => { if (!map.has(m.slug)) map.set(m.slug, m); });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }

  async function rebuildMetierSelect() {
    const selMetier = $(CFG.selMetier);
    if (!selMetier) return;
    await sleep(180);
    const metiers = readVisibleMetiers();
    fillSelect(selMetier, "Métier", metiers, m => m.slug, m => m.name);
    setDisabled(selMetier, metiers.length === 0);
  }

  function redirectToMetier(slug, iso) {
    const dest = new URL(CFG.metierBasePath, window.location.origin);
    dest.searchParams.set("metier", slug);
    if (iso) dest.searchParams.set("country", String(iso).toUpperCase());
    window.location.href = dest.toString();
  }

  function parseQuery() {
    const u = new URL(window.location.href);
    return {
      country: (u.searchParams.get("country") || "").toUpperCase(),
      sector:  norm(u.searchParams.get("sector") || ""),
      metier:  norm(u.searchParams.get("metier") || "")
    };
  }

  async function boot() {
    const selCountry = $(CFG.selCountry);
    const selSector  = $(CFG.selSector);
    const selMetier  = $(CFG.selMetier);
    const triggers   = $(CFG.triggers);
    const results    = $(CFG.results);

    if (!selCountry || !selSector || !selMetier || !triggers || !results) return;

    setDisabled(selCountry, true);
    setDisabled(selSector,  true);
    setDisabled(selMetier,  true);

    const countries = readCountriesFromDOM();
    const sectors   = readSectorsFromDOM();

    fillSelect(selCountry, "Pays", countries, c => c.iso, c => c.name);
    fillSelect(selSector,  "Secteur d’activité", sectors, s => s.slug, s => s.name);

    setDisabled(selCountry, false);
    setDisabled(selSector,  false);

    const mo = new MutationObserver(() => { rebuildMetierSelect(); });
    mo.observe(results, { childList: true, subtree: true, attributes: true });

    const q = parseQuery();
    if (q.country) {
      selCountry.value = q.country;
      const c = countries.find(x => x.iso === q.country);
      if (c?.lang) clickTrigger("lang", c.lang);
      selSector.value = "";
      clickTrigger("sector", "");
    }
    if (q.sector) {
      selSector.value = q.sector;
      clickTrigger("sector", q.sector);
    }

    await rebuildMetierSelect();

    selCountry.addEventListener("change", async () => {
      const iso = (selCountry.value || "").toUpperCase();
      const c = countries.find(x => x.iso === iso);
      if (c?.lang) clickTrigger("lang", c.lang);

      selSector.value = "";
      clickTrigger("sector", "");

      await rebuildMetierSelect();
    });

    selSector.addEventListener("change", async () => {
      clickTrigger("sector", selSector.value || "");
      await rebuildMetierSelect();
    });

    selMetier.addEventListener("change", () => {
      const slug = selMetier.value || "";
      if (!slug) return;
      const iso = (selCountry.value || "").toUpperCase();
      redirectToMetier(slug, iso);
    });
  }

  // Early prepare ASAP
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", earlyPrepare);
  } else {
    earlyPrepare();
  }

  // After cmsfilter ready
  window.fsAttributes = window.fsAttributes || [];
  window.fsAttributes.push(["cmsfilter", () => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }]);
})();