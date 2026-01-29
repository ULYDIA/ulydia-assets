/* metier-page.v2026-01-29.FINAL.LAYOUT.API.2COL.PATCH1.js */
(function(){
  'use strict';
  if (window.__ULYDIA_LAYOUT_API_2COL_PATCH1__) return;
  window.__ULYDIA_LAYOUT_API_2COL_PATCH1__ = true;

  var ROOT_ID = 'ulydia-metier-root';
  var WRAP_CLASS = 'ul-2col-wrap';
  var CSS_ID = 'ulydia_layout_api_css_patch1';

  function injectCSS(){
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = `
#${ROOT_ID} .${WRAP_CLASS}{
  display:grid !important;
  grid-template-columns: 1.35fr 0.85fr !important;
  gap: 24px !important;
  align-items:start !important;
}
#${ROOT_ID} .ul-2col-left,
#${ROOT_ID} .ul-2col-right{ min-width:0 !important; }
@media (max-width: 991px){
  #${ROOT_ID} .${WRAP_CLASS}{ grid-template-columns: 1fr !important; }
}
`;
    (document.head || document.documentElement).appendChild(st);
  }

  function getRoot(){ return document.getElementById(ROOT_ID); }

  function ensureWrapper(root){
    if (!root) return null;
    var existing = root.querySelector('.' + WRAP_CLASS);
    if (existing){
      return {
        wrap: existing,
        left: existing.querySelector('.ul-2col-left'),
        right: existing.querySelector('.ul-2col-right')
      };
    }
    var wrap = document.createElement('div');
    wrap.className = WRAP_CLASS;

    var left = document.createElement('div');
    left.className = 'ul-2col-left';

    var right = document.createElement('div');
    right.className = 'ul-2col-right';

    wrap.appendChild(left);
    wrap.appendChild(right);

    // On place le wrapper en premier, en gardant le loader root s’il existe
    root.insertBefore(wrap, root.firstChild);
    return { wrap: wrap, left: left, right: right };
  }

  function isElement(n){ return !!(n && n.nodeType === 1); }
  function sideOf(node){
    if (!isElement(node)) return 'left';
    var s = node.getAttribute('data-ulydia-side') || node.getAttribute('data-side') || '';
    s = String(s).toLowerCase().trim();
    return (s === 'right') ? 'right' : 'left';
  }

  function moveExistingIntoColumns(api, root){
    // On déplace tous les enfants du root (sauf wrapper + loader)
    var kids = Array.prototype.slice.call(root.children || []);
    for (var i=0;i<kids.length;i++){
      var el = kids[i];
      if (!el) continue;
      if (el.classList && el.classList.contains(WRAP_CLASS)) continue;
      if (el.id === 'ulydia-root-loader') continue;
      (sideOf(el) === 'right' ? api.right : api.left).appendChild(el);
    }
  }

  function installRootRouting(api, root){
    if (root.__ulydia_routed__) return;
    root.__ulydia_routed__ = true;

    // Route appendChild / insertBefore vers left/right si data-ulydia-side=right
    var _append = root.appendChild.bind(root);
    var _insert = root.insertBefore.bind(root);

    root.appendChild = function(node){
      try{
        if (node && node.id === 'ulydia-root-loader') return _append(node);
        if (node && node.classList && node.classList.contains(WRAP_CLASS)) return _append(node);
        return (sideOf(node) === 'right' ? api.right : api.left).appendChild(node);
      }catch(e){
        return _append(node);
      }
    };

    root.insertBefore = function(node, ref){
      try{
        if (node && node.id === 'ulydia-root-loader') return _insert(node, ref);
        if (node && node.classList && node.classList.contains(WRAP_CLASS)) return _insert(node, ref);
        // on ignore "ref" pour éviter des insertions bizarres, on route proprement
        return (sideOf(node) === 'right' ? api.right : api.left).appendChild(node);
      }catch(e){
        return _insert(node, ref);
      }
    };
  }

  function boot(){
    injectCSS();
    var root = getRoot();
    if (!root) return;

    var api = ensureWrapper(root);
    if (!api || !api.left || !api.right) return;

    // Expose API
    window.__ULYDIA_LAYOUT__ = api;
    window.__ULYDIA_INJECT_LEFT__ = function(node){
      var r = getRoot(); if (!r) return;
      var a = window.__ULYDIA_LAYOUT__ || ensureWrapper(r);
      if (!a) return;
      a.left.appendChild(node);
    };
    window.__ULYDIA_INJECT_RIGHT__ = function(node){
      var r = getRoot(); if (!r) return;
      var a = window.__ULYDIA_LAYOUT__ || ensureWrapper(r);
      if (!a) return;
      a.right.appendChild(node);
    };

    // 1) Route les futurs ajouts
    installRootRouting(api, root);

    // 2) Re-range l’existant UNE FOIS
    moveExistingIntoColumns(api, root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
