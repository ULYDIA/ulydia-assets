(function(){
  // ULYDIA — I18N UI STABLE — PATCH2
  // - Translates ONLY structural UI strings (titles/buttons/placeholders)
  // - Throttled MutationObserver (no loop)
  // - Works with ulydia-i18n.v1.3.js (expects window.ULYDIA_I18N.t)

  if (window.__ULYDIA_I18N_UI_STABLE_PATCH2__) return;
  window.__ULYDIA_I18N_UI_STABLE_PATCH2__ = true;

  function getLang(){
    return (window.__ULYDIA_LANG__ || window.ULYDIA_LANG || "").toLowerCase() || "fr";
  }

  function t(key){
    try{
      if (window.ULYDIA_I18N && typeof window.ULYDIA_I18N.t === "function"){
        return window.ULYDIA_I18N.t(key, getLang()) || "";
      }
    }catch(e){}
    return "";
  }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function setTextIf(el, val){
    if (!el) return false;
    val = norm(val);
    if (!val) return false;
    var cur = norm(el.textContent);
    if (cur === val) return false;
    el.textContent = val;
    return true;
  }

  function setPlaceholderIf(el, val){
    if (!el) return false;
    val = String(val||"").trim();
    if (!val) return false;
    var cur = String(el.getAttribute("placeholder")||"").trim();
    if (cur === val) return false;
    el.setAttribute("placeholder", val);
    return true;
  }

  function translateBadge(root){
    // Badge "Fiche métier" / "Job description"
    var badge = root.querySelector("[data-ul-metier-badge], .ul-metierBadge, .js-metier-badge, .badge-metier");
    if (!badge) return 0;
    var changed = 0;
    var txt = norm(badge.textContent).toLowerCase();
    if (txt === "fiche métier" || txt === "job description"){
      if (setTextIf(badge, t("badge_job_description"))) changed++;
    }
    return changed;
  }

  // Map of exact UI strings -> i18n keys
  // NOTE: keys must exist in ulydia-i18n.v1.3.js
  var EXACT = [
    // Main sections (left)
    ["vue d'ensemble", "overview"],
    ["overview", "overview"],
    ["missions principales", "key_responsibilities"],
    ["key responsibilities", "key_responsibilities"],
    ["compétences clés", "key_skills"],
    ["key skills", "key_skills"],
    ["environnements de travail", "work_environments"],
    ["work environments", "work_environments"],
    ["questions fréquentes", "faq_title"],
    ["frequently asked questions", "faq_title"],

    // Right column
    ["partenaire", "partner"],
    ["partner", "partner"],
    ["indicateurs clés", "key_indicators"],
    ["key indicators", "key_indicators"],
    ["grille salariale", "salary_grid"],
    ["salary grid", "salary_grid"],
    ["compétences incontournables", "must_have_skills"],
    ["must-have skills", "must_have_skills"],
    ["soft skills essentielles", "essential_soft_skills"],
    ["essential soft skills", "essential_soft_skills"],
    ["stack technique populaire", "popular_tech_stack"],
    ["popular tech stack", "popular_tech_stack"],
    ["certifications utiles", "useful_certifications"],
    ["useful certifications", "useful_certifications"],
    ["écoles & parcours recommandés", "recommended_schools_paths"],
    ["schools & recommended paths", "recommended_schools_paths"],
    ["projets portfolio essentiels", "essential_portfolio_projects"],
    ["essential portfolio projects", "essential_portfolio_projects"],

    // Buttons / actions
    ["en savoir plus", "learn_more"],
    ["learn more", "learn_more"],
    ["réinitialiser les filtres", "reset_filters"],
    ["reset filters", "reset_filters"]
  ];

  function translateExactText(el){
    var txt = norm(el.textContent);
    if (!txt) return 0;
    var low = txt.toLowerCase();

    for (var i=0;i<EXACT.length;i++){
      if (low === EXACT[i][0]){
        return setTextIf(el, t(EXACT[i][1])) ? 1 : 0;
      }
    }
    return 0;
  }

  function translateTextNodes(root){
    var changed = 0;

    // 1) Translate headings in cards/sections
    var headers = root.querySelectorAll("h1,h2,h3,h4,.card h3,.card h4,.ul-cardTitle,.ul-sectionTitle,[data-i18n-ui]");
    headers.forEach(function(h){ changed += translateExactText(h); });

    // 2) Translate buttons/links
    var btns = root.querySelectorAll("a.w-button, button, .btn, [role='button']");
    btns.forEach(function(b){ changed += translateExactText(b); });

    // 3) Translate "Pays / Région", "Secteur d’activité", etc. (top filters)
    var labels = root.querySelectorAll("label, .w-form-label, .ul-filterLabel, .ul-label");
    labels.forEach(function(l){
      var low = norm(l.textContent).toLowerCase();
      if (low === "pays / région" || low === "country / region"){ if (setTextIf(l, t("country_region"))) changed++; }
      if (low === "secteur d’activité" || low === "activity sector"){ if (setTextIf(l, t("activity_sector"))) changed++; }
      if (low === "rechercher un métier" || low === "search a job"){ if (setTextIf(l, t("search_job"))) changed++; }
    });

    // 4) Search placeholder (if present)
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