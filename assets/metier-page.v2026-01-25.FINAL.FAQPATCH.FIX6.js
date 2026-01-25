/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX6.js
   ULYDIA — FAQ Patch (STRICT: never show another metier's FAQs)
   Behavior:
   - If current URL has ?metier=... (or ?slug=...), we ONLY show FAQs that match this metier.
   - If none match -> the FAQ card is hidden (instead of showing generic / other metier).
   - Optional: set window.__ULYDIA_FAQ_ALLOW_GENERIC__ = true to allow generic (metier empty) fallback.
   Matching:
   - metier field (slug or name) is slugified and compared to ctx.slug
   - tries to read FAQs from window.__ULYDIA_FAQS__ first, then from .ul-cms-faq-source (if present)
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX6__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX6__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX6]", ...a);

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

  function normalizeFaqItem(it){
    const o = it?.fieldData || it?.fields || it || {};
    const metierRaw = o.metier || o.job_slug || o.metier_slug || o.slug || o.job || it.metier || it.job || "";
    return {
      question: norm(o.question || o.Question || o.q || o.title || o.name || it.question),
      answer: norm(o.answer || o.Answer || o.a || o.content || it.answer || it.answerHtml || ""),
      iso: upper(o.iso || o.country || o.country_code || o.code_iso || it.iso || ""),
      metier: slugify(metierRaw),
      metier_raw: norm(metierRaw)
    };
  }

  function readFaqsFromWindow(){
    const a = window.__ULYDIA_FAQS__ || window.__ULYDIA_FAQS || null;
    return Array.isArray(a) ? a : [];
  }

  function readFaqsFromCMS(){
    const root = document.querySelector(".ul-cms-faq-source");
    if (!root) return [];
    const nodes = [...root.querySelectorAll(":scope > *")];
    const faqs = [];
    nodes.forEach((it) => {
      // Try to find explicit elements if you have them
      const qEl = it.querySelector("[data-faq='question'],.faq-question,.ul-faq-question,.question") || it.querySelector("h1,h2,h3,h4,p,div");
      const aEl = it.querySelector("[data-faq='answer'],.faq-answer,.ul-faq-answer,.answer,.w-richtext") || it.querySelector(".w-richtext") || it.querySelector("p,div");
      const question = norm(qEl ? qEl.textContent : "");
      const answerHtml = norm(aEl ? aEl.innerHTML : "");
      if (!question || !answerHtml) return;

      // Try to read iso/metier from data-* or small hidden fields
      const isoEl = it.querySelector("[data-iso],[data-country],.iso,.country,.code-iso,[data-field='country'],[data-field='iso']");
      const metierEl = it.querySelector("[data-metier],[data-slug],[data-job],.metier,.job,.metier-slug,.job-slug,[data-field='metier'],[data-field='job_slug'],[data-field='slug']");
      const iso = isoEl ? upper(isoEl.getAttribute("data-iso") || isoEl.getAttribute("data-country") || isoEl.textContent) : "";
      const metier = metierEl ? slugify(metierEl.getAttribute("data-metier") || metierEl.getAttribute("data-slug") || metierEl.textContent) : "";

      faqs.push({ question, answer: answerHtml, iso, metier });
    });
    return faqs;
  }

  function removeLegacyDuplicateBlock(){
    const all = [...document.querySelectorAll("h2,h3,h4")];
    const h = all.find(x => lower(x.textContent).includes("questions fréquentes"));
    if (!h) return;
    const sec = h.closest("section") || h.parentElement;
    if (sec && sec.id !== "ulydia-metier-root") {
      try { sec.remove(); } catch(_){}
    }
  }

  function findFaqCard(){
    const title = document.getElementById("faq-title");
    if (title) return title.closest(".card") || title.parentElement || null;
    // fallback: find header "Questions fréquentes" inside the JS page
    const root = document.getElementById("ulydia-metier-root") || document;
    const h = [...root.querySelectorAll("h2,h3,h4")].find(x => lower(x.textContent).includes("questions fréquentes"));
    if (!h) return null;
    return h.closest(".card") || h.parentElement || null;
  }

  function renderAccordion(card, faqs){
    if (!card) return false;

    if (!faqs.length){
      card.style.display = "none";
      return true;
    }
    card.style.display = "";

    // Find a place to insert
    const wrap = card.querySelector("[data-ul-faqs]")?.parentElement || card.querySelector(".space-y-3") || card;

    // Remove previous list (if any)
    const old = card.querySelector("[data-ul-faqs]");
    if (old) { try { old.remove(); } catch(_){} }

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

    // delegate click
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

  function pickFaqs(allFaqs, ctx){
    const allowGeneric = !!window.__ULYDIA_FAQ_ALLOW_GENERIC__;

    const cleaned = allFaqs
      .map(normalizeFaqItem)
      .filter(x => x.question && x.answer);

    // iso filter
    const isoOk = cleaned.filter(x => !x.iso || !ctx.iso || x.iso === ctx.iso);

    // STRICT metier match
    const matched = ctx.slug
      ? isoOk.filter(x => x.metier && (x.metier === ctx.slug || x.metier.includes(ctx.slug) || ctx.slug.includes(x.metier)))
      : isoOk;

    if (matched.length) return matched;

    // optional generic fallback
    if (allowGeneric && ctx.slug){
      const generic = isoOk.filter(x => !x.metier);
      if (generic.length) return generic;
    }

    // otherwise: show nothing (better than wrong)
    return [];
  }

  async function boot(){
    // wait card exists
    for (let i=0;i<160;i++){
      if (findFaqCard()) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    log("ctx", ctx);

    let faqs = readFaqsFromWindow();
    if (!faqs.length) faqs = readFaqsFromCMS();
    log("faqs total", faqs.length);

    const picked = pickFaqs(faqs, ctx);
    log("faqs picked", picked.length, picked.slice(0,2));

    removeLegacyDuplicateBlock();
    renderAccordion(findFaqCard(), picked);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();