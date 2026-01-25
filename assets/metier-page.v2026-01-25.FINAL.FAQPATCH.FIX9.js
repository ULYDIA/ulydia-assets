/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX9.js
   ULYDIA — FAQ Patch (STRICT by FAQ slug == URL metier)
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX9__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX9__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX9]", ...a);

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
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function slugify(s){
    return fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function getCtx(){
    const url = new URL(location.href);
    const metier = url.searchParams.get("metier") || url.searchParams.get("slug") || url.searchParams.get("job") || "";
    const country = url.searchParams.get("country") || url.searchParams.get("iso") || "";
    return {
      metierSlug: slugify(metier),
      iso: upper(country),
      lang: lower(url.searchParams.get("lang") || "")
    };
  }

  function pick(o, keys){
    for (const k of keys){
      if (o && o[k] != null && String(o[k]).trim() !== "") return o[k];
    }
    return "";
  }

  function normalizeFaqItem(it){
    const o = it?.fieldData || it?.fields || it || {};
    const slugRaw =
      pick(o, ["slug","Slug","metier","Metier","metier_slug","metierSlug","job_slug","jobSlug"]) ||
      pick(it, ["slug","Slug","metier","Metier","metier_slug","metierSlug","job_slug","jobSlug"]) ||
      "";
    const slug = slugify(slugRaw);

    const name = norm(pick(o, ["name","Name","Nom","title","Title"]) || pick(it, ["name","Name","Nom","title","Title"]));
    const question = norm(pick(o, ["question","Question","q","Q"]) || pick(it, ["question","Question","q","Q"]));
    const answerHtml =
      pick(o, ["answer","Answer","reponse","Réponse","response","Response","content","html","answerHtml"]) ||
      pick(it, ["answer","Answer","reponse","Réponse","response","Response","content","html","answerHtml"]) ||
      "";
    const answer = norm(answerHtml);

    const iso = upper(pick(o, ["iso","ISO","country","Country","country_code","countryCode","code_iso","Code_iso"]) ||
                      pick(it, ["iso","ISO","country","Country","country_code","countryCode","code_iso","Code_iso"]));
    const lang = lower(pick(o, ["lang","Lang","language","Language","langue","Langue"]) ||
                       pick(it, ["lang","Lang","language","Language","langue","Langue"]));

    return { slug, slugRaw: norm(slugRaw), name, question, answer, iso, lang };
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
      const slug = norm(it.getAttribute("data-slug") || it.getAttribute("data-wf-slug") || "");
      const nameEl = it.querySelector("[data-field='name'],[data-field='Name'],[data-field='Nom'],.faq-name,.ul-faq-name,.name,.title") ||
                     it.querySelector("h1,h2,h3,h4");
      const qEl = it.querySelector("[data-faq='question'],[data-field='Question'],.faq-question,.ul-faq-question,.question") ||
                  it.querySelector("p,div");
      const aEl = it.querySelector("[data-faq='answer'],[data-field='Réponse'],[data-field='Reponse'],.faq-answer,.ul-faq-answer,.answer,.w-richtext") ||
                  it.querySelector(".w-richtext") ||
                  it.querySelector("div");
      const name = norm(nameEl ? nameEl.textContent : "");
      const question = norm(qEl ? qEl.textContent : "");
      const answer = norm(aEl ? aEl.innerHTML : "");
      if (!question || !answer) return;
      faqs.push({ slug, name, question, answer });
    });
    return faqs;
  }

  function findFaqCard(){
    const title = document.getElementById("faq-title");
    if (title) return title.closest(".card") || title.parentElement || null;
    const root = document.getElementById("ulydia-metier-root") || document;
    const h = [...root.querySelectorAll("h2,h3,h4")].find(x => fold(x.textContent).includes("questions frequentes") || fold(x.textContent) === "faq");
    if (!h) return null;
    return h.closest(".card") || h.parentElement || null;
  }

  function removeLegacyDuplicateBlock(){
    const rootJS = document.getElementById("ulydia-metier-root");
    const all = [...document.querySelectorAll("h2,h3,h4")];
    all.forEach(h => {
      const t = fold(h.textContent);
      if (!(t.includes("questions frequentes") || t === "faq")) return;
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

  function pickFaqs(allFaqs, ctx){
    const cleaned = allFaqs.map(normalizeFaqItem).filter(x => x.question && x.answer);
    let picked = cleaned.filter(x => x.slug && x.slug === ctx.metierSlug);

    // Apply ISO/lang only if the dataset provides it
    if (picked.length && ctx.iso){
      const anyIso = picked.some(x => !!x.iso);
      if (anyIso) picked = picked.filter(x => !x.iso || x.iso === ctx.iso);
    }
    if (picked.length && ctx.lang){
      const anyLang = picked.some(x => !!x.lang);
      if (anyLang) picked = picked.filter(x => !x.lang || x.lang === ctx.lang);
    }
    return picked;
  }

  async function boot(){
    for (let i=0;i<220;i++){
      if (findFaqCard()) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    log("ctx", ctx);

    let faqs = readFaqsFromWindow();
    if (!faqs.length) faqs = readFaqsFromCMS();

    log("faqs total", faqs.length);
    const picked = pickFaqs(faqs, ctx);
    log("picked", picked.length, picked.slice(0,3));

    removeLegacyDuplicateBlock();
    renderAccordion(findFaqCard(), picked);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();