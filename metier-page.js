/* metier-page.js — Ulydia (PROD CLEAN v2)
   - Fetch sponsor verdict from Worker (POST /sponsor-info)
   - If sponsored: replace nonSponsorBanner01/02 with sponsor banners
   - Robust click handling (works with Webflow overlays/link blocks)
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_PROD_V2__) return;
  window.__ULYDIA_METIER_PAGE_PROD_V2__ = true;

  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const ENDPOINT     = "/sponsor-info";

  const BANNER_1_ID  = "nonSponsorBanner01";
  const BANNER_2_ID  = "nonSponsorBanner02";
  const GUARD_MS     = 4000;

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

    if (el.tagName && el.tagName.toLowerCase() === "img") {
      el.removeAttribute("srcset");
      el.removeAttribute("sizes");
      el.setAttribute("src", url);
      el.setAttribute("srcset", "");
      el.style.opacity = "0.999";
      requestAnimationFrame(() => { el.style.opacity = ""; });
      return true;
    }

    const img = el.querySelector && el.querySelector("img");
    if (img) return setImgHard(img, url);

    try{
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
      return true;
    }catch(e){}
    return false;
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
    const t = setInterval(() => {
      if (Date.now() - start > msTotal) { clearInterval(t); return; }
      if (el.tagName && el.tagName.toLowerCase() === "img") {
        const cur = (el.getAttribute("src") || "").trim();
        if (cur !== expectedUrl) setImgHard(el, expectedUrl);
      } else {
        setImgHard(el, expectedUrl);
      }
    }, 250);
  }

  function isClickableTag(el){
    const tag = (el?.tagName || "").toLowerCase();
    return tag === "a" || tag === "button";
  }

  function pickClickTarget(el){
    if (!el) return null;

    // Prefer closest <a>
    const a = el.closest && el.closest("a");
    if (a) return a;

    // Otherwise climb parents to find a reasonable wrapper (Webflow link blocks/divs)
    let cur = el;
    for (let i = 0; i < 6 && cur; i++){
      if (isClickableTag(cur)) return cur;
      // Common Webflow wrappers: link-block, w-inline-block, etc.
      const cls = (cur.className || "");
      if (typeof cls === "string" && (cls.includes("w-inline-block") || cls.includes("w-button") || cls.includes("link"))) {
        return cur;
      }
      cur = cur.parentElement;
    }

    // Fallback to the element itself
    return el;
  }

  function bindSponsorClick(el, url){
    if (!el || !url) return;

    const target = pickClickTarget(el);
    if (!target) return;

    // Prevent double-binding
    if (target.__ul_sponsor_click_bound) return;
    target.__ul_sponsor_click_bound = true;

    // Ensure clickable
    try {
      target.style.cursor = "pointer";
      target.style.pointerEvents = "auto";
    } catch(e){}

    // If target is <a>, set href
    if (target.tagName && target.tagName.toLowerCase() === "a") {
      target.setAttribute("href", url);
      target.setAttribute("target", "_blank");
      target.setAttribute("rel", "noopener noreferrer");
      return; // href is enough (less fragile)
    }

    // Otherwise attach handler
    target.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    }, { passive: false });
  }

  function installCaptureFallback(el1, el2, url){
    if (!url) return;
    // Capture phase handler to beat overlays that stop bubbling
    if (document.__ul_sponsor_capture_bound) return;
    document.__ul_sponsor_capture_bound = true;

    const nodes = [el1, el2].filter(Boolean);
    if (!nodes.length) return;

    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;
      for (const n of nodes){
        if (n === t || (n.contains && n.contains(t))) {
          // Click happened inside banner area
          e.preventDefault();
          e.stopPropagation();
          window.open(url, "_blank", "noopener,noreferrer");
          return;
        }
      }
    }, true); // ✅ capture
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

  (async () => {
    window.__ULYDIA_PAGE_SPONSOR_SCRIPT__ = true;

    const el1 = $(BANNER_1_ID);
    const el2 = $(BANNER_2_ID);
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

    const urlLandscape = String(sponsor.logo_2 || "").trim();
    const urlSquare    = String(sponsor.logo_1 || "").trim();

    const target1 = urlLandscape || urlSquare;
    const target2 = urlSquare || urlLandscape;

    if (el1 && target1) setImgHard(el1, target1);
    if (el2 && target2) setImgHard(el2, target2);

    if (link) {
      if (el1) bindSponsorClick(el1, link);
      if (el2) bindSponsorClick(el2, link);
      installCaptureFallback(el1, el2, link);
    }

    emitSponsorReady(true, data);

    if (el1 && target1) guardReapply(el1, target1, GUARD_MS);
    if (el2 && target2) guardReapply(el2, target2, GUARD_MS);
  })();

})();
