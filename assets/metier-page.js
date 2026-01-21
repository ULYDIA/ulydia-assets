/* metier-page.js — Ulydia (v10.3 CLEAN)
   Full-code “Fiche métier” page (shell Webflow)
   - Catalog (countries/sectors/metiers) from Cloudflare Pages (catalog.json)
   - Country default from URL if valid else /v1/geo
   - Sector filter + assisted search (datalist)
   - Loads job payload from Worker: /v1/metier-page?slug=...&iso=FR
   - Banners:
       sponsor => payload.meta.sponsor (logos + link)
       else    => catalog country banners (image_1 wide, image_2 square)
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V103__) return;
  window.__ULYDIA_METIER_PAGE_V103__ = true;

  // =========================
  // CONFIG
  // =========================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const CATALOG_URL  = "https://ulydia-assets.pages.dev/assets/catalog.json?v=5"; // bump when you update catalog
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;

  function log(...a){ if (DEBUG) console.log("[metier-page]", ...a); }
  function warn(...a){ console.warn("[metier-page]", ...a); }

  // =========================
  // ROOT
  // =========================
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  // =========================
  // Helpers
  // =========================
  function pickStr(v){ return (v == null) ? "" : String(v).trim(); }
  function upper2(v){ return pickStr(v).toUpperCase(); }
  function safeJSON(txt, fallback){
    try { return JSON.parse(txt); } catch(e){ return fallback; }
  }
  function qs(name){ return new URLSearchParams(location.search).get(name); }
  function setURLParams(obj){
    // keep URL clean: only non-empty, sector only if not __ALL__
    const p = new URLSearchParams(location.search);

    const set = (k,v) => {
      const s = pickStr(v);
      if (!s) p.delete(k);
      else p.set(k, s);
    };

    set("country", obj.country);
    set("slug", obj.slug);
    set("metier", obj.metier);

    if (obj.sector && obj.sector !== "__ALL__") set("sector", obj.sector);
    else p.delete("sector");

    if (obj.q && pickStr(obj.q).length) set("q", obj.q);
    else p.delete("q");

    const next = location.pathname + (p.toString() ? "?" + p.toString() : "");
    history.replaceState({}, "", next);
  }

  function el(tag, attrs={}, html=""){
    const n = document.createElement(tag);
    Object.keys(attrs||{}).forEach(k=>{
      if (k === "class") n.className = attrs[k];
      else if (k === "style") n.setAttribute("style", attrs[k]);
      else if (k.startsWith("data-")) n.setAttribute(k, attrs[k]);
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (html) n.innerHTML = html;
    return n;
  }

  function getISOFromUrl(){
    const raw = qs("country") || qs("iso") || "";
    const v = upper2(raw);
    if (!v) return "";
    if (v.length === 2) return v;
    return v.slice(0,2);
  }

  async function fetchJSON(url, init){
    const res = await fetch(url, init || {});
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(`HTTP ${res.status} @ ${url}: ${txt || res.statusText}`);
    }
    return await res.json();
  }

  async function detectGeoISO(){
    try {
      const j = await fetchJSON(`${WORKER_URL}/v1/geo`);
      return upper2(j?.iso || "FR") || "FR";
    } catch(e){
      warn("geo failed", e);
      return "FR";
    }
  }

  function countryISO(c){
    return upper2(c?.iso || c?.code_iso || c?.ISO || c?.countryCode || "");
  }

  function pickUrl(v){
    if (!v) return "";
    let s = "";
    if (typeof v === "string") s = v.trim();
    else if (typeof v === "object" && v.url) s = String(v.url).trim();

    if (!s) return "";
    if (s.includes("...")) return "";           // 🔒 bloque placeholders
    if (!/^https?:\/\//i.test(s)) return "";    // 🔒 bloque relatif
    return s;
  }


  function pickCountryBanners(countryMeta){
    const bannersObj = countryMeta?.banners || {};
    const wide = pickUrl(bannersObj?.image_1);
    const square = pickUrl(bannersObj?.image_2);
    return {
      mode: "fallback",
      wide,
      square,
      click: "#",
      texte: pickStr(bannersObj?.texte || ""),
      cta: pickStr(bannersObj?.cta || "")
    };
  }

  function pickSponsorBanners(meta){
    const sp = meta?.sponsor || meta?.meta?.sponsor || meta?.sponsoring || null;
    if (!sp) return null;

    const wide = pickUrl(sp.logo_2 || sp.logo_wide || sp.wide || sp.bannerWide || sp.image_2);
    const square = pickUrl(sp.logo_1 || sp.logo_square || sp.square || sp.bannerSquare || sp.image_1);
    const link = pickStr(sp.link || sp.sponsor_link || sp.url || "");
    const name = pickStr(sp.name || sp.sponsor_name || "");

    if (!wide && !square) return null;

    return {
      mode: "sponsor",
      wide,
      square,
      click: link || "#",
      name
    };
  }

  // =========================
  // CSS (light, matches your global brand)
  // =========================
  function injectCSS(){
    if (document.getElementById("ulydia-metier-css")) return;
    const css = `
:root{
  --u-red:#c00102;
  --u-ink:#0b1220;
  --u-muted:#6b7280;
  --u-border:#e6e8ee;
  --u-card:#ffffff;
  --u-bg:#ffffff;
  --u-shadow:0 10px 30px rgba(11,18,32,.08);
  --u-radius:20px;
  --u-radius-sm:14px;
  --u-font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
}
#ulydia-metier-root{ font-family:var(--u-font); color:var(--u-ink); }
.u-wrap{ max-width: 1100px; margin: 30px auto; padding: 0 18px 60px; }
.u-hero{
  background: radial-gradient(1100px 500px at 15% 0%, rgba(192,1,2,.12), transparent 55%),
              radial-gradient(900px 450px at 90% 10%, rgba(11,18,32,.10), transparent 55%);
  border:1px solid var(--u-border);
  border-radius: var(--u-radius);
  box-shadow: var(--u-shadow);
  padding: 22px 22px;
  margin-bottom: 14px;
}
.u-hero h1{ margin:0; font-size: 28px; letter-spacing:-.02em; }
.u-hero p{ margin:6px 0 0; color:var(--u-muted); }
.u-card{
  background: var(--u-card);
  border:1px solid var(--u-border);
  border-radius: var(--u-radius);
  box-shadow: var(--u-shadow);
  overflow:hidden;
}
.u-card-h{ padding:16px 18px; border-bottom:1px solid var(--u-border); display:flex; align-items:center; justify-content:space-between; }
.u-card-h .t{ font-weight: 700; }
.u-row{ display:flex; gap:14px; flex-wrap:wrap; padding:16px 18px; align-items:flex-end; }
.u-field{ flex:1 1 240px; min-width:240px; }
.u-label{ font-size: 13px; color: var(--u-muted); margin:0 0 6px; }
.u-select,.u-input{
  width:100%;
  border:1px solid var(--u-border);
  border-radius: 12px;
  padding: 12px 12px;
  outline:none;
  background:#fff;
  font-size: 15px;
}
.u-select:focus,.u-input:focus{ border-color: rgba(192,1,2,.55); box-shadow: 0 0 0 4px rgba(192,1,2,.10); }
.u-btn{
  border:0;
  background: var(--u-red);
  color:#fff;
  border-radius: 12px;
  padding: 12px 18px;
  font-weight: 700;
  cursor:pointer;
  min-width:120px;
}
.u-btn:active{ transform: translateY(1px); }
.u-meta{ padding: 0 18px 14px; color: var(--u-muted); font-size: 13px; }

.u-content{ margin-top: 16px; }
.u-title{ font-size: 34px; color: var(--u-red); margin: 0 0 6px; letter-spacing:-.02em; }
.u-sub{ color: var(--u-muted); font-size: 14px; margin: 0 0 14px; }

.u-banners{
  border:1px solid var(--u-border);
  border-radius: var(--u-radius);
  box-shadow: var(--u-shadow);
  background:#fff;
  padding: 14px;
  margin: 12px 0 18px;
}
.u-bgrid{ display:flex; gap:14px; align-items:stretch; }
.u-bwide{ flex: 1 1 auto; min-height: 140px; border-radius: var(--u-radius-sm); overflow:hidden; border:1px solid var(--u-border); background:#f7f8fb; }
.u-bsquare{ width: 240px; min-height: 140px; border-radius: var(--u-radius-sm); overflow:hidden; border:1px solid var(--u-border); background:#f7f8fb; }
.u-bwide img,.u-bsquare img{ width:100%; height:100%; object-fit:cover; display:block; }
.u-bnote{ margin-top:10px; color: var(--u-muted); font-size: 13px; display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
.u-pill{ display:inline-flex; gap:8px; align-items:center; border:1px solid var(--u-border); border-radius:999px; padding: 6px 10px; background:#fff; }
.u-pill b{ color: var(--u-ink); }

.u-section{
  border:1px solid var(--u-border);
  border-radius: var(--u-radius);
  box-shadow: var(--u-shadow);
  background:#fff;
  padding: 16px 18px;
  margin: 12px 0;
}
.u-section h3{ margin:0 0 10px; font-size: 18px; }
.u-empty{
  background: rgba(192,1,2,.06);
  border:1px solid rgba(192,1,2,.25);
  color:#5a1314;
  border-radius: 14px;
  padding: 14px 16px;
  margin: 12px 18px 16px;
}
.u-empty b{ display:block; margin-bottom:6px; }
`;
    const style = document.createElement("style");
    style.id = "ulydia-metier-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // =========================
  // UI shell
  // =========================
  function renderShell(){
    ROOT.innerHTML = "";
    const wrap = el("div", { class:"u-wrap" });

    const hero = el("div", { class:"u-hero" });
    hero.appendChild(el("h1", { text:"Fiche métier" }));
    hero.appendChild(el("p", { text:"Choisis un pays, un secteur et un métier — puis charge la fiche dans le contexte du pays (langue & bannières incluses)." }));
    wrap.appendChild(hero);

    const card = el("div", { class:"u-card" });
    card.appendChild(el("div", { class:"u-card-h" }, `<div class="t">Recherche</div><div class="u-pill" data-el="catalogStat"><b>catalog</b> —</div>`));

    const row = el("div", { class:"u-row" });
    row.appendChild(el("div", { class:"u-field" }, `
      <div class="u-label">Pays</div>
      <select class="u-select" data-el="country"></select>
    `));
    row.appendChild(el("div", { class:"u-field" }, `
      <div class="u-label">Secteur d’activité</div>
      <select class="u-select" data-el="sector"></select>
    `));
    row.appendChild(el("div", { class:"u-field" }, `
      <div class="u-label">Rechercher un métier</div>
      <input class="u-input" data-el="q" placeholder="Tape pour chercher (ex: directeur financier)" list="ulydia-metier-datalist"/>
      <datalist id="ulydia-metier-datalist"></datalist>
    `));
    row.appendChild(el("button", { class:"u-btn", type:"button", "data-el":"loadBtn" }, "Charger"));
    card.appendChild(row);
    card.appendChild(el("div", { class:"u-meta", "data-el":"status", text:"Prêt." }));

    wrap.appendChild(card);

    const content = el("div", { class:"u-content" });
    content.appendChild(el("div", { class:"u-title", "data-el":"name", text:"" }));
    content.appendChild(el("div", { class:"u-sub", "data-el":"sub", text:"" }));

    const banners = el("div", { class:"u-banners", "data-el":"banners" });
    banners.appendChild(el("div", { class:"u-bgrid" }, `
      <a class="u-bwide" data-el="bannerWide" target="_blank" rel="noopener"><img data-el="bannerWideImg" alt=""></a>
      <a class="u-bsquare" data-el="bannerSquare" target="_blank" rel="noopener"><img data-el="bannerSquareImg" alt=""></a>
    `));
    banners.appendChild(el("div", { class:"u-bnote", "data-el":"bannerNote" }, `<span class="u-pill">Pays: <b data-el="iso">—</b> • Langue: <b data-el="lang">—</b> • Bannières: <b data-el="bmode">—</b></span>`));
    content.appendChild(banners);

    content.appendChild(el("div", { class:"u-section", "data-el":"descSec" }, `<h3>Description</h3><div data-el="desc"></div>`));
    content.appendChild(el("div", { class:"u-section", "data-el":"missionsSec" }, `<h3>Missions</h3><div data-el="missions"></div>`));
    content.appendChild(el("div", { class:"u-section", "data-el":"skillsSec" }, `<h3>Compétences</h3><div data-el="skills"></div>`));

    wrap.appendChild(content);

    ROOT.appendChild(wrap);
  }

  function setStatus(msg){
    const n = ROOT.querySelector('[data-el="status"]');
    if (n) n.textContent = msg;
  }

  // =========================
  // Catalog
  // =========================
  async function loadCatalog(){
    const j = await fetchJSON(CATALOG_URL, { cache:"no-store" });
    const countries = Array.isArray(j?.countries) ? j.countries : [];
    const sectors   = Array.isArray(j?.sectors) ? j.sectors : [];
    const metiers   = Array.isArray(j?.metiers) ? j.metiers : [];
    return { countries, sectors, metiers };
  }

  function fillCountrySelect(sel, countries){
    sel.innerHTML = "";
    sel.appendChild(el("option", { value:"", text:"Choisir un pays..." }));
    countries
      .slice()
      .sort((a,b)=> pickStr(a.label).localeCompare(pickStr(b.label)))
      .forEach(c=>{
        const iso = countryISO(c);
        const label = pickStr(c.label || iso);
        if (!iso) return;
        sel.appendChild(el("option", { value: iso, text: `${label} (${iso})` }));
      });
  }

  function fillSectorSelect(sel, sectors){
    sel.innerHTML = "";
    sel.appendChild(el("option", { value:"__ALL__", text:"Tous les secteurs" }));
    sectors
      .slice()
      .sort((a,b)=> pickStr(a.label).localeCompare(pickStr(b.label)))
      .forEach(s=>{
        const slug = pickStr(s.slug || s.id || s.value || "");
        const label = pickStr(s.label || slug);
        if (!slug) return;
        sel.appendChild(el("option", { value: slug, text: label }));
      });
  }

  function buildDatalist(dl, metiers, sectorSlug){
    dl.innerHTML = "";
    const list = (sectorSlug && sectorSlug !== "__ALL__")
      ? metiers.filter(m => {
          const ms = pickStr(m.sector || m.sector_slug || m.secteur || m.secteur_slug || "");
          return ms === sectorSlug;
        })
      : metiers;

    list
      .slice()
      .sort((a,b)=> pickStr(a.label || a.name || a.slug).localeCompare(pickStr(b.label || b.name || b.slug)))
      .slice(0, 500)
      .forEach(m=>{
        const slug = pickStr(m.slug || "");
        const label = pickStr(m.label || m.name || slug);
        if (!slug) return;
        const opt = document.createElement("option");
        opt.value = label;
        opt.setAttribute("data-slug", slug);
        dl.appendChild(opt);
      });
  }

  function findMetierByQuery(metiers, q){
    const qq = pickStr(q).toLowerCase();
    if (!qq) return null;

    // try exact label match
    let hit = metiers.find(m => pickStr(m.label || m.name || "").toLowerCase() === qq);
    if (hit) return hit;

    // try exact slug match
    hit = metiers.find(m => pickStr(m.slug || "").toLowerCase() === qq);
    if (hit) return hit;

    // try startswith label
    hit = metiers.find(m => pickStr(m.label || m.name || "").toLowerCase().startsWith(qq));
    if (hit) return hit;

    return null;
  }

  // =========================
  // Worker call
  // =========================
  async function fetchMetierPage(slug, iso){
    const u = `${WORKER_URL}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
    return await fetchJSON(u, { cache:"no-store" });
  }

  function setBannerAnchor(a, img, url, click){
    if (!a || !img) return;
    const u = pickUrl(url);
    if (!u) {
      a.style.display = "none";
      return;
    }
    a.style.display = "";
    img.src = u;
    img.alt = "Bannière";
    a.href = pickStr(click || "#") || "#";
    if (a.href === "#") a.removeAttribute("target");
    else a.setAttribute("target","_blank");
  }

  function renderContent(payload, selectedCountryFromCatalog){
    const metier = payload?.metier || {};
    const name = pickStr(metier?.name || metier?.title || metier?.label || metier?.slug || "");
    ROOT.querySelector('[data-el="name"]').textContent = name || "—";

    // Prefer catalog for fallback banners
    const countryMeta = selectedCountryFromCatalog || payload?.pays || {};
    const iso = upper2(countryMeta?.iso || payload?.iso || "");
    const lang = pickStr(
      payload?.pays?.langue_finale ||
      selectedCountryFromCatalog?.langue_finale ||
      payload?.lang ||
      ""
    );

    // Text sections
    const desc = pickStr(metier?.description || metier?.desc || "");
    const missions = pickStr(metier?.missions || "");
    const skills = pickStr(metier?.competences || metier?.skills || "");

    ROOT.querySelector('[data-el="desc"]').innerHTML = desc || "<div class='u-empty'><b>Champ manquant</b>Description non disponible.</div>";
    ROOT.querySelector('[data-el="missions"]').innerHTML = missions || "<div class='u-empty'><b>Champ manquant</b>Missions non disponibles.</div>";
    ROOT.querySelector('[data-el="skills"]').innerHTML = skills || "<div class='u-empty'><b>Champ manquant</b>Compétences non disponibles.</div>";

    // Banners
    const sponsorPick = pickSponsorBanners(payload?.meta || payload);
    const fallbackPick = pickCountryBanners(countryMeta);

    const pick = sponsorPick || fallbackPick;
    const bWideA = ROOT.querySelector('[data-el="bannerWide"]');
    const bWideI = ROOT.querySelector('[data-el="bannerWideImg"]');
    const bSqA   = ROOT.querySelector('[data-el="bannerSquare"]');
    const bSqI   = ROOT.querySelector('[data-el="bannerSquareImg"]');

    setBannerAnchor(bWideA, bWideI, pick?.wide, pick?.click);
    setBannerAnchor(bSqA, bSqI, pick?.square, pick?.click);

    ROOT.querySelector('[data-el="iso"]').textContent = iso || "—";
    ROOT.querySelector('[data-el="lang"]').textContent = lang || "—";
    ROOT.querySelector('[data-el="bmode"]').textContent = (pick?.mode === "sponsor") ? "Sponsor" : "Attente (pays)";
  }

  // =========================
  // Boot
  // =========================
  async function main(){
    injectCSS();
    renderShell();

    const countrySel = ROOT.querySelector('[data-el="country"]');
    const sectorSel  = ROOT.querySelector('[data-el="sector"]');
    const qInput     = ROOT.querySelector('[data-el="q"]');
    const dl         = document.getElementById("ulydia-metier-datalist");
    const loadBtn    = ROOT.querySelector('[data-el="loadBtn"]');
    const stat       = ROOT.querySelector('[data-el="catalogStat"]');

    setStatus("Chargement du catalogue…");

    let catalog = { countries:[], sectors:[], metiers:[] };
    try {
      catalog = await loadCatalog();
      stat.innerHTML = `<b>catalog</b> ${catalog.countries.length} pays • ${catalog.sectors.length} secteurs • ${catalog.metiers.length} métiers`;
    } catch(e){
      warn("catalog failed", e);
      stat.innerHTML = `<b>catalog</b> indisponible`;
      setStatus("Erreur: catalog indisponible.");
    }

    fillCountrySelect(countrySel, catalog.countries);
    fillSectorSelect(sectorSel, catalog.sectors);

    // default ISO: URL if valid, else GEO
    let iso = getISOFromUrl();
    if (iso && !catalog.countries.some(c => countryISO(c) === iso)) iso = "";
    if (!iso) iso = await detectGeoISO();
    if (iso && catalog.countries.some(c => countryISO(c) === iso)) countrySel.value = iso;

    // sector default
    const urlSector = pickStr(qs("sector") || "__ALL__") || "__ALL__";
    if ([...sectorSel.options].some(o => o.value === urlSector)) sectorSel.value = urlSector;

    // query default
    const urlQ = pickStr(qs("q") || "");
    if (urlQ) qInput.value = urlQ;

    buildDatalist(dl, catalog.metiers, sectorSel.value);

    sectorSel.addEventListener("change", () => {
      buildDatalist(dl, catalog.metiers, sectorSel.value);
      // keep URL clean; don't force reload
      setURLParams({
        country: countrySel.value,
        sector: sectorSel.value,
        q: qInput.value,
        slug: qs("slug") || "",
        metier: qs("metier") || ""
      });
    });

    countrySel.addEventListener("change", () => {
      setURLParams({
        country: countrySel.value,
        sector: sectorSel.value,
        q: qInput.value,
        slug: qs("slug") || "",
        metier: qs("metier") || ""
      });
    });

    qInput.addEventListener("input", () => {
      setURLParams({
        country: countrySel.value,
        sector: sectorSel.value,
        q: qInput.value,
        slug: qs("slug") || "",
        metier: qs("metier") || ""
      });
    });

    async function doLoad(){
      const isoSel = upper2(countrySel.value || "");
      if (!isoSel) {
        setStatus("Choisis un pays.");
        return;
      }

      const q = pickStr(qInput.value || "");
      let metierHit = findMetierByQuery(catalog.metiers, q);

      // If URL slug/metier exists and q is empty, use it
      let slug = pickStr(qs("slug") || qs("metier") || "");
      if (!metierHit && q && !slug) {
        // try to find by label contains
        metierHit = catalog.metiers.find(m => pickStr(m.label||m.name||"").toLowerCase().includes(q.toLowerCase()));
      }

      if (!slug && metierHit) slug = pickStr(metierHit.slug || "");

      if (!slug) {
        setStatus("Métier manquant — choisis un métier dans la liste (saisie assistée).");
        return;
      }

      // selected country meta from catalog for fallback banners
      const selectedCountry = catalog.countries.find(c => countryISO(c) === isoSel) || null;

      setURLParams({
        country: isoSel,
        sector: sectorSel.value,
        q,
        slug,
        metier: slug
      });

      setStatus("Chargement de la fiche…");
      try {
        const payload = await fetchMetierPage(slug, isoSel);
        log("payload", payload);
        renderContent(payload, selectedCountry);
        setStatus("OK.");
      } catch(e){
        warn("worker error", e);
        const msg = pickStr(e?.message || e);
        setStatus("Erreur.");
        // show error in Description
        ROOT.querySelector('[data-el="desc"]').innerHTML = `<div class="u-empty"><b>Erreur Worker</b>${msg}</div>`;
        ROOT.querySelector('[data-el="missions"]').innerHTML = "";
        ROOT.querySelector('[data-el="skills"]').innerHTML = "";
        // hide banners
        const bWideA = ROOT.querySelector('[data-el="bannerWide"]');
        const bSqA   = ROOT.querySelector('[data-el="bannerSquare"]');
        if (bWideA) bWideA.style.display = "none";
        if (bSqA) bSqA.style.display = "none";
      }
    }

    loadBtn.addEventListener("click", doLoad);

    // auto-load if URL contains slug/metier
    const autoSlug = pickStr(qs("slug") || qs("metier") || "");
    if (autoSlug) {
      // set q input to nice label if possible
      const m = catalog.metiers.find(x => pickStr(x.slug||"") === autoSlug);
      if (m && !qInput.value) qInput.value = pickStr(m.label || m.name || autoSlug);
      await doLoad();
    } else {
      setStatus("Prêt.");
    }
  }

  main().catch((e) => {
    console.error("[metier-page] fatal", e);
  });
})();
