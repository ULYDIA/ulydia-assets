(function () {
  if (window.__ULYDIA_SALARY_PATCH15__) return;
  window.__ULYDIA_SALARY_PATCH15__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function pickBloc(){
    return window.__ULYDIA_BLOC__ || window.__ULYDIA_BLOC || window.__ULYDIA_BLOC_DATA__ || null;
  }

  function fmtRange(min, max, cur){
    if (min == null && max == null) return "—";
    // min/max sont en euros “bruts” (ex 24000) -> "24–29K€"
    function toK(n){
      if (n == null || isNaN(n)) return null;
      return Math.round(Number(n)/1000);
    }
    var a = toK(min), b = toK(max);
    var sym = (cur && cur.toUpperCase() === "EUR") ? "K€" : (cur ? ("K" + cur) : "K€");
    if (a != null && b != null) return a + "–" + b + sym;
    if (a != null) return a + "+ " + sym;
    if (b != null) return "≤ " + b + sym;
    return "—";
  }

  function findSalaryCard(){
    // on repère le bloc par son titre “Grille salariale”
    var candidates = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span"))
      .filter(function(el){ return norm(el.textContent) === "Grille salariale"; });

    for (var i=0;i<candidates.length;i++){
      var card = candidates[i].closest("section,div");
      if (card) return card;
    }
    return null;
  }

  function setRowValue(card, rowLabel, value){
    value = norm(value);
    if (!card || !value) return false;

    var els = Array.from(card.querySelectorAll("*")).filter(function(el){
      return norm(el.textContent) === rowLabel;
    });

    for (var i=0;i<els.length;i++){
      var row = els[i].closest("div");
      if (!row) continue;

      var vEl =
        row.querySelector(".js-salary-value,.ul-salary-value,.u-salary-value") ||
        row.querySelector("span:last-of-type, div:last-of-type") ||
        null;

      if (vEl && vEl !== els[i]) {
        vEl.textContent = value;
        return true;
      }
    }
    return false;
  }

  function apply(){
    var bloc = pickBloc();
    if (!bloc) return false;

    var chips = bloc.chips || {};
    var cur = bloc.Currency || chips.Currency || "EUR";

    // support 2 formats possibles
    var salary = bloc.salary || {};
    var jr = salary.junior || salary.jr || {};
    var md = salary.mid    || salary.confirmed || salary.confirmé || salary.midlevel || {};
    var sr = salary.senior || salary.sr || {};

    // fallback si jamais tu as des clés “plates”
    function pick(n1,n2,n3){
      var v = bloc[n1];
      if (v == null) v = bloc[n2];
      if (v == null) v = bloc[n3];
      return v;
    }

    var jMin = (jr.min != null ? jr.min : pick("salary_junior_min","salaryJuniorMin","junior_min"));
    var jMax = (jr.max != null ? jr.max : pick("salary_junior_max","salaryJuniorMax","junior_max"));
    var mMin = (md.min != null ? md.min : pick("salary_mid_min","salaryMidMin","mid_min"));
    var mMax = (md.max != null ? md.max : pick("salary_mid_max","salaryMidMax","mid_max"));
    var sMin = (sr.min != null ? sr.min : pick("salary_senior_min","salarySeniorMin","senior_min"));
    var sMax = (sr.max != null ? sr.max : pick("salary_senior_max","salarySeniorMax","senior_max"));

    var varPct = (salary.variable_share_pct != null ? salary.variable_share_pct : pick("salary_variable_share","salaryVariableShare","variable_share_pct"));

    var card = findSalaryCard();
    if (!card) return false;

    // ✅ IMPORTANT : on ne masque jamais le bloc
    var ok = false;
    ok = setRowValue(card, "Junior", fmtRange(jMin, jMax, cur)) || ok;
    ok = setRowValue(card, "Confirmé", fmtRange(mMin, mMax, cur)) || ok;
    ok = setRowValue(card, "Senior", fmtRange(sMin, sMax, cur)) || ok;

    if (varPct != null && !isNaN(varPct)) {
      ok = setRowValue(card, "Part variable", "Jusqu’à " + Math.round(Number(varPct)) + "%") || ok;
    }

    return ok;
  }

  var tries = 0;
  (function loop(){
    tries++;
    try { if (apply()) return; } catch(e) {}
    if (tries > 160) return;
    setTimeout(loop, 50);
  })();
})();
