/**
 * Ulydia — Metier Page (HYBRID: replace ONLY hero) — v4.6
 * - Keeps old Webflow design for page body
 * - Replaces only the first block (hero) using #ulydia-metier-root
 * - Sponsor banner via Worker /sponsor-info
 * - Non-sponsored banners via Webflow CMS list #countriesData (iso-code/lang-code/banner-img-1/banner-img-2)
 *
 * Debug:
 *   window.__METIER_PAGE_DEBUG__ = true
 *   window.getCountryBanner("FR","wide")
 *   window.getCountryBanner("FR","square")
 */

(() => {
  if (window.__ULYDIA_METIER_PAGE_V46__) return;
  window.__ULYDIA_METIER_PAGE_V46__ = true;

  // =========================================================
  // CONFIG
  // =========================================================
  const CFG = {
    WORKER_URL: "https://ulydia-business.contact-871.workers.dev",
    PROXY_SECRET: "ulydia_2026_proxy_Y4b364u2wsFsQL",
    IPINFO_TOKEN: "941b787cc13473",
    DEFAULT_LANG: "en",
    STORAGE_IP_KEY: "u_ipinfo_cache_v1",
    IP_TTL_MS: 12 * 60 * 60 * 1000, // 12h
    JOB_SEGMENT: "fiche-metiers",
    SPONSOR_CTA_FALLBACK: "/sponsorship",
  };

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // Optional visible version for you
  window.__METIER_PAGE_VERSION__ = window.__METIER_PAGE_VERSION__ || "v4.6";

  // =========================================================
  // SMALL HELPERS
  // =========================================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pickText = (el) => (el && el.textContent ? el.textContent.trim() : "");
  const pickUrl = (u) => (typeof u === "string" ? u.trim() : "");

  function setAnchorImage(anchorEl, imgUrl) {
    if (!anchorEl) return false;
    const url = pickUrl(imgUrl);
    if (!url) return false;

    // anchor could be <a> or wrapper; find img inside
    const img =
      anchorEl.tagName === "IMG"
        ? anchorEl
        : anchorEl.querySelector("img") || anchorEl.querySelector("source");

    if (img && img.tagName === "IMG") {
      img.src = url;
      img.srcset = "";
      img.loading = "eager";
      img.decoding = "async";
      img.style.display = "";
      return true;
    }

    // fallback: set as background
    anchorEl.style.backgroundImage = `url("${url}")`;
    anchorEl.style.backgroundSize = "cover";
    anchorEl.style.backgroundPosition = "center";
    return true;
  }

  function setAnchorHref(anchorEl, href) {
    if (!anchorEl) return;
    const a = anchorEl.tagName === "A" ? anchorEl : anchorEl.closest("a");
    if (!a) return;
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
  }

  // =========================================================
  // COUNTRY / LANG RESOLVE (uses your existing footer script if present)
  // =========================================================
  async function getCountryAndLang() {
    // If your global footer already sets something
    const footerCtx =
      window.__ULYDIA_CTX__ ||
      window.__ULYDIA_COUNTRY_LANG__ ||
      null;

    if (footerCtx?.country) {
      return {
        country: String(footerCtx.country || "").toUpperCase(),
        finalLang: String(footerCtx.lang || CFG.DEFAULT_LANG).toLowerCase(),
      };
    }

    // Otherwise IPinfo
    try {
      const cachedRaw = localStorage.getItem(CFG.STORAGE_IP_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.ts && Date.now() - cached.ts < CFG.IP_TTL_MS && cached?.country) {
          return {
            country: String(cached.country).toUpperCase(),
            finalLang: CFG.DEFAULT_LANG,
          };
        }
      }
    } catch (_) {}

    try {
      const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(CFG.IPINFO_TOKEN)}`);
      const j = await r.json();
      const country = (j?.country || "").toUpperCase() || "FR";
      try {
        localStorage.setItem(CFG.STORAGE_IP_KEY, JSON.stringify({ ts: Date.now(), country }));
      } catch (_) {}
      return { country, finalLang: CFG.DEFAULT_LANG };
    } catch (e) {
      return { country: "FR", finalLang: CFG.DEFAULT_LANG };
    }
  }

  // =========================================================
  // SLUG
  // =========================================================
  function getSlug() {
    // /fiche-metiers/<slug>
    const parts = location.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf(CFG.JOB_SEGMENT);
    const slug = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1];
    return (slug || "").trim();
  }

  // =========================================================
  // CMS READERS (TEXT) from [data-ul-f]
  // =========================================================
  function readCMSFieldsFromDOM() {
    const nodes = qsa("[data-ul-f]");
    const keys = nodes.map((n) => String(n.getAttribute("data-ul-f") || "").trim()).filter(Boolean);
    const uniq = Array.from(new Set(keys));
    log("CMS keys detected:", uniq);

    const out = {};
    for (const n of nodes) {
      const k = String(n.getAttribute("data-ul-f") || "").trim();
      if (!k) continue;

      // Try to extract rich text inside too
      const v =
        (n.getAttribute("data-ul-v") || "").trim() ||
        pickText(n);

      out[k] = v;
    }
    return out;
  }

  // =========================================================
  // CMS READERS (COUNTRY BANNERS) from #countriesData
  // Your structure (from screenshot):
  // #countriesData
  //  .w-dyn-item
  //    .iso-code (text)
  //    .lang-code (text)
  //    img.banner-img-1  (wide)
  //    img.banner-img-2  (square)
  // =========================================================
  async function waitForCountriesData() {
    const start = Date.now();
    while (Date.now() - start < 12000) {
      const root = document.getElementById("countriesData");
      if (root) {
        const items =
          root.querySelectorAll(".w-dyn-item").length ||
          root.querySelectorAll(".w-dyn-items > *").length;
        if (items > 0) return true;
      }
      await sleep(100);
    }
    return false;
  }

  function extractImgSrc(el) {
    if (!el) return "";
    if (el.tagName === "IMG") return el.getAttribute("src") || "";
    const img = el.querySelector("img");
    return img ? img.getAttribute("src") || "" : "";
  }

  function readCountriesBannersFromCMS() {
    const root = document.getElementById("countriesData");
    if (!root) return [];

    const items = qsa(".w-dyn-item", root);
    if (!items.length) return [];

    const rows = items.map((it) => {
      const iso = pickText(qs(".iso-code", it)).toUpperCase();
      const lang = pickText(qs(".lang-code", it)).toLowerCase();

      // image elements can be the img itself or wrapper with img inside
      const wideEl = qs(".banner-img-1", it);
      const squareEl = qs(".banner-img-2", it);

      const wide = extractImgSrc(wideEl);
      const square = extractImgSrc(squareEl);

      // optional texts
      const bannerText = pickText(qs(".banner-text", it));
      const bannerCta = pickText(qs(".banner-cta", it));

      return { iso, lang, wide, square, bannerText, bannerCta };
    });

    return rows.filter((r) => r.iso || r.lang);
  }

  function getCountryBanner(countryISO, type, fallbackLang) {
    const iso = String(countryISO || "").toUpperCase();
    const t = String(type || "").toLowerCase();
    const lang = String(fallbackLang || "").toLowerCase();

    const rows = readCountriesBannersFromCMS();

    // 1) strict ISO match
    let row = rows.find((r) => r.iso === iso);

    // 2) fallback to language match
    if (!row && lang) row = rows.find((r) => r.lang === lang);

    if (!row) return "";

    if (t === "wide") return row.wide || "";
    if (t === "square") return row.square || "";
    return "";
  }

  // Expose for your console tests (both forms)
  window.getCountryBanner = (iso, type) => getCountryBanner(iso, type, CFG.DEFAULT_LANG);
  // Alias so you can type getCountryBanner(...) directly
  try { window.getCountryBannerAlias = window.getCountryBanner; } catch(_) {}
  // Make it accessible as plain name too (dev convenience)
  // (This still depends on browser; but at least window.getCountryBanner is guaranteed)
  try { window.getCountryBannerPlain = getCountryBanner; } catch(_) {}

  // =========================================================
  // SPONSOR INFO (Worker)
  // =========================================================
  async function fetchSponsorInfo({ slug, country }) {
    try {
      const r = await fetch(`${CFG.WORKER_URL}/sponsor-info`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-proxy-secret": CFG.PROXY_SECRET,
        },
        body: JSON.stringify({ metier: slug, country }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`sponsor-info ${r.status} ${txt.slice(0, 160)}`);
      }
      return await r.json();
    } catch (e) {
      log("sponsor-info failed:", e);
      return null;
    }
  }

  // =========================================================
  // HERO RENDER
  // =========================================================
  function ensureV4Flag() {
    document.documentElement.setAttribute("data-ul-metier-v4", "1");
  }

  function buildHeroHTML({ title, subtitle, sponsoredLabel }) {
    return `
      <section class="ul-hero">
        <div class="ul-hero-grid">
          <div class="ul-hero-card ul-hero-left">
            <h1 class="ul-hero-title">${title || ""}</h1>
            ${subtitle ? `<div class="ul-hero-subtitle">${subtitle}</div>` : ``}
          </div>

          <div class="ul-hero-card ul-hero-right">
            <div class="ul-hero-banners">
              <a class="ul-banner-wide" href="#" target="_blank" rel="noopener">
                <img alt="" />
                <span class="ul-badge">${sponsoredLabel || ""}</span>
              </a>

              <a class="ul-banner-square" href="#" target="_blank" rel="noopener">
                <img alt="" />
              </a>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function ensureHeroCSS() {
    if (document.getElementById("ul_metier_v4_css")) return;
    const style = document.createElement("style");
    style.id = "ul_metier_v4_css";
    style.textContent = `
      .ul-hero{ max-width:1180px; margin: 30px auto 10px; padding: 0 18px; }
      .ul-hero-grid{ display:grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items:stretch; }
      @media (max-width: 900px){ .ul-hero-grid{ grid-template-columns:1fr; } }

      .ul-hero-card{
        background: #fff;
        border: 1px solid rgba(12, 20, 35, 0.08);
        box-shadow: 0 14px 40px rgba(12,20,35,.08);
        border-radius: 22px;
        overflow: hidden;
      }
      .ul-hero-left{ padding: 42px 34px; min-height: 320px; display:flex; flex-direction:column; justify-content:flex-start; }
      .ul-hero-title{ margin:0; font-size:52px; line-height:1.02; letter-spacing:-.02em; color:#111a2b; font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-weight:800; text-transform:uppercase; }
      @media (max-width: 900px){ .ul-hero-title{ font-size:40px; } }
      .ul-hero-subtitle{ margin-top: 18px; font-size: 18px; color: rgba(17,26,43,.78); font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial; }

      .ul-hero-right{ padding: 18px; }
      .ul-hero-banners{ display:grid; gap: 16px; }
      .ul-banner-wide, .ul-banner-square{
        position:relative;
        display:block;
        border-radius: 18px;
        border: 1px solid rgba(12, 20, 35, 0.10);
        overflow:hidden;
        background: rgba(17,26,43,.04);
        min-height: 150px;
      }
      .ul-banner-wide img, .ul-banner-square img{
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }
      .ul-banner-wide{ height: 160px; }
      .ul-banner-square{ height: 360px; }
      @media (max-width: 900px){
        .ul-banner-square{ height: 280px; }
      }

      .ul-badge{
        position:absolute;
        left: 16px;
        top: 16px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(10, 16, 28, 0.65);
        color:#fff;
        font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        font-weight: 700;
        font-size: 14px;
        backdrop-filter: blur(8px);
        display:inline-flex;
        gap:8px;
        align-items:center;
      }
      .ul-badge:before{
        content:"";
        width:10px; height:10px;
        border-radius:999px;
        background: #646cfd;
        display:inline-block;
      }
    `;
    document.head.appendChild(style);
  }

  function placeRoot() {
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
    }

    // If you provided an anchor in the embed, place before it
    const anchor = document.querySelector('[data-ul-anchor="metier-hero"]');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(root, anchor.nextSibling);
      return root;
    }

    // otherwise prepend
    document.body.prepend(root);
    return root;
  }

  // =========================================================
  // MAIN
  // =========================================================
  async function main() {
    ensureV4Flag();
    ensureHeroCSS();

    const slug = getSlug();
    const { country, finalLang } = await getCountryAndLang();
    log("ctx", { slug, finalLang, country });

    const cms = readCMSFieldsFromDOM();
    log("CMS mapped:", {
      title: !!cms.title,
      description: (cms.description || "").slice(0, 50),
      missions: (cms.missions || "").length ? 1 : 0,
      competences: (cms.competences || "").length ? 1 : 0,
      environnements: (cms.environnements || "").length ? 1 : 0,
    });

    // Wait for Webflow CMS list (countriesData)
    await waitForCountriesData();
    const wideHouse = getCountryBanner(country, "wide", finalLang);
    const squareHouse = getCountryBanner(country, "square", finalLang);

    log("house banners (country)", { countryISO: country, wide: !!wideHouse, square: !!squareHouse });

    // Sponsor info
    const sponsorInfo = await fetchSponsorInfo({ slug, country });

    // Build hero
    const root = placeRoot();
    root.innerHTML = buildHeroHTML({
      title: (cms.title && cms.title !== "false") ? cms.title : slug.replace(/-/g, " ").toUpperCase(),
      subtitle: cms.subtitle || "",
      sponsoredLabel: "Sponsored by",
    });

    const wideA = root.querySelector(".ul-banner-wide");
    const squareA = root.querySelector(".ul-banner-square");

    const sponsored = !!(sponsorInfo && sponsorInfo.sponsored && sponsorInfo.sponsor);
    if (sponsored) {
      const wideUrl = pickUrl(sponsorInfo.sponsor.logo_2 || sponsorInfo.sponsor.logo_wide || "");
      const squareUrl = pickUrl(sponsorInfo.sponsor.logo_1 || sponsorInfo.sponsor.logo_square || "");
      const link = pickUrl(sponsorInfo.sponsor.link || sponsorInfo.sponsor.url || CFG.SPONSOR_CTA_FALLBACK);

      setAnchorImage(wideA, wideUrl);
      setAnchorImage(squareA, squareUrl);
      setAnchorHref(wideA, link);
      setAnchorHref(squareA, link);
    } else {
      // Non-sponsored: country house banners
      const link = CFG.SPONSOR_CTA_FALLBACK;
      setAnchorImage(wideA, wideHouse);
      setAnchorImage(squareA, squareHouse);
      setAnchorHref(wideA, link);
      setAnchorHref(squareA, link);
    }

    log("ready", { mode: "sponsor-info", sponsored });
  }

  // =========================================================
  // BOOT (Webflow-safe)
  // =========================================================
  function boot() {
    // Webflow sometimes renders CMS lists right after DOMContentLoaded,
    // so we wait 2 frames + a tick for safety.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          main().catch((e) => console.error("[metier-page] fatal", e));
        }, 0);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
