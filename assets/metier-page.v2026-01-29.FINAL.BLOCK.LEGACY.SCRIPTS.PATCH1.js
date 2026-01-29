/* metier-page.v2026-01-29.FINAL.BLOCK.LEGACY.SCRIPTS.PATCH1.js */
(function(){
  'use strict';
  if (window.__ULYDIA_BLOCK_LEGACY_SCRIPTS_PATCH1__) return;
  window.__ULYDIA_BLOCK_LEGACY_SCRIPTS_PATCH1__ = true;

  var BAD_SCRIPT_SRC = [
    /metier-page\.v2026-01-24\.FIX31/i,         // le 404 que tu vois
    /\/undefined(\?|$)/i,                       // scripts vers /undefined
  ];

  function isBad(u){
    u = String(u||'').trim();
    if (!u) return false;
    for (var i=0;i<BAD_SCRIPT_SRC.length;i++){
      if (BAD_SCRIPT_SRC[i].test(u)) return true;
    }
    return false;
  }

  // 1) Bloque l’injection de <script src="...">
  var _append = Element.prototype.appendChild;
  Element.prototype.appendChild = function(node){
    try{
      if (node && node.tagName === 'SCRIPT' && isBad(node.src)) {
        console.warn('[ULYDIA][BLOCK] script blocked:', node.src);
        return node; // noop
      }
    }catch(e){}
    return _append.call(this, node);
  };

  // 2) Bloque les fetch évidents vers /undefined (sans casser le reste)
  var _fetch = window.fetch && window.fetch.bind(window);
  if (_fetch){
    window.fetch = function(input, init){
      try{
        var url = (typeof input === 'string') ? input : (input && input.url) ? input.url : '';
        url = String(url||'');
        if (/(^|\/)undefined(\?|$)/i.test(url)) {
          console.warn('[ULYDIA][BLOCK] fetch blocked:', url);
          return Promise.resolve(new Response('', { status: 204, statusText: 'Blocked undefined' }));
        }
      }catch(e){}
      return _fetch(input, init);
    };
  }
})();
