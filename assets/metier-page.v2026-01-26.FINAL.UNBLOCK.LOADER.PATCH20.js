/*!
 * ULYDIA — METIER PAGE — UNBLOCK LOADER (SAFE) — PATCH20
 * - Ne dépend d'aucun autre patch
 * - Objectif: éviter le loader infini (ex: scripts en erreur, wrappers CMS lents)
 * - Règle: si on détecte le moindre rendu "utile" OU après timeout, on masque le loader/overlay.
 *
 * À garder en DERNIER.
 */
(function(){
  if (window.__ULYDIA_UNBLOCK_LOADER_PATCH20__) return;
  window.__ULYDIA_UNBLOCK_LOADER_PATCH20__ = true;

  function $(sel, root){ try { return (root||document).querySelector(sel); } catch(e){ return null; } }

  // ✅ Essaie de cacher les loaders possibles (UI v2 + anciens)
  function hideLoaders(){
    try { document.documentElement.classList.remove("ul-metier-loading"); } catch(e){}
    try { document.body && document.body.classList && document.body.classList.remove("ul-metier-loading"); } catch(e){}

    // ids possibles
    var ids = ["ulydia-loader","ulydia-loading","u-loader","loader","ulydia-metier-loader"];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if (el && el.style) el.style.display = "none";
    });

    // overlays possibles
    ["#ulydia-loader", ".u-overlay", ".ul-overlay", ".ulydia-overlay", ".loader-overlay", ".ulydia-loader"].forEach(function(sel){
      var el = $(sel);
      if (el && el.style){
        el.style.display = "none";
        el.style.pointerEvents = "none";
        el.style.opacity = "0";
      }
    });

    // Si UI expose une API
    try { if (window.ULYDIA && typeof window.ULYDIA.hideLoader === "function") window.ULYDIA.hideLoader(); } catch(e){}
    try { if (window.__ULYDIA_UI__ && typeof window.__ULYDIA_UI__.hideLoader === "function") window.__ULYDIA_UI__.hideLoader(); } catch(e){}
  }

  // ✅ heuristique: page "chargée" si on a un titre métier OU le root contient du contenu
  function hasUsefulRender(){
    var root = document.getElementById("ulydia-metier-root") || $("#ulydia-metier-root") || $("#ulydia-metier-root".replace(/_/g,"-"));
    if (root && root.innerText && root.innerText.trim().length > 30) return true;

    // éléments fréquents du design
    var title = $(".js-metier-title") || $("h1");
    if (title && title.textContent && title.textContent.trim().length > 2) return true;

    // une carte du layout
    if ($(".u-card, .card, .ul-card")) return true;

    return false;
  }

  // ✅ libère le clic droit si un script bloque contextmenu
  try {
    window.addEventListener("contextmenu", function(e){
      // on ne stoppe pas, on laisse faire
    }, { capture:true });
    // Supprime un handler global probable (best effort)
    document.oncontextmenu = null;
  } catch(e){}

  var start = Date.now();
  var maxWaitMs = 12000;  // 12s
  var earlyWaitMs = 2500; // si rendu utile détecté

  (function loop(){
    var elapsed = Date.now() - start;

    if (hasUsefulRender() && elapsed >= earlyWaitMs){
      hideLoaders();
      return;
    }

    if (elapsed >= maxWaitMs){
      hideLoaders();
      console.warn("[PATCH20] Loader unblocked by timeout");
      return;
    }

    setTimeout(loop, 200);
  })();
})();