(function(){
  // =========================================================
  // ULYDIA — BANNER BEFORE FAQ — I18N PATCH6.8 (robust anti-duplicate)
  //
  // Goal:
  // - Ensure exactly ONE "before FAQ" banner exists BETWEEN cards (outside FAQ card)
  // - Remove ANY banner that appears INSIDE the FAQ card/container (even if re-injected later)
  //
  // Notes:
  // - You MUST remove the legacy banner script (PATCH5) from Webflow Body.
  // - This patch additionally protects against late injections from any script.
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH68__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH68__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function findFaqCard(){
    // Best effort: the card that contains the FAQ header area
    var title = document.querySelector("#faq-title, [data-ul-faq-title], .js-faq-title");
    if (title){
      // ascend to nearest "card"
      var p = title;
      for (var i=0;i<12;i++){
        if (!p || !p.parentElement) break;
        if (p.classList && (p.classList.contains("u-card") || p.classList.contains("ul-card") || p.classList.contains("ul-section-card"))) return p;
        p = p.parentElement;
      }
      // fallback: use closest section/div
      return title.closest("section, .w-richtext, .w-dyn-item, .w-dyn-list, div") || null;
    }
    // Fallback: find by FAQ heading text (all langs)
    var heads = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,div,span"));
    var h = heads.find(function(el){
      var t = norm(el.textContent).toLowerCase();
      return t === "questions fréquentes" || t === "frequently asked questions" || t === "domande frequenti" || t === "preguntas frecuentes" || t === "häufige fragen";
    });
    if (h) return h.closest("section, .u-card, .ul-card, div") || null;
    return null;
  }

  function getFirstWideBanner(){
    // The "first wide banner" on the page (top sponsor banner)
    // Prefer image inside an anchor/button that looks like sponsor banner.
    var img = document.querySelector("img[data-ulydia-banner], img.ul-banner-img, img[alt*='sponsor' i]") ||
              document.querySelector("img[src*='website-files.com']") ||
              document.querySelector("img");
    if (!img) return null;
    // Find its clickable wrapper if any
    var a = img.closest("a");
    return { img: img, a: a };
  }

  function ensureBetweenCards(){
    var faqCard = findFaqCard();
    if (!faqCard) return false;

    // Remove any existing "between" banner clones we created earlier (to avoid duplicates)
    document.querySelectorAll("[data-ulydia-beforefaq-banner='1']").forEach(function(n){ n.remove(); });

    // Create a banner element identical to the first wide banner (image + link)
    var first = getFirstWideBanner();
    if (!first || !first.img) return false;

    var wrap = document.createElement("div");
    wrap.setAttribute("data-ulydia-beforefaq-banner","1");
    wrap.style.margin = "22px 0"; // spacing between last left card and FAQ card
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";

    var img = document.createElement("img");
    img.src = first.img.currentSrc || first.img.src;
    img.alt = first.img.alt || "Sponsor";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.borderRadius = "18px";
    img.style.display = "block";

    // Click behavior: use the SAME href as the top banner if available,
    // else let other scripts attach click on image parent later.
    if (first.a && first.a.href){
      var a = document.createElement("a");
      a.href = first.a.href;
      a.target = first.a.target || "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "inline-block";
      a.appendChild(img);
      wrap.appendChild(a);
    } else {
      wrap.appendChild(img);
    }

    // Insert BEFORE the FAQ card (outside)
    faqCard.parentNode.insertBefore(wrap, faqCard);

    return true;
  }

  function removeInsideFaq(){
    var faqCard = findFaqCard();
    if (!faqCard) return false;

    // Remove ANY banner-like images inside FAQ card
    var imgs = Array.prototype.slice.call(faqCard.querySelectorAll("img"));
    imgs.forEach(function(im){
      var src = String(im.currentSrc || im.src || "");
      var alt = String(im.alt || "");
      // Heuristics: sponsor visuals are large website-files banners and/or "sponsoriser"
      if (src.includes("website-files.com") || /sponsor/i.test(alt)){
        // If the image is within our between-cards banner wrapper, keep it
        if (im.closest("[data-ulydia-beforefaq-banner='1']")) return;
        // Otherwise remove the closest banner wrapper or the image itself
        var kill = im.closest("[data-ulydia-banner], .ul-sponsor-banner, .ul-banner, a, div") || im;
        try{ kill.remove(); }catch(e){}
      }
    });

    return true;
  }

  function cleanupAll(){
    // Ensure exactly one between cards
    ensureBetweenCards();
    // Kill any inside FAQ (now + later)
    removeInsideFaq();
  }

  function boot(){
    cleanupAll();

    // Retry while page builds
    var n = 0;
    (function loop(){
      n++;
      cleanupAll();
      if (n < 80) setTimeout(loop, 200); // ~16s
    })();

    // Observe for late injections inside FAQ
    try{
      var mo = new MutationObserver(function(muts){
        // any DOM changes near FAQ => cleanup
        cleanupAll();
      });
      mo.observe(document.body || document.documentElement, {subtree:true, childList:true});
    }catch(e){}
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
  window.addEventListener("ULYDIA:I18N_UPDATE", cleanupAll);

})();