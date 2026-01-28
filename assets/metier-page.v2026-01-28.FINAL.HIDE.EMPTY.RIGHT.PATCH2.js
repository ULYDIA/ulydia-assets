(function(){
  if (window.__ULYDIA_HIDE_RIGHT_WHEN_NO_MPB_PATCH10__) return;
  window.__ULYDIA_HIDE_RIGHT_WHEN_NO_MPB_PATCH10__ = true;

  function norm(s){
    return String(s||"")
      .replace(/\u00A0/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || window.__ULYDIA_CTX__ || null;
  }

  function getBlocFields(ctx){
    if (ctx && ctx.blocFields) return ctx.blocFields;
    if (ctx && ctx.bloc && (ctx.bloc.fieldData || ctx.bloc.fields)) return (ctx.bloc.fieldData || ctx.bloc.fields);
    return null;
  }

  // ✅ Détecte “aucune data MPB”
  function mpbIsEmpty(){
    const ctx = getCtx();
    const bf = getBlocFields(ctx);

    // si on n’a même pas le ctx, on ne tranche pas
    if (!ctx) return null;

    // cas 1: array MPB exposé quelque part
    const arr =
      window.__ULYDIA_METIER_PAYS_BLOCS__ ||
      ctx.metierPaysBlocs ||
      ctx.mpb ||
      ctx.metier_pays_blocs;

    if (Array.isArray(arr)) return arr.length === 0;

    // cas 2: “blocFields” existe => on considère que MPB a été trouvé (même partiel)
    if (bf && typeof bf === "object") {
      // si objet vide -> vide, sinon non vide
      return Object.keys(bf).length === 0;
    }

    // cas 3: fallback DOM (si tu as un wrapper MPB)
    const mpbRoot =
      document.querySelector('[data-mpb-root], #metier-pays-blocs, .js-mpb-root, .ulydia-mpb, .mpb-list');

    if (mpbRoot){
      const txt = norm(mpbRoot.textContent || "").replace(/\s+/g,"");
      const hasLi = mpbRoot.querySelectorAll("li").length > 0;
      return !(hasLi || txt.length > 20);
    }

    // inconnu
    return null;
  }

  // ✅ Même logique que PATCH9.1 (qui marchait), mais appliquée seulement si MPB vide
  function hideCardsByTitle(titles){
    const cards = Array.prototype.slice.call(
      document.querySelectorAll(".card,.u-section-card,.section-card,.u-card,[class*='card']")
    );

    for (let i=0;i<cards.length;i++){
      const card = cards[i];
      const txt = norm(card.textContent);

      for (let j=0;j<titles.length;j++){
        const title = titles[j];
        if (txt.indexOf(title) !== -1){
          card.style.display = "none";
        }
      }
    }
  }

  function run(){
    const empty = mpbIsEmpty();
    if (empty !== true) return false;

    // ✅ si MPB vide, on cache Soft Skills (et Partenaire si tu veux)
    hideCardsByTitle([
      "Soft Skills essentiels",
      "Partenaire" // <-- enlève cette ligne si tu veux garder Partenaire
    ]);

    return true;
  }

  function waitFor(fn, timeoutMs){
    const t0 = Date.now();
    (function loop(){
      try { if (fn()) return; } catch(e){}
      if (Date.now() - t0 > (timeoutMs||15000)) return;
      setTimeout(loop, 80);
    })();
  }

  waitFor(run, 15000);
})();

