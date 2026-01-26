// ULYDIA — Hide Empty Blocks (MPB + Soft Skills) — PATCH1 (SAFE)
// - Depends on: window.__ULYDIA_MPB_VISIBILITY__ (from MPB.VISIBILITY.PATCH1)
// - Goal: do NOT show blocks when MPB data is missing for the current (metier + iso)
// ✅ No MutationObserver
// ✅ Bounded retry (max ~2.5s)
// ✅ Robust selection by titles (works even if class names change)
(function () {
  function norm(s) {
    return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function findCardRootFrom(el) {
    // Go up until a "card-like" container
    var cur = el;
    for (var i = 0; i < 8 && cur; i++) {
      var cls = (cur.className || "");
      if (typeof cls === "string") {
        if (cls.indexOf("card") >= 0 || cls.indexOf("u-card") >= 0 || cls.indexOf("bloc") >= 0) return cur;
      }
      // Heuristic: many cards are direct children of grid columns; stop at section/container
      if (cur.getAttribute && (cur.getAttribute("id") === "ulydia-metier-root")) break;
      cur = cur.parentElement;
    }
    return el.closest ? (el.closest(".card, .u-card, .u-cardBase, .u-panel, .u-box") || el.parentElement) : el.parentElement;
  }

  function hideCardByTitle(possibleTitles) {
    var titles = (possibleTitles || []).map(norm);
    var candidates = document.querySelectorAll("h1,h2,h3,h4,div,span,p,strong");
    for (var i = 0; i < candidates.length; i++) {
      var t = norm(candidates[i].textContent);
      if (!t) continue;
      for (var j = 0; j < titles.length; j++) {
        if (t === titles[j]) {
          var root = findCardRootFrom(candidates[i]);
          if (root) root.style.display = "none";
        }
      }
    }
  }

  function showCardByTitle(possibleTitles) {
    var titles = (possibleTitles || []).map(norm);
    var candidates = document.querySelectorAll("h1,h2,h3,h4,div,span,p,strong");
    for (var i = 0; i < candidates.length; i++) {
      var t = norm(candidates[i].textContent);
      if (!t) continue;
      for (var j = 0; j < titles.length; j++) {
        if (t === titles[j]) {
          var root = findCardRootFrom(candidates[i]);
          if (root) root.style.display = "";
        }
      }
    }
  }

  function apply() {
    var V = window.__ULYDIA_MPB_VISIBILITY__;
    if (!V) return false;

    // ---- RIGHT COLUMN: Soft skills essentials (hide if empty)
    // Title seen in your UI: "Soft Skills essentiels"
    if (!V.soft_skills) {
      hideCardByTitle(["🧠 Soft Skills essentiels", "Soft Skills essentiels", "Soft skills essentiels"]);
    }

    // ---- LEFT COLUMN: new MPB cards we added
    // “Niveau d’études & diplômes” should exist only if at least one of these fields has content
    var hasStudies =
      !!V.education_level || !!V.education_level_local || !!V.degrees_examples ||
      !!V.schools_or_paths || !!V.entry_routes || !!V.equivalences_reconversion;

    if (!hasStudies) {
      hideCardByTitle(["📚 Niveau d’études & diplômes", "Niveau d’études & diplômes", "Niveau d'etudes & diplomes"]);
    }

    // “Débouchés & premiers postes” should exist only if at least one of these fields has content
    var hasJobs =
      !!V.first_job_titles || !!V.typical_employers || !!V.hiring_sectors;

    if (!hasJobs) {
      hideCardByTitle(["💼 Débouchés & premiers postes", "Débouchés & premiers postes", "Debouches & premiers postes"]);
    }

    return true;
  }

  // bounded retry (DOM may still be rendering)
  var tries = 0;
  (function tick() {
    tries++;
    var ok = apply();
    if (ok) return;
    if (tries >= 50) return; // ~2.5s max
    setTimeout(tick, 50);
  })();
})();
