(function(){
  "use strict";
  // =========================================================
  // ULYDIA — I18N TEXT-ONLY PATCH2 (NO FLICKER)
  // 2026-01-28
  //
  // Adds missing UI translations (badge, CTA, right-column titles)
  // while keeping the "text-only" guarantee (no DOM rebuild).
  //
  // How it works:
  // - Exact/normalized match on short UI labels (<= 60 chars)
  // - Idempotent per element + per language
  // - Short-lived MutationObserver to catch late inserts
  // =========================================================

  if (window.__ULYDIA_I18N_TEXTONLY_PATCH2__) return;
  window.__ULYDIA_I18N_TEXTONLY_PATCH2__ = true;

  function norm(s){
    return String(s||"")
      .replace(/\u00A0/g," ")
      .replace(/\s+/g," ")
      .trim();
  }
  function lang(){
    var l = (window.__ULYDIA_LANG__ || document.documentElement.getAttribute("lang") || "fr").toLowerCase();
    if (!/^(fr|en|de|es|it)$/.test(l)) l = "fr";
    return l;
  }
  function t(key){
    try { return window.__t__ ? window.__t__(key) : ""; } catch(e){ return ""; }
  }

  // ---- UI label translations (source keys are FR labels) ----
  // NOTE: Keep FR as source-of-truth; for FR we keep original.
  var MAP = {
    "Fiche métier": { fr:"Fiche métier", en:"Job profile", de:"Berufsprofil", es:"Ficha de empleo", it:"Scheda professionale" },
    "Fiche Métier": { fr:"Fiche métier", en:"Job profile", de:"Berufsprofil", es:"Ficha de empleo", it:"Scheda professionale" },

    "En savoir plus": { fr:"En savoir plus", en:"Learn more", de:"Mehr erfahren", es:"Saber más", it:"Scopri di più" },

    "Certifications utiles": { fr:"Certifications utiles", en:"Useful certifications", de:"Nützliche Zertifikate", es:"Certificaciones útiles", it:"Certificazioni utili" },
    "Écoles & Parcours recommandés": { fr:"Écoles & Parcours recommandés", en:"Recommended schools & paths", de:"Empfohlene Schulen & Wege", es:"Escuelas y rutas recomendadas", it:"Scuole e percorsi consigliati" },
    "Projets Portfolio essentiels": { fr:"Projets Portfolio essentiels", en:"Essential portfolio projects", de:"Wesentliche Portfolio‑Projekte", es:"Proyectos esenciales de portafolio", it:"Progetti essenziali di portfolio" },

    // Sometimes without accents / different casing
    "Ecoles & Parcours recommandés": { fr:"Écoles & Parcours recommandés", en:"Recommended schools & paths", de:"Empfohlene Schulen & Wege", es:"Escuelas y rutas recomendadas", it:"Scuole e percorsi consigliati" },
    "Projets portfolio essentiels": { fr:"Projets Portfolio essentiels", en:"Essential portfolio projects", de:"Wesentliche Portfolio‑Projekte", es:"Proyectos esenciales de portafolio", it:"Progetti essenziali di portfolio" }
  };

  // Also leverage i18n keys if present
  function computeReplacement(src){
    var L = lang();
    // 1) key-based (preferred when available)
    if (/^fiche métier$/i.test(src) || /^fiche metier$/i.test(src)){
      var k = t("metier_sheet");
      if (k) return k;
    }
    if (/^questions fréquentes$/i.test(src) || /^questions frequentes$/i.test(src)){
      var fq = t("faq"); if (fq) return fq;
    }
    // 2) label-map
    var hit = MAP[src];
    if (hit && hit[L]) return hit[L];
    return "";
  }

  function isShortUiText(s){
    if (!s) return false;
    if (s.length > 60) return false;
    // Avoid translating long sentences / paragraphs
    if (/[.!?;:]/.test(s) && s.length > 30) return false;
    return true;
  }

  function applyToEl(el){
    if (!el || el.nodeType !== 1) return;
    // Skip elements likely containing full richtext blocks
    var tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return;
    // Consider only leaf-ish nodes or obvious UI nodes
    var txt = norm(el.textContent);
    if (!isShortUiText(txt)) return;

    // Idempotent per lang + current text
    var L = lang();
    var stamp = L + "|" + txt;
    if (el.dataset && el.dataset.ulI18nStamp === stamp) return;

    var rep = computeReplacement(txt);
    if (!rep || rep === txt) {
      // still stamp to avoid repeated work
      if (el.dataset) el.dataset.ulI18nStamp = stamp;
      return;
    }

    // Replace only if the element looks like a label/button/title
    // Heuristic: has no nested block children OR is a button/link/header-like
    var isUi = (/^(H1|H2|H3|H4|H5|H6|BUTTON|A|SPAN)$/.test(tag)) ||
               el.className && /(badge|pill|btn|button|title|header|section|label)/i.test(el.className);

    if (!isUi && el.children && el.children.length) return;

    el.textContent = rep;
    if (el.dataset) el.dataset.ulI18nStamp = L + "|" + rep;
  }

  function translateNow(root){
    root = root || document;
    var nodes = root.querySelectorAll("h1,h2,h3,h4,h5,h6,button,a,span,div");
    for (var i=0;i<nodes.length;i++){
      applyToEl(nodes[i]);
    }
  }

  // Debounced runner
  var scheduled = false;
  function run(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function(){
      scheduled = false;
      translateNow(document);
    });
  }

  // Initial runs (staggered to catch late insertions without infinite loops)
  function boot(){
    run();
    setTimeout(run, 120);
    setTimeout(run, 380);
    setTimeout(run, 900);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Listen to language updates (but keep it lightweight)
  window.addEventListener("ULYDIA:I18N_UPDATE", boot);

  // Short-lived observer to catch async inserts
  (function(){
    var endAt = Date.now() + 2800; // 2.8s
    var mo = new MutationObserver(function(muts){
      if (Date.now() > endAt) { try{mo.disconnect();}catch(e){} return; }
      // Only run when nodes are added
      for (var i=0;i<muts.length;i++){
        if (muts[i].addedNodes && muts[i].addedNodes.length){
          run();
          break;
        }
      }
    });
    try{
      mo.observe(document.documentElement, { childList:true, subtree:true });
    }catch(e){}
  })();

})();