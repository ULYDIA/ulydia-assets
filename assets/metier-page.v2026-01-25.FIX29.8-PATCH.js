/* metier-page.v2026-01-25.FIX29.8-PATCH.js
   ULYDIA — PATCH (post-render, SAFE)
   Fixes:
   - FAQ accordion with answers from window.__ULYDIA_FAQS__ (robust matching)
   - Removes/avoids empty & duplicate blocks
   - Ensures ALL Metier_pays_bloc sections render once (template fill + “extra” cards)
   - Cleans &nbsp / &#160; and ",&nbsp;" in rendered HTML/text
   - Sets body text to dark gray; headings/bold stay darker for contrast
   Usage: load AFTER your stable base script.
*/
(() => {
  if (window.__ULYDIA_METIER_FIX298__) return;
  window.__ULYDIA_METIER_FIX298__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FIX29.8]", ...a);

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
    if (document.getElementById("ul-metier-fix298-css")) return;
    const css = document.createElement("style");
    css.id = "ul-metier-fix298-css";
    css.textContent = `
      /* text tone */
      #ulydia-metier-root { color: #475467; } /* dark gray */
      #ulydia-metier-root p, #ulydia-metier-root li, #ulydia-metier-root div { color: inherit; }
      #ulydia-metier-root h1,#ulydia-metier-root h2,#ulydia-metier-root h3,#ulydia-metier-root h4,#ulydia-metier-root h5,#ulydia-metier-root h6 { color:#101828; }
      #ulydia-metier-root strong,#ulydia-metier-root b { color:#101828; font-weight:700; }

      /* FAQ */
      #ulydia-metier-root .ul-faq-section { margin-top: 44px; }
      #ulydia-metier-root .ul-faq-section h2 { margin: 0 0 12px; }
      #ulydia-metier-root .ul-faq-item { border-radius:12px; background:#fff; margin:10px 0; box-shadow:0 4px 16px rgba(0,0,0,.05); overflow:hidden; }
      #ulydia-metier-root .ul-faq-question { width:100%; padding:14px 18px; font-weight:600; background:none; border:none; text-align:left; cursor:pointer; color:#101828; }
      #ulydia-metier-root .ul-faq-answer { padding:0 18px 16px; color:#475467; line-height:1.65; }

      /* Extra bloc cards */
      #ulydia-metier-root .ul-pays-extra { margin-top:18px; padding:18px; border-radius:14px; background:#fff; box-shadow:0 4px 16px rgba(0,0,0,.05); }
      #ulydia-metier-root .ul-pays-extra h3 { margin:0 0 10px; font-size:16px; }
      #ulydia-metier-root .ul-pays-grid { display:grid; grid-template-columns:1fr; gap:10px; }
      #ulydia-metier-root .ul-pays-card { border-radius:12px; padding:14px 16px; background:#f9fafb; border:1px solid rgba(16,24,40,.06); }
      #ulydia-metier-root .ul-pays-card .t { font-weight:700; color:#101828; margin-bottom:6px; }
      #ulydia-metier-root .ul-pays-card .c { color:#475467; line-height:1.6; }
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
  // FAQ renderer (robust)
  // --------------------------
  function faqMatches(f, ctx, titleSlug){
    const isoNeed = ctx.iso;
    const fIso = upper(f.iso || "");
    const okIso = !isoNeed || !fIso || fIso === isoNeed;

    const need = slugify(ctx.slug) || titleSlug || "";
    const fMet = slugify(f.metier || "");
    const okMet = !need || !fMet || fMet === need || fMet.includes(need) || need.includes(fMet);

    return okIso && okMet;
  }

  function removeLegacyQuestionsOnly(root){
    const candidates = [...root.querySelectorAll("*")].filter(n => /Questions fréquentes/i.test(n.textContent || ""));
    for (const n of candidates) {
      const host = n.closest("section,div") || n.parentElement;
      if (!host || host === root) continue;
      const textLen = (host.textContent || "").replace(/\s+/g," ").trim().length;
      const hasInteractive = host.querySelector("button,details,summary");
      if (!hasInteractive && textLen < 2000) {
        try { host.remove(); } catch(e){}
        log("FAQ: removed legacy questions-only block");
        break;
      }
    }
  }

  function renderFAQs(root){
    const all = Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : [];
    if (!all.length) { log("FAQ: no data"); return 0; }

    const ctx = getUrlCtx();
    const titleSlug = getPageTitleSlug(root);

    const faqsRaw = all.filter(f => f && norm(f.question) && norm(f.answer) && faqMatches(f, ctx, titleSlug));
    const seen = new Set();
    const faqs = [];
    for (const f of faqsRaw) {
      const k = slugify(f.question);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      faqs.push(f);
    }

    log("FAQ: filter", { total: all.length, matched: faqs.length, ctx, titleSlug });

    if (!faqs.length) return 0;

    const old = root.querySelector(".ul-faq-section");
    if (old) old.remove();
    removeLegacyQuestionsOnly(root);

    const sec = document.createElement("section");
    sec.className = "ul-faq-section";
    sec.innerHTML = `<h2>Questions fréquentes</h2>`;

    faqs.forEach(faq => {
      const item = document.createElement("div");
      item.className = "ul-faq-item";

      const q = document.createElement("button");
      q.className = "ul-faq-question";
      q.type = "button";
      q.innerHTML = cleanHTML(faq.question);

      const a = document.createElement("div");
      a.className = "ul-faq-answer";
      a.innerHTML = cleanHTML(faq.answer);
      a.hidden = true;

      q.addEventListener("click", () => { a.hidden = !a.hidden; });

      item.appendChild(q);
      item.appendChild(a);
      sec.appendChild(item);
    });

    root.appendChild(sec);
    return faqs.length;
  }

  // --------------------------
  // Metier_pays_bloc renderer
  // --------------------------
  function findBlocForCtx(root){
    const all = Array.isArray(window.__ULYDIA_METIER_PAYS_BLOCS__) ? window.__ULYDIA_METIER_PAYS_BLOCS__ : [];
    if (!all.length) return null;

    const ctx = getUrlCtx();
    const need = slugify(ctx.slug) || getPageTitleSlug(root) || "";
    const iso = ctx.iso;

    let best = null;
    for (const b of all) {
      if (iso && upper(b.iso) !== iso) continue;
      const bSlug = slugify(b.metier || "");
      if (need && bSlug && (bSlug === need || bSlug.includes(need) || need.includes(bSlug))) {
        best = b; break;
      }
      if (!best) best = b;
    }
    return best;
  }

  const TEMPLATE_TARGETS = [
    { key: "formation_bloc", selectors: ["#ul-card-formation","[data-ul-card='formation']", ".ul-card-formation"] },
    { key: "acces_bloc", selectors: ["#ul-card-acces","[data-ul-card='acces']", ".ul-card-acces"] },
    { key: "marche_bloc", selectors: ["#ul-card-marche","[data-ul-card='marche']", ".ul-card-marche"] },
    { key: "salaire_bloc", selectors: ["#ul-card-remuneration","[data-ul-card='remuneration']", ".ul-card-remuneration"] },
  ];

  function applyToTemplate(bloc, root){
    if (!bloc || !Array.isArray(bloc.sections)) return new Set();

    const byKey = {};
    for (const s of bloc.sections) {
      if (!s || !s.key) continue;
      const v = s.value || "";
      if (htmlIsEmpty(v)) continue;
      if (!byKey[s.key]) byKey[s.key] = s;
    }

    const applied = new Set();
    TEMPLATE_TARGETS.forEach(def => {
      const s = byKey[def.key];
      let target = null;
      for (const sel of def.selectors) { target = root.querySelector(sel); if (target) break; }
      if (!target) return;

      if (!s) {
        target.style.display = "none";
        return;
      }

      const slot =
        target.querySelector(".ul-card-content,.content,.ul-content,[data-ul-slot='content']") ||
        target.querySelector(".w-richtext") ||
        target;

      slot.innerHTML = cleanHTML(s.value);
      target.style.display = "";
      target.hidden = false;
      applied.add(def.key);
    });

    return applied;
  }

  function appendExtraBloc(bloc, root, alreadyRenderedKeys){
    if (!bloc || !Array.isArray(bloc.sections) || !bloc.sections.length) return 0;

    const old = root.querySelector(".ul-pays-extra");
    if (old) old.remove();

    const unique = {};
    for (const s of bloc.sections) {
      if (!s || !s.key) continue;
      if (alreadyRenderedKeys && alreadyRenderedKeys.has(s.key)) continue;
      if (htmlIsEmpty(s.value || "")) continue;
      if (!unique[s.key]) unique[s.key] = s;
    }

    const items = Object.values(unique)
      .map(s => ({ t: norm(s.label || s.key), c: cleanHTML(s.value) }))
      .filter(it => it.t && it.c && !htmlIsEmpty(it.c));

    if (!items.length) return 0;

    const wrap = document.createElement("div");
    wrap.className = "ul-pays-extra";
    wrap.innerHTML = `<h3>Contenu spécifique (${upper(bloc.iso) || "pays"})</h3><div class="ul-pays-grid"></div>`;
    const grid = wrap.querySelector(".ul-pays-grid");

    items.forEach(it => {
      const card = document.createElement("div");
      card.className = "ul-pays-card";
      card.innerHTML = `<div class="t">${it.t}</div><div class="c">${it.c}</div>`;
      grid.appendChild(card);
    });

    const left = root.querySelector(".ul-metier-left,.ul-col-left,.ul-layout-left,[data-ul-col='left']") || root;
    left.appendChild(wrap);
    return items.length;
  }

  // --------------------------
  // Boot
  // --------------------------
  let tries = 0;
  (function boot(){
    tries++;
    const root = document.getElementById("ulydia-metier-root");
    if (!root) { if (tries < 100) return setTimeout(boot, 120); return; }

    const hasUI = root.children.length > 0;
    if (!hasUI) { if (tries < 140) return setTimeout(boot, 140); return; }

    // Give time to CMS readers
    if ((typeof window.__ULYDIA_FAQS__ === "undefined" || typeof window.__ULYDIA_METIER_PAYS_BLOCS__ === "undefined") && tries < 140) {
      return setTimeout(boot, 140);
    }

    injectCSS();
    cleanRootHTML(root);

    const bloc = findBlocForCtx(root);
    if (bloc) {
      const appliedKeys = applyToTemplate(bloc, root);
      const added = appendExtraBloc(bloc, root, appliedKeys);
      log("Metier_pays_bloc:", { applied: [...appliedKeys], extraCards: added });
    } else {
      log("Metier_pays_bloc: none matched / none available");
    }

    const faqCount = renderFAQs(root);
    log("FAQ rendered:", faqCount);

    cleanRootHTML(root);
  })();
})();