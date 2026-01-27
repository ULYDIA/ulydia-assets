(function(){
  "use strict";
  // =========================================================
  // ULYDIA — Sponsor banners: correct images + correct CTA URL
  // PATCH1 — 2026-01-27
  //
  // What this fixes:
  // - Ensures WIDE banner uses sponsor "wide" field (logo_1 / image_1 / banner_wide)
  // - Ensures SQUARE banner uses sponsor "square" field (logo_2 / image_2 / banner_square)
  // - Ensures banner <a href> points to the sponsor CTA/website (not a wrong default)
  //
  // Works even if DOM differs slightly:
  // - Searches for wide banner: #sponsor-banner-link OR [data-ul-banner-slot="wide"]
  // - Searches for square banner: #sponsor-banner-square-link OR [data-ul-banner-slot="square"]
  //
  // Optional config:
  //   window.ULYDIA_SPONSORSHIP_URL = "https://www.ulydia.com/sponsorship";
  // =========================================================

  if (window.__ULYDIA_SPONSOR_BANNERS_LINKFIX_PATCH1__) return;
  window.__ULYDIA_SPONSOR_BANNERS_LINKFIX_PATCH1__ = true;

  var DEFAULT_SPONSORSHIP_URL = (window.ULYDIA_SPONSORSHIP_URL || "https://www.ulydia.com/sponsorship");

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return v.url || v.src || v.href || v.download || "";
    return "";
  }

  function sanitizeHref(href){
    href = norm(href);
    if (!href) return "";
    if (href.indexOf("function") === 0) return "";
    // allow mailto/tel
    if (/^(mailto:|tel:)/i.test(href)) return href;
    // allow absolute http(s)
    if (/^https?:\/\//i.test(href)) return href;
    // protocol-relative
    if (/^\/\//.test(href)) return "https:" + href;
    // relative: make absolute to current origin
    if (href[0] === "/") return location.origin + href;
    // plain domain
    return "https://" + href.replace(/^\/+/, "");
  }

  function getSponsor(){
    return (
      window.__ULYDIA_SPONSOR_INFO__ ||
      window.__ULYDIA_SPONSOR__ ||
      window.__ULYDIA_SPONSOR_DATA__ ||
      (window.__ULYDIA_METIER__ && window.__ULYDIA_METIER__.sponsor) ||
      (window.__ULYDIA_STATE__ && window.__ULYDIA_STATE__.sponsor) ||
      null
    );
  }

  function resolveSponsorUrls(s){
    // Wide preferred fields (Airtable / Worker variants)
    var wide = pickUrl(
      s.banner_wide || s.bannerWide ||
      s.logo_1 || s.logo1 || s.image_1 || s.image1 ||
      (s.banners && (s.banners.wide || s.banners.image_1)) ||
      s.banner_1 || s.banner1
    );

    // Square preferred fields
    var square = pickUrl(
      s.banner_square || s.bannerSquare ||
      s.logo_2 || s.logo2 || s.image_2 || s.image2 ||
      (s.banners && (s.banners.square || s.banners.image_2)) ||
      s.banner_2 || s.banner2
    );

    // CTA URL preferred fields
    var href = sanitizeHref(
      s.cta_url || s.ctaUrl || s.link || s.href || s.url || s.website || s.site
    );

    return { wide: wide, square: square, href: href };
  }

  function applyToSlot(slot, imgUrl, href){
    if (!slot) return;
    var a = slot.tagName === "A" ? slot : slot.querySelector("a") || slot.closest("a");
    var img = slot.tagName === "IMG" ? slot : slot.querySelector("img");

    if (img && imgUrl && img.getAttribute("src") !== imgUrl) img.setAttribute("src", imgUrl);

    if (a){
      var finalHref = href || a.getAttribute("href") || "";
      finalHref = sanitizeHref(finalHref) || "";
      // if still empty, default to sponsorship page (house banner)
      if (!finalHref) finalHref = DEFAULT_SPONSORSHIP_URL;

      a.setAttribute("href", finalHref);
      // sponsor CTA opens new tab; house banner can stay same tab
      var isSponsor = !!href;
      a.target = isSponsor ? "_blank" : "_self";
      a.rel = isSponsor ? "noopener" : (a.rel || "");
    }
  }

  function findWideSlot(){
    return (
      q("#sponsor-banner-link") ||
      q('[data-ul-banner-slot="wide"]') ||
      q('[data-ul-sponsor-slot="wide"]') ||
      q(".ul-banner-wide a") ||
      null
    );
  }

  function findSquareSlot(){
    return (
      q("#sponsor-banner-square-link") ||
      q('[data-ul-banner-slot="square"]') ||
      q('[data-ul-sponsor-slot="square"]') ||
      q(".ul-banner-square a") ||
      null
    );
  }

  function update(){
    var sponsor = getSponsor();
    if (!sponsor) return;

    var urls = resolveSponsorUrls(sponsor);

    // Apply wide
    var wideSlot = findWideSlot();
    if (wideSlot && urls.wide){
      applyToSlot(wideSlot, urls.wide, urls.href);
    }

    // Apply square
    var squareSlot = findSquareSlot();
    if (squareSlot && urls.square){
      applyToSlot(squareSlot, urls.square, urls.href);
    }
  }

  function schedule(){
    setTimeout(update, 0);
    setTimeout(update, 250);
    setTimeout(update, 800);
    setTimeout(update, 1600);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") schedule();
  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("ULYDIA:RENDER", schedule);
  window.addEventListener("ULYDIA:I18N_UPDATE", schedule);

})();