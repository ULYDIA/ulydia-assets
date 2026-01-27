(function(){
  // =========================================================
  // ULYDIA — MPB State + DOM Hydration — FINAL PATCH1
  // Purpose:
  // 1) Prevent MPB data "leaking" across metiers when the template is reused
  //    (e.g., query params change, soft reload, cache, etc.)
  // 2) Centralize the rule: show MPB-driven blocks ONLY if we have a bloc
  //    for the current (metier + iso). Otherwise: clear MPB DOM sources.
  //
  // Depends on BASE.FIX13 which emits: "ULYDIA:METIER_BLOC_READY"
  // =========================================================

  var W = window;

  // Public, stable flags for other patches
  W.__ULYDIA_MPB__ = null;
  W.__ULYDIA_MPB_MATCHED__ = false;

  function norm(s){ return String(s || '').replace(/\s+/g,' ').trim(); }
  function stripNbsp(s){ return String(s||'').replace(/&nbsp;/g,' ').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim(); }

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel) || []); }

  function setTextByClass(cls, val){
    var els = qsa('.' + cls);
    if (!els.length) return;
    var v = stripNbsp(val);
    els.forEach(function(el){ el.textContent = v; });
  }
  function setHtmlByClass(cls, val){
    var els = qsa('.' + cls);
    if (!els.length) return;
    // Keep simple line breaks; remove nbsp
    var v = String(val||'');
    v = v.replace(/\u00A0/g,' ').replace(/&nbsp;/g,' ');
    els.forEach(function(el){ el.innerHTML = v; });
  }

  // Remove any MPB-generated cards/blocks (idempotent)
  function clearGenerated(){
    qsa('[data-ulydia-mpb-gen="1"]').forEach(function(n){ try{ n.remove(); }catch(e){} });
  }

  // List of DOM "sources" (hidden Webflow fields) used by render patches
  // NOTE: these match the classes you created in Webflow.
  var FIELD_MAP = [
    // rich-ish blocks
    { key: 'formation',              cls: 'js-bf-formation',              mode: 'html' },
    { key: 'acces',                  cls: 'js-bf-acces',                  mode: 'html' },
    { key: 'salaire',                cls: 'js-bf-salaire',                mode: 'html' },
    { key: 'marche',                 cls: 'js-bf-marche',                 mode: 'html' },

    // structured blocks (we usually render as lists later)
    { key: 'education_level_local',  cls: 'js-bf-education_level_local',  mode: 'text' },
    { key: 'education_level',        cls: 'js-bf-education_level',        mode: 'text' },
    { key: 'top_fields',             cls: 'js-bf-top_fields',             mode: 'text' },
    { key: 'certifications',         cls: 'js-bf-certifications',         mode: 'text' },
    { key: 'schools_or_paths',       cls: 'js-bf-schools_or_paths',       mode: 'text' },
    { key: 'equivalences_reconversion', cls: 'js-bf-equivalences_reconversion', mode: 'text' },
    { key: 'entry_routes',           cls: 'js-bf-entry_routes',           mode: 'text' },
    { key: 'first_job_titles',       cls: 'js-bf-first_job_titles',       mode: 'text' },
    { key: 'typical_employers',      cls: 'js-bf-typical_employers',      mode: 'text' },
    { key: 'portfolio_projects',     cls: 'js-bf-portfolio_projects',     mode: 'text' },
    { key: 'skills_must_have',       cls: 'js-bf-skills_must_have',       mode: 'text' },
    { key: 'soft_skills',            cls: 'js-bf-soft_skills',            mode: 'text' },
    { key: 'tools_stack',            cls: 'js-bf-tools_stack',            mode: 'text' },
    { key: 'time_to_employability',  cls: 'js-bf-time_to_employability',  mode: 'text' },
    { key: 'hiring_sectors',         cls: 'js-bf-hiring_sectors',         mode: 'text' },
    { key: 'degrees_examples',       cls: 'js-bf-degrees_examples',       mode: 'text' },
    { key: 'growth_outlook',         cls: 'js-bf-growth_outlook',         mode: 'text' },
    { key: 'market_demand',          cls: 'js-bf-market_demand',          mode: 'text' },
    { key: 'salary_notes',           cls: 'js-bf-salary_notes',           mode: 'text' }
  ];

  function hydrateSources(blocFields){
    // Clear previously generated UI blocks
    clearGenerated();

    // Mark match
    var matched = !!blocFields;
    W.__ULYDIA_MPB_MATCHED__ = matched;
    W.__ULYDIA_MPB__ = matched ? blocFields : null;

    // Always clear or set the hidden DOM sources.
    FIELD_MAP.forEach(function(m){
      var raw = matched ? (blocFields && (blocFields[m.key] || blocFields[m.key.replace(/_/g,'-')])) : '';
      // some users store keys with dashes in Airtable/Webflow
      if (raw == null) raw = '';
      if (m.mode === 'html') setHtmlByClass(m.cls, raw);
      else setTextByClass(m.cls, raw);
    });

    // Also clear chip / scalar placeholders if you use them as sources elsewhere
    // (they are set by other patches when MPB exists, but must be emptied when MPB doesn't)
    if (!matched) {
      setTextByClass('js-chip-remote_level', '');
      setTextByClass('js-chip-automation_risk', '');
      setTextByClass('js-chip-currency', '');
      setTextByClass('js-sal-junior-min', '');
      setTextByClass('js-sal-junior-max', '');
      setTextByClass('js-sal-mid-min', '');
      setTextByClass('js-sal-mid-max', '');
      setTextByClass('js-sal-senior-min', '');
      setTextByClass('js-sal-senior-max', '');
      setTextByClass('js-sal-variable-share', '');
      setTextByClass('js-statut-generation', '');
    }

    // If there is NO MPB, we also hide any PAYSBLOC cards already present in the DOM
    // (BASE hides them by default, but on soft reload we enforce it)
    if (!matched) {
      qsa('[data-ulydia-paysbloc],[data-ulydia-mpb-card],[data-ulydia-mpb-section]').forEach(function(el){
        try{ el.style.display = 'none'; }catch(e){}
      });
    }
  }

  function onBlocReady(payload){
    try {
      var blocFields = payload && payload.blocFields ? payload.blocFields : null;
      // If the bloc exists but is empty (all fields blank), treat as no-data.
      if (blocFields) {
        var hasAny = false;
        for (var k in blocFields) {
          if (!Object.prototype.hasOwnProperty.call(blocFields,k)) continue;
          var v = stripNbsp(blocFields[k]);
          if (v) { hasAny = true; break; }
        }
        if (!hasAny) blocFields = null;
      }
      hydrateSources(blocFields);
    } catch(e) {
      // Fail safe: do not break the page.
      try { console.warn('[MPB.STATE] failed', e); } catch(_){}
    }
  }

  // Subscribe to the bus (it may appear after this patch loads)
  function bind(){
    if (W.__ULYDIA_METIER_BUS__ && typeof W.__ULYDIA_METIER_BUS__.on === 'function') {
      W.__ULYDIA_METIER_BUS__.on('ULYDIA:METIER_BLOC_READY', onBlocReady);
      // If BASE already finished before we loaded, apply immediately
      if (W.__ULYDIA_METIER_PAGE_CTX__ && 'blocFields' in W.__ULYDIA_METIER_PAGE_CTX__) {
        onBlocReady({ blocFields: W.__ULYDIA_METIER_PAGE_CTX__.blocFields || null });
      } else {
        // Proactively clear to avoid showing stale MPB while loading
        hydrateSources(null);
      }
      return true;
    }
    return false;
  }

  var tries = 0;
  (function waitBus(){
    tries++;
    if (bind()) return;
    if (tries > 200) return; // ~10s max
    setTimeout(waitBus, 50);
  })();

})();
