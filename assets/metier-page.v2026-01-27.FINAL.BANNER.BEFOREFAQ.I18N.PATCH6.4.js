(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.4 (final placement)
  // Requirements:
  // - Banner must be IDENTICAL to the first (sponsor OR non-sponsor per language)
  // - Insert BETWEEN the previous section card and the FAQ section,
  //   NOT inside the FAQ container.
  // - Avoid duplicates (remove legacy inserted banners near FAQ)
  // - Add spacing so it's not glued to FAQ
  //
  // Strategy:
  // - Source banner: a[data-ul-banner="wide"] (preferred), else #sponsor-banner-link, else .sponsor-banner-wide
  // - Target anchor: #faq-title
  // - Insert BEFORE the FAQ CONTAINER (closest wrapper), not the FAQ card itself.
  // - Sync clone with source via MutationObserver + periodic sync (href + innerHTML + styles)
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH64__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH64__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6.4]"].concat([].slice.call(arguments))); }catch(e){} }

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

  function cleanupLegacyBannersAround(faqContainer){
    if (!faqContainer) return;
    var parent = faqContainer.parentNode;
    if (!parent) return;

    var siblings = Array.prototype.slice.call(parent.children || []);
    var idx = siblings.indexOf(faqContainer);
    if (idx < 0) return;

    for (var i=Math.max(0, idx-6); i<idx; i++){
      var n = siblings[i];
      if (!n) continue;
      if (isOurClone(n)) continue;
      if (n.getAttribute && n.getAttribute("data-ulydia-banner-spacer") === "1") continue;

      var looksLikeBanner =
        (n.id && /sponsor/i.test(n.id)) ||
        (n.className && /sponsor-banner|banner/i.test(String(n.className))) ||
        ((n.tagName === "A" || n.tagName === "DIV") && !!qs("img", n) && /rounded/i.test(String(n.className||"")));

      if (looksLikeBanner) {
        try { parent.removeChild(n); } catch(e){}
      }
    }
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

    cleanupLegacyBannersAround(faqContainer);

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