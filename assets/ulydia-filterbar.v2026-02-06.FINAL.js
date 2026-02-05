/*!
 * ULYDIA – Filters Bar (independent UI)
 * v2026-02-06.FINAL
 *
 * - Fetches /v1/filters from your Worker (Airtable)
 * - Country + Sector + Job (with search/autocomplete)
 * - On job select: updates URL (?slug=...&iso=...) with history.pushState (NO reload)
 * - Dispatches window event "ulydia:metier-change" {slug, iso}
 *   (Your metier-page MONO script can listen to this to refresh ONLY #ulydia-metier-root.)
 */
(function(){
  if (window.__ULYDIA_FILTER_BAR_V1__) return;
  window.__ULYDIA_FILTER_BAR_V1__ = true;

  function getWorkerUrl(){
    return (window.ULYDIA_WORKER_URL || window.__ULYDIA_WORKER_URL__ || "").trim();
  }
  function getProxySecret(){
    return (window.ULYDIA_PROXY_SECRET || window.ULYDIA_PROXY_SECRET_2 || window.ULYDIA_PROXY || "").trim();
  }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function el(tag, attrs){
    var e=document.createElement(tag);
    if(attrs){
      if(attrs.className) e.className=attrs.className;
      if(attrs.id) e.id=attrs.id;
      if(attrs.html!=null) e.innerHTML=attrs.html;
      if(attrs.text!=null) e.textContent=attrs.text;
      if(attrs.style){
        for(var k in attrs.style){ try{ e.style[k]=attrs.style[k]; }catch(_){ } }
      }
      if(attrs.attrs){
        for(var a in attrs.attrs){ try{ e.setAttribute(a, attrs.attrs[a]); }catch(_){ } }
      }
    }
    return e;
  }
  function debounce(fn, ms){
    var t=null;
    return function(){
      var args=arguments, self=this;
      clearTimeout(t);
      t=setTimeout(function(){ fn.apply(self,args); }, ms||150);
    };
  }

  function injectCSS(){
    if (document.getElementById("ulydia-filterbar-css")) return;
    var css = `
      #ulydia-filterbar{
        font-family: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        position: relative;
        z-index: 20;
        max-width: 980px;
        margin: 26px auto 14px auto;
        padding: 18px 18px;
        background: rgba(255,255,255,0.92);
        border: 1px solid rgba(226,232,240,0.9);
        border-radius: 18px;
        box-shadow: 0 10px 30px rgba(15,23,42,0.08);
        backdrop-filter: blur(10px);
      }
      #ulydia-filterbar .uf-row{
        display: grid;
        grid-template-columns: 180px 220px 1fr;
        gap: 12px;
        align-items: center;
      }
      #ulydia-filterbar .uf-field{
        display:flex;
        flex-direction:column;
        gap:6px;
      }
      #ulydia-filterbar .uf-label{
        font-size: 12px;
        color: #64748b;
        font-weight: 600;
        letter-spacing: .2px;
      }
      #ulydia-filterbar select,
      #ulydia-filterbar input{
        width: 100%;
        height: 44px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(226,232,240,1);
        outline: none;
        background: #ffffff;
        color: #0f172a;
        font-size: 14px;
        box-shadow: 0 1px 0 rgba(15,23,42,0.02);
      }
      #ulydia-filterbar select:focus,
      #ulydia-filterbar input:focus{
        border-color: rgba(99,102,241,0.6);
        box-shadow: 0 0 0 4px rgba(99,102,241,0.15);
      }
      #ulydia-filterbar .uf-help{
        font-size: 12px;
        color: #94a3b8;
        margin-top: 8px;
      }
      #ulydia-filterbar .uf-suggest{
        position:absolute;
        left:0; right:0;
        top: 100%;
        margin-top: 8px;
        background: #fff;
        border: 1px solid rgba(226,232,240,1);
        border-radius: 14px;
        box-shadow: 0 14px 40px rgba(15,23,42,0.12);
        overflow: hidden;
        display:none;
      }
      #ulydia-filterbar .uf-suggest.open{ display:block; }
      #ulydia-filterbar .uf-item{
        padding: 10px 12px;
        cursor: pointer;
        display:flex;
        gap: 10px;
        align-items: center;
      }
      #ulydia-filterbar .uf-item:hover{
        background: rgba(99,102,241,0.06);
      }
      #ulydia-filterbar .uf-item .t{
        font-weight: 700;
        color: #0f172a;
        font-size: 14px;
        line-height: 1.2;
      }
      #ulydia-filterbar .uf-item .m{
        font-weight: 600;
        color: #64748b;
        font-size: 12px;
        line-height: 1.2;
      }
      @media (max-width: 860px){
        #ulydia-filterbar .uf-row{ grid-template-columns: 1fr; }
      }
    `;
    var st=el("style",{id:"ulydia-filterbar-css", html: css});
    document.head.appendChild(st);
  }

  function mount(){
    injectCSS();
    var host = document.getElementById("ulydia-metier-filters") || document.body;
    var bar = el("section",{id:"ulydia-filterbar"});
    bar.innerHTML = "";

    var row = el("div",{className:"uf-row"});

    // Country select
    var fCountry = el("div",{className:"uf-field"});
    fCountry.appendChild(el("div",{className:"uf-label", text:"Pays"}));
    var selCountry = el("select",{attrs:{"aria-label":"Pays"}});
    selCountry.appendChild(el("option",{attrs:{value:""}, text:"Choisir un pays"}));
    fCountry.appendChild(selCountry);

    // Sector select
    var fSector = el("div",{className:"uf-field"});
    fSector.appendChild(el("div",{className:"uf-label", text:"Secteur d’activité"}));
    var selSector = el("select",{attrs:{"aria-label":"Secteur"}});
    selSector.appendChild(el("option",{attrs:{value:""}, text:"Tous les secteurs"}));
    fSector.appendChild(selSector);

    // Job search input
    var fJob = el("div",{className:"uf-field", style:{position:"relative"}});
    fJob.appendChild(el("div",{className:"uf-label", text:"Métier"}));
    var inpJob = el("input",{attrs:{type:"text", placeholder:"Tapez pour rechercher (ex: Ortho…)", autocomplete:"off"}});
    var suggest = el("div",{className:"uf-suggest"});
    fJob.appendChild(inpJob);
    fJob.appendChild(suggest);

    row.appendChild(fCountry);
    row.appendChild(fSector);
    row.appendChild(fJob);

    bar.appendChild(row);
    bar.appendChild(el("div",{className:"uf-help", text:"Sélectionnez un pays, puis un secteur, puis un métier (la page ne recharge pas)."}));

    // Insert bar before host if host exists and is a section; else prepend to body
    try{
      if (host && host.parentNode && host !== document.body){
        host.parentNode.insertBefore(bar, host);
      } else {
        document.body.insertBefore(bar, document.body.firstChild);
      }
    }catch(_){
      document.body.insertBefore(bar, document.body.firstChild);
    }

    return { bar:bar, selCountry:selCountry, selSector:selSector, inpJob:inpJob, suggest:suggest };
  }

  function setURL(slug, iso){
    try{
      var u = new URL(window.location.href);
      u.searchParams.set("slug", slug);
      u.searchParams.set("iso", iso);
      history.pushState({}, "", u.toString());
    }catch(_){}
  }

  function emitChange(slug, iso){
    try{
      window.dispatchEvent(new CustomEvent("ulydia:metier-change", { detail: { slug: slug, iso: iso } }));
    }catch(_){}
  }

  function fetchFilters(iso, lang){
    return new Promise(function(resolve){
      try{
        var base=getWorkerUrl();
        if(!base) return resolve(null);
        var url=base.replace(/\/+$/,"") + "/v1/filters?nocache=0";
        if (iso) url += "&iso=" + encodeURIComponent(String(iso));
        if (lang) url += "&lang=" + encodeURIComponent(String(lang));
        fetch(url, { headers: { "x-ulydia-proxy-secret": (getProxySecret()||"") } })
          .then(function(r){ return r && r.ok ? r.json() : null; })
          .then(function(j){ resolve(j && j.ok ? j : null); })
          .catch(function(){ resolve(null); });
      }catch(_){ resolve(null); }
    });
  }

  function main(){
    var ui = mount();

    var state = {
      all: null,
      iso: "",
      lang: "",
      sectorId: "",
      jobs: [],
      categories: []
    };

    function fillCountries(countries){
      ui.selCountry.innerHTML = "";
      ui.selCountry.appendChild(el("option",{attrs:{value:""}, text:"Choisir un pays"}));
      (countries||[]).slice().sort(function(a,b){
        return String(a.label||"").localeCompare(String(b.label||""));
      }).forEach(function(c){
        ui.selCountry.appendChild(el("option",{attrs:{value:String(c.iso||"")}, text:String(c.label||c.iso||"")}));
      });
    }

    function fillSectors(categories){
      ui.selSector.innerHTML = "";
      ui.selSector.appendChild(el("option",{attrs:{value:""}, text:"Tous les secteurs"}));
      (categories||[]).forEach(function(s){
        var label = String(s.label||s.slug||"").trim();
        ui.selSector.appendChild(el("option",{attrs:{value:String(s.id||s.slug||"")}, text:label}));
      });
    }

    function currentJobs(){
      var out = (state.jobs||[]).slice();
      if (state.sectorId){
        out = out.filter(function(j){
          return String(j.sector_id||"") === String(state.sectorId) || String(j.sector_id||"") === String(state.sectorId);
        });
      }
      return out;
    }

    function renderSuggest(items){
      ui.suggest.innerHTML = "";
      if (!items || !items.length){
        ui.suggest.classList.remove("open");
        return;
      }
      items.slice(0,12).forEach(function(j){
        var item = el("div",{className:"uf-item"});
        var t = el("div",{});
        t.appendChild(el("div",{className:"t", text:String(j.name||j.slug)}));
        t.appendChild(el("div",{className:"m", text:String(j.slug)}));
        item.appendChild(t);
        item.addEventListener("mousedown", function(ev){
          ev.preventDefault();
          ui.inpJob.value = String(j.name||j.slug);
          ui.suggest.classList.remove("open");
          if (state.iso && j.slug){
            setURL(j.slug, state.iso);
            emitChange(j.slug, state.iso);
          }
        });
        ui.suggest.appendChild(item);
      });
      ui.suggest.classList.add("open");
    }

    var doSuggest = debounce(function(){
      var q = String(ui.inpJob.value||"").trim().toLowerCase();
      if (!q || q.length < 1){
        ui.suggest.classList.remove("open");
        return;
      }
      var list = currentJobs();
      var items = list.filter(function(j){
        return String(j.name||"").toLowerCase().indexOf(q) === 0 || String(j.slug||"").toLowerCase().indexOf(q) === 0;
      });
      renderSuggest(items);
    }, 120);

    ui.inpJob.addEventListener("input", doSuggest);
    ui.inpJob.addEventListener("focus", doSuggest);
    document.addEventListener("click", function(e){
      try{
        if (!ui.bar.contains(e.target)) ui.suggest.classList.remove("open");
      }catch(_){}
    });

    ui.selCountry.addEventListener("change", function(){
      state.iso = String(ui.selCountry.value||"").toUpperCase();
      state.sectorId = "";
      ui.selSector.value = "";
      ui.inpJob.value = "";
      ui.suggest.classList.remove("open");

      if (!state.iso) return;

      fetchFilters(state.iso, "").then(function(data){
        if (!data) return;
        state.lang = String(data.meta && data.meta.lang ? data.meta.lang : "").toLowerCase();
        state.categories = data.categories || [];
        state.jobs = data.jobs || [];
        fillSectors(state.categories);
      });
    });

    ui.selSector.addEventListener("change", function(){
      state.sectorId = String(ui.selSector.value||"");
      ui.inpJob.value = "";
      ui.suggest.classList.remove("open");
      doSuggest();
    });

    // Initial load (all countries)
    fetchFilters("", "").then(function(data){
      if (!data) return;
      state.all = data;
      fillCountries(data.countries || []);
      // preselect from URL if present
      try{
        var u = new URL(window.location.href);
        var iso0 = String(u.searchParams.get("iso") || "").toUpperCase();
        var slug0 = String(u.searchParams.get("slug") || "").trim();
        if (iso0){
          ui.selCountry.value = iso0;
          state.iso = iso0;
          fetchFilters(iso0, "").then(function(d2){
            if (!d2) return;
            state.lang = String(d2.meta && d2.meta.lang ? d2.meta.lang : "").toLowerCase();
            state.categories = d2.categories || [];
            state.jobs = d2.jobs || [];
            fillSectors(state.categories);
            if (slug0){
              // try fill job name
              var hit = (state.jobs||[]).find(function(j){ return String(j.slug||"") === slug0; });
              if (hit) ui.inpJob.value = String(hit.name||hit.slug);
            }
          });
        }
      }catch(_){}
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();

})();
