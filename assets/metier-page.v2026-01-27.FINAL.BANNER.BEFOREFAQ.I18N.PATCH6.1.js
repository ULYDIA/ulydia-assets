(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.1 (sync with source)
  // Fixes PATCH6 issue where clone is inserted before source banner is populated.
  //
  // - Finds SOURCE banner as: a[data-ul-banner="wide"] (preferred) or #sponsor-banner-link
  // - Inserts CLONE before FAQ card (anchored via #faq-title, language-agnostic)
  // - Keeps CLONE in sync with SOURCE (href + innerHTML + key style attrs) using:
  //   - MutationObserver (child/style/attrs)
  //   - fallback periodic sync
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH61__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH61__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6.1]"].concat([].slice.call(arguments))); }catch(e){} }

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function findSourceBanner(){
    // most robust: banner prepared by BASE via forceAnchor(...data-ul-banner="wide")
    var el = qs('a[data-ul-banner="wide"]');
    if (el) return el;
    el = qs("#sponsor-banner-link");
    if (el) return el;
    // fallback by class
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

  function ensureClone(src){
    var existing = qs("[data-ulydia-banner-beforefaq='1']");
    if (existing) return existing;

    var faqAnchor = findFaqAnchor();
    if (!faqAnchor) { log("waiting faq anchor..."); return null; }

    var faqCard = closestCard(faqAnchor);
    if (!faqCard || !faqCard.parentNode) { log("faq card not found"); return null; }

    var clone = src.cloneNode(true);
    clone.setAttribute("data-ulydia-banner-beforefaq", "1");

    // Make IDs unique to avoid duplicates
    if (clone.id) clone.id = clone.id + "-beforefaq";
    var innerIdNodes = qsa("[id]", clone);
    for (var j=0;j<innerIdNodes.length;j++){
      innerIdNodes[j].id = innerIdNodes[j].id + "-beforefaq";
    }

    // spacing
    clone.style.marginTop = "24px";
    clone.style.marginBottom = "24px";

    faqCard.parentNode.insertBefore(clone, faqCard);
    log("inserted placeholder before FAQ");
    return clone;
  }

  function syncClone(src, clone){
    if (!src || !clone) return;

    // href
    try { clone.href = src.href || "#"; } catch(e){}

    // classes (keep clone's marker)
    try {
      var marker = "data-ulydia-banner-beforefaq";
      var keepMarker = clone.getAttribute(marker);
      clone.className = src.className || clone.className;
      if (keepMarker) clone.setAttribute(marker, keepMarker);
    } catch(e){}

    // copy key inline styles that control size/shape
    try {
      var props = ["width","maxWidth","height","borderRadius","overflow","display","marginLeft","marginRight","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat"];
      for (var i=0;i<props.length;i++){
        var p = props[i];
        if (src.style && src.style[p]) clone.style[p] = src.style[p];
      }
    } catch(e){}

    // innerHTML: important because BASE injects <img> later
    try {
      if ((src.innerHTML||"") && clone.innerHTML !== src.innerHTML) {
        clone.innerHTML = src.innerHTML;
      }
    } catch(e){}
  }

  function startSync(src, clone){
    // MutationObserver to sync when BASE updates source banner
    try {
      var mo = new MutationObserver(function(){
        syncClone(src, clone);
      });
      mo.observe(src, { attributes: true, childList: true, subtree: true, attributeFilter: ["href","style","class"] });
      // store ref (optional)
      clone.__ul_mo = mo;
    } catch(e){}

    // fallback periodic sync (in case of missed mutations)
    var ticks = 0;
    (function loop(){
      if (!document.body.contains(src) || !document.body.contains(clone)) return;
      syncClone(src, clone);
      ticks++;
      if (ticks < 200) setTimeout(loop, 150); // ~30s
      else setTimeout(loop, 1500); // then slow keepalive
    })();
  }

  function run(){
    var src = findSourceBanner();
    if (!src) { log("waiting source..."); return false; }

    var clone = ensureClone(src);
    if (!clone) return false;

    syncClone(src, clone);
    if (!clone.__ul_sync_started){
      clone.__ul_sync_started = true;
      startSync(src, clone);
    }

    // Consider success only if src has been populated OR we at least inserted clone
    return true;
  }

  (function loop(){
    if (run()) return;
    setTimeout(loop, 120);
  })();

})();