(function(){
  'use strict';

  // =========================================================
  // ULYDIA — Metier Page BASE.FIX15 (ANTI-LOOP + Response safe)
  // - Fix: fallback must implement headers.get + text/json/clone
  // - Blocks legacy FIX31 + /undefined (fetch only)
  // - Loads FIX13 base once
  // =========================================================

  if (window.__ULYDIA_BASE_FIX15__) return;
  window.__ULYDIA_BASE_FIX15__ = true;

  var BASE_SRC = 'https://ulydia-assets.pages.dev/assets/metier-page.v2026-01-25.FINAL.BASE.FIX13.SPONSORLINKFIX1.js';

  // -----------------------------
  // 1) Fetch hardening (SAFE)
  // -----------------------------
  var _fetch = window.fetch && window.fetch.bind(window);
  var lastWarn = { url: '', t: 0 };

  function shouldBlock(u){
    u = String(u || '').trim();
    if (!u || u === 'undefined' || u === 'null') return true;

    // /undefined (anywhere)
    if (/(^|\/)undefined(\b|\/|\?|#|$)/i.test(u)) return true;

    // deleted legacy assets you still see
    if (u.indexOf('metier-page.v2026-01-24.FIX31') !== -1) return true;

    return false;
  }

  function safeBlockedResponse(){
    // Always return something that supports headers.get + text/json
    try{
      return Promise.resolve(new Response('', { status: 204, statusText: 'Blocked by FIX15' }));
    }catch(e){
      var headers = { get: function(){ return null; } };
      return Promise.resolve({
        ok: false,
        status: 204,
        statusText: 'Blocked by FIX15',
        headers: headers,
        text: function(){ return Promise.resolve(''); },
        json: function(){ return Promise.resolve(null); },
        clone: function(){ return this; }
      });
    }
  }

  if (_fetch){
    window.fetch = function(input, init){
      try{
        var url = (typeof input === 'string') ? input : (input && input.url) ? input.url : String(input || '');
        if (shouldBlock(url)){
          var now = Date.now();
          if (url !== lastWarn.url || (now - lastWarn.t) > 1500){
            lastWarn = { url: url, t: now };
            console.warn('[FIX15] blocked fetch:', url);
          }
          return safeBlockedResponse();
        }
      }catch(e){}
      return _fetch(input, init);
    };
  }

  // -----------------------------
  // 2) Prevent multiple loader nodes
  // -----------------------------
  function dedupeLoader(){
    try{
      var styles = document.querySelectorAll('#ulydia_loader_styles');
      for (var i=1;i<styles.length;i++){ try{ styles[i].remove(); }catch(e){} }

      var overlays = document.querySelectorAll('#ulydia_overlay_loader');
      for (var j=1;j<overlays.length;j++){ try{ overlays[j].remove(); }catch(e){} }
    }catch(e){}
  }

  var tick = 0;
  var tmr = setInterval(function(){
    tick++; dedupeLoader();
    if (tick > 40) clearInterval(tmr);
  }, 250);

  // -----------------------------
  // 3) Load FIX13 base once
  // -----------------------------
  function loadOnce(){
    if (window.__ULYDIA_BASE_FIX13_LOADED__) return;
    if (document.querySelector('script[data-ulydia-base-fix13="1"]')) return;

    var s = document.createElement('script');
    s.src = BASE_SRC;
    s.defer = true;
    s.async = false;
    s.setAttribute('data-ulydia-base-fix13', '1');
    s.onload = function(){ window.__ULYDIA_BASE_FIX13_LOADED__ = true; dedupeLoader(); };
    s.onerror = function(){ console.error('[FIX15] failed to load base:', BASE_SRC); };
    document.head.appendChild(s);
  }

  loadOnce();

  window.__ULYDIA_FIX15__ = { baseSrc: BASE_SRC, dedupeLoader: dedupeLoader };
})();
