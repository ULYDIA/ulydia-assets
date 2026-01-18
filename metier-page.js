/**
 * Ulydia — Metier Page (HYBRID: replace ONLY hero) — v4.0
 * - Keeps old Webflow design for the page body
 * - Replaces only the first block (hero) using #ulydia-metier-root
 * - Uses Worker sponsor-info (expects metier + country)
 * - Reads CMS data via [data-ul-f] anywhere (no need for #ul_cms_payload)
 *
 * Debug:
 *   window.__METIER_PAGE_DEBUG__ = true
 */

(() => {
  if (window.__ULYDIA_METIER_PAGE_V4__) return;
  window.__ULYDIA_METIER_PAGE_V4__ = true;

  // =========================================================
  // CONFIG
  // =========================================================
  const CFG = {
    WORKER_URL: "https://ulydia-business.contact-871.workers.dev",
    PROXY_SECRET: "ulydia_2026_proxy_Y4b364u2wsFsQL",
    IPINFO_TOKEN: "941b787cc13473",

    DEFAULT_LANG: "en",
    STORAGE_IP_KEY: "ul_ipinfo_cache_v1",
    IP_TTL_MS: 12 * 60 * 60 * 1000, // 12h

    JOB_SEGMENT: "fiche-metiers",

    // IMPORTANT: update these to your real files (your console showed 404)
    HOUSE_BANNERS: {
      fr: { wide: "", square: "", link: "/sponsorship" },
      en: { wide: "", square: "", link: "/sponsorship" },
      de: { wide: "", square: "", link: "/sponsorship" },
      es: { wide: "", square: "", link: "/sponsorship" },
      it: { wide: "", square: "", link: "/sponsorship" },
    },

    LABELS: {
      fr: { sponsored_by: "Sponsorisé par", sponsor_cta: "Sponsoriser cette fiche" },
      en: { sponsored_by: "Sponsored by", sponsor_cta: "Sponsor this profession" },
      de: { sponsored_by: "Gesponsert von", sponsor_cta: "Diesen Beruf sponsern" },
      es: { sponsored_by: "Patrocinado por", sponsor_cta: "Patrocinar esta profesión" },
      it: { sponsored_by: "Sponsorizzato da", sponsor_cta: "Sponsorizza questa professione" },
    },
  };

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);
  const qp = (name) => new URLSearchParams(location.search).get(name);

  function apiBase(){ return String(CFG.WORKER_URL || "").replace(/\/$/, ""); }

  // =========================================================
  // CSS (ONLY affects the inserted hero)
  // =========================================================
  const CSS = `
  :root{
    --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
    --ul-surface: rgba(255,255,255,0.06);
    --ul-border: rgba(255,255,255,0.10);
    --ul-text: rgba(15, 23, 42, 0.96);
    --ul-muted: rgba(15, 23, 42, 0.68);
    --ul-accent: #646cfd;
    --ul-radius-xl: 20px;
    --ul-shadow: 0 18px 60px rgba(15, 23, 42, 0.12);
    --ul-max: 1120px;
  }
  #ulydia-metier-root{ font-family: var(--ul-font); }
  #ulydia-metier-root *{ box-sizing:border-box; }

  /* hide only legacy hero (not the whole page) */
  html[data-ul-metier-v4="1"] #ul_legacy_metier_hero{ display:none !important; }

  .ul-hero-wrap{
    max-width: var(--ul-max);
    margin: 0 auto;
    padding: 22px 14px 6px;
  }
  .ul-hero{
    display:grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 18px;
    align-items: stretch;
  }
  @media(max-width: 960px){ .ul-hero{ grid-template-columns: 1fr; } }

  .ul-card{
    background:#fff;
    border:1px solid rgba(15,23,42,0.10);
    border-radius: var(--ul-radius-xl);
    box-shadow: var(--ul-shadow);
    overflow:hidden;
  }
  .ul-pad{ padding: 18px; }

  .ul-title{
    margin:0;
    font-size: 42px;
    line-height: 1.06;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: rgba(15,23,42,0.95);
    text-transform: uppercase;
  }
  @media(max-width: 640px){ .ul-title{ font-size: 34px; } }

  .ul-sub{
    margin: 10px 0 0;
    font-size: 16px;
    font-weight: 800;
    color: rgba(15,23,42,0.70);
  }

  .ul-desc{
    margin: 14px 0 0;
    font-size: 15px;
    line-height: 1.65;
    font-weight: 700;
    color: rgba(99, 102, 241, 0.95);
    text-align: center;
  }

  .ul-banners{ display:grid; gap: 14px; }
  .ul-banner{
    position: relative;
    display:block;
    border-radius: var(--ul-radius-xl);
    overflow:hidden;
    border: 1px solid rgba(15,23,42,0.10);
    background: rgba(15,23,42,0.04);
    box-shadow: var(--ul-shadow);
  }
  .ul-banner img{ width:100%; display:block; object-fit:cover; }
  .ul-wide{ aspect-ratio: 16/5; }
  .ul-square{ aspect-ratio: 1/1; }

  .ul-badge{
    position:absolute;
    left: 14px;
    bottom: 14px;
    display:inline-flex;
    align-items:center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.20);
    background: rgba(15, 23, 42, 0.55);
    color: rgba(255,255,255,0.92);
    font-weight: 900;
    font-size: 13px;
    backdrop-filter: blur(10px);
  }
  .ul-dot{
    width:9px; height:9px; border-radius:99px;
    background: var(--ul-accent);
    box-shadow: 0 0 0 3px rgba(100,108,253,0.22);
  }

  /* CSP-safe fallback if image missing */
  .ul-fallback{
    background: linear-gradient(135deg, rgba(11,16,32,0.95), rgba(100,108,253,0.55));
  }
  `;

  function injectCSS(){
    const id="ul_metier_css_v4";
    if (document.getElementById(id)) return;
    const s=document.createElement("style");
    s.id=id;
    s.textContent=CSS;
    document.head.appendChild(s);
  }

  // =========================================================
  // Helpers
  // =========================================================
  function safeUrl(u){
    try{
      const s=String(u||"").trim();
      if(!s) return "";
      const url=new URL(s, location.origin);
      if(/^javascript:/i.test(url.href)) return "";
      return url.href;
    }catch{ return ""; }
  }

  function normalizeLang(l){
    const s=String(l||"").trim().toLowerCase();
    return (s ? (s.split("-")[0] || CFG.DEFAULT_LANG) : CFG.DEFAULT_LANG);
  }

  function getFinalLang(){
    const byQP=(qp("lang")||"").trim();
    const byAttr=document.body?.getAttribute("data-lang") || document.documentElement?.getAttribute("data-lang") || "";
    const byHtml=document.documentElement?.lang || "";
    return normalizeLang(byQP || byAttr || byHtml || CFG.DEFAULT_LANG);
  }

  function labels(lang){
    const L=normalizeLang(lang);
    return CFG.LABELS[L] || CFG.LABELS.en;
  }

  function slugFromPath(){
    const p=location.pathname.replace(/\/+$/, "");
    const parts=p.split("/").filter(Boolean);
    const idx=parts.findIndex(x => x === CFG.JOB_SEGMENT);
    if(idx>=0 && parts[idx+1]) return parts[idx+1];
    return parts[parts.length-1] || "";
  }

  function readIpCache(){
    try{
      const raw=localStorage.getItem(CFG.STORAGE_IP_KEY);
      if(!raw) return null;
      const obj=JSON.parse(raw);
      if(!obj?.ts) return null;
      if(Date.now() - obj.ts > CFG.IP_TTL_MS) return null;
      return obj.data || null;
    }catch{ return null; }
  }

  function writeIpCache(data){
    try{ localStorage.setItem(CFG.STORAGE_IP_KEY, JSON.stringify({ts:Date.now(), data})); }catch{}
  }

  async function getCountryISO(){
    const forced=(qp("country")||"").trim();
    if(forced) return forced.toUpperCase();

    const cached=readIpCache();
    if(cached?.country) return String(cached.country).toUpperCase();

    try{
      const url=`https://ipinfo.io/json?token=${encodeURIComponent(CFG.IPINFO_TOKEN)}`;
      const r=await fetch(url,{method:"GET"});
      const j=await r.json().catch(()=>null);
      if(j?.country) writeIpCache(j);
      return String(j?.country || "FR").toUpperCase();
    }catch{
      return "FR";
    }
  }

  async function preloadImage(url){
    return new Promise((resolve)=>{
      const u=safeUrl(url);
      if(!u) return resolve(false);
      const img=new Image();
      img.onload=()=>resolve(true);
      img.onerror=()=>resolve(false);
      img.src=u;
    });
  }

  // =========================================================
  // CMS payload (reads all [data-ul-f] anywhere)
  // =========================================================
  function readCmsPayload(){
    const nodes = Array.from(document.querySelectorAll("[data-ul-f]"))
      .filter(n => !n.closest("#ulydia-metier-root")); // don't read our injected block
    if(!nodes.length) return null;

    const out={};
    nodes.forEach(n=>{
      const key=(n.getAttribute("data-ul-f")||"").trim();
      if(!key) return;
      const txt=(n.textContent||"").trim();
      if(!txt || txt==="-" || txt==="—") return;
      if(out[key]===undefined) out[key]=txt;
      else if(Array.isArray(out[key])) out[key].push(txt);
      else out[key]=[out[key], txt];
    });

    if(DEBUG) log("CMS keys", Object.keys(out));
    return out;
  }

  // simple mapping for hero text
  function cmsPick(cms, candidates){
    if(!cms) return "";
    for(const k of candidates){
      if(cms[k]) return String(cms[k]).trim();
    }
    // try fuzzy
    const keys=Object.keys(cms);
    const norm=(s)=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    for(const k of keys){
      const nk=norm(k);
      if(candidates.some(c => nk.includes(norm(c)))) {
        const v=String(cms[k]||"").trim();
        if(v) return v;
      }
    }
    return "";
  }

  // =========================================================
  // Worker
  // =========================================================
  async function postWorker(path, payload){
    const url = `${apiBase()}${path}`;
    const r = await fetch(url, {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-proxy-secret": CFG.PROXY_SECRET
      },
      body: JSON.stringify(payload || {})
    });
    const text = await r.text();
    let json=null;
    try{ json=JSON.parse(text); }catch{}
    if(!r.ok){
      const msg=json?.error || json?.message || text || `HTTP ${r.status}`;
      const e=new Error(msg);
      e.status=r.status;
      e.payload=json;
      throw e;
    }
    return json;
  }

  async function fetchSponsorInfo({ slug, country, lang }){
    // ✅ your worker expects: metier + country (your console said Missing metier/country)
    const payload = {
      metier: slug,
      country,
      lang,

      // also send variants (doesn't hurt)
      metier_slug: slug,
      slug,
      iso: country,
      finalLang: lang,
    };

    try{
      const j = await postWorker("/sponsor-info", payload);
      return j && typeof j === "object" ? j : null;
    }catch(e){
      log("sponsor-info failed:", e?.message || e);
      return null;
    }
  }

  // =========================================================
  // House banners (override via body attrs)
  // =========================================================
