/* metier-page — BLOCKS.RIGHT.PATCH3 (CHECK + SAFE + SALARY)
   Injects Metier_Pays_Blocs into RIGHT rail blocks:
   - skills_must_have -> #js-skills-wrap (chips)
   - soft_skills      -> #js-softskills-wrap (skill tags)
   - tools_stack      -> #js-tools-wrap (badges)
   - certifications   -> #js-bf-certifications (rich)
   - schools_or_paths -> #js-bf-schools_or_paths (rich)
   - portfolio_projects -> #js-bf-portfolio_projects (rich)

   + NEW (SALARY):
   - Injects a "Grille salariale" card in the RIGHT column
     just ABOVE "Compétences incontournables" card.

   Safe: clears placeholders and HIDES each card if the field is empty.
*/
(() => {
  if (window.__ULYDIA_BLOCKS_RIGHT_PATCH3__) return;
  window.__ULYDIA_BLOCKS_RIGHT_PATCH3__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.right.patch3]", ...a);

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
    `.trim();
    document.head.appendChild(style);
  }

  function removeAnySalaryCards(){
    document.querySelectorAll("[data-ulydia-salary]").forEach(el => el.remove());
  }

  function buildSalaryHTML(/*b*/){
    // TODO: brancher ensuite aux vraies datas (b.salary / b.salaire / etc.)
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

  function injectSalaryAboveCompetences(b){
    // Find target card in RIGHT column by header text (same mechanism as other right blocks)
    const competencesCard = findCardByHeaderContains("Compétences incontournables");
    if (!competencesCard || !competencesCard.parentElement) return { ok:false, reason:"no-competences-card" };

    // If some older patch injected salary elsewhere, remove it and reinject here
    removeAnySalaryCards();
    ensureSalaryStyle();

    const wrap = document.createElement("div");
    wrap.innerHTML = buildSalaryHTML(b);
    const card = wrap.firstElementChild;
    if (!card) return { ok:false, reason:"salary-build-failed" };

    competencesCard.parentElement.insertBefore(card, competencesCard);
    return { ok:true };
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b) return;

    // 0) Salary card first (right column placement)
    const sal = injectSalaryAboveCompetences(b);

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

    log("applied", { salary: sal.ok, salaryReason: sal.reason, skills:r1.ok, soft:r2.ok, tools:r3.ok, cert:r4.ok, schools:r5.ok, portfolio:r6.ok });
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