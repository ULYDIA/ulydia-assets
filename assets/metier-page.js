/* metier-page.js — Ulydia (V6.2)
   ✅ Layout aligned with propal1 (Tailwind CDN + same structure)
   ✅ Fixes corrupted sponsor property access (no "...").
   ✅ Robust country banner extraction (Webflow field-name variations)
   ✅ Default country on load = visitor ISO (IPinfo) + reflects in filter
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V62__) return;
  window.__ULYDIA_METIER_PAGE_V62__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier-page]", ...a); };

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
  // CONFIG (keep your env globals if you already set them in <head>)
  // =========================
  const WORKER_URL   = window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const IPINFO_TOKEN = window.ULYDIA_IPINFO_TOKEN || "941b787cc13473";

  const SPONSOR_PATH = "/sponsor";

  // Webflow JSON sources (script tags with JSON text)
  const COUNTRIES_SCRIPT_IDS = ["countriesData", "countriesData2", "countriesData3"];
  const SECTORS_SCRIPT_IDS   = ["sectorsData", "sectorsData2", "sectorsData3"];
  const METIERS_SCRIPT_IDS   = ["metiersData", "metiersData2", "metiersData3"];

  // Worker endpoints (expected)
  const EP_COUNTRY_MAP  = "/v1/countries-map";
  const EP_METIERS      = "/v1/metiers";
  const EP_METIER_PAGE  = "/v1/metier-page"; // ?slug= &iso=

  // =========================
  // Helpers
  // =========================
  const safeText = (v) => (v == null ? "" : String(v));
  const isUrl = (s) => /^https?:\/\/.+/i.test(s || "");
  const firstUrlInAny = (v) => {
    if (!v) return "";
    if (typeof v === "string") {
      const s = v.trim();
      if (isUrl(s)) return s;
      // sometimes "url, url" or "url | url"
      const m = s.match(/https?:\/\/[^\s"'<>]+/i);
      return m ? m[0] : "";
    }
    if (Array.isArray(v)) {
      for (const it of v) {
        const u = firstUrlInAny(it);
        if (u) return u;
      }
      return "";
    }
    if (typeof v === "object") {
      // common shapes: {url}, {src}, {value}, {0:{url}}
      const direct = firstUrlInAny(v.url || v.src || v.href || v.value);
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
    try { data = txt ? JSON.parse(txt) : null; } catch { /* ignore */ }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url} :: ${txt.slice(0,200)}`);
    return data;
  };

  const readJSONFromScriptTags = (ids) => {
    const out = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const raw = (el.textContent || el.innerText || "").trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) out.push(...parsed);
        else if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) out.push(...parsed.items);
        else out.push(parsed);
      } catch (e) {
        log("Bad JSON in", id, e);
      }
    }
    return out;
  };

  // Guess banner fields in Webflow country objects (field names are unstable)
  function guessCountryBanners(raw){
    const obj = raw || {};
    const keys = Object.keys(obj);
    const urls = [];
    for (const k of keys) {
      const v = obj[k];
      const u = firstUrlInAny(v);
      if (!u) continue;
      const lk = k.toLowerCase();
      // take only banner-ish fields (avoid flags, icons)
      if (/(banni|banner|sponsor|attente)/i.test(lk)) {
        urls.push({ k: lk, u });
      }
    }
    // if Worker already gave banners.*
    const workerWide   = firstUrlInAny(obj?.banners?.wide || obj?.banners?.banner_wide);
    const workerSquare = firstUrlInAny(obj?.banners?.square || obj?.banners?.banner_square);
    if (workerWide || workerSquare) {
      return { wide: workerWide || workerSquare, square: workerSquare || workerWide };
    }

    // heuristics: "wide"/"horizontal"/"large"/"1" => wide ; "square"/"logo"/"2" => square
    let wide = "";
    let square = "";

    const pick = (rx) => {
      const hit = urls.find(x => rx.test(x.k));
      return hit ? hit.u : "";
    };

    wide = pick(/wide|horizontal|large|landscape|banniere_1|banner1|attente.*1|sponsor.*1/);
    square = pick(/square|logo|carre|banniere_2|banner2|attente.*2|sponsor.*2/);

    if (!wide && urls.length) wide = urls[0].u;
    if (!square && urls.length > 1) square = urls[1].u;

    // fallback: duplicate
    if (!wide && square) wide = square;
    if (!square && wide) square = wide;

    return { wide, square };
  }

  function normCountry(c){
    if (!c || typeof c !== "object") return null;
    const iso = safeText(c.iso || c.code || c.alpha2 || c.ISO || c.iso2 || "").trim().toUpperCase();
    const name = safeText(c.name || c.nom || c.pays || c.title || iso).trim();
    const lang = safeText(c.langue_finale || c.lang_finale || c.langue || c.lang || c.language || "").trim().toLowerCase();
    const b = guessCountryBanners(c);
    return { iso, name, lang, banners: b, raw: c };
  }

  function normSector(s){
    if (!s || typeof s !== "object") return null;
    const id = safeText(s.slug || s.id || s.value || s.code || "").trim();
    const name = safeText(s.nom || s.name || s.title || id).trim();
    return { id, name, raw: s };
  }

  function normMetier(m){
    if (!m || typeof m !== "object") return null;
    const slug = safeText(m.slug || m.Slug || m.metier_slug || m.value || "").trim();
    const name = safeText(m.nom || m.name || m.title || slug).trim();
    return { slug, name, raw: m, fields: m.fields || m };
  }

  const pick = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v == null) continue;
      const s = safeText(v).trim();
      if (s) return s;
    }
    return "";
  };

  const FIELD_MAP = {
    accroche: ["accroche", "tagline", "resume", "subtitle", "description_courte"],
    overview: ["vue_ensemble", "overview", "description", "resume_long", "presentation"],
    missions: ["missions", "mission", "missions_principales"],
    competences: ["competences", "competence", "skills"],
    environnements: ["environnements", "environment", "contextes"],
    profil: ["profil_recherche", "profil", "profile"],
    evolutions: ["evolutions", "evolution", "perspectives"],
  };

  const nlToBullets = (txt) => {
    const t = safeText(txt).trim();
    if (!t) return [];
    // split on newlines or "•" or "-"
    const raw = t.split(/\n+|•\s*|\r+|-\s+/).map(x => x.trim()).filter(Boolean);
    // dedupe
    return [...new Set(raw)];
  };

  // =========================
  // Tailwind + CSS (like propal1)
  // =========================
  function ensureTailwind(){
    if (document.querySelector('script[data-ul-tailwind="1"]')) return;
    const s = document.createElement("script");
    s.src = "https://cdn.tailwindcss.com";
    s.async = true;
    s.setAttribute("data-ul-tailwind", "1");
    document.head.appendChild(s);
  }

  function injectCSS(){
    if (document.getElementById("ul-metier-css-v62")) return;
    const st = document.createElement("style");
    st.id = "ul-metier-css-v62";
    st.textContent = `
      :root{
        --bg: #f6f8fb;
        --card: #ffffff;
        --text: #0f172a;
        --muted: rgba(15,23,42,.65);
        --border: rgba(15,23,42,.10);
        --radius-lg: 18px;
        --shadow: 0 12px 30px rgba(15,23,42,.08);
      }
      body{ background: var(--bg); }
      /* Keep Webflow from squeezing our layout */
      #ulydia-metier-root{ width:100%; }
      .ul-click:active{ transform: translateY(1px); }
    `;
    document.head.appendChild(st);
  }

  // =========================
  // Shell (matches screenshot structure)
  // =========================
  function renderShell(){
    ROOT.innerHTML = `
