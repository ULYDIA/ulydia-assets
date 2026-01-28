(function(){
  "use strict";
  // =========================================================
  // ULYDIA — I18N TEXT-ONLY PATCH1 (NO FLICKER)
  // 2026-01-28
  //
  // Goals:
  // - Stop FR<->EN flicker by translating text ONLY (no DOM rebuild)
  // - Apply once per language, and only update newly inserted nodes
  // - Covers:
  //   - Top badge "Fiche métier" (metier_sheet)
  //   - Base section titles (overview/missions/key_skills/environments/career_evolution/faq)
  //   - Right column headers + salary labels + indicators labels
  //
  // Load order:
  // - After ALL render patches (BASE/LEFT/RIGHT/MPB/FAQ/etc.)
  // - After ulydia-i18n.v1.3.js
  //
  // Triggers:
  // - DOMContentLoaded + short MutationObserver window
  // - ULYDIA:I18N_UPDATE (debounced)
  // =========================================================

  if (window.__ULYDIA_I18N_TEXTONLY_PATCH1__) return;
  window.__ULYDIA_I18N_TEXTONLY_PATCH1__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) console.log.apply(console, ["[i18n.textonly]"].concat([].slice.call(arguments))); }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function getLang(){
    var l = (window.__ULYDIA_LANG__ || document.documentElement.lang || "fr").toLowerCase();
    if (!/^(fr|en|de|es|it)$/.test(l)) l = "fr";
    return l;
  }

  function t(key, fallback){
    try {
      if (typeof window.__t__ === "function"){
        var v = window.__t__(key);
        if (v) return v;
      }
    } catch(e){}
    return fallback || key;
  }

  // Right-column label dictionary (not all are in core i18n)
  var R = {
    fr: {
      salary_header: "💰 Grille salariale",
      junior: "🧳 Junior",
      mid: "🚀 Confirmé",
      senior: "⭐ Senior",
      variable: "📌 Part variable",
      exp_0_2: "0–2 ans d’expérience",
      exp_3_5: "3–5 ans d’expérience",
      exp_5p: "5+ ans d’expérience",
      bonus: "Bonus, intéressement, participation",

      ind_header: "📊 Indicateurs clés",
      remote: "Télétravail",
      automation: "Risque d'automatisation",
      currency: "Devise",
      employability: "Délai d'employabilité",
      growth: "Croissance du marché",
      demand: "Demande du marché"
    },
    en: {
      salary_header: "💰 Salary grid",
      junior: "🧳 Junior",
      mid: "🚀 Mid-level",
      senior: "⭐ Senior",
      variable: "📌 Variable pay",
      exp_0_2: "0–2 years of experience",
      exp_3_5: "3–5 years of experience",
      exp_5p: "5+ years of experience",
      bonus: "Bonus, profit sharing, incentive",

      ind_header: "📊 Key indicators",
      remote: "Remote work",
      automation: "Automation risk",
      currency: "Currency",
      employability: "Time to employability",
      growth: "Market growth",
      demand: "Market demand"
    },
    de: {
      salary_header: "💰 Gehaltsspanne",
      junior: "🧳 Junior",
      mid: "🚀 Erfahren",
      senior: "⭐ Senior",
      variable: "📌 Variable Vergütung",
      exp_0_2: "0–2 Jahre Berufserfahrung",
      exp_3_5: "3–5 Jahre Berufserfahrung",
      exp_5p: "5+ Jahre Berufserfahrung",
      bonus: "Bonus, Gewinnbeteiligung, Prämien",

      ind_header: "📊 Kennzahlen",
      remote: "Remote-Arbeit",
      automation: "Automatisierungsrisiko",
      currency: "Währung",
      employability: "Zeit bis zur Beschäftigungsfähigkeit",
      growth: "Marktwachstum",
      demand: "Marktnachfrage"
    },
    es: {
      salary_header: "💰 Banda salarial",
      junior: "🧳 Junior",
      mid: "🚀 Intermedio",
      senior: "⭐ Senior",
      variable: "📌 Variable",
      exp_0_2: "0–2 años de experiencia",
      exp_3_5: "3–5 años de experiencia",
      exp_5p: "5+ años de experiencia",
      bonus: "Bonus, participación, incentivos",

      ind_header: "📊 Indicadores clave",
      remote: "Teletrabajo",
      automation: "Riesgo de automatización",
      currency: "Moneda",
      employability: "Tiempo hasta la empleabilidad",
      growth: "Crecimiento del mercado",
      demand: "Demanda del mercado"
    },
    it: {
      salary_header: "💰 Fascia salariale",
      junior: "🧳 Junior",
      mid: "🚀 Intermedio",
      senior: "⭐ Senior",
      variable: "📌 Variabile",
      exp_0_2: "0–2 anni di esperienza",
      exp_3_5: "3–5 anni di esperienza",
      exp_5p: "5+ anni di esperienza",
      bonus: "Bonus, premi, partecipazione",

      ind_header: "📊 Indicatori chiave",
      remote: "Telelavoro",
      automation: "Rischio di automazione",
      currency: "Valuta",
      employability: "Tempo all’occupabilità",
      growth: "Crescita del mercato",
      demand: "Domanda di mercato"
    }
  };

  function setTextSafe(el, text, key){
    if (!el || !text) return false;
    var lang = getLang();
    if (el.dataset && el.dataset.ulI18nApplied === lang && (!key || el.dataset.ulI18nKey === key)) return false;

    // Preserve leading emoji if present in current text and the new text doesn't start with emoji
    var cur = norm(el.textContent);
    var emojiPrefix = "";
    if (cur && /^[^\w\s]{1,3}\s/.test(cur)) { // rough emoji/symbol prefix
      emojiPrefix = cur.split(" ")[0] + " ";
    }
    var next = text;
    if (emojiPrefix && next && !/^[^\w\s]{1,3}\s/.test(next)) next = emojiPrefix + next;

    el.textContent = next;

    if (el.dataset){
      el.dataset.ulI18nApplied = lang;
      if (key) el.dataset.ulI18nKey = key;
    }
    return true;
  }

  // Section titles by ID (present in BASE)
  var TITLE_MAP = [
    { id: "overview-title", key: "overview", fb: "Vue d’ensemble" },
    { id: "description-title", key: "overview", fb: "Vue d’ensemble" }, // compat
    { id: "missions-title", key: "missions", fb: "Missions principales" },
    { id: "skills-title", key: "key_skills", fb: "Compétences clés" },
    { id: "competences-title", key: "key_skills", fb: "Compétences clés" }, // compat
    { id: "environnements-title", key: "environments", fb: "Environnements de travail" },
    { id: "work-env-title", key: "environments", fb: "Environnements de travail" }, // compat
    { id: "evolution-title", key: "career_evolution", fb: "Évolution & qualifications" },
    { id: "evolutions-title", key: "career_evolution", fb: "Évolution & qualifications" }, // compat
    { id: "faq-title", key: "faq", fb: "Questions fréquentes" }
  ];

  function applySectionTitles(){
    for (var i=0;i<TITLE_MAP.length;i++){
      var m = TITLE_MAP[i];
      var el = document.getElementById(m.id);
      if (!el) continue;

      // If title contains an SVG/icon, keep it
      var svg = el.querySelector && el.querySelector("svg");
      var label = t(m.key, m.fb);

      if (svg){
        // Wrap the text in a span after svg (idempotent)
        var span = el.querySelector("span[data-ul-title-text='1']");
        if (!span){
          span = document.createElement("span");
          span.setAttribute("data-ul-title-text","1");
          // Remove stray text nodes but keep svg + other elements
          // (safe approach: clear and rebuild)
          var keep = [];
          for (var k=0;k<el.childNodes.length;k++){
            var n = el.childNodes[k];
            if (n.nodeType === 1) keep.push(n);
          }
          el.innerHTML = "";
          for (var j=0;j<keep.length;j++) el.appendChild(keep[j]);
          el.appendChild(span);
        }
        setTextSafe(span, label, m.key);
      } else {
        setTextSafe(el, label, m.key);
      }
    }
  }

  function applyBadge(){
    // Use core key
    var label = t("metier_sheet", "Fiche métier");
    var lang = getLang();

    // Find pill/badge near top: try exact text matches in any language, or data-i18n if present
    var badge = document.querySelector("[data-i18n='metier_sheet']");
    if (!badge){
      var needles = [
        "fiche métier","fiche metier","job profile","berufsprofil","ficha del puesto","ficha de empleo","scheda professione"
      ];
      var nodes = Array.prototype.slice.call(document.querySelectorAll("span,div,a"));
      for (var i=0;i<nodes.length;i++){
        var n = nodes[i];
        var txt = norm(n.textContent).toLowerCase();
        if (!txt) continue;
        if (needles.indexOf(txt) >= 0){
          badge = n; break;
        }
      }
    }
    if (!badge) return;

    if (badge.dataset && badge.dataset.ulI18nApplied === lang && badge.dataset.ulI18nKey === "metier_sheet") return;

    // If badge contains nested spans (icon + text), target the deepest text span if possible
    var target = badge;
    var inner = badge.querySelector && badge.querySelector("span");
    if (inner && norm(inner.textContent)) target = inner;

    setTextSafe(target, label, "metier_sheet");
  }

  function applyRightColumnLabels(){
    var lang = getLang();
    var d = R[lang] || R.fr;

    // Headers: Key indicators / Salary grid
    // Look for headings inside cards
    var headings = Array.prototype.slice.call(document.querySelectorAll("h2,h3,h4,div"));
    for (var i=0;i<headings.length;i++){
      var el = headings[i];
      var txt = norm(el.textContent);

      if (!txt || txt.length > 60) continue;

      // salary header
      if (/grille salariale|salary grid|gehaltsspanne|banda salarial|fascia salariale/i.test(txt)){
        setTextSafe(el, d.salary_header, "salary_header");
      }
      // indicators header
      if (/indicateurs clés|key indicators|kennzahlen|indicadores clave|indicatori chiave/i.test(txt)){
        setTextSafe(el, d.ind_header, "ind_header");
      }
    }

    // Salary rows labels
    var mapExact = [
      ["🧳 Junior", d.junior, "junior"],
      ["🚀 Confirmé", d.mid, "mid"],
      ["🚀 Mid-level", d.mid, "mid"],
      ["⭐ Senior", d.senior, "senior"],
      ["📌 Part variable", d.variable, "variable"],
      ["📌 Variable pay", d.variable, "variable"]
    ];

    var spans = Array.prototype.slice.call(document.querySelectorAll("span,div,li"));
    for (var s=0;s<spans.length;s++){
      var n = spans[s];
      var raw = norm(n.textContent);
      if (!raw || raw.length > 80) continue;

      // experience lines
      if (/0–2|0-2/.test(raw) && /exp/i.test(raw) || /0–2 ans|0–2 years|0–2 jahre|0–2 años|0–2 anni/i.test(raw)){
        setTextSafe(n, d.exp_0_2, "exp_0_2");
      } else if (/3–5|3-5/.test(raw) && (/exp/i.test(raw) || /ans|years|jahre|años|anni/i.test(raw))){
        setTextSafe(n, d.exp_3_5, "exp_3_5");
      } else if (/5\+/.test(raw) && (/exp/i.test(raw) || /ans|years|jahre|años|anni/i.test(raw))){
        setTextSafe(n, d.exp_5p, "exp_5p");
      } else if (/bonus/i.test(raw) || /intéressement|participation|profit sharing|gewinnbeteiligung|incentiv|premi|participación/i.test(raw)){
        // avoid overwriting salary numbers line; only if the line looks like the bonus label
        if (raw.length < 55) setTextSafe(n, d.bonus, "bonus");
      }

      // exact mappings for junior/mid/senior/variable
      for (var j=0;j<mapExact.length;j++){
        var from = mapExact[j][0];
        if (raw === from){
          setTextSafe(n, mapExact[j][1], mapExact[j][2]);
          break;
        }
      }

      // indicators labels
      if (/^télétravail$|^remote work$|^remote-arbeit$|^teletrabajo$|^telelavoro$/i.test(raw)) setTextSafe(n, d.remote, "remote");
      if (/risque d'automatisation|automation risk|automatisierungsrisiko|riesgo de automatización|rischio di automazione/i.test(raw)) setTextSafe(n, d.automation, "automation");
      if (/^devise$|^currency$|^währung$|^moneda$|^valuta$/i.test(raw)) setTextSafe(n, d.currency, "currency");
      if (/employabilité|employability|beschäftigungsfähigkeit|empleabilidad|occupabilità/i.test(raw)) setTextSafe(n, d.employability, "employability");
      if (/croissance du marché|market growth|marktwachstum|crecimiento del mercado|crescita del mercato/i.test(raw)) setTextSafe(n, d.growth, "growth");
      if (/demande du marché|market demand|marktnachfrage|demanda del mercado|domanda di mercato/i.test(raw)) setTextSafe(n, d.demand, "demand");
    }
  }

  function applyAll(){
    applySectionTitles();
    applyBadge();
    applyRightColumnLabels();
  }

  // Debounced triggers
  var timer = null;
  function trigger(reason){
    if (timer) clearTimeout(timer);
    timer = setTimeout(function(){
      timer = null;
      applyAll();
      log("applied", reason, "lang=", getLang());
    }, 80);
  }

  // Observe late insertions briefly (no infinite loops)
  function bootObserver(){
    var start = Date.now();
    var obs = new MutationObserver(function(){
      // only react within 2.5s after start to avoid endless rewrites
      if ((Date.now() - start) > 2500){
        try { obs.disconnect(); } catch(e){}
        return;
      }
      trigger("mutation");
    });
    obs.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(function(){ try { obs.disconnect(); } catch(e){} }, 2800);
  }

  function boot(){
    trigger("boot");
    bootObserver();
  }

  if (document.readyState === "complete" || document.readyState === "interactive"){
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }

  window.addEventListener("ULYDIA:I18N_UPDATE", function(){ trigger("I18N_UPDATE"); });

})();