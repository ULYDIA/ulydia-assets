/* ULYDIA — METIER PAGE MONO (REBUILD SAFE)
   - Stable parse (no try/catch syntax traps)
   - Keeps existing CSS classnames spirit: u-card/u-title/u-pills etc.
   - Reads Webflow-exported arrays: __ULYDIA_FICHE_METIERS__, __ULYDIA_COUNTRIES__
   - Renders into #ulydia-metier-root (creates if missing)
   - Minimal banner support: country non-sponsor banners (wide + square)
   - Safe loader + atomic content swap
*/
(function(){
  "use strict";

  // -------- tiny utils
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);}); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)||[]); }
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function getQuery(){
    var p=new URLSearchParams(location.search||"");
    return {
      metier: norm(p.get("metier")||p.get("slug")||""),
      country: norm(p.get("country")||p.get("iso")||"")
    };
  }

  // --------- CSS (lightweight, won't override your good design too much)
  function injectCss(){
    if (document.getElementById("ulydia-mono-safe-css")) return;
    var st=document.createElement("style");
    st.id="ulydia-mono-safe-css";
    st.textContent = [
      "#ulydia-cms-exports,.is-offscreen,#ul-cms-countries,#ul-cms-metiers,#ul-cms-fiches,#ul-cms-mpb,#ul-cms-faq{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;}",
      ".w-dyn-empty{display:none!important;}",
      ".ulydia-loader{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(255,255,255,.65);backdrop-filter: blur(2px);z-index:99999;}",
      ".ulydia-loader.on{display:flex;}",
      ".ulydia-loader .box{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:10px 16px;font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial;box-shadow:0 8px 24px rgba(0,0,0,.08);font-weight:600;}",
      ".u-container{max-width:1180px;margin:0 auto;padding:0 20px 40px;box-sizing:border-box;}",
      ".u-title{font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:52px;line-height:1.05;margin:22px 0 14px;color:#4f5ef0;letter-spacing:-0.02em;}",
      ".u-pills{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 18px;}",
      ".u-pill{display:inline-flex;gap:8px;align-items:center;padding:10px 14px;border-radius:999px;background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 6px 18px rgba(0,0,0,.06);font-family:Montserrat,system-ui;font-size:14px;}",
      ".u-row{display:grid;grid-template-columns:1fr 360px;gap:18px;align-items:start;}",
      "@media(max-width:980px){.u-row{grid-template-columns:1fr;}}",
      ".u-card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 26px rgba(0,0,0,.06);overflow:hidden;}",
      ".u-card-h{padding:14px 16px;font-family:Montserrat,system-ui;font-weight:700;border-bottom:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,#fafbff,#fff);}",
      ".u-card-b{padding:14px 16px;font-family:Montserrat,system-ui;font-size:15px;line-height:1.55;color:#111827;}",
      ".u-banner-wide{width:100%;border-radius:18px;overflow:hidden;border:1px solid rgba(0,0,0,.06);box-shadow:0 10px 26px rgba(0,0,0,.06);cursor:pointer;transition:transform .18s ease, box-shadow .18s ease;}",
      ".u-banner-wide:hover{transform:scale(1.01);box-shadow:0 14px 34px rgba(0,0,0,.10);}",
      ".u-banner-wide img{width:100%;display:block;}",
      ".u-note{padding:14px 16px;font-family:Montserrat,system-ui;color:#6b7280;}",
    ].join("\n");
    document.head.appendChild(st);
  }

  // --------- loader
  function ensureLoader(){
    var el = qs("#ulydia-safe-loader");
    if (el) return el;
    el = document.createElement("div");
    el.id="ulydia-safe-loader";
    el.className="ulydia-loader";
    el.innerHTML = '<div class="box">Loading…</div>';
    document.body.appendChild(el);
    return el;
  }
  function showLoader(){ ensureLoader().classList.add("on"); }
  function hideLoader(){ ensureLoader().classList.remove("on"); }

  // --------- root
  function ensureRoot(){
    var root = qs("#ulydia-metier-root") || qs(".ulydia-metier-root") || qs("#ulydia-root");
    if (!root){
      root = document.createElement("div");
      root.id="ulydia-metier-root";
      document.body.appendChild(root);
    }
    return root;
  }

  // --------- data
  function getFiches(){ return (window.__ULYDIA_FICHE_METIERS__||[]); }
  function getCountries(){ return (window.__ULYDIA_COUNTRIES__||[]); }
  function findCountry(iso){
    iso = (iso||"").toUpperCase();
    var arr=getCountries();
    for (var i=0;i<arr.length;i++){
      if (String(arr[i].iso||"").toUpperCase()===iso) return arr[i];
    }
    return null;
  }
  function findFicheBySlug(slug){
    slug = String(slug||"").toLowerCase();
    var arr=getFiches();
    for (var i=0;i<arr.length;i++){
      if (String(arr[i].slug||"").toLowerCase()===slug) return arr[i];
    }
    return null;
  }

  // --------- sector label by language
  function pickLang(country){
    var q=getQuery();
    var forced = (window.__ULYDIA_LANG_FINAL__||"").toLowerCase();
    if (forced) return forced;
    if (country && country.lang) return String(country.lang).toLowerCase();
    // fallback: page lang or html lang
    var htmlLang = (document.documentElement.getAttribute("lang")||"").toLowerCase();
    if (htmlLang) return htmlLang.slice(0,2);
    return "fr";
  }
  function sectorLabel(fiche, lang){
    if (!fiche) return "";
    lang=(lang||"fr").slice(0,2);
    var k = "secteur_label_"+lang;
    return norm(fiche[k] || fiche["Secteur_label_"+lang.toUpperCase()] || "");
  }

  // --------- banners (country non-sponsor)
  function renderTopBanner(country){
    if (!country) return null;
    var url = country.banner_wide || country.bannerWide || "";
    if (!url) return null;
    var wrap = document.createElement("div");
    wrap.className="u-banner-wide";
    wrap.innerHTML = '<img alt="" src="'+esc(url)+'">';
    wrap.addEventListener("click", function(){
      var href = country.banner_cta || country.bannerCta || "";
      if (href) window.open(href, "_blank", "noopener");
    });
    return wrap;
  }

  // --------- block helper
  function card(title, htmlContent){
    var c=document.createElement("section");
    c.className="u-card";
    var h=document.createElement("div");
    h.className="u-card-h";
    h.textContent=title;
    var b=document.createElement("div");
    b.className="u-card-b";
    b.innerHTML = htmlContent || "";
    c.appendChild(h); c.appendChild(b);
    return c;
  }

  function renderPage(){
    injectCss();
    var q=getQuery();
    var root=ensureRoot();

    var country = findCountry(q.country) || null;
    var lang = pickLang(country);

    // container
    var container = document.createElement("div");
    container.className="u-container";

    if (!q.metier){
      var empty = document.createElement("div");
      empty.className="u-card";
      empty.innerHTML = '<div class="u-card-h">Sélectionne un métier</div><div class="u-card-b">Choisis un secteur puis un métier pour afficher la fiche.</div>';
      container.appendChild(empty);
      root.replaceChildren(container);
      return;
    }

    var fiche = findFicheBySlug(q.metier);
    if (!fiche){
      var miss = document.createElement("div");
      miss.className="u-card";
      miss.innerHTML = '<div class="u-card-h">Fiche introuvable</div><div class="u-card-b">Aucune fiche n’a été trouvée pour <b>'+esc(q.metier)+'</b>.</div>';
      container.appendChild(miss);
      root.replaceChildren(container);
      return;
    }

    // title
    var h1=document.createElement("h1");
    h1.className="u-title";
    h1.textContent = fiche.name || fiche.slug || q.metier;
    container.appendChild(h1);

    // pills
    var pills=document.createElement("div");
    pills.className="u-pills";
    var sect = sectorLabel(fiche, lang) || fiche.Secteur_slug || fiche.secteur_slug || "";
    if (sect){
      pills.insertAdjacentHTML("beforeend", '<span class="u-pill">Secteur : <b>'+esc(sect)+'</b></span>');
    }
    if (q.country){
      pills.insertAdjacentHTML("beforeend", '<span class="u-pill">Country : <b>'+esc(q.country.toUpperCase())+'</b></span>');
    }
    container.appendChild(pills);

    // accroche
    if (fiche.accroche){
      var note=document.createElement("div");
      note.className="u-note";
      note.textContent = fiche.accroche;
      container.appendChild(note);
    }

    // top banner
    var top = renderTopBanner(country);
    if (top){ container.appendChild(top); }

    // columns
    var row=document.createElement("div");
    row.className="u-row";

    var left=document.createElement("div");
    var right=document.createElement("div");

    // left main content
    if (fiche.description) left.appendChild(card("Description", fiche.description));
    if (fiche.missions) left.appendChild(card("Missions principales", fiche.missions));
    if (fiche.competences) left.appendChild(card("Compétences", fiche.competences));

    // right side
    if (fiche.environnements) right.appendChild(card("Environnements", fiche.environnements));
    if (fiche.profil_recherche) right.appendChild(card("Profil recherché", fiche.profil_recherche));
    if (fiche.evolutions_possibles) right.appendChild(card("Évolutions possibles", fiche.evolutions_possibles));

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);

    // SEO
    try{
      if (fiche.meta_title) document.title = fiche.meta_title;
      if (fiche.meta_description){
        var m = qs('meta[name="description"]');
        if (!m){ m=document.createElement("meta"); m.setAttribute("name","description"); document.head.appendChild(m); }
        m.setAttribute("content", norm(fiche.meta_description));
      }
      if (fiche.schema_json_ld){
        var id="ulydia-jsonld";
        var old=qs("#"+id);
        if (old) old.remove();
        var s=document.createElement("script");
        s.id=id;
        s.type="application/ld+json";
        s.textContent = String(fiche.schema_json_ld||"").trim();
        document.head.appendChild(s);
      }
    }catch(e){}

    // swap
    root.replaceChildren(container);

    // notify
    try{ window.dispatchEvent(new CustomEvent("ulydia:rendered",{detail:{slug:q.metier,country:q.country||""}})); }catch(e){}
  }

  // --------- boot
  function boot(){
    showLoader();
    try{
      renderPage();
    }catch(e){
      try{ console.error("[ULYDIA] fatal render error", e); }catch(_){}
      try{
        var root=ensureRoot();
        root.innerHTML = '<div class="u-container"><div class="u-card"><div class="u-card-h">⚠️ Error</div><div class="u-card-b">'+esc(e && (e.message||e.toString()) || "Unknown error")+'</div></div></div>';
      }catch(_e){}
    }finally{
      hideLoader();
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // re-render on route change (filters)
  window.addEventListener("ulydia:routechange", function(){ boot(); });
  window.addEventListener("popstate", function(){ boot(); });

  // exposed refresh
  window.__ULYDIA_METIER_PAGE_REFRESH__ = boot;
})();
