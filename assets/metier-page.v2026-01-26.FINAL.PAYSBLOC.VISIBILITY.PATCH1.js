/* metier-page.v2026-01-26.FINAL.PAYSBLOC.VISIBILITY.PATCH1.js
   Hide LEFT blocks & chips when Metier_Pays_Bloc content is missing.
   Targets:
     Blocks: js-bf-formation / js-bf-acces / js-bf-marche / js-bf-salaire
     Chips/buttons: [data-chip="formation|acces|marche|salaire"] OR #js-chip-formation etc (optional)
   Works with:
     window.__ULYDIA_BLOC__ flattened keys: formation_bloc, acces_bloc, marche_bloc, salaire_bloc
     OR ctx.sections entries with key/value.
*/
(() => {
  if (window.__ULYDIA_PAYSBLOC_VIS_PATCH1__) return;
  window.__ULYDIA_PAYSBLOC_VIS_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[paysbloc.vis.patch1]", ...a);

  const keys = ["formation_bloc","acces_bloc","marche_bloc","salaire_bloc"];

  const cleanText = (html) => String(html||"")
    .replace(/\u00a0/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t\r]+/g, " ")
    .trim();

  function hasMeaningful(html){
    const t = cleanText(html);
    if (!t) return false;
    // if only punctuation
    if (t.replace(/[.\-–—•\s]/g,"").length === 0) return false;
    return true;
  }

  function getFromCtx(ctx, k){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || {};
    if (b && Object.prototype.hasOwnProperty.call(b, k)) return b[k];
    // fallback from sections array
    const secs = ctx?.sections || b?.sections || [];
    const hit = (secs||[]).find(s => String(s?.key||"").toLowerCase() === k.toLowerCase());
    return hit?.value || "";
  }

  function show(el){ if (el) el.style.display = ""; }
  function hide(el){ if (el) el.style.display = "none"; }

  function byId(id){ return document.getElementById(id); }

  function findChip(type){
    // optional patterns
    return document.querySelector(`[data-chip="${type}"]`) ||
           byId(`js-chip-${type}`) ||
           document.querySelector(`a[href*="${type}"], button[data-target*="${type}"]`);
  }

  function run(ctx){
    const map = {
      formation: "formation_bloc",
      acces: "acces_bloc",
      marche: "marche_bloc",
      salaire: "salaire_bloc",
    };

    Object.keys(map).forEach(type => {
      const k = map[type];
      const val = getFromCtx(ctx, k);
      const ok = hasMeaningful(val);

      const block = byId(`js-bf-${type}`);
      const chip = findChip(type);

      if (ok) {
        show(block);
        show(chip);
      } else {
        hide(block);
        hide(chip);
      }
    });

    log("visibility applied");
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();