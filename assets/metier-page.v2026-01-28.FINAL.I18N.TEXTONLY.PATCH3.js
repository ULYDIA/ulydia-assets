/* =========================================================
   ULYDIA — I18N TEXT-ONLY (PATCH3) + FAQ DEDUPE
   - Translates UI labels + section headers in-place (no rerender)
   - Idempotent per language (no flicker)
   - Short-lived MutationObserver to catch late inserts
   - Removes duplicate FAQ sections (keeps first inside #ulydia-metier-root)
   ========================================================= */
(function(){
  'use strict';
  if (window.__ULYDIA_I18N_TEXTONLY_PATCH3__) return;
  window.__ULYDIA_I18N_TEXTONLY_PATCH3__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;

  function log(){ if (DEBUG) try{ console.log.apply(console, ['[I18N.PATCH3]'].concat([].slice.call(arguments))); }catch(e){} }

  function norm(s){
    return String(s||'')
      .replace(/\u00A0/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function getLang(){
    // priority: explicit
    var l = (window.__ULYDIA_LANG__ || window.ULYDIA_LANG || '').toString().trim().toLowerCase();
    if (!l) {
      // html lang
      l = (document.documentElement.getAttribute('lang') || '').toString().trim().toLowerCase();
    }
    if (!l) l = 'fr';
    // normalize like en-US -> en
    l = l.split('-')[0];
    return (l==='fr'||l==='en'||l==='de'||l==='es'||l==='it') ? l : 'fr';
  }

  // Translate map by exact text match (after norm + lower)
  var MAP = {
    fr: {}, // no-op
    en: {
      // top badge / buttons
      'fiche métier': 'Job profile',
      'fiche metier': 'Job profile',
      'en savoir plus': 'Learn more',
      // left column sections
      "vue d'ensemble": 'Overview',
      'missions principales': 'Key responsibilities',
      'compétences clés': 'Key skills',
      'competences clés': 'Key skills',
      'éducation & qualifications': 'Education & qualifications',
      'education & qualifications': 'Education & qualifications',
      'carrières possibles & first roles': 'Career outcomes & first roles',
      'carrières possibles & first rôles': 'Career outcomes & first roles',
      'acces & career change': 'Access & career change',
      'accès & career change': 'Access & career change',
      'environnements de travail': 'Work environments',
      // right column sections
      'partenaire': 'Partner',
      'indicateurs clés': 'Key indicators',
      'grille salariale (france)': 'Salary grid (France)',
      'grille salariale': 'Salary grid',
      'compétences incontournables': 'Must-have skills',
      'soft skills essentielles': 'Essential soft skills',
      'stack technique populaire': 'Popular tech stack',
      'certifications utiles': 'Useful certifications',
      'écoles & parcours recommandés': 'Recommended schools & paths',
      'ecoles & parcours recommandés': 'Recommended schools & paths',
      'projets portfolio essentiels': 'Essential portfolio projects',
      // FAQ heading
      'questions fréquentes': 'Frequently asked questions'
    },
    de: {
      'fiche métier': 'Berufsprofil',
      'fiche metier': 'Berufsprofil',
      'en savoir plus': 'Mehr erfahren',
      "vue d'ensemble": 'Überblick',
      'missions principales': 'Kernaufgaben',
      'compétences clés': 'Schlüsselkompetenzen',
      'competences clés': 'Schlüsselkompetenzen',
      'éducation & qualifications': 'Ausbildung & Qualifikationen',
      'education & qualifications': 'Ausbildung & Qualifikationen',
      'carrières possibles & first roles': 'Karrierewege & Einstieg',
      'accès & career change': 'Zugang & Quereinstieg',
      'acces & career change': 'Zugang & Quereinstieg',
      'environnements de travail': 'Arbeitsumfeld',
      'partenaire': 'Partner',
      'indicateurs clés': 'Kennzahlen',
      'grille salariale (france)': 'Gehaltsband (Frankreich)',
      'grille salariale': 'Gehaltsband',
      'compétences incontournables': 'Unverzichtbare Skills',
      'soft skills essentielles': 'Wichtige Soft Skills',
      'stack technique populaire': 'Beliebter Tech-Stack',
      'certifications utiles': 'Nützliche Zertifikate',
      'écoles & parcours recommandés': 'Empfohlene Schulen & Wege',
      'ecoles & parcours recommandés': 'Empfohlene Schulen & Wege',
      'projets portfolio essentiels': 'Wichtige Portfolio-Projekte',
      'questions fréquentes': 'Häufig gestellte Fragen'
    },
    es: {
      'fiche métier': 'Ficha del empleo',
      'fiche metier': 'Ficha del empleo',
      'en savoir plus': 'Saber más',
      "vue d'ensemble": 'Visión general',
      'missions principales': 'Funciones clave',
      'compétences clés': 'Habilidades clave',
      'competences clés': 'Habilidades clave',
      'éducation & qualifications': 'Educación y cualificaciones',
      'education & qualifications': 'Educación y cualificaciones',
      'carrières possibles & first roles': 'Salidas profesionales y primeros puestos',
      'accès & career change': 'Acceso y cambio de carrera',
      'acces & career change': 'Acceso y cambio de carrera',
      'environnements de travail': 'Entornos de trabajo',
      'partenaire': 'Socio',
      'indicateurs clés': 'Indicadores clave',
      'grille salariale (france)': 'Rango salarial (Francia)',
      'grille salariale': 'Rango salarial',
      'compétences incontournables': 'Habilidades imprescindibles',
      'soft skills essentielles': 'Soft skills esenciales',
      'stack technique populaire': 'Stack técnico popular',
      'certifications utiles': 'Certificaciones útiles',
      'écoles & parcours recommandés': 'Escuelas y rutas recomendadas',
      'ecoles & parcours recommandés': 'Escuelas y rutas recomendadas',
      'projets portfolio essentiels': 'Proyectos de portfolio esenciales',
      'questions fréquentes': 'Preguntas frecuentes'
    },
    it: {
      'fiche métier': 'Scheda professionale',
      'fiche metier': 'Scheda professionale',
      'en savoir plus': 'Scopri di più',
      "vue d'ensemble": 'Panoramica',
      'missions principales': 'Responsabilità principali',
      'compétences clés': 'Competenze chiave',
      'competences clés': 'Competenze chiave',
      'éducation & qualifications': 'Formazione e qualifiche',
      'education & qualifications': 'Formazione e qualifiche',
      'carrières possibles & first roles': 'Sbocchi e primi ruoli',
      'accès & career change': 'Accesso e cambio carriera',
      'acces & career change': 'Accesso e cambio carriera',
      'environnements de travail': 'Ambienti di lavoro',
      'partenaire': 'Partner',
      'indicateurs clés': 'Indicatori chiave',
      'grille salariale (france)': 'Fascia salariale (Francia)',
      'grille salariale': 'Fascia salariale',
      'compétences incontournables': 'Competenze indispensabili',
      'soft skills essentielles': 'Soft skills essenziali',
      'stack technique populaire': 'Stack tecnico popolare',
      'certifications utiles': 'Certificazioni utili',
      'écoles & parcours recommandés': 'Scuole e percorsi consigliati',
      'ecoles & parcours recommandés': 'Scuole e percorsi consigliati',
      'projets portfolio essentiels': 'Progetti portfolio essenziali',
      'questions fréquentes': 'Domande frequenti'
    }
  };

  function translateText(str, lang){
    var key = norm(str).toLowerCase();
    var dict = MAP[lang] || {};
    return dict[key] || null;
  }

  function isLeafTextNode(el){
    // only translate elements that have direct text and no big children blocks
    if (!el || !el.childNodes) return false;
    // ignore if contains rich text blocks with paragraphs etc (we don't translate content)
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'p' || tag === 'li' || tag === 'blockquote') return false;
    return true;
  }

  function applyTranslations(root){
    var lang = getLang();
    // guard to avoid endless re-apply when nothing changes
    var guardKey = '__ulydia_i18n_textonly_patch3_lang__';
    if (document.documentElement[guardKey] === lang && root === document) {
      // still allow if root is a subtree call (observer)
    }
    // Candidate selectors: headings, buttons, badges, small labels
    var sel = [
      'h1','h2','h3','h4','h5',
      'button','a',
      '[role="button"]',
      '.u-badge','.badge',
      '.tag','.pill',
      '.ul-badge','.ul-tag','.ul-pill',
      '.card-title','.u-cardTitle',
      '.u-cardHeader', '.u-card__title',
      'span','div'
    ].join(',');

    var nodes = (root.querySelectorAll ? root.querySelectorAll(sel) : []);
    var changed = 0;

    for (var i=0;i<nodes.length;i++){
      var el = nodes[i];
      if (!el || !el.textContent) continue;

      // skip huge blobs
      var txt = norm(el.textContent);
      if (!txt || txt.length > 80) continue;

      // skip if contains many children and looks like a container
      if (el.children && el.children.length > 3 && (el.tagName||'').toLowerCase()==='div') continue;

      var tr = translateText(txt, lang);
      if (!tr) continue;

      // idempotent: store original + applied lang
      var appliedLang = el.getAttribute('data-ul-i18n-lang');
      if (appliedLang === lang && el.getAttribute('data-ul-i18n-text') === tr) continue;

      // Preserve leading/trailing emojis/icons in text if any (rare)
      // Simple approach: replace full text
      el.textContent = tr;
      el.setAttribute('data-ul-i18n-lang', lang);
      el.setAttribute('data-ul-i18n-text', tr);
      changed++;
    }

    if (root === document) document.documentElement[guardKey] = lang;
    log('applyTranslations lang=', lang, 'changed=', changed);
    return changed;
  }

  function dedupeFAQ(){
    var root = document.getElementById('ulydia-metier-root') || document.body;
    if (!root) return;

    // find faq sections by heading text in any language we manage
    var headings = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,div,span'));
    var faqHeads = headings.filter(function(n){
      var t = norm(n.textContent).toLowerCase();
      return t === 'questions fréquentes' ||
             t === 'frequently asked questions' ||
             t === 'häufig gestellte fragen' ||
             t === 'preguntas frecuentes' ||
             t === 'domande frequenti';
    });

    // If none, try by known containers
    var faqContainers = [];
    faqHeads.forEach(function(h){
      // choose nearest card/container
      var cur = h;
      for (var k=0;k<6;k++){
        if (!cur || !cur.parentElement) break;
        cur = cur.parentElement;
        if (cur.classList && (cur.classList.contains('card') || cur.classList.contains('u-card') || cur.classList.contains('ul-card'))) {
          faqContainers.push(cur);
          break;
        }
      }
    });

    // fallback: look for accordion list wrappers
    if (!faqContainers.length){
      var cand = Array.prototype.slice.call(document.querySelectorAll('[data-ul-section="faq"], .ul-faq, .js-faq, .faq-card, .ul-faq-card'));
      faqContainers = faqContainers.concat(cand);
    }

    // unique
    faqContainers = faqContainers.filter(function(x, idx, arr){ return x && arr.indexOf(x) === idx; });

    if (faqContainers.length <= 1) return;

    // Keep the first that is inside #ulydia-metier-root if possible
    var keep = null;
    for (var i=0;i<faqContainers.length;i++){
      if (root.contains(faqContainers[i])) { keep = faqContainers[i]; break; }
    }
    if (!keep) keep = faqContainers[0];

    faqContainers.forEach(function(c){
      if (c === keep) return;
      // Don't remove footer structures; hide safely
      c.setAttribute('data-ul-faq-duplicate','1');
      c.style.display = 'none';
    });

    log('dedupeFAQ kept one, hidden=', faqContainers.length-1);
  }

  // Debounce for i18n updates
  var tmr = null;
  function scheduleApply(){
    if (tmr) clearTimeout(tmr);
    tmr = setTimeout(function(){
      tmr = null;
      try { applyTranslations(document); } catch(e){ log('apply err', e); }
      try { dedupeFAQ(); } catch(e){ log('dedupe err', e); }
    }, 60);
  }

  // Run once after DOM ready
  function boot(){
    scheduleApply();

    // short-lived observer (2.8s) to catch late inserts without infinite loops
    var started = Date.now();
    var obs = new MutationObserver(function(){
      // avoid storms: schedule one apply
      scheduleApply();
      if (Date.now() - started > 2800) {
        try{ obs.disconnect(); }catch(e){}
        log('observer stopped');
      }
    });
    try{
      obs.observe(document.body, { childList:true, subtree:true });
    }catch(e){}

    // Listen to explicit i18n update
    window.addEventListener('ULYDIA:I18N_UPDATE', scheduleApply);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
