/* metier-page.v2026-01-25.FINAL.FAQ.PATCH1.js
   ULYDIA — FAQ patch (SAFE)
   Fixes degradation where FAQ items are stored by METIER NAME (e.g. "Contrôleur aérien")
   but BASE filters by URL slug (e.g. "controleur-aerien").

   ✅ Re-filters FAQs using ctx.metier.name (preferred) OR ctx.slug (fallback)
   ✅ Enforces iso/lang only if present on FAQ items
   ✅ Re-renders the FAQ card in-place (doesn't touch other blocks)
*/
(() => {
  if (window.__ULYDIA_FAQ_PATCH1__) return;
  window.__ULYDIA_FAQ_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[faq.patch1]", ...a);

  const norm = (s) => String(s || "").replace(/\u00A0/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
  const lower = (s) => norm(s).toLowerCase();
  const slugify = (s) => lower(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  function pickFirst(...vals){
    for (const v of vals){
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && norm(v) === "") continue;
      return v;
    }
    return "";
  }

  function stripUrlish(s){
    const t = norm(s);
    if (!t) return "";
    return t
      .replace(/^https?:\/\/[^/]+\//i, "")  // remove scheme+host
      .split(/[?#]/)[0]
      .split("|")[0]
      .trim();
  }

  function findFaqCard(){
    // BASE has #faq-title; fallback to any container with data-ul-faqs
    const title = document.getElementById("faq-title");
    const card = title ? (title.closest(".card") || title.closest("section") || title.parentElement) : null;
    if (card) return card;
    const wrap = document.querySelector("[data-ul-faqs]");
    return wrap ? (wrap.closest(".card") || wrap.closest("section") || wrap.parentElement) : null;
  }

  function getFaqWrap(card){
    if (!card) return null;
    return card.querySelector("[data-ul-faqs]") || card.querySelector(".space-y-3") || null;
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function formatInlineBold(s){
    const esc = escapeHtml(String(s || ""));
    return esc
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>");
  }

  function wireToggles(card){
    if (!card) return;
    const items = Array.from(card.querySelectorAll(".faq-item"));
    items.forEach(item => {
      const btn = item.querySelector(".faq-question");
      const ans = item.querySelector(".faq-answer");
      const icon = item.querySelector(".faq-icon");
      if (!btn || !ans) return;

      btn.addEventListener("click", () => {
        const isOpen = !ans.classList.contains("hidden");

        // close others (within this FAQ card only)
        items.forEach(other => {
          if (other === item) return;
          const a2 = other.querySelector(".faq-answer");
          const i2 = other.querySelector(".faq-icon");
          if (a2) a2.classList.add("hidden");
          if (i2) i2.style.transform = "rotate(0deg)";
        });

        if (isOpen) {
          ans.classList.add("hidden");
          if (icon) icon.style.transform = "rotate(0deg)";
        } else {
          ans.classList.remove("hidden");
          if (icon) icon.style.transform = "rotate(180deg)";
        }
      }, { passive: true });
    });
  }

  function getCtx(){
    return window.__ULYDIA_METIER_PAGE_CTX__ || null;
  }

  function getMetierName(ctx){
    const m = ctx?.metier || ctx?.payload?.metier || null;
    const f = m ? (m.fieldData || m.fields || m) : {};
    return norm(
      pickFirst(
        f.Nom, f.nom, f.name, f.title,
        m?.name, ctx?.payload?.metier?.name
      )
    );
  }

  function getAllFaqs(ctx){
    // Priority: CMS global, then payload
    const a = window.__ULYDIA_FAQS__;
    if (Array.isArray(a) && a.length) return a;
    const p = ctx?.payload || {};
    const b = p.faq || p.faqs || p.FAQ || p.items || null;
    return Array.isArray(b) ? b : [];
  }

  function faqMatches(item, ctx, targetSlugFromName){
    if (!item) return false;

    const iso = String(ctx?.iso || "").trim().toUpperCase();
    const lang = String(ctx?.lang || "").trim().toLowerCase();

    const iso2 = String(item.iso || item.country_code || item.code_iso || item.country || "").trim().toUpperCase();
    const lang2 = String(item.lang || item.langue || item.language || "").trim().toLowerCase();

    const raw = String(
      item.job_slug || item.metier_slug || item.slug || item.metier || item.job || item.metier_ref || item.name || ""
    ).trim();
    if (!raw) return false;

    const raw2 = stripUrlish(raw);
    const cand = slugify(raw2);

    // Match either:
    // - URL slug (ctx.slug)  OR
    // - slugified metier name (preferred) OR
    // - exact name equality (rare but safe)
    const okJob =
      cand === slugify(ctx.slug) ||
      (targetSlugFromName && cand === targetSlugFromName) ||
      (targetSlugFromName && slugify(raw) === targetSlugFromName) ||
      (norm(raw) && norm(raw) === getMetierName(ctx));

    if (!okJob) return false;

    // Enforce iso/lang only if present in FAQ row
    if (iso2 && iso2 !== iso) return false;
    if (lang2 && lang && lang2 !== lang) return false;

    return true;
  }

  function render(card, list){
    const wrap = getFaqWrap(card);
    if (!wrap) return;

    if (!Array.isArray(list) || list.length === 0) {
      wrap.innerHTML = "";
      card.style.display = "none";
      return;
    }

    card.style.display = "";
    wrap.innerHTML = list.map(item => {
      const q = norm(item.question || item.q || item["Question"] || "") || "—";
      const a = String(item.answer || item.a || item["Réponse"] || item["Reponse"] || "").trim();
      const qSafe = formatInlineBold(q);
      const aHtml = /<[a-z][\s\S]*>/i.test(a) ? a : `<p>${formatInlineBold(a)}</p>`;
      return `
        <div class="faq-item">
          <button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
            <div class="flex items-start gap-3 flex-1">
              <span class="text-xl flex-shrink-0">❓</span>
              <span class="font-semibold text-sm" style="color: var(--text);">${qSafe}</span>
            </div>
            <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
            ${aHtml}
          </div>
        </div>
      `;
    }).join("");

    wireToggles(card);
  }

  function run(ctx){
    const card = findFaqCard();
    if (!card) return;

    const metierName = getMetierName(ctx);
    const targetFromName = metierName ? slugify(metierName) : "";
    const all = getAllFaqs(ctx);
    const filtered = Array.isArray(all) ? all.filter(x => faqMatches(x, ctx, targetFromName)) : [];

    log("ctx", { slug: ctx?.slug, iso: ctx?.iso, lang: ctx?.lang, metierName, targetFromName, total: all.length, matched: filtered.length });
    render(card, filtered);
  }

  function onReady(){
    const ctx = getCtx();
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    // fallback poll (bounded)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = getCtx();
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();
