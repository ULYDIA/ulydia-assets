/* metier-page.js — v5.1 (FULL) */
(() => {
  // ============================================================================
  // Ulydia — Metier Page (Full-code) v5.1
  // - Sponsor vs non-sponsor banners
  // - Non-sponsor banners from #countriesData (Webflow CMS)
  // - Waits for VISITOR_COUNTRY/LANG (set by your footer)
  // - Robust countriesData parsing:
  //    * prefers .w-dyn-item attributes: data-iso, data-banner-cta, data-banner-text, data-banner-img-1/2
  //    * falls back to children roles/classes if present
  // ============================================================================
  if (window.__ULYDIA_METIER_PAGE__) return;
  window.__ULYDIA_METIER_PAGE__ = true;

  const VERSION = "v5.1";
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // DOM ids (your page)
  const ID_SPONSORED      = "block-sponsored";
  const ID_NOT_SPONSORED  = "block-not-sponsored";
  const COUNTRIES_DATA_ID = "countriesData";

  // =========================================================
  // helpers
  // =========================================================
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const normIso = v => String(v || "").toUpperCase().replace(/[^A-Z]/g, "");
  const normLang = v => String(v || "").toLowerCase().split("-")[0];

  function show(el, yes){
    if (!el) return;
    el.style.display = yes ? "" : "none";
    el.style.visibility = yes ? "" : "hidden";
    el.style.opacity = yes ? "" : "0";
  }

  function api(path){
    return WORKER_URL.replace(/\/$/, "") + path;
  }

  function findMetier(){
    const dm = document.querySelector("[data-metier]")?.getAttribute("data-metier");
    if (dm) return dm.trim();
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  // Wait for VISITOR_COUNTRY / VISITOR_LANG (set by your footer global)
  async function waitForGeo(maxMs = 2500){
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs){
      const c = normIso(window.VISITOR_COUNTRY);
      const l = normLang(window.VISITOR_LANG);
      if (c && l) return { country: c, lang: l };
      await new Promise(r => setTimeout(r, 80));
    }
    // fallback
    return {
      country: normIso(window.VISITOR_COUNTRY) || "US",
      lang: normLang(window.VISITOR_LANG) || "en",
    };
  }

  // ---------------------------
  // countriesData parsing
  // ---------------------------
  function getBgImageUrl(el){
    if (!el) return "";
    const bg = getComputedStyle(el).backgroundImage || "";
    // url("...") or url(...)
    const m = bg.match(/url\\((['\"]?)(.*?)\\1\\)/i);
    return m?.[2] || "";
  }

  function getImgSrc(el){
    if (!el) return "";
    if (el.tagName === "IMG") return el.getAttribute("src") || "";
    const img = el.querySelector?.("img");
    return img?.getAttribute("src") || "";
  }

  function pickFirstUrl(...vals){
    for (const v of vals){
      const s = String(v || "").trim();
      if (!s) continue;
      if (s.startsWith("http://") || s.startsWith("https://")) return s;
    }
    return "";
  }

  function readRowFromItem(it){
    // Prefer attributes on the w-dyn-item (this matches your outerHTML screenshots)
    const iso  = normIso(it.getAttribute("data-iso") || it.dataset.iso);
    const lang = normLang(it.getAttribute("data-lang") || it.dataset.lang);

    const text = (it.getAttribute("data-banner-text") || it.dataset.bannerText || "").trim();
    const cta  = (it.getAttribute("data-banner-cta")  || it.dataset.bannerCta  || "").trim();

    // Images: try item attributes first (if you add them later), then child nodes, then bg-image
    const a1 = it.getAttribute("data-banner-img-1") || it.getAttribute("data-img-1") || it.dataset.bannerImg1 || "";
    const a2 = it.getAttribute("data-banner-img-2") || it.getAttribute("data-img-2") || it.dataset.bannerImg2 || "";

    // If Webflow keeps children: try common selectors
    const img1El =
      it.querySelector('[data-role=\"img1\"]') ||
      it.querySelector('.banner-img-1') ||
      it.querySelector('img.banner-img-1') ||
      null;

    const img2El =
      it.querySelector('[data-role=\"img2\"]') ||
      it.querySelector('.banner-img-2') ||
      it.querySelector('img.banner-img-2') ||
      null;

    const wide   = pickFirstUrl(a1, getImgSrc(img1El), getBgImageUrl(img1El));
    const square = pickFirstUrl(a2, getImgSrc(img2El), getBgImageUrl(img2El));

    // Also fallback: if there are 2 imgs in the row
    if ((!wide || !square) && it.querySelectorAll("img").length >= 2){
      const imgs = it.querySelectorAll("img");
      const w2 = getImgSrc(imgs[0]);
      const s2 = getImgSrc(imgs[1]);
      return { iso, lang, text, cta, wide: wide || w2, square: square || s2 };
    }

    return { iso, lang, text, cta, wide, square };
  }

  function findCountriesDataRoot(){
    return document.getElementById(COUNTRIES_DATA_ID);
  }

  // Return country row for ISO from countriesData
  function getCountriesRowByIso(root, iso){
    if (!root) return null;
    const key = normIso(iso);
    const items = $$(".w-dyn-item, [role='listitem'], .w-dyn-items > *", root);

    // IMPORTANT: your debug showed items=100 and FR missing. If missing, return null.
    for (const it of items){
      const itIso = normIso(it.getAttribute("data-iso") || it.dataset.iso);
      if (!itIso) continue;
      if (itIso !== key) continue;
      return readRowFromItem(it);
    }
    return null;
  }

  // ---------------------------
  // sponsor info
  // ---------------------------
  async function fetchSponsorInfo(metier, geo){
    const res = await fetch(api("/sponsor-info"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": PROXY_SECRET,
      },
      body: JSON.stringify({
        metier,
        country: geo.country,
        lang: geo.lang,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  }

  function extractSponsorBanners(payload){
    // Your convention on Airtable:
    //  - sponsor_logo_1 = SQUARE
    //  - sponsor_logo_2 = LANDSCAPE
    const square = pickFirstUrl(
      payload?.sponsor_logo_1,
      payload?.logo_1,
      payload?.square,
      payload?.banner_square
    );

    const wide = pickFirstUrl(
      payload?.sponsor_logo_2,
      payload?.logo_2,
      payload?.wide,
      payload?.banner_wide
    );

    const link = (payload?.sponsor_link || payload?.link || payload?.url || "").trim();
    return { wide, square, link };
  }

  // ---------------------------
  // render banners (simple)
  // ---------------------------
  function setBannerImg(container, url){
    if (!container) return;
    const img = container.tagName === "IMG" ? container : container.querySelector("img");
    if (img){
      img.src = url || "";
      img.style.display = url ? "" : "none";
      return;
    }
    // fallback bg
    if (url){
      container.style.backgroundImage = `url("${url}")`;
    } else {
      container.style.backgroundImage = "";
    }
  }

  function setBannerLink(wrapper, href){
    if (!wrapper) return;
    // If wrapper is a link itself
    if (wrapper.tagName === "A"){
      wrapper.href = href || "#";
      return;
    }
    const a = wrapper.querySelector("a");
    if (a) a.href = href || "#";
  }

  function applyBanners({ sponsored, sponsorBanners, countriesRow, geo }){
    const sponsoredBlock = document.getElementById(ID_SPONSORED);
    const notSponsoredBlock = document.getElementById(ID_NOT_SPONSORED);

    // Always start hidden, then show one
    show(sponsoredBlock, false);
    show(notSponsoredBlock, false);

    // Targets (you can adjust selectors if needed)
    const sWideWrap   = sponsoredBlock && (sponsoredBlock.querySelector("[data-banner='wide'], .banner-wide, .banner-img-2, [data-role='img2']") || sponsoredBlock);
    const sSquareWrap = sponsoredBlock && (sponsoredBlock.querySelector("[data-banner='square'], .banner-square, .banner-img-1, [data-role='img1']") || sponsoredBlock);

    const nWideWrap   = notSponsoredBlock && (notSponsoredBlock.querySelector("[data-banner='wide'], .banner-wide, .banner-img-2, [data-role='img2']") || notSponsoredBlock);
    const nSquareWrap = notSponsoredBlock && (notSponsoredBlock.querySelector("[data-banner='square'], .banner-square, .banner-img-1, [data-role='img1']") || notSponsoredBlock);

    // Prefer sponsor banners if sponsored
    if (sponsored && (sponsorBanners?.wide || sponsorBanners?.square)){
      setBannerImg(sWideWrap, sponsorBanners.wide);
      setBannerImg(sSquareWrap, sponsorBanners.square);
      if (sponsorBanners.link){
        setBannerLink(sWideWrap, sponsorBanners.link);
        setBannerLink(sSquareWrap, sponsorBanners.link);
      }
      show(notSponsoredBlock, false);
      show(sponsoredBlock, true);
      return;
    }

    // Else: use countriesRow (non-sponsored)
    if (countriesRow?.wide || countriesRow?.square){
      setBannerImg(nWideWrap, countriesRow.wide);
      setBannerImg(nSquareWrap, countriesRow.square);

      // If your non-sponsored banners must go to /sponsor with ISO+lang
      const href = `/sponsor?country=${encodeURIComponent(geo.country)}&lang=${encodeURIComponent(geo.lang)}`;
      setBannerLink(nWideWrap, href);
      setBannerLink(nSquareWrap, href);

      show(sponsoredBlock, false);
      show(notSponsoredBlock, true);
      return;
    }

    // Absolute fallback: show non-sponsored block without images
    show(sponsoredBlock, false);
    show(notSponsoredBlock, true);
  }

  // =========================================================
  // BOOT
  // =========================================================
  (async () => {
    const sponsoredBlock = document.getElementById(ID_SPONSORED);
    const notSponsoredBlock = document.getElementById(ID_NOT_SPONSORED);

    // Anti-flash: hide both immediately
    show(sponsoredBlock, false);
    show(notSponsoredBlock, false);
    document.documentElement.classList.add("ul-sponsor-loading");

    try {
      log("version", VERSION);

      const metier = findMetier();
      if (!metier) throw new Error("no metier");

      const geo = await waitForGeo(3000);
      log("geo", geo);

      const root = findCountriesDataRoot();
      const rowsCount = root ? $$(".w-dyn-item, [role='listitem'], .w-dyn-items > *", root).length : 0;
      log("countriesData rows", rowsCount);

      const countriesRow = getCountriesRowByIso(root, geo.country);
      if (!countriesRow){
        log(`no countriesData row for ${geo.country} (likely Webflow list limit 100 — split the list or add a fallback source)`);
      }

      const payload = await fetchSponsorInfo(metier, geo);
      const sponsored = !!payload?.sponsored;

      const sponsorBanners = extractSponsorBanners(payload);

      window.SPONSORED_ACTIVE = sponsored;

      applyBanners({ sponsored, sponsorBanners, countriesRow, geo });

      // Emit event
      window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
        detail: { sponsored, payload, metier, geo, countriesRow }
      }));

      log("done", {
        sponsored,
        finalLang: geo.lang,
        bannerWide: !!(sponsored ? sponsorBanners?.wide : countriesRow?.wide),
        bannerSquare: !!(sponsored ? sponsorBanners?.square : countriesRow?.square),
      });

    } catch (e) {
      console.error("[metier-page] fatal", e);
      window.SPONSORED_ACTIVE = false;
      // fallback: show non-sponsored
      show(document.getElementById(ID_SPONSORED), false);
      show(document.getElementById(ID_NOT_SPONSORED), true);
    } finally {
      document.documentElement.classList.remove("ul-sponsor-loading");
    }
  })();
})();
