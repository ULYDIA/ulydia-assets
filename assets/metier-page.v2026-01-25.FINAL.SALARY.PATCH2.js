/* metier-page — SALARY.PATCH2
   Injects salary grid from Metier_Pays_Blocs into placeholders:
   - #js-salary-country
   - #js-sal-*-range and #js-sal-bar-*
   - #js-sal-variable-share
   - #js-bf-salary_notes
*/
(() => {
  if (window.__ULYDIA_SALARY_PATCH2__) return;
  window.__ULYDIA_SALARY_PATCH2__ = true;

  function isNum(x){
    const n = Number(String(x || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function fmtMoney(n, currency){
    if (n == null) return { num: null, suffix: "" };
    const cur = String(currency || "").toUpperCase();
    const sym = cur == "EUR" ? "€" : (cur == "USD" ? "$" : (cur ? cur : ""));
    // Accept either raw annual (e.g. 35000) or already-in-K (e.g. 35)
    const raw = Number(n);
    if (!Number.isFinite(raw)) return { num: null, suffix: "" };
    const k = raw >= 1000 ? Math.round(raw/1000) : Math.round(raw);
    return { num: k, suffix: `K${sym}` };
  }

  function setText(id, val){
    const el = document.getElementById(id);
    if (!el) return false;
    const v = String(val || "").trim();
    if (!v) return false;
    el.textContent = v;
    return true;
  }

  function showCardByHeaderContains(label){
    const hs = document.querySelectorAll(".card-header .section-title");
    for (const h of hs) {
      const t = (h.textContent || "").trim();
      if (t && t.includes(label)) {
        const card = h.closest(".card") || h.closest("section") || h.parentElement;
        if (card) card.style.display = "";
      }
    }
  }

  function setBar(id, pct){
    const el = document.getElementById(id);
    if (!el) return false;
    const p = Math.max(0, Math.min(100, Number(pct)||0));
    el.style.width = p.toFixed(0) + "%";
    return true;
  }

  function rangeText(min, max, currency){
    const a = fmtMoney(min, currency);
    const b = fmtMoney(max, currency);
    if (a.num == null && b.num == null) return "";
    if (a.num != null && b.num != null) {
      // If same suffix, compress: "35-45K€"
      if (a.suffix === b.suffix) return `${a.num}-${b.num}${a.suffix}`;
      return `${a.num}${a.suffix} – ${b.num}${b.suffix}`;
    }
    const one = (a.num != null) ? `${a.num}${a.suffix}` : `${b.num}${b.suffix}`;
    return one;
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b) return;

    const currency = b.currency || b.Currency || "EUR";
    const iso = ctx?.iso || "";
    setText("js-salary-country", iso ? `(${iso})` : "");

    const jmin = isNum(b.salary_junior_min); const jmax = isNum(b.salary_junior_max);
    const mmin = isNum(b.salary_mid_min);    const mmax = isNum(b.salary_mid_max);
    const smin = isNum(b.salary_senior_min); const smax = isNum(b.salary_senior_max);

    const jr = rangeText(jmin, jmax, currency);
    const mr = rangeText(mmin, mmax, currency);
    const sr = rangeText(smin, smax, currency);

    const anyRange = [
      setText("js-sal-junior-range", jr),
      setText("js-sal-mid-range", mr),
      setText("js-sal-senior-range", sr)
    ].some(Boolean);

    // Bars: normalize to senior max (or max of all)
    const maxAll = [jmax,mmax,smax,jmin,mmin,smin].filter(x=>x!=null);
    const top = maxAll.length ? Math.max(...maxAll) : null;
    if (top) {
      if (jmax) setBar("js-sal-bar-junior", (jmax/top)*100);
      if (mmax) setBar("js-sal-bar-mid", (mmax/top)*100);
      if (smax) setBar("js-sal-bar-senior", (smax/top)*100);
    }

    const varShare = b.salary_variable_share;
    if (varShare != null && String(varShare).trim() !== "") {
      const vs = String(varShare).trim();
      setText("js-sal-variable-share", vs.includes("%") ? vs : (vs + "%"));
    }

    const notes = b.salary_notes || "";
    if (String(notes||"").trim()) {
      const el = document.getElementById("js-bf-salary_notes");
      if (el) el.textContent = String(notes).trim();
    }

    if (anyRange) showCardByHeaderContains("Grille salariale");
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);
    if (window.__ULYDIA_METIER_BUS__?.on) return window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);

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
