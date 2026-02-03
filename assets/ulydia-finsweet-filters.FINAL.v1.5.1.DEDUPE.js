// =========================================================
// ULYDIA — FINSWEET FILTERS
// FINAL v1.5.1 (Deduplicate selects + robust scoping)
// - If multiple #uf-country/#uf-sector/#uf-metier exist, keep ONLY the ones
//   inside #ulydia-metier-filters and hide the others.
// - Prevents "wrong block remains" when Menuselect is hidden but duplicate ids exist.
// =========================================================
(() => {
  if (window.__ULYDIA_FS_FILTERS_UI_V151__) return;
  window.__ULYDIA_FS_FILTERS_UI_V151__ = true;

  const CFG = {
    selCountry: "#uf-country",
    selSector:  "#uf-sector",
    selMetier:  "#uf-metier",
    triggers:   "#fs-triggers",
    results:    "#metier-results",
    filtersSection: "#ulydia-metier-filters",

    countryIsoSel:  ".js-country-iso, .is-country-iso",
    countryNameSel: ".js-country-name",
    countryLangSel: ".js-country-lang, .is-country-lang",

    sectorSlugSel: ".js-sector-slug",
    sectorNameSel: ".js-sector-name",

    metierItemSel:  '[fs-cmsfilter-element="item"], .w-dyn-item',
    metierSlugSel:  ".js-metier-slug",
    metierNameSel:  ".js-metier-name",
    metierSectorSel:".js-metier-sector",
    metierLangSel:  ".js-fiche-lang",

    metierBasePath: "/metier"
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  function injectUIStylesOnce() {
    if (document.getElementById("ulydia-filters-ui-style")) return;
    const style = document.createElement("style");
    style.id = "ulydia-filters-ui-style";
    style.textContent = `
:root{
  --uf-bg:#ffffff; --uf-border:rgba(17,24,39,.08);
  --uf-shadow:0 10px 26px rgba(17,24,39,.08);
  --uf-muted:#667085; --uf-text:#111827;
  --uf-accent:#6366f1; --uf-accent-soft:rgba(99,102,241,.16);
  --uf-radius:18px;
}
#ulydia-metier-filters{
  max-width: 1180px; margin: 18px auto 10px;
  padding: 14px 14px; background: var(--uf-bg);
  border: 1px solid var(--uf-border);
  border-radius: var(--uf-radius);
  box-shadow: var(--uf-shadow);
}
#ulydia-metier-filters .uf-grid{
  display:grid; grid-template-columns: 1fr 1fr 1.2fr auto;
  gap: 12px; align-items:end;
}
#ulydia-metier-filters .uf-field{display:flex;flex-direction:column;gap:6px;min-width:0;}
#ulydia-metier-filters .uf-label{font-size:12px;font-weight:700;color:var(--uf-muted);letter-spacing:.2px;}
#ulydia-metier-filters .uf-selectWrap{position:relative;}
#ulydia-metier-filters select{
  width:100%; height:44px; padding:0 40px 0 14px;
  border-radius: 14px; border:1px solid rgba(17,24,39,.12);
  background:#f8fafc; color: var(--uf-text);
  font-size:14px; font-weight:650; outline:none;
  appearance:none;-webkit-appearance:none;-moz-appearance:none;
}
#ulydia-metier-filters select:focus{
  background:#fff; border-color: var(--uf-accent);
  box-shadow:0 0 0 4px var(--uf-accent-soft);
}
#ulydia-metier-filters .uf-chevron{
  position:absolute;right:12px;top:50%;transform:translateY(-50%);
  width:18px;height:18px;pointer-events:none;opacity:.55;
}
#ulydia-metier-filters .uf-right{
  display:flex;align-items:center;justify-content:flex-end;
  gap:12px; padding-bottom:2px;
}
#ulydia-metier-filters .uf-count{
  font-size:13px;color:var(--uf-muted);font-weight:700;white-space:nowrap;
}
#ulydia-metier-filters .uf-reset{
  border:1px solid rgba(17,24,39,.12); background:#fff;
  color:var(--uf-text); height:36px; padding:0 12px;
  border-radius: 12px; font-weight:800; font-size:13px; cursor:pointer;
}
#ulydia-metier-filters .uf-reset:hover{background:#f9fafb;}
#ulydia-metier-filters .uf-hint{margin-top:10px;font-size:12px;color:var(--uf-muted);font-weight:600;}
@media (max-width: 900px){
  #ulydia-metier-filters .uf-grid{grid-template-columns:1fr; gap:10px;}
  #ulydia-metier-filters .uf-right{justify-content:space-between;}
}
`;
    document.head.appendChild(style);
  }

  function decorateFiltersSectionOnce() {
    const sec = $(CFG.filtersSection);
    if (!sec) return;
    injectUIStylesOnce();
    if (sec.querySelector(".uf-grid")) return;

    const grid = document.createElement("div");
    grid.className = "uf-grid";

    const fields = [
      { id: CFG.selCountry, label: "Pays" },
      { id: CFG.selSector,  label: "Secteur d’activité" },
      { id: CFG.selMetier,  label: "Métier" }
    ];

    fields.forEach(f => {
      const sel = $(f.id, sec);
      if (!sel) return;

      const field = document.createElement("div");
      field.className = "uf-field";

      const lab = document.createElement("div");
      lab.className = "uf-label";
      lab.textContent = f.label;

      const wrap = document.createElement("div");
      wrap.className = "uf-selectWrap";

      const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chevron.setAttribute("viewBox", "0 0 20 20");
      chevron.classList.add("uf-chevron");
      chevron.innerHTML = '<path fill="currentColor" d="M5.6 7.4a1 1 0 0 1 1.4 0L10 10.4l3-3a1 1 0 1 1 1.4 1.4l-3.7 3.7a1 1 0 0 1-1.4 0L5.6 8.8a1 1 0 0 1 0-1.4z"/>';

      wrap.appendChild(sel);
      wrap.appendChild(chevron);

      field.appendChild(lab);
      field.appendChild(wrap);
      grid.appendChild(field);
    });

    const right = document.createElement("div");
    right.className = "uf-right";

    const count = document.createElement("div");
    count.className = "uf-count";
    count.id = "uf-count";
    count.textContent = "—";

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "uf-reset";
    reset.id = "uf-reset";
    reset.textContent = "↺ Réinitialiser";

    right.appendChild(count);
    right.appendChild(reset);
    grid.appendChild(right);

    const hint = document.createElement("div");
    hint.className = "uf-hint";
    hint.id = "uf-hint";
    hint.textContent = "";

    // preserve selects already in sec; rebuild container
    const keep = Array.from(sec.childNodes);
    sec.innerHTML = "";
    // put grid then hint
    sec.appendChild(grid);
    sec.appendChild(hint);
    // If some nodes were outside expected, drop them (prevents weird extra bars)
    // but keep nothing else intentionally.
  }

  function setHint(text) {
    const el = document.getElementById("uf-hint");
    if (el) el.textContent = text || "";
  }
  function setCount(n) {
    const el = document.getElementById("uf-count");
    if (!el) return;
    el.textContent = (typeof n === "number") ? `${n} fiche(s) métier` : "—";
  }
  function setDisabled(el, v) {
    if (!el) return;
    el.disabled = !!v;
    el.style.opacity = v ? "0.65" : "";
    el.style.pointerEvents = v ? "none" : "";
  }

  function parseQuery() {
    const u = new URL(window.location.href);
    return { country: (u.searchParams.get("country") || "").toUpperCase() };
  }

  // Deduplicate duplicate IDs: keep only those within #ulydia-metier-filters
  function dedupeSelectIds() {
    const sec = $(CFG.filtersSection);
    if (!sec) return;

    const keepCountry = $(CFG.selCountry, sec);
    const keepSector  = $(CFG.selSector, sec);
    const keepMetier  = $(CFG.selMetier, sec);

    // If the section doesn't contain them, we can't dedupe safely.
    if (!keepCountry || !keepSector || !keepMetier) return;

    const allCountry = $$(CFG.selCountry);
    const allSector  = $$(CFG.selSector);
    const allMetier  = $$(CFG.selMetier);

    function hideOther(all, keep) {
      all.forEach(el => {
        if (el === keep) return;
        // hide nearest meaningful container (prefer a section/div)
        const box = el.closest("section, .w-embed, .div-block, .w-container, .w-row, .w-col, body") || el.parentElement;
        if (box && box !== document.body) {
          box.style.display = "none";
        } else {
          el.style.display = "none";
        }
      });
    }

    hideOther(allCountry, keepCountry);
    hideOther(allSector,  keepSector);
    hideOther(allMetier,  keepMetier);
  }

  // -------- Countries / sectors / metiers --------
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
    return Array.from(map.values()).sort((a,b) => (a.name||a.iso).localeCompare(b.name||b.iso));
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

  let METIERS_CACHE = null;
  function buildMetiersCache() {
    const root = $(CFG.results);
    if (!root) return [];
    const items = $$(CFG.metierItemSel, root);
    const out = [];
    items.forEach(item => {
      const slug   = norm($(CFG.metierSlugSel, item)?.textContent || "");
      const name   = norm($(CFG.metierNameSel, item)?.textContent || slug);
      const sector = norm($(CFG.metierSectorSel, item)?.textContent || "");
      const lang   = norm($(CFG.metierLangSel, item)?.textContent || "").toLowerCase();
      if (!slug) return;
      out.push({ slug, name, sector, lang });
    });
    const map = new Map();
    out.forEach(m => { if (!map.has(m.slug)) map.set(m.slug, m); });
    const list = Array.from(map.values());
    list.sort((a,b) => a.name.localeCompare(b.name));
    return list;
  }
  function getMetiersCache() {
    if (METIERS_CACHE) return METIERS_CACHE;
    METIERS_CACHE = buildMetiersCache();
    return METIERS_CACHE;
  }

  function ensureTriggersContainerIsFilters() {
    const root = $(CFG.triggers);
    if (!root) return;
    root.setAttribute("fs-cmsfilter-element", "filters");
  }
  function ensureSectorTriggersExist(sectors) {
    const root = $(CFG.triggers);
    if (!root) return;
    const existing = new Set($$(`a[fs-cmsfilter-field="sector"]`, root).map(a => a.getAttribute("fs-cmsfilter-value") || ""));
    sectors.forEach(sec => {
      if (!sec.slug || existing.has(sec.slug)) return;
      const a = document.createElement("a");
      a.setAttribute("fs-cmsfilter-field", "sector");
      a.setAttribute("fs-cmsfilter-value", sec.slug);
      root.appendChild(a);
      existing.add(sec.slug);
    });
  }
  function clickTrigger(field, value) {
    const root = $(CFG.triggers);
    if (!root) return false;
    const v = value == null ? "" : String(value);
    const anchors = $$(`a[fs-cmsfilter-field="${CSS.escape(field)}"]`, root);
    const a = anchors.find(x => (x.getAttribute("fs-cmsfilter-value") || "") === v);
    if (!a) return false;
    a.dispatchEvent(new MouseEvent("click", { bubbles:true, cancelable:true, view:window }));
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
    if (current && sel.querySelector(`option[value="${CSS.escape(current)}"]`)) sel.value = current;
  }

  function redirectToMetier(slug, iso) {
    const dest = new URL(CFG.metierBasePath, window.location.origin);
    dest.searchParams.set("metier", slug);
    if (iso) dest.searchParams.set("country", String(iso).toUpperCase());
    window.location.href = dest.toString();
  }

  async function rebuildMetierSelect(currentLang) {
    const sec = $(CFG.filtersSection);
    const selMetier = $(CFG.selMetier, sec || document);
    const selSector = $(CFG.selSector, sec || document);
    if (!selMetier) return;

    await sleep(60);

    const sector = norm(selSector?.value || "");
    const lang   = norm(currentLang || "").toLowerCase();

    const all = getMetiersCache();
    let filtered = all;

    if (lang) filtered = filtered.filter(m => (m.lang || "") === lang);
    if (sector) filtered = filtered.filter(m => (m.sector || "") === sector);

    fillSelect(selMetier, "Métier", filtered, m => m.slug, m => m.name);
    setDisabled(selMetier, filtered.length === 0);
    setCount(filtered.length);

    if (!all.length) setHint("Aucune source métiers trouvée dans #metier-results.");
    else if (sector && !filtered.length) setHint("Aucun métier trouvé pour ce secteur (dans la langue sélectionnée).");
    else setHint("");
  }

  function earlyPrepare() {
    ensureTriggersContainerIsFilters();
    decorateFiltersSectionOnce();
    dedupeSelectIds();
    ensureSectorTriggersExist(readSectorsFromDOM());
  }

  async function boot() {
    const sec = $(CFG.filtersSection);
    const selCountry = $(CFG.selCountry, sec || document);
    const selSector  = $(CFG.selSector,  sec || document);
    const selMetier  = $(CFG.selMetier,  sec || document);
    const triggers   = $(CFG.triggers);
    const results    = $(CFG.results);

    if (!selCountry || !selSector || !selMetier || !triggers) return;

    setDisabled(selCountry, true);
    setDisabled(selSector,  true);
    setDisabled(selMetier,  true);

    const countries = readCountriesFromDOM();
    const sectors   = readSectorsFromDOM();

    fillSelect(selCountry, "Pays", countries, c => c.iso, c => (c.name || c.iso));
    fillSelect(selSector,  "Secteur d’activité", sectors, s => s.slug, s => s.name);

    setDisabled(selCountry, false);
    setDisabled(selSector,  false);

    METIERS_CACHE = null;
    getMetiersCache();

    if (results) {
      const mo = new MutationObserver(() => { METIERS_CACHE = null; });
      mo.observe(results, { childList: true, subtree: true });
    }

    const q = parseQuery();
    let currentLang = "";

    if (q.country) {
      if (!selCountry.querySelector(`option[value="${CSS.escape(q.country)}"]`)) {
        const opt = document.createElement("option");
        opt.value = q.country;
        opt.textContent = q.country;
        selCountry.appendChild(opt);
      }
      selCountry.value = q.country;
    }

    const c0 = countries.find(x => x.iso === (selCountry.value || "").toUpperCase());
    currentLang = (c0?.lang || "").toLowerCase();

    if (currentLang) clickTrigger("lang", currentLang);
    selSector.value = "";
    clickTrigger("sector", "");

    const resetBtn = document.getElementById("uf-reset");
    if (resetBtn && !resetBtn.__ulydia_bound__) {
      resetBtn.__ulydia_bound__ = true;
      resetBtn.addEventListener("click", async () => {
        selSector.value = "";
        clickTrigger("sector", "");
        await rebuildMetierSelect(currentLang);
      });
    }

    await rebuildMetierSelect(currentLang);

    selCountry.addEventListener("change", async () => {
      const iso = (selCountry.value || "").toUpperCase();
      const c = countries.find(x => x.iso === iso);
      currentLang = (c?.lang || "").toLowerCase();

      if (currentLang) clickTrigger("lang", currentLang);
      selSector.value = "";
      clickTrigger("sector", "");
      await rebuildMetierSelect(currentLang);
    });

    selSector.addEventListener("change", async () => {
      clickTrigger("sector", selSector.value || "");
      await rebuildMetierSelect(currentLang);
    });

    selMetier.addEventListener("change", () => {
      const slug = selMetier.value || "";
      if (!slug) return;
      const iso = (selCountry.value || "").toUpperCase();
      redirectToMetier(slug, iso);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", earlyPrepare);
  } else {
    earlyPrepare();
  }

  window.fsAttributes = window.fsAttributes || [];
  window.fsAttributes.push(["cmsfilter", () => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }]);
})();