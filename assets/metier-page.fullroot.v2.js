/* metier-page.js — Ulydia FULL-ROOT (v2)
   FIXES vs v1:
   - Keeps design (cards/grid) and renders CMS HTML safely (no visible <p><strong>)
   - Non-sponsor fallback banners: much more tolerant field mapping + ratio-based wide/square
   - Hides banner blocks when missing
   - Still renders EVERYTHING inside #ulydia-metier-root (never touches template header/footer)
*/

(() => {
  const VERSION = "fullroot-v2";
  const GUARD = "__ULYDIA_METIER_PAGE_FULLROOT_V2__";
  if (window[GUARD]) return;
  window[GUARD] = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;

  function log(...a){ if (DEBUG) console.log("[metier-page]", VERSION, ...a); }
  function warn(...a){ console.warn("[metier-page]", VERSION, ...a); }

  // -------------------------------
  // CONFIG (from globals or fallback)
  // -------------------------------
  const WORKER_URL   = String(window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev").replace(/\/+$/,"");
  const PROXY_SECRET = String(window.ULYDIA_PROXY_SECRET || "");
  const IPINFO_TOKEN = String(window.ULYDIA_IPINFO_TOKEN || "");

  // -------------------------------
  // ROOT (single mount point)
  // -------------------------------
  function getRoot(){
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      (document.body || document.documentElement).appendChild(root);
      warn("Missing #ulydia-metier-root in template. Root auto-created at end of body.");
    }
    return root;
  }

  // -------------------------------
  // CSS
  // -------------------------------
  function injectCSSOnce(){
    if (document.getElementById("ul-metier-css")) return;
    const css = `
      .ul-metier{font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a}
      .ul-metier *{box-sizing:border-box}
      .ul-metier .ul-wrap{max-width:1120px;margin:0 auto;padding:28px}
      .ul-metier .ul-topbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}
      .ul-metier .ul-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .ul-metier .ul-select,.ul-metier .ul-input{height:40px;border:1px solid rgba(15,23,42,.14);border-radius:12px;padding:0 12px;background:#fff;min-width:220px;outline:none}
      .ul-metier .ul-input{min-width:280px}
      .ul-metier .ul-btn{height:40px;border-radius:12px;border:1px solid rgba(15,23,42,.14);background:#fff;padding:0 14px;cursor:pointer}
      .ul-metier .ul-btn-primary{background:#4f46e5;border-color:#4f46e5;color:#fff}
      .ul-metier .ul-hero{display:flex;gap:16px;align-items:flex-start;justify-content:space-between}
      .ul-metier .ul-hero-left{flex:1;min-width:280px}
      .ul-metier .ul-badge{display:inline-flex;gap:8px;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(79,70,229,.10);color:#4338ca;font-weight:700;font-size:12px}
      .ul-metier .ul-title{font-size:36px;line-height:1.12;margin:10px 0 10px}
      .ul-metier .ul-sub{color:rgba(15,23,42,.70);max-width:860px;margin:0 0 14px}
      .ul-metier .ul-banner-wide{width:100%;border-radius:18px;overflow:hidden;border:1px solid rgba(15,23,42,.08);background:#f8fafc}
      .ul-metier .ul-banner-wide a{display:block;width:100%;height:120px;background-size:cover;background-position:center}
      .ul-metier .ul-grid{display:grid;grid-template-columns: 1fr 340px;gap:18px;margin-top:18px}
      @media (max-width: 960px){ .ul-metier .ul-grid{grid-template-columns:1fr} }
      .ul-metier .ul-card{background:#fff;border:1px solid rgba(15,23,42,.10);border-radius:18px;padding:16px;box-shadow:0 10px 26px rgba(15,23,42,.06)}
      .ul-metier .ul-card h3{margin:0 0 10px;font-size:13px;color:rgba(15,23,42,.70);font-weight:800;letter-spacing:.2px}
      .ul-metier .ul-body{font-size:14px;line-height:1.6;color:rgba(15,23,42,.92)}
      .ul-metier .ul-body p{margin:0 0 10px}
      .ul-metier .ul-body ul{margin:10px 0 0;padding-left:18px}
      .ul-metier .ul-body li{margin:6px 0}
      .ul-metier .ul-side{display:flex;flex-direction:column;gap:14px}
      .ul-metier .ul-banner-square{border-radius:18px;overflow:hidden;border:1px solid rgba(15,23,42,.08);background:#f8fafc}
      .ul-metier .ul-banner-square a{display:block;width:100%;height:270px;background-size:cover;background-position:center}
      .ul-metier .ul-muted{color:rgba(15,23,42,.60);font-size:12px}
      .ul-metier .ul-error{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);color:#7f1d1d;padding:14px;border-radius:14px}
      .ul-metier .ul-loading{display:flex;gap:10px;align-items:center}
      .ul-metier .ul-dot{width:10px;height:10px;border-radius:999px;background:#7c3aed}
      .ul-metier .ul-hidden{display:none!important}
    `;
    const style = document.createElement("style");
    style.id = "ul-metier-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // -------------------------------
  // Helpers
  // -------------------------------
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }

  function qs(name){
    try { return new URL(location.href).searchParams.get(name); } catch(_) { return null; }
  }

  function detectSlug(){
    return String(qs("slug") || qs("metier") || "").trim();
  }

  function detectISOFromURL(){
    return String(qs("iso") || qs("country") || "").trim().toUpperCase();
  }

  async function fetchJSON(url, opt){
    const res = await fetch(url, opt);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch(_) {}
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function detectISO(){
    const fromUrl = detectISOFromURL();
    if (fromUrl) return fromUrl;

    try {
      const u = `${WORKER_URL}/v1/geo`;
      const headers = {};
      if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;
      const d = await fetchJSON(u, { headers, cache: "no-store" });
      const iso = String(d?.iso || d?.country || "").toUpperCase();
      if (iso) return iso;
    } catch(e) {
      log("geo fallback", e?.message || e);
    }

    if (!IPINFO_TOKEN) return "FR";
    try{
      const d = await fetchJSON(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`, { cache: "no-store" });
      const iso = String(d?.country || "").toUpperCase();
      return iso || "FR";
    } catch(e){
      return "FR";
    }
  }

  async function fetchMetierPage(slug, iso){
    const url = `${WORKER_URL}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
    const headers = { "accept":"application/json" };
    if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;
    return await fetchJSON(url, { headers, cache: "no-store" });
  }

  function pickUrl(u){
    const s = String(u || "").trim();
    if (!s) return "";
    return s;
  }

  function deepGet(obj, path){
    try{
      return path.split(".").reduce((acc,k)=> (acc && acc[k] != null) ? acc[k] : undefined, obj);
    }catch(_){ return undefined; }
  }

  function extractUrlsFromAny(x){
    const out = [];
    if (!x) return out;
    if (typeof x === "string") {
      const s = x.trim();
      if (s) out.push(s);
      return out;
    }
    if (Array.isArray(x)) {
      x.forEach(v => out.push(...extractUrlsFromAny(v)));
      return out;
    }
    if (typeof x === "object") {
      // common Webflow/Airtable shapes
      if (typeof x.url === "string") out.push(x.url);
      if (typeof x.src === "string") out.push(x.src);
      if (typeof x.href === "string") out.push(x.href);
      if (typeof x.value === "string") out.push(x.value);
      // sometimes {file:{url}}
      if (x.file) out.push(...extractUrlsFromAny(x.file));
    }
    return out.map(s => String(s||"").trim()).filter(Boolean);
  }

  function collectFallbackCandidates(payload){
    const pays = payload?.pays || {};
    const meta = payload?.meta || payload || {};

    const paths = [
      // current expected
      "pays.banners.wide",
      "pays.banners.square",
      // alternate
      "pays.banner_wide",
      "pays.banner_square",
      "pays.banniere_wide",
      "pays.banniere_square",
      // common "attente sponsorisation"
      "pays.banners_attente_sponsorisation.wide",
      "pays.banners_attente_sponsorisation.square",
      "pays.banniere_attente_sponsorisation_wide",
      "pays.banniere_attente_sponsorisation_square",
      "pays.banniere_attente_sponsorisation_1",
      "pays.banniere_attente_sponsorisation_2",
      // meta fallback
      "meta.banners.wide",
      "meta.banners.square",
      "meta.banner_wide",
      "meta.banner_square",
      "meta.banniere_wide",
      "meta.banniere_square",
      "meta.banniere_attente_sponsorisation_1",
      "meta.banniere_attente_sponsorisation_2",
      // sometimes directly on payload
      "banners.wide",
      "banners.square"
    ];

    const urls = [];
    for (const p of paths) {
      const v = deepGet({ pays, meta, banners: payload?.banners }, p);
      urls.push(...extractUrlsFromAny(v));
    }

    // de-dup
    const seen = new Set();
    return urls.filter(u => (seen.has(u) ? false : (seen.add(u), true)));
  }

  async function classifyBanner(url){
    url = pickUrl(url);
    if (!url) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ url, type: img.width >= img.height ? "wide" : "square" });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function mapBannersByRatio(urls){
    const results = (await Promise.all((urls || []).map(classifyBanner))).filter(Boolean);
    const wide = results.find(r => r.type === "wide");
    const square = results.find(r => r.type === "square");
    return { wide: wide?.url || "", square: square?.url || "" };
  }

  function stripScripts(html){
    // minimal safety: remove script tags
    return String(html || "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }

  function renderBodyHTML(val){
    if (!val) return "";
    if (Array.isArray(val)) {
      const items = val.map(x => String(x||"").trim()).filter(Boolean);
      if (!items.length) return "";
      return `<ul>${items.map(li => `<li>${esc(li)}</li>`).join("")}</ul>`;
    }
    const s = String(val).trim();
    if (!s) return "";
    // If it's already HTML (contains tags), keep it (after stripping scripts)
    if (/[<][a-z!/]/i.test(s)) return stripScripts(s);
    // Otherwise treat as plain text paragraphs
    const parts = s.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
    return parts.map(p => `<p>${esc(p)}</p>`).join("");
  }

  // -------------------------------
  // Render
  // -------------------------------
  function renderLoading(root){
    root.innerHTML = `
      <div class="ul-metier">
        <div class="ul-wrap">
          <div class="ul-loading">
            <div class="ul-dot"></div>
            <div>
              <div style="font-weight:800">Chargement de la fiche métier…</div>
              <div class="ul-muted">Ulydia</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderError(root, title, err){
    const msg = esc(err?.message || err || "Erreur inconnue");
    root.innerHTML = `
      <div class="ul-metier">
        <div class="ul-wrap">
          <div class="ul-error">
            <div style="font-weight:900;margin-bottom:6px">${esc(title || "Erreur")}</div>
            <div style="white-space:pre-wrap">${msg}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPage(root, payload){
    const metier = payload?.metier || {};
    const pays = payload?.pays || {};
    const meta = payload?.meta || payload || {};

    const name = metier?.name || metier?.titre || metier?.title || metier?.slug || "Fiche métier";
    const desc = metier?.description || metier?.resume || metier?.subtitle || "";

    // Sponsor
    const sponsorLink = pickUrl(meta?.sponsor?.link || meta?.sponsor?.url || meta?.sponsor_link || "");
    const sponsorWide  = pickUrl(meta?.sponsor?.logo_2 || meta?.sponsor?.logo_wide || meta?.sponsor?.wide || "");
    const sponsorSquare= pickUrl(meta?.sponsor?.logo_1 || meta?.sponsor?.logo_square || meta?.sponsor?.square || "");

    const sections = [
      { key:"overview", title:"Vue d'ensemble", body: metier?.vue_ensemble || metier?.overview || metier?.description_long || metier?.description || "" },
      { key:"missions", title:"Missions principales", body: metier?.missions || metier?.missions_principales || "" },
      { key:"skills", title:"Compétences clés", body: metier?.competences || metier?.skills || "" },
      { key:"env", title:"Environnements de travail", body: metier?.environnements || metier?.environnement_travail || metier?.work_environment || "" },
    ].filter(s => String(s.body||"").trim());

    root.innerHTML = `
      <div class="ul-metier">
        <div class="ul-wrap">

          <div class="ul-topbar" aria-label="Recherche">
            <div class="ul-filters">
              <select class="ul-select" id="ul-country">
                <option value="${esc(payload?.iso || pays?.iso || "")}">${esc((payload?.iso || pays?.iso || "").toUpperCase() || "FR")}</option>
              </select>
              <select class="ul-select" id="ul-sector">
                <option value="">Secteur d'activité</option>
              </select>
              <input class="ul-input" id="ul-search" placeholder="Rechercher un métier" />
            </div>
            <button class="ul-btn" id="ul-reset">Réinitialiser</button>
          </div>

          <div class="ul-hero">
            <div class="ul-hero-left">
              <span class="ul-badge">Fiche métier</span>
              <div class="ul-title">${esc(name)}</div>
              ${desc ? `<div class="ul-sub">${renderBodyHTML(desc)}</div>` : ""}
              <div class="ul-banner-wide" id="ul-banner-wide">
                <a id="ul-banner-wide-a" href="${esc(sponsorLink || "#")}" target="_blank" rel="noopener"></a>
              </div>
            </div>
          </div>

          <div class="ul-grid">
            <div class="ul-main">
              ${sections.map(s => `
                <div class="ul-card" data-sec="${esc(s.key)}">
                  <h3>${esc(s.title)}</h3>
                  <div class="ul-body">${renderBodyHTML(s.body)}</div>
                </div>
              `).join('<div style="height:14px"></div>')}
            </div>

            <div class="ul-side">
              <div class="ul-card">
                <h3>Partenaire</h3>
                <div class="ul-banner-square" id="ul-banner-square">
                  <a id="ul-banner-square-a" href="${esc(sponsorLink || "#")}" target="_blank" rel="noopener"></a>
                </div>
                <div style="height:10px"></div>
                <button class="ul-btn ul-btn-primary" id="ul-cta-sponsor">En savoir plus</button>
              </div>

              ${String(metier?.soft_skills || "").trim() ? `
                <div class="ul-card">
                  <h3>Soft Skills essentiels</h3>
                  <div class="ul-body">${renderBodyHTML(metier.soft_skills)}</div>
                </div>
              ` : ""}
            </div>
          </div>

        </div>
      </div>
    `;

    // Buttons
    const btn = root.querySelector("#ul-cta-sponsor");
    if (btn) btn.addEventListener("click", () => {
      if (sponsorLink) window.open(sponsorLink, "_blank", "noopener");
      else alert("Vous désirez sponsoriser ce métier ?");
    });

    // Apply banners
    (async () => {
      const wideWrap = root.querySelector("#ul-banner-wide");
      const wideA = root.querySelector("#ul-banner-wide-a");
      const squareWrap = root.querySelector("#ul-banner-square");
      const squareA = root.querySelector("#ul-banner-square-a");

      function setBanner(a, url){
        const u = pickUrl(url);
        if (!a || !u) return false;
        a.style.backgroundImage = `url(${u})`;
        return true;
      }
      function hide(el){ if (el) el.classList.add("ul-hidden"); }

      // Sponsor takes precedence
      if (sponsorWide || sponsorSquare) {
        const okWide = setBanner(wideA, sponsorWide || sponsorSquare);
        const okSq   = setBanner(squareA, sponsorSquare || sponsorWide);

        if (!okWide) hide(wideWrap);
        if (!okSq) hide(squareWrap);

        if (!sponsorLink) {
          wideA?.removeAttribute("href");
          squareA?.removeAttribute("href");
        }
        return;
      }

      // Fallback
      const candidates = collectFallbackCandidates(payload);
      log("fallback candidates", candidates);

      const mapped = await mapBannersByRatio(candidates);
      const okWide = setBanner(wideA, mapped.wide);
      const okSq   = setBanner(squareA, mapped.square);

      if (!okWide) hide(wideWrap);
      if (!okSq) hide(squareWrap);

      wideA?.removeAttribute("href");
      squareA?.removeAttribute("href");
    })().catch(e => log("banner apply error", e));
  }

  // -------------------------------
  // Boot
  // -------------------------------
  async function boot(){
    injectCSSOnce();
    const root = getRoot();

    renderLoading(root);

    const slug = detectSlug();
    if (!slug) {
      renderError(root, "Paramètre manquant", "URL attendue: /metier?slug=VOTRE_METIER&country=FR");
      return;
    }

    const iso = await detectISO();
    log("boot", { slug, iso, WORKER_URL });

    const data = await fetchMetierPage(slug, iso);
    renderPage(root, data);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => boot().catch(e => {
      console.error("[metier-page] fatal", e);
      renderError(getRoot(), "Erreur au chargement", e);
    }));
  } else {
    boot().catch(e => {
      console.error("[metier-page] fatal", e);
      renderError(getRoot(), "Erreur au chargement", e);
    });
  }
})();