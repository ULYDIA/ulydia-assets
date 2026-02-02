/*!
ULYDIA — Metier Filters (Webflow Dropdown + Native Select support)
v2026-02-03 FINAL PATCH21
- Supports:
  A) Native <select> (as in PATCH20)
  B) Webflow Dropdown (.w-dropdown) via data attributes (recommended) OR ids
- Country drives final language + passes country to job page (?metier=...&country=XX)
- Fiche is by final language (no country duplication)
- Sector uses job item sector slug + sector map list
- Resets sticky selections on country/sector changes
- Does NOT depend on js-fiche-country-code
*/

(function(){
  "use strict";
  if (window.__ULYDIA_METIER_FILTERS_PATCH21__) return;
  window.__ULYDIA_METIER_FILTERS_PATCH21__ = true;

  // -----------------------------
  // Helpers
  // -----------------------------
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function lower(s){ return String(s||"").toLowerCase(); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function uniq(arr){
    var out=[], seen=Object.create(null);
    for (var i=0;i<arr.length;i++){
      var k=String(arr[i]);
      if (!seen[k]){ seen[k]=1; out.push(arr[i]); }
    }
    return out;
  }
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

  // -----------------------------
  // Build Country->Lang map
  // -----------------------------
  function buildCountryLangMap(){
    var map = Object.create(null);

    // DOM countries list items (as you already have: is-country-iso + is-country-lang)
    qsa(".js-country-iso, .is-country-iso").forEach(function(isoEl){
      var item = isoEl.closest(".w-dyn-item") || isoEl.parentElement;
      var iso = norm(isoEl.textContent).toUpperCase();
      if (!iso) return;
      var lang = item ? getTextMulti(item, [".js-country-lang",".is-country-lang",".js-lang",".is-lang"]) : "";
      lang = lower(lang);
      if (lang) map[iso] = lang;
    });

    // window fallback
    try{
      (window.__ULYDIA_COUNTRIES__ || []).forEach(function(c){
        if (c && c.iso && c.lang) map[String(c.iso).toUpperCase()] = lower(c.lang);
      });
    }catch(e){}

    return map;
  }
  var COUNTRY_LANG = buildCountryLangMap();

  function finalLangForCountry(iso){
    iso = String(iso||"").toUpperCase();
    var lang = lower(COUNTRY_LANG[iso] || "");
    if (["fr","en","de","es","it"].indexOf(lang) === -1) lang = "en";
    return lang;
  }

  // -----------------------------
  // Sector map (slug -> label)
  // -----------------------------
  function buildSectorMap(){
    var map = Object.create(null);
    qsa(".js-sector-slug, .is-sector-slug").forEach(function(slugEl){
      var item = slugEl.closest(".w-dyn-item") || slugEl.parentElement;
      var slug = norm(slugEl.textContent);
      if (!slug) return;
      var name = item ? getTextMulti(item, [".js-sector-name",".is-sector-name"]) : "";
      map[slug] = { default: name || slug, item: item };
    });
    return map;
  }
  var SECTOR_MAP = buildSectorMap();

  function sectorLabel(slug, lang){
    slug = norm(slug);
    if (!slug) return "";
    var entry = SECTOR_MAP[slug];
    if (!entry) return slug;
    var item = entry.item;
    if (item){
      var candidates = [
        ".js-sector-name-"+lang, ".is-sector-name-"+lang,
        ".js-sector-name_"+lang, ".is-sector-name_"+lang
      ];
      var loc = getTextMulti(item, candidates);
      if (loc) return loc;
    }
    return entry.default || slug;
  }

  // -----------------------------
  // Read all jobs (by language)
  // -----------------------------
  function readJobs(){
    var items = qsa(".w-dyn-item").filter(function(it){
      return it.querySelector(".js-metier-slug, .is-metier-slug");
    });
    var jobs = [];
    items.forEach(function(it){
      var slug = getTextMulti(it, [".js-metier-slug",".is-metier-slug"]);
      if (!slug) return;
      var lang = lower(getTextMulti(it, [".js-fiche-lang",".is-fiche-lang"])) || "";
      var title = getTextMulti(it, [".js-metier-name",".is-metier-name"]) || slug;
      var sector = getTextMulti(it, [".js-metier-sector",".is-metier-sector"]);
      jobs.push({ slug: slug, lang: lang, title: title, sectorSlug: sector });
    });
    return jobs;
  }
  var ALL_JOBS = readJobs();

  // -----------------------------
  // UI Adapter (Select OR Webflow dropdown)
  // Convention (recommended):
  // Country dropdown wrapper: [data-uf-dd="country"]
  //  - toggle label: .w-dropdown-toggle .uf-label (or [data-uf-label])
  //  - list container: .w-dropdown-list
  //  - items: [data-uf-item] with data-value="FR" (ISO)
  //
  // Sector dropdown wrapper: [data-uf-dd="sector"] items data-value="<sectorSlug>"
  // Job dropdown wrapper:    [data-uf-dd="job"]    items data-value="<jobSlug>"
  //
  // Go button: [data-uf-go] (anchor or button)
  // Message:   [data-uf-msg]
  // -----------------------------
  function isNativeSelect(el){ return el && el.tagName === "SELECT"; }

  function findNative(){
    var selCountry = qs('[data-filter="country"]') || qs('#ulydia-filter-country') || qs('select[name="country"]');
    var selSector  = qs('[data-filter="sector"]')  || qs('#ulydia-filter-sector')  || qs('select[name="sector"]');
    var selJob     = qs('[data-filter="job"]')     || qs('#ulydia-filter-job')     || qs('select[name="job"]');
    return {
      type: (isNativeSelect(selCountry) && isNativeSelect(selSector) && isNativeSelect(selJob)) ? "select" : "",
      country: selCountry, sector: selSector, job: selJob
    };
  }

  function findWebflowDD(){
    function wrap(kind){
      return qs('[data-uf-dd="'+kind+'"]') || qs('#ulydia-dd-'+kind);
    }
    var wCountry = wrap("country");
    var wSector  = wrap("sector");
    var wJob     = wrap("job");

    function labelEl(wrapEl){
      if (!wrapEl) return null;
      return qs('[data-uf-label]', wrapEl) || qs('.uf-label', wrapEl) || qs('.w-dropdown-toggle', wrapEl);
    }
    function listEl(wrapEl){
      if (!wrapEl) return null;
      return qs('.w-dropdown-list', wrapEl) || qs('[data-uf-list]', wrapEl) || wrapEl;
    }
    return {
      type: (wCountry && wSector && wJob) ? "webflow" : "",
      country: { wrap: wCountry, label: labelEl(wCountry), list: listEl(wCountry) },
      sector:  { wrap: wSector,  label: labelEl(wSector),  list: listEl(wSector) },
      job:     { wrap: wJob,     label: labelEl(wJob),     list: listEl(wJob) }
    };
  }

  var UI = findNative();
  if (!UI.type) UI = findWebflowDD();

  var btnGo = qs('[data-uf-go]') || qs('[data-action="go"]') || qs('#ulydia-filter-go') || qs('.ulydia-filter-go') || qs('a[href*="metier"]');
  var msgEl = qs('[data-uf-msg]') || qs('[data-filter="message"]') || qs('#ulydia-filter-message') || qs('.ulydia-filter-message');

  if (!UI.type){
    console.warn("[ULYDIA FILTERS] Missing selects/dropdowns. Add data-uf-dd=\"country|sector|job\" to your Webflow dropdown wrappers.");
    return;
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

  // -------- Native select ops
  function clearSelect(sel, placeholder){
    while (sel.options.length) sel.remove(0);
    var opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder || "Choisir…";
    sel.appendChild(opt);
    sel.value = "";
  }
  function fillSelect(sel, options, placeholder){
    clearSelect(sel, placeholder);
    options.forEach(function(o){
      var opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      if (o.data){
        for (var k in o.data) opt.setAttribute("data-"+k, o.data[k]);
      }
      sel.appendChild(opt);
    });
  }

  // -------- Webflow dropdown ops
  function ddGetValue(dd){
    // stored on wrapper
    return dd.wrap ? (dd.wrap.getAttribute("data-uf-value") || "") : "";
  }
  function ddSetValue(dd, value, label){
    if (!dd.wrap) return;
    dd.wrap.setAttribute("data-uf-value", value || "");
    if (dd.label){
      // If label is the toggle, set its text content (but keep child spans if any)
      if (dd.label.matches(".w-dropdown-toggle")){
        // try a child span dedicated for text
        var span = dd.label.querySelector(".uf-label-text") || dd.label.querySelector("[data-uf-label-text]");
        if (span) span.textContent = label || "Choisir…";
        else dd.label.textContent = label || "Choisir…";
      }else{
        dd.label.textContent = label || "Choisir…";
      }
    }
  }
  function ddClearList(dd){
    if (!dd.list) return;
    // Remove existing generated items (keep any template item if you want; we fully replace)
    dd.list.innerHTML = "";
  }
  function ddFillList(dd, options, placeholder){
    ddClearList(dd);
    // placeholder item
    var ph = document.createElement("a");
    ph.href = "#";
    ph.className = "w-dropdown-link uf-item is-placeholder";
    ph.setAttribute("data-uf-item","1");
    ph.setAttribute("data-value","");
    ph.textContent = placeholder || "Choisir…";
    dd.list.appendChild(ph);

    options.forEach(function(o){
      var a = document.createElement("a");
      a.href = "#";
      a.className = "w-dropdown-link uf-item";
      a.setAttribute("data-uf-item","1");
      a.setAttribute("data-value", o.value);
      a.textContent = o.label;
      dd.list.appendChild(a);
    });
  }

  function ddEnable(dd, enabled){
    if (!dd.wrap) return;
    dd.wrap.classList.toggle("is-disabled", !enabled);
    // Webflow dropdown can be disabled by pointer-events
    dd.wrap.style.pointerEvents = enabled ? "auto" : "none";
    dd.wrap.style.opacity = enabled ? "1" : "0.5";
  }

  // -----------------------------
  // State + pipeline
  // -----------------------------
  var state = { countryISO:"", lang:"en", sectorSlug:"", jobSlug:"" };

  function getCountryISO(){
    if (UI.type === "select"){
      var v = norm(UI.country.value);
      if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
      var opt = UI.country.options && UI.country.options[UI.country.selectedIndex];
      var dataIso = opt ? (opt.getAttribute("data-iso")||opt.getAttribute("data-country")||"") : "";
      dataIso = norm(dataIso);
      if (/^[A-Za-z]{2}$/.test(dataIso)) return dataIso.toUpperCase();
      return "";
    }else{
      var v2 = norm(ddGetValue(UI.country));
      if (/^[A-Za-z]{2}$/.test(v2)) return v2.toUpperCase();
      return "";
    }
  }
  function getSectorSlug(){
    return UI.type === "select" ? norm(UI.sector.value) : norm(ddGetValue(UI.sector));
  }
  function getJobSlug(){
    return UI.type === "select" ? norm(UI.job.value) : norm(ddGetValue(UI.job));
  }

  function jobsForLang(lang){
    lang = lower(lang);
    return ALL_JOBS.filter(function(j){ return lower(j.lang) === lang; });
  }

  function updateCTA(jobSlug){
    jobSlug = norm(jobSlug);
    setGoEnabled(!!jobSlug);
    if (!btnGo || btnGo.tagName !== "A") return;
    if (!jobSlug) return;

    var baseHref = btnGo.getAttribute("data-base-href") || btnGo.getAttribute("href") || "";
    baseHref = String(baseHref||"");
    var url;
    try{ url = new URL(baseHref, window.location.origin); }
    catch(e){ url = new URL(window.location.origin + "/"); }

    url.searchParams.set("metier", jobSlug);
    if (state.countryISO) url.searchParams.set("country", state.countryISO);
    btnGo.setAttribute("href", url.pathname + "?" + url.searchParams.toString());
  }

  function render(){
    state.countryISO = getCountryISO();
    state.lang = finalLangForCountry(state.countryISO);

    // Base jobs = language only
    var jobsLang = jobsForLang(state.lang);

    // Sector options from jobsLang
    var sectorSlugs = uniq(jobsLang.map(function(j){ return j.sectorSlug; }).filter(Boolean)).sort();
    var sectorOpts = sectorSlugs.map(function(slug){
      return { value: slug, label: sectorLabel(slug, state.lang) };
    });

    // Current selections
    var currentSector = getSectorSlug();
    if (currentSector && sectorSlugs.indexOf(currentSector) === -1) currentSector = "";

    // Fill sector UI
    if (UI.type === "select"){
      fillSelect(UI.sector, sectorOpts, "Choisir…");
      UI.sector.value = currentSector;
    }else{
      ddFillList(UI.sector, sectorOpts, "Choisir…");
      ddSetValue(UI.sector, currentSector, currentSector ? sectorLabel(currentSector, state.lang) : "Choisir…");
    }
    ddEnable(UI.type==="webflow" ? UI.sector : {wrap:null}, sectorOpts.length>0);
    if (UI.type==="select") UI.sector.disabled = (sectorOpts.length===0);

    // Jobs filtered by sector
    var jobsFiltered = currentSector ? jobsLang.filter(function(j){ return j.sectorSlug === currentSector; }) : jobsLang;

    var jobOpts = jobsFiltered.map(function(j){ return { value:j.slug, label:j.title }; })
      .sort(function(a,b){ return a.label.localeCompare(b.label); });

    var jobSlugs = jobsFiltered.map(function(j){ return j.slug; });
    var currentJob = getJobSlug();
    if (currentJob && jobSlugs.indexOf(currentJob) === -1) currentJob = "";

    if (UI.type === "select"){
      fillSelect(UI.job, jobOpts, "Choisir…");
      UI.job.value = currentJob;
      UI.job.disabled = (jobOpts.length===0);
    }else{
      ddFillList(UI.job, jobOpts, "Choisir…");
      ddSetValue(UI.job, currentJob, currentJob ? (jobOpts.find(function(o){return o.value===currentJob;})||{}).label : "Choisir…");
      ddEnable(UI.job, jobOpts.length>0);
    }

    // Message
    if (!jobsLang.length){
      showMessage("Aucun métier disponible pour la langue \""+state.lang+"\" (encore).");
    }else{
      showMessage("");
    }

    updateCTA(currentJob);
  }

  // -----------------------------
  // Events wiring
  // -----------------------------
  function resetAfterCountry(){
    if (UI.type === "select"){
      UI.sector.value = "";
      UI.job.value = "";
    }else{
      ddSetValue(UI.sector, "", "Choisir…");
      ddSetValue(UI.job, "", "Choisir…");
    }
  }
  function resetAfterSector(){
    if (UI.type === "select"){
      UI.job.value = "";
    }else{
      ddSetValue(UI.job, "", "Choisir…");
    }
  }

  if (UI.type === "select"){
    UI.country.addEventListener("change", function(){ resetAfterCountry(); render(); });
    UI.sector.addEventListener("change", function(){ resetAfterSector(); render(); });
    UI.job.addEventListener("change", function(){ render(); });
  }else{
    function bindDD(dd, onPick){
      if (!dd || !dd.list) return;
      dd.list.addEventListener("click", function(e){
        var a = e.target && e.target.closest("[data-uf-item]");
        if (!a) return;
        e.preventDefault();
        var v = norm(a.getAttribute("data-value"));
        var label = norm(a.textContent);
        ddSetValue(dd, v, label || "Choisir…");
        onPick(v, label);
      });
    }
    bindDD(UI.country, function(v){
      // v must be ISO
      resetAfterCountry();
      render();
    });
    bindDD(UI.sector, function(){
      resetAfterSector();
      render();
    });
    bindDD(UI.job, function(){
      render();
    });
  }

  // Initial render
  render();

  // Debug
  window.__ULYDIA_FILTERS_DEBUG__ = { ALL_JOBS: ALL_JOBS, COUNTRY_LANG: COUNTRY_LANG, SECTOR_MAP: SECTOR_MAP, UI_TYPE: UI.type };

})();
