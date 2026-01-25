/* metier-page.v2026-01-25.FINAL.BANNER.BEFOREFAQ.PATCH2.js
   ULYDIA — Duplicate ONLY the wide banner (Banner 1 image) just before FAQ
   + Fix sponsor click link on original + duplicated banner

   Uses your current DOM:
   - FAQ wrapper id: "ul-cms-source"
   - Top banner anchor id expected: "sponsor-banner-link"
*/
(() => {
  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH2__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[banner.beforefaq.patch2]", ...a);

  const FAQ_ID = "ul-cms-source";
  const TOP_BANNER_ANCHOR_ID = "sponsor-banner-link";
  const DUP_ATTR = "data-ulydia-banner-dup";

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

    const top = q(TOP_BANNER_ANCHOR_ID);
    const href = top ? top.getAttribute("href") : "";
    if (isValidLink(href)) return href.trim();
    return "";
  }

  function setAnchorLink(a, href){
    if (!a || !href) return false;
    if (a.tagName && a.tagName.toLowerCase() === "a") {
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.style.cursor = "pointer";
      return true;
    }
    return false;
  }

  function looksLikeWideBannerImg(img){
    if (!img) return false;
    const w = Number(img.naturalWidth || img.width || 0);
    const h = Number(img.naturalHeight || img.height || 0);
    if (w && h && (w / h) >= 2.6) return true;
    const alt = (img.getAttribute("alt")||"").toLowerCase();
    if (alt.includes("sponsor") || alt.includes("banni") || alt.includes("banner")) return true;
    return false;
  }

  function findTopBannerAnchor(){
    const byId = q(TOP_BANNER_ANCHOR_ID);
    if (byId && byId.querySelector("img")) return byId;

    const anchors = qsa("a").filter(a => a.querySelector("img"));
    for (const a of anchors) {
      const img = a.querySelector("img");
      if (looksLikeWideBannerImg(img)) return a;
    }
    return null;
  }

  function buildDupContainer(clonedAnchor){
    const wrap = document.createElement("div");
    wrap.setAttribute(DUP_ATTR, "1");
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    wrap.style.margin = "18px 0 12px 0";

    if (clonedAnchor.getAttribute("id")) clonedAnchor.removeAttribute("id");
    qsa("[id]", clonedAnchor).forEach(n => n.removeAttribute("id"));

    clonedAnchor.style.display = "block";
    const img = clonedAnchor.querySelector("img");
    if (img) {
      img.style.maxWidth = "680px";
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "12px";
    }
    wrap.appendChild(clonedAnchor);
    return wrap;
  }

  function insertBeforeFAQ(){
    const faq = q(FAQ_ID);
    if (!faq || !faq.parentNode) return { ok:false, reason:`FAQ wrapper #${FAQ_ID} not found` };

    const already = qs(`[${DUP_ATTR}="1"]`);
    if (already) return { ok:true, skipped:true, reason:"already inserted" };

    const topA = findTopBannerAnchor();
    if (!topA) return { ok:false, reason:"top banner anchor not found" };

    const clonedA = topA.cloneNode(true);

    const href = getSponsorLink();
    if (href) {
      setAnchorLink(topA, href);
      setAnchorLink(clonedA, href);
    }

    const wrap = buildDupContainer(clonedA);
    faq.parentNode.insertBefore(wrap, faq);

    return { ok:true, href: href || "", used: topA.id ? `#${topA.id}` : "heuristic" };
  }

  function run(){
    const res = insertBeforeFAQ();
    log("run", res);
  }

  function onReady(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 120);
        setTimeout(run, 450);
      });
      return;
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 12) clearInterval(t);
    }, 300);
  }

  onReady();
})();
