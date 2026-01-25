/* metier-page.v2026-01-25.FINAL.BANNER.DUPLICATE.PATCH1.js
   ULYDIA — Duplicate the wide sponsor/non-sponsor banner (Banner 1) just before FAQ
   + Fix sponsor click link (banner + sidebar + CTA + duplicated banner)

   Assumptions (based on BASE):
   - Top wide banner anchor has id="sponsor-banner-link"
   - Optional sidebar logo anchor id="sponsor-logo-link"
   - Optional CTA anchor/button id="sponsor-cta"
   - FAQ title element exists with id="faq-title" (in BASE template)
   - If not found, we fallback to inserting before first ".faq-item" or before any element containing "Questions fréquentes"

   What it does:
   ✅ Reads sponsor link from ctx/config (robust)
   ✅ Sets href/target on banner + logo + CTA
   ✅ Clones the TOP wide banner container and inserts it before FAQ card
*/
(() => {
  if (window.__ULYDIA_BANNER_DUP_PATCH1__) return;
  window.__ULYDIA_BANNER_DUP_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[banner.dup.patch1]", ...a);

  function q(id){ return document.getElementById(id); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function isValidLink(h){
    h = String(h||"").trim();
    if (!h || h === "#" ) return false;
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
      window.__ULYDIA_SPONSOR_INFO__?.lien_sponsor,
      window.__ULYDIA_BLOC__?.lien_sponsor
    ].filter(Boolean).map(String);

    for (const c of candidates) if (isValidLink(c)) return c.trim();

    // fallback to existing href if already set
    const top = q("sponsor-banner-link");
    if (top && isValidLink(top.getAttribute("href"))) return top.getAttribute("href");
    return "";
  }

  function makeClickable(el, href){
    if (!el || !href) return false;

    // support <a>, <button>, or any element
    if (el.tagName && el.tagName.toLowerCase() === "a") {
      el.setAttribute("href", href);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    } else {
      el.style.cursor = "pointer";
      el.onclick = () => window.open(href, "_blank", "noopener");
      el.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.open(href, "_blank", "noopener"); }
      };
      el.setAttribute("role", "link");
      el.setAttribute("tabindex", "0");
    }
    return true;
  }

  function findFaqAnchor(){
    // Preferred: #faq-title then closest .card
    const title = q("faq-title");
    if (title) {
      const card = title.closest ? title.closest(".card") : null;
      return card || title;
    }
    // fallback: first faq item
    const fi = qs(".faq-item");
    if (fi) return fi;
    // fallback: element containing 'Questions fréquentes'
    const all = Array.from(document.querySelectorAll("h1,h2,h3,div"));
    const hit = all.find(x => (x.textContent||"").toLowerCase().includes("questions fréquentes"));
    if (hit) return hit;
    return null;
  }

  function duplicateBannerBeforeFAQ(){
    const topLink = q("sponsor-banner-link");
    if (!topLink) return { ok:false, reason:"no top banner link id=sponsor-banner-link" };

    // clone the wrapper container if possible (the <a> is inside a flex justify-center div in BASE)
    const wrapper = topLink.parentElement && topLink.parentElement.tagName ? topLink.parentElement : topLink;
    const container = wrapper && wrapper.parentElement ? wrapper.parentElement : wrapper;

    const clone = container.cloneNode(true);

    // ensure duplicate ids are removed/changed to avoid collisions
    const ids = clone.querySelectorAll("[id]");
    ids.forEach(n => {
      const id = n.getAttribute("id");
      if (!id) return;
      // keep only sponsor-banner-link id? no: must be unique
      n.setAttribute("id", id + "--dup1");
    });

    // Add a small margin-top to separate from content
    clone.style.marginTop = "24px";
    clone.style.marginBottom = "8px";

    const faqAnchor = findFaqAnchor();
    if (!faqAnchor || !faqAnchor.parentNode) return { ok:false, reason:"no faq anchor found" };

    faqAnchor.parentNode.insertBefore(clone, faqAnchor);
    return { ok:true };
  }

  function fixSponsorLinks(){
    const href = getSponsorLink();
    if (!href) return { ok:false, reason:"no sponsor link found in ctx/config" };

    const els = [
      q("sponsor-banner-link"),
      q("sponsor-logo-link"),
      q("sponsor-cta"),
      q("sponsor-banner-link--dup1"),
      q("sponsor-logo-link--dup1"),
      q("sponsor-cta--dup1")
    ].filter(Boolean);

    let count = 0;
    els.forEach(el => { if (makeClickable(el, href)) count++; });
    return { ok:true, href, count };
  }

  function run(){
    const dup = duplicateBannerBeforeFAQ();
    const fix = fixSponsorLinks();
    log("run", { dup, fix });
  }

  function onReady(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 80);
        setTimeout(run, 350);
      });
      return;
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 15) clearInterval(t);
    }, 250);
  }

  onReady();
})();
