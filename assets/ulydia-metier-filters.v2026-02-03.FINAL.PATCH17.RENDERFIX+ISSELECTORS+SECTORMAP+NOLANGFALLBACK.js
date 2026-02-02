/*!
 * ULYDIA — Filter Bar (PATCH16 SECTOR-ACTIVITE SOURCE)
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH16.SECTORACTIVITE+EVENTMODEL.FOCUSLOCK.js
 *
 * Goal: stable dropdowns + typing works (no close on mouse release).
 *
 * Key idea:
 * - Use POINTERDOWN as the ONLY "action" event (toggle, select, outside-close).
 * - Use CLICK only to stop propagation (avoid other scripts toggling/closing).
 * - Never preventDefault on inputs (focus/typing must work).
 *
 * Data sources:
 * - Countries: window.__ULYDIA_CATALOG__.countries (or __ULYDIA_COUNTRIES__/__ULYDIA_PAYS__/__ULYDIA_COUNTRY_LIST__)
 * - Sectors: window.__ULYDIA_SECTEURS_ACTIVITE__ || __ULYDIA_SECTEURS__ || __ULYDIA_SECTORS__ (strings or objects)
 * - Jobs: DOM hidden CMS list (items containing .js-metier-slug and optional title/sector markers)
 */
(() => {
  if (window.__ULYDIA_METIER_FILTERS_PATCH16__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH16__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[ULYDIA:filters]", ...a);

  const norm  = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();
  const esc = (s) => String(s || "").replace(/[&<>"]/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[ch]));

  const LANGS = ["fr","en","de","es","it"];
  const normalizeLang = (l) => {
    l = lower(l);
    const m = l.match(/^[a-z]{2}/);
    return m ? m[0] : l;
  };

  function slugify(s) {
    return lower(norm(s))
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }
  function prettifySlug(slug){
    const s = norm(slug).replace(/[-_]+/g," ").replace(/\s+/g," ").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const UI = {
    fr: { country:"Pays", sector:"Secteur d’activité", metier:"Métier", search:"Rechercher…", choose:"Choisir…", go:"Voir la fiche", no_jobs:"Aucun métier disponible pour ce pays (encore)." },
    en: { country:"Country", sector:"Industry sector", metier:"Job", search:"Search…", choose:"Choose…", go:"Open", no_jobs:"No jobs available for this country yet." },
    de: { country:"Land", sector:"Branche", metier:"Beruf", search:"Suchen…", choose:"Wählen…", go:"Öffnen", no_jobs:"Für dieses Land sind noch keine Berufe verfügbar." },
    es: { country:"País", sector:"Sector", metier:"Profesión", search:"Buscar…", choose:"Elegir…", go:"Abrir", no_jobs:"Aún no hay profesiones disponibles para este país." },
    it: { country:"Paese", sector:"Settore", metier:"Mestiere", search:"Cerca…", choose:"Scegli…", go:"Apri", no_jobs:"Nessun mestiere disponibile per questo paese (per ora)." },
  };

  // ---------------------------
  // Countries
  // ---------------------------
  function getCountries() {
    const cat = window.__ULYDIA_CATALOG__;
    if (cat && Array.isArray(cat.countries) && cat.countries.length) return cat.countries;
    const arr = window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || window.__ULYDIA_COUNTRY_LIST__;
    return Array.isArray(arr) ? arr : [];
  }
  function countryIso(c) { return upper(c?.iso || c?.code || c?.alpha2 || c?.country_iso || c?.country || c?.value); }
  function countryFinalLang(c) { return normalizeLang(c?.langue_finale || c?.final_lang || c?.default_lang || c?.lang || c?.language); }
  function countryLabelByLang(c, lang) {
    const v = c?.[`label_${lang}`] || c?.[`name_${lang}`] || c?.[`title_${lang}`] || c?.label || c?.name || c?.title || countryIso(c);
    return norm(v);
  }

  // ---------------------------
  // Sectors from globals
  // ---------------------------
  function getSectorGlobals() {
    const a = window.__ULYDIA_SECTEURS_ACTIVITE__;
    const b = window.__ULYDIA_SECTEURS__;
    const c = window.__ULYDIA_SECTORS__;
    const pick = Array.isArray(a) && a.length ? a : (Array.isArray(b) && b.length ? b : (Array.isArray(c) && c.length ? c : null));
    return pick || [];
  }
  function sectorLabelFromObj(obj, lang) {
    if (typeof obj === "string") return norm(obj);
    if (!obj || typeof obj !== "object") return "";
    const keys = [
      `name_${lang}`, `label_${lang}`, `title_${lang}`,
      `nom_${lang}`, `libelle_${lang}`,
      "name", "label", "title", "nom", "libelle"
    ];
    for (const k of keys) {
      const v = norm(obj[k]);
      if (v) return v;
    }
    return "";
  }

  
  // ---------------------------
  // Sector map from DOM (Secteur d’activité collection export)
  // Expected per sector item:
  // - .js-sector-slug (slug)
  // - .js-sector-name (display label)
  // ---------------------------
  let __SECTOR_MAP_CACHE__ = null;
  function readSectorMapFromDOM() {
    if (__SECTOR_MAP_CACHE__) return __SECTOR_MAP_CACHE__;
    const map = new Map();
    const slugNodes = Array.from(document.querySelectorAll(".js-sector-slug, .is-sector-slug"));
    slugNodes.forEach(slugEl => {
      const it = slugEl.closest(".w-dyn-item") || slugEl.parentElement;
      const slug = norm(slugEl.textContent || "");
      if (!slug) return;
      const name = norm(it?.querySelector?.(".js-sector-name")?.textContent || "") || prettifySlug(slug);
      map.set(slug, name);
    });
    __SECTOR_MAP_CACHE__ = map;
    return map;
  }

  function parseSectorSlugs(raw){
    raw = norm(raw);
    if (!raw) return [];
    // accept csv / newline / pipe
    const parts = raw.split(/[,;|\n]+/g).map(s => slugify(s)).filter(Boolean);
    // if it looks already like a slug, keep as-is too
    const direct = raw.split(/[,;|\n]+/g).map(s => norm(s)).filter(Boolean);
    const out = [];
    direct.forEach(s => {
      if (/^[a-z0-9-]+$/i.test(s)) out.push(lower(s));
    });
    return Array.from(new Set([...out, ...parts]));
  }

// ---------------------------
  // Jobs from DOM (hidden CMS export)
  // ---------------------------
  function qText(root, sel) {
    const el = root.querySelector(sel);
    return el ? norm(el.textContent || "") : "";
  }


  function qTextAny(root, sels) {
    for (let i=0;i<sels.length;i++){
      const s = sels[i];
      if (!s) continue;
      const el = root.querySelector(s);
      const v = el ? norm(el.textContent || "") : "";
      if (v) return v;
    }
    return "";
  }

  function qAllText(root, sel) {
    return Array.from(root.querySelectorAll(sel)).map(el => norm(el.textContent||"")).filter(Boolean);
  }

  
  function readJobsFromDOM() {
    const slugNodes = Array.from(document.querySelectorAll(".js-metier-slug, .is-metier-slug"));
    const itemsSet = new Set();
    slugNodes.forEach(n => {
      const it = n.closest(".w-dyn-item") || n.closest("[data-ulydia-metier-item]") || n.parentElement;
      if (it) itemsSet.add(it);
    });

    const out = [];
    itemsSet.forEach(item => {
      const slug = qTextAny(item, [".js-metier-slug",".is-metier-slug"]);
      if (!slug) return;

      const lang = normalizeLang(qTextAny(item, [".js-fiche-lang",".is-fiche-lang"])) || "";
      const country = upper(qTextAny(item, [".js-fiche-country-code",".is-fiche-country-code",".js-fiche-code-iso",".is-fiche-code-iso",".js-fiche-iso",".is-fiche-iso"]) || "");

      // title: take the displayed name (already in the item's language)
      const title = qTextAny(item, [".js-metier-name",".is-metier-name",".js-metier-title",".is-metier-title",".js-fiche-title",".is-fiche-title",".js-fiche-name",".is-fiche-name"]) || "";

      const titles = {};
      if (lang && title) titles[lang] = title;

      // sector slug(s): primary field .js-metier-sector (reference slug or text)
      const sectorRaw = qTextAny(item, [".js-metier-sector",".is-metier-sector",".js-fiche-sector",".is-fiche-sector",".js-fiche-secteur",".is-fiche-secteur",".js-metier-secteur",".is-metier-secteur"]) || "";
      const sector_slugs = parseSectorSlugs(sectorRaw);

      out.push({ slug, lang, country, titles, sector_slugs });
    });

    return out;
  }
function ensureJobs() {
    if (Array.isArray(window.__ULYDIA_FICHE_METIERS__) && window.__ULYDIA_FICHE_METIERS__.length) return window.__ULYDIA_FICHE_METIERS__;
    const jobs = readJobsFromDOM();
    window.__ULYDIA_FICHE_METIERS__ = jobs;
    return jobs;
  }

  // ---------------------------
  // URL + navigation
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
  // Styles + mount
  // ---------------------------
  function injectStyles() {
    if (document.getElementById("ulydia-filters-style")) return;
    const st = document.createElement("style");
    st.id = "ulydia-filters-style";
    st.textContent = `
      #ulydia-metier-filters{ width:100%; }
      .uf-bar{
        display:flex; flex-wrap:wrap; gap:14px;
        padding:16px 16px; margin:18px 0 18px;
        border-radius:20px;
        background: rgba(107,78,255,.06);
        box-shadow: 0 14px 30px rgba(16,24,40,.08);
        align-items:flex-end;
        position:relative; z-index: 999999;
      }
      .uf-field{ min-width:240px; flex:1 1 240px; position:relative; }
      .uf-actions{ min-width:160px; flex:0 0 auto; }
      .uf-empty{ flex: 1 1 100%; margin-top: 6px; font-size: 12px; font-weight: 700; color: rgba(17,24,39,.7); }
      .uf-label{ display:block; font-size:12px; font-weight:800; margin:0 0 8px; color: rgba(17,24,39,.85); }
      .uf-pill{
        height:44px; display:flex; align-items:center; justify-content:space-between;
        border-radius:14px; border: 1px solid rgba(17,24,39,.12);
        padding: 0 12px; background:#fff;
        user-select:none; cursor:pointer;
      }
      .uf-pill[aria-disabled="true"]{ opacity:.55; cursor:not-allowed; }
      .uf-pill span{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .uf-caret{ margin-left:10px; opacity:.7; }
      .uf-btn{
        height:44px; border-radius:14px; border:none;
        padding:0 18px;
        background: var(--ulydia-primary, #6b4eff);
        color:#fff; font-weight:900; font-family:inherit; font-size:15px;
        box-shadow: 0 10px 18px rgba(107,78,255,.25);
        cursor:pointer;
      }
      .uf-btn:disabled{ opacity:.55; box-shadow:none; cursor:not-allowed; }
      .uf-pop{
        position:absolute; left:0; right:0; top: calc(44px + 8px);
        background:#fff; border-radius:16px;
        box-shadow: 0 18px 40px rgba(16,24,40,.14);
        border: 1px solid rgba(17,24,39,.10);
        padding:10px;
        display:none;
        z-index: 999999;
      }
      .uf-pop.open{ display:block; }
      .uf-input{
        width:100%; height:40px; border-radius:12px;
        border: 1px solid rgba(17,24,39,.12);
        padding: 0 12px; outline:none; background:#fff;
        font-family:inherit; font-size:14px;
      }
      .uf-input:focus{
        border-color: rgba(107,78,255,.55);
        box-shadow: 0 0 0 4px rgba(107,78,255,.14);
      }
      .uf-list{
        margin-top:10px;
        max-height: 340px;
        overflow:auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding-right: 6px;
      }
      .uf-item{ padding:12px 12px; border-radius:12px; line-height:1.2; cursor:pointer; }
      .uf-item:hover{ background: rgba(107,78,255,.08); }
      .uf-item.uf-hidden{ display:none; }
      .uf-muted{ font-size:11px; opacity:.75; margin-top:8px; color: rgba(17,24,39,.75); }
      @media (max-width: 640px){ .uf-actions{ width:100%; } .uf-btn{ width:100%; } }
    `;
    document.head.appendChild(st);
  }

  function ensureMount() {
    const root = document.getElementById("ulydia-metier-root");
    if (!root) return null;
    let el = document.getElementById("ulydia-metier-filters");
    if (el) return el;
    el = document.createElement("section");
    el.id = "ulydia-metier-filters";
    (root.parentNode || document.body).insertBefore(el, root);
    return el;
  }

  // ---------------------------
  // Options
  // ---------------------------
  function pickByLang(obj, finalLang) {
    const chain = [finalLang, "en", "fr", "de", "es", "it"].map(normalizeLang).filter(Boolean);
    const uniq = Array.from(new Set(chain));
    for (const l of uniq) {
      const v = norm(obj?.[l] || "");
      if (v) return v;
    }
    return "";
  }

  
  function buildOptions(state) {
    const countries = getCountries();
    const jobs = ensureJobs();
    const sectorMapDOM = readSectorMapFromDOM(); // Map(slug -> label)

    const countryOptions = countries
      .map(c => {
        const iso = countryIso(c);
        const lang = countryFinalLang(c) || "fr";
        return { value: iso, label: countryLabelByLang(c, lang) || iso, lang };
      })
      .filter(o => o.value)
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    const cObj = state.country ? countries.find(c => countryIso(c) === state.country) : null;
    const finalLang = cObj ? (countryFinalLang(cObj) || "fr") : "fr";
    const ui = UI[finalLang] || UI.fr;

    // ✅ HARD GATE: only jobs for selected country + final language
    const jobsForCountryLang = state.country
      ? jobs.filter(j => upper(j.country) === upper(state.country) && normalizeLang(j.lang) === normalizeLang(finalLang))
      : [];

    // ✅ Also require a non-empty title in that language (no FR fallback)
    const jobsWithTitle = jobsForCountryLang.filter(j => {
      const lbl = pickByLang(j.titles || {}, finalLang);
      return !!norm(lbl);
    });

    // Build sector options FROM the jobs available (using sector slugs) + DOM map to label
    const sectorSlugSet = new Set();
    jobsWithTitle.forEach(j => (j.sector_slugs || []).forEach(s => s && sectorSlugSet.add(lower(s))));

    const sectorOptions = Array.from(sectorSlugSet)
      .map(slug => ({ value: slug, label: sectorMapDOM.get(slug) || prettifySlug(slug) }))
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    // Filter jobs by selected sector slug (if any)
    const jobsFiltered = jobsWithTitle.filter(j => {
      if (!state.sector) return true;
      return Array.isArray(j.sector_slugs) && j.sector_slugs.includes(lower(state.sector));
    });

    const jobOptions = jobsFiltered
      .map(j => {
        const label = pickByLang(j.titles || {}, finalLang) || prettifySlug(j.slug);
        return { value: j.slug, label };
      })
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    // housekeeping: if the current selection is not valid anymore, reset
    const sectorValid = !state.sector || sectorOptions.some(o => o.value === state.sector);
    const metierValid = !state.metier || jobOptions.some(o => o.value === state.metier);
    const sanitized = {
      sector: sectorValid ? state.sector : "",
      metier: metierValid ? state.metier : ""
    };

    return {
      ui,
      finalLang,
      countryOptions,
      sectorOptions,
      jobOptions,
      jobsCount: jobsWithTitle.length,
      sanitized
    };
  }

  // ---------------------------
  // Render + filter
  // ---------------------------
  function render(mount, state) {
    const { ui, finalLang, countryOptions, sectorOptions, jobOptions, jobsCount, sanitized } = buildOptions(state);

    // sanitize selection if options changed
    if (sanitized) {
      if (state.sector !== sanitized.sector) state.sector = sanitized.sector;
      if (state.metier !== sanitized.metier) state.metier = sanitized.metier;
    }

    const countryLabel = state.country ? (countryOptions.find(o=>o.value===state.country)?.label || state.country) : ui.choose;
    const sectorLabel  = state.sector  ? (sectorOptions.find(o=>o.value===state.sector)?.label || state.sector) : ui.choose;
    const jobLabel     = state.metier  ? (jobOptions.find(o=>o.value===state.metier)?.label || prettifySlug(state.metier)) : ui.choose;

    const canSector = !!state.country && jobsCount > 0 && sectorOptions.length > 0;
    const canMetier = !!state.country && jobsCount > 0 && jobOptions.length > 0;

    mount.innerHTML = `
      <div class="uf-bar" data-uf-root="1">
        <div class="uf-field">
          <label class="uf-label">${esc(ui.country)}</label>
          <div class="uf-pill" data-uf-pill="country"><span>${esc(countryLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="country">
            <input class="uf-input" data-uf-search="country" placeholder="${esc(ui.search)}" />
            <div class="uf-list" data-uf-list="country">
              ${countryOptions.map(o=>`<div class="uf-item" data-uf-item="country" data-value="${esc(o.value)}" data-text="${esc(lower(o.label))}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
          <div class="uf-muted">langue: ${esc(finalLang)} — secteurs: ${sectorOptions.length} — métiers: ${jobOptions.length} / ${jobsCount}</div>
        </div>

        <div class="uf-field">
          <label class="uf-label">${esc(ui.sector)}</label>
          <div class="uf-pill" data-uf-pill="sector" ${canSector ? "" : 'aria-disabled="true"'}><span>${esc(sectorLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="sector">
            <input class="uf-input" data-uf-search="sector" placeholder="${esc(ui.search)}" ${canSector ? "" : "disabled"} />
            <div class="uf-list" data-uf-list="sector">
              ${sectorOptions.map(o=>`<div class="uf-item" data-uf-item="sector" data-value="${esc(o.value)}" data-text="${esc(lower(o.label))}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
        </div>

        <div class="uf-field">
          <label class="uf-label">${esc(ui.metier)}</label>
          <div class="uf-pill" data-uf-pill="metier" ${canMetier ? "" : 'aria-disabled="true"'}><span>${esc(jobLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="metier">
            <input class="uf-input" data-uf-search="metier" placeholder="Ortho…" ${canMetier ? "" : "disabled"} />
            <div class="uf-list" data-uf-list="metier">
              ${jobOptions.slice(0, 1200).map(o=>`<div class="uf-item" data-uf-item="metier" data-value="${esc(o.value)}" data-text="${esc(lower(o.label))}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
        </div>

        <div class="uf-actions">
          <button class="uf-btn" data-uf-go="1" ${state.country && state.metier ? "" : "disabled"}>${esc(ui.go)}</button>
        </div>

        ${state.country && jobsCount===0 ? `<div class="uf-empty">${esc(ui.no_jobs || "No jobs available.")}</div>` : ""}
      </div>
    `;
  }

  function closeAll(root) { root.querySelectorAll(".uf-pop.open").forEach(p => p.classList.remove("open")); }
  function openPop(root, type) {
    const pop = root.querySelector(`[data-uf-pop="${type}"]`);
    if (!pop) return;
    pop.classList.add("open");
    const input = root.querySelector(`[data-uf-search="${type}"]`);
    if (input && !input.disabled) setTimeout(() => { try { input.focus(); } catch(_){} }, 0);
  }

  function filterList(root, type, q) {
    const qq = lower(norm(q));
    const items = Array.from(root.querySelectorAll(`[data-uf-item="${type}"]`));
    if (!qq) { items.forEach(el => el.classList.remove("uf-hidden")); return; }

    if (type === "metier") {
      const list = root.querySelector(`[data-uf-list="${type}"]`);
      const starts = [];
      const contains = [];
      items.forEach(el => {
        const txt = el.getAttribute("data-text") || "";
        if (txt.startsWith(qq)) starts.push(el);
        else if (txt.includes(qq)) contains.push(el);
        else el.classList.add("uf-hidden");
      });
      if (list) [...starts, ...contains].forEach(el => { el.classList.remove("uf-hidden"); list.appendChild(el); });
      return;
    }

    items.forEach(el => {
      const txt = el.getAttribute("data-text") || "";
      el.classList.toggle("uf-hidden", !txt.includes(qq));
    });
  }

  // ---------------------------
  // Event model: POINTERDOWN only for actions
  // ---------------------------
  function installEvents(mount, state) {
    const isInside = (t) => !!(t && t.closest && t.closest("#ulydia-metier-filters"));

    // outside close on pointerdown
    window.addEventListener("pointerdown", (e) => {
      const root = mount.querySelector("[data-uf-root='1']");
      if (!root) return;
      if (!isInside(e.target)) closeAll(root);
    }, { capture: true });

    // inside actions on pointerdown
    window.addEventListener("pointerdown", (e) => {
      const root = mount.querySelector("[data-uf-root='1']");
      if (!root) return;
      const t = e.target;
      if (!isInside(t)) return;

      // block other scripts
      try { e.stopImmediatePropagation(); } catch(_) { try { e.stopPropagation(); } catch(e2){} }

      const isInput = (t.tagName === "INPUT") || (t.closest && t.closest("[data-uf-search]"));
      const inList = t.closest && t.closest(".uf-list");

      // allow default for inputs + list (scrollbar drag)
      if (!isInput && !inList) { try { e.preventDefault(); } catch(_) {} }

      const item = t.closest && t.closest("[data-uf-item]");
      if (item) {
        const type = item.getAttribute("data-uf-item");
        const value = item.getAttribute("data-value") || "";
        if (type === "country") { state.country = upper(value); state.sector = ""; state.metier = ""; }
        else if (type === "sector") { state.sector = value; state.metier = ""; }
        else if (type === "metier") { state.metier = value; }
        closeAll(root);
        render(mount, state);
        return;
      }

      const pill = t.closest && t.closest("[data-uf-pill]");
      if (pill) {
        const type = pill.getAttribute("data-uf-pill");
        if (pill.getAttribute("aria-disabled") === "true") return;
        const pop = root.querySelector(`[data-uf-pop="${type}"]`);
        const isOpen = pop && pop.classList.contains("open");
        if (isOpen) closeAll(root);
        else { closeAll(root); openPop(root, type); }
        return;
      }

      const go = t.closest && t.closest("[data-uf-go]");
      if (go) {
        if (!state.country || !state.metier) return;
        navigateTo(state.country, state.metier, state.sector);
      }
    }, { capture: true });

    // capture input to filter
    window.addEventListener("input", (e) => {
      const root = mount.querySelector("[data-uf-root='1']");
      if (!root) return;
      const t = e.target;
      if (!isInside(t)) return;
      const inp = t.closest && t.closest("[data-uf-search]");
      if (!inp) return;
      try { e.stopImmediatePropagation(); } catch(_) { try { e.stopPropagation(); } catch(e2){} }
      const type = inp.getAttribute("data-uf-search");
      filterList(root, type, inp.value || "");
    }, { capture: true });

    // wheel: allow native scroll, block other scripts
    window.addEventListener("wheel", (e) => {
      if (!isInside(e.target)) return;
      try { e.stopImmediatePropagation(); } catch(_) { try { e.stopPropagation(); } catch(e2){} }
    }, { capture: true, passive: true });

    // click blocker only
    window.addEventListener("click", (e) => {
      if (!isInside(e.target)) return;
      try { e.stopImmediatePropagation(); } catch(_) { try { e.stopPropagation(); } catch(e2){} }
    }, { capture: true });

    window.addEventListener("keydown", (e) => {
      if (!isInside(e.target)) return;
      if (e.key === "Escape") {
        try { e.stopImmediatePropagation(); } catch(_) {}
        try { e.preventDefault(); } catch(_) {}
        const root = mount.querySelector("[data-uf-root='1']");
        if (root) closeAll(root);
      }
    }, { capture: true });
  }

  function boot() {
    injectStyles();
    const mount = ensureMount();
    if (!mount) { log("no mount"); return; }

    const qs = getQS();
    const state = { country: qs.country || "", sector: qs.sector || "", metier: qs.metier || "" };

    ensureJobs();
    render(mount, state);
    installEvents(mount, state);

    // hydrate retries
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (!(window.__ULYDIA_FICHE_METIERS__||[]).length) window.__ULYDIA_FICHE_METIERS__ = readJobsFromDOM();
      render(mount, state);
      if (tries > 6) clearInterval(t);
    }, 700);

    log("PATCH16 ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();