(function(){
  if (window.__ULYDIA_PATCH16_FORCE__) return;
  window.__ULYDIA_PATCH16_FORCE__ = true;

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function pickBloc(){
    return window.__ULYDIA_BLOC__ || window.__ULYDIA_BLOC || window.__ULYDIA_BLOC_DATA__ || null;
  }

  function ensureAliases(bloc){
    var chips = bloc.chips || {};
    // ✅ alias top-level (ce que tu testes dans la console)
    if (bloc.Remote_level == null)    bloc.Remote_level = chips.Remote_level ?? chips.remote_level ?? null;
    if (bloc.Automation_risk == null) bloc.Automation_risk = chips.Automation_risk ?? chips.automation_risk ?? null;
    if (bloc.Currency == null)        bloc.Currency = chips.Currency ?? chips.currency ?? "EUR";
  }

  function fmtRange(min, max, cur){
    if (min == null && max == null) return "—";
    function toK(n){
      if (n == null || isNaN(n)) return null;
      return Math.round(Number(n)/1000);
    }
    var a = toK(min), b = toK(max);
    var sym = (String(cur||"EUR").toUpperCase() === "EUR") ? "K€" : ("K" + cur);
    if (a != null && b != null) return a + "–" + b + sym;
    if (a != null) return a + "+ " + sym;
    if (b != null) return "≤ " + b + sym;
    return "—";
  }

  // colonne droite : on essaye des sélecteurs “probables”, sinon on prend la première colonne à droite visible
  function findRightColumn(){
    return document.querySelector(".ul-col-right, .u-col-right, .col-right, .right-col, [data-ul='right'], [data-column='right']") ||
           document.querySelector("main") || document.body;
  }

  function findPartnerCard(){
    // on repère via le titre “Partenaire”
    var nodes = Array.from(document.querySelectorAll("body *"));
    for (var i=0;i<nodes.length;i++){
      if (norm(nodes[i].textContent) === "Partenaire") {
        return nodes[i].closest("section,div");
      }
    }
    return null;
  }

  function ensureSalaryCard(){
    // déjà présent ?
    var existing = document.getElementById("ulydia-salary-card");
    if (existing) return existing;

    var card = document.createElement("div");
    card.id = "ulydia-salary-card";
    card.style.borderRadius = "14px";
    card.style.boxShadow = "0 12px 30px rgba(16,24,40,.10)";
    card.style.background = "#fff";
    card.style.overflow = "hidden";
    card.style.marginTop = "14px";

    card.innerHTML = `
      <div style="padding:12px 14px; font-weight:700; background:#18a66a; color:#fff;">
        Grille salariale
      </div>
      <div style="padding:12px 14px; display:flex; flex-direction:column; gap:10px; font-size:13px;">
        ${rowHTML("Junior", "js-sal-out-junior")}
        ${rowHTML("Confirmé", "js-sal-out-mid")}
        ${rowHTML("Senior", "js-sal-out-senior")}
        ${rowHTML("Part variable", "js-sal-out-var")}
      </div>
    `;

    function rowHTML(label, cls){
      return `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div style="color:#334155; font-weight:600;">${label}</div>
          <div class="${cls}" style="color:#0f172a; font-weight:800;">—</div>
        </div>
      `;
    }

    var partner = findPartnerCard();
    if (partner && partner.parentElement) {
      // insert après la card partenaire
      partner.parentElement.insertBefore(card, partner.nextSibling);
    } else {
      findRightColumn().appendChild(card);
    }
    return card;
  }

  function fillSalary(card, bloc){
    var chips = bloc.chips || {};
    var cur = bloc.Currency || chips.Currency || "EUR";

    var s = bloc.salary || {};
    var jr = s.junior || {};
    var md = s.mid || {};
    var sr = s.senior || {};

    // fallback “flat” si besoin
    function pickFlat(k){
      return bloc[k] ?? null;
    }

    var jMin = jr.min ?? pickFlat("salary_junior_min");
    var jMax = jr.max ?? pickFlat("salary_junior_max");
    var mMin = md.min ?? pickFlat("salary_mid_min");
    var mMax = md.max ?? pickFlat("salary_mid_max");
    var sMin = sr.min ?? pickFlat("salary_senior_min");
    var sMax = sr.max ?? pickFlat("salary_senior_max");
    var vPct = s.variable_share_pct ?? pickFlat("salary_variable_share_pct") ?? pickFlat("salary_variable_share");

    card.querySelector(".js-sal-out-junior").textContent = fmtRange(jMin, jMax, cur);
    card.querySelector(".js-sal-out-mid").textContent    = fmtRange(mMin, mMax, cur);
    card.querySelector(".js-sal-out-senior").textContent = fmtRange(sMin, sMax, cur);

    if (vPct != null && !isNaN(vPct)) {
      card.querySelector(".js-sal-out-var").textContent = "Jusqu’à " + Math.round(Number(vPct)) + "%";
    } else {
      card.querySelector(".js-sal-out-var").textContent = "—";
    }
  }

  var tries = 0;
  (function loop(){
    tries++;
    var bloc = pickBloc();
    if (bloc) {
      ensureAliases(bloc);

      // ✅ debug simple (tu le verras dans console)
      window.__ULYDIA_PATCH16_LAST__ = {
        Remote_level: bloc.Remote_level,
        Automation_risk: bloc.Automation_risk,
        Currency: bloc.Currency,
        salary: bloc.salary || null
      };

      var card = ensureSalaryCard();
      fillSalary(card, bloc);
      return;
    }

    if (tries > 200) return;
    setTimeout(loop, 50);
  })();
})();
