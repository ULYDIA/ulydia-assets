
/*!
 * =========================================================
 * ULYDIA — PROPAL DESIGN — BANNERS MANAGER — PATCH1
 * File: metier-page.v2026-01-30.FINAL.PROPAL.BANNERS.PATCH1.js
 * Goal:
 * - Keep the "propal1" UI design untouched
 * - Manage banners in 3 places using ONLY globals (no template duplication):
 *    1) Top wide banner (id="sponsor-banner-link")
 *    2) Sidebar square banner (id="sponsor-logo-link") + CTA (id="sponsor-cta")
 *    3) Optional "before FAQ" banner slot: #ulydia-banner-before-faq-slot OR auto-detect FAQ card
 *
 * Data sources (existing global conventions):
 * - Sponsor: window.__ULYDIA_SPONSOR_INFO__ (or aliases)
 * - Country fallback banners: window.__ULYDIA_COUNTRY__ / window.__ULYDIA_STATE__.country
 *   OR window.__ULYDIA_CATALOG__.countries by iso.
 *
 * Notes:
 * - Production-ready: no logs unless window.__METIER_PAGE_DEBUG__ === true
 * - Does NOT fetch anything; relies on globals populated by your CMS embeds / base bundle
 * =========================================================
 */
(function(){
  "use strict";

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(!DEBUG) return; try{ console.log.apply(console, arguments); }catch(e){} }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return v.url || v.src || v.href || v.download || "";
    return "";
  }

  function getParam(name){
    try{ return new URLSearchParams(location.search||"").get(name); }catch(e){ return null; }
  }

  function getMeta(){
    var metier = (getParam("metier") || getParam("job") || "").trim();
    var iso = (getParam("country") || getParam("iso") || "").trim().toUpperCase();
    return { metier: metier, iso: iso };
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

    // Try catalog lookup by ISO
    var iso = "";
    try{ iso = (window.__ULYDIA_ISO__ || (window.__ULYDIA_STATE__ && window.__ULYDIA_STATE__.iso) || "").toString().toUpperCase().trim(); }catch(e){}
    if (!iso) iso = (getParam("country") || "").toString().toUpperCase().trim();

    var catalog = window.__ULYDIA_CATALOG__ || window.__ULYDIA_CATALOG_JSON__ || null;
    if (iso && catalog && catalog.countries && catalog.countries.length){
      for (var i=0;i<catalog.countries.length;i++){
        if (String(catalog.countries[i].iso||"").toUpperCase() === iso) return catalog.countries[i];
      }
    }
    return null;
  }

  function resolveBannerWide(){
    // Sponsor wins
    var s = getSponsorInfo();
    if (s){
      var wide = pickUrl(s.banner_wide || s.bannerWide || s.image_1 || s.image1 || (s.banners && (s.banners.wide || s.banners.image_1)));
      if (wide) return { kind:"sponsor", url: wide, href: pickUrl(s.url || s.href || s.cta_url || s.link), alt: norm(s.alt || s.name || "Sponsor"), name: norm(s.name || "") };
    }

    // Country fallback
    var c = getCountryInfo() || {};
    var banners = c.banners || c.banner || c.fallback_banners || {};
    var wide2 = pickUrl(banners.image_1 || banners.wide || banners.landscape || banners.banner_1 || banners.banner1);
    if (wide2) return { kind:"fallback", url: wide2, href: pickUrl(banners.cta || banners.href || ""), alt:"", name:"" };

    return { kind:"none", url:"", href:"", alt:"", name:"" };
  }

  function resolveBannerSquare(){
    var s = getSponsorInfo();
    if (s){
      var sq = pickUrl(s.banner_square || s.bannerSquare || s.image_2 || s.image2 || (s.banners && (s.banners.square || s.banners.image_2)));
      // If only one image exists, reuse wide
      if (!sq) sq = pickUrl(s.banner_wide || s.bannerWide || s.image_1 || s.image1 || (s.banners && (s.banners.wide || s.banners.image_1)));
      if (sq) return { kind:"sponsor", url: sq, href: pickUrl(s.url || s.href || s.cta_url || s.link), alt: norm(s.alt || s.name || "Sponsor"), name: norm(s.name || "") };
    }

    var c = getCountryInfo() || {};
    var banners = c.banners || c.banner || c.fallback_banners || {};
    var sq2 = pickUrl(banners.image_2 || banners.square || banners.banner_2 || banners.banner2);
    if (sq2) return { kind:"fallback", url: sq2, href: pickUrl(banners.cta || banners.href || ""), alt:"", name:"" };

    return { kind:"none", url:"", href:"", alt:"", name:"" };
  }

  function ensureImgInside(anchor, className){
    if (!anchor) return null;
    var img = anchor.querySelector("img");
    if (!img){
      // wipe static content (svg blocks)
      anchor.innerHTML = "";
      img = document.createElement("img");
      img.decoding = "async";
      img.loading = "lazy";
      img.alt = "";
      if (className) img.className = className;
      // safe defaults
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";
      anchor.appendChild(img);
    }
    return img;
  }

  function setLink(a, href){
    if (!a) return;
    if (href && typeof href === "string" && href.trim()){
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    } else {
      // keep clickable but no nav
      a.href = "#";
      a.target = "_self";
      a.rel = "noopener";
    }
  }

  function sponsorCtaHref(){
    var s = getSponsorInfo();
    var href = s ? pickUrl(s.url || s.href || s.cta_url || s.link) : "";
    if (href) return href;

    // fallback CTA to sponsor page
    var m = getMeta();
    if (!m.metier || !m.iso) return "";
    return "/sponsor?metier=" + encodeURIComponent(m.metier) + "&country=" + encodeURIComponent(m.iso);
  }

  // ---------------------------
  // 1) Top wide banner
  // ---------------------------
  function applyTopWide(){
    var a = document.getElementById("sponsor-banner-link");
    if (!a) return;

    var res = resolveBannerWide();
    if (res.kind === "none" || !res.url){
      // hide if nothing
      a.style.display = "none";
      return;
    }

    a.style.display = "";
    setLink(a, res.href);

    var img = ensureImgInside(a, "");
    img.src = res.url;
    img.alt = res.alt || "";

    // Update sponsor name if the template uses it
    var nameNode = document.getElementById("sponsor-name-banner");
    if (nameNode){
      if (res.kind === "sponsor" && res.name) nameNode.textContent = res.name;
      if (res.kind === "fallback") nameNode.textContent = "Sponsorisez ce métier";
    }
  }

  // ---------------------------
  // 2) Sidebar square banner + CTA
  // ---------------------------
  function applySidebarSquare(){
    var a = document.getElementById("sponsor-logo-link");
    if (!a) return;

    var res = resolveBannerSquare();
    if (res.kind === "none" || !res.url){
      a.style.display = "none";
      // still keep CTA hidden
      var cta0 = document.getElementById("sponsor-cta");
      if (cta0) cta0.style.display = "none";
      return;
    }

    a.style.display = "";
    setLink(a, res.href);

    // Replace inner square box content with image, keep sizing from .sponsor-logo-square if present
    var box = a.querySelector(".sponsor-logo-square") || a;
    var img = ensureImgInside(box, "");
    img.src = res.url;
    img.alt = res.alt || "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain"; // square logo-like

    var nameNode = document.getElementById("sponsor-name-sidebar");
    if (nameNode){
      if (res.kind === "sponsor" && res.name) nameNode.textContent = res.name;
      if (res.kind === "fallback") nameNode.textContent = "Devenir partenaire";
    }

    var cta = document.getElementById("sponsor-cta");
    if (cta){
      cta.style.display = "";
      cta.href = sponsorCtaHref();
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
      // If fallback: adjust label
      if (res.kind === "fallback"){
        // only if the CTA has text
        if (cta.textContent) cta.textContent = "Devenir partenaire";
      }
    }
  }

  // ---------------------------
  // 3) Optional "before FAQ" banner
  // - If slot exists: place inside slot
  // - Else: try to insert before visible FAQ card
  // ---------------------------
  var TITLE_WORDS = [
    "questions fréquentes",
    "faq",
    "frequently asked",
    "domande frequenti",
    "preguntas frecuentes",
    "häufige fragen"
  ];

  function isVisible(el){
    if (!el) return false;
    try{
      var cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      if (el.offsetParent === null && cs.position !== "fixed") return false;
      var r = el.getBoundingClientRect();
      if (!r || r.height < 20 || r.width < 200) return false;
      return true;
    }catch(e){}
    return false;
  }

  function findFaqCard(){
    // manual hook wins
    var manual = q('[data-ulydia-faq-card="1"]');
    if (manual && isVisible(manual)) return manual;

    var nodes = qa("h1,h2,h3,h4,div,span");
    var candidates = [];
    for (var i=0;i<nodes.length;i++){
      var txt = norm(nodes[i].textContent||"").toLowerCase();
      if (!txt) continue;
      for (var j=0;j<TITLE_WORDS.length;j++){
        if (txt.indexOf(TITLE_WORDS[j]) >= 0){
          var card = null;
          try{ card = nodes[i].closest(".card, .ul-card, .u-card, .faq-card, .ul-faq-card, [data-ul-section='faq'], .ul-faq, .js-faq"); }catch(e){}
          if (card) candidates.push(card);
          break;
        }
      }
    }
    // choose best visible
    var best = null, bestH = 0;
    for (var k=0;k<candidates.length;k++){
      var el = candidates[k];
      if (!isVisible(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.height > bestH){ bestH = r.height; best = el; }
    }
    return best;
  }

  function getOrCreateBeforeFaqBanner(){
    var host = document.getElementById("ul-beforefaq-banner");
    if (host) return host;

    host = document.createElement("div");
    host.id = "ul-beforefaq-banner";
    host.setAttribute("data-ul-beforefaq-banner", "1");

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
    host.appendChild(a);
    return host;
  }

  function applyBeforeFaq(){
    // Use same wide banner decision for before-FAQ (keeps consistency)
    var res = resolveBannerWide();
    if (res.kind === "none" || !res.url) return;

    var banner = getOrCreateBeforeFaqBanner();
    var a = banner.querySelector('[data-ul-banner-link="1"]') || banner.querySelector("a");
    var img = banner.querySelector('[data-ul-banner-img="1"]') || banner.querySelector("img");
    if (!a || !img) return;

    setLink(a, res.href);
    img.src = res.url;
    img.alt = res.alt || "";

    // Place
    var slot = document.getElementById("ulydia-banner-before-faq-slot");
    if (slot){
      if (banner.parentNode !== slot) slot.appendChild(banner);
      banner.style.margin = "24px auto";
      banner.style.maxWidth = "680px";
      return;
    }

    var faq = findFaqCard();
    if (faq && faq.parentNode){
      if (banner.parentNode !== faq.parentNode) faq.parentNode.insertBefore(banner, faq);
      else if (banner.nextSibling !== faq) faq.parentNode.insertBefore(banner, faq);

      banner.style.margin = "24px auto";
      // match FAQ card width (best effort)
      try{
        var w = faq.getBoundingClientRect().width;
        if (w && w > 200) banner.style.maxWidth = Math.round(w) + "px";
      }catch(e){}
    }
  }

  // ---------------------------
  // Boot (bounded scheduler)
  // ---------------------------
  function run(){
    try{
      applyTopWide();
      applySidebarSquare();
      applyBeforeFaq();
      // notify others (optional)
      try{ window.dispatchEvent(new Event("ULYDIA:BANNERS_READY")); }catch(e){}
    }catch(e){}
  }

  function schedule(){
    setTimeout(run, 0);
    setTimeout(run, 250);
    setTimeout(run, 800);
    setTimeout(run, 1600);
  }

  if (window.__ULYDIA_PROPAL_BANNERS_PATCH1__) return;
  window.__ULYDIA_PROPAL_BANNERS_PATCH1__ = true;

  if (document.readyState === "complete" || document.readyState === "interactive") schedule();
  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("ULYDIA:RENDER", schedule);
  window.addEventListener("ULYDIA:I18N_UPDATE", schedule);
  window.addEventListener("resize", function(){ setTimeout(run, 120); });

})();
