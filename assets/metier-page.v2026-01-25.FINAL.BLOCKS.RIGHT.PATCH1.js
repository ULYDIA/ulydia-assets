/* metier-page — BLOCKS.RIGHT.PATCH1
   Injects Metier_Pays_Blocs into RIGHT rail blocks:
   - skills_must_have -> #js-skills-wrap (chips)
   - soft_skills      -> #js-softskills-wrap (skill tags)
   - tools_stack      -> #js-tools-wrap (badges)
   - certifications   -> #js-bf-certifications (rich)
   - schools_or_paths -> #js-bf-schools_or_paths (rich)
   - portfolio_projects -> #js-bf-portfolio_projects (rich)
*/
(() => {
  if (window.__ULYDIA_BLOCKS_RIGHT_PATCH1__) return;
  window.__ULYDIA_BLOCKS_RIGHT_PATCH1__ = true;

  function isEmptyRich(html){
    const s = String(html || "").replace(/\u00a0/g, " ").trim();
    if (!s) return true;
    const stripped = s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    return !stripped;
  }

  function extractItems(htmlOrText){
    const s = String(htmlOrText || "").trim();
    if (!s) return [];
    // If contains <li>, parse quickly
    if (/<li[\s>]/i.test(s)) {
      const items = [];
      const m = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      for (const li of m) {
        const t = li.replace(/<li[^>]*>/i,"").replace(/<\/li>/i,"")
          .replace(/<[^>]+>/g,"").replace(/\u00a0/g," ")
          .trim();
        if (t) items.push(t);
      }
      return items;
    }
    // Otherwise split on newlines / commas
    return s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "\n")
      .split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean);
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

  function setChips(containerId, items, max=10){
    const el = document.getElementById(containerId);
    if (!el) return false;
    const list = (items || []).filter(Boolean);
    if (!list.length) return false;

    const slice = list.slice(0, max);
    el.innerHTML = slice.map((t) => `<span class="chip badge-primary">${escapeHtml(t)}</span>`).join(" ");
    if (list.length > max) el.insertAdjacentHTML("beforeend", ` <span class="chip" style="opacity:.8">+${list.length-max}</span>`);
    return true;
  }

  function setBadges(containerId, items, max=12){
    const el = document.getElementById(containerId);
    if (!el) return false;
    const list = (items || []).filter(Boolean);
    if (!list.length) return false;

    const slice = list.slice(0, max);
    el.innerHTML = slice.map((t) => `<span class="badge badge-primary">${escapeHtml(t)}</span>`).join(" ");
    if (list.length > max) el.insertAdjacentHTML("beforeend", ` <span class="badge" style="opacity:.8">+${list.length-max}</span>`);
    return true;
  }

  function setSkillTags(containerId, items, max=8){
    const el = document.getElementById(containerId);
    if (!el) return false;
    const list = (items || []).filter(Boolean);
    if (!list.length) return false;

    const slice = list.slice(0, max);
    el.innerHTML = slice.map((t) => `
      <div class="skill-tag">
        <span class="text-lg">🧩</span>
        <span class="text-sm font-semibold" style="color: var(--text);">${escapeHtml(t)}</span>
      </div>
    `).join("");
    if (list.length > max) el.insertAdjacentHTML("beforeend", `<div class="text-xs" style="color: var(--muted); margin-top:8px;">+${list.length-max} autres</div>`);
    return true;
  }

  function setRich(containerId, html){
    const el = document.getElementById(containerId);
    if (!el) return false;
    if (isEmptyRich(html)) return false;
    el.innerHTML = String(html);
    return true;
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function run(ctx){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    if (!b) return;

    // Skills must-have -> chips
    const skills = extractItems(b.skills_must_have || b.Skills_must_have || "");
    if (setChips("js-skills-wrap", skills, 10)) showCardByHeaderContains("Compétences incontournables");

    // Soft skills -> tags
    const soft = extractItems(b.soft_skills || b.Soft_skills || "");
    if (setSkillTags("js-softskills-wrap", soft, 8)) showCardByHeaderContains("Soft Skills essentiels");

    // Tools -> badges
    const tools = extractItems(b.tools_stack || b.Tools_stack || "");
    if (setBadges("js-tools-wrap", tools, 12)) showCardByHeaderContains("Stack Technique Populaire");

    // Rich lists
    if (setRich("js-bf-certifications", b.certifications || b.Certifications || "")) showCardByHeaderContains("Certifications utiles");
    if (setRich("js-bf-schools_or_paths", b.schools_or_paths || b.Schools_or_paths || "")) showCardByHeaderContains("Écoles");
    if (setRich("js-bf-portfolio_projects", b.portfolio_projects || b.Portfolio_projects || "")) showCardByHeaderContains("Projets Portfolio");
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