function readCountryBannersFromCMS() {
  const root = document.getElementById("countriesData");
  if (!root) return null;

  const items = Array.from(root.querySelectorAll("[data-ul-country-item], .w-dyn-item, .w-dyn-items > *"));
  if (!items.length) return null;

  const out = [];
  for (const it of items) {
    const isoEl = it.querySelector('[data-ul-country="iso"]');
    const iso = (isoEl?.textContent || "").trim().toUpperCase();
    if (!iso) continue;

    const wideImg = it.querySelector('[data-ul-country="banner_wide"]');
    const sqImg   = it.querySelector('[data-ul-country="banner_square"]');

    const wide = safeUrl(wideImg?.getAttribute("src") || "");
    const square = safeUrl(sqImg?.getAttribute("src") || "");

    const langEl = it.querySelector('[data-ul-country="lang"]');
    const lang = (langEl?.textContent || "").trim().toLowerCase();

    out.push({ iso, wide, square, lang });
  }
  return out.length ? out : null;
}

function pickCountryBanner(countryISO, kind /* "wide"|"square" */) {
  const list = readCountryBannersFromCMS();
  if (!list) return "";

  const iso = String(countryISO || "").trim().toUpperCase();
  const row = list.find(x => x.iso === iso);
  if (!row) return "";

  return kind === "wide" ? (row.wide || "") : (row.square || "");
}

