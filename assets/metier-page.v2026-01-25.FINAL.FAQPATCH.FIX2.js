/* metier-page.v2026-01-25.FINAL.FAQPATCH.FIX2.js
   ULYDIA — FAQ patch (safe)
   - If BASE already rendered FAQ card (#faq-title), enable accordion (answers toggle)
   - If window.__ULYDIA_FAQS__ exists, replace FAQ items with CMS-driven items (still same BASE design)
   - Remove duplicate "bottom-of-page" FAQ blocks OUTSIDE root (only after we have FAQ in design)
*/
(() => {
  if (window.__ULYDIA_METIER_FAQPATCH_FIX2__) return;
  window.__ULYDIA_METIER_FAQPATCH_FIX2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FAQPATCH FIX2]", ...a);

  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();

  function slugify(str){
    return String(str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }

  function cleanHTML(html){
    if (!html) return "";
    return String(html)
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function htmlIsEmpty(html){
    const s = cleanHTML(html || "");
    if (!s) return true;
    const t = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return !t;
  }

  function getCtx(){
    const u = new URL(location.href);
    const slug = norm(u.searchParams.get("metier") || u.searchParams.get("slug") || "");
    const iso  = upper(u.searchParams.get("country") || u.searchParams.get("iso") || "");
    return { slug, iso };
  }

  function getTitleSlug(root){
    const h1 = root && root.querySelector("h1");
    return h1 ? slugify(h1.textContent || "") : "";
  }

  // ---------------------------------------------------------
  // 1) Find the BASE FAQ card and list container
  // ---------------------------------------------------------
  function findBaseFaqHost(root){
    const title = root.querySelector("#faq-title");
    if (!title) return null;
    const card = title.closest(".card") || title.closest("section,div") || null;
    if (!card) return null;
    const list = card.querySelector(".space-y-3") || card;
    return { card, list };
  }

  // ---------------------------------------------------------
  // 2) Accordion binding (works for BASE markup and CMS markup)
  // ---------------------------------------------------------
  function bindAccordion(container){
    if (!container || container.__ulFaqBound) return;
    container.__ulFaqBound = true;

    container.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest(".faq-question, .ul-faq-q") : null;
      if (!btn || !container.contains(btn)) return;

      // BASE structure: .faq-item contains button + .faq-answer
      const item = btn.closest(".faq-item, .ul-faq-item") || btn.parentElement;
      if (!item) return;

      const ans = item.querySelector(".faq-answer, .ul-faq-a");
      if (!ans) return;

      // toggle visibility
      const isHidden = ans.classList.contains("hidden") || ans.hidden === true;
      if (ans.classList.contains("hidden")) ans.classList.toggle("hidden", !isHidden);
      if (typeof ans.hidden === "boolean") ans.hidden = !isHidden;

      // rotate icon if present (BASE uses .faq-icon)
      const ic = btn.querySelector(".faq-icon");
      if (ic) ic.classList.toggle("rotate-180", isHidden);
    });
  }

  // ---------------------------------------------------------
  // 3) CMS-driven FAQ extraction + matching (tolerant)
  // ---------------------------------------------------------
  function getFaqArray(){
    const a = window.__ULYDIA_FAQS__;
    return Array.isArray(a) ? a : [];
  }

  function matchesFaq(f, ctx, titleSlug){
    const needSlug = slugify(ctx.slug) || titleSlug || "";
    const fSlug = slugify(f?.job_slug || f?.metier_slug || f?.metier || f?.slug || f?.job || "");
    const okSlug = !needSlug || !fSlug || fSlug === needSlug || fSlug.includes(needSlug) || needSlug.includes(fSlug);

    const needIso = ctx.iso;
    const fIso = upper(f?.iso || f?.country_code || f?.country || "");
    // If FAQ item has ISO, enforce it. Otherwise allow.
    const okIso = !needIso || !fIso || fIso === needIso;

    return okSlug && okIso;
  }

  function buildFaqItems(all, ctx, titleSlug){
    const raw = all.filter(f => f && norm(f.question) && norm(f.answer) && matchesFaq(f, ctx, titleSlug));
    const seen = new Set();
    const out = [];
    for (const f of raw){
      const k = slugify(f.question);
      if (!k || seen.has(k)) continue;
      if (htmlIsEmpty(f.answer)) continue;
      seen.add(k);
      out.push(f);
    }
    // Fallback: if strict match yields nothing but we have same job without ISO, relax ISO
    if (!out.length && ctx.slug){
      const raw2 = all.filter(f => {
        const fSlug = slugify(f?.job_slug || f?.metier_slug || f?.metier || f?.slug || f?.job || "");
        const needSlug = slugify(ctx.slug);
        return norm(f?.question) && norm(f?.answer) && (fSlug === needSlug || fSlug.includes(needSlug) || needSlug.includes(fSlug));
      });
      for (const f of raw2){
        const k = slugify(f.question);
        if (!k || seen.has(k)) continue;
        if (htmlIsEmpty(f.answer)) continue;
        seen.add(k);
        out.push(f);
      }
    }
    return out;
  }

  function renderCmsFaqIntoBase(host, faqs){
    if (!host || !host.list) return 0;

    // wipe list
    host.list.innerHTML = "";

    faqs.forEach(faq => {
      const item = document.createElement("div");
      item.className = "faq-item";

      const q = document.createElement("button");
      q.type = "button";
      q.className = "faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3";
      q.setAttribute("style", "background: white; border: 2px solid var(--border);");

      q.innerHTML = `
        <div class="flex items-start gap-3 flex-1">
          <span class="text-xl flex-shrink-0">❓</span>
          <span class="font-semibold text-sm" style="color: var(--text);">${cleanHTML(faq.question)}</span>
        </div>
        <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;

      const a = document.createElement("div");
      a.className = "faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm";
      a.setAttribute("style", "background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;");
      a.innerHTML = cleanHTML(faq.answer);

      item.appendChild(q);
      item.appendChild(a);
      host.list.appendChild(item);
    });

    return faqs.length;
  }

  // ---------------------------------------------------------
  // 4) Remove duplicate bottom FAQ blocks (outside root)
  // ---------------------------------------------------------
  function removeBottomDuplicates(root){
    // Look for other "Questions fréquentes" blocks outside the root.
    const nodes = Array.from(document.querySelectorAll("body *"))
      .filter(n => n && n !== root && !root.contains(n) && /Questions fréquentes/i.test(n.textContent || ""));
    for (const n of nodes){
      const host = n.closest("section,div") || n.parentElement;
      if (!host) continue;

      // If it has our BASE FAQ UI, ignore
      if (host.querySelector("#faq-title, .faq-item, .faq-answer, .faq-question")) continue;

      // If it's a legacy list (no buttons) or a raw richtext dump, remove
      const hasButtons = host.querySelector("button, details, summary");
      const tlen = (host.textContent || "").trim().length;
      if (!hasButtons || tlen < 2000){
        try { host.remove(); log("Removed bottom duplicate FAQ block"); } catch(_){}
        break;
      }
    }
  }

  // ---------------------------------------------------------
  // Boot
  // ---------------------------------------------------------
  let tries = 0;
  (function boot(){
    tries++;

    const root = document.getElementById("ulydia-metier-root");
    if (!root) { if (tries < 200) return setTimeout(boot, 120); return; }

    // Wait until BASE has rendered something
    if (root.children.length === 0) { if (tries < 200) return setTimeout(boot, 140); return; }

    const host = findBaseFaqHost(root);
    if (!host) { if (tries < 220) return setTimeout(boot, 150); return; }

    const ctx = getCtx();
    const titleSlug = getTitleSlug(root);

    // 1) Try CMS driven render if data exists
    const all = getFaqArray();
    let usedCms = false;

    if (all.length){
      const faqs = buildFaqItems(all, ctx, titleSlug);
      log("FAQ data:", { total: all.length, matched: faqs.length, ctx, titleSlug });
      if (faqs.length){
        renderCmsFaqIntoBase(host, faqs);
        usedCms = true;
      }
    } else {
      log("FAQ: __ULYDIA_FAQS__ not found or empty (will keep BASE markup).");
    }

    // 2) Always enable accordion (BASE or CMS)
    bindAccordion(host.card);

    // 3) If we have an FAQ in design (BASE always has card), remove duplicates outside root
    //    Only do it after we ensured accordion is bound.
    removeBottomDuplicates(root);

  })();
})();