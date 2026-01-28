
(function(){
  'use strict';
  if (window.__ULYDIA_HIDE_EMPTY_BLOCKS_NO_MPB_PATCH1__) return;
  window.__ULYDIA_HIDE_EMPTY_BLOCKS_NO_MPB_PATCH1__ = true;

  var ROOT_ID = 'ulydia-metier-root';

  function norm(s){
    return String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function textLen(el){
    if (!el) return 0;
    return norm(el.textContent).length;
  }

  function hasMeaningfulContent(card){
    if (!card) return false;

    // If it contains list items, chips, tags, or any visible rich content => meaningful
    if (card.querySelector('li, .ul-chip, .chip, .tag, .badge, [data-item], [data-ulydia-item]')) return true;

    // Images/links/buttons inside body count as content
    if (card.querySelector('a[href], button, img, svg')) {
      // but ignore header icons only: if there's more than one interactive/image element, consider meaningful
      var all = card.querySelectorAll('a[href], button, img');
      if (all && all.length > 1) return true;
    }

    // Rich text / paragraphs
    var p = card.querySelector('p, .rich-text, .w-richtext');
    if (p && textLen(p) > 40) return true;

    // any div with decent text excluding header
    var body = card.querySelector('.card-body, .u-card-body, [data-body], [data-ulydia-body]');
    if (body && textLen(body) > 40) return true;

    // fallback: total text in card excluding header
    var header = card.querySelector('h1,h2,h3,h4,.card-title,.u-card-title,[data-title]');
    var headerLen = header ? textLen(header) : 0;
    var totalLen = textLen(card);
    return (totalLen - headerLen) > 60;
  }

  function isTargetEmptyCard(card){
    // We specifically want to remove the empty "Soft Skills essentiels" and any MPB-driven empty cards
    // when MPB is missing for the metier/country.
    var h = card.querySelector('h1,h2,h3,h4,.card-title,.u-card-title,[data-title]');
    var title = norm(h ? h.textContent : '');
    if (!title) return false;

    // Match FR + EN variants (safe)
    var isSoft = title.indexOf('soft skills') !== -1;
    var isKey = title.indexOf('compétences') !== -1 || title.indexOf('competences') !== -1 || title.indexOf('skills') !== -1;
    var isPartner = title.indexOf('partenaire') !== -1 || title.indexOf('partner') !== -1;

    // We remove only if empty
    if ((isSoft || isKey || isPartner) && !hasMeaningfulContent(card)) return true;

    // Also remove any card that is clearly empty (header + blank body)
    // (kept conservative)
    if (!hasMeaningfulContent(card)) {
      // if it has a visible header strip, and body seems empty, remove
      var total = textLen(card);
      if (total < 80) return true;
    }

    return false;
  }

  function getCards(root){
    // broad match of your UI cards
    return Array.prototype.slice.call(
      root.querySelectorAll('.u-card,.section-card,.card,[data-ulydia-block]')
    );
  }

  function removeEmptyCards(){
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    var cards = getCards(root);
    if (!cards.length) return;

    var removed = 0;
    cards.forEach(function(card){
      try{
        if (isTargetEmptyCard(card)) {
          card.remove();
          removed++;
        }
      }catch(e){}
    });

    // If the whole right column became empty, hide it (optional)
    try{
      var right = root.querySelector('.ul-2col-right,[data-ulydia-side="right"],[data-side="right"],.right-col');
      if (right) {
        var remaining = right.querySelectorAll('.u-card,.section-card,.card,[data-ulydia-block]');
        if (!remaining || remaining.length === 0) right.style.display = 'none';
      }
    }catch(e){}

    // Debug toggle
    if (window.__METIER_PAGE_DEBUG__ && removed) {
      console.log('[ULYDIA][HIDE_EMPTY_BLOCKS] removed', removed, 'empty cards');
    }
  }

  function boot(){
    removeEmptyCards();
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    // Observe changes (render can be progressive)
    var obs = new MutationObserver(function(){
      removeEmptyCards();
    });
    obs.observe(root, { childList:true, subtree:true });

    // Also retry a few times
    var t0 = Date.now();
    var id = setInterval(function(){
      removeEmptyCards();
      if ((Date.now()-t0) > 8000) clearInterval(id);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
