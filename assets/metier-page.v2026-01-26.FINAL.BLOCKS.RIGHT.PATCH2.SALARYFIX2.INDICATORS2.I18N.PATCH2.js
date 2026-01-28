(function(){
  // =========================================================
  // ULYDIA — RIGHT COLUMN I18N PATCH2 (robust)
  // Works with:
  // - metier-page.v2026-01-26.FINAL.BLOCKS.RIGHT.PATCH2.SALARYFIX2.INDICATORS2.js
  //
  // Robust against late (re)injection: uses retry + MutationObserver
  // and listens to ULYDIA:I18N_UPDATE
  // =========================================================

  if (window.__ULYDIA_RIGHT_I18N_PATCH2__) return;
  window.__ULYDIA_RIGHT_I18N_PATCH2__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function getLang(){
    var l = (window.__ULYDIA_LANG__ || "").toLowerCase().trim();
    if (!/^(fr|en|de|es|it)$/.test(l)) return "fr";
    return l;
  }

  var D = {
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
      bonus: "Bonus, Gewinnbeteiligung, Prämie",

      ind_header: "📊 Kennzahlen",
      remote: "Remote-Arbeit",
      automation: "Automatisierungsrisiko",
      currency: "Währung",
      employability: "Zeit bis zur Beschäftigungsfähigkeit",
      growth: "Marktwachstum",
      demand: "Marktnachfrage"
    },
    es: {
      salary_header: "💰 Rango salarial",
      junior: "🧳 Junior",
      mid: "🚀 Intermedio",
      senior: "⭐ Senior",
      variable: "📌 Variable",
      exp_0_2: "0–2 años de experiencia",
      exp_3_5: "3–5 años de experiencia",
      exp_5p: "5+ años de experiencia",
      bonus: "Bono, participación, incentivos",

      ind_header: "📊 Indicadores clave",
      remote: "Teletrabajo",
      automation: "Riesgo de automatización",
      currency: "Divisa",
      employability: "Tiempo hasta empleabilidad",
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
      remote: "Lavoro da remoto",
      automation: "Rischio di automazione",
      currency: "Valuta",
      employability: "Tempo all'occupabilità",
      growth: "Crescita del mercato",
      demand: "Domanda di mercato"
    }
  };

  function setText(el, txt){
    if (!el || !txt) return;
    if (norm(el.textContent) === norm(txt)) return;
    el.textContent = txt;
  }

  function patchSalary(lang){
    var t = D[lang] || D.fr;
    var card = document.querySelector(".ul-salary-card[data-ulydia-salary]");
    if (!card) return false;

    // Header: keep "(France)" or "(...)" if present
    var h = card.querySelector(".ul-salary-header");
    if (h){
      var raw = norm(h.textContent);
      var m = raw.match(/\(([^)]+)\)\s*$/);
      var suffix = m ? (" (" + m[1] + ")") : "";
      setText(h, t.salary_header + suffix);
    }

    // Row labels
    var tops = Array.prototype.slice.call(card.querySelectorAll(".ul-salary-top"));
    tops.forEach(function(top){
      var spans = top.querySelectorAll("span");
      if (!spans || spans.length < 1) return;
      var left = spans[0];
      var s = norm(left.textContent);
      if (s.indexOf("🧳") === 0) setText(left, t.junior);
      else if (s.indexOf("🚀") === 0) setText(left, t.mid);
      else if (s.indexOf("⭐") === 0) setText(left, t.senior);
      else if (s.indexOf("📌") === 0) setText(left, t.variable);
    });

    // Sublabels
    var subs = Array.prototype.slice.call(card.querySelectorAll(".ul-salary-sub"));
    subs.forEach(function(sub){
      var s = norm(sub.textContent);
      if (/^0\s*[–-]\s*2/.test(s)) setText(sub, t.exp_0_2);
      else if (/^3\s*[–-]\s*5/.test(s)) setText(sub, t.exp_3_5);
      else if (/^5\+/.test(s) || /^5\s*\+/.test(s)) setText(sub, t.exp_5p);
      else if (/bonus|int[eé]ressement|participation|profit|incentiv|pr[eé]mie|premi|partecip|participaci/i.test(s)) setText(sub, t.bonus);
    });

    return true;
  }

  function patchIndicators(lang){
    var t = D[lang] || D.fr;
    var card = document.querySelector(".ul-ind-card[data-ulydia-indicators]");
    if (!card) return false;

    var h = card.querySelector(".ul-ind-header");
    if (h) setText(h, t.ind_header);

    var items = Array.prototype.slice.call(card.querySelectorAll(".ul-ind-item"));
    items.forEach(function(it){
      var k = it.querySelector(".ul-ind-k");
      if (!k) return;
      var icon = norm((it.querySelector(".ul-ind-icon")||{}).textContent);

      if (icon === "🏠") setText(k, t.remote);
      else if (icon === "🤖") setText(k, t.automation);
      else if (icon === "💰") setText(k, t.currency);
      else if (icon === "⏱️" || icon === "⏱") setText(k, t.employability);
      else if (icon === "📈") setText(k, t.growth);
      else if (icon === "🔥") setText(k, t.demand);
    });

    return true;
  }

  function apply(){
    var lang = getLang();
    var a = patchIndicators(lang);
    var b = patchSalary(lang);
    return (a || b);
  }

  // Long retry (covers late inject after other patches)
  function retry(){
    var n = 0;
    (function loop(){
      n++;
      apply();
      if (n < 120) setTimeout(loop, 200); // ~24s
    })();
  }

  // MutationObserver: if right blocks are re-injected, re-apply translation
  function observe(){
    try{
      var mo = new MutationObserver(function(muts){
        for (var i=0;i<muts.length;i++){
          var m = muts[i];
          if (!m.addedNodes) continue;
          for (var j=0;j<m.addedNodes.length;j++){
            var node = m.addedNodes[j];
            if (!node || node.nodeType !== 1) continue;
            var cls = String(node.className||"");
            if (cls.indexOf("ul-salary")>=0 || cls.indexOf("ul-ind-")>=0 || node.querySelector && (node.querySelector(".ul-salary-card[data-ulydia-salary]") || node.querySelector(".ul-ind-card[data-ulydia-indicators]"))){
              apply();
              return;
            }
          }
        }
      });
      mo.observe(document.documentElement, {subtree:true, childList:true});
    }catch(e){}
  }

  function boot(){ apply(); retry(); observe(); }
  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
  window.addEventListener("ULYDIA:I18N_UPDATE", apply);

})();