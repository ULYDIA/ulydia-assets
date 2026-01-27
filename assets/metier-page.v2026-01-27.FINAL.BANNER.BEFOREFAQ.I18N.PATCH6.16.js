(function(){
  "use strict";
  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH616__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH616__ = true;

  var DEBUG = false;
  function log(){ try{ if(DEBUG) console.log.apply(console, arguments);}catch(e){} }
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

  function looksWide(img){
    if (!img) return false;
    var w = Number(img.naturalWidth || img.width || 0);
    var h = Number(img.naturalHeight || img.height || 0);
    if (w && h && (w/h) >= 2.0) return true;
    return false;
  }
  function findTopWideBannerAnchor(){
    var byId = document.getElementById("sponsor-banner-link");
    if (byId && byId.querySelector("img")) return byId;
    var anchors = qa("a").filter(function(a){ return a.querySelector && a.querySelector("img"); });
    for (var i=0;i<anchors.length;i++){
      var img = anchors[i].querySelector("img");
      if (looksWide(img)) return anchors[i];
    }
    return null;
  }

  var TITLE_WORDS = [
    "questions fréquentes",
    "faq",
    "frequently asked questions",
    "domande frequenti",
    "preguntas frecuentes",
    "häufige fragen"
  ];

  function cardContainer(el){
    if (!el) return null;
    try{
      return el.closest(".card, .ul-card, .u-card, .faq-card, .ul-faq-card, [data-ul-section='faq'], .ul-faq, .js-faq");
    }catch(e){}
    return null;
  }

  function scoreFaqCard(card){
    if (!card) return 0;
    var txt = norm(card.textContent||"").toLowerCase();
    var score = 0;

    for (var i=0;i<TITLE_WORDS.length;i++){
      if (txt.indexOf(TITLE_WORDS[i]) >= 0) { score += 5; break; }
    }

    var qmarks = (txt.match(/\?/g)||[]).length;
    score += Math.min(10, qmarks);

    if (q("svg", card)) score += 2;
    if (q("[class*='chevron'], [class*='accordion'], [data-accordion], .accordion, .accordion-item, .faq-item, .ul-faq-item", card)) score += 4;

    var rows = qa("button, [role='button'], .faq-row, .accordion-trigger, .ul-faq-row", card).length;
    score += Math.min(10, Math.floor(rows/2));

    return score;
  }

  function findFaqCard(){
    var nodes = qa("h1,h2,h3,h4,div,span");
    var candidates = [];
    for (var i=0;i<nodes.length;i++){
      var t = norm(nodes[i].textContent||"").toLowerCase();
      if (!t) continue;
      for (var j=0;j<TITLE_WORDS.length;j++){
        if (t.indexOf(TITLE_WORDS[j]) >= 0){
          candidates.push(nodes[i]);
          break;
        }
      }
    }

    var bestCard = null, bestScore = 0;
    for (var k=0;k<candidates.length;k++){
      var c = cardContainer(candidates[k]);
      if (!c) continue;
      var sc = scoreFaqCard(c);
      if (sc > bestScore){
        bestScore = sc;
        bestCard = c;
      }
    }
    if (bestCard && bestScore >= 6) return bestCard;

    var cards = qa(".card, .ul-card, .u-card, [data-ul-section='faq'], .ul-faq, .js-faq, .ul-faq-card, .faq-card");
    for (var m=0;m<cards.length;m++){
      var s = scoreFaqCard(cards[m]);
      if (s > bestScore){
        bestScore = s;
        bestCard = cards[m];
      }
    }
    return (bestCard && bestScore >= 6) ? bestCard : null;
  }

  function styleBanner(banner){
    banner.style.margin = "18px 0";
    banner.style.borderRadius = "14px";
    banner.style.overflow = "hidden";
    banner.style.background = "#fff";
    banner.style.border = "1px solid rgba(226,232,240,1)";
    banner.style.boxShadow = "0 8px 24px rgba(17,24,39,.10)";
    banner.style.width = "100%";
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

  function sanitizeHref(href){
    href = norm(href);
    if (href && href.indexOf("function") === 0) href = "";
    if (href && !/^https?:\/\//i.test(href)){
      if (!/^(mailto:|tel:)/i.test(href)) href = "https://" + href.replace(/^\/+/, "");
    }
    return href || "#";
  }

  function setFromInfo(root, info){
    var img = q('[data-ul-banner-img="1"]', root);
    var a = q('[data-ul-banner-link="1"]', root);
    if (!img || !a) return false;
    root.style.display = "";
    if (img.getAttribute("src") !== info.url) img.setAttribute("src", info.url);
    img.alt = info.alt || "";
    var href = sanitizeHref(info.href);
    a.href = href;
    a.target = (href === "#") ? "_self" : "_blank";
    return true;
  }

  function setFromTop(root, topA){
    var imgTop = topA && topA.querySelector ? topA.querySelector("img") : null;
    if (!imgTop) return false;
    var src = norm(imgTop.currentSrc || imgTop.getAttribute("src") || "");
    if (!src) return false;
    var img = q('[data-ul-banner-img="1"]', root);
    var a = q('[data-ul-banner-link="1"]', root);
    if (!img || !a) return false;
    root.style.display = "";
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    img.alt = imgTop.getAttribute("alt") || "";
    var href = sanitizeHref(topA.getAttribute("href") || "");
    a.href = href;
    a.target = (href === "#") ? "_self" : "_blank";
    return true;
  }

  function ensureBanner(){
    var faqCard = findFaqCard();
    if (!faqCard || !faqCard.parentElement) { log("[PATCH6.16] FAQ card not found"); return; }

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

    var parent = faqCard.parentElement;
    if (banner.parentElement !== parent){
      parent.insertBefore(banner, faqCard);
    } else if (banner.nextSibling !== faqCard){
      parent.insertBefore(banner, faqCard);
    }

    syncWidth(banner, faqCard);

    var info = resolveBannerWide();
    if (info.kind !== "none" && info.url){
      if (setFromInfo(banner, info)) return;
    }

    var topA = findTopWideBannerAnchor();
    if (topA){
      if (setFromTop(banner, topA)) return;
    }

    banner.style.display = "none";
  }

  function boot(){ try{ ensureBanner(); }catch(e){ log("[PATCH6.16] error", e); } }

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
    setTimeout(function(){ try{ obs.disconnect(); }catch(e){} }, 8000);
  }catch(e){}
})();