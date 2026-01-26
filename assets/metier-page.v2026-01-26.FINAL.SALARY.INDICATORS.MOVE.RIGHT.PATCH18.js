(function(){
  // =========================================================
  // ULYDIA — PATCH18 (COMPAT + MOVE SALARY RIGHT)
  // - Fix: Indicators expect Remote_level / Automation_risk at top-level
  //        but data lives in __ULYDIA_BLOC__.chips.*
  // - Fix: Salary block sometimes renders at bottom/left; move it into right column
  //        (below "Indicateurs clés" if present, otherwise below "Partenaire")
  // Safe / idempotent.
  // =========================================================
  if (window.__ULYDIA_PATCH18__) return;
  window.__ULYDIA_PATCH18__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function getBloc(){
    return window.__ULYDIA_BLOC__ || window.__ULYDIA_BLOC || window.__ULYDIA_BLOC_ || null;
  }

  function ensureChipAliases(){
    var b = getBloc();
    if (!b || !b.chips) return false;

    // Only set if missing to avoid overwriting.
    if (b.Remote_level == null && b.chips.Remote_level != null) b.Remote_level = b.chips.Remote_level;
    if (b.Automation_risk == null && b.chips.Automation_risk != null) b.Automation_risk = b.chips.Automation_risk;
    if (b.Currency == null && b.chips.Currency != null) b.Currency = b.chips.Currency;
    if (b.Status_generation == null && b.chips.Status_generation != null) b.Status_generation = b.chips.Status_generation;

    // Also expose convenient lowercase aliases some patches used
    if (b.remote_level == null && b.Remote_level != null) b.remote_level = b.Remote_level;
    if (b.automation_risk == null && b.Automation_risk != null) b.automation_risk = b.Automation_risk;

    return true;
  }

  function findTitleEl(text){
    text = norm(text).toLowerCase();
    var all = document.querySelectorAll("h1,h2,h3,h4,h5,div,span,p");
    for (var i=0;i<all.length;i++){
      var el = all[i];
      var t = norm(el.textContent).toLowerCase();
      if (!t) continue;

      if (t === text) return el;

      // tolerate icons / leading emojis (best-effort)
      var t2 = t.replace(/^[^\w]+/,"").trim();
      if (t2 === text) return el;

      if (t.indexOf(text) !== -1 && text.length >= 10) return el;
    }
    return null;
  }

  function closestCard(el){
    if (!el) return null;
    var cur = el;
    for (var i=0;i<10 && cur;i++){
      if (cur.classList){
        var c = cur.className || "";
        if (/card|bloc|panel|box|section|u-card|ul-card/i.test(c)) return cur;
      }
      if (cur.tagName === "SECTION") return cur;
      cur = cur.parentElement;
    }
    return el.parentElement || null;
  }

  function isInRightColumn(el){
    if (!el) return false;
    var cur = el;
    for (var i=0;i<8 && cur;i++){
      var c = (cur.className||"");
      if (/right|col-right|sidebar|aside/i.test(c)) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function findRightColumnContainer(){
    var partnerTitle = findTitleEl("Partenaire");
    if (partnerTitle){
      var partnerCard = closestCard(partnerTitle);
      if (partnerCard && partnerCard.parentElement) {
        var col = partnerCard.parentElement;
        if (col === partnerCard && col.parentElement) col = col.parentElement;
        if (col && col.children && col.children.length >= 2) return col;
        if (partnerCard.parentElement) return partnerCard.parentElement;
      }
    }

    var candidates = document.querySelectorAll("div,aside,section");
    var best = null, bestScore = 0;
    candidates.forEach(function(el){
      var c = (el.className||"");
      if (!/right|col-right|sidebar|aside/i.test(c)) return;
      var score = el.querySelectorAll("h1,h2,h3,h4").length + (el.children ? el.children.length : 0);
      if (score > bestScore){ bestScore = score; best = el; }
    });
    return best;
  }

  function insertAfter(node, ref){
    if (!node || !ref || !ref.parentNode) return false;
    if (ref.nextSibling) ref.parentNode.insertBefore(node, ref.nextSibling);
    else ref.parentNode.appendChild(node);
    return true;
  }

  function moveSalaryToRight(){
    var salaryTitle = findTitleEl("Grille salariale");
    if (!salaryTitle) return false;
    var salaryCard = closestCard(salaryTitle);
    if (!salaryCard) return false;

    if (isInRightColumn(salaryCard)) return true;

    var rightCol = findRightColumnContainer();
    if (!rightCol) return false;

    var indicTitle = findTitleEl("Indicateurs clés");
    var targetCard = indicTitle ? closestCard(indicTitle) : null;
    if (!targetCard){
      var partnerTitle = findTitleEl("Partenaire");
      targetCard = partnerTitle ? closestCard(partnerTitle) : null;
    }

    if (targetCard && targetCard.parentElement === rightCol){
      return insertAfter(salaryCard, targetCard);
    } else {
      rightCol.appendChild(salaryCard);
      return true;
    }
  }

  function tick(){
    ensureChipAliases();
    moveSalaryToRight();
  }

  tick();
  var start = Date.now();
  var timer = setInterval(function(){
    tick();
    var salaryTitle = findTitleEl("Grille salariale");
    var ok = false;
    if (salaryTitle){
      var salaryCard = closestCard(salaryTitle);
      ok = isInRightColumn(salaryCard);
    }
    if (ok || (Date.now()-start) > 10000){
      clearInterval(timer);
    }
  }, 200);

  var mo = new MutationObserver(function(){
    tick();
  });
  try { mo.observe(document.documentElement, {subtree:true, childList:true}); } catch(e){}
  setTimeout(function(){ try{ mo.disconnect(); }catch(e){} }, 12000);
})();