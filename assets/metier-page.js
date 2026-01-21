/* metier-page.js — Ulydia (V7.0)
   ✅ Layout aligned with propal1 (Tailwind CDN + same structure)
   ✅ Fixes corrupted sponsor property access (no "...").
   ✅ Robust country banner extraction (Webflow field-name variations)
   ✅ Auto-select country + metier from URL (?country=FR&metier=slug)
   ✅ Fallback country = visitor ISO (IPinfo) if URL does not provide one
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V70__) return;
  window.__ULYDIA_METIER_PAGE_V70__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier-page]", ...a); };

  // =========================
  // ROOT
  // =========================
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  // =========================
  // CONFIG (keep your env globals if you already set them in <head>)
  // =========================
  const WORKER_URL   = window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const IPINFO_TOKEN = window.ULYDIA_IPINFO_TOKEN || "941b787cc13473";

  const SPONSOR_PATH = "/sponsor";

  // Webflow JSON sources (script tags with JSON text)
  const COUNTRIES_SCRIPT_IDS = ["countriesData", "countriesData2", "countriesData3"];
  const SECTORS_SCRIPT_IDS   = ["sectorsData", "sectorsData2", "sectorsData3"];
  const METIERS_SCRIPT_IDS   = ["metiersData", "metiersData2", "metiersData3"];

  // Worker endpoints (expected)
  const EP_COUNTRY_MAP  = "/v1/countries-map";
  const EP_METIERS      = "/v1/metiers";
  const EP_METIER_PAGE  = "/v1/metier-page"; // ?slug= &iso=

  // =========================
  // Helpers
  // =========================
  const safeText = (v) => (v == null ? "" : String(v));
  const isUrl = (s) => /^https?:\/\/.+/i.test(s || "");
  const firstUrlInAny = (v) => {
    if (!v) return "";
    if (typeof v === "string") {
      const s = v.trim();
      if (isUrl(s)) return s;
      // sometimes "url, url" or "url | url"
      const m = s.match(/https?:\/\/[^\s"'<>]+/i);
      return m ? m[0] : "";
    }
    if (Array.isArray(v)) {
      for (const it of v) {
        const u = firstUrlInAny(it);
        if (u) return u;
      }
      return "";
    }
    if (typeof v === "object") {
      // common shapes: {url}, {src}, {value}, {0:{url}}
      const direct = firstUrlInAny(v.url || v.src || v.href || v.value);
      if (direct) return direct;
      for (const k of Object.keys(v)) {
        const u = firstUrlInAny(v[k]);
        if (u) return u;
      }
    }
    return "";
  };

  const fetchJSON = async (url, opts={}) => {
    const res = await fetch(url, opts);
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { /* ignore */ }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url} :: ${txt.slice(0,200)}`);
    return data;
  };

  const readJSONFromScriptTags = (ids) => {
    const out = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const raw = (el.textContent || el.innerText || "").trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) out.push(...parsed);
        else if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) out.push(...parsed.items);
        else out.push(parsed);
      } catch (e) {
        log("Bad JSON in", id, e);
      }
    }
    return out;
  };

  // Read JSON from ANY script tags whose id starts with a prefix (Webflow list embeds often split >100 items)
  const readJSONFromScriptPrefix = (prefix, fallbackIds=[]) => {
    const nodes = Array.from(document.querySelectorAll(`[id^="${prefix}"]`));
    // Sort so countriesData, countriesData2, countriesData3... are in order
    nodes.sort((a,b) => {
      const an = (a.id.match(/(\d+)$/)||[])[1]; const bn = (b.id.match(/(\d+)$/)||[])[1];
      const ai = an ? parseInt(an,10) : 1;
      const bi = bn ? parseInt(bn,10) : 1;
      return ai - bi;
    });
    const ids = nodes.length ? nodes.map(n => n.id) : fallbackIds;
    return readJSONFromScriptTags(ids);
  };

  // Guess banner fields in Webflow country objects (field names are unstable)
  function guessCountryBanners(raw){
    const obj = raw || {};
    const keys = Object.keys(obj);
    const urls = [];
    for (const k of keys) {
      const v = obj[k];
      const u = firstUrlInAny(v);
      if (!u) continue;
      const lk = k.toLowerCase();
      // take only banner-ish fields (avoid flags, icons)
      if (/(banni|banner|sponsor|attente)/i.test(lk)) {
        urls.push({ k: lk, u });
      }
    }
    // if Worker already gave banners.*
    const workerWide   = firstUrlInAny(obj?.banners?.wide || obj?.banners?.banner_wide);
    const workerSquare = firstUrlInAny(obj?.banners?.square || obj?.banners?.banner_square);
    if (workerWide || workerSquare) {
      return { wide: workerWide || workerSquare, square: workerSquare || workerWide };
    }

    // heuristics: "wide"/"horizontal"/"large"/"1" => wide ; "square"/"logo"/"2" => square
    let wide = "";
    let square = "";

    const pick = (rx) => {
      const hit = urls.find(x => rx.test(x.k));
      return hit ? hit.u : "";
    };

    wide = pick(/wide|horizontal|large|landscape|banniere_1|banner1|attente.*1|sponsor.*1/);
    square = pick(/square|logo|carre|banniere_2|banner2|attente.*2|sponsor.*2/);

    if (!wide && urls.length) wide = urls[0].u;
    if (!square && urls.length > 1) square = urls[1].u;

    // fallback: duplicate
    if (!wide && square) wide = square;
    if (!square && wide) square = wide;

    return { wide, square };
  }

  function guessISOFromObject(obj){
    if (!obj || typeof obj !== "object") return "";
    // 1) direct common keys
    const direct = [
      obj.iso, obj.code, obj.alpha2, obj.ISO, obj.iso2, obj["iso-2"], obj["iso_2"],
      obj["country_code"], obj["countryCode"], obj["alpha_2"], obj["alpha2_code"],
      obj["iso3166_1_alpha2"], obj["iso3166_1_alpha_2"], obj["iso_3166_1_alpha_2"],
      obj["iso3166"], obj["iso_3166"]
    ];
    for (const v of direct) {
      const s = safeText(v).trim();
      if (/^[a-z]{2}$/i.test(s)) return s.toUpperCase();
    }
    // 2) scan keys that look like iso/code and value is 2 letters
    for (const [k,v] of Object.entries(obj)) {
      const lk = String(k).toLowerCase();
      if (!/(^|_|\b)(iso|code|alpha2|alpha_2)(\b|_|$)/.test(lk)) continue;
      const s = safeText(v).trim();
      if (/^[a-z]{2}$/i.test(s)) return s.toUpperCase();
    }
    // 3) last resort: scan any string value that is exactly 2 letters (avoid false positives by preferring uppercase)
    for (const v of Object.values(obj)) {
      const s = safeText(v).trim();
      if (/^[A-Z]{2}$/.test(s)) return s;
    }
    return "";
  }

  function normCountry(c){
    if (!c || typeof c !== "object") return null;
    const iso = guessISOFromObject(c);
    const name = safeText(c.name || c.nom || c.pays || c.title || iso).trim();
    const lang = safeText(c.langue_finale || c.lang_finale || c.langue || c.lang || c.language || "").trim().toLowerCase();
    const b = guessCountryBanners(c);
    // keep only if we have an ISO (otherwise can't be used in filters)
    if (!iso) return null;
    return { iso, name: name || iso, lang, banners: b, raw: c };
  
  // Pick country "waiting for sponsorship" banners in the RIGHT language when the metier is not sponsored
  function pickCountryFallbackBanner(countryObj, format /* 'wide'|'square' */){
    if (!countryObj) return "";
    const raw = countryObj.raw || countryObj;
    const lang = safeText(countryObj.lang || raw.langue_finale || raw.lang || raw.language || "").trim().toLowerCase();
    const fmtRx = format === "square"
      ? /(square|carre|logo|banniere_2|banner2|\b2\b)/i
      : /(wide|horizontal|large|landscape|banniere_1|banner1|\b1\b)/i;

    // 1) Prefer explicit banners object if present
    const direct = firstUrlInAny(raw?.banners?.[format]) || firstUrlInAny(countryObj?.banners?.[format]);
    // 2) Scan keys for "attente sponsorisation" / fallback banners
    const keys = Object.keys(raw||{});
    const candidates = [];
    for (const k of keys){
      const lk = String(k).toLowerCase();
      if (!/(attente|sponsorisation|waiting|fallback|default|banni|banner)/i.test(lk)) continue;
      // if we have a language, prefer keys that mention it
      if (lang && !lk.includes(lang)) {
        // allow short lang like fr/en/de/es/it appearing with separators
        const short = lang.slice(0,2);
        const rx = new RegExp(`(^|_|-|\b)${short}(\b|_|-)`);
        if (!rx.test(lk)) continue;
      }
      const u = firstUrlInAny(raw[k]);
      if (!u) continue;
      candidates.push({ k: lk, u });
    }
    // 3) Pick by format heuristic
    const picked = candidates.find(x => fmtRx.test(x.k)) || candidates[0];
    return (picked && picked.u) ? picked.u : (direct || "");
  }
}

  function normSector(s){
    if (!s || typeof s !== "object") return null;
    const id = safeText(s.slug || s.id || s.value || s.code || "").trim();
    const name = safeText(s.nom || s.name || s.title || id).trim();
    return { id, name, raw: s };
  }

  function normMetier(m){
    if (!m || typeof m !== "object") return null;
    const slug = safeText(m.slug || m.Slug || m.metier_slug || m.value || "").trim();
    const name = safeText(m.nom || m.name || m.title || slug).trim();
    return { slug, name, raw: m, fields: m.fields || m };
  }

  const pick = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v == null) continue;
      const s = safeText(v).trim();
      if (s) return s;
    }
    return "";
  };

  const FIELD_MAP = {
    accroche: ["accroche", "tagline", "resume", "subtitle", "description_courte"],
    overview: ["vue_ensemble", "overview", "description", "resume_long", "presentation"],
    missions: ["missions", "mission", "missions_principales"],
    competences: ["competences", "competence", "skills"],
    environnements: ["environnements", "environment", "contextes"],
    profil: ["profil_recherche", "profil", "profile"],
    evolutions: ["evolutions", "evolution", "perspectives"],
  };

  const nlToBullets = (txt) => {
    const t = safeText(txt).trim();
    if (!t) return [];
    // split on newlines or "•" or "-"
    const raw = t.split(/\n+|•\s*|\r+|-\s+/).map(x => x.trim()).filter(Boolean);
    // dedupe
    return [...new Set(raw)];
  };

  // =========================
  // Tailwind + CSS (like propal1)
  // =========================
  function ensureTailwind(){
    if (document.querySelector('script[data-ul-tailwind="1"]')) return;
    const s = document.createElement("script");
    s.src = "https://cdn.tailwindcss.com";
    s.async = true;
    s.setAttribute("data-ul-tailwind", "1");
    document.head.appendChild(s);
  }

  function injectCSS(){
  const css = `
  body {
        box-sizing: border-box;
      }
    
      :root {
        --primary: #6366f1;
        --text: #0f172a;
        --muted: #64748b;
        --border: #e2e8f0;
        --bg: #ffffff;
        --card: #f8fafc;
        --accent: #f59e0b;
        --success: #10b981;
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
        --shadow-card: 0 4px 20px rgba(0,0,0,.08);
        --font-family: 'Outfit', sans-serif;
        --font-base: 15px;
      }
    
      * {
        font-family: var(--font-family);
      }
    
      .gradient-primary {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      }
    
      .gradient-accent {
        background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
      }
    
      .gradient-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
    
      .pastel-blue {
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      }
    
      .pastel-purple {
        background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
      }
    
      .pastel-green {
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      }
    
      .pastel-orange {
        background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
      }
    
      .pastel-pink {
        background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
      }
    
      .pastel-cyan {
        background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
      }
    
      .card {
        background: var(--card);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-card);
        border: 1px solid var(--border);
        padding: 24px;
        transition: all 0.3s ease;
      }
    
      .card:hover {
        box-shadow: 0 8px 30px rgba(0,0,0,.12);
        transform: translateY(-2px);
      }
    
      .card-header {
        padding: 16px 20px;
        border-radius: var(--radius-md) var(--radius-md) 0 0;
        margin: -24px -24px 20px -24px;
      }
    
      .section-title {
        font-weight: 700;
        font-size: 17px;
        color: var(--text);
        letter-spacing: -0.02em;
        display: flex;
        align-items: center;
        gap: 10px;
      }
    
      .sponsor-banner-wide {
        width: 680px;
        height: 120px;
        max-width: 100%;
        border-radius: var(--radius-lg);
        overflow: hidden;
        position: relative;
        cursor: pointer;
        transition: transform 0.3s ease;
        margin-bottom: 32px;
      }
    
      .sponsor-banner-wide:hover {
        transform: scale(1.02);
      }
    
      .sponsor-logo-square {
        width: 300px;
        height: 300px;
        max-width: 100%;
        border-radius: var(--radius-lg);
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-shadow: var(--shadow-card);
        border: 1px solid var(--border);
      }
    
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: var(--radius-sm);
        font-size: 13px;
        font-weight: 600;
        border: 1px solid;
      }
    
      .badge-primary {
        background: rgba(99,102,241,0.1);
        border-color: rgba(99,102,241,0.3);
        color: #6366f1;
      }
    
      .badge-success {
        background: rgba(16,185,129,0.1);
        border-color: rgba(16,185,129,0.3);
        color: #10b981;
      }
    
      .badge-warning {
        background: rgba(245,158,11,0.1);
        border-color: rgba(245,158,11,0.3);
        color: #f59e0b;
      }
    
      .badge-danger {
        background: rgba(239,68,68,0.1);
        border-color: rgba(239,68,68,0.3);
        color: #ef4444;
      }
    
      .kpi-box {
        background: white;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s ease;
      }
    
      .kpi-box:hover {
        border-color: var(--primary);
        box-shadow: 0 4px 16px rgba(99,102,241,0.15);
      }
    
      .kpi-icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }
    
      .salary-bar-container {
        height: 10px;
        background: var(--border);
        border-radius: 5px;
        overflow: hidden;
        position: relative;
      }
    
      .salary-bar-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
    
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: var(--radius-sm);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid;
        transition: all 0.2s ease;
      }
    
      .chip:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,.1);
      }
    
      .rich-content {
        color: var(--text);
        line-height: 1.7;
      }
    
      .rich-content h3 {
        font-weight: 700;
        font-size: 16px;
        margin: 20px 0 12px 0;
        color: var(--text);
      }
    
      .rich-content h4 {
        font-weight: 600;
        font-size: 15px;
        margin: 16px 0 10px 0;
        color: var(--text);
      }
    
      .rich-content p {
        margin: 10px 0;
      }
    
      .rich-content ul {
        list-style: none;
        margin: 12px 0;
        padding: 0;
      }
    
      .rich-content li {
        margin: 8px 0;
        padding-left: 24px;
        position: relative;
      }
    
      .rich-content li:before {
        content: "→";
        position: absolute;
        left: 0;
        color: var(--primary);
        font-weight: 700;
      }
    
      .rich-content strong {
        font-weight: 600;
        color: var(--text);
      }
    
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 24px;
        height: 48px;
        border-radius: var(--radius-md);
        font-weight: 600;
        font-size: 15px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
      }
    
      .btn-primary {
        background: var(--primary);
        color: white;
      }
    
      .btn-primary:hover {
        background: #4f46e5;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(99,102,241,0.3);
      }
    
      .skill-tag {
        background: white;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      }
    
      .skill-tag:hover {
        border-color: var(--primary);
        background: rgba(99,102,241,0.05);
      }
    
      .progress-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
    
      .faq-question {
        cursor: pointer;
      }
    
      .faq-question:hover {
        border-color: var(--primary) !important;
        box-shadow: 0 2px 8px rgba(99,102,241,0.15);
      }
    
      .faq-icon {
        transition: transform 0.3s ease;
      }
    
      .faq-answer {
        animation: slideDown 0.3s ease-out;
      }
    
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

  /* Ulydia additions */
  .ul-hidden{display:none!important;}
  .ul-click{cursor:pointer;}
  `;

  let tag = document.getElementById('ulydia-metier-css');
  if(!tag){tag=document.createElement('style');tag.id='ulydia-metier-css';document.head.appendChild(tag);} 
  tag.textContent = css;

  }

  // =========================
  // Shell (matches screenshot structure)
  // =========================
  function renderShell(){
    ROOT.innerHTML = `
