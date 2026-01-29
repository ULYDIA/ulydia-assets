/* =========================================================
   ULYDIA — FINAL.MPB.RENDER.DOM.LEFT.PATCH2 (ONE PATCH ONLY)
   What it does
   - Reads Metier_Pays_Bloc fields already rendered in Webflow DOM:
       .js-bf-education_level_local, .js-bf-entry_routes, etc.
   - Creates cards that MATCH your Ulydia design by CLONING an existing .card
   - Inserts these cards in the LEFT column, right after "Compétences clés"
     (fallback: after "Missions principales" / "Vue d'ensemble")
   - NO MutationObserver, NO infinite polling (bounded rAF)
   - Skips empty fields automatically

   IMPORTANT
   - Use THIS patch instead of stacking multiple MPB patches.
========================================================= */
(function(){
  "use strict";
  if (window.__ULYDIA_MPB_RENDER_DOM_LEFT_PATCH2__) return;
  window.__ULYDIA_MPB_RENDER_DOM_LEFT_PATCH2__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG) console.log.apply(console, ["[mpb.render.dom.left.patch2]"].concat([].slice.call(arguments))); }

  function low(s){
    return String(s||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function isEmptyHTML(html){
    var s = String(html||"").replace(/\u00a0/g," ").trim();
    if (!s) return true;
    var stripped = s
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    return !stripped;
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

  function getFieldHTML(className){
    var el = document.querySelector("." + className);
    if (!el) return "";
    // For rich text, innerHTML is needed; for text, textContent is fine.
    var html = (el.innerHTML != null ? String(el.innerHTML) : "").trim();
    if (!html) html = (el.textContent || "").trim();
    return html;
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

  function clearBody(card){
    var body = card.querySelector(".card-body") || card.querySelector(".card-content");
    if (body) body.innerHTML = "";
    return body || card;
  }

  function tintHeader(card, kind){
    var header = card.querySelector(".card-header") || card;
    if (!header) return;
    if (kind === "blue") header.style.background = "rgba(59,130,246,.18)";
    if (kind === "green") header.style.background = "rgba(16,185,129,.20)";
    if (kind === "purple") header.style.background = "rgba(139,92,246,.22)";
    if (kind === "amber") header.style.background = "rgba(245,158,11,.20)";
  }

  function ensureStyle(){
    if (document.getElementById("ul-mpb-render-dom-style2")) return;
    var st = document.createElement("style");
    st.id = "ul-mpb-render-dom-style2";
    st.textContent = `
.ul-mpb-cardstack{ margin-top: 14px; display: grid; gap: 14px; }
.ul-mpb-rich ul{ margin: 8px 0 14px 18px; }
.ul-mpb-rich li{ margin: 6px 0; }
.ul-mpb-rich p{ margin: 8px 0; }
.ul-mpb-rich h3, .ul-mpb-rich h4{ margin: 10px 0 6px; }
    `.trim();
    document.head.appendChild(st);
  }

  function makeCard(templateCard, title, tint, html){
    if (!html || isEmptyHTML(html)) return null;
    var card = templateCard.cloneNode(true);
    card.setAttribute("data-ulydia-mpb-card", title);
    setTitle(card, title);
    tintHeader(card, tint);
    var body = clearBody(card);
    body.innerHTML = '<div class="ul-mpb-rich">' + sanitize(html) + '</div>';
    return card;
  }

  function buildCards(templateCard){
    // Group definitions: title, tint, list of DOM classes (priority order)
    var groups = [
      { title:"🎓 Formation & Accès", tint:"blue", keys:["js-bf-formation","js-bf-acces","js-bf-entry_routes","js-bf-equivalences_reconversion"] },
      { title:"🏫 Écoles & Parcours", tint:"purple", keys:["js-bf-schools_or_paths","js-bf-degrees_examples","js-bf-education_level_local","js-bf-education_level"] },
      { title:"🧰 Outils & Compétences", tint:"amber", keys:["js-bf-tools_stack","js-bf-skills_must_have","js-bf-top_fields","js-bf-soft_skills"] },
      { title:"🏢 Marché & Employeurs", tint:"green", keys:["js-bf-typical_employers","js-bf-hiring_sectors","js-bf-growth_outlook","js-bf-market_demand"] },
      { title:"💼 Projets & Débouchés", tint:"purple", keys:["js-bf-portfolio_projects","js-bf-first_job_titles"] },
      { title:"⏱️ Employabilité & Notes", tint:"blue", keys:["js-bf-time_to_employability","js-bf-salary_notes"] },
      { title:"🧾 Certifications", tint:"amber", keys:["js-bf-certifications"] }
    ];

    var cards = [];
    for (var i=0;i<groups.length;i++){
      var g = groups[i];
      var htmlParts = [];
      for (var k=0;k<g.keys.length;k++){
        var key = g.keys[k];
        var h = getFieldHTML(key);
        if (h && !isEmptyHTML(h)) htmlParts.push('<div class="ul-mpb-part" data-key="'+key+'">' + sanitize(h) + '</div>');
      }
      if (htmlParts.length){
        var merged = htmlParts.join("");
        var c = makeCard(templateCard, g.title, g.tint, merged);
        if (c) cards.push(c);
      }
    }
    return cards;
  }

  function inject(){
    // prevent duplicates
    if (document.querySelector("[data-ulydia-mpb-render-dom='2']")) return true;

    // Anchor in LEFT column
    var anchor =
      findCardByHeaderContains("Compétences clés") ||
      findCardByHeaderContains("Missions principales") ||
      findCardByHeaderContains("Vue d'ensemble") ||
      findCardByHeaderContains("Vue d’ensemble");

    if (!anchor) return false;

    var templateCard = anchor.closest(".card") || anchor;
    if (!templateCard) return false;

    ensureStyle();

    var cards = buildCards(templateCard);
    if (!cards.length){
      log("No MPB DOM fields found (all empty or not present in DOM).");
      return true; // don't block
    }

    var wrap = document.createElement("div");
    wrap.className = "ul-mpb-cardstack";
    wrap.setAttribute("data-ulydia-mpb-render-dom", "2");
    for (var i=0;i<cards.length;i++) wrap.appendChild(cards[i]);

    insertAfter(templateCard, wrap);
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