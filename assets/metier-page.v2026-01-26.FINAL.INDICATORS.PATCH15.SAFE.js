(function () {
  if (window.__ULYDIA_INDICATORS_PATCH15__) return;
  window.__ULYDIA_INDICATORS_PATCH15__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function pickBloc(){
    return window.__ULYDIA_BLOC__ || window.__ULYDIA_BLOC || window.__ULYDIA_BLOC_DATA__ || null;
  }

  function mapLevel(v){
    var s = norm(v).toLowerCase();
    if (!s) return null;
    if (s === "none" || s === "no" || s === "0") return "Aucun";
    if (s === "low"  || s === "faible") return "Faible";
    if (s === "medium" || s === "moyen" || s === "moderate") return "Modéré";
    if (s === "high" || s === "élevé" || s === "eleve") return "Élevé";
    return norm(v);
  }

  // Trouve une ligne KPI par label, et écrit la valeur dans le “slot valeur”
  function setKpiValue(label, value){
    value = norm(value);
    if (!value) return false;

    // Cherche l’élément qui contient le label (Télétravail / Risque d’automatisation)
    var all = Array.from(document.querySelectorAll("body *"));
    var labelEls = all.filter(function(el){
      // éviter gros blocs
      if (!el || !el.textContent) return false;
      var t = norm(el.textContent);
      return t === label;
    });

    for (var i=0;i<labelEls.length;i++){
      var el = labelEls[i];

      // remonte un conteneur “ligne”
      var row = el.closest("[class*='kpi'],[class*='indicator'],[class*='row'],[class*='item'],.u-kpi-row,.ul-kpi-row,.ul-ind-row,.ul-indicator-row") || el.parentElement;
      if (!row) continue;

      // cible “valeur” : (1) classe connue, (2) dernier span/div, (3) sibling
      var vEl =
        row.querySelector(".js-kpi-value,.js-ind-value,.ul-kpi-value,.u-kpi-value") ||
        row.querySelector("span:last-of-type, div:last-of-type") ||
        null;

      if (vEl && vEl !== el) {
        vEl.textContent = value;
        return true;
      }
    }
    return false;
  }

  function apply(){
    var bloc = pickBloc();
    if (!bloc) return false;

    var chips = bloc.chips || {};
    // ✅ Alias top-level (pour que tes anciens patches/console marchent)
    bloc.Remote_level     = bloc.Remote_level     || chips.Remote_level     || chips.remote_level     || null;
    bloc.Automation_risk  = bloc.Automation_risk  || chips.Automation_risk  || chips.automation_risk  || null;
    bloc.Currency         = bloc.Currency         || chips.Currency         || chips.currency         || null;

    // Valeurs “humaines”
    var remote = mapLevel(bloc.Remote_level);
    var autoR  = mapLevel(bloc.Automation_risk);

    // Remplissage UI
    var ok1 = setKpiValue("Télétravail", remote || "—");
    var ok2 = setKpiValue("Risque d’automatisation", autoR || "—");

    return (ok1 || ok2);
  }

  var tries = 0;
  (function loop(){
    tries++;
    try { if (apply()) return; } catch(e) {}
    if (tries > 120) return; // n’écrase jamais la page
    setTimeout(loop, 50);
  })();
})();
