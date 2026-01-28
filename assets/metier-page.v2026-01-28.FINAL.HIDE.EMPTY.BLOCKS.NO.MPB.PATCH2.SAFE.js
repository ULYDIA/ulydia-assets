(function(){
  'use strict';
  if (window.__ULYDIA_HIDE_EMPTY_BLOCKS_NO_MPB_PATCH2__) return;
  window.__ULYDIA_HIDE_EMPTY_BLOCKS_NO_MPB_PATCH2__ = true;

  var ROOT_ID = 'ulydia-metier-root';

  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function textLen(el){ return el ? norm(el.textContent).length : 0; }

  // ---------------------------------------------------------
  // MPB detection (SAFE)
  // We only remove "empty placeholder" cards if MPB is ABSENT
  // ---------------------------------------------------------
  function hasMPBData(){
    try{
      var g =
        window.__ULYDIA_METIER_PAYS_BLOCS__ ||
        window.__ULYDIA_METIER_PAYS_BLOC__ ||
        window.__ULYDIA_MPB__ ||
        window.__ULYDIA_BLOC__ ||
        (window.__ULYDIA__ && (window.__ULYDIA__.mpb || window.__ULYDIA__.bloc)) ||
        null;

      if (Array.isArray(g)) return g.length > 0;
      if (g && typeof g === 'object') {
        // if it looks like a single MPB record with fields/content
        if (g.items && Array.isArray(g.items)) return g.items.length > 0;
        // common fields that would exist on MPB
        if (g.slug || g.iso || g.country || g.metier) return true;
        // any non-empty rich text field
        for (var k in g){
          if (!Object.prototype.hasOwnProperty.call(g,k)) continue;
          var v = g[k];
          if (typeof v === 'string' && norm(v).length > 40) return true;
          if (Array.isArray(v) && v.length) return true;
        }
      }
    }catch(e){}

    // DOM fallback: if MPB-driven sections exist, we consider MPB present
    try{
      var root = document.getElementById(ROOT_ID);
      if (!root) return false;

      // Your MPB sections often have strong colored headers and long bullet lists
      // We detect by typical titles present only when MPB exists.
      var titles = Array.prototype.slice.call(root.querySelectorAll('h2,h3,.u-card-title,.card-title,[data-title]'));
      var hit = 0;
      for (var i=0;i<titles.length;i++){
        var t = norm(titles[i].textContent);
        if (!t) continue;
        if (t.indexOf('environnements de travail') !== -1) hit++;
        if (t.indexOf('formation') !== -1) hit++;
        if (t.indexOf('accès au métier') !== -1) hit++;
        if (t.indexOf('marché') !== -1) hit++;
        if (t.indexOf('rémunération') !== -1 || t.indexOf('remuneration') !== -1) hit++;
        if (hit >= 1) return true;
      }

      // If there is at least one substantial MPB-like card body
      var rich = root.querySelector('.w-richtext, .rich-text, [data-ulydia-body]');
      if (rich && textLen(rich) > 200) return true;
    }catch(e){}

    return false;
  }

  // ---------------------------------------------------------
  // Empty-card detection (conservative)
  // ---------------------------------------------------------
  function hasMeaningfulContent(card){
    if (!card) return false;

    // list content or repeated items
    if (card.querySelector('li,[data-item],[data-ulydia-item],.ul-chip,.chip,.tag,.badge')) return true;

    // body text
    var body = card.querySelector('.card-body,.u-card-body,[data-body],[data-ulydia-body],.w-richtext,.rich-text');
    if (body && textLen(body) > 50) return true;

    // interactive content (exclude header-only icons)
    var links = card.querySelectorAll('a[href]');
    var imgs  = card.querySelectorAll('img');
    var btns  = card.querySelectorAll('button');
    if ((links && links.length) || (btns && btns.length) || (imgs && imgs.length)) {
      // Partner card often has image + button => meaningful
      if ((imgs && imgs.length) || (btns && btns.length) || (links && links.length > 0)) return true;
    }

    // fallback: text beyond title
    var h = card.querySelector('h1,h2,h3,h4,.card-title,.u-card-title,[data-title]');
    var headerLen = h ? textLen(h) : 0;
    var totalLen = textLen(card);
    return (totalLen - headerLen) > 90;
  }

  function isSoftSkillsEmptyCard(card){
    var h = card.querySelector('h1,h2,h3,h4,.card-title,.u-card-title,[data-title]');
    var title = norm(h ? h.textContent : '');
    if (!title) return false;

    // Soft Skills title in FR/EN
    if (title.indexOf('soft skills') === -1) return false;

    // Empty = no meaningful content in body
    return !hasMeaningfulContent(card);
  }

  function removeEmptyPlaceholdersOnlyWhenNoMPB(){
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    // ✅ If MPB exists, do NOTHING (never touch right column)
    if (hasMPBData()) return;

    // Only remove the empty Soft Skills placeholder card(s)
    var cards = Array.prototype.slice.call(root.querySelectorAll('.u-card,.section-card,.card,[data-ulydia-block]'));
    var removed = 0;
    cards.forEach(function(card){
      try{
        if (isSoftSkillsEmptyCard(card)) {
          card.remove();
          removed++;
        }
      }catch(e){}
    });

    // Do NOT hide the entire right column here — keep Partner visible if present.
    if (window.__METIER_PAGE_DEBUG__ && removed) {
      console.log('[ULYDIA][HIDE_EMPTY_BLOCKS][PATCH2] removed', removed, 'Soft Skills empty cards (MPB missing)');
    }
  }

  function boot(){
    removeEmptyPlaceholdersOnlyWhenNoMPB();

    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    // Observe progressive injections (but will early-return if MPB exists)
    var obs = new MutationObserver(function(){
      removeEmptyPlaceholdersOnlyWhenNoMPB();
    });
    obs.observe(root, { childList:true, subtree:true });

    // Retry for a short window
    var t0 = Date.now();
    var id = setInterval(function(){
      removeEmptyPlaceholdersOnlyWhenNoMPB();
      if ((Date.now()-t0) > 8000) clearInterval(id);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
