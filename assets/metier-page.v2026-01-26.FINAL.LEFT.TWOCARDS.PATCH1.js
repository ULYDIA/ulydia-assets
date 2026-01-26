/* =========================================================
   ULYDIA — FINAL.LEFT.TWOCARDS.PATCH1
   Adds 2 cards side-by-side in LEFT column with colored headers:
   1) 🏫 Écoles & Parcours recommandés (blue)
   2) 💼 Projets Portfolio essentiels (green)

   - Pure DOM injection, safe & bounded (no MutationObserver)
   - Responsive: 2 columns on desktop, 1 column on mobile
   - Content: demo data (can be wired to CMS later)

   Where inserted:
   - After "Compétences clés" if found, else after "Missions principales",
     else after "Vue d’ensemble".

========================================================= */
(function(){
  "use strict";
  if (window.__ULYDIA_LEFT_TWOCARDS_PATCH1__) return;
  window.__ULYDIA_LEFT_TWOCARDS_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a)=>DEBUG && console.log("[left.twocards.patch1]", ...a);

  function low(s){
    return String(s||"")
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function findCardByHeaderContains(label){
    const want = low(label);
    const hs = document.querySelectorAll(".card-header .section-title, .section-title");
    for (const h of hs){
      const t = low(h.textContent || "");
      if (t && t.includes(want)){
        return h.closest(".card") || h.closest("section") || h.closest("article") || h.parentElement;
      }
    }
    return null;
  }

  function insertAfter(target, node){
    if (!target || !target.parentElement) return false;
    if (target.nextSibling) target.parentElement.insertBefore(node, target.nextSibling);
    else target.parentElement.appendChild(node);
    return true;
  }

  function ensureStyle(){
    if (document.getElementById("ul-left-twocards-style")) return;
    const style = document.createElement("style");
    style.id = "ul-left-twocards-style";
    style.textContent = `
/* wrapper grid */
.ul-left-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 14px;
}
@media (max-width: 991px){
  .ul-left-grid{ grid-template-columns: 1fr; }
}

/* card shell matching your design */
.ul-card{
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(20,20,20,.08);
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}
.ul-card-header{
  padding: 16px 18px;
  font-weight: 900;
  font-size: 18px;
  letter-spacing: -0.2px;
  display:flex;
  align-items:center;
  gap:10px;
}
.ul-card-header.blue{ background: rgba(59,130,246,.18); color:#0f172a; }
.ul-card-header.green{ background: rgba(16,185,129,.20); color:#0f172a; }

.ul-card-body{
  padding: 16px 18px 18px;
}
.ul-subtitle{
  font-weight: 900;
  font-size: 18px;
  margin: 10px 0 6px;
  display:flex;
  align-items:center;
  gap:10px;
}
.ul-list{
  margin: 0 0 6px 20px;
  padding: 0;
}
.ul-list li{
  margin: 6px 0;
  color: rgba(15,23,42,.65);
  font-weight: 700;
}
.ul-checkrow{
  display:flex;
  gap:12px;
  align-items:flex-start;
  margin: 12px 0;
}
.ul-check{
  font-size: 22px;
  line-height: 1;
  margin-top: 1px;
}
.ul-checktext{
  flex:1;
}
.ul-checktitle{
  font-weight: 900;
  font-size: 18px;
  line-height: 1.2;
}
.ul-checkdesc{
  margin-top: 3px;
  font-weight: 800;
  color: rgba(15,23,42,.55);
}
    `.trim();
    document.head.appendChild(style);
  }

  function buildGrid(){
    const wrap = document.createElement("div");
    wrap.className = "ul-left-grid";
    wrap.setAttribute("data-ulydia-left-twocards", "1");

    // Card 1 — Schools
    const schools = document.createElement("section");
    schools.className = "ul-card";
    schools.innerHTML = `
      <div class="ul-card-header blue">🏫 Écoles & Parcours recommandés</div>
      <div class="ul-card-body">

        <div class="ul-subtitle">🎯 Bootcamps</div>
        <ul class="ul-list">
          <li>Le Wagon (9 semaines)</li>
          <li>Ironhack (9 semaines)</li>
          <li>Wild Code School (5 mois)</li>
        </ul>

        <div class="ul-subtitle">🏛️ Écoles d'ingénieurs</div>
        <ul class="ul-list">
          <li>École 42 (gratuite)</li>
          <li>Epitech, EPITA</li>
          <li>Centrale, Mines</li>
        </ul>

        <div class="ul-subtitle">💻 Formations en ligne</div>
        <ul class="ul-list">
          <li>OpenClassrooms</li>
          <li>freeCodeCamp</li>
          <li>The Odin Project</li>
        </ul>

      </div>
    `.trim();

    // Card 2 — Portfolio
    const portfolio = document.createElement("section");
    portfolio.className = "ul-card";
    portfolio.innerHTML = `
      <div class="ul-card-header green">💼 Projets Portfolio essentiels</div>
      <div class="ul-card-body">

        <div class="ul-checkrow">
          <div class="ul-check">✅</div>
          <div class="ul-checktext">
            <div class="ul-checktitle">Application CRUD complète</div>
            <div class="ul-checkdesc">Front + Back + BDD + Auth</div>
          </div>
        </div>

        <div class="ul-checkrow">
          <div class="ul-check">✅</div>
          <div class="ul-checktext">
            <div class="ul-checktitle">API REST documentée</div>
            <div class="ul-checkdesc">Avec tests &amp; documentation</div>
          </div>
        </div>

        <div class="ul-checkrow">
          <div class="ul-check">✅</div>
          <div class="ul-checktext">
            <div class="ul-checktitle">Clone de site populaire</div>
            <div class="ul-checkdesc">Twitter, Airbnb, Netflix…</div>
          </div>
        </div>

        <div class="ul-checkrow">
          <div class="ul-check">✅</div>
          <div class="ul-checktext">
            <div class="ul-checktitle">Application en temps réel</div>
            <div class="ul-checkdesc">Chat, dashboard, notifications</div>
          </div>
        </div>

        <div class="ul-checkrow">
          <div class="ul-check">✅</div>
          <div class="ul-checktext">
            <div class="ul-checktitle">Projet déployé en production</div>
            <div class="ul-checkdesc">Sur Vercel, Netlify ou AWS</div>
          </div>
        </div>

      </div>
    `.trim();

    wrap.appendChild(schools);
    wrap.appendChild(portfolio);
    return wrap;
  }

  function inject(){
    // Avoid duplicates
    if (document.querySelector("[data-ulydia-left-twocards]")) return true;

    // Choose anchor in LEFT column
    const anchor =
      findCardByHeaderContains("Compétences clés") ||
      findCardByHeaderContains("Missions principales") ||
      findCardByHeaderContains("Vue d'ensemble") ||
      findCardByHeaderContains("Vue d’ensemble") ||
      null;

    if (!anchor) return false;

    ensureStyle();
    const grid = buildGrid();
    insertAfter(anchor, grid);
    log("inserted");
    return true;
  }

  // Bounded wait (covers async rendering)
  const t0 = Date.now();
  const MAX = 15000;
  (function loop(){
    if (inject()) return;
    if (Date.now() - t0 > MAX) return;
    requestAnimationFrame(loop);
  })();

})();