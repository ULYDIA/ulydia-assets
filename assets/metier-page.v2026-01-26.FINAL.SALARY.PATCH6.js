/* =========================================================
   ULYDIA — FINAL.SALARY.PATCH6 (ABSOLUTE FIX)
   - Supprime TOUT bloc salaire existant
   - Réinjecte le bloc salaire STRICTEMENT
     dans la colonne de droite
     juste AU-DESSUS de "Compétences incontournables"
   - AUCUNE heuristique fragile après injection
   - ZÉRO MutationObserver, ZÉRO setInterval infini
========================================================= */
(function () {
  "use strict";

  if (window.__ULYDIA_SALARY_PATCH6__) return;
  window.__ULYDIA_SALARY_PATCH6__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function low(s){ return norm(s).toLowerCase(); }

  /* ========== STYLE ========== */
  function injectStyle(){
    if (document.getElementById("ul-salary-style")) return;
    var css = `
.ul-salary-card{
  border-radius:20px;
  background:#f8fafc;
  border:1px solid #e5e7eb;
  overflow:hidden;
  margin-bottom:16px;
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

  /* ========== HTML ========== */
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

  function removeExisting(){
    document.querySelectorAll("[data-ulydia-salary]").forEach(el => el.remove());
  }

  function findCompetencesCard(root){
    var nodes = root.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span");
    for (var i=0;i<nodes.length;i++){
      var t = low(nodes[i].textContent || "");
      if (t.indexOf("compétences incontournables") !== -1 ||
          t.indexOf("competences incontournables") !== -1) {
        return nodes[i].closest("section,article,div");
      }
    }
    return null;
  }

  function inject(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root) return false;

    removeExisting();

    var targetCard = findCompetencesCard(root);
    if (!targetCard || !targetCard.parentElement) return false;

    injectStyle();
    var wrap = document.createElement("div");
    wrap.innerHTML = buildHTML();
    targetCard.parentElement.insertBefore(wrap.firstElementChild, targetCard);
    return true;
  }

  var start = Date.now();
  var MAX = 15000;

  (function wait(){
    if (inject()) return;
    if (Date.now() - start > MAX) return;
    requestAnimationFrame(wait);
  })();
})();