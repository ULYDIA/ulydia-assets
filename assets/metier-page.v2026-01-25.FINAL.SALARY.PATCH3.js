/* metier-page.v2026-01-25.FINAL.SALARY.PATCH2.js
   ULYDIA — Salary grid patch (CMS-driven, SAFE, robust bloc matching)
   Uses SAME matching logic as BASE (blocMatches).
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH2__) return;
  window.__ULYDIA_SALARY_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier salary PATCH2]", ...a);

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

  function currencySymbol(curr){
    const c = String(curr||"").trim().toUpperCase();
    if (!c) return "";
    if (c.includes("€") || c==="EUR") return "€";
    if (c.includes("$") || c==="USD") return "$";
    if (c==="GBP" || c.includes("£")) return "£";
    return c; // fallback (e.g., "CHF")
  }

  function parseNum(x){
    if (x==null) return null;
    const s = String(x).replace(/\s/g,"").replace(",",".");
    const m = s.match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  function fmtAmount(n){
    if (n==null) return "";
    // if it's like 35000 -> 35K ; 35500 -> 35.5K
    if (Math.abs(n) >= 1000){
      const k = n/1000;
      const oneDec = Math.round(k*10)/10;
      const s = (oneDec % 1 === 0) ? String(Math.round(oneDec)) : String(oneDec);
      return s + "K";
    }
    return String(Math.round(n));
  }

  function fmtRange(minV, maxV, curr){
    const sym = currencySymbol(curr);
    const a = parseNum(minV), b = parseNum(maxV);
    if (a==null || b==null) return "";
    return fmtAmount(a) + "–" + fmtAmount(b) + sym;
  }

  function fmtPercent(p){
    const s = String(p||"").trim();
    if (!s) return "";
    return s.includes("%") ? s : (s + "%");
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

    const anchor = [...card.querySelectorAll("*")].find(el => lower(el.textContent).includes("part variable"));
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
    const bloc = findBloc(ctx);
    const card = findSalaryCard();

    log("ctx", ctx, "blocFound", !!bloc, "cardFound", !!card);
    if (!bloc || !card) return;

    const curr = pickField(bloc, "js-chip-currency");

    const jmin = pickField(bloc, "js-sal-junior-min");
    const jmax = pickField(bloc, "js-sal-junior-max");
    const mmin = pickField(bloc, "js-sal-mid-min");
    const mmax = pickField(bloc, "js-sal-mid-max");
    const smin = pickField(bloc, "js-sal-senior-min");
    const smax = pickField(bloc, "js-sal-senior-max");
    const varp = pickField(bloc, "js-sal-variable-share");

    log("cms salary", { jmin,jmax,mmin,mmax,smin,smax,varp,curr });

    const jr = fmtRange(jmin, jmax, curr);
    const mr = fmtRange(mmin, mmax, curr);
    const sr = fmtRange(smin, smax, curr);

    if (jr) setRow(card, "Junior", jr);
    if (mr) setRow(card, "Confirm", mr);
    if (sr) setRow(card, "Senior", sr);
    if (varp) setVariable(card, fmtPercent(varp));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();