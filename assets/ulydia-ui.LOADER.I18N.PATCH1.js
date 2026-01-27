(function(){
  // =========================================================
  // ULYDIA — UI LOADER I18N PATCH1
  // Goal:
  // - Translate the loader title "Chargement de la fiche métier..." based on final language
  // - Keep it SAFE: only adjusts text content of matching loader nodes
  //
  // Works with:
  // - window.__ULYDIA_LANG__ (fr/en/de/es/it)
  // - reacts to ULYDIA:I18N_UPDATE event
  // =========================================================

  if (window.__ULYDIA_UI_LOADER_I18N_PATCH1__) return;
  window.__ULYDIA_UI_LOADER_I18N_PATCH1__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function lang(){
    var l = (window.__ULYDIA_LANG__ || "en").toLowerCase().trim();
    if (!/^(fr|en|de|es|it)$/.test(l)) l = "en";
    return l;
  }

  var STR = {
    fr: { title: "Chargement de la fiche métier…", sub: "Veuillez patienter un instant." },
    en: { title: "Loading job profile…",          sub: "Please wait a moment." },
    de: { title: "Berufsprofil wird geladen…",    sub: "Bitte einen Moment warten." },
    es: { title: "Cargando ficha de empleo…",     sub: "Espera un momento, por favor." },
    it: { title: "Caricamento scheda professione…", sub: "Attendi un momento." }
  };

  function update(){
    var l = lang();
    var t = STR[l] || STR.en;

    // Try common selectors first
    var titleEl =
      document.querySelector(".u-loader-title, .ul-loader-title, [data-ul-loader-title]") ||
      null;
    var subEl =
      document.querySelector(".u-loader-subtitle, .ul-loader-subtitle, [data-ul-loader-subtitle]") ||
      null;

    // Fallback: find by text content patterns
    if (!titleEl){
      var nodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,div,span,p"));
      for (var i=0;i<nodes.length;i++){
        var tx = norm(nodes[i].textContent);
        if (!tx) continue;
        if (/^Chargement de la fiche métier/i.test(tx) || /^Loading job profile/i.test(tx) || /^Berufsprofil wird geladen/i.test(tx) || /^Cargando ficha/i.test(tx) || /^Caricamento scheda/i.test(tx)){
          titleEl = nodes[i];
          break;
        }
      }
    }
    if (!subEl){
      var nodes2 = Array.prototype.slice.call(document.querySelectorAll("div,span,p"));
      for (var j=0;j<nodes2.length;j++){
        var tx2 = norm(nodes2[j].textContent);
        if (!tx2) continue;
        if (/^Please wait a moment/i.test(tx2) || /^Veuillez patienter/i.test(tx2) || /^Bitte einen Moment/i.test(tx2) || /^Espera un momento/i.test(tx2) || /^Attendi un momento/i.test(tx2)){
          subEl = nodes2[j];
          break;
        }
      }
    }

    if (titleEl) titleEl.textContent = t.title;
    if (subEl) subEl.textContent = t.sub;
  }

  // initial + reactive
  function boot(){
    update();
    setTimeout(update, 200);
    setTimeout(update, 800);
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
  window.addEventListener("ULYDIA:I18N_UPDATE", boot);

})();