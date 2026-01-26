/* metier-page — SALARY.PATCH12 (SAFE)
   Robust salary grid rendering from Metier_Pays_Blocs fields:
   - salary_junior_min / salary_junior_max
   - salary_mid_min / salary_mid_max
   - salary_senior_min / salary_senior_max
   - salary_variable_share
   - currency (or Currency)  e.g. "EUR", "EUR (€)", "USD ($)", "GBP (£)"
   Writes into existing Salary card DOM (keeps your design).
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH12__) return;
  window.__ULYDIA_SALARY_PATCH12__ = true;

  const MAX_TRIES = 250; // ~12.5s
  const SLEEP = 50;

  const norm = (x) => String(x || "").replace(/\u00a0/g, " ").trim();

  const toNum = (x) => {
    if (x === null || x === undefined) return null;
    if (typeof x === "number" && isFinite(x)) return x;
    const s = norm(x).replace(/[, ]+/g, "").replace(/[^\d.\-]/g, "");
    if (!s) return null;
    const n = Number(s);
    return isFinite(n) ? n : null;
  };

  function getBlocFields(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || window.__ULYDIA_METIER_PAYS_BLOC__ || null;
    if (!b) return null;
    return b.fieldData || b.fields || b;
  }

  function pickCurrency(raw){
    const s = norm(raw);
    if (!s) return { code:"", symbol:"", display:"" };

    const m = s.match(/^([A-Z]{3})\s*\(([^)]+)\)\s*$/i);
    if (m) return { code: m[1].toUpperCase(), symbol: m[2], display: `${m[1].toUpperCase()} (${m[2]})` };

    const code = (s.match(/[A-Z]{3}/i)?.[0] || "").toUpperCase();
    const map = { EUR:"€", USD:"$", GBP:"£", CHF:"CHF", CAD:"$", AUD:"$", SGD:"$", NOK:"kr", SEK:"kr", DKK:"kr", JPY:"¥", CNY:"¥" };
    const symbol = map[code] || "";
    const display = symbol ? `${code} (${symbol})` : code || s;
    return { code, symbol, display };
  }

  function fmtRange(min, max, cur){
    const a = toNum(min), b = toNum(max);
    if (a === null && b === null) return "";
    const sym = cur?.symbol || "";
    const suffix = sym ? `K${sym}` : (cur?.code ? `K ${cur.code}` : "K");
    const sep = "–";
    if (a !== null && b !== null) return `${a}${sep}${b}${suffix}`;
    if (a !== null) return `${a}${suffix}+`;
    return `${b}${suffix}`;
  }

  function fmtPct(x){
    const n = toNum(x);
    if (n === null) return "";
    const pct = (n > 0 && n < 1) ? Math.round(n*100) : Math.round(n);
    return `${pct}%`;
  }

  function findSalaryCard(){
    const headers = document.querySelectorAll(".card-header .section-title, .section-title");
    for (const h of headers){
      const t = norm(h.textContent);
      if (t && t.toLowerCase().includes("grille salariale")){
        const card = h.closest(".card") || h.closest("section") || h.closest("div");
        if (card) return card;
      }
    }
    return document.getElementById("js-salary-card") || null;
  }

  function setTextByContains(card, label, value){
    if (!card || !value) return false;
    const nodes = card.querySelectorAll("*");
    for (const n of nodes){
      const t = norm(n.textContent);
      if (!t) continue;
      if (t.toLowerCase() === label.toLowerCase()){
        const row = n.closest(".salary-row, .kpi-row, .row, li, div") || n.parentElement;
        if (!row) continue;
        const right = row.querySelector(".salary-value, .value, .right, .kpi-value") || row.querySelectorAll("div,span,p")[1];
        if (right){
          right.textContent = value;
          return true;
        }
      }
    }
    return false;
  }

  function ensureVisible(card){
    if (!card) return;
    card.style.display = "";
    const col = card.closest("[data-col], .right-col, .sidebar, .col-right") || null;
    if (col) col.style.display = "";
  }

  function render(ctx){
    const b = getBlocFields(ctx);
    if (!b) return;

    const cur = pickCurrency(b.currency || b.Currency || b.devise || b.Devise);

    const junior = fmtRange(b.salary_junior_min, b.salary_junior_max, cur);
    const mid    = fmtRange(b.salary_mid_min, b.salary_mid_max, cur);
    const senior = fmtRange(b.salary_senior_min, b.salary_senior_max, cur);

    const variable = (() => {
      const raw = norm(b.salary_variable_share);
      if (!raw) return "";
      if (raw.includes("%")) return raw;
      return fmtPct(raw);
    })();

    const hasAny = !!(junior || mid || senior || variable);
    if (!hasAny) return;

    const card = findSalaryCard();
    if (!card) return;

    ensureVisible(card);

    const byId = (id, val) => {
      const el = document.getElementById(id);
      if (!el || !val) return false;
      el.textContent = val;
      return true;
    };

    const ok = [
      byId("js-salary-junior", junior),
      byId("js-salary-mid", mid),
      byId("js-salary-senior", senior),
      byId("js-salary-variable", variable),
    ].some(Boolean);

    if (!ok){
      setTextByContains(card, "Junior", junior);
      setTextByContains(card, "Confirmé", mid);
      setTextByContains(card, "Senior", senior);
      setTextByContains(card, "Part variable", variable);
    }

    const curEl = document.getElementById("js-chip-currency");
    if (curEl && cur.display) curEl.textContent = cur.display;
  }

  function hook(){
    if (window.__ULYDIA_METIER_BUS__?.on){
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", render);
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:RENDER_DONE", render);
    }

    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (ctx2) render(ctx2);
      if (tries >= MAX_TRIES) clearInterval(t);
    }, SLEEP);

    const root = document.getElementById("ulydia-metier-root") || document.body;
    if (root && window.MutationObserver){
      const obs = new MutationObserver(() => {
        const ctx3 = window.__ULYDIA_METIER_PAGE_CTX__;
        if (ctx3) render(ctx3);
      });
      obs.observe(root, { childList:true, subtree:true });
      setTimeout(()=>obs.disconnect(), 15000);
    }
  }

  hook();
})();