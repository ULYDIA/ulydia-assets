/* metier-page.v2026-01-25.FINAL.NAV.PATCH1.js
   ULYDIA — Fix "filters don't change metier" by navigating with querystring.
   Why: BASE boot reads iso/slug ONLY from URL (?iso=FR&slug=xxx). Your UI was only cosmetic.
   This patch:
   - Builds a {name->slug} map from #metiersData JSON (or window.__ULYDIA_METIERS__/__ULYDIA_METIERS__).
   - When user clicks an autocomplete suggestion OR presses Enter in the metier input:
       -> navigates to same pathname with updated ?iso=..&slug=..
   - When user changes country (filter-pays) and a slug is present:
       -> navigates to update iso (keeps slug)
   SAFE: if it can't resolve a slug, it does nothing.
*/
(() => {
  if (window.__ULYDIA_NAV_PATCH1__) return;
  window.__ULYDIA_NAV_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier NAV PATCH1]", ...a);

  const norm = (s) => String(s || "").replace(/\u00A0/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
  const lower = (s) => norm(s).toLowerCase();

  function slugify(s){
    return lower(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function readMetiersList(){
    // Priority: #metiersData (JSON) -> window.__ULYDIA_METIERS__ -> window.__ULYDIA_METIERS__
    const el = document.getElementById("metiersData");
    if (el) {
      try {
        const arr = JSON.parse(el.textContent || "[]");
        if (Array.isArray(arr) && arr.length) return arr;
      } catch(e){}
    }
    const a = window.__ULYDIA_METIERS__ || window.__ULYDIA_METIERS__ || null;
    return Array.isArray(a) ? a : [];
  }

  function buildNameToSlug(){
    const list = readMetiersList();
    const map = new Map(); // key: lower(name) -> slug
    list.forEach(it => {
      const f = it?.fieldData || it?.fields || it || {};
      const name = norm(f.Nom || f.nom || f.name || f.title || it.name || "");
      const slug = norm(it.slug || f.slug || f.Slug || "");
      if (!name || !slug) return;
      map.set(lower(name), slug);
      map.set(slugify(name), slug);
    });
    return map;
  }

  function getSelectedIso(){
    const sel = document.getElementById("filter-pays");
    const v = sel ? norm(sel.value) : "";
    if (v) return v.toUpperCase();
    // fallback from URL
    const p = new URL(location.href).searchParams;
    const iso = norm(p.get("iso") || p.get("country") || "");
    return (iso || "FR").toUpperCase();
  }

  function getCurrentSlugFromUrl(){
    const p = new URL(location.href).searchParams;
    return norm(p.get("slug") || p.get("metier") || "");
  }

  function goto(iso, slug){
    iso = norm(iso).toUpperCase();
    slug = norm(slug);
    if (!slug) return;
    const url = new URL(location.href);
    url.searchParams.set("iso", iso || "FR");
    url.searchParams.set("slug", slug);
    // Keep other params if needed, but remove legacy
    url.searchParams.delete("metier");
    url.searchParams.delete("country");
    if (url.toString() === location.href) return;
    log("navigate", { iso, slug, to: url.toString() });
    location.href = url.toString(); // full reload so BASE boot uses correct context
  }

  function resolveSlugFromInputValue(val){
    const nameToSlug = buildNameToSlug();
    const key1 = lower(val);
    const key2 = slugify(val);
    return nameToSlug.get(key1) || nameToSlug.get(key2) || "";
  }

  function wire(){
    const metierInput = document.getElementById("filter-metier");
    const paysSel = document.getElementById("filter-pays");
    if (!metierInput && !paysSel) return;

    // 1) Click suggestion items (from BASE autocomplete). They hold data-metier="<name>"
    document.addEventListener("click", (e) => {
      const el = e.target && e.target.closest ? e.target.closest(".suggestion-item") : null;
      if (!el) return;
      const name = norm(el.dataset?.metier || el.getAttribute("data-metier") || "");
      if (!name) return;
      const slug = resolveSlugFromInputValue(name);
      if (!slug) { log("no slug for suggestion", name); return; }
      goto(getSelectedIso(), slug);
    }, true);

    // 2) Enter in metier input
    if (metierInput) {
      metierInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const name = norm(metierInput.value);
        if (!name) return;
        const slug = resolveSlugFromInputValue(name) || (/[a-z0-9-]{3,}/i.test(name) ? name : "");
        if (!slug) { log("no slug on enter", name); return; }
        goto(getSelectedIso(), slug);
      });
    }

    // 3) Change country: if we already have a slug in URL, keep it and update iso
    if (paysSel) {
      paysSel.addEventListener("change", () => {
        const slug = getCurrentSlugFromUrl();
        if (!slug) return; // no metier selected yet
        goto(getSelectedIso(), slug);
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();