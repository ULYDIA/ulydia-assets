(function(){
  'use strict';
  if (window.__ULYDIA_BLOCK_LEGACY_LOADERS_PATCH1__) return;
  window.__ULYDIA_BLOCK_LEGACY_LOADERS_PATCH1__ = true;

  // Blocks accidental legacy injectors that try to load:
  // - /undefined
  // - old FIXxx files (e.g., FIX31, FIX13...) that no longer exist and break the page
  // This prevents "Unexpected token '<'" (HTML 404 executed as JS) and stops layout from collapsing to 1 column.

  var BAD_PATTERNS = [
    '/undefined',
    'metier-page.v2026-01-24.',
    'FIX31',
    'FIX13',
    'SPONSORLINKFIX',
    'BASE.FIX5'
  ];

  function isBadUrl(u){
    if (!u) return true; // empty/undefined/null
    u = String(u);
    for (var i=0;i<BAD_PATTERNS.length;i++){
      if (u.indexOf(BAD_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  function blockScript(node){
    try{
      if (!node || !node.tagName) return false;
      var tag = String(node.tagName).toUpperCase();
      if (tag !== 'SCRIPT') return false;

      var src = node.getAttribute && node.getAttribute('src');
      // Some injectors set node.src directly
      if (!src && 'src' in node) src = node.src;

      if (isBadUrl(src)){
        try{
          if (window.__METIER_PAGE_DEBUG__) console.warn('[ULYDIA][BLOCK_LEGACY] blocked script:', src, node);
        }catch(e){}
        // neutralize
        try{ node.type = 'application/blocked'; }catch(e){}
        try{ node.src = ''; }catch(e){}
        return true;
      }
      return false;
    }catch(e){ return false; }
  }

  // Patch appendChild on head/body and generic elements.
  function wrapAppend(proto){
    var orig = proto.appendChild;
    proto.appendChild = function(node){
      if (blockScript(node)) return node;
      return orig.call(this, node);
    };
  }

  try{
    wrapAppend(HTMLHeadElement.prototype);
  }catch(e){}
  try{
    wrapAppend(HTMLBodyElement.prototype);
  }catch(e){}
  try{
    wrapAppend(Element.prototype);
  }catch(e){}

  // Also patch insertBefore (some injectors use it)
  function wrapInsert(proto){
    var orig = proto.insertBefore;
    proto.insertBefore = function(node, ref){
      if (blockScript(node)) return node;
      return orig.call(this, node, ref);
    };
  }

  try{
    wrapInsert(HTMLHeadElement.prototype);
  }catch(e){}
  try{
    wrapInsert(HTMLBodyElement.prototype);
  }catch(e){}
  try{
    wrapInsert(Element.prototype);
  }catch(e){}

})();
