(function(){
  'use strict';
  if (window.__ULYDIA_INROOT_LOADER_PATCH1__) return;
  window.__ULYDIA_INROOT_LOADER_PATCH1__ = true;

  var LOADER_ID = 'ulydia-root-loader';
  var ROOT_ID = 'ulydia-metier-root';

  function ensureKeyframes(){
    if (document.getElementById('ulydia_ulspin_css')) return;
    var st = document.createElement('style');
    st.id = 'ulydia_ulspin_css';
    st.textContent = '@keyframes ulspin{to{transform:rotate(360deg)}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function ensureRoot(){
    var r = document.getElementById(ROOT_ID);
    if (r) return r;

    // create root if missing
    r = document.createElement('div');
    r.id = ROOT_ID;

    // try to append early (body might not be ready)
    var target = document.body || document.documentElement;
    target.appendChild(r);
    return r;
  }

  function injectLoader(){
    ensureKeyframes();
    var r = ensureRoot();
    if (!r) return;

    if (r.querySelector('#' + LOADER_ID)) return;

    // only inject if root is empty-ish
    var txt = (r.textContent || '').replace(/\s+/g,' ').trim();
    if ((r.children && r.children.length) && txt.length > 30) return;

    var box = document.createElement('div');
    box.id = LOADER_ID;
    box.setAttribute('data-ulydia-loader','1');
    box.style.cssText = [
      'max-width:1100px',
      'margin:28px auto',
      'padding:18px',
      'border:1px solid #e5e7eb',
      'background:#fff',
      'border-radius:18px',
      'font-family:Montserrat,system-ui'
    ].join(';');

    box.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(15,23,42,.18);border-top-color:#c00102;animation:ulspin .75s linear infinite;"></div>' +
        '<div>' +
          '<div style="font-weight:900;font-size:14px;color:#0f172a">Loading…</div>' +
          '<div style="font-size:13px;opacity:.7;margin-top:4px;color:#0f172a">Please wait.</div>' +
        '</div>' +
      '</div>';

    r.appendChild(box);
  }

  function hasRealContent(){
    var r = document.getElementById(ROOT_ID);
    if (!r) return false;

    // real content = at least one strong visible node not inside loader
    var strong = r.querySelector('h1,h2,[data-ulydia-block],.u-card,.section-card,.card,article,section');
    if (strong && strong.closest('#' + LOADER_ID) == null && strong.offsetHeight > 25) return true;

    // or meaningful text outside loader
    var clone = r.cloneNode(true);
    var l = clone.querySelector('#' + LOADER_ID);
    if (l) l.remove();
    var txt = (clone.textContent || '').replace(/\s+/g,' ').trim();
    return txt.length > 80;
  }

  function removeLoader(){
    var r = document.getElementById(ROOT_ID);
    if (!r) return;
    var l = r.querySelector('#' + LOADER_ID);
    if (l) l.remove();
  }

  // inject ASAP
  injectLoader();

  // observe rendering
  function boot(){
    injectLoader();
    var r = document.getElementById(ROOT_ID);
    if (!r) return;

    var obs = new MutationObserver(function(){
      if (hasRealContent()) removeLoader();
      else injectLoader();
    });
    obs.observe(r, { childList:true, subtree:true });

    // safety polling (covers cases where root is replaced)
    var t0 = Date.now();
    var id = setInterval(function(){
      injectLoader();
      if (hasRealContent() || (Date.now()-t0) > 30000) {
        removeLoader();
        clearInterval(id);
      }
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
