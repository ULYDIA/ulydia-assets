/*!
 * =========================================================
 * ULYDIA — METIER PAGE — FINAL MONO (CMS SOURCE OF TRUTH)
 * File: metier-page.v2026-01-30.FINAL.MONO.CMS.MPB.I18N.js
 * Date: 2026-01-30
 *
 * Principles (as requested):
 * - Webflow CMS is the ONLY source of data
 * - Code Embeds may read visible CMS fields (.js-*) and push into window.__ULYDIA_*__
 * - This single bundle reads window.__ULYDIA_*__ (or reads DOM .js-* if globals missing)
 * - No modules. No templates. No duplicates. One root: #ulydia-metier-root
 *
 * Expected body:
 *   <div id="ulydia-metier-root"></div>
 *   <div id="ulydia-banner-before-faq-slot"></div>  (optional)
 *
 * What this bundle does:
 * - Determines language deterministically (?lang > window.__ULYDIA_LANG__ > <html lang> > navigator)
 * - Builds/normalizes:
 *     window.__ULYDIA_METIERS__
 *     window.__ULYDIA_SECTEURS__
 *     window.__ULYDIA_COUNTRIES__
 *     window.__ULYDIA_MPB__   (Metier_Pays_Blocs)
 * - Selects current record by (?metier + ?country)
 * - Renders ONLY blocks with content (never shows empty blocks)
 * - Salary grid + indicators if present
 * =========================================================
 */
