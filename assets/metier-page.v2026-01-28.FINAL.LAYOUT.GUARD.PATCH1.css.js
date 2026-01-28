(function(){
  if (window.__ULYDIA_LAYOUT_GUARD_PATCH1__) return;
  window.__ULYDIA_LAYOUT_GUARD_PATCH1__ = true;

  var st = document.createElement("style");
  st.id = "ulydia-layout-guard";

  /* ⚠️ Cible volontairement large : on force une grille 2 colonnes “par défaut”.
     Même si ulydia-ui arrive après, tu ne retombes pas en 1 colonne. */
  st.textContent = `
    #ulydia-metier-root .ul-grid,
    #ulydia-metier-root .metier-grid,
    #ulydia-metier-root [data-ulydia-layout="2col"]{
      display:grid !important;
      grid-template-columns: 1.35fr 0.85fr !important;
      gap: 24px !important;
      align-items:start !important;
    }
    @media (max-width: 991px){
      #ulydia-metier-root .ul-grid,
      #ulydia-metier-root .metier-grid,
      #ulydia-metier-root [data-ulydia-layout="2col"]{
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(st);
})();
