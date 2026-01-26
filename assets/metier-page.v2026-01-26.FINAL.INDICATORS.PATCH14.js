(function(){
  // =========================================================
  // ULYDIA — INDICATORS PATCH14 (reads chips + flat)
  // Fix: Remote_level / Automation_risk stored under bloc.chips.*
  // Safe: no throw, no blocking
  // =========================================================
  if (window.__ULYDIA_INDICATORS_PATCH14__) return;
  window.__ULYDIA_INDICATORS_PATCH14__ = true;

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function setText(el, v){ if (!el) return; el.textContent = (v==null? "" : String(v)); }
  function normKey(k){ return String(k||"").trim(); }

  // Try to read a value from:
  // 1) bloc[key] (any case)
  // 2) bloc.chips[key] (any case)
  // 3) bloc.fieldData[key] if ever
  function getVal(bloc, key){
    if (!bloc) return undefined;
    const k = normKey(key);
    if (!k) return undefined;

    // direct exact
    if (bloc[k] !== undefined) return bloc[k];

    // direct case-insensitive
    const dk = Object.keys(bloc||{}).find(x => x && x.toLowerCase() === k.toLowerCase());
    if (dk) return bloc[dk];

    // chips exact
    if (bloc.chips && bloc.chips[k] !== undefined) return bloc.chips[k];

    // chips case-insensitive
    const ck = Object.keys(bloc.chips||{}).find(x => x && x.toLowerCase() === k.toLowerCase());
    if (ck) return bloc.chips[ck];

    // fieldData (rare)
    const fd = bloc.fieldData || bloc.fields;
    if (fd && fd[k] !== undefined) return fd[k];
    const fk = fd ? Object.keys(fd).find(x => x && x.toLowerCase() === k.toLowerCase()) : null;
    if (fk) return fd[fk];

    return undefined;
  }

  function findValue(bloc, keys){
    for (const k of (keys||[])){
      const v = getVal(bloc, k);
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return null;
  }

  // Render into the "Indicateurs clés" card
  function render(){
    const bloc = window.__ULYDIA_BLOC__ || window.__ULYDIA_BLOC || window.__ULYDIA_BLOCS_CURRENT__;
    if (!bloc) return;

    // ✅ also expose aliases so console checks work
    try{
      if (bloc.Remote_level === undefined) bloc.Remote_level = getVal(bloc, "Remote_level");
      if (bloc.Automation_risk === undefined) bloc.Automation_risk = getVal(bloc, "Automation_risk");
      if (bloc.Currency === undefined) bloc.Currency = getVal(bloc, "Currency");
    }catch(e){}

    // DOM nodes (the patch expects these exist in your Webflow design)
    const elRemote = qs(".js-ind-teletravail, .js-ind-remote, .js-ind-remote_level");
    const elAuto   = qs(".js-ind-automation, .js-ind-automation_risk, .js-ind-risque_automatisation");
    const elDevise = qs(".js-ind-currency, .js-ind-devise");
    const elTTE    = qs(".js-ind-time_to_employability, .js-ind-delai_employabilite");
    const elGrowth = qs(".js-ind-growth_outlook, .js-ind-croissance_marche");
    const elDemand = qs(".js-ind-market_demand, .js-ind-demande_marche");

    const remote = findValue(bloc, ["Remote_level","remote_level","Remote level","Télétravail","Teletravail"]);
    const auto   = findValue(bloc, ["Automation_risk","automation_risk","Risque d'automatisation","Automation risk"]);
    const cur    = findValue(bloc, ["Currency","currency","Devise","EUR","€"]);
    const tte    = findValue(bloc, ["Time_to_employability","time_to_employability"]);
    const growth = findValue(bloc, ["Growth_outlook","growth_outlook"]);
    const demand = findValue(bloc, ["Market_demand","market_demand"]);

    setText(elRemote, remote);
    setText(elAuto, auto);
    setText(elDevise, cur);
    setText(elTTE, tte);
    setText(elGrowth, growth);
    setText(elDemand, demand);

    // Hide empty rows if wrapper exists
    const rows = [
      { el: elRemote, row: elRemote && elRemote.closest(".u-ind-row, .u-ind-item, .w-layout-grid > div") },
      { el: elAuto,   row: elAuto   && elAuto.closest(".u-ind-row, .u-ind-item, .w-layout-grid > div") },
    ];
    rows.forEach(r=>{
      if (!r.row) return;
      const v = (r.el && r.el.textContent || "").trim();
      r.row.style.display = v ? "" : "none";
    });
  }

  // Run now + retry for async loading
  let n=0;
  (function loop(){
    n++;
    try{ render(); }catch(e){}
    const bloc = window.__ULYDIA_BLOC__ || window.__ULYDIA_BLOC;
    if (bloc || n>80) return;
    setTimeout(loop, 50);
  })();
})();