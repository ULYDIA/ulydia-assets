/**
 * ULYDIA Webflow Filters (Supabase-first)
 * Version: v2026-02-14.FILTERS.FIX01.SUPABASE-FIRST
 *
 * Replaces HTML2/HTML8 (Finsweet + hidden CMS exports).
 * - Loads countries + sectors from /v1/filters
 * - Loads AVAILABLE jobs (only with MPB) from /v1/available-jobs when a country is selected
 * - Autocomplete for job input + dropdown
 * - Navigates by updating URL params: ?metier=<slug>&country=<ISO>
 *
 * Required DOM:
 * - <select id="uf-country"></select>
 * - <select id="uf-sector"></select>
 * - <input  id="uf-metier" />
 * - <div    id="uf-metier-dd"></div>
 *
 * Optional:
 * - window.ULYDIA_WORKER_URL (defaults to current origin)
 * - window.ULYDIA_FILTER_FINAL_LANG (e.g. "fr") to show only countries where langue_finale==fr
 */

(function(){
  const WORKER = (window.ULYDIA_WORKER_URL || "").replace(/\/+$/,"") || (location.origin);
  const FINAL_LANG_ALLOWED = (window.ULYDIA_FILTER_FINAL_LANG || "").toLowerCase().trim(); // "" => all

  const selCountry = document.getElementById("uf-country");
  const selSector  = document.getElementById("uf-sector");
  const inpMetier  = document.getElementById("uf-metier");
  const dd         = document.getElementById("uf-metier-dd");

  if(!selCountry || !selSector || !inpMetier || !dd) return;

  const norm = (s)=>String(s||"").replace(/\u00A0/g," ").replace(/\s+/g," ").trim();
  const low  = (s)=>norm(s).toLowerCase();
  const esc  = (s)=>String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function openDD(){ dd.hidden = false; }
  function closeDD(){ dd.hidden = true; dd.innerHTML = ""; }

  function fillSelect(selectEl, placeholder, rows, valueKey, labelKey){
    selectEl.innerHTML = "";
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholder;
    selectEl.appendChild(ph);
    rows.forEach(r=>{
      const o = document.createElement("option");
      o.value = r[valueKey];
      o.textContent = r[labelKey];
      selectEl.appendChild(o);
    });
  }

  async function fetchJSON(url){
    const headers = { "accept":"application/json" };
    if (window.ULYDIA_PROXY_SECRET) headers["x-ulydia-proxy-secret"] = window.ULYDIA_PROXY_SECRET;
    const res = await fetch(url, { headers });
    const txt = await res.text();
    let data = null;
    try{ data = txt ? JSON.parse(txt) : null; }catch(e){ data = null; }
    if(!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return data;
  }

  let COUNTRIES = [];
  let SECTORS = [];
  let JOBS_AVAILABLE = [];
  let currentISO = "";
  let currentSector = "";

  function sortBy(arr, key){
    return (arr||[]).slice().sort((a,b)=>String(a[key]||"").localeCompare(String(b[key]||"")));
  }

  function sectorsFromJobs(list){
    const map = new Map();
    list.forEach(m=>{
      const slug = norm(m.sector_slug || m.sector_id || "");
      if(!slug) return;
      if(!map.has(slug)){
        const labelObj = SECTORS.find(s => (s.sector_id === slug)) || null;
        map.set(slug, { slug, name: (labelObj?.fr || slug) });
      }
    });
    return sortBy(Array.from(map.values()), "name");
  }

  function metiersFiltered(q){
    const query = low(q);
    let list = JOBS_AVAILABLE.slice();

    if(currentSector){
      list = list.filter(m => norm(m.sector_slug) === currentSector || norm(m.sector_id) === currentSector);
    }
    if(query){
      list = list.filter(m => low(m.label).includes(query) || low(m.slug).includes(query));
    }
    return list.slice(0, 40);
  }

  function renderDD(q){
    const list = metiersFiltered(q);
    if(!list.length){
      dd.innerHTML = '<div class="uf-opt" style="opacity:.7; cursor:default;"><span class="t">Aucun métier</span><span class="s">—</span></div>';
      openDD();
      return;
    }
    dd.innerHTML = list.map(m=>{
      const secObj = SECTORS.find(s=>s.sector_id===m.sector_slug);
      const sec = (secObj && (secObj.fr || secObj.en)) || m.sector_slug || "";
      return `<div class="uf-opt" data-slug="${esc(m.slug)}">
        <span class="t">${esc(m.label || m.slug)}</span>
        <span class="s">${esc(sec)}</span>
      </div>`;
    }).join("");
    openDD();
  }

  function navigateTo(slug){
    if(!slug) return;
    const iso = currentISO || "FR";
    const u = new URL(location.href);
    u.searchParams.set("metier", slug);
    u.searchParams.set("country", iso);
    u.searchParams.delete("slug");
    u.searchParams.delete("iso");
    location.href = u.toString();
  }

  async function loadFilters(){
    const data = await fetchJSON(`${WORKER}/v1/filters`);
    if(!data || !data.ok) throw new Error("filters not ok");

    COUNTRIES = (data.countries || [])
      .map(c=>({
        iso: (c.iso||"").toUpperCase(),
        label: c.label || c.iso,
        langue_finale: (c.langue_finale || c.lang || "").toLowerCase(),
      }))
      .filter(c=>c.iso);

    if(FINAL_LANG_ALLOWED){
      COUNTRIES = COUNTRIES.filter(c => c.langue_finale === FINAL_LANG_ALLOWED);
    }

    SECTORS = (data.sectors || [])
      .map(s=>({
        sector_id: norm(s.sector_id || s.slug || s.sector_slug || s.id || ""),
        fr: norm(s.fr || s.label_fr || s.nom_fr || s.name_fr || s.label || ""),
        en: norm(s.en || s.label_en || s.nom_en || s.name_en || "")
      }))
      .filter(s=>s.sector_id);

    fillSelect(selCountry, "Pays", sortBy(COUNTRIES, "label"), "iso", "label");

    fillSelect(selSector, "Secteur d’activité", [], "slug", "name");
    selSector.disabled = true;
    inpMetier.disabled = true;
    closeDD();
  }

  async function loadAvailableJobs(iso){
    const data = await fetchJSON(`${WORKER}/v1/available-jobs?country=${encodeURIComponent(iso)}`);
    const arr = (data && data.jobs) ? data.jobs : [];
    return arr.map(j=>{
      if(typeof j === "string") return { slug: norm(j), label: norm(j), sector_slug: "", sector_id: null };
      return {
        slug: norm(j.slug || j.job_slug || ""),
        label: norm(j.label || j.title || j.name || j.slug || ""),
        sector_slug: norm(j.sector_slug || j.secteur || j.sector || ""),
        sector_id: j.sector_id || null
      };
    }).filter(j=>j.slug);
  }

  async function onCountryChange(iso){
    currentISO = (iso||"").toUpperCase();
    currentSector = "";
    selSector.disabled = true;
    inpMetier.disabled = true;
    inpMetier.value = "";
    closeDD();

    if(!currentISO) return;

    const jobs = await loadAvailableJobs(currentISO);
    JOBS_AVAILABLE = jobs;

    const sectors = sectorsFromJobs(jobs);
    fillSelect(selSector, "Secteur d’activité", sectors, "slug", "name");
    selSector.disabled = false;
    inpMetier.disabled = false;
  }

  selCountry.addEventListener("change", async ()=>{
    try{ await onCountryChange(selCountry.value || ""); }catch(e){ console.error(e); }
  });

  selSector.addEventListener("change", ()=>{
    currentSector = norm(selSector.value || "");
    inpMetier.value = "";
    closeDD();
  });

  inpMetier.addEventListener("input", ()=>{ if(!inpMetier.disabled) renderDD(inpMetier.value); });
  inpMetier.addEventListener("focus", ()=>{ if(!inpMetier.disabled) renderDD(inpMetier.value); });

  inpMetier.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") closeDD();
    if(e.key === "Enter"){
      const first = dd.querySelector(".uf-opt[data-slug]");
      if(first){
        e.preventDefault();
        navigateTo(first.getAttribute("data-slug"));
      }
    }
  });

  document.addEventListener("click", (e)=>{
    const opt = e.target.closest && e.target.closest(".uf-opt[data-slug]");
    if(opt){
      navigateTo(opt.getAttribute("data-slug"));
      return;
    }
    if(!e.target.closest || !e.target.closest(".uf-metier")) closeDD();
  });

  (async function init(){
    try{
      await loadFilters();

      const params = new URLSearchParams(location.search);
      const urlISO  = (params.get("country") || params.get("iso") || "").toUpperCase();
      const urlSlug = params.get("metier")  || params.get("slug") || "";

      if(urlISO){
        selCountry.value = urlISO;
        await onCountryChange(urlISO);
      }
      if(urlSlug){
        inpMetier.value = urlSlug;
      }
    }catch(e){
      console.error("[ULYDIA filters] init failed", e);
    }
  })();

})();
