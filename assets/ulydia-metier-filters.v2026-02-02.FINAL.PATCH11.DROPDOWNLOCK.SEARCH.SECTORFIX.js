/*!
 * ULYDIA — Filter Bar (PATCH11)
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH11.DROPDOWNLOCK.SEARCH.SECTORFIX.js
 *
 * Fixes requested:
 * 1) Dropdown closes when you release mouse / try to scroll:
 *    - We STOP closing dropdowns on pointerup/mouseup.
 *    - We ONLY close when clicking OUTSIDE the filter bar, or selecting an item, or pressing Escape.
 *    - We do NOT call closeAll on "non-pop" clicks inside the bar.
 *
 * 2) Metier search:
 *    - When dropdown open, typing in search filters list live (prefix + contains).
 *    - For Metier, we prioritize "startsWith" matches, then "contains".
 *
 * 3) Sectors still missing:
 *    - Normalize final language to 2 letters (e.g. "fr-FR" => "fr")
 *    - Sector label extraction supports multiple delimiters (· | , ; /) and creates multiple sector options.
 *    - Wider selector mapping for sector fields inside metier DOM items.
 *
 * Data:
 *  - slug: .js-metier-slug (confirmed)
 *  - sector fields (per item): tries
 *      .js-fiche-secteur-<lang>, .js-metier-secteur-<lang>, .js-fiche-sector-<lang>, .js-metier-sector-<lang>
 *      and also non-suffixed: .js-fiche-secteur, .js-metier-secteur, .js-fiche-sector, .js-metier-sector
 *  - title fields: tries many, then prettify slug
 */
