(function () {
  if (window.__ULYDIA_HIDE_RIGHT_PATCH2__) return;
  window.__ULYDIA_HIDE_RIGHT_PATCH2__ = true;

  function isEmpty(el) {
    if (!el) return true;
    const text = el.textContent.replace(/\s+/g, "");
    const hasImg = el.querySelector("img");
    const hasLink = el.querySelector("a");
    return !text && !hasImg && !hasLink;
  }

  function run() {
    const root = document.getElementById("ulydia-metier-root");
    if (!root) return;

    // 🔎 adapte si besoin mais chez toi c’est bien une grid 2 colonnes
    const grid = root.querySelector(".ulydia-grid, .grid, [data-layout='2cols']");
    if (!grid) return;

    const rightCol =
      grid.querySelector(".right-col, .col-right, [data-col='right']");

    if (!rightCol) return;

    // 🔥 si vide → on supprime totalement
    if (isEmpty(rightCol)) {
      rightCol.remove();

      // 🧠 on force la grille en 1 colonne
      grid.style.gridTemplateColumns = "1fr";
      grid.classList.add("ulydia-single-column");

      console.log("[ULYDIA] Right column removed (empty)");
    }
  }

  // ⏱ attendre que TOUS les scripts aient injecté le contenu
  window.addEventListener("load", () => {
    setTimeout(run, 50);
    setTimeout(run, 300);
    setTimeout(run, 800);
  });
})();