<div class="min-h-screen w-full" style="background: var(--bg); color: var(--text);">
  <!-- Top nav (propal-like) -->
  <div class="max-w-6xl mx-auto px-4 pt-6 pb-3 flex items-center justify-between">
    <a href="/" class="flex items-center gap-3">
      <img alt="Ulydia" src="https://cdn.prod.website-files.com/6942b6d9dc4d5a360322b0dd/6942b6d9dc4d5a360322b0dd_logo.png" class="h-12 w-auto" onerror="this.style.display='none'"/>
      <div class="text-lg font-extrabold tracking-tight" style="color: var(--text);">ULYDIA</div>
    </a>
    <div class="flex items-center gap-4 text-sm font-semibold" style="color: var(--muted);">
      <a class="hover:opacity-80" href="/sponsor">Sponsor</a>
      <a class="hover:opacity-80" href="/my-account">Dashboard</a>
      <a class="hover:opacity-80" href="/logout">Log out</a>
    </div>
  </div>

  <div class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b" style="border-color: var(--border);">
    <div class="max-w-6xl mx-auto px-4 py-3">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="text-xs font-semibold" style="color: var(--muted);">🌍 Pays / Région</label>
          <select id="ulCountry" class="mt-1 w-full px-3 py-2 rounded-lg border bg-white" style="border-color: var(--border);"></select>
        </div>
        <div>
          <label class="text-xs font-semibold" style="color: var(--muted);">🏢 Secteur d’activité</label>
          <select id="ulSector" class="mt-1 w-full px-3 py-2 rounded-lg border bg-white" style="border-color: var(--border);"></select>
        </div>
        <div class="relative">
          <label class="text-xs font-semibold" style="color: var(--muted);">🔍 Rechercher un métier</label>
          <input id="ulJob" class="mt-1 w-full px-3 py-2 rounded-lg border bg-white" style="border-color: var(--border);" placeholder="Ex: Directeur financier, Comptable…" autocomplete="off" />
          <div id="ulJobSuggest" class="absolute left-0 right-0 mt-2 bg-white rounded-lg border-2 overflow-hidden z-50 hidden" style="border-color: var(--border); max-height: 320px; overflow-y:auto;"></div>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between">
        <button id="ulResetBtn" class="ul-click flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg border" style="border-color: var(--border); color: var(--muted);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 3" /><path d="M3 21v-5h5" /></svg>
          Réinitialiser les filtres
        </button>
        <div class="text-xs font-semibold" style="color: var(--muted);"><span id="ulResultCount">—</span> fiche(s) métier</div>
      </div>
    </div>
  </div>

  <div class="max-w-6xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border" style="border-color: var(--border); box-shadow: var(--shadow);">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center" style="background:#6d6afc;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </div>
        <div class="flex-1">
          <div class="text-xs font-bold inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background: rgba(109,106,252,.10); color:#4f46e5;">
            💼 Fiche Métier
          </div>
          <h1 id="ulJobTitle" class="mt-2 text-3xl font-black tracking-tight">Choisis un métier</h1>
          <p id="ulJobSub" class="mt-1 text-sm font-semibold" style="color: var(--muted);">Sélectionne un pays → un secteur → un métier.</p>

          <div class="mt-4 flex justify-center">
            <a id="ulBannerWide" class="sponsor-banner-wide block" href="#" target="_blank" rel="noopener noreferrer" style="display:none;">
              <div class="relative w-[680px] h-[120px] max-w-full rounded-2xl overflow-hidden border bg-white ul-click" style="border-color: var(--border); box-shadow: var(--shadow);">
                <img id="ulBannerWideImg" class="w-full h-full object-cover" alt="Bannière sponsor" />
                <div id="ulBannerWidePill" class="absolute left-4 bottom-3 px-3 py-1 rounded-full text-xs font-black bg-white/80 backdrop-blur">Sponsor</div>
              </div>
            </a>
          </div>
        </div>
        <div class="hidden md:flex flex-col gap-2">
          <button id="ulShareBtn" class="ul-click text-sm font-semibold px-4 py-2 rounded-lg border" style="border-color: var(--border);">Copier le lien</button>
          <a id="ulSponsorBtn" class="ul-click text-sm font-black px-4 py-2 rounded-lg text-white text-center" style="background:#6d6afc;" href="#" target="_blank" rel="noopener noreferrer">Sponsoriser</a>
        </div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6" id="ulContent">
        <div class="bg-white rounded-2xl p-6 border" style="border-color: var(--border); box-shadow: var(--shadow);">
          <div class="text-sm font-semibold" style="color: var(--muted);">Sélectionne un pays, puis un secteur, puis un métier.</div>
        </div>
      </div>

      <aside class="space-y-6">
        <div class="bg-white rounded-2xl p-6 border" style="border-color: var(--border); box-shadow: var(--shadow);">
          <div class="text-sm font-black mb-4">📌 Sponsor</div>
          <a id="ulBannerSquare" href="#" target="_blank" rel="noopener noreferrer" style="display:none;">
            <div class="relative w-full aspect-square rounded-2xl overflow-hidden border bg-white ul-click" style="border-color: var(--border);">
              <img id="ulBannerSquareImg" class="w-full h-full object-contain p-6" alt="Logo sponsor" />
            </div>
          </a>
          <div id="ulNoBannerNote" class="text-xs font-semibold mt-3" style="color: var(--muted); display:none;">
            Aucune bannière disponible pour ce pays.
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 border" style="border-color: var(--border); box-shadow: var(--shadow);">
          <div class="text-sm font-black mb-3">🧩 Informations</div>
          <div class="text-sm font-semibold" style="color: var(--muted);" id="ulSideInfo">—</div>
        </div>
      </aside>
    </div>

    <div class="py-10 text-center text-xs font-semibold" style="color: var(--muted);">© Ulydia — Fiche métier</div>
  </div>
