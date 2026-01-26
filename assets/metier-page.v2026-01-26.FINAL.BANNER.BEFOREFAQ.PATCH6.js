/* metier-page.v2026-01-26.FINAL.BANNER.BEFOREFAQ.PATCH6.js
   Ensures the "second" horizontal banner is inserted just before FAQ section.
   - Clones the EXISTING top horizontal banner image only (no extra title/content)
   - Inserts once, no flicker, no reflow loops
   - Works even if Metier_Pays_Bloc is missing
*/
(() => {
  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH6__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH6__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[banner.beforefaq.patch6]", ...a);

  function findFaqAnchor(){
    // Prefer your real anchor: "Questions fréquentes" block wrapper
    const candidates = [
      document.querySelector('[data-section="faq"]'),
      document.querySelector('#js-faq-wrap'),
      document.querySelector('#ul-cms-source'), // your note
    ].filter(Boolean);
    if (candidates[0]) return candidates[0];

    // fallback: find header text
    const nodes = Array.from(document.querySelectorAll("h2,h3,h4,div,span"));
    for (const n of nodes){
      const t = (n.textContent||"").replace(/\u00a0/g," ").trim().toLowerCase();
      if (t === "questions fréquentes" || t.includes("questions fréquentes")) {
        return n.closest("section,div") || n;
      }
    }
    return null;
  }

  function findTopHorizontalBanner(){
    // Try known IDs/classes first
    const img =
      document.querySelector("#js-banner-landscape img") ||
      document.querySelector("img[data-ulydia='banner_landscape']") ||
      document.querySelector("img[alt*='sponsoriser'][src]") ||
      null;

    if (img) return img;

    // fallback: pick the first banner-like image in the hero area (wide image)
    const imgs = Array.from(document.querySelectorAll("img")).filter(i => {
      const r = i.getBoundingClientRect();
      return r.width >= 300 && r.width >= r.height * 2.2;
    });
    return imgs[0] || null;
  }

  function insertOnce(){
    if (document.getElementById("ulydia-banner-beforefaq")) return true;

    const anchor = findFaqAnchor();
    const topImg = findTopHorizontalBanner();
    if (!anchor || !topImg) return false;

    const wrap = document.createElement("div");
    wrap.id = "ulydia-banner-beforefaq";
    wrap.style.width = "100%";
    wrap.style.maxWidth = "980px";
    wrap.style.margin = "18px auto 10px auto";

    const img = document.createElement("img");
    img.src = topImg.currentSrc || topImg.src;
    img.alt = topImg.alt || "Bannière sponsor";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.borderRadius = "16px";

    // Preserve sponsor click if top banner is inside a link
    const topLink = topImg.closest("a[href]");
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

    log("inserted banner-beforefaq");
    return true;
  }

  // Observe DOM until FAQ appears, then insert and stop
  const obs = new MutationObserver(() => {
    if (insertOnce()) obs.disconnect();
  });
  obs.observe(document.documentElement, {childList:true, subtree:true});

  // try immediately too
  insertOnce();
})();