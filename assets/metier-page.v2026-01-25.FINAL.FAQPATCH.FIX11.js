/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX11.js
   ULYDIA — FAQ Patch (replaces BASE hard-coded FAQs)
   Input shape supported: __ULYDIA_FAQS__ items with { iso, metier, question, answer }
   Matching:
     - slugify(faq.metier) == URL ?metier slug
     - OR slugify(faq.metier) startsWith(URL slug + "-")  (handles suffixes like -4b682)
     - OR URL slug startsWith(slugify(faq.metier) + "-")
     - OR fold(faq.metier) == fold(H1 title)
   ISO filter:
     - If FAQ.iso exists, keep iso == URL country (if provided)
   Behavior:
     - Always clears BASE placeholder FAQ items
     - If no matched FAQ: hides FAQ card (prevents wrong FAQs)
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX11__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX11__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX11]", ...a);

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
    const metierQ = url.searchParams.get("metier") || "";
    const country = url.searchParams.get("country") || url.searchParams.get("iso") || "";
    const metierSlug = slugify(metierQ);

    const root = document.getElementById("ulydia-metier-root") || document;
    const h1 = root.querySelector("h1") || document.querySelector("h1");
    const metierName = norm(h1 ? h1.textContent : "");

    return { metierSlug, iso: upper(country), metierNameFold: fold(metierName) };
  }

  function findFaqCard(){
    const title = document.getElementById("faq-title");
    if (title) return title.closest(".card") || title.parentElement || null;

    const root = document.getElementById("ulydia-metier-root") || document;
    const hs = [...root.querySelectorAll("h2,h3,h4")];
    const h = hs.find(x => {
      const t = fold(x.textContent);
      return t.includes("questions frequentes") || t === "faq";
    });
    if (!h) return null;
    return h.closest(".card") || h.parentElement || null;
  }

  function normalizeFaq(it){
    const o = it?.fieldData || it?.fields || it || {};
    const iso = upper(o.iso || o.ISO || o.country || "");
    const metier = norm(o.metier || o.Metier || o.job || o.Job || "");
    const q = norm(o.question || o.Question || "");
    const a = (o.answer ?? o.Answer ?? o.reponse ?? o["Réponse"] ?? "");
    return { iso, metier, metierFold: fold(metier), metierSlug: slugify(metier), question: q, answer: a };
  }

  function matchFaq(f, ctx){
    const s = f.metierSlug;
    const t = f.metierFold;
    const q = ctx.metierSlug;
    if (!q) return false;

    if (s === q) return true;
    if (s && q && s.startsWith(q + "-")) return true;   // faq has suffix
    if (s && q && q.startsWith(s + "-")) return true;   // url has suffix
    if (ctx.metierNameFold && t && t === ctx.metierNameFold) return true;

    // last resort: raw metier equals url slug
    if (fold(f.metier) === q) return true;

    return false;
  }

  function pickFaqs(ctx){
    const src = window.__ULYDIA_FAQS__ || [];
    const all = (Array.isArray(src) ? src : []).map(normalizeFaq).filter(x => x.question && String(x.answer||"").trim() !== "");

    let picked = all.filter(x => matchFaq(x, ctx));

    // ISO filter if FAQ has iso
    if (picked.length && ctx.iso){
      const anyIso = picked.some(x => !!x.iso);
      if (anyIso) picked = picked.filter(x => !x.iso || x.iso === ctx.iso);
    }

    return picked;
  }

  function clearPlaceholder(container){
    if (!container) return;
    // remove base placeholder items
    [...container.querySelectorAll(".faq-item")].forEach(n => { try { n.remove(); } catch(_){} });
    // remove previous injected
    const injected = container.querySelector("[data-ul-faqs]");
    if (injected) { try { injected.remove(); } catch(_){} }
  }

  function render(card, faqs){
    if (!card) return false;

    const container = card.querySelector(".space-y-3") || card;
    clearPlaceholder(container);

    if (!faqs.length){
      card.style.display = "none";
      return true;
    }
    card.style.display = "";

    const list = document.createElement("div");
    list.className = "space-y-3";
    list.setAttribute("data-ul-faqs", "1");

    faqs.forEach((f) => {
      const item = document.createElement("div");
      item.className = "faq-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3";
      btn.style.background = "white";
      btn.style.border = "2px solid var(--border)";
      btn.innerHTML = `
        <div class="flex items-start gap-3 flex-1">
          <span class="text-xl flex-shrink-0">❓</span>
          <span class="font-semibold text-sm" style="color: var(--text);">${norm(f.question)}</span>
        </div>
        <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      `;

      const ans = document.createElement("div");
      ans.className = "faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm";
      ans.style.background = "rgba(99,102,241,0.05)";
      ans.style.color = "var(--text)";
      ans.style.borderLeft = "3px solid var(--primary)";
      ans.innerHTML = String(f.answer || "");

      item.appendChild(btn);
      item.appendChild(ans);
      list.appendChild(item);
    });

    container.appendChild(list);

    if (!container.__UL_FAQ_BOUND__){
      container.__UL_FAQ_BOUND__ = true;
      container.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest(".faq-question") : null;
        if (!btn) return;
        const item = btn.closest(".faq-item");
        if (!item) return;
        const ans = item.querySelector(".faq-answer");
        const icon = item.querySelector(".faq-icon");
        const isOpen = ans && !ans.classList.contains("hidden");
        if (ans) ans.classList.toggle("hidden", isOpen);
        if (icon) icon.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
      }, { capture: true });
    }

    return true;
  }

  async function boot(){
    // wait for BASE to render the FAQ card
    for (let i=0;i<240;i++){
      if (findFaqCard()) break;
      await new Promise(r=>setTimeout(r,50));
    }

    const ctx = getCtx();
    const picked = pickFaqs(ctx);

    log("ctx", ctx);
    log("picked", picked.length, picked.slice(0,3));

    render(findFaqCard(), picked);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();