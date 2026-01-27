(function(){
  // =========================================================
  // ULYDIA — MPB Extra Blocks (LEFT) — DESIGN PATCH (HTML GUIDED)
  // V2026-01-27 FINAL PATCH7
  //
  // Goal: match "Missions principales" card style from your HTML reference:
  // - Each block is a single "card" (with header band + content)
  // - Uses the same class structure: .card > .card-header + .rich-content
  // - Bullet style comes from .rich-content li:before (→) defined in your CSS
  //
  // Data/logic: identical to prior PATCH6 (no change)
  // =========================================================

  function norm(s){
    return String(s||"")
      .replace(/\u00A0/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitLines(s){
    s = String(s||"").replace(/\u00A0/g," ").replace(/&nbsp;/gi," ");
    s = s.replace(/\r/g,"");
    // convert common bullets/separators to newlines
    s = s.replace(/[•·●▪➤➜–—-]\s*/g, "\n");
    var parts = s.split(/\n|;|\||\t/).map(function(x){ return norm(x); }).filter(Boolean);
    if (parts.length <= 1 && s.indexOf(",") >= 0){
      parts = s.split(",").map(function(x){ return norm(x); }).filter(Boolean);
    }
    // de-dup
    var seen = {};
    var out = [];
    for (var i=0;i<parts.length;i++){
      var k = parts[i].toLowerCase();
      if (!seen[k]){ seen[k]=1; out.push(parts[i]); }
    }
    return out;
  }

  function waitFor(fn, timeoutMs){
    var t0 = Date.now();
    (function loop(){
      try { if (fn()) return; } catch(e){}
      if (Date.now() - t0 > (timeoutMs||8000)) return;
      setTimeout(loop, 80);
    })();
  }

  function pick(obj, keys){
    for (var i=0;i<keys.length;i++){
      var k = keys[i];
      if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
    }
    return "";
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || window.__ULYDIA_CTX__ || null;
  }

  function getBlocFields(ctx){
    if (ctx && ctx.blocFields) return ctx.blocFields;
    if (ctx && ctx.bloc && (ctx.bloc.fieldData || ctx.bloc.fields)) return (ctx.bloc.fieldData || ctx.bloc.fields);
    return null;
  }

  function findInsertBeforeCard(){
    var headers = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,div,span"));
    for (var i=0;i<headers.length;i++){
      var tx = norm(headers[i].textContent);
      if (tx === "Environnements de travail"){
        var card = headers[i].closest(".card,.u-section-card,.section-card,.u-card,[class*='card']");
        if (card) return card;
      }
    }
    return null;
  }

  function findLeftColumnRoot(){
    var before = findInsertBeforeCard();
    if (before) return before.parentElement || before;
    return document.querySelector("#ulydia-metier-root") || document.body;
  }

  function removePreviouslyInserted(root){
    if (!root) return;
    var nodes = root.querySelectorAll("[data-ulydia-mpb-inserted='1']");
    for (var i=0;i<nodes.length;i++){
      nodes[i].parentNode && nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  function hideSoftSkillsIfEmpty(){
    var candidates = Array.prototype.slice.call(document.querySelectorAll(".card,.u-section-card,.section-card,.u-card,[class*='card']"));
    for (var i=0;i<candidates.length;i++){
      var card = candidates[i];
      var txt = norm(card.textContent);
      if (txt.indexOf("Soft Skills essentiels") !== -1){
        var items = card.querySelectorAll("li,.u-chip,.chip,[class*='chip'],[data-chip]");
        var hasItem = false;
        for (var j=0;j<items.length;j++){
          if (norm(items[j].textContent)) { hasItem=true; break; }
        }
        if (!hasItem){
          var t = norm(card.textContent).replace(/Soft Skills essentiels/ig,"").trim();
          hasItem = t.length > 2;
        }
        card.style.display = hasItem ? "" : "none";
      }
    }
  }

  // ---------------------------------------------------------
  // UI BUILDERS (match propal HTML)
  // ---------------------------------------------------------
  function buildSection(root, label, items){
    if (!items || !items.length) return;

    var h4 = document.createElement("h4");
    h4.textContent = label;
    root.appendChild(h4);

    var ul = document.createElement("ul");
    for (var i=0;i<items.length;i++){
      var li = document.createElement("li");
      li.textContent = items[i];
      ul.appendChild(li);
    }
    root.appendChild(ul);
  }

  function buildCard(opts){
    var card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-ulydia-mpb-inserted","1");

    var header = document.createElement("div");
    header.className = "card-header " + (opts.headerClass || "");
    card.appendChild(header);

    var h2 = document.createElement("h2");
    h2.className = "section-title";
    // simple emoji "icon" (your CSS already aligns items)
    var icon = document.createElement("span");
    icon.textContent = (opts.emoji || "📌");
    icon.style.fontSize = "20px";
    icon.style.lineHeight = "1";
    icon.style.flexShrink = "0";

    var title = document.createElement("span");
    title.textContent = (opts.title || "");

    h2.appendChild(icon);
    h2.appendChild(title);
    header.appendChild(h2);

    var body = document.createElement("div");
    body.className = "rich-content";
    card.appendChild(body);

    // sections (as h4 + ul/li)
    var sections = opts.sections || [];
    for (var i=0;i<sections.length;i++){
      var s = sections[i];
      if (!s) continue;
      buildSection(body, s.label || "", s.items || []);
    }

    return card;
  }

  function run(){
    var ctx = getCtx();
    if (!ctx) return false;

    var bf = getBlocFields(ctx);
    var insertBefore = findInsertBeforeCard();
    var root = findLeftColumnRoot();

    removePreviouslyInserted(root);

    // If no MPB for current metier/country => do not render anything
    if (!bf || !insertBefore) {
      hideSoftSkillsIfEmpty();
      return true;
    }

    // Pull fields (same keys as previous patches)
    var eduLocal       = pick(bf, ["js_bf_education_level_local","education_level_local","Education level local"]);
    var eduLevel       = pick(bf, ["js_bf_education_level","education_level","Education level"]);
    var degrees        = pick(bf, ["js_bf_degrees_examples","degrees_examples","Degrees examples"]);
    var entryRoutes    = pick(bf, ["js_bf_entry_routes","entry_routes"]);
    var reconversion   = pick(bf, ["js_bf_equivalences_reconversion","equivalences_reconversion"]);
    var firstJobs      = pick(bf, ["js_bf_first_job_titles","first_job_titles"]);
    var employers      = pick(bf, ["js_bf_typical_employers","typical_employers"]);
    var hiringSectors  = pick(bf, ["js_bf_hiring_sectors","hiring_sectors"]);

    var sEdu  = splitLines(eduLocal || eduLevel);
    var sDeg  = splitLines(degrees);
    var sFirst= splitLines(firstJobs);
    var sEmp  = splitLines(employers);
    var sHire = splitLines(hiringSectors);
    var sEntry= splitLines(entryRoutes);
    var sReco = splitLines(reconversion);

    var any = (sEdu.length||sDeg.length||sFirst.length||sEmp.length||sHire.length||sEntry.length||sReco.length);
    if (!any){
      hideSoftSkillsIfEmpty();
      return true;
    }

    var cards = [];

    // Header colors: reuse your pastel classes from the HTML reference
    if (sEdu.length || sDeg.length){
      cards.push(buildCard({
        emoji: "📚",
        title: "Niveau d’études & diplômes",
        headerClass: "pastel-purple",
        sections: [
          { label: "Niveau requis", items: sEdu },
          { label: "Diplômes (exemples)", items: sDeg }
        ]
      }));
    }

    if (sFirst.length || sEmp.length || sHire.length){
      cards.push(buildCard({
        emoji: "⏱️",
        title: "Débouchés & premiers postes",
        headerClass: "pastel-blue",
        sections: [
          { label: "Premiers postes", items: sFirst },
          { label: "Employeurs types", items: sEmp },
          { label: "Secteurs qui recrutent", items: sHire }
        ]
      }));
    }

    if (sEntry.length || sReco.length){
      cards.push(buildCard({
        emoji: "🧭",
        title: "Accès au métier & reconversion",
        headerClass: "pastel-green",
        sections: [
          { label: "Voies d’accès", items: sEntry },
          { label: "Équivalences / reconversion", items: sReco }
        ]
      }));
    }

    for (var i=0;i<cards.length;i++){
      insertBefore.parentNode.insertBefore(cards[i], insertBefore);
    }

    hideSoftSkillsIfEmpty();
    return true;
  }

  waitFor(run, 10000);
})();