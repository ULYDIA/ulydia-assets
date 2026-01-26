(function(){
  // =========================================================
  // ULYDIA — MPB Guard (anti "stale bloc" rendering)
  // - If no Metier_Pays_Blocs match for current (metierSlug + ISO),
  //   remove all injected MPB blocks and hide MPB-driven containers.
  // - If match exists, show containers (render patches will fill them).
  // Safe: does NOT touch non-MPB blocks.
  // =========================================================
  var W = window;

  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function qs(sel, root){ return (root||document).querySelector(sel); }

  function removeInjected(){
    qsa('[data-ul-mpb-injected="1"]').forEach(function(el){ try{ el.remove(); }catch(e){} });
  }

  // Optionally hide "shell" wrappers if present
  // (works even if wrappers exist but empty)
  var HIDE_SELECTORS = [
    // Left injected area near blocks
    '[data-ul-mpb-zone="left"]',
    '[data-ul-mpb-zone="after-competences"]',
    // Generic cards that might be MPB-driven by other patches
    '.js-ul-mpb-block',
    '.js-ul-mpb-card'
  ];

  function setHidden(hidden){
    HIDE_SELECTORS.forEach(function(sel){
      qsa(sel).forEach(function(el){
        el.style.display = hidden ? "none" : "";
      });
    });
  }

  function apply(){
    var matched = !!(W.__ULYDIA_MPB_MATCHED__ || (W.__ULYDIA_MPB_VISIBILITY__ && W.__ULYDIA_MPB_VISIBILITY__.matched));
    if (!matched){
      removeInjected();
      setHidden(true);
    } else {
      setHidden(false);
    }
  }

  // run now
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  // run on mpb change
  window.addEventListener("ulydia:mpb:change", function(){
    apply();
  });

  // extra: if other code changes URL without emitting event
  window.addEventListener("popstate", function(){ setTimeout(apply, 0); });

})();