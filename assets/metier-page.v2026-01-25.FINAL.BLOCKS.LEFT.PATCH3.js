/* metier-page — BLOCKS.LEFT.PATCH3 (FIX)
   Injects Metier_Pays_Blocs rich sections into LEFT cards (CONTENT, not titles):
   - formation_bloc -> card containing #formation-title -> .rich-content
   - acces_bloc     -> card containing #acces-title     -> .rich-content
   - marche_bloc    -> card containing #marche-title    -> .rich-content
   - salaire_bloc   -> card containing #salaire-title   -> .rich-content
   Safe: hides the card if the field is empty; clears placeholder content.
*/
(() => {
  if (window.__ULYDIA_BLOCKS_LEFT_PATCH3__) return;
  window.__ULYDIA_BLOCKS_LEFT_PATCH3__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[blocks.left.patch2]", ...a);

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
      // fallback: don't overwrite the title; just hide/show card
      if (isEmptyRich(html)) { hideCard(card); return false; }
      showCard(card);
      return false;
    }

    if (isEmptyRich(html)) {
      // Clear placeholder and hide
      try { box.innerHTML = ""; } catch(_){}
      hideCard(card);
      return false;
    }

    box.innerHTML = sanitizeHTML(html);
    showCard(card);
    return true;
  }

  // New: inject directly into a known container id (preferred in current Webflow design)
  // e.g. #js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire
  function setRichByContainerId(containerId, html){
    const box = document.getElementById(containerId);
    if (!box) return null; // not present in this template
    const card = box.closest(".card") || box.closest("section") || box.parentElement;
    const safe = String(html || "").trim();
    if (!safe) {
      if (card) hideCard(card);
      box.innerHTML = "";
      return false;
    }
    // Ensure visible
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

  
  function run(ctx){
    const blocRaw = ctx?.bloc || window.__ULYDIA_BLOC_RAW__ || null;
    const blocFields = ctx?.blocFields || window.__ULYDIA_BLOC__ || null;
    const nb = normalizeBlocFields(blocRaw, blocFields);
    if (!nb) return;

    const f = nb.fields;
    const byKey = nb.byKey || {};

    // Prefer the current design containers (ids), fallback to legacy title-based lookup.
    const formationHTML = pickField(f, "formation_bloc") || byKey["formation_bloc"] || byKey["formation"] || "";
    const accesHTML     = pickField(f, "acces_bloc")     || byKey["acces_bloc"]     || byKey["acces"]     || "";
    const marcheHTML    = pickField(f, "marche_bloc")    || byKey["marche_bloc"]    || byKey["marche"]    || "";
    const salaireHTML   = pickField(f, "salaire_bloc")   || byKey["salaire_bloc"]   || byKey["salaire"]   || "";

    const ok1a = setRichByContainerId("js-bf-formation", formationHTML);
    const ok2a = setRichByContainerId("js-bf-acces",     accesHTML);
    const ok3a = setRichByContainerId("js-bf-marche",    marcheHTML);
    const ok4a = setRichByContainerId("js-bf-salaire",   salaireHTML);

    // If container ids aren't present, fallback to the legacy cards (by title id)
    const ok1 = (ok1a === null) ? setRichByTitleId("formation-title", formationHTML) : ok1a;
    const ok2 = (ok2a === null) ? setRichByTitleId("acces-title",     accesHTML)     : ok2a;
    const ok3 = (ok3a === null) ? setRichByTitleId("marche-title",    marcheHTML)    : ok3a;
    const ok4 = (ok4a === null) ? setRichByTitleId("salaire-title",   salaireHTML)   : ok4a;

    log("applied", { formation: ok1, acces: ok2, marche: ok3, salaire: ok4 });
  }

  function onReady(){
    const ctx = window.__ULYDIA_METIER_PAGE_CTX__;
    if (window.__ULYDIA_METIER_PAGE_READY__ && ctx) return run(ctx);

    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", run);
      return;
    }

    // fallback: bounded poll
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