/* =========================================================
   ULYDIA — Banner BEFORE FAQ (between Work env & FAQ) — I18N — PATCH6.11
   Fix:
   - More robust detection of the "main" wide banner (hero / top-of-page).
   - Always inject EXACTLY ONE copy between Work environments and the FAQ card.
   - Always remove any banner that ended up inside the FAQ card (duplicate).
   - Non-breaking: fully guarded + retry loop.

   Notes:
   - We intentionally CLONE existing DOM (so sponsor/non-sponsor + language banners stay identical).
   - We do NOT touch Webflow HTML.
========================================================= */
(function(){
  "use strict";

  var DEBUG = false;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, ["[PATCH6.11]"].concat([].slice.call(arguments))); }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function qs(sel, root){ try{ return (root||document).querySelector(sel);}catch(e){ return null; } }
  function qsa(sel, root){ try{ return Array.prototype.slice.call((root||document).querySelectorAll(sel)||[]);}catch(e){ return []; } }

  function ensureAnchor(a){
    if (!a) return;
    try{
      // make it clickable
      a.style.cursor = "pointer";
      a.style.pointerEvents = "auto";
      if (!a.getAttribute("target")) a.setAttribute("target","_blank");
      if (!a.getAttribute("rel")) a.setAttribute("rel","noopener");
    }catch(e){}
  }

  // ---------- 1) Locate the already-rendered MAIN wide banner ----------
  function findMainBannerNode(){
    // A) explicit ids / attrs if present
    var selectors = [
      '[data-ul-banner="wide"]',
      '[data-ul-banner="banner_1"]',
      '#ul-banner-wide',
      '#ulydia-banner-wide',
      '#ulydia-banner-1',
      '#ul-sponsor-banner-1',
      '#ul-banner-1',
      '[data-banner="wide"]'
    ];
    for (var i=0;i<selectors.length;i++){
      var el = qs(selectors[i]);
      if (el) return el;
    }

    // B) heuristic: find a "sponsor" banner image in the HERO area
    // We look for a wide-ish image with sponsor keyword in alt/text nearby.
    var imgs = qsa('img');
    for (var k=0;k<imgs.length;k++){
      var img = imgs[k];
      var alt = norm(img.getAttribute('alt')||'').toLowerCase();
      var src = norm(img.getAttribute('src')||'').toLowerCase();
      // must be likely a banner (not avatar/logo): hosted on webflow cdn + not tiny
      if (!src) continue;
      if (src.indexOf('cdn.prod.website-files.com') === -1 && src.indexOf('website-files.com') === -1) continue;
      // keyword helps, but not mandatory
      var hint = (alt.indexOf('sponsor')>-1 || alt.indexOf('sponsoriser')>-1 || src.indexOf('sponsor')>-1);

      // try read rendered size if available
      var w = img.naturalWidth || 0;
      var h = img.naturalHeight || 0;
      if (w && h && w < 500) continue; // avoid tiny icons
      if (w && h && (w/h) < 1.6) continue; // prefer wide

      if (hint || (w && h && w > 900 && (w/h) > 2.0)){
        // climb to a sensible clickable/container node
        var node = img;
        // prefer anchor wrapper
        if (img.closest){
          var a = img.closest('a');
          if (a) return a;
          // else take the closest "banner" wrapper
          var wrap = img.closest('[data-ul-banner], .ul-banner, .u-banner, .banner, .w-embed');
          if (wrap) return wrap;
          // fallback: a parent div up to 4 levels
          var p = img;
          for (var up=0; up<4; up++){
            if (!p || !p.parentElement) break;
            p = p.parentElement;
            if (p && p.tagName && String(p.tagName).toUpperCase()==='DIV') return p;
          }
        }
        return node;
      }
    }

    // C) last resort: first large wide image in the page
    var best = null;
    var bestScore = 0;
    imgs = qsa('img');
    for (k=0;k<imgs.length;k++){
      img = imgs[k];
      w = img.naturalWidth || 0;
      h = img.naturalHeight || 0;
      if (!w || !h) continue;
      if (w < 900) continue;
      var ratio = w/h;
      if (ratio < 1.8) continue;
      var score = w * ratio;
      if (score > bestScore){ bestScore = score; best = img; }
    }
    if (best){
      if (best.closest){
        var a2 = best.closest('a');
        if (a2) return a2;
        return best;
      }
      return best;
    }

    return null;
  }

  // ---------- 2) Locate the FAQ card/container ----------
  function findFaqTitle(){
    var el = qs('#faq-title');
    if (el) return el;
    el = qs('.js-faq-title, .ul-faq-title, [data-ul-faq-title]');
    if (el) return el;

    var wanted = [
      'questions fréquentes','faq',
      'frequently asked questions',
      'preguntas frecuentes',
      'domande frequenti',
      'häufig gestellte fragen'
    ];
    var nodes = qsa('h1,h2,h3,h4,h5,div,span');
    for (var i=0;i<nodes.length;i++){
      var t = norm(nodes[i].textContent||'').toLowerCase();
      if (!t) continue;
      for (var j=0;j<wanted.length;j++){
        if (t === wanted[j]) return nodes[i];
      }
    }
    return null;
  }

  function findFaqCard(){
    var t = findFaqTitle();
    if (!t) return null;
    var el = t;
    for (var i=0;i<7;i++){
      if (!el || !el.parentElement) break;
      // if this element contains faq items, it's a good container
      if (qs('.ul-faq-item, [data-ul-faq-item], .js-faq-item', el)) return el;
      var cls = String(el.className||'');
      if (/\b(ul-card|u-card|card)\b/i.test(cls)) return el;
      el = el.parentElement;
    }
    return (t.closest ? (t.closest('section') || t.closest('div')) : t.parentElement);
  }

  // ---------- 3) Remove any duplicate banners inside FAQ, and our previous clones ----------
  function removeInjected(){
    qsa('#ul-beforefaq-banner, [data-ul-beforefaq-banner="1"], [data-ul-banner="wide-clone"]').forEach(function(n){
      try{ n.remove(); }catch(e){}
    });

    var faq = findFaqCard();
    if (!faq) return;

    // remove banner-like images inside FAQ (this is the one you don't want)
    qsa('img', faq).forEach(function(img){
      try{
        var alt = norm(img.getAttribute('alt')||'').toLowerCase();
        var src = norm(img.getAttribute('src')||'').toLowerCase();
        if (!src) return;
        var isSponsor = (alt.indexOf('sponsor')>-1 || alt.indexOf('sponsoriser')>-1 || src.indexOf('sponsor')>-1);
        var w = img.naturalWidth || 0;
        var h = img.naturalHeight || 0;
        var isWide = (w && h) ? ((w/h) > 1.6 && w > 700) : false;
        if (isSponsor || isWide){
          // remove closest banner wrapper if possible, else the img
          var wrap = img.closest ? (img.closest('[data-ul-banner], .ul-banner, .u-banner, .banner, a, div') ) : null;
          if (wrap && wrap !== faq) {
            // only remove if wrapper doesn't contain faq items
            if (!qs('.ul-faq-item, [data-ul-faq-item], .js-faq-item', wrap)) {
              try{ wrap.remove(); }catch(e){}
              return;
            }
          }
          try{ img.remove(); }catch(e){}
        }
      }catch(e){}
    });
  }

  // ---------- 4) Clone banner and insert right BEFORE FAQ card ----------
  function buildClone(source){
    if (!source) return null;
    var clone = null;
    try{ clone = source.cloneNode(true); }catch(e){ clone = null; }
    if (!clone) return null;

    try{
      clone.id = 'ul-beforefaq-banner';
      clone.setAttribute('data-ul-beforefaq-banner','1');
      clone.setAttribute('data-ul-banner','wide-clone');
    }catch(e){}

    // prevent duplicated IDs inside clone
    try{ qsa('[id]', clone).forEach(function(el){ if (el !== clone) el.removeAttribute('id'); }); }catch(e){}

    // spacing like the design
    try{
      clone.style.display = '';
      clone.style.width = '100%';
      clone.style.marginTop = '18px';
      clone.style.marginBottom = '24px';
    }catch(e){}

    // ensure click
    try{
      var a = (String(clone.tagName||'').toUpperCase()==='A') ? clone : (clone.querySelector ? clone.querySelector('a') : null);
      if (a) ensureAnchor(a);
    }catch(e){}

    return clone;
  }

  function insert(){
    removeInjected();

    var source = findMainBannerNode();
    if (!source) { log('source banner not found'); return false; }

    var faqCard = findFaqCard();
    if (!faqCard || !faqCard.parentElement) { log('faq card not found'); return false; }

    // already inserted?
    if (qs('#ul-beforefaq-banner')) return true;

    var clone = buildClone(source);
    if (!clone) return false;

    try{
      faqCard.parentElement.insertBefore(clone, faqCard);
      log('inserted before faq');
      return true;
    }catch(e){
      log('insert failed', e);
      return false;
    }
  }

  // ---------- 5) retry loop (safe) ----------
  var started = Date.now();
  (function tick(){
    var ok = false;
    try{ ok = insert(); }catch(e){ ok = false; }
    if (ok) return;
    if ((Date.now()-started) > 25000) return;
    setTimeout(tick, 200);
  })();

  function rerun(){
    setTimeout(function(){ try{ insert(); }catch(e){} }, 50);
    setTimeout(function(){ try{ insert(); }catch(e){} }, 400);
    setTimeout(function(){ try{ insert(); }catch(e){} }, 1200);
  }

  window.addEventListener('ULYDIA:I18N_UPDATE', rerun);
  window.addEventListener('ULYDIA:RENDER_DONE', rerun);
  window.addEventListener('hashchange', rerun);
  window.addEventListener('popstate', rerun);
})();
