/*
ULYDIA — Force ALL jobs from Worker into the global catalog used by the UI.

Include this script AFTER the MONO script on the metier page.
*/
(function(){
  if (window.__ULYDIA_ALL_JOBS_OVERRIDE_V2026_02_10__) return;
  window.__ULYDIA_ALL_JOBS_OVERRIDE_V2026_02_10__ = true;

  function safeStr(v){ return (v == null) ? "" : String(v); }

  function getWorkerUrl(){
    var u = window.ULYDIA_WORKER_URL || window.__ULYDIA_WORKER_URL__ || window.ULYDIA_WORKER || "";
    u = safeStr(u).trim();
    if (!u || u === "undefined" || u === "null") {
      // hard fallback to your known data worker
      u = "https://ulydia-data.contact-871.workers.dev";
    }
    return u;
  }

  function getIsoFromUrl(){
    try{
      var url = new URL(window.location.href);
      return (url.searchParams.get("country") || url.searchParams.get("iso") || url.searchParams.get("pays") || "").trim().toUpperCase();
    }catch(e){
      return "";
    }
  }

  function getIsoFromUI(){
    // try common controls
    var sel = document.getElementById("uf-country") || document.getElementById("ul-country") || document.querySelector("select[data-ulydia-country]");
    if (sel && sel.value) return safeStr(sel.value).trim().toUpperCase();
    // try chips/text
    var el = document.querySelector("[data-ulydia-iso]");
    if (el) {
      var v = safeStr(el.getAttribute("data-ulydia-iso") || "").trim().toUpperCase();
      if (v) return v;
    }
    return "";
  }

  function setGlobalJobs(payload){
    var jobs = (payload && payload.jobs) ? payload.jobs : [];
    var sectors = (payload && payload.sectors) ? payload.sectors : [];

    // expose a stable 'all jobs' reference
    window.__ULYDIA_ALL_JOBS__ = jobs;
    window.__ULYDIA_ALL_SECTORS__ = sectors;

    // overwrite legacy list used by older UI pieces
    window.__ULYDIA_FICHE_METIERS__ = jobs;

    // optional: keep a debug marker
    window.__ULYDIA_ALL_JOBS_SOURCE__ = "worker:/v1/filters";

    try {
      console.log("[ULYDIA] ALL jobs loaded from Worker:", jobs.length, "sectors:", sectors.length);
    } catch(e) {}
  }

  function fetchFiltersForIso(iso){
    iso = safeStr(iso).trim().toUpperCase();
    if (!iso) iso = "FR";

    var base = getWorkerUrl().replace(/\/+$/,"");
    var url = base + "/v1/filters?iso=" + encodeURIComponent(iso);

    return fetch(url)
      .then(function(r){ return r && r.ok ? r.json() : null; })
      .then(function(j){
        if (j && j.ok && Array.isArray(j.jobs)) setGlobalJobs(j);
        return j;
      })
      .catch(function(){ return null; });
  }

  function boot(){
    // 1) get ISO from URL or UI
    var iso = getIsoFromUrl() || getIsoFromUI() || "FR";

    // 2) load once
    fetchFiltersForIso(iso);

    // 3) reload when country changes (best effort)
    var sel = document.getElementById("uf-country") || document.getElementById("ul-country") || document.querySelector("select[data-ulydia-country]");
    if (sel && !sel.__ulydiaAllJobsBound){
      sel.__ulydiaAllJobsBound = true;
      sel.addEventListener("change", function(){
        var nextIso = safeStr(sel.value).trim().toUpperCase();
        if (nextIso) fetchFiltersForIso(nextIso);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
