/*!
 * ULYDIA — Metier Page — FINAL ONE FILE (MONO / NO MODULES)
 * V2026-01-30 — MPB + I18N + RENDER (Tailwind CDN)
 * - Uses existing Webflow CMS wrappers (metiersData, sectorsData, paysData, and MPB list .ul-cms-blocs-source)
 * - Renders the "propal" design inside #ulydia-metier-root
 * - No external modules; safe guards; no loops; no duplicate roots
 */
(function(){
  'use strict';

  // ----------------------------
  // Guards
  // ----------------------------
  if (window.__ULYDIA_METIER_FINAL_ONEFILE__) return;
  window.__ULYDIA_METIER_FINAL_ONEFILE__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (!DEBUG) return; try{ console.log.apply(console, arguments); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, arguments); }catch(e){} }

  // Ensure only one #ulydia-metier-root in DOM
  try{
    var roots = document.querySelectorAll('#ulydia-metier-root');
    if (roots && roots.length > 1){
      for (var i=1;i<roots.length;i++){
        try{ roots[i].parentNode && roots[i].parentNode.removeChild(roots[i]); }catch(e){}
      }
      warn('[ULYDIA] removed duplicate #ulydia-metier-root nodes:', roots.length-1);
    }
  }catch(e){}

  // ----------------------------
  // Helpers
  // ----------------------------
  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function getParam(name){
    try { return new URLSearchParams(location.search).get(name) || ''; } catch(e){ return ''; }
  }
  function setParams(obj){
    try{
      var u = new URL(location.href);
      Object.keys(obj||{}).forEach(function(k){
        if (obj[k] === null || obj[k] === undefined || obj[k] === '') u.searchParams.delete(k);
        else u.searchParams.set(k, String(obj[k]));
      });
      // keep in-page navigation stable
      location.href = u.toString();
    }catch(e){}
  }
  function escapeHTML(s){
    return String(s||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  function stripTags(s){ return String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }

  function parseNum(s){
    s = String(s||'').replace(/\s+/g,'').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  // Read JSON from script#... type application/json
  function readJsonScript(id){
    var el = document.getElementById(id);
    if (!el) return null;
    var txt = (el.textContent || el.innerText || '').trim();
    if (!txt) return [];
    try{ return JSON.parse(txt); }catch(e){ warn('[ULYDIA] invalid JSON in #' + id, e); return []; }
  }

  // ----------------------------
  // Language resolution (no __ULYDIA_LANG__ priming)
  // Priority: ?lang=  > country defaultLang from Pays > html[lang] > navigator
  // ----------------------------
  function resolveLang(countryIso, countries){
    var q = norm(getParam('lang'));
    if (q) return q.slice(0,2);

    var iso = norm(countryIso).toUpperCase();
    if (countries && iso){
      for (var i=0;i<countries.length;i++){
        var c = countries[i];
        if (String(c.iso||c.code||'').toUpperCase() === iso){
          var l = norm(c.lang || c.language_finale || c.langue_finale || c.language || c.default_lang);
          if (l) return l.slice(0,2);
          break;
        }
      }
    }

    var htmlLang = norm(document.documentElement.getAttribute('lang'));
    if (htmlLang) return htmlLang.slice(0,2);

    var nav = norm((navigator.language||navigator.userLanguage||''));
    return (nav ? nav.slice(0,2) : 'fr');
  }

  // Simple i18n dictionary for section titles (fallback EN)
  var I18N = {
    fr: {
      filters_country: 'Pays',
      filters_sector: 'Secteur d\'activité',
      filters_job: 'Rechercher un métier',
      view_all: 'Vue d\'ensemble',
      partner: 'Partenaire',
      learn_more: 'En savoir plus',
      indicators: 'Indicateurs clés',
      salary: 'Grille salariale',
      junior: 'Junior',
      mid: 'Confirmé',
      senior: 'Senior',
      variable: 'Part variable',
      yes: 'Oui',
      no: 'Non',
      faq: 'Foire aux questions'
    },
    de: {
      filters_country: 'Land',
      filters_sector: 'Branche',
      filters_job: 'Beruf suchen',
      view_all: 'Überblick',
      partner: 'Partner',
      learn_more: 'Mehr erfahren',
      indicators: 'Schlüsselindikatoren',
      salary: 'Gehaltsübersicht',
      junior: 'Junior',
      mid: 'Erfahren',
      senior: 'Senior',
      variable: 'Variabler Anteil',
      yes: 'Ja',
      no: 'Nein',
      faq: 'Häufige Fragen'
    },
    en: {
      filters_country: 'Country',
      filters_sector: 'Sector',
      filters_job: 'Search a job',
      view_all: 'Overview',
      partner: 'Partner',
      learn_more: 'Learn more',
      indicators: 'Key indicators',
      salary: 'Salary ranges',
      junior: 'Junior',
      mid: 'Mid-level',
      senior: 'Senior',
      variable: 'Variable share',
      yes: 'Yes',
      no: 'No',
      faq: 'FAQ'
    }
  };
  function t(lang, key){
    lang = (lang && I18N[lang]) ? lang : 'en';
    return (I18N[lang] && I18N[lang][key]) || (I18N.en[key] || key);
  }

  // ----------------------------
  // Inject Tailwind CDN once (required for the design)
  // ----------------------------
  function ensureTailwind(cb){
    try{
      if (window.__ULYDIA_TW_READY__) return cb && cb();
      if (document.querySelector('script[data-ulydia-tailwind]')) return cb && cb();

      var s = document.createElement('script');
      s.setAttribute('data-ulydia-tailwind', '1');
      s.src = 'https://cdn.tailwindcss.com';
      s.async = true;
      s.onload = function(){ window.__ULYDIA_TW_READY__ = true; cb && cb(); };
      s.onerror = function(){ warn('[ULYDIA] Tailwind CDN failed'); cb && cb(); };
      document.head.appendChild(s);
    }catch(e){ cb && cb(); }
  }

  // Optional: small CSS additions to match screenshot
  function ensureLocalStyles(){
    if (document.getElementById('ulydia-metier-style')) return;
    var st = document.createElement('style');
    st.id = 'ulydia-metier-style';
    st.type = 'text/css';
    st.textContent = [
      '#ulydia-metier-root{min-height:60vh;}',
      '.ul-card{border-radius:1.25rem; box-shadow:0 12px 30px rgba(2,6,23,.08); background:#fff; overflow:hidden;}',
      '.ul-card-h{padding:1rem 1.25rem; font-weight:800; display:flex; align-items:center; gap:.75rem;}',
      '.ul-card-b{padding:1.25rem;}',
      '.ul-grad-blue{background:linear-gradient(90deg, rgba(59,130,246,.20), rgba(59,130,246,.08));}',
      '.ul-grad-green{background:linear-gradient(90deg, rgba(34,197,94,.20), rgba(34,197,94,.08));}',
      '.ul-grad-purple{background:linear-gradient(90deg, rgba(168,85,247,.22), rgba(168,85,247,.08));}',
      '.ul-grad-orange{background:linear-gradient(90deg, rgba(249,115,22,.22), rgba(249,115,22,.08));}',
      '.ul-grad-teal{background:linear-gradient(90deg, rgba(20,184,166,.20), rgba(20,184,166,.08));}',
      '.ul-grad-amber{background:linear-gradient(90deg, rgba(245,158,11,.22), rgba(245,158,11,.08));}',
      '.ul-bul li{display:flex; gap:.75rem; align-items:flex-start; margin:.55rem 0;}',
      '.ul-bul li:before{content:"→"; color:#6366f1; font-weight:800; line-height:1.4;}',
      '.ul-rt a{color:#4f46e5; text-decoration:underline;}',
      '.ul-rt p{margin:.55rem 0;}',
      '.ul-rt ul{margin:.65rem 0; padding-left:0;}',
      '.ul-rt li{list-style:none;}',
      '.ul-pill{display:inline-flex; align-items:center; gap:.5rem; padding:.35rem .6rem; border-radius:999px; font-weight:600; font-size:.85rem; background:rgba(99,102,241,.10); color:#3730a3;}',
      '.ul-input{border:1px solid rgba(15,23,42,.14); border-radius:.75rem; padding:.6rem .8rem; width:100%; outline:none;}',
      '.ul-input:focus{border-color:rgba(99,102,241,.65); box-shadow:0 0 0 4px rgba(99,102,241,.16);} ',
      '.ul-btn{border-radius:.9rem; padding:.65rem .9rem; font-weight:700;}',
      '.ul-btn-primary{background:#6366f1; color:#fff;}',
      '.ul-btn-primary:hover{filter:brightness(.97);} ',
      '.ul-muted{color:rgba(15,23,42,.6);} ',
      '.ul-h1{font-size:clamp(2rem, 3vw, 3rem); font-weight:900; letter-spacing:-.02em;}',
      '.ul-sub{font-size:1.05rem; color:rgba(15,23,42,.65); font-weight:500;}',
      '.ul-container{max-width:1100px; margin:0 auto; padding:0 1rem;}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ----------------------------
  // MPB Reader (Webflow CMS wrapper)
  // expects: .ul-cms-blocs-source .w-dyn-item with classes shown in your screenshot
  // ----------------------------
  function readMpbFromDom(){
    var out = [];
    var wrap = document.querySelector('.ul-cms-blocs-source');
    if (!wrap) return out;

    var items = wrap.querySelectorAll('.w-dyn-item');
    for (var i=0;i<items.length;i++){
      var it = items[i];

      function txt(cls){
        var el = it.querySelector('.' + cls);
        return el ? (el.textContent || '').trim() : '';
      }
      function html(cls){
        var el = it.querySelector('.' + cls);
        if (!el) return '';
        // accept rich text or plain containers
        return (el.innerHTML || '').trim();
      }

      var obj = {
        metier_key: txt('js-bloc-metier'),
        iso: (txt('js-bloc-iso') || '').toUpperCase(),

        // Rich text blocks (already exist in Webflow as wrappers)
        formation: html('js-bf-formation'),
        acces: html('js-bf-acces'),
        salaire: html('js-bf-salaire'),
        marche: html('js-bf-marche'),
        education_level_local: html('js-bf-education_level_local'),
        top_fields: html('js-bf-top_fields'),
        certifications: html('js-bf-certifications'),
        schools_or_paths: html('js-bf-schools_or_paths'),
        equivalences_reconversion: html('js-bf-equivalences_reconversion'),
        entry_routes: html('js-bf-entry_routes'),
        first_job_titles: html('js-bf-first_job_titles'),
        typical_employers: html('js-bf-typical_employers'),
        portfolio_projects: html('js-bf-portfolio_projects'),
        skills_must_have: html('js-bf-skills_must_have'),
        soft_skills: html('js-bf-soft_skills'),
        tools_stack: html('js-bf-tools_stack'),
        time_to_employability: html('js-bf-time_to_employability'),
        hiring_sectors: html('js-bf-hiring_sectors'),
        degrees_examples: html('js-bf-degrees_examples'),
        growth_outlook: html('js-bf-growth_outlook'),
        market_demand: html('js-bf-market_demand'),
        salary_notes: html('js-bf-salary_notes'),
        education_level: html('js-bf-education_level'),

        // Chips / numeric
        chip_remote_level: txt('js-chip-remote_level'),
        chip_automation_risk: txt('js-chip-automation_risk'),
        chip_currency: txt('js-chip-currency'),

        sal_junior_min: parseNum(txt('js-sal-junior-min')),
        sal_junior_max: parseNum(txt('js-sal-junior-max')),
        sal_mid_min: parseNum(txt('js-sal-mid-min')),
        sal_mid_max: parseNum(txt('js-sal-mid-max')),
        sal_senior_min: parseNum(txt('js-sal-senior-min')),
        sal_senior_max: parseNum(txt('js-sal-senior-max')),

        statut_generation: txt('js-statut-generation'),
        sal_variable_share: txt('js-sal-variable-share')
      };

      // keep only meaningful rows
      if (norm(obj.metier_key) || norm(obj.iso)) out.push(obj);
    }
    return out;
  }

  // ----------------------------
  // Card builder
  // ----------------------------
  function card(opts){
    var title = opts.title || '';
    var grad = opts.grad || 'ul-grad-blue';
    var icon = opts.icon || '✨';
    var body = opts.body || '';
    if (!body || !stripTags(body)) return '';

    return [
      '<section class="ul-card">',
        '<div class="ul-card-h ', grad ,'">',
          '<span style="font-size:1.35rem;">', escapeHTML(icon), '</span>',
          '<div style="font-size:1.25rem;">', escapeHTML(title), '</div>',
        '</div>',
        '<div class="ul-card-b ul-rt">',
          body,
        '</div>',
      '</section>'
    ].join('');
  }

  function cardBullets(opts){
    var title = opts.title || '';
    var grad = opts.grad || 'ul-grad-purple';
    var icon = opts.icon || '→';
    var lines = (opts.lines || []).filter(Boolean);
    if (!lines.length) return '';
    var lis = lines.map(function(x){ return '<li><div>'+ escapeHTML(x) +'</div></li>'; }).join('');
    return [
      '<section class="ul-card">',
        '<div class="ul-card-h ', grad ,'">',
          '<span style="font-size:1.35rem;">', escapeHTML(icon), '</span>',
          '<div style="font-size:1.25rem;">', escapeHTML(title), '</div>',
        '</div>',
        '<div class="ul-card-b">',
          '<ul class="ul-bul">', lis, '</ul>',
        '</div>',
      '</section>'
    ].join('');
  }

  function formatRange(min, max, currency){
    if (min == null && max == null) return '';
    currency = currency || '€';
    if (min != null && max != null) return min + '–' + max + currency;
    if (min != null) return '≥ ' + min + currency;
    return '≤ ' + max + currency;
  }

  function salaryCard(lang, mpb){
    var cur = mpb.chip_currency || '€';
    var has = (mpb.sal_junior_min!=null || mpb.sal_junior_max!=null || mpb.sal_mid_min!=null || mpb.sal_mid_max!=null || mpb.sal_senior_min!=null || mpb.sal_senior_max!=null);
    if (!has) return '';

    var rows = [
      {k:'junior', min: mpb.sal_junior_min, max: mpb.sal_junior_max},
      {k:'mid', min: mpb.sal_mid_min, max: mpb.sal_mid_max},
      {k:'senior', min: mpb.sal_senior_min, max: mpb.sal_senior_max}
    ];

    // compute max for bar scaling
    var vmax = 0;
    rows.forEach(function(r){
      vmax = Math.max(vmax, r.max||0, r.min||0);
    });
    vmax = vmax || 1;

    var html = rows.map(function(r){
      var label = t(lang, r.k);
      var a = (r.min||0);
      var b = (r.max||r.min||0);
      var pct = Math.min(100, Math.max(8, Math.round((b / vmax) * 100)));
      return [
        '<div style="margin:.65rem 0;">',
          '<div style="display:flex; align-items:center; justify-content:space-between; gap:.75rem;">',
            '<div style="font-weight:800;">', escapeHTML(label), '</div>',
            '<div class="ul-muted" style="font-weight:700;">', escapeHTML(formatRange(r.min, r.max, cur)), '</div>',
          '</div>',
          '<div style="height:.55rem; background:rgba(15,23,42,.08); border-radius:999px; overflow:hidden; margin-top:.35rem;">',
            '<div style="height:100%; width:', pct ,'%; background:#22c55e; border-radius:999px;"></div>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');

    var notes = stripTags(mpb.salary_notes || '') ? ('<div class="ul-muted" style="margin-top:.8rem; font-weight:600;">'+ escapeHTML(stripTags(mpb.salary_notes)) +'</div>') : '';
    var variable = (mpb.sal_variable_share || '').trim();
    if (variable) notes += '<div class="ul-muted" style="margin-top:.35rem; font-weight:600;">'+ escapeHTML(t(lang,'variable')) +': ' + escapeHTML(variable) + '</div>';

    return [
      '<section class="ul-card">',
        '<div class="ul-card-h ul-grad-green">',
          '<span style="font-size:1.35rem;">💶</span>',
          '<div style="font-size:1.25rem;">', escapeHTML(t(lang,'salary')), '</div>',
        '</div>',
        '<div class="ul-card-b">',
          html,
          notes,
        '</div>',
      '</section>'
    ].join('');
  }

  function indicatorCard(lang, mpb){
    var rows = [];
    if (mpb.chip_remote_level) rows.push({label: 'Télétravail', value: mpb.chip_remote_level, icon:'🏠'});
    if (mpb.chip_automation_risk) rows.push({label: 'Risque automation', value: mpb.chip_automation_risk, icon:'🤖'});
    if (mpb.statut_generation) rows.push({label: 'Statut', value: mpb.statut_generation, icon:'📌'});
    if (!rows.length) return '';

    var items = rows.map(function(r){
      return [
        '<div style="display:flex; gap:.75rem; align-items:flex-start; padding:.6rem .75rem; border:1px solid rgba(15,23,42,.10); border-radius:1rem; margin:.55rem 0;">',
          '<div style="font-size:1.15rem;">', escapeHTML(r.icon), '</div>',
          '<div>',
            '<div class="ul-muted" style="font-weight:800; font-size:.9rem;">', escapeHTML(r.label), '</div>',
            '<div style="font-weight:900;">', escapeHTML(r.value), '</div>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');

    return [
      '<section class="ul-card">',
        '<div class="ul-card-h" style="background:#4f46e5; color:#fff;">',
          '<span style="font-size:1.35rem;">📊</span>',
          '<div style="font-size:1.25rem;">', escapeHTML(t(lang,'indicators')), '</div>',
        '</div>',
        '<div class="ul-card-b">',
          items,
        '</div>',
      '</section>'
    ].join('');
  }

  // ----------------------------
  // Render
  // ----------------------------
  function render(){
    ensureLocalStyles();

    var root = document.getElementById('ulydia-metier-root');
    if (!root){
      root = document.createElement('div');
      root.id = 'ulydia-metier-root';
      document.body.appendChild(root);
    }

    // data sources
    var metiers = readJsonScript('metiersData') || (window.__ULYDIA_METIERS__ || []);
    var sectors = readJsonScript('sectorsData') || (window.__ULYDIA_SECTEURS__ || window.__ULYDIA_SECTORS__ || []);
    var countries = readJsonScript('paysData') || (window.__ULYDIA_PAYS__ || window.__ULYDIA_COUNTRIES__ || []);
    var mpbAll = readMpbFromDom();

    // url selection
    var metierSlug = getParam('metier');
    var countryIso = (getParam('country') || 'FR').toUpperCase();

    // resolve metier
    var metier = null;
    var ms = norm(metierSlug);
    for (var i=0;i<metiers.length;i++){
      if (norm(metiers[i].slug) === ms){ metier = metiers[i]; break; }
    }
    if (!metier && metiers.length) metier = metiers[0];

    // resolve lang
    var lang = resolveLang(countryIso, countries);
    // IMPORTANT: do not "prime" __ULYDIA_LANG__ (this caused browser-dependent overrides)
    window.__ULYDIA_LANG_RESOLVED__ = lang;

    // match MPB row
    var mpb = null;
    if (metier){
      var mName = norm(metier.name || metier.metier || '');
      var mSlug = norm(metier.slug || '');
      for (var j=0;j<mpbAll.length;j++){
        var row = mpbAll[j];
        if (row.iso && row.iso.toUpperCase() !== countryIso) continue;
        var key = norm(row.metier_key);
        if (!key) continue;
        if (key === mName || key === mSlug){
          mpb = row; break;
        }
      }
    }
    mpb = mpb || { iso: countryIso, metier_key: (metier && (metier.name||metier.slug)) || '' };

    // Build options
    function buildOptions(list, getVal, getLab, selected){
      selected = String(selected||'');
      var out = list.map(function(x){
        var v = String(getVal(x)||'');
        var l = String(getLab(x)||v);
        var sel = (String(v).toUpperCase() === selected.toUpperCase()) ? ' selected' : '';
        return '<option value="'+ escapeHTML(v) +'"'+ sel +'>'+ escapeHTML(l) +'</option>';
      }).join('');
      return out;
    }

    var countryOptions = buildOptions(
      countries,
      function(c){ return (c.iso||c.code_iso||c.code||'').toUpperCase(); },
      function(c){ return c.name || c.nom || c.country || (c.iso||''); },
      countryIso
    );

    // selected sector from metier
    var sectorSelected = (metier && (metier.secteur || metier.sector || metier.sector_slug || metier.secteur_slug)) || '';
    var sectorOptions = buildOptions(
      sectors,
      function(s){ return s.id || s.slug || s.sector || ''; },
      function(s){ return s.name || s.nom || s.title || s.slug || ''; },
      sectorSelected
    );

    // job datalist filtered by sector (best effort)
    function metierLabel(m){ return (m && (m.name||m.metier||m.slug)) || ''; }
    var filtered = metiers.filter(function(m){
      if (!sectorSelected) return true;
      var ms = norm(String(m.secteur||m.sector||m.sector_slug||m.secteur_slug||''));
      var ss = norm(String(sectorSelected||''));
      return (!ss || ms === ss);
    });
    var jobDatalist = filtered.map(function(m){ return '<option value="'+ escapeHTML(String(m.slug||'')) +'">'+ escapeHTML(metierLabel(m)) +'</option>'; }).join('');

    var title = metier ? (metier.name || metierLabel(metier)) : 'Fiche métier';
    var subtitle = stripTags(mpb.top_fields) ? stripTags(mpb.top_fields).slice(0,140) : '';

    // Partner banners: user already has sponsor system. Keep placeholders (slots).
    var bannerTop = '<div id="ulydia-banner-top-slot" class="ul-card" style="padding:0; overflow:hidden;"><div style="padding:1.1rem;" class="ul-muted">Banner slot (top)</div></div>';
    var bannerAfterContent = '<div id="ulydia-banner-before-faq-slot" class="ul-card" style="padding:0; overflow:hidden;"><div style="padding:1.1rem;" class="ul-muted">Banner slot (before FAQ)</div></div>';

    // Left column cards (match screenshot order)
    var leftCards = [
      card({ title: t(lang,'view_all'), icon:'📄', grad:'ul-grad-blue', body: mpb.top_fields || mpb.formation || '' }),
      card({ title: 'Hauptaufgaben', icon:'✅', grad:'ul-grad-green', body: mpb.market_demand || mpb.growth_outlook || mpb.marche || '' }),
      card({ title: 'Schlüsselkompetenzen', icon:'✏️', grad:'ul-grad-purple', body: mpb.skills_must_have || mpb.soft_skills || '' }),
      card({ title: 'Niveau d\'études & diplôme', icon:'🎓', grad:'ul-grad-purple', body: mpb.education_level_local || mpb.education_level || mpb.degrees_examples || '' }),
      card({ title: 'Débouchés & premiers postes', icon:'🧭', grad:'ul-grad-blue', body: (mpb.first_job_titles || '') + (mpb.typical_employers || '') + (mpb.hiring_sectors || '') }),
      card({ title: 'Accès au métier & reconversion', icon:'🔁', grad:'ul-grad-teal', body: (mpb.entry_routes || '') + (mpb.equivalences_reconversion || '') }),
      card({ title: 'Arbeitsumfelder', icon:'🧩', grad:'ul-grad-orange', body: mpb.acces || mpb.formation || '' })
    ].filter(Boolean).join('<div style="height:1rem"></div>');

    // Right column cards
    var rightCards = [
      '<section class="ul-card"><div class="ul-card-h ul-grad-blue"><span style="font-size:1.35rem;">🤝</span><div style="font-size:1.25rem;">'+ escapeHTML(t(lang,'partner')) +'</div></div><div class="ul-card-b">'+
        '<div id="ulydia-partner-slot" class="ul-muted" style="min-height:140px; display:flex; align-items:center; justify-content:center;">Partner slot</div>'+
        '<div style="margin-top:.9rem;"><a href="/sponsor" class="ul-btn ul-btn-primary" style="display:flex; align-items:center; justify-content:center; gap:.5rem; text-decoration:none;">↗ '+ escapeHTML(t(lang,'learn_more')) +'</a></div>'+
      '</div></section>',
      indicatorCard(lang, mpb),
      salaryCard(lang, mpb),
      card({ title: 'Compétences incontournables', icon:'🧠', grad:'ul-grad-purple', body: mpb.skills_must_have || '' }),
      card({ title: 'Soft Skills', icon:'🌸', grad:'ul-grad-orange', body: mpb.soft_skills || '' }),
      card({ title: 'Stack Technique Populaire', icon:'🧰', grad:'ul-grad-blue', body: mpb.tools_stack || '' }),
      card({ title: 'Certifications utiles', icon:'🏅', grad:'ul-grad-amber', body: mpb.certifications || '' }),
      card({ title: 'Écoles / Parcours recommandés', icon:'🏫', grad:'ul-grad-teal', body: mpb.schools_or_paths || '' }),
      card({ title: 'Projets Portfolio essentiels', icon:'🗂️', grad:'ul-grad-green', body: mpb.portfolio_projects || '' })
    ].filter(Boolean).join('<div style="height:1rem"></div>');

    // FAQ slot: you already have FAQ system elsewhere; keep slot placeholder
    var faqSlot = '<section class="ul-card"><div class="ul-card-h ul-grad-amber"><span style="font-size:1.35rem;">❓</span><div style="font-size:1.25rem;">'+ escapeHTML(t(lang,'faq')) +'</div></div><div class="ul-card-b"><div id="ulydia-faq-slot" class="ul-muted">FAQ slot</div></div></section>';

    root.innerHTML = [
      '<div class="ul-container" style="padding-top:1.25rem; padding-bottom:3rem;">',

        // Filters row
        '<div class="ul-card" style="padding:1.05rem 1.15rem; margin-bottom:1.25rem;">',
          '<div style="display:grid; grid-template-columns: 1fr 1fr 1.3fr; gap:1rem; align-items:end;">',
            '<div>',
              '<div class="ul-muted" style="font-weight:800; margin-bottom:.35rem;">', escapeHTML(t(lang,'filters_country')) ,'</div>',
              '<select id="ul-country" class="ul-input">', countryOptions ,'</select>',
            '</div>',
            '<div>',
              '<div class="ul-muted" style="font-weight:800; margin-bottom:.35rem;">', escapeHTML(t(lang,'filters_sector')) ,'</div>',
              '<select id="ul-sector" class="ul-input">', sectorOptions ,'</select>',
            '</div>',
            '<div>',
              '<div class="ul-muted" style="font-weight:800; margin-bottom:.35rem;">', escapeHTML(t(lang,'filters_job')) ,'</div>',
              '<input id="ul-job" class="ul-input" list="ul-job-list" placeholder="Ex: développeur..." value="', escapeHTML(metierSlug||''), '"/>',
              '<datalist id="ul-job-list">', jobDatalist ,'</datalist>',
            '</div>',
          '</div>',
          '<div style="margin-top:.8rem; display:flex; gap:.75rem; align-items:center;">',
            '<button id="ul-apply" class="ul-btn ul-btn-primary">OK</button>',
            '<div class="ul-muted" style="font-weight:700;">', escapeHTML(countryIso), ' · ', escapeHTML(lang), '</div>',
          '</div>',
        '</div>',

        // Hero
        '<div style="display:flex; gap:1rem; align-items:flex-start; margin-bottom:1.25rem;">',
          '<div class="ul-pill">↗ Fiche métier</div>',
        '</div>',
        '<div style="display:flex; gap:1rem; align-items:flex-start; margin-bottom:1rem;">',
          '<div style="width:52px; height:52px; border-radius:14px; background:#6d28d9; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900;">&lt;/&gt;</div>',
          '<div>',
            '<div class="ul-h1">', escapeHTML(title), '</div>',
            '<div class="ul-sub">', escapeHTML(subtitle), '</div>',
          '</div>',
        '</div>',

        // Top banner
        '<div style="margin: 1.25rem 0;">', bannerTop ,'</div>',

        // Main grid
        '<div style="display:grid; grid-template-columns: 2fr 1fr; gap:1.25rem; align-items:start;">',
          '<div>', leftCards ,'</div>',
          '<div>', rightCards ,'</div>',
        '</div>',

        // Banner before FAQ
        '<div style="margin: 1.25rem 0;">', bannerAfterContent ,'</div>',

        // FAQ
        faqSlot,

      '</div>'
    ].join('');

    // Wire controls
    function apply(){
      var iso = (document.getElementById('ul-country')||{}).value || countryIso;
      var sec = (document.getElementById('ul-sector')||{}).value || '';
      var job = (document.getElementById('ul-job')||{}).value || metierSlug;
      // ensure job is a slug if user typed a name: best effort match
      var jobNorm = norm(job);
      var found = null;
      for (var i=0;i<metiers.length;i++){
        if (norm(metiers[i].slug) === jobNorm){ found = metiers[i]; break; }
        if (!found && norm(metiers[i].name) === jobNorm) found = metiers[i];
      }
      if (found) job = found.slug || job;
      setParams({ country: String(iso).toUpperCase(), metier: job, lang: getParam('lang') || null });
    }
    var btn = document.getElementById('ul-apply');
    if (btn) btn.addEventListener('click', apply);

    var jobInput = document.getElementById('ul-job');
    if (jobInput) jobInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') apply(); });

    log('[ULYDIA] render ok', {lang: lang, metier: metierSlug, country: countryIso, mpb: !!mpbAll.length});
  }

  // Boot
  function boot(){
    ensureTailwind(function(){
      try{ render(); }catch(e){ warn('[ULYDIA] render failed', e); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();