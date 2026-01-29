/*!
ULYDIA — METIER PAGE — SINGLE LOADER BUNDLE (PROD) — 2026-01-29
Goal:
- Reduce Webflow <body> to ONE script include.
- Keep your existing modular files hosted on ulydia-assets, but load them in a strict order.
- After metier data is ready, force UI language (titles/subtitles) from country payload when available.

How to use:
1) Keep ONLY:
   - <div id="ulydia-metier-root"></div>
   - Config <script> (ULYDIA_WORKER_URL / PROXY_SECRET / IPINFO_TOKEN)
   - This bundle script include
2) Upload this file to ulydia-assets and include it with full URL (defer).
*/

(function(){
  "use strict";
  if (window.__ULYDIA_SINGLE_BUNDLE_LOADER__) return;
  window.__ULYDIA_SINGLE_BUNDLE_LOADER__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, ["[bundle]"].concat([].slice.call(arguments))); }
  function warn(){ if(console && console.warn) console.warn.apply(console, ["[bundle]"].concat([].slice.call(arguments))); }

  // Safety: ensure config exists early
  if (!window.ULYDIA_WORKER_URL || !window.ULYDIA_PROXY_SECRET){
    warn("[ULYDIA] Missing config globals. Ensure config <script> is BEFORE the bundle.");
  }

  var BASE = "https://ulydia-assets.pages.dev/assets/";

  // Strict order (mirrors your current body)
  var SCRIPTS = [
    "ulydia-ui.v2.js",
    "ulydia-i18n.v1.3.js",

    "metier-page.v2026-01-29.FINAL.BASE.FIX16.WRAPPER.SAFEURL.js",
    "metier-page.v2026-01-29.FINAL.LOADER.OVERLAY.PATCH1.js",
    "metier-page.v2026-01-29.FINAL.HIDE.FILTERBAR.PATCH1.js",

    "metier-page.v2026-01-25.FINAL.BLOCFLATTEN.PATCH1.js",

    // LEFT (your latest)
    "metier-page.v2026-01-29.FINAL.BLOCKS.LEFT.PATCH5.MPB3INLINE.LISTS.I18N.js",

    // RIGHT + indicators
    "metier-page.v2026-01-26.FINAL.BLOCKS.RIGHT.PATCH2.SALARYFIX2.INDICATORS2.js",
    "metier-page.v2026-01-26.FINAL.INDICATORS.HOTFIX4.js",

    // Banner + tweaks
    "metier-page.v2026-01-27.FINAL.BANNER.BEFOREFAQ.I18N.PATCH6.18.js",
    "metier-page.v2026-01-27.FINAL.SPONSOR.TAGLINE.REMOVE.PATCH1.js",

    // FAQ
    "metier-page.v2026-01-25.FINAL.FAQ.PATCH1.js",
    "metier-page.v2026-01-28.FINAL.FAQ.DEDUPE.PATCH1.js",

    // UX
    "metier-page.v2026-01-27.FINAL.RIGHT.HOVER.PATCH1.js",
    "metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH4.js",
    "metier-page.v2026-01-28.FINAL.SALARY.STICKY.PATCH1.js",

    // I18N UI last
    "metier-page.v2026-01-28.FINAL.I18N.UI.STABLE.PATCH1.js"
  ];

  function loadOne(src){
    return new Promise(function(resolve, reject){
      try{
        var s = document.createElement("script");
        s.src = src;
        s.defer = true;
        s.onload = function(){ resolve(true); };
        s.onerror = function(){ reject(new Error("Failed to load " + src)); };
        document.head.appendChild(s);
      }catch(e){ reject(e); }
    });
  }

  function seqLoad(list){
    return list.reduce(function(p, name){
      return p.then(function(){
        var url = (name.indexOf("http") === 0) ? name : (BASE + name);
        // avoid duplicates
        var exists = Array.prototype.slice.call(document.scripts||[]).some(function(x){
          return x && x.src && x.src.indexOf(url) !== -1;
        });
        if (exists) { log("skip already loaded", name); return true; }
        log("load", name);
        return loadOne(url);
      });
    }, Promise.resolve());
  }

  // ---------------------------------------------------------
  // Language: derive from metier-page ctx once available
  // ---------------------------------------------------------
  function getUrlParam(key){
    try{
      var u = new URL(window.location.href);
      return u.searchParams.get(key);
    }catch(e){ return null; }
  }

  function normalizeLang(l){
    l = String(l||"").toLowerCase().trim();
    if (!l) return "";
    if (l.indexOf("-") !== -1) l = l.split("-")[0];
    return l;
  }

  function guessLangFromCountry(iso){
    iso = String(iso||"").toUpperCase().trim();
    // fallback guess only; real source should be ctx.pays.lang/default_lang
    if (["FR","BE","CH","CA","LU","MC"].includes(iso)) return "fr";
    if (["DE","AT"].includes(iso)) return "de";
    if (["ES"].includes(iso)) return "es";
    if (["IT","SM","VA"].includes(iso)) return "it";
    return "en";
  }

  function setLang(lang){
    lang = normalizeLang(lang);
    if (!lang) return;
    if (window.__ULYDIA_LANG__ === lang) return;
    window.__ULYDIA_LANG__ = lang;
    try{
      document.documentElement.setAttribute("lang", lang);
    }catch(e){}
    try{
      // notify patches (PATCH5 listens)
      var bus = window.__ULYDIA_METIER_BUS__;
      if (bus && typeof bus.emit === "function") bus.emit("ULYDIA:LANG_CHANGED", {lang: lang});
      window.dispatchEvent(new CustomEvent("ULYDIA:LANG_CHANGED", {detail:{lang: lang}}));
    }catch(e){}
    log("lang set =>", lang);
  }

  function ensureLangFromCtx(){
    var ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (!ctx) return false;

    // best sources
    var l =
      normalizeLang(ctx.lang) ||
      normalizeLang(ctx.language) ||
      normalizeLang(ctx.pays && (ctx.pays.lang || ctx.pays.default_lang || ctx.pays.language)) ||
      normalizeLang(ctx.country && (ctx.country.lang || ctx.country.default_lang || ctx.country.language));

    if (!l){
      // fallback to URL country
      var iso = ctx.iso || getUrlParam("country");
      l = guessLangFromCountry(iso);
    }
    setLang(l);
    return true;
  }

  function waitForCtxAndSetLang(){
    var tries = 0;
    var max = 200; // ~10s
    var t = setInterval(function(){
      tries++;
      var ok = false;
      try{ ok = ensureLangFromCtx(); }catch(e){}
      if (ok || tries >= max) clearInterval(t);
    }, 50);
  }

  // Kick off
  seqLoad(SCRIPTS)
    .then(function(){
      // Once all scripts are loaded, set lang from ctx when it appears
      waitForCtxAndSetLang();
      log("all loaded");
    })
    .catch(function(err){
      warn(err && err.message ? err.message : err);
    });

})();
