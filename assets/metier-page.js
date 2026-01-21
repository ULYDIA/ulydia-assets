/* metier-page.js — Ulydia (V8.0)
   ✅ Design aligné avec propal1-fiche metier.html
   ✅ Support de tous les pays (249 pays)
   ✅ Saisie assistée métiers
   ✅ Filtre secteur avec "Tous les métiers"
   ✅ Bannières d'attente si pas sponsorisé
   ✅ Langue correcte (lang_finale)
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V80__) return;
  window.__ULYDIA_METIER_PAGE_V80__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier-page]", ...a); };

  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  const WORKER_URL = window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const IPINFO_TOKEN = window.ULYDIA_IPINFO_TOKEN || "941b787cc13473";
  const SPONSOR_PATH = "/sponsor";
  
  const COUNTRIES_SCRIPT_IDS = ["countriesData", "countriesData2", "countriesData3"];
  const SECTORS_SCRIPT_IDS = ["sectorsData", "sectorsData2", "sectorsData3"];
  const METIERS_SCRIPT_IDS = ["metiersData", "metiersData2", "metiersData3"];
  const EP_METIER_PAGE = "/v1/metier-page";

  const safeText = (v) => (v == null ? "" : String(v));
  const isUrl = (s) => /^https?:\/\/.+/i.test(s || "");
  
  const firstUrlInAny = (v) => {
    if (!v) return "";
    if (typeof v === "string") {
      const s = v.trim();
      if (isUrl(s)) return s;
      const m = s.match(/https?:\/\/[^\s"'<>]+/i);
      return m ? m[0] : "";
    }
    if (Array.isArray(v)) {
      for (const it of v) {
        const u = firstUrlInAny(it);
        if (u) return u;
      }
    }
    if (typeof v === "object") {
      const direct = firstUrlInAny(v.url || v.src || v.href);
      if (direct) return direct;
      for (const k of Object.keys(v)) {
        const u = firstUrlInAny(v[k]);
        if (u) return u;
      }
    }
    return "";
  };

  const fetchJSON = async (url, opts={}) => {
    const res = await fetch(url, opts);
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch {}
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return data;
  };

  const readJSONFromScriptTags = (ids) => {
    const out = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      try {
        const parsed = JSON.parse((el.textContent || "").trim());
        if (Array.isArray(parsed)) out.push(...parsed);
        else if (parsed?.items) out.push(...parsed.items);
        else out.push(parsed);
      } catch {}
    }
    return out;
  };

  function guessISOFromObject(obj){
    if (!obj) return "";
    const fields = [obj.iso, obj.code, obj.alpha2, obj.ISO, obj.iso2];
    for (const v of fields) {
      const s = safeText(v).trim();
      if (/^[a-z]{2}$/i.test(s)) return s.toUpperCase();
    }
    return "";
  }

  function normCountry(c){
    if (!c) return null;
    const iso = guessISOFromObject(c);
    if (!iso) return null;
    
    const name = safeText(c.name || c.nom || c.pays || iso).trim();
    const lang = safeText(c.langue_finale || c.lang_finale || c.langue || "").trim().toLowerCase();
    
    const bannieres = c.bannieres_attentes || c.bannieres_attente || {};
    const attente_wide = firstUrlInAny(bannieres.banniere_1 || bannieres.wide);
    const attente_square = firstUrlInAny(bannieres.banniere_2 || bannieres.square);
    
    return { iso, name, lang, attente_wide, attente_square, raw: c };
  }

  function normSector(s){
    if (!s) return null;
    const id = safeText(s.slug || s.id || "").trim();
    const name = safeText(s.nom || s.name || id).trim();
    return { id, name };
  }

  function normMetier(m){
    if (!m) return null;
    const slug = safeText(m.slug || m.Slug || "").trim();
    const name = safeText(m.nom || m.name || slug).trim();
    const secteur = safeText(m.secteur || m.secteur_activite || "").trim();
    return { slug, name, secteur, fields: m };
  }

  const escapeHtml = (s) => safeText(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function ensureTailwind(){
    if (document.querySelector('script[data-ul-tailwind="1"]')) return;
    const s = document.createElement("script");
    s.src = "https://cdn.tailwindcss.com";
    s.async = true;
    s.setAttribute("data-ul-tailwind", "1");
    document.head.appendChild(s);
  }

  function injectCSS(){
    if (document.getElementById("ul-metier-css")) return;
    const st = document.createElement("style");
    st.id = "ul-metier-css";
    st.textContent = `
      :root {
        --primary: #6366f1; --text: #0f172a; --muted: #64748b;
        --border: #e2e8f0; --bg: #ffffff; --card: #f8fafc;
        --radius-lg: 16px; --shadow-card: 0 4px 20px rgba(0,0,0,.08);
      }
      body { font-family: 'Outfit', sans-serif; }
      .card { background: var(--card); border-radius: var(--radius-lg); 
        box-shadow: var(--shadow-card); border: 1px solid var(--border); 
        padding: 24px; transition: all 0.3s ease; }
      .card:hover { box-shadow: 0 8px 30px rgba(0,0,0,.12); transform: translateY(-2px); }
      .card-header { padding: 16px 20px; border-radius: 12px 12px 0 0; margin: -24px -24px 20px -24px; }
      .section-title { font-weight: 700; font-size: 17px; color: var(--text); display: flex; align-items: center; gap: 10px; }
      .sponsor-banner-wide { width: 680px; height: 120px; max-width: 100%; 
        border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: transform 0.3s; }
      .sponsor-banner-wide:hover { transform: scale(1.02); }
      .sponsor-logo-square { width: 300px; height: 300px; max-width: 100%; 
        border-radius: var(--radius-lg); background: white; display: flex; 
        align-items: center; justify-content: center; padding: 24px; 
        box-shadow: var(--shadow-card); border: 1px solid var(--border); }
      .badge-primary { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); 
        color: #6366f1; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; }
      .rich-content { color: var(--text); line-height: 1.7; }
      .rich-content li { margin: 8px 0; padding-left: 24px; position: relative; }
      .rich-content li:before { content: "→"; position: absolute; left: 0; color: var(--primary); font-weight: 700; }
      .suggestion-item { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border); }
      .suggestion-item:hover { background: rgba(99,102,241,0.05); }
      select:focus, input:focus { border-color: var(--primary) !important; 
        box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; outline: none; }
    `;
    document.head.appendChild(st);
  }

  function renderShell(){ /* voir continuation */ }

  async function detectVisitorISO(){
    if (window.__VISITOR_ISO__) return window.__VISITOR_ISO__;
    try{
      const data = await fetchJSON(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
      const iso = safeText(data?.country || "").trim().toUpperCase();
      if (iso) { window.__VISITOR_ISO__ = iso; return iso; }
    }catch{}
    window.__VISITOR_ISO__ = "FR";
    return "FR";
  }

  async function fetchMetierDetail({ slug, iso }){
    const url = new URL(WORKER_URL + EP_METIER_PAGE);
    url.searchParams.set("slug", slug);
    url.searchParams.set("iso", iso);
    return await fetchJSON(url.toString(), {
      headers: { "x-ulydia-proxy-secret": PROXY_SECRET }
    });
  }

  let countries = [], sectors = [], metiers = [], metiersBySector = new Map();

  async function main(){
    ensureTailwind();
    injectCSS();
    renderShell();

    countries = readJSONFromScriptTags(COUNTRIES_SCRIPT_IDS).map(normCountry).filter(Boolean);
    sectors = readJSONFromScriptTags(SECTORS_SCRIPT_IDS).map(normSector).filter(Boolean);
    metiers = readJSONFromScriptTags(METIERS_SCRIPT_IDS).map(normMetier).filter(Boolean);

    for (const m of metiers) {
      if (!m.secteur) continue;
      if (!metiersBySector.has(m.secteur)) metiersBySector.set(m.secteur, []);
      metiersBySector.get(m.secteur).push(m);
    }

    const elCountry = document.getElementById("filter-pays");
    const elSector = document.getElementById("filter-secteur");
    const elJob = document.getElementById("filter-metier");
    const elSuggest = document.getElementById("metier-suggestions");
    const elReset = document.getElementById("reset-filters");
    const elCount = document.getElementById("result-count");

    const url = new URL(location.href);
    const urlCountry = safeText(url.searchParams.get("country") || "").trim().toUpperCase();
    const urlMetier = safeText(url.searchParams.get("metier") || "").trim();
    const visitorISO = await detectVisitorISO();
    const defaultISO = (urlCountry && /^[A-Z]{2}$/.test(urlCountry)) ? urlCountry : visitorISO;

    fillSelect(elCountry, countries.map(c => ({value:c.iso, label:`${c.name} (${c.iso})`})), "Choisir un pays...");
    fillSelect(elSector, [{value:"", label:"Tous les secteurs"}, ...sectors.map(s => ({value:s.id, label:s.name}))], "");
    
    if (defaultISO) elCountry.value = defaultISO;
    elCount.textContent = String(metiers.length);

    elJob.addEventListener("input", () => {
      const q = safeText(elJob.value).trim().toLowerCase();
      if (q.length < 2) { elSuggest.classList.add("hidden"); return; }

      const sec = elSector.value;
      let pool = sec ? (metiersBySector.get(sec) || []) : metiers;
      
      const hits = pool.filter(m => m.name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q)).slice(0,12);
      
      if (!hits.length) { elSuggest.classList.add("hidden"); return; }
      
      elSuggest.innerHTML = hits.map(m => 
        `<div class="suggestion-item" data-slug="${escapeHtml(m.slug)}">${escapeHtml(m.name)}</div>`
      ).join("");
      elSuggest.classList.remove("hidden");
      
      elSuggest.querySelectorAll(".suggestion-item").forEach(item => {
        item.addEventListener("click", () => {
          const slug = item.getAttribute("data-slug");
          elJob.value = metiers.find(m => m.slug === slug)?.name || slug;
          elSuggest.classList.add("hidden");
          renderMetier(slug);
        });
      });
    });

    document.addEventListener("click", (e) => {
      if (!elSuggest.contains(e.target) && e.target !== elJob) elSuggest.classList.add("hidden");
    });

    elSector.addEventListener("change", () => {
      elJob.value = "";
      const sec = elSector.value;
      elCount.textContent = sec ? String(metiersBySector.get(sec)?.length || 0) : String(metiers.length);
    });

    elReset.addEventListener("click", () => {
      elCountry.value = defaultISO;
      elSector.value = "";
      elJob.value = "";
      elCount.textContent = String(metiers.length);
      document.getElementById("main-content").innerHTML = '<div class="card"><div class="text-sm font-semibold" style="color: var(--muted);">Sélectionnez un métier</div></div>';
    });

    if (urlMetier) {
      const base = metiers.find(m => m.slug === urlMetier);
      if (base) elJob.value = base.name;
      await renderMetier(urlMetier);
    }
  }

  async function renderMetier(slug){
    const iso = document.getElementById("filter-pays").value;
    if (!slug || !iso) return;

    document.getElementById("main-content").innerHTML = '<div class="card">Chargement...</div>';

    let data = {};
    try {
      data = await fetchMetierDetail({ slug, iso });
    } catch(e) {
      log("fetch failed", e);
    }

    const metier = data?.metier || {};
    const pays = data?.pays || {};
    const sponsor = data?.sponsor || {};
    const bloc = data?.metier_pays_bloc || {};

    const country = countries.find(c => c.iso === iso);
    
    document.getElementById("nom-metier").textContent = metier.nom || metier.name || slug;
    document.getElementById("accroche-metier").textContent = metier.accroche || "";

    const sponsorWide = firstUrlInAny(sponsor.logo_2 || sponsor.logo_wide);
    const sponsorSquare = firstUrlInAny(sponsor.logo_1 || sponsor.logo_square);
    const sponsorLink = safeText(sponsor.link || sponsor.url || "").trim();
    
    const wideUrl = sponsorWide || country?.attente_wide;
    const squareUrl = sponsorSquare || country?.attente_square;

    const bannerLink = document.getElementById("sponsor-banner-link");
    const bannerImg = document.getElementById("sponsor-banner-img");
    if (wideUrl) {
      bannerImg.src = wideUrl;
      bannerLink.href = sponsorLink || (SPONSOR_PATH + `?metier=${slug}&country=${iso}`);
      bannerLink.style.display = "block";
    } else {
      bannerLink.style.display = "none";
    }

    const logoLink = document.getElementById("sponsor-logo-link");
    const logoImg = document.getElementById("sponsor-logo-img");
    const logoContainer = document.getElementById("sponsor-logo-container");
    const noSponsor = document.getElementById("no-sponsor-message");
    if (squareUrl) {
      logoImg.src = squareUrl;
      logoLink.href = sponsorLink || (SPONSOR_PATH + `?metier=${slug}&country=${iso}`);
      logoContainer.style.display = "flex";
      noSponsor.style.display = "none";
    } else {
      logoContainer.style.display = "none";
      noSponsor.style.display = "block";
    }

    const cards = [];
    if (metier.description) cards.push(renderCard("👁️ Vue d'ensemble", "rgba(59,130,246,.12)", metier.description));
    if (metier.missions) cards.push(renderCard("✅ Missions principales", "rgba(16,185,129,.14)", metier.missions));
    if (bloc.formation_bloc) cards.push(renderCard("🎓 Formation", "rgba(59,130,246,.12)", bloc.formation_bloc));
    if (bloc.salaire_bloc) cards.push(renderCard("💰 Rémunération", "rgba(245,158,11,.18)", bloc.salaire_bloc));

    document.getElementById("main-content").innerHTML = cards.join("") || '<div class="card">Aucune donnée disponible</div>';
  }

  function renderCard(title, bg, content){
    return `<div class="card"><div class="card-header" style="background:${bg};"><h2 class="section-title">${title}</h2></div><div class="rich-content">${content}</div></div>`;
  }

  function fillSelect(el, items, placeholder){
    el.innerHTML = placeholder ? `<option value="">${placeholder}</option>` : "";
    for (const it of items) {
      const opt = document.createElement("option");
      opt.value = it.value;
      opt.textContent = it.label;
      el.appendChild(opt);
    }
  }

  // Continuation du renderShell()
  function renderShell(){
    ROOT.innerHTML = `<div style="background:linear-gradient(180deg, #f8fafc 0%, #fff 100%);min-height:100vh;">
<div style="background:white;border-bottom:2px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.05);">
<div class="max-w-[1200px] mx-auto px-6 py-4">
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
<div><label for="filter-pays" class="block text-xs font-semibold mb-2">🌍 Pays / Région</label>
<select id="filter-pays" class="w-full px-4 py-3 rounded-lg border-2 text-sm font-medium" style="border-color:var(--border);"></select></div>
<div><label for="filter-secteur" class="block text-xs font-semibold mb-2">🏢 Secteur d'activité</label>
<select id="filter-secteur" class="w-full px-4 py-3 rounded-lg border-2 text-sm font-medium" style="border-color:var(--border);"></select></div>
<div><label for="filter-metier" class="block text-xs font-semibold mb-2">🔍 Rechercher un métier</label>
<div class="relative"><input id="filter-metier" type="text" placeholder="Ex: Développeur..." class="w-full px-4 py-3 rounded-lg border-2 text-sm font-medium" style="border-color:var(--border);">
<div id="metier-suggestions" class="absolute top-full left-0 right-0 mt-2 rounded-lg border-2 bg-white z-50 hidden" style="border-color:var(--border);max-height:320px;overflow-y:auto;"></div></div></div>
</div>
<div class="mt-4 flex items-center justify-between">
<button id="reset-filters" class="text-sm font-semibold px-4 py-2 rounded-lg" style="color:var(--muted);">Réinitialiser</button>
<div class="text-xs font-semibold" style="color:var(--muted);"><span id="result-count">—</span> fiche(s) métier</div>
</div></div></div>
<header style="background:white;border-bottom:2px solid var(--border);">
<div class="max-w-[1200px] mx-auto px-6 py-10">
<div class="flex items-start gap-5">
<div class="w-20 h-20 rounded-2xl flex items-center justify-center" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
<div class="flex-1"><span class="badge-primary">💼 Fiche Métier</span>
<h1 id="nom-metier" class="text-5xl font-bold mt-4 mb-3">Sélectionnez un métier</h1>
<p id="accroche-metier" class="text-xl" style="color:var(--muted);">Choisissez un pays, un secteur et recherchez un métier</p></div></div>
<div class="flex justify-center mt-8">
<a id="sponsor-banner-link" href="#" class="sponsor-banner-wide" style="display:none;">
<img id="sponsor-banner-img" class="w-full h-full object-cover" /></a></div></div></header>
<main class="max-w-[1200px] mx-auto px-6 py-10">
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
<div class="lg:col-span-2 space-y-8" id="main-content">
<div class="card"><div class="text-sm font-semibold" style="color:var(--muted);">Sélectionnez un métier pour afficher la fiche</div></div></div>
<div class="space-y-6" id="sidebar-content">
<div class="card"><div class="card-header" style="background:linear-gradient(135deg,#f8fafc,#e2e8f0);"><h3 class="section-title text-sm">🤝 Partenaire</h3></div>
<a id="sponsor-logo-link" href="#"><div id="sponsor-logo-container" class="sponsor-logo-square" style="display:none;">
<img id="sponsor-logo-img" class="w-full h-full object-contain"/></div></a>
<div id="no-sponsor-message" class="text-sm font-semibold text-center py-4" style="color:var(--muted);">Aucun sponsor</div></div></div></div></main></div>`;
  }

  main().catch(e => console.error("[metier-page]", e));
})();