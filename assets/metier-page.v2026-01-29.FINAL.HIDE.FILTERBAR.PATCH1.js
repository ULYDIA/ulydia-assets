(function(){
  // ULYDIA — HIDE SEARCH HEADER (Finsweet will handle filters) — PATCH1
  if (window.__ULYDIA_HIDE_FILTERBAR_PATCH1__) return;
  window.__ULYDIA_HIDE_FILTERBAR_PATCH1__ = true;

  function norm(s){ return String(s||"").toLowerCase().replace(/\s+/g," ").trim(); }

  function findBar(){
    var nodes = document.querySelectorAll("label,div,span,h2,h3");
    for (var i=0;i<nodes.length;i++){
      var t = norm(nodes[i].textContent);
      if (t.includes("pays / région") || t.includes("sector") || t.includes("secteur d'activité")) {
        var wrap = nodes[i].closest("section, .container, .w-container, .u-search, .u-filters, div");
        if (wrap) return wrap;
      }
    }
    return null;
  }

  function run(){
    var bar = document.querySelector("#ulydia-searchbar, #ulydia-filterbar, .u-metier-searchbar, .u-metier-filterbar") || findBar();
    if (bar) bar.style.display = "none";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();