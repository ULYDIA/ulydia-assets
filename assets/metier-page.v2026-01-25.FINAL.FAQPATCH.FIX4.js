/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX4.js
   ULYDIA — FAQ Patch (CMS fallback)
   ✅ If window.__ULYDIA_FAQS__ is empty/undefined, reads FAQs from hidden Webflow CMS block:
      .ul-cms-faq-source (expected hidden collection list)
   ✅ Populates the BASE FAQ card (#faq-title) and enables accordion.
   ✅ Removes duplicate legacy FAQ block at page bottom when possible.
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX4__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX4__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX4]", ...a);

  const norm = (s) => String(s || "").replace(/\u00A0/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
  const lower = (s) => norm(s).toLowerCase();
  const upper = (s) => norm(s).toUpperCase();

  function slugify(s){
    return lower(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getCtx(){
    const url = new URL(location.href);
    const iso = upper(url.searchParams.get("iso") || url.searchParams.get("country") || "");
    const slug = slugify(url.searchParams.get("slug") || url.searchParams.get("metier") || url.searchParams.get("job") || "");
    return { iso, slug };
  }

  function getTitleSlug(){
    const h1 = document.querySelector("#ulydia-metier-root h1, h1");
    return slugify(h1 ? h1.textContent : "");
  }

  function pickFaqArray(){
    const a = window.__ULYDIA_FAQS__ || window.__ULYDIA_FAQS || window.__ULYDIA_FAQ__ || window.__ULYDIA_FAQ || null;
    return Array.isArray(a) ? a : [];
  }

  function readFaqsFromCMS(){
    const root = document.querySelector(".ul-cms-faq-source");
    if (!root) return [];

    // Common Webflow patterns: .w-dyn-items > .w-dyn-item, or [role=list] > [role=listitem]
    const items =
      [...root.querySelectorAll(".w-dyn-item")].length ? [...root.querySelectorAll(".w-dyn-item")] :
      [...root.querySelectorAll("[role='listitem']")].length ? [...root.querySelectorAll("[role='listitem']")] :
      [...root.children];

    const faqs = [];
    items.forEach((it) => {
      if (!(it instanceof Element)) return;

      // Prefer explicit class names if present
      const qEl =
        it.querySelector(".faq-question, .ul-faq-question, [data-faq='question'], [data-field='question'], .question") ||
        it.querySelector("h1,h2,h3,h4,strong") ||
        it.querySelector("p,div,span");

      const aEl =
        it.querySelector(".faq-answer, .ul-faq-answer, [data-faq='answer'], [data-field='answer'], .answer, .w-richtext") ||
        (() => {
          // pick the richest element that is not the question
          const cands = [...it.querySelectorAll("div,p,section,article")].filter(x => x !== qEl);
          cands.sort((a,b)=> (b.innerHTML||"").length - (a.innerHTML||"").length);
          return cands[0] || null;
        })();

      const question = norm(qEl ? qEl.textContent : "");
      const answerHtml = norm(aEl ? aEl.innerHTML : "");

      if (!question) return;
      if (!answerHtml) return;

      // optional iso/metier fields if present
      const isoEl = it.querySelector("[data-iso], .iso, .country, .code-iso");
      const metierEl = it.querySelector("[data-metier], .metier, .job, .metier-slug, .job-slug");
      const iso = isoEl ? upper(isoEl.getAttribute("data-iso") || isoEl.textContent) : "";
      const metier = metierEl ? slugify(metierEl.getAttribute("data-metier") || metierEl.textContent) : "";

      faqs.push({ question, answer: answerHtml, iso, metier });
    });

    log("CMS FAQ read:", faqs.length);
    return faqs;
  }

  function matches(item, ctx, titleSlug){
    const iso2 = upper(item.iso || item.country_code || item.code_iso || item.country || "");
    if (iso2 && ctx.iso && iso2 !== ctx.iso) return false;

    const k = slugify(item.metier || item.job_slug || item.metier_slug || item.slug || item.job || "");
    if (k){
      if (ctx.slug && (k === ctx.slug || k.includes(ctx.slug) || ctx.slug.includes(k))) return true;
      if (titleSlug && (k === titleSlug || k.includes(titleSlug) || titleSlug.includes(k))) return true;
      return false;
    }

    // no metier key => allow (better show than hide)
    return true;
  }

  function renderIntoBaseCard(faqs){
    const title = document.getElementById("faq-title");
    const card = title ? title.closest(".card") : null;
    if (!card) return false;

    const wrap = card.querySelector(".space-y-3") || card.querySelector("[data-ul-faqs]") || card;
    if (!faqs.length){
      card.style.display = "none";
      return true;
    }

    card.style.display = "";
    wrap.querySelectorAll(".faq-item").forEach(n => n.remove());

    const host = document.createElement("div");
    host.className = "space-y-3";
    host.innerHTML = faqs.map(f => {
      const q = norm(f.question);
      const a = String(f.answer||"").replace(/\u00A0/g," ").replace(/&nbsp;|&#160;/g," ");
      const aHtml = /<[a-z][\s\S]*>/i.test(a) ? a : `<p>${a}</p>`;
      return `
        <div class="faq-item">
          <button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
            <div class="flex items-start gap-3 flex-1">
              <span class="text-xl flex-shrink-0">❓</span>
              <span class="font-semibold text-sm" style="color: var(--text);">${q}</span>
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
    wrap.appendChild(host);

    wireToggles(card);
    return true;
  }

  function wireToggles(scope){
    const root = scope || document;
    if (root.__ulFaqBound) return;
    root.__ulFaqBound = true;

    root.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".faq-question");
      if (!btn) return;
      const item = btn.closest(".faq-item");
      if (!item) return;
      const ans = item.querySelector(".faq-answer");
      const icon = btn.querySelector(".faq-icon");
      if (!ans) return;
      ans.classList.toggle("hidden");
      if (icon) icon.style.transform = ans.classList.contains("hidden") ? "" : "rotate(180deg)";
    }, true);
  }

  function removeBottomDuplicate(){
    // Remove blocks that look like "Questions fréquentes" outside ulydia root
    const uroot = document.getElementById("ulydia-metier-root");
    const all = [...document.querySelectorAll("body *")];
    all.forEach(el => {
      if (!el || !(el instanceof Element)) return;
      if (uroot && uroot.contains(el)) return;

      const t = lower(el.textContent || "");
      if (!(t.includes("questions fréquentes") || t.includes("faq"))) return;

      // if it's a section-like container with many rows, remove the container
      const qCount = el.querySelectorAll("button, summary, .faq-question, li").length;
      if (qCount < 4) return;

      // Prefer removing the nearest section/div wrapper
      const wrap = el.closest("section") || el.closest("div");
      if (wrap && wrap !== document.body){
        try { wrap.remove(); log("Removed bottom duplicate FAQ"); } catch(_){}
      }
    });
  }

  async function boot(){
    // Wait a bit for BASE and CMS readers
    await new Promise(r => setTimeout(r, 300));

    const ctx = getCtx();
    const titleSlug = getTitleSlug();

    let faqs = pickFaqArray();
    log("global faqs:", faqs.length, { ctx, titleSlug });

    // Normalize into {question, answer, iso, metier}
    faqs = faqs.map(f => ({
      question: norm(f.question || f.q || f["Question"] || ""),
      answer: f.answer || f.a || f["Réponse"] || f["Reponse"] || "",
      iso: f.iso || f.country_code || f.code_iso || "",
      metier: f.metier || f.job_slug || f.metier_slug || f.slug || f.job || ""
    })).filter(x => x.question && x.answer);

    if (!faqs.length){
      faqs = readFaqsFromCMS();
    }

    const matched = faqs.filter(f => matches(f, ctx, titleSlug));

    // De-dup by question
    const seen = new Set();
    const out = [];
    matched.forEach(f => {
      const k = slugify(f.question);
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push(f);
    });

    log("faqs matched:", out.length);

    // Always show something if we have any FAQs at all (even if match failed)
    const finalFaqs = out.length ? out : faqs;

    renderIntoBaseCard(finalFaqs);

    // Remove bottom duplicate
    removeBottomDuplicate();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
