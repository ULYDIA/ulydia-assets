/* =========================================================
ULYDIA — BLOCK /undefined REQUESTS — PATCH2 (Return real Response)
Purpose:
- Some legacy/duplicate scripts still attempt to fetch or load "undefined" URLs
  (e.g., https://www.ulydia.com/undefined or .../metier-page...FIX31.js 404),
  which then explode with:
  - SyntaxError: Unexpected token '<' (HTML returned)
  - TypeError: r.text is not a function
  - TypeError: Cannot read properties of undefined (reading 'get')
This patch:
- Intercepts fetch() / XHR / <script src> assignments
- When URL is missing/undefined or ends with "/undefined" or contains "undefined"
  in a path segment, we short-circuit with a *real* Response(204) so downstream
  code can safely call .text(), .json(), .headers.get(), etc.
- Also blocks script tags whose src becomes undefined-like.
Load:
- As early as possible (ideally right after BLOCK.LEGACY.LOADERS.PATCH4...)
========================================================= */
(function(){
  if (window.__ULYDIA_BLOCK_UNDEFINED_PATCH2__) return;
  window.__ULYDIA_BLOCK_UNDEFINED_PATCH2__ = true;

  function s(x){ return String(x || ""); }

  function isBadUrl(u){
    u = s(u).trim();
    if (!u) return true;
    if (u === "undefined" || u === "null") return true;
    if (u.endsWith("/undefined") || u.includes("//undefined") || u.includes("/undefined?")) return true;
    if (/\/undefined(\b|\/|\?|#)/i.test(u)) return true;
    return false;
  }

  function safeResponse(){
    try{
      return Promise.resolve(new Response("", { status: 204, statusText: "No Content" }));
    }catch(e){
      var headers = { get: function(){ return null; } };
      return Promise.resolve({
        ok:false, status:204, statusText:"No Content", headers:headers,
        text:function(){ return Promise.resolve(""); },
        json:function(){ return Promise.resolve(null); },
        clone:function(){ return this; }
      });
    }
  }

  var _fetch = window.fetch;
  if (typeof _fetch === "function") {
    window.fetch = function(input, init){
      try{
        var url = (typeof input === "string") ? input : (input && input.url);
        if (isBadUrl(url)) {
          if (window.__METIER_PAGE_DEBUG__) console.warn("[ULYDIA] blocked fetch(undefined):", url);
          return safeResponse();
        }
      }catch(e){}
      return _fetch.apply(this, arguments);
    };
  }

  var XHR = window.XMLHttpRequest;
  if (XHR && XHR.prototype) {
    var _open = XHR.prototype.open;
    XHR.prototype.open = function(method, url){
      try{
        if (isBadUrl(url)) {
          if (window.__METIER_PAGE_DEBUG__) console.warn("[ULYDIA] blocked XHR(undefined):", method, url);
          return _open.call(this, method, "about:blank", true);
        }
      }catch(e){}
      return _open.apply(this, arguments);
    };
  }

  try{
    var desc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
    if (desc && desc.set) {
      Object.defineProperty(HTMLScriptElement.prototype, "src", {
        get: desc.get,
        set: function(v){
          try{
            if (isBadUrl(v)) {
              if (window.__METIER_PAGE_DEBUG__) console.warn("[ULYDIA] blocked <script src=undefined>");
              return;
            }
          }catch(e){}
          return desc.set.call(this, v);
        }
      });
    }
  }catch(e){}

  try{
    var bad = document.querySelectorAll('script[src*="undefined"], script[src$="/undefined"]');
    for (var i=0;i<bad.length;i++){
      bad[i].parentNode && bad[i].parentNode.removeChild(bad[i]);
    }
  }catch(e){}

  if (window.__METIER_PAGE_DEBUG__) console.log("[ULYDIA] BLOCK.UNDEFINED.REQUESTS PATCH2 active");
})();
