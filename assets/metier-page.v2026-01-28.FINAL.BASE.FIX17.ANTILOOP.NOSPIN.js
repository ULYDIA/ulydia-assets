(function(){
  'use strict';

  // =========================================================
  // ULYDIA — Metier Page BASE.FIX17 (ANTI-LOOP + NO WHITE FLASH)
  // =========================================================
  // Goals:
  // - Keep ONLY the loader from FIX13 (no extra overlays/spinners here)
  // - Prevent "blank frames" caused by a second render cycle that clears
  //   #ulydia-metier-root (root.innerHTML = "" / textContent = "" / replaceChildren())
  // - Still harden fetch(undefined) + dedupe legacy loaders + load FIX13 once
  //
  // NOTE: We don't modify FIX13. We wrap DOM-clearing operations for the root.

  if (window.__ULYDIA_BASE_FIX17__) return;
  window.__ULYDIA_BASE_FIX17__ = true;

  var BASE_SRC = 'https://ulydia-assets.pages.dev/assets/metier-page.v2026-01-25.FINAL.BASE.FIX13.SPONSORLINKFIX1.js';

  // -----------------------------
  // 0) Root anti-clear guard
  // -----------------------------
  function isRoot(node){
    return !!(node && node.nodeType === 1 && node.id === 'ulydia-metier-root');
  }

  function hasRealContent(root){
    try{
      if (!root) return false;
      var txt = (root.textContent || '').replace(/\s+/g,' ').trim();
      if (txt.length < 80) return false;
      var strong = root.querySelector('h1,h2,[data-ulydia-block],.u-card,.section-card,.card,article,section');
      if (strong && strong.offsetHeight > 30) return true;
      // fallback: height
      var rect = root.getBoundingClientRect ? root.getBoundingClientRect() : null;
      if (rect && rect.height > 220) return true;
      return false;
    }catch(e){ return false; }
  }

  // Allow manual rerender if you ever need it:
  // window.__ULYDIA_ALLOW_ROOT_CLEAR__ = true;
  function shouldBlockClear(root){
    if (window.__ULYDIA_ALLOW_ROOT_CLEAR__) return false;
    return hasRealContent(root);
  }

  function installDomGuards(){
    if (window.__ULYDIA_ROOT_GUARDS_INSTALLED__) return;
    window.__ULYDIA_ROOT_GUARDS_INSTALLED__ = true;

    // Guard innerHTML = ""
    try{
      var d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
      if (d && typeof d.set === 'function'){
        Object.defineProperty(Element.prototype, 'innerHTML', {
          get: d.get,
          set: function(v){
            if (isRoot(this)){
              var s = String(v == null ? '' : v);
              // block only CLEAR operations
              if (s.trim() === '' && shouldBlockClear(this)) return;
            }
            return d.set.call(this, v);
          }
        });
      }
    }catch(e){}

    // Guard textContent = ""
    try{
      var td = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      if (td && typeof td.set === 'function'){
        Object.defineProperty(Node.prototype, 'textContent', {
          get: td.get,
          set: function(v){
            if (isRoot(this)){
              var s = String(v == null ? '' : v);
              if (s.trim() === '' && shouldBlockClear(this)) return;
            }
            return td.set.call(this, v);
          }
        });
      }
    }catch(e){}

    // Guard replaceChildren()
    try{
      var rc = Element.prototype.replaceChildren;
      if (typeof rc === 'function'){
        Element.prototype.replaceChildren = function(){
          if (isRoot(this) && arguments.length === 0 && shouldBlockClear(this)) return;
          return rc.apply(this, arguments);
        };
      }
    }catch(e){}
  }

  installDomGuards();

  // -----------------------------
  // 1) Fetch hardening
  // -----------------------------
  var _fetch = window.fetch && window.fetch.bind(window);
  var lastWarn = { url: '', t: 0 };

  function shouldBlock(u){
    u = String(u || '');
    if (!u || u === 'undefined') return true;
    if (u.indexOf('/undefined') !== -1 || u.slice(-9) === '/undefined') return true;

    // deleted old files
    if (u.indexOf('metier-page.v2026-01-24.FIX31') !== -1) return true;
    if (u.indexOf('BLOCKS.LEFT.PATCH3.I18N') !== -1) return true;

    return false;
  }

  function fastBlocked(){
    try { return Promise.resolve(new Response('', { status: 204, statusText: 'Blocked by FIX17' })); }
    catch(e){ return Promise.resolve({ ok:false, status:204, statusText:'Blocked by FIX17' }); }
  }

  if (_fetch){
    window.fetch = function(input, init){
      try{
        var url = (typeof input === 'string') ? input : (input && input.url) ? input.url : String(input || '');
        if (shouldBlock(url)){
          var now = Date.now();
          if (url !== lastWarn.url || (now - lastWarn.t) > 1500){
            lastWarn = { url: url, t: now };
            console.warn('[FIX17] blocked fetch:', url);
          }
          return fastBlocked();
        }
      }catch(e){}
      return _fetch(input, init);
    };
  }

  // -----------------------------
  // 2) Dedupe legacy loaders (keep only one of FIX13)
  // -----------------------------
  function dedupeLoader(){
    try{
      // FIX13 known ids
      var styles = document.querySelectorAll('#ulydia_loader_styles');
      for (var i=1;i<styles.length;i++){ try{ styles[i].remove(); }catch(e){} }

      var overlays = document.querySelectorAll('#ulydia_overlay_loader');
      for (var j=1;j<overlays.length;j++){ try{ overlays[j].remove(); }catch(e){} }

      // Also remove common extra overlays if any exist (HEAD experiments)
      var extra = ['ul-metier-boot','ul-metier-fallback-loader','ulydia_noflash_overlay'];
      for (var k=0;k<extra.length;k++){
        var nodes = document.querySelectorAll('#' + extra[k]);
        for (var n=0;n<nodes.length;n++){ try{ nodes[n].remove(); }catch(e){} }
      }
    }catch(e){}
  }

  var tick = 0;
  var tmr = setInterval(function(){
    tick++; dedupeLoader();
    if (tick > 60) clearInterval(tmr);
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
    s.onload = function(){
      window.__ULYDIA_BASE_FIX13_LOADED__ = true;
      dedupeLoader();
    };
    s.onerror = function(){ console.error('[FIX17] failed to load base:', BASE_SRC); };
    document.head.appendChild(s);
  }

  loadOnce();

  // debug hook
  window.__ULYDIA_FIX17__ = { baseSrc: BASE_SRC, dedupeLoader: dedupeLoader };
})();
