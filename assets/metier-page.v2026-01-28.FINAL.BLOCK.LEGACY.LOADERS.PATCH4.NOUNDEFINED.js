
/* =========================================================
ULYDIA — BLOCK LEGACY LOADERS + /undefined FETCH — PATCH4
- Prevents old scripts (FIX31 / FIX13 / old i18n-ui) from being injected again
- Blocks network calls to "/undefined" (source of console errors + counter)
- Safe no-op if browser lacks fetch/Response
Place FIRST in <body>, BEFORE any other metier-page scripts.
========================================================= */
(function(){
  try{
    if (window.__ULYDIA_BLOCK_LEGACY_PATCH4__) return;
    window.__ULYDIA_BLOCK_LEGACY_PATCH4__ = true;

    // ---- Config: patterns to block ----
    var BAD_SRC_PATTERNS = [
      /metier-page\.v2026-01-24\.FIX31/i,
      /metier-page\.v2026-01-25\.FINAL\.BASE\.FIX13/i,
      /BLOCKS\.LEFT\.PATCH3\.I18N/i,
      /I18N\.UI\.STABLE\.PATCH1/i
    ];

    function isBadSrc(src){
      src = String(src||"");
      for (var i=0;i<BAD_SRC_PATTERNS.length;i++){
        if (BAD_SRC_PATTERNS[i].test(src)) return true;
      }
      return false;
    }

    // ---- 1) Remove already-present legacy script tags (if not executed yet) ----
    function removeLegacyScripts(){
      try{
        var list = document.querySelectorAll('script[src]');
        for (var i=0;i<list.length;i++){
          var s = list[i];
          var src = s.getAttribute('src') || '';
          if (isBadSrc(src)) {
            // If it hasn't executed yet, removing prevents execution.
            // If it already executed, removing at least avoids re-reads via SPA nav.
            s.parentNode && s.parentNode.removeChild(s);
          }
        }
      }catch(e){}
    }

    // run early + again after DOM ready (Webflow can inject)
    removeLegacyScripts();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", removeLegacyScripts);
    } else {
      setTimeout(removeLegacyScripts, 0);
    }

    // ---- 2) Block future injection of legacy scripts (head/body append/insert) ----
    function patchNodeInsert(proto){
      if (!proto) return;
      var _append = proto.appendChild;
      var _insert = proto.insertBefore;

      function shouldBlock(node){
        try{
          if (!node || node.nodeType !== 1) return false;
          if (node.tagName !== "SCRIPT") return false;
          var src = node.getAttribute("src") || node.src || "";
          return isBadSrc(src);
        }catch(e){ return false; }
      }

      proto.appendChild = function(node){
        if (shouldBlock(node)) return node; // swallow
        return _append.call(this, node);
      };
      proto.insertBefore = function(node, ref){
        if (shouldBlock(node)) return node; // swallow
        return _insert.call(this, node, ref);
      };
    }

    patchNodeInsert(Element && Element.prototype);

    // ---- 3) Block fetch/XHR to "/undefined" or legacy 404 scripts ----
    function isBadUrl(url){
      url = String(url||"");
      if (!url) return true;
      if (/(^|\/)undefined(\?|$)/i.test(url)) return true;
      if (/metier-page\.v2026-01-24\.FIX31/i.test(url)) return true;
      if (/BLOCKS\.LEFT\.PATCH3\.I18N/i.test(url)) return true;
      return false;
    }

    function makeEmptyResponse(){
      // Prefer real Response
      try{
        if (typeof Response === "function") return new Response("", { status: 204, statusText: "No Content" });
      }catch(e){}
      // Fallback duck-typed response
      return {
        ok: false,
        status: 204,
        statusText: "No Content",
        headers: { get: function(){ return null; } },
        text: function(){ return Promise.resolve(""); },
        json: function(){ return Promise.resolve(null); }
      };
    }

    if (typeof window.fetch === "function"){
      var _fetch = window.fetch;
      window.fetch = function(input, init){
        try{
          var url = (typeof input === "string") ? input : (input && input.url);
          if (isBadUrl(url)) return Promise.resolve(makeEmptyResponse());
        }catch(e){}
        return _fetch.apply(this, arguments);
      };
    }

    if (typeof XMLHttpRequest === "function"){
      var _open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url){
        try{
          if (isBadUrl(url)) {
            // redirect to harmless empty endpoint
            return _open.call(this, method, "data:text/plain,");
          }
        }catch(e){}
        return _open.apply(this, arguments);
      };
    }

    // ---- 4) Sanitize "undefined" links (optional) ----
    function sanitizeLinks(){
      try{
        var a = document.querySelectorAll('a[href*="undefined"]');
        for (var i=0;i<a.length;i++){
          a[i].setAttribute("href", "#");
        }
      }catch(e){}
    }
    sanitizeLinks();
    document.addEventListener("click", sanitizeLinks, true);

    // ---- 5) Reduce console spam (optional) ----
    try{ window.__METIER_PAGE_DEBUG__ = false; }catch(e){}

    console.log("[ULYDIA] PATCH4 legacy blockers armed");
  }catch(err){
    // never crash the page
    try{ console.warn("[ULYDIA] PATCH4 failed:", err); }catch(e){}
  }
})();
