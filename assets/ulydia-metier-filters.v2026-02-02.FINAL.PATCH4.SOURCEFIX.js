/*!
 * ULYDIA — Metier Filter Bar (Pays / Secteur / Métier + Autocomplete)
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH4.SOURCEFIX.js
 *
 * Why PATCH4:
 *  - Your window.__ULYDIA_CATALOG__ currently contains ONLY: { generated_at, count, countries }
 *  - So sectors/metiers must come from other exports (hidden Webflow lists) or other globals.
 *
 * PATCH4 changes:
 *  - Countries: still from __ULYDIA_CATALOG__.countries (preferred)
 *  - Sectors: tries many globals:
 *      __ULYDIA_SECTEURS_ACTIVITE__ | __ULYDIA_SECTORS_ACTIVITY__ | __ULYDIA_SECTEURS__ | __ULYDIA_SECTORS__
 *      __ULYDIA_SECTEURS_ACTIVITE_LIST__ | __ULYDIA_SECTEUR_ACTIVITE__
 *  - Metiers: tries many globals, including the one seen in your console:
 *      __ULYDIA_FICHE_METIERS__ | __ULYDIA_METIERS__ | __ULYDIA_JOBS__ | __ULYDIA_METIER_LIST__
 *
 *  - If sectors or metiers are missing, the UI still shows (with a hint) and logs what keys were found.
 *  - Injects BEFORE #ulydia-metier-root (safe vs mono overwrites).
 */
