/* metier-page.js — Ulydia (V9.6)
   ✅ Single shell page /metier (filters + job profile)
   ✅ Order: COUNTRY → SECTOR → JOB
   ✅ Preselect from URL: /metier?metier=SLUG&country=FR
   ✅ Visitor default country via IPinfo (optional)
   ✅ Job details via Worker (/v1/metier-page?slug=...&iso=...) OR from metiersData fields if present
   ✅ Sponsor vs non-sponsor banners (non-sponsor click → /sponsor?metier=...&country=...)
   ✅ Blocky modern design (cards, gradients, subtle "wow")
   ✅ Full Ulydia Design Tokens integration
   ✅ Complete Metier_Pays_Bloc fields (formation, acces, marche, salaires, KPIs, etc.)
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V90__) return;
  window.__ULYDIA_METIER_PAGE_V90__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page.v9.6]", ...a);

  // =========================================================
  // CONFIG (from global or fallback)
  // =========================================================
  const WORKER_URL   = String(window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev").trim();
  const PROXY_SECRET = String(window.ULYDIA_PROXY_SECRET || "ulydia_2026_proxy_Y4b364u2wsFsQL").trim();
  const IPINFO_TOKEN = String(window.ULYDIA_IPINFO_TOKEN || "").trim();

  const CANON_METIER_PATH = "/metier";
  const SPONSOR_PATH = "/sponsor";

  // =========================================================
  // Helpers
  // =========================================================
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function safeText(s){ return (s == null) ? "" : String(s); }

  function escapeHtml(s){
    return safeText(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function looksLikeHtml(s){
    s = safeText(s).trim();
    return s.startsWith("<") && s.includes(">");
  }

  function asRichHTML(val){
    const s = safeText(val).trim();
    if (!s) return "";
    if (looksLikeHtml(s)) return s;
    // basic paragraphs + line breaks
    return "<p>" + escapeHtml(s).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>") + "</p>";
  }

  function debounce(fn, ms){
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function uniqBy(arr, keyFn){
    const seen = new Set();
    const out = [];
    for (const x of (arr||[])) {
      const k = keyFn(x);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  }

  // ---------------------------------------------------------
  // Read JSON script(s) by id — handles duplicate ids by merging
  // ---------------------------------------------------------
  function readJSONScriptsById(id){
    const nodes = qsa(`script#${CSS.escape(id)}[type="application/json"]`);
    if (!nodes.length) return null;

    const parsed = [];
    for (const n of nodes) {
      const raw = safeText(n.textContent).trim();
      if (!raw) continue;
      try { parsed.push(JSON.parse(raw)); }
      catch(e){ log("JSON parse error for", id, e); }
    }
    if (!parsed.length) return null;

    // If all arrays => concat
    if (parsed.every(x => Array.isArray(x))) return parsed.flat();

    // If last is object, merge shallowly
    const out = {};
    for (const obj of parsed) {
      if (obj && typeof obj === "object" && !Array.isArray(obj)) Object.assign(out, obj);
    }
    return out;
  }

  // ---------------------------------------------------------
  // Read JSON script(s) by prefix (countriesData, countriesData2, ...)
  // Webflow often splits dyn-list JSON into multiple script tags.
  // We support both:
  //  - <script id="countriesData" type="application/json">[...]</script>
  //  - <script id="countriesData2" type="application/json">[...]</script>
  //  - duplicate same id (Webflow copy/paste), already handled by readJSONScriptsById
  // ---------------------------------------------------------
  
  // ---------------------------------------------------------
  // Read JSON blocks by prefix (countriesData, countriesData2, ...)
  // ✅ Supports <script>, <div>, <embed>, <textarea>, etc.
  // We merge ALL blocks whose id starts with the prefix.
  // ---------------------------------------------------------
  function readJSONBlocksByPrefix(prefix){
    // Any element with id starting with prefix
    let nodes = qsa(`[id^="${CSS.escape(prefix)}"]`);
    if (!nodes.length) {
      // fallback: maybe only the base id exists as script json
      const one = readJSONScriptsById(prefix);
      return one;
    }

    // sort: prefix (no number) first, then prefix2, prefix3...
    nodes.sort((a,b) => {
      const aId = a.id || "";
      const bId = b.id || "";
      const an = (aId.match(/(\d+)$/)||[])[1];
      const bn = (bId.match(/(\d+)$/)||[])[1];
      const ai = an ? parseInt(an,10) : 1;
      const bi = bn ? parseInt(bn,10) : 1;
      if (ai !== bi) return ai - bi;
      return aId.localeCompare(bId);
    });

    const out = [];
    for (const n of nodes){
      let raw = "";
      // Prefer dedicated attributes if present
      if (n.dataset && (n.dataset.json || n.dataset.items)) raw = safeText(n.dataset.json || n.dataset.items).trim();
      if (!raw && "value" in n) raw = safeText(n.value).trim();
      if (!raw) raw = safeText(n.textContent).trim();

      if (!raw) continue;

      // Sometimes Webflow wraps JSON in HTML comments inside embed:
      raw = raw.replace(/^\s*<!--/, "").replace(/-->\s*$/, "").trim();

      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) out.push(...parsed);
        else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) out.push(...parsed.items);
        else out.push(parsed);
      } catch(e){
        log('JSON parse error for', n.id || prefix, e);
      }
    }
    return out;
  }

  function hideCMSDataContainers(){
    // Hide the Webflow CMS lists that only exist to generate JSON
    const ids = ["countriesData","sectorsData","metiersData","blocsData","faqData"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      // hide closest dyn-list wrapper, otherwise parent
      let p = el.parentElement;
      while (p && p !== document.body) {
        const cls = safeText(p.className);
        if (cls.includes("w-dyn-list") || cls.includes("w-dyn-items") || cls.includes("w-dyn-item")) {
          p.style.display = "none";
          break;
        }
        p = p.parentElement;
      }
      if (el.parentElement && el.parentElement !== document.body) el.parentElement.style.display = "none";
    }

    // Heuristic: hide “slug dumps” (big lists of hyphenated slugs)
    const candidates = qsa("div,section,main,aside");
    for (const el of candidates) {
      if (!el || el.id === "ulydia-metier-root") continue;
      if (el.closest("#ulydia-metier-root")) continue;
      const txt = safeText(el.textContent).trim();
      if (txt.length < 120) continue;
      const lines = txt.split(/\n+/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 15) continue;

      const slugLike = lines.filter(l => /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(l)).length;
      if (slugLike / lines.length < 0.85) continue;

      // Avoid hiding real nav/footers
      if (el.querySelector("nav,header,footer,form,button,input,select,textarea")) continue;

      el.style.display = "none";
      log("hid slug dump", el);
    }
  }

  // ---------------------------------------------------------
  // URL params
  // ---------------------------------------------------------
  function getURLParams(){
    const u = new URL(location.href);
    const metier = safeText(u.searchParams.get("metier") || "").trim();
    const country = safeText(u.searchParams.get("country") || u.searchParams.get("iso") || "").trim().toUpperCase();
    const sector = safeText(u.searchParams.get("sector") || "").trim();
    const forceCountry = ["1","true","yes"].includes(String(u.searchParams.get("forceCountry") || "").trim().toLowerCase());
    return { metier, country, sector, forceCountry };
  }

  function setURLParams(params, { replace=true } = {}){
    const u = new URL(location.href);
    if ("metier" in params) {
      const v = safeText(params.metier).trim();
      if (v) u.searchParams.set("metier", v);
      else u.searchParams.delete("metier");
    }
    if ("country" in params) {
      const v = safeText(params.country).trim().toUpperCase();
      if (v) u.searchParams.set("country", v);
      else u.searchParams.delete("country");
    }
    if ("sector" in params) {
      const v = safeText(params.sector).trim();
      if (v) u.searchParams.set("sector", v);
      else u.searchParams.delete("sector");
    }
    if (replace) history.replaceState({}, "", u.toString());
    else history.pushState({}, "", u.toString());
  }

  
  // ---------------------------------------------------------
  // Persisted choice (optional)
  // ---------------------------------------------------------
  const LS_COUNTRY_KEY = "ulydia.metier.country";
  function getStoredCountry(){
    try { return safeText(localStorage.getItem(LS_COUNTRY_KEY) || "").trim().toUpperCase(); } catch(e){ return ""; }
  }
  function setStoredCountry(iso){
    try {
      iso = safeText(iso).trim().toUpperCase();
      if (iso) localStorage.setItem(LS_COUNTRY_KEY, iso);
    } catch(e){ /* ignore */ }
  }

