(function(){
  // =========================================================
  // ULYDIA — MPB LEFT — 3 SEPARATE CARDS (no wrapper)
  // PATCH8 — DESIGN ONLY (structure like provided HTML)
  // - Creates 3 sibling .card blocks (stacked with spacing)
  // - Uses: .card, .card-header, .pastel-*, .section-title, .rich-content
  // - Does NOT group them inside any container card
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
      if (Date.now() - t0 > (timeoutMs||10000)) return;
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
    // Insert right before "Environnements de travail" card
    var headers = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,div,span"));
    for (var i=0;i<headers.length;i++){
      var tx = norm(headers[i].textContent);
      if (tx === "Environnements de travail"){
        var card = headers[i].closest(".card,.u-section-card,.section-card,.u-card,[class*='card']");
        if (card) return card;
      }
    }
    // fallback: try id from reference HTML
    var byId = document.querySelector("#environnements-title");
    if (byId){
      var c = byId.closest(".card,.u-section-card,.section-card,.u-card,[class*='card']");
      if (c) return c;
    }
    return null;
  }

  function removePreviouslyInserted(scope){
    scope = scope || document;
    var nodes = scope.querySelectorAll("[data-ulydia-mpb-inserted='1']");
    for (var i=0;i<nodes.length;i++){
      nodes[i].parentNode && nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  function el(tag, attrs){
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function(k){
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    return n;
  }

  function buildCard(opts){
    // We use the same classes as your HTML reference:
    // <div class="card"><div class="card-header pastel-*"><h2 class="section-title">…</h2></div><div class="rich-content">…</div></div>
    var card = el("div", {"class":"card", "data-ulydia-mpb-inserted":"1"});
    // Ensure spacing between cards even if parent doesn't use space-y
    card.style.marginBottom = "32px";

    var header = el("div", {"class":"card-header " + (opts.pastelClass || "pastel-purple")});
    var h2 = el("h2", {"class":"section-title"});
    // Icon SVG optional; keep simple emoji if you prefer
    h2.textContent = (opts.emoji ? (opts.emoji + " ") : "") + (opts.title || "");
    header.appendChild(h2);

    var body = el("div", {"class":"rich-content"});

    (opts.sections || []).forEach(function(sec){
      if (!sec) return;
      if (sec.label){
        var h4 = el("h4");
        h4.textContent = sec.label;
        body.appendChild(h4);
      }
      if (Array.isArray(sec.items) && sec.items.length){
        var ul = el("ul");
        sec.items.forEach(function(it){
          var li = el("li");
          li.textContent = it;
          ul.appendChild(li);
        });
        body.appendChild(ul);
      } else if (sec.text){
        var p = el("p");
        p.textContent = sec.text;
        body.appendChild(p);
      }
    });

    card.appendChild(header);
    card.appendChild(body);
    return card;
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

  function run(){
    var ctx = getCtx();
    if (!ctx) return false;

    var bf = getBlocFields(ctx);
    var insertBefore = findInsertBeforeCard();
    if (!bf || !insertBefore) { hideSoftSkillsIfEmpty(); return true; }

    // Clean any previous insertion near the same column
    removePreviouslyInserted(insertBefore.parentNode || document);

    // Fields (same mapping as your previous patch)
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

    var cards = [];

    if (sEduLocal.length || sEduLvl.length || sDeg.length){
      cards.push(buildCard({
        title: "Niveau d’études & diplômes",
        emoji: "🎓",
        pastelClass: "pastel-purple",
        sections: [
          { label: "Niveau requis (local)", items: sEduLocal },
          { label: "Niveau requis", items: sEduLvl },
          { label: "Diplômes (exemples)", items: sDeg }
        ]
      }));
    }

    if (sFirst.length || sEmp.length || sHire.length){
      cards.push(buildCard({
        title: "Débouchés & premiers postes",
        emoji: "⏱️",
        pastelClass: "pastel-cyan",
        sections: [
          { label: "Premiers postes", items: sFirst },
          { label: "Employeurs types", items: sEmp },
          { label: "Secteurs qui recrutent", items: sHire }
        ]
      }));
    }

    if (sEntry.length || sReco.length){
      cards.push(buildCard({
        title: "Accès au métier & reconversion",
        emoji: "🚪",
        pastelClass: "pastel-green",
        sections: [
          { label: "Voies d’accès", items: sEntry },
          { label: "Équivalences / reconversion", items: sReco }
        ]
      }));
    }

    // Insert as SIBLINGS directly in the column (no wrapper)
    var parent = insertBefore.parentNode.parentNode;
    for (var i=0;i<cards.length;i++){
      parent.insertBefore(cards[i], insertBefore);
    }

    hideSoftSkillsIfEmpty();
    return true;
  }

  waitFor(run, 12000);
})();