</div>
    `;
  }

  function card(title, colorBg, innerHtml){
    return `
<div class="bg-white rounded-2xl border overflow-hidden" style="border-color: var(--border); box-shadow: var(--shadow);">
  <div class="px-5 py-3 text-sm font-black" style="background:${colorBg};">${title}</div>
  <div class="p-5 text-sm font-medium leading-6">${innerHtml}</div>
</div>`;
  }

  function renderList(items){
    if (!items || !items.length) return `<div class="text-sm font-semibold" style="color: var(--muted);">—</div>`;
    return `<ul class="list-disc pl-5 space-y-1">${items.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  }

  function escapeHtml(s){
    return safeText(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }

  function fillSelect(el, items, placeholder){
    el.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    el.appendChild(opt0);
    for (const it of items) {
      const opt = document.createElement("option");
      opt.value = it.value;
      opt.textContent = it.label;
      el.appendChild(opt);
    }
  }

  // =========================
  // Data loading
  // =========================
  async function detectVisitorISO(){
    // prefer cached
    const key = "__ULYDIA_VISITOR_ISO__";
    if (window[key]) return window[key];

    try{
      if (!IPINFO_TOKEN) throw new Error("Missing IPINFO_TOKEN");
      const url = `https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`;
      const data = await fetchJSON(url);
      const iso = safeText(data?.country || "").trim().toUpperCase();
      if (iso) { window[key] = iso; return iso; }
    }catch(e){
      log("ipinfo failed", e);
    }
    window[key] = "FR";
    return "FR";
  }

  async function fetchMetierDetail({ slug, iso }){
    const url = new URL(WORKER_URL + EP_METIER_PAGE);
    url.searchParams.set("slug", slug);
    url.searchParams.set("iso", iso);
    return await fetchJSON(url.toString(), {
      headers: {
        "x-ulydia-proxy-secret": PROXY_SECRET,
        "x-proxy-secret": PROXY_SECRET
      }
    });
  }

  // Suggest UI
  function showSuggest(box, items, onPick){
    box.innerHTML = items.map(it => {
      const isAction = !!it.action;
      const label = escapeHtml(it.name || it.label || "");
      if (isAction) {
        return `
          <button class="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm font-semibold" data-action="${escapeHtml(it.action)}">
            ${label}
          </button>
        `;
      }
      return `
        <button class="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm font-semibold" data-slug="${escapeHtml(it.slug)}">
          ${label}
        </button>
      `;
    }).join("");
    box.classList.remove("hidden");
    box.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const slug = btn.getAttribute("data-slug");
        onPick(action ? { action } : { slug });
        box.classList.add("hidden");
      });
    });
  }

  // =========================
  // Main
  // =========================
  let countries = [];
  let sectors = [];
  let metiers = [];
  let metiersBySector = new Map();

  async function main(){
    ensureTailwind();
    injectCSS();
    renderShell();

    const elCountry = document.getElementById("ulCountry");
    const elSector  = document.getElementById("ulSector");
    const elJob     = document.getElementById("ulJob");
    const elSuggest = document.getElementById("ulJobSuggest");
    const elReset   = document.getElementById("ulResetBtn");
    const elCount   = document.getElementById("ulResultCount");
    const elTitle   = document.getElementById("ulJobTitle");
    const elSub     = document.getElementById("ulJobSub");
    const elContent = document.getElementById("ulContent");
    const elWideA   = document.getElementById("ulBannerWide");
    const elWideImg = document.getElementById("ulBannerWideImg");
    const elWidePill= document.getElementById("ulBannerWidePill");
    const elSqA     = document.getElementById("ulBannerSquare");
    const elSqImg   = document.getElementById("ulBannerSquareImg");
    const elNoBanner= document.getElementById("ulNoBannerNote");
    const elSponsorBtn = document.getElementById("ulSponsorBtn");
    const elShareBtn   = document.getElementById("ulShareBtn");
    const elSideInfo   = document.getElementById("ulSideInfo");

    // Load Webflow JSON first (offline-friendly)
    countries = readJSONFromScriptPrefix('countriesData', COUNTRIES_SCRIPT_IDS).map(normCountry).filter(Boolean);
    sectors   = readJSONFromScriptPrefix('sectorsData', SECTORS_SCRIPT_IDS).map(normSector).filter(Boolean);
    metiers   = readJSONFromScriptPrefix('metiersData', METIERS_SCRIPT_IDS).map(normMetier).filter(Boolean);

    // counts
    elCount.textContent = String(metiers.length || "—");

    // URL params (your page is only reachable after a selection)
    const url = new URL(location.href);
    const urlCountry = safeText(url.searchParams.get("country") || url.searchParams.get("iso") || "").trim().toUpperCase();
    const urlMetier  = safeText(url.searchParams.get("metier") || url.searchParams.get("slug") || "").trim();

    // Default country = URL country, else visitor ISO
    const visitorISO = await detectVisitorISO();
    const defaultISO = (urlCountry && /^[A-Z]{2}$/.test(urlCountry)) ? urlCountry : visitorISO;
    log("urlCountry/urlMetier/visitorISO/defaultISO", urlCountry, urlMetier, visitorISO, defaultISO);

    // Fill selects
    const countryOptions = countries
      .filter(c => c.iso)
      .sort((a,b) => (a.name||a.iso).localeCompare(b.name||b.iso))
      .map(c => ({ value: c.iso, label: `${c.name} (${c.iso})` }));
    fillSelect(elCountry, countryOptions, "Choisir un pays…");

    const sectorOptions = [
      { value: "", label: "Tous les secteurs" },
      ...sectors
        .filter(s => s.id)
        .sort((a,b) => (a.name||a.id).localeCompare(b.name||b.id))
        .map(s => ({ value: s.id, label: s.name }))
    ];
    fillSelect(elSector, sectorOptions, "Tous les secteurs");

    // Ensure default ISO exists in the dropdown (some Webflow items may not expose ISO cleanly)
    if (defaultISO && /^[A-Z]{2}$/.test(defaultISO) && !countryOptions.some(o => o.value === defaultISO)) {
      const opt = document.createElement("option");
      opt.value = defaultISO;
      opt.textContent = `${defaultISO}`;
      // insert after placeholder
      elCountry.appendChild(opt);
    }
    if (defaultISO && /^[A-Z]{2}$/.test(defaultISO)) {
      elCountry.value = defaultISO;
    }

    // Sponsor CTA always points to sponsor page
    const sponsorCTA = new URL(location.origin + SPONSOR_PATH);
    elSponsorBtn.href = sponsorCTA.toString();

    // share
    elShareBtn.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(location.href);
        elShareBtn.textContent = "Lien copié ✅";
        setTimeout(()=> elShareBtn.textContent = "Copier le lien", 1200);
      }catch{
        elShareBtn.textContent = "Copie impossible";
        setTimeout(()=> elShareBtn.textContent = "Copier le lien", 1200);
      }
    });

    // Build metiersBySector if data includes sector info
    for (const m of metiers) {
      const f = m.fields || m.raw || {};
      const sec = safeText(f.secteur || f.secteur_activite || f.secteurActivite || f.sector || f.sector_id || "").trim();
      if (!sec) continue;
      if (!metiersBySector.has(sec)) metiersBySector.set(sec, []);
      metiersBySector.get(sec).push(m);
    }

    // Suggest as you type, filtered by sector and country selection
    let lastSuggest = "";
    elJob.addEventListener("input", () => {
      const q = safeText(elJob.value).trim().toLowerCase();
      if (q === lastSuggest) return;
      lastSuggest = q;

      const sec = safeText(elSector.value).trim();
      let pool = metiers;
      if (sec && metiersBySector.has(sec)) pool = metiersBySector.get(sec);

      // show suggest even with 1 char, but keep it useful
      if (!q) { elSuggest.classList.add("hidden"); elSuggest.innerHTML=""; return; }
      if (q.length < 1) { elSuggest.classList.add("hidden"); elSuggest.innerHTML=""; return; }

      const hits = pool
        .filter(m => (m.name||"").toLowerCase().includes(q) || (m.slug||"").toLowerCase().includes(q))
        .slice(0, 12);

      const items = [];
      if (sec) items.push({ action: "all_metiers", name: "Tous les métiers (ignorer le secteur)" });
      items.push(...hits);

      if (items.length === (sec ? 1 : 0)) { elSuggest.classList.add("hidden"); return; }

      showSuggest(elSuggest, items, (picked) => {
        if (picked?.action === "all_metiers") {
          elSector.value = "";
          elJob.focus();
          elSuggest.classList.add("hidden");
          return;
        }
        const slug = picked?.slug;
        if (!slug) return;
        const found = metiers.find(x => x.slug === slug);
        elJob.value = found ? found.name : slug;
        // update URL to keep shareable
        const u = new URL(location.href);
        u.searchParams.set("country", safeText(elCountry.value).trim().toUpperCase());
        u.searchParams.set("metier", slug);
        history.replaceState({}, "", u.toString());
        renderMetier(slug);
      });
    });
    });

    document.addEventListener("click", (e) => {
      if (!elSuggest.contains(e.target) && e.target !== elJob) {
        elSuggest.classList.add("hidden");
      }
    });

    elSector.addEventListener("change", () => {
      // Clear job input when sector changes (safer UX)
      elJob.value = "";
      elSuggest.classList.add("hidden");
      elContent.innerHTML = card("ℹ️", "rgba(109,106,252,.10)", `<div style="color: var(--muted);" class="font-semibold">Choisis un métier dans la recherche ci-dessus.</div>`);
    });

    elCountry.addEventListener("change", () => {
      // Update side info on country change
      const iso = safeText(elCountry.value).trim().toUpperCase();
      const c = countries.find(x => x.iso === iso);
      elSideInfo.textContent = c ? `${c.name} • Langue finale: ${(c.lang||'—').toUpperCase()}` : "—";
      // Reset banners until a job is selected
      elWideA.style.display = "none";
      elSqA.style.display = "none";
      elNoBanner.style.display = "none";
    });

    elReset.addEventListener("click", () => {
      elSector.value = "";
      elJob.value = "";
      if (defaultISO) elCountry.value = defaultISO;
      else elCountry.value = "";
      elCount.textContent = String(metiers.length || "—");
      elTitle.textContent = "Choisis un métier";
      elSub.textContent = "Sélectionne un pays → un secteur → un métier.";
      elContent.innerHTML = card("ℹ️", "rgba(109,106,252,.10)", `<div style="color: var(--muted);" class="font-semibold">Sélectionne un pays, puis un secteur, puis un métier.</div>`);
      elWideA.style.display = "none";
      elSqA.style.display = "none";
      elNoBanner.style.display = "none";
    });

    // init side info
    elCountry.dispatchEvent(new Event("change"));

    // Auto-render the metier from URL (primary flow)
    if (urlMetier) {
      const base = metiers.find(m => m.slug === urlMetier) || null;
      if (base) elJob.value = base.name;
      else elJob.value = urlMetier;
      await renderMetier(urlMetier);
    }
  }

  async function renderMetier(slug){
    const elCountry = document.getElementById("ulCountry");
    const elTitle   = document.getElementById("ulJobTitle");
    const elSub     = document.getElementById("ulJobSub");
    const elContent = document.getElementById("ulContent");
    const elWideA   = document.getElementById("ulBannerWide");
    const elWideImg = document.getElementById("ulBannerWideImg");
    const elWidePill= document.getElementById("ulBannerWidePill");
    const elSqA     = document.getElementById("ulBannerSquare");
    const elSqImg   = document.getElementById("ulBannerSquareImg");
    const elNoBanner= document.getElementById("ulNoBannerNote");
    const elSponsorBtn = document.getElementById("ulSponsorBtn");

    const iso = safeText(elCountry.value).trim().toUpperCase();
    if (!slug || !iso) return;

    elContent.innerHTML = card("Chargement…", "rgba(15,23,42,.06)", `<div class="font-semibold" style="color: var(--muted);">Chargement de la fiche métier…</div>`);
    elWideA.style.display = "none";
    elSqA.style.display = "none";
    elNoBanner.style.display = "none";

    const base = metiers.find(m => m.slug === slug) || null;
    let fields = base ? (base.fields || base.raw) : {};

    let worker = null;
    try{
      worker = await fetchMetierDetail({ slug, iso });
      log("worker metier-page", worker);
    }catch(e){
      log("worker failed", e);
    }

    const wMetier = worker?.metier || worker?.job || null;
    if (wMetier && typeof wMetier === "object") fields = Object.assign({}, fields, wMetier);

    const rawCountry = worker?.pays || worker?.country || null;
    const countryObj = rawCountry ? normCountry(rawCountry) : (countries.find(c => c.iso === iso) || null);
    const fallbackWide = pickCountryFallbackBanner(countryObj, 'wide');
    const fallbackSquare = pickCountryFallbackBanner(countryObj, 'square');

    // sponsor extraction (FIXED — no corrupted ellipsis)
    const sponsor = worker?.sponsor || worker?.meta?.sponsor || worker?.sponsoring || worker?.sponsorship || null;
    const sponsorName = safeText(sponsor?.name || sponsor?.nom || sponsor?.company || sponsor?.brand || "").trim();
    const sponsorLink = safeText(sponsor?.link || sponsor?.url || sponsor?.website || sponsor?.site || "").trim();
    const sponsorWide = firstUrlInAny(sponsor?.logo_2 || sponsor?.logo_wide || sponsor?.wide || sponsor?.banner_wide || sponsor?.bannerWide);
    const sponsorSquare = firstUrlInAny(sponsor?.logo_1 || sponsor?.logo_square || sponsor?.square || sponsor?.banner_square || sponsor?.bannerSquare);

    const hasSponsorCreative = !!(sponsorWide || sponsorSquare);

    const sponsorCTA = new URL(location.origin + SPONSOR_PATH);
    sponsorCTA.searchParams.set("metier", slug);
    sponsorCTA.searchParams.set("country", iso);
    elSponsorBtn.href = sponsorCTA.toString();

    const clickUrl = (hasSponsorCreative && sponsorLink) ? sponsorLink : sponsorCTA.toString();

    // Wide banner (priority sponsor, else country fallback)
    const wideUrl = hasSponsorCreative ? (sponsorWide || sponsorSquare) : (fallbackWide || fallbackSquare);
    log("banner urls", { iso, hasSponsorCreative, sponsorWide, sponsorSquare, fallbackWide, fallbackSquare, wideUrl });
    if (wideUrl) {
      elWideImg.src = wideUrl;
      elWideA.href = clickUrl;
      elWidePill.textContent = hasSponsorCreative ? (sponsorName ? `Sponsor — ${sponsorName}` : "Sponsor") : "Sponsoriser ce métier";
      elWideA.style.display = "block";
    } else {
      elWideA.style.display = "none";
    }

    // Square banner (priority sponsor, else country fallback)
    const sqUrl = hasSponsorCreative ? (sponsorSquare || sponsorWide) : (fallbackSquare || fallbackWide);
    log("square banner url", { sqUrl });
    if (sqUrl) {
      elSqImg.src = sqUrl;
      elSqA.href = clickUrl;
      elSqA.style.display = "block";
      elNoBanner.style.display = "none";
    } else {
      elSqA.style.display = "none";
      elNoBanner.style.display = "block";
    }

    // Titles
    const displayName = safeText(fields.nom || fields.name || fields.title || base?.name || slug).trim();
    const accroche = pick(fields, FIELD_MAP.accroche);
    elTitle.textContent = displayName || slug;
    elSub.textContent = accroche || (countryObj ? `${countryObj.name} (${iso})` : iso);

    // Content blocks
    const overview = pick(fields, FIELD_MAP.overview);
    const missions = pick(fields, FIELD_MAP.missions);
    const competences = pick(fields, FIELD_MAP.competences);
    const environnements = pick(fields, FIELD_MAP.environnements);
    const profil = pick(fields, FIELD_MAP.profil);
    const evolutions = pick(fields, FIELD_MAP.evolutions);

    const blocks = [];
    if (overview) blocks.push(card("👁️ Vue d’ensemble", "rgba(59,130,246,.12)", `<div class="font-medium leading-7">${escapeHtml(overview).replace(/\n/g,"<br/>")}</div>`));
    if (missions) blocks.push(card("✅ Missions principales", "rgba(16,185,129,.14)", renderList(nlToBullets(missions))));
    if (competences) blocks.push(card("🧠 Compétences clés", "rgba(168,85,247,.14)", renderList(nlToBullets(competences))));
    if (environnements) blocks.push(card("🏢 Environnements de travail", "rgba(251,146,60,.18)", `<div class="font-medium leading-7">${escapeHtml(environnements).replace(/\n/g,"<br/>")}</div>`));
    if (profil) blocks.push(card("🧩 Profil recherché", "rgba(244,63,94,.14)", renderList(nlToBullets(profil))));
    if (evolutions) blocks.push(card("🚀 Évolutions possibles", "rgba(34,211,238,.16)", renderList(nlToBullets(evolutions))));

    if (!blocks.length) {
      blocks.push(card("ℹ️", "rgba(109,106,252,.10)", `<div class="font-semibold" style="color: var(--muted);">Aucune donnée disponible pour cette fiche (pour l’instant).</div>`));
    }
    elContent.innerHTML = blocks.join("");
  }

  main().catch((e) => console.error("[metier-page] fatal", e));
})();
