(function(){
  "use strict";
  // =========================================================
  // ULYDIA — Banner BEFORE FAQ (I18N) — PATCH6.12
  // - Ensures exactly ONE banner BETWEEN last left block and the FAQ card
  // - Never inside FAQ container
  // - Uses same source logic as the main banner: sponsor if present, else country fallback by language
  // - Avoid flicker: on re-runs we update in place (no remove/reinsert)
  // =========================================================

  var DEBUG = false;

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

  // ---------- 3) Find FAQ outer container ----------
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

  function findFaqOuter(){
    var t = findFaqTitle();
    if (!t) return null;

    var sec = null;
    try{ sec = t.closest("section"); }catch(e){}
    if (sec) return sec;

    // Fallback: walk up to a likely card container
    var el = t;
    for (var i=0;i<12;i++){
      if (!el || !el.parentElement) break;
      var cls = String(el.className||"");
      if (/\b(ul-card|u-card|card)\b/i.test(cls)) return el;
      el = el.parentElement;
    }
    return t.parentElement || null;
  }

  // ---------- 4) Ensure banner location (between last block and FAQ, not inside FAQ) ----------
  function ensureBanner(){
    var faqOuter = findFaqOuter();
    if (!faqOuter) { log("[PATCH6.12] FAQ not found"); return; }

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
      banner.style.margin = "20px 0";
      banner.style.borderRadius = "18px";
      banner.style.overflow = "hidden";
      banner.style.boxShadow = "0 8px 24px rgba(17,24,39,.08)";
      banner.style.background = "#fff";

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

      a.appendChild(img);
      banner.appendChild(a);
    }

    // Place banner as sibling BEFORE FAQ outer
    try{
      if (faqOuter.parentElement){
        if (banner.parentElement !== faqOuter.parentElement){
          faqOuter.parentElement.insertBefore(banner, faqOuter);
        } else if (banner.nextSibling !== faqOuter){
          faqOuter.parentElement.insertBefore(banner, faqOuter);
        }
      }
    }catch(e){}

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

    // Safe link (avoid https://.../function link() ...)
    var href = norm(info.href);
    if (href && typeof href === "string"){
      // ignore accidental function stringification
      if (href.indexOf("function") === 0) href = "";
    }
    if (href && !/^https?:\/\//i.test(href)){
      if (!/^(mailto:|tel:)/i.test(href)) href = "https://" + href.replace(/^\/+/, "");
    }
    if (!href) href = "#";
    a.href = href;
    a.target = (href === "#") ? "_self" : "_blank";
  }

  function boot(){ try{ ensureBanner(); }catch(e){ log("[PATCH6.12] error", e); } }

  // Run when ready + after render/i18n changes (update in place)
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(boot, 0);
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(boot, 0); });

  window.addEventListener("ULYDIA:RENDER", function(){ setTimeout(boot, 0); });
  window.addEventListener("ULYDIA:I18N_UPDATE", function(){ setTimeout(boot, 0); });

  // In case FAQ arrives late
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
})();