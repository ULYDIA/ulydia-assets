(function(){
  // =========================================================
  // ULYDIA — I18N v1.1
  // Fixes testing & timing:
  // - Supports URL override: ?lang=fr|en|de|es|it  (highest priority)
  // - Resolves final language from /assets/catalog.json (countries[].langue_finale) by ISO (?country=)
  // - Exposes: window.__ULYDIA_LANG__, window.__t__(key)
  // - Optional debug: window.__ULYDIA_I18N_DEBUG__ = true
  // =========================================================

  var CATALOG_URL = "https://ulydia-assets.pages.dev/assets/catalog.json";

  function log(){
    try {
      if (window.__ULYDIA_I18N_DEBUG__) console.log.apply(console, arguments);
    } catch(e){}
  }

  function getParam(name){
    try { return new URLSearchParams(location.search).get(name); }
    catch(e){ return null; }
  }

  function detectISO(){
    var iso = (window.__ULYDIA_COUNTRY__ || window.__ULYDIA_ISO__ || "").toString().trim();
    if (!iso) iso = (getParam("country") || "").toString().trim();
    return (iso || "").toUpperCase();
  }

  function normalizeLang(lang){
    lang = (lang || "en").toLowerCase().trim();
    if (!/^(fr|en|de|es|it)$/.test(lang)) lang = "en";
    return lang;
  }

  function applyLang(lang, reason){
    window.__ULYDIA_LANG__ = normalizeLang(lang);
    log("[i18n] lang =", window.__ULYDIA_LANG__, "reason:", reason || "");
  }

  function resolveFromCatalog(catalog, iso){
    var list = (catalog && (catalog.countries || catalog.Countries)) || [];
    for (var i=0;i<list.length;i++){
      var c = list[i] || {};
      if (String(c.iso||"").toUpperCase() === iso){
        return c.langue_finale || c.lang || c.language_final || "";
      }
    }
    return "";
  }

  // Dictionary (MPB + a few shared labels). You can extend safely.
  var I18N = {
    fr: {
      education_title: "Niveau d’études & diplômes",
      education_local: "Niveau requis (local)",
      education_required: "Niveau requis",
      degrees_examples: "Diplômes (exemples)",

      outcomes_title: "Débouchés & premiers postes",
      first_jobs: "Premiers postes",
      employers: "Employeurs types",
      hiring_sectors: "Secteurs qui recrutent",

      access_title: "Accès au métier & reconversion",
      access_routes: "Voies d’accès",
      reconversion: "Équivalences / reconversion",

      soft_skills: "Soft Skills essentiels",
      environments: "Environnements de travail"
    },
    en: {
      education_title: "Education & qualifications",
      education_local: "Required level (local)",
      education_required: "Required level",
      degrees_examples: "Degrees (examples)",

      outcomes_title: "Career outcomes & first roles",
      first_jobs: "First roles",
      employers: "Typical employers",
      hiring_sectors: "Hiring sectors",

      access_title: "Access & career change",
      access_routes: "Entry routes",
      reconversion: "Equivalences / career change",

      soft_skills: "Essential soft skills",
      environments: "Work environments"
    },
    de: {
      education_title: "Ausbildung & Abschlüsse",
      education_local: "Erforderliches Niveau (lokal)",
      education_required: "Erforderliches Niveau",
      degrees_examples: "Abschlüsse (Beispiele)",

      outcomes_title: "Berufseinstieg & Perspektiven",
      first_jobs: "Erste Positionen",
      employers: "Typische Arbeitgeber",
      hiring_sectors: "Rekrutierende Branchen",

      access_title: "Zugang & Umschulung",
      access_routes: "Zugangswege",
      reconversion: "Anerkennung / Umschulung",

      soft_skills: "Zentrale Soft Skills",
      environments: "Arbeitsumfeld"
    },
    es: {
      education_title: "Nivel de estudios y títulos",
      education_local: "Nivel requerido (local)",
      education_required: "Nivel requerido",
      degrees_examples: "Títulos (ejemplos)",

      outcomes_title: "Salidas profesionales",
      first_jobs: "Primeros puestos",
      employers: "Empleadores habituales",
      hiring_sectors: "Sectores que contratan",

      access_title: "Acceso y reconversión",
      access_routes: "Vías de acceso",
      reconversion: "Equivalencias / reconversión",

      soft_skills: "Habilidades blandas esenciales",
      environments: "Entornos de trabajo"
    },
    it: {
      education_title: "Livello di studi e titoli",
      education_local: "Livello richiesto (locale)",
      education_required: "Livello richiesto",
      degrees_examples: "Titoli (esempi)",

      outcomes_title: "Sbocchi professionali",
      first_jobs: "Prime posizioni",
      employers: "Datori di lavoro tipici",
      hiring_sectors: "Settori che assumono",

      access_title: "Accesso e riconversione",
      access_routes: "Percorsi di accesso",
      reconversion: "Equivalenze / riconversione",

      soft_skills: "Soft skills essenziali",
      environments: "Ambienti di lavoro"
    }
  };

  window.__ULYDIA_I18N__ = I18N;

  window.__t__ = function(key, vars){
    var lang = normalizeLang(window.__ULYDIA_LANG__ || "en");
    var str = (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key;
    if (vars && typeof vars === "object"){
      Object.keys(vars).forEach(function(k){
        str = str.replace(new RegExp("\\{"+k+"\\}", "g"), String(vars[k]));
      });
    }
    return str;
  };

  (function boot(){
    // 1) URL override for testing (highest priority)
    var urlLang = getParam("lang");
    if (urlLang){
      applyLang(urlLang, "url");
      return;
    }

    // 2) If already set by something else, keep it
    if (window.__ULYDIA_LANG__){
      applyLang(window.__ULYDIA_LANG__, "pre-set");
      return;
    }

    var iso = detectISO();
    if (!iso) { applyLang("en", "no-iso"); return; }

    if (window.__ULYDIA_CATALOG__){
      var l1 = resolveFromCatalog(window.__ULYDIA_CATALOG__, iso);
      applyLang(l1 || "en", "catalog-memory");
      return;
    }

    fetch(CATALOG_URL, { cache: "force-cache" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(catalog){
        window.__ULYDIA_CATALOG__ = catalog || null;
        var lang = resolveFromCatalog(catalog, iso);
        applyLang(lang || "en", "catalog-fetch");
      })
      .catch(function(){
        applyLang("en", "catalog-fail");
      });
  })();
})();