/* metier-page.js — Ulydia (v10.1)
   - Static catalog.json (countries + sectors + metiers)
   - Filters: country / sector / metier autocomplete
   - Calls Worker: GET /v1/metier-page?slug=...&iso=FR
   - Banners: sponsor if present else country attente banners from catalog
   - URL handling:
       * Accepts ?metier=... as alias of ?slug=...
       * "Simple URL mode": if landing URL is only metier+country, DO NOT add slug/sector/q automatically
*/

(() => {
  if (window.__ULYDIA_METIER_PAGE_V101__) return;
  window.__ULYDIA_METIER_PAGE_V101__ = true;

  // =========================
  // CONFIG
  // =========================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // ✅ Set exact URL (bump ?v=... when you update catalog.json)
  const CATALOG_URL  = "https://ulydia-assets.pages.dev/assets/catalog.json?v=5";

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================
  // Root
  // =========================
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  // =========================
  // Design tokens (v2)
  // =========================
  const TOK = {
    colors: {
      primary: "#c00102",
      primaryHover: "#a00001",
      text: "#1a1a1a",
      muted: "#6b7280",
      border: "#e5e7eb",
      bg: "#ffffff",
      card: "#fafafa",
      white: "#ffffff"
    },
    typography: {
      fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial",
      basePx: 14,
      weight: { regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 }
    },
    radii: { sm: 6, md: 8, lg: 10, xl: 12, card: 22 },
    shadows: {
      card: "0 10px 30px rgba(0,0,0,.06)",
      cardHover: "0 15px 40px rgba(0,0,0,.10)"
    },
    gradients: {
      redSlow: "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 35%, #ffd6d6 70%, #ffffff 100%)"
    },
    components: { buttonHeight: 44 }
  };

  // =========================
  // CSS
  // =========================
  function injectCSS(){
    if (document.getElementById("ulydia-metier-css")) return;
    const css = `
      :root{
        --ul-primary:${TOK.colors.primary};
        --ul-primaryHover:${TOK.colors.primaryHover};
        --ul-text:${TOK.colors.text};
        --ul-muted:${TOK.colors.muted};
        --ul-border:${TOK.colors.border};
        --ul-bg:${TOK.colors.bg};
        --ul-card:${TOK.colors.card};
        --ul-white:${TOK.colors.white};
        --ul-radius-card:${TOK.radii.card}px;
        --ul-radius-xl:${TOK.radii.xl}px;
        --ul-radius-md:${TOK.radii.md}px;
        --ul-shadow-card:${TOK.shadows.card};
        --ul-font:${TOK.typography.fontFamily};
        --ul-btn-h:${TOK.components.buttonHeight}px;
      }

      #ulydia-metier-root{ font-family:var(--ul-font); color:var(--ul-text); }
      .ul-wrap{ max-width:1180px; margin:0 auto; padding:26px 16px 80px; }
      .ul-hero{
        border-radius: var(--ul-radius-card);
        border: 1px solid var(--ul-border);
        background: ${TOK.gradients.redSlow};
        box-shadow: var(--ul-shadow-card);
        padding: 18px 18px 14px;
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .ul-h-title{ font-weight:${TOK.typography.weight.extrabold}; font-size:20px; line-height:1.15; }
      .ul-h-sub{ margin-top:6px; color:var(--ul-muted); font-size:13px; }

      .ul-grid{ margin-top:16px; display:grid; grid-template-columns: 1fr; gap:14px; }
      .ul-card{
        background: var(--ul-white);
        border: 1px solid var(--ul-border);
        border-radius: var(--ul-radius-card);
        box-shadow: var(--ul-shadow-card);
        overflow: hidden;
      }
      .ul-card-head{
        padding:14px 16px;
        border-bottom: 1px solid var(--ul-border);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap: wrap;
      }
      .ul-card-title{ font-weight:${TOK.typography.weight.extrabold}; font-size:14px; }
      .ul-card-body{ padding:16px; }

      .ul-row{ display:flex; gap:10px; flex-wrap:wrap; }
      .ul-field{ display:flex; flex-direction:column; gap:6px; flex:1; min-width:240px; }
      .ul-label{ font-size:12px; color:var(--ul-muted); font-weight:${TOK.typography.weight.semibold}; }

      .ul-input, .ul-select{
        height: var(--ul-btn-h);
        border-radius: var(--ul-radius-xl);
        border: 1px solid var(--ul-border);
        background: #fff;
        padding: 0 12px;
        outline:none;
        font-size:14px;
      }
      .ul-input:focus, .ul-select:focus{
        border-color: rgba(192,1,2,.45);
        box-shadow: 0 0 0 4px rgba(192,1,2,.08);
      }

      .ul-actions{ display:flex; gap:10px; align-items:flex-end; }
      .ul-btn{
        height: var(--ul-btn-h);
        padding: 0 14px;
        border-radius: var(--ul-radius-xl);
        border: 1px solid var(--ul-border);
        background: #fff;
        cursor: pointer;
        font-weight:${TOK.typography.weight.bold};
      }
      .ul-btn.primary{
        background: var(--ul-primary);
        border-color: transparent;
        color: #fff;
      }
      .ul-btn.primary:hover{ background: var(--ul-primaryHover); }

      /* Autocomplete dropdown */
      .ul-suggest{ position:relative; }
      .ul-suggest-list{
        position:absolute;
        left:0; right:0; top: calc(var(--ul-btn-h) + 6px);
        border: 1px solid var(--ul-border);
        border-radius: 14px;
        background: #fff;
        box-shadow: var(--ul-shadow-card);
        z-index: 9999;
        max-height: 280px;
        overflow:auto;
        display:none;
      }
      .ul-suggest-item{
        padding: 10px 12px;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }
      .ul-suggest-item:hover{ background: rgba(192,1,2,.06); }
      .ul-suggest-item b{ font-weight:${TOK.typography.weight.bold}; }
      .ul-suggest-item span{ color: var(--ul-muted); font-size:12px; }

      /* Content */
      .ul-kv{ padding: 14px 16px 6px; }
      .ul-kv h1{ margin:0; font-size:22px; font-weight:${TOK.typography.weight.extrabold}; }
      .ul-kv p{ margin:8px 0 0; color: var(--ul-muted); line-height:1.5; }

      .ul-banners{ padding: 12px 16px 16px; display:grid; grid-template-columns: 1fr 240px; gap:12px; }
      .ul-banner{
        border: 1px solid var(--ul-border);
        border-radius: 18px;
        overflow:hidden;
        background: #fff;
      }
      .ul-banner a{ display:block; text-decoration:none; }
      .ul-banner img{ display:block; width:100%; height:100%; object-fit:cover; }
      .ul-banner-wide{ height: 130px; }
      .ul-banner-square{ height: 130px; }

      @media (max-width: 860px){
        .ul-banners{ grid-template-columns:1fr; }
        .ul-banner-square{ height: 160px; }
      }

      .ul-meta{ padding: 0 16px 14px; color: var(--ul-muted); font-size:12px; }
      .ul-status{ padding: 10px 16px; color: var(--ul-muted); font-size:13px; }

      .ul-error{
        margin: 12px 16px 16px;
        border-radius: 16px;
        border: 1px solid rgba(192,1,2,.25);
        background: rgba(192,1,2,.06);
        padding: 12px;
      }
      .ul-error b{ display:block; margin-bottom:6px; }
    `;
    const style = document.createElement("style");
    style.id = "ulydia-metier-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // =========================
  // Helpers
  // =========================
  function pickStr(v){ return (v == null) ? "" : String(v).trim(); }
  function upper2(v){ return pickStr(v).toUpperCase(); }
  function safeJSON(t){ try { return JSON.parse(t || "null"); } catch(e){ return null; } }

  function getParam(name){
    const u = new URL(location.href);
    return pickStr(u.searchParams.get(name));
  }

  // ✅ "Rich" URL updater (kept for non-simple mode)
  function setURLParams(params){
    const u = new URL(location.href);
    Object.keys(params || {}).forEach(k => {
      const v = params[k];
      if (v == null || v === "") u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    });
    history.replaceState({}, "", u.toString());
  }

  // ✅ Simple URL mode helpers
  function isSimpleURLMode(){
    const u = new URL(location.href);
    const hasMetier = !!u.searchParams.get("metier");
    const hasSlug   = !!u.searchParams.get("slug");
    const hasSector = !!u.searchParams.get("sector");
    const hasQ      = !!u.searchParams.get("q");
    // Simple = arrives with metier (and usually country) and no extras
    return hasMetier && !hasSlug && !hasSector && !hasQ;
  }

  function setSimpleURL({ metier, country }){
    const u = new URL(location.href);
    if (metier) u.searchParams.set("metier", String(metier));
    if (country) u.searchParams.set("country", String(country));
    ["slug","sector","q","iso"].forEach(k => u.searchParams.delete(k));
    history.replaceState({}, "", u.toString());
  }

  // ✅ Accept ?metier=... as alias of ?slug=...
  function detectSlug(){
    const s = getParam("metier") || getParam("slug");
    if (s) return s;

    const seg = location.pathname.split("/").filter(Boolean);
    const last = seg[seg.length-1] || "";
    if (last && last !== "metier" && last !== "fiche-metiers") return last;
    return "";
  }

  async function fetchJSON(url, { timeoutMs = 12000 } = {}){
    const full = url.startsWith("http") ? url : (WORKER_URL + url);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try{
      const headers = {
        "accept": "application/json",
        "x-proxy-secret": PROXY_SECRET,
        "x-ulydia-proxy-secret": PROXY_SECRET
      };
      const r = await fetch(full, { headers, signal: ctrl.signal, credentials:"omit" });
      const txt = await r.text();
      const j = safeJSON(txt);
      if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url} :: ${txt.slice(0,200)}`);
      return j;
    } finally {
      clearTimeout(t);
    }
  }

  // =========================
  // Catalog
  // =========================
  async function loadCatalog(){
    const r = await fetch(CATALOG_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("catalog.json load failed");
    const j = await r.json();
    const countries = Array.isArray(j?.countries) ? j.countries : [];
    const sectors   = Array.isArray(j?.sectors) ? j.sectors : [];
    const metiers   = Array.isArray(j?.metiers) ? j.metiers : [];
    return { countries, sectors, metiers };
  }

  function findCountry(countries, iso){
    const needle = upper2(iso);
    return countries.find(c => upper2(c?.iso) === needle) || null;
  }

  function normalizeLabel(x){
    return pickStr(x?.label || x?.name || x?.title || x?.slug || "");
  }

  function sectorId(x){
    return pickStr(x?.id || x?.slug || x?.value || "").trim();
  }

  function metierSlug(x){
    return pickStr(x?.slug || x?.id || "").trim();
  }

  // =========================
  // GEO (fallback only)
  // =========================
  async function detectGeoISO(){
    try{
      const j = await fetchJSON("/v1/geo", { timeoutMs: 9000 });
      return upper2(j?.iso || "");
    } catch(e){
      log("geo failed", e?.message || e);
      return "";
    }
  }

  // =========================
  // UI
  // =========================
  function renderShell(){
    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-hero">
          <div>
            <div class="ul-h-title">Fiche métier</div>
            <div class="ul-h-sub">Choisis un pays, un secteur et un métier — puis charge la fiche dans le contexte du pays (langue & bannières incluses).</div>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <button class="ul-btn" data-action="debug">Debug</button>
          </div>
        </div>

        <div class="ul-grid">
          <div class="ul-card">
            <div class="ul-card-head">
              <div class="ul-card-title">Recherche</div>
              <div class="ul-meta" data-el="meta"></div>
            </div>
            <div class="ul-card-body">
              <div class="ul-row">
                <div class="ul-field">
                  <div class="ul-label">Pays</div>
                  <select class="ul-select" data-el="country"></select>
                </div>

                <div class="ul-field">
                  <div class="ul-label">Secteur d’activité</div>
                  <select class="ul-select" data-el="sector"></select>
                </div>

                <div class="ul-field ul-suggest">
                  <div class="ul-label">Rechercher un métier</div>
                  <input class="ul-input" data-el="metierSearch" placeholder="Tape pour chercher (ex: directeur financier)..." autocomplete="off"/>
                  <div class="ul-suggest-list" data-el="suggestList"></div>
                </div>

                <div class="ul-actions">
                  <button class="ul-btn primary" data-action="load">Charger</button>
                </div>
              </div>

              <div class="ul-status" data-el="status">Chargement du catalogue…</div>
              <div class="ul-error" data-el="error" style="display:none;"></div>
            </div>
          </div>

          <div class="ul-card" data-el="contentCard" style="display:none;">
            <div class="ul-kv">
              <h1 data-el="name"></h1>
              <p data-el="desc"></p>
            </div>

            <div class="ul-banners" data-el="banners" style="display:none;">
              <div class="ul-banner ul-banner-wide">
                <a class="ul-banner-wide-a" target="_blank" rel="noopener">
                  <img class="ul-banner-wide-img" alt="">
                </a>
              </div>
              <div class="ul-banner ul-banner-square">
                <a class="ul-banner-square-a" target="_blank" rel="noopener">
                  <img class="ul-banner-square-img" alt="">
                </a>
              </div>
            </div>

            <div class="ul-meta" data-el="contentMeta"></div>
          </div>
        </div>
      </div>
    `;
  }

  function setStatus(txt){
    const el = ROOT.querySelector('[data-el="status"]');
    if (el) el.textContent = txt || "";
  }

  function setMeta(txt){
    const el = ROOT.querySelector('[data-el="meta"]');
    if (el) el.textContent = txt || "";
  }

  function setContentMeta(txt){
    const el = ROOT.querySelector('[data-el="contentMeta"]');
    if (el) el.textContent = txt || "";
  }

  function showError(title, msg){
    const el = ROOT.querySelector('[data-el="error"]');
    if (!el) return;
    el.style.display = "";
    el.innerHTML = `<b>${escapeHTML(title||"Erreur")}</b><div>${escapeHTML(msg||"")}</div>`;
  }
  function hideError(){
    const el = ROOT.querySelector('[data-el="error"]');
    if (el) el.style.display = "none";
  }
  function escapeHTML(s){
    return String(s||"").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  // =========================
  // Suggest / autocomplete
  // =========================
  function buildMetierIndex(metiers){
    return (metiers || []).map(m => ({
      slug: metierSlug(m),
      label: normalizeLabel(m),
      sectors: Array.isArray(m?.sectors) ? m.sectors.map(String) : []
    })).filter(x => x.slug && x.label);
  }

  function filterMetiers(index, q, sector){
    const query = pickStr(q).toLowerCase();
    const sec = pickStr(sector);
    let list = index;

    if (sec && sec !== "__ALL__") {
      list = list.filter(m => (m.sectors || []).includes(sec));
    }
    if (!query) return list.slice(0, 20);

    const out = list.filter(m => m.label.toLowerCase().includes(query) || m.slug.toLowerCase().includes(query));
    return out.slice(0, 20);
  }

  function showSuggest(listEl, items, onPick){
    listEl.innerHTML = "";
    if (!items.length) {
      listEl.style.display = "none";
      return;
    }
    items.forEach(it => {
      const div = document.createElement("div");
      div.className = "ul-suggest-item";
      div.innerHTML = `<b>${escapeHTML(it.label)}</b><span>${escapeHTML(it.slug)}</span>`;
      div.addEventListener("click", () => onPick(it));
      listEl.appendChild(div);
    });
    listEl.style.display = "";
  }

  function hideSuggest(listEl){
    listEl.style.display = "none";
  }

  // =========================
  // Banners
  // =========================
  function setBanner(anchorEl, imgEl, imgUrl, clickUrl){
    const a = anchorEl, img = imgEl;
    if (!imgUrl) {
      if (a) a.removeAttribute("href");
      if (img) img.removeAttribute("src");
      return;
    }
    if (img) img.src = imgUrl;
    if (a) a.href = clickUrl || "#";
  }

  function pickBannersFromPayload(payload){
    const meta = payload?.meta || {};
    const sponsor = meta?.sponsor || payload?.sponsor || payload?.meta?.sponsor || null;

    const sponsorLink = pickStr(
      sponsor?.link || sponsor?.url || sponsor?.website ||
      meta?.sponsorLink ||
      ""
    );

    const wideSponsor = pickStr(
      sponsor?.logo_2 || sponsor?.logo_wide || sponsor?.wide || sponsor?.banner_wide || ""
    );
    const squareSponsor = pickStr(
      sponsor?.logo_1 || sponsor?.logo_square || sponsor?.square || sponsor?.banner_square || ""
    );

    if (wideSponsor || squareSponsor) {
      return { mode:"sponsor", wide: wideSponsor, square: squareSponsor, click: sponsorLink || "#" };
    }
    return null;
  }

  function pickFallbackBannersFromCatalog(country){
    const banners = country?.banners || {};

    const wide = String(
      banners?.banniere_sponsorisation_image_1 ||
      banners?.image_1 ||
      banners?.attente_wide ||
      banners?.wide ||
      banners?.attente ||
      ""
    ).trim();

    const square = String(
      banners?.banniere_sponsorisation_image_2 ||
      banners?.image_2 ||
      banners?.attente_square ||
      banners?.square ||
      banners?.attente ||
      ""
    ).trim();

    const texte = String(
      banners?.banniere_sponsorisation_texte ||
      banners?.texte ||
      ""
    ).trim();

    const cta = String(
      banners?.banniere_sponsorisation_cta ||
      banners?.cta ||
      ""
    ).trim();

    return { mode:"fallback", wide, square, click:"#", texte, cta };
  }

  // =========================
  // Render content
  // =========================
  function renderContent(payload, selectedCountry){
    const card = ROOT.querySelector('[data-el="contentCard"]');
    card.style.display = "";

    const metier = payload?.metier || {};
    const name = pickStr(metier?.name || metier?.title || metier?.label || metier?.slug || "");
    const desc = pickStr(metier?.description || metier?.short_description || metier?.resume || "");

    ROOT.querySelector('[data-el="name"]').textContent = name || "—";
    ROOT.querySelector('[data-el="desc"]').textContent = desc || "";

    const bannersWrap = ROOT.querySelector('[data-el="banners"]');
    const wideA = ROOT.querySelector(".ul-banner-wide-a");
    const wideI = ROOT.querySelector(".ul-banner-wide-img");
    const sqA = ROOT.querySelector(".ul-banner-square-a");
    const sqI = ROOT.querySelector(".ul-banner-square-img");

    const sponsorPick = pickBannersFromPayload(payload);
    const pick = sponsorPick || pickFallbackBannersFromCatalog(selectedCountry);

    const hasAny = !!(pick?.wide || pick?.square);
    bannersWrap.style.display = hasAny ? "" : "none";

    if (hasAny) {
      setBanner(wideA, wideI, pick.wide, pick.click);
      setBanner(sqA, sqI, pick.square, pick.click);
    }

    const iso = upper2(selectedCountry?.iso || "");
    const lang = pickStr(selectedCountry?.langue_finale || "");
    setContentMeta(`Pays: ${iso || "?"} • Langue finale: ${lang || "?"} • Bannières: ${pick.mode}`);
  }

  // =========================
  // Worker payload
  // =========================
  async function loadMetierPayload({ slug, iso }){
    const qs = new URLSearchParams({ slug, iso });
    return await fetchJSON(`/v1/metier-page?${qs.toString()}`, { timeoutMs: 15000 });
  }

  // =========================
  // MAIN
  // =========================
  async function main(){
    injectCSS();
    renderShell();
    hideError();

    const countrySel = ROOT.querySelector('[data-el="country"]');
    const sectorSel = ROOT.querySelector('[data-el="sector"]');
    const searchInput = ROOT.querySelector('[data-el="metierSearch"]');
    const suggestList = ROOT.querySelector('[data-el="suggestList"]');

    // ✅ URL mode flags
    const SIMPLE_MODE = isSimpleURLMode();
    let userTouched = false;

    const slugFromURL = detectSlug();
    const urlISO = upper2(getParam("country") || getParam("iso") || "");
    const urlSector = pickStr(getParam("sector") || "");
    const urlQuery = pickStr(getParam("q") || "");

    // Load catalog
    let catalog;
    try {
      setStatus("Chargement du catalogue…");
      catalog = await loadCatalog();
    } catch(e){
      showError("Catalog introuvable", `Impossible de charger catalog.json (${e?.message || e}). Vérifie CATALOG_URL.`);
      setStatus("Erreur catalogue.");
      return;
    }

    const countries = (catalog.countries || []).slice();
    const sectors = (catalog.sectors || []).slice();
    const metierIndex = buildMetierIndex(catalog.metiers || []);

    setMeta(`catalog: ${countries.length} pays • ${sectors.length} secteurs • ${metierIndex.length} métiers`);

    // Decide default country: URL if valid -> else GEO -> else FR -> else none
    let selectedISO = "";
    const hasURL = !!findCountry(countries, urlISO);
    if (hasURL) selectedISO = urlISO;

    if (!selectedISO) {
      const geoISO = await detectGeoISO();
      if (findCountry(countries, geoISO)) selectedISO = geoISO;
    }
    if (!selectedISO && findCountry(countries, "FR")) selectedISO = "FR";

    // Populate countries
    countrySel.innerHTML = "";
    if (!selectedISO) {
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Choisir un pays…";
      opt0.disabled = true;
      opt0.selected = true;
      countrySel.appendChild(opt0);
    }

    countries
      .slice()
      .sort((a,b) => normalizeLabel(a).localeCompare(normalizeLabel(b), "fr", { sensitivity:"base" }))
      .forEach(c => {
        const iso = upper2(c?.iso);
        const opt = document.createElement("option");
        opt.value = iso;
        opt.textContent = `${normalizeLabel(c)}${iso ? ` (${iso})` : ""}`;
        if (selectedISO && iso === selectedISO) opt.selected = true;
        countrySel.appendChild(opt);
      });

    // Populate sectors (+ Tous)
    sectorSel.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "__ALL__";
    allOpt.textContent = "Tous les secteurs";
    sectorSel.appendChild(allOpt);

    sectors.forEach(s => {
      const id = sectorId(s);
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = normalizeLabel(s) || id;
      sectorSel.appendChild(opt);
    });

    if (urlSector) sectorSel.value = urlSector;

    // Prefill search
    if (urlQuery) searchInput.value = urlQuery;

    if (!searchInput.value && slugFromURL) {
      const found = metierIndex.find(m => m.slug === slugFromURL);
      searchInput.value = found ? found.label : "";
      searchInput.dataset.slug = slugFromURL;
    }

    // Suggest behavior
    function refreshSuggest(){
      const sector = sectorSel.value;
      const q = searchInput.value;
      const items = filterMetiers(metierIndex, q, sector);
      showSuggest(suggestList, items, (it) => {
        searchInput.value = it.label;
        searchInput.dataset.slug = it.slug;
        hideSuggest(suggestList);

        // If in simple mode and user picked a metier, keep URL simple (optional)
        if (SIMPLE_MODE && !userTouched) {
          const iso = upper2(countrySel.value);
          if (iso) setSimpleURL({ metier: it.slug, country: iso });
        }
      });
    }

    searchInput.addEventListener("input", () => {
      userTouched = true;
      searchInput.dataset.slug = "";
      refreshSuggest();

      // ✅ Do not auto-write rich params in simple mode
      if (!SIMPLE_MODE) {
        setURLParams({ q: searchInput.value || "", sector: sectorSel.value || "", country: countrySel.value || "" });
      }
    });

    searchInput.addEventListener("focus", refreshSuggest);

    document.addEventListener("click", (e) => {
      const box = ROOT.querySelector(".ul-suggest");
      if (box && !box.contains(e.target)) hideSuggest(suggestList);
    });

    sectorSel.addEventListener("change", () => {
      userTouched = true;
      refreshSuggest();

      if (!SIMPLE_MODE) {
        setURLParams({ sector: sectorSel.value || "", q: searchInput.value || "", country: countrySel.value || "" });
      }
    });

    countrySel.addEventListener("change", () => {
      userTouched = true;

      if (!SIMPLE_MODE) {
        setURLParams({ country: countrySel.value || "", sector: sectorSel.value || "", q: searchInput.value || "" });
      } else {
        const iso = upper2(countrySel.value);
        const m = pickStr(searchInput.dataset.slug || detectSlug());
        if (iso && m) setSimpleURL({ metier: m, country: iso });
        else if (iso) setSimpleURL({ metier: pickStr(getParam("metier") || ""), country: iso });
      }
    });

    // Debug button
    ROOT.querySelector('[data-action="debug"]').addEventListener("click", () => {
      const iso = countrySel.value;
      const c = findCountry(countries, iso);
      console.log("=== METIER PAGE DEBUG ===");
      console.log("CATALOG_URL", CATALOG_URL);
      console.log("SIMPLE_MODE", SIMPLE_MODE, "userTouched", userTouched);
      console.log("countries", countries.length, "sectors", sectors.length, "metiers", metierIndex.length);
      console.log("selected country", iso, c);
      console.log("selected sector", sectorSel.value);
      console.log("search", searchInput.value, "picked slug", searchInput.dataset.slug || "");
      console.log("=========================");
      alert("Debug envoyé dans la console.");
    });

    // Load handler
    async function doLoad(){
      hideError();

      const iso = upper2(countrySel.value);
      if (!iso) {
        showError("Pays manquant", "Sélectionne un pays.");
        return;
      }

      // slug: either picked from suggest or resolve from typed label
      let slug = pickStr(searchInput.dataset.slug || "");
      if (!slug) {
        const q = pickStr(searchInput.value).toLowerCase();
        const cand = metierIndex.find(m => m.label.toLowerCase() === q);
        if (cand) slug = cand.slug;
      }
      if (!slug) {
        showError("Métier manquant", "Choisis un métier dans la liste (saisie assistée).");
        return;
      }

      // ✅ URL update
      if (SIMPLE_MODE && !userTouched) {
        setSimpleURL({ metier: slug, country: iso });
      } else {
        setURLParams({ slug, country: iso, sector: sectorSel.value || "", q: searchInput.value || "" });
      }

      // Load from Worker
      setStatus(`Chargement de la fiche (${slug}) pour ${iso}…`);
      const selectedCountry = findCountry(countries, iso) || { iso };

      try {
        const payload = await loadMetierPayload({ slug, iso });
        log("payload", payload);
        renderContent(payload, selectedCountry);
        setStatus("OK.");
      } catch(e){
        showError("Erreur Worker", e?.message || String(e));
        setStatus("Erreur.");
      }
    }

    ROOT.querySelector('[data-action="load"]').addEventListener("click", doLoad);

    setStatus("Prêt.");

    // Auto-load if URL already has metier/slug + country
    if (slugFromURL && selectedISO) {
      if (!searchInput.dataset.slug) searchInput.dataset.slug = slugFromURL;
      doLoad();
    }
  }

  main().catch((e) => {
    console.error("[metier-page] fatal", e);
    try {
      ROOT.querySelector('[data-el="error"]').style.display = "";
      ROOT.querySelector('[data-el="error"]').innerHTML = `<b>Fatal</b><div>${escapeHTML(e?.message || String(e))}</div>`;
    } catch(_) {}
  });

})();
