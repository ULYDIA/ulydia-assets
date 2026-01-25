/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX8.js
   ULYDIA — FAQ Patch (match on FAQ ITEM NAME, with robust fallbacks)
   Problem observed:
   - metiersData does not expose metier display name reliably
   - window.__ULYDIA_FAQS__ may not expose FAQ item "name"
   - FAQ items in Webflow have slug like: <metier-slug>-<random>  (e.g., controleur-aerien-4b682)

   Strategy (STRICT, never show wrong metier):
   1) Get current metier slug from URL (?metier=)
   2) Get current metier display name from page H1 (renderer output) — stable
   3) Load FAQ items from window.__ULYDIA_FAQS__ (or .ul-cms-faq-source if present)
   4) A FAQ item matches current metier if:
      - (primary) fold(faqItemName) == fold(currentH1)
      - OR (fallback) faqSlug starts with currentSlug + "-"   (covers Webflow FAQ item slug scheme)
   5) If no matches -> hide FAQ card.

   Notes:
   - This respects "selection on NAME" but avoids empty result when "name" isn't available in JS data.
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX8__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX8__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX8]", ...a);

  const norm = (s) => String(s || "")
    .replace(/\u00A0/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();

  function fold(s){
    return lower(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, "'")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function slugify(s){
    return fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function getCtx(){
    const url = new URL(location.href);
    return {
      iso: upper(url.searchParams.get("country") || url.searchParams.get("iso") || ""),
      slug: slugify(url.searchParams.get("metier") || url.searchParams.get("slug") || url.searchParams.get("job") || "")
    };
  }

  function getH1Name(){
    const h1 = document.querySelector("#ulydia-metier-root h1, h1");
    return norm(h1 ? h1.textContent : "");
  }

  function normalizeFaqItem(it){
    const o = it?.fieldData || it?.fields || it || {};
    const name =
      norm(
        o.name || o.Name || o.title || o.Title || o.nom || o.Nom ||
        it.name || it.Name || it.title || it.Title || it.nom || it.Nom ||
        ""
      );

    const slug =
      norm(o.slug || o.Slug || it.slug || it.Slug || "");

    return {
      name,
      name_key: fold(name),
      slug: slugify(slug),
      slug_raw: slug,
      question: norm(o.question || o.Question || o.q || it.question || it.Question || ""),
      answer: norm(o.answer || o.Answer || o.a || o.content || it.answer || it.Answer || it.answerHtml || ""),
      iso: upper(o.iso || o.country || o.country_code || o.code_iso || it.iso || it.country || "")
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
      const nameEl =
        it.querySelector("[data-field='name'],[data-field='Name'],[data-field='Nom'],.faq-name,.ul-faq-name,.name,.title") ||
        it.querySelector("h1,h2,h3,h4");

      const qEl =
        it.querySelector("[data-faq='question'],.faq-question,.ul-faq-question,.question") ||
        it.querySelector("p,div");

      const aEl =
        it.querySelector("[data-faq='answer'],.faq-answer,.ul-faq-answer,.answer,.w-richtext") ||
        it.querySelector(".w-richtext") ||
        it.querySelector("div");

      const name = norm(nameEl ? nameEl.textContent : "");
      const question = norm(qEl ? qEl.textContent : "");
      const answerHtml = norm(aEl ? aEl.innerHTML : "");
      if (!question || !answerHtml) return;

      // slug (optional)
      const slugAttr = it.getAttribute("data-slug") || it.getAttribute("data-wf-slug") || "";
      const slug = norm(slugAttr);

      const isoEl = it.querySelector("[data-iso],[data-country],.iso,.country,[data-field='country'],[data-field='iso']");
      const iso = isoEl ? upper(isoEl.getAttribute("data-iso") || isoEl.getAttribute("data-country") || isoEl.textContent) : "";

      faqs.push({ name, slug, question, answer: answerHtml, iso });
    });

    return faqs;
  }

  function findFaqCard(){
    const title = document.getElementById("faq-title");
    if (title) return title.closest(".card") || title.parentElement || null;
    const root = document.getElementById("ulydia-metier-root") || document;
    const h = [...root.querySelectorAll("h2,h3,h4")].find(x => fold(x.textContent).includes("questions frequentes"));
    if (!h) return null;
    return h.closest(".card") || h.parentElement || null;
  }

  function removeLegacyDuplicateBlock(){
    const rootJS = document.getElementById("ulydia-metier-root");
    const all = [...document.querySelectorAll("h2,h3,h4")];
    all.forEach(h => {
      if (!fold(h.textContent).includes("questions frequentes")) return;
      const sec = h.closest("section") || h.parentElement;
      if (!sec) return;
      if (rootJS && rootJS.contains(sec)) return;
      try { sec.remove(); } catch(_){}
    });
  }

  function renderAccordion(card, faqs){
    if (!card) return false;

    if (!faqs.length){
      card.style.display = "none";
      return true;
    }
    card.style.display = "";

    const wrap = card.querySelector(".space-y-3") || card;
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

  function pickFaqs(allFaqs, ctx, metierH1){
    const key = fold(metierH1);
    const cleaned = allFaqs.map(normalizeFaqItem).filter(x => x.question && x.answer);

    // Optional ISO filter
    const isoOk = cleaned.filter(x => !x.iso || !ctx.iso || x.iso === ctx.iso);

    // Match on NAME (primary)
    const byName = key ? isoOk.filter(x => x.name_key && x.name_key === key) : [];

    if (byName.length) return byName;

    // Fallback: match on FAQ slug prefix "<metier-slug>-"
    if (ctx.slug){
      const prefix = ctx.slug + "-";
      const bySlugPrefix = isoOk.filter(x => x.slug && x.slug.startsWith(prefix));
      if (bySlugPrefix.length) return bySlugPrefix;
    }

    return [];
  }

  async function boot(){
    // wait FAQ card exists
    for (let i=0;i<200;i++){
      if (findFaqCard()) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    const metierH1 = getH1Name();
    log("ctx", ctx, "H1", metierH1);

    let faqs = readFaqsFromWindow();
    if (!faqs.length) faqs = readFaqsFromCMS();
    log("faqs total", faqs.length);

    const picked = pickFaqs(faqs, ctx, metierH1);
    log("picked", picked.length, picked.slice(0,2));

    removeLegacyDuplicateBlock();
    renderAccordion(findFaqCard(), picked);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();