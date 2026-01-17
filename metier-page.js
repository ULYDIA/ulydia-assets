<script>
(() => {
  if (window.__ULYDIA_METIER_PAGE_V23__) return;
  window.__ULYDIA_METIER_PAGE_V23__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const ENDPOINT     = "/sponsor-info"; // ✅ POST JSON

  // Blocks (exist on your page ✅)
  const ID_SPONSORED_BLOCK     = "block-sponsored";
  const ID_NOT_SPONSORED_BLOCK = "block-not-sponsored";

  // Optional explicit IDs (if you add them later)
  const FALLBACK_IDS_LANDSCAPE = ["sponsor-logo-2", "sponsorBannerLandscape", "sponsor-banner-landscape", "sponsor_landscape"];
  const FALLBACK_IDS_SQUARE    = ["sponsor-logo-1", "sponsorBannerSquare", "sponsor-banner-square", "sponsor_square"];

  // =========================================================
  // HELPERS
  // =========================================================
  const qp = (name) => new URLSearchParams(location.search).get(name);
  const $ = (id) => document.getElementById(id);

  function normIso(v){
    return String(v || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  }
  function normLang(v){
    return String(v || "").trim().toLowerCase().split("-")[0];
  }
  function apiBase(){
    return String(WORKER_URL || "").replace(/\/$/, "");
  }

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

  function setImgHard(elOrId, url){
    if (!url) return false;
    const el = (typeof elOrId === "string") ? document.getElementById(elOrId) : elOrId;
    if (!el) return false;

    if (el.tagName && el.tagName.toLowerCase() === "img") {
      try{
        el.removeAttribute("srcset");
        el.removeAttribute("sizes");
        el.setAttribute("src", url);
        el.setAttribute("srcset", "");
        el.style.opacity = "0.999";
        requestAnimationFrame(() => { el.style.opacity = ""; });
        return true;
      }catch(e){ return false; }
    }

    const img = el.querySelector && el.querySelector("img");
    if (img) return setImgHard(img, url);

    try{
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      return true;
    }catch(e){}
    return false;
  }

  function setLinkOnClosestA(node, url){
    if (!node || !url) return;
    const a = node.closest && node.closest("a");
    if (!a) return;
    try{
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.style.pointerEvents = "auto";
    }catch(e){}
  }

  function setLinkOnSponsorAnchors(url){
    if (!url) return;

    const nodes = [
      ...document.querySelectorAll('[data-role="sponsor-link"]'),
      ...document.querySelectorAll('[data-sponsor-link="true"]'),
      ...document.querySelectorAll('a[data-action="sponsor"]')
    ];

    nodes.forEach(a => {
      try{
        a.setAttribute("href", url);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.style.pointerEvents = "auto";
      }catch(e){}
    });

    // Also force on any anchors wrapping images inside block-sponsored
    const block = $(ID_SPONSORED_BLOCK);
    if (block) {
      const imgs = Array.from(block.querySelectorAll("img"));
      imgs.forEach(img => setLinkOnClosestA(img, url));
    }
  }

  function emitSponsorReady(sponsored, payload){
    try{
      window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
        detail: { sponsored: !!sponsored, payload: payload || null }
      }));
    }catch(e){}
  }

  function decided(){
    window.__ULYDIA_SPONSOR_DECIDED__ = true;
    try { document.documentElement.classList.remove("sponsor-loading"); } catch(e){}
  }

  // =========================================================
  // CONTEXT
  // =========================================================
  function findMetierSlug(){
    const fromQP = (qp("metier") || "").trim();
    if (fromQP) return fromQP;

    const ms = $("metier-slug");
    if (ms && ms.textContent.trim()) return ms.textContent.trim();

    const any = document.querySelector("[data-metier]");
    if (any){
      const v = (any.getAttribute("data-metier") || "").trim();
      if (v) return v;
    }

    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function getCountry(){
    return normIso(window.VISITOR_COUNTRY) || normIso(qp("country")) || "US";
  }

  function getLang(){
    return normLang(window.VISITOR_LANG) || normLang(qp("lang")) || "en";
  }

  // =========================================================
  // FETCH (POST JSON)
  // =========================================================
  async function postJson(path, payload){
    const url = apiBase() + path;
    const headers = {
      "content-type": "application/json",
      "accept": "application/json",
    };
    if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload || {}),
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    let data = null;
    try { data = JSON.parse(text); } catch(e){}

    return { ok: res.ok, status: res.status, data, text };
  }

  function normalizeSponsorPayload(raw){
    const obj = raw || {};
    const sponsored = !!obj.sponsored;
    const sponsorObj = obj.sponsor || {};

    return {
      sponsored,
      sponsor: {
        link:   String(sponsorObj.link || "").trim(),
        logo_1: pickUrl(sponsorObj.logo_1),
        logo_2: pickUrl(sponsorObj.logo_2),
        name:   String(sponsorObj.name || "").trim(),
        status: String(sponsorObj.status || "").trim(),
      },
      raw: obj
    };
  }

  async function getSponsorInfo(metier, country, lang){
    const r = await postJson(ENDPOINT, { metier, country, lang });
    log("POST", ENDPOINT, "=>", r.status, r.data || r.text);
    if (!r.ok || !r.data || typeof r.data !== "object") return null;
    return normalizeSponsorPayload(r.data);
  }

  // =========================================================
  // FIND IMGS INSIDE #block-sponsored (since IDs missing)
  // =========================================================
  function findImgByIds(ids){
    for (const id of ids){
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function pickLandscapeAndSquareImgs(block){
    const imgs = Array.from(block.querySelectorAll("img")).filter(img => {
      // ignore 1x1 icons
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      return (w + h) > 20;
    });

    // If we can detect shapes
    let landscape = null;
    let square = null;

    // Prefer images already having a "wide" aspect or likely banner
    for (const img of imgs){
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (!landscape && w && h && (w / h) >= 2.2) landscape = img;
    }
    // Prefer square-ish for logo_1
    for (const img of imgs){
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      const r = (w && h) ? (w / h) : 0;
      if (!square && r && r > 0.8 && r < 1.25) square = img;
    }

    // Fallback: take first two images if not detected
    if (!landscape && imgs[0]) landscape = imgs[0];
    if (!square && imgs[1]) square = imgs[1];

    return { landscape, square, imgs };
  }

  // =========================================================
  // APPLY UI
  // =========================================================
  async function applySponsorDecision(info){
    const blockSponsored = $(ID_SPONSORED_BLOCK);
    const blockNotSponsored = $(ID_NOT_SPONSORED_BLOCK);

    const sponsored = !!info?.sponsored;

    // ✅ sticky verdict
    window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored };
    window.SPONSORED_ACTIVE = sponsored;

    if (sponsored){
      show(blockSponsored, true);
      show(blockNotSponsored, false);

      const link = String(info?.sponsor?.link || "").trim();
      const l1 = String(info?.sponsor?.logo_1 || "").trim(); // square
      const l2 = String(info?.sponsor?.logo_2 || "").trim(); // landscape

      log("apply sponsor assets", { l1, l2, link });

      // 1) Try explicit IDs if you add them later
      const imgLandscape = findImgByIds(FALLBACK_IDS_LANDSCAPE);
      const imgSquare    = findImgByIds(FALLBACK_IDS_SQUARE);

      let okLand = false;
      let okSq   = false;

      if (imgLandscape && l2) okLand = setImgHard(imgLandscape, l2);
      if (imgSquare && l1)    okSq   = setImgHard(imgSquare, l1);

      // 2) If IDs not present, auto-pick inside block-sponsored
      if ((!okLand || !okSq) && blockSponsored) {
        const picked = pickLandscapeAndSquareImgs(blockSponsored);
        log("picked imgs", picked);

        if (!okLand && picked.landscape && l2) okLand = setImgHard(picked.landscape, l2);
        if (!okSq && picked.square && l1)      okSq   = setImgHard(picked.square, l1);

        // Make sure those imgs are clickable too
        if (link) {
          if (picked.landscape) setLinkOnClosestA(picked.landscape, link);
          if (picked.square) setLinkOnClosestA(picked.square, link);
        }
      }

      if (link) setLinkOnSponsorAnchors(link);

      log("apply result", { okLand, okSq });

    } else {
      show(blockSponsored, false);
      show(blockNotSponsored, true);
      // non-sponsor banners handled by your global/body script
    }

    emitSponsorReady(sponsored, info || null);
    decided();
  }

  // =========================================================
  // BOOT
  // =========================================================
  (async function boot(){
    try{
      window.__ULYDIA_PAGE_SPONSOR_SCRIPT__ = true;

      const metier = findMetierSlug();
      const country = getCountry();
      const lang = getLang();

      log("context:", { metier, country, lang });

      if (!metier){
        window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored: false };
        window.SPONSORED_ACTIVE = false;
        emitSponsorReady(false, { error: "missing_metier" });
        decided();
        return;
      }

      const info = await getSponsorInfo(metier, country, lang);

      if (!info){
        log("no sponsor info -> default non sponsored");
        await applySponsorDecision({ sponsored: false, sponsor: {}, raw: null });
        return;
      }

      await applySponsorDecision(info);

    }catch(e){
      console.warn("[metier-page] boot error", e);
      window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored: false };
      window.SPONSORED_ACTIVE = false;
      emitSponsorReady(false, { error: "boot_error" });
      decided();
    }
  })();

})();
</script>
