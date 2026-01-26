/* =========================================================
   ULYDIA — FINAL.BLOCKS.EXTRA.PATCH2 (DESIGN-MATCH + MORE SOURCES)
   Fixes vs PATCH1:
   - Uses an existing .card as TEMPLATE (clone) so design matches perfectly
   - Reads data from MULTIPLE sources:
       ctx.blocFields / window.__ULYDIA_BLOC__
       ctx.metierFields / ctx.metier / window.__ULYDIA_METIER__ / window.__ULYDIA_METIER_ITEM__
       ctx.paysFields / window.__ULYDIA_PAYS__
   - Injects up to 5 new blocks if corresponding fields exist:
       🎓 Accès au métier
       🧾 Statut & type d’exercice
       🚀 Évolution de carrière
       ⚠️ Contraintes & réalités
       🌍 Mobilité & international
   Safety:
   - No MutationObserver
   - Bounded wait (15s) via requestAnimationFrame
========================================================= */
(function () {
  "use strict";

  if (window.__ULYDIA_BLOCKS_EXTRA_PATCH2__) return;
  window.__ULYDIA_BLOCKS_EXTRA_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.extra.patch2]", ...a);

  function low(s){
    return String(s||"")
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function isEmptyRich(html){
    const s = String(html || "").replace(/\u00a0/g, " ").trim();
    if (!s) return true;
    const stripped = s
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
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

  function collectSources(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;

    // try multiple possible names for metier fields
    const m = ctx?.metierFields || ctx?.metier || window.__ULYDIA_METIER__ || window.__ULYDIA_METIER_ITEM__ || window.__ULYDIA_METIER__?.fieldData || null;

    // optional pays/country fields
    const p = ctx?.paysFields || window.__ULYDIA_PAYS__ || null;

    return { b: b||{}, m: m||{}, p: p||{}, ctx: ctx||{} };
  }

  function getFrom(obj, keys){
    if (!obj) return "";
    // exact keys
    for (const k of keys){
      if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
    }
    // normalized match
    const want = keys.map(_normKey);
    for (const kk in obj){
      const nk = _normKey(kk);
      if (want.includes(nk)) {
        const v = obj[kk];
        if (v != null && String(v).trim() !== "") return v;
      }
    }
    // includes match
    for (const kk in obj){
      const nk = _normKey(kk);
      for (const w of want){
        if (nk.includes(w)) {
          const v = obj[kk];
          if (v != null && String(v).trim() !== "") return v;
        }
      }
    }
    return "";
  }

  function getAny(sources, keys){
    // priority: bloc -> metier -> pays
    const vb = getFrom(sources.b, keys); if (vb) return vb;
    const vm = getFrom(sources.m, keys); if (vm) return vm;
    const vp = getFrom(sources.p, keys); if (vp) return vp;
    return "";
  }

  function buildValueHTML(v){
    if (v == null) return "";
    const s = String(v).trim();
    if (!s) return "";
    if (/<[a-z][\s\S]*>/i.test(s)) {
      if (isEmptyRich(s)) return "";
      return sanitizeHTML(s);
    }
    const lines = s.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    if (lines.length >= 3) {
      return `<ul>${lines.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    }
    return `<div>${escapeHtml(s)}</div>`;
  }

  function escapeHtml(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function findCardByHeaderContains(label){
    const want = low(label);
    const hs = document.querySelectorAll(".card-header .section-title, .section-title");
    for (const h of hs){
      const t = low(h.textContent || "");
      if (t && t.includes(want)) {
        return h.closest(".card") || h.closest("section") || h.closest("article") || h.parentElement;
      }
    }
    return null;
  }

  function pickTemplateCard(){
    // Prefer a "normal" content card from LEFT column
    return (
      findCardByHeaderContains("Missions principales") ||
      findCardByHeaderContains("Vue d'ensemble") ||
      findCardByHeaderContains("Compétences clés") ||
      document.querySelector(".card") ||
      null
    );
  }

  function clearCardBody(card){
    // Try common patterns
    const body = card.querySelector(".card-body") || card.querySelector(".card-content") || card;
    // Remove everything but keep structure
    if (body) body.innerHTML = "";
    return body;
  }

  function setCardTitle(card, title){
    const t = card.querySelector(".card-header .section-title") || card.querySelector(".section-title");
    if (t) t.textContent = title;
  }

  function makeBlockCard(template, title, sections){
    const usable = (sections||[]).filter(s => s && s.html);
    if (!usable.length) return null;

    const card = template.cloneNode(true);
    card.setAttribute("data-ulydia-extra", title);

    setCardTitle(card, title);

    const body = clearCardBody(card);
    if (!body) return null;

    // Use simple consistent structure inside body
    body.innerHTML = usable.map(s => `
      <div style="font-weight:800;font-size:12px;color:rgba(20,20,20,.55);margin-top:10px;">${escapeHtml(s.label)}</div>
      <div style="font-weight:600;font-size:13px;color:rgba(20,20,20,.92);margin-top:4px;line-height:1.35;">${s.html}</div>
    `).join("");

    return card;
  }

  function buildSections(sources, mapping){
    const out = [];
    for (const m of mapping){
      const raw = getAny(sources, m.keys);
      const html = buildValueHTML(raw);
      if (html) out.push({ label: m.label, html });
    }
    return out;
  }

  function insertAfter(target, node){
    if (!target || !target.parentElement) return false;
    if (target.nextSibling) target.parentElement.insertBefore(node, target.nextSibling);
    else target.parentElement.appendChild(node);
    return true;
  }

  function injectAll(ctx){
    const sources = collectSources(ctx);
    // Avoid duplicates
    if (document.querySelector('[data-ulydia-extra="🎓 Accès au métier"]')) return true;

    const template = pickTemplateCard();
    if (!template) return false;

    const anchorOverview = findCardByHeaderContains("Vue d'ensemble") || findCardByHeaderContains("Vue d’ensemble");
    const anchor = anchorOverview || findCardByHeaderContains("Missions principales") || template;

    const cards = [];

    // 🎓 Accès au métier
    const access = makeBlockCard(template, "🎓 Accès au métier", buildSections(sources, [
      { label:"Accès au métier", keys:["acces_au_metier","Accès au métier","Acces au metier","access_to_job"] },
      { label:"Prérequis", keys:["prerequis","Prérequis","requirements"] },
      { label:"Niveau d’études requis", keys:["niveau_etudes_requis","Niveau d’études requis","Niveau d'etudes requis","education_level"] },
      { label:"Diplôme requis", keys:["diplome_requis","Diplôme requis","Diplome requis","degree_required"] },
      { label:"Durée de formation", keys:["duree_formation","Durée de formation","Duree de formation","training_duration"] },
      { label:"Type de formation", keys:["type_formation","Type de formation","training_type"] }
    ]));
    if (access) cards.push(access);

    // 🧾 Statut & type d’exercice
    const statut = makeBlockCard(template, "🧾 Statut & type d’exercice", buildSections(sources, [
      { label:"Statut professionnel", keys:["statut_professionnel","Statut professionnel","statut","professional_status"] },
      { label:"Type de contrat", keys:["type_contrat","Type de contrat","contrat","contract_type"] },
      { label:"Secteur d’exercice", keys:["secteur_exercice","Secteur d’exercice","Secteur d'exercice","practice_sector"] }
    ]));
    if (statut) cards.push(statut);

    // 🚀 Évolution de carrière
    const evol = makeBlockCard(template, "🚀 Évolution de carrière", buildSections(sources, [
      { label:"Évolution professionnelle", keys:["evolution_professionnelle","Évolution professionnelle","Evolution professionnelle","career_progression"] },
      { label:"Perspectives d’évolution", keys:["perspectives_evolution","Perspectives d’évolution","Perspectives d'evolution","career_outlook"] },
      { label:"Métiers connexes", keys:["metiers_connexes","Métiers connexes","Metiers connexes","related_jobs"] }
    ]));
    if (evol) cards.push(evol);

    // ⚠️ Contraintes & réalités
    const cons = makeBlockCard(template, "⚠️ Contraintes & réalités", buildSections(sources, [
      { label:"Contraintes physiques", keys:["contraintes_physiques","Contraintes physiques","physical_constraints"] },
      { label:"Contraintes psychologiques", keys:["contraintes_psychologiques","Contraintes psychologiques","psychological_constraints"] },
      { label:"Horaires", keys:["horaires","Horaires","working_hours"] },
      { label:"Pénibilité", keys:["penibilite","Pénibilité","Penibilite","hardship"] }
    ]));
    if (cons) cards.push(cons);

    // 🌍 Mobilité & international
    const mob = makeBlockCard(template, "🌍 Mobilité & international", buildSections(sources, [
      { label:"Mobilité géographique", keys:["mobilite_geographique","Mobilité géographique","Mobilite geographique","geo_mobility"] },
      { label:"Exercice à l’étranger", keys:["exercice_etranger","Exercice à l’étranger","Exercice a l'etranger","international_practice"] },
      { label:"Reconnaissance du diplôme", keys:["reconnaissance_diplome","Reconnaissance du diplôme","Reconnaissance du diplome","degree_recognition"] }
    ]));
    if (mob) cards.push(mob);

    if (!cards.length) {
      log("no extra fields found in sources", sources);
      return true; // ok (nothing to show)
    }

    let cursor = anchor;
    for (const c of cards){
      insertAfter(cursor, c);
      cursor = c;
    }

    log("injected", cards.map(c=>c.getAttribute("data-ulydia-extra")));
    return true;
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

  // Bus hook
  try{
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", injectAll);
    }
  }catch(e){}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runBounded);
  } else {
    runBounded();
  }
})();