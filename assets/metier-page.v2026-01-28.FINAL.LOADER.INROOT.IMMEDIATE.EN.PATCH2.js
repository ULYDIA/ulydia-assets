
(function(){
  'use strict';
  if (window.__ULYDIA_INROOT_LOADER_PATCH2__) return;
  window.__ULYDIA_INROOT_LOADER_PATCH2__ = true;

  var ROOT_ID = 'ulydia-metier-root';
  var LOADER_ID = 'ulydia-root-loader';

  // -----------------------------
  // CSS (forced spinner)
  // -----------------------------
  function ensureCSS(){
    if (document.getElementById('ulydia_loader_css_patch2')) return;
    var st = document.createElement('style');
    st.id = 'ulydia_loader_css_patch2';
    st.textContent = `
@keyframes ulydiaSpin { to { transform: rotate(360deg); } }
#${LOADER_ID}{
  max-width:1100px;
  margin:120px auto 0;
  padding:18px;
  border:1px solid #e5e7eb;
  background:#fff;
  border-radius:18px;
  font-family:Montserrat,system-ui;
}
#${LOADER_ID} .row{display:flex;align-items:center;gap:10px}
#${LOADER_ID} .ul-spinner{
  width:14px;height:14px;display:inline-block;box-sizing:border-box;
  border-radius:50%;
  border:2px solid rgba(15,23,42,.18);
  border-top-color:#c00102;
  animation: ulydiaSpin .75s linear infinite;
}
#${LOADER_ID} .t{font-weight:900;font-size:14px;color:#0f172a}
#${LOADER_ID} .s{font-size:13px;opacity:.7;margin-top:4px;color:#0f172a}
`;
    (document.head || document.documentElement).appendChild(st);
  }

  function ensureRoot(){
    var r = document.getElementById(ROOT_ID);
    if (r) return r;
    r = document.createElement('div');
    r.id = ROOT_ID;
    (document.body || document.documentElement).appendChild(r);
    return r;
  }

  function injectLoader(){
    ensureCSS();
    var r = ensureRoot();
    if (!r) return;
    if (r.querySelector('#' + LOADER_ID)) return;

    var box = document.createElement('div');
    box.id = LOADER_ID;
    box.setAttribute('data-ulydia-loader','1');
    box.innerHTML = `
      <div class="row">
        <div class="ul-spinner"></div>
        <div>
          <div class="t">Loading…</div>
          <div class="s">Please wait.</div>
        </div>
      </div>
    `;
    r.appendChild(box);
  }

  function hasRealContent(){
    var r = document.getElementById(ROOT_ID);
    if (!r) return false;

    // explicit business blocks only
    var real = r.querySelector(
      '[data-ulydia-block],.ulydia-block,.u-card,.section-card,article,section'
    );
    if (real && real.offsetHeight > 40) return true;

    // meaningful text outside loader
    var clone = r.cloneNode(true);
    var l = clone.querySelector('#' + LOADER_ID);
    if (l) l.remove();
    var txt = (clone.textContent || '').replace(/\s+/g,' ').trim();
    return txt.length > 120;
  }

  function removeLoader(){
    var r = document.getElementById(ROOT_ID);
    if (!r) return;
    var l = r.querySelector('#' + LOADER_ID);
    if (l) l.remove();
  }

  // Initial inject ASAP
  injectLoader();

  function boot(){
    injectLoader();
    var r = document.getElementById(ROOT_ID);
    if (!r) return;

    var obs = new MutationObserver(function(){
      if (hasRealContent()) removeLoader();
      else injectLoader();
    });
    obs.observe(r, { childList:true, subtree:true });

    // Safety: never leave blank screen
    setTimeout(function(){
      if (!hasRealContent()) injectLoader();
    }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
