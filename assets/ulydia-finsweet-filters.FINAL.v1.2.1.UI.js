// =========================================================
// ULYDIA — FINSWEET FILTERS (Country -> Lang -> Sector -> Metier)
// FINAL v1.2.1 (UI)
// Fix: ReferenceError injectFilterStyles is not defined
// + Injects UI styles + small layout wrapper (non-destructive)
// =========================================================
(() => {
  if (window.__ULYDIA_FS_FILTERS_UI__) return;
  window.__ULYDIA_FS_FILTERS_UI__ = true;

  const CFG = {
    selCountry: "#uf-country",
    selSector:  "#uf-sector",
    selMetier:  "#uf-metier",
    triggers:   "#fs-triggers",
    results:    "#metier-results",
    filtersSection: "#ulydia-metier-filters",

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

  // ---------------- UI INJECTION ----------------
  function injectUIStylesOnce() {
    if (document.getElementById("ulydia-filters-ui-style")) return;
    const style = document.createElement("style");
    style.id = "ulydia-filters-ui-style";
    style.textContent = `
:root{
  --uf-bg:#ffffff;
  --uf-border:rgba(17,24,39,.08);
  --uf-shadow:0 10px 26px rgba(17,24,39,.08);
  --uf-muted:#6b7280;
  --uf-text:#0f172a;
  --uf-accent:rgba(99,102,241,.65);
  --uf-accent-soft:rgba(99,102,241,.15);
  --uf-radius:18px;
}
#ulydia-metier-filters{
  max-width: 1200px;
  margin: 24px auto 14px;
  padding: 14px 14px;
  background: var(--uf-bg);
  border: 1px solid var(--uf-border);
  border-radius: var(--uf-radius);
  box-shadow: var(--uf-shadow);
}
#ulydia-metier-filters .uf-grid{
  display:grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 12px;
  align-items:end;
}
#ulydia-metier-filters .uf-field{
  display:flex;
  flex-direction:column;
  gap:6px;
}
#ulydia-metier-filters .uf-label{
  font-size:12px;
  font-weight:700;
  color: var(--uf-muted);
  letter-spacing:.2px;
}
#ulydia-metier-filters .uf-selectWrap{
  position:relative;
}
#ulydia-metier-filters select{
  width:100%;
  height:46px;
  padding:0 42px 0 14px;
  border-radius: 14px;
  border:1px solid rgba(17,24,39,.12);
  background:#f9fafb;
  color: var(--uf-text);
  font-size:14px;
  font-weight:650;
  outline:none;
  appearance:none;
  -webkit-appearance:none;
  -moz-appearance:none;
}
#ulydia-metier-filters select:focus{
  background:#fff;
  border-color: var(--uf-accent);
  box-shadow:0 0 0 4px var(--uf-accent-soft);
}
#ulydia-metier-filters .uf-chevron{
  position:absolute;
  right:12px;
  top:50%;
  transform:translateY(-50%);
  width:18px;
  height:18px;
  pointer-events:none;
  opacity:.55;
}
#ulydia-metier-filters .uf-row2{
  margin-top: 10px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
}
#ulydia-metier-filters .uf-count{
  font-size:13px;
  color: var(--uf-muted);
  font-weight:650;
}
#ulydia-metier-filters .uf-reset{
  border:1px solid rgba(17,24,39,.12);
  background:#fff;
  color: var(--uf-text);
  height:36px;
  padding:0 12px;
  border-radius: 12px;
  font-weight:700;
  font-size:13px;
  cursor:pointer;
}
#ulydia-metier-filters .uf-reset:hover{
  background:#f9fafb;
}
@media (max-width: 820px){
  #ulydia-metier-filters .uf-grid{ grid-template-columns:1fr; }
  #ulydia-metier-filters{ margin:16px auto 10px; }
}
`;
    document.head.appendChild(style);
  }

  function decorateFiltersSectionOnce() {
    const sec = $(CFG.filtersSection);
    if (!sec) return;

    injectUIStylesOnce();

    if (!sec.querySelector(".uf-grid")) {
      const grid = document.createElement("div");
      grid.className = "uf-grid";

      const selects = [
        { id: CFG.selCountry, label: "Pays" },
        { id: CFG.selSector,  label: "Secteur d’activité" },
        { id: CFG.selMetier,  label: "Métier" }
      ];

      selects.forEach(s => {
        const sel = $(s.id);
        if (!sel) return;

        // keep original select in DOM but move into our structure
        const field = document.createElement("div");
        field.className = "uf-field";

        const lab = document.createElement("div");
        lab.className = "uf-label";
        lab.textContent = s.label;

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

      // Row 2
      const row2 = document.createElement("div");
      row2.className = "uf-row2";

      const count = document.createElement("div");
      count.className = "uf-count";
      count.id = "uf-count";
      count.textContent = "0 fiche(s) métier";

      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "uf-reset";
      reset.id = "uf-reset";
      reset.textContent = "↺ Réinitialiser";

      row2.appendChild(count);
      row2.appendChild(reset);

      // Clear section then append our layout
      // BUT keep any existing children by moving them into a fragment if needed
      // Here, we assume the section only contains the 3 selects wrappers.
      sec.innerHTML = "";
      sec.appendChild(grid);
      sec.appendChild(row2);
    }
  }

  function updateCount() {
    const el = document.getElementById("uf-count");
    if (!el) return;
    const root = $(CFG.results);
    if (!root) return;
    const visible = $$(`[fs-cmsfilter-element="item"]`, root).filter(isVisible).length;
    el.textContent = `${visible} fiche(s) métier`;
  }

  // ---------------- DATA READERS ----------------
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

  function earlyPrepare() {
    ensureTriggersContainerIsFilters();
    decorateFiltersSectionOnce();
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
    updateCount();
  }

  function redirectToMetier(slug, iso) {
    const dest = new URL(CFG.metierBasePath, window.location.origin);
    dest.searchParams.set("metier", slug);
    if (iso) dest.searchParams.set("country", String(iso).toUpperCase());
    window.location.href = dest.toString();
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

    // Reset button (keep country, reset sector + metier)
    const resetBtn = document.getElementById("uf-reset");
    if (resetBtn && !resetBtn.__ulydia_bound__) {
      resetBtn.__ulydia_bound__ = true;
      resetBtn.addEventListener("click", async () => {
        selSector.value = "";
        clickTrigger("sector", "");
        await rebuildMetierSelect();
      });
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