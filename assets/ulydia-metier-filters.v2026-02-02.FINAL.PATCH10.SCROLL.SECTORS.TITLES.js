/*!
 * ULYDIA — Filter Bar (PATCH10)
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH10.SCROLL.SECTORS.TITLES.js
 *
 * Improvements over PATCH9:
 * 1) Scroll UX:
 *    - Do NOT preventDefault on pointerdown inside dropdown list => scrollbar drag + wheel works.
 *    - Add wheel handling: stop propagation but keep default scrolling.
 *    - Better list CSS (overscroll, smooth, larger hit areas).
 *
 * 2) Sector selection:
 *    - Sector labels fallback chain: finalLang -> en -> fr -> de -> es -> it
 *      (some of your items may not have sector for every lang).
 *
 * 3) Metier labels:
 *    - Title fallback chain: finalLang -> en -> fr -> de -> es -> it -> prettify(slug)
 *    - So you won't see raw slugs anymore even if title fields are missing.
 *
 * Data mapping:
 *  - slug: .js-metier-slug (confirmed)
 *  - sector fields: .js-fiche-secteur-<lang> (confirmed count=11) + optional .js-metier-secteur-<lang>
 *  - title fields: try .js-metier-title-<lang>, .js-fiche-title-<lang>, .js-metier-nom-<lang>, .js-fiche-nom-<lang>
 */
