(() => {
  if (window.__ULYDIA_METIER_PAGE__) return;
  window.__ULYDIA_METIER_PAGE__ = true;
  window.__METIER_PAGE_VERSION__ = "v4.8";

// Kill legacy scripts that still run on the page
window.__ULYDIA_METIER_SPONSOR_FINAL__ = true;
window.__ULYDIA_SPONSOR_BOOT__ = true;
window.__ULYDIA_PAGE_SPONSOR_SCRIPT__ = true;

console.log("[metier-page] v4.8 active - legacy killed");



  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);
  const qp = (name) => new URLSearchParams(location.search).get(name);

  const CFG = {
    WORKER_URL: "https://ulydia-business.contact-871.workers.dev",
    PROXY_SECRET: "ulydia_2026_proxy_Y4b364u2wsFsQL",
    IPINFO_TOKEN: "941b787cc13473",
    DEFAULT_LANG: "en",
    JOB_SEGMENT: "fiche-metiers",
    SHELL_MODE: true,
    COUNTRIES_DATA_ID: "countriesData",
    CMS_PAYLOAD_ID: "ul_cms_payload",
  };

  function apiBase(){ return String(CFG.WORKER_URL||"").replace(/\/$/,""); }
  function safeUrl(u){ try{ const s=String(u||"").trim(); if(!s) return ""; const url=new URL(s, location.origin); if(/^javascript:/i.test(url.href)) return ""; return url.href; }catch{ return ""; } }
  function pickUrl(v){ if(!v) return ""; if(typeof v==="string") return safeUrl(v); if(typeof v==="object") return safeUrl(v.url||v.value||""); return ""; }
  function normalizeLang(l){ const s=String(l||"").trim().toLowerCase(); return (s ? (s.split("-")[0]||CFG.DEFAULT_LANG) : CFG.DEFAULT_LANG); }
  function getFinalLang(){ return normalizeLang(qp("lang") || document.body?.getAttribute("data-lang") || document.documentElement?.lang || CFG.DEFAULT_LANG); }
  function slugFromPath(){ const p=location.pathname.replace(/\/+$/,""); const parts=p.split("/").filter(Boolean); const idx=parts.findIndex(x=>x===CFG.JOB_SEGMENT); if(idx>=0 && parts[idx+1]) return parts[idx+1]; return parts[parts.length-1] || ""; }

  // ---- CSS (keeps dashboard dark look; you can replace by your full CSS)
  const cssId="ul_metier_css_v48";
  if(!document.getElementById(cssId)){
    const s=document.createElement("style");
    s.id=cssId;
    s.textContent=`
html.ul-metier-dark, html.ul-metier-dark body{
  background: radial-gradient(1200px 600px at 20% -10%, rgba(100,108,253,0.22), transparent 55%),
              radial-gradient(900px 500px at 95% 10%, rgba(255,255,255,0.06), transparent 60%),
              linear-gradient(180deg, #0b1020, #070b16) !important;
}
#ulydia-metier-root{ color:#fff; font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial; }
.ul-wrap{ max-width:1120px; margin:0 auto; padding:22px 14px 26px; }
.ul-hero{ display:grid; grid-template-columns:1.55fr 1fr; gap:16px; align-items:stretch; }
@media(max-width:960px){ .ul-hero{ grid-template-columns:1fr; } }
.ul-card{ background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:22px; box-shadow:0 16px 50px rgba(0,0,0,.35); overflow:hidden; backdrop-filter: blur(10px); }
.ul-card-pad{ padding:18px; }
.ul-title{ font-size:34px; font-weight:850; letter-spacing:-.02em; margin:0 0 10px; line-height:1.12; }
.ul-sub{ color:rgba(255,255,255,.70); font-size:14.5px; line-height:1.65; margin:0 0 14px; }
.ul-meta{ display:flex; flex-wrap:wrap; gap:10px; color:rgba(255,255,255,.70); font-size:13px; font-weight:750; }
.ul-pill{ padding:8px 10px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.04); border-radius:999px; }
.ul-banners{ display:grid; grid-template-columns:1fr; gap:16px; }
.ul-banner{ position:relative; border-radius:22px; overflow:hidden; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.03); display:block; }
.ul-banner img{ width:100%; display:block; object-fit:cover; }
.ul-banner-wide{ aspect-ratio:16/5; }
.ul-banner-square{ aspect-ratio:1/1; }
`;
    document.head.appendChild(s);
  }
  document.documentElement.classList.add("ul-metier-dark");

  // ---- Root
  function ensureRoot(){
    let root=document.getElementById("ulydia-metier-root");
    if(!root){
      root=document.createElement("div");
      root.id="ulydia-metier-root";
      document.body.prepend(root);
    }
    return root;
  }

  // ---- Shell mode: do not hide countriesData / cms payload
  function applyShellMode(){
    if(!CFG.SHELL_MODE) return;

    const root = document.getElementById("ulydia-metier-root");
    const countriesData = document.getElementById(CFG.COUNTRIES_DATA_ID);
    const cmsPayload = document.getElementById(CFG.CMS_PAYLOAD_ID);

    const keep = new Set();
    if(root) keep.add(root);
    if(countriesData) keep.add(countriesData);
    if(cmsPayload) keep.add(cmsPayload);

    const nav=document.querySelector("header,.w-nav,.navbar,[data-ul-keep='nav']");
    const foot=document.querySelector("footer,.footer,[data-ul-keep='footer']");
    if(nav) keep.add(nav);
    if(foot) keep.add(foot);

    document.querySelectorAll("main,.w-section,.section,.wf-section,[data-ul-shell-hide='1']").forEach((el)=>{
      for(const k of keep){ if(k && (el===k || el.contains(k))) return; }
      if(nav && (el===nav || el.contains(nav))) return;
      if(foot && (el===foot || el.contains(foot))) return;
      el.style.display="none";
    });
  }

  // ---- Wait for countriesData to be ready (because it's at end of page)
  async function waitForCountriesData({ timeoutMs = 8000 } = {}){
    const start = Date.now();
    while(Date.now() - start < timeoutMs){
      const root = document.getElementById(CFG.COUNTRIES_DATA_ID);
      if(root){
        const items = root.querySelectorAll(".w-dyn-item, .w-dyn-items > *");
        const imgs = root.querySelectorAll("img");
        if(items.length > 0 && imgs.length > 0) return true;
      }
      await new Promise(r => setTimeout(r, 80));
    }
    return false;
  }

  // ---- Parse countriesData (your structure)
function extractImgUrl(el){
  if(!el) return "";
  // Case 1: <img>
  const imgSrc = el.tagName === "IMG"
    ? (el.currentSrc || el.getAttribute("src") || "")
    : (el.querySelector("img")?.currentSrc || el.querySelector("img")?.getAttribute("src") || "");
  if (imgSrc) return safeUrl(imgSrc);

  // Case 2: background-image: url("...")
  const bg = getComputedStyle(el).backgroundImage || "";
  const m = bg.match(/url\(["']?(.*?)["']?\)/i);
  return m && m[1] ? safeUrl(m[1]) : "";
}

function readCountryRow(iso){
  const root = document.getElementById("countriesData");
  if(!root) return null;

  // Webflow items can be w-dyn-item OR other nodes; safest is: find by iso-code text
  const key = String(iso||"").trim().toUpperCase();

  const candidates = Array.from(root.querySelectorAll(".country-row, .w-dyn-item, [role='listitem'], .w-dyn-items > *"));
  const pool = candidates.length ? candidates : Array.from(root.children);

  for(const it of pool){
    const itemIso = (it.querySelector(".iso-code")?.textContent || "").trim().toUpperCase();
    if(itemIso !== key) continue;

    const wideEl = it.querySelector(".banner-img-1");
    const squareEl = it.querySelector(".banner-img-2");

    const wide = extractImgUrl(wideEl);
    const square = extractImgUrl(squareEl);

    return { iso: key, wide, square };
  }
  return null;
}

  // expose debug helper
  window.getCountryBanner = (iso, kind) => {
    const row = readCountryRow(iso);
    if(!row) return "";
    return (kind==="wide" ? row.wide : row.square) || "";
  };

  // ---- Render (minimal to prove banners + title + desc from CMS)
  function readCmsDescription(){
    const root = document.getElementById(CFG.CMS_PAYLOAD_ID) || document;
    const d = root.querySelector('[data-ul-f="description"]')?.textContent?.trim();
    return d || "";
  }

  async function main(){
    const root = ensureRoot();
    applyShellMode();

    const slug = slugFromPath();
    const finalLang = getFinalLang();
    const country = (window.VISITOR_COUNTRY || "FR").toString().toUpperCase().replace(/[^A-Z]/g,"") || "FR";

    // IMPORTANT: wait for countriesData since it's at bottom
    const ready = await waitForCountriesData({ timeoutMs: 8000 });
    log("countriesData ready?", ready);

    const row = readCountryRow(country);
    log("country row", row);

    const wide = pickUrl(row?.wide || "");
    const square = pickUrl(row?.square || "");

    const desc = readCmsDescription();
    root.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-hero">
          <div class="ul-card ul-card-pad">
            <h1 class="ul-title">${slug}</h1>
            ${desc ? `<p class="ul-sub">${desc.slice(0,180)}${desc.length>180?"…":""}</p>` : ""}
            <div class="ul-meta">
              <span class="ul-pill">ISO: ${country}</span>
              <span class="ul-pill">Lang: ${finalLang}</span>
            </div>
          </div>
          <div class="ul-banners">
            <a class="ul-banner ul-banner-wide" href="/sponsorship"><img src="${wide}" /></a>
            <a class="ul-banner ul-banner-square" href="/sponsorship"><img src="${square}" /></a>
          </div>
        </div>
      </div>
    `;
  }

  main().catch(e => console.error("[metier-page] fatal", e));
})();
