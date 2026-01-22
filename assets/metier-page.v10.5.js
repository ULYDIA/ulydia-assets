/* metier-page.v10.5.js — Ulydia
 * Patch only:
 * - Robustly handles catalog.json banners.image_1 / image_2 when they are objects/arrays (not strings)
 * - Keeps existing behavior otherwise (no breaking changes)
 *
 * NOTE: This file is a drop-in replacement for your current metier-page.js.
 * If you already have a larger metier-page file, copy only the helper `pickUrl()` + usage below.
 */
(() => {
  if (window.__ULYDIA_METIER_PAGE_V105__) return;
  window.__ULYDIA_METIER_PAGE_V105__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================
  // CONFIG
  // =========================
  const ASSETS_BASE = "https://ulydia-assets.pages.dev/assets";
  const CATALOG_URL = `${ASSETS_BASE}/catalog.json`;

  // -------------------------
  // URL helpers (robust)
  // -------------------------
  function pickFirst() {
    for (let i = 0; i < arguments.length; i++) {
      const v = arguments[i];
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
      return v;
    }
    return "";
  }

  // Accepts string|object|array and returns a url string or ""
  function pickUrl(v) {
    if (!v) return "";
    if (typeof v === "string") return v.trim();

    if (Array.isArray(v)) {
      for (const it of v) {
        const u = pickUrl(it);
        if (u) return u;
      }
      return "";
    }

    if (typeof v === "object") {
      const u = pickFirst(
        v.url, v.src, v.href, v.original, v.originalUrl, v.assetUrl, v.cdnUrl,
        v && v.file && v.file.url,
        v && v.file && v.file.src,
        v && v.image && v.image.url,
        v && v.image && v.image.src
      );
      return typeof u === "string" ? u.trim() : "";
    }

    return "";
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
    return res.json();
  }

  // Example: get ISO (you likely already have this)
  function detectISO() {
    const url = new URL(location.href);
    const iso = (url.searchParams.get("iso") || "").trim().toUpperCase();
    return iso || "FR";
  }

  // Minimal DOM banner setter (adapt to your DOM)
  function setBanner(anchorEl, imgUrl, linkUrl) {
    if (!anchorEl) return;
    const img = anchorEl.querySelector("img") || anchorEl.querySelector(".ul-img") || null;

    if (linkUrl) anchorEl.setAttribute("href", linkUrl);
    if (img && img.tagName === "IMG") {
      img.src = imgUrl;
      img.alt = img.alt || "Sponsor";
    } else {
      // fallback: set background
      anchorEl.style.backgroundImage = imgUrl ? `url("${imgUrl}")` : "";
    }
    anchorEl.style.display = imgUrl ? "" : "none";
  }

  async function main() {
    const iso = detectISO();
    const data = await fetchJSON(`${CATALOG_URL}?v=${Date.now()}`);

    const countries = (data && data.countries) || [];
    const c = countries.find((x) => String(x.iso || "").toUpperCase() === iso) || null;

    if (!c) {
      log("No country found for iso", iso);
      return;
    }

    // Here is the important part: even if image_1 is object/array, we still get URL
    const img1 = pickUrl(c?.banners?.image_1);
    const img2 = pickUrl(c?.banners?.image_2);

    log("banners", { iso, img1, img2 });

    // Adapt selectors to your page (these are safe no-ops if not present)
    const wideA = document.querySelector(".ul-banner-wide, [data-ul-banner='wide']");
    const squareA = document.querySelector(".ul-banner-square, [data-ul-banner='square']");

    // If you also have sponsor link somewhere else, keep it; here we only set images.
    setBanner(wideA, img2, "");
    setBanner(squareA, img1, "");
  }

  main().catch((e) => console.error("[metier-page] fatal", e));
})();
