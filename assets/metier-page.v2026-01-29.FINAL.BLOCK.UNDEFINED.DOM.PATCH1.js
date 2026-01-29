(function(){
  'use strict';
  if (window.__ULYDIA_BLOCK_UNDEFINED_DOM_PATCH1__) return;
  window.__ULYDIA_BLOCK_UNDEFINED_DOM_PATCH1__ = true;

  function bad(u){
    u = String(u||'').trim();
    if (!u || u === 'undefined' || u === 'null') return true;
    if (/(^|\/)undefined(\b|\/|\?|#|$)/i.test(u)) return true;
    return false;
  }

  function patchProp(proto, prop){
    try{
      var d = Object.getOwnPropertyDescriptor(proto, prop);
      if (!d || !d.set || !d.get) return;
      Object.defineProperty(proto, prop, {
        get: d.get,
        set: function(v){
          try{
            if (bad(v)) {
              // noop: prevent network request
              return;
            }
          }catch(e){}
          return d.set.call(this, v);
        }
      });
    }catch(e){}
  }

  // Block common resource setters
  patchProp(HTMLScriptElement.prototype, 'src');
  patchProp(HTMLImageElement.prototype, 'src');
  patchProp(HTMLIFrameElement.prototype, 'src');
  patchProp(HTMLLinkElement.prototype, 'href');
  patchProp(HTMLAnchorElement.prototype, 'href');

  // Clean already present nodes
  try{
    var sel = [
      'script[src*="undefined"]',
      'img[src*="undefined"]',
      'iframe[src*="undefined"]',
      'link[href*="undefined"]',
      'a[href*="undefined"]'
    ].join(',');
    var nodes = document.querySelectorAll(sel);
    for (var i=0;i<nodes.length;i++){
      try{
        var n = nodes[i];
        if (n.tagName === 'A') n.removeAttribute('href');
        if (n.tagName === 'LINK') n.removeAttribute('href');
        if (n.tagName === 'SCRIPT') n.parentNode && n.parentNode.removeChild(n);
        if (n.tagName === 'IMG') n.removeAttribute('src');
        if (n.tagName === 'IFRAME') n.removeAttribute('src');
      }catch(e){}
    }
  }catch(e){}
})();
