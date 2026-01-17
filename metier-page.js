/* metier-page.js — Ulydia
   - Full JS-rendered Job page (no Webflow design dependency)
   - Sponsor banners (sponsored / non-sponsored)
   - Country-specific sections only if they exist
   - Includes sponsor intent (CTA -> login -> sponsor) in same file
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V1__) return;
  window.__ULYDIA_METIER_PAGE_V1__ = true;

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const IPINFO_TOKEN = "941b787cc13473";

  const LOGIN_URL  = "/login";
  const SPONSOR_URL = "/sponsor";

  // Preferred endpoint (recommended to add in Worker)
  const ENDPOINT_METIER_PAGE = "/metier-page";

  // Fallback sponsor endpoint (already exists in your Worker)
  const ENDPOINT_SPONSOR_INFO = "/sponsor-info";

  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
  const CC_CACHE_HOURS = 6;

  // =========================================================
  // Helpers
  // =========================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $id = (id) => document.getElementById(id);

  const qp = (k) => new URLSearchParams(location.search).get(k);

  function apiBase() { return WORKER_URL.replace(/\/$/, ""); }

  function safeUpper(s){ return String(s || "").trim().toUpperCase(); }
  function safeStr(s){ return String(s || "").trim(); }

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
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": PROXY_SECRET,
      },
      body: JSON.stringify(payload || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Worker error");
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
        if (obj && obj.cc && obj.ts && (Date.now() - obj.ts) < CC_CACHE_HOURS * 60 * 60 * 1000) {
          return safeUpper(obj.cc);
        }
      }
    } catch(_) {}

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 900);

    const geo = await fetch(
      "https://api.ipinfo.io/lite/me?token=" + encodeURIComponent(IPINFO_TOKEN),
      { cache: "no-store", signal: controller.signal }
    ).then(r => r.json()).catch(() => ({})).finally(() => clearTimeout(t));

    const cc = safeUpper(geo.country_code || geo.country || "");
    if (cc) {
      try { localStorage.setItem("ULYDIA_CC_CACHE", JSON.stringify({ cc, ts: Date.now() })); } catch(_) {}
    }
    return cc || "";
  }

  // =========================================================
  // Metier slug
  // =========================================================
  function getMetierSlug(){
    // 1) explicit element (your current method)
    const s1 = safeStr($(".metier-slug")?.textContent);
    if (s1) return s1;

    // 2) query param
    const s2 = safeStr(qp("metier") || qp("slug"));
    if (s2) return s2;

    // 3) pathname last segment
    const parts = String(location.pathname || "").split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function getLang(){
    // optional: from query, or html lang, fallback en
    const q = safeStr(qp("lang"));
    if (q) return q.toLowerCase();
    const h = safeStr(document.documentElement.getAttribute("lang"));
    if (h) return h.toLowerCase();
    return "en";
  }

  // =========================================================
  // UI: CSS + Loader
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
  --ul-bg: #ffffff;
  --ul-card: #ffffff;
  --ul-shadow: 0 10px 30px rgba(16,24,40,.08);
  --ul-radius: 22px;
}

#ul_metier_root{
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
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}

.ul-sub{
  margin-top: 8px;
  color: var(--ul-muted);
  font-size: 14px;
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
  font-weight: 800;
  letter-spacing: -0.01em;
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
  font-weight: 800;
  font-size: 14px;
  text-decoration:none;
  color: var(--ul-ink);
  user-select:none;
  white-space:nowrap;
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
}
.ul-banner img{
  display:block;
  width:100%;
  height:auto;
}

.ul-mini{
  font-size: 12px;
  color: var(--ul-muted);
}

.ul-loader{
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 44px 18px;
  color: var(--ul-muted);
  font-weight: 700;
  font-size: 14px;
}

.ul-error{
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(192,1,2,.25);
  background: rgba(192,1,2,.06);
  color: #7a0a0a;
  font-weight: 700;
  font-size: 14px;
}

    `.trim();

    const style = document.createElement("style");
    style.id = "ul_metier_css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function getRoot(){
    let root = $id("ul_metier_root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ul_metier_root";
      document.body.appendChild(root);
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
  // Sponsor intent (single-file replacement of your second script)
  // =========================================================
  function buildNext(metier, country){
    const url = new URL(location.origin + SPONSOR_URL);
    if (metier) url.searchParams.set("metier", metier);
    if (country) url.searchParams.set("country", country);
    return url.pathname + "?" + url.searchParams.toString();
  }

  async function isLoggedInFast(){
    // Uses existing window.supabase if present on the page
    if (!window.supabase?.createClient) return false;
    try{
      // Use your existing project keys via already initialized client if exists
      // (If you want, we can embed your anon key here like in your current script)
      const SUPABASE_URL = "https://zwnkscepqwujkcxusknn.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bmtzY2VwcXd1amtjeHVza25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDY1OTIsImV4cCI6MjA4MzgyMjU5Mn0.WALx2WeXlCDWhD0JA8L0inPBDtlJOlh9UQm7Z-U2D38";
      window.__UL_SB__ ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
      });
      const { data } = await window.__UL_SB__.auth.getSession();
      return !!data?.session;
    } catch(e){
      return false;
    }
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

      const next = buildNext(metier, country);
      try { localStorage.setItem("ULYDIA_AUTH_NEXT", next); } catch(_){}

      const logged = await isLoggedInFast();
      if (logged) {
        location.href = next;
      } else {
        location.href = `${LOGIN_URL}?next=${encodeURIComponent(next)}`;
      }
    }, true);
  }

  // =========================================================
  // Rendering
  // =========================================================
  function renderPage(root, data){
    const metier  = safeStr(data?.metier);
    const country = safeUpper(data?.country);
    const lang    = safeStr(data?.lang || "");

    const title = safeStr(data?.global?.title) || metier || "Job";
    const intro = safeStr(data?.global?.intro);

    const sponsored = !!data?.sponsored;
    const sponsorLink = safeStr(data?.sponsor?.link);
    const logoSquare = pickUrl(data?.sponsor?.logo_1);
    const logoLandscape = pickUrl(data?.sponsor?.logo_2);

    const globalSections = Array.isArray(data?.global?.sections) ? data.global.sections : [];
    const cs = data?.country_specific || {};
    const csExists = !!cs.exists && Array.isArray(cs.sections) && cs.sections.length > 0;

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
        intro ? el("div", { class:"ul-sub" }, [intro]) : el("div", { class:"ul-sub" }, [`${metier} • ${country}`])
      ]),
      headerRight
    ]);

    // Left main content
    const left = el("div", { class:"ul-card" }, [
      el("div", { class:"ul-card-body" }, [
        el("div", { class:"ul-mini" }, [
          sponsored ? "Sponsored content" : "Not sponsored"
        ])
      ]),
      ...globalSections.map(sec => {
        const t = safeStr(sec?.title);
        const html = safeStr(sec?.html);
        if (!t && !html) return null;
        return el("div", { class:"ul-section" }, [
          t ? el("div", { class:"ul-h2" }, [t]) : null,
          el("div", { class:"ul-rich" }, [])
        ]);
      }).filter(Boolean),
      csExists ? el("div", { class:"ul-section" }, [
        el("div", { class:"ul-h2" }, [ safeStr(cs.title) || "Country specifics" ]),
        el("div", { class:"ul-mini" }, ["Shown only when data exists for this country."])
      ]) : null,
      ...(csExists ? cs.sections.map(sec => {
        const t = safeStr(sec?.title);
        const html = safeStr(sec?.html);
        if (!t && !html) return null;
        return el("div", { class:"ul-section" }, [
          t ? el("div", { class:"ul-h2" }, [t]) : null,
          el("div", { class:"ul-rich" }, [])
        ]);
      }).filter(Boolean) : [])
    ]);

    // Right sponsor box
    const right = el("div", { class:"ul-sponsorBox" });

    if (sponsored) {
      const banner1 = el("a", { class:"ul-banner", href: sponsorLink || "#", target: sponsorLink ? "_blank" : null, rel: sponsorLink ? "noopener" : null }, [
        el("img", { alt:"Sponsor banner", src: logoLandscape || "" })
      ]);
      const banner2 = el("a", { class:"ul-banner", href: sponsorLink || "#", target: sponsorLink ? "_blank" : null, rel: sponsorLink ? "noopener" : null }, [
        el("img", { alt:"Sponsor logo", src: logoSquare || "" })
      ]);

      right.appendChild(el("div", { class:"ul-card" }, [
        el("div", { class:"ul-card-body" }, [
          el("div", { class:"ul-h2" }, ["Sponsor"]),
          el("div", { class:"ul-mini" }, ["This page is sponsored."])
        ])
      ]));

      right.appendChild(banner1);
      right.appendChild(banner2);
    } else {
      right.appendChild(el("div", { class:"ul-card" }, [
        el("div", { class:"ul-card-body" }, [
          el("div", { class:"ul-h2" }, ["Sponsor this page"]),
          el("div", { class:"ul-mini" }, ["Get visibility on this job page in this country."]),
          el("div", { style:"height:12px" }),
          el("a", {
            class:"ul-btn ul-btn-primary",
            href:"#",
            "data-action":"sponsor"
          }, ["Sponsoriser cette fiche"])
        ])
      ]));
    }

    const grid = el("div", { class:"ul-grid" }, [ left, right ]);
    const wrap = el("div", { class:"ul-wrap" }, [ hero, grid ]);

    root.appendChild(wrap);

    // Fill rich HTML nodes (after DOM creation)
    // We find sections by order: first all global, then country
    const richNodes = root.querySelectorAll(".ul-section .ul-rich");
    let idx = 0;

    // global sections HTML
    globalSections.forEach(sec => {
      const html = safeStr(sec?.html);
      if (!html) { idx++; return; }
      setHTML(richNodes[idx], html);
      idx++;
    });

    // country sections HTML
    if (csExists) {
      cs.sections.forEach(sec => {
        const html = safeStr(sec?.html);
        if (!html) { idx++; return; }
        setHTML(richNodes[idx], html);
        idx++;
      });
    }

    // bind CTA sponsor
    bindSponsorCTA(root, metier, country);
  }

  // =========================================================
  // Data loading with caching
  // =========================================================
  function cacheKey(metier, country, lang){
    return `UL_METIER_PAGE|${metier}|${country}|${lang}`;
  }

  function getCache(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.data) return null;
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.data;
    } catch(_){
      return null;
    }
  }

  function setCache(key, data){
    try{
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch(_){}
  }

  async function loadData(metier, country, lang){
    // 1) try cached
    const key = cacheKey(metier, country, lang);
    const cached = getCache(key);
    if (cached) return cached;

    // 2) try full endpoint
    try{
      const full = await postJson(ENDPOINT_METIER_PAGE, { metier, country, lang });
      if (full && typeof full === "object") {
        setCache(key, full);
        return full;
      }
    } catch(e){
      // ignore -> fallback
    }

    // 3) fallback sponsor only
    const info = await postJson(ENDPOINT_SPONSOR_INFO, { metier, country });
    const fallback = {
      metier, country, lang,
      sponsored: !!info?.sponsored,
      sponsor: info?.sponsor || {},
      global: {
        title: metier,
        intro: "",
        sections: [
          { title: "About this job", html: "<p>Full content endpoint not enabled yet.</p>" }
        ]
      },
      country_specific: { exists:false }
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
        // still render with ?? but data calls need country
        renderError(root, "Missing country (cannot load sponsor/content).");
        return;
      }

      const data = await loadData(metier, country, lang);

      // Ensure minimal fields
      data.metier = safeStr(data.metier || metier);
      data.country = safeUpper(data.country || country);
      data.lang = safeStr(data.lang || lang);

      // Preload sponsor images to avoid flash
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