function pickFinalLangFromCountry(countryISO) {
  const list = readCountryBannersFromCMS();
  if (!list) return "";
  const iso = String(countryISO || "").trim().toUpperCase();
  const row = list.find(x => x.iso === iso);
  return row?.lang ? normalizeLang(row.lang) : "";
}

// ✅ Remplace tes fonctions existantes :
function getHouseBannerUrl(kind, lang, countryISO) {
  // 1) priorité au Pays (par ISO)
  const byCountry = pickCountryBanner(countryISO, kind);
  if (byCountry) return byCountry;

  // 2) fallback legacy: body attrs (si tu en as)
  const L = normalizeLang(lang);
  const byBody = document.body?.getAttribute(`data-ul-house-${kind}-${L}`) || "";
  const byHtml  = document.documentElement?.getAttribute(`data-ul-house-${kind}-${L}`) || "";
  if (byBody) return safeUrl(byBody);
  if (byHtml) return safeUrl(byHtml);

  // 3) fallback ultime: CFG.HOUSE_BANNERS
  const pack = CFG.HOUSE_BANNERS[L] || CFG.HOUSE_BANNERS.en;
  return safeUrl(pack?.[kind] || "");
}

function getHouseLink(lang){
  const L = normalizeLang(lang);
  const pack = CFG.HOUSE_BANNERS[L] || CFG.HOUSE_BANNERS.en;
  return safeUrl(pack?.link || "/sponsorship");
}


  // =========================================================
  // Render HERO only
  // =========================================================
  function ensureRoot(){
    let root=document.getElementById("ulydia-metier-root");
    if(!root){
      root=document.createElement("div");
      root.id="ulydia-metier-root";
      // insert near top
      document.body.prepend(root);
    }
    return root;
  }

  function setBanner(anchor, imgUrl, link, external, badgeText){
    if(!anchor) return;
    const img=anchor.querySelector("img");
    const href=safeUrl(link);

    if(href){
      anchor.href=href;
      anchor.target=external ? "_blank" : "_self";
      anchor.rel=external ? "noopener" : "";
      anchor.style.pointerEvents="auto";
    }else{
      anchor.removeAttribute("href");
      anchor.style.pointerEvents="none";
    }

    const url=safeUrl(imgUrl);
    if(url){
      anchor.classList.remove("ul-fallback");
      if(img){
        img.style.display="block";
        img.style.opacity="1";
        img.setAttribute("src", url);
      }
    }else{
      // CSP-safe fallback
      anchor.classList.add("ul-fallback");
      if(img){
        img.removeAttribute("src");
        img.style.opacity="0";
      }
    }

    // badge
    if(badgeText){
      let badge=anchor.querySelector(".ul-badge");
      if(!badge){
        badge=document.createElement("div");
        badge.className="ul-badge";
        badge.innerHTML=`<span class="ul-dot"></span><span></span>`;
        anchor.appendChild(badge);
      }
      badge.querySelector("span:last-child").textContent = badgeText;
    }else{
      anchor.querySelector(".ul-badge")?.remove();
    }
  }

