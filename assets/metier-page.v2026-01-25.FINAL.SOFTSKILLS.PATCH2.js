/* metier-page.v2026-01-25.FINAL.SOFTSKILLS.PATCH2.js
   ULYDIA — Soft skills patch (CMS-driven, SAFE, robust bloc matching)
   Source: js-bf-soft_skills (Rich Text)
*/
(() => {
  if (window.__ULYDIA_SOFTSKILLS_PATCH2__) return;
  window.__ULYDIA_SOFTSKILLS_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier softskills PATCH2]", ...a);

  const norm = (s) => String(s || "").replace(/\u00A0/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
  const lower = (s) => norm(s).toLowerCase();

  function pickFirst(...vals){
    for (const v of vals){
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && norm(v) === "") continue;
      return v;
    }
    return undefined;
  }

  function slugify(s){
    return lower(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getFrom(obj, ...keys){
    for (const k of keys){
      const v = obj && obj[k];
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      return v;
    }
    return undefined;
  }

  function blocMatches(bloc, slug, iso){
    const b = bloc?.fieldData || bloc?.fields || bloc || {};

    const isoCand = pickFirst(
      getFrom(b, "country_code", "Country_code", "code_iso", "Code ISO", "iso", "ISO"),
      (Array.isArray(b.Pays) ? b.Pays[0]?.iso : b.Pays?.iso),
      (Array.isArray(b.pays) ? b.pays[0]?.iso : b.pays?.iso),
      b?.pays_ref?.iso
    );
    const bIso = String(isoCand || "").trim().toUpperCase();

    const refJob = getFrom(b, "job_slug", "Job_slug", "Job slug", "metier", "metier_lie", "métier lié", "metier lié", "job") || null;

    const refJobSlug =
      (typeof refJob === "string" ? refJob : null) ||
      refJob?.slug ||
      refJob?.fieldData?.slug ||
      refJob?.fields?.slug ||
      refJob?.fieldData?.Slug ||
      refJob?.fields?.Slug ||
      "";

    const directSlug = pickFirst(
      getFrom(b, "metier_slug", "metierSlug", "jobSlug", "slug"),
      getFrom(b, "Job_slug_slug", "job_slug_slug")
    );

    const bSlug = String(directSlug || refJobSlug || "").trim();
    const refJobName = refJob?.name || refJob?.fieldData?.name || refJob?.fields?.name || "";

    const okIso = !bIso || bIso === iso;
    const urlSlug = slugify(slug);
    const bSlugNorm = slugify(bSlug);
    const refNameNorm = slugify(refJobName || getFrom(b, "metier", "job_name", "name") || "");

    const okSlug =
      (!!bSlug && norm(bSlug) === norm(slug)) ||
      (!!bSlug && norm(bSlug).startsWith(norm(slug))) ||
      (!!refJobName && norm(refJobName).includes(norm(slug))) ||
      (!!bSlugNorm && bSlugNorm === urlSlug) ||
      (!!refNameNorm && refNameNorm === urlSlug);

    return okIso && okSlug;
  }

  function getCtx(){
    const url = new URL(location.href);
    const p = url.searchParams;
    const slug = String(p.get("metier") || p.get("slug") || "").trim();
    const iso = String(p.get("iso") || p.get("country") || "").trim().toUpperCase();
    return { slug, iso };
  }

  function getCmsBlocs(){
    const a = window.__ULYDIA_METIER_PAYS_BLOCS__ || null;
    return Array.isArray(a) ? a : [];
  }

  function findBloc(ctx){
    const cms = getCmsBlocs();
    if (!cms.length) return null;
    for (const it of cms){
      if (blocMatches(it, ctx.slug, ctx.iso)) return it;
    }
    return null;
  }

  function pickField(obj, key){
    const f = obj?.fieldData || obj?.fields || obj || {};
    const v = f[key];
    if (v != null && norm(v) !== "") return v;
    const k2 = key.replace(/-/g, "_");
    if (f[k2] != null && norm(f[k2]) !== "") return f[k2];
    return "";
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

    const rows = [...card.querySelectorAll("div")].filter(d => (d.className || "").includes("rounded") && (d.className || "").includes("border"));
    const template = rows[0] || card.querySelector("div.rounded-lg, div.rounded-xl, div.border");
    if (!template) return false;

    const container = template.parentElement || card;
    if (!container) return false;

    // remove all but first
    rows.slice(1).forEach(r => { try { r.remove(); } catch(_){} });

    const baseEmoji = (() => {
      const s = template.querySelector("span");
      const t = s ? norm(s.textContent) : "";
      return t && t.length <= 3 ? t : "✅";
    })();

    function setRow(rowEl, label){
      const span = rowEl.querySelector("span");
      if (span) span.textContent = baseEmoji;

      const candidates = [...rowEl.querySelectorAll("p,div,span")].filter(el => el !== span);
      candidates.sort((a,b)=> norm(b.textContent).length - norm(a.textContent).length);
      const target = candidates[0] || rowEl;
      if (target) target.textContent = label;
    }

    const max = Math.min(items.length, 10);
    setRow(template, items[0]);

    for (let i=1;i<max;i++){
      const clone = template.cloneNode(true);
      setRow(clone, items[i]);
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
    const bloc = findBloc(ctx);
    const card = findSoftSkillsCard();

    log("ctx", ctx, "blocFound", !!bloc, "cardFound", !!card);
    if (!bloc || !card) return;

    const html = pickField(bloc, "js-bf-soft_skills");
    if (!norm(html)) return;

    const items = parseRichTextToItems(html);
    log("cms soft skills items", items);

    rebuildList(card, items);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();