/* =========================================================
   ULYDIA — FINAL.LEFT.TWOCARDS.MPB.PATCH1
   PURPOSE
   - Render 2 cards side-by-side in LEFT column using fields from
     Metier_Pays_Blocs (via window.__ULYDIA_BLOC__ / ctx.blocFields).
   - This is NOT demo data: it pulls content from MPB fields.

   Cards:
   1) 🏫 Écoles & Parcours recommandés  (blue header)
   2) 💼 Projets Portfolio essentiels  (green header)

   Data sources (priority):
   - ctx.blocFields
   - window.__ULYDIA_BLOC__   (from your BLOCFLATTEN patch)

   Supported field aliases (you can keep your CMS naming):
   - Schools card:
       ecoles_parcours, ecoles_parcours_recommandes, ecoles_bloc, parcours_bloc,
       schools_bloc, schools, parcours_recommandes, ecoles_et_parcours,
       "Écoles & Parcours recommandés"
   - Portfolio card:
       projets_portfolio, projets_portfolio_essentiels, portfolio_bloc,
       projects_bloc, portfolio, "Projets Portfolio essentiels"

   Also supports "blocks" arrays/items if your flatten creates:
     window.__ULYDIA_BLOC__.blocks = [{title, body, order}, ...]
   where title contains keywords.

   Safety:
   - No MutationObserver
   - Bounded rAF wait (15s)
========================================================= */
(function(){
  "use strict";
  if (window.__ULYDIA_LEFT_TWOCARDS_MPB_PATCH1__) return;
  window.__ULYDIA_LEFT_TWOCARDS_MPB_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a)=>DEBUG && console.log("[left.twocards.mpb.patch1]", ...a);

  function low(s){
    return String(s||"")
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function isEmptyRich(html){
    const s = String(html || "").replace(/\u00a0/g, " ").trim();
    if (!s) return true;
    const stripped = s
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    return !stripped;
  }

  function sanitizeHTML(html){
    let s = String(html || "");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  function _normKey(k){
    return String(k||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"_")
      .replace(/^_+|_+$/g,"");
  }

  function getFromObj(obj, keys){
    if (!obj) return "";
    // exact
    for (const k of keys){
      if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
    }
    // normalized match
    const want = keys.map(_normKey);
    for (const kk in obj){
      const nk = _normKey(kk);
      if (want.includes(nk)) {
        const v = obj[kk];
        if (v != null && String(v).trim() !== "") return v;
      }
    }
    // includes match (for verbose CMS names)
    for (const kk in obj){
      const nk = _normKey(kk);
      for (const w of want){
        if (nk.includes(w)) {
          const v = obj[kk];
          if (v != null && String(v).trim() !== "") return v;
        }
      }
    }
    return "";
  }

  function getFromBlocksArray(b, keywords){
    const arr =
      b?.blocks || b?.bloc_items || b?.items || b?.mpb_items || null;
    if (!Array.isArray(arr) || !arr.length) return "";

    const wants = (keywords||[]).map(low);

    // pick best match: first block whose title contains any keyword
    for (const it of arr){
      const title = low(it?.title || it?.titre || it?.name || "");
      if (!title) continue;
      const ok = wants.some(k => k && title.includes(k));
      if (ok) {
        const body = it?.body || it?.contenu || it?.html || it?.rich || it?.value || "";
        if (body && !isEmptyRich(body)) return body;
      }
    }
    return "";
  }

  function getMPBField(ctx, keys, keywords){
    const b = ctx?.blocFields || window.__ULYDIA_BLOC__ || {};
    let v = getFromObj(b, keys);
    if (v && !isEmptyRich(v)) return v;
    v = getFromBlocksArray(b, keywords);
    if (v && !isEmptyRich(v)) return v;
    return "";
  }

  function findCardByHeaderContains(label){
    const want = low(label);
    const hs = document.querySelectorAll(".card-header .section-title, .section-title");
    for (const h of hs){
      const t = low(h.textContent || "");
      if (t && t.includes(want)){
        return h.closest(".card") || h.closest("section") || h.closest("article") || h.parentElement;
      }
    }
    return null;
  }

  function insertAfter(target, node){
    if (!target || !target.parentElement) return false;
    if (target.nextSibling) target.parentElement.insertBefore(node, target.nextSibling);
    else target.parentElement.appendChild(node);
    return true;
  }

  function ensureStyle(){
    if (document.getElementById("ul-left-twocards-mpb-style")) return;
    const style = document.createElement("style");
    style.id = "ul-left-twocards-mpb-style";
    style.textContent = `
.ul-left-twocards-mpb-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  margin-top: 14px;
}
@media (max-width: 991px){
  .ul-left-twocards-mpb-grid{ grid-template-columns: 1fr; }
}
.ul-left-twocards-mpb-grid .card{ margin: 0 !important; }

/* content inside card body */
.ul-mpb-rich ul{ margin: 8px 0 14px 18px; }
.ul-mpb-rich li{ margin: 6px 0; }
    `.trim();
    document.head.appendChild(style);
  }

  function setTitle(card, title){
    const t = card.querySelector(".card-header .section-title") || card.querySelector(".section-title");
    if (t) t.textContent = title;
  }

  function clearBody(card){
    const body = card.querySelector(".card-body") || card.querySelector(".card-content") || card;
    if (body) body.innerHTML = "";
    return body;
  }

  function tintHeader(card, kind){
    const header = card.querySelector(".card-header") || card;
    if (!header) return;
    if (kind === "blue") header.style.background = "rgba(59,130,246,.18)";
    if (kind === "green") header.style.background = "rgba(16,185,129,.20)";
  }

  function makeCardFromTemplate(template, title, tint, richHtml){
    if (!richHtml || isEmptyRich(richHtml)) return null;
    const card = template.cloneNode(true);
    card.setAttribute("data-ulydia-mpb-twocard", title);
    setTitle(card, title);
    tintHeader(card, tint);
    const body = clearBody(card);
    if (!body) return null;

    body.innerHTML = `<div class="ul-mpb-rich">${sanitizeHTML(richHtml)}</div>`;
    return card;
  }

  function inject(){
    if (document.querySelector("[data-ulydia-left-twocards-mpb='1']")) return true;

    const ctx = window.__ULYDIA_METIER_PAGE_CTX__ || { blocFields: window.__ULYDIA_BLOC__ };

    // Pull MPB content
    const schoolsHtml = getMPBField(ctx,
      [
        "ecoles_parcours","ecoles_parcours_recommandes","ecoles_bloc","parcours_bloc",
        "schools_bloc","schools","parcours_recommandes","ecoles_et_parcours",
        "Écoles & Parcours recommandés","Ecoles & Parcours recommandés","Ecoles et Parcours recommandes"
      ],
      ["ecoles", "parcours", "school", "formation", "bootcamp"]
    );

    const portfolioHtml = getMPBField(ctx,
      [
        "projets_portfolio","projets_portfolio_essentiels","portfolio_bloc","projects_bloc",
        "portfolio","Projets Portfolio essentiels","Projets portfolio essentiels"
      ],
      ["portfolio", "projets", "projects", "crud", "api"]
    );

    // If nothing to show, do nothing (but don't block page)
    if (!schoolsHtml && !portfolioHtml) {
      log("No MPB fields found for schools/portfolio. Check your MPB field keys.");
      return true;
    }

    // Anchor in LEFT column
    const anchor =
      findCardByHeaderContains("Compétences clés") ||
      findCardByHeaderContains("Missions principales") ||
      findCardByHeaderContains("Vue d'ensemble") ||
      findCardByHeaderContains("Vue d’ensemble");

    if (!anchor) return false;

    const template = anchor.closest(".card") || anchor;
    if (!template) return false;

    ensureStyle();

    const grid = document.createElement("div");
    grid.className = "ul-left-twocards-mpb-grid";
    grid.setAttribute("data-ulydia-left-twocards-mpb", "1");

    const c1 = makeCardFromTemplate(template, "🏫 Écoles & Parcours recommandés", "blue", schoolsHtml);
    const c2 = makeCardFromTemplate(template, "💼 Projets Portfolio essentiels", "green", portfolioHtml);

    if (c1) grid.appendChild(c1);
    if (c2) grid.appendChild(c2);

    // If only one exists, keep layout (still fine)
    insertAfter(template, grid);
    return true;
  }

  const t0 = Date.now();
  const MAX = 15000;
  (function loop(){
    if (inject()) return;
    if (Date.now() - t0 > MAX) return;
    requestAnimationFrame(loop);
  })();
})();