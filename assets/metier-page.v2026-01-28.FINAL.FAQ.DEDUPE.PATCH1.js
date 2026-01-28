/* =========================================================
   ULYDIA — FAQ DEDUPE ONLY (PATCH1)
   - In case FAQ is rendered twice (JS + template), hide duplicates safely.
   ========================================================= */
(function(){
  'use strict';
  if (window.__ULYDIA_FAQ_DEDUPE_PATCH1__) return;
  window.__ULYDIA_FAQ_DEDUPE_PATCH1__ = true;

  function norm(s){ return String(s||'').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim(); }

  function dedupe(){
    var root = document.getElementById('ulydia-metier-root') || document.body;
    if (!root) return;

    var headings = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,div,span'));
    var faqHeads = headings.filter(function(n){
      var t = norm(n.textContent).toLowerCase();
      return t === 'questions fréquentes' ||
             t === 'frequently asked questions' ||
             t === 'häufig gestellte fragen' ||
             t === 'preguntas frecuentes' ||
             t === 'domande frequenti';
    });

    var containers = [];
    faqHeads.forEach(function(h){
      var cur = h;
      for (var k=0;k<7;k++){
        if (!cur || !cur.parentElement) break;
        cur = cur.parentElement;
        if (cur.classList && (cur.classList.contains('card') || cur.classList.contains('u-card') || cur.classList.contains('ul-card'))) {
          containers.push(cur);
          break;
        }
      }
    });

    // fallback by common selectors
    var cand = Array.prototype.slice.call(document.querySelectorAll('[data-ul-section="faq"], .ul-faq, .js-faq, .faq-card, .ul-faq-card'));
    containers = containers.concat(cand);

    // unique
    containers = containers.filter(function(x, idx, arr){ return x && arr.indexOf(x) === idx; });

    if (containers.length <= 1) return;

    var keep = null;
    for (var i=0;i<containers.length;i++){
      if (root.contains(containers[i])) { keep = containers[i]; break; }
    }
    if (!keep) keep = containers[0];

    containers.forEach(function(c){
      if (c === keep) return;
      c.setAttribute('data-ul-faq-duplicate','1');
      c.style.display = 'none';
    });
  }

  var t=null;
  function schedule(){ if (t) clearTimeout(t); t=setTimeout(function(){t=null; dedupe();}, 80); }

  function boot(){
    schedule();
    var started = Date.now();
    var obs = new MutationObserver(function(){
      schedule();
      if (Date.now() - started > 2500) try{ obs.disconnect(); }catch(e){}
    });
    try{ obs.observe(document.body, { childList:true, subtree:true }); }catch(e){}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();