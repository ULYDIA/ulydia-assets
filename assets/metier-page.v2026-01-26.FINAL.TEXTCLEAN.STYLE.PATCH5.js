(function(){
  "use strict";
  // =========================================================
  // ULYDIA — TEXT CLEAN + STYLE PATCH5 (darker left text)
  // - Removes &nbsp; and stray HTML entities in dynamic texts
  // - Right blocks: split after commas into new lines
  // - Left column: normal text dark gray, <strong> black
  // =========================================================
  window.__ULYDIA_TEXTCLEAN_STYLE_PATCH5__ = true;

  function log(){ if (window.__METIER_PAGE_DEBUG__) console.log.apply(console, ["[TEXTCLEAN.P5]"].concat([].slice.call(arguments))); }

  // --- 1) Global helper to decode HTML entities and remove nbsp
  function decodeHtml(s){
    s = String(s||"");
    if (!s) return "";
    // replace common entity variants first
    s = s.replace(/&nbsp;|&#160;|\u00A0/gi, " ");
    // decode remaining entities safely
    if (s.indexOf("&") !== -1) {
      var ta = document.createElement("textarea");
      ta.innerHTML = s;
      s = ta.value;
    }
    // collapse whitespace
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  function cleanNodeText(node){
    if (!node) return;
    if (node.nodeType === 3) { // text
      node.nodeValue = decodeHtml(node.nodeValue);
      return;
    }
    if (node.nodeType !== 1) return;
    // For elements, clean textContent unless it's an input/textarea
    var tag = (node.tagName||"").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    // If element has only text, clean it
    if (node.childNodes && node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
      node.textContent = decodeHtml(node.textContent);
    }
  }

  function cleanTree(root){
    if (!root) return;
    cleanNodeText(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      n.nodeValue = decodeHtml(n.nodeValue);
    }
  }

  // --- 2) Split commas into line breaks for some RIGHT blocks (certifs/schools/portfolio)
  function splitCommasToNewLines(el){
    if (!el) return;
    // Only if it's plain text (not a list already)
    var txt = decodeHtml(el.textContent || "");
    if (!txt) return;
    // If looks like already multi-line, keep
    if (txt.indexOf("\n") !== -1) return;
    // Turn ", " into <br>
    var parts = txt.split(/\s*,\s*/).filter(Boolean);
    if (parts.length <= 1) return;
    el.innerHTML = parts.map(function(p){ return "<div>"+p+"</div>"; }).join("");
  }

  // --- 3) Apply left column typography via injected CSS
  function ensureCSS(){
    if (document.getElementById("ulydia-left-typo-p5")) return;
    var css = document.createElement("style");
    css.id = "ulydia-left-typo-p5";
    css.textContent = `
      /* LEFT column readable typography */
      .ul-left-col, .u-left-col, .ulyd-left-col, #ulydia-metier-root .ul-col-left, #ulydia-metier-root .ul-left, #ulydia-metier-root .u-left {
        color: #4b5563 !important; /* darker gray */
      }
      /* Ensure paragraphs and list items inherit */
      #ulydia-metier-root .ul-col-left p,
      #ulydia-metier-root .ul-col-left li,
      #ulydia-metier-root .ul-left p,
      #ulydia-metier-root .ul-left li,
      #ulydia-metier-root .u-left p,
      #ulydia-metier-root .u-left li{
        color: #4b5563 !important;
      }
      /* Bold text */
      #ulydia-metier-root .ul-col-left strong,
      #ulydia-metier-root .ul-left strong,
      #ulydia-metier-root .u-left strong{
        color: #111827 !important;
        font-weight: 700 !important;
      }
    `;
    document.head.appendChild(css);
  }

  // --- 4) Run when DOM is ready, and rerun after patches fill content
  function run(){
    ensureCSS();

    // clean entire root
    var root = document.getElementById("ulydia-metier-root") || document.body;
    cleanTree(root);

    // split commas in specific right blocks (ids if present)
    ["js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"].forEach(function(id){
      var el = document.getElementById(id);
      if (el) splitCommasToNewLines(el);
    });

    // also split for cards that might use class hooks
    var q = document.querySelectorAll(".js-bf-certifications, .js-bf-schools_or_paths, .js-bf-portfolio_projects");
    q.forEach(function(el){ splitCommasToNewLines(el); });

    log("applied");
  }

  // debounce
  var t=null;
  function schedule(){
    clearTimeout(t);
    t=setTimeout(run, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else schedule();

  // Re-run a few times (after async data render)
  var tries=0;
  var iv=setInterval(function(){
    schedule();
    tries++;
    if (tries>=10) clearInterval(iv);
  }, 400);

})();