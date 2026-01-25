/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX5.js
   ULYDIA — FAQ Patch (strict matching, no "other metier" leakage)
   Key fix vs FIX4:
   - We DO NOT display FAQs without metier key IF we can find matched FAQs for the current metier.
   - If no matched FAQs exist, we fallback to (iso-matched) FAQs with empty metier only (generic FAQs).
   - Only as last resort do we show any iso-matched FAQs.
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX5__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX5__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX5]", ...a);

  const norm = (s) => String(s || "")
    .replace(/\u00A0/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();

  function slugify(s){
    return lower(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getCtx(){
    const url = new URL(location.href);
    const iso = upper(url.searchParams.get("country") || url.searchParams.get("iso") || "");
    const slug = slugify(url.searchParams.get("metier") || url.searchParams.get("slug") || url.searchParams.get("job") || "");
    return { iso, slug };
  }

  function readFaqsFromWindow(){
    const a = window.__ULYDIA_FAQS__ || window.__ULYDIA_FAQS || null;
    return Array.isArray(a) ? a : [];
  }

  function readFaqsFromCMS(){
    const root = document.querySelector(".ul-cms-faq-source");
    if (!root) return [];
    const items = [...root.querySelectorAll(":scope > *")];
    const faqs = [];

    items.forEach((it) => {
      const qEl =
        it.querySelector(".faq-question, .ul-faq-question, [data-faq='question'], [data-field='question'], .question, h1,h2,h3,h4,p,div") || null;

      // answer: prefer richtext blocks
      const aEl =
        it.querySelector(".faq-answer, .ul-faq-answer, [data-faq='answer'], [data-field='answer'], .answer, .w-richtext") ||
        (() => {
          const cands = [...it.querySelectorAll(".w-richtext, div, p")].filter(x => x !== qEl);
          cands.sort((a,b)=> (b.innerHTML||"").length - (a.innerHTML||"").length);
          return cands[0] || null;
        })();

      const question = norm(qEl ? qEl.textContent : "");
      const answerHtml = norm(aEl ? aEl.innerHTML : "");
      if (!question || !answerHtml) return;

      // ISO / metier (try several selectors to actually get it)
      const isoEl = it.querySelector("[data-iso],[data-country],.iso,.country,.code-iso,[data-field='country'],[data-field='iso']");
      const metierEl = it.querySelector(
        "[data-metier],[data-slug],[data-job],.metier,.job,.metier-slug,.job-slug,[data-field='metier'],[data-field='job_slug'],[data-field='slug']"
      );

      const iso = isoEl ? upper(isoEl.getAttribute("data-iso") || isoEl.getAttribute("data-country") || isoEl.textContent) : "";
      const metier = metierEl ? slugify(metierEl.getAttribute("data-metier") || metierEl.getAttribute("data-slug") || metierEl.textContent) : "";

      faqs.push({ question, answer: answerHtml, iso, metier });
    });

    log("CMS FAQs:", faqs.length);
    return faqs;
  }

  function normalizeFaqItem(it){
    const o = it?.fieldData || it?.fields || it || {};
    return {
      question: norm(o.question || o.Question || o.q || o.title || o.name || it.question),
      answer: norm(o.answer || o.Answer || o.a || o.content || it.answer || it.answerHtml || ""),
      iso: upper(o.iso || o.country || o.country_code || o.code_iso || it.iso || ""),
      metier: slugify(o.metier || o.job_slug || o.metier_slug || o.slug || o.job || it.metier || "")
    };
  }

  function matchesMetier(metierKey, ctx, titleSlug){
    const k = slugify(metierKey || "");
    if (!k) return false;
    if (ctx.slug && (k === ctx.slug || k.includes(ctx.slug) || ctx.slug.includes(k))) return true;
    if (titleSlug && (k === titleSlug || k.includes(titleSlug) || titleSlug.includes(k))) return true;
    return false;
  }

  function pickFaqs(allFaqs, ctx){
    const title = document.querySelector("h1");
    const titleSlug = title ? slugify(title.textContent) : "";

    const cleaned = allFaqs
      .map(normalizeFaqItem)
      .filter(x => x.question && x.answer);

    const isoOk = cleaned.filter(x => !x.iso || !ctx.iso || x.iso === ctx.iso);

    const matched = isoOk.filter(x => matchesMetier(x.metier, ctx, titleSlug));
    if (matched.length) return matched;

    // Fallback 1: ONLY generic FAQs (no metier) for this ISO
    const generic = isoOk.filter(x => !x.metier);
    if (generic.length) return generic;

    // Fallback 2: last resort isoOk
    return isoOk;
  }

  function removeLegacyDuplicateBlock(){
    // remove the old "Questions fréquentes" section at the very bottom if present (avoid double)
    const all = [...document.querySelectorAll("h2,h3,h4")];
    const h = all.find(x => lower(x.textContent).includes("questions fréquentes"));
    if (!h) return;
    const sec = h.closest("section") || h.parentElement;
    if (sec && sec.id !== "ulydia-metier-root") {
      try { sec.remove(); } catch(_){}
      log("removed legacy FAQ section");
    }
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

    // clear existing (keep title row)
    const keep = new Set();
    if (title) keep.add(title.closest("div") || title);
    [...wrap.children].forEach(ch => { if (!keep.has(ch)) { try { ch.remove(); } catch(_){} } });

    // build accordion items
    const list = document.createElement("div");
    list.className = "space-y-3";
    list.setAttribute("data-ul-faqs", "1");

    faqs.forEach((f, idx) => {
      const item = document.createElement("div");
      item.className = "ul-faq-item rounded-xl border border-slate-200 bg-white px-4 py-3";
      item.setAttribute("data-faq-item", String(idx));

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ul-faq-q w-full flex items-center justify-between gap-3 text-left";
      btn.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sm">❓</div>
          <div class="font-semibold text-slate-900">${f.question}</div>
        </div>
        <div class="ul-faq-icon text-slate-500">+</div>
      `;

      const ans = document.createElement("div");
      ans.className = "ul-faq-a mt-3 hidden text-slate-700";
      ans.innerHTML = `<div class="prose prose-slate max-w-none">${f.answer}</div>`;

      item.appendChild(btn);
      item.appendChild(ans);
      list.appendChild(item);
    });

    wrap.appendChild(list);

    // accordion behavior (delegation)
    wrap.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest(".ul-faq-q") : null;
      if (!btn) return;
      const item = btn.closest(".ul-faq-item");
      if (!item) return;
      const ans = item.querySelector(".ul-faq-a");
      const icon = item.querySelector(".ul-faq-icon");
      const isOpen = ans && !ans.classList.contains("hidden");
      if (ans) ans.classList.toggle("hidden", isOpen);
      if (icon) icon.textContent = isOpen ? "+" : "–";
    }, { capture: true });

    return true;
  }

  async function boot(){
    // Wait base card
    for (let i=0;i<160;i++){
      if (document.getElementById("faq-title")) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    log("ctx", ctx);

    let faqs = readFaqsFromWindow();
    if (!faqs.length) faqs = readFaqsFromCMS();

    const picked = pickFaqs(faqs, ctx);
    log("faqs picked", picked.length);

    removeLegacyDuplicateBlock();
    renderIntoBaseCard(picked);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();