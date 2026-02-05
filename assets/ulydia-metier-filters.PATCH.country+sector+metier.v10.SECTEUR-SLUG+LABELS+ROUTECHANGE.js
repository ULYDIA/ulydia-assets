/* =========================================================
   ULYDIA — METIER FILTERS PATCH (Sector_slug + Labels)
   - Builds Sector dropdown ONLY from jobs with Secteur_slug non-empty
   - Shows sector label in final language when available
   - Populates Metier dropdown after sector selected
   - Updates URL (?metier=...&country=...) and notifies page (routechange)
   ========================================================= */
(function(){
  if (window.__ULYDIA_FILTERS_V9__) return;
  window.__ULYDIA_FILTERS_V9__ = true;

  function norm(s){ return String(s||"").trim(); }
  function q(sel,root){ return (root||document).querySelector(sel); }
  function qa(sel,root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function getFinalLang(){
    return (window.__ULYDIA_LANG_FINAL__ || window.__ULYDIA_LANG__ || window.__ULYDIA_LANG_PICKED__ || "fr").toLowerCase();
  }
  function sectorLabel(job){
    var lang = getFinalLang();
    var k = "secteur_label_" + lang;
    return norm(job[k] || job["Secteur_label_"+lang.toUpperCase()] || job.secteur_label_fr || job.secteur_label_en || job.name || job.Secteur_slug || job.secteur_slug);
  }
  function getJobs(){
    var arr = window.__ULYDIA_FICHE_METIERS__ || [];
    return Array.isArray(arr) ? arr : [];
  }
  function getValidJobs(){
    return getJobs().filter(function(j){
      var s = norm(j.Secteur_slug || j.secteur_slug);
      return s !== "";
    });
  }
  function uniq(arr){
    var seen = Object.create(null), out=[];
    for (var i=0;i<arr.length;i++){
      var v = arr[i];
      if (!v) continue;
      if (seen[v]) continue;
      seen[v]=1; out.push(v);
    }
    return out;
  }
  function byName(a,b){
    a = String(a||"").toLowerCase(); b = String(b||"").toLowerCase();
    if (a<b) return -1; if (a>b) return 1; return 0;
  }
  function parseQS(){
    var p = new URLSearchParams(location.search || "");
    return {
      country: norm(p.get("country") || "").toUpperCase(),
      metier: norm(p.get("metier") || ""),
      sector: norm(p.get("sector") || "")
    };
  }
  function setQS(next){
    var p = new URLSearchParams(location.search || "");
    if (next.country != null) {
      if (next.country) p.set("country", next.country);
      else p.delete("country");
    }
    if (next.metier != null) {
      if (next.metier) p.set("metier", next.metier);
      else p.delete("metier");
    }
    if (next.sector != null) {
      if (next.sector) p.set("sector", next.sector);
      else p.delete("sector");
    }
    var newUrl = location.pathname + "?" + p.toString();
    history.pushState({}, "", newUrl);
    try{
      if (typeof window.__ULYDIA_METIER_PAGE_REFRESH__ === "function") {
        window.__ULYDIA_METIER_PAGE_REFRESH__();
      } else {
        window.dispatchEvent(new CustomEvent("ulydia:routechange", { detail: { url: newUrl }}));
      }
    }catch(e){}
  }

  function waitReady(cb){
    var t0 = Date.now();
    (function tick(){
      var bar = q("#ulydia-metier-filters") || q("[data-ulydia-filters]") || document;
      var selCountry = q('select[fs-cmsfilter-field="country"]', bar);
      var selSector  = q('select[fs-cmsfilter-field="sector"]', bar);
      var selMetier  = q('select[fs-cmsfilter-field="metier"]', bar);
      var jobs = getJobs();
      if (selCountry && selSector && selMetier && jobs && jobs.length){
        cb({bar:bar, selCountry:selCountry, selSector:selSector, selMetier:selMetier});
        return;
      }
      if (Date.now()-t0 > 8000) return; // stop
      setTimeout(tick, 60);
    })();
  }

  function fillOptions(sel, opts, placeholder){
    sel.innerHTML = "";
    var o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = placeholder || "—";
    sel.appendChild(o0);
    for (var i=0;i<opts.length;i++){
      var o = document.createElement("option");
      o.value = opts[i].value;
      o.textContent = opts[i].label;
      sel.appendChild(o);
    }
  }

  function boot(ui){
    var selCountry = ui.selCountry, selSector = ui.selSector, selMetier = ui.selMetier;

    // Build sector list from valid jobs
    function rebuildSectors(){
      var jobs = getValidJobs();
      var sectorMap = Object.create(null);
      jobs.forEach(function(j){
        var slug = norm(j.Secteur_slug || j.secteur_slug);
        if (!slug) return;
        if (!sectorMap[slug]) sectorMap[slug] = sectorLabel(j) || slug;
      });
      var sectors = Object.keys(sectorMap).map(function(slug){
        return { value: slug, label: sectorMap[slug] };
      }).sort(function(a,b){ return byName(a.label,b.label); });

      fillOptions(selSector, sectors, "Secteur d’activité");

      // if only one sector and none selected, keep blank (user must choose)
    }

    function rebuildMetiers(selectedSector){
      selectedSector = norm(selectedSector);
      if (!selectedSector){
        fillOptions(selMetier, [], "Métier");
        return;
      }
      var jobs = getValidJobs().filter(function(j){
        return norm(j.Secteur_slug || j.secteur_slug) === selectedSector;
      });

      // Deduplicate by slug (keep first)
      var seen = Object.create(null);
      var opts = [];
      jobs.forEach(function(j){
        var slug = norm(j.slug);
        if (!slug || seen[slug]) return;
        seen[slug]=1;
        opts.push({ value: slug, label: norm(j.name) || slug });
      });
      opts.sort(function(a,b){ return byName(a.label,b.label); });
      fillOptions(selMetier, opts, "Métier");
    }

    // Init from QS
    var qs = parseQS();
    rebuildSectors();
    if (qs.sector){
      selSector.value = qs.sector;
      rebuildMetiers(qs.sector);
    } else {
      rebuildMetiers("");
    }
    if (qs.metier){
      selMetier.value = qs.metier;
    }
    if (qs.country){
      selCountry.value = qs.country;
    }

    // Events
    selSector.addEventListener("change", function(){
      var sector = norm(selSector.value);
      rebuildMetiers(sector);
      // reset metier when sector changes
      selMetier.value = "";
      setQS({ sector: sector, metier: "" });
    });

    selMetier.addEventListener("change", function(){
      var metier = norm(selMetier.value);
      // keep sector param
      setQS({ metier: metier });
    });

    selCountry.addEventListener("change", function(){
      var country = norm(selCountry.value).toUpperCase();
      setQS({ country: country });
    });

    // Rebuild sectors if data changes
    window.addEventListener("ulydia:dataready", function(){ try{ rebuildSectors(); }catch(e){} });
  }

  waitReady(boot);
})();