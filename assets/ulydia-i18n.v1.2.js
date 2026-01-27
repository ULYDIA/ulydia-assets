(function(){
  // =========================================================
  // ULYDIA — I18N v1.2
  // - Same as v1.1 (catalog-based language + ?lang= override)
  // - Adds keys for BASE titles (overview/missions/skills/env/faq/etc.)
  // - Exposes: window.__ULYDIA_LANG__, window.__t__(key)
  // =========================================================

  var CATALOG_URL = "https://ulydia-assets.pages.dev/assets/catalog.json";

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
  function applyLang(lang){ window.__ULYDIA_LANG__ = normalizeLang(lang); }
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

  var I18N = {
    fr: {
      // BASE titles
      metier_sheet: "Fiche métier",
      overview: "Vue d’ensemble",
      missions: "Missions principales",
      key_skills: "Compétences clés",
      environments: "Environnements de travail",
      career_evolution: "Évolution & qualifications",
      faq: "Questions fréquentes",

      // MPB blocks
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

      // RIGHT small labels (placeholders for next step)
      key_indicators: "Indicateurs clés",
      salary_grid: "Grille salariale",
      junior: "Junior",
      mid: "Confirmé",
      senior: "Senior",
      variable: "Part variable",
      currency: "Devise",

      soft_skills: "Soft Skills essentiels"
    },

    en: {
      // BASE titles
      metier_sheet: "Job profile",
      overview: "Overview",
      missions: "Key responsibilities",
      key_skills: "Key skills",
      environments: "Work environments",
      career_evolution: "Career development",
      faq: "Frequently asked questions",

      // MPB blocks
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

      // RIGHT labels (next step)
      key_indicators: "Key indicators",
      salary_grid: "Salary grid",
      junior: "Junior",
      mid: "Mid-level",
      senior: "Senior",
      variable: "Variable share",
      currency: "Currency",

      soft_skills: "Essential soft skills"
    },

    de: {
      metier_sheet: "Berufsprofil",
      overview: "Überblick",
      missions: "Hauptaufgaben",
      key_skills: "Schlüsselkompetenzen",
      environments: "Arbeitsumfeld",
      career_evolution: "Entwicklung & Qualifikation",
      faq: "Häufige Fragen",

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

      key_indicators: "Kennzahlen",
      salary_grid: "Gehaltsübersicht",
      junior: "Junior",
      mid: "Erfahren",
      senior: "Senior",
      variable: "Variabler Anteil",
      currency: "Währung",

      soft_skills: "Zentrale Soft Skills"
    },

    es: {
      metier_sheet: "Ficha de empleo",
      overview: "Visión general",
      missions: "Funciones principales",
      key_skills: "Competencias clave",
      environments: "Entornos de trabajo",
      career_evolution: "Evolución & cualificación",
      faq: "Preguntas frecuentes",

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

      key_indicators: "Indicadores clave",
      salary_grid: "Tabla salarial",
      junior: "Junior",
      mid: "Intermedio",
      senior: "Senior",
      variable: "Parte variable",
      currency: "Moneda",

      soft_skills: "Habilidades blandas esenciales"
    },

    it: {
      metier_sheet: "Scheda professione",
      overview: "Panoramica",
      missions: "Mansioni principali",
      key_skills: "Competenze chiave",
      environments: "Ambienti di lavoro",
      career_evolution: "Evoluzione & qualifiche",
      faq: "Domande frequenti",

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

      key_indicators: "Indicatori chiave",
      salary_grid: "Griglia salariale",
      junior: "Junior",
      mid: "Intermedio",
      senior: "Senior",
      variable: "Quota variabile",
      currency: "Valuta",

      soft_skills: "Soft skills essenziali"
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
    // URL override for QA: ?lang=en|de|es|it|fr
    var urlLang = getParam("lang");
    if (urlLang){ applyLang(urlLang); return; }

    if (window.__ULYDIA_LANG__){ applyLang(window.__ULYDIA_LANG__); return; }

    var iso = detectISO();
    if (!iso) { applyLang("en"); return; }

    if (window.__ULYDIA_CATALOG__){
      var l1 = resolveFromCatalog(window.__ULYDIA_CATALOG__, iso);
      applyLang(l1 || "en");
      return;
    }

    fetch(CATALOG_URL, { cache: "force-cache" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(catalog){
        window.__ULYDIA_CATALOG__ = catalog || null;
        var lang = resolveFromCatalog(catalog, iso);
        applyLang(lang || "en");
      })
      .catch(function(){ applyLang("en"); });
  })();
})();