/*!
 * ULYDIA — METIER PAGE — SINGLE FILE MONOLITHIC BUNDLE (NO LOADER)
 * File: metier-page.v2026-01-29.FINAL.MONO.BUNDLE.NOLOADER.js
 * Date: 2026-01-29
 *
 * Replaces (in order, merged as-is):
 * 1) ulydia-ui.v2.js
 * 2) ulydia-i18n.v1.3.js
 * 3) metier-page.v2026-01-29.FINAL.BASE.FIX16.WRAPPER.SAFEURL.js
 * 4) metier-page.v2026-01-29.FINAL.LOADER.OVERLAY.PATCH1.js
 * 5) metier-page.v2026-01-29.FINAL.HIDE.FILTERBAR.PATCH1.js
 * 6) metier-page.v2026-01-25.FINAL.BLOCFLATTEN.PATCH1.js
 * 7) metier-page.v2026-01-29.FINAL.BLOCKS.LEFT.PATCH5.MPB3INLINE.LISTS.I18N.js
 * 8) metier-page.v2026-01-26.FINAL.BLOCKS.RIGHT.PATCH2.SALARYFIX2.INDICATORS2.js
 * 9) metier-page.v2026-01-26.FINAL.INDICATORS.HOTFIX4.js
 * 10) metier-page.v2026-01-27.FINAL.BANNER.BEFOREFAQ.I18N.PATCH6.18.js
 * 11) metier-page.v2026-01-27.FINAL.SPONSOR.TAGLINE.REMOVE.PATCH1.js
 * 12) metier-page.v2026-01-25.FINAL.FAQ.PATCH1.js
 * 13) metier-page.v2026-01-28.FINAL.FAQ.DEDUPE.PATCH1.js
 * 14) metier-page.v2026-01-27.FINAL.RIGHT.HOVER.PATCH1.js
 * 15) metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH4.js
 * 16) metier-page.v2026-01-28.FINAL.SALARY.STICKY.PATCH1.js
 * 17) metier-page.v2026-01-28.FINAL.I18N.UI.STABLE.PATCH1.js
 *
 * IMPORTANT:
 * - No dynamic script injection (no FIX15/FIX13 loaders).
 * - Extra safety patch at end: NBSP cleanup + MPB hover + MPB relocation + optional ?lang= override for testing.
 */



