/* ULYDIA – METIER FILTER BAR PATCH
   v2026-02-05.PATCH.FILTERS.v8 (WAIT DATA + SECTEUR ACTIVITE GATE)
   Goals:
   - Sector dropdown shows ONLY sectors that have at least 1 job with "Secteur activité" filled.
   - Jobs dropdown shows ONLY jobs with "Secteur activité" filled AND matching selected sector (and country, if you later add MPB/country gating).
   - Does NOT touch fiche métier rendering; only updates selects + URL query.
*/
(function(){
  'use strict';
  if (window.__ULYDIA_METIER_FILTERS_V8__) return;
  window.__ULYDIA_METIER_FILTERS_V8__ = true;

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

  // ---------- utils ----------
  function norm(s){ return String(s||'').replace(/\u00a0/g,' ').trim(); }
  function low(s){ return norm(s).toLowerCase(); }
  function up(s){ return norm(s).toUpperCase(); }

  function getQuery(){
    var sp = new URLSearchParams(location.search || '');
    return {
      country: up(sp.get('country') || sp.get('iso') || ''),
      sector:  norm(sp.get('sector') || ''),
      metier:  low(sp.get('metier') || sp.get('slug') || '')
    };
  }

  function setQuery(next){
    var sp = new URLSearchParams(location.search || '');
    if (next.country) sp.set('country', up(next.country)); else sp.delete('country');
    if (next.sector)  sp.set('sector', norm(next.sector)); else sp.delete('sector');
    if (next.metier)  sp.set('metier', low(next.metier)); else sp.delete('metier');
    var newUrl = location.pathname + (sp.toString() ? ('?' + sp.toString()) : '');
    history.pushState({}, '', newUrl);
  }

  function clearOptions(sel){ while (sel.options && sel.options.length) sel.remove(0); }
  function addOpt(sel, value, label){
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    sel.appendChild(o);
  }

  // ---------- data ----------
  function getJobs(){
    var arr = window.__ULYDIA_FICHE_METIERS__ || window.__ULYDIA_METIERS__ || window.__ULYDIA_JOBS__ || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }
  function getCountries(){
    var arr = window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }
  function getSectors(){
    var arr = window.__ULYDIA_SECTEURS_ACTIVITE__ || window.__ULYDIA_SECTEURS__ || window.__ULYDIA_SECTORS__ || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
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
  function getJobSectorActivityId(j){
    var v =
      j['Secteur activité'] || j["Secteur d’activité"] || j["Secteur d'activite"] ||
      j.secteur_activite || j.secteurActivite || j.sector_activity || j.sectorActivity ||
      j.secteur_activite_id || j.secteurActiviteId || j.sector_id || j.sectorId;

    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === 'object'){
      v = v.id || v.recordId || v.record_id || v.value || v.slug || v.Slug || v.name || v.label;
    }
    return norm(v);
  }

  function sectorLabelFromSectorTable(sectorIdOrSlug, lang){
    lang = low(lang||'en');
    var key = norm(sectorIdOrSlug);
    if (!key) return '';
    var sectors = getSectors();
    for (var i=0;i<sectors.length;i++){
      var s = sectors[i] || {};
      var sid = norm(s.id || s.recordId || s.record_id || s.ID || s.Id || '');
      var sslug = low(s.slug || s.Slug || '');
      if (sid && sid === key){
        return norm(s['Nom_'+lang.toUpperCase()] || s['Name_'+lang.toUpperCase()] || s['Nom_'+lang] || s['Name_'+lang] || s.nom || s.name || s.label || s.titre || s.title || '') || sid;
      }
      if (sslug && low(key) === sslug){
        return norm(s['Nom_'+lang.toUpperCase()] || s['Name_'+lang.toUpperCase()] || s['Nom_'+lang] || s['Name_'+lang] || s.nom || s.name || s.label || s.titre || s.title || '') || sslug;
      }
    }
    return '';
  }

  function validJob(j){
    // Gate on Secteur activité (this is what you have right now in the injected dataset)
    return !!getJobSlug(j) && !!getJobSectorActivityId(j);
  }

  // ---------- refresh hook ----------
  function refreshContent(){
    // If MONO exposes a refresh function, use it. Else, dispatch a generic event.
    try{
      if (typeof window.__ULYDIA_METIER_PAGE_REFRESH__ === 'function'){
        window.__ULYDIA_METIER_PAGE_REFRESH__();
        return;
      }
    }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('ulydia:routechange')); }catch(e){}
  }

  // ---------- build dropdowns ----------
  function rebuild(){
    var q = getQuery();
    var iso = q.country || (selCountry && selCountry.value ? up(selCountry.value) : '');
    var lang = getFinalLangForCountry(iso) || 'en';

    var jobsAll = getJobs();
    var jobs = jobsAll.filter(validJob);

    // SECTORS available from jobs
    var sectorMap = Object.create(null);
    for (var i=0;i<jobs.length;i++){
      var sid = getJobSectorActivityId(jobs[i]);
      if (sid) sectorMap[sid] = 1;
    }
    var sectorIds = Object.keys(sectorMap);

    // sort sectors by label (best effort)
    sectorIds.sort(function(a,b){
      var la = sectorLabelFromSectorTable(a, lang) || a;
      var lb = sectorLabelFromSectorTable(b, lang) || b;
      return la.localeCompare(lb);
    });

    // rebuild sector select
    clearOptions(selSector);
    addOpt(selSector, '', 'Secteur d’activité');
    for (var s=0;s<sectorIds.length;s++){
      var id = sectorIds[s];
      var label = sectorLabelFromSectorTable(id, lang) || id;
      addOpt(selSector, id, label);
    }

    // restore sector selection from query if still valid
    if (q.sector && sectorMap[q.sector]) selSector.value = q.sector;
    else if (!sectorMap[selSector.value]) selSector.value = '';

    // rebuild jobs select
    clearOptions(selMetier);
    addOpt(selMetier, '', 'Métier');

    if (!selSector.value){
      // require sector selection
      selMetier.disabled = true;
      return;
    }
    selMetier.disabled = false;

    var sectorPick = selSector.value;
    var filtered = jobs.filter(function(j){
      return getJobSectorActivityId(j) === sectorPick;
    });

    filtered.sort(function(a,b){
      return getJobLabel(a, lang).localeCompare(getJobLabel(b, lang));
    });

    for (var k=0;k<filtered.length;k++){
      var j = filtered[k];
      addOpt(selMetier, getJobSlug(j), getJobLabel(j, lang));
    }

    // restore metier selection if still available
    if (q.metier){
      selMetier.value = q.metier;
      if (selMetier.value !== q.metier) selMetier.value = '';
    }
  }

  // ---------- events ----------
  function onSectorChange(){
    var q = getQuery();
    q.sector = norm(selSector.value);
    q.metier = ''; // reset job when sector changes
    setQuery(q);
    rebuild();
    refreshContent();
  }

  function onMetierChange(){
    var q = getQuery();
    q.metier = low(selMetier.value);
    setQuery(q);
    refreshContent();
  }

  selSector.addEventListener('change', onSectorChange);
  selMetier.addEventListener('change', onMetierChange);

  // Country change is handled elsewhere (your UI v2). We still rebuild when URL changes.
  window.addEventListener('popstate', function(){ try{ rebuild(); }catch(e){} });

  // ---------- wait for data ----------
  var tries = 0;
  (function wait(){
    tries++;
    var jobsReady = Array.isArray(window.__ULYDIA_FICHE_METIERS__) || Array.isArray(window.__ULYDIA_METIERS__) || Array.isArray(window.__ULYDIA_JOBS__);
    var countriesReady = Array.isArray(window.__ULYDIA_COUNTRIES__) || Array.isArray(window.__ULYDIA_PAYS__);
    if (jobsReady && countriesReady){
      try{ rebuild(); }catch(e){ warn('[ULYDIA][filters] rebuild error', e); }
      return;
    }
    if (tries < 120) return setTimeout(wait, 100); // up to 12s
    warn('[ULYDIA][filters] data not ready (jobsReady=', jobsReady, ', countriesReady=', countriesReady, ')');
  })();

})();