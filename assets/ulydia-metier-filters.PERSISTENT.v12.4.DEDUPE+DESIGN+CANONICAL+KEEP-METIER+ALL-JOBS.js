/* ULYDIA – METIER FILTER BAR (PERSISTENT) — DOWNLOADABLE
   v2026-02-05.PATCH.FILTERS.v12.4 (CANONICAL-URL-ORDER + KEEP-METIER-ON-LOAD + JOBS-ALL-WHEN-NO-SECTOR) (COUNTRY+SECTOR+METIER, COUNTRY-AVAILABILITY, PERSISTENT BAR)
   ✅ Bar is independent: never re-mounted, never wiped
   ✅ Only the fiche (renderer) should update when query changes
   ✅ Jobs list shows ONLY jobs available for selected country (based on finalLang)
   ✅ Sector list is built from available jobs (for selected country)
   ✅ URL sync + emits: ulydia:routechange
   Works with your HTML:
     <select id="uf-country"> <select id="uf-sector"> <select id="uf-metier">
   Also supports:
     select[fs-cmsfilter-field="country|sector|metier"]
*/
(function(){
  // ✅ DEDUPE-BAR: keep only one filters bar in DOM (Webflow symbols can duplicate embeds)
  try{
    var bars = document.querySelectorAll("#ulydia-metier-filters");
    if (bars && bars.length > 1){
      for (var i=1;i<bars.length;i++){
        bars[i].parentNode && bars[i].parentNode.removeChild(bars[i]);
      }
    }
    // also dedupe selects by id (in case the bar is duplicated with same inner ids)
    ["uf-country","uf-sector","uf-metier"].forEach(function(id){
      var els = document.querySelectorAll("#"+id);
      if (els && els.length>1){
        for (var j=1;j<els.length;j++){
          var n = els[j];
          // remove wrapper if possible
          if (n && n.closest) {
            var w = n.closest(".filter") || n.closest("section") || n.parentNode;
            if (w && w.parentNode) w.parentNode.removeChild(w);
            else if (n.parentNode) n.parentNode.removeChild(n);
          }
        }
      }
    });
  }catch(e){}

  // ✅ BAR-DESIGN: inject minimal CSS so the bar matches the fiche style
  try{
    if (!document.getElementById("ulydia-metier-filters-css")){
      var st = document.createElement("style");
      st.id = "ulydia-metier-filters-css";
      st.textContent = `
        #ulydia-metier-filters{
          display:flex; gap:12px; align-items:center; justify-content:center;
          padding:16px; margin:18px auto; max-width:1100px;
          background:#fff; border:1px solid rgba(148,163,184,.35);
          border-radius:18px; box-shadow:0 12px 30px rgba(15,23,42,.08);
          position:relative; z-index:50;
        }
        #ulydia-metier-filters .filter{ display:block; }
        #ulydia-metier-filters select{
          display:block; min-width:220px;
          padding:10px 12px; border-radius:12px;
          border:1px solid rgba(148,163,184,.55);
          background:#fff;
          font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
          font-size:14px;
          outline:none;
        }
        #ulydia-metier-filters select:focus{
          border-color: rgba(99,102,241,.75);
          box-shadow:0 0 0 3px rgba(99,102,241,.18);
        }
        @media(max-width:768px){
          #ulydia-metier-filters{ flex-direction:column; align-items:stretch; }
          #ulydia-metier-filters select{ min-width:unset; width:100%; }
        }
      `;
      document.head.appendChild(st);
    }
  }catch(e){}

  "use strict";
  if (window.__ULYDIA_METIER_FILTERS_V12_4__) return;
  window.__ULYDIA_METIER_FILTERS_V12_4__ = true;

  // ---------------- helpers ----------------
  function norm(s){ return String(s||"").replace(/\u00A0/g," ").replace(/\s+/g," ").trim(); }
  function up(s){ return norm(s).toUpperCase(); }
  function prettySlug(slug){
    var s = norm(slug);
    if (!s) return "";
    if (/^[a-z0-9-]+$/.test(s) && s.indexOf("-")!==-1){
      return s.split("-").filter(Boolean).map(function(w){ return w.charAt(0).toUpperCase()+w.slice(1); }).join(" ");
    }
    return s;
  }
  function normLang(l){
    l = String(l||"").toLowerCase().trim();
    if (l.indexOf("fr") === 0) return "fr";
    if (l.indexOf("en") === 0) return "en";
    if (l.indexOf("de") === 0) return "de";
    if (l.indexOf("es") === 0) return "es";
    if (l.indexOf("it") === 0) return "it";
    return "en";
  }

  function getJobs(){
    return (window.__ULYDIA_FICHE_METIERS__ || window.__ULYDIA_FICHE_METIERS || []);
  }
  function getCountries(){
    return (window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || []);
  }

  // Final language per ISO (catalog > countries cms > fallback)
  function getFinalLangForIso(iso){
    iso = up(iso);
    try{
      var cat = (window.__ULYDIA_CATALOG__ && window.__ULYDIA_CATALOG__.countries) || null;
      if (Array.isArray(cat) && iso){
        for (var i=0;i<cat.length;i++){
          var c = cat[i];
          var ciso = up(c && (c.iso || c.code_iso || c.codeIso || c.country_code || c.code || c.countryCode));
          if (ciso === iso){
            return normLang(c.langue_finale || c.lang_finale || c.final_lang || c.finalLang || c.lang || c.language || c.default_lang);
          }
        }
      }
    }catch(e){}

    try{
      var arr = getCountries();
      if (Array.isArray(arr) && iso){
        for (var j=0;j<arr.length;j++){
          var c2 = arr[j];
          if (up(c2.iso) === iso){
            return normLang(c2.langue_finale || c2.lang_finale || c2.final_lang || c2.finalLang || c2.lang || c2.language || c2.default_lang);
          }
        }
      }
    }catch(e){}

    // fallback: keep current (if MONO already computed it)
    var wl = (window.__ULYDIA_LANG_FINAL__ || window.__ULYDIA_FINAL_LANG__ || "");
    if (wl) return normLang(wl);
    try{ return normLang((navigator.language||"en").split("-")[0]); }catch(e){}
    return "en";
  }

  function q(){
    var sp = new URLSearchParams(location.search);
    return {
      country: up(sp.get("country") || sp.get("pays") || ""),
      sector:  norm(sp.get("sector")  || sp.get("secteur") || ""),
      metier:  norm(sp.get("metier")  || "")
    };
  }

  function setQ(next){
    // Force canonical URL order:
    // /metier?metier=...&country=...&sector=...
    var metier  = (next.metier  || "").toString().trim();
    var country = (next.country || "").toString().trim();
    var sector  = (next.sector  || "").toString().trim();

    var parts = [];
    if (metier)  parts.push("metier=" + encodeURIComponent(metier));
    if (country) parts.push("country=" + encodeURIComponent(country));
    if (sector)  parts.push("sector=" + encodeURIComponent(sector));

    var path = "/metier";
    var qs = parts.length ? ("?" + parts.join("&")) : "";
    var url = path + qs;

    // Avoid infinite loops: only push if changed
    if (url !== (location.pathname + location.search)){
      history.pushState({}, "", url);
    }

    try{
      window.dispatchEvent(new CustomEvent("ulydia:routechange", { detail: { url:url, params: next } }));
    }catch(e){}
  }

  function findSelect(field){
    // 1) explicit ids (your current markup)
    if (field === "country") return document.getElementById("uf-country")
                          || document.querySelector('select[fs-cmsfilter-field="country"]')
                          || document.querySelector('select[name="country"]');
    if (field === "sector")  return document.getElementById("uf-sector")
                          || document.querySelector('select[fs-cmsfilter-field="sector"]')
                          || document.querySelector('select[name="sector"]');
    if (field === "metier")  return document.getElementById("uf-metier")
                          || document.querySelector('select[fs-cmsfilter-field="metier"]')
                          || document.querySelector('select[name="metier"]');
    return null;
  }

  function setOptions(select, items, placeholder){
    while (select.firstChild) select.removeChild(select.firstChild);
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder || "";
    select.appendChild(opt0);
    for (var i=0;i<items.length;i++){
      var it = items[i];
      var o = document.createElement("option");
      o.value = it.value;
      o.textContent = it.label;
      select.appendChild(o);
    }
  }

  // ---------------- main ----------------
  function buildOnce(){
    // Prevent remount effects
    if (document.documentElement.getAttribute("data-ulydia-filters-mounted") === "1") return true;

    var selCountry = findSelect("country");
    var selSector  = findSelect("sector");
    var selMetier  = findSelect("metier");
    if (!selSector || !selMetier) return false;

    var jobs = getJobs();
    if (!Array.isArray(jobs) || !jobs.length) return false;

    // Accessors
    function sectorSlugOf(j){
      return norm(j && (j.Secteur_slug || j.secteur_slug || j.sector_slug || j.sectorSlug) || "");
    }
    function sectorLabelOf(j, lang){
      var key = "secteur_label_" + lang;
      return norm(j && (j[key] || j["secteur_label_fr"] || j["secteur_label_en"] || j["sector_label_"+lang]) || "");
    }
    function jobSlugOf(j){
      return norm(j && (j.slug || j.Slug || j.metier_slug || j.metierSlug) || "");
    }
    function jobNameOf(j){
      return norm(j && (j.name || j.Nom || j.title || j.Job_title || j.job_title || jobSlugOf(j)) || "");
    }
    function jobLangOf(j){
      return normLang(j && (j.lang || j.language || j.langue) || "");
    }

    // base valid list
    var valid = jobs.filter(function(j){ return jobSlugOf(j) && sectorSlugOf(j); });

    function rebuild(){
      var cur = q();
      var iso = cur.country || (selCountry ? up(selCountry.value) : "");
      var finalLang = iso ? getFinalLangForIso(iso) : normLang(window.__ULYDIA_LANG_FINAL__ || "");

      // Only jobs available for that country (strict lang match if lang exists; otherwise allow migration)
      var available = valid.filter(function(j){
        var jl = jobLangOf(j);
        if (!jl) return true;
        return jl === finalLang;
      });

      // Build sector list from available jobs
      var sectors = {};
      for (var i=0;i<available.length;i++){
        var j = available[i];
        var ss = sectorSlugOf(j);
        if (!ss) continue;
        if (!sectors[ss]){
          sectors[ss] = { slug:ss, label: (sectorLabelOf(j, finalLang) || prettySlug(ss) || ss) };
        }else{
          if (!sectors[ss].label || sectors[ss].label === sectors[ss].slug){
            var lab2 = sectorLabelOf(j, finalLang);
            if (lab2) sectors[ss].label = lab2;
          }
        }
      }

      var sectorList = Object.keys(sectors).map(function(k){ return sectors[k]; })
        .sort(function(a,b){ return a.label.localeCompare(b.label); });

      var sectorPlaceholder = (selSector.querySelector("option") ? selSector.querySelector("option").textContent : "") || "Secteur d’activité";
      setOptions(selSector, sectorList.map(function(s){ return { value:s.slug, label:s.label }; }), sectorPlaceholder);

      // keep sector selection if still valid
      var prevSector = cur.sector || norm(selSector.value);
      if (prevSector && sectors[prevSector]) selSector.value = prevSector;
      else selSector.value = "";

      // Jobs depend on selected sector
      var selectedSector = norm(selSector.value || "");
      var jobItems = [];

      if (selectedSector){
        jobItems = available
          .filter(function(j){ return sectorSlugOf(j) === selectedSector; })
          .map(function(j){ return { value: jobSlugOf(j), label: jobNameOf(j) }; })
          .sort(function(a,b){ return a.label.localeCompare(b.label); });
      } else {
        // ✅ When no sector selected, show ALL jobs available for the selected country.
        jobItems = available
          .map(function(j){ return { value: jobSlugOf(j), label: jobNameOf(j) }; })
          .sort(function(a,b){ return a.label.localeCompare(b.label); });
      }

      var metierPlaceholder = (selMetier.querySelector("option") ? selMetier.querySelector("option").textContent : "") || "Métier";
      setOptions(selMetier, jobItems, metierPlaceholder);

      // ✅ KEEP-METIER-ON-LOAD:
      // If URL has ?metier=, keep it as long as it exists in available jobs (even if sector isn't selected yet).
      if (cur.metier){
        var exists = jobItems.some(function(it){ return it.value === cur.metier; });

        if (exists){
          selMetier.value = cur.metier;

          // Optional: if sector empty, auto-select the sector of this job (keeps UI consistent)
          if (!selectedSector){
            for (var ai=0; ai<available.length; ai++){
              var jj = available[ai];
              if (jobSlugOf(jj) === cur.metier){
                var sslug = sectorSlugOf(jj);
                if (sslug && sectors[sslug]){
                  selSector.value = sslug;
                  // Rebuild job list for this sector (but DO NOT touch URL)
                  selectedSector = sslug;
                  jobItems = available
                    .filter(function(j){ return sectorSlugOf(j) === selectedSector; })
                    .map(function(j){ return { value: jobSlugOf(j), label: jobNameOf(j) }; })
                    .sort(function(a,b){ return a.label.localeCompare(b.label); });
                  setOptions(selMetier, jobItems, metierPlaceholder);
                  selMetier.value = cur.metier;
                }
                break;
              }
            }
          }

        } else {
          // If metier isn't available for this country/lang, clear it.
          setQ({ country: iso || "", sector: selectedSector || "", metier: "" });
        }
      }

      // If URL metier not in list -> clear it
      if (cur.metier){
        var exists = jobItems.some(function(it){ return it.value === cur.metier; });
        if (!exists){
          setQ({ country: iso || "", sector: selectedSector || "", metier: "" });
        }else{
          selMetier.value = cur.metier;
        }
      }
    }

    // Init from URL
    var cur0 = q();
    if (selCountry && cur0.country) selCountry.value = cur0.country;

    rebuild();

    // Listeners
    if (selCountry){
      selCountry.addEventListener("change", function(){
        var cur = q();
        setQ({ country: up(selCountry.value), sector: cur.sector || "", metier: "" });
        rebuild();
      });
    }

    selSector.addEventListener("change", function(){
      var cur = q();
      setQ({ country: cur.country || (selCountry ? up(selCountry.value) : ""), sector: norm(selSector.value), metier: "" });
      rebuild();
    });

    selMetier.addEventListener("change", function(){
      var cur = q();
      setQ({ country: cur.country || (selCountry ? up(selCountry.value) : ""), sector: norm(selSector.value||cur.sector), metier: norm(selMetier.value) });
      // IMPORTANT: no rebuild on metier change (keeps UI stable)
    });

    // Back/forward support
    window.addEventListener("popstate", function(){
      var cur = q();
      if (selCountry) selCountry.value = cur.country || "";
      rebuild();
      if (cur.metier) selMetier.value = cur.metier;
    });

    // mark mounted (prevents re-init)
    try{
      document.documentElement.setAttribute("data-ulydia-filters-mounted", "1");
    }catch(e){}

    return true;
  }

  function waitData(){
    var tries = 0;
    var t = setInterval(function(){
      tries++;
      try{
        var ok = buildOnce();
        if (ok || tries > 140) clearInterval(t);
      }catch(e){
        if (tries > 140) clearInterval(t);
      }
    }, 120);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitData);
  else waitData();
})();