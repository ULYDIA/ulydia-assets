window.__METIER_PAGE_BUILD__ = "metier-page FULL v2026-01-23.16h10 (fallback strict b1->wide b2->square)";
console.log("✅", window.__METIER_PAGE_BUILD__);
/*
 metier-page.full.country.v3.patched.v7.js
 ------------------------------------------------
 CORRECTION DEFINITIVE (confirmée par specs) :

 catalog.json
  - banner_1 : 680x120  => BANNIERE HORIZONTALE (wide)
  - banner_2 : 300x300  => BANNIERE CARREE (square)

 ✅ Cette logique est appliquée UNIQUEMENT pour les bannières NON sponsorisées
 ✅ Les bannières sponsorisées restent inchangées
 ✅ Aucun test de ratio (source d’erreurs) — mapping strict par champ
*/

// =======================================================
// Fallback banners mapping (STRICT, NO GUESSING)
// =======================================================
function mapFallbackBannersFromCatalog(countryMeta, DEBUG=false) {
  if (!countryMeta || !countryMeta.banners) {
    if (DEBUG) console.warn("[fallback] no countryMeta.banners");
    return { wide: null, square: null };
  }

  const b = countryMeta.banners;

  // 🔒 RÈGLE OFFICIELLE
  const wide   = b.banner_1 || b.wide || null;   // 680x120
  const square = b.banner_2 || b.square || null; // 300x300

  if (DEBUG) {
    console.log("[fallback banners] STRICT mapping applied", {
      banner_1_as_wide: wide,
      banner_2_as_square: square
    });
  }

  return { wide, square };
}

/*
 UTILISATION DANS LE FICHIER COMPLET :

 const fallback = mapFallbackBannersFromCatalog(countryMeta, DEBUG);

 renderBanners({
   sponsor,        // inchangé
   fallback        // { wide, square }
 });

*/

// =======================================================
// Langue manquante → overlay (design loader)
// =======================================================
function showCountryUnavailableOverlay(message) {
  let overlay = document.getElementById("ulydia_overlay_unavailable");
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "ulydia_overlay_unavailable";
  overlay.className = "u-overlay";
  overlay.innerHTML = `
    <div class="u-overlayCard">
      <div>
        <div class="u-overlayTitle">${message}</div>
        <div class="u-overlaySub">Please select another country.</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Condition d'appel recommandée :
// if (!hasContentForLang) {
//   showCountryUnavailableOverlay(
//     "Sorry, this job is not available in your country at the moment."
//   );
// }
