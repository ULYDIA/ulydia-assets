(function(){
  if (window.__ULYDIA_HIDE_RIGHT_WHEN_NO_MPB_PATCH4__) return;
  window.__ULYDIA_HIDE_RIGHT_WHEN_NO_MPB_PATCH4__ = true;

  function norm(s){
    return String(s||"").replace(/\u00A0/g," ").replace(/\s+/g," ").trim();
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || window.__ULYDIA_CTX__ || window.__ULYDIA_DATA__ || null;
  }

  function mpbIsEmpty(){
    var ctx = getCtx();

    // ✅ 1) meilleur cas : le BASE expose blocFields (MPB trouvé)
    var bf = ctx && (ctx.blocFields || (ctx.bloc && (ctx.bloc.fieldData || ctx.bloc.fields)) || null);
    if (bf && typeof bf === "object") return Object.keys(bf).length === 0;

    // ✅ 2) fallback DOM : adapte ces sélecteurs si tu as un wrapper MPB connu
    var mpbRoot = document.querySelector(
      '[data-mpb-root], #metier-pays-blocs, .js-mpb-root, .ulydia-mpb, .mpb-list'
    );

    if (!mpbRoot) {
      // si rien dans le DOM pour MPB, on considère "vide"
      return true;
    }

    // si wrapper existe, check contenu réel
    var txt = norm(mpbRoot.textContent || "").replace(/\s+/g,"");
    var hasLi = mpbRoot.querySelectorAll("li").length > 0;
    return !(hasLi || txt.length > 20);
  }

  function hideCardByTitle(title){
    title = String(title||"").toLowerCase();

    var nodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span,p"));
    for (var i=0;i<nodes.length;i++){
      var t = norm(nodes[i].textContent).toLowerCase();
      if (!t) continue;
      if (t.indexOf(title) === -1) continue;

      var card =
        nodes[i].closest(".card,.u-section-card,.section-card,.u-card,[class*='card']") ||
        nodes[i].closest("section,article") ||
        nodes[i].parentElement;

      if (card) card.style.setProperty("display","none","important");
    }
  }

  function collapseRightColumn(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root) return;

    var grid = root.querySelector(".ulydia-grid,.grid,[data-layout='2cols'],[data-ulydia-layout='2cols']");
    if (!grid) return;

    var right =
      grid.querySelector(".right-col,.col-right,[data-col='right'],[data-ulydia-col='right']") ||
      (grid.children && grid.children.length >= 2 ? grid.children[1] : null);

    if (right) right.style.setProperty("display","none","important");
    grid.style.setProperty("grid-template-columns","1fr","important");
  }

  function apply(){
    if (!mpbIsEmpty()) return false;

    hideCardByTitle("Partenaire");
    hideCardByTitle("Soft Skills essentiels");

    // ✅ si tu veux supprimer toute la colonne droite quand MPB vide :
    collapseRightColumn();

    return true;
  }

  function boot(){
    apply();
    setTimeout(apply, 200);
    setTimeout(apply, 700);
    setTimeout(apply, 1300);

    var obs = new MutationObserver(function(){ apply(); });
    obs.observe(document.documentElement, { childList:true, subtree:true });
  }

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
