(function(){
  "use strict";

  if (window.__ULYDIA_METIER_BADGE_I18N_PATCH1__) return;
  window.__ULYDIA_METIER_BADGE_I18N_PATCH1__ = true;

  const LABELS = {
    fr: "Fiche métier",
    en: "Job profile",
    de: "Berufsbeschreibung",
    es: "Ficha del puesto",
    it: "Scheda professione"
  };

  function getLang(){
    return (
      window.__ULYDIA_LANG__ ||
      document.documentElement.lang ||
      "fr"
    ).toLowerCase();
  }

  function translate(){
    const lang = getLang();
    const label = LABELS[lang] || LABELS.fr;

    // badge usually near title, small rounded pill
    const badge = [...document.querySelectorAll("span,div")]
      .find(el => (el.textContent || "").trim().toLowerCase() === "fiche métier");

    if (!badge) return;

    // anti flicker / idempotent
    if (badge.dataset.ulI18nApplied === lang) return;

    badge.textContent = label;
    badge.dataset.ulI18nApplied = lang;
  }

  function schedule(){
    setTimeout(translate, 0);
    setTimeout(translate, 300);
    setTimeout(translate, 800);
  }

  if (document.readyState === "interactive" || document.readyState === "complete") {
    schedule();
  }
  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("ULYDIA:I18N_UPDATE", schedule);

})();
