/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX3.js
   ULYDIA — FAQ Patch (robust matching)
   ✅ Populates the BASE FAQ card (#faq-title) using window.__ULYDIA_FAQS__ (if present)
   ✅ Matches FAQs by:
      - current slug (URL param / payload) OR
      - slugified page title (H1) OR
      - tolerant contains-match
   ✅ Activates accordion toggles on the BASE design (.faq-question/.faq-answer)
   ✅ Removes the legacy duplicate FAQ block at the very bottom (Webflow/static)
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX3__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX3__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX3]", ...a);

  const norm = (s) => String(s || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
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
    const iso = upper(url.searchParams.get("iso") || url.searchParams.get("country") || "");
    const slug = slugify(url.searchParams.get("slug") || url.searchParams.get("metier") || url.searchParams.get("job") || "");
    const lang = lower(url.searchParams.get("lang") || "");
    return { iso, slug, lang };
  }

  function getTitleSlug(){
    const h1 = document.querySelector("#ulydia-metier-root h1, h1");
    return slugify(h1 ? h1.textContent : "");
  }

  function pickFaqArray(){
    const a = window.__ULYDIA_FAQS__ || window.__ULYDIA_FAQS || window.__ULYDIA_FAQ__ || window.__ULYDIA_FAQ || null;
    return Array.isArray(a) ? a : [];
  }

  function itemJobKey(item){
    const raw = norm(
      item?.job_slug || item?.metier_slug || item?.slug || item?.metier || item?.job ||
      item?.metier_ref || item?.metier_name || item?.name || item?.title || ""
    );
    if (!raw) return "";
    // strip URL and "|FR" patterns
    const clean = raw.replace(/^https?:\/\/[^/]+\//, "").split(/[?#]/)[0].split("|")[0];
    return slugify(clean);
  }

  function matches(item, ctx, titleSlug){
    const k = itemJobKey(item);
    if (!k) return false;

    // ISO filter only if item provides it
    const iso2 = upper(item?.iso || item?.country_code || item?.code_iso || item?.country || "");
    if (iso2 && ctx.iso && iso2 !== ctx.iso) return false;

    // lang filter only if item provides it
    const lang2 = lower(item?.lang || item?.langue || item?.language || "");
    if (lang2 && ctx.lang && lang2 !== ctx.lang) return false;

    // Match by URL slug OR title slug (robust)
    if (ctx.slug && (k === ctx.slug || k.includes(ctx.slug) || ctx.slug.includes(k))) return true;
    if (titleSlug && (k === titleSlug || k.includes(titleSlug) || titleSlug.includes(k))) return true;

    return false;
  }

  function htmlIsEmpty(s){
    const t = norm(String(s||"").replace(/<[^>]*>/g, " "));
    return !t;
  }

  function renderIntoBaseCard(faqs){
    // Find the BASE FAQ card (created by BASE or template)
    const title = document.getElementById("faq-title");
    const card = title ? title.closest(".card") : null;
    if (!card) return false;

    const wrap = card.querySelector(".space-y-3") || card.querySelector("[data-ul-faqs]");
    if (!wrap) return false;

    if (!faqs.length){
      // keep it hidden if no data (BASE behavior)
      card.style.display = "none";
      return true;
    }

    card.style.display = "";
    wrap.innerHTML = faqs.map(item => {
      const q = norm(item.question || item.q || item["Question"] || item["question"] || "—");
      const aRaw = String(item.answer || item.a || item["Réponse"] || item["Reponse"] || item["answer"] || "");
      const a = aRaw.replace(/\u00A0/g, " ").replace(/&nbsp;|&#160;/g, " ");
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

    wireToggles(card);
    return true;
  }

  function wireToggles(scope){
    // Event delegation (fix "first item doesn't click")
    const root = scope || document;
    const handler = (ev) => {
      const btn = ev.target.closest(".faq-question");
      if (!btn) return;
      const item = btn.closest(".faq-item");
      if (!item) return;
      const ans = item.querySelector(".faq-answer");
      const icon = btn.querySelector(".faq-icon");
      if (!ans) return;
      ans.classList.toggle("hidden");
      if (icon) icon.style.transform = ans.classList.contains("hidden") ? "" : "rotate(180deg)";
    };

    // Avoid double-binding
    if (root.__ulFaqBound) return;
    root.__ulFaqBound = true;
    root.addEventListener("click", handler, true);
  }

  function removeLegacyBottomFaq(){
    // Bottom legacy area often contains a plain "Questions fréquentes" section outside the JS root.
    // Remove it if it is outside the ulydia root AND looks like an FAQ list.
    const uroot = document.getElementById("ulydia-metier-root");
    const candidates = [...document.querySelectorAll("body > *")].filter(n => n && n !== uroot);

    candidates.forEach(n => {
      const t = lower(n.textContent || "");
      const looksFaq = t.includes("questions fréquentes") || t.includes("faq");
      if (!looksFaq) return;

      // If it contains many question-like rows and is near footer, it's likely the legacy duplicate.
      const hasManyQ = n.querySelectorAll("button, summary, .faq-question, .w-dropdown-toggle, .w-accordion-item, .w-accordion").length >= 3
                   || n.querySelectorAll("li").length >= 3;
      if (!hasManyQ) return;

      // Do not remove main app root
      if (uroot && uroot.contains(n)) return;

      // Heuristic: if it's after footer or near the end, remove
      try{
        const rect = n.getBoundingClientRect();
        if (rect.top > (window.innerHeight * 0.6)) {
          n.remove();
          log("Removed legacy bottom FAQ block");
        }
      }catch(_){}
    });
  }

  async function boot(){
    // wait for BASE to mount
    const t0 = Date.now();
    while (Date.now() - t0 < 2500){
      if (document.getElementById("ulydia-metier-root")) break;
      await new Promise(r => setTimeout(r, 50));
    }

    const ctx = getCtx();
    const titleSlug = getTitleSlug();

    const all = pickFaqArray();
    log("faq globals:", { total: all.length, ctx, titleSlug });

    const raw = all.filter(f => f && norm(f.question) && !htmlIsEmpty(f.answer) && matches(f, ctx, titleSlug));

    // de-dup by question
    const seen = new Set();
    const faqs = [];
    for (const f of raw){
      const k = slugify(f.question);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      faqs.push(f);
    }

    // render (if base card exists)
    const ok = renderIntoBaseCard(faqs);

    // Always try to remove bottom duplicates (safe heuristics)
    removeLegacyBottomFaq();

    // If BASE card is present but empty, still wire toggles for future (in case other code fills it)
    const title = document.getElementById("faq-title");
    if (title){
      const card = title.closest(".card");
      if (card) wireToggles(card);
    }

    if (!ok) log("No BASE FAQ card found (nothing to patch).");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
