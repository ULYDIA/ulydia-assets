(function(){
  // =========================================================
  // ULYDIA — Metier_Pays_Blocs (MPB) — LEFT 3 blocks — PATCH5
  // - Renders ONLY if MPB matches current metier slug + ISO
  // - Inserts BEFORE "Environnements de travail" when possible
  // - NO wrapper background (each block is its own card like the others)
  // - Cleans &nbsp; and line-breaks into proper lists
  // =========================================================
  if (window.__ULYDIA_MPB_LEFT_3BLOCKS_PATCH5__) return;
  window.__ULYDIA_MPB_LEFT_3BLOCKS_PATCH5__ = true;

  function norm(s){ return String(s||"").replace(/\u00a0/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim(); }
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
    s = s.replace(/\u00a0/g," ").replace(/&nbsp;/g," ");
    // Convert <br> and common block tags to newlines
    s = s.replace(/<\s*br\s*\/?>/gi, "\n");
    s = s.replace(/<\/?p[^>]*>/gi,"\n");
    s = s.replace(/<\/?div[^>]*>/gi,"\n");
    s = s.replace(/<\/?li[^>]*>/gi,"\n");
    s = s.replace(/<\/?ul[^>]*>/gi,"\n");
    s = s.replace(/<\/?ol[^>]*>/gi,"\n");
    // Strip remaining tags
    s = s.replace(/<[^>]+>/g,"");
    s = s.replace(/\r/g,"");
    return s.split("\n").map(function(x){ return safeText(x); }).filter(Boolean);
  }

  function getCtx(){ return window.__ULYDIA_METIER_PAGE_CTX__ || null; }

  function mpbMatches(ctx){
    if (!ctx) return false;
    var bf = ctx.blocFields || ctx.bloc_fields || null;
    if (!bf) return false;

    // From BLOCFLATTEN normalizeKey: "js-bloc-metier" => "js_bloc_metier"
    var m   = safeText(bf.js_bloc_metier || bf.bloc_metier || bf.metier || "");
    var iso = safeText(bf.js_bloc_iso    || bf.bloc_iso    || bf.iso    || "");

    // Unsafe => don't render
    if (!m || !iso) return false;

    var curM   = safeText(ctx.slug || ctx.metierSlug || ctx.metier_slug || "");
    var curIso = safeText(ctx.iso  || ctx.countryIso || ctx.country_iso || "");

    return (!!curM && !!curIso && m === curM && iso.toUpperCase() === curIso.toUpperCase());
  }

  function pickFirst(bf, keys){
    for (var i=0;i<keys.length;i++){
      var k = keys[i];
      if ((k in bf) && hasValue(bf[k])) return bf[k];
    }
    return "";
  }

  function findEnvCard(){
    // Try to find the "Environnements de travail" header, then climb to the card container
    var all = Array.prototype.slice.call(document.querySelectorAll("body *"));
    for (var i=0;i<all.length;i++){
      var el = all[i];
      if (!el || !el.textContent) continue;
      var t = norm(el.textContent);
      if (t === "Environnements de travail" || t.indexOf("Environnements de travail") === 0){
        var p = el;
        for (var j=0;j<10 && p; j++){
          if (p.classList && (
            p.classList.contains("u-section-card") ||
            p.classList.contains("section-card") ||
            p.classList.contains("u-card")
          )) return p;
          p = p.parentElement;
        }
      }
    }
    return null;
  }

  // =====================================================
  // UNWRAP any MPB wrapper that creates a "card inside a card"
  // We keep ONLY individual cards inserted by this patch.
  // =====================================================
  function unwrapMPBLeftWrappers(){
    var sel = [
      ".js-mpb-left-wrapper",
      ".mpb-left-wrapper",
      ".mpb-extra-wrapper",
      "[data-ul-mpb-wrapper]",
      "[data-ul-mpb-wrap]",
      "[data-ul-mpb-left-wrap]"
    ].join(",");

    var wrappers = document.querySelectorAll(sel);
    wrappers.forEach(function(wrapper){
      var parent = wrapper.parentNode;
      if (!parent) return;
      while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
      wrapper.remove();
    });
  }

  // =====================================================
  // Build one card by cloning an existing card
  // - Keeps typography identical (we DO NOT set font-size)
  // - Only adjusts spacing within content
  // =====================================================
  function buildCard(templateCard, opt){
    var card = templateCard.cloneNode(true);
    card.removeAttribute("id");
    card.setAttribute("data-ul-mpb-extra","1");

    // Try to identify header/title/body areas
    var header = card.querySelector(".u-card-header, .card-header, .section-header") || card.firstElementChild;
    var titleEl = card.querySelector(".u-section-title, .section-title, h3, h2") || null;
    var body = card.querySelector(".u-card-body, .card-body, .section-body") || card;

    // Ensure there's a title node
    if (!titleEl){
      titleEl = document.createElement("div");
      titleEl.className = "u-section-title";
      if (header) header.appendChild(titleEl);
      else card.insertBefore(titleEl, card.firstChild);
    }
    titleEl.textContent = (opt.emoji ? (opt.emoji+" ") : "") + opt.title;

    // Use / create content container
    var content = body.querySelector(".u-card-content, .card-content, .section-content") || null;
    if (!content){
      content = document.createElement("div");
      content.className = "u-card-content";
      body.appendChild(content);
    } else {
      content.innerHTML = "";
    }

    // Minimal spacing only (typography inherits)
    content.style.display = "grid";
    content.style.gap = "10px";

    (opt.sections || []).forEach(function(sec){
      if (!sec || !sec.items || !sec.items.length) return;

      var block = document.createElement("div");

      var h = document.createElement("div");
      h.style.fontWeight = "600";
      h.style.marginBottom = "6px";
      h.textContent = sec.label;
      block.appendChild(h);

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

      block.appendChild(ul);
      content.appendChild(block);
    });

    return card;
  }

  function findTemplateCard(){
    // Prefer a left-column card if possible
    return (
      document.querySelector(".u-section-card") ||
      document.querySelector(".section-card") ||
      document.querySelector(".u-card") ||
      document.querySelector("[class*='card']")
    );
  }

  function main(){
    unwrapMPBLeftWrappers();

    var ctx = getCtx();
    if (!ctx || !ctx.blocFields) { setTimeout(main, 120); return; }

    // Clean previous injected cards (SPA navigation safety)
    Array.prototype.slice.call(document.querySelectorAll('[data-ul-mpb-extra="1"]')).forEach(function(n){
      try { n.parentNode && n.parentNode.removeChild(n); } catch(e){}
    });

    if (!mpbMatches(ctx)) return;

    var bf = ctx.blocFields;

    // Fields from MPB (not already shown elsewhere)
    var educationLevelLocal = pickFirst(bf, ["js_bf_education_level_local"]);
    var educationLevel      = pickFirst(bf, ["js_bf_education_level"]);
    var degreesExamples     = pickFirst(bf, ["js_bf_degrees_examples"]);

    var firstJobs           = pickFirst(bf, ["js_bf_first_job_titles"]);
    var employers           = pickFirst(bf, ["js_bf_typical_employers"]);
    var hiringSectors       = pickFirst(bf, ["js_bf_hiring_sectors"]);

    var entryRoutes         = pickFirst(bf, ["js_bf_entry_routes"]);
    var reconversion        = pickFirst(bf, ["js_bf_equivalences_reconversion"]);

    // Build arrays
    var sEdu = [];
    if (hasValue(educationLevelLocal)) sEdu = sEdu.concat(splitLines(educationLevelLocal));
    if (hasValue(educationLevel))      sEdu = sEdu.concat(splitLines(educationLevel));
    var sDeg   = splitLines(degreesExamples);

    var sFirst = splitLines(firstJobs);
    var sEmp   = splitLines(employers);
    var sHire  = splitLines(hiringSectors);

    var sEntry = splitLines(entryRoutes);
    var sReco  = splitLines(reconversion);

    var any = (sEdu.length||sDeg.length||sFirst.length||sEmp.length||sHire.length||sEntry.length||sReco.length);
    if (!any) return;

    var templateCard = findTemplateCard();
    if (!templateCard) return;

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
        title: "Accès au métier & reconversion",
        sections: [
          { label: "Voies d’accès", items: sEntry },
          { label: "Équivalences / reconversion", items: sReco }
        ].filter(function(x){ return x.items && x.items.length; })
      }));
    }

    if (!cardsToInsert.length) return;

    // Insert before "Environnements de travail"
    var envCard = findEnvCard();
    var anchor = envCard;
    var parent = anchor ? anchor.parentNode : null;

    if (!parent){
      // Fallback: insert after first left card
      var firstCard = document.querySelector(".u-section-card, .section-card, .u-card, [class*='card']");
      anchor = firstCard;
      parent = anchor ? anchor.parentNode : null;
    }
    if (!parent) return;

    cardsToInsert.forEach(function(c){
      try{
        parent.insertBefore(c, anchor || null);
      } catch(e){}
    });

    // Final unwrap pass (some themes wrap newly inserted nodes)
    setTimeout(unwrapMPBLeftWrappers, 50);
  }

  // Start
  main();
})();