(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.3 (single + identical)
  // Requirements:
  // - MUST be identical to the first wide banner (sponsor OR non-sponsor + language fallbacks)
  // - MUST appear once (no duplicates)
  // - MUST keep spacing under banner (not stuck to FAQ)
  //
  // How:
  // - Source banner = a[data-ul-banner="wide"] (preferred), else #sponsor-banner-link/.sponsor-banner-wide
  // - Clone inserted before FAQ card (anchor #faq-title, language-agnostic)
  // - Clone kept in sync with source via MutationObserver + polling
  // - Cleanup removes any other "before FAQ" banners inserted by older patches
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH63__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH63__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6.3]"].concat([].slice.call(arguments))); }catch(e){} }

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
    sp.setAttribute("data-ulydia_banner_spacer", "1");
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
    clone.style.marginBottom = "0px"; // spacer handles the bottom gap

    faqCard.parentNode.insertBefore(clone, faqCard);
    ensureSpacerBefore(faqCard);

    log("inserted clone before FAQ");
    return clone;
  }

  function syncClone(src, clone){
    if (!src || !clone) return;

    try { clone.href = src.href || "#"; } catch(e){}

    // keep same innerHTML (BASE injects <img> here)
    try {
      if ((src.innerHTML||"") && clone.innerHTML !== src.innerHTML) clone.innerHTML = src.innerHTML;
    } catch(e){}

    // mirror key inline styles (size/shape)
    try {
      var props = ["width","maxWidth","height","borderRadius","overflow","display","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat"];
      for (var i=0;i<props.length;i++){
        var p = props[i];
        if (src.style && src.style[p]) clone.style[p] = src.style[p];
      }
    } catch(e){}

    // className (keep marker)
    try {
      var keep = clone.getAttribute("data-ulydia-banner-beforefaq");
      clone.className = src.className || clone.className;
      if (keep) clone.setAttribute("data-ulydia-banner-beforefaq", keep);
    } catch(e){}
  }

  function cleanupDuplicates(src, clone){
    // 1) Remove extra clones with marker (keep first)
    var clones = qsa("[data-ulydia-banner-beforefaq='1']");
    for (var i=1;i<clones.length;i++){
      try { clones[i].parentNode && clones[i].parentNode.removeChild(clones[i]); } catch(e){}
    }

    // 2) Remove "old patch" banners that may sit right before FAQ:
    //    scan previous siblings of FAQ card and remove any banner anchor
    //    that has the same href or same img src as source, but is NOT our clone.
    var faqAnchor = findFaqAnchor();
    var faqCard = closestCard(faqAnchor);
    if (!faqCard) return;

    ensureSpacerBefore(faqCard);

    var srcHref = "";
    try { srcHref = src && src.href ? String(src.href) : ""; } catch(e){}

    var srcImg = "";
    try {
      var img = src ? src.querySelector("img") : null;
      srcImg = img && img.src ? String(img.src) : "";
    } catch(e){}

    // check up to 6 previous siblings
    var prev = faqCard.previousElementSibling;
    var checked = 0;
    while (prev && checked < 6){
      checked++;
      // skip our clone + spacer
      if (prev === clone) { prev = prev.previousElementSibling; continue; }
      if (prev.getAttribute && prev.getAttribute("data-ulydia-banner-spacer") === "1"){ prev = prev.previousElementSibling; continue; }

      // Candidate banner anchors:
      var cand = null;
      if (prev.tagName === "A") cand = prev;
      else cand = prev.querySelector && prev.querySelector("a");

      if (cand && cand.getAttribute){
        var isOur = cand.getAttribute("data-ulydia-banner-beforefaq") === "1";
        if (!isOur){
          var candHref = "";
          try { candHref = cand.href ? String(cand.href) : ""; } catch(e){}
          var candImg = "";
          try { var ci = cand.querySelector("img"); candImg = ci && ci.src ? String(ci.src) : ""; } catch(e){}

          var match = false;
          if (srcHref && candHref && candHref === srcHref) match = true;
          if (srcImg && candImg && candImg === srcImg) match = true;

          if (match){
            // remove whole wrapper node (prev), not just anchor
            try { prev.parentNode && prev.parentNode.removeChild(prev); } catch(e){}
          }
        }
      }

      prev = faqCard.previousElementSibling;
    }
  }

  function startSync(src, clone){
    try {
      var mo = new MutationObserver(function(){
        syncClone(src, clone);
        cleanupDuplicates(src, clone);
      });
      mo.observe(src, { attributes: true, childList: true, subtree: true, attributeFilter: ["href","style","class"] });
      clone.__ul_mo = mo;
    } catch(e){}

    var ticks = 0;
    (function loop(){
      if (!document.body.contains(src) || !document.body.contains(clone)) return;
      syncClone(src, clone);
      cleanupDuplicates(src, clone);
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

    syncClone(src, clone);
    cleanupDuplicates(src, clone);

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