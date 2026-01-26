/* =========================================================
   ULYDIA — FINAL.SALARY.PATCH5 (FIX ANCHOR + FALLBACK)
   - Objectif: afficher le bloc salaire DANS la colonne de droite
     AU-DESSUS du bloc "Compétences incontournables"
   - Si l'ancre n'est pas trouvée, fallback: au-dessus de "Partenaire"
     sinon fallback: en haut de la colonne droite détectée
   - ZÉRO MutationObserver, ZÉRO setInterval infini
   - Attente bornée (15s) via requestAnimationFrame
========================================================= */
(function () {
  "use strict";

  if (window.__ULYDIA_SALARY_PATCH5__) return;
  window.__ULYDIA_SALARY_PATCH5__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG) console.log("[SALARY.PATCH5]", ...arguments); }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function low(s){ return norm(s).toLowerCase(); }

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
}`.trim();
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
</section>`;
  }

  function findNodeContaining(root, needle){
    var nodes = root.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span,a,button");
    var n = low(needle);
    for (var i=0;i<nodes.length;i++){
      var t = low(nodes[i].textContent || "");
      if (!t) continue;
      if (t.indexOf(n) !== -1) return nodes[i];
    }
    return null;
  }

  function closestCard(el){
    if (!el) return null;
    return el.closest("section,article,div") || el.parentElement || null;
  }

  function locateRightColumn(root){
    // Colonne droite = conteneur qui contient plusieurs titres typiques à droite
    var keys = [
      "partenaire",
      "compétences incontournables",
      "competences incontournables",
      "soft skills",
      "stack",
      "certifications",
      "écoles",
      "ecoles",
      "parcours",
      "projets",
      "portfolio"
    ];
    var nodes = root.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span");
    var marker = null;
    for (var i=0;i<nodes.length;i++){
      var t = low(nodes[i].textContent || "");
      if (!t) continue;
      for (var k=0;k<keys.length;k++){
        if (t.indexOf(keys[k]) !== -1) { marker = nodes[i]; break; }
      }
      if (marker) break;
    }
    if (!marker) return null;

    var p = marker;
    for (var step=0; step<10 && p; step++){
      if (p.children && p.children.length >= 2) {
        var txt = low(p.textContent || "");
        var hits = 0;
        for (var kk=0; kk<keys.length; kk++){
          if (txt.indexOf(keys[kk]) !== -1) hits++;
        }
        if (hits >= 2) return p;
      }
      p = p.parentElement;
    }
    return marker.parentElement || null;
  }

  function insertBeforeCard(targetCard){
    if (!targetCard || !targetCard.parentElement) return false;

    injectStyle();
    var wrap = document.createElement("div");
    wrap.innerHTML = buildHTML();
    var card = wrap.firstElementChild;
    if (!card) return false;

    targetCard.parentElement.insertBefore(card, targetCard);
    return true;
  }

  function insertAtTop(container){
    if (!container) return false;

    injectStyle();
    var wrap = document.createElement("div");
    wrap.innerHTML = buildHTML();
    var card = wrap.firstElementChild;
    if (!card) return false;

    if (container.firstElementChild) container.insertBefore(card, container.firstElementChild);
    else container.appendChild(card);
    return true;
  }

  function inject(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root) return false;

    // already
    if (root.querySelector("[data-ulydia-salary]")) return true;

    // 1) Primary anchor: "Compétences incontournables" (emoji or not)
    var compNode =
      findNodeContaining(root, "Compétences incontournables") ||
      findNodeContaining(root, "Competences incontournables") ||
      findNodeContaining(root, "Compétences") ||
      findNodeContaining(root, "Competences");

    if (compNode) {
      var compCard = closestCard(compNode);
      if (insertBeforeCard(compCard)) return true;
    }

    // 2) Fallback anchor: "Partenaire"
    var partNode = findNodeContaining(root, "Partenaire");
    if (partNode) {
      var partCard = closestCard(partNode);
      if (insertBeforeCard(partCard)) return true;
    }

    // 3) Final fallback: top of right column
    var rightCol = locateRightColumn(root);
    if (rightCol) {
      if (insertAtTop(rightCol)) return true;
    }

    return false;
  }

  var start = Date.now();
  var MAX = 15000;

  (function wait(){
    if (inject()) { log("injected"); return; }
    if (Date.now() - start > MAX) { log("timeout — anchor not found"); return; }
    requestAnimationFrame(wait);
  })();
})();