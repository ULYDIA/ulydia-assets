(function(){
  // =========================================================
  // ULYDIA — UI LOADER I18N PATCH1.1 (no-flash, preserve design)
  // Fixes:
  // - Avoid EN->FR flash: do NOTHING until __ULYDIA_LANG__ is resolved (fr/en/de/es/it)
  // - Preserve loader design: only updates textContent of the exact title/sub nodes
  // - Reacts to ULYDIA:I18N_UPDATE (preferred) + a short retry window
  // =========================================================

  if (window.__ULYDIA_UI_LOADER_I18N_PATCH11__) return;
  window.__ULYDIA_UI_LOADER_I18N_PATCH11__ = true;

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

  function findTitleSub(){
    // Restrict to loader area if possible
    var root =
      document.querySelector("[data-ul-loader], .u-loader, .ul-loader, .u-overlay, .ul-overlay") ||
      document;

    var titleEl =
      root.querySelector(".u-loader-title, .ul-loader-title, [data-ul-loader-title]") ||
      null;
    var subEl =
      root.querySelector(".u-loader-subtitle, .ul-loader-subtitle, [data-ul-loader-subtitle]") ||
      null;

    // Fallback: locate by known text patterns, but ONLY inside root
    if (!titleEl){
      var nodes = Array.prototype.slice.call(root.querySelectorAll("h1,h2,h3,div,span,p"));
      for (var i=0;i<nodes.length;i++){
        var tx = norm(nodes[i].textContent);
        if (!tx) continue;
        if (/^Chargement de la fiche métier/i.test(tx) ||
            /^Loading job profile/i.test(tx) ||
            /^Berufsprofil wird geladen/i.test(tx) ||
            /^Cargando ficha/i.test(tx) ||
            /^Caricamento scheda/i.test(tx)){
          titleEl = nodes[i];
          break;
        }
      }
    }
    if (!subEl){
      var nodes2 = Array.prototype.slice.call(root.querySelectorAll("div,span,p"));
      for (var j=0;j<nodes2.length;j++){
        var tx2 = norm(nodes2[j].textContent);
        if (!tx2) continue;
        if (/^Please wait a moment/i.test(tx2) ||
            /^Veuillez patienter/i.test(tx2) ||
            /^Bitte einen Moment/i.test(tx2) ||
            /^Espera un momento/i.test(tx2) ||
            /^Attendi un momento/i.test(tx2)){
          subEl = nodes2[j];
          break;
        }
      }
    }
    return { root: root, titleEl: titleEl, subEl: subEl };
  }

  function applyOnce(){
    var l = resolvedLang();
    if (!l) return false; // key fix: no default EN
    var t = STR[l] || STR.en;

    var found = findTitleSub();
    var titleEl = found.titleEl;
    var subEl = found.subEl;

    if (titleEl) titleEl.textContent = t.title;
    if (subEl) subEl.textContent = t.sub;

    return !!(titleEl || subEl);
  }

  function boot(){
    // Try immediately after update; then retry briefly (UI may mount late)
    applyOnce();
    var tries = 0;
    (function loop(){
      tries++;
      if (applyOnce() || tries > 30) return;
      setTimeout(loop, 120);
    })();
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
  window.addEventListener("ULYDIA:I18N_UPDATE", boot);

})();