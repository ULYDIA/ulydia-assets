
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
    var out = [];
    try{
      // wrapper candidates
      var wraps = [
        document.querySelector(".ul-cms-blocs-source"),
        document.querySelector(".ul-cms-source")
      ].filter(Boolean);

      if (!wraps.length) return [];

      for (var w=0; w<wraps.length; w++){
        var wrap = wraps[w];
        var items = wrap.querySelectorAll(".w-dyn-item");
        if (!items || !items.length) continue;

        for (var i=0;i<items.length;i++){
          var it = items[i];
          // detect this is really an MPB item (must have iso + metier + title/body)
          var isoEl   = it.querySelector(".js-bloc-iso");
          var metEl   = it.querySelector(".js-bloc-metier");
          var titleEl = it.querySelector(".js-bloc-title");
          var bodyEl  = it.querySelector(".js-bloc-body");

          if (!isoEl || !metEl || !titleEl || !bodyEl) continue;

          var orderEl = it.querySelector(".js-bloc-order");
          var iso = up(isoEl.textContent);
          var metier = norm(metEl.textContent);
          var title = norm(titleEl.textContent);
          var body = String(bodyEl.innerHTML || "").trim();
          var order = orderEl ? parseInt(norm(orderEl.textContent),10) : null;
          if (!iso || !metier || !title || !body) continue;

          out.push({ iso: iso, metier: metier, title: title, body: body, order: (isNaN(order)? null : order) });
        }
      }

      // cache
      if (out.length){
        window.__ULYDIA_METIER_PAYS_BLOCS__ = out;
      }
      return out;
    }catch(e){
      return [];
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
  var I18N = {
    en: { sector:"Sector", country:"Country", sponsor:"Sponsor", premium:"Premium", partner:"Partner",
          learn_more:"Learn more", overview:"Overview", missions:"Missions", skills:"Skills", training:"Training", access:"Access", market:"Market", salary:"Salary",
          work_environment:"Work environment", profile:"Profile", career_path:"Career path",
          faqs:"Frequently asked questions",
          not_available_title:"Not available",
          not_available_msg_prefix:"This job does not exist for the country ",
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
          currency:"Currency"},
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
          currency:"Devise"},
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
          currency:"Währung"},
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
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
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


  function getMPB(){
  var pd = getPageData() || {};
  var list = pickArr(
    window.__ULYDIA_METIER_PAYS_BLOCS__,
    pd.mpb, pd.metier_pays_blocs, pd.metierPaysBlocs,
    parseJSONScript('mpbData'),
    parseJSONScript('mpb')
  );
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
    // Prefer prebuilt array from CMS reader
    var arr = window.__ULYDIA_FAQS__;
    if (Array.isArray(arr) && arr.length) return arr;

    // DOM fallback (hidden Webflow Collection List)
    // Expected optional classes inside each .w-dyn-item:
    // - .js-faq-name OR .js-faq-metier OR .js-faq-title-metier (job name)
    // - .js-faq-question (question)
    // - .js-faq-answer (answer HTML)
    // Also supports extracting item slug from first link href as a fallback.
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
          // grab last path segment
          var m = href.split("?")[0].split("#")[0].split("/");
          slug = m && m.length ? (m[m.length-1]||"") : "";
        }
        out.push({
          name: norm(nameEl ? nameEl.textContent : ""),
          metier: norm(nameEl ? nameEl.textContent : ""), // alias
          slug: norm(slug),
          question: norm(qEl ? qEl.textContent : ""),
          answer: aEl ? String(aEl.innerHTML||"").trim() : ""
        });
      }
      return out.filter(function(x){ return x && (x.question || x.answer); });
    }catch(e){}
    return [];
  }



  function getFicheMetiers(){
    var fm = window.__ULYDIA_FICHE_METIERS__ || parseJSONScript('ficheData') || parseJSONScript('ficheMetiersData') || [];
    if (Array.isArray(fm) && fm.length) return fm;
    // fallback: reuse __ULYDIA_METIERS__ if it contains fiche fields
    var m = getMetiers();
    if (Array.isArray(m) && m.length){
      var hasAny = m.some(function(x){
        return x && (x.description || x.missions || x.environnements || x.profil_recherche || x.evolutions_possibles || x.competences);
      });
      if (hasAny) return m;
    }
    // fallback: try dom scan of .js-fiche-* classes
    try{
      var items = Array.prototype.slice.call(document.querySelectorAll('.w-dyn-item'));
      var out = [];
      items.forEach(function(item){
        var slug = norm(item.querySelector('.js-metier-slug') && item.querySelector('.js-metier-slug').textContent);
        var name = norm(item.querySelector('.js-metier-name') && item.querySelector('.js-metier-name').textContent);
        if (!slug && !name) return;
        out.push({
          slug: slug,
      lang: normLang(getText(item.querySelector('.js-fiche-lang') || item.querySelector('.js-fiche-language') || item.querySelector('.js-fiche-langue'))),
          name: name,
          accroche: norm(item.querySelector('.js-fiche-accroche') && item.querySelector('.js-fiche-accroche').textContent),
          description: (item.querySelector('.js-fiche-description') && item.querySelector('.js-fiche-description').innerHTML) || "",
          missions: (item.querySelector('.js-fiche-missions') && item.querySelector('.js-fiche-missions').innerHTML) || "",
          competences: (item.querySelector('.js-fiche-competences') && item.querySelector('.js-fiche-competences').innerHTML) || "",
          environnements: (item.querySelector('.js-fiche-environnements') && item.querySelector('.js-fiche-environnements').innerHTML) || "",
          profil_recherche: (item.querySelector('.js-fiche-profil_recherche') && item.querySelector('.js-fiche-profil_recherche').innerHTML) || "",
          evolutions_possibles: (item.querySelector('.js-fiche-evolutions_possibles') && item.querySelector('.js-fiche-evolutions_possibles').innerHTML) || ""
        });
      });
      if (out.length) return out;
    }catch(e){}
    return [];
  }

  function findMetierBySlug(slug){
    slug = slugify(slug);
    var list = getMetiers();
    return (list||[]).find(function(x){ return x && slugify(x.slug||x.Slug||x.metier||x.name) === slug; }) || null;
  }

  function findFiche(slug){
    slug = slugify(slug);
    var list = getFicheMetiers();
    return (list||[]).find(function(x){
      if (!x) return false;
      var s = slugify(x.slug || x.Slug || x.metier || x.name);
      var n = slugify(x.name || x.Nom);
      return s === slug || n === slug;
    }) || null;
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
          currency:"Valuta"},
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
    out.devise = pick(b.devise, b.currency, b.Currency, chips.Currency, chips.currency);

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
    out.junior_min = pickNum(b.junior_min, sal.junior && sal.junior.min);
    out.junior_max = pickNum(b.junior_max, sal.junior && sal.junior.max);
    out.mid_min    = pickNum(b.mid_min, sal.mid && sal.mid.min);
    out.mid_max    = pickNum(b.mid_max, sal.mid && sal.mid.max);
    out.senior_min = pickNum(b.senior_min, sal.senior && sal.senior.min);
    out.senior_max = pickNum(b.senior_max, sal.senior && sal.senior.max);
    out.variable_share = pick(out.variable_share, b.variable_share, sal.variable_share_pct, sal.variable_share);

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
      var url = base.replace(/\/+$/,"") + "/v1/metier-page?metier=" + encodeURIComponent(String(metierSlug||"")) +
        "&country=" + encodeURIComponent(String(iso||""));
      fetch(url, {
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
      .u-row{display:grid;grid-template-columns:1.45fr 0.85fr;gap:24px;align-items:start;}
      @media(max-width:980px){.u-row{grid-template-columns:1fr;}}
      .u-title{font-size:56px;line-height:1.05;margin:0 0 10px 0;color:var(--primary);font-weight:800;letter-spacing:-0.02em;}
      @media(max-width:680px){.u-title{font-size:42px;}}
      .u-accroche{color:var(--muted);font-size:16px;line-height:1.55;margin:0 0 18px 0;max-width:820px;}
      .u-pills{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px 0;}
      .u-pill{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border);background:#fff;border-radius:999px;color:var(--text);font-weight:600;font-size:13px;}
      .u-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);overflow:hidden;}
      .u-card-h{padding:12px 16px;font-weight:800;color:var(--text);background:linear-gradient(90deg,#eef2ff,#f8fafc);border-bottom:1px solid var(--border);}
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
      .u-premium{position:sticky;top:18px;}
      .u-premium .u-card-b{padding:14px;}
      .u-prem-square{width:100%;aspect-ratio:1/1;border-radius:16px;border:1px solid var(--border);overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;}
      .u-prem-square img{width:100%;height:100%;object-fit:cover;display:block;}
      .u-prem-name{font-weight:900;}
      .u-prem-sub{color:var(--muted);font-size:12px;margin-top:2px;}
      .u-prem-row{display:grid;grid-template-columns:1fr;gap:12px;align-items:start;}
      .u-sq{width:100%;max-width:300px;aspect-ratio:1/1;border-radius:16px;border:1px solid var(--border);overflow:hidden;background:#fff;margin:0 auto;}
      .u-sq img{width:100%;height:100%;object-fit:cover;display:block;}
      /* FAQ */
      .u-faq-item{border:1px solid var(--border);border-radius:14px;background:#fff;overflow:hidden;}
      .u-faq-q{padding:12px 14px;font-weight:800;cursor:pointer;display:flex;justify-content:space-between;gap:12px;}
      .u-faq-a{padding:0 14px 14px 14px;color:var(--text);display:none;}
      .u-faq-item.is-open .u-faq-a{display:block;}
    `;
    var style = document.createElement("style");
    style.id = "ulydia-metier-v35-css";
    style.textContent = css;
    document.head.appendChild(style);

  }

  function card(title, bgClass, bodyHTML){
    var c = document.createElement("div");
    c.className = "u-card";
    var h = document.createElement("div");
    h.className = "u-card-h";
    h.textContent = title;
    var b = document.createElement("div");
    b.className = "u-card-b";
    b.innerHTML = bodyHTML || "";
    c.appendChild(h);
    c.appendChild(b);
    return c;
  }

  function renderNotAvailable(ctx){
  var lang = langFromCtx(ctx);
  var countryName = (ctx && ctx.country && (ctx.country.label || ctx.country.name)) || (ctx && ctx.iso) || '';
  var wrap = document.createElement('div');
  wrap.className = 'u-wrap';

  var title = ui(lang,'not_available_title');
  var prefix = ui(lang,'not_available_msg_prefix');

  var body = '<div class="u-muted" style="line-height:1.6">' +
    esc(prefix) + ' "<b>' + esc(countryName) + '</b>".' +
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
    var sponsor = ctx.sponsor;
    if (sponsor === '__PENDING__') return null;
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
    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&country='+encodeURIComponent(ctx.iso);

    if (!wide) return null;

    // Pure image banner (no purple filter)
    var a = document.createElement('a');
    a.href = href;
    a.className = 'u-banner-img-link';
    a.rel = 'noopener';
    a.style.display = 'block';
    a.style.maxWidth = '680px';
    a.style.margin = '0 auto 14px auto';

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
    var sponsor = ctx.sponsor;
    if (sponsor === '__PENDING__') return null;
    var country = ctx.country;

        var square = pickUrl(
      sponsor && pickSponsorUrl(sponsor, 'square'),
      sponsor && (sponsor.logo_square || sponsor.logoSquare || sponsor.banner_square || sponsor.bannerSquare),
      country && (country.banner_square || country.bannerSquare || country.banniere_sponsorisation_image_2 || country.banniere_sponsorisation_image_2),
      country && (country.banniere_sponsorisation_image_2_url || country['banniere_sponsorisation_image_2_url'])
    );

    var name = (sponsor && (sponsor.sponsor_name || sponsor.name || sponsor.company || sponsor.partenaire)) || ui(langFromCtx(ctx),'partner');
    var iso = ctx.iso || '';
    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&country='+encodeURIComponent(ctx.iso);

    var wrap = document.createElement('div');
    wrap.className = 'u-premium';

    var h = document.createElement('div');
    h.className = 'u-premium-h';
    h.textContent = ui(langFromCtx(ctx),'premium');

    var b = document.createElement('div');
    b.className = 'u-premium-b';

    var row = document.createElement('div');
    row.className = 'u-prem-row';

    var sq = document.createElement('div');
    sq.className = 'u-sq';
    if (square){
      var aSq = document.createElement('a');
      aSq.href = href;
      aSq.rel = 'noopener';
      aSq.style.display = 'block';
      aSq.style.width = '100%';
      aSq.style.height = '100%';

      var img = document.createElement('img');
      img.alt = '';
      img.src = square;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';

      aSq.appendChild(img);
      sq.appendChild(aSq);
    }else{
      sq.textContent = 'Logo';
      sq.classList.add('u-muted');
      sq.style.fontWeight = '900';
      sq.style.fontSize = '12px';
    }

    var meta = document.createElement('div');
    meta.innerHTML = '<div class="u-prem-name">'+esc(name)+'</div><div class="u-prem-sub">'+esc(iso)+'</div>';

    row.appendChild(sq);
    row.appendChild(meta);

    var btn = document.createElement('a');
    btn.className = 'u-btn';
    btn.href = href;
    btn.rel = 'noopener';
    btn.textContent = ui(langFromCtx(ctx),'learn_more');

    b.appendChild(row);
    b.appendChild(btn);

    wrap.appendChild(h);
    wrap.appendChild(b);
    return wrap;
  }

  
  function renderBeforeFaqBanner(ctx){
    var sponsor = ctx.sponsor;
    if (sponsor === '__PENDING__') return null;
    var country = ctx.country;

    // ✅ WIDE banner before FAQ (same mapping as top)
        var wide = pickUrl(
      sponsor && pickSponsorUrl(sponsor, 'wide'),
      sponsor && (sponsor.logo_wide || sponsor.logoWide || sponsor.banner_wide || sponsor.bannerWide),
      country && (country.banner_wide || country.bannerWide || country.banniere_sponsorisation_image_1 || country.banniere_sponsorisation_image_1_url || country['banniere_sponsorisation_image_1_url'])
    );

    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&country='+encodeURIComponent(ctx.iso);

    if (!wide) return null;

    var a = document.createElement('a');
    a.href = href;
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
    if (!s.trim()) return [];
    return s.split(/\s*[,;\n]\s*|\s*&nbsp;\s*/).map(function(x){return norm(x);}).filter(Boolean);
  }

  function renderPage(ctx){
    injectCSS();
    var root = ensureRoot();

    var head = document.createElement('div');
    var title = document.createElement('h1');
    title.className = 'u-title';
    title.textContent = ctx.name || ctx.slug || 'Métier';

    head.appendChild(title);

    var pills = document.createElement('div');
    pills.className = 'u-pills';
    var lang = langFromCtx(ctx);
    pills.innerHTML = '<span class="u-pill">'+esc(ui(lang,'sector'))+': <b>'+esc(ctx.sector || '—')+'</b></span>'+
      '<span class="u-pill">'+esc(ui(lang,'country'))+': <b>'+esc(ctx.iso || '—')+'</b></span>';

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
    if (topB) root.appendChild(topB);

    var row = document.createElement('div');
    row.className = 'u-row';

    var left = document.createElement('div');
    left.className = 'u-stack';

    // FICHE blocks first
    if (ctx.fiche){
      var f = ctx.fiche;
      if (f.description) left.appendChild(card(ui(langFromCtx(ctx),'overview'), '', f.description));
      if (f.missions) left.appendChild(card(ui(langFromCtx(ctx),'missions'), '', f.missions));
      if (f.competences) left.appendChild(card(ui(langFromCtx(ctx),'skills'), '', f.competences));
      if (f.environnements) left.appendChild(card(ui(langFromCtx(ctx),'work_environment'), '', f.environnements));
      if (f.profil_recherche) left.appendChild(card(ui(langFromCtx(ctx),'profile'), '', f.profil_recherche));
      if (f.evolutions_possibles) left.appendChild(card(ui(langFromCtx(ctx),'career_path'), '', f.evolutions_possibles));
    }

    // MPB blocks
    if (ctx.mpb){
      if (ctx.mpb.formation) left.appendChild(card(ui(langFromCtx(ctx),'training'), '', ctx.mpb.formation));
      if (ctx.mpb.acces) left.appendChild(card(ui(langFromCtx(ctx),'access'), '', ctx.mpb.acces));
      if (ctx.mpb.marche) left.appendChild(card(ui(langFromCtx(ctx),'market'), '', ctx.mpb.marche));
      if (ctx.mpb.environnements) left.appendChild(card(ui(langFromCtx(ctx),'work_environment'), '', ctx.mpb.environnements));
    

// Generic MPB blocks (one item per block)
if (Array.isArray(ctx.mpb.blocks) && ctx.mpb.blocks.length){
  ctx.mpb.blocks.forEach(function(b){
    if (!b || !b.body) return;
    var t = b.title ? String(b.title) : ui(langFromCtx(ctx),'additional_info');
    left.appendChild(card(t, '', b.body));
  });
}
}

    // Salary from MPB if present
    if (ctx.mpb && (ctx.mpb.junior_min || ctx.mpb.junior_max || ctx.mpb.salary_notes || ctx.mpb.devise)){
      var html = '';
      function line(label, a, b){
        if (a == null && b == null) return;
        var v = (a!=null? a:'—') + ' - ' + (b!=null? b:'—') + ' ' + esc(ctx.currency || '');
        html += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eef0f4;"><b>'+esc(label)+'</b><span style="font-weight:900;color:#4f46e5;">'+esc(v)+'</span></div>';
      }
      line(ui(lang,'junior'), ctx.mpb.junior_min, ctx.mpb.junior_max);
      line(ui(lang,'mid'), ctx.mpb.mid_min, ctx.mpb.mid_max);
      line(ui(lang,'senior'), ctx.mpb.senior_min, ctx.mpb.senior_max);
      if (ctx.mpb.salary_notes){
        html += '<div style="margin-top:10px;" class="u-muted">'+ctx.mpb.salary_notes+'</div>';
      }
      left.appendChild(card(ui(lang,'salary'), '', html));
    }

    row.appendChild(left);

    var right = document.createElement('div');
    right.className = 'u-stack';

    var prem = renderPremiumCard(ctx);
    if (prem) right.appendChild(prem);

    // MPB — Right rail (same philosophy as previous PATCH2: hide if empty) 
    if (ctx.mpb){
      // Indicators first (translated labels)
      var ind = [];
      if (ctx.mpb.remote_level) ind.push(ui(langFromCtx(ctx),'remote_level') + ': ' + ctx.mpb.remote_level);
      if (ctx.mpb.automation_risk) ind.push(ui(langFromCtx(ctx),'automation_risk') + ': ' + ctx.mpb.automation_risk);
      if (ctx.mpb.time_to_employability) ind.push(ui(langFromCtx(ctx),'time_to_employability') + ': ' + ctx.mpb.time_to_employability);
      if (ctx.mpb.growth_outlook) ind.push(ui(langFromCtx(ctx),'growth_outlook') + ': ' + ctx.mpb.growth_outlook);
      if (ctx.mpb.market_demand) ind.push(ui(langFromCtx(ctx),'market_demand') + ': ' + ctx.mpb.market_demand);
      if (ctx.mpb.devise) ind.push(ui(langFromCtx(ctx),'currency') + ': ' + ctx.mpb.devise);
      if (ind.length){
        right.appendChild(card(ui(langFromCtx(ctx),'key_indicators'), '', '<div style="display:flex;flex-direction:column;gap:8px;">'+ind.map(function(x){return '<div>'+esc(x)+'</div>';}).join('')+'</div>'));
      }

      // Tag-like fields (tools/skills)
      function splitTagsLoose(s){
        s = String(s||'');
        s = s.replace(/<[^>]*>/g,' ');
        if (!s.trim()) return [];
        return s.split(/[\n,;]+/).map(function(x){ return norm(x); }).filter(Boolean);
      }
      var mustHave = splitTagsLoose(ctx.mpb.skills_must_have);
      var soft = splitTagsLoose(ctx.mpb.soft_skills);
      var tools = splitTagsLoose(ctx.mpb.tools_stack);
      var topFields = splitTagsLoose(ctx.mpb.key_fields);

      var html2 = '';
      function block(label, arr){
        if (!arr || !arr.length) return '';
        return '<div style="margin-bottom:12px;"><div style="font-weight:900;margin-bottom:8px;">'+esc(label)+'</div><div class="u-tags">'+arr.map(function(t){return '<span class="u-tag">'+esc(t)+'</span>';}).join('')+'</div></div>';
      }
      html2 += block(ui(langFromCtx(ctx),'top_fields'), topFields);
      html2 += block(ui(langFromCtx(ctx),'skills_must_have'), mustHave);
      html2 += block(ui(langFromCtx(ctx),'soft_skills'), soft);
      html2 += block(ui(langFromCtx(ctx),'tools_stack'), tools);

      if (html2) right.appendChild(card(ui(langFromCtx(ctx),'skills_path'), '', html2));

      // Rich fields
      if (ctx.mpb.certifications) right.appendChild(card(ui(langFromCtx(ctx),'certifications'), '', ctx.mpb.certifications));
      if (ctx.mpb.schools_or_paths) right.appendChild(card(ui(langFromCtx(ctx),'schools_paths'), '', ctx.mpb.schools_or_paths));
      if (ctx.mpb.portfolio_projects) right.appendChild(card(ui(langFromCtx(ctx),'portfolio_projects'), '', ctx.mpb.portfolio_projects));
    }

    row.appendChild(right);
    root.appendChild(row);

    // Banner before FAQ (wide)
    var beforeFaq = renderBeforeFaqBanner(ctx);

    // FAQ bottom
    var faqs = findFAQsForMetier(ctx.slug, (ctx.fiche && (ctx.fiche.name||ctx.fiche.Nom)) || ctx.name || ctx.slug, ctx.iso);
    if (beforeFaq) root.appendChild(beforeFaq);
    root.appendChild(document.createElement('div')).style.height = '18px';
    root.appendChild(renderFAQ(faqs, ctx));
  }

  // ---------- main ----------
  async function main(){
    var q = getQuery();
    if (!q.metier){
      ensureRoot().innerHTML = '<div class="u-card"><div class="u-card-h">' + esc(ui(normLang(window.__ULYDIA_LANG_FINAL__||finalLang||"en"),'missing_job_title')) + '</div><div class="u-card-b">' + esc(ui(normLang(window.__ULYDIA_LANG_FINAL__||finalLang||"en"),'missing_job_msg')) + '</div></div>';
      return;
    }

    async function go(){


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
var fichePickMode = pick.mode;
var ctx = {
      slug: slugify(q.metier),
      iso: q.country,
      finalLang: finalLang,
      fichePickMode: fichePickMode,
      ficheAny: ficheAny,
      name: (metier && (metier.name || metier.Nom)) || (fiche && (fiche.name || fiche.Nom)) || q.metier,
      sector: (metier && (metier.secteur || metier.sector)) || (fiche && (fiche.secteur || fiche.sector)) || '',
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
if (!ctx.fiche) {
      var root0 = ensureRoot();
      root0.innerHTML = '';
      root0.appendChild(renderNotAvailable(ctx));
      return;
    }


    // Render page (banners pending), then resolve sponsor and rerender banners without showing non-sponsor first
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
})();