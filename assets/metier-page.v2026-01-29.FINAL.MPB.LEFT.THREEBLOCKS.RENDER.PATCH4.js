/*!
ULYDIA — MPB LEFT — 3 IMPORTANT BLOCKS RENDER — PATCH4 — 2026-01-29
Fix: Some pages show base content but miss these left blocks:
- "Niveau d’études & diplômes"
- "Débouchés & premiers postes"
- "Accès au métier & reconversion"

This patch:
- waits for metier-page data to be available
- finds these blocks in Metier_Pays_Blocs payload (by title keywords)
- renders them as 3 Ulydia-style cards in LEFT column
- safe: no duplicates, no crash if data absent
*/

(function(){
  "use strict";

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, arguments); }
  function warn(){ if(console && console.warn) console.warn.apply(console, arguments); }

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  function norm(s){
    return String(s||"")
      .replace(/\u2019/g,"'")                 // curly apostrophe
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();
  }

  function pick(obj, keys){
    for (var i=0;i<keys.length;i++){
      var k = keys[i];
      if (!k) continue;
      var v = obj && obj[k];
      if (v !== undefined && v !== null) return v;
    }
    return null;
  }

  function ensureStyles(){
    if (document.getElementById("ulydia-mpb3-style")) return;
    var css = `
/* ===== ULYDIA MPB 3 blocks PATCH4 ===== */
.ulydia-mpb3-card{border-radius:22px; overflow:hidden; background:#fff; border:1px solid rgba(0,0,0,.06); box-shadow:0 10px 28px rgba(0,0,0,.06); margin:18px 0;}
.ulydia-mpb3-head{display:flex; align-items:center; gap:10px; padding:16px 18px; font-weight:800; font-size:18px; letter-spacing:-.2px;}
.ulydia-mpb3-emoji{font-size:18px; line-height:1}
.ulydia-mpb3-body{padding:18px 18px 20px; font-size:14px; line-height:1.6; color:#111;}
.ulydia-mpb3-body h1,.ulydia-mpb3-body h2,.ulydia-mpb3-body h3{margin:14px 0 8px; font-size:15px; font-weight:800;}
.ulydia-mpb3-body p{margin:8px 0;}
.ulydia-mpb3-body ul{margin:8px 0 8px 18px; padding:0;}
.ulydia-mpb3-body li{margin:6px 0;}
.ulydia-mpb3-body li::marker{font-size:12px;}
.ulydia-mpb3-body a{color:inherit; text-decoration:underline;}
/* header gradients */
.ulydia-mpb3-edu{background:linear-gradient(90deg, rgba(145,93,255,.35), rgba(220,205,255,.55));}
.ulydia-mpb3-first{background:linear-gradient(90deg, rgba(80,210,255,.30), rgba(200,245,255,.65));}
.ulydia-mpb3-access{background:linear-gradient(90deg, rgba(80,240,180,.28), rgba(210,255,235,.70));}
`;
    var st = document.createElement("style");
    st.id = "ulydia-mpb3-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function findLeftColumn(){
    // try a bunch of known/likely containers
    var selectors = [
      "#ulydia-left",
      "#ulydia-col-left",
      ".ulydia-left",
      ".ulydia-col-left",
      "[data-ulydia-column='left']",
      "[data-ulydia-col='left']",
      "[data-col='left']",
      ".metier-left",
      ".metier-col-left",
      "#metier-left"
    ];
    for (var i=0;i<selectors.length;i++){
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    // fallback: find the column that contains "Missions principales" card
    var all = document.querySelectorAll("main, #ulydia-metier-root, body");
    for (var j=0;j<all.length;j++){
      var root = all[j];
      if (!root) continue;
      var h = root.querySelector("h2,h3");
      // too weak, skip
    }
    // last resort: mount inside #ulydia-metier-root
    return document.getElementById("ulydia-metier-root") || document.body;
  }

  function createCard(kind, title, emoji, html){
    ensureStyles();

    var card = document.createElement("section");
    card.className = "ulydia-mpb3-card";
    card.setAttribute("data-ulydia-mpb3", kind);

    var head = document.createElement("div");
    head.className = "ulydia-mpb3-head " + (kind === "edu" ? "ulydia-mpb3-edu" : kind === "first" ? "ulydia-mpb3-first" : "ulydia-mpb3-access");

    var em = document.createElement("span");
    em.className = "ulydia-mpb3-emoji";
    em.textContent = emoji;

    var tt = document.createElement("div");
    tt.textContent = title;

    head.appendChild(em);
    head.appendChild(tt);

    var body = document.createElement("div");
    body.className = "ulydia-mpb3-body";
    body.innerHTML = String(html || "");

    card.appendChild(head);
    card.appendChild(body);

    return card;
  }

  // ---------------------------------------------------------
  // Get data (robust heuristics)
  // ---------------------------------------------------------
  function getMetierPageData(){
    // known globals seen in previous patches / builds
    var candidates = [
      window.__ULYDIA_METIER_PAGE__,
      window.__ULYDIA_METIER_PAGE_DATA__,
      window.__ULYDIA_PAGE_DATA__,
      window.__ULYDIA_DATA__,
      window.__METIER_PAGE__,
      window.__ULYDIA_STATE__
    ];
    for (var i=0;i<candidates.length;i++){
      var c = candidates[i];
      if (c && typeof c === "object") return c;
    }
    // sometimes base stores under window.ULYDIA_METIER_PAGE (no __)
    if (window.ULYDIA_METIER_PAGE && typeof window.ULYDIA_METIER_PAGE === "object") return window.ULYDIA_METIER_PAGE;
    return null;
  }

  function getBlocks(data){
    if (!data) return [];
    var blocks =
      pick(data, ["blocks", "blocs", "mpb", "mpbBlocks", "metier_pays_blocs", "metierPaysBlocs"]) ||
      window.__ULYDIA_METIER_PAYS_BLOCS__ ||
      window.__ULYDIA_METIER_PAYS_BLOC__ ||
      [];
    if (!Array.isArray(blocks)) {
      // sometimes an object with items
      if (blocks && Array.isArray(blocks.items)) blocks = blocks.items;
      else blocks = [];
    }
    return blocks;
  }

  function toBlock(raw){
    if (!raw || typeof raw !== "object") return null;
    var title = pick(raw, ["title","titre","name","nom","bloc_title","block_title","js-bloc-title"]);
    var body  = pick(raw, ["body","contenu","html","rich_text","bloc_body","block_body","js-bloc-body"]);
    var order = pick(raw, ["order","ordre","rank","position","sort"]);
    return { title: title || "", body: body || "", order: (order==null? null : Number(order)) };
  }

  // ---------------------------------------------------------
  // Main render
  // ---------------------------------------------------------
  function render(){
    // avoid duplicates
    if (document.querySelector("[data-ulydia-mpb3='edu']") ||
        document.querySelector("[data-ulydia-mpb3='first']") ||
        document.querySelector("[data-ulydia-mpb3='access']")) {
      log("[MPB3] already rendered");
      return true;
    }

    var data = getMetierPageData();
    var blocksRaw = getBlocks(data);
    var blocks = [];
    for (var i=0;i<blocksRaw.length;i++){
      var b = toBlock(blocksRaw[i]);
      if (b && (b.title || b.body)) blocks.push(b);
    }

    if (!blocks.length){
      log("[MPB3] no blocks available yet");
      return false;
    }

    // Find blocks by title keywords (FR first, but tolerant)
    function findByKeywords(words){
      var best = null;
      for (var i=0;i<blocks.length;i++){
        var t = norm(blocks[i].title);
        var ok = true;
        for (var j=0;j<words.length;j++){
          if (t.indexOf(words[j]) === -1){ ok = false; break; }
        }
        if (ok){ best = blocks[i]; break; }
      }
      return best;
    }

    var bEdu = findByKeywords(["niveau"]) || findByKeywords(["diplom"]) || findByKeywords(["etude"]);
    // more strict: try full title match first
    var strictEdu = findByKeywords(["niveau", "diplom"]);
    if (strictEdu) bEdu = strictEdu;

    var bFirst = findByKeywords(["débouch"]) || findByKeywords(["debouch"]) || findByKeywords(["premier", "poste"]);
    var strictFirst = findByKeywords(["premier","poste"]);
    if (strictFirst) bFirst = strictFirst;

    var bAccess = findByKeywords(["accès"]) || findByKeywords(["acces"]) || findByKeywords(["reconvers"]);
    var strictAccess = findByKeywords(["acc","reconvers"]);
    if (strictAccess) bAccess = strictAccess;

    // If those aren't in MPB, don't guess content (avoid wrong data)
    // We'll only render when we have body HTML.
    var toRender = [];
    if (bEdu && bEdu.body) toRender.push({kind:"edu", title:"Niveau d’études & diplômes", emoji:"🎓", html:bEdu.body});
    if (bFirst && bFirst.body) toRender.push({kind:"first", title:"Débouchés & premiers postes", emoji:"⏱️", html:bFirst.body});
    if (bAccess && bAccess.body) toRender.push({kind:"access", title:"Accès au métier & reconversion", emoji:"🪵", html:bAccess.body});

    if (!toRender.length){
      warn("[MPB3] blocks found but empty body, or titles not present in MPB payload");
      return true; // stop polling to avoid loops
    }

    var left = findLeftColumn();

    // Insert AFTER "Missions principales" if present, else append at end
    var anchor = null;
    try{
      var cards = left.querySelectorAll("section, .card, .ulydia-card, .ul-card, article, div");
      for (var k=0;k<cards.length;k++){
        var el = cards[k];
        if (!el) continue;
        var h = el.querySelector("h2,h3");
        var ht = norm(h ? h.textContent : "");
        if (ht.indexOf("missions") !== -1 && ht.indexOf("princip") !== -1){
          anchor = el;
          break;
        }
      }
    }catch(e){}

    var frag = document.createDocumentFragment();
    for (var r=0;r<toRender.length;r++){
      frag.appendChild(createCard(toRender[r].kind, toRender[r].title, toRender[r].emoji, toRender[r].html));
    }

    if (anchor && anchor.parentNode){
      // insert right after anchor
      if (anchor.nextSibling) anchor.parentNode.insertBefore(frag, anchor.nextSibling);
      else anchor.parentNode.appendChild(frag);
    } else {
      left.appendChild(frag);
    }

    log("[MPB3] rendered", toRender.map(function(x){return x.kind;}));
    return true;
  }

  // Poll a bit (base loads async)
  var tries = 0;
  var maxTries = 80; // ~8s
  var t = setInterval(function(){
    tries++;
    var done = false;
    try{ done = render(); }catch(e){ warn("[MPB3] render error", e); done = true; }
    if (done || tries >= maxTries){
      clearInterval(t);
    }
  }, 100);

})();
