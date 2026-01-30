/*!
 * =========================================================
 * ULYDIA — METIER PAGE — FINAL MONO (PROPAl-like RENDER • CMS-only • BANNERS)
 * File: metier-page.v2026-01-30.FINAL.MONO.PROPAL.RENDER.CMS.BANNERS.js
 *
 * ✅ Webflow CMS = source of truth (via Code Embed readers -> window.__ULYDIA_*__)
 * ✅ ONE FILE in PROD
 * ✅ Generates the PROPAL-like UI inside #ulydia-metier-root (since you only have wrappers)
 * ✅ Handles sponsor + fallback banners (wide + square + before-FAQ)
 * ✅ No Webflow API fetch / no Worker fetch
 * ✅ Anti-legacy loader cleanup (prevents white screen)
 * =========================================================
 */
(function(){
  "use strict";
  if (window.__ULYDIA_FINAL_PROPAL_RENDER__) return;
  window.__ULYDIA_FINAL_PROPAL_RENDER__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG && console && console.log) console.log.apply(console, ["[ULYDIA:FINAL:PROPAL]"].concat([].slice.call(arguments))); }

  // ---------- utils ----------
  function qs(k){ try { return new URLSearchParams(location.search||"").get(k)||""; } catch(e){ return ""; } }
  function norm(s){ return String(s||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim(); }
  function slug(s){ return norm(s).toLowerCase().replace(/\s+/g,"-"); }
  function iso2(s){ s=norm(s).toUpperCase(); return s.length===2?s:""; }
  function lang2(s){
    s=norm(s).toLowerCase();
    if (!s) return "";
    if (s.indexOf("-")>0) s=s.split("-")[0];
    if (s.indexOf("_")>0) s=s.split("_")[0];
    return (/^(fr|en|de|es|it)$/).test(s) ? s : "";
  }
  function escapeHtml(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function sanitizeHTML(html){
    var s = String(html||"");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,"");
    s = s.replace(/\son\w+="[^"]*"/gi,"");
    s = s.replace(/\son\w+='[^']*'/gi,"");
    s = s.replace(/\son\w+=\S+/gi,"");
    return s.trim();
  }
  function isEmptyRich(html){
    var s = String(html||"")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,"")
      .replace(/<[^>]+>/g," ")
      .replace(/\u00a0/g," ")
      .replace(/\s+/g," ")
      .trim();
    return !s;
  }
  function parseNum(x){
    if (x===null || x===undefined) return null;
    var s = String(x).trim();
    if (!s) return null;
    s = s.toLowerCase().replace(/\s+/g,"").replace(/,/g,".");
    var mult=1;
    if (s.endsWith("k")) { mult=1000; s=s.slice(0,-1); }
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    return Math.round(n*mult);
  }
  function fmtInt(n){
    if (n===null || n===undefined) return "";
    var s = String(n);
    try { return s.replace(/\B(?=(\d{3})+(?!\d))/g, " "); } catch(e){ return s; }
  }
  function fmtRange(min,max,currency){
    var n1=parseNum(min), n2=parseNum(max);
    if (n1===null && n2===null) return "";
    var cur = norm(currency||"");
    if (n1!==null && n2!==null) return fmtInt(n1)+" - "+fmtInt(n2)+(cur?(" "+cur):"");
    return fmtInt(n1!==null?n1:n2)+(cur?(" "+cur):"");
  }
  function splitItems(v){
    var s = String(v||"").trim();
    if (!s) return [];
    if (/<li[\s>]/i.test(s)) {
      var m = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      return m.map(function(li){
        return norm(li.replace(/<li[^>]*>/i,"").replace(/<\/li>/i,"").replace(/<[^>]+>/g," "));
      }).filter(Boolean);
    }
    return s
      .replace(/<br\s*\/?>/gi,"\n")
      .replace(/<\/p>/gi,"\n")
      .replace(/<[^>]+>/g,"\n")
      .split(/[\n,]+/)
      .map(function(x){ return norm(x); })
      .filter(Boolean);
  }

  // ---------- legacy overlay cleanup ----------
  function cleanupLegacy(){
    var ids = ["ulydia-loader-overlay","ulydia-loader","ulydia-loading-overlay","ulydia-page-loader"];
    ids.forEach(function(id){
      var el=document.getElementById(id);
      if (el && el.parentNode) { try{ el.parentNode.removeChild(el); }catch(e){} }
    });
    ["[data-ulydia-loader]","[data-ulydia-loader-overlay]",".ulydia-loader-overlay",".ulydia-blocking-overlay"].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        try{ el.parentNode && el.parentNode.removeChild(el); }catch(e){}
      });
    });
    try{
      document.documentElement.style.overflow="";
      document.body && (document.body.style.overflow="");
      document.body && (document.body.style.opacity="");
      document.body && (document.body.style.pointerEvents="");
    }catch(e){}
  }

  // ---------- language (single source) ----------
  var LANG = (function(){
    var l = lang2(qs("lang")) || lang2(window.__ULYDIA_LANG__) || lang2(document.documentElement.getAttribute("lang")) || lang2(navigator.language) || "fr";
    if (!lang2(qs("lang"))){
      try{ window.__ULYDIA_LANG__=l; }catch(e){}
      try{ document.documentElement.setAttribute("lang", l); }catch(e){}
    }
    try{ document.documentElement.setAttribute("translate","no"); }catch(e){}
    try{
      if (!document.querySelector('meta[name="google"][content="notranslate"]')){
        var m=document.createElement("meta"); m.name="google"; m.content="notranslate";
        document.head && document.head.appendChild(m);
      }
    }catch(e){}
    return l;
  })();

  // ---------- globals ----------
  function arr(v){ return Array.isArray(v)?v:[]; }
  function getMetiers(){ return arr(window.__ULYDIA_METIERS__); }
  function getCountries(){ return arr(window.__ULYDIA_COUNTRIES__); }
  function getMPB(){ return arr(window.__ULYDIA_MPB__); }
  function getFaqs(){ return arr(window.__ULYDIA_FAQS__); }

  function getSponsorInfo(){
    return (
      window.__ULYDIA_SPONSOR_INFO__ ||
      window.__ULYDIA_SPONSOR__ ||
      window.__ULYDIA_SPONSOR_DATA__ ||
      (window.__ULYDIA_STATE__ && window.__ULYDIA_STATE__.sponsor) ||
      null
    );
  }
  function getCatalogCountry(iso){
    iso = iso2(iso);
    var cat = window.__ULYDIA_CATALOG__ || window.__ULYDIA_CATALOG_JSON__ || null;
    if (!iso || !cat) return null;
    var c = cat.countries;
    if (!c) return null;
    if (Array.isArray(c)){
      for (var i=0;i<c.length;i++){ if (iso2(c[i] && c[i].iso)===iso) return c[i]; }
    } else if (typeof c==="object"){
      return c[iso] || c[iso.toLowerCase()] || null;
    }
    return null;
  }
  function getCountryByIso(iso){
    iso=iso2(iso);
    var cs=getCountries();
    for (var i=0;i<cs.length;i++){ if (iso2(cs[i] && cs[i].iso)===iso) return cs[i]; }
    return getCatalogCountry(iso);
  }
  function pickUrl(v){
    if (!v) return "";
    if (typeof v==="string") return v;
    if (typeof v==="object") return v.url || v.src || v.href || v.download || "";
    return "";
  }
  function sanitizeHref(href){
    href = norm(href);
    if (!href) return "#";
    if (/^(mailto:|tel:)/i.test(href)) return href;
    if (!/^https?:\/\//i.test(href)){
      if (href.startsWith("/")) return href;
      return "https://" + href.replace(/^\/+/,"");
    }
    return href;
  }
  function defaultSponsorHref(metier, iso){
    return "/sponsor?metier=" + encodeURIComponent(slug(metier||"")) + "&country=" + encodeURIComponent(iso2(iso||""));
  }
  function resolveBanners(iso){
    var s=getSponsorInfo();
    if (s){
      var wide = pickUrl(s.banner_1 || s.bannerWide || s.banner_wide || s.image_1 || s.image1 || s.logo_1 || s.logo1 || (s.banners && (s.banners.wide || s.banners.banner_1 || s.banners.image_1)));
      var square = pickUrl(s.banner_2 || s.bannerSquare || s.banner_square || s.image_2 || s.image2 || s.logo_2 || s.logo2 || (s.banners && (s.banners.square || s.banners.banner_2 || s.banners.image_2)));
      var href = pickUrl(s.url || s.href || s.link || s.cta_url || s.ctaUrl);
      var name = norm(s.name || s.title || "");
      if (wide || square) return { kind:"sponsor", wide:wide, square:square, href:href, name:name };
    }
    var c=getCountryByIso(iso)||{};
    var b=(c.banners||c.banner||c.fallback_banners||c.fallback||{});
    var wide2 = pickUrl(b.banner_1 || b.image_1 || b.wide || b.landscape || b.banner1);
    var square2 = pickUrl(b.banner_2 || b.image_2 || b.square || b.banner2);
    var href2 = pickUrl(b.cta || b.href || b.link || "");
    return { kind:(wide2||square2)?"fallback":"none", wide:wide2, square:square2, href:href2, name:"" };
  }

  // ---------- UI (Propal-like) ----------
  function ensureStyles(){
    if (document.getElementById("ulydia-propal-css")) return;
    var css = document.createElement("style");
    css.id="ulydia-propal-css";
    css.textContent = `
:root{
  --primary:#6366f1;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--bg:#ffffff;--card:#f8fafc;--accent:#f59e0b;--success:#10b981;
  --radius-sm:10px;--radius-md:14px;--radius-lg:18px;--shadow-card:0 10px 30px rgba(15,23,42,.10);
}
#ulydia-metier-root{max-width:1200px;margin:24px auto 60px;padding:0 18px;font-family: system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;}
.ul-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-top:10px}
.ul-title{font-size:46px;line-height:1.05;font-weight:900;color:var(--primary);letter-spacing:-.02em;margin:0}
.ul-sub{margin:8px 0 0;color:var(--muted);font-weight:600}
.ul-chips{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}
.ul-chip{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--border);border-radius:999px;background:#fff;color:var(--muted);font-weight:800}
.ul-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:22px;margin-top:18px}
@media(max-width:980px){.ul-grid{grid-template-columns:1fr}.ul-title{font-size:36px}}
.ul-card{border:1px solid var(--border);border-radius:var(--radius-lg);background:#fff;box-shadow:var(--shadow-card);overflow:hidden}
.ul-card-h{padding:14px 16px;border-bottom:1px solid rgba(226,232,240,.8);font-weight:900;color:var(--text);display:flex;align-items:center;gap:10px}
.ul-card-b{padding:16px}
.ul-pastel-pink{background:linear-gradient(135deg,#fce7f3 0%,#fbcfe8 100%)}
.ul-pastel-purple{background:linear-gradient(135deg,#e9d5ff 0%,#d8b4fe 100%)}
.ul-pastel-green{background:linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%)}
.ul-pastel-blue{background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)}
.ul-pastel-orange{background:linear-gradient(135deg,#fed7aa 0%,#fdba74 100%)}
.ul-rich p{margin:0 0 10px;color:var(--text);line-height:1.65;font-weight:520}
.ul-rich ul{padding-left:18px;margin:8px 0;color:var(--text);line-height:1.6}
.ul-rich li{margin:6px 0}
.ul-banner-wide{display:block;position:relative;border-radius:var(--radius-lg);overflow:hidden;border:1px solid rgba(99,102,241,.20);box-shadow:0 12px 32px rgba(99,102,241,.18)}
.ul-banner-wide .ul-banner-bg{position:absolute;inset:0;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)}
.ul-banner-wide img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ul-banner-wide .ul-banner-txt{position:relative;z-index:2;padding:18px;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:14px}
.ul-banner-wide .ul-banner-txt small{display:block;font-weight:700;opacity:.92}
.ul-banner-wide .ul-banner-pill{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.30);padding:8px 12px;border-radius:999px;font-size:12px;font-weight:900}
.ul-side-sponsor{display:flex;gap:12px;align-items:center}
.ul-square{width:88px;height:88px;border-radius:16px;overflow:hidden;border:1px solid rgba(226,232,240,1);background:#fff;display:flex;align-items:center;justify-content:center}
.ul-square img{width:100%;height:100%;object-fit:cover}
.ul-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 14px;border-radius:12px;font-weight:900;border:1px solid rgba(99,102,241,.25);background:rgba(99,102,241,.10);color:var(--primary);text-decoration:none}
.ul-btn:hover{filter:brightness(.98)}
.ul-kpi{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ul-kpi-item{display:flex;gap:10px;align-items:center;padding:10px;border-radius:14px;border:1px solid rgba(226,232,240,.9);background:#fff}
.ul-kpi-ico{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(99,102,241,.10);font-size:18px}
.ul-kpi-k{font-size:12px;font-weight:800;color:var(--muted)}
.ul-kpi-v{font-size:13px;font-weight:900;color:var(--text)}
.ul-tags{display:flex;flex-wrap:wrap;gap:8px}
.ul-tag{padding:8px 10px;border-radius:999px;border:1px solid rgba(99,102,241,.22);background:rgba(99,102,241,.10);font-weight:900;color:var(--primary);font-size:12px}
.ul-skill{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid rgba(226,232,240,.9);border-radius:14px;background:#fff}
.ul-salary-row{margin:10px 0}
.ul-salary-lbl{display:flex;justify-content:space-between;gap:10px;font-size:12px;font-weight:900;color:var(--text)}
.ul-bar{height:10px;border-radius:999px;background:rgba(226,232,240,1);overflow:hidden}
.ul-bar > i{display:block;height:100%;border-radius:999px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)}
.ul-faq-item{border:1px solid rgba(226,232,240,1);border-radius:16px;background:#fff;overflow:hidden}
.ul-faq-q{width:100%;text-align:left;padding:14px 16px;display:flex;justify-content:space-between;gap:14px;font-weight:900;color:var(--text);background:#fff;border:0;cursor:pointer}
.ul-faq-a{display:none;padding:14px 16px;background:rgba(245,158,11,.08);border-top:1px solid rgba(245,158,11,.18);color:var(--text);line-height:1.6}
.ul-faq-item[data-open="1"] .ul-faq-a{display:block}
.ul-faq-item[data-open="1"] .ul-faq-q span:last-child{transform:rotate(180deg)}
    `;
    document.head.appendChild(css);
  }

  function el(tag, attrs, html){
    var n = document.createElement(tag);
    if (attrs){
      Object.keys(attrs).forEach(function(k){
        if (k==="class") n.className = attrs[k];
        else if (k==="style") n.setAttribute("style", attrs[k]);
        else if (k==="text") n.textContent = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    if (html!==undefined && html!==null) n.innerHTML = html;
    return n;
  }

  function card(title, icon, pastelClass, bodyHtml){
    var c = el("div",{class:"ul-card"});
    var h = el("div",{class:"ul-card-h "+(pastelClass||"")}, "<span>"+(icon||"")+"</span><span>"+escapeHtml(title)+"</span>");
    var b = el("div",{class:"ul-card-b ul-rich"}, bodyHtml||"");
    c.appendChild(h); c.appendChild(b);
    return {card:c, body:b};
  }

  function renderNotFound(root, ctx){
    root.innerHTML = "";
    var box = el("div",{class:"ul-card"}, "");
    box.appendChild(el("div",{class:"ul-card-h ul-pastel-orange"}, "<span>⚠️</span><span>Fiche introuvable</span>"));
    box.appendChild(el("div",{class:"ul-card-b"}, "<div style='color:var(--text);font-weight:800'>Impossible de charger la fiche métier.</div><div style='color:var(--muted);margin-top:6px'>Vérifie l’URL : metier="+escapeHtml(ctx.metierSlug)+" • country="+escapeHtml(ctx.iso)+"</div>"));
    root.appendChild(box);
  }

  function render(){
    cleanupLegacy();
    ensureStyles();

    var root = document.getElementById("ulydia-metier-root");
    if (!root) return {ok:false, reason:"no-root"};

    var metierSlug = slug(qs("metier"));
    var iso = iso2(qs("country") || qs("iso"));
    var ctx = { metierSlug: metierSlug, iso: iso };

    // lookup base info
    var m=null, c=null;
    var metiers=getMetiers(), countries=getCountries();
    for (var i=0;i<metiers.length;i++){ if (slug(metiers[i] && metiers[i].slug)===metierSlug){ m=metiers[i]; break; } }
    for (var j=0;j<countries.length;j++){ if (iso2(countries[j] && countries[j].iso)===iso){ c=countries[j]; break; } }
    var metierName = (m && (m.name||m.slug)) || (metierSlug||"");
    var sector = (m && m.sector) || "—";
    var countryName = (c && (c.name||iso)) || iso;

    // language from country if present and no ?lang
    if (!lang2(qs("lang")) && c && lang2(c.language_finale)){
      LANG = lang2(c.language_finale) || LANG;
      try{ window.__ULYDIA_LANG__=LANG; document.documentElement.setAttribute("lang", LANG); }catch(e){}
    }

    // find MPB
    var bloc=null;
    var mpb=getMPB();
    for (var k=0;k<mpb.length;k++){
      var b=mpb[k];
      if (slug(b && b.metier)===metierSlug && iso2(b && b.iso)===iso){ bloc=b; break; }
    }
    // If MPB missing, show a clear message (no wrong content)
    if (!bloc){
      renderNotFound(root, ctx);
      return {ok:true, noMPB:true};
    }

    // banners resolve
    var bn = resolveBanners(iso);
    var href = sanitizeHref(bn.href||"");
    if (!href || href==="#") href = defaultSponsorHref(metierSlug, iso);

    // build page
    root.innerHTML = "";

    // HERO
    var hero = el("div",{class:"ul-hero"});
    var left = el("div",{}, "");
    left.appendChild(el("h1",{class:"ul-title", text: metierName || metierSlug}));
    left.appendChild(el("div",{class:"ul-chips"},
      "<span class='ul-chip'>Sector: "+escapeHtml(sector||"—")+"</span>"+
      "<span class='ul-chip'>Country: "+escapeHtml(iso||countryName||"—")+"</span>"
    ));
    hero.appendChild(left);
    root.appendChild(hero);

    // TOP WIDE BANNER
    var banner = el("a",{class:"ul-banner-wide", href: href, target: href.startsWith("/")?"_self":"_blank", rel:"noopener"}, "");
    banner.appendChild(el("div",{class:"ul-banner-bg"},""));
    if (bn.wide){
      var img = el("img",{src: bn.wide, alt:""}, "");
      banner.appendChild(img);
    }
    var txt = el("div",{class:"ul-banner-txt"},
      "<div><div style='font-size:16px'>Sponsor</div><small>"+escapeHtml(bn.name||"Découvrez nos offres partenaires")+"</small></div>"+
      "<div class='ul-banner-pill'>En savoir plus →</div>"
    );
    banner.appendChild(txt);
    root.appendChild(el("div",{style:"height:14px"},""));
    root.appendChild(banner);

    // MAIN GRID
    var grid = el("div",{class:"ul-grid"}, "");
    var colL = el("div",{class:"ul-col"}, "");
    var colR = el("div",{class:"ul-col"}, "");

    // Left cards (Formation / Accès / Marché)
    var c1 = card("Training","🎓","ul-pastel-pink", isEmptyRich(bloc.formation)?"":sanitizeHTML(bloc.formation));
    if (!isEmptyRich(bloc.formation)) colL.appendChild(c1.card);

    var c2 = card("Access to the role","🚪","ul-pastel-pink", isEmptyRich(bloc.acces)?"":sanitizeHTML(bloc.acces));
    if (!isEmptyRich(bloc.acces)) colL.appendChild(c2.card);

    var c3 = card("Market","📊","ul-pastel-pink", isEmptyRich(bloc.marche)?"":sanitizeHTML(bloc.marche));
    if (!isEmptyRich(bloc.marche)) colL.appendChild(c3.card);

    // Salary card
    (function(){
      var cur = norm(bloc.currency||"");
      var rJ = fmtRange(bloc.junior_min, bloc.junior_max, cur);
      var rM = fmtRange(bloc.mid_min, bloc.mid_max, cur);
      var rS = fmtRange(bloc.senior_min, bloc.senior_max, cur);
      var varShare = norm(bloc.variable_share || "");
      var notes = bloc.salary_notes || "";
      var hasAny = !!(rJ||rM||rS||varShare||(!isEmptyRich(notes)));
      if (!hasAny) return;

      var maxAll = Math.max(parseNum(bloc.junior_max)||0, parseNum(bloc.mid_max)||0, parseNum(bloc.senior_max)||0, parseNum(bloc.senior_min)||0) || 1;
      function pct(max){
        var m=parseNum(max);
        if (!m) return 0;
        var p=Math.round((m/maxAll)*100);
        return Math.max(10, Math.min(100, p));
      }
      var html = "";
      function row(lbl, range, w){
        if (!range) return;
        html += "<div class='ul-salary-row'>"+
          "<div class='ul-salary-lbl'><span>"+escapeHtml(lbl)+"</span><span style='color:var(--primary)'>"+escapeHtml(range)+"</span></div>"+
          "<div class='ul-bar'><i style='width:"+w+"%'></i></div>"+
        "</div>";
      }
      row("Junior", rJ, pct(bloc.junior_max));
      row("Mid", rM, pct(bloc.mid_max));
      row("Senior", rS, pct(bloc.senior_max));
      if (varShare || (!isEmptyRich(notes))){
        html += "<div style='margin-top:12px;padding:12px;border-radius:14px;background:rgba(99,102,241,.10);border:1px solid rgba(99,102,241,.18)'>";
        if (varShare) html += "<div style='font-weight:900;color:var(--primary);font-size:12px;margin-bottom:6px'>Variable</div><div style='font-weight:800;color:var(--text)'>"+escapeHtml(varShare)+"</div>";
        if (!isEmptyRich(notes)) html += "<div style='margin-top:10px' class='ul-rich'>"+sanitizeHTML(notes)+"</div>";
        html += "</div>";
      }
      colL.appendChild(card("Salary","💰","ul-pastel-purple", html).card);
    })();

    // Right sidebar: sponsor square + CTA
    (function(){
      var wrap = el("div",{class:"ul-card"}, "");
      wrap.appendChild(el("div",{class:"ul-card-h ul-pastel-blue"}, "<span>🏢</span><span>Premium</span>"));
      var body = el("div",{class:"ul-card-b"}, "");
      var row = el("div",{class:"ul-side-sponsor"}, "");
      var sq = el("a",{class:"ul-square", href: href, target: href.startsWith("/")?"_self":"_blank", rel:"noopener"}, "");
      if (bn.square) sq.appendChild(el("img",{src: bn.square, alt:""}, ""));
      else sq.innerHTML = "<span style='font-weight:900;color:var(--muted)'>Logo</span>";
      row.appendChild(sq);
      row.appendChild(el("div",{}, "<div style='font-weight:900;color:var(--text)'>"+escapeHtml(bn.name||"Partenaire")+"</div><div style='color:var(--muted);font-weight:700;font-size:13px'>"+escapeHtml(countryName||iso)+"</div>"));
      body.appendChild(row);
      body.appendChild(el("div",{style:"height:12px"},""));
      body.appendChild(el("a",{class:"ul-btn", href: href, target: href.startsWith("/")?"_self":"_blank", rel:"noopener"}, "En savoir plus"));
      wrap.appendChild(body);
      colR.appendChild(wrap);
    })();

    // Right sidebar: KPIs
    (function(){
      var items = [];
      function add(ico, k, v){
        v = norm(v);
        if (!v) return;
        items.push("<div class='ul-kpi-item'><div class='ul-kpi-ico'>"+ico+"</div><div><div class='ul-kpi-k'>"+escapeHtml(k)+"</div><div class='ul-kpi-v'>"+escapeHtml(v)+"</div></div></div>");
      }
      add("🏠","Remote", bloc.remote_level);
      add("🤖","Automation risk", bloc.automation_risk);
      add("⏱️","Time to employability", bloc.time_to_employability);
      add("📈","Growth outlook", bloc.growth_outlook);
      add("🔥","Market demand", bloc.market_demand);
      add("🧾","Statut", bloc.statut_generation);

      if (!items.length) return;
      colR.appendChild(card("Key indicators","📌","ul-pastel-green","<div class='ul-kpi'>"+items.join("")+"</div>").card);
    })();

    // Right sidebar: skills & path
    (function(){
      var top = splitItems(bloc.top_fields);
      var must = splitItems(bloc.skills_must_have);
      var soft = splitItems(bloc.soft_skills);
      var tools = splitItems(bloc.tools_stack);

      var html = "";
      function row(lbl, arr, kind){
        if (!arr || !arr.length) return;
        if (kind==="tags"){
          html += "<div style='margin-bottom:10px'><div style='font-weight:900;color:var(--muted);font-size:12px;margin-bottom:6px'>"+escapeHtml(lbl)+"</div><div class='ul-tags'>"+arr.slice(0,10).map(function(t){ return "<span class='ul-tag'>"+escapeHtml(t)+"</span>"; }).join("")+"</div></div>";
        } else if (kind==="skills"){
          html += "<div style='margin-bottom:10px'><div style='font-weight:900;color:var(--muted);font-size:12px;margin-bottom:6px'>"+escapeHtml(lbl)+"</div>"+arr.slice(0,6).map(function(t){ return "<div class='ul-skill'><span style='font-size:18px'>🧩</span><span style='font-weight:900;color:var(--text)'>"+escapeHtml(t)+"</span></div>"; }).join("")+"</div>";
        }
      }
      row("Key fields", top, "tags");
      row("Must-have skills", must, "skills");
      row("Soft skills", soft, "skills");
      row("Tools / stack", tools, "tags");

      if (!html) return;
      colR.appendChild(card("Skills & path","🧠","ul-pastel-blue", html).card);
    })();

    // Optional rich blocks on right (certs, schools, portfolio)
    if (!isEmptyRich(bloc.certifications)) colR.appendChild(card("Certifications","🏅","ul-pastel-orange", sanitizeHTML(bloc.certifications)).card);
    if (!isEmptyRich(bloc.schools_or_paths)) colR.appendChild(card("Schools & paths","🏫","ul-pastel-orange", sanitizeHTML(bloc.schools_or_paths)).card);
    if (!isEmptyRich(bloc.portfolio_projects)) colR.appendChild(card("Portfolio projects","🧪","ul-pastel-orange", sanitizeHTML(bloc.portfolio_projects)).card);

    grid.appendChild(colL);
    grid.appendChild(colR);
    root.appendChild(grid);

    // BEFORE FAQ banner slot (optional existing node)
    (function(){
      var slot = document.getElementById("ulydia-banner-before-faq-slot");
      if (!slot){
        slot = el("div",{style:"max-width:1200px;margin:22px auto 0;padding:0 18px"}, "");
        // insert after grid
        root.parentElement && root.parentElement.insertBefore(slot, root.nextSibling);
      } else {
        slot.innerHTML = "";
        slot.style.maxWidth="1200px";
        slot.style.margin="22px auto 0";
        slot.style.padding="0 18px";
      }
      if (bn.wide){
        var a = el("a",{class:"ul-banner-wide", href: href, target: href.startsWith("/")?"_self":"_blank", rel:"noopener"}, "");
        a.appendChild(el("div",{class:"ul-banner-bg"},""));
        a.appendChild(el("img",{src: bn.wide, alt:""}, ""));
        a.appendChild(el("div",{class:"ul-banner-txt"}, "<div><div style='font-size:16px'>Sponsor</div><small>"+escapeHtml(bn.name||"Partenaire")+"</small></div><div class='ul-banner-pill'>En savoir plus →</div>"));
        slot.appendChild(a);
      }
    })();

    // FAQ
    (function(){
      var faqs = getFaqs();
      // filter safe: if FAQ items include metier name, match it; else assume already filtered
      var key = slug(metierName || metierSlug);
      var filtered = faqs.filter(function(f){
        var m = norm(f && (f.metier || f.job || f.role || f.metier_name || f.metierName || ""));
        if (!m) return true;
        return slug(m) === key;
      }).filter(function(f){
        var q = norm(f && (f.question || f.q || ""));
        var a = String(f && (f.answer || f.a || f.reponse || "") || "").trim();
        return !!q && !isEmptyRich(a);
      });

      if (!filtered.length) return;

      var wrap = el("div",{style:"max-width:1200px;margin:22px auto 0;padding:0 18px"}, "");
      var faqCard = el("div",{class:"ul-card"}, "");
      faqCard.appendChild(el("div",{class:"ul-card-h ul-pastel-orange"}, "<span>❓</span><span>Questions fréquentes</span>"));
      var b = el("div",{class:"ul-card-b"}, "");
      filtered.slice(0,12).forEach(function(f, idx){
        var q = norm(f.question || f.q || "");
        var a = String(f.answer || f.a || f.reponse || "").trim();
        var item = el("div",{class:"ul-faq-item", "data-open":"0"}, "");
        var btn = el("button",{class:"ul-faq-q", type:"button"}, "<span>"+escapeHtml(q)+"</span><span style='display:inline-block;transition:transform .15s'>⌄</span>");
        var ans = el("div",{class:"ul-faq-a"}, sanitizeHTML(a));
        btn.addEventListener("click", function(){
          var isOpen = item.getAttribute("data-open")==="1";
          // close all
          b.querySelectorAll(".ul-faq-item").forEach(function(x){ x.setAttribute("data-open","0"); });
          item.setAttribute("data-open", isOpen ? "0" : "1");
        });
        item.appendChild(btn);
        item.appendChild(ans);
        b.appendChild(item);
      });
      faqCard.appendChild(b);
      wrap.appendChild(faqCard);
      // append after slot/banner
      (document.getElementById("ulydia-banner-before-faq-slot") || root).insertAdjacentElement("afterend", wrap);
    })();

    try{ window.dispatchEvent(new Event("ULYDIA:METIER_READY")); }catch(e){}
    return {ok:true};
  }

  function boot(){
    var t0=Date.now(), MAX=4000, done=false;
    function tick(){
      if (done) return;
      var res=null;
      try{ res = render(); }catch(e){ done=true; log("render error", e); return; }
      if (res && res.ok){ done=true; log("render ok", res); return; }
      if (Date.now()-t0>MAX){ done=true; log("render timeout", res); return; }
      setTimeout(tick, 80);
    }
    tick();
  }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();