
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

  // ---------------------------------------------------------
  // I18N (titles / UI strings only, not CMS content)
  // Source of truth: ctx.lang (catalog pays language), fallback 'en'
  // ---------------------------------------------------------
  var I18N = {
    en: { sector:"Sector", country:"Country", sponsor:"Sponsor", premium:"Premium", partner:"Partner",
          learn_more:"Learn more", overview:"Overview", missions:"Missions", skills:"Skills", training:"Training", access:"Access", market:"Market", salary:"Salary",
          work_environment:"Work environment", profile:"Profile", career_path:"Career path",
          faqs:"Frequently asked questions",
          not_available_title:"Not available",
          not_available_msg_prefix:"This job does not exist for the country "
    },
    fr: { sector:"Secteur", country:"Pays", sponsor:"Sponsor", premium:"Premium", partner:"Partenaire",
          learn_more:"En savoir plus", overview:"Aperçu", missions:"Missions", skills:"Compétences", training:"Formation", access:"Accès", market:"Marché", salary:"Salaire",
          work_environment:"Environnements de travail", profile:"Profil", career_path:"Évolutions possibles",
          faqs:"Questions fréquentes",
          not_available_title:"Non disponible",
          not_available_msg_prefix:"Ce métier n'existe pas pour le pays "
    },
    de: { sector:"Sektor", country:"Land", sponsor:"Sponsor", premium:"Premium", partner:"Partner",
          learn_more:"Mehr erfahren", overview:"Überblick", missions:"Aufgaben", skills:"Kompetenzen", training:"Ausbildung", access:"Zugang", market:"Markt", salary:"Gehalt",
          work_environment:"Arbeitsumfeld", profile:"Profil", career_path:"Karriereweg",
          faqs:"Häufige Fragen",
          not_available_title:"Nicht verfügbar",
          not_available_msg_prefix:"Dieser Beruf existiert nicht für das Land "
    },
    es: { sector:"Sector", country:"País", sponsor:"Patrocinio", premium:"Premium", partner:"Socio",
          learn_more:"Más información", overview:"Resumen", missions:"Misiones", skills:"Habilidades", training:"Formación", access:"Acceso", market:"Mercado", salary:"Salario",
          work_environment:"Entorno de trabajo", profile:"Perfil", career_path:"Evolución profesional",
          faqs:"Preguntas frecuentes",
          not_available_title:"No disponible",
          not_available_msg_prefix:"Este empleo no existe para el país "
    },
    it: { sector:"Settore", country:"Paese", sponsor:"Sponsor", premium:"Premium", partner:"Partner",
          learn_more:"Scopri di più", overview:"Panoramica", missions:"Mansioni", skills:"Competenze", training:"Formazione", access:"Accesso", market:"Mercato", salary:"Stipendio",
          work_environment:"Ambiente di lavoro", profile:"Profilo", career_path:"Percorso di carriera",
          faqs:"Domande frequenti",
          not_available_title:"Non disponibile",
          not_available_msg_prefix:"Questo lavoro non esiste per il paese "
    }
  };

  function ui(lang, key){
    lang = String(lang||"en").toLowerCase();
    var base = I18N[lang] || I18N.en;
    return (base && base[key]) || (I18N.en && I18N.en[key]) || key;
  }

  function langFromCtx(ctx){
    return String((ctx && ctx.country && ctx.country.lang) || 'en').toLowerCase();
  }
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
    var wide = pickUrl(
      sponsor && pickSponsorUrl(sponsor, 'wide'),
      sponsor && (sponsor.logo_wide || sponsor.logoWide || sponsor.banner_wide || sponsor.bannerWide),
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
    var lang = langFromCtx(ctx);
    pills.innerHTML = '<span class="u-pill">'+esc(ui(lang,'sector'))+': <b>'+esc(ctx.sector || '—')+'</b></span>'+
      '<span class="u-pill">'+esc(ui(lang,'country'))+': <b>'+esc(ctx.iso || '—')+'</b></span>';

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
      if (f.description) left.appendChild(card(ui(langFromCtx(ctx),'overview'), '', f.description));
      if (f.missions) left.appendChild(card(ui(langFromCtx(ctx),'missions'), '', f.missions));
      if (f.competences) left.appendChild(card(ui(langFromCtx(ctx),'skills'), '', f.competences));
      if (f.environnements) left.appendChild(card(ui(langFromCtx(ctx),'work_environment'), '', f.environnements));
      if (f.profil_recherche) left.appendChild(card(ui(langFromCtx(ctx),'profile'), '', f.profil_recherche));
      if (f.evolutions_possibles) left.appendChild(card(ui(langFromCtx(ctx),'career_path'), '', f.evolutions_possibles));
    }

    // MPB blocks
    if (ctx.mpb){
      if (ctx.mpb.formation) left.appendChild(card(ui(langFromCtx(ctx),'training'), '', ctx.mpb.formation));
      if (ctx.mpb.acces) left.appendChild(card(ui(langFromCtx(ctx),'access'), '', ctx.mpb.acces));
      if (ctx.mpb.marche) left.appendChild(card(ui(langFromCtx(ctx),'market'), '', ctx.mpb.marche));
      if (ctx.mpb.environnements) left.appendChild(card(ui(langFromCtx(ctx),'work_environment'), '', ctx.mpb.environnements));
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
    if (!q.metier){
      ensureRoot().innerHTML = '<div class="u-card"><div class="u-card-h">Missing job</div><div class="u-card-b">Use the URL parameter <b>?metier=slug</b>.</div></div>';
      return;
    }

    async function go(){


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

    // MPB can be missing for some (metier + country). We still render the page using fiche data.
    // Show "Not available" only if NOTHING exists (no fiche AND no mpb).
    if (!ctx.mpb && !ctx.fiche) {
      var root0 = ensureRoot();
      root0.innerHTML = '';
      root0.appendChild(renderNotAvailable(ctx));
      return;
    }

    // Render page (banners pending), then resolve sponsor and rerender banners without showing non-sponsor first
    renderPage(ctx);

    fetchSponsor(ctx.slug, ctx.iso).then(function(s){
      ctx.sponsor = s || null;
      renderPage(ctx);
    });
    log('[ULYDIA] v2.9 ready', {metier: ctx.slug, iso: ctx.iso, hasFiche: !!ctx.fiche, hasMPB: !!ctx.mpb, hasCountry: !!ctx.country});
    }

    if (!q.country) {
      getVisitorIso(function(iso){
        q.country = (iso && /^[A-Z]{2}$/.test(iso)) ? iso : 'US';
        go();
      });
      return;
    }
    try { await go(); } catch(e){ console.error(e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();