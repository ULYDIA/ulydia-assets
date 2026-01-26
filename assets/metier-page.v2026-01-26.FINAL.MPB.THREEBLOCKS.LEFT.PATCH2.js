/* =========================================================
   ULYDIA — FINAL.MPB.THREEBLOCKS.LEFT.PATCH2
   Fixes vs PATCH1
   - Font: inherit (same as existing cards)
   - Remove &nbsp; entities robustly
   - Insert MPB blocks AFTER "Environnements de travail" (not after Compétences clés)
   - Change tint for "📚 Niveau d’études & diplômes" (new pastel green)
   - Keep: titles + colored headers + 1 item per line + no observers + no infinite loops
========================================================= */
(function(){
  "use strict";
  if (window.__ULYDIA_MPB_THREEBLOCKS_LEFT_PATCH2__) return;
  window.__ULYDIA_MPB_THREEBLOCKS_LEFT_PATCH2__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG) console.log.apply(console, ["[mpb.3blocks.left.v2]"].concat([].slice.call(arguments))); }

  // ---------- helpers ----------
  function sanitize(html){
    var s = String(html||"");
    s = s.replace(/&nbsp;/gi, " ");           // ✅ remove entity early
    s = s.replace(/\u00a0/g, " ");            // ✅ remove NBSP char
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
    var html = (el.innerHTML != null ? String(el.innerHTML) : "").trim();
    if (!html) html = (el.textContent || "").trim();
    return html;
  }

  function htmlToTextWithBreaks(html){
    var s = String(html||"");
    s = s.replace(/&nbsp;/gi, " ");
    s = s.replace(/\u00a0/g, " ");
    s = s.replace(/\r/g, "");
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
    t = t.replace(/\r/g, "");

    var hasBullets = /•/.test(t);
    var hasNewlines = /\n/.test(t);

    var parts;
    if (hasNewlines || hasBullets){
      parts = t.split(/\n+/);
    } else if (t.length > 60 && t.split(",").length >= 3){
      parts = t.split(",");
    } else if (t.split(";").length >= 3){
      parts = t.split(";");
    } else {
      parts = [t];
    }

    var out = [];
    for (var i=0;i<parts.length;i++){
      var p = String(parts[i]||"").trim();
      if (!p) continue;
      p = p.replace(/^•\s*/,"").trim();
      // remove leftover entity strings
      p = p.replace(/&nbsp;/gi," ").replace(/\u00a0/g," ").replace(/\s{2,}/g," ").trim();
      if (!p) continue;
      out.push(p);
    }
    return out;
  }

  function low(s){
    return String(s||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function findCardByHeaderContains(label){
    var want = low(label);
    var nodes = document.querySelectorAll(".card-header .section-title, .section-title, h1, h2, h3");
    for (var i=0;i<nodes.length;i++){
      var n = nodes[i];
      var t = low(n.textContent || "");
      if (t && t.indexOf(want) !== -1){
        return n.closest(".card") || n.closest("section") || n.closest("article") || n.parentElement;
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

  function ensureStyles(){
    if (document.getElementById("ul-mpb-3blocks-style-v2")) return;
    var st = document.createElement("style");
    st.id = "ul-mpb-3blocks-style-v2";
    st.textContent = `
/* Ensure typography matches existing cards */
[data-ulydia-mpb-3blocks-container="2"],
[data-ulydia-mpb-3blocks-container="2"] *{
  font-family: inherit !important;
  font-size: inherit;
}
.ul-mpb-card-body{ padding-top: 2px; }
.ul-mpb-section{ margin-top: 12px; }
.ul-mpb-section:first-child{ margin-top: 0; }
.ul-mpb-subtitle{
  font-weight: 700;
  font-size: 14px;
  color: rgba(17,24,39,.75);
  margin-bottom: 8px;
}
.ul-mpb-lines{ display: grid; gap: 10px; }
.ul-mpb-line{ display: flex; gap: 10px; align-items: flex-start; }
.ul-mpb-dot{ width: 8px; height: 8px; border-radius: 999px; margin-top: 7px; background: rgba(99,102,241,.65); flex: 0 0 auto; }
.ul-mpb-text{ line-height: 1.45; }
    `.trim();
    document.head.appendChild(st);
  }

  function tintHeader(card, tint){
    var header = card.querySelector(".card-header");
    if (!header) return;
    var bg =
      tint === "blue"   ? "rgba(59,130,246,.18)" :
      tint === "green"  ? "rgba(16,185,129,.18)" :
      tint === "cyan"   ? "rgba(34,211,238,.18)" :
      "rgba(59,130,246,.18)";
    header.style.background = bg;
  }

  function getBodyEl(card){
    return card.querySelector(".card-body") || card.querySelector(".card-content") || card;
  }

  function ensureHeaderAndTitle(card){
    var header = card.querySelector(".card-header");
    if (!header){
      header = document.createElement("div");
      header.className = "card-header";
      if (card.firstChild) card.insertBefore(header, card.firstChild);
      else card.appendChild(header);
    }
    var title = header.querySelector(".section-title");
    if (!title){
      title = document.createElement("div");
      title.className = "section-title";
      header.appendChild(title);
    }
    return { header: header, title: title };
  }

  function clearBody(card){
    var body = getBodyEl(card);
    if (body === card){
      var header = card.querySelector(".card-header");
      var nodes = [].slice.call(card.childNodes);
      for (var i=0;i<nodes.length;i++){
        var n = nodes[i];
        if (header && n === header) continue;
        card.removeChild(n);
      }
      var newBody = document.createElement("div");
      newBody.className = "card-body ul-mpb-card-body";
      card.appendChild(newBody);
      return newBody;
    } else {
      body.innerHTML = "";
      body.classList.add("ul-mpb-card-body");
      return body;
    }
  }

  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function buildLinesHTML(lines){
    if (!lines || !lines.length) return "";
    var html = '<div class="ul-mpb-lines">';
    for (var i=0;i<lines.length;i++){
      html += '<div class="ul-mpb-line"><span class="ul-mpb-dot"></span><div class="ul-mpb-text">'+esc(lines[i])+'</div></div>';
    }
    html += "</div>";
    return html;
  }

  function collectFieldLines(className){
    var raw = getFieldRaw(className);
    if (!raw) return [];
    raw = sanitize(raw);
    var txt = htmlToTextWithBreaks(raw);
    if (!txt) return [];
    return splitLines(txt);
  }

  function makeSection(label, lines){
    if (!lines || !lines.length) return "";
    return (
      '<div class="ul-mpb-section">' +
        '<div class="ul-mpb-subtitle">'+esc(label)+'</div>' +
        buildLinesHTML(lines) +
      '</div>'
    );
  }

  function makeCard(templateCard, titleText, tint, sectionsHtml){
    if (!sectionsHtml) return null;
    var card = templateCard.cloneNode(true);
    card.setAttribute("data-ulydia-mpb-3blocks", titleText);

    var ht = ensureHeaderAndTitle(card);
    ht.title.textContent = titleText;
    tintHeader(card, tint);

    var body = clearBody(card);
    body.innerHTML = sectionsHtml;
    return card;
  }

  function buildCards(templateCard){
    // 1) Formation & accès
    var formation = collectFieldLines("js-bf-formation");
    var acces = collectFieldLines("js-bf-acces");
    var entry = collectFieldLines("js-bf-entry_routes");
    var eq = collectFieldLines("js-bf-equivalences_reconversion");

    var html1 = "";
    html1 += makeSection("Formation", formation);
    html1 += makeSection("Accès au métier", acces);
    html1 += makeSection("Parcours d’entrée", entry);
    html1 += makeSection("Équivalences & reconversion", eq);

    // 2) Niveau & diplômes (✅ new color)
    var eduLocal = collectFieldLines("js-bf-education_level_local");
    var edu = collectFieldLines("js-bf-education_level");
    var degrees = collectFieldLines("js-bf-degrees_examples");

    var html2 = "";
    html2 += makeSection("Niveau requis (local)", eduLocal);
    html2 += makeSection("Niveau requis", edu);
    html2 += makeSection("Diplômes (exemples)", degrees);

    // 3) Débouchés
    var firstJobs = collectFieldLines("js-bf-first_job_titles");
    var employers = collectFieldLines("js-bf-typical_employers");
    var sectors = collectFieldLines("js-bf-hiring_sectors");

    var html3 = "";
    html3 += makeSection("Premiers postes", firstJobs);
    html3 += makeSection("Employeurs types", employers);
    html3 += makeSection("Secteurs qui recrutent", sectors);

    var cards = [];
    if (html1) cards.push(makeCard(templateCard, "🎓 Formation & accès au métier", "blue", html1));
    if (html2) cards.push(makeCard(templateCard, "📚 Niveau d’études & diplômes", "green", html2));
    if (html3) cards.push(makeCard(templateCard, "🧭 Débouchés & premiers postes", "cyan", html3));
    return cards.filter(function(x){ return !!x; });
  }

  function inject(){
    if (document.querySelector('[data-ulydia-mpb-3blocks-container="2"]')) return true;

    // ✅ Insert AFTER "Environnements de travail"
    var anchorCard = findCardByHeaderContains("Environnements de travail") || findCardByHeaderContains("Environnement de travail");
    if (!anchorCard) return false;

    var templateCard = anchorCard.closest(".card") || anchorCard;
    if (!templateCard) return false;

    // Avoid duplicate insertion
    var existing = document.querySelectorAll("[data-ulydia-mpb-3blocks]");
    if (existing && existing.length) return true;

    ensureStyles();
    var cards = buildCards(templateCard);
    if (!cards.length){
      log("No MPB content to render.");
      return true;
    }

    var container = document.createElement("div");
    container.setAttribute("data-ulydia-mpb-3blocks-container", "2");
    container.style.display = "grid";
    container.style.gap = "14px";
    container.style.marginTop = "14px";

    for (var i=0;i<cards.length;i++) container.appendChild(cards[i]);

    insertAfter(templateCard, container);
    log("Inserted MPB 3-block container after Environnements de travail:", cards.length);
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