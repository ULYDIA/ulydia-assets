<script>
(() => {
  if (window.__ULYDIA_METIER_PAGE_V22__) return;
  window.__ULYDIA_METIER_PAGE_V22__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // ✅ Ton Worker sponsor-info est un POST JSON (d’après tes tests console)
  const ENDPOINT = "/sponsor-info";

  // DOM ids
  const ID_SPONSORED_BLOCK     = "block-sponsored";
  const ID_NOT_SPONSORED_BLOCK = "block-not-sponsored";
  const ID_LOGO_1              = "sponsor-logo-1"; // square
  const ID_LOGO_2              = "sponsor-logo-2"; // landscape

  // =========================================================
  // HELPERS
  // =========================================================
  const qp = (name) => new URLSearchParams(location.search).get(name);

  function normIso(v){
    return String(v || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  }
  function normLang(v){
    return String(v || "").trim().toLowerCase().split("-")[0];
  }
  function apiBase(){
    return String(WORKER_URL || "").replace(/\/$/, "");
  }
  function $(id){ return document.getElementById(id); }

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

  // ✅ Webflow-safe image set (srcset/sizes can override src)
  function setImgHard(elOrId, url){
    if (!url) return false;
    const el = (typeof elOrId === "string") ? document.getElementById(elOrId) : elOrId;
    if (!el) return false;

    // If it's an img
    if (el.tagName && el.tagName.toLowerCase() === "img") {
      try{
        el.removeAttribute("srcset");
        el.removeAttribute("sizes");
        el.setAttribute("src", url);
        // Some Webflow setups keep srcset; keep it empty to prevent override
        el.setAttribute("srcset", "");
        // force repaint
        el.style.opacity = "0.999";
        requestAnimationFrame(() => { el.style.opacity = ""; });
        return true;
      }catch(e){
        return false;
      }
    }

    // If container contains img
    const img = el.querySelector && el.querySelector("img");
    if (img) return setImgHard(img, url);

    // Fallback background-image
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

    // 1) Anchors marked for sponsor
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

    // 2) Also force link on the closest <a> around the logo images (most common)
    const logo1 = $(ID_LOGO_1);
    const logo2 = $(ID_LOGO_2);
    setLinkOnClosestA(logo1, url);
    setLinkOnClosestA(logo2, url);
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
  // CONTEXT (metier / country / lang)
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
    return (
      normIso(window.VISITOR_COUNTRY) ||
      normIso(qp("country")) ||
      normIso($("country-iso")?.textContent) ||
      "US"
    );
  }

  function getLang(){
    const l =
      normLang(window.VISITOR_LANG) ||
      normLang(qp("lang")) ||
      normLang($("country-lang")?.textContent) ||
      "en";
    return l || "en";
  }

  // =========================================================
  // FETCH sponsor info (POST JSON)
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
    const sponsored =
      !!obj.sponsored ||
      !!obj.isSponsored ||
      !!obj.active ||
      !!obj?.data?.sponsored ||
      !!obj?.result?.sponsored;

    const sponsorObj =
      obj.sponsor ||
      obj.company ||
      obj.brand ||
      obj?.data?.sponsor ||
      obj?.result?.sponsor ||
      {};

    const sponsor = {
      link:   String(sponsorObj.link || sponsorObj.url || obj.link || "").trim(),
      logo_1: pickUrl(sponsorObj.logo_1 || sponsorObj.logo1 || sponsorObj.square || obj.logo_1 || obj.logo1),
      logo_2: pickUrl(sponsorObj.logo_2 || sponsorObj.logo2 || sponsorObj.landscape || obj.logo_2 || obj.logo2),
      name:   String(sponsorObj.name || sponsorObj.company_name || obj.name || "").trim(),
      status: String(sponsorObj.status || obj.status || "").trim(),
    };

    return { sponsored, sponsor, raw: obj };
  }

  async function getSponsorInfo(metier, country, lang){
    const r = await postJson(ENDPOINT, { metier, country, lang });
    log("POST", ENDPOINT, "=>", r.status, r.data || r.text);

    if (!r.ok || !r.data || typeof r.data !== "object") return null;
    return normalizeSponsorPayload(r.data);
  }

  // =========================================================
  // APPLY UI
  // =========================================================
  async function applySponsorDecision(info){
    const blockSponsored = $(ID_SPONSORED_BLOCK);
    const blockNotSponsored = $(ID_NOT_SPONSORED_BLOCK);
    const logo1 = $(ID_LOGO_1);
    const logo2 = $(ID_LOGO_2);

    const sponsored = !!info?.sponsored;

    // ✅ sticky verdict (for footer scripts / late listeners)
    window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored };
    if (sponsored) window.SPONSORED_ACTIVE = true;
    else window.SPONSORED_ACTIVE = false;

    if (sponsored){
      show(blockSponsored, true);
      show(blockNotSponsored, false);

      const link = String(info?.sponsor?.link || "").trim();
      const l1 = String(info?.sponsor?.logo_1 || "").trim(); // square
      const l2 = String(info?.sponsor?.logo_2 || "").trim(); // landscape

      log("apply sponsor assets", { l1, l2, link });

      // Apply images HARD
      if (l1) setImgHard(logo1, l1);
      if (l2) setImgHard(logo2, l2);

      // Ensure links
      if (link) setLinkOnSponsorAnchors(link);

    } else {
      show(blockSponsored, false);
      show(blockNotSponsored, true);
      // ne touche pas aux bannières non sponsor (gérées par ton script global)
    }

    emitSponsorReady(sponsored, info || null);
    decided();
  }

  // =========================================================
  // BOOT
  // =========================================================
  (async function boot(){
    try{
      window.__ULYDIA_PAGE_SPONSOR_SCRIPT__ = true; // flag for global scripts

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