// ---------------------------------------------------------
  // Country detection (optional)
  // ---------------------------------------------------------
  async function detectVisitorISO(){
    // Best-effort visitor country (automatic):
    // 1) Cloudflare via our Worker (/v1/geo)  ✅ most reliable
    // 2) IPinfo (if token)                    ✅ fallback
    // 3) Browser locale region (fr-FR -> FR)  ✅ weak fallback
    // 4) Default ("FR")
    const W = safeText(WORKER_URL).trim();
    if (W) {
      try {
        const r = await fetch(`${W.replace(/\/$/, "")}/v1/geo`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const cc = safeText(j.iso || j.country || "").trim().toUpperCase();
          if (cc && cc.length === 2) return cc;
        }
      } catch(e){ /* ignore */ }
    }

    if (IPINFO_TOKEN) {
      try {
        const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const cc = safeText(j.country).trim().toUpperCase();
          if (cc && cc.length === 2) return cc;
        }
      } catch(e){ /* ignore */ }
    }

    // Browser locale fallback
    try {
      const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean);
      for (const l of langs) {
        const m = String(l).match(/[-_](\w{2})\b/);
        if (m && m[1]) return String(m[1]).toUpperCase();
      }
    } catch(e){ /* ignore */ }

    const fallback = safeText(window.ULYDIA_DEFAULT_COUNTRY || "FR").trim().toUpperCase();
    return (fallback && fallback.length === 2) ? fallback : "FR";
  }

  // ---------------------------------------------------------
  // Data normalization
  // ---------------------------------------------------------
  function normCountry(c){
  if (!c || typeof c !== "object") return null;
  const iso = safeText(c.iso || c.code || c.country || c.alpha2).trim().toUpperCase();
  const name = safeText(c.name || c.pays || c.title || iso).trim();
  const lang = safeText(c.langue_finale || c.lang || c.language || "").trim().toLowerCase();
  const wide = safeText(c.banner_wide || c.bannerWide || c.banner1 || (c.banners && c.banners.wide) || "").trim();
  const square = safeText(c.banner_square || c.bannerSquare || c.banner2 || (c.banners && c.banners.square) || "").trim();
  return { iso, name, lang, banners: { wide, square }, raw: c };
}

// ---------------------------------------------------------
// Non-sponsor banners: pick "attente sponsorisation" in the country's language
// Heuristic search on raw country fields + fallback to normCountry banners.
// ---------------------------------------------------------
function pickNonSponsorBanner(countryObj, kind /* "wide"|"square" */, lang){
  const raw = countryObj && countryObj.raw ? countryObj.raw : {};
  const wanted = safeText(kind).toLowerCase();
  const l = safeText(lang).toLowerCase();

  function isUrl(v){
    v = safeText(v).trim();
    return /^https?:\/\//i.test(v) || v.startsWith("//");
  }

  // Score candidates based on key + value hints
  let best = "";
  let bestScore = -1;

  const keys = Object.keys(raw || {});
  for (const k0 of keys){
    const v = raw[k0];
    if (!isUrl(v)) continue;

    const k = safeText(k0).toLowerCase();
    const val = safeText(v).toLowerCase();

    let score = 0;

    // Must look like "waiting sponsorship"
    if (k.includes("attente") || k.includes("waiting")) score += 5;
    if (k.includes("sponsor")) score += 3;
    if (k.includes("banner") || k.includes("banni")) score += 1;

    // Kind hints
    const isWideKey = k.includes("wide") || k.includes("horizontal") || k.includes("landscape") || k.includes("large") || k.includes("bandeau");
    const isSquareKey = k.includes("square") || k.includes("carre") || k.includes("carré") || k.includes("vertical");
    if (wanted === "wide" && isWideKey) score += 3;
    if (wanted === "square" && isSquareKey) score += 3;

    // Language hints in key or filename
    if (l && (k.includes("_"+l) || k.endsWith(l) || k.includes("-"+l) || k.includes(" "+l))) score += 2;
    if (l && (val.includes("_"+l) || val.includes("-"+l) || val.includes("/"+l+"/") || val.includes("lang="+l))) score += 1;

    if (score > bestScore){
      bestScore = score;
      best = safeText(v).trim();
    }
  }

  // If heuristic failed, fallback to normalized fields
  if (!best){
    if (wanted === "wide") best = safeText(countryObj?.banners?.wide || "").trim();
    if (wanted === "square") best = safeText(countryObj?.banners?.square || "").trim();
  }

  return best;
}

