/* =========================================================
   ULYDIA — MPB GUARD (Metier_Pays_Blocs) — PATCH2 (SAFE)
   Goal:
   - Prevent "cross-job" leakage: if the MPB item does NOT match current (slug, iso),
     force bloc to null so MPB-render patches don't display wrong content.
   - Expose stable flags:
       window.__ULYDIA_MPB_HAS_MATCH__  (boolean)
       window.__ULYDIA_MPB_MATCH_META__ ({slug, iso})
   Requirements:
   - metier-page.v2026-01-25.FINAL.BASE.FIX13.js (sets __ULYDIA_METIER_PAGE_CTX__/__ULYDIA_BLOC__)
   ========================================================= */
(function(){
  "use strict";
  var W = window;

  function norm(s){ return String(s||"").trim(); }
  function up(s){ return norm(s).toUpperCase(); }
  function low(s){ return norm(s).toLowerCase(); }

  function pick(obj, keys){
    if(!obj) return "";
    for(var i=0;i<keys.length;i++){
      var k = keys[i];
      if(obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]);
    }
    return "";
  }

  function getBlocFields(){
    return W.__ULYDIA_BLOC__ || (W.__ULYDIA_METIER_PAGE_CTX__ && W.__ULYDIA_METIER_PAGE_CTX__.blocFields) || null;
  }
  function getBlocRaw(){
    return W.__ULYDIA_BLOC_RAW__ || (W.__ULYDIA_METIER_PAGE_CTX__ && W.__ULYDIA_METIER_PAGE_CTX__.bloc) || null;
  }

  function clearBloc(ctx){
    W.__ULYDIA_BLOC_RAW__ = null;
    W.__ULYDIA_BLOC__ = null;
    if(ctx){
      ctx.bloc = null;
      ctx.blocFields = null;
    }
  }

  function validateAndFlag(){
    var ctx = W.__ULYDIA_METIER_PAGE_CTX__ || null;
    if(!ctx) return;

    var slug = low(ctx.slug);
    var iso  = up(ctx.iso);

    // default: no match until proven
    var has = false;

    var blocFields = getBlocFields();
    var blocRaw    = getBlocRaw();
    if(!blocFields && blocRaw){
      blocFields = (blocRaw.fieldData || blocRaw.fields || blocRaw);
    }

    if(blocFields){
      // Try to extract match keys from the MPB item
      var bIso = up(pick(blocFields, [
        "js-bloc-iso","js_bloc_iso","bloc_iso","iso","ISO","code_iso","codeIso","pays_iso","country_iso"
      ]));
      var bMetier = low(pick(blocFields, [
        "js-bloc-metier","js_bloc_metier","bloc_metier","metier","metier_slug","metierSlug","slug_metier","job_slug","slug"
      ]));

      // If fields exist, they must match
      var isoOk = !bIso || (bIso === iso);
      var metierOk = !bMetier || (bMetier === slug);

      has = isoOk && metierOk;

      // Hard safety: if we have explicit mismatch, wipe bloc to avoid wrong rendering
      if(!has && ((bIso && bIso !== iso) || (bMetier && bMetier !== slug))){
        clearBloc(ctx);
      }

      // If we have no explicit keys at all, fallback to "truthy bloc" (legacy)
      if(!bIso && !bMetier){
        has = !!getBlocRaw();
      }
    } else {
      has = false;
    }

    W.__ULYDIA_MPB_HAS_MATCH__ = !!has;
    W.__ULYDIA_MPB_MATCH_META__ = { slug: ctx.slug || "", iso: ctx.iso || "" };

    // Optional: add a small marker on <html> for debugging/CSS (non-breaking)
    try{
      var html = document.documentElement;
      if(has) html.classList.add("ul-mpb-has");
      else html.classList.remove("ul-mpb-has");
    }catch(e){}
  }

  function onReady(fn){
    if(W.__ULYDIA_METIER_PAGE_READY__) return fn();
    // bus
    if(W.__ULYDIA_METIER_BUS__ && typeof W.__ULYDIA_METIER_BUS__.on === "function"){
      W.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", function(){ try{ fn(); }catch(e){} });
      return;
    }
    // fallback polling
    var t=0, max=200;
    (function loop(){
      if(W.__ULYDIA_METIER_PAGE_READY__) { fn(); return; }
      t++; if(t>max) return;
      setTimeout(loop, 50);
    })();
  }

  onReady(validateAndFlag);
})();
