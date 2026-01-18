(() => {
  if (window.__ULYDIA_METIER_PAGE__) return;
  window.__ULYDIA_METIER_PAGE__ = true;

  const VERSION = "v5.1";
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================
  // CONFIG
  // =========================
  const CFG = {
    WORKER_URL: "https://ulydia-business.contact-871.workers.dev",
    PROXY_SECRET: "ulydia_2026_proxy_Y4b364u2wsFsQL",
    SPONSOR_INFO_ENDPOINT: "/sponsor-info",

    COUNTRIES_DATA_ID: "countriesData",

    // Where to render the full-code page
    ROOT_ID: "ulydia-metier-root",

    // If sponsor-info returns a click url use it, else fallback:
    FALLBACK_SPONSOR_URL: "/sponsor",

    // If your metier pages are /fiche-metiers/<slug>
    JOB_SEGMENT: "fiche-metiers",

    GEO_WAIT_MS: 2500,
    COUNTRIES_WAIT_MS: 8000,
  };

  // =========================
  // Utils
  // =========================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const normIso = (v) => String(v || "").toUpperCase().replace(/[^A-Z]/g, "");
  const normLang = (v) => String(v || "").toLowerCase().split("-")[0];

  function safeUrl(u){
    const s = String(u || "").trim();
    if (!s) return "";
    // allow relative or https
    if (s.startsWith("/")) return s;
    if (s.startsWith("https://")) return s;
    if (s.startsWith("http://")) return s; // ok for dev
    return s;
  }

  function metierSlug(){
    const dm = document.querySelector("[data-metier]")?.getAttribute("data-metier");
    if (dm) return dm.trim();
    const parts = location.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex(p => p === CFG.JOB_SEGMENT);
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1] || "";
  }

  async function waitForVisitorGeo(timeoutMs){
    const start = Date.now();
    while (Date.now() - start < timeoutMs){
      const c = normIso(window.VISITOR_COUNTRY);
      const l = normLang(window.VISITOR_LANG);
      if (c) return { country: c, lang: l || "en" };
      await sleep(50);
    }
    // fallback
    return { country: "US", lang: "en" };
  }

  async function waitForCountriesData(timeoutMs){
    const start = Date.now();
    while (Date.now() - start < timeoutMs){
      const root = document.getElementById(CFG.COUNTRIES_DATA_ID);
      if (root){
        const items = root.querySelectorAll(".w-dyn-item,[role='listitem'],.w-dyn-items>*");
        if (items && items.length) return root;
      }
      await sleep(80);
    }
    return null;
  }

  function bgUrl(el){
    if (!el) return "";
    const bg = getComputedStyle(el).backgroundImage || "";
    const m = bg.match(/url\(["']?(.*?)["']?\)/i);
    return m && m[1] ? safeUrl(m[1]) : "";
  }

  function imgUrlFromNode(node){
    if (!node) return "";
    if (node.tagName === "IMG"){
      return safeUrl(node.currentSrc || node.getAttribute("src") || "");
    }
    const img = node.querySelector("img");
    if (img) return safeUrl(img.currentSrc || img.getAttribute("src") || "");
    return bgUrl(node);
  }

  function readRowFromCountriesData(root, iso){
    const key = normIso(iso);
    const items = Array.from(root.querySelectorAll(".w-dyn-item,[role='listitem'],.w-dyn-items>*"));

    for (const it of items){
      // Your published DOM shows attributes like data-iso / data-banner-text / data-banner-cta
      const itemIso = normIso(it.getAttribute("data-iso"));
      if (itemIso !== key) continue;

      const lang =
        normLang(it.querySelector('[data-role="lang"]')?.textContent) ||
        normLang(it.querySelector(".lang-code")?.textContent) ||
        "";

      const text =
        (it.getAttribute("data-banner-text") || it.querySelector(".banner-text")?.textContent || "").trim();

      const cta =
        (it.getAttribute("data-banner-cta") || it.querySelector(".banner-cta")?.textContent || "").trim();

      // Images: try find any <img> inside item (often 2 images in your hidden structure)
      const imgs = Array.from(it.querySelectorAll("img"))
        .map(im => safeUrl(im.currentSrc || im.getAttribute("src") || ""))
        .filter(Boolean);

      let wide = imgs[0] || "";
      let square = imgs[1] || "";

      // If no <img>, try by class names (if Webflow rendered wrappers)
      if (!wide) wide = imgUrlFromNode(it.querySelector(".banner-img-1")) || "";
      if (!square) square = imgUrlFromNode(it.querySelector(".banner-img-2")) || "";

      // last resort: any element that looks like it has a bg image
      if (!wide){
        const anyBg = Array.from(it.querySelectorAll("*")).map(bgUrl).filter(Boolean);
        wide = anyBg[0] || "";
        square = square || anyBg[1] || "";
      }

      return { iso: key, lang, text, cta, wide, square };
    }
    return null;
  }

  async function fetchSponsorInfo({ metier, country, lang }){
    const url = CFG.WORKER_URL.replace(/\/$/, "") + CFG.SPONSOR_INFO_ENDPOINT;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": CFG.PROXY_SECRET
      },
      body: JSON.stringify({ metier, country, lang })
    });
    if (!res.ok) return null;
    return await res.json();
  }

  // =========================
  // UI (simple modern shell — you can refine later)
  // =========================
  function injectCss(){
    if (document.getElementById("ul_metier_css_v51")) return;
    const s = document.createElement("style");
    s.id = "ul_metier_css_v51";
    s.textContent = `
      html.ul-metier-dark, html.ul-metier-dark body{
        background: radial-gradient(1200px 600px at 20% -10%, rgba(100,108,253,0.22), transparent 55%),
                    radial-gradient(900px 500px at 95% 10%, rgba(255,255,255,0.06), transparent 60%),
                    linear-gradient(180deg, #0b1020, #070b16) !important;
      }
      #${CFG.ROOT_ID}{ color:#fff; font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial; }
      .ul-wrap{ max-width:1120px; margin:0 auto; padding:22px 14px 26px; }
      .ul-hero{ display:grid; grid-template-columns:1.55fr 1fr; gap:16px; }
      @media(max-width:960px){ .ul-hero{ grid-template-columns:1fr; } }
      .ul-card{
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.10);
        border-radius:22px;
        box-shadow:0 16px 50px rgba(0,0,0,.35);
        overflow:hidden;
        backdrop-filter: blur(10px);
      }
      .ul-pad{ padding:18px; }
      .ul-title{ font-size:34px; font-weight:850; letter-spacing:-.02em; margin:0 0 10px; line-height:1.12; }
      .ul-sub{ color:rgba(255,255,255,.70); font-size:14.5px; line-height:1.65; margin:0; }
      .ul-banners{ display:grid; gap:16px; }
      .ul-banner{
        display:block;
        border-radius:22px;
        overflow:hidden;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(255,255,255,.03);
        text-decoration:none;
        color:inherit;
      }
      .ul-banner img{ width:100%; display:block; object-fit:cover; }
      .ul-banner-wide{ aspect-ratio:16/5; }
      .ul-banner-square{ aspect-ratio:1/1; }
      .ul-banner-caption{ padding:12px 14px; font-size:13px; color:rgba(255,255,255,.75); border-top:1px solid rgba(255,255,255,.08); }
    `;
    document.head.appendChild(s);
    document.documentElement.classList.add("ul-metier-dark");
  }

  function ensureRoot(){
    let root = document.getElementById(CFG.ROOT_ID);
    if (!root){
      root = document.createElement("div");
      root.id = CFG.ROOT_ID;
      document.body.prepend(root);
    }
    return root;
  }

  function render({ title, subtitle, bannerWide, bannerSquare, bannerUrl, bannerCaption }){
    const root = ensureRoot();
    injectCss();

    const wideHtml = bannerWide ? `
      <a class="ul-banner" href="${bannerUrl || CFG.FALLBACK_SPONSOR_URL}">
        <img class="ul-banner-wide" src="${bannerWide}" alt="">
        ${bannerCaption ? `<div class="ul-banner-caption">${bannerCaption}</div>` : ``}
      </a>` : ``;

    const squareHtml = bannerSquare ? `
      <a class="ul-banner" href="${bannerUrl || CFG.FALLBACK_SPONSOR_URL}">
        <img class="ul-banner-square" src="${bannerSquare}" alt="">
      </a>` : ``;

    root.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-hero">
          <div class="ul-card"><div class="ul-pad">
            <h1 class="ul-title">${title || ""}</h1>
            <p class="ul-sub">${subtitle || ""}</p>
          </div></div>

          <div class="ul-banners">
            ${wideHtml}
            ${squareHtml}
          </div>
        </div>
      </div>
    `;
  }

  // =========================
  // Main
  // =========================
  (async () => {
    try {
      log("boot", VERSION);

      // Wait geo first (so we call sponsor-info with the right country)
      const geo = await waitForVisitorGeo(CFG.GEO_WAIT_MS);
      const metier = metierSlug();
      log("geo", geo, "metier", metier);

      // Wait hidden CMS at end of page
      const cdRoot = await waitForCountriesData(CFG.COUNTRIES_WAIT_MS);
      if (!cdRoot){
        log("countriesData not found/ready");
      } else {
        log("countriesData ready", cdRoot.querySelectorAll(".w-dyn-item,[role='listitem'],.w-dyn-items>*").length);
      }

      // Compute “final lang” from countriesData row if possible
      let row = cdRoot ? readRowFromCountriesData(cdRoot, geo.country) : null;
      if (!row){
        log("no countriesData row for", geo.country, "(CHECK WEBFLOW LIMIT 100!)");
      } else {
        log("countriesData row", row);
      }

      const finalLang = row?.lang || geo.lang || "en";

      // Fetch sponsor info
      const sponsor = await fetchSponsorInfo({ metier, country: geo.country, lang: finalLang });
      const sponsored = !!sponsor?.sponsored;

      // Decide banners
      let bannerWide = "";
      let bannerSquare = "";
      let bannerUrl = "";

      if (sponsored){
        bannerWide = safeUrl(sponsor?.banner_landscape || sponsor?.banner_wide || sponsor?.banner1 || "");
        bannerSquare = safeUrl(sponsor?.banner_square || sponsor?.banner2 || "");
        bannerUrl = safeUrl(sponsor?.click_url || sponsor?.url || "");
      }

      // fallback to non-sponsor banners from countriesData
      if (!bannerWide && row?.wide) bannerWide = row.wide;
      if (!bannerSquare && row?.square) bannerSquare = row.square;

      // Title/subtitle: keep existing Webflow content in place (basic extraction)
      const wfTitle =
        document.querySelector("h1")?.textContent?.trim() ||
        document.querySelector("[data-title]")?.textContent?.trim() ||
        metier;

      const wfSubtitle =
        document.querySelector("h2")?.textContent?.trim() ||
        document.querySelector("[data-subtitle]")?.textContent?.trim() ||
        "";

      render({
        title: wfTitle,
        subtitle: wfSubtitle,
        bannerWide,
        bannerSquare,
        bannerUrl: bannerUrl || CFG.FALLBACK_SPONSOR_URL,
        bannerCaption: sponsored ? "" : (row?.text || "")
      });

      // Emit event for other scripts
      window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
        detail: { sponsored, payload: sponsor, metier, geo: { ...geo, lang: finalLang }, countriesRow: row }
      }));

      log("done", { sponsored, finalLang, bannerWide: !!bannerWide, bannerSquare: !!bannerSquare });
    } catch (e) {
      console.error("[metier-page] fatal", e);
    }
  })();
})();

