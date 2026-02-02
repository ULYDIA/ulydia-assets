/*!
 * ULYDIA — Metier Filter Bar (UX FIX + Design)
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH5.UXDESIGN.js
 *
 * Fixes:
 *  - Some pages have global mouse handlers (drag/anti-select) that make <select> require "holding" mouse.
 *    => We stop propagation on pointer/mouse events for the filter bar controls.
 *  - Ensure the dropdown isn't clipped/hidden by parents:
 *    => high z-index, no overflow clipping on the bar.
 *  - Better design aligned with the fiche metier cards (soft violet surface, spacing, typography).
 *
 * Data behavior:
 *  - Same as PATCH4 (countries from __ULYDIA_CATALOG__.countries, sectors/metiers from exports).
 */
(() => {
  if (window.__ULYDIA_METIER_FILTERS_PATCH5__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH5__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[ULYDIA:filters]", ...a);

  const norm  = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();

  const escHtml = (s) =>
    String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const escAttr = (s) => String(s || "").replace(/"/g, "&quot;");

  function pickField(obj, keys) {
    for (const k of keys) {
      if (!obj) continue;
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  }
  function pickWindowArray(keys) {
    for (const k of keys) {
      const v = window[k];
      if (Array.isArray(v) && v.length) return v;
    }
    return null;
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
  // Data
  // ---------------------------
  function getCountries() {
    const cat = window.__ULYDIA_CATALOG__;
    if (cat && Array.isArray(cat.countries) && cat.countries.length) return cat.countries;
    return pickWindowArray(["__ULYDIA_COUNTRIES__", "__ULYDIA_PAYS__", "__ULYDIA_COUNTRY_LIST__"]) || [];
  }
  function getSectors() {
    return pickWindowArray([
      "__ULYDIA_SECTEURS_ACTIVITE__",
      "__ULYDIA_SECTORS_ACTIVITY__",
      "__ULYDIA_SECTEURS__",
      "__ULYDIA_SECTORS__",
      "__ULYDIA_SECTEURS_ACTIVITE_LIST__",
      "__ULYDIA_SECTEUR_ACTIVITE__"
    ]) || [];
  }
  function getMetiers() {
    return pickWindowArray([
      "__ULYDIA_FICHE_METIERS__",
      "__ULYDIA_METIERS__",
      "__ULYDIA_JOBS__",
      "__ULYDIA_METIER_LIST__"
    ]) || [];
  }

  // ---------------------------
  // Fields
  // ---------------------------
  function countryIso(c) { return upper(pickField(c, ["iso", "code", "alpha2", "country_iso", "country", "value"])); }
  function countryFinalLang(c) { return lower(pickField(c, ["langue_finale", "final_lang", "default_lang", "lang", "language"])); }
  function countryLabelByLang(c, lang) {
    const v =
      pickField(c, [`label_${lang}`, `name_${lang}`, `title_${lang}`]) ||
      pickField(c, ["label", "name", "title"]) ||
      countryIso(c);
    return norm(v);
  }

  function sectorId(s) { return norm(pickField(s, ["id", "_id"])); }
  function sectorSlug(s){ return norm(pickField(s, ["slug", "sector_slug", "value"])); }
  function sectorNameByLang(s, lang){
    const v =
      pickField(s, [`name_${lang}`, `label_${lang}`, `title_${lang}`]) ||
      pickField(s, ["name", "label", "title"]) ||
      sectorSlug(s) || sectorId(s);
    return norm(v);
  }

  function metierSlug(m){ return norm(pickField(m, ["slug", "metier_slug", "job_slug", "value"])); }
  function metierNameByLang(m, lang){
    const v =
      pickField(m, [`name_${lang}`, `label_${lang}`, `title_${lang}`]) ||
      pickField(m, ["name", "label", "title"]) ||
      metierSlug(m);
    return norm(v);
  }
  function metierCountryIso(m){ return upper(pickField(m, ["country_iso", "countryIso", "country", "iso", "pays_iso", "pays", "country_code"])); }
  function metierSectorKey(m){
    const slug = norm(pickField(m, ["sector_slug","secteur_slug","sector","secteur","secteur_activite_slug"]));
    if (slug) return { type:"slug", value: slug };
    const id = norm(pickField(m, ["sector_id","secteur_activite_id","secteur_activite","sector_activity","sectorId","sector_ref","sectorRef"]));
    if (id) return { type:"id", value: id };
    const refObj = m && (m.secteur_activite_obj || m.sector_activity_obj || m.sectorObj || m.secteurActivite);
    if (refObj){
      const id2 = norm(pickField(refObj, ["id","_id"]));
      if (id2) return { type:"id", value: id2 };
      const slug2 = norm(pickField(refObj, ["slug"]));
      if (slug2) return { type:"slug", value: slug2 };
    }
    return null;
  }

  function buildSectorIdx(sectors){
    const bySlug = new Map();
    const byId = new Map();
    (sectors||[]).forEach(s=>{
      const sl = sectorSlug(s);
      const id = sectorId(s);
      if (sl) bySlug.set(sl, s);
      if (id) byId.set(id, s);
    });
    return { bySlug, byId };
  }
  function resolveSectorSlugForMetier(m, idx){
    const key = metierSectorKey(m);
    if (!key) return "";
    if (key.type==="slug") return norm(key.value);
    if (key.type==="id"){
      const s = idx.byId.get(key.value);
      return s ? sectorSlug(s) : "";
    }
    return "";
  }

  // ---------------------------
  // UI labels (based on selected country's final lang)
  // ---------------------------
  const UI = {
    fr: { country: "Pays", sector: "Secteur d’activité", metier: "Métier", choose: "Choisir…", type: "Rechercher un métier…", go: "Voir la fiche" },
    en: { country: "Country", sector: "Industry sector", metier: "Job", choose: "Choose…", type: "Search a job…", go: "Open" },
    de: { country: "Land", sector: "Branche", metier: "Beruf", choose: "Wählen…", type: "Beruf suchen…", go: "Öffnen" },
    es: { country: "País", sector: "Sector", metier: "Profesión", choose: "Elegir…", type: "Buscar profesión…", go: "Abrir" },
    it: { country: "Paese", sector: "Settore", metier: "Mestiere", choose: "Scegli…", type: "Cerca un mestiere…", go: "Apri" },
  };

  // ---------------------------
  // Styles — closer to fiche metier (soft violet surface)
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
        z-index: 9999; /* keep dropdown usable */
        overflow: visible;
      }
      .ulydia-filter{
        min-width:220px;
        flex: 1 1 220px;
      }
      .ulydia-filter-actions{
        min-width:160px;
        flex: 0 0 auto;
      }
      .ulydia-filter-label{
        display:block;
        font-size:12px;
        font-weight:600;
        margin:0 0 8px;
        color: rgba(17,24,39,.85);
      }
      .ulydia-filter-row{
        display:flex; gap:12px; align-items:center;
      }
      .ulydia-filter-select,.ulydia-filter-input{
        width:100%;
        height:44px;
        border-radius:14px;
        border: 1px solid rgba(17,24,39,.12);
        padding: 0 12px;
        outline:none;
        background: #fff;
        font-family: inherit;
        font-size: 15px;
      }
      .ulydia-filter-select:focus,.ulydia-filter-input:focus{
        border-color: rgba(107,78,255,.55);
        box-shadow: 0 0 0 4px rgba(107,78,255,.14);
      }
      .ulydia-filter-select:disabled,.ulydia-filter-input:disabled{ opacity:.55; cursor:not-allowed; }
      .ulydia-filter-btn{
        height:44px;
        border-radius:14px;
        border:none;
        padding: 0 18px;
        cursor:pointer;
        background: var(--ulydia-primary, #6b4eff);
        color:#fff;
        font-weight:700;
        font-family: inherit;
        font-size: 15px;
        box-shadow: 0 10px 18px rgba(107,78,255,.25);
      }
      .ulydia-filter-btn:disabled{ opacity:.55; cursor:not-allowed; box-shadow:none; }
      .ulydia-filter-hint{
        font-size:11px;
        margin-top:8px;
        opacity:.75;
        color: rgba(17,24,39,.75);
      }
      @media (max-width: 860px){
        .ulydia-filter{ min-width: 200px; }
      }
      @media (max-width: 640px){
        .ulydia-filter-actions{ width:100%; }
        .ulydia-filter-btn{ width:100%; }
      }
    `;
    document.head.appendChild(st);
  }

  // ---------------------------
  // Mount (before root)
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
  // Autocomplete helper
  // ---------------------------
  function resolveSlugFromLabel(label, suggestions){
    const v = norm(label);
    if (!v) return "";
    const exact = suggestions.find(s => norm(s.label).toLowerCase() === v.toLowerCase());
    if (exact) return exact.slug;
    const bySlug = suggestions.find(s => s.slug === v);
    if (bySlug) return bySlug.slug;
    return "";
  }

  // ---------------------------
  // Event isolation (fix "must hold mouse")
  // ---------------------------
  function isolateControlEvents(container){
    // Some global handlers might be on document/body capturing mousedown/mouseup and breaking native select.
    const stop = (e) => {
      e.stopPropagation();
      // do NOT preventDefault (native select needs default behavior)
    };

    const events = ["pointerdown","pointerup","mousedown","mouseup","click","touchstart","touchend"];
    const controls = container.querySelectorAll("select,input,button,label");
    controls.forEach(el => {
      events.forEach(ev => el.addEventListener(ev, stop, { capture: true }));
    });

    // Also stop on the bar itself (capture) for safety
    events.forEach(ev => container.addEventListener(ev, stop, { capture: true }));
  }

  // ---------------------------
  // Render
  // ---------------------------
  function render(mount, state){
    const countries = getCountries();
    const sectors = getSectors();
    const metiers = getMetiers();

    const cObj = state.country ? countries.find(c => countryIso(c) === state.country) : null;
    const finalLang = cObj ? (countryFinalLang(cObj) || "fr") : "fr";
    const ui = UI[finalLang] || UI.fr;

    const countryOptions = (countries||[])
      .map(c => {
        const iso = countryIso(c);
        const lang = countryFinalLang(c) || "fr";
        return { iso, label: countryLabelByLang(c, lang) || iso, lang };
      })
      .filter(x => x.iso)
      .sort((a,b) => a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    const sectorIdx = buildSectorIdx(sectors);
    const metiersByCountry = state.country ? metiers.filter(m => metierCountryIso(m) === state.country) : [];

    const availSectorSlugs = new Set();
    metiersByCountry.forEach(m=>{
      const slug = resolveSectorSlugForMetier(m, sectorIdx) || norm(pickField(m, ["sector_slug","secteur_slug","sector"]));
      if (slug) availSectorSlugs.add(slug);
    });

    const sectorOptions = (state.country ? sectors.filter(s => availSectorSlugs.has(sectorSlug(s))) : [])
      .map(s => ({ value: sectorSlug(s), label: sectorNameByLang(s, finalLang) }))
      .filter(o => o.value)
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    const metiersFiltered = metiersByCountry.filter(m=>{
      if (!state.sector) return true;
      const sSlug = resolveSectorSlugForMetier(m, sectorIdx) || norm(pickField(m, ["sector_slug","secteur_slug","sector"]));
      return sSlug && norm(sSlug) === norm(state.sector);
    });

    const suggestions = metiersFiltered
      .map(m => ({ slug: metierSlug(m), label: metierNameByLang(m, finalLang) }))
      .filter(x => x.slug)
      .sort((a,b)=> a.label.localeCompare(b.label, undefined, { sensitivity:"base" }));

    const datalistId = "ulydia-metier-datalist";
    const canGo = !!(state.country && state.metier_slug);

    const hint = [];
    if (!sectors.length) hint.push("⚠️ secteurs non chargés");
    if (!metiers.length) hint.push("⚠️ métiers non chargés");
    const hintHtml = hint.length ? `<div class="ulydia-filter-hint">${escHtml(hint.join(" — "))}</div>` : "";

    mount.innerHTML = `
      <div class="ulydia-filterbar" id="ulydia-filterbar">
        <div class="ulydia-filter">
          <label class="ulydia-filter-label" for="ulydia-filter-country">${escHtml(ui.country)}</label>
          <select id="ulydia-filter-country" class="ulydia-filter-select">
            <option value="">${escHtml(ui.choose)}</option>
            ${countryOptions.map(o=>`
              <option value="${escAttr(o.iso)}" ${o.iso===state.country?"selected":""}>${escHtml(o.label)}</option>
            `).join("")}
          </select>
          ${state.country ? `<div class="ulydia-filter-hint">langue: ${escHtml(finalLang)}</div>` : ``}
        </div>

        <div class="ulydia-filter">
          <label class="ulydia-filter-label" for="ulydia-filter-sector">${escHtml(ui.sector)}</label>
          <select id="ulydia-filter-sector" class="ulydia-filter-select" ${(!state.country || !sectors.length) ? "disabled":""}>
            <option value="">${escHtml(ui.choose)}</option>
            ${sectorOptions.map(o=>`
              <option value="${escAttr(o.value)}" ${o.value===state.sector?"selected":""}>${escHtml(o.label)}</option>
            `).join("")}
          </select>
        </div>

        <div class="ulydia-filter">
          <label class="ulydia-filter-label" for="ulydia-filter-metier-input">${escHtml(ui.metier)}</label>
          <input id="ulydia-filter-metier-input"
                 class="ulydia-filter-input"
                 ${(!state.country || !metiers.length) ? "disabled":""}
                 list="${escAttr(datalistId)}"
                 placeholder="${escAttr(ui.type)}"
                 value="${escAttr(state.metier_label || "")}" />
          <datalist id="${escAttr(datalistId)}">
            ${suggestions.slice(0, 300).map(s=>`
              <option value="${escAttr(s.label)}" data-slug="${escAttr(s.slug)}"></option>
            `).join("")}
          </datalist>
          ${hintHtml}
        </div>

        <div class="ulydia-filter ulydia-filter-actions">
          <button id="ulydia-filter-go" class="ulydia-filter-btn" ${canGo ? "" : "disabled"}>${escHtml(ui.go)}</button>
        </div>
      </div>
    `;

    const bar = mount.querySelector("#ulydia-filterbar");
    if (bar) isolateControlEvents(bar);
    wire(mount, state, suggestions);

    log("counts", { countries: countries.length, sectors: sectors.length, metiers: metiers.length, suggestions: suggestions.length });
  }

  function wire(mount, state, suggestions){
    const elCountry = mount.querySelector("#ulydia-filter-country");
    const elSector  = mount.querySelector("#ulydia-filter-sector");
    const elInput   = mount.querySelector("#ulydia-filter-metier-input");
    const elGo      = mount.querySelector("#ulydia-filter-go");
    if (!elCountry || !elSector || !elInput || !elGo) return;

    elCountry.addEventListener("change", ()=>{
      state.country = upper(elCountry.value || "");
      state.sector = "";
      state.metier_slug = "";
      state.metier_label = "";
      render(mount, state);
    });

    elSector.addEventListener("change", ()=>{
      state.sector = norm(elSector.value || "");
      state.metier_slug = "";
      state.metier_label = "";
      render(mount, state);
    });

    const onInput = ()=>{
      state.metier_label = elInput.value || "";
      state.metier_slug = resolveSlugFromLabel(state.metier_label, suggestions || []);
      elGo.disabled = !(state.country && state.metier_slug);
    };
    elInput.addEventListener("input", onInput);
    elInput.addEventListener("change", onInput);
    elInput.addEventListener("keydown", (e)=>{
      if (e.key === "Enter"){
        onInput();
        if (state.country && state.metier_slug){
          e.preventDefault();
          navigateTo(state.country, state.metier_slug, state.sector);
        }
      }
    });

    elGo.addEventListener("click", ()=>{
      onInput();
      if (!state.country || !state.metier_slug) return;
      navigateTo(state.country, state.metier_slug, state.sector);
    });
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function bootWithRoot(rootEl){
    injectStyles();
    const mount = ensureMountBeforeRoot(rootEl);

    const qs = getQS();
    const state = { country: qs.country || "", sector: qs.sector || "", metier_slug: qs.metier || "", metier_label: "" };

    // prefill label
    try{
      const countries = getCountries();
      const cObj = state.country ? countries.find(c => countryIso(c) === state.country) : null;
      const lang = cObj ? (countryFinalLang(cObj) || "fr") : "fr";
      const metiers = getMetiers();
      const mObj = state.metier_slug ? metiers.find(m => metierSlug(m) === state.metier_slug && (!state.country || metierCountryIso(m) === state.country)) : null;
      if (mObj) state.metier_label = metierNameByLang(mObj, lang);
    }catch(e){}

    render(mount, state);

    // rerender in case exports load after
    let tries = 0;
    const timer = setInterval(()=>{
      tries++;
      render(mount, state);
      if (tries > 8) clearInterval(timer);
    }, 800);
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
