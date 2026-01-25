/* metier-page.v2026-01-25.FINAL.BANNER.BEFOREFAQ.PATCH4.js
   ULYDIA — Place Banner 1 (wide) JUST BEFORE the visible FAQ block ("Questions fréquentes")
   - Removes previous misplaced injected banner (ulydia-banner-beforefaq)
   - Clones ONLY the <a> + <img> of the top wide banner
   - Fixes sponsor link on original + duplicate

   This version does NOT use #ul-cms-source (often hidden / moved),
   it anchors on the VISIBLE FAQ heading text.
*/
(() => {
  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH4__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH4__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[banner.beforefaq.patch4]", ...a);

  const TOP_ID = "sponsor-banner-link";
  const DUP_ID = "ulydia-banner-beforefaq"; // keep same id so older inserts are removed/replaced

  function q(id){ return document.getElementById(id); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

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

    const top = q(TOP_ID);
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
    if (w && h && (w/h) >= 2.3) return true;
    const alt = (img.getAttribute("alt")||"").toLowerCase();
    if (alt.includes("sponsor") || alt.includes("banni") || alt.includes("banner")) return true;
    return false;
  }

  function findTopAnchor(){
    const byId = q(TOP_ID);
    if (byId && byId.querySelector("img")) return byId;

    const anchors = qsa("a").filter(a => a.querySelector("img"));
    for (const a of anchors) {
      const img = a.querySelector("img");
      if (looksWide(img)) return a;
    }
    return null;
  }

  function normalizeText(s){
    return String(s||"")
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();
  }

  function findFaqHeading(){
    // Prefer headings
    const nodes = qsa("h1,h2,h3");
    const hit = nodes.find(n => normalizeText(n.textContent).includes("questions fréquentes"));
    if (hit) return hit;

    // Fallback any element with that text
    const any = qsa("div,section,span,p,strong");
    return any.find(n => normalizeText(n.textContent).includes("questions fréquentes")) || null;
  }

  function findInsertionAnchor(){
    const h = findFaqHeading();
    if (!h) return null;
    // Insert before the whole FAQ block container if possible
    return h.closest("section,div") || h;
  }

  function buildWrap(clonedA){
    const wrap = document.createElement("div");
    wrap.id = DUP_ID;
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    wrap.style.margin = "20px 0 14px 0";

    // scrub ids
    if (clonedA.getAttribute("id")) clonedA.removeAttribute("id");
    qsa("[id]", clonedA).forEach(n => n.removeAttribute("id"));

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

  function removeOld(){
    const old = q(DUP_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function insert(){
    removeOld();

    const anchor = findInsertionAnchor();
    if (!anchor || !anchor.parentNode) return { ok:false, reason:"visible FAQ anchor not found" };

    const topA = findTopAnchor();
    if (!topA) return { ok:false, reason:"top wide banner not found" };

    const href = getSponsorLink();
    if (href) setAnchorLink(topA, href);

    const clonedA = topA.cloneNode(true);
    if (href) setAnchorLink(clonedA, href);

    const wrap = buildWrap(clonedA);
    anchor.parentNode.insertBefore(wrap, anchor);

    return { ok:true, href: href || "", before: (anchor.tagName||"").toLowerCase() };
  }

  function run(){
    const res = insert();
    log("run", res);
  }

  // Retry because FAQ might render late
  function boot(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 120);
        setTimeout(run, 420);
        setTimeout(run, 900);
      });
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 20) clearInterval(t);
    }, 300);
  }
  boot();
})();