/* metier-page.js — Ulydia (V5.1.3)
   ------------------------------------------------------------
   Goals (V5.1.3)
   ✅ Uses Ulydia UI Kit + design tokens v2 (ulydia-ui.v2.js)
   ✅ Search bar ABOVE the job title on the Metier page
   ✅ Country (Pays) selector sourced from Webflow CMS (supports multiple ingestion methods)
   ✅ Sector (Secteurs_activite) selector sourced from Webflow CMS
   ✅ Metier selector filtered by Country + Sector + Search text
   ✅ Renders wide sponsor banner STRICT 680×120 (click => sponsor link)
   ✅ Renders square banner (click => sponsor link) when available
   ✅ Renders Metier_Pays_Bloc blocks + FAQ if present in API response
   ✅ Safe / idempotent (won’t run twice)

   ------------------------------------------------------------
   EXPECTED DATA SOURCES (choose any; script supports all)
   A) JSON script tags (recommended, easiest)
      - <script id="countriesData"  type="application/json">[...]</script>
      - <script id="countriesData2" type="application/json">[...]</script> (optional chunks)
      - <script id="sectorsData"    type="application/json">[...]</script>
      - <script id="metiersData"    type="application/json">[...]</script>
      - (chunks also supported: metiersData2, metiersData3, ...)

      Minimal fields expected:
        Pays item:    { "iso": "FR", "name": "France", "langue_finale": "fr" }
        Secteur item: { "id": "xxx" or "slug": "finance", "name": "Finance" }
        Metier item:  { "slug": "directeur-financier", "name": "Directeur financier",
                        "secteur": "ID_or_slug_or_name" }  // field name EXACT: "Secteur d’activité" in CMS
      Notes:
        - Because Webflow JSON embedding can vary, the loader is flexible:
          it tries common keys and normalizes to (iso, name, slug/id, secteurRef).

   B) Hidden DOM lists with data attributes (if you prefer)
      - <div data-ulydia-countries hidden>
          <div data-country data-iso="FR" data-name="France" data-lang="fr"></div>
        </div>
      - <div data-ulydia-sectors hidden>
          <div data-sector data-id="finance" data-name="Finance"></div>
        </div>
      - <div data-ulydia-metiers hidden>
          <div data-metier data-slug="directeur-financier" data-name="Directeur financier"
               data-secteur="finance"></div>
        </div>

   ------------------------------------------------------------
   API EXPECTATIONS
   This script fetches job page data from your Worker:
     GET {WORKER_URL}/v1/metier-page?slug=...&iso=...
     Headers: x-proxy-secret OR x-ulydia-proxy-secret = PROXY_SECRET

   Response (flexible; script checks many keys):
     {
       ok: true,
       metier: { slug, name, description, ... },
       pays: { iso, langue_finale, banners: { wide, square } },
       sponsor: { logo_1, logo_2, link, ... } OR metier.sponsor
       blocs: [ { title, content_html, ... }, ... ] OR metier_pays_bloc
       faq:   [ { question, answer_html }, ... ]
     }

   ------------------------------------------------------------
   Webflow page setup (minimum)
   - Add an empty container:
       <div id="ulydia-metier-root"></div>

   - Load scripts:
       <script src="https://ulydia-assets.pages.dev/assets/ulydia-ui.v2.js"></script>
       <script src="https://ulydia-assets.pages.dev/assets/metier-page.js?v=5.1"></script>

   - Optional: enable debug
       <script>window.__METIER_PAGE_DEBUG__ = true;</script>
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V511__) return;
  window.__ULYDIA_METIER_PAGE_V511__ = true;
  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  // Always surface file/line for easier debugging
  window.addEventListener("error", (e) => {
    try {
      console.log("[metier-page.v5.1.3][window.error]", e.message, "file:", e.filename, "line:", e.lineno, "col:", e.colno);
    } catch(_) {}
  });


  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier-page.v5.1.3]", ...a); };

  // =========================================================
  // CONFIG (EDIT IF NEEDED)
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const IPINFO_TOKEN = "941b787cc13473"; // optional; used only to default country

  // This is the exact Webflow field label you confirmed
  const WEBFLOW_SECTOR_FIELD_LABEL = "Secteur d’activité";

  // Page routing: where to open the metier detail (shell page)
  // If you use /metier as shell: set METIER_SHELL_PATH = "/metier"
  // If you use another: set it here.
  const METIER_SHELL_PATH = "/metier";

  // =========================================================
  // DOM ROOT + BASE UI
  // =========================================================
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
    log("root auto-created");
  }

  // Quick style guard if UI kit not loaded yet
  const hasUIKit = () => !!document.documentElement.style.getPropertyValue("--ul-primary").trim()
                      || !!document.querySelector("[data-ulydia-ui-kit='v2']");
  function ensureUIKitLoaded() {
    // If user loaded ulydia-ui.v2.js already, do nothing.
    if (hasUIKit()) return Promise.resolve(true);

    // Try to auto-load from common path (non-breaking best effort)
    const guess = "https://ulydia-assets.pages.dev/assets/ulydia-ui.v2.js";
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = guess;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  // =========================================================
  // HELPERS
  // =========================================================
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]
  ));

  const pick = (...vals) => {
    for (const v of vals) {
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return "";
  };

  function parseJSONScriptByIdPrefix(prefix) {
    const out = [];
    const scripts = Array.from(document.querySelectorAll("script[type='application/json']"))
      .filter(s => (s.id || "").startsWith(prefix));
    for (const s of scripts) {
      const t = (s.textContent || "").trim();
      if (!t) continue;
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) out.push(...parsed);
        else if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) out.push(...parsed.items);
      } catch (e) {
        log("JSON parse error in", s.id, e);
      }
    }
    return out;
  }

  function parseDOMCountries() {
    const wrap = document.querySelector("[data-ulydia-countries]");
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll("[data-country]")).map(el => ({
      iso: pick(el.getAttribute("data-iso"), el.dataset.iso),
      name: pick(el.getAttribute("data-name"), el.dataset.name),
      langue_finale: pick(el.getAttribute("data-lang"), el.dataset.lang, el.getAttribute("data-langue_finale"))
    })).filter(x => x.iso && x.name);
  }

  function parseDOMSectors() {
    const wrap = document.querySelector("[data-ulydia-sectors]");
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll("[data-sector]")).map(el => ({
      id: pick(el.getAttribute("data-id"), el.dataset.id, el.getAttribute("data-slug"), el.dataset.slug),
      slug: pick(el.getAttribute("data-slug"), el.dataset.slug, el.getAttribute("data-id"), el.dataset.id),
      name: pick(el.getAttribute("data-name"), el.dataset.name)
    })).filter(x => x.id && x.name);
  }

  function parseDOMMetiers() {
    const wrap = document.querySelector("[data-ulydia-metiers]");
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll("[data-metier]")).map(el => ({
      slug: pick(el.getAttribute("data-slug"), el.dataset.slug),
      name: pick(el.getAttribute("data-name"), el.dataset.name),
      secteur: pick(el.getAttribute("data-secteur"), el.dataset.secteur)
    })).filter(x => x.slug && x.name);
  }

  function normalizeCountries(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    const norm = arr.map((c) => {
      const iso = pick(c.iso, c.ISO, c.code, c.country_code, c.alpha2);
      const name = pick(c.name, c.nom, c.title, c.pays, c.country);
      const lang = pick(c.langue_finale, c.lang, c.language_final, c.lang_finale);
      return { iso: iso.toUpperCase(), name, langue_finale: lang };
    }).filter(x => x.iso && x.name);
    // unique by iso
    const seen = new Set();
    return norm.filter(x => (seen.has(x.iso) ? false : (seen.add(x.iso), true)));
  }

  function normalizeSectors(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    const norm = arr.map((s) => {
      const id = pick(s.id, s._id, s.slug, s.Slug, s.reference, s.ref);
      const slug = pick(s.slug, s.Slug, s.id, s._id, s.reference);
      const name = pick(s.name, s.nom, s.title, s.Secteur, s.secteur);
      return { id, slug, name };
    }).filter(x => x.id && x.name);
    const seen = new Set();
    return norm.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  }

  function normalizeMetiers(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((m) => {
      const slug = pick(m.slug, m.Slug, m.metier_slug, m["Slug (auto)"], m["slug"]);
      // Name can be missing in some Webflow exports (or mapped incorrectly).
      // We always keep the item if slug exists, and fall back name -> slug.
      const nameRaw = pick(m.name, m.nom, m.title, m["Nom"], m["Métier"], m["Metier"]);
      // sector reference can appear under many shapes; we try:
      // - exact label "Secteur d’activité"
      // - normalized keys
      // - nested reference object
      const sectorField = m[WEBFLOW_SECTOR_FIELD_LABEL] ?? m.secteur ?? m.sector ?? m.secteurs ?? m["Secteur d'activité"];
      let secteur = "";
      if (typeof sectorField === "string") secteur = sectorField;
      else if (sectorField && typeof sectorField === "object") {
        secteur = pick(sectorField.id, sectorField._id, sectorField.slug, sectorField.name, sectorField.title);
      }
      const name = (nameRaw && String(nameRaw).trim()) ? String(nameRaw).trim() : (slug ? String(slug).trim() : "");
      return { slug, name, secteur };
    }).filter(x => x.slug);
  }

  function debounce(fn, ms=150){
    let t=null;
    return (...args) => {
      clearTimeout(t);
      t=setTimeout(()=>fn(...args), ms);
    };
  }

  function setAnchorImage(a, imgUrl, alt="") {
    if (!a) return;
    a.innerHTML = "";
    if (!imgUrl) {
      a.style.display = "none";
      return;
    }
    a.style.display = "";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = alt || "";
    img.src = imgUrl;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.display = "block";
    a.appendChild(img);
  }

  function fmtDateUS(iso) {
    // expects ISO date string; fallback raw
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso || "");
      return d.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"2-digit" });
    } catch { return String(iso || ""); }
  }

  // =========================================================
  // NETWORK
  // =========================================================
  async function fetchJSON(url, opts={}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        "accept": "application/json",
        "x-proxy-secret": PROXY_SECRET,
        "x-ulydia-proxy-secret": PROXY_SECRET,
        ...(opts.headers || {})
      }
    });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (ct.includes("application/json")) return data;
    return data;
  }

  async function detectISO() {
    // 1) query param country (preferred) or iso (legacy)
    const url = new URL(location.href);
    const qp = (url.searchParams.get("country") || url.searchParams.get("iso") || "").trim();
    if (qp) return qp.toUpperCase();

    // 2) cached
    const cached = sessionStorage.getItem("ulydia_iso");
    if (cached) return cached;

    // 3) IPinfo (best effort)
    try {
      if (!IPINFO_TOKEN) throw new Error("no token");
      const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`, { cache: "no-store" });
      const j = await r.json();
      const iso = String(j?.country || "").toUpperCase();
      if (iso) {
        sessionStorage.setItem("ulydia_iso", iso);
        return iso;
      }
    } catch (e) {
      log("ipinfo failed", e);
    }

    // 4) default
    return "FR";
  }

  function detectSlug() {
    // slug can be:
    // - query param ?slug=...
    // - last path segment on /fiche-metiers/xxx or /metier/xxx
    const url = new URL(location.href);
    const qp = (url.searchParams.get("metier") || url.searchParams.get("slug") || "").trim();
    if (qp) return qp;

    const p = url.pathname.replace(/\/+$/, "");
    const parts = p.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    // If last is known shell path (metier), no slug in path
    if (last === "metier") return "";
    // If page is template like /fiche-metiers/{slug}
    return last;
  }

  function openMetier({ slug, iso }) {
    const u = new URL(location.origin + METIER_SHELL_PATH);
    // New routing: /metier?metier=SLUG&country=XX
    u.searchParams.set("metier", slug);
    u.searchParams.set("country", String(iso || "").toUpperCase());
    location.href = u.toString();
  }

  // =========================================================
  // DATA LOADING (CMS)
  // =========================================================
  function loadCMS() {
    // 0) Prefer globals if Webflow injected arrays via inline <script> push()
    const gCountries = Array.isArray(window.__ULYDIA_COUNTRIES__) ? window.__ULYDIA_COUNTRIES__ : Array.isArray(window.__ULYDIA_PAYS__) ? window.__ULYDIA_PAYS__ : null;
    const gSectors   = Array.isArray(window.__ULYDIA_SECTEURS__) ? window.__ULYDIA_SECTEURS__ : Array.isArray(window.__ULYDIA_SECTORS__) ? window.__ULYDIA_SECTORS__ : null;
    const gMetiers   = Array.isArray(window.__ULYDIA_METIERS__) ? window.__ULYDIA_METIERS__ : Array.isArray(window.__ULYDIA_METIERS__) ? window.__ULYDIA_METIERS__ : null;
    if (gCountries?.length || gSectors?.length || gMetiers?.length) {
      return {
        countries: normalizeCountries(gCountries || []),
        sectors: normalizeSectors(gSectors || []),
        metiers: normalizeMetiers(gMetiers || [])
      };
    }

    // JSON scripts first
    const countriesRaw = [
      ...parseJSONScriptByIdPrefix("countriesData"),
      ...parseJSONScriptByIdPrefix("paysData"),
      ...parseJSONScriptByIdPrefix("countries")
    ];
    const sectorsRaw = [
      ...parseJSONScriptByIdPrefix("sectorsData"),
      ...parseJSONScriptByIdPrefix("secteursData"),
      ...parseJSONScriptByIdPrefix("sectors")
    ];
    const metiersRaw = [
      ...parseJSONScriptByIdPrefix("metiersData"),
      ...parseJSONScriptByIdPrefix("metierData"),
      ...parseJSONScriptByIdPrefix("jobsData"),
      ...parseJSONScriptByIdPrefix("metiers")
    ];

    const domCountries = parseDOMCountries();
    const domSectors = parseDOMSectors();
    const domMetiers = parseDOMMetiers();

    const countries = normalizeCountries(countriesRaw.length ? countriesRaw : domCountries);
    const sectors   = normalizeSectors(sectorsRaw.length ? sectorsRaw : domSectors);
    const metiers   = normalizeMetiers(metiersRaw.length ? metiersRaw : domMetiers);

    return { countries, sectors, metiers };
  }

  // =========================================================
  // UI RENDERING
  // =========================================================
  function injectLocalCSS() {
    if (document.getElementById("ulydia-metier-v51-css")) return;
    const css = document.createElement("style");
    css.id = "ulydia-metier-v51-css";
    css.textContent = `
      /* minimal layout helpers; UI kit supplies the rest */
      #ulydia-metier-root { max-width: 1100px; margin: 0 auto; padding: 24px 16px 80px; }
      .ul-row { display:flex; gap: 12px; flex-wrap: wrap; align-items: center; }
      .ul-col { flex:1 1 220px; min-width: 220px; }
      .ul-input, .ul-select {
        width:100%;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid var(--ul-border, #e5e7eb);
        background: var(--ul-surface, #fff);
        font-family: var(--ul-font, Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial);
        outline: none;
      }
      .ul-input:focus, .ul-select:focus { border-color: var(--ul-primary, #c00102); box-shadow: 0 0 0 3px rgba(192,1,2,.12); }
      .ul-muted { color: var(--ul-muted, #6b7280); }
      .ul-h1 { font-size: 34px; line-height: 1.15; margin: 0; }
      .ul-h2 { font-size: 20px; margin: 22px 0 10px; }
      .ul-card {
        border: 1px solid var(--ul-border, #e5e7eb);
        border-radius: 18px;
        background: var(--ul-surface, #fff);
        box-shadow: var(--ul-shadow-sm, 0 6px 18px rgba(17,24,39,.06));
      }
      .ul-card-pad { padding: 16px; }
      .ul-divider { height: 1px; background: var(--ul-border, #e5e7eb); margin: 16px 0; }
      .ul-banner-wide {
        width: 680px; height: 120px;
        max-width: 100%;
        border-radius: 18px;
        overflow: hidden;
        display: block;
        border: 1px solid var(--ul-border, #e5e7eb);
        box-shadow: var(--ul-shadow-sm, 0 6px 18px rgba(17,24,39,.06));
      }
      .ul-banner-square {
        width: 260px; height: 260px;
        border-radius: 18px;
        overflow: hidden;
        display: block;
        border: 1px solid var(--ul-border, #e5e7eb);
        box-shadow: var(--ul-shadow-sm, 0 6px 18px rgba(17,24,39,.06));
      }
      .ul-list { display: grid; gap: 10px; margin-top: 10px; }
      .ul-item {
        display:flex; justify-content: space-between; align-items:center;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid var(--ul-border, #e5e7eb);
        background: var(--ul-surface, #fff);
        cursor: pointer;
      }
      .ul-item:hover { border-color: var(--ul-primary, #c00102); }
      .ul-chip { font-size: 12px; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--ul-border, #e5e7eb); }
      .ul-grid-detail { display:grid; gap: 16px; grid-template-columns: 1fr; }
      @media (min-width: 980px){
        .ul-grid-detail { grid-template-columns: 1fr 280px; align-items: start; }
      }
      .ul-richtext :is(p,li) { line-height: 1.55; }
      .ul-faq-q { font-weight: 700; margin: 12px 0 6px; }
      .ul-error { padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(192,1,2,.35); background: rgba(192,1,2,.06); }
      .ul-skel { opacity: .7; }
    `;
    document.head.appendChild(css);
  }

  function renderShell({ isoDefault, cms }) {
    const { countries, sectors, metiers } = cms;

    ROOT.innerHTML = `
      <div class="ul-card ul-card-pad" style="margin-bottom:16px;">
        <div class="ul-row" style="gap:14px;">
          <div class="ul-col" style="min-width:260px;">
            <div class="ul-muted" style="font-size:12px; margin-bottom:6px;">Search</div>
            <input class="ul-input" id="ulSearch" placeholder="Search a job (e.g., Directeur financier)" />
          </div>

          <div class="ul-col">
            <div class="ul-muted" style="font-size:12px; margin-bottom:6px;">Country</div>
            <select class="ul-select" id="ulCountry"></select>
          </div>

          <div class="ul-col">
            <div class="ul-muted" style="font-size:12px; margin-bottom:6px;">Sector</div>
            <select class="ul-select" id="ulSector"></select>
          </div>
        </div>

        <div class="ul-divider"></div>

        <div class="ul-muted" style="font-size:12px; margin-bottom:10px;">
          Select a job to open the detail page (banner + blocs + FAQ).
        </div>

        <div id="ulResults" class="ul-list"></div>
      </div>

      <div id="ulDetail"></div>
    `;

    // Populate selects
    const countrySel = ROOT.querySelector("#ulCountry");
    const sectorSel  = ROOT.querySelector("#ulSector");
    const searchInp  = ROOT.querySelector("#ulSearch");
    const resultsDiv = ROOT.querySelector("#ulResults");
    const detailDiv  = ROOT.querySelector("#ulDetail");

    const mkOpt = (value, label) => {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      return o;
    };

    // countries
    countrySel.appendChild(mkOpt("", "All countries"));
    for (const c of countries.sort((a,b)=>a.name.localeCompare(b.name))) {
      const o = mkOpt(c.iso, `${c.name} (${c.iso})`);
      if (c.iso === isoDefault) o.selected = true;
      countrySel.appendChild(o);
    }

    // sectors
    sectorSel.appendChild(mkOpt("", "All sectors"));
    for (const s of sectors.sort((a,b)=>a.name.localeCompare(b.name))) {
      sectorSel.appendChild(mkOpt(s.id, s.name));
    }

    const getSelectedIso = () => (countrySel.value || isoDefault || "").toUpperCase();
    const getSelectedSector = () => sectorSel.value || "";
    const getSearch = () => (searchInp.value || "").trim().toLowerCase();

    function metierMatches(m, sectorId, q) {
      if (sectorId) {
        // m.secteur may be id OR slug OR name depending on export
        const ms = String(m.secteur || "").toLowerCase();
        const sid = String(sectorId).toLowerCase();
        if (!ms) return false;
        if (ms !== sid) {
          // also match by sector name/slug lookup if needed
          const sect = sectors.find(s => String(s.id).toLowerCase() === sid || String(s.slug||"").toLowerCase() === sid);
          const sName = (sect?.name || "").toLowerCase();
          const sSlug = (sect?.slug || "").toLowerCase();
          if (ms !== sSlug && ms !== sName) return false;
        }
      }
      if (q) {
        const hay = (m.name + " " + m.slug).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }

    function renderResults() {
      const sectorId = getSelectedSector();
      const q = getSearch();

      const filtered = metiers.filter(m => metierMatches(m, sectorId, q)).slice(0, 40);

      resultsDiv.innerHTML = "";
      if (!filtered.length) {
        resultsDiv.innerHTML = `<div class="ul-muted">No results.</div>`;
        return;
      }

      for (const m of filtered) {
        const el = document.createElement("div");
        el.className = "ul-item";
        const chip = sectorId ? `<span class="ul-chip">${esc(sectors.find(s=>s.id===sectorId)?.name || "Sector")}</span>` : "";
        el.innerHTML = `
          <div>
            <div style="font-weight:700;">${esc(m.name)}</div>
            <div class="ul-muted" style="font-size:12px;">${esc(m.slug)}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${chip}
            <span class="ul-muted" style="font-size:12px;">Open →</span>
          </div>
        `;
        el.addEventListener("click", () => openMetier({ slug: m.slug, iso: getSelectedIso() }));
        resultsDiv.appendChild(el);
      }
    }

    const rerender = debounce(renderResults, 120);
    countrySel.addEventListener("change", () => {
      sessionStorage.setItem("ulydia_iso", getSelectedIso());
      // We don't filter metiers by country here because metier list is global.
      // Country mainly affects banner language + per-country blocs loaded from API.
    });
    sectorSel.addEventListener("change", rerender);
    searchInp.addEventListener("input", rerender);

    renderResults();

    // If we are currently on a metier detail view (slug present), load and render it.
    const slug = detectSlug();
    const iso = getSelectedIso();
    if (slug) {
      // keep selected country synced with ISO from URL or detection
      if (iso) countrySel.value = iso;
      renderDetailLoading(detailDiv);
      fetchAndRenderDetail({ slug, iso, detailDiv });
    } else {
      detailDiv.innerHTML = "";
    }
  }

  function renderDetailLoading(detailDiv) {
    detailDiv.innerHTML = `
      <div class="ul-card ul-card-pad ul-skel">
        <div class="ul-muted" style="margin-bottom:10px;">Loading…</div>
        <div style="height:18px; width: 55%; background: var(--ul-border,#e5e7eb); border-radius: 10px;"></div>
        <div style="height:12px; width: 80%; margin-top:12px; background: var(--ul-border,#e5e7eb); border-radius: 10px;"></div>
        <div style="height:12px; width: 70%; margin-top:8px; background: var(--ul-border,#e5e7eb); border-radius: 10px;"></div>
      </div>
    `;
  }

  function normalizeApi(meta) {
    const metier = meta?.metier || meta?.job || meta?.data?.metier || {};
    const pays   = meta?.pays || meta?.country || meta?.data?.pays || {};
    const sponsor = meta?.sponsor || metier?.sponsor || meta?.data?.sponsor || {};

    const banners = pays?.banners || pays?.banner || {};
    const fallbackWide = pick(banners.wide, pays?.banner_wide, pays?.banniere_wide, pays?.banniere, "");
    const fallbackSquare = pick(banners.square, pays?.banner_square, pays?.banniere_square, "");

    // Sponsor logos can be logo_1/logo_2 OR logo_square/logo_wide
    const sponsorWide = pick(sponsor.logo_2, sponsor.logo_wide, sponsor.wide, sponsor.banner_wide, "");
    const sponsorSquare = pick(sponsor.logo_1, sponsor.logo_square, sponsor.square, sponsor.banner_square, "");
    const sponsorLink = pick(sponsor.link, sponsor.url, sponsor.website, sponsor.href, sponsor.sponsor_link, "");

    const wide = sponsorWide || fallbackWide;
    const square = sponsorSquare || fallbackSquare;
    const click = sponsorLink || pick(sponsor.sponsor_link, metier?.sponsor_link, "");

    const blocs = meta?.blocs || meta?.metier_pays_bloc || meta?.blocks || meta?.data?.blocs || [];
    const faq   = meta?.faq || meta?.faqs || meta?.data?.faq || [];

    return { metier, pays, wide, square, click, blocs, faq };
  }

  async function fetchAndRenderDetail({ slug, iso, detailDiv }) {
    try {
      const url = `${WORKER_URL}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
      const meta = await fetchJSON(url, { method: "GET" });
      log("metier-page data", meta);

      const n = normalizeApi(meta);
      renderDetail({ ...n, slug, iso, detailDiv });
    } catch (e) {
      detailDiv.innerHTML = `<div class="ul-error"><b>Error</b><div style="margin-top:6px;">${esc(e.message || e)}</div></div>`;
    }
  }

  function renderDetail({ metier, pays, wide, square, click, blocs, faq, slug, iso, detailDiv }) {
    const name = pick(metier.name, metier.nom, metier.title, slug);
    const desc = pick(metier.description, metier.desc, metier.summary, metier.resume, metier["Description"], "");

    // Search bar must be ABOVE the job title (requirement)
    detailDiv.innerHTML = `
      <div class="ul-card ul-card-pad">
        <div class="ul-row" style="justify-content: space-between;">
          <div style="flex: 1 1 420px; min-width: 280px;">
            <div class="ul-muted" style="font-size:12px; margin-bottom:6px;">Quick search</div>
            <input class="ul-input" id="ulQuickSearch" placeholder="Type to search in the list above…" />
            <div class="ul-muted" style="font-size:12px; margin-top:8px;">
              Country: <b>${esc(pick(pays.name, pays.nom, iso))}</b> — ISO <b>${esc(iso)}</b>
              ${pays.langue_finale ? ` — Lang: <b>${esc(pays.langue_finale)}</b>` : ""}
            </div>
          </div>

          <div style="display:flex; gap:12px; align-items: start; justify-content: flex-end; flex: 0 0 auto;">
            <a class="ul-banner-square" id="ulBannerSquare" href="${click ? esc(click) : "#"}" ${click ? `target="_blank" rel="noopener"` : ""} aria-label="Sponsor square banner"></a>
          </div>
        </div>

        <div style="margin-top:16px; display:flex; justify-content:center;">
          <a class="ul-banner-wide" id="ulBannerWide" href="${click ? esc(click) : "#"}" ${click ? `target="_blank" rel="noopener"` : ""} aria-label="Sponsor wide banner"></a>
        </div>

        <div class="ul-divider"></div>

        <h1 class="ul-h1">${esc(name)}</h1>

        ${desc ? `<div class="ul-richtext" style="margin-top:10px;">${desc}</div>` : ""}

        ${renderMetaLine(metier)}

        ${renderBlocs(blocs)}

        ${renderFAQ(faq)}
      </div>
    `;

    // Banner images
    const wideA = detailDiv.querySelector("#ulBannerWide");
    const squareA = detailDiv.querySelector("#ulBannerSquare");
    setAnchorImage(wideA, wide, "Sponsor banner wide");
    setAnchorImage(squareA, square, "Sponsor banner square");

    // If no image, hide square
    if (!square) squareA.style.display = "none";

    // Quick search mirrors main search input if present
    const qs = detailDiv.querySelector("#ulQuickSearch");
    const mainSearch = ROOT.querySelector("#ulSearch");
    if (qs && mainSearch) {
      qs.value = mainSearch.value || "";
      qs.addEventListener("input", () => {
        mainSearch.value = qs.value;
        mainSearch.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
  }

  function renderMetaLine(metier) {
    // Optional: show dates/levels if present, with US formatting
    const created = pick(metier.createdAt, metier.created_at, metier.date_creation, "");
    const updated = pick(metier.updatedAt, metier.updated_at, metier.date_update, "");
    const level = pick(metier.level, metier.niveau, "");
    const pieces = [];
    if (level) pieces.push(`<span class="ul-chip">${esc(level)}</span>`);
    if (created) pieces.push(`<span class="ul-chip">Created ${esc(fmtDateUS(created))}</span>`);
    if (updated) pieces.push(`<span class="ul-chip">Updated ${esc(fmtDateUS(updated))}</span>`);
    if (!pieces.length) return "";
    return `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:14px;">${pieces.join("")}</div>`;
  }

  function renderBlocs(blocs) {
    const arr = Array.isArray(blocs) ? blocs : [];
    const clean = arr
      .map((b) => ({
        title: pick(b.title, b.titre, b.name, b.nom, ""),
        html: pick(b.content_html, b.html, b.content, b.texte, b.richtext, "")
      }))
      .filter(x => x.title || x.html);

    if (!clean.length) return "";

    const items = clean.map((b) => `
      <div style="margin-top:18px;">
        ${b.title ? `<div class="ul-h2">${esc(b.title)}</div>` : ""}
        ${b.html ? `<div class="ul-richtext">${b.html}</div>` : ""}
      </div>
    `).join("");

    return `
      <div class="ul-divider"></div>
      <div>
        <div class="ul-h2">Country-specific blocks</div>
        ${items}
      </div>
    `;
  }

  function renderFAQ(faq) {
    const arr = Array.isArray(faq) ? faq : [];
    const clean = arr
      .map((f) => ({
        q: pick(f.question, f.q, f.title, f.titre, ""),
        a: pick(f.answer_html, f.answer, f.a_html, f.html, f.content, "")
      }))
      .filter(x => x.q || x.a);

    if (!clean.length) return "";

    const items = clean.map((f) => `
      <div>
        ${f.q ? `<div class="ul-faq-q">${esc(f.q)}</div>` : ""}
        ${f.a ? `<div class="ul-richtext">${f.a}</div>` : ""}
      </div>
    `).join("");

    return `
      <div class="ul-divider"></div>
      <div>
        <div class="ul-h2">FAQ</div>
        ${items}
      </div>
    `;
  }

  // =========================================================
  // MAIN
  // =========================================================
  async function main() {
    injectLocalCSS();
    await ensureUIKitLoaded();

    const iso = await detectISO();
    const cms = loadCMS();
    log("cms loaded", cms);

    renderShell({ isoDefault: iso, cms });
  }

  main().catch((e) => console.error("[metier-page.v5.1.3] fatal", e));
})();
