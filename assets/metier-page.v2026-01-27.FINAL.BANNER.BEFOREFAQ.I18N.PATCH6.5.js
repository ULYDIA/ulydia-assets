(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.5
  // - Keeps PATCH6.4 behavior (clone + sync with SOURCE wide banner)
  // - Inserts banner BETWEEN previous card and FAQ container (NOT inside FAQ container)
  // - Ensures ONLY ONE banner before FAQ:
  //     * removes legacy/duplicate banner elements INSIDE the FAQ container
  //     * removes extra banner-like siblings right before FAQ container (keeps our clone)
  // - Adds spacing between banner and FAQ
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH65__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH65__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6.5]"].concat([].slice.call(arguments))); }catch(e){} }

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

  function cleanupLegacyBannerInsideFaq(faqContainer){
    // Remove banner-like blocks that are INSIDE the FAQ container (the unwanted second banner)
    if (!faqContainer) return;

    // Heuristics: elements containing an <img> whose src/alt suggests sponsorship,
    // or elements with banner/sponsor classnames/ids.
    var candidates = qsa("a, div", faqContainer);

    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      if (!el || !el.parentNode) continue;

      // Don't remove our clone (it is outside faqContainer anyway) but keep safety:
      if (isOurClone(el)) continue;

      var id = (el.id || "").toLowerCase();
      var cls = (el.className || "").toString().toLowerCase();

      var img = qs("img", el);
      var imgSrc = img ? (img.getAttribute("src") || "") : "";
      var imgAlt = img ? (img.getAttribute("alt") || "") : "";

      var looksSponsor =
        /sponsor|sponsori|sponsoriz|sponsoris/i.test(id) ||
        /sponsor|banner/i.test(cls) ||
        (/sponsor|sponsori|sponsoriser|sponsoriz/i.test(imgSrc) || /sponsor|sponsori|sponsoriser|sponsoriz/i.test(imgAlt));

      // Also catch the exact promo banner by checking text content (limited)
      var txt = "";
      try { txt = (el.textContent || "").toLowerCase(); } catch(e){}
      if (!looksSponsor && txt && txt.indexOf("sponsoriser ce métier") !== -1) looksSponsor = true;
      if (!looksSponsor && txt && txt.indexOf("sponsoriser ce metier") !== -1) looksSponsor = true;

      // Only remove if element is "banner-like": contains an img and is fairly tall/wide
      if (looksSponsor && img) {
        // Remove the closest wrapper that is not the whole FAQ container
        var wrapper = el.closest("a, .sponsor-banner, .banner, .u-banner") || el;
        if (wrapper && wrapper !== faqContainer && wrapper.parentNode) {
          // Avoid removing FAQ header row if it contains icon images (unlikely)
          if (wrapper.contains(qs("#faq-title", wrapper))) continue;
          try { wrapper.parentNode.removeChild(wrapper); log("removed legacy banner inside FAQ"); } catch(e){}
          // After removing one, break to avoid accidental multiple removals
          break;
        }
      }
    }
  }

  function cleanupLegacyBannersBeforeFaqContainer(faqContainer){
    // Remove extra banner-like siblings just before faqContainer (keep our clone and spacer)
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
        (n.tagName === "A" && !!img);

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

  function syncClone(src, clone){
    if (!src || !clone) return;

    try { clone.href = src.href || "#"; } catch(e){}

    try {
      var marker = "data-ulydia-banner-beforefaq";
      var keepMarker = clone.getAttribute(marker);
      clone.className = src.className || clone.className;
      if (keepMarker) clone.setAttribute(marker, keepMarker);
    } catch(e){}

    try {
      var props = ["width","maxWidth","height","borderRadius","overflow","display","marginLeft","marginRight","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat"];
      for (var i=0;i<props.length;i++){
        var p = props[i];
        if (src.style && src.style[p]) clone.style[p] = src.style[p];
      }
    } catch(e){}

    try {
      if ((src.innerHTML||"") && clone.innerHTML !== src.innerHTML) {
        clone.innerHTML = src.innerHTML;
      }
    } catch(e){}
  }

  function startSync(src, clone){
    try {
      var mo = new MutationObserver(function(){ syncClone(src, clone); });
      mo.observe(src, { attributes: true, childList: true, subtree: true, attributeFilter: ["href","style","class"] });
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

    // 1) remove legacy banner inside FAQ container
    cleanupLegacyBannerInsideFaq(faqContainer);

    // 2) remove any legacy banner siblings right before FAQ container
    cleanupLegacyBannersBeforeFaqContainer(faqContainer);

    // 3) insert / position clone
    var clone = ensureCloneInsertedBefore(faqContainer, src);
    if (!clone) return false;

    // 4) ensure spacer
    ensureSpacerBefore(faqContainer);

    // 5) sync content with source
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