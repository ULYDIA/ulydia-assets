(function(){
  'use strict';

  // =========================================================
  // ULYDIA — Metier Page BASE.FIX18
  // - Anti-loop: blocks "clear root after render" (prevents white flash)
  // - Single loader policy:
  //     * Prefer FIX13's loader if it exists
  //     * If FIX13 loader isn't present quickly, show a minimal fallback loader
  //       (English) and remove it once FIX13 loader appears or the page renders.
  // - Loads FIX13 base once
  // =========================================================

  if (window.__ULYDIA_BASE_FIX18__) return;
  window.__ULYDIA_BASE_FIX18__ = true;

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
      if (txt.length < 60) return false;
      var strong = root.querySelector('h1,h2,[data-ulydia-block],.u-card,.section-card,.card,article,section');
      if (strong && strong.offsetHeight > 25) return true;
      var rect = root.getBoundingClientRect ? root.getBoundingClientRect() : null;
      if (rect && rect.height > 200) return true;
      return false;
    }catch(e){ return false; }
  }

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
  // 1) Single loader helpers
  // -----------------------------
  var FALLBACK_ID = 'ulydia_single_loader_fix18';
  function hasFix13Loader(){
    // FIX13 commonly uses these ids; we check both styles + overlay
    return !!(document.getElementById('ulydia_overlay_loader') ||
              document.getElementById('ulydia_loader_styles') ||
              document.querySelector('[data-ulydia-loader], .ulydia-loader, .ulydia-overlay-loader'));
  }

  function rendered(){
    var r = document.getElementById('ulydia-metier-root');
    return hasRealContent(r);
  }

  function ensureFallbackStyles(){
    if (document.getElementById(FALLBACK_ID + '_styles')) return;
    var st = document.createElement('style');
    st.id = FALLBACK_ID + '_styles';
    st.textContent =
      '#' + FALLBACK_ID + '{position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;align-items:center;justify-content:center;font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial;}' +
      '#' + FALLBACK_ID + ' .box{width:min(520px,92vw);border:1px solid #e5e7eb;border-radius:18px;padding:16px 18px;box-shadow:0 14px 40px rgba(15,23,42,.10);background:#fff;}' +
      '#' + FALLBACK_ID + ' .row{display:flex;align-items:center;gap:12px;}' +
      '#' + FALLBACK_ID + ' .spin{width:18px;height:18px;border-radius:50%;border:2px solid rgba(15,23,42,.18);border-top-color:#c00102;animation:ulspin .75s linear infinite;}' +
      '@keyframes ulspin{to{transform:rotate(360deg)}}' +
      '#' + FALLBACK_ID + ' .t{font-weight:900;color:#0f172a;font-size:14px;}' +
      '#' + FALLBACK_ID + ' .s{font-size:13px;opacity:.7;margin-top:6px;line-height:1.35;}';
    try{ document.head.appendChild(st); }catch(e){}
  }

  function showFallback(){
    if (hasFix13Loader()) return;         // prefer FIX13
    if (rendered()) return;               // nothing to do
    ensureFallbackStyles();
    var ov = document.getElementById(FALLBACK_ID);
    if (ov){
      ov.style.display = 'flex';
      return;
    }
    ov = document.createElement('div');
    ov.id = FALLBACK_ID;
    ov.innerHTML =
      '<div class="box"><div class="row"><div class="spin"></div><div>' +
      '<div class="t">Loading…</div><div class="s">Please wait.</div>' +
      '</div></div></div>';
    (document.documentElement || document.body).appendChild(ov);
  }

  function hideFallback(){
    var ov = document.getElementById(FALLBACK_ID);
    if (ov) try{ ov.remove(); }catch(e){}
  }

  // Manage fallback loader lifecycle
  (function(){
    // show quickly if FIX13 loader isn't there yet
    setTimeout(function(){ if (!hasFix13Loader() && !rendered()) showFallback(); }, 120);
    setTimeout(function(){ if (!hasFix13Loader() && !rendered()) showFallback(); }, 350);

    // observe for FIX13 loader / render completion
    function tick(){
      if (hasFix13Loader() || rendered()) hideFallback();
      else showFallback();
    }
    var t0 = Date.now();
    var id = setInterval(function(){
      tick();
      if (hasFix13Loader() || rendered() || (Date.now()-t0) > 30000) {
        clearInterval(id);
        tick();
      }
    }, 120);
  })();

  // -----------------------------
  // 2) Fetch hardening (keep light)
  // -----------------------------
  var _fetch = window.fetch && window.fetch.bind(window);
  function shouldBlock(u){
    u = String(u || '');
    if (!u || u === 'undefined') return true;
    if (u.indexOf('/undefined') !== -1 || u.slice(-9) === '/undefined') return true;
    return false;
  }
  function fastBlocked(){
    try { return Promise.resolve(new Response('', { status: 204, statusText: 'Blocked by FIX18' })); }
    catch(e){ return Promise.resolve({ ok:false, status:204, statusText:'Blocked by FIX18' }); }
  }
  if (_fetch){
    window.fetch = function(input, init){
      try{
        var url = (typeof input === 'string') ? input : (input && input.url) ? input.url : String(input || '');
        if (shouldBlock(url)) return fastBlocked();
      }catch(e){}
      return _fetch(input, init);
    };
  }

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
      // If FIX13 adds its loader, ensure we don't keep fallback
      try{ hideFallback(); }catch(e){}
    };
    s.onerror = function(){
      console.error('[FIX18] failed to load base:', BASE_SRC);
      // keep fallback visible rather than a white screen
      try{ showFallback(); }catch(e){}
    };
    document.head.appendChild(s);
  }

  loadOnce();

  window.__ULYDIA_FIX18__ = { baseSrc: BASE_SRC };
})();
