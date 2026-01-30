/* =========================================================
 ULYDIA — Metier Page — MONO BUNDLE — v2.4 (DESIGNFULL)
 - ✅ No firewall / no hooks / no dynamic script injection
 - ✅ Sources (Webflow CMS via embeds -> globals):
     window.__ULYDIA_METIERS__                 (array)
     window.__ULYDIA_COUNTRIES__              (array)
     window.__ULYDIA_METIER_PAYS_BLOCS__      (array)  [from CMS Reader V2]
     window.__ULYDIA_FAQS__                   (array)
   Optional (if you later add it):
     window.__ULYDIA_FICHE_METIERS__          (array)
 - ✅ Fallback DOM scan (safe) for Fiche Metier + Countries if globals missing fields
 - ✅ Non-sponsor banners: Countries collection (banner_wide + banner_square + text + cta)
 - ✅ Sponsor banners: Airtable Sponsoring_Metiers via Worker /v1/metier-page (safe, optional)
 - ✅ Rule: If NO MPB for (metier+iso) => render ONLY Fiche Metier (no MPB salary/indicators/skills)
========================================================= */
;(function(){
  "use strict";
  if (window.__ULYDIA_METIER_PAGE_V24__) return;
  window.__ULYDIA_METIER_PAGE_V24__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG) console.log.apply(console, arguments); }
  function warn(){ console.warn.apply(console, arguments); }

  // ----------------------------
  // Utils
  // ----------------------------
  function qs(k){
    try{
      var u = new URL(window.location.href);
      return (u.searchParams.get(k) || "").trim();
    }catch(e){ return ""; }
  }
  function norm(s){
    return String(s||"").replace(/\s+/g," ").trim();
  }
  function stripAccents(s){
    try{ return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
    catch(e){ return String(s||""); }
  }
  function slugify(s){
    s = stripAccents(String(s||"").toLowerCase());
    s = s.replace(/['"]/g,"");
    s = s.replace(/[^a-z0-9]+/g,"-");
    s = s.replace(/-+/g,"-").replace(/^-|-$/g,"");
    return s;
  }
  function keyNorm(s){
    // tolerant compare for metier names/slugs coming from different collections
    var a = stripAccents(String(s||"").toLowerCase());
    a = a.replace(/&nbsp;|&#160;/g," ");
    a = a.replace(/[-_/]+/g," ");
    a = a.replace(/\s+/g," ").trim();
    return a;
  }
  function html(el){ return el ? String(el.innerHTML||"").trim() : ""; }
  function text(el){ return el ? norm(el.textContent||"") : ""; }
  function pickImgSrc(el){
    if (!el) return "";
    var s = (el.getAttribute("src") || el.getAttribute("data-src") || "").trim();
    if (s) return s;
    // in rare cases: <div style="background-image:url(...)">
    var bg = (el.style && el.style.backgroundImage) ? el.style.backgroundImage : "";
    var m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/i);
    return (m && m[1]) ? m[1] : "";
  }
  function safeNum(v){
    var s = String(v||"").replace(/\s/g,"").replace(",",".");
    s = s.replace(/[^0-9.]/g,"");
    if (!s) return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  // ----------------------------
  // Read data from globals
  // ----------------------------
  function getArrayGlobal(name){
    var v = window[name];
    return Array.isArray(v) ? v : [];
  }
  function findCountry(iso){
    iso = String(iso||"").toUpperCase();
    var arr = getArrayGlobal("__ULYDIA_COUNTRIES__");
    for (var i=0;i<arr.length;i++){
      var c = arr[i]||{};
      if (String(c.iso||c.code_iso||"").toUpperCase() === iso) return c;
    }
    return null;
  }
  function findMetier(slug){
    var arr = getArrayGlobal("__ULYDIA_METIERS__");
    var s = slugify(slug);
    for (var i=0;i<arr.length;i++){
      var m = arr[i]||{};
      var ms = slugify(m.slug || m.metier || m.name || "");
      if (ms === s) return m;
    }
    return null;
  }
  function findMPB(slug, iso, metierName){
    var arr = getArrayGlobal("__ULYDIA_METIER_PAYS_BLOCS__");
    var s = slugify(slug);
    var n1 = keyNorm(slug);
    var n2 = keyNorm(metierName);
    iso = String(iso||"").toUpperCase();

    for (var i=0;i<arr.length;i++){
      var b = arr[i]||{};
      var bi = String(b.iso||b.country_code||"").toUpperCase();
      if (bi !== iso) continue;

      var bm = b.metier || b.job_slug || b.slug || b.name || "";
      if (slugify(bm) === s) return b;
      if (keyNorm(bm) === n1) return b;
      if (n2 && keyNorm(bm) === n2) return b;
    }
    return null;
  }
  function filterFaqs(iso, metierName, metierSlug){
    var arr = getArrayGlobal("__ULYDIA_FAQS__");
    var out = [];
    var isoU = String(iso||"").toUpperCase();
    var nName = keyNorm(metierName);
    var nSlug = keyNorm(metierSlug);

    for (var i=0;i<arr.length;i++){
      var f = arr[i]||{};
      var fi = String(f.iso||f.country||"").toUpperCase();
      if (fi && fi !== isoU) continue;

      var fm = f.metier || f.job || f.slug || f.name || "";
      var nFm = keyNorm(fm);

      if (nName && nFm === nName) out.push(f);
      else if (nSlug && nFm === nSlug) out.push(f);
      else if (slugify(fm) && slugify(fm) === slugify(metierSlug)) out.push(f);
    }

    // de-dupe by question
    var seen = {};
    var final = [];
    for (var j=0;j<out.length;j++){
      var q = norm(out[j].question || out[j.q || ""] || "");
      var k = q.toLowerCase();
      if (!k || seen[k]) continue;
      seen[k]=true;
      final.push(out[j]);
    }
    return final;
  }

  // ----------------------------
  // Fallback DOM scan (safe)
  // ----------------------------
  function findMetierDom(slug){
    var s = slugify(slug);
    var nodes = document.querySelectorAll(".js-metier-slug");
    for (var i=0;i<nodes.length;i++){
      var item = nodes[i].closest(".w-dyn-item") || nodes[i].closest("[data-wf-collection-item]") || nodes[i].parentElement;
      if (!item) continue;
      var t = text(nodes[i]);
      if (slugify(t) === s) return item;
    }
    return null;
  }
  function readFicheFromDom(metierItem){
    if (!metierItem) return {};
    function getRT(cls){
      var el = metierItem.querySelector(cls);
      return html(el) || text(el) || "";
    }
    return {
      accroche: text(metierItem.querySelector(".js-fiche-accroche")) || "",
      description: getRT(".js-fiche-description"),
      missions: getRT(".js-fiche-missions"),
      competences: getRT(".js-fiche-competences"),
      environnements: getRT(".js-fiche-environnements"),
      profil_recherche: getRT(".js-fiche-profil_recherche"),
      evolutions_possibles: getRT(".js-fiche-evolutions_possibles"),
      meta_title: text(metierItem.querySelector(".js-fiche-meta_title")) || "",
      meta_description: text(metierItem.querySelector(".js-fiche-meta_description")) || "",
      schema_json_ld: text(metierItem.querySelector(".js-fiche-schema_json_ld")) || ""
    };
  }
  function findCountryDom(iso){
    iso = String(iso||"").toUpperCase();
    var nodes = document.querySelectorAll(".js-country-iso");
    for (var i=0;i<nodes.length;i++){
      var t = text(nodes[i]).toUpperCase();
      if (t !== iso) continue;
      var item = nodes[i].closest(".w-dyn-item") || nodes[i].closest("[data-wf-collection-item]") || nodes[i].parentElement;
      return item || null;
    }
    return null;
  }
  function readCountryBannersFromDom(countryItem){
    if (!countryItem) return {};
    return {
      banner_wide: pickImgSrc(countryItem.querySelector(".js-country-banner-wide")),
      banner_square: pickImgSrc(countryItem.querySelector(".js-country-banner-square")),
      banner_text: text(countryItem.querySelector(".js-country-banner-text")) || "",
      banner_cta: text(countryItem.querySelector(".js-country-banner-cta")) || "",
      currency: text(countryItem.querySelector(".js-country-currency")) || ""
    };
  }

  // ----------------------------
  // Airtable sponsor via Worker (optional)
  // ----------------------------
  function fetchSponsor(slug, iso){
    var worker = (window.ULYDIA_WORKER_URL || "").trim();
    if (!worker) return Promise.resolve(null);

    // If secret is required, we pass it as header when available
    var secret = (window.ULYDIA_PROXY_SECRET || "").trim();
    var url = worker.replace(/\/$/,"") + "/v1/metier-page?metier=" + encodeURIComponent(slug) + "&country=" + encodeURIComponent(iso);

    var headers = {};
    if (secret) headers["x-ulydia-proxy-secret"] = secret;

    return fetch(url, { method:"GET", headers: headers, credentials:"omit" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){
        if (!j) return null;
        // tolerate many shapes
        var sponsor = j.sponsor || (j.data && j.data.sponsor) || (j.info && j.info.sponsor) || null;
        if (!sponsor) return null;
        // normalize
        return {
          name: sponsor.name || sponsor.sponsor_name || "",
          link: sponsor.link || sponsor.url || sponsor.lien || sponsor.lien_sponsor || "",
          logo_wide: sponsor.logo_1 || sponsor.logo_wide || sponsor.banner_wide || sponsor.image_1 || "",
          logo_square: sponsor.logo_2 || sponsor.logo_square || sponsor.banner_square || sponsor.image_2 || "",
          tagline: sponsor.tagline || sponsor.text || "",
          cta: sponsor.cta || ""
        };
      })
      .catch(function(){ return null; });
  }

  // ----------------------------
  // DOM render (Design)
  // ----------------------------
  function ensureStyles(){
    if (document.getElementById("ulydia-metier-style-v24")) return;
    var css = `
      :root{
        --ul-radius: 16px;
        --ul-border: rgba(15,23,42,.08);
        --ul-shadow: 0 12px 30px rgba(15,23,42,.08);
        --ul-muted: rgba(15,23,42,.6);
        --ul-bg: #ffffff;
      }
      #ulydia-metier-root{ min-height: 60vh; }
      .ul-wrap{ max-width: 1120px; margin: 0 auto; padding: 32px 16px 64px; font-family: system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif; color:#0f172a; }
      .ul-top{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
      .ul-title h1{ margin:0; font-size:44px; line-height:1.1; font-weight:800; letter-spacing:-.02em; color:#5b5be9; }
      .ul-chips{ margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; }
      .ul-chip{ padding:8px 12px; border:1px solid var(--ul-border); border-radius:999px; background:#fff; color:rgba(15,23,42,.75); font-weight:600; font-size:13px; }
      .ul-grid{ margin-top:18px; display:grid; grid-template-columns: 1.45fr .8fr; gap:18px; align-items:start; }
      @media(max-width: 980px){ .ul-grid{ grid-template-columns:1fr; } }
      .ul-card{ background:#fff; border:1px solid var(--ul-border); border-radius: var(--ul-radius); box-shadow: var(--ul-shadow); overflow:hidden; }
      .ul-card-h{ padding:12px 14px; font-weight:800; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--ul-border); }
      .ul-card-b{ padding:14px 14px 16px; color:#0f172a; }
      .ul-card-b p{ margin:0 0 10px; color:rgba(15,23,42,.78); line-height:1.55; }
      .ul-card-b ul{ margin:8px 0 0 18px; color:rgba(15,23,42,.78); }
      .ul-h-pink{ background: linear-gradient(135deg, rgba(255,214,214,.65), rgba(255,255,255,0)); }
      .ul-h-lilac{ background: linear-gradient(135deg, rgba(214,208,255,.65), rgba(255,255,255,0)); }
      .ul-h-blue{ background: linear-gradient(135deg, rgba(206,231,255,.75), rgba(255,255,255,0)); }
      .ul-h-mint{ background: linear-gradient(135deg, rgba(196,255,225,.7), rgba(255,255,255,0)); }
      .ul-h-amber{ background: linear-gradient(135deg, rgba(255,225,178,.75), rgba(255,255,255,0)); }
      .ul-sponsor-wide{ display:flex; align-items:center; justify-content:space-between; gap:14px; padding:14px 16px; border-radius: 14px; background: #6b63f2; color:#fff; box-shadow: var(--ul-shadow); border:1px solid rgba(255,255,255,.18); }
      .ul-sponsor-wide .t{ font-weight:800; }
      .ul-sponsor-wide .s{ font-size:12px; opacity:.92; font-weight:600; }
      .ul-sponsor-wide .cta{ margin-left:auto; background: rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.25); color:#fff; text-decoration:none; padding:10px 14px; border-radius: 999px; font-weight:800; font-size:13px; white-space:nowrap; }
      .ul-img-banner{ width:100%; height:auto; display:block; border-radius: 12px; border:1px solid rgba(15,23,42,.08); }
      .ul-side-stack{ display:flex; flex-direction:column; gap:14px; }
      .ul-premium-top{ display:flex; align-items:center; justify-content:space-between; }
      .ul-premium-logo{ width:64px; height:64px; border-radius:14px; border:1px solid rgba(15,23,42,.08); background: linear-gradient(135deg, rgba(15,23,42,.06), rgba(255,255,255,0)); display:flex; align-items:center; justify-content:center; overflow:hidden; }
      .ul-premium-logo img{ width:100%; height:100%; object-fit:cover; display:block; }
      .ul-btn{ display:inline-flex; align-items:center; justify-content:center; text-decoration:none; padding:10px 12px; border-radius: 10px; font-weight:800; border:1px solid rgba(15,23,42,.10); background:#fff; color:#0f172a; }
      .ul-kpi-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .ul-kpi{ border:1px solid rgba(15,23,42,.08); border-radius: 12px; padding:10px; background:#fff; }
      .ul-kpi .k{ font-size:12px; color:rgba(15,23,42,.6); font-weight:700; }
      .ul-kpi .v{ margin-top:4px; font-weight:800; }
      .ul-tags{ display:flex; flex-wrap:wrap; gap:8px; }
      .ul-tag{ padding:7px 10px; border-radius: 999px; background: rgba(91,91,233,.10); border:1px solid rgba(91,91,233,.18); color:#5b5be9; font-weight:800; font-size:12px; }
      .ul-faq{ margin-top:18px; }
      .ul-faq-item{ border:1px solid rgba(15,23,42,.08); border-radius: 12px; overflow:hidden; background:#fff; }
      .ul-faq-q{ width:100%; text-align:left; background:#fff; border:0; padding:14px 14px; font-weight:900; cursor:pointer; display:flex; justify-content:space-between; gap:10px; }
      .ul-faq-a{ padding:0 14px 14px; color:rgba(15,23,42,.78); display:none; }
      .ul-faq-item[data-open="1"] .ul-faq-a{ display:block; }
      .ul-empty{ padding:18px; border-radius: var(--ul-radius); border:1px solid rgba(15,23,42,.10); background: linear-gradient(135deg, rgba(255,225,178,.28), rgba(255,255,255,0)); box-shadow: var(--ul-shadow); }
      .ul-empty h3{ margin:0 0 6px; font-size:18px; font-weight:900; }
      .ul-empty p{ margin:0; color:rgba(15,23,42,.7); }
    `;
    var st = document.createElement("style");
    st.id = "ulydia-metier-style-v24";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function renderEmpty(root, title, msg){
    ensureStyles();
    root.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-empty">
          <h3>⚠️ ${esc(title || "Fiche introuvable")}</h3>
          <p>${esc(msg || "Impossible de charger la fiche métier.")}</p>
        </div>
      </div>
    `;
  }

  function sectionCard(title, bodyHtml, hue){
    if (!bodyHtml) return "";
    return `
      <div class="ul-card">
        <div class="ul-card-h ${hue||"ul-h-pink"}">${esc(title)}</div>
        <div class="ul-card-b">${bodyHtml}</div>
      </div>
    `;
  }

  function richToHtml(v){
    v = String(v||"").trim();
    if (!v) return "";
    // If it looks like HTML, keep it; else wrap as paragraph
    if (/[<>]/.test(v)) return v;
    return "<p>"+esc(v)+"</p>";
  }

  function listToTags(value){
    if (!value) return "";
    var t = String(value||"").replace(/&nbsp;|&#160;/g," ").trim();
    if (!t) return "";
    var parts = t.split(/[,;\n]/).map(function(s){ return norm(s).replace(/^\-+\s*/,""); }).filter(Boolean);
    if (!parts.length) return "";
    return '<div class="ul-tags">' + parts.map(function(p){ return '<span class="ul-tag">'+esc(p)+'</span>'; }).join("") + "</div>";
  }

  function render(root, data){
    ensureStyles();
    var metierName = data.metierName || data.slug || "Métier";
    var sector = data.sector || "—";
    var iso = data.iso || "FR";

    // Sponsor wide: sponsor preferred else country banner wide
    var sponsorWide = "";
    if (data.sponsor && (data.sponsor.logo_wide || data.sponsor.tagline || data.sponsor.name)){
      var href = data.sponsor.link || "/sponsor?metier="+encodeURIComponent(data.slug)+"&country="+encodeURIComponent(iso);
      sponsorWide = `
        <a class="ul-sponsor-wide" href="${esc(href)}" target="_blank" rel="noopener">
          <div>
            <div class="t">${esc(data.sponsor.name || "Sponsor")}</div>
            <div class="s">${esc(data.sponsor.tagline || "Découvrez nos offres partenaires")}</div>
          </div>
          <span class="cta">${esc(data.sponsor.cta || "En savoir plus →")}</span>
        </a>
      `;
    } else if (data.country && data.country.banner_wide){
      var href2 = data.country.banner_url || "/sponsor?metier="+encodeURIComponent(data.slug)+"&country="+encodeURIComponent(iso);
      sponsorWide = `
        <a href="${esc(href2)}" target="_blank" rel="noopener">
          <img class="ul-img-banner" src="${esc(data.country.banner_wide)}" alt="Sponsor" loading="lazy"/>
        </a>
      `;
    } else {
      sponsorWide = `
        <div class="ul-sponsor-wide" role="note" aria-label="Sponsor">
          <div>
            <div class="t">Sponsor</div>
            <div class="s">Découvrez nos offres partenaires</div>
          </div>
          <span class="cta">En savoir plus →</span>
        </div>
      `;
    }

    // Left column: MPB first (if exists) else Fiche
    var leftHtml = "";
    if (data.hasMPB){
      // key blocks from MPB (expect html strings already)
      leftHtml += sectionCard("Training", richToHtml(data.mpb.formation || ""), "ul-h-pink");
      leftHtml += sectionCard("Access to the role", richToHtml(data.mpb.acces || ""), "ul-h-pink");
      leftHtml += sectionCard("Market", richToHtml(data.mpb.marche || ""), "ul-h-pink");

      // Salary block (if salary numbers exist)
      if (data.mpb.salary && (data.mpb.salary.junior || data.mpb.salary.mid || data.mpb.salary.senior)){
        var cur = esc(data.mpb.currency || data.countryCurrency || "");
        function rangeLine(label, r){
          if (!r || (r.min==null && r.max==null)) return "";
          var min = (r.min==null) ? "—" : (Math.round(r.min).toLocaleString("fr-FR"));
          var max = (r.max==null) ? "—" : (Math.round(r.max).toLocaleString("fr-FR"));
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; font-weight:800; font-size:12px; margin:6px 0;">
              <span>${esc(label)}</span>
              <span style="color:rgba(91,91,233,1)">${min} - ${max} ${cur}</span>
            </div>
          `;
        }
        var salaryHtml = `
          ${rangeLine("Junior", data.mpb.salary.junior)}
          ${rangeLine("Mid", data.mpb.salary.mid)}
          ${rangeLine("Senior", data.mpb.salary.senior)}
          <div style="margin-top:10px; color:rgba(15,23,42,.78); font-size:13px;">
            ${data.mpb.salary_notes ? richToHtml(data.mpb.salary_notes) : ""}
          </div>
        `;
        leftHtml += sectionCard("Salary", salaryHtml, "ul-h-lilac");
      }
    } else {
      // Fiche Metier only
      leftHtml += sectionCard("Vue d’ensemble", richToHtml(data.fiche.accroche || data.fiche.description || ""), "ul-h-blue");
      leftHtml += sectionCard("Missions principales", richToHtml(data.fiche.missions || ""), "ul-h-mint");
      leftHtml += sectionCard("Compétences clés", richToHtml(data.fiche.competences || ""), "ul-h-amber");
      leftHtml += sectionCard("Environnements de travail", richToHtml(data.fiche.environnements || ""), "ul-h-amber");
      leftHtml += sectionCard("Profil recherché", richToHtml(data.fiche.profil_recherche || ""), "ul-h-amber");
      leftHtml += sectionCard("Évolutions possibles", richToHtml(data.fiche.evolutions_possibles || ""), "ul-h-blue");
    }

    // Right column blocks
    var rightBlocks = [];

    // Premium / sponsor square
    if (data.sponsor && (data.sponsor.logo_square || data.sponsor.name)){
      var href3 = data.sponsor.link || "/sponsor?metier="+encodeURIComponent(data.slug)+"&country="+encodeURIComponent(iso);
      rightBlocks.push(`
        <div class="ul-card">
          <div class="ul-card-h ul-h-blue">Premium</div>
          <div class="ul-card-b">
            <div class="ul-premium-top">
              <div>
                <div style="font-weight:900;">${esc(data.sponsor.name || "Partenaire")}</div>
                <div style="font-size:12px; color:rgba(15,23,42,.6); font-weight:700;">${esc(iso)}</div>
              </div>
              <div class="ul-premium-logo">
                ${data.sponsor.logo_square ? `<img src="${esc(data.sponsor.logo_square)}" alt="" loading="lazy"/>` : "Logo"}
              </div>
            </div>
            <div style="margin-top:10px;">
              <a class="ul-btn" href="${esc(href3)}" target="_blank" rel="noopener">${esc(data.sponsor.cta || "En savoir plus")}</a>
            </div>
          </div>
        </div>
      `);
    } else if (data.country && data.country.banner_square){
      var href4 = data.country.banner_url || "/sponsor?metier="+encodeURIComponent(data.slug)+"&country="+encodeURIComponent(iso);
      rightBlocks.push(`
        <div class="ul-card">
          <div class="ul-card-h ul-h-blue">Premium</div>
          <div class="ul-card-b">
            <a href="${esc(href4)}" target="_blank" rel="noopener">
              <img class="ul-img-banner" src="${esc(data.country.banner_square)}" alt="Sponsor" loading="lazy"/>
            </a>
            ${(data.country.banner_text || data.country.banner_cta) ? `
              <div style="margin-top:10px; font-size:13px; color:rgba(15,23,42,.75); font-weight:700;">
                ${esc(data.country.banner_text || "")}
              </div>
              ${data.country.banner_cta ? `<div style="margin-top:8px;"><span class="ul-btn">${esc(data.country.banner_cta)}</span></div>` : ""}
            ` : ""}
          </div>
        </div>
      `);
    }

    // Indicators (from MPB)
    if (data.hasMPB && data.mpb.indicators){
      var ind = data.mpb.indicators;
      rightBlocks.push(`
        <div class="ul-card">
          <div class="ul-card-h ul-h-mint">Key indicators</div>
          <div class="ul-card-b">
            <div class="ul-kpi-grid">
              <div class="ul-kpi"><div class="k">Remote</div><div class="v">${esc(ind.remote_level || "—")}</div></div>
              <div class="ul-kpi"><div class="k">Automation risk</div><div class="v">${esc(ind.automation_risk || "—")}</div></div>
              <div class="ul-kpi"><div class="k">Time to employability</div><div class="v">${esc(ind.time_to_employability || "—")}</div></div>
              <div class="ul-kpi"><div class="k">Growth outlook</div><div class="v">${esc(ind.growth_outlook || "—")}</div></div>
            </div>
            ${ind.market_demand ? `<div style="margin-top:10px; font-weight:700; color:rgba(15,23,42,.72);">${richToHtml(ind.market_demand)}</div>` : ""}
          </div>
        </div>
      `);
    }

    // Skills & path (from MPB)
    if (data.hasMPB && data.mpb.skills){
      var sk = data.mpb.skills;
      rightBlocks.push(`
        <div class="ul-card">
          <div class="ul-card-h ul-h-blue">Skills & path</div>
          <div class="ul-card-b">
            ${sk.top_fields ? `<div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:10px;"><div style="font-weight:900;">Key fields</div><div>${listToTags(sk.top_fields)}</div></div>` : ""}
            ${sk.skills_must_have ? `<div style="margin-top:8px;"><div style="font-weight:900; margin-bottom:6px;">Must-have skills</div>${listToTags(sk.skills_must_have) || richToHtml(sk.skills_must_have)}</div>` : ""}
            ${sk.soft_skills ? `<div style="margin-top:10px;"><div style="font-weight:900; margin-bottom:6px;">Soft skills</div>${listToTags(sk.soft_skills) || richToHtml(sk.soft_skills)}</div>` : ""}
            ${sk.tools_stack ? `<div style="margin-top:10px;"><div style="font-weight:900; margin-bottom:6px;">Tools / stack</div>${listToTags(sk.tools_stack) || richToHtml(sk.tools_stack)}</div>` : ""}
          </div>
        </div>
      `);
    }

    // Other MPB cards (examples)
    if (data.hasMPB && data.mpb.certifications){
      rightBlocks.push(sectionCard("Certifications", richToHtml(data.mpb.certifications), "ul-h-amber"));
    }
    if (data.hasMPB && data.mpb.schools_or_paths){
      rightBlocks.push(sectionCard("Schools & paths", richToHtml(data.mpb.schools_or_paths), "ul-h-amber"));
    }
    if (data.hasMPB && data.mpb.portfolio_projects){
      rightBlocks.push(sectionCard("Portfolio projects", richToHtml(data.mpb.portfolio_projects), "ul-h-amber"));
    }

    // FAQ
    var faqHtml = "";
    if (data.faqs && data.faqs.length){
      faqHtml = `
        <div class="ul-faq">
          <div class="ul-card">
            <div class="ul-card-h ul-h-amber">Questions fréquentes</div>
            <div class="ul-card-b" style="display:flex; flex-direction:column; gap:10px;">
              ${data.faqs.map(function(f, idx){
                return `
                  <div class="ul-faq-item" data-open="0">
                    <button class="ul-faq-q" type="button" data-idx="${idx}">
                      <span>${esc(f.question || "")}</span>
                      <span aria-hidden="true">▾</span>
                    </button>
                    <div class="ul-faq-a">${richToHtml(f.answer || "")}</div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      `;
    }

    root.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-top">
          <div class="ul-title">
            <h1>${esc(metierName)}</h1>
            <div class="ul-chips">
              <span class="ul-chip">Sector: ${esc(sector || "—")}</span>
              <span class="ul-chip">Country: ${esc(iso)}</span>
            </div>
          </div>
        </div>

        <div style="margin-top:14px;">${sponsorWide}</div>

        <div class="ul-grid">
          <div style="display:flex; flex-direction:column; gap:14px;">
            ${leftHtml || ""}
          </div>

          <div class="ul-side-stack">
            ${rightBlocks.join("")}
          </div>
        </div>

        ${faqHtml}
      </div>
    `;

    // FAQ toggle
    var btns = root.querySelectorAll(".ul-faq-q");
    btns.forEach(function(btn){
      btn.addEventListener("click", function(){
        var item = btn.closest(".ul-faq-item");
        if (!item) return;
        var open = item.getAttribute("data-open") === "1";
        item.setAttribute("data-open", open ? "0" : "1");
      });
    });
  }

  // ----------------------------
  // Build data model then render
  // ----------------------------
  function build(){
    var slug = qs("metier");
    var iso = (qs("country") || "FR").toUpperCase();

    if (!slug){
      var root0 = document.getElementById("ulydia-metier-root");
      if (root0) renderEmpty(root0, "Fiche introuvable", "Paramètre manquant: ?metier=...");
      return;
    }

    var root = document.getElementById("ulydia-metier-root");
    if (!root){
      warn("[ULYDIA] Missing #ulydia-metier-root");
      return;
    }

    // base metier + fiche
    var m = findMetier(slug) || {};
    var metierName = m.name || m.metier_name || m.nom || slug;
    var sector = m.secteur || m.sector || m.js_metier_sector || m.metier_sector || "";

    // Fiche metier
    var fiche = {};
    var ficheArr = getArrayGlobal("__ULYDIA_FICHE_METIERS__");
    // Fallback: some setups store Fiche Metiers fields directly inside __ULYDIA_METIERS__ items
    if (!ficheArr) {
      var mArr = getArrayGlobal("__ULYDIA_METIERS__");
      if (mArr && mArr.length) {
        var maybe = mArr.filter(function(m){
          if(!m) return false;
          return !!(m.accroche || m.description || m.missions || m.competences || m.environnements || m.profil_recherche || m.evolutions_possibles);
        });
        if (maybe.length) ficheArr = maybe;
      }
    }

    if (ficheArr.length){
      for (var i=0;i<ficheArr.length;i++){
        var fm = ficheArr[i]||{};
        if (slugify(fm.slug || fm.metier || fm.name || "") === slugify(slug)){ fiche = fm; break; }
      }
    } else {
      // read from DOM within the metier item
      var domItem = findMetierDom(slug);
      fiche = readFicheFromDom(domItem);
      // also enrich name/sector from DOM if missing
      if (!metierName || metierName === slug){
        var dn = domItem && domItem.querySelector(".js-metier-name");
        if (dn) metierName = text(dn) || metierName;
      }
      if (!sector){
        var ds = domItem && domItem.querySelector(".js-metier-sector");
        if (ds) sector = text(ds) || sector;
      }
    }

    // country info + banners
    var c = findCountry(iso) || {};
    var countryCurrency = c.currency || c.devise || "";
    var bannerWide = c.banner_wide || c.banniere_sponsorisation_image_1_url || c.banner_1 || c.image_1 || "";
    var bannerSquare = c.banner_square || c.banniere_sponsorisation_image_2_url || c.banner_2 || c.image_2 || "";
    var bannerText = c.banner_text || c.banniere_sponsorisation_texte || "";
    var bannerCta = c.banner_cta || c.banniere_sponsorisation_cta || "";
    var bannerUrl = c.banner_url || c.lien_sponsor || c.url || "";

    if (!bannerWide || !bannerSquare || !bannerText || !bannerCta || !countryCurrency){
      var cDom = findCountryDom(iso);
      var cExtra = readCountryBannersFromDom(cDom);
      bannerWide = bannerWide || cExtra.banner_wide || "";
      bannerSquare = bannerSquare || cExtra.banner_square || "";
      bannerText = bannerText || cExtra.banner_text || "";
      bannerCta = bannerCta || cExtra.banner_cta || "";
      countryCurrency = countryCurrency || cExtra.currency || "";
    }

    var country = {
      iso: iso,
      banner_wide: bannerWide,
      banner_square: bannerSquare,
      banner_text: bannerText,
      banner_cta: bannerCta,
      banner_url: bannerUrl
    };

    // MPB
    var mpbRaw = findMPB(slug, iso, metierName);
    var hasMPB = !!mpbRaw;

    var mpb = {};
    if (hasMPB){
      // mpbRaw can be {sections:[], chips:{}, salary:{}}
      // map to flat keys expected by renderer
      var sections = mpbRaw.sections || [];
      function sectionVal(key){
        for (var i=0;i<sections.length;i++){
          if ((sections[i]||{}).key === key) return (sections[i].value || "");
        }
        // also allow direct fields if present
        return mpbRaw[key] || mpbRaw[key.replace(/_bloc$/,"")] || "";
      }
      mpb.formation = mpbRaw.formation || sectionVal("formation_bloc") || sectionVal("formation") || "";
      mpb.acces = mpbRaw.acces || sectionVal("acces_bloc") || sectionVal("acces") || "";
      mpb.marche = mpbRaw.marche || sectionVal("marche_bloc") || sectionVal("marche") || "";
      mpb.salary_notes = mpbRaw.salary_notes || sectionVal("salary_notes") || "";
      mpb.certifications = mpbRaw.certifications || sectionVal("Certifications") || sectionVal("certifications") || "";
      mpb.schools_or_paths = mpbRaw.schools_or_paths || sectionVal("Schools_or_paths") || sectionVal("schools_or_paths") || "";
      mpb.portfolio_projects = mpbRaw.portfolio_projects || sectionVal("Portfolio_projects") || sectionVal("portfolio_projects") || "";
      mpb.currency = (mpbRaw.chips && (mpbRaw.chips.Currency || mpbRaw.chips.currency)) || mpbRaw.currency || countryCurrency || "";

      // salary
      mpb.salary = mpbRaw.salary || {};
      // chips/indicators
      var chips = mpbRaw.chips || {};
      mpb.indicators = {
        remote_level: chips.Remote_level || chips.remote_level || "",
        automation_risk: chips.Automation_risk || chips.automation_risk || "",
        time_to_employability: sectionVal("Time_to_employability") || sectionVal("time_to_employability") || "",
        growth_outlook: sectionVal("Growth_outlook") || sectionVal("growth_outlook") || "",
        market_demand: sectionVal("Market_demand") || sectionVal("market_demand") || ""
      };
      mpb.skills = {
        top_fields: sectionVal("Top_fields") || sectionVal("top_fields") || "",
        skills_must_have: sectionVal("Skills_must_have") || sectionVal("skills_must_have") || "",
        soft_skills: sectionVal("Soft_skills") || sectionVal("soft_skills") || "",
        tools_stack: sectionVal("Tools_stack") || sectionVal("tools_stack") || ""
      };
    }

    // FAQ
    var faqs = filterFaqs(iso, metierName, slug);

    // Render immediately with non-sponsor banners, then update sponsor async
    render(root, {
      slug: slug,
      iso: iso,
      metierName: metierName,
      sector: sector,
      fiche: fiche || {},
      hasMPB: hasMPB,
      mpb: mpb,
      faqs: faqs,
      country: country,
      countryCurrency: countryCurrency,
      sponsor: null
    });

    // Fetch sponsor (optional)
    fetchSponsor(slug, iso).then(function(sponsor){
      if (!sponsor) return;
      // re-render only sponsor portions by full render (simple, safe)
      render(root, {
        slug: slug,
        iso: iso,
        metierName: metierName,
        sector: sector,
        fiche: fiche || {},
        hasMPB: hasMPB,
        mpb: mpb,
        faqs: faqs,
        country: country,
        countryCurrency: countryCurrency,
        sponsor: sponsor
      });
    });
  }

  // run after DOM ready
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
