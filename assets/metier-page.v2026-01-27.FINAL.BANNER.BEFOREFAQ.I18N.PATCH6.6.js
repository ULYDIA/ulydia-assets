(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.6
  // Fix: incorrect link on cloned banner (redirecting to "/function link() { [native code] }")
  //
  // Cause: some environments return non-URL values for .href (or .href gets overwritten).
  // Solution:
  //  - Prefer getAttribute("href") when it's a valid URL (absolute or relative).
  //  - Fallback to src.href only if it's a proper string URL.
  //  - If href is invalid but src has an onclick handler, clone it too.
  //
  // Also keeps PATCH6.5 behavior:
  //  - Insert BEFORE FAQ CONTAINER (between cards)
  //  - Remove legacy duplicate banner INSIDE FAQ container
  //  - Add spacing between banner and FAQ
  //  - Sync innerHTML/styles to remain identical to the first banner (sponsor/non-sponsor per language)
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH66__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH66__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6.6]"].concat([].slice.call(arguments))); }catch(e){} }

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function findSourceBanner(){
    var el = qs('a[data-ul-banner="wide"]');
    if (el) return el;
    el = qs("#sponsor-banner-link");
    if (el) return el;
    var list = qsa(".sponsor-banner-wide");
    if (list && list.length) return list[0];
    return null;
  }

  function findFaqTitle(){
    return qs("#faq-title") || qs("[id*='faq' i]");
  }

  function isOurClone(node){
    return node && node.getAttribute && node.getAttribute("data-ulydia-banner-beforefaq") === "1";
  }

  function findFaqContainer(faqTitle){
    if (!faqTitle) return null;

    var faqWrap =
      faqTitle.closest(".faq-container") ||
      faqTitle.closest("[data-faq-container]") ||
      faqTitle.closest(".u-faq, .faq, .ul-faq");

    if (faqWrap) return faqWrap;

    var faqCard = faqTitle.closest(".card,.u-section-card,.section-card,.u-card,[class*='card']");
    if (faqCard && faqCard.parentElement) return faqCard.parentElement;

    return faqTitle.closest("section, .u-section, .section") || faqTitle.parentElement;
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

  function looksSponsorText(el){
    var t = "";
    try { t = (el.textContent || "").toLowerCase(); } catch(e){}
    return t.indexOf("sponsoriser ce métier") !== -1 || t.indexOf("sponsoriser ce metier") !== -1;
  }

  function cleanupLegacyBannerInsideFaq(faqContainer){
    if (!faqContainer) return;
    var candidates = qsa("a, div", faqContainer);

    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      if (!el || !el.parentNode) continue;
      if (isOurClone(el)) continue;

      var id = (el.id || "").toLowerCase();
      var cls = (el.className || "").toString().toLowerCase();

      var img = qs("img", el);
      var imgSrc = img ? (img.getAttribute("src") || "") : "";
      var imgAlt = img ? (img.getAttribute("alt") || "") : "";

      var looksSponsor =
        /sponsor|sponsori|sponsoriz|sponsoris/i.test(id) ||
        /sponsor|banner/i.test(cls) ||
        (/sponsor|sponsori|sponsoriser|sponsoriz/i.test(imgSrc) || /sponsor|sponsori|sponsoriser|sponsoriz/i.test(imgAlt)) ||
        looksSponsorText(el);

      if (looksSponsor && img) {
        var wrapper = el.closest("a, .sponsor-banner, .banner, .u-banner") || el;
        if (wrapper && wrapper !== faqContainer && wrapper.parentNode) {
          if (wrapper.contains(qs("#faq-title", wrapper))) continue;
          try { wrapper.parentNode.removeChild(wrapper); log("removed legacy banner inside FAQ"); } catch(e){}
          break;
        }
      }
    }
  }

  function cleanupLegacyBannersBeforeFaqContainer(faqContainer){
    if (!faqContainer || !faqContainer.parentNode) return;

    var parent = faqContainer.parentNode;
    var siblings = Array.prototype.slice.call(parent.children || []);
    var idx = siblings.indexOf(faqContainer);
    if (idx < 0) return;

    for (var i=Math.max(0, idx-6); i<idx; i++){
      var n = siblings[i];
      if (!n) continue;
      if (isOurClone(n)) continue;
      if (n.getAttribute && n.getAttribute("data-ulydia-banner-spacer") === "1") continue;

      var id = (n.id || "").toLowerCase();
      var cls = (n.className || "").toString().toLowerCase();
      var img = qs("img", n);

      var looksLikeBanner =
        (id && /sponsor|banner/i.test(id)) ||
        (cls && /sponsor|banner/i.test(cls)) ||
        (n.tagName === "A" && !!img) ||
        looksSponsorText(n);

      if (looksLikeBanner) {
        try { parent.removeChild(n); log("removed legacy banner sibling before FAQ"); } catch(e){}
      }
    }
  }

  function ensureCloneInsertedBefore(faqContainer, src){
    var existing = qs("[data-ulydia-banner-beforefaq='1']");
    if (existing) {
      if (faqContainer && existing.nextElementSibling !== faqContainer){
        try { faqContainer.parentNode.insertBefore(existing, faqContainer); } catch(e){}
      }
      return existing;
    }

    if (!faqContainer || !faqContainer.parentNode) return null;

    var clone = src.cloneNode(true);
    clone.setAttribute("data-ulydia-banner-beforefaq", "1");

    if (clone.id) clone.id = clone.id + "-beforefaq";
    var innerIdNodes = qsa("[id]", clone);
    for (var j=0;j<innerIdNodes.length;j++){
      innerIdNodes[j].id = innerIdNodes[j].id + "-beforefaq";
    }

    clone.style.marginTop = "24px";
    clone.style.marginBottom = "0px";

    faqContainer.parentNode.insertBefore(clone, faqContainer);
    ensureSpacerBefore(faqContainer);

    log("inserted before FAQ CONTAINER");
    return clone;
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
    // 1) attribute href (best)
    var a = "";
    try { a = src.getAttribute("href") || ""; } catch(e){}
    if (a && !isBadHref(a)) return a;

    // 2) data attributes (optional)
    var d = "";
    try {
      d = src.getAttribute("data-href") || src.getAttribute("data-url") || "";
    } catch(e){}
    if (d && !isBadHref(d)) return d;

    // 3) property href (absolute)
    var p = "";
    try { p = src.href || ""; } catch(e){}
    if (typeof p === "string" && p && !isBadHref(p)) return p;

    return ""; // unresolved
  }

  function syncClone(src, clone){
    if (!src || !clone) return;

    // href: robust
    var href = pickHref(src);
    if (href) {
      try { clone.setAttribute("href", href); } catch(e){}
    }

    // target/rel
    try {
      var tgt = src.getAttribute("target");
      if (tgt) clone.setAttribute("target", tgt);
      var rel = src.getAttribute("rel");
      if (rel) clone.setAttribute("rel", rel);
    } catch(e){}

    // onclick fallback if href unresolved
    if (!href) {
      try {
        if (typeof src.onclick === "function") clone.onclick = src.onclick;
        var oc = src.getAttribute("onclick");
        if (oc) clone.setAttribute("onclick", oc);
      } catch(e){}
    } else {
      // if href ok, ensure no stale onclick that could override
      try { clone.removeAttribute("onclick"); clone.onclick = null; } catch(e){}
    }

    // className (keep our marker)
    try {
      var marker = "data-ulydia-banner-beforefaq";
      var keepMarker = clone.getAttribute(marker);
      clone.className = src.className || clone.className;
      if (keepMarker) clone.setAttribute(marker, keepMarker);
    } catch(e){}

    // copy key inline styles
    try {
      var props = ["width","maxWidth","height","borderRadius","overflow","display","marginLeft","marginRight","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat"];
      for (var i=0;i<props.length;i++){
        var prop = props[i];
        if (src.style && src.style[prop]) clone.style[prop] = src.style[prop];
      }
    } catch(e){}

    // innerHTML: keep identical image content
    try {
      if ((src.innerHTML||"") && clone.innerHTML !== src.innerHTML) {
        clone.innerHTML = src.innerHTML;
      }
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

  function run(){
    var src = findSourceBanner();
    if (!src) { log("waiting source..."); return false; }

    var faqTitle = findFaqTitle();
    if (!faqTitle) { log("waiting faq title..."); return false; }

    var faqContainer = findFaqContainer(faqTitle);
    if (!faqContainer || !faqContainer.parentNode) { log("waiting faq container..."); return false; }

    cleanupLegacyBannerInsideFaq(faqContainer);
    cleanupLegacyBannersBeforeFaqContainer(faqContainer);

    var clone = ensureCloneInsertedBefore(faqContainer, src);
    if (!clone) return false;

    ensureSpacerBefore(faqContainer);

    syncClone(src, clone);
    if (!clone.__ul_sync_started){
      clone.__ul_sync_started = true;
      startSync(src, clone);
    }
    return true;
  }

  (function loop(){
    if (run()) return;
    setTimeout(loop, 120);
  })();

})();