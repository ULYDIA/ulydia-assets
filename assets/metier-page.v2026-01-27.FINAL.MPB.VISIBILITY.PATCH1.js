// ULYDIA — MPB Visibility Map — PATCH1 (SAFE)
// - Depends on: window.__ULYDIA_BLOC__ (from BLOCFLATTEN.PATCH1)
// - Produces: window.__ULYDIA_MPB_VISIBILITY__
//
// ✅ No MutationObserver
// ✅ No infinite polling (max ~2s)
// ✅ Does not block page rendering
(function () {
  function strip(s) {
    return String(s || "")
      .replace(/&nbsp;/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function hasContent(v) {
    return strip(v).length > 0;
  }

  function buildVisibility(b) {
    // NOTE: fields names follow your "js-bf-*" list (MPB)
    return {
      // Left column long blocks (already rendered elsewhere)
      formation: hasContent(b.formation_bloc),
      acces: hasContent(b.acces_bloc),
      salaire: hasContent(b.salaire_bloc),
      marche: hasContent(b.marche_bloc),

      // “Studies / access / paths”
      education_level: hasContent(b.education_level),
      education_level_local: hasContent(b.education_level_local),
      degrees_examples: hasContent(b.degrees_examples),
      schools_or_paths: hasContent(b.schools_or_paths),
      entry_routes: hasContent(b.entry_routes),
      equivalences_reconversion: hasContent(b.equivalences_reconversion),

      // “Jobs / employers”
      first_job_titles: hasContent(b.first_job_titles),
      typical_employers: hasContent(b.typical_employers),
      hiring_sectors: hasContent(b.hiring_sectors),

      // “Skills / tools”
      tools_stack: hasContent(b.tools_stack),
      skills_must_have: hasContent(b.skills_must_have),
      soft_skills: hasContent(b.soft_skills),
      certifications: hasContent(b.certifications),
      top_fields: hasContent(b.top_fields),

      // “Portfolio”
      portfolio_projects: hasContent(b.portfolio_projects),

      // “Market indicators”
      time_to_employability: hasContent(b.time_to_employability),
      growth_outlook: hasContent(b.growth_outlook),
      market_demand: hasContent(b.market_demand),

      // “Salary notes”
      salary_notes: hasContent(b.salary_notes)
    };
  }

  function run() {
    var b = window.__ULYDIA_BLOC__;
    if (!b) return false;

    // Central truth
    window.__ULYDIA_MPB_VISIBILITY__ = buildVisibility(b);

    // Optional helper: tells if MPB exists at all for this (metier + iso)
    window.__ULYDIA_HAS_MPB__ = Object.keys(window.__ULYDIA_MPB_VISIBILITY__ || {})
      .some(function (k) { return !!window.__ULYDIA_MPB_VISIBILITY__[k]; });

    return true;
  }

  // ✅ bounded retry (no infinite loop)
  var tries = 0;
  (function tick() {
    tries++;
    if (run()) return;
    if (tries >= 40) return; // ~2s max
    setTimeout(tick, 50);
  })();
})();
