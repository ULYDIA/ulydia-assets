(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.7
  // Fix: duplicate banner returns inside FAQ card.
  //
  // What we do:
  // 1) Insert ONE clone (identical to the FIRST wide banner) BEFORE the FAQ card/container.
  // 2) Inside the FAQ CARD (the card that contains #faq-title), remove any banner element
  //    that appears BEFORE the FAQ title (this is the unwanted "second banner").
  // 3) Keep sponsor/non-sponsor + language behavior (clone sync with source).
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH67__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH67__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6.7]"].concat([].slice.call(arguments))); }catch(e){} }

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function findSourceBanner(){
    return (
      qs('a[data-ul-banner="wide"]') ||
      qs("#sponsor-banner-link") ||
      qsa(".sponsor-banner-wide")[0] ||
      null
    );
  }

  function findFaqTitle(){
    return qs("#faq-title") || qs("[id='faq-title']") || qs("[id*='faq' i]");
  }

  function findFaqCard(faqTitle){
    if (!faqTitle) return null;
    return faqTitle.closest(".card,.u-section-card,.section-card,.u-card,[class*='card']") || null;
  }

  function findFaqContainerForInsert(faqTitle){
    if (!faqTitle) return null;

    // Prefer explicit FAQ wrappers
    var wrap =
      faqTitle.closest(".faq-container") ||
      faqTitle.closest("[data-faq-container]") ||
      faqTitle.closest(".u-faq, .faq, .ul-faq");
    if (wrap) return wrap;

    // Else use the card's parent as insertion anchor
    var card = findFaqCard(faqTitle);
    if (card && card.parentElement) return card;

    return faqTitle.closest("section, .u-section, .section") || faqTitle.parentElement;
  }

  function isOurClone(node){
    return node && node.getAttribute && node.getAttribute("data-ulydia-banner-beforefaq") === "1";
  }

  function ensureSpacerBefore(node){
    if (!node || !node.parentNode) return null;
    var prev = node.previousElementSibling;
    if (prev && prev.getAttribute && prev.getAttribute("data-ulydia-banner-spacer") === "1") return prev;

    var sp = document.createElement("div");
    sp.setAttribute("data-ulydia-banner-spacer", "1");
    sp.style.height = "20px";
    sp.style.width = "100%";
    node.parentNode.insertBefore(sp, node);
    return sp;
  }

  function isBadHref(h){
    if (!h) return true;
    h = String(h).trim();
    if (!h) return true;
    var low = h.toLowerCase();
    if (low.indexOf("function") !== -1 && low.indexOf("native code") !== -1) return true;
    if (low.indexOf("javascript:") === 0) return true;
    if (low === "#" || low.indexOf("void(0)") !== -1) return true;
    return false;
  }

  function pickHref(src){
    var a = "";
    try { a = src.getAttribute("href") || ""; } catch(e){}
    if (a && !isBadHref(a)) return a;

    var d = "";
    try { d = src.getAttribute("data-href") || src.getAttribute("data-url") || ""; } catch(e){}
    if (d && !isBadHref(d)) return d;

    var p = "";
    try { p = src.href || ""; } catch(e){}
    if (typeof p === "string" && p && !isBadHref(p)) return p;

    return "";
  }

  function ensureCloneInsertedBefore(anchorNode, src){
    var existing = qs("[data-ulydia-banner-beforefaq='1']");
    if (existing) {
      if (anchorNode && existing.nextElementSibling !== anchorNode){
        try { anchorNode.parentNode.insertBefore(existing, anchorNode); } catch(e){}
      }
      return existing;
    }

    if (!anchorNode || !anchorNode.parentNode) return null;

    var clone = src.cloneNode(true);
    clone.setAttribute("data-ulydia-banner-beforefaq", "1");

    if (clone.id) clone.id = clone.id + "-beforefaq";
    var innerIdNodes = qsa("[id]", clone);
    for (var j=0;j<innerIdNodes.length;j++){
      innerIdNodes[j].id = innerIdNodes[j].id + "-beforefaq";
    }

    clone.style.marginTop = "24px";
    clone.style.marginBottom = "0px";

    anchorNode.parentNode.insertBefore(clone, anchorNode);
    ensureSpacerBefore(anchorNode);

    log("clone inserted before FAQ anchor");
    return clone;
  }

  function syncClone(src, clone){
    if (!src || !clone) return;

    // href (robust)
    var href = pickHref(src);
    if (href) {
      try { clone.setAttribute("href", href); } catch(e){}
      try { clone.removeAttribute("onclick"); clone.onclick = null; } catch(e){}
    } else {
      try {
        if (typeof src.onclick === "function") clone.onclick = src.onclick;
        var oc = src.getAttribute("onclick");
        if (oc) clone.setAttribute("onclick", oc);
      } catch(e){}
    }

    // target/rel
    try {
      var tgt = src.getAttribute("target");
      if (tgt) clone.setAttribute("target", tgt);
      var rel = src.getAttribute("rel");
      if (rel) clone.setAttribute("rel", rel);
    } catch(e){}

    // className keep marker
    try {
      var marker = "data-ulydia-banner-beforefaq";
      var keepMarker = clone.getAttribute(marker);
      clone.className = src.className || clone.className;
      if (keepMarker) clone.setAttribute(marker, keepMarker);
    } catch(e){}

    // inline style essentials
    try {
      var props = ["width","maxWidth","height","borderRadius","overflow","display","marginLeft","marginRight","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat"];
      for (var i=0;i<props.length;i++){
        var prop = props[i];
        if (src.style && src.style[prop]) clone.style[prop] = src.style[prop];
      }
    } catch(e){}

    // innerHTML (images)
    try {
      if ((src.innerHTML||"") && clone.innerHTML !== src.innerHTML) clone.innerHTML = src.innerHTML;
    } catch(e){}
  }

  function startSync(src, clone){
    try {
      var mo = new MutationObserver(function(){ syncClone(src, clone); });
      mo.observe(src, { attributes: true, childList: true, subtree: true, attributeFilter: ["href","style","class","target","rel","onclick"] });
      clone.__ul_mo = mo;
    } catch(e){}

    var ticks = 0;
    (function loop(){
      if (!document.body.contains(src) || !document.body.contains(clone)) return;
      syncClone(src, clone);
      ticks++;
      if (ticks < 200) setTimeout(loop, 150);
      else setTimeout(loop, 1500);
    })();
  }

  function isBannerLike(el){
    if (!el) return false;
    var id = (el.id || "").toLowerCase();
    var cls = (el.className || "").toString().toLowerCase();
    if (/sponsor|banner/.test(id) || /sponsor|banner/.test(cls)) return true;

    var img = qs("img", el);
    if (img) {
      var src = (img.getAttribute("src") || "").toLowerCase();
      var alt = (img.getAttribute("alt") || "").toLowerCase();
      if (src.indexOf("sponsor") !== -1 || src.indexOf("sponsori") !== -1 || alt.indexOf("sponsor") !== -1) return true;
      // common text banner
      var t = "";
      try { t = (el.textContent || "").toLowerCase(); } catch(e){}
      if (t.indexOf("sponsoriser ce métier") !== -1 || t.indexOf("sponsoriser ce metier") !== -1) return true;
    }
    return false;
  }

  function removeBannerInsideFaqCard(faqTitle){
    // Remove banner-like node that is inside the FAQ card AND appears before the FAQ title
    var card = findFaqCard(faqTitle);
    if (!card) return;

    // collect banner-like candidates inside card
    var candidates = qsa("a, div", card).filter(isBannerLike);
    if (!candidates.length) return;

    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      if (!el || !el.parentNode) continue;
      // do not remove if it contains the faq title
      if (el.contains(faqTitle)) continue;

      // only remove if it comes BEFORE faqTitle in DOM order
      var pos = 0;
      try { pos = el.compareDocumentPosition(faqTitle); } catch(e){}
      // DOCUMENT_POSITION_FOLLOWING = 4 means faqTitle is after el (good, remove el)
      if (pos & 4) {
        var wrapper = el.closest("a, .banner, .u-banner, .sponsor-banner") || el;
        if (wrapper && wrapper !== card && wrapper.parentNode) {
          try { wrapper.parentNode.removeChild(wrapper); log("removed banner inside FAQ card"); } catch(e){}
          break;
        } else if (wrapper === card) {
          // never remove card
        } else {
          try { el.parentNode.removeChild(el); log("removed element inside FAQ card"); } catch(e){}
          break;
        }
      }
    }
  }

  function run(){
    var src = findSourceBanner();
    if (!src) { log("waiting source..."); return false; }

    var faqTitle = findFaqTitle();
    if (!faqTitle) { log("waiting faq title..."); return false; }

    // 1) remove unwanted banner INSIDE FAQ card
    removeBannerInsideFaqCard(faqTitle);

    // 2) insert clone before FAQ anchor (card/container)
    var anchor = findFaqContainerForInsert(faqTitle);
    if (!anchor || !anchor.parentNode) { log("waiting anchor..."); return false; }

    var clone = ensureCloneInsertedBefore(anchor, src);
    if (!clone) return false;

    ensureSpacerBefore(anchor);

    // 3) sync clone
    syncClone(src, clone);
    if (!clone.__ul_sync_started){
      clone.__ul_sync_started = true;
      startSync(src, clone);
    }

    return true;
  }

  (function loop(){
    if (run()) return;
    setTimeout(loop, 150);
  })();

})();