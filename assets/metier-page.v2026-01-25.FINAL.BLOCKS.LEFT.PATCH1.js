/* metier-page — BLOCKS.LEFT.PATCH1
   Injects Metier_Pays_Blocs rich sections into LEFT cards:
   - formation_bloc -> #formation-title
   - acces_bloc     -> #acces-title
   - marche_bloc    -> #marche-title
   - salaire_bloc   -> #salaire-title
   Safe: does nothing if bloc missing or fields empty.
*/
(() => {
  if (window.__ULYDIA_BLOCKS_LEFT_PATCH1__) return;
  window.__ULYDIA_BLOCKS_LEFT_PATCH1__ = true;

  function isEmptyRich(html){
    const s = String(html || "").replace(/\u00a0/g, " ").trim();
    if (!s) return true;
    const stripped = s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    return !stripped;
  }

  function showCardById(id){
    const el = document.getElementById(id);
    if (!el) return;
    const card = el.closest(".card") || el.closest("section") || el.parentElement;
    if (card) card.style.display = "";
  }

  function setRich(id, html){
    const el = document.getElementById(id);
    if (!el) return;
    if (isEmptyRich(html)) return;
    el.innerHTML = String(html);
    showCardById(id);
  }

  function pickField(blocFields, key){
    if (!blocFields) return "";
    // try variants
    return (
      blocFields[key] ??
      blocFields[key.toLowerCase()] ??
      blocFields[key.toUpperCase()] ??
      ""
    );
  }

  function normalizeBlocFields(blocRaw, blocFields){
    // Support legacy schema: { sections:[{key,value}] }
    const b = blocFields || null;
    if (!b) return null;

    const byKey = {};
    if (Array.isArray(b.sections)) {
      for (const s of b.sections) {
        if (!s || !s.key) continue;
        byKey[String(s.key)] = s.value;
      }
    }
    return { raw: blocRaw || null, fields: b, byKey };
  }

  function run(ctx){
    const blocRaw = ctx?.bloc || window.__ULYDIA_BLOC_RAW__ || null;
    const blocFields = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    const nb = normalizeBlocFields(blocRaw, blocFields);
    if (!nb) return;

    const f = nb.fields;
    const byKey = nb.byKey || {};

    // Priority: direct CMS fields first, then legacy sections map
    setRich("formation-title", pickField(f, "formation_bloc") || byKey["formation_bloc"]);
    setRich("acces-title",     pickField(f, "acces_bloc")     || byKey["acces_bloc"] || byKey["acces"]);
    setRich("marche-title",    pickField(f, "marche_bloc")    || byKey["marche_bloc"] || byKey["marche"]);
    setRich("salaire-title",   pickField(f, "salaire_bloc")   || byKey["salaire_bloc"] || byKey["salaire"]);
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);

    // Prefer event bus
    if (window.__ULYDIA_METIER_BUS__ && window.__ULYDIA_METIER_BUS__.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    // Fallback: short poll (no infinite loops)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) {
        clearInterval(t);
        run(ctx2);
      }
      if (tries > 200) clearInterval(t); // ~10s
    }, 50);
  }

  onReady();
})();
