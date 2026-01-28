(function(){
  if (window.__ULYDIA_HIDE_RIGHT_WHEN_NO_MPB_PATCH11__) return;
  window.__ULYDIA_HIDE_RIGHT_WHEN_NO_MPB_PATCH11__ = true;

  function norm(s){
    return String(s||"")
      .replace(/\u00A0/g," ")
      .replace(/&nbsp;/gi," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || window.__ULYDIA_CTX__ || window.__ULYDIA_DATA__ || null;
  }

  function getBlocFields(ctx){
    if (!ctx) return null;
    if (ctx.blocFields) return ctx.blocFields;
    if (ctx.bloc && (ctx.bloc.fieldData || ctx.bloc.fields)) return (ctx.bloc.fieldData || ctx.bloc.fields);
    if (ctx.data && (ctx.data.blocFields || ctx.data.bloc)) return (ctx.data.blocFields || (ctx.data.bloc.fieldData||ctx.data.bloc.fields) || null);
    return null;
  }

  // ✅ MPB vide = pas de données MPB
  function mpbIsEmpty(){
    var ctx = getCtx();
    var bf  = getBlocFields(ctx);

    // 1) si bf existe : vide si 0 clé
    if (bf && typeof bf === "object") {
      return Object.keys(bf).length === 0;
    }

    // 2) si ctx existe mais pas de bf => généralement MPB non trouvé
    if (ctx && !bf) return true;

    // 3) fallback DOM : PATCH9.1 insère des cartes avec data-ulydia-mpb-inserted="1"
    // s'il n'y en a aucune -> MPB vide (ou patch MPB non exécuté)
    var inserted = document.querySelector("[data-ulydia-mpb-inserted='1']");
    if (!inserted) return true;

    return false;
  }

  // Trouve une carte par titre, puis remonte au bon container "card"
  function hideCardByTitle(title){
    title = String(title||"").toLowerCase();

    // on cherche un élément qui contient le titre
    var nodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span,p"));
    for (var i=0;i<nodes.length;i++){
      var t = norm(nodes[i].textContent).toLowerCase();
      if (!t) continue;
      if (t.indexOf(title) === -1) continue;

      // remonte au container "card" le plus pertinent
      var card =
        nodes[i].closest(".card,.u-section-card,.section-card,.u-card,[class*='card']") ||
        nodes[i].closest("section,article") ||
        nodes[i].parentElement;

      if (!card) continue;

      // cache le container entier (pas juste le contenu)
      card.style.setProperty("display","none","important");
    }
  }

  // Option : si tu veux carrément supprimer l’espace de colonne quand MPB vide
  function collapseRightColumn(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root) return;

    var grid = root.querySelector(".ulydia-grid,.grid,[data-layout='2cols'],[data-ulydia-layout='2cols']");
    if (!grid) return;

    var right =
      grid.querySelector(".right-col,.col-right,[data-col='right'],[data-ulydia-col='right']") ||
      // fallback: souvent la 2e colonne est juste le 2e enfant direct
      (grid.children && grid.children.length >= 2 ? grid.children[1] : null);

    if (right) right.style.setProperty("display","none","important");

    // force 1 colonne
    grid.style.setProperty("grid-template-columns","1fr","important");
  }

  function apply(){
    // on ne fait rien si MPB a des datas
    if (!mpbIsEmpty()) return;

    // ✅ cache les 2 cartes de droite quand MPB vide
    hideCardByTitle("Soft Skills essentiels");
    hideCardByTitle("Partenaire");

    // ✅ optionnel : si tu veux retirer toute la colonne droite
    collapseRightColumn();
  }

  // Run now + après render + si réinjection
  function boot(){
    apply();
    setTimeout(apply, 150);
    setTimeout(apply, 600);
    setTimeout(apply, 1200);

    var obs = new MutationObserver(function(){ apply(); });
    obs.observe(document.documentElement, { childList:true, subtree:true });
  }

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
