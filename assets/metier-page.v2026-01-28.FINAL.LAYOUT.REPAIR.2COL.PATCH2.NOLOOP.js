(function(){
  'use strict';
  if (window.__ULYDIA_LAYOUT_REPAIR_2COL_PATCH2__) return;
  window.__ULYDIA_LAYOUT_REPAIR_2COL_PATCH2__ = true;

  var ROOT_ID = 'ulydia-metier-root';
  var WRAP_CLASS = 'ul-2col-wrap';

  function injectCSS(){
    if (document.getElementById('ulydia_layout_repair_css_patch2')) return;
    var st = document.createElement('style');
    st.id = 'ulydia_layout_repair_css_patch2';
    st.textContent = `
#ulydia-metier-root .${WRAP_CLASS}{
  display:grid !important;
  grid-template-columns: 1.35fr 0.85fr !important;
  gap: 24px !important;
  align-items:start !important;
}
#ulydia-metier-root .ul-2col-left,
#ulydia-metier-root .ul-2col-right{ min-width:0 !important; }
@media (max-width: 991px){
  #ulydia-metier-root .${WRAP_CLASS}{ grid-template-columns: 1fr !important; }
}
`;
    (document.head || document.documentElement).appendChild(st);
  }

  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim().toLowerCase(); }

  function isRightCandidate(el){
    try{
      if (!el) return false;
      if (el.getAttribute && (el.getAttribute('data-ulydia-side') === 'right' || el.getAttribute('data-side') === 'right')) return true;

      var h = el.querySelector && el.querySelector('h1,h2,h3,.u-card-title,.card-title,[data-title]');
      var t = norm(h ? h.textContent : el.textContent);

      if (!t) return false;
      if (t.indexOf('partenaire') !== -1) return true;
      if (t.indexOf('partner') !== -1) return true;
      if (t.indexOf('soft skills') !== -1) return true;
      if (t.indexOf('en savoir plus') !== -1) return true;
      if (t.indexOf('sponsor') !== -1) return true;
      if (t.indexOf('🤝') !== -1) return true;
      if (t.indexOf('🧠') !== -1) return true;
      return false;
    }catch(e){ return false; }
  }

  function alreadyWrapped(root){
    return !!root.querySelector('.' + WRAP_CLASS);
  }

  function buildWrapper(root){
    var wrap = document.createElement('div');
    wrap.className = WRAP_CLASS;
    var left = document.createElement('div');
    left.className = 'ul-2col-left';
    var right = document.createElement('div');
    right.className = 'ul-2col-right';
    wrap.appendChild(left);
    wrap.appendChild(right);
    root.insertBefore(wrap, root.firstChild);
    return { wrap: wrap, left: left, right: right };
  }

  function moveOnce(root){
    if (!root) return false;
    if (alreadyWrapped(root)) return true;

    // Only react when some right blocks exist (avoid wrapping too early)
    var kids = Array.prototype.slice.call(root.children || []);
    if (!kids.length) return false;

    var rightCount = 0;
    for (var i=0;i<kids.length;i++){
      var el = kids[i];
      if (!el) continue;
      if (el.id === 'ulydia-root-loader') continue;
      if (el.classList && el.classList.contains(WRAP_CLASS)) continue;
      if (isRightCandidate(el)) rightCount++;
    }
    if (rightCount === 0) return false;

    var w = buildWrapper(root);

    // Move nodes exactly once
    for (var j=0;j<kids.length;j++){
      var node = kids[j];
      if (!node) continue;
      if (node.id === 'ulydia-root-loader') continue;
      if (node.classList && node.classList.contains(WRAP_CLASS)) continue;
      if (isRightCandidate(node)) w.right.appendChild(node);
      else w.left.appendChild(node);
    }
    return true;
  }

  function boot(){
    injectCSS();
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    // Throttle to avoid MutationObserver feedback loops
    var scheduled = false;
    var obs;

    function tick(){
      scheduled = false;
      // If we succeed (wrapped), we can stop observing forever -> prevents loops
      if (moveOnce(root) && obs) {
        try{ obs.disconnect(); }catch(e){}
      }
    }

    function schedule(){
      if (scheduled) return;
      scheduled = true;
      // rAF prevents sync mutation storms
      requestAnimationFrame(tick);
    }

    // First try
    schedule();

    // Observe until wrapped, then disconnect
    obs = new MutationObserver(function(muts){
      if (alreadyWrapped(root)) {
        try{ obs.disconnect(); }catch(e){}
        return;
      }
      schedule();
    });
    obs.observe(root, { childList:true });

    // Safety retries (but stop once wrapped)
    var t0 = Date.now();
    var id = setInterval(function(){
      if (alreadyWrapped(root)) return clearInterval(id);
      schedule();
      if ((Date.now()-t0) > 8000) clearInterval(id);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
