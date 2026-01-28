
(function(){
  'use strict';
  if (window.__ULYDIA_LAYOUT_REPAIR_2COL_PATCH1__) return;
  window.__ULYDIA_LAYOUT_REPAIR_2COL_PATCH1__ = true;

  var ROOT_ID = 'ulydia-metier-root';

  function injectCSS(){
    if (document.getElementById('ulydia_layout_repair_css_patch1')) return;
    var st = document.createElement('style');
    st.id = 'ulydia_layout_repair_css_patch1';
    st.textContent = `
#ulydia-metier-root .ul-2col-wrap{
  display:grid !important;
  grid-template-columns: 1.35fr 0.85fr !important;
  gap: 24px !important;
  align-items:start !important;
}
#ulydia-metier-root .ul-2col-left,
#ulydia-metier-root .ul-2col-right{
  min-width: 0 !important;
}
@media (max-width: 991px){
  #ulydia-metier-root .ul-2col-wrap{
    grid-template-columns: 1fr !important;
  }
}
`;
    (document.head || document.documentElement).appendChild(st);
  }

  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim().toLowerCase(); }

  function isRightCandidate(el){
    try{
      // Prefer explicit markers if present
      if (el.getAttribute && (el.getAttribute('data-ulydia-side') === 'right' || el.getAttribute('data-side') === 'right')) return true;
      // Headings-based heuristic
      var h = el.querySelector && el.querySelector('h1,h2,h3,.u-card-title,[data-title]');
      var t = norm(h ? h.textContent : el.textContent);
      if (!t) return false;

      // Common right column blocks in your UI
      if (t.includes('partenaire')) return true;
      if (t.includes('soft skills')) return true;
      if (t.includes('soft-skills')) return true;
      if (t.includes('sponsor')) return true;
      if (t.includes('en savoir plus')) return true;
      // Emojis often present in headers
      if (t.includes('🤝') or t.includes('🧠')) return true;  # will be fixed below
      return false;
    }catch(e){
      return false;
    }
  }

  // Fix Python-style "or" typo in JS generation (replace line)

  function isRightCandidate(el){
    try{
      if (el.getAttribute && (el.getAttribute('data-ulydia-side') === 'right' || el.getAttribute('data-side') === 'right')) return true;

      var h = el.querySelector && el.querySelector('h1,h2,h3,.u-card-title,[data-title]');
      var t = norm(h ? h.textContent : el.textContent);
      if (!t) return false;

      if (t.indexOf('partenaire') !== -1) return true;
      if (t.indexOf('soft skills') !== -1) return true;
      if (t.indexOf('soft-skills') !== -1) return true;
      if (t.indexOf('sponsor') !== -1) return true;
      if (t.indexOf('en savoir plus') !== -1) return true;

      // emoji markers
      if (t.indexOf('🤝') !== -1) return true;
      if (t.indexOf('🧠') !== -1) return true;

      return false;
    }catch(e){
      return false;
    }
  }

  function alreadyWrapped(root){
    return !!root.querySelector('.ul-2col-wrap');
  }

  function buildWrapper(root){
    var wrap = document.createElement('div');
    wrap.className = 'ul-2col-wrap';
    var left = document.createElement('div');
    left.className = 'ul-2col-left';
    var right = document.createElement('div');
    right.className = 'ul-2col-right';
    wrap.appendChild(left);
    wrap.appendChild(right);

    // insert wrapper at top
    root.insertBefore(wrap, root.firstChild);
    return { wrap: wrap, left: left, right: right };
  }

  function moveChildren(root){
    if (!root) return;
    if (alreadyWrapped(root)) return;

    // Collect direct children excluding our loaders/overlays if any
    var kids = Array.prototype.slice.call(root.children || []);
    if (!kids.length) return;

    // Ignore if there's clearly only 1 column worth of content (no right blocks)
    var rightCount = 0;
    for (var i=0;i<kids.length;i++){
      var el = kids[i];
      if (!el || el.id === 'ulydia-root-loader' || el.id === 'ulydia_root_placeholder') continue;
      if (isRightCandidate(el)) rightCount++;
    }
    if (rightCount === 0) return;

    var w = buildWrapper(root);

    // Move nodes in order
    for (var j=0;j<kids.length;j++){
      var node = kids[j];
      if (!node || node.classList && node.classList.contains('ul-2col-wrap')) continue;
      if (node.id === 'ulydia-root-loader' || node.id === 'ulydia_root_placeholder') continue;

      if (isRightCandidate(node)) w.right.appendChild(node);
      else w.left.appendChild(node);
    }
  }

  function boot(){
    injectCSS();
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    // Initial attempt
    moveChildren(root);

    // Observe late render / late injection (normal reload cache race)
    var obs = new MutationObserver(function(){
      // if wrapper exists, do nothing
      if (alreadyWrapped(root)) return;
      moveChildren(root);
    });
    obs.observe(root, { childList:true });

    // Also retry a few times (patches can inject progressively)
    var t0 = Date.now();
    var id = setInterval(function(){
      if (alreadyWrapped(root)) return clearInterval(id);
      moveChildren(root);
      if ((Date.now()-t0) > 8000) clearInterval(id);
    }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
