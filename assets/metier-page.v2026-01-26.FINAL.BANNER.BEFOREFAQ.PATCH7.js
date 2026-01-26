(function(){
  "use strict";
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ PATCH7 (no flicker)
  // - Clones ONLY the horizontal banner image (no texts)
  // - Inserts it JUST BEFORE the FAQ section (ul-cms-source)
  // - Waits for top banner src to be stable to avoid blinking
  // =========================================================
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH7__ = true;

  function log(){ if (window.__METIER_PAGE_DEBUG__) console.log.apply(console, ["[BANNER.BEFOREFAQ.P7]"].concat([].slice.call(arguments))); }

  function findFaqAnchor(){
    // User said FAQ wrapper is `ul-cms-source`
    const a = document.querySelector(".ul-cms-source") || document.getElementById("ul-cms-source");
    return a || null;
  }

  function findTopHorizontalBannerImg(){
    // Prefer explicit banner image in hero if any
    const explicit = document.querySelector("#ulydia-metier-root img[data-ulydia-banner='landscape'], #ulydia-metier-root img.ulydia-banner-landscape, #ulydia-metier-root img.js-banner-landscape");
    if (explicit) return explicit;

    // fallback: first banner-like wide img in the page
    const imgs = Array.from(document.querySelectorAll("img")).filter(i => {
      try{
        const r = i.getBoundingClientRect();
        if (!r || r.width < 280) return false;
        if (r.height <= 0) return false;
        return r.width >= r.height * 2.0; // wide ratio
      }catch(e){ return false; }
    });
    return imgs[0] || null;
  }

  function getImgSrc(img){
    return (img && (img.currentSrc || img.src || "")) ? String(img.currentSrc || img.src) : "";
  }

  function insertOnce(stableImg){
    if (document.getElementById("ulydia-banner-beforefaq")) return true;

    const anchor = findFaqAnchor();
    if (!anchor) return false;

    const src = getImgSrc(stableImg);
    if (!src) return false;

    const wrap = document.createElement("div");
    wrap.id = "ulydia-banner-beforefaq";
    wrap.style.width = "100%";
    wrap.style.maxWidth = "980px";
    wrap.style.margin = "18px auto 10px auto";

    const img = document.createElement("img");
    img.src = src;
    img.alt = stableImg.alt || "Bannière";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.borderRadius = "16px";

    // Preserve sponsor click if the top banner is inside a link
    const topLink = stableImg.closest("a[href]");
    if (topLink && topLink.href) {
      const a = document.createElement("a");
      a.href = topLink.href;
      a.target = topLink.target || "_blank";
      a.rel = topLink.rel || "noopener";
      a.appendChild(img);
      wrap.appendChild(a);
    } else {
      wrap.appendChild(img);
    }

    // insert before FAQ anchor
    anchor.parentNode.insertBefore(wrap, anchor);
    log("inserted");
    return true;
  }

  // Wait for DOM + stable banner source (3 consecutive checks)
  let stableCount = 0;
  let lastSrc = "";

  function tick(){
    const anchor = findFaqAnchor();
    if (!anchor) { setTimeout(tick, 200); return; }

    const topImg = findTopHorizontalBannerImg();
    if (!topImg) { setTimeout(tick, 200); return; }

    const src = getImgSrc(topImg);
    if (!src) { setTimeout(tick, 200); return; }

    if (src === lastSrc) stableCount++; else stableCount = 0;
    lastSrc = src;

    if (stableCount >= 2) { // ~600ms stable
      insertOnce(topImg);
      return;
    }
    setTimeout(tick, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tick);
  } else {
    tick();
  }
})();