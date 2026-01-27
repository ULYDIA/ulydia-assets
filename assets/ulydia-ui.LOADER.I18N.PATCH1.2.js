(function(){
  // =========================================================
  // ULYDIA — UI LOADER I18N PATCH1.2 (multi-loader, no flash)
  // Fixes:
  // - Multiple loaders can appear sequentially; translate ALL of them when they mount.
  // - No EN->FR flash: apply only when __ULYDIA_LANG__ is resolved (fr/en/de/es/it).
  // - Preserve design: only changes textContent, never touches classes/styles/DOM structure.
  // - Uses MutationObserver to catch loaders added later.
  // =========================================================

  if (window.__ULYDIA_UI_LOADER_I18N_PATCH12__) return;
  window.__ULYDIA_UI_LOADER_I18N_PATCH12__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function resolvedLang(){
    var l = (window.__ULYDIA_LANG__ || "").toLowerCase().trim();
    if (!l) return "";
    if (!/^(fr|en|de|es|it)$/.test(l)) return "";
    return l;
  }

  var STR = {
    fr: { title: "Chargement de la fiche métier…",            sub: "Veuillez patienter un instant." },
    en: { title: "Loading job profile…",                      sub: "Please wait a moment." },
    de: { title: "Berufsprofil wird geladen…",                sub: "Bitte einen Moment warten." },
    es: { title: "Cargando ficha de empleo…",                 sub: "Espera un momento, por favor." },
    it: { title: "Caricamento scheda professione…",           sub: "Attendi un momento." }
  };

  // Patterns to recognize existing loader copy
  var TITLE_RX = /^(Chargement de la fiche métier|Loading job profile|Berufsprofil wird geladen|Cargando ficha|Caricamento scheda)/i;
  var SUB_RX   = /^(Veuillez patienter|Please wait a moment|Bitte einen Moment|Espera un momento|Attendi un momento)/i;

  function applyToRoot(root){
    var l = resolvedLang();
    if (!l) return false; // no default -> no flash
    var t = STR[l] || STR.en;

    var changed = false;

    // 1) Preferred semantic hooks
    var titleEls = Array.prototype.slice.call(root.querySelectorAll(".u-loader-title, .ul-loader-title, [data-ul-loader-title]"));
    var subEls   = Array.prototype.slice.call(root.querySelectorAll(".u-loader-subtitle, .ul-loader-subtitle, [data-ul-loader-subtitle]"));

    for (var i=0;i<titleEls.length;i++){
      if (titleEls[i] && titleEls[i].textContent !== t.title){
        titleEls[i].textContent = t.title;
        changed = true;
      }
    }
    for (var j=0;j<subEls.length;j++){
      if (subEls[j] && subEls[j].textContent !== t.sub){
        subEls[j].textContent = t.sub;
        changed = true;
      }
    }

    // 2) Fallback: find by text patterns within likely loader containers
    var containers = Array.prototype.slice.call(root.querySelectorAll(
      "[data-ul-loader], .u-loader, .ul-loader, .u-overlay, .ul-overlay, .w-lightbox-backdrop, .modal, [class*='loader' i]"
    ));
    if (!containers.length) containers = [root];

    for (var c=0;c<containers.length;c++){
      var scope = containers[c];

      // title candidate
      var nodes = Array.prototype.slice.call(scope.querySelectorAll("h1,h2,h3,div,span,p"));
      for (var k=0;k<nodes.length;k++){
        var el = nodes[k];
        if (!el) continue;
        var tx = norm(el.textContent);
        if (!tx) continue;
        if (TITLE_RX.test(tx)) {
          if (el.textContent !== t.title) { el.textContent = t.title; changed = true; }
          break;
        }
      }

      // subtitle candidate
      var nodes2 = Array.prototype.slice.call(scope.querySelectorAll("div,span,p"));
      for (var m=0;m<nodes2.length;m++){
        var el2 = nodes2[m];
        if (!el2) continue;
        var tx2 = norm(el2.textContent);
        if (!tx2) continue;
        if (SUB_RX.test(tx2)) {
          if (el2.textContent !== t.sub) { el2.textContent = t.sub; changed = true; }
          break;
        }
      }
    }

    return changed;
  }

  function applyAll(){
    // Apply to whole document (safe: text only + pattern match)
    return applyToRoot(document);
  }

  function boot(){
    // Try a few times in case lang resolves slightly after DOM ready
    var tries = 0;
    (function loop(){
      tries++;
      applyAll();
      if (resolvedLang() && tries > 6) return;
      if (tries > 30) return;
      setTimeout(loop, 120);
    })();
  }

  // Observe new nodes (multiple loaders sequentially)
  function observe(){
    try {
      var mo = new MutationObserver(function(muts){
        // Only apply when lang is resolved to avoid flash
        if (!resolvedLang()) return;
        for (var i=0;i<muts.length;i++){
          var m = muts[i];
          if (!m.addedNodes || !m.addedNodes.length) continue;
          // If any added node contains loader-ish markers, apply to that subtree
          for (var j=0;j<m.addedNodes.length;j++){
            var n = m.addedNodes[j];
            if (!n || n.nodeType !== 1) continue;
            var cls = (n.className || "").toString().toLowerCase();
            var id  = (n.id || "").toLowerCase();
            var looks = cls.indexOf("loader") !== -1 || cls.indexOf("overlay") !== -1 || id.indexOf("loader") !== -1 || id.indexOf("overlay") !== -1;
            if (looks) applyToRoot(n);
            else {
              // cheap text check
              var txt = "";
              try { txt = norm(n.textContent); } catch(e){}
              if (txt && (TITLE_RX.test(txt) || SUB_RX.test(txt))) applyToRoot(n);
            }
          }
        }
      });
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
      window.__ULYDIA_UI_LOADER_I18N_MO__ = mo;
    } catch(e){}
  }

  document.addEventListener("DOMContentLoaded", function(){ boot(); observe(); });
  window.addEventListener("load", function(){ boot(); });
  window.addEventListener("ULYDIA:I18N_UPDATE", function(){ boot(); });

})();