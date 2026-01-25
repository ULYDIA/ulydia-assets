/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX10.js
   ULYDIA — FAQ Patch (for __ULYDIA_FAQS__ shape: { iso, metier, question, answer })
   - STRICT but robust:
       Match if:
         - slugify(faq.metier) == URL ?metier slug
         - OR fold(faq.metier) == fold(H1 title)
         - OR faq.metier exactly equals URL slug
   - ISO filter:
       If FAQ.iso is present, keep only iso == URL country (if provided)
   - Renders accordion into existing FAQ card.
   - If no match: hides card (prevents wrong FAQs).
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX10__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX10__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX10]", ...a);

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
    const h1 = root.querySelector("h1");
    const metierName = norm(h1 ? h1.textContent : "");
    return { metierSlug, metierName, metierNameFold: fold(metierName), iso: upper(country) };
  }

  function findFaqCard(){
    const title = document.getElementById("faq-title");
    if (title) return title.closest(".card") || title.closest(".ul-card") || title.parentElement || null;

    const root = document.getElementById("ulydia-metier-root") || document;
    const hs = [...root.querySelectorAll("h2,h3,h4")];
    const h = hs.find(x => {
      const t = fold(x.textContent);
      return t.includes("questions frequentes") || t === "faq";
    });
    if (!h) return null;
    return h.closest(".card") || h.closest(".ul-card") || h.parentElement || null;
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

  function normalizeFaq(it){
    const o = it?.fieldData || it?.fields || it || {};
    const iso = upper(o.iso || o.ISO || o.country || o.Country || "");
    const metier = norm(o.metier || o.Metier || o.job || o.Job || "");
    const question = norm(o.question || o.Question || "");
    const answer = (o.answer ?? o.Answer ?? o.reponse ?? o["Réponse"] ?? "");
    return { iso, metier, metierFold: fold(metier), metierSlug: slugify(metier), question, answer };
  }

  function pickFaqs(ctx){
    const src = window.__ULYDIA_FAQS__ || [];
    const all = (Array.isArray(src) ? src : []).map(normalizeFaq).filter(x => x.question && String(x.answer||"").trim() !== "");

    let picked = all.filter(x =>
      x.metier === ctx.metierSlug ||
      x.metierSlug === ctx.metierSlug ||
      (ctx.metierNameFold && x.metierFold === ctx.metierNameFold)
    );

    // If FAQ items have iso, apply iso filter
    if (picked.length && ctx.iso){
      const anyIso = picked.some(x => !!x.iso);
      if (anyIso) picked = picked.filter(x => !x.iso || x.iso === ctx.iso);
    }

    return picked;
  }

  function render(card, faqs){
    if (!card) return false;

    if (!faqs.length){
      card.style.display = "none";
      return true;
    }
    card.style.display = "";

    const container =
      card.querySelector("[data-ul-faq-container]") ||
      card.querySelector(".space-y-3") ||
      card;

    // remove previous injected list if any
    const old = card.querySelector("[data-ul-faqs]");
    if (old) { try { old.remove(); } catch(_){} }

    const list = document.createElement("div");
    list.className = "space-y-3";
    list.setAttribute("data-ul-faqs", "1");

    faqs.forEach((f) => {
      const item = document.createElement("div");
      item.className = "ul-faq-item rounded-xl border border-slate-200 bg-white px-4 py-3";

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
      ans.innerHTML = `<div class="prose prose-slate max-w-none">${String(f.answer||"")}</div>`;

      item.appendChild(btn);
      item.appendChild(ans);
      list.appendChild(item);
    });

    container.appendChild(list);

    // delegate clicks
    container.addEventListener("click", (e) => {
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
    // wait for base to render FAQ card
    for (let i=0;i<240;i++){
      if (findFaqCard()) break;
      await new Promise(r=>setTimeout(r,50));
    }
    const ctx = getCtx();
    log("ctx", ctx);

    const picked = pickFaqs(ctx);
    log("picked", picked.length, picked.slice(0,3));

    removeLegacyDuplicateBlock();
    render(findFaqCard(), picked);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();