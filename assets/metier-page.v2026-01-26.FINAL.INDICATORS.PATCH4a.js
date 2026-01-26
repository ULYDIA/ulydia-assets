(function(){
  "use strict";
  // =========================================================
  // ULYDIA — INDICATORS PATCH4 (metier fields first)
  // Fills:
  //   js-ind-remote
  //   js-ind-automation
  //   js-ind-currency
  // And keeps card visible only if at least one exists
  // =========================================================
  window.__ULYDIA_INDICATORS_PATCH4__ = true;

  function log(){ if (window.__METIER_PAGE_DEBUG__) console.log.apply(console, ["[IND.P4]"].concat([].slice.call(arguments))); }
  function qs(id){ return document.getElementById(id); }
  function txt(el, v){ if (!el) return; el.textContent = String(v==null ? "" : v); }

  function pickCurrencyCodeAndSymbol(cur){
    cur = String(cur||"").trim();
    if (!cur) return {code:"", sym:""};
    // symbol only provided
    if (cur === "€") return {code:"EUR", sym:"€"};
    if (cur === "$") return {code:"USD", sym:"$"};
    if (cur === "£") return {code:"GBP", sym:"£"};
    const up = cur.toUpperCase();
    if (up.includes("EUR")) return {code:"EUR", sym:"€"};
    if (up.includes("USD")) return {code:"USD", sym:"$"};
    if (up.includes("GBP")) return {code:"GBP", sym:"£"};
    if (up.includes("CHF")) return {code:"CHF", sym:"CHF"};
    if (up.includes("CAD")) return {code:"CAD", sym:"CAD"};
    if (up.includes("AUD")) return {code:"AUD", sym:"AUD"};
    // last resort
    return {code:up.slice(0,3), sym:cur};
  }

  function getData(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__ || {};
    const met = (ctx.metier && (ctx.metier.fieldData || ctx.metier.fields || ctx.metier)) || {};
    const flat = window.__ULYDIA_BLOC__ || {};
    const bf  = ctx.blocFields || {};

    function g(key){
      return met[key] != null ? met[key]
        : (flat[key] != null ? flat[key]
        : (bf[key] != null ? bf[key] : null));
    }

    return {
      remote_level: String(g("remote_level") || g("Remote_level") || "").trim(),
      automation_risk: String(g("automation_risk") || g("Automation_risk") || "").trim(),
      currency: String(g("currency") || g("Currency") || "").trim()
    };
  }

  function findCard(){
    const byId = document.getElementById("js-indicators-card") || document.querySelector("[data-ulydia='indicators-card']");
    if (byId) return byId;
    // Find card header "Indicateurs clés"
    const heads = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span")).filter(el=>{
      const t = (el.textContent||"").trim().toLowerCase();
      return t.includes("indicateurs") && t.includes("cl");
    });
    if (!heads.length) return null;
    return heads[0].closest("section,div") || null;
  }

  function render(){
    const d = getData();
    const cur = pickCurrencyCodeAndSymbol(d.currency);
    const any = !!(d.remote_level || d.automation_risk || cur.code || cur.sym);

    const card = findCard();
    if (!any) {
      if (card) card.style.display = "none";
      log("no indicators -> hide");
      return;
    }
    if (card) card.style.display = "";

    // Remote/automation may have enums in English; keep as-is for now
    if (qs("js-ind-remote")) txt(qs("js-ind-remote"), d.remote_level);
    if (qs("js-ind-automation")) txt(qs("js-ind-automation"), d.automation_risk);

    // Currency format: EUR (€)
    const curTxt = cur.code && cur.sym ? (cur.code + " (" + cur.sym + ")") : (cur.code || cur.sym || "");
    if (qs("js-ind-currency")) txt(qs("js-ind-currency"), curTxt);

    log("rendered", d);
  }

  let tries = 0;
  function boot(){
    tries++;
    if (tries > 120) return;
    if (!window.__ULYDIA_METIER_PAGE_CTX__) { setTimeout(boot, 200); return; }
    try { render(); } catch(e){ log("error", e); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();