(() => {
  if (window.__ULYDIA_METIER_FILTERS_PATCH11__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH11__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[ULYDIA:filters]", ...a);

  const norm  = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();
  const esc = (s) => String(s || "").replace(/[&<>"]/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[ch]));
  const LANGS = ["fr","en","de","es","it"];

  const normalizeLang = (l) => {
    l = lower(l);
    if (!l) return "";
    // fr-FR, en_US, etc.
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
    fr: { country:"Pays", sector:"Secteur d’activité", metier:"Métier", search:"Rechercher…", choose:"Choisir", go:"Voir la fiche" },
    en: { country:"Country", sector:"Industry sector", metier:"Job", search:"Search…", choose:"Choose", go:"Open" },
    de: { country:"Land", sector:"Branche", metier:"Beruf", search:"Suchen…", choose:"Wählen", go:"Öffnen" },
    es: { country:"País", sector:"Sector", metier:"Profesión", search:"Buscar…", choose:"Elegir", go:"Abrir" },
    it: { country:"Paese", sector:"Settore", metier:"Mestiere", search:"Cerca…", choose:"Scegli", go:"Apri" },
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
  // DOM metiers
  // ---------------------------
  function qText(root, sel) {
    const el = root.querySelector(sel);
    return el ? norm(el.textContent || "") : "";
  }
  function readMetiersFromDOM() {
    const slugNodes = Array.from(document.querySelectorAll(".js-metier-slug"));
    const itemsSet = new Set();
    slugNodes.forEach(n => {
      const it = n.closest(".w-dyn-item") || n.closest("[data-ulydia-metier-item]") || n.parentElement;
      if (it) itemsSet.add(it);
    });

    // fallback to sector markers if needed
    if (!itemsSet.size) {
      const markers = Array.from(document.querySelectorAll(".js-fiche-secteur-fr,.js-fiche-secteur-en,.js-fiche-secteur-de,.js-fiche-secteur-es,.js-fiche-secteur-it"));
      markers.forEach(m => {
        const it = m.closest(".w-dyn-item") || m.closest("[data-ulydia-metier-item]") || m.parentElement;
        if (it) itemsSet.add(it);
      });
    }

    const items = Array.from(itemsSet);
    const out = [];

    items.forEach(item => {
      const slug = qText(item, ".js-metier-slug");
      if (!slug) return;

      const titles = {};
      const sectors = {};

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

      // non-suffixed sectors (some builds have only one)
      const sectorAny =
        qText(item, `.js-fiche-secteur`) ||
        qText(item, `.js-metier-secteur`) ||
        qText(item, `.js-fiche-sector`) ||
        qText(item, `.js-metier-sector`) ||
        "";
      if (sectorAny) LANGS.forEach(l => { if (!sectors[l]) sectors[l] = sectorAny; });

      const titleAny =
        qText(item, ".js-metier-title") ||
        qText(item, ".js-fiche-title") ||
        qText(item, ".js-metier-name") ||
        qText(item, ".js-fiche-name") ||
        "";
      if (titleAny) LANGS.forEach(l => { if (!titles[l]) titles[l] = titleAny; });

      out.push({ slug, titles, sectors });
    });

    const seen = new Set();
    return out.filter(m => (seen.has(m.slug) ? false : (seen.add(m.slug), true)));
  }
  function ensureMetiers() {
    if (Array.isArray(window.__ULYDIA_FICHE_METIERS__) && window.__ULYDIA_FICHE_METIERS__.length) return window.__ULYDIA_FICHE_METIERS__;
    const m = readMetiersFromDOM();
    window.__ULYDIA_FICHE_METIERS__ = m;
    return m;
  }

  // ---------------------------
  // URL
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
  // Styles
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
        overflow: visible;
      }
      .uf-field{ min-width:240px; flex:1 1 240px; position:relative; }
      .uf-actions{ min-width:160px; flex:0 0 auto; }
      .uf-label{ display:block; font-size:12px; font-weight:800; margin:0 0 8px; color: rgba(17,24,39,.85); }
      .uf-pill{
        height:44px; display:flex; align-items:center; justify-content:space-between;
        border-radius:14px; border: 1px solid rgba(17,24,39,.12);
        padding: 0 12px; background:#fff;
        user-select:none;
        cursor:pointer;
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
        max-height: 320px;
        overflow:auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding-right: 6px;
      }
      .uf-item{
        padding:12px 12px;
        border-radius:12px;
        line-height:1.2;
        cursor:pointer;
      }
      .uf-item:hover{ background: rgba(107,78,255,.08); }
      .uf-item.uf-hidden{ display:none; }
      .uf-muted{ font-size:11px; opacity:.75; margin-top:8px; color: rgba(17,24,39,.75); }
      @media (max-width: 640px){
        .uf-actions{ width:100%; }
        .uf-btn{ width:100%; }
      }
    `;
    document.head.appendChild(st);
  }

  // ---------------------------
  // Mount
  // ---------------------------
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
  // Build options
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
  function splitSectors(label) {
    label = norm(label);
    if (!label) return [];
    // handle "A · B", "A, B", "A | B", etc.
    const parts = label.split(/[·|,;/]+/g).map(p => norm(p)).filter(Boolean);
    return parts.length ? parts : [label];
  }

  function buildOptions(state) {
    const countries = getCountries();
    const metiers = ensureMetiers();

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

    // sectors derived from metiers
    const sectorMap = new Map();
    metiers.forEach(m => {
      const labelRaw = pickByLang(m?.sectors || {}, finalLang);
      if (!labelRaw) return;
      splitSectors(labelRaw).forEach(label => {
        const key = slugify(label);
        if (key && !sectorMap.has(key)) sectorMap.set(key, label);
      });
    });

    const sectorOptions = Array.from(sectorMap.entries())
      .map(([value,label]) => ({ value, label }))
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    const jobOptions = metiers
      .filter(m => {
        if (!state.sector) return true;
        const labelRaw = pickByLang(m?.sectors || {}, finalLang);
        if (!labelRaw) return false;
        const keys = splitSectors(labelRaw).map(s => slugify(s)).filter(Boolean);
        return keys.includes(state.sector);
      })
      .map(m => {
        const label = pickByLang(m?.titles || {}, finalLang) || prettifySlug(m.slug) || m.slug;
        return { value: m.slug, label };
      })
      .filter(o => o.value && o.label)
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    return { ui, finalLang, countryOptions, sectorOptions, jobOptions, metiersCount: metiers.length };
  }

  // ---------------------------
  // Render
  // ---------------------------
  function render(mount, state) {
    const { ui, finalLang, countryOptions, sectorOptions, jobOptions, metiersCount } = buildOptions(state);

    const countryLabel = state.country ? (countryOptions.find(o=>o.value===state.country)?.label || state.country) : ui.choose;
    const sectorLabel  = state.sector  ? (sectorOptions.find(o=>o.value===state.sector)?.label || state.sector) : ui.choose;
    const jobLabel     = state.metier  ? (jobOptions.find(o=>o.value===state.metier)?.label || state.metier) : ui.choose;

    const canSector = !!state.country && sectorOptions.length > 0;
    const canMetier = !!state.country && jobOptions.length > 0;

    const hintParts = [];
    if (!metiersCount) hintParts.push("⚠️ aucun métier trouvé (liste cachée / .js-metier-slug)");
    if (state.country && !sectorOptions.length) hintParts.push("⚠️ secteurs vides (champs secteur manquants sur items)");
    const hint = hintParts.length ? `<div class="uf-muted">${esc(hintParts.join(" — "))}</div>` : "";

    mount.innerHTML = `
      <div class="uf-bar" id="uf-bar" data-uf-root="1">
        <div class="uf-field" data-uf-field="country">
          <label class="uf-label">${esc(ui.country)}</label>
          <div class="uf-pill" data-uf-pill="country"><span>${esc(countryLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="country">
            <input class="uf-input" data-uf-search="country" placeholder="${esc(ui.search)}" />
            <div class="uf-list" data-uf-list="country">
              ${countryOptions.map(o=>`<div class="uf-item" data-uf-item="country" data-value="${esc(o.value)}" data-text="${esc(lower(o.label))}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
          ${state.country ? `<div class="uf-muted">ISO: ${esc(state.country)} — langue: ${esc(finalLang)} — secteurs: ${sectorOptions.length} — métiers: ${jobOptions.length}</div>` : ``}
        </div>

        <div class="uf-field" data-uf-field="sector">
          <label class="uf-label">${esc(ui.sector)}</label>
          <div class="uf-pill" data-uf-pill="sector" ${canSector ? "" : 'aria-disabled="true"'}><span>${esc(sectorLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="sector">
            <input class="uf-input" data-uf-search="sector" placeholder="${esc(ui.search)}" ${canSector ? "" : "disabled"} />
            <div class="uf-list" data-uf-list="sector">
              ${sectorOptions.map(o=>`<div class="uf-item" data-uf-item="sector" data-value="${esc(o.value)}" data-text="${esc(lower(o.label))}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
        </div>

        <div class="uf-field" data-uf-field="metier">
          <label class="uf-label">${esc(ui.metier)}</label>
          <div class="uf-pill" data-uf-pill="metier" ${canMetier ? "" : 'aria-disabled="true"'}><span>${esc(jobLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="metier">
            <input class="uf-input" data-uf-search="metier" placeholder="Ortho…" ${canMetier ? "" : "disabled"} />
            <div class="uf-list" data-uf-list="metier">
              ${jobOptions.slice(0, 1200).map(o=>`<div class="uf-item" data-uf-item="metier" data-value="${esc(o.value)}" data-text="${esc(lower(o.label))}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
          ${hint}
        </div>

        <div class="uf-actions">
          <button class="uf-btn" data-uf-go="1" ${state.country && state.metier ? "" : "disabled"}>${esc(ui.go)}</button>
        </div>
      </div>
    `;
  }

  function closeAll(root) {
    root.querySelectorAll(".uf-pop.open").forEach(p => p.classList.remove("open"));
  }
  function openPop(root, type) {
    const pop = root.querySelector(`[data-uf-pop="${type}"]`);
    if (!pop) return;
    pop.classList.add("open");
    const input = root.querySelector(`[data-uf-search="${type}"]`);
    if (input && !input.disabled) {
      input.value = "";
      setTimeout(() => { try { input.focus(); } catch(e){} }, 0);
    }
    filterList(root, type, "");
  }

  function filterList(root, type, q) {
    const qq = lower(norm(q));
    const items = Array.from(root.querySelectorAll(`[data-uf-item="${type}"]`));
    if (!qq) {
      items.forEach(el => el.classList.remove("uf-hidden"));
      return;
    }

    // For metier: prioritize startsWith, then contains
    if (type === "metier") {
      const starts = [];
      const contains = [];
      items.forEach(el => {
        const txt = (el.getAttribute("data-text") || lower(norm(el.textContent || "")));
        if (txt.startsWith(qq)) starts.push(el);
        else if (txt.includes(qq)) contains.push(el);
        else el.classList.add("uf-hidden");
      });
      // show ordered, hide others already hidden
      const list = root.querySelector(`[data-uf-list="${type}"]`);
      if (list) {
        [...starts, ...contains].forEach(el => {
          el.classList.remove("uf-hidden");
          list.appendChild(el); // reorder in DOM
        });
      } else {
        [...starts, ...contains].forEach(el => el.classList.remove("uf-hidden"));
      }
      return;
    }

    items.forEach(el => {
      const txt = (el.getAttribute("data-text") || lower(norm(el.textContent || "")));
      el.classList.toggle("uf-hidden", !(txt.includes(qq)));
    });
  }

  // ---------------------------
  // Capture shield: lock dropdown open
  // ---------------------------
  function installShield(mount, state) {
    const isInsideFilters = (t) => !!(t && t.closest && t.closest("#ulydia-metier-filters"));
    const isInsidePop = (t) => !!(t && t.closest && t.closest(".uf-pop"));
    const isInsideList = (t) => !!(t && t.closest && t.closest(".uf-list"));

    const handler = (e) => {
      const root = mount.querySelector("[data-uf-root='1']");
      if (!root) return;

      const t = e.target;
      const inFilters = isInsideFilters(t);

      // Outside click => close
      if (!inFilters) {
        if (e.type === "pointerdown" || e.type === "mousedown" || e.type === "touchstart") closeAll(root);
        return;
      }

      // We're inside the filter bar: stop other scripts
      try { e.stopImmediatePropagation(); } catch(_) { try { e.stopPropagation(); } catch(e2){} }

      // Allow scroll interactions inside list/popups:
      const inList = isInsideList(t);
      const inPop = isInsidePop(t);
      const isWheel = e.type === "wheel";
      const isDown = e.type === "pointerdown" || e.type === "mousedown" || e.type === "touchstart";
      if (!(isWheel || (inList && isDown))) {
        try { e.preventDefault(); } catch(_) {}
      }
      if (isWheel) return;

      // Select item
      const item = t.closest ? t.closest("[data-uf-item]") : null;
      if (item) {
        const type = item.getAttribute("data-uf-item");
        const value = item.getAttribute("data-value") || "";
        if (type === "country") {
          state.country = upper(value);
          state.sector = "";
          state.metier = "";
        } else if (type === "sector") {
          state.sector = value;
          state.metier = "";
        } else if (type === "metier") {
          state.metier = value;
        }
        closeAll(root);
        render(mount, state);
        return;
      }

      // Open/close pills
      const pill = t.closest ? t.closest("[data-uf-pill]") : null;
      if (pill) {
        const type = pill.getAttribute("data-uf-pill");
        if (pill.getAttribute("aria-disabled") === "true") return;
        const pop = root.querySelector(`[data-uf-pop="${type}"]`);
        const isOpen = pop && pop.classList.contains("open");
        if (isOpen) closeAll(root);
        else {
          closeAll(root);
          openPop(root, type);
        }
        return;
      }

      // Typing in search input
      const search = t.closest ? t.closest("[data-uf-search]") : null;
      if (search) {
        const type = search.getAttribute("data-uf-search");
        setTimeout(() => filterList(root, type, search.value || ""), 0);
        return;
      }

      // Go
      const go = t.closest ? t.closest("[data-uf-go]") : null;
      if (go) {
        if (!state.country || !state.metier) return;
        navigateTo(state.country, state.metier, state.sector);
        return;
      }

      // IMPORTANT: do NOT close on mouseup/pointerup (fixes your "release mouse closes")
      // and do NOT close on random clicks inside the bar (only outside click closes).
      if (!inPop) {
        // click inside bar but outside any popup: keep open state as-is
      }
    };

    ["pointerdown","mousedown","click","touchstart","wheel"].forEach(ev => {
      window.addEventListener(ev, handler, { capture: true, passive: ev === "wheel" });
    });

    window.addEventListener("keydown", (e) => {
      const inFilters = isInsideFilters(e.target);
      if (!inFilters) return;
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
    if (!mount) return;

    const qs = getQS();
    const state = { country: qs.country || "", sector: qs.sector || "", metier: qs.metier || "" };

    ensureMetiers();
    render(mount, state);
    installShield(mount, state);

    // rerender for Webflow hydration
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (!(window.__ULYDIA_FICHE_METIERS__||[]).length) window.__ULYDIA_FICHE_METIERS__ = readMetiersFromDOM();
      render(mount, state);
      if (tries > 8) clearInterval(t);
    }, 700);

    log("patch11 ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
