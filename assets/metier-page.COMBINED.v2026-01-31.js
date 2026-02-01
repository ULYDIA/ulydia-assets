/* COMBINED: metier page + ULYDIA PATCHES
   - Original metier page (unchanged)
   - Appended: ulydia-metier-render.patch.js
   - Appended: ulydia-metier-style.patch.js
   This file is generated for convenience; do not modify the BASE file directly.
*/

(function(){
  "use strict";

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
    return x && slugify(x.slug || x.Slug || x.metier || x.name) === slug;
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
  // 1) catalog countries (source of truth)
  try{
    var cat = (window.__ULYDIA_CATALOG__ && window.__ULYDIA_CATALOG__.countries) || null;
    if (Array.isArray(cat) && iso){
      for (var i=0;i<cat.length;i++){
        var c = cat[i];
        var ciso = String((c && (c.iso || c.code_iso || c.codeIso || c.country_code || c.countryCode || c.code)) || "").toUpperCase();
        if (ciso === iso){
          var l = c.langue_finale || c.lang_finale || c.final_lang || c.finalLang || c.lang || c.language || c.default_lang || c.defaultLang;
          return normLang(l || getBaseContentLang());
        }
      }
    }
  }catch(e){}

  // 2) catCountry (already picked)
  if (catCountry){
    var l2 = catCountry.langue_finale || catCountry.lang_finale || catCountry.final_lang || catCountry.finalLang || catCountry.lang || catCountry.language || catCountry.default_lang || catCountry.defaultLang;
    if (l2) return normLang(l2);
  }
  // 3) country object (from CMS)
  if (country){
    var l3 = country.langue_finale || country.lang_finale || country.final_lang || country.finalLang || country.lang || country.language || country.default_lang || country.defaultLang;
    if (l3) return normLang(l3);
  }
  return 'en';
}

function getPageData(){
  return window.__ULYDIA_METIER_PAGE_V29__ || window.__ULYDIA_PAGE_DATA__ || window.__ULYDIA_PAGE__ || null;
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
        obj.entry_routes          = pickHTML(it.querySelector(".js-bf-entry_routes"));
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

  // ... (the rest of the original file continues unchanged) ...

  // ---------- appended PATCH: ulydia-metier-render.patch.js ----------

/* ULYDIA — Fiche métier renderer (PATCH)
   Responsibility: render métier page into #ulydia-metier-root
   Constraints: IIFE, anti-loop flag, null-safe, Safari compatible, no console output
*/
(function () {
  'use strict';

  var FLAG = '__ULYDIA_METIER_RENDERED__';

  function safeIsEmpty(v) {
    return v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
  }

  function ensureArray(v) {
    if (Array.isArray(v)) return v.filter(function (x) { return x !== null && x !== undefined; });
    if (typeof v === 'string') {
      var s = v.trim();
      return s === '' ? [] : [s];
    }
    return [];
  }

  function createEl(tag, opts) {
    var el = document.createElement(tag);
    if (!opts) return el;
    if (opts.className) el.className = opts.className;
    if (opts.text) el.textContent = opts.text;
    if (opts.html) el.innerHTML = opts.html;
    if (opts.attrs) {
      for (var k in opts.attrs) {
        if (opts.attrs.hasOwnProperty(k) && opts.attrs[k] != null) {
          el.setAttribute(k, String(opts.attrs[k]));
        }
      }
    }
    if (opts.style) {
      for (var s in opts.style) {
        if (opts.style.hasOwnProperty(s)) {
          el.style[s] = opts.style[s];
        }
      }
    }
    return el;
  }

  function appendIf(parent, child) {
    if (!parent || !child) return;
    parent.appendChild(child);
  }

  function render(root, data) {
    if (!root || !data) return;

    // Container wrapper
    var container = createEl('div', { className: 'ulydia-metier-container', style: { boxSizing: 'border-box' } });

    // HERO (title, subtitle, image)
    var hasTitle = !safeIsEmpty(data.title);
    var hasSubtitle = !safeIsEmpty(data.subtitle);
    var hasImage = !safeIsEmpty(data.heroImageUrl);

    if (hasTitle || hasSubtitle || hasImage) {
      var hero = createEl('header', { className: 'ulydia-hero', style: { padding: '20px 0' } });

      if (hasImage) {
        var img = createEl('img', { attrs: { src: data.heroImageUrl }, className: 'ulydia-hero-img', style: { maxWidth: '100%', height: 'auto', display: 'block', marginBottom: '12px' } });
        appendIf(hero, img);
      }

      if (hasTitle) {
        var h1 = createEl('h1', { text: data.title, className: 'ulydia-title', style: { margin: '0 0 8px', fontSize: '28px', lineHeight: '1.15' } });
        appendIf(hero, h1);
      }

      if (hasSubtitle) {
        var sub = createEl('p', { text: data.subtitle, className: 'ulydia-subtitle', style: { margin: '0 0 6px', color: '#555' } });
        appendIf(hero, sub);
      }

      appendIf(container, hero);
    }

    // Summary
    if (!safeIsEmpty(data.summary)) {
      var sum = createEl('section', { className: 'ulydia-summary', style: { margin: '12px 0' } });
      var p = createEl('p', { text: data.summary, style: { margin: '0', color: '#333' } });
      appendIf(sum, p);
      appendIf(container, sum);
    }

    // Meta (location, salary)
    var hasLocation = !safeIsEmpty(data.location);
    var hasSalary = !safeIsEmpty(data.salary);
    if (hasLocation || hasSalary) {
      var meta = createEl('div', { className: 'ulydia-meta', style: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' } });
      if (hasLocation) {
        var loc = createEl('div', { className: 'ulydia-meta-item ulydia-location', text: data.location, style: { color: '#444' } });
        appendIf(meta, loc);
      }
      if (hasSalary) {
        var sal = createEl('div', { className: 'ulydia-meta-item ulydia-salary', text: data.salary, style: { color: '#444' } });
        appendIf(meta, sal);
      }
      appendIf(container, meta);
    }

    // Responsibilities (array)
    var responsibilities = ensureArray(data.responsibilities);
    if (responsibilities.length > 0) {
      var sec = createEl('section', { className: 'ulydia-block ulydia-responsibilities', style: { marginTop: '16px' } });
      var t = createEl('h2', { text: 'Responsabilités', style: { fontSize: '18px', margin: '0 0 8px' } });
      appendIf(sec, t);
      var ul = createEl('ul', { style: { margin: '0 0 0 18px', padding: '0' } });
      for (var i = 0; i < responsibilities.length; i++) {
        var item = responsibilities[i];
        if (safeIsEmpty(item)) continue;
        var li = createEl('li', { text: String(item) });
        appendIf(ul, li);
      }
      if (ul.childNodes && ul.childNodes.length > 0) appendIf(sec, ul);
      if (sec.childNodes && sec.childNodes.length > 0) appendIf(container, sec);
    }

    // Skills
    var skills = ensureArray(data.skills);
    if (skills.length > 0) {
      var ssec = createEl('section', { className: 'ulydia-block ulydia-skills', style: { marginTop: '16px' } });
      var st = createEl('h2', { text: 'Compétences', style: { fontSize: '18px', margin: '0 0 8px' } });
      appendIf(ssec, st);
      var tagWrap = createEl('div', { className: 'ulydia-tags', style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } });
      for (var j = 0; j < skills.length; j++) {
        var sk = skills[j];
        if (safeIsEmpty(sk)) continue;
        var tag = createEl('span', { text: String(sk), className: 'ulydia-tag', style: { padding: '6px 8px', background: '#f0f0f0', borderRadius: '4px', fontSize: '13px' } });
        appendIf(tagWrap, tag);
      }
      if (tagWrap.childNodes && tagWrap.childNodes.length > 0) appendIf(ssec, tagWrap);
      if (ssec.childNodes && ssec.childNodes.length > 0) appendIf(container, ssec);
    }

    // Tags (free tags)
    var tags = ensureArray(data.tags);
    if (tags.length > 0) {
      var tsec = createEl('section', { className: 'ulydia-block ulydia-free-tags', style: { marginTop: '16px' } });
      var tt = createEl('h3', { text: 'Mots-clés', style: { margin: '0 0 8px', fontSize: '16px' } });
      appendIf(tsec, tt);
      var twrap = createEl('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } });
      for (var k = 0; k < tags.length; k++) {
        var tg = tags[k];
        if (safeIsEmpty(tg)) continue;
        var pill = createEl('span', { text: String(tg), style: { padding: '4px 6px', background: '#eef2ff', borderRadius: '3px', fontSize: '13px' } });
        appendIf(twrap, pill);
      }
      if (twrap.childNodes && twrap.childNodes.length > 0) appendIf(tsec, twrap);
      if (tsec.childNodes && tsec.childNodes.length > 0) appendIf(container, tsec);
    }

    // CTA (optional)
    if (!safeIsEmpty(data.ctaText) && !safeIsEmpty(data.ctaUrl)) {
      var ctaWrap = createEl('div', { style: { marginTop: '18px' } });
      var a = createEl('a', { text: data.ctaText, attrs: { href: data.ctaUrl }, style: { display: 'inline-block', padding: '10px 14px', background: '#0a74da', color: '#fff', textDecoration: 'none', borderRadius: '4px' } });
      appendIf(ctaWrap, a);
      appendIf(container, ctaWrap);
    }

    // Finally attach container only if it has children
    if (container.childNodes && container.childNodes.length > 0) {
      // Clean previous children inserted by this script if any (defensive)
      while (root.firstChild) {
        root.removeChild(root.firstChild);
      }
      appendIf(root, container);
    }
  }

  function findData() {
    // Look for a window property that starts with __ULYDIA_ and contains METIER
    try {
      if (typeof window !== 'undefined') {
        // Primary expected key
        if (window.__ULYDIA_METIER__ && typeof window.__ULYDIA_METIER__ === 'object') {
          return window.__ULYDIA_METIER__;
        }
        // Fallback: scan properties
        for (var k in window) {
          if (!Object.prototype.hasOwnProperty.call(window, k)) continue;
          if (typeof k === 'string' && k.indexOf('__ULYDIA_') === 0 && k.toUpperCase().indexOf('METIER') !== -1) {
            return window[k];
          }
        }
      }
    } catch (e) {
      // swallow errors silently per no-console requirement
    }
    return null;
  }

  function initOnce() {
    if (typeof window === 'undefined') return;
    if (window[FLAG]) return;
    window[FLAG] = true;

    var root = null;
    try {
      root = document.getElementById('ulydia-metier-root');
    } catch (e) {
      root = null;
    }
    if (!root) return;

    var data = findData();
    if (!data || typeof data !== 'object') return;

    // Defensive normalization: ensure strings are plain strings
    var normal = {
      title: data.title || '',
      subtitle: data.subtitle || '',
      summary: data.summary || '',
      heroImageUrl: data.heroImageUrl || data.hero_image_url || '',
      responsibilities: data.responsibilities || data.responsabilites || data.resp || [],
      skills: data.skills || data.competences || [],
      tags: data.tags || data.keywords || [],
      location: data.location || '',
      salary: data.salary || '',
      ctaText: data.ctaText || data.cta_text || '',
      ctaUrl: data.ctaUrl || data.cta_url || ''
    };

    render(root, normal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnce, false);
  } else {
    // DOM already ready
    setTimeout(initOnce, 0);
  }

})();

// ---------- appended PATCH: ulydia-metier-style.patch.js ----------

/* ULYDIA — Metier Style & Layout PATCH
   Responsibility: Apply PRO styling and two-column layout to the content inside #ulydia-metier-root
   - IIFE, anti-loop, defensive, Safari-friendly, no console output
*/
(function () {
  'use strict';

  var FLAG = '__ULYDIA_METIER_STYLE_APPLIED__';
  if (typeof window === 'undefined') return;
  if (window[FLAG]) return;
  window[FLAG] = true;

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else setTimeout(fn,0);
  }

  function createStyle(css){
    try{
      var s = document.createElement('style');
      s.type = 'text/css';
      s.setAttribute('data-ulydia-style','metier-pro');
      s.appendChild(document.createTextNode(css));
      document.head && document.head.appendChild(s);
    }catch(e){}
  }

  function safeQuery(root, sel){
    try{ return (root && root.querySelector(sel)) || null; }catch(e){ return null; }
  }

  function moveNodeToColumn(node, column){
    if (!node || !column) return;
    column.appendChild(node);
  }

  ready(function(){
    var root = document.getElementById('ulydia-metier-root');
    if (!root) return;

    // Find the container produced by renderer
    var container = root.querySelector('.ulydia-metier-container') || root.firstElementChild;
    if (!container) return;

    // Inject CSS scoped to our classes
    createStyle('\n' +
      '.ulydia-layout{max-width:1200px;margin:24px auto;display:flex;gap:24px;align-items:flex-start;padding:0 16px;box-sizing:border-box}\n' +
      '.ulydia-left{flex:1;min-width:0}\n' +
      '.ulydia-right{width:320px;flex-shrink:0}\n' +
      '.ulydia-card{background:#fff;border-radius:12px;padding:16px;box-shadow:0 6px 18px rgba(12,30,50,0.06);margin-bottom:16px;box-sizing:border-box}\n' +
      '.ulydia-card h2,.ulydia-card h3{margin:0 0 10px;padding:0;font-weight:600;font-size:16px;display:flex;align-items:center;gap:10px}\n' +
      '.ulydia-accent{width:10px;height:10px;border-radius:3px;display:inline-block;flex:0 0 auto}\n' +
      '.card-blue{background:#f0f7ff}.card-blue h2 .ulydia-accent{background:#3b82f6}\n' +
      '.card-green{background:#f3fff6}.card-green h2 .ulydia-accent{background:#10b981}\n' +
      '.card-purple{background:#fbf7ff}.card-purple h2 .ulydia-accent{background:#8b5cf6}\n' +
      '.card-orange{background:#fff8f0}.card-orange h2 .ulydia-accent{background:#fb923c}\n' +
      '.ulydia-hero{margin-bottom:12px}.ulydia-hero .ulydia-title{font-size:28px;margin:0 0 8px}\\n' +
      '.ulydia-subtitle{color:#556;color:var(--ulydia-subtitle-color,#555)}\n' +
      '.ulydia-tags span,.ulydia-tag{display:inline-block;padding:6px 8px;border-radius:8px;background:#eef2ff;margin:4px 6px 0 0;font-size:13px}\n' +
      '.ulydia-meta{display:flex;flex-direction:column;gap:12px}\n' +
      '.ulydia-small{font-size:13px;color:#374151}\n' +
      '.ulydia-hero-img{max-width:100%;height:auto;border-radius:8px;display:block}\n' +
      '.ulydia-left .ulydia-card{padding:18px}.ulydia-right .ulydia-card{padding:12px}\\n' +
      ');

    // Build layout columns
    var layout = document.createElement('div');
    layout.className = 'ulydia-layout';
    var left = document.createElement('div'); left.className = 'ulydia-left';
    var right = document.createElement('aside'); right.className = 'ulydia-right';
    layout.appendChild(left); layout.appendChild(right);

    // Move children from original container into new layout according to their role
    // Prefer selectors created by renderer
    var hero = safeQuery(container, '.ulydia-hero');
    var summary = safeQuery(container, '.ulydia-summary');
    var resp = safeQuery(container, '.ulydia-responsibilities');
    var skills = safeQuery(container, '.ulydia-skills');
    var freetags = safeQuery(container, '.ulydia-free-tags');
    var meta = safeQuery(container, '.ulydia-meta');

    // Create styled card wrapper helper
    function wrapAsCard(node, variant){
      if (!node) return null;
      var card = document.createElement('div');
      card.className = 'ulydia-card' + (variant ? ' ' + variant : '');
      // Move node inside card
      card.appendChild(node);
      // decorate headings inside card
      var h = card.querySelector('h2, h3');
      if (h && !h.querySelector('.ulydia-accent')){
        var accent = document.createElement('span'); accent.className = 'ulydia-accent';
        h.insertBefore(accent, h.firstChild);
      }
      return card;
    }

    // Preserve hero at top of left but inside a neutral card
    if (hero) {
      left.appendChild(wrapAsCard(hero, 'card-blue') || hero);
    }
    if (summary) {
      left.appendChild(wrapAsCard(summary, 'card-blue') || summary);
    }
    if (resp) {
      left.appendChild(wrapAsCard(resp, 'card-green') || resp);
    }
    if (skills) {
      left.appendChild(wrapAsCard(skills, 'card-purple') || skills);
    }
    if (freetags) {
      left.appendChild(wrapAsCard(freetags, 'card-purple') || freetags);
    }

    // Right column: meta + CTA + small summary cards
    if (meta) {
      right.appendChild(wrapAsCard(meta, 'card-orange') || meta);
    }

    // If there are leftover direct children in container, move important ones
    // Move any <section> elements not yet moved into left
    var children = Array.prototype.slice.call(container.children || []);
    children.forEach(function(ch){
      if (!ch) return;
      if (ch === hero || ch === summary || ch === resp || ch === skills || ch === freetags || ch === meta) return;
      // Prefer to place larger sections in left
      if (ch.tagName && (ch.tagName.toLowerCase() === 'section' || ch.className && ch.className.indexOf('ulydia-block') !== -1)){
        left.appendChild(wrapAsCard(ch, 'card-blue') || ch);
      } else {
        // otherwise right
        right.appendChild(wrapAsCard(ch, '') || ch);
      }
    });

    // Clean original container then append layout
    try{
      while (container.firstChild) container.removeChild(container.firstChild);
    }catch(e){}
    container.appendChild(layout);

    // Fine tune: convert simple meta items into small cards if present
    try{
      var metaCard = right.querySelector('.ulydia-meta');
      if (metaCard) {
        // If meta contains multiple child divs, wrap each into small card
        var items = Array.prototype.slice.call(metaCard.children || []);
        if (items.length > 1) {
          // replace metaCard with individual small cards
          items.forEach(function(it){
            var c = document.createElement('div'); c.className = 'ulydia-card card-orange';
            c.appendChild(it);
            right.appendChild(c);
          });
          metaCard.parentNode && metaCard.parentNode.removeChild(metaCard);
        }
      }
    }catch(e){}

  });

})();
