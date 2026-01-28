(function(){
  'use strict';

  // =========================================================
  // ULYDIA — Metier Page BASE.FIX15 (ANTI-LOOP + NO-WHITE-FLASH)
  // =========================================================
  // Based on BASE.FIX14.ANTILOOP.js:
  // - still blocks bad fetches + dedupes legacy loader nodes
  // - still loads FIX13 base once
  // - NEW: "no white flash" guard:
  //   keeps a minimal overlay visible whenever #ulydia-metier-root is empty
  //   (covers the case where base re-renders and temporarily clears root)
  //
  // NOTE: This does NOT modify FIX13 logic. It only prevents blank frames.

  if (window.__ULYDIA_BASE_FIX15__) return;
  window.__ULYDIA_BASE_FIX15__ = true;

  // Keep same FIX13 base
  var BASE_SRC = 'https://ulydia-assets.pages.dev/assets/metier-page.v2026-01-25.FINAL.BASE.FIX13.SPONSORLINKFIX1.js';

  // -----------------------------
  // 0) Minimal overlay (NOFLASH)
  // -----------------------------
  var NOFLASH = {
    id: 'ulydia_noflash_overlay',
    minHeight: 180,      // root height threshold
    minText: 60,         // text length threshold
    stableMs: 350,       // must be stable this long before hiding
    maxHoldMs: 45000     // safety: stop forcing after 45s
  };

  function now(){ return Date.now ? Date.now() : (+new Date()); }

  function ensureNoFlashStyles(){
    if (document.getElementById('ulydia_noflash_styles')) return;
    var st = document.createElement('style');
    st.id = 'ulydia_noflash_styles';
    st.textContent =
      '#' + NOFLASH.id + '{position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;align-items:center;justify-content:center;font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial;}' +
      '#' + NOFLASH.id + ' .box{width:min(520px,92vw);border:1px solid #e5e7eb;border-radius:18px;padding:16px 18px;box-shadow:0 14px 40px rgba(15,23,42,.10);background:#fff;}' +
      '#' + NOFLASH.id + ' .row{display:flex;align-items:center;gap:12px;}' +
      '#' + NOFLASH.id + ' .spin{width:18px;height:18px;border-radius:50%;border:2px solid rgba(15,23,42,.18);border-top-color:#c00102;animation:ulspin .75s linear infinite;}' +
      '@keyframes ulspin{to{transform:rotate(360deg)}}' +
      '#' + NOFLASH.id + ' .t{font-weight:900;color:#0f172a;font-size:14px;}' +
      '#' + NOFLASH.id + ' .s{font-size:13px;opacity:.7;margin-top:6px;line-height:1.35;}';
    try { document.head.appendChild(st); } catch(e) {}
  }

  function mountNoFlash(){
    try{
      ensureNoFlashStyles();
      var ov = document.getElementById(NOFLASH.id);
      if (ov){
        ov.style.display = 'flex';
        return;
      }
      ov = document.createElement('div');
      ov.id = NOFLASH.id;
      ov.innerHTML =
        '<div class="box"><div class="row">' +
          '<div class="spin"></div>' +
          '<div><div class="t">Chargement…</div><div class="s">Merci de patienter.</div></div>' +
        '</div></div>';
      (document.documentElement || document.body).appendChild(ov);
    }catch(e){}
  }

  function unmountNoFlash(){
    try{
      var ov = document.getElementById(NOFLASH.id);
      if (ov) ov.remove();
    }catch(e){}
  }

  function hasRealRootContent(){
    var r = document.getElementById('ulydia-metier-root');
    if (!r) return false;

    // Height check (avoid false positives with empty wrappers)
    var rect = r.getBoundingClientRect ? r.getBoundingClientRect() : null;
    if (!rect || rect.height < NOFLASH.minHeight) return false;

    // Strong element visible
    var strong = r.querySelector && r.querySelector('h1,h2,[data-ulydia-block],.u-card,.section-card,.card,article,section');
    if (!strong || !strong.offsetHeight || strong.offsetHeight < 30) return false;

    // Text check
    var txt = (r.textContent || '').replace(/\s+/g,' ').trim();
    if (txt.length < NOFLASH.minText) return false;

    return true;
  }

  function startNoFlashGuard(){
    if (window.__ULYDIA_NOFLASH_GUARD_RUNNING__) return;
    window.__ULYDIA_NOFLASH_GUARD_RUNNING__ = true;

    var startedAt = now();
    var lastOkAt = 0;

    function tick(){
      // stop forcing after maxHoldMs
      if ((now() - startedAt) > NOFLASH.maxHoldMs){
        unmountNoFlash();
        return;
      }

      var ok = false;
      try { ok = hasRealRootContent(); } catch(e) { ok = false; }

      if (ok){
        if (!lastOkAt) lastOkAt = now();
        // only hide after stableMs to prevent "ok then cleared" flashes
        if ((now() - lastOkAt) >= NOFLASH.stableMs){
          unmountNoFlash();
        } else {
          // keep overlay until stable
          mountNoFlash();
        }
      } else {
        lastOkAt = 0;
        mountNoFlash();
      }

      setTimeout(tick, 80);
    }

    // kick immediately
    tick();

    // Also keep it on if crash happens (avoid permanent white)
    window.addEventListener('error', function(){ mountNoFlash(); });
    window.addEventListener('unhandledrejection', function(){ mountNoFlash(); });
  }

  // Start guard as early as possible (covers blank frames before FIX13 renders)
  startNoFlashGuard();

  // -----------------------------
  // 1) Fetch hardening (from FIX14)
  // -----------------------------
  var _fetch = window.fetch && window.fetch.bind(window);
  var lastWarn = { url: '', t: 0 };

  function shouldBlock(u){
    u = String(u || '');
    if (!u || u === 'undefined') return true;
    if (u.indexOf('/undefined') !== -1 || u.slice(-9) === '/undefined') return true;

    // deleted legacy assets seen in console as 404s
    if (u.indexOf('metier-page.v2026-01-24.FIX31') !== -1) return true;
    if (u.indexOf('BLOCKS.LEFT.PATCH3.I18N') !== -1) return true;

    return false;
  }

  function fastBlocked(){
    try { return Promise.resolve(new Response('', { status: 204, statusText: 'Blocked by FIX15' })); }
    catch(e){ return Promise.resolve({ ok:false, status:204, statusText:'Blocked by FIX15' }); }
  }

  if (_fetch){
    window.fetch = function(input, init){
      try{
        var url = (typeof input === 'string') ? input : (input && input.url) ? input.url : String(input || '');
        if (shouldBlock(url)){
          var t = now();
          if (url !== lastWarn.url || (t - lastWarn.t) > 1500){
            lastWarn = { url: url, t: t };
            console.warn('[FIX15] blocked fetch:', url);
          }
          return fastBlocked();
        }
      }catch(e){}
      return _fetch(input, init);
    };
  }

  // -----------------------------
  // 2) Prevent multiple loader nodes (from FIX14)
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
  // 3) Load FIX13 base once (from FIX14)
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

      // Keep noflash guard running until content is stable; no action needed here.
      // (If FIX13 renders correctly, overlay will auto-hide once stable.)
    };
    s.onerror = function(){ console.error('[FIX15] failed to load base:', BASE_SRC); };
    document.head.appendChild(s);
  }

  loadOnce();

  // small debug hook
  window.__ULYDIA_FIX15__ = { baseSrc: BASE_SRC, dedupeLoader: dedupeLoader };
})();
