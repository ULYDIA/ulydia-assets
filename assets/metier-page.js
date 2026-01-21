/* metier-page.js — Ulydia (v9.7)
   Fixes:
   - Countries source of truth = /v1/filters (avoid 100 chunk issue)
   - Robust ISO extraction (multi-keys)
   - Deterministic country selection: URL (valid) > GEO > FR > first
   - Fallback: read countriesData chunks if /v1/filters fails
   - Debug helpers

   Expected Worker endpoints:
   - GET  /v1/filters        -> { countries: [...], sectors?: [...], metiers?: [...] }
   - GET  /v1/geo            -> { iso: "FR", ... }   (optional)
   - GET  /v1/metier-page?slug=...&iso=FR  -> { metier, pays, meta? } (your existing route)
*/

(() => {
  if (window.__ULYDIA_METIER_PAGE_V97__) return;
  window.__ULYDIA_METIER_PAGE_V97__ = true;

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL"; // keep your real one
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;

  function log(...a){ if (DEBUG) console.log("[metier-page]", ...a); }
  function warn(...a){ console.warn("[metier-page]", ...a); }

  // =========================================================
  // ROOT
  // =========================================================
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
    log("root auto-created");
  }

  // =========================================================
  // CSS (simple, tu peux remplacer par ton design dashboard)
  // =========================================================
  function injectCSS(){
    if (document.getElementById("ulydia-metier-css")) return;
    const css = `
      :root{
        --ul-bg:#0b0f19;
        --ul-card:#121a2a;
        --ul-card2:#0f1626;
        --ul-text:#e7eefc;
        --ul-muted:#a9b4c8;
        --ul-line:rgba(255,255,255,.08);
        --ul-accent:#c00102;
        --ul-radius:16px;
        --ul-shadow:0 10px 30px rgba(0,0,0,.35);
        --ul-font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
      }
      #ulydia-metier-root{ font-family:var(--ul-font); color:var(--ul-text); }
      .ul-wrap{ max-width:1100px; margin:0 auto; padding:24px 16px 64px; }
      .ul-card{ background:linear-gradient(180deg, var(--ul-card), var(--ul-card2)); border:1px solid var(--ul-line); border-radius:var(--ul-radius); box-shadow:var(--ul-shadow); }
      .ul-head{ padding:18px 18px 14px; border-bottom:1px solid var(--ul-line); display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
      .ul-title{ font-size:18px; font-weight:800; letter-spacing:.2px; }
      .ul-sub{ color:var(--ul-muted); font-size:13px; margin-top:4px; }
      .ul-body{ padding:18px; }
      .ul-row{ display:flex; gap:12px; flex-wrap:wrap; }
      .ul-field{ display:flex; flex-direction:column; gap:6px; min-width:220px; flex:1; }
      .ul-label{ font-size:12px; color:var(--ul-muted); }
      .ul-input,.ul-select{
        height:40px; border-radius:12px; border:1px solid var(--ul-line);
        background:rgba(255,255,255,.04); color:var(--ul-text);
        padding:0 12px; outline:none;
      }
      .ul-input::placeholder{ color:rgba(233,238,252,.45); }
      .ul-actions{ display:flex; gap:10px; align-items:center; }
      .ul-btn{
        height:40px; padding:0 14px; border-radius:12px;
        border:1px solid var(--ul-line); background:rgba(255,255,255,.06);
        color:var(--ul-text); cursor:pointer; font-weight:700;
      }
      .ul-btn.primary{ background:var(--ul-accent); border-color:transparent; }
      .ul-btn:disabled{ opacity:.55; cursor:not-allowed; }

      .ul-banners{ display:grid; grid-template-columns: 1fr 240px; gap:12px; margin-top:14px; }
      .ul-banner{ border-radius:14px; overflow:hidden; border:1px solid var(--ul-line); background:rgba(255,255,255,.03); }
      .ul-banner a{ display:block; text-decoration:none; }
      .ul-banner img{ width:100%; height:100%; object-fit:cover; display:block; }
      .ul-banner-wide{ height:110px; }
      .ul-banner-square{ height:110px; }

      @media (max-width: 840px){
        .ul-banners{ grid-template-columns:1fr; }
        .ul-banner-square{ height:120px; }
      }

      .ul-kv{ margin-top:14px; padding:14px; border:1px solid var(--ul-line); border-radius:14px; background:rgba(255,255,255,.03); }
      .ul-kv h1{ margin:0; font-size:22px; }
      .ul-kv p{ margin:8px 0 0; color:var(--ul-muted); line-height:1.45; }

      .ul-loading{ padding:18px; color:var(--ul-muted); }
      .ul-error{ padding:14px; border:1px solid rgba(192,1,2,.35); background:rgba(192,1,2,.12); border-radius:14px; }
      .ul-error b{ display:block; margin-bottom:6px; }

      .ul-meta{ margin-top:12px; color:var(--ul-muted); font-size:12px; }
    `;
    const style = document.createElement("style");
    style.id = "ulydia-metier-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // =========================================================
  // Utilities
  // =========================================================
  function pickStr(v){
    if (v == null) return "";
    if (typeof v === "string") return v.trim();
    return String(v).trim();
  }

  function countryISO(c){
    if (!c) return "";
    const v =
      c.iso ||
      c.code_iso ||
      c.codeIso ||
      c.ISO ||
      c.countryCode ||
      c.country_code ||
      c.code ||
      c.codePays ||
      c.alpha2 ||
      c.alpha_2 ||
      c.iso2 ||
      c.iso_2 ||
      c.slug || // last fallback (might be "france" => not usable)
      "";
    return pickStr(v).toUpperCase();
  }

  function countryLabel(c){
    return pickStr(c?.label || c?.name || c?.pays || c?.country || c?.title || c?.slug || countryISO(c) || "—");
  }

  function safeJSON(text){
    try { return JSON.parse(text || "null"); } catch(e){ return null; }
  }

  async function fetchJSON(path, { timeoutMs = 12000 } = {}){
    const url = path.startsWith("http") ? path : (WORKER_URL + path);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    const headers = {
      "accept": "application/json",
      "x-proxy-secret": PROXY_SECRET,
      "x-ulydia-proxy-secret": PROXY_SECRET
    };

    try {
      const r = await fetch(url, { headers, signal: ctrl.signal, credentials: "omit" });
      const txt = await r.text();
      const j = safeJSON(txt);
      if (!r.ok) {
        throw new Error(`HTTP ${r.status} ${r.statusText} @ ${path} :: ${txt.slice(0,200)}`);
      }
      return j;
    } finally {
      clearTimeout(t);
    }
  }

  // =========================================================
  // Read slugs / params
  // =========================================================
  function getParam(name){
    const u = new URL(location.href);
    return pickStr(u.searchParams.get(name));
  }

  function detectSlug(){
    // priority: ?slug=xxx
    const q = getParam("slug");
    if (q) return q;

    // fallback: /metier/xxx or /fiche-metiers/xxx patterns
    const p = location.pathname.split("/").filter(Boolean);
    const last = p[p.length - 1] || "";
    // Avoid using "metier" itself as slug
    if (last && last !== "metier" && last !== "fiche-metiers") return last;
    return "";
  }

  function setURLParams(params){
    const u = new URL(location.href);
    Object.keys(params || {}).forEach(k => {
      const v = params[k];
      if (v == null || v === "") u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    });
    history.replaceState({}, "", u.toString());
  }

  // =========================================================
  // Countries loading
  // =========================================================
  async function loadFiltersFromWorker(){
    // best source: /v1/filters
    const j = await fetchJSON("/v1/filters");
    const countries = Array.isArray(j?.countries) ? j.countries : [];
    const sectors   = Array.isArray(j?.sectors) ? j.sectors : [];
    const metiers   = Array.isArray(j?.metiers) ? j.metiers : [];
    return { countries, sectors, metiers, raw: j };
  }

  function loadCountriesFromChunks(){
    // fallback only: read countriesData, countriesData2, countriesData3...
    const nodes = Array.from(document.querySelectorAll('[id^="countriesData"]'));
    let all = [];
    nodes.forEach(el => {
      const arr = safeJSON(el.textContent || "[]");
      if (Array.isArray(arr)) all = all.concat(arr);
    });
    return all;
  }

  function normalizeCountries(list){
    const arr = Array.isArray(list) ? list.slice() : [];
    // keep only objects
    const clean = arr.filter(x => x && typeof x === "object");
    // de-dupe by ISO if possible else label
    const seen = new Set();
    const out = [];
    for (const c of clean) {
      const iso = countryISO(c);
      const key = iso ? `iso:${iso}` : `lbl:${countryLabel(c).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    // Sort by label for UX
    out.sort((a,b) => countryLabel(a).localeCompare(countryLabel(b), "fr", { sensitivity:"base" }));
    return out;
  }

  // =========================================================
  // GEO
  // =========================================================
  async function detectGeoISO(){
    try {
      const j = await fetchJSON("/v1/geo", { timeoutMs: 9000 });
      const iso = pickStr(j?.iso).toUpperCase();
      if (iso) return iso;
    } catch(e){
      log("geo failed", e?.message || e);
    }
    return "";
  }

  // =========================================================
  // Resolve selected country
  // =========================================================
  function findCountryByISO(countries, iso){
    const needle = pickStr(iso).toUpperCase();
    if (!needle) return null;
    return countries.find(c => {
      const x = countryISO(c);
      return x === needle || /[-_]?([A-Z]{2})$/.test(x) && x.endsWith(needle);
    }) || null;
  }

  function resolveSelectedISO({ countries, urlISO, geoISO }){
    // 1) URL if valid
    const fromURL = findCountryByISO(countries, urlISO);
    if (fromURL) return countryISO(fromURL);

    // 2) GEO if valid
    const fromGEO = findCountryByISO(countries, geoISO);
    if (fromGEO) return countryISO(fromGEO);

    // 3) FR if present
    const fromFR = findCountryByISO(countries, "FR");
    if (fromFR) return "FR";

    // 4) first with a usable ISO
    const first = countries.find(c => /^[A-Z]{2}$/.test(countryISO(c)));
    if (first) return countryISO(first);

    // 5) total fallback
    return "";
  }

  // =========================================================
  // UI render
  // =========================================================
  function renderShell(){
    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-card">
          <div class="ul-head">
            <div>
              <div class="ul-title">Fiche métier</div>
              <div class="ul-sub">Pays par défaut = visiteur (GEO) sauf si l’URL force un pays valide</div>
            </div>
            <div class="ul-actions">
              <button class="ul-btn" data-action="debug">Debug</button>
            </div>
          </div>
          <div class="ul-body">
            <div class="ul-row">
              <div class="ul-field">
                <div class="ul-label">Pays</div>
                <select class="ul-select" data-el="country"></select>
              </div>
              <div class="ul-field">
                <div class="ul-label">Slug métier</div>
                <input class="ul-input" data-el="slug" placeholder="ex: directeur-financier" />
              </div>
              <div class="ul-field" style="min-width:160px; flex:0;">
                <div class="ul-label">&nbsp;</div>
                <button class="ul-btn primary" data-action="load">Charger</button>
              </div>
            </div>

            <div class="ul-meta" data-el="meta"></div>

            <div class="ul-banners" data-el="banners" style="display:none;">
              <div class="ul-banner ul-banner-wide"><a target="_blank" rel="noopener" class="ul-banner-wide-a"><img class="ul-banner-wide-img" alt=""></a></div>
              <div class="ul-banner ul-banner-square"><a target="_blank" rel="noopener" class="ul-banner-square-a"><img class="ul-banner-square-img" alt=""></a></div>
            </div>

            <div class="ul-kv" data-el="kv" style="display:none;">
              <h1 data-el="name"></h1>
              <p data-el="desc"></p>
            </div>

            <div class="ul-loading" data-el="status">Chargement…</div>
            <div class="ul-error" data-el="error" style="display:none;"></div>
          </div>
        </div>
      </div>
    `;
  }

  function setStatus(txt){
    const el = ROOT.querySelector('[data-el="status"]');
    if (el) el.textContent = txt || "";
  }

  function showError(title, msg){
    const el = ROOT.querySelector('[data-el="error"]');
    if (!el) return;
    el.style.display = "";
    el.innerHTML = `<b>${escapeHTML(title || "Erreur")}</b><div>${escapeHTML(msg || "")}</div>`;
  }

  function hideError(){
    const el = ROOT.querySelector('[data-el="error"]');
    if (el) el.style.display = "none";
  }

  function escapeHTML(s){
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function setMeta(obj){
    const el = ROOT.querySelector('[data-el="meta"]');
    if (!el) return;
    el.textContent = obj ? JSON.stringify(obj) : "";
  }

  function populateCountries(selectEl, countries, selectedISO){
    selectEl.innerHTML = "";
    countries.forEach(c => {
      const iso = countryISO(c);
      const opt = document.createElement("option");
      opt.value = iso || countryLabel(c);
      opt.textContent = `${countryLabel(c)}${iso ? ` (${iso})` : ""}`;
      if (iso && iso === selectedISO) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  function setBanner(anchorEl, imgEl, imgUrl, clickUrl){
    const a = anchorEl;
    const img = imgEl;
    if (!imgUrl) {
      if (a) a.removeAttribute("href");
      if (img) img.removeAttribute("src");
      return;
    }
    if (img) img.src = imgUrl;
    if (a) a.href = clickUrl || "#";
  }

  // =========================================================
  // Banner picking logic (sponsor vs non-sponsor)
  // =========================================================
  function pickBannerURLs(payload){
    // payload likely: { metier, pays, meta? }
    // Try sponsor first:
    const meta = payload?.meta || {};
    const sponsor = meta?.sponsor || payload?.sponsor || null;

    const sponsorLink = pickStr(
      sponsor?.link ||
      sponsor?.url ||
      sponsor?.website ||
      meta?.sponsorLink ||
      ""
    );

    const wideSponsor = pickStr(
      sponsor?.logo_2 ||
      sponsor?.logo_wide ||
      sponsor?.wide ||
      sponsor?.banner_wide ||
      ""
    );

    const squareSponsor = pickStr(
      sponsor?.logo_1 ||
      sponsor?.logo_square ||
      sponsor?.square ||
      sponsor?.banner_square ||
      ""
    );

    if (wideSponsor || squareSponsor) {
      return {
        mode: "sponsor",
        wide: wideSponsor,
        square: squareSponsor,
        click: sponsorLink || "#"
      };
    }

    // Fallback non-sponsor: from pays banners by langue_finale
    const pays = payload?.pays || payload?.country || {};
    const banners = pays?.banners || {};

    const wideFallback = pickStr(
      banners?.wide ||
      banners?.attente ||
      banners?.pending ||
      banners?.sponsorisation ||
      pays?.banner_attente ||
      ""
    );

    const squareFallback = pickStr(
      banners?.square ||
      banners?.attente_square ||
      banners?.pending_square ||
      pays?.banner_square ||
      ""
    );

    return {
      mode: "fallback",
      wide: wideFallback,
      square: squareFallback,
      click: "#" // you can set a "become sponsor" page later
    };
  }

  // =========================================================
  // Load metier page payload
  // =========================================================
  async function loadMetierPayload({ slug, iso }){
    const qs = new URLSearchParams({ slug, iso });
    return await fetchJSON(`/v1/metier-page?${qs.toString()}`, { timeoutMs: 15000 });
  }

  function renderPayload(payload){
    // banners
    const bannersWrap = ROOT.querySelector('[data-el="banners"]');
    const wideA = ROOT.querySelector(".ul-banner-wide-a");
    const wideI = ROOT.querySelector(".ul-banner-wide-img");
    const sqA = ROOT.querySelector(".ul-banner-square-a");
    const sqI = ROOT.querySelector(".ul-banner-square-img");

    const picked = pickBannerURLs(payload);
    log("banner picked", picked);

    if (picked.wide || picked.square) {
      bannersWrap.style.display = "";
      setBanner(wideA, wideI, picked.wide, picked.click);
      setBanner(sqA, sqI, picked.square, picked.click);
    } else {
      bannersWrap.style.display = "none";
    }

    // metier
    const kv = ROOT.querySelector('[data-el="kv"]');
    const nameEl = ROOT.querySelector('[data-el="name"]');
    const descEl = ROOT.querySelector('[data-el="desc"]');

    const metier = payload?.metier || {};
    const name = pickStr(metier?.name || metier?.title || metier?.label || metier?.slug || "");
    const desc = pickStr(metier?.description || metier?.short_description || metier?.resume || "");

    if (name) {
      kv.style.display = "";
      nameEl.textContent = name;
      descEl.textContent = desc || "";
    } else {
      kv.style.display = "none";
    }
  }

  // =========================================================
  // MAIN
  // =========================================================
  async function main(){
    injectCSS();
    renderShell();
    hideError();

    const slugFromURL = detectSlug();
    const urlISO = pickStr(getParam("country") || getParam("iso") || getParam("pays")).toUpperCase();

    const countrySel = ROOT.querySelector('[data-el="country"]');
    const slugInput  = ROOT.querySelector('[data-el="slug"]');

    slugInput.value = slugFromURL || pickStr(getParam("metier")) || "";

    setStatus("Chargement des pays…");

    let filters = null;
    let countries = [];
    let geoISO = "";

    // 1) GEO (in parallel-ish, but safe)
    geoISO = await detectGeoISO();
    log("geoISO", geoISO);

    // 2) Countries: prefer /v1/filters
    try {
      filters = await loadFiltersFromWorker();
      countries = normalizeCountries(filters.countries);
      log("cms loaded", { countries: countries.length });
    } catch(e){
      warn("filters failed, fallback chunks", e?.message || e);
      const chunkCountries = loadCountriesFromChunks();
      countries = normalizeCountries(chunkCountries);
      log("chunks loaded", { countries: countries.length });
    }

    // Debug first object keys (what you asked: stop guessing)
    const first = countries[0] || null;
    log("first country object", first);
    log("first keys", first ? Object.keys(first) : []);

    // 3) resolve selected ISO
    const selectedISO = resolveSelectedISO({ countries, urlISO, geoISO });
    log("resolve ISO", { urlISO, geoISO, selectedISO });

    // 4) fill select
    populateCountries(countrySel, countries, selectedISO);

    // 5) Update URL (only if URL iso invalid or missing)
    // (We do not override valid URL choice)
    const urlValid = !!findCountryByISO(countries, urlISO);
    if (!urlValid && selectedISO) {
      setURLParams({ country: selectedISO });
    }

    setMeta({
      countries: countries.length,
      urlISO: urlISO || null,
      geoISO: geoISO || null,
      selectedISO: selectedISO || null
    });

    setStatus("Prêt.");

    // Events
    ROOT.querySelector('[data-action="debug"]').addEventListener("click", () => {
      const isoNow = pickStr(countrySel.value).toUpperCase();
      const c = findCountryByISO(countries, isoNow);
      console.log("=== DEBUG COUNTRIES ===");
      console.log("countries.len", countries.length);
      console.log("selectedISO", isoNow);
      console.log("matched country obj", c);
      console.log("keys", c ? Object.keys(c) : []);
      console.log("=======================");
      alert("Debug envoyé dans la console.");
    });

    ROOT.querySelector('[data-action="load"]').addEventListener("click", async () => {
      hideError();

      const slug = pickStr(slugInput.value);
      const iso = pickStr(countrySel.value).toUpperCase();

      if (!slug) {
        showError("Slug manquant", "Renseigne un slug métier (ou passe ?slug=...)");
        return;
      }
      if (!iso) {
        showError("Pays invalide", "Impossible de déterminer un ISO pays.");
        return;
      }

      setStatus(`Chargement métier "${slug}" pour ${iso}…`);
      setURLParams({ slug, country: iso });

      try {
        const payload = await loadMetierPayload({ slug, iso });
        log("payload", payload);
        renderPayload(payload);
        setStatus("OK.");
      } catch(e){
        showError("Erreur Worker", e?.message || String(e));
        setStatus("Erreur.");
      }
    });

    // Auto-load if we already have a slug
    if (slugInput.value && selectedISO) {
      ROOT.querySelector('[data-action="load"]').click();
    }
  }

  main().catch((e) => {
    console.error("[metier-page] fatal", e);
    try { showError("Fatal", e?.message || String(e)); } catch(_){}
  });

})();
