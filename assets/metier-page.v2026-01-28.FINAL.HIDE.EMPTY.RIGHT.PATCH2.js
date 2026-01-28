(function () {
  if (window.__ULYDIA_HIDE_RIGHT_IF_NO_MPB_PATCH2__) return;
  window.__ULYDIA_HIDE_RIGHT_IF_NO_MPB_PATCH2__ = true;

  function hasMPBData() {
    // ✅ cas 1: variables globales (selon tes versions)
    const candidates = [
      window.__ULYDIA_METIER_PAYS_BLOCS__,
      window.__ULYDIA_MPB__,
      window.__ULYDIA_BLOC__,
      window.__ULYDIA_DATA__?.metier_pays_bloc,
      window.__ULYDIA_DATA__?.metier_pays_blocs,
      window.__ULYDIA_DATA__?.mpb
    ];

    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) return true;
      if (c && typeof c === "object") {
        // objet non vide
        if (Object.keys(c).length > 0) return true;
      }
    }

    // ✅ cas 2: fallback DOM (si aucune variable globale fiable)
    // adapte/élargit si besoin selon tes classes
    const mpbRoot =
      document.querySelector('[data-mpb-root], #metier-pays-blocs, .js-mpb-root, .ulydia-mpb, .mpb-list');

    if (!mpbRoot) return false;

    // si on a au moins un bloc “réel”
    const hasCard = mpbRoot.querySelector(
      ".mpb-card, .ulydia-card, [data-mpb-item], .js-bloc-title, .js-bloc-body"
    );

    // ou au moins du texte significatif
    const txt = (mpbRoot.textContent || "").replace(/\s+/g, "").trim();

    return !!hasCard || txt.length > 20;
  }

  function removeRightColumn() {
    const root = document.getElementById("ulydia-metier-root");
    if (!root) return;

    // 🔎 on cible la zone 2 colonnes
    const grid =
      root.querySelector(".ulydia-grid, .grid, [data-layout='2cols'], [data-ulydia-layout='2cols']");
    if (!grid) return;

    // 🔎 on cible la colonne droite
    const rightCol =
      grid.querySelector(".right-col, .col-right, [data-col='right'], [data-ulydia-col='right']");
    if (!rightCol) return;

    rightCol.remove();
    grid.style.gridTemplateColumns = "1fr";
    grid.classList.add("ulydia-single-column");
  }

  function run() {
    const ok = hasMPBData();

    // ✅ si MPB vide => on enlève la colonne droite
    if (!ok) removeRightColumn();
  }

  // On attend que le rendu soit fini (BASE + patches)
  window.addEventListener("load", () => {
    setTimeout(run, 50);
    setTimeout(run, 250);
    setTimeout(run, 800);
  });
})();
