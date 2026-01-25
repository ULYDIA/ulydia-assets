/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX13.js
   ULYDIA — FAQ Patch (FINAL) — FIX13 (AGGRESSIVE UNHIDE + SELF-DIAG)
   Purpose:
   - Render FAQs from window.__ULYDIA_FAQS__ for the current /metier?metier=...&country=...
   - Match on metier NAME or slug (accent-insensitive) and optional ISO
   - Fix cases where BASE hides the FAQ card (display:none / hidden / .hidden / ancestor hidden)
   - Avoid infinite polling / runaway counters
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX13__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX13__ = true;

  // Always log a minimal line once (so we know it ran)
  console.log("[metier FAQPATCH FIX13] loaded");

  const DEBUG = true; // force for this diagnostic build
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX13]", ...a);

  const norm = (s) => String(s ?? "")
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

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function getCtx(){
    const url = new URL(location.href);
    const qMetier = url.searchParams.get("metier") || "";
    const qIso = url.searchParams.get("country") || url.searchParams.get("iso") || "";

    const root = document.getElementById("ulydia-metier-root") || document;
    const h1 = root.querySelector("h1") || document.querySelector("h1");
    const h1Text = norm(h1 ? h1.textContent : "");

    return {
      metierParam: norm(qMetier),
      metierSlug: slugify(qMetier),
      iso: upper(qIso),
      h1: h1Text,
      h1Slug: slugify(h1Text),
      h1Fold: fold(h1Text),
    };
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
    const s = slugify(faq.metier);
    const q = ctx.metierSlug || ctx.h1Slug;
    if (!q) return false;

    if (s === q) return true;
    if (s && q && (s.startsWith(q + "-") || q.startsWith(s + "-"))) return true;
    if (ctx.h1Fold && fold(faq.metier) === ctx.h1Fold) return true;

    // also allow matching raw NAME vs param if someone stored exact name
    if (fold(faq.metier) === fold(ctx.metierParam)) return true;

    return false;
  }

  function pickFaqs(ctx){
    const src = window.__ULYDIA_FAQS__ || [];
    const all = (Array.isArray(src) ? src : [])
      .map(normalizeFaqItem)
      .filter(x => x.metier && x.question && String(x.answer || "").trim() !== "");

    let picked = all.filter(x => matchFaqToMetier(x, ctx));

    if (picked.length && ctx.iso) {
      const anyIso = picked.some(x => !!x.iso);
      if (anyIso) picked = picked.filter(x => !x.iso || x.iso === ctx.iso);
    }

    // sort by optional ordre/order if present in raw objects (best effort)
    // (we can't access raw now; keep stable as-is)
    return picked;
  }

  function findFaqCard(){
    const t = document.getElementById("faq-title");
    if (t) return t.closest(".card") || t.closest("[class*='card']") || t.parentElement;

    const root = document.getElementById("ulydia-metier-root") || document;
    const hs = [...root.querySelectorAll("h2,h3,h4")];
    const h = hs.find(x => {
      const txt = fold(x.textContent);
      return txt.includes("questions frequentes") || txt === "faq";
    });
    if (!h) return null;
    return h.closest(".card") || h.closest("[class*='card']") || h.parentElement;
  }

  function unhideNode(el){
    if (!el) return;
    el.hidden = false;
    el.removeAttribute("hidden");
    el.classList && el.classList.remove("hidden", "is-hidden", "u-hidden", "w-hidden");

    // Override display none aggressively
    try {
      el.style.setProperty("display", "block", "important");
      el.style.setProperty("visibility", "visible", "important");
      el.style.setProperty("opacity", "1", "important");
    } catch(_) {}
  }

  function unhideAncestors(el, stopAt){
    let cur = el;
    let steps = 0;
    while (cur && cur !== document.body && steps < 25) {
      unhideNode(cur);
      if (stopAt && cur === stopAt) break;
      cur = cur.parentElement;
      steps++;
    }
  }

  function ensureContainer(card){
    // Prefer an existing content area inside card
    const preferred = card.querySelector(".space-y-3") || card.querySelector(".card-content") || card;
    let c = preferred.querySelector("[data-ul-faqs]");
    if (!c) {
      c = document.createElement("div");
      c.setAttribute("data-ul-faqs", "1");
      c.className = "space-y-3";
      preferred.appendChild(c);
    }
    return c;
  }

  function clearOld(card){
    if (!card) return;
    card.querySelectorAll(".faq-item").forEach(n => { try { n.remove(); } catch(_){} });
    const injected = card.querySelector("[data-ul-faqs]");
    if (injected) { try { injected.remove(); } catch(_){} }
  }

  function render(card, faqs){
    if (!card) return;

    clearOld(card);

    if (!faqs || !faqs.length) {
      // Hide card to avoid showing wrong placeholder FAQs
      try { card.style.setProperty("display", "none", "important"); } catch(_) {}
      log("no faqs -> hide card");
      return;
    }

    // Ensure visible (including ancestors)
    const root = document.getElementById("ulydia-metier-root");
    unhideAncestors(card, root || null);

    const container = ensureContainer(card);

    container.innerHTML = faqs.map((f) => {
      const q = f.question.replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const a = String(f.answer || "");
      return `
        <div class="faq-item">
          <button type="button" class="faq-question w-full text-left p-4 rounded-lg flex items-start justify-between gap-3"
            style="background:#fff;border:2px solid rgba(17,24,39,0.08);">
            <div class="flex items-start gap-3 flex-1">
              <span class="text-xl flex-shrink-0">❓</span>
              <span class="font-semibold text-sm" style="color:#111827;">${q}</span>
            </div>
            <span class="faq-icon" style="transform:rotate(0deg);transition:transform .15s ease;">▾</span>
          </button>
          <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm"
            style="background:rgba(99,102,241,0.06);color:#111827;border-left:3px solid rgba(99,102,241,0.9);">
            ${a}
          </div>
        </div>
      `;
    }).join("");

    // Single binding
    if (!card.__UL_FAQ_BOUND__) {
      card.__UL_FAQ_BOUND__ = true;
      card.addEventListener("click", (e) => {
        const btn = e.target?.closest?.(".faq-question");
        if (!btn) return;
        const item = btn.closest(".faq-item");
        const ans = item?.querySelector?.(".faq-answer");
        const ic = item?.querySelector?.(".faq-icon");
        if (!ans) return;
        const open = !ans.classList.contains("hidden");
        ans.classList.toggle("hidden", open);
        if (ic) ic.style.transform = open ? "rotate(0deg)" : "rotate(180deg)";
      }, { capture: true });
    }

    // Mark injected
    card.setAttribute("data-ul-faq-injected", "true");
    log("rendered", faqs.length, "faqs");
  }

  async function boot(){
    const ctx = getCtx();
    const faqs = pickFaqs(ctx);

    log("ctx", ctx);
    log("faqs matched", faqs.length);
    log("first metier values", (window.__ULYDIA_FAQS__||[]).slice(0,3).map(x => x?.metier));

    // Wait up to 10s for card to exist
    let card = null;
    for (let i = 0; i < 200; i++) {
      card = findFaqCard();
      if (card) break;
      await sleep(50);
    }

    if (!card) {
      console.warn("[metier FAQPATCH FIX13] FAQ card not found. Creating fallback card.");
      // Fallback: create a card at end of left column if possible
      const root = document.getElementById("ulydia-metier-root") || document.body;
      const left = root.querySelector("[data-col='left']") || root.querySelector(".ul-col-left") || root;
      card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<div class="p-4"><h3 id="faq-title" class="text-lg font-bold">Questions fréquentes</h3></div>`;
      left.appendChild(card);
    }

    // Render
    render(card, faqs);

    // Self-diagnostic snapshot (what you were manually checking)
    try {
      const t = document.getElementById("faq-title");
      const c = t?.closest(".card") || card;
      const snap = {
        exists: !!t,
        computedDisplay: c ? getComputedStyle(c).display : null,
        hasInjected: c ? !!c.querySelector("[data-ul-faqs]") : false,
        injectedCount: c ? c.querySelectorAll(".faq-item").length : 0
      };
      window.__ULYDIA_FAQ_SNAPSHOT__ = snap;
      console.log("[metier FAQPATCH FIX13] snapshot", snap);
    } catch(_) {}

    // If something hides it later, re-unhide once (no infinite loop)
    if (faqs.length) {
      const root = document.getElementById("ulydia-metier-root");
      const obs = new MutationObserver(() => {
        try {
          const disp = getComputedStyle(card).display;
          if (disp === "none") {
            unhideAncestors(card, root || null);
            obs.disconnect();
            log("re-unhide after external hide");
          }
        } catch(_) {}
      });
      obs.observe(card, { attributes: true, attributeFilter: ["style", "class", "hidden"] });
      setTimeout(() => { try { obs.disconnect(); } catch(_){} }, 4000);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();