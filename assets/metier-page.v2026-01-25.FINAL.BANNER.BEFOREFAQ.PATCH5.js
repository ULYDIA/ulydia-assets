/* metier-page.v2026-01-25.FINAL.BANNER.BEFOREFAQ.PATCH5.js
   ULYDIA — Duplicate the TOP wide banner JUST BEFORE the VISIBLE FAQ heading,
   WITHOUT flicker (no repeated remove/insert loops).

   Key changes vs PATCH4:
   - Only inserts once when anchor exists
   - No interval that keeps reinserting (reduces blinking)
   - Uses a MutationObserver to wait for FAQ render, then disconnects
   - Updates sponsor link once

   Inserts <div id="ulydia-banner-beforefaq"> containing ONLY <a><img>
*/
(() => {
  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH5__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH5__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[banner.beforefaq.patch5]", ...a);

  const TOP_ID = "sponsor-banner-link";
  const DUP_ID = "ulydia-banner-beforefaq";

  const norm = (s) => String(s||"").replace(/\s+/g," ").trim().toLowerCase();

  function isValidLink(h){
    h = String(h||"").trim();
    if (!h || h === "#") return false;
    if (/^javascript:/i.test(h)) return false;
    return true;
  }

  function getSponsorLink(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__ || {};
    const candidates = [
      ctx?.sponsor?.lien_sponsor,
      ctx?.sponsor?.link,
      ctx?.sponsor_link,
      ctx?.sponsorLink,
      ctx?.data?.sponsor?.lien_sponsor,
      window.__ULYDIA_SPONSOR_INFO__?.sponsor?.lien_sponsor,
      window.__ULYDIA_SPONSOR_INFO__?.lien_sponsor
    ].filter(Boolean).map(String);

    for (const c of candidates) if (isValidLink(c)) return c.trim();

    const top = document.getElementById(TOP_ID);
    const href = top ? top.getAttribute("href") : "";
    if (isValidLink(href)) return href.trim();
    return "";
  }

  function setAnchorLink(a, href){
    if (!a || !href) return false;
    if ((a.tagName||"").toLowerCase() === "a") {
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.style.cursor = "pointer";
      return true;
    }
    return false;
  }

  function looksWide(img){
    if (!img) return false;
    const w = Number(img.naturalWidth || img.width || 0);
    const h = Number(img.naturalHeight || img.height || 0);
    if (w && h && (w/h) >= 2.2) return true;
    const alt = (img.getAttribute("alt")||"").toLowerCase();
    return alt.includes("sponsor") || alt.includes("banni") || alt.includes("banner");
  }

  function findTopAnchor(){
    const byId = document.getElementById(TOP_ID);
    if (byId && byId.querySelector("img")) return byId;

    const anchors = Array.from(document.querySelectorAll("a")).filter(a => a.querySelector("img"));
    for (const a of anchors) {
      const img = a.querySelector("img");
      if (looksWide(img)) return a;
    }
    return null;
  }

  function findFaqHeading(){
    const h = Array.from(document.querySelectorAll("h1,h2,h3"))
      .find(n => norm(n.textContent).includes("questions fréquentes"));
    if (h) return h;
    return Array.from(document.querySelectorAll("div,section,span,p,strong"))
      .find(n => norm(n.textContent).includes("questions fréquentes")) || null;
  }

  function insertionAnchor(){
    const h = findFaqHeading();
    if (!h) return null;
    return h.closest("section,div") || h;
  }

  function alreadyCorrectlyPlaced(anchor){
    const dup = document.getElementById(DUP_ID);
    if (!dup) return false;
    // must be just before anchor in DOM (sibling or within same parent before)
    const parent = anchor.parentNode;
    if (!parent) return false;
    return dup.parentNode === parent && dup.nextElementSibling === anchor;
  }

  function buildWrap(clonedA){
    const wrap = document.createElement("div");
    wrap.id = DUP_ID;
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    wrap.style.margin = "20px 0 14px 0";

    if (clonedA.getAttribute("id")) clonedA.removeAttribute("id");
    clonedA.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));

    clonedA.style.display = "block";
    const img = clonedA.querySelector("img");
    if (img) {
      img.style.maxWidth = "680px";
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "12px";
      img.style.display = "block";
    }

    wrap.appendChild(clonedA);
    return wrap;
  }

  function insertOnce(){
    const anchor = insertionAnchor();
    if (!anchor || !anchor.parentNode) return {ok:false, reason:"no faq anchor yet"};

    if (alreadyCorrectlyPlaced(anchor)) return {ok:true, already:true};

    const topA = findTopAnchor();
    if (!topA) return {ok:false, reason:"no top banner anchor"};

    const href = getSponsorLink();
    if (href) setAnchorLink(topA, href);

    // remove previous dup (misplaced)
    const old = document.getElementById(DUP_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);

    const clonedA = topA.cloneNode(true);
    if (href) setAnchorLink(clonedA, href);

    const wrap = buildWrap(clonedA);
    anchor.parentNode.insertBefore(wrap, anchor);

    return {ok:true, inserted:true, href:href||""};
  }

  function boot(){
    // Try a couple times (no flicker): at most 3 attempts + observer
    let attempts = 0;
    const tryNow = () => {
      attempts++;
      const res = insertOnce();
      log("attempt", attempts, res);
      return res.ok;
    };

    if (tryNow()) return;

    setTimeout(() => { if (!tryNow()) setTimeout(tryNow, 350); }, 180);

    // Observer to catch late FAQ render
    const obs = new MutationObserver(() => {
      const ok = insertOnce().ok;
      if (ok) {
        obs.disconnect();
        log("observer: inserted, disconnected");
      }
    });
    obs.observe(document.documentElement, {childList:true, subtree:true});
  }

  boot();
})();