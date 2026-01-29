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