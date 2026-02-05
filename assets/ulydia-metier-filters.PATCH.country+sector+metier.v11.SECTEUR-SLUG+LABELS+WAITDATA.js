/* ULYDIA – METIER FILTER BAR PATCH
   v2026-02-05.PATCH.FILTERS.v11 (SECTOR_SLUG + LABELS + WAIT DATA)
   - Sectors: built ONLY from jobs where Secteur_slug / secteur_slug is non-empty
   - Sector label: uses secteur_label_{finalLang} if available, else prettifies slug
   - Jobs dropdown: filtered by selected sector (and optional country)
   - URL sync + emits: ulydia:routechange
*/
(function(){
  "use strict";
  if (window.__ULYDIA_METIER_FILTERS_V11__) return;
  window.__ULYDIA_METIER_FILTERS_V11__ = true;

  function norm(s){ return String(s||"").replace(/\u00A0/g," ").replace(/\s+/g," ").trim(); }
  function up(s){ return norm(s).toUpperCase(); }
  function safeSlug(s){
    s = norm(s).toLowerCase();
    try{ s = s.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }catch(e){}
    s = s.replace(/[’']/g,"-").replace(/[^a-z0-9]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
    return s;
  }
  function prettySlug(slug){
    var s = norm(slug);
    if (!s) return "";
    if (/^[a-z0-9-]+$/.test(s) && s.indexOf("-")!==-1){
      return s.split("-").filter(Boolean).map(function(w){ return w.charAt(0).toUpperCase()+w.slice(1); }).join(" ");
    }
    return s;
  }

  function getFinalLang(){
    var l = (window.__ULYDIA_LANG_FINAL__ || window.__ULYDIA_FINAL_LANG__ || "").toString().toLowerCase();
    if (!l) {
      try{
        var nav = (navigator.language||"").toLowerCase().split("-")[0];
        l = nav;
      }catch(e){}
    }
    if (l !== "fr" && l !== "en" && l !== "de" && l !== "es" && l !== "it") l = "en";
    return l;
  }

  function getJobs(){
    return (window.__ULYDIA_FICHE_METIERS__ || window.__ULYDIA_FICHE_METIERS || window.__ULYDIA_FICHE_METIERS__ || []);
  }
  function getCountries(){
    return (window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || []);
  }

  function q(){
    var sp = new URLSearchParams(location.search);
    return {
      country: up(sp.get("country") || sp.get("pays") || ""),
      sector: norm(sp.get("sector") || sp.get("secteur") || ""),
      metier: norm(sp.get("metier") || "")
    };
  }
  function setQ(next){
    var sp = new URLSearchParams(location.search);
    if (next.country) sp.set("country", next.country); else sp.delete("country");
    if (next.sector) sp.set("sector", next.sector); else { sp.delete("sector"); sp.delete("secteur"); }
    if (next.metier) sp.set("metier", next.metier); else sp.delete("metier");
    var url = location.pathname + "?" + sp.toString();
    history.pushState({}, "", url);
    try{ window.dispatchEvent(new CustomEvent("ulydia:routechange", { detail: { url: url, params: next } })); }catch(e){}
  }

  function findSelect(field){
    // supports your markup: <select fs-cmsfilter-field="country|sector|metier">
    var sel = document.querySelector('select[fs-cmsfilter-field="'+field+'"]')
           || document.querySelector('select[data-field="'+field+'"]')
           || document.querySelector('select[name="'+field+'"]')
           || null;
    return sel;
  }

  function build(){
    var selCountry = findSelect("country");
    var selSector  = findSelect("sector");
    var selMetier  = findSelect("metier");
    if (!selSector || !selMetier) return false;

    var jobs = getJobs();
    if (!Array.isArray(jobs) || !jobs.length) return false;

    var lang = getFinalLang();

    function sectorSlugOf(j){
      return norm(j && (j.Secteur_slug || j.secteur_slug || j.sector_slug || j.sectorSlug) || "");
    }
    function sectorLabelOf(j){
      var key = "secteur_label_" + lang;
      return norm(j && (j[key] || j["secteur_label_fr"] || j["secteur_label_en"] || j["sector_label_"+lang]) || "");
    }
    function jobSlugOf(j){
      return norm(j && (j.slug || j.Slug || j.metier_slug || j.metierSlug) || "");
    }
    function jobNameOf(j){
      return norm(j && (j.name || j.Nom || j.title || j.Job_title || j.job_title || jobSlugOf(j)) || "");
    }

    // Only jobs with sector_slug non empty
    var valid = jobs.filter(function(j){
      return sectorSlugOf(j).trim() !== "" && jobSlugOf(j).trim() !== "";
    });

    // Build sector options based on jobs
    var sectors = {};
    valid.forEach(function(j){
      var ss = sectorSlugOf(j);
      if (!ss) return;
      if (!sectors[ss]){
        var lab = sectorLabelOf(j) || prettySlug(ss) || ss;
        sectors[ss] = { slug:ss, label: lab, count: 1 };
      }else{
        sectors[ss].count += 1;
        // if label was missing before, try to fill now
        if (!sectors[ss].label || sectors[ss].label === sectors[ss].slug){
          var lab2 = sectorLabelOf(j);
          if (lab2) sectors[ss].label = lab2;
        }
      }
    });

    var sectorList = Object.keys(sectors).map(function(k){ return sectors[k]; })
      .sort(function(a,b){ return a.label.localeCompare(b.label); });

    // Fill sector select
    function setOptions(select, items, placeholder){
      while (select.firstChild) select.removeChild(select.firstChild);
      var opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = placeholder || "";
      select.appendChild(opt0);
      items.forEach(function(it){
        var o = document.createElement("option");
        o.value = it.value;
        o.textContent = it.label;
        select.appendChild(o);
      });
    }

    setOptions(selSector, sectorList.map(function(s){
      return { value: s.slug, label: s.label };
    }), selSector.querySelector("option") ? selSector.querySelector("option").textContent : "Secteur d’activité");

    // Jobs list builder depending on selected sector (+ optional country later)
    function rebuildJobs(){
      var cur = q();
      var selectedSector = norm(selSector.value || cur.sector);
      // if none selected: keep jobs empty (as requested)
      var jobItems = [];
      if (selectedSector){
        var sectFiltered = valid.filter(function(j){ return sectorSlugOf(j) === selectedSector; });
        // (optional: country filtering could be added here when MPB is ready)
        jobItems = sectFiltered
          .map(function(j){ return { value: jobSlugOf(j), label: jobNameOf(j) }; })
          .sort(function(a,b){ return a.label.localeCompare(b.label); });
      }
      setOptions(selMetier, jobItems, selMetier.querySelector("option") ? selMetier.querySelector("option").textContent : "Métier");

      // if URL metier is not in list, clear it
      if (cur.metier){
        var exists = jobItems.some(function(it){ return it.value === cur.metier; });
        if (!exists){
          setQ({ country: cur.country || "", sector: selectedSector || "", metier: "" });
        }else{
          selMetier.value = cur.metier;
        }
      }
    }

    // Init values from URL
    var cur = q();
    if (cur.sector) selSector.value = cur.sector;
    rebuildJobs();

    selSector.addEventListener("change", function(){
      var cur2 = q();
      var nextSector = norm(selSector.value);
      setQ({ country: cur2.country || "", sector: nextSector || "", metier: "" });
      rebuildJobs();
    });

    selMetier.addEventListener("change", function(){
      var cur2 = q();
      var nextMetier = norm(selMetier.value);
      setQ({ country: cur2.country || "", sector: norm(selSector.value||cur2.sector) || "", metier: nextMetier || "" });
    });

    // Country select (if exists): keep behaviour minimal (URL sync only)
    if (selCountry){
      if (cur.country) selCountry.value = cur.country;
      selCountry.addEventListener("change", function(){
        var cur2 = q();
        setQ({ country: up(selCountry.value), sector: cur2.sector || "", metier: cur2.metier || "" });
      });
    }

    return true;
  }

  function wait(){
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      try{
        var ok = build();
        if (ok || tries > 80){
          clearInterval(timer);
        }
      }catch(e){
        // keep trying; never crash the page
        if (tries > 80) clearInterval(timer);
      }
    }, 120);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wait);
  else wait();
})();
