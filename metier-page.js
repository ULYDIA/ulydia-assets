(() => {
  // ============================================================================
  // Ulydia — Metier Page (Full-code) v5.0
  // - Modern layout (dashboard-like)
  // - Sponsor vs non-sponsor banners
  // - Non-sponsor banners sourced from hidden #countriesData (Webflow CMS)
  // - Uses FINAL language from countriesData for the visitor ISO (NOT browser lang)
  // - Robust to Webflow changes: reads attrs on .w-dyn-item (data-iso, data-banner-*)
  //   and/or inner nodes (.iso-code/.lang-code/.banner-img-1/.banner-img-2)
  // ============================================================================

  if (window.__ULYDIA_METIER_PAGE__) return;
  window.__ULYDIA_METIER_PAGE__ = true;

  const VERSION = "v5.0";
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================
  // CONFIG
  // =========================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const SPONSOR_INFO_ENDPOINT = "/sponsor-info";

  // sponsor payload conventions (try many keys)
  const SPONSOR_WIDE_KEYS   = ["banner_wide","bannerWide","wide","sponsor_banner_wide","sponsor_banner_landscape","sponsor_logo_2","sponsorLogo2","logo_2","logo2","sponsor_logo2"];
  const SPONSOR_SQUARE_KEYS = ["banner_square","bannerSquare","square","sponsor_banner_square","sponsor_logo_1","sponsorLogo1","logo_1","logo1","sponsor_logo1"];
  const SPONSOR_URL_KEYS    = ["url","link","sponsor_url","sponsorUrl","website","href"];

  // Where to mount
  const ROOT_ID = "ulydia-metier-root";

  // Optional: keep these nodes visible even in shell mode
  const KEEP_IDS = new Set(["countriesData", ROOT_ID]);

  // =========================
  // Utilities
  // =========================
  const normIso = v => String(v || "").toUpperCase().replace(/[^A-Z]/g, "");
  const normLang = v => String(v || "").toLowerCase().split("-")[0];

  function pickFirst(obj, keys){
    for (const k of keys){
      const v = obj && obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  }

  function pickUrl(raw){
    const s = String(raw || "").trim();
    if (!s) return "";
    // If Webflow gave us url("...")
    const m = s.match(/url\((['"]?)(.*?)\1\)/i);
    if (m && m[2]) return m[2].trim();
    return s;
  }

  function ensureRoot(){
    let el = document.getElementById(ROOT_ID);
    if (!el){
      el = document.createElement("div");
      el.id = ROOT_ID;
      document.body.prepend(el);
      log("root auto-created");
    }
    return el;
  }

  function injectCss(){
    if (document.getElementById("ul_metier_css_v5")) return;
    const style = document.createElement("style");
    style.id = "ul_metier_css_v5";
    style.textContent = `
      :root{
        --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
        --ul-bg: #070B16;
        --ul-panel: rgba(255,255,255,.06);
        --ul-panel2: rgba(255,255,255,.08);
        --ul-stroke: rgba(255,255,255,.10);
        --ul-text: rgba(255,255,255,.90);
        --ul-muted: rgba(255,255,255,.62);
        --ul-primary: #646cfd;
        --ul-shadow: 0 14px 50px rgba(0,0,0,.45);
        --ul-radius: 18px;
      }

      html.ul-sponsor-loading #${ROOT_ID}{
        opacity: .0;
        transform: translateY(6px);
      }

      #${ROOT_ID}{
        font-family: var(--ul-font);
        color: var(--ul-text);
        background: radial-gradient(1200px 700px at 50% -10%, rgba(100,108,253,.20), transparent 60%),
                    radial-gradient(900px 600px at 80% 10%, rgba(255,255,255,.07), transparent 55%),
                    var(--ul-bg);
        min-height: 100vh;
        padding: 18px 18px 70px;
        transition: opacity .2s ease, transform .2s ease;
      }

      .ul-wrap{ max-width: 1180px; margin: 0 auto; }

      .ul-topbar{
        display:flex; align-items:center; justify-content:space-between;
        padding: 14px 14px;
        border: 1px solid var(--ul-stroke);
        background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
        border-radius: var(--ul-radius);
        box-shadow: var(--ul-shadow);
      }
      .ul-brand{ display:flex; align-items:center; gap:12px; min-width: 180px; }
      .ul-brand img{ width:44px; height:44px; object-fit:contain; }
      .ul-brand .ul-name{ font-weight: 800; letter-spacing:.2px; }
      .ul-nav{ display:flex; gap:14px; flex-wrap:wrap; justify-content:flex-end; }
      .ul-link{
        color: var(--ul-muted);
        text-decoration:none;
        font-weight: 600;
        padding: 10px 12px;
        border-radius: 999px;
        border: 1px solid transparent;
      }
      .ul-link:hover{
        color: var(--ul-text);
        border-color: var(--ul-stroke);
        background: rgba(255,255,255,.05);
      }
      .ul-cta{
        color: white;
        background: rgba(100,108,253,.20);
        border: 1px solid rgba(100,108,253,.35);
      }
      .ul-cta:hover{ background: rgba(100,108,253,.28); }

      .ul-hero{
        margin-top: 16px;
        border: 1px solid var(--ul-stroke);
        border-radius: var(--ul-radius);
        background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
        box-shadow: var(--ul-shadow);
        overflow:hidden;
      }
      .ul-hero-inner{
        padding: 26px 22px 18px;
        display:flex; flex-direction:column; gap:10px;
      }
      .ul-h1{
        font-size: clamp(26px, 3.3vw, 44px);
        line-height: 1.05;
        margin:0;
        font-weight: 900;
        letter-spacing: .3px;
        text-transform: uppercase;
      }
      .ul-sub{
        margin:0;
        color: var(--ul-muted);
        font-weight: 700;
      }
      .ul-desc{
        margin: 6px 0 0;
        color: rgba(255,255,255,.78);
        font-size: 15px;
        line-height: 1.6;
        max-width: 980px;
      }

      .ul-banner{
        display:block;
        text-decoration:none;
        border-top: 1px solid var(--ul-stroke);
        background: rgba(0,0,0,.15);
      }
      .ul-banner img{
        width:100%;
        height:auto;
        display:block;
      }

      .ul-grid{
        display:grid;
        grid-template-columns: 1.6fr .9fr;
        gap: 16px;
        margin-top: 16px;
      }
      @media (max-width: 980px){
        .ul-grid{ grid-template-columns: 1fr; }
      }

      .ul-card{
        border: 1px solid var(--ul-stroke);
        border-radius: var(--ul-radius);
        background: rgba(255,255,255,.05);
        box-shadow: var(--ul-shadow);
        overflow:hidden;
      }
      .ul-card .ul-card-h{
        padding: 14px 16px;
        border-bottom: 1px solid var(--ul-stroke);
        display:flex; align-items:center; justify-content:space-between; gap:12px;
      }
      .ul-card .ul-card-h h2{
        margin:0;
        font-size: 15px;
        text-transform: uppercase;
        letter-spacing: .22px;
      }
      .ul-pill{
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--ul-stroke);
        color: var(--ul-muted);
        background: rgba(255,255,255,.04);
        white-space: nowrap;
      }
      .ul-card .ul-card-b{
        padding: 16px;
        color: rgba(255,255,255,.80);
        line-height: 1.65;
      }

      .ul-square{
        display:flex;
        flex-direction:column;
        gap: 12px;
      }
      .ul-square img{
        width:100%;
        border-radius: 14px;
        border: 1px solid var(--ul-stroke);
        background: rgba(0,0,0,.2);
      }

      .ul-cms-mount{
        /* Where we re-inject existing Webflow content */
      }

      /* Shell mode (optional): hide everything except root + keep ids */
      html.ul-metier-shell body > * { display:none !important; }
      html.ul-metier-shell body > #${ROOT_ID}{ display:block !important; }
      html.ul-metier-shell body > #countriesData{ display:none !important; }
    `;
    document.head.appendChild(style);
  }

  function setShellMode(on){
    // If you want to fully ignore Webflow layout, enable shell mode.
    // We'll keep the old content and then mount it inside our layout anyway.
    document.documentElement.classList.toggle("ul-metier-shell", !!on);
  }

  function findMetierSlug(){
    const dm = document.querySelector("[data-metier]")?.getAttribute("data-metier");
    if (dm) return dm.trim();
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function getVisitorIso(){
    // Uses your global footer variables if present
    return normIso(window.VISITOR_COUNTRY) || normIso(window.__ULYDIA_COUNTRY__) || "US";
  }

  // Read some visible CMS content (best-effort) to populate hero
  function readTitle(){
    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent.trim()) return h1.textContent.trim();
    // fallback: slug
    const slug = findMetierSlug();
    return slug ? slug.replace(/-/g," ").toUpperCase() : "FICHE MÉTIER";
  }

  function readCategory(){
    // you might have a category element under title
    const el = document.querySelector(".metier-category, [data-field='category'], .category, .subtitle");
    const t = el?.textContent?.trim();
    return t || "";
  }

  function readShortDescription(){
    // try an element tagged in Webflow as short intro
    const el = document.querySelector(".metier-intro, .intro, [data-field='intro'], .w-richtext p");
    const t = el?.textContent?.trim();
    if (!t) return "";
    return t.length > 320 ? (t.slice(0, 317) + "...") : t;
  }

  // ----------------------------------------------------------------------------
  // countriesData parsing (robust)
  // ----------------------------------------------------------------------------
  function getCountriesDataRoot(){
    return document.getElementById("countriesData");
  }

  function getItems(root){
    if (!root) return [];
    // Webflow: .w-dyn-item inside list
    const items = Array.from(root.querySelectorAll(".w-dyn-item, [role='listitem']"));
    return items;
  }

  function getTextWithin(el){
    const t = (el?.textContent || "").trim();
    return t;
  }

  function getBgUrl(el){
    if (!el) return "";
    const bg = getComputedStyle(el).backgroundImage || "";
    return pickUrl(bg);
  }

  function getImgUrl(el){
    if (!el) return "";
    if (el.tagName === "IMG"){
      const src = el.getAttribute("src") || "";
      return src.trim();
    }
    const img = el.querySelector("img");
    if (img){
      const src = img.getAttribute("src") || "";
      return src.trim();
    }
    return "";
  }

  function waitForImageSrc(imgEl, timeoutMs = 2500){
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        const src = getImgUrl(imgEl);
        if (src) return resolve(src);
        if ((Date.now() - start) > timeoutMs) return resolve("");
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  function parseCountryRow(item){
    // ISO
    const iso =
      normIso(item.getAttribute("data-iso")) ||
      normIso(item.getAttribute("data-ISO")) ||
      normIso(getTextWithin(item.querySelector(".iso-code"))) ||
      normIso(getTextWithin(item.querySelector("[data-role='iso']")));

    // Lang
    const lang =
      normLang(item.getAttribute("data-lang")) ||
      normLang(getTextWithin(item.querySelector(".lang-code"))) ||
      normLang(getTextWithin(item.querySelector("[data-role='lang']")));

    // Text + CTA
    const text =
      (item.getAttribute("data-banner-text") || "").trim() ||
      getTextWithin(item.querySelector(".banner-text")) ||
      getTextWithin(item.querySelector("[data-role='text']"));

    const cta =
      (item.getAttribute("data-banner-cta") || "").trim() ||
      getTextWithin(item.querySelector(".banner-cta")) ||
      getTextWithin(item.querySelector("[data-role='cta']"));

    // Images:
    // 1) try explicit classes
    const img1Node = item.querySelector(".banner-img-1, .banner-img-1 img, [data-role='img1'], [data-role='image1']");
    const img2Node = item.querySelector(".banner-img-2, .banner-img-2 img, [data-role='img2'], [data-role='image2']");

    let wide = getImgUrl(img1Node) || getBgUrl(img1Node);
    let square = getImgUrl(img2Node) || getBgUrl(img2Node);

    // 2) fallback: first 2 <img> in item
    if (!wide || !square){
      const imgs = Array.from(item.querySelectorAll("img"))
        .map(im => (im.getAttribute("src") || "").trim())
        .filter(Boolean);

      if (!wide) wide = imgs[0] || "";
      if (!square) square = imgs[1] || "";
    }

    return { iso, lang, text, cta, wide, square, _item: item };
  }

  async function readCountriesRows(){
    const root = getCountriesDataRoot();
    const items = getItems(root);
    const rows = items.map(parseCountryRow).filter(r => r.iso);
    return { root, rows };
  }

  function pickCountryRow(rows, iso, lang){
    const I = normIso(iso);
    const L = normLang(lang);
    // exact match
    let r = rows.find(x => x.iso === I && x.lang === L);
    if (r) return r;
    // iso only
    r = rows.find(x => x.iso === I);
    if (r) return r;
    return null;
  }

  // ----------------------------------------------------------------------------
  // Sponsor API
  // ----------------------------------------------------------------------------
  async function fetchSponsorInfo(slug, iso, lang){
    const url = WORKER_URL.replace(/\/$/, "") + SPONSOR_INFO_ENDPOINT;
    const body = { metier: slug, country: iso, lang };
    log("fetchSponsorInfo", url, body);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": PROXY_SECRET
      },
      body: JSON.stringify(body)
    });

    let json = null;
    try { json = await res.json(); } catch(e){}
    if (!res.ok){
      log("sponsor-info not ok", res.status, json);
      return { sponsored: false, payload: json || null };
    }
    return { sponsored: !!json?.sponsored, payload: json };
  }

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------
  function render({ title, category, description, iso, lang, sponsored, bannerWide, bannerSquare, bannerHref }){
    injectCss();
    const root = ensureRoot();

    const safeHref = (bannerHref && /^https?:\/\//i.test(bannerHref)) ? bannerHref : (bannerHref || "/sponsor");
    const bannerLink = safeHref || "/sponsor";

    const sponsorPill = sponsored ? "Sponsored" : "Not sponsored";
    const locPill = `${iso}${lang ? " · " + lang : ""}`;

    const wideImg = bannerWide ? `<a class="ul-banner" href="${bannerLink}" target="_self" rel="noopener"><img src="${bannerWide}" alt="Sponsor banner"></a>` : "";
    const squareImg = bannerSquare ? `<a href="${bannerLink}" target="_self" rel="noopener"><img src="${bannerSquare}" alt="Sponsor banner"></a>` : "";

    root.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-topbar">
          <div class="ul-brand">
            <img src="https://cdn.prod.website-files.com/6942b6d9dc4d5a360322b0dd/6942b6d9dc4d5a360322b0dd_ulydia-logo.png" alt="Ulydia" onerror="this.style.display='none'">
            <div class="ul-name">ULYDIA</div>
          </div>
          <div class="ul-nav">
            <a class="ul-link" href="/sponsor">Sponsor</a>
            <a class="ul-link" href="/my-account">Dashboard</a>
            <a class="ul-link ul-cta" href="/login">Log in</a>
          </div>
        </div>

        <div class="ul-hero">
          <div class="ul-hero-inner">
            <h1 class="ul-h1">${escapeHtml(title)}</h1>
            ${category ? `<p class="ul-sub">${escapeHtml(category)}</p>` : ""}
            ${description ? `<p class="ul-desc">${escapeHtml(description)}</p>` : ""}
          </div>
          ${wideImg}
        </div>

        <div class="ul-grid">
          <div class="ul-card">
            <div class="ul-card-h">
              <h2>Content</h2>
              <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
                <span class="ul-pill">${escapeHtml(sponsorPill)}</span>
                <span class="ul-pill">${escapeHtml(locPill)}</span>
              </div>
            </div>
            <div class="ul-card-b ul-cms-mount" id="ul_cms_mount">
              <!-- existing Webflow content will be moved here -->
              <div style="color:rgba(255,255,255,.62); font-size:13px">Loading…</div>
            </div>
          </div>

          <div class="ul-square">
            <div class="ul-card">
              <div class="ul-card-h"><h2>Banner</h2><span class="ul-pill">Click →</span></div>
              <div class="ul-card-b">
                ${squareImg || `<div style="color:rgba(255,255,255,.62); font-size:13px">No square banner</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/\'/g,"&#039;");
  }

  // Move the existing visible content into our card (best-effort)
  function mountExistingContentInto(){
    const mount = document.getElementById("ul_cms_mount");
    if (!mount) return;

    // Heuristic: take the main content sections from the current page
    // and move them inside our mount, excluding our root and countriesData.
    const root = document.getElementById(ROOT_ID);
    const countries = document.getElementById("countriesData");

    const candidates = Array.from(document.body.children).filter(el => {
      if (!el || el === root) return false;
      if (countries && el === countries) return false;
      if (KEEP_IDS.has(el.id)) return false;
      // don't move scripts/styles
      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") return false;
      return true;
    });

    // If we already are in shell mode, there may be no content; keep placeholder.
    if (!candidates.length){
      mount.innerHTML = `<div style="color:rgba(255,255,255,.62); font-size:13px">No CMS content detected. (If you are using shell page, it’s normal.)</div>`;
      return;
    }

    mount.innerHTML = "";
    for (const el of candidates){
      mount.appendChild(el);
    }
  }

  // ----------------------------------------------------------------------------
  // Main
  // ----------------------------------------------------------------------------
  async function main(){
    // If you want to fully replace Webflow layout, enable this:
    // setShellMode(true);

    // keep your anti-flash behavior compatible
    document.documentElement.classList.add("ul-sponsor-loading");

    // 1) Collect context
    const slug = findMetierSlug();
    const iso = getVisitorIso();

    // 2) Read countriesData rows
    const { rows } = await readCountriesRows();
    log("countriesData rows", rows.length);

    // IMPORTANT: final language from countriesData for ISO (NOT browser lang)
    const rowForIso = pickCountryRow(rows, iso, "") || null;
    const finalLang = normLang(rowForIso?.lang) || normLang(window.VISITOR_LANG) || "en";

    // 3) sponsor-info (using FINAL lang)
    const sponsor = await fetchSponsorInfo(slug, iso, finalLang);
    const sponsored = !!sponsor.sponsored;
    window.SPONSORED_ACTIVE = sponsored;

    // dispatch same event as your bridge expects (optional)
    window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
      detail: { sponsored, payload: sponsor.payload || null, metier: slug, geo: { country: iso, lang: finalLang } }
    }));

    // 4) Decide banners
    const payload = sponsor.payload || {};
    let bannerWide = "";
    let bannerSquare = "";
    let bannerHref = "";

    if (sponsored){
      bannerWide = pickUrl(pickFirst(payload, SPONSOR_WIDE_KEYS));
      bannerSquare = pickUrl(pickFirst(payload, SPONSOR_SQUARE_KEYS));
      bannerHref = pickFirst(payload, SPONSOR_URL_KEYS);
      log("sponsor banners", { bannerWide: !!bannerWide, bannerSquare: !!bannerSquare });
    }

    if (!bannerWide || !bannerSquare){
      // non-sponsor fallback (iso + finalLang)
      const r = pickCountryRow(rows, iso, finalLang);
      bannerWide = bannerWide || pickUrl(r?.wide || "");
      bannerSquare = bannerSquare || pickUrl(r?.square || "");
      // optional: if you store CTA url in banner-cta
      bannerHref = bannerHref || (r?.cta || "");
      log("non-sponsor banners", { iso, finalLang, bannerWide: !!bannerWide, bannerSquare: !!bannerSquare });
    }

    // 5) render
    const title = readTitle();
    const category = readCategory();
    const description = readShortDescription();

    render({
      title,
      category,
      description,
      iso,
      lang: finalLang,
      sponsored,
      bannerWide,
      bannerSquare,
      bannerHref,
    });

    // 6) mount existing CMS content into our layout
    mountExistingContentInto();

    // expose helper for console debug
    window.getCountryBanner = (isoIn, kind = "wide") => {
      const r = pickCountryRow(rows, isoIn, finalLang);
      return kind === "square" ? (r?.square || "") : (r?.wide || "");
    };

    window.__METIER_PAGE_VERSION__ = VERSION;
    document.documentElement.classList.remove("ul-sponsor-loading");
    log("ready", { slug, iso, finalLang, sponsored });
  }

  main().catch(e => {
    document.documentElement.classList.remove("ul-sponsor-loading");
    console.error("[metier-page] fatal", e);
  });
})();