(function(){
  "use strict";
  if (window.__ULYDIA_FINAL_MONO_CMS_BUNDLE__) return;
  window.__ULYDIA_FINAL_MONO_CMS_BUNDLE__ = true;

  // ---------------------------
  // Utils
  // ---------------------------
  function qsParam(k){
    try { return new URLSearchParams(location.search||"").get(k) || ""; }
    catch(e){ return ""; }
  }
  function normSlug(s){
    return String(s||"").trim().toLowerCase().replace(/\s+/g,"-");
  }
  function normText(s){
    return String(s||"")
      .replace(/\u00a0/g," ")
      .replace(/\s+/g," ")
      .trim();
  }
  function normIso(s){
    s = String(s||"").trim().toUpperCase();
    if (s.length === 2) return s;
    return "";
  }
  function normLang(l){
    l = String(l||"").trim().toLowerCase();
    if (!l) return "";
    if (l.indexOf("-")>0) l = l.split("-")[0];
    if (l.indexOf("_")>0) l = l.split("_")[0];
    return (/^(fr|en|de|es|it)$/).test(l) ? l : "";
  }
  function pickLang(){
    var l1 = normLang(qsParam("lang"));
    var l2 = normLang(window.__ULYDIA_LANG__);
    var l3 = normLang(document.documentElement && document.documentElement.getAttribute("lang"));
    var l4 = normLang((navigator.language||""));
    var lang = l1 || l2 || l3 || l4 || "fr";
    window.__ULYDIA_LANG__ = lang;
    try { document.documentElement.setAttribute("lang", lang); } catch(e){}
    // reduce Chrome auto-translate DOM mutations
    try { document.documentElement.setAttribute("translate","no"); } catch(e){}
    try {
      if (!document.querySelector('meta[name="google"][content="notranslate"]')){
        var m = document.createElement("meta");
        m.setAttribute("name","google");
        m.setAttribute("content","notranslate");
        document.head && document.head.appendChild(m);
      }
    } catch(e){}
    return lang;
  }
  var LANG = pickLang();

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
  function safeHtml(html){
    var s = String(html||"");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,"");
    // remove inline on* handlers
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }
  function parseNum(x){
    if (x === null || x === undefined) return null;
    var s = String(x).trim();
    if (!s) return null;
    // allow "28 000", "28,000", "28000", "28k"
    s = s.toLowerCase().replace(/\s+/g,"").replace(/,/g,".");
    var mult = 1;
    if (s.endsWith("k")) { mult = 1000; s = s.slice(0,-1); }
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    return Math.round(n * mult);
  }

  // ---------------------------
  // I18N minimal keys (UI only)
  // ---------------------------
  var I18N = {
    fr: {
      metier_sheet: "Fiche métier",
      sector: "Secteur",
      country: "Pays",
      missing: "Aucune donnée disponible pour ce métier dans ce pays.",
      salary_grid: "Grille salariale",
      junior: "Junior",
      mid: "Confirmé",
      senior: "Senior",
      variable: "Part variable",
      indicators: "Indicateurs clés",
      remote_level: "Télétravail",
      automation_risk: "Risque d’automatisation",
      statut_generation: "Statut",
      // MPB major blocks
      formation: "Formation",
      acces: "Accès au métier",
      marche: "Marché",
      education_title: "Niveau d’études & diplômes",
      education_local: "Niveau requis (local)",
      education_required: "Niveau requis",
      degrees_examples: "Diplômes (exemples)",
      outcomes_title: "Débouchés & premiers postes",
      first_jobs: "Premiers postes",
      employers: "Employeurs types",
      hiring_sectors: "Secteurs qui recrutent",
      access_title: "Accès & reconversion",
      entry_routes: "Voies d’accès",
      equivalences_reconversion: "Équivalences / reconversion",
      skills_title: "Compétences & parcours",
      skills_must_have: "Compétences indispensables",
      soft_skills: "Soft skills",
      tools_stack: "Outils / stack",
      certifications: "Certifications",
      schools_or_paths: "Écoles / parcours",
      top_fields: "Domaines clés",
      portfolio_projects: "Projets / portfolio",
      time_to_employability: "Délai d’employabilité",
      growth_outlook: "Perspectives",
      market_demand: "Demande marché",
      salary_notes: "Notes salaire"
    },
    en: {
      metier_sheet: "Job profile",
      sector: "Sector",
      country: "Country",
      missing: "No data available for this role in this country.",
      salary_grid: "Salary grid",
      junior: "Junior",
      mid: "Mid-level",
      senior: "Senior",
      variable: "Variable share",
      indicators: "Key indicators",
      remote_level: "Remote work",
      automation_risk: "Automation risk",
      statut_generation: "Status",
      formation: "Training",
      acces: "Access to the role",
      marche: "Market",
      education_title: "Education level & degrees",
      education_local: "Required level (local)",
      education_required: "Required level",
      degrees_examples: "Degrees (examples)",
      outcomes_title: "Outcomes & first roles",
      first_jobs: "First roles",
      employers: "Typical employers",
      hiring_sectors: "Hiring sectors",
      access_title: "Access & career change",
      entry_routes: "Entry routes",
      equivalences_reconversion: "Equivalences / career change",
      skills_title: "Skills & path",
      skills_must_have: "Must-have skills",
      soft_skills: "Soft skills",
      tools_stack: "Tools / stack",
      certifications: "Certifications",
      schools_or_paths: "Schools / paths",
      top_fields: "Key fields",
      portfolio_projects: "Portfolio projects",
      time_to_employability: "Time to employability",
      growth_outlook: "Growth outlook",
      market_demand: "Market demand",
      salary_notes: "Salary notes"
    },
    de: {
      metier_sheet: "Berufsprofil",
      sector: "Branche",
      country: "Land",
      missing: "Keine Daten für diesen Beruf in diesem Land verfügbar.",
      salary_grid: "Gehaltsübersicht",
      junior: "Junior",
      mid: "Erfahren",
      senior: "Senior",
      variable: "Variabler Anteil",
      indicators: "Kennzahlen",
      remote_level: "Homeoffice",
      automation_risk: "Automatisierungsrisiko",
      statut_generation: "Status",
      formation: "Ausbildung",
      acces: "Zugang zum Beruf",
      marche: "Markt",
      education_title: "Bildungsniveau & Abschlüsse",
      education_local: "Erforderliches Niveau (lokal)",
      education_required: "Erforderliches Niveau",
      degrees_examples: "Abschlüsse (Beispiele)",
      outcomes_title: "Perspektiven & erste Positionen",
      first_jobs: "Erste Positionen",
      employers: "Typische Arbeitgeber",
      hiring_sectors: "Rekrutierende Branchen",
      access_title: "Zugang & Quereinstieg",
      entry_routes: "Einstiegswege",
      equivalences_reconversion: "Äquivalenzen / Quereinstieg",
      skills_title: "Kompetenzen & Weg",
      skills_must_have: "Must-have Kompetenzen",
      soft_skills: "Soft Skills",
      tools_stack: "Tools / Stack",
      certifications: "Zertifikate",
      schools_or_paths: "Schulen / Wege",
      top_fields: "Kernbereiche",
      portfolio_projects: "Portfolio-Projekte",
      time_to_employability: "Zeit bis Beschäftigung",
      growth_outlook: "Aussichten",
      market_demand: "Marktnachfrage",
      salary_notes: "Gehaltsnotizen"
    },
    es: {
      metier_sheet: "Ficha de empleo",
      sector: "Sector",
      country: "País",
      missing: "No hay datos disponibles para este empleo en este país.",
      salary_grid: "Tabla salarial",
      junior: "Junior",
      mid: "Intermedio",
      senior: "Senior",
      variable: "Parte variable",
      indicators: "Indicadores",
      remote_level: "Teletrabajo",
      automation_risk: "Riesgo de automatización",
      statut_generation: "Estado",
      formation: "Formación",
      acces: "Acceso al oficio",
      marche: "Mercado",
      education_title: "Nivel de estudios y títulos",
      education_local: "Nivel requerido (local)",
      education_required: "Nivel requerido",
      degrees_examples: "Títulos (ejemplos)",
      outcomes_title: "Salidas y primeros puestos",
      first_jobs: "Primeros puestos",
      employers: "Empleadores típicos",
      hiring_sectors: "Sectores que contratan",
      access_title: "Acceso y reconversión",
      entry_routes: "Vías de acceso",
      equivalences_reconversion: "Equivalencias / reconversión",
      skills_title: "Competencias y trayectoria",
      skills_must_have: "Competencias imprescindibles",
      soft_skills: "Habilidades blandas",
      tools_stack: "Herramientas / stack",
      certifications: "Certificaciones",
      schools_or_paths: "Escuelas / itinerarios",
      top_fields: "Áreas clave",
      portfolio_projects: "Proyectos / portfolio",
      time_to_employability: "Tiempo de empleabilidad",
      growth_outlook: "Perspectivas",
      market_demand: "Demanda del mercado",
      salary_notes: "Notas salariales"
    },
    it: {
      metier_sheet: "Scheda professione",
      sector: "Settore",
      country: "Paese",
      missing: "Nessun dato disponibile per questo mestiere in questo paese.",
      salary_grid: "Griglia salariale",
      junior: "Junior",
      mid: "Intermedio",
      senior: "Senior",
      variable: "Quota variabile",
      indicators: "Indicatori",
      remote_level: "Lavoro da remoto",
      automation_risk: "Rischio automazione",
      statut_generation: "Stato",
      formation: "Formazione",
      acces: "Accesso al mestiere",
      marche: "Mercato",
      education_title: "Livello di studi e titoli",
      education_local: "Livello richiesto (locale)",
      education_required: "Livello richiesto",
      degrees_examples: "Titoli (esempi)",
      outcomes_title: "Sbocchi e prime posizioni",
      first_jobs: "Prime posizioni",
      employers: "Datori di lavoro tipici",
      hiring_sectors: "Settori che assumono",
      access_title: "Accesso e riconversione",
      entry_routes: "Percorsi di accesso",
      equivalences_reconversion: "Equivalenze / riconversione",
      skills_title: "Competenze e percorso",
      skills_must_have: "Competenze indispensabili",
      soft_skills: "Soft skills",
      tools_stack: "Strumenti / stack",
      certifications: "Certificazioni",
      schools_or_paths: "Scuole / percorsi",
      top_fields: "Aree chiave",
      portfolio_projects: "Progetti / portfolio",
      time_to_employability: "Tempo all’impiego",
      growth_outlook: "Prospettive",
      market_demand: "Domanda mercato",
      salary_notes: "Note salariali"
    }
  };
  function t(k){
    return (I18N[LANG] && I18N[LANG][k]) || (I18N.fr && I18N.fr[k]) || k;
  }

  // ---------------------------
  // CMS Readers (DOM -> globals) — safe & idempotent
  // ---------------------------
  function textFrom(el){ return el ? normText(el.textContent || "") : ""; }
  function htmlFrom(el){ return el ? String(el.innerHTML || "").trim() : ""; }

  function readMetiersFromDOM(){
    var out = [];
    var slugs = document.querySelectorAll(".js-metier-slug");
    for (var i=0;i<slugs.length;i++){
      var item = slugs[i].closest(".w-dyn-item") || slugs[i].parentElement;
      var slug = normSlug(textFrom(item && item.querySelector(".js-metier-slug")) || textFrom(slugs[i]));
      var name = textFrom(item && item.querySelector(".js-metier-name"));
      var sector = textFrom(item && item.querySelector(".js-metier-sector"));
      if (!slug) continue;
      out.push({ slug: slug, name: name || slug, sector: sector || "" });
    }
    return out;
  }
  function readSectorsFromDOM(){
    var out = [];
    var ids = document.querySelectorAll(".js-sector-slug");
    for (var i=0;i<ids.length;i++){
      var item = ids[i].closest(".w-dyn-item") || ids[i].parentElement;
      var id = normSlug(textFrom(item && item.querySelector(".js-sector-slug")) || textFrom(ids[i]));
      var name = textFrom(item && item.querySelector(".js-sector-name"));
      if (!id && !name) continue;
      out.push({ id: id || normSlug(name), name: name || id });
    }
    return out;
  }
  function readCountriesFromDOM(){
    var out = [];
    var isos = document.querySelectorAll(".js-country-iso");
    for (var i=0;i<isos.length;i++){
      var item = isos[i].closest(".w-dyn-item") || isos[i].parentElement;
      var iso = normIso(textFrom(item && item.querySelector(".js-country-iso")) || textFrom(isos[i]));
      var name = textFrom(item && item.querySelector(".js-country-name"));
      var lf = normLang(textFrom(item && item.querySelector(".js-country-lang")));
      if (!iso) continue;
      out.push({ iso: iso, name: name || iso, language_finale: lf || "" });
    }
    return out;
  }

  // MPB mapping (exact 1:1 classes requested)
  var MPB_FIELDS = [
    // Access / formation / market
    ["formation", ".js-bf-formation"],
    ["acces", ".js-bf-acces"],
    ["marche", ".js-bf-marche"],
    ["education_level_local", ".js-bf-education_level_local"],
    ["education_level", ".js-bf-education_level"],
    // Skills & path
    ["top_fields", ".js-bf-top_fields"],
    ["certifications", ".js-bf-certifications"],
    ["schools_or_paths", ".js-bf-schools_or_paths"],
    ["equivalences_reconversion", ".js-bf-equivalences_reconversion"],
    ["entry_routes", ".js-bf-entry_routes"],
    ["first_job_titles", ".js-bf-first_job_titles"],
    ["typical_employers", ".js-bf-typical_employers"],
    ["portfolio_projects", ".js-bf-portfolio_projects"],
    ["skills_must_have", ".js-bf-skills_must_have"],
    ["soft_skills", ".js-bf-soft_skills"],
    ["tools_stack", ".js-bf-tools_stack"],
    // Market & future
    ["time_to_employability", ".js-bf-time_to_employability"],
    ["hiring_sectors", ".js-bf-hiring_sectors"],
    ["degrees_examples", ".js-bf-degrees_examples"],
    ["growth_outlook", ".js-bf-growth_outlook"],
    ["market_demand", ".js-bf-market_demand"],
    ["salary_notes", ".js-bf-salary_notes"],
    // Salary
    ["currency", ".js-chip-currency"],
    ["junior_min", ".js-sal-junior-min"],
    ["junior_max", ".js-sal-junior-max"],
    ["mid_min", ".js-sal-mid-min"],
    ["mid_max", ".js-sal-mid-max"],
    ["senior_min", ".js-sal-senior-min"],
    ["senior_max", ".js-sal-senior-max"],
    ["variable_share", ".js-sal-variable-share"],
    // Indicators
    ["remote_level", ".js-chip-remote_level"],
    ["automation_risk", ".js-chip-automation_risk"],
    ["statut_generation", ".js-statut-generation"]
  ];

  function readMPBFromDOM(){
    var out = [];
    // wrapper is "ul-cms-blocs-source" per your spec; but accept either id or class
    var wrapper = document.querySelector(".ul-cms-blocs-source, #ul-cms-blocs-source, [data-ul-cms-blocs-source]");
    if (!wrapper){
      // fallback: if items exist without wrapper, still read them
      wrapper = document;
    }
    var metierEls = wrapper.querySelectorAll(".js-bloc-metier");
    for (var i=0;i<metierEls.length;i++){
      var dynItem = metierEls[i].closest(".w-dyn-item") || metierEls[i].parentElement;
      var metier = normSlug(textFrom(dynItem && dynItem.querySelector(".js-bloc-metier")) || textFrom(metierEls[i]));
      var iso = normIso(textFrom(dynItem && dynItem.querySelector(".js-bloc-iso")));
      if (!metier || !iso) continue;

      var rec = { metier: metier, iso: iso };
      for (var f=0; f<MPB_FIELDS.length; f++){
        var key = MPB_FIELDS[f][0];
        var sel = MPB_FIELDS[f][1];
        var node = dynItem && dynItem.querySelector(sel);
        // content can be rich text or text block — keep HTML if rich text, else text
        var html = node ? htmlFrom(node) : "";
        // If element looks like a plain text (no tags), store as text too
        if (node){
          var hasTags = /<[^>]+>/.test(html);
          rec[key] = hasTags ? html : textFrom(node);
        } else {
          rec[key] = "";
        }
      }
      out.push(rec);
    }
    return out;
  }

  function ensureGlobalsFromDOM(){
    if (!Array.isArray(window.__ULYDIA_METIERS__) || !window.__ULYDIA_METIERS__.length){
      window.__ULYDIA_METIERS__ = readMetiersFromDOM();
    }
    if (!Array.isArray(window.__ULYDIA_SECTEURS__) || !window.__ULYDIA_SECTEURS__.length){
      window.__ULYDIA_SECTEURS__ = readSectorsFromDOM();
    }
    if (!Array.isArray(window.__ULYDIA_COUNTRIES__) || !window.__ULYDIA_COUNTRIES__.length){
      window.__ULYDIA_COUNTRIES__ = readCountriesFromDOM();
    }
    if (!Array.isArray(window.__ULYDIA_MPB__) || !window.__ULYDIA_MPB__.length){
      window.__ULYDIA_MPB__ = readMPBFromDOM();
    }
  }

  // ---------------------------
  // Rendering
  // ---------------------------
  function ensureRoot(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root){
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      (document.body || document.documentElement).appendChild(root);
    }
    // remove duplicates if any
    try {
      var roots = document.querySelectorAll("#ulydia-metier-root");
      if (roots && roots.length > 1){
        for (var i=1;i<roots.length;i++){
          try { roots[i].parentNode && roots[i].parentNode.removeChild(roots[i]); } catch(e){}
        }
      }
    } catch(e){}
    return root;
  }

  function ensureStyles(){
    if (document.getElementById("ulydia-final-mono-styles")) return;
    var st = document.createElement("style");
    st.id = "ulydia-final-mono-styles";
    st.textContent = [
      ":root{--ul-red:#c00102;--ul-border:rgba(15,23,42,.12);--ul-shadow:0 10px 30px rgba(0,0,0,.08);--ul-radius:22px;--ul-muted:#64748b;}",
      "#ulydia-metier-root *{box-sizing:border-box;}",
      ".ul-wrap{max-width:1140px;margin:0 auto;padding:28px 18px 90px;font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;}",
      ".ul-hero{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:18px;}",
      ".ul-h1{margin:0;font-size:40px;line-height:1.05;font-weight:900;color:var(--ul-red);letter-spacing:-.02em;}",
      "@media(max-width:720px){.ul-h1{font-size:32px;}}",
      ".ul-meta{display:flex;gap:10px;flex-wrap:wrap;align-items:center;color:var(--ul-muted);font-weight:700;}",
      ".ul-chip{display:inline-flex;gap:8px;align-items:center;padding:8px 12px;border:1px solid var(--ul-border);border-radius:999px;background:#fff;}",
      ".ul-grid{display:grid;gap:18px;grid-template-columns:minmax(0,1fr) 360px;}",
      "@media(max-width:980px){.ul-grid{grid-template-columns:1fr;}}",
      ".ul-card{background:#fff;border:1px solid var(--ul-border);border-radius:var(--ul-radius);box-shadow:var(--ul-shadow);overflow:hidden;}",
      ".ul-card-h{padding:16px 18px;background:linear-gradient(135deg,#fff5f5 0%,#ffe4e4 35%,#ffd6d6 70%,#ffffff 100%);border-bottom:1px solid var(--ul-border);font-weight:900;}",
      ".ul-card-b{padding:16px 18px;line-height:1.6;}",
      ".ul-card-b p{margin:0 0 10px;}",
      ".ul-card-b ul{margin:8px 0 0 18px;}",
      ".ul-card-b li{margin:6px 0;}",
      ".ul-sub{margin:14px 0 8px;font-weight:900;}",
      ".ul-kv{display:grid;gap:10px;}",
      ".ul-kv-row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--ul-border);border-radius:14px;background:#fff;}",
      ".ul-k{font-weight:900;color:#0f172a;}",
      ".ul-v{color:#0f172a;opacity:.9;font-weight:700;}",
      ".ul-note{color:var(--ul-muted);font-size:13px;}",
      ".ul-empty{padding:22px;border:1px dashed rgba(15,23,42,.18);border-radius:18px;color:var(--ul-muted);font-weight:700;background:#fff;}",
      ".ul-hr{height:1px;background:rgba(15,23,42,.10);margin:16px 0;}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function card(title, html){
    if (!html || isEmptyRich(html)) return null;
    var c = document.createElement("section");
    c.className = "ul-card";
    var h = document.createElement("div");
    h.className = "ul-card-h";
    h.textContent = title;
    var b = document.createElement("div");
    b.className = "ul-card-b";
    b.innerHTML = safeHtml(html);
    c.appendChild(h);
    c.appendChild(b);
    return c;
  }

  function kvCard(title, rows, noteHtml){
    // rows: [{k, v}]
    var has = false;
    for (var i=0;i<rows.length;i++){
      if (rows[i] && normText(rows[i].v)) { has = true; break; }
    }
    if (!has && (!noteHtml || isEmptyRich(noteHtml))) return null;

    var c = document.createElement("section");
    c.className = "ul-card";
    var h = document.createElement("div");
    h.className = "ul-card-h";
    h.textContent = title;
    var b = document.createElement("div");
    b.className = "ul-card-b";
    var kv = document.createElement("div");
    kv.className = "ul-kv";
    rows.forEach(function(r){
      var v = normText(r && r.v);
      if (!v) return;
      var row = document.createElement("div");
      row.className = "ul-kv-row";
      var k = document.createElement("div");
      k.className = "ul-k";
      k.textContent = r.k;
      var val = document.createElement("div");
      val.className = "ul-v";
      val.textContent = v;
      row.appendChild(k);
      row.appendChild(val);
      kv.appendChild(row);
    });
    b.appendChild(kv);
    if (noteHtml && !isEmptyRich(noteHtml)){
      var hr = document.createElement("div"); hr.className="ul-hr"; b.appendChild(hr);
      var n = document.createElement("div"); n.className="ul-note"; n.innerHTML = safeHtml(noteHtml); b.appendChild(n);
    }
    c.appendChild(h);
    c.appendChild(b);
    return c;
  }

  function render(){
    ensureGlobalsFromDOM();

    var metierSlug = normSlug(qsParam("metier"));
    var countryIso = normIso(qsParam("country") || qsParam("iso"));

    var metiers = Array.isArray(window.__ULYDIA_METIERS__) ? window.__ULYDIA_METIERS__ : [];
    var countries = Array.isArray(window.__ULYDIA_COUNTRIES__) ? window.__ULYDIA_COUNTRIES__ : [];
    var mpb = Array.isArray(window.__ULYDIA_MPB__) ? window.__ULYDIA_MPB__ : [];

    var metier = metiers.find(function(m){ return normSlug(m && m.slug) === metierSlug; }) || null;
    var country = countries.find(function(c){ return normIso(c && c.iso) === countryIso; }) || null;

    var bloc = mpb.find(function(b){
      return normSlug(b && b.metier) === metierSlug && normIso(b && b.iso) === countryIso;
    }) || null;

    // If country has a final language and no explicit ?lang, we can set lang (soft) but never override ?lang
    try {
      if (!normLang(qsParam("lang")) && country && normLang(country.language_finale)){
        LANG = normLang(country.language_finale) || LANG;
        window.__ULYDIA_LANG__ = LANG;
        document.documentElement.setAttribute("lang", LANG);
      }
    } catch(e){}

    var root = ensureRoot();
    ensureStyles();

    // Clear previous render
    root.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "ul-wrap";

    var hero = document.createElement("div");
    hero.className = "ul-hero";

    var leftHero = document.createElement("div");
    var h1 = document.createElement("h1");
    h1.className = "ul-h1";
    h1.textContent = (metier && (metier.name || metier.slug)) ? (metier.name || metier.slug) : (metierSlug || t("metier_sheet"));
    leftHero.appendChild(h1);

    var meta = document.createElement("div");
    meta.className = "ul-meta";
    var chip1 = document.createElement("span");
    chip1.className = "ul-chip";
    chip1.innerHTML = "<span style='opacity:.7'>"+t("sector")+":</span> <span>"+(metier && metier.sector ? metier.sector : "—")+"</span>";
    var chip2 = document.createElement("span");
    chip2.className = "ul-chip";
    chip2.innerHTML = "<span style='opacity:.7'>"+t("country")+":</span> <span>"+(country && country.name ? country.name : (countryIso||"—"))+"</span>";
    meta.appendChild(chip1);
    meta.appendChild(chip2);

    leftHero.appendChild(meta);
    hero.appendChild(leftHero);

    wrap.appendChild(hero);

    // If no bloc, show clean message (no empty UI)
    if (!bloc){
      var empty = document.createElement("div");
      empty.className = "ul-empty";
      empty.textContent = t("missing");
      wrap.appendChild(empty);
      root.appendChild(wrap);
      try { window.dispatchEvent(new Event("ULYDIA:PAGE_READY")); } catch(e){}
      return;
    }

    // Prepare left / right stacks
    var grid = document.createElement("div");
    grid.className = "ul-grid";
    var left = document.createElement("div");
    var right = document.createElement("div");

    // LEFT — formation / acces / marche (rich blocks)
    var cFormation = card(t("formation"), bloc.formation);
    var cAcces = card(t("acces"), bloc.acces);
    var cMarche = card(t("marche"), bloc.marche);

    [cFormation, cAcces, cMarche].forEach(function(c){ if (c) left.appendChild(c); });

    // LEFT — Education / Degrees (structured, but using rich if provided)
    var eduRows = [
      { k: t("education_local"), v: (bloc.education_level_local || "") },
      { k: t("education_required"), v: (bloc.education_level || "") }
    ];
    var cEdu = kvCard(t("education_title"), eduRows, bloc.degrees_examples);
    if (cEdu) left.appendChild(cEdu);

    // LEFT — Outcomes & first roles
    var outRows = [
      { k: t("first_jobs"), v: (bloc.first_job_titles || "") },
      { k: t("employers"), v: (bloc.typical_employers || "") },
      { k: t("hiring_sectors"), v: (bloc.hiring_sectors || "") }
    ];
    var cOut = kvCard(t("outcomes_title"), outRows, "");
    if (cOut) left.appendChild(cOut);

    // LEFT — Access & reconversion
    var accessRows = [
      { k: t("entry_routes"), v: (bloc.entry_routes || "") },
      { k: t("equivalences_reconversion"), v: (bloc.equivalences_reconversion || "") }
    ];
    var cAccess = kvCard(t("access_title"), accessRows, "");
    if (cAccess) left.appendChild(cAccess);

    // RIGHT — Skills & path
    var skillsRows = [
      { k: t("top_fields"), v: (bloc.top_fields || "") },
      { k: t("skills_must_have"), v: (bloc.skills_must_have || "") },
      { k: t("soft_skills"), v: (bloc.soft_skills || "") },
      { k: t("tools_stack"), v: (bloc.tools_stack || "") },
      { k: t("certifications"), v: (bloc.certifications || "") },
      { k: t("schools_or_paths"), v: (bloc.schools_or_paths || "") },
      { k: t("portfolio_projects"), v: (bloc.portfolio_projects || "") }
    ];
    var cSkills = kvCard(t("skills_title"), skillsRows, "");
    if (cSkills) right.appendChild(cSkills);

    // RIGHT — Market & future (structured)
    var marketRows = [
      { k: t("time_to_employability"), v: (bloc.time_to_employability || "") },
      { k: t("growth_outlook"), v: (bloc.growth_outlook || "") },
      { k: t("market_demand"), v: (bloc.market_demand || "") }
    ];
    var cMarket = kvCard(t("marche"), marketRows, bloc.salary_notes);
    if (cMarket) right.appendChild(cMarket);

    // RIGHT — Salary grid
    var cur = normText(bloc.currency || "");
    var salRows = [
      { k: t("junior"), v: fmtRange(bloc.junior_min, bloc.junior_max, cur) },
      { k: t("mid"), v: fmtRange(bloc.mid_min, bloc.mid_max, cur) },
      { k: t("senior"), v: fmtRange(bloc.senior_min, bloc.senior_max, cur) },
      { k: t("variable"), v: normText(bloc.variable_share || "") }
    ];
    var cSal = kvCard(t("salary_grid"), salRows, "");
    if (cSal) right.appendChild(cSal);

    // RIGHT — Indicators
    var indRows = [
      { k: t("remote_level"), v: normText(bloc.remote_level || "") },
      { k: t("automation_risk"), v: normText(bloc.automation_risk || "") },
      { k: t("statut_generation"), v: normText(bloc.statut_generation || "") }
    ];
    var cInd = kvCard(t("indicators"), indRows, "");
    if (cInd) right.appendChild(cInd);

    // Assemble
    grid.appendChild(left);
    grid.appendChild(right);
    wrap.appendChild(grid);

    root.appendChild(wrap);

    try { window.dispatchEvent(new Event("ULYDIA:PAGE_READY")); } catch(e){}
  }

  function fmtRange(a, b, currency){
    var n1 = parseNum(a);
    var n2 = parseNum(b);
    var cur = normText(currency || "");
    function fmt(n){
      if (n === null) return "";
      // format like 28 000
      try{
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      }catch(e){ return String(n); }
    }
    var f1 = fmt(n1);
    var f2 = fmt(n2);
    if (!f1 && !f2) return "";
    if (f1 && f2) return f1 + " – " + f2 + (cur ? (" " + cur) : "");
    return (f1 || f2) + (cur ? (" " + cur) : "");
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot(){
    try{ render(); }catch(e){
      // Fail-safe render
      var root = ensureRoot();
      root.innerHTML = "<div style='max-width:980px;margin:40px auto;padding:18px;border:1px solid rgba(15,23,42,.12);border-radius:16px;background:#fff;font-family:system-ui'>"+
        "<b>Ulydia:</b> render error.<br/><div style='margin-top:8px;color:#b00'>"+(String(e && e.message || e).replace(/</g,"&lt;"))+"</div></div>";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
