/*! ULYDIA — Salary Sticky Guard — v2026-01-28 PATCH1
   Prevents salary grid from being overwritten by later re-renders that lose numeric ranges.
   - DOM-only (no dependency on internal renderer)
   - Captures "good" salary HTML once numbers are present, and restores if later replaced by a "labels-only" version.
*/
(function(){
  if (window.__ULYDIA_SALARY_STICKY_PATCH1__) return;
  window.__ULYDIA_SALARY_STICKY_PATCH1__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function txt(el){ return norm(el ? el.textContent : ""); }

  // Heuristics
  function looksLikeSalaryValueText(s){
    s = String(s||"");
    // ranges like 35–45K€, 35-45 k€, 45–60K, 60–85K, 5–15%
    return /(\d{2,3}\s*[-–]\s*\d{2,3}\s*[kK]?\s*[€$£]|[€$£]\s*\d{2,3}\s*[-–]\s*\d{2,3}|(\d{1,2}\s*[-–]\s*\d{1,2}\s*%))/.test(s);
  }

  function findSalaryCard(){
    // Try typical Ulydia card structure
    var candidates = Array.prototype.slice.call(document.querySelectorAll(".card, .u-card, .ul-card, [data-ul-card], [data-u-card], section, div"));
    var best = null;
    for (var i=0;i<candidates.length;i++){
      var el = candidates[i];
      var t = txt(el);
      if (!t) continue;
      // header could be "Grille salariale" or "Salary grid"
      if (/grille salariale|salary grid/i.test(t) && t.length < 4000){
        best = el;
        break;
      }
    }
    if (best) return best;

    // Fallback: header blocks with gradients sometimes have h3/h4
    var heads = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,div,span"))
      .filter(function(n){
        var s = txt(n).toLowerCase();
        return s === "grille salariale (france)" || s === "grille salariale" || s === "salary grid" || s === "salary grid (france)";
      });
    if (heads[0]){
      // climb up to a card-ish container
      var p = heads[0];
      for (var k=0;k<8 && p; k++){
        if (p.classList && (p.classList.contains("card") || p.classList.contains("u-card") || p.classList.contains("ul-card"))) return p;
        p = p.parentElement;
      }
      // if none, take parent
      return heads[0].closest("section,div") || heads[0].parentElement;
    }
    return null;
  }

  function selectBody(card){
    if (!card) return null;
    // Prefer a body container inside the card
    return card.querySelector(".card-body, .u-card-body, .ul-card-body") || card;
  }

  function run(){
    var card = findSalaryCard();
    if (!card) return false;

    var body = selectBody(card);
    if (!body) return false;

    // cache
    var cachedGoodHTML = null;
    var cachedAt = 0;

    function snapshotIfGood(){
      var t = txt(card);
      if (looksLikeSalaryValueText(t)){
        cachedGoodHTML = body.innerHTML;
        cachedAt = Date.now();
        return true;
      }
      return false;
    }

    // initial capture: retry a bit until numbers appear
    var tries = 0;
    var capTimer = setInterval(function(){
      tries++;
      if (snapshotIfGood() || tries >= 40){ // ~8s
        clearInterval(capTimer);
      }
    }, 200);

    // observe changes
    var obs = new MutationObserver(function(){
      if (!cachedGoodHTML) return;
      var tAll = txt(card);
      var hasNumbersNow = looksLikeSalaryValueText(tAll);
      // If we've lost numbers but still have the "experience" labels, it's likely a fallback overwrite
      var hasLabels = /(years of experience|ans d['’]expérience|junior|confirmé|senior|bonus|profit sharing|incentive|part variable)/i.test(tAll);
      if (!hasNumbersNow && hasLabels){
        // restore only if the current body is "simplified" (very short / no currency)
        try {
          body.innerHTML = cachedGoodHTML;
          // small marker
          card.setAttribute("data-ul-salary-restored","1");
        } catch(e){}
      }
    });

    obs.observe(body, {subtree:true, childList:true, characterData:true});

    // Safety: keep observer for a while; salary overwrites happen shortly after load / i18n events
    setTimeout(function(){
      try { obs.disconnect(); } catch(e){}
    }, 25000);

    return true;
  }

  function boot(){
    // run after DOM ready + small delay (renderers often run after)
    if (document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", function(){ setTimeout(run, 350); });
    } else {
      setTimeout(run, 350);
    }
  }

  boot();
})();