(function(){
  // =========================================================
  // ULYDIA — MPB LEFT — BIG SECTIONS (like "Missions principales")
  // DESIGN ONLY PATCH — 3 unique blocks
  // - 1 block: Niveau d’études & diplômes
  // - 1 block: Débouchés & premiers postes
  // - 1 block: Accès au métier & reconversion
  // Data/logic unchanged (reads ctx.blocFields)
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
    // break common bullets into lines
    s = s.replace(/[•·●▪➤➜–—-]\s*/g, "\n");
    var parts = s.split(/\n|;|\||\t/).map(function(x){ return norm(x); }).filter(Boolean);
    if (parts.length <= 1 && s.indexOf(",") >= 0){
      parts = s.split(",").map(function(x){ return norm(x); }).filter(Boolean);
    }
    // dedupe
    var seen = {};
    var out = [];
    for (var i=0;i<parts.length;i++){
      var k = parts[i].toLowerCase();
      if (!seen[k]){ seen[k]=1; out.push(parts[i]); }
    }
    return out;
  }

  function pick(obj, keys){
    for (var i=0;i<keys.length;i++){
      var k = keys[i];
      if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
    }
    return "";
  }

  function waitFor(fn, timeoutMs){
    var t0 = Date.now();
    (function loop(){
      try { if (fn()) return; } catch(e){}
      if (Date.now() - t0 > (timeoutMs||8000)) return;
      setTimeout(loop, 80);
    })();
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
    // insert right before "Environnements de travail" card (same as before)
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
    // we reuse the same card tag/class for sizing in your layout
    return (
      document.querySelector(".u-section-card") ||
      document.querySelector(".section-card") ||
      document.querySelector(".u-card") ||
      document.querySelector("[class*='card']") ||
      document.createElement("div")
    );
  }

  function removePreviouslyInserted(root){
    if (!root) return;
    var nodes = root.querySelectorAll("[data-ulydia-mpb-inserted='1']");
    for (var i=0;i<nodes.length;i++){
      nodes[i].parentNode && nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  // -------------------------
  // BIG BLOCK UI (like "Missions principales")
  // -------------------------
  function styleBigCard(card){
    card.style.background = "#fff";
    card.style.boxShadow = "0 14px 38px rgba(16, 24, 40, 0.08)";
    card.style.border = "1px solid rgba(14, 18, 33, 0.08)";
    card.style.borderRadius = "24px";
    card.style.overflow = "hidden";
    card.style.marginBottom = "22px";
  }

  function buildHeader(card, opts){
    var head = document.createElement("div");
    head.style.background = opts.headerBg || "#CFFCEB";
    head.style.padding = "22px 26px";
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.gap = "14px";

    // Icon circle (simple)
    var icWrap = document.createElement("div");
    icWrap.style.width = "40px";
    icWrap.style.height = "40px";
    icWrap.style.borderRadius = "999px";
    icWrap.style.background = "rgba(0,0,0,0.06)";
    icWrap.style.display = "flex";
    icWrap.style.alignItems = "center";
    icWrap.style.justifyContent = "center";

    var ic = document.createElement("div");
    ic.textContent = opts.icon || "✓";
    ic.style.fontSize = "20px";
    ic.style.fontWeight = "900";
    ic.style.lineHeight = "1";
    ic.style.color = opts.iconColor || "#0B7A5A";
    icWrap.appendChild(ic);

    var title = document.createElement("div");
    title.textContent = opts.title || "";
    title.style.fontSize = "30px";
    title.style.fontWeight = "900";
    title.style.lineHeight = "1.1";

    head.appendChild(icWrap);
    head.appendChild(title);
    card.appendChild(head);
    return head;
  }

  function buildBody(card){
    var body = document.createElement("div");
    body.style.background = "#fff";
    body.style.padding = "26px";
    body.style.paddingTop = "24px";
    card.appendChild(body);
    return body;
  }

  function addSubTitle(body, text){
    if (!text) return;
    var h = document.createElement("div");
    h.textContent = text;
    h.style.fontWeight = "800";
    h.style.opacity = "0.75";
    h.style.marginTop = "16px";
    h.style.marginBottom = "12px";
    body.appendChild(h);
  }

  function addArrowList(body, items, accent){
    if (!items || !items.length) return;

    var ul = document.createElement("div");
    ul.style.display = "grid";
    ul.style.gap = "16px";

    for (var i=0;i<items.length;i++){
      var row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "14px";
      row.style.alignItems = "flex-start";

      var arrow = document.createElement("div");
      arrow.textContent = "→";
      arrow.style.fontSize = "22px";
      arrow.style.lineHeight = "1";
      arrow.style.marginTop = "2px";
      arrow.style.color = accent || "#6B63FF"; // violet/blue like your UI
      arrow.style.fontWeight = "900";
      arrow.style.width = "22px";
      arrow.style.flex = "0 0 22px";

      var txt = document.createElement("div");
      txt.textContent = items[i];
      txt.style.fontSize = "22px";
      txt.style.fontWeight = "800";
      txt.style.lineHeight = "1.25";

      row.appendChild(arrow);
      row.appendChild(txt);
      ul.appendChild(row);
    }

    body.appendChild(ul);
  }

  function buildBigBlock(templateCard, opts){
    var card = templateCard.cloneNode(false);
    card.className = templateCard.className || "";
    card.removeAttribute("id");
    card.setAttribute("data-ulydia-mpb-inserted","1");

    styleBigCard(card);
    buildHeader(card, opts);
    var body = buildBody(card);

    (opts.sections || []).forEach(function(sec){
      if (!sec) return;
      addSubTitle(body, sec.label);
      addArrowList(body, sec.items || [], opts.accent);
    });

    return card;
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

  function run(){
    var ctx = getCtx();
    if (!ctx) return false;

    var bf = getBlocFields(ctx);
    var insertBefore = findInsertBeforeCard();
    var root = findLeftColumnRoot();
    var template = findTemplateCard();

    removePreviouslyInserted(root);

    if (!bf || !insertBefore) {
      hideSoftSkillsIfEmpty();
      return true;
    }

    // Fields (same mapping as before)
    var eduLocal     = pick(bf, ["js_bf_education_level_local","education_level_local","Education level local"]);
    var eduLevel     = pick(bf, ["js_bf_education_level","education_level","Education level"]);
    var degrees      = pick(bf, ["js_bf_degrees_examples","degrees_examples","Degrees examples"]);

    var firstJobs    = pick(bf, ["js_bf_first_job_titles","first_job_titles"]);
    var employers    = pick(bf, ["js_bf_typical_employers","typical_employers"]);
    var hiringSectors= pick(bf, ["js_bf_hiring_sectors","hiring_sectors"]);

    var entryRoutes  = pick(bf, ["js_bf_entry_routes","entry_routes"]);
    var reconversion = pick(bf, ["js_bf_equivalences_reconversion","equivalences_reconversion"]);

    var sEduLocal = splitLines(eduLocal);
    var sEduLvl   = splitLines(eduLevel);
    var sDeg      = splitLines(degrees);

    var sFirst    = splitLines(firstJobs);
    var sEmp      = splitLines(employers);
    var sHire     = splitLines(hiringSectors);

    var sEntry    = splitLines(entryRoutes);
    var sReco     = splitLines(reconversion);

    // Build 3 UNIQUE big blocks (only if they have content)
    var blocks = [];

    var hasEdu = (sEduLocal.length || sEduLvl.length || sDeg.length);
    if (hasEdu){
      blocks.push(buildBigBlock(template, {
        title: "Niveau d’études & diplômes",
        headerBg: "#E7E6FF",
        icon: "🎓",
        iconColor: "#4C43D8",
        accent: "#6B63FF",
        sections: [
          { label: "Niveau requis (local)", items: sEduLocal },
          { label: "Niveau requis", items: sEduLvl },
          { label: "Diplômes (exemples)", items: sDeg }
        ]
      }));
    }

    var hasOut = (sFirst.length || sEmp.length || sHire.length);
    if (hasOut){
      blocks.push(buildBigBlock(template, {
        title: "Débouchés & premiers postes",
        headerBg: "#DDF3FF",
        icon: "🧭",
        iconColor: "#1D6FB8",
        accent: "#6B63FF",
        sections: [
          { label: "Premiers postes", items: sFirst },
          { label: "Employeurs types", items: sEmp },
          { label: "Secteurs qui recrutent", items: sHire }
        ]
      }));
    }

    var hasAccess = (sEntry.length || sReco.length);
    if (hasAccess){
      blocks.push(buildBigBlock(template, {
        title: "Accès au métier & reconversion",
        headerBg: "#CFFCEB", // like "Missions principales"
        icon: "✅",
        iconColor: "#0B7A5A",
        accent: "#6B63FF",
        sections: [
          { label: "Voies d’accès", items: sEntry },
          { label: "Équivalences / reconversion", items: sReco }
        ]
      }));
    }

    // Insert (in the same place) in the correct order
    for (var i=0;i<blocks.length;i++){
      insertBefore.parentNode.insertBefore(blocks[i], insertBefore);
    }

    hideSoftSkillsIfEmpty();
    return true;
  }

  waitFor(run, 10000);
})();
