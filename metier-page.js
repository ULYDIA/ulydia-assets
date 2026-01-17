/* metier-page.js — Ulydia (PROD v3 — CLICK OVERLAY FIX)
   - Fetch sponsor verdict (POST /sponsor-info)
   - Replace nonSponsorBanner01/02 with sponsor assets
   - Adds a transparent <a> overlay ABOVE each banner to guarantee clicks
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_PROD_V3__) return;
  window.__ULYDIA_METIER_PAGE_PROD_V3__ = true;

  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const ENDPOINT     = "/sponsor-info";

  const BANNER_1_ID  = "nonSponsorBanner01"; // landscape
  const BANNER_2_ID  = "nonSponsorBanner02"; // square
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

  // --------------------------
  // CLICK OVERLAY (imparable)
  // --------------------------
  function ensureOverlayContainer(){
    let c = document.getElementById("ul_sponsor_overlay_layer");
    if (c) return c;

    c = document.createElement("div");
    c.id = "ul_sponsor_overlay_layer";
    c.style.position = "fixed";
    c.style.left = "0";
    c.style.top = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.zIndex = "2147483647"; // au-dessus de tout
    c.style.pointerEvents = "none"; // les <a> dedans géreront le clic
    c.style.background = "transparent";
    document.body.appendChild(c);
    return c;
  }

  function makeOverlayLink(key, rect, url){
    const container = ensureOverlayContainer();

    let a = document.getElementById(key);
    if (!a) {
      a = document.createElement("a");
      a.id = key;
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.style.position = "absolute";
      a.style.display = "block";
      a.style.pointerEvents = "auto";
      a.style.background = "transparent";
      a.style.cursor = "pointer";
      // (optionnel debug) a.style.outline = "2px solid red";
      container.appendChild(a);
    } else {
      // update url
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }

    // rect -> overlay position (fixed container)
    a.style.left = Math.max(0, rect.left) + "px";
    a.style.top = Math.max(0, rect.top) + "px";
    a.style.width = Math.max(0, rect.width) + "px";
    a.style.height = Math.max(0, rect.height) + "px";

    // safety: if zero size, disable click
    const active = rect.width > 5 && rect.height > 5;
    a.style.pointerEvents = active ? "auto" : "none";
  }

  function positionOverlays(el1, el2, link){
    if (!link) return;

    const update = () => {
      if (el1) makeOverlayLink("ul_sponsor_click_1", el1.getBoundingClientRect(), link);
      if (el2) makeOverlayLink("ul_sponsor_click_2", el2.getBoundingClientRect(), link);
    };

    update();

    // throttled resize/scroll
    let raf = 0;
    const onMove = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove, { passive: true });

    // Webflow images/layout may settle late
    setTimeout(update, 300);
    setTimeout(update, 900);
    setTimeout(update, 1600);
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

    window.SPONSORED_ACTIVE = true;

    const sponsor = data.sponsor || {};
    const link = String(sponsor.link || "").trim();

    const urlLandscape = String(sponsor.logo_2 || "").trim();
    const urlSquare    = String(sponsor.logo_1 || "").trim();

    const target1 = urlLandscape || urlSquare;
    const target2 = urlSquare || urlLandscape;

    if (el1 && target1) setImgHard(el1, target1);
    if (el2 && target2) setImgHard(el2, target2);

    emitSponsorReady(true, data);

    if (el1 && target1) guardReapply(el1, target1, GUARD_MS);
    if (el2 && target2) guardReapply(el2, target2, GUARD_MS);

    // ✅ CLICK GUARANTEE
    if (link) positionOverlays(el1, el2, link);
  })();

})();
