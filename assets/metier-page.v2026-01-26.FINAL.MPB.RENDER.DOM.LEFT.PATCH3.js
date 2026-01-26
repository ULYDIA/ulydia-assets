/* =========================================================
   ULYDIA — FINAL.MPB.RENDER.DOM.LEFT.PATCH3
   Goal
   - Turn Metier_Pays_Bloc DOM fields (.js-bf-*) into REAL Ulydia cards
   - Each field => its own card with a colored header title (like existing blocks)
   - Inside each card: one item per line (robust split)
   - No MutationObserver, no infinite polling (max 15s rAF)

   Install
   - Keep your core patches
   - Remove previous MPB render patches
   - Add this file AFTER: FINAL.BLOCKS.LEFT.PATCH3.js
========================================================= */
(function(){
  "use strict";
  if (window.__ULYDIA_MPB_RENDER_DOM_LEFT_PATCH3__) return;
  window.__ULYDIA_MPB_RENDER_DOM_LEFT_PATCH3__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG) console.log.apply(console, ["[mpb.dom.left.patch3]"].concat([].slice.call(arguments))); }

  function low(s){
    return String(s||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function sanitize(html){
    var s = String(html||"");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  function getFieldRaw(className){
    var el = document.querySelector("." + className);
    if (!el) return "";
    // Prefer innerHTML (rich text), fallback to textContent
    var html = (el.innerHTML != null ? String(el.innerHTML) : "").trim();
    if (!html) html = (el.textContent || "").trim();
    return html;
  }

  function htmlToTextWithBreaks(html){
    var s = String(html||"");
    // convert common block tags to line breaks
    s = s.replace(/\u00a0/g, " ");
    s = s.replace(/<br\s*\/?>/gi, "\n");
    s = s.replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, "\n");
    s = s.replace(/<li[^>]*>/gi, "• ");
    s = s.replace(/<[^>]+>/g, "");
    s = s.replace(/[ \t]+\n/g, "\n");
    s = s.replace(/\n{3,}/g, "\n\n");
    return s.trim();
  }

  function splitLines(text){
    var t = String(text||"").trim();
    if (!t) return [];
    // normalize separators
    t = t.replace(/\r/g, "");
    // if long comma-separated line, split on commas
    var hasBullets = /•/.test(t);
    var hasNewlines = /\n/.test(t);
    var parts = [];

    if (hasNewlines || hasBullets){
      parts = t.split(/\n+/);
    } else if (t.length > 60 && (t.split(",").length >= 3)){
      parts = t.split(",");
    } else if (t.split(";").length >= 3){
      parts = t.split(";");
    } else {
      parts = [t];
    }

    // cleanup each part, handle leading bullets
    var out = [];
    for (var i=0;i<parts.length;i++){
      var p = String(parts[i]||"").trim();
      if (!p) continue;
      p = p.replace(/^•\s*/,"").trim();
      if (!p) continue;
      out.push(p);
    }
    return out;
  }

  function ensureStyle(){
    if (document.getElementById("ul-mpb-patch3-style")) return;
    var st = document.createElement("style");
    st.id = "ul-mpb-patch3-style";
    st.textContent = `
.ul-mpb-stack{ margin-top: 14px; display: grid; gap: 14px; }
.ul-mpb-lines{ display: grid; gap: 10px; }
.ul-mpb-line{ display: flex; gap: 10px; align-items: flex-start; }
.ul-mpb-dot{ width: 8px; height: 8px; border-radius: 999px; margin-top: 7px; background: rgba(99,102,241,.65); flex: 0 0 auto; }
.ul-mpb-text{ line-height: 1.45; }
    `.trim();
    document.head.appendChild(st);
  }

  function findCardByHeaderContains(label){
    var want = low(label);
    var hs = document.querySelectorAll(".card-header .section-title, .section-title");
    for (var i=0;i<hs.length;i++){
      var h = hs[i];
      var t = low(h.textContent || "");
      if (t && t.indexOf(want) !== -1){
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

  function setTitle(card, title){
    var t = card.querySelector(".card-header .section-title") || card.querySelector(".section-title");
    if (t) t.textContent = title;
  }

  function getBodyEl(card){
    return card.querySelector(".card-body") || card.querySelector(".card-content") || card;
  }

  function clearBody(card){
    var body = getBodyEl(card);
    body.innerHTML = "";
    return body;
  }

  function tintHeader(card, tint){
    var header = card.querySelector(".card-header");
    if (!header) return;
    if (tint === "blue") header.style.background = "rgba(59,130,246,.18)";
    if (tint === "green") header.style.background = "rgba(16,185,129,.20)";
    if (tint === "purple") header.style.background = "rgba(139,92,246,.22)";
    if (tint === "amber") header.style.background = "rgba(245,158,11,.20)";
    if (tint === "rose") header.style.background = "rgba(244,63,94,.18)";
    if (tint === "cyan") header.style.background = "rgba(34,211,238,.18)";
  }

  function buildLinesHTML(lines){
    if (!lines || !lines.length) return "";
    var html = '<div class="ul-mpb-lines">';
    for (var i=0;i<lines.length;i++){
      html += '<div class="ul-mpb-line"><span class="ul-mpb-dot"></span><div class="ul-mpb-text">'
           + escapeHTML(lines[i]) + '</div></div>';
    }
    html += '</div>';
    return html;
  }

  function escapeHTML(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function makeCard(templateCard, title, tint, rawHTML){
    if (!rawHTML) return null;
    var txt = htmlToTextWithBreaks(rawHTML);
    if (!txt) return null;
    var lines = splitLines(txt);
    if (!lines.length) return null;

    var card = templateCard.cloneNode(true);
    card.setAttribute("data-ulydia-mpb-card", title);
    setTitle(card, title);
    tintHeader(card, tint);
    var body = clearBody(card);
    body.innerHTML = buildLinesHTML(lines);
    return card;
  }

  // Field => title + tint
  var FIELDS = [
    ["js-bf-formation", "🎓 Formation", "blue"],
    ["js-bf-acces", "🧭 Accès au métier", "blue"],
    ["js-bf-entry_routes", "🗺️ Parcours d’entrée", "green"],
    ["js-bf-equivalences_reconversion", "🔁 Équivalences & reconversion", "green"],

    ["js-bf-education_level_local", "📚 Niveau requis (local)", "purple"],
    ["js-bf-education_level", "📚 Niveau requis", "purple"],
    ["js-bf-degrees_examples", "🎓 Diplômes (exemples)", "purple"],
    ["js-bf-schools_or_paths", "🏫 Écoles & parcours recommandés", "purple"],

    ["js-bf-top_fields", "⭐ Domaines clés", "amber"],
    ["js-bf-skills_must_have", "💪 Compétences indispensables", "amber"],
    ["js-bf-soft_skills", "🤝 Soft skills", "amber"],
    ["js-bf-tools_stack", "🧰 Outils & stack", "amber"],

    ["js-bf-certifications", "🧾 Certifications utiles", "rose"],

    ["js-bf-typical_employers", "🏢 Employeurs types", "cyan"],
    ["js-bf-hiring_sectors", "🏭 Secteurs qui recrutent", "cyan"],
    ["js-bf-growth_outlook", "📈 Croissance du marché", "cyan"],
    ["js-bf-market_demand", "🔥 Demande du marché", "cyan"],

    ["js-bf-first_job_titles", "🚀 Premiers postes", "purple"],
    ["js-bf-portfolio_projects", "💼 Projets portfolio essentiels", "purple"],

    ["js-bf-time_to_employability", "⏱️ Délai d’employabilité", "blue"],
    ["js-bf-salary_notes", "💰 Notes sur la rémunération", "blue"]
  ];

  function inject(){
    if (document.querySelector("[data-ulydia-mpb-stack='patch3']")) return true;

    // Use an existing LEFT card as template and anchor
    var anchor =
      findCardByHeaderContains("Compétences clés") ||
      findCardByHeaderContains("Missions principales") ||
      findCardByHeaderContains("Vue d'ensemble") ||
      findCardByHeaderContains("Vue d’ensemble");

    if (!anchor) return false;

    var templateCard = anchor.closest(".card") || anchor;
    if (!templateCard) return false;

    ensureStyle();

    var cards = [];
    for (var i=0;i<FIELDS.length;i++){
      var cls = FIELDS[i][0], title = FIELDS[i][1], tint = FIELDS[i][2];
      var raw = getFieldRaw(cls);
      if (!raw) continue;
      var card = makeCard(templateCard, title, tint, sanitize(raw));
      if (card) cards.push(card);
    }

    if (!cards.length){
      log("No MPB fields found or all empty.");
      return true; // stop trying, don't block
    }

    var stack = document.createElement("div");
    stack.className = "ul-mpb-stack";
    stack.setAttribute("data-ulydia-mpb-stack", "patch3");
    for (var j=0;j<cards.length;j++) stack.appendChild(cards[j]);

    // Insert right after "Compétences clés" card (or after anchor template)
    insertAfter(templateCard, stack);
    log("Inserted", cards.length, "MPB cards");
    return true;
  }

  var t0 = Date.now();
  var MAX = 15000;
  (function loop(){
    if (inject()) return;
    if (Date.now() - t0 > MAX) return;
    requestAnimationFrame(loop);
  })();
})();