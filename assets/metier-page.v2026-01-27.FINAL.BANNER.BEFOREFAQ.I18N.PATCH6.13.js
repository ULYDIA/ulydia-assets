(function(){
  "use strict";
  // =========================================================
  // ULYDIA — Banner BEFORE FAQ (I18N) — PATCH6.13
  // Goal (as per screenshot):
  // - Banner wide must look like a "card" and have SAME WIDTH as FAQ card
  // - Inserted BETWEEN last content block and the FAQ card
  // - Never inside FAQ container
  // - Sponsor if present, else country fallback (wide)
  // =========================================================

  var DEBUG = false;

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH613__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH613__ = true;

  function log(){ try{ if(DEBUG) console.log.apply(console, arguments);}catch(e){} }
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  // ---------- 1) Language ----------
  function getLang(){
    var l = (window.__ULYDIA_LANG__ || window.ULYDIA_LANG || window.__lang || "").toString().toLowerCase().trim();
    if (!l) l = "fr";
    if (l.indexOf("-")>0) l = l.split("-")[0];
    if (!/^(fr|en|de|es|it)$/.test(l)) l = "en";
    return l;
  }

  // ---------- 2) Banner sources ----------
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

  // ---------- 3) Find FAQ title ----------
  function findFaqTitle(){
    var t = q('[data-ul-faq-title], .ul-faq-title, .js-faq-title, .js-faq-header-title');
    if (t) return t;

    var see = ["Questions fréquentes","FAQ","Frequently asked questions","Domande frequenti","Preguntas frecuentes","Häufige Fragen"];
    var nodes = qa("h1,h2,h3,h4,div,span");
    for (var i=0;i<nodes.length;i++){
      var txt = norm(nodes[i].textContent||"");
      if (!txt) continue;
      for (var j=0;j<see.length;j++){
        if (txt.toLowerCase() === see[j].toLowerCase()) return nodes[i];
      }
    }
    return null;
  }

  // ---------- 4) Find FAQ OUTER (prefer card container, NOT the section) ----------
  function findFaqOuter(){
    var t = findFaqTitle();
    if (!t) return null;

    // Prefer the actual card/container (so banner width matches card width)
    var card = null;
    try{
      card = t.closest(
        '[data-ul-section="faq"], .ul-faq, .js-faq, .ul-faq-card, .faq-card, .ul-card, .u-card, .card'
      );
    }catch(e){}
    if (card) return card;

    // Fallback: look for a wrapping div with rounded corners / card-like class
    var el = t;
    for (var i=0;i<12;i++){
      if (!el || !el.parentElement) break;
      var cls = String(el.className||"");
      if (/\b(ul-faq|faq|ul-card|u-card|card)\b/i.test(cls)) return el;
      el = el.parentElement;
    }

    // Last resort: section (may be full width, but better than nothing)
    try{
      var sec = t.closest("section");
      if (sec) return sec;
    }catch(e){}

    return t.parentElement || null;
  }

  // ---------- 5) Style banner like screenshot + align width with faq card ----------
  function styleBanner(banner){
    // Base "card" look
    banner.style.margin = "18px 0";
    banner.style.borderRadius = "14px";
    banner.style.overflow = "hidden";
    banner.style.background = "#fff";
    banner.style.border = "1px solid rgba(226,232,240,1)";
    banner.style.boxShadow = "0 8px 24px rgba(17,24,39,.10)";

    // Ensure it stays centered if parent is wider than card
    banner.style.width = "100%";
  }

  function syncBannerWidthWithFaq(banner, faqOuter){
    try{
      var w = faqOuter && faqOuter.getBoundingClientRect ? faqOuter.getBoundingClientRect().width : 0;
      if (!w || w < 200) return;

      // If banner's parent is wider, constrain banner to the faq card width and center it
      banner.style.maxWidth = Math.round(w) + "px";
      banner.style.marginLeft = "auto";
      banner.style.marginRight = "auto";
    }catch(e){}
  }

  // ---------- 6) Ensure banner location ----------
  function ensureBanner(){
    var faqOuter = findFaqOuter();
    if (!faqOuter) { log("[PATCH6.13] FAQ not found"); return; }

    // Remove any "beforeFAQ" banner that is inside FAQ outer
    qa("#ul-beforefaq-banner, [data-ul-beforefaq-banner='1']", faqOuter).forEach(function(x){
      try{ x.remove(); }catch(e){}
    });

    // Keep / create banner node
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

    // Place banner as sibling BEFORE FAQ outer (same parent -> same width constraints)
    try{
      if (faqOuter.parentElement){
        if (banner.parentElement !== faqOuter.parentElement){
          faqOuter.parentElement.insertBefore(banner, faqOuter);
        } else if (banner.nextSibling !== faqOuter){
          faqOuter.parentElement.insertBefore(banner, faqOuter);
        }
      }
    }catch(e){}

    // Now sync width to match the FAQ card (screenshot requirement)
    syncBannerWidthWithFaq(banner, faqOuter);

    // And update content
    updateBannerContent(banner);
  }

  function updateBannerContent(root){
    var info = resolveBannerWide();
    var img = q('[data-ul-banner-img="1"]', root);
    var a = q('[data-ul-banner-link="1"]', root);
    if (!img || !a) return;

    if (info.kind === "none" || !info.url){
      root.style.display = "none";
      return;
    }
    root.style.display = "";

    if (img.getAttribute("src") !== info.url) img.setAttribute("src", info.url);
    img.alt = info.alt || "";

    var href = norm(info.href);
    if (href && typeof href === "string"){
      if (href.indexOf("function") === 0) href = "";
    }
    if (href && !/^https?:\/\//i.test(href)){
      if (!/^(mailto:|tel:)/i.test(href)) href = "https://" + href.replace(/^\/+/, "");
    }
    if (!href) href = "#";
    a.href = href;
    a.target = (href === "#") ? "_self" : "_blank";
  }

  function boot(){ try{ ensureBanner(); }catch(e){ log("[PATCH6.13] error", e); } }

  // Run when ready + after render/i18n changes (update in place)
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(boot, 0);
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(boot, 0); });

  window.addEventListener("ULYDIA:RENDER", function(){ setTimeout(boot, 0); });
  window.addEventListener("ULYDIA:I18N_UPDATE", function(){ setTimeout(boot, 0); });

  // In case FAQ arrives late
  setTimeout(boot, 350);
  setTimeout(boot, 900);
  setTimeout(boot, 1600);

  // Resize: keep perfect alignment if layout changes
  window.addEventListener("resize", function(){ setTimeout(boot, 120); });
})();