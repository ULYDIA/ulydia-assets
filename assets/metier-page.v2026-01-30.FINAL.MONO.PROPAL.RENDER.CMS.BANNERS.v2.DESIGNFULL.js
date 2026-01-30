
/* =========================================================
 ULYDIA — METIER PAGE — FINAL MONO BUNDLE
 V2026-01-30 — v2 DESIGNFULL
 - No modules, no dynamic script injection
 - Reads globals filled by CMS embeds (Webflow)
 - Renders into #ulydia-metier-root only
 - Sponsor banners: sponsor_logo_2 (wide), sponsor_logo_1 (square)
   Fallbacks: country.banner_1 (wide), country.banner_2 (square)
 - If no MPB for (metier+iso): show only "Fiche Metiers" content blocks
========================================================= */
(function(){
  "use strict";
  if (window.__ULYDIA_METIER_PAGE_V2_DESIGNFULL__) return;
  window.__ULYDIA_METIER_PAGE_V2_DESIGNFULL__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;

  function log(){ if(DEBUG) console.log.apply(console, arguments); }
  function warn(){ console.warn.apply(console, arguments); }

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function norm(s){
    return String(s||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
  }
  function stripNbsp(s){
    return String(s||"").replace(/&nbsp;/g," ").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
  }
  function safeHTML(html){
    // We trust Webflow rich text; keep as-is but guard undefined/null.
    return String(html||"").trim();
  }
  function esc(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function toNum(v){
    if (v === null || v === undefined) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    var s = norm(v).toLowerCase();
    if(!s) return null;
    // accept "10%" or "2 500" or "2,5k"
    var mult = 1;
    if (s.endsWith("k")) { mult = 1000; s = s.slice(0,-1); }
    s = s.replace(/\s/g,"").replace(/,/g,".").replace(/[^0-9.]/g,"");
    if(!s) return null;
    var n = parseFloat(s);
    if(!isFinite(n)) return null;
    return Math.round(n * mult);
  }
  function pickUrl(x){
    if(!x) return "";
    if(typeof x === "string") return x.trim();
    // Webflow image object variants
    if (x.url) return String(x.url).trim();
    if (x.src) return String(x.src).trim();
    return "";
  }
  function getParam(name){
    try{
      var u = new URL(location.href);
      return u.searchParams.get(name);
    }catch(e){
      return null;
    }
  }

  function ensureRoot(){
    var root = document.getElementById("ulydia-metier-root");
    if(!root){
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.insertBefore(root, document.body.firstChild);
    }
    return root;
  }

  // ----------------------------
  // Data normalization
  // ----------------------------
  function getAllMPB(){
    // Preferred: __ULYDIA_MPB__ (adapter)
    var a = window.__ULYDIA_MPB__;
    if (Array.isArray(a) && a.length) return a;
    // Older: __ULYDIA_METIER_PAYS_BLOCS__
    var b = window.__ULYDIA_METIER_PAYS_BLOCS__;
    if (Array.isArray(b) && b.length){
      // may be { metier, iso, ... } or { metier, iso, sections[], chips{}, salary{} }
      return b.map(function(x){
        if(!x) return x;
        if (x.sections && !x.formation && !x.acces && !x.marche){
          // rebuild direct fields from sections
          var out = Object.assign({}, x);
          try{
            (x.sections||[]).forEach(function(s){
              if(!s || !s.key) return;
              var k = String(s.key);
              var v = String(s.value||"");
              // map common
              if (k === "formation_bloc" || k === "formation") out.formation = v;
              if (k === "acces_bloc" || k === "acces") out.acces = v;
              if (k === "marche_bloc" || k === "marche") out.marche = v;
              if (k === "salaire_bloc" || k === "salaire") out.salaire_bloc = v;
              if (k === "education_level_local") out.education_level_local = v;
              if (k === "education_level") out.education_level = v;
              if (k.toLowerCase() === "top_fields") out.top_fields = v;
              if (k.toLowerCase() === "certifications") out.certifications = v;
              if (k.toLowerCase() === "schools_or_paths") out.schools_or_paths = v;
              if (k.toLowerCase() === "equivalences_reconversion") out.equivalences_reconversion = v;
              if (k.toLowerCase() === "entry_routes") out.entry_routes = v;
              if (k.toLowerCase() === "first_job_titles") out.first_job_titles = v;
              if (k.toLowerCase() === "typical_employers") out.typical_employers = v;
              if (k.toLowerCase() === "portfolio_projects") out.portfolio_projects = v;
              if (k.toLowerCase() === "skills_must_have") out.skills_must_have = v;
              if (k.toLowerCase() === "soft_skills") out.soft_skills = v;
              if (k.toLowerCase() === "tools_stack") out.tools_stack = v;
              if (k.toLowerCase() === "time_to_employability") out.time_to_employability = v;
              if (k.toLowerCase() === "hiring_sectors") out.hiring_sectors = v;
              if (k.toLowerCase() === "degrees_examples") out.degrees_examples = v;
              if (k.toLowerCase() === "growth_outlook") out.growth_outlook = v;
              if (k.toLowerCase() === "market_demand") out.market_demand = v;
              if (k.toLowerCase() === "salary_notes") out.salary_notes = v;
            });
          }catch(e){}
          // chips & salary
          if (x.chips){
            out.remote_level = out.remote_level || x.chips.Remote_level || x.chips.remote_level;
            out.automation_risk = out.automation_risk || x.chips.Automation_risk || x.chips.automation_risk;
            out.statut_generation = out.statut_generation || x.chips.Status_generation || x.chips.statut_generation;
            out.currency = out.currency || x.chips.Currency || x.chips.currency;
          }
          if (x.salary){
            out.junior_min = out.junior_min ?? (x.salary.junior ? x.salary.junior.min : null);
            out.junior_max = out.junior_max ?? (x.salary.junior ? x.salary.junior.max : null);
            out.mid_min = out.mid_min ?? (x.salary.mid ? x.salary.mid.min : null);
            out.mid_max = out.mid_max ?? (x.salary.mid ? x.salary.mid.max : null);
            out.senior_min = out.senior_min ?? (x.salary.senior ? x.salary.senior.min : null);
            out.senior_max = out.senior_max ?? (x.salary.senior ? x.salary.senior.max : null);
            out.variable_share = out.variable_share ?? (x.salary.variable_share_pct || x.salary.variable_share);
          }
          return out;
        }
        return x;
      });
    }
    // Also allow __ULYDIA_METIER_PAYS_BLOCS__ legacy key
    var c = window.__ULYDIA_METIER_PAYS_BLOCS__;
    if (Array.isArray(c) && c.length) return c;
    return [];
  }

  function getAllFaqs(){
    var a = window.__ULYDIA_FAQS__;
    if (Array.isArray(a)) return a;
    return [];
  }

  function getAllMetiers(){
    var a = window.__ULYDIA_METIERS__;
    if (Array.isArray(a)) return a;
    return [];
  }

  function getAllCountries(){
    var a = window.__ULYDIA_COUNTRIES__;
    if (Array.isArray(a)) return a;
    return [];
  }

  function getAllFicheMetiers(){
    // Possible globals
    var a = window.__ULYDIA_FICHE_METIERS__;
    if (Array.isArray(a) && a.length) return a;
    var b = window.__ULYDIA_FICHE_METIER__;
    if (b && typeof b === "object") return [b];
    return [];
  }

  function matchStr(a,b){
    a = norm(a).toLowerCase();
    b = norm(b).toLowerCase();
    if(!a || !b) return false;
    return a === b;
  }
  function matchIso(a,b){
    return norm(a).toUpperCase() === norm(b).toUpperCase();
  }

  function pickCountry(iso){
    var list = getAllCountries();
    iso = norm(iso).toUpperCase();
    for (var i=0;i<list.length;i++){
      var c=list[i]||{};
      if (matchIso(c.iso || c.code_iso || c.country_code, iso)) return c;
    }
    return null;
  }

  function pickMetier(slug){
    var list = getAllMetiers();
    var s = norm(slug);
    for (var i=0;i<list.length;i++){
      var m=list[i]||{};
      if (matchStr(m.slug, s) || matchStr(m.metier, s)) return m;
    }
    return null;
  }

  function pickMPB(slug, iso){
    var list = getAllMPB();
    var s = norm(slug);
    var I = norm(iso).toUpperCase();
    for (var i=0;i<list.length;i++){
      var x=list[i]||{};
      var ms = x.metier || x.metier_slug || x.job_slug || x.slug || x.job || x.name;
      var ci = x.iso || x.country_code || x.countryCode || x.code_iso;
      if (matchStr(ms, s) && matchIso(ci, I)) return x;
    }
    // also tolerate name matching if MPB uses name
    var met = pickMetier(slug);
    if (met && met.name){
      for (var j=0;j<list.length;j++){
        var y=list[j]||{};
        var ms2 = y.metier || y.name;
        var ci2 = y.iso || y.country_code || y.code_iso;
        if (matchStr(ms2, met.name) && matchIso(ci2, I)) return y;
      }
    }
    return null;
  }

  function pickFicheMetier(slug, iso, lang){
    var list = getAllFicheMetiers();
    var s = norm(slug);
    var I = norm(iso).toUpperCase();
    var L = norm(lang).toLowerCase();
    // Try by slug, then by name, then any iso
    var met = pickMetier(slug);
    for (var i=0;i<list.length;i++){
      var x=list[i]||{};
      var xIso = x.code_iso || x.country_code || x.iso;
      var xLang = (x.lang || x.language_finale || x.language || "").toLowerCase();
      var xName = x.Nom || x.name || x.nom || "";
      var xSlug = x.slug || x.metier_slug || x.job_slug || "";
      if (matchIso(xIso, I) && (L ? matchStr(xLang, L) : true) && (matchStr(xSlug, s) || (met && matchStr(xName, met.name)) || matchStr(xName, s))) return x;
    }
    // fallback ignore lang
    for (var j=0;j<list.length;j++){
      var y=list[j]||{};
      var yIso = y.code_iso || y.country_code || y.iso;
      if (matchIso(yIso, I)) return y;
    }
    // last resort any
    return list[0] || null;
  }

  function getLang(iso){
    var qp = getParam("lang");
    if (qp) return norm(qp).toLowerCase();
    var c = pickCountry(iso);
    var l = c && (c.language_finale || c.lang || c.language);
    if (l) return norm(l).toLowerCase();
    var dl = document.documentElement && document.documentElement.lang;
    if (dl) return norm(dl).toLowerCase();
    return "fr";
  }

  // ----------------------------
  // UI: styles + components
  // ----------------------------
  function injectStyles(){
    if (document.getElementById("ulydia-propal-v2-style")) return;
    var css = `
      :root{
        --ul-font: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
        --ul-text:#111827;
        --ul-muted:#6b7280;
        --ul-border:rgba(17,24,39,.10);
        --ul-card:#ffffff;
        --ul-shadow:0 10px 30px rgba(17,24,39,.08);
        --ul-radius:18px;
        --ul-accent:#6d5efc;
        --ul-accent2:#8b5cf6;
        --ul-soft:#f3f4f6;
      }
      #ulydia-metier-root{ font-family:var(--ul-font); color:var(--ul-text); }
      .ul-wrap{ max-width:1120px; margin:0 auto; padding:34px 18px 70px; }
      .ul-header{ display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:12px; }
      .ul-title{ font-size:44px; line-height:1.05; margin:0; font-weight:800; color:var(--ul-accent); letter-spacing:-.02em; }
      .ul-chips{ display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
      .ul-chip{ display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--ul-border); border-radius:999px; background:#fff; color:var(--ul-muted); font-weight:600; font-size:12px; }
      .ul-chip b{ color:var(--ul-text); font-weight:700; }
      .ul-sponsor-wide{ margin:16px 0 18px; border-radius:18px; overflow:hidden; box-shadow:var(--ul-shadow); border:1px solid var(--ul-border); background:linear-gradient(90deg, rgba(109,94,252,.95), rgba(139,92,246,.92)); color:#fff; }
      .ul-sponsor-wide-inner{ display:flex; align-items:center; justify-content:space-between; gap:14px; padding:16px 18px; }
      .ul-sponsor-wide .ul-sponsor-left{ display:flex; flex-direction:column; gap:2px; }
      .ul-sponsor-kicker{ font-size:12px; font-weight:800; letter-spacing:.02em; opacity:.95; }
      .ul-sponsor-sub{ font-size:12px; opacity:.92; }
      .ul-sponsor-cta{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(255,255,255,.18); color:#fff; border:1px solid rgba(255,255,255,.25); border-radius:999px; font-weight:800; font-size:12px; text-decoration:none; white-space:nowrap; }
      .ul-grid{ display:grid; grid-template-columns: 1fr 360px; gap:18px; align-items:start; }
      @media (max-width: 980px){ .ul-grid{ grid-template-columns:1fr; } }
      .ul-card{ background:var(--ul-card); border:1px solid var(--ul-border); border-radius:var(--ul-radius); box-shadow:var(--ul-shadow); overflow:hidden; }
      .ul-card-h{ padding:12px 14px; font-weight:900; font-size:14px; display:flex; align-items:center; gap:8px; }
      .ul-card-b{ padding:14px; font-size:13px; line-height:1.55; color:#111827; }
      .ul-card-b p{ margin:.55em 0; }
      .ul-card-b ul{ padding-left:18px; margin:.5em 0; }
      .ul-card-b li{ margin:.25em 0; }
      .ul-grad-pink{ background:linear-gradient(90deg, rgba(251,207,232,.9), rgba(244,114,182,.20)); }
      .ul-grad-green{ background:linear-gradient(90deg, rgba(167,243,208,.9), rgba(16,185,129,.18)); }
      .ul-grad-purple{ background:linear-gradient(90deg, rgba(221,214,254,.95), rgba(109,94,252,.12)); }
      .ul-grad-orange{ background:linear-gradient(90deg, rgba(254,215,170,.92), rgba(251,146,60,.18)); }
      .ul-grad-blue{ background:linear-gradient(90deg, rgba(191,219,254,.92), rgba(59,130,246,.16)); }
      .ul-side-stack{ display:flex; flex-direction:column; gap:12px; }
      .ul-mini{ font-size:12px; color:var(--ul-muted); }
      .ul-btn{ display:inline-flex; align-items:center; justify-content:center; padding:10px 12px; border-radius:12px; border:1px solid var(--ul-border); background:#fff; font-weight:800; font-size:12px; color:var(--ul-accent); text-decoration:none; }
      .ul-partner-box{ display:grid; grid-template-columns:84px 1fr; gap:12px; align-items:center; }
      .ul-partner-logo{ width:84px; height:84px; border-radius:14px; border:1px solid var(--ul-border); background:#fff; display:flex; align-items:center; justify-content:center; overflow:hidden; }
      .ul-partner-logo img{ width:100%; height:100%; object-fit:cover; }
      .ul-kpis{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .ul-kpi{ border:1px solid var(--ul-border); border-radius:14px; padding:10px; background:#fff; }
      .ul-kpi .t{ font-size:11px; color:var(--ul-muted); font-weight:800; }
      .ul-kpi .v{ margin-top:4px; font-size:12px; font-weight:900; color:#111827; }
      .ul-pills{ display:flex; flex-wrap:wrap; gap:8px; }
      .ul-pill{ display:inline-flex; align-items:center; gap:8px; padding:7px 10px; border-radius:999px; border:1px solid rgba(109,94,252,.18); background:rgba(109,94,252,.08); color:#4338ca; font-weight:800; font-size:12px; }
      .ul-salary-rows{ display:flex; flex-direction:column; gap:12px; margin-top:8px; }
      .ul-sal-row{ display:grid; grid-template-columns:64px 1fr 90px; gap:10px; align-items:center; }
      .ul-sal-lbl{ font-size:12px; font-weight:900; color:#111827; }
      .ul-sal-bar{ height:8px; border-radius:999px; background:rgba(109,94,252,.15); overflow:hidden; }
      .ul-sal-fill{ height:100%; border-radius:999px; background:linear-gradient(90deg, rgba(109,94,252,1), rgba(139,92,246,1)); width:50%; }
      .ul-sal-val{ font-size:11px; color:var(--ul-muted); font-weight:800; text-align:right; }
      .ul-faq{ margin-top:22px; }
      .ul-faq .ul-card-b{ padding:0; }
      .ul-acc-item{ border-top:1px solid var(--ul-border); }
      .ul-acc-btn{ width:100%; text-align:left; background:#fff; border:0; padding:14px; display:flex; justify-content:space-between; gap:12px; cursor:pointer; font-weight:900; font-size:13px; }
      .ul-acc-btn span{ color:#111827; }
      .ul-acc-body{ display:none; padding:0 14px 14px; color:#111827; font-size:13px; line-height:1.55; }
      .ul-acc-body p{ margin:.55em 0; }
      .ul-acc-open .ul-acc-body{ display:block; }
      .ul-acc-ico{ color:var(--ul-muted); font-weight:900; }
      .ul-muted{ color:var(--ul-muted); }
      .ul-empty{ display:none !important; }
    `;
    var st = document.createElement("style");
    st.id = "ulydia-propal-v2-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function card(title, icon, headerClass, bodyHTML){
    var h = `
      <div class="ul-card">
        <div class="ul-card-h ${headerClass||""}">${icon?('<span>'+icon+'</span>'):""}<span>${esc(title||"")}</span></div>
        <div class="ul-card-b">${bodyHTML||""}</div>
      </div>
    `;
    return h;
  }

  function renderPillsFromHTML(html){
    // Convert a rich text (often list) into pill tokens (best-effort).
    var tmp = document.createElement("div");
    tmp.innerHTML = safeHTML(html||"");
    var texts = [];
    qsa("li", tmp).forEach(function(li){
      var t = stripNbsp(li.textContent||"");
      if(t) texts.push(t);
    });
    if(!texts.length){
      var t2 = stripNbsp(tmp.textContent||"");
      if(t2){
        // split by newline/semicolon/comma
        t2.split(/[\n;•]/).forEach(function(p){
          var t = stripNbsp(p);
          if(t) texts.push(t);
        });
      }
    }
    texts = texts.map(function(t){ return t.replace(/^[-–•]\s*/,"").trim(); }).filter(Boolean);
    if(!texts.length) return '<div class="ul-muted">—</div>';
    return '<div class="ul-pills">' + texts.slice(0,18).map(function(t){
      return '<span class="ul-pill">🌿 '+esc(t)+'</span>';
    }).join("") + "</div>";
  }

  function renderPartnerCard(squareUrl, sponsorName, iso, linkUrl){
    var img = squareUrl ? ('<img src="'+esc(squareUrl)+'" alt="Sponsor"/>') : '<span class="ul-mini">Logo</span>';
    var name = sponsorName ? esc(sponsorName) : "Partenaire";
    var sub = iso ? esc(iso) : "";
    var btn = linkUrl ? '<a class="ul-btn" href="'+esc(linkUrl)+'" target="_blank" rel="noopener">En savoir plus</a>' : '';
    return `
      <div class="ul-card">
        <div class="ul-card-h ul-grad-blue">🎓 <span>Premium</span></div>
        <div class="ul-card-b">
          <div class="ul-partner-box">
            <div class="ul-partner-logo">${img}</div>
            <div>
              <div style="font-weight:900">${name}</div>
              <div class="ul-mini">${sub}</div>
              <div style="margin-top:10px">${btn}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderKpiCard(mpb){
    function kpi(title, value){
      value = stripNbsp(value||"");
      if(!value) value = "—";
      return `<div class="ul-kpi"><div class="t">${esc(title)}</div><div class="v">${esc(value)}</div></div>`;
    }
    var remote = mpb ? (mpb.remote_level || "") : "";
    var risk = mpb ? (mpb.automation_risk || "") : "";
    var tte = mpb ? (mpb.time_to_employability || "") : "";
    var growth = mpb ? (mpb.growth_outlook || "") : "";
    var demand = mpb ? (mpb.market_demand || "") : "";
    // keep rich text for long ones
    function rich(title, html){
      var content = html ? safeHTML(html) : "";
      if(!stripNbsp(content.replace(/<[^>]+>/g,""))) content = "<div class='ul-muted'>—</div>";
      return `<div class="ul-kpi" style="grid-column:1 / -1"><div class="t">${esc(title)}</div><div class="v" style="font-weight:700">${content}</div></div>`;
    }

    var html = `
      <div class="ul-card">
        <div class="ul-card-h ul-grad-green">📌 <span>Key indicators</span></div>
        <div class="ul-card-b">
          <div class="ul-kpis">
            ${kpi("Remote", remote)}
            ${kpi("Automation risk", risk)}
            ${rich("Time to employability", tte)}
            ${rich("Growth outlook", growth)}
            ${rich("Market demand", demand)}
          </div>
        </div>
      </div>
    `;
    return html;
  }

  function renderSalaryCard(mpb){
    if(!mpb) return "";
    var cur = stripNbsp(mpb.currency || "€") || "€";
    var jmin = toNum(mpb.junior_min), jmax = toNum(mpb.junior_max);
    var mmin = toNum(mpb.mid_min), mmax = toNum(mpb.mid_max);
    var smin = toNum(mpb.senior_min), smax = toNum(mpb.senior_max);
    var hasAny = [jmin,jmax,mmin,mmax,smin,smax].some(function(x){ return x!==null; });
    if(!hasAny && !stripNbsp(mpb.salary_notes||"")) return "";

    var allMax = Math.max.apply(null, [jmax,mmax,smax,jmin,mmin,smin].filter(function(x){ return x!==null; }).concat([1]));
    function fmt(a,b){
      if(a===null && b===null) return "—";
      if(a!==null && b===null) return esc(a.toLocaleString())+" "+esc(cur);
      if(a===null && b!==null) return "≤ "+esc(b.toLocaleString())+" "+esc(cur);
      return esc(a.toLocaleString())+" - "+esc(b.toLocaleString())+" "+esc(cur);
    }
    function pct(b){
      var v = b===null?0:Math.max(0, Math.min(100, Math.round((b/allMax)*100)));
      return v;
    }
    function row(label, a, b){
      var w = pct(b!==null?b:a);
      return `
        <div class="ul-sal-row">
          <div class="ul-sal-lbl">${esc(label)}</div>
          <div class="ul-sal-bar"><div class="ul-sal-fill" style="width:${w}%"></div></div>
          <div class="ul-sal-val">${fmt(a,b)}</div>
        </div>
      `;
    }
    var notes = safeHTML(mpb.salary_notes || mpb.salaire_bloc || "");
    if(!stripNbsp(notes.replace(/<[^>]+>/g,""))) notes = "<div class='ul-muted'>—</div>";

    return `
      <div class="ul-card">
        <div class="ul-card-h ul-grad-purple">💸 <span>Salary</span></div>
        <div class="ul-card-b">
          <div class="ul-salary-rows">
            ${row("Junior", jmin, jmax)}
            ${row("Mid", mmin, mmax)}
            ${row("Senior", smin, smax)}
          </div>
          <div style="margin-top:12px; border-top:1px solid var(--ul-border); padding-top:12px;">
            ${notes}
          </div>
        </div>
      </div>
    `;
  }

  function renderFAQ(faqs){
    if(!faqs || !faqs.length) return "";
    var items = faqs.map(function(f, idx){
      var q = stripNbsp(f.question || f.q || f.name || "");
      var a = safeHTML(f.answer || f.a || "");
      if(!q || !stripNbsp(a.replace(/<[^>]+>/g,""))) return "";
      return `
        <div class="ul-acc-item" data-i="${idx}">
          <button class="ul-acc-btn" type="button">
            <span>${esc(q)}</span>
            <span class="ul-acc-ico">▾</span>
          </button>
          <div class="ul-acc-body">${a}</div>
        </div>
      `;
    }).join("");
    if(!items.trim()) return "";
    return `
      <div class="ul-faq">
        <div class="ul-card">
          <div class="ul-card-h ul-grad-orange">❓ <span>Questions fréquentes</span></div>
          <div class="ul-card-b">${items}</div>
        </div>
      </div>
    `;
  }

  function bindFAQ(root){
    qsa(".ul-acc-item", root).forEach(function(it){
      var btn = qs(".ul-acc-btn", it);
      if(!btn) return;
      btn.addEventListener("click", function(){
        var open = it.classList.contains("ul-acc-open");
        // close others
        qsa(".ul-acc-item.ul-acc-open", root).forEach(function(o){
          if(o!==it) o.classList.remove("ul-acc-open");
        });
        it.classList.toggle("ul-acc-open", !open);
      });
    });
  }

  // ----------------------------
  // Render
  // ----------------------------
  function render(){
    injectStyles();
    var root = ensureRoot();

    var metierSlug = getParam("metier") || getParam("job") || "";
    var iso = (getParam("country") || getParam("iso") || "").toUpperCase();
    metierSlug = norm(metierSlug);
    iso = norm(iso).toUpperCase();

    if(!metierSlug){
      root.innerHTML = `<div class="ul-wrap">${card("Fiche introuvable", "⚠️", "ul-grad-orange",
        "<div><b>Paramètre manquant :</b> ?metier=...</div>")}</div>`;
      return;
    }
    if(!iso){
      // default to first country if available
      var c0 = (getAllCountries()[0]||{}).iso;
      iso = (c0?String(c0):"FR").toUpperCase();
    }

    var lang = getLang(iso);

    var met = pickMetier(metierSlug) || {};
    var mpb = pickMPB(metierSlug, iso);
    var fiche = pickFicheMetier(metierSlug, iso, lang);

    // Title + sector
    var title = (met && (met.name || met.Nom)) || (fiche && (fiche.Nom || fiche.name)) || metierSlug;
    title = stripNbsp(title) || metierSlug;
    var sector = (met && met.sector) || (fiche && (fiche.secteur || fiche.sector)) || "—";

    var country = pickCountry(iso) || {};
    var countryName = country.name || country.Nom || iso;

    // Sponsor: prefer fiche, else global sponsor object if present
    var sponsorName = fiche && (fiche.sponsor_name || fiche.sponsorName) || (window.__ULYDIA_SPONSOR__ && (window.__ULYDIA_SPONSOR__.name || window.__ULYDIA_SPONSOR__.sponsor_name)) || "";
    var sponsorLogo1 = fiche && (fiche.sponsor_logo_1 || fiche.sponsor_logo1) || (window.__ULYDIA_SPONSOR__ && (window.__ULYDIA_SPONSOR__.sponsor_logo_1 || window.__ULYDIA_SPONSOR__.logo_1)) || "";
    var sponsorLogo2 = fiche && (fiche.sponsor_logo_2 || fiche.sponsor_logo2) || (window.__ULYDIA_SPONSOR__ && (window.__ULYDIA_SPONSOR__.sponsor_logo_2 || window.__ULYDIA_SPONSOR__.logo_2)) || "";
    var sponsorLink = fiche && (fiche.lien_sponsor || fiche.sponsor_link) || (window.__ULYDIA_SPONSOR__ && (window.__ULYDIA_SPONSOR__.lien_sponsor || window.__ULYDIA_SPONSOR__.link)) || "";

    var wideUrl = pickUrl(sponsorLogo2) || pickUrl(country.banner_1 || country.banner1 || country.landscape || country.banner_wide || country.bannerWide);
    var squareUrl = pickUrl(sponsorLogo1) || pickUrl(country.banner_2 || country.banner2 || country.square || country.banner_square || country.bannerSquare);

    if(!sponsorLink){
      sponsorLink = "/sponsor?metier=" + encodeURIComponent(metierSlug) + "&country=" + encodeURIComponent(iso);
    }

    // Wide banner only if we have an image (sponsor or fallback)
    var wideBannerHTML = wideUrl ? `
      <a class="ul-sponsor-wide" href="${esc(sponsorLink)}" target="_blank" rel="noopener">
        <div class="ul-sponsor-wide-inner">
          <div class="ul-sponsor-left">
            <div class="ul-sponsor-kicker">Sponsor</div>
            <div class="ul-sponsor-sub">${esc(sponsorName || "Découvre nos offres partenaires")}</div>
          </div>
          <div class="ul-sponsor-cta">En savoir plus →</div>
        </div>
      </a>
    ` : "";

    // Left column blocks: Always try to show Fiche Metiers blocks (propal design)
    function blockFromFiche(label, icon, headerClass, html){
      var clean = stripNbsp(String(html||"").replace(/<[^>]+>/g,""));
      if(!clean) return "";
      return card(label, icon, headerClass, safeHTML(html));
    }

    var leftBlocks = "";
    if (fiche){
      leftBlocks += blockFromFiche("Vue d’ensemble", "👁️", "ul-grad-blue", fiche.description);
      leftBlocks += blockFromFiche("Missions principales", "🧩", "ul-grad-green", fiche.missions);
      leftBlocks += blockFromFiche("Compétences clés", "🧠", "ul-grad-purple", fiche["Compétences"] || fiche.competences);
      leftBlocks += blockFromFiche("Environnements de travail", "🌿", "ul-grad-orange", fiche.environnements);
      leftBlocks += blockFromFiche("Profil recherché", "🎯", "ul-grad-pink", fiche.profil_recherche);
      leftBlocks += blockFromFiche("Évolutions possibles", "🚀", "ul-grad-blue", fiche.evolutions_possibles);
    }

    // MPB blocks: only if mpb exists for this metier+iso
    var hasMPB = !!mpb;
    if (hasMPB){
      // Match propal-like labels in English for these cards (as in screenshot)
      var formation = mpb.formation || mpb.formation_bloc || "";
      var acces = mpb.acces || mpb.acces_bloc || "";
      var marche = mpb.marche || mpb.marche_bloc || "";
      if(stripNbsp(String(formation).replace(/<[^>]+>/g,""))) leftBlocks = card("Training", "🎓", "ul-grad-pink", safeHTML(formation)) + leftBlocks;
      if(stripNbsp(String(acces).replace(/<[^>]+>/g,""))) leftBlocks = leftBlocks + card("Access to the role", "🚪", "ul-grad-pink", safeHTML(acces));
      if(stripNbsp(String(marche).replace(/<[^>]+>/g,""))) leftBlocks = leftBlocks + card("Market", "📊", "ul-grad-pink", safeHTML(marche));
      var salaryCard = renderSalaryCard(mpb);
      if(salaryCard) leftBlocks = leftBlocks + salaryCard;
    }

    if(!leftBlocks){
      leftBlocks = card("Fiche introuvable", "⚠️", "ul-grad-orange",
        "<div><b>Aucune donnée à afficher</b> pour ce métier/pays.</div><div class='ul-mini'>metier="+esc(metierSlug)+" • country="+esc(iso)+"</div>");
    }

    // Right column stack
    var right = "";
    // Premium partner card always if squareUrl or sponsorName exists
    if (squareUrl || sponsorName){
      right += renderPartnerCard(squareUrl, sponsorName, iso, sponsorLink);
    } else {
      // if no square image, we can hide this block entirely
    }

    if (hasMPB){
      right += renderKpiCard(mpb);

      // Skills & path
      var topFields = mpb.top_fields || "";
      var mustHave = mpb.skills_must_have || "";
      var soft = mpb.soft_skills || "";
      var tools = mpb.tools_stack || "";

      var skillsHTML = `
        <div style="display:flex; flex-direction:column; gap:12px">
          <div>
            <div class="ul-mini" style="font-weight:900; margin-bottom:8px">Key fields</div>
            ${renderPillsFromHTML(topFields)}
          </div>
          <div>
            <div class="ul-mini" style="font-weight:900; margin-bottom:8px">Must-have skills</div>
            ${renderPillsFromHTML(mustHave)}
          </div>
          <div>
            <div class="ul-mini" style="font-weight:900; margin-bottom:8px">Soft skills</div>
            ${renderPillsFromHTML(soft)}
          </div>
          <div>
            <div class="ul-mini" style="font-weight:900; margin-bottom:8px">Tools / stack</div>
            ${renderPillsFromHTML(tools)}
          </div>
        </div>
      `;
      right += card("Skills & path", "🧠", "ul-grad-blue", skillsHTML);

      // Optional extra MPB cards
      function addSmall(title2, icon2, headerClass2, html2){
        if(!stripNbsp(String(html2||"").replace(/<[^>]+>/g,""))) return;
        right += card(title2, icon2, headerClass2, safeHTML(html2));
      }
      addSmall("Certifications", "🏅", "ul-grad-orange", mpb.certifications);
      addSmall("Schools & paths", "🏫", "ul-grad-orange", mpb.schools_or_paths);
      addSmall("Portfolio projects", "🧪", "ul-grad-orange", mpb.portfolio_projects);
    }

    // FAQ filter
    var faqsAll = getAllFaqs();
    var faqs = faqsAll.filter(function(f){
      if(!f) return false;
      var m = f.metier || f.job_slug || f.slug || f.name || "";
      var i = f.iso || f.country_code || f.code_iso || "";
      // allow FAQ without iso to be generic
      var metOk = matchStr(m, metierSlug) || (met && met.name && matchStr(m, met.name));
      var isoOk = !norm(i) || matchIso(i, iso);
      return metOk && isoOk;
    });

    var faqHTML = renderFAQ(faqs);

    var html = `
      <div class="ul-wrap">
        <div class="ul-header">
          <div>
            <h1 class="ul-title">${esc(title)}</h1>
            <div class="ul-chips">
              <span class="ul-chip"><span>Sector:</span> <b>${esc(sector||"—")}</b></span>
              <span class="ul-chip"><span>Country:</span> <b>${esc(iso)}</b></span>
            </div>
          </div>
        </div>

        ${wideBannerHTML}

        <div class="ul-grid">
          <div class="ul-left">
            <div style="display:flex; flex-direction:column; gap:14px">
              ${leftBlocks}
            </div>
          </div>
          <div class="ul-right">
            <div class="ul-side-stack">
              ${right}
            </div>
          </div>
        </div>

        ${faqHTML}
      </div>
    `;

    root.innerHTML = html;
    bindFAQ(root);

    // If no MPB, ensure we don't show MPB-only labels in UI
    if(!hasMPB){
      // nothing else needed; we simply didn't render MPB blocks
      log("[ULYDIA] MPB missing for", metierSlug, iso, "=> showing Fiche Metiers only");
    }
  }

  // ----------------------------
  // Boot (wait for CMS globals if needed)
  // ----------------------------
  function boot(){
    try{ render(); }catch(e){
      warn("[ULYDIA] render error", e);
      var root = ensureRoot();
      root.innerHTML = `<div class="ul-wrap">${card("Erreur", "⚠️", "ul-grad-orange",
        "<div><b>Impossible de rendre la fiche.</b></div><div class='ul-mini'>"+esc(String(e&&e.message||e))+"</div>")}</div>`;
    }
  }

  // Wait a bit for CMS reader, but don't block forever
  var t0 = Date.now();
  (function wait(){
    var ready = true;
    // If MPB globals exist but not yet filled, allow short wait
    if (window.__ULYDIA_CMS_READER_V2__ && !window.__ULYDIA_METIER_PAYS_BLOCS__ && !window.__ULYDIA_MPB__) ready = false;
    if (ready || Date.now()-t0 > 1200) return boot();
    setTimeout(wait, 60);
  })();

})();
