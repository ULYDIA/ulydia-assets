/* metier-page.v10.6-SAFE.js — Ulydia
   - Ne blanchit jamais la page (ne touche pas au body)
   - Fait uniquement le fetch catalog + set banners si éléments présents
*/
(() => {
  if (window.__ULYDIA_METIER_SAFE_106__) return;
  window.__ULYDIA_METIER_SAFE_106__ = true;

  const DEBUG = true; // mets false après
  const log = (...a) => DEBUG && console.log("[metier-safe]", ...a);

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
      throw new Error(`Fetch failed ${res.status} for ${url} :: ${t.slice(0,120)}`);
    }
    return res.json();
  }

  function detectISO() {
    const u = new URL(location.href);
    const iso = String(u.searchParams.get("iso") || "").trim().toUpperCase();
    return iso || "FR";
  }

  function setBanner(selector, imgUrl) {
    const el = document.querySelector(selector);
    if (!el) return false;

    // si c’est un <a> avec un <img>
    const img = el.querySelector("img");
    if (img && img.tagName === "IMG") {
      img.src = imgUrl;
      img.loading = img.loading || "lazy";
    } else {
      // sinon on met en background
      el.style.backgroundImage = imgUrl ? `url("${imgUrl}")` : "";
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    }

    el.style.display = imgUrl ? "" : "none";
    return true;
  }

  async function main() {
    const iso = detectISO();
    log("iso", iso);

    const data = await fetchJSON(`${CATALOG_URL}?v=${Date.now()}`);
    const countries = data?.countries || [];
    const c = countries.find(x => String(x?.iso || "").toUpperCase() === iso);

    if (!c) {
      log("country not found for iso", iso);
      return;
    }

    const img1 = pickUrl(c?.banners?.image_1);
    const img2 = pickUrl(c?.banners?.image_2);
    log("resolved banners", { img1, img2 });

    // adapte ces sélecteurs à ton HTML si besoin
    const okWide = setBanner(".ul-banner-wide, [data-ul-banner='wide']", img2);
    const okSquare = setBanner(".ul-banner-square, [data-ul-banner='square']", img1);

    log("applied", { okWide, okSquare });
  }

  main().catch(err => {
    console.error("[metier-safe] fatal", err);
    // IMPORTANT: on n’efface rien, on log seulement
  });
})();
