
(function(){
  "use strict";

  // =========================================================
  // ULYDIA — Metier Page — MONO BUNDLE — V2.2 DESIGNFULL
  // - Data sources:
  //   * Webflow CMS via globals (preferred): __ULYDIA_METIERS__, __ULYDIA_COUNTRIES__,
  //     __ULYDIA_METIER_PAYS_BLOCS__, __ULYDIA_FAQS__, __ULYDIA_FICHE_METIERS__ (if present)
  //   * Fallback DOM scan for Fiche Metier + Countries banners if globals missing
  //   * Sponsor banners: Airtable Sponsoring_Metiers via Worker /v1/metier-page (safe)
  // - Rule:
  //   * If NO MPB for (slug+ISO): render ONLY Fiche Metier (no MPB sections/indicators/salary)
  // - No dynamic script injection, no hooks, no templates required.
  // =========================================================

  if (window.__ULYDIA_METIER_PAGE_V22__) return;
  window.__ULYDIA_METIER_PAGE_V22__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG) console.log.apply(console, arguments); }
  function warn(){ console.warn.apply(console, arguments); }

  // ---------- helpers ----------
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function pickUrl(v){
    if(!v) return "";
    if(typeof v === "string") return v.trim();
    if(typeof v === "object"){
      return (v.url||v.src||v.href||v.image||"").toString().trim();
    }
    return "";
  }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function escHtml(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function safeHTML(html){
    // Keep user CMS rich text as-is (already trusted in Webflow), but ensure string
    return String(html||"").trim();
  }
  function parseNumber(v){
    v = String(v||"").trim();
    if(!v) return null;
    // accept "10%" or "10"
    var m = v.match(/-?\d+([.,]\d+)?/);
    if(!m) return null;
    var n = parseFloat(m[0].replace(",","."));
    return isNaN(n) ? null : n;
  }

  // ---------- URL params ----------
  function getParam(name){
    var u = new URL(window.location.href);
    return u.searchParams.get(name) || "";
  }
  var slug = (getParam("metier") || "").trim();
  var iso  = (getParam("country") || "").trim().toUpperCase();

  // ---------- root ----------
  var root = document.getElementById("ulydia-metier-root");
  if(!root){
    warn("[ULYDIA][v2.2] missing #ulydia-metier-root");
    return;
  }

  // ---------- CSS (propal-like) ----------
  function ensureStyle(id, css){
    if(document.getElementById(id)) return;
    var st = document.createElement("style");
    st.id = id;
    st.textContent = css;
    document.head.appendChild(st);
  }

  ensureStyle("ulydia-metier-v22-style", `
    :root{
      --ul-radius: 16px;
      --ul-radius-sm: 12px;
      --ul-shadow: 0 10px 28px rgba(20, 30, 60, .08);
      --ul-border: 1px solid rgba(15, 23, 42, .08);
      --ul-text: #0f172a;
      --ul-muted: rgba(15, 23, 42, .65);
      --ul-bg: #ffffff;
      --ul-chip: rgba(99,102,241,.12);
      --ul-chip-text: #4338ca;
      --ul-primary: #6366f1;
      --ul-primary2: #7c3aed;
    }
    #ulydia-metier-root{ max-width: 1080px; margin: 0 auto; padding: 28px 18px 64px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: var(--ul-text); }
    .ul-h1{ font-size: 44px; line-height: 1.05; letter-spacing: -0.02em; margin: 0 0 10px; font-weight: 800; color:#5b5fe6; }
    .ul-subline{ display:flex; gap:10px; align-items:center; margin: 0 0 14px; flex-wrap: wrap; }
    .ul-pill{ padding: 6px 10px; border-radius: 999px; border: var(--ul-border); background:#fff; font-size:12px; color: var(--ul-muted); font-weight: 600; }
    .ul-grid{ display:grid; grid-template-columns: 2fr 1fr; gap: 18px; align-items:start; }
    @media (max-width: 980px){ .ul-grid{ grid-template-columns: 1fr; } }
    .ul-card{ border-radius: var(--ul-radius); background:#fff; border: var(--ul-border); box-shadow: var(--ul-shadow); overflow:hidden; }
    .ul-card-h{ padding: 12px 14px; font-weight: 800; display:flex; gap:10px; align-items:center; border-bottom: var(--ul-border); }
    .ul-card-b{ padding: 14px; }
    .ul-card-b p{ margin: 0 0 10px; color: rgba(15, 23, 42, .82); }
    .ul-card-b p:last-child{ margin-bottom:0; }
    .ul-grad-pink{ background: linear-gradient(135deg, rgba(255, 0, 128, .12), rgba(99, 102, 241, .08)); }
    .ul-grad-green{ background: linear-gradient(135deg, rgba(16,185,129,.12), rgba(59,130,246,.06)); }
    .ul-grad-purple{ background: linear-gradient(135deg, rgba(124,58,237,.12), rgba(99,102,241,.06)); }
    .ul-grad-orange{ background: linear-gradient(135deg, rgba(245,158,11,.16), rgba(251,113,133,.06)); }
    .ul-banner{ border-radius: var(--ul-radius); overflow:hidden; border: var(--ul-border); box-shadow: var(--ul-shadow); background: linear-gradient(90deg, var(--ul-primary), var(--ul-primary2)); }
    .ul-banner a{ display:flex; align-items:center; justify-content:space-between; gap:14px; padding: 14px; color:#fff; text-decoration:none; }
    .ul-banner .ul-b-title{ font-weight: 900; }
    .ul-banner .ul-b-sub{ font-size: 12px; opacity:.9; font-weight: 600; }
    .ul-btn{ padding: 10px 14px; border-radius: 999px; background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.24); color:#fff; font-weight: 800; font-size: 12px; white-space: nowrap; }
    .ul-sponsor-logo{ height: 34px; max-width: 160px; object-fit: contain; filter: drop-shadow(0 6px 14px rgba(0,0,0,.18)); }
    .ul-side-sq{ width: 100%; aspect-ratio: 1/1; border-radius: var(--ul-radius); border: var(--ul-border); box-shadow: var(--ul-shadow); overflow:hidden; background:#fff; display:flex; align-items:center; justify-content:center; }
    .ul-side-sq img{ width:100%; height:100%; object-fit: cover; }
    .ul-side-mini{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .ul-kpi{ border-radius: 14px; border: var(--ul-border); background:#fff; padding: 10px; }
    .ul-kpi .k{ font-size: 12px; color: var(--ul-muted); font-weight:700; margin-bottom:6px; }
    .ul-kpi .v{ font-weight: 900; }
    .ul-chips{ display:flex; flex-wrap:wrap; gap:8px; }
    .ul-chip{ padding: 7px 10px; border-radius: 999px; background: var(--ul-chip); color: var(--ul-chip-text); font-weight:800; font-size: 12px; }
    .ul-faq-wrap{ margin-top: 18px; }
    .ul-faq-card{ border-radius: var(--ul-radius); border: var(--ul-border); background:#fff; box-shadow: var(--ul-shadow); overflow:hidden; }
    .ul-faq-head{ padding: 12px 14px; font-weight: 900; border-bottom: var(--ul-border); background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(251,113,133,.06)); display:flex; gap:10px; align-items:center;}
    .ul-faq-item{ border-top: var(--ul-border); }
    .ul-faq-q{ width:100%; text-align:left; background: transparent; border:0; padding: 14px; font-weight: 800; cursor:pointer; display:flex; justify-content:space-between; gap:12px; align-items:center; }
    .ul-faq-a{ display:none; padding: 0 14px 14px; color: rgba(15,23,42,.82); }
    .ul-faq-q span{ flex:1; }
    .ul-faq-ico{ width: 18px; height: 18px; border-radius: 999px; border: var(--ul-border); display:flex; align-items:center; justify-content:center; font-weight: 900; color: rgba(15,23,42,.55); }
    .ul-section-gap{ height: 10px; }
  `);

  // ---------- CMS loaders ----------
  function waitFor(fnReady, timeoutMs){
    timeoutMs = timeoutMs || 2500;
    var start = Date.now();
    return new Promise(function(resolve){
      (function tick(){
        try{
          if(fnReady()) return resolve(true);
        }catch(e){}
        if(Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(tick, 40);
      })();
    });
  }

  function getCountries(){
    var arr = window.__ULYDIA_COUNTRIES__;
    if(Array.isArray(arr) && arr.length) return arr;
    // fallback DOM scan: any elements with .js-country-iso
    var items = qa(".js-country-iso").map(function(el){
      var it = el.closest(".w-dyn-item") || el.parentElement;
      return it;
    }).filter(Boolean);
    var out=[];
    items.forEach(function(it){
      var isoEl = q(".js-country-iso", it);
      if(!isoEl) return;
      var iso = norm(isoEl.textContent).toUpperCase();
      if(!iso) return;
      // banner selectors (multiple possibilities)
      var b1 = pickUrl((q(".js-country-banner_1", it)||q(".js-banner-1",it)||q(".js-country-banner-1",it))?.getAttribute?.("src") || q(".js-country-banner_1 img",it)?.getAttribute?.("src") || q(".js-banner-1 img",it)?.getAttribute?.("src"));
      var b2 = pickUrl((q(".js-country-banner_2", it)||q(".js-banner-2",it)||q(".js-country-banner-2",it))?.getAttribute?.("src") || q(".js-country-banner_2 img",it)?.getAttribute?.("src") || q(".js-banner-2 img",it)?.getAttribute?.("src"));
      out.push({ iso: iso, banner_1: b1, banner_2: b2 });
    });
    return out;
  }

  function getFicheMetiers(){
    // preferred global
    var arr = window.__ULYDIA_FICHE_METIERS__;
    if(Array.isArray(arr) && arr.length) return arr;

    // fallback: try to build from DOM using .js-metier-slug + common field classes
    var items = qa(".js-metier-slug").map(function(el){
      return el.closest(".w-dyn-item") || el.parentElement;
    }).filter(Boolean);

    var out=[];
    items.forEach(function(it){
      var s = norm(q(".js-metier-slug", it)?.textContent);
      if(!s) return;

      function htmlBy(){
        for(var i=0;i<arguments.length;i++){
          var sel = arguments[i];
          var el = q(sel, it);
          if(el){
            var h = String(el.innerHTML||"").trim();
            var t = norm(el.textContent||"");
            return h || t || "";
          }
        }
        return "";
      }
      function txtBy(){
        for(var i=0;i<arguments.length;i++){
          var el = q(arguments[i], it);
          if(el){
            var t = norm(el.textContent||"");
            if(t) return t;
          }
        }
        return "";
      }

      out.push({
        slug: s,
        name: txtBy(".js-metier-name", ".js-fiche-name", ".js-fm-name") || null,
        accroche: txtBy(".js-accroche",".js-fiche-accroche",".js-metier-accroche") || "",
        description: htmlBy(".js-description",".js-fiche-description",".js-metier-description") || "",
        missions: htmlBy(".js-missions",".js-fiche-missions",".js-metier-missions") || "",
        competences: htmlBy(".js-competences",".js-Competences",".js-fiche-competences") || "",
        environnements: htmlBy(".js-environnements",".js-fiche-environnements") || "",
        profil_recherche: htmlBy(".js-profil_recherche",".js-fiche-profil_recherche",".js-profil-recherche") || "",
        evolutions_possibles: htmlBy(".js-evolutions_possibles",".js-fiche-evolutions_possibles",".js-evolutions-possibles") || "",
        sponsor_name: txtBy(".js-sponsor_name",".js-sponsor-name",".js-fiche-sponsor-name") || "",
        sponsor_logo_1: pickUrl(q(".js-sponsor_logo_1 img",it)?.getAttribute("src") || q(".js-sponsor_logo_1",it)?.getAttribute?.("src") || ""),
        sponsor_logo_2: pickUrl(q(".js-sponsor_logo_2 img",it)?.getAttribute("src") || q(".js-sponsor_logo_2",it)?.getAttribute?.("src") || ""),
        lien_sponsor: (q(".js-lien_sponsor",it)?.getAttribute?.("href") || q(".js-lien_sponsor a",it)?.getAttribute?.("href") || "").trim()
      });
    });
    return out;
  }

  function getMPBArray(){
    // supports either __ULYDIA_METIER_PAYS_BLOCS__ (array) or __ULYDIA_MPB__ (array)
    var a = window.__ULYDIA_METIER_PAYS_BLOCS__ || window.__ULYDIA_MPB__;
    if(Array.isArray(a)) return a;
    return [];
  }

  function getFaqArray(){
    var a = window.__ULYDIA_FAQS__;
    if(Array.isArray(a)) return a;
    return [];
  }

  // ---------- Airtable sponsor via Worker ----------
  var WORKER_URL = (window.ULYDIA_WORKER_URL || "").trim().replace(/\/$/,"");
  var PROXY_SECRET = (window.ULYDIA_PROXY_SECRET || "").trim();
  function canUseWorker(){ return !!WORKER_URL; }

  async function fetchWorkerPayload(iso, slug){
    if(!canUseWorker()) return null;
    if(!iso || !slug) return null;
    try{
      var url = new URL(WORKER_URL + "/v1/metier-page");
      url.searchParams.set("iso", iso);
      url.searchParams.set("slug", slug);
      if(PROXY_SECRET) url.searchParams.set("proxy_secret", PROXY_SECRET);
      var res = await fetch(url.toString(), { credentials:"omit" });
      if(!res.ok) return null;
      var data = await res.json();
      if(!data || data.ok === false) return null;
      return data;
    }catch(e){
      log("[ULYDIA][v2.2] worker fetch failed", e);
      return null;
    }
  }

  // ---------- Data selection ----------
  function findCountry(countries, iso){
    iso = (iso||"").toUpperCase();
    return countries.find(function(c){
      return (String(c.iso||c.code_iso||c.country_code||"").toUpperCase() === iso);
    }) || null;
  }

  function findFiche(fiches, slug){
    return fiches.find(function(f){ return String(f.slug||"") === slug; }) || null;
  }

  function findMPB(mpbs, slug, iso){
    iso = (iso||"").toUpperCase();
    // Accept mpb.metier or mpb.job_slug
    return mpbs.find(function(b){
      var bIso = String(b.iso || b.country_code || b.code_iso || "").toUpperCase();
      var bSlug = String(b.metier || b.job_slug || b.slug || "").trim();
      return bIso === iso && bSlug === slug;
    }) || null;
  }

  // ---------- Render helpers ----------
  function card(title, html, gradClass, icon){
    if(!html) return "";
    return `
      <section class="ul-card ${gradClass||""}">
        <div class="ul-card-h">${icon?`<span>${icon}</span>`:""}<span>${escHtml(title)}</span></div>
        <div class="ul-card-b">${safeHTML(html)}</div>
      </section>
    `;
  }

  function chipsFromText(html){
    // Convert HTML list-ish or text into chips: split by <br>, commas, bullets, new lines.
    var txt = String(html||"")
      .replace(/<br\s*\/?>/gi,"\n")
      .replace(/<\/p>/gi,"\n")
      .replace(/<[^>]+>/g," ")
      .replace(/&nbsp;/g," ")
      .replace(/\s+/g," ")
      .trim();
    if(!txt) return [];
    var parts = txt.split(/[\n•\-–—,;|]/g).map(function(s){ return norm(s); }).filter(Boolean);
    // de-dup
    var seen = {};
    var out=[];
    parts.forEach(function(p){
      if(!p) return;
      var k = p.toLowerCase();
      if(seen[k]) return;
      seen[k]=1;
      out.push(p);
    });
    return out.slice(0, 18);
  }

  function renderFAQ(faqs){
    if(!faqs || !faqs.length) return "";
    var items = faqs.map(function(f, idx){
      var qtxt = escHtml(f.question||"");
      var ahtml = safeHTML(f.answer||"");
      return `
        <div class="ul-faq-item">
          <button class="ul-faq-q" type="button" data-i="${idx}">
            <span>${qtxt}</span>
            <span class="ul-faq-ico">+</span>
          </button>
          <div class="ul-faq-a" data-a="${idx}">${ahtml}</div>
        </div>
      `;
    }).join("");
    return `
      <div class="ul-faq-wrap">
        <div class="ul-faq-card">
          <div class="ul-faq-head">❓ <span>Questions fréquentes</span></div>
          ${items}
        </div>
      </div>
    `;
  }

  function bindFAQ(root){
    qa(".ul-faq-q", root).forEach(function(btn){
      btn.addEventListener("click", function(){
        var i = btn.getAttribute("data-i");
        var a = q('.ul-faq-a[data-a="'+i+'"]', root);
        if(!a) return;
        var open = a.style.display === "block";
        // close all
        qa(".ul-faq-a", root).forEach(function(x){ x.style.display="none"; });
        qa(".ul-faq-ico", root).forEach(function(x){ x.textContent="+"; });
        if(!open){
          a.style.display = "block";
          var ico = q(".ul-faq-ico", btn);
          if(ico) ico.textContent = "–";
        }
      });
    });
  }

  function sponsorCtaLink(slug, iso){
    var u = new URL(window.location.origin + "/sponsor");
    u.searchParams.set("metier", slug||"");
    u.searchParams.set("country", iso||"");
    return u.toString();
  }

  function renderBannerWide(sponsor, country, slug, iso){
    var sponsorLink = (sponsor && sponsor.link) || sponsorCtaLink(slug, iso);
    var logoWide = sponsor ? pickUrl(sponsor.logo_wide) : "";
    // Non sponsor fallback wide from country
    var fallbackWide = pickUrl(country && (country.banner_1 || country.banner1 || country.bannerWide));
    // If we have an image fallback, render as image banner; else keep gradient banner
    if(logoWide){
      return `
        <div class="ul-banner">
          <a href="${escHtml(sponsorLink)}" target="_blank" rel="noopener">
            <div>
              <div class="ul-b-title">Sponsor</div>
              <div class="ul-b-sub">Découvrez nos offres partenaires</div>
            </div>
            <img class="ul-sponsor-logo" src="${escHtml(logoWide)}" alt="Sponsor" loading="lazy"/>
            <span class="ul-btn">En savoir plus →</span>
          </a>
        </div>
      `;
    }
    if(fallbackWide){
      return `
        <div class="ul-banner" style="background:#fff;">
          <a href="${escHtml(sponsorCtaLink(slug, iso))}" target="_blank" rel="noopener" style="padding:0;">
            <img src="${escHtml(fallbackWide)}" alt="Sponsoriser" style="width:100%;height:120px;object-fit:cover;display:block;">
          </a>
        </div>
      `;
    }
    // default gradient CTA
    return `
      <div class="ul-banner">
        <a href="${escHtml(sponsorCtaLink(slug, iso))}" target="_blank" rel="noopener">
          <div>
            <div class="ul-b-title">Sponsor</div>
            <div class="ul-b-sub">Découvrez nos offres partenaires</div>
          </div>
          <span class="ul-btn">En savoir plus →</span>
        </a>
      </div>
    `;
  }

  function renderSponsorSquare(sponsor, country, slug, iso){
    var sponsorLink = (sponsor && sponsor.link) || sponsorCtaLink(slug, iso);
    var logoSq = sponsor ? pickUrl(sponsor.logo_square) : "";
    var fallbackSq = pickUrl(country && (country.banner_2 || country.banner2 || country.bannerSquare));
    var img = logoSq || fallbackSq;
    if(!img) return "";
    return `
      <a class="ul-side-sq" href="${escHtml(sponsorLink)}" target="_blank" rel="noopener">
        <img src="${escHtml(img)}" alt="Sponsor" loading="lazy"/>
      </a>
    `;
  }

  // ---------- MAIN ----------
  (async function main(){
    if(!slug || !iso){
      root.innerHTML = `
        <div class="ul-card ul-grad-orange">
          <div class="ul-card-h">⚠️ <span>Fiche introuvable</span></div>
          <div class="ul-card-b">
            <p><strong>URL invalide</strong></p>
            <p>Ajoute <code>?metier=...</code> et <code>&country=...</code></p>
          </div>
        </div>
      `;
      return;
    }

    // wait for CMS globals from embeds (soft)
    await waitFor(function(){
      return !!window.__ULYDIA_METIER_PAYS_BLOCS__ || !!window.__ULYDIA_FAQS__ || !!window.__ULYDIA_METIERS__;
    }, 3000);

    var countries = getCountries();
    var country = findCountry(countries, iso);

    var fiches = getFicheMetiers();
    var fiche = findFiche(fiches, slug);

    var mpbs = getMPBArray();
    var mpb = findMPB(mpbs, slug, iso);

    var faqs = getFaqArray().filter(function(f){
      var fIso = String(f.iso||"").toUpperCase();
      var fMetier = String(f.metier||f.job_slug||"");
      // iso optional in faqs
      var okIso = !fIso || fIso===iso;
      return okIso && fMetier===slug;
    });

    // Airtable sponsor via worker payload (safe)
    var sponsor = null;
    var payload = await fetchWorkerPayload(iso, slug);
    if(payload && payload.sponsor){
      sponsor = {
        name: payload.sponsor.name || payload.sponsor.sponsor_name || "",
        // STRICT mapping requested:
        // wide -> logo_2 ; square -> logo_1
        logo_wide: payload.sponsor.logo_2 || payload.sponsor.sponsor_logo_2 || "",
        logo_square: payload.sponsor.logo_1 || payload.sponsor.sponsor_logo_1 || "",
        link: payload.sponsor.link || payload.sponsor.lien_sponsor || ""
      };
    } else if(fiche && (fiche.sponsor_logo_1 || fiche.sponsor_logo_2)){
      // optional: sponsor fields from CMS fiche (if you add them)
      sponsor = {
        name: fiche.sponsor_name || "",
        logo_wide: fiche.sponsor_logo_2 || "",
        logo_square: fiche.sponsor_logo_1 || "",
        link: fiche.lien_sponsor || ""
      };
    }

    // Title
    var title = (fiche && (fiche.name||"")) || (window.__ULYDIA_METIERS__||[]).find(function(m){return m.slug===slug;})?.name || slug;
    var sector = (window.__ULYDIA_METIERS__||[]).find(function(m){return m.slug===slug;})?.sector || "—";

    // Decide mode:
    var hasMPB = !!mpb;
    // If no fiche data, still render MPB if exists (fallback)
    var hasFiche = !!fiche && (
      fiche.accroche || fiche.description || fiche.missions || fiche.competences ||
      fiche.environnements || fiche.profil_recherche || fiche.evolutions_possibles
    );

    // Build left cards
    var left = [];
    if(hasFiche){
      if(fiche.accroche){
        left.push(card("Accroche", `<p>${escHtml(fiche.accroche)}</p>`, "ul-grad-purple", "✨"));
      }
      left.push(card("Vue d’ensemble", fiche.description, "ul-grad-pink", "🧭"));
      left.push(card("Missions principales", fiche.missions, "ul-grad-green", "✅"));
      left.push(card("Compétences clés", fiche.competences, "ul-grad-purple", "🧠"));
      left.push(card("Environnements de travail", fiche.environnements, "ul-grad-orange", "🏢"));
      left.push(card("Profil recherché", fiche.profil_recherche, "ul-grad-pink", "🎯"));
      left.push(card("Évolutions possibles", fiche.evolutions_possibles, "ul-grad-green", "📈"));
    }

    // If MPB exists, add MPB cards in propal sections
    if(hasMPB){
      // mpb may be either {sections:[{key,label,value}]} or flattened fields
      function getSection(keys){
        // 1) sections array
        if(Array.isArray(mpb.sections)){
          for(var i=0;i<keys.length;i++){
            var k = keys[i];
            var hit = mpb.sections.find(function(s){ return String(s.key||"").toLowerCase()===k.toLowerCase(); });
            if(hit && hit.value) return hit.value;
          }
        }
        // 2) direct fields
        for(var j=0;j<keys.length;j++){
          var v = mpb[keys[j]];
          if(v) return v;
        }
        return "";
      }

      left.push(card("Training", getSection(["formation","formation_bloc","formation_bloc_html","formation_bloc"]), "ul-grad-pink", "🎓"));
      left.push(card("Access to the role", getSection(["acces","acces_bloc","acces_bloc_html","acces_bloc"]), "ul-grad-pink", "🧩"));
      left.push(card("Market", getSection(["marche","marche_bloc","marche_bloc_html","marche_bloc"]), "ul-grad-pink", "📊"));

      // salary block from MPB sections if present
      var salaire = getSection(["salaire","salaire_bloc","salaire_bloc_html","salaire_bloc"]);
      if(!salaire){
        // fallback: generate from salary numbers if present
        var sal = mpb.salary || mpb.salaire || null;
        var cur = (mpb.chips && (mpb.chips.Currency || mpb.chips.currency)) || mpb.currency || (mpb.chips && mpb.chips.currency) || "";
        if(sal && (sal.junior||sal.mid||sal.senior)){
          function rng(r){
            if(!r) return "";
            if(r.min==null && r.max==null) return "";
            var a = r.min!=null ? Math.round(r.min) : "—";
            var b = r.max!=null ? Math.round(r.max) : "—";
            return `${a} - ${b} ${escHtml(cur||"")}`.trim();
          }
          salaire = `
            <div class="ul-card-b">
              <div class="ul-kpi"><div class="k">Junior</div><div class="v">${rng(sal.junior)}</div></div>
              <div class="ul-section-gap"></div>
              <div class="ul-kpi"><div class="k">Mid</div><div class="v">${rng(sal.mid)}</div></div>
              <div class="ul-section-gap"></div>
              <div class="ul-kpi"><div class="k">Senior</div><div class="v">${rng(sal.senior)}</div></div>
            </div>
          `;
        }
      }
      if(salaire) left.push(card("Salary", salaire, "ul-grad-purple", "💰"));
    }

    // FAQ always at bottom if present
    var faqHtml = renderFAQ(faqs);

    // Right column widgets
    var right = [];

    // Sponsor square + premium card
    var sq = renderSponsorSquare(sponsor, country, slug, iso);
    right.push(`
      <section class="ul-card ul-grad-purple">
        <div class="ul-card-h">💎 <span>Premium</span></div>
        <div class="ul-card-b">
          ${sq || `<div class="ul-side-sq" style="aspect-ratio:auto; padding:14px; display:block;">
              <div style="font-weight:900; margin-bottom:6px;">Partenaire</div>
              <div style="color:var(--ul-muted); font-weight:700; font-size:12px;">${escHtml(iso)}</div>
              <div style="margin-top:12px;">
                <a class="ul-btn" style="display:inline-flex; background: rgba(99,102,241,.14); border-color: rgba(99,102,241,.2); color:#4338ca;" href="${escHtml(sponsorCtaLink(slug, iso))}" target="_blank" rel="noopener">En savoir plus</a>
              </div>
            </div>`}
        </div>
      </section>
    `);

    // Indicators + skills chips only if MPB exists
    if(hasMPB){
      // indicators
      var chips = mpb.chips || {};
      var remote = chips.Remote_level || chips.remote_level || mpb.remote_level || "";
      var autoRisk = chips.Automation_risk || chips.automation_risk || mpb.automation_risk || "";
      var timeEmp = (Array.isArray(mpb.sections)? (mpb.sections.find(s=>String(s.key).toLowerCase()==="time_to_employability")||{}).value : mpb.time_to_employability) || "";
      var growth = (Array.isArray(mpb.sections)? (mpb.sections.find(s=>String(s.key).toLowerCase()==="growth_outlook")||{}).value : mpb.growth_outlook) || "";
      var demand = (Array.isArray(mpb.sections)? (mpb.sections.find(s=>String(s.key).toLowerCase()==="market_demand")||{}).value : mpb.market_demand) || "";

      right.push(`
        <section class="ul-card ul-grad-green">
          <div class="ul-card-h">📌 <span>Key indicators</span></div>
          <div class="ul-card-b">
            <div class="ul-side-mini">
              <div class="ul-kpi"><div class="k">Remote</div><div class="v">${escHtml(remote||"—")}</div></div>
              <div class="ul-kpi"><div class="k">Automation risk</div><div class="v">${escHtml(autoRisk||"—")}</div></div>
            </div>
            ${timeEmp?`<div class="ul-section-gap"></div><div class="ul-kpi"><div class="k">Time to employability</div><div class="v">${safeHTML(timeEmp)}</div></div>`:""}
            ${growth?`<div class="ul-section-gap"></div><div class="ul-kpi"><div class="k">Growth outlook</div><div class="v">${safeHTML(growth)}</div></div>`:""}
            ${demand?`<div class="ul-section-gap"></div><div class="ul-kpi"><div class="k">Market demand</div><div class="v">${safeHTML(demand)}</div></div>`:""}
          </div>
        </section>
      `);

      // Skills & path chips
      function secVal(key){
        if(Array.isArray(mpb.sections)){
          var hit = mpb.sections.find(function(s){ return String(s.key||"").toLowerCase()===key.toLowerCase(); });
          return hit ? hit.value : "";
        }
        return mpb[key] || "";
      }
      var topFields = chipsFromText(secVal("top_fields"));
      var mustHave = chipsFromText(secVal("skills_must_have"));
      var softSkills = chipsFromText(secVal("soft_skills"));
      var tools = chipsFromText(secVal("tools_stack"));

      function chipsBlock(label, arr){
        if(!arr.length) return "";
        return `
          <div class="ul-kpi" style="margin-top:10px;">
            <div class="k">${escHtml(label)}</div>
            <div class="ul-chips">${arr.map(function(x){ return `<span class="ul-chip">${escHtml(x)}</span>`; }).join("")}</div>
          </div>
        `;
      }

      right.push(`
        <section class="ul-card ul-grad-purple">
          <div class="ul-card-h">🧩 <span>Skills & path</span></div>
          <div class="ul-card-b">
            ${chipsBlock("Key fields", topFields)}
            ${chipsBlock("Must-have skills", mustHave)}
            ${chipsBlock("Soft skills", softSkills)}
            ${chipsBlock("Tools / stack", tools)}
          </div>
        </section>
      `);
    }

    // Banner wide always shown (sponsor or non sponsor fallback)
    var banner = renderBannerWide(sponsor, country, slug, iso);

    // Render layout
    var html = `
      <div class="ul-subline">
        <h1 class="ul-h1">${escHtml(title)}</h1>
      </div>
      <div class="ul-subline">
        <span class="ul-pill">Sector: ${escHtml(sector||"—")}</span>
        <span class="ul-pill">Country: ${escHtml(iso)}</span>
      </div>
      ${banner}
      <div style="height:14px"></div>
      <div class="ul-grid">
        <div class="ul-left">
          ${left.filter(Boolean).join('<div class="ul-section-gap"></div>')}
          ${faqHtml}
        </div>
        <div class="ul-right">
          ${right.filter(Boolean).join('<div class="ul-section-gap"></div>')}
        </div>
      </div>
    `;

    // if no fiche and no mpb
    if(!hasFiche && !hasMPB){
      html = `
        <div class="ul-card ul-grad-orange">
          <div class="ul-card-h">⚠️ <span>Fiche introuvable</span></div>
          <div class="ul-card-b">
            <p><strong>Aucune donnée trouvée</strong> pour <code>${escHtml(slug)}</code> / <code>${escHtml(iso)}</code>.</p>
            <p>Vérifie que la collection <em>Fiche Métiers</em> expose les champs (description, missions, etc.) via des classes <code>js-*</code>, ou que MPB existe pour ce pays.</p>
          </div>
        </div>
      `;
    }

    root.innerHTML = html;
    bindFAQ(root);

    // enforce rule: if NO MPB, ensure MPB-only cards are absent (we already gated)
    log("[ULYDIA][v2.2] render done", { slug: slug, iso: iso, hasFiche: hasFiche, hasMPB: hasMPB, sponsor: !!sponsor });
  })();

})();
