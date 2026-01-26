/* =========================================================
   ULYDIA — FINAL.SALARY.PATCH3 (ROBUST)
   - Bloc "Grille salariale" (design proche maquette)
   - Injection dans la colonne de droite (robuste)
   - ZÉRO MutationObserver, ZÉRO setInterval infini
   - Attente bornée (15s) via requestAnimationFrame
========================================================= */
(function () {
  "use strict";

  if (window.__ULYDIA_SALARY_PATCH3__) return;
  window.__ULYDIA_SALARY_PATCH3__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) console.log("[SALARY.PATCH3]", ...arguments); }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function injectStyle(){
    if (document.getElementById("ul-salary-style")) return;
    var css = `
.ul-salary-card{
  border-radius:20px;
  background:#f8fafc;
  border:1px solid #e5e7eb;
  overflow:hidden;
  margin-bottom:16px;
  font-family:inherit;
}
.ul-salary-header{
  background:linear-gradient(135deg,#16a34a,#22c55e);
  color:#fff;
  padding:14px 16px;
  font-weight:700;
  font-size:14px;
}
.ul-salary-body{ padding:14px 16px; }

.ul-salary-row{ margin-bottom:16px; }
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

.ul-salary-sub{
  font-size:12px;
  color:#6b7280;
}

.ul-salary-divider{
  height:1px;
  background:#e5e7eb;
  margin:14px 0;
}
    `.trim();
    var style = document.createElement("style");
    style.id = "ul-salary-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildHTML(){
    return `
<section class="ul-salary-card" data-ulydia-salary>
  <div class="ul-salary-header">💰 Grille salariale (France)</div>
  <div class="ul-salary-body">

    <div class="ul-salary-row">
      <div class="ul-salary-top">
        <span>🧳 Junior</span>
        <span>35–45K€</span>
      </div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:40%"></div></div>
      <div class="ul-salary-sub">0–2 ans d’expérience</div>
    </div>

    <div class="ul-salary-row">
      <div class="ul-salary-top">
        <span>🚀 Confirmé</span>
        <span>45–60K€</span>
      </div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:65%"></div></div>
      <div class="ul-salary-sub">3–5 ans d’expérience</div>
    </div>

    <div class="ul-salary-row">
      <div class="ul-salary-top">
        <span>⭐ Senior</span>
        <span>60–85K€</span>
      </div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:90%"></div></div>
      <div class="ul-salary-sub">5+ ans d’expérience</div>
    </div>

    <div class="ul-salary-divider"></div>

    <div class="ul-salary-row">
      <div class="ul-salary-top">
        <span>📌 Part variable</span>
        <span>5–15%</span>
      </div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:20%"></div></div>
      <div class="ul-salary-sub">Bonus, intéressement, participation</div>
    </div>

  </div>
</section>`;
  }

  function first(el, sel){
    return el ? el.querySelector(sel) : null;
  }

  function containsAny(text, needles){
    var t = norm(text).toLowerCase();
    for (var i=0;i<needles.length;i++){
      if (t.indexOf(needles[i]) !== -1) return true;
    }
    return false;
  }

  function locateRightColumn(root){
    // Heuristique: la colonne de droite contient plusieurs cartes dont les titres incluent ces mots
    var keys = [
      "partenaire",
      "compétences incontournables",
      "soft skills",
      "stack/technique",
      "certifications",
      "écoles",
      "parcours",
      "portfolios",
      "projets"
    ];

    // Cherche un élément qui ressemble à un titre de card dans la colonne droite
    var nodes = root.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span");
    var marker = null;
    for (var i=0;i<nodes.length;i++){
      var t = nodes[i].textContent || "";
      if (containsAny(t, keys)) { marker = nodes[i]; break; }
    }
    if (!marker) return null;

    // Remonte pour trouver un conteneur qui contient plusieurs "cards"
    var p = marker;
    for (var step=0; step<10 && p; step++){
      // Un bon conteneur de colonne a généralement plusieurs enfants
      if (p.children && p.children.length >= 2) {
        // et contient au moins 2 occurrences de mots-clés
        var txt = (p.textContent || "").toLowerCase();
        var hits = 0;
        for (var k=0;k<keys.length;k++){
          if (txt.indexOf(keys[k]) !== -1) hits++;
        }
        if (hits >= 2) return p;
      }
      p = p.parentElement;
    }

    // fallback: parent direct
    return marker.parentElement || null;
  }

  function inject(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root) return false;

    if (root.querySelector("[data-ulydia-salary]")) return true;

    var rightCol = locateRightColumn(root);
    if (!rightCol) return false;

    // ancre: si "Partenaire" existe, insère juste avant sa card; sinon insère en premier
    var anchor = null;
    var nodes = rightCol.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span");
    for (var i=0;i<nodes.length;i++){
      var t = norm(nodes[i].textContent).toLowerCase();
      if (t === "partenaire" || t.indexOf("partenaire") !== -1) {
        anchor = nodes[i].closest("section,article,div");
        break;
      }
    }

    injectStyle();

    var wrap = document.createElement("div");
    wrap.innerHTML = buildHTML();
    var card = wrap.firstElementChild;
    if (!card) return false;

    if (anchor && anchor.parentElement) {
      anchor.parentElement.insertBefore(card, anchor);
    } else if (rightCol.firstElementChild) {
      rightCol.insertBefore(card, rightCol.firstElementChild);
    } else {
      rightCol.appendChild(card);
    }

    return true;
  }

  var start = Date.now();
  var MAX = 15000;

  (function wait(){
    if (inject()) { log("injected"); return; }
    if (Date.now() - start > MAX) { log("timeout"); return; }
    requestAnimationFrame(wait);
  })();
})();