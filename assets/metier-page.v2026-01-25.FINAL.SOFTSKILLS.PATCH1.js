/* metier-page.v2026-01-25.FINAL.SOFTSKILLS.PATCH1.js
   ULYDIA — Soft skills patch (CMS-driven, safe override)
   Source (Metier_pays_bloc):
   - js-bf-soft_skills (Rich Text)
   Behavior:
   - If empty -> keeps existing UI (does not hide / does not wipe)
   - If present -> replaces list items with parsed skills (max 10)
*/
(() => {
  if (window.__ULYDIA_SOFTSKILLS_PATCH1__) return;
  window.__ULYDIA_SOFTSKILLS_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier softskills PATCH1]", ...a);

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

  function findSoftSkillsCard(){
    const root = document.getElementById("ulydia-metier-root") || document;
    const headings = [...root.querySelectorAll("h2,h3,h4")];
    const h = headings.find(x => lower(x.textContent).includes("soft skills"));
    if (!h) return null;
    return h.closest(".card") || h.parentElement || null;
  }

  function parseRichTextToItems(html){
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html || "");
    const lis = [...tmp.querySelectorAll("li")].map(li => norm(li.textContent)).filter(Boolean);
    if (lis.length) return lis;

    const raw = String(tmp.innerText || tmp.textContent || "").replace(/\u00A0/g, " ");
    const parts = raw.split(/\n+/).map(norm).filter(Boolean);
    if (parts.length > 1) return parts;

    const text = norm(tmp.textContent);
    if (!text) return [];
    return text.split(/[•;]+/).map(norm).filter(Boolean);
  }

  function rebuildList(card, items){
    if (!items.length) return false;

    // Find row templates (rounded bordered items)
    const rows = [...card.querySelectorAll("div")].filter(d => (d.className || "").includes("rounded") && (d.className || "").includes("border"));
    const template = rows[0] || card.querySelector("div.rounded-lg, div.rounded-xl, div.border");
    if (!template) return false;

    const container = template.parentElement || card;
    if (!container) return false;

    // Remove all existing rows (but keep the first as template)
    rows.slice(1).forEach(r => { try { r.remove(); } catch(_){} });

    // Keep emoji from template if present
    const baseEmoji = (() => {
      const s = template.querySelector("span");
      const t = s ? norm(s.textContent) : "";
      return t && t.length <= 3 ? t : "✅";
    })();

    function setRow(rowEl, label, emoji){
      const span = rowEl.querySelector("span");
      if (span) span.textContent = emoji || baseEmoji;

      const candidates = [...rowEl.querySelectorAll("p,div,span")].filter(el => el !== span);
      candidates.sort((a,b)=> norm(b.textContent).length - norm(a.textContent).length);
      const target = candidates[0] || rowEl;
      if (target) target.textContent = label;
    }

    const max = Math.min(items.length, 10);
    setRow(template, items[0], baseEmoji);

    for (let i=1;i<max;i++){
      const clone = template.cloneNode(true);
      setRow(clone, items[i], baseEmoji);
      container.appendChild(clone);
    }
    return true;
  }

  async function boot(){
    for (let i=0;i<120;i++){
      if (findSoftSkillsCard()) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    const bloc = findBlocFor(ctx);
    const card = findSoftSkillsCard();

    log("ctx", ctx, "bloc", !!bloc, "card", !!card);
    if (!bloc || !card) return;

    const html = pickField(bloc, "js-bf-soft_skills");
    if (!norm(html)) return;

    const items = parseRichTextToItems(html);
    log("items", items);

    rebuildList(card, items);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();