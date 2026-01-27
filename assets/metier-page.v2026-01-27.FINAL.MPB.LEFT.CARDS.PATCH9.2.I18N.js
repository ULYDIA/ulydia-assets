(function(){
  // =========================================================
  // ULYDIA — MPB LEFT — PATCH9.2 (i18n-ready)
  // - Same as PATCH9.1 (unwrap insertion + hide empty soft skills)
  // - Uses window.__t__(key) for ALL fixed texts (titles/labels)
  // - Safe fallback: if __t__ missing, uses FR strings.
  // =========================================================

  function t(key, fallback){
    try {
      if (typeof window.__t__ === "function") return window.__t__(key) || fallback || key;
    } catch(e){}
    return fallback || key;
  }

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
      if (Date.now() - t0 > (timeoutMs||15000)) return;
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

  function removeInsertedEverywhere(){
    var nodes = document.querySelectorAll("[data-ulydia-mpb-inserted='1']");
    for (var i=0;i<nodes.length;i++){
      nodes[i].parentNode && nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  function findEnvCard(){
    var byId = document.querySelector("#environnements-title");
    if (byId){
      var c1 = byId.closest(".card,.u-section-card,.section-card,.u-card,[class*='card']");
      if (c1) return c1;
    }
    var nodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,div,span"));
    for (var i=0;i<nodes.length;i++){
      var tx = norm(nodes[i].textContent);
      if (tx === t("environments", "Environnements de travail") || tx === "Environnements de travail"){
        var c = nodes[i].closest(".card,.u-section-card,.section-card,.u-card,[class*='card']");
        if (c) return c;
      }
    }
    return null;
  }

  function getOutermostCard(card){
    var current = card;
    while (current && current.parentElement){
      var parentCard = current.parentElement.closest(".card");
      if (parentCard && parentCard !== current){
        current = parentCard;
        continue;
      }
      break;
    }
    return current;
  }

  function buildCard(opts){
    var card = el("div", {"class":"card", "data-ulydia-mpb-inserted":"1"});
    card.style.marginBottom = "28px";

    var header = el("div", {"class":"card-header " + (opts.pastelClass || "pastel-purple")});
    var h2 = el("h2", {"class":"section-title"});
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
      }
    });

    card.appendChild(header);
    card.appendChild(body);
    return card;
  }

  function hideSoftSkillsIfEmpty(){
    var cards = Array.prototype.slice.call(
      document.querySelectorAll(".card,.u-section-card,.section-card,.u-card,[class*='card']")
    );

    var label = t("soft_skills", "Soft Skills essentiels");

    for (var i=0;i<cards.length;i++){
      var card = cards[i];
      var txt = norm(card.textContent);

      if (txt.indexOf(label) !== -1 || txt.indexOf("Soft Skills essentiels") !== -1){
        var rest = txt.replace(new RegExp(label, "ig"), "").replace(/Soft Skills essentiels/ig,"").trim();
        var liCount = card.querySelectorAll("li").length;
        var hasMeaningfulText = rest.length > 10;
        card.style.display = (liCount > 0 || hasMeaningfulText) ? "" : "none";
      }
    }
  }

  function run(){
    var ctx = getCtx();
    if (!ctx) return false;

    var bf = getBlocFields(ctx);
    var envCard = findEnvCard();

    hideSoftSkillsIfEmpty();

    if (!bf || !envCard) return false;

    removeInsertedEverywhere();

    var anchor = getOutermostCard(envCard);
    var parent = anchor && anchor.parentNode ? anchor.parentNode : null;
    if (!parent) return false;

    var eduLocal      = pick(bf, ["js_bf_education_level_local","education_level_local","Education level local"]);
    var eduLevel      = pick(bf, ["js_bf_education_level","education_level","Education level"]);
    var degrees       = pick(bf, ["js_bf_degrees_examples","degrees_examples","Degrees examples"]);

    var firstJobs     = pick(bf, ["js_bf_first_job_titles","first_job_titles"]);
    var employers     = pick(bf, ["js_bf_typical_employers","typical_employers"]);
    var hiringSectors = pick(bf, ["js_bf_hiring_sectors","hiring_sectors"]);

    var entryRoutes   = pick(bf, ["js_bf_entry_routes","entry_routes"]);
    var reconversion  = pick(bf, ["js_bf_equivalences_reconversion","equivalences_reconversion"]);

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
        title: t("education_title", "Niveau d’études & diplômes"),
        emoji: "🎓",
        pastelClass: "pastel-purple",
        sections: [
          { label: t("education_local", "Niveau requis (local)"), items: sEduLocal },
          { label: t("education_required", "Niveau requis"), items: sEduLvl },
          { label: t("degrees_examples", "Diplômes (exemples)"), items: sDeg }
        ]
      }));
    }

    if (sFirst.length || sEmp.length || sHire.length){
      cards.push(buildCard({
        title: t("outcomes_title", "Débouchés & premiers postes"),
        emoji: "⏱️",
        pastelClass: "pastel-cyan",
        sections: [
          { label: t("first_jobs", "Premiers postes"), items: sFirst },
          { label: t("employers", "Employeurs types"), items: sEmp },
          { label: t("hiring_sectors", "Secteurs qui recrutent"), items: sHire }
        ]
      }));
    }

    if (sEntry.length || sReco.length){
      cards.push(buildCard({
        title: t("access_title", "Accès au métier & reconversion"),
        emoji: "🚪",
        pastelClass: "pastel-green",
        sections: [
          { label: t("access_routes", "Voies d’accès"), items: sEntry },
          { label: t("reconversion", "Équivalences / reconversion"), items: sReco }
        ]
      }));
    }

    if (!cards.length){
      hideSoftSkillsIfEmpty();
      return true;
    }

    for (var i=0;i<cards.length;i++){
      parent.insertBefore(cards[i], anchor);
    }

    cards[cards.length - 1].style.marginBottom = "40px";

    hideSoftSkillsIfEmpty();
    return true;
  }

  waitFor(run, 15000);
})();