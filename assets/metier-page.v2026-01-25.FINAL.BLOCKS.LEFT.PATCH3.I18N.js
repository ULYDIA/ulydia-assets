(() => {
  // =========================================================
  // ULYDIA — BLOCKS.LEFT.PATCH3.I18N
  // Same logic as PATCH3 (content injection),
  // PLUS i18n for LEFT block TITLES (not content).
  //
  // Titles handled via __t__():
  // - Vue d’ensemble
  // - Missions principales
  // - Compétences clés
  // - Environnements de travail
  // - Évolution & qualifications (if present)
  //
  // DATA is NOT translated here (only UI labels).
  // =========================================================

  if (window.__ULYDIA_BLOCKS_LEFT_PATCH3_I18N__) return;
  window.__ULYDIA_BLOCKS_LEFT_PATCH3_I18N__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.left.patch3.i18n]", ...a);

  function t(key, fallback){
    try {
      if (typeof window.__t__ === "function") return window.__t__(key) || fallback;
    } catch(e){}
    return fallback;
  }

  function renameTitle(id, key, fallback){
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = t(key, fallback);
  }

  function applyTitles(){
    renameTitle("overview-title", "overview", "Vue d’ensemble");
    renameTitle("missions-title", "missions", "Missions principales");
    renameTitle("skills-title", "key_skills", "Compétences clés");
    renameTitle("environnements-title", "work_env", "Environnements de travail");
    renameTitle("evolution-title", "career_evolution", "Évolution & qualifications");
  }

  function onReady(){
    applyTitles();

    // Re-apply if language changes dynamically (debug / QA)
    window.addEventListener("ULYDIA:I18N_UPDATE", applyTitles);
  }

  onReady();
})();