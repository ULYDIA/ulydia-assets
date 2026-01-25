/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX7.js
   ULYDIA — FAQ Patch matching on FAQ "Name" (Webflow item name), not slug.
   Context:
   - URL uses ?metier=<slug>&country=<ISO>
   - Your FAQ collection items are named with the Metier display name (e.g., "Contrôleur aérien")
   - Therefore: match FAQs where faq.name == metierDisplayName for current slug.

   Data sources:
   1) window.__ULYDIA_FAQS__ (preferred) — items should include name/title + question + answer
   2) .ul-cms-faq-source (optional) — if present, tries to read question/answer + item name

   Behavior:
   - Strict: show only FAQs whose NAME matches current metier display name.
   - If none match: hide FAQ card.
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX7__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX7__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX7]", ...a);

  const norm = (s) => String(s || "")
    .replace(/\u00A0/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const upper = (s) => norm(s).toUpperCase();
  const lower = (s) => norm(s).toLowerCase();

  function fold(s){
    return lower(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
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

  function readMetiersList(){
    const el = document.getElementById("metiersData");
    if (el) {
      try {
        const arr = JSON.parse(el.textContent || "[]");
        if (Array.isArray(arr) && arr.length) return arr;
      } catch(_){}
    }
    const a = window.__ULYDIA_METIERS__ || window.__ULYDIA_METIERS__ || null;
    return Array.isArray(a) ? a : [];
  }

  function getMetierDisplayNameBySlug(slug){
    if (!slug) return "";
    const list = readMetiersList();
    for (const it of list){
      const f = it?.fieldData || it?.fields || it || {};
      const s = norm(it.slug || f.slug || f.Slug || "");
      if (slugify(s) !== slug) continue;
      const name = norm(f.Nom || f.nom || f.name || f.title || it.name || "");
      if (name) return name;
    }
    return "";
  }

  function normalizeFaqItem(it){
    const o = it?.fieldData || it?.fields || it || {};
    // "Name" in Webflow often appears as name/title
    const name = norm(o.name || o.Name || o.title || o.Nom || it.name || it.title || "");
    return {
      name,
      name_key: fold(name),
      question: norm(o.question || o.Question || o.q || it.question || ""),
      answer: norm(o.answer || o.Answer || o.a || o.content || it.answer || it.answerHtml || ""),
      iso: upper(o.iso || o.country || o.country_code || o.code_iso || it.iso || "")
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
      // Try item name: common patterns
      const nameEl =
        it.querySelector("[data-field='name'],[data-field='Nom'],.faq-name,.ul-faq-name,.name,.title") ||
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
      if (!name || !question || !answerHtml) return;

      const isoEl = it.querySelector("[data-iso],[data-country],.iso,.country,[data-field='country'],[data-field='iso']");
      const iso = isoEl ? upper(isoEl.getAttribute("data-iso") || isoEl.getAttribute("data-country") || isoEl.textContent) : "";

      faqs.push({ name, question, answer: answerHtml, iso });
    });

    log("CMS FAQs read:", faqs.length);
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
    // Remove any other FAQ blocks outside the JS card (prevents doubles)
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

  function pickFaqs(allFaqs, ctx, metierName){
    const key = fold(metierName);
    const cleaned = allFaqs.map(normalizeFaqItem).filter(x => x.name && x.question && x.answer);

    // Optional ISO filter (if your FAQ items include it)
    const isoOk = cleaned.filter(x => !x.iso || !ctx.iso || x.iso === ctx.iso);

    // STRICT match on NAME
    const matched = isoOk.filter(x => x.name_key === key);

    return matched;
  }

  async function boot(){
    // wait card exists
    for (let i=0;i<160;i++){
      if (findFaqCard()) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    const metierName = getMetierDisplayNameBySlug(ctx.slug) || (document.querySelector("h1") ? norm(document.querySelector("h1").textContent) : "");
    log("ctx", ctx, "metierName", metierName);

    let faqs = readFaqsFromWindow();
    if (!faqs.length) faqs = readFaqsFromCMS();

    const picked = pickFaqs(faqs, ctx, metierName);
    log("faqs total", faqs.length, "picked", picked.length);

    removeLegacyDuplicateBlock();
    renderAccordion(findFaqCard(), picked);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();