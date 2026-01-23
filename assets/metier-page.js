
/*
 metier-page.full.country.v3.patched.v5.js
 ------------------------------------------------
 PATCH v5:
 ✅ Inversion systématique des images fallback NON sponsorisées :
    - image horizontale ⇐ banner_2
    - image carrée       ⇐ banner_1
 ✅ Aucun impact sur les bannières sponsorisées
 ✅ Log explicite en mode DEBUG
*/

// === EXTRACT DU PATCH (appliqué dans le fichier complet) ===

// Quand il n'y a PAS de sponsor :
function applyFallbackBanners(fallback, DEBUG=false) {
  if (!fallback) return { wide: null, square: null };

  // ⛔ catalog.json est inversé → on corrige ici
  const wide   = fallback.banner_2 || fallback.wide || null;   // horizontale
  const square = fallback.banner_1 || fallback.square || null; // carrée

  if (DEBUG) {
    console.log("[fallback banners] swapped", {
      wide,
      square
    });
  }

  return { wide, square };
}

// UTILISATION (exemple)
// const fallback = countryMeta?.banners;
// const fb = applyFallbackBanners(fallback, DEBUG);
// renderBanners({ sponsor, fallback: fb });

// === FIN PATCH ===
