/* metier-page.js — Ulydia (PROD v4)
   - No flash: hides banners until sponsor verdict
   - Fetch sponsor verdict (POST /sponsor-info)
   - If sponsored: set both banners (logo_2 -> banner1, logo_1 -> banner2) + click link
   - If sponsor.link missing: fallback to /sponsor?metier=...&country=...
   - Emits uydia:sponsor-ready + sets SPONSORED_ACTIVE early
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_PROD_V4__) return;
  window.__ULYDIA_METIER_PAGE_PROD_V4__ = true;

  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const ENDPOINT     = "/sponsor-info";

  const BANNER_1_ID  = "nonSponsorBanner01"; // landscape slot
  const BANNER_2_ID  = "nonSponsorBanner02"; // square slot

  // Hide banners until verdict (prevents non-sponsor flash)
  const HIDE_CLASS = "ulydia-sponsor-loading";

  function apiBase(){ return String(WORKER_URL || "").replace(/\/$/, ""); }
  function $(id){ return document.getElementById(id); }

  function qp(name){ return new URLSearchParams(location.search).get(name); }

  function getMetier(){
    return (
      document.querySelector("[data-metier]")?.getAttribute("data-metier") ||
      document.getElementById("metier-slug")?.textContent?.trim() ||
      qp("metier")?.trim() ||
      location.pathname.split("/").filter(Boolean).pop() ||
      ""
    );
  }

  function getCountry(){
    return String(
      window.VISITOR_COUNTRY ||
      qp("country") ||
      "FR"
    ).toUpperCase();
  }

  function sponsorFallbackUrl(metier, country){
    return `/sponsor?metier=${encodeURIComponent(metier)}&country=${encodeURIComponent(country)}`;
  }

  function installHideStyle(){
    if (document.getElementById("ul_sponsor_hide_css")) return;
    const s = document.createElement("style");
    s.id = "ul_sponsor_hide_css";
    s.textContent = `
      html.${HIDE_CLASS} #${BANNER_1_ID},
      html.${HIDE_CLASS} #${BANNER_2_ID}{
        visibility:hidden !important;
        opacity:0 !important;
      }
    `;
    document.head.appendChild(s);
  }

  function setLoading(on){
    try{
      installHideStyle();
      if (on) document.documentElement.classList.add(HIDE_CLASS);
      else document.documentElement.classList.remove(HIDE_CLASS);
    }catch(e){}
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

  // Click guarantee via overlay <a> above banners
  function ensureOverlayLayer(){
    let c = document.getElementById("ul_sponsor_overlay_layer");
    if (c) return c;
    c = document.createElement("div");
    c.id = "ul_sponsor_overlay_layer";
    c.style.position = "fixed";
    c.style.left = "0";
    c.style.top = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.zIndex = "2147483647";
    c.style.pointerEvents = "none";
    c.style.background = "transparent";
    document.body.appendChild(c);
    return c;
  }

  function placeOverlay(id, rect, url){
    const layer = ensureOverlayLayer();
    let a = document.getElementById(id);
    if (!a){
      a = document.createElement("a");
      a.id = id;
      a.style.position = "absolute";
      a.style.display = "block";
      a.style.pointerEvents = "auto";
      a.style.background = "transparent";
      a.style.cursor = "pointer";
      layer.appendChild(a);
    }
    a.setAttribute("href", url);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");

    a.style.left = Math.max(0, rect.left) + "px";
    a.style.top = Math.max(0, rect.top) + "px";
    a.style.width = Math.max(0, rect.width) + "px";
    a.style.height = Math.max(0, rect.height) + "px";

    const active = rect.width > 5 && rect.height > 5;
    a.style.pointerEvents = active ? "auto" : "none";
  }

  function bindOverlays(el1, el2, url){
    if (!url) return;

    const update = () => {
      if (el1) placeOverlay("ul_sponsor_click_1", el1.getBoundingClientRect(), url);
      if (el2) placeOverlay("ul_sponsor_click_2", el2.getBoundingClientRect(), url);
    };

    update();

    let raf = 0;
    const onMove = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; update(); });
    };

    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove, { passive: true });

    setTimeout(update, 250);
    setTimeout(update, 800);
    setTimeout(update, 1600);
  }

  function emitSponsorReady(sponsored, payload){
    try{
      window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
        detail: { sponsored: !!sponsored, payload: payload || null }
      }));
    }catch(e){}
  }

  async function fetchSponsorInfo(metier, country, lang){
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
    // Mark page as sponsor-aware for other scripts
    window.__ULYDIA_PAGE_SPONSOR_SCRIPT__ = true;

    const el1 = $(BANNER_1_ID);
    const el2 = $(BANNER_2_ID);

    // If banners not present, nothing to do
    if (!el1 && !el2) return;

    // Hide banners immediately to prevent flash
    setLoading(true);

    const metier = getMetier();
    const country = getCountry();
    const lang = String(window.VISITOR_LANG || qp("lang") || "en").toLowerCase().split("-")[0];

    if (!metier || !country) {
      window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored: false };
      window.SPONSORED_ACTIVE = false;
      emitSponsorReady(false, { error: "missing_metier_or_country" });
      setLoading(false);
      return;
    }

    const data = await fetchSponsorInfo(metier, country, lang);

    // If worker failed, fall back to non-sponsored behavior (let footer handle)
    if (!data) {
      window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored: false };
      window.SPONSORED_ACTIVE = false;
      emitSponsorReady(false, { error: "worker_no_data" });
      setLoading(false);
      return;
    }

    const sponsored = !!data.sponsored;
    window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored };

    if (!sponsored) {
      window.SPONSORED_ACTIVE = false;
      emitSponsorReady(false, data);
      // show banners back (footer will put translated non-sponsor)
      setLoading(false);
      return;
    }

    // Sponsored: set flag early
    window.SPONSORED_ACTIVE = true;

    const sponsor = data.sponsor || {};
    const urlLandscape = String(sponsor.logo_2 || "").trim();
    const urlSquare    = String(sponsor.logo_1 || "").trim();

    const target1 = urlLandscape || urlSquare;
    const target2 = urlSquare || urlLandscape;

    if (el1 && target1) setImgHard(el1, target1);
    if (el2 && target2) setImgHard(el2, target2);

    // Link: sponsor.link OR fallback to /sponsor?metier&country
    const sponsorLink = String(sponsor.link || "").trim();
    const clickUrl = sponsorLink || sponsorFallbackUrl(metier, country);

    // Click overlays above banners (guaranteed)
    bindOverlays(el1, el2, clickUrl);

    emitSponsorReady(true, data);

    // Finally show banners
    setLoading(false);
  })();

})();
