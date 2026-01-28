(function(){
  // =========================================================
  // ULYDIA — BLOCK LEGACY LOADERS (HARD) — PATCH2
  // Goal:
  //  - Prevent any <script src=".../undefined"> or legacy FIX31/FIX13 assets from being injected,
  //    which causes 404 + "Unexpected token '<'" + layout glitches.
  //  - Must be included VERY EARLY and WITHOUT defer.
  //
  // Safe:
  //  - Only blocks suspicious script/link insertions + fetches.
  //  - Does NOT block your current 2026-01-28 stack assets.
  // =========================================================
  if (window.__ULYDIA_BLOCK_LEGACY_LOADERS_PATCH2__) return;
  window.__ULYDIA_BLOCK_LEGACY_LOADERS_PATCH2__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;

  function log(){ try{ if(DEBUG) console.log.apply(console, arguments);}catch(e){} }

  function norm(s){ return String(s||"").trim(); }

  // Allowlist: anything that clearly belongs to the current stack should never be blocked.
  function isAllowedUrl(url){
    url = String(url||"");
    if (!url) return false;
    // current stack
    if (url.indexOf("ulydia-assets.pages.dev/assets/") !== -1) return true;
    // webflow core
    if (url.indexOf("webflow.js") !== -1) return true;
    return false;
  }

  // Block rules (only apply when NOT allowlisted)
  var BLOCK_PATTERNS = [
    /\/undefined(\?|$)/i,
    /metier-page\.v2026-01-24\.FIX31\.js/i,
    /BASE\.FIX13/i,
    /SPONSORLINKFIX/i,
    /BASE\.FIX5/i,
    /FIX\d{2}\.js/i // aggressive only for non-allowlisted paths
  ];

  function shouldBlockUrl(url){
    url = String(url||"");
    if (!url) return true;
    if (isAllowedUrl(url)) return false;

    // obvious bad values
    var u = norm(url).toLowerCase();
    if (u === "undefined" || u === "null" || u === "[object object]") return true;

    for (var i=0;i<BLOCK_PATTERNS.length;i++){
      if (BLOCK_PATTERNS[i].test(url)) return true;
    }
    return false;
  }

  // --------- DOM insertion blockers (scripts/links) ----------
  function getUrlFromEl(el){
    try{
      if (!el || !el.tagName) return "";
      var t = el.tagName.toUpperCase();
      if (t === "SCRIPT") return el.src || el.getAttribute("src") || "";
      if (t === "LINK")   return el.href || el.getAttribute("href") || "";
    }catch(e){}
    return "";
  }

  function blockIfNeeded(el){
    try{
      if (!el || !el.tagName) return false;
      var t = el.tagName.toUpperCase();
      if (t !== "SCRIPT" && t !== "LINK") return false;

      var url = getUrlFromEl(el);
      if (!url) {
        // if someone is creating <script> then sets src later, we can't block yet
        return false;
      }
      if (shouldBlockUrl(url)) {
        log("[ULYDIA][BLOCK] prevented injection:", t, url);
        return true;
      }
    }catch(e){}
    return false;
  }

  // Patch Node insertion methods
  var _appendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child){
    if (blockIfNeeded(child)) return child;
    return _appendChild.call(this, child);
  };

  var _insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode){
    if (blockIfNeeded(newNode)) return newNode;
    return _insertBefore.call(this, newNode, referenceNode);
  };

  // Patch setAttribute to catch src/href being set later
  var _setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value){
    try{
      var n = String(name||"").toLowerCase();
      if ((n === "src" || n === "href") && this && this.tagName) {
        var t = this.tagName.toUpperCase();
        if ((t === "SCRIPT" || t === "LINK")) {
          var v = String(value||"");
          if (v && shouldBlockUrl(v)) {
            log("[ULYDIA][BLOCK] prevented setAttribute:", t, n, v);
            return; // swallow
          }
        }
      }
    }catch(e){}
    return _setAttribute.call(this, name, value);
  };

  // Also watch for nodes inserted by innerHTML (MutationObserver)
  try{
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){
        var nodes = m.addedNodes || [];
        for (var i=0;i<nodes.length;i++){
          var node = nodes[i];
          if (!node || !node.tagName) continue;
          if (blockIfNeeded(node)) {
            try{ node.remove(); }catch(e){}
          }
          // scan subtree quickly
          try{
            var scripts = node.querySelectorAll ? node.querySelectorAll("script[src],link[href]") : [];
            for (var j=0;j<scripts.length;j++){
              var el = scripts[j];
              var url = getUrlFromEl(el);
              if (url && shouldBlockUrl(url)) {
                log("[ULYDIA][BLOCK] removed injected:", el.tagName, url);
                try{ el.remove(); }catch(e){}
              }
            }
          }catch(e){}
        }
      });
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }catch(e){}

  // --------- fetch blocker (prevents /undefined -> HTML -> SyntaxError) ----------
  if (window.fetch) {
    var _fetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      try{
        var url = (typeof input === "string") ? input : (input && input.url) ? input.url : "";
        if (url && shouldBlockUrl(url)) {
          log("[ULYDIA][BLOCK][fetch]", url);
          // Always return a real Response so callers can do .text()/.json()
          return Promise.resolve(new Response("", { status: 204, statusText: "No Content" }));
        }
      }catch(e){}
      return _fetch(input, init);
    };
  }

})();