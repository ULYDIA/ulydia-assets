(function(){
  // =========================================================
  // ULYDIA — I18N v1
  // - Resolves final language from catalog.json (langue_finale)
  // - Exposes window.__ULYDIA_LANG__
  // - Exposes window.__t__(key)
  // =========================================================

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

      soft_skills: "Soft Skills essentiels"
    },

    en: {
      education_title: "Education & qualifications",
      education_local: "Required level (local)",
      education_required: "Required level",
      degrees_examples: "Degrees (examples)",

      outcomes_title: "Career outcomes & first roles",
      first_jobs: "First positions",
      employers: "Typical employers",
      hiring_sectors: "Hiring sectors",

      access_title: "Access to the profession & reskilling",
      access_routes: "Entry routes",
      reconversion: "Equivalences / career change",

      soft_skills: "Essential soft skills"
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

      access_title: "Zugang zum Beruf & Umschulung",
      access_routes: "Zugangswege",
      reconversion: "Anerkennung / Umschulung",

      soft_skills: "Zentrale Soft Skills"
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

      access_title: "Acceso a la profesión y reconversión",
      access_routes: "Vías de acceso",
      reconversion: "Equivalencias / reconversión",

      soft_skills: "Habilidades blandas esenciales"
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

      access_title: "Accesso alla professione e riconversione",
      access_routes: "Percorsi di accesso",
      reconversion: "Equivalenze / riconversione",

      soft_skills: "Soft skills essenziali"
    }
  };

  function getParam(name){
    try { return new URLSearchParams(location.search).get(name); }
    catch(e){ return null; }
  }

  function detectISO(){
    var iso = (window.__ULYDIA_COUNTRY__ || window.__ULYDIA_ISO__ || "").toString().trim();
    if (!iso) iso = (getParam("country") || "").toString().trim();
    return (iso || "").toUpperCase();
  }

  function applyLang(lang){
    lang = (lang || "en").toLowerCase();
    if (!/^(fr|en|de|es|it)$/.test(lang)) lang = "en";
    window.__ULYDIA_LANG__ = lang;
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

  function boot(){
    if (window.__ULYDIA_LANG__) return;

    var iso = detectISO();
    if (!iso){ applyLang("en"); return; }

    if (window.__ULYDIA_CATALOG__){
      applyLang(resolveFromCatalog(window.__ULYDIA_CATALOG__, iso) || "en");
      return;
    }

    fetch("https://ulydia-assets.pages.dev/assets/catalog.json", { cache: "force-cache" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(catalog){
        window.__ULYDIA_CATALOG__ = catalog || null;
        applyLang(resolveFromCatalog(catalog, iso) || "en");
      })
      .catch(function(){
        applyLang("en");
      });
  }

  window.__ULYDIA_I18N__ = I18N;
  window.__t__ = function(key){
    var lang = window.__ULYDIA_LANG__ || "en";
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  };

  boot();
})();