/*!
 * ULYDIA — Metier Filter Bar (Pays / Secteur / Métier)
 * File: ulydia-metier-filters.v2026-02-02.FINAL.PATCH1.js
 *
 * PATCH1 (fix "not visible"):
 *  - Do NOT inject inside #ulydia-metier-root (your mono JS can overwrite root.innerHTML).
 *  - Instead, inject a sibling block *BEFORE* #ulydia-metier-root.
 *  - Wait for the root to exist (poll + MutationObserver fallback).
 */
(() => {
  if (window.__ULYDIA_METIER_FILTERS_PATCH1__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[ULYDIA:filters]", ...a);

  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();

  const escHtml = (s) =>
    String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const escAttr = (s) => String(s || "").replace(/"/g, "&quot;");

  function getQS() {
    const p = new URLSearchParams(window.location.search);
    return {
      country: upper(p.get("country") || ""),
      metier: norm(p.get("metier") || ""),
      sector: norm(p.get("sector") || ""),
      lang: lower(p.get("lang") || "")
    };
  }

  function setQS(next) {
    const p = new URLSearchParams(window.location.search);
    Object.keys(next || {}).forEach((k) => {
      const v = next[k];
      if (v === null || v === undefined || v === "") p.delete(k);
      else p.set(k, String(v));
    });
    const url = `${window.location.pathname}?${p.toString()}`;
    window.location.href = url;
  }

  function pickWindowArray(keys) {
    for (const k of keys) {
      if (Array.isArray(window[k]) && window[k].length) return window[k];
    }
    return null;
  }

  function pickField(obj, keys) {
    for (const k of keys) {
      if (!obj) continue;
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  }

  function guessIso(c) {
    return upper(pickField(c, ["iso", "code", "alpha2", "country_iso", "country", "value"]));
  }

  function guessSectorKey(m) {
    const slug = norm(pickField(m, ["sector_slug", "sectorSlug", "sector", "secteur", "secteur_slug", "secteur_activite_slug"]));
    if (slug) return { type: "slug", value: slug };

    const id = norm(pickField(m, ["sector_id", "sectorId", "secteur_activite", "secteur_activite_id", "sector_activity", "sectorActivity", "sector_ref", "sectorRef"]));
    if (id) return { type: "id", value: id };

    const refObj = m && (m.secteur_activite_obj || m.sector_activity_obj || m.sectorObj);
    if (refObj) {
      const id2 = norm(pickField(refObj, ["id", "_id"]));
      if (id2) return { type: "id", value: id2 };
      const slug2 = norm(pickField(refObj, ["slug"]));
      if (slug2) return { type: "slug", value: slug2 };
    }
    return null;
  }

  function guessCountryIsoFromMetier(m) {
    return upper(pickField(m, ["country_iso", "countryIso", "country", "iso", "pays_iso", "pays", "country_code"]));
  }

  function guessMetierSlug(m) {
    return norm(pickField(m, ["slug", "metier_slug", "job_slug", "value"]));
  }

  function pickLocalized(item, baseKey, lang) {
    const lk = `${baseKey}_${lang}`;
    const v = pickField(item, [lk, baseKey, "name", "title", "label"]);
    return norm(v);
  }

  function guessLangFromCountry(countryIso, countries, qsLang) {
    if (qsLang) return qsLang;
    if (window.__ULYDIA_LANG__) return lower(window.__ULYDIA_LANG__);
    if (window.ULYDIA_LANG) return lower(window.ULYDIA_LANG);

    if (countryIso && Array.isArray(countries)) {
      const c = countries.find(x => guessIso(x) === countryIso);
      const dl = lower(pickField(c, ["default_lang", "defaultLang", "lang", "language"]));
      if (dl) return dl;
    }
    return "fr";
  }

  const UI_TXT = {
    fr: { country: "Pays", sector: "Secteur d’activité", metier: "Métier", choose: "Choisir…", go: "Voir la fiche" },
    en: { country: "Country", sector: "Industry sector", metier: "Job", choose: "Choose…", go: "Open" },
    de: { country: "Land", sector: "Branche", metier: "Beruf", choose: "Wählen…", go: "Öffnen" },
    es: { country: "País", sector: "Sector", metier: "Profesión", choose: "Elegir…", go: "Abrir" },
    it: { country: "Paese", sector: "Settore", metier: "Mestiere", choose: "Scegli…", go: "Apri" }
  };

  // Data (Option A exports)
  const countries = pickWindowArray(["__ULYDIA_COUNTRIES__", "__ULYDIA_PAYS__", "__ULYDIA_COUNTRY_LIST__"]) || [];
  const sectors   = pickWindowArray(["__ULYDIA_SECTEURS_ACTIVITE__", "__ULYDIA_SECTEURS__", "__ULYDIA_SECTORS__"]) || [];
  const metiers   = pickWindowArray(["__ULYDIA_METIERS__", "__ULYDIA_JOBS__", "__ULYDIA_METIER_LIST__"]) || [];

  // If metiers not ready at first paint, we still mount UI and rerender once they appear
  function hasDataReady() {
    const m = pickWindowArray(["__ULYDIA_METIERS__", "__ULYDIA_JOBS__", "__ULYDIA_METIER_LIST__"]);
    return Array.isArray(m) && m.length;
  }

  // Styles
  function injectStyles() {
    if (document.getElementById("ulydia-metier-filters-style")) return;
    const st = document.createElement("style");
    st.id = "ulydia-metier-filters-style";
    st.textContent = `
      #ulydia-metier-filters { width: 100%; }
      .ulydia-filterbar {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        padding: 12px;
        margin: 12px 0 18px;
        border-radius: 16px;
        background: var(--ulydia-surface, #fff);
        box-shadow: 0 10px 24px rgba(0,0,0,.07);
        align-items: flex-end;
        position: relative;
        z-index: 5;
      }
      .ulydia-filter { min-width: 180px; flex: 1 1 180px; }
      .ulydia-filter-actions { min-width: 140px; flex: 0 0 auto; }
      .ulydia-filter-label { display:block; font-size:12px; margin:0 0 6px; color: var(--ulydia-muted, rgba(0,0,0,.65)); }
      .ulydia-filter-select {
        width:100%; height:40px; border-radius:12px;
        border:1px solid rgba(0,0,0,.14);
        padding:0 10px; outline:none; background:#fff; font-family:inherit;
      }
      .ulydia-filter-select:disabled{ opacity:.55; cursor:not-allowed; }
      .ulydia-filter-btn{
        height:40px; border-radius:12px; border:none;
        padding:0 14px; cursor:pointer;
        background: var(--ulydia-primary, #6b4eff);
        color:#fff; font-weight:600; font-family:inherit;
      }
      .ulydia-filter-btn:disabled{ opacity:.55; cursor:not-allowed; }
      @media (max-width: 640px){
        .ulydia-filter-actions{ width:100%; }
        .ulydia-filter-btn{ width:100%; }
      }
    `;
    document.head.appendChild(st);
  }

  function buildIndexes(sectorsArr) {
    const bySlug = new Map();
    const byId   = new Map();
    (sectorsArr || []).forEach(s => {
      const slug = norm(pickField(s, ["slug", "sector_slug", "value"]));
      const id   = norm(pickField(s, ["id", "_id"]));
      if (slug) bySlug.set(slug, s);
      if (id) byId.set(id, s);
    });
    return { bySlug, byId };
  }

  function resolveSectorForMetier(m, idx) {
    const key = guessSectorKey(m);
    if (!key) return null;
    if (key.type === "slug") return idx.bySlug.get(key.value) || null;
    if (key.type === "id") return idx.byId.get(key.value) || null;
    return null;
  }

  function dedupeCountriesFromMetiers(metiersArr){
    const map = new Map();
    (metiersArr || []).forEach(m => {
      const iso = guessCountryIsoFromMetier(m);
      if (!iso) return;
      if (!map.has(iso)) map.set(iso, { iso, name: iso });
    });
    return Array.from(map.values());
  }

  function render(mount) {
    const qs = getQS();

    const countriesArr = pickWindowArray(["__ULYDIA_COUNTRIES__", "__ULYDIA_PAYS__", "__ULYDIA_COUNTRY_LIST__"]) || countries;
    const sectorsArr   = pickWindowArray(["__ULYDIA_SECTEURS_ACTIVITE__", "__ULYDIA_SECTEURS__", "__ULYDIA_SECTORS__"]) || sectors;
    const metiersArr   = pickWindowArray(["__ULYDIA_METIERS__", "__ULYDIA_JOBS__", "__ULYDIA_METIER_LIST__"]) || metiers;

    const lang = guessLangFromCountry(qs.country, countriesArr, qs.lang);
    const t = UI_TXT[lang] || UI_TXT.fr;

    const sectorIdx = buildIndexes(sectorsArr);

    let inferredSector = qs.sector;
    if (!inferredSector && qs.metier) {
      const m0 = metiersArr.find(m => guessMetierSlug(m) === qs.metier);
      const sec0 = m0 ? resolveSectorForMetier(m0, sectorIdx) : null;
      inferredSector = sec0 ? norm(pickField(sec0, ["slug"])) : "";
    }

    const metiersByCountry = qs.country
      ? metiersArr.filter(m => guessCountryIsoFromMetier(m) === qs.country)
      : metiersArr.slice();

    const availSectorSlugs = new Set();
    metiersByCountry.forEach(m => {
      const sec = resolveSectorForMetier(m, sectorIdx);
      const slug = sec ? norm(pickField(sec, ["slug"])) : "";
      if (slug) availSectorSlugs.add(slug);
      const directSlug = norm(pickField(m, ["sector_slug", "secteur_slug", "sector"]));
      if (directSlug) availSectorSlugs.add(directSlug);
    });

    const sectorsFiltered = (qs.country && sectorsArr.length)
      ? sectorsArr.filter(s => availSectorSlugs.has(norm(pickField(s, ["slug"]))))
      : sectorsArr.slice();

    const metiersBySector = inferredSector
      ? metiersByCountry.filter(m => {
          const key = guessSectorKey(m);
          if (!key) return false;
          if (key.type === "slug") return norm(key.value) === norm(inferredSector);
          const sec = resolveSectorForMetier(m, sectorIdx);
          const slug = sec ? norm(pickField(sec, ["slug"])) : "";
          return slug && norm(slug) === norm(inferredSector);
        })
      : metiersByCountry;

    const countryOptions = (countriesArr.length ? countriesArr : dedupeCountriesFromMetiers(metiersArr))
      .map(c => {
        const iso = guessIso(c);
        const label = pickLocalized(c, "name", lang) || iso;
        return { value: iso, label };
      })
      .filter(x => x.value)
      .sort((a,b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

    const sectorOptions = sectorsFiltered
      .map(s => {
        const slug = norm(pickField(s, ["slug"]));
        const label = pickLocalized(s, "name", lang) || slug;
        return { value: slug, label };
      })
      .filter(x => x.value)
      .sort((a,b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

    const metierOptions = metiersBySector
      .map(m => {
        const slug = guessMetierSlug(m);
        const label = pickLocalized(m, "name", lang) || slug;
        return { value: slug, label };
      })
      .filter(x => x.value)
      .sort((a,b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

    mount.innerHTML = `
      <div class="ulydia-filterbar">
        <div class="ulydia-filter">
          <label class="ulydia-filter-label">${escHtml(t.country)}</label>
          <select id="ulydia-filter-country" class="ulydia-filter-select">
            <option value="">${escHtml(t.choose)}</option>
            ${countryOptions.map(o => `
              <option value="${escAttr(o.value)}" ${o.value===qs.country ? "selected":""}>${escHtml(o.label)}</option>
            `).join("")}
          </select>
        </div>

        <div class="ulydia-filter">
          <label class="ulydia-filter-label">${escHtml(t.sector)}</label>
          <select id="ulydia-filter-sector" class="ulydia-filter-select" ${!qs.country ? "disabled":""}>
            <option value="">${escHtml(t.choose)}</option>
            ${sectorOptions.map(o => `
              <option value="${escAttr(o.value)}" ${o.value===inferredSector ? "selected":""}>${escHtml(o.label)}</option>
            `).join("")}
          </select>
        </div>

        <div class="ulydia-filter">
          <label class="ulydia-filter-label">${escHtml(t.metier)}</label>
          <select id="ulydia-filter-metier" class="ulydia-filter-select" ${!qs.country ? "disabled":""}>
            <option value="">${escHtml(t.choose)}</option>
            ${metierOptions.map(o => `
              <option value="${escAttr(o.value)}" ${o.value===qs.metier ? "selected":""}>${escHtml(o.label)}</option>
            `).join("")}
          </select>
        </div>

        <div class="ulydia-filter ulydia-filter-actions">
          <button id="ulydia-filter-go" class="ulydia-filter-btn" ${(!qs.country || !qs.metier) ? "disabled":""}>
            ${escHtml(t.go)}
          </button>
        </div>
      </div>
    `;

    wireEvents(mount);
    log("rendered", { countryOptions: countryOptions.length, sectorOptions: sectorOptions.length, metierOptions: metierOptions.length, qs });
  }

  function wireEvents(mount) {
    const elCountry = mount.querySelector("#ulydia-filter-country");
    const elSector  = mount.querySelector("#ulydia-filter-sector");
    const elMetier  = mount.querySelector("#ulydia-filter-metier");
    const elGo      = mount.querySelector("#ulydia-filter-go");
    if (!elCountry || !elSector || !elMetier || !elGo) return;

    elCountry.addEventListener("change", () => setQS({ country: upper(elCountry.value || ""), sector: "", metier: "" }));
    elSector.addEventListener("change", () => setQS({ sector: norm(elSector.value || ""), metier: "" }));
    elMetier.addEventListener("change", () => {
      if (!upper(elCountry.value || "")) return;
      setQS({ metier: norm(elMetier.value || "") });
    });
    elGo.addEventListener("click", () => {
      const country = upper(elCountry.value || "");
      const metier  = norm(elMetier.value || "");
      const sector  = norm(elSector.value || "");
      if (!country || !metier) return;
      setQS({ country, metier, sector });
    });
  }

  // =========================================================
  // Mounting strategy: insert BEFORE #ulydia-metier-root
  // =========================================================
  function ensureMountBeforeRoot(rootEl) {
    let el = document.getElementById("ulydia-metier-filters");
    if (el) return el;

    el = document.createElement("section");
    el.id = "ulydia-metier-filters";

    const parent = rootEl.parentNode || document.body;
    parent.insertBefore(el, rootEl);
    return el;
  }

  function bootWithRoot(rootEl) {
    injectStyles();
    const mount = ensureMountBeforeRoot(rootEl);
    render(mount);

    // If data arrives later, rerender once (cheap)
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (attempts > 20) { clearInterval(timer); return; } // ~10s
      if (hasDataReady()) { render(mount); clearInterval(timer); }
    }, 500);
  }

  function waitForRoot() {
    // 1) immediate
    const now = document.getElementById("ulydia-metier-root");
    if (now) return bootWithRoot(now);

    // 2) short poll
    let tries = 0;
    const poll = setInterval(() => {
      tries++;
      const r = document.getElementById("ulydia-metier-root");
      if (r) { clearInterval(poll); bootWithRoot(r); }
      if (tries > 40) { clearInterval(poll); } // ~10s
    }, 250);

    // 3) mutation observer fallback
    try {
      const obs = new MutationObserver(() => {
        const r = document.getElementById("ulydia-metier-root");
        if (r) {
          obs.disconnect();
          clearInterval(poll);
          bootWithRoot(r);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch(e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForRoot);
  else waitForRoot();
})();
