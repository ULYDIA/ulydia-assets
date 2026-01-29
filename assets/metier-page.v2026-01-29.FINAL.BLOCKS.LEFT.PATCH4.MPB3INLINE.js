/* metier-page — BLOCKS.LEFT.PATCH4 (FINAL)
   Extends PATCH3 by integrating the 3 MPB blocks (education / first jobs / access)
   and placing them BETWEEN:
     - "Compétences clés"
     - "Environnements de travail"

   Data source: ctx.blocFields (Metier_Pays_Blocs) + ctx.blocFields.sections (byKey)
   Visibility: each MPB card is shown ONLY if its merged rich content is non-empty.

   IMPORTANT:
   - This patch REPLACES the need for:
       metier-page.*.MPB.LEFT.THREEBLOCKS.DOM.*  (DOM-based injection)
       metier-page.*.MPB.THREEBLOCKS.LEFT.*      (separate MPB render)
     Keep only ONE MPB renderer to avoid bottom-of-page placement.

   Safe:
   - No observers; bounded poll via existing ready bus/poll
   - No duplicates
*/

(() => {
  if (window.__ULYDIA_BLOCKS_LEFT_PATCH4__) return;
  window.__ULYDIA_BLOCKS_LEFT_PATCH4__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.left.patch4]", ...a);

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
    // remove inline on* handlers
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  function getCardByTitleId(id){
    const title = document.getElementById(id);
    if (!title) return null;
    return title.closest(".card") || title.closest("section") || title.parentElement || null;
  }

  function getRichContentContainer(card){
    if (!card) return null;
    return card.querySelector(".rich-content") || card.querySelector("[data-ul-rich]") || card.querySelector(".card-content") || null;
  }

  function showCard(card){
    if (!card) return;
    card.style.display = "";
    card.hidden = false;
    card.classList.remove("hidden");
  }

  function hideCard(card){
    if (!card) return;
    card.style.display = "none";
    card.hidden = true;
  }

  function setRichByTitleId(titleId, html){
    const card = getCardByTitleId(titleId);
    if (!card) return false;

    const box = getRichContentContainer(card);
    if (!box) {
      if (isEmptyRich(html)) { hideCard(card); return false; }
      showCard(card);
      return false;
    }

    if (isEmptyRich(html)) {
      try { box.innerHTML = ""; } catch(_){}
      hideCard(card);
      return false;
    }

    box.innerHTML = sanitizeHTML(html);
    showCard(card);
    return true;
  }

  // Preferred in current Webflow design: containers by id
  // e.g. #js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire
  function setRichByContainerId(containerId, html){
    const box = document.getElementById(containerId);
    if (!box) return null; // not present in this template
    const card = box.closest(".card") || box.closest("section") || box.parentElement;
    const safe = String(html || "").trim();

    if (isEmptyRich(safe)) {
      if (card) hideCard(card);
      box.innerHTML = "";
      return false;
    }

    if (card) showCard(card);
    box.innerHTML = sanitizeHTML(safe);
    return true;
  }

  function pickField(blocFields, key){
    if (!blocFields) return "";
    return (
      blocFields[key] ??
      blocFields[key.toLowerCase()] ??
      blocFields[key.toUpperCase()] ??
      ""
    );
  }

  function normalizeBlocFields(blocRaw, blocFields){
    const b = blocFields || null;
    if (!b) return null;

    const byKey = {};
    if (Array.isArray(b.sections)) {
      for (const s of b.sections) {
        if (!s || !s.key) continue;
        byKey[String(s.key)] = s.value;
      }
    }
    return { raw: blocRaw || null, fields: b, byKey };
  }

  // ---------------------------------------------------------
  // MPB 3 blocks (education / first jobs / access) render
  // ---------------------------------------------------------
  function ensureMPB3Style(){
    if (document.getElementById("ulydia-mpb3-style-p4")) return;
    const st = document.createElement("style");
    st.id = "ulydia-mpb3-style-p4";
    st.textContent = `
/* ULYDIA MPB3 cards (PATCH4) */
.ulydia-mpb3-card{border-radius:22px; overflow:hidden; background:#fff; border:1px solid rgba(0,0,0,.06); box-shadow:0 10px 28px rgba(0,0,0,.06);}
.ulydia-mpb3-head{display:flex; align-items:center; gap:10px; padding:16px 18px; font-weight:800; font-size:18px; letter-spacing:-.2px;}
.ulydia-mpb3-emoji{font-size:18px; line-height:1}
.ulydia-mpb3-body{padding:18px 18px 20px; font-size:14px; line-height:1.6; color:#111;}
.ulydia-mpb3-body h1,.ulydia-mpb3-body h2,.ulydia-mpb3-body h3{margin:14px 0 8px; font-size:15px; font-weight:800;}
.ulydia-mpb3-body p{margin:8px 0;}
.ulydia-mpb3-body ul{margin:8px 0 8px 18px; padding:0;}
.ulydia-mpb3-body li{margin:6px 0;}
.ulydia-mpb3-body a{color:inherit; text-decoration:underline;}
.ulydia-mpb3-edu{background:linear-gradient(90deg, rgba(145,93,255,.35), rgba(220,205,255,.55));}
.ulydia-mpb3-first{background:linear-gradient(90deg, rgba(80,210,255,.30), rgba(200,245,255,.65));}
.ulydia-mpb3-access{background:linear-gradient(90deg, rgba(80,240,180,.28), rgba(210,255,235,.70));}
.ulydia-mpb3-stack{display:grid; gap:14px; margin:14px 0;}
`.trim();
    document.head.appendChild(st);
  }

  function normTxt(s){
    return String(s||"")
      .replace(/\u2019/g,"'")
      .replace(/\u00a0/g," ")
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();
  }

  function findCardByTitleContains(words){
    // Find a visible card/section that contains an h2/h3 matching words
    const heads = document.querySelectorAll("h1,h2,h3,h4");
    for (const h of heads){
      const t = normTxt(h.textContent);
      if (!t) continue;
      let ok = true;
      for (const w of words){
        if (t.indexOf(w) === -1) { ok = false; break; }
      }
      if (!ok) continue;
      const card = h.closest(".card") || h.closest("section") || h.closest("article") || h.parentElement;
      if (card) return card;
    }
    return null;
  }

  function createMPB3Card(kind, title, emoji, html){
    const card = document.createElement("section");
    card.className = "ulydia-mpb3-card";
    card.setAttribute("data-ulydia-mpb3", kind);

    const head = document.createElement("div");
    head.className = "ulydia-mpb3-head " + (kind === "edu" ? "ulydia-mpb3-edu" : kind === "first" ? "ulydia-mpb3-first" : "ulydia-mpb3-access");

    const em = document.createElement("span");
    em.className = "ulydia-mpb3-emoji";
    em.textContent = emoji;

    const tt = document.createElement("div");
    tt.textContent = title;

    head.appendChild(em);
    head.appendChild(tt);

    const body = document.createElement("div");
    body.className = "ulydia-mpb3-body";
    body.innerHTML = sanitizeHTML(html);

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  function mergeFields(byKey, f, keys){
    const parts = [];
    for (const k of keys){
      const html = pickField(f, k) || byKey[k] || "";
      if (!isEmptyRich(html)) parts.push(html);
    }
    const merged = parts
      .map(h => `<div class="ulydia-mpb3-part" data-key="${String(keys).replace(/"/g,"&quot;")}">${sanitizeHTML(h)}</div>`)
      .join("");
    return merged;
  }

  function renderMPB3(byKey, f){
    // Avoid duplicates
    if (document.querySelector("[data-ulydia-mpb3='edu']") ||
        document.querySelector("[data-ulydia-mpb3='first']") ||
        document.querySelector("[data-ulydia-mpb3='access']")) {
      return;
    }

    // Build content from MPB fields
    const eduHTML = mergeFields(byKey, f, ["education_level_local","education_level","degrees_examples"]);
    const firstHTML = mergeFields(byKey, f, ["first_job_titles","typical_employers","hiring_sectors"]);
    const accessHTML = mergeFields(byKey, f, ["entry_routes","equivalences_reconversion"]);

    const hasAny = !isEmptyRich(eduHTML) || !isEmptyRich(firstHTML) || !isEmptyRich(accessHTML);
    if (!hasAny) {
      log("MPB3: no data -> do not render");
      return;
    }

    ensureMPB3Style();

    // Anchor placement: BETWEEN Competences and Environnements
    const afterComp = findCardByTitleContains(["compétences","clés"]) || findCardByTitleContains(["competences","cles"]);
    const beforeEnv = findCardByTitleContains(["environnements","travail"]) || findCardByTitleContains(["environnement","travail"]);

    // Fallback parent
    const root = document.getElementById("ulydia-metier-root") || document.body;

    let parent = (afterComp && afterComp.parentNode) ? afterComp.parentNode : root;

    const wrap = document.createElement("div");
    wrap.className = "ulydia-mpb3-stack";
    wrap.setAttribute("data-ulydia-mpb3-wrap", "1");

    if (!isEmptyRich(eduHTML)) wrap.appendChild(createMPB3Card("edu", "Niveau d’études & diplômes", "🎓", eduHTML));
    if (!isEmptyRich(firstHTML)) wrap.appendChild(createMPB3Card("first", "Débouchés & premiers postes", "⏱️", firstHTML));
    if (!isEmptyRich(accessHTML)) wrap.appendChild(createMPB3Card("access", "Accès au métier & reconversion", "🪵", accessHTML));

    // Insert
    try{
      if (beforeEnv && beforeEnv.parentNode === parent){
        parent.insertBefore(wrap, beforeEnv);
      } else if (afterComp && afterComp.parentNode){
        if (afterComp.nextSibling) afterComp.parentNode.insertBefore(wrap, afterComp.nextSibling);
        else afterComp.parentNode.appendChild(wrap);
      } else {
        parent.appendChild(wrap);
      }
    }catch(e){
      parent.appendChild(wrap);
    }

    log("MPB3 rendered");
  }

  // ---------------------------------------------------------
  // Main run
  // ---------------------------------------------------------
  function run(ctx){
    const blocRaw = ctx?.bloc || window.__ULYDIA_BLOC_RAW__ || null;
    const blocFields = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    const nb = normalizeBlocFields(blocRaw, blocFields);
    if (!nb) return;

    const f = nb.fields;
    const byKey = nb.byKey || {};

    // Existing LEFT cards (formation/acces/marche/salaire)
    const formationHTML = pickField(f, "formation_bloc") || byKey["formation_bloc"] || byKey["formation"] || "";
    const accesHTML     = pickField(f, "acces_bloc")     || byKey["acces_bloc"]     || byKey["acces"]     || "";
    const marcheHTML    = pickField(f, "marche_bloc")    || byKey["marche_bloc"]    || byKey["marche"]    || "";
    const salaireHTML   = pickField(f, "salaire_bloc")   || byKey["salaire_bloc"]   || byKey["salaire"]   || "";

    const ok1a = setRichByContainerId("js-bf-formation", formationHTML);
    const ok2a = setRichByContainerId("js-bf-acces",     accesHTML);
    const ok3a = setRichByContainerId("js-bf-marche",    marcheHTML);
    const ok4a = setRichByContainerId("js-bf-salaire",   salaireHTML);

    const ok1 = (ok1a === null) ? setRichByTitleId("formation-title", formationHTML) : ok1a;
    const ok2 = (ok2a === null) ? setRichByTitleId("acces-title",     accesHTML)     : ok2a;
    const ok3 = (ok3a === null) ? setRichByTitleId("marche-title",    marcheHTML)    : ok3a;
    const ok4 = (ok4a === null) ? setRichByTitleId("salaire-title",   salaireHTML)   : ok4a;

    // NEW: MPB 3 blocks inserted in the correct place
    renderMPB3(byKey, f);

    log("applied", { formation: ok1, acces: ok2, marche: ok3, salaire: ok4, mpb3: true });
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) { clearInterval(t); run(ctx2); }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();