function normSector(s){
    if (!s || typeof s !== "object") return null;
    const id = safeText(s.id || s.slug || s.value || "").trim();
    const name = safeText(s.name || s.nom || s.title || id).trim();
    const lang = safeText(s.langue_finale || s.lang || s.language || "").trim().toLowerCase();
    return { id, name, lang, raw: s };
  }

  function normMetier(m){
    if (!m || typeof m !== "object") return null;
    const slug = safeText(m.slug || m.Slug || m.metier_slug || m.value || "").trim();
    const name = safeText(m.name || m.nom || m.title || slug).trim();
    const secteur = safeText(m.secteur || m.sector || m.secteur_id || m.secteur_slug || "").trim();
    // optional prefilled fields
    const fields = m.fields || m;
    const lang = safeText(
      fields?.langue_finale || fields?.Langue_finale ||
      fields?.langue || fields?.Langue ||
      fields?.lang || fields?.Lang ||
      fields?.language || fields?.Language ||
      m.lang || m.language || ""
    ).trim().toLowerCase();
    return { slug, name, secteur, lang, fields, raw: m };
  }

  function pickCountry(countries, iso){
    iso = safeText(iso).trim().toUpperCase();
    if (!iso) return null;
    return countries.find(c => c.iso === iso) || null;
  }

  function pickLangForCountry(country){
    return safeText(country?.lang || country?.raw?.langue_finale || country?.raw?.lang || "").trim().toLowerCase() || "en";
  }

  // ---------------------------------------------------------
  // Worker fetch (job detail)
  // ---------------------------------------------------------
  async function fetchMetierDetail({ slug, iso }){
    if (!WORKER_URL) throw new Error("Missing WORKER_URL (window.ULYDIA_WORKER_URL)");
    if (!PROXY_SECRET) throw new Error("Missing PROXY_SECRET (window.ULYDIA_PROXY_SECRET)");
    const url = new URL(WORKER_URL.replace(/\/$/,"") + "/v1/metier-page");
    url.searchParams.set("slug", slug);
    url.searchParams.set("metier", slug);
    url.searchParams.set("iso", iso);
    url.searchParams.set("country", iso);
    const r = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-proxy-secret": PROXY_SECRET,
        "x-ulydia-proxy-secret": PROXY_SECRET
      }
    });
    const text = await r.text();
    let j = null;
    try { j = JSON.parse(text); } catch(e){ /* noop */ }
    if (!r.ok) {
      throw new Error((j && j.error) ? j.error : `Worker error ${r.status}`);
    }
    return j;
  }

  // =========================================================
  // ULYDIA DESIGN TOKENS (from design-tokens.v2)
  // =========================================================
  const ULYDIA_TOKENS = {
    colors: {
      primary: { base: "#c00102", light: "#ff3d3d", dark: "#8b0001" },
      secondary: { base: "#2563eb", light: "#60a5fa", dark: "#1d4ed8" },
      accent: { base: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
      text: { primary: "#0f172a", secondary: "#334155", muted: "#64748b", inverse: "#ffffff" },
      background: { page: "#f8fafc", card: "#ffffff", elevated: "#ffffff", overlay: "rgba(15,23,42,0.5)" },
      semantic: {
        success: { base: "#22c55e", light: "#dcfce7", dark: "#166534" },
        warning: { base: "#f59e0b", light: "#fef3c7", dark: "#b45309" },
        error: { base: "#ef4444", light: "#fee2e2", dark: "#dc2626" },
        info: { base: "#3b82f6", light: "#dbeafe", dark: "#1d4ed8" }
      },
      border: { default: "rgba(15,23,42,0.12)", strong: "rgba(15,23,42,0.24)", focus: "rgba(192,1,2,0.45)" }
    },
    typography: {
      fontFamily: { sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace' },
      fontSize: { xs: "12px", sm: "14px", base: "16px", lg: "18px", xl: "20px", "2xl": "24px", "3xl": "30px", "4xl": "36px", "5xl": "48px" },
      fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 },
      lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
      letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.02em", wider: "0.08em" }
    },
    spacing: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "20px", "2xl": "24px", "3xl": "32px", "4xl": "40px", "5xl": "48px", "6xl": "64px" },
    radius: { none: "0", sm: "6px", md: "12px", lg: "16px", xl: "18px", "2xl": "24px", "3xl": "26px", full: "9999px" },
    shadow: {
      none: "none",
      sm: "0 1px 2px rgba(15,23,42,0.05)",
      md: "0 4px 6px rgba(15,23,42,0.07)",
      lg: "0 10px 28px rgba(15,23,42,0.12)",
      xl: "0 18px 50px rgba(15,23,42,0.12)",
      soft: "0 10px 30px rgba(15,23,42,0.10)"
    },
    gradients: {
      primary: "linear-gradient(90deg, #c00102, #2563eb)",
      hero: "linear-gradient(90deg, rgba(192,1,2,0.14), rgba(37,99,235,0.14))",
      section: "linear-gradient(90deg, rgba(37,99,235,0.08), rgba(192,1,2,0.06))",
      background: "radial-gradient(1200px 400px at 15% 0%, rgba(192,1,2,0.18), transparent 60%), radial-gradient(1200px 520px at 85% 0%, rgba(37,99,235,0.18), transparent 60%), linear-gradient(180deg, #f8fafc, #fff 55%)"
    },
    blur: { sm: "4px", md: "8px", lg: "14px", xl: "20px" }
  };

  // ---------------------------------------------------------
  // Design (CSS) — Ulydia Design System
  // ---------------------------------------------------------
  function injectCSS(){
    if (document.getElementById("ulydia-metier-css-v9")) return;

    const css = `
:root{
  /* Ulydia Design Tokens */
  --u-primary: ${ULYDIA_TOKENS.colors.primary.base};
  --u-primary-light: ${ULYDIA_TOKENS.colors.primary.light};
  --u-primary-dark: ${ULYDIA_TOKENS.colors.primary.dark};
  --u-secondary: ${ULYDIA_TOKENS.colors.secondary.base};
  --u-secondary-light: ${ULYDIA_TOKENS.colors.secondary.light};
  --u-accent: ${ULYDIA_TOKENS.colors.accent.base};
  --u-text: ${ULYDIA_TOKENS.colors.text.primary};
  --u-text-secondary: ${ULYDIA_TOKENS.colors.text.secondary};
  --u-muted: ${ULYDIA_TOKENS.colors.text.muted};
  --u-border: ${ULYDIA_TOKENS.colors.border.default};
  --u-border-strong: ${ULYDIA_TOKENS.colors.border.strong};
  --u-border-focus: ${ULYDIA_TOKENS.colors.border.focus};
  --u-bg: ${ULYDIA_TOKENS.colors.background.page};
  --u-card: ${ULYDIA_TOKENS.colors.background.card};
  --u-success: ${ULYDIA_TOKENS.colors.semantic.success.base};
  --u-success-light: ${ULYDIA_TOKENS.colors.semantic.success.light};
  --u-warning: ${ULYDIA_TOKENS.colors.semantic.warning.base};
  --u-warning-light: ${ULYDIA_TOKENS.colors.semantic.warning.light};
  --u-error: ${ULYDIA_TOKENS.colors.semantic.error.base};
  --u-error-light: ${ULYDIA_TOKENS.colors.semantic.error.light};
  --u-info: ${ULYDIA_TOKENS.colors.semantic.info.base};
  --u-info-light: ${ULYDIA_TOKENS.colors.semantic.info.light};
  --u-radius: ${ULYDIA_TOKENS.radius.xl};
  --u-radius-sm: ${ULYDIA_TOKENS.radius.md};
  --u-radius-lg: ${ULYDIA_TOKENS.radius["2xl"]};
  --u-shadow: ${ULYDIA_TOKENS.shadow.xl};
  --u-shadow-soft: ${ULYDIA_TOKENS.shadow.soft};
  --u-shadow-lg: ${ULYDIA_TOKENS.shadow.lg};
  --u-blur: ${ULYDIA_TOKENS.blur.lg};
}

#ulydia-metier-root, #ulydia-metier-root * { box-sizing: border-box; }

#ulydia-metier-root{
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  color: var(--u-text);
}

.ul-wrap{
  min-height: 60vh;
  background: radial-gradient(1200px 400px at 15% 0%, rgba(192,1,2,.18), transparent 60%),
              radial-gradient(1200px 520px at 85% 0%, rgba(37,99,235,.18), transparent 60%),
              linear-gradient(180deg, var(--u-bg), #fff 55%);
  padding: 28px 0 60px;
}

.ul-container{
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 18px;
}

.ul-hero{
  border-radius: 26px;
  padding: 26px 22px;
  background: linear-gradient(90deg, rgba(192,1,2,.14), rgba(37,99,235,.14));
  border: 1px solid rgba(15,23,42,.10);
  box-shadow: var(--u-shadow-soft);
  overflow: hidden;
  position: relative;
}
.ul-hero:before{
  content:"";
  position:absolute; inset:-2px;
  background: radial-gradient(600px 200px at 20% 0%, rgba(255,255,255,.70), transparent 65%);
  pointer-events:none;
}
.ul-hero h1{
  margin: 0;
  font-size: 34px;
  letter-spacing: -0.02em;
}
.ul-hero p{
  margin: 8px 0 0;
  color: var(--u-muted);
  font-weight: 600;
}

.ul-sticky{
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: blur(var(--u-blur));
  background: rgba(255,255,255,.72);
  border-bottom: 1px solid rgba(15,23,42,.10);
}
.ul-filters{
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 2fr;
  gap: 12px;
  padding: 14px 0;
}
@media (max-width: 860px){
  .ul-filters{ grid-template-columns: 1fr; }
}
.ul-field label{
  display:block;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15,23,42,.75);
  margin: 0 0 6px;
}
.ul-control{
  width: 100%;
  height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.14);
  background: rgba(255,255,255,.92);
  padding: 0 14px;
  outline: none;
  font-weight: 700;
  color: var(--u-text);
  transition: box-shadow .15s ease, border-color .15s ease, transform .15s ease;
}
.ul-control:focus{
  border-color: rgba(192,1,2,.45);
  box-shadow: 0 0 0 4px rgba(192,1,2,.12);
}
.ul-row{
  margin-top: 18px;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 18px;
}
@media (max-width: 980px){
  .ul-row{ grid-template-columns: 1fr; }
}
.ul-card{
  border-radius: var(--u-radius);
  background: var(--u-card);
  border: 1px solid rgba(15,23,42,.10);
  box-shadow: var(--u-shadow-soft);
  backdrop-filter: blur(var(--u-blur));
  overflow: hidden;
}
.ul-card-head{
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(15,23,42,.08);
  display:flex; align-items:center; justify-content:space-between; gap: 12px;
}
.ul-badge{
  display:inline-flex;
  gap: 8px;
  align-items:center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(192,1,2,.12);
  color: rgba(192,1,2,1);
  font-weight: 900;
  font-size: 12px;
}
.ul-title{
  margin: 10px 0 0;
  font-size: 34px;
  letter-spacing: -0.03em;
}
.ul-sub{
  margin: 8px 0 0;
  color: var(--u-muted);
  font-weight: 650;
  line-height: 1.5;
}
.ul-banner-wide{
  margin: 18px 18px 0;
  height: 138px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(15,23,42,.10);
  box-shadow: 0 10px 28px rgba(15,23,42,.14);
  transform: translateZ(0);
  position: relative;
}
.ul-banner-wide img{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display:block;
  transition: transform .35s ease;
}
.ul-banner-wide:hover img{ transform: scale(1.03); }
.ul-banner-wide:after{
  content:"";
  position:absolute; inset:0;
  background: linear-gradient(90deg, rgba(15,23,42,.0), rgba(15,23,42,.06));
  pointer-events:none;
}
.ul-banner-wide .ul-banner-pill{
  position:absolute; left: 14px; bottom: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.78);
  backdrop-filter: blur(10px);
  font-weight: 900;
  font-size: 12px;
  border: 1px solid rgba(15,23,42,.10);
}

.ul-section{
  padding: 0 18px 18px;
}
.ul-section + .ul-section{ padding-top: 18px; }
.ul-sec-head{
  display:flex; align-items:center; gap: 10px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid rgba(15,23,42,.10);
  background: linear-gradient(90deg, rgba(37,99,235,.08), rgba(192,1,2,.06));
  margin: 18px 0 12px;
}
.ul-sec-head h2{
  margin:0;
  font-size: 16px;
  letter-spacing: .02em;
  text-transform: uppercase;
}
.ul-rich{
  color: rgba(15,23,42,.92);
  line-height: 1.75;
  font-weight: 560;
}
.ul-rich h3{ font-size: 15px; margin: 18px 0 10px; }
.ul-rich h4{ font-size: 14px; margin: 16px 0 8px; color: rgba(15,23,42,.85); }
.ul-rich p{ margin: 10px 0; }
.ul-rich ul{ list-style:none; padding: 0; margin: 12px 0; }
.ul-rich li{ margin: 8px 0; padding-left: 22px; position: relative; }
.ul-rich li:before{ content:"→"; position:absolute; left:0; color: var(--u-primary); font-weight: 900; }

.ul-sidebar{
  position: sticky;
  top: 88px;
}
@media (max-width: 980px){
  .ul-sidebar{ position: static; }
}
.ul-side-inner{ padding: 18px; }
.ul-banner-square{
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  overflow:hidden;
  border: 1px solid rgba(15,23,42,.10);
  box-shadow: 0 10px 28px rgba(15,23,42,.12);
  background: rgba(255,255,255,.6);
}
.ul-banner-square img{ width:100%; height:100%; object-fit: cover; display:block; transition: transform .35s ease; }
.ul-banner-square:hover img{ transform: scale(1.03); }
.ul-mini{
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(15,23,42,.10);
  background: rgba(255,255,255,.72);
}
.ul-mini-title{ font-weight: 900; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: rgba(15,23,42,.7); }
.ul-mini-val{ margin-top: 6px; font-weight: 850; }

.ul-btn{
  display:inline-flex; align-items:center; justify-content:center;
  height: 44px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.12);
  background: #fff;
  font-weight: 900;
  cursor:pointer;
  text-decoration:none;
  color: var(--u-text);
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.ul-btn:hover{
  transform: translateY(-1px);
  border-color: rgba(192,1,2,.35);
  box-shadow: 0 10px 22px rgba(15,23,42,.10);
}
.ul-btn-primary{
  background: linear-gradient(90deg, var(--u-primary), var(--u-primary2));
  color: #fff;
  border: none;
}

.ul-faq-item{
  border: 1px solid rgba(15,23,42,.10);
  border-radius: 16px;
  overflow:hidden;
  background: rgba(255,255,255,.72);
  margin: 10px 0;
}
.ul-faq-q{
  padding: 14px 16px;
  display:flex; align-items:center; justify-content:space-between; gap: 12px;
  cursor:pointer;
  font-weight: 900;
}
.ul-faq-a{
  padding: 0 16px 14px;
  color: rgba(15,23,42,.88);
  line-height: 1.7;
  display:none;
}
.ul-faq-item[data-open="1"] .ul-faq-a{ display:block; }
.ul-faq-item[data-open="1"] .ul-faq-q svg{ transform: rotate(180deg); }
.ul-faq-q svg{ transition: transform .18s ease; }

.ul-empty{
  padding: 18px;
  color: rgba(15,23,42,.70);
  font-weight: 700;
}
`;

    const style = document.createElement("style");
    style.id = "ulydia-metier-css-v9";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // =========================================================
  // UI skeleton
  // =========================================================
  function ensureRoot(){
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      // Insert after first header/nav if possible
      const header = document.querySelector("header");
      if (header && header.parentNode) header.insertAdjacentElement("afterend", root);
      else document.body.prepend(root);
    }
    return root;
  }

  function renderShell(root){
    root.innerHTML = `
<div class="ul-wrap">
  <div class="ul-container">
    <div class="ul-hero">
      <h1>Fiche métier</h1>
      <p>Sélectionne un pays → un secteur → un métier. Les bannières (sponsor/non-sponsor) sont prêtes pour la sponsorisation.</p>
    </div>
  </div>

  <div class="ul-sticky">
    <div class="ul-container">
      <div class="ul-filters">
        <div class="ul-field">
          <label>🌍 Pays</label>
          <select class="ul-control" id="ulCountry"></select>
        </div>
        <div class="ul-field">
          <label>🏢 Secteur d’activité</label>
          <select class="ul-control" id="ulSector"></select>
        </div>
        <div class="ul-field">
          <label>🔍 Métier</label>
          <input class="ul-control" id="ulJob" placeholder="Tape pour chercher un métier…" autocomplete="off" />
          <div id="ulJobSuggest" style="position:relative;"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="ul-container">
    <div class="ul-row">
      <div class="ul-card" id="ulMainCard">
        <div class="ul-card-head">
          <span class="ul-badge">💼 Ulydia</span>
          <div style="display:flex; gap:10px; align-items:center;">
            <a class="ul-btn" id="ulShareBtn" href="#" target="_blank" rel="noopener noreferrer">Copier le lien</a>
            <a class="ul-btn ul-btn-primary" id="ulSponsorBtn" href="#" target="_blank" rel="noopener noreferrer">Sponsoriser</a>
          </div>
        </div>

        <div id="ulHeader" class="ul-section">
          <h2 class="ul-title" id="ulJobTitle">Choisis un métier</h2>
          <p class="ul-sub" id="ulJobSub">Puis la fiche complète s’affichera ici (avec les bannières sponsor/non-sponsor).</p>

          <a class="ul-banner-wide" id="ulBannerWide" href="#" target="_blank" rel="noopener noreferrer" style="display:none;">
            <img id="ulBannerWideImg" alt="Ulydia banner wide"/>
            <div class="ul-banner-pill" id="ulBannerWidePill">Sponsor</div>
          </a>
        </div>

        <div id="ulContent" class="ul-section">
          <div class="ul-empty">Sélectionne un pays, puis un secteur, puis un métier.</div>
        </div>
      </div>

      <div class="ul-card ul-sidebar" id="ulSideCard">
        <div class="ul-side-inner">
          <a class="ul-banner-square" id="ulBannerSquare" href="#" target="_blank" rel="noopener noreferrer" style="display:none;">
            <img id="ulBannerSquareImg" alt="Ulydia banner square"/>
          </a>

          <div class="ul-mini">
            <div class="ul-mini-title">Pays</div>
            <div class="ul-mini-val" id="ulSideCountry">—</div>
          </div>

          <div class="ul-mini">
            <div class="ul-mini-title">Secteur</div>
            <div class="ul-mini-val" id="ulSideSector">—</div>
          </div>

          <div class="ul-mini">
            <div class="ul-mini-title">Métier</div>
            <div class="ul-mini-val" id="ulSideJob">—</div>
          </div>

          <div class="ul-mini" id="ulSideHint" style="margin-top:14px;">
            <div class="ul-mini-title">Info</div>
            <div style="margin-top:6px; color: rgba(15,23,42,.75); font-weight:650; line-height:1.45;">
              Si le métier n’est pas sponsorisé, la bannière redirige vers la page Sponsor.
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>`;
  }

  // =========================================================
  // Suggestions (simple dropdown)
  // =========================================================
  function renderSuggestions(container, items, onPick){
    container.innerHTML = "";
    if (!items.length) return;

    const box = document.createElement("div");
    box.style.position = "absolute";
    box.style.left = "0";
    box.style.right = "0";
    box.style.top = "8px";
    box.style.border = "1px solid rgba(15,23,42,.12)";
    box.style.borderRadius = "14px";
    box.style.background = "rgba(255,255,255,.95)";
    box.style.backdropFilter = "blur(10px)";
    box.style.boxShadow = "0 14px 30px rgba(15,23,42,.12)";
    box.style.overflow = "hidden";
    box.style.zIndex = "90";
    box.style.maxHeight = "320px";
    box.style.overflowY = "auto";

    items.slice(0, 12).forEach(it => {
      const row = document.createElement("div");
      row.style.padding = "10px 12px";
      row.style.cursor = "pointer";
      row.style.borderBottom = "1px solid rgba(15,23,42,.06)";
      row.innerHTML = `<div style="font-weight:900;">${escapeHtml(it.name)}</div>
<div style="font-size:12px; color: rgba(15,23,42,.55); font-weight:700;">${escapeHtml(it.slug)}${it.secteur ? " • " + escapeHtml(it.secteur) : ""}</div>`;
      row.addEventListener("mouseenter", () => row.style.background = "rgba(192,1,2,.06)");
      row.addEventListener("mouseleave", () => row.style.background = "transparent");
      row.addEventListener("click", () => onPick(it));
      box.appendChild(row);
    });

    container.appendChild(box);

    const close = (ev) => {
      if (!container.contains(ev.target)) container.innerHTML = "";
    };
    setTimeout(() => document.addEventListener("click", close, { once: true }), 0);
  }

  // =========================================================
  // Rendering job profile blocks (field mapping)
  // =========================================================
  
  // Standard Metier fields
  const FIELD_MAP = {
    accroche: ["accroche","tagline","subtitle","resume","pitch"],
    overview: ["description","vue_d_ensemble","overview","intro","presentation","texte"],
    missions: ["missions","missions_principales","missions_html","missions_rich"],
    competences: ["competences","competences_cles","skills","competences_html"],
    environnements: ["environnements","environnement_de_travail","work_environment","environnements_html"],
    profil: ["profil","profil_recherche","profil_html","profile"],
    evolutions: ["evolutions","evolutions_possibles","career_path","evolutions_html"],
    salaire: ["salaire","remuneration","salary","salaire_html"],
    formations: ["formations","formation","education","formations_html"]
  };

  // Metier_Pays_Bloc extended fields (country-specific)
  const PAYS_BLOC_FIELDS = {
    // Rich text sections
    formation_bloc: ["formation_bloc","formation","formations_pays"],
    acces_bloc: ["acces_bloc","acces","access_routes"],
    marche_bloc: ["marche_bloc","marche","market_info"],
    salaire_bloc: ["salaire_bloc","salaire_pays","salary_country"],
    education_level_local: ["education_level_local","niveau_etudes_local"],
    top_fields: ["Top_fields","top_fields","domaines_principaux"],
    certifications: ["Certifications","certifications","certifs"],
    schools_or_paths: ["Schools_or_paths","schools_or_paths","ecoles_parcours"],
    equivalences: ["Equivalences_reconversion","equivalences_reconversion","equivalences"],
    entry_routes: ["Entry_routes","entry_routes","voies_entree"],
    first_job_titles: ["First_job_titles","first_job_titles","premiers_postes"],
    typical_employers: ["Typical_employers","typical_employers","employeurs_types"],
    portfolio_projects: ["Portfolio_projects","portfolio_projects","projets_portfolio"],
    skills_must_have: ["Skills_must_have","skills_must_have","competences_indispensables"],
    soft_skills: ["Soft_skills","soft_skills","savoir_etre"],
    tools_stack: ["Tools_stack","tools_stack","outils_tech"],
    time_to_employability: ["Time_to_employability","time_to_employability","delai_emploi"],
    hiring_sectors: ["Hiring_sectors","hiring_sectors","secteurs_recruteurs"],
    degrees_examples: ["Degrees_examples","degrees_examples","diplomes_exemples"],
    growth_outlook: ["Growth_outlook","growth_outlook","perspectives_croissance"],
    market_demand: ["Market_demand","market_demand","demande_marche"],
    salary_notes: ["salary_notes","notes_salaire"],
    education_level: ["education_level","niveau_etudes"],
    // KPI / Chips fields (plain text)
    remote_level: ["Remote_level","remote_level","teletravail"],
    automation_risk: ["Automation_risk","automation_risk","risque_automatisation"],
    currency: ["Currency","currency","devise"],
    // Salary range fields
    salary_junior_min: ["salary_junior_min"],
    salary_junior_max: ["salary_junior_max"],
    salary_mid_min: ["salary_mid_min"],
    salary_mid_max: ["salary_mid_max"],
    salary_senior_min: ["salary_senior_min"],
    salary_senior_max: ["salary_senior_max"],
    salary_variable_share: ["salary_variable_share","part_variable"]
  };

  function pickField(fields, keys){
    for (const k of keys) {
      if (fields && (k in fields) && safeText(fields[k]).trim()) return fields[k];
      // also allow nested like fields[k].text
      if (fields && fields[k] && typeof fields[k] === "object") {
        const cand = fields[k].text || fields[k].html || fields[k].value;
        if (safeText(cand).trim()) return cand;
      }
    }
    return "";
  }

  function secHTML(title, icon, html, variant = "default"){
    if (!safeText(html).trim()) return "";
    const bgColors = {
      default: "rgba(192,1,2,.10)",
      blue: "rgba(37,99,235,.10)",
      green: "rgba(34,197,94,.10)",
      orange: "rgba(245,158,11,.10)"
    };
    const borderColors = {
      default: "rgba(192,1,2,.18)",
      blue: "rgba(37,99,235,.18)",
      green: "rgba(34,197,94,.18)",
      orange: "rgba(245,158,11,.18)"
    };
    return `
<div class="ul-sec-head">
  <div style="width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${bgColors[variant] || bgColors.default};border:1px solid ${borderColors[variant] || borderColors.default};">
    ${icon}
  </div>
  <h2>${escapeHtml(title)}</h2>
</div>
<div class="ul-rich">${html}</div>`;
  }

  // ---------------------------------------------------------
  // Render KPI Chips (sidebar)
  // ---------------------------------------------------------
  function renderKPIChips(bloc){
    const chips = [];
    
    const remote = pickField(bloc, PAYS_BLOC_FIELDS.remote_level);
    if (remote) {
      chips.push({ label: "Remote", value: remote, color: "blue" });
    }
    
    const automation = pickField(bloc, PAYS_BLOC_FIELDS.automation_risk);
    if (automation) {
      const riskColor = automation.toLowerCase().includes("high") ? "red" : 
                        automation.toLowerCase().includes("medium") ? "orange" : "green";
      chips.push({ label: "Automation Risk", value: automation, color: riskColor });
    }
    
    const education = pickField(bloc, PAYS_BLOC_FIELDS.education_level);
    if (education) {
      chips.push({ label: "Education", value: education, color: "default" });
    }
    
    if (!chips.length) return "";
    
    const colorMap = {
      default: { bg: "rgba(15,23,42,.08)", text: "rgba(15,23,42,.9)" },
      blue: { bg: "rgba(37,99,235,.12)", text: "rgba(37,99,235,1)" },
      green: { bg: "rgba(34,197,94,.12)", text: "rgba(34,197,94,1)" },
      orange: { bg: "rgba(245,158,11,.12)", text: "rgba(180,83,9,1)" },
      red: { bg: "rgba(239,68,68,.12)", text: "rgba(220,38,38,1)" }
    };
    
    return chips.map(c => {
      const colors = colorMap[c.color] || colorMap.default;
      return `
<div class="ul-mini" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
  <span class="ul-mini-title" style="margin:0;">${escapeHtml(c.label)}</span>
  <span style="padding:4px 10px;border-radius:9999px;background:${colors.bg};color:${colors.text};font-weight:800;font-size:12px;">
    ${escapeHtml(c.value)}
  </span>
</div>`;
    }).join("");
  }

  // ---------------------------------------------------------
  // Render Salary Section (structured)
  // ---------------------------------------------------------
  function renderSalarySection(bloc){
    const currency = pickField(bloc, PAYS_BLOC_FIELDS.currency) || "EUR";
    const variableShare = pickField(bloc, PAYS_BLOC_FIELDS.salary_variable_share);
    
    const juniorMin = pickField(bloc, PAYS_BLOC_FIELDS.salary_junior_min);
    const juniorMax = pickField(bloc, PAYS_BLOC_FIELDS.salary_junior_max);
    const midMin = pickField(bloc, PAYS_BLOC_FIELDS.salary_mid_min);
    const midMax = pickField(bloc, PAYS_BLOC_FIELDS.salary_mid_max);
    const seniorMin = pickField(bloc, PAYS_BLOC_FIELDS.salary_senior_min);
    const seniorMax = pickField(bloc, PAYS_BLOC_FIELDS.salary_senior_max);
    
    const hasData = juniorMin || juniorMax || midMin || midMax || seniorMin || seniorMax;
    if (!hasData) return "";
    
    const formatRange = (min, max) => {
      if (min && max) return `${min} - ${max} ${currency}`;
      if (min) return `${min}+ ${currency}`;
      if (max) return `up to ${max} ${currency}`;
      return "—";
    };
    
    let html = `<div style="display:grid;gap:12px;">`;
    
    if (juniorMin || juniorMax) {
      html += `
<div style="padding:14px 16px;border-radius:14px;border:1px solid rgba(34,197,94,.2);background:rgba(34,197,94,.06);">
  <div style="font-size:12px;font-weight:800;color:rgba(34,197,94,.9);text-transform:uppercase;letter-spacing:.05em;">Junior (0-2 ans)</div>
  <div style="margin-top:6px;font-size:20px;font-weight:900;color:var(--u-text);">${formatRange(juniorMin, juniorMax)}</div>
</div>`;
    }
    
    if (midMin || midMax) {
      html += `
<div style="padding:14px 16px;border-radius:14px;border:1px solid rgba(37,99,235,.2);background:rgba(37,99,235,.06);">
  <div style="font-size:12px;font-weight:800;color:rgba(37,99,235,.9);text-transform:uppercase;letter-spacing:.05em;">Mid (3-5 ans)</div>
  <div style="margin-top:6px;font-size:20px;font-weight:900;color:var(--u-text);">${formatRange(midMin, midMax)}</div>
</div>`;
    }
    
    if (seniorMin || seniorMax) {
      html += `
<div style="padding:14px 16px;border-radius:14px;border:1px solid rgba(192,1,2,.2);background:rgba(192,1,2,.06);">
  <div style="font-size:12px;font-weight:800;color:rgba(192,1,2,.9);text-transform:uppercase;letter-spacing:.05em;">Senior (6+ ans)</div>
  <div style="margin-top:6px;font-size:20px;font-weight:900;color:var(--u-text);">${formatRange(seniorMin, seniorMax)}</div>
</div>`;
    }
    
    if (variableShare) {
      html += `
<div style="padding:10px 14px;border-radius:12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.15);display:flex;align-items:center;gap:8px;">
  <span style="font-size:12px;font-weight:700;color:rgba(180,83,9,.9);">Part variable:</span>
  <span style="font-weight:900;color:var(--u-text);">${escapeHtml(variableShare)}%</span>
</div>`;
    }
    
    const salaryNotes = pickField(bloc, PAYS_BLOC_FIELDS.salary_notes);
    if (salaryNotes) {
      html += `<div style="margin-top:8px;padding:12px;border-radius:12px;background:rgba(15,23,42,.04);font-size:14px;color:var(--u-muted);line-height:1.5;">${asRichHTML(salaryNotes)}</div>`;
    }
    
    html += `</div>`;
    return html;
  }

  // ---------------------------------------------------------
  // Render Metier_Pays_Bloc cards
  // ---------------------------------------------------------
  function renderPaysBlocCards(blocs, iso){
    if (!Array.isArray(blocs) || !blocs.length) return "";
    
    // Filter blocs for this country
    const countryBlocs = blocs.filter(b => {
      const bIso = safeText(b.iso || b.country || b.pays || "").trim().toUpperCase();
      return !bIso || bIso === iso;
    });
    
    if (!countryBlocs.length) return "";
    
    // Merge all blocs into one object for easier field access
    const merged = {};
    for (const b of countryBlocs) {
      Object.assign(merged, b);
    }
    
    let html = "";
    
    // Formation bloc
    const formation = pickField(merged, PAYS_BLOC_FIELDS.formation_bloc);
    if (formation) {
      html += renderBlocCard("Formation & Parcours", formation, "blue");
    }
    
    // Acces bloc
    const acces = pickField(merged, PAYS_BLOC_FIELDS.acces_bloc);
    if (acces) {
      html += renderBlocCard("Acces au metier", acces, "green");
    }
    
    // Marche bloc
    const marche = pickField(merged, PAYS_BLOC_FIELDS.marche_bloc);
    if (marche) {
      html += renderBlocCard("Marche de l'emploi", marche, "orange");
    }
    
    // Skills must have
    const skills = pickField(merged, PAYS_BLOC_FIELDS.skills_must_have);
    if (skills) {
      html += renderBlocCard("Competences indispensables", skills, "default");
    }
    
    // Soft skills
    const softSkills = pickField(merged, PAYS_BLOC_FIELDS.soft_skills);
    if (softSkills) {
      html += renderBlocCard("Soft Skills", softSkills, "blue");
    }
    
    // Tools & Stack
    const tools = pickField(merged, PAYS_BLOC_FIELDS.tools_stack);
    if (tools) {
      html += renderBlocCard("Outils & Technologies", tools, "default");
    }
    
    // Certifications
    const certs = pickField(merged, PAYS_BLOC_FIELDS.certifications);
    if (certs) {
      html += renderBlocCard("Certifications", certs, "green");
    }
    
    // Schools / Paths
    const schools = pickField(merged, PAYS_BLOC_FIELDS.schools_or_paths);
    if (schools) {
      html += renderBlocCard("Ecoles & Parcours", schools, "blue");
    }
    
    // Entry routes
    const entry = pickField(merged, PAYS_BLOC_FIELDS.entry_routes);
    if (entry) {
      html += renderBlocCard("Voies d'entree", entry, "default");
    }
    
    // First job titles
    const firstJobs = pickField(merged, PAYS_BLOC_FIELDS.first_job_titles);
    if (firstJobs) {
      html += renderBlocCard("Premiers postes", firstJobs, "green");
    }
    
    // Typical employers
    const employers = pickField(merged, PAYS_BLOC_FIELDS.typical_employers);
    if (employers) {
      html += renderBlocCard("Employeurs types", employers, "blue");
    }
    
    // Hiring sectors
    const sectors = pickField(merged, PAYS_BLOC_FIELDS.hiring_sectors);
    if (sectors) {
      html += renderBlocCard("Secteurs recruteurs", sectors, "orange");
    }
    
    // Growth outlook
    const growth = pickField(merged, PAYS_BLOC_FIELDS.growth_outlook);
    if (growth) {
      html += renderBlocCard("Perspectives de croissance", growth, "green");
    }
    
    // Market demand
    const demand = pickField(merged, PAYS_BLOC_FIELDS.market_demand);
    if (demand) {
      html += renderBlocCard("Demande du marche", demand, "orange");
    }
    
    // Time to employability
    const timeToJob = pickField(merged, PAYS_BLOC_FIELDS.time_to_employability);
    if (timeToJob) {
      html += renderBlocCard("Delai d'employabilite", timeToJob, "default");
    }
    
    // Equivalences
    const equiv = pickField(merged, PAYS_BLOC_FIELDS.equivalences);
    if (equiv) {
      html += renderBlocCard("Equivalences & Reconversion", equiv, "blue");
    }
    
    // Portfolio projects
    const portfolio = pickField(merged, PAYS_BLOC_FIELDS.portfolio_projects);
    if (portfolio) {
      html += renderBlocCard("Projets portfolio", portfolio, "default");
    }
    
    // Degrees examples
    const degrees = pickField(merged, PAYS_BLOC_FIELDS.degrees_examples);
    if (degrees) {
      html += renderBlocCard("Exemples de diplomes", degrees, "green");
    }
    
    return html;
  }

  function renderBlocCard(title, content, variant = "default"){
    const colors = {
      default: { border: "rgba(15,23,42,.12)", bg: "rgba(255,255,255,.72)", badge: "rgba(15,23,42,.08)", badgeText: "rgba(15,23,42,.8)" },
      blue: { border: "rgba(37,99,235,.15)", bg: "rgba(37,99,235,.04)", badge: "rgba(37,99,235,.12)", badgeText: "rgba(37,99,235,1)" },
      green: { border: "rgba(34,197,94,.15)", bg: "rgba(34,197,94,.04)", badge: "rgba(34,197,94,.12)", badgeText: "rgba(34,197,94,1)" },
      orange: { border: "rgba(245,158,11,.15)", bg: "rgba(245,158,11,.04)", badge: "rgba(245,158,11,.15)", badgeText: "rgba(180,83,9,1)" }
    };
    const c = colors[variant] || colors.default;
    
    return `
<div style="padding:16px;margin:12px 0;border-radius:16px;border:1px solid ${c.border};background:${c.bg};">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
    <span style="padding:5px 10px;border-radius:9999px;background:${c.badge};color:${c.badgeText};font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">
      ${escapeHtml(title)}
    </span>
  </div>
  <div class="ul-rich">${asRichHTML(content)}</div>
</div>`;
  }

  // ---------------------------------------------------------
  // Render Sidebar KPIs section
  // ---------------------------------------------------------
  function renderSidebarKPIs(bloc){
    if (!bloc) return "";
    
    let html = renderKPIChips(bloc);
    
    // Salary summary for sidebar
    const salaryHtml = renderSalarySection(bloc);
    if (salaryHtml) {
      html += `
<div class="ul-mini" style="margin-top:16px;">
  <div class="ul-mini-title" style="margin-bottom:10px;">Salaires</div>
  ${salaryHtml}
</div>`;
    }
    
    return html;
  }

  function renderFAQ(faqItems){
    if (!Array.isArray(faqItems) || !faqItems.length) return "";
    const rows = faqItems.map((it, idx) => {
      const q = safeText(it.question || it.q || it.titre || it.title || "").trim() || `Question ${idx+1}`;
      const a = asRichHTML(it.answer || it.a || it.reponse || it.content || "");
      if (!a) return "";
      return `
<div class="ul-faq-item" data-open="0">
  <div class="ul-faq-q">
    <div>${escapeHtml(q)}</div>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </div>
  <div class="ul-faq-a">${a}</div>
</div>`;
    }).join("");
    return secHTML("FAQ", "❓", rows);
  }

  function bindFAQ(root){
    qsa(".ul-faq-item .ul-faq-q", root).forEach(qel => {
      qel.addEventListener("click", () => {
        const item = qel.closest(".ul-faq-item");
        if (!item) return;
        item.dataset.open = item.dataset.open === "1" ? "0" : "1";
      });
    });
  }

  // =========================================================
  // Main controller
  // =========================================================
  async function main(){
    injectCSS();
    hideCMSDataContainers();
    const root = ensureRoot();
    renderShell(root);

    // Load CMS lists
    const rawCountries = readJSONBlocksByPrefix("countriesData") || window.__ULYDIA_COUNTRIES__ || [];
    const rawSectors   = readJSONBlocksByPrefix("sectorsData")   || window.__ULYDIA_SECTORS__   || [];
    const rawMetiers   = readJSONBlocksByPrefix("metiersData")   || window.__ULYDIA_METIERS__   || [];

    const countries = uniqBy((rawCountries||[]).map(normCountry).filter(Boolean), x => x.iso);
    const sectors   = uniqBy((rawSectors||[]).map(normSector).filter(Boolean), x => x.id || x.name);
    // IMPORTANT: keep one record per (slug,lang) to support language-specific metier variants
    const metiers   = uniqBy((rawMetiers||[]).map(normMetier).filter(Boolean), x => `${x.slug}__${x.lang || ""}`);

    log("cms loaded", { countries: countries.length, sectors: sectors.length, metiers: metiers.length });

    // Elements
    const elCountry = qs("#ulCountry", root);
    const elSector  = qs("#ulSector", root);
    const elJob     = qs("#ulJob", root);
    const elSuggest = qs("#ulJobSuggest", root);

    const elTitle   = qs("#ulJobTitle", root);
    const elSub     = qs("#ulJobSub", root);
    const elContent = qs("#ulContent", root);

    const elWideA   = qs("#ulBannerWide", root);
    const elWideImg = qs("#ulBannerWideImg", root);
    const elWidePill= qs("#ulBannerWidePill", root);

    const elSqA     = qs("#ulBannerSquare", root);
    const elSqImg   = qs("#ulBannerSquareImg", root);

    const elSideCountry = qs("#ulSideCountry", root);
    const elSideSector  = qs("#ulSideSector", root);
    const elSideJob     = qs("#ulSideJob", root);

    const elSponsorBtn  = qs("#ulSponsorBtn", root);
    const elShareBtn    = qs("#ulShareBtn", root);

    // Build country options
    const visitorISO = await detectVisitorISO();
    const url0 = getURLParams();
    const storedISO = getStoredCountry();
    // Default: start with visitor ISO (first-load behavior). Stored choice is secondary.
    // URL country is ignored unless forceCountry=1
    const startISO = visitorISO || storedISO || (url0.forceCountry ? url0.country : "");

    function opt(v, t){ const o=document.createElement("option"); o.value=v; o.textContent=t; return o; }
    elCountry.innerHTML = "";
    countries.forEach(c => elCountry.appendChild(opt(c.iso, `${c.iso} — ${c.name}`)));
    if (startISO && pickCountry(countries, startISO)) elCountry.value = startISO;
    else if (countries.length) elCountry.value = countries[0].iso;
    setStoredCountry(elCountry.value);

    // Ensure the URL reflects the initial (visitor/stored) country choice
    setURLParams({ country: elCountry.value }, { replace: true });

    // Determine current language from selected country
    function currentCountry(){
      return pickCountry(countries, elCountry.value) || pickCountry(countries, visitorISO) || countries[0] || null;
    }
    function currentLang(){
      return pickLangForCountry(currentCountry());
    }

    function findMetierVariant(slug, lang){
      slug = safeText(slug).trim();
      lang = safeText(lang).trim().toLowerCase();
      if (!slug) return null;
      // Prefer exact lang match
      const exact = metiers.find(m => m.slug === slug && m.lang && m.lang === lang);
      if (exact) return exact;
      // If records have no language at all, fallback to first slug match.
      const hasAnyLang = metiers.some(mm => !!(mm && mm.lang));
      if (!hasAnyLang) {
        const any = metiers.find(m => m.slug === slug);
        return any || null;
      }
      // Otherwise, no match for this country language
      return null;
    }

    // Sectors options (filtered by language if possible)
    function buildSectors(){
      const lang = currentLang();
      const list = sectors.filter(s => !s.lang || s.lang === lang);
      elSector.innerHTML = "";
      elSector.appendChild(opt("", "Select a sector"));
      list
        .slice()
        .sort((a,b) => a.name.localeCompare(b.name))
        .forEach(s => elSector.appendChild(opt(s.id || s.name, s.name)));

      // preselect from URL sector if possible
      const fromUrl = safeText(getURLParams().sector).trim();
      if (fromUrl) elSector.value = fromUrl;
      else elSector.value = "";
    }

    // Jobs pool based on selected sector + language
    function jobsForSelection(){
      const sectorId = safeText(elSector.value).trim();
      const lang = currentLang();

      // Filter by sector when possible
      let list = metiers.slice();
      if (sectorId) {
        list = list.filter(m => {
          const sec = safeText(m.secteur).trim();
          if (!sec) return false;
          return sec === sectorId;
        });
      }

      // Language-specific metier variants: keep only matching language when available
      list = list.filter(m => !m.lang || m.lang === lang);

      return list;
    }

    function updateSidebar(){
      const c = currentCountry();
      elSideCountry.textContent = c ? `${c.name} (${c.iso})` : "—";
      elSideSector.textContent = elSector.value ? (elSector.selectedOptions[0]?.textContent || elSector.value) : "—";
      elSideJob.textContent = safeText(elTitle.textContent).trim() || "—";
    }

    async function renderMetier(slug){
      const iso = safeText(elCountry.value).trim().toUpperCase();
      if (!slug || !iso) return;

      const countrySel = pickCountry(countries, iso);
      const lang = pickLangForCountry(countrySel);

      elContent.innerHTML = `<div class="ul-empty">Chargement de la fiche métier…</div>`;
      elTitle.textContent = "Chargement…";
      elSub.textContent = " ";

      // find in metiersData (language-specific)
      const base = findMetierVariant(slug, lang);
      let fields = base ? (base.fields || base.raw) : {};

      // If the metier does not exist for this country's language, show a clear message
      if (!base) {
        // Hide banners when the metier is unavailable for this country
        elWideA.style.display = "none";
        elSqA.style.display = "none";
        elTitle.textContent = "Métier indisponible";
        elSub.textContent = `Ce métier n'existe pas pour ce pays (${iso})`;
        elContent.innerHTML = `
          <div class="ul-empty" style="text-align:left;">
            <div style="font-weight:900; font-size:18px; margin-bottom:8px;">Ce métier n'existe pas pour ce pays.</div>
            <div style="color:rgba(15,23,42,.7);">Pays : <b>${esc(iso)}</b> • Langue : <b>${esc(lang.toUpperCase())}</b></div>
            <div style="margin-top:10px; color:rgba(15,23,42,.7);">Choisis un autre pays ou un autre métier.</div>
          </div>`;
        updateSidebar();
        return;
      }

      // try Worker for richer data (and sponsor banners)
      let worker = null;
      try {
        worker = await fetchMetierDetail({ slug, iso });
      } catch(e){
        log("worker detail failed", e);
      }

      // Merge fields if worker provides metier object
      const wMetier = worker?.metier || worker?.job || null;
      if (wMetier && typeof wMetier === "object") {
        fields = Object.assign({}, fields, wMetier);
      }

      const countryObj = worker?.pays ? normCountry(worker.pays) : pickCountry(countries, iso);
      const lang2 = pickLangForCountry(countryObj) || lang;

      // Sponsor decision
      const sponsor = worker?.sponsor || worker?.meta?.sponsor || null;
      const sponsorLink = safeText(sponsor?.link || sponsor?.url || sponsor?.website || "").trim();
      const sponsorWide = safeText(sponsor?.logo_2 || sponsor?.logo_wide || sponsor?.wide || "").trim();
      const sponsorSquare = safeText(sponsor?.logo_1 || sponsor?.logo_square || sponsor?.square || "").trim();

      const fallbackWide = pickNonSponsorBanner(countryObj, "wide", lang2);
      const fallbackSquare = pickNonSponsorBanner(countryObj, "square", lang2);

      const isSponsored = !!(sponsorLink && (sponsorWide || sponsorSquare));
      const sponsorCTA = new URL(location.origin + SPONSOR_PATH);
      sponsorCTA.searchParams.set("metier", slug);
      sponsorCTA.searchParams.set("country", iso);

      // Banner links: sponsor link if sponsored, else sponsor page
      const clickUrl = isSponsored ? sponsorLink : sponsorCTA.toString();
      elSponsorBtn.href = sponsorCTA.toString();

      // Wide banner
      const wideUrl = isSponsored ? (sponsorWide || sponsorSquare) : fallbackWide;
      if (wideUrl) {
        elWideImg.src = wideUrl;
        elWideA.href = clickUrl;
        elWidePill.textContent = isSponsored ? "Sponsor" : "Sponsoriser ce métier";
        elWideA.style.display = "block";
      } else {
        elWideA.style.display = "none";
      }

      // Square banner
      const sqUrl = isSponsored ? (sponsorSquare || sponsorWide) : fallbackSquare;
      if (sqUrl) {
        elSqImg.src = sqUrl;
        elSqA.href = clickUrl;
        elSqA.style.display = "block";
      } else {
        elSqA.style.display = "none";
      }

      // Titles
      const displayName = safeText(fields.nom || fields.name || fields.title || base?.name || slug).trim();
      const accroche = pickField(fields, FIELD_MAP.accroche);
      elTitle.textContent = displayName;
      elSub.textContent = safeText(accroche).trim() || `Langue: ${lang2.toUpperCase()} • Pays: ${iso}`;

      // Content blocks (standard Metier fields)
      const overview = pickField(fields, FIELD_MAP.overview);
      const missions = pickField(fields, FIELD_MAP.missions);
      const competences = pickField(fields, FIELD_MAP.competences);
      const environnements = pickField(fields, FIELD_MAP.environnements);
      const profil = pickField(fields, FIELD_MAP.profil);
      const evolutions = pickField(fields, FIELD_MAP.evolutions);
      const salaire = pickField(fields, FIELD_MAP.salaire);
      const formations = pickField(fields, FIELD_MAP.formations);

      // Metier_Pays_Bloc data (country-specific)
      const rawBlocs = readJSONScriptsById("blocsData") || window.__ULYDIA_BLOCS__ || worker?.blocs || worker?.metier_pays_bloc || worker?.metier_pays_blocs || [];
      const blocs = Array.isArray(rawBlocs) ? rawBlocs.filter(b => {
        const bIso = safeText(b.iso || b.country || b.pays || "").trim().toUpperCase();
        return !bIso || bIso === iso;
      }) : [];
      
      // Merge all country blocs for KPI/salary access
      const mergedBloc = {};
      for (const b of blocs) {
        Object.assign(mergedBloc, b);
      }

      const rawFAQ = readJSONScriptsById("faqData") || window.__ULYDIA_FAQ__ || worker?.faq || worker?.faqs || [];
      const faq = Array.isArray(rawFAQ) ? rawFAQ : [];

      // Build main content HTML
      let html = "";
      
      // Standard Metier sections
      html += secHTML("Vue d'ensemble", "📄", asRichHTML(overview), "default");
      html += secHTML("Missions principales", "✅", asRichHTML(missions), "default");
      html += secHTML("Competences cles", "✨", asRichHTML(competences), "blue");
      html += secHTML("Environnements de travail", "💡", asRichHTML(environnements), "default");
      html += secHTML("Profil recherche", "🎯", asRichHTML(profil), "green");
      html += secHTML("Formations", "🎓", asRichHTML(formations), "blue");
      html += secHTML("Salaire", "💰", asRichHTML(salaire), "orange");
      html += secHTML("Evolutions possibles", "🧭", asRichHTML(evolutions), "green");

      // Metier_Pays_Bloc sections (country-specific cards)
      if (blocs.length) {
        const paysBlocCards = renderPaysBlocCards(blocs, iso);
        if (paysBlocCards) {
          html += `
<div class="ul-sec-head" style="background:linear-gradient(90deg, rgba(37,99,235,.12), rgba(192,1,2,.08));">
  <div style="width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(37,99,235,.15);border:1px solid rgba(37,99,235,.25);">
    🌍
  </div>
  <h2>Specificites ${iso}</h2>
</div>
<div style="display:grid;gap:0;">${paysBlocCards}</div>`;
        }
        
        // Structured salary section from Metier_Pays_Bloc
        const structuredSalary = renderSalarySection(mergedBloc);
        if (structuredSalary) {
          html += secHTML(`Grille salariale ${iso}`, "💰", structuredSalary, "orange");
        }
      }

      html += renderFAQ(faq);

      if (!safeText(html).trim()) {
        html = `<div class="ul-empty">Aucune donnee de fiche metier trouvee pour ce metier.</div>`;
      }

      elContent.innerHTML = html;
      bindFAQ(root);

      // Update sidebar with KPIs from Metier_Pays_Bloc
      const elSideInner = qs(".ul-side-inner", root);
      if (elSideInner && blocs.length) {
        // Find hint section and add KPIs before it
        const hintEl = qs("#ulSideHint", root);
        const kpisHtml = renderSidebarKPIs(mergedBloc);
        if (kpisHtml && hintEl) {
          // Remove old KPIs container if exists
          const oldKpis = qs("#ulSideKPIs", root);
          if (oldKpis) oldKpis.remove();
          
          // Insert new KPIs
          const kpisContainer = document.createElement("div");
          kpisContainer.id = "ulSideKPIs";
          kpisContainer.innerHTML = kpisHtml;
          hintEl.insertAdjacentElement("beforebegin", kpisContainer);
        }
      }

      // Share link + sidebar
      const shareUrl = new URL(location.origin + CANON_METIER_PATH);
      shareUrl.searchParams.set("metier", slug);
      shareUrl.searchParams.set("country", iso);
      elShareBtn.href = shareUrl.toString();
      elShareBtn.onclick = (ev) => {
        ev.preventDefault();
        navigator.clipboard?.writeText(shareUrl.toString()).then(() => {
          elShareBtn.textContent = "Lien copie ✓";
          setTimeout(()=> elShareBtn.textContent = "Copier le lien", 1200);
        }).catch(()=> {
          prompt("Copie ce lien:", shareUrl.toString());
        });
      };

      updateSidebar();
    }

    // Build sectors now
    buildSectors();

    // Initial selection (URL metier)
    const startMetier = safeText(url0.metier).trim();
    if (startMetier) {
      // Try select sector based on metier.secteur if we have it
      const baseStart = findMetierVariant(startMetier, currentLang());
      if (baseStart?.secteur) elSector.value = baseStart.secteur;
      setURLParams({ metier: startMetier, country: elCountry.value }, { replace: true });
      await renderMetier(startMetier);
    } else {
      updateSidebar();
    }

    // Event handlers
    elCountry.addEventListener("change", async () => {
      setStoredCountry(elCountry.value);
      // Update sectors per new country language
      buildSectors();
      // If metier already chosen, re-render to update banners/language
      const { metier } = getURLParams();
      if (metier) {
        setURLParams({ country: elCountry.value }, { replace: true });
        await renderMetier(metier);
      } else {
        setURLParams({ country: elCountry.value }, { replace: true });
        updateSidebar();
      }
    });

    elSector.addEventListener("change", () => {
      // clear job input to encourage next step
      elJob.value = "";
      updateSidebar();
    });

    let selectedMetierSlug = "";

// Suggestions: click = real selection
    const doSuggest = debounce(() => {
      const q = safeText(elJob.value).trim().toLowerCase();
      if (q.length < 2) { elSuggest.innerHTML = ""; return; }

      const sectorId = safeText(elSector.value).trim();
      const pool = jobsForSelection();
      const hits = pool.filter(m => {
        const hay = (m.name + " " + m.slug).toLowerCase();
        return hay.includes(q);
      });

      let list = hits.slice(0, 12);

      // If a sector is selected, prepend the "All jobs" option
      if (sectorId) {
        list = [{
          __all__: true,
          slug: "__all__",
          name: "Tous les métiers (ignorer le secteur)"
        }].concat(list);
      }

      renderSuggestions(elSuggest, list, async (m) => {
        elSuggest.innerHTML = "";

        // Special option: clear sector filter
        if (m && m.__all__) {
          elSector.value = "";
          selectedMetierSlug = "";
          setURLParams({ sector: "" }, { replace: true });
          updateSidebar();
          // keep query, refresh suggestions without sector
          doSuggest();
          return;
        }

        if (!m || !m.slug) return;

        selectedMetierSlug = m.slug;
        elJob.value = m.name;

        // Navigate + render
        const iso = safeText(elCountry.value).trim().toUpperCase();
        setURLParams({ metier: m.slug, country: iso, sector: elSector.value }, { replace: false });
        await renderMetier(m.slug);
      });
    }, 90);

    elJob.addEventListener("input", () => { selectedMetierSlug = ""; doSuggest(); });
    elJob.addEventListener("focus", doSuggest);

    // React to back/forward nav
    window.addEventListener("popstate", async () => {
      const p = getURLParams();
      if (p.country && p.country !== elCountry.value) elCountry.value = p.country;
      buildSectors();
      if (p.metier) await renderMetier(p.metier);
    });
  }

  main().catch((e) => {
    console.error("[metier-page.v9.6] fatal", e);
  });
})();