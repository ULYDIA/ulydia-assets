(function(){
  // ULYDIA — Render ALL Metier_pays_Bloc unused fields (LEFT column)
  // Safe DOM-based reader for .js-bf-* fields
  if (window.__ULYDIA_MPB_RENDER_ALL__) return;
  window.__ULYDIA_MPB_RENDER_ALL__ = true;

  function getText(sel){
    var el = document.querySelector(sel);
    if (!el) return '';
    var t = (el.textContent || '').trim();
    return t;
  }

  function card(title, body){
    var wrap = document.createElement('div');
    wrap.className = 'ul-card';
    wrap.style.marginBottom = '16px';
    wrap.innerHTML = '<div class="ul-card-header">'+title+'</div>' +
                     '<div class="ul-card-body">'+body+'</div>';
    return wrap;
  }

  var leftCol = document.querySelector('.ul-col-left') || document.querySelector('[data-col="left"]');
  if (!leftCol) return;

  var fields = [
    ['🎓 Accès & Formation','js-bf-formation'],
    ['🧭 Accès au métier','js-bf-acces'],
    ['🔁 Passerelles & reconversion','js-bf-equivalences_reconversion'],
    ['🗺️ Parcours possibles','js-bf-entry_routes'],
    ['🏫 Écoles & parcours','js-bf-schools_or_paths'],
    ['📚 Niveaux requis','js-bf-education_level_local'],
    ['🧾 Certifications','js-bf-certifications'],
    ['🧰 Outils & stack','js-bf-tools_stack'],
    ['🚀 Premiers postes','js-bf-first_job_titles'],
    ['🏢 Employeurs types','js-bf-typical_employers'],
    ['📈 Croissance & marché','js-bf-growth_outlook'],
    ['💼 Projets attendus','js-bf-portfolio_projects'],
    ['⏱️ Délai d’employabilité','js-bf-time_to_employability'],
    ['💰 Notes salariales','js-bf-salary_notes']
  ];

  fields.forEach(function(f){
    var txt = getText('.'+f[1]);
    if (!txt) return;
    leftCol.appendChild(card(f[0], txt));
  });
})();