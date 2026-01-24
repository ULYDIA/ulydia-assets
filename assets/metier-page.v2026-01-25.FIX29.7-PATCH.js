/* metier-page.v2026-01-25.FIX29.7-PATCH.js
   ULYDIA — PATCH (post-render, SAFE)
   - FAQ accordion (questions + answers) from window.__ULYDIA_FAQS__
   - Clean &nbsp / &#160; and ",&nbsp;"
   - Lighter body text, keep headings/bold dark
   - Ensure Metier_pays_bloc sections appear (fill template targets if found + append extra cards)
   Load AFTER your stable base script (ex: FIX29.4).
*/
(() => {
  if (window.__ULYDIA_METIER_FIX297__) return;
  window.__ULYDIA_METIER_FIX297__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier FIX29.7]", ...a);

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

  function getUrlCtx(){
    const u = new URL(location.href);
    const slug = norm(u.searchParams.get("metier") || u.searchParams.get("slug") || "");
    const iso  = upper(u.searchParams.get("country") || u.searchParams.get("iso") || "");
    return { slug, iso };
  }

  function injectCSS(){
    if (document.getElementById("ul-metier-fix297-css")) return;
    const css = document.createElement("style");
    css.id = "ul-metier-fix297-css";
    css.textContent = `
      #ulydia-metier-root { color: #667085; }
      #ulydia-metier-root h1,#ulydia-metier-root h2,#ulydia-metier-root h3,#ulydia-metier-root h4,#ulydia-metier-root h5,#ulydia-metier-root h6 { color:#101828; }
      #ulydia-metier-root strong,#ulydia-metier-root b { color:#101828; font-weight:700; }

      #ulydia-metier-root .ul-faq-section { margin-top: 44px; }
      #ulydia-metier-root .ul-faq-item { border-radius:12px; background:#fff; margin:10px 0; box-shadow:0 4px 16px rgba(0,0,0,.05); overflow:hidden; }
      #ulydia-metier-root .ul-faq-question { width:100%; padding:14px 18px; font-weight:600; background:none; border:none; text-align:left; cursor:pointer; color:#101828; }
      #ulydia-metier-root .ul-faq-answer { padding:0 18px 16px; color:#667085; line-height:1.65; }

      #ulydia-metier-root .ul-pays-extra { margin-top:18px; padding:18px; border-radius:14px; background:#fff; box-shadow:0 4px 16px rgba(0,0,0,.05); }
      #ulydia-metier-root .ul-pays-extra h3 { margin:0 0 10px; font-size:16px; }
      #ulydia-metier-root .ul-pays-grid { display:grid; grid-template-columns:1fr; gap:10px; }
      #ulydia-metier-root .ul-pays-card { border-radius:12px; padding:14px 16px; background:#f9fafb; border:1px solid rgba(16,24,40,.06); }
      #ulydia-metier-root .ul-pays-card .t { font-weight:700; color:#101828; margin-bottom:6px; }
      #ulydia-metier-root .ul-pays-card .c { color:#667085; line-height:1.6; }
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

  function renderFAQs(root){
    const all = Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : [];
    if (!all.length) { log("FAQ: no data"); return; }

    const { slug, iso } = getUrlCtx();
    const slugS = slugify(slug);

    const faqs = all.filter(f => {
      const fIso = upper(f.iso || "");
      const okIso = !iso || !fIso || fIso === iso;
      const fMet = slugify(f.metier || "");
      const okMet = !slugS || (fMet && fMet === slugS);
      return okIso && okMet && norm(f.question) && norm(f.answer);
    });

    if (!faqs.length) { log("FAQ: filtered=0", { slug, iso, total: all.length }); return; }

    // remove old FAQ blocks if any
    const old = root.querySelector(".ul-faq-section");
    if (old) old.remove();

    // If a "questions only" block exists at the very end, remove it (safe heuristic)
    const nodes = [...root.querySelectorAll("*")];
    const qOnly = nodes.find(n => /Questions fréquentes/i.test(n.textContent || "") && (n.textContent || "").length < 900);
    if (qOnly) {
      const host = qOnly.closest("section,div") || qOnly.parentElement;
      if (host && host !== root) { try { host.remove(); } catch(e){} }
    }

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

      q.addEventListener("click", () => {
        a.hidden = !a.hidden;
        item.classList.toggle("open", !a.hidden);
      });

      item.appendChild(q);
      item.appendChild(a);
      sec.appendChild(item);
    });

    root.appendChild(sec);
    log("FAQ: rendered", faqs.length);
  }

  function findBlocForCtx(){
    const all = Array.isArray(window.__ULYDIA_METIER_PAYS_BLOCS__) ? window.__ULYDIA_METIER_PAYS_BLOCS__ : [];
    if (!all.length) return null;

    const { slug, iso } = getUrlCtx();
    const slugS = slugify(slug);

    let best = null;
    for (const b of all) {
      if (iso && upper(b.iso) !== iso) continue;
      const bSlug = slugify(b.metier || "");
      if (slugS && bSlug && bSlug === slugS) { best = b; break; }
      if (!best) best = b;
    }
    return best;
  }

  const TEMPLATE_TARGETS = [
    { key: "formation_bloc", title: "Formation", selectors: ["#ul-card-formation","[data-ul-card='formation']", ".ul-card-formation"] },
    { key: "acces_bloc", title: "Accès au métier", selectors: ["#ul-card-acces","[data-ul-card='acces']", ".ul-card-acces"] },
    { key: "marche_bloc", title: "Marché du travail", selectors: ["#ul-card-marche","[data-ul-card='marche']", ".ul-card-marche"] },
    { key: "salaire_bloc", title: "Rémunération", selectors: ["#ul-card-remuneration","[data-ul-card='remuneration']", ".ul-card-remuneration"] },
  ];

  function applyToTemplate(bloc, root){
    if (!bloc || !Array.isArray(bloc.sections)) return 0;
    const byKey = {};
    bloc.sections.forEach(s => { if (s && s.key) byKey[s.key] = s; });

    let applied = 0;
    TEMPLATE_TARGETS.forEach(def => {
      const s = byKey[def.key];
      if (!s || !norm(s.value)) return;

      let target = null;
      for (const sel of def.selectors) { target = root.querySelector(sel); if (target) break; }
      if (!target) return;

      const slot = target.querySelector(".ul-card-content,.content,.ul-content,[data-ul-slot='content']") || target;
      slot.innerHTML = cleanHTML(s.value);
      target.style.display = "";
      target.hidden = false;
      applied++;
    });
    return applied;
  }

  function appendExtraBloc(bloc, root){
    if (!bloc || !Array.isArray(bloc.sections) || !bloc.sections.length) return;
    if (root.querySelector(".ul-pays-extra")) return;

    const exclude = new Set(TEMPLATE_TARGETS.map(x => x.key));
    const items = bloc.sections
      .filter(s => s && s.key && !exclude.has(s.key) && norm(s.value))
      .map(s => ({ t: s.label || s.key, c: cleanHTML(s.value) }));

    if (!items.length) return;

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
    log("Metier_pays_bloc: appended extra cards", items.length);
  }

  let tries = 0;
  (function boot(){
    tries++;
    const root = document.getElementById("ulydia-metier-root");
    if (root && root.children.length > 0) {
      injectCSS();
      cleanRootHTML(root);

      const bloc = findBlocForCtx();
      if (bloc) {
        const n = applyToTemplate(bloc, root);
        log("Metier_pays_bloc: applied to template", n);
        appendExtraBloc(bloc, root);
      } else {
        log("Metier_pays_bloc: none matched");
      }

      renderFAQs(root);
      cleanRootHTML(root);
      return;
    }
    if (tries > 80) { log("boot: gave up"); return; }
    setTimeout(boot, 100);
  })();
})();