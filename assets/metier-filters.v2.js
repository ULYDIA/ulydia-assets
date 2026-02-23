(function(){
  "use strict";
  if (window.__ULYDIA_SEARCHBAR_V2__) return;
  window.__ULYDIA_SEARCHBAR_V2__ = true;

  // Inject HTML skeleton (no inline style/script anymore)
  function ensureDOM(){
    var host = document.getElementById("ulydia-metier-filters");
    if(!host){
      host = document.createElement("div");
      host.id = "ulydia-metier-filters";
      document.body.prepend(host);
    }

    host.innerHTML = `
      <section id="ulydia-searchbar" aria-label="Recherche métiers">
        <div class="us-col us-ddwrap" data-dd="country">
          <label class="us-label" for="us-country"><span class="us-ico">🌍</span>Pays / Région</label>
          <div class="us-field">
            <span class="us-icon">🌍</span>
            <input id="us-country" type="search" placeholder="Choisir un pays…" autocomplete="off"/>
            <button id="us-country-clear" class="us-clear" type="button" aria-label="Effacer" hidden>✕</button>
            <span class="us-caret" aria-hidden="true"></span>
          </div>
          <div id="us-dd-country" class="us-dd" hidden></div>
        </div>

        <div class="us-col us-ddwrap" data-dd="sector">
          <label class="us-label" for="us-sector"><span class="us-ico">🏢</span>Secteur d’activité (optionnel)</label>
          <div class="us-field">
            <span class="us-icon">🏛️</span>
            <input id="us-sector" type="search" placeholder="Tous les secteurs" autocomplete="off" disabled/>
            <button id="us-sector-clear" class="us-clear" type="button" aria-label="Effacer le secteur" hidden>✕</button>
            <span class="us-caret" aria-hidden="true"></span>
          </div>
          <div id="us-dd-sector" class="us-dd" hidden></div>
        </div>

        <div class="us-col us-ddwrap" data-dd="job">
          <label class="us-label" for="us-job"><span class="us-ico">🔎</span>Rechercher un métier</label>
          <div class="us-field">
            <span class="us-icon">🔎</span>
            <input id="us-job" type="search" placeholder="Ex: Stratifieur, Développeur…" autocomplete="off" disabled/>
            <span id="us-spin" class="us-spinner" hidden></span>
          </div>
          <div id="us-dd-job" class="us-dd" hidden></div>
        </div>
      </section>

      <div id="ulydia-empty-state" class="ul-empty" hidden>
        <div class="ul-empty-card">
          <div class="ul-empty-kicker">Explore careers</div>
          <div class="ul-empty-title">Select a country and search for a job</div>
          <div class="ul-empty-sub">Use the filters above to browse sectors and open a job description.</div>
        </div>
      </div>

      <div id="ulydia-nav-loader" class="ul-nav-loader" hidden>
        <div class="ul-nav-card">
          <div class="ul-nav-spinner" aria-hidden="true"></div>
          <div class="ul-nav-title">Chargement…</div>
          <div class="ul-nav-sub">Nous affichons la fiche métier</div>
        </div>
      </div>
    `;
  }

  function ready(fn){
    (document.readyState==="complete"||document.readyState==="interactive") ? fn() : document.addEventListener("DOMContentLoaded", fn);
  }

  // Worker base (standard)
  function getWorker(){
    var w = (window.__ULYDIA_WORKER_BASE__ || window.ULYDIA_WORKER_URL || window.WORKER_URL || window.WORKER || window.ULYDIA_WORKER || window.__ULYDIA_WORKER_URL__ || "")
      .toString().replace(/\/+$/,"");
    return w;
  }

  // Cache for PostgREST filters
  var __filtersCache = new Map();
  async function fetchJSON(url){
    var res = await fetch(url, { method:"GET", credentials:"omit" });
    var txt = await res.text();
    var data = null;
    try{ data = txt ? JSON.parse(txt) : null; }catch(e){}
    if(!res.ok || !data || data.ok !== true){
      console.warn("[ULYDIA] Bad response", res.status, url, txt);
      throw new Error("Bad response");
    }
    return data;
  }
  async function getFilters(iso){
    var WORKER = getWorker();
    if(!WORKER) throw new Error("Missing WORKER base");
    var ISO = String(iso||"FR").trim().toUpperCase();
    if(!/^[A-Z]{2}$/.test(ISO)) ISO="FR";
    if(__filtersCache.has(ISO)) return __filtersCache.get(ISO);
    var p = fetchJSON(WORKER + "/v1/filters?iso=" + encodeURIComponent(ISO));
    __filtersCache.set(ISO, p);
    return p;
  }

  // Expose helpers expected by some packs
  window.getFilters = getFilters;
  window.getCountries = async function(iso){ var d = await getFilters(iso); return d.countries || []; };
  window.getSectors   = async function(iso){ var d = await getFilters(iso); return d.sectors || []; };
  window.getJobs      = async function(iso){ var d = await getFilters(iso); return d.jobs || []; };

  // --- Original logic (adapted only for WORKER base resolution)
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function low(s){ return norm(s).toLowerCase(); }
  function up(s){ return norm(s).toUpperCase(); }
  function escHtml(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function normKey(s){
    s = (s==null? "" : String(s));
    s = s.trim().toLowerCase();
    s = s.replace(/[\u2010-\u2015\u2212]/g, '-');
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    s = s.replace(/[^a-z0-9]+/g,'-');
    s = s.replace(/-+/g,'-').replace(/^-|-$/g,'');
    return s;
  }

  function showNavLoader(){ var el=document.getElementById("ulydia-nav-loader"); if(el) el.hidden=false; }
  function hideNavLoader(){ var el=document.getElementById("ulydia-nav-loader"); if(el) el.hidden=true; }

  function armNavFlag(){ try{ sessionStorage.setItem("ulydia_nav_loading","1"); }catch(e){} }
  function consumeNavFlag(){ try{ var v=sessionStorage.getItem("ulydia_nav_loading"); if(v==="1"){ sessionStorage.removeItem("ulydia_nav_loading"); return true; } }catch(e){} return false; }

  function saveSector(iso, sectorIdNorm, sectorName){
    try{ sessionStorage.setItem("ulydia_keep_sector", JSON.stringify({ iso: up(iso), id: String(sectorIdNorm||""), name: String(sectorName||"") })); }catch(e){}
  }
  function readSector(){
    try{ var raw=sessionStorage.getItem("ulydia_keep_sector"); if(!raw) return null; return JSON.parse(raw); }catch(e){ return null; }
  }

  function buildUrl(iso, metierSlug){
    var ISO = up(iso || "FR");
    if(!/^[A-Z]{2}$/.test(ISO)) ISO="FR";
    if(metierSlug) return "/metier?metier="+encodeURIComponent(metierSlug)+"&country="+encodeURIComponent(ISO);
    return "/metier?country="+encodeURIComponent(ISO);
  }

  function setBarLoading(on){
    var bar=document.getElementById("ulydia-searchbar");
    if(bar) bar.classList.toggle("is-loading", !!on);
  }

  // Tap vs scroll guard (mobile)
  function attachTap(el, onTap){
    var sx=0, sy=0, moved=false, active=false;
    var TH=8;
    el.addEventListener("pointerdown", function(e){
      active=true; moved=false; sx=e.clientX; sy=e.clientY;
    }, {passive:true});
    el.addEventListener("pointermove", function(e){
      if(!active) return;
      if(Math.abs(e.clientX - sx) > TH || Math.abs(e.clientY - sy) > TH) moved=true;
    }, {passive:true});
    el.addEventListener("pointerup", function(e){
      if(!active) return;
      active=false;
      if(moved) return;
      e.preventDefault(); e.stopPropagation();
      onTap();
    });
    el.addEventListener("pointercancel", function(){ active=false; moved=false; }, {passive:true});
    el.addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      onTap();
    });
  }

  ready(async function(){
    ensureDOM();

    var WORKER = getWorker();
    if (!WORKER) { console.warn("[ULYDIA] Missing WORKER base (window.__ULYDIA_WORKER_BASE__)"); return; }

    var bar = document.getElementById("ulydia-searchbar");

    var inpCountry = document.getElementById("us-country");
    var ddCountry = document.getElementById("us-dd-country");
    var clrCountry = document.getElementById("us-country-clear");

    var inpSector = document.getElementById("us-sector");
    var ddSector = document.getElementById("us-dd-sector");
    var clrSector = document.getElementById("us-sector-clear");

    var inpJob = document.getElementById("us-job");
    var ddJob = document.getElementById("us-dd-job");
    var spin = document.getElementById("us-spin");

    var emptyState = document.getElementById("ulydia-empty-state");

    if(!inpCountry || !ddCountry || !inpSector || !ddSector || !inpJob || !ddJob){
      console.warn("[ULYDIA] Missing searchbar DOM");
      return;
    }

    function setSpin(on){ if(spin) spin.hidden = !on; }
    function wrap(input){ return input && input.closest ? input.closest(".us-ddwrap") : null; }
    function openDD(dd,input){ dd.hidden=false; var w=wrap(input); if(w) w.classList.add("is-open"); }
    function closeDD(dd,input){ dd.hidden=true; var w=wrap(input); if(w) w.classList.remove("is-open"); }
    function closeAll(){ closeDD(ddCountry, inpCountry); closeDD(ddSector, inpSector); closeDD(ddJob, inpJob); }

    function renderList(dd, items, onPick){
      dd.innerHTML="";
      if(!items || !items.length){
        dd.innerHTML = '<div class="us-opt empty"><div class="t">Aucun résultat</div></div>';
        return;
      }
      for(var i=0;i<items.length;i++){
        (function(it){
          var row=document.createElement("div");
          row.className="us-opt";
          row.innerHTML='<div class="t">'+escHtml(it.label)+'</div>';
          attachTap(row, function(){
            onPick(it);
            closeAll();
          });
          dd.appendChild(row);
        })(items[i]);
      }
    }

    function filterItems(items, q){
      var query=low(q);
      if(!query) return items.slice(0, 120);
      var out=[];
      for(var i=0;i<items.length;i++){
        var it=items[i];
        if(low(it.label).includes(query) || low(it.value).includes(query)) out.push(it);
        if(out.length>=120) break;
      }
      return out;
    }

    function syncClearButtons(){
      if(clrCountry) clrCountry.hidden = !inpCountry.value;
      if(clrSector) clrSector.hidden = inpSector.disabled || !inpSector.value;
    }

    function indexJobs(jobs){
      var map=new Map();
      jobs.forEach(function(j){
        var sid = normKey(j.sector_id || "");
        if(!map.has(sid)) map.set(sid, []);
        map.get(sid).push(j);
      });
      map.forEach(function(arr){
        arr.sort(function(a,b){ return String(a.label||"").localeCompare(String(b.label||"")); });
      });
      return map;
    }

    if(consumeNavFlag()){
      showNavLoader();
      var killed=false;
      function kill(){ if(killed) return; killed=true; hideNavLoader(); }
      window.addEventListener("ulydia:metier:rendered", kill, {once:true});

      var poll=setInterval(function(){
        if(document.querySelector(".ulydia-metier-container")) { clearInterval(poll); kill(); }
        var root=document.getElementById("ulydia-metier-root");
        if(root && root.children && root.children.length>0) { clearInterval(poll); kill(); }
      }, 120);
      window.addEventListener("load", function(){ setTimeout(kill, 250); }, {once:true});
      setTimeout(function(){ clearInterval(poll); kill(); }, 9000);
    }

    var usp = new URLSearchParams(location.search);
    var isoParam = norm(usp.get("country")||"");
    var metierParam = norm(usp.get("metier")||"");
    var hasParams = !!(isoParam || metierParam);
    if(emptyState) emptyState.hidden = hasParams;

    var state = {
      iso: isoParam ? up(isoParam) : "",
      metier: metierParam,
      sectorIdNorm: "",
      sectorName: "",
      countries: [],
      sectors: [],
      jobs: [],
      jobsBySector: new Map()
    };
    if(state.metier && !state.iso) state.iso="FR";
    try{ history.replaceState(null,"", buildUrl(state.iso || "FR", state.metier||"")); }catch(e){}

    inpJob.value = "";
    inpSector.disabled = true;
    inpJob.disabled = true;

    async function loadFiltersForISO(iso){
      state.iso = up(iso || "FR");
      if(!/^[A-Z]{2}$/.test(state.iso)) state.iso="FR";

      state.jobs=[]; state.sectors=[]; state.countries=[]; state.jobsBySector=new Map();
      state.sectorIdNorm=""; state.sectorName="";
      inpSector.value=""; inpSector.disabled=true;
      inpJob.value=""; inpJob.disabled=true;
      syncClearButtons();

      setBarLoading(true);
      setSpin(true);
      try{
        var fData = await getFilters(state.iso);

        state.countries = (fData.countries||[]).map(function(c){
          var iso2 = up(c.iso2 || c.iso || c.code || "");
          var label = String(c.label || c.name || iso2 || "");
          return { value: iso2, label: label };
        }).filter(function(c){ return /^[A-Z]{2}$/.test(c.value); })
          .sort(function(a,b){ return String(a.label||"").localeCompare(String(b.label||"")); });

        var found = state.countries.find(function(c){ return c.value === state.iso; });
        inpCountry.value = found ? found.label : state.iso;

        state.sectors = (fData.sectors||[]).map(function(s){
          var raw = String(s.id || s.key || s.slug || "");
          return { value: raw, valueNorm: normKey(raw), label: String(s.name || s.label || raw || "") };
        }).filter(function(s){ return !!s.valueNorm; })
          .sort(function(a,b){ return String(a.label||"").localeCompare(String(b.label||"")); });

        state.jobs = (fData.jobs||[]).map(function(j){
          var slug = String(j.slug||"");
          var label = String(j.name||j.title||slug||"");
          var sidRaw = j.sector_id || j.secteur_slug || "";
          return { value: slug, label: label, sector_id: normKey(sidRaw) };
        }).filter(function(j){ return !!j.value; });

        state.jobsBySector = indexJobs(state.jobs);

        inpSector.disabled = false;
        inpJob.disabled = false;

        var keep = readSector();
        if(keep && up(keep.iso)===state.iso && keep.id){
          state.sectorIdNorm = normKey(keep.id);
          state.sectorName = String(keep.name||"");
          inpSector.value = state.sectorName || "";
        }

        syncClearButtons();
        try{ history.replaceState(null,"", buildUrl(state.iso, state.metier||"")); }catch(e){}
      } finally {
        setSpin(false);
        setBarLoading(false);
      }
    }

    function getJobList(q){
      var list = state.sectorIdNorm ? (state.jobsBySector.get(state.sectorIdNorm)||[]) : state.jobs;
      return filterItems(list.map(function(j){ return { value:j.value, label:j.label }; }), q);
    }

    function renderCountries(q){ renderList(ddCountry, filterItems(state.countries, q), onPickCountry); }
    function renderSectors(q){ renderList(ddSector, filterItems(state.sectors.map(function(s){ return {value:s.valueNorm, label:s.label}; }), q), onPickSector); }
    function renderJobs(q){ renderList(ddJob, getJobList(q), onPickJob); }

    function onPickCountry(it){
      inpCountry.value = it.label;
      state.metier = "";
      saveSector(it.value, "", "");
      syncClearButtons();
      closeDD(ddCountry, inpCountry);
      location.assign(buildUrl(it.value, ""));
    }

    function onPickSector(it){
      state.sectorIdNorm = it.value;
      state.sectorName = it.label;
      inpSector.value = it.label;
      syncClearButtons();
      closeDD(ddSector, inpSector);

      saveSector(state.iso, state.sectorIdNorm, state.sectorName);

      renderJobs(inpJob.value);
      openDD(ddJob, inpJob);
      try{ inpJob.focus(); }catch(_e){}
    }

    function onPickJob(it){
      state.metier = it.value;
      showNavLoader();
      armNavFlag();
      var url = buildUrl(state.iso, state.metier);
      try{ history.replaceState(null,"", url); }catch(e){}
      location.assign(url);
    }

    await loadFiltersForISO(state.iso || "FR");

    function attachReopen(input, dd, renderer){
      input.addEventListener("pointerdown", function(e){
        e.preventDefault();
        e.stopPropagation();
        renderer(input.value || "");
        openDD(dd, input);
        try{ input.focus(); }catch(_){}
      }, {passive:false});
      input.addEventListener("focus", function(){
        renderer(input.value || "");
        openDD(dd, input);
      });
      input.addEventListener("input", function(){
        renderer(input.value || "");
        openDD(dd, input);
        syncClearButtons();
      });
    }

    attachReopen(inpCountry, ddCountry, renderCountries);
    attachReopen(inpSector, ddSector, renderSectors);
    attachReopen(inpJob, ddJob, renderJobs);

    if(clrCountry){
      clrCountry.addEventListener("pointerdown", function(e){
        e.preventDefault(); e.stopPropagation();
        inpCountry.value="";
        syncClearButtons();
        renderCountries("");
        openDD(ddCountry, inpCountry);
        try{ inpCountry.focus(); }catch(_){}
      }, {passive:false});
    }

    if(clrSector){
      clrSector.addEventListener("pointerdown", function(e){
        e.preventDefault(); e.stopPropagation();
        state.sectorIdNorm = "";
        state.sectorName = "";
        inpSector.value = "";
        inpJob.value = "";
        syncClearButtons();
        closeDD(ddJob, inpJob);
        renderSectors("");
        openDD(ddSector, inpSector);
        try{ inpSector.focus(); }catch(_){}
      }, {passive:false});
    }

    document.addEventListener("pointerdown", function(e){
      if(!bar.contains(e.target)) closeAll();
    });
    document.addEventListener("keydown", function(e){
      if(e.key==="Escape") closeAll();
    });
  });
})();