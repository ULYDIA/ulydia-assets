(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6 (robust)
  // Goal:
  // - Restore the "second sponsor banner" that should appear BEFORE the FAQ section.
  // - Works regardless of language (does NOT rely on text matching).
  //
  // Strategy:
  // 1) Find the main sponsor wide banner (source) by:
  //    - #sponsor-banner-link OR .sponsor-banner-wide
  // 2) Clone it (deep) and insert it before the FAQ card found by:
  //    - #faq-title (preferred) OR any element with id containing "faq"
  // 3) Avoid duplicates via data attribute.
  //
  // Safe:
  // - Does not change sponsor URLs/content; only clones DOM.
  // - Retries until elements exist.
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH6__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH6__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, ["[banner.beforefaq.patch6]"].concat([].slice.call(arguments))); }catch(e){} }

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function findSourceBanner(){
    var el = qs("#sponsor-banner-link");
    if (el) return el;
    var list = qsa(".sponsor-banner-wide");
    if (list && list.length) return list[0];
    return null;
  }

  function findFaqAnchor(){
    var el = qs("#faq-title");
    if (el) return el;
    // fallback: any id containing faq
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

  function alreadyInserted(){
    return !!qs("[data-ulydia-banner-beforefaq='1']");
  }

  function insert(){
    if (alreadyInserted()) return true;

    var src = findSourceBanner();
    if (!src) { log("waiting source banner..."); return false; }

    var faqAnchor = findFaqAnchor();
    if (!faqAnchor) { log("waiting faq anchor..."); return false; }

    var faqCard = closestCard(faqAnchor);
    if (!faqCard || !faqCard.parentNode) { log("faq card not found"); return false; }

    var clone = src.cloneNode(true);
    clone.setAttribute("data-ulydia-banner-beforefaq", "1");

    // Make IDs unique to avoid duplicates
    if (clone.id) clone.id = clone.id + "-beforefaq";
    var innerIdNodes = qsa("[id]", clone);
    for (var j=0;j<innerIdNodes.length;j++){
      innerIdNodes[j].id = innerIdNodes[j].id + "-beforefaq";
    }

    // Spacing: align with design
    clone.style.marginTop = "24px";
    clone.style.marginBottom = "24px";

    // Insert right before FAQ card
    faqCard.parentNode.insertBefore(clone, faqCard);

    log("inserted before FAQ");
    return true;
  }

  (function loop(){
    if (insert()) return;
    setTimeout(loop, 120);
  })();

})();