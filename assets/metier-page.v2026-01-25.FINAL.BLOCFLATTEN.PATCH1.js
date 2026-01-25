/* metier-page.v2026-01-25.FINAL.BLOCFLATTEN.PATCH1.js
   ULYDIA — Metier_Pays_Blocs "sections[]" -> flat fields patch (SAFE)

   Why:
   - BASE may expose blocFields as schema: { iso, metier, sections:[{key,label,type,value}], chips:{...}, salary:{...} }
   - Some PATCHES (notably RIGHT rail) expect flat keys on blocFields: skills_must_have, tools_stack, certifications, etc.

   This patch:
   ✅ Listens for ULYDIA:METIER_READY (or polls)
   ✅ If blocFields has sections[], builds a flat map { [key]: value }
   ✅ Adds both original & lowercased keys (e.g. "Skills_must_have" and "skills_must_have")
   ✅ Stores result into:
      - window.__ULYDIA_BLOC__  (merged, so existing readers still work)
      - window.__ULYDIA_METIER_PAGE_CTX__.blocFields (same object)
   ✅ Does NOT touch HTML directly
*/
(() => {
  if (window.__ULYDIA_BLOCFLATTEN_PATCH1__) return;
  window.__ULYDIA_BLOCFLATTEN_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocflatten.patch1]", ...a);

  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const normKey = (k) => String(k || "").trim();

  function flattenSections(sections){
    const flat = {};
    if (!Array.isArray(sections)) return flat;
    for (const s of sections) {
      if (!s) continue;
      const k = normKey(s.key || s.Key || s.name || s.slug);
      if (!k) continue;
      const v = (s.value !== undefined) ? s.value : (s.html !== undefined ? s.html : (s.content !== undefined ? s.content : ""));
      flat[k] = v;
      flat[k.toLowerCase()] = v;
      // also normalize common variants (spaces -> _)
      flat[k.replace(/\s+/g, "_")] = v;
      flat[k.replace(/\s+/g, "_").toLowerCase()] = v;
    }
    return flat;
  }

  function mergeInto(target, src){
    if (!isObj(target) || !isObj(src)) return target;
    for (const [k,v] of Object.entries(src)) {
      // don't overwrite existing non-empty values
      const cur = target[k];
      const curEmpty = cur === undefined || cur === null || (typeof cur === "string" && cur.trim() === "");
      if (curEmpty) target[k] = v;
    }
    return target;
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b || !isObj(b)) return;

    if (!Array.isArray(b.sections)) {
      log("no sections[] detected — nothing to flatten");
      return;
    }

    const flat = flattenSections(b.sections);
    if (!Object.keys(flat).length) {
      log("sections[] empty — nothing to flatten");
      return;
    }

    // Ensure window.__ULYDIA_BLOC__ points to the same object used by patches
    const same = (window.__ULYDIA_BLOC__ === b);
    if (!same) window.__ULYDIA_BLOC__ = b;

    mergeInto(b, flat);

    // keep ctx in sync
    try {
      if (window.__ULYDIA_METIER_PAGE_CTX__) {
        window.__ULYDIA_METIER_PAGE_CTX__.blocFields = b;
      }
    } catch(e){}

    log("flattened keys added", Object.keys(flat).slice(0,20), "… total:", Object.keys(flat).length);
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__ || null;

    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) {
      run(ctx);
      return;
    }

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    // fallback poll
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__ || null;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();
