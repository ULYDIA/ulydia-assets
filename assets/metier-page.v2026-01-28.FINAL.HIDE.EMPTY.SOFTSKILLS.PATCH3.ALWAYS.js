(function(){
  'use strict';
  if (window.__ULYDIA_HIDE_EMPTY_SOFTSKILLS_PATCH3__) return;
  window.__ULYDIA_HIDE_EMPTY_SOFTSKILLS_PATCH3__ = true;

  var ROOT_ID = 'ulydia-metier-root';

  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function textLen(el){ return el ? norm(el.textContent).length : 0; }

  function hasMeaningfulContent(card){
    if (!card) return false;

    // Any list items / repeated items
    if (card.querySelector('li,[data-item],[data-ulydia-item],.ul-chip,.chip,.tag,.badge')) return true;

    // Any body rich text / paragraphs with enough text
    var body = card.querySelector('.card-body,.u-card-body,[data-body],[data-ulydia-body],.w-richtext,.rich-text,p');
    if (body && textLen(body) > 50) return true;

    // Any CTA / link / button inside card body
    // (Soft skills empty placeholder usually has none)
    var btns = card.querySelectorAll('button');
    var links = card.querySelectorAll('a[href]');
    if ((btns && btns.length) || (links && links.length)) return true;

    // Total text beyond title
    var h = card.querySelector('h1,h2,h3,h4,.card-title,.u-card-title,[data-title]');
    var headerLen = h ? textLen(h) : 0;
    var totalLen = textLen(card);
    return (totalLen - headerLen) > 90;
  }

  function isSoftSkillsCard(card){
    var h = card.querySelector('h1,h2,h3,h4,.card-title,.u-card-title,[data-title]');
    var title = norm(h ? h.textContent : '');
    if (!title) return false;
    return title.indexOf('soft skills') !== -1;
  }

  function removeEmptySoftSkills(){
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    var cards = Array.prototype.slice.call(root.querySelectorAll('.u-card,.section-card,.card,[data-ulydia-block]'));
    if (!cards.length) return;

    var removed = 0;
    cards.forEach(function(card){
      try{
        if (isSoftSkillsCard(card) && !hasMeaningfulContent(card)) {
          card.remove();
          removed++;
        }
      }catch(e){}
    });

    if (window.__METIER_PAGE_DEBUG__ && removed){
      console.log('[ULYDIA][HIDE_EMPTY_SOFTSKILLS][PATCH3] removed', removed);
    }
  }

  function boot(){
    removeEmptySoftSkills();
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    var obs = new MutationObserver(function(){ removeEmptySoftSkills(); });
    obs.observe(root, { childList:true, subtree:true });

    var t0 = Date.now();
    var id = setInterval(function(){
      removeEmptySoftSkills();
      if ((Date.now()-t0) > 8000) clearInterval(id);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
