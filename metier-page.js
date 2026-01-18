/* /mnt/data/metier-page.js — Ulydia Metier Page v5.2 */
(() => {
  // ============================================================================
  // Ulydia — Metier Page (Full-code) v5.2
  // - Dashboard-like modern layout
  // - Handles Sponsor vs Non-sponsor banners
  // - Non-sponsor banners sourced from hidden Webflow CMS lists (#countriesData, #countriesData2...)
  // - Uses visitor ISO -> FINAL language (from countriesData row if available)
  // - Robust to Webflow lazy images (src/data-src/srcset/background-image)
  // ============================================================================

  // Kill switches so legacy scripts won't interfere
  window.__ULYDIA_METIER_PAGE__ = true;
  window.__ULYDIA_METIER_SPONSOR_BRIDGE__ = true;
  window.__ULYDIA_METIER_SPONSOR_FINAL__ = true;

  if (window.__ULYDIA_METIER_PAGE_V52__) return;
  window.__ULYDIA_METIER_PAGE_V52__ = true;

  const VERSION = "v5.2";

  // Debug flag (set in Webflow HEAD if you want): window.__METIER_PAGE_DEBUG__ = true;
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // ============================================================================
  // CONFIG
  // ============================================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const SPONSOR_ENDPOINT = "/sponsor-info";

  // If you want shell-mode (hide existing Webflow content), add:
  // <div id="ulydia-metier-root" data-shell="1"></div>
  const ROOT_ID = "ulydia-metier-root";

  // CountriesData can be split into multiple hidden blocks because of Webflow 100-item limit
  const COUNTRIES_DATA_IDS = ["countriesData", "countriesData2", "countriesData3"];

  // Fallback sponsor CTA
  const DEFAULT_SPONSOR_URL = "/sponsor";

  // Anti-flash class (compatible with your existing CSS)
  const LOCK_CLASS = "ul-sponsor-loading";

  // ============================================================================
  // Helpers
  // ============================================================================
  const normIso = (v) => String(v || "").toUpperCase().replace(/[^A-Z]/g, "");
  const normLang = (v) => String(v || "").toLowerCase().split("-")[0];

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function addLock(){ document.documentElement.classList.add(LOCK_CLASS); }
  function removeLock(){ document.documentElement.classList.remove(LOCK_CLASS); }

  function qp(name){
    return new URLSearchParams(location.search).get(name);
  }

  function findMetierSlug(){
    // You can add [data-metier="slug"] on page if needed
    const dm = document.querySelector("[data-metier]")?.getAttribute("data-metier");
    if (dm) return dm.trim();
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function getWorkerUrl(path){
    return WORKER_URL.replace(/\/$/, "") + path;
  }

  function safeJsonParse(s){
    try { return JSON.parse(s); } catch { return null; }
  }

  function firstUrlFromSrcset(srcset){
    // "url1 500w, url2 800w" -> url1
    const p = String(srcset || "").split(",")[0]?.trim() || "";
    return p.split(" ")[0]?.trim() || "";
  }

  function getImgSrcFromEl(el){
    if (!el) return "";
    // If element is <img>
    if (el.tagName === "IMG") {
      return (
        el.getAttribute("src") ||
        el.getAttribute("data-src") ||
        firstUrlFromSrcset(el.getAttribute("srcset")) ||
        ""
      ).trim();
    }
    // If element contains an <img>
    const img = el.querySelector("img");
    if (img) {
      return (
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        firstUrlFromSrcset(img.getAttribute("srcset")) ||
        ""
      ).trim();
    }
    // If element is a div with background-image
    const bg = getComputedStyle(el).backgroundImage || "";
    const m = bg.match(/url\((['"]?)(.*?)\1\)/i);
    if (m && m[2]) return m[2].trim();
    return "";
  }

  async function waitForAnyImgSrc(container, timeoutMs=2500){
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const imgs = Array.from(container.querySelectorAll("img"));
      for (const img of imgs) {
        const src = (img.getAttribute("src") || img.getAttribute("data-src") || "").trim();
        if (src) return src;
      }
      await sleep(80);
    }
    return "";
  }

  function ensureRoot(){
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      document.body.prepend(root);
      log("root auto-created");
    }
    return root;
  }

  function maybeHideLegacyContent(root){
    const shell = root?.getAttribute("data-shell") === "1";
    if (!shell) return;
    // Hide everything except our root
    const style = document.createElement("style");
    style.id = "ul_metier_shell_hide";
    style.textContent = `
      body > *:not(#${ROOT_ID}){ display:none !important; }
      #${ROOT_ID}{ display:block !important; }
    `;
    document.head.appendChild(style);
  }

  // ============================================================================
  // CountriesData reading (robust)
  // Webflow renders .w-dyn-item and often injects useful attributes on it:
  //   data-iso="FR" data-banner-text="..." data-banner-cta="..."
  // Images are typically inside as <img> elements (2 images: wide + square)
  // ============================================================================
  function getCountriesRoots(){
    const roots = [];
    for (const id of COUNTRIES_DATA_IDS) {
      const el = document.getElementById(id);
      if (el) roots.push(el);
    }
    // Also allow: <div data-countriesdata> as an alternative
    document.querySelectorAll("[data-countriesdata]").forEach(el => roots.push(el));
    // Unique
    return Array.from(new Set(roots));
  }

  function getAllCountryItems(roots){
    const items = [];
    for (const r of roots) {
      // webflow: .w-dyn-item, or role=listitem
      const found = r.querySelectorAll(".w-dyn-item, [role='listitem']");
      found.forEach(it => items.push(it));
    }
    return items;
  }

  function getItemIso(it){
    const a = it.getAttribute("data-iso");
    if (a) return normIso(a);
    // fallback: try text in known nodes
    const isoTxt = it.querySelector(".iso-code, [data-role='iso']")?.textContent || "";
    return normIso(isoTxt);
  }

  function getItemLang(it){
    // You DO have data-role="lang" on the lang element
    const el = it.querySelector("[data-role='lang']") || it.querySelector(".lang-code");
    const txt = (el?.textContent || "").trim();
    return normLang(txt);
  }

  function getItemBannerText(it){
    const v = it.getAttribute("data-banner-text");
    if (v != null) return String(v || "");
    // fallback
    const el = it.querySelector("[data-role='text'], .banner-text");
    return (el?.textContent || "").trim();
  }

  function getItemBannerCta(it){
    const v = it.getAttribute("data-banner-cta");
    if (v != null) return String(v || "");
    // fallback
    const el = it.querySelector("[data-role='cta'], .banner-cta");
    return (el?.textContent || "").trim();
  }

  async function getItemBannerImages(it){
    // Try direct <img> order (wide first, square second)
    const imgs = Array.from(it.querySelectorAll("img"));
    let wide = "";
    let square = "";

    if (imgs.length >= 1) wide = getImgSrcFromEl(imgs[0]);
    if (imgs.length >= 2) square = getImgSrcFromEl(imgs[1]);

    // If lazy, wait a bit
    if (!wide && imgs[0]) {
      wide = await waitForAnyImgSrc(it, 2500);
    }

    // If still empty, try background-image nodes
    if (!wide || !square) {
      const nodes = Array.from(it.querySelectorAll("*"));
      const bgUrls = nodes.map(n => getImgSrcFromEl(n)).filter(Boolean);
      if (!wide && bgUrls[0]) wide = bgUrls[0];
      if (!square && bgUrls[1]) square = bgUrls[1];
    }

    return { wide, square };
  }

  async function findCountryRowByIso(iso){
    const roots = getCountriesRoots();
    const items = getAllCountryItems(roots);

    const key = normIso(iso);
    for (const it of items) {
      const itemIso = getItemIso(it);
      if (itemIso !== key) continue;

      const lang = getItemLang(it);
      const text = getItemBannerText(it);
      const cta = getItemBannerCta(it);
      const { wide, square } = await getItemBannerImages(it);

      return { iso: key, lang, text, cta, wide, square, _node: it };
    }
    return null;
  }

  // ============================================================================
  // Sponsor fetch
  // ============================================================================
  async function fetchSponsorInfo({ metier, country, lang }){
    const url = getWorkerUrl(SPONSOR_ENDPOINT);
    const body = { metier, country, lang };

    log("fetchSponsorInfo", url, body);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": PROXY_SECRET
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json;
  }

  // Normalize payload keys (in case your worker uses different field names)
  function parseSponsorPayload(payload){
    if (!payload) return { sponsored:false };

    const sponsored = !!payload.sponsored;

    // Common possibilities from your conventions:
    // - sponsor_logo_1 (SQUARE) / sponsor_logo_2 (LANDSCAPE)
    // - sponsor_url (click-through)
    const square = payload.sponsor_logo_1 || payload.logo_1 || payload.square || payload.banner_square || "";
    const wide   = payload.sponsor_logo_2 || payload.logo_2 || payload.wide   || payload.banner_wide   || "";
    const url    = payload.sponsor_url || payload.url || payload.link || "";

    // Optional display text
    const name = payload.sponsor_name || payload.company_name || payload.name || "";

    return { sponsored, wide, square, url, name, raw: payload };
  }

  // ============================================================================
  // UI (modern dashboard-like)
  // ============================================================================
  function injectCss(){
    if (document.getElementById("ul_metier_css_v52")) return;
    const style = document.createElement("style");
    style.id = "ul_metier_css_v52";
    style.textContent = `
      :root{
        --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
        --ul-bg: #0b1020;
        --ul-card: rgba(255,255,255,0.08);
        --ul-border: rgba(255,255,255,0.12);
        --ul-text: rgba(255,255,255,0.92);
        --ul-muted: rgba(255,255,255,0.68);
        --ul-blue: #646cfd;
        --ul-shadow: 0 20px 60px rgba(0,0,0,.35);
        --ul-radius: 18px;
      }

      #${ROOT_ID}{
        font-family: var(--ul-font);
        color: var(--ul-text);
      }

      .ul-wrap{
        max-width: 1120px;
        margin: 0 auto;
        padding: 24px 18px 90px;
      }

      .ul-top{
        display:flex; align-items:center; justify-content:space-between;
        gap: 16px;
        padding: 14px 0 20px;
      }
      .ul-brand{ display:flex; align-items:center; gap: 12px; }
      .ul-brand img{ width: 56px; height:auto; }
      .ul-brand .ul-brand-title{ font-weight: 800; letter-spacing: .4px; }

      .ul-actions{ display:flex; align-items:center; gap: 10px; flex-wrap:wrap; }
      .ul-actions a{
        text-decoration:none;
        color: #0b1020;
        background: rgba(255,255,255,0.92);
        border: 1px solid rgba(255,255,255,0.18);
        padding: 10px 14px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 14px;
      }
      .ul-actions a.ul-ghost{
        background: transparent;
        color: rgba(255,255,255,0.92);
      }

      .ul-hero{
        background: radial-gradient(1200px 420px at 20% 0%, rgba(100,108,253,0.35), transparent 60%),
                    radial-gradient(900px 360px at 80% 20%, rgba(61,63,109,0.55), transparent 60%),
                    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
        border: 1px solid var(--ul-border);
        border-radius: calc(var(--ul-radius) + 6px);
        box-shadow: var(--ul-shadow);
        overflow:hidden;
      }
      .ul-hero-inner{
        padding: 28px 22px 20px;
      }
      .ul-h1{
        margin: 0;
        font-size: clamp(28px, 4vw, 48px);
        font-weight: 900;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .ul-sub{
        margin: 8px 0 0;
        color: var(--ul-muted);
        font-weight: 700;
      }

      .ul-banner{
        margin-top: 18px;
        display:grid;
        grid-template-columns: 1fr 320px;
        gap: 14px;
        align-items: stretch;
      }
      @media (max-width: 900px){
        .ul-banner{ grid-template-columns: 1fr; }
      }

      .ul-banner-wide{
        border: 1px solid var(--ul-border);
        border-radius: var(--ul-radius);
        overflow:hidden;
        background: rgba(0,0,0,0.25);
        min-height: 160px;
        display:flex;
      }
      .ul-banner-wide img{
        width:100%;
        height:100%;
        object-fit: cover;
        display:block;
      }

      .ul-banner-card{
        border: 1px solid var(--ul-border);
        border-radius: var(--ul-radius);
        background: var(--ul-card);
        padding: 14px;
        display:flex;
        flex-direction:column;
        gap: 10px;
      }
      .ul-banner-square{
        border-radius: 14px;
        overflow:hidden;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(0,0,0,0.25);
        height: 140px;
      }
      .ul-banner-square img{
        width:100%;
        height:100%;
        object-fit: cover;
        display:block;
      }
      .ul-banner-text{
        color: rgba(255,255,255,0.86);
        font-weight: 700;
        line-height: 1.25;
      }
      .ul-banner-cta{
        display:inline-flex;
        align-self:flex-start;
        gap: 8px;
        align-items:center;
        background: rgba(100,108,253,0.95);
        color: white;
        border: 1px solid rgba(255,255,255,0.20);
        border-radius: 999px;
        padding: 10px 12px;
        font-weight: 900;
        font-size: 13px;
        text-decoration:none;
      }

      .ul-grid{
        display:grid;
        grid-template-columns: 1fr;
        gap: 14px;
        margin-top: 18px;
      }
      .ul-card{
        border: 1px solid var(--ul-border);
        border-radius: var(--ul-radius);
        background: rgba(255,255,255,0.05);
        box-shadow: 0 10px 30px rgba(0,0,0,.22);
        padding: 18px 18px;
      }
      .ul-card h2{
        margin: 0 0 8px;
        font-size: 18px;
        letter-spacing: .6px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.92);
      }
      .ul-card .ul-body{
        color: rgba(255,255,255,0.78);
        line-height: 1.6;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(s){
    return String(s || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function pickTextFromPage(selectorList){
    for (const sel of selectorList) {
      const el = document.querySelector(sel);
      const t = el?.textContent?.trim();
      if (t) return t;
    }
    return "";
  }

  // ============================================================================
  // Render
  // ============================================================================
  function renderBase(root, { title, subtitle }){
    root.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-top">
          <div class="ul-brand">
            <img src="https://cdn.prod.website-files.com/6942b6d9dc4d5a360322b0dd/6942b6d9dc4d5a360322b0dd_logo.png" alt="Ulydia" onerror="this.style.display='none'">
            <div class="ul-brand-title">ULYDIA</div>
          </div>
          <div class="ul-actions">
            <a class="ul-ghost" href="/sponsor">Sponsor</a>
            <a class="ul-ghost" href="/my-account">Dashboard</a>
            <a class="ul-ghost" href="/logout">Log out</a>
          </div>
        </div>

        <div class="ul-hero">
          <div class="ul-hero-inner">
            <h1 class="ul-h1">${escapeHtml(title || "")}</h1>
            <div class="ul-sub">${escapeHtml(subtitle || "")}</div>

            <div id="ul_banner_zone" class="ul-banner" aria-live="polite"></div>
          </div>
        </div>

        <div class="ul-grid" id="ul_content_zone"></div>
      </div>
    `;
  }

  function renderBanner({ wideUrl, squareUrl, text, cta, linkUrl }){
    const zone = document.getElementById("ul_banner_zone");
    if (!zone) return;

    const safeLink = linkUrl || DEFAULT_SPONSOR_URL;
    const safeText = text || "";
    const safeCta  = cta || "Sponsoriser";

    zone.innerHTML = `
      <a class="ul-banner-wide" href="${safeLink}">
        ${wideUrl ? `<img src="${wideUrl}" alt="banner">` : ``}
      </a>

      <div class="ul-banner-card">
        <a class="ul-banner-square" href="${safeLink}">
          ${squareUrl ? `<img src="${squareUrl}" alt="banner">` : ``}
        </a>
        ${safeText ? `<div class="ul-banner-text">${escapeHtml(safeText)}</div>` : ``}
        <a class="ul-banner-cta" href="${safeLink}">${escapeHtml(safeCta)}</a>
      </div>
    `;
  }

  function renderContentCards(){
    const zone = document.getElementById("ul_content_zone");
    if (!zone) return;

    // Try to reuse existing Webflow content so you never get an empty page.
    const descriptionHtml =
      document.querySelector("#Description, [data-section='description'], .metier-description")?.innerHTML ||
      document.querySelector("main")?.innerHTML ||
      "";

    // If we found nothing, show a safe placeholder.
    if (!descriptionHtml) {
      zone.innerHTML = `
        <div class="ul-card">
          <h2>Content</h2>
          <div class="ul-body">Contenu indisponible (vérifie tes champs CMS).</div>
        </div>
      `;
      return;
    }

    zone.innerHTML = `
      <div class="ul-card">
        <h2>Description</h2>
        <div class="ul-body">${descriptionHtml}</div>
      </div>
    `;
  }

  // ============================================================================
  // Main
  // ============================================================================
  (async () => {
    addLock();
    injectCss();

    const root = ensureRoot();
    maybeHideLegacyContent(root);

    const metier = findMetierSlug();
    const title = pickTextFromPage(["h1", ".h1", "[data-title]"]) || metier.toUpperCase();
    const subtitle = pickTextFromPage([".metier-category", ".metier-subtitle", "h2"]) || "";

    renderBase(root, { title, subtitle });

    // Wait for VISITOR_* from your global footer (up to 4s)
    let geo = {
      country: normIso(window.VISITOR_COUNTRY) || normIso(qp("country")) || "US",
      lang: normLang(window.VISITOR_LANG) || normLang(qp("lang")) || "en",
    };

    for (let i=0; i<40; i++){
      if (window.VISITOR_COUNTRY) {
        geo.country = normIso(window.VISITOR_COUNTRY) || geo.country;
        geo.lang = normLang(window.VISITOR_LANG) || geo.lang;
        break;
      }
      await sleep(100);
    }

    log("version", VERSION);
    log("geo", geo);

    // CountriesData diagnostics
    const roots = getCountriesRoots();
    const items = getAllCountryItems(roots);
    log("countriesData roots", roots.map(r => r.id || r.getAttribute("data-countriesdata") || "node"));
    log("countriesData rows", items.length);

    // Find country row (may fail if Webflow list limited to 100 and FR missing)
    const countriesRow = await findCountryRowByIso(geo.country);
    if (!countriesRow) {
      log(`no countriesData row for ${geo.country} (likely Webflow list limit 100 — split list into #countriesData2 and #countriesData3)`);
    }

    const finalLang = countriesRow?.lang || geo.lang || "en";

    // Fetch sponsor
    let sponsorJson = null;
    try {
      sponsorJson = await fetchSponsorInfo({ metier, country: geo.country, lang: finalLang });
    } catch(e){
      sponsorJson = null;
    }

    const sponsor = parseSponsorPayload(sponsorJson);
    const sponsored = !!sponsor.sponsored;

    // Decide banner data
    let bannerWide = "";
    let bannerSquare = "";
    let bannerLink = "";
    let bannerText = "";
    let bannerCta  = "";

    if (sponsored && (sponsor.wide || sponsor.square)) {
      // Sponsored banner from worker payload
      bannerWide   = sponsor.wide || "";
      bannerSquare = sponsor.square || "";
      bannerLink   = sponsor.url || "";
      bannerText   = sponsor.name ? `Sponsored by ${sponsor.name}` : "";
      bannerCta    = "Visit sponsor";
    } else {
      // Non-sponsored banner from countriesData (fallback if missing)
      bannerWide   = countriesRow?.wide || "";
      bannerSquare = countriesRow?.square || "";
      bannerText   = countriesRow?.text || "";
      bannerCta    = countriesRow?.cta || "Sponsoriser cette fiche";
      bannerLink   = `${DEFAULT_SPONSOR_URL}?metier=${encodeURIComponent(metier)}&country=${encodeURIComponent(geo.country)}&lang=${encodeURIComponent(finalLang)}`;
    }

    renderBanner({
      wideUrl: bannerWide,
      squareUrl: bannerSquare,
      text: bannerText,
      cta: bannerCta,
      linkUrl: bannerLink
    });

    renderContentCards();

    // Emit single canonical event (so other modules can hook)
    window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
      detail: { sponsored, payload: sponsorJson || null, metier, geo: { ...geo, lang: finalLang }, countriesRow: countriesRow || null }
    }));

    removeLock();
    log("done", { sponsored, finalLang, bannerWide: !!bannerWide, bannerSquare: !!bannerSquare });

  })().catch((e) => {
    console.error("[metier-page] fatal", e);
    removeLock();
  });

})();
