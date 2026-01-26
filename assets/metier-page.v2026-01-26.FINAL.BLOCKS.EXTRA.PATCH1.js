/* =========================================================
   ULYDIA — FINAL.BLOCKS.EXTRA.PATCH1
   Adds NEW blocks for fields that are not yet displayed:
   1) 🎓 Accès au métier (prérequis / niveau d’études / accès)
   2) 🧾 Statut & type d’exercice (statut / contrat / secteur)
   3) 🚀 Évolution de carrière (évolution / perspectives / métiers connexes)
   4) ⚠️ Contraintes & réalités (physiques / psycho / horaires / pénibilité)
   5) 🌍 Mobilité & international (mobilité / étranger / reconnaissance)

   Data source:
   - window.__ULYDIA_BLOC__ (preferred) or ctx.blocFields
   - Supports multiple key variants (snake_case / Title Case / with accents)

   Safety:
   - No MutationObserver
   - Bounded wait (15s) using requestAnimationFrame
========================================================= */
(function () {
  "use strict";

  if (window.__ULYDIA_BLOCKS_EXTRA_PATCH1__) return;
  window.__ULYDIA_BLOCKS_EXTRA_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.extra.patch1]", ...a);

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function low(s){
    return norm(s)
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function isEmptyRich(html){
    const s = String(html || "").replace(/\u00a0/g, " ").trim();
    if (!s) return true;
    const stripped = s
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    return !stripped;
  }

  function sanitizeHTML(html){
    let s = String(html || "");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  function _normKey(k){
    return String(k||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"_")
      .replace(/^_+|_+$/g,"");
  }

  function getAny(b, keys){
    if (!b) return "";
    // direct fields
    for (const k of (keys||[])){
      if (b[k] != null && String(b[k]).trim() !== "") return b[k];
    }
    // try normalized match across all keys
    const want = (keys||[]).map(_normKey);
    for (const kk in b){
      const nk = _normKey(kk);
      if (want.includes(nk)) {
        const v = b[kk];
        if (v != null && String(v).trim() !== "") return v;
      }
    }
    // includes match (e.g. "Niveau d'études (min)")
    for (const kk in b){
      const nk = _normKey(kk);
      for (const w of want){
        if (nk.includes(w)) {
          const v = b[kk];
          if (v != null && String(v).trim() !== "") return v;
        }
      }
    }
    return "";
  }

  function injectStyle(){
    if (document.getElementById("ul-extra-style")) return;
    const style = document.createElement("style");
    style.id = "ul-extra-style";
    style.textContent = `
/* Minimal styling if the base .card styles exist, we inherit them */
.ul-extra-card{ margin-top: 14px; }
.ul-extra-body{ padding: 14px 16px; }
.ul-extra-k{ font-weight: 800; font-size: 12px; color: rgba(20,20,20,.55); margin-top: 10px; }
.ul-extra-v{ font-weight: 600; font-size: 13px; color: rgba(20,20,20,.92); margin-top: 4px; line-height: 1.35; }
.ul-extra-list{ margin: 6px 0 0 18px; }
.ul-extra-list li{ margin: 6px 0; }
.ul-extra-muted{ color: rgba(20,20,20,.55); font-weight: 600; font-size: 12px; }
    `.trim();
    document.head.appendChild(style);
  }

  function findCardByHeaderContains(label){
    const hs = document.querySelectorAll(".card-header .section-title, .section-title");
    const want = low(label);
    for (const h of hs) {
      const t = low(h.textContent || "");
      if (t && t.includes(want)) {
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

  function insertBefore(target, node){
    if (!target || !target.parentElement) return false;
    target.parentElement.insertBefore(node, target);
    return true;
  }

  function buildRichOrText(v){
    if (v == null) return "";
    const s = String(v).trim();
    if (!s) return "";
    // if it looks like HTML, sanitize and return block
    if (/<[a-z][\s\S]*>/i.test(s)) {
      if (isEmptyRich(s)) return "";
      return sanitizeHTML(s);
    }
    // plain text: convert new lines to list if many
    const lines = s.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    if (lines.length >= 3) {
      return `<ul class="ul-extra-list">${lines.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    }
    return `<div class="ul-extra-v">${escapeHtml(s)}</div>`;
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function buildBlockCard(opts){
    // opts: { title, emoji, themeClass(optional), sections: [{k,vHTML}] }
    const title = opts.title || "";
    const emoji = opts.emoji || "";
    const sections = (opts.sections || []).filter(x => x && x.vHTML);

    if (!sections.length) return null;

    const card = document.createElement("section");
    card.className = "card ul-extra-card";
    card.setAttribute("data-ulydia-extra", opts.key || title);

    card.innerHTML = `
      <div class="card-header">
        <div class="section-title">${escapeHtml(emoji)} ${escapeHtml(title)}</div>
      </div>
      <div class="card-body ul-extra-body">
        ${sections.map(s => `
          <div class="ul-extra-k">${escapeHtml(s.k)}</div>
          <div class="ul-extra-v">${s.vHTML.startsWith("<") ? s.vHTML : escapeHtml(s.vHTML)}</div>
        `).join("")}
      </div>
    `.trim();

    return card;
  }

  function buildSections(b, mapping){
    // mapping: [{label, keys:[...] }]
    const out = [];
    for (const m of (mapping||[])){
      const raw = getAny(b, m.keys);
      const html = buildRichOrText(raw);
      if (html) out.push({ k: m.label, vHTML: html });
    }
    return out;
  }

  function injectAll(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b) return false;

    const root = document.getElementById("ulydia-metier-root") || document.body;
    if (!root) return false;

    // Avoid duplicates
    if (root.querySelector('[data-ulydia-extra="Accès au métier"]')) return true;

    injectStyle();

    // Anchors (left column): after "Vue d’ensemble" if present, else after title area
    const anchorOverview = findCardByHeaderContains("Vue d'ensemble") || findCardByHeaderContains("Vue d’ensemble");
    const anchorForInsert = anchorOverview || findCardByHeaderContains("Missions principales") || null;

    // 1) Accès au métier
    const accessCard = buildBlockCard({
      key: "Accès au métier",
      emoji: "🎓",
      title: "Accès au métier",
      sections: buildSections(b, [
        { label: "Accès au métier", keys: ["acces_au_metier","acces_metier","Accès au métier","Acces au metier"] },
        { label: "Prérequis", keys: ["prerequis","Prérequis"] },
        { label: "Niveau d’études requis", keys: ["niveau_etudes_requis","niveau_d_etudes","Niveau d’études requis","Niveau d'etudes requis","education_level"] },
        { label: "Diplôme requis", keys: ["diplome_requis","Diplôme requis","Diplome requis"] },
        { label: "Durée de formation", keys: ["duree_formation","Durée de formation","Duree de formation"] },
        { label: "Type de formation", keys: ["type_formation","Type de formation"] }
      ])
    });

    // 2) Statut & type d’exercice
    const statutCard = buildBlockCard({
      key: "Statut & type d’exercice",
      emoji: "🧾",
      title: "Statut & type d’exercice",
      sections: buildSections(b, [
        { label: "Statut professionnel", keys: ["statut_professionnel","Statut professionnel","statut"] },
        { label: "Type de contrat", keys: ["type_contrat","Type de contrat","contrat"] },
        { label: "Secteur d’exercice", keys: ["secteur_exercice","Secteur d’exercice","Secteur d'exercice"] }
      ])
    });

    // 3) Évolution de carrière
    const evolCard = buildBlockCard({
      key: "Évolution de carrière",
      emoji: "🚀",
      title: "Évolution de carrière",
      sections: buildSections(b, [
        { label: "Évolution professionnelle", keys: ["evolution_professionnelle","Évolution professionnelle","Evolution professionnelle"] },
        { label: "Perspectives", keys: ["perspectives_evolution","Perspectives d’évolution","Perspectives d'evolution","Perspectives"] },
        { label: "Métiers connexes", keys: ["metiers_connexes","Métiers connexes","Metiers connexes"] }
      ])
    });

    // 4) Contraintes & réalités
    const contraintesCard = buildBlockCard({
      key: "Contraintes & réalités",
      emoji: "⚠️",
      title: "Contraintes & réalités",
      sections: buildSections(b, [
        { label: "Contraintes physiques", keys: ["contraintes_physiques","Contraintes physiques"] },
        { label: "Contraintes psychologiques", keys: ["contraintes_psychologiques","Contraintes psychologiques"] },
        { label: "Horaires", keys: ["horaires","Horaires"] },
        { label: "Pénibilité", keys: ["penibilite","Pénibilité","Penibilite"] }
      ])
    });

    // 5) Mobilité & international
    const mobCard = buildBlockCard({
      key: "Mobilité & international",
      emoji: "🌍",
      title: "Mobilité & international",
      sections: buildSections(b, [
        { label: "Mobilité géographique", keys: ["mobilite_geographique","Mobilité géographique","Mobilite geographique"] },
        { label: "Exercice à l’étranger", keys: ["exercice_etranger","Exercice à l’étranger","Exercice a l'etranger","Exercice à l'etranger"] },
        { label: "Reconnaissance du diplôme", keys: ["reconnaissance_diplome","Reconnaissance du diplôme","Reconnaissance du diplome"] }
      ])
    });

    // Insert in a logical order after overview
    const cards = [accessCard, statutCard, evolCard, contraintesCard, mobCard].filter(Boolean);

    if (!cards.length) return true; // nothing to show is OK

    // If we have an anchorOverview, insert after it sequentially.
    let cursor = anchorForInsert;
    if (cursor) {
      for (const c of cards){
        insertAfter(cursor, c);
        cursor = c;
      }
      return true;
    }

    // Fallback: insert at top of root
    for (const c of cards.reverse()){
      root.insertBefore(c, root.firstChild);
    }
    return true;
  }

  function runNow(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__ || { blocFields: window.__ULYDIA_BLOC__ };
    injectAll(ctx);
  }

  function runBounded(){
    const t0 = Date.now();
    const MAX = 15000;
    (function loop(){
      const ctx = window.__ULYDIA_METIER_PAGE_CTX__ || { blocFields: window.__ULYDIA_BLOC__ };
      if (injectAll(ctx)) return;
      if (Date.now() - t0 > MAX) return;
      requestAnimationFrame(loop);
    })();
  }

  // Hook into ready event if present
  try{
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", function(ctx){
        injectAll(ctx);
      });
    }
  }catch(e){}

  // Always run once (covers hard refresh)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runBounded);
  } else {
    runBounded();
  }
})();