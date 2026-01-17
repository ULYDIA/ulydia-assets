(() => {
  if (window.__ULYDIA_METIER_PAGE_V2__) return;
  window.__ULYDIA_METIER_PAGE_V2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // On essaye plusieurs endpoints au cas où tu ne sais plus lequel est “le bon”
  const ENDPOINT_CANDIDATES = [
    "/sponsor-info",
    "/sponsor/info",
    "/sponsorization/info",
    "/sponsorship/info",
    "/sponsorship/detail",
    "/sponsorship/detail2",
    "/api/sponsor-info",
    "/api/sponsorship/detail",
  ];

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
    // airtable attachment array / object
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

  function setLinkOnSponsorAnchors(url){
    if (!url) return;
    const nodes = [
      ...document.querySelectorAll('[data-role="sponsor-link"]'),
      ...document.querySelectorAll('[data-sponsor-link="true"]'),
      ...document.querySelectorAll('a[data-action="sponsor"]'),
    ];
    nodes.forEach(a => {
      try{
        a.setAttribute("href", url);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.style.pointerEvents = "auto";
      }catch(e){}
    });
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
    // 1) param ?metier=
    const fromQP = (qp("metier") || "").trim();
    if (fromQP) return fromQP;

    // 2) élément #metier-slug
    const ms = $("metier-slug");
    if (ms && ms.textContent.trim()) return ms.textContent.trim();

    // 3) premier élément qui a data-metier (comme sur ton screenshot)
    const any = document.querySelector("[data-metier]");
    if (any){
      const v = (any.getAttribute("data-metier") || "").trim();
      if (v) return v;
    }

    // 4) fallback URL: dernier segment
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
  // FETCH sponsor info (multi-route probing)
  // =========================================================
  async function fetchJson(url){
    const headers = { "accept": "application/json" };
    if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

    const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();

    let data = null;
    if (ct.includes("application/json")) {
      try { data = JSON.parse(text); } catch(e) {}
    } else {
      // certains workers renvoient json sans content-type correct
      try { data = JSON.parse(text); } catch(e) {}
    }

    return { ok: res.ok, status: res.status, data, text };
  }

  function normalizeSponsorPayload(raw){
    // Objectif: obtenir { sponsored, sponsor:{logo_1, logo_2, link} }
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
    };

    return { sponsored, sponsor, raw: obj };
  }

  async function getSponsorInfo(metier, country, lang){
    const base = apiBase();
    if (!base) return null;

    // endpoints
    const tries = ENDPOINT_CANDIDATES.map(p => {
      const u = new URL(base + p);
      u.searchParams.set("metier", metier);
      u.searchParams.set("country", country);
      u.searchParams.set("lang", lang);
      return u.toString();
    });

    log("probing endpoints:", tries);

    for (const url of tries){
      try{
        const r = await fetchJson(url);
        log("probe:", url, r.status);

        // si OK + json parse => on prend
        if (r.ok && r.data && typeof r.data === "object") {
          return normalizeSponsorPayload(r.data);
        }

        // parfois le Worker renvoie 200 mais json vide -> continue
        if (r.ok && r.data == null) continue;

        // si 404 -> continue
      }catch(e){
        // continue
      }
    }
    return null;
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
    window.SPONSORED_ACTIVE = sponsored;

    if (sponsored){
      show(blockSponsored, true);
      show(blockNotSponsored, false);

      const link = info?.sponsor?.link || "";
      const l1 = info?.sponsor?.logo_1 || "";
      const l2 = info?.sponsor?.logo_2 || "";

      if (l1) setImgHard(logo1, l1);
      if (l2) setImgHard(logo2, l2);

      if (link) setLinkOnSponsorAnchors(link);
    } else {
      show(blockSponsored, false);
      show(blockNotSponsored, true);
      // Ici: on ne touche pas aux bannières non sponsor (ton script body s’en occupe)
    }

    emitSponsorReady(sponsored, info || null);
    decided();
  }

  // =========================================================
  // BOOT
  // =========================================================
  (async function boot(){
    try{
      const metier = findMetierSlug();
      const country = getCountry();
      const lang = getLang();

      log("context:", { metier, country, lang });

      if (!metier){
        // Pas de slug => on ne bloque pas
        emitSponsorReady(false, { error: "missing_metier" });
        decided();
        return;
      }

      const info = await getSponsorInfo(metier, country, lang);

      if (!info){
        // Aucun endpoint trouvé => on ne casse rien
        log("no sponsor info found -> default non sponsored");
        await applySponsorDecision({ sponsored: false, sponsor: {}, raw: null });
        return;
      }

      await applySponsorDecision(info);

    }catch(e){
      console.warn("[metier-page] boot error", e);
      emitSponsorReady(false, { error: "boot_error" });
      decided();
    }
  })();

})();