function placeRootAndHideLegacy() {
  // 1) Ensure root exists
  const root = ensureRoot();

  // 2) Try to find a good insertion point (your code embed block OR banner block)
  // We'll use the FIRST element that matches one of these selectors.
  const anchor =
    document.querySelector("#ul_legacy_metier_hero") ||
    document.querySelector(".metier-banners") ||
    document.querySelector("[data-ul-anchor='metier-hero']") ||
    null;

  // If legacy hero wrapper exists, hide it (safe)
  const legacy = document.getElementById("ul_legacy_metier_hero");
  if (legacy) legacy.style.display = "none";

  // If we have an anchor and root isn't right after it, move it right after anchor
  if (anchor) {
    const parent = anchor.parentElement;
    if (parent) {
      // insert root after anchor
      if (anchor.nextElementSibling !== root) {
        parent.insertBefore(root, anchor.nextElementSibling);
      }
    }
  } else {
    // As a fallback, move root to top under header
    const header = document.querySelector("header") || document.querySelector(".w-nav") || null;
    if (header && header.parentElement) {
      header.parentElement.insertBefore(root, header.nextElementSibling);
    } else {
      // last fallback: body top
      document.body.prepend(root);
    }
  }

  // Mark HTML (optional)
  document.documentElement.setAttribute("data-ul-metier-v4", "1");

  if (DEBUG) log("root placed", {
    legacyFound: !!legacy,
    anchorFound: !!anchor,
    rootTop: root.getBoundingClientRect().top
  });
}





  function renderHero({ title, categoryLine, shortIntro, sponsored, sponsorName, sponsorLink, wideUrl, squareUrl, houseLink, ctaText }){
    const root=ensureRoot();
    root.innerHTML = `
      <div class="ul-hero-wrap">
        <div class="ul-hero">
          <div class="ul-card ul-pad">
            <h1 class="ul-title">${escapeHtml(title || "")}</h1>
            ${categoryLine ? `<div class="ul-sub">${escapeHtml(categoryLine)}</div>` : ``}
            ${shortIntro ? `<div class="ul-desc">${escapeHtml(shortIntro)}</div>` : ``}
          </div>

          <div class="ul-banners">
            <a class="ul-banner ul-wide" aria-label="banner-wide"><img alt=""></a>
            <a class="ul-banner ul-square" aria-label="banner-square"><img alt=""></a>
          </div>
        </div>
      </div>
    `;

    const wideA = root.querySelector('.ul-wide');
    const sqA   = root.querySelector('.ul-square');

    if(sponsored){
      setBanner(wideA, wideUrl, sponsorLink, true, sponsorName ? sponsorName : null);
      setBanner(sqA,   squareUrl, sponsorLink, true, null);
    }else{
      setBanner(wideA, wideUrl, houseLink, false, ctaText);
      setBanner(sqA,   squareUrl, houseLink, false, null);
    }
  }

  function escapeHtml(s){
    return String(s||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // =========================================================
  // MAIN
  // =========================================================
  async function main(){
    injectCSS();

    function autoHideLegacyHero(){
    // on repère une section connue du legacy
    const marker =
        document.querySelector("#Sponsorise, #NonSponsorise") || // si tu as des IDs
        Array.from(document.querySelectorAll("section, div")).find(el =>
        (el.textContent || "").trim().toLowerCase() === "sponsorisé" ||
        (el.textContent || "").trim().toLowerCase() === "non sponsorisé"
        );

    if (!marker) return;

    // le hero est généralement le bloc juste avant les sections sponsor
    const candidate = marker.closest("section, div")?.previousElementSibling;
    if (candidate) candidate.style.display = "none";
    }

// dans main():
autoHideLegacyHero();


    placeRootAndHideLegacy();

    document.documentElement.setAttribute("data-ul-metier-v4","1");

    const slug = slugFromPath();
    const finalLang = getFinalLang();
    const country = await getCountryISO();
    const t = labels(finalLang);

    log("ctx", { slug, finalLang, country });

    // CMS hero data (from your existing page)
    const cms = readCmsPayload();
    const cmsTitle = cmsPick(cms, ["metier_title","title","nom_metier","metier","job_title","name"]);
    const cmsCat   = cmsPick(cms, ["categorie","category","secteur","sector"]);
    const cmsIntro = cmsPick(cms, ["intro","short_intro","resume","summary","accroche"]);

    // Worker sponsor
    const s = await fetchSponsorInfo({ slug, country, lang: finalLang }) || {};
    const sponsored = !!(s.sponsored || s.is_sponsored);
    const sponsor = s.sponsor || s.sponsorship?.sponsor || s.partner || null;

    const sponsorName = (sponsor?.name || sponsor?.company || "").trim();
    const sponsorLink = safeUrl(sponsor?.link || "");

    // banner urls
    let wideUrl = "", squareUrl = "", link = "";

    if(sponsored){
    // si tu veux que la "langue finale" vienne aussi du Pays:
    const langFromCountry = pickFinalLangFromCountry(country);
    const effectiveLang = langFromCountry || finalLang;

    wideUrl = getHouseBannerUrl("wide", effectiveLang, country);
    squareUrl = getHouseBannerUrl("square", effectiveLang, country);
    link = getHouseLink(effectiveLang);

      link = sponsorLink;
      await Promise.all([preloadImage(wideUrl), preloadImage(squareUrl)]);
    }else{
      wideUrl = getHouseBannerUrl("wide", finalLang);
      squareUrl = getHouseBannerUrl("square", finalLang);
      link = getHouseLink(finalLang);
      await Promise.all([preloadImage(wideUrl), preloadImage(squareUrl)]);
    }

    // Title fallback
    const title = (cmsTitle || "").trim() || slug.replaceAll("-", " ").toUpperCase();

    // Render hero (ONLY)
    renderHero({
      title,
      categoryLine: cmsCat || "",
      shortIntro: cmsIntro || "",
      sponsored,
      sponsorName: sponsored ? `${t.sponsored_by}${sponsorName ? `: ${sponsorName}` : ""}` : "",
      sponsorLink: link,
      wideUrl,
      squareUrl,
      houseLink: link,
      ctaText: t.sponsor_cta
    });

    log("ready", { sponsored, mode: sponsored ? "sponsor" : "house", wide: !!wideUrl, square: !!squareUrl });
  }

  // Run after DOM ready (safe with Webflow)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => main().catch(e => console.error("[metier-page] fatal", e)));
  } else {
    main().catch(e => console.error("[metier-page] fatal", e));
  }

})();
