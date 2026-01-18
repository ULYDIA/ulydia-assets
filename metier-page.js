(() => {
  if (window.__ULYDIA_METIER_PAGE__) return;
  window.__ULYDIA_METIER_PAGE__ = true;

  window.__METIER_PAGE_VERSION__ = "v4.7";

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

  // ---------- CSS (short, relies on v4.6 look) ----------
  const styleId="ul_metier_css_v47";
  if(!document.getElementById(styleId)){
    const s=document.createElement("style");
    s.id=styleId;
    s.textContent=`
html.ul-metier-dark, html.ul-metier-dark body{ background:#0b1020 !important; }
#ulydia-metier-root{ color:#fff; font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial; }
`;
    document.head.appendChild(s);
  }
  document.documentElement.classList.add("ul-metier-dark");

  // ---------- shell mode keep countriesData ----------
  function applyShellMode(){
    if(!CFG.SHELL_MODE) return;

    const root=document.getElementById("ulydia-metier-root");
    const countriesData=document.getElementById(CFG.COUNTRIES_DATA_ID);
    const cmsPayload=document.getElementById(CFG.CMS_PAYLOAD_ID);

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

  // ---------- countriesData parse (supports 2 patterns) ----------
  function readCountryBannersFromCMS(){
    const root = document.getElementById(CFG.COUNTRIES_DATA_ID);
    if(!root) return null;

    let items = Array.from(root.querySelectorAll(".w-dyn-item, .w-dyn-items > *"));
    if(!items.length) items = Array.from(root.children || []);
    if(!items.length) return null;

    const out = [];
    for(const it of items){
      let iso =
        (it.querySelector('[data-ul-country="iso"]')?.textContent || "").trim().toUpperCase() ||
        (it.querySelector(".iso-code")?.textContent || "").trim().toUpperCase();

      if(!iso){
        const txt = (it.textContent || "").toUpperCase();
        const mm = txt.match(/\b[A-Z]{2}\b/);
        if(mm) iso = mm[0];
      }
      if(!iso) continue;

      // pattern A: data attrs
      let wide =
        safeUrl(it.querySelector('img[data-ul-country="banner_wide"]')?.getAttribute("src") || "") ||
        safeUrl(it.querySelector("img.banner-img-1")?.getAttribute("src") || "") ||
        safeUrl(it.querySelector(".banner-img-1 img")?.getAttribute("src") || "");

      let square =
        safeUrl(it.querySelector('img[data-ul-country="banner_square"]')?.getAttribute("src") || "") ||
        safeUrl(it.querySelector("img.banner-img-2")?.getAttribute("src") || "") ||
        safeUrl(it.querySelector(".banner-img-2 img")?.getAttribute("src") || "");

      // fallback: first 2 imgs in item
      if(!wide || !square){
        const imgs = Array.from(it.querySelectorAll("img"))
          .map(img => safeUrl(img.currentSrc || img.getAttribute("src") || ""))
          .filter(Boolean);
        if(!wide && imgs[0]) wide = imgs[0];
        if(!square && imgs[1]) square = imgs[1];
      }

      out.push({ iso, wide, square });
    }
    return out.length ? out : null;
  }

  function pickCountryRow(iso){
    const list = readCountryBannersFromCMS();
    if(!list) return null;
    const key = String(iso||"").trim().toUpperCase();
    return list.find(x => x.iso === key) || null;
  }

  // expose for console tests
  window.getCountryBanner = (iso, kind) => {
    const row = pickCountryRow(iso);
    if(!row) return "";
    return (kind==="wide" ? row.wide : row.square) || "";
  };

  // ---------- main render minimal (to prove banners) ----------
  function ensureRoot(){
    let root=document.getElementById("ulydia-metier-root");
    if(!root){
      root=document.createElement("div");
      root.id="ulydia-metier-root";
      document.body.prepend(root);
    }
    return root;
  }

  async function main(){
    const slug = slugFromPath();
    const finalLang = getFinalLang();

    // DEBUG: countriesData presence
    const cd = document.getElementById(CFG.COUNTRIES_DATA_ID);
    log("countriesData present?", !!cd);

    // If you use shell-mode, apply AFTER root exists
    ensureRoot();
    applyShellMode();

    // get country from your global footer (if set), else FR
    const country = (window.VISITOR_COUNTRY || "FR").toString().toUpperCase().replace(/[^A-Z]/g,"") || "FR";

    const row = pickCountryRow(country);
    const wide = pickUrl(row?.wide || "");
    const square = pickUrl(row?.square || "");

    log("non-sponsor banners test", { country, wide: !!wide, square: !!square });

    const root = ensureRoot();
    root.innerHTML = `
      <div style="max-width:1120px;margin:20px auto;padding:16px;">
        <h1 style="font-size:28px;font-weight:800;margin:0 0 12px;">${slug}</h1>
        <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:16px;">
          <a href="/sponsorship" style="border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden;display:block">
            <img src="${wide || ""}" style="width:100%;display:block;aspect-ratio:16/5;object-fit:cover;background:rgba(255,255,255,.04)" />
          </a>
          <a href="/sponsorship" style="border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden;display:block">
            <img src="${square || ""}" style="width:100%;display:block;aspect-ratio:1/1;object-fit:cover;background:rgba(255,255,255,.04)" />
          </a>
        </div>
        <div style="margin-top:10px;color:rgba(255,255,255,.7);font-size:13px;">
          Lang: ${finalLang} — ISO: ${country}
        </div>
      </div>
    `;
  }

  main().catch(e => console.error("[metier-page] fatal", e));
})();
