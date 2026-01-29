/*!
ULYDIA — METIER PAGE — SINGLE LOADER BUNDLE (PROD) — V2 — 2026-01-29
Fixes vs V1:
- Enforces TRUE sequential execution order (no defer/async surprises) by using async=false and waiting onload.
- Sets UI language EARLY from URL `country=` BEFORE loading UI/I18N patches to avoid wrong titles/subtitles in MPB3.
- Adds early banner sizing CSS to prevent "banner en grand" / layout jump on refresh.
- After ctx is available, refines language from payload and emits LANG_CHANGED to re-render texts.

Usage:
- Keep only root + config + this script include.
*/

(function(){
  "use strict";
  if (window.__ULYDIA_SINGLE_BUNDLE_LOADER_V2__) return;
  window.__ULYDIA_SINGLE_BUNDLE_LOADER_V2__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, ["[bundle.v2]"].concat([].slice.call(arguments))); }
  function warn(){ if(console && console.warn) console.warn.apply(console, ["[bundle.v2]"].concat([].slice.call(arguments))); }

  var BASE = "https://ulydia-assets.pages.dev/assets/";

  // ---------------------------------------------------------
  // Early language (from URL country) BEFORE loading patches
  // ---------------------------------------------------------
  function getUrlParam(key){
    try{ return new URL(window.location.href).searchParams.get(key); }
    catch(e){ return null; }
  }
  function normalizeLang(l){
    l = String(l||"").toLowerCase().trim();
    if (!l) return "";
    if (l.indexOf("-") !== -1) l = l.split("-")[0];
    return l;
  }
  function guessLangFromCountry(iso){
    iso = String(iso||"").toUpperCase().trim();
    if (["FR","BE","CH","CA","LU","MC"].includes(iso)) return "fr";
    if (["DE","AT"].includes(iso)) return "de";
    if (["ES"].includes(iso)) return "es";
    if (["IT","SM","VA"].includes(iso)) return "it";
    return "en";
  }
  function setLang(lang){
    lang = normalizeLang(lang);
    if (!lang) return;
    window.__ULYDIA_LANG__ = lang;
    try{ document.documentElement.setAttribute("lang", lang); }catch(e){}
  }

  var urlCountry = getUrlParam("country");
  setLang(guessLangFromCountry(urlCountry));

  // ---------------------------------------------------------
  // Early banner sizing CSS to avoid "banner en grand" jumps
  // ---------------------------------------------------------
  (function ensureBannerCSS(){
    if (document.getElementById("ulydia-banner-size-css")) return;
    var st = document.createElement("style");
    st.id = "ulydia-banner-size-css";
    st.textContent = `
/* ULYDIA banners — prevent oversized images / layout jump */
.ulydia-banner, .ulydia-sponsor-banner, [data-ulydia-banner]{max-width:100%;}
.ulydia-banner img, .ulydia-sponsor-banner img, [data-ulydia-banner] img{
  width:100% !important;
  height:auto !important;
  display:block;
  object-fit:cover;
}
[data-ulydia-banner="landscape"] img{aspect-ratio: 680 / 120;}
[data-ulydia-banner="square"] img{aspect-ratio: 300 / 300;}
`.trim();
    document.head.appendChild(st);
  })();

  // ---------------------------------------------------------
  // Script list (strict order)
  // ---------------------------------------------------------
  var SCRIPTS = [
    "ulydia-ui.v2.js",
    "ulydia-i18n.v1.3.js",

    "metier-page.v2026-01-29.FINAL.BASE.FIX16.WRAPPER.SAFEURL.js",
    "metier-page.v2026-01-29.FINAL.LOADER.OVERLAY.PATCH1.js",
    "metier-page.v2026-01-29.FINAL.HIDE.FILTERBAR.PATCH1.js",

    "metier-page.v2026-01-25.FINAL.BLOCFLATTEN.PATCH1.js",

    // LEFT (latest)
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

  // ---------------------------------------------------------
  // TRUE sequential loader (no defer, no async surprises)
  // ---------------------------------------------------------
  function loadScriptSeq(name){
    return new Promise(function(resolve, reject){
      var url = (name.indexOf("http") === 0) ? name : (BASE + name);

      // avoid duplicates
      var exists = Array.prototype.slice.call(document.scripts||[]).some(function(x){
        return x && x.src && x.src.indexOf(url) !== -1;
      });
      if (exists) return resolve(true);

      try{
        var s = document.createElement("script");
        s.src = url;
        s.async = false;            // critical
        s.defer = false;            // critical
        s.onload = function(){ resolve(true); };
        s.onerror = function(){ reject(new Error("Failed to load " + url)); };
        document.head.appendChild(s);
      }catch(e){ reject(e); }
    });
  }

  function loadAll(){
    return SCRIPTS.reduce(function(p, name){
      return p.then(function(){
        log("load", name);
        return loadScriptSeq(name);
      });
    }, Promise.resolve());
  }

  // ---------------------------------------------------------
  // Refine language after ctx is ready (payload wins)
  // ---------------------------------------------------------
  function refineLangFromCtx(){
    var ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (!ctx) return false;

    var l =
      normalizeLang(ctx.lang) ||
      normalizeLang(ctx.language) ||
      normalizeLang(ctx.pays && (ctx.pays.lang || ctx.pays.default_lang || ctx.pays.language)) ||
      normalizeLang(ctx.country && (ctx.country.lang || ctx.country.default_lang || ctx.country.language));

    if (!l) {
      var iso = ctx.iso || urlCountry;
      l = guessLangFromCountry(iso);
    }

    if (l && window.__ULYDIA_LANG__ !== l){
      setLang(l);
      try{
        var bus = window.__ULYDIA_METIER_BUS__;
        if (bus && typeof bus.emit === "function") bus.emit("ULYDIA:LANG_CHANGED", {lang:l});
        window.dispatchEvent(new CustomEvent("ULYDIA:LANG_CHANGED", {detail:{lang:l}}));
      }catch(e){}
      log("lang refined =>", l);
    }
    return true;
  }

  function waitForCtxThenRefine(){
    var tries = 0, max = 300; // ~15s
    var t = setInterval(function(){
      tries++;
      var ok = false;
      try{ ok = refineLangFromCtx(); }catch(e){}
      if (ok || tries >= max) clearInterval(t);
    }, 50);
  }

  // Kick off
  loadAll()
    .then(function(){
      waitForCtxThenRefine();
      log("all loaded");
    })
    .catch(function(err){
      warn(err && err.message ? err.message : err);
    });

})();
