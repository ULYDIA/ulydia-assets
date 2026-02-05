/*!
 * ULYDIA – UI BAR AUTOINJECT v12
 * Purpose: Ensure the filter bar exists (Pays / Secteur d’activité / Métier + Reset)
 * and expose stable selectors for the existing filters patch scripts.
 *
 * Safe: does NOT touch the fiche layout or content rendering.
 */
(function(){
  if (window.__ULYDIA_UIBAR_V12__) return;
  window.__ULYDIA_UIBAR_V12__ = true;

  function el(tag, attrs){
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function(k){
      if (k === "style") Object.assign(n.style, attrs.style||{});
      else if (k === "class") n.className = attrs.class;
      else if (k === "text") n.textContent = attrs.text;
      else n.setAttribute(k, attrs[k]);
    });
    return n;
  }

  function ensureStyles(){
    if (document.getElementById("ulydia-filterbar-css")) return;
    var css = `
#ulydia-metier-filters{max-width:1100px;margin:18px auto 8px;padding:16px 18px;border-radius:18px;background:#fff;box-shadow:0 14px 40px rgba(17,24,39,.08);}
#ulydia-metier-filters .uf-row{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
#ulydia-metier-filters .uf-filter{display:flex;flex-direction:column;gap:6px;min-width:220px;flex:1}
#ulydia-metier-filters .uf-label{font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:#6b7280}
#ulydia-metier-filters select{appearance:none;-webkit-appearance:none;font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  font-size:14px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;outline:none}
#ulydia-metier-filters select:focus{border-color:#c00102;box-shadow:0 0 0 3px rgba(192,1,2,.10)}
#ulydia-metier-filters .uf-meta{margin-left:auto;display:flex;align-items:center;gap:10px}
#ulydia-metier-filters .uf-count{font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:13px;color:#6b7280}
#ulydia-metier-filters .uf-reset{font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  font-size:13px;padding:9px 12px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;cursor:pointer}
#ulydia-metier-filters .uf-reset:hover{box-shadow:0 10px 24px rgba(17,24,39,.10)}
@media (max-width: 720px){
  #ulydia-metier-filters{margin:12px 12px 6px}
  #ulydia-metier-filters .uf-filter{min-width:160px}
  #ulydia-metier-filters .uf-meta{width:100%;justify-content:space-between}
}`;
    var style = el("style",{id:"ulydia-filterbar-css", text: css});
    document.head.appendChild(style);
  }

  function findInsertPoint(){
    var root = document.getElementById("ulydia-metier-root") ||
               document.querySelector(".ulydia-metier-root") ||
               document.querySelector("[data-ulydia-root]") ||
               document.querySelector("main") ||
               document.body;
    return root;
  }

  function buildBar(){
    var bar = el("section",{id:"ulydia-metier-filters"});
    var row = el("div",{class:"uf-row"});

    function addSelect(label, field, placeholder){
      var wrap = el("div",{class:"uf-filter"});
      wrap.appendChild(el("div",{class:"uf-label", text: label}));
      var sel = el("select", {"fs-cmsfilter-field": field, "data-ulydia-filter": field});
      sel.appendChild(el("option",{value:"", text: placeholder}));
      wrap.appendChild(sel);
      row.appendChild(wrap);
      return sel;
    }

    addSelect("Pays","country","Pays");
    addSelect("Secteur d’activité","sector","Secteur d’activité");
    addSelect("Métier","metier","Métier");

    var meta = el("div",{class:"uf-meta"});
    meta.appendChild(el("div",{class:"uf-count", id:"ulydia-metier-count", text:""}));
    var reset = el("button",{class:"uf-reset", id:"ulydia-metier-reset", type:"button", text:"↺ Réinitialiser"});
    meta.appendChild(reset);
    row.appendChild(meta);

    bar.appendChild(row);
    return bar;
  }

  function ensureBar(){
    ensureStyles();

    var existing = document.getElementById("ulydia-metier-filters");
    if (existing){
      if (!existing.querySelector("select")){
        existing.innerHTML = "";
        existing.appendChild(buildBar().firstChild);
      }
      existing.style.display = "";
      return existing;
    }

    var bar = buildBar();
    var insertBefore = findInsertPoint();
    if (insertBefore && insertBefore.parentNode){
      insertBefore.parentNode.insertBefore(bar, insertBefore);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
    return bar;
  }

  function wireReset(){
    var btn = document.getElementById("ulydia-metier-reset");
    if (!btn || btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener("click", function(){
      var bar = document.getElementById("ulydia-metier-filters");
      if (!bar) return;
      bar.querySelectorAll("select").forEach(function(s){
        s.value="";
        s.dispatchEvent(new Event("change",{bubbles:true}));
      });
      try{
        var u = new URL(location.href);
        ["metier","sector","country"].forEach(function(k){ u.searchParams.delete(k); });
        history.pushState({}, "", u.toString());
        window.dispatchEvent(new CustomEvent("ulydia:routechange",{detail:{source:"reset"}}));
      }catch(e){}
    });
  }

  function boot(){
    var bar = ensureBar();
    wireReset();
    window.dispatchEvent(new CustomEvent("ulydia:filterbar:ready"));
    return bar;
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();