(function(){
  // =========================================================
  // ULYDIA — Hide empty cards (Soft Skills + others)
  // - Hides the "🧠 Soft Skills essentiels" card if it contains no items.
  // Safe: purely DOM-level.
  // =========================================================
  function norm(s){ return String(s||"").replace(/\u00a0/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim(); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function hideIfEmptyCard(card){
    if (!card) return;
    // If any list item / chip / badge exists with non-empty text => keep
    var has = false;
    qsa("li, .u-chip, .chip, .badge, a, span, div", card).forEach(function(el){
      if (has) return;
      var t = norm(el.textContent||"");
      if (!t) return;
      // ignore the card title itself
      if (t.indexOf("Soft Skills") !== -1) return;
      has = true;
    });
    if (!has) card.style.display = "none";
  }

  function apply(){
    // locate by title text
    var cards = qsa("div");
    for (var i=0;i<cards.length;i++){
      var el = cards[i];
      var t = norm(el.textContent||"");
      if (t && t.indexOf("Soft Skills essentiels") !== -1){
        hideIfEmptyCard(el);
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();

  window.addEventListener("ulydia:mpb:change", function(){ setTimeout(apply, 0); });

})();