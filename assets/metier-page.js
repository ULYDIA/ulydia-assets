/* metier-page.js — Ulydia (V6.1)
   ✅ Single shell page /metier (filters + job profile)
   ✅ Order: COUNTRY → SECTOR → JOB
   ✅ Preselect from URL: /metier?metier=SLUG&country=FR
   ✅ Visitor default country via IPinfo (optional)
   ✅ Job details via Worker (/v1/metier-page?slug=...&iso=...) OR from metiersData fields if present
   ✅ Sponsor vs non-sponsor banners (non-sponsor click → /sponsor?metier=...&country=...)
   ✅ Blocky modern design (cards, gradients, subtle “wow”)
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V61__) return;
  window.__ULYDIA_METIER_PAGE_V61__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page.v6.1]", ...a);

  // =========================================================
  // CONFIG (from global or fallback)
  // =========================================================
  const WORKER_URL   = String(window.ULYDIA_WORKER_URL || "").trim();
  const PROXY_SECRET = String(window.ULYDIA_PROXY_SECRET || "").trim();
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
    return { metier, country, sector };
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
  // Country detection (optional)
  // ---------------------------------------------------------
  async function detectVisitorISO(){
    // 1) URL param
    const fromURL = getURLParams().country;
    if (fromURL) return fromURL;

    // 2) IPinfo if available
    if (IPINFO_TOKEN) {
      try {
        const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const cc = safeText(j.country).trim().toUpperCase();
          if (cc) return cc;
        }
      } catch(e){ log("ipinfo failed", e); }
    }
    return "FR";
  }

  // ---------------------------------------------------------
  // Data normalization
  // ---------------------------------------------------------
  function normCountry(c){
    if (!c || typeof c !== "object") return null;

    const iso = safeText(c.iso || c.code || c.country || c.alpha2 || c.ISO || c.iso2).trim().toUpperCase();
    const name = safeText(c.name || c.pays || c.title || c.nom || iso).trim();
    const lang = safeText(
      c.langue_finale || c.lang || c.language || c.langue || c.lang_finale || ""
    ).trim().toLowerCase();

    // Bannières "attente sponsorisation" (noms variables selon Webflow/Airtable)
    const wide = safeText(
      c.banner_wide ||
      c.bannerWide ||
      c.banner1 ||
      c.banniere_wide ||
      c.banniereWide ||
      c.banniere_1 ||
      c.banniere_attente_sponsorisation_wide ||
      c.banniere_attente_sponsorisation ||
      c.attente_sponsorisation_wide ||
      c.attente_sponsorisation ||
      c.banner_attente_sponsorisation_wide ||
      c.banner_attente_sponsorisation ||
      (c.banners && (c.banners.wide || c.banners.banner_wide)) ||
      ""
    ).trim();

    const square = safeText(
      c.banner_square ||
      c.bannerSquare ||
      c.banner2 ||
      c.banniere_square ||
      c.banniereSquare ||
      c.banniere_2 ||
      c.banniere_attente_sponsorisation_square ||
      c.attente_sponsorisation_square ||
      c.banner_attente_sponsorisation_square ||
      (c.banners && (c.banners.square || c.banners.banner_square)) ||
      ""
    ).trim();

    // Fallbacks: si un seul format est fourni, on le réutilise
    const wide2 = wide || square || "";
    const square2 = square || wide || "";

    return { iso, name, lang, banners: { wide: wide2, square: square2 }, raw: c };
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
    return { slug, name, secteur, fields, raw: m };
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
    url.searchParams.set("iso", iso);
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

  // ---------------------------------------------------------
  // Design (CSS) — inspired by your propal HTML
  // ---------------------------------------------------------
  function injectCSS(){
    if (document.getElementById("ulydia-metier-css-v61")) return;

    const css = `
:root{
  --u-primary: #c00102;
  --u-primary2: #2563eb;
  --u-text: #0f172a;
  --u-muted: #64748b;
  --u-border: rgba(15,23,42,.12);
  --u-bg: #f8fafc;
  --u-card: rgba(255,255,255,.86);
  --u-radius: 18px;
  --u-radius-sm: 12px;
  --u-shadow: 0 18px 50px rgba(15,23,42,.12);
  --u-shadow-soft: 0 10px 30px rgba(15,23,42,.10);
  --u-blur: 14px;
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

/* Sticky filter bar */
.ul-sticky{
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(var(--u-blur));
  border-bottom: 1px solid rgba(15,23,42,.10);
  box-shadow: 0 10px 22px rgba(15,23,42,.06);
}
.ul-filters{
  display:grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 14px;
  padding: 16px 0 10px;
}
@media (max-width: 980px){
  .ul-filters{ grid-template-columns: 1fr; }
}
.ul-field label{
  display:block;
  font-size: 12px;
  font-weight: 900;
  color: rgba(15,23,42,.82);
  margin: 0 0 8px;
}
.ul-control{
  width: 100%;
  height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.14);
  background: white;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 700;
  outline: none;
}
.ul-control:focus{
  border-color: rgba(192,1,2,.55);
  box-shadow: 0 0 0 4px rgba(192,1,2,.10);
}

