/**
 * ULYDIA — BLOCK /undefined REQUESTS — PATCH1
 * Prevents legacy loaders from spamming GET https://www.ulydia.com/undefined
 * Safe: does NOT touch layout/rendering.
 */
(function(){
  if (window.__ULYDIA_BLOCK_UNDEFINED_REQ__) return;
  window.__ULYDIA_BLOCK_UNDEFINED_REQ__ = true;

  function isBadUrl(u){
    try{
      var s = String(u||"");
      return s.indexOf("/undefined") !== -1 || /undefined$/.test(s);
    }catch(e){ return false; }
  }

  // Remove any script tags pointing to "undefined"
  try{
    var scripts = Array.prototype.slice.call(document.querySelectorAll('script[src]'));
    scripts.forEach(function(sc){
      var src = sc.getAttribute('src') || "";
      if (isBadUrl(src)) {
        console.warn("[ULYDIA][PATCH] removed legacy script:", src);
        sc.parentNode && sc.parentNode.removeChild(sc);
      }
    });
  }catch(e){}

  // Patch fetch
  try{
    var _fetch = window.fetch;
    if (typeof _fetch === "function") {
      window.fetch = function(input, init){
        var url = input && (typeof input === "string" ? input : (input.url || ""));
        if (isBadUrl(url)) {
          console.warn("[ULYDIA][PATCH] blocked fetch:", url);
          return Promise.resolve(new Response("", { status: 204, statusText: "blocked" }));
        }
        return _fetch.apply(this, arguments);
      };
    }
  }catch(e){}

  // Patch XHR
  try{
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url){
      if (isBadUrl(url)) {
        console.warn("[ULYDIA][PATCH] blocked XHR:", url);
        this.__ulydia_blocked__ = true;
        return;
      }
      return _open.apply(this, arguments);
    };

    var _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(){
      if (this.__ulydia_blocked__) {
        try{
          this.readyState = 4;
          this.status = 204;
          this.responseText = "";
          this.response = "";
          this.onreadystatechange && this.onreadystatechange();
          this.onload && this.onload();
        }catch(e){}
        return;
      }
      return _send.apply(this, arguments);
    };
  }catch(e){}

  // Observe future injected scripts
  try{
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var added = muts[i].addedNodes || [];
        for (var j=0;j<added.length;j++){
          var n = added[j];
          if (!n || n.nodeType !== 1) continue;
          if (n.tagName === "SCRIPT" && n.src && isBadUrl(n.src)) {
            console.warn("[ULYDIA][PATCH] removed injected legacy script:", n.src);
            n.parentNode && n.parentNode.removeChild(n);
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }catch(e){}
})();
