/**
 * ULYDIA Data Worker — v2026-02-15.FIX19.PROD
 * Goals:
 * - /v1/filters returns {countries,sectors,jobs} with a stable schema for the Webflow filters script
 * - /v1/available-jobs returns DETAILED job objects (not just slugs) so sector + autocomplete work
 * - /v1/metier-page returns payload compatible with MONO PACK:
 *    - country must be ISO string
 *    - include `country_data`
 *    - include `fiche_metiers` array (single item) so MONO can render all blocks without Webflow CMS
 *    - include `blocs_pays` array for MPB blocks + `mpb` object (best match)
 *    - include `faq` array
 * - Safe to missing columns (name_fr vs nom_fr, etc.)
 * - CORS safe + optional proxy secret
 */

function json(obj, status, corsHeaders){
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type":"application/json; charset=utf-8" }
  });
}
function getUrl(req){ return new URL(req.url); }
function up(s){ return String(s||"").trim().toUpperCase(); }
function low(s){ return String(s||"").trim().toLowerCase(); }
function safeArr(x){ return Array.isArray(x) ? x : []; }

function corsHeadersFor(origin){
  // Prod: allow your domains + local dev; fallback to '*'
  const allow = [
    "https://www.ulydia.com",
    "https://ulydia.com",
    "https://www.ulydia.fr",
    "https://ulydia.fr",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000"
  ];
  const o = origin || "";
  const allowOrigin = allow.includes(o) ? o : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, x-ulydia-proxy-secret",
    "Access-Control-Max-Age": "86400"
  };
}

function requireProxySecret(request, env){
  const required = String(env.REQUIRE_PROXY_SECRET||"0") === "1";
  if (!required) return { ok:true };
  const h = request.headers.get("x-ulydia-proxy-secret") || "";
  const expected = String(env.PROXY_SECRET||"");
  if (!expected) return { ok:false, error:"proxy_secret_not_configured" };
  if (h !== expected) return { ok:false, error:"proxy_secret_invalid" };
  return { ok:true };
}

// ---------------- Supabase (PostgREST) ----------------

async function sbGET(env, table, qs){
  const base = String(env.SUPABASE_URL||"").replace(/\/+$/,"");
  const url = `${base}/rest/v1/${table}?${qs}`;
  const headers = {
    "apikey": String(env.SUPABASE_ANON_KEY||""),
    "Authorization": `Bearer ${String(env.SUPABASE_ANON_KEY||"")}`,
    "accept": "application/json"
  };
  const res = await fetch(url, { headers });
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch(e){ data = txt; }
  return { ok: res.ok, status: res.status, data, url };
}

async function sbGETFallback(env, table, queries){
  let last = null;
  for (const qs of queries){
    const r = await sbGET(env, table, qs);
    last = r;
    if (r.ok) return r;
    // If it's a "column does not exist" (42703), try next select
    const msg = (r && r.data && (r.data.message || r.data.error || "")) ? String(r.data.message || r.data.error) : "";
    if (!/does not exist/i.test(msg) && r.status !== 400) break;
  }
  return last || { ok:false, status: 500, data: { message:"sbGETFallback_failed" } };
}

// ---------------- Helpers ----------------

function pickCountryLabel(row, lang){
  // row can be nom_fr/name_fr etc.
  const l = low(lang||"");
  const map = {
    fr: row.nom_fr || row.name_fr,
    en: row.nom_en || row.name_en,
    de: row.nom_de || row.name_de,
    es: row.nom_es || row.name_es,
    it: row.nom_it || row.name_it
  };
  return (map[l] || row.nom_en || row.name_en || row.nom_fr || row.name_fr || "").trim();
}

function csvToUL(csv){
  const s = String(csv||"").trim();
  if (!s) return "";
  const items = s.split(",").map(x=>x.trim()).filter(Boolean);
  if (!items.length) return "";
  return "<ul>" + items.map(x=>`<li>${escapeHtml(x)}</li>`).join("") + "</ul>";
}

