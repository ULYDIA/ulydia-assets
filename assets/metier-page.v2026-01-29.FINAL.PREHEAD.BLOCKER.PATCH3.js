/*!
ULYDIA — PREHEAD BLOCKER — v2026-01-29 PATCH3
- Blocks legacy scripts (FIX31/ONSOR/undefined) even if injected later
- Blocks fetch("/undefined") and fetch(undefined) and returns Response-like object
- Safe to load in <head> WITHOUT defer (must run first)
*/
(function(){
  if (window.__ULYDIA_PREHEAD_BLOCKER__) return;
  window.__ULYDIA_PREHEAD_BLOCKER__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, arguments); }
  function warn(){ if(console && console.warn) console.warn.apply(console, arguments); }

  function asString(x){
    try { return (x===undefined || x===null) ? "" : String(x); } catch(e){ return ""; }
  }

  // Patterns to block (scripts & fetch)
  var BLOCK_PATTERNS = [
    "/undefined",
    "FIX31",
    "ONSORLINKFIX",
    "SPONSORLINKFIX",
    "metier-page.v2026-01-24",
    "metier-page.v2026-01-23"
  ];

  function isBlockedUrl(u){
    u = asString(u);
    if (!u) return true; // empty/undefined => block
    for (var i=0;i<BLOCK_PATTERNS.length;i++){
      if (u.indexOf(BLOCK_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  // Response-like fallback (so r.text(), r.json(), r.headers.get exist)
  function fakeResponse(status){
    status = status || 204;
    var headers = { get: function(){ return null; } };
    var resp = {
      ok: false,
      status: status,
      headers: headers,
      text: function(){ return Promise.resolve(""); },
      json: function(){ return Promise.resolve({}); },
      clone: function(){ return resp; }
    };
    return resp;
  }

  // Try to return a real Response when possible, otherwise a safe shim.
  function makeResponse(){
    try {
      if (typeof Response !== "undefined") return new Response("", { status: 204 });
    } catch(e) {}
    return fakeResponse(204);
  }

  // 1) Patch window.fetch
  try{
    var _fetch = window.fetch ? window.fetch.bind(window) : null;
    if (_fetch && !window.__ULYDIA_FETCH_PATCHED__){
      window.__ULYDIA_FETCH_PATCHED__ = true;
      window.fetch = function(input, init){
        var url = (typeof input === "string") ? input : (input && input.url);
        if (isBlockedUrl(url)){
          warn("[ULYDIA][BLOCK] fetch:", url || "(empty)");
          return Promise.resolve(makeResponse());
        }
        return _fetch(input, init);
      };
      log("[ULYDIA] fetch patched");
    }
  }catch(e){ warn("[ULYDIA] fetch patch failed", e); }

  // 2) Block script injection (appendChild/insertBefore) for blocked src/href
  function patchInsert(proto, fnName){
    try{
      var orig = proto[fnName];
      if (!orig || orig.__ULYDIA_PATCHED__) return;
      proto[fnName] = function(node){
        try{
          if (node && node.tagName){
            var tag = String(node.tagName).toLowerCase();
            if (tag === "script"){
              var src = node.src || node.getAttribute && node.getAttribute("src");
              if (isBlockedUrl(src)){
                warn("[ULYDIA][BLOCK] script inject:", src || "(empty)");
                return node; // swallow
              }
            }
            if (tag === "link"){
              var href = node.href || node.getAttribute && node.getAttribute("href");
              if (isBlockedUrl(href)){
                warn("[ULYDIA][BLOCK] link inject:", href || "(empty)");
                return node;
              }
            }
          }
        }catch(e){}
        return orig.apply(this, arguments);
      };
      proto[fnName].__ULYDIA_PATCHED__ = true;
    }catch(e){}
  }
  patchInsert(Node.prototype, "appendChild");
  patchInsert(Node.prototype, "insertBefore");

  // 3) Cleanup already-present bad scripts after DOM is ready
  function cleanup(){
    try{
      var scripts = Array.prototype.slice.call(document.scripts || []);
      scripts.forEach(function(s){
        var src = s && s.src;
        if (src && isBlockedUrl(src)){
          warn("[ULYDIA][CLEAN] removing script:", src);
          try{ s.parentNode && s.parentNode.removeChild(s); }catch(e){}
        }
      });
    }catch(e){}
  }
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", cleanup);
  } else {
    cleanup();
  }
})();
