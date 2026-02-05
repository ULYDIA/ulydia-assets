/* ULYDIA – METIER FILTER BAR PATCH
   v2026-02-05.PATCH.FILTERS.v6 (SECTEUR ACTIVITE + REQUIRE Secteur_slug)
   Goals:
   - Sector dropdown shows ONLY sectors that have at least 1 job whose Secteur_slug is non-empty.
   - Jobs dropdown shows ONLY jobs whose Secteur_slug is non-empty AND match selected sector (and optional country if present on job).
   - Values:
     * sector select value = Sector Activity record id (or slug fallback)
     * metier select value = job slug (metier)
   - Triggers content refresh via window.__ULYDIA_METIER_PAGE_REFRESH__ if present, else dispatches 'ulydia:routechange'.
*/
(function(){
  'use strict';
  if (window.__ULYDIA_FILTERS_PATCH_V6__) return;
  window.__ULYDIA_FILTERS_PATCH_V6__ = true;

  var DEBUG = !!window.__ULYDIA_DEBUG_FILTERS__;

  function log(){ if(DEBUG) try{ console.log.apply(console, arguments); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, arguments); }catch(e){} }

  function qs(sel){ return document.querySelector(sel); }
  var selCountry = qs('select[fs-cmsfilter-field="country"]') || qs('#ulydia-metier-filters select[fs-cmsfilter-field="country"]');
  var selSector  = qs('select[fs-cmsfilter-field="sector"]')  || qs('#ulydia-metier-filters select[fs-cmsfilter-field="sector"]');
  var selMetier  = qs('select[fs-cmsfilter-field="metier"]')  || qs('#ulydia-metier-filters select[fs-cmsfilter-field="metier"]');

  if (!selCountry || !selSector || !selMetier){
    var all = Array.prototype.slice.call(document.querySelectorAll('#ulydia-metier-filters select'));
    if (all.length >= 3){
      selCountry = selCountry || all[0];
      selSector  = selSector  || all[1];
      selMetier  = selMetier  || all[2];
    }
  }
  if (!selCountry || !selSector || !selMetier){
    warn('[ULYDIA][filters] selects not found');
    return;
  }

  // ---------- small utils ----------
  function norm(s){ return String(s||'').replace(/\u00a0/g,' ').trim(); }
  function low(s){ return norm(s).toLowerCase(); }
  function up(s){ return norm(s).toUpperCase(); }
  function esc(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function getQuery(){
    var sp = new URLSearchParams(location.search || '');
    return {
      country: up(sp.get('country') || sp.get('iso') || ''),
      sector:  norm(sp.get('sector') || ''), // sector activity id (or slug fallback)
      metier:  low(sp.get('metier') || sp.get('slug') || '')
    };
  }

  function setQuery(next){
    var sp = new URLSearchParams(location.search || '');
    if (next.country) sp.set('country', up(next.country)); else sp.delete('country');
    if (next.sector)  sp.set('sector', norm(next.sector));  else sp.delete('sector');
    if (next.metier)  sp.set('metier', low(next.metier));  else sp.delete('metier');
    var newUrl = location.pathname + (sp.toString() ? ('?' + sp.toString()) : '');
    history.pushState({}, '', newUrl);
  }

  function clearOptions(sel){
    while (sel.options && sel.options.length) sel.remove(0);
  }
  function option(sel, value, label){
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    sel.appendChild(o);
  }

  // ---------- data sources ----------
  function getJobs(){
    // Prefer Fiche métiers (Airtable content), fallback to metiers list
    var arr = window.__ULYDIA_FICHE_METIERS__ || window.__ULYDIA_METIERS__ || window.__ULYDIA_JOBS__ || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.filter(Boolean);
  }

  function getCountries(){
    var arr = window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.filter(Boolean);
  }

  function getSectors(){
    // Sectors activity table export (if you inject it)
    var arr = window.__ULYDIA_SECTEURS_ACTIVITE__ || window.__ULYDIA_SECTEURS__ || window.__ULYDIA_SECTORS__ || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.filter(Boolean);
  }

  function getFinalLangForCountry(iso){
    iso = up(iso);
    var c = getCountries().find(function(x){ return up(x.iso) === iso; }) || null;
    var lang = c && (c.lang || c.lang_finale || c.langue_finale || c.final_lang || c.finalLang || c.language);
    lang = low(lang).slice(0,2);
    if (lang === 'fr' || lang === 'en' || lang === 'de' || lang === 'es' || lang === 'it') return lang;
    return 'en';
  }

  // ---------- field extractors ----------
  function getJobSlug(j){
    return low(j.slug || j.Slug || j.metier_slug || j.metierSlug || j.metier || j.job_slug || j.jobSlug || j.name_slug || j.slug_metier || j.Slug_metier || '');
  }

  function getJobLabel(j, lang){
    lang = low(lang||'en');
    // common patterns
    var v =
      j['Job_title'] || j.job_title || j.jobTitle ||
      j['Job_title_'+lang.toUpperCase()] || j['job_title_'+lang] ||
      j['Nom_'+lang.toUpperCase()] || j['Nom_'+lang] ||
      j['Name_'+lang.toUpperCase()] || j['Name_'+lang] ||
      j['name_'+lang] ||
      j.name || j.Nom || j.title || j.Titre || '';
    v = norm(v);
    return v || getJobSlug(j);
  }

  function getJobSectorSlug(j){
    // gate field: must be non-empty
    var v =
      j.Secteur_slug || j.secteur_slug || j.sector_slug ||
      j['SectSecteur_slug'] || // sometimes Make typo
      j['Secteur_slug '] || j[' Secteur_slug'] ||
      j['sectorSlug'] || j.sectorSlug;
    return low(v);
  }

  function getJobSectorActivityId(j){
    // sector activity reference (can be record id, slug, object, array)
    var v =
      j['Secteur activité'] || j["Secteur d’activité"] || j["Secteur d'activite"] ||
      j.secteur_activite || j.secteurActivite || j.sector_activity || j.sectorActivity ||
      j.secteur_activite_id || j.secteurActiviteId || j.sector_id || j.sectorId;

    // normalize object/array
    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === 'object'){
      v = v.id || v.recordId || v.record_id || v.value || v.slug || v.Slug || v.name || v.label;
    }
    v = norm(v);
    return v;
  }

  function jobCountries(j){
    var v = j.countries || j.pays || j.iso || j.country || j.country_iso || j.countryIso || j.countries_iso || j.countriesIso || '';
    var out = [];
    if (Array.isArray(v)){
      v.forEach(function(x){
        if (!x) return;
        if (typeof x === 'string') out.push(up(x));
        else if (typeof x === 'object'){
          out.push(up(x.iso || x.code || x.country || x.value || x.id || ''));
        }
      });
    }else{
      var s = String(v||'');
      if (s.indexOf(',')>-1) out = s.split(',').map(function(x){ return up(x); }).filter(Boolean);
      else if (s) out = [up(s)];
    }
    out = out.filter(function(x){ return /^[A-Z]{2}$/.test(x); });
    // de-dup
    var seen = Object.create(null), clean=[];
    out.forEach(function(x){ if(!seen[x]){ seen[x]=1; clean.push(x);} });
    return clean;
  }

  // ---------- sector label resolution ----------
  function sectorLabelFromSectorTable(sectorIdOrSlug, lang){
    lang = low(lang||'en');
    var key = norm(sectorIdOrSlug);
    if (!key) return '';
    var sectors = getSectors();
    for (var i=0;i<sectors.length;i++){
      var s = sectors[i] || {};
      var sid = norm(s.id || s.recordId || s.record_id || s.ID || s.Id || '');
      var sslug = low(s.slug || s.Slug || '');
      if (sid && sid === key) {
        return norm(s['Nom_'+lang.toUpperCase()] || s['Name_'+lang.toUpperCase()] || s['Nom_'+lang] || s['Name_'+lang] || s.nom || s.name || s.label || s.titre || s.title || '') || (sid || sslug);
      }
      if (sslug && low(key) === sslug){
        return norm(s['Nom_'+lang.toUpperCase()] || s['Name_'+lang.toUpperCase()] || s['Nom_'+lang] || s['Name_'+lang] || s.nom || s.name || s.label || s.titre || s.title || '') || sslug;
      }
    }
    return '';
  }

  // ---------- mini loader (only for content area; does NOT touch fiche design) ----------
  function getContentRoot(){
    return document.getElementById('ulydia-metier-root') || document.querySelector('#ulydia-metier-root') || document.querySelector('.ulydia-metier-root') || null;
  }
  function showMiniLoader(){
    try{
      var root = getContentRoot();
      if (!root) return;
      var id = 'ulydia-mini-loader';
      if (document.getElementById(id)) return;
      var div = document.createElement('div');
      div.id = id;
      div.style.position = 'relative';
      div.style.marginTop = '12px';
      div.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;padding:16px 0;font:600 14px/1.2 Montserrat,system-ui,sans-serif;color:#6b7280;">Loading…</div>';
      root.prepend(div);
    }catch(e){}
  }
  function hideMiniLoader(){
    try{
      var el = document.getElementById('ulydia-mini-loader');
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }catch(e){}
  }

  function requestMetierRefresh(){
    if (typeof window.__ULYDIA_METIER_PAGE_REFRESH__ === 'function'){
      try{ window.__ULYDIA_METIER_PAGE_REFRESH__(); return; }catch(e){}
    }
    try { window.dispatchEvent(new CustomEvent('ulydia:routechange', { detail: getQuery() })); } catch(e) {}
  }

  // ---------- rebuild logic ----------
  function rebuildSectorOptions(selectedIso){
    var q = getQuery();
    var iso = up(selectedIso || q.country || selCountry.value);
    var lang = getFinalLangForCountry(iso);

    var jobs = getJobs();

    // usable sectors: only those where at least one job has non-empty Secteur_slug AND sector activity filled
    var usable = Object.create(null);
    jobs.forEach(function(j){
      if (!getJobSectorSlug(j)) return;
      var sid = getJobSectorActivityId(j);
      if (!sid) return;
      usable[sid] = 1;
    });

    // If there is a sectors table injected, use it but only keep usable ones.
    var sectors = getSectors();
    var derived = [];

    if (sectors.length){
      sectors.forEach(function(s){
        var sid = norm(s.id || s.recordId || s.record_id || s.ID || s.Id || '');
        if (!sid) return;
        if (!usable[sid]) return;
        derived.push({ value: sid, label: sectorLabelFromSectorTable(sid, lang) || sid });
      });
    } else {
      // derive from jobs
      Object.keys(usable).forEach(function(sid){
        derived.push({ value: sid, label: sectorLabelFromSectorTable(sid, lang) || sid });
      });
    }

    derived.sort(function(a,b){ return String(a.label||'').localeCompare(String(b.label||'')); });

    clearOptions(selSector);
    option(selSector, '', (selSector.getAttribute('data-placeholder') || 'Secteur d’activité'));
    derived.forEach(function(s){
      option(selSector, s.value, s.label);
    });
  }

  function rebuildMetierOptions(selectedIso, selectedSectorId){
    var q = getQuery();
    var iso = up(selectedIso || q.country || selCountry.value);
    var sectorId = norm(selectedSectorId || q.sector || selSector.value);

    var lang = getFinalLangForCountry(iso);
    var jobs = getJobs();

    // If sector not selected -> empty jobs list (user requirement)
    clearOptions(selMetier);
    option(selMetier, '', (selMetier.getAttribute('data-placeholder') || 'Métier'));
    if (!sectorId) {
      // count update
      var countEl0 = document.querySelector('[data-ulydia-metier-count]') || document.querySelector('.js-ulydia-metier-count');
      if (countEl0) countEl0.textContent = '0';
      return;
    }

    var filtered = jobs.filter(function(j){
      var slug = getJobSlug(j);
      if (!slug) return false;

      // Gate: must have Secteur_slug filled
      if (!getJobSectorSlug(j)) return false;

      // Must match sector activity
      var sid = getJobSectorActivityId(j);
      if (!sid || sid !== sectorId) return false;

      // Optional country filter if job declares countries list
      var cc = jobCountries(j);
      if (iso && cc.length && cc.indexOf(iso) === -1) return false;

      return true;
    });

    filtered.sort(function(a,b){
      return getJobLabel(a, lang).toLowerCase().localeCompare(getJobLabel(b, lang).toLowerCase());
    });

    filtered.forEach(function(j){
      option(selMetier, getJobSlug(j), getJobLabel(j, lang));
    });

    var countEl = document.querySelector('[data-ulydia-metier-count]') || document.querySelector('.js-ulydia-metier-count');
    if (countEl) countEl.textContent = String(filtered.length);
  }

  function applyQueryToSelects(){
    var q = getQuery();
    if (q.country) selCountry.value = q.country;
    if (q.sector)  selSector.value  = q.sector;
    if (q.metier)  selMetier.value  = q.metier;
  }

  function init(){
    var q = getQuery();
    rebuildSectorOptions(q.country || selCountry.value);
    rebuildMetierOptions(q.country || selCountry.value, q.sector || selSector.value);
    applyQueryToSelects();

    selCountry.addEventListener('change', function(){
      var iso = up(selCountry.value);
      rebuildSectorOptions(iso);
      // reset dependant
      selSector.value = '';
      rebuildMetierOptions(iso, '');
      selMetier.value = '';
      setQuery({ country: iso, sector: '', metier: '' });
      showMiniLoader();
      requestMetierRefresh();
    });

    selSector.addEventListener('change', function(){
      var iso = up(selCountry.value);
      var sector = norm(selSector.value);
      rebuildMetierOptions(iso, sector);
      selMetier.value = '';
      setQuery({ country: iso, sector: sector, metier: '' });
      showMiniLoader();
      requestMetierRefresh();
    });

    selMetier.addEventListener('change', function(){
      var iso = up(selCountry.value);
      var sector = norm(selSector.value);
      var metier = low(selMetier.value);
      setQuery({ country: iso, sector: sector, metier: metier });
      showMiniLoader();
      requestMetierRefresh();
    });

    window.addEventListener('ulydia:rendered', function(){ hideMiniLoader(); });
    window.addEventListener('popstate', function(){
      var q2 = getQuery();
      rebuildSectorOptions(q2.country || selCountry.value);
      rebuildMetierOptions(q2.country || selCountry.value, q2.sector || selSector.value);
      applyQueryToSelects();
      showMiniLoader();
      requestMetierRefresh();
    });

    if (getQuery().metier) showMiniLoader();
    log('[ULYDIA][filters] v6 ready', { jobs:getJobs().length, sectors:getSectors().length });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 0); });
  else setTimeout(init, 0);

})();
