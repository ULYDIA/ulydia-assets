
/*!
 * ULYDIA — METIER PAGE — FIX15 CLEAN GUARD (NO INJECT)
 * 2026-01-29
 *
 * Purpose:
 * - Stop any 3rd-party / legacy code from injecting extra "metier-page" scripts (FIX13/FIX15 wrappers, etc.)
 * - Keep only ONE metier-page runtime (the one you explicitly include in Webflow)
 * - Normalize language (param ?lang=xx) + dispatch ULYDIA:I18N_UPDATE for your patches
 *
 * What this file DOES NOT do:
 * - It does NOT render the page by itself.
 *   You must keep your real runtime script included explicitly:
 *   e.g. <script src=".../metier-page.v2026-01-29.FINAL.BASE.FIX15.ANTILOOP.RESPONSESAFE.js" defer></script>
 *
 * Recommended order in Webflow BODY (bottom):
 *   1) <div id="ulydia-metier-root"></div>
 *   2) Global config (WORKER_URL, PROXY_SECRET, IPINFO_TOKEN)
 *   3) THIS guard (can be in HEAD too, but BODY bottom works if it runs before legacy injectors)
 *   4) The real base FIX15 script (explicit, NOT injected)
 */
(function(){
  "use strict";

  // ---------------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------------
  if (window.__ULYDIA_FIX15_CLEAN_GUARD__) return;
  window.__ULYDIA_FIX15_CLEAN_GUARD__ = true;

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  function log(){ try{ if (window.__METIER_PAGE_DEBUG__ && console && console.log) console.log.apply(console, arguments); }catch(e){} }
  function warn(){ try{ if (console && console.warn) console.warn.apply(console, arguments); }catch(e){} }

  function normLang(v){
    v = String(v||"").trim().toLowerCase();
    v = v.replace(/[^a-z-]/g,"");
    if (!v) return null;
    // Accept: fr, en, de, es, it (+ optional region)
    var base = v.split("-")[0];
    if (!base) return null;
    // clamp to supported (adjust if needed)
    var ok = { fr:1, en:1, de:1, es:1, it:1 };
    if (!ok[base]) return base; // keep unknown base (do not break)
    return base;
  }

  function getParam(name){
    try { return new URLSearchParams(location.search).get(name); } catch(e){ return null; }
  }

  // ---------------------------------------------------------------------------
  // 1) Language normalization (Chrome vs Safari vs Google Translate)
  // ---------------------------------------------------------------------------
  (function setLang(){
    var p = normLang(getParam("lang"));
    var stored = null;
    try { stored = normLang(localStorage.getItem("ulydia_lang")); } catch(e){}
    var chosen = p || stored || normLang(window.__ULYDIA_LANG__) || "fr";

    window.__ULYDIA_LANG__ = chosen;
    try { localStorage.setItem("ulydia_lang", chosen); } catch(e){}

    // keep <html lang> consistent (do not force if already correct)
    try {
      var html = document.documentElement;
      if (html && (!html.getAttribute("lang") || html.getAttribute("lang").length < 2)) {
        html.setAttribute("lang", chosen);
      }
    } catch(e){}

    // Prevent Chrome auto-translate from interfering with your i18n titles
    // (this does NOT block user-initiated translation, but reduces auto behavior)
    try {
      if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
        var m = document.createElement("meta");
        m.setAttribute("name","google");
        m.setAttribute("content","notranslate");
        (document.head||document.documentElement).appendChild(m);
      }
    } catch(e){}

    // Notify your UI patches
    try { window.dispatchEvent(new Event("ULYDIA:I18N_UPDATE")); } catch(e){}
    log("[ULYDIA] FIX15 CLEAN GUARD lang:", { param:p, stored:stored, chosen:chosen, nav:navigator.language });
  })();

  // ---------------------------------------------------------------------------
  // 2) Remove duplicate roots (avoid double mount)
  // ---------------------------------------------------------------------------
  (function ensureSingleRoot(){
    try{
      var roots = document.querySelectorAll("#ulydia-metier-root");
      if (roots && roots.length > 1){
        for (var i=1;i<roots.length;i++){
          try { roots[i].parentNode && roots[i].parentNode.removeChild(roots[i]); } catch(e){}
        }
        warn("[ULYDIA] removed duplicate #ulydia-metier-root nodes:", roots.length-1);
      }
    }catch(e){}
  })();

  // ---------------------------------------------------------------------------
  // 3) Prevent future injection of unwanted metier-page scripts
  //    - Allowlist: the scripts already present AND any script with data-ulydia-allow="1"
  // ---------------------------------------------------------------------------
  var allow = Object.create(null);
  function markAllowed(src){
    if (!src) return;
    allow[String(src)] = 1;
  }

  // Mark currently present metier-page scripts as allowed (your explicit includes)
  (function snapshotAllowed(){
    try{
      var list = Array.prototype.slice.call(document.querySelectorAll('script[src*="metier-page"]') || []);
      list.forEach(function(s){ markAllowed(s.src); });
      log("[ULYDIA] guard allowed initial metier-page scripts:", list.map(function(s){ return s.src; }));
    }catch(e){}
  })();

  function isMetierPageScriptNode(node){
    try{
      return !!(node && node.tagName === "SCRIPT" && node.src && String(node.src).indexOf("metier-page") !== -1);
    }catch(e){ return false; }
  }

  function shouldBlock(node){
    try{
      if (!isMetierPageScriptNode(node)) return false;

      // explicit allow flag on script tag
      try { if (node.getAttribute && node.getAttribute("data-ulydia-allow") === "1") return false; } catch(e){}

      var src = String(node.src || "");
      if (allow[src]) return false; // already approved

      // Heuristic: block legacy sponsorlink FIX13 & any wrapper-like re-injectors
      // (keep your base FIX15 explicit include, it should be allowlisted already)
      return true;
    }catch(e){
      return false;
    }
  }

  function patchInserters(){
    var patched = false;

    function wrap(proto, fnName){
      try{
        var orig = proto && proto[fnName];
        if (!orig || orig.__ul_patched__) return;
        function patchedFn(node){
          if (shouldBlock(node)){
            warn("[ULYDIA] blocked injected script:", node.src);
            return node; // do not insert
          }
          // if it's metier-page and not blocked, remember it
          try { if (isMetierPageScriptNode(node)) markAllowed(node.src); } catch(e){}
          return orig.call(this, node);
        }
        patchedFn.__ul_patched__ = true;
        proto[fnName] = patchedFn;
        patched = true;
      }catch(e){}
    }

    wrap(Element.prototype, "appendChild");
    wrap(Node.prototype, "appendChild");
    wrap(Node.prototype, "insertBefore");
    wrap(Element.prototype, "insertBefore");

    if (patched) log("[ULYDIA] FIX15 CLEAN GUARD: injection blockers enabled");
  }

  patchInserters();

  // ---------------------------------------------------------------------------
  // 4) Actively remove *extra* metier-page scripts already inserted (best effort)
  //    Note: if a script has already executed, removing won't undo it, but it helps
  //    prevent subsequent duplicate boots.
  // ---------------------------------------------------------------------------
  (function pruneExisting(){
    try{
      var scripts = Array.prototype.slice.call(document.querySelectorAll('script[src*="metier-page"]') || []);
      scripts.forEach(function(s){
        // keep allowlisted
        if (allow[String(s.src||"")]) return;
        try{
          warn("[ULYDIA] removing non-allowlisted metier-page script:", s.src);
          s.parentNode && s.parentNode.removeChild(s);
        }catch(e){}
      });
    }catch(e){}
  })();

  // ---------------------------------------------------------------------------
  // 5) Optional: expose a tiny diagnostics helper
  // ---------------------------------------------------------------------------
  window.__ULYDIA_FIX15_GUARD_DIAG__ = function(){
    var res = {};
    try {
      res.param_lang = getParam("lang");
      res.ulydia_lang = window.__ULYDIA_LANG__;
      res.nav_lang = navigator.language;
      res.html_lang = document.documentElement.getAttribute("lang");
      res.scripts = Array.prototype.slice.call(document.querySelectorAll('script[src*="metier-page"]')||[])
        .map(function(s){ return s.src; });
    } catch(e){}
    return res;
  };

})();
