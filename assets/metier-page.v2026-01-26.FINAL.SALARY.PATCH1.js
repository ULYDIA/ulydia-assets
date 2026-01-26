/* =========================================================
   ULYDIA — FINAL.SALARY.PATCH1 — SAFE (NO WATCHERS)
   - Injecte une card "Rémunération" dans la colonne de droite
   - 1 seule exécution, aucun MutationObserver
   - Attente bornée (timeout) de __ULYDIA_BLOC__ + DOM rendu
========================================================= */
(function () {
  "use strict";

  // --- Guard: run once
  if (window.__ULYDIA_SALARY_PATCH1__) return;
  window.__ULYDIA_SALARY_PATCH1__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log() { if (DEBUG) console.log("[SALARY.PATCH1]", arguments); }

  function norm(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function safeText(el) {
    return el ? norm(el.textContent || "") : "";
  }

  function findByHeading(root, headings) {
    // Finds a card/container that has one of the headings in its text
    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var t = safeText(all[i]);
      if (!t) continue;
      for (var j = 0; j < headings.length; j++) {
        if (t === headings[j]) return all[i];
      }
    }
    return null;
  }

  function closestMatch(el, selectors) {
    if (!el) return null;
    for (var i = 0; i < selectors.length; i++) {
      try {
        var c = el.closest(selectors[i]);
        if (c) return c;
      } catch (e) {}
    }
    return null;
  }

  function parseNumberLike(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;

    var s = String(v).trim();
    if (!s) return null;

    // keep digits + separators, remove currency words
    s = s.replace(/[^\d.,\s]/g, "").replace(/\s+/g, "");
    if (!s) return null;

    // If both '.' and ',' exist, assume last one is decimal separator
    var hasDot = s.indexOf(".") !== -1;
    var hasComma = s.indexOf(",") !== -1;

    if (hasDot && hasComma) {
      // remove thousand separators
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (hasComma && !hasDot) {
      // assume comma decimal or thousand; if 2+ commas, treat as thousand separators
      var commas = (s.match(/,/g) || []).length;
      if (commas >= 2) s = s.replace(/,/g, "");
      else s = s.replace(",", ".");
    } else {
      // only dot or none: keep
      // if 2+ dots, treat as thousand separators
      var dots = (s.match(/\./g) || []).length;
      if (dots >= 2) s = s.replace(/\./g, "");
    }

    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function formatMoney(n, currency) {
    if (n == null) return null;
    try {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: currency || "EUR",
        maximumFractionDigits: 0
      }).format(n);
    } catch (e) {
      // fallback
      return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + (currency || "EUR");
    }
  }

  function pickFirst(obj, keys) {
    if (!obj) return null;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
    }
    return null;
  }

  function getSalaryData(bloc) {
    // Try multiple shapes / naming conventions
    var salaryObj =
      bloc.salary ||
      bloc.salaire ||
      bloc.remuneration ||
      bloc.compensation ||
      bloc.remu ||
      null;

    // currency
    var currency =
      pickFirst(bloc, ["currency", "devise", "currency_code", "currencyCode"]) ||
      (salaryObj ? pickFirst(salaryObj, ["currency", "devise", "currency_code", "currencyCode"]) : null) ||
      "EUR";

    // unit (monthly/yearly)
    var unit =
      pickFirst(bloc, ["salary_unit", "salaire_unite", "unite_salaire", "unit"]) ||
      (salaryObj ? pickFirst(salaryObj, ["unit", "salary_unit", "salaire_unite"]) : null) ||
      ""; // keep optional

    // junior/mid/senior
    var junior = parseNumberLike(pickFirst(bloc, [
      "salary_junior", "salary_start", "salary_entry",
      "salaire_debutant", "salaire_debut", "salaire_junior",
      "remuneration_debutant", "remuneration_junior"
    ])) ?? (salaryObj ? parseNumberLike(pickFirst(salaryObj, [
      "junior", "entry", "start", "debutant", "debut"
    ])) : null);

    var mid = parseNumberLike(pickFirst(bloc, [
      "salary_mid", "salary_confirmed",
      "salaire_confirme", "salaire_intermediaire",
      "remuneration_confirme", "remuneration_intermediaire"
    ])) ?? (salaryObj ? parseNumberLike(pickFirst(salaryObj, [
      "mid", "confirmed", "intermediate", "confirme"
    ])) : null);

    var senior = parseNumberLike(pickFirst(bloc, [
      "salary_senior", "salary_max",
      "salaire_senior", "salaire_max",
      "remuneration_senior", "remuneration_max"
    ])) ?? (salaryObj ? parseNumberLike(pickFirst(salaryObj, [
      "senior", "max"
    ])) : null);

    // range fallback
    var min = parseNumberLike(pickFirst(bloc, [
      "salary_min", "salaire_min", "remuneration_min"
    ])) ?? (salaryObj ? parseNumberLike(pickFirst(salaryObj, ["min"])) : null);

    var max = parseNumberLike(pickFirst(bloc, [
      "salary_max", "salaire_max", "remuneration_max"
    ])) ?? (salaryObj ? parseNumberLike(pickFirst(salaryObj, ["max"])) : null);

    return {
      currency: String(currency || "EUR").toUpperCase(),
      unit: norm(unit),
      junior: junior,
      mid: mid,
      senior: senior,
      min: min,
      max: max
    };
  }

  function injectStylesOnce() {
    if (document.getElementById("ulydia-salary-patch1-style")) return;
    var css = `
/* --- Salary card (scoped) --- */
.ul-salary-card{
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 20, 20, 0.06);
  border: 1px solid rgba(20,20,20,0.06);
  padding: 14px 14px 12px;
  margin-bottom: 14px;
}
.ul-salary-title{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  font-weight: 700;
  font-size: 13px;
  color: rgba(20,20,20,0.9);
  margin-bottom: 10px;
}
.ul-salary-sub{
  font-size: 12px;
  color: rgba(20,20,20,0.55);
  margin-top: 2px;
}
.ul-salary-grid{
  display:grid;
  grid-template-columns: 1fr auto;
  row-gap: 8px;
  column-gap: 10px;
  margin-top: 8px;
}
.ul-salary-label{
  font-size: 12px;
  color: rgba(20,20,20,0.65);
}
.ul-salary-value{
  font-size: 12px;
  font-weight: 700;
  color: rgba(20,20,20,0.88);
  white-space: nowrap;
}
.ul-salary-badges{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-top: 10px;
}
.ul-salary-badge{
  font-size: 11px;
  font-weight: 600;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(0,0,0,0.04);
  border: 1px solid rgba(0,0,0,0.06);
  color: rgba(20,20,20,0.78);
}
.ul-salary-muted{
  font-size: 12px;
  color: rgba(20,20,20,0.55);
  line-height: 1.4;
}
    `.trim();

    var style = document.createElement("style");
    style.id = "ulydia-salary-patch1-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildCardHTML(bloc) {
    var s = getSalaryData(bloc);

    // chips
    var chips = (bloc && bloc.chips) ? bloc.chips : {};
    var remote = pickFirst(chips, ["Remote_level", "remote_level", "remote", "Remote"]) || null;
    var autoRisk = pickFirst(chips, ["Automation_risk", "automation_risk", "automation", "Automation"]) || null;

    var unitLabel = s.unit ? (" • " + s.unit) : "";
    var countryIso = pickFirst(bloc, ["country_iso", "iso", "iso2", "pays_iso"]) || "";
    var sub = (countryIso ? (String(countryIso).toUpperCase() + " • ") : "") + (s.currency || "EUR") + unitLabel;

    var rows = [];
    function pushRow(label, val) {
      rows.push(
        '<div class="ul-salary-label">' + label + '</div>' +
        '<div class="ul-salary-value">' + val + '</div>'
      );
    }

    var hasAny = (s.junior != null || s.mid != null || s.senior != null || s.min != null || s.max != null);

    if (s.junior != null) pushRow("Débutant", formatMoney(s.junior, s.currency));
    if (s.mid != null) pushRow("Confirmé", formatMoney(s.mid, s.currency));
    if (s.senior != null) pushRow("Senior", formatMoney(s.senior, s.currency));

    // fallback range
    if (rows.length === 0 && (s.min != null || s.max != null)) {
      if (s.min != null && s.max != null) pushRow("Fourchette", formatMoney(s.min, s.currency) + " – " + formatMoney(s.max, s.currency));
      else if (s.min != null) pushRow("À partir de", formatMoney(s.min, s.currency));
      else if (s.max != null) pushRow("Jusqu’à", formatMoney(s.max, s.currency));
    }

    var badges = [];
    if (remote) badges.push('<span class="ul-salary-badge">Remote: ' + norm(remote) + '</span>');
    if (autoRisk) badges.push('<span class="ul-salary-badge">Automation risk: ' + norm(autoRisk) + '</span>');

    var bodyHTML = "";
    if (!hasAny || rows.length === 0) {
      bodyHTML = '<div class="ul-salary-muted">Salaire non communiqué pour le moment. Nous mettrons à jour cette section dès que des données fiables seront disponibles.</div>';
    } else {
      bodyHTML = '<div class="ul-salary-grid">' + rows.join("") + "</div>";
    }

    var badgesHTML = badges.length ? ('<div class="ul-salary-badges">' + badges.join("") + "</div>") : "";

    return (
      '<section class="ul-salary-card" data-ulydia="salary-card">' +
        '<div class="ul-salary-title">' +
          '<div>' +
            '<div>Rémunération</div>' +
            (sub ? '<div class="ul-salary-sub">' + sub + "</div>" : "") +
          "</div>" +
        "</div>" +
        bodyHTML +
        badgesHTML +
      "</section>"
    );
  }

  function locateRightColumn(root) {
    // 1) Prefer explicit known structural classes/attrs if they exist
    var direct =
      root.querySelector('[data-col="right"]') ||
      root.querySelector(".u-col-right") ||
      root.querySelector(".ul-col-right") ||
      root.querySelector(".col-right") ||
      root.querySelector(".right-column") ||
      root.querySelector(".sidebar");
    if (direct) return direct;

    // 2) Find a known right-card heading and climb to column container
    var headings = [
      "Partenaire",
      "Compétences incontournables",
      "Soft Skills essentiels",
      "Stack/Technique Populaire",
      "Certifications utiles",
      "Écoles & Parcours recommandés",
      "Projets/ Portfolios essentiels",
      "Projets/Portfolios essentiels"
    ];

    // Look for an element that exactly matches heading text
    var marker = null;

    // Try common heading tags first for speed
    var ht = root.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span");
    for (var i = 0; i < ht.length; i++) {
      var t = safeText(ht[i]);
      if (!t) continue;
      for (var j = 0; j < headings.length; j++) {
        if (t === headings[j]) { marker = ht[i]; break; }
      }
      if (marker) break;
    }

    if (!marker) marker = findByHeading(root, headings);
    if (!marker) return null;

    // Climb: card -> column
    var card = closestMatch(marker, [
      "[data-card]",
      ".u-card",
      ".card",
      ".ul-card",
      ".w-richtext",
      "section",
      "article",
      "div"
    ]) || marker.parentElement;

    // Column is often the parent that contains multiple cards
    var p = card;
    for (var step = 0; step < 8 && p; step++) {
      // heuristic: a column likely has multiple "cards" (sections/divs) and is not too deep
      var kids = p.children ? p.children.length : 0;
      if (kids >= 2) return p;
      p = p.parentElement;
    }

    return card ? card.parentElement : null;
  }

  function injectCardOnce() {
    var root = document.getElementById("ulydia-metier-root");
    if (!root) return { ok: false, reason: "no-root" };

    // data ready
    var bloc = window.__ULYDIA_BLOC__;
    if (!bloc) return { ok: false, reason: "no-bloc" };

    // avoid duplicate
    if (root.querySelector('[data-ulydia="salary-card"]')) {
      return { ok: true, reason: "already" };
    }

    var rightCol = locateRightColumn(root);
    if (!rightCol) return { ok: false, reason: "no-right-col" };

    injectStylesOnce();

    // Insert near top of right column (before first card), or before "Compétences incontournables" if found
    var anchor = null;
    var anchors = [
      "Compétences incontournables",
      "Soft Skills essentiels",
      "Stack/Technique Populaire",
      "Certifications utiles",
      "Écoles & Parcours recommandés"
    ];
    var nodes = rightCol.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span");
    outer: for (var i = 0; i < nodes.length; i++) {
      var t = safeText(nodes[i]);
      if (!t) continue;
      for (var j = 0; j < anchors.length; j++) {
        if (t === anchors[j]) { anchor = nodes[i]; break outer; }
      }
    }

    var wrapper = document.createElement("div");
    wrapper.innerHTML = buildCardHTML(bloc);
    var cardEl = wrapper.firstElementChild;

    if (!cardEl) return { ok: false, reason: "card-build-failed" };

    if (anchor) {
      // place card before anchor's nearest card container
      var anchorCard = closestMatch(anchor, [".u-card", ".card", "section", "article", "div"]) || anchor.parentElement;
      anchorCard.parentElement.insertBefore(cardEl, anchorCard);
    } else {
      // place first
      if (rightCol.firstElementChild) rightCol.insertBefore(cardEl, rightCol.firstElementChild);
      else rightCol.appendChild(cardEl);
    }

    return { ok: true, reason: "injected" };
  }

  // --- Bounded wait (no infinite loops)
  var start = Date.now();
  var TIMEOUT_MS = 4500; // max wait
  function tick() {
    var res = injectCardOnce();
    if (res.ok) {
      log("OK:", res.reason);
      return;
    }
    if (Date.now() - start > TIMEOUT_MS) {
      // Do not block anything if missing — just stop.
      log("STOP:", res.reason);
      return;
    }
    requestAnimationFrame(tick);
  }

  tick();
})();
