(function(){
  // =========================================================
  // ULYDIA — PATCH19 (SAFE)
  // - Prevent infinite loader: always unlock after timeout
  // - Move "Grille salariale" card into RIGHT column (sidebar)
  // - Fill indicators from window.__ULYDIA_BLOC__.chips
  //   (Remote_level, Automation_risk)
  //
  // This patch is designed to be the LAST script on the page.
  // =========================================================

  if (window.__ULYDIA_PATCH19__) return;
  window.__ULYDIA_PATCH19__ = true;

  var START = Date.now();
  var MAX_WAIT_MS = 8000;      // after that we unlock loader no matter what
  var POLL_MS = 120;
  var tries = 0;

  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  // ---- loader unlock (best-effort, non-breaking)
  function unlockLoader(reason){
    try {
      // remove common "loading" guards
      document.documentElement.classList.remove("ul-metier-loading","ul-loading","is-loading");
      document.body.classList.remove("ul-metier-loading","ul-loading","is-loading");

      // remove overlays/spinners if present
      var selectors = [
        "#ulydia-loader",
        "#u-overlay", ".u-overlay",
        ".ulydia-overlay", ".ulydia-loader",
        ".u-loader", ".ul-loader",
        "[data-ulydia-overlay]", "[data-ulydia-loader]",
        ".w-loader", ".loading-overlay"
      ];
      selectors.forEach(function(sel){
        qa(sel).forEach(function(el){
          // hide instead of remove to avoid breaking listeners
          el.style.display = "none";
          el.style.visibility = "hidden";
          el.style.opacity = "0";
          el.setAttribute("aria-hidden","true");
        });
      });

      // if UI exposes an API, call it
      if (window.UlydiaUI && typeof window.UlydiaUI.hideLoader === "function") {
        window.UlydiaUI.hideLoader();
      }
      if (window.UlydiaUI && typeof window.UlydiaUI.hideOverlay === "function") {
        window.UlydiaUI.hideOverlay();
      }
      // optional debug
      window.__ULYDIA_PATCH19_UNLOCK_REASON__ = reason || "unknown";
    } catch(e){}
  }

  // ---- Find the RIGHT column container (sidebar)
  function findRightColumn(){
    // explicit ids/classes if you add them later
    var c =
      q("#ulydia-right") ||
      q("#ul-metier-right") ||
      q(".ul-col-right") ||
      q(".ul-right") ||
      q("[data-ul-col='right']");

    if (c) return c;

    // heuristic: locate the "Partenaire" card, take its nearest column parent
    var partner = qa("*").find(function(el){
      var t = norm(el.textContent);
      return t === "Partenaire";
    });

    if (partner) {
      // walk up a bit to find a container that looks like a column
      var p = partner;
      for (var i=0;i<10 && p;i++){
        if (p.classList && (
          p.classList.contains("ul-col") ||
          p.classList.contains("ul-sidebar") ||
          p.classList.contains("ul-right-col") ||
          p.classList.contains("w-col") ||
          p.classList.contains("column") ||
          p.classList.contains("col")
        )) return p;
        // if parent has many cards stacked, it's probably the sidebar
        if (p.children && p.children.length >= 3) {
          // quick check: does it include "Partenaire" and "Indicateurs" somewhere?
          var txt = norm(p.textContent);
          if (txt.indexOf("Partenaire") !== -1 && txt.indexOf("Indicateurs") !== -1) return p;
        }
        p = p.parentElement;
      }
      // fallback: use parentElement of partner's card
      return partner.closest("div") || null;
    }

    return null;
  }

  // ---- Find salary card by title text ("Grille salariale")
  function findSalaryCard(){
    // try: heading elements first
    var titleNode = qa("h1,h2,h3,h4,h5,h6,div,span").find(function(el){
      return norm(el.textContent) === "Grille salariale";
    });
    if (!titleNode) return null;

    // climb to card-like container
    var card = titleNode;
    for (var i=0;i<10 && card;i++){
      if (card.classList && (
        card.classList.contains("u-card") ||
        card.classList.contains("card") ||
        card.classList.contains("ul-card") ||
        card.classList.contains("w-container") ||
        card.classList.contains("w-node")
      )) return card;
      // if this element contains the salary rows (Junior/Confirmé/Senior), it's enough
      var t = norm(card.textContent);
      if (t.indexOf("Junior") !== -1 && t.indexOf("Confirm") !== -1 && t.indexOf("Senior") !== -1) {
        return card;
      }
      card = card.parentElement;
    }
    return titleNode.parentElement || null;
  }

  // ---- Fill indicators (Télétravail / Risque d'automatisation)
  function fillIndicators(){
    var bloc = window.__ULYDIA_BLOC__ || null;
    var chips = (bloc && bloc.chips) ? bloc.chips : null;
    if (!chips) return false;

    // values live in chips.Remote_level / chips.Automation_risk
    var remote = chips.Remote_level || chips.remote_level || null;
    var risk   = chips.Automation_risk || chips.automation_risk || null;

    // heuristic: find label nodes and update the value node next to it
    function setIndicator(labelExact, value){
      if (!value) return false;

      // find node with label (inside "Indicateurs clés" card)
      var labelNode = qa("*").find(function(el){
        return norm(el.textContent) === labelExact;
      });
      if (!labelNode) return false;

      // often structure is: icon + label + maybe value in same row; if no explicit value node, append.
      // try next siblings first
      var row = labelNode.closest("div") || labelNode.parentElement;
      if (!row) row = labelNode;

      // if row already has value text aside label, do nothing
      var rowTxt = norm(row.textContent);
      if (rowTxt !== labelExact && rowTxt.indexOf(labelExact) !== -1 && rowTxt.indexOf(String(value)) !== -1) return true;

      // find a small value container in the same row
      var valueNode = null;
      // common: last child text node container
      if (row.children && row.children.length >= 1) {
        // pick last element that's not the labelNode
        for (var i=row.children.length-1;i>=0;i--){
          var child = row.children[i];
          if (child === labelNode) continue;
          // avoid icons (svg/img)
          if (child.querySelector && (child.querySelector("svg,img"))) {
            // could still be wrapper; skip if very small
            if (norm(child.textContent).length === 0) continue;
          }
          valueNode = child;
          break;
        }
      }

      if (!valueNode || valueNode === labelNode) {
        // create a value span
        valueNode = document.createElement("span");
        valueNode.style.marginLeft = "8px";
        valueNode.style.fontWeight = "600";
        labelNode.parentElement && labelNode.parentElement.appendChild(valueNode);
      }

      valueNode.textContent = String(value);
      return true;
    }

    // Your UI labels currently show only the label; we add the value.
    var ok1 = setIndicator("Télétravail", remote);
    var ok2 = setIndicator("Risque d'automatisation", risk);

    return !!(ok1 || ok2);
  }

  // ---- Move salary card into right column
  function moveSalaryRight(){
    var right = findRightColumn();
    var salaryCard = findSalaryCard();
    if (!right || !salaryCard) return false;

    // already in right?
    if (right.contains(salaryCard)) return true;

    // try insert near indicators card if present
    var indicatorsTitle = qa("*", right).find(function(el){
      return norm(el.textContent) === "Indicateurs clés";
    });
    if (indicatorsTitle) {
      // insert after the indicators card container
      var indCard = indicatorsTitle;
      for (var i=0;i<8 && indCard;i++){
        var t = norm(indCard.textContent);
        if (t.indexOf("Indicateurs clés") !== -1) break;
        indCard = indCard.parentElement;
      }
      if (indCard && indCard.parentElement === right) {
        right.insertBefore(salaryCard, indCard.nextSibling);
        return true;
      }
    }

    // fallback: append at end of right
    right.appendChild(salaryCard);
    return true;
  }

  function step(){
    tries++;

    var moved = false, filled = false;

    try { moved = moveSalaryRight(); } catch(e){}
    try { filled = fillIndicators(); } catch(e){}

    // unlock loader as soon as we have something meaningful OR after timeout
    var elapsed = Date.now() - START;

    // We consider "ready" if:
    // - root exists AND (salary moved OR indicators filled OR bloc exists)
    var rootOk = !!document.getElementById("ulydia-metier-root");
    var blocOk = !!window.__ULYDIA_BLOC__;

    if ((rootOk && (moved || filled || blocOk)) || elapsed > MAX_WAIT_MS) {
      unlockLoader(elapsed > MAX_WAIT_MS ? "timeout" : "ready");
      return;
    }

    setTimeout(step, POLL_MS);
  }

  // run after DOM is ready (defer scripts should already be after DOM parsing, but safe)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(step, 0); });
  } else {
    setTimeout(step, 0);
  }
})();