<div class="min-h-screen w-full" style="background: var(--bg); color: var(--text);">
  <div class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b" style="border-color: var(--border);">
    <div class="max-w-6xl mx-auto px-4 py-3">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="text-xs font-semibold" style="color: var(--muted);">🌍 Pays / Région</label>
          <select id="ulCountry" class="mt-1 w-full px-3 py-2 rounded-lg border bg-white" style="border-color: var(--border);"></select>
        </div>
        <div>
          <label class="text-xs font-semibold" style="color: var(--muted);">🏢 Secteur d’activité</label>
          <select id="ulSector" class="mt-1 w-full px-3 py-2 rounded-lg border bg-white" style="border-color: var(--border);"></select>
        </div>
        <div class="relative">
          <label class="text-xs font-semibold" style="color: var(--muted);">🔍 Rechercher un métier</label>
          <input id="ulJob" class="mt-1 w-full px-3 py-2 rounded-lg border bg-white" style="border-color: var(--border);" placeholder="Ex: Directeur financier, Comptable…" autocomplete="off" />
          <div id="ulJobSuggest" class="absolute left-0 right-0 mt-2 bg-white rounded-lg border-2 overflow-hidden z-50 hidden" style="border-color: var(--border); max-height: 320px; overflow-y:auto;"></div>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between">
        <button id="ulResetBtn" class="ul-click flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg border" style="border-color: var(--border); color: var(--muted);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 3" /><path d="M3 21v-5h5" /></svg>
          Réinitialiser les filtres
        </button>
        <div class="text-xs font-semibold" style="color: var(--muted);"><span id="ulResultCount">—</span> fiche(s) métier</div>
      </div>
    </div>
  </div>

  <div class="max-w-6xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border" style="border-color: var(--border); box-shadow: var(--shadow);">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center" style="background:#6d6afc;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </div>
        <div class="flex-1">
          <div class="text-xs font-bold inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background: rgba(109,106,252,.10); color:#4f46e5;">
            💼 Fiche Métier
          </div>
          <h1 id="ulJobTitle" class="mt-2 text-3xl font-black tracking-tight">Choisis un métier</h1>
          <p id="ulJobSub" class="mt-1 text-sm font-semibold" style="color: var(--muted);">Sélectionne un pays → un secteur → un métier.</p>

          <div class="mt-4 flex justify-center">
            <a id="ulBannerWide" class="sponsor-banner-wide block" href="#" target="_blank" rel="noopener noreferrer" style="display:none;">
              <div class="relative w-[680px] h-[120px] max-w-full rounded-2xl overflow-hidden border bg-white ul-click" style="border-color: var(--border); box-shadow: var(--shadow);">
                <img id="ulBannerWideImg" class="w-full h-full object-cover" alt="Bannière sponsor" />
                <div id="ulBannerWidePill" class="absolute left-4 bottom-3 px-3 py-1 rounded-full text-xs font-black bg-white/80 backdrop-blur">Sponsor</div>
              </div>
            </a>
          </div>
        </div>
        <div class="hidden md:flex flex-col gap-2">
          <button id="ulShareBtn" class="ul-click text-sm font-semibold px-4 py-2 rounded-lg border" style="border-color: var(--border);">Copier le lien</button>
          <a id="ulSponsorBtn" class="ul-click text-sm font-black px-4 py-2 rounded-lg text-white text-center" style="background:#6d6afc;" href="#" target="_blank" rel="noopener noreferrer">Sponsoriser</a>
        </div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6" id="ulContent">
        <div class="bg-white rounded-2xl p-6 border" style="border-color: var(--border); box-shadow: var(--shadow);">
          <div class="text-sm font-semibold" style="color: var(--muted);">Sélectionne un pays, puis un secteur, puis un métier.</div>
        </div>
      </div>

      <aside class="space-y-6">
        <div class="bg-white rounded-2xl p-6 border" style="border-color: var(--border); box-shadow: var(--shadow);">
          <div class="text-sm font-black mb-4">📌 Sponsor</div>
          <a id="ulBannerSquare" href="#" target="_blank" rel="noopener noreferrer" style="display:none;">
            <div class="relative w-full aspect-square rounded-2xl overflow-hidden border bg-white ul-click" style="border-color: var(--border);">
              <img id="ulBannerSquareImg" class="w-full h-full object-contain p-6" alt="Logo sponsor" />
            </div>
          </a>
          <div id="ulNoBannerNote" class="text-xs font-semibold mt-3" style="color: var(--muted); display:none;">
            Aucune bannière disponible pour ce pays.
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 border" style="border-color: var(--border); box-shadow: var(--shadow);">
          <div class="text-sm font-black mb-3">🧩 Informations</div>
          <div class="text-sm font-semibold" style="color: var(--muted);" id="ulSideInfo">—</div>
        </div>
      </aside>
    </div>

    <div class="py-10 text-center text-xs font-semibold" style="color: var(--muted);">© Ulydia — Fiche métier</div>
  </div>
