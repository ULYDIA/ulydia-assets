
(function(){
  "use strict";

// ULYDIA BUILD MARKER
window.__ULYDIA_BUILD__ = 'MONO FINAL v2026-02-06i (Salary sub-cards hover zoom)';
try{console.log('[ULYDIA] Loaded', window.__ULYDIA_BUILD__);
    try{window.__ULYDIA_METIER_PAGE_RUNNING__ = false;}catch(e){}
}catch(e){}

(function(){
  // Force loader + EN not-available styling (used even if other renderers exist)
  function ensureNAStyle(){
    if (document.getElementById('ul-na-inline-style')) return;
    var s = document.createElement('style');
    s.id = 'ul-na-inline-style';
    s.textContent =
      /* ✅ LOADER overlay (same spirit as my-account) */
      '.u-overlay{position:fixed;inset:0;z-index:999999;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;padding:18px}'
      +'.u-overlayCard{width:min(640px,92vw);border:1px solid #e5e7eb;border-radius:18px;background:#fff;box-shadow:0 14px 40px rgba(15,23,42,.10);padding:18px}'
      +'.u-overlayRow{display:flex;align-items:center;gap:12px}'
      +'.u-spinner{width:18px;height:18px;border-radius:50%;border:2px solid rgba(15,23,42,.18);border-top-color:#2563eb;animation:uSpin .75s linear infinite}'
      +'@keyframes uSpin{to{transform:rotate(360deg)}}'
      +'.u-overlayTitle{font-weight:900;color:#0f172a;font-size:14px;font-family:Montserrat,system-ui}'
      +'.u-overlaySub{font-size:13px;opacity:.7;margin-top:6px;line-height:1.35;font-family:Montserrat,system-ui}'
      +'.u-skelGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}'
      +'.u-skel{height:70px;border-radius:16px;border:1px solid #e5e7eb;background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 37%,#f1f5f9 63%);background-size:400% 100%;animation:uShimmer 1.1s ease-in-out infinite}'
      +'@keyframes uShimmer{0%{background-position:100% 0}100%{background-position:0 0}}'
      +'@media (max-width:980px){.u-skelGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}'
      // Not-available card (kept clean)
      +'.ul-na-card{max-width:1100px;margin:24px auto;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.08);border:1px solid rgba(148,163,184,.35)}'
      +'.ul-na-head{padding:12px 16px;background:linear-gradient(90deg,rgba(99,102,241,.18),rgba(99,102,241,.06));font-weight:800;font-family:Montserrat,system-ui;color:#0f172a}'
      +'.ul-na-body{padding:18px 16px}'
      +'.ul-na-title{margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;font-family:Montserrat,system-ui}'
      +'.ul-na-text{color:#475569;line-height:1.6;font-family:Montserrat,system-ui}';
    document.head.appendChild(s);
  }

  window.showMetierLoader = function(){
    ensureNAStyle();
    // Avoid double overlays
    if (document.getElementById('ulydia-loader-overlay')) return;

    var ov = document.createElement('div');
    ov.className = 'u-overlay';
    ov.id = 'ulydia-loader-overlay';
    ov.innerHTML =
      '<div class="u-overlayCard">' +
        '<div class="u-overlayRow">' +
          '<span class="u-spinner"></span>' +
          '<div>' +
            '<div class="u-overlayTitle">Loading</div>' +
            '<div class="u-overlaySub">Fetching the job description…</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
  };

  window.hideMetierLoader = function(){
    var ov = document.getElementById('ulydia-loader-overlay');
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  };

// ✅ GLOBAL SAFETY: never keep loader stuck on unhandled errors
try{
  if (!window.__ULYDIA_UNHANDLED_GUARD__){
    window.__ULYDIA_UNHANDLED_GUARD__ = true;
    window.addEventListener("unhandledrejection", function(){
      try{ window.hideMetierLoader && window.hideMetierLoader(); }catch(e){}
    });
    window.addEventListener("error", function(){
      try{ window.hideMetierLoader && window.hideMetierLoader(); }catch(e){}
    });
  }
}catch(e){}



  window.renderNotAvailableCard = function(country){
    ensureNAStyle();
    var root = document.getElementById('ulydia-metier-root');
    if (!root) return;
    var c = (country||'').toString();
    root.innerHTML =
      '<div class="ul-na-card">' +
        '<span class="ul-na-badge">✨ Not available</span>' +
        '<div class="ul-na-title">This job description is not yet available in this language</div>' +
        '<div class="ul-na-text">We are still working on localized content for <b>'+ (c||'this language') +'</b>. You can change the country or explore other jobs using the filters above.</div>' +
      '</div>';
  };

  // Hard override any legacy renderNotAvailable(ctx) if present
  window.__ULYDIA_RENDER_NOT_AVAILABLE__ = function(ctx){
    var ctry = (ctx && ctx.country && (ctx.country.label||ctx.country.name||ctx.country.iso)) || (ctx && ctx.iso) || "";
    window.renderNotAvailableCard(ctry);
    var wrap = document.createElement('div');
    wrap.className = 'u-wrap';
    return wrap;
  };
})()
;(function(){
  function injectStickyCSS(){
    if (document.getElementById('ul-sticky-filters-style')) return;
    var s = document.createElement('style');
    s.id = 'ul-sticky-filters-style';
    s.textContent =
      '.ul-sticky-filters{position:sticky;top:0;z-index:50;background:transparent;padding-top:12px;padding-bottom:12px}'
      +'.ul-sticky-filters .ul-sticky-inner{max-width:1100px;margin:0 auto}'
      +'.ul-sticky-filters .ul-sticky-shell{border-radius:18px;background:rgba(255,255,255,.92);backdrop-filter:saturate(180%) blur(10px);'
      +'box-shadow:0 12px 30px rgba(15,23,42,.08);border:1px solid rgba(148,163,184,.35)}';
    document.head.appendChild(s);
  }

  function makeSticky(){
    injectStickyCSS();
    // Prefer explicit wrapper if present
    var bar = document.querySelector('[data-ulydia-filters]') || document.querySelector('.ulydia-filters') || document.querySelector('.filters-bar');
    if (!bar){
      // Heuristic: find a common parent around the 3 selects (Pays/Secteur/Métier)
      var selects = Array.prototype.slice.call(document.querySelectorAll('select'));
      if (!selects.length) return;
      // pick select that looks like metier
      var met = selects.find(function(s){
        var id=(s.id||'').toLowerCase(), name=(s.name||'').toLowerCase();
        return id.indexOf('metier')!==-1 || name.indexOf('metier')!==-1;
      }) || selects[0];
      bar = met && met.closest('div');
      // climb until it contains at least 2 selects
      var p=bar;
      for (var i=0;i<8 && p;i++){
        var cnt = p.querySelectorAll ? p.querySelectorAll('select').length : 0;
        if (cnt >= 2) { bar = p; break; }
        p = p.parentElement;
      }
    }
    if (!bar) return;

    // Wrap once to avoid breaking layout
    if (bar.parentElement && bar.parentElement.classList && bar.parentElement.classList.contains('ul-sticky-filters')) return;

    var wrap = document.createElement('div');
    wrap.className = 'ul-sticky-filters';
    var inner = document.createElement('div'); inner.className = 'ul-sticky-inner';
    var shell = document.createElement('div'); shell.className = 'ul-sticky-shell';
    // keep existing bar markup inside shell
    bar.parentNode.insertBefore(wrap, bar);
    wrap.appendChild(inner);
    inner.appendChild(shell);
    shell.appendChild(bar);
    // mark for sector DOM detector to ignore
    try{ shell.setAttribute('data-ulydia-filters','1'); }catch(e){}
    try{ bar.setAttribute('data-ulydia-filters','1'); }catch(e){}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makeSticky);
  else makeSticky();
})();
;

// --- safety: ficheHasContent must exist (Airtable-first missing fiche guard) ---
function ficheHasContent(f){
  if (!f) return false;
  // Consider Airtable fields + legacy Webflow fields
  var htmlKeys = ["overview","description","missions","environnements","skills","competences","profil_recherche","evolutions","acces","marche","formation","salaire_text"];
  for (var i=0;i<htmlKeys.length;i++){
    var k = htmlKeys[i];
    if (f[k] && String(f[k]).replace(/<[^>]*>/g,"").trim()) return true;
  }
  // Titles/accroche still count as minimal content
  if (f.job_title || f.title || f.name || f.Nom) return true;
  if (f.accroche || f.accroche_texte || f.accrocheTexte) return true;
  return false;
}
try{ window.ficheHasContent = ficheHasContent; }catch(e){}

// --- lang helper (must exist before any usage; Safari-safe) ---
var normLang = function(lang){
  lang = String(lang||"").toLowerCase().trim();
  if (lang === "fr" || lang === "en" || lang === "de" || lang === "es" || lang === "it") return lang;
  if (lang.indexOf("fr") === 0) return "fr";
  if (lang.indexOf("en") === 0) return "en";
  if (lang.indexOf("de") === 0) return "de";
  if (lang.indexOf("es") === 0) return "es";
  if (lang.indexOf("it") === 0) return "it";
  return "en";
};


// --- HTML -> text helper (avoid showing <div class="rich-content">...) ---
function stripHtmlToText(v){
  if (v == null) return "";
  var s = String(v);
  if (!s) return "";
  // If HTML is entity-escaped (e.g. &lt;div&gt;...), unescape first so we can strip tags properly.
  if (s.indexOf("&lt;") !== -1 || s.indexOf("&gt;") !== -1){
    s = s
      .replace(/&lt;/g,"<")
      .replace(/&gt;/g,">")
      .replace(/&amp;/g,"&")
      .replace(/&quot;/g,'"')
      .replace(/&#39;/g,"'");
  }
  if (s.indexOf("<") === -1 && s.indexOf("&") === -1) return s.trim();
  try{
    var d = document.createElement("div");
    d.innerHTML = s;

    // If it's a list, keep item boundaries (prevents "Word1Word2" concatenation)
    var lis = d.querySelectorAll("li");
    if (lis && lis.length){
      var arr = [];
      for (var i=0;i<lis.length;i++){
        var t = String(lis[i].textContent || "").replace(/\s+/g," ").trim();
        if (t) arr.push(t);
      }
      if (arr.length) return arr.join(" · ");
    }

    // Fallback: plain text
    return String(d.textContent || d.innerText || "").replace(/\s+/g," ").trim();
  }catch(e){
    return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/\s+/g," ").trim();
  }
}
// --- base content lang (for migration period) ---
function getBaseContentLang(){
  var v = String(window.__ULYDIA_CONTENT_BASE_LANG__ || "fr").toLowerCase().trim();
  return (v==="fr"||v==="en"||v==="de"||v==="es"||v==="it") ? v : "fr";
}

// --- pick fiche by final language (strict per slug; migration-safe) ---
function pickFicheForLang(metierSlug, finalLang){
  var list = getFicheMetiers() || [];
  var slug = slugify(metierSlug);
  var lf = normLang(finalLang || "fr");

  var candidates = (list||[]).filter(function(x){
    return x && slugify(x.slug || x.Slug || x.metier_slug || x.metier || x.name) === slug;
  });
  if (!candidates.length){
    // fallback: try name match
    candidates = (list||[]).filter(function(x){
      return x && slugify(x.name || x.Nom) === slug;
    });
  }
  if (!candidates.length) return { fiche:null, any:null, mode:"missing" };

  var any = candidates[0];

  // strict only if this slug has at least one non-empty lang
  var strictReady = candidates.some(function(x){
    return !!String(x && (x.lang || x.language || x.langue) || "").trim();
  });

  if (strictReady){
    var match = candidates.find(function(x){
      var l = normLang(x && (x.lang || x.language || x.langue) || "");
      return l === lf;
    }) || null;
    return { fiche: match, any:any, mode:"strict" };
  }

  // no per-lang variants yet: assume base dataset language
  var base = getBaseContentLang();
  return { fiche: (lf === base ? any : null), any:any, mode:"base" };
}

function getFinalLang(iso, country, catCountry){
  iso = String(iso||"").toUpperCase().trim();
  var SUP = {fr:1,en:1,de:1,es:1,it:1};

  // 1) catalog countries (source of truth)
  try{
    var cat = (window.__ULYDIA_CATALOG__ && window.__ULYDIA_CATALOG__.countries) || null;
    if (Array.isArray(cat) && iso){
      for (var i=0;i<cat.length;i++){
        var c = cat[i];
        var ciso = String((c && (c.iso || c.code_iso || c.codeIso || c.country_code || c.countryCode || c.code)) || "").toUpperCase();
        if (ciso === iso){
          var l = c.langue_finale || c.lang_finale || c.final_lang || c.finalLang || c.lang || c.language || c.default_lang || c.defaultLang;
          var nl = normLang(l || "");
          if (SUP[nl]) return nl;
        }
      }
    }
  }catch(e){}

  // 2) catCountry (already picked)
  if (catCountry){
    var l2 = catCountry.langue_finale || catCountry.lang_finale || catCountry.final_lang || catCountry.finalLang || catCountry.lang || catCountry.language || catCountry.default_lang || catCountry.defaultLang;
    var nl2 = normLang(l2 || "");
    if (SUP[nl2]) return nl2;
  }

  // 3) country object (from CMS)
  if (country){
    var l3 = country.langue_finale || country.lang_finale || country.final_lang || country.finalLang || country.lang || country.language || country.default_lang || country.defaultLang;
    var nl3 = normLang(l3 || "");
    if (SUP[nl3]) return nl3;
  }

  // 4) navigator.language fallback (only if supported)
  try{
    var nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
    var nav2 = (nav.split("-")[0] || "").trim();
    if (SUP[nav2]) return nav2;
  }catch(e){}

  // 5) default
  return "en";
}

function getPageData(){
  // NOTE: __ULYDIA_METIER_PAGE_V29__ is a boolean boot-flag (not data).
  return window.__ULYDIA_PAGE_DATA__ || window.__ULYDIA_PAGE__ || null;
}
function pickArr(){
  for (var i=0;i<arguments.length;i++){
    var v = arguments[i];
    if (Array.isArray(v) && v.length) return v;
  }
  return [];
}



// Also expose for debugging
try{ window.__ULYDIA_normLang__ = normLang; }catch(e){}


  // =========================================================
  // ULYDIA — Metier Page — MONO BUNDLE — v2.9 DESIGNFULL
  // - Always renders Fiche Métier fields (description/missions/...) when present
  // - Also renders MPB blocks (formation/acces/marche/environnements) when present
  // - Banners:
  //   * Non-sponsor banners from Countries CMS (wide+square)
  //   * Sponsor banners from Airtable via Worker endpoint /v1/metier-page
  // =========================================================

  if (window.__ULYDIA_METIER_PAGE_V29__) return;
  window.__ULYDIA_METIER_PAGE_V29__ = true;

  window.ulydiaNotifyRendered = window.ulydiaNotifyRendered || function ulydiaNotifyRendered(){
    try{
      try{ sessionStorage.removeItem("ulydia_nav_loading"); }catch(e){}
      window.dispatchEvent(new CustomEvent("ulydia:metier:rendered"));
    }catch(e){}
  }
// ---------------------------------------------------------
// PRE-READERS (DOM -> window arrays) — v4.6.4
// Goal: make FAQ + MPB available even if CMS readers didn't populate window arrays yet.
// - FAQ: expects at least .js-faq-question + .js-faq-answer, and ideally .js-faq-metier (metier name)
// - MPB: expects .js-bloc-iso + .js-bloc-metier + .js-bloc-title + .js-bloc-body (+ optional .js-bloc-order)
// ---------------------------------------------------------
(function(){
  function norm(s){ return String(s||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim(); }
  function up(s){ return norm(s).toUpperCase(); }
  function slugify(s){
    s = norm(s).toLowerCase();
    try{ s = s.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }catch(e){}
    s = s.replace(/[’']/g,"-").replace(/[^a-z0-9]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
    return s;
  }
function themeForLeftTitle(title){
    var s = norm(title).toLowerCase();
    if (!s) return 'pastel-blue';
    if (s.indexOf('formation')>-1 || s.indexOf('education')>-1) return 'pastel-purple';
    if (s.indexOf('accès')>-1 || s.indexOf('access')>-1 || s.indexOf('reconversion')>-1 || s.indexOf('career change')>-1) return 'pastel-green';
    if (s.indexOf('march')>-1 || s.indexOf('market')>-1) return 'pastel-cyan';
    if (s.indexOf('salaire')>-1 || s.indexOf('rémun')>-1 || s.indexOf('salary')>-1) return 'gradient-success';
    if (s.indexOf('environ')>-1 || s.indexOf('work')>-1) return 'pastel-blue';
    if (s.indexOf('mission')>-1) return 'pastel-cyan';
    if (s.indexOf('profil')>-1) return 'pastel-purple';
    if (s.indexOf('evolution')>-1 || s.indexOf('career')>-1) return 'pastel-cyan';
    return 'pastel-blue';
  }

  function closestItem(el){
    while (el && el !== document){
      if (el.classList && el.classList.contains("w-dyn-item")) return el;
      el = el.parentNode;
    }
    return null;
  }
  function readFaqsFromDOM(){
    var out = [];
    var qNodes = document.querySelectorAll(".js-faq-question, .js-faq-q");
    if (!qNodes || !qNodes.length) return out;

    for (var i=0;i<qNodes.length;i++){
      var qEl = qNodes[i];
      var item = closestItem(qEl) || qEl.parentNode;
      if (!item) continue;

      var aEl = item.querySelector(".js-faq-answer") || item.querySelector(".js-faq-a") || item.querySelector(".js-faq-reponse") || item.querySelector(".js-faq-response");
      var metEl = item.querySelector(".js-faq-metier") || item.querySelector(".js-faq-name") || item.querySelector(".js-faq-job") || item.querySelector(".js-faq-nom");
      var isoEl = item.querySelector(".js-faq-iso") || item.querySelector(".js-faq-country") || item.querySelector(".js-faq-code-iso");
      var langEl = item.querySelector(".js-faq-lang") || item.querySelector(".js-faq-language");

      var question = norm(qEl.textContent);
      var answer = aEl ? String(aEl.innerHTML||"").trim() : "";

      // IMPORTANT: link by metier NAME (not FAQ slug)
      var metier = norm(metEl ? metEl.textContent : "");
      var iso = up(isoEl ? isoEl.textContent : "");
      var lang = norm(langEl ? langEl.textContent : "").toLowerCase();

      if (!question && !answer) continue;
      out.push({ metier: metier, name: metier, question: question, answer: answer, iso: iso, lang: lang });
    }

    // de-dup (question+metier)
    var seen = {};
    var clean = [];
    for (var j=0;j<out.length;j++){
      var it = out[j];
      var k = slugify(it.metier||"") + "||" + slugify(it.question||"");
      if (seen[k]) continue;
      seen[k]=1;
      clean.push(it);
    }
    return clean;
  }

  function readMPBFromDOM(){
    // Robust MPB DOM reader + BF adapter (keeps Webflow model unchanged)
    // Supports two shapes:
    //  A) Generic blocks: .js-bloc-title + .js-bloc-body
    //  B) Legacy BF fields: .js-bf-formation, .js-bf-acces, ... + chips/salary nodes
    var out = [];
    try{
      function norm(s){ return String(s||"").replace(/\u00A0/g," ").replace(/\s+/g," ").trim(); }
      function up(s){ return norm(s).toUpperCase(); }
      function pickHTML(el){ return el ? String(el.innerHTML||"").trim() : ""; }
      function pickText(el){ return el ? norm(el.textContent||"") : ""; }
      function parseNum(s){
        s = norm(s).replace(/,/g,".").replace(/[^0-9.\-]/g,"");
        if (!s) return null;
        var n = parseFloat(s);
        return isFinite(n) ? n : null;
      }
      function closestItem(el){
        while (el && el !== document){
          if (el.classList && el.classList.contains("w-dyn-item")) return el;
          el = el.parentNode;
        }
        return null;
      }

      // Prefer scanning dyn-items under MPB wrapper if present, else any dyn-item containing mpb markers
      var wrapper = document.querySelector(".ul-cms-blocs-source") || document.querySelector(".ul-cms-blocs") || null;
      var items = wrapper ? wrapper.querySelectorAll(".w-dyn-item") : document.querySelectorAll(".w-dyn-item");
      if (!items || !items.length) return out;

      for (var i=0;i<items.length;i++){
        var it = items[i];

        var isoEl = it.querySelector(".js-bloc-iso");
        var metEl = it.querySelector(".js-bloc-metier");
        if (!isoEl || !metEl) continue;

        var iso = up(isoEl.textContent);
        var metier = pickText(metEl);
        if (!iso || !metier) continue;

        // --- Shape A: generic blocks ---
        var titleNodes = it.querySelectorAll(".js-bloc-title");
        var bodyNodes  = it.querySelectorAll(".js-bloc-body");
        if (titleNodes && titleNodes.length && bodyNodes && bodyNodes.length){
          for (var t=0;t<titleNodes.length;t++){
            var titleEl = titleNodes[t];
            var item2 = closestItem(titleEl) || it;
            var bodyEl = item2.querySelector(".js-bloc-body");
            if (!bodyEl) continue;
            var orderEl = item2.querySelector(".js-bloc-order");
            var title = pickText(titleEl);
            var body  = pickHTML(bodyEl);
            var order = orderEl ? parseInt(pickText(orderEl),10) : null;
            if (!title || !body) continue;
            out.push({ iso: iso, metier: metier, title: title, body: body, order: (isNaN(order)? null: order) });
          }
          continue;
        }

        // --- Shape B: legacy BF fields -> flatten to MPB object ---
        // Detect at least one BF node
        var hasBF = !!it.querySelector("[class*='js-bf-']");
        if (!hasBF) continue;

        var obj = { iso: iso, metier: metier };

        // Left column core
        obj.formation_bloc = pickHTML(it.querySelector(".js-bf-formation")) || pickHTML(it.querySelector(".js-bf-formation_bloc"));
        obj.acces_bloc     = pickHTML(it.querySelector(".js-bf-acces")) || pickHTML(it.querySelector(".js-bf-acces_bloc"));
        obj.salaire_bloc   = pickHTML(it.querySelector(".js-bf-salaire")) || pickHTML(it.querySelector(".js-bf-salaire_bloc"));
        obj.marche_bloc    = pickHTML(it.querySelector(".js-bf-marche")) || pickHTML(it.querySelector(".js-bf-marche_bloc"));
        obj.environnements_bloc = pickHTML(it.querySelector(".js-bf-environnements")) || pickHTML(it.querySelector(".js-bf-environnements_bloc")) || pickHTML(it.querySelector(".js-bf-work_environment"));

        // Right column rich fields
        obj.education_level_local = pickHTML(it.querySelector(".js-bf-education_level_local"));
        obj.education_level       = pickHTML(it.querySelector(".js-bf-education_level"));
        obj.key_fields            = pickHTML(it.querySelector(".js-bf-top_fields")) || pickHTML(it.querySelector(".js-bf-key_fields"));
        obj.certifications        = pickHTML(it.querySelector(".js-bf-certifications"));
        obj.schools_or_paths      = pickHTML(it.querySelector(".js-bf-schools_or_paths"));
        obj.equivalences_reconversions = pickHTML(it.querySelector(".js-bf-equivalences_reconversion")) || pickHTML(it.querySelector(".js-bf-equivalences_reconversions"));
        obj.entry_routes          = pickHTML(it.querySelector(".js-bf-entry_routes")) || pickHTML(it.querySelector(".js-bf-entry_routh"));
        obj.first_job_titles      = pickHTML(it.querySelector(".js-bf-first_job_titles"));
        obj.typical_employers     = pickHTML(it.querySelector(".js-bf-typical_employers"));
        obj.portfolio_projects    = pickHTML(it.querySelector(".js-bf-portfolio_projects"));
        obj.skills_must_have      = pickHTML(it.querySelector(".js-bf-skills_must_have"));
        obj.soft_skills           = pickHTML(it.querySelector(".js-bf-soft_skills"));
        obj.tools_stack           = pickHTML(it.querySelector(".js-bf-tools_stack"));
        obj.time_to_employability = pickHTML(it.querySelector(".js-bf-time_to_employability"));
        obj.hiring_sectors        = pickHTML(it.querySelector(".js-bf-hiring_sectors"));
        obj.degrees_examples      = pickHTML(it.querySelector(".js-bf-degrees_examples"));
        obj.growth_outlook        = pickHTML(it.querySelector(".js-bf-growth_outlook"));
        obj.market_demand         = pickHTML(it.querySelector(".js-bf-market_demand"));
        obj.salary_notes          = pickHTML(it.querySelector(".js-bf-salary_notes"));

        // Chips / indicators (often plain text nodes)
        obj.remote_level     = pickText(it.querySelector(".js-chip-remote_level")) || pickText(it.querySelector(".js-chip-remote"));
        obj.automation_risk  = pickText(it.querySelector(".js-chip-automation_risk")) || pickText(it.querySelector(".js-chip-automation"));
        obj.devise           = pickText(it.querySelector(".js-chip-currency")) || pickText(it.querySelector(".js-chip-devise"));
        obj.statut_generation = pickText(it.querySelector(".js-statut-generation")) || pickText(it.querySelector(".js-chip-statut_generation"));

        // Salary ranges (text nodes)
        obj.junior_min = parseNum(pickText(it.querySelector(".js-sal-junior-min")));
        obj.junior_max = parseNum(pickText(it.querySelector(".js-sal-junior-max")));
        obj.mid_min    = parseNum(pickText(it.querySelector(".js-sal-mid-min")));
        obj.mid_max    = parseNum(pickText(it.querySelector(".js-sal-mid-max")));
        obj.senior_min = parseNum(pickText(it.querySelector(".js-sal-senior-min")));
        obj.senior_max = parseNum(pickText(it.querySelector(".js-sal-senior-max")));
        obj.variable_share = parseNum(pickText(it.querySelector(".js-sal-variable-share"))) || pickText(it.querySelector(".js-sal-variable-share"));

        out.push(obj);
      }

      if (out.length){
        // Expose array for the MONO bundle
        window.__ULYDIA_METIER_PAYS_BLOCS__ = out;
        // Legacy convenience: if only one record, expose also __ULYDIA_BLOC__
        if (out.length === 1) window.__ULYDIA_BLOC__ = out[0];
      }
      return out;
    }catch(e){
      return out;
    }
  }

  // Pre-fill arrays if not provided yet (safe; never throws)
  try{
    if (!Array.isArray(window.__ULYDIA_FAQS__) || !window.__ULYDIA_FAQS__.length){
      window.__ULYDIA_FAQS__ = readFaqsFromDOM();
    }
  }catch(e){}
  try{
    if (!Array.isArray(window.__ULYDIA_METIER_PAYS_BLOCS__) || !window.__ULYDIA_METIER_PAYS_BLOCS__.length){
      window.__ULYDIA_METIER_PAYS_BLOCS__ = readMPBFromDOM();
    }
  }catch(e){}

})();

  var DEBUG = !!window.__METIER_PAGE_DEBUG__ || !!window.__ULYDIA_DEBUG__;

  // ---------------------------------------------------------
  // I18N (titles / UI strings only, not CMS content)
  // Source of truth: ctx.lang (catalog pays language), fallback 'en'
  // ---------------------------------------------------------
  var I18N = (window.__ULYDIA_I18N_LABELS__ || window.ULYDIA_I18N_LABELS || window.__ULYDIA_LABELS__ || null) || {
    en: { sector:"Sector", country:"Country", sponsor:"Sponsor", premium:"Premium", partner:"Partner",
          learn_more:"Learn more", overview:"Overview", missions:"Missions", skills:"Skills", training:"Training", access:"Access", market:"Market", salary:"Salary",
          work_environment:"Work environment", profile:"Profile", career_path:"Career path",
          faqs:"Frequently asked questions",
          not_available_title:"Not available",
          not_available_msg_prefix:"This job description is not yet available in ",
          missing_job_title:"Missing job",
          missing_job_msg:"Use the URL parameter ?metier=slug.",
          no_faq:"No questions available for this job.",
          salary:"Salary",
          junior:"Junior",
          mid:"Mid",
          senior:"Senior",
          key_indicators:"Key indicators",
          key_fields:"Key fields",
          must_have:"Must-have skills",
          soft_skills:"Soft skills",
          tools_stack:"Tools / stack",
          skills_path:"Skills & path",
          certifications:"Certifications",
          schools_paths:"Schools & paths",
          portfolio_projects:"Portfolio projects",
          additional_info:"Additional information",
          missing_job_title:"Missing job",
          missing_job_msg:"Use the URL parameter ?metier=slug.",
          no_faq:"No questions available for this job.",
          salary:"Salary",
          junior:"Junior",
          mid:"Mid",
          senior:"Senior",
          key_indicators:"Key indicators",
          key_fields:"Key fields",
          must_have:"Must-have skills",
          soft_skills:"Soft skills",
          tools_stack:"Tools / stack",
          skills_path:"Skills & path",
          certifications:"Certifications",
          schools_paths:"Schools & paths",
          portfolio_projects:"Portfolio projects",
          additional_info:"Additional information",
          top_fields:"Key fields",
          skills_must_have:"Must-have skills",
          remote_level:"Remote",
          automation_risk:"Automation risk",
          time_to_employability:"Time to employability",
          growth_outlook:"Growth outlook",
          market_demand:"Market demand",
          currency:"Currency", education_level_label:"Required level"},
    fr: { sector:"Secteur", country:"Pays", sponsor:"Sponsor", premium:"Premium", partner:"Partenaire",
          learn_more:"En savoir plus", overview:"Aperçu", missions:"Missions", skills:"Compétences", training:"Formation", access:"Accès", market:"Marché", salary:"Salaire",
          work_environment:"Environnements de travail", profile:"Profil", career_path:"Évolutions possibles",
          faqs:"Questions fréquentes",
          not_available_title:"Non disponible",
          not_available_msg_prefix:"Ce métier n'existe pas pour le pays ",
          missing_job_title:"Métier manquant",
          missing_job_msg:"Utilise le paramètre d’URL ?metier=slug.",
          no_faq:"Aucune question disponible pour ce métier.",
          salary:"Rémunération",
          junior:"Junior",
          mid:"Confirmé",
          senior:"Senior",
          key_indicators:"Indicateurs clés",
          key_fields:"Domaines clés",
          must_have:"Compétences indispensables",
          soft_skills:"Soft skills",
          tools_stack:"Outils / stack",
          skills_path:"Compétences & parcours",
          certifications:"Certifications",
          schools_paths:"Écoles & parcours",
          portfolio_projects:"Projets / portfolio",
          additional_info:"Informations complémentaires",
          missing_job_title:"Métier manquant",
          missing_job_msg:"Utilise le paramètre d’URL ?metier=slug.",
          no_faq:"Aucune question disponible pour ce métier.",
          salary:"Rémunération",
          junior:"Junior",
          mid:"Confirmé",
          senior:"Senior",
          key_indicators:"Indicateurs clés",
          key_fields:"Domaines clés",
          must_have:"Compétences indispensables",
          soft_skills:"Soft skills",
          tools_stack:"Outils / stack",
          skills_path:"Compétences & parcours",
          certifications:"Certifications",
          schools_paths:"Écoles & parcours",
          portfolio_projects:"Projets / portfolio",
          additional_info:"Informations complémentaires",
          top_fields:"Domaines clés",
          skills_must_have:"Compétences incontournables",
          remote_level:"Télétravail",
          automation_risk:"Risque d’automatisation",
          time_to_employability:"Délai d’employabilité",
          growth_outlook:"Croissance",
          market_demand:"Demande du marché",
          currency:"Devise", education_level_label:"Niveau requis"},
    de: { sector:"Sektor", country:"Land", sponsor:"Sponsor", premium:"Premium", partner:"Partner",
          learn_more:"Mehr erfahren", overview:"Überblick", missions:"Aufgaben", skills:"Kompetenzen", training:"Ausbildung", access:"Zugang", market:"Markt", salary:"Gehalt",
          work_environment:"Arbeitsumfeld", profile:"Profil", career_path:"Karriereweg",
          faqs:"Häufige Fragen",
          not_available_title:"Nicht verfügbar",
          not_available_msg_prefix:"Dieser Beruf existiert nicht für das Land ",
          missing_job_title:"Beruf fehlt",
          missing_job_msg:"Nutze den URL-Parameter ?metier=slug.",
          no_faq:"Keine Fragen für diesen Beruf verfügbar.",
          salary:"Gehalt",
          junior:"Junior",
          mid:"Mid",
          senior:"Senior",
          key_indicators:"Schlüsselindikatoren",
          key_fields:"Schlüsselbereiche",
          must_have:"Must-have Skills",
          soft_skills:"Soft Skills",
          tools_stack:"Tools / Stack",
          skills_path:"Skills & Karriere",
          certifications:"Zertifikate",
          schools_paths:"Schulen & Wege",
          portfolio_projects:"Portfolio-Projekte",
          additional_info:"Zusätzliche Infos",
          missing_job_title:"Beruf fehlt",
          missing_job_msg:"Nutze den URL-Parameter ?metier=slug.",
          no_faq:"Keine Fragen für diesen Beruf verfügbar.",
          salary:"Gehalt",
          junior:"Junior",
          mid:"Mid",
          senior:"Senior",
          key_indicators:"Schlüsselindikatoren",
          key_fields:"Schlüsselbereiche",
          must_have:"Must-have Skills",
          soft_skills:"Soft Skills",
          tools_stack:"Tools / Stack",
          skills_path:"Skills & Karriere",
          certifications:"Zertifikate",
          schools_paths:"Schulen & Wege",
          portfolio_projects:"Portfolio-Projekte",
          additional_info:"Zusätzliche Infos",
          top_fields:"Schlüsselbereiche",
          skills_must_have:"Pflichtkompetenzen",
          remote_level:"Remote",
          automation_risk:"Automationsrisiko",
          time_to_employability:"Zeit bis Beschäftigung",
          growth_outlook:"Wachstum",
          market_demand:"Marktnachfrage",
          currency:"Währung", education_level_label:"Erforderliches Niveau"},
    es: { sector:"Sector", country:"País", sponsor:"Patrocinio", premium:"Premium", partner:"Socio",
          learn_more:"Más información", overview:"Resumen", missions:"Misiones", skills:"Habilidades", training:"Formación", access:"Acceso", market:"Mercado", salary:"Salario",
          work_environment:"Entorno de trabajo", profile:"Perfil", career_path:"Evolución profesional",
          faqs:"Preguntas frecuentes",
          not_available_title:"No disponible",
          not_available_msg_prefix:"Este empleo no existe para el país ",
          missing_job_title:"Empleo faltante",
          missing_job_msg:"Usa el parámetro de URL ?metier=slug.",
          no_faq:"No hay preguntas para este empleo.",
          salary:"Salario",
          junior:"Junior",
          mid:"Mid",
          senior:"Senior",
          key_indicators:"Indicadores clave",
          key_fields:"Campos clave",
          must_have:"Habilidades imprescindibles",
          soft_skills:"Soft skills",
          tools_stack:"Herramientas / stack",
          skills_path:"Habilidades & trayectoria",
          certifications:"Certificaciones",
          schools_paths:"Escuelas & rutas",
          portfolio_projects:"Proyectos / portfolio",
          additional_info:"Información adicional",
          missing_job_title:"Empleo faltante",
          missing_job_msg:"Usa el parámetro de URL ?metier=slug.",
          no_faq:"No hay preguntas para este empleo.",
          salary:"Salario",
          junior:"Junior",
          mid:"Mid",
          senior:"Senior",
          key_indicators:"Indicadores clave",
          key_fields:"Campos clave",
          must_have:"Habilidades imprescindibles",
          soft_skills:"Soft skills",
          tools_stack:"Herramientas / stack",
          skills_path:"Habilidades & trayectoria",
          certifications:"Certificaciones",
          schools_paths:"Escuelas & rutas",
          portfolio_projects:"Proyectos / portfolio",
          additional_info:"Información adicional",
          top_fields:"Áreas clave",
          skills_must_have:"Habilidades imprescindibles",
          remote_level:"Remoto",
          automation_risk:"Riesgo de automatización",
          time_to_employability:"Tiempo de empleabilidad",
          growth_outlook:"Crecimiento",
          market_demand:"Demanda",
          currency:"Divisa"},
    it: { sector:"Settore", country:"Paese", sponsor:"Sponsor", premium:"Premium", partner:"Partner",
          learn_more:"Scopri di più", overview:"Panoramica", missions:"Mansioni", skills:"Competenze", training:"Formazione", access:"Accesso", market:"Mercato", salary:"Stipendio",
          work_environment:"Ambiente di lavoro", profile:"Profilo", career_path:"Percorso di carriera",
          faqs:"Domande frequenti",
          not_available_title:"Non disponibile",
          not_available_msg_prefix:"Questo lavoro non esiste per il paese ",
          missing_job_title:"Mestiere mancante",
          missing_job_msg:"Usa il parametro URL ?metier=slug.",
          no_faq:"Nessuna domanda disponibile per questo mestiere.",
          salary:"Stipendio",
          junior:"Junior",
          mid:"Mid",
          senior:"Senior",
          key_indicators:"Indicatori chiave",
          key_fields:"Aree chiave",
          must_have:"Competenze indispensabili",
          soft_skills:"Soft skills",
          tools_stack:"Strumenti / stack",
          skills_path:"Competenze & percorso",
          certifications:"Certificazioni",
          schools_paths:"Scuole & percorsi",
          portfolio_projects:"Progetti / portfolio",
          additional_info:"Informazioni aggiuntive"
}
  };

  function ui(lang, key){
    lang = String(lang||"en").toLowerCase();
    var base = I18N[lang] || I18N.en;
    return (base && base[key]) || (I18N.en && I18N.en[key]) || key;
  }

  function langFromCtx(ctx){
  return normLang((ctx && (ctx.finalLang || (ctx.country && (ctx.country.langue_finale || ctx.country.lang_finale || ctx.country.final_lang || ctx.country.finalLang || ctx.country.lang || ctx.country.language || ctx.country.default_lang || ctx.country.defaultLang)))) || 'en');
}
  function log(){ if (DEBUG) try{ console.log.apply(console, arguments); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, arguments); }catch(e){} }

  // ---------- helpers ----------
  function norm(s){ return stripHtmlToText(s||""); }
  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function sectorToLabel(v){
    // Accept string, object, reference-like, or array; return a short label string.
    if (!v) return "";
    if (Array.isArray(v)) return sectorToLabel(v[0]);

    // objects
    if (typeof v === "object"){
      var s = v.name || v.Nom || v.title || v.titre || v.label || v.value || v.text || v.slug || v.Slug;
      if (!s && v.item) s = v.item.name || v.item.Nom || v.item.title || v.item.label || v.item.slug || v.item.Slug;
      s = String(s||"").replace(/\s+/g," ").trim();
      return sectorToLabel(s);
    }

    // strings / scalars
    var s2 = stripHtmlToText(v);
    s2 = String(s2||"").replace(/\s+/g," ").trim();
    if (!s2) return "";

    // Hide ugly ids (uuid/hex/long hashes) rather than display them
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s2)) return "";
    if (/^[0-9a-f]{16,}$/i.test(s2) && s2.indexOf(" ") === -1) return "";

    // Prettify slug-like values: "fonction-publique-management-public" -> "Fonction publique management public"
    if (/^[a-z0-9-]+$/.test(s2) && s2.indexOf("-") !== -1 && s2.indexOf(" ") === -1){
      var words = s2.split("-").filter(Boolean).map(function(w){
        return w ? (w.charAt(0).toUpperCase() + w.slice(1)) : "";
      });
      return words.join(" ");
    }

    return s2;
  }


  function pickSectorFromObject(obj){
    if (!obj || typeof obj !== "object") return "";
    // 1) common explicit keys (Webflow exports & API)
    var keys = [
      "secteur","sector","secteur_activite","secteurActivite","secteur_d_activite",
      "secteurActiviteRef","secteur_activite_ref","secteur_d_activite_ref",
      "secteurActivite_name","secteur_activite_name","secteur_d_activite_name",
      "industry","industrie","industry_sector","industrySector","sector_activity","sectorActivity",
      "hiring_sectors","hiringSectors","hiringSectorsText","secteurs_recrutement","secteursRecrutement","secteur_recrutement","secteurRecrutement",
      "domaine","domaine_activite","domaineActivite","activitySector","activity_sector",
      "category","categorie","cat","family","famille",
      "Secteur d’activité","Secteur d'activite","Secteur d’activité (ref)","Secteur d'activité (ref)",
      "Industrie","Industry","Domaine","Domaine d’activité","Domaine d'activite",
      "Secteur activité","Secteur activite","Secteur_activite","secteur activité","secteur activite","secteur_activite_label","secteur_activite_name","Secteur activité (label)","Secteur activité - label",
    ];
    for (var i=0;i<keys.length;i++){
      var k = keys[i];
      if (Object.prototype.hasOwnProperty.call(obj,k) && obj[k]) return obj[k];
    }
    // 2) fallback: scan any key that looks like sector/industry/domain
    for (var kk in obj){
      if (!Object.prototype.hasOwnProperty.call(obj,kk)) continue;
      if (!obj[kk]) continue;
      var low = String(kk).toLowerCase();
      if (low.indexOf("secteur")>=0 || low.indexOf("sector")>=0 || low.indexOf("industry")>=0 || low.indexOf("industrie")>=0 || low.indexOf("domaine")>=0){
        return obj[kk];
      }
    }

    // Heuristic: pick any key that looks like "secteur activite"
    try{
      for (var k in obj){
        if (!Object.prototype.hasOwnProperty.call(obj,k)) continue;
        var lk = String(k||"").toLowerCase();
        if (lk.indexOf("secteur") !== -1 && (lk.indexOf("activ") !== -1 || lk.indexOf("activité") !== -1)){
          var vv = obj[k];
          var tv = toText(vv);
          if (tv) return tv;
        }
      }
    }catch(e){}

    return "";
  }

  function pickSectorFromSources(metier, fiche, mpb){
    // Prefer Airtable fiche label over catalog/metier codes
    return pickSectorFromObject(fiche) || pickSectorFromObject(metier) || pickSectorFromObject(mpb) || "";
  }

  function detectSectorFromDOM(){
    // Best-effort: try to read sector text from hidden CMS exports if present
    var sels = [
      "[data-metier-sector]",
      "[data-sector]",
      ".js-metier-sector",
      ".js-metier-secteur",
      ".js-metier-secteur-activite",
      ".js-metier-secteur_activite",
      ".js-metier-secteur-activite-name",
      ".js-secteur-activite",
      ".js-sector",
      ".js-secteur",
      "[class*='metier-sector']",
      "[class*='secteur-activite']"
    ];
    for (var i=0;i<sels.length;i++){
      var el = document.querySelector(sels[i]);
      var t = el ? (el.getAttribute("data-sector") || el.getAttribute("data-metier-sector") || el.textContent || "") : "";
      t = String(t||"").replace(/\s+/g," ").trim();
      if (!t) continue;

      // Ignore the filter UI placeholders (they are not real sector values)
      var low = t.toLowerCase();
      if (low === "secteur d’activité" || low === "secteur d'activite" || low === "secteur d'activité" || low === "sector") continue;

      // Ignore values coming from the visible filter bar
      try{
        var p = el, guard = false;
        for (var k=0;k<8 && p;k++){
          if (p.getAttribute && p.getAttribute("data-ulydia-filters") === "1") { guard = true; break; }
          if (p.classList && (p.classList.contains("ulydia-filters") || p.classList.contains("filters-bar"))) { guard = true; break; }
          p = p.parentElement;
        }
        if (guard) continue;
      }catch(e){}

      return t;
    }

    // Heuristic: pick any key that looks like "secteur activite"
    try{
      for (var k in obj){
        if (!Object.prototype.hasOwnProperty.call(obj,k)) continue;
        var lk = String(k||"").toLowerCase();
        if (lk.indexOf("secteur") !== -1 && (lk.indexOf("activ") !== -1 || lk.indexOf("activité") !== -1)){
          var vv = obj[k];
          var tv = toText(vv);
          if (tv) return tv;
        }
      }
    }catch(e){}

    return "";
  }



  // ---------- i18n helper (safe) ----------
  // System messages are in English; page content titles come from finalLang when you provide translations.
  function tr(key, params){
    // Try to use whatever i18n engine you load (ulydia-i18n.v1.3.js), fallback to key.
    var lang = (typeof finalLang !== "undefined" && finalLang) ? String(finalLang).toLowerCase()
             : (window.__ULYDIA_LANG_FINAL__ ? String(window.__ULYDIA_LANG_FINAL__).toLowerCase() : "en");
    var i18n = window.ULYDIA_I18N || window.__ULYDIA_I18N__ || window.ulydiaI18n || null;
    var out = null;

    try{
      if (i18n){
        if (typeof i18n.t === "function") out = i18n.t(key, params, lang);
        else if (typeof i18n.tr === "function") out = i18n.tr(key, params, lang);
        else if (i18n[lang] && i18n[lang][key]) out = i18n[lang][key];
        else if (i18n[key]) out = i18n[key];
      }
    }catch(e){ /* ignore */ }

    if (out == null) out = String(key || "");

    if (params && typeof out === "string"){
      out = out.replace(/\{\{(\w+)\}\}/g, function(_,k){ return (params[k] != null ? String(params[k]) : ""); });
      out = out.replace(/\{(\w+)\}/g, function(_,k){ return (params[k] != null ? String(params[k]) : ""); });
    }
    return out;
  }


// ---------- pick helpers (MPB-safe) ----------
function pickText(){
  for (var i=0;i<arguments.length;i++){
    var v = arguments[i];
    if (v == null) continue;
    if (typeof v === "string"){
      var t = v.replace(/\s+/g," ").trim();
      if (t) return t;
    }else if (typeof v === "number"){
      if (isFinite(v)) return String(v);
    }else if (typeof v === "object"){
      // Webflow exports sometimes as {value:"..."} or {text:"..."}
      var tv = (typeof v.value === "string" ? v.value : (typeof v.text === "string" ? v.text : ""));
      if (tv && tv.trim()) return tv.trim();
    }
  }
  return "";
}

function pickHTML(){
  for (var i=0;i<arguments.length;i++){
    var v = arguments[i];
    if (v == null) continue;
    if (typeof v === "string"){
      var h = v.trim();
      if (h) return h;
    }else if (typeof v === "object"){
      var hv = (typeof v.html === "string" ? v.html : (typeof v.value === "string" ? v.value : ""));
      if (hv && hv.trim()) return hv.trim();
    }
  }
  return "";
}

function pickNumber(){
  for (var i=0;i<arguments.length;i++){
    var v = arguments[i];
    if (v == null) continue;
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string"){
      var t = v.trim();
      if (!t) continue;
      t = t.replace(/\s/g,"").replace(/,/g,".");
      var n = parseFloat(t.replace(/[^0-9.\-]/g,""));
      if (isFinite(n)) return n;
    }
  }
  return null;
}

  function pickUrl(){
    for (var i=0;i<arguments.length;i++){
      var v = arguments[i];
      if (!v) continue;
      if (typeof v === "string"){
        var s = v.trim();
        if (s) return s;
      }
      if (typeof v === "object"){
        // Webflow image field sometimes is {url:...}
        var u = v.url || v.src || v.href;
        if (u && String(u).trim()) return String(u).trim();
      }
    }
    return "";
  }


  function pickSponsorUrl(s, which){
    // which: 'wide'|'square'
    if (!s) return "";
    var wide = pickUrl(s.logo_2 || s.logo2 || s.square || s.banner_square || s.bannerSquare || s.image_2 || s.image2 || s.img2 || s.url2);
    var sq   = pickUrl(s.logo_1 || s.logo1 || s.wide || s.banner_wide || s.bannerWide || s.image_1 || s.image1 || s.img1 || s.url1);
    return (which === 'square') ? (sq || wide) : (wide || sq);
  }

  function pickSponsorLink(s){
    if (!s) return "";
    // Airtable may store partner link under various keys
    return pickUrl(
      s.link, s.url, s.href, s.website, s.site, s.company_url, s.companyUrl,
      s.sponsor_url, s.sponsorUrl, s.link_url, s.linkUrl,
      s.cta_url, s.ctaUrl, s.redirect, s.redirect_url, s.redirectUrl
    );
  }

  function parseJSONScript(id){
    var el = document.getElementById(id);
    if (!el) return null;
    var txt = (el.textContent||"").trim();
    if (!txt) return null;
    try{ return JSON.parse(txt); }catch(e){ return null; }
  }
  function slugify(s){
    s = norm(s).toLowerCase();
    // replace french accents
    s = s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : s;
    s = s.replace(/['’]/g,"");
    s = s.replace(/[^a-z0-9]+/g, "-");
    s = s.replace(/^-+|-+$/g, "");
    return s;
  }

  function getQuery(){
    var q = new URLSearchParams(location.search);
    var metier = q.get("metier") || "";
    var country = q.get("country") || q.get("pays") || "";
    return { metier: metier.trim(), country: country.trim().toUpperCase() };
  }

  // ---------------------------------------------------------
  // Visitor country (ipinfo) — used when URL doesn't provide ?country=
  // caches in sessionStorage for the session
  // ---------------------------------------------------------
  function getVisitorIso(cb){
    try{
      var cached = sessionStorage.getItem("ULYDIA_VISITOR_ISO");
      if (cached && /^[A-Z]{2}$/.test(cached)) return cb(cached);
    }catch(e){}

    var token = window.ULYDIA_IPINFO_TOKEN || window.ULYDIA_IPINFO || "";
    if (!token) return cb(null);

    fetch("https://ipinfo.io/json?token=" + encodeURIComponent(token), { credentials:"omit" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){

        // ✅ Prefer FAQ + MPB coming from Worker (Airtable), fallback to DOM arrays
        try{
          var fa = j && (j.faq || j.faqs || j.FAQ || j.FAQS);
          if (Array.isArray(fa)) window.__ULYDIA_FAQS__ = fa;
        }catch(e){}
        try{
          var bp = j && (j.blocs_pays || j.blocsPays || j.mpb || j.MPB);
          if (Array.isArray(bp)) window.__ULYDIA_METIER_PAYS_BLOCS__ = bp;
        }catch(e){}

        var iso = (j && j.country ? String(j.country).toUpperCase() : null);
        if (iso && /^[A-Z]{2}$/.test(iso)){
          try{ sessionStorage.setItem("ULYDIA_VISITOR_ISO", iso); }catch(e){}
          return cb(iso);
        }
        cb(null);
      })
      .catch(function(){ cb(null); });
  }

  function getMetiers(){
  var pd = getPageData() || {};
  return pickArr(
    window.__ULYDIA_METIERS__,
    pd.metiers, pd.metier, pd.jobs, pd.items,
    parseJSONScript('metiersData'),
    parseJSONScript('metierData')
  );
}


  

  function getFicheMetiers(){
    var pd = getPageData() || {};
    // 1) Arrays (legacy Webflow exports / JSON scripts)
    var arr = pickArr(
      window.__ULYDIA_FICHE_METIERS__,
      pd.fiche_metiers, pd.ficheMetiers, pd.fiches, pd.jobs_details, pd.fiche_jobs,
      parseJSONScript('ficheMetiersData'),
      parseJSONScript('ficheData')
    );
    if (Array.isArray(arr) && arr.length) return arr;

    // 2) Single object (Worker payload)
    var obj = (pd.metier || pd.fiche || pd.job || null);
    if (obj && typeof obj === "object") return [obj];

    return [];
  }

function getMPB(){
  var pd = getPageData() || {};
  var list = pickArr(
    window.__ULYDIA_METIER_PAYS_BLOCS__,
    pd.mpb, pd.metier_pays_blocs, pd.metierPaysBlocs,
    parseJSONScript('mpbData'),
    parseJSONScript('mpb')
  );
  // Worker may return a single MPB object for (metier, iso)
  if (list && !Array.isArray(list) && typeof list === "object") list = [list];
  if (!Array.isArray(list) || list.length===0){
    try{ var domList = readMPBFromDOM(); if (domList && domList.length) list = domList; }catch(e){}
  }
  // Fallback: if legacy flattener exposed a single MPB object
  if ((!Array.isArray(list) || !list.length) && window.__ULYDIA_BLOC__){
    try{ list = [window.__ULYDIA_BLOC__]; }catch(e){}
  }
  return Array.isArray(list)?list:[];
}

  function getFAQs(){
    var pd = null;
    var fw = null;
    try{ pd = getPageData && getPageData(); }catch(e){ pd = null; }
    if (pd){
      fw = pd.faq || pd.faqs || pd.FAQ || pd.FAQs || null;
      // Worker may wrap FAQ in {records:[...]} or {items:[...]} etc.
      if (fw && !Array.isArray(fw) && typeof fw === "object"){
        if (Array.isArray(fw.records)) fw = fw.records;
        else if (Array.isArray(fw.items)) fw = fw.items;
        else if (Array.isArray(fw.data)) fw = fw.data;
        else if (Array.isArray(fw.rows)) fw = fw.rows;
      }
      if (fw && !Array.isArray(fw) && typeof fw === "object") fw = [fw];
      if (Array.isArray(fw) && fw.length){
        return normalizeFaqList(fw, pd.lang || pd.finalLang || pd.language || (pd.country && (pd.country.lang || pd.country.langue_finale)) || "en");
      }
    }

    // Prefer prebuilt array from CMS reader
    var arr = window.__ULYDIA_FAQS__;
    if (Array.isArray(arr) && arr.length) return arr;

    // DOM fallback (hidden Webflow Collection List)
    try{
      var wrap = document.querySelector(".ul-cms-faq-source") || document.querySelector(".ul-cms-source") || document.querySelector("#ul-cms-source");
      if (!wrap) return [];
      var items = wrap.querySelectorAll(".w-dyn-item");
      if (!items || !items.length) return [];
      var out = [];
      for (var i=0;i<items.length;i++){
        var it = items[i];
        var nameEl = it.querySelector(".js-faq-name") || it.querySelector(".js-faq-metier") || it.querySelector(".js-faq-title-metier");
        var qEl    = it.querySelector(".js-faq-question") || it.querySelector(".js-faq-q");
        var aEl    = it.querySelector(".js-faq-answer") || it.querySelector(".js-faq-a");
        var linkEl = it.querySelector("a[href]");
        var slug = "";
        if (linkEl && linkEl.getAttribute){
          var href = String(linkEl.getAttribute("href")||"");
          var m = href.split("?")[0].split("#")[0].split("/");
          slug = m && m.length ? (m[m.length-1]||"") : "";
        }
        out.push({
          slug: slugify(slug || (nameEl && nameEl.textContent) || ""),
          question: norm(qEl && qEl.textContent),
          reponse: (aEl && aEl.innerHTML) ? String(aEl.innerHTML||"").trim() : ""
        });
      }
      return out;
    }catch(e){ return []; }
  }

  function normalizeFaqList(list, lang){
    lang = normLang(lang || "en");
    var qKey = (lang === "fr") ? "Question_FR" :
               (lang === "en") ? "Question_EN" :
               (lang === "de") ? "Question_DE" :
               (lang === "es") ? "Question_ES" :
               (lang === "it") ? "Question_IT" : "";
    var aKey = (lang === "fr") ? "Reponse_FR" :
               (lang === "en") ? "Reponse_EN" :
               (lang === "de") ? "Reponse_DE" :
               (lang === "es") ? "Reponse_ES" :
               (lang === "it") ? "Reponse_IT" : "";

    function pick(obj, keys){
      for (var i=0;i<keys.length;i++){
        var k = keys[i];
        if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
      }
      return "";
    }

    var out = [];
    (list||[]).forEach(function(f){
      if (!f) return;
      var q = pick(f, [ "question","Question","q","Q", qKey, "Question_FR","Question_EN","Question_DE","Question_ES","Question_IT" ]);
      var a = pick(f, [ "reponse","réponse","answer_html","answer","a","A", aKey, "Reponse_FR","Reponse_EN","Reponse_DE","Reponse_ES","Reponse_IT", "Response_FR","Response_EN","Response_DE","Response_ES","Response_IT" ]);
      var num = pick(f, [ "FAQ_NUM","faq_num","num","order","ordre" ]);
      var slug = pick(f, [ "metier_slug","slug","metier","job_slug","name" ]);
      q = String(q||"").trim();
      if (!q) return;
      out.push({
        slug: slugify(slug||""),
        order: parseInt(num,10),
        question: q,
        reponse: String(a||"")
      });
    });

    out.sort(function(a,b){
      var na = isNaN(a.order) ? 1e9 : a.order;
      var nb = isNaN(b.order) ? 1e9 : b.order;
      return na-nb;
    });
    return out;
  }

function getCountries(){
  // Prefer pageData v29 if present
  try{
    var pd = (window.__ULYDIA_METIER_PAGE_V29__) || null;
    if (pd){
      var arr = pd.countries || pd.Countries || pd.pays || pd.Pays || pd.country_list || pd.countryList;
      if (Array.isArray(arr)) return arr;
    }
  }catch(e){}
  // Fallback to catalog
  try{
    var cat = window.__ULYDIA_CATALOG__;
    if (cat && Array.isArray(cat.countries)) return cat.countries;
  }catch(e){}
  return [];
}



  function findCountry(iso){
    iso = String(iso||"").toUpperCase();
    var list = getCountries();
    return (list||[]).find(function(c){
      if (!c) return false;
      var v = String(c.iso || c.code_iso || c.codeIso || c.country_code || c.countryCode || c.code || "").toUpperCase();
      return v === iso;
    }) || null;
  }

  function normalizeIso(value){
    // Accept ISO2 (FR) or variants like "FR - France", "France", "fr", etc.
    var raw = String(value||"").replace(/\u00a0/g," ").trim();
    if (!raw) return "";
    var up = raw.toUpperCase();

    // "FR - France" / "FR: France" / "FR/France"
    var m = up.match(/^([A-Z]{2})\b/);
    if (m) return m[1];

    // If it's already ISO2
    if (/^[A-Z]{2}$/.test(up)) return up;

    // Try map by country name via Countries export/catalog
    var key = slugify(raw);
    if (!key) return up;

    var list = getCountries();
    if (Array.isArray(list)){
      for (var i=0;i<list.length;i++){
        var c = list[i];
        if (!c) continue;
        var iso = String(c.iso || c.code_iso || c.codeIso || c.country_code || c.countryCode || c.code || "").toUpperCase();
        if (!iso || !/^[A-Z]{2}$/.test(iso)) continue;

        var nm = c.label || c.name || c.pays || c.country || "";
        if (nm && slugify(nm) === key) return iso;

        var nm2 = c.nom || c.native_name || c.nativeName || "";
        if (nm2 && slugify(nm2) === key) return iso;
      }

    }
    return up;
  }


// ---------- Currency helpers (source of truth: Country CMS or catalog.json) ----------
function __ulPick(){
  for (var i=0;i<arguments.length;i++){
    var v = arguments[i];
    if (v == null) continue;
    if (typeof v === "string"){
      var s = v.replace(/\s+/g," ").trim();
      if (s) return s;
    }
  }
  return "";
}

// Single, collision-safe formatter (EUR -> "EUR (€)")
function __ulFormatCurrency(code){
  var s = String(code||"").trim();
  if (!s) return "";
  // Already like "EUR (€)"
  if (/[A-Z]{3}\s*\(.+\)/.test(s)) return s;

  var up = s.toUpperCase();
  // symbol-only -> ISO
  if (up === "€") up = "EUR";
  if (up === "$") up = "USD";
  if (up === "£") up = "GBP";
  if (up === "¥") up = "JPY";

  var map = { EUR:"€", USD:"$", GBP:"£", JPY:"¥", CAD:"$", AUD:"$", CHF:"CHF" };
  var sym = map[up];
  if (sym) return up + " (" + sym + ")";

  // detect combined strings
  if (/EUR/i.test(s) || s.indexOf("€")>-1) return "EUR (€)";
  if (/USD/i.test(s) || s.indexOf("$")>-1) return "USD ($)";
  if (/GBP/i.test(s) || s.indexOf("£")>-1) return "GBP (£)";
  if (/JPY/i.test(s) || s.indexOf("¥")>-1) return "JPY (¥)";
  if (/CHF/i.test(s)) return "CHF (CHF)";
  return up;
}

function __ulGetCurrencyFromCountry(ctx){
  try{
    var iso = (ctx && ctx.iso) ? String(ctx.iso).toUpperCase() : "";
    var c = (ctx && ctx.country) ? ctx.country : null;

    // 1) Countries collection (already loaded in ctx.country or getCountries())
    var cur = __ulPick(
      c && (c.currency || c.devise || c.monnaie || c.currency_code || c.currencyCode || c.code_devise || c.codeDevise),
      c && (c.currency_iso || c.currencyIso)
    );
    if (!cur && iso){
      try{
        var cc = (typeof findCountry === "function") ? findCountry(iso) : null;
        cur = __ulPick(
          cc && (cc.currency || cc.devise || cc.monnaie || cc.currency_code || cc.currencyCode || cc.code_devise || cc.codeDevise),
          cc && (cc.currency_iso || cc.currencyIso)
        );
      }catch(e){}
    }
    if (cur) return cur;

    // 2) catalog.json (if it has currency fields)
    if (iso && typeof findCatalogCountrySync === "function"){
      var cat = findCatalogCountrySync(iso);
      cur = __ulPick(
        cat && (cat.currency || cat.devise || cat.monnaie || cat.currency_code || cat.currencyCode || cat.code_devise || cat.codeDevise),
        cat && (cat.currency_iso || cat.currencyIso)
      );
      if (cur) return cur;
    }
  }catch(e){}
  return "";
}


  
// ---------------------------------------------------------
// Airtable-first compatibility helpers
// Some legacy builds used findMetierBySlug/findFiche; ensure they exist
// and gracefully fall back to arrays present in Webflow exports or Worker payload.
// ---------------------------------------------------------
function findMetierBySlug(slug){
  slug = slugify(slug);
  var list = getMetiers();
  if (!Array.isArray(list)) return null;

  for (var i=0;i<list.length;i++){
    var it = list[i];
    if (!it) continue;
    var s = it.metier_slug || it.slug || it.Slug || it.metier || it.name || it.Nom || it.title || "";
    if (slugify(s) === slug) return it;
  }
  return null;
}

function findFiche(slug){
  slug = slugify(slug);
  var list = getFicheMetiers();
  // Worker payload can provide a single object (fiche)
  if (list && !Array.isArray(list) && typeof list === "object"){
    // If object matches slug or has content, accept it
    var s0 = list.metier_slug || list.slug || list.Slug || list.metier || list.name || list.Nom || list.title || "";
    if (!s0 || slugify(s0) === slug) return list;
    // otherwise still return it; higher-level checks (ficheHasContent) will decide
    return list;
  }
  if (!Array.isArray(list)) return null;

  for (var i=0;i<list.length;i++){
    var it = list[i];
    if (!it) continue;
    var s = it.metier_slug || it.slug || it.Slug || it.metier || it.name || it.Nom || it.title || "";
    if (slugify(s) === slug) return it;
  }
  return null;
}
function findMPB(slug, iso){
  var list = getMPB();
  if (!Array.isArray(list)) list = [];
  var sslug = slugify(slug);
  var ciso  = normalizeIso(iso);

  function getIsoKey(b){
    return (b && (b.iso || b.code_iso || b.codeIso || b.country || b.country_code || b.countryCode || b.code)) || "";
  }
  function getMetierKey(b){
    return String((b && (b.slug || b.metier_slug || b.metierSlug || b.metier || b.metier_name || b.metierName || b.name)) || "").trim();
  }

  var matches = [];
  for (var i=0;i<list.length;i++){
    var b = list[i];
    if (!b) continue;

    var biso = normalizeIso(getIsoKey(b));
    if (ciso && biso && biso !== ciso) continue;

    var metKey = getMetierKey(b);
    if (!metKey) continue;

    var bslug = slugify(metKey);
    var ok = (bslug === sslug) || (bslug && (bslug.indexOf(sslug) === 0 || sslug.indexOf(bslug) === 0));
    if (!ok) continue;

    matches.push(b);
  }

  if (!matches.length){
    if (DEBUG){
      try{
        var sameIso = list.filter(function(x){ return x && (!ciso || normalizeIso(getIsoKey(x)) === ciso); });
        console.warn('[ULYDIA][MPB] not found', {
          target:{ metier: sslug, iso: ciso,
          top_fields:"Aree chiave",
          skills_must_have:"Competenze essenziali",
          remote_level:"Remoto",
          automation_risk:"Rischio automazione",
          time_to_employability:"Tempo di occupabilità",
          growth_outlook:"Crescita",
          market_demand:"Domanda",
          currency:"Valuta", education_level_label:"Livello richiesto"},
          total: list.length,
          sameIso: sameIso.length,
          sample: sameIso.slice(0,8).map(function(x){ return { iso: getIsoKey(x), metier: getMetierKey(x) }; })
        });
      }catch(e){}
    }
    return null;
  }

  // Single flat item -> normalize and return
  if (matches.length === 1 && (matches[0].formation_bloc || matches[0].acces_bloc || matches[0].marche_bloc || matches[0].environnements_bloc)){
    return normalizeMPB(matches[0]);
  }

  // Merge "one item per block" into blocks[]
  var merged = { iso: ciso, metier: slug, blocks: [] };
  matches.forEach(function(b){
    var title = pickText(b.bloc_title, b.blocTitle, b.title, b.titre, b.heading, b.block_title, b.key, b.section);
    var body  = pickHTML(b.bloc_body, b.blocBody, b.body, b.contenu, b.html, b.content, b.richText, b.rich_text, b.reponse, b.answer);
    var order = pickNumber(b.bloc_order, b.blocOrder, b.order, b.ordre, b.position, b.rank);

    // DOM reader may also return nested bloc
    if (!title && b.bloc && typeof b.bloc === 'object'){
      title = pickText(b.bloc.title, b.bloc.titre);
      body  = pickHTML(b.bloc.body, b.bloc.html);
      order = pickNumber(b.bloc.order);
    }

    if (!body) return;
    merged.blocks.push({ title: String(title||'').trim(), body: String(body||'').trim(), order: order });
  });

  merged.blocks.sort(function(a,b){
    var ao = (a.order==null? 9999 : a.order);
    var bo = (b.order==null? 9999 : b.order);
    if (ao !== bo) return ao - bo;
    return String(a.title||'').localeCompare(String(b.title||''));
  });

  return normalizeMPB(merged);
}

  
  function normalizeMPB(b){
    // Accept both "flat" MPB objects and legacy shapes (sections[] / chips{} / salary{})
    b = b || {};
    var out = {};

    function pick(){
      for (var i=0;i<arguments.length;i++){
        var v = arguments[i];
        if (v == null) continue;
        if (typeof v === "string"){
          var s = v.trim();
          if (s) return s;
        }else if (typeof v === "number"){
          if (isFinite(v)) return v;
        }else if (typeof v === "object"){
          // sometimes Webflow rich text exported as {value:"<p>..</p>"} or {html:".."}
          if (typeof v.value === "string" && v.value.trim()) return v.value.trim();
          if (typeof v.html === "string" && v.html.trim()) return v.html.trim();
          if (typeof v.text === "string" && v.text.trim()) return v.text.trim();
        }
      }
      return "";
    }

    // --- If legacy `sections` array exists, convert keys to flat ---
    if (Array.isArray(b.sections) && b.sections.length){
      b.sections.forEach(function(s){
        if (!s) return;
        var k = String(s.key || s.id || "").toLowerCase();
        var v = pick(s.value, s.html, s.text);
        if (!v) return;
        // normalize common keys
        if (k.indexOf("formation") !== -1) out.formation = v;
        else if (k.indexOf("acces") !== -1) out.acces = v;
        else if (k.indexOf("marche") !== -1) out.marche = v;
        else if (k.indexOf("salaire") !== -1) out.salaire = v;
        else if (k.indexOf("education_level_local") !== -1) out.education_level_local = v;
        else if (k.indexOf("education_level") !== -1) out.education_level = v;
        else if (k.indexOf("top_fields") !== -1) out.key_fields = v;
        else if (k.indexOf("certification") !== -1) out.certifications = v;
        else if (k.indexOf("schools_or_paths") !== -1) out.schools_or_paths = v;
        else if (k.indexOf("equival") !== -1) out.equivalences_reconversions = v;
        else if (k.indexOf("entry_routes") !== -1) out.entry_routes = v;
        else if (k.indexOf("first_job") !== -1) out.first_job_titles = v;
        else if (k.indexOf("typical_employ") !== -1) out.typical_employers = v;
        else if (k.indexOf("portfolio") !== -1) out.portfolio_projects = v;
        else if (k.indexOf("skills_must_have") !== -1) out.skills_must_have = v;
        else if (k.indexOf("soft_skills") !== -1) out.soft_skills = v;
        else if (k.indexOf("tools_stack") !== -1) out.tools_stack = v;
        else if (k.indexOf("time_to_employ") !== -1) out.time_to_employability = v;
        else if (k.indexOf("hiring_sectors") !== -1) out.hiring_sectors = v;
        else if (k.indexOf("degrees") !== -1) out.degrees_examples = v;
        else if (k.indexOf("growth") !== -1) out.growth_outlook = v;
        else if (k.indexOf("market_demand") !== -1) out.market_demand = v;
        else if (k.indexOf("salary_notes") !== -1) out.salary_notes = v;
      });
    }

    // --- Copy/normalize flat fields (preferred) ---
    out.metier = pick(b.metier, b.metier_name, b.name, out.metier);
    out.iso    = String(pick(b.iso, b.code_iso, b.country, b.country_code, out.iso) || "").toUpperCase();

    out.formation = pick(out.formation, b.formation, b.formation_bloc, b.formationBloc);
    out.acces     = pick(out.acces, b.acces, b.acces_bloc, b.accesBloc);
    out.marche    = pick(out.marche, b.marche, b.marche_bloc, b.marcheBloc);
    out.salaire   = pick(out.salaire, b.salaire, b.salaire_bloc, b.salaireBloc);
    out.environnements = pick(b.environnements, b.environnements_bloc, b.work_environment, b.workEnvironment); // optional

    out.education_level_local = pick(out.education_level_local, b.education_level_local, b.educationLevelLocal);
    out.education_level       = pick(out.education_level, b.education_level, b.educationLevel);

    // naming variants
    out.key_fields = pick(out.key_fields, b.key_fields, b.top_fields, b.Top_fields, b.topFields);
    out.certifications = pick(out.certifications, b.certifications, b.Certifications);
    out.schools_or_paths = pick(out.schools_or_paths, b.schools_or_paths, b.Schools_or_paths);
    out.equivalences_reconversions = pick(out.equivalences_reconversions, b.equivalences_reconversions, b.equivalences_reconversion, b.Equivalences_reconversion);
    out.entry_routes = pick(out.entry_routes, b.entry_routes, b.Entry_routes);
    out.first_job_titles = pick(out.first_job_titles, b.first_job_titles, b.First_job_titles);
    out.typical_employers = pick(out.typical_employers, b.typical_employers, b.Typical_employers);
    out.portfolio_projects = pick(out.portfolio_projects, b.portfolio_projects);
    out.skills_must_have = pick(out.skills_must_have, b.skills_must_have, b.Skills_must_have);
    out.soft_skills = pick(out.soft_skills, b.soft_skills, b.Soft_skills);
    out.tools_stack = pick(out.tools_stack, b.tools_stack, b.Tools_stack);

    out.time_to_employability = pick(out.time_to_employability, b.time_to_employability, b.Time_to_employability);
    out.hiring_sectors = pick(out.hiring_sectors, b.hiring_sectors, b.Hiring_sectors);
    out.degrees_examples = pick(out.degrees_examples, b.degrees_examples, b.Degrees_examples);
    out.growth_outlook = pick(out.growth_outlook, b.growth_outlook, b.Growth_outlook);
    out.market_demand = pick(out.market_demand, b.market_demand, b.Market_demand);
    out.salary_notes = pick(out.salary_notes, b.salary_notes, b.salary_note, b.salaryNotes);

    // chips / indicators (support both flat and nested)
    var chips = b.chips || {};
    out.remote_level = pick(b.remote_level, b.Remote_level, chips.Remote_level, chips.remote_level);
    out.automation_risk = pick(b.automation_risk, b.Automation_risk, chips.Automation_risk, chips.automation_risk);
    out.statut_generation = pick(b.statut_generation, b.Status_generation, chips.Status_generation, chips.statut_generation);
    out.devise = pick(b.devise, b.Devise, b.devise_symbol, b.Devise_symbol, b.currency, b.Currency, chips.Currency, chips.currency);

    // salary (support flat or nested)
    var sal = b.salary || {};
    function pickNum(){
      for (var i=0;i<arguments.length;i++){
        var v = arguments[i];
        if (v == null) continue;
        if (typeof v === "number" && isFinite(v)) return v;
        if (typeof v === "string"){
          var s = v.trim();
          if (!s) continue;
          s = s.replace(/\s/g,"").replace(/,/g,".");
          var n = parseFloat(s.replace(/[^0-9.]/g,""));
          if (isFinite(n)) return n;
        }
      }
      return null;
    }
    out.junior_min = pickNum(b.junior_min, b.Junior_min, b.salary_junior_min, b.Salary_junior_min, b.salaire_junior_min, b.Salaire_junior_min, b.juniorMin, (b.salary && b.salary.junior && b.salary.junior.min));
    out.junior_max = pickNum(b.junior_max, b.Junior_max, b.salary_junior_max, b.Salary_junior_max, b.salaire_junior_max, b.Salaire_junior_max, b.juniorMax, (b.salary && b.salary.junior && b.salary.junior.max));
    out.mid_min = pickNum(b.mid_min, b.Mid_min, b.salary_mid_min, b.Salary_mid_min, b.salaire_mid_min, b.Salaire_mid_min, b.confirmed_min, b.Confirmed_min, b.confirme_min, b.Confirme_min, b.midMin, (b.salary && b.salary.mid && b.salary.mid.min));
    out.mid_max = pickNum(b.mid_max, b.Mid_max, b.salary_mid_max, b.Salary_mid_max, b.salaire_mid_max, b.Salaire_mid_max, b.confirmed_max, b.Confirmed_max, b.confirme_max, b.Confirme_max, b.midMax, (b.salary && b.salary.mid && b.salary.mid.max));
    out.senior_min = pickNum(b.senior_min, b.Senior_min, b.salary_senior_min, b.Salary_senior_min, b.salaire_senior_min, b.Salaire_senior_min, b.seniorMin, (b.salary && b.salary.senior && b.salary.senior.min));
    out.senior_max = pickNum(b.senior_max, b.Senior_max, b.salary_senior_max, b.Salary_senior_max, b.salaire_senior_max, b.Salaire_senior_max, b.seniorMax, (b.salary && b.salary.senior && b.salary.senior.max));
    out.variable_share = pick(out.variable_share, b.salary_variable_share, b.salary_variable_sh, b.salary_variable_share_pct, b.salary_variable, b.variable_share, b.Variable_share, b.part_variable, b.Part_variable, b.partVariable, b.part_variable_pct, b.part_variable_minmax);

        // --- BF adapter aliases (keep Webflow model unchanged) ---
    out.formation = pick(out.formation, b.formation, b.formation_bloc, b.formationBloc);
    out.acces = pick(out.acces, b.acces, b.acces_bloc, b.accesBloc);
    out.marche = pick(out.marche, b.marche, b.marche_bloc, b.marcheBloc);
    out.environnements = pick(out.environnements, b.environnements, b.environnements_bloc, b.environnementsBloc);

    // Right-column fields
    out.education_level_local = pick(out.education_level_local, b.education_level_local, b.educationLevelLocal);
    out.education_level = pick(out.education_level, b.education_level, b.educationLevel);
    out.degrees_examples = pick(out.degrees_examples, b.degrees_examples, b.degreesExamples);
    out.first_job_titles = pick(out.first_job_titles, b.first_job_titles, b.firstJobTitles);
    out.typical_employers = pick(out.typical_employers, b.typical_employers, b.typicalEmployers);
    out.hiring_sectors = pick(out.hiring_sectors, b.hiring_sectors, b.hiringSectors);
    out.entry_routes = pick(out.entry_routes, b.entry_routes, b.entryRoutes);
    out.equivalences_reconversions = pick(out.equivalences_reconversions, b.equivalences_reconversions, b.equivalences_reconversion);
    out.skills_must_have = pick(out.skills_must_have, b.skills_must_have, b.skillsMustHave);
    out.soft_skills = pick(out.soft_skills, b.soft_skills, b.softSkills);
    out.tools_stack = pick(out.tools_stack, b.tools_stack, b.toolsStack);
    out.certifications = pick(out.certifications, b.certifications);
    out.schools_or_paths = pick(out.schools_or_paths, b.schools_or_paths, b.schoolsOrPaths);
    out.portfolio_projects = pick(out.portfolio_projects, b.portfolio_projects, b.portfolioProjects);
    out.time_to_employability = pick(out.time_to_employability, b.time_to_employability, b.timeToEmployability);
    out.growth_outlook = pick(out.growth_outlook, b.growth_outlook, b.growthOutlook);
    out.market_demand = pick(out.market_demand, b.market_demand, b.marketDemand);
    out.salary_notes = pick(out.salary_notes, b.salary_notes, b.salaryNotes);
    out.devise = pick(out.devise, b.devise, b.currency);

    // Salary numeric aliases
    out.junior_min = (out.junior_min!=null? out.junior_min : b.junior_min);
    out.junior_max = (out.junior_max!=null? out.junior_max : b.junior_max);
    out.mid_min    = (out.mid_min!=null? out.mid_min : b.mid_min);
    out.mid_max    = (out.mid_max!=null? out.mid_max : b.mid_max);
    out.senior_min = (out.senior_min!=null? out.senior_min : b.senior_min);
    out.senior_max = (out.senior_max!=null? out.senior_max : b.senior_max);
    out.variable_share = pick(out.variable_share, b.variable_share);

    // Clean MPB rich text fields (nbsp + listify on commas)
    ["formation","acces","marche","environnements",
     "education_level_local","education_level","degress_examples","degrees_examples",
     "first_job_titles","typical_employers","hiring_sectors","entry_routes","equivalences_reconversions",
     "skills_must_have","soft_skills","tools_stack","certifications","schools_or_paths","portfolio_projects",
     "time_to_employability","growth_outlook","market_demand","salary_notes"
    ].forEach(function(k){
      if (!out[k]) return;
      var h = String(out[k]||"");
      h = cleanRichHTML(h);
      // listify some fields that are typically CSV
      if (/(skills|fields|tools|sectors|degrees|titles|employers|routes|equivalences)/i.test(k)){
        h = listifyIfNeeded(h);
      }
      // Wrap in rich-content if it isn't already a wrapper
      if (h && !/class=["']rich-content/i.test(h)){
        h = '<div class="rich-content text-sm">' + h + '</div>';
      }
      out[k] = h;
    });

    return out;
  }

function findFAQsForMetier(metierSlug, ficheName, iso){
    var list = getFAQs();
    if (!Array.isArray(list) || !list.length) return [];

    var slug = slugify(metierSlug||"");
    var nameKey = slugify(ficheName||"");

    var isoU = normalizeIso(iso||"");

    var out = [];
    for (var i=0;i<list.length;i++){
      var f = list[i] || {};
      // metier name can be stored in name/metier/job/etc.
      var metName = norm(f.metier || f.name || f.job || f.fiche || f.metier_name || f.title);
      var metSlug = slugify(metName);

      // sometimes we only have the FAQ item slug (e.g. orthophoniste-94b0b)
      var recSlug = slugify(f.slug || f.record_slug || f.item_slug || "");
      var slugPrefixMatch = (recSlug && slug && (recSlug === slug || recSlug.indexOf(slug + "-") === 0));

      var nameMatch = false;
      if (nameKey){
        // match on NAME first (your requirement)
        if (metSlug && metSlug === nameKey) nameMatch = true;
        // fallback: if metier name is missing, allow matching by slug prefix
        if (!metSlug && slugPrefixMatch) nameMatch = true;
      } else {
        // if no ficheName provided, fallback to metierSlug
        if (metSlug && metSlug === slug) nameMatch = true;
        if (!metSlug && slugPrefixMatch) nameMatch = true;
      }

      if (!nameMatch) continue;

      // optional ISO filtering if present on FAQ items
      var itIso = normalizeIso(f.iso || f.country || f.code_iso || f.codeISO || "");
      if (itIso && isoU && itIso !== isoU) continue;

      out.push({
        question: norm(f.question || f.q),
        answer: String(f.answer || f.reponse || f.a || f.html || "").trim()
      });
    }

    // de-dupe by question
    var seen = {};
    var dedup = [];
    for (var j=0;j<out.length;j++){
      var k = slugify(out[j].question||"");
      if (!k) continue;
      if (seen[k]) continue;
      seen[k]=1;
      dedup.push(out[j]);
    }
    return dedup;
  }

  
  // ---------- Catalog (non-sponsor banners) ----------
  var CATALOG_URL = "https://ulydia-assets.pages.dev/assets/catalog.json";

  function loadCatalogOnce(){
    if (window.__ULYDIA_CATALOG__) return Promise.resolve(window.__ULYDIA_CATALOG__);
    if (window.__ULYDIA_CATALOG_PROMISE__) return window.__ULYDIA_CATALOG_PROMISE__;

    window.__ULYDIA_CATALOG_PROMISE__ = fetch(CATALOG_URL, { cache: "force-cache" })
      .then(function(r){ return r && r.ok ? r.json() : null; })
      .catch(function(){ return null; })
      .then(function(data){
        window.__ULYDIA_CATALOG__ = data || null;
        return window.__ULYDIA_CATALOG__;
      });

    return window.__ULYDIA_CATALOG_PROMISE__;
  }

  function mapCatalogCountry(c){
    if (!c) return null;
    var banners = c.banners || {};
    return {
      iso: String(c.iso || "").toUpperCase(),
      lang: c.langue_finale || c.lang || "",
      banner_wide: banners.image_1 || banners.banner_1 || banners.wide || "",
      banner_square: banners.image_2 || banners.banner_2 || banners.square || "",
      banner_text: banners.texte || "",
      banner_cta: banners.cta || ""
    };
  }

  function findCatalogCountrySync(iso){
    var cat = window.__ULYDIA_CATALOG__;
    if (!cat || !cat.countries) return null;
    var up = String(iso||"").trim().toUpperCase();
    for (var i=0;i<cat.countries.length;i++){
      var c = cat.countries[i];
      if (String(c && c.iso || "").toUpperCase() === up) return mapCatalogCountry(c);
    }
    return null;
  }

// ---------- Worker (sponsor) ----------
  function getWorkerUrl(){
    // accept older names
    return window.ULYDIA_WORKER_URL || window.__ULYDIA_WORKER_URL__ || window.ULYDIA_WORKER || "";
  }
  function getProxySecret(){
    return window.ULYDIA_PROXY_SECRET || window.ULYDIA_PROXY || window.ULYDIA_PROXY_TOKEN || "";
  }

  function fetchSponsor(metierSlug, iso){
  // Airtable sponsor banner via Worker (/v1/metier-page). Safe: never throw, never block render.
  return new Promise(function(resolve){
    try{
      var base = getWorkerUrl();
      if (!base || typeof base !== "string" || base.indexOf("http") !== 0){
        return resolve(null);
      }
      var finalLang = "fr";
      try{ finalLang = (getFinalLang(iso, null, null) || getBaseContentLang() || "fr"); }catch(e){ finalLang = (getBaseContentLang()||"fr"); }
      var url = base.replace(/\/+$/,"") + "/v1/metier-page?slug=" + encodeURIComponent(String(metierSlug||"")) +
        "&iso=" + encodeURIComponent(String(iso||"")) +
        "&lang=" + encodeURIComponent(String(finalLang||"fr"));
fetchWithTimeout(url, {
        headers: {
          "x-ulydia-proxy-secret": (window.ULYDIA_PROXY_SECRET || window.ULYDIA_PROXY_SECRET_2 || window.ULYDIA_PROXY || "")
        }
      }).then(function(r){
        if (!r || !r.ok) return null;
        return r.text().then(function(t){
          try{ return JSON.parse(t); }catch(e){ return null; }
        });
      }).then(function(j){
        if (!j || j.ok === false) return resolve(null);
        var s = j.sponsor || j.sponsoring || j.sponsorship || null;
        if (!s && j.pays && j.pays.sponsor) s = j.pays.sponsor;
        return resolve(s || null);
      }).catch(function(){ resolve(null); });
    }catch(e){ resolve(null); }
  });
}

// ✅ FETCH TIMEOUT (prevents infinite loader when network/CORS stalls)
// Use browser AbortController to abort hung requests (e.g., workers.dev 503 / CORS / pending)
function fetchWithTimeout(url, opts, timeoutMs){
  timeoutMs = (timeoutMs && timeoutMs>0) ? timeoutMs : 12000;
  try{
    if (typeof AbortController === "function"){
      var ctrl = new AbortController();
      var t = setTimeout(function(){ try{ ctrl.abort(); }catch(e){} }, timeoutMs);
      opts = opts || {};
      opts.signal = ctrl.signal;
      return fetch(url, opts).finally(function(){ try{ clearTimeout(t); }catch(e){} });
    }
  }catch(e){}
  // Fallback: no abort support
  return Promise.race([
    fetch(url, opts || {}),
    new Promise(function(_, rej){ setTimeout(function(){ rej(new Error("timeout")); }, timeoutMs); })
  ]);
}


function fetchMetierPageData(metierSlug, iso){
  // Full payload via Worker (/v1/metier-page). Safe: never throw.
  // ✅ DEDUP-FETCH: avoid spamming the Worker when routechange/init loops happen.
  try{
    var k = String(metierSlug||"") + "||" + String(iso||"");
    window.__ULYDIA_METIERPAGE_INFLIGHT__ = window.__ULYDIA_METIERPAGE_INFLIGHT__ || {};
    if (window.__ULYDIA_METIERPAGE_INFLIGHT__[k]) return window.__ULYDIA_METIERPAGE_INFLIGHT__[k];
  }catch(e){}

  var p = new Promise(function(resolve){
    try{
      var base = getWorkerUrl();
      if (!base || typeof base !== "string" || base.indexOf("http") !== 0) return resolve(null);

      var url = base.replace(/\/+$/,"") + "/v1/metier-page?slug=" + encodeURIComponent(String(metierSlug||"")) +
        "&iso=" + encodeURIComponent(String(iso||""));

      fetchWithTimeout(url, {
        headers: { "x-ulydia-proxy-secret": (getProxySecret() || "") }
      }).then(function(r){
        if (!r || !r.ok) return null;
        return r.text().then(function(t){ try{ return JSON.parse(t); }catch(e){ return null; } });
      }).then(function(j){
        if (!j || j.ok === false) return resolve(null);
        return resolve(j);
      }).catch(function(){ resolve(null); });
    }catch(e){ resolve(null); }
  });


  try{
    var k2 = String(metierSlug||"") + "||" + String(iso||"");
    if (window.__ULYDIA_METIERPAGE_INFLIGHT__) window.__ULYDIA_METIERPAGE_INFLIGHT__[k2] = p;
    p.then(function(){ try{ if (window.__ULYDIA_METIERPAGE_INFLIGHT__) delete window.__ULYDIA_METIERPAGE_INFLIGHT__[k2]; }catch(e){}; })
     .catch(function(){ try{ if (window.__ULYDIA_METIERPAGE_INFLIGHT__) delete window.__ULYDIA_METIERPAGE_INFLIGHT__[k2]; }catch(e){}; });
  }catch(e){}
  return p;
}

// ---------- DOM render ----------
  function ensureRoot(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root){
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.appendChild(root);
    }
    root.innerHTML = "";
    return root;
  }

  function injectCSS(){

    if (document.getElementById("ulydia-metier-v35-css")) return;
    var css = `
      :root {
        --primary: #6366f1;
        --text: #0f172a;
        --muted: #64748b;
        --border: #e2e8f0;
        --bg: #ffffff;
        --card: #f8fafc;
        --accent: #f59e0b;
        --success: #10b981;
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
        --shadow-card: 0 4px 20px rgba(0,0,0,.08);
        --font-family: 'Outfit', sans-serif;
        --font-base: 15px;
      }
      body{font-family:var(--font-family,'Outfit',system-ui);font-size:var(--font-base,15px);background:#f7f8ff;color:var(--text);}
      #ulydia-metier-root{max-width:1100px;margin:0 auto;padding:34px 18px 80px 18px;}
      .u-wrap{max-width:1100px;margin:0 auto;padding:34px 18px 80px 18px;}
      #ulydia-metier-root .u-row{display:grid;grid-template-columns:1.75fr 0.75fr !important;gap:24px;align-items:start;}#ulydia-metier-root .u-right{max-width:420px;width:100%;}
      @media(max-width:980px){#ulydia-metier-root .u-row{grid-template-columns:1fr !important;}}
      .u-title{font-size:56px;line-height:1.05;margin:0 0 10px 0;color:var(--primary);font-weight:800;letter-spacing:-0.02em;}
      @media(max-width:680px){.u-title{font-size:42px;}}
      .u-accroche{color:rgba(51,65,85,.86);font-size:16px;line-height:1.55;margin:0 0 18px 0;max-width:1100px;font-weight:800;}
      .u-pills{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px 0;}
      .u-pill{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border);background:#fff;border-radius:999px;color:var(--text);font-weight:600;font-size:13px;}
      .u-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);overflow:hidden;transition:all .3s ease;}
      .u-card:hover{box-shadow:0 8px 30px rgba(0,0,0,.12);transform:translateY(-2px);} 
      .ul-premium-square{padding:12px;background:linear-gradient(180deg,#ffffff,#fbfbff);} 
      .u-sponsor-square-link img{width:100%;display:block;border-radius:14px;} 
.u-sponsor-frame{background:#fff;border:1px solid var(--border);border-radius:18px;padding:14px;box-shadow:0 10px 26px rgba(20,20,60,.08);margin:8px 14px 14px 14px;}
      .u-sponsor-frame a{display:block;}
      .u-sponsor-frame img{width:100%;height:auto;display:block;border-radius:14px;object-fit:cover;}
      .u-overview-para p{margin:0 0 10px 0;line-height:1.7;}
      .u-overview-para p:last-child{margin-bottom:0;}
      .u-card-h{padding:12px 16px;font-weight:800;color:var(--text);background:linear-gradient(90deg,#eef2ff,#f8fafc);border-bottom:1px solid var(--border);}

      .u-card-h.bg-purple{background:linear-gradient(90deg,#6d28d9,#7c3aed);color:#fff;border-bottom:0;}
      .u-card-h.bg-green{background:linear-gradient(90deg,#059669,#22c55e);color:#fff;border-bottom:0;}
      .u-card-h.bg-cyan{background:linear-gradient(90deg,#06b6d4,#67e8f9);color:#0f172a;border-bottom:0;}
      .u-card-h.bg-orange{background:linear-gradient(90deg,#f59e0b,#fdba74);color:#0f172a;border-bottom:0;}
      .u-card-h.bg-blue{background:linear-gradient(90deg,#60a5fa,#bfdbfe);color:#0f172a;border-bottom:0;}
      .u-card-h.bg-mint{background:linear-gradient(90deg,#86efac,#bbf7d0);color:#0f172a;border-bottom:0;}
      .u-ind-list{display:flex;flex-direction:column;gap:12px;}
      .u-ind-item{display:flex;gap:12px;align-items:center;padding:12px 12px;border:1px solid var(--border);border-radius:14px;background:#fff;}
      .u-ind-item{transition:transform .12s ease, box-shadow .12s ease;}
      .u-ind-item:hover{transform:scale(1.015);box-shadow:0 10px 24px rgba(20,20,60,.10);}

      .u-ind-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#ecfdf5;font-size:20px;flex:0 0 auto;}
      .u-ind-txt{display:flex;flex-direction:column;line-height:1.15;}
      .u-ind-lbl{font-size:12px;color:var(--muted);font-weight:800;}
      .u-ind-val{font-size:16px;font-weight:800;color:var(--text);}
      .u-ind-val.v-green{color:#10b981;}
      .u-ind-val.v-orange{color:#f59e0b;}
      .u-ind-val.v-red{color:#ef4444;}
      .u-ind-val.v-purple{color:#6366f1;}

.u-sal-wrap{display:flex;flex-direction:column;gap:10px;}
.u-sal-row{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:#fff;}
.u-sal-k{font-weight:700;color:rgba(17,24,39,70);}
.u-sal-v{font-weight:900;color:rgba(17,24,39,92);}
      .u-pillcol{display:flex;flex-direction:column;gap:10px;}
      .u-pillitem{display:block;width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(99,102,241,.55);background:rgba(99,102,241,.06);color:#3730a3;font-weight:800;font-size:13px;line-height:1.2;}
      .u-pillitem{transition:transform .15s ease, box-shadow .15s ease; cursor:default;}
      .u-pillitem:hover{transform:scale(1.03); box-shadow:0 8px 24px rgba(0,0,0,.10);}


      .u-ind-item[data-k="time_to_employability"] .u-ind-val,
      .u-ind-item[data-k="growth_outlook"] .u-ind-val,
      .u-ind-item[data-k="market_demand"] .u-ind-val{font-size:16px;font-weight:800;}
      .u-salary-row{border:1px solid var(--border);border-radius:16px;padding:14px 14px;background:#fff;margin-bottom:12px;}
      .u-salary-top{display:flex;align-items:center;justify-content:space-between;font-weight:900;color:#0f172a;}
      .u-salary-sub{margin-top:8px;color:var(--muted);font-weight:700;}
      .u-salary-bar{margin-top:10px;height:12px;border-radius:999px;background:#e2e8f0;overflow:hidden;}
      .u-salary-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#059669,#22c55e);width:0%;transition:width .9s cubic-bezier(.2,.9,.2,1);}

      .u-card-b{padding:16px;}
      .u-stack{display:flex;flex-direction:column;gap:14px;}
      .u-muted{color:var(--muted);}
      .u-section-title{margin:0;font-size:14px;font-weight:800;color:var(--text);}
      .u-rich p{margin:0 0 10px 0;}
      .u-rich ul{margin:10px 0 0 18px;}
      .u-rich li{margin:6px 0;}
      .u-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;padding:11px 14px;background:var(--primary);color:#fff;font-weight:800;font-size:13px;text-decoration:none;border:1px solid rgba(99,102,241,.25);}
      .u-btn:hover{filter:brightness(0.98);}
      /* Banners */
      .u-banner-wide{display:block;max-width:680px;margin:16px auto;text-decoration:none;}
      .u-banner-wide img{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--border);box-shadow:var(--shadow-card);}
      .u-banner-img-link img{transition:transform .3s ease;}
      .u-banner-img-link:hover img{transform:scale(1.02);}
      .u-banner-wide img{transition:transform .3s ease;}
      .u-banner-wide:hover img{transform:scale(1.02);}

      .u-premium{}
      .u-premium .u-card-b{padding:14px;}
      .u-prem-square{width:100%;aspect-ratio:1/1;border-radius:16px;border:1px solid var(--border);overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;}
      .u-prem-square img{width:100%;height:100%;object-fit:cover;display:block;}
      .u-prem-name{font-weight:900;}
      .u-prem-sub{color:var(--muted);font-size:12px;margin-top:2px;}
      .u-prem-row{display:grid;grid-template-columns:1fr;gap:12px;align-items:start;}
      .u-sq{width:100%;max-width:300px;aspect-ratio:1/1;border-radius:16px;border:1px solid var(--border);overflow:hidden;background:#fff;margin:0 auto;transition:transform .3s ease;}
      .u-sq:hover{transform:scale(1.02);}
      .u-sq img{width:100%;height:100%;object-fit:cover;display:block;}
      /* FAQ */
      .u-faq-item{border:1px solid var(--border);border-radius:14px;background:#fff;overflow:hidden;}
      .u-faq-q{padding:12px 14px;font-weight:800;cursor:pointer;display:flex;justify-content:space-between;gap:12px;}
      .u-faq-a{padding:0 14px 14px 14px;color:var(--text);display:none;}
      .u-faq-item.is-open .u-faq-a{display:block;}

      /* MPB visual rows */
      .u-mpb-rows{display:flex;flex-direction:column;gap:10px;}
      .u-mpb-row{display:flex;gap:12px;align-items:flex-start;padding:12px 12px;border:1px solid var(--border);border-radius:14px;background:#fff;}
      .u-mpb-ico{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:rgba(99,102,241,.10);border:1px solid rgba(99,102,241,.18);font-size:18px;}
      .u-mpb-txt{font-size:14px;line-height:1.45;color:var(--text);font-weight:650;}
      .u-mpb-paragraph{font-size:14px;line-height:1.55;color:var(--text);}

      /* Make rich lists look like icon lists in MPB sections */
      .card[data-section="training"] .rich-content ul,
      .card[data-section="access"] .rich-content ul,
      .card[data-section="market"] .rich-content ul,
      .card[data-section="work_environment"] .rich-content ul{
        list-style:none;
        margin:10px 0 0 0;
        padding:0;
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .card[data-section="training"] .rich-content li,
      .card[data-section="access"] .rich-content li,
      .card[data-section="market"] .rich-content li,
      .card[data-section="work_environment"] .rich-content li{
        position:relative;
        padding:12px 12px 12px 52px;
        border:1px solid var(--border);
        border-radius:14px;
        background:#fff;
        margin:0;
      }

      /* Hover zoom on Work environment items */
      .card[data-section="work_environment"] .rich-content li{
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        will-change: transform;
      }
      .card[data-section="work_environment"] .rich-content li:hover{
        transform: scale(1.012);
        box-shadow: 0 10px 26px rgba(0,0,0,0.08);
        border-color: rgba(120,90,255,0.40);
      }
      .card[data-section="training"] .rich-content li:before,
      .card[data-section="access"] .rich-content li:before,
      .card[data-section="market"] .rich-content li:before,
      .card[data-section="work_environment"] .rich-content li:before{
        content:"✨";
        position:absolute;
        left:12px; top:12px;
        width:30px; height:30px;
        border-radius:12px;
        display:flex;align-items:center;justify-content:center;
        background:rgba(99,102,241,.10);
        border:1px solid rgba(99,102,241,.18);
      }
      .card[data-section="training"] .rich-content li:before{content:"🎓";}
      .card[data-section="access"] .rich-content li:before{content:"🚪";}
      .card[data-section="market"] .rich-content li:before{content:"📊";}
      .card[data-section="work_environment"] .rich-content li:before{content:"🏢";}

    

/* ULYDIA — BLOCS / DESIGN ONLY */
/* =========================================================
   ULYDIA — BLOCS / DESIGN ONLY (cards, hover, headers, kpis, salary, chips)
   Source: propal1-fiche metier.html + FIX13 base
========================================================= */

:root{
  --primary:#6366f1;
  --text:#0f172a;
  --muted:#64748b;
  --border:#e2e8f0;
  --bg:#ffffff;
  --card:#f8fafc;

  --accent:#f59e0b;
  --success:#10b981;

  --radius-sm:8px;
  --radius-md:12px;
  --radius-lg:16px;

  --shadow-card:0 4px 20px rgba(0,0,0,0.08);
  --font-family:'Outfit', sans-serif; /* si dispo */
  --font-base:15px;
}

/* ---- Gradients / Pastels (headers) ---- */
.gradient-primary{ background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); }
.gradient-accent { background:linear-gradient(135deg,#f59e0b 0%,#f97316 100%); }
.gradient-success{ background:linear-gradient(135deg,#10b981 0%,#059669 100%); }
/* Force Salary header to match green "Grille salariale" style */
.card[data-section="salary"] > .card-header{background:linear-gradient(135deg,#10b981 0%,#059669 100%) !important;}
.card[data-section="salary"] .section-title{color:#fff !important;}


.pastel-blue  { background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%); }
.pastel-purple{ background:linear-gradient(135deg,#e9d5ff 0%,#d8b4fe 100%); }
.pastel-green { background:linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%); }
.pastel-orange{ background:linear-gradient(135deg,#fed7aa 0%,#fdba74 100%); }
.pastel-pink  { background:linear-gradient(135deg,#fce7f3 0%,#fbcfe8 100%); }
.pastel-cyan  { background:linear-gradient(135deg,#cffafe 0%,#a5f3fc 100%); }

/* ---- Card (bloc principal) + hover “petit zoom” ---- */
.card{
  background:var(--card);
  border-radius:var(--radius-lg);
  box-shadow:var(--shadow-card);
  border:1px solid var(--border);
  padding:24px;
  transition:all .3s ease;
}

.card:hover{
  box-shadow:0 8px 30px rgba(0,0,0,0.12);
  transform:translateY(-2px);
}

/* Header interne des cards (bandeau) */
.card-header{
  padding:16px 20px;
  border-radius:var(--radius-md) var(--radius-md) 0 0;
  margin:-24px -24px 20px -24px;
}

/* --- Card headers: always colored (both columns) --- */
.card-header{
  background:linear-gradient(90deg,#eef2ff,#f8fafc);
  border-bottom:1px solid var(--border);
}

/* Strong gradients */
.card-header.bg-purple{background:linear-gradient(90deg,#6d28d9,#7c3aed)!important;color:#fff!important;border-bottom:0;}
.card-header.bg-green{background:linear-gradient(90deg,#059669,#22c55e)!important;color:#fff!important;border-bottom:0;}
.card-header.bg-cyan{background:linear-gradient(90deg,#06b6d4,#67e8f9)!important;color:#0f172a!important;border-bottom:0;}
.card-header.bg-orange{background:linear-gradient(90deg,#f59e0b,#fdba74)!important;color:#0f172a!important;border-bottom:0;}
.card-header.bg-blue{background:linear-gradient(90deg,#60a5fa,#bfdbfe)!important;color:#0f172a!important;border-bottom:0;}
.card-header.bg-mint{background:linear-gradient(90deg,#86efac,#bbf7d0)!important;color:#0f172a!important;border-bottom:0;}

/* Pastels (ensure they apply on headers too) */
.card-header.pastel-blue{background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)!important;}
.card-header.pastel-purple{background:linear-gradient(135deg,#e9d5ff 0%,#d8b4fe 100%)!important;}
.card-header.pastel-cyan{background:linear-gradient(135deg,#cffafe 0%,#a5f3fc 100%)!important;}
.card-header.pastel-green{background:linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%)!important;}
.card-header.pastel-orange{background:linear-gradient(135deg,#fed7aa 0%,#fdba74 100%)!important;}
.card-header.pastel-pink{background:linear-gradient(135deg,#fce7f3 0%,#fbcfe8 100%)!important;}

/* Keep header title readable on colored headers */
.card-header.bg-purple .section-title,
.card-header.bg-green .section-title{color:#fff!important;}
/* Others inherit dark */

/* --- Skills/Tags: readable pills (fix broken syllables) --- */
.u-tags{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}
.u-tag{
  display:inline-flex;
  align-items:center;
  padding:8px 12px;
  border-radius:999px;
  border:1px solid rgba(99,102,241,.45);
  background:rgba(99,102,241,.06);
  color:#3730a3;
  font-weight:700;
  font-size:13px;
  line-height:1.15;
  white-space:normal;
  word-break:normal;
  overflow-wrap:break-word;
  max-width:100%;
}

.section-title{
  font-weight:700;
  font-size:17px;
  color:var(--text);
  letter-spacing:-0.02em;
  display:flex;
  align-items:center;
  gap:10px;
}

/* ---- Sponsor banners (hover léger) ---- */
.sponsor-banner-wide{
  width:680px;
  height:120px;
  max-width:100%;
  border-radius:var(--radius-lg);
  overflow:hidden;
  position:relative;
  cursor:pointer;
  transition:transform .3s ease;
  margin-bottom:32px;
}
.sponsor-banner-wide:hover{ transform:scale(1.02); }

.sponsor-logo-square{
  width:300px;
  height:300px;
  max-width:100%;
  border-radius:var(--radius-lg);
  background:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  box-shadow:var(--shadow-card);
  border:1px solid var(--border);
}

/* ---- Badges / chips ---- */
.badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:6px 14px;
  border-radius:var(--radius-sm);
  font-size:13px;
  font-weight:600;
  border:1px solid;
}

.badge-primary{ background:rgba(99,102,241,0.10); border-color:rgba(99,102,241,0.30); color:#6366f1; }
.badge-success{ background:rgba(16,185,129,0.10); border-color:rgba(16,185,129,0.30); color:#10b981; }
.badge-warning{ background:rgba(245,158,11,0.10); border-color:rgba(245,158,11,0.30); color:#f59e0b; }
.badge-danger { background:rgba(239,68,68,0.10); border-color:rgba(239,68,68,0.30); color:#ef4444; }

.chip{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:8px 14px;
  border-radius:var(--radius-sm);
  font-size:13px;
  font-weight:500;
  border:1px solid;
  transition:all .2s ease;
}

.chip:hover{
  transform:translateY(-2px);
  box-shadow:0 4px 12px rgba(0,0,0,0.10);
}

/* ---- KPI tiles ---- */
.kpi-box{
  background:#fff;
  border:1px solid var(--border);
  border-radius:var(--radius-md);
  padding:16px;
  display:flex;
  align-items:center;
  gap:12px;
  transition:all .2s ease;
}
.kpi-box:hover{
  border-color:var(--primary);
  box-shadow:0 4px 16px rgba(99,102,241,0.15);
}

.kpi-icon{
  width:40px;
  height:40px;
  border-radius:var(--radius-sm);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:20px;
  flex-shrink:0;
}

/* ---- Salary bars ---- */
.salary-bar-container{
  height:10px;
  background:var(--border);
  border-radius:5px;
  overflow:hidden;
  position:relative;
}
.salary-bar-fill{
  height:100%;
  border-radius:5px;
  transition:width .6s cubic-bezier(.4,0,.2,1);
}

/* ---- Rich content typography ---- */
.rich-content{ color:var(--text); line-height:1.7; }
.rich-content h3{ font-weight:700; font-size:16px; margin:20px 0 12px; color:var(--text); }
.rich-content h4{ font-weight:600; font-size:15px; margin:16px 0 10px; color:var(--text); }
.rich-content p{ margin:10px 0; }
.rich-content ul{ list-style:none; margin:12px 0; padding:0; }
.rich-content li{
  margin:8px 0;
  padding-left:24px;
  position:relative;
}
.rich-content li:before{
  content:"→";
  position:absolute;
  left:0;
  color:var(--primary);
  font-weight:700;
}
.rich-content strong{ font-weight:600; color:var(--text); }


/* --- Skills path chips / KPI blocks --- */
.kpi-title{font-weight:800;margin-bottom:8px;}
.kpi-chips{display:flex;flex-wrap:wrap;gap:10px;}
.soft-lines{display:flex;flex-direction:column;gap:10px;}
.soft-line{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:#fff;}
.soft-ico{font-size:18px;}
.soft-txt{font-weight:700;color:var(--text);} 
.kpi-chip{border-radius:12px!important;white-space:normal;word-break:normal;overflow-wrap:break-word;max-width:100%;}
.kpi-text{
  font-weight:650;
  color:rgba(17,24,39,.82);
  line-height:1.5;
  padding:10px 12px;
  border-radius:14px;
  border:1px solid rgba(99,102,241,.18);
  background:rgba(99,102,241,.06);
}
`;
    var style = document.createElement("style");
    style.id = "ulydia-metier-v35-css";
    style.textContent = css;
    document.head.appendChild(style);

  }

  function sectionKeyFromTitle(title){
    var s = norm(title).toLowerCase();
    if (!s) return "misc";
    if (s.indexOf(ui("en","overview").toLowerCase())>-1 || s.indexOf("overview")>-1 || s.indexOf("présentation")>-1 || s.indexOf("presentation")>-1) return "overview";
    if (s.indexOf(ui("en","missions").toLowerCase())>-1 || s.indexOf("mission")>-1) return "missions";
    if (s.indexOf(ui("en","skills").toLowerCase())>-1 || s.indexOf("compétence")>-1 || s.indexOf("skills")>-1) return "skills";
    if (s.indexOf("environnement")>-1 || s.indexOf("work environment")>-1) return "work_environment";
    if (s.indexOf("profil")>-1 || s.indexOf("profile")>-1) return "profile";
    if (s.indexOf("evolution")>-1 || s.indexOf("career")>-1 || s.indexOf("path")>-1) return "career_path";
    if (s.indexOf("formation")>-1 || s.indexOf("training")>-1 || s.indexOf("education")>-1) return "training";
    if (s.indexOf("accès")>-1 || s.indexOf("access")>-1 || s.indexOf("reconversion")>-1) return "access";
    if (s.indexOf("march")>-1 || s.indexOf("market")>-1) return "market";
    if (s.indexOf("salaire")>-1 || s.indexOf("salary")>-1 || s.indexOf("rémun")>-1) return "salary";
    if (s.indexOf("indicateur")>-1 || s.indexOf("indicator")>-1) return "indicators";
    if (s.indexOf("certif")>-1) return "certifications";
    if (s.indexOf("school")>-1 || s.indexOf("école")>-1 || s.indexOf("parcours")>-1 || s.indexOf("path")>-1) return "schools";
    if (s.indexOf("portfolio")>-1 || s.indexOf("project")>-1 || s.indexOf("projet")>-1) return "portfolio";
    if (s.indexOf("skills path")>-1 || s.indexOf("compétences clés")>-1) return "skills_path";
    return "misc";
  }

  function themeForTitle(title){
    var key = sectionKeyFromTitle(title);
    switch(key){
      case "overview": return "pastel-blue";
      case "missions": return "pastel-cyan";
      case "skills": return "pastel-purple";
      case "work_environment": return "pastel-blue";
      case "profile": return "pastel-purple";
      case "career_path": return "pastel-cyan";
      case "training": return "pastel-purple";
      case "access": return "pastel-green";
      case "market": return "pastel-cyan";
      case "salary": return "bg-green";
      case "indicators": return "bg-purple";
      case "skills_path": return "bg-cyan";
      case "certifications": return "bg-orange";
      case "schools": return "bg-blue";
      case "portfolio": return "bg-mint";
      default: return "pastel-blue";
    }
  }

  function iconForSectionKey(key){
    switch(key){
      case "overview": return "💡";
      case "missions": return "✅";
      case "skills": return "🧠";
      case "work_environment": return "🏢";
      case "profile": return "👤";
      case "career_path": return "🧭";
      case "training": return "🎓";
      case "access": return "🚪";
      case "market": return "📊";
      case "salary": return "💵";
      case "indicators": return "📌";
      case "skills_path": return "🧩";
      case "certifications": return "🏅";
      case "schools": return "🏫";
      case "portfolio": return "🗂️";
      default: return "✨";
    }
  }

  // MPB: transform rich text into compact, useful "rows" with icons
  function mpbToVisual(html, sectionTitle){
    html = cleanRichHTML(html);
    if (!html) return "";
    // if there is already a list, keep it and just style via CSS
    if (/<li\b/i.test(html) || /<ul\b/i.test(html)) return html;

    var key = sectionKeyFromTitle(sectionTitle || "");
    // Remove model-generated "market demand" summary lines (should live in indicators only)
    if (key === "market"){
      html = html.replace(/Demande\s+du\s+march[eé]\s*—[^\n<]*/gi,"");
      html = html.replace(/Market\s+demand\s*—[^\n<]*/gi,"");
    }
    var ico = iconForSectionKey(key);

    var txt = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?p\b[^>]*>/gi, "\n")
      .replace(/<\/?div\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\u00A0/g, " ")
      .replace(/&nbsp;/g, " ");
    txt = txt.replace(/\s+/g," ").trim();
    if (!txt) return html;

    // split into short "facts"
    var parts = txt
      .replace(/[•·]/g, "\n")
      .split(/\n|\s-\s|\s—\s|\s;\s/);

    var clean = parts.map(function(x){ return norm(x); }).filter(Boolean);

    // fallback: if it's one huge sentence, keep as paragraph
    if (clean.length <= 1) return '<div class="u-mpb-paragraph">'+esc(clean[0]||txt)+'</div>';

    // keep first 10 lines to avoid walls
    clean = clean.slice(0, 10);

    return '<div class="u-mpb-rows">' + clean.map(function(line){
      return '<div class="u-mpb-row"><div class="u-mpb-ico">'+esc(ico)+'</div><div class="u-mpb-txt">'+esc(line)+'</div></div>';
    }).join('') + '</div>';
  }


  function card(title, headerTheme, html){
    var c = document.createElement('div');
    c.className = 'card';

    // Auto section + theme (unless explicitly provided)
    var secKey = sectionKeyFromTitle(title || '');
    c.setAttribute('data-section', secKey);

    var h = document.createElement('div');
    h.className = 'card-header';
    if (!headerTheme) headerTheme = themeForTitle(title || '');
    if (headerTheme) h.className += ' ' + headerTheme;

    var t = document.createElement('div');
    t.className = 'section-title';
    // Add small leading icon for MPB / content blocks
    t.textContent = (iconForSectionKey(secKey) ? (iconForSectionKey(secKey) + " ") : "") + (title || '');
    h.appendChild(t);
    c.appendChild(h);

    var b = document.createElement('div');
    b.className = 'rich-content';
    if (html) b.innerHTML = html;
    c.appendChild(b);
    return c;
  }


    // --- Rich text cleaning for MPB (nbsp + comma/newline list) ---
  
  function htmlToText(html){
    html = cleanRichHTML(html);
    if (!html) return "";
    var d = document.createElement("div");
    d.innerHTML = html;
    return norm(d.textContent || "");
  }
  function fmtK(n){
    // n can be in K (35) or EUR (35000)
    if (n == null || !isFinite(n)) return null;
    if (n >= 1000) return Math.round(n/1000);
    return Math.round(n);
  }
  function formatAnnualRange(min, max, devise){
    var a = fmtK(min), b = fmtK(max);
    if (a == null && b == null) return "";
    var cur = String(devise || "€").trim();
    // normalize common "EUR (€)" -> "€"
    if (/eur/i.test(cur) && cur.indexOf("€")>-1) cur = "€";
    if (cur.length > 3 && cur.indexOf("€")>-1) cur = "€";
    var range = (a!=null? a : "") + "–" + (b!=null? b : "");
    if (a!=null && b==null) range = String(a);
    if (a==null && b!=null) range = String(b);
    return range + "K" + cur;
  }

function cleanRichHTML(html){
    html = String(html||"");
    if (!html) return "";
    html = html.replace(/\u00A0/g, " ").replace(/&nbsp;/g, " ");
    // collapse repeated spaces between tags/text
    html = html.replace(/[ \t]{2,}/g, " ");
    return html.trim();
  }
  function listifyIfNeeded(html){
    html = cleanRichHTML(html);
    if (!html) return "";
    // if already contains list items, keep as-is
    if (/<li\b/i.test(html)) return html;
    // extract text only if it's plain with commas
    var txt = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?p\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\u00A0/g, " ")
      .replace(/&nbsp;/g, " ");
    txt = txt.replace(/\s+/g," ").trim();
    if (txt.indexOf(",") === -1) return html; // nothing to listify
    var parts = txt.split(",").map(function(x){ return x.trim(); }).filter(Boolean);
    if (parts.length <= 1) return html;
    return "<ul>" + parts.map(function(p){ return "<li>"+esc(p)+"</li>"; }).join("") + "</ul>";
  }

  function ensurePropalStyles(){
    if (document.getElementById("ulydia-propal-style")) return;
    var st = document.createElement("style");
    st.id = "ulydia-propal-style";
    st.textContent = `
/* ---- PROPAL parity helpers (salary + rich-content lists) ---- */
.ul-propal-header{
  border-radius: 20px 20px 0 0;
  padding: 14px 16px;
  font-weight: 800;
  font-size: 14px;
  color:#fff;
}
.ul-gradient-success{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.salary-bar-container{
  height: 10px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}
.salary-bar-fill{
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.rich-content{ color:#0f172a; line-height:1.7; }
.rich-content ul{ list-style:none; margin:12px 0; padding:0; }
.rich-content li{ margin:8px 0; padding-left:24px; position:relative; }
.rich-content li:before{
  content:"→";
  position:absolute;
  left:0;
  color: var(--ul-primary, #6366f1);
  font-weight:700;
}
    `.trim();
    document.head.appendChild(st);
  }

function renderNotAvailable(ctx){
  var lang = langFromCtx(ctx);
    var countryName = '';
  var langCode = (ctx && (ctx.lang_final || ctx.final_lang || ctx.lang || ctx.language)) || (ctx && ctx.country && (ctx.country.langue_finale || ctx.country.lang_finale || ctx.country.final_lang || ctx.country.finalLang || ctx.country.lang || ctx.country.language)) || '';
  var langLabel = (String(langCode||'').toLowerCase() || 'this language');
  var wrap = document.createElement('div');
  wrap.className = 'u-wrap';

  var title = ui(lang,'not_available_title');
  var prefix = ui(lang,'not_available_msg_prefix');

  var body = '<div class="u-muted" style="line-height:1.6">' +
    esc(prefix) + ' <b>' + esc(langLabel) + '</b>.' +
    '</div>';

  wrap.appendChild(card(title, '', body));
  return wrap;
}



  function renderFAQ(list, ctx){
  var lang = langFromCtx(ctx);
  var wrap = document.createElement('div');
  wrap.className = 'u-card';

  var h = document.createElement('div');
  h.className = 'u-card-h';
  h.textContent = ui(lang,'faqs') || 'FAQ';
  wrap.appendChild(h);

  var b = document.createElement('div');
  b.className = 'u-card-b';
  b.style.padding = '0';

  var has = false;
  (list||[]).forEach(function(f){
    if (!f) return;
    var qTxt = (f.question || f.q || '');
    var aHtml = (f.reponse || f.answer || f.a || '') || '';
    if (!String(qTxt||'').trim()) return;
    has = true;

    var item = document.createElement('div');
    item.className = 'u-faq-item';

    var q = document.createElement('div');
    q.className = 'u-faq-q';
    q.innerHTML = '<span>'+ esc(qTxt) +'</span><span>▾</span>';

    var a = document.createElement('div');
    a.className = 'u-faq-a';
    a.innerHTML = aHtml || '<span class="u-muted">—</span>';

    q.addEventListener('click', function(){ item.classList.toggle('is-open'); });
    item.appendChild(q);
    item.appendChild(a);
    b.appendChild(item);
  });

  if (!has){
    var empty = document.createElement('div');
    empty.className = 'u-muted';
    empty.style.padding = '14px';
    empty.textContent = ui(lang,'no_faq');
    b.appendChild(empty);
  }

  wrap.appendChild(b);
  return wrap;
}

  function renderTopBanner(ctx){
    var sponsor = (ctx.sponsor === '__PENDING__') ? null : ctx.sponsor;
    var country = ctx.country;

    // ✅ WIDE banner:
    // - Sponsor: Airtable uses logo_2 as landscape (wide)
    // - Non-sponsor: catalog/country banner_wide
        var wide = pickUrl(
      sponsor && pickSponsorUrl(sponsor, 'wide'),
      sponsor && (sponsor.logo_wide || sponsor.logoWide || sponsor.banner_wide || sponsor.bannerWide),
      country && (country.banner_wide || country.bannerWide || country.banniere_sponsorisation_image_1 || country.banniere_sponsorisation_image_1_url || country['banniere_sponsorisation_image_1_url'])
    );

    // click -> /sponsor with context
    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&iso='+encodeURIComponent(ctx.iso);

    if (!wide) return null;

    // Pure image banner (no purple filter)
    var a = document.createElement('a');
    a.href = href;
    a.className = 'u-banner-img-link';
    a.rel = 'noopener';
    a.style.display = 'block';
    a.style.maxWidth = '680px';
    a.style.margin = '0 auto 28px auto';

    var img = document.createElement('img');
    img.src = wide;
    img.alt = 'Sponsor';
    img.loading = 'eager';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.borderRadius = '16px';
    img.style.border = '1px solid #eef0f4';
    img.style.boxShadow = '0 14px 36px rgba(20,20,60,.12)';
    // keep wide ratio feel on all browsers
    img.style.aspectRatio = '680 / 120';
    img.style.objectFit = 'cover';

    a.appendChild(img);
    return a;
  }

  function renderPremiumCard(ctx){
    // Square sponsor banner — PRO style (header + framed image), no extra text/button.
    var sponsor = (ctx.sponsor === '__PENDING__') ? null : ctx.sponsor;
    var country = ctx.country;

    var square = pickUrl(
      sponsor && pickSponsorUrl(sponsor, 'square'),
      sponsor && (sponsor.logo_square || sponsor.logoSquare || sponsor.banner_square || sponsor.bannerSquare || sponsor.logo_1 || sponsor.logo1),
      country && (country.banner_square || country.bannerSquare || country.banniere_sponsorisation_image_2 || country.banniere_sponsorisation_image_2_url || country['banniere_sponsorisation_image_2_url'])
    );
    if (!square) return null;

    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&iso='+encodeURIComponent(ctx.iso);

    var lang = langFromCtx(ctx);

    var html =
      '<div class="u-sponsor-frame">' +
        '<a class="u-sponsor-square-link" href="'+esc(href)+'" rel="noopener">' +
          '<img src="'+esc(square)+'" alt="" loading="lazy" />' +
        '</a>' +
      '</div>';

    // Use standard card() header
    return card(ui(lang,'sponsor') || 'Sponsor', '', html);
  }

  
  function renderBeforeFaqBanner(ctx){
    var sponsor = (ctx.sponsor === '__PENDING__') ? null : ctx.sponsor;
    var country = ctx.country;

    // ✅ WIDE banner before FAQ (same mapping as top)
        var wide = pickUrl(
      sponsor && pickSponsorUrl(sponsor, 'wide'),
      sponsor && (sponsor.logo_wide || sponsor.logoWide || sponsor.banner_wide || sponsor.bannerWide),
      country && (country.banner_wide || country.bannerWide || country.banniere_sponsorisation_image_1 || country.banniere_sponsorisation_image_1_url || country['banniere_sponsorisation_image_1_url'])
    );

    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&iso='+encodeURIComponent(ctx.iso);

    if (!wide) return null;

    var a = document.createElement('a');
    a.href = href;
    a.className = 'u-banner-img-link u-banner horizontal';
    a.setAttribute('data-banner-idx','2');
    a.rel = 'noopener';
    a.style.display = 'block';
    a.style.maxWidth = '680px';
    a.style.margin = '16px auto';

    var img = document.createElement('img');
    img.src = wide;
    img.alt = 'Sponsor';
    img.loading = 'lazy';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.borderRadius = '16px';
    img.style.border = '1px solid #eef0f4';
    img.style.boxShadow = '0 14px 36px rgba(20,20,60,.12)';
    img.style.aspectRatio = '680 / 120';
    img.style.objectFit = 'cover';

    a.appendChild(img);
    return a;
  }

function renderSkillTags(title, items){
    var html = '';
    if (items && items.length){
      html += '<div class="u-tags">'+ items.map(function(t){ return '<span class="u-tag">'+esc(t)+'</span>'; }).join('') + '</div>';
    } else {
      html = '<span class="u-muted">—</span>';
    }
    return card(title, '', html);
  }

  function splitTags(s){
    s = String(s||'');
    // Strip HTML if rich text was passed
    s = s.replace(/<[^>]*>/g,' ');
        s = s.replace(/&nbsp;/gi,' ');
    if (!s.trim()) return [];
    return s.split(/\s*[,;\n]\s*|\s*&nbsp;\s*/).map(function(x){return norm(x);}).filter(Boolean);
  }

  
  function setSalaryBars(root){
    try{
      var fills = root.querySelectorAll(".u-salary-fill[data-pct]");
      for (var i=0;i<fills.length;i++){
        var el = fills[i];
        var pct = parseFloat(el.getAttribute("data-pct")||"0");
        if (!isFinite(pct)) pct = 0;
        el.style.width = Math.max(0, Math.min(100, pct)) + "%";
      }
    }catch(e){}
  }

function renderPage(ctx){
    injectCSS();
    var root = ensureRoot();

    var head = document.createElement('div');
    var title = document.createElement('h1');
    title.className = 'u-title';
    title.textContent = (ctx && ctx.notAvailable) ? (ctx.name || ui(langFromCtx(ctx),'not_available_title') || 'Not available') : (ctx.name || ctx.slug || 'Métier');

    head.appendChild(title);

    var pills = document.createElement('div');
    pills.className = 'u-pills';
    var lang = langFromCtx(ctx);
    var sectorLabel = sectorToLabel(ctx.sector) || sectorToLabel(detectSectorFromDOM());
    var pillsHTML = '';
    if (sectorLabel){
      pillsHTML += '<span class="u-pill">'+esc(ui(lang,'sector'))+': <b>'+esc(sectorLabel)+'</b></span>';
    }
    pillsHTML += '<span class="u-pill">'+esc(ui(lang,'country'))+': <b>'+esc(ctx.iso || '—')+'</b></span>';
    pills.innerHTML = pillsHTML;

    head.appendChild(pills);

    if (ctx.accroche){
      var acc = document.createElement('p');
      acc.className = 'u-accroche';
      acc.textContent = ctx.accroche;
      head.appendChild(acc);
    }

    root.appendChild(head);

    // Sponsor banner (wide)
    var topB = renderTopBanner(ctx);
    if (topB){ root.appendChild(topB); var sp=document.createElement('div'); sp.style.height='10px'; root.appendChild(sp);} 

    
    // If fiche is missing for this country/language, show message (keep search bar visible, no blocks rendered)
    if (ctx && ctx.notAvailable){
      var msgCard = document.createElement('div');
      msgCard.className = 'u-card';
      var mh = document.createElement('div');
      mh.className = 'u-card-h';
      mh.textContent = ui(langFromCtx(ctx),'not_available_title') || 'Not available';
      var mb = document.createElement('div');
      mb.className = 'u-card-b';
      mb.innerHTML = '<div class="u-muted" style="padding:6px 0;">This job description is not yet available in this language</div>';
      msgCard.appendChild(mh);
      msgCard.appendChild(mb);
      root.appendChild(msgCard);
      return;
    }

var row = document.createElement('div');
    row.className = 'u-row';

    var left = document.createElement('div');
    left.className = 'u-stack u-left';

    var right = document.createElement('div');
    right.className = 'u-stack u-right';

    // =========================================================
    // ULYDIA — PRO 2-COLUMN STRUCTURE (v4.9)
    // LEFT  = understand the job (overview → missions → environment → training/access → market)
    // RIGHT = decide & position (sponsor → indicators → key fields/skills/tools → salary → profile → career path)
    // =========================================================
    var langL = langFromCtx(ctx);

    function hasAny(){
      for (var i=0;i<arguments.length;i++){
        if (arguments[i]) return true;
      }
      return false;
    }
    function cleanBlock(html){
      html = cleanRichHTML(String(html||""));
      html = listifyIfNeeded(html); // improve readability
      return html;
    }
    function cleanPara(html){
      // For overview blocks: keep as paragraph(s), no listify (avoid arrows/bullets)
      html = cleanRichHTML(String(html||""));
      if (!html) return "";
      // If it's plain text without <p>, wrap it
      if (html.indexOf("<p") === -1 && html.indexOf("<div") === -1 && html.indexOf("<ul") === -1 && html.indexOf("<ol") === -1){
        html = "<p>" + esc(htmlToText(html)) + "</p>";
      }
      // Ensure a consistent wrapper
      if (!/class=["']rich-content/i.test(html)){
        html = '<div class="rich-content text-sm u-overview-para">' + html + '</div>';
      }
      return html;
    }

    // -------------------------
    // LEFT column — Understand
    // -------------------------
    if (ctx.fiche){
      var f = ctx.fiche;

      if (f.description) left.appendChild(card(ui(langL,'overview'), '', cleanPara(f.description)));

      if (f.missions) left.appendChild(card(ui(langL,'missions'), '', cleanBlock(f.missions)));

      // Work environment: prefer MPB (country-specific), fallback fiche
      var envHtml = (ctx.mpb && ctx.mpb.environnements) ? mpbToVisual(ctx.mpb.environnements, ui(langL,'work_environment'))
                   : (f.environnements ? cleanBlock(f.environnements) : "");
      if (envHtml) left.appendChild(card(ui(langL,'work_environment'), null, envHtml));

      // Optional: fiche skills ONLY if MPB skill blocks are absent (avoid duplication)
      var mpbHasSkillsLeft = !!(ctx.mpb && hasAny(ctx.mpb.key_fields, ctx.mpb.skills_must_have, ctx.mpb.soft_skills, ctx.mpb.tools_stack));
      if (!mpbHasSkillsLeft && f.competences){
        left.appendChild(card(ui(langL,'skills'), '', cleanBlock(f.competences)));
      }
    }

    // MPB blocks (country-specific) for understanding
    if (ctx.mpb){
      // Move "Évolutions possibles" above Formation (requested)
      if (ctx.fiche && ctx.fiche.evolutions_possibles){
        left.appendChild(card(ui(langL,'career_path'), '', cleanBlock(ctx.fiche.evolutions_possibles)));
      }
      if (ctx.mpb.formation) {
        var eduLoc = stripHtmlToText(ctx.mpb.education_level_local || ctx.mpb.education_leval_local || ctx.mpb.education_level || ctx.mpb.educationLevelLocal || ctx.mpb.educationLevel || '');
        var formationHtml = mpbToVisual(ctx.mpb.formation, ui(langL,'training'));
        if (eduLoc){
          formationHtml = '<div class="rich-content text-sm" style="margin-bottom:10px;"><span style="color:var(--muted);font-weight:700;">'+esc(ui(langL,'education_level_label'))+':</span> <span style="font-weight:800;">'+esc(eduLoc)+'</span></div>' + formationHtml;
        }
        left.appendChild(card(ui(langL,'training'), null, formationHtml));
      }
      if (ctx.mpb.acces)     left.appendChild(card(ui(langL,'access'),   null, mpbToVisual(ctx.mpb.acces, ui(langL,'access'))));

      // Market: merge main market block + market demand if available
      var marketHtml = "";
      if (ctx.mpb.marche) marketHtml += mpbToVisual(ctx.mpb.marche, ui(langL,'market'));
      if (marketHtml) left.appendChild(card(ui(langL,'market'), null, marketHtml));

      // Generic MPB blocks (one item per block) -> LEFT (additional country info)
      if (Array.isArray(ctx.mpb.blocks) && ctx.mpb.blocks.length){
        ctx.mpb.blocks.forEach(function(b){
          if (!b || !b.body) return;
          var t = b.title ? String(b.title) : ui(langL,'additional_info');
          left.appendChild(card(t, null, mpbToVisual(b.body, t)));
        });
      }
    }

    // -------------------------
    // RIGHT column — Decide
    // -------------------------

    // 0) Sponsor / Premium (square) first
    var prem = renderPremiumCard(ctx);
    if (prem) right.appendChild(prem);

    // 1) Indicators (cards list)
    if (ctx.mpb){
      var lang2 = langFromCtx(ctx);      function indVal(v){ 
        if (v == null) return "";
        if (typeof v === "string" && v.indexOf("<")>-1) return htmlToText(v);
        return norm(String(v));
      }

      function __ulOldFormatCurrency(v){
        var s = norm(String(v||""));
        if (!s) return "";
        // Keep if already like "EUR (€)"
        if (/[A-Z]{3}\s*\(.+\)/.test(s)) return s;

        var up = s.toUpperCase();
        // symbol-only -> map to ISO
        if (s === "€") up = "EUR";
        if (s === "$") up = "USD";
        if (s === "£") up = "GBP";
        if (s === "CHF") up = "CHF";

        var map = {
          EUR: "EUR (€)",
          USD: "USD ($)",
          GBP: "GBP (£)",
          CHF: "CHF (CHF)",
          CAD: "CAD ($)",
          AUD: "AUD ($)",
          JPY: "JPY (¥)"
        };

        // detect combined strings
        if (/EUR/i.test(s) || s.indexOf("€")>-1) return map.EUR;
        if (/USD/i.test(s) || s.indexOf("$")>-1) return map.USD;
        if (/GBP/i.test(s) || s.indexOf("£")>-1) return map.GBP;
        if (/CHF/i.test(s)) return map.CHF;
        if (/CAD/i.test(s)) return map.CAD;
        if (/AUD/i.test(s)) return map.AUD;
        if (/JPY/i.test(s) || s.indexOf("¥")>-1) return map.JPY;

        // ISO only
        if (map[up]) return map[up];
        return s;
      }

      function translateAutomationRisk(v, lang){
        var s = norm(String(v||""));
        if (!s) return "";
        var l = normLang(lang || "en");

        // normalize
        var k = s.toLowerCase();
        k = k.replace(/\s+/g," ").trim();

        // map common values
        var bucket = null;
        if (/(none|no risk|no|n\/a|na|aucun|sans)/.test(k)) bucket = "none";
        else if (/(low|faible|bas|basse)/.test(k)) bucket = "low";
        else if (/(medium|moderate|moyen|moyenne|modere|modéré)/.test(k)) bucket = "medium";
        else if (/(high|élevé|eleve|haut|haute)/.test(k)) bucket = "high";
        else if (/(very high|très élevé|tres eleve|veryhigh)/.test(k)) bucket = "very_high";

        if (!bucket) return s;

        var dict = {
          en: { none:"None", low:"Low", medium:"Medium", high:"High", very_high:"Very high" },
          fr: { none:"Aucun", low:"Faible", medium:"Moyen", high:"Élevé", very_high:"Très élevé" },
          de: { none:"Keins", low:"Niedrig", medium:"Mittel", high:"Hoch", very_high:"Sehr hoch" },
          es: { none:"Ninguno", low:"Bajo", medium:"Medio", high:"Alto", very_high:"Muy alto" },
          it: { none:"Nessuno", low:"Basso", medium:"Medio", high:"Alto", very_high:"Molto alto" }
        };
        var d = dict[l] || dict.en;
        return d[bucket] || s;
      }

      function summarizeIndicator(key, val, lang){
        var s = norm(String(val||""));
        if (!s) return "";
        // keep it compact
        if (s.length > 56){
          var first = s.split(/[\.\!\?]/)[0];
          if (first && first.trim().length >= 10) s = norm(first);
          else s = norm(s.split(/\s+/).slice(0,9).join(" "));
        }

        var L = normLang(lang||'en');

        if (key === "remote_level"){
          var k = s.toLowerCase();
          if (/(full\s*remote|100%|entièrement|entierement)/.test(k) && /(hybrid|hybride)/.test(k)) return (L==='fr'?'Full remote / Hybride':'Full remote / Hybrid');
          if (/(full\s*remote|100%|entièrement|entierement)/.test(k)) return (L==='fr'?'Full remote':'Full remote');
          if (/(hybrid|hybride)/.test(k)) return (L==='fr'?'Hybride':'Hybrid');
          if (/(rare|occasionnel|occasional)/.test(k)) return (L==='fr'?'Rare':'Rare');
          if (/(none|no|aucun|jamais)/.test(k)) return (L==='fr'?'Aucun':'None');
          return s;
        }

        if (key === "automation_risk"){
          // if we have a percent -> keep it
          var pct = s.match(/(\d+\s*%)/);
          var base = translateAutomationRisk(s, L);
          return pct ? (base + " (" + pct[1].replace(/\s+/g,'') + ")") : base;
        }

        if (key === "time_to_employability"){
          var m = s.match(/(\d+\s*[-–]\s*\d+)\s*(mois|months)?/i);
          if (m) return norm(m[1] + ' ' + (L==='fr'?'mois':'months'));
          return s.replace(/\bmonths\b/i, L==='fr'?'mois':'months');
        }

        if (key === "growth_outlook"){
          var p = s.match(/([+\-]?\d+\s*%)(\s*\/\s*an|\s*per\s*year|\s*\/\s*year)?/i);
          if (p) return norm(p[1] + (L==='fr'?' / an':' / year'));
          return s;
        }

        if (key === "market_demand"){
          var k2 = s.toLowerCase();
          if (/(very\s*high|très\s*fort|tres\s*fort|very\s*strong)/.test(k2)) return (L==='fr'?'Très forte':'Very high');
          if (/(soutenue|medium|moderate)/.test(k2)) return (L==='fr'?'Soutenue':'Medium');
          if (/(high|forte|strong)/.test(k2)) return (L==='fr'?'Forte':'High');
          if (/(low|faible|weak)/.test(k2)) return (L==='fr'?'Faible':'Low');
          return s;
        }

        if (key === "currency") return __ulFormatCurrency(s);
        return s;
      }

      function indicatorValueClass(key, val, lang){
        var s = norm(String(val||""));
        var k = s.toLowerCase();
        if (key === "automation_risk"){
          if (/(very high|très élevé|tres eleve)/.test(k)) return "v-red";
          if (/(high|élevé|eleve|haut)/.test(k)) return "v-red";
          if (/(medium|moderate|moyen|moyenne)/.test(k)) return "v-orange";
          if (/(low|faible|bas|basse|none|aucun)/.test(k)) return "v-green";
          return "v-green";
        }
        if (key === "growth_outlook") return "v-green";
        if (key === "market_demand"){
          if (/(très forte|tres forte|very high|very strong|forte|high|strong)/.test(k)) return "v-red";
          if (/(soutenue|medium|moderate)/.test(k)) return "v-purple";
          return "v-purple";
        }
        if (key === "currency") return "v-purple";
        return "";
      }

      // --------------------------------------------
// Indicateurs clés (robuste)
// - lit d'abord ctx.mpb.chips (si présent), sinon champs directs
// - résume les valeurs (pas de phrases longues)
// - couleurs cohérentes (green/red/purple)
// --------------------------------------------
function _normKey(k){
  return String(k||"")
    .toLowerCase()
    .replace(/[\u00a0]/g," ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}
function getChip(b, key){
  var c = b && b.chips ? b.chips : {};
  var target = _normKey(key);
  for (var kk in c){
    if (!Object.prototype.hasOwnProperty.call(c, kk)) continue;
    if (_normKey(kk) === target) return c[kk];
  }
  for (var kk2 in c){
    if (!Object.prototype.hasOwnProperty.call(c, kk2)) continue;
    var nk = _normKey(kk2);
    if (nk.indexOf(target) !== -1) return c[kk2];
  }
  return null;
}
function getChipAny(b, keys){
  for (var i=0;i<(keys||[]).length;i++){
    var v = getChip(b, keys[i]);
    if (v != null && String(v).trim() !== "") return v;
  }
  return "";
}
function __ulOldFormatCurrency2(v){
  var s = String(v||"").trim();
  if (!s) return "";
  if (/\(\s*[^)]+\s*\)/.test(s)) return s; // already "EUR (€)"
  var up = s.toUpperCase();
  var map = { EUR:"€", USD:"$", GBP:"£", JPY:"¥", CAD:"$", AUD:"$", CHF:"CHF" };
  if (map[up]) return up + " (" + map[up] + ")";
  return s;
}
function indGet(b, directVal, keys){
  var v = getChipAny(b, keys);
  if (String(v||"").trim()) return stripHtmlToText(v);
  return stripHtmlToText(String(directVal||"")).trim();
}

var indItems = [];

var remoteRaw = indGet(ctx.mpb, ctx.mpb.remote_level, ["Remote_level","Télétravail","Teletravail","Remote","Remote work","Remote level"]);
if (remoteRaw) indItems.push({ key:'remote_level', ico:"🏠", lbl:ui(lang2,'remote_level'), raw:stripHtmlToText(remoteRaw) });

var autoRaw = indGet(ctx.mpb, ctx.mpb.automation_risk, ["Automation_risk","Risque d'automatisation","Risque d automatisation","Automation risk"]);
if (autoRaw) indItems.push({ key:'automation_risk', ico:"🤖", lbl:ui(lang2,'automation_risk'), raw:stripHtmlToText(autoRaw) });

var curRaw = indGet(ctx.mpb, (ctx.mpb.devise||ctx.mpb.currency||ctx.currency||__ulGetCurrencyFromCountry(ctx)), ["Devise","Currency","Monnaie"]);
var curFmt = __ulFormatCurrency(curRaw || "");
if (curFmt) indItems.push({ key:'currency', ico:"💰", lbl:ui(lang2,'currency'), raw:curFmt });

var empRaw = indGet(ctx.mpb, ctx.mpb.time_to_employability, ["Délai d'employabilité","Delai d'employabilite","Employability_delay","Employability","Delai employabilite","Time to employability"]);
if (empRaw) indItems.push({ key:'time_to_employability', ico:"⏱️", lbl:ui(lang2,'time_to_employability'), raw:stripHtmlToText(empRaw) });

var growRaw = indGet(ctx.mpb, ctx.mpb.growth_outlook, ["Croissance du marché","Croissance du marche","Market_growth","Growth","Growth outlook"]);
if (growRaw) indItems.push({ key:'growth_outlook', ico:"📈", lbl:ui(lang2,'growth_outlook'), raw:stripHtmlToText(growRaw) });

var demRaw = indGet(ctx.mpb, ctx.mpb.market_demand, ["Demande du marché","Demande du marche","Market_demand","Demand","Market demand"]);
if (demRaw) indItems.push({ key:'market_demand', ico:"🔥", lbl:ui(lang2,'market_demand'), raw:stripHtmlToText(demRaw) });

if (indItems.length){
  var htmlInd = '<div class="u-ind-list">' + indItems.map(function(it){
    return '<div class="u-ind-item" data-k="'+esc(it.key||'')+'"><div class="u-ind-ico">'+esc(it.ico)+'</div><div class="u-ind-txt"><div class="u-ind-lbl">'+esc(it.lbl)+'</div><div class="u-ind-val '+esc(indicatorValueClass(it.key, stripHtmlToText(it.raw), lang2))+'">'+esc(summarizeIndicator(it.key, stripHtmlToText(it.raw), lang2))+'</div></div></div>';
  }).join('') + '</div>';
  right.appendChild(card(ui(lang2,'key_indicators'), 'bg-purple', htmlInd));
}

      // (v4.9.8) Salary card removed here to avoid duplicates.
      // Salary is rendered only once below (gradient salary bars).


      // 2) Skills / Tools blocks (key fields first)
      function splitTagsLoose(s){
        if (Array.isArray(s)) {
          // flatten arrays and also split any item that still contains separators (comma/newline/semicolon)
          var flat = [];
          s.forEach(function(x){
            var raw = String(x||"");
            // strip html
            raw = raw.replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ");
            raw.split(/[\r\n,;]+/).forEach(function(part){
              var t = norm(part);
              if (t && t !== '✓' && t !== '✔' && t !== '&nbsp') flat.push(t);
            });
          });
          var tiny = flat.filter(function(t){ return t.length <= 3; }).length;
          if (flat.length && (tiny / flat.length) >= 0.55) return [norm(flat.join(" "))];
          return flat;
        }
        s = String(s||'');
        s = s.replace(/<[^>]*>/g,' ');
        s = s.replace(/&nbsp;/gi,' ');
        if (!s.trim()) return [];
        var out = s.split(/[\r\n,;]+/).map(function(x){ return norm(x); }).filter(function(t){ return t && t !== '✓' && t !== '✔' && t !== '&nbsp'; });
        var tiny2 = out.filter(function(t){ return t.length <= 3; }).length;
        if (out.length && (tiny2 / out.length) >= 0.55) return [norm(out.join(" "))];
        return out;
      }

      function splitTagsStrict(s){
        // strict splitter: produces one item per comma / newline / list-item
        function _prep(raw){
          raw = String(raw||"");
          // unescape minimal entities first
          raw = raw.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&nbsp;/gi," ");
          // turn common separators in HTML into newlines BEFORE stripping tags
          raw = raw
            .replace(/<br\s*\/?>/gi,"\n")
            .replace(/<\/p>\s*<p\b[^>]*>/gi,"\n")
            .replace(/<\/div>\s*<div\b[^>]*>/gi,"\n")
            .replace(/<\/li>\s*<li\b[^>]*>/gi,"\n")
            .replace(/<li\b[^>]*>/gi,"\n")
            .replace(/<\/li>/gi,"\n");
          // strip remaining tags
          raw = raw.replace(/<[^>]*>/g," ");
          // normalize bullets to newline
          raw = raw.replace(/[•·]/g,"\n");
          return raw;
        }

        function _splitOne(raw){
          raw = _prep(raw);
          if (!raw.trim()) return [];
          return raw
            .split(/[\r\n,;]+/)
            .map(function(x){ return norm(x); })
            .filter(function(t){ return t && t !== '✓' && t !== '✔' && t !== '&nbsp'; });
        }

        if (Array.isArray(s)){
          var flat = [];
          s.forEach(function(x){
            _splitOne(x).forEach(function(t){ flat.push(t); });
          });
          return flat;
        }
        return _splitOne(s);
      }

      function blockContent(arr){
        if (!arr || !arr.length) return '';
        var singleLong = (arr.length === 1 && String(arr[0]||'').length > 40);
        var tiny = arr.filter(function(t){ return String(t||'').trim().length <= 3; }).length;
        var fragmented = arr.length >= 6 && (tiny / arr.length) >= 0.45;
        if (singleLong || fragmented){
          return '<div class="kpi-text">'+esc(arr.join(' ').replace(/\s+/g,' ').trim())+'</div>';
        }
        return '<div class="kpi-chips">'+arr.map(function(t){
          return '<span class="chip badge-primary kpi-chip">'+esc(t)+'</span>';
        }).join('')+'</div>';
      }

      function blockContentSoft(arr){
        if (!arr || !arr.length) return '';
        return '<div class="soft-lines">' + arr.map(function(t){
          t = norm(t);
          if (!t) return '';
          return '<div class="soft-line"><span class="soft-ico">🧩</span><span class="soft-txt">'+esc(t)+'</span></div>';
        }).join('') + '</div>';
      }

      function blockContentPillCol(arr){
        if (!arr || !arr.length) return '';
        return '<div class="u-pillcol">' + arr.map(function(t){
          t = norm(t);
          if (!t) return '';
          return '<div class="u-pillitem"><strong>'+esc(t)+'</strong></div>';
        }).join('') + '</div>';
      }

      function skillCard(title, theme, arr, mode){
        if (!arr || !arr.length) return null;
        var content = (mode === 'pillcol') ? blockContentPillCol(arr) : ((mode === 'soft_lines') ? blockContentSoft(arr) : blockContent(arr));
        return card(title, theme, content);
      }

      var topFields = splitTagsStrict(ctx.mpb.key_fields);
      var mustHave  = splitTagsStrict(ctx.mpb.skills_must_have);
      var soft      = splitTagsStrict(ctx.mpb.soft_skills);
      var tools     = splitTagsStrict(ctx.mpb.tools_stack);

      var _keyFieldsCard = skillCard(ui(lang2,'key_fields'), 'pastel-purple', topFields);
      if (_keyFieldsCard) right.appendChild(_keyFieldsCard);

      var _mustHaveCard = skillCard(ui(lang2,'must_have'), 'bg-purple', mustHave, 'pillcol');
      if (_mustHaveCard) right.appendChild(_mustHaveCard);

      var _softCard = skillCard(ui(lang2,'soft_skills'), 'pastel-pink', soft, 'pillcol');
      if (_softCard) right.appendChild(_softCard);

      var _toolsCard = skillCard(ui(lang2,'tools_stack'), 'pastel-cyan', tools, 'pillcol');
      if (_toolsCard) right.appendChild(_toolsCard);

      // 3) Salary (decision-critical)
      (function(){
        function fmtNum(n){
          if (n == null || !isFinite(n)) return "";
          try{ return Math.round(n).toLocaleString(); }catch(e){ return String(Math.round(n)); }
        }
        function currencyLabel(){
          var d = ctx.mpb && (ctx.mpb.devise || ctx.mpb.currency);
          d = norm(String(d||""));
          if (!d) return "";
          // Keep as label (€, EUR, USD...)
          return d;
        }
        var cur = currencyLabel();
        var jmin = ctx.mpb.junior_min, jmax = ctx.mpb.junior_max;
        var mmin = ctx.mpb.mid_min,    mmax = ctx.mpb.mid_max;
        var smin = ctx.mpb.senior_min, smax = ctx.mpb.senior_max;

        var hasNums = (jmin!=null||jmax!=null||mmin!=null||mmax!=null||smin!=null||smax!=null);
        var hasText = !!(ctx.mpb && (ctx.mpb.salaire_bloc || ctx.mpb.salary_notes));
        var hasCur  = !!cur;
        if (!hasNums && !hasText && !hasCur) return;
(function ensureSalaryStyle(){
          try{
            if (document.getElementById('ul-salary-design-style')) return;
            var st = document.createElement('style');
            st.id = 'ul-salary-design-style';
            st.textContent =
              /* Wrapper */
              '.u-salary-wrap{padding:0;font-family:var(--ul-font,Montserrat,system-ui);font-size:var(--ul-base,14px)}' +
              '.u-salary-lead{color:var(--ul-muted,#64748b);font-weight:700;font-size:14px;line-height:1.45;margin:0 0 14px}' +

              /* Sub-cards (each salary category) */
              '.u-salary-item{background:#fff;border:1px solid rgba(148,163,184,.28);border-radius:16px;padding:14px 14px 12px;margin:0 0 12px;box-shadow:0 10px 30px rgba(0,0,0,.06);transition:all .3s ease;}' +
              '.u-salary-item:hover{box-shadow:0 15px 40px rgba(0,0,0,.10);transform:translateY(-2px) scale(1.01);}' +
              '.u-salary-item:last-child{margin-bottom:0;}' +

              '.u-salary-top{display:flex;align-items:center;justify-content:space-between;gap:10px}' +
              '.u-salary-left{display:flex;align-items:center;gap:10px;font-weight:800;color:#0f172a;font-size:15px;letter-spacing:-.01em}' +
              '.u-salary-left .emoji{width:22px;display:inline-flex;justify-content:center}' +
              '.u-salary-range{font-weight:800;color:#0f172a;opacity:.9;font-size:15px;letter-spacing:-.01em}' +

              '.u-salary-bar{height:12px;border-radius:999px;background:rgba(148,163,184,.26);overflow:hidden;margin:10px 0 8px}' +
              '.u-salary-bar > i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg, rgba(34,197,94,1), rgba(16,185,129,1));}' +

              '.u-salary-subtxt{color:var(--ul-muted,#64748b);font-weight:700;font-size:12.5px;line-height:1.35}' +
              '.u-salary-note{margin-top:10px;color:var(--ul-muted,#64748b);font-size:13px;font-weight:700;line-height:1.45}' +
              '.u-salary-muted{color:var(--ul-muted,#64748b);font-weight:700;font-size:13px;line-height:1.45}';
            document.head.appendChild(st);
          }catch(e){}
        })();

        function fmtK(v){
          if (v==null || v==='' || isNaN(Number(v))) return '';
          var n = Number(v);
          if (n > 999) n = n/1000;
          return String(Math.round(n));
        }
        function _normCurrency(cur){
          // Prevent JSON blobs like {"ICON":...,"VALUE_SHORT":"EUR (€)"} from leaking into UI.
          try{
            if (cur == null) return 'EUR';
            if (typeof cur === 'object'){
              var vs = cur.value_short || cur.VALUE_SHORT || cur.valueShort || cur.short || cur.code || cur.label || cur.LABEL;
              if (vs) return String(vs);
              return 'EUR';
            }
            var s = String(cur).trim();
            if (!s) return 'EUR';

            // If it's JSON text, parse and extract VALUE_SHORT / value_short
            if (s[0] === '{' && s.indexOf('VALUE_SHORT') !== -1){
              try{
                var obj = JSON.parse(s);
                var vs2 = obj.value_short || obj.VALUE_SHORT || obj.valueShort || obj.short || obj.code;
                if (vs2) return String(vs2);
              }catch(e){}
            }

            // Common formats: "EUR (€)" -> "EUR"
            s = s.replace(/[()]/g,' ');
            s = s.replace(/\s+/g,' ').trim();

            return s;
          }catch(e){ return 'EUR'; }
        }

        function fmtRange(min,max,cur){
          var a = fmtK(min), b = fmtK(max);
          if (!a && !b) return '';
          var c = _normCurrency(cur).toUpperCase();

          // Decide unit symbol, but NEVER append raw currency strings after the amount.
          var unit = 'K€';
          if (c.indexOf('USD') !== -1 || c.indexOf('$') !== -1) unit = 'K$';
          else if (c.indexOf('GBP') !== -1 || c.indexOf('£') !== -1) unit = 'K£';
          else if (c.indexOf('JPY') !== -1 || c.indexOf('¥') !== -1) unit = 'K¥';
          else if (c.indexOf('CHF') !== -1) unit = 'KCHF';

          if (a && b) return a + '–' + b + unit;
          if (a) return a + unit + '+';
          if (b) return '≤' + b + unit;
          return '';
        }
        function pctFill(maxVal, scaleMax){
          var m = Number(maxVal);
          var s = Number(scaleMax);
          if (!isFinite(m) || !isFinite(s) || s<=0) return 40;
          return Math.max(12, Math.min(100, Math.round((m/s)*100)));
        }
        function parseVariable(v){
          // Accepts: 5, "5-15%", "5 – 15", "0,0", "10,0"
          if (v==null) return null;
          if (typeof v === 'number' && isFinite(v)) return {min:v, max:v, raw:String(v)};
          var s = String(v).replace(/\s+/g,' ').trim();
          if (!s) return null;

          s = s.replace('%','').trim();
          s = s.replace(/,/g,'.');             // FR decimal comma -> dot
          s = s.replace(/^(\d+)\.0+$/,'$1'); // 10.0 -> 10 (percent)

          var m = s.match(/(\d+(?:\.\d+)?)\s*(?:[-–]\s*(\d+(?:\.\d+)?))?/);
          if (!m) return {raw:s};

          var a = parseFloat(m[1]);
          var b = m[2] ? parseFloat(m[2]) : a;
          if (!isFinite(a)) return {raw:s};
          if (!isFinite(b)) b = a;

          // If someone enters 0.15 meaning 15%, auto-scale
          if (a > 0 && a <= 1 && b <= 1) { a = a*100; b = b*100; }

          return {min:a, max:b, raw:s};
        }

        // Scale: use max across ranges (supports € or k€)
        var maxAll = 0;
        [jmin,jmax,mmin,mmax,smin,smax].forEach(function(v){
          if (v==null) return;
          var n = Number(v);
          if (!isFinite(n)) return;
          if (n > 999) n = n/1000;
          maxAll = Math.max(maxAll, n);
        });
        if (!isFinite(maxAll) || maxAll<=0) maxAll = 1;

        // Title: mimic screenshot wording for FR
        var salaryTitle = ui(lang2,'salary');
        if (String(ctx.iso||'').toUpperCase()==='FR'){
          salaryTitle = (String(lang2)==='fr') ? 'Grille salariale (France)' : (ui(lang2,'salary') + ' (France)');
        }

        function itemRow(label, emoji, minv, maxv, expTxt){
          var rng = fmtRange(minv,maxv,cur);
          if (!rng) return '';
          var maxv2 = (maxv!=null?maxv:minv);
          var n = Number(maxv2);
          if (isFinite(n) && n > 999) n = n/1000;
          var fill = pctFill(n, maxAll);
          return '' +
            '<div class="u-salary-item">' +
              '<div class="u-salary-top">' +
                '<div class="u-salary-left"><span class="emoji">'+emoji+'</span><span>'+esc(label)+'</span></div>' +
                '<div class="u-salary-range">'+esc(rng)+'</div>' +
              '</div>' +
              '<div class="u-salary-bar"><i style="width:'+fill+'%"></i></div>' +
              (expTxt ? '<div class="u-salary-subtxt">'+esc(expTxt)+'</div>' : '') +
            '</div>';
        }

        var expJ = (String(lang2)==='fr') ? '0–2 ans d\'expérience' : '0–2 years experience';
        var expM = (String(lang2)==='fr') ? '3–5 ans d\'expérience' : '3–5 years experience';
        var expS = (String(lang2)==='fr') ? '5+ ans d\'expérience' : '5+ years experience';

        var html = '<div class="u-salary-wrap">' +
          '<div class=\"u-salary-lead\">'+
            esc((String(lang2)==='fr')
              ? 'Les agents perçoivent souvent une part variable liée à la performance commerciale.'
              : 'Many roles include a variable component linked to sales performance.') +
          '</div>';

        var anyRow = false;

        if (hasNums){
          var r1 = itemRow(ui(lang2,'junior'), '🧳', jmin, jmax, expJ); if (r1){ html += r1; anyRow=true; }
          var r2 = itemRow(ui(lang2,'mid'),    '🚀', mmin, mmax, expM); if (r2){ html += r2; anyRow=true; }
          var r3 = itemRow(ui(lang2,'senior'), '⭐', smin, smax, expS); if (r3){ html += r3; anyRow=true; }
        }

        // Variable share line (if present)
        var varObj = parseVariable(ctx.mpb && (ctx.mpb.variable_share || ctx.mpb.part_variable || ctx.mpb.partVariable || ctx.mpb.part_variable_pct || ctx.mpb.part_variable_minmax || ctx.mpb.Part_variable));
        if (varObj && (varObj.min!=null || varObj.raw)){
          var vMin = (varObj.min!=null?varObj.min:null);
          var vMax = (varObj.max!=null?varObj.max:vMin);
          var vTxt = (vMin!=null && vMax!=null) ? (Math.round(vMin)+'–'+Math.round(vMax)+'%') : (varObj.raw||'');
          var vFill = (vMax!=null && isFinite(vMax)) ? Math.max(10, Math.min(100, Math.round((Number(vMax)/30)*100))) : 25;
          html += '' +
            '<div class="u-salary-item">' +
              '<div class="u-salary-top">' +
                '<div class="u-salary-left"><span class="emoji">📌</span><span>'+(String(lang2)==='fr'?'Part variable':'Variable')+'</span></div>' +
                '<div class="u-salary-range">'+esc(vTxt)+'</div>' +
              '</div>' +
              '<div class="u-salary-bar"><i style="width:'+vFill+'%"></i></div>' +
              '<div class="u-salary-subtxt">'+(String(lang2)==='fr'?'Bonus, intéressement, participation':'Bonus, incentives, profit-sharing')+'</div>' +
            '</div>';
          anyRow = true;
        }

        if (!anyRow && ctx.mpb && ctx.mpb.salaire_bloc){
          html += '<div class="u-salary-item"><div class="u-salary-muted">' + esc(htmlToText(String(ctx.mpb.salaire_bloc))) + '</div></div>';
          anyRow = true;
        }

        if (ctx.mpb && ctx.mpb.salary_notes){
          html += '<div class="u-salary-note">'+esc(htmlToText(String(ctx.mpb.salary_notes)))+'</div>';
        } else {
          html += '<div class="u-salary-note">'+
                  esc((String(lang2)==='fr') ? "Rémunération variable selon l’expérience, la localisation et le type de structure."
                                            : "Salary varies with experience, location and employer type.") +
                  '</div>';
        }

        if (!anyRow){
          html += '<div class="u-salary-item"><div class="u-salary-muted">' +
                  esc((String(lang2)==='fr') ? "Données de grille non disponibles pour ce pays." : "Salary ranges not available for this country.") +
                  '</div></div>';
        }

        html += '</div>';

        right.appendChild(card(ui(lang2,'salary'), 'gradient-success', html));
})();

      // Optional: other rich fields (kept at the end so the page stays scannable)
      if (ctx.mpb.certifications){
        var certArr = splitTagsStrict(ctx.mpb.certifications);
        var certHtml = certArr && certArr.length ? blockContentPillCol(certArr) : listifyIfNeeded(cleanRichHTML(String(ctx.mpb.certifications)));
        right.appendChild(card(ui(lang2,'certifications'), 'bg-orange', certHtml));
      }
      if (ctx.mpb.schools_or_paths){
        var schArr = splitTagsStrict(ctx.mpb.schools_or_paths);
        var schHtml = schArr && schArr.length ? blockContentPillCol(schArr) : listifyIfNeeded(cleanRichHTML(String(ctx.mpb.schools_or_paths)));
        right.appendChild(card(ui(lang2,'schools_paths'), 'bg-purple', schHtml));
      }
      if (ctx.mpb.portfolio_projects){
        var pfArr = splitTagsStrict(ctx.mpb.portfolio_projects);
        var pfHtml = pfArr && pfArr.length ? blockContentPillCol(pfArr) : listifyIfNeeded(cleanRichHTML(String(ctx.mpb.portfolio_projects)));
        right.appendChild(card(ui(lang2,'portfolio_projects'), 'bg-purple', pfHtml));
      }
    }

    // 4) Profil — LEFT (contexte)
    if (ctx.fiche){
      var f2 = ctx.fiche;
      if (f2.profil_recherche) left.appendChild(card(ui(langL,'profile'), '', cleanBlock(f2.profil_recherche)));
      // NOTE: evolutions_possibles is intentionally placed above Formation earlier.
    }

// Append columns (FIX: left was missing in v4.8)
    row.appendChild(left);
    row.appendChild(right);
    root.appendChild(row);
    setSalaryBars(root);

    // Banner before FAQ (wide)
    var beforeFaq = renderBeforeFaqBanner(ctx);

    // FAQ bottom
    var faqs = getFAQs();
    if (beforeFaq) root.appendChild(beforeFaq);
    root.appendChild(document.createElement('div')).style.height = '18px';
    root.appendChild(renderFAQ(faqs, ctx));
  }

  // ---------- main ----------
  async function main(){
    // Show loader immediately when user changes selections (before URL/navigation work)
    (function(){
      if (window.__ULYDIA_INSTANT_LOADER__) return;
      window.__ULYDIA_INSTANT_LOADER__ = true;

      function shouldTrigger(el){
        if (!el) return false;
        // Native selects
        var tag = (el.tagName||"").toLowerCase();
        if (tag === "select") {
          var id = (el.id||"").toLowerCase();
          var name = (el.name||"").toLowerCase();
          return id.indexOf("metier") !== -1 || name.indexOf("metier") !== -1 || el.getAttribute("data-filter") === "metier";
        }
        // Custom selects (Finsweet / select wrappers)
        var r = (el.getAttribute && (el.getAttribute("role")||"").toLowerCase()) || "";
        var cls = (el.className||"").toString().toLowerCase();
        if (r === "option" || cls.indexOf("option") !== -1 || cls.indexOf("fs-select") !== -1 || cls.indexOf("w-dropdown") !== -1) {
          // only if it's inside filters area
          try{
            var p = el;
            for (var i=0;i<10 && p;i++){
              if (p.getAttribute && p.getAttribute("data-ulydia-filters") === "1") return true;
              if (p.classList && (p.classList.contains("ulydia-filters") || p.classList.contains("filters-bar"))) return true;
              p = p.parentElement;
            }
          }catch(e){}
        }
        return false;
      }

      document.addEventListener("change", function(e){
        var el = e && e.target;
        if (!e || e.isTrusted !== true) return;
        if (!shouldTrigger(el)) return;

        // Only show loader when a real value is selected (and it changed)
        var v = (el && typeof el.value !== 'undefined') ? String(el.value||"").trim() : "";
        var prev = el.getAttribute("data-ul-prev") || "";
        if (!v || v === prev) return;
        el.setAttribute("data-ul-prev", v);

        try{ window.showMetierLoader && window.showMetierLoader(); }catch(_){}
      }, true);
    })();

    
    // Global fallback language (needed before async go() runs)
    var finalLang = normLang(window.__ULYDIA_LANG_FINAL__ || (window.__ULYDIA_PAGE_DATA__ && window.__ULYDIA_PAGE_DATA__.lang) || "en");
  try{ window.__ULYDIA_FINAL_LANG__ = (typeof finalLang!=="undefined" && finalLang) ? String(finalLang).toLowerCase() : window.__ULYDIA_FINAL_LANG__; }catch(e){}


var q = getQuery();
    // ✅ NO-RANDOM: if no ?metier= in URL, do NOT render a random job.
    if (!q.metier){
      var root0 = ensureRoot();
      root0.innerHTML =
        '<div style="max-width:1100px;margin:24px auto;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.08);border:1px solid rgba(148,163,184,.35)">' +
          '<div style="padding:12px 16px;background:linear-gradient(90deg,rgba(99,102,241,.18),rgba(99,102,241,.06));font-weight:800;font-family:Montserrat,system-ui;color:#0f172a">✨ '+tr("missing_job_title")+'</div>' +
          '<div style="padding:18px 16px">' +
            '<div style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;font-family:Montserrat,system-ui">'+tr("missing_job_title")+'</div>' +
            '<div style="color:#475569;line-height:1.6;font-family:Montserrat,system-ui">'+tr("missing_job_msg")+'</div>' +
          '</div>' +
        '</div>';
      return;
    }

    // ✅ NO-LOOP: prevent accidental re-entrancy (double script load / repeated init)
    if (window.__ULYDIA_METIER_PAGE_RUNNING__) return;
    window.__ULYDIA_METIER_PAGE_RUNNING__ = true;

    async function go(){
    try{ window.showMetierLoader && window.showMetierLoader(); }catch(e){}
    var __loaderStart = Date.now();


    // --- Airtable-first: fetch page payload from Worker (fiche + MPB + FAQ)
    // Keep banners/country detection unchanged.
    try{ window.__ULYDIA_PAGE_DATA__ = null; }catch(e){}
    var __workerPayload = null;
    try{ __workerPayload = await fetchMetierPageData(q.metier, q.country); }catch(e){ __workerPayload = null; }
    if (__workerPayload){
      try{
        window.__ULYDIA_PAGE_DATA__ = {
          metier: (__workerPayload.metier || __workerPayload.fiche || __workerPayload.job || __workerPayload.metier_data || __workerPayload.data || null),
          mpb: (
          __workerPayload.mpb ||
          __workerPayload.metier_pays_blocs ||
          __workerPayload.metierPaysBlocs ||
          __workerPayload.mpb_blocks ||
          (__workerPayload.blocs_pays && __workerPayload.blocs_pays[0]) ||
          (__workerPayload.blocsPays && __workerPayload.blocsPays[0]) ||
          null
        ),
          faq: (__workerPayload.faq || __workerPayload.faqs || __workerPayload.FAQ || __workerPayload.FAQs || null),
          country: (__workerPayload.country || __workerPayload.pays || __workerPayload.country_data || null),
          lang: (__workerPayload.lang || __workerPayload.language || __workerPayload.lang_final || __workerPayload.finalLang || null),
          _raw: __workerPayload
        };
      }catch(e){}
    }

    var metier = findMetierBySlug(q.metier);
    var fiche = findFiche(q.metier);
    var country = findCountry(q.country);
    // preload catalog and merge non-sponsor banners if Webflow export is incomplete
    await loadCatalogOnce();
    var catCountry = findCatalogCountrySync(q.country);

// Prefer catalog country fields when available (contains `langue_finale`, banners, etc.)
if (catCountry && country){
  try{ country = Object.assign({}, country, catCountry); }catch(e){}
}else if (catCountry && !country){
  country = catCountry;
}
// Normalize language key
if (country && !country.lang && (country.langue_finale || country.lang_finale || country.final_lang || country.finalLang)){
  country.lang = country.langue_finale || country.lang_finale || country.final_lang || country.finalLang;
}

    if (catCountry){
      if (!country) country = catCountry;
      else {
        // keep existing fields, fill missing ones
        if (!country.banner_wide && catCountry.banner_wide) country.banner_wide = catCountry.banner_wide;
        if (!country.banner_square && catCountry.banner_square) country.banner_square = catCountry.banner_square;
        if (!country.banner_text && catCountry.banner_text) country.banner_text = catCountry.banner_text;
        if (!country.banner_cta && catCountry.banner_cta) country.banner_cta = catCountry.banner_cta;
        if (!country.lang && catCountry.lang) country.lang = catCountry.lang;
      }
    }
    
    // Country validity: if URL provides a country but we can't resolve it from CMS export nor catalog, show a clear message.
if (q.country && !country && !catCountry){
  country = { iso: String(q.country||"").toUpperCase(), label: String(q.country||"").toUpperCase(), name: String(q.country||"").toUpperCase(), lang: "en" };
}

var mpb = findMPB(q.metier, q.country);

// Final language (from country) drives availability:
// The job must exist in this language. Otherwise we show "Not available" (English system message).
var finalLang = getFinalLang(q.country, country, catCountry);

if (DEBUG){
  try{
    console.log('[ULYDIA][LANG]', { iso: q.country, finalLang: finalLang, country: country && (country.label||country.name||country.iso), catCountry: catCountry && (catCountry.label||catCountry.name||catCountry.iso), ficheLang: fiche && (fiche.lang||fiche.language||fiche.locale||fiche.langue) });
  }catch(e){}
}


// Prefer fiche data; require fiche.lang to match finalLang.
// pick fiche by final language (strict per slug; migration-safe)
var pick = pickFicheForLang(q.metier, finalLang);
var ficheAny = pick.any;
fiche = pick.fiche;
// Treat empty Airtable objects as missing
if (fiche && !ficheHasContent(fiche)) fiche = null;
var __NOT_AVAILABLE__ = !fiche;

var fichePickMode = pick.mode;
var ctx = {
      slug: slugify(q.metier),
      iso: q.country,
      finalLang: finalLang,
      fichePickMode: fichePickMode,
      ficheAny: ficheAny,
      notAvailable: __NOT_AVAILABLE__,
      name: (metier && (metier.name || metier.Nom)) || (fiche && (fiche.job_title || fiche.title || fiche.name || fiche.Nom)) || "",
      sector: (pickSectorFromSources(metier, fiche, mpb) || detectSectorFromDOM()) || '',
      accroche: (fiche && (fiche.accroche || fiche.accroche_texte || fiche.accrocheTexte)) || '',
      currency: (country && (country.currency || country.devise)) || (mpb && (mpb.devise || mpb.currency)) || '',
      fiche: fiche,
      country: country,
      mpb: mpb,
      sponsor: '__PENDING__'
    };

    // MPB can be missing for some (metier + country). We still render the page using fiche data.
    // Base requirement: fiche metier must exist in final language.
    
// TEMP (pre-multilang): only FR fiche_metier exists. If final language isn't FR, show Not available.
// Keep loader homogeneous: ensure it is visible at least MIN_LOADER_MS to avoid flicker
    var MIN_LOADER_MS = 900;
    try{
      var __elapsed = Date.now() - __loaderStart;
      if (__elapsed < MIN_LOADER_MS) await new Promise(function(r){ setTimeout(r, MIN_LOADER_MS - __elapsed); });
    }catch(e){}

    if (!ctx.fiche) {
      try{
        try{ window.hideMetierLoader && window.hideMetierLoader(); }catch(e){}
        if (window.renderNotAvailableCard) {
          window.renderNotAvailableCard((ctx.country && (ctx.country.label||ctx.country.name||ctx.country.iso)) || ctx.iso || "");
        } else {
          var root0 = ensureRoot();
          root0.innerHTML = '';
          root0.appendChild(renderNotAvailable(ctx));
        }
      }catch(e){
        var root0b = ensureRoot();
        root0b.innerHTML = '';
        root0b.appendChild(renderNotAvailable(ctx));
      }
      return;
    }


    // Render page (banners pending), then resolve sponsor and rerender banners without showing non-sponsor first
    try{ window.hideMetierLoader && window.hideMetierLoader(); }catch(e){}
    renderPage(ctx);

    fetchSponsor(ctx.slug, ctx.iso).then(function(s){
      ctx.sponsor = s || null;
      renderPage(ctx);
    });
    log('[ULYDIA] v2.9 ready', {metier: ctx.slug, iso: ctx.iso, hasFiche: !!ctx.fiche, hasMPB: !!ctx.mpb, hasCountry: !!ctx.country});
    }

    if (!q.country) {
      getVisitorIso(function(iso){
        q.country = (iso && /^[A-Z]{2}$/.test(iso)) ? iso : 'US';
        go();
      });
      return;
    }
    try { await go(); } catch(e){ console.error(e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();

/* =========================================================
   MOBILE ACCORDIONS (mobile-only)
   - Collapses most sections on small screens to avoid overload
   - Keeps salary + key indicators open by default
========================================================= */
(function(){
  try {
    var mq = window.matchMedia && window.matchMedia("(max-width: 991px)");
    if (!mq || !mq.matches) return;

    // Inject CSS once
    if (!document.getElementById("ulydia-mobile-accordions-css")) {
      var css = [
        "@media (max-width: 991px){",
        "  .u-card.u-collapsed .u-card-b{ display:none !important; }",
        "  .u-card-h{ cursor:pointer; user-select:none; }",
        "  .u-acc-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; }",
        "  .u-acc-chev{ width:26px; height:26px; border-radius:999px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; transition:transform .16s ease, box-shadow .16s ease; }",
        "  .u-card-h:hover .u-acc-chev{ box-shadow:0 6px 18px rgba(0,0,0,.10); transform:scale(1.05); }",
        "  .u-card.u-collapsed .u-acc-chev{ transform:rotate(-90deg); }",
        "  .u-card:not(.u-collapsed) .u-acc-chev{ transform:rotate(0deg); }",
        "  .u-acc-btn{ all:unset; cursor:pointer; width:100%; }",
        "}",
        // subtle hover zoom for each env sub-block as requested (mobile + desktop)
        ".u-env-item{ transition:transform .16s ease, box-shadow .16s ease; }",
        ".u-env-item:hover{ transform:scale(1.015); box-shadow:0 6px 18px rgba(0,0,0,.08); }"
      ].join("\\n");
      var style = document.createElement("style");
      style.id = "ulydia-mobile-accordions-css";
      style.textContent = css;
      document.head.appendChild(style);
    }

    function normTxt(s){
      return String(s||"").toLowerCase().replace(/\\s+/g," ").trim();
    }

    // Titles that should remain expanded by default (in any supported language)
    var keepOpen = [
      "indicateurs clés","key indicators","indicadores clave","indicadores clave","indicatori chiave","schlüsselindikatoren",
      "rémunération","compensation","remuneración","vergütung","retribuzione","retribuzione"
    ].map(normTxt);

    var cards = Array.prototype.slice.call(document.querySelectorAll(".u-card"));
    cards.forEach(function(card){
      var h = card.querySelector(".u-card-h");
      var b = card.querySelector(".u-card-b");
      if (!h || !b) return;

      // wrap header content into an accessible button
      if (!h.querySelector(".u-acc-btn")) {
        var current = h.innerHTML;
        h.innerHTML = "";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "u-acc-btn";
        btn.setAttribute("aria-expanded","true");

        var row = document.createElement("div");
        row.className = "u-acc-row";

        var left = document.createElement("div");
        left.innerHTML = current;

        var chev = document.createElement("div");
        chev.className = "u-acc-chev";
        chev.innerHTML = "▾";

        row.appendChild(left);
        row.appendChild(chev);
        btn.appendChild(row);
        h.appendChild(btn);

        btn.addEventListener("click", function(){
          var isCollapsed = card.classList.toggle("u-collapsed");
          btn.setAttribute("aria-expanded", String(!isCollapsed));
        });
      }

      var section = (card.getAttribute("data-section")||"").toLowerCase().trim();
      var titleEl = card.querySelector(".section-title") || card.querySelector("h3") || card.querySelector("h2");
      var title = normTxt(titleEl ? titleEl.textContent : "");

      // Keep salary + key indicators open; collapse everything else by default on mobile
      var shouldKeepOpen = (section === "salary") || keepOpen.includes(title);
      if (!shouldKeepOpen) {
        card.classList.add("u-collapsed");
        var btn2 = card.querySelector(".u-acc-btn");
        if (btn2) btn2.setAttribute("aria-expanded","false");
      }
    });

  } catch(e) { /* silent */ }
})();


/* =========================================================
   BANNERS: open links in new tab
========================================================= */
(function(){
  try{
    function markBlank(a){
      if (!a || !a.href) return;
      a.setAttribute("target","_blank");
      var rel = (a.getAttribute("rel")||"").toLowerCase();
      if (!rel.includes("noopener")) rel = (rel ? rel+" " : "") + "noopener";
      if (!rel.includes("noreferrer")) rel = rel + " noreferrer";
      a.setAttribute("rel", rel.trim());
    }
    var anchors = Array.prototype.slice.call(document.querySelectorAll(
      ".u-banner a[href], .u-sponsor a[href], a[data-banner][href], a[data-sponsor][href]"
    ));
    anchors.forEach(markBlank);
  }catch(e){}
})();


/* =========================================================
   BANNERS UX PATCH
   - Hover zoom on horizontal banner #2
   - Prevent non-sponsor banner flash on sponsored pages:
     hide fallback while sponsor is pending, reveal fallback after timeout if no sponsor
========================================================= */
(function(){
  try{
    // CSS once
    if (!document.getElementById("ulydia-banner-ux-css")) {
      var css = [
        ".u-banner-zoom img, .u-banner-zoom picture, .u-banner-zoom .u-banner-img{",
        "  transition: transform .18s ease, box-shadow .18s ease;",
        "}",
        ".u-banner-zoom:hover img, .u-banner-zoom:hover picture, .u-banner-zoom:hover .u-banner-img{",
        "  transform: scale(1.015);",
        "  box-shadow: 0 10px 26px rgba(0,0,0,.12);",
        "}",
        ".u-banner-fallback-hidden{ visibility:hidden !important; opacity:0 !important; }"
      ].join("\n");
      var st=document.createElement("style");
      st.id="ulydia-banner-ux-css";
      st.textContent=css;
      document.head.appendChild(st);
    }

    // Mark horizontal banner #2 zoomable (best-effort selectors + heuristic)
    function markBanner2Zoom(){
      var sel = [
        "[data-banner-idx='2']",
        "[data-banner='2']",
        "#ulydia-banner-2",
        "#ulydia-banner-2-slot",
        "#ulydia-banner-before-faq-slot",
        ".u-banner.banner-2",
        ".u-banner.b2"
      ];
      for (var i=0;i<sel.length;i++){
        var el=document.querySelector(sel[i]);
        if (el){ el.classList.add("u-banner-zoom"); return; }
      }
      var hs = Array.prototype.slice.call(document.querySelectorAll(".u-banner.horizontal, .u-banner--horizontal, .u-banner-h"));
      if (hs.length >= 2) hs[1].classList.add("u-banner-zoom");
    }
    markBanner2Zoom();

    // Prevent non-sponsor flash when sponsor info is pending
    var pending = (window.__ULYDIA_CTX__ && window.__ULYDIA_CTX__.sponsor === "__PENDING__") ||
                  (window.__ULYDIA_SPONSOR_PENDING__ === true);

    if (pending) {
      var fallbackEls = Array.prototype.slice.call(document.querySelectorAll(
        ".u-banner.fallback, .u-banner--fallback, [data-banner-fallback='1'], [data-fallback='1']"
      ));
      fallbackEls.forEach(function(el){ el.classList.add("u-banner-fallback-hidden"); });

      function hasSponsor(){
        return !!document.querySelector(".u-banner.sponsored, .u-banner--sponsored, .u-sponsor img, [data-sponsored='1'], [data-sponsor='1']");
      }

      // If sponsor appears, keep fallback hidden; if not, reveal after timeout
      var timeoutMs = 1600;
      var revealed = false;

      function revealFallback(){
        if (revealed) return;
        revealed = true;
        // Only reveal if sponsor did NOT appear
        if (hasSponsor()) return;
        fallbackEls.forEach(function(el){ el.classList.remove("u-banner-fallback-hidden"); });
      }

      // Observe DOM mutations to detect sponsor insertion
      var obs = new MutationObserver(function(){
        // if sponsor appears, we can stop observing
        if (hasSponsor()){
          // keep fallback hidden
          return;
        }
      });
      obs.observe(document.documentElement, { childList:true, subtree:true });

      setTimeout(revealFallback, timeoutMs);
    }

  }catch(e){}
})();


/* =========================================================
   BANNERS UX PATCH v2 (robust)
   - Apply hover zoom to ALL horizontal banners (incl. banner #2)
   - Remove non-sponsor flash by hiding fallback for a short grace period,
     then reveal ONLY if no sponsor banner appears.
========================================================= */
(function(){
  try{
    // CSS once
    if (!document.getElementById("ulydia-banner-ux-css-v2")) {
      var css = [
        ".u-banner.horizontal, .u-banner--horizontal, .u-banner-h, #ulydia-banner-before-faq-slot{",
        "  overflow:hidden;",
        "}",
        ".u-banner.horizontal img, .u-banner--horizontal img, .u-banner-h img, #ulydia-banner-before-faq-slot img{",
        "  transition: transform .18s ease, box-shadow .18s ease;",
        "}",
        ".u-banner.horizontal:hover img, .u-banner--horizontal:hover img, .u-banner-h:hover img, #ulydia-banner-before-faq-slot:hover img{",
        "  transform: scale(1.02);",
        "  box-shadow: 0 10px 26px rgba(0,0,0,.12);",
        "}",
        ".u-banner-fallback-hidden{ visibility:hidden !important; opacity:0 !important; }"
      ].join("\\n");
      var st=document.createElement("style");
      st.id="ulydia-banner-ux-css-v2";
      st.textContent=css;
      document.head.appendChild(st);
    }

    function hasSponsor(){
      return !!document.querySelector(
        ".u-banner.sponsored, .u-banner--sponsored, [data-sponsored='1'], [data-sponsor='1'], .u-sponsor img"
      );
    }

    function getFallbackEls(){
      return Array.prototype.slice.call(document.querySelectorAll(
        ".u-banner.fallback, .u-banner--fallback, [data-banner-fallback='1'], [data-fallback='1']"
      ));
    }

    // Always avoid flash: hide fallback for a short grace period on page load.
    var graceMs = 1600;
    var fallbackEls = getFallbackEls();
    fallbackEls.forEach(function(el){ el.classList.add("u-banner-fallback-hidden"); });

    var revealed = false;
    function revealFallbackIfNeeded(){
      if (revealed) return;
      revealed = true;
      if (hasSponsor()) return; // sponsored page: keep fallback hidden
      fallbackEls.forEach(function(el){ el.classList.remove("u-banner-fallback-hidden"); });
    }

    var obs = new MutationObserver(function(){
      if (hasSponsor()){
        try { obs.disconnect(); } catch(e){}
      }
    });
    obs.observe(document.documentElement, { childList:true, subtree:true });

    setTimeout(revealFallbackIfNeeded, graceMs);
  }catch(e){}
})();

})();
;try{
  setTimeout(function(){
    try{
      // If something rendered in root, consider done
      var r = document.getElementById("ulydia-metier-root");
      if(r && r.children && r.children.length>0){
        window.dispatchEvent(new CustomEvent("ulydia:metier:rendered"));
      }
    }catch(e){}
  }, 15000);
}catch(e){}

;/* === ULYDIA PATCH: rendered-signal + force-hide nav loader (FIX21) === */
(function(){
  function hideNavLoader(){
    try{
      var el = document.getElementById("ulydia-nav-loader");
      if(el) el.hidden = true;
    }catch(e){}
    try{ sessionStorage.removeItem("ulydia_nav_loading"); }catch(e){}
  }
  function fire(){
    try{ window.dispatchEvent(new CustomEvent("ulydia:metier:rendered")); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent("ulydia:metier:loaded")); }catch(e){}
  }
  function hasRendered(){
    try{
      var root = document.getElementById("ulydia-metier-root") || document.getElementById("ulydia-metier-root");
      if(root && root.children && root.children.length > 0) return true;
      if(document.querySelector(".ulydia-metier-container")) return true;
    }catch(e){}
    return false;
  }

  // Always hide any leftover loader ASAP
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", hideNavLoader, { once:true });
  }else{
    hideNavLoader();
  }

  // Fire rendered when content is there, otherwise safety fire to avoid stuck overlays
  var killed = false;
  function kill(){
    if(killed) return;
    killed = true;
    hideNavLoader();
    fire();
    try{ clearInterval(tick); }catch(e){}
    try{ clearTimeout(hard); }catch(e){}
    try{ if(obs) obs.disconnect(); }catch(e){}
  }

  var tick = setInterval(function(){
    if(hasRendered()) kill();
  }, 150);

  var obs = null;
  try{
    obs = new MutationObserver(function(){ if(hasRendered()) kill(); });
    obs.observe(document.documentElement, { childList:true, subtree:true });
  }catch(e){}

  // window.load as extra
  window.addEventListener("load", function(){ if(hasRendered()) kill(); else fire(); }, { once:true });

  // hard timeout
  var hard = setTimeout(function(){ kill(); }, 10000);
})();


// Fallback: ensure rendered signal fires after load
try{window.addEventListener('load', function(){ setTimeout(function(){ try{ window.ulydiaNotifyRendered && window.ulydiaNotifyRendered(); }catch(e){} }, 300); }, { once:true });}catch(e){}
