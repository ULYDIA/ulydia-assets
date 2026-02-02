/*!
ULYDIA — Metier Filters
v2026-02-03 FINAL PATCH20
- Country drives: (1) final language for labels, (2) the job-page context via ?country=XX
- NO duplication of fiche by country (fiche is by final language)
- Sector filtering uses: metier item -> (js|is)-metier-sector (slug) + sector list map (js|is)-sector-slug/name (+ optional localized names)
- Optional: MPB availability index from ul-cms-blocs-source (js-bloc-metier + js-bloc-iso) so you can:
    - keep showing all jobs for the language
    - but disable/grey the CTA if you want "only show jobs with MPB for this country"
  (default: DO NOT hide; only builds the index and passes country to the job page)
- Fixes select reset/sticky values and avoids "render is not defined"
*/

(function(){
  "use strict";
  if (window.__ULYDIA_METIER_FILTERS_PATCH20__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH20__ = true;

  // -----------------------------
  // Helpers
  // -----------------------------
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function lower(s){ return String(s||"").toLowerCase(); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function getTextMulti(root, selectors){
    for (var i=0;i<selectors.length;i++){
      var el = root.querySelector(selectors[i]);
      if (el){
        var t = norm(el.textContent);
        if (t) return t;
      }
    }
    return "";
  }
  function getAllTexts(root, selector){
    return qsa(selector, root).map(function(el){ return norm(el.textContent); }).filter(Boolean);
  }
  function uniq(arr){
    var out=[], seen=Object.create(null);
    for (var i=0;i<arr.length;i++){
      var k=String(arr[i]);
      if (!seen[k]){ seen[k]=1; out.push(arr[i]); }
    }
    return out;
  }

  // -----------------------------
  // DOM hooks (adjust if needed)
  // -----------------------------
  // You already have UI rendered; we just need the 3 selects and CTA button.
  // Try multiple selectors to be robust.
  var selCountry = qs('[data-filter="country"]') || qs('#ulydia-filter-country') || qs('.ulydia-filter-country select') || qs('select[name="country"]');
  var selSector  = qs('[data-filter="sector"]')  || qs('#ulydia-filter-sector')  || qs('.ulydia-filter-sector select')  || qs('select[name="sector"]');
  var selJob     = qs('[data-filter="job"]')     || qs('#ulydia-filter-job')     || qs('.ulydia-filter-job select')     || qs('select[name="job"]');
  var btnGo      = qs('[data-action="go"]')      || qs('#ulydia-filter-go')      || qs('.ulydia-filter-go')            || qs('a[href*="metier"], button[data-go]');
  var msgEl      = qs('[data-filter="message"]') || qs('#ulydia-filter-message') || qs('.ulydia-filter-message');

  // If your selects are custom (not native <select>), this script won't control them.
  // It assumes native <select>. If not, tell me and I'll adapt to your component.
  if (!selCountry || !selSector || !selJob){
    console.warn("[ULYDIA FILTERS] Missing native selects. Found:", {selCountry:!!selCountry, selSector:!!selSector, selJob:!!selJob});
    return;
  }

  // -----------------------------
  // Country -> final language
  // -----------------------------
  // If you already inject countries somewhere, we can read from DOM:
  // In your CMS countries list you have .js-country-iso and .js-country-lang (as used on job page).
  function buildCountryLangMap(){
    var map = Object.create(null);

    // Try: countries list items (.js-country-iso + .js-country-lang)
    var isoEls = qsa(".js-country-iso, .is-country-iso");
    isoEls.forEach(function(isoEl){
      var item = isoEl.closest(".w-dyn-item") || isoEl.parentElement;
      var iso = norm(isoEl.textContent).toUpperCase();
      if (!iso) return;
      var lang = "";
      if (item){
        lang = getTextMulti(item, [".js-country-lang",".is-country-lang",".js-lang",".is-lang"]);
      }
      lang = lower(lang);
      if (lang) map[iso] = lang;
    });

    // Fallback: if you store countries in window.__ULYDIA_COUNTRIES__
    try{
      var arr = window.__ULYDIA_COUNTRIES__ || [];
      for (var i=0;i<arr.length;i++){
        var c = arr[i]||{};
        if (c.iso && c.lang){
          map[String(c.iso).toUpperCase()] = lower(c.lang);
        }
      }
    }catch(e){}

    return map;
  }

  var COUNTRY_LANG = buildCountryLangMap();

  function getSelectedCountryISO(){
    var v = norm(selCountry.value);
    if (!v) return "";
    // Allow values like "FR" or "France"
    // If value is already ISO, keep it. Else, try data-iso on selected option.
    if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
    var opt = selCountry.options && selCountry.options[selCountry.selectedIndex];
    var dataIso = opt ? (opt.getAttribute("data-iso") || opt.getAttribute("data-country") || "") : "";
    dataIso = norm(dataIso);
    if (/^[A-Za-z]{2}$/.test(dataIso)) return dataIso.toUpperCase();
    // As last resort, if countries map includes label keys (rare), try direct
    // (no-op for now)
    return "";
  }

  function finalLangForCountry(iso){
    iso = String(iso||"").toUpperCase();
    var lang = COUNTRY_LANG[iso] || "";
    lang = lower(lang);
    // enforce supported set
    if (["fr","en","de","es","it"].indexOf(lang) === -1) lang = "en";
    return lang;
  }

  // -----------------------------
  // Sector map (slug -> label)
  // -----------------------------
  function buildSectorMap(){
    var map = Object.create(null);
    // sector list DOM
    var slugEls = qsa(".js-sector-slug, .is-sector-slug");
    slugEls.forEach(function(slugEl){
      var item = slugEl.closest(".w-dyn-item") || slugEl.parentElement;
      var slug = norm(slugEl.textContent);
      if (!slug) return;

      // default name
      var name = "";
      if (item){
        name = getTextMulti(item, [".js-sector-name",".is-sector-name"]);
      }
      if (name) map[slug] = { default: name, item: item };
      else map[slug] = { default: slug, item: item };
    });
    return map;
  }
  var SECTOR_MAP = buildSectorMap();

  function sectorLabel(slug, lang){
    slug = norm(slug);
    if (!slug) return "";
    var entry = SECTOR_MAP[slug];
    if (!entry) return slug;

    // If sector collection exposes localized names, try them.
    // Common patterns:
    //  - .js-sector-name-fr / -en / -de / -es / -it
    //  - .js-sector-name_fr, etc.
    var item = entry.item;
    if (item){
      var candidates = [
        ".js-sector-name-"+lang, ".is-sector-name-"+lang,
        ".js-sector-name_"+lang, ".is-sector-name_"+lang,
        ".js-sector-"+lang, ".is-sector-"+lang
      ];
      var loc = getTextMulti(item, candidates);
      if (loc) return loc;
    }
    return entry.default || slug;
  }

  // -----------------------------
  // MPB availability index (metier slug + ISO)
  // -----------------------------
  function buildMPBIndex(){
    // Uses the "ul-cms-blocs-source" list: each item contains
    //  - .js-bloc-metier (metier slug or global id)
    //  - .js-bloc-iso (country iso)
    var idx = Object.create(null);
    var items = qsa(".ul-cms-blocs-source .w-dyn-item, .ul-cms-blocs-source .w-dyn-list .w-dyn-item");
    if (!items.length){
      // fallback to any items containing both fields
      items = qsa(".w-dyn-item").filter(function(it){
        return it.querySelector(".js-bloc-metier") && it.querySelector(".js-bloc-iso");
      });
    }
    items.forEach(function(it){
      var metier = getTextMulti(it, [".js-bloc-metier",".is-bloc-metier"]);
      var iso = getTextMulti(it, [".js-bloc-iso",".is-bloc-iso"]).toUpperCase();
      if (!metier || !iso) return;
      var key = metier + "@" + iso;
      idx[key] = true;
    });
    return idx;
  }
  var MPB_INDEX = buildMPBIndex();

  // -----------------------------
  // Read all jobs (fiche metier items)
  // -----------------------------
  function readJobs(){
    // Each job is a w-dyn-item containing:
    //  - .js-metier-slug / .is-metier-slug
    //  - .js-metier-name / .is-metier-name
    //  - .js-fiche-lang / .is-fiche-lang
    //  - .js-metier-sector / .is-metier-sector (sector slug)
    //
    // Note: we DO NOT read country here (no duplication by country).
    var items = qsa(".w-dyn-item").filter(function(it){
      return it.querySelector(".js-metier-slug, .is-metier-slug");
    });

    var jobs = [];
    items.forEach(function(it){
      var slug = getTextMulti(it, [".js-metier-slug",".is-metier-slug"]);
      if (!slug) return;
      var lang = lower(getTextMulti(it, [".js-fiche-lang",".is-fiche-lang"])) || "";
      var title = getTextMulti(it, [".js-metier-name",".is-metier-name"]);
      var sector = getTextMulti(it, [".js-metier-sector",".is-metier-sector"]);
      jobs.push({
        slug: slug,
        lang: lang,
        title: title || slug,
        sectorSlug: sector,
        _el: it
      });
    });

    return jobs;
  }

  var ALL_JOBS = readJobs();

  // -----------------------------
  // UI helpers (native selects)
  // -----------------------------
  function clearSelect(sel, placeholder){
    while (sel.options.length) sel.remove(0);
    var opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder || "Choisir…";
    sel.appendChild(opt);
    sel.value = "";
  }
  function setDisabled(sel, disabled){
    sel.disabled = !!disabled;
    sel.classList.toggle("is-disabled", !!disabled);
  }
  function fillSelect(sel, options, placeholder){
    clearSelect(sel, placeholder);
    options.forEach(function(o){
      var opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      if (o.data){
        for (var k in o.data){
          opt.setAttribute("data-"+k, o.data[k]);
        }
      }
      sel.appendChild(opt);
    });
  }

  function showMessage(txt){
    if (!msgEl) return;
    msgEl.textContent = txt || "";
    msgEl.style.display = txt ? "block" : "none";
  }

  function setGoEnabled(enabled){
    if (!btnGo) return;
    if (btnGo.tagName === "A"){
      btnGo.style.pointerEvents = enabled ? "auto" : "none";
      btnGo.style.opacity = enabled ? "1" : "0.5";
    }else{
      btnGo.disabled = !enabled;
      btnGo.style.opacity = enabled ? "1" : "0.5";
    }
  }

  // -----------------------------
  // Render pipeline
  // -----------------------------
  var state = {
    countryISO: "",
    lang: "en",
    sectorSlug: "",
    jobSlug: ""
  };

  function jobsForLang(lang){
    lang = lower(lang);
    return ALL_JOBS.filter(function(j){
      return lower(j.lang) === lang;
    });
  }

  function render(){
    // compute state
    state.countryISO = getSelectedCountryISO();
    state.lang = finalLangForCountry(state.countryISO);

    var jobsLang = jobsForLang(state.lang);

    // Build sector options from jobs of this language
    var sectorSlugs = uniq(jobsLang.map(function(j){ return j.sectorSlug; }).filter(Boolean));
    sectorSlugs.sort();

    var sectorOpts = sectorSlugs.map(function(slug){
      return { value: slug, label: sectorLabel(slug, state.lang) };
    });

    // Reset sector & job if no longer valid
    var currentSector = norm(selSector.value);
    if (currentSector && sectorSlugs.indexOf(currentSector) === -1){
      currentSector = "";
      selSector.value = "";
    }

    // Fill sector select
    fillSelect(selSector, sectorOpts, "Choisir…");
    selSector.value = currentSector;

    // Jobs filtered by sector (within language)
    var jobsFiltered = jobsLang;
    if (currentSector){
      jobsFiltered = jobsFiltered.filter(function(j){ return j.sectorSlug === currentSector; });
    }

    // Build job options
    var jobOpts = jobsFiltered.map(function(j){
      return { value: j.slug, label: j.title };
    });
    jobOpts.sort(function(a,b){ return a.label.localeCompare(b.label); });

    var currentJob = norm(selJob.value);
    var jobSlugs = jobsFiltered.map(function(j){ return j.slug; });
    if (currentJob && jobSlugs.indexOf(currentJob) === -1){
      currentJob = "";
      selJob.value = "";
    }

    fillSelect(selJob, jobOpts, "Choisir…");
    selJob.value = currentJob;

    // Enable/disable selects
    setDisabled(selSector, sectorOpts.length === 0);
    setDisabled(selJob, jobOpts.length === 0);

    // Message
    if (!jobsLang.length){
      showMessage("Aucun métier disponible pour la langue \"" + state.lang + "\" (encore).");
    }else{
      showMessage("");
    }

    // CTA
    setGoEnabled(!!selJob.value);

    // Update CTA href (country context MUST be passed so sponsor/MPB is country-specific on job page)
    if (btnGo && btnGo.tagName === "A"){
      var slug = norm(selJob.value);
      if (slug){
        // You likely have a base URL like /metier/<slug> or /fiche-metier?metier=<slug>
        // We'll preserve existing href base if present, else use current origin with query params.
        var baseHref = btnGo.getAttribute("data-base-href") || btnGo.getAttribute("href") || "";
        baseHref = String(baseHref || "");
        // If baseHref already includes something, keep path and replace query
        var url;
        try{
          url = new URL(baseHref, window.location.origin);
        }catch(e){
          url = new URL(window.location.origin + "/");
        }

        // If href path doesn't include slug, store base and use query style by default.
        // Recommended: use query for your job page (since your job page reads URL params)
        // Example: /metier?metier=xxx&country=FR
        url.searchParams.set("metier", slug);
        if (state.countryISO) url.searchParams.set("country", state.countryISO);
        btnGo.setAttribute("href", url.pathname + "?" + url.searchParams.toString());
      }else{
        // no job selected
      }
    }
  }

  // -----------------------------
  // Events
  // -----------------------------
  function onCountryChange(){
    // reset selections when country changes (since language may change)
    selSector.value = "";
    selJob.value = "";
    render();
  }
  function onSectorChange(){
    // reset job if sector changes
    selJob.value = "";
    render();
  }
  function onJobChange(){
    render();
  }

  selCountry.addEventListener("change", onCountryChange);
  selSector.addEventListener("change", onSectorChange);
  selJob.addEventListener("change", onJobChange);

  // Initial
  // If country has a preselected value, render will respect it.
  render();

  // Expose tiny debug
  window.__ULYDIA_FILTERS_DEBUG__ = {
    COUNTRY_LANG: COUNTRY_LANG,
    SECTOR_MAP: SECTOR_MAP,
    MPB_INDEX: MPB_INDEX,
    ALL_JOBS: ALL_JOBS
  };

})();