(() => {
  if (window.__ULYDIA_METIER_FILTERS_PATCH10__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH10__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[ULYDIA:filters]", ...a);

  const norm  = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();
  const esc = (s) => String(s || "").replace(/[&<>"]/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[ch]));

  const LANGS = ["fr","en","de","es","it"];
  const FALLBACK_LANG_CHAIN = (finalLang) => {
    const chain = [finalLang, "en", "fr", "de", "es", "it"].filter(Boolean);
    return Array.from(new Set(chain));
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
  function countryFinalLang(c) { return lower(c?.langue_finale || c?.final_lang || c?.default_lang || c?.lang || c?.language); }
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
  // UI labels
  // ---------------------------
  const UI = {
    fr: { country:"Pays", sector:"Secteur d’activité", metier:"Métier", search:"Rechercher…", choose:"Choisir", go:"Voir la fiche" },
    en: { country:"Country", sector:"Industry sector", metier:"Job", search:"Search…", choose:"Choose", go:"Open" },
    de: { country:"Land", sector:"Branche", metier:"Beruf", search:"Suchen…", choose:"Wählen", go:"Öffnen" },
    es: { country:"País", sector:"Sector", metier:"Profesión", search:"Buscar…", choose:"Elegir", go:"Abrir" },
    it: { country:"Paese", sector:"Settore", metier:"Mestiere", search:"Cerca…", choose:"Scegli", go:"Apri" },
  };

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
      }
      .uf-btn:disabled{ opacity:.55; box-shadow:none; }
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
      }
      .uf-item:hover{ background: rgba(107,78,255,.08); }
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
  // Option building with fallbacks
  // ---------------------------
  function pickByLang(obj, finalLang, fallbackSlug) {
    const chain = FALLBACK_LANG_CHAIN(finalLang);
    for (const l of chain) {
      const v = norm(obj?.[l] || "");
      if (v) return v;
    }
    return fallbackSlug ? norm(fallbackSlug) : "";
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

    // sectors derived from metiers
    const sectorMap = new Map();
    metiers.forEach(m => {
      const label = pickByLang(m?.sectors || {}, finalLang, "");
      if (!label) return;
      const key = slugify(label);
      if (key && !sectorMap.has(key)) sectorMap.set(key, label);
    });

    const sectorOptions = Array.from(sectorMap.entries())
      .map(([value,label]) => ({ value, label }))
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    const jobOptions = metiers
      .filter(m => {
        if (!state.sector) return true;
        const label = pickByLang(m?.sectors || {}, finalLang, "");
        return label && slugify(label) === state.sector;
      })
      .map(m => {
        const label = pickByLang(m?.titles || {}, finalLang, prettifySlug(m.slug));
        return { value: m.slug, label: label || prettifySlug(m.slug) || m.slug };
      })
      .filter(o => o.value)
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    return { countryOptions, sectorOptions, jobOptions, finalLang, metiersCount: metiers.length };
  }

  // ---------------------------
  // Render
  // ---------------------------
  function render(mount, state) {
    const { countryOptions, sectorOptions, jobOptions, finalLang, metiersCount } = buildOptions(state);
    const ui = UI[finalLang] || UI.fr;

    const countryLabel = state.country ? (countryOptions.find(o=>o.value===state.country)?.label || state.country) : ui.choose;
    const sectorLabel  = state.sector  ? (sectorOptions.find(o=>o.value===state.sector)?.label || state.sector) : ui.choose;
    const jobLabel     = state.metier  ? (jobOptions.find(o=>o.value===state.metier)?.label || state.metier) : ui.choose;

    const canSector = !!state.country && sectorOptions.length > 0;
    const canMetier = !!state.country && jobOptions.length > 0;

    const hintParts = [];
    if (!metiersCount) hintParts.push("⚠️ aucun métier trouvé (liste cachée / .js-metier-slug)");
    if (state.country && !sectorOptions.length) hintParts.push("⚠️ secteurs vides (vérifie js-fiche-secteur-xx dans la liste)");
    const hint = hintParts.length ? `<div class="uf-muted">${esc(hintParts.join(" — "))}</div>` : "";

    mount.innerHTML = `
      <div class="uf-bar" id="uf-bar" data-uf-root="1">
        <div class="uf-field" data-uf-field="country">
          <label class="uf-label">${esc(ui.country)}</label>
          <div class="uf-pill" data-uf-pill="country"><span data-uf-value-text="country">${esc(countryLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="country">
            <input class="uf-input" data-uf-search="country" placeholder="${esc(ui.search)}" />
            <div class="uf-list" data-uf-list="country">
              ${countryOptions.map(o=>`<div class="uf-item" data-uf-item="country" data-value="${esc(o.value)}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
          ${state.country ? `<div class="uf-muted">ISO: ${esc(state.country)} — langue: ${esc(finalLang)} — secteurs: ${sectorOptions.length} — métiers: ${jobOptions.length}</div>` : ``}
        </div>

        <div class="uf-field" data-uf-field="sector">
          <label class="uf-label">${esc(ui.sector)}</label>
          <div class="uf-pill" data-uf-pill="sector" ${canSector ? "" : 'aria-disabled="true"'}><span data-uf-value-text="sector">${esc(sectorLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="sector">
            <input class="uf-input" data-uf-search="sector" placeholder="${esc(ui.search)}" ${canSector ? "" : "disabled"} />
            <div class="uf-list" data-uf-list="sector">
              ${sectorOptions.map(o=>`<div class="uf-item" data-uf-item="sector" data-value="${esc(o.value)}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
        </div>

        <div class="uf-field" data-uf-field="metier">
          <label class="uf-label">${esc(ui.metier)}</label>
          <div class="uf-pill" data-uf-pill="metier" ${canMetier ? "" : 'aria-disabled="true"'}><span data-uf-value-text="metier">${esc(jobLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop" data-uf-pop="metier">
            <input class="uf-input" data-uf-search="metier" placeholder="${esc(ui.search)}" ${canMetier ? "" : "disabled"} />
            <div class="uf-list" data-uf-list="metier">
              ${jobOptions.slice(0, 900).map(o=>`<div class="uf-item" data-uf-item="metier" data-value="${esc(o.value)}">${esc(o.label)}</div>`).join("")}
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
    closeAll(root);
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
    root.querySelectorAll(`[data-uf-item="${type}"]`).forEach(el => {
      const txt = lower(norm(el.textContent || ""));
      el.style.display = !qq || txt.includes(qq) ? "" : "none";
    });
  }

  // ---------------------------
  // Capture shield
  // ---------------------------
  function installCaptureShield(mount, state) {
    const handler = (e) => {
      const root = mount.querySelector("[data-uf-root='1']");
      if (!root) return;

      const target = e.target;
      const inBar = target && target.closest && target.closest("#ulydia-metier-filters");
      if (!inBar) return;

      // Let scrolling work inside lists and popups:
      const inList = target.closest && target.closest(".uf-list");
      const inPop  = target.closest && target.closest(".uf-pop");

      // Always stop other scripts from hijacking our area:
      try { e.stopImmediatePropagation(); } catch(_) { try { e.stopPropagation(); } catch(e2){} }

      // Do NOT preventDefault for wheel or for pointerdown within scrollable list,
      // so scrollbar drag & scrolling works naturally.
      const typeEv = e.type;
      const isScrollEvent = typeEv === "wheel";
      const isPointerDown = typeEv === "pointerdown" || typeEv === "mousedown" || typeEv === "touchstart";
      if (!(isScrollEvent || (inList && isPointerDown))) {
        try { e.preventDefault(); } catch(_) {}
      }

      // Wheel: allow default scroll, just stop propagation
      if (isScrollEvent) return;

      // Pill click
      const pill = target.closest ? target.closest("[data-uf-pill]") : null;
      if (pill) {
        const type = pill.getAttribute("data-uf-pill");
        if (pill.getAttribute("aria-disabled") === "true") return;
        const pop = root.querySelector(`[data-uf-pop="${type}"]`);
        const isOpen = pop && pop.classList.contains("open");
        if (isOpen) closeAll(root);
        else openPop(root, type);
        return;
      }

      // Item click
      const item = target.closest ? target.closest("[data-uf-item]") : null;
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

      // Search input typing
      const search = target.closest ? target.closest("[data-uf-search]") : null;
      if (search) {
        const type = search.getAttribute("data-uf-search");
        setTimeout(() => filterList(root, type, search.value || ""), 0);
        return;
      }

      // Go button
      const go = target.closest ? target.closest("[data-uf-go]") : null;
      if (go) {
        if (!state.country || !state.metier) return;
        navigateTo(state.country, state.metier, state.sector);
        return;
      }

      // click on popup background does nothing; click elsewhere closes
      if (!inPop) closeAll(root);
    };

    ["pointerdown","mousedown","click","touchstart","wheel"].forEach(ev => {
      window.addEventListener(ev, handler, { capture: true, passive: ev === "wheel" });
    });

    window.addEventListener("keydown", (e) => {
      const inBar = e.target && e.target.closest && e.target.closest("#ulydia-metier-filters");
      if (!inBar) return;
      if (e.key === "Escape") {
        try { e.stopImmediatePropagation(); } catch(_) {}
        try { e.preventDefault(); } catch(_) {}
        const root = mount.querySelector("[data-uf-root='1']");
        if (root) closeAll(root);
      }
    }, { capture: true });
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    injectStyles();
    const mount = ensureMount();
    if (!mount) return;

    const qs = getQS();
    const state = { country: qs.country || "", sector: qs.sector || "", metier: qs.metier || "" };

    ensureMetiers();
    render(mount, state);
    installCaptureShield(mount, state);

    // Rerender a few times (Webflow list hydration)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const before = (window.__ULYDIA_FICHE_METIERS__||[]).length;
      if (!before) window.__ULYDIA_FICHE_METIERS__ = readMetiersFromDOM();
      render(mount, state);
      if (tries > 8) clearInterval(t);
    }, 700);

    log("patch10 ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
