
/**
 * ULYDIA DATA WORKER — Service Worker format (compatible)
 * Same logic as the Module worker, but wrapped with 
// --- PATCH32: define sleep() used by Airtable pagination / throttling
function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

addEventListener("fetch").
 *
 * If your Cloudflare Worker is configured as "Service Worker" (not Modules),
 * paste THIS file in the editor and deploy.
 */
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request, event) {
  // Service Worker bindings are exposed as globals (e.g. AIRTABLE_API_KEY),
  // whereas Module workers receive an `env` object. The app code expects `env.X`.
  // So we build an `env` object from globals in a safe way (no ReferenceError).
  function getBinding(name){
    try { if (Object.prototype.hasOwnProperty.call(globalThis, name)) return globalThis[name]; } catch(e){}
    try { return (typeof globalThis[name] !== "undefined") ? globalThis[name] : undefined; } catch(e){}
    try { return (typeof eval(name) !== "undefined") ? eval(name) : undefined; } catch(e){}
    return undefined;
  }
  const env = {
    AIRTABLE_API_KEY: getBinding("AIRTABLE_API_KEY"),
    AIRTABLE_BASE_ID: getBinding("AIRTABLE_BASE_ID"),
    ALLOWED_ORIGINS:  getBinding("ALLOWED_ORIGINS"),
    AIRTABLE_TABLE_PAYS:      getBinding("AIRTABLE_TABLE_PAYS"),
    AIRTABLE_TABLE_SECTEURS:  getBinding("AIRTABLE_TABLE_SECTEURS"),
    AIRTABLE_TABLE_FICHE:     getBinding("AIRTABLE_TABLE_FICHE"),
    AIRTABLE_TABLE_MPB:       getBinding("AIRTABLE_TABLE_MPB"),
    AIRTABLE_TABLE_FAQ:       getBinding("AIRTABLE_TABLE_FAQ") || getBinding("AIRTABLE_TABLE_FAQS"),
    AIRTABLE_FIELD_SLUG_FICHE:        getBinding("AIRTABLE_FIELD_SLUG_FICHE") || getBinding("AIRTABLE_FIELD_SLUG_FICHE_PRIMARY"),
    AIRTABLE_FIELD_PAYS_FICHE:        getBinding("AIRTABLE_FIELD_PAYS_FICHE"),
    AIRTABLE_FIELD_SLUG_MPB:          getBinding("AIRTABLE_FIELD_SLUG_MPB"),
    AIRTABLE_FIELD_PAYS_MPB:          getBinding("AIRTABLE_FIELD_PAYS_MPB"),
    AIRTABLE_FIELD_SLUG_FAQ:          getBinding("AIRTABLE_FIELD_SLUG_FAQ"),
    AIRTABLE_FIELD_PAYS_FAQ:          getBinding("AIRTABLE_FIELD_PAYS_FAQ"),
    AIRTABLE_FIELD_FICHE_LANG:        getBinding("AIRTABLE_FIELD_FICHE_LANG"),
  };
  const ctx = event;

    try {
      const url = new URL(request.url);
      // CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      }
      const path = url.pathname;

      if (path === "/health") {
        return json({ ok: true }, 200, corsHeaders(request, env));
      }

      if (path === "/v1/metier-page") {
        return await withCache(request, ctx, 300, () => handleMetierPage(request, env, ctx));
      }

      if (path === "/v1/filters") {
        return await withCache(request, ctx, 300, () => handleFilters(request, env, ctx));
      }

      if (path === "/v1/countries") {
        return await withCache(request, ctx, 3600, () => handleCountries(request, env, ctx));
      }

      return json({ ok: false, error: "Not found" }, 404, corsHeaders(request, env));
    } catch (e) {
      return json({ ok: false, error: "Worker crashed", detail: String(e && e.stack || e) }, 200, corsHeaders(request, env));
    }

}

function getCfg(env) {
  const cfg = {
    apiKey: env.AIRTABLE_API_KEY,
    baseId: env.AIRTABLE_BASE_ID,
    tables: {
      pays: env.AIRTABLE_TABLE_PAYS || "Pays",
      secteurs: env.AIRTABLE_TABLE_SECTEURS || "Secteurs_activite",
      fiche: env.AIRTABLE_TABLE_FICHE || "Fiche Metiers",
      mpb: env.AIRTABLE_TABLE_MPB || "METIER_PAYS_DATA",
      faq: env.AIRTABLE_TABLE_FAQ || "FAQ",
    },
    fields: {
      ficheSlug: env.AIRTABLE_FIELD_SLUG_FICHE || "",
      fichePays: env.AIRTABLE_FIELD_PAYS_FICHE || "",
      mpbSlug: env.AIRTABLE_FIELD_SLUG_MPB || "",
      mpbPays: env.AIRTABLE_FIELD_PAYS_MPB || "",
      faqSlug: env.AIRTABLE_FIELD_SLUG_FAQ || "",
      faqPays: env.AIRTABLE_FIELD_PAYS_FAQ || "",
    }
  };
  return cfg;
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "*";

  // Default: allow any origin (no credentials). If you want to restrict later, set ALLOWED_ORIGINS to a comma list.
  const allow = (env && env.ALLOWED_ORIGINS) ? String(env.ALLOWED_ORIGINS) : "https://ulydia.com, https://www.ulydia.com, *";
  let allowOrigin = "*";
  if (allow !== "*") {
    const allowed = allow.split(",").map(s => s.trim()).filter(Boolean);
    allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || "*");
  }

  // Reflect requested headers (preflight) + ensure our custom header is always allowed
  const reqHeaders = request.headers.get("Access-Control-Request-Headers");
  const base = ["content-type","authorization","x-requested-with","x-ulydia-proxy-secret"];
  const extra = (reqHeaders ? reqHeaders.split(",") : []).map(s=>s.trim().toLowerCase()).filter(Boolean);
  const allowHeaders = Array.from(new Set(base.concat(extra))).join(", ");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(obj, status=200, headers={}, cacheControl=null) {
  const base = {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  };
  if (cacheControl) base["Cache-Control"] = cacheControl;
  else base["Cache-Control"] = "no-store";
  return new Response(JSON.stringify(obj), { status, headers: base });
}

// Convenience wrapper: includes CORS headers
function jsonResponse(obj, request, env, status=200, headers={}, cacheControl=null) {
  const cors = corsHeaders(request, env);
  return json(obj, status, { ...cors, ...headers }, cacheControl);
}

