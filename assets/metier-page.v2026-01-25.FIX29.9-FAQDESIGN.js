/* metier-page.v2026-01-25.FIX29.9-FAQDESIGN.js
   ULYDIA — PATCH (FAQ into design)
   - Renders FAQ accordion INSIDE the left column (design), not at page bottom
   - Keeps answers (rich HTML) and cleans &nbsp/&#160;
   - Removes legacy “questions only” blocks and any duplicate FAQ render
   - Logs how many Metier_pays_bloc fields were rendered vs available (sanity check)
   Load AFTER your stable base script (FIX29) and AFTER CMS readers.
*/
(() => {
  if (window.__ULYDIA_METIER_FIX299__) return;
  window.__ULYDIA_METIER_FIX299__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FIX29.9]", ...a);

  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();

  function slugify(str){
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }

  function cleanHTML(html){
    if (!html) return "";
    return String(html)
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function htmlIsEmpty(html){
    const s = cleanHTML(html || "");
    if (!s) return true;
    const t = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return !t;
  }

  function getUrlCtx(){
    const u = new URL(location.href);
    const slug = norm(u.searchParams.get("metier") || u.searchParams.get("slug") || "");
    const iso  = upper(u.searchParams.get("country") || u.searchParams.get("iso") || "");
    return { slug, iso };
  }

  function getPageTitleSlug(root){
    const h1 = root && root.querySelector("h1");
    if (!h1) return "";
    return slugify(h1.textContent || "");
  }

  function injectCSS(){
    if (document.getElementById("ul-metier-fix299-css")) return;
    const css = document.createElement("style");
    css.id = "ul-metier-fix299-css";
    css.textContent = `
      /* Make body text slightly lighter (keep headings/bold dark) */
      #ulydia-metier-root { color: #475467; }
      #ulydia-metier-root p, #ulydia-metier-root li, #ulydia-metier-root div { color: inherit; }
      #ulydia-metier-root h1,#ulydia-metier-root h2,#ulydia-metier-root h3,#ulydia-metier-root h4 { color:#101828; }
      #ulydia-metier-root strong,#ulydia-metier-root b { color:#101828; font-weight:700; }

      /* FAQ card — matches existing Ulydia card vibe */
      #ulydia-metier-root .ul-faq-card {
        margin-top: 18px;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 4px 16px rgba(0,0,0,.06);
        overflow: hidden;
      }
      #ulydia-metier-root .ul-faq-card-hd{
        display:flex; align-items:center; justify-content:space-between;
        padding: 14px 16px;
        background: #fff7ed; /* warm light like other sections */
        border-bottom: 1px solid rgba(16,24,40,.06);
      }
      #ulydia-metier-root .ul-faq-card-hd .t{ font-weight: 800; color:#101828; }
      #ulydia-metier-root .ul-faq-list { padding: 10px 12px 12px; }
      #ulydia-metier-root .ul-faq-item{
        border: 1px solid rgba(16,24,40,.06);
        border-radius: 12px;
        background: #fff;
        margin: 10px 0;
        overflow: hidden;
      }
      #ulydia-metier-root .ul-faq-q{
        width:100%;
        padding: 12px 14px;
        background: none;
        border: none;
        cursor: pointer;
        font-weight: 700;
        text-align: left;
        color:#101828;
        display:flex;
        gap:10px;
        align-items:flex-start;
      }
      #ulydia-metier-root .ul-faq-q .ic{
        width: 18px; height: 18px; flex: 0 0 auto;
        margin-top: 2px;
        border-radius: 6px;
        display:inline-flex; align-items:center; justify-content:center;
        background:#ffe4e6; color:#9f1239;
        font-size: 12px; font-weight: 900;
      }
      #ulydia-metier-root .ul-faq-a{
        padding: 0 14px 14px 42px;
        line-height: 1.65;
        color:#475467;
      }
    `;
    document.head.appendChild(css);
  }

  function cleanRootHTML(root){
    if (!root) return;
    root.querySelectorAll("*").forEach(el => {
      const h = el.innerHTML;
      if (h && (h.includes("&nbsp;") || h.includes("&#160;"))) {
        el.innerHTML = cleanHTML(h);
      }
    });
  }

  // --------------------------
  // Locate left column container (design-safe)
  // --------------------------
  function getLeftColumn(root){
    // Prefer explicit left col containers if present
    return (
      root.querySelector(".ul-metier-left") ||
      root.querySelector(".ul-col-left") ||
      root.querySelector("[data-ul-col='left']") ||
      // fallback: the column that contains “Vue d’ensemble” card
      (() => {
        const node = [...root.querySelectorAll("*")].find(n => /Vue d’ensemble/i.test(n.textContent || ""));
        return node ? (node.closest(".ul-col, .ul-grid-col, section, div") || root) : root;
      })()
    );
  }

  // --------------------------
  // Remove legacy bottom blocks (questions-only + raw extra dumps)
  // --------------------------
  function removeLegacyQuestionsOnly(root){
    const candidates = [...root.querySelectorAll("*")].filter(n => /Questions fréquentes/i.test(n.textContent || ""));
    for (const n of candidates) {
      const host = n.closest("section,div") || n.parentElement;
      if (!host || host === root) continue;
      const hasInteractive = host.querySelector("button,details,summary");
      // If it is NOT our designed FAQ card, and has no buttons => remove
      if (!hasInteractive && !host.classList.contains("ul-faq-card")) {
        try { host.remove(); } catch(e){}
        log("Removed legacy FAQ block");
        break;
      }
    }
  }

  // --------------------------
  // FAQ matching
  // --------------------------
  function faqMatches(f, ctx, titleSlug){
    const isoNeed = ctx.iso;
    const fIso = upper(f.iso || "");
    const okIso = !isoNeed || !fIso || fIso === isoNeed;

    const need = slugify(ctx.slug) || titleSlug || "";
    const fMet = slugify(f.metier || "");
    // accept exact slug, contains, or empty metier field
    const okMet = !need || !fMet || fMet === need || fMet.includes(need) || need.includes(fMet);

    return okIso && okMet;
  }

  function renderFAQIntoDesign(root){
    const all = Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : [];
    if (!all.length) { log("FAQ: no data"); return 0; }

    const ctx = getUrlCtx();
    const titleSlug = getPageTitleSlug(root);

    const raw = all
      .filter(f => f && norm(f.question) && norm(f.answer) && faqMatches(f, ctx, titleSlug));

    // de-dup by question slug
    const seen = new Set();
    const faqs = [];
    for (const f of raw) {
      const k = slugify(f.question);
      if (!k || seen.has(k)) continue;
      if (htmlIsEmpty(f.answer)) continue;
      seen.add(k);
      faqs.push(f);
    }

    log("FAQ filter:", { total: all.length, matched: faqs.length, ctx, titleSlug });

    // remove any previous render
    root.querySelectorAll(".ul-faq-card").forEach(n => n.remove());
    removeLegacyQuestionsOnly(root);

    if (!faqs.length) return 0;

    const left = getLeftColumn(root);

    const card = document.createElement("div");
    card.className = "ul-faq-card";
    card.innerHTML = `
      <div class="ul-faq-card-hd">
        <div class="t">Questions fréquentes</div>
      </div>
      <div class="ul-faq-list"></div>
    `;
    const list = card.querySelector(".ul-faq-list");

    faqs.forEach((faq) => {
      const item = document.createElement("div");
      item.className = "ul-faq-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ul-faq-q";
      btn.innerHTML = `<span class="ic">?</span><span>${cleanHTML(faq.question)}</span>`;

      const ans = document.createElement("div");
      ans.className = "ul-faq-a";
      ans.innerHTML = cleanHTML(faq.answer);
      ans.hidden = true;

      btn.addEventListener("click", () => { ans.hidden = !ans.hidden; });

      item.appendChild(btn);
      item.appendChild(ans);
      list.appendChild(item);
    });

    // Insert FAQ after the “Environnements de travail” card if found, otherwise append to left
    const envNode = [...left.querySelectorAll("*")].find(n => /Environnements de travail/i.test(n.textContent || ""));
    const envCard = envNode ? (envNode.closest("section,div") || null) : null;
    if (envCard && envCard.parentElement) {
      envCard.parentElement.insertBefore(card, envCard.nextSibling);
    } else {
      left.appendChild(card);
    }

    return faqs.length;
  }

  // --------------------------
  // Sanity check: how many Metier_pays_bloc fields exist for this metier/iso?
  // --------------------------
  function countBlocFieldsForCtx(root){
    const all = Array.isArray(window.__ULYDIA_METIER_PAYS_BLOCS__) ? window.__ULYDIA_METIER_PAYS_BLOCS__ : [];
    if (!all.length) return null;

    const ctx = getUrlCtx();
    const need = slugify(ctx.slug) || getPageTitleSlug(root) || "";
    const iso = ctx.iso;

    let b = null;
    for (const x of all) {
      if (iso && upper(x.iso) !== iso) continue;
      const m = slugify(x.metier || "");
      if (need && m && (m === need || m.includes(need) || need.includes(m))) { b = x; break; }
      if (!b) b = x;
    }
    if (!b || !Array.isArray(b.sections)) return null;

    const keys = new Set();
    b.sections.forEach(s => { if (s && s.key && !htmlIsEmpty(s.value)) keys.add(s.key); });
    return { iso: b.iso, metier: b.metier, keys: [...keys], count: keys.size };
  }

  // --------------------------
  // Boot
  // --------------------------
  let tries = 0;
  (function boot(){
    tries++;
    const root = document.getElementById("ulydia-metier-root");
    if (!root) { if (tries < 120) return setTimeout(boot, 120); return; }

    // Wait for base UI to be in place
    if (root.children.length === 0) { if (tries < 160) return setTimeout(boot, 140); return; }

    // Wait for CMS arrays if they exist
    if (typeof window.__ULYDIA_FAQS__ === "undefined" && tries < 160) return setTimeout(boot, 140);
    if (typeof window.__ULYDIA_METIER_PAYS_BLOCS__ === "undefined" && tries < 160) return setTimeout(boot, 140);

    injectCSS();
    cleanRootHTML(root);

    const faqN = renderFAQIntoDesign(root);
    log("FAQ rendered in design:", faqN);

    const blocInfo = countBlocFieldsForCtx(root);
    if (blocInfo) log("Metier_pays_bloc non-empty fields:", blocInfo);

    cleanRootHTML(root);
  })();
})();