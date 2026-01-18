(() => {
  if (window.__ULYDIA_METIER_PAGE_PROD__) return;
  window.__ULYDIA_METIER_PAGE_PROD__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // IDs Webflow (tes blocs)
  const ID_SPONSORED_BLOCK     = "block-sponsored";
  const ID_NOT_SPONSORED_BLOCK = "block-not-sponsored";

  // =========================================================
  // HELPERS
  // =========================================================
  const qp = (name) => new URLSearchParams(location.search).get(name);
  const $ = (id) => document.getElementById(id);
  const apiBase = () => String(WORKER_URL || "").replace(/\/$/, "");

  const normIso = (v) => String(v || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
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

    // 1) si déjà dans un <a>, on met href
    const a = node.closest("a");
    if (a){
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.pointerEvents = "auto";
      return;
    }

    // 2) sinon, on rend l'image cliquable
    node.style.cursor = "pointer";
    node.style.pointerEvents = "auto";
    node.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    }, { passive: false });
  }

  function decided(){
    // enlève l’anti-flash
    document.documentElement.classList.remove("ul-sponsor-loading");
  }

  // =========================================================
  // CONTEXT (metier / country)
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

  // =========================================================
  // DOM mapping bannières (on ne dépend PAS de sponsor-logo-1/2)
  // =========================================================
  function getBannerTargets(){
    const sponsoredBlock = $(ID_SPONSORED_BLOCK);

    // Priorité aux IDs que tu as réellement (d’après tes logs)
    const b1 =
      document.querySelector("#nonSponsorBanner01") ||
      sponsoredBlock?.querySelector('img[id*="Banner01" i]') ||
      sponsoredBlock?.querySelector("img");

    const b2 =
      document.querySelector("#nonSponsorBanner02") ||
      sponsoredBlock?.querySelector('img[id*="Banner02" i]') ||
      (sponsoredBlock ? sponsoredBlock.querySelectorAll("img")[1] : null);

    return { b1, b2 };
  }

  // =========================================================
  // API sponsor-info (POST)
  // =========================================================
  async function fetchSponsorInfo(metier, country){
    const url = apiBase() + "/sponsor-info";
    const headers = { "Content-Type": "application/json", "accept":"application/json" };
    if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ metier: String(metier).trim(), country: String(country).trim().toUpperCase() }),
      cache: "no-store",
    });

    const txt = await res.text();
    let data = null;
    try { data = JSON.parse(txt); } catch(e) {}

    return { ok: res.ok, status: res.status, data, txt };
  }

  // =========================================================
  // APPLY UI
  // =========================================================
  async function applySponsorDecision(info){
    const blockSponsored = $(ID_SPONSORED_BLOCK);
    const blockNotSponsored = $(ID_NOT_SPONSORED_BLOCK);

    const sponsored = !!info?.sponsored;
    window.SPONSORED_ACTIVE = sponsored;

    if (sponsored){
      show(blockSponsored, true);
      show(blockNotSponsored, false);

      const sponsor = info?.sponsor || {};
      const link = String(sponsor.link || "").trim();

      const logo1 = pickUrl(sponsor.logo_1);
      const logo2 = pickUrl(sponsor.logo_2);

      const { b1, b2 } = getBannerTargets();

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

    decided();
  }

  // =========================================================
  // BOOT
  // =========================================================
  (async function boot(){
    try{
      const metier = findMetierSlug();
      const country = getCountry();
      log("context:", { metier, country });

      if (!metier){
        await applySponsorDecision({ sponsored: false });
        return;
      }

      // (optionnel) mini délai pour laisser Webflow injecter le DOM si besoin
      // mais l’anti-flash empêche toute apparition non sponsor
      await sleep(30);

      const r = await fetchSponsorInfo(metier, country);
      log("sponsor-info:", r.status, r.data);

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

