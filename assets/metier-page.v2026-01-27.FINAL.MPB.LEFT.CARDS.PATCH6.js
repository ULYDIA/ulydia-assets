(function(){
  // =========================================================
  // ULYDIA — MPB Extra Blocks (LEFT) — DESIGN ONLY PATCH
  // V2026-01-27 FINAL PATCH6 (design: no box bg + purple bullets)
  // - Same logic/data as PATCH5
  // - Only changes visual rendering to match screenshot:
  //   * header band colored + white body
  //   * no shadow / no colored card background
  //   * purple bullets
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
    s = s.replace(/[•·●▪➤➜–—-]\s*/g, "\n");
    var parts = s.split(/\n|;|\||\t/).map(function(x){ return norm(x); }).filter(Boolean);
    if (parts.length <= 1 && s.indexOf(",") >= 0){
      parts = s.split(",").map(function(x){ return norm(x); }).filter(Boolean);
    }
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
        var card = headers[i].closest(".u-section-card,.section-card,.u-card,[class*='card']");
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

  function findTemplateCard(){
    var before = findInsertBeforeCard();
    if (before && before.previousElementSibling){
      var prev = before.previousElementSibling;
      if (prev && (prev.matches(".u-section-card,.section-card,.u-card,[class*='card']"))) return prev;
    }
    return (
      document.querySelector(".u-section-card") ||
      document.querySelector(".section-card") ||
      document.querySelector(".u-card") ||
      document.querySelector("[class*='card']")
    );
  }

  function removePreviouslyInserted(root){
    if (!root) return;
    var nodes = root.querySelectorAll("[data-ulydia-mpb-inserted='1']");
    for (var i=0;i<nodes.length;i++){
      nodes[i].parentNode && nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  function hideSoftSkillsIfEmpty(){
    var candidates = Array.prototype.slice.call(document.querySelectorAll(".u-section-card,.section-card,.u-card,[class*='card']"));
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

  // -------------------------
  // DESIGN HELPERS
  // -------------------------
  function styleCardShell(card){
    // "pas de box en fond" => no shadow, clean border, white surface
    card.style.background = "transparent";
    card.style.boxShadow = "none";
    card.style.border = "1px solid rgba(14, 18, 33, 0.08)";
    card.style.borderRadius = "18px";
    card.style.overflow = "hidden";
    card.style.marginBottom = "18px";
  }

  function buildHeader(card, bgColor, title){
    var header = document.createElement("div");
    header.style.background = bgColor;
    header.style.padding = "16px 18px";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "10px";

    var t = document.createElement("div");
    t.textContent = title;
    t.style.fontWeight = "800";
    t.style.fontSize = "18px";
    t.style.lineHeight = "1.15";
    header.appendChild(t);

    card.appendChild(header);
    return header;
  }

  function buildBody(card){
    var body = document.createElement("div");
    body.style.background = "#fff";
    body.style.padding = "16px 18px 18px";
    card.appendChild(body);
    return body;
  }

  function addSection(body, label, items){
    if (label){
      var h = document.createElement("div");
      h.textContent = label;
      h.style.fontWeight = "700";
      h.style.opacity = "0.75";
      h.style.marginTop = "10px";
      h.style.marginBottom = "10px";
      body.appendChild(h);
    }

    if (Array.isArray(items) && items.length){
      var ul = document.createElement("ul");
      ul.style.listStyle = "none";
      ul.style.padding = "0";
      ul.style.margin = "0";
      ul.style.display = "grid";
      ul.style.gap = "10px";

      for (var i=0;i<items.length;i++){
        var li = document.createElement("li");
        li.style.display = "flex";
        li.style.gap = "10px";
        li.style.alignItems = "flex-start";

        var dot = document.createElement("span");
        dot.style.width = "10px";
        dot.style.height = "10px";
        dot.style.borderRadius = "999px";
        dot.style.background = "#7C6CFF"; // violet bullet
        dot.style.marginTop = "6px";
        dot.style.flex = "0 0 10px";

        var txt = document.createElement("div");
        txt.textContent = items[i];

        li.appendChild(dot);
        li.appendChild(txt);
        ul.appendChild(li);
      }

      body.appendChild(ul);
    }
  }

  function buildCard(templateCard, opts){
    var card = templateCard.cloneNode(false); // keep tagName only
    // carry classes from template (for layout sizing)
    card.className = templateCard.className || "";
    card.removeAttribute("id");
    card.setAttribute("data-ulydia-mpb-inserted","1");

    // clean shell styling
    styleCardShell(card);

    // header + body
    buildHeader(card, opts.bg || "#E7E6FF", (opts.title || ""));
    var body = buildBody(card);

    (opts.sections || []).forEach(function(sec){
      if (!sec) return;
      addSection(body, sec.label, sec.items || []);
    });

    return card;
  }

  function run(){
    var ctx = getCtx();
    if (!ctx) return false;

    var bf = getBlocFields(ctx);
    var insertBefore = findInsertBeforeCard();
    var root = findLeftColumnRoot();
    var template = findTemplateCard();

    removePreviouslyInserted(root);

    if (!bf || !template || !insertBefore) {
      hideSoftSkillsIfEmpty();
      return true;
    }

    // Fields
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

    if (sEdu.length || sDeg.length){
      cards.push(buildCard(template, {
        title: "📚 Niveau d’études & diplômes",
        bg: "#E7E6FF", // light purple header like screenshot
        sections: [
          { label: "Niveau requis (local)", items: sEdu.length ? [sEdu[0]].concat(sEdu.slice(1)) : [] }, // keep same list
          // si tu veux conserver un libellé distinct "Niveau requis" vs "Niveau requis (local)" => dis-moi
          { label: "Diplômes (exemples)", items: sDeg }
        ]
      }));
    }

    if (sFirst.length || sEmp.length || sHire.length){
      cards.push(buildCard(template, {
        title: "⏱️ Débouchés & premiers postes",
        bg: "#DDF3FF", // light blue header
        sections: [
          { label: "Premiers postes", items: sFirst },
          { label: "Employeurs types", items: sEmp },
          { label: "Secteurs qui recrutent", items: sHire }
        ]
      }));
    }

    if (sEntry.length || sReco.length){
      cards.push(buildCard(template, {
        title: "🧭 Accès au métier & reconversion",
        bg: "#F6E3FF", // light pink/purple header
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
