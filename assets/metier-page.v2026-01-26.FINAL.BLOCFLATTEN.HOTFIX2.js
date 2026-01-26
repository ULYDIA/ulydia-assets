(function(){
  // =========================================================
  // ULYDIA — BLOC FLATTEN HOTFIX2 (safe)
  // Goal: keep existing patches (INDICATORS.PATCH1..js + SALARY.PATCH8.js) working
  // by exposing flat fields on window.__ULYDIA_BLOC__ even if data is nested.
  // - Does NOT change the BASE renderer
  // - Never throws (fails silently)
  // =========================================================
  if (window.__ULYDIA_BLOC_FLATTEN_HOTFIX2__) return;
  window.__ULYDIA_BLOC_FLATTEN_HOTFIX2__ = true;

  function lowerSnake(s){
    return String(s||"")
      .replace(/[A-Z]/g, function(m){ return "_"+m.toLowerCase(); })
      .replace(/[\s\-]+/g,"_")
      .replace(/_+/g,"_")
      .replace(/^_+/,"")
      .toLowerCase();
  }
  function pick(obj, keys){
    for (var i=0;i<keys.length;i++){
      var k=keys[i];
      if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
    }
    return null;
  }
  function isNum(n){ return typeof n==="number" && !isNaN(n); }

  function apply(){
    try{
      var b = window.__ULYDIA_BLOC__;
      if (!b || typeof b !== "object") return false;

      // ---- 1) Chips -> flat snake_case fields expected by INDICATORS.PATCH1..js
      var chips = b.chips || b.Chips || {};
      // Support both Remote_level / remote_level etc
      var remote = pick(chips, ["remote_level","Remote_level","Remote_level_local","RemoteLevel","remoteLevel","Remote"]);
      var autoR  = pick(chips, ["automation_risk","Automation_risk","AutomationRisk","automationRisk"]);
      var curr   = pick(chips, ["currency","Currency","currency_code","Currency_code","currencyCode"]);
      // Sometimes currency is a section or top-level
      if (!curr) curr = pick(b, ["currency","Currency","currency_code","Currency_code"]);

      if (remote && !b.remote_level) b.remote_level = remote;
      if (autoR  && !b.automation_risk) b.automation_risk = autoR;
      if (curr   && !b.currency) b.currency = curr;

      // ---- 2) Salary nested -> flat numeric fields expected by SALARY.PATCH8.js
      var s = b.salary || b.Salary || null;
      if (s && typeof s === "object") {
        var j = s.junior || s.Junior || {};
        var m = s.mid || s.confirmed || s.Mid || s.Confirmed || {};
        var se= s.senior || s.Senior || {};
        if (!isNum(b.salary_junior_min) && isNum(j.min)) b.salary_junior_min = j.min;
        if (!isNum(b.salary_junior_max) && isNum(j.max)) b.salary_junior_max = j.max;
        if (!isNum(b.salary_mid_min)    && isNum(m.min)) b.salary_mid_min = m.min;
        if (!isNum(b.salary_mid_max)    && isNum(m.max)) b.salary_mid_max = m.max;
        if (!isNum(b.salary_senior_min) && isNum(se.min)) b.salary_senior_min = se.min;
        if (!isNum(b.salary_senior_max) && isNum(se.max)) b.salary_senior_max = se.max;

        var varPct = pick(s, ["variable_share_pct","variable_share","variable_pct","Variable_share_pct","Variable_share"]);
        if (!isNum(b.salary_variable_share) && isNum(varPct)) b.salary_variable_share = varPct;

        // notes
        var notes = pick(s, ["notes","Notes","salary_notes","Salary_notes"]);
        if (notes && !b.salary_notes) b.salary_notes = notes;
      }

      // ---- 3) Sections array -> flat fields (time_to_employability, growth_outlook, market_demand, etc.)
      // Many sources store these in b.sections = [{key,label,value,type}]
      var sections = b.sections || b.Sections || null;
      if (Array.isArray(sections)) {
        for (var i=0;i<sections.length;i++){
          var sec = sections[i] || {};
          var key = sec.key || sec.Key || sec.label || sec.Label;
          if (!key) continue;
          var sk = lowerSnake(key);
          // ignore generic keys
          if (!sk) continue;
          // value (prefer html/text already computed)
          var val = sec.value || sec.Value || sec.html || sec.HTML || sec.text || sec.Text;
          if (val === undefined || val === null) continue;
          if (typeof val === "string" && !val.trim()) continue;
          // Only set if not already set (don't overwrite BASE)
          if (b[sk] === undefined || b[sk] === null || String(b[sk]).trim()==="") {
            b[sk] = val;
          }
        }
      }

      // ---- 4) Also map alternative top-level keys created by your CMS reader (Capitalized with underscores)
      // e.g. b.Remote_level -> b.remote_level
      ["Remote_level","Automation_risk","Currency","Time_to_employability","Growth_outlook","Market_demand"].forEach(function(k){
        if (b[k] !== undefined && b[k] !== null) {
          var sk = lowerSnake(k);
          if (b[sk] === undefined || b[sk] === null || String(b[sk]).trim()==="") b[sk] = b[k];
        }
      });

      // expose a tiny flag for debugging
      window.__ULYDIA_BLOC_FLAT_READY__ = true;

      // optional: dispatch event so patches that listen can re-render
      try{
        document.dispatchEvent(new CustomEvent("ulydia:blocflat", { detail: { iso:b.iso, metier:b.metier } }));
      }catch(e){}
      return true;
    }catch(e){
      return false;
    }
  }

  var tries = 0;
  (function loop(){
    tries++;
    var ok = apply();
    if (ok) return;
    if (tries > 200) return; // 10s max
    setTimeout(loop, 50);
  })();
})();