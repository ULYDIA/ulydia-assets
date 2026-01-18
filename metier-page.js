<script>
/**
 * Ulydia — Metier Page (Shell mode) — v1.0
 * - Webflow = conteneur vide (#ul_metier_root)
 * - Worker = source-of-truth pour le contenu
 * - Fallback sponsor-info si /metier-page pas dispo
 */
(() => {
  if (window.__ULYDIA_METIER_PAGE_V1__) return;
  window.__ULYDIA_METIER_PAGE_V1__ = true;

  // =========================
  // CONFIG (à adapter)
  // =========================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const IPINFO_TOKEN = "941b787cc13473";

  // Pages (à adapter à tes routes)
  const LOGIN_URL = "/login";
  const SPONSOR_CTA_URL = (slug) => `/sponsorship?metier=${encodeURIComponent(slug)}`; // adapte si besoin

  // Lang (optionnel)
  const DEFAULT_LANG = "en"; // ou "fr" si tu veux

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;

  // =========================
  // Helpers
  // =========================
  const qp = (name) => new URLSearchParams(location.search).get(name);
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  function apiBase(){ return String(WORKER_URL || "").replace(/\/$/, ""); }

  function h(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "style") n.style.cssText = v;
      else if (k === "class") n.className = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v === null || v === undefined) continue;
      else n.setAttribute(k, String(v));
    }
    (children || []).forEach((c) => {
      if (c === null || c === undefined) return;
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    });
    return n;
  }

  function esc(s){
    return String(s ?? "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function safeUrl(u){
    try {
      const s = String(u || "").trim();
      if (!s) return "";
      const url = new URL(s, location.origin);
      // bloque javascript:
      if (/^javascript:/i.test(url.href)) return "";
      return url.href;
    } catch { return ""; }
  }

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return safeUrl(v);
    // si ton worker renvoie parfois {url:"..."} ou {value:"..."}
    if (typeof v === "object") return safeUrl(v.url || v.value || "");
    return "";
  }

  async function preloadImage(url){
    return new Promise((resolve) => {
      if (!url) return resolve(false);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  function setImgHard(imgEl, url){
    if (!imgEl) return;
    if (!url) {
      imgEl.removeAttribute("src");
      imgEl.style.display = "none";
      return;
    }
    imgEl.style.display = "";
    imgEl.setAttribute("src", url);
  }

  function setLinkOnClosestA(el, url){
    if (!el || !url) return;
    const a = el.closest("a");
    if (a) {
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.pointerEvents = "auto";
    }
  }

  function fmtList(arr){
    const a = Array.isArray(arr) ? arr : [];
    const clean = a.map(x => String(x || "").trim()).filter(Boolean);
    return clean;
  }

  function slugFromPath(){
    // ex: /fiche-metiers/account-executive
    const p = location.pathname.replace(/\/+$/, "");
    const parts = p.split("/").filter(Boolean);
    const idx = parts.findIndex(x => x === "fiche-metiers");
    if (idx >= 0 && parts[idx+1]) return parts[idx+1];
    // fallback: dernier segment
    return parts[parts.length - 1] || "";
  }

  // =========================
  // IPINFO (country)
  // =========================
  const IP_CACHE_KEY = "ul_ipinfo_cache_v1";
  const IP_TTL_MS = 12 * 60 * 60 * 1000; // 12h

  function readIpCache(){
    try {
      const raw = localStorage.getItem(IP_CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts) return null;
      if (Date.now() - obj.ts > IP_TTL_MS) return null;
      return obj.data || null;
    } catch { return null; }
  }

  function writeIpCache(data){
    try {
      localStorage.setItem(IP_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {}
  }

  async function getCountryISO(){
    const cached = readIpCache();
    if (cached?.country) return String(cached.country).toUpperCase();

    // si un override existe
    const forced = (qp("country") || "").trim();
    if (forced) return forced.toUpperCase();

    try {
      const url = `https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`;
      const r = await fetch(url, { method: "GET" });
      const j = await r.json().catch(() => null);
      if (j && j.country) writeIpCache(j);
      return String(j?.country || "FR").toUpperCase();
    } catch {
      return "FR";
    }
  }

  // =========================
  // Auth (simple “is logged in”)
  // =========================
  const STORAGE_KEY = "ulydia_auth_v1"; // identique à ton dashboard (si tu l’utilises)
  function getStoredSession(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      // accepte {access_token, expires_at} ou {session:{...}}
      const s = obj?.session || obj;
      const token = s?.access_token || "";
      const exp = Number(s?.expires_at || 0);
      if (!token) return null;
      if (exp && Date.now()/1000 > exp) return null;
      return { access_token: token, user: s?.user || null };
    } catch { return null; }
  }

  // =========================
  // Worker calls
  // =========================
  async function postWorker(path, payload){
    const url = `${apiBase()}${path}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-proxy-secret": PROXY_SECRET
      },
      body: JSON.stringify(payload || {})
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    if (!r.ok) {
      const msg = json?.error || json?.message || text || `HTTP ${r.status}`;
      const e = new Error(msg);
      e.status = r.status;
      e.payload = json;
      throw e;
    }
    return json;
  }

  async function fetchMetierData({ slug, country, lang }){
    const payload = { metier_slug: slug, country, lang };

    // 1) Nouveau endpoint recommandé
    try {
      const j = await postWorker("/metier-page", payload);
      if (j && typeof j === "object") return { mode: "metier-page", data: j };
    } catch (e) {
      log("metier-page failed:", e?.message || e);
    }

    // 2) Fallback: sponsor-info (ton endpoint existant)
    try {
      const j = await postWorker("/sponsor-info", payload);
      if (j && typeof j === "object") return { mode: "sponsor-info", data: j };
    } catch (e) {
      log("sponsor-info failed:", e?.message || e);
    }

    return { mode: "none", data: null };
  }

  // =========================
  // UI / CSS
  // =========================
  function injectCSS(){
    if (document.getElementById("ul_metier_css_v1")) return;

    const css = `
:root{
  --ul-font:'Montserrat',system-ui,-apple-system,Segoe UI,Roboto,Arial;
  --ul-red:#c00102;
  --ul-ink:#111827;
  --ul-muted:#6b7280;
  --ul-border:rgba(17,24,39,.10);
  --ul-card:rgba(255,255,255,.9);
  --ul-bg: #f7f7fb;
  --ul-shadow: 0 14px 40px rgba(17,24,39,.08);
  --ul-radius: 22px;
}
#ul_metier_root, #ul_metier_root * { box-sizing:border-box; font-family:var(--ul-font); }
#ul_metier_root{ width:100%; padding: 26px 14px; background: var(--ul-bg); color: var(--ul-ink); }
.ul-wrap{ max-width: 1120px; margin:0 auto; }
.ul-top{
  display:flex; gap:14px; align-items:stretch; flex-wrap:wrap;
}
.ul-hero{
  flex: 1 1 520px;
  background: var(--ul-card);
  border:1px solid var(--ul-border);
  border-radius: var(--ul-radius);
  box-shadow: var(--ul-shadow);
  padding: 18px 18px;
  min-width: 320px;
}
.ul-title{
  font-size: clamp(26px, 3.2vw, 40px);
  line-height: 1.05;
  margin: 0 0 8px 0;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.ul-sub{
  color: var(--ul-muted);
  font-size: 14px;
  margin: 0 0 14px 0;
  display:flex; gap:10px; flex-wrap:wrap; align-items:center;
}
.ul-pill{
  display:inline-flex; align-items:center; gap:8px;
  padding: 7px 10px;
  border-radius: 999px;
  border:1px solid var(--ul-border);
  background: rgba(255,255,255,.75);
  font-weight:700;
  font-size: 12px;
}
.ul-dot{ width:8px; height:8px; border-radius:99px; background: var(--ul-red); display:inline-block; }
.ul-actions{ display:flex; gap:10px; flex-wrap:wrap; margin-top: 12px; }
.ul-btn{
  display:inline-flex; align-items:center; justify-content:center;
  gap:10px; padding: 12px 14px;
  border-radius: 14px;
  border:1px solid var(--ul-border);
  background: white;
  color: var(--ul-ink);
  font-weight: 800;
  font-size: 13px;
  cursor:pointer;
  text-decoration:none;
  user-select:none;
}
.ul-btn:hover{ transform: translateY(-1px); }
.ul-btn-primary{
  background: var(--ul-red);
  border-color: rgba(192,1,2,.22);
  color:white;
}
.ul-sponsor-card{
  flex: 0 0 360px;
  min-width: 320px;
  background: var(--ul-card);
  border:1px solid var(--ul-border);
  border-radius: var(--ul-radius);
  box-shadow: var(--ul-shadow);
  padding: 14px;
  display:flex; flex-direction:column; gap:12px;
}
.ul-sponsor-label{
  font-size: 12px; font-weight: 900; letter-spacing: .08em;
  color: var(--ul-muted);
  text-transform: uppercase;
}
.ul-banner-wide{
  width:100%;
  height: 120px;
  border-radius: 16px;
  border:1px solid var(--ul-border);
  background: white;
  display:flex; align-items:center; justify-content:center;
  overflow:hidden;
}
.ul-banner-wide img{ width:100%; height:100%; object-fit:contain; }
.ul-banner-square{
  width: 120px; height:120px;
  border-radius: 16px;
  border:1px solid var(--ul-border);
  background: white;
  display:flex; align-items:center; justify-content:center;
  overflow:hidden;
}
.ul-banner-square img{ width:100%; height:100%; object-fit:contain; }
.ul-sponsor-row{ display:flex; gap:12px; align-items:stretch; }
.ul-sponsor-meta{
  flex:1;
  border:1px solid var(--ul-border);
  border-radius: 16px;
  background: rgba(255,255,255,.7);
  padding: 10px 12px;
}
.ul-sponsor-name{ font-weight: 900; margin:0 0 4px 0; font-size: 14px; }
.ul-sponsor-cta{ margin-top: 10px; }
.ul-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 14px;
}
@media (min-width: 920px){
  .ul-grid{ grid-template-columns: 1fr 1fr; }
}
.ul-card{
  background: var(--ul-card);
  border:1px solid var(--ul-border);
  border-radius: var(--ul-radius);
  box-shadow: var(--ul-shadow);
  padding: 16px 16px;
}
.ul-card h2{
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 900;
}
.ul-card p{
  margin: 0; color: var(--ul-muted); font-size: 14px; line-height: 1.55;
}
.ul-list{ margin: 0; padding-left: 18px; color: var(--ul-muted); }
.ul-list li{ margin: 6px 0; }
.ul-footer{
  margin-top: 14px;
  color: var(--ul-muted);
  font-size: 12px;
}
.ul-loader{
  background: var(--ul-card);
  border:1px solid var(--ul-border);
  border-radius: var(--ul-radius);
  box-shadow: var(--ul-shadow);
  padding: 18px;
}
.ul-error{
  border:1px solid rgba(192,1,2,.22);
}
    `.trim();

    const style = document.createElement("style");
    style.id = "ul_metier_css_v1";
    style.textContent = css;
    document.head.appendChild(style);

    // Fonts (si pas déjà présent)
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Montserrat"]')) {
      const l1 = document.createElement("link");
      l1.rel = "preconnect";
      l1.href = "https://fonts.googleapis.com";
      document.head.appendChild(l1);

      const l2 = document.createElement("link");
      l2.rel = "preconnect";
      l2.href = "https://fonts.gstatic.com";
      l2.crossOrigin = "anonymous";
      document.head.appendChild(l2);

      const l3 = document.createElement("link");
      l3.rel = "stylesheet";
      l3.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap";
      document.head.appendChild(l3);
    }
  }

  function renderLoading(root){
    root.innerHTML = "";
    root.appendChild(h("div", { class:"ul-wrap" }, [
      h("div", { class:"ul-loader" }, [
        h("div", { style:"font-weight:900; font-size:16px; margin-bottom:6px;" }, ["Loading…"]),
        h("div", { style:"color:var(--ul-muted); font-size:13px;" }, ["Fetching job data & sponsorship…"])
      ])
    ]));
  }

  function renderError(root, msg){
    root.innerHTML = "";
    root.appendChild(h("div", { class:"ul-wrap" }, [
      h("div", { class:"ul-loader ul-error" }, [
        h("div", { style:"font-weight:900; font-size:16px; margin-bottom:6px;" }, ["Something went wrong"]),
        h("div", { style:"color:var(--ul-muted); font-size:13px;" }, [String(msg || "Unknown error")]),
        h("div", { style:"margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;" }, [
          h("a", { class:"ul-btn", href: location.href }, ["Reload"]),
          h("a", { class:"ul-btn", href: LOGIN_URL }, ["Login"])
        ])
      ])
    ]));
  }

  function cardSection(title, contentEl){
    return h("div", { class:"ul-card" }, [
      h("h2", {}, [title]),
      contentEl
    ]);
  }

  function render(root, view){
    const {
      slug, country, lang,
      metier, sponsored, sponsor,
      country_specific
    } = view;

    const title = metier?.title || metier?.name || slug || "Job";
    document.title = `${title} — Ulydia`;

    // Sponsor assets
    const sponsorLink = safeUrl(sponsor?.link || "");
    const wideUrl = pickUrl(sponsor?.logo_2 || sponsor?.logo_wide || "");
    const squareUrl = pickUrl(sponsor?.logo_1 || sponsor?.logo_square || "");
    const sponsorName = sponsor?.name || sponsor?.company || "";

    // Header (pills)
    const pills = [
      h("span", { class:"ul-pill" }, [h("span",{class:"ul-dot"}), `Country: ${country}`]),
      h("span", { class:"ul-pill" }, [`Lang: ${String(lang || DEFAULT_LANG).toUpperCase()}`]),
      sponsored ? h("span",{class:"ul-pill"}, [h("span",{class:"ul-dot"}), "Sponsored"]) : h("span",{class:"ul-pill"}, ["Not sponsored"])
    ].filter(Boolean);

    // Actions
    const session = getStoredSession();
    const actions = [
      h("a", { class:"ul-btn ul-btn-primary", href: SPONSOR_CTA_URL(slug) }, ["Sponsor this page"]),
      session ? h("a", { class:"ul-btn", href: "/my-account" }, ["My account"]) : h("a", { class:"ul-btn", href: LOGIN_URL }, ["Login"])
    ].filter(Boolean);

    // Sections content
    const desc = (metier?.description || metier?.overview || "").trim();
    const missions = fmtList(metier?.missions);
    const skills = fmtList(metier?.skills || metier?.competences);
    const tools = fmtList(metier?.tools);
    const salary = (metier?.salary || "").trim();
    const education = (metier?.education || metier?.training || "").trim();

    const gridCards = [];

    gridCards.push(
      cardSection("Overview", desc
        ? h("p", {}, [desc])
        : h("p", {}, ["Content coming soon (worker needs to return metier.description)."])
      )
    );

    if (missions.length) {
      gridCards.push(
        cardSection("Key missions", h("ul", { class:"ul-list" }, missions.map(x => h("li", {}, [x]))))
      );
    }

    if (skills.length) {
      gridCards.push(
        cardSection("Key skills", h("ul", { class:"ul-list" }, skills.map(x => h("li", {}, [x]))))
      );
    }

    if (tools.length) {
      gridCards.push(
        cardSection("Common tools", h("ul", { class:"ul-list" }, tools.map(x => h("li", {}, [x]))))
      );
    }

    if (salary) {
      gridCards.push(
        cardSection("Salary range", h("p", {}, [salary]))
      );
    }

    if (education) {
      gridCards.push(
        cardSection("Education", h("p", {}, [education]))
      );
    }

    // Country specific block (uniquement si data existe)
    let countryBlock = null;
    const cs = country_specific || metier?.country_specific || null;
    if (cs && typeof cs === "object") {
      const titleCS = cs.title || `Local insights (${country})`;
      const textCS = (cs.text || cs.content || "").trim();
      const bulletsCS = fmtList(cs.bullets);
      if (textCS || bulletsCS.length) {
        countryBlock = h("div", { class:"ul-card" }, [
          h("h2", {}, [titleCS]),
          textCS ? h("p", {}, [textCS]) : null,
          bulletsCS.length ? h("ul", { class:"ul-list", style:"margin-top:10px;" }, bulletsCS.map(x => h("li", {}, [x]))) : null
        ].filter(Boolean));
      }
    }

    // Sponsor card
    const wideImg = h("img", { alt:"Sponsor banner", style:"display:none;" });
    const squareImg = h("img", { alt:"Sponsor logo", style:"display:none;" });

    const wideBox = h("a", { class:"ul-banner-wide", href: sponsorLink || "#", target: sponsorLink ? "_blank" : null, rel: sponsorLink ? "noopener" : null }, [wideImg]);
    const squareBox = h("a", { class:"ul-banner-square", href: sponsorLink || "#", target: sponsorLink ? "_blank" : null, rel: sponsorLink ? "noopener" : null }, [squareImg]);

    const sponsorCard = h("div", { class:"ul-sponsor-card" }, [
      h("div", { class:"ul-sponsor-label" }, ["Sponsor"]),
      wideBox,
      h("div", { class:"ul-sponsor-row" }, [
        squareBox,
        h("div", { class:"ul-sponsor-meta" }, [
          h("p", { class:"ul-sponsor-name" }, [sponsored ? (sponsorName || "Sponsored partner") : "Your company here"]),
          h("p", { style:"margin:0; color:var(--ul-muted); font-size:13px; line-height:1.45;" }, [
            sponsored
              ? "This page is sponsored. Click the banners to learn more."
              : "Sponsor this job page to reach the right audience in this country."
          ]),
          h("div", { class:"ul-sponsor-cta" }, [
            h("a", { class:"ul-btn ul-btn-primary", href: SPONSOR_CTA_URL(slug) }, [sponsored ? "Sponsor another job" : "Become the sponsor"])
          ])
        ])
      ])
    ]);

    // Build layout
    root.innerHTML = "";
    const wrap = h("div", { class:"ul-wrap" }, [
      h("div", { class:"ul-top" }, [
        h("div", { class:"ul-hero" }, [
          h("h1", { class:"ul-title" }, [title]),
          h("div", { class:"ul-sub" }, pills),
          h("div", { class:"ul-actions" }, actions)
        ]),
        sponsorCard
      ]),
      h("div", { class:"ul-grid" }, gridCards),
      countryBlock ? h("div", { style:"margin-top:12px;" }, [countryBlock]) : null,
      h("div", { class:"ul-footer" }, [
        `Slug: ${slug} · Country: ${country} · Mode: ${view.mode}`
      ])
    ]);

    root.appendChild(wrap);

    // Apply sponsor images
    (async () => {
      if (sponsored) {
        await Promise.all([ preloadImage(wideUrl), preloadImage(squareUrl) ]);
        setImgHard(wideImg, wideUrl);
        setImgHard(squareImg, squareUrl);
        if (sponsorLink) {
          setLinkOnClosestA(wideImg, sponsorLink);
          setLinkOnClosestA(squareImg, sponsorLink);
        }
      } else {
        // non sponsorisé => pas d’images
        setImgHard(wideImg, "");
        setImgHard(squareImg, "");
      }
    })();
  }

  // =========================
  // Bootstrap
  // =========================
  async function main(){
    injectCSS();

    const root = document.getElementById("ul_metier_root");
    if (!root) return;

    renderLoading(root);

    const slug = slugFromPath();
    const country = await getCountryISO();
    const lang = (qp("lang") || DEFAULT_LANG).toLowerCase();

    if (!slug) {
      return renderError(root, "Missing metier slug in URL (expected /fiche-metiers/<slug>).");
    }

    const res = await fetchMetierData({ slug, country, lang });
    const data = res.data || {};

    // Normalisation “view”
    // - /metier-page recommandé
    // - fallback sponsor-info => contenu minimal
    const sponsored = !!(data.sponsored || data?.is_sponsored);
    const sponsor = data.sponsor || data.sponsorship?.sponsor || data.partner || null;

    let metier = data.metier || data.job || null;
    let country_specific = data.country_specific || null;

    // si fallback sponsor-info, tu n’auras probablement pas metier => on affiche minimal
    if (!metier) {
      metier = { title: (data.metier_title || "").trim() || slug };
      // option : tu peux renvoyer au minimum description depuis worker même en sponsor-info si tu veux
      if (data.description) metier.description = data.description;
    }

    render(root, {
      mode: res.mode,
      slug, country, lang,
      metier,
      sponsored,
      sponsor,
      country_specific
    });
  }

  main().catch((e) => {
    const root = document.getElementById("ul_metier_root");
    if (root) renderError(root, e?.message || String(e));
  });

})();
</script>







// =========================================================
// Ulydia — Metier Page PATCH (CMS fallback + default banners by final language)
// =========================================================

// 1) détecte la "langue finale" (priorité : data-lang -> <html lang> -> ?lang -> DEFAULT)
function getFinalLang(DEFAULT_LANG = "en") {
  const byAttr =
    document.body?.getAttribute("data-lang") ||
    document.documentElement?.getAttribute("data-lang") ||
    "";
  const byHtml = document.documentElement?.lang || "";
  const byQP = (new URLSearchParams(location.search).get("lang") || "").trim();
  const lang = (byAttr || byHtml || byQP || DEFAULT_LANG).toLowerCase();
  // normalise fr-FR -> fr
  return lang.split("-")[0] || DEFAULT_LANG;
}

// 2) lit le payload CMS (tes 21 champs) : <div id="ul_cms_payload">... data-ul-f="description" ...
function readCmsPayload() {
  const root = document.getElementById("ul_cms_payload");
  if (!root) return null;

  const nodes = root.querySelectorAll("[data-ul-f]");
  if (!nodes?.length) return null;

  const out = {};
  nodes.forEach((n) => {
    const key = (n.getAttribute("data-ul-f") || "").trim();
    if (!key) return;

    // Si c'est une liste (li), ou un bloc texte, on prend le texte "propre"
    const txt = (n.textContent || "").trim();
    if (!txt || txt === "-" || txt === "—") return;

    // si plusieurs éléments ont le même data-ul-f => tableau
    if (out[key] === undefined) out[key] = txt;
    else if (Array.isArray(out[key])) out[key].push(txt);
    else out[key] = [out[key], txt];
  });

  return out;
}

// 3) mapping des clés CMS -> sections
function cmsToSections(cms) {
  if (!cms) return null;

  // adapte ces clés à TES data-ul-f réels
  // (garde ça souple : si une clé n'existe pas, elle est ignorée)
  const sections = {
    description: cms.description || cms.desc || "",
    missions: Array.isArray(cms.missions) ? cms.missions : (cms.missions ? [cms.missions] : []),
    competences: Array.isArray(cms.competences) ? cms.competences : (cms.competences ? [cms.competences] : []),
    environnements: Array.isArray(cms.environnements) ? cms.environnements : (cms.environnements ? [cms.environnements] : []),
    evolutions: Array.isArray(cms.evolutions) ? cms.evolutions : (cms.evolutions ? [cms.evolutions] : []),
    specifique_pays: cms.specifique_pays || cms.country_specific || ""
  };

  // nettoie
  Object.keys(sections).forEach((k) => {
    const v = sections[k];
    if (typeof v === "string") sections[k] = v.trim();
    if (Array.isArray(v)) sections[k] = v.map(x => String(x||"").trim()).filter(Boolean);
  });

  return sections;
}

// 4) rend une section dans ton UI existant (tu adaptes juste les sélecteurs)
//    -> tu as déjà des tabs "Description / Missions / Compétences / Environnements / Évolutions / Spécifique pays"
//    -> il faut un conteneur de contenu (ex: #ul_content_body ou .ul-content-body)
function renderSectionIntoUI(sectionKey, sections) {
  const body =
    document.querySelector("#ul_content_body") ||
    document.querySelector(".ul-content-body") ||
    document.querySelector('[data-ul="content-body"]');

  if (!body) return;

  const v = sections?.[sectionKey];

  // vide
  body.innerHTML = "";

  if (!v || (Array.isArray(v) && v.length === 0)) {
    body.innerHTML = `<div style="color:#6b7280;font-weight:700;">—</div>`;
    return;
  }

  if (Array.isArray(v)) {
    const ul = document.createElement("ul");
    ul.style.margin = "0";
    ul.style.paddingLeft = "18px";
    v.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      li.style.margin = "6px 0";
      ul.appendChild(li);
    });
    body.appendChild(ul);
  } else {
    const p = document.createElement("div");
    p.textContent = v;
    p.style.whiteSpace = "pre-wrap";
    p.style.lineHeight = "1.6";
    body.appendChild(p);
  }
}

// 5) connecte les tabs à renderSectionIntoUI (si tu n’as pas déjà un handler)
function wireTabs(sections) {
  const tabMap = {
    "description": "description",
    "missions": "missions",
    "compétences": "competences",
    "competences": "competences",
    "environnements": "environnements",
    "évolutions": "evolutions",
    "evolutions": "evolutions",
    "spécifique pays": "specifique_pays",
    "specifique pays": "specifique_pays"
  };

  const tabs =
    document.querySelectorAll("[data-ul-tab]")?.length
      ? document.querySelectorAll("[data-ul-tab]")
      : document.querySelectorAll("button"); // fallback si tu n’as pas d’attribut

  tabs.forEach((btn) => {
    const label = (btn.textContent || "").trim().toLowerCase();
    const key = tabMap[label];
    if (!key) return;

    btn.addEventListener("click", () => {
      renderSectionIntoUI(key, sections);
    });
  });

  // rendu par défaut
  renderSectionIntoUI("description", sections);
}

// 6) bannières par défaut (non sponsorisé) selon langue finale
function setDefaultBannersIfNotSponsored({ sponsored, lang }) {
  if (sponsored) return;

  // ⚠️ mets ici TES URLs de bannières Ulydia “house ads” par langue
  const DEFAULT_BANNERS = {
    fr: { wide: "https://ulydia-assets.pages.dev/banners/fr-wide.png", square: "https://ulydia-assets.pages.dev/banners/fr-square.png", link: "/sponsorship" },
    en: { wide: "https://ulydia-assets.pages.dev/banners/en-wide.png", square: "https://ulydia-assets.pages.dev/banners/en-square.png", link: "/sponsorship" },
    de: { wide: "https://ulydia-assets.pages.dev/banners/de-wide.png", square: "https://ulydia-assets.pages.dev/banners/de-square.png", link: "/sponsorship" },
    es: { wide: "https://ulydia-assets.pages.dev/banners/es-wide.png", square: "https://ulydia-assets.pages.dev/banners/es-square.png", link: "/sponsorship" },
    it: { wide: "https://ulydia-assets.pages.dev/banners/it-wide.png", square: "https://ulydia-assets.pages.dev/banners/it-square.png", link: "/sponsorship" }
  };

  const pack = DEFAULT_BANNERS[lang] || DEFAULT_BANNERS.en;

  // adapte les sélecteurs aux éléments réels de ta colonne sponsor
  const wideImg =
    document.querySelector("#ul_banner_wide") ||
    document.querySelector('[data-ul="banner-wide"] img') ||
    document.querySelector(".ul-banner-wide img");

  const squareImg =
    document.querySelector("#ul_banner_square") ||
    document.querySelector('[data-ul="banner-square"] img') ||
    document.querySelector(".ul-banner-square img");

  // lien (si tes images sont dans un <a>)
  const setLink = (img) => {
    if (!img) return;
    const a = img.closest("a");
    if (!a) return;
    a.href = pack.link || "/sponsorship";
    a.target = "_self";
    a.rel = "";
    a.style.pointerEvents = "auto";
  };

  if (wideImg) { wideImg.src = pack.wide; wideImg.style.display = ""; setLink(wideImg); }
  if (squareImg) { squareImg.src = pack.square; squareImg.style.display = ""; setLink(squareImg); }

  // si tu avais “caché” tout le bloc sponsor quand non sponsorisé, on force l’affichage
  const sponsorCol =
    document.querySelector("#ul_sponsor_col") ||
    document.querySelector('[data-ul="sponsor-col"]') ||
    document.querySelector(".ul-sponsor-col");
  if (sponsorCol) sponsorCol.style.display = "";
}

// =========================================================
// ENTRYPOINT : à appeler après ton fetch Worker (ou même sans Worker)
// =========================================================
function applyMetierPageFallback({ workerData } = {}) {
  const lang = getFinalLang("en");

  // 1) sponsor state depuis worker si dispo
  const sponsored = !!(workerData?.sponsored || workerData?.is_sponsored);

  // 2) Contenu : si worker ne donne pas metier.*, on lit le CMS payload
  const hasWorkerContent =
    !!workerData?.metier?.description ||
    (Array.isArray(workerData?.metier?.missions) && workerData.metier.missions.length);

  let sections = null;

  if (hasWorkerContent) {
    sections = {
      description: (workerData.metier.description || "").trim(),
      missions: Array.isArray(workerData.metier.missions) ? workerData.metier.missions : [],
      competences: Array.isArray(workerData.metier.skills) ? workerData.metier.skills : [],
      environnements: Array.isArray(workerData.metier.environments) ? workerData.metier.environments : [],
      evolutions: Array.isArray(workerData.metier.evolutions) ? workerData.metier.evolutions : [],
      specifique_pays: (workerData.metier.country_specific?.text || workerData.country_specific?.text || "").trim()
    };
  } else {
    const cms = readCmsPayload();
    sections = cmsToSections(cms);
  }

  if (sections) {
    wireTabs(sections);
  }

  // 3) Bannières : si non sponsorisé => house ads localisées (lang finale)
  setDefaultBannersIfNotSponsored({ sponsored, lang });
}



