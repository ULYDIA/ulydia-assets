/*!
 * ULYDIA — METIER PAGE — FINAL PROPAL (DESIGN-DRIVEN • ONE FILE) — v1.1
 * Hotfix:
 * - If PROPAL markup is not present (IDs mismatch / template not pasted), show a clear in-page error panel (no white screen mystery)
 * - Aggressively removes legacy loader overlays / opacity locks that caused "white screen"
 * - Never depends on appendChild hooks; disables nothing but cleans common overlay DOM
 */
(function(){
  "use strict";
  if (window.__ULYDIA_PROPAL_FINAL_BUNDLE_V11__) return;
  window.__ULYDIA_PROPAL_FINAL_BUNDLE_V11__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG && console && console.log) console.log.apply(console, ["[ULYDIA:PROPAL:FINAL:v1.1]"].concat([].slice.call(arguments))); }

  function qsParam(k){
    try { return new URLSearchParams(location.search||"").get(k) || ""; } catch(e){ return ""; }
  }
  function normText(s){
    return String(s||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
  }
  function normSlug(s){ return normText(s).toLowerCase().replace(/\s+/g,"-"); }
  function normIso(s){ s = normText(s).toUpperCase(); return (s.length===2)?s:""; }
  function normLang(l){
    l = normText(l).toLowerCase();
    if (!l) return "";
    if (l.indexOf("-")>0) l=l.split("-")[0];
    if (l.indexOf("_")>0) l=l.split("_")[0];
    return (/^(fr|en|de|es|it)$/).test(l) ? l : "";
  }
  function isEmptyRich(html){
    var s = String(html||"")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,"")
      .replace(/<[^>]+>/g," ")
      .replace(/\u00a0/g," ")
      .replace(/\s+/g," ")
      .trim();
    return !s;
  }
  function sanitizeHTML(html){
    var s = String(html||"");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,"");
    s = s.replace(/\son\w+="[^"]*"/gi,"");
    s = s.replace(/\son\w+='[^']*'/gi,"");
    s = s.replace(/\son\w+=\S+/gi,"");
    return s.trim();
  }

  // ---------- legacy overlay cleanup (prevents white screen) ----------
  function cleanupLegacyOverlays(){
    var ids = [
      "ulydia-loader-overlay",
      "ulydia-loader",
      "ulydia-loader-root",
      "ulydia-loading-overlay",
      "ulydia-page-loader",
      "ul-beforefaq-banner" // sometimes injected wrong place
    ];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if (el && el.parentNode) { try{ el.parentNode.removeChild(el); }catch(e){} }
    });

    // common selectors from past patches
    var sels = [
      "[data-ulydia-loader]",
      "[data-ulydia-loader-overlay]",
      ".ulydia-loader-overlay",
      ".ul-loader-overlay",
      ".ul-loader",
      ".ulydia-loading",
      ".ulydia-blocking-overlay"
    ];
    sels.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        try{ el.parentNode && el.parentNode.removeChild(el); }catch(e){}
      });
    });

    // unlock body/html if a loader locked it
    try{
      document.documentElement.style.overflow = "";
      document.body && (document.body.style.overflow = "");
      document.body && (document.body.style.opacity = "");
      document.body && (document.body.style.pointerEvents = "");
    }catch(e){}
  }

  // ---------- globals access ----------
  function getMetiers(){ return Array.isArray(window.__ULYDIA_METIERS__) ? window.__ULYDIA_METIERS__ : []; }
  function getCountries(){ return Array.isArray(window.__ULYDIA_COUNTRIES__) ? window.__ULYDIA_COUNTRIES__ : []; }
  function getMPB(){ return Array.isArray(window.__ULYDIA_MPB__) ? window.__ULYDIA_MPB__ : []; }
  function getFaqs(){ return Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : []; }

  function show(el){ if (!el) return; el.style.display=""; el.hidden=false; el.classList && el.classList.remove("hidden"); }
  function hide(el){ if (!el) return; el.style.display="none"; el.hidden=true; }

  function closestCard(node){
    if (!node) return null;
    try { return node.closest(".card"); } catch(e){}
    var el=node;
    for (var i=0;i<8 && el;i++){ if (el.classList && el.classList.contains("card")) return el; el=el.parentElement; }
    return null;
  }
  function findCardByTitleIncludes(text){
    text = normText(text).toLowerCase();
    if (!text) return null;
    var titles = document.querySelectorAll(".section-title");
    for (var i=0;i<titles.length;i++){
      var t = normText(titles[i].textContent).toLowerCase();
      if (t && t.indexOf(text) >= 0) return closestCard(titles[i]);
    }
    return null;
  }
  function getCardBody(card){
    if (!card) return null;
    var kids = card.children;
    if (!kids || kids.length < 2) return null;
    return kids[kids.length-1];
  }

  // ---------- lang (single source) ----------
  var LANG = (function(){
    var l1 = normLang(qsParam("lang"));
    var l2 = normLang(window.__ULYDIA_LANG__);
    var l3 = normLang(document.documentElement && document.documentElement.getAttribute("lang"));
    var l4 = normLang(navigator.language || "");
    var l = l1 || l2 || l3 || l4 || "fr";
    if (!l1){
      try{ window.__ULYDIA_LANG__=l; document.documentElement.setAttribute("lang", l); }catch(e){}
    }
    try{ document.documentElement.setAttribute("translate","no"); }catch(e){}
    try{
      if (!document.querySelector('meta[name="google"][content="notranslate"]')){
        var m=document.createElement("meta"); m.name="google"; m.content="notranslate";
        document.head && document.head.appendChild(m);
      }
    }catch(e){}
    return l;
  })();

  // ---------- minimal error panel ----------
  function renderErrorPanel(title, details){
    cleanupLegacyOverlays();
    var root = document.getElementById("ulydia-metier-root");
    if (!root){
      root = document.createElement("div");
      root.id="ulydia-metier-root";
      (document.body||document.documentElement).appendChild(root);
    }
    var metier = normText(qsParam("metier"));
    var iso = normText(qsParam("country")||qsParam("iso"));
    root.innerHTML =
      "<div style='max-width:980px;margin:40px auto;padding:18px;border:1px solid rgba(15,23,42,.14);border-radius:16px;background:#fff;font-family:system-ui'>" +
        "<div style='font-weight:900;color:#b91c1c;font-size:16px;margin-bottom:8px'>"+escapeHtml(title)+"</div>" +
        "<div style='color:#0f172a;font-weight:700;margin-bottom:10px'>metier="+escapeHtml(metier)+" • country="+escapeHtml(iso)+"</div>" +
        "<div style='color:#334155;line-height:1.5'>"+escapeHtml(details||"")+"</div>" +
        "<hr style='border:none;border-top:1px solid rgba(15,23,42,.12);margin:14px 0'>" +
        "<div style='color:#64748b;font-size:12px;line-height:1.5'>" +
          "Checklist: (1) le template doit contenir le HTML PROPAL avec les IDs (#description-title, #formation-title, #sponsor-banner-link, #sponsor-logo-link, #faq-title) • " +
          "(2) il ne doit rester qu’UN seul script metier-page.* dans la page • " +
          "(3) les embeds CMS doivent remplir window.__ULYDIA_MPB__/__ULYDIA_FAQS__." +
        "</div>" +
      "</div>";
  }
  function escapeHtml(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  // ---------- core render (same as v1.0, trimmed for hotfix response) ----------
  function setRichCard(cardTitleId, html){
    var title = document.getElementById(cardTitleId);
    var card = closestCard(title);
    if (!card) return;
    var body = getCardBody(card);
    if (!body) return;
    if (!html || isEmptyRich(html)){ hide(card); return; }
    show(card);
    body.innerHTML = sanitizeHTML(html);
  }

  function computeCtx(){
    var metierSlug = normSlug(qsParam("metier"));
    var iso = normIso(qsParam("country") || qsParam("iso"));

    var m=null, c=null;
    var metiers=getMetiers(), countries=getCountries();
    for (var i=0;i<metiers.length;i++){
      if (normSlug(metiers[i] && metiers[i].slug) === metierSlug) { m=metiers[i]; break; }
    }
    for (var j=0;j<countries.length;j++){
      if (normIso(countries[j] && countries[j].iso) === iso) { c=countries[j]; break; }
    }
    if (!normLang(qsParam("lang")) && c && normLang(c.language_finale)){
      LANG = normLang(c.language_finale) || LANG;
      try{ window.__ULYDIA_LANG__=LANG; document.documentElement.setAttribute("lang", LANG); }catch(e){}
    }
    return { metierSlug:metierSlug, metierName:m?(m.name||m.slug||metierSlug):metierSlug, iso:iso, countryName:c?(c.name||iso):iso };
  }

  function findBloc(ctx){
    var mpb=getMPB();
    for (var i=0;i<mpb.length;i++){
      var b=mpb[i];
      if (normSlug(b && b.metier)===ctx.metierSlug && normIso(b && b.iso)===ctx.iso) return b;
    }
    return null;
  }

  function renderOnce(){
    cleanupLegacyOverlays();

    // Validate PROPAL markup presence (IDs)
    var requiredIds = ["description-title","formation-title","sponsor-banner-link","sponsor-logo-link","faq-title"];
    var missing = requiredIds.filter(function(id){ return !document.getElementById(id); });
    if (missing.length){
      return { ok:false, reason:"propal-markup-missing", missing: missing };
    }

    var ctx = computeCtx();
    var bloc = findBloc(ctx);
    if (!bloc){
      // hide MPB cards (avoid wrong content)
      ["formation-title","acces-title","marche-title","salaire-title"].forEach(function(id){
        hide(closestCard(document.getElementById(id)));
      });
      hide(closestCard(document.getElementById("faq-title")));
      return { ok:true, noMPB:true };
    }

    setRichCard("formation-title", bloc.formation);
    setRichCard("acces-title", bloc.acces);
    setRichCard("marche-title", bloc.marche);

    // FAQ: render only if global list exists; else keep existing block (or hide)
    var faqs = getFaqs();
    if (!faqs.length){
      // if your design had placeholders, keep them; otherwise hide to avoid wrong content
      // hide(closestCard(document.getElementById("faq-title")));
    }

    try{ window.dispatchEvent(new Event("ULYDIA:METIER_READY")); }catch(e){}
    return { ok:true };
  }

  function bootBounded(){
    var t0=Date.now(), MAX=4000, done=false;
    function tick(){
      if (done) return;
      var res=null;
      try{ res=renderOnce(); }catch(e){ done=true; renderErrorPanel("Erreur JS pendant le rendu", String(e&&e.message||e)); return; }
      if (res && res.ok){ done=true; log("render ok", res); return; }
      if (Date.now()-t0 > MAX){
        done=true;
        if (res && res.reason==="propal-markup-missing"){
          renderErrorPanel(
            "Design PROPAL introuvable dans ce template",
            "IDs manquants: " + (res.missing||[]).join(", ")
          );
        } else {
          renderErrorPanel("Rendu non effectué", "Timeout d'attente des éléments/globals.");
        }
        return;
      }
      setTimeout(tick, 80);
    }
    tick();
  }

  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", bootBounded);
  else bootBounded();

})();