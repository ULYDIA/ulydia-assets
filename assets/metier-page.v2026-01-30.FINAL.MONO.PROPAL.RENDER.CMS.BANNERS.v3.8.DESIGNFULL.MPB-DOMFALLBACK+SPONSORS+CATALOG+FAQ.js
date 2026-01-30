(function(){
  "use strict";

  // =========================================================
  // ULYDIA — Metier Page — MONO BUNDLE — v2.9 DESIGNFULL
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


  function pickSponsorUrl(s, which){
    // which: 'wide'|'square'
    if (!s) return "";
    var wide = pickUrl(s.logo_2 || s.logo2 || s.square || s.banner_square || s.bannerSquare || s.image_2 || s.image2 || s.img2 || s.url2);
    var sq   = pickUrl(s.logo_1 || s.logo1 || s.wide || s.banner_wide || s.bannerWide || s.image_1 || s.image1 || s.img1 || s.url1);
    return (which === 'square') ? (sq || wide) : (wide || sq);
  }

  function pickSponsorLink(s){
    if (!s) return "";
    // Airtable may store partner link under various keys
    return pickUrl(
      s.link, s.url, s.href, s.website, s.site, s.company_url, s.companyUrl,
      s.sponsor_url, s.sponsorUrl, s.link_url, s.linkUrl,
      s.cta_url, s.ctaUrl, s.redirect, s.redirect_url, s.redirectUrl
    );
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
  function readMPBFromDOM(){
    // Fallback: read MPB directly from hidden Webflow Collection List (Option A)
    // Expected wrapper class: .ul-cms-blocs-source (recommended) OR any .w-dyn-item containing .js-bloc-metier + .js-bloc-iso
    function _norm(s){ return String(s||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim(); }
    function _txt(root, sel){ var el=root.querySelector(sel); return el ? _norm(el.textContent||"") : ""; }
    function _html(root, sel){ var el=root.querySelector(sel); return el ? String(el.innerHTML||"").trim() : ""; }
    function _num(s){
      s=_norm(s).toLowerCase();
      if(!s) return null;
      var mult=1;
      if(s.endsWith("k")){ mult=1000; s=s.slice(0,-1); }
      s=s.replace(/\s/g,"").replace(/,/g,".").replace(/[^0-9.]/g,"");
      var n=parseFloat(s);
      return isFinite(n) ? Math.round(n*mult) : null;
    }

    var root = document.querySelector(".ul-cms-blocs-source") || document;
    var items = Array.prototype.slice.call(root.querySelectorAll(".w-dyn-item"))
      .filter(function(it){ return it && it.querySelector(".js-bloc-metier") && it.querySelector(".js-bloc-iso"); });

    if (!items.length) return [];

    // Map of known rich text fields (your screenshot list)
    var RTF = [
      ["formation_bloc", ".js-bf-formation_bloc"],
      ["acces_bloc", ".js-bf-acces_bloc"],
      ["salaire_bloc", ".js-bf-salaire_bloc"],
      ["marche_bloc", ".js-bf-marche_bloc"],
      ["education_level_local", ".js-bf-education_level_local"],
      ["top_fields", ".js-bf-top_fields"],
      ["certifications", ".js-bf-certifications"],
      ["schools_or_paths", ".js-bf-schools_or_paths"],
      ["equivalences_reconversion", ".js-bf-equivalences_reconversion"],
      ["entry_routes", ".js-bf-entry_routes"],
      ["first_job_titles", ".js-bf-first_job_titles"],
      ["typical_employers", ".js-bf-typical_employers"],
      ["portfolio_projects", ".js-bf-portfolio_projects"],
      ["skills_must_have", ".js-bf-skills_must_have"],
      ["soft_skills", ".js-bf-soft_skills"],
      ["tools_stack", ".js-bf-tools_stack"],
      ["time_to_employability", ".js-bf-time_to_employability"],
      ["hiring_sectors", ".js-bf-hiring_sectors"],
      ["degrees_examples", ".js-bf-degrees_examples"],
      ["growth_outlook", ".js-bf-growth_outlook"],
      ["market_demand", ".js-bf-market_demand"],
      ["salary_notes", ".js-bf-salary_notes"],
      ["education_level", ".js-bf-education_level"]
    ];

    return items.map(function(it){
      var iso = _txt(it, ".js-bloc-iso").toUpperCase();
      var metier = _txt(it, ".js-bloc-metier");
      if(!iso || !metier) return null;

      var sections = [];
      RTF.forEach(function(pair){
        var key=pair[0], sel=pair[1];
        var h=_html(it, sel);
        var t=_txt(it, sel);
        var val = h || t;
        if(!val) return;
        sections.push({ key:key, label:key, type: h ? "html" : "text", value: val });
      });

      var chips = {
        remote_level: _txt(it, ".js-chip-remote_level") || null,
        automation_risk: _txt(it, ".js-chip-automation_risk") || null,
        statut_generation: _txt(it, ".js-statut-generation") || null,
        currency: _txt(it, ".js-chip-currency") || null
      };

      var salary = {
        junior: { min:_num(_txt(it, ".js-sal-junior-min")), max:_num(_txt(it, ".js-sal-junior-max")) },
        mid:    { min:_num(_txt(it, ".js-sal-mid-min")),    max:_num(_txt(it, ".js-sal-mid-max")) },
        senior: { min:_num(_txt(it, ".js-sal-senior-min")), max:_num(_txt(it, ".js-sal-senior-max")) },
        variable_share_pct: _num(_txt(it, ".js-sal-variable-share"))
      };

      return { iso: iso, metier: metier, sections: sections, chips: chips, salary: salary };
    }).filter(Boolean);
  }

  function getMPB(){
    var list = window.__ULYDIA_METIER_PAYS_BLOCS__
      || window.__ULYDIA_METIER_PAYS_BLOC__
      || window.__ULYDIA_MPB__
      || parseJSONScript("mpbData")
      || parseJSONScript("mpb")
      || [];

    // DOM fallback if exports are missing (common when only CMS wrappers exist)
    if (!Array.isArray(list) || list.length === 0){
      try{
        var domList = readMPBFromDOM();
        if (domList && domList.length) list = domList;
      }catch(e){}
    }
    return list;
  }
  function getFAQs(){
    return window.__ULYDIA_FAQS__
      || parseJSONScript("faqsData")
      || parseJSONScript("faqData")
      || [];
  }

  function getFicheMetiers(){
    var fm = window.__ULYDIA_FICHE_METIERS__ || parseJSONScript('ficheData') || parseJSONScript('ficheMetiersData') || [];
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

    var found = list.find(function(b){
      if (!b) return false;
      var bslug = slugify(b.slug || b.metier_slug || b.metierSlug || b.metier || b.metier_name || b.metierName || b.name);
      var biso = String(b.iso || b.code_iso || b.codeIso || b.country || b.country_code || b.countryCode || "").toUpperCase();
      // MPB can store metier NAME instead of slug
      var bname = slugify(b.metier || b.metier_name || b.metierName || b.name || "");
      return (biso === ciso) && (bslug === sslug || bname === sslug);
    }) || null;

    return found ? normalizeMPB(found) : null;
  }

  
  function normalizeMPB(b){
    // Accept both "flat" MPB objects and legacy shapes (sections[] / chips{} / salary{})
    b = b || {};
    var out = {};

    function pick(){
      for (var i=0;i<arguments.length;i++){
        var v = arguments[i];
        if (v == null) continue;
        if (typeof v === "string"){
          var s = v.trim();
          if (s) return s;
        }else if (typeof v === "number"){
          if (isFinite(v)) return v;
        }else if (typeof v === "object"){
          // sometimes Webflow rich text exported as {value:"<p>..</p>"} or {html:".."}
          if (typeof v.value === "string" && v.value.trim()) return v.value.trim();
          if (typeof v.html === "string" && v.html.trim()) return v.html.trim();
          if (typeof v.text === "string" && v.text.trim()) return v.text.trim();
        }
      }
      return "";
    }

    // --- If legacy `sections` array exists, convert keys to flat ---
    if (Array.isArray(b.sections) && b.sections.length){
      b.sections.forEach(function(s){
        if (!s) return;
        var k = String(s.key || s.id || "").toLowerCase();
        var v = pick(s.value, s.html, s.text);
        if (!v) return;
        // normalize common keys
        if (k.indexOf("formation") !== -1) out.formation = v;
        else if (k.indexOf("acces") !== -1) out.acces = v;
        else if (k.indexOf("marche") !== -1) out.marche = v;
        else if (k.indexOf("salaire") !== -1) out.salaire = v;
        else if (k.indexOf("education_level_local") !== -1) out.education_level_local = v;
        else if (k.indexOf("education_level") !== -1) out.education_level = v;
        else if (k.indexOf("top_fields") !== -1) out.key_fields = v;
        else if (k.indexOf("certification") !== -1) out.certifications = v;
        else if (k.indexOf("schools_or_paths") !== -1) out.schools_or_paths = v;
        else if (k.indexOf("equival") !== -1) out.equivalences_reconversions = v;
        else if (k.indexOf("entry_routes") !== -1) out.entry_routes = v;
        else if (k.indexOf("first_job") !== -1) out.first_job_titles = v;
        else if (k.indexOf("typical_employ") !== -1) out.typical_employers = v;
        else if (k.indexOf("portfolio") !== -1) out.portfolio_projects = v;
        else if (k.indexOf("skills_must_have") !== -1) out.skills_must_have = v;
        else if (k.indexOf("soft_skills") !== -1) out.soft_skills = v;
        else if (k.indexOf("tools_stack") !== -1) out.tools_stack = v;
        else if (k.indexOf("time_to_employ") !== -1) out.time_to_employability = v;
        else if (k.indexOf("hiring_sectors") !== -1) out.hiring_sectors = v;
        else if (k.indexOf("degrees") !== -1) out.degrees_examples = v;
        else if (k.indexOf("growth") !== -1) out.growth_outlook = v;
        else if (k.indexOf("market_demand") !== -1) out.market_demand = v;
        else if (k.indexOf("salary_notes") !== -1) out.salary_notes = v;
      });
    }

    // --- Copy/normalize flat fields (preferred) ---
    out.metier = pick(b.metier, b.metier_name, b.name, out.metier);
    out.iso    = String(pick(b.iso, b.code_iso, b.country, b.country_code, out.iso) || "").toUpperCase();

    out.formation = pick(out.formation, b.formation, b.formation_bloc, b.formationBloc);
    out.acces     = pick(out.acces, b.acces, b.acces_bloc, b.accesBloc);
    out.marche    = pick(out.marche, b.marche, b.marche_bloc, b.marcheBloc);
    out.salaire   = pick(out.salaire, b.salaire, b.salaire_bloc, b.salaireBloc);
    out.environnements = pick(b.environnements, b.environnements_bloc, b.work_environment, b.workEnvironment); // optional

    out.education_level_local = pick(out.education_level_local, b.education_level_local, b.educationLevelLocal);
    out.education_level       = pick(out.education_level, b.education_level, b.educationLevel);

    // naming variants
    out.key_fields = pick(out.key_fields, b.key_fields, b.top_fields, b.Top_fields, b.topFields);
    out.certifications = pick(out.certifications, b.certifications, b.Certifications);
    out.schools_or_paths = pick(out.schools_or_paths, b.schools_or_paths, b.Schools_or_paths);
    out.equivalences_reconversions = pick(out.equivalences_reconversions, b.equivalences_reconversions, b.equivalences_reconversion, b.Equivalences_reconversion);
    out.entry_routes = pick(out.entry_routes, b.entry_routes, b.Entry_routes);
    out.first_job_titles = pick(out.first_job_titles, b.first_job_titles, b.First_job_titles);
    out.typical_employers = pick(out.typical_employers, b.typical_employers, b.Typical_employers);
    out.portfolio_projects = pick(out.portfolio_projects, b.portfolio_projects);
    out.skills_must_have = pick(out.skills_must_have, b.skills_must_have, b.Skills_must_have);
    out.soft_skills = pick(out.soft_skills, b.soft_skills, b.Soft_skills);
    out.tools_stack = pick(out.tools_stack, b.tools_stack, b.Tools_stack);

    out.time_to_employability = pick(out.time_to_employability, b.time_to_employability, b.Time_to_employability);
    out.hiring_sectors = pick(out.hiring_sectors, b.hiring_sectors, b.Hiring_sectors);
    out.degrees_examples = pick(out.degrees_examples, b.degrees_examples, b.Degrees_examples);
    out.growth_outlook = pick(out.growth_outlook, b.growth_outlook, b.Growth_outlook);
    out.market_demand = pick(out.market_demand, b.market_demand, b.Market_demand);
    out.salary_notes = pick(out.salary_notes, b.salary_notes, b.salary_note, b.salaryNotes);

    // chips / indicators (support both flat and nested)
    var chips = b.chips || {};
    out.remote_level = pick(b.remote_level, b.Remote_level, chips.Remote_level, chips.remote_level);
    out.automation_risk = pick(b.automation_risk, b.Automation_risk, chips.Automation_risk, chips.automation_risk);
    out.statut_generation = pick(b.statut_generation, b.Status_generation, chips.Status_generation, chips.statut_generation);
    out.devise = pick(b.devise, b.currency, b.Currency, chips.Currency, chips.currency);

    // salary (support flat or nested)
    var sal = b.salary || {};
    function pickNum(){
      for (var i=0;i<arguments.length;i++){
        var v = arguments[i];
        if (v == null) continue;
        if (typeof v === "number" && isFinite(v)) return v;
        if (typeof v === "string"){
          var s = v.trim();
          if (!s) continue;
          s = s.replace(/\s/g,"").replace(/,/g,".");
          var n = parseFloat(s.replace(/[^0-9.]/g,""));
          if (isFinite(n)) return n;
        }
      }
      return null;
    }
    out.junior_min = pickNum(b.junior_min, sal.junior && sal.junior.min);
    out.junior_max = pickNum(b.junior_max, sal.junior && sal.junior.max);
    out.mid_min    = pickNum(b.mid_min, sal.mid && sal.mid.min);
    out.mid_max    = pickNum(b.mid_max, sal.mid && sal.mid.max);
    out.senior_min = pickNum(b.senior_min, sal.senior && sal.senior.min);
    out.senior_max = pickNum(b.senior_max, sal.senior && sal.senior.max);
    out.variable_share = pick(out.variable_share, b.variable_share, sal.variable_share_pct, sal.variable_share);

    return out;
  }

function findFAQsForMetier(metierSlug, ficheName, iso){
  var list = getFAQs();
  if (!Array.isArray(list)) list = [];
  var targetSlug = slugify(metierSlug);
  var targetName = slugify(ficheName || metierSlug);
  var ISO = String(iso||"").toUpperCase();

  return list.filter(function(f){
    if (!f) return false;

    // Source field for metier can be "name" (preferred) or slug
    var mName = f.metier || f.metier_name || f.metierName || f.job || f.job_name || f.jobName || f.name || f.title || "";
    var mSlug = f.metier_slug || f.slug || f.job_slug || "";

    var okMetier = false;
    if (mName && slugify(mName) === targetName) okMetier = true;
    else if (mName && slugify(mName) === targetSlug) okMetier = true; // fallback
    else if (mSlug && slugify(mSlug) === targetSlug) okMetier = true;

    if (!okMetier) return false;

    var fIso = String(f.iso || f.code_iso || f.country_code || f.countryCode || f.codeIso || "").toUpperCase();
    if (fIso && ISO && fIso !== ISO) return false;

    var q = String((f.question || f.q || f.titre || f.title || f.name_question || "") || "").trim();
    var a = String((f.reponse || f.answer || f.a || f.body || f.content || f.reponse_html || "") || "").trim();
    return !!(q && a);
  });
}
  
  // ---------- Catalog (non-sponsor banners) ----------
  var CATALOG_URL = "https://ulydia-assets.pages.dev/assets/catalog.json";

  function loadCatalogOnce(){
    if (window.__ULYDIA_CATALOG__) return Promise.resolve(window.__ULYDIA_CATALOG__);
    if (window.__ULYDIA_CATALOG_PROMISE__) return window.__ULYDIA_CATALOG_PROMISE__;

    window.__ULYDIA_CATALOG_PROMISE__ = fetch(CATALOG_URL, { cache: "force-cache" })
      .then(function(r){ return r && r.ok ? r.json() : null; })
      .catch(function(){ return null; })
      .then(function(data){
        window.__ULYDIA_CATALOG__ = data || null;
        return window.__ULYDIA_CATALOG__;
      });

    return window.__ULYDIA_CATALOG_PROMISE__;
  }

  function mapCatalogCountry(c){
    if (!c) return null;
    var banners = c.banners || {};
    return {
      iso: String(c.iso || "").toUpperCase(),
      lang: c.langue_finale || c.lang || "",
      banner_wide: banners.image_1 || banners.banner_1 || banners.wide || "",
      banner_square: banners.image_2 || banners.banner_2 || banners.square || "",
      banner_text: banners.texte || "",
      banner_cta: banners.cta || ""
    };
  }

  function findCatalogCountrySync(iso){
    var cat = window.__ULYDIA_CATALOG__;
    if (!cat || !cat.countries) return null;
    var up = String(iso||"").trim().toUpperCase();
    for (var i=0;i<cat.countries.length;i++){
      var c = cat.countries[i];
      if (String(c && c.iso || "").toUpperCase() === up) return mapCatalogCountry(c);
    }
    return null;
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
  // Airtable sponsor banner via Worker (/v1/metier-page). Safe: never throw, never block render.
  return new Promise(function(resolve){
    try{
      var base = getWorkerUrl();
      if (!base || typeof base !== "string" || base.indexOf("http") !== 0){
        return resolve(null);
      }
      var url = base.replace(/\/+$/,"") + "/v1/metier-page?metier=" + encodeURIComponent(String(metierSlug||"")) +
        "&country=" + encodeURIComponent(String(iso||""));
      fetch(url, {
        headers: {
          "x-ulydia-proxy-secret": (window.ULYDIA_PROXY_SECRET || window.ULYDIA_PROXY_SECRET_2 || window.ULYDIA_PROXY || "")
        }
      }).then(function(r){
        if (!r || !r.ok) return null;
        return r.text().then(function(t){
          try{ return JSON.parse(t); }catch(e){ return null; }
        });
      }).then(function(j){
        if (!j || j.ok === false) return resolve(null);
        var s = j.sponsor || j.sponsoring || j.sponsorship || null;
        if (!s && j.pays && j.pays.sponsor) s = j.pays.sponsor;
        return resolve(s || null);
      }).catch(function(){ resolve(null); });
    }catch(e){ resolve(null); }
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

    if (document.getElementById("ulydia-metier-v35-css")) return;
    var css = `
      :root {
        --primary: #6366f1;
        --text: #0f172a;
        --muted: #64748b;
        --border: #e2e8f0;
        --bg: #ffffff;
        --card: #f8fafc;
        --accent: #f59e0b;
        --success: #10b981;
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
        --shadow-card: 0 4px 20px rgba(0,0,0,.08);
        --font-family: 'Outfit', sans-serif;
        --font-base: 15px;
      }
      body{font-family:var(--font-family,'Outfit',system-ui);font-size:var(--font-base,15px);background:#f7f8ff;color:var(--text);}
      #ulydia-metier-root{max-width:1100px;margin:0 auto;padding:34px 18px 80px 18px;}
      .u-row{display:grid;grid-template-columns:1.45fr 0.85fr;gap:24px;align-items:start;}
      @media(max-width:980px){.u-row{grid-template-columns:1fr;}}
      .u-title{font-size:56px;line-height:1.05;margin:0 0 10px 0;color:var(--primary);font-weight:800;letter-spacing:-0.02em;}
      @media(max-width:680px){.u-title{font-size:42px;}}
      .u-accroche{color:var(--muted);font-size:16px;line-height:1.55;margin:0 0 18px 0;max-width:820px;}
      .u-pills{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px 0;}
      .u-pill{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border);background:#fff;border-radius:999px;color:var(--text);font-weight:600;font-size:13px;}
      .u-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);overflow:hidden;}
      .u-card-h{padding:12px 16px;font-weight:800;color:var(--text);background:linear-gradient(90deg,#eef2ff,#f8fafc);border-bottom:1px solid var(--border);}
      .u-card-b{padding:16px;}
      .u-stack{display:flex;flex-direction:column;gap:14px;}
      .u-muted{color:var(--muted);}
      .u-section-title{margin:0;font-size:14px;font-weight:800;color:var(--text);}
      .u-rich p{margin:0 0 10px 0;}
      .u-rich ul{margin:10px 0 0 18px;}
      .u-rich li{margin:6px 0;}
      .u-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;padding:11px 14px;background:var(--primary);color:#fff;font-weight:800;font-size:13px;text-decoration:none;border:1px solid rgba(99,102,241,.25);}
      .u-btn:hover{filter:brightness(0.98);}
      /* Banners */
      .u-banner-wide{display:block;max-width:680px;margin:16px auto;text-decoration:none;}
      .u-banner-wide img{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--border);box-shadow:var(--shadow-card);}
      .u-premium{position:sticky;top:18px;}
      .u-premium .u-card-b{padding:14px;}
      .u-prem-square{width:100%;aspect-ratio:1/1;border-radius:16px;border:1px solid var(--border);overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;}
      .u-prem-square img{width:100%;height:100%;object-fit:cover;display:block;}
      .u-prem-name{font-weight:900;}
      .u-prem-sub{color:var(--muted);font-size:12px;margin-top:2px;}
      .u-prem-row{display:grid;grid-template-columns:1fr;gap:12px;align-items:start;}
      .u-sq{width:100%;max-width:300px;aspect-ratio:1/1;border-radius:16px;border:1px solid var(--border);overflow:hidden;background:#fff;margin:0 auto;}
      .u-sq img{width:100%;height:100%;object-fit:cover;display:block;}
      /* FAQ */
      .u-faq-item{border:1px solid var(--border);border-radius:14px;background:#fff;overflow:hidden;}
      .u-faq-q{padding:12px 14px;font-weight:800;cursor:pointer;display:flex;justify-content:space-between;gap:12px;}
      .u-faq-a{padding:0 14px 14px 14px;color:var(--text);display:none;}
      .u-faq-item.is-open .u-faq-a{display:block;}
    `;
    var style = document.createElement("style");
    style.id = "ulydia-metier-v35-css";
    style.textContent = css;
    document.head.appendChild(style);

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

  function renderFAQ(list){
    var wrap = document.createElement('div');
    wrap.className = 'u-card';
    var h = document.createElement('div');
    h.className = 'u-card-h';
    h.textContent = 'Questions fréquentes';
    wrap.appendChild(h);

    var b = document.createElement('div');
    b.className = 'u-card-b';
    b.style.padding = '0';

    (list||[]).forEach(function(f){
      var item = document.createElement('div');
      item.className = 'u-faq-item';
      var q = document.createElement('div');
      q.className = 'u-faq-q';
      q.innerHTML = '<span>'+ esc(f.question || f.q || '') +'</span><span>▾</span>';
      var a = document.createElement('div');
      a.className = 'u-faq-a';
      a.innerHTML = (f.reponse || f.answer || f.a || '') || '<span class="u-muted">—</span>';
      q.addEventListener('click', function(){ item.classList.toggle('open'); });
      item.appendChild(q);
      item.appendChild(a);
      b.appendChild(item);
    });

    if (!list || !list.length){
      var empty = document.createElement('div');
      empty.style.padding = '14px 16px';
      empty.className = 'u-muted';
      empty.textContent = 'Aucune question disponible pour ce métier.';
      b.appendChild(empty);
    }

    wrap.appendChild(b);
    return wrap;
  }

  function renderTopBanner(ctx){
    var sponsor = ctx.sponsor;
    if (sponsor === '__PENDING__') return null;
    var country = ctx.country;

    // ✅ WIDE banner:
    // - Sponsor: Airtable uses logo_2 as landscape (wide)
    // - Non-sponsor: catalog/country banner_wide
    var wide = pickUrl(
      sponsor && (sponsor.logo_wide || sponsor.logoWide || sponsor.logo_1 || sponsor.sponsor_logo_1 || sponsor.banner_wide || sponsor.bannerWide),
      country && (country.banner_wide || country.bannerWide || country.banniere_sponsorisation_image_1 || country.banniere_sponsorisation_image_1_url || country['banniere_sponsorisation_image_1_url'])
    );

    // click -> /sponsor with context
    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&country='+encodeURIComponent(ctx.iso);

    if (!wide) return null;

    // Pure image banner (no purple filter)
    var a = document.createElement('a');
    a.href = href;
    a.className = 'u-banner-img-link';
    a.rel = 'noopener';
    a.style.display = 'block';
    a.style.maxWidth = '680px';
    a.style.margin = '0 auto 14px auto';

    var img = document.createElement('img');
    img.src = wide;
    img.alt = 'Sponsor';
    img.loading = 'eager';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.borderRadius = '16px';
    img.style.border = '1px solid #eef0f4';
    img.style.boxShadow = '0 14px 36px rgba(20,20,60,.12)';
    // keep wide ratio feel on all browsers
    img.style.aspectRatio = '680 / 120';
    img.style.objectFit = 'cover';

    a.appendChild(img);
    return a;
  }

  function renderPremiumCard(ctx){
    var sponsor = ctx.sponsor;
    if (sponsor === '__PENDING__') return null;
    var country = ctx.country;

    var square = pickUrl(
      sponsor && (sponsor.logo_square || sponsor.logoSquare || sponsor.logo_2 || sponsor.sponsor_logo_2 || sponsor.banner_square || sponsor.bannerSquare),
      country && (country.banner_square || country.bannerSquare || country.banniere_sponsorisation_image_2 || country.banniere_sponsorisation_image_2),
      country && (country.banniere_sponsorisation_image_2_url || country.banniere_sponsorisation_image_2_url)
    );

    var name = (sponsor && (sponsor.sponsor_name || sponsor.name || sponsor.company || sponsor.partenaire)) || 'Partenaire';
    var iso = ctx.iso || '';
    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&country='+encodeURIComponent(ctx.iso);

    var wrap = document.createElement('div');
    wrap.className = 'u-premium';

    var h = document.createElement('div');
    h.className = 'u-premium-h';
    h.textContent = 'Premium';

    var b = document.createElement('div');
    b.className = 'u-premium-b';

    var row = document.createElement('div');
    row.className = 'u-prem-row';

    var sq = document.createElement('div');
    sq.className = 'u-sq';
    if (square){
      var aSq = document.createElement('a');
      aSq.href = href;
      aSq.rel = 'noopener';
      aSq.style.display = 'block';
      aSq.style.width = '100%';
      aSq.style.height = '100%';

      var img = document.createElement('img');
      img.alt = '';
      img.src = square;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';

      aSq.appendChild(img);
      sq.appendChild(aSq);
    }else{
      sq.textContent = 'Logo';
      sq.classList.add('u-muted');
      sq.style.fontWeight = '900';
      sq.style.fontSize = '12px';
    }

    var meta = document.createElement('div');
    meta.innerHTML = '<div class="u-prem-name">'+esc(name)+'</div><div class="u-prem-sub">'+esc(iso)+'</div>';

    row.appendChild(sq);
    row.appendChild(meta);

    var btn = document.createElement('a');
    btn.className = 'u-btn';
    btn.href = href;
    btn.rel = 'noopener';
    btn.textContent = 'En savoir plus';

    b.appendChild(row);
    b.appendChild(btn);

    wrap.appendChild(h);
    wrap.appendChild(b);
    return wrap;
  }

  
  function renderBeforeFaqBanner(ctx){
    var sponsor = ctx.sponsor;
    if (sponsor === '__PENDING__') return null;
    var country = ctx.country;

    // ✅ WIDE banner before FAQ (same mapping as top)
    var wide = pickUrl(
      sponsor && (sponsor.logo_wide || sponsor.logoWide || sponsor.logo_1 || sponsor.sponsor_logo_1 || sponsor.banner_wide || sponsor.bannerWide),
      country && (country.banner_wide || country.bannerWide || country.banniere_sponsorisation_image_1 || country.banniere_sponsorisation_image_1_url || country['banniere_sponsorisation_image_1_url'])
    );

    var href = (sponsor && pickSponsorLink(sponsor)) || '/sponsor?metier='+encodeURIComponent(ctx.slug)+'&country='+encodeURIComponent(ctx.iso);

    if (!wide) return null;

    var a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener';
    a.style.display = 'block';
    a.style.maxWidth = '680px';
    a.style.margin = '16px auto';

    var img = document.createElement('img');
    img.src = wide;
    img.alt = 'Sponsor';
    img.loading = 'lazy';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.borderRadius = '16px';
    img.style.border = '1px solid #eef0f4';
    img.style.boxShadow = '0 14px 36px rgba(20,20,60,.12)';
    img.style.aspectRatio = '680 / 120';
    img.style.objectFit = 'cover';

    a.appendChild(img);
    return a;
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
    // Strip HTML if rich text was passed
    s = s.replace(/<[^>]*>/g,' ');
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
    var topB = renderTopBanner(ctx);
    if (topB) root.appendChild(topB);

    var row = document.createElement('div');
    row.className = 'u-row';

    var left = document.createElement('div');
    left.className = 'u-stack';

    // FICHE blocks first
    if (ctx.fiche){
      var f = ctx.fiche;
      if (f.description) left.appendChild(card('Overview', '', f.description));
      if (f.missions) left.appendChild(card('Missions', '', f.missions));
      if (f.competences) left.appendChild(card('Skills', '', f.competences));
      if (f.environnements) left.appendChild(card('Work environment', '', f.environnements));
      if (f.profil_recherche) left.appendChild(card('Profile', '', f.profil_recherche));
      if (f.evolutions_possibles) left.appendChild(card('Career path', '', f.evolutions_possibles));
    }

    // MPB blocks
    if (ctx.mpb){
      if (ctx.mpb.formation) left.appendChild(card('Training', '', ctx.mpb.formation));
      if (ctx.mpb.acces) left.appendChild(card('Access to the role', '', ctx.mpb.acces));
      if (ctx.mpb.marche) left.appendChild(card('Market', '', ctx.mpb.marche));
      if (ctx.mpb.environnements) left.appendChild(card('Work environment', '', ctx.mpb.environnements));
    }

    // Salary from MPB if present
    if (ctx.mpb && (ctx.mpb.junior_min || ctx.mpb.junior_max || ctx.mpb.salary_notes || ctx.mpb.devise)){
      var html = '';
      function line(label, a, b){
        if (a == null && b == null) return;
        var v = (a!=null? a:'—') + ' - ' + (b!=null? b:'—') + ' ' + esc(ctx.currency || '');
        html += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eef0f4;"><b>'+esc(label)+'</b><span style="font-weight:900;color:#4f46e5;">'+esc(v)+'</span></div>';
      }
      line('Junior', ctx.mpb.junior_min, ctx.mpb.junior_max);
      line('Mid', ctx.mpb.mid_min, ctx.mpb.mid_max);
      line('Senior', ctx.mpb.senior_min, ctx.mpb.senior_max);
      if (ctx.mpb.salary_notes){
        html += '<div style="margin-top:10px;" class="u-muted">'+ctx.mpb.salary_notes+'</div>';
      }
      left.appendChild(card('Salary', '', html));
    }

    row.appendChild(left);

    var right = document.createElement('div');
    right.className = 'u-stack';

    var prem = renderPremiumCard(ctx);
    if (prem) right.appendChild(prem);

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

    // Banner before FAQ (wide)
    var beforeFaq = renderBeforeFaqBanner(ctx);
    if (beforeFaq){
      var slot = document.getElementById('ulydia-banner-before-faq-slot');
      if (slot){
        slot.innerHTML = '';
        slot.appendChild(beforeFaq);
      }else{
        root.appendChild(beforeFaq);
      }
    }

    // FAQ bottom
    var faqs = findFAQsForMetier(ctx.slug, (ctx.fiche && (ctx.fiche.name||ctx.fiche.Nom)) || ctx.name || ctx.slug, ctx.iso);
    root.appendChild(document.createElement('div')).style.height = '18px';
    root.appendChild(renderFAQ(faqs));
  }

  // ---------- main ----------
  async function main(){
    var q = getQuery();
    if (!q.metier || !q.country){
      ensureRoot().innerHTML = '<div class="u-card"><div class="u-card-h">Fiche introuvable</div><div class="u-card-b">URL invalide. Utilise <b>?metier=slug&country=FR</b>.</div></div>';
      return;
    }

    var metier = findMetierBySlug(q.metier);
    var fiche = findFiche(q.metier);
    var country = findCountry(q.country);
    // preload catalog and merge non-sponsor banners if Webflow export is incomplete
    await loadCatalogOnce();
    var catCountry = findCatalogCountrySync(q.country);
    if (catCountry){
      if (!country) country = catCountry;
      else {
        // keep existing fields, fill missing ones
        if (!country.banner_wide && catCountry.banner_wide) country.banner_wide = catCountry.banner_wide;
        if (!country.banner_square && catCountry.banner_square) country.banner_square = catCountry.banner_square;
        if (!country.banner_text && catCountry.banner_text) country.banner_text = catCountry.banner_text;
        if (!country.banner_cta && catCountry.banner_cta) country.banner_cta = catCountry.banner_cta;
        if (!country.lang && catCountry.lang) country.lang = catCountry.lang;
      }
    }
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
      sponsor: '__PENDING__'
    };

    // Render page (banners pending), then resolve sponsor and rerender banners without showing non-sponsor first
    renderPage(ctx);

    fetchSponsor(ctx.slug, ctx.iso).then(function(s){
      ctx.sponsor = s || null;
      renderPage(ctx);
    });
    log('[ULYDIA] v2.9 ready', {metier: ctx.slug, iso: ctx.iso, hasFiche: !!ctx.fiche, hasMPB: !!ctx.mpb, hasCountry: !!ctx.country});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();