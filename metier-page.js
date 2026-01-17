/* metier-page.js — Ulydia (PROD CLEAN)
   - Fetch sponsor verdict from Worker (POST /sponsor-info)
   - If sponsored: replace nonSponsorBanner01/02 with sponsor banners + bind click to sponsor link
   - Sets SPONSORED_ACTIVE + emits uydia:sponsor-ready
   - Guards against late overwrites for a short window
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_PROD__) return;
  window.__ULYDIA_METIER_PAGE_PROD__ = true;

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const ENDPOINT     = "/sponsor-info";

  // Your existing Webflow banner IDs
  const BANNER_1_ID  = "nonSponsorBanner01"; // landscape slot
  const BANNER_2_ID  = "nonSponsorBanner02"; // square slot

  // Guard duration (ms) to prevent footer/global overwriting
  const GUARD_MS = 4000;

  // =========================================================
  // HELPERS
  // =========================================================
  function apiBase(){ return String(WORKER_URL || "").replace(/\/$/, ""); }
  function $(id){ return document.getElementById(id); }

  function getMetier(){
    return (
      document.querySelector("[data-metier]")?.getAttribute("data-metier") ||
      document.getElementById("metier-slug")?.textContent?.trim() ||
      location.pathname.split("/").filter(Boolean).pop() ||
      ""
    );
  }

  function getCountry(){
    return String(
      window.VISITOR_COUNTRY ||
      new URLSearchParams(location.search).get("country") ||
      "FR"
    ).toUpperCase();
  }

  function getLang(){
    return String(
      window.VISITOR_LANG ||
      new URLSearchParams(location.search).get("lang") ||
      "en"
    ).toLowerCase().split("-")[0];
  }

  function setImgHard(el, url){
    if (!el || !url) return false;

    // <img>
    if (el.tagName && el.tagName.toLowerCase() === "img") {
      el.removeAttribute("srcset");
      el.removeAttribute("sizes");
      el.setAttribute("src", url);
      el.setAttribute("srcset", "");
      el.style.opacity = "0.999";
      requestAnimationFrame(() => { el.style.opacity = ""; });
      return true;
    }

    // container with img inside
    const img = el.querySelector && el.querySelector("img");
    if (img) return setImgHard(img, url);

    // background fallback
    try{
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
      return true;
    }catch(e){}
    return false;
  }

  function bindClickOpen(el, url){
    if (!el || !url) return;
    if (el.__ul_click_bound) return;
    el.__ul_click_bound = true;

    try { el.style.cursor = "pointer"; } catch(e){}

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    }, { passive: false });

    const a = el.closest && el.closest("a");
    if (a){
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  }

  function emitSponsorReady(sponsored, payload){
    try{
      window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
        detail: { sponsored: !!sponsored, payload: payload || null }
      }));
    }catch(e){}
  }

  function guardReapply(el, expectedUrl, msTotal){
    if (!el || !expectedUrl) return;
    const start = Date.now();

    const timer = setInterval(() => {
      if (Date.now() - start > msTotal) { clearInterval(timer); return; }

      if (el.tagName && el.tagName.toLowerCase() === "img") {
        const cur = (el.getAttribute("src") || "").trim();
        if (cur !== expectedUrl) setImgHard(el, expectedUrl);
      } else {
        setImgHard(el, expectedUrl);
      }
    }, 250);
  }

  async function fetchSponsorInfo(){
    const metier = getMetier();
    const country = getCountry();
    const lang = getLang();
    if (!metier || !country) return null;

    const res = await fetch(apiBase() + ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-proxy-secret": PROXY_SECRET
      },
      body: JSON.stringify({ metier, country, lang }),
      cache: "no-store"
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return null;
    return data;
  }

  // =========================================================
  // BOOT
  // =========================================================
  (async () => {
    // marker for other scripts
    window.__ULYDIA_PAGE_SPONSOR_SCRIPT__ = true;

    const el1 = $(BANNER_1_ID);
    const el2 = $(BANNER_2_ID);

    // If the template doesn't contain banners, don't do anything
    if (!el1 && !el2) return;

    const data = await fetchSponsorInfo();
    if (!data) {
      window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored: false };
      window.SPONSORED_ACTIVE = false;
      emitSponsorReady(false, { error: "no_data" });
      return;
    }

    const sponsored = !!data.sponsored;
    window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored };

    if (!sponsored) {
      window.SPONSORED_ACTIVE = false;
      emitSponsorReady(false, data);
      return;
    }

    // Sponsored
    window.SPONSORED_ACTIVE = true;

    const sponsor = data.sponsor || {};
    const link = String(sponsor.link || "").trim();

    const urlLandscape = String(sponsor.logo_2 || "").trim(); // banner1
    const urlSquare    = String(sponsor.logo_1 || "").trim(); // banner2

    const target1 = urlLandscape || urlSquare;
    const target2 = urlSquare || urlLandscape;

    if (el1 && target1) setImgHard(el1, target1);
    if (el2 && target2) setImgHard(el2, target2);

    if (link) {
      if (el1) bindClickOpen(el1, link);
      if (el2) bindClickOpen(el2, link);
    }

    emitSponsorReady(true, data);

    // short guard against late overwrites (footer/global timeouts)
    if (el1 && target1) guardReapply(el1, target1, GUARD_MS);
    if (el2 && target2) guardReapply(el2, target2, GUARD_MS);
  })();

})();
