/*!
ULYDIA — MPB 3 BLOCKS (EDU / FIRST JOBS / ACCESS) — DOM RENDER — PATCH1 — 2026-01-29
Why:
- Your current stack already renders content cards, but these 3 MPB sections are missing.
- In many setups, the MPB fields exist in the DOM as hidden CMS placeholders (classes like .js-bf-education_level_local, etc.).
- This patch reads those DOM placeholders and creates exactly the 3 cards you showed:
    1) "Niveau d’études & diplômes"
    2) "Débouchés & premiers postes"
    3) "Accès au métier & reconversion"

Safe:
- No observers. Bounded rAF loop.
- No duplicates.
- Does nothing if fields are absent/empty.
*/

(function(){
  "use strict";
  if (window.__ULYDIA_MPB_3BLOCKS_DOM_PATCH1__) return;
  window.__ULYDIA_MPB_3BLOCKS_DOM_PATCH1__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG && console && console.log) console.log.apply(console, ["[mpb.3blocks.dom]"].concat([].slice.call(arguments))); }
  function warn(){ if (console && console.warn) console.warn.apply(console, ["[mpb.3blocks.dom]"].concat([].slice.call(arguments))); }

  function isEmptyHTML(html){
    var s = String(html||"").replace(/\u00a0/g," ").trim();
    if (!s) return true;
    var stripped = s
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    return !stripped;
  }

  function sanitize(html){
    var s = String(html||"");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  function getFieldHTML(className){
    var el = document.querySelector("." + className);
    if (!el) return "";
    var html = (el.innerHTML != null ? String(el.innerHTML) : "").trim();
    if (!html) html = (el.textContent || "").trim();
    return html;
  }

  function mergeFields(keys){
    var parts = [];
    for (var i=0;i<keys.length;i++){
      var h = getFieldHTML(keys[i]);
      if (h && !isEmptyHTML(h)) parts.push('<div class="ul-mpb-part" data-key="'+keys[i]+'">' + sanitize(h) + '</div>');
    }
    return parts.join("");
  }

  function ensureStyle(){
    if (document.getElementById("ul-mpb-3blocks-style1")) return;
    var st = document.createElement("style");
    st.id = "ul-mpb-3blocks-style1";
    st.textContent = `
/* ULYDIA MPB 3 BLOCKS */
.ul-mpb3-card{border-radius:22px; overflow:hidden; background:#fff; border:1px solid rgba(0,0,0,.06); box-shadow:0 10px 28px rgba(0,0,0,.06); margin:18px 0;}
.ul-mpb3-head{display:flex; align-items:center; gap:10px; padding:16px 18px; font-weight:800; font-size:18px; letter-spacing:-.2px;}
.ul-mpb3-emoji{font-size:18px; line-height:1}
.ul-mpb3-body{padding:18px 18px 20px; font-size:14px; line-height:1.6; color:#111;}
.ul-mpb3-body h1,.ul-mpb3-body h2,.ul-mpb3-body h3{margin:14px 0 8px; font-size:15px; font-weight:800;}
.ul-mpb3-body p{margin:8px 0;}
.ul-mpb3-body ul{margin:8px 0 8px 18px; padding:0;}
.ul-mpb3-body li{margin:6px 0;}
.ul-mpb3-body a{color:inherit; text-decoration:underline;}
.ul-mpb3-edu{background:linear-gradient(90deg, rgba(145,93,255,.35), rgba(220,205,255,.55));}
.ul-mpb3-first{background:linear-gradient(90deg, rgba(80,210,255,.30), rgba(200,245,255,.65));}
.ul-mpb3-access{background:linear-gradient(90deg, rgba(80,240,180,.28), rgba(210,255,235,.70));}
.ul-mpb3-stack{margin-top:14px; display:grid; gap:14px;}
    `.trim();
    document.head.appendChild(st);
  }

  function createCard(kind, title, emoji, html){
    var card = document.createElement("section");
    card.className = "ul-mpb3-card";
    card.setAttribute("data-ulydia-mpb3", kind);

    var head = document.createElement("div");
    head.className = "ul-mpb3-head " + (kind === "edu" ? "ul-mpb3-edu" : kind === "first" ? "ul-mpb3-first" : "ul-mpb3-access");

    var em = document.createElement("span");
    em.className = "ul-mpb3-emoji";
    em.textContent = emoji;

    var tt = document.createElement("div");
    tt.textContent = title;

    head.appendChild(em);
    head.appendChild(tt);

    var body = document.createElement("div");
    body.className = "ul-mpb3-body";
    body.innerHTML = '<div class="ul-mpb3-rich">' + sanitize(html) + "</div>";

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  function findAnchorCard(){
    // insert after a stable left card (Missions principales) if present
    var headers = document.querySelectorAll("h2,h3,.section-title");
    for (var i=0;i<headers.length;i++){
      var t = (headers[i].textContent||"").toLowerCase();
      if (t.indexOf("missions") !== -1 && t.indexOf("princip") !== -1){
        return headers[i].closest(".card") || headers[i].closest("section") || headers[i].closest("article") || headers[i].parentElement;
      }
    }
    // fallback: after "Compétences clés"
    for (var j=0;j<headers.length;j++){
      var t2 = (headers[j].textContent||"").toLowerCase();
      if (t2.indexOf("compétences") !== -1 || t2.indexOf("competences") !== -1){
        return headers[j].closest(".card") || headers[j].closest("section") || headers[j].closest("article") || headers[j].parentElement;
      }
    }
    return null;
  }

  function insertAfter(target, node){
    if (!target || !target.parentNode) return false;
    if (target.nextSibling) target.parentNode.insertBefore(node, target.nextSibling);
    else target.parentNode.appendChild(node);
    return true;
  }

  function inject(){
    if (document.querySelector("[data-ulydia-mpb3='edu']") ||
        document.querySelector("[data-ulydia-mpb3='first']") ||
        document.querySelector("[data-ulydia-mpb3='access']")) {
      return true;
    }

    // Build HTML from DOM placeholders
    var htmlEdu = mergeFields([
      "js-bf-education_level_local",
      "js-bf-education_level",
      "js-bf-degrees_examples"
    ]);

    var htmlFirst = mergeFields([
      "js-bf-first_job_titles",
      "js-bf-typical_employers",
      "js-bf-hiring_sectors"
    ]);

    var htmlAccess = mergeFields([
      "js-bf-entry_routes",
      "js-bf-equivalences_reconversion"
    ]);

    // If NOTHING present, stop (likely those DOM placeholders are not on the template)
    if (!htmlEdu && !htmlFirst && !htmlAccess){
      log("No DOM MPB fields found for 3 blocks. Ensure placeholders exist in the template.");
      return true;
    }

    ensureStyle();

    var anchor = findAnchorCard() || document.getElementById("ulydia-metier-root");
    if (!anchor) return false;

    var wrap = document.createElement("div");
    wrap.className = "ul-mpb3-stack";
    wrap.setAttribute("data-ulydia-mpb3-stack", "1");

    if (htmlEdu) wrap.appendChild(createCard("edu", "Niveau d’études & diplômes", "🎓", htmlEdu));
    if (htmlFirst) wrap.appendChild(createCard("first", "Débouchés & premiers postes", "⏱️", htmlFirst));
    if (htmlAccess) wrap.appendChild(createCard("access", "Accès au métier & reconversion", "🪵", htmlAccess));

    insertAfter(anchor, wrap);
    log("Injected 3 blocks:", {
      edu: !!htmlEdu,
      first: !!htmlFirst,
      access: !!htmlAccess
    });

    return true;
  }

  var t0 = Date.now();
  var MAX = 15000;
  (function loop(){
    if (inject()) return;
    if (Date.now() - t0 > MAX) return;
    requestAnimationFrame(loop);
  })();
})();
