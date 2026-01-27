(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.9 (SAFE)
  // Goal:
  // - Keep EXACT same behavior as the "first wide banner" (sponsor / non-sponsor / language)
  // - Insert ONE banner BETWEEN the last content card and the FAQ card
  // - NEVER keep a banner INSIDE the FAQ card/container
  // - Idempotent + no infinite DOM loop
  //
  // Replaces: PATCH6.8 (buggy)
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH69__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH69__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6.9]"].concat([].slice.call(arguments))); }catch(e){} }

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  // --------- find source wide banner (the one that already works) ----------
  function findSourceBanner(){
    // Prefer explicit marker if you have it
    return (
      qs('a[data-ul-banner="wide"]') ||
      qs("#sponsor-banner-link") ||
      qs("a.sponsor-banner-wide") ||
      qsa(".sponsor-banner-wide")[0] ||
      null
    );
  }

  // --------- identify FAQ area ----------
  function findFaqTitle(){
    return qs("#faq-title") || qs("[id='faq-title']") || null;
  }

  function closestCard(el){
    if (!el) return null;
    return el.closest(".card,.u-section-card,.section-card,.u-card,[class*='card']") || null;
  }

  function findFaqCard(faqTitle){
    return closestCard(faqTitle);
  }

  // Insert BEFORE this node (best anchor = FAQ card itself)
  function findFaqAnchor(faqTitle){
    if (!faqTitle) return null;
    var card = findFaqCard(faqTitle);
    if (card && card.parentElement) return card;
    // fallback: closest section
    return faqTitle.closest("section,.u-section,.section") || faqTitle.parentElement;
  }

  // --------- helpers ----------
  function isOurClone(node){
    return !!(node && node.getAttribute && node.getAttribute("data-ulydia-banner-beforefaq") === "1");
  }

  function isBannerLike(el){
    if (!el) return false;
    if (isOurClone(el)) return true;

    var id = (el.id || "").toLowerCase();
    var cls = (el.className || "").toString().toLowerCase();
    if (/sponsor|banner/.test(id) || /sponsor|banner/.test(cls)) return true;

    // text heuristic (your placeholder banner)
    var t = "";
    try { t = (el.textContent || "").toLowerCase(); } catch(e){}
    if (t.indexOf("sponsoriser ce métier") !== -1 || t.indexOf("sponsoriser ce metier") !== -1) return true;

    // image heuristic
    var img = qs("img", el);
    if (img) {
      var src = (img.getAttribute("src") || "").toLowerCase();
      var alt = (img.getAttribute("alt") || "").toLowerCase();
      if (src.indexOf("sponsor") !== -1 || alt.indexOf("sponsor") !== -1) return true;
    }
    return false;
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
    var h = "";
    try { h = src.getAttribute("href") || ""; } catch(e){}
    if (h && !isBadHref(h)) return h;

    try { h = src.getAttribute("data-href") || src.getAttribute("data-url") || ""; } catch(e){}
    if (h && !isBadHref(h)) return h;

    try { h = src.href || ""; } catch(e){}
    if (typeof h === "string" && h && !isBadHref(h)) return h;

    return "";
  }

  function ensureSpacerAfter(node){
    if (!node || !node.parentNode) return null;
    var next = node.nextElementSibling;
    if (next && next.getAttribute && next.getAttribute("data-ulydia-banner-spacer") === "1") return next;

    var sp = document.createElement("div");
    sp.setAttribute("data-ulydia-banner-spacer", "1");
    sp.style.height = "20px";
    sp.style.width = "100%";
    node.parentNode.insertBefore(sp, node.nextSibling);
    return sp;
  }

  function ensureCloneBefore(anchorNode, src){
    if (!anchorNode || !anchorNode.parentNode) return null;

    // if already exists: move it before anchor
    var existing = qs("[data-ulydia-banner-beforefaq='1']");
    if (existing && existing.parentNode) {
      if (existing.nextElementSibling !== anchorNode) {
        try { anchorNode.parentNode.insertBefore(existing, anchorNode); } catch(e){}
      }
      return existing;
    }

    var clone = src.cloneNode(true);
    clone.setAttribute("data-ulydia-banner-beforefaq", "1");

    // avoid duplicated ids inside clone
    if (clone.id) clone.id = clone.id + "-beforefaq";
    var withId = qsa("[id]", clone);
    for (var i=0;i<withId.length;i++){
      withId[i].id = withId[i].id + "-beforefaq";
    }

    // visual spacing (same as first banner, but keep your layout margins)
    clone.style.marginTop = "24px";
    clone.style.marginBottom = "0px";

    anchorNode.parentNode.insertBefore(clone, anchorNode);
    ensureSpacerAfter(clone);

    return clone;
  }

  function syncClone(src, clone){
    if (!src || !clone) return;

    // Keep className but keep marker attribute
    try {
      var keep = clone.getAttribute("data-ulydia-banner-beforefaq");
      clone.className = src.className || clone.className;
      clone.setAttribute("data-ulydia-banner-beforefaq", keep || "1");
    } catch(e){}

    // Copy inner html (image / overlay)
    try {
      var ih = src.innerHTML || "";
      if (ih && clone.innerHTML !== ih) clone.innerHTML = ih;
    } catch(e){}

    // Copy href/target/rel robustly (fix "function link() { [native code] }")
    var href = pickHref(src);
    if (href) {
      try { clone.setAttribute("href", href); } catch(e){}
      try { clone.removeAttribute("onclick"); clone.onclick = null; } catch(e){}
    } else {
      // last resort: if src has an onclick attribute string, mirror it
      try {
        var oc = src.getAttribute("onclick");
        if (oc) clone.setAttribute("onclick", oc);
      } catch(e){}
    }

    try {
      var tgt = src.getAttribute("target");
      if (tgt) clone.setAttribute("target", tgt);
      var rel = src.getAttribute("rel");
      if (rel) clone.setAttribute("rel", rel);
    } catch(e){}

    // Copy key inline styles (sizes)
    try {
      var props = ["width","maxWidth","height","borderRadius","overflow","display","marginLeft","marginRight","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat"];
      for (var j=0;j<props.length;j++){
        var p = props[j];
        if (src.style && src.style[p]) clone.style[p] = src.style[p];
      }
    } catch(e){}
  }

  function removeAnyBannerInsideFaq(faqTitle){
    var card = findFaqCard(faqTitle);
    if (!card) return;

    // remove any banner-like element inside the FAQ card, EXCEPT:
    // - anything that contains the faqTitle (avoid removing the card header)
    // - our clone if it somehow landed there (we'll move it later)
    var candidates = qsa("a, div, section", card).filter(isBannerLike);
    if (!candidates.length) return;

    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      if (!el || !el.parentNode) continue;
      if (el.contains(faqTitle)) continue;

      // do not remove if it's our clone (we will move it outside)
      if (isOurClone(el)) continue;

      try {
        el.parentNode.removeChild(el);
        log("removed banner-like inside FAQ card");
      } catch(e){}
    }
  }

  // --------- main ----------
  function runOnce(){
    var src = findSourceBanner();
    if (!src) return false;

    var faqTitle = findFaqTitle();
    if (!faqTitle) return false;

    // 1) remove unwanted inside FAQ card (prevents "2 banners inside FAQ")
    removeAnyBannerInsideFaq(faqTitle);

    // 2) insert/move ONE clone BEFORE FAQ card
    var anchor = findFaqAnchor(faqTitle);
    if (!anchor || !anchor.parentNode) return false;

    var clone = ensureCloneBefore(anchor, src);
    if (!clone) return false;

    // if clone accidentally ended up inside FAQ card, move it out
    var faqCard = findFaqCard(faqTitle);
    if (faqCard && faqCard.contains(clone)) {
      try { faqCard.parentNode.insertBefore(clone, faqCard); } catch(e){}
    }

    // Keep clone synced with source (but do NOT loop forever)
    syncClone(src, clone);

    // short sync window (covers async sponsor/banner updates)
    if (!clone.__ul_sync_started){
      clone.__ul_sync_started = true;

      // Observe src changes for 15s max
      var start = Date.now();
      var mo = null;

      try {
        mo = new MutationObserver(function(){
          syncClone(src, clone);
          if (Date.now() - start > 15000) {
            try { mo.disconnect(); } catch(e){}
          }
        });
        mo.observe(src, { attributes: true, childList: true, subtree: true, attributeFilter: ["href","style","class","target","rel","onclick"] });
      } catch(e){}

      // Also poll a bit (because sometimes href updates without mutation on the anchor)
      var ticks = 0;
      (function tick(){
        if (!document.body.contains(src) || !document.body.contains(clone)) return;
        syncClone(src, clone);
        ticks++;
        if (ticks < 120) setTimeout(tick, 125); // ~15s
      })();
    }

    return true;
  }

  // Retry loop BUT HARD STOP after 20s (prevents infinite loader loop if something is missing)
  (function loop(){
    var t0 = Date.now();
    (function step(){
      try{
        if (runOnce()) return;
      }catch(e){
        log("error", e);
        // do not throw; just stop retrying to avoid a crash loop
        return;
      }
      if (Date.now() - t0 > 20000) {
        log("stop retry after 20s (missing src/faq)");
        return;
      }
      setTimeout(step, 150);
    })();
  })();

})();