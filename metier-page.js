/* metier-page.js — Ulydia (V2)
   - Full JS-rendered Job page (dashboard-like UI)
   - Keeps SAME sponsor strategy: relies on existing sponsor boot script IDs:
     #block-sponsored, #block-not-sponsored, #nonSponsorBanner01, #nonSponsorBanner02
   - Adds "pending sponsorship" UX (front-only) without touching Worker
*/

(() => {
  if (window.__ULYDIA_METIER_PAGE_V2__) return;
  window.__ULYDIA_METIER_PAGE_V2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier-page]", ...a); };

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL    = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET  = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const IPINFO_TOKEN  = "941b787cc13473";

  const LOGIN_URL     = "/login";
  const SPONSOR_URL   = "/sponsor";

  // Optional full content endpoint (if you ever add it)
  const ENDPOINT_METIER_PAGE  = "/metier-page";
  const ENDPOINT_SPONSOR_INFO = "/sponsor-info";

  const ROOT_ID = "ul_metier_root";

  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
  const CC_CACHE_HOURS = 6;

  // Pending sponsorship UX (front only)
  const PENDING_TTL_MS = 20 * 60 * 1000; // 20 min
  const pendingKey = (metier, country) => `UL_SPONSOR_PENDING|${metier}|${country}`;

  // =========================================================
  // Helpers
  // =========================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $id = (id) => document.getElementById(id);
  const qp = (k) => new URLSearchParams(location.search).get(k);

  const safeUpper = (s) => String(s || "").trim().toUpperCase();
  const safeStr   = (s) => String(s || "").trim();

  function apiBase(){ return WORKER_URL.replace(/\/$/, ""); }

  function pickUrl(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v) && v[0]?.url) return v[0].url;
    if (v?.url) return v.url;
    return "";
  }

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v === false || v === null || v === undefined) {/*skip*/}
      else n.setAttribute(k, String(v));
    }
    (children || []).forEach((c) => {
      if (c === null || c === undefined) return;
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    });
    return n;
  }

  function setHTML(node, html){
    if (!node) return;
    node.innerHTML = String(html || "");
  }

  function preloadImage(url) {
    return new Promise((resolve) => {
      if (!url) return resolve();
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  }

  async function postJson(path, payload) {
    const res = await fetch(apiBase() + path, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": PROXY_SECRET,
      },
      body: JSON.stringify(payload || {})
    });

    const txt = await res.text().catch(() => "");
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }
    if (!res.ok) throw new Error(data.error || data.message || txt || ("Worker error " + res.status));
    return data;
  }

  // =========================================================
  // Country (cache + ipinfo)
  // =========================================================
  async function getCountry() {
    const fromQuery = qp("country");
    if (fromQuery) return safeUpper(fromQuery);

    const fromWindow = safeUpper(window.VISITOR_COUNTRY || "");
    if (fromWindow) return fromWindow;

    try {
      const raw = localStorage.getItem("ULYDIA_CC_CACHE");
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj?.cc && obj?.ts && (Date.now() - obj.ts) < CC_CACHE_HOURS * 60 * 60 * 1000) {
          return safeUpper(obj.cc);
        }
      }
    } catch(_) {}

    // ✅ Use ipinfo.io/json (stable) — you already use it in your sponsor boot script
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 900);

    const geo = await fetch(
      "https://ipinfo.io/json?token=" + encodeURIComponent(IPINFO_TOKEN),
      { cache: "no-store", signal: controller.signal }
    ).then(r => r.json()).catch(() => ({})).finally(() => clearTimeout(t));

    const cc = safeUpper(geo.country || "");
    if (cc) {
      try { localStorage.setItem("ULYDIA_CC_CACHE", JSON.stringify({ cc, ts: Date.now() })); } catch(_) {}
    }
    return cc || "";
  }

  // =========================================================
  // Metier slug
  // =========================================================
  function getMetierSlug(){
    const s1 = safeStr($(".metier-slug")?.textContent);
    if (s1) return s1;

    const s2 = safeStr(qp("metier") || qp("slug"));
    if (s2) return s2;

    const parts = String(location.pathname || "").split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function getLang(){
    const q = safeStr(qp("lang"));
    if (q) return q.toLowerCase();
    const h = safeStr(document.documentElement.getAttribute("lang"));
    if (h) return h.toLowerCase();
    return "fr";
  }

  // =========================================================
  // UI: CSS + Root
  // =========================================================
  function injectCSS(){
    if ($id("ul_metier_css")) return;

    const css = `
:root{
  --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
  --ul-red: #c00102;
  --ul-ink: #101828;
  --ul-muted: #667085;
  --ul-line: rgba(16,24,40,.10);
  --ul-card: #ffffff;
  --ul-shadow: 0 10px 30px rgba(16,24,40,.08);
  --ul-radius: 22px;
}

#${ROOT_ID}{
  font-family: var(--ul-font);
  color: var(--ul-ink);
  background: transparent;
}

.ul-wrap{
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 16px 64px;
}

.ul-hero{
  display:flex;
  gap: 18px;
  align-items:flex-start;
  justify-content:space-between;
  flex-wrap:wrap;
  margin-bottom: 18px;
}

.ul-title{
  font-size: 34px;
  line-height: 1.15;
  font-weight: 900;
  letter-spacing: -0.02em;
  margin: 0;
}

.ul-sub{
  margin-top: 8px;
  color: var(--ul-muted);
  font-size: 14px;
  line-height: 1.5;
  max-width: 780px;
}

.ul-pill{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding: 8px 12px;
  border: 1px solid var(--ul-line);
  border-radius: 999px;
  background: rgba(255,255,255,.75);
  backdrop-filter: blur(6px);
  font-size: 13px;
  color: var(--ul-muted);
  white-space: nowrap;
}

.ul-grid{
  display:grid;
  grid-template-columns: 1.4fr .6fr;
  gap: 18px;
  align-items:start;
}
@media (max-width: 900px){
  .ul-grid{ grid-template-columns: 1fr; }
}

.ul-card{
  background: var(--ul-card);
  border: 1px solid var(--ul-line);
  border-radius: var(--ul-radius);
  box-shadow: var(--ul-shadow);
  overflow: hidden;
}

.ul-card-body{ padding: 18px; }

.ul-section{
  padding: 18px;
  border-top: 1px solid var(--ul-line);
}
.ul-section:first-child{ border-top: none; }

.ul-h2{
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.ul-rich{
  color: #1f2937;
  font-size: 14px;
  line-height: 1.65;
}
.ul-rich ul{ padding-left: 18px; margin: 10px 0; }
.ul-rich li{ margin: 6px 0; }
.ul-rich p{ margin: 10px 0; }

.ul-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.06);
  background: #fff;
  cursor:pointer;
  font-weight: 900;
  font-size: 14px;
  text-decoration:none;
  color: var(--ul-ink);
  user-select:none;
  white-space:nowrap;
  width: 100%;
}
.ul-btn:hover{ transform: translateY(-1px); }
.ul-btn:active{ transform: translateY(0px); }

.ul-btn-primary{
  background: var(--ul-red);
  color:#fff;
  border-color: rgba(0,0,0,.08);
}

.ul-sponsorBox{
  display:flex;
  flex-direction:column;
  gap: 12px;
}

.ul-banner{
  display:block;
  width: 100%;
  border-radius: 18px;
  border: 1px solid var(--ul-line);
  overflow:hidden;
  background: #fff;
  text-decoration:none;
}
.ul-banner img{
  display:none; /* shown when sponsor script sets src */
  width:100%;
  height:auto;
}

.ul-mini{
  font-size: 12px;
  color: var(--ul-muted);
  line-height: 1.5;
}

.ul-loader{
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 44px 18px;
  color: var(--ul-muted);
  font-weight: 800;
  font-size: 14px;
}

.ul-error{
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(192,1,2,.25);
  background: rgba(192,1,2,.06);
  color: #7a0a0a;
  font-weight: 800;
  font-size: 14px;
}

/* Sponsor modes controlled by sponsor-ready event */
#${ROOT_ID}.ul-is-sponsored .ul-cta{ display:none !important; }
#${ROOT_ID}.ul-is-sponsored .ul-pending{ display:none !important; }
#${ROOT_ID}.ul-is-pending .ul-cta{ display:none !important; }
#${ROOT_ID}.ul-is-pending .ul-pending{ display:block !important; }
#${ROOT_ID} .ul-pending{ display:none; }

    `.trim();

    const style = document.createElement("style");
    style.id = "ul_metier_css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function getRoot(){
    let root = $id(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      document.body.prepend(root);
      log("root auto-created:", ROOT_ID);
    }
    return root;
  }

  function renderLoading(root){
    root.innerHTML = "";
    root.appendChild(
      el("div", { class:"ul-wrap" }, [
        el("div", { class:"ul-card" }, [
          el("div", { class:"ul-loader" }, ["Loading…"])
        ])
      ])
    );
  }

  function renderError(root, msg){
    root.innerHTML = "";
    root.appendChild(
      el("div", { class:"ul-wrap" }, [
        el("div", { class:"ul-error" }, [msg || "An error occurred"])
      ])
    );
  }

  // =========================================================
  // Sponsor intent (CTA) + Pending UX
  // =========================================================
  function buildNext(metier, country){
    const url = new URL(location.origin + SPONSOR_URL);
    if (metier) url.searchParams.set("metier", metier);
    if (country) url.searchParams.set("country", country);
    return url.pathname + "?" + url.searchParams.toString();
  }

  async function isLoggedInFast(){
    if (!window.supabase?.createClient) return false;
    try{
      const SUPABASE_URL = "https://zwnkscepqwujkcxusknn.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bmtzY2VwcXd1amtjeHVza25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDY1OTIsImV4cCI6MjA4MzgyMjU5Mn0.WALx2WeXlCDWhD0JA8L0inPBDtlJOlh9UQm7Z-U2D38";
      window.__UL_SB__ ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
      });
      const { data } = await window.__UL_SB__.auth.getSession();
      return !!data?.session;
    } catch(_){
      return false;
    }
  }

  function markPending(metier, country){
    try{
      localStorage.setItem(pendingKey(metier, country), String(Date.now()));
    } catch(_){}
  }

  function isPending(metier, country){
    try{
      const raw = localStorage.getItem(pendingKey(metier, country));
      if (!raw) return false;
      const ts = Number(raw) || 0;
      if (!ts) return false;
      if (Date.now() - ts > PENDING_TTL_MS) return false;
      return true;
    } catch(_){
      return false;
    }
  }

  function clearPending(metier, country){
    try{ localStorage.removeItem(pendingKey(metier, country)); } catch(_){}
  }

  function bindSponsorCTA(root, metier, country){
    let navigating = false;

    root.addEventListener("click", async (e) => {
      const a = e.target?.closest?.('a[data-action="sponsor"]');
      if (!a) return;

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

      if (navigating) return;
      navigating = true;

      // Pending UX (front only)
      markPending(metier, country);
      root.classList.add("ul-is-pending");

      const next = buildNext(metier, country);
      try { localStorage.setItem("ULYDIA_AUTH_NEXT", next); } catch(_){}

      const logged = await isLoggedInFast();
      location.href = logged ? next : `${LOGIN_URL}?next=${encodeURIComponent(next)}`;
    }, true);
  }

  // Listen to your existing sponsor script event
  function bindSponsorReady(root, metier, country){
    function applyModeSponsored(isSponsored){
      if (isSponsored) {
        root.classList.add("ul-is-sponsored");
        root.classList.remove("ul-is-pending");
        clearPending(metier, country);
      } else {
        root.classList.remove("ul-is-sponsored");
        // keep pending if pending is still valid
        if (isPending(metier, country)) root.classList.add("ul-is-pending");
        else root.classList.remove("ul-is-pending");
      }
    }

    // immediate apply if already known
    if (typeof window.SPONSORED_ACTIVE === "boolean") {
      applyModeSponsored(!!window.SPONSORED_ACTIVE);
    } else {
      // if pending from earlier click
      if (isPending(metier, country)) root.classList.add("ul-is-pending");
    }

    window.addEventListener("ulydia:sponsor-ready", (ev) => {
      const sponsored = !!ev?.detail?.sponsored;
      applyModeSponsored(sponsored);
    });
  }

  // =========================================================
  // Content fallback (no worker needed)
  // =========================================================
  function scrapeContentHTML(){
    // Try to reuse existing Webflow content if present (so page is never empty)
    const selectors = [
      "[data-metier-content]",
      ".w-richtext",
      ".rich-text",
      ".metier-richtext",
      "main"
    ];
    for (const sel of selectors) {
      const node = $(sel);
      const html = node?.innerHTML || "";
      const text = node?.textContent || "";
      if (safeStr(text).length > 120) return html;
    }
    return "<p>Contenu indisponible (endpoint /metier-page non activé).</p>";
  }

  // =========================================================
  // Rendering
  // =========================================================
  function renderSection(title, html){
    const t = safeStr(title);
    const h = safeStr(html);
    if (!t && !h) return null;

    const rich = el("div", { class:"ul-rich" });
    if (h) setHTML(rich, h);

    return el("div", { class:"ul-section" }, [
      t ? el("div", { class:"ul-h2" }, [t]) : null,
      rich
    ].filter(Boolean));
  }

  function renderPage(root, data){
    const metier  = safeStr(data?.metier);
    const country = safeUpper(data?.country);
    const lang    = safeStr(data?.lang || "");

    const title = safeStr(data?.global?.title) || metier || "Métier";
    const intro = safeStr(data?.global?.intro) || " ";

    const sponsored = !!data?.sponsored;
    const sponsorLink = safeStr(data?.sponsor?.link);

    const logoSquare = pickUrl(data?.sponsor?.logo_1);
    const logoLandscape = pickUrl(data?.sponsor?.logo_2);

    const globalSections = Array.isArray(data?.global?.sections) ? data.global.sections : [];

    root.innerHTML = "";

    const headerRight = el("div", {}, [
      el("div", { class:"ul-pill" }, [
        el("span", {}, [`${country || "??"}`]),
        el("span", { style:"opacity:.55" }, ["•"]),
        el("span", {}, [(lang || "").toUpperCase() || ""])
      ])
    ]);

    const hero = el("div", { class:"ul-hero" }, [
      el("div", {}, [
        el("h1", { class:"ul-title" }, [title]),
        el("div", { class:"ul-sub" }, [intro])
      ]),
      headerRight
    ]);

    // Left main content
    const leftChildren = [];

    globalSections.forEach(sec => {
      const node = renderSection(sec?.title, sec?.html);
      if (node) leftChildren.push(node);
    });

    if (!leftChildren.length) {
      leftChildren.push(
        renderSection("DESCRIPTION & MISSIONS", scrapeContentHTML())
      );
    }

    const left = el("div", { class:"ul-card" }, leftChildren.filter(Boolean));

    // Right sponsor box — IDs MUST MATCH your existing sponsor boot script
    const right = el("div", { class:"ul-sponsorBox" }, [

      // ✅ This block can be shown by sponsor boot script
      el("div", { id:"block-sponsored", class:"ul-card", style:"display:none" }, [
        el("div", { class:"ul-card-body" }, [
          el("div", { class:"ul-h2" }, ["SPONSOR"]),
          el("div", { class:"ul-mini" }, ["Cette fiche est sponsorisée."])
        ])
      ]),

      // ✅ This block is always present; your sponsor boot script toggles it
      el("div", { id:"block-not-sponsored", class:"ul-sponsorBox" }, [

        // CTA (hidden when sponsored OR pending via CSS classes)
        el("div", { class:"ul-card ul-cta" }, [
          el("div", { class:"ul-card-body" }, [
            el("div", { class:"ul-h2" }, ["Sponsoriser cette fiche"]),
            el("div", { class:"ul-mini" }, ["Gagnez en visibilité sur cette fiche métier dans ce pays."]),
            el("div", { style:"height:12px" }),
            el("a", { class:"ul-btn ul-btn-primary", href:"#", "data-action":"sponsor" }, ["Sponsoriser cette fiche"])
          ])
        ]),

        // Pending box (shown when ul-is-pending)
        el("div", { class:"ul-card ul-pending" }, [
          el("div", { class:"ul-card-body" }, [
            el("div", { class:"ul-h2" }, ["Activation en cours"]),
            el("div", { class:"ul-mini" }, [
              "Votre demande est en attente de confirmation. ",
              "Rafraîchissez la page dans quelques instants."
            ])
          ])
        ]),

        // Banners placeholders (your sponsor boot script will set src + closest <a> href)
        el("a", { class:"ul-banner", href: sponsorLink || "#", target: sponsorLink ? "_blank" : null, rel: sponsorLink ? "noopener" : null }, [
          el("img", { id:"nonSponsorBanner01", alt:"Sponsor banner", src: logoLandscape || "" })
        ]),
        el("a", { class:"ul-banner", href: sponsorLink || "#", target: sponsorLink ? "_blank" : null, rel: sponsorLink ? "noopener" : null }, [
          el("img", { id:"nonSponsorBanner02", alt:"Sponsor logo", src: logoSquare || "" })
        ])
      ])
    ]);

    const grid = el("div", { class:"ul-grid" }, [ left, right ]);
    const wrap = el("div", { class:"ul-wrap" }, [ hero, grid ]);

    root.appendChild(wrap);

    // Bind CTA sponsor + sponsor-ready event
    bindSponsorCTA(root, metier, country);
    bindSponsorReady(root, metier, country);

    // If our own data says sponsored, apply class immediately (optional)
    if (sponsored) root.classList.add("ul-is-sponsored");
  }

  // =========================================================
  // Data loading (safe)
  // =========================================================
  function cacheKey(metier, country, lang){
    return `UL_METIER_PAGE|${metier}|${country}|${lang}`;
  }

  function getCache(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj?.ts || !obj?.data) return null;
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.data;
    } catch(_){
      return null;
    }
  }

  function setCache(key, data){
    try{ localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch(_){}
  }

  async function loadData(metier, country, lang){
    const key = cacheKey(metier, country, lang);
    const cached = getCache(key);
    if (cached) return cached;

    // Try full content endpoint (optional)
    try{
      const full = await postJson(ENDPOINT_METIER_PAGE, { metier, country, lang });
      if (full && typeof full === "object") {
        setCache(key, full);
        return full;
      }
    } catch(e){
      // ignore; fallback below
    }

    // Fallback (NO HARD DEPENDENCY): sponsor may be handled by your separate sponsor script
    let info = null;
    try {
      info = await postJson(ENDPOINT_SPONSOR_INFO, { metier, country });
    } catch(_) {
      info = null;
    }

    const fallback = {
      metier, country, lang,
      sponsored: !!info?.sponsored,
      sponsor: info?.sponsor || {},
      global: {
        title: metier,
        intro: "",
        sections: [] // we will scrape Webflow content in render if empty
      }
    };

    setCache(key, fallback);
    return fallback;
  }

  // =========================================================
  // Boot
  // =========================================================
  (async function boot(){
    injectCSS();
    const root = getRoot();
    renderLoading(root);

    try{
      const metier = getMetierSlug();
      const country = await getCountry();
      const lang = getLang();

      if (!metier) {
        renderError(root, "Missing metier slug (cannot render page).");
        return;
      }
      if (!country) {
        renderError(root, "Missing country (cannot load sponsor/content).");
        return;
      }

      const data = await loadData(metier, country, lang);

      data.metier  = safeStr(data.metier || metier);
      data.country = safeUpper(data.country || country);
      data.lang    = safeStr(data.lang || lang);

      const l1 = pickUrl(data?.sponsor?.logo_2);
      const l2 = pickUrl(data?.sponsor?.logo_1);
      await Promise.all([preloadImage(l1), preloadImage(l2)]);

      renderPage(root, data);
    } catch(e){
      console.warn("[metier-page] failed:", e?.message || e);
      renderError(getRoot(), "Failed to render page. Check console.");
    }
  })();

})();

