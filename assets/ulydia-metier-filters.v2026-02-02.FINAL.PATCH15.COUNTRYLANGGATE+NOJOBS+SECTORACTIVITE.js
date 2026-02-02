/*!
 * ULYDIA — Filter Bar (PATCH14 SECTOR-ACTIVITE SOURCE)
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH14.SECTORACTIVITE+EVENTMODEL.FOCUSLOCK.js
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
  if (window.__ULYDIA_METIER_FILTERS_PATCH14__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH14__ = true;

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
  // Jobs from DOM (hidden CMS export)
  // ---------------------------
  function qText(root, sel) {
    const el = root.querySelector(sel);
    return el ? norm(el.textContent || "") : "";
  }

  function readJobsFromDOM() {
    const slugNodes = Array.from(document.querySelectorAll(".js-metier-slug"));
    const itemsSet = new Set();
    slugNodes.forEach(n => {
      const it = n.closest(".w-dyn-item") || n.closest("[data-ulydia-metier-item]") || n.parentElement;
      if (it) itemsSet.add(it);
    });

    const items = Array.from(itemsSet);
    const out = [];

    items.forEach(item => {
      const slug = qText(item, ".js-metier-slug");
      if (!slug) return;

      const titles = {};
      const sectors = {};
      // ✅ Secteur d’activité (Fiche métier → Secteur d’activité → secteur_label_affiche)
      // Expose in Webflow as one or many hidden nodes:
      //   <div class="js-fiche-secteur-activite">Paramédical</div>
      const secteurs_activite = Array.from(
        item.querySelectorAll(".js-fiche-secteur-activite, .js-fiche-secteur-activite-label, .js-metier-secteur-activite, .js-secteur-activite")
      )
        .map(el => norm(el.textContent || ""))
        .flatMap(t => t.split(/\n|\r|\t|\s{2,}/g))
        .map(t => norm(t))
        .filter(Boolean);


      LANGS.forEach(l => {
        titles[l] =
          qText(item, `.js-metier-title-${l}`) ||
          qText(item, `.js-fiche-title-${l}`) ||
          qText(item, `.js-metier-nom-${l}`) ||
          qText(item, `.js-fiche-nom-${l}`) ||
          "";
        sectors[l] =
          qText(item, `.js-fiche-secteur-${l}`) ||
          qText(item, `.js-metier-secteur-${l}`) ||
          qText(item, `.js-fiche-sector-${l}`) ||
          qText(item, `.js-metier-sector-${l}`) ||
          "";
      });

      const titleAny =
        qText(item, ".js-metier-title") ||
        qText(item, ".js-fiche-title") ||
        qText(item, ".js-metier-name") ||
        qText(item, ".js-fiche-name") ||
        "";
      if (titleAny) LANGS.forEach(l => { if (!titles[l]) titles[l] = titleAny; });

      const sectorAny =
        qText(item, ".js-fiche-secteur") ||
        qText(item, ".js-metier-secteur") ||
        qText(item, ".js-fiche-sector") ||
        qText(item, ".js-metier-sector") ||
        "";
      if (sectorAny) LANGS.forEach(l => { if (!sectors[l]) sectors[l] = sectorAny; });

      out.push({ slug, titles, sectors, secteurs_activite: Array.from(new Set(secteurs_activite)) });
    });

    const seen = new Set();
    return out.filter(x => (seen.has(x.slug) ? false : (seen.add(x.slug), true)));
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

    // ✅ Jobs filtered for selected country language (prevents FR fallback when a country has no localized jobs)
    const jobsForLang = jobs.filter(j => {
      const lbl = pickByLang(j.titles || {}, finalLang);
      return !!norm(lbl);
    });


    const sectorGlobals = getSectorGlobals();
    const sectorGlobalsCount = Array.isArray(sectorGlobals) ? sectorGlobals.length : 0;
    const sectorMap = new Map();

    // ✅ Primary source: Fiche métier → Secteur d’activité (label affichable)
    jobsForLang.forEach(j => {
      const arr = Array.isArray(j.secteurs_activite) && j.secteurs_activite.length
        ? j.secteurs_activite
        : [];
      if (arr.length) {
        arr.forEach(label => {
          label = norm(label);
          if (!label) return;
          const key = slugify(label);
          if (key && !sectorMap.has(key)) sectorMap.set(key, label);
        });
        return;
      }

      // Backward compat: legacy per-lang sector fields
      const legacy = pickByLang(j.sectors || {}, finalLang);
      if (legacy) {
        const key = slugify(legacy);
        if (key && !sectorMap.has(key)) sectorMap.set(key, legacy);
      }
    });

    // Fallback: globals (only if jobs did not expose sectors)
    if (!sectorMap.size && sectorGlobalsCount) {
      sectorGlobals.forEach(s => {
        const label = sectorLabelFromObj(s, finalLang) || sectorLabelFromObj(s, "en") || sectorLabelFromObj(s, "fr");
        if (!label) return;
        const key = slugify(label);
        if (key && !sectorMap.has(key)) sectorMap.set(key, label);
      });
    }

    const sectorOptions = Array.from(sectorMap.entries())
      .map(([value,label]) => ({ value, label }))
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    const jobOptions = jobsForLang
      .filter(j => {
        if (!state.sector) return true;

        // ✅ Primary: secteurs_activite array
        if (Array.isArray(j.secteurs_activite) && j.secteurs_activite.length) {
          return j.secteurs_activite.some(lbl => slugify(lbl) === state.sector);
        }

        // Legacy: per-lang sector field
        const s = pickByLang(j.sectors || {}, finalLang);
        return s && slugify(s) === state.sector;
      })
      .map(j => {
        const label = pickByLang(j.titles || {}, finalLang) || prettifySlug(j.slug);
        return { value: j.slug, label };
      })
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    return { ui, finalLang, countryOptions, sectorOptions, jobOptions, jobsCount: jobsForLang.length, sectorGlobalsCount: sectorGlobals.length };
  }

  // ---------------------------
  // Render + filter
  // ---------------------------
  function render(mount, state) {
    const { ui, finalLang, countryOptions, sectorOptions, jobOptions, jobsCount, sectorGlobalsCount } = buildOptions(state);

    const countryLabel = state.country ? (countryOptions.find(o=>o.value===state.country)?.label || state.country) : ui.choose;
    const sectorLabel  = state.sector  ? (sectorOptions.find(o=>o.value===state.sector)?.label || state.sector) : ui.choose;
    const jobLabel     = state.metier  ? (jobOptions.find(o=>o.value===state.metier)?.label || prettifySlug(state.metier)) : ui.choose;

    const canSector = !!state.country && sectorOptions.length > 0;
    const canMetier = !!state.country && jobOptions.length > 0;

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
          <div class="uf-muted">langue: ${esc(finalLang)} — secteurs: ${sectorOptions.length} (globals:${sectorGlobalsCount}) — métiers: ${jobOptions.length} / ${jobsCount}</div>
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

    log("PATCH14 ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
