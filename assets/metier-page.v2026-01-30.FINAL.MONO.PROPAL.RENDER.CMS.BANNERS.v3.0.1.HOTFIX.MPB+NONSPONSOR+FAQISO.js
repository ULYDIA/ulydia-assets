(function(){
  "use strict";

  // =========================================================
  // ULYDIA — Metier Page — MONO BUNDLE — v3.0 DESIGNFULL
  // - Always renders Fiche Métier fields (description/missions/...) when present
  // - Also renders MPB blocks (formation/acces/marche/environnements) when present
  // - Banners:
  //   * Non-sponsor banners from Countries CMS (wide+square)
  //   * Sponsor banners from Airtable via Worker endpoint /v1/metier-page
  // =========================================================

  if (window.__ULYDIA_METIER_PAGE_V29__) return;
  window.__ULYDIA_METIER_PAGE_V29__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__ || !!window.__ULYDIA_DEBUG__;
  function log(){ if (DEBUG) try{ console.log.apply(console, arguments); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, arguments); }catch(e){} }

  // ---------- helpers ----------
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }
  function pickUrl(){
    for (var i=0;i<arguments.length;i++){
      var v = arguments[i];
      if (!v) continue;
      if (typeof v === "string"){
        var s = v.trim();
        if (s) return s;
      }
      if (typeof v === "object"){
        // Webflow image field sometimes is {url:...}
        var u = v.url || v.src || v.href;
        if (u && String(u).trim()) return String(u).trim();
      }
    }
    return "";
  }
  function parseJSONScript(id){
    var el = document.getElementById(id);
    if (!el) return null;
    var txt = (el.textContent||"").trim();
    if (!txt) return null;
    try{ return JSON.parse(txt); }catch(e){ return null; }
  }
  function slugify(s){
    s = norm(s).toLowerCase();
    // replace french accents
    s = s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : s;
    s = s.replace(/['’]/g,"");
    s = s.replace(/[^a-z0-9]+/g, "-");
    s = s.replace(/^-+|-+$/g, "");
    return s;
  }

  function getQuery(){
    var q = new URLSearchParams(location.search);
    var metier = q.get("metier") || "";
    var country = q.get("country") || q.get("pays") || "";
    return { metier: metier.trim(), country: country.trim().toUpperCase() };
  }

  function getMetiers(){
    return window.__ULYDIA_METIERS__ || parseJSONScript("metiersData") || [];
  }
  function getCountries(){
    return window.__ULYDIA_COUNTRIES__
      || parseJSONScript("countriesData")
      || parseJSONScript("paysData")
      || window.__ULYDIA_PAYS__
      || [];
  }
  function getMPB(){
    return window.__ULYDIA_METIER_PAYS_BLOCS__ || window.__ULYDIA_METIER_PAYS_BLOC__ || [];
  }
  function getFAQs(){
    return window.__ULYDIA_FAQS__ || [];
  }

  function getFicheMetiers(){
    var fm = window.__ULYDIA_FICHE_METIERS__ || [];
    if (Array.isArray(fm) && fm.length) return fm;
    // fallback: reuse __ULYDIA_METIERS__ if it contains fiche fields
    var m = getMetiers();
    if (Array.isArray(m) && m.length){
      var hasAny = m.some(function(x){
        return x && (x.description || x.missions || x.environnements || x.profil_recherche || x.evolutions_possibles || x.competences);
      });
      if (hasAny) return m;
    }
    // fallback: try dom scan of .js-fiche-* classes
    try{
      var items = Array.prototype.slice.call(document.querySelectorAll('.w-dyn-item'));
      var out = [];
      items.forEach(function(item){
        var slug = norm(item.querySelector('.js-metier-slug') && item.querySelector('.js-metier-slug').textContent);
        var name = norm(item.querySelector('.js-metier-name') && item.querySelector('.js-metier-name').textContent);
        if (!slug && !name) return;
        out.push({
          slug: slug,
          name: name,
          accroche: norm(item.querySelector('.js-fiche-accroche') && item.querySelector('.js-fiche-accroche').textContent),
          description: (item.querySelector('.js-fiche-description') && item.querySelector('.js-fiche-description').innerHTML) || "",
          missions: (item.querySelector('.js-fiche-missions') && item.querySelector('.js-fiche-missions').innerHTML) || "",
          competences: (item.querySelector('.js-fiche-competences') && item.querySelector('.js-fiche-competences').innerHTML) || "",
          environnements: (item.querySelector('.js-fiche-environnements') && item.querySelector('.js-fiche-environnements').innerHTML) || "",
          profil_recherche: (item.querySelector('.js-fiche-profil_recherche') && item.querySelector('.js-fiche-profil_recherche').innerHTML) || "",
          evolutions_possibles: (item.querySelector('.js-fiche-evolutions_possibles') && item.querySelector('.js-fiche-evolutions_possibles').innerHTML) || ""
        });
      });
      if (out.length) return out;
    }catch(e){}
    return [];
  }

  function findMetierBySlug(slug){
    slug = slugify(slug);
    var list = getMetiers();
    return (list||[]).find(function(x){ return x && slugify(x.slug||x.Slug||x.metier||x.name) === slug; }) || null;
  }

  function findFiche(slug){
    slug = slugify(slug);
    var list = getFicheMetiers();
    return (list||[]).find(function(x){
      if (!x) return false;
      var s = slugify(x.slug || x.Slug || x.metier || x.name);
      var n = slugify(x.name || x.Nom);
      return s === slug || n === slug;
    }) || null;
  }

  function findCountry(iso){
    iso = String(iso||"").toUpperCase();
    var list = getCountries();
    return (list||[]).find(function(c){
      if (!c) return false;
      var v = String(c.iso || c.code_iso || c.codeIso || c.country_code || c.countryCode || c.code || "").toUpperCase();
      return v === iso;
    }) || null;
  }

  function findMPB(slug, iso){
    var list = getMPB();
    if (!Array.isArray(list)) list = [];
    var sslug = slugify(slug);
    var ciso = String(iso||"").toUpperCase();
    return list.find(function(b){
      if (!b) return false;
      var bslug = slugify(b.slug || b.metier_slug || b.metier || b.metier_name || b.name);
      var biso = String(b.iso || b.code_iso || b.country || b.country_code || "").toUpperCase();
      // MPB can store metier NAME instead of slug
      var bname = slugify(b.metier || b.metier_name || b.name || "");
      return (biso === ciso) && (bslug === sslug || bname === sslug);
    }) || null;
  }

  
function findFAQsForMetier(metierNameOrSlug, iso){
  var list = getFAQs();
  if (!Array.isArray(list)) list = [];
  var target = slugify(metierNameOrSlug);
  var isoUp = String(iso||"").toUpperCase();

  return list.filter(function(f){
    if (!f) return false;

    // If FAQ is country-specific, it must match
    var fIso = String(f.iso || f.country_iso || f.country || f.pays_iso || "").toUpperCase();
    if (fIso && isoUp && fIso !== isoUp) return false;

    // FAQ matching uses Name (or fallback to slug)
    var key = f.metier_name || f.metier || f.metierName || f.name || f.metier_title || "";
    if (!key) key = f.slug || "";
    return slugify(key) === target;
  });
}


  // ---------- Worker (sponsor) ----------
  function getWorkerUrl(){
    // accept older names
    return window.ULYDIA_WORKER_URL || window.__ULYDIA_WORKER_URL__ || window.ULYDIA_WORKER || "";
  }
  function getProxySecret(){
    return window.ULYDIA_PROXY_SECRET || window.ULYDIA_PROXY || window.ULYDIA_PROXY_TOKEN || "";
  }

  function fetchSponsor(metierSlug, iso){
    var worker = getWorkerUrl();
    if (!worker) return Promise.resolve(null);

    var url = worker.replace(/\/$/,"") + "/v1/metier-page?metier=" + encodeURIComponent(metierSlug) + "&country=" + encodeURIComponent(String(iso||"").toUpperCase());
    var headers = {};
    var sec = getProxySecret();
    if (sec) headers["x-ulydia-proxy-secret"] = sec;

    return fetch(url, { headers: headers })
      .then(function(r){ return r.json(); })
      .then(function(j){
        if (!j || j.ok === false) return null;
        // sponsor may be in j.sponsor or in j.pays.sponsor etc
        return j.sponsor || (j.pays && j.pays.sponsor) || null;
      })
      .catch(function(e){
        warn("[ULYDIA] sponsor fetch failed", e);
        return null;
      });
  }

  // ---------- DOM render ----------
  function ensureRoot(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root){
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.appendChild(root);
    }
    root.innerHTML = "";
    return root;
  }

  function injectCSS(){
    if (document.getElementById("ulydia-metier-v29-css")) return;
    var css = `
      #ulydia-metier-root{max-width:1100px;margin:0 auto;padding:34px 18px 80px 18px;}
      .u-row{display:grid;grid-template-columns:1.45fr 0.85fr;gap:24px;align-items:start;}
      @media(max-width:980px){.u-row{grid-template-columns:1fr;}}
      .u-title{font-size:58px;line-height:1.05;margin:0 0 12px 0;color:#6466ff;font-weight:800;letter-spacing:-0.02em;}
      @media(max-width:680px){.u-title{font-size:44px;}}
      .u-pills{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 18px 0;}
      .u-pill{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #e6e8ef;border-radius:999px;background:#fff;color:#4b5563;font-weight:600;font-size:12px;}
      .u-accroche{margin:0 0 18px 0;color:#5b6475;font-size:15px;max-width:720px;}
      .u-card{background:#fff;border:1px solid #eef0f4;border-radius:14px;box-shadow:0 10px 25px rgba(16,24,40,.06);overflow:hidden;}
      .u-card-h{padding:14px 16px;font-weight:800;color:#111827;font-size:14px;display:flex;align-items:center;gap:8px;background:#f6f7ff;border-bottom:1px solid #eef0f4;}
      .u-card-b{padding:14px 16px;color:#374151;font-size:13.5px;line-height:1.6;}
      .u-stack{display:flex;flex-direction:column;gap:14px;}

      .u-banner{border-radius:16px;border:1px solid rgba(255,255,255,.18);box-shadow:0 14px 36px rgba(20,20,60,.15);overflow:hidden;}
      .u-banner-inner{padding:18px 18px;display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:86px;}
      .u-banner-left .u-banner-k{font-weight:800;color:#fff;font-size:14px;margin:0 0 4px 0;}
      .u-banner-left .u-banner-t{color:rgba(255,255,255,.92);font-weight:600;font-size:12.5px;margin:0;}
      .u-banner-cta{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:rgba(255,255,255,.18);color:#fff;font-weight:800;text-decoration:none;border:1px solid rgba(255,255,255,.22);white-space:nowrap;}
      .u-banner-cta:hover{background:rgba(255,255,255,.26);}

      .u-premium{border-radius:14px;border:1px solid #eef0f4;overflow:hidden;background:#fff;}
      .u-premium-h{padding:12px 14px;font-weight:900;font-size:13px;background:#e9f3ff;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px;}
      .u-premium-b{padding:14px;display:flex;flex-direction:column;gap:10px;}
      .u-sq{width:88px;height:88px;border-radius:12px;border:1px solid #eef0f4;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;}
      .u-sq img{width:100%;height:100%;object-fit:cover;display:block;}
      .u-prem-row{display:flex;align-items:center;gap:12px;}
      .u-prem-name{font-weight:900;color:#111827;font-size:13px;}
      .u-prem-sub{color:#6b7280;font-weight:700;font-size:12px;}
      .u-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:10px;border:1px solid #dbe2ff;background:#f3f5ff;color:#4f46e5;font-weight:900;font-size:12px;text-decoration:none;}
      .u-btn:hover{filter:brightness(.98);}

      .u-tags{display:flex;flex-wrap:wrap;gap:8px;}
      .u-tag{display:inline-flex;align-items:center;padding:7px 10px;border-radius:999px;background:#f1f3ff;border:1px solid #e5e7ff;color:#4f46e5;font-weight:800;font-size:11px;}

      .u-faq-item{border-top:1px solid #eef0f4;}
      .u-faq-q{cursor:pointer;display:flex;justify-content:space-between;gap:14px;padding:14px 16px;font-weight:900;color:#111827;font-size:13px;}
      .u-faq-a{display:none;padding:0 16px 14px 16px;color:#374151;font-size:13px;line-height:1.6;}
      .u-faq-item.open .u-faq-a{display:block;}
      .u-faq-item.open .u-faq-q span:last-child{transform:rotate(180deg);}

      .u-muted{color:#6b7280;}
    `;

    var st = document.createElement("style");
    st.id = "ulydia-metier-v29-css";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function card(title, bgClass, bodyHTML){
    var c = document.createElement("div");
    c.className = "u-card";
    var h = document.createElement("div");
    h.className = "u-card-h";
    h.textContent = title;
    var b = document.createElement("div");
    b.className = "u-card-b";
    b.innerHTML = bodyHTML || "";
    c.appendChild(h);
    c.appendChild(b);
    return c;
  }

  


function renderMPBCards(ctx){
  var b = ctx.mpb || null;
  if (!b) return [];

  function htmlOf(v){ return v ? String(v) : ""; }

  // Support several possible keys (historical)
  var formation = htmlOf(b.formation || b.training || b.la_formation || b.formations);
  var acces     = htmlOf(b.acces || b.access || b.acces_metier || b.acces_au_metier);
  var marche    = htmlOf(b.marche || b.market || b.le_marche || b.marche_du_travail);
  var remun     = htmlOf(b.remuneration || b.salaire || b.salary || b.remu || b.remunerations);

  var out = [];
  if (formation) out.push(card("Formation", "", formation));
  if (acces)     out.push(card("Accès au métier", "", acces));
  if (marche)    out.push(card("Marché de l’emploi", "", marche));
  if (remun)     out.push(card("Rémunération", "", remun));
  return out;
}


function renderFAQ(list){
  list = list || [];
  if (!list.length) return document.createTextNode(""); // ✅ hide whole section if none

  var wrap = document.createElement("section");
  wrap.className = "u-faq-wrap";

  var head = document.createElement("div");
  head.className = "u-faq-head";
  head.innerHTML = '<span class="u-faq-dot">?</span> Questions fréquentes';
  wrap.appendChild(head);

  var ul = document.createElement("div");
  ul.className = "u-faq-list";

  list.forEach(function(f, i){
    var item = document.createElement("div");
    item.className = "u-faq-item";

    var btn = document.createElement("button");
    btn.className = "u-faq-q";
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");

    var q = document.createElement("span");
    q.innerHTML = esc(f.q || f.question || "");
    var ic = document.createElement("span");
    ic.className = "u-faq-ic";
    ic.textContent = "▾";

    btn.appendChild(q);
    btn.appendChild(ic);

    var ans = document.createElement("div");
    ans.className = "u-faq-a";
    ans.hidden = true;
    ans.innerHTML = (f.a || f.answer || "<p></p>");

    btn.addEventListener("click", function(){
      var open = btn.getAttribute("aria-expanded")==="true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      ans.hidden = open;
      item.classList.toggle("is-open", !open);
    });

    item.appendChild(btn);
    item.appendChild(ans);
    ul.appendChild(item);
  });

  wrap.appendChild(ul);
  return wrap;
}


  
function renderTopBanner(ctx){
  var sponsor = ctx.sponsor || null;
  var c = ctx.country || {};
  var wideUrl =
    pickUrl(sponsor && (sponsor.banner_wide || sponsor.banner_1 || sponsor.image_1 || sponsor.logo_1 || sponsor.sponsor_logo_1 || sponsor.sponsor_logo_1_url || sponsor.logo_1_url)) ||
    pickUrl(c.banner_wide || c.banniere_wide || c.banniere_sponsorisation_image_1 || c.banniere_sponsorisation_image_1_url || c.banner_wide_url || c.image_1 || c.image1) ||
    "";

  var text = "";
  var cta = "";
  var link = "";
  if (sponsor) {
    text = sponsor.text || sponsor.banner_text || sponsor.banniere_texte || "Découvrez nos offres partenaires";
    cta  = sponsor.cta  || sponsor.banner_cta  || sponsor.banniere_cta  || "En savoir plus";
    link = sponsor.link || sponsor.url || sponsor.lien || sponsor.lien_sponsor || "#";
  } else {
    text = c.banner_text || c.banniere_texte || "Découvrez nos offres partenaires";
    cta  = c.banner_cta  || c.banniere_cta  || "En savoir plus";
    link = c.banner_link || c.banniere_lien || c.banner_url || "#";
  }

  var wrap = document.createElement("div");
  wrap.className = "u-top-banner";
  if (wideUrl) {
    wrap.style.backgroundImage = "linear-gradient(90deg, rgba(67,56,202,.92), rgba(124,58,237,.88)), url('"+esc(wideUrl)+"')";
    wrap.style.backgroundSize = "cover";
    wrap.style.backgroundPosition = "center";
  }

  wrap.innerHTML =
    '<div class="u-top-left">' +
      '<div class="u-top-title">Sponsor</div>' +
      '<div class="u-top-sub">'+esc(text)+'</div>' +
    '</div>' +
    '<a class="u-top-cta" href="'+esc(link || "#")+'" target="_blank" rel="noopener">'+esc(cta)+' →</a>';

  return wrap;
}


function renderPremiumCard(ctx){
  var sponsor = ctx.sponsor || null;
  var c = ctx.country || {};

  // Square image: sponsor square first, else country square
  var sq =
    pickUrl(sponsor && (sponsor.banner_square || sponsor.banner_2 || sponsor.image_2 || sponsor.logo_2 || sponsor.sponsor_logo_2 || sponsor.sponsor_logo_2_url || sponsor.logo_2_url)) ||
    pickUrl(c.banner_square || c.banniere_square || c.banniere_sponsorisation_image_2 || c.banniere_sponsorisation_image_2_url || c.banner_square_url || c.image_2 || c.image2) ||
    "";

  var name = sponsor ? (sponsor.name || sponsor.sponsor_name || sponsor.company || "Partenaire") : "Partenaire";
  var iso  = (ctx.iso || (c && c.iso) || "").toUpperCase();
  var cta  = sponsor ? (sponsor.cta || sponsor.banner_cta || "En savoir plus") : (c.banner_cta || c.banniere_cta || "En savoir plus");
  var link = sponsor ? (sponsor.link || sponsor.url || sponsor.lien_sponsor || "#") : (c.banner_link || c.banniere_lien || c.banner_url || "#");

  var wrap = document.createElement("aside");
  wrap.className = "u-premium";

  var html =
    '<div class="u-premium-head">Premium</div>' +
    '<div class="u-premium-body">' +
      '<div class="u-premium-row">' +
        (sq ? '<div class="u-sq"><img alt="" src="'+esc(sq)+'"/></div>' : '<div class="u-sq u-sq-empty">Logo</div>') +
        '<div class="u-premium-meta">' +
          '<div class="u-premium-name">'+esc(name)+'</div>' +
          (iso ? '<div class="u-premium-iso">'+esc(iso)+'</div>' : '') +
        '</div>' +
      '</div>' +
      '<a class="u-premium-cta" href="'+esc(link || "#")+'" target="_blank" rel="noopener">'+esc(cta)+'</a>' +
    '</div>';

  wrap.innerHTML = html;
  return wrap;
}


  function renderSkillTags(title, items){
    var html = '';
    if (items && items.length){
      html += '<div class="u-tags">'+ items.map(function(t){ return '<span class="u-tag">'+esc(t)+'</span>'; }).join('') + '</div>';
    } else {
      html = '<span class="u-muted">—</span>';
    }
    return card(title, '', html);
  }

  function splitTags(s){
    s = String(s||'');
    if (!s.trim()) return [];
    return s.split(/\s*[,;\n]\s*|\s*&nbsp;\s*/).map(function(x){return norm(x);}).filter(Boolean);
  }

  function renderPage(ctx){
    injectCSS();
    var root = ensureRoot();

    var head = document.createElement('div');
    var title = document.createElement('h1');
    title.className = 'u-title';
    title.textContent = ctx.name || ctx.slug || 'Métier';

    head.appendChild(title);

    var pills = document.createElement('div');
    pills.className = 'u-pills';
    pills.innerHTML = '<span class="u-pill">Sector: <b>'+esc(ctx.sector || '—')+'</b></span>'+
      '<span class="u-pill">Country: <b>'+esc(ctx.iso || '—')+'</b></span>';

    head.appendChild(pills);

    if (ctx.accroche){
      var acc = document.createElement('p');
      acc.className = 'u-accroche';
      acc.textContent = ctx.accroche;
      head.appendChild(acc);
    }

    root.appendChild(head);

    // Sponsor banner (wide)
    root.appendChild(renderTopBanner(ctx));

    var row = document.createElement('div');
    row.className = 'u-row';

    var left = document.createElement('div');
    left.className = 'u-stack';

    


    var right = document.createElement('div');
    right.className = 'u-stack';

    right.appendChild(renderPremiumCard(ctx));

    // Indicators / tags based on MPB
    if (ctx.mpb){
      var ind = [];
      if (ctx.mpb.remote_level) ind.push('Remote: '+ctx.mpb.remote_level);
      if (ctx.mpb.automation_risk) ind.push('Automation: '+ctx.mpb.automation_risk);
      if (ctx.mpb.time_to_employability) ind.push('Time: '+ctx.mpb.time_to_employability);
      if (ctx.mpb.growth_outlook) ind.push('Growth: '+ctx.mpb.growth_outlook);
      if (ctx.mpb.market_demand) ind.push('Demand: '+ctx.mpb.market_demand);
      if (ind.length) right.appendChild(card('Key indicators', '', '<div style="display:flex;flex-direction:column;gap:8px;">'+ind.map(function(x){return '<div>'+esc(x)+'</div>';}).join('')+'</div>'));

      var keyFields = splitTags(ctx.mpb.key_fields);
      var mustHave = splitTags(ctx.mpb.skills_must_have);
      var soft = splitTags(ctx.mpb.soft_skills);
      var tools = splitTags(ctx.mpb.tools_stack);
      if (keyFields.length || mustHave.length || soft.length || tools.length){
        var html2 = '';
        if (keyFields.length) html2 += '<div style="margin-bottom:10px;"><div style="font-weight:900;margin-bottom:8px;">Key fields</div><div class="u-tags">'+keyFields.map(function(t){return '<span class="u-tag">'+esc(t)+'</span>';}).join('')+'</div></div>';
        if (mustHave.length) html2 += '<div style="margin-bottom:10px;"><div style="font-weight:900;margin-bottom:8px;">Must-have skills</div><div class="u-tags">'+mustHave.map(function(t){return '<span class="u-tag">'+esc(t)+'</span>';}).join('')+'</div></div>';
        if (soft.length) html2 += '<div style="margin-bottom:10px;"><div style="font-weight:900;margin-bottom:8px;">Soft skills</div><div class="u-tags">'+soft.map(function(t){return '<span class="u-tag">'+esc(t)+'</span>';}).join('')+'</div></div>';
        if (tools.length) html2 += '<div><div style="font-weight:900;margin-bottom:8px;">Tools / stack</div><div class="u-tags">'+tools.map(function(t){return '<span class="u-tag">'+esc(t)+'</span>';}).join('')+'</div></div>';
        right.appendChild(card('Skills & path', '', html2));
      }

      if (ctx.mpb.certifications) right.appendChild(card('Certifications', '', ctx.mpb.certifications));
      if (ctx.mpb.schools_or_paths) right.appendChild(card('Schools & paths', '', ctx.mpb.schools_or_paths));
      if (ctx.mpb.portfolio_projects) right.appendChild(card('Portfolio projects', '', ctx.mpb.portfolio_projects));
    }

    row.appendChild(right);
    root.appendChild(row);

    // FAQ bottom
    var faqs = findFAQsForMetier(ctx.name || ctx.slug, ctx.iso);
    root.appendChild(document.createElement('div')).style.height = '18px';
    root.appendChild(renderFAQ(faqs));
  }

  // ---------- main ----------
  function main(){
    var q = getQuery();
    if (!q.metier || !q.country){
      ensureRoot().innerHTML = '<div class="u-card"><div class="u-card-h">Fiche introuvable</div><div class="u-card-b">URL invalide. Utilise <b>?metier=slug&country=FR</b>.</div></div>';
      return;
    }

    var metier = findMetierBySlug(q.metier);
    var fiche = findFiche(q.metier);
    var country = findCountry(q.country);
    var mpb = findMPB(q.metier, q.country);

    var ctx = {
      slug: slugify(q.metier),
      iso: q.country,
      name: (metier && (metier.name || metier.Nom)) || (fiche && (fiche.name || fiche.Nom)) || q.metier,
      sector: (metier && (metier.secteur || metier.sector)) || (fiche && (fiche.secteur || fiche.sector)) || '',
      accroche: (fiche && (fiche.accroche || fiche.accroche_texte || fiche.accrocheTexte)) || '',
      currency: (country && (country.currency || country.devise)) || (mpb && (mpb.devise || mpb.currency)) || '',
      fiche: fiche,
      country: country,
      mpb: mpb,
      sponsor: null
    };

    // render quickly without sponsor then enrich
    renderPage(ctx);

    fetchSponsor(ctx.slug, ctx.iso).then(function(s){
      if (s){
        ctx.sponsor = s;
        // rerender (idempotent)
        renderPage(ctx);
      }
    });

    log('[ULYDIA] v2.9 ready', {metier: ctx.slug, iso: ctx.iso, hasFiche: !!ctx.fiche, hasMPB: !!ctx.mpb, hasCountry: !!ctx.country});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();