/* Suggestions */
#ulJobSuggest{
  position: relative;
}
.ul-suggest{
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.12);
  background: rgba(255,255,255,.96);
  backdrop-filter: blur(var(--u-blur));
  box-shadow: 0 20px 40px rgba(15,23,42,.14);
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
}
.ul-suggest button{
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  display:flex;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-weight: 750;
}
.ul-suggest button:hover{
  background: rgba(37,99,235,.08);
}

/* Header */
.ul-header{
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255,255,255,.88);
  border: 1px solid rgba(15,23,42,.10);
  box-shadow: var(--u-shadow-soft);
  display:flex;
  gap: 16px;
  align-items: flex-start;
}
@media (max-width: 980px){
  .ul-header{ flex-direction: column; }
}
.ul-header-icon{
  width: 72px;
  height: 72px;
  border-radius: 22px;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(135deg, rgba(37,99,235,1), rgba(192,1,2,1));
  flex: 0 0 auto;
}
.ul-header-body{ flex: 1 1 auto; min-width: 0; }
.ul-header-actions{
  display:flex;
  gap: 10px;
  flex: 0 0 auto;
}
@media (max-width: 980px){
  .ul-header-actions{ width: 100%; }
  .ul-header-actions a{ flex: 1 1 0; justify-content: center; }
}
.ul-title{
  margin: 10px 0 6px;
  font-size: 42px;
  letter-spacing: -0.03em;
}
@media (max-width: 980px){
  .ul-title{ font-size: 34px; }
}
.ul-sub{
  margin: 0;
  color: rgba(15,23,42,.65);
  font-weight: 650;
}

/* Wide banner placement */
.ul-banner-wide-wrap{
  display:flex;
  justify-content:center;
  margin-top: 16px;
}
.ul-banner-wide{
  width: 720px;
  max-width: 100%;
  height: 128px;
}

/* Layout row */
.ul-row{
  display:grid;
  grid-template-columns: 1.9fr 1fr;
  gap: 18px;
  align-items: start;
  margin-top: 18px;
}
@media (max-width: 980px){
  .ul-row{ grid-template-columns: 1fr; }
}
`;

    const style = document.createElement("style");
    style.id = "ulydia-metier-css-v61";
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
    // Layout inspiré du HTML "propal1" : barre de filtres sticky au-dessus, puis header métier, puis contenu + sidebar.
    root.innerHTML = `
