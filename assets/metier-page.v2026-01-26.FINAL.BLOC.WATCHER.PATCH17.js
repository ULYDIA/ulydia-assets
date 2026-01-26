(function(){
  if (window.__ULYDIA_PATCH17_WATCHER__) return;
  window.__ULYDIA_PATCH17_WATCHER__ = true;

  function apply(bloc){
    if (!bloc || typeof bloc !== "object") return;
    var chips = bloc.chips || {};

    // alias top-level
    if (bloc.Remote_level == null)    bloc.Remote_level = chips.Remote_level ?? chips.remote_level ?? null;
    if (bloc.Automation_risk == null) bloc.Automation_risk = chips.Automation_risk ?? chips.automation_risk ?? null;
    if (bloc.Currency == null)        bloc.Currency = chips.Currency ?? chips.currency ?? "EUR";

    window.__ULYDIA_PATCH17_LAST__ = {
      Remote_level: bloc.Remote_level,
      Automation_risk: bloc.Automation_risk,
      Currency: bloc.Currency
    };
  }

  // 1) patch immédiat si déjà présent
  try { apply(window.__ULYDIA_BLOC__); } catch(e){}

  // 2) hook setter pour toutes les ré-écritures futures
  try {
    var _val = window.__ULYDIA_BLOC__;
    Object.defineProperty(window, "__ULYDIA_BLOC__", {
      configurable: true,
      get: function(){ return _val; },
      set: function(v){ _val = v; try { apply(_val); } catch(e){} }
    });
    // ré-injecte la valeur actuelle dans le setter (pour appliquer)
    window.__ULYDIA_BLOC__ = _val;
  } catch(e){
    // 3) fallback si defineProperty bloque (rare) : re-apply en polling
    var tries = 0;
    (function loop(){
      tries++;
      try { apply(window.__ULYDIA_BLOC__); } catch(e){}
      if (tries < 400) setTimeout(loop, 50);
    })();
  }
})();
