/* metier-page.js — Ulydia FULL-ROOT (v1)
   - Renders EVERYTHING inside #ulydia-metier-root (no DOM moves outside root)
   - Uses template header/footer untouched
   - Sponsor + fallback banners (wide + square) with clickthrough
   - Robust fallback mapping by image ratio
   - Fetches data from WORKER_URL /v1/metier-page
*/

(() => {
  const VERSION = "fullroot-v1";
  const GUARD = "__ULYDIA_METIER_PAGE_FULLROOT_V1__";
  if (window[GUARD]) return;
  window[GUARD] = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__ || !!window.__METIER_PAGE_DEBUG__;

  function log(...a){ if (DEBUG) console.log("[metier-page]", VERSION, ...a); }
  function warn(...a){ console.warn("[metier-page]", VERSION, ...a); }

  // -------------------------------
  // CONFIG (from globals or fallback)
  // -------------------------------
  const WORKER_URL   = String(window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev").replace(/\/+$/,"");
  const PROXY_SECRET = String(window.ULYDIA_PROXY_SECRET || ""); // optional but recommended
  const IPINFO_TOKEN = String(window.ULYDIA_IPINFO_TOKEN || ""); // optional

  // -------------------------------
  // ROOT (single mount point)
  // -------------------------------
  function getRoot(){
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      // last-resort: create at end of body (still FULL-ROOT, no header moves)
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      (document.body || document.documentElement).appendChild(root);
      warn("Missing #ulydia-metier-root in template. Root auto-created at end of body.");
    }
    return root;
  }

  // -------------------------------
  // CSS (scoped-ish via .ul-metier)
  // -------------------------------
  function injectCSSOnce(){
    if (document.getElementById("ul-metier-css")) return;
    const css = `
      .ul-metier{font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a}
      .ul-metier *{box-sizing:border-box}
      .ul-metier .ul-wrap{max-width:1100px;margin:0 auto;padding:24px}
      .ul-metier .ul-topbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}
      .ul-metier .ul-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .ul-metier .ul-select,.ul-metier .ul-input{height:38px;border:1px solid rgba(15,23,42,.14);border-radius:10px;padding:0 12px;background:#fff;min-width:220px}
      .ul-metier .ul-input{min-width:260px}
      .ul-metier .ul-btn{height:38px;border-radius:10px;border:1px solid rgba(15,23,42,.14);background:#fff;padding:0 12px;cursor:pointer}
      .ul-metier .ul-btn-primary{background:#4f46e5;border-color:#4f46e5;color:#fff}
      .ul-metier .ul-hero{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;margin-top:6px}
      .ul-metier .ul-hero-left{flex:1;min-width:280px}
      .ul-metier .ul-badge{display:inline-flex;gap:8px;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(79,70,229,.10);color:#4338ca;font-weight:600;font-size:12px}
      .ul-metier .ul-title{font-size:34px;line-height:1.15;margin:8px 0 8px}
      .ul-metier .ul-sub{color:rgba(15,23,42,.70);max-width:820px;margin:0 0 12px}
      .ul-metier .ul-banner-wide{width:100%;border-radius:16px;overflow:hidden;border:1px solid rgba(15,23,42,.08);background:#f8fafc;min-height:110px}
      .ul-metier .ul-banner-wide a{display:block;width:100%;height:120px;background-size:cover;background-position:center}
      .ul-metier .ul-grid{display:grid;grid-template-columns: 1fr 320px;gap:18px;margin-top:18px}
      @media (max-width: 920px){ .ul-metier .ul-grid{grid-template-columns:1fr} }
      .ul-metier .ul-card{background:#fff;border:1px solid rgba(15,23,42,.10);border-radius:16px;padding:16px;box-shadow:0 6px 18px rgba(15,23,42,.06)}
      .ul-metier .ul-card h3{margin:0 0 10px;font-size:14px;color:rgba(15,23,42,.70);display:flex;gap:8px;align-items:center}
      .ul-metier .ul-card .ul-body{font-size:14px;line-height:1.55;color:rgba(15,23,42,.90)}
      .ul-metier .ul-list{margin:10px 0 0;padding-left:18px}
      .ul-metier .ul-side{display:flex;flex-direction:column;gap:14px}
      .ul-metier .ul-banner-square{border-radius:16px;overflow:hidden;border:1px solid rgba(15,23,42,.08);background:#f8fafc}
      .ul-metier .ul-banner-square a{display:block;width:100%;height:260px;background-size:cover;background-position:center}
      .ul-metier .ul-muted{color:rgba(15,23,42,.60);font-size:12px}
      .ul-metier .ul-error{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);color:#7f1d1d;padding:14px;border-radius:14px}
      .ul-metier .ul-loading{display:flex;gap:10px;align-items:center}
      .ul-metier .ul-dot{width:10px;height:10px;border-radius:999px;background:#7c3aed}
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
    // support ?slug=, ?metier=
    return String(qs("slug") || qs("metier") || "").trim();
  }

  function detectISOFromURL(){
    // support ?iso=, ?country=
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

    // If your worker supports /v1/geo, prefer that; otherwise optional ipinfo.
    // We'll try worker /v1/geo first.
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

    if (!IPINFO_TOKEN) return "FR"; // safe default
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
    // if it's a Webflow asset object stringified somewhere, keep as-is.
    return s;
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

  async function mapFallbackBanners(urls){
    const results = (await Promise.all((urls || []).map(classifyBanner))).filter(Boolean);
    const wide = results.find(r => r.type === "wide");
    const square = results.find(r => r.type === "square");
    return { wide: wide?.url || "", square: square?.url || "" };
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
              <div style="font-weight:700">Chargement de la fiche métier…</div>
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
            <div style="font-weight:800;margin-bottom:6px">${esc(title || "Erreur")}</div>
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
    const desc = metier?.description || metier?.resume || "";

    // Sponsor info (if any)
    const sponsorLink = pickUrl(meta?.sponsor?.link || meta?.sponsor?.url || meta?.sponsor_link || "");
    const sponsorWide  = pickUrl(meta?.sponsor?.logo_2 || meta?.sponsor?.logo_wide || meta?.sponsor?.wide || "");
    const sponsorSquare= pickUrl(meta?.sponsor?.logo_1 || meta?.sponsor?.logo_square || meta?.sponsor?.square || "");

    // Country fallback (order may be wrong -> we will ratio-map if needed)
    const fbWideRaw   = pickUrl(pays?.banners?.wide || meta?.banners?.wide || "");
    const fbSquareRaw = pickUrl(pays?.banners?.square || meta?.banners?.square || "");

    const sections = [
      { key:"overview", title:"Vue d'ensemble", body: metier?.vue_ensemble || metier?.overview || metier?.description || "" },
      { key:"missions", title:"Missions principales", body: metier?.missions || metier?.missions_principales || "" },
      { key:"skills", title:"Compétences clés", body: metier?.competences || metier?.skills || "" },
      { key:"env", title:"Environnements de travail", body: metier?.environnements || metier?.environnement_travail || metier?.work_environment || "" },
    ].filter(s => String(s.body||"").trim());

    const side = [
      { key:"partner", title:"Partenaire", body:"" },
      { key:"soft", title:"Soft Skills essentiels", body: metier?.soft_skills || "" },
    ];

    // Shell skeleton: we’ll fill banners after (ratio mapping + sponsor/fallback selection)
    root.innerHTML = `
      <div class="ul-metier">
        <div class="ul-wrap">

          <div class="ul-topbar" aria-label="Recherche">
            <div class="ul-filters">
              <select class="ul-select" id="ul-country">
                <option value="${esc(payload?.iso || pays?.iso || "")}">${esc((payload?.iso || pays?.iso || "").toUpperCase() || "Pays")}</option>
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
              ${desc ? `<div class="ul-sub">${esc(desc)}</div>` : ""}
              <div class="ul-banner-wide" id="ul-banner-wide">
                <a href="${esc(sponsorLink || "#")}" target="_blank" rel="noopener" aria-label="Sponsor banner"></a>
              </div>
            </div>
          </div>

          <div class="ul-grid">
            <div class="ul-main">
              ${sections.map(s => `
                <div class="ul-card" data-sec="${esc(s.key)}">
                  <h3>${esc(s.title)}</h3>
                  <div class="ul-body">${formatBody(s.body)}</div>
                </div>
              `).join('<div style="height:14px"></div>')}
            </div>

            <div class="ul-side">
              <div class="ul-card">
                <h3>Partenaire</h3>
                <div class="ul-banner-square" id="ul-banner-square">
                  <a href="${esc(sponsorLink || "#")}" target="_blank" rel="noopener" aria-label="Sponsor square"></a>
                </div>
                <div style="height:10px"></div>
                <button class="ul-btn ul-btn-primary" id="ul-cta-sponsor">En savoir plus</button>
              </div>

              ${String(metier?.soft_skills || "").trim() ? `
                <div class="ul-card">
                  <h3>Soft Skills essentiels</h3>
                  <div class="ul-body">${formatBody(metier.soft_skills)}</div>
                </div>
              ` : ""}
            </div>
          </div>

        </div>
      </div>
    `;

    // Events (minimal)
    const btn = root.querySelector("#ul-cta-sponsor");
    if (btn) btn.addEventListener("click", () => {
      if (sponsorLink) window.open(sponsorLink, "_blank", "noopener");
      else alert("Vous désirez sponsoriser ce métier ?");
    });

    // Apply banners
    (async () => {
      const wideA = root.querySelector("#ul-banner-wide a");
      const squareA = root.querySelector("#ul-banner-square a");

      function setBanner(a, url){
        if (!a) return;
        const u = pickUrl(url);
        if (!u) {
          a.style.backgroundImage = "none";
          a.style.height = a.closest("#ul-banner-wide") ? "0px" : a.style.height;
          return;
        }
        a.style.backgroundImage = `url(${u})`;
      }

      if (sponsorWide || sponsorSquare) {
        // Sponsor: trust mapping (fields are controlled)
        setBanner(wideA, sponsorWide || sponsorSquare);
        setBanner(squareA, sponsorSquare || sponsorWide);
        if (!sponsorLink) {
          wideA.removeAttribute("href");
          squareA.removeAttribute("href");
        }
        return;
      }

      // Fallback: ratio-map (order-agnostic)
      const mapped = await mapFallbackBanners([fbWideRaw, fbSquareRaw].filter(Boolean));
      setBanner(wideA, mapped.wide);
      setBanner(squareA, mapped.square);

      // No clickthrough for fallback
      wideA.removeAttribute("href");
      squareA.removeAttribute("href");
    })().catch(e => log("banner apply error", e));
  }

  function formatBody(body){
    // Accept array or string; render bullets if looks like list
    if (Array.isArray(body)) {
      const items = body.map(x => String(x || "").trim()).filter(Boolean);
      if (!items.length) return "";
      return `<ul class="ul-list">${items.map(li => `<li>${esc(li)}</li>`).join("")}</ul>`;
    }
    const s = String(body || "").trim();
    if (!s) return "";
    // If it contains newlines or bullets, convert to list.
    const lines = s.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const bulletLike = lines.length >= 3 && lines.every(l => /^[-•\u2022]/.test(l) || l.length < 160);
    if (bulletLike) {
      const items = lines.map(l => l.replace(/^[-•\u2022]\s*/,"").trim()).filter(Boolean);
      return `<ul class="ul-list">${items.map(li => `<li>${esc(li)}</li>`).join("")}</ul>`;
    }
    // Else paragraphs
    return esc(s).split(/\n{2,}/).map(p => `<p style="margin:0 0 10px">${p}</p>`).join("");
  }

  // -------------------------------
  // Boot
  // -------------------------------
  async function boot(){
    injectCSSOnce();
    const root = getRoot();

    // FULL-ROOT: always render into root; do not touch anything outside root.
    renderLoading(root);

    const slug = detectSlug();
    if (!slug) {
      renderError(root, "Paramètre manquant", "URL attendue: /metier?slug=VOTRE_METIER&country=FR");
      return;
    }

    const iso = await detectISO();
    log("boot", { slug, iso, WORKER_URL });

    const data = await fetchMetierPage(slug, iso);
    log("data keys", Object.keys(data || {}));
    renderPage(root, data);
  }

  // Start
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