/* ===== BEGIN: ulydia-ui.v2.js ===== */
/* ulydia-ui.v2.js — Design tokens loader + small UI helpers
   - Loads tokens JSON (default: /design-tokens/ulydia.design-tokens.v2.json)
   - Injects CSS variables + utility classes used by metier-page
   - Safe to include on any Webflow page (idempotent)
*/
(() => {
  if (window.__ULYDIA_UI_V2__) return;
  window.__ULYDIA_UI_V2__ = true;

  const DEFAULT_TOKENS_URL = "/design-tokens/ulydia.design-tokens.v2.json";

  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function ensureStyle(id, css){
    let s = document.getElementById(id);
    if (!s){
      s = document.createElement('style');
      s.id = id;
      document.head.appendChild(s);
    }
    s.textContent = css;
  }

  function cssEscape(str){
    return (str || "").replace(/[\n\r\t]/g, " ");
  }

  async function loadTokens(url){
    const finalUrl = url || DEFAULT_TOKENS_URL;
    try {
      const res = await fetch(finalUrl, { cache: "force-cache" });
      if (!res.ok) throw new Error(`tokens fetch failed: ${res.status}`);
      return await res.json();
    } catch (e){
      // Fallback minimal tokens (keeps pages readable)
      return {
        colors: {
          primary: "#c00102",
          primaryHover: "#a00001",
          text: "#1a1a1a",
          muted: "#6b7280",
          border: "#e5e7eb",
          bg: "#ffffff",
          card: "#fafafa",
          white: "#ffffff"
        },
        typography: { fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial", basePx: 14 },
        radii: { sm: 6, md: 8, lg: 10, xl: 12, card: 22 },
        shadows: { card: "0 10px 30px rgba(0,0,0,.06)", cardHover: "0 15px 40px rgba(0,0,0,.10)" },
        gradients: { redSlow: "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 35%, #ffd6d6 70%, #ffffff 100%)" },
        components: { buttonHeight: 44, bannerWide: { width: 680, height: 120 }, bannerSquare: { width: 220, height: 220 } }
      };
    }
  }

  function applyTokens(t){
    const c = t.colors || {};
    const r = t.radii || {};
    const s = t.shadows || {};
    const g = t.gradients || {};
    const ty = t.typography || {};

    const rootVars = {
      "--ul-primary": c.primary,
      "--ul-primary-hover": c.primaryHover || c.primary,
      "--ul-text": c.text,
      "--ul-muted": c.muted,
      "--ul-border": c.border,
      "--ul-bg": c.bg,
      "--ul-card": c.card,
      "--ul-white": c.white || "#fff",
      "--ul-radius-sm": (r.sm ?? 6) + "px",
      "--ul-radius-md": (r.md ?? 8) + "px",
      "--ul-radius-lg": (r.lg ?? 10) + "px",
      "--ul-radius-xl": (r.xl ?? 12) + "px",
      "--ul-radius-card": (r.card ?? 22) + "px",
      "--ul-shadow-card": s.card || "0 10px 30px rgba(0,0,0,.06)",
      "--ul-shadow-card-hover": s.cardHover || "0 15px 40px rgba(0,0,0,.10)",
      "--ul-gradient-header": g.redSlow || g.red || "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 35%, #ffd6d6 70%, #ffffff 100%)",
      "--ul-font": ty.fontFamily || "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial",
      "--ul-base": (ty.basePx ?? 14) + "px"
    };

    const varLines = Object.entries(rootVars)
      .filter(([,v]) => v != null && v !== "undefined")
      .map(([k,v]) => `${k}: ${cssEscape(String(v))};`)
      .join("\n");

    const css = `:root{\n${varLines}\n}

/* Base */
.ulydia-ui{font-family:var(--ul-font); font-size:var(--ul-base); color:var(--ul-text);} 
.ul-page-bg{background:var(--ul-bg);} 

/* Layout */
.ul-container{max-width:1140px; margin:0 auto; padding:28px 18px 90px;} 
.ul-grid{display:grid; gap:18px;} 
.ul-grid.two{grid-template-columns: minmax(0,1fr) 360px;} 
@media (max-width: 980px){.ul-grid.two{grid-template-columns:1fr;}}

/* Card */
.ul-card{background:var(--ul-white); border:1px solid var(--ul-border); border-radius:var(--ul-radius-card); box-shadow:var(--ul-shadow-card); overflow:hidden;} 
.ul-card:hover{box-shadow:var(--ul-shadow-card-hover);} 
.ul-card-h{padding:16px 18px; background:var(--ul-gradient-header); border-bottom:1px solid var(--ul-border);} 
.ul-card-t{margin:0; font-weight:800; letter-spacing:-0.01em;} 
.ul-card-b{padding:16px 18px;} 

/* Title + tagline */
.ul-h1{margin:0; font-size:40px; line-height:1.05; font-weight:800; color:var(--ul-primary); letter-spacing:-0.02em;} 
@media (max-width: 720px){.ul-h1{font-size:32px;}}
.ul-tagline{margin:10px 0 0; color:var(--ul-muted); font-size:15px;} 

/* Buttons */
.ul-btn{display:inline-flex; align-items:center; justify-content:center; height:44px; padding:0 18px; border-radius:14px; border:1px solid var(--ul-border); background:var(--ul-white); color:var(--ul-text); font-weight:700; text-decoration:none; cursor:pointer;} 
.ul-btn:hover{box-shadow:0 6px 20px rgba(0,0,0,.06);} 
.ul-btn.primary{background:var(--ul-primary); border-color:var(--ul-primary); color:white;} 
.ul-btn.primary:hover{background:var(--ul-primary-hover);} 

/* Inputs */
.ul-input, .ul-select{height:44px; border:1px solid var(--ul-border); border-radius:14px; padding:0 14px; background:var(--ul-white); font-weight:600; color:var(--ul-text); outline:none;} 
.ul-input:focus, .ul-select:focus{border-color:rgba(192,1,2,.35); box-shadow:0 0 0 4px rgba(192,1,2,.10);} 

/* Banner */
.ul-banner-wide{width:100%; max-width:680px; height:auto; display:block; border-radius:18px; overflow:hidden; border:1px solid var(--ul-border); box-shadow:0 10px 30px rgba(0,0,0,.08);} 
.ul-banner-wide img{width:100%; height:auto; display:block;}

/* Rich text */
.ul-rich p{margin:0 0 10px;} 
.ul-rich ul{margin:8px 0 0 18px;} 
.ul-rich li{margin:6px 0;} 
.ul-rich h3,.ul-rich h4{margin:16px 0 10px;} 
.ul-rich a{color:var(--ul-primary); font-weight:700;}
`;

    ensureStyle("ulydia_ui_v2_css", css);
  }

  // Public API
  window.UlydiaUI = {
    version: "2.0",
    load: async (url) => {
      const t = await loadTokens(url);
      applyTokens(t);
      return t;
    },
    ensureStyle,
    qs,
    qsa
  };
})();

/* ===== END: ulydia-ui.v2.js ===== */


/* ===== BEGIN: ulydia-i18n.v1.3.js ===== */
(function(){
  // =========================================================
  // ULYDIA — I18N v1.3
  // - Same as v1.2 (catalog-based language + ?lang= override)
  // - Adds backward-compatible alias keys:
  //   work_env -> environments
  //   work_env_title -> environments
  //   vue_ensemble -> overview
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
      metier_sheet: "Fiche métier",
      overview: "Vue d’ensemble",
      missions: "Missions principales",
      key_skills: "Compétences clés",
      environments: "Environnements de travail",
      career_evolution: "Évolution & qualifications",
      faq: "Questions fréquentes",

      // aliases (compat)
      work_env: "Environnements de travail",
      work_env_title: "Environnements de travail",
      vue_ensemble: "Vue d’ensemble",

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
      metier_sheet: "Job profile",
      overview: "Overview",
      missions: "Key responsibilities",
      key_skills: "Key skills",
      environments: "Work environments",
      career_evolution: "Career development",
      faq: "Frequently asked questions",

      // aliases (compat)
      work_env: "Work environments",
      work_env_title: "Work environments",
      vue_ensemble: "Overview",

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

      work_env: "Arbeitsumfeld",
      work_env_title: "Arbeitsumfeld",
      vue_ensemble: "Überblick",

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

      work_env: "Entornos de trabajo",
      work_env_title: "Entornos de trabajo",
      vue_ensemble: "Visión general",

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

      work_env: "Ambienti di lavoro",
      work_env_title: "Ambienti di lavoro",
      vue_ensemble: "Panoramica",

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
/* ===== END: ulydia-i18n.v1.3.js ===== */


/* ===== BEGIN: metier-page.v2026-01-29.FINAL.BASE.FIX16.WRAPPER.SAFEURL.js ===== */
/*!
ULYDIA — BASE WRAPPER — FIX16 — SAFEURL PATCH — 2026-01-29
Goal:
- Prevent `/undefined/v1/metier-page` fetches (hard fail early if config missing)
- Freeze critical config so it can't be overwritten by legacy scripts
- Add a minimal fetch guard ONLY for `/v1/metier-page` to avoid "Unexpected token '<'" JSON crashes
- Then inject the real base (FIX15) exactly once
*/

(function(){
  // =========================================================
  // 0) Hard preflight: config must exist BEFORE anything boots
  // =========================================================
  var required = [
    "ULYDIA_WORKER_URL",
    "ULYDIA_PROXY_SECRET"
  ];

  function isNonEmptyString(v){
    return typeof v === "string" && v.trim().length > 0;
  }

  function showFatal(msg){
    try{
      console.error(msg);
      // minimal inline overlay (no dependency on ulydia-ui)
      var id = "ulydia-fatal-overlay";
      if (document.getElementById(id)) return;
      var d = document.createElement("div");
      d.id = id;
      d.setAttribute("style",
        "position:fixed;inset:0;z-index:2147483647;background:#fff;" +
        "display:flex;align-items:center;justify-content:center;padding:24px;" +
        "font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      );
      d.innerHTML =
        "<div style='max-width:760px;width:100%;border:1px solid #eee;border-radius:14px;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.06)'>" +
          "<div style='font-size:16px;font-weight:700;margin-bottom:8px'>Ulydia — configuration missing</div>" +
          "<div style='font-size:14px;line-height:1.5;color:#444;margin-bottom:12px'>" +
            "The page scripts stopped intentionally to avoid fetching <b>/undefined/v1/metier-page</b>.<br/>" +
            "Fix: ensure the global config script runs before any metier-page scripts." +
          "</div>" +
          "<pre style='white-space:pre-wrap;font-size:12px;background:#fafafa;border:1px solid #eee;border-radius:10px;padding:12px;margin:0;color:#222'>" +
            (String(msg || "")).replace(/</g,"&lt;").replace(/>/g,"&gt;") +
          "</pre>" +
        "</div>";
      document.documentElement.appendChild(d);
    }catch(e){}
  }

  // Collect missing keys
  var missing = [];
  for (var i=0;i<required.length;i++){
    var k = required[i];
    if (!isNonEmptyString(window[k])) missing.push(k);
  }

  // If missing, STOP NOW (do not set any boot flags)
  if (missing.length){
    showFatal("[ULYDIA] Missing required globals: " + missing.join(", ") + "\n" +
      "Expected e.g. window.ULYDIA_WORKER_URL = \"https://...workers.dev\";");
    return;
  }

  // =========================================================
  // 1) Freeze critical globals (prevents accidental overwrite)
  // =========================================================
  function freezeKey(key){
    try{
      if (window["__ULYDIA_LOCKED__" + key]) return;
      var v = window[key];
      if (!isNonEmptyString(v)) return;

      // If already non-writable, just mark as locked
      var desc = Object.getOwnPropertyDescriptor(window, key);
      if (desc && desc.writable === false) {
        window["__ULYDIA_LOCKED__" + key] = true;
        return;
      }

      Object.defineProperty(window, key, {
        value: v,
        writable: false,
        configurable: false,
        enumerable: true
      });
      window["__ULYDIA_LOCKED__" + key] = true;
    }catch(e){}
  }

  freezeKey("ULYDIA_WORKER_URL");
  freezeKey("ULYDIA_PROXY_SECRET");
  freezeKey("ULYDIA_IPINFO_TOKEN"); // optional, but freezing doesn't hurt if set

  // =========================================================
  // 2) Fetch guard ONLY for /v1/metier-page
  //    (prevents JSON parse crash on HTML 404 pages)
  // =========================================================
  try{
    if (!window.__ULYDIA_FETCH_GUARD_V1__ && typeof window.fetch === "function"){
      window.__ULYDIA_FETCH_GUARD_V1__ = true;

      var _fetch = window.fetch.bind(window);

      window.fetch = function(input, init){
        var url = "";
        try{
          if (typeof input === "string") url = input;
          else if (input && typeof input.url === "string") url = input.url;
        }catch(e){}

        // Only guard the metier-page API calls
        var isMetierApi = url.indexOf("/v1/metier-page") !== -1;

        if (!isMetierApi) return _fetch(input, init);

        // If URL somehow contains "/undefined/", hard fail
        if (url.indexOf("/undefined/") !== -1){
          return Promise.reject(new Error("[ULYDIA] Fetch blocked: URL contains /undefined/ => " + url));
        }

        return _fetch(input, init).then(function(res){
          try{
            var ct = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
            var isJson = ct.toLowerCase().indexOf("application/json") !== -1;

            if (!isJson){
              // Read a small snippet for debugging (without consuming original stream for callers)
              return res.clone().text().then(function(txt){
                var head = (txt || "").slice(0, 180).replace(/\s+/g," ").trim();
                throw new Error(
                  "[ULYDIA] Invalid API response (expected JSON). " +
                  "status=" + res.status + " ct=" + ct + " url=" + url +
                  (head ? (" head=\"" + head + "\"") : "")
                );
              });
            }

            return res;
          }catch(e){
            // If any header access fails, still return res (caller may handle)
            return res;
          }
        });
      };
    }
  }catch(e){}

})();


(function(){
  // =========================================================
  // 3) FIX16 wrapper boot (inject FIX15 exactly once)
  // =========================================================
  if (window.__ULYDIA_BASE_FIX16__) return;
  window.__ULYDIA_BASE_FIX16__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, arguments); }
  function warn(){ if(console && console.warn) console.warn.apply(console, arguments); }

  // Ensure there is only ONE root in DOM
  try{
    var roots = document.querySelectorAll("#ulydia-metier-root");
    if (roots && roots.length > 1){
      for (var i=1;i<roots.length;i++){
        try{ roots[i].parentNode && roots[i].parentNode.removeChild(roots[i]); }catch(e){}
      }
      warn("[ULYDIA] removed duplicate #ulydia-metier-root nodes:", roots.length-1);
    }
  }catch(e){}

  // Anti-loop: do not re-run if another base already started
  if (window.__ULYDIA_METIER_PAGE_BOOTING__){
    warn("[ULYDIA] base already booting — abort FIX16");
    return;
  }
  window.__ULYDIA_METIER_PAGE_BOOTING__ = true;

  // Load the real base (FIX15)
  var BASE_SRC = "https://ulydia-assets.pages.dev/assets/metier-page.v2026-01-29.FINAL.BASE.FIX15.ANTILOOP.RESPONSESAFE.js";

  function inject(){
    try{
      // If it's already present, don't inject again
      var existing = Array.prototype.slice.call(document.scripts||[]).some(function(s){
        return s && s.src && s.src.indexOf("FINAL.BASE.FIX15.ANTILOOP.RESPONSESAFE.js") !== -1;
      });
      if (existing){
        warn("[ULYDIA] FIX15 already present — skip inject");
        return;
      }
      var s = document.createElement("script");
      s.src = BASE_SRC;
      s.defer = true;
      s.onload = function(){ log("[ULYDIA] FIX15 loaded"); };
      s.onerror = function(){ warn("[ULYDIA] cannot load FIX15 base:", BASE_SRC); };
      document.head.appendChild(s);
    }catch(e){
      warn("[ULYDIA] inject failed", e);
    }
  }

  // Keep a short delay so UI can be ready
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();

/* ===== END: metier-page.v2026-01-29.FINAL.BASE.FIX16.WRAPPER.SAFEURL.js ===== */


/* ===== BEGIN: metier-page.v2026-01-29.FINAL.LOADER.OVERLAY.PATCH1.js ===== */
(function(){
  // ULYDIA — LOADER OVERLAY — PATCH1 — 2026-01-29
  // Affiche un loader plein écran pendant le rendu JS, puis le masque.
  if (window.__ULYDIA_LOADER_PATCH1__) return;
  window.__ULYDIA_LOADER_PATCH1__ = true;

  function add(){
    if (document.getElementById("ulydia_overlay_loader")) return;
    var st = document.createElement("style");
    st.id = "ulydia_loader_styles";
    st.textContent =
      ".u-overlay{position:fixed;inset:0;z-index:999999;background:#fff;display:flex;align-items:center;justify-content:center}" +
      ".u-overlayCard{display:flex;align-items:center;gap:14px;padding:18px 22px;border:1px solid rgba(15,23,42,.12);border-radius:16px;box-shadow:0 10px 30px rgba(2,6,23,.08);background:#fff;font-family:Montserrat,system-ui}" +
      ".u-spinner{width:22px;height:22px;border-radius:999px;border:3px solid rgba(2,6,23,.15);border-top-color:rgba(2,6,23,.75);animation:uSpin 0.9s linear infinite}" +
      "@keyframes uSpin{to{transform:rotate(360deg)}}";
    document.head.appendChild(st);

    var ov = document.createElement("div");
    ov.id = "ulydia_overlay_loader";
    ov.className = "u-overlay";
    ov.innerHTML =
      '<div class="u-overlayCard">' +
        '<div class="u-spinner"></div>' +
        '<div>' +
          '<div style="font-weight:900;font-size:13px;color:#0f172a">Loading…</div>' +
          '<div style="font-size:12px;opacity:.7;margin-top:2px">Please wait a moment.</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
  }

  function hide(){
    var ov = document.getElementById("ulydia_overlay_loader");
    if (ov) ov.remove();
  }

  function isRendered(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root) return false;
    if (root.querySelector("#ulydia_overlay_loader")) return false;
    // contenu significatif ?
    var txt = (root.textContent||"").replace(/\s+/g," ").trim();
    return (root.children && root.children.length > 0) && txt.length > 60;
  }

  function tick(start){
    if (isRendered()) return hide();
    if (Date.now() - start > 12000) return hide(); // fail-safe
    requestAnimationFrame(function(){ tick(start); });
  }

  function boot(){
    add();
    tick(Date.now());
    window.addEventListener("ULYDIA:PAGE_READY", hide, { once:true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* ===== END: metier-page.v2026-01-29.FINAL.LOADER.OVERLAY.PATCH1.js ===== */


/* ===== BEGIN: metier-page.v2026-01-29.FINAL.HIDE.FILTERBAR.PATCH1.js ===== */
(function(){
  // ULYDIA — HIDE SEARCH HEADER (Finsweet will handle filters) — PATCH1
  if (window.__ULYDIA_HIDE_FILTERBAR_PATCH1__) return;
  window.__ULYDIA_HIDE_FILTERBAR_PATCH1__ = true;

  function norm(s){ return String(s||"").toLowerCase().replace(/\s+/g," ").trim(); }

  function findBar(){
    var nodes = document.querySelectorAll("label,div,span,h2,h3");
    for (var i=0;i<nodes.length;i++){
      var t = norm(nodes[i].textContent);
      if (t.includes("pays / région") || t.includes("sector") || t.includes("secteur d'activité")) {
        var wrap = nodes[i].closest("section, .container, .w-container, .u-search, .u-filters, div");
        if (wrap) return wrap;
      }
    }
    return null;
  }

  function run(){
    var bar = document.querySelector("#ulydia-searchbar, #ulydia-filterbar, .u-metier-searchbar, .u-metier-filterbar") || findBar();
    if (bar) bar.style.display = "none";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
/* ===== END: metier-page.v2026-01-29.FINAL.HIDE.FILTERBAR.PATCH1.js ===== */


/* ===== BEGIN: metier-page.v2026-01-25.FINAL.BLOCFLATTEN.PATCH1.js ===== */
/* metier-page.v2026-01-25.FINAL.BLOCFLATTEN.PATCH1.js
   ULYDIA — Metier_Pays_Blocs "sections[]" -> flat fields patch (SAFE)

   Why:
   - BASE may expose blocFields as schema: { iso, metier, sections:[{key,label,type,value}], chips:{...}, salary:{...} }
   - Some PATCHES (notably RIGHT rail) expect flat keys on blocFields: skills_must_have, tools_stack, certifications, etc.

   This patch:
   ✅ Listens for ULYDIA:METIER_READY (or polls)
   ✅ If blocFields has sections[], builds a flat map { [key]: value }
   ✅ Adds both original & lowercased keys (e.g. "Skills_must_have" and "skills_must_have")
   ✅ Stores result into:
      - window.__ULYDIA_BLOC__  (merged, so existing readers still work)
      - window.__ULYDIA_METIER_PAGE_CTX__.blocFields (same object)
   ✅ Does NOT touch HTML directly
*/
(() => {
  if (window.__ULYDIA_BLOCFLATTEN_PATCH1__) return;
  window.__ULYDIA_BLOCFLATTEN_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocflatten.patch1]", ...a);

  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const normKey = (k) => String(k || "").trim();

  function flattenSections(sections){
    const flat = {};
    if (!Array.isArray(sections)) return flat;
    for (const s of sections) {
      if (!s) continue;
      const k = normKey(s.key || s.Key || s.name || s.slug);
      if (!k) continue;
      const v = (s.value !== undefined) ? s.value : (s.html !== undefined ? s.html : (s.content !== undefined ? s.content : ""));
      flat[k] = v;
      flat[k.toLowerCase()] = v;
      // also normalize common variants (spaces -> _)
      flat[k.replace(/\s+/g, "_")] = v;
      flat[k.replace(/\s+/g, "_").toLowerCase()] = v;
    }
    return flat;
  }

  function mergeInto(target, src){
    if (!isObj(target) || !isObj(src)) return target;
    for (const [k,v] of Object.entries(src)) {
      // don't overwrite existing non-empty values
      const cur = target[k];
      const curEmpty = cur === undefined || cur === null || (typeof cur === "string" && cur.trim() === "");
      if (curEmpty) target[k] = v;
    }
    return target;
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b || !isObj(b)) return;

    if (!Array.isArray(b.sections)) {
      log("no sections[] detected — nothing to flatten");
      return;
    }

    const flat = flattenSections(b.sections);
    if (!Object.keys(flat).length) {
      log("sections[] empty — nothing to flatten");
      return;
    }

    // Ensure window.__ULYDIA_BLOC__ points to the same object used by patches
    const same = (window.__ULYDIA_BLOC__ === b);
    if (!same) window.__ULYDIA_BLOC__ = b;

    mergeInto(b, flat);

    // keep ctx in sync
    try {
      if (window.__ULYDIA_METIER_PAGE_CTX__) {
        window.__ULYDIA_METIER_PAGE_CTX__.blocFields = b;
      }
    } catch(e){}

    log("flattened keys added", Object.keys(flat).slice(0,20), "… total:", Object.keys(flat).length);
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__ || null;

    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) {
      run(ctx);
      return;
    }

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    // fallback poll
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__ || null;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();

/* ===== END: metier-page.v2026-01-25.FINAL.BLOCFLATTEN.PATCH1.js ===== */


/* ===== BEGIN: metier-page.v2026-01-29.FINAL.BLOCKS.LEFT.PATCH5.MPB3INLINE.LISTS.I18N.js ===== */
/* metier-page — BLOCKS.LEFT.PATCH5 (FINAL)
   Based on PATCH4.MPB3INLINE:
   - Adds structured rendering for the 3 MPB blocks with:
       • subtitle per section (translatable)
       • items split by comma/newline and rendered with "→" arrows
   - Subtitles auto-update on language change (best-effort):
       • listens to ULYDIA bus events if available
       • falls back to a lightweight lang watcher (checks every 700ms)

   Visibility:
   - Each MPB card is shown ONLY if at least one of its sections has non-empty items.

   Replaces:
   - DOM-based MPB 3blocks scripts
   - separate MPB THREEBLOCKS scripts

   2026-01-29
*/

(() => {
  if (window.__ULYDIA_BLOCKS_LEFT_PATCH5__) return;
  window.__ULYDIA_BLOCKS_LEFT_PATCH5__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.left.patch5]", ...a);

  // -------------------------
  // Rich / sanitize helpers
  // -------------------------
  function stripHTML(html){
    return String(html || "")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n")
      .replace(/<\/li>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  function isEmptyText(s){
    return !String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function isEmptyRich(html){
    const stripped = stripHTML(html).replace(/[ \t\r\n]+/g, " ").trim();
    return !stripped;
  }

  function sanitizeHTML(html){
    let s = String(html || "");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    // remove inline on* handlers
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  // -------------------------
  // DOM helpers used by existing PATCH3 layout
  // -------------------------
  function getCardByTitleId(id){
    const title = document.getElementById(id);
    if (!title) return null;
    return title.closest(".card") || title.closest("section") || title.parentElement || null;
  }

  function getRichContentContainer(card){
    if (!card) return null;
    return card.querySelector(".rich-content") || card.querySelector("[data-ul-rich]") || card.querySelector(".card-content") || null;
  }

  function showCard(card){
    if (!card) return;
    card.style.display = "";
    card.hidden = false;
    card.classList.remove("hidden");
  }

  function hideCard(card){
    if (!card) return;
    card.style.display = "none";
    card.hidden = true;
  }

  function setRichByTitleId(titleId, html){
    const card = getCardByTitleId(titleId);
    if (!card) return false;

    const box = getRichContentContainer(card);
    if (!box) {
      if (isEmptyRich(html)) { hideCard(card); return false; }
      showCard(card);
      return false;
    }

    if (isEmptyRich(html)) {
      try { box.innerHTML = ""; } catch(_){}
      hideCard(card);
      return false;
    }

    box.innerHTML = sanitizeHTML(html);
    showCard(card);
    return true;
  }

  function setRichByContainerId(containerId, html){
    const box = document.getElementById(containerId);
    if (!box) return null; // not present in this template
    const card = box.closest(".card") || box.closest("section") || box.parentElement;
    const safe = String(html || "").trim();

    if (isEmptyRich(safe)) {
      if (card) hideCard(card);
      box.innerHTML = "";
      return false;
    }

    if (card) showCard(card);
    box.innerHTML = sanitizeHTML(safe);
    return true;
  }

  function pickField(blocFields, key){
    if (!blocFields) return "";
    return (
      blocFields[key] ??
      blocFields[key.toLowerCase()] ??
      blocFields[key.toUpperCase()] ??
      ""
    );
  }

  function normalizeBlocFields(blocRaw, blocFields){
    const b = blocFields || null;
    if (!b) return null;

    const byKey = {};
    if (Array.isArray(b.sections)) {
      for (const s of b.sections) {
        if (!s || !s.key) continue;
        byKey[String(s.key)] = s.value;
      }
    }
    return { raw: blocRaw || null, fields: b, byKey };
  }

  // -------------------------
  // MPB 3 blocks rendering (structured)
  // -------------------------
  function ensureMPB3Style(){
    if (document.getElementById("ulydia-mpb3-style-p5")) return;
    const st = document.createElement("style");
    st.id = "ulydia-mpb3-style-p5";
    st.textContent = `
/* ULYDIA MPB3 cards (PATCH5) */
.ulydia-mpb3-card{border-radius:22px; overflow:hidden; background:#fff; border:1px solid rgba(0,0,0,.06); box-shadow:0 10px 28px rgba(0,0,0,.06);}
.ulydia-mpb3-head{display:flex; align-items:center; gap:10px; padding:16px 18px; font-weight:800; font-size:18px; letter-spacing:-.2px;}
.ulydia-mpb3-emoji{font-size:18px; line-height:1}
.ulydia-mpb3-body{padding:18px 18px 20px; font-size:14px; line-height:1.55; color:#111;}
.ulydia-mpb3-sub{margin:14px 0 8px; font-size:15px; font-weight:800;}
.ulydia-mpb3-list{margin:6px 0 8px 0; padding:0; list-style:none; display:grid; gap:6px;}
.ulydia-mpb3-item{display:flex; gap:10px; align-items:flex-start;}
.ulydia-mpb3-arrow{
  font-weight:800;
  line-height:1.2;
  transform:translateY(1px);
  color:var(--ulydia-primary, #7c3aed);
}
}
.ulydia-mpb3-text{flex:1;}
.ulydia-mpb3-edu{background:linear-gradient(90deg, rgba(145,93,255,.35), rgba(220,205,255,.55));}
.ulydia-mpb3-first{background:linear-gradient(90deg, rgba(80,210,255,.30), rgba(200,245,255,.65));}
.ulydia-mpb3-access{background:linear-gradient(90deg, rgba(80,240,180,.28), rgba(210,255,235,.70));}
.ulydia-mpb3-stack{display:grid; gap:14px; margin:14px 0;}
`.trim();
    document.head.appendChild(st);
  }

  function normTxt(s){
    return String(s||"")
      .replace(/\u2019/g,"'")
      .replace(/\u00a0/g," ")
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();
  }

  function findCardByTitleContains(words){
    const heads = document.querySelectorAll("h1,h2,h3,h4");
    for (const h of heads){
      const t = normTxt(h.textContent);
      if (!t) continue;
      let ok = true;
      for (const w of words){
        if (t.indexOf(w) === -1) { ok = false; break; }
      }
      if (!ok) continue;
      const card = h.closest(".card") || h.closest("section") || h.closest("article") || h.parentElement;
      if (card) return card;
    }
    return null;
  }

  // Language detection (best effort)
  function getLang(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    const l1 = ctx && (ctx.lang || ctx.language);
    const l2 = window.__ULYDIA_LANG__;
    const l3 = document.documentElement.getAttribute("lang");
    return String(l1 || l2 || l3 || "fr").toLowerCase();
  }

  // i18n for subtitles (FR/EN/DE/ES/IT)
  const I18N = {
    fr: {
      edu_local: "Niveau requis (local)",
      edu_required: "Niveau requis",
      edu_degrees: "Diplômes (exemples)",
      first_jobs: "Premiers postes",
      first_employers: "Employeurs types",
      first_sectors: "Secteurs qui recrutent",
      access_routes: "Voies d’accès",
      access_equiv: "Équivalences / reconversion",
      card_edu: "Niveau d’études & diplômes",
      card_first: "Débouchés & premiers postes",
      card_access: "Accès au métier & reconversion"
    },
    en: {
      edu_local: "Required level (local)",
      edu_required: "Required level",
      edu_degrees: "Degrees (examples)",
      first_jobs: "First roles",
      first_employers: "Typical employers",
      first_sectors: "Hiring sectors",
      access_routes: "Entry routes",
      access_equiv: "Equivalences / career change",
      card_edu: "Education level & degrees",
      card_first: "Outcomes & first roles",
      card_access: "Access to the role & career change"
    },
    de: {
      edu_local: "Erforderliches Niveau (lokal)",
      edu_required: "Erforderliches Niveau",
      edu_degrees: "Abschlüsse (Beispiele)",
      first_jobs: "Erste Positionen",
      first_employers: "Typische Arbeitgeber",
      first_sectors: "Sektoren mit Bedarf",
      access_routes: "Einstiegswege",
      access_equiv: "Äquivalenzen / Quereinstieg",
      card_edu: "Bildungsniveau & Abschlüsse",
      card_first: "Perspektiven & erste Positionen",
      card_access: "Zugang zum Beruf & Quereinstieg"
    },
    es: {
      edu_local: "Nivel requerido (local)",
      edu_required: "Nivel requerido",
      edu_degrees: "Títulos (ejemplos)",
      first_jobs: "Primeros puestos",
      first_employers: "Empleadores típicos",
      first_sectors: "Sectores que contratan",
      access_routes: "Vías de acceso",
      access_equiv: "Equivalencias / reconversión",
      card_edu: "Nivel de estudios y títulos",
      card_first: "Salidas y primeros puestos",
      card_access: "Acceso al oficio y reconversión"
    },
    it: {
      edu_local: "Livello richiesto (locale)",
      edu_required: "Livello richiesto",
      edu_degrees: "Titoli (esempi)",
      first_jobs: "Prime posizioni",
      first_employers: "Datori di lavoro tipici",
      first_sectors: "Settori che assumono",
      access_routes: "Percorsi di accesso",
      access_equiv: "Equivalenze / riconversione",
      card_edu: "Livello di studi e titoli",
      card_first: "Sbocchi e prime posizioni",
      card_access: "Accesso al mestiere e riconversione"
    }
  };

  function t(key){
    const lang = getLang();
    const base = I18N[lang] || I18N.fr;
    return base[key] || (I18N.fr[key] || key);
  }

  function splitItems(input){
    const raw = stripHTML(input);
    if (isEmptyText(raw)) return [];
    // split by comma or newline or semicolon; keep simple
    return raw
      .split(/[,;\n]+/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function createList(items){
    const ul = document.createElement("ul");
    ul.className = "ulydia-mpb3-list";
    for (const it of items){
      const li = document.createElement("li");
      li.className = "ulydia-mpb3-item";
      const a = document.createElement("span");
      a.className = "ulydia-mpb3-arrow";
      a.textContent = "→";
      const tx = document.createElement("span");
      tx.className = "ulydia-mpb3-text";
      tx.textContent = it;
      li.appendChild(a);
      li.appendChild(tx);
      ul.appendChild(li);
    }
    return ul;
  }

  function createSection(subKey, items){
    const wrap = document.createElement("div");
    wrap.className = "ulydia-mpb3-section";
    if (items.length){
      const h = document.createElement("div");
      h.className = "ulydia-mpb3-sub";
      h.setAttribute("data-ulydia-i18n", subKey);
      h.textContent = t(subKey);
      wrap.appendChild(h);
      wrap.appendChild(createList(items));
    }
    return wrap;
  }

  function createMPB3Card(kind, cardKey, emoji, sections){
    const card = document.createElement("section");
    card.className = "ulydia-mpb3-card";
    card.setAttribute("data-ulydia-mpb3", kind);

    const head = document.createElement("div");
    head.className = "ulydia-mpb3-head " + (kind === "edu" ? "ulydia-mpb3-edu" : kind === "first" ? "ulydia-mpb3-first" : "ulydia-mpb3-access");

    const em = document.createElement("span");
    em.className = "ulydia-mpb3-emoji";
    em.textContent = emoji;

    const tt = document.createElement("div");
    tt.setAttribute("data-ulydia-i18n", cardKey);
    tt.textContent = t(cardKey);

    head.appendChild(em);
    head.appendChild(tt);

    const body = document.createElement("div");
    body.className = "ulydia-mpb3-body";

    for (const s of sections){
      if (!s || !s.items || !s.items.length) continue;
      body.appendChild(createSection(s.subKey, s.items));
    }

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  function updateI18NInside(node){
    if (!node) return;
    const lang = getLang();
    const base = I18N[lang] || I18N.fr;
    node.querySelectorAll("[data-ulydia-i18n]").forEach(el => {
      const k = el.getAttribute("data-ulydia-i18n");
      if (!k) return;
      el.textContent = base[k] || (I18N.fr[k] || el.textContent);
    });
  }

  function renderMPB3(byKey, f){
    // Remove previous wrap if exists (to re-render on language change)
    const prev = document.querySelector("[data-ulydia-mpb3-wrap='1']");
    if (prev) prev.remove();

    // Read fields
    const eduLocal = pickField(f, "education_level_local") || byKey["education_level_local"] || "";
    const eduReq   = pickField(f, "education_level")       || byKey["education_level"]       || "";
    const eduDeg   = pickField(f, "degrees_examples")      || byKey["degrees_examples"]      || "";

    const firstJobs = pickField(f, "first_job_titles")   || byKey["first_job_titles"]   || "";
    const firstEmp  = pickField(f, "typical_employers")  || byKey["typical_employers"]  || "";
    const firstSec  = pickField(f, "hiring_sectors")     || byKey["hiring_sectors"]     || "";

    const accessRoutes = pickField(f, "entry_routes")               || byKey["entry_routes"]               || "";
    const accessEquiv  = pickField(f, "equivalences_reconversion")  || byKey["equivalences_reconversion"]  || "";

    const eduSections = [
      { subKey: "edu_local",    items: splitItems(eduLocal) },
      { subKey: "edu_required", items: splitItems(eduReq) },
      { subKey: "edu_degrees",  items: splitItems(eduDeg) }
    ];

    const firstSections = [
      { subKey: "first_jobs",      items: splitItems(firstJobs) },
      { subKey: "first_employers", items: splitItems(firstEmp) },
      { subKey: "first_sectors",   items: splitItems(firstSec) }
    ];

    const accessSections = [
      { subKey: "access_routes", items: splitItems(accessRoutes) },
      { subKey: "access_equiv",  items: splitItems(accessEquiv) }
    ];

    const hasEdu = eduSections.some(s => s.items.length);
    const hasFirst = firstSections.some(s => s.items.length);
    const hasAccess = accessSections.some(s => s.items.length);

    if (!hasEdu && !hasFirst && !hasAccess){
      log("MPB3: no data -> do not render");
      return;
    }

    ensureMPB3Style();

    // Anchors: between Competences and Environnements
    const afterComp = findCardByTitleContains(["compétences","clés"]) || findCardByTitleContains(["competences","cles"]);
    const beforeEnv = findCardByTitleContains(["environnements","travail"]) || findCardByTitleContains(["environnement","travail"]);

    const root = document.getElementById("ulydia-metier-root") || document.body;
    const parent = (afterComp && afterComp.parentNode) ? afterComp.parentNode : root;

    const wrap = document.createElement("div");
    wrap.className = "ulydia-mpb3-stack";
    wrap.setAttribute("data-ulydia-mpb3-wrap", "1");

    if (hasEdu) wrap.appendChild(createMPB3Card("edu", "card_edu", "🎓", eduSections));
    if (hasFirst) wrap.appendChild(createMPB3Card("first", "card_first", "⏱️", firstSections));
    if (hasAccess) wrap.appendChild(createMPB3Card("access", "card_access", "🪵", accessSections));

    // Insert
    try{
      if (beforeEnv && beforeEnv.parentNode === parent){
        parent.insertBefore(wrap, beforeEnv);
      } else if (afterComp && afterComp.parentNode){
        if (afterComp.nextSibling) afterComp.parentNode.insertBefore(wrap, afterComp.nextSibling);
        else afterComp.parentNode.appendChild(wrap);
      } else {
        parent.appendChild(wrap);
      }
    }catch(e){
      parent.appendChild(wrap);
    }

    updateI18NInside(wrap);
    log("MPB3 rendered (structured)");
  }

  // -------------------------
  // Main run
  // -------------------------
  let lastLang = null;

  function run(ctx){
    const blocRaw = ctx?.bloc || window.__ULYDIA_BLOC_RAW__ || null;
    const blocFields = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    const nb = normalizeBlocFields(blocRaw, blocFields);
    if (!nb) return;

    const f = nb.fields;
    const byKey = nb.byKey || {};

    // Existing LEFT cards (formation/acces/marche/salaire)
    const formationHTML = pickField(f, "formation_bloc") || byKey["formation_bloc"] || byKey["formation"] || "";
    const accesHTML     = pickField(f, "acces_bloc")     || byKey["acces_bloc"]     || byKey["acces"]     || "";
    const marcheHTML    = pickField(f, "marche_bloc")    || byKey["marche_bloc"]    || byKey["marche"]    || "";
    const salaireHTML   = pickField(f, "salaire_bloc")   || byKey["salaire_bloc"]   || byKey["salaire"]   || "";

    const ok1a = setRichByContainerId("js-bf-formation", formationHTML);
    const ok2a = setRichByContainerId("js-bf-acces",     accesHTML);
    const ok3a = setRichByContainerId("js-bf-marche",    marcheHTML);
    const ok4a = setRichByContainerId("js-bf-salaire",   salaireHTML);

    const ok1 = (ok1a === null) ? setRichByTitleId("formation-title", formationHTML) : ok1a;
    const ok2 = (ok2a === null) ? setRichByTitleId("acces-title",     accesHTML)     : ok2a;
    const ok3 = (ok3a === null) ? setRichByTitleId("marche-title",    marcheHTML)    : ok3a;
    const ok4 = (ok4a === null) ? setRichByTitleId("salaire-title",   salaireHTML)   : ok4a;

    renderMPB3(byKey, f);

    lastLang = getLang();
    log("applied", { formation: ok1, acces: ok2, marche: ok3, salaire: ok4, mpb3: true, lang: lastLang });
  }

  function bindLangUpdates(){
    // Use bus if available
    const bus = window.__ULYDIA_METIER_BUS__;
    if (bus?.on) {
      bus.on("ULYDIA:LANG_CHANGED", () => {
        const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
        if (ctx) run(ctx);
      });
      bus.on("ULYDIA:I18N_APPLIED", () => {
        const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
        if (ctx) run(ctx);
      });
    }

    // Lightweight watcher (no DOM observers)
    setInterval(() => {
      const lang = getLang();
      if (lang && lang !== lastLang) {
        const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
        if (ctx) run(ctx);
      }
    }, 700);
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) {
      run(ctx);
      bindLangUpdates();
      return;
    }

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", (c) => {
        run(c);
        bindLangUpdates();
      });
      return;
    }

    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) {
        clearInterval(t);
        run(ctx2);
        bindLangUpdates();
      }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();

/* ===== END: metier-page.v2026-01-29.FINAL.BLOCKS.LEFT.PATCH5.MPB3INLINE.LISTS.I18N.js ===== */


/* ===== BEGIN: metier-page.v2026-01-26.FINAL.BLOCKS.RIGHT.PATCH2.SALARYFIX2.INDICATORS2.js ===== */
/* metier-page — BLOCKS.RIGHT.PATCH2 (CHECK + SAFE)
   Injects Metier_Pays_Blocs into RIGHT rail blocks:
   - skills_must_have -> #js-skills-wrap (chips)
   - soft_skills      -> #js-softskills-wrap (skill tags)
   - tools_stack      -> #js-tools-wrap (badges)
   - certifications   -> #js-bf-certifications (rich)
   - schools_or_paths -> #js-bf-schools_or_paths (rich)
   - portfolio_projects -> #js-bf-portfolio_projects (rich)
   Safe: clears placeholders and HIDES each card if the field is empty.
*/
(() => {
  if (window.__ULYDIA_BLOCKS_RIGHT_PATCH2__) return;
  window.__ULYDIA_BLOCKS_RIGHT_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.right.patch2]", ...a);

  function isEmptyRich(html){
    const s = String(html || "").replace(/\u00a0/g, " ").trim();
    if (!s) return true;
    const stripped = s
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    return !stripped;
  }

  function sanitizeHTML(html){
    let s = String(html || "");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  function extractItems(htmlOrText){
    const s = String(htmlOrText || "").trim();
    if (!s) return [];
    if (/<li[\s>]/i.test(s)) {
      const items = [];
      const m = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      for (const li of m) {
        const t = li
          .replace(/<li[^>]*>/i,"").replace(/<\/li>/i,"")
          .replace(/<[^>]+>/g,"").replace(/\u00a0/g," ")
          .replace(/[ \t\r\n]+/g," ")
          .trim();
        if (t) items.push(t);
      }
      return items;
    }
    return s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "\n")
      .split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean);
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function findCardByHeaderContains(label){
    const hs = document.querySelectorAll(".card-header .section-title");
    for (const h of hs) {
      const t = (h.textContent || "").trim();
      if (t && t.includes(label)) {
        return h.closest(".card") || h.closest("section") || h.parentElement || null;
      }
    }
    return null;
  }

  function showCard(card){ if (card) { card.style.display=""; card.hidden=false; card.classList.remove("hidden"); } }
  function hideCard(card){ if (card) { card.style.display="none"; card.hidden=true; } }

  function setChips(containerId, items, max=10){
    const el = document.getElementById(containerId);
    if (!el) return { ok:false };
    const list = (items || []).filter(Boolean);
    if (!list.length) { el.innerHTML=""; return { ok:false }; }
    const slice = list.slice(0, max);
    el.innerHTML = slice.map(t => `<span class="chip badge-primary">${escapeHtml(t)}</span>`).join(" ");
    if (list.length > max) el.insertAdjacentHTML("beforeend", ` <span class="chip" style="opacity:.8">+${list.length-max}</span>`);
    return { ok:true, count:list.length };
  }

  function setBadges(containerId, items, max=12){
    const el = document.getElementById(containerId);
    if (!el) return { ok:false };
    const list = (items || []).filter(Boolean);
    if (!list.length) { el.innerHTML=""; return { ok:false }; }
    const slice = list.slice(0, max);
    el.innerHTML = slice.map(t => `<span class="badge badge-primary">${escapeHtml(t)}</span>`).join(" ");
    if (list.length > max) el.insertAdjacentHTML("beforeend", ` <span class="badge" style="opacity:.8">+${list.length-max}</span>`);
    return { ok:true, count:list.length };
  }

  function setSkillTags(containerId, items, max=8){
    const el = document.getElementById(containerId);
    if (!el) return { ok:false };
    const list = (items || []).filter(Boolean);
    if (!list.length) { el.innerHTML=""; return { ok:false }; }
    const slice = list.slice(0, max);
    el.innerHTML = slice.map(t => `
      <div class="skill-tag">
        <span class="text-lg">🧩</span>
        <span class="text-sm font-semibold" style="color: var(--text);">${escapeHtml(t)}</span>
      </div>
    `).join("");
    if (list.length > max) el.insertAdjacentHTML("beforeend", `<div class="text-xs" style="color: var(--muted); margin-top:8px;">+${list.length-max} autres</div>`);
    return { ok:true, count:list.length };
  }

  function setRich(containerId, html){
    const el = document.getElementById(containerId);
    if (!el) return { ok:false };
    if (isEmptyRich(html)) { el.innerHTML=""; return { ok:false }; }
    el.innerHTML = sanitizeHTML(html);
    return { ok:true };
  }


  // ---------------------------
  // SALARY CARD (RIGHT COLUMN)
  // - Always inject ABOVE "Compétences incontournables"
  // - Remove any previous misplaced salary block
  // ---------------------------
  function ensureSalaryStyle(){
    if (document.getElementById("ulydia-salary-style")) return;
    const style = document.createElement("style");
    style.id = "ulydia-salary-style";
    style.textContent = `
.ul-salary-card{
  border-radius:20px;
  background:#f8fafc;
  border:1px solid rgba(20,20,20,.08);
  overflow:hidden;
  margin-bottom:14px;
}
.ul-salary-header{
  background:linear-gradient(135deg,#16a34a,#22c55e);
  color:#fff;
  padding:14px 16px;
  font-weight:700;
  font-size:14px;
}
.ul-salary-body{ padding:14px 16px; }
.ul-salary-row{ margin-bottom:14px; }
.ul-salary-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
  font-weight:600;
  font-size:13px;
}
.ul-salary-top span:last-child{ font-weight:700; }
.ul-salary-bar{
  height:10px;
  background:#e5e7eb;
  border-radius:999px;
  overflow:hidden;
  margin:6px 0;
}
.ul-salary-fill{
  height:100%;
  background:linear-gradient(135deg,#16a34a,#22c55e);
  border-radius:999px;
}
.ul-salary-sub{ font-size:12px; color:#6b7280; }
.ul-salary-divider{ height:1px; background:#e5e7eb; margin:12px 0; }
/* Hide any other salary blocks injected elsewhere */
[data-ulydia-salary]:not(.ul-salary-right){ display:none !important; }
    `.trim();
    document.head.appendChild(style);
  }

  function removeAnySalaryCards(){
    document.querySelectorAll("[data-ulydia-salary]").forEach(el => el.remove());
  }

  function buildSalaryHTML(){
    // DEMO values (France) — brancher aux vraies datas ensuite
    return `
<section class="ul-salary-card" data-ulydia-salary>
  <div class="ul-salary-header">💰 Grille salariale (France)</div>
  <div class="ul-salary-body">

    <div class="ul-salary-row">
      <div class="ul-salary-top"><span>🧳 Junior</span><span>35–45K€</span></div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:40%"></div></div>
      <div class="ul-salary-sub">0–2 ans d’expérience</div>
    </div>

    <div class="ul-salary-row">
      <div class="ul-salary-top"><span>🚀 Confirmé</span><span>45–60K€</span></div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:65%"></div></div>
      <div class="ul-salary-sub">3–5 ans d’expérience</div>
    </div>

    <div class="ul-salary-row">
      <div class="ul-salary-top"><span>⭐ Senior</span><span>60–85K€</span></div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:90%"></div></div>
      <div class="ul-salary-sub">5+ ans d’expérience</div>
    </div>

    <div class="ul-salary-divider"></div>

    <div class="ul-salary-row">
      <div class="ul-salary-top"><span>📌 Part variable</span><span>5–15%</span></div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:20%"></div></div>
      <div class="ul-salary-sub">Bonus, intéressement, participation</div>
    </div>

  </div>
</section>`.trim();
  }


  // ---------------------------
  // INDICATEURS CLÉS (RIGHT COLUMN)
  // - Remote / Automation / Devise / Employabilité / Croissance / Demande
  // - Inject ABOVE salary card (or above Compétences if salary missing)
  // ---------------------------
  function ensureIndicatorsStyle(){
    if (document.getElementById("ulydia-indicators-style")) return;
    const style = document.createElement("style");
    style.id = "ulydia-indicators-style";
    style.textContent = `
.ul-ind-card{
  border-radius:20px;
  overflow:hidden;
  border:1px solid rgba(20,20,20,.08);
  background:#fff;
  margin-bottom:14px;
}
.ul-ind-header{
  padding:16px 16px;
  color:#fff;
  font-weight:800;
  font-size:14px;
  background:linear-gradient(135deg,#6d28d9,#7c3aed);
}
.ul-ind-body{ padding:14px 14px 10px; background:#f8fafc; }
.ul-ind-item{
  display:flex;
  align-items:center;
  gap:12px;
  background:#fff;
  border:1px solid rgba(20,20,20,.08);
  border-radius:16px;
  padding:12px 12px;
  margin-bottom:10px;
}
.ul-ind-icon{
  width:42px; height:42px;
  border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  font-size:20px;
  background:rgba(16,185,129,.10);
}
.ul-ind-lines{ min-width:0; }
.ul-ind-k{ font-weight:700; font-size:12px; color:rgba(20,20,20,.55); line-height:1.2; }
.ul-ind-v{ font-weight:900; font-size:14px; color:rgba(20,20,20,.92); line-height:1.2; margin-top:2px; }
.ul-ind-v.green{ color:#10b981; }
.ul-ind-v.red{ color:#ef4444; }
.ul-ind-v.purple{ color:#7c3aed; }
    `.trim();
    document.head.appendChild(style);
  }

  function removeAnyIndicatorsCards(){
    document.querySelectorAll("[data-ulydia-indicators]").forEach(el => el.remove());
  }

  function _normKey(k){
    return String(k||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"") // strip accents
      .replace(/[^a-z0-9]+/g,"_")
      .replace(/^_+|_+$/g,"");
  }

  function getChip(b, key){
    const c = b && b.chips ? b.chips : {};
    const target = _normKey(key);

    // direct/normalized match
    for (const kk in c){
      if (!Object.prototype.hasOwnProperty.call(c, kk)) continue;
      if (_normKey(kk) === target) return c[kk];
    }

    // includes match (e.g. "Delai d'employabilite (mois)")
    for (const kk in c){
      if (!Object.prototype.hasOwnProperty.call(c, kk)) continue;
      const nk = _normKey(kk);
      if (nk.includes(target)) return c[kk];
    }

    return null;
  }

  function getChipAny(b, keys){
    for (const k of (keys||[])){
      const v = getChip(b, k);
      if (v != null && String(v).trim() !== "") return v;
    }
    return "";
  }

  function formatCurrency(v){
    let s = String(v||"").trim();
    if (!s) return "";
    // already like "EUR (€)"
    if (/\(\s*[^)]+\s*\)/.test(s)) return s;
    const up = s.toUpperCase();
    const map = { EUR:"€", USD:"$", GBP:"£", JPY:"¥", CAD:"$", AUD:"$", CHF:"CHF" };
    if (map[up]) return `${up} (${map[up]})`;
    return s;
  }


  function buildIndicatorsHTML(b){
    // Pull from b.chips when possible (already present in your data model)
    const remote = getChipAny(b, ["Remote_level","Télétravail","Teletravail","Remote","Remote work","Remote level"]) || (b.remote_level || b.remote || "");
    const automation = getChipAny(b, ["Automation_risk","Risque d'automatisation","Risque d automatisation","Automation risk"]) || (b.automation_risk || "");

    const currencyRaw = getChipAny(b, ["Devise","Currency","Monnaie"]) || (b.currency || b.devise || "");
    const currency = formatCurrency(currencyRaw || "EUR");

    const employability = getChipAny(b, ["Délai d'employabilité","Delai d'employabilite","Employability_delay","Employability","Delai employabilite"]) || (b.employability_delay || b.delai_employabilite || "");
    const growth = getChipAny(b, ["Croissance du marché","Croissance du marche","Market_growth","Growth"]) || (b.market_growth || b.croissance_marche || "");
    const demand = getChipAny(b, ["Demande du marché","Demande du marche","Market_demand","Demand"]) || (b.market_demand || b.demande_marche || "");
    // If nothing meaningful, return empty to skip card
    const hasAny = [remote, automation, currency, employability, growth, demand].some(v => String(v||"").trim());
    if (!hasAny) return "";

    function item(icon, label, value, tone){
      const cls = tone ? (" " + tone) : "";
      return `
<div class="ul-ind-item">
  <div class="ul-ind-icon">${icon}</div>
  <div class="ul-ind-lines">
    <div class="ul-ind-k">${label}</div>
    <div class="ul-ind-v${cls}">${value}</div>
  </div>
</div>`.trim();
    }

    // Tone heuristics
    const autoTone = /faible|low/i.test(String(automation)) ? "green" : (/fort|high/i.test(String(automation)) ? "red" : "purple");
    const demandTone = /très|fort|strong|high/i.test(String(demand)) ? "red" : (/faible|low/i.test(String(demand)) ? "green" : "purple");

    const html = `
<section class="ul-ind-card" data-ulydia-indicators>
  <div class="ul-ind-header">📊 Indicateurs clés</div>
  <div class="ul-ind-body">
    ${remote ? item("🏠","Télétravail", String(remote), "purple") : ""}
    ${automation ? item("🤖","Risque d'automatisation", String(automation), autoTone) : ""}
    ${currency ? item("💰","Devise", String(currency), "purple") : ""}
    ${employability ? item("⏱️","Délai d'employabilité", String(employability), "purple") : ""}
    ${growth ? item("📈","Croissance du marché", String(growth), "green") : ""}
    ${demand ? item("🔥","Demande du marché", String(demand), demandTone) : ""}
  </div>
</section>`.trim();

    return html;
  }

  function injectIndicatorsAboveSalaryOrCompetences(b){
    // Remove any indicators injected elsewhere
    removeAnyIndicatorsCards();
    ensureIndicatorsStyle();

    const html = buildIndicatorsHTML(b);
    if (!html) return { ok:false, reason:"no-data" };

    // Prefer insert above salary card if present, else above Compétences card
    const salary = document.querySelector("[data-ulydia-salary].ul-salary-right");
    const competences = findCardByHeaderContains("Compétences incontournables");

    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const card = wrap.firstElementChild;
    if (!card) return { ok:false, reason:"build-failed" };

    if (salary && salary.parentElement) {
      salary.parentElement.insertBefore(card, salary);
      return { ok:true, where:"above-salary" };
    }
    if (competences && competences.parentElement) {
      competences.parentElement.insertBefore(card, competences);
      return { ok:true, where:"above-competences" };
    }
    return { ok:false, reason:"no-anchor" };
  }


  function injectSalaryAboveCompetences(){
    const c = findCardByHeaderContains("Compétences incontournables");
    if (!c || !c.parentElement) return { ok:false, reason:"no-competences-card" };

    // Kill any previous misplaced salary and inject here
    removeAnySalaryCards();
    ensureSalaryStyle();

    const wrap = document.createElement("div");
    wrap.innerHTML = buildSalaryHTML();
    const card = wrap.firstElementChild;
    if (card) card.classList.add('ul-salary-right');
    if (!card) return { ok:false, reason:"salary-build-failed" };

    c.parentElement.insertBefore(card, c);
    return { ok:true };
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b) return;

    // Salary card in right column (above Compétences incontournables)
    const sal = injectSalaryAboveCompetences();
    // Indicateurs clés (above salary)
    const ind = injectIndicatorsAboveSalaryOrCompetences(b);

    // Short bounded cleanup: during first ~4s, hide/remove any stray salary blocks injected later
    const _t0 = Date.now();
    (function _cleanup(){
      try{
        document.querySelectorAll("[data-ulydia-salary]").forEach(el=>{
          if (!el.classList.contains("ul-salary-right")) {
            // hide rule already applies; remove to keep DOM clean
            el.remove();
          }
        });
      }catch(e){}
      if (Date.now() - _t0 < 4000) requestAnimationFrame(_cleanup);
    })();

    const c1 = findCardByHeaderContains("Compétences incontournables");
    const skills = extractItems(b.skills_must_have || b.Skills_must_have || "");
    const r1 = setChips("js-skills-wrap", skills, 10);
    (r1.ok ? showCard : hideCard)(c1);

    const c2 = findCardByHeaderContains("Soft Skills essentiels");
    const soft = extractItems(b.soft_skills || b.Soft_skills || "");
    const r2 = setSkillTags("js-softskills-wrap", soft, 8);
    (r2.ok ? showCard : hideCard)(c2);

    const c3 = findCardByHeaderContains("Stack Technique Populaire");
    const tools = extractItems(b.tools_stack || b.Tools_stack || "");
    const r3 = setBadges("js-tools-wrap", tools, 12);
    (r3.ok ? showCard : hideCard)(c3);

    const c4 = findCardByHeaderContains("Certifications utiles");
    const r4 = setRich("js-bf-certifications", b.certifications || b.Certifications || "");
    (r4.ok ? showCard : hideCard)(c4);

    const c5 = findCardByHeaderContains("Écoles");
    const r5 = setRich("js-bf-schools_or_paths", b.schools_or_paths || b.Schools_or_paths || "");
    (r5.ok ? showCard : hideCard)(c5);

    const c6 = findCardByHeaderContains("Projets Portfolio");
    const r6 = setRich("js-bf-portfolio_projects", b.portfolio_projects || b.Portfolio_projects || "");
    (r6.ok ? showCard : hideCard)(c6);

    log("applied", { indicators: ind?.ok, indicatorsWhere: ind?.where, salary: sal?.ok, skills:r1.ok, soft:r2.ok, tools:r3.ok, cert:r4.ok, schools:r5.ok, portfolio:r6.ok });
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);
    if (window.__ULYDIA_METIER_BUS__?.on) return window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);

    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();
/* ===== END: metier-page.v2026-01-26.FINAL.BLOCKS.RIGHT.PATCH2.SALARYFIX2.INDICATORS2.js ===== */


/* ===== BEGIN: metier-page.v2026-01-26.FINAL.INDICATORS.HOTFIX4.js ===== */
/* =========================================================
   ULYDIA — INDICATORS HOTFIX (V4) — STABLE
   Fixes:
   - Devise: show "EUR (€)" (or USD/GBP/JPY) even if only symbol is provided
   - Demande du marché: convert long text to short qualitative label
   Robustness:
   - Re-applies after render (bounded rAF up to 6s)
   - Also hooks ULYDIA event bus if present
   - No MutationObserver, no infinite polling
========================================================= */
(function(){
  if (window.__ULYDIA_INDICATORS_HOTFIX4__) return;
  window.__ULYDIA_INDICATORS_HOTFIX4__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a)=>DEBUG && console.log("[IND.HOTFIX4]", ...a);

  function norm(s){
    return String(s||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .trim();
  }

  function formatCurrencyStrict(v){
    const s = String(v||"").trim();
    if (!s) return "";
    // already formatted like "EUR (€)"
    if (/\b[A-Z]{3}\b\s*\(/.test(s)) return s;
    if (/eur/i.test(s) || s === "€") return "EUR (€)";
    if (/usd/i.test(s) || s === "$") return "USD ($)";
    if (/gbp/i.test(s) || s === "£") return "GBP (£)";
    if (/jpy/i.test(s) || s === "¥") return "JPY (¥)";
    return s;
  }

  function mapDemand(v){
    const n = norm(v);
    if (!n) return "";
    // if it's already short (<= 20 chars), keep it
    if (String(v).trim().length <= 20) return String(v).trim();

    if (/(tres|tr[eè]s).*(fort|eleve)/.test(n) || /very strong|high demand/.test(n)) return "Très forte";
    if (/(fort|eleve)/.test(n)) return "Forte";
    if (/(faible|low)/.test(n)) return "Faible";
    if (/(moyen|moderate)/.test(n)) return "Moyenne";
    // fallback for long paragraphs
    return "Soutenue";
  }

  function applyOnce(){
    const root = document.querySelector("[data-ulydia-indicators]");
    if (!root) return false;

    let changed = false;

    root.querySelectorAll(".ul-ind-item").forEach(item=>{
      const k = item.querySelector(".ul-ind-k")?.textContent || "";
      const vEl = item.querySelector(".ul-ind-v");
      if (!vEl) return;

      if (/devise/i.test(k)) {
        const next = formatCurrencyStrict(vEl.textContent);
        if (next && next !== vEl.textContent) { vEl.textContent = next; changed = true; }
      }

      if (/demande du march/i.test(norm(k))) {
        const next = mapDemand(vEl.textContent);
        if (next && next !== vEl.textContent) { vEl.textContent = next; changed = true; }
      }
    });

    return true; // root existed
  }

  function runBounded(){
    const t0 = Date.now();
    const MAX = 6000;

    (function loop(){
      const exists = applyOnce();
      if (exists) {
        // re-apply a few frames because the right column can re-render once
        if (Date.now() - t0 < MAX) return requestAnimationFrame(loop);
        log("done");
        return;
      }
      if (Date.now() - t0 >= MAX) { log("timeout"); return; }
      requestAnimationFrame(loop);
    })();
  }

  // Hook into ULYDIA ready event if present (most reliable)
  try{
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", function(){
        log("event ULYDIA:METIER_READY");
        runBounded();
      });
    }
  }catch(e){}

  // Always run once now (covers hard refresh / cache)
  runBounded();
})();
/* ===== END: metier-page.v2026-01-26.FINAL.INDICATORS.HOTFIX4.js ===== */


/* ===== BEGIN: metier-page.v2026-01-27.FINAL.BANNER.BEFOREFAQ.I18N.PATCH6.18.js ===== */
(function(){
  "use strict";
  // =========================================================
  // ULYDIA — Banner BEFORE FAQ (I18N) — PATCH6.18 (VISIBLE TARGET)
  // Based on PATCH6.17 but improves FAQ targeting:
  // - If multiple FAQ cards exist (hidden + visible), always pick the VISIBLE one
  //   (offsetParent != null, display != none, rect.height > 0)
  // - If a manual hook exists, uses it first:
  //     [data-ulydia-faq-card="1"]
  // - Keeps the "force create banner" safety + status object.
  // =========================================================

  if (window.__ULYDIA_BANNER_BEFOREFAQ_PATCH618__) return;
  window.__ULYDIA_BANNER_BEFOREFAQ_PATCH618__ = true;

  var STATUS = window.__ULYDIA_BANNER_BEFOREFAQ_STATUS__ = window.__ULYDIA_BANNER_BEFOREFAQ_STATUS__ || {};
  STATUS.patch = "PATCH6.18";
  STATUS.ran = true;
  STATUS.steps = STATUS.steps || [];
  function step(msg){
    try{ STATUS.steps.push({ t: Date.now(), msg: msg }); STATUS.last = msg; }catch(e){}
  }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return v.url || v.src || v.href || v.download || "";
    return "";
  }

  function getSponsorInfo(){
    return (
      window.__ULYDIA_SPONSOR_INFO__ ||
      window.__ULYDIA_SPONSOR__ ||
      window.__ULYDIA_SPONSOR_DATA__ ||
      (window.__ULYDIA_METIER__ && window.__ULYDIA_METIER__.sponsor) ||
      (window.__ULYDIA_STATE__ && window.__ULYDIA_STATE__.sponsor) ||
      null
    );
  }

  function getCountryInfo(){
    var c =
      (window.__ULYDIA_STATE__ && (window.__ULYDIA_STATE__.country || window.__ULYDIA_STATE__.selectedCountry)) ||
      window.__ULYDIA_COUNTRY__ ||
      null;
    if (c) return c;

    var iso = "";
    try{ iso = (window.__ULYDIA_ISO__ || (window.__ULYDIA_STATE__ && window.__ULYDIA_STATE__.iso) || "").toString().toUpperCase().trim(); }catch(e){}
    var catalog = window.__ULYDIA_CATALOG__ || window.__ULYDIA_CATALOG_JSON__ || null;
    if (iso && catalog && catalog.countries && catalog.countries.length){
      for (var i=0;i<catalog.countries.length;i++){
        if (String(catalog.countries[i].iso||"").toUpperCase() === iso) return catalog.countries[i];
      }
    }
    return null;
  }

  function resolveBannerWide(){
    var s = getSponsorInfo();
    if (s){
      var wide = pickUrl(s.banner_wide || s.bannerWide || s.image_1 || s.image1 || (s.banners && (s.banners.wide || s.banners.image_1)));
      if (wide) return { kind:"sponsor", url: wide, href: pickUrl(s.url || s.href || s.cta_url || s.link), alt: norm(s.alt || s.name || "Sponsor") };
    }
    var c = getCountryInfo() || {};
    var banners = c.banners || c.banner || c.fallback_banners || {};
    var wide2 = pickUrl(banners.image_1 || banners.wide || banners.landscape || banners.banner_1 || banners.banner1);
    if (wide2) return { kind:"fallback", url: wide2, href: pickUrl(banners.cta || banners.href || ""), alt:"" };
    return { kind:"none", url:"", href:"", alt:"" };
  }

  // top wide banner fallback
  function ratio(img){
    try{
      var w = Number(img.naturalWidth || img.width || 0);
      var h = Number(img.naturalHeight || img.height || 0);
      if (w && h) return (w/h);
    }catch(e){}
    return 0;
  }

  function findTopWideBannerAnchor(){
    var byId = document.getElementById("sponsor-banner-link");
    if (byId && byId.querySelector("img")) return byId;

    var anchors = qa("a").filter(function(a){ return a.querySelector && a.querySelector("img"); });
    var best = null, bestR = 0;
    for (var i=0;i<anchors.length;i++){
      var img = anchors[i].querySelector("img");
      var r = ratio(img);
      if (r > bestR){
        bestR = r;
        best = anchors[i];
      }
    }
    return (best && bestR >= 1.6) ? best : null;
  }

  var TITLE_WORDS = [
    "questions fréquentes",
    "faq",
    "frequently asked",
    "domande frequenti",
    "preguntas frecuentes",
    "häufige fragen"
  ];

  function isVisible(el){
    if (!el) return false;
    try{
      var cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      if (el.offsetParent === null && cs.position !== "fixed") return false;
      var r = el.getBoundingClientRect();
      if (!r || r.height < 20 || r.width < 200) return false;
      return true;
    }catch(e){}
    return false;
  }

  function findFaqTitleNodes(){
    var nodes = qa("h1,h2,h3,h4,div,span");
    var out = [];
    for (var i=0;i<nodes.length;i++){
      var txt = norm(nodes[i].textContent||"").toLowerCase();
      if (!txt) continue;
      for (var j=0;j<TITLE_WORDS.length;j++){
        if (txt.indexOf(TITLE_WORDS[j]) >= 0){
          out.push(nodes[i]);
          break;
        }
      }
    }
    return out;
  }

  function closestCard(el){
    if (!el) return null;
    try{
      return el.closest(".card, .ul-card, .u-card, .faq-card, .ul-faq-card, [data-ul-section='faq'], .ul-faq, .js-faq");
    }catch(e){}
    return null;
  }

  function findFaqCard(){
    // manual hook wins
    var manual = q('[data-ulydia-faq-card="1"]');
    if (manual && isVisible(manual)) { step("faq-manual"); return manual; }

    // gather candidates via title nodes
    var titles = findFaqTitleNodes();
    var candidates = [];
    for (var i=0;i<titles.length;i++){
      var c = closestCard(titles[i]);
      if (c) candidates.push(c);
    }

    // add generic cards too
    candidates = candidates.concat(qa(".card, .ul-card, .u-card, [data-ul-section='faq'], .ul-faq, .js-faq, .ul-faq-card, .faq-card"));

    // unique
    var uniq = [];
    candidates.forEach(function(x){
      if (x && uniq.indexOf(x) === -1) uniq.push(x);
    });

    // choose best visible: highest height + contains title
    var best = null, bestScore = -1;
    for (var k=0;k<uniq.length;k++){
      var el = uniq[k];
      if (!isVisible(el)) continue;

      var txt = norm(el.textContent||"").toLowerCase();
      var s = 0;

      for (var j=0;j<TITLE_WORDS.length;j++){
        if (txt.indexOf(TITLE_WORDS[j]) >= 0) { s += 20; break; }
      }
      // more question marks => more likely FAQ
      s += Math.min(30, (txt.match(/\?/g)||[]).length * 2);

      var r = el.getBoundingClientRect();
      s += Math.min(30, Math.floor(r.height / 40)); // bigger cards likely the right one

      if (s > bestScore){
        bestScore = s;
        best = el;
      }
    }

    if (best) step("faq-visible-picked");
    return best;
  }

  function getOrCreateBanner(){
    var banner = q("#ul-beforefaq-banner");
    if (banner) return banner;

    banner = document.createElement("div");
    banner.id = "ul-beforefaq-banner";
    banner.setAttribute("data-ul-beforefaq-banner","1");

    var a = document.createElement("a");
    a.setAttribute("data-ul-banner-link","1");
    a.href = "#";
    a.target = "_self";
    a.rel = "noopener";
    a.style.display = "block";
    a.style.textDecoration = "none";

    var img = document.createElement("img");
    img.setAttribute("data-ul-banner-img","1");
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.objectFit = "cover";

    a.appendChild(img);
    banner.appendChild(a);

    banner.style.margin = "18px 0";
    banner.style.borderRadius = "14px";
    banner.style.overflow = "hidden";
    banner.style.background = "#fff";
    banner.style.border = "1px solid rgba(226,232,240,1)";
    banner.style.boxShadow = "0 8px 24px rgba(17,24,39,.10)";
    banner.style.width = "100%";

    try{
      (document.body || document.documentElement).insertBefore(banner, (document.body||document.documentElement).firstChild);
    }catch(e){}

    step("banner-created");
    return banner;
  }

  function sanitizeHref(href){
    href = norm(href);
    if (href && href.indexOf("function") === 0) href = "";
    if (href && !/^https?:\/\//i.test(href)){
      if (!/^(mailto:|tel:)/i.test(href)) href = "https://" + href.replace(/^\/+/, "");
    }
    return href || "#";
  }

  function updateBannerContent(banner){
    var img = q('[data-ul-banner-img="1"]', banner);
    var a = q('[data-ul-banner-link="1"]', banner);
    if (!img || !a) return;

    var info = resolveBannerWide();
    if (info.kind !== "none" && info.url){
      banner.style.display = "";
      if (img.getAttribute("src") !== info.url) img.setAttribute("src", info.url);
      img.alt = info.alt || "";
      var href = sanitizeHref(info.href);
      a.href = href;
      a.target = (href === "#") ? "_self" : "_blank";
      step("content-from-window");
      return;
    }

    var topA = findTopWideBannerAnchor();
    if (topA){
      var imgTop = topA.querySelector("img");
      var src = norm(imgTop.currentSrc || imgTop.getAttribute("src") || "");
      if (src){
        banner.style.display = "";
        if (img.getAttribute("src") !== src) img.setAttribute("src", src);
        img.alt = imgTop.getAttribute("alt") || "";
        var href2 = sanitizeHref(topA.getAttribute("href") || "");
        a.href = href2;
        a.target = (href2 === "#") ? "_self" : "_blank";
        step("content-from-topbanner");
        return;
      }
    }

    banner.style.display = "none";
    step("content-none");
  }

  function syncWidth(banner, card){
    try{
      var w = card && card.getBoundingClientRect ? card.getBoundingClientRect().width : 0;
      if (!w || w < 200) return;
      banner.style.maxWidth = Math.round(w) + "px";
      banner.style.marginLeft = "auto";
      banner.style.marginRight = "auto";
    }catch(e){}
  }

  function placeBanner(banner){
    var faqCard = findFaqCard();
    if (!faqCard || !faqCard.parentElement) { step("faq-not-found"); return; }

    var parent = faqCard.parentElement;
    if (banner.parentElement !== parent){
      parent.insertBefore(banner, faqCard);
    } else if (banner.nextSibling !== faqCard){
      parent.insertBefore(banner, faqCard);
    }

    syncWidth(banner, faqCard);
    step("placed-before-faq");
  }

  function boot(){
    try{
      var banner = getOrCreateBanner();
      updateBannerContent(banner);
      placeBanner(banner);
    }catch(e){
      step("boot-error:" + (e && e.message ? e.message : "unknown"));
    }
  }

  function schedule(){
    setTimeout(boot, 0);
    setTimeout(boot, 250);
    setTimeout(boot, 700);
    setTimeout(boot, 1400);
    setTimeout(boot, 2200);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") schedule();
  document.addEventListener("DOMContentLoaded", schedule);

  window.addEventListener("ULYDIA:RENDER", schedule);
  window.addEventListener("ULYDIA:I18N_UPDATE", schedule);
  window.addEventListener("resize", function(){ setTimeout(boot, 120); });

  try{
    var obs = new MutationObserver(function(){ boot(); });
    obs.observe(document.documentElement, {childList:true, subtree:true});
    setTimeout(function(){ try{ obs.disconnect(); }catch(e){} }, 10000);
  }catch(e){}
})();
/* ===== END: metier-page.v2026-01-27.FINAL.BANNER.BEFOREFAQ.I18N.PATCH6.18.js ===== */


/* ===== BEGIN: metier-page.v2026-01-27.FINAL.SPONSOR.TAGLINE.REMOVE.PATCH1.js ===== */
(function(){
  "use strict";
  // =========================================================
  // ULYDIA — Remove sponsor tagline text under Banner 2 (sidebar)
  // PATCH1 — 2026-01-27
  //
  // Goal:
  // - Remove the hardcoded lines like:
  //   "Formation intensive • 100% gratuite"
  //   "Cursus peer-learning reconnu par l'État"
  // that appear under the square sponsor banner (Banner 2).
  //
  // This is currently static HTML in the template (propal1-fiche metier.html).
  // We keep ONLY the sponsor name (id="sponsor-name-sidebar").
  //
  // Optional (disabled): also remove the tagline under the TOP wide banner.
  // =========================================================

  if (window.__ULYDIA_SPONSOR_TAGLINE_REMOVE_PATCH1__) return;
  window.__ULYDIA_SPONSOR_TAGLINE_REMOVE_PATCH1__ = true;

  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function cleanSidebar(){
    var name = document.getElementById("sponsor-name-sidebar");
    if (!name) return false;

    var box = name.parentElement;
    if (!box) return false;

    // remove every <p> except the sponsor name line
    qa("p", box).forEach(function(p){
      if (p === name) return;
      p.remove();
    });

    return true;
  }

  function cleanTopBanner(){ // OPTIONAL
    var name = document.getElementById("sponsor-name-banner");
    if (!name) return false;
    // remove the next tagline paragraph if present
    var box = name.parentElement;
    if (!box) return false;
    qa("p", box).forEach(function(p){
      // keep "Formation sponsorisée par" and the sponsor name
      if (p.id === "sponsor-name-banner") return;
      // remove only the tagline line(s) (usually smaller / opacity)
      var cls = (p.className || "").toString();
      var txt = (p.textContent || "").toString();
      if (/Formation intensive|Cursus peer-learning/i.test(txt) || /opacity-80|text-sm mt-2/i.test(cls)){
        p.remove();
      }
    });
    return true;
  }

  function run(){
    var ok1 = cleanSidebar();
    // If you ALSO want to remove the top banner tagline, uncomment:
    // var ok2 = cleanTopBanner();
    // return ok1 || ok2;
    return ok1;
  }

  function schedule(){
    setTimeout(run, 0);
    setTimeout(run, 250);
    setTimeout(run, 800);
    setTimeout(run, 1600);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") schedule();
  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("ULYDIA:RENDER", schedule);
  window.addEventListener("ULYDIA:I18N_UPDATE", schedule);

})();
/* ===== END: metier-page.v2026-01-27.FINAL.SPONSOR.TAGLINE.REMOVE.PATCH1.js ===== */


/* ===== BEGIN: metier-page.v2026-01-25.FINAL.FAQ.PATCH1.js ===== */
/* metier-page.v2026-01-25.FINAL.FAQ.PATCH1.js
   ULYDIA — FAQ patch (SAFE)
   Fixes degradation where FAQ items are stored by METIER NAME (e.g. "Contrôleur aérien")
   but BASE filters by URL slug (e.g. "controleur-aerien").

   ✅ Re-filters FAQs using ctx.metier.name (preferred) OR ctx.slug (fallback)
   ✅ Enforces iso/lang only if present on FAQ items
   ✅ Re-renders the FAQ card in-place (doesn't touch other blocks)
*/
(() => {
  if (window.__ULYDIA_FAQ_PATCH1__) return;
  window.__ULYDIA_FAQ_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[faq.patch1]", ...a);

  const norm = (s) => String(s || "").replace(/\u00A0/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
  const lower = (s) => norm(s).toLowerCase();
  const slugify = (s) => lower(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  function pickFirst(...vals){
    for (const v of vals){
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && norm(v) === "") continue;
      return v;
    }
    return "";
  }

  function stripUrlish(s){
    const t = norm(s);
    if (!t) return "";
    return t
      .replace(/^https?:\/\/[^/]+\//i, "")  // remove scheme+host
      .split(/[?#]/)[0]
      .split("|")[0]
      .trim();
  }

  function findFaqCard(){
    // BASE has #faq-title; fallback to any container with data-ul-faqs
    const title = document.getElementById("faq-title");
    const card = title ? (title.closest(".card") || title.closest("section") || title.parentElement) : null;
    if (card) return card;
    const wrap = document.querySelector("[data-ul-faqs]");
    return wrap ? (wrap.closest(".card") || wrap.closest("section") || wrap.parentElement) : null;
  }

  function getFaqWrap(card){
    if (!card) return null;
    return card.querySelector("[data-ul-faqs]") || card.querySelector(".space-y-3") || null;
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function formatInlineBold(s){
    const esc = escapeHtml(String(s || ""));
    return esc
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>");
  }

  function wireToggles(card){
    if (!card) return;
    const items = Array.from(card.querySelectorAll(".faq-item"));
    items.forEach(item => {
      const btn = item.querySelector(".faq-question");
      const ans = item.querySelector(".faq-answer");
      const icon = item.querySelector(".faq-icon");
      if (!btn || !ans) return;

      btn.addEventListener("click", () => {
        const isOpen = !ans.classList.contains("hidden");

        // close others (within this FAQ card only)
        items.forEach(other => {
          if (other === item) return;
          const a2 = other.querySelector(".faq-answer");
          const i2 = other.querySelector(".faq-icon");
          if (a2) a2.classList.add("hidden");
          if (i2) i2.style.transform = "rotate(0deg)";
        });

        if (isOpen) {
          ans.classList.add("hidden");
          if (icon) icon.style.transform = "rotate(0deg)";
        } else {
          ans.classList.remove("hidden");
          if (icon) icon.style.transform = "rotate(180deg)";
        }
      }, { passive: true });
    });
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || null;
  }

  function getMetierName(ctx){
    const m = ctx?.metier || ctx?.payload?.metier || null;
    const f = m ? (m.fieldData || m.fields || m) : {};
    return norm(
      pickFirst(
        f.Nom, f.nom, f.name, f.title,
        m?.name, ctx?.payload?.metier?.name
      )
    );
  }

  function getAllFaqs(ctx){
    // Priority: CMS global, then payload
    const a = window.__ULYDIA_FAQS__;
    if (Array.isArray(a) && a.length) return a;
    const p = ctx?.payload || {};
    const b = p.faq || p.faqs || p.FAQ || p.items || null;
    return Array.isArray(b) ? b : [];
  }

  function faqMatches(item, ctx, targetSlugFromName){
    if (!item) return false;

    const iso = String(ctx?.iso || "").trim().toUpperCase();
    const lang = String(ctx?.lang || "").trim().toLowerCase();

    const iso2 = String(item.iso || item.country_code || item.code_iso || item.country || "").trim().toUpperCase();
    const lang2 = String(item.lang || item.langue || item.language || "").trim().toLowerCase();

    const raw = String(
      item.job_slug || item.metier_slug || item.slug || item.metier || item.job || item.metier_ref || item.name || ""
    ).trim();
    if (!raw) return false;

    const raw2 = stripUrlish(raw);
    const cand = slugify(raw2);

    // Match either:
    // - URL slug (ctx.slug)  OR
    // - slugified metier name (preferred) OR
    // - exact name equality (rare but safe)
    const okJob =
      cand === slugify(ctx.slug) ||
      (targetSlugFromName && cand === targetSlugFromName) ||
      (targetSlugFromName && slugify(raw) === targetSlugFromName) ||
      (norm(raw) && norm(raw) === getMetierName(ctx));

    if (!okJob) return false;

    // Enforce iso/lang only if present in FAQ row
    if (iso2 && iso2 !== iso) return false;
    if (lang2 && lang && lang2 !== lang) return false;

    return true;
  }

  function render(card, list){
    const wrap = getFaqWrap(card);
    if (!wrap) return;

    if (!Array.isArray(list) || list.length === 0) {
      wrap.innerHTML = "";
      card.style.display = "none";
      return;
    }

    card.style.display = "";
    wrap.innerHTML = list.map(item => {
      const q = norm(item.question || item.q || item["Question"] || "") || "—";
      const a = String(item.answer || item.a || item["Réponse"] || item["Reponse"] || "").trim();
      const qSafe = formatInlineBold(q);
      const aHtml = /<[a-z][\s\S]*>/i.test(a) ? a : `<p>${formatInlineBold(a)}</p>`;
      return `
        <div class="faq-item">
          <button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
            <div class="flex items-start gap-3 flex-1">
              <span class="text-xl flex-shrink-0">❓</span>
              <span class="font-semibold text-sm" style="color: var(--text);">${qSafe}</span>
            </div>
            <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
            ${aHtml}
          </div>
        </div>
      `;
    }).join("");

    wireToggles(card);
  }

  function run(ctx){
    const card = findFaqCard();
    if (!card) return;

    const metierName = getMetierName(ctx);
    const targetFromName = metierName ? slugify(metierName) : "";
    const all = getAllFaqs(ctx);
    const filtered = Array.isArray(all) ? all.filter(x => faqMatches(x, ctx, targetFromName)) : [];

    log("ctx", { slug: ctx?.slug, iso: ctx?.iso, lang: ctx?.lang, metierName, targetFromName, total: all.length, matched: filtered.length });
    render(card, filtered);
  }

  function onReady(){
    const ctx = getCtx();
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    // fallback poll (bounded)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = getCtx();
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();

/* ===== END: metier-page.v2026-01-25.FINAL.FAQ.PATCH1.js ===== */


/* ===== BEGIN: metier-page.v2026-01-28.FINAL.FAQ.DEDUPE.PATCH1.js ===== */
/* =========================================================
   ULYDIA — FAQ DEDUPE ONLY (PATCH1)
   - In case FAQ is rendered twice (JS + template), hide duplicates safely.
   ========================================================= */
(function(){
  'use strict';
  if (window.__ULYDIA_FAQ_DEDUPE_PATCH1__) return;
  window.__ULYDIA_FAQ_DEDUPE_PATCH1__ = true;

  function norm(s){ return String(s||'').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim(); }

  function dedupe(){
    var root = document.getElementById('ulydia-metier-root') || document.body;
    if (!root) return;

    var headings = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,div,span'));
    var faqHeads = headings.filter(function(n){
      var t = norm(n.textContent).toLowerCase();
      return t === 'questions fréquentes' ||
             t === 'frequently asked questions' ||
             t === 'häufig gestellte fragen' ||
             t === 'preguntas frecuentes' ||
             t === 'domande frequenti';
    });

    var containers = [];
    faqHeads.forEach(function(h){
      var cur = h;
      for (var k=0;k<7;k++){
        if (!cur || !cur.parentElement) break;
        cur = cur.parentElement;
        if (cur.classList && (cur.classList.contains('card') || cur.classList.contains('u-card') || cur.classList.contains('ul-card'))) {
          containers.push(cur);
          break;
        }
      }
    });

    // fallback by common selectors
    var cand = Array.prototype.slice.call(document.querySelectorAll('[data-ul-section="faq"], .ul-faq, .js-faq, .faq-card, .ul-faq-card'));
    containers = containers.concat(cand);

    // unique
    containers = containers.filter(function(x, idx, arr){ return x && arr.indexOf(x) === idx; });

    if (containers.length <= 1) return;

    var keep = null;
    for (var i=0;i<containers.length;i++){
      if (root.contains(containers[i])) { keep = containers[i]; break; }
    }
    if (!keep) keep = containers[0];

    containers.forEach(function(c){
      if (c === keep) return;
      c.setAttribute('data-ul-faq-duplicate','1');
      c.style.display = 'none';
    });
  }

  var t=null;
  function schedule(){ if (t) clearTimeout(t); t=setTimeout(function(){t=null; dedupe();}, 80); }

  function boot(){
    schedule();
    var started = Date.now();
    var obs = new MutationObserver(function(){
      schedule();
      if (Date.now() - started > 2500) try{ obs.disconnect(); }catch(e){}
    });
    try{ obs.observe(document.body, { childList:true, subtree:true }); }catch(e){}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
/* ===== END: metier-page.v2026-01-28.FINAL.FAQ.DEDUPE.PATCH1.js ===== */


/* ===== BEGIN: metier-page.v2026-01-27.FINAL.RIGHT.HOVER.PATCH1.js ===== */
(function () {
  // ULYDIA — RIGHT COLUMN HOVER EFFECTS (Indicators + Salary)
  // Adds "card-like" hover on the blocks + subtle hover on inner rows/items.

  if (window.__ULYDIA_RIGHT_HOVER_PATCH1__) return;
  window.__ULYDIA_RIGHT_HOVER_PATCH1__ = true;

  function injectStyle() {
    if (document.getElementById("ulydia-right-hover-patch1")) return;

    var css = `
/* =========================
   RIGHT blocks (Injected)
   ========================= */

/* Same feel as .card */
.ul-ind-card[data-ulydia-indicators],
.ul-salary-card[data-ulydia-salary]{
  border-radius: 16px;
  border: 1px solid var(--border, rgba(226,232,240,1));
  box-shadow: var(--shadow-card, 0 4px 20px rgba(0,0,0,.08));
  background: var(--card, #f8fafc);
  transition: transform .3s ease, box-shadow .3s ease, border-color .2s ease;
  will-change: transform, box-shadow;
}

.ul-ind-card[data-ulydia-indicators]:hover,
.ul-salary-card[data-ulydia-salary]:hover{
  box-shadow: 0 8px 30px rgba(0,0,0,.12);
  transform: translateY(-2px);
}

/* Inner items: same feel as .kpi-box hover */
.ul-ind-card .ul-ind-item,
.ul-salary-card .ul-salary-row{
  background: #fff;
  border: 1px solid var(--border, rgba(226,232,240,1));
  border-radius: 12px;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}

.ul-ind-card .ul-ind-item:hover,
.ul-salary-card .ul-salary-row:hover{
  border-color: var(--primary, #6366f1);
  box-shadow: 0 4px 16px rgba(99,102,241,0.15);
  transform: translateY(-1px);
}

/* If salary rows are not wrapped in .ul-salary-row, fallback to hover on top line */
.ul-salary-card .ul-salary-top{
  border-radius: 12px;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.ul-salary-card .ul-salary-top:hover{
  box-shadow: 0 4px 16px rgba(99,102,241,0.12);
  transform: translateY(-1px);
}

/* Optional: avoid ugly focus outlines on click */
.ul-ind-card *:focus,
.ul-salary-card *:focus{
  outline: none;
}
`;

    var style = document.createElement("style");
    style.id = "ulydia-right-hover-patch1";
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  function boot() {
    injectStyle();
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);



})();

/* ===== END: metier-page.v2026-01-27.FINAL.RIGHT.HOVER.PATCH1.js ===== */


/* ===== BEGIN: metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH4.js ===== */
/* metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH4.js
   ULYDIA — NBSP cleanup + LEFT typography (configurable) + currency format + comma line breaks (SAFE)

   What it does:
   ✅ Removes "&nbsp;" in ALL forms (including literal "&nbsp;" and "&amp;nbsp;") from LEFT + RIGHT chips/text blocks
   ✅ LEFT typography:
      - normal text color = window.ULYDIA_LEFT_TEXT_COLOR || "#4B5563" (change here or set global)
      - bold/strong color = "#111827"
   ✅ Currency chip formatting into "EUR (€)", "USD ($)", "GBP (£)"... (writes into #js-chip-currency if present)
   ✅ In 3 RIGHT blocks (Certifications / Schools / Portfolio): converts ", " into ",<br>"
   ✅ Uses MutationObserver so chips re-renders are cleaned automatically

   Place AFTER render patches (LEFT/RIGHT/INDICATORS/SALARY/FAQ).
*/
(() => {
  if (window.__ULYDIA_TEXTCLEAN_STYLE_PATCH4__) return;
  window.__ULYDIA_TEXTCLEAN_STYLE_PATCH4__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[textclean.style.patch4]", ...a);

  const LEFT_COLOR = (window.ULYDIA_LEFT_TEXT_COLOR || "#4B5563").toString().trim(); // ← default: darker gray (recommended)

  const LEFT_IDS = ["js-bf-formation","js-bf-acces","js-bf-marche","js-bf-salaire"];
  const CHIP_WRAP_IDS = [
    "js-skills-wrap","js-softskills-wrap","js-tools-wrap",
    "js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"
  ];
  const COMMA_BREAK_IDS = ["js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"];

  function q(id){ return document.getElementById(id); }

  function ensureStyle(){
    if (document.getElementById("ulydia-left-typography-patch4")) return;
    const css = `
/* LEFT: normal text */
#js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire{
  color: ${LEFT_COLOR} !important;
}
#js-bf-formation strong, #js-bf-acces strong, #js-bf-marche strong, #js-bf-salaire strong,
#js-bf-formation b, #js-bf-acces b, #js-bf-marche b, #js-bf-salaire b{
  color: #111827 !important;
}
/* Rhythm */
#js-bf-formation p, #js-bf-acces p, #js-bf-marche p, #js-bf-salaire p{ margin: 0.35rem 0 !important; }
#js-bf-formation ul, #js-bf-acces ul, #js-bf-marche ul, #js-bf-salaire ul{ margin: 0.35rem 0 0.35rem 1.1rem !important; }
#js-bf-formation li, #js-bf-acces li, #js-bf-marche li, #js-bf-salaire li{ margin: 0.2rem 0 !important; }
    `.trim();
    const st = document.createElement("style");
    st.id = "ulydia-left-typography-patch4";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function cleanStr(s){
    if (!s) return s;
    return String(s)
      .replace(/&amp;nbsp;/gi, " ")
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\s{2,}/g, " ");
  }

  function sanitizeEl(el){
    if (!el) return false;
    const before = el.innerHTML;
    const after = cleanStr(before);
    if (after !== before) el.innerHTML = after;
    let changed = (after !== before);
    try {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        const t0 = node.nodeValue || "";
        const t1 = cleanStr(t0);
        if (t1 !== t0) { node.nodeValue = t1; changed = true; }
      }
    } catch(e){}
    return changed;
  }

  function commaToBreaks(el){
    if (!el) return false;
    if (el.querySelector("ul,ol,li")) return false;
    const before = el.innerHTML || "";
    const after = before.replace(/,\s+/g, ",<br>");
    if (after !== before) { el.innerHTML = after; return true; }
    return false;
  }

  function currencyCodeFromSymbol(sym){
    const s = String(sym || "").trim();
    if (!s) return "";
    if (s === "€") return "EUR";
    if (s === "$") return "USD";
    if (s === "£") return "GBP";
    if (s.toUpperCase() === "CHF") return "CHF";
    if (s.toUpperCase() === "CAD") return "CAD";
    if (s.toUpperCase() === "AUD") return "AUD";
    return "";
  }

  function formatCurrencyDisplay(sym){
    const s = String(sym || "").trim();
    if (!s) return "";
    if (/\b[A-Z]{3}\b/.test(s) && /\(.+\)/.test(s)) return s;
    const code = currencyCodeFromSymbol(s) || (s.length === 3 ? s.toUpperCase() : "");
    if (!code) return s;
    if (["CHF","CAD","AUD"].includes(code)) return code;
    return `${code} (${s})`;
  }

  function setCurrencyDisplay(){
    const b = window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAGE_CTX__?.blocFields || {};
    const iso = (b.iso || window.__ULYDIA_METIER_PAGE_CTX__?.iso || "").toString().toUpperCase();
    let cur = (b.currency || b.Currency || "").toString().trim();
    if (!cur && iso && ["FR","DE","ES","IT","NL","BE","PT","IE","AT","FI","GR","LU","SI","SK","EE","LV","LT","MT","CY"].includes(iso)) cur = "€";
    if (!cur) return false;
    const disp = formatCurrencyDisplay(cur);
    if (!disp) return false;
    const el = q("js-chip-currency");
    if (el) el.textContent = disp;
    try {
      if (window.__ULYDIA_BLOC__) window.__ULYDIA_BLOC__.currency_display = disp;
      if (window.__ULYDIA_METIER_PAGE_CTX__?.blocFields) window.__ULYDIA_METIER_PAGE_CTX__.blocFields.currency_display = disp;
    } catch(e){}
    return true;
  }

  function run(){
    ensureStyle();
    let changed = 0;

    LEFT_IDS.forEach(id => { const el = q(id); if (sanitizeEl(el)) changed++; });
    CHIP_WRAP_IDS.forEach(id => { const el = q(id); if (sanitizeEl(el)) changed++; });
    COMMA_BREAK_IDS.forEach(id => { const el = q(id); if (commaToBreaks(el)) changed++; });

    if (setCurrencyDisplay()) changed++;
    log("run", { changed, LEFT_COLOR });
  }

  function observe(){
    const targets = [];
    [...LEFT_IDS, ...CHIP_WRAP_IDS].forEach(id => { const el = q(id); if (el) targets.push(el); });
    if (!targets.length) return;
    const obs = new MutationObserver(() => {
      if (observe._t) clearTimeout(observe._t);
      observe._t = setTimeout(run, 25);
    });
    targets.forEach(el => obs.observe(el, { childList: true, subtree: true, characterData: true }));
  }

  function onReady(){
    run();
    observe();
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        setTimeout(() => { run(); observe(); }, 30);
        setTimeout(run, 220);
        setTimeout(run, 600);
      });
      return;
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      observe();
      if (tries > 25) clearInterval(t);
    }, 200);
  }

  onReady();
})();

/* ===== END: metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH4.js ===== */


/* ===== BEGIN: metier-page.v2026-01-28.FINAL.SALARY.STICKY.PATCH1.js ===== */
/*! ULYDIA — Salary Sticky Guard — v2026-01-28 PATCH1
   Prevents salary grid from being overwritten by later re-renders that lose numeric ranges.
   - DOM-only (no dependency on internal renderer)
   - Captures "good" salary HTML once numbers are present, and restores if later replaced by a "labels-only" version.
*/
(function(){
  if (window.__ULYDIA_SALARY_STICKY_PATCH1__) return;
  window.__ULYDIA_SALARY_STICKY_PATCH1__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function txt(el){ return norm(el ? el.textContent : ""); }

  // Heuristics
  function looksLikeSalaryValueText(s){
    s = String(s||"");
    // ranges like 35–45K€, 35-45 k€, 45–60K, 60–85K, 5–15%
    return /(\d{2,3}\s*[-–]\s*\d{2,3}\s*[kK]?\s*[€$£]|[€$£]\s*\d{2,3}\s*[-–]\s*\d{2,3}|(\d{1,2}\s*[-–]\s*\d{1,2}\s*%))/.test(s);
  }

  function findSalaryCard(){
    // Try typical Ulydia card structure
    var candidates = Array.prototype.slice.call(document.querySelectorAll(".card, .u-card, .ul-card, [data-ul-card], [data-u-card], section, div"));
    var best = null;
    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      var t = txt(el);
      if (!t) continue;
      // header could be "Grille salariale" or "Salary grid"
      if (/grille salariale|salary grid/i.test(t) && t.length < 4000){
        best = el;
        break;
      }
    }
    if (best) return best;

    // Fallback: header blocks with gradients sometimes have h3/h4
    var heads = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,div,span"))
      .filter(function(n){
        var s = txt(n).toLowerCase();
        return s === "grille salariale (france)" || s === "grille salariale" || s === "salary grid" || s === "salary grid (france)";
      });
    if (heads[0]){
      // climb up to a card-ish container
      var p = heads[0];
      for (var k=0;k<8 && p; k++){
        if (p.classList && (p.classList.contains("card") || p.classList.contains("u-card") || p.classList.contains("ul-card"))) return p;
        p = p.parentElement;
      }
      // if none, take parent
      return heads[0].closest("section,div") || heads[0].parentElement;
    }
    return null;
  }

  function selectBody(card){
    if (!card) return null;
    // Prefer a body container inside the card
    return card.querySelector(".card-body, .u-card-body, .ul-card-body") || card;
  }

  function run(){
    var card = findSalaryCard();
    if (!card) return false;

    var body = selectBody(card);
    if (!body) return false;

    // cache
    var cachedGoodHTML = null;
    var cachedAt = 0;

    function snapshotIfGood(){
      var t = txt(card);
      if (looksLikeSalaryValueText(t)){
        cachedGoodHTML = body.innerHTML;
        cachedAt = Date.now();
        return true;
      }
      return false;
    }

    // initial capture: retry a bit until numbers appear
    var tries = 0;
    var capTimer = setInterval(function(){
      tries++;
      if (snapshotIfGood() || tries >= 40){ // ~8s
        clearInterval(capTimer);
      }
    }, 200);

    // observe changes
    var obs = new MutationObserver(function(){
      if (!cachedGoodHTML) return;
      var tAll = txt(card);
      var hasNumbersNow = looksLikeSalaryValueText(tAll);
      // If we've lost numbers but still have the "experience" labels, it's likely a fallback overwrite
      var hasLabels = /(years of experience|ans d['’]expérience|junior|confirmé|senior|bonus|profit sharing|incentive|part variable)/i.test(tAll);
      if (!hasNumbersNow && hasLabels){
        // restore only if the current body is "simplified" (very short / no currency)
        try {
          body.innerHTML = cachedGoodHTML;
          // small marker
          card.setAttribute("data-ul-salary-restored","1");
        } catch(e){}
      }
    });

    obs.observe(body, {subtree:true, childList:true, characterData:true});

    // Safety: keep observer for a while; salary overwrites happen shortly after load / i18n events
    setTimeout(function(){
      try { obs.disconnect(); } catch(e){}
    }, 25000);

    return true;
  }

  function boot(){
    // run after DOM ready + small delay (renderers often run after)
    if (document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", function(){ setTimeout(run, 350); });
    } else {
      setTimeout(run, 350);
    }
  }

  boot();
})();
/* ===== END: metier-page.v2026-01-28.FINAL.SALARY.STICKY.PATCH1.js ===== */


/* ===== BEGIN: metier-page.v2026-01-28.FINAL.I18N.UI.STABLE.PATCH1.js ===== */
/*! ULYDIA — I18N UI Stable Patch (single patch) */
(function(){
  "use strict";
  if (window.__ULYDIA_I18N_UI_STABLE_PATCH1__) return;
  window.__ULYDIA_I18N_UI_STABLE_PATCH1__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function lang(){
    var l = (window.__ULYDIA_LANG__ || document.documentElement.getAttribute("lang") || "fr").toLowerCase();
    if (l === "fr" || l === "fr-fr") return "fr";
    if (l === "en" || l === "en-us" || l === "en-gb") return "en";
    if (l === "de" || l === "de-de") return "de";
    if (l === "es" || l === "es-es") return "es";
    if (l === "it" || l === "it-it") return "it";
    return l.split("-")[0] || "fr";
  }
  var DEFAULT_DICT = {
    job_sheet: { fr:"Fiche Métier", en:"Job Sheet", de:"Berufsprofil", es:"Ficha de empleo", it:"Scheda lavoro" },
    learn_more:{ fr:"En savoir plus", en:"Learn more", de:"Mehr erfahren", es:"Saber más", it:"Scopri di più" },
    faq:{ fr:"Questions fréquentes", en:"Frequently asked questions", de:"Häufig gestellte Fragen", es:"Preguntas frecuentes", it:"Domande frequenti" },

    partner:{ fr:"Partenaire", en:"Partner", de:"Partner", es:"Socio", it:"Partner" },
    key_indicators:{ fr:"Indicateurs clés", en:"Key indicators", de:"Schlüsselindikatoren", es:"Indicadores clave", it:"Indicatori chiave" },
    salary_grid:{ fr:"Grille salariale (France)", en:"Salary grid (France)", de:"Gehaltsübersicht (Frankreich)", es:"Tabla salarial (Francia)", it:"Griglia salariale (Francia)" },

    must_have_skills:{ fr:"Compétences incontournables", en:"Must-have skills", de:"Unverzichtbare Fähigkeiten", es:"Habilidades imprescindibles", it:"Competenze imprescindibili" },
    soft_skills_essential:{ fr:"Soft skills essentiels", en:"Essential soft skills", de:"Wichtige Soft Skills", es:"Soft skills esenciales", it:"Soft skills essenziali" },
    popular_stack:{ fr:"Stack Technique Populaire", en:"Popular tech stack", de:"Beliebter Tech-Stack", es:"Stack técnico popular", it:"Stack tecnico popolare" },

    useful_certs:{ fr:"Certifications utiles", en:"Useful certifications", de:"Nützliche Zertifikate", es:"Certificaciones útiles", it:"Certificazioni utili" },
    recommended_schools:{ fr:"Écoles & Parcours recommandés", en:"Recommended schools & paths", de:"Empfohlene Schulen & Wege", es:"Escuelas y rutas recomendadas", it:"Scuole e percorsi consigliati" },
    portfolio_projects:{ fr:"Projets Portfolio essentiels", en:"Essential portfolio projects", de:"Wichtige Portfolio-Projekte", es:"Proyectos esenciales de portfolio", it:"Progetti portfolio essenziali" },

    overview:{ fr:"Vue d'ensemble", en:"Overview", de:"Überblick", es:"Panorama", it:"Panoramica" },
    key_responsibilities:{ fr:"Missions principales", en:"Key responsibilities", de:"Hauptaufgaben", es:"Responsabilidades clave", it:"Responsabilità principali" },
    key_skills:{ fr:"Compétences clés", en:"Key skills", de:"Schlüsselkompetenzen", es:"Habilidades clave", it:"Competenze chiave" },
    work_env:{ fr:"Environnements de travail", en:"Work environments", de:"Arbeitsumfelder", es:"Entornos de trabajo", it:"Ambienti di lavoro" },
    education_qualifications:{ fr:"Éducation & qualifications", en:"Education & qualifications", de:"Ausbildung & Qualifikationen", es:"Educación y cualificaciones", it:"Formazione e qualifiche" },
    career_outcomes:{ fr:"Débouchés & premiers rôles", en:"Career outcomes & first roles", de:"Karrierewege & erste Rollen", es:"Salidas y primeros puestos", it:"Sbocchi e primi ruoli" },
    access_reconversion:{ fr:"Accès & reconversion", en:"Access & career change", de:"Zugang & Quereinstieg", es:"Acceso y reconversión", it:"Accesso e riconversione" },

    search_job_placeholder:{ fr:"Rechercher un métier", en:"Search for a job", de:"Beruf suchen", es:"Buscar un empleo", it:"Cerca un lavoro" }
  };
  function t(key){
    var L = lang();
    var dict = window.__ULYDIA_I18N_UI_DICT__ || DEFAULT_DICT;
    var row = dict[key] || {};
    return row[L] || row.en || row.fr || "";
  }
  function mark(el){ try{ el.setAttribute("data-ul-i18n-ui", lang()); }catch(e){} }
  function already(el){ try{ return el && el.getAttribute("data-ul-i18n-ui") === lang(); }catch(e){ return false; } }

  function setTextIf(el, txt){
    if (!el) return false;
    if (already(el)) return false;
    var cur = norm(el.textContent);
    var next = norm(txt);
    if (!next) return false;
    if (cur === next) { mark(el); return false; }
    el.textContent = txt;
    mark(el);
    return true;
  }
  function setPlaceholderIf(el, txt){
    if (!el) return false;
    if (already(el)) return false;
    var cur = norm(el.getAttribute("placeholder"));
    var next = norm(txt);
    if (!next) return false;
    if (cur === next) { mark(el); return false; }
    el.setAttribute("placeholder", txt);
    mark(el);
    return true;
  }

  function translateBadge(root){
    var changed = 0;
    var candidates = root.querySelectorAll("span,div,a,button");
    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      var txt = norm(el.textContent).toLowerCase();
      if (!txt) continue;
      if (txt === "fiche métier" || txt === "job sheet" || txt === "berufsprofil" || txt === "ficha de empleo" || txt === "scheda lavoro") {
        if (setTextIf(el, t("job_sheet"))) changed++;
      }
    }
    return changed;
  }

  function translateTextNodes(root){
    var changed = 0;

    // "En savoir plus" button
    var buttons = root.querySelectorAll("a,button");
    for (var i=0;i<buttons.length;i++){
      var b = buttons[i];
      var bt = norm(b.textContent).toLowerCase();
      if (!bt) continue;
      if (bt === "en savoir plus" || bt === "learn more" || bt === "mehr erfahren" || bt === "saber más" || bt === "scopri di più") {
        if (setTextIf(b, t("learn_more"))) changed++;
      }
    }

    // Titles
    var nodes = root.querySelectorAll("h1,h2,h3,h4,div,span");
    for (var j=0;j<nodes.length;j++){
      var h = nodes[j];
      var ht = norm(h.textContent).toLowerCase();
      if (!ht) continue;

      if (ht === "questions fréquentes" || ht === "frequently asked questions") { if (setTextIf(h, t("faq"))) changed++; continue; }

      if (ht === "partenaire" || ht === "partner") { if (setTextIf(h, t("partner"))) changed++; continue; }
      if (ht === "indicateurs clés" || ht === "key indicators") { if (setTextIf(h, t("key_indicators"))) changed++; continue; }
      if (ht === "grille salariale (france)" || ht === "salary grid (france)" || ht === "salary grid") { if (setTextIf(h, t("salary_grid"))) changed++; continue; }

      if (ht === "compétences incontournables" || ht === "must-have skills") { if (setTextIf(h, t("must_have_skills"))) changed++; continue; }
      if (ht === "soft skills essentiels" || ht === "essential soft skills") { if (setTextIf(h, t("soft_skills_essential"))) changed++; continue; }
      if (ht === "stack technique populaire" || ht === "popular tech stack") { if (setTextIf(h, t("popular_stack"))) changed++; continue; }

      if (ht === "certifications utiles" || ht === "useful certifications") { if (setTextIf(h, t("useful_certs"))) changed++; continue; }
      if (ht === "écoles & parcours recommandés" || ht === "recommended schools & paths") { if (setTextIf(h, t("recommended_schools"))) changed++; continue; }
      if (ht === "projets portfolio essentiels" || ht === "essential portfolio projects") { if (setTextIf(h, t("portfolio_projects"))) changed++; continue; }

      if (ht === "vue d'ensemble" || ht === "overview") { if (setTextIf(h, t("overview"))) changed++; continue; }
      if (ht === "missions principales" || ht === "key responsibilities") { if (setTextIf(h, t("key_responsibilities"))) changed++; continue; }
      if (ht === "compétences clés" || ht === "key skills") { if (setTextIf(h, t("key_skills"))) changed++; continue; }
      if (ht === "environnements de travail" || ht === "work environments") { if (setTextIf(h, t("work_env"))) changed++; continue; }
      if (ht === "éducation & qualifications" || ht === "education & qualifications") { if (setTextIf(h, t("education_qualifications"))) changed++; continue; }
      if (ht === "débouchés & premiers rôles" || ht === "career outcomes & first roles") { if (setTextIf(h, t("career_outcomes"))) changed++; continue; }
      if (ht === "accès & reconversion" || ht === "access & career change") { if (setTextIf(h, t("access_reconversion"))) changed++; continue; }
    }

    var search = root.querySelector('input[type="search"], input[placeholder*="Rechercher"], input[placeholder*="Search"]');
    if (search) { if (setPlaceholderIf(search, t("search_job_placeholder"))) changed++; }

    return changed;
  }

  function applyAll(){
    var root = document.getElementById("ulydia-metier-root") || document.body;
    if (!root) return 0;
    var n = 0;
    n += translateBadge(root);
    n += translateTextNodes(root);
    return n;
  }

  var scheduled = false;
  function scheduleApply(){
    if (scheduled) return;
    scheduled = true;
    setTimeout(function(){
      scheduled = false;
      try{ applyAll(); }catch(e){}
    }, 80);
  }

  function boot(){
    scheduleApply();
    window.addEventListener("ULYDIA:METIER_READY", scheduleApply);
    window.addEventListener("ULYDIA:I18N_UPDATE", scheduleApply);

    var root = document.getElementById("ulydia-metier-root");
    if (root && window.MutationObserver){
      var obs = new MutationObserver(function(muts){
        for (var i=0;i<muts.length;i++){
          if (muts[i].addedNodes && muts[i].addedNodes.length){ scheduleApply(); break; }
        }
      });
      obs.observe(root, { childList:true, subtree:true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* ===== END: metier-page.v2026-01-28.FINAL.I18N.UI.STABLE.PATCH1.js ===== */

/* ===== BEGIN: FINAL PATCH — NBSP + MPB HOVER + RELOCATE + LANG OVERRIDE ===== */
(() => {
  if (window.__ULYDIA_MONO_FINAL_PATCH__) return;
  window.__ULYDIA_MONO_FINAL_PATCH__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[mono.final]", ...a);

  // ---- 1) Optional lang override for testing: ?lang=de|en|fr|es|it
  // Keeps country logic as default; only overrides if explicit lang is provided.
  try{
    const sp = new URLSearchParams(location.search);
    const qLang = (sp.get("lang") || "").trim().toLowerCase();
    const allowed = { fr:1, en:1, de:1, es:1, it:1 };
    if (qLang && allowed[qLang]) {
      window.__ULYDIA_LANG__ = qLang;
      window.dispatchEvent(new Event("ULYDIA:I18N_UPDATE"));
      document.dispatchEvent(new Event("ULYDIA:I18N_UPDATE"));
      log("lang override via ?lang=", qLang);
    }
  }catch(e){}

  // ---- 2) CSS: hover effect for MPB 3 cards + stable rendering
  function ensureCss(){
    if (document.getElementById("ulydia-mono-final-css")) return;
    const css = document.createElement("style");
    css.id = "ulydia-mono-final-css";
    css.textContent = `
      .ulydia-mpb3-card{
        transition: transform 180ms ease, box-shadow 180ms ease;
        will-change: transform;
      }
      .ulydia-mpb3-card:hover{
        transform: scale(1.01);
      }
      /* hard-stable images (avoid giant banner on refresh) */
      .ulydia-sponsor-banner img,
      img[data-ulydia-banner],
      img.ulydia-banner{
        width:100% !important;
        max-width:100% !important;
        height:auto !important;
        object-fit:cover;
      }
    `;
    document.head.appendChild(css);
  }
  ensureCss();

  // ---- 3) NBSP cleanup: remove literal "&nbsp" items and non-breaking spaces
  function cleanTextNode(node){
    try{
      const v = node.nodeValue;
      if (!v) return;
      // remove NBSP unicode
      let nv = v.replace(/\u00A0/g, " ");
      // remove literal "&nbsp" (often introduced by split logic)
      nv = nv.replace(/&nbsp;?/gi, " ");
      // trim-only lines
      if (nv !== v) node.nodeValue = nv;
    }catch(e){}
  }

  function cleanDom(root){
    if (!root) return;
    // text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) cleanTextNode(n);

    // remove list items that are only spaces / &nbsp
    root.querySelectorAll(".ulydia-mpb3-item, li, p, div, span").forEach(el => {
      const t = (el.textContent || "").replace(/\u00A0/g," ").replace(/&nbsp;?/gi," ").trim();
      if (!t) {
        // only remove obvious generated MPB bullets or empty paragraphs
        if (el.classList.contains("ulydia-mpb3-item") || el.tagName === "P") {
          el.remove();
        }
      }
    });
  }

  // ---- 4) MPB relocation: if MPB stack was appended to body/root too early, move it to the right place.
  function relocateMPB(){
    const wrap = document.querySelector('[data-ulydia-mpb3-wrap="1"]');
    if (!wrap) return false;

    // already placed inside main content (not body/root direct)
    const parent = wrap.parentElement;
    const badParent = !parent || parent === document.body || parent.id === "ulydia-metier-root";
    const beforeEnv = window.__ULYDIA_FIND_CARD_BY_TITLE__
      ? window.__ULYDIA_FIND_CARD_BY_TITLE__(["environnements","travail"])
      : null;

    // fallback: find by titles like patch uses
    const findCardByTitleContains = (words) => {
      const cards = Array.from(document.querySelectorAll("section, .ul-card, .ulydia-card, .w-richtext"));
      const lowWords = words.map(w => String(w).toLowerCase());
      for (const c of cards){
        const h = c.querySelector("h1,h2,h3,h4,.ul-card-title,.ul-title,[data-ulydia-i18n]");
        const txt = (h ? h.textContent : c.textContent) || "";
        const l = txt.toLowerCase();
        if (lowWords.every(w => l.includes(w))) return c;
      }
      return null;
    };

    const afterComp = findCardByTitleContains(["compétences","clés"]) || findCardByTitleContains(["competences","cles"]);
    const env = beforeEnv || findCardByTitleContains(["environnements","travail"]) || findCardByTitleContains(["environnement","travail"]);
    if (!afterComp && !env) return false;

    // decide parent container
    const targetParent = (afterComp && afterComp.parentNode) ? afterComp.parentNode : (env && env.parentNode ? env.parentNode : null);
    if (!targetParent) return false;

    // if already in targetParent and positioned before env -> ok
    if (parent === targetParent && env && wrap.nextElementSibling === env) return true;

    try{
      // remove from current spot
      wrap.remove();
      if (env && env.parentNode === targetParent) targetParent.insertBefore(wrap, env);
      else if (afterComp && afterComp.parentNode === targetParent){
        if (afterComp.nextSibling) targetParent.insertBefore(wrap, afterComp.nextSibling);
        else targetParent.appendChild(wrap);
      } else {
        targetParent.appendChild(wrap);
      }
      log("MPB wrap relocated");
      return true;
    }catch(e){
      return false;
    }
  }

  // ---- 5) Run cleaning + relocation with bounded retries (no infinite watchers)
  let tries = 0;
  (function tick(){
    tries++;
    const root = document.getElementById("ulydia-metier-root") || document.body;
    cleanDom(root);
    const moved = relocateMPB();

    if (tries < 20 && !moved){
      setTimeout(tick, 250);
    }
  })();

})();
 /* ===== END: FINAL PATCH ===== */
