/**
 * Ulydia — Metier Page (FULL CODE) — v3.4
 * Root: #ulydia-metier-root
 *
 * Data sources (priority):
 *  1) Worker: POST /metier-page (optional)
 *  2) Worker: POST /sponsor-info (existing)
 *  3) CMS fallback: #ul_cms_payload [data-ul-f]
 *
 * Banners:
 *  - Sponsored: sponsor logos + link (wide + square)
 *  - Not sponsored: house banners by FINAL language (data-lang / <html lang> / ?lang=)
 *
 * Debug:
 *   window.__METIER_PAGE_DEBUG__ = true
 */

(() => {
  // ✅ version visible dans la console
  window.__METIER_PAGE_VERSION__ = "v4.3";

  if (window.__ULYDIA_METIER_PAGE_V4__) return;
  window.__ULYDIA_METIER_PAGE_V4__ = true;
  // =========================================================
  // 0) CONFIG
  // =========================================================
  const CFG = {
    WORKER_URL: "https://ulydia-business.contact-871.workers.dev",
    PROXY_SECRET: "ulydia_2026_proxy_Y4b364u2wsFsQL",
    IPINFO_TOKEN: "941b787cc13473",

    DEFAULT_LANG: "en",
    STORAGE_IP_KEY: "ul_ipinfo_cache_v1",
    IP_TTL_MS: 12 * 60 * 60 * 1000, // 12h

    JOB_SEGMENT: "fiche-metiers", // for slugFromPath()

    // House banners by lang (used when NOT sponsored)
HOUSE_BANNERS: {}, // ⛔ désactivé définitivement


    // UI labels (simple i18n)
    LABELS: {
      fr: {
        description: "Description",
        missions: "Missions",
        competences: "Compétences",
        environnements: "Environnements",
        evolutions: "Évolutions",
        specifique_pays: "Spécifique pays",
        faq: "FAQ",
        not_available: "—",
        sponsored_by: "Sponsorisé par",
      },
      en: {
        description: "Description",
        missions: "Missions",
        competences: "Skills",
        environnements: "Environments",
        evolutions: "Career paths",
        specifique_pays: "Country specific",
        faq: "FAQ",
        not_available: "—",
        sponsored_by: "Sponsored by",
      },
      de: {
        description: "Beschreibung",
        missions: "Aufgaben",
        competences: "Kompetenzen",
        environnements: "Umgebungen",
        evolutions: "Entwicklung",
        specifique_pays: "Länderspezifisch",
        faq: "FAQ",
        not_available: "—",
        sponsored_by: "Gesponsert von",
      },
      es: {
        description: "Descripción",
        missions: "Misiones",
        competences: "Competencias",
        environnements: "Entornos",
        evolutions: "Evolución",
        specifique_pays: "Específico del país",
        faq: "FAQ",
        not_available: "—",
        sponsored_by: "Patrocinado por",
      },
      it: {
        description: "Descrizione",
        missions: "Missioni",
        competences: "Competenze",
        environnements: "Ambienti",
        evolutions: "Evoluzione",
        specifique_pays: "Specifico per paese",
        faq: "FAQ",
        not_available: "—",
        sponsored_by: "Sponsorizzato da",
      },
    },
  };

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);
  const qp = (name) => new URLSearchParams(location.search).get(name);

// =====================================================
// COUNTRY CMS (countriesData) — NON SPONSORED BANNERS
// =====================================================
function _ul_extractImgUrl(node){
  if (!node) return "";

  // If it's a wrapper, try to find the img inside
  let el = node;
  if (el.tagName && String(el.tagName).toLowerCase() !== "img") {
    const inner = el.querySelector?.("img");
    if (inner) el = inner;
  }

  // 1) Standard <img>
  const cur = el.currentSrc || "";
  const src = el.getAttribute?.("src") || "";
  const dataSrc = el.getAttribute?.("data-src") || el.dataset?.src || "";
  if (cur) return cur;
  if (src) return src;
  if (dataSrc) return dataSrc;

  // 2) srcset -> take first URL
  const srcset = el.getAttribute?.("srcset") || "";
  if (srcset) {
    const first = srcset.split(",")[0]?.trim()?.split(" ")[0]?.trim() || "";
    if (first) return first;
  }

  // 3) background-image on wrapper
  const bg = (node.style && node.style.backgroundImage) || "";
  const m = bg.match(/url\(["']?(.*?)["']?\)/i);
  if (m && m[1]) return m[1];

  return "";
}

function getCountryRowByISO(iso){
  const container = document.getElementById("countriesData");
  if (!container) return null;
  const target = String(iso || "").trim().toUpperCase();

  // Webflow dynamic list items are usually .w-dyn-item
  let rows = Array.from(container.querySelectorAll(".w-dyn-item, .country-row, [data-country-row]"));
  if (!rows.length) rows = Array.from(container.children || []);

  for (const row of rows) {
    const isoEl = row.querySelector?.(".iso-code") || row.querySelector?.("[data-iso-code]") || null;
    const rowISO = isoEl?.textContent?.trim()?.toUpperCase?.() || "";
    if (rowISO === target) return row;
  }
  return null;
}

function getCountryBanner(iso, kind){
  const row = getCountryRowByISO(iso);
  if (!row) return "";

  // Your structure: banner-img-1 / banner-img-2 inside the country row
  const n1 = row.querySelector?.(".banner-img-1") || row.querySelector?.("img.banner-img-1") || null;
  const n2 = row.querySelector?.(".banner-img-2") || row.querySelector?.("img.banner-img-2") || null;

  if (kind === "wide")   return _ul_extractImgUrl(n1);
  if (kind === "square") return _ul_extractImgUrl(n2);
  return "";
}

// Expose for console debugging (optional)
try {
  window.getCountryRowByISO = getCountryRowByISO;
  window.getCountryBanner = getCountryBanner;
} catch {}






  function apiBase() {
    return String(CFG.WORKER_URL || "").replace(/\/$/, "");
  }

  // =========================================================
  // 1) CSS (ONLY EDIT HERE)
  // =========================================================
  /* =========================
     CSS START (ONLY EDIT HERE)
     ========================= */
  const CSS = `
:root{
  --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
  --ul-bg: #0b1020;
  --ul-surface: rgba(255,255,255,0.06);
  --ul-surface-2: rgba(255,255,255,0.09);
  --ul-border: rgba(255,255,255,0.10);
  --ul-text: rgba(255,255,255,0.92);
  --ul-muted: rgba(255,255,255,0.70);
  --ul-soft: rgba(255,255,255,0.55);
  --ul-accent: #646cfd;

  --ul-radius-xl: 20px;
  --ul-radius-lg: 16px;
  --ul-radius-md: 12px;

  --ul-shadow: 0 16px 50px rgba(0,0,0,0.35);

  --ul-max: 1120px;
  --ul-gap: 16px;
  --ul-pad: 18px;

  --ul-h1: 34px;
  --ul-h2: 16px;
  --ul-base: 14.5px;
  --ul-small: 13px;

  --ul-tab-h: 44px;
}

#ulydia-metier-root *{ box-sizing: border-box; }
#ulydia-metier-root{
  font-family: var(--ul-font);
  color: var(--ul-text);
}

#ulydia-metier-root a{ color: inherit; text-decoration: none; }
#ulydia-metier-root button{ font-family: var(--ul-font); }

.ul-wrap{
  width: 100%;
  margin: 0 auto;
  padding: 18px 14px 26px;
  max-width: var(--ul-max);
}

.ul-hero{
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: var(--ul-gap);
  align-items: stretch;
  margin-bottom: var(--ul-gap);
}
@media (max-width: 960px){
  .ul-hero{ grid-template-columns: 1fr; }
}

.ul-card{
  background: var(--ul-surface);
  border: 1px solid var(--ul-border);
  border-radius: var(--ul-radius-xl);
  box-shadow: var(--ul-shadow);
  overflow: hidden;
}

.ul-card-pad{ padding: var(--ul-pad); }

.ul-title{
  font-size: var(--ul-h1);
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}

.ul-meta{
  display:flex; flex-wrap: wrap; gap: 10px;
  color: var(--ul-muted);
  font-size: var(--ul-small);
  font-weight: 700;
}
.ul-pill{
  padding: 8px 10px;
  border: 1px solid var(--ul-border);
  background: rgba(255,255,255,0.04);
  border-radius: 999px;
}

.ul-banners{
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ul-gap);
}
.ul-banner{
  position: relative;
  border-radius: var(--ul-radius-xl);
  overflow: hidden;
  border: 1px solid var(--ul-border);
  background: rgba(255,255,255,0.03);
}
.ul-banner img{
  width: 100%;
  display: block;
  object-fit: cover;
}
.ul-banner-wide{ aspect-ratio: 16 / 5; }
.ul-banner-square{ aspect-ratio: 1 / 1; }
.ul-banner-overlay{
  position:absolute; inset:auto 12px 12px 12px;
  display:flex; align-items:center; justify-content:space-between;
  gap: 10px;
}
.ul-badge{
  display:inline-flex; align-items:center; gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--ul-border);
  background: rgba(0,0,0,0.40);
  font-weight: 800;
  font-size: var(--ul-small);
}
.ul-dot{
  width: 9px; height: 9px; border-radius: 999px;
  background: var(--ul-accent);
  box-shadow: 0 0 0 3px rgba(100,108,253,0.22);
}

.ul-main{
  display: grid;
  grid-template-columns: 1.4fr 0.9fr;
  gap: var(--ul-gap);
}
@media (max-width: 960px){
  .ul-main{ grid-template-columns: 1fr; }
}

.ul-tabs{
  display:flex; gap: 10px; flex-wrap: wrap;
  padding: 12px 12px 0;
}
.ul-tab{
  height: var(--ul-tab-h);
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--ul-border);
  background: rgba(255,255,255,0.04);
  color: var(--ul-text);
  font-weight: 800;
  font-size: var(--ul-small);
  cursor: pointer;
  transition: transform .08s ease, background .12s ease;
}
.ul-tab:hover{ transform: translateY(-1px); background: rgba(255,255,255,0.07); }
.ul-tab[aria-selected="true"]{
  border-color: rgba(100,108,253,0.55);
  background: rgba(100,108,253,0.14);
}

.ul-body{
  padding: 12px 18px 18px;
  color: var(--ul-text);
  line-height: 1.65;
  font-size: var(--ul-base);
}
.ul-body .ul-muted{
  color: var(--ul-soft);
  font-weight: 800;
}

.ul-list{
  margin: 0;
  padding-left: 18px;
}
.ul-list li{ margin: 7px 0; }

.ul-side h3{
  margin: 0 0 10px;
  font-size: var(--ul-h2);
  font-weight: 900;
  letter-spacing: -0.01em;
}
.ul-side .ul-side-section + .ul-side-section{
  margin-top: 14px;
}

.ul-faq-item{
  border: 1px solid var(--ul-border);
  background: rgba(255,255,255,0.04);
  border-radius: var(--ul-radius-lg);
  overflow: hidden;
}
.ul-faq-q{
  width: 100%;
  display:flex; align-items:center; justify-content:space-between;
  gap: 10px;
  padding: 12px 14px;
  cursor:pointer;
  border: 0;
  background: transparent;
  color: var(--ul-text);
  font-weight: 900;
  font-size: var(--ul-base);
}
.ul-faq-a{
  padding: 0 14px 14px;
  color: var(--ul-muted);
  font-size: var(--ul-base);
  line-height: 1.6;
  display:none;
}
.ul-faq-item[data-open="1"] .ul-faq-a{ display:block; }
.ul-chevron{
  opacity: 0.85;
  transform: rotate(0deg);
  transition: transform .12s ease;
}
.ul-faq-item[data-open="1"] .ul-chevron{ transform: rotate(180deg); }

.ul-skel{
  height: 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  overflow:hidden;
  position:relative;
}
.ul-skel:after{
  content:"";
  position:absolute; inset:0;
  transform: translateX(-40%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
  animation: ulshine 1.1s infinite;
}
@keyframes ulshine{
  from{ transform: translateX(-60%); }
  to{ transform: translateX(120%); }
}
`;
  /* =========================
     CSS END
     ========================= */

  function injectCSS() {
    const id = "ul_metier_css_v3";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = String(window.ULYDIA_METIER_CSS_OVERRIDE || CSS || "");
    document.head.appendChild(style);
  }

  // =========================================================
  // 2) HELPERS
  // =========================================================
  function safeUrl(u) {
    try {
      const s = String(u || "").trim();
      if (!s) return "";
      const url = new URL(s, location.origin);
      if (/^javascript:/i.test(url.href)) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function pickUrl(v) {
    if (!v) return "";
    if (typeof v === "string") return safeUrl(v);
    if (typeof v === "object") return safeUrl(v.url || v.value || "");
    return "";
  }

  function normalizeLang(l) {
    const s = String(l || "").trim().toLowerCase();
    if (!s) return CFG.DEFAULT_LANG;
    return (s.split("-")[0] || CFG.DEFAULT_LANG);
  }

  function getFinalLang() {
    const byQP = (qp("lang") || "").trim();
    const byAttr =
      document.body?.getAttribute("data-lang") ||
      document.documentElement?.getAttribute("data-lang") ||
      "";
    const byHtml = document.documentElement?.lang || "";
    return normalizeLang(byQP || byAttr || byHtml || CFG.DEFAULT_LANG);
  }

  function labels(lang) {
    const L = normalizeLang(lang);
    return CFG.LABELS[L] || CFG.LABELS.en;
  }

  function slugFromPath() {
    const p = location.pathname.replace(/\/+$/, "");
    const parts = p.split("/").filter(Boolean);
    const idx = parts.findIndex((x) => x === CFG.JOB_SEGMENT);
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1] || "";
  }

  function fmtList(arr) {
    const a = Array.isArray(arr) ? arr : [];
    return a.map((x) => String(x || "").trim()).filter(Boolean);
  }

  async function preloadImage(url) {
    return new Promise((resolve) => {
      if (!url) return resolve(false);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  // =========================================================
  // 3) COUNTRY (ipinfo cache)
  // =========================================================
  function readIpCache() {
    try {
      const raw = localStorage.getItem(CFG.STORAGE_IP_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts) return null;
      if (Date.now() - obj.ts > CFG.IP_TTL_MS) return null;
      return obj.data || null;
    } catch {
      return null;
    }
  }

  function writeIpCache(data) {
    try {
      localStorage.setItem(CFG.STORAGE_IP_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {}
  }

  async function getCountryISO() {
    const forced = (qp("country") || "").trim();
    if (forced) return forced.toUpperCase();

    const cached = readIpCache();
    if (cached?.country) return String(cached.country).toUpperCase();

    try {
      const url = `https://ipinfo.io/json?token=${encodeURIComponent(CFG.IPINFO_TOKEN)}`;
      const r = await fetch(url, { method: "GET" });
      const j = await r.json().catch(() => null);
      if (j && j.country) writeIpCache(j);
      return String(j?.country || "FR").toUpperCase();
    } catch {
      return "FR";
    }
  }

  // =========================================================
  // 4) WORKER CALLS
  // =========================================================
  async function postWorker(path, payload) {
    const url = `${apiBase()}${path}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-proxy-secret": CFG.PROXY_SECRET,
      },
      body: JSON.stringify(payload || {}),
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    if (!r.ok) {
      const msg = json?.error || json?.message || text || `HTTP ${r.status}`;
      const e = new Error(msg);
      e.status = r.status;
      e.payload = json;
      throw e;
    }
    return json;
  }

  async function fetchMetierData({ slug, country, lang }) {
    const payload = { metier_slug: slug, metier: slug, country, lang, iso: country };

    // 1) Optional endpoint
    try {
      const j = await postWorker("/metier-page", payload);
      if (j && typeof j === "object") return { mode: "metier-page", data: j };
    } catch (e) {
      log("metier-page failed:", e?.message || e);
    }

    // 2) Existing endpoint
    try {
      const j = await postWorker("/sponsor-info", payload);
      if (j && typeof j === "object") return { mode: "sponsor-info", data: j };
    } catch (e) {
      log("sponsor-info failed:", e?.message || e);
    }

    return { mode: "none", data: null };
  }

  // =========================================================
  // 5) CMS PAYLOAD FALLBACK
  // =========================================================
  function readCmsPayload() {
    const root = document.getElementById("ul_cms_payload") || document;

    const nodes = root.querySelectorAll("[data-ul-f]");
    if (!nodes?.length) {
      // Heuristic fallback (old Webflow design): read sections by headings
      const out = {};
      const allHeads = Array.from(document.querySelectorAll("h1,h2,h3"));
      const norm = (s)=>String(s||"").trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g,"");
      const getNextText = (h)=>{
        let el = h.nextElementSibling;
        // skip tiny spacers
        while (el && (el.tagName==="BR" || (el.textContent||"").trim()==="")) el = el.nextElementSibling;
        return (el?.textContent||"").trim();
      };
      const map = [
        {k:"description", pats:["description"]},
        {k:"missions", pats:["missions","description missions","description and missions","description  missions"]},
        {k:"competences", pats:["competences","competences","skills"]},
        {k:"environnements", pats:["environnements","environments"]},
        {k:"evolutions", pats:["evolutions","career"]},
      ];
      for (const h of allHeads){
        const t = norm(h.textContent);
        for (const m of map){
          if (m.pats.some(p=>t.includes(norm(p)))){
            const v = getNextText(h);
            if (v) out[m.k]=v;
          }
        }
      }
      return Object.keys(out).length ? out : null;
    }

    const out = {};
    nodes.forEach((n) => {
      const key = (n.getAttribute("data-ul-f") || "").trim();
      if (!key) return;
      const txt = (n.textContent || "").trim();
      if (!txt || txt === "-" || txt === "—") return;

      if (out[key] === undefined) out[key] = txt;
      else if (Array.isArray(out[key])) out[key].push(txt);
      else out[key] = [out[key], txt];
    });

    return out;
  }

  function cmsToModel(cms) {
  if (!cms || typeof cms !== "object") return null;

  const keys = Object.keys(cms);

  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_");

  const valStr = (v) => {
    if (v == null) return "";
    if (Array.isArray(v)) return v.map(x => String(x||"").trim()).filter(Boolean).join("\n");
    return String(v).trim();
  };

  const pickBy = (patterns, { preferLongest = true } = {}) => {
    const hits = [];
    for (const k of keys) {
      const nk = norm(k);
      if (patterns.some(p => nk.includes(p))) {
        const v = valStr(cms[k]);
        if (v) hits.push({ k, nk, v });
      }
    }
    if (!hits.length) return "";
    if (preferLongest) hits.sort((a,b) => (b.v.length - a.v.length));
    return hits[0].v;
  };

  const pickListBy = (patterns) => {
    const out = [];
    for (const k of keys) {
      const nk = norm(k);
      if (!patterns.some(p => nk.includes(p))) continue;
      const v = cms[k];
      if (Array.isArray(v)) {
        v.forEach(x => { const s = String(x||"").trim(); if (s) out.push(s); });
      } else {
        const s = String(v||"").trim();
        if (s) out.push(s);
      }
    }
    // dédoublonnage
    return Array.from(new Set(out));
  };

  // --- auto map ---
  const title =
    pickBy(["metier", "job", "title", "nom", "name"], { preferLongest: false });

  const description =
    pickBy(["description", "desc", "presentation", "resume", "overview"], { preferLongest: true });

  const missions =
    pickListBy(["mission", "missions", "tache", "taches", "responsabilite"]);

  const competences =
    pickListBy(["competence", "competences", "skill", "skills", "aptitude"]);

  const environnements =
    pickListBy(["environnement", "environnements", "environment", "workplace", "cadre"]);

  const evolutions =
    pickListBy(["evolution", "evolutions", "career", "perspective", "progression"]);

  const specifiquePays =
    pickBy(["specifique_pays", "specific_pays", "country_specific", "pays", "local"], { preferLongest: true });

  // si tu as des champs “metier_pays_bloc” en CMS brut, on peut les parser plus tard
  const model = {
    metier: {
      title: title || "",
      description: description || "",
      missions: fmtList(missions),
      competences: fmtList(competences),
      environnements: fmtList(environnements),
      evolutions: fmtList(evolutions),
    },
    country_specific: {
      text: specifiquePays || "",
      blocks: [],
    },
    faq: [],
  };

  const hasAny =
    !!model.metier.title ||
    !!model.metier.description ||
    model.metier.missions.length ||
    model.metier.competences.length ||
    model.metier.environnements.length ||
    model.metier.evolutions.length ||
    !!model.country_specific.text;

  if (DEBUG) {
    log("CMS keys detected:", keys);
    log("CMS mapped:", {
      title: !!model.metier.title,
      description: (model.metier.description || "").slice(0, 80),
      missions: model.metier.missions.length,
      competences: model.metier.competences.length,
      environnements: model.metier.environnements.length,
      evolutions: model.metier.evolutions.length,
      specifique_pays: !!model.country_specific.text
    });
  }

  return hasAny ? model : null;
}


  // =========================================================
  // 6) NORMALIZE WORKER -> MODEL
  // =========================================================
  function workerToModel(workerData) {
    if (!workerData || typeof workerData !== "object") return null;

    const metier = workerData.metier || workerData.job || workerData.metier_data || null;
    const sponsorWrap = workerData.sponsor || workerData.sponsorship?.sponsor || workerData.partner || null;

    const model = {
      meta: {
        sponsored: !!(workerData.sponsored || workerData.is_sponsored),
        sponsor: sponsorWrap || null,
      },
      metier: {
        title: (metier?.title || metier?.name || workerData?.metier_title || "").trim(),
        description: (metier?.description || metier?.overview || "").trim(),
        missions: fmtList(metier?.missions),
        competences: fmtList(metier?.skills || metier?.competences),
        environnements: fmtList(metier?.environments || metier?.environnements),
        evolutions: fmtList(metier?.evolutions),
      },
      country_specific: {
        text: (metier?.country_specific?.text || workerData?.country_specific?.text || "").trim(),
        blocks: Array.isArray(workerData?.country_specific?.blocks) ? workerData.country_specific.blocks : [],
      },
      faq: Array.isArray(workerData?.faq) ? workerData.faq : [],
    };

    const hasAny =
      !!model.metier.title ||
      !!model.metier.description ||
      model.metier.missions.length ||
      model.metier.competences.length ||
      model.metier.environnements.length ||
      model.metier.evolutions.length ||
      !!model.country_specific.text ||
      (model.country_specific.blocks?.length > 0) ||
      (model.faq?.length > 0);

    return hasAny ? model : null;
  }

  // =========================================================
  // 7) BANNERS (sponsor vs house)
  // =========================================================

  // Read non-sponsored banners from Webflow CMS (collection: Pays)
  // Expected structure (recommended):
  //   <div id="countriesData" style="display:none">
  //     <div class="w-dyn-item" data-ul-country-item>
  //       <div data-ul-country="iso">FR</div>
  //       <img data-ul-country="banner_wide"  src="...">
  //       <img data-ul-country="banner_square" src="...">
  //       <div data-ul-country="lang">fr</div> (optional)
  //     </div>
  //   </div>
  // If you don't add data attrs, the script uses heuristics: first 2-letter token + first 2 <img>.
  function readCountryBannersFromCMS(){
    const root = document.getElementById("countriesData");
    if (!root) return null;

    const items = Array.from(root.querySelectorAll("[data-ul-country-item], .w-dyn-item, .w-dyn-items > *"));
    if (!items.length) return null;

    const out = [];
    for (const it of items) {
      // ISO
      let iso = (it.querySelector('[data-ul-country="iso"]')?.textContent || '').trim().toUpperCase();
      if (!iso) {
        const txt = (it.textContent || '').toUpperCase();
        const mm = txt.match(/\b[A-Z]{2}\b/);
        if (mm) iso = mm[0];
      }
      if (!iso) continue;

      // Images
      let wide = safeUrl(it.querySelector('[data-ul-country="banner_wide"]')?.getAttribute('src') || '');
      let square = safeUrl(it.querySelector('[data-ul-country="banner_square"]')?.getAttribute('src') || '');

      if (!wide || !square) {
        const imgs = Array.from(it.querySelectorAll('img'))
          .map(img => safeUrl(img.getAttribute('src') || ''))
          .filter(Boolean);
        if (!wide && imgs[0]) wide = imgs[0];
        if (!square && imgs[1]) square = imgs[1];
      }

      // langue_finale (optional)
      let lang = (it.querySelector('[data-ul-country="lang"]')?.textContent || '').trim().toLowerCase();
      if (!lang) {
        const mm2 = (it.textContent || '').toLowerCase().match(/\b(fr|en|de|es|it)\b/);
        if (mm2) lang = mm2[1];
      }

      out.push({ iso, wide, square, lang: lang ? normalizeLang(lang) : '' });
    }

    return out.length ? out : null;
  }

  function pickCountryRow(countryISO){
    const list = readCountryBannersFromCMS();
    if (!list) return null;
    const iso = String(countryISO || '').trim().toUpperCase();
    return list.find(x => x.iso === iso) || null;
  }

  function getHouseBannerUrl(kind, lang, countryISO) {
    // 1) From country (ISO)
    const row = pickCountryRow(countryISO);
    if (row) {
      const u = kind === 'wide' ? row.wide : row.square;
      if (u) return u;
    }

    // 2) overrides via data attrs (by lang)
    const L = normalizeLang(lang);
    const byAttrBody = document.body?.getAttribute(`data-ul-house-${kind}-${L}`) || "";
    const byAttrHtml = document.documentElement?.getAttribute(`data-ul-house-${kind}-${L}`) || "";
    if (byAttrBody) return safeUrl(byAttrBody);
    if (byAttrHtml) return safeUrl(byAttrHtml);

    // 3) CFG fallback
    const pack = CFG.HOUSE_BANNERS[L] || CFG.HOUSE_BANNERS.en;
    return safeUrl(pack?.[kind] || "");
  }

  function getHouseLink(lang) {
    const L = normalizeLang(lang);
    const pack = CFG.HOUSE_BANNERS[L] || CFG.HOUSE_BANNERS.en;
    return safeUrl(pack?.link || "/sponsorship");
  }

  function svgBannerDataUrl(textTop, textBottom) {
  const t1 = encodeURIComponent(textTop || "Ulydia");
  const t2 = encodeURIComponent(textBottom || "Sponsoriser cette fiche");
  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1020"/>
      <stop offset="1" stop-color="#646cfd"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="32" fill="url(#g)"/>
  <circle cx="1320" cy="120" r="220" fill="rgba(255,255,255,0.10)"/>
  <circle cx="1260" cy="390" r="260" fill="rgba(255,255,255,0.07)"/>
  <text x="80" y="220" font-family="Montserrat, Arial" font-size="54" font-weight="800" fill="rgba(255,255,255,0.92)">${decodeURIComponent(t1)}</text>
  <text x="80" y="300" font-family="Montserrat, Arial" font-size="40" font-weight="700" fill="rgba(255,255,255,0.85)">${decodeURIComponent(t2)}</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

async function resolveBanners(meta, finalLang, countryISO) {
  // Sponsored
  if (meta?.sponsored && meta?.sponsor) {
    const sponsorLink = safeUrl(meta.sponsor.link || "");
    const wideUrl = pickUrl(meta?.sponsor?.logo_2 || meta?.sponsor?.logo_wide || "");
    const squareUrl = pickUrl(meta?.sponsor?.logo_1 || meta?.sponsor?.logo_square || "");

    const okWide = await preloadImage(wideUrl);
    const okSq = await preloadImage(squareUrl);

    return {
      mode: "sponsor",
      wideUrl: okWide ? wideUrl : svgBannerDataUrl("Ulydia", "Sponsored"),
      squareUrl: okSq ? squareUrl : svgBannerDataUrl("Ulydia", "Sponsored"),
      link: sponsorLink,
    };
  }

  // Not sponsored → banners from Webflow CMS (collection: Pays) via #countriesData
  const wide = pickUrl(getCountryBanner(countryISO, "wide"));
  const square = pickUrl(getCountryBanner(countryISO, "square"));
  log("house banners (country)", { countryISO, wide: !!wide, square: !!square });

  const okWide = await preloadImage(wide);
  const okSq = await preloadImage(square);

  return {
    mode: "house",
    wideUrl: okWide ? wide : svgBannerDataUrl("Ulydia", "Sponsoriser cette fiche"),
    squareUrl: okSq ? square : svgBannerDataUrl("Ulydia", "Sponsoriser"),
    link: "/sponsorship",
  };
}

  // =========================================================
  // 8) UI (FULL RENDER IN ROOT)
  // =========================================================
  const UI = (() => {
    function ensureRoot() {
      let root = document.getElementById("ulydia-metier-root") || document.getElementById("ulydia-metier-root");
      if (!root) {
        root = document.createElement("div");
        root.id = "ulydia-metier-root";
        document.body.prepend(root);
      }
      return root;
    }

    function esc(s) {
      return String(s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function renderSkeleton(root) {
      root.innerHTML = `
        <div class="ul-wrap">
          <div class="ul-hero">
            <div class="ul-card ul-card-pad">
              <div class="ul-skel" style="width:55%;height:18px;margin-bottom:12px"></div>
              <div class="ul-skel" style="width:82%;margin-bottom:8px"></div>
              <div class="ul-skel" style="width:74%;margin-bottom:8px"></div>
              <div class="ul-skel" style="width:62%;margin-bottom:16px"></div>
              <div class="ul-meta">
                <span class="ul-pill"><span class="ul-skel" style="width:120px;height:10px"></span></span>
                <span class="ul-pill"><span class="ul-skel" style="width:140px;height:10px"></span></span>
              </div>
            </div>
            <div class="ul-banners">
              <a class="ul-banner ul-banner-wide" href="javascript:void(0)" aria-label="banner-wide"><img alt="" /></a>
              <a class="ul-banner ul-banner-square" href="javascript:void(0)" aria-label="banner-square"><img alt="" /></a>
            </div>
          </div>

          <div class="ul-main">
            <div class="ul-card">
              <div class="ul-tabs" id="ul_tabs"></div>
              <div class="ul-body" id="ul_body"></div>
            </div>

            <div class="ul-card ul-card-pad ul-side" id="ul_side">
              <div class="ul-side-section" id="ul_country_blocks"></div>
              <div class="ul-side-section" id="ul_faq"></div>
            </div>
          </div>
        </div>
      `;
    }

    function setBanner(anchor, imgUrl, link, external) {
      if (!anchor) return;
      const img = anchor.querySelector("img");
      if (imgUrl) img.setAttribute("src", imgUrl);

      const href = safeUrl(link);
      if (href) {
        anchor.href = href;
        if (external) {
          anchor.target = "_blank";
          anchor.rel = "noopener";
        } else {
          anchor.target = "_self";
          anchor.rel = "";
        }
        anchor.style.pointerEvents = "auto";
      } else {
        anchor.removeAttribute("href");
        anchor.style.pointerEvents = "none";
      }
    }

    function tabButton(id, label, selected) {
      return `<button class="ul-tab" type="button" data-tab="${esc(id)}" aria-selected="${selected ? "true" : "false"}">${esc(label)}</button>`;
    }

    function isNonEmpty(v) {
      if (Array.isArray(v)) return v.length > 0;
      return !!String(v || "").trim();
    }

    function renderBodyValue(value, emptyLabel) {
      if (!isNonEmpty(value)) return `<div class="ul-muted">${esc(emptyLabel)}</div>`;

      if (Array.isArray(value)) {
        const items = value.map((x) => `<li>${esc(x)}</li>`).join("");
        return `<ul class="ul-list">${items}</ul>`;
      }
      // string
      return `<div style="white-space:pre-wrap;">${esc(value)}</div>`;
    }

    function renderFAQ(faq, t) {
      const wrap = document.getElementById("ul_faq");
      if (!wrap) return;

      const list = Array.isArray(faq) ? faq : [];
      const clean = list
        .map((x) => ({
          q: String(x?.q || x?.question || "").trim(),
          a: String(x?.a || x?.answer || "").trim(),
        }))
        .filter((x) => x.q && x.a);

      if (!clean.length) {
        wrap.innerHTML = "";
        return;
      }

      wrap.innerHTML = `
        <h3>${esc(t.faq)}</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${clean
            .map(
              (x, i) => `
              <div class="ul-faq-item" data-open="0">
                <button class="ul-faq-q" type="button" data-faq="${i}">
                  <span>${esc(x.q)}</span>
                  <span class="ul-chevron">▾</span>
                </button>
                <div class="ul-faq-a">${esc(x.a)}</div>
              </div>
            `
            )
            .join("")}
        </div>
      `;

      wrap.querySelectorAll("[data-faq]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = btn.closest(".ul-faq-item");
          if (!item) return;
          const open = item.getAttribute("data-open") === "1";
          item.setAttribute("data-open", open ? "0" : "1");
        });
      });
    }

    function renderCountryBlocks(countrySpecific, t) {
      const wrap = document.getElementById("ul_country_blocks");
      if (!wrap) return;

      const text = String(countrySpecific?.text || "").trim();
      const blocks = Array.isArray(countrySpecific?.blocks) ? countrySpecific.blocks : [];

      const cleanBlocks = blocks
        .map((b) => ({
          title: String(b?.title || b?.name || "").trim(),
          content: String(b?.content || b?.text || "").trim(),
        }))
        .filter((b) => b.title && b.content);

      if (!text && !cleanBlocks.length) {
        wrap.innerHTML = "";
        return;
      }

      const parts = [];
      parts.push(`<h3>${esc(t.specifique_pays)}</h3>`);
      if (text) {
        parts.push(`<div style="white-space:pre-wrap;color:var(--ul-muted);line-height:1.6;">${esc(text)}</div>`);
      }
      if (cleanBlocks.length) {
        parts.push(`<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">`);
        cleanBlocks.forEach((b) => {
          parts.push(`
            <div class="ul-faq-item" data-open="1">
              <button class="ul-faq-q" type="button">
                <span>${esc(b.title)}</span>
                <span class="ul-chevron">▾</span>
              </button>
              <div class="ul-faq-a" style="display:block;">${esc(b.content)}</div>
            </div>
          `);
        });
        parts.push(`</div>`);
      }

      wrap.innerHTML = parts.join("");
      wrap.querySelectorAll(".ul-faq-item .ul-faq-q").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = btn.closest(".ul-faq-item");
          if (!item) return;
          const open = item.getAttribute("data-open") === "1";
          item.setAttribute("data-open", open ? "0" : "1");
        });
      });
    }

    function renderAll({ ctx, model, banners }) {
      const root = ensureRoot();
      renderSkeleton(root);

      const t = labels(ctx.finalLang);

      // Title + meta
      const title = (model?.metier?.title || "").trim() || ctx.slug;
      const metaNode = root.querySelector(".ul-meta");
      if (root.querySelector(".ul-title")) root.querySelector(".ul-title").textContent = title;

      // Replace skeleton title block with actual title
      const heroCard = root.querySelector(".ul-hero .ul-card");
      if (heroCard) {
        heroCard.innerHTML = `
          <h1 class="ul-title">${esc(title)}</h1>
          <div class="ul-meta">
            <span class="ul-pill">ISO: ${esc(ctx.country)}</span>
            <span class="ul-pill">Lang: ${esc(ctx.finalLang)}</span>
          </div>
        `;
      }

      // Document title
      document.title = `${title} — Ulydia`;

      // Banners
      const wideA = root.querySelector('.ul-banner-wide');
      const squareA = root.querySelector('.ul-banner-square');
      const external = banners?.mode === "sponsor";
      setBanner(wideA, banners?.wideUrl, banners?.link, external);
      setBanner(squareA, banners?.squareUrl, banners?.link, external);

      // overlay badge if sponsored
      if (banners?.mode === "sponsor" && model?.meta?.sponsor) {
        const sponsorName = String(model.meta.sponsor.name || model.meta.sponsor.company || "").trim();
        const badge = `
          <div class="ul-banner-overlay">
            <div class="ul-badge"><span class="ul-dot"></span><span>${esc(t.sponsored_by)}${sponsorName ? `: ${esc(sponsorName)}` : ""}</span></div>
          </div>
        `;
        wideA?.insertAdjacentHTML("beforeend", badge);
      }

      // Tabs
      const tabs = [];
      const sections = [
        { id: "description", label: t.description, value: model?.metier?.description },
        { id: "missions", label: t.missions, value: model?.metier?.missions },
        { id: "competences", label: t.competences, value: model?.metier?.competences },
        { id: "environnements", label: t.environnements, value: model?.metier?.environnements },
        { id: "evolutions", label: t.evolutions, value: model?.metier?.evolutions },
        // country specific is NOT in main tabs if only used in sidebar; but keep if you want:
        // { id: "specifique_pays", label: t.specifique_pays, value: model?.country_specific?.text },
      ];

      // pick default tab = first non-empty
      let defaultId = "description";
      for (const s of sections) {
        if (isNonEmpty(s.value)) { defaultId = s.id; break; }
      }

      sections.forEach((s) => {
        tabs.push(tabButton(s.id, s.label, s.id === defaultId));
      });

      const tabsEl = document.getElementById("ul_tabs");
      const bodyEl = document.getElementById("ul_body");
      if (tabsEl) tabsEl.innerHTML = tabs.join("");

      function setSelected(id) {
        tabsEl?.querySelectorAll("[data-tab]").forEach((b) => {
          b.setAttribute("aria-selected", b.getAttribute("data-tab") === id ? "true" : "false");
        });
        const sec = sections.find((x) => x.id === id);
        if (bodyEl) bodyEl.innerHTML = renderBodyValue(sec?.value, t.not_available);
      }

      tabsEl?.querySelectorAll("[data-tab]").forEach((b) => {
        b.addEventListener("click", () => setSelected(b.getAttribute("data-tab")));
      });

      setSelected(defaultId);

      // Sidebar: country blocks + FAQ
      renderCountryBlocks(model?.country_specific, t);
      renderFAQ(model?.faq, t);

      // Hide sidebar card if empty
      const side = document.getElementById("ul_side");
      const sideHas =
        (document.getElementById("ul_country_blocks")?.innerHTML || "").trim() ||
        (document.getElementById("ul_faq")?.innerHTML || "").trim();
      if (!sideHas && side) side.style.display = "none";
    }

    return { renderAll, ensureRoot, renderSkeleton };
  })();

  // =========================================================
  // 9) BOOTSTRAP
  // =========================================================
  async function main() {
    injectCSS();


    const root = UI.ensureRoot();
    UI.renderSkeleton(root);

    const slug = slugFromPath();
    const finalLang = getFinalLang();
    if (!slug) {
      log("No metier slug found.");
      return;
    }

    const country = await getCountryISO();
    const ctx = { slug, finalLang, country };

    log("ctx", ctx);

    // Fetch worker
    const res = await fetchMetierData({ slug, country, lang: finalLang });
    const workerModel = workerToModel(res.data || null);

    // CMS fallback
    const cmsModel = cmsToModel(readCmsPayload());

    // Merge policy: worker wins; fallback to cms if worker missing
    const model = workerModel || cmsModel || {
      meta: { sponsored: false, sponsor: null },
      metier: { title: slug, description: "", missions: [], competences: [], environnements: [], evolutions: [] },
      country_specific: { text: "", blocks: [] },
      faq: [],
    };

    // Ensure meta exists
    model.meta = model.meta || { sponsored: false, sponsor: null };

    // Banners resolution
    const banners = await resolveBanners(model.meta, finalLang, country);

    UI.renderAll({ ctx, model, banners });

    log("ready", { mode: res.mode, sponsored: !!model.meta.sponsored });
  }

  main().catch((e) => {
    console.error("[metier-page] fatal", e);
  });
})();