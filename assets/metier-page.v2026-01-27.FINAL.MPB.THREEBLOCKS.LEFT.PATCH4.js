(function(){
  // =========================================================
  // ULYDIA — Metier_Pays_Blocs (MPB) — LEFT extra cards — PATCH4
  // - Renders ONLY if MPB matches current metier slug + ISO
  // - Inserts BEFORE "Environnements de travail" when possible
  // - Avoids duplicates with right column blocks (schools/tools/certs/portfolio/skills)
  // =========================================================
  if (window.__ULYDIA_MPB_LEFT_PATCH4__) return;
  window.__ULYDIA_MPB_LEFT_PATCH4__ = true;

  function norm(s){ return String(s||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim(); }
  function safeText(s){ return norm(s); }
  function hasValue(v){
    if (v == null) return false;
    if (Array.isArray(v)) return v.some(hasValue);
    var s = safeText(v);
    return !!s;
  }

  function splitLines(v){
    if (!hasValue(v)) return [];
    if (Array.isArray(v)) return v.map(safeText).filter(Boolean);
    var s = String(v||"");
    // Convert <br> to \n, remove &nbsp;
    s = s.replace(/\u00a0/g," ");
    s = s.replace(/<\s*br\s*\/?>/gi, "\n");
    // Remove basic tags
    s = s.replace(/<\/?p[^>]*>/gi,"\n");
    s = s.replace(/<\/?div[^>]*>/gi,"\n");
    s = s.replace(/<\/?li[^>]*>/gi,"\n");
    s = s.replace(/<\/?ul[^>]*>/gi,"\n");
    s = s.replace(/<\/?ol[^>]*>/gi,"\n");
    s = s.replace(/<[^>]+>/g,"");
    s = s.replace(/\r/g,"");
    // Split
    return s.split("\n").map(function(x){ return safeText(x); }).filter(Boolean);
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || null;
  }

  function mpbMatches(ctx){
    if (!ctx) return false;
    var bf = ctx.blocFields || ctx.bloc_fields || null;
    if (!bf) return false;

    // Keys come from BLOCFLATTEN normalizeKey: "js-bloc-metier" => "js_bloc_metier"
    var m = safeText(bf.js_bloc_metier || bf.bloc_metier || bf.metier || "");
    var iso = safeText(bf.js_bloc_iso || bf.bloc_iso || bf.iso || "");

    // If the MPB wrapper doesn't provide metier/iso, consider it unsafe => don't render
    if (!m || !iso) return false;

    var curM = safeText(ctx.slug || ctx.metierSlug || ctx.metier_slug || "");
    var curIso = safeText(ctx.iso || ctx.countryIso || ctx.country_iso || "");

    return (!!curM && !!curIso && m === curM && iso.toUpperCase() === curIso.toUpperCase());
  }

  function pickFirst(bf, keys){
    for (var i=0;i<keys.length;i++){
      var k = keys[i];
      if (k in bf && hasValue(bf[k])) return bf[k];
    }
    return "";
  }

  function findEnvCard(){
    var cards = Array.prototype.slice.call(document.querySelectorAll(".u-section-card, .section-card, [data-ul-card], .w-richtext")).filter(Boolean);
    // Look for a header/title containing "Environnements de travail"
    var all = Array.prototype.slice.call(document.querySelectorAll("body *"));
    for (var i=0;i<all.length;i++){
      var el = all[i];
      if (!el || !el.textContent) continue;
      var t = norm(el.textContent);
      if (t === "Environnements de travail" || t.indexOf("Environnements de travail") === 0){
        // card is probably ancestor
        var p = el;
        for (var j=0;j<8 && p; j++){
          if (p.classList && (p.classList.contains("u-section-card") || p.classList.contains("section-card"))) return p;
          p = p.parentElement;
        }
      }
    }
    return null;
  }

  function buildCard(templateCard, opt){
    var card = templateCard.cloneNode(true);
    card.removeAttribute("id");
    card.setAttribute("data-ul-mpb-extra","1");

    // Clean existing content
    var header = card.querySelector(".u-card-header, .card-header, .section-header") || card.firstElementChild;
    var titleEl = card.querySelector(".u-section-title, .section-title, h3, h2") || null;
    var body = card.querySelector(".u-card-body, .card-body, .section-body") || card;

    // If no explicit title node, create one inside header
    if (!titleEl){
      titleEl = document.createElement("div");
      titleEl.className = "u-section-title";
      if (header) header.appendChild(titleEl);
      else card.insertBefore(titleEl, card.firstChild);
    }

    titleEl.textContent = (opt.emoji ? (opt.emoji+" ") : "") + opt.title;

    // Reset body
    // Try to locate a content container; if not, create a simple div
    var content = body.querySelector(".u-card-content, .card-content, .section-content") || null;
    if (!content){
      content = document.createElement("div");
      content.className = "u-card-content";
      body.appendChild(content);
    } else {
      content.innerHTML = "";
    }

    // Typography alignment: inherit existing site styles
    content.style.fontFamily = "inherit";
    content.style.fontSize = "inherit";
    content.style.lineHeight = "inherit";

    var sections = opt.sections || [];
    sections.forEach(function(sec){
      if (!sec || !sec.items || !sec.items.length) return;

      var h = document.createElement("div");
      h.style.fontWeight = "600";
      h.style.marginTop = "10px";
      h.style.marginBottom = "6px";
      h.textContent = sec.label;
      content.appendChild(h);

      var ul = document.createElement("ul");
      ul.style.margin = "0";
      ul.style.paddingLeft = "18px";
      ul.style.display = "grid";
      ul.style.gap = "6px";

      sec.items.forEach(function(line){
        var li = document.createElement("li");
        li.textContent = line;
        ul.appendChild(li);
      });

      content.appendChild(ul);
    });

    return card;
  }

  function main(){
    var ctx = getCtx();
    if (!ctx || !ctx.blocFields) { setTimeout(main, 80); return; }

    // Remove previous injected MPB extra cards (if any) to avoid duplicates on SPA-like nav
    Array.prototype.slice.call(document.querySelectorAll('[data-ul-mpb-extra="1"]')).forEach(function(n){
      try { n.parentNode && n.parentNode.removeChild(n); } catch(e){}
    });

    if (!mpbMatches(ctx)) return;

    var bf = ctx.blocFields;
    // Only fields that are NOT already shown elsewhere
    var educationLevelLocal = pickFirst(bf, ["js_bf_education_level_local"]);
    var educationLevel      = pickFirst(bf, ["js_bf_education_level"]);
    var degreesExamples     = pickFirst(bf, ["js_bf_degrees_examples"]);
    var entryRoutes         = pickFirst(bf, ["js_bf_entry_routes"]);
    var reconversion        = pickFirst(bf, ["js_bf_equivalences_reconversion"]);
    var firstJobs           = pickFirst(bf, ["js_bf_first_job_titles"]);
    var employers           = pickFirst(bf, ["js_bf_typical_employers"]);
    var hiringSectors       = pickFirst(bf, ["js_bf_hiring_sectors"]);

    // Build sections content
    var sEdu = [];
    if (hasValue(educationLevelLocal)) sEdu = sEdu.concat(splitLines(educationLevelLocal));
    if (hasValue(educationLevel)) sEdu = sEdu.concat(splitLines(educationLevel));
    var sDeg = splitLines(degreesExamples);

    var sFirst = splitLines(firstJobs);
    var sEmp = splitLines(employers);
    var sHire = splitLines(hiringSectors);

    var sEntry = splitLines(entryRoutes);
    var sReco = splitLines(reconversion);

    // If everything empty => nothing to render
    var any = (sEdu.length||sDeg.length||sFirst.length||sEmp.length||sHire.length||sEntry.length||sReco.length);
    if (!any) return;

    // Find a template card from existing blocks (keeps exact fonts/sizes)
    var templateCard =
      document.querySelector(".u-section-card") ||
      document.querySelector(".section-card") ||
      document.querySelector(".u-card") ||
      document.querySelector("[class*='card']");

    if (!templateCard) return;

    // Create cards
    var cardsToInsert = [];

    if (sEdu.length || sDeg.length){
      cardsToInsert.push(buildCard(templateCard, {
        emoji: "📚",
        title: "Niveau d’études & diplômes",
        sections: [
          { label: "Niveau requis", items: sEdu },
          { label: "Diplômes (exemples)", items: sDeg }
        ].filter(function(x){ return x.items && x.items.length; })
      }));
    }

    if (sFirst.length || sEmp.length || sHire.length){
      cardsToInsert.push(buildCard(templateCard, {
        emoji: "🧭",
        title: "Débouchés & premiers postes",
        sections: [
          { label: "Premiers postes", items: sFirst },
          { label: "Employeurs types", items: sEmp },
          { label: "Secteurs qui recrutent", items: sHire }
        ].filter(function(x){ return x.items && x.items.length; })
      }));
    }

    if (sEntry.length || sReco.length){
      cardsToInsert.push(buildCard(templateCard, {
        emoji: "🔁",
        title: "Accès & reconversion",
        sections: [
          { label: "Voies d’accès", items: sEntry },
          { label: "Équivalences / reconversion", items: sReco }
        ].filter(function(x){ return x.items && x.items.length; })
      }));
    }

    if (!cardsToInsert.length) return;

    // Insert before "Environnements de travail" when possible
    var envCard = findEnvCard();
    var anchor = envCard;
    var parent = anchor ? anchor.parentNode : null;

    if (!parent){
      // fallback: insert after the first big left column block
      var firstCard = document.querySelector(".u-section-card, .section-card");
      anchor = firstCard;
      parent = anchor ? anchor.parentNode : null;
    }
    if (!parent) return;

    cardsToInsert.forEach(function(c){
      try{
        parent.insertBefore(c, anchor); // if anchor null => appends at end
      } catch(e){}
    });
  }

  main();
})();