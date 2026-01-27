(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.2
  // - Same as PATCH6.1 (clone + sync with SOURCE wide banner)
  // - Adds guaranteed spacing between banner and FAQ:
  //   inserts a spacer div (height 20px) between banner and FAQ card
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH62__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH62__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6.2]"].concat([].slice.call(arguments))); }catch(e){} }

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

  function findFaqAnchor(){
    var el = qs("#faq-title");
    if (el) return el;
    var any = qsa("[id]");
    for (var i=0;i<any.length;i++){
      var id = (any[i].id || "").toLowerCase();
      if (id && id.indexOf("faq") !== -1) return any[i];
    }
    return null;
  }

  function closestCard(el){
    if (!el) return null;
    return el.closest(".card,.u-section-card,.section-card,.u-card,[class*='card'],section,div");
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

  function ensureClone(src){
    var existing = qs("[data-ulydia-banner-beforefaq='1']");
    if (existing) return existing;

    var faqAnchor = findFaqAnchor();
    if (!faqAnchor) { log("waiting faq anchor..."); return null; }

    var faqCard = closestCard(faqAnchor);
    if (!faqCard || !faqCard.parentNode) { log("faq card not found"); return null; }

    var clone = src.cloneNode(true);
    clone.setAttribute("data-ulydia-banner-beforefaq", "1");

    if (clone.id) clone.id = clone.id + "-beforefaq";
    var innerIdNodes = qsa("[id]", clone);
    for (var j=0;j<innerIdNodes.length;j++){
      innerIdNodes[j].id = innerIdNodes[j].id + "-beforefaq";
    }

    clone.style.marginTop = "24px";
    clone.style.marginBottom = "0px"; // spacer handles bottom gap

    // Insert clone before FAQ, then spacer before FAQ (i.e., after clone)
    faqCard.parentNode.insertBefore(clone, faqCard);
    ensureSpacerBefore(faqCard);

    log("inserted + spacer before FAQ");
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
      var mo = new MutationObserver(function(){
        syncClone(src, clone);
      });
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

    var clone = ensureClone(src);
    if (!clone) return false;

    // ensure spacer still exists (in case something re-rendered)
    var faqAnchor = findFaqAnchor();
    var faqCard = closestCard(faqAnchor);
    if (faqCard) ensureSpacerBefore(faqCard);

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