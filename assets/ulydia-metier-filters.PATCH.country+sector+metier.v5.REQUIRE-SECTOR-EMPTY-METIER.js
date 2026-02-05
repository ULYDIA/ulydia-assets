/* ULYDIA – METIER PAGE FILTERS PATCH (country + sector + metier) + content-only refresh hook
   Version: v2026-02-04.PATCH.FILTERS.v1
   Notes:
   - Keeps the filter/search bar (selects) intact.
   - Rebuilds "Secteur d’activité" + "Métier" options based on selections.
   - Updates URL params (?country=FR&sector=paramedical&metier=analyste-juridique) without full page reload when possible.
   - Shows a lightweight overlay loader on the content area while the metier page script refreshes.
*/
(function(){
  'use strict';
  if (window.__ULYDIA_FILTERS_PATCH_V1__) return;
  window.__ULYDIA_FILTERS_PATCH_V1__ = true;

  var DEBUG = false;

  function log(){ if(DEBUG) try{ console.log.apply(console, arguments); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, arguments); }catch(e){} }

  // ----------- DOM: find selects (supports your current HTML with fs-cmsfilter-field) -----------
  function qs(sel){ return document.querySelector(sel); }

  var selCountry = qs('select[fs-cmsfilter-field="country"]') || qs('#ulydia-metier-filters select[fs-cmsfilter-field="country"]') || qs('#ulydia-metier-filters select[name="country"]');
  var selSector  = qs('select[fs-cmsfilter-field="sector"]')  || qs('#ulydia-metier-filters select[fs-cmsfilter-field="sector"]')  || qs('#ulydia-metier-filters select[name="sector"]');
  var selMetier  = qs('select[fs-cmsfilter-field="metier"]')  || qs('#ulydia-metier-filters select[fs-cmsfilter-field="metier"]')  || qs('#ulydia-metier-filters select[name="metier"]');

  // If markup differs, try to fallback by label order
  if (!selCountry || !selSector || !selMetier) {
    var all = Array.prototype.slice.call(document.querySelectorAll('#ulydia-metier-filters select'));
    if (all.length >= 3){
      selCountry = selCountry || all[0];
      selSector  = selSector  || all[1];
      selMetier  = selMetier  || all[2];
    }
  }

  if (!selCountry || !selSector || !selMetier){
    warn('[ULYDIA] Filters patch: selects not found. Ensure #ulydia-metier-filters contains 3 <select> elements.');
    return;
  }

  // ----------- Data sources (populated by your CMS readers / wrappers) -----------
  // Expected job object (best-effort):
  // { slug, title, name_fr/name_en..., sector_slug/sector_id, sectors[], countries[]/pays[], lang? }
  function getJobs(){
    var arr = window.__ULYDIA_FICHE_METIERS__ || window.__ULYDIA_JOBS__ || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.filter(Boolean);
  }

  function getCountries(){
    var arr = window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.filter(Boolean);
  }

  function getSectors(){
    var arr = window.__ULYDIA_SECTEURS__ || window.__ULYDIA_SECTORS__ || window.__ULYDIA_SECTEURS_ACTIVITE__ || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.filter(Boolean);
  }

  function norm(s){ return String(s||'').trim(); }
  function low(s){ return norm(s).toLowerCase(); }
  function up(s){ return norm(s).toUpperCase(); }

  function getQuery(){
    var sp = new URLSearchParams(location.search || '');
    return {
      country: up(sp.get('country') || sp.get('iso') || ''),
      sector: low(sp.get('sector') || ''),
      metier: low(sp.get('metier') || sp.get('slug') || '')
    };
  }

  function setQuery(next){
    var sp = new URLSearchParams(location.search || '');
    if (next.country) sp.set('country', next.country); else sp.delete('country');
    if (next.sector) sp.set('sector', next.sector); else sp.delete('sector');
    if (next.metier) sp.set('metier', next.metier); else sp.delete('metier');
    var newUrl = location.pathname + '?' + sp.toString();
    history.pushState({}, '', newUrl);
  }

  function getFinalLangForCountry(iso){
    iso = up(iso);
    // 1) countries array {iso, lang}
    var c = getCountries().find(function(x){ return up(x.iso) === iso; });
    var lang = c && (c.lang || c.final_lang || c.language || c.lang_final);
    if (lang) return low(lang).slice(0,2);

    // 2) optional catalog map
    var cat = window.__ULYDIA_CATALOG__ || window.__ULYDIA_COUNTRY_CATALOG__ || null;
    if (cat && typeof cat === 'object'){
      var cc = cat[iso] || cat[low(iso)] || null;
      var l2 = cc && (cc.lang || cc.finalLang || cc.language);
      if (l2) return low(l2).slice(0,2);
    }

    // 3) global
    var g = window.__ULYDIA_LANG_FINAL__ || window.__ULYDIA_LANG__ || document.documentElement.getAttribute('lang') || 'fr';
    return low(g).slice(0,2) || 'fr';
  }

  function pickLabel(obj, lang){
    lang = low(lang||'fr').slice(0,2);
    // Try common patterns
    return (
      obj['Nom_'+lang.toUpperCase()] ||
      obj['name_'+lang] ||
      obj['title_'+lang] ||
      obj['label_'+lang] ||
      obj['Nom_FR'] || obj.name || obj.title || obj.label || obj.slug || obj.Secteur_ID || obj.Sector_ID || ''
    );
  }

  function getJobLabel(job, lang){
    lang = low(lang||'fr').slice(0,2);
    return (
      job['Job_title_'+lang.toUpperCase()] ||
      job['Job_title'] ||
      job['title_'+lang] ||
      job['Nom_'+lang.toUpperCase()] ||
      job['name_'+lang] ||
      job['title'] ||
      job['name'] ||
      job['Nom_FR'] ||
      job['Nom_interne'] ||
      job['slug'] ||
      ''
    );
  }

  function getJobSlug(job){
    return low(job.slug || job.Job_Slug || job.job_slug || job.Slug || job.slug_fr || job.Slug_FR || '');
  }

function getJobSectorSlug(job){
  // Accept many possible keys coming from Airtable/Webflow exports
  var s =
    job.Secteur_slug ||
    job['Secteur_slug'] ||
    job['Secteur slug'] ||
    job['Secteur_slug '] ||
    job.secteur_slug ||
    job.sector_slug ||
    job['sector_slug'] ||
    job['Sector_slug'] ||
    job['Sector Slug'] ||
    job['Secteur_activite_slug'] ||
    job['Secteur_activite'] ||
    job.secteur ||
    job.sector ||
    '';
  // Sometimes sector is an object {slug, ...}
  if (s && typeof s === 'object' && !Array.isArray(s)){
    s = s.slug || s.Slug || s.id || s.ID || '';
  }
  if (Array.isArray(s)) s = s[0] || '';
  return String(s || '').trim().toLowerCase();
}


  function jobCountries(job){
    var a = job.countries || job.pays || job.Pays || job.Pays_de_publication || job.Pays_de_publication_ids || job.country_codes || job.Country_codes || job.country || job.iso || '';
    if (Array.isArray(a)) return a.map(up).filter(Boolean);
    var s = norm(a);
    if (!s) return [];
    // "FR,DE" or "FR|DE"
    return s.split(/[\s,;|]+/).map(up).filter(Boolean);
  }

  function option(el, value, label){
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    el.appendChild(o);
    return o;
  }

  function clearOptions(el){
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ----------- Loader overlay confined to content area -----------
  function getContentRoot(){
    return document.getElementById('ulydia-metier-root') || document.querySelector('[data-ulydia-metier-root]') || document.querySelector('.ulydia-metier-root');
  }

  function ensureMiniLoader(){
    var root = getContentRoot();
    if (!root) return null;
    var id = 'ulydia-mini-loader';
    var existing = document.getElementById(id);
    if (existing) return existing;

    // Ensure root is positioned
    var st = window.getComputedStyle(root);
    if (st.position === 'static') root.style.position = 'relative';

    var ov = document.createElement('div');
    ov.id = id;
    ov.setAttribute('aria-hidden','true');
    ov.style.position = 'absolute';
    ov.style.left = '0';
    ov.style.top = '0';
    ov.style.right = '0';
    ov.style.bottom = '0';
    ov.style.background = 'rgba(255,255,255,0.75)';
    ov.style.backdropFilter = 'blur(2px)';
    ov.style.display = 'none';
    ov.style.alignItems = 'center';
    ov.style.justifyContent = 'center';
    ov.style.zIndex = '999';

    var box = document.createElement('div');
    box.style.fontFamily = 'Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    box.style.fontWeight = '600';
    box.style.color = '#111827';
    box.style.padding = '10px 14px';
    box.style.borderRadius = '999px';
    box.style.boxShadow = '0 8px 28px rgba(0,0,0,0.08)';
    box.style.background = '#fff';
    box.textContent = 'Loading…';

    ov.appendChild(box);
    root.appendChild(ov);
    return ov;
  }

  function showMiniLoader(){
    var ov = ensureMiniLoader();
    if (ov) ov.style.display = 'flex';
  }
  function hideMiniLoader(){
    var ov = document.getElementById('ulydia-mini-loader');
    if (ov) ov.style.display = 'none';
  }

  // If your main MONO exposes hooks, we call them; otherwise, we just dispatch an event.
  function requestMetierRefresh(){
    // Prefer explicit hook if present
    if (typeof window.__ULYDIA_METIER_PAGE_REFRESH__ === 'function'){
      try { window.__ULYDIA_METIER_PAGE_REFRESH__(); return; } catch(e){}
    }
    // Generic custom event consumed by the mono
    try {
      window.dispatchEvent(new CustomEvent('ulydia:routechange', { detail: getQuery() }));
    } catch(e) {}
    // Fallback: full reload (only if nothing handles it)
    setTimeout(function(){
      if (typeof window.__ULYDIA_METIER_PAGE_REFRESH__ === 'function') return;
      // If page didn't render anything new after 600ms, reload.
      // We can't perfectly detect; so we only reload if root is empty.
      var root = getContentRoot();
      if (root && root.textContent.trim().length === 0) location.reload();
    }, 600);
  }

  // ----------- Build Sector options (language-aware) -----------
  function rebuildSectorOptions(selectedIso){
    var lang = getFinalLangForCountry(selectedIso || getQuery().country);
    var sectors = getSectors();

    // Build a set of sector slugs that are actually usable:
    // we only want sectors for which at least one job has a non-empty sector_slug
    // (user requirement: hide legacy jobs with missing Secteur_slug).
    var jobsAll = getJobs();
    var usableSector = Object.create(null);
    jobsAll.forEach(function(j){
      var s = getJobSectorSlug(j);
      if (s) usableSector[s] = 1;
    });

    // If no sector table injected, derive from jobs
    if (!sectors.length){
      var jobs = getJobs();
      var seen = Object.create(null);
      sectors = jobs.map(function(j){
        var slug = getJobSectorSlug(j);
        if (!slug || seen[slug]) return null;
        seen[slug] = 1;
        return { slug: slug, label: slug };
      }).filter(Boolean);
    }

    clearOptions(selSector);
    option(selSector, '', (selSector.getAttribute('data-placeholder') || 'Secteur d’activité'));

    sectors.forEach(function(s){
      var slug = low(s.slug || s.Secteur_ID || s.Sector_ID || s.Slug || s.Slug_FR || '');
      if (!slug) return;
      if (!usableSector[slug]) return;
      var label = pickLabel(s, lang) || slug;
      option(selSector, slug, label);
    });
  }

  // ----------- Build Metier options filtered by country + sector -----------
  function rebuildMetierOptions(selectedIso, selectedSector){
    var q = getQuery();
    var iso = up(selectedIso || q.country);
    var sectorSlug = low(selectedSector || q.sector);

    // Requirement: do not show any job until a sector is selected
    if (!sectorSlug){
      clearOptions(selMetier);
      option(selMetier, '', (selMetier.getAttribute('data-placeholder') || 'Métier'));
      // Optional: count -> 0
      var countEl0 = document.querySelector('[data-ulydia-metier-count]') || document.querySelector('.js-ulydia-metier-count');
      if (countEl0) countEl0.textContent = '0';
      return;
    }

    var lang = getFinalLangForCountry(iso);
    var jobs = getJobs();

    // Requirement: do not list jobs until a sector is selected
    if (!sectorSlug){
      clearOptions(selMetier);
      option(selMetier, '', (selMetier.getAttribute('data-placeholder') || 'Métier'));
      // Update "count" label if present
      var countEl0 = document.querySelector('[data-ulydia-metier-count]') || document.querySelector('.js-ulydia-metier-count');
      if (countEl0) countEl0.textContent = "0";
      return;
    }

    // Filter available jobs by iso (if job has country list)
    var filtered = jobs.filter(function(j){
      var slug = getJobSlug(j);
      if (!slug) return false;

      // Critical: only show jobs that have a sector slug
      // (user requirement: hide records where Secteur_slug is empty).
      var jobSector = getJobSectorSlug(j);
      if (!jobSector) return false;

      // Country filter: only if we have a list; if empty, treat as "global"
      var cc = jobCountries(j);
      if (iso && cc.length && cc.indexOf(iso) === -1) return false;

      // Sector filter
      if (sectorSlug){
        if (jobSector !== sectorSlug) return false;
      }
      return true;
    });

    // Sort by label
    filtered.sort(function(a,b){
      var la = getJobLabel(a, lang).toLowerCase();
      var lb = getJobLabel(b, lang).toLowerCase();
      return la.localeCompare(lb);
    });

    clearOptions(selMetier);
    option(selMetier, '', (selMetier.getAttribute('data-placeholder') || 'Métier'));

    filtered.forEach(function(j){
      var slug = getJobSlug(j);
      var label = getJobLabel(j, lang);
      option(selMetier, slug, label);
    });

    // Optional: update "count" label if present
    var countEl = document.querySelector('[data-ulydia-metier-count]') || document.querySelector('.js-ulydia-metier-count');
    if (countEl) countEl.textContent = String(filtered.length);
  }

  function applyQueryToSelects(){
    var q = getQuery();
    if (q.country) selCountry.value = q.country;
    // For sector / metier, values are slugs
    if (q.sector) selSector.value = q.sector;
    if (q.metier) selMetier.value = q.metier;
  }

  function init(){
    var q = getQuery();
    rebuildSectorOptions(q.country || selCountry.value);
    rebuildMetierOptions(q.country || selCountry.value, q.sector || selSector.value);
    applyQueryToSelects();

    // Wire events
    selCountry.addEventListener('change', function(){
      var iso = up(selCountry.value);
      // Reset dependant selects
      rebuildSectorOptions(iso);
      rebuildMetierOptions(iso, low(selSector.value));
      // Keep metier empty until user picks again
      selMetier.value = '';
      setQuery({ country: iso, sector: low(selSector.value), metier: '' });
      showMiniLoader();
      requestMetierRefresh();
    });

    selSector.addEventListener('change', function(){
      var iso = up(selCountry.value);
      var sector = low(selSector.value);
      rebuildMetierOptions(iso, sector);
      selMetier.value = '';
      setQuery({ country: iso, sector: sector, metier: '' });
      showMiniLoader();
      requestMetierRefresh();
    });

    selMetier.addEventListener('change', function(){
      var iso = up(selCountry.value);
      var sector = low(selSector.value);
      var metier = low(selMetier.value);
      setQuery({ country: iso, sector: sector, metier: metier });
      showMiniLoader();
      requestMetierRefresh();
    });

    // Hide loader when mono signals done
    window.addEventListener('ulydia:rendered', function(){ hideMiniLoader(); });

    // If navigation uses back/forward
    window.addEventListener('popstate', function(){
      var q2 = getQuery();
      rebuildSectorOptions(q2.country || selCountry.value);
      rebuildMetierOptions(q2.country || selCountry.value, q2.sector || selSector.value);
      applyQueryToSelects();
      showMiniLoader();
      requestMetierRefresh();
    });

    // First load: if a metier is already selected, show loader until render finishes
    if (getQuery().metier) showMiniLoader();
  }

  // Wait a tick so CMS reader scripts can populate window.__ULYDIA_* arrays
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 0); });
  } else {
    setTimeout(init, 0);
  }
})();
