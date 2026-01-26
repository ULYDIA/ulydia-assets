(function(){
  if (!window.__ULYDIA_BLOC__) return;
  var d = window.__ULYDIA_BLOC__;

  function card(title, html, color){
    if(!html) return '';
    return `
    <div class="ul-card" style="border-left:6px solid ${color}">
      <div class="ul-card-title">${title}</div>
      <div class="ul-card-body">${html}</div>
    </div>`;
  }

  var html = '';
  html += card("🎓 Formations & niveaux requis", d.education_level_local || d.education_level, "#60a5fa");
  html += card("🧭 Parcours & passerelles", d.entry_routes || d.equivalences_reconversion, "#34d399");
  html += card("🏫 Écoles & formations", d.schools_or_paths, "#a78bfa");
  html += card("🧰 Outils & stack", d.tools_stack, "#fbbf24");
  html += card("🧾 Certifications utiles", d.certifications, "#fb7185");
  html += card("🏢 Employeurs types", d.typical_employers || d.hiring_sectors, "#22d3ee");
  html += card("🚀 Débouchés & premiers postes", d.first_job_titles, "#4ade80");
  html += card("📈 Perspectives & croissance", d.growth_outlook, "#f97316");

  if(!html) return;

  var anchor = document.querySelector('.js-left-extra-anchor') 
    || document.querySelector('.js-bloc-access')
    || document.querySelector('.js-bloc-formation');

  if(!anchor) return;

  var wrap = document.createElement('div');
  wrap.className = 'ul-mpb-extra';
  wrap.innerHTML = html;

  anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
})();