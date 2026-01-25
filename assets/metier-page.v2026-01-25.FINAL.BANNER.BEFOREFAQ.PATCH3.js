/* metier-page.v2026-01-25.FINAL.BANNER.BEFOREFAQ.PATCH3.js
   ULYDIA — Insert ONLY the wide banner image just before FAQ (robust anchors)
   + Fix sponsor link on original + duplicate

   Your anchors:
   - FAQ wrapper id usually: "ul-cms-source" (but we also search "Questions fréquentes")
   - Top banner anchor expected: "sponsor-banner-link" (fallback to first wide img anchor)

   Fix: previous patch didn't insert for some pages (anchor mismatch / timing).
*/
(() => {
  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH3__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH3__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[banner.beforefaq.patch3]", ...a);

  const DUP_ID = "ulydia-banner-beforefaq";
  const TOP_ID = "sponsor-banner-link";

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
    if (a.tagName && a.tagName.toLowerCase() === "a") {
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

  function findFaqAnchor(){
    // 1) explicit id if present
    const w1 = q("ul-cms-source");
    if (w1) return w1;

    // 2) element with text 'Questions fréquentes'
    const candidates = qsa("h1,h2,h3,div,section");
    const hit = candidates.find(el => (el.textContent||"").toLowerCase().includes("questions fréquentes"));
    if (hit) {
      // try closest card/container
      const card = hit.closest ? hit.closest(".card") : null;
      return card || hit;
    }

    // 3) fallback: first .faq-item
    const fi = qs(".faq-item");
    if (fi) return fi;

    return null;
  }

  function buildWrap(clonedA){
    const wrap = document.createElement("div");
    wrap.id = DUP_ID;
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    wrap.style.margin = "18px 0 12px 0";

    // remove any ids inside clone
    if (clonedA.getAttribute("id")) clonedA.removeAttribute("id");
    qsa("[id]", clonedA).forEach(n => n.removeAttribute("id"));

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

  function insert(){
    // already inserted?
    if (q(DUP_ID)) return { ok:true, skipped:true, reason:"already inserted" };

    const faq = findFaqAnchor();
    if (!faq || !faq.parentNode) return { ok:false, reason:"faq anchor not found" };

    const topA = findTopAnchor();
    if (!topA) return { ok:false, reason:"top banner anchor not found" };

    const href = getSponsorLink();
    if (href) setAnchorLink(topA, href);

    const clonedA = topA.cloneNode(true);
    if (href) setAnchorLink(clonedA, href);

    const wrap = buildWrap(clonedA);
    faq.parentNode.insertBefore(wrap, faq);

    return { ok:true, href: href || "", insertedBefore: faq.id ? `#${faq.id}` : faq.className || faq.tagName };
  }

  function run(){
    const res = insert();
    log("run", res);
  }

  function onReady(){
    run();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(run, 120);
        setTimeout(run, 420);
        setTimeout(run, 900);
      });
      return;
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 15) clearInterval(t);
    }, 300);
  }
  onReady();
})();