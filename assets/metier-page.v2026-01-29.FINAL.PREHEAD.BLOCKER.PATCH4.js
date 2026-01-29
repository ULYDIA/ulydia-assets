/* =========================================================
   ULYDIA — PREHEAD BLOCKER — PATCH4 (SAFE)
   Goal:
   - Stop the legacy FIX31 script (and any /undefined script) from ever loading
   - WITHOUT breaking current base/patch pipeline (do NOT block SPONSORLINKFIX etc.)
   Must be placed VERY HIGH in <head> (before any other metier-page scripts)
========================================================= */
(function(){
  "use strict";
  if (window.__ULYDIA_PREHEAD_BLOCKER_PATCH4__) return;
  window.__ULYDIA_PREHEAD_BLOCKER_PATCH4__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG) console.log.apply(console, ["[ULYDIA][PREHEAD][BLOCKER]"].concat([].slice.call(arguments))); }

  function isBadScriptSrc(src){
    src = String(src||"");
    if (!src) return false;
    var s = src.toLowerCase();
    // ✅ block the old file we know causes /undefined + loops
    if (s.indexOf("metier-page.v2026-01-24.fix31") !== -1) return true;
    // ✅ block any accidental "undefined" script URL
    if (s.indexOf("/undefined") !== -1 || s.endsWith("undefined")) return true;
    return false;
  }

  // 1) Remove already-present bad scripts ASAP
  try{
    var scripts = document.getElementsByTagName("script");
    for (var i=scripts.length-1;i>=0;i--){
      var sc = scripts[i];
      if (isBadScriptSrc(sc.src)){
        log("removing existing script", sc.src);
        sc.parentNode && sc.parentNode.removeChild(sc);
      }
    }
  }catch(e){}

  // 2) Prevent insertion of bad scripts later (e.g. by Webflow interactions)
  var _appendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function(node){
    try{
      if (node && node.tagName === "SCRIPT" && isBadScriptSrc(node.src)){
        log("blocked appendChild(script)", node.src);
        return node; // swallow
      }
    }catch(e){}
    return _appendChild.call(this, node);
  };

  var _insertBefore = Element.prototype.insertBefore;
  Element.prototype.insertBefore = function(node, ref){
    try{
      if (node && node.tagName === "SCRIPT" && isBadScriptSrc(node.src)){
        log("blocked insertBefore(script)", node.src);
        return node; // swallow
      }
    }catch(e){}
    return _insertBefore.call(this, node, ref);
  };

  // 3) Stop fetch("/undefined") style noise (doesn't affect script tag network requests)
  var _fetch = window.fetch;
  if (typeof _fetch === "function"){
    window.fetch = function(input, init){
      try{
        var url = (typeof input === "string") ? input : (input && input.url);
        var u = String(url||"");
        var low = u.toLowerCase();
        if (!u || low.indexOf("/undefined") !== -1 || low.endsWith("undefined")){
          log("blocked fetch", u || "(empty)");
          // Return a Response-like object that won't crash callers expecting headers.get/text()
          var headers = { get: function(){ return null; } };
          var res = {
            ok: false,
            status: 204,
            statusText: "No Content",
            headers: headers,
            url: u || "",
            text: function(){ return Promise.resolve(""); },
            json: function(){ return Promise.resolve({}); },
            clone: function(){ return this; }
          };
          return Promise.resolve(res);
        }
      }catch(e){}
      return _fetch.apply(this, arguments);
    };
  }
})();
