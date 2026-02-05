/*!
ULYDIA — Filter Bar (independent) v2026-02-06
- Fetches /v1/filters from the Worker
- Searchable métier input (typeahead via datalist)
- Loads a job WITHOUT full page refresh (calls window.ULYDIA_LOAD_METIER)
*/
(function(){
  "use strict";
  if (window.__ULYDIA_FILTER_BAR_V20260206__) return;
  window.__ULYDIA_FILTER_BAR_V20260206__ = true;

  var WORKER_URL = (window.ULYDIA_WORKER_URL || window.__ULYDIA_WORKER_URL__ || "").toString().trim();
  if (!WORKER_URL) WORKER_URL = "https://ulydia-business.contact-871.workers.dev";

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function el(tag, attrs){
    var n = document.createElement(tag);
    attrs = attrs || {};
    if (attrs.id) n.id = attrs.id;
    if (attrs.className) n.className = attrs.className;
    if (attrs.type) n.type = attrs.type;
    if (attrs.placeholder) n.placeholder = attrs.placeholder;
    if (attrs.value != null) n.value = attrs.value;
    if (attrs.html != null) n.innerHTML = attrs.html;
    if (attrs.attrs){ for (var k in attrs.attrs) n.setAttribute(k, attrs.attrs[k]); }
    return n;
  }

  function injectCSS(){
    if (qs("#ulydia-filterbar-css-20260206")) return;
    var s = el("style",{id:"ulydia-filterbar-css-20260206"});
    s.textContent = ""
      +".ul-fbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 14px;border-radius:14px;background:#fff;box-shadow:0 10px 28px rgba(2,6,23,.08);border:1px solid rgba(148,163,184,.35)}"
      +".ul-fbar .ul-fgrp{display:flex;align-items:center;gap:8px}"
      +".ul-fbar label{font-family:Montserrat,system-ui;font-size:12px;font-weight:800;color:#64748b}"
      +".ul-fbar select,.ul-fbar input{font-family:Montserrat,system-ui;font-size:14px;color:#0f172a;padding:10px 12px;border-radius:12px;border:1px solid rgba(148,163,184,.45);background:#f8fafc;outline:none;min-width:180px}"
      +".ul-fbar input{min-width:260px}"
      +".ul-fbar select:focus,.ul-fbar input:focus{background:#fff;border-color:rgba(99,102,241,.55);box-shadow:0 0 0 4px rgba(99,102,241,.12)}"
      +".ul-fbar .ul-btn{cursor:pointer;user-select:none;font-family:Montserrat,system-ui;font-weight:900;font-size:14px;padding:10px 14px;border-radius:12px;border:0;background:#4f46e5;color:#fff;box-shadow:0 10px 18px rgba(79,70,229,.22)}"
      +".ul-fbar .ul-btn:hover{transform:translateY(-1px)}"
      +".ul-fbar .ul-hint{font-family:Montserrat,system-ui;font-size:12px;color:#64748b}";
    document.head.appendChild(s);
  }

  function fetchJSON(url){
    return fetch(url, { method:"GET", credentials:"omit" })
      .then(function(r){ return r.json().then(function(j){ return { ok:r.ok, status:r.status, json:j }; }); })
      .catch(function(e){ return { ok:false, status:0, json:{ ok:false, error:String(e && e.message || e || "fetch_failed") } }; });
  }

  var state = { countries:[], categories:[], jobs:[], iso:"", lang:"" };

  function getLangForIso(iso){
    iso = (iso||"").toUpperCase();
    for (var i=0;i<state.countries.length;i++){
      var c = state.countries[i] || {};
      if ((c.iso||"").toUpperCase() === iso) return String(c.lang||"").toLowerCase();
    }
    return "";
  }

  function rebuildSectors(selSector, jobs){
    selSector.innerHTML = "";
    selSector.appendChild(el("option",{value:"", html:"Secteur d’activité"}));

    // build set from jobs
    var set = {};
    for (var i=0;i<jobs.length;i++){
      var sid = String(jobs[i].sector_id||"").trim();
      if (sid) set[sid] = true;
    }

    for (var k=0;k<state.categories.length;k++){
      var c = state.categories[k] || {};
      var cid = String(c.id||"").trim();
      var cslug = String(c.slug||"").trim();
      if (set[cid] || set[cslug]){
        selSector.appendChild(el("option",{value: cid || cslug, html:(c.name || c.label || cslug || cid)}));
      }
    }
  }

  function rebuildDatalist(listEl, jobs){
    listEl.innerHTML = "";
    var seen = {};
    for (var i=0;i<jobs.length;i++){
      var j = jobs[i] || {};
      var slug = String(j.slug||"").trim();
      if (!slug || seen[slug]) continue;
      seen[slug] = true;
      var o = document.createElement("option");
      o.value = (j.name ? (j.name + " — " + slug) : slug);
      listEl.appendChild(o);
    }
  }

  function findSlug(val, jobs){
    val = String(val||"").trim();
    if (!val) return "";
    var m = val.match(/—\s*([a-z0-9\-_.]+)\s*$/i);
    if (m && m[1]) return m[1];

    var low = val.toLowerCase();
    for (var i=0;i<jobs.length;i++){
      if (String(jobs[i].slug||"").toLowerCase() === low) return jobs[i].slug;
    }
    for (var j=0;j<jobs.length;j++){
      if (String(jobs[j].name||"").toLowerCase() === low) return jobs[j].slug;
    }
    for (var k=0;k<jobs.length;k++){
      if (String(jobs[k].name||"").toLowerCase().indexOf(low) === 0) return jobs[k].slug;
    }
    return "";
  }

  function jobsForUI(sectorId){
    var sid = String(sectorId||"").trim();
    return state.jobs.filter(function(j){
      if (state.iso && String(j.iso||"").toUpperCase() !== state.iso) return false;
      if (state.lang && String(j.lang||"").toLowerCase() !== state.lang) return false;
      if (sid && String(j.sector_id||"").trim() !== sid) return false;
      return true;
    });
  }

  function mountUI(mount){
    injectCSS();

    var bar = el("div",{className:"ul-fbar", id:"ulydia-filterbar-20260206"});

    var grp1 = el("div",{className:"ul-fgrp"});
    grp1.appendChild(el("label",{html:"Pays"}));
    var selCountry = el("select",{});
    selCountry.appendChild(el("option",{value:"", html:"Pays"}));
    grp1.appendChild(selCountry);

    var grp2 = el("div",{className:"ul-fgrp"});
    grp2.appendChild(el("label",{html:"Secteur"}));
    var selSector = el("select",{});
    selSector.appendChild(el("option",{value:"", html:"Secteur d’activité"}));
    grp2.appendChild(selSector);

    var grp3 = el("div",{className:"ul-fgrp"});
    grp3.appendChild(el("label",{html:"Métier"}));
    var input = el("input",{type:"text", placeholder:"Tapez un métier (ex: Ortho…)"});    
    var dl = el("datalist",{id:"ulydia-metier-datalist-20260206"});
    input.setAttribute("list","ulydia-metier-datalist-20260206");
    grp3.appendChild(input);
    grp3.appendChild(dl);

    var btn = el("button",{className:"ul-btn", html:"Afficher"});
    var hint = el("span",{className:"ul-hint", html:"(sans recharger la page)"});

    bar.appendChild(grp1);
    bar.appendChild(grp2);
    bar.appendChild(grp3);
    bar.appendChild(btn);
    bar.appendChild(hint);

    mount.appendChild(bar);

    // countries
    for (var i=0;i<state.countries.length;i++){
      var c = state.countries[i] || {};
      var iso = String(c.iso||"").toUpperCase();
      if (!iso) continue;
      selCountry.appendChild(el("option",{value:iso, html:(c.name || iso)}));
    }

    function refresh(){
      var listJobs = jobsForUI(selSector.value);
      rebuildSectors(selSector, jobsForUI(""));
      rebuildDatalist(dl, listJobs);
    }

    selCountry.addEventListener("change", function(){
      state.iso = String(selCountry.value||"").toUpperCase();
      state.lang = getLangForIso(state.iso) || "";
      selSector.value = "";
      input.value = "";
      refresh();
    });

    selSector.addEventListener("change", function(){
      input.value = "";
      refresh();
    });

    btn.addEventListener("click", function(){
      var listJobs = jobsForUI(selSector.value);
      var slug = findSlug(input.value, listJobs);
      if (!slug) { input.focus(); return; }
      if (typeof window.ULYDIA_LOAD_METIER === "function"){
        window.ULYDIA_LOAD_METIER(slug, state.iso || "", { source:"filterbar" });
      } else {
        window.dispatchEvent(new CustomEvent("ulydia:load-metier", { detail:{ slug:slug, iso:state.iso||"" } }));
      }
    });

    input.addEventListener("keydown", function(e){
      if (e.key === "Enter"){ e.preventDefault(); btn.click(); }
    });

    refresh();
  }

  function bootstrap(){
    var mount = qs("#ulydia-metier-filters");
    if (!mount){
      var root = qs("#ulydia-metier-root") || document.body;
      mount = el("div",{});
      root.parentNode.insertBefore(mount, root);
    }

    var url = WORKER_URL.replace(/\/+$/,"") + "/v1/filters";
    fetchJSON(url).then(function(r){
      if (!r.ok || !r.json || r.json.ok === false){
        console.error("[filterbar] /v1/filters failed", r.status, r.json);
        state.countries = (r.json && r.json.countries) || [];
        state.categories = (r.json && r.json.categories) || [];
        state.jobs = (r.json && r.json.jobs) || [];
        mountUI(mount);
        return;
      }
      state.countries = r.json.countries || [];
      state.categories = r.json.categories || [];
      state.jobs = r.json.jobs || [];
      mountUI(mount);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap);
  else bootstrap();
})();