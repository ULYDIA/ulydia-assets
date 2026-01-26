/* metier-page — BLOCKS.RIGHT.PATCH2 (CHECK + SAFE)
   Injects Metier_Pays_Blocs into RIGHT rail blocks:
   - skills_must_have -> #js-skills-wrap (chips)
   - soft_skills      -> #js-softskills-wrap (skill tags)
   - tools_stack      -> #js-tools-wrap (badges)
   - certifications   -> #js-bf-certifications (rich)
   - schools_or_paths -> #js-bf-schools_or_paths (rich)
   - portfolio_projects -> #js-bf-portfolio_projects (rich)
   Safe: clears placeholders and HIDES each card if the field is empty.
*/
(() => {
  if (window.__ULYDIA_BLOCKS_RIGHT_PATCH2__) return;
  window.__ULYDIA_BLOCKS_RIGHT_PATCH2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.right.patch2]", ...a);

  function isEmptyRich(html){
    const s = String(html || "").replace(/\u00a0/g, " ").trim();
    if (!s) return true;
    const stripped = s
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    return !stripped;
  }

  function sanitizeHTML(html){
    let s = String(html || "");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  function extractItems(htmlOrText){
    const s = String(htmlOrText || "").trim();
    if (!s) return [];
    if (/<li[\s>]/i.test(s)) {
      const items = [];
      const m = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      for (const li of m) {
        const t = li
          .replace(/<li[^>]*>/i,"").replace(/<\/li>/i,"")
          .replace(/<[^>]+>/g,"").replace(/\u00a0/g," ")
          .replace(/[ \t\r\n]+/g," ")
          .trim();
        if (t) items.push(t);
      }
      return items;
    }
    return s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "\n")
      .split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean);
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function findCardByHeaderContains(label){
    const hs = document.querySelectorAll(".card-header .section-title");
    for (const h of hs) {
      const t = (h.textContent || "").trim();
      if (t && t.includes(label)) {
        return h.closest(".card") || h.closest("section") || h.parentElement || null;
      }
    }
    return null;
  }

  function showCard(card){ if (card) { card.style.display=""; card.hidden=false; card.classList.remove("hidden"); } }
  function hideCard(card){ if (card) { card.style.display="none"; card.hidden=true; } }

  function setChips(containerId, items, max=10){
    const el = document.getElementById(containerId);
    if (!el) return { ok:false };
    const list = (items || []).filter(Boolean);
    if (!list.length) { el.innerHTML=""; return { ok:false }; }
    const slice = list.slice(0, max);
    el.innerHTML = slice.map(t => `<span class="chip badge-primary">${escapeHtml(t)}</span>`).join(" ");
    if (list.length > max) el.insertAdjacentHTML("beforeend", ` <span class="chip" style="opacity:.8">+${list.length-max}</span>`);
    return { ok:true, count:list.length };
  }

  function setBadges(containerId, items, max=12){
    const el = document.getElementById(containerId);
    if (!el) return { ok:false };
    const list = (items || []).filter(Boolean);
    if (!list.length) { el.innerHTML=""; return { ok:false }; }
    const slice = list.slice(0, max);
    el.innerHTML = slice.map(t => `<span class="badge badge-primary">${escapeHtml(t)}</span>`).join(" ");
    if (list.length > max) el.insertAdjacentHTML("beforeend", ` <span class="badge" style="opacity:.8">+${list.length-max}</span>`);
    return { ok:true, count:list.length };
  }

  function setSkillTags(containerId, items, max=8){
    const el = document.getElementById(containerId);
    if (!el) return { ok:false };
    const list = (items || []).filter(Boolean);
    if (!list.length) { el.innerHTML=""; return { ok:false }; }
    const slice = list.slice(0, max);
    el.innerHTML = slice.map(t => `
      <div class="skill-tag">
        <span class="text-lg">🧩</span>
        <span class="text-sm font-semibold" style="color: var(--text);">${escapeHtml(t)}</span>
      </div>
    `).join("");
    if (list.length > max) el.insertAdjacentHTML("beforeend", `<div class="text-xs" style="color: var(--muted); margin-top:8px;">+${list.length-max} autres</div>`);
    return { ok:true, count:list.length };
  }

  function setRich(containerId, html){
    const el = document.getElementById(containerId);
    if (!el) return { ok:false };
    if (isEmptyRich(html)) { el.innerHTML=""; return { ok:false }; }
    el.innerHTML = sanitizeHTML(html);
    return { ok:true };
  }


  // ---------------------------
  // SALARY CARD (RIGHT COLUMN)
  // - Always inject ABOVE "Compétences incontournables"
  // - Remove any previous misplaced salary block
  // ---------------------------
  function ensureSalaryStyle(){
    if (document.getElementById("ulydia-salary-style")) return;
    const style = document.createElement("style");
    style.id = "ulydia-salary-style";
    style.textContent = `
.ul-salary-card{
  border-radius:20px;
  background:#f8fafc;
  border:1px solid rgba(20,20,20,.08);
  overflow:hidden;
  margin-bottom:14px;
}
.ul-salary-header{
  background:linear-gradient(135deg,#16a34a,#22c55e);
  color:#fff;
  padding:14px 16px;
  font-weight:700;
  font-size:14px;
}
.ul-salary-body{ padding:14px 16px; }
.ul-salary-row{ margin-bottom:14px; }
.ul-salary-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
  font-weight:600;
  font-size:13px;
}
.ul-salary-top span:last-child{ font-weight:700; }
.ul-salary-bar{
  height:10px;
  background:#e5e7eb;
  border-radius:999px;
  overflow:hidden;
  margin:6px 0;
}
.ul-salary-fill{
  height:100%;
  background:linear-gradient(135deg,#16a34a,#22c55e);
  border-radius:999px;
}
.ul-salary-sub{ font-size:12px; color:#6b7280; }
.ul-salary-divider{ height:1px; background:#e5e7eb; margin:12px 0; }
/* Hide any other salary blocks injected elsewhere */
[data-ulydia-salary]:not(.ul-salary-right){ display:none !important; }
    `.trim();
    document.head.appendChild(style);
  }

  function removeAnySalaryCards(){
    document.querySelectorAll("[data-ulydia-salary]").forEach(el => el.remove());
  }

  function buildSalaryHTML(){
    // DEMO values (France) — brancher aux vraies datas ensuite
    return `
<section class="ul-salary-card" data-ulydia-salary>
  <div class="ul-salary-header">💰 Grille salariale (France)</div>
  <div class="ul-salary-body">

    <div class="ul-salary-row">
      <div class="ul-salary-top"><span>🧳 Junior</span><span>35–45K€</span></div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:40%"></div></div>
      <div class="ul-salary-sub">0–2 ans d’expérience</div>
    </div>

    <div class="ul-salary-row">
      <div class="ul-salary-top"><span>🚀 Confirmé</span><span>45–60K€</span></div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:65%"></div></div>
      <div class="ul-salary-sub">3–5 ans d’expérience</div>
    </div>

    <div class="ul-salary-row">
      <div class="ul-salary-top"><span>⭐ Senior</span><span>60–85K€</span></div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:90%"></div></div>
      <div class="ul-salary-sub">5+ ans d’expérience</div>
    </div>

    <div class="ul-salary-divider"></div>

    <div class="ul-salary-row">
      <div class="ul-salary-top"><span>📌 Part variable</span><span>5–15%</span></div>
      <div class="ul-salary-bar"><div class="ul-salary-fill" style="width:20%"></div></div>
      <div class="ul-salary-sub">Bonus, intéressement, participation</div>
    </div>

  </div>
</section>`.trim();
  }


  // ---------------------------
  // INDICATEURS CLÉS (RIGHT COLUMN)
  // - Remote / Automation / Devise / Employabilité / Croissance / Demande
  // - Inject ABOVE salary card (or above Compétences if salary missing)
  // ---------------------------
  function ensureIndicatorsStyle(){
    if (document.getElementById("ulydia-indicators-style")) return;
    const style = document.createElement("style");
    style.id = "ulydia-indicators-style";
    style.textContent = `
.ul-ind-card{
  border-radius:20px;
  overflow:hidden;
  border:1px solid rgba(20,20,20,.08);
  background:#fff;
  margin-bottom:14px;
}
.ul-ind-header{
  padding:16px 16px;
  color:#fff;
  font-weight:800;
  font-size:14px;
  background:linear-gradient(135deg,#6d28d9,#7c3aed);
}
.ul-ind-body{ padding:14px 14px 10px; background:#f8fafc; }
.ul-ind-item{
  display:flex;
  align-items:center;
  gap:12px;
  background:#fff;
  border:1px solid rgba(20,20,20,.08);
  border-radius:16px;
  padding:12px 12px;
  margin-bottom:10px;
}
.ul-ind-icon{
  width:42px; height:42px;
  border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  font-size:20px;
  background:rgba(16,185,129,.10);
}
.ul-ind-lines{ min-width:0; }
.ul-ind-k{ font-weight:700; font-size:12px; color:rgba(20,20,20,.55); line-height:1.2; }
.ul-ind-v{ font-weight:900; font-size:14px; color:rgba(20,20,20,.92); line-height:1.2; margin-top:2px; }
.ul-ind-v.green{ color:#10b981; }
.ul-ind-v.red{ color:#ef4444; }
.ul-ind-v.purple{ color:#7c3aed; }
    `.trim();
    document.head.appendChild(style);
  }

  function removeAnyIndicatorsCards(){
    document.querySelectorAll("[data-ulydia-indicators]").forEach(el => el.remove());
  }

  function _normKey(k){
    return String(k||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"") // strip accents
      .replace(/[^a-z0-9]+/g,"_")
      .replace(/^_+|_+$/g,"");
  }

  function getChip(b, key){
    const c = b && b.chips ? b.chips : {};
    const target = _normKey(key);

    // direct/normalized match
    for (const kk in c){
      if (!Object.prototype.hasOwnProperty.call(c, kk)) continue;
      if (_normKey(kk) === target) return c[kk];
    }

    // includes match (e.g. "Delai d'employabilite (mois)")
    for (const kk in c){
      if (!Object.prototype.hasOwnProperty.call(c, kk)) continue;
      const nk = _normKey(kk);
      if (nk.includes(target)) return c[kk];
    }

    return null;
  }

  function getChipAny(b, keys){
    for (const k of (keys||[])){
      const v = getChip(b, k);
      if (v != null && String(v).trim() !== "") return v;
    }
    return "";
  }

  function formatCurrency(v){
    let s = String(v||"").trim();
    if (!s) return "";
    // already like "EUR (€)"
    if (/\(\s*[^)]+\s*\)/.test(s)) return s;
    const up = s.toUpperCase();
    const map = { EUR:"€", USD:"$", GBP:"£", JPY:"¥", CAD:"$", AUD:"$", CHF:"CHF" };
    if (map[up]) return `${up} (${map[up]})`;
    return s;
  }


  function buildIndicatorsHTML(b){
    // Pull from b.chips when possible (already present in your data model)
    const remote = getChipAny(b, ["Remote_level","Télétravail","Teletravail","Remote","Remote work","Remote level"]) || (b.remote_level || b.remote || "");
    const automation = getChipAny(b, ["Automation_risk","Risque d'automatisation","Risque d automatisation","Automation risk"]) || (b.automation_risk || "");

    const currencyRaw = getChipAny(b, ["Devise","Currency","Monnaie"]) || (b.currency || b.devise || "");
    const currency = formatCurrency(currencyRaw || "EUR");

    const employability = getChipAny(b, ["Délai d'employabilité","Delai d'employabilite","Employability_delay","Employability","Delai employabilite"]) || (b.employability_delay || b.delai_employabilite || "");
    const growth = getChipAny(b, ["Croissance du marché","Croissance du marche","Market_growth","Growth"]) || (b.market_growth || b.croissance_marche || "");
    const demand = getChipAny(b, ["Demande du marché","Demande du marche","Market_demand","Demand"]) || (b.market_demand || b.demande_marche || "");
    // If nothing meaningful, return empty to skip card
    const hasAny = [remote, automation, currency, employability, growth, demand].some(v => String(v||"").trim());
    if (!hasAny) return "";

    function item(icon, label, value, tone){
      const cls = tone ? (" " + tone) : "";
      return `
<div class="ul-ind-item">
  <div class="ul-ind-icon">${icon}</div>
  <div class="ul-ind-lines">
    <div class="ul-ind-k">${label}</div>
    <div class="ul-ind-v${cls}">${value}</div>
  </div>
</div>`.trim();
    }

    // Tone heuristics
    const autoTone = /faible|low/i.test(String(automation)) ? "green" : (/fort|high/i.test(String(automation)) ? "red" : "purple");
    const demandTone = /très|fort|strong|high/i.test(String(demand)) ? "red" : (/faible|low/i.test(String(demand)) ? "green" : "purple");

    const html = `
<section class="ul-ind-card" data-ulydia-indicators>
  <div class="ul-ind-header">📊 Indicateurs clés</div>
  <div class="ul-ind-body">
    ${remote ? item("🏠","Télétravail", String(remote), "purple") : ""}
    ${automation ? item("🤖","Risque d'automatisation", String(automation), autoTone) : ""}
    ${currency ? item("💰","Devise", String(currency), "purple") : ""}
    ${employability ? item("⏱️","Délai d'employabilité", String(employability), "purple") : ""}
    ${growth ? item("📈","Croissance du marché", String(growth), "green") : ""}
    ${demand ? item("🔥","Demande du marché", String(demand), demandTone) : ""}
  </div>
</section>`.trim();

    return html;
  }

  function injectIndicatorsAboveSalaryOrCompetences(b){
    // Remove any indicators injected elsewhere
    removeAnyIndicatorsCards();
    ensureIndicatorsStyle();

    const html = buildIndicatorsHTML(b);
    if (!html) return { ok:false, reason:"no-data" };

    // Prefer insert above salary card if present, else above Compétences card
    const salary = document.querySelector("[data-ulydia-salary].ul-salary-right");
    const competences = findCardByHeaderContains("Compétences incontournables");

    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const card = wrap.firstElementChild;
    if (!card) return { ok:false, reason:"build-failed" };

    if (salary && salary.parentElement) {
      salary.parentElement.insertBefore(card, salary);
      return { ok:true, where:"above-salary" };
    }
    if (competences && competences.parentElement) {
      competences.parentElement.insertBefore(card, competences);
      return { ok:true, where:"above-competences" };
    }
    return { ok:false, reason:"no-anchor" };
  }


  function injectSalaryAboveCompetences(){
    const c = findCardByHeaderContains("Compétences incontournables");
    if (!c || !c.parentElement) return { ok:false, reason:"no-competences-card" };

    // Kill any previous misplaced salary and inject here
    removeAnySalaryCards();
    ensureSalaryStyle();

    const wrap = document.createElement("div");
    wrap.innerHTML = buildSalaryHTML();
    const card = wrap.firstElementChild;
    if (card) card.classList.add('ul-salary-right');
    if (!card) return { ok:false, reason:"salary-build-failed" };

    c.parentElement.insertBefore(card, c);
    return { ok:true };
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b) return;

    // Salary card in right column (above Compétences incontournables)
    const sal = injectSalaryAboveCompetences();
    // Indicateurs clés (above salary)
    const ind = injectIndicatorsAboveSalaryOrCompetences(b);

    // Short bounded cleanup: during first ~4s, hide/remove any stray salary blocks injected later
    const _t0 = Date.now();
    (function _cleanup(){
      try{
        document.querySelectorAll("[data-ulydia-salary]").forEach(el=>{
          if (!el.classList.contains("ul-salary-right")) {
            // hide rule already applies; remove to keep DOM clean
            el.remove();
          }
        });
      }catch(e){}
      if (Date.now() - _t0 < 4000) requestAnimationFrame(_cleanup);
    })();

    const c1 = findCardByHeaderContains("Compétences incontournables");
    const skills = extractItems(b.skills_must_have || b.Skills_must_have || "");
    const r1 = setChips("js-skills-wrap", skills, 10);
    (r1.ok ? showCard : hideCard)(c1);

    const c2 = findCardByHeaderContains("Soft Skills essentiels");
    const soft = extractItems(b.soft_skills || b.Soft_skills || "");
    const r2 = setSkillTags("js-softskills-wrap", soft, 8);
    (r2.ok ? showCard : hideCard)(c2);

    const c3 = findCardByHeaderContains("Stack Technique Populaire");
    const tools = extractItems(b.tools_stack || b.Tools_stack || "");
    const r3 = setBadges("js-tools-wrap", tools, 12);
    (r3.ok ? showCard : hideCard)(c3);

    const c4 = findCardByHeaderContains("Certifications utiles");
    const r4 = setRich("js-bf-certifications", b.certifications || b.Certifications || "");
    (r4.ok ? showCard : hideCard)(c4);

    const c5 = findCardByHeaderContains("Écoles");
    const r5 = setRich("js-bf-schools_or_paths", b.schools_or_paths || b.Schools_or_paths || "");
    (r5.ok ? showCard : hideCard)(c5);

    const c6 = findCardByHeaderContains("Projets Portfolio");
    const r6 = setRich("js-bf-portfolio_projects", b.portfolio_projects || b.Portfolio_projects || "");
    (r6.ok ? showCard : hideCard)(c6);

    log("applied", { indicators: ind?.ok, indicatorsWhere: ind?.where, salary: sal?.ok, skills:r1.ok, soft:r2.ok, tools:r3.ok, cert:r4.ok, schools:r5.ok, portfolio:r6.ok });
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