(function(){
  // =========================================================
  // ULYDIA — BASE TITLES I18N PATCH1 (safe)
  // Fixes:
  // - Translates BASE section titles using __t__()
  // - Preserves icons (SVG) inside <h2 class="section-title">
  //
  // Targets IDs used by BASE.FIX13:
  // - description-title      (Vue d’ensemble)
  // - missions-title
  // - competences-title
  // - environnements-title
  // - evolutions-title
  // - faq-title
  // - metier-title (optional small label)
  //
  // Trigger:
  // - Runs once on load
  // - Re-runs on ULYDIA:I18N_UPDATE event (QA)
  // =========================================================

  if (window.__ULYDIA_BASE_TITLES_I18N_PATCH1__) return;
  window.__ULYDIA_BASE_TITLES_I18N_PATCH1__ = true;

  function t(key, fallback){
    try { if (typeof window.__t__ === "function") return window.__t__(key) || fallback; }
    catch(e){}
    return fallback;
  }

  function setTitleKeepIcons(el, text){
    if (!el) return;

    // Remove existing text nodes (but keep elements like SVG)
    var nodes = Array.prototype.slice.call(el.childNodes);
    for (var i=0;i<nodes.length;i++){
      var n = nodes[i];
      if (n.nodeType === 3) { // TEXT_NODE
        el.removeChild(n);
      }
    }

    // Also remove spans that are plain text wrappers (rare), but keep SVG
    // We keep any element that is not a span-only text wrapper.
    // If your design uses <span class="title-text">, we can reuse it.
    var titleSpan = el.querySelector(".title-text");
    if (titleSpan){
      titleSpan.textContent = text;
      return;
    }

    // Append a single text node after icons
    el.appendChild(document.createTextNode(" " + text));
  }

  function apply(){
    var map = [
      ["description-title", "overview", "Vue d’ensemble"],
      ["missions-title", "missions", "Missions principales"],
      ["competences-title", "key_skills", "Compétences clés"],
      ["environnements-title", "environments", "Environnements de travail"],
      ["evolutions-title", "career_evolution", "Évolution & qualifications"],
      ["faq-title", "faq", "Questions fréquentes"]
    ];

    for (var i=0;i<map.length;i++){
      var id = map[i][0], key = map[i][1], fb = map[i][2];
      var el = document.getElementById(id);
      if (el) setTitleKeepIcons(el, t(key, fb));
    }

    // Optional small label (if exists in your template)
    var metierLabel = document.getElementById("metier-title");
    if (metierLabel && /Fiche/i.test(metierLabel.textContent || "")){
      setTitleKeepIcons(metierLabel, t("metier_sheet", "Fiche métier"));
    }
  }

  function wait(){
    // wait until BASE has rendered the cards
    if (document.getElementById("missions-title") || document.getElementById("description-title")){
      apply(); return true;
    }
    return false;
  }

  (function loop(){
    if (wait()) return;
    setTimeout(loop, 80);
  })();

  window.addEventListener("ULYDIA:I18N_UPDATE", apply);
})();