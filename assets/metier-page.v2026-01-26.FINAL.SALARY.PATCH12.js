/*!
 * ULYDIA — Salary Patch (SAFE) — PATCH12
 * - Remplit la carte "Grille salariale" (Junior / Confirmé / Senior / Part variable)
 * - Formate en K€ / K$ / K£ selon devise détectée
 * - Ne casse jamais la page (try/catch partout)
 * - Cache la carte si aucune donnée salaire
 */
(function () {
  "use strict";

  function $(sel, root) {
    try { return (root || document).querySelector(sel); } catch (e) { return null; }
  }
  function $all(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel) || []); } catch (e) { return []; }
  }

  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function toNum(v) {
    if (v == null) return null;
    var s = String(v).replace(/[\s\u00A0]/g, "").replace(",", "."); // remove spaces, comma->dot
    // keep digits, dot, minus
    s = s.replace(/[^0-9.\-]/g, "");
    if (!s) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  // Convert raw number to "K" units (35 or 35000 -> 35)
  function toK(n) {
    if (n == null) return null;
    // If it looks like annual in full units (>= 1000), convert to K
    if (Math.abs(n) >= 1000) return Math.round((n / 1000) * 10) / 10; // 1 decimal max
    return Math.round(n * 10) / 10;
  }

  function dashRange(minK, maxK, currencySuffix) {
    if (minK == null && maxK == null) return "";
    // prefer integer display
    function fmt(x) {
      if (x == null) return "";
      return (Math.round(x) === x) ? String(Math.round(x)) : String(x);
    }
    var a = fmt(minK);
    var b = fmt(maxK);
    if (a && b) return a + "–" + b + "K" + currencySuffix;
    if (a) return a + "K" + currencySuffix;
    if (b) return b + "K" + currencySuffix;
    return "";
  }

  function pick(obj, keys) {
    if (!obj) return null;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
    }
    return null;
  }

  function getBloc() {
    // Most common sources in your setup
    // - BLOCFLATTEN usually exposes something stable
    var b =
      window.__ULYDIA_BLOC__ ||
      (window.__ULYDIA_METIER_PAYS_BLOCS__ && (window.__ULYDIA_METIER_PAYS_BLOCS__.bloc || window.__ULYDIA_METIER_PAYS_BLOCS__.current)) ||
      (window.__ULYDIA_PAGE_DATA__ && (window.__ULYDIA_PAGE_DATA__.bloc || window.__ULYDIA_PAGE_DATA__.data && window.__ULYDIA_PAGE_DATA__.data.bloc)) ||
      null;

    // If an array was exposed, try best match
    if (Array.isArray(b)) {
      return b[0] || null;
    }
    return b || null;
  }

  function detectCurrency(bloc) {
    // 1) explicit fields
    var raw =
      pick(bloc, [
        "currency", "currency_code", "currencyCode",
        "devise", "devise_code", "deviseCode",
        "sal_currency", "salCurrency",
        "salaire_currency", "salaireCurrency"
      ]) ||
      "";

    raw = String(raw || "").toUpperCase();

    // 2) try to parse from indicators text (e.g. "EUR (€)")
    if (!raw) {
      var devEl = $(".js-ind-devise") || $(".js-ind-currency") || null;
      var t = devEl ? norm(devEl.textContent) : "";
      t = t.toUpperCase();
      if (t.indexOf("EUR") >= 0) raw = "EUR";
      else if (t.indexOf("USD") >= 0) raw = "USD";
      else if (t.indexOf("GBP") >= 0) raw = "GBP";
    }

    if (raw.indexOf("USD") >= 0 || raw.indexOf("$") >= 0) return { code: "USD", suffix: "$" };
    if (raw.indexOf("GBP") >= 0 || raw.indexOf("£") >= 0) return { code: "GBP", suffix: "£" };
    // default EUR
    return { code: "EUR", suffix: "€" };
  }

  function setText(sel, txt) {
    var el = $(sel);
    if (!el) return false;
    el.textContent = txt;
    return true;
  }

  function setBar(sel, pct) {
    var el = $(sel);
    if (!el) return false;
    // pct expected 0..100
    var p = Math.max(0, Math.min(100, Number(pct) || 0));
    el.style.width = p + "%";
    return true;
  }

  function showHideCard(shouldShow) {
    // We try to find the salary card container
    var card =
      $(".js-salary-card") ||
      $(".js-salary-wrap") ||
      $(".ul-salary-card") ||
      $(".ul-card-salary") ||
      null;

    // fallback: go up from any salary field placeholder
    if (!card) {
      var any = $(".js-sal-junior-min, .js-sal-junior-max, .js-sal-mid-min, .js-sal-mid-max, .js-sal-senior-min, .js-sal-senior-max, .js-sal-variable-share");
      if (any) {
        // climb a few levels
        var n = any;
        for (var i = 0; i < 8 && n; i++) {
          if (n.classList && (n.classList.contains("card") || n.classList.contains("ul-card") || n.classList.contains("w-node") || n.classList.contains("collection-item"))) {
            card = n;
            break;
          }
          n = n.parentElement;
        }
        if (!card) card = any.closest ? any.closest("div") : null;
      }
    }

    if (card) {
      card.style.display = shouldShow ? "" : "none";
    }
  }

  function run() {
    var bloc = getBloc();
    if (!bloc) {
      // nothing yet: retry a bit
      return false;
    }

    // Salary values with many aliases
    var jMin = toNum(pick(bloc, ["sal_junior_min", "salJuniorMin", "junior_min", "juniorMin", "salary_junior_min", "salaryJuniorMin"]));
    var jMax = toNum(pick(bloc, ["sal_junior_max", "salJuniorMax", "junior_max", "juniorMax", "salary_junior_max", "salaryJuniorMax"]));

    var mMin = toNum(pick(bloc, ["sal_mid_min", "salMidMin", "mid_min", "midMin", "confirmé_min", "confirme_min", "confirmeMin", "confirmed_min", "confirmedMin", "salary_mid_min", "salaryMidMin"]));
    var mMax = toNum(pick(bloc, ["sal_mid_max", "salMidMax", "mid_max", "midMax", "confirmé_max", "confirme_max", "confirmeMax", "confirmed_max", "confirmedMax", "salary_mid_max", "salaryMidMax"]));

    var sMin = toNum(pick(bloc, ["sal_senior_min", "salSeniorMin", "senior_min", "seniorMin", "salary_senior_min", "salarySeniorMin"]));
    var sMax = toNum(pick(bloc, ["sal_senior_max", "salSeniorMax", "senior_max", "seniorMax", "salary_senior_max", "salarySeniorMax"]));

    var varMin = toNum(pick(bloc, ["sal_variable_min", "salVariableMin", "variable_min", "variableMin", "sal_variable_share_min"]));
    var varMax = toNum(pick(bloc, ["sal_variable_max", "salVariableMax", "variable_max", "variableMax", "sal_variable_share_max"]));
    // Some setups store "5-15" as a text field
    var varShareTxt = pick(bloc, ["sal_variable_share", "salVariableShare", "variable_share", "variableShare", "part_variable", "partVariable"]);

    var currency = detectCurrency(bloc);

    var hasAnySalary =
      jMin != null || jMax != null ||
      mMin != null || mMax != null ||
      sMin != null || sMax != null ||
      varMin != null || varMax != null ||
      (varShareTxt != null && String(varShareTxt).trim() !== "");

    if (!hasAnySalary) {
      showHideCard(false);
      return true;
    }

    showHideCard(true);

    // Convert to K
    var jMinK = toK(jMin), jMaxK = toK(jMax);
    var mMinK = toK(mMin), mMaxK = toK(mMax);
    var sMinK = toK(sMin), sMaxK = toK(sMax);

    // Set range labels if placeholders exist
    setText(".js-sal-junior-range", dashRange(jMinK, jMaxK, currency.suffix));
    setText(".js-sal-mid-range", dashRange(mMinK, mMaxK, currency.suffix));
    setText(".js-sal-senior-range", dashRange(sMinK, sMaxK, currency.suffix));

    // Also support separate min/max placeholders
    if ($(".js-sal-junior-min")) setText(".js-sal-junior-min", (jMinK != null ? String(jMinK) : ""));
    if ($(".js-sal-junior-max")) setText(".js-sal-junior-max", (jMaxK != null ? String(jMaxK) : ""));
    if ($(".js-sal-mid-min")) setText(".js-sal-mid-min", (mMinK != null ? String(mMinK) : ""));
    if ($(".js-sal-mid-max")) setText(".js-sal-mid-max", (mMaxK != null ? String(mMaxK) : ""));
    if ($(".js-sal-senior-min")) setText(".js-sal-senior-min", (sMinK != null ? String(sMinK) : ""));
    if ($(".js-sal-senior-max")) setText(".js-sal-senior-max", (sMaxK != null ? String(sMaxK) : ""));

    // If there are dedicated "display" nodes (like in your mock)
    setText(".js-sal-junior-display", dashRange(jMinK, jMaxK, currency.suffix));
    setText(".js-sal-mid-display", dashRange(mMinK, mMaxK, currency.suffix));
    setText(".js-sal-senior-display", dashRange(sMinK, sMaxK, currency.suffix));

    // Variable share
    var varTxt = "";
    if (varShareTxt != null && String(varShareTxt).trim() !== "") {
      varTxt = String(varShareTxt).trim();
      // normalize "5 - 15" => "5–15%"
      if (/%/.test(varTxt) === false && /^[0-9]+(\.[0-9]+)?\s*[-–]\s*[0-9]+(\.[0-9]+)?$/.test(varTxt.replace(",", "."))) {
        varTxt = varTxt.replace(/\s*-\s*|\s*–\s*/g, "–") + "%";
      }
    } else if (varMin != null || varMax != null) {
      // numbers assumed percent
      var a = (varMin != null ? String(Math.round(varMin)) : "");
      var b = (varMax != null ? String(Math.round(varMax)) : "");
      if (a && b) varTxt = a + "–" + b + "%";
      else if (a) varTxt = a + "%";
      else if (b) varTxt = b + "%";
    }
    if ($(".js-sal-variable-share")) setText(".js-sal-variable-share", varTxt);
    if ($(".js-sal-variable-display")) setText(".js-sal-variable-display", varTxt);

    // Bars: scale based on max "upper" value among levels
    var maxK = 0;
    [jMaxK, mMaxK, sMaxK, jMinK, mMinK, sMinK].forEach(function (v) {
      if (v != null && v > maxK) maxK = v;
    });
    if (!maxK) maxK = 100;

    function pctFrom(valK) {
      if (valK == null) return 0;
      return Math.round((valK / maxK) * 100);
    }

    // Bar selectors (support multiple possible classes)
    setBar(".js-sal-junior-bar", pctFrom(jMaxK != null ? jMaxK : jMinK));
    setBar(".js-sal-mid-bar", pctFrom(mMaxK != null ? mMaxK : mMinK));
    setBar(".js-sal-senior-bar", pctFrom(sMaxK != null ? sMaxK : sMinK));
    setBar(".js-sal-variable-bar", 0); // optional, you can map variable % if you want

    // Title: optionally add (Country)
    var titleEl = $(".js-salary-title");
    if (titleEl) {
      var baseTitle = norm(titleEl.getAttribute("data-base-title")) || "Grille salariale";
      if (!titleEl.getAttribute("data-base-title")) titleEl.setAttribute("data-base-title", baseTitle);

      var country = pick(bloc, ["country_name", "countryName", "pays", "pays_label", "country_label"]) || "";
      country = norm(country);
      // If country is already in title or empty, keep simple
      if (country && titleEl.textContent.indexOf(country) === -1) {
        titleEl.textContent = baseTitle + " (" + country + ")";
      } else if (!norm(titleEl.textContent)) {
        titleEl.textContent = baseTitle;
      }
    }

    // Add currency to any "statut generation" placeholder if it exists (optional)
    var statutEl = $(".js-statut-generation");
    if (statutEl && !norm(statutEl.textContent)) {
      statutEl.textContent = currency.code;
    }

    return true;
  }

  function safeTick() {
    try {
      return run();
    } catch (e) {
      // never crash the page
      return true;
    }
  }

  // Try now + retry (data may arrive late)
  var tries = 0;
  (function loop() {
    tries++;
    var done = safeTick();
    if (done || tries > 60) return; // ~3s at 50ms
    setTimeout(loop, 50);
  })();
})();
