/* metier-page.v2026-01-29.FINAL.SIDE.TAGGER.PATCH1.js */
(function(){
  'use strict';
  if (window.__ULYDIA_SIDE_TAGGER_PATCH1__) return;
  window.__ULYDIA_SIDE_TAGGER_PATCH1__ = true;

  var ROOT_ID = 'ulydia-metier-root';

  function norm(s){
    return String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  // ⚠️ Liste stricte de titres de cards "droite"
  var RIGHT_TITLES = [
    'partenaire',
    'partner',
    'indicateurs clés',
    'key indicators',
    'rémunération',
    'salary',
    'outils',
    'tools',
    'certifications',
    'certifications & diplômes'
  ].map(norm);

  function getCardTitle(card){
    var h = card.querySelector('.u-card-title,.card-title,h2,h3,[data-title]');
    return norm(h ? h.textContent : '');
  }

  function tag(){
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    // On ne tag que des “cards/sections”
    var cards = root.querySelectorAll('.u-card,.section-card,.card,section,article,div');
    for (var i=0;i<cards.length;i++){
      var el = cards[i];
      if (!el || el.getAttribute('data-ulydia-side')) continue;

      // Heuristique STRICTE : uniquement si le titre match
      var t = getCardTitle(el);
      if (!t) continue;

      for (var j=0;j<RIGHT_TITLES.length;j++){
        if (t === RIGHT_TITLES[j]) {
          el.setAttribute('data-ulydia-side', 'right');
          break;
        }
      }
    }

    // Si l’API layout est là, on peut forcer un re-rangement 1 fois
    var api = window.__ULYDIA_LAYOUT__;
    if (api && api.left && api.right) {
      // Re-move uniquement les éléments taggés right qui seraient restés à gauche
      var rightNodes = root.querySelectorAll('[data-ulydia-side="right"]');
      for (var k=0;k<rightNodes.length;k++){
        var n = rightNodes[k];
        if (n && n.parentElement !== api.right && n.classList && !n.classList.contains('ul-2col-wrap')){
          api.right.appendChild(n);
        }
      }
    }
  }

  // Run after render wave
  setTimeout(tag, 250);
  setTimeout(tag, 900);
})();
