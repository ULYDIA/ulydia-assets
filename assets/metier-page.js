/* metier-page.js — Ulydia (V7) — Full-code "Propal1" design
   - Renders the job page UI from the provided HTML mockup
   - Fetches dynamic content from your Cloudflare Worker (/v1/metier-page)
   - Populates sponsor banners (wide + square) + link
   - Populates main sections + optional "Metier_pays_bloc" blocks + FAQ
   - Filters bar (Pays / Secteur / Métier autocomplete) powered by Webflow CMS JSON blobs (optional)

   ✅ What this file assumes (no breaking if missing):
   - Your Worker endpoint:
       GET {WORKER_URL}/v1/metier-page?slug=...&iso=FR
       -> returns { metier, pays, sponsor?, blocs?, faq? }
   - On the Webflow page (optional, for dropdowns & autocomplete):
       <script type="application/json" id="ulydia-cms-pays">[...]</script>
       <script type="application/json" id="ulydia-cms-secteurs">[...]</script>
       <script type="application/json" id="ulydia-cms-metiers">[...]</script>

     Recommended JSON shapes:
       pays:     [{ iso:"FR", label:"🇫🇷 France", langue_finale:"fr" }]
       secteurs: [{ id:"finance", label:"💰 Finance & Banque" }]
       metiers:  [{ slug:"directeur-financier", name:"Directeur financier", secteur_id:"finance", pays:["FR","BE"] }]

   Source mockup: propal1-fiche metier.html fileciteturn1file0
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V7__) return;
  window.__ULYDIA_METIER_PAGE_V7__ = true;

  // =========================================================
  // CONFIG
  // =========================================================
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const WORKER_URL   = window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // =========================================================
  // Utils
  // =========================================================
  function log(...a){ if (DEBUG) console.log("[metier-page]", ...a); }
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function esc(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function clamp(n, a, b){ n = Number(n); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : a; }

  function pickUrl(u){
    const s = String(u || "").trim();
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    // allow protocol-relative or CDN paths if you use them
    if (s.startsWith("//")) return "https:" + s;
    return s;
  }

  function safeJsonParse(text, fallback){
    try { return JSON.parse(text); } catch { return fallback; }
  }

  function readJsonScript(id){
    const el = document.getElementById(id);
    if (!el) return null;
    const txt = (el.textContent || "").trim();
    if (!txt) return null;
    return safeJsonParse(txt, null);
  }

  function detectSlug(){
    const url = new URL(location.href);
    const q = String(url.searchParams.get("slug") || "").trim();
    if (q) return q;

    // /fiche-metiers/xxx or /metiers/xxx
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    // If last looks like an actual slug (not "fiche-metiers" itself)
    if (last && !["fiche-metiers","metiers","metier","job","jobs"].includes(last)) return last;
    return "";
  }

  function detectISO(){
    const url = new URL(location.href);
    const isoQ = String(url.searchParams.get("iso") || "").trim();
    if (isoQ) return isoQ.toUpperCase();

    // If user selected in UI, we store it in localStorage
    const saved = String(localStorage.getItem("ulydia_iso") || "").trim();
    if (saved) return saved.toUpperCase();

    // Default
    return "FR";
  }

  async function fetchJSON(url, opts = {}){
    const res = await fetch(url, {
      ...opts,
      headers: {
        "accept": "application/json",
        "x-ulydia-proxy-secret": PROXY_SECRET,
        "x-proxy-secret": PROXY_SECRET, // allow both headers (worker supports)
        ...(opts.headers || {}),
      }
    });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { /* ignore */ }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || txt || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // =========================================================
  // CSS (from mockup, adapted)  fileciteturn1file0
  // =========================================================
  function injectCSS(){
    if (document.getElementById("ulydia-metier-css-v7")) return;
    const style = document.createElement("style");
    style.id = "ulydia-metier-css-v7";
    style.textContent = `
      :root {
        --primary: #6366f1;
        --text: #0f172a;
        --muted: #64748b;
        --border: #e2e8f0;
        --bg: #ffffff;
        --card: #f8fafc;
        --accent: #f59e0b;
        --success: #10b981;
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
        --shadow-card: 0 4px 20px rgba(0,0,0,.08);
        --font-family: 'Outfit', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        --font-base: 15px;
      }
      #ulydia-metier-root, #ulydia-metier-root * { box-sizing: border-box; font-family: var(--font-family); }
      #ulydia-metier-root { min-height: 100vh; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); }

      .gradient-primary { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); }
      .gradient-accent  { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); }
      .gradient-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
      .pastel-blue   { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
      .pastel-purple { background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%); }
      .pastel-green  { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
      .pastel-orange { background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%); }
      .pastel-pink   { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); }
      .pastel-cyan   { background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); }

      .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
      @media (max-width: 768px){ .container { padding: 0 16px; } }

      .filters-bar { width:100%; background:#fff; border-bottom:2px solid var(--border); box-shadow:0 2px 8px rgba(0,0,0,.05); position: sticky; top: 0; z-index: 50; }
      .filters-grid { display:grid; grid-template-columns: 1fr; gap: 16px; padding: 16px 0; }
      @media (min-width: 768px){ .filters-grid { grid-template-columns: repeat(3,1fr); } }

      label.ul-label { display:block; font-size:12px; font-weight:700; margin-bottom:8px; color: var(--text); }
      select.ul-select, input.ul-input {
        width:100%;
        padding: 12px 14px;
        border-radius: 12px;
        border: 2px solid var(--border);
        background: #fff;
        color: var(--text);
        font-size: 14px;
        font-weight: 600;
        outline: none;
        transition: all .15s ease;
      }
      select.ul-select:focus, input.ul-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(99,102,241,0.12); }
      .ul-rel { position: relative; }
      .ul-ico { position:absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events:none; opacity: .75; }
      .ul-suggestions {
        position:absolute; left:0; right:0; top: 100%;
        margin-top: 8px;
        border-radius: 12px;
        border: 2px solid var(--border);
        background: #fff;
        box-shadow: 0 8px 24px rgba(0,0,0,.12);
        max-height: 320px;
        overflow-y: auto;
        z-index: 60;
        display:none;
      }
      .ul-suggestions.show { display:block; }
      .ul-sugg-item {
        padding: 12px 14px;
        cursor: pointer;
        border-bottom: 1px solid var(--border);
        display:flex; align-items:center; justify-content:space-between; gap: 12px;
        font-size: 14px; font-weight: 600;
        color: var(--text);
      }
      .ul-sugg-item:hover { background: rgba(2,6,23,0.03); }
      .ul-sugg-tag { font-size: 12px; font-weight: 800; padding: 4px 8px; border-radius: 10px; background: rgba(99,102,241,.1); color: var(--primary); }

      .filters-footer { display:flex; align-items:center; justify-content:space-between; gap: 12px; padding-bottom: 12px; }
      .reset-btn {
        display:inline-flex; align-items:center; gap: 8px;
        padding: 8px 12px;
        border-radius: 12px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--muted);
        font-size: 14px;
        font-weight: 800;
        cursor:pointer;
        transition: all .15s ease;
      }
      .reset-btn:hover { background: rgba(2,6,23,0.03); color: var(--text); }

      .badge { display:inline-flex; align-items:center; gap: 6px; padding: 6px 14px; border-radius: 10px; font-size: 13px; font-weight: 800; border: 1px solid; }
      .badge-primary { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #6366f1; }

      .header { width:100%; background:#fff; border-bottom:2px solid var(--border); }
      .header-inner { padding: 40px 0; }
      .header-row { display:flex; align-items:flex-start; gap: 20px; }
      .header-icon { width:80px; height:80px; border-radius: 20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .h1 { margin: 14px 0 10px; font-size: clamp(34px, 4vw, 52px); letter-spacing: -0.02em; font-weight: 900; color: var(--text); }
      .subtitle { font-size: 20px; color: var(--muted); line-height: 1.3; }

      .sponsor-wide {
        width: 680px; height: 120px; max-width:100%;
        border-radius: var(--radius-lg);
        overflow:hidden;
        cursor:pointer;
        transition: transform .2s ease;
        margin: 32px auto 0;
        position:relative;
        display:none; /* shown only when sponsor OR fallback exists */
        background-size: cover;
        background-position: center;
      }
      .sponsor-wide:hover { transform: scale(1.02); }
      .sponsor-wide .overlay {
        position:absolute; inset:0;
        background: linear-gradient(135deg, rgba(99,102,241,.92) 0%, rgba(139,92,246,.92) 100%);
        display:flex; align-items:center; justify-content:center;
        padding: 18px;
        color:#fff;
        text-align:center;
      }
      .sponsor-wide.has-image .overlay { background: linear-gradient(180deg, rgba(2,6,23,.35) 0%, rgba(2,6,23,.25) 100%); }

      .layout { padding: 40px 0; }
      .grid { display:grid; grid-template-columns: 1fr; gap: 32px; }
      @media (min-width: 1024px){ .grid { grid-template-columns: 2fr 1fr; } }

      .card { background: var(--card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); border:1px solid var(--border); padding: 24px; transition: all .2s ease; }
      .card:hover { box-shadow: 0 8px 30px rgba(0,0,0,.12); transform: translateY(-2px); }
      .card-header { padding: 16px 20px; border-radius: var(--radius-md) var(--radius-md) 0 0; margin: -24px -24px 20px -24px; }
      .section-title { font-weight: 900; font-size: 17px; color: var(--text); letter-spacing: -0.02em; display:flex; align-items:center; gap: 10px; }
      .rich-content { color: var(--text); line-height: 1.7; font-size: 15px; }
      .rich-content h3 { font-weight: 900; font-size: 16px; margin: 18px 0 10px; }
      .rich-content h4 { font-weight: 800; font-size: 15px; margin: 14px 0 8px; }
      .rich-content p { margin: 10px 0; }
      .rich-content ul { list-style: none; margin: 12px 0; padding: 0; }
      .rich-content li { margin: 8px 0; padding-left: 22px; position: relative; }
      .rich-content li:before { content: "→"; position:absolute; left: 0; color: var(--primary); font-weight: 900; }

      .faq-item button { width:100%; text-align:left; padding: 14px; border-radius: 12px; border:2px solid var(--border); background:#fff; cursor:pointer; display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; }
      .faq-item button:hover { border-color: var(--primary); box-shadow: 0 2px 8px rgba(99,102,241,0.15); }
      .faq-q { display:flex; align-items:flex-start; gap: 10px; flex:1; }
      .faq-q span.qtxt { font-weight: 800; font-size: 14px; color: var(--text); }
      .faq-a { display:none; margin: 10px 0 0 20px; padding: 12px 14px; border-radius: 12px; font-size: 14px; background: rgba(99,102,241,0.05); border-left: 3px solid var(--primary); }
      .faq-a.show { display:block; }

      .sidebar-card a { text-decoration:none; color: inherit; }
      .partner-box { width: 300px; height: 300px; max-width:100%; border-radius: var(--radius-lg); background:#fff; display:flex; align-items:center; justify-content:center; padding: 24px; box-shadow: var(--shadow-card); border:1px solid var(--border); margin: 0 auto; overflow:hidden; }
      .partner-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .btn { display:inline-flex; align-items:center; justify-content:center; gap: 8px; padding: 0 24px; height: 48px; border-radius: var(--radius-md); font-weight: 800; font-size: 15px; border: none; cursor:pointer; transition: all .2s ease; text-decoration:none; }
      .btn-primary { background: var(--primary); color: #fff; }
      .btn-primary:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.3); }

      .muted { color: var(--muted); }
      .err { padding: 14px 16px; border-radius: 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #991b1b; font-weight: 700; }
      .skeleton { background: linear-gradient(90deg, rgba(2,6,23,.06) 25%, rgba(2,6,23,.10) 37%, rgba(2,6,23,.06) 63%); background-size: 400% 100%; animation: skel 1.2s ease infinite; border-radius: 12px; }
      @keyframes skel { 0%{background-position: 100% 0;} 100%{background-position: 0 0;} }
    `;
    document.head.appendChild(style);

    // Load font (Outfit) like mockup
    if (!document.getElementById("ulydia-metier-font-outfit")) {
      const link = document.createElement("link");
      link.id = "ulydia-metier-font-outfit";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
  }

  // =========================================================
  // HTML Shell (based on mockup) fileciteturn1file0
  // =========================================================
  function renderShell(root){
    root.innerHTML = `
      <div class="filters-bar">
        <div class="container">
          <div class="filters-grid">
            <div class="ul-rel">
              <label class="ul-label" for="filter-pays">🌍 Pays / Région</label>
              <div class="ul-rel">
                <select id="filter-pays" class="ul-select"></select>
                <div class="ul-ico">⌄</div>
              </div>
            </div>

            <div class="ul-rel">
              <label class="ul-label" for="filter-secteur">🏢 Secteur d'activité</label>
              <div class="ul-rel">
                <select id="filter-secteur" class="ul-select"></select>
                <div class="ul-ico">⌄</div>
              </div>
            </div>

            <div class="ul-rel">
              <label class="ul-label" for="filter-metier">🔍 Rechercher un métier</label>
              <div class="ul-rel">
                <input id="filter-metier" class="ul-input" placeholder="Ex: Directeur financier, Comptable..." autocomplete="off" />
                <div class="ul-ico">🔎</div>
                <div id="metier-suggestions" class="ul-suggestions"></div>
              </div>
            </div>
          </div>

          <div class="filters-footer">
            <button id="reset-filters" class="reset-btn" type="button">↺ Réinitialiser les filtres</button>
            <div class="muted" style="font-size:12px; font-weight: 800;"><span id="result-count">0</span> fiche(s) métier trouvée(s)</div>
          </div>
        </div>
      </div>

      <header class="header">
        <div class="container header-inner">
          <div class="header-row">
            <div class="header-icon gradient-primary" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
            <div style="flex:1">
              <span class="badge badge-primary">💼 Fiche Métier</span>
              <h1 id="nom-metier" class="h1 skeleton" style="height: 56px; width: min(720px, 100%);"></h1>
              <p id="accroche-metier" class="subtitle skeleton" style="height: 26px; width: min(880px, 100%);"></p>
            </div>
          </div>

          <a id="sponsor-banner-link" class="sponsor-wide" href="#" target="_blank" rel="noopener noreferrer">
            <div class="overlay">
              <div>
                <div style="font-weight:800; font-size:13px; opacity:.92; margin-bottom:8px;">Formation sponsorisée par</div>
                <div id="sponsor-name-banner" style="font-weight: 900; font-size: 28px; line-height:1.05;">—</div>
                <div id="sponsor-subtitle-banner" style="font-weight:700; font-size:13px; opacity:.88; margin-top:8px;"> </div>
              </div>
            </div>
          </a>
        </div>
      </header>

      <main class="container layout">
        <div class="grid">
          <div id="main-col" style="display:flex; flex-direction:column; gap: 24px;">
            <section class="card">
              <div class="card-header pastel-blue">
                <div class="section-title">📄 <span id="description-title">Vue d'ensemble</span></div>
              </div>
              <div id="section-description" class="rich-content"></div>
            </section>

            <section class="card">
              <div class="card-header pastel-green">
                <div class="section-title">✅ <span id="missions-title">Missions principales</span></div>
              </div>
              <div id="section-missions" class="rich-content"></div>
            </section>

            <section class="card">
              <div class="card-header pastel-purple">
                <div class="section-title">✍️ <span id="competences-title">Compétences clés</span></div>
              </div>
              <div id="section-competences" class="rich-content"></div>
            </section>

            <section class="card">
              <div class="card-header pastel-orange">
                <div class="section-title">🖥️ <span id="environnements-title">Environnements de travail</span></div>
              </div>
              <div id="section-environnements" class="rich-content"></div>
            </section>

            <section class="card">
              <div class="card-header pastel-pink">
                <div class="section-title">🎯 <span id="profil-title">Profil recherché</span></div>
              </div>
              <div id="section-profil" class="rich-content"></div>
            </section>

            <section class="card">
              <div class="card-header pastel-cyan">
                <div class="section-title">🚀 <span id="evolutions-title">Évolutions possibles</span></div>
              </div>
              <div id="section-evolutions" class="rich-content"></div>
            </section>

            <section id="blocs-wrap" style="display:none;">
              <div id="blocs-grid" style="display:grid; grid-template-columns: 1fr; gap: 16px;"></div>
            </section>

            <section class="card" id="faq-card" style="display:none;">
              <div class="card-header" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                <div class="section-title">❓ <span id="faq-title">Questions fréquentes</span></div>
              </div>
              <div id="faq-list" style="display:flex; flex-direction:column; gap: 10px;"></div>
            </section>
          </div>

          <aside style="display:flex; flex-direction:column; gap: 16px;">
            <div class="card sidebar-card">
              <div class="card-header" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
                <div class="section-title" style="font-size:14px;">🤝 Partenaire</div>
              </div>

              <a id="sponsor-logo-link" href="#" target="_blank" rel="noopener noreferrer" style="display:block;">
                <div class="partner-box" id="partner-box">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                </div>
                <div style="text-align:center; margin-top: 14px;">
                  <div id="sponsor-name-sidebar" style="font-weight: 900; font-size: 16px; color: var(--text);">—</div>
                  <div id="sponsor-subtitle-sidebar" class="muted" style="font-size: 13px; margin-top: 4px;"></div>
                  <div id="sponsor-desc-sidebar" class="muted" style="font-size: 12px; margin-top: 8px;"></div>
                </div>
              </a>

              <a id="sponsor-cta" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="width:100%; margin-top: 16px;">
                🔗 En savoir plus
              </a>
            </div>

            <div id="side-extra"></div>
          </aside>
        </div>

        <div id="ulydia-metier-error" style="margin-top: 20px;"></div>
      </main>
    `;
  }

  // =========================================================
  // Content rendering helpers
  // =========================================================
  function setText(id, val){
    const el = document.getElementById(id);
    if (!el) return;
    const s = String(val ?? "").trim();
    el.textContent = s;
  }

  function setHTML(id, html){
    const el = document.getElementById(id);
    if (!el) return;
    const s = String(html ?? "").trim();
    // We intentionally allow HTML from your CMS/Worker (you control it).
    // If you ever ingest user-generated content, sanitize server-side.
    el.innerHTML = s;
  }

  function showError(msg){
    const box = document.getElementById("ulydia-metier-error");
    if (!box) return;
    box.innerHTML = `<div class="err">⚠️ ${esc(msg)}</div>`;
  }

  function toggle(el, on){ if (!el) return; el.style.display = on ? "" : "none"; }

  function setSponsorAssets({ sponsor, fallbackBanners }){
    const wideA = document.getElementById("sponsor-banner-link");
    const sideA = document.getElementById("sponsor-logo-link");
    const ctaA  = document.getElementById("sponsor-cta");

    const nameBanner = document.getElementById("sponsor-name-banner");
    const subBanner  = document.getElementById("sponsor-subtitle-banner");
    const nameSide   = document.getElementById("sponsor-name-sidebar");
    const subSide    = document.getElementById("sponsor-subtitle-sidebar");
    const descSide   = document.getElementById("sponsor-desc-sidebar");
    const partnerBox = document.getElementById("partner-box");

    const wideImg   = pickUrl(sponsor?.logo_wide || sponsor?.logo_2 || "");
    const squareImg = pickUrl(sponsor?.logo_square || sponsor?.logo_1 || "");
    const link      = pickUrl(sponsor?.link || sponsor?.url || sponsor?.website || "");

    const fbWide    = pickUrl(fallbackBanners?.wide || "");
    const fbSquare  = pickUrl(fallbackBanners?.square || "");
    const hasSponsor = !!(wideImg || squareImg || link || sponsor?.name);

    const finalLink = link || "#";
    if (wideA) wideA.href = finalLink;
    if (sideA) sideA.href = finalLink;
    if (ctaA)  ctaA.href  = finalLink;

    const showAny = hasSponsor || !!fbWide || !!fbSquare;

    // Wide banner
    if (wideA) {
      if (wideImg) {
        wideA.classList.add("has-image");
        wideA.style.backgroundImage = `url("${wideImg}")`;
      } else if (fbWide) {
        wideA.classList.add("has-image");
        wideA.style.backgroundImage = `url("${fbWide}")`;
      } else {
        wideA.classList.remove("has-image");
        wideA.style.backgroundImage = "";
      }

      toggle(wideA, showAny);
    }

    if (nameBanner) nameBanner.textContent = (sponsor?.name || sponsor?.company || "Partenaire");
    if (subBanner)  subBanner.textContent  = (sponsor?.tagline || sponsor?.subtitle || "");

    // Square logo
    if (partnerBox) {
      const img = squareImg || fbSquare;
      if (img) {
        partnerBox.innerHTML = `<img alt="${esc(sponsor?.name || "Sponsor")}" src="${img}" loading="lazy" />`;
      } else {
        // keep default icon
      }
    }

    if (nameSide) nameSide.textContent = (sponsor?.name || sponsor?.company || "Partenaire");
    if (subSide)  subSide.textContent  = (sponsor?.tagline || sponsor?.subtitle || "");
    if (descSide) descSide.textContent = (sponsor?.description || sponsor?.desc || "");

    // CTA enable/disable
    if (ctaA) {
      if (!finalLink || finalLink === "#") {
        ctaA.style.opacity = "0.55";
        ctaA.style.pointerEvents = "none";
      } else {
        ctaA.style.opacity = "";
        ctaA.style.pointerEvents = "";
      }
    }
  }

  function renderFAQ(faq){
    const card = document.getElementById("faq-card");
    const list = document.getElementById("faq-list");
    if (!card || !list) return;

    const items = Array.isArray(faq) ? faq : [];
    if (!items.length) { toggle(card, false); return; }

    list.innerHTML = items.map((it, idx) => {
      const q = esc(it.question || it.q || `Question ${idx+1}`);
      const a = String(it.answer || it.a || "").trim();
      return `
        <div class="faq-item">
          <button type="button" data-faq="${idx}">
            <div class="faq-q"><span style="font-size:18px;">❓</span><span class="qtxt">${q}</span></div>
            <span aria-hidden="true">⌄</span>
          </button>
          <div class="faq-a" id="faq-a-${idx}">${a}</div>
        </div>
      `;
    }).join("");

    qsa("button[data-faq]", list).forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-faq");
        const ans = document.getElementById(`faq-a-${idx}`);
        if (!ans) return;
        const isOn = ans.classList.toggle("show");
        btn.querySelector("span[aria-hidden='true']")?.setAttribute("style", `transform: rotate(${isOn ? "180deg" : "0deg"}); display:inline-block; transition: transform .2s ease;`);
      });
    });

    toggle(card, true);
  }

  function renderBlocs(blocs){
    const wrap = document.getElementById("blocs-wrap");
    const grid = document.getElementById("blocs-grid");
    if (!wrap || !grid) return;

    const items = Array.isArray(blocs) ? blocs : [];
    if (!items.length) { toggle(wrap, false); return; }

    // 2 columns on md+
    grid.style.gridTemplateColumns = "1fr";
    if (window.matchMedia && window.matchMedia("(min-width: 768px)").matches) {
      grid.style.gridTemplateColumns = "1fr 1fr";
    }

    grid.innerHTML = items.map((b, idx) => {
      const title = esc(b.title || b.titre || `Bloc ${idx+1}`);
      const icon  = esc(b.icon || "📌");
      const theme = String(b.theme || "").toLowerCase();
      const headerClass =
        theme.includes("green") ? "pastel-green" :
        theme.includes("purple") ? "pastel-purple" :
        theme.includes("orange") ? "pastel-orange" :
        theme.includes("pink") ? "pastel-pink" :
        theme.includes("cyan") ? "pastel-cyan" :
        "pastel-blue";

      return `
        <div class="card">
          <div class="card-header ${headerClass}">
            <div class="section-title" style="font-size:15px;">${icon} ${title}</div>
          </div>
          <div class="rich-content" style="font-size:14px;">${String(b.html || b.content || b.text || "")}</div>
        </div>
      `;
    }).join("");

    toggle(wrap, true);
  }

  // =========================================================
  // Filters (CMS JSON optional)
  // =========================================================
  function initFilters({ isoInitial, slugInitial }){
    const selPays = document.getElementById("filter-pays");
    const selSect = document.getElementById("filter-secteur");
    const inpMet  = document.getElementById("filter-metier");
    const suggBox = document.getElementById("metier-suggestions");
    const reset   = document.getElementById("reset-filters");
    const countEl = document.getElementById("result-count");

    const cmsPays     = readJsonScript("ulydia-cms-pays") || null;
    const cmsSecteurs = readJsonScript("ulydia-cms-secteurs") || null;
    const cmsMetiers  = readJsonScript("ulydia-cms-metiers") || null;

    // Pays options
    if (selPays) {
      const list = Array.isArray(cmsPays) && cmsPays.length ? cmsPays : [
        { iso:"FR", label:"🇫🇷 France" }, { iso:"BE", label:"🇧🇪 Belgique" }, { iso:"CH", label:"🇨🇭 Suisse" },
        { iso:"CA", label:"🇨🇦 Canada" }, { iso:"LU", label:"🇱🇺 Luxembourg" }, { iso:"UK", label:"🇬🇧 Royaume-Uni" },
        { iso:"US", label:"🇺🇸 États-Unis" }, { iso:"DE", label:"🇩🇪 Allemagne" }, { iso:"ES", label:"🇪🇸 Espagne" },
        { iso:"IT", label:"🇮🇹 Italie" }, { iso:"PT", label:"🇵🇹 Portugal" }, { iso:"NL", label:"🇳🇱 Pays-Bas" }
      ];
      selPays.innerHTML = [
        `<option value="">Tous les pays</option>`,
        ...list.map(p => `<option value="${esc(p.iso)}">${esc(p.label || p.iso)}</option>`)
      ].join("");

      const cur = isoInitial || "FR";
      const opt = qsa("option", selPays).find(o => o.value === cur);
      if (opt) opt.selected = true;
    }

    // Secteur options
    if (selSect) {
      const list = Array.isArray(cmsSecteurs) && cmsSecteurs.length ? cmsSecteurs : [
        { id:"tech", label:"💻 Technologies & Numérique" },
        { id:"finance", label:"💰 Finance & Banque" },
        { id:"sante", label:"🏥 Santé & Médical" },
        { id:"commerce", label:"🛍️ Commerce & Distribution" },
        { id:"industrie", label:"🏭 Industrie & Manufacturing" },
        { id:"construction", label:"🏗️ BTP & Construction" },
        { id:"transport", label:"🚚 Transport & Logistique" },
        { id:"education", label:"📚 Éducation & Formation" },
        { id:"communication", label:"📢 Communication & Marketing" },
        { id:"juridique", label:"⚖️ Juridique & Droit" },
        { id:"rh", label:"👥 Ressources Humaines" },
        { id:"hotellerie", label:"🏨 Hôtellerie & Restauration" },
        { id:"environnement", label:"🌱 Environnement & Énergie" },
        { id:"art", label:"🎨 Arts & Culture" },
        { id:"securite", label:"🔒 Sécurité & Défense" },
      ];
      selSect.innerHTML = [
        `<option value="">Tous les secteurs</option>`,
        ...list.map(s => `<option value="${esc(s.id)}">${esc(s.label || s.id)}</option>`)
      ].join("");
    }

    function filteredMetiers(query){
      const q = String(query || "").trim().toLowerCase();
      if (!q || q.length < 2) return [];
      const selectedPays = selPays ? String(selPays.value || "") : "";
      const selectedSecteur = selSect ? String(selSect.value || "") : "";

      const db = Array.isArray(cmsMetiers) ? cmsMetiers : [];
      return db.filter(m => {
        const name = String(m.name || m.nom || "").toLowerCase();
        const matchesQuery = name.includes(q);
        const matchesPays = !selectedPays || !Array.isArray(m.pays) || m.pays.includes(selectedPays);
        const matchesSect = !selectedSecteur || String(m.secteur_id || m.secteur || "") === selectedSecteur;
        return matchesQuery && matchesPays && matchesSect;
      }).slice(0, 20);
    }

    function renderSuggestions(items){
      if (!suggBox) return;
      if (!Array.isArray(items) || !items.length) {
        suggBox.innerHTML = `<div style="padding:12px 14px; font-weight:700; font-size:14px; color: var(--muted);">Aucun métier trouvé</div>`;
        suggBox.classList.add("show");
        return;
      }
      suggBox.innerHTML = items.map(m => {
        const name = esc(m.name || m.nom || "Métier");
        const secteur = esc(m.secteur_label || m.secteur || m.secteur_id || "");
        const slug = esc(m.slug || "");
        return `<div class="ul-sugg-item" data-slug="${slug}" data-name="${name}">
          <span>${name}</span>
          ${secteur ? `<span class="ul-sugg-tag">${secteur}</span>` : ``}
        </div>`;
      }).join("");
      suggBox.classList.add("show");

      qsa(".ul-sugg-item", suggBox).forEach(row => {
        row.addEventListener("click", () => {
          const slug = row.getAttribute("data-slug") || "";
          const name = row.getAttribute("data-name") || "";
          if (inpMet) inpMet.value = name;
          suggBox.classList.remove("show");
          if (slug) {
            // keep selected filters in URL + localStorage
            const iso = selPays ? String(selPays.value || "") : "";
            if (iso) localStorage.setItem("ulydia_iso", iso);
            const url = new URL(location.href);
            url.searchParams.set("slug", slug);
            if (iso) url.searchParams.set("iso", iso);
            // do not force sector in URL; it's just a filter helper
            location.href = url.toString();
          }
        });
      });
    }

    function applyCount(){
      if (!countEl) return;
      const selectedPays = selPays ? String(selPays.value || "") : "";
      const selectedSecteur = selSect ? String(selSect.value || "") : "";
      const db = Array.isArray(cmsMetiers) ? cmsMetiers : [];
      const n = db.filter(m => {
        const matchesPays = !selectedPays || !Array.isArray(m.pays) || m.pays.includes(selectedPays);
        const matchesSect = !selectedSecteur || String(m.secteur_id || m.secteur || "") === selectedSecteur;
        return matchesPays && matchesSect;
      }).length;
      countEl.textContent = String(n);
    }

    // events
    if (inpMet && suggBox) {
      inpMet.addEventListener("input", () => {
        const items = filteredMetiers(inpMet.value);
        renderSuggestions(items);
      });
      inpMet.addEventListener("focus", () => {
        const items = filteredMetiers(inpMet.value);
        if (items.length) renderSuggestions(items);
      });
      document.addEventListener("click", (e) => {
        if (!suggBox.contains(e.target) && e.target !== inpMet) {
          suggBox.classList.remove("show");
        }
      });
    }

    if (selPays) selPays.addEventListener("change", () => {
      const iso = String(selPays.value || "").toUpperCase();
      if (iso) localStorage.setItem("ulydia_iso", iso);
      applyCount();
    });

    if (selSect) selSect.addEventListener("change", () => {
      applyCount();
    });

    if (reset) reset.addEventListener("click", () => {
      if (selPays) selPays.value = "";
      if (selSect) selSect.value = "";
      if (inpMet) inpMet.value = "";
      if (suggBox) suggBox.classList.remove("show");
      localStorage.removeItem("ulydia_iso");
      applyCount();
    });

    applyCount();

    // prefill metier input from slug if we can
    if (inpMet && slugInitial && Array.isArray(cmsMetiers)) {
      const found = cmsMetiers.find(m => (m.slug || "") === slugInitial);
      if (found) inpMet.value = found.name || found.nom || "";
    }
  }

  // =========================================================
  // Main
  // =========================================================
  async function main(){
    injectCSS();

    // Root (shell mode)
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.prepend(root);
    }

    renderShell(root);

    const slug = detectSlug();
    const iso  = detectISO();
    initFilters({ isoInitial: iso, slugInitial: slug });

    if (!slug) {
      // No slug yet: keep UI (filters) but show a hint.
      setText("nom-metier", "Choisis un métier");
      setText("accroche-metier", "Utilise la recherche ci-dessus pour sélectionner une fiche métier.");
      const h1 = document.getElementById("nom-metier");
      const p  = document.getElementById("accroche-metier");
      h1 && h1.classList.remove("skeleton");
      p && p.classList.remove("skeleton");
      return;
    }

    log("fetch metier-page", { slug, iso });

    const data = await fetchJSON(`${WORKER_URL}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`);

    log("data", data);

    const metier = data?.metier || {};
    const pays   = data?.pays || {};
    const sponsor = data?.sponsor || metier?.sponsor || null;

    // Header
    const h1 = document.getElementById("nom-metier");
    const p  = document.getElementById("accroche-metier");
    if (h1) h1.classList.remove("skeleton");
    if (p)  p.classList.remove("skeleton");
    setText("nom-metier", metier.name || metier.nom || metier.titre || slug);
    setText("accroche-metier", metier.tagline || metier.accroche || metier.subtitle || "");

    // Titles (optional)
    setText("description-title", metier.description_title || "Vue d'ensemble");
    setText("missions-title", metier.missions_title || "Missions principales");
    setText("competences-title", metier.competences_title || "Compétences clés");
    setText("environnements-title", metier.environnements_title || "Environnements de travail");
    setText("profil-title", metier.profil_title || "Profil recherché");
    setText("evolutions-title", metier.evolutions_title || "Évolutions possibles");
    setText("faq-title", metier.faq_title || "Questions fréquentes");

    // Main sections: prefer *_html; fallback to plain text
    setHTML("section-description", metier.description_html || (metier.description ? `<p>${esc(metier.description)}</p>` : ""));
    setHTML("section-missions", metier.missions_html || (metier.missions ? `<p>${esc(metier.missions)}</p>` : ""));
    setHTML("section-competences", metier.competences_html || (metier.competences ? `<p>${esc(metier.competences)}</p>` : ""));
    setHTML("section-environnements", metier.environnements_html || (metier.environnements ? `<p>${esc(metier.environnements)}</p>` : ""));
    setHTML("section-profil", metier.profil_html || (metier.profil ? `<p>${esc(metier.profil)}</p>` : ""));
    setHTML("section-evolutions", metier.evolutions_html || (metier.evolutions ? `<p>${esc(metier.evolutions)}</p>` : ""));

    // Sponsor & banners (fallback to pays banners language-specific)
    const fallbackBanners = {
      wide: pays?.banners?.wide || pays?.banniere_large || "",
      square: pays?.banners?.square || pays?.banniere_carre || "",
    };
    setSponsorAssets({ sponsor, fallbackBanners });

    // Optional blocks & FAQ
    renderBlocs(data?.blocs || metier?.blocs || []);
    renderFAQ(data?.faq || metier?.faq || []);

    // If some sections are empty, add a tiny placeholder (to avoid blank cards)
    const sectionIds = [
      "section-description","section-missions","section-competences",
      "section-environnements","section-profil","section-evolutions"
    ];
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !String(el.textContent || "").trim()) {
        el.innerHTML = `<p class="muted" style="font-weight:700;">Contenu à venir.</p>`;
      }
    });
  }

  main().catch((e) => {
    console.error("[metier-page] fatal", e);
    showError(e?.message || String(e));
  });
})();
