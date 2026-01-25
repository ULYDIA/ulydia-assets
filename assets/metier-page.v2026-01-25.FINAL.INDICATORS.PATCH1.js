/* metier-page.v2026-01-25.FINAL.INDICATORS.PATCH1.js
   ULYDIA — Indicators patch (CMS-driven using Metier_pays_bloc fields you already have)

   Reads from the matching Metier_pays_bloc (window.__ULYDIA_METIER_PAYS_BLOCS__) for current (slug, iso):
   - js-chip-remote_level        -> Télétravail
   - js-chip-automation_risk     -> Risque d'automatisation
   - js-chip-currency            -> Devise
   - js-bf-time_to_employability -> Délai d'employabilité
   - js-bf-growth_outlook        -> Croissance du marché
   - js-bf-market_demand         -> Demande du marché

   ✅ Hides KPI rows when the corresponding field is empty
   ✅ Keeps existing design; only replaces values
*/
(() => {
  if (window.__ULYDIA_INDICATORS_PATCH1__) return;
  window.__ULYDIA_INDICATORS_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier indicators PATCH1]", ...a);

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
    if (!obj) return "";
    const f = obj.fieldData || obj.fields || obj || {};
    // Try exact key and common variants
    const direct = f[key];
    if (direct != null && direct !== "") return direct;
    // Also try with underscores instead of dashes
    const k2 = key.replace(/-/g, "_");
    if (f[k2] != null && f[k2] !== "") return f[k2];
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

    for (const b of blocs){
      const bi = blocIso(b);
      if (ctx.iso && bi && bi !== ctx.iso) continue;

      const bs = blocSlug(b);
      if (ctx.slug && bs && (bs === ctx.slug || bs.includes(ctx.slug) || ctx.slug.includes(bs))) return b;
    }
    return null;
  }

  function setKpiValueByLabel(labelText, valueText, color){
    const root = document.getElementById("ulydia-metier-root") || document;
    const labels = [...root.querySelectorAll(".kpi-box p")].filter(p => lower(p.textContent) === lower(labelText));
    if (!labels.length) return false;

    // Label is the small text; value is next <p> inside the same flex-1
    const labelEl = labels[0];
    const box = labelEl.closest(".kpi-box");
    if (!box) return false;

    const valueEl = box.querySelector(".flex-1 p.text-sm.font-bold") || box.querySelector(".flex-1 p:nth-of-type(2)");
    if (!valueEl) return false;

    const v = norm(valueText);
    if (!v){
      // hide the whole row if empty
      box.style.display = "none";
      return true;
    }

    box.style.display = "";
    valueEl.textContent = v;
    if (color) valueEl.style.color = color;
    return true;
  }

  function colorForRisk(v){
    const t = lower(v);
    if (t.includes("faible") || t.includes("low")) return "#10b981";
    if (t.includes("moyen") || t.includes("medium")) return "#f59e0b";
    if (t.includes("élev") || t.includes("high")) return "#ef4444";
    return ""; // keep existing
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
    // wait for BASE render
    for (let i=0;i<80;i++){
      if (document.querySelector(".kpi-box")) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    const bloc = findBlocFor(ctx);

    log("ctx", ctx, "blocFound", !!bloc);

    if (!bloc){
      // No bloc => keep defaults (hardcoded) rather than blank
      return;
    }

    const remote = pickField(bloc, "js-chip-remote_level");
    const risk   = pickField(bloc, "js-chip-automation_risk");
    const curr   = pickField(bloc, "js-chip-currency");
    const tte    = pickField(bloc, "js-bf-time_to_employability");
    const grow   = pickField(bloc, "js-bf-growth_outlook");
    const dem    = pickField(bloc, "js-bf-market_demand");

    // Apply (hide row if empty)
    setKpiValueByLabel("Télétravail", remote);
    setKpiValueByLabel("Risque d'automatisation", risk, colorForRisk(risk));
    setKpiValueByLabel("Devise", curr);
    setKpiValueByLabel("Délai d'employabilité", tte);
    setKpiValueByLabel("Croissance du marché", grow); // keep existing green unless you want mapping
    setKpiValueByLabel("Demande du marché", dem, colorForDemand(dem));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();