(function(){
  "use strict";
  // =========================================================
  // ULYDIA — I18N Guard + Badge "Fiche métier" translation
  // FINAL.PATCH1 — 2026-01-28
  //
  // Fixes:
  // 1) Flicker caused by multiple ULYDIA:I18N_UPDATE listeners firing in loops
  //    -> Debounce all listeners for that event (global wrapper).
  // 2) Ensure the top pill/badge "Fiche Métier" is translated using __t__("metier_sheet")
  //    -> Robust DOM match + idempotent.
  //
  // IMPORTANT:
  // - Load this RIGHT AFTER ulydia-i18n.v1.3.js, BEFORE any metier-page.* I18N patches.
  // =========================================================

  if (window.__ULYDIA_I18N_GUARD_PATCH1__) return;
  window.__ULYDIA_I18N_GUARD_PATCH1__ = true;

  // ---------- small utils ----------
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function lang(){
    var l = (window.__ULYDIA_LANG__ || document.documentElement.lang || "fr").toLowerCase();
    return /^(fr|en|de|es|it)$/.test(l) ? l : "fr";
  }

  // ---------- 1) Debounce listeners for ULYDIA:I18N_UPDATE ----------
  (function(){
    var origAdd = EventTarget.prototype.addEventListener;
    var wrappedMap = new WeakMap(); // originalFn -> wrappedFn
    var queue = [];
    var scheduled = false;
    var lastRunAt = 0;
    var lastLang = null;

    function flush(){
      scheduled = false;
      var now = Date.now();
      var curLang = lang();
      // If language didn't change and we're being spammed, throttle harder
      if (lastLang === curLang && (now - lastRunAt) < 250) return;

      lastRunAt = now;
      lastLang = curLang;

      var items = queue.slice();
      queue.length = 0;

      for (var i=0;i<items.length;i++){
        try { items[i](); } catch(e){ /* swallow */ }
      }
    }

    function schedule(){
      if (scheduled) return;
      scheduled = true;
      // Debounce to end-of-frame, then a tiny idle buffer
      requestAnimationFrame(function(){
        setTimeout(flush, 60);
      });
    }

    EventTarget.prototype.addEventListener = function(type, listener, options){
      if (type !== "ULYDIA:I18N_UPDATE" || typeof listener !== "function"){
        return origAdd.call(this, type, listener, options);
      }

      // Wrap each listener once (so removeEventListener still works if used with original ref)
      var wrapped = wrappedMap.get(listener);
      if (!wrapped){
        wrapped = function(ev){
          queue.push(function(){ listener.call(this, ev); }.bind(this));
          schedule();
        };
        wrappedMap.set(listener, wrapped);
      }
      return origAdd.call(this, type, wrapped, options);
    };
  })();

  // ---------- 2) Translate the top badge "Fiche Métier" ----------
  function translateBadge(){
    var t = window.__t__ ? window.__t__("metier_sheet") : null;
    if (!t) return;

    // Look for pill-like element containing the label (robust to icons)
    var candidates = Array.prototype.slice.call(document.querySelectorAll("span,div"));
    var el = null;
    for (var i=0;i<candidates.length;i++){
      var n = candidates[i];
      var txt = norm(n.textContent).toLowerCase();

      // matches current FR/EN/DE/ES/IT values, or older "Fiche Métier"
      if (
        txt === "fiche métier" || txt === "fiche metier" ||
        txt === "job profile" ||
        txt === "berufsprofil" ||
        txt === "ficha de empleo" || txt === "ficha del puesto" ||
        txt === "scheda professione"
      ){
        el = n;
        break;
      }
    }
    if (!el) return;

    var curLang = lang();
    if (el.dataset.ulI18nApplied === curLang) return;

    // Replace textContent ONLY for the pure-text node.
    // If the element contains an icon, try to find the deepest text node container.
    // Heuristic: if element has child elements, find the last text-containing span/div inside.
    var target = el;
    if (el.children && el.children.length){
      var inner = el.querySelector("span,div");
      if (inner) target = inner;
    }

    // If still multi-word with icon siblings, just set on the element
    target.textContent = t;
    el.dataset.ulI18nApplied = curLang;
  }

  function scheduleBadge(){
    setTimeout(translateBadge, 0);
    setTimeout(translateBadge, 250);
    setTimeout(translateBadge, 900);
  }

  if (document.readyState === "complete" || document.readyState === "interactive"){
    scheduleBadge();
  }
  document.addEventListener("DOMContentLoaded", scheduleBadge);
  window.addEventListener("ULYDIA:I18N_UPDATE", scheduleBadge);

})();