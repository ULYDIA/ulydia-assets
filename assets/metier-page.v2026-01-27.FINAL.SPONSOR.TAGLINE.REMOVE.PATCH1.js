(function(){
  "use strict";
  // =========================================================
  // ULYDIA — Remove sponsor tagline text under Banner 2 (sidebar)
  // PATCH1 — 2026-01-27
  //
  // Goal:
  // - Remove the hardcoded lines like:
  //   "Formation intensive • 100% gratuite"
  //   "Cursus peer-learning reconnu par l'État"
  // that appear under the square sponsor banner (Banner 2).
  //
  // This is currently static HTML in the template (propal1-fiche metier.html).
  // We keep ONLY the sponsor name (id="sponsor-name-sidebar").
  //
  // Optional (disabled): also remove the tagline under the TOP wide banner.
  // =========================================================

  if (window.__ULYDIA_SPONSOR_TAGLINE_REMOVE_PATCH1__) return;
  window.__ULYDIA_SPONSOR_TAGLINE_REMOVE_PATCH1__ = true;

  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function cleanSidebar(){
    var name = document.getElementById("sponsor-name-sidebar");
    if (!name) return false;

    var box = name.parentElement;
    if (!box) return false;

    // remove every <p> except the sponsor name line
    qa("p", box).forEach(function(p){
      if (p === name) return;
      p.remove();
    });

    return true;
  }

  function cleanTopBanner(){ // OPTIONAL
    var name = document.getElementById("sponsor-name-banner");
    if (!name) return false;
    // remove the next tagline paragraph if present
    var box = name.parentElement;
    if (!box) return false;
    qa("p", box).forEach(function(p){
      // keep "Formation sponsorisée par" and the sponsor name
      if (p.id === "sponsor-name-banner") return;
      // remove only the tagline line(s) (usually smaller / opacity)
      var cls = (p.className || "").toString();
      var txt = (p.textContent || "").toString();
      if (/Formation intensive|Cursus peer-learning/i.test(txt) || /opacity-80|text-sm mt-2/i.test(cls)){
        p.remove();
      }
    });
    return true;
  }

  function run(){
    var ok1 = cleanSidebar();
    // If you ALSO want to remove the top banner tagline, uncomment:
    // var ok2 = cleanTopBanner();
    // return ok1 || ok2;
    return ok1;
  }

  function schedule(){
    setTimeout(run, 0);
    setTimeout(run, 250);
    setTimeout(run, 800);
    setTimeout(run, 1600);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") schedule();
  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("ULYDIA:RENDER", schedule);
  window.addEventListener("ULYDIA:I18N_UPDATE", schedule);

})();