function escapeHtml(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

async function buildJobsFromMpbFallback(env){
  // Used only if jobs/sectors tables are empty
  const mpbRes = await sbGETFallback(env, "mpb", [
    "select=job_slug,secteur,sector_slug&limit=5000",
    "select=job_slug,secteur&limit=5000",
    "select=slug,secteur&limit=5000",
    "select=slug&limit=5000",
  ]);
  const rows = safeArr(mpbRes.ok ? mpbRes.data : []);
  const jobsMap = new Map(); // slug -> sector_slug
  const sectorsSet = new Set();
  for (const r of rows){
    const slug = low(r.job_slug || r.slug || "");
    if (!slug) continue;
    const sec = low(r.sector_slug || r.secteur || "");
    if (!jobsMap.has(slug)) jobsMap.set(slug, sec);
    if (sec) sectorsSet.add(sec);
  }
  const jobs = Array.from(jobsMap.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([slug, sector_slug])=>({
    id: null,
    slug,
    sector_id: null,
    sector_slug
  }));
  const sectors = Array.from(sectorsSet).sort().map(sec=>({ sector_id: sec, fr: sec, en: sec }));
  return { jobs, sectors, source_ok: mpbRes.ok, source_status: mpbRes.status, source_error: mpbRes.data, source_url: mpbRes.url };
}

// ---------------- Handlers ----------------

async function handleHealth(req, env, cors){
  const r = await sbGET(env, "countries", "select=iso2&limit=1");
  return json({
    ok: true,
    worker: "ulydia-data-worker",
    supabase_ok: !!r && r.ok,
    supabase_status: r ? r.status : null,
    require_proxy_secret: String(env.REQUIRE_PROXY_SECRET||"0")==="1"
  }, 200, cors);
}

async function handleFilters(req, env, cors){
  const countriesRes = await sbGETFallback(env, "countries", [
    "select=iso2,slug_pays,actif,langue_finale,nom_fr,nom_en,nom_de,nom_es,nom_it,currency_code,currency_symbol&order=iso2.asc",
    "select=iso2,slug_pays,actif,langue_finale,name_fr,name_en,name_de,name_es,name_it,currency_code,currency_symbol&order=iso2.asc",
  ]);
  const countries = safeArr(countriesRes.ok ? countriesRes.data : [])
    .filter(c => (c.actif == null ? true : !!c.actif))
    .map(c => {
      const iso = up(c.iso2);
      const lf  = low(c.langue_finale || "");
      return {
        iso,
        slug: low(c.slug_pays||""),
        langue_finale: lf,
        currency_code: c.currency_code || "",
        currency_symbol: c.currency_symbol || "",
        label: pickCountryLabel(c, lf) || iso
      };
    })
    .filter(c=>c.iso);

  const sectorsRes = await sbGETFallback(env, "sectors", [
    "select=id,slug,nom_fr,nom_en,nom_de,nom_es,nom_it&order=slug.asc",
    "select=id,slug,name_fr,name_en,name_de,name_es,name_it&order=slug.asc",
    "select=id,sector_slug,nom_fr,nom_en&order=sector_slug.asc",
    "select=id,sector_slug,name_fr,name_en&order=sector_slug.asc",
  ]);
  let sectors = safeArr(sectorsRes.ok ? sectorsRes.data : []).map(s=>{
    const sector_id = low(s.slug || s.sector_slug || "");
    return {
      sector_id,
      fr: (s.nom_fr || s.name_fr || "").trim(),
      en: (s.nom_en || s.name_en || "").trim()
    };
  }).filter(s=>s.sector_id);

  const jobsRes = await sbGETFallback(env, "jobs", [
    "select=id,slug,sector_id,sector_slug,actif&order=slug.asc",
    "select=id,job_slug,sector_id,sector_slug,actif&order=job_slug.asc",
  ]);
  let jobs = safeArr(jobsRes.ok ? jobsRes.data : [])
    .filter(j => (j.actif == null ? true : !!j.actif))
    .map(j => ({
      id: j.id || null,
      slug: low(j.slug || j.job_slug || ""),
      sector_id: j.sector_id || null,
      sector_slug: low(j.sector_slug || "")
    }))
    .filter(j=>j.slug);

  const warnings = [];
  if (!countriesRes.ok) warnings.push({ scope:"countries", status:countriesRes.status, detail:countriesRes.data });
  if (!sectorsRes.ok) warnings.push({ scope:"sectors", status:sectorsRes.status, detail:sectorsRes.data });
  if (!jobsRes.ok) warnings.push({ scope:"jobs", status:jobsRes.status, detail:jobsRes.data });

  if (!sectors.length || !jobs.length){
    const fb = await buildJobsFromMpbFallback(env);
    if (!jobs.length) jobs = fb.jobs;
    if (!sectors.length) sectors = fb.sectors;
    warnings.push({ scope:"fallback", used:true, source_ok: fb.source_ok, source_status: fb.source_status });
  }

  return json({ ok:true, countries, sectors, jobs, ...(warnings.length?{warnings}:{}) }, 200, cors);
}

async function handleAvailableJobs(req, env, cors){
  const url = getUrl(req);
  const iso = up(url.searchParams.get("country") || url.searchParams.get("iso") || "");
  if (!iso) return json({ ok:false, error:"missing_country" }, 400, cors);

  // Country to decide language_finale (for labels)
  const countryRes = await sbGETFallback(env, "countries", [
    `select=iso2,langue_finale&iso2=eq.${encodeURIComponent(iso)}&limit=1`
  ]);
  const countryRow = safeArr(countryRes.ok ? countryRes.data : [])[0] || {};
  const lf = low(countryRow.langue_finale || "en");

  // MPB gives the effective available jobs
  const mpbRes = await sbGETFallback(env, "mpb", [
    `select=job_slug,iso2&iso2=eq.${encodeURIComponent(iso)}&limit=5000`,
    `select=slug,iso2&iso2=eq.${encodeURIComponent(iso)}&limit=5000`,
  ]);
  const rows = safeArr(mpbRes.ok ? mpbRes.data : []);
  const slugs = Array.from(new Set(rows.map(r=>low(r.job_slug || r.slug || "")).filter(Boolean))).sort();

  if (!slugs.length){
    return json({ ok:true, country: iso, lang: lf, jobs: [] }, 200, cors);
  }

  // Jobs meta
  const inList = slugs.slice(0, 1000).join(",");
  const jobsMetaRes = await sbGETFallback(env, "jobs", [
    `select=id,slug,sector_id,sector_slug&slug=in.(${encodeURIComponent(inList)})&limit=1000`,
    `select=id,job_slug,sector_id,sector_slug&job_slug=in.(${encodeURIComponent(inList)})&limit=1000`,
  ]);
  const jm = safeArr(jobsMetaRes.ok ? jobsMetaRes.data : []);
  const bySlug = new Map();
  const ids = [];
  for (const r of jm){
    const slug = low(r.slug || r.job_slug || "");
    if (!slug) continue;
    const id = r.id || null;
    if (id) ids.push(id);
    bySlug.set(slug, { id, sector_id: r.sector_id || null, sector_slug: low(r.sector_slug||"") });
  }

  // i18n titles (best effort)
  let titlesById = new Map();
  if (ids.length){
    const idList = ids.slice(0, 1000).join(",");
    const i18nRes = await sbGETFallback(env, "job_i18n", [
      `select=job_id,title,lang&lang=eq.${encodeURIComponent(lf)}&job_id=in.(${encodeURIComponent(idList)})&limit=1000`
    ]);
    const rowsI = safeArr(i18nRes.ok ? i18nRes.data : []);
    for (const r of rowsI){
      if (r.job_id) titlesById.set(String(r.job_id), String(r.title||"").trim());
    }
  }

  const jobs = slugs.map(slug=>{
    const meta = bySlug.get(slug) || { id:null, sector_id:null, sector_slug:"" };
    const label = meta.id ? (titlesById.get(String(meta.id)) || slug) : slug;
    return { slug, label, sector_slug: meta.sector_slug || "", sector_id: meta.sector_id || null };
  });

  return json({ ok:true, country: iso, lang: lf, jobs }, 200, cors);
}

async function handleMetierPage(req, env, cors){
  const url = getUrl(req);
  const slug = low(url.searchParams.get("slug") || "");
  const iso  = up(url.searchParams.get("iso") || "");
  if (!slug || !iso) return json({ ok:false, error:"missing_slug_or_iso" }, 400, cors);

  // Country
  const countryRes = await sbGETFallback(env, "countries", [
    `select=iso2,slug_pays,actif,langue_finale,nom_fr,nom_en,nom_de,nom_es,nom_it,currency_code,currency_symbol,banniere_sponsorisation_image_1,banniere_sponsorisation_image_2,banniere_attente_1_url,banniere_attente_2_url,asset_banniere_1,asset_banniere_2&iso2=eq.${encodeURIComponent(iso)}&limit=1`,
    `select=iso2,slug_pays,actif,langue_finale,name_fr,name_en,name_de,name_es,name_it,currency_code,currency_symbol,banniere_sponsorisation_image_1,banniere_sponsorisation_image_2,banniere_attente_1_url,banniere_attente_2_url,asset_banniere_1,asset_banniere_2&iso2=eq.${encodeURIComponent(iso)}&limit=1`,
    `select=iso2,slug_pays,actif,langue_finale,nom_fr,nom_en,nom_de,nom_es,nom_it,currency_code,currency_symbol&iso2=eq.${encodeURIComponent(iso)}&limit=1`,
    `select=iso2,slug_pays,actif,langue_finale,name_fr,name_en,name_de,name_es,name_it,currency_code,currency_symbol&iso2=eq.${encodeURIComponent(iso)}&limit=1`,
  ]);
  const c = safeArr(countryRes.ok ? countryRes.data : [])[0] || {};
  const lf = low(c.langue_finale || "en");
  const country_data = {
    iso: up(c.iso2 || iso),
    slug: low(c.slug_pays||""),
    langue_finale: lf,
    currency_code: c.currency_code || "",
    currency_symbol: c.currency_symbol || "",
    label: pickCountryLabel(c, lf) || iso,
    // banners (optional)
    banniere_sponsorisation_image_1: c.banniere_sponsorisation_image_1 || null,
    banniere_sponsorisation_image_2: c.banniere_sponsorisation_image_2 || null,
    banniere_attente_1_url: c.banniere_attente_1_url || null,
    banniere_attente_2_url: c.banniere_attente_2_url || null,
    asset_banniere_1: c.asset_banniere_1 || null,
    asset_banniere_2: c.asset_banniere_2 || null,
  };

  // Job meta (best effort)
  const jobRes = await sbGETFallback(env, "jobs", [
    `select=id,slug,sector_id,sector_slug&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    `select=id,job_slug,sector_id,sector_slug&job_slug=eq.${encodeURIComponent(slug)}&limit=1`,
  ]);
  const jobRow = safeArr(jobRes.ok ? jobRes.data : [])[0] || {};
  const jobOut = {
    id: jobRow.id || null,
    slug,
    sector_id: jobRow.sector_id || null,
    sector_slug: low(jobRow.sector_slug || "")
  };

  // i18n (best effort)
  let metier = null;
  if (jobOut.id){
    const i18nRes = await sbGETFallback(env, "job_i18n", [
      `select=lang,title,accroche,meta_title,meta_description,description_longue,description&job_id=eq.${encodeURIComponent(jobOut.id)}&lang=eq.${encodeURIComponent(lf)}&limit=1`,
      `select=lang,title,accroche,meta_title,meta_description,description_longue&job_id=eq.${encodeURIComponent(jobOut.id)}&lang=eq.${encodeURIComponent(lf)}&limit=1`,
      `select=lang,title,accroche,meta_title,meta_description,description_longue,description&job_id=eq.${encodeURIComponent(jobOut.id)}&limit=1`,
    ]);
    const r = safeArr(i18nRes.ok ? i18nRes.data : [])[0] || null;
    if (r){
      metier = {
        lang: low(r.lang || lf),
        title: r.title || null,
        accroche: r.accroche || null,
        meta_title: r.meta_title || null,
        meta_description: r.meta_description || null,
        description_longue: r.description_longue || r.description || null
      };
    }
  }

  // MPB: prefer lang = langue_finale (but fallback to any)
  const mpbRes = await sbGETFallback(env, "mpb", [
    `select=*&job_slug=eq.${encodeURIComponent(slug)}&iso2=eq.${encodeURIComponent(iso)}&lang=eq.${encodeURIComponent(lf)}&limit=1`,
    `select=*&job_slug=eq.${encodeURIComponent(slug)}&iso2=eq.${encodeURIComponent(iso)}&limit=1`,
    `select=*&slug=eq.${encodeURIComponent(slug)}&iso2=eq.${encodeURIComponent(iso)}&lang=eq.${encodeURIComponent(lf)}&limit=1`,
    `select=*&slug=eq.${encodeURIComponent(slug)}&iso2=eq.${encodeURIComponent(iso)}&limit=1`,
  ]);
  const mpbRow = safeArr(mpbRes.ok ? mpbRes.data : [])[0] || null;

  // Also provide blocs_pays array (MONO consumes arrays)
  const blocs_pays = mpbRow ? [mpbRow] : [];

  // FAQ
  const faqRes = await sbGETFallback(env, "faq", [
    `select=question,answer&job_slug=eq.${encodeURIComponent(slug)}&iso2=eq.${encodeURIComponent(iso)}&lang=eq.${encodeURIComponent(lf)}&order=question.asc&limit=50`,
    `select=question,answer&job_slug=eq.${encodeURIComponent(slug)}&iso2=eq.${encodeURIComponent(iso)}&order=question.asc&limit=50`,
  ]);
  const faq = safeArr(faqRes.ok ? faqRes.data : []).filter(x=>x && (x.question||x.answer));

  // ✅ Build a "fiche_metiers" single item compatible with MONO blocks
  // We rely on job_i18n for overview + accroche, and MPB blocs for formation/acces/marche/salaire.
  const fiche = {
    slug,
    lang: lf,
    job_title: (metier && metier.title) ? metier.title : slug,
    accroche: (metier && metier.accroche) ? metier.accroche : null,
    overview: (metier && metier.description_longue) ? metier.description_longue : (mpbRow && (mpbRow.marche_bloc || mpbRow.marche)) || null,
    missions: mpbRow ? (mpbRow.skills_must_have ? csvToUL(mpbRow.skills_must_have) : null) : null,
    competences: mpbRow ? (
      (mpbRow.tools_stack || mpbRow.soft_skills || mpbRow.skills_must_have)
        ? ( (mpbRow.skills_must_have?("<h4>Hard skills</h4>"+csvToUL(mpbRow.skills_must_have)):"")
          + (mpbRow.soft_skills?("<h4>Soft skills</h4>"+csvToUL(mpbRow.soft_skills)):"")
          + (mpbRow.tools_stack?("<h4>Tools / Stack</h4>"+csvToUL(mpbRow.tools_stack)):"")
          )
        : null
    ) : null,
    environnements: mpbRow ? (
      (mpbRow.typical_employers || mpbRow.hiring_sectors)
        ? ( (mpbRow.typical_employers?("<h4>Typical employers</h4>"+csvToUL(mpbRow.typical_employers)):"")
          + (mpbRow.hiring_sectors?("<h4>Hiring sectors</h4>"+csvToUL(mpbRow.hiring_sectors)):"")
          )
        : null
    ) : null,
    acces: mpbRow ? (mpbRow.acces_bloc || mpbRow.acces || null) : null,
    formation: mpbRow ? (mpbRow.formation_bloc || mpbRow.formation || null) : null,
    marche: mpbRow ? (mpbRow.marche_bloc || mpbRow.marche || null) : null,
    salaire_text: mpbRow ? (mpbRow.salaire_bloc || mpbRow.salaire || null) : null
  };

  return json({
    ok: true,
    country: iso,           // MUST be ISO string for MONO
    country_data,
    job: jobOut,
    metier,
    mpb: mpbRow ? {
      iso,
      metier: slug,
      // aliases expected by MONO
      formation: mpbRow.formation_bloc || mpbRow.formation || null,
      acces: mpbRow.acces_bloc || mpbRow.acces || null,
      marche: mpbRow.marche_bloc || mpbRow.marche || null,
      salaire: mpbRow.salaire_bloc || mpbRow.salaire || null,
      environnements: fiche.environnements || null,
      education_level_local: mpbRow.education_level_local || mpbRow.education_level || null,
      degrees_examples: mpbRow.degrees_examples || null,
      key_fields: mpbRow.top_fields || mpbRow.key_fields || null,
      certifications: mpbRow.certifications || null,
      schools_or_paths: mpbRow.schools_or_paths || null,
      skills_must_have: mpbRow.skills_must_have || null,
      soft_skills: mpbRow.soft_skills || null,
      tools_stack: mpbRow.tools_stack || null,
      salary_notes: mpbRow.salary_notes || null,
      growth_outlook: mpbRow.growth_outlook || null,
      market_demand: mpbRow.market_demand || null,
      // numeric salary if present
      salary_junior_min: mpbRow.salary_junior_min ?? null,
      salary_junior_max: mpbRow.salary_junior_max ?? null,
      salary_mid_min: mpbRow.salary_mid_min ?? null,
      salary_mid_max: mpbRow.salary_mid_max ?? null,
      salary_senior_min: mpbRow.salary_senior_min ?? null,
      salary_senior_max: mpbRow.salary_senior_max ?? null,
      salary_variable_share: mpbRow.salary_variable_share ?? null,
      remote_level: mpbRow.remote_level ?? null,
      automation_risk: mpbRow.automation_risk ?? null,
    } : null,
    blocs_pays,
    fiche_metiers: [fiche],
    faq
  }, 200, cors);
}

async function handleRequest(request, env, cors){
  const url = getUrl(request);
  const path = url.pathname || "/";
  if (path === "/" || path === "/health") return await handleHealth(request, env, cors);

  if (path === "/v1/filters") return await handleFilters(request, env, cors);
  if (path === "/v1/available-jobs") return await handleAvailableJobs(request, env, cors);
  if (path === "/v1/metier-page") return await handleMetierPage(request, env, cors);

  return json({ ok:false, error:"not_found", path }, 404, cors);
}

export default {
  async fetch(request, env){
    const cors = corsHeadersFor(request.headers.get("Origin"));
    if (request.method === "OPTIONS"){
      return new Response(null, { headers: cors });
    }
    const sec = requireProxySecret(request, env);
    if (!sec.ok) return json({ ok:false, error: sec.error }, 401, cors);

    try{
      return await handleRequest(request, env, cors);
    }catch(err){
      console.error("WORKER CRASH:", err);
      return json({ ok:false, error:"worker_crash", detail:String(err) }, 500, cors);
    }
  }
};
