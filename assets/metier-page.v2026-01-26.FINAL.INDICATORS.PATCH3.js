/* metier-page.v2026-01-26.FINAL.INDICATORS.PATCH3.js
   ULYDIA — Indicators KPI renderer (SAFE, no layout break)

   Fixes empty Télétravail / Risque d'automatisation WITHOUT turning large containers into flex.
   It only injects into a "row" element that looks like a KPI item (small box).
*/
(() => {
  if (window.__ULYDIA_INDICATORS_PATCH3__) return;
  window.__ULYDIA_INDICATORS_PATCH3__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[indicators.patch3]", ...a);

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

  function looksLikeSmallRow(el){
    if (!el || el === document.body || el === document.documentElement) return false;
    const r = el.getBoundingClientRect();
    if (!isFinite(r.width) || !isFinite(r.height)) return false;

    // typical KPI row is a small rounded box, not a full column/grid container
    if (r.width > 520) return false;     // avoid columns / big cards
    if (r.height > 140) return false;    // avoid big containers
    if (el.querySelectorAll(".card, .w-richtext, .w-dyn-list").length > 0) return false;
    if (el.querySelectorAll("p, li").length > 8) return false;

    return true;
  }

  function ensureValueNode(rowEl){
    const existing =
      rowEl.querySelector("[data-ulydia='value']") ||
      rowEl.querySelector(".ulydia-kpi-value") ||
      rowEl.querySelector(".kpi-value") ||
      rowEl.querySelector(".chip-value");
    if (existing) return existing;

    const span = document.createElement("div");
    span.className = "ulydia-kpi-value";
    span.setAttribute("data-ulydia", "value");
    span.style.marginLeft = "auto";
    span.style.fontWeight = "700";
    span.style.color = "#111827";
    span.style.whiteSpace = "nowrap";

    const cs = getComputedStyle(rowEl);
    if (cs.display !== "flex") {
      // only make THIS row flex (and only if it looks safe)
      rowEl.style.display = "flex";
      rowEl.style.alignItems = "center";
      rowEl.style.gap = rowEl.style.gap || "12px";
    }
    rowEl.appendChild(span);
    return span;
  }

  function findKpiRowByLabel(label){
    const target = norm(label);
    // search for text nodes with that label
    const nodes = Array.from(document.querySelectorAll("div,span,p,strong,h4,h5,li"));
    for (const n of nodes) {
      const t = norm(n.textContent);
      if (!t) continue;
      if (t === target || t.includes(target)) {
        // climb up until we find something that looks like a SMALL KPI row
        let el = n;
        for (let i=0; i<10 && el; i++){
          const cand = el.closest("li, a, button, [role='listitem'], .card-item, .kpi-row, .chip-row, div");
          if (!cand) break;
          if (looksLikeSmallRow(cand)) return cand;
          // climb one step up and try again
          el = cand.parentElement;
        }
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
    return s;
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
    const cur    = String(b.currency_display || b.currency || "").trim();
    const tte    = textSummary(b.time_to_employability || "");
    const grow   = textSummary(b.growth_outlook || "");
    const dem    = textSummary(b.market_demand || "");

    // IDs first
    const okId = [
      setTextById("js-chip-remote_level", remote),
      setTextById("js-chip-automation_risk", autoR),
      setTextById("js-chip-currency", cur),
      setTextById("js-chip-time_to_employability", tte),
      setTextById("js-chip-growth_outlook", grow),
      setTextById("js-chip-market_demand", dem),
    ].some(Boolean);

    // Fallback rows by label (safe)
    const fill = (label, value) => {
      if (!value) return false;
      const row = findKpiRowByLabel(label);
      if (!row) return false;
      const node = ensureValueNode(row);
      node.textContent = value;
      return true;
    };

    const okFb = [
      fill("Télétravail", remote),
      fill("Risque d'automatisation", autoR),
      fill("Devise", cur),
      fill("Délai d'employabilité", tte),
      fill("Croissance du marché", grow),
      fill("Demande du marché", dem),
    ].some(Boolean);

    log("done", {okId, okFb, remote, autoR, cur});
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

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