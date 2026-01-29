(function(){
  "use strict";
  // =========================================================
  // ULYDIA — ONE FILE LOADER (BASE MONO + MPB + I18N)
  // v2026-01-30 FINAL
  // - You include ONLY this script in Webflow
  // - It sets __ULYDIA_LANG__ from URL ?lang= first (Google Translate won't override)
  // - It loads the stable base mono bundle (NOLOADER)
  // - Then it fetches Metier_Pays_Blocs via Worker and renders them
  // =========================================================

  // ---------- helpers ----------
  function qs(k){ try{ return new URLSearchParams(location.search).get(k) || ""; }catch(e){ return ""; } }
  function normLang(l){
    l = String(l||"").trim().toLowerCase();
    if (!l) return "";
    if (l.indexOf("-")>0) l = l.split("-")[0];
    // supported
    if (["fr","en","de","es","it"].indexOf(l)>=0) return l;
    return "";
  }
  function normIso(c){
    c = String(c||"").trim().toUpperCase();
    if (c && c.length===2) return c;
    return "";
  }
  function ensureRoot(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root){
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      (document.body || document.documentElement).appendChild(root);
    }
    return root;
  }
  function onceFlag(k){
    if (window[k]) return true;
    window[k] = true;
    return false;
  }
  function loadScriptOnce(src){
    return new Promise(function(resolve,reject){
      try{
        if (!src) return reject(new Error("missing src"));
        // already present?
        var exists = Array.prototype.slice.call(document.querySelectorAll("script[src]"))
          .some(function(s){ return (s.getAttribute("src")||"").indexOf(src) >= 0; });
        if (exists) return resolve("already");
        var s = document.createElement("script");
        s.src = src;
        s.defer = true;
        s.onload = function(){ resolve("loaded"); };
        s.onerror = function(){ reject(new Error("failed to load: "+src)); };
        document.head.appendChild(s);
      }catch(e){ reject(e); }
    });
  }
  function safeText(s){
    return String(s||"").replace(/\s+/g," ").trim();
  }
  function escHtml(s){
    return String(s||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  // ---------- I18N: pick lang deterministically ----------
  // Priority: URL ?lang=  > existing window.__ULYDIA_LANG__ > <html lang> > navigator
  var langParam = normLang(qs("lang"));
  var htmlLang = normLang(document.documentElement && document.documentElement.getAttribute("lang"));
  var navLang  = normLang((navigator.language||""));
  var prev = normLang(window.__ULYDIA_LANG__);
  var lang = langParam || prev || htmlLang || navLang || "fr";

  // IMPORTANT: freeze it early (before base bundle boots)
  window.__ULYDIA_LANG__ = lang;

  // ---------- figure metier + country ----------
  var metierSlug = qs("metier");
  var countryIso = normIso(qs("country"));

  // ---------- load base mono bundle ----------
  // Update this to the exact stable file you want to run as base:
  var BASE_MONO_SRC = "https://ulydia-assets.pages.dev/assets/metier-page.v2026-01-29.FINAL.MONO.BUNDLE.NOLOADER.js";

  // ---------- MPB fetch + render ----------
  function workerFetchJSON(url){
    var headers = {};
    if (window.ULYDIA_PROXY_SECRET) headers["x-ulydia-proxy-secret"] = String(window.ULYDIA_PROXY_SECRET);
    return fetch(url, { method:"GET", headers: headers, credentials:"omit" })
      .then(function(r){ return r.json().catch(function(){ return { ok:false, error:"invalid json" }; }).then(function(j){ j.__http_status__ = r.status; return j; }); });
  }

  function renderMPB(mpb){
    mpb = Array.isArray(mpb) ? mpb : [];
    // Filter invalid
    mpb = mpb
      .map(function(b){
        return {
          title: safeText(b.title || b.titre || b.block_title || b.name || ""),
          body_html: String(b.body_html || b.body || b.contenu || b.rich || b.html || ""),
          order: (typeof b.order==="number" ? b.order : parseFloat(b.order||b.ordre||"")) || 9999
        };
      })
      .filter(function(b){ return b.title || (b.body_html && b.body_html.replace(/<[^>]+>/g,"").trim()); })
      .sort(function(a,b){ return (a.order||9999)-(b.order||9999); });

    if (!mpb.length) return;

    var root = ensureRoot();

    // Prefer a dedicated wrapper if you created one
    var slot = document.querySelector("[data-ulydia-mpb-slot]") ||
               document.getElementById("ulydia-mpb-slot") ||
               document.getElementById("ulydia-banner-before-faq-slot") ||
               root;

    var wrap = document.createElement("section");
    wrap.setAttribute("data-ulydia-mpb-rendered","1");
    wrap.style.marginTop = "24px";

    mpb.forEach(function(b){
      var card = document.createElement("div");
      card.className = "ul-mpb-card";
      card.style.borderRadius = "18px";
      card.style.overflow = "hidden";
      card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.08)";
      card.style.margin = "18px 0";
      card.style.background = "#fff";

      var head = document.createElement("div");
      head.className = "ul-mpb-head";
      head.style.padding = "16px 18px";
      head.style.fontWeight = "800";
      head.style.fontSize = "18px";
      head.style.background = "linear-gradient(90deg, rgba(120,75,255,0.22), rgba(120,75,255,0.10))";
      head.textContent = b.title || " ";

      var body = document.createElement("div");
      body.className = "ul-mpb-body";
      body.style.padding = "16px 18px";
      body.style.lineHeight = "1.55";
      body.innerHTML = b.body_html || "";

      card.appendChild(head);
      card.appendChild(body);
      wrap.appendChild(card);
    });

    // Avoid duplicates on re-runs
    var existing = slot.querySelector("[data-ulydia-mpb-rendered='1']");
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    // Insert before slot if slot is the banner-before-faq (so blocks appear before it)
    if (slot.id === "ulydia-banner-before-faq-slot" && slot.parentNode){
      slot.parentNode.insertBefore(wrap, slot);
    } else {
      slot.appendChild(wrap);
    }
  }

  function fetchAndRenderMPB(){
    if (!window.ULYDIA_WORKER_URL) return;
    if (!metierSlug || !countryIso) return;

    // Try the known v1 endpoint
    var url = String(window.ULYDIA_WORKER_URL).replace(/\/$/,"") +
      "/v1/metier-page?metier=" + encodeURIComponent(metierSlug) +
      "&country=" + encodeURIComponent(countryIso) +
      "&lang=" + encodeURIComponent(lang);

    return workerFetchJSON(url).then(function(j){
      // Support both shapes:
      // { ok:true, data:{ mpb:[...] } } OR { ok:true, mpb:[...] }
      if (!j) return;
      var mpb = (j.data && (j.data.mpb || j.data.metier_pays_blocs)) || j.mpb || j.metier_pays_blocs || [];
      renderMPB(mpb);
    }).catch(function(){});
  }

  // ---------- boot ----------
  if (onceFlag("__ULYDIA_ONEFILE_LOADER__")) return;

  // Ensure single root
  try{
    var roots = document.querySelectorAll("#ulydia-metier-root");
    if (roots && roots.length > 1){
      for (var i=1;i<roots.length;i++){
        try{ roots[i].parentNode && roots[i].parentNode.removeChild(roots[i]); }catch(e){}
      }
    }
  }catch(e){}

  // Load base first, then MPB
  loadScriptOnce(BASE_MONO_SRC)
    .then(function(){
      // Let base render first, then attach MPB
      setTimeout(function(){
        fetchAndRenderMPB();
      }, 150);
    })
    .catch(function(err){
      // If base fails, still try to show something helpful
      ensureRoot().innerHTML = "<div style='padding:24px;font-family:system-ui'>"+
        "<b>Ulydia:</b> base bundle failed to load.<br/>" +
        "<div style='margin-top:8px;color:#b00'>" + escHtml(String(err && err.message || err)) + "</div>" +
      "</div>";
    });

})();