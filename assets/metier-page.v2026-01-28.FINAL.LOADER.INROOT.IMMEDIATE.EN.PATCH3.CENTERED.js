
(function(){
  'use strict';
  if (window.__ULYDIA_INROOT_LOADER_PATCH3__) return;
  window.__ULYDIA_INROOT_LOADER_PATCH3__ = true;

  var ROOT_ID = 'ulydia-metier-root';
  var LOADER_ID = 'ulydia-root-loader';

  function ensureCSS(){
    if (document.getElementById('ulydia_loader_css_patch3')) return;
    var st = document.createElement('style');
    st.id = 'ulydia_loader_css_patch3';
    st.textContent = `
@keyframes ulydiaSpin { to { transform: rotate(360deg); } }

#${LOADER_ID}{
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

#${LOADER_ID} .ulydia-card{
  width: min(520px, 92vw);
  padding:18px;
  border:1px solid #e5e7eb;
  background:#fff;
  border-radius:18px;
  font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  box-shadow: 0 14px 40px rgba(15,23,42,.10);
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
    ensureRoot();
    if (document.getElementById(LOADER_ID)) return;

    var ov = document.createElement('div');
    ov.id = LOADER_ID;
    ov.setAttribute('data-ulydia-loader','1');
    ov.innerHTML = `
      <div class="ulydia-card">
        <div class="row">
          <div class="ul-spinner"></div>
          <div>
            <div class="t">Loading…</div>
            <div class="s">Please wait.</div>
          </div>
        </div>
      </div>
    `;
    (document.body || document.documentElement).appendChild(ov);
  }

  function hasRealContent(){
    var r = document.getElementById(ROOT_ID);
    if (!r) return false;

    var real = r.querySelector(
      '[data-ulydia-block],.ulydia-block,.u-card,.section-card,article,section'
    );
    if (real && real.offsetHeight > 40) return true;

    var clone = r.cloneNode(true);
    var txt = (clone.textContent || '').replace(/\s+/g,' ').trim();
    return txt.length > 120;
  }

  function removeLoader(){
    var ov = document.getElementById(LOADER_ID);
    if (ov) ov.remove();
  }

  injectLoader();

  function boot(){
    injectLoader();
    var r = document.getElementById(ROOT_ID);
    if (!r) return;

    var obs = new MutationObserver(function(){
      if (hasRealContent()) removeLoader();
    });
    obs.observe(r, { childList:true, subtree:true });

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
