/* =========================================================
   ULYDIA — MPB ThreeBlocks LEFT — PATCH3 (STYLE FIX)
   - Aligne la taille/gras/line-height des titres:
     "Niveau d’études & diplômes" + "Débouchés & premiers postes"
     sur le style des autres cards (ex: "Écoles & Parcours recommandés")
   - Supprime les NBSP (&nbsp; / \u00A0) dans ces blocs
   - Force font-family: inherit sur ces cards
   - ZERO watcher, ZERO mutation observer, exécution légère
========================================================= */
(function () {
  if (window.__ULYDIA_MPB_THREEBLOCKS_PATCH3__) return;
  window.__ULYDIA_MPB_THREEBLOCKS_PATCH3__ = true;

  function norm(s) {
    return String(s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findTitleElementByText(re) {
    var nodes = document.querySelectorAll("h1,h2,h3,h4,.card-title,.u-card-title,.u-section-title,div,span");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = norm(el.textContent);
      if (!t) continue;
      if (re.test(t)) return el;
    }
    return null;
  }

  function findCardRootFromTitle(titleEl) {
    if (!titleEl) return null;
    // Remonte jusqu’à une card plausible
    var el = titleEl;
    for (var i = 0; i < 8 && el; i++) {
      if (el.classList && (el.classList.contains("u-card") || el.classList.contains("card"))) return el;
      // heuristique : wrapper avec border-radius / shadow
      var cs = window.getComputedStyle(el);
      if (cs && cs.borderRadius && cs.borderRadius !== "0px" && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
        // souvent la "card"
        return el;
      }
      el = el.parentElement;
    }
    // fallback: parent direct
    return titleEl.parentElement || null;
  }

  function applyTitleStyleFromReference(refTitleEl, targetTitleEl) {
    if (!refTitleEl || !targetTitleEl) return;
    var cs = window.getComputedStyle(refTitleEl);

    // Copie du style typographique de référence
    targetTitleEl.style.fontSize = cs.fontSize;
    targetTitleEl.style.fontWeight = cs.fontWeight;
    targetTitleEl.style.lineHeight = cs.lineHeight;
    targetTitleEl.style.letterSpacing = cs.letterSpacing;
    targetTitleEl.style.fontFamily = "inherit";
    targetTitleEl.style.margin = cs.margin; // souvent géré, mais safe
    // couleur: on laisse celle du design (sauf si ref est la même)
  }

  function replaceNbspInNode(root) {
    if (!root) return;
    // Remplace dans tous les text nodes (plus propre que innerHTML)
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.indexOf("\u00A0") !== -1) {
        node.nodeValue = node.nodeValue.replace(/\u00A0/g, " ");
      }
    }
    // Si jamais &nbsp; reste en entity dans du HTML brut
    if (root.innerHTML && root.innerHTML.indexOf("&nbsp;") !== -1) {
      root.innerHTML = root.innerHTML.replace(/&nbsp;/g, " ");
    }
  }

  function runOnce() {
    // 1) Trouver un titre de référence (style “bon”)
    var ref =
      findTitleElementByText(/^Écoles\s*&\s*Parcours\s*recommandés$/i) ||
      findTitleElementByText(/^Projets\s*Portfolio\s*essentiels$/i) ||
      findTitleElementByText(/^Certifications\s*utiles$/i);

    if (!ref) return false;

    // 2) Trouver les titres à corriger
    var tEdu = findTitleElementByText(/^Niveau\s*d[’']études\s*&\s*diplômes$/i) ||
               findTitleElementByText(/^Niveau\s*d[’']études/i);
    var tJobs = findTitleElementByText(/^Débouchés\s*&\s*premiers\s*postes$/i) ||
                findTitleElementByText(/^Débouchés/i);

    if (!tEdu && !tJobs) return false;

    // 3) Appliquer styles titres
    if (tEdu) applyTitleStyleFromReference(ref, tEdu);
    if (tJobs) applyTitleStyleFromReference(ref, tJobs);

    // 4) Forcer font-family inherit + nettoyer NBSP dans les cards concernées
    var cEdu = findCardRootFromTitle(tEdu);
    var cJobs = findCardRootFromTitle(tJobs);

    if (cEdu) {
      cEdu.style.fontFamily = "inherit";
      replaceNbspInNode(cEdu);
    }
    if (cJobs) {
      cJobs.style.fontFamily = "inherit";
      replaceNbspInNode(cJobs);
    }

    return true;
  }

  // Retry léger (pas de boucle infinie) : 40 tentatives max (~2s)
  var tries = 0;
  (function tick() {
    tries++;
    var ok = false;
    try { ok = runOnce(); } catch (e) {}
    if (ok || tries >= 40) return;
    setTimeout(tick, 50);
  })();
})();
