/*!
ULYDIA — BASE WRAPPER — FIX16 — 2026-01-29
Purpose:
- Keep the "FIX14 anti-loop" behavior but load the NEW base (FIX15) instead of the deleted FIX13/FIX31 chain.
- Requires PREHEAD.BLOCKER.PATCH3 to run first (recommended) but works alone too.
*/
(function(){
  if (window.__ULYDIA_BASE_FIX16__) return;
  window.__ULYDIA_BASE_FIX16__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, arguments); }
  function warn(){ if(console && console.warn) console.warn.apply(console, arguments); }

  // Ensure there is only ONE root in DOM
  try{
    var roots = document.querySelectorAll("#ulydia-metier-root");
    if (roots && roots.length > 1){
      for (var i=1;i<roots.length;i++){
        try{ roots[i].parentNode && roots[i].parentNode.removeChild(roots[i]); }catch(e){}
      }
      warn("[ULYDIA] removed duplicate #ulydia-metier-root nodes:", roots.length-1);
    }
  }catch(e){}

  // Anti-loop: do not re-run if another base already started
  if (window.__ULYDIA_METIER_PAGE_BOOTING__){
    warn("[ULYDIA] base already booting — abort FIX16");
    return;
  }
  window.__ULYDIA_METIER_PAGE_BOOTING__ = true;

  // Load the real base (FIX15)
  var BASE_SRC = "https://ulydia-assets.pages.dev/assets/metier-page.v2026-01-29.FINAL.BASE.FIX15.ANTILOOP.RESPONSESAFE.js";

  function inject(){
    try{
      // If it's already present, don't inject again
      var existing = Array.prototype.slice.call(document.scripts||[]).some(function(s){
        return s && s.src && s.src.indexOf("FINAL.BASE.FIX15.ANTILOOP.RESPONSESAFE.js") !== -1;
      });
      if (existing){
        warn("[ULYDIA] FIX15 already present — skip inject");
        return;
      }
      var s = document.createElement("script");
      s.src = BASE_SRC;
      s.defer = true;
      s.onload = function(){ log("[ULYDIA] FIX15 loaded"); };
      s.onerror = function(){ warn("[ULYDIA] cannot load FIX15 base:", BASE_SRC); };
      document.head.appendChild(s);
    }catch(e){
      warn("[ULYDIA] inject failed", e);
    }
  }

  // FIX14 used a short delay to let UI be ready; keep it.
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