(() => {
  if (window.__ULYDIA_METIER_FILTERS_PATCH4__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH4__ = true;

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
  // QS
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
  // Data getters
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
  // Country fields
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

  // ---------------------------
  // Sector fields
  // ---------------------------
  function sectorId(s) { return norm(pickField(s, ["id", "_id"])); }
  function sectorSlug(s){ return norm(pickField(s, ["slug", "sector_slug", "value"])); }
  function sectorNameByLang(s, lang){
    const v =
      pickField(s, [`name_${lang}`, `label_${lang}`, `title_${lang}`]) ||
      pickField(s, ["name", "label", "title"]) ||
      sectorSlug(s) || sectorId(s);
    return norm(v);
  }

  // ---------------------------
  // Metier fields
  // ---------------------------
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
  // UI text (based on selected country's final lang)
  // ---------------------------
  const UI = {
    fr: { country: "Pays", sector: "Secteur d’activité", metier: "Métier", choose: "Choisir…", type: "Saisir un métier…", go: "Voir la fiche" },
    en: { country: "Country", sector: "Industry sector", metier: "Job", choose: "Choose…", type: "Type a job…", go: "Open" },
    de: { country: "Land", sector: "Branche", metier: "Beruf", choose: "Wählen…", type: "Beruf eingeben…", go: "Öffnen" },
    es: { country: "País", sector: "Sector", metier: "Profesión", choose: "Elegir…", type: "Escribe un oficio…", go: "Abrir" },
    it: { country: "Paese", sector: "Settore", metier: "Mestiere", choose: "Scegli…", type: "Scrivi un mestiere…", go: "Apri" },
  };

  // ---------------------------
  // Styles
  // ---------------------------
  function injectStyles(){
    if (document.getElementById("ulydia-metier-filters-style")) return;
    const st = document.createElement("style");
    st.id = "ulydia-metier-filters-style";
    st.textContent = `
      #ulydia-metier-filters{ width:100%; }
      .ulydia-filterbar{
        display:flex; flex-wrap:wrap; gap:12px;
        padding:12px; margin:12px 0 18px;
        border-radius:16px;
        background: var(--ulydia-surface, #fff);
        box-shadow: 0 10px 24px rgba(0,0,0,.07);
        align-items:flex-end;
        position:relative; z-index:5;
      }
      .ulydia-filter{ min-width:180px; flex:1 1 180px; }
      .ulydia-filter-actions{ min-width:140px; flex:0 0 auto; }
      .ulydia-filter-label{ display:block; font-size:12px; margin:0 0 6px; color: var(--ulydia-muted, rgba(0,0,0,.65)); }
      .ulydia-filter-select,.ulydia-filter-input{
        width:100%; height:40px; border-radius:12px;
        border:1px solid rgba(0,0,0,.14);
        padding:0 10px; outline:none; background:#fff;
        font-family:inherit;
      }
      .ulydia-filter-select:disabled,.ulydia-filter-input:disabled{ opacity:.55; cursor:not-allowed; }
      .ulydia-filter-btn{
        height:40px; border-radius:12px; border:none;
        padding:0 14px; cursor:pointer;
        background: var(--ulydia-primary, #6b4eff);
        color:#fff; font-weight:600; font-family:inherit;
      }
      .ulydia-filter-btn:disabled{ opacity:.55; cursor:not-allowed; }
      .ulydia-filter-hint{ font-size:11px; margin-top:6px; opacity:.7; }
      @media (max-width: 640px){
        .ulydia-filter-actions{ width:100%; }
        .ulydia-filter-btn{ width:100%; }
      }
    `;
    document.head.appendChild(st);
  }

  // ---------------------------
  // Mount before root
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
  // Autocomplete
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
    if (!sectors.length) hint.push("⚠️ secteurs manquants (exports Webflow)");
    if (!metiers.length) hint.push("⚠️ métiers manquants (exports Webflow)");
    const hintHtml = hint.length ? `<div class="ulydia-filter-hint">${escHtml(hint.join(" — "))}</div>` : "";

    mount.innerHTML = `
      <div class="ulydia-filterbar">
        <div class="ulydia-filter">
          <label class="ulydia-filter-label">${escHtml(ui.country)}</label>
          <select id="ulydia-filter-country" class="ulydia-filter-select">
            <option value="">${escHtml(ui.choose)}</option>
            ${countryOptions.map(o=>`
              <option value="${escAttr(o.iso)}" ${o.iso===state.country?"selected":""}>${escHtml(o.label)}</option>
            `).join("")}
          </select>
          ${state.country ? `<div class="ulydia-filter-hint">langue: ${escHtml(finalLang)}</div>` : ``}
        </div>

        <div class="ulydia-filter">
          <label class="ulydia-filter-label">${escHtml(ui.sector)}</label>
          <select id="ulydia-filter-sector" class="ulydia-filter-select" ${(!state.country || !sectors.length) ? "disabled":""}>
            <option value="">${escHtml(ui.choose)}</option>
            ${sectorOptions.map(o=>`
              <option value="${escAttr(o.value)}" ${o.value===state.sector?"selected":""}>${escHtml(o.label)}</option>
            `).join("")}
          </select>
        </div>

        <div class="ulydia-filter">
          <label class="ulydia-filter-label">${escHtml(ui.metier)}</label>
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

    wire(mount, state, suggestions);

    log("diagnostic", {
      catalogKeys: Object.keys(window.__ULYDIA_CATALOG__||{}),
      foundSectorsVar: [
        "__ULYDIA_SECTEURS_ACTIVITE__","__ULYDIA_SECTORS_ACTIVITY__","__ULYDIA_SECTEURS__","__ULYDIA_SECTORS__","__ULYDIA_SECTEURS_ACTIVITE_LIST__","__ULYDIA_SECTEUR_ACTIVITE__"
      ].filter(k => Array.isArray(window[k]) && window[k].length),
      foundMetiersVar: ["__ULYDIA_FICHE_METIERS__","__ULYDIA_METIERS__","__ULYDIA_JOBS__","__ULYDIA_METIER_LIST__"].filter(k=>Array.isArray(window[k])&&window[k].length),
      counts: { countries: countries.length, sectors: sectors.length, metiers: metiers.length, suggestions: suggestions.length }
    });
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
      if (tries > 10) clearInterval(timer);
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
