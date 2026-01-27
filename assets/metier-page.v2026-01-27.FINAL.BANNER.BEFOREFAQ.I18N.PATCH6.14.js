(function(){
  "use strict";
  // =========================================================
  // ULYDIA — Banner BEFORE FAQ (I18N) — PATCH6.14 (ROBUST)
  // Fixes cases where banner isn't inserted because FAQ "outer" can't be resolved.
  //
  // Goals:
  // - Insert ONE wide banner BETWEEN last content block and the FAQ CARD (same width)
  // - Prefer sponsor/fallback wide URL from window state
  // - Fallback: clone the existing TOP wide banner anchor if available
  // - Never insert inside FAQ
  // - No flicker, updates in place
  // =========================================================

  var DEBUG = false;

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH614__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH614__ = true;

  function log(){ try{ if(DEBUG) console.log.apply(console, arguments);}catch(e){} }
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  // ---------- Banner sources ----------
  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return v.url || v.src || v.href || v.download || "";
    return "";
  }

  function getSponsorInfo(){
    return (
      window.__ULYDIA_SPONSOR_INFO__ ||
      window.__ULYDIA_SPONSOR__ ||
      window.__ULYDIA_SPONSOR_DATA__ ||
      (window.__ULYDIA_METIER__ && window.__ULYDIA_METIER__.sponsor) ||
      (window.__ULYDIA_STATE__ && window.__ULYDIA_STATE__.sponsor) ||
      null
    );
  }

  function getCountryInfo(){
    var c =
      (window.__ULYDIA_STATE__ && (window.__ULYDIA_STATE__.country || window.__ULYDIA_STATE__.selectedCountry)) ||
      window.__ULYDIA_COUNTRY__ ||
      null;
    if (c) return c;

    var iso = "";
    try{ iso = (window.__ULYDIA_ISO__ || (window.__ULYDIA_STATE__ && window.__ULYDIA_STATE__.iso) || "").toString().toUpperCase().trim(); }catch(e){}
    var catalog = window.__ULYDIA_CATALOG__ || window.__ULYDIA_CATALOG_JSON__ || null;
    if (iso && catalog && catalog.countries && catalog.countries.length){
      for (var i=0;i<catalog.countries.length;i++){
        if (String(catalog.countries[i].iso||"").toUpperCase() === iso) return catalog.countries[i];
      }
    }
    return null;
  }

  function resolveBannerWide(){
    var s = getSponsorInfo();
    if (s){
      var wide = pickUrl(s.banner_wide || s.bannerWide || s.image_1 || s.image1 || (s.banners && (s.banners.wide || s.banners.image_1)));
      if (wide) return { kind:"sponsor", url: wide, href: pickUrl(s.url || s.href || s.cta_url || s.link), alt: norm(s.alt || s.name || "Sponsor") };
    }

    var c = getCountryInfo() || {};
    var banners = c.banners || c.banner || c.fallback_banners || {};
    var wide2 = pickUrl(banners.image_1 || banners.wide || banners.landscape || banners.banner_1 || banners.banner1);
    if (wide2) return { kind:"fallback", url: wide2, href: pickUrl(banners.cta || banners.href || ""), alt:"" };

    return { kind:"none", url:"", href:"", alt:"" };
  }

  // ---------- Fallback: clone TOP banner (like PATCH5) ----------
  function looksWide(img){
    if (!img) return false;
    var w = Number(img.naturalWidth || img.width || 0);
    var h = Number(img.naturalHeight || img.height || 0);
    if (w && h && (w/h) >= 2.2) return true;
    var alt = (img.getAttribute("alt")||"").toLowerCase();
    return alt.indexOf("banner") >= 0 || alt.indexOf("banni") >= 0 || alt.indexOf("sponsor") >= 0;
  }

  function findTopBannerAnchor(){
    var byId = document.getElementById("sponsor-banner-link");
    if (byId && byId.querySelector("img")) return byId;

    var anchors = qa("a").filter(function(a){ return a.querySelector && a.querySelector("img"); });
    for (var i=0;i<anchors.length;i++){
      var img = anchors[i].querySelector("img");
      if (looksWide(img)) return anchors[i];
    }
    return null;
  }

  // ---------- Find FAQ card robustly ----------
  function findFaqCard(){
    // 1) Best guess: card that contains the FAQ title (anywhere inside)
    var cards = qa(".card, .ul-card, .u-card, [data-ul-section='faq'], .ul-faq, .js-faq, .ul-faq-card, .faq-card");
    if (!cards.length) cards = qa("div");

    for (var i=0;i<cards.length;i++){
      var t = norm(cards[i].textContent||"").toLowerCase();
      if (!t) continue;
      if (t.indexOf("questions fréquentes") >= 0 || t.indexOf("frequently asked") >= 0 || t === "faq") {
        // Heuristic: FAQ has multiple question rows (chevrons) OR question marks
        var hasChevron = !!q("svg, [class*='chevron'], [class*='accordion']", cards[i]);
        var hasQ = (t.indexOf("?") >= 0) || !!q("[data-faq], .faq-item, .accordion-item, .ul-faq-item", cards[i]);
        if (hasChevron || hasQ) return cards[i];
      }
    }

    // 2) Fallback: the first .card that has "Questions fréquentes" title in the page
    var any = qa(".card").find(function(c){
      return norm(c.textContent||"").toLowerCase().indexOf("questions fréquentes") >= 0;
    });
    return any || null;
  }

  // ---------- Style + width sync ----------
  function styleBanner(banner){
    banner.style.margin = "18px 0";
    banner.style.borderRadius = "14px";
    banner.style.overflow = "hidden";
    banner.style.background = "#fff";
    banner.style.border = "1px solid rgba(226,232,240,1)";
    banner.style.boxShadow = "0 8px 24px rgba(17,24,39,.10)";
    banner.style.width = "100%";
  }

  function syncBannerWidthWithFaq(banner, faqCard){
    try{
      var w = faqCard && faqCard.getBoundingClientRect ? faqCard.getBoundingClientRect().width : 0;
      if (!w || w < 200) return;
      banner.style.maxWidth = Math.round(w) + "px";
      banner.style.marginLeft = "auto";
      banner.style.marginRight = "auto";
    }catch(e){}
  }

  // ---------- Build / update banner ----------
  function ensureBanner(){
    var faqCard = findFaqCard();
    if (!faqCard || !faqCard.parentElement) { log("[PATCH6.14] FAQ card not found"); return; }

    // Never keep banner inside FAQ card
    qa("#ul-beforefaq-banner, [data-ul-beforefaq-banner='1']", faqCard).forEach(function(x){
      try{ x.remove(); }catch(e){}
    });

    var banner = q("#ul-beforefaq-banner");
    if (!banner){
      banner = document.createElement("div");
      banner.id = "ul-beforefaq-banner";
      banner.setAttribute("data-ul-beforefaq-banner","1");

      var a = document.createElement("a");
      a.setAttribute("data-ul-banner-link","1");
      a.href = "#";
      a.target = "_self";
      a.rel = "noopener";
      a.style.display = "block";
      a.style.textDecoration = "none";

      var img = document.createElement("img");
      img.setAttribute("data-ul-banner-img","1");
      img.alt = "";
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.objectFit = "cover";

      a.appendChild(img);
      banner.appendChild(a);
    }

    styleBanner(banner);

    // Insert as sibling before FAQ card
    var parent = faqCard.parentElement;
    if (banner.parentElement !== parent){
      parent.insertBefore(banner, faqCard);
    } else if (banner.nextSibling !== faqCard){
      parent.insertBefore(banner, faqCard);
    }

    syncBannerWidthWithFaq(banner, faqCard);

    // Update content: prefer resolved URL; fallback clone TOP banner
    var info = resolveBannerWide();
    if (info.kind !== "none" && info.url){
      updateBannerFromInfo(banner, info);
      return;
    }

    var topA = findTopBannerAnchor();
    if (topA){
      updateBannerFromTopAnchor(banner, topA);
      return;
    }

    // If nothing found, hide
    banner.style.display = "none";
  }

  function sanitizeHref(href){
    href = norm(href);
    if (href && href.indexOf("function") === 0) href = "";
    if (href && !/^https?:\/\//i.test(href)){
      if (!/^(mailto:|tel:)/i.test(href)) href = "https://" + href.replace(/^\/+/, "");
    }
    return href || "#";
  }

  function updateBannerFromInfo(root, info){
    var img = q('[data-ul-banner-img="1"]', root);
    var a = q('[data-ul-banner-link="1"]', root);
    if (!img || !a) return;

    root.style.display = "";
    if (img.getAttribute("src") !== info.url) img.setAttribute("src", info.url);
    img.alt = info.alt || "";

    var href = sanitizeHref(info.href);
    a.href = href;
    a.target = (href === "#") ? "_self" : "_blank";
  }

  function updateBannerFromTopAnchor(root, topA){
    var imgTop = topA.querySelector("img");
    if (!imgTop) return;

    var src = imgTop.currentSrc || imgTop.getAttribute("src") || "";
    src = norm(src);
    if (!src) return;

    var href = topA.getAttribute("href") || "";
    href = sanitizeHref(href);

    var img = q('[data-ul-banner-img="1"]', root);
    var a = q('[data-ul-banner-link="1"]', root);
    if (!img || !a) return;

    root.style.display = "";
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    img.alt = imgTop.getAttribute("alt") || "";

    a.href = href;
    a.target = (href === "#") ? "_self" : "_blank";
  }

  function boot(){ try{ ensureBanner(); }catch(e){ log("[PATCH6.14] error", e); } }

  // Run when ready + after render/i18n changes
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(boot, 0);
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(boot, 0); });

  window.addEventListener("ULYDIA:RENDER", function(){ setTimeout(boot, 0); });
  window.addEventListener("ULYDIA:I18N_UPDATE", function(){ setTimeout(boot, 0); });

  // Late render
  setTimeout(boot, 250);
  setTimeout(boot, 700);
  setTimeout(boot, 1400);

  // Resize
  window.addEventListener("resize", function(){ setTimeout(boot, 120); });

  // Observer (short-lived)
  try{
    var obs = new MutationObserver(function(){ ensureBanner(); });
    obs.observe(document.documentElement, {childList:true, subtree:true});
    setTimeout(function(){ try{ obs.disconnect(); }catch(e){} }, 8000);
  }catch(e){}
})();