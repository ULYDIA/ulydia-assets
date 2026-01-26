/* metier-page.v2026-01-26.FINAL.INDICATORS.PATCH13.js
   ULYDIA — Indicators card (chips-aware) — FIX:
   - Reads Remote_level / Automation_risk from:
       bloc.Remote_level | bloc.remote_level | bloc.chips.Remote_level | bloc.chips.remote_level
       bloc.Automation_risk | bloc.automation_risk | bloc.chips.Automation_risk | bloc.chips.automation_risk
   - Never breaks rendering if values missing
   - Keeps your existing DOM token strategy (id OR class)

   Load AFTER BASE + BLOCFLATTEN (and before TEXTCLEAN is fine).
*/
(() => {
  if (window.__ULYDIA_IND_PATCH13__) return;
  window.__ULYDIA_IND_PATCH13__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[ind.patch13]", ...a);

  const $$ = (sel, root) => Array.from((root||document).querySelectorAll(sel));

  function findNodes(token){
    const safe = String(token||"").replace(/[^\w\-]/g,"");
    return [
      ...$$("#"+safe),
      ...$$("."+safe)
    ];
  }

  function setText(token, text){
    const nodes = findNodes(token);
    nodes.forEach(n => n.textContent = text);
    return nodes.length;
  }

  function getBloc(){
    return window.__ULYDIA_BLOC__
      || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields
      || window.__ULYDIA_METIER_PAGE_CTX__
      || {};
  }

  function pickIndicator(bloc, keys){
    for (const k of keys){
      const v1 = bloc?.[k];
      if (v1 !== undefined && v1 !== null && String(v1).trim() !== "") return String(v1).trim();

      const chips = bloc?.chips || bloc?.Chips || null;
      const v2 = chips?.[k];
      if (v2 !== undefined && v2 !== null && String(v2).trim() !== "") return String(v2).trim();

      // try different casing
      const kLow = String(k).toLowerCase();
      const v3 = chips?.[kLow];
      if (v3 !== undefined && v3 !== null && String(v3).trim() !== "") return String(v3).trim();
      const v4 = bloc?.[kLow];
      if (v4 !== undefined && v4 !== null && String(v4).trim() !== "") return String(v4).trim();
    }
    return "";
  }

  function render(){
    const bloc = getBloc();

    const remote = pickIndicator(bloc, ["Remote_level","remote_level","Remote","remote","teletravail","Télétravail"]);
    const risk   = pickIndicator(bloc, ["Automation_risk","automation_risk","Automation","automation","risque_d_automatisation","Risque d'automatisation"]);

    // Your design tokens (from your DOM):
    // - Remote level text target: js-chip-remote_level
    // - Automation risk text target: js-chip-automation_risk
    const wroteRemote = remote ? setText("js-chip-remote_level", remote) : 0;
    const wroteRisk   = risk   ? setText("js-chip-automation_risk", risk) : 0;

    log("render", { remote, risk, wroteRemote, wroteRisk });
  }

  function boot(){
    render();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(render, 80);
        setTimeout(render, 260);
      });
    }
    // a few retries (safe, no infinite loop)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      render();
      if (tries >= 10) clearInterval(t);
    }, 250);
  }

  boot();
})();
