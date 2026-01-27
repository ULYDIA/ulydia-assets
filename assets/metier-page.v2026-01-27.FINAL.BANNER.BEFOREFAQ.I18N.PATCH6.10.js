/* =========================================================
   ULYDIA — Banner BEFORE FAQ (between Work env & FAQ) — I18N — PATCH6.10
   Goal:
   - Ensure EXACTLY ONE banner is displayed between the last left block (ex: Work environments)
     and the FAQ card.
   - The banner MUST be identical to the "main" wide banner (sponsor or non-sponsor depending on country/lang).
   - Remove any banner that ended up INSIDE the FAQ container (duplicate / wrong placement).
   - Safe, no page crash (all guarded, retry loop).
========================================================= */
(function(){
  "use strict";

  var DEBUG = false;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, ["[PATCH6.10]"].concat([].slice.call(arguments))); }

  function once(fn){
    var done = false;
    return function(){
      if (done) return;
      done = true;
      try { fn(); } catch(e) { /* ignore */ }
    };
  }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function qs(sel, root){ try{ return (root||document).querySelector(sel);}catch(e){ return null; } }
  function qsa(sel, root){ try{ return Array.prototype.slice.call((root||document).querySelectorAll(sel)||[]);}catch(e){ return []; } }

  function ensureAnchor(a){
    if (!a) return;
    try{
      if (!a.getAttribute("target")) a.setAttribute("target","_blank");
      if (!a.getAttribute("rel")) a.setAttribute("rel","noopener");
      a.style.cursor = "pointer";
      a.style.pointerEvents = "auto";
    }catch(e){}
  }

  function findSourceBanner(){
    // Try to find the MAIN wide banner already rendered by BASE (sponsor/non-sponsor)
    var candidates = [
      '[data-ul-banner="wide"]',
      '#ul-banner-wide',
      '#ulydia-banner-wide',
      '#ulydia-banner-1',
      '#ul-sponsor-banner-1',
      '[data-ul-banner="banner_1"]',
      '[data-banner="wide"]'
    ];
    for (var i=0;i<candidates.length;i++){
      var el = qs(candidates[i]);
      if (el) {
        var a = (String(el.tagName||"").toUpperCase()==="A") ? el : (el.closest && el.closest("a"));
        if (a) return a;
        return el;
      }
    }
    var any = qs('a[data-ul-banner], a#ul-sponsor-wide, a[href*="sponsor"], a[href*="utm_"]');
    return any || null;
  }

  function findFaqTitle(){
    var el = qs("#faq-title");
    if (el) return el;

    var els = qsa(".js-faq-title, .ul-faq-title, [data-ul-faq-title]");
    if (els[0]) return els[0];

    var wanted = [
      "questions fréquentes","faq",
      "frequently asked questions",
      "preguntas frecuentes",
      "domande frequenti",
      "häufig gestellte fragen"
    ];
    var heads = qsa("h1,h2,h3,h4,h5,div,span");
    for (var i=0;i<heads.length;i++){
      var t = norm(heads[i].textContent||"").toLowerCase();
      if (!t) continue;
      for (var j=0;j<wanted.length;j++){
        if (t === wanted[j]) return heads[i];
      }
    }
    return null;
  }

  function findFaqCard(){
    var title = findFaqTitle();
    if (!title) return null;

    var el = title;
    for (var i=0;i<6;i++){
      if (!el || !el.parentElement) break;
      var cls = String(el.className||"");
      if (/\b(ul-card|u-card|card)\b/i.test(cls)) return el;
      if (qs(".ul-faq-item, [data-ul-faq-item], .js-faq-item", el)) return el;
      el = el.parentElement;
    }
    return title.closest ? (title.closest("section") || title.closest("div")) : title.parentElement;
  }

  function removeDuplicatesEverywhere(){
    qsa("#ul-beforefaq-banner, #ul-beforefaq-banner-2, [data-ul-beforefaq-banner]").forEach(function(x){
      try{ x.remove(); }catch(e){}
    });

    var faqCard = findFaqCard();
    if (faqCard){
      qsa("#ul-beforefaq-banner, #ul-beforefaq-banner-2, [data-ul-beforefaq-banner]", faqCard).forEach(function(x){
        try{ x.remove(); }catch(e){}
      });
      qsa('[data-ul-banner="wide-clone"]', faqCard).forEach(function(x){
        try{ x.remove(); }catch(e){}
      });
    }
  }

  function buildBannerClone(source){
    if (!source) return null;

    var node;
    try{ node = source.cloneNode(true); }catch(e){ node = null; }
    if (!node) return null;

    try{
      node.id = "ul-beforefaq-banner";
      node.setAttribute("data-ul-beforefaq-banner","1");
      node.setAttribute("data-ul-banner","wide-clone");
    }catch(e){}

    try{
      qsa("[id]", node).forEach(function(el){
        if (el === node) return;
        el.removeAttribute("id");
      });
    }catch(e){}

    try{
      node.style.display = "";
      node.style.marginTop = "18px";
      node.style.marginBottom = "24px";
      node.style.width = "100%";
    }catch(e){}

    var a = (String(node.tagName||"").toUpperCase()==="A") ? node : (node.querySelector ? node.querySelector("a") : null);
    if (a) ensureAnchor(a);
    else if (String(node.tagName||"").toUpperCase()==="A") ensureAnchor(node);

    return node;
  }

  function insertBetweenEnvAndFaq(){
    removeDuplicatesEverywhere();

    var source = findSourceBanner();
    if (!source) { log("No source banner found yet"); return false; }

    var faqCard = findFaqCard();
    if (!faqCard || !faqCard.parentElement) { log("No FAQ card yet"); return false; }

    var parent = faqCard.parentElement;

    var clone = buildBannerClone(source);
    if (!clone) return false;

    try{
      parent.insertBefore(clone, faqCard);
      log("Inserted banner clone before FAQ");
      return true;
    }catch(e){
      log("Insert failed", e);
      return false;
    }
  }

  var start = Date.now();
  (function tick(){
    var ok = false;
    try{ ok = insertBetweenEnvAndFaq(); }catch(e){ ok = false; }
    if (ok) return;
    if ((Date.now() - start) > 25000) return;
    setTimeout(tick, 200);
  })();

  var rerun = once(function(){
    setTimeout(function(){ try{ insertBetweenEnvAndFaq(); }catch(e){} }, 50);
    setTimeout(function(){ try{ insertBetweenEnvAndFaq(); }catch(e){} }, 400);
  });

  window.addEventListener("ULYDIA:I18N_UPDATE", rerun);
  window.addEventListener("ULYDIA:RENDER_DONE", rerun);
  window.addEventListener("hashchange", rerun);
  window.addEventListener("popstate", rerun);
})();
