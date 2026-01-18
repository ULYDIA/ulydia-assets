(() => {
  if (window.__ULYDIA_METIER_PAGE_PROD_V3__) return;
  window.__ULYDIA_METIER_PAGE_PROD_V3__ = true;

  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const SPONSOR_ENDPOINT = "/sponsor-info";

  const ID_SPONSORED_BLOCK     = "block-sponsored";
  const ID_NOT_SPONSORED_BLOCK = "block-not-sponsored";

  const qp = (name) => new URLSearchParams(location.search).get(name);
  const $  = (id) => document.getElementById(id);
  const apiBase = () => String(WORKER_URL || "").replace(/\/$/, "");

  const normIso  = (v) => String(v || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  const normLang = (v) => String(v || "").trim().toLowerCase().split("-")[0];

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function show(el, yes){
    if (!el) return;
    el.style.display = yes ? "" : "none";
    el.style.visibility = yes ? "" : "hidden";
    el.style.opacity = yes ? "" : "0";
  }

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v)) return (v[0]?.url || v[0]?.thumbnails?.large?.url || v[0]?.thumbnails?.full?.url || "").trim();
    if (typeof v === "object") return (v.url || v.thumbnails?.large?.url || v.thumbnails?.full?.url || "").trim();
    return "";
  }

  function setImgHard(imgEl, url){
    if (!imgEl || !url) return;
    try{
      imgEl.removeAttribute("srcset");
      imgEl.removeAttribute("sizes");
      imgEl.setAttribute("src", url);
      imgEl.setAttribute("srcset", url);
      imgEl.style.visibility = "";
      imgEl.style.opacity = "";
    }catch(e){}
  }

  function makeClickable(node, url){
    if (!node || !url) return;

    const a = node.closest("a");
    if (a){
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.pointerEvents = "auto";
      return;
    }

    node.style.cursor = "pointer";
    node.style.pointerEvents = "auto";
    node.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    }, { passive: false });
  }

  function preloadImage(url){
    return new Promise((resolve) => {
      if (!url) return resolve(false);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  function decided(){
    // ✅ retire les 2 classes possibles (ton bug venait de là)
    try { document.documentElement.classList.remove("ul-sponsor-loading"); } catch(e){}
    try { document.documentElement.classList.remove("ulydia-sponsor-loading"); } catch(e){}
  }

  function findMetierSlug(){
    const fromQP = (qp("metier") || "").trim();
    if (fromQP) return fromQP;

    const any = document.querySelector("[data-metier]");
    if (any){
      const v = (any.getAttribute("data-metier") || "").trim();
      if (v) return v;
    }

    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function readCountryNow(){
    return (
      normIso(window.VISITOR_COUNTRY) ||
      normIso(qp("country")) ||
      normIso($("country-iso")?.textContent) ||
      ""
    );
  }

  function readLangNow(){
    return (
      normLang(window.VISITOR_LANG) ||
      normLang(qp("lang")) ||
      normLang($("country-lang")?.textContent) ||
      ""
    );
  }

  async function resolveGeo({ timeoutMs = 350 } = {}){
    // cache (ultra rapide)
    try{
      const cached = JSON.parse(localStorage.getItem("ulydia_geo_v1") || "null");
      if (cached?.country) return { country: normIso(cached.country) || "US", lang: normLang(cached.lang) || "en" };
    }catch(e){}

    // immédiat si déjà dispo
    let c = readCountryNow();
    let l = readLangNow();
    if (c){
      try{ localStorage.setItem("ulydia_geo_v1", JSON.stringify({ country: c, lang: l || "en", ts: Date.now() })); }catch(e){}
      return { country: c, lang: l || "en" };
    }

    // attend un peu le footer (VISITOR_COUNTRY)
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs){
      await sleep(25);
      c = readCountryNow();
      l = readLangNow();
      if (c){
        try{ localStorage.setItem("ulydia_geo_v1", JSON.stringify({ country: c, lang: l || "en", ts: Date.now() })); }catch(e){}
        return { country: c, lang: l || "en" };
      }
    }

    return { country: "US", lang: "en" };
  }

  function getSponsoredBannerTargets(){
    const sponsoredBlock = $(ID_SPONSORED_BLOCK);
    if (!sponsoredBlock) return { b1: null, b2: null };

    const b1 =
      sponsoredBlock.querySelector('[data-sponsor-img="square"]') ||
      sponsoredBlock.querySelector("#sponsor-logo-1") ||
      sponsoredBlock.querySelector("img");

    const imgs = sponsoredBlock.querySelectorAll("img");
    const b2 =
      sponsoredBlock.querySelector('[data-sponsor-img="landscape"]') ||
      sponsoredBlock.querySelector("#sponsor-logo-2") ||
      (imgs && imgs[1] ? imgs[1] : null);

    return { b1, b2 };
  }

  async function fetchSponsorInfo(metier, country, lang){
    const url = apiBase() + SPONSOR_ENDPOINT;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1800);

    try{
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json",
          "x-proxy-secret": PROXY_SECRET
        },
        body: JSON.stringify({
          metier: String(metier).trim(),
          country: String(country).trim().toUpperCase(),
          lang: String(lang || "en").trim().toLowerCase()
        }),
        cache: "no-store",
        signal: ctrl.signal
      });

      const txt = await res.text();
      let data = null;
      try { data = JSON.parse(txt); } catch(e) {}
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  async function applySponsorDecision(info){
    const blockSponsored = $(ID_SPONSORED_BLOCK);
    const blockNotSponsored = $(ID_NOT_SPONSORED_BLOCK);

    const sponsored = !!info?.sponsored;

    // ✅ sticky verdict pour le footer
    window.SPONSORED_ACTIVE = sponsored;
    window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored, ts: Date.now() };

    if (sponsored){
      const sponsor = info?.sponsor || {};
      const link  = String(sponsor.link || "").trim();
      const logo1 = pickUrl(sponsor.logo_1);
      const logo2 = pickUrl(sponsor.logo_2);

      await Promise.all([ preloadImage(logo1), preloadImage(logo2) ]);

      show(blockNotSponsored, false);
      show(blockSponsored, true);

      const { b1, b2 } = getSponsoredBannerTargets();
      if (logo1) setImgHard(b1, logo1);
      if (logo2) setImgHard(b2, logo2);

      if (link){
        makeClickable(b1, link);
        makeClickable(b2, link);
      }
    } else {
      show(blockSponsored, false);
      show(blockNotSponsored, true);
    }

    // event pour le footer
    try{
      window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", { detail: { sponsored, payload: info }}));
    }catch(e){}

    decided();
  }

  (async function boot(){
    const blockSponsored = $(ID_SPONSORED_BLOCK);
    const blockNotSponsored = $(ID_NOT_SPONSORED_BLOCK);

    // tant que pas décidé => on cache
    show(blockSponsored, false);
    show(blockNotSponsored, false);

    try{
      const metier = findMetierSlug();
      if (!metier){
        await applySponsorDecision({ sponsored: false });
        return;
      }

      const { country, lang } = await resolveGeo({ timeoutMs: 350 });
      const r = await fetchSponsorInfo(metier, country, lang);

      if (!r.ok || !r.data || typeof r.data !== "object"){
        await applySponsorDecision({ sponsored: false });
        return;
      }

      await applySponsorDecision(r.data);
    }catch(e){
      console.warn("[metier-page] boot error", e);
      try { await applySponsorDecision({ sponsored: false }); } catch(_){}
    }
  })();

})();


