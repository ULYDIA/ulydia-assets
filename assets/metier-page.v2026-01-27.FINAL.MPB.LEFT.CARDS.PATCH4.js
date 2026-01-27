/* =========================================================
ULYDIA — Metier_Pays_Blocs (MPB) — LEFT blocks + guards — PATCH4
- Renders 3 left-column blocks ONLY when MPB matches current (metier + iso)
  1) Niveau d’études & diplômes
  2) Débouchés & premiers postes
  3) Accès au métier & reconversion
- Removes &nbsp; and forces proper line breaks / bullet lists
- Avoids nesting cards inside another card (no extra "background wrapper")
- Also hides "Soft Skills essentiels" card if empty
========================================================= */
(function(){
  "use strict";

  // prevent double-run
  if (window.__ULYDIA_MPB_LEFT_PATCH4__) return;
  window.__ULYDIA_MPB_LEFT_PATCH4__ = true;

  function norm(s){
    return String(s||"")
      .replace(/\u00A0/g," ")          // nbsp
      .replace(/[ \t]+\n/g,"\n")
      .replace(/\n{3,}/g,"\n\n")
      .trim();
  }

  function splitLines(s){
    s = norm(s);
    if (!s) return [];
    // Accept separators: newline, comma, bullet, semicolon
    var parts = s
      .replace(/\r/g,"")
      .split(/\n|•|\u2022|;|,(?!\d)/g) // keep 10,000 together
      .map(function(x){ return norm(x); })
      .filter(Boolean);

    // de-dup (case-insensitive)
    var seen = Object.create(null);
    var out = [];
    for (var i=0;i<parts.length;i++){
      var k = parts[i].toLowerCase();
      if (seen[k]) continue;
      seen[k] = 1;
      out.push(parts[i]);
    }
    return out;
  }

  function hasAny(){
    for (var i=0;i<arguments.length;i++){
      var v = norm(arguments[i]);
      if (v) return true;
    }
    return false;
  }

  function el(tag, attrs){
    var node = document.createElement(tag);
    if (attrs){
      for (var k in attrs){
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    for (var a=2; a<arguments.length; a++){
      var child = arguments[a];
      if (child == null) continue;
      if (typeof child === "string") node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function findAnchorInLeftColumn(){
    // We want to insert BEFORE "Environnements de travail" if present, else before FAQ block, else at end of left column.
    var titles = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,.u-block-title,.block-title,.js-block-title"));
    function matchTitle(t){
      var s = (t && t.textContent) ? t.textContent.toLowerCase() : "";
      return s.indexOf("environnements de travail") !== -1 || s.indexOf("environnement de travail") !== -1;
    }
    for (var i=0;i<titles.length;i++){
      if (matchTitle(titles[i])){
        // anchor is the nearest card/block wrapper
        return titles[i].closest(".u-card, .u-block, .w-richtext, .w-dyn-item, .w-node, section, div") || titles[i].parentElement;
      }
    }

    // fallback: FAQ
    for (var j=0;j<titles.length;j++){
      var s2 = (titles[j] && titles[j].textContent) ? titles[j].textContent.toLowerCase() : "";
      if (s2.indexOf("questions fréquentes") !== -1 || s2.indexOf("faq") !== -1){
        return titles[j].closest(".u-card, .u-block, section, div") || titles[j].parentElement;
      }
    }

    return null;
  }

  function detectLeftColumnContainer(anchor){
    // Most robust: climb to the first parent that looks like a column (contains multiple cards/blocks)
    if (!anchor) return null;
    var cur = anchor.parentElement;
    for (var i=0;i<8 && cur;i++){
      var cards = cur.querySelectorAll(".u-card, .u-block");
      if (cards && cards.length >= 2) return cur;
      cur = cur.parentElement;
    }
    return anchor.parentElement || document.body;
  }

  function makeCard(title, icon, accentClass, sections){
    // Card wrapper (same "card" spirit as others; minimal inline style to keep typography consistent)
    var card = el("div", { class: "u-card u-mpb-card" });

    var head = el("div", { class: "u-card-head u-mpb-head " + (accentClass||"") },
      el("div", { class: "u-mpb-head-inner" },
        el("div", { class: "u-mpb-icon" }, icon || "📌"),
        el("div", { class: "u-mpb-title" }, title || "")
      )
    );

    var body = el("div", { class: "u-card-body u-mpb-body" });

    sections.forEach(function(sec){
      if (!sec || !sec.label || !sec.items || !sec.items.length) return;
      body.appendChild(el("div", { class: "u-mpb-section" },
        el("div", { class: "u-mpb-section-title" }, sec.label),
        el("div", { class: "u-mpb-placeholder" })
      ));
    });

    // fix list building (no python starred, keep JS):
    // We'll rebuild lists after creation for reliability.
    var secNodes = body.querySelectorAll(".u-mpb-section");
    for (var i=0;i<secNodes.length;i++){
      var secTitle = secNodes[i].querySelector(".u-mpb-section-title");
      var label = secTitle ? secTitle.textContent : "";
      // find corresponding sec in sections
      var ref = null;
      for (var j=0;j<sections.length;j++){
        if (sections[j] && sections[j].label === label){ ref = sections[j]; break; }
      }
      if (!ref) continue;

      // remove placeholder content in this section after title
      var children = Array.prototype.slice.call(secNodes[i].children);
      for (var k=1;k<children.length;k++) secNodes[i].removeChild(children[k]);

      if (ref.asText){
        secNodes[i].appendChild(el("div",{class:"u-mpb-text"}, ref.items.join("\n")));
      } else {
        var ul = el("ul",{class:"u-mpb-list"});
        ref.items.forEach(function(it){
          ul.appendChild(el("li",{class:"u-mpb-li"}, it));
        });
        secNodes[i].appendChild(ul);
      }
    }

    card.appendChild(head);
    card.appendChild(body);

    return card;
  }

  function injectStyleOnce(){
    if (document.getElementById("ulydia-mpb-left-patch4-style")) return;
    var css = ""
      + ".u-mpb-card{margin:14px 0; border-radius:14px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,.05); background:#fff;}"
      + ".u-mpb-head{padding:12px 14px;}"
      + ".u-mpb-head-inner{display:flex; align-items:center; gap:10px;}"
      + ".u-mpb-icon{width:22px; height:22px; display:flex; align-items:center; justify-content:center;}"
      + ".u-mpb-title{font-weight:700; font-size:16px; line-height:1.2;}"
      + ".u-mpb-body{padding:14px;}"
      + ".u-mpb-section{margin-top:10px;}"
      + ".u-mpb-section:first-child{margin-top:0;}"
      + ".u-mpb-section-title{font-weight:700; margin-bottom:6px;}"
      + ".u-mpb-list{margin:0; padding-left:18px;}"
      + ".u-mpb-li{margin:6px 0;}"
      + ".u-mpb-text{white-space:pre-line;}"
      + ".u-mpb-accent-green{background:rgba(16,185,129,.14);}"
      + ".u-mpb-accent-blue{background:rgba(59,130,246,.14);}"
      + ".u-mpb-accent-purple{background:rgba(168,85,247,.14);}";
    var st = document.createElement("style");
    st.id = "ulydia-mpb-left-patch4-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || null;
  }

  function getMPB(){
    var ctx = getCtx();
    // Preferred: ctx.blocFields is already the matched MPB record for current metier+iso
    var bf = ctx && (ctx.blocFields || ctx.bloc || ctx.mpb || null);
    if (bf && typeof bf === "object") return bf;

    // Fallback: global
    if (window.__ULYDIA_BLOC_FIELDS__ && typeof window.__ULYDIA_BLOC_FIELDS__ === "object") {
      return window.__ULYDIA_BLOC_FIELDS__;
    }
    return null;
  }

  function hasMPBData(mpb){
    if (!mpb) return false;
    // any of our target fields
    return hasAny(
      mpb.education_level, mpb.degrees_examples,
      mpb.first_job_titles, mpb.typical_employers, mpb.hiring_sectors,
      mpb.entry_routes, mpb.equivalences_reconversion
    );
  }

  function render(){
    var mpb = getMPB();
    if (!hasMPBData(mpb)) {
      // No MPB for this metier+country => ensure our cards are removed if present
      var old = document.querySelectorAll(".u-mpb-card");
      for (var i=0;i<old.length;i++) old[i].remove();
      hideSoftSkillsIfEmpty();
      return;
    }

    injectStyleOnce();

    // build sections
    var levelReq = splitLines(mpb.education_level);
    var degEx = splitLines(mpb.degrees_examples);

    var firstJobs = splitLines(mpb.first_job_titles);
    var employers = splitLines(mpb.typical_employers);
    var sectors = splitLines(mpb.hiring_sectors);

    var entry = splitLines(mpb.entry_routes);
    var equiv = splitLines(mpb.equivalences_reconversion);

    var cards = [];

    if (levelReq.length || degEx.length){
      cards.push(makeCard(
        "Niveau d’études & diplômes", "📚", "u-mpb-accent-green",
        [
          { label: "Niveau requis", items: levelReq },
          { label: "Diplômes (exemples)", items: degEx }
        ]
      ));
    }

    if (firstJobs.length || employers.length || sectors.length){
      cards.push(makeCard(
        "Débouchés & premiers postes", "💼", "u-mpb-accent-blue",
        [
          { label: "Premiers postes", items: firstJobs },
          { label: "Employeurs types", items: employers },
          { label: "Secteurs qui recrutent", items: sectors }
        ]
      ));
    }

    if (entry.length || equiv.length){
      cards.push(makeCard(
        "Accès au métier & reconversion", "⏱️", "u-mpb-accent-purple",
        [
          { label: "Voies d’accès", items: entry },
          { label: "Équivalences / reconversion", items: equiv, asText: true }
        ]
      ));
    }

    // Insert into left column, before "Environnements de travail"
    var anchor = findAnchorInLeftColumn();
    var container = detectLeftColumnContainer(anchor);

    // remove previous
    var oldCards = container.querySelectorAll(".u-mpb-card");
    for (var i=0;i<oldCards.length;i++) oldCards[i].remove();

    // insert
    if (anchor && anchor.parentElement){
      for (var c=0;c<cards.length;c++){
        anchor.parentElement.insertBefore(cards[c], anchor);
      }
    } else {
      for (var c2=0;c2<cards.length;c2++){
        container.appendChild(cards[c2]);
      }
    }

    hideSoftSkillsIfEmpty();
  }

  function hideSoftSkillsIfEmpty(){
    // Hide the right-column "Soft Skills essentiels" block if it has no chips/items
    var heads = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,.u-block-title,.block-title"));
    for (var i=0;i<heads.length;i++){
      var t = (heads[i].textContent||"").toLowerCase();
      if (t.indexOf("soft skills") === -1) continue;
      var card = heads[i].closest(".u-card, .u-block, section, div");
      if (!card) continue;

      // consider it empty if no list items, no chips, and no meaningful text besides the title
      var hasLi = card.querySelectorAll("li").length > 0;
      var hasChips = card.querySelectorAll(".u-chip, .chip, .tag, .pill").length > 0;

      var text = norm(card.textContent || "");
      // remove title from text to see if anything remains
      text = text.replace(/soft skills essentiels/ig,"").trim();

      if (!hasLi && !hasChips && text.length < 5){
        card.style.display = "none";
      } else {
        card.style.display = "";
      }
      break;
    }
  }

  function waitAndRun(){
    var tries = 0;
    (function tick(){
      tries++;
      // need DOM + ctx
      if (document.readyState === "loading") { setTimeout(tick, 60); return; }
      var ctx = getCtx();
      if (!ctx && tries < 200) { setTimeout(tick, 60); return; }
      try { render(); } catch(e){ console.warn("[MPB LEFT PATCH4] render failed:", e); }
      // re-render after other patches may rewrite DOM
      setTimeout(function(){ try{ render(); }catch(e){} }, 800);
    })();
  }

  waitAndRun();
})();
