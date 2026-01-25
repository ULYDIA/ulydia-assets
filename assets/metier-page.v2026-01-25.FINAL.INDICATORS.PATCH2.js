/* metier-page.v2026-01-25.FINAL.INDICATORS.PATCH2.js
   ULYDIA — Indicators patch (safe override)
   ✅ Uses Metier_pays_bloc fields when present
   ✅ If a CMS field is missing/empty -> keeps the existing value (no hide, no wipe)
   ✅ Only hides a KPI row if the CMS explicitly sets value to "hide" or "-"
*/
(() => {
  if (window.__ULYDIA_INDICATORS_PATCH2__) return;
  window.__ULYDIA_INDICATORS_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier indicators PATCH2]", ...a);

  const norm = (s) => String(s || "").replace(/\u00A0/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();

  function slugify(s){
    return lower(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getCtx(){
    const url = new URL(location.href);
    const iso = upper(url.searchParams.get("iso") || url.searchParams.get("country") || "");
    const slug = slugify(url.searchParams.get("slug") || url.searchParams.get("metier") || url.searchParams.get("job") || "");
    return { iso, slug };
  }

  function getCmsBlocs(){
    const a = window.__ULYDIA_METIER_PAYS_BLOCS__ || window.__ULYDIA_METIER_PAYS_BLOCS || null;
    return Array.isArray(a) ? a : [];
  }

  function pickField(obj, key){
    const f = obj?.fieldData || obj?.fields || obj || {};
    const direct = f[key];
    if (direct != null && norm(direct) !== "") return direct;
    const k2 = key.replace(/-/g, "_");
    if (f[k2] != null && norm(f[k2]) !== "") return f[k2];
    return "";
  }

  function blocIso(b){
    const f = b?.fieldData || b?.fields || b || {};
    return upper(f.iso || f.code_iso || f.codeIso || f["Code ISO"] || f["ISO"] || f.pays_iso || "");
  }

  function blocSlug(b){
    const f = b?.fieldData || b?.fields || b || {};
    const raw = f.metier_slug || f.job_slug || f.slug || f.metier || f.job || b?.slug || "";
    return slugify(raw);
  }

  function findBlocFor(ctx){
    const blocs = getCmsBlocs();
    if (!blocs.length) return null;

    // Prefer exact iso match when provided
    const isoMatches = ctx.iso ? blocs.filter(b => {
      const bi = blocIso(b);
      return !bi || bi === ctx.iso;
    }) : blocs;

    for (const b of isoMatches){
      const bs = blocSlug(b);
      if (!ctx.slug) return b;
      if (bs && (bs === ctx.slug || bs.includes(ctx.slug) || ctx.slug.includes(bs))) return b;
    }
    return null;
  }

  function getKpiBoxes(){
    const root = document.getElementById("ulydia-metier-root") || document;
    return [...root.querySelectorAll(".kpi-box")];
  }

  function getKpiBoxByLabel(labelText){
    const label = lower(labelText);
    return getKpiBoxes().find(box => {
      const p = box.querySelector(".flex-1 p.text-sm.font-medium");
      return p && lower(p.textContent) === label;
    }) || null;
  }

  function setKpi(labelText, cmsValue, colorFn){
    const box = getKpiBoxByLabel(labelText);
    if (!box) return false;

    const valueEl = box.querySelector(".flex-1 p.text-sm.font-bold");
    if (!valueEl) return false;

    const v = norm(cmsValue);
    if (!v) return true; // keep existing
    const lv = lower(v);
    if (lv === "-" || lv === "hide" || lv === "none") {
      box.style.display = "none";
      return true;
    }

    box.style.display = "";
    valueEl.textContent = v;

    const c = colorFn ? colorFn(v) : "";
    if (c) valueEl.style.color = c;

    return true;
  }

  function colorForRisk(v){
    const t = lower(v);
    if (t.includes("faible") || t.includes("low")) return "#10b981";
    if (t.includes("moyen") || t.includes("medium")) return "#f59e0b";
    if (t.includes("élev") || t.includes("high")) return "#ef4444";
    return "";
  }

  function colorForDemand(v){
    const t = lower(v);
    if (t.includes("très") || t.includes("very")) return "#ef4444";
    if (t.includes("fort") || t.includes("high")) return "#f59e0b";
    if (t.includes("mod") || t.includes("medium")) return "#6366f1";
    if (t.includes("faible") || t.includes("low")) return "#10b981";
    return "";
  }

  async function boot(){
    // wait for BASE render (kpi-box exists)
    for (let i=0;i<100;i++){
      if (document.querySelector(".kpi-box")) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    const bloc = findBlocFor(ctx);

    log("ctx", ctx, "blocFound", !!bloc);

    if (!bloc) return;

    const remote = pickField(bloc, "js-chip-remote_level");
    const risk   = pickField(bloc, "js-chip-automation_risk");
    const curr   = pickField(bloc, "js-chip-currency");
    const tte    = pickField(bloc, "js-bf-time_to_employability");
    const grow   = pickField(bloc, "js-bf-growth_outlook");
    const dem    = pickField(bloc, "js-bf-market_demand");

    log("cms values", { remote, risk, curr, tte, grow, dem });

    setKpi("Télétravail", remote);
    setKpi("Risque d'automatisation", risk, colorForRisk);
    setKpi("Devise", curr);
    setKpi("Délai d'employabilité", tte);
    setKpi("Croissance du marché", grow);
    setKpi("Demande du marché", dem, colorForDemand);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();