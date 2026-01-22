/* metier-page.v10.7-SAFE.js — Ulydia
   ✅ Never blanks the page (does NOT replace body / does NOT hide Webflow)
   ✅ Always logs start + errors (even without __METIER_PAGE_DEBUG__)
   ✅ Auto-creates banner slots if missing
   ✅ FIX: ensureBannerSlots() is called BEFORE selecting / using elements
*/
(() => {
  if (window.__ULYDIA_METIER_SAFE_107__) return;
  window.__ULYDIA_METIER_SAFE_107__ = true;

  // Always-on log so you can confirm it executes
  console.log("[metier-safe] v10.7 loaded", location.href);

  const ASSETS_BASE = "https://ulydia-assets.pages.dev/assets";
  const CATALOG_URL = `${ASSETS_BASE}/catalog.json`;

  function pickFirst(...vals) {
    for (const v of vals) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
      return v;
    }
    return "";
  }

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
        v?.file?.url, v?.file?.src,
        v?.image?.url, v?.image?.src
      );
      return typeof u === "string" ? u.trim() : "";
    }
    return "";
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Fetch failed ${res.status} for ${url} :: ${t.slice(0,140)}`);
    }
    return res.json();
  }

  function detectISO() {
    const u = new URL(location.href);
    const iso = String(u.searchParams.get("iso") || "").trim().toUpperCase();
    return iso || "FR";
  }

  function ensureBannerSlots() {
    // Try to mount inside an existing root if you have one
    let mount = document.getElementById("ulydia-metier-root") || document.body;

    let wrap = document.getElementById("ul-banner-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "ul-banner-wrap";
      wrap.style.maxWidth = "1100px";
      wrap.style.margin = "18px auto";
      wrap.style.padding = "0 16px";
      wrap.style.display = "grid";
      wrap.style.gridTemplateColumns = "1fr 320px";
      wrap.style.gap = "14px";
      mount.prepend(wrap);
    }

    let wide = wrap.querySelector('[data-ul-banner="wide"]');
    if (!wide) {
      wide = document.createElement("a");
      wide.setAttribute("data-ul-banner", "wide");
      wide.href = "#";
      wide.style.display = "block";
      wide.style.borderRadius = "14px";
      wide.style.overflow = "hidden";
      wide.style.minHeight = "140px";
      wide.style.background = "#f3f4f6";
      wrap.appendChild(wide);
    }

    let square = wrap.querySelector('[data-ul-banner="square"]');
    if (!square) {
      square = document.createElement("a");
      square.setAttribute("data-ul-banner", "square");
      square.href = "#";
      square.style.display = "block";
      square.style.borderRadius = "14px";
      square.style.overflow = "hidden";
      square.style.minHeight = "140px";
      square.style.background = "#f3f4f6";
      wrap.appendChild(square);
    }

    return { wrap, wide, square };
  }

  function setBanner(el, imgUrl, linkUrl) {
    if (!el) return false;

    if (linkUrl) el.setAttribute("href", linkUrl);

    const img = el.querySelector("img");
    if (img && img.tagName === "IMG") {
      img.src = imgUrl;
      img.alt = img.alt || "Banner";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";
    } else {
      el.style.backgroundImage = imgUrl ? `url("${imgUrl}")` : "";
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    }

    // never hide: keep placeholder visible
    el.style.opacity = imgUrl ? "1" : "0.25";
    return true;
  }

  async function main() {
    const slots = ensureBannerSlots();

    const wideA = document.querySelector(".ul-banner-wide, [data-ul-banner='wide']");
    const squareA = document.querySelector(".ul-banner-square, [data-ul-banner='square']");

    console.log("[metier-safe] slots", {
      wideCount: document.querySelectorAll('[data-ul-banner="wide"]').length,
      squareCount: document.querySelectorAll('[data-ul-banner="square"]').length
    });

    const iso = detectISO();
    const data = await fetchJSON(`${CATALOG_URL}?v=${Date.now()}`);

    const countries = data?.countries || [];
    const c = countries.find(x => String(x?.iso || "").toUpperCase() === iso);

    if (!c) {
      console.warn("[metier-safe] country not found for iso", iso);
      return;
    }

    const img1 = pickUrl(c?.banners?.image_1);
    const img2 = pickUrl(c?.banners?.image_2);

    console.log("[metier-safe] resolved", { iso, img1, img2 });

// FIX: swap (image_1 is wide, image_2 is square)
setBanner(wideA || slots.wide, img1, "");
setBanner(squareA || slots.square, img2, "");


    console.log("[metier-safe] applied");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => main().catch(e => console.error("[metier-safe] fatal", e)));
  } else {
    main().catch(e => console.error("[metier-safe] fatal", e));
  }
})();