<div class="ul-wrap">
  <div class="ul-sticky">
    <div class="ul-container">
      <div class="ul-filters">
        <div class="ul-field">
          <label>🌍 Pays / Région</label>
          <select class="ul-control" id="ulCountry"></select>
        </div>
        <div class="ul-field">
          <label>🏢 Secteur d’activité</label>
          <select class="ul-control" id="ulSector"></select>
        </div>
        <div class="ul-field">
          <label>🔍 Rechercher un métier</label>
          <input class="ul-control" id="ulJob" placeholder="Ex: Directeur financier, Comptable…" autocomplete="off" />
          <div id="ulJobSuggest" style="position:relative;"></div>
        </div>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding: 0 0 14px;">
        <button class="ul-btn" id="ulResetBtn" type="button">Réinitialiser</button>
        <div style="font-size:12px; color: rgba(15,23,42,.65); font-weight: 800;">
          <span id="ulResultCount">—</span> fiche(s) métier
        </div>
      </div>
    </div>
  </div>

  <div class="ul-container">
    <header class="ul-header">
      <div class="ul-header-icon" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      </div>
      <div class="ul-header-body">
        <span class="ul-badge">💼 Fiche métier</span>
        <h1 class="ul-title" id="ulJobTitle">Choisis un métier</h1>
        <p class="ul-sub" id="ulJobSub">Sélectionne un pays → un secteur → un métier.</p>

        <!-- Banner wide (sponsor OU attente sponsorisation) -->
        <div class="ul-banner-wide-wrap">
          <a class="ul-banner-wide" id="ulBannerWide" href="#" target="_blank" rel="noopener noreferrer" style="display:none;">
            <img id="ulBannerWideImg" alt="Ulydia banner wide"/>
            <div class="ul-banner-pill" id="ulBannerWidePill">Sponsor</div>
          </a>
        </div>
      </div>

      <div class="ul-header-actions">
        <a class="ul-btn" id="ulShareBtn" href="#" target="_blank" rel="noopener noreferrer">Copier le lien</a>
        <a class="ul-btn ul-btn-primary" id="ulSponsorBtn" href="#" target="_blank" rel="noopener noreferrer">Sponsoriser</a>
      </div>
    </header>

    <div class="ul-row">
      <div class="ul-card" id="ulMainCard">
        <div id="ulContent" class="ul-section">
          <div class="ul-empty">Sélectionne un pays, puis un secteur, puis un métier.</div>
        </div>
      </div>

      <aside class="ul-card ul-sidebar" id="ulSideCard">
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
      </aside>
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
    box.className = "ul-suggest";
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

  function secHTML(title, icon, html){
    if (!safeText(html).trim()) return "";
    return `
<div class="ul-sec-head">
  <div style="width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(192,1,2,.10);border:1px solid rgba(192,1,2,.18);">
    ${icon}
  </div>
  <h2>${escapeHtml(title)}</h2>
</div>
<div class="ul-rich">${html}</div>`;
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
    const rawCountries = readJSONScriptsById("countriesData") || window.__ULYDIA_COUNTRIES__ || [];
    const rawSectors   = readJSONScriptsById("sectorsData")   || window.__ULYDIA_SECTORS__   || [];
    const rawMetiers   = readJSONScriptsById("metiersData")   || window.__ULYDIA_METIERS__   || [];

    const countries = uniqBy((rawCountries||[]).map(normCountry).filter(Boolean), x => x.iso);
    const sectors   = uniqBy((rawSectors||[]).map(normSector).filter(Boolean), x => x.id || x.name);
    const metiers   = uniqBy((rawMetiers||[]).map(normMetier).filter(Boolean), x => x.slug);

    log("cms loaded", { countries: countries.length, sectors: sectors.length, metiers: metiers.length });

    // Elements
    const elCountry = qs("#ulCountry", root);
    const elSector  = qs("#ulSector", root);
    const elJob     = qs("#ulJob", root);
    const elSuggest = qs("#ulJobSuggest", root);

    const elResetBtn = qs("#ulResetBtn", root);
    const elResultCount = qs("#ulResultCount", root);

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
    const startISO = url0.country || visitorISO;

    function opt(v, t){ const o=document.createElement("option"); o.value=v; o.textContent=t; return o; }
    elCountry.innerHTML = "";
    countries.forEach(c => elCountry.appendChild(opt(c.iso, `${c.iso} — ${c.name}`)));
    if (startISO && pickCountry(countries, startISO)) elCountry.value = startISO;
    else if (countries.length) elCountry.value = countries[0].iso;

    // Determine current language from selected country
    function currentCountry(){
      return pickCountry(countries, elCountry.value) || pickCountry(countries, visitorISO) || countries[0] || null;
    }
    function currentLang(){
      return pickLangForCountry(currentCountry());
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
      updateCount();
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

      // If metiers have language, filter; else keep
      list = list.filter(m => {
        const l = safeText(m.fields?.langue_finale || m.fields?.lang || m.raw?.lang || "").trim().toLowerCase();
        return !l || l === lang;
      });

      return list;
    }

    
    function updateCount(){
      if (!elResultCount) return;
      const pool = jobsForSelection();
      elResultCount.textContent = String(pool.length || 0);
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

      elContent.innerHTML = `<div class="ul-empty">Chargement de la fiche métier…</div>`;
      elTitle.textContent = "Chargement…";
      elSub.textContent = " ";

      // find in metiersData
      const base = metiers.find(m => m.slug === slug) || null;
      let fields = base ? (base.fields || base.raw) : {};

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
      const lang = pickLangForCountry(countryObj);

      // Sponsor decision
      const sponsor = worker?.sponsor || worker?.meta?.sponsor || worker?.sponsoring || null;
      const sponsorName = safeText(sponsor?.name || sponsor?.nom || sponsor?.company || sponsor?.brand || "").trim();
      const sponsorLink = safeText(sponsor?.link || sponsor?.url || sponsor?.website || "").trim();
      const sponsorWide = safeText(sponsor?.logo_2 || sponsor?.logo_wide || sponsor?.wide || sponsor?.banner_wide || "").trim();
      const sponsorSquare = safeText(sponsor?.logo_1 || sponsor?.logo_square || sponsor?.square || sponsor?.banner_square || "").trim();

      const fallbackWide = safeText(countryObj?.banners?.wide || "").trim();
      const fallbackSquare = safeText(countryObj?.banners?.square || "").trim();

      // On considère "sponsorisé" si on a AU MOINS une créa (wide ou square).
      // Le lien sponsor peut être absent (dans ce cas, clic -> page Sponsor).
      const hasSponsorCreative = !!(sponsorWide || sponsorSquare);
      const sponsorCTA = new URL(location.origin + SPONSOR_PATH);
      sponsorCTA.searchParams.set("metier", slug);
      sponsorCTA.searchParams.set("country", iso);

      const clickUrl = (hasSponsorCreative && sponsorLink) ? sponsorLink : sponsorCTA.toString();
      elSponsorBtn.href = sponsorCTA.toString();

      // Wide banner

      const wideUrl = hasSponsorCreative ? (sponsorWide || sponsorSquare) : fallbackWide;
      if (wideUrl) {
        elWideImg.src = wideUrl;
        elWideA.href = clickUrl;
        elWidePill.textContent = hasSponsorCreative ? (sponsorName ? `Sponsor — ${sponsorName}` : "Sponsor") : "Sponsoriser ce métier";
        elWideA.style.display = "block";
      } else {
        elWideA.style.display = "none";
      }

      // Square banner
      const sqUrl = hasSponsorCreative ? (sponsorSquare || sponsorWide) : fallbackSquare;
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
      elSub.textContent = safeText(accroche).trim() || `Langue: ${lang.toUpperCase()} • Pays: ${iso}`;

      // Content blocks
      const overview = pickField(fields, FIELD_MAP.overview);
      const missions = pickField(fields, FIELD_MAP.missions);
      const competences = pickField(fields, FIELD_MAP.competences);
      const environnements = pickField(fields, FIELD_MAP.environnements);
      const profil = pickField(fields, FIELD_MAP.profil);
      const evolutions = pickField(fields, FIELD_MAP.evolutions);
      const salaire = pickField(fields, FIELD_MAP.salaire);
      const formations = pickField(fields, FIELD_MAP.formations);

      // Optional blocks + FAQ from JSON scripts or worker
      const rawBlocs = readJSONScriptsById("blocsData") || window.__ULYDIA_BLOCS__ || worker?.blocs || worker?.metier_pays_bloc || worker?.metier_pays_blocs || [];
      const blocs = Array.isArray(rawBlocs) ? rawBlocs.filter(b => {
        const bIso = safeText(b.iso || b.country || b.pays || "").trim().toUpperCase();
        return !bIso || bIso === iso;
      }) : [];

      const rawFAQ = readJSONScriptsById("faqData") || window.__ULYDIA_FAQ__ || worker?.faq || worker?.faqs || [];
      const faq = Array.isArray(rawFAQ) ? rawFAQ : [];

      let html = "";
      html += secHTML("Vue d’ensemble", "📄", asRichHTML(overview));
      html += secHTML("Missions principales", "✅", asRichHTML(missions));
      html += secHTML("Compétences clés", "✨", asRichHTML(competences));
      html += secHTML("Environnements de travail", "💡", asRichHTML(environnements));
      html += secHTML("Profil recherché", "🎯", asRichHTML(profil));
      html += secHTML("Formations", "🎓", asRichHTML(formations));
      html += secHTML("Salaire", "💰", asRichHTML(salaire));
      html += secHTML("Évolutions possibles", "🧭", asRichHTML(evolutions));

      // Blocs pays (as cards)
      if (blocs.length) {
        const cards = blocs.map((b) => {
          const t = safeText(b.title || b.titre || b.nom || "Bloc").trim();
          const c = asRichHTML(b.content || b.texte || b.html || b.description || "");
          if (!c) return "";
          return `
<div class="ul-card" style="padding:16px; margin: 12px 0;">
  <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
    <div style="font-weight:950;">${escapeHtml(t)}</div>
    <span class="ul-badge" style="background:rgba(37,99,235,.10);color:rgba(37,99,235,1);">🌍 ${iso}</span>
  </div>
  <div class="ul-rich" style="margin-top:10px;">${c}</div>
</div>`;
        }).join("");
        html += secHTML("Spécificités par pays", "🌍", cards);
      }

      html += renderFAQ(faq);

      if (!safeText(html).trim()) {
        html = `<div class="ul-empty">Aucune donnée de fiche métier trouvée pour ce métier.</div>`;
      }

      elContent.innerHTML = html;
      bindFAQ(root);

      // Share link + sidebar
      const shareUrl = new URL(location.origin + CANON_METIER_PATH);
      shareUrl.searchParams.set("metier", slug);
      shareUrl.searchParams.set("country", iso);
      elShareBtn.href = shareUrl.toString();
      elShareBtn.onclick = (ev) => {
        ev.preventDefault();
        navigator.clipboard?.writeText(shareUrl.toString()).then(() => {
          elShareBtn.textContent = "Lien copié ✓";
          setTimeout(()=> elShareBtn.textContent = "Copier le lien", 1200);
        }).catch(()=> {
          prompt("Copie ce lien:", shareUrl.toString());
        });
      };

      updateSidebar();
    }

    // Build sectors now
    buildSectors();

// Reset
    if (elResetBtn) {
      elResetBtn.addEventListener("click", async () => {
        // back to visitor default country (or first country)
        const defIso = (pickCountry(countries, visitorISO) ? visitorISO : (countries[0]?.iso || "FR"));
        elCountry.value = defIso;
        buildSectors();
        elJob.value = "";
        elSuggest.innerHTML = "";
        setURLParams({ metier: "", sector: "", country: defIso }, { replace: false });
        elTitle.textContent = "Choisis un métier";
        elSub.textContent = "Sélectionne un pays → un secteur → un métier.";
        elContent.innerHTML = `<div class="ul-empty">Sélectionne un pays, puis un secteur, puis un métier.</div>`;
        // hide banners
        qs("#ulBannerWide", root).style.display = "none";
        qs("#ulBannerSquare", root).style.display = "none";
        updateCount();
        updateSidebar();
      });
    }

    // Initial selection (URL metier)
    const startMetier = safeText(url0.metier).trim();
    if (startMetier) {
      // Try select sector based on metier.secteur if we have it
      const base = metiers.find(m => m.slug === startMetier);
      if (base?.secteur) elSector.value = base.secteur;
      setURLParams({ metier: startMetier, country: elCountry.value }, { replace: true });
      await renderMetier(startMetier);
    } else {
      updateCount();
      updateSidebar();
    }

    // Event handlers
    elCountry.addEventListener("change", async () => {
      // Update sectors per new country language
      buildSectors();
      // If metier already chosen, re-render to update banners/language
      const { metier } = getURLParams();
      if (metier) {
        setURLParams({ country: elCountry.value }, { replace: true });
        await renderMetier(metier);
      } else {
        updateSidebar();
      }
    });

    elSector.addEventListener("change", () => {
      // clear job input to encourage next step
      elJob.value = "";
      updateCount();
      updateSidebar();
    });

    const doSuggest = debounce(() => {
      const q = safeText(elJob.value).trim().toLowerCase();
      if (q.length < 2) { elSuggest.innerHTML = ""; return; }

      const pool = jobsForSelection();
      const hits = pool.filter(m => {
        const hay = (m.name + " " + m.slug).toLowerCase();
        return hay.includes(q);
      });

      renderSuggestions(elSuggest, hits.slice(0, 12), async (m) => {
        elSuggest.innerHTML = "";
        elJob.value = m.name;
        // Navigate + render
        const iso = safeText(elCountry.value).trim().toUpperCase();
        setURLParams({ metier: m.slug, country: iso, sector: elSector.value }, { replace: false });
        await renderMetier(m.slug);
      });
    }, 90);

    elJob.addEventListener("input", doSuggest);
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
    console.error("[metier-page.v6.1] fatal", e);
  });
})();