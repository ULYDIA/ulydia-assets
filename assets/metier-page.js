/* metier-page.js — Ulydia (V5.3) — Modern “WOW” Job Page
   - Country → Sector → Job filters (sticky)
   - Deep links: /metier?metier=SLUG&country=ISO
   - Detail view with modern blocks, grids, and rich sections
   - Sponsor banners: if sponsored -> sponsor.link, else -> /sponsor?metier=SLUG&country=ISO
   - Uses ulydia-ui.v2 tokens/classes if present, otherwise injects fallback CSS
   - Works with data injected as:
       <script id="countriesData|sectorsData|metiersData" type="application/json">[...]</script>
     and/or window.__ULYDIA_COUNTRIES__/__ULYDIA_SECTEURS__/__ULYDIA_METIERS__
*/

(() => {
  if (window.__ULYDIA_METIER_PAGE_V53__) return;
  window.__ULYDIA_METIER_PAGE_V53__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier-page.v5.3]", ...a); };

  // ------------------------------------------------------------
  // Config (can be set globally in Webflow)
  // ------------------------------------------------------------
  const WORKER_URL   = (window.ULYDIA_WORKER_URL || "").trim() || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = (window.ULYDIA_PROXY_SECRET || "").trim();
  const IPINFO_TOKEN = (window.ULYDIA_IPINFO_TOKEN || "").trim();

  // Sponsor CTA base
  const SPONSOR_URL_BASE = "https://www.ulydia.com/sponsor";

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function parseJSONScript(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    try {
      const t = (el.textContent || "").trim();
      if (!t) return [];
      const val = JSON.parse(t);
      return Array.isArray(val) ? val : [];
    } catch (e) {
      log("JSON parse failed", id, e);
      return [];
    }
  }

  function normalizeISO(x){
    const s = String(x || "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(s) ? s : "";
  }

  function getQS() {
    const u = new URL(location.href);
    const metier = (u.searchParams.get("metier") || u.searchParams.get("slug") || "").trim();
    const country = normalizeISO(u.searchParams.get("country") || u.searchParams.get("iso") || "");
    return { metier, country };
  }

  function setQS({ metier, country }) {
    const u = new URL(location.href);
    if (metier) u.searchParams.set("metier", metier); else u.searchParams.delete("metier");
    if (country) u.searchParams.set("country", country); else u.searchParams.delete("country");
    // keep compatibility params out to avoid clutter
    u.searchParams.delete("slug"); u.searchParams.delete("iso");
    history.replaceState({}, "", u.toString());
  }

  function safeURL(u){
    const s = String(u || "").trim();
    if (!s) return "";
    try { return new URL(s, location.origin).toString(); } catch { return ""; }
  }

  function pickFirstNonEmpty(...vals){
    for (const v of vals) {
      const s = String(v || "").trim();
      if (s) return s;
    }
    return "";
  }

  // ------------------------------------------------------------
  // Data load (from JSON scripts OR window arrays)
  // ------------------------------------------------------------
  function loadCMS() {
    // Prefer script tags if present (stable)
    const countries = parseJSONScript("countriesData") ?? (window.__ULYDIA_COUNTRIES__ || []);
    const sectors   = parseJSONScript("sectorsData") ?? (window.__ULYDIA_SECTEURS__ || []);
    const metiers   = parseJSONScript("metiersData") ?? (window.__ULYDIA_METIERS__ || []);

    // Normalize minimal shapes
    const c = (countries || []).map(x => ({
      iso: normalizeISO(x.iso || x.ISO || x.code || x.country || ""),
      name: pickFirstNonEmpty(x.name, x.nom, x.label, x.title),
      langue_finale: (x.langue_finale || x.lang || x.language || "").trim().toLowerCase(),
      banners: x.banners || null
    })).filter(x => x.iso);

    const s = (sectors || []).map(x => ({
      id: String(x.id || x.slug || x.key || "").trim(),
      name: pickFirstNonEmpty(x.name, x.nom, x.label, x.title),
      lang: (x.lang || x.language || x.langue || "").trim().toLowerCase()
    })).filter(x => x.id);

    const m = (metiers || []).map(x => ({
      slug: String(x.slug || x.metier || x.id || "").trim(),
      name: pickFirstNonEmpty(x.name, x.nom, x.title, x.label),
      secteur: String(x.secteur || x.sector || x.secteur_id || "").trim()
    })).filter(x => x.slug);

    log("cms loaded", { countries: c.length, sectors: s.length, metiers: m.length });
    return { countries: c, sectors: s, metiers: m };
  }

  // ------------------------------------------------------------
  // Geo / default country
  // ------------------------------------------------------------
  async function detectVisitorISO() {
    // 1) Try cached
    const key = "__ULYDIA_VISITOR_ISO__";
    if (window[key]) return window[key];
    // 2) Try IPinfo
    if (!IPINFO_TOKEN) return "";
    try {
      const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`, { cache: "no-store" });
      const j = await r.json();
      const iso = normalizeISO(j && j.country);
      if (iso) window[key] = iso;
      return iso;
    } catch (e) {
      log("ipinfo fail", e);
      return "";
    }
  }

  function countryLang(iso, countries){
    const c = countries.find(x => x.iso === iso);
    return (c?.langue_finale || "").trim().toLowerCase();
  }

  // ------------------------------------------------------------
  // Worker: detail fetch (sponsor + banners + blocs/faq if available)
  // Expects your worker to support:
  //   GET /v1/metier-page?slug=...&iso=...
  // Returning:
  //   { ok, metier:{slug,name,description,...}, sponsor?:{link,logo_wide,logo_square,logo_1,logo_2}, pays:{iso,langue_finale,banners:{wide,square}}, blocs?:[], faq?:[] }
  // ------------------------------------------------------------
  async function fetchDetail({ slug, iso }) {
    if (!slug) throw new Error("Missing metier slug");
    const url = new URL(WORKER_URL.replace(/\/$/,"") + "/v1/metier-page");
    url.searchParams.set("slug", slug);
    if (iso) url.searchParams.set("iso", iso);

    const headers = {};
    if (PROXY_SECRET) {
      headers["x-ulydia-proxy-secret"] = PROXY_SECRET;
      headers["x-proxy-secret"] = PROXY_SECRET;
    }

    const r = await fetch(url.toString(), { headers, cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j || j.ok === false) {
      const msg = (j && (j.error || j.message)) || `Worker error (${r.status})`;
      throw new Error(msg);
    }
    return j;
  }

  // ------------------------------------------------------------
  // UI CSS (fallback if ulydia-ui not present)
  // ------------------------------------------------------------
  function injectFallbackCSS(){
    if (document.getElementById("ul-metier-v53-css")) return;
    const css = `
    :root{
      --ul-primary:#c00102;
      --ul-bg:#0b0f16;
      --ul-card:#0f1724;
      --ul-text:#e9eefb;
      --ul-muted:#a8b3cf;
      --ul-border: rgba(255,255,255,.10);
      --ul-shadow: 0 18px 60px rgba(0,0,0,.35);
      --ul-radius: 18px;
    }
    #ulydia-metier-root{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ul-text); }
    .ul53-wrap{ max-width: 1180px; margin: 0 auto; padding: 24px 16px 70px; }
    .ul53-hero{
      border:1px solid var(--ul-border);
      background: radial-gradient(1200px 520px at 15% 20%, rgba(192,1,2,.28), transparent 55%),
                  radial-gradient(900px 520px at 80% 10%, rgba(80,120,255,.18), transparent 55%),
                  linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
      box-shadow: var(--ul-shadow);
      border-radius: calc(var(--ul-radius) + 6px);
      padding: 20px 20px 16px;
      position: relative;
      overflow: hidden;
    }
    .ul53-title{ font-size: 26px; line-height: 1.15; margin: 0; letter-spacing: -.2px; }
    .ul53-sub{ margin: 6px 0 0; color: var(--ul-muted); font-size: 14px; }
    .ul53-grid{ display:grid; grid-template-columns: 1fr; gap: 16px; margin-top: 16px; }
    @media(min-width:980px){ .ul53-grid{ grid-template-columns: 420px 1fr; } }
    .ul53-card{
      border:1px solid var(--ul-border);
      background: rgba(255,255,255,.035);
      border-radius: var(--ul-radius);
      box-shadow: 0 12px 40px rgba(0,0,0,.25);
      overflow:hidden;
    }
    .ul53-cardHd{ padding: 14px 14px 10px; border-bottom:1px solid var(--ul-border); display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .ul53-cardHd h3{ margin:0; font-size: 13px; letter-spacing:.12em; text-transform:uppercase; color: var(--ul-muted); }
    .ul53-cardBd{ padding: 14px; }
    .ul53-sticky{ position: sticky; top: 12px; }
    .ul53-row{ display:grid; grid-template-columns: 1fr; gap:10px; }
    .ul53-field label{ display:block; font-size:12px; color:var(--ul-muted); margin-bottom:6px; }
    .ul53-select, .ul53-input{
      width:100%;
      border:1px solid var(--ul-border);
      background: rgba(0,0,0,.18);
      color: var(--ul-text);
      border-radius: 14px;
      padding: 11px 12px;
      outline: none;
    }
    .ul53-input::placeholder{ color: rgba(233,238,251,.45); }
    .ul53-kpi{ display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
    .ul53-pill{
      border:1px solid var(--ul-border);
      background: rgba(255,255,255,.03);
      border-radius: 16px;
      padding: 10px 12px;
    }
    .ul53-pill b{ display:block; font-size: 12px; color: var(--ul-muted); font-weight:600; }
    .ul53-pill span{ display:block; margin-top:4px; font-size: 14px; }
    .ul53-list{ display:flex; flex-direction:column; gap:10px; }
    .ul53-job{
      border:1px solid var(--ul-border);
      background: rgba(255,255,255,.03);
      border-radius: 16px;
      padding: 12px;
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      transition: transform .18s ease, background .18s ease, border-color .18s ease;
    }
    .ul53-job:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.16); }
    .ul53-job h4{ margin:0; font-size: 15px; }
    .ul53-job p{ margin:4px 0 0; font-size: 12px; color: var(--ul-muted); }
    .ul53-btn{
      border:1px solid rgba(192,1,2,.55);
      background: linear-gradient(180deg, rgba(192,1,2,.95), rgba(192,1,2,.70));
      color:white;
      border-radius: 14px;
      padding: 9px 12px;
      font-weight: 700;
      font-size: 12px;
      cursor:pointer;
      white-space:nowrap;
    }
    .ul53-btn:disabled{ opacity:.5; cursor:not-allowed; }
    .ul53-detailTop{ display:flex; flex-direction:column; gap:10px; }
    .ul53-h1{ margin:0; font-size: 28px; letter-spacing: -.3px; }
    .ul53-meta{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; color: var(--ul-muted); font-size: 13px; }
    .ul53-chip{ border:1px solid var(--ul-border); background: rgba(255,255,255,.03); padding: 6px 10px; border-radius: 999px; }
    .ul53-banners{ display:grid; grid-template-columns: 1fr; gap: 10px; margin-top: 10px; }
    @media(min-width:720px){ .ul53-banners{ grid-template-columns: 1fr 260px; } }
    .ul53-bannerWide, .ul53-bannerSquare{
      display:block; border:1px solid var(--ul-border);
      background: rgba(0,0,0,.18);
      border-radius: 16px;
      overflow:hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,.22);
    }
    .ul53-bannerWide img{ width:100%; height:120px; object-fit:cover; display:block; }
    .ul53-bannerSquare img{ width:100%; aspect-ratio:1/1; object-fit:cover; display:block; }
    .ul53-sections{ display:flex; flex-direction:column; gap: 12px; margin-top: 14px; }
    .ul53-sectionTitle{ margin:0 0 8px; font-size: 12px; letter-spacing:.12em; text-transform:uppercase; color: var(--ul-muted); }
    .ul53-rich{ color: rgba(233,238,251,.9); line-height: 1.6; font-size: 14px; }
    .ul53-grid2{ display:grid; grid-template-columns: 1fr; gap: 12px; }
    @media(min-width:720px){ .ul53-grid2{ grid-template-columns: 1fr 1fr; } }
    .ul53-faq details{ border:1px solid var(--ul-border); background: rgba(255,255,255,.03); border-radius: 16px; padding: 10px 12px; }
    .ul53-faq summary{ cursor:pointer; font-weight: 800; }
    .ul53-faq p{ color: var(--ul-muted); margin: 8px 0 0; }
    .ul53-empty{ color: var(--ul-muted); font-size: 13px; }
    .ul53-skel{
      border-radius: 16px;
      border:1px solid var(--ul-border);
      background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.08), rgba(255,255,255,.03));
      background-size: 200% 100%;
      animation: ul53shimmer 1.1s linear infinite;
      height: 14px;
    }
    @keyframes ul53shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    `;
    const style = document.createElement("style");
    style.id = "ul-metier-v53-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------
  // Root + shell
  // ------------------------------------------------------------
  function ensureRoot(){
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.prepend(root);
      log("root auto-created");
    }
    return root;
  }

  function hideCmsSources(){
    // Hide any CMS dump wrappers tagged by class or attribute
    const nodes = [
      ...$$(".ul-cms-hidden"),
      ...$$("[data-ul-cms='1']"),
      ...$$("[data-ul-hide-cms='1']"),
    ];
    for (const n of nodes) {
      n.style.position = "absolute";
      n.style.left = "-99999px";
      n.style.top = "0";
      n.style.width = "1px";
      n.style.height = "1px";
      n.style.overflow = "hidden";
      n.style.opacity = "0";
      n.style.pointerEvents = "none";
    }
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  function renderShell(root){
    root.innerHTML = `
      <div class="ul53-wrap">
        <div class="ul53-hero">
          <h1 class="ul53-title">Explore job profiles</h1>
          <p class="ul53-sub">Choose a country, refine by sector, then open a job page with sponsor-ready visuals.</p>
        </div>

        <div class="ul53-grid">
          <div class="ul53-card ul53-sticky" id="ul53-filters">
            <div class="ul53-cardHd">
              <h3>Filters</h3>
              <div class="ul53-meta"><span class="ul53-chip" id="ul53-chip-geo">Detecting…</span></div>
            </div>
            <div class="ul53-cardBd">
              <div class="ul53-row">
                <div class="ul53-field">
                  <label>Country</label>
                  <select class="ul53-select" id="ul53-country"></select>
                </div>

                <div class="ul53-field">
                  <label>Sector</label>
                  <select class="ul53-select" id="ul53-sector" disabled>
                    <option value="">Select a sector…</option>
                  </select>
                </div>

                <div class="ul53-field">
                  <label>Job (search)</label>
                  <input class="ul53-input" id="ul53-search" placeholder="Type to filter jobs…" />
                </div>
              </div>

              <div class="ul53-kpi" id="ul53-kpis">
                <div class="ul53-pill"><b>Countries</b><span id="kpi-countries">—</span></div>
                <div class="ul53-pill"><b>Sectors</b><span id="kpi-sectors">—</span></div>
                <div class="ul53-pill"><b>Jobs</b><span id="kpi-jobs">—</span></div>
                <div class="ul53-pill"><b>Matches</b><span id="kpi-matches">—</span></div>
              </div>
            </div>
          </div>

          <div class="ul53-card" id="ul53-main">
            <div class="ul53-cardHd">
              <h3>Results</h3>
              <div class="ul53-meta">
                <span class="ul53-chip" id="ul53-state">Ready</span>
              </div>
            </div>
            <div class="ul53-cardBd">
              <div id="ul53-jobs" class="ul53-list"></div>
              <div id="ul53-detail" class="ul53-sections" style="margin-top:16px;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function setOptions(select, options, { placeholder = "" } = {}) {
    const prev = select.value;
    select.innerHTML = "";
    if (placeholder) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = placeholder;
      select.appendChild(o);
    }
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    }
    // try keep
    if (prev) select.value = prev;
  }

  function renderJobsList({ jobsEl, jobs, onOpen, emptyText }) {
    if (!jobs.length) {
      jobsEl.innerHTML = `<div class="ul53-empty">${esc(emptyText || "No results.")}</div>`;
      return;
    }
    jobsEl.innerHTML = jobs.map(j => `
      <div class="ul53-job" data-slug="${esc(j.slug)}">
        <div style="min-width:0;">
          <h4>${esc(j.name || j.slug)}</h4>
          <p>${esc(j.slug)} • ${esc(j.secteur || "")}</p>
        </div>
        <button class="ul53-btn" data-open="${esc(j.slug)}">Open →</button>
      </div>
    `).join("");

    jobsEl.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", () => onOpen(btn.getAttribute("data-open")));
    });
  }

  function renderDetailSkeleton(detailEl){
    detailEl.innerHTML = `
      <div class="ul53-card" style="padding:14px;">
        <div class="ul53-detailTop">
          <div class="ul53-skel" style="height:26px;width:60%;"></div>
          <div class="ul53-skel" style="height:14px;width:45%;"></div>
          <div class="ul53-banners">
            <div class="ul53-bannerWide"><div style="padding:10px"><div class="ul53-skel" style="height:120px;"></div></div></div>
            <div class="ul53-bannerSquare"><div style="padding:10px"><div class="ul53-skel" style="height:260px;"></div></div></div>
          </div>
          <div class="ul53-skel" style="height:14px;width:90%;"></div>
          <div class="ul53-skel" style="height:14px;width:82%;"></div>
          <div class="ul53-skel" style="height:14px;width:76%;"></div>
        </div>
      </div>
    `;
  }

  function bannerClickURL({ isSponsored, sponsorLink, slug, iso }){
    if (isSponsored) return safeURL(sponsorLink);
    const u = new URL(SPONSOR_URL_BASE);
    u.searchParams.set("metier", slug);
    if (iso) u.searchParams.set("country", iso);
    return u.toString();
  }

  function renderDetail(detailEl, payload, { iso, fallbackLang }) {
    const metier = payload?.metier || {};
    const sponsor = payload?.sponsor || null;
    const pays = payload?.pays || {};
    const blocs = Array.isArray(payload?.blocs) ? payload.blocs : [];
    const faq = Array.isArray(payload?.faq) ? payload.faq : [];

    const isSponsored = !!(sponsor && (sponsor.link || sponsor.sponsor_link || sponsor.url));
    const sponsorLink = pickFirstNonEmpty(sponsor?.link, sponsor?.sponsor_link, sponsor?.url);
    const clickUrl = bannerClickURL({ isSponsored, sponsorLink, slug: metier.slug, iso });

    // Wide/square URLs: sponsor if sponsored else pays.banners
    const wideUrl = safeURL(
      isSponsored
        ? pickFirstNonEmpty(sponsor?.logo_2, sponsor?.logo_wide, sponsor?.wide, sponsor?.banner_wide)
        : pickFirstNonEmpty(pays?.banners?.wide, pays?.banners?.wideUrl, pays?.banners?.banner_wide, pays?.banners?.img1)
    );
    const squareUrl = safeURL(
      isSponsored
        ? pickFirstNonEmpty(sponsor?.logo_1, sponsor?.logo_square, sponsor?.square, sponsor?.banner_square)
        : pickFirstNonEmpty(pays?.banners?.square, pays?.banners?.squareUrl, pays?.banners?.banner_square, pays?.banners?.img2)
    );

    const title = pickFirstNonEmpty(metier.name, metier.title, metier.slug);
    const desc = pickFirstNonEmpty(metier.description, metier.desc, "");
    const lang = pickFirstNonEmpty(pays?.langue_finale, fallbackLang);

    // “wow” header: add chips
    const chips = [
      iso ? `Country: ${iso}` : "",
      lang ? `Lang: ${lang}` : "",
      isSponsored ? "Sponsored" : "Not sponsored",
    ].filter(Boolean);

    // Blocks: attempt to render “type-aware” grids if fields exist
    const sectionsHTML = [];

    if (desc) {
      sectionsHTML.push(`
        <div class="ul53-card">
          <div class="ul53-cardHd"><h3>Overview</h3></div>
          <div class="ul53-cardBd">
            <div class="ul53-rich">${esc(desc)}</div>
          </div>
        </div>
      `);
    }

    // Generic “Blocs” renderer
    if (blocs.length) {
      const blocCards = blocs.map(b => {
        const bt = pickFirstNonEmpty(b.title, b.titre, b.heading, b.label, "Section");
        const bc = pickFirstNonEmpty(b.content, b.contenu, b.text, b.description, "");
        const items = Array.isArray(b.items) ? b.items : null;
        let inner = "";
        if (items && items.length) {
          inner = `
            <div class="ul53-grid2">
              ${items.map(it => `
                <div class="ul53-pill">
                  <b>${esc(pickFirstNonEmpty(it.label, it.title, it.name, ""))}</b>
                  <span>${esc(pickFirstNonEmpty(it.value, it.text, it.content, ""))}</span>
                </div>
              `).join("")}
            </div>
          `;
        } else {
          inner = `<div class="ul53-rich">${esc(bc)}</div>`;
        }
        return `
          <div class="ul53-card">
            <div class="ul53-cardHd"><h3>${esc(bt)}</h3></div>
            <div class="ul53-cardBd">${inner}</div>
          </div>
        `;
      }).join("");
      sectionsHTML.push(`<div class="ul53-sections">${blocCards}</div>`);
    }

    // FAQ
    if (faq.length) {
      const faqHtml = faq.map(q => {
        const qq = pickFirstNonEmpty(q.q, q.question, q.title, "");
        const aa = pickFirstNonEmpty(q.a, q.answer, q.content, q.text, "");
        return `
          <details>
            <summary>${esc(qq || "Question")}</summary>
            <p>${esc(aa)}</p>
          </details>
        `;
      }).join("");
      sectionsHTML.push(`
        <div class="ul53-card">
          <div class="ul53-cardHd"><h3>FAQ</h3></div>
          <div class="ul53-cardBd">
            <div class="ul53-faq">${faqHtml}</div>
          </div>
        </div>
      `);
    }

    // Sponsor CTA section (always)
    const sponsorCTA = `
      <div class="ul53-card">
        <div class="ul53-cardHd"><h3>Become the sponsor</h3></div>
        <div class="ul53-cardBd">
          <div class="ul53-rich">
            This job page can be sponsored. Your brand will be displayed on the wide and square banners.
          </div>
          <div style="margin-top:10px;">
            <a class="ul53-btn" href="${esc(new URL(SPONSOR_URL_BASE + "?metier=" + encodeURIComponent(metier.slug || "") + (iso ? "&country=" + encodeURIComponent(iso) : "")).toString())}">
              Sponsor this page →
            </a>
          </div>
        </div>
      </div>
    `;

    detailEl.innerHTML = `
      <div class="ul53-detailTop">
        <h2 class="ul53-h1">${esc(title)}</h2>
        <div class="ul53-meta">
          ${chips.map(c => `<span class="ul53-chip">${esc(c)}</span>`).join("")}
        </div>

        <div class="ul53-banners">
          <a class="ul53-bannerWide" href="${esc(clickUrl)}" target="_blank" rel="noopener">
            ${wideUrl ? `<img src="${esc(wideUrl)}" alt="banner wide" loading="lazy" />` : `<div style="padding:12px;color:rgba(233,238,251,.6)">No wide banner</div>`}
          </a>
          <a class="ul53-bannerSquare" href="${esc(clickUrl)}" target="_blank" rel="noopener">
            ${squareUrl ? `<img src="${esc(squareUrl)}" alt="banner square" loading="lazy" />` : `<div style="padding:12px;color:rgba(233,238,251,.6)">No square banner</div>`}
          </a>
        </div>

        <div class="ul53-sections">
          ${sectionsHTML.join("")}
          ${sponsorCTA}
        </div>
      </div>
    `;

    // Smooth scroll into detail for deep links / open
    detailEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ------------------------------------------------------------
  // Main logic
  // ------------------------------------------------------------
  async function main(){
    injectFallbackCSS();
    hideCmsSources();

    const root = ensureRoot();
    renderShell(root);

    const { countries, sectors, metiers } = loadCMS();

    const chipGeo = $("#ul53-chip-geo", root);
    const stateEl = $("#ul53-state", root);
    const selCountry = $("#ul53-country", root);
    const selSector = $("#ul53-sector", root);
    const inSearch = $("#ul53-search", root);
    const jobsEl = $("#ul53-jobs", root);
    const detailEl = $("#ul53-detail", root);

    // KPIs
    $("#kpi-countries", root).textContent = String(countries.length);
    $("#kpi-sectors", root).textContent = String(sectors.length);
    $("#kpi-jobs", root).textContent = String(metiers.length);
    $("#kpi-matches", root).textContent = "—";

    // Fill countries select
    const countryOpts = countries
      .slice()
      .sort((a,b) => (a.name || a.iso).localeCompare(b.name || b.iso))
      .map(c => ({ value: c.iso, label: `${c.name || c.iso} (${c.iso})` }));
    setOptions(selCountry, countryOpts, { placeholder: "Select a country…" });

    // Defaults
    const qs = getQS();
    let activeISO = qs.country || "";
    let activeMetierSlug = qs.metier || "";

    // Detect visitor iso if none
    if (!activeISO) {
      stateEl.textContent = "Detecting country…";
      const vis = await detectVisitorISO();
      if (vis) activeISO = vis;
    }

    // If still none, pick first
    if (!activeISO && countries.length) activeISO = countries[0].iso;

    selCountry.value = activeISO || "";
    chipGeo.textContent = activeISO ? `Country: ${activeISO}` : "Country: —";

    // Build sectors list based on country language (if sectors have lang)
    function computeSectorsForCountry(iso){
      const lang = countryLang(iso, countries);
      const hasLang = sectors.some(s => !!s.lang);
      const list = hasLang && lang
        ? sectors.filter(s => !s.lang || s.lang === lang) // allow blanks as global
        : sectors.slice();
      // unique by id
      const seen = new Set();
      const uniq = [];
      for (const x of list) { if (!seen.has(x.id)) { seen.add(x.id); uniq.push(x); } }
      uniq.sort((a,b) => (a.name||a.id).localeCompare(b.name||b.id));
      return uniq;
    }

    let sectorsForCountry = computeSectorsForCountry(activeISO);
    setOptions(selSector, sectorsForCountry.map(s => ({ value: s.id, label: s.name || s.id })), { placeholder: "Select a sector…" });
    selSector.disabled = false;

    // Auto-select sector if deep link metier present
    function findMetier(slug){
      return metiers.find(m => m.slug === slug) || null;
    }
    let activeSector = "";

    if (activeMetierSlug) {
      const m = findMetier(activeMetierSlug);
      if (m && m.secteur) activeSector = m.secteur;
      // set sector if exists in options, else keep empty
      if (activeSector && sectorsForCountry.some(s => s.id === activeSector)) {
        selSector.value = activeSector;
      } else {
        selSector.value = "";
      }
    }

    // Filtering jobs
    function filteredJobs(){
      const iso = selCountry.value;
      const sector = selSector.value;
      const q = (inSearch.value || "").trim().toLowerCase();
      let list = metiers.slice();

      // Sector required to show meaningful list
      if (sector) list = list.filter(m => (m.secteur || "") === sector);
      else list = []; // force choose sector

      if (q) {
        list = list.filter(m => (m.name || m.slug).toLowerCase().includes(q) || m.slug.toLowerCase().includes(q));
      }
      // sort
      list.sort((a,b) => (a.name||a.slug).localeCompare(b.name||b.slug));
      return list;
    }

    async function openMetier(slug){
      const iso = selCountry.value;
      if (!slug) return;
      setQS({ metier: slug, country: iso });
      stateEl.textContent = "Loading job…";
      renderDetailSkeleton(detailEl);
      try {
        const payload = await fetchDetail({ slug, iso });
        stateEl.textContent = "Ready";
        renderDetail(detailEl, payload, { iso, fallbackLang: countryLang(iso, countries) });
      } catch (e) {
        console.error("[metier-page.v5.3] detail error", e);
        detailEl.innerHTML = `<div class="ul53-empty">Failed to load job details: ${esc(e.message || String(e))}</div>`;
        stateEl.textContent = "Error";
      }
    }

    function refreshList(){
      const sector = selSector.value;
      const iso = selCountry.value;
      const list = filteredJobs();
      $("#kpi-matches", root).textContent = String(list.length);

      if (!sector) {
        renderJobsList({
          jobsEl,
          jobs: [],
          onOpen: () => {},
          emptyText: "Select a sector to see jobs."
        });
        return;
      }

      renderJobsList({
        jobsEl,
        jobs: list,
        onOpen: (slug) => openMetier(slug),
        emptyText: "No results for this selection."
      });

      // If URL metier exists and sector set, ensure visible/open
      const qsNow = getQS();
      if (qsNow.metier && qsNow.metier !== activeMetierSlug) {
        activeMetierSlug = qsNow.metier;
      }
    }

    // Wire events
    selCountry.addEventListener("change", async () => {
      const iso = selCountry.value;
      chipGeo.textContent = iso ? `Country: ${iso}` : "Country: —";

      sectorsForCountry = computeSectorsForCountry(iso);
      setOptions(selSector, sectorsForCountry.map(s => ({ value: s.id, label: s.name || s.id })), { placeholder: "Select a sector…" });
      selSector.disabled = false;
      selSector.value = ""; // force new selection
      inSearch.value = "";
      detailEl.innerHTML = "";
      stateEl.textContent = "Ready";
      setQS({ metier: "", country: iso });

      refreshList();
    });

    selSector.addEventListener("change", () => {
      detailEl.innerHTML = "";
      stateEl.textContent = "Ready";
      setQS({ metier: "", country: selCountry.value });
      refreshList();
    });

    inSearch.addEventListener("input", () => refreshList());

    // Initial list
    refreshList();

    // Deep link open
    if (activeMetierSlug) {
      // If sector wasn't selected by match, still open detail (directory is separate)
      await openMetier(activeMetierSlug);
    } else {
      stateEl.textContent = "Ready";
    }
  }

  main().catch(e => {
    console.error("[metier-page.v5.3] fatal", e);
  });
})();
