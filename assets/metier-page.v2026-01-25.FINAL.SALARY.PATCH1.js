/* metier-page.v2026-01-25.FINAL.SALARY.PATCH1.js
   ULYDIA — Salary grid patch (CMS-driven, safe override)
   Source (Metier_pays_bloc fields):
   - js-sal-junior-min / js-sal-junior-max (Text)
   - js-sal-mid-min    / js-sal-mid-max    (Text)
   - js-sal-senior-min / js-sal-senior-max (Text)
   - js-sal-variable-share (Text)
   - js-chip-currency (Text, optional) -> used to append currency if ranges have no symbol
   Behavior:
   - If a field is empty, keep the existing UI value (does not hide / does not wipe)
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH1__) return;
  window.__ULYDIA_SALARY_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier salary PATCH1]", ...a);

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

  function findSalaryCard(){
    const root = document.getElementById("ulydia-metier-root") || document;
    const headings = [...root.querySelectorAll("h2,h3,h4")];
    const h = headings.find(x => lower(x.textContent).includes("grille salariale"));
    if (!h) return null;
    return h.closest(".card") || h.parentElement || null;
  }

  function appendCurrencyIfMissing(s, curr){
    const v = norm(s);
    if (!v) return "";
    if (/[€$£¥₹₩₽₺₫₴₦₱₲₵₡₭₸₮₠₢₣]/.test(v)) return v;
    if (/\b(eur|usd|gbp|chf|cad|aud|jpy|cny)\b/i.test(v)) return v;
    if (/%/.test(v)) return v;
    const c = norm(curr);
    if (!c) return v;
    const m = c.match(/[€$£¥₹₩₽₺₫₴₦₱₲₵₡₭₸₮₠₢₣]/);
    const sym = m ? m[0] : "";
    return sym ? (v + sym) : (v + " " + c);
  }

  function setRow(card, label, rangeText){
    const v = norm(rangeText);
    if (!v) return false;

    const rows = [...card.querySelectorAll("div")].filter(d => lower(d.textContent || "").includes(lower(label)));
    rows.sort((a,b)=> (a.textContent||"").length - (b.textContent||"").length);
    const row = rows[0];
    if (!row) return false;

    const candidates = [...row.querySelectorAll("p,div,span")].filter(el => {
      const t = norm(el.textContent);
      return t && (/\d/.test(t)) && t.length <= 24;
    });
    candidates.sort((a,b)=> {
      const aw = a.classList.contains("font-bold") ? 0 : 1;
      const bw = b.classList.contains("font-bold") ? 0 : 1;
      return aw - bw || (norm(a.textContent).length - norm(b.textContent).length);
    });
    const target = candidates[0];
    if (!target) return false;

    target.textContent = v;
    return true;
  }

  function setVariable(card, valueText){
    const v = norm(valueText);
    if (!v) return false;

    const tnodes = [...card.querySelectorAll("*")].filter(el => lower(el.textContent).includes("part variable"));
    const anchor = tnodes[0];
    if (!anchor) return false;

    const wrap = anchor.closest("div") || anchor.parentElement;
    if (!wrap) return false;

    const cand = [...wrap.querySelectorAll("p,span,div")].filter(el => {
      const t = norm(el.textContent);
      return t && (t.includes("%") || t.length <= 10) && /\d/.test(t);
    });
    cand.sort((a,b)=> norm(a.textContent).length - norm(b.textContent).length);
    const target = cand[0];
    if (!target) return false;

    target.textContent = v;
    return true;
  }

  async function boot(){
    for (let i=0;i<120;i++){
      if (findSalaryCard()) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    const bloc = findBlocFor(ctx);
    const card = findSalaryCard();

    log("ctx", ctx, "bloc", !!bloc, "card", !!card);
    if (!bloc || !card) return;

    const curr = pickField(bloc, "js-chip-currency");

    const jmin = pickField(bloc, "js-sal-junior-min");
    const jmax = pickField(bloc, "js-sal-junior-max");
    const mmin = pickField(bloc, "js-sal-mid-min");
    const mmax = pickField(bloc, "js-sal-mid-max");
    const smin = pickField(bloc, "js-sal-senior-min");
    const smax = pickField(bloc, "js-sal-senior-max");
    const varp = pickField(bloc, "js-sal-variable-share");

    const jr = (jmin && jmax) ? `${jmin}-${jmax}` : "";
    const mr = (mmin && mmax) ? `${mmin}-${mmax}` : "";
    const sr = (smin && smax) ? `${smin}-${smax}` : "";

    if (jr) setRow(card, "Junior", appendCurrencyIfMissing(jr, curr));
    if (mr) setRow(card, "Confirm", appendCurrencyIfMissing(mr, curr));
    if (sr) setRow(card, "Senior", appendCurrencyIfMissing(sr, curr));
    if (varp) setVariable(card, appendCurrencyIfMissing(varp, curr));

    if (ctx.iso){
      const h = [...card.querySelectorAll("h2,h3,h4")].find(x => lower(x.textContent).includes("grille salariale"));
      if (h && !h.textContent.includes(`(${ctx.iso})`)){
        if (/\([A-Z]{2}\)\s*$/.test(h.textContent.trim())) h.textContent = h.textContent.replace(/\([A-Z]{2}\)\s*$/, `(${ctx.iso})`);
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();