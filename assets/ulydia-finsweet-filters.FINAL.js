// =========================================================
// ULYDIA — FINSWEET FILTERS (Country -> Lang -> Sector -> Metier)
// FINAL DOWNLOADABLE VERSION
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
    countryIsoSel:  ".js-country-iso, .is-country-iso",
    countryNameSel: ".js-country-name",
    countryLangSel: ".js-country-lang",
    sectorSlugSel: ".js-sector-slug",
    sectorNameSel: ".js-sector-name",
    metierSlugSel: ".js-metier-slug",
    metierNameSel: ".js-metier-name",
    metierBasePath: "/metier"
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (s) => String(s || "").replace(/\\s+/g, " ").trim();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  function clickTrigger(field, value) {
    const root = $(CFG.triggers);
    if (!root) return;
    const v = value == null ? "" : String(value);
    const a = $$(`a[fs-cmsfilter-field="${field}"]`, root)
      .find(x => (x.getAttribute("fs-cmsfilter-value") || "") === v);
    if (a) a.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  function ensureSectorTriggers(sectors) {
    const root = $(CFG.triggers);
    if (!root) return;
    const existing = new Set(
      $$(`a[fs-cmsfilter-field="sector"]`, root).map(a => a.getAttribute("fs-cmsfilter-value") || "")
    );
    sectors.forEach(sec => {
      if (!sec.slug || existing.has(sec.slug)) return;
      const a = document.createElement("a");
      a.setAttribute("fs-cmsfilter-field", "sector");
      a.setAttribute("fs-cmsfilter-value", sec.slug);
      root.appendChild(a);
      existing.add(sec.slug);
    });
  }

  function readCountries() {
    const out = [];
    $$(CFG.countryIsoSel).forEach(el => {
      const item = el.closest(".w-dyn-item") || el.parentElement;
      const iso = norm(el.textContent).toUpperCase();
      if (!iso) return;
      const name = norm($(CFG.countryNameSel, item)?.textContent || iso);
      const lang = norm($(CFG.countryLangSel, item)?.textContent || "").toLowerCase();
      out.push({ iso, name, lang });
    });
    return out;
  }

  function readSectors() {
    const out = [];
    $$(CFG.sectorSlugSel).forEach(el => {
      const item = el.closest(".w-dyn-item") || el.parentElement;
      const slug = norm(el.textContent);
      if (!slug) return;
      const name = norm($(CFG.sectorNameSel, item)?.textContent || slug);
      out.push({ slug, name });
    });
    return out;
  }

  function readVisibleMetiers() {
    const root = $(CFG.results);
    if (!root) return [];
    const out = [];
    $$('[fs-cmsfilter-element="item"]', root).forEach(item => {
      if (item.offsetParent === null) return;
      const slug = norm($(CFG.metierSlugSel, item)?.textContent || "");
      const name = norm($(CFG.metierNameSel, item)?.textContent || slug);
      if (slug) out.push({ slug, name });
    });
    return out;
  }

  function fillSelect(sel, placeholder, items, getVal, getLab) {
    sel.innerHTML = "";
    const o = document.createElement("option");
    o.value = "";
    o.textContent = placeholder;
    sel.appendChild(o);
    items.forEach(it => {
      const opt = document.createElement("option");
      opt.value = getVal(it);
      opt.textContent = getLab(it);
      sel.appendChild(opt);
    });
  }

  async function boot() {
    const selCountry = $(CFG.selCountry);
    const selSector  = $(CFG.selSector);
    const selMetier  = $(CFG.selMetier);
    if (!selCountry || !selSector || !selMetier) return;

    const countries = readCountries();
    const sectors   = readSectors();
    ensureSectorTriggers(sectors);

    fillSelect(selCountry, "Pays", countries, c => c.iso, c => c.name);
    fillSelect(selSector, "Secteur d’activité", sectors, s => s.slug, s => s.name);

    const rebuildMetiers = async () => {
      await sleep(120);
      const mets = readVisibleMetiers();
      fillSelect(selMetier, "Métier", mets, m => m.slug, m => m.name);
    };

    selCountry.addEventListener("change", async () => {
      const iso = selCountry.value.toUpperCase();
      const c = countries.find(x => x.iso === iso);
      if (c && c.lang) clickTrigger("lang", c.lang);
      selSector.value = "";
      clickTrigger("sector", "");
      await rebuildMetiers();
    });

    selSector.addEventListener("change", async () => {
      clickTrigger("sector", selSector.value || "");
      await rebuildMetiers();
    });

    selMetier.addEventListener("change", () => {
      const slug = selMetier.value;
      if (!slug) return;
      const iso = selCountry.value || "";
      const u = new URL(CFG.metierBasePath, window.location.origin);
      u.searchParams.set("metier", slug);
      if (iso) u.searchParams.set("country", iso);
      window.location.href = u.toString();
    });

    rebuildMetiers();
  }

  window.fsAttributes = window.fsAttributes || [];
  window.fsAttributes.push(["cmsfilter", boot]);
})();