/*!
 * ULYDIA — Filter Bar (CUSTOM DROPDOWNS + Correct DOM mapping)
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH8.CUSTOMDROPDOWN.DOMMAPPING.js
 *
 * Fixes:
 *  - No native <select> (your page has a global handler that breaks selects).
 *  - Custom dropdown + search for: Country / Sector / Metier.
 *  - Correct DOM mapping: slug is .js-metier-slug (per your HTML), not .js-fiche-slug.
 *
 * Data rules:
 *  - Choose a Country => determine final language from __ULYDIA_CATALOG__.countries[*].langue_finale.
 *  - Sector list is derived from metier items, using the sector field for that final language:
 *      .js-fiche-secteur-<lang> OR .js-metier-secteur-<lang>
 *  - Metier list is derived from DOM metier items, using title for that final language:
 *      .js-fiche-title-<lang> OR .js-metier-title-<lang> OR .js-metier-nom-<lang>
 *    Fallback: .js-metier-slug.
 *  - Navigation keeps sponsorship-per-country:
 *      /metier?metier=<slug>&country=<ISO>
 */
(() => {
  if (window.__ULYDIA_METIER_FILTERS_PATCH8__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH8__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[ULYDIA:filters]", ...a);

  const norm  = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();
  const esc = (s) => String(s || "").replace(/[&<>"]/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[ch]));

  const LANGS = ["fr","en","de","es","it"];

  function slugify(s) {
    return lower(norm(s))
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"");
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
  // DOM reader for Metiers (your hidden export list)
  // ---------------------------
  function qText(root, sel) {
    const el = root.querySelector(sel);
    return el ? norm(el.textContent || "") : "";
  }

  function findMetierItems() {
    // Your exports contain .js-metier-slug; use that to collect items reliably.
    const slugs = Array.from(document.querySelectorAll(".js-metier-slug"));
    const set = new Set();
    slugs.forEach(s => {
      const it = s.closest(".w-dyn-item") || s.closest("[data-ulydia-metier-item]") || s.parentElement;
      if (it) set.add(it);
    });
    // Fallback: older mapping
    if (!set.size) {
      const markers = Array.from(document.querySelectorAll(".js-fiche-secteur-fr,.js-fiche-secteur-en,.js-fiche-secteur-de,.js-fiche-secteur-es,.js-fiche-secteur-it"));
      markers.forEach(m => {
        const it = m.closest(".w-dyn-item") || m.closest("[data-ulydia-metier-item]") || m.parentElement;
        if (it) set.add(it);
      });
    }
    return Array.from(set);
  }

  function readMetiersFromDOM() {
    const items = findMetierItems();
    const out = [];
    items.forEach(item => {
      const slug = qText(item, ".js-metier-slug") || qText(item, ".js-fiche-slug") || "";
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

      // generic fallbacks if you have them
      const titleAny = qText(item, ".js-metier-title") || qText(item, ".js-fiche-title") || qText(item, ".js-metier-name") || "";
      if (titleAny) LANGS.forEach(l => { if (!titles[l]) titles[l] = titleAny; });

      out.push({ slug, titles, sectors });
    });

    // dedupe
    const seen = new Set();
    return out.filter(m => (seen.has(m.slug) ? false : (seen.add(m.slug), true)));
  }

  function ensureMetiers() {
    // cache
    if (Array.isArray(window.__ULYDIA_FICHE_METIERS__) && window.__ULYDIA_FICHE_METIERS__.length) return window.__ULYDIA_FICHE_METIERS__;
    const m = readMetiersFromDOM();
    window.__ULYDIA_FICHE_METIERS__ = m;
    return m;
  }

  // ---------------------------
  // UI strings
  // ---------------------------
  const UI = {
    fr: { country:"Pays", sector:"Secteur d’activité", metier:"Métier", search:"Rechercher…", choose:"Choisir", go:"Voir la fiche" },
    en: { country:"Country", sector:"Industry sector", metier:"Job", search:"Search…", choose:"Choose", go:"Open" },
    de: { country:"Land", sector:"Branche", metier:"Beruf", search:"Suchen…", choose:"Wählen", go:"Öffnen" },
    es: { country:"País", sector:"Sector", metier:"Profesión", search:"Buscar…", choose:"Elegir", go:"Abrir" },
    it: { country:"Paese", sector:"Settore", metier:"Mestiere", search:"Cerca…", choose:"Scegli", go:"Apri" },
  };

  // ---------------------------
  // Styles (fits your fiche look)
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
      .uf-label{ display:block; font-size:12px; font-weight:700; margin:0 0 8px; color: rgba(17,24,39,.85); }
      .uf-input{
        width:100%; height:44px; border-radius:14px;
        border: 1px solid rgba(17,24,39,.12);
        padding: 0 12px; outline:none; background:#fff;
        font-family:inherit; font-size:15px;
      }
      .uf-input:focus{
        border-color: rgba(107,78,255,.55);
        box-shadow: 0 0 0 4px rgba(107,78,255,.14);
      }
      .uf-pill{
        height:44px; display:flex; align-items:center; justify-content:space-between;
        border-radius:14px; border: 1px solid rgba(17,24,39,.12);
        padding: 0 12px; background:#fff; cursor:pointer;
        user-select:none;
      }
      .uf-pill span{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .uf-caret{ margin-left:10px; opacity:.7; }
      .uf-btn{
        height:44px; border-radius:14px; border:none;
        padding:0 18px; cursor:pointer;
        background: var(--ulydia-primary, #6b4eff);
        color:#fff; font-weight:800; font-family:inherit; font-size:15px;
        box-shadow: 0 10px 18px rgba(107,78,255,.25);
      }
      .uf-btn:disabled{ opacity:.55; cursor:not-allowed; box-shadow:none; }
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
      .uf-list{
        margin-top:10px;
        max-height: 280px;
        overflow:auto;
      }
      .uf-item{
        padding:10px 10px;
        border-radius:12px;
        cursor:pointer;
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
  // Mount before root
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

    const sectorMap = new Map();
    metiers.forEach(m => {
      const label = norm(m?.sectors?.[finalLang] || "");
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
        const label = norm(m?.sectors?.[finalLang] || "");
        return label && slugify(label) === state.sector;
      })
      .map(m => ({ value: m.slug, label: norm(m?.titles?.[finalLang] || m.slug) }))
      .filter(o => o.value)
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    return { countryOptions, sectorOptions, jobOptions, finalLang };
  }

  // ---------------------------
  // Custom dropdown renderer/wiring
  // ---------------------------
  function render(mount, state) {
    const { countryOptions, sectorOptions, jobOptions, finalLang } = buildOptions(state);
    const ui = UI[finalLang] || UI.fr;

    // labels shown
    const countryLabel = state.country ? (countryOptions.find(o=>o.value===state.country)?.label || state.country) : ui.choose;
    const sectorLabel  = state.sector  ? (sectorOptions.find(o=>o.value===state.sector)?.label || state.sector) : ui.choose;
    const jobLabel     = state.metier  ? (jobOptions.find(o=>o.value===state.metier)?.label || state.metier) : ui.choose;

    const canSector = !!state.country && sectorOptions.length > 0;
    const canMetier = !!state.country && jobOptions.length > 0;

    const hintParts = [];
    const metiersCount = (window.__ULYDIA_FICHE_METIERS__||[]).length;
    if (!metiersCount) hintParts.push("⚠️ aucun métier trouvé dans le DOM (vérifie la liste cachée et .js-metier-slug)");
    if (state.country && !sectorOptions.length) hintParts.push("⚠️ aucun secteur détecté pour cette langue");
    const hint = hintParts.length ? `<div class="uf-muted">${esc(hintParts.join(" — "))}</div>` : "";

    mount.innerHTML = `
      <div class="uf-bar" id="uf-bar">
        <div class="uf-field" data-uf="country">
          <label class="uf-label">${esc(ui.country)}</label>
          <div class="uf-pill" tabindex="0"><span>${esc(countryLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop">
            <input class="uf-input" placeholder="${esc(ui.search)}" />
            <div class="uf-list">
              ${countryOptions.map(o=>`<div class="uf-item" data-value="${esc(o.value)}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
          ${state.country ? `<div class="uf-muted">ISO: ${esc(state.country)} — langue: ${esc(finalLang)}</div>` : ``}
        </div>

        <div class="uf-field" data-uf="sector">
          <label class="uf-label">${esc(ui.sector)}</label>
          <div class="uf-pill" tabindex="0" ${canSector ? "" : 'aria-disabled="true" style="opacity:.55;cursor:not-allowed;"'}><span>${esc(sectorLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop">
            <input class="uf-input" placeholder="${esc(ui.search)}" ${canSector ? "" : "disabled"} />
            <div class="uf-list">
              ${sectorOptions.map(o=>`<div class="uf-item" data-value="${esc(o.value)}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
        </div>

        <div class="uf-field" data-uf="metier">
          <label class="uf-label">${esc(ui.metier)}</label>
          <div class="uf-pill" tabindex="0" ${canMetier ? "" : 'aria-disabled="true" style="opacity:.55;cursor:not-allowed;"'}><span>${esc(jobLabel)}</span><span class="uf-caret">▾</span></div>
          <div class="uf-pop">
            <input class="uf-input" placeholder="${esc(ui.search)}" ${canMetier ? "" : "disabled"} />
            <div class="uf-list">
              ${jobOptions.slice(0, 600).map(o=>`<div class="uf-item" data-value="${esc(o.value)}">${esc(o.label)}</div>`).join("")}
            </div>
          </div>
          ${hint}
        </div>

        <div class="uf-actions">
          <button class="uf-btn" id="uf-go" ${state.country && state.metier ? "" : "disabled"}>${esc(ui.go)}</button>
        </div>
      </div>
    `;

    wire(mount, state);
    log("render", { finalLang, counts: { countries: countryOptions.length, sectors: sectorOptions.length, jobs: jobOptions.length, metiersDom: metiersCount } });
  }

  function closeAll(mount) {
    mount.querySelectorAll(".uf-pop.open").forEach(p => p.classList.remove("open"));
  }

  function wire(mount, state) {
    // isolate events from global handlers
    const bar = mount.querySelector("#uf-bar");
    if (bar) {
      ["pointerdown","mousedown","mouseup","click","touchstart","touchend"].forEach(ev => {
        bar.addEventListener(ev, (e)=> e.stopPropagation(), { capture:true });
      });
    }

    // Dropdown behavior for each field
    mount.querySelectorAll('[data-uf]').forEach(field => {
      const pill = field.querySelector(".uf-pill");
      const pop  = field.querySelector(".uf-pop");
      const input= field.querySelector(".uf-pop .uf-input");
      const list = field.querySelector(".uf-list");
      const disabled = pill && pill.getAttribute("aria-disabled")==="true";

      if (!pill || !pop || !input || !list) return;

      pill.addEventListener("click", () => {
        if (disabled) return;
        const isOpen = pop.classList.contains("open");
        closeAll(mount);
        if (!isOpen) {
          pop.classList.add("open");
          input.value = "";
          input.focus();
          filterList(list, "", field.getAttribute("data-uf"));
        }
      });

      input.addEventListener("input", () => {
        filterList(list, input.value || "", field.getAttribute("data-uf"));
      });

      list.addEventListener("click", (e) => {
        const it = e.target.closest(".uf-item");
        if (!it) return;
        const value = it.getAttribute("data-value") || "";
        const type = field.getAttribute("data-uf");
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
        closeAll(mount);
        render(mount, state);
      });
    });

    // click outside closes
    document.addEventListener("click", () => closeAll(mount), { once:true });

    // Go button
    const go = mount.querySelector("#uf-go");
    if (go) {
      go.addEventListener("click", () => {
        if (!state.country || !state.metier) return;
        navigateTo(state.country, state.metier, state.sector);
      });
    }
  }

  function filterList(list, q) {
    const qq = lower(norm(q));
    list.querySelectorAll(".uf-item").forEach(el => {
      const txt = lower(norm(el.textContent || ""));
      el.style.display = !qq || txt.includes(qq) ? "" : "none";
    });
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

    // initial read + render
    ensureMetiers();
    render(mount, state);

    // rerender a few times because Webflow hidden lists may populate late
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const before = (window.__ULYDIA_FICHE_METIERS__||[]).length;
      if (!before) window.__ULYDIA_FICHE_METIERS__ = readMetiersFromDOM();
      render(mount, state);
      if (tries > 10) clearInterval(t);
    }, 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
