/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX12.js
   ULYDIA — FAQ Patch (FINAL) — FIX12
   ✅ Filters FAQs by metier (accent-insensitive) + optional ISO
   ✅ Replaces BASE placeholder FAQs (e.g., Full-Stack)
   ✅ If FAQs exist: FORCES FAQ card visible even if BASE hid it (display:none)
   ✅ If none: hides the FAQ card (prevents wrong content)
   ✅ No polling loops forever, no hidden counter runaway
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX12__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX12__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX12]", ...a);

  // ----------------------------
  // Helpers
  // ----------------------------
  const norm = (s) => String(s || "")
    .replace(/\u00A0/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lower = (s) => norm(s).toLowerCase();
  const upper = (s) => norm(s).toUpperCase();

  const fold = (s) => lower(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const slugify = (s) => fold(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function getCtx(){
    const url = new URL(location.href);
    const qMetier = url.searchParams.get("metier") || "";
    const qIso = url.searchParams.get("country") || url.searchParams.get("iso") || "";
    const metierSlug = slugify(qMetier);

    const root = document.getElementById("ulydia-metier-root") || document;
    const h1 = root.querySelector("h1") || document.querySelector("h1");
    const metierName = norm(h1 ? h1.textContent : "");

    return {
      metierParam: norm(qMetier),
      metierSlug,
      iso: upper(qIso),
      h1: metierName,
      h1Fold: fold(metierName),
      h1Slug: slugify(metierName),
    };
  }

  // Find the FAQ card created by BASE
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

  // Ensure the card is visible even if BASE set display:none
  function forceShow(card){
    if (!card) return;
    card.style.display = "";           // remove inline "none"
    card.style.visibility = "visible";
    card.hidden = false;
    card.removeAttribute("hidden");

    // If BASE applied a class that hides, remove common suspects
    card.classList.remove("hidden");
  }

  function forceHide(card){
    if (!card) return;
    card.style.display = "none";
  }

  function normalizeFaqItem(it){
    const o = it?.fieldData || it?.fields || it || {};
    return {
      iso: upper(o.iso || o.ISO || o.country || o.pays || ""),
      metier: norm(o.metier || o.Metier || o.job || o.Job || o.name || o.Name || ""),
      question: norm(o.question || o.Question || ""),
      answer: (o.answer ?? o.Answer ?? o.reponse ?? o["Réponse"] ?? "")
    };
  }

  function matchFaqToMetier(faq, ctx){
    // Primary: match by slugify(faq.metier) <-> ctx.metierSlug or ctx.h1Slug
    const s = slugify(faq.metier);
    const q = ctx.metierSlug || ctx.h1Slug;

    if (!q) return false;

    if (s === q) return true;

    // suffix handling (e.g., controleur-aerien-4b682)
    if (s && q && (s.startsWith(q + "-") || q.startsWith(s + "-"))) return true;

    // fallback: match by folded title
    if (ctx.h1Fold && fold(faq.metier) === ctx.h1Fold) return true;

    return false;
  }

  function pickFaqs(ctx){
    const src = window.__ULYDIA_FAQS__ || [];
    const all = (Array.isArray(src) ? src : [])
      .map(normalizeFaqItem)
      .filter(x => x.metier && x.question && String(x.answer || "").trim() !== "");

    let picked = all.filter(x => matchFaqToMetier(x, ctx));

    // ISO filter only if some picked items contain ISO and URL has ISO
    if (picked.length && ctx.iso) {
      const anyIso = picked.some(x => !!x.iso);
      if (anyIso) picked = picked.filter(x => !x.iso || x.iso === ctx.iso);
    }

    return picked;
  }

  // Remove BASE placeholder FAQ items (and any old injected)
  function clearFaqContent(card){
    if (!card) return;
    card.querySelectorAll(".faq-item").forEach(n => { try { n.remove(); } catch(_){} });
    const injected = card.querySelector("[data-ul-faqs]");
    if (injected) { try { injected.remove(); } catch(_){} }
  }

  function ensureContainer(card){
    // Prefer a "content" area if BASE has one
    const content = card.querySelector(".space-y-3") || card;
    let c = content.querySelector("[data-ul-faqs]");
    if (!c) {
      c = document.createElement("div");
      c.setAttribute("data-ul-faqs", "1");
      c.className = "space-y-3";
      content.appendChild(c);
    }
    return c;
  }

  function renderFaqs(card, faqs){
    if (!card) return false;

    clearFaqContent(card);

    if (!faqs || !faqs.length) {
      // Hide card so we never show wrong FAQ
      forceHide(card);
      return true;
    }

    // Force card visible
    forceShow(card);

    // Ensure title exists and is correct
    const title = card.querySelector("#faq-title") || card.querySelector("h2,h3,h4");
    if (title && fold(title.textContent) !== "faq") {
      // Keep BASE title if already correct, otherwise set minimal
      if (!fold(title.textContent).includes("questions frequentes") && fold(title.textContent) !== "faq") {
        title.textContent = "Questions fréquentes";
      }
    }

    const container = ensureContainer(card);

    const esc = (s) => String(s || "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");

    container.innerHTML = faqs.map((f) => {
      const q = esc(f.question);
      // answer is rich text coming from CMS; keep as-is (assumed trusted editor content)
      const a = String(f.answer || "");
      return `
        <div class="faq-item">
          <button type="button"
            class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3"
            style="background:white;border:2px solid var(--border);">
            <div class="flex items-start gap-3 flex-1">
              <span class="text-xl flex-shrink-0">❓</span>
              <span class="font-semibold text-sm" style="color: var(--text);">${q}</span>
            </div>
            <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm"
            style="background:rgba(99,102,241,0.05);color:var(--text);border-left:3px solid var(--primary);">
            ${a}
          </div>
        </div>
      `;
    }).join("");

    // Bind once (capture to survive nested elements)
    if (!card.__UL_FAQ_BOUND__) {
      card.__UL_FAQ_BOUND__ = true;
      card.addEventListener("click", (e) => {
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
    const ctx = getCtx();
    const faqs = pickFaqs(ctx);

    log("ctx", ctx);
    log("faqs matched", faqs.length);

    // Wait for the card to exist (BASE renders it)
    let card = null;
    for (let i = 0; i < 200; i++) { // 200 * 50ms = 10s max
      card = findFaqCard();
      if (card) break;
      await sleep(50);
    }

    if (!card) {
      log("No FAQ card found in DOM.");
      return;
    }

    // Render once
    renderFaqs(card, faqs);

    // Guard: if BASE (or other patch) hides the card after we rendered, re-show it once
    // (no infinite loop; disconnect after first corrective action)
    if (faqs.length) {
      const obs = new MutationObserver(() => {
        try {
          const disp = getComputedStyle(card).display;
          if (disp === "none") {
            forceShow(card);
            obs.disconnect();
            log("Re-show FAQ card after external hide.");
          }
        } catch(_) {}
      });
      obs.observe(card, { attributes: true, attributeFilter: ["style", "class", "hidden"] });
      // safety auto-disconnect after 3s
      setTimeout(() => { try { obs.disconnect(); } catch(_){} }, 3000);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();