</div>
    `;
  }

  function card(title, colorBg, innerHtml){
    return `
<div class="bg-white rounded-2xl border overflow-hidden" style="border-color: var(--border); box-shadow: var(--shadow);">
  <div class="px-5 py-3 text-sm font-black" style="background:${colorBg};">${title}</div>
  <div class="p-5 text-sm font-medium leading-6">${innerHtml}</div>
</div>`;
  }

  function renderList(items){
    if (!items || !items.length) return `<div class="text-sm font-semibold" style="color: var(--muted);">—</div>`;
    return `<ul class="list-disc pl-5 space-y-1">${items.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  }

  function escapeHtml(s){
    return safeText(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }

  function fillSelect(el, items, placeholder){
    el.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    el.appendChild(opt0);
    for (const it of items) {
      const opt = document.createElement("option");
      opt.value = it.value;
      opt.textContent = it.label;
      el.appendChild(opt);
    }
  }

  // =========================
  // Data loading
  // =========================
  async function detectVisitorISO(){
    // prefer cached
    const key = "__ULYDIA_VISITOR_ISO__";
    if (window[key]) return window[key];

    try{
      if (!IPINFO_TOKEN) throw new Error("Missing IPINFO_TOKEN");
      const url = `https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`;
      const data = await fetchJSON(url);
      const iso = safeText(data?.country || "").trim().toUpperCase();
      if (iso) { window[key] = iso; return iso; }
    }catch(e){
      log("ipinfo failed", e);
    }
    window[key] = "FR";
    return "FR";
  }

  async function fetchMetierDetail({ slug, iso }){
    const url = new URL(WORKER_URL + EP_METIER_PAGE);
    url.searchParams.set("slug", slug);
    url.searchParams.set("iso", iso);
    return await fetchJSON(url.toString(), {
      headers: {
        "x-ulydia-proxy-secret": PROXY_SECRET,
        "x-proxy-secret": PROXY_SECRET
      }
    });
  }

  // Suggest UI
  function showSuggest(box, items, onPick){
    box.innerHTML = items.map(it => `
      <button class="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm font-semibold" data-slug="${escapeHtml(it.slug)}">
        ${escapeHtml(it.name)}
      </button>
    `).join("");
    box.classList.remove("hidden");
    box.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const slug = btn.getAttribute("data-slug");
        onPick(slug);
        box.classList.add("hidden");
      });
    });
  }

  // =========================
  // Main
  // =========================
  let countries = [];
  let sectors = [];
  let metiers = [];
  let metiersBySector = new Map();

  async function main(){
    ensureTailwind();
    injectCSS();
    renderShell();

    const elCountry = document.getElementById("ulCountry");
    const elSector  = document.getElementById("ulSector");
    const elJob     = document.getElementById("ulJob");
    const elSuggest = document.getElementById("ulJobSuggest");
    const elReset   = document.getElementById("ulResetBtn");
    const elCount   = document.getElementById("ulResultCount");
    const elTitle   = document.getElementById("ulJobTitle");
    const elSub     = document.getElementById("ulJobSub");
    const elContent = document.getElementById("ulContent");
    const elWideA   = document.getElementById("ulBannerWide");
    const elWideImg = document.getElementById("ulBannerWideImg");
    const elWidePill= document.getElementById("ulBannerWidePill");
    const elSqA     = document.getElementById("ulBannerSquare");
    const elSqImg   = document.getElementById("ulBannerSquareImg");
    const elNoBanner= document.getElementById("ulNoBannerNote");
    const elSponsorBtn = document.getElementById("ulSponsorBtn");
    const elShareBtn   = document.getElementById("ulShareBtn");
    const elSideInfo   = document.getElementById("ulSideInfo");

    // Load Webflow JSON first (offline-friendly)
    countries = readJSONFromScriptTags(COUNTRIES_SCRIPT_IDS).map(normCountry).filter(Boolean);
    sectors   = readJSONFromScriptTags(SECTORS_SCRIPT_IDS).map(normSector).filter(Boolean);
    metiers   = readJSONFromScriptTags(METIERS_SCRIPT_IDS).map(normMetier).filter(Boolean);

    // counts
    elCount.textContent = String(metiers.length || "—");

    // Default country = visitor ISO (important user requirement)
    const visitorISO = await detectVisitorISO();
    log("visitorISO", visitorISO);

    // Fill selects
    const countryOptions = countries
      .filter(c => c.iso)
      .sort((a,b) => (a.name||a.iso).localeCompare(b.name||b.iso))
      .map(c => ({ value: c.iso, label: `${c.name} (${c.iso})` }));
    fillSelect(elCountry, countryOptions, "Choisir un pays…");

    const sectorOptions = sectors
      .filter(s => s.id)
      .sort((a,b) => (a.name||a.id).localeCompare(b.name||b.id))
      .map(s => ({ value: s.id, label: s.name }));
    fillSelect(elSector, sectorOptions, "Choisir un secteur…");

    // Set default country if present
    if (visitorISO && countryOptions.some(o => o.value === visitorISO)) {
      elCountry.value = visitorISO;
    }

    // Sponsor CTA always points to sponsor page
    const sponsorCTA = new URL(location.origin + SPONSOR_PATH);
    elSponsorBtn.href = sponsorCTA.toString();

    // share
    elShareBtn.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(location.href);
        elShareBtn.textContent = "Lien copié ✅";
        setTimeout(()=> elShareBtn.textContent = "Copier le lien", 1200);
      }catch{
        elShareBtn.textContent = "Copie impossible";
        setTimeout(()=> elShareBtn.textContent = "Copier le lien", 1200);
      }
    });

    // Build metiersBySector if data includes sector info
    for (const m of metiers) {
      const f = m.fields || m.raw || {};
      const sec = safeText(f.secteur || f.secteur_activite || f.secteurActivite || f.sector || f.sector_id || "").trim();
      if (!sec) continue;
      if (!metiersBySector.has(sec)) metiersBySector.set(sec, []);
      metiersBySector.get(sec).push(m);
    }

    // Suggest as you type, filtered by sector and country selection
    let lastSuggest = "";
    elJob.addEventListener("input", () => {
      const q = safeText(elJob.value).trim().toLowerCase();
      if (q === lastSuggest) return;
      lastSuggest = q;
      if (!q || q.length < 2) { elSuggest.classList.add("hidden"); elSuggest.innerHTML=""; return; }

      const sec = safeText(elSector.value).trim();
      let pool = metiers;
      if (sec && metiersBySector.has(sec)) pool = metiersBySector.get(sec);

      const hits = pool
        .filter(m => m.name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q))
        .slice(0, 12);

      if (!hits.length) { elSuggest.classList.add("hidden"); return; }
      showSuggest(elSuggest, hits, (slug) => {
        const found = metiers.find(x => x.slug === slug);
        elJob.value = found ? found.name : slug;
        renderMetier(slug);
      });
    });

    document.addEventListener("click", (e) => {
      if (!elSuggest.contains(e.target) && e.target !== elJob) {
        elSuggest.classList.add("hidden");
      }
    });

    elSector.addEventListener("change", () => {
      // Clear job input when sector changes (safer UX)
      elJob.value = "";
      elSuggest.classList.add("hidden");
      elContent.innerHTML = card("ℹ️", "rgba(109,106,252,.10)", `<div style="color: var(--muted);" class="font-semibold">Choisis un métier dans la recherche ci-dessus.</div>`);
    });

    elCountry.addEventListener("change", () => {
      // Update side info on country change
      const iso = safeText(elCountry.value).trim().toUpperCase();
      const c = countries.find(x => x.iso === iso);
      elSideInfo.textContent = c ? `${c.name} • Langue finale: ${(c.lang||'—').toUpperCase()}` : "—";
      // Reset banners until a job is selected
      elWideA.style.display = "none";
      elSqA.style.display = "none";
      elNoBanner.style.display = "none";
    });

    elReset.addEventListener("click", () => {
      elSector.value = "";
      elJob.value = "";
      if (visitorISO && countryOptions.some(o => o.value === visitorISO)) elCountry.value = visitorISO;
      else elCountry.value = "";
      elCount.textContent = String(metiers.length || "—");
      elTitle.textContent = "Choisis un métier";
      elSub.textContent = "Sélectionne un pays → un secteur → un métier.";
      elContent.innerHTML = card("ℹ️", "rgba(109,106,252,.10)", `<div style="color: var(--muted);" class="font-semibold">Sélectionne un pays, puis un secteur, puis un métier.</div>`);
      elWideA.style.display = "none";
      elSqA.style.display = "none";
      elNoBanner.style.display = "none";
    });

    // init side info
    elCountry.dispatchEvent(new Event("change"));
  }

  async function renderMetier(slug){
    const elCountry = document.getElementById("ulCountry");
    const elTitle   = document.getElementById("ulJobTitle");
    const elSub     = document.getElementById("ulJobSub");
    const elContent = document.getElementById("ulContent");
    const elWideA   = document.getElementById("ulBannerWide");
    const elWideImg = document.getElementById("ulBannerWideImg");
    const elWidePill= document.getElementById("ulBannerWidePill");
    const elSqA     = document.getElementById("ulBannerSquare");
    const elSqImg   = document.getElementById("ulBannerSquareImg");
    const elNoBanner= document.getElementById("ulNoBannerNote");
    const elSponsorBtn = document.getElementById("ulSponsorBtn");

    const iso = safeText(elCountry.value).trim().toUpperCase();
    if (!slug || !iso) return;

    elContent.innerHTML = card("Chargement…", "rgba(15,23,42,.06)", `<div class="font-semibold" style="color: var(--muted);">Chargement de la fiche métier…</div>`);
    elWideA.style.display = "none";
    elSqA.style.display = "none";
    elNoBanner.style.display = "none";

    const base = metiers.find(m => m.slug === slug) || null;
    let fields = base ? (base.fields || base.raw) : {};

    let worker = null;
    try{
      worker = await fetchMetierDetail({ slug, iso });
      log("worker metier-page", worker);
    }catch(e){
      log("worker failed", e);
    }

    const wMetier = worker?.metier || worker?.job || null;
    if (wMetier && typeof wMetier === "object") fields = Object.assign({}, fields, wMetier);

    const rawCountry = worker?.pays || worker?.country || null;
    const countryObj = rawCountry ? normCountry(rawCountry) : (countries.find(c => c.iso === iso) || null);
    const fallbackWide = firstUrlInAny(countryObj?.banners?.wide);
    const fallbackSquare = firstUrlInAny(countryObj?.banners?.square);

    // sponsor extraction (FIXED — no corrupted ellipsis)
    const sponsor = worker?.sponsor || worker?.meta?.sponsor || worker?.sponsoring || worker?.sponsorship || null;
    const sponsorName = safeText(sponsor?.name || sponsor?.nom || sponsor?.company || sponsor?.brand || "").trim();
    const sponsorLink = safeText(sponsor?.link || sponsor?.url || sponsor?.website || sponsor?.site || "").trim();
    const sponsorWide = firstUrlInAny(sponsor?.logo_2 || sponsor?.logo_wide || sponsor?.wide || sponsor?.banner_wide || sponsor?.bannerWide);
    const sponsorSquare = firstUrlInAny(sponsor?.logo_1 || sponsor?.logo_square || sponsor?.square || sponsor?.banner_square || sponsor?.bannerSquare);

    const hasSponsorCreative = !!(sponsorWide || sponsorSquare);

    const sponsorCTA = new URL(location.origin + SPONSOR_PATH);
    sponsorCTA.searchParams.set("metier", slug);
    sponsorCTA.searchParams.set("country", iso);
    elSponsorBtn.href = sponsorCTA.toString();

    const clickUrl = (hasSponsorCreative && sponsorLink) ? sponsorLink : sponsorCTA.toString();

    // Wide banner (priority sponsor, else country fallback)
    const wideUrl = hasSponsorCreative ? (sponsorWide || sponsorSquare) : (fallbackWide || fallbackSquare);
    if (wideUrl) {
      elWideImg.src = wideUrl;
      elWideA.href = clickUrl;
      elWidePill.textContent = hasSponsorCreative ? (sponsorName ? `Sponsor — ${sponsorName}` : "Sponsor") : "Sponsoriser ce métier";
      elWideA.style.display = "block";
    } else {
      elWideA.style.display = "none";
    }

    // Square banner (priority sponsor, else country fallback)
    const sqUrl = hasSponsorCreative ? (sponsorSquare || sponsorWide) : (fallbackSquare || fallbackWide);
    if (sqUrl) {
      elSqImg.src = sqUrl;
      elSqA.href = clickUrl;
      elSqA.style.display = "block";
      elNoBanner.style.display = "none";
    } else {
      elSqA.style.display = "none";
      elNoBanner.style.display = "block";
    }

    // Titles
    const displayName = safeText(fields.nom || fields.name || fields.title || base?.name || slug).trim();
    const accroche = pick(fields, FIELD_MAP.accroche);
    elTitle.textContent = displayName || slug;
    elSub.textContent = accroche || (countryObj ? `${countryObj.name} (${iso})` : iso);

    // Content blocks
    const overview = pick(fields, FIELD_MAP.overview);
    const missions = pick(fields, FIELD_MAP.missions);
    const competences = pick(fields, FIELD_MAP.competences);
    const environnements = pick(fields, FIELD_MAP.environnements);
    const profil = pick(fields, FIELD_MAP.profil);
    const evolutions = pick(fields, FIELD_MAP.evolutions);

    const blocks = [];
    if (overview) blocks.push(card("👁️ Vue d’ensemble", "rgba(59,130,246,.12)", `<div class="font-medium leading-7">${escapeHtml(overview).replace(/\n/g,"<br/>")}</div>`));
    if (missions) blocks.push(card("✅ Missions principales", "rgba(16,185,129,.14)", renderList(nlToBullets(missions))));
    if (competences) blocks.push(card("🧠 Compétences clés", "rgba(168,85,247,.14)", renderList(nlToBullets(competences))));
    if (environnements) blocks.push(card("🏢 Environnements de travail", "rgba(251,146,60,.18)", `<div class="font-medium leading-7">${escapeHtml(environnements).replace(/\n/g,"<br/>")}</div>`));
    if (profil) blocks.push(card("🧩 Profil recherché", "rgba(244,63,94,.14)", renderList(nlToBullets(profil))));
    if (evolutions) blocks.push(card("🚀 Évolutions possibles", "rgba(34,211,238,.16)", renderList(nlToBullets(evolutions))));

    if (!blocks.length) {
      blocks.push(card("ℹ️", "rgba(109,106,252,.10)", `<div class="font-semibold" style="color: var(--muted);">Aucune donnée disponible pour cette fiche (pour l’instant).</div>`));
    }
    elContent.innerHTML = blocks.join("");
  }

  main().catch((e) => console.error("[metier-page] fatal", e));
})();
