(function(){
  "use strict";
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ PATCH8 (correct anchor + no flicker)
  // - Inserts ONLY the horizontal banner (image + optional link)
  // - Places it just BEFORE the FAQ VISUAL CARD ("Questions fréquentes")
  // - Does NOT touch the top banner, and prevents duplicates
  // =========================================================
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH8__ = true;

  function log(){ if (window.__METIER_PAGE_DEBUG__) console.log.apply(console, ["[BANNER.BEFOREFAQ.P8]"].concat([].slice.call(arguments))); }

  function findFaqCard(){
    // 1) if you have a dedicated anchor element
    const anchor = document.querySelector(".ul-cms-source, #ul-cms-source");
    if (anchor) {
      const card = anchor.closest("section, .u-card, .card, div");
      if (card) return card;
    }
    // 2) locate by title text
    const nodes = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span"));
    const hit = nodes.find(n => ((n.textContent||"").trim().toLowerCase() === "questions fréquentes"));
    if (!hit) return null;
    // climb to card
    return hit.closest("section, .u-card, .card, div") || hit.parentElement;
  }

  function findTopHorizontalBannerImg(){
    const explicit = document.querySelector("#ulydia-metier-root img[data-ulydia-banner='landscape'], #ulydia-metier-root img.ulydia-banner-landscape, #ulydia-metier-root img.js-banner-landscape");
    if (explicit) return explicit;

    // heuristic: widest visible image near top
    const imgs = Array.from(document.querySelectorAll("#ulydia-metier-root img, body img")).filter(i=>{
      try{
        const r=i.getBoundingClientRect();
        if (!r || r.width < 320 || r.height < 60) return false;
        if (r.top < 0) return false;
        return (r.width / r.height) >= 2.2;
      }catch(e){ return false; }
    });
    return imgs[0] || null;
  }

  function getSrc(img){ return img ? String(img.currentSrc || img.src || "").trim() : ""; }

  function makeBanner(src, linkHref){
    const wrap = document.createElement("div");
    wrap.id = "ulydia-banner-beforefaq";
    wrap.style.width = "100%";
    wrap.style.maxWidth = "980px";
    wrap.style.margin = "18px auto";
    wrap.style.opacity = "0";
    wrap.style.transition = "opacity .18s ease";

    const img = document.createElement("img");
    img.src = src;
    img.alt = "Bannière";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.borderRadius = "16px";

    const done = function(){ requestAnimationFrame(()=>{ wrap.style.opacity="1"; }); };

    img.addEventListener("load", done, {once:true});
    img.addEventListener("error", function(){ wrap.remove(); }, {once:true});

    if (linkHref) {
      const a = document.createElement("a");
      a.href = linkHref;
      a.target = "_blank";
      a.rel = "noopener";
      a.appendChild(img);
      wrap.appendChild(a);
    } else {
      wrap.appendChild(img);
    }
    return wrap;
  }

  function insert(){
    if (document.getElementById("ulydia-banner-beforefaq")) return true;

    const faqCard = findFaqCard();
    if (!faqCard) return false;

    const topImg = findTopHorizontalBannerImg();
    if (!topImg) return false;

    const src = getSrc(topImg);
    if (!src) return false;

    const link = topImg.closest("a[href]");
    const href = link && link.href ? link.href : "";

    const banner = makeBanner(src, href);

    // Insert in the same parent as the FAQ card, right before it
    const parent = faqCard.parentNode;
    if (!parent) return false;
    parent.insertBefore(banner, faqCard);

    log("inserted before FAQ card");
    return true;
  }

  // wait for stable top image src to avoid blink
  let stable = 0, last = "";
  let tries = 0;

  function tick(){
    tries++;
    if (tries > 120) return;

    const topImg = findTopHorizontalBannerImg();
    const src = getSrc(topImg);
    if (src && src === last) stable++; else stable = 0;
    last = src;

    if (stable >= 2) { // ~600ms stable
      if (insert()) return;
    }
    setTimeout(tick, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
})();