// Cloudflare cache helper for GET JSON endpoints
async function withCache(request, ctx, ttlSeconds, computeResponse) {
  try {
    if (!ctx || request.method !== "GET") return await computeResponse();
    const url = new URL(request.url);
    if (url.searchParams.has("nocache")) return await computeResponse();

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });

    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const resp = await computeResponse();
    if (resp && resp.ok) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  } catch (e) {
    return await computeResponse();
  }
}

function normalizeIso(iso) {
  return String(iso || "").trim().toUpperCase();
}

function normalizeFinalLang(lang){
  lang = String(lang || "").trim().toLowerCase();
  if(!lang) return "";
  // Accept common variants from Airtable (single select labels, locale codes, etc.)
  // Examples: "fr", "FR", "fr-FR", "Français", "French", "anglais", "English", "de-DE", etc.
  const short = lang.split(/[-_\s]/)[0];
  if(["fr","en","de","es","it"].includes(short)) return short;
  if(lang.includes("fran")) return "fr";        // français / francais / french
  if(lang.includes("french")) return "fr";
  if(lang.includes("anglais")) return "en";
  if(lang.includes("english")) return "en";
  if(lang.includes("deut")) return "de";        // deutsch / allemand
  if(lang.includes("germ")) return "de";
  if(lang.includes("allem")) return "de";
  if(lang.includes("espa") || lang.includes("span")) return "es";
  if(lang.includes("ital")) return "it";
  return ""; // unknown
}


function guessFinalLangFieldValue(fields){
  try{
    const keys = Object.keys(fields||{});
    for(const k of keys){
      const lk = String(k).toLowerCase();
      if((lk.includes("lang") || lk.includes("language")) && lk.includes("final")) return fields[k];
      if(lk in {"langue_finale":1,"langue finale":1,"langue finale ":1,"final_lang":1,"final lang":1,"final language":1,"finallanguage":1,"lang_final":1,"lang final":1}) return fields[k];
    }
  }catch(e){}
  return "";
}

function cleanStr(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function slugify(input) {
  // Safe slug for stable IDs (ASCII-ish, kebab-case)
  let s = String(input ?? "").trim().toLowerCase();
  if (!s) return "";
  try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch(e) {}
  s = s
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s;
}

function isRecId(v){
  const s = String(v||"").trim();
  return /^rec[a-zA-Z0-9]{10,}$/.test(s);
}
function isGarbageId(v){
  const s = String(v||"").trim();
  return !s ? false : (s.startsWith("chatcmpl-"));
}
function pickFieldValue(fields, names){
  if(!fields) return undefined;
  for(const n of (names||[])){
    if(!n) continue;
    if(Object.prototype.hasOwnProperty.call(fields, n)){
      const v = fields[n];
      if(v !== undefined && v !== null && v !== "") return v;
    }
  }
  return undefined;
}

function pickTextField(fields, candidates){
  const v = pickFieldValue(fields, candidates);
  if(v === undefined || v === null) return "";
  // Airtable sometimes returns arrays for multi-select / linked records
  if(Array.isArray(v)) return v.map(x=>cleanStr(x)).filter(Boolean).join(", ");
  // Rich text / long text are returned as strings
  return String(v);
}
function firstOf(v){
  if(Array.isArray(v)) return v.length ? v[0] : "";
  return v;
}
async function airtableGetById(env, table, recId, fields){
  if(!recId) return null;
  const params = {
    maxRecords: 1,
    filterByFormula: `RECORD_ID()="${String(recId).replace(/"/g,'\\"')}"`,
  };
  if(Array.isArray(fields) && fields.length){
    params.fields = fields;
  }
  const out = await airtableList(table, params, env);
  const rec = (out.records && out.records[0]) ? out.records[0] : null;
  return rec;
}

// Pick localized label from Airtable-style fields (Nom_FR, Nom_EN, Nom_DE, Nom_ES, Nom_IT)
function pickLangValue(fields, lang) {
  const L = String(lang || "").toLowerCase();
  const map = { fr: "Nom_FR", en: "Nom_EN", de: "Nom_DE", es: "Nom_ES", it: "Nom_IT" };
  const key = map[L] || map.en;

  const tryVals = [
    fields?.[key],
    fields?.Nom_EN,
    fields?.Nom_FR,
    fields?.Nom,

    fields?.["name_" + L],
    fields?.["label_" + L],
    fields?.name,
    fields?.label
  ];

  for (const v of tryVals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function looksLikeFormula(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return false;
  return (
    s.startsWith("lower(") ||
    s.startsWith("replace(") ||
    s.includes("{") ||
    s.includes("}") ||
    s.includes("find(") ||
    s.includes("substitute(") ||
    s.includes("regex")
  );
}



function pickBestMPB(list){
  if (!Array.isArray(list) || list.length <= 1) return Array.isArray(list) ? list : [];
  function isDone(x){
    const v = String((x && (x.Status_generation || x.status_generation || x.Status || x.statut)) || "").toLowerCase().trim();
    return v === "done" || v === "ok" || v === "true";
  }
  function ts(x){
    const t = x && (x.updated_at || x.Updated_at || x.updatedAt || x.Last_modified || x.last_modified || x.LastModified);
    const d = t ? Date.parse(String(t)) : NaN;
    return Number.isFinite(d) ? d : 0;
  }
  const done = list.filter(isDone);
  const pool = done.length ? done : list.slice();
  pool.sort((a,b) => ts(b) - ts(a));
  return [pool[0]];
}

function firstAttachmentUrl(val) {
  // Airtable attachment fields are typically: [{url, filename, ...}, ...]
  if (!val) return "";
  if (typeof val === "string") return String(val).trim();
  if (Array.isArray(val)) {
    const o = val[0];
    if (o && typeof o === "object") {
      if (typeof o.url === "string") return o.url.trim();
      if (typeof o.downloadUrl === "string") return o.downloadUrl.trim();
      if (typeof o.thumbnails?.large?.url === "string") return o.thumbnails.large.url.trim();
      if (typeof o.thumbnails?.full?.url === "string") return o.thumbnails.full.url.trim();
    }
    return "";
  }
  if (typeof val === "object") {
    if (typeof val.url === "string") return val.url.trim();
    if (typeof val.downloadUrl === "string") return val.downloadUrl.trim();
  }
  return "";
}

function normalizeSlugVariants(slug) {
  const s = String(slug || "").trim();
  const dash = s.replace(/_/g, "-");
  const under = s.replace(/-/g, "_");
  return Array.from(new Set([s, dash, under].filter(Boolean)));
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(v => v !== undefined && v !== null && String(v).trim() !== "").map(v => String(v))));
}


const SCHEMA_CACHE = new Map(); // key: tableName => { fields: Set<string>, sample: object }

async function getSchema(env, tableName) {
  const key = tableName;
  if (SCHEMA_CACHE.has(key)) return SCHEMA_CACHE.get(key);

  // Fetch 1 record, no fields[] to discover actual names
  const res = await airtableList(tableName, { maxRecords: 1 }, env);
  const sample = (res.records && res.records[0] && res.records[0].fields) ? res.records[0].fields : {};
  const fields = new Set(Object.keys(sample || {}));

  const schema = { fields, sample };
  SCHEMA_CACHE.set(key, schema);
  return schema;
}

function pickField(schemaFieldsSet, candidates) {
  for (const c of candidates) {
    if (!c) continue;
    if (schemaFieldsSet.has(c)) return c;
  }
  // case-insensitive match (helps if Airtable has different casing)
  const lowerMap = new Map();
  for (const f of schemaFieldsSet) lowerMap.set(String(f).toLowerCase(), f);
  for (const c of candidates) {
    if (!c) continue;
    const hit = lowerMap.get(String(c).toLowerCase());
    if (hit) return hit;
  }
  return "";
}

function escFormulaStr(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildPaysMatch(field, iso) {
  // Airtable: certains champs pays peuvent être single-select ("FR") ou multi-select ("FR,BE")
  // On accepte equality OU FIND(iso, field)
  const f = String(field || "").trim();
  const v = escFormulaStr(iso);
  if (!f) return "1=1";
  return `OR({${f}}="${v}", FIND("${v}", {${f}}))`;
}


function buildOrEquals(field, values) {
  const parts = values.map(v => `{${field}}="${escFormulaStr(v)}"`).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  return `OR(${parts.join(",")})`;
}

function andParts(parts) {
  const p = parts.filter(Boolean);
  if (!p.length) return "";
  if (p.length === 1) return p[0];
  return `AND(${p.join(",")})`;
}

async function handleMetierPage(request, env, ctx) {
  const headers = corsHeaders(request, env);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const cfg = getCfg(env);
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") || url.searchParams.get("metier") || url.searchParams.get("job") || "").trim();
  const iso = normalizeIso(url.searchParams.get("iso") || url.searchParams.get("country") || url.searchParams.get("pays") || "");

  if (!slug || !iso) return json({ ok:false, error:"Missing slug or iso" }, 400, headers);
  if (!cfg.apiKey || !cfg.baseId) return json({ ok:false, error:"Missing Airtable env (AIRTABLE_API_KEY/AIRTABLE_BASE_ID)" }, 200, headers);

  // PAY info (for lang/banners) — we fetch it early because fiche content is stored by FINAL LANGUAGE (not per country)
  const pays = await fetchPays(env, cfg, iso);
  const langFinalRaw = (pays && (pays.langue_finale || pays.lang_finale || pays.final_lang || pays.finalLang)) ? cleanStr(pays.langue_finale || pays.lang_finale || pays.final_lang || pays.finalLang) : "";
  const langFinal = normalizeFinalLang(langFinalRaw) || "en";

// Detect fields for FICHE table (robust: try several field names until Airtable accepts the formula)
const ficheTable = cfg.tables.fiche;
const ficheSchema = await getSchema(env, ficheTable);

const slugVars = normalizeSlugVariants(slug);

// Candidate field names (override with env AIRTABLE_FIELD_SLUG_FICHE / AIRTABLE_FIELD_PAYS_FICHE if needed)
const slugCandidates = uniq([
  cfg.fields.ficheSlug,
  // common names
  "slug_clean","Slug_clean","JOB_SLUG","job_slug","metier_slug","Metier_slug","Slug","slug",
  // also try what exists in the table (case-sensitive)
  ...Array.from(ficheSchema.fields || [])
]);

const paysCandidates = uniq([
  cfg.fields.fichePays,
  "PAYS","pays_code","Pays_code","Code_ISO2","code_iso2","countries","Countries","country","Country","Pays","CODE_ISO2",
  ...Array.from(ficheSchema.fields || [])
]);

let ficheSlugField = null;
let fichePaysField = null;
let fiche = null;
let ficheFields = null;

// Try combinations until one works (skips unknown-field formula errors)
for (const sf of slugCandidates) {
  if (!sf) continue;
  for (const pf of paysCandidates) {
    if (!pf) continue;
    const formula = andParts([
      buildOrEquals(sf, slugVars),
      `{${pf}}="${escFormulaStr(iso)}"`
    ]);
    try {
      const ficheRes = await airtableList(ficheTable, { filterByFormula: formula, maxRecords: 1 }, env);
      fiche = (ficheRes.records && ficheRes.records[0]) ? ficheRes.records[0] : null;
      ficheFields = fiche ? (fiche.fields || {}) : null;
      ficheSlugField = sf;
      fichePaysField = pf;
      break;
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      // Airtable returns 422 with "UNKNOWN_FIELD_NAME" / "INVALID_FILTER_BY_FORMULA" when a field name is wrong
      if (msg.includes("UNKNOWN_FIELD_NAME") || msg.includes("INVALID_FILTER_BY_FORMULA")) continue;
      throw e;
    }
  }
  if (ficheSlugField && fichePaysField) break;
}


// If no record matched by ISO (because fiches are stored by final language), try slug + final language.
// This preserves country-specific sponsor/banners via `iso`, while reusing the same fiche content across all countries
// that share the same final language (fr/en/de/es/it).
let ficheLangField = null;
if (!fiche && langFinal) {
  const ficheLangCandidates = uniq([
    env.AIRTABLE_FIELD_FICHE_LANG,
    "Langue_finale","Langue finale","lang_finale","final_lang","finalLang","Langue_principale","language","Language","lang","Lang",
    ...Array.from(ficheSchema.fields || [])
  ]);

  for (const sf of slugCandidates) {
    if (!sf) continue;
    for (const lf of ficheLangCandidates) {
      if (!lf) continue;
      const formula = andParts([
        buildOrEquals(sf, slugVars),
        `{${lf}}="${escFormulaStr(langFinal)}"`
      ]);
      try {
        const ficheRes = await airtableList(ficheTable, { filterByFormula: formula, maxRecords: 1 }, env);
        const hit = (ficheRes.records && ficheRes.records[0]) ? ficheRes.records[0] : null;
        // stop at the first formula that Airtable accepts; keep the hit if any
        ficheSlugField = sf;
        ficheLangField = lf;
        if (hit) {
          fiche = hit;
          ficheFields = fiche.fields || {};
        }
        break;
      } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        if (msg.includes("UNKNOWN_FIELD_NAME") || msg.includes("INVALID_FILTER_BY_FORMULA")) continue;
        throw e;
      }
    }
    if (ficheSlugField && ficheLangField) break;
  }
}

// If still not found, return explicit debug so you can tell me the real column names
if (!ficheSlugField) {
  return json({
    ok:false,
    error:`Cannot find a usable slug field in table "${ficheTable}". Set AIRTABLE_FIELD_SLUG_FICHE to your exact column name.`,
    debug: { detectedFields: Array.from(ficheSchema.fields).slice(0, 120) }
  }, 200, headers);
}
if (!fichePaysField && !ficheLangField) {
  return json({
    ok:false,
    error:`Cannot find a usable country or language field in table "${ficheTable}". Set AIRTABLE_FIELD_PAYS_FICHE (optional) and/or AIRTABLE_FIELD_FICHE_LANG to your exact column name.`,
    debug: { detectedFields: Array.from(ficheSchema.fields).slice(0, 120) }
  }, 200, headers);
}


  // MPB
  const mpb = await fetchMPB(env, cfg, slugVars, iso);
  // FAQ
  const faq = await fetchFAQ(env, cfg, slugVars, iso);
  // --- Normalize fields for robust matching (Slug_clean / Secteur_ID) ---
  const slugReq = cleanStr(slug);
  const isoReq = cleanStr(iso).toUpperCase();
  const langReq = cleanStr(langFinal).toLowerCase();

  // Normalize fiche fields
  if (ficheFields) {
    const ficheSlugClean = cleanStr(ficheFields.Slug_clean || ficheFields.slug_clean || (ficheSlugField ? ficheFields[ficheSlugField] : "") || "");
    ficheFields.Slug_clean = ficheSlugClean && !looksLikeFormula(ficheSlugClean) ? ficheSlugClean : slugReq;

    // If "Slug" is missing or is a formula, force it to Slug_clean
    const ficheSlug = cleanStr(ficheFields.Slug || ficheFields.slug || "");
    ficheFields.Slug = (!ficheSlug || looksLikeFormula(ficheSlug)) ? ficheFields.Slug_clean : ficheSlug;

    // Secteur_ID (avoid leaking formula text)
    if (looksLikeFormula(ficheFields.Secteur_ID)) ficheFields.Secteur_ID = "";
  }

  // Normalize MPB records
  let mpbNorm = Array.isArray(mpb) ? mpb.map(r => {
    const out = { ...(r || {}) };

    const slugNorm = cleanStr(slugReq || "").replace(/_/g,"-");
    out.Slug_clean = slugNorm || (ficheFields?.Slug_clean || "");
    out.Slug = out.Slug_clean;

    // Aliases used by different MONO builds
    out.metier_slug = out.Slug_clean;
    out.slug_clean = out.Slug_clean;

    // Normalize country/lang if present
    if (out.pays_code) out.pays_code = cleanStr(out.pays_code).toUpperCase();
    if (out.langue) out.langue = cleanStr(out.langue).toLowerCase();

    // Clean key (some builds match on this)
    out.Key = `${out.Slug_clean}|${isoReq}|${langReq}`;

    if ("Secteur_ID" in out && looksLikeFormula(out.Secteur_ID)) out.Secteur_ID = "";
    return out;
  }) : [];
  // Keep only the best MPB record (some Airtable views can return duplicates)
  mpbNorm = pickBestMPB(mpbNorm);

  // --- Resolve sector id/name (can be key or linked record recXXXX)
  const langFinal2 = (pays && pays.langue_finale) ? String(pays.langue_finale) : "";
  const F_FICHE_SECTOR_LINK2 = env.AIRTABLE_FIELD_FICHE_SECTOR_LINK || env.AIRTABLE_FIELD_FICHE_SECTOR_ID || "Secteur_ID";
  const sectorFieldCandidates2 = [
    F_FICHE_SECTOR_LINK2,
    "Secteur",
    "Secteur_activite",
    "Secteur_activité",
    "Secteur activité",
    "Secteur d’activité",
    "Secteur d'activité",
    "Sector",
    "sector",
    "Sector_ID",
  ];
  let sectorRef2 = String(firstOf(pickFieldValue(ficheFields, sectorFieldCandidates2)) || "").trim();
  let metierSectorId = "";
  let metierSectorName = "";

  if (sectorRef2) {
    if (isGarbageId(sectorRef2)) {
      // ignore
    } else if (isRecId(sectorRef2)) {
      const secRec = await airtableGetById(env, TABLE_SECTEURS, sectorRef2, ["Secteur_ID","Nom_FR","Nom_EN","Nom_ES","Nom_DE","Nom_IT","Nom_interne"]);
      if (secRec && secRec.fields) {
        const sf = secRec.fields;
        metierSectorId = String(sf.Secteur_ID || slugify(sf.Nom_interne || pickLangValue(sf, langFinal2, "Nom") || "") || "").trim();
        metierSectorName = String(pickLangValue(sf, langFinal2, "Nom") || sf.Nom_interne || "").trim();
      } else {
        metierSectorId = sectorRef2;
      }
    } else {
      // assume it's already a functional key or label
      metierSectorId = String(sectorRef2).trim();
      // try resolve by functional key
      try{
        const out = await airtableList(TABLE_SECTEURS, { maxRecords: 1, filterByFormula: `{Secteur_ID}="${metierSectorId.replace(/"/g,'\"')}"`, fields:["Secteur_ID","Nom_FR","Nom_EN","Nom_ES","Nom_DE","Nom_IT","Nom_interne"] }, env);
        const secRec = (out && out.records && out.records[0]) ? out.records[0] : null;
        if (secRec && secRec.fields) {
          const sf = secRec.fields;
          metierSectorName = String(pickLangValue(sf, langFinal2, "Nom") || sf.Nom_interne || "").trim();
          metierSectorId = String(sf.Secteur_ID || metierSectorId).trim();
        } else {
          // maybe it's a label
          const keyGuess = slugify(metierSectorId);
          const out2 = await airtableList(TABLE_SECTEURS, { maxRecords: 1, filterByFormula: `OR({Nom_FR}="${metierSectorId.replace(/"/g,'\"')}",{Nom_EN}="${metierSectorId.replace(/"/g,'\"')}",{Nom_ES}="${metierSectorId.replace(/"/g,'\"')}",{Nom_DE}="${metierSectorId.replace(/"/g,'\"')}",{Nom_IT}="${metierSectorId.replace(/"/g,'\"')}",{Nom_interne}="${metierSectorId.replace(/"/g,'\"')}")`, fields:["Secteur_ID","Nom_FR","Nom_EN","Nom_ES","Nom_DE","Nom_IT","Nom_interne"] }, env);
          const secRec2 = (out2 && out2.records && out2.records[0]) ? out2.records[0] : null;
          if (secRec2 && secRec2.fields) {
            const sf = secRec2.fields;
            metierSectorId = String(sf.Secteur_ID || keyGuess).trim();
            metierSectorName = String(pickLangValue(sf, langFinal2, "Nom") || sf.Nom_interne || "").trim();
          } else {
            metierSectorId = keyGuess || metierSectorId;
          }
        }
      }catch(e){}
    }
  }


  // Fallback sector extraction (some languages / records may not have the linked sector id filled yet)
  if (!metierSectorId) {
    const rawSector = pickTextField(ficheFields, [
      "Secteur_slug","secteur_slug","Secteur","secteur",
      "Secteur_activite","Secteur activité","secteur_activite","secteur activité",
      "Sector","sector","Sector_slug","sector_slug",
      "Sector_id","sector_id","Secteur_id","secteur_id"
    ]);
    if (rawSector) {
      metierSectorId = slugify(rawSector);
      if (!metierSectorName) metierSectorName = rawSector;
    }
  }

  const payload = {
    ok: true,
    iso,
    lang: (pays && pays.langue_finale) ? String(pays.langue_finale) : "",
    metier: {
      slug: (ficheFields && ficheFields.Slug_clean) ? String(ficheFields.Slug_clean) : slug,
      secteur_id: metierSectorId || "",
      secteur_name: metierSectorName || "",
      // We keep minimal; front-end already has title/subtitle in its own logic.
      // But we try to provide a title if a field looks like it exists.
      title: pickTitleFromFiche(ficheFields) || slugToTitle(slug),
      subtitle: pickSubtitleFromFiche(ficheFields) || "",
      heroImageUrl: pickHeroFromFiche(ficheFields) || "",

      // --- Content fields (Fiche Metiers)
      // Your Airtable schema uses these French column names.
      accroche: pickTextField(ficheFields, ["Accroche","accroche","Hook","hook"]),
      description: pickTextField(ficheFields, ["Description","description","Overview","overview","Présentation","Presentation"]),
      missions: pickTextField(ficheFields, ["Missions","missions","Responsibilities","responsibilities"]),
      environnements: pickTextField(ficheFields, ["Environnements","environnements","Environment","environment"]),
      profil_recherche: pickTextField(ficheFields, ["Profil_recherche","Profil recherche","profil_recherche","profil recherché","Profil_recherché","Profile","profile"]),
      competences: pickTextField(ficheFields, ["Compétences","Competences","compétences","competences","Skills","skills"]),
      experience_requise: pickTextField(ficheFields, ["Experience_requise","Experience requise","Expérience_requise","Expérience requise","experience_requise","Experience","experience"]),

      // --- Aliases for front-end compatibility (some MONO builds expect these keys)
      // Keep both the original French-named keys and these neutral aliases.
      overview: pickTextField(ficheFields, ["Description","description","Overview","overview","Présentation","Presentation"]),
      overview_html: pickTextField(ficheFields, ["Description","description","Overview","overview","Présentation","Presentation"]),
      missions_html: pickTextField(ficheFields, ["Missions","missions","Responsibilities","responsibilities"]),
      skills: pickTextField(ficheFields, ["Compétences","Competences","compétences","competences","Skills","skills"]),
      skills_html: pickTextField(ficheFields, ["Compétences","Competences","compétences","competences","Skills","skills"]),
      environment: pickTextField(ficheFields, ["Environnements","environnements","Environment","environment"]),
      environment_html: pickTextField(ficheFields, ["Environnements","environnements","Environment","environment"]),
      profile: pickTextField(ficheFields, ["Profil_recherche","Profil recherche","profil_recherche","profil recherché","Profil_recherché","Profile","profile"]),
      profile_html: pickTextField(ficheFields, ["Profil_recherche","Profil recherche","profil_recherche","profil recherché","Profil_recherché","Profile","profile"]),
      evolutions_possibles: pickTextField(ficheFields, ["Evolutions_possibles","Evolutions possibles","Évolutions_possibles","Évolutions possibles","evolutions_possibles","Career_paths","Career paths","career_paths"]),

      // SEO fields
      meta_title: pickTextField(ficheFields, ["Meta_title","Meta title","meta_title","meta title","SEO_title","SEO title"]),
      meta_description: pickTextField(ficheFields, ["Meta_description","Meta description","meta_description","meta description","SEO_description","SEO description"]),
      jsonld: pickTextField(ficheFields, ["JSONLD","Jsonld","jsonld","schema","Schema","schema_jsonld"]),

      // Optional LLM helper fields (do not block rendering)
      llm_canonical_label_en: pickTextField(ficheFields, ["LLM_canonical_label_EN","llm_canonical_label_en","Canonical_EN","canonical_en"]),
      llm_synonyms_en: pickTextField(ficheFields, ["LLM_synonyms_EN","llm_synonyms_en","Synonyms_EN","synonyms_en"]),

      not_available: !ficheFields,
      message: !ficheFields ? `This job description is not yet available for language (${langFinal}) — select another country/language.` : ""
    },
    pays: pays || { iso, label: iso, langue_finale: "", banners: {} },
    blocs_pays: mpbNorm || [],
    mpb: mpbNorm || [],
    metier_pays_blocs: mpbNorm || [],
    mpb_one: (mpbNorm && mpbNorm[0]) ? mpbNorm[0] : null,
    faq: faq || [],
    _debug: {
      fiche: { table: ficheTable, slugField: ficheSlugField, paysField: fichePaysField, langField: ficheLangField, match: (ficheFields ? (fichePaysField ? "iso" : "lang") : "none"), found: !!ficheFields },
      mpb: mpb ? { len: mpb.length } : { len: 0 },
      faq: faq ? { len: faq.length } : { len: 0 }
    }
  };

  // Optionally include fiche fields raw for the page renderer (it expects certain keys)
  if (ficheFields) payload.fiche = ficheFields;

  return json(payload, 200, headers);
}


async function handleFilters(request, env) {
  const url = new URL(request.url);
  const iso = (url.searchParams.get("iso") || url.searchParams.get("country") || "FR").toUpperCase();
  const hardLimit = Math.max(50, Math.min(20000, parseInt(url.searchParams.get("limit") || "20000", 10) || 20000));

  const TABLE_PAYS    = env.AIRTABLE_TABLE_PAYS || "Pays";
  const TABLE_FICHE   = env.AIRTABLE_TABLE_FICHE || "Fiche Metiers";
  const TABLE_SECTORS = env.AIRTABLE_TABLE_SECTEURS || "Secteurs_activite";

  // Fields (Airtable) — override via env if needed
  const F_PAYS_ISO   = env.AIRTABLE_FIELD_PAYS_ISO || "Code_ISO2";
  const F_PAYS_LANG  = env.AIRTABLE_FIELD_PAYS_LANG_FINAL || "Langue_finale";

  const F_FICHE_SLUG = env.AIRTABLE_FIELD_FICHE_SLUG || "slug_clean";
  const F_FICHE_NAME = env.AIRTABLE_FIELD_FICHE_NAME || "Nom_interne";
  const F_FICHE_LANG = env.AIRTABLE_FIELD_FICHE_LANG || "Langue_finale";

  // IMPORTANT:
  // - If your fiche sector is a linked-record field, set AIRTABLE_FIELD_FICHE_SECTOR_LINK to that field name.
  // - Otherwise it can be a text key field (Secteur_ID, Nom_interne, etc.).
  const F_FICHE_SECTOR_LINK = env.AIRTABLE_FIELD_FICHE_SECTOR_LINK || env.AIRTABLE_FIELD_FICHE_SECTOR_ID || "Secteur_ID";

  // Sector table fields (we support multiple common schemas)
  const F_SECTOR_KEY  = env.AIRTABLE_FIELD_SECTOR_ID || "Secteur_ID";      // functional key if you have it
  const F_SECTOR_INT  = env.AIRTABLE_FIELD_SECTOR_INTERNAL || "Nom_interne";
  const F_SECTOR_REC  = env.AIRTABLE_FIELD_SECTOR_RECORD_ID || "Record_ID";

  // --- Find country row to get lang_finale
  let paysRecs = [];
  try {
    const formula = `{${F_PAYS_ISO}}="${iso}"`;
    const batch = await airtableList(TABLE_PAYS, { pageSize: 100, filterByFormula: formula }, env);
    paysRecs = batch.records || [];
  } catch(e) {}

  if (!paysRecs.length) {
    const all = await airtableAll(env, TABLE_PAYS, 5000);
    paysRecs = all.filter(r => String(r?.fields?.[F_PAYS_ISO] || "").toUpperCase() === iso);
  }

  const paysRow = paysRecs[0]?.fields || {};
  const langFinal = String(paysRow[F_PAYS_LANG] || "en").toLowerCase();

  // --- Load sectors (FULL) and build robust maps
  const sectorRecs = await airtableAll(env, TABLE_SECTORS, 20000);

  // Map by Airtable record id => { id: stableKey, name: localizedName }
  const sectorByRecordId = new Map();
  // Map by stableKey => localizedName (used to build sectors list from jobs)
  const sectorNameByKey = new Map();

  for (const r of sectorRecs) {
    const f = r.fields || {};
    const localizedName =
      pickLangValue(f, langFinal, "Nom") ||
      String(f.Nom_FR || f.Nom_EN || f.Nom_DE || f.Nom_ES || f.Nom_IT || f[F_SECTOR_INT] || "").trim();

    const stableKey = String(
      f[F_SECTOR_KEY] ||
      f[F_SECTOR_INT] ||
      f[F_SECTOR_REC] ||
      r.id
    ).trim();

    if (!stableKey || !localizedName) continue;

    const cleanKey = slugify(stableKey);
    const cleanName = String(localizedName).trim();

    sectorByRecordId.set(r.id, { id: cleanKey, name: cleanName });
    sectorNameByKey.set(cleanKey, cleanName);
  }

  // --- Load jobs (FULL) and map sector
  const ficheRecs = await airtableAll(env, TABLE_FICHE, hardLimit);

  const jobs = [];
  for (const r of ficheRecs) {
    const f = r.fields || {};  // language filter only if the field exists and is filled
    // IMPORTANT: normalize values like "FR", "Français", "French", "en-US" to "fr/en/..."
    const lRaw = String(f[F_FICHE_LANG] || "").trim();
    const l = normalizeFinalLang(lRaw) || String(lRaw || "").toLowerCase();
    if (l && l !== langFinal) continue;

    const slug = String(f[F_FICHE_SLUG] || "").trim();
    if (!slug) continue;

    const name = (
      pickLangValue(f, langFinal, "Nom") ||
      String(f[F_FICHE_NAME] || "").trim() ||
      slug
    );

    // sector ref: can be linked record array, functional key, or plain text depending on Airtable schema
    const sectorFieldCandidates = [
      F_FICHE_SECTOR_LINK,
      "Secteur",
      "Secteur_activite",
      "Secteur_activité",
      "Secteur activité",
      "Secteur d’activité",
      "Secteur d'activité",
      "Sector",
      "sector",
      "Sector_ID",
    ];
    let sectorRef = firstOf(pickFieldValue(f, sectorFieldCandidates));
    sectorRef = String(sectorRef || "").trim();

    let sector_id = "";
    let sector_name = "";

    if (sectorRef) {
      // If it's a linked record id
      if (sectorByRecordId.has(sectorRef)) {
        const mapped = sectorByRecordId.get(sectorRef);
        sector_id = mapped.id;
        sector_name = mapped.name;
      } else {
        // If it's already a key/name
        const keyGuess = slugify(sectorRef);
        if (sectorNameByKey.has(keyGuess)) {
          sector_id = keyGuess;
          sector_name = sectorNameByKey.get(keyGuess);
        }
      }
    }

    jobs.push({
      slug,
      name,
      sector_id: sector_id || null,
      sector_name: sector_name || null
    });
  }

  // --- Build sectors[] from jobs (guaranteed consistent)
  const sectorFromJobs = new Map();
  for (const j of jobs) {
    if (!j.sector_id || !j.sector_name) continue;
    const nm = String(j.sector_name).trim();
    if (!nm) continue;
    if (nm.startsWith("rec") || nm.startsWith("chatcmpl-")) continue;
    sectorFromJobs.set(String(j.sector_id), nm);
  }

  // Also union with the master sector table (by KEY -> label for current lang).
  // This keeps the dropdown complete even if some sectors currently have 0 jobs in the selected ISO/lang.
  const sectorUnion = new Map(sectorFromJobs);
  try{
    if (sectorNameByKey && typeof sectorNameByKey.forEach === "function"){
      sectorNameByKey.forEach((nm, key) => {
        const name = String(nm||"").replace(/\s+/g," ").trim();
        if (!name) return;
        if (name.startsWith("rec") || name.startsWith("chatcmpl-")) return;
        // Use "key" as id for master sectors (stable), unless we already have a recId-based id from jobs.
        const id = String(key||"").trim();
        if (!id) return;
        if (!sectorUnion.has(id)) sectorUnion.set(id, name);
      });
    }
  }catch(e){}

  const sectorsRaw = Array.from(sectorUnion.entries())
    .map(([id, name]) => ({ id, name: String(name||"").replace(/\s+/g," ").trim() }))
    .filter(x => x.id && x.name);

  // Dedup by normalized NAME as well (Airtable sometimes has multiple sector IDs pointing to the same label)
  function normSectorName(s){
    s = String(s||"").toLowerCase().trim();
    try{ s = s.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }catch(e){}
    s = s.replace(/['’]/g,"");
    s = s.replace(/[^a-z0-9]+/g," ");
    s = s.replace(/\s+/g," ").trim();
    return s;
  }

  const byName = new Map();
  for (const s of sectorsRaw){
    const k = normSectorName(s.name);
    if (!k) continue;
    // keep the first one (stable), but prefer shorter id if tie
    if (!byName.has(k)) byName.set(k, s);
    else {
      const prev = byName.get(k);
      if (String(s.id).length < String(prev.id).length) byName.set(k, s);
    }
  }

  const sectors = Array.from(byName.values())
    .sort((a,b) => String(a.name).localeCompare(String(b.name)));
return jsonResponse({
    ok: true,
    iso,
    lang_finale: langFinal,
    sectors,
    jobs
  }, request, env, 200);
}


async function handleCountries(request, env) {
  const url = new URL(request.url);
  const lang = String(url.searchParams.get("lang") || "en").toLowerCase();

  const TABLE_PAYS = env.AIRTABLE_TABLE_PAYS || "Pays";
  const F_PAYS_ISO = env.AIRTABLE_FIELD_PAYS_ISO || "Code_ISO2";

  const recs = await airtableAll(env, TABLE_PAYS, 5000);

  const rows = [];
  for (const r of recs) {
    const f = r.fields || {};
    const iso = String(f[F_PAYS_ISO] || "").toUpperCase().trim();
    if (!iso || iso.length !== 2) continue;

    // 1) Read + normalize final language FIRST (avoid TDZ + ensure fr/en/de/es/it)
    const langFinalRaw = String(
      f.Langue_finale ||
      f["Langue finale"] ||
      f["Langue Finale"] ||
      f.langue_finale ||
      f.langueFinale ||
      f.final_lang ||
      f.finalLang ||
      f.Langue_principale ||
      f["Langue principale"] ||
      f.langue_principale ||
      ""
    ).trim();
    const langFinal = normalizeFinalLang(langFinalRaw) || "";

    // 2) Pick localized country name (prefer final language, then requested lang, then generic)
    const name =
      pickLangValue(f, langFinal || lang) ||
      pickLangValue(f, lang) ||
      String(f.Nom || "").trim() ||
      iso;

    rows.push({ iso, name, lang_finale: langFinal || normalizeFinalLang(lang) || "en" });
  }

  // Ensure FR exists
  if (!rows.some(x => x.iso === "FR")) rows.push({ iso: "FR", name: (lang==="fr"?"France":"France"), lang_finale: "fr" });

  // Dedupe by iso and sort by name
  const seen = new Set();
  const uniq = rows.filter(x => (seen.has(x.iso) ? false : (seen.add(x.iso), true)));
  uniq.sort((a,b)=>String(a.name).localeCompare(String(b.name)));

  return jsonResponse({ ok:true, lang, countries: uniq }, request, env, 200, {}, "public, max-age=3600, s-maxage=3600");
}

/* ---------------- Airtable helpers ---------------- */

async function airtableList(table, params, env) {
  const cfg = getCfg(env);
  if (!cfg.apiKey || !cfg.baseId) throw new Error("Missing Airtable credentials");

  const url = new URL(`https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(table)}`);

  // params can include fields: [] for Airtable fields[]
  if (params && typeof params === "object") {
    for (const [k,v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (k === "fields" && Array.isArray(v)) {
        v.forEach(f => url.searchParams.append("fields[]", String(f)));
      } else if (Array.isArray(v)) {
        v.forEach(x => url.searchParams.append(k, String(x)));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers = { Authorization: `Bearer ${cfg.apiKey}` };

  const maxAttempts = 4;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 12000);

    try {
      const res = await fetch(url.toString(), { headers, signal: ac.signal });
      clearTimeout(t);

      if (res.ok) return await res.json();

      const txt = await res.text().catch(()=> "");
      const status = res.status;

      // Rate limit / transient errors
      if (status === 429 || (status >= 500 && status <= 599)) {
        const ra = parseFloat(res.headers.get("Retry-After") || "0");
        const waitMs = ra ? Math.min(5000, ra * 1000) : Math.min(5000, 300 * Math.pow(2, attempt-1));
        await sleep(waitMs);
        continue;
      }

      throw new Error(`Airtable ${status}: ${txt || "error"}`);
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      // Abort or network error: retry
      const waitMs = Math.min(5000, 300 * Math.pow(2, attempt-1));
      await sleep(waitMs);
      continue;
    }
  }

  throw (lastErr || new Error("Airtable request failed"));
}

async function airtableAll(env, tableName, maxTotal=5000) {
  const out = [];
  let offset = "";
  while (out.length < maxTotal) {
    const batch = await airtableList(tableName, { pageSize: 100, offset: offset || "" }, env);
    const recs = batch.records || [];
    out.push(...recs);
    offset = batch.offset || "";
    if (!offset || recs.length === 0) break;
  }
  return out;
}

/* ---------------- Data mappers ---------------- */

async function fetchPays(env, cfg, iso) {
  const table = cfg.tables.pays;
  const schema = await getSchema(env, table);
  const isoField = pickField(schema.fields, ["Code_ISO2","code_iso2","ISO","iso","Code ISO2","Code_ISO","Code_iso2"]);
  if (!isoField) return null;

  const formula = `{${isoField}}="${escFormulaStr(iso)}"`;
  const res = await airtableList(table, { filterByFormula: formula, maxRecords: 1 }, env);
  const rec = (res.records && res.records[0]) ? res.records[0] : null;
  if (!rec) return null;
  return mapPays(rec.fields || {});
}

function mapPays(fields, lang) {
  const iso = String(
    fields.Code_ISO2 ||
    fields.code_iso2 ||
    fields.iso2 ||
    fields.ISO2 ||
    fields.Iso ||
    fields.ISO ||
    fields.iso ||
    ""
  ).trim().toUpperCase();

  // language-aware label: Nom_FR / Nom_EN / Nom_DE / Nom_ES / Nom_IT
  const rawFinal = (fields.Langue_finale || fields["Langue finale"] || fields["Langue Finale"] || fields.langue_finale || fields.langueFinale || fields.final_lang || fields.finalLang || guessFinalLangFieldValue(fields) || "");
  const L = String(lang || normalizeFinalLang(rawFinal) || "en").toLowerCase();
  const keyByLang = {
    fr: "Nom_FR",
    en: "Nom_EN",
    de: "Nom_DE",
    es: "Nom_ES",
    it: "Nom_IT"
  };
  const k = keyByLang[L] || "Nom_EN";

  const name =
    String(fields[k] || fields.Nom || fields.Name || fields.name_fr || fields.Name_FR || fields.name_en || fields.Name_EN || fields.Nom_FR || fields.Nom_EN || fields["Nom_FR"] || fields["Nom_EN"] || fields["Name_FR"] || fields["Name_EN"] || fields.name || fields.label || iso || "")
      .replace(/\s+/g, " ")
      .trim();

  const langue_finale = String(fields.Langue_finale || fields["Langue finale"] || fields["Langue Finale"] || fields.langue_finale || fields.langueFinale || fields.final_lang || fields.finalLang || guessFinalLangFieldValue(fields) || "").trim().toLowerCase();
  const langue_principale = String(fields.Langue_principale || fields["Langue principale"] || fields["Langue Principale"] || fields.langue_principale || fields.languePrincipale || fields.primary_lang || "").trim().toLowerCase();

  const currency =
    String(fields.Currency || fields.currency || fields.Devise || fields.devise || "").trim();

  return {
    iso,
    name,              // ✅ preferred key for UI
    label: name,       // ✅ backward compatibility (old front)
    langue_finale,
    langue_principale,
    currency
  };
}

function mapSecteur(fields, lang) {
  const slug = String(fields.Slug || fields.slug || fields.Secteur_slug || fields.secteur_slug || "").trim();
  const id = String(fields.Airtable_ID || fields.airtable_id || fields.Id || fields.id || "").trim();

  const L = String(lang || "").toLowerCase();
  const keyByLang = {
    fr: "Nom_FR",
    en: "Nom_EN",
    de: "Nom_DE",
    es: "Nom_ES",
    it: "Nom_IT"
  };
  const k = keyByLang[L] || "Nom_EN";

  const name =
    String(fields[k] || fields.Nom_EN || fields.Nom_FR || fields.Nom || fields.Name || slug || "")
      .replace(/\s+/g, " ")
      .trim();

  return {
    slug,
    name,              // ✅ preferred key for UI
    label: name,       // ✅ backward compatibility
    id
  };
}

async function fetchMPB(env, cfg, slugVars, iso) {
  const table = cfg.tables.mpb;
  const schema = await getSchema(env, table);

  const slugField = cfg.fields.mpbSlug || pickField(schema.fields, ["Slug_clean","slug_clean","metier_slug","Metier_slug","JOB_SLUG","job_slug","Slug","slug"]);
  const paysField = cfg.fields.mpbPays || pickField(schema.fields, ["pays_code","PAYS","Code_ISO2","countries","country"]);

  if (!slugField || !paysField) return [];

  const formula = andParts([
    buildOrEquals(slugField, slugVars),
    `{${paysField}}="${escFormulaStr(iso)}"`
  ]);

  const res = await airtableList(table, { filterByFormula: formula, maxRecords: 20 }, env);
  return (res.records || []).map(r => r.fields || {}).filter(Boolean);
}

async function fetchFAQ(env, cfg, slugVars, iso) {
  const table = cfg.tables.faq;
  const schema = await getSchema(env, table);

  const slugField = cfg.fields.faqSlug || pickField(schema.fields, ["metier_slug","Metier_slug","Slug","slug","slug_clean","Slug_clean"]);
  const paysField = cfg.fields.faqPays || pickField(schema.fields, ["countries","PAYS","pays_code","Code_ISO2","country"]);

  if (!slugField) return [];

  const parts = [ buildOrEquals(slugField, slugVars) ];
  if (paysField) parts.push(`{${paysField}}="${escFormulaStr(iso)}"`);

  const formula = andParts(parts);
  const res = await airtableList(table, { filterByFormula: formula, maxRecords: 50 }, env);
  return (res.records || []).map(r => r.fields || {}).filter(Boolean);
}

function slugToTitle(slug) {
  return String(slug||"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
}
function pickTitleFromFiche(f) {
  if (!f) return "";
  return String(f.Nom || f.Nom_interne || f.Job_title || f.Job_title_FR || f.Job_title_EN || f.Titre || f.title || "").trim();
}
function pickSubtitleFromFiche(f) {
  if (!f) return "";
  return String(f.Accroche || f.accroche || f.Subtitle || f.subtitle || "").trim();
}
function pickHeroFromFiche(f) {
  if (!f) return "";
  const v = f.heroImageUrl || f.HeroImageUrl || f.Hero || f.Image || "";
  return String(v||"").trim();
}