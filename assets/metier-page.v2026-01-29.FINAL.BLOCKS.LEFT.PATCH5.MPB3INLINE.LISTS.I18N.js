/* metier-page — BLOCKS.LEFT.PATCH5 (FINAL)
   Based on PATCH4.MPB3INLINE:
   - Adds structured rendering for the 3 MPB blocks with:
       • subtitle per section (translatable)
       • items split by comma/newline and rendered with "→" arrows
   - Subtitles auto-update on language change (best-effort):
       • listens to ULYDIA bus events if available
       • falls back to a lightweight lang watcher (checks every 700ms)

   Visibility:
   - Each MPB card is shown ONLY if at least one of its sections has non-empty items.

   Replaces:
   - DOM-based MPB 3blocks scripts
   - separate MPB THREEBLOCKS scripts

   2026-01-29
*/

(() => {
  if (window.__ULYDIA_BLOCKS_LEFT_PATCH5__) return;
  window.__ULYDIA_BLOCKS_LEFT_PATCH5__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.left.patch5]", ...a);

  // -------------------------
  // Rich / sanitize helpers
  // -------------------------
  function stripHTML(html){
    return String(html || "")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n")
      .replace(/<\/li>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  function isEmptyText(s){
    return !String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function isEmptyRich(html){
    const stripped = stripHTML(html).replace(/[ \t\r\n]+/g, " ").trim();
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

  // -------------------------
  // DOM helpers used by existing PATCH3 layout
  // -------------------------
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

  // -------------------------
  // MPB 3 blocks rendering (structured)
  // -------------------------
  function ensureMPB3Style(){
    if (document.getElementById("ulydia-mpb3-style-p5")) return;
    const st = document.createElement("style");
    st.id = "ulydia-mpb3-style-p5";
    st.textContent = `
/* ULYDIA MPB3 cards (PATCH5) */
.ulydia-mpb3-card{border-radius:22px; overflow:hidden; background:#fff; border:1px solid rgba(0,0,0,.06); box-shadow:0 10px 28px rgba(0,0,0,.06);}
.ulydia-mpb3-head{display:flex; align-items:center; gap:10px; padding:16px 18px; font-weight:800; font-size:18px; letter-spacing:-.2px;}
.ulydia-mpb3-emoji{font-size:18px; line-height:1}
.ulydia-mpb3-body{padding:18px 18px 20px; font-size:14px; line-height:1.55; color:#111;}
.ulydia-mpb3-sub{margin:14px 0 8px; font-size:15px; font-weight:800;}
.ulydia-mpb3-list{margin:6px 0 8px 0; padding:0; list-style:none; display:grid; gap:6px;}
.ulydia-mpb3-item{display:flex; gap:10px; align-items:flex-start;}
.ulydia-mpb3-arrow{font-weight:800; line-height:1.2; transform:translateY(1px);}
.ulydia-mpb3-text{flex:1;}
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

  // Language detection (best effort)
  function getLang(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    const l1 = ctx && (ctx.lang || ctx.language);
    const l2 = window.__ULYDIA_LANG__;
    const l3 = document.documentElement.getAttribute("lang");
    return String(l1 || l2 || l3 || "fr").toLowerCase();
  }

  // i18n for subtitles (FR/EN/DE/ES/IT)
  const I18N = {
    fr: {
      edu_local: "Niveau requis (local)",
      edu_required: "Niveau requis",
      edu_degrees: "Diplômes (exemples)",
      first_jobs: "Premiers postes",
      first_employers: "Employeurs types",
      first_sectors: "Secteurs qui recrutent",
      access_routes: "Voies d’accès",
      access_equiv: "Équivalences / reconversion",
      card_edu: "Niveau d’études & diplômes",
      card_first: "Débouchés & premiers postes",
      card_access: "Accès au métier & reconversion"
    },
    en: {
      edu_local: "Required level (local)",
      edu_required: "Required level",
      edu_degrees: "Degrees (examples)",
      first_jobs: "First roles",
      first_employers: "Typical employers",
      first_sectors: "Hiring sectors",
      access_routes: "Entry routes",
      access_equiv: "Equivalences / career change",
      card_edu: "Education level & degrees",
      card_first: "Outcomes & first roles",
      card_access: "Access to the role & career change"
    },
    de: {
      edu_local: "Erforderliches Niveau (lokal)",
      edu_required: "Erforderliches Niveau",
      edu_degrees: "Abschlüsse (Beispiele)",
      first_jobs: "Erste Positionen",
      first_employers: "Typische Arbeitgeber",
      first_sectors: "Sektoren mit Bedarf",
      access_routes: "Einstiegswege",
      access_equiv: "Äquivalenzen / Quereinstieg",
      card_edu: "Bildungsniveau & Abschlüsse",
      card_first: "Perspektiven & erste Positionen",
      card_access: "Zugang zum Beruf & Quereinstieg"
    },
    es: {
      edu_local: "Nivel requerido (local)",
      edu_required: "Nivel requerido",
      edu_degrees: "Títulos (ejemplos)",
      first_jobs: "Primeros puestos",
      first_employers: "Empleadores típicos",
      first_sectors: "Sectores que contratan",
      access_routes: "Vías de acceso",
      access_equiv: "Equivalencias / reconversión",
      card_edu: "Nivel de estudios y títulos",
      card_first: "Salidas y primeros puestos",
      card_access: "Acceso al oficio y reconversión"
    },
    it: {
      edu_local: "Livello richiesto (locale)",
      edu_required: "Livello richiesto",
      edu_degrees: "Titoli (esempi)",
      first_jobs: "Prime posizioni",
      first_employers: "Datori di lavoro tipici",
      first_sectors: "Settori che assumono",
      access_routes: "Percorsi di accesso",
      access_equiv: "Equivalenze / riconversione",
      card_edu: "Livello di studi e titoli",
      card_first: "Sbocchi e prime posizioni",
      card_access: "Accesso al mestiere e riconversione"
    }
  };

  function t(key){
    const lang = getLang();
    const base = I18N[lang] || I18N.fr;
    return base[key] || (I18N.fr[key] || key);
  }

  function splitItems(input){
    const raw = stripHTML(input);
    if (isEmptyText(raw)) return [];
    // split by comma or newline or semicolon; keep simple
    return raw
      .split(/[,;\n]+/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function createList(items){
    const ul = document.createElement("ul");
    ul.className = "ulydia-mpb3-list";
    for (const it of items){
      const li = document.createElement("li");
      li.className = "ulydia-mpb3-item";
      const a = document.createElement("span");
      a.className = "ulydia-mpb3-arrow";
      a.textContent = "→";
      const tx = document.createElement("span");
      tx.className = "ulydia-mpb3-text";
      tx.textContent = it;
      li.appendChild(a);
      li.appendChild(tx);
      ul.appendChild(li);
    }
    return ul;
  }

  function createSection(subKey, items){
    const wrap = document.createElement("div");
    wrap.className = "ulydia-mpb3-section";
    if (items.length){
      const h = document.createElement("div");
      h.className = "ulydia-mpb3-sub";
      h.setAttribute("data-ulydia-i18n", subKey);
      h.textContent = t(subKey);
      wrap.appendChild(h);
      wrap.appendChild(createList(items));
    }
    return wrap;
  }

  function createMPB3Card(kind, cardKey, emoji, sections){
    const card = document.createElement("section");
    card.className = "ulydia-mpb3-card";
    card.setAttribute("data-ulydia-mpb3", kind);

    const head = document.createElement("div");
    head.className = "ulydia-mpb3-head " + (kind === "edu" ? "ulydia-mpb3-edu" : kind === "first" ? "ulydia-mpb3-first" : "ulydia-mpb3-access");

    const em = document.createElement("span");
    em.className = "ulydia-mpb3-emoji";
    em.textContent = emoji;

    const tt = document.createElement("div");
    tt.setAttribute("data-ulydia-i18n", cardKey);
    tt.textContent = t(cardKey);

    head.appendChild(em);
    head.appendChild(tt);

    const body = document.createElement("div");
    body.className = "ulydia-mpb3-body";

    for (const s of sections){
      if (!s || !s.items || !s.items.length) continue;
      body.appendChild(createSection(s.subKey, s.items));
    }

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  function updateI18NInside(node){
    if (!node) return;
    const lang = getLang();
    const base = I18N[lang] || I18N.fr;
    node.querySelectorAll("[data-ulydia-i18n]").forEach(el => {
      const k = el.getAttribute("data-ulydia-i18n");
      if (!k) return;
      el.textContent = base[k] || (I18N.fr[k] || el.textContent);
    });
  }

  function renderMPB3(byKey, f){
    // Remove previous wrap if exists (to re-render on language change)
    const prev = document.querySelector("[data-ulydia-mpb3-wrap='1']");
    if (prev) prev.remove();

    // Read fields
    const eduLocal = pickField(f, "education_level_local") || byKey["education_level_local"] || "";
    const eduReq   = pickField(f, "education_level")       || byKey["education_level"]       || "";
    const eduDeg   = pickField(f, "degrees_examples")      || byKey["degrees_examples"]      || "";

    const firstJobs = pickField(f, "first_job_titles")   || byKey["first_job_titles"]   || "";
    const firstEmp  = pickField(f, "typical_employers")  || byKey["typical_employers"]  || "";
    const firstSec  = pickField(f, "hiring_sectors")     || byKey["hiring_sectors"]     || "";

    const accessRoutes = pickField(f, "entry_routes")               || byKey["entry_routes"]               || "";
    const accessEquiv  = pickField(f, "equivalences_reconversion")  || byKey["equivalences_reconversion"]  || "";

    const eduSections = [
      { subKey: "edu_local",    items: splitItems(eduLocal) },
      { subKey: "edu_required", items: splitItems(eduReq) },
      { subKey: "edu_degrees",  items: splitItems(eduDeg) }
    ];

    const firstSections = [
      { subKey: "first_jobs",      items: splitItems(firstJobs) },
      { subKey: "first_employers", items: splitItems(firstEmp) },
      { subKey: "first_sectors",   items: splitItems(firstSec) }
    ];

    const accessSections = [
      { subKey: "access_routes", items: splitItems(accessRoutes) },
      { subKey: "access_equiv",  items: splitItems(accessEquiv) }
    ];

    const hasEdu = eduSections.some(s => s.items.length);
    const hasFirst = firstSections.some(s => s.items.length);
    const hasAccess = accessSections.some(s => s.items.length);

    if (!hasEdu && !hasFirst && !hasAccess){
      log("MPB3: no data -> do not render");
      return;
    }

    ensureMPB3Style();

    // Anchors: between Competences and Environnements
    const afterComp = findCardByTitleContains(["compétences","clés"]) || findCardByTitleContains(["competences","cles"]);
    const beforeEnv = findCardByTitleContains(["environnements","travail"]) || findCardByTitleContains(["environnement","travail"]);

    const root = document.getElementById("ulydia-metier-root") || document.body;
    const parent = (afterComp && afterComp.parentNode) ? afterComp.parentNode : root;

    const wrap = document.createElement("div");
    wrap.className = "ulydia-mpb3-stack";
    wrap.setAttribute("data-ulydia-mpb3-wrap", "1");

    if (hasEdu) wrap.appendChild(createMPB3Card("edu", "card_edu", "🎓", eduSections));
    if (hasFirst) wrap.appendChild(createMPB3Card("first", "card_first", "⏱️", firstSections));
    if (hasAccess) wrap.appendChild(createMPB3Card("access", "card_access", "🪵", accessSections));

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

    updateI18NInside(wrap);
    log("MPB3 rendered (structured)");
  }

  // -------------------------
  // Main run
  // -------------------------
  let lastLang = null;

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

    renderMPB3(byKey, f);

    lastLang = getLang();
    log("applied", { formation: ok1, acces: ok2, marche: ok3, salaire: ok4, mpb3: true, lang: lastLang });
  }

  function bindLangUpdates(){
    // Use bus if available
    const bus = window.__ULYDIA_METIER_BUS__;
    if (bus?.on) {
      bus.on("ULYDIA:LANG_CHANGED", () => {
        const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
        if (ctx) run(ctx);
      });
      bus.on("ULYDIA:I18N_APPLIED", () => {
        const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
        if (ctx) run(ctx);
      });
    }

    // Lightweight watcher (no DOM observers)
    setInterval(() => {
      const lang = getLang();
      if (lang && lang !== lastLang) {
        const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
        if (ctx) run(ctx);
      }
    }, 700);
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) {
      run(ctx);
      bindLangUpdates();
      return;
    }

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", (c) => {
        run(c);
        bindLangUpdates();
      });
      return;
    }

    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ctx2 = window.__ULYDIA_METIER_PAGE_CTX__;
      if (window.__ULYDIA_METIER_PAGE_READY__ && ctx2) {
        clearInterval(t);
        run(ctx2);
        bindLangUpdates();
      }
      if (tries > 200) clearInterval(t);
    }, 50);
  }

  onReady();
})();
