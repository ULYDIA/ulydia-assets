/* ULYDIA – METIER FILTER BAR PATCH
   v2026-02-05.PATCH.FILTERS.v7 (WAIT DATA + ONLY FILTERS, NO UI SIDE EFFECTS)
   Goals (as requested):
   - Show ONLY jobs where Secteur_slug is non-empty
   - Sector dropdown built from field "Secteur activité" (only sectors that have at least one valid job)
   - Do NOT touch fiche métier rendering; only update selects + URL query
*/
(function(){
  if (window.__ULYDIA_METIER_FILTERS_V7__) return;
  window.__ULYDIA_METIER_FILTERS_V7__ = true;

  function norm(s){ return String(s||'').replace(/\u00a0/g,' ').trim(); }
  function low(s){ return norm(s).toLowerCase(); }
  function up(s){ return norm(s).toUpperCase(); }
  function esc(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function log(){ try{ console.log.apply(console, arguments);}catch(e){} }
  function warn(){ try{ console.warn.apply(console, arguments);}catch(e){} }

  function getQuery(){
    var sp = new URLSearchParams(location.search || '');
    return {
      country: up(sp.get('country') || ''),
      sector: norm(sp.get('sector') || ''),
      metier: low(sp.get('metier') || '')
    };
  }
  function setQuery(next){
    var sp = new URLSearchParams(location.search || '');
    if ('country' in next) { var v=up(next.country||''); v?sp.set('country',v):sp.delete('country'); }
    if ('sector' in next)  { var v=norm(next.sector||''); v?sp.set('sector',v):sp.delete('sector'); }
    if ('metier' in next)  { var v=low(next.metier||''); v?sp.set('metier',v):sp.delete('metier'); }
    var url = location.pathname + (sp.toString()?('?' + sp.toString()):'');
    history.pushState({}, '', url);
  }

  function getJobs(){
    var a = window.__ULYDIA_FICHE_METIERS__ || window.__ULYDIA_METIERS__ || [];
    return Array.isArray(a) ? a : [];
  }
  function getSectors(){
    var a = window.__ULYDIA_SECTEURS__ || window.__ULYDIA_SECTORS__ || window.__ULYDIA_SECTEURS_ACTIVITE__ || [];
    return Array.isArray(a) ? a : [];
  }

  function getJobSlug(j){
    return low(j.slug || j.Slug || j.metier || j.Metier || j.job_slug || j.jobSlug || j['Slug'] || '');
  }
  function getJobLabel(j){
    // for the dropdown label, prefer human title fields if available; fallback to slug
    var v = j.Job_title || j.job_title || j.title || j.Title || j.Nom || j.Nom_FR || j.name || j.Name;
    v = norm(v);
    return v || getJobSlug(j) || '—';
  }
  function getJobSectorSlug(j){
    // gate field: must be non-empty
    var v =
      j.Secteur_slug || j.secteur_slug || j.sector_slug ||
      j['SectSecteur_slug'] || j['Secteur_slug '] || j[' Secteur_slug'] ||
      j.sectorSlug || j['sectorSlug'];
    return low(v);
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
  function sectorLabelById(id){
    id = norm(id);
    if (!id) return '';
    var sectors = getSectors();
    // try match by id / slug
    for (var i=0;i<sectors.length;i++){
      var s = sectors[i] || {};
      var sid = norm(s.id || s.recordId || s.record_id || s.ID || s.Id || s.value || s.slug || s.Slug || s['Airtable_ID'] || '');
      if (sid && sid === id){
        return norm(s.nom || s.name || s.label || s.Nom || s.Nom_FR || s['Nom_FR'] || s['Name'] || s['Label'] || '');
      }
      // some datasets store sector id under "Airtable_ID"
      var aid = norm(s.Airtable_ID || s.airtable_id || '');
      if (aid && aid === id){
        return norm(s.nom || s.name || s.label || s.Nom || s.Nom_FR || s['Nom_FR'] || '');
      }
    }
    return '';
  }

  function option(sel, value, label){
    var o = document.createElement('option');
    o.value = value;
    o.innerHTML = esc(label);
    sel.appendChild(o);
  }

  function ensureSelects(){
    var all = Array.prototype.slice.call(document.querySelectorAll('#ulydia-metier-filters select'));
    if (all.length < 3) return null;
    return { country: all[0], sector: all[1], metier: all[2] };
  }

  function rebuildSectorOptions(selSector, jobs){
    // compute usable sector ids
    var usable = Object.create(null);
    for (var i=0;i<jobs.length;i++){
      var j = jobs[i];
      if (!getJobSectorSlug(j)) continue;
      var sid = getJobSectorActivityId(j);
      if (!sid) continue;
      usable[sid] = 1;
    }
    // reset options
    selSector.innerHTML = '';
    option(selSector, '', 'Secteur d’activité');

    // build list
    var ids = Object.keys(usable);
    ids.sort(function(a,b){
      var la = sectorLabelById(a) || a;
      var lb = sectorLabelById(b) || b;
      return la.toLowerCase().localeCompare(lb.toLowerCase());
    });
    for (var k=0;k<ids.length;k++){
      var id = ids[k];
      var label = sectorLabelById(id) || id; // if no sectors table, fallback id (better than blank)
      option(selSector, id, label);
    }
  }

  function rebuildMetierOptions(selMetier, jobs, sectorId){
    selMetier.innerHTML = '';
    option(selMetier, '', 'Métier');

    sectorId = norm(sectorId);
    if (!sectorId){
      // REQUIRE sector: keep empty list until chosen
      return;
    }

    // filter jobs by gate + sector activity match
    var filtered = [];
    for (var i=0;i<jobs.length;i++){
      var j = jobs[i];
      if (!getJobSlug(j)) continue;
      if (!getJobSectorSlug(j)) continue; // gate
      var sid = getJobSectorActivityId(j);
      if (!sid || sid !== sectorId) continue;
      filtered.push(j);
    }
    filtered.sort(function(a,b){
      return getJobLabel(a).toLowerCase().localeCompare(getJobLabel(b).toLowerCase());
    });
    for (var x=0;x<filtered.length;x++){
      var jj = filtered[x];
      option(selMetier, getJobSlug(jj), getJobLabel(jj));
    }
  }

  function requestRefresh(){
    // IMPORTANT: we do NOT force any rendering; we only notify.
    try{
      if (typeof window.__ULYDIA_METIER_PAGE_REFRESH__ === 'function'){
        window.__ULYDIA_METIER_PAGE_REFRESH__();
        return;
      }
    }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('ulydia:routechange', { detail: getQuery() })); }catch(e){}
  }

  function applyQueryToSelects(sel, q){
    if (q.country && sel.country.value !== q.country) sel.country.value = q.country;
    if (q.sector && sel.sector.value !== q.sector) sel.sector.value = q.sector;
    if (q.metier && sel.metier.value !== q.metier) sel.metier.value = q.metier;
  }

  function boot(){
    var sel = ensureSelects();
    if (!sel) { warn('[ULYDIA][filters] #ulydia-metier-filters selects not found'); return; }

    var jobs = getJobs();

    // Filterable jobs = ONLY those with Secteur_slug non-empty
    // (we still keep full list for sector build but gate is applied there too)
    rebuildSectorOptions(sel.sector, jobs);

    var q = getQuery();
    // apply country first (if present) – we don't filter by country here, only keep query consistent
    applyQueryToSelects(sel, q);

    // rebuild metiers based on current sector
    rebuildMetierOptions(sel.metier, jobs, q.sector || sel.sector.value);

    // listeners
    sel.sector.addEventListener('change', function(){
      var sectorId = norm(sel.sector.value);
      // update URL, clear metier
      setQuery({ sector: sectorId, metier: '' });
      rebuildMetierOptions(sel.metier, jobs, sectorId);
      requestRefresh();
    });

    sel.metier.addEventListener('change', function(){
      var metier = low(sel.metier.value);
      setQuery({ metier: metier });
      requestRefresh();
    });

    sel.country.addEventListener('change', function(){
      var iso = up(sel.country.value);
      setQuery({ country: iso, sector: '', metier: '' });
      // rebuild sectors/metiers from jobs (country filtering can be added later via MPB)
      rebuildSectorOptions(sel.sector, jobs);
      rebuildMetierOptions(sel.metier, jobs, '');
      requestRefresh();
    });
  }

  // Wait until DOM + data are present (Webflow CMS inline scripts sometimes populate late)
  function waitReady(){
    var tries = 0;
    var maxTries = 120; // ~6s at 50ms
    var t = setInterval(function(){
      tries++;
      var sel = ensureSelects();
      var jobs = getJobs();
      if (sel && jobs && jobs.length){
        clearInterval(t);
        try{ boot(); }catch(e){ warn('[ULYDIA][filters] boot error', e); }
      } else if (tries >= maxTries){
        clearInterval(t);
        warn('[ULYDIA][filters] timeout waiting for selects/jobs', { hasSelects: !!sel, jobs: jobs && jobs.length });
      }
    }, 50);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', waitReady);
  } else {
    waitReady();
  }
})();