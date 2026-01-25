/* metier-page.v2026-01-25.FINAL.INDICATORS.PATCH2.js
   ULYDIA — Indicators KPI renderer (ROBUST)
   Fixes empty "Télétravail" + "Risque d'automatisation" when IDs are missing.

   Strategy:
   1) Try existing IDs (js-chip-remote_level, js-chip-automation_risk, js-chip-currency, ...)
   2) Fallback: find KPI rows by their visible label text and inject a value node on the right.

   Requires: window.__ULYDIA_BLOC__ or ctx.blocFields
*/
(() => {
  if (window.__ULYDIA_INDICATORS_PATCH2__) return;
  window.__ULYDIA_INDICATORS_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[indicators.patch2]", ...a);

  const norm = (s) => String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

  function textSummary(htmlOrText){
    const s = String(htmlOrText || "");
    if (!s) return "";
    const t = s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r]+/g, " ")
      .trim();
    const first = (t.split("\n").map(x=>x.trim()).filter(Boolean)[0] || "").trim();
    return first || t;
  }

  function setTextById(id, val){
    const el = document.getElementById(id);
    if (!el) return false;
    const v = String(val || "").trim();
    if (!v) return false;
    el.textContent = v;
    return true;
  }

  function ensureValueNode(rowEl){
    // Prefer existing dedicated value nodes inside the row
    const existing =
      rowEl.querySelector("[data-ulydia='value']") ||
      rowEl.querySelector(".ulydia-kpi-value") ||
      rowEl.querySelector(".kpi-value") ||
      rowEl.querySelector(".chip-value");
    if (existing) return existing;

    // Create a value node aligned to the right
    const span = document.createElement("div");
    span.className = "ulydia-kpi-value";
    span.setAttribute("data-ulydia", "value");
    span.style.marginLeft = "auto";
    span.style.fontWeight = "700";
    span.style.color = "#111827";  // near-black
    span.style.whiteSpace = "nowrap";

    // make row a flex container if it isn't
    const cs = getComputedStyle(rowEl);
    if (cs.display !== "flex") {
      rowEl.style.display = "flex";
      rowEl.style.alignItems = "center";
      rowEl.style.gap = rowEl.style.gap || "12px";
    }
    rowEl.appendChild(span);
    return span;
  }

  function findKpiRowByLabel(label){
    const target = norm(label);
    // Search common text nodes
    const nodes = Array.from(document.querySelectorAll("div,span,p,strong,h4,h5,li"));
    for (const n of nodes) {
      const t = norm(n.textContent);
      if (!t) continue;
      if (t === target || t.includes(target)) {
        // climb to the nearest "row-like" block
        const row =
          n.closest("[role='listitem']") ||
          n.closest(".kpi-row") ||
          n.closest(".chip-row") ||
          n.closest(".card-item") ||
          n.closest(".w-dyn-item") ||
          n.closest("a,button,li,div");
        if (row) return row;
      }
    }
    return null;
  }

  function mapRemote(v){
    const s = String(v || "").trim();
    const k = s.toLowerCase();
    if (!s) return "";
    if (k === "rare") return "Rare";
    if (k === "possible") return "Possible";
    if (k === "frequent") return "Fréquent";
    return s; // fallback
  }

  function mapAutomation(v){
    const s = String(v || "").trim();
    const k = s.toLowerCase();
    if (!s) return "";
    if (k === "low") return "Faible";
    if (k === "medium") return "Moyen";
    if (k === "high") return "Élevé";
    return s;
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b) return;

    const remote = mapRemote(b.remote_level || b.Remote_level || b.remote || "");
    const autoR  = mapAutomation(b.automation_risk || b.Automation_risk || b.automation || "");
    const cur    = String(b.currency_display || b.currency || "").trim(); // currency_display like "EUR (€)" preferred
    const tte    = textSummary(b.time_to_employability || "");
    const grow   = textSummary(b.growth_outlook || "");
    const dem    = textSummary(b.market_demand || "");

    // 1) Try IDs first (keeps your intended HTML structure)
    const okId = [
      setTextById("js-chip-remote_level", remote),
      setTextById("js-chip-automation_risk", autoR),
      setTextById("js-chip-currency", cur),
      setTextById("js-chip-time_to_employability", tte),
      setTextById("js-chip-growth_outlook", grow),
      setTextById("js-chip-market_demand", dem),
    ].some(Boolean);

    // 2) Fallback: locate rows by visible labels and inject values
    const fillFallback = (label, value) => {
      if (!value) return false;
      const row = findKpiRowByLabel(label);
      if (!row) return false;
      const vNode = ensureValueNode(row);
      vNode.textContent = value;
      return true;
    };

    const okFallback = [
      fillFallback("Télétravail", remote),
      fillFallback("Risque d'automatisation", autoR),
      fillFallback("Devise", cur),
      fillFallback("Délai d'employabilité", tte),
      fillFallback("Croissance du marché", grow),
      fillFallback("Demande du marché", dem),
    ].some(Boolean);

    log("done", {okId, okFallback, remote, autoR, cur});
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    // last resort
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();