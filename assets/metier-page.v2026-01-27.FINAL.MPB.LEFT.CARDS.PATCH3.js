(function(){
  // =========================================================
  // ULYDIA — MPB Extra Blocks (LEFT) + Hide Empty SoftSkills
  // V2026-01-27 FINAL PATCH5
  // - Renders MPB (Metier_Pays_Blocs) "extra" fields as cards on LEFT column
  // - Only renders when MPB for current (metier,country) exists (ctx.blocFields)
  // - Keeps typography by cloning an existing card template
  // - Removes &nbsp; and formats content into lists/lines
  // - Hides "🧠 Soft Skills essentiels" card if empty
  // =========================================================

  function norm(s){
    return String(s||"")
      .replace(/\u00A0/g, " ")        // nbsp
      .replace(/&nbsp;/gi, " ")       // html nbsp
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitLines(v){
    v = String(v||"").replace(/&nbsp;/g," ").replace(/\u00a0/g," ");
    v = v.replace(/<br\s*\/?>/gi, "\n");
    v = v.replace(/<[^>]*>/g,""); // strip html tags
    return v.split(/\n|\r\n|\u2028|\u2029|\s*•\s*/g)
      .map(function(x){ return String(x||"").replace(/\s+/g," ").trim(); })
      .filter(Boolean);
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

  function hasAny(arr){ return Array.isArray(arr) && arr.length>0; }

  function waitFor(fn, timeoutMs){
    var t0 = Date.now();
    (function loop(){
      try {
        var res = fn();
        if (res) return;
      } catch(e){}
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
    // Prefer already-resolved blocFields from BASE
    if (ctx && ctx.blocFields) return ctx.blocFields;
    // Some builds store it as ctx.bloc.fieldData
    if (ctx && ctx.bloc && (ctx.bloc.fieldData || ctx.bloc.fields)) return (ctx.bloc.fieldData || ctx.bloc.fields);
    return null;
  }

  function findLeftColumnRoot(){
    // Best-effort: the left column is where the big cards live
    // Try to find a card titled "Environnements de travail", then use its parent as root.
    var headers = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,div,span"));
    for (var i=0;i<headers.length;i++){
      var tx = norm(headers[i].textContent);
      if (tx === "Environnements de travail"){
        var card = headers[i].closest(".u-section-card,.section-card,.u-card,[class*='card']");
        if (card) return card.parentElement || card;
      }
    }
    // fallback: main root
    return document.querySelector("#ulydia-metier-root") || document.body;
  }

  function findInsertBeforeCard(){
    // Insert BEFORE "Environnements de travail" (as requested)
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

  function findTemplateCard(){
    // Use an existing left-column card for typography
    // Prefer the card right before Environnements de travail, else any big card.
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

  function setHeaderColor(card, bgColor){
    var header =
      card.querySelector(".u-section-card__header, .section-card__header, .card__header, [class*='header']") ||
      null;

    // If we can't find a header wrapper, create one similar to others
    if (!header){
      header = document.createElement("div");
      header.style.borderTopLeftRadius = "14px";
      header.style.borderTopRightRadius = "14px";
      header.style.padding = "14px 18px";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "10px";

      // Try to place at top
      var first = card.firstElementChild;
      card.insertBefore(header, first || null);

      // Ensure body has padding
      card.style.overflow = "hidden";
    }

    header.style.background = bgColor;
    return header;
  }

  function clearCardBody(card, header){
    // remove everything except header
    var kids = Array.prototype.slice.call(card.children);
    for (var i=0;i<kids.length;i++){
      if (kids[i] !== header) card.removeChild(kids[i]);
    }
    // body container
    var body = document.createElement("div");
    body.style.padding = "16px 18px 18px";
    card.appendChild(body);
    return body;
  }

  function buildCard(templateCard, opts){
    var card = templateCard.cloneNode(true);

    // Keep the original card classes/styles from the template, but rebuild content
    var parts = clearCardBody(card);
    var header = parts.header;
    var body   = parts.body;

    // Header = colored bar + title (no extra wrapper to avoid "double card" look)
    header.style.background = opts.bg;
    header.style.color = "#0b1220";
    header.style.padding = "14px 16px";
    header.style.borderTopLeftRadius  = "16px";
    header.style.borderTopRightRadius = "16px";
    header.style.borderBottomLeftRadius  = "0";
    header.style.borderBottomRightRadius = "0";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "10px";

    // Clear any template title leftovers
    header.innerHTML = "";

    var icon = document.createElement("span");
    icon.textContent = opts.icon || "";
    icon.style.fontSize = "18px";
    icon.style.lineHeight = "1";
    header.appendChild(icon);

    var title = document.createElement("div");
    title.textContent = opts.title;
    // Let the page typography drive the font; only ensure bold like other blocks
    title.style.fontWeight = "800";
    title.style.fontSize = "18px";
    title.style.lineHeight = "1.2";
    header.appendChild(title);

    // Body padding like other blocks
    body.style.padding = "16px";
    body.style.background = "transparent";

    (opts.sections||[]).forEach(function(sec){
      if (!sec) return;

      var items = (sec.items||[]).filter(Boolean);
      if (!items.length) return;

      var secWrap = document.createElement("div");
      secWrap.style.marginTop = "10px";

      var h = document.createElement("div");
      h.textContent = sec.label;
      h.style.fontWeight = "700";
      h.style.margin = "4px 0 8px";
      h.style.fontSize = "16px";
      secWrap.appendChild(h);

      var ul = document.createElement("ul");
      ul.style.margin = "0";
      ul.style.paddingLeft = "18px";

      items.forEach(function(it){
        var li = document.createElement("li");
        li.textContent = it;
        li.style.margin = "6px 0";
        ul.appendChild(li);
      });

      secWrap.appendChild(ul);
      body.appendChild(secWrap);
    });

    // small top spacing between cards is handled by layout; add margin for safety
    card.style.marginTop = "14px";
    card.style.overflow = "hidden";

    return card;
  }

      if (Array.isArray(sec.items) && sec.items.length){
        var ul = document.createElement("ul");
        ul.style.margin = "0";
        ul.style.paddingLeft = "18px";
        ul.style.display = "grid";
        ul.style.gap = "6px";
        sec.items.forEach(function(it){
          var li = document.createElement("li");
          li.textContent = it;
          body.appendChild(ul);
          ul.appendChild(li);
        });
      } else if (sec.text){
        var p = document.createElement("div");
        p.textContent = sec.text;
        p.style.whiteSpace = "pre-line";
        body.appendChild(p);
      }
    });

    return card;
  }

  function removePreviouslyInserted(root){
    if (!root) return;
    var nodes = root.querySelectorAll("[data-ulydia-mpb-inserted='1']");
    for (var i=0;i<nodes.length;i++){
      nodes[i].parentNode && nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  function hideSoftSkillsIfEmpty(){
    // Find the "Soft Skills essentiels" card and hide if no chips/items
    var candidates = Array.prototype.slice.call(document.querySelectorAll(".u-section-card,.section-card,.u-card,[class*='card']"));
    for (var i=0;i<candidates.length;i++){
      var card = candidates[i];
      var txt = norm(card.textContent);
      if (txt.indexOf("Soft Skills essentiels") !== -1){
        // consider content excluding header
        var items = card.querySelectorAll("li,.u-chip,.chip,[class*='chip'],[data-chip]");
        var hasItem = false;
        for (var j=0;j<items.length;j++){
          if (norm(items[j].textContent)) { hasItem=true; break; }
        }
        // fallback: look for multiple lines under header
        if (!hasItem){
          // try to detect at least 1 non-title word below header
          var t = norm(card.textContent).replace(/Soft Skills essentiels/ig,"").trim();
          hasItem = t.length > 2;
        }
        if (!hasItem){
          card.style.display = "none";
        } else {
          card.style.display = "";
        }
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

    // Clean any old inserts (safety)
    removePreviouslyInserted(root);

    // If no MPB for current metier/country => do not render anything
    if (!bf || !template || !insertBefore) {
      hideSoftSkillsIfEmpty();
      return true;
    }

    // Pull fields (your wrapper classes)
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

    // 📚 Education card (different bg requested)
    if (sEdu.length || sDeg.length){
      cards.push(buildCard(template, {
        emoji: "📚",
        title: "Niveau d’études & diplômes",
        bg: "#CFEDE3",
        sections: [
          { label: "Niveau requis", items: sEdu },
          { label: "Diplômes (exemples)", items: sDeg }
        ]
      }));
    }

    // 💼 First roles card
    if (sFirst.length || sEmp.length || sHire.length){
      cards.push(buildCard(template, {
        emoji: "💼",
        title: "Débouchés & premiers postes",
        bg: "#D7ECFF",
        sections: [
          { label: "Premiers postes", items: sFirst },
          { label: "Employeurs types", items: sEmp },
          { label: "Secteurs qui recrutent", items: sHire }
        ]
      }));
    }

    // 🧭 Entry routes / reconversion card
    if (sEntry.length || sReco.length){
      cards.push(buildCard(template, {
        emoji: "🧭",
        title: "Accès au métier & reconversion",
        bg: "#F8E5FF",
        sections: [
          { label: "Voies d’accès", items: sEntry },
          { label: "Équivalences / reconversion", items: sReco }
        ]
      }));
    }

    // insert cards before Environnements de travail
    for (var i=0;i<cards.length;i++){
      insertBefore.parentNode.insertBefore(cards[i], insertBefore);
    }

    hideSoftSkillsIfEmpty();
    return true;
  }

  waitFor(run, 10000);
})();