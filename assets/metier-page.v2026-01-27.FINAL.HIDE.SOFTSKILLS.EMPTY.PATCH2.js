(function(){
  // =========================================================
  // ULYDIA — Hide "Soft Skills essentiels" block when empty — PATCH2
  // (robust: checks chips/cards content)
  // =========================================================
  if (window.__ULYDIA_HIDE_SOFTSKILLS_PATCH2__) return;
  window.__ULYDIA_HIDE_SOFTSKILLS_PATCH2__ = true;

  function norm(s){ return String(s||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim(); }

  function findSoftSkillsBlock(){
    // Prefer block wrappers
    var blocks = Array.prototype.slice.call(document.querySelectorAll(".u-section-card, .section-card, [data-ul-card], .u-card"));
    for (var i=0;i<blocks.length;i++){
      var b = blocks[i];
      var t = norm(b.textContent || "");
      if (!t) continue;
      // must contain title exactly or near
      if (t.indexOf("Soft Skills essentiels") !== -1) return b;
    }
    return null;
  }

  function isEmpty(block){
    if (!block) return true;
    // Look for any visible chips/items
    var chips = block.querySelectorAll(".u-chip, .chip, [class*='chip'], li, .w-richtext p");
    for (var i=0;i<chips.length;i++){
      var el = chips[i];
      if (!el || !el.offsetParent) continue;
      var s = norm(el.textContent || "");
      if (s && s !== "Soft Skills essentiels") return false;
    }
    // fallback: remove title text then check remainder
    var txt = norm(block.textContent || "");
    txt = txt.replace("Soft Skills essentiels","").trim();
    return !txt;
  }

  function run(){
    var b = findSoftSkillsBlock();
    if (!b) { setTimeout(run, 200); return; }
    if (isEmpty(b)){
      try { b.style.display = "none"; } catch(e){}
    }
  }
  run();
})();