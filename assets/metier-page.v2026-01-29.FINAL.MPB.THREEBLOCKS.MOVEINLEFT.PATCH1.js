/*!
ULYDIA — MOVE 3 MPB BLOCKS INTO LEFT FLOW — PATCH1 — 2026-01-29
Problem:
- The 3 MPB cards ("Niveau d’études & diplômes", "Débouchés & premiers postes", "Accès au métier & reconversion")
  are currently rendered at the bottom of the page.
Goal:
- Move them to the correct place: between "Compétences clés" and "Environnements de travail".

How:
- Find the existing rendered blocks by their header titles (tolerant matching)
- Find anchor blocks by titles:
    AFTER: "Compétences clés"
    BEFORE: "Environnements de travail"
- Move (append) the 3 blocks in the right order, preserving their DOM nodes (no re-render)

Safe:
- Runs once
- No crash if not found
- No duplicates; only moves existing nodes
*/

(function(){
  "use strict";
  if (window.__ULYDIA_MOVE_MPB3_PATCH1__) return;
  window.__ULYDIA_MOVE_MPB3_PATCH1__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, ["[move.mpb3]"].concat([].slice.call(arguments))); }
  function warn(){ if(console && console.warn) console.warn.apply(console, ["[move.mpb3]"].concat([].slice.call(arguments))); }

  function norm(s){
    return String(s||"")
      .replace(/\u2019/g,"'")
      .replace(/\u00a0/g," ")
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();
  }

  function findSectionByTitle(partials){
    // Search headings and climb to a reasonable section/container
    var heads = document.querySelectorAll("h1,h2,h3,h4,div,span");
    for (var i=0;i<heads.length;i++){
      var el = heads[i];
      if (!el || !el.textContent) continue;
      var t = norm(el.textContent);
      var ok = true;
      for (var j=0;j<partials.length;j++){
        if (t.indexOf(partials[j]) === -1) { ok = false; break; }
      }
      if (!ok) continue;

      // Prefer a card-like container
      var container =
        el.closest("section") ||
        el.closest("article") ||
        el.closest(".card") ||
        el.closest(".ulydia-card") ||
        el.closest("[data-ulydia-block]") ||
        el.parentElement;

      // Avoid tiny wrappers: climb if container is too small and has no padding-ish class
      if (container && container !== document.body){
        return container;
      }
    }
    return null;
  }

  function findAnchorAfterCompetences(){
    // Look for the block card titled "Compétences clés"
    var sec = findSectionByTitle(["compétences", "clés"]) || findSectionByTitle(["competences", "cles"]);
    if (!sec) return null;
    // Use the section itself as anchor: we will insert after it
    return sec;
  }

  function findAnchorBeforeEnvironnements(){
    return findSectionByTitle(["environnements", "travail"]) || findSectionByTitle(["environnement", "travail"]);
  }

  function insertBefore(parent, node, beforeNode){
    try{
      if (!parent || !node) return false;
      if (beforeNode && beforeNode.parentNode === parent) parent.insertBefore(node, beforeNode);
      else parent.appendChild(node);
      return true;
    }catch(e){ return false; }
  }

  function insertAfter(refNode, node){
    try{
      if (!refNode || !refNode.parentNode) return false;
      var p = refNode.parentNode;
      if (refNode.nextSibling) p.insertBefore(node, refNode.nextSibling);
      else p.appendChild(node);
      return true;
    }catch(e){ return false; }
  }

  function move(){
    // 1) locate the 3 blocks (they already exist at bottom)
    var sEdu = findSectionByTitle(["niveau", "dipl"]) || findSectionByTitle(["niveau", "études"]) || findSectionByTitle(["niveau", "etudes"]);
    var sFirst = findSectionByTitle(["débouch"]) || findSectionByTitle(["debouch"]) || findSectionByTitle(["premiers", "postes"]) || findSectionByTitle(["premier", "poste"]);
    var sAccess = findSectionByTitle(["accès", "métier"]) || findSectionByTitle(["acces", "metier"]) || findSectionByTitle(["reconvers"]);

    if (!sEdu && !sFirst && !sAccess){
      log("3 blocks not found yet");
      return false;
    }

    // 2) anchors
    var afterComp = findAnchorAfterCompetences();
    var beforeEnv = findAnchorBeforeEnvironnements();

    if (!afterComp){
      warn("Anchor 'Compétences clés' not found yet");
      return false;
    }

    // Determine insertion parent and reference
    var parent = afterComp.parentNode || document.getElementById("ulydia-metier-root") || document.body;

    // Create a dedicated wrapper so the 3 blocks stay grouped and order is controlled
    var wrap = document.querySelector("[data-ulydia-mpb3-moved='1']");
    if (!wrap){
      wrap = document.createElement("div");
      wrap.setAttribute("data-ulydia-mpb3-moved", "1");
      // keep spacing consistent
      wrap.style.marginTop = "14px";
      wrap.style.display = "grid";
      wrap.style.gap = "14px";
    }

    // Append blocks in order if present
    function adopt(block){
      if (!block) return;
      // If block is already inside wrap, skip
      if (wrap.contains(block)) return;
      wrap.appendChild(block);
    }
    adopt(sEdu);
    adopt(sFirst);
    adopt(sAccess);

    // If wrap not placed yet, place it
    if (!wrap.parentNode){
      // Prefer inserting before "Environnements de travail" if it's in same parent
      if (beforeEnv && beforeEnv.parentNode === parent){
        insertBefore(parent, wrap, beforeEnv);
      } else {
        // otherwise insert after Competences
        insertAfter(afterComp, wrap);
      }
    }

    log("Moved blocks:", {edu: !!sEdu, first: !!sFirst, access: !!sAccess});
    return true;
  }

  // Run with bounded polling (base renders async)
  var tries = 0;
  var maxTries = 120; // ~12s
  var timer = setInterval(function(){
    tries++;
    var done = false;
    try{ done = move(); }catch(e){ warn("error", e); done = true; }
    if (done || tries >= maxTries){
      clearInterval(timer);
    }
  }, 100);

})();
