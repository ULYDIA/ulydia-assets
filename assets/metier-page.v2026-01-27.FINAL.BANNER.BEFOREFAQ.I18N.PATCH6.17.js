(function(){
  "use strict";
  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH617__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH617__ = true;

  var STATUS = window.__ULYDIA_BANNER_BEFOREFAQ_STATUS__ = window.__ULYDIA_BANNER_BEFOREFAQ_STATUS__ || {};
  STATUS.patch = "PATCH6.17";
  STATUS.ran = true;
  STATUS.steps = STATUS.steps || [];
  function step(msg){
    try{ STATUS.steps.push({ t: Date.now(), msg: msg }); STATUS.last = msg; }catch(e){}
  }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

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

  function ratio(img){
    try{
      var w = Number(img.naturalWidth || img.width || 0);
      var h = Number(img.naturalHeight || img.height || 0);
      if (w && h) return (w/h);
    }catch(e){}
    return 0;
  }

  function findTopWideBannerAnchor(){
    var byId = document.getElementById("sponsor-banner-link");
    if (byId && byId.querySelector("img")) return byId;

    var anchors = qa("a").filter(function(a){ return a.querySelector && a.querySelector("img"); });
    var best = null, bestR = 0;
    for (var i=0;i<anchors.length;i++){
      var img = anchors[i].querySelector("img");
      var r = ratio(img);
      if (r > bestR){
        bestR = r;
        best = anchors[i];
      }
    }
    return (best && bestR >= 1.6) ? best : null;
  }

  var TITLE_WORDS = [
    "questions fréquentes",
    "faq",
    "frequently asked",
    "domande frequenti",
    "preguntas frecuentes",
    "häufige fragen"
  ];

  function findFaqTitleNode(){
    var t = q('[data-ul-faq-title], .ul-faq-title, .js-faq-title, .js-faq-header-title');
    if (t) return t;

    var nodes = qa("h1,h2,h3,h4,div,span");
    for (var i=0;i<nodes.length;i++){
      var txt = norm(nodes[i].textContent||"").toLowerCase();
      if (!txt) continue;
      for (var j=0;j<TITLE_WORDS.length;j++){
        if (txt.indexOf(TITLE_WORDS[j]) >= 0) return nodes[i];
      }
    }
    return null;
  }

  function findFaqCard(){
    var title = findFaqTitleNode();
    if (!title) return null;

    try{
      var card = title.closest(".card, .ul-card, .u-card, .faq-card, .ul-faq-card, [data-ul-section='faq'], .ul-faq, .js-faq");
      if (card) return card;
    }catch(e){}

    var el = title;
    for (var i=0;i<12;i++){
      if (!el || !el.parentElement) break;
      el = el.parentElement;
      var cls = String(el.className||"");
      if (/\b(card|ul-card|u-card|faq)\b/i.test(cls)) return el;
    }
    return title.parentElement || null;
  }

  function getOrCreateBanner(){
    var banner = q("#ul-beforefaq-banner");
    if (banner) return banner;

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

    banner.style.margin = "18px 0";
    banner.style.borderRadius = "14px";
    banner.style.overflow = "hidden";
    banner.style.background = "#fff";
    banner.style.border = "1px solid rgba(226,232,240,1)";
    banner.style.boxShadow = "0 8px 24px rgba(17,24,39,.10)";
    banner.style.width = "100%";

    try{
      (document.body || document.documentElement).insertBefore(banner, (document.body||document.documentElement).firstChild);
    }catch(e){}
    step("banner-created");
    return banner;
  }

  function sanitizeHref(href){
    href = norm(href);
    if (href && href.indexOf("function") === 0) href = "";
    if (href && !/^https?:\/\//i.test(href)){
      if (!/^(mailto:|tel:)/i.test(href)) href = "https://" + href.replace(/^\/+/, "");
    }
    return href || "#";
  }

  function updateBannerContent(banner){
    var img = q('[data-ul-banner-img="1"]', banner);
    var a = q('[data-ul-banner-link="1"]', banner);
    if (!img || !a) return;

    var info = resolveBannerWide();
    if (info.kind !== "none" && info.url){
      banner.style.display = "";
      if (img.getAttribute("src") !== info.url) img.setAttribute("src", info.url);
      img.alt = info.alt || "";
      var href = sanitizeHref(info.href);
      a.href = href;
      a.target = (href === "#") ? "_self" : "_blank";
      step("content-from-window");
      return;
    }

    var topA = findTopWideBannerAnchor();
    if (topA){
      var imgTop = topA.querySelector("img");
      var src = norm(imgTop.currentSrc || imgTop.getAttribute("src") || "");
      if (src){
        banner.style.display = "";
        if (img.getAttribute("src") !== src) img.setAttribute("src", src);
        img.alt = imgTop.getAttribute("alt") || "";
        var href2 = sanitizeHref(topA.getAttribute("href") || "");
        a.href = href2;
        a.target = (href2 === "#") ? "_self" : "_blank";
        step("content-from-topbanner");
        return;
      }
    }

    banner.style.display = "none";
    step("content-none");
  }

  function syncWidth(banner, card){
    try{
      var w = card && card.getBoundingClientRect ? card.getBoundingClientRect().width : 0;
      if (!w || w < 200) return;
      banner.style.maxWidth = Math.round(w) + "px";
      banner.style.marginLeft = "auto";
      banner.style.marginRight = "auto";
    }catch(e){}
  }

  function placeBanner(banner){
    var faqCard = findFaqCard();
    if (!faqCard || !faqCard.parentElement) { step("faq-not-found"); return; }

    var parent = faqCard.parentElement;
    if (banner.parentElement !== parent){
      parent.insertBefore(banner, faqCard);
    } else if (banner.nextSibling !== faqCard){
      parent.insertBefore(banner, faqCard);
    }

    syncWidth(banner, faqCard);
    step("placed-before-faq");
  }

  function boot(){
    try{
      var banner = getOrCreateBanner();
      updateBannerContent(banner);
      placeBanner(banner);
    }catch(e){
      step("boot-error:" + (e && e.message ? e.message : "unknown"));
    }
  }

  function schedule(){
    setTimeout(boot, 0);
    setTimeout(boot, 250);
    setTimeout(boot, 700);
    setTimeout(boot, 1400);
    setTimeout(boot, 2200);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") schedule();
  document.addEventListener("DOMContentLoaded", schedule);

  window.addEventListener("ULYDIA:RENDER", schedule);
  window.addEventListener("ULYDIA:I18N_UPDATE", schedule);
  window.addEventListener("resize", function(){ setTimeout(boot, 120); });

  try{
    var obs = new MutationObserver(function(){ boot(); });
    obs.observe(document.documentElement, {childList:true, subtree:true});
    setTimeout(function(){ try{ obs.disconnect(); }catch(e){} }, 10000);
  }catch(e){}
})();