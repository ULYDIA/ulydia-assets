/* metier-page.js — Ulydia (V5.0)
   Goals (Jan 2026):
   - ✅ Keep sponsor banner logic (wide + square, clickable)
   - ✅ Show CMS sections (accroche + rich text sections)
   - ✅ Show Metier_Pays_Bloc when present
   - ✅ Add filters: Country + Sector + Job (autocomplete) -> navigates to selected page
   - ✅ Layout: 2 columns desktop (content + sidebar)
   - ✅ Wide banner fixed 680x120 centered
   - ✅ Remove Home/My account buttons (handled by Webflow header)
   - ✅ Lighter gradient header (slower / softer)

   Expected Worker payload:
     GET /v1/metier-page?metier=<slug>&country=<ISO>
       -> { metier, pays, sponsor, blocs_pays, faq }
     GET /v1/filters?country=<ISO>
       -> { countries:[{iso,name,flag?}], sectors:[{slug,name}], jobs:[{slug,name,sector_slug?}] }

   Preview mode:
     ?preview=1&country=FR&preview_landscape=https://...&preview_square=https://...&preview_link=https://...
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V50__) return;
  window.__ULYDIA_METIER_PAGE_V50__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log('[metier-page]', ...a);

  // -----------------------------
  // CONFIG
  // -----------------------------
  const WORKER_URL   = window.ULYDIA_WORKER_URL || 'https://ulydia-business.contact-871.workers.dev';
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || '';
  const IPINFO_TOKEN = window.ULYDIA_IPINFO_TOKEN || '';

  const qp = (k) => new URLSearchParams(location.search).get(k);

  // metier slug can be provided as ?metier= or extracted from /fiche-metiers/<slug>
  function getMetierSlug(){
    const q = (qp('metier') || qp('slug') || '').trim();
    if (q) return q;
    const m = location.pathname.match(/\/fiche-metiers\/(.+)$/);
    if (m && m[1]) return decodeURIComponent(m[1]).replace(/\/$/, '');
    return '';
  }

  function getCountryISO(){
    const q = (qp('country') || qp('iso') || '').trim();
    if (q) return q.toUpperCase();
    return '';
  }

  // -----------------------------
  // PREVIEW OVERRIDES
  // -----------------------------
  const isHttpUrl = (u) => /^https?:\/\//i.test(String(u || '').trim());
  const PREVIEW = (() => {
    const q = new URLSearchParams(location.search);
    const on = q.get('preview') === '1';
    return {
      on,
      country: (q.get('country') || '').toUpperCase(),
      landscape: (q.get('preview_landscape') || '').trim(),
      square: (q.get('preview_square') || '').trim(),
      link: (q.get('preview_link') || '').trim(),
    };
  })();

  function withCacheBust(u){
    const s = String(u || '').trim();
    if (!PREVIEW.on || !isHttpUrl(s)) return s;
    try {
      const x = new URL(s);
      x.searchParams.set('ulprev', String(Date.now()));
      return x.toString();
    } catch {
      return s + (s.includes('?') ? '&' : '?') + 'ulprev=' + Date.now();
    }
  }

  // -----------------------------
  // ROOT
  // -----------------------------
  let ROOT = document.getElementById('ulydia-metier-root');
  if (!ROOT) {
    ROOT = document.createElement('div');
    ROOT.id = 'ulydia-metier-root';
    document.body.prepend(ROOT);
  }

  // -----------------------------
  // STYLE (login/signup-like)
  // -----------------------------
  function injectCSS(){
    if (document.getElementById('ul_metier_css_v50')) return;
    const style = document.createElement('style');
    style.id = 'ul_metier_css_v50';
    style.textContent = `
      :root{
        --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
        --ul-red:#c00102;
        --ul-text:#1a1a1a;
        --ul-muted:#6b7280;
        --ul-border:#e5e7eb;
        --ul-bg:#ffffff;
        --ul-soft:#f6f7fb;
        --ul-card:#ffffff;
        --ul-shadow: 0 16px 42px rgba(15, 23, 42, .10);
        --ul-radius: 18px;
      }

      html,body{ background: var(--ul-bg); color: var(--ul-text); }
      #ulydia-metier-root{ font-family: var(--ul-font); }

      .u-wrap{ max-width: 1160px; margin: 0 auto; padding: 26px 16px 90px; }

      .u-hero{ margin-top: 6px; }
      .u-title{ margin:0; font-size: 38px; font-weight: 900; letter-spacing: -.03em; color: var(--ul-red); text-transform: none; }
      .u-tagline{ margin:8px 0 0; font-size: 14px; color: var(--ul-muted); line-height: 1.55; max-width: 820px; }
      .u-sub{ margin:10px 0 0; font-size: 12px; color: var(--ul-muted); }

      /* Filter bar */
      .u-filters{ margin-top: 16px; }
      .u-filterCard{
        background: var(--ul-card);
        border: 1px solid var(--ul-border);
        border-radius: var(--ul-radius);
        box-shadow: var(--ul-shadow);
        overflow:hidden;
      }
      .u-filterHead{
        padding: 14px 16px;
        border-bottom: 1px solid var(--ul-border);
        background: linear-gradient(135deg, rgba(192,1,2,.12) 0%, rgba(192,1,2,.06) 28%, rgba(255,255,255,1) 72%);
        display:flex; align-items:center; justify-content:space-between; gap:12px;
      }
      .u-filterHead strong{ font-size: 14px; }
      .u-filterBody{ padding: 14px 16px; }
      .u-filterRow{ display:grid; grid-template-columns: 220px 260px 1fr 140px; gap: 12px; align-items:center; }
      @media (max-width: 980px){ .u-filterRow{ grid-template-columns: 1fr; } }

      .u-field{ display:flex; flex-direction:column; gap: 6px; }
      .u-label{ font-size: 12px; color: var(--ul-muted); font-weight: 700; }
      .u-input, .u-select{
        width:100%;
        border: 1px solid var(--ul-border);
        border-radius: 14px;
        padding: 11px 12px;
        font-size: 14px;
        outline: none;
        background: #fff;
      }
      .u-input:focus, .u-select:focus{ border-color: rgba(192,1,2,.45); box-shadow: 0 0 0 4px rgba(192,1,2,.10); }

      .u-btn{
        appearance:none;
        border:1px solid var(--ul-border);
        background: #fff;
        color: var(--ul-text);
        padding: 11px 14px;
        border-radius: 14px;
        cursor:pointer;
        font-weight: 800;
        font-size: 13px;
        transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
      }
      .u-btn:hover{ transform: translateY(-1px); box-shadow: 0 12px 24px rgba(15,23,42,.08); }
      .u-btn-primary{ background: var(--ul-red); border-color: rgba(192,1,2,.60); color:#fff; }
      .u-btn-primary:hover{ background: #a90102; }

      /* Wide banner 680x120 */
      .u-wideWrap{ margin: 16px 0 10px; display:flex; justify-content:center; }
      .u-wideBanner{
        width: 680px; max-width: 100%;
        height: 120px;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid var(--ul-border);
        box-shadow: var(--ul-shadow);
        background: #fff;
        display:block;
      }
      .u-wideBanner img{ width:100%; height:100%; object-fit: cover; display:block; }

      /* Main layout */
      .u-grid{ display:grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, .85fr); gap: 16px; margin-top: 14px; }
      @media (max-width: 980px){ .u-grid{ grid-template-columns: 1fr; } }

      .u-card{
        background: var(--ul-card);
        border: 1px solid var(--ul-border);
        border-radius: var(--ul-radius);
        box-shadow: var(--ul-shadow);
        overflow:hidden;
      }
      .u-card-h{
        padding: 16px 18px;
        border-bottom: 1px solid var(--ul-border);
        background: linear-gradient(135deg, rgba(192,1,2,.14) 0%, rgba(192,1,2,.06) 35%, rgba(255,255,255,1) 78%);
        display:flex; gap:10px; align-items:center; justify-content:space-between;
      }
      .u-card-t{ margin:0; font-size: 16px; font-weight: 900; letter-spacing: -.01em; }
      .u-card-b{ padding: 16px 18px; }

      .u-p{ margin:0; color: var(--ul-text); line-height: 1.7; font-size: 14px; }
      .u-muted{ color: var(--ul-muted); }

      /* Rich text */
      .u-rt{ color: var(--ul-text); font-size: 14px; line-height: 1.75; }
      .u-rt p{ margin: 0 0 10px; }
      .u-rt ul, .u-rt ol{ margin: 8px 0 12px 20px; }
      .u-rt li{ margin: 4px 0; }
      .u-rt strong{ font-weight: 800; }
      .u-rt a{ color: var(--ul-red); font-weight: 800; text-decoration: none; }
      .u-rt a:hover{ text-decoration: underline; }

      /* Sidebar sponsor square */
      .u-square{
        width: 100%;
        aspect-ratio: 1 / 1;
        border-radius: 16px;
        overflow:hidden;
        border: 1px solid var(--ul-border);
        background: #fff;
      }
      .u-square img{ width:100%; height:100%; object-fit: cover; display:block; }

      .u-pill{ font-size: 12px; font-weight: 900; padding: 6px 10px; border-radius: 999px; border:1px solid var(--ul-border); color: var(--ul-muted); background: #fff; }
      .u-pill-ok{ border-color: rgba(16,185,129,.35); color: #065f46; background: rgba(16,185,129,.10); }

      details.u-faq{ border:1px solid var(--ul-border); border-radius: 14px; background: #fff; padding: 10px 12px; }
      details.u-faq summary{ cursor:pointer; font-weight:900; color: var(--ul-text); }
      details.u-faq .u-rt{ margin-top: 10px; }

      .u-err{ border-color: rgba(192,1,2,.55)!important; background: rgba(192,1,2,.06)!important; }
      .u-note{ font-size: 12px; color: var(--ul-muted); }

      /* Metier_Pays_Bloc list */
      .u-kv{ display:grid; grid-template-columns: 140px 1fr; gap: 10px; padding: 10px 0; border-bottom: 1px dashed var(--ul-border); }
      .u-kv:last-child{ border-bottom: none; }
      .u-k{ font-size: 12px; color: var(--ul-muted); font-weight: 900; }
      .u-v{ font-size: 14px; }
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs || {})){
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    (children || []).forEach(c => n.appendChild(c));
    return n;
  }

  function safeUrl(u){
    try {
      if (!u) return '';
      const x = new URL(String(u), location.origin);
      return x.href;
    } catch { return ''; }
  }

  function humanizeSlug(slug){
    const s = String(slug || '').trim();
    if (!s) return '';
    return s
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
      .join(' ');
  }

  function asHtml(v){
    // Webflow rich text typically already safe HTML. We trust CMS content.
    const s = String(v || '').trim();
    return s;
  }

  function pickFirstNonEmpty(...vals){
    for (const v of vals){
      const s = String(v || '').trim();
      if (s) return s;
    }
    return '';
  }

  async function fetchJSON(url){
    const headers = { 'accept': 'application/json' };
    if (PROXY_SECRET) headers['x-proxy-secret'] = PROXY_SECRET;
    const res = await fetch(url, { headers });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!res.ok) throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
    return data;
  }

  // -----------------------------
  // Country detection (fallback)
  // -----------------------------
  async function detectCountryISO(){
    const fromQ = getCountryISO();
    if (fromQ) return fromQ;
    if (!IPINFO_TOKEN) return 'FR'; // sensible default
    try{
      const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`);
      const j = await r.json();
      const c = String(j?.country || '').toUpperCase();
      return c || 'FR';
    }catch{ return 'FR'; }
  }

  // -----------------------------
  // Rendering
  // -----------------------------
  function renderLoading(){
    ROOT.innerHTML = '';
    const wrap = el('div', { class:'u-wrap' }, [
      el('div', { class:'u-hero' }, [
        el('h1', { class:'u-title', text:'Loading…' }),
        el('p', { class:'u-tagline u-muted', text:'Fetching job data & banners…' })
      ]),
      el('div', { class:'u-filterCard u-filters' }, [
        el('div', { class:'u-filterHead' }, [
          el('strong', { text:'Search a job' }),
          el('span', { class:'u-note', text: PREVIEW.on ? 'Preview mode' : '' })
        ]),
        el('div', { class:'u-filterBody' }, [
          el('div', { class:'u-filterRow' }, [
            el('div', { class:'u-field' }, [ el('div',{class:'u-label',text:'Country'}), el('div',{class:'u-input',text:'…'}) ]),
            el('div', { class:'u-field' }, [ el('div',{class:'u-label',text:'Category'}), el('div',{class:'u-input',text:'…'}) ]),
            el('div', { class:'u-field' }, [ el('div',{class:'u-label',text:'Job'}), el('div',{class:'u-input',text:'…'}) ]),
            el('button', { class:'u-btn u-btn-primary', text:'Search' })
          ])
        ])
      ]),
    ]);
    ROOT.appendChild(wrap);
  }

  function renderError(msg){
    ROOT.innerHTML = '';
    const wrap = el('div', { class:'u-wrap' }, [
      el('div', { class:'u-card u-err' }, [
        el('div', { class:'u-card-h' }, [
          el('p', { class:'u-card-t', text:'Could not render this job page' }),
          el('span', { class:'u-note', text:'metier-page.js' })
        ]),
        el('div', { class:'u-card-b' }, [
          el('p', { class:'u-p', text: String(msg || 'Unknown error') }),
          el('p', { class:'u-note', text:'Tip: /metier?metier=SLUG&country=FR (preview: add &preview=1)' })
        ])
      ])
    ]);
    ROOT.appendChild(wrap);
  }

  function bannerAnchorWide(imgUrl, linkUrl){
    const href = safeUrl(linkUrl || '');
    const src = safeUrl(imgUrl || '');
    if (!src) return null;
    const a = el('a', { class:'u-wideBanner', href: href || '#', target: href ? '_blank' : '_self', rel:'noopener' }, [
      el('img', { src, alt:'banner' })
    ]);
    if (!href) a.addEventListener('click', (e)=>e.preventDefault());
    return a;
  }

  function bannerAnchorSquare(imgUrl, linkUrl){
    const href = safeUrl(linkUrl || '');
    const src = safeUrl(imgUrl || '');
    if (!src) return null;
    const a = el('a', { class:'u-square', href: href || '#', target: href ? '_blank' : '_self', rel:'noopener' }, [
      el('img', { src, alt:'sponsor' })
    ]);
    if (!href) a.addEventListener('click', (e)=>e.preventDefault());
    return a;
  }

  function buildSection(title, html){
    const s = String(html || '').trim();
    if (!s) return null;
    return el('div', { class:'u-card' }, [
      el('div', { class:'u-card-h' }, [ el('p', { class:'u-card-t', text:title }) ]),
      el('div', { class:'u-card-b' }, [ el('div', { class:'u-rt', html: s }) ])
    ]);
  }

  function renderMetierPaysBloc(blocs){
    if (!Array.isArray(blocs) || !blocs.length) return null;

    // Take first bloc for now (per country). If multiple, we stack them.
    const wrap = el('div', { class:'u-card' }, [
      el('div', { class:'u-card-h' }, [ el('p', { class:'u-card-t', text:'Country insights' }) ]),
      el('div', { class:'u-card-b' }, [])
    ]);
    const body = wrap.querySelector('.u-card-b');

    blocs.forEach((b, idx) => {
      const anyTitle = b?.country_code || b?.code_iso || '';
      if (blocs.length > 1) {
        body.appendChild(el('p', { class:'u-note', text: `Bloc ${idx+1} ${anyTitle ? `• ${anyTitle}` : ''}` }));
      }

      const addRT = (label, key) => {
        const v = String(b?.[key] || '').trim();
        if (!v) return;
        body.appendChild(el('div', { class:'u-kv' }, [
          el('div', { class:'u-k', text: label }),
          el('div', { class:'u-v' }, [ el('div', { class:'u-rt', html: v }) ])
        ]));
      };

      // Core blocs
      addRT('Formation', 'formation_bloc');
      addRT('Access', 'acces_bloc');
      addRT('Salary', 'salaire_bloc');
      addRT('Market', 'marche_bloc');

      // Extra blocks (only if present)
      addRT('Education level', 'Education_level_local');
      addRT('Top fields', 'Top_fields');
      addRT('Certifications', 'Certifications');
      addRT('Schools / paths', 'Schools_or_paths');
      addRT('Equivalences / reconversion', 'Equivalences_reconversion');
      addRT('Entry routes', 'Entry_routes');
      addRT('First job titles', 'First_job_titles');
      addRT('Typical employers', 'Typical_employers');
      addRT('Portfolio projects', 'Portfolio_projects');
      addRT('Skills (must-have)', 'Skills_must_have');
      addRT('Soft skills', 'Soft_skills');
      addRT('Tools stack', 'Tools_stack');
      addRT('Time to employability', 'Time_to_employability');
      addRT('Hiring sectors', 'Hiring_sectors');
      addRT('Degrees examples', 'Degrees_examples');

      // Non-RT fields
      const plainKV = (label, key) => {
        const v = b?.[key];
        const s = String(v ?? '').trim();
        if (!s) return;
        body.appendChild(el('div', { class:'u-kv' }, [
          el('div', { class:'u-k', text: label }),
          el('div', { class:'u-v', text: s })
        ]));
      };
      plainKV('Remote level', 'Remote_level');
      plainKV('Automation risk', 'Automation_risk');

      // Salary numbers
      const salaryKeys = [
        ['Junior min', 'salary_junior_min'],
        ['Junior max', 'salary_junior_max'],
        ['Mid min', 'salary_mid_min'],
        ['Mid max', 'salary_mid_max'],
        ['Senior min', 'salary_senior_min'],
        ['Senior max', 'salary_senior_max'],
        ['Variable share', 'salary_variable_share'],
      ];
      const hasSalary = salaryKeys.some(([,k]) => String(b?.[k] ?? '').trim() !== '');
      if (hasSalary) {
        body.appendChild(el('div', { class:'u-kv' }, [
          el('div', { class:'u-k', text: 'Salary ranges' }),
          el('div', { class:'u-v' }, [
            el('div', { class:'u-rt', html: salaryKeys
              .filter(([,k]) => String(b?.[k] ?? '').trim() !== '')
              .map(([lbl,k]) => `<p><strong>${lbl}:</strong> ${String(b[k])}</p>`)
              .join('')
            })
          ])
        ]));
      }
      addRT('Salary notes', 'salary_notes');
      addRT('Market demand', 'Market_demand');
      plainKV('Currency', 'Currency');

      if (idx < blocs.length - 1) {
        body.appendChild(el('div', { style:'height:12px' }));
      }
    });

    return wrap;
  }

  function renderFAQ(faq){
    if (!Array.isArray(faq) || !faq.length) return null;
    const card = el('div', { class:'u-card' }, [
      el('div', { class:'u-card-h' }, [ el('p', { class:'u-card-t', text:'FAQ' }) ]),
      el('div', { class:'u-card-b' }, [])
    ]);
    const body = card.querySelector('.u-card-b');
    faq.forEach((it) => {
      const q = String(it?.question || it?.q || '').trim();
      const a = String(it?.answer || it?.a || '').trim();
      if (!q || !a) return;
      body.appendChild(
        el('details', { class:'u-faq' }, [
          el('summary', { text:q }),
          el('div', { class:'u-rt', html:a })
        ])
      );
      body.appendChild(el('div', { style:'height:10px' }));
    });
    return card;
  }

  function renderFiltersUI({ countries=[], sectors=[], jobs=[] }, current){
    const card = el('div', { class:'u-filterCard u-filters' }, [
      el('div', { class:'u-filterHead' }, [
        el('strong', { text:'Find a job' }),
        el('span', { class:'u-note', text: 'Country • Category • Job' })
      ]),
      el('div', { class:'u-filterBody' }, [
        el('div', { class:'u-filterRow' }, [])
      ])
    ]);
    const row = card.querySelector('.u-filterRow');

    // Country select
    const selCountry = el('select', { class:'u-select' }, []);
    (countries || []).forEach(c => {
      const iso = String(c?.iso || c?.code_iso || c?.country_code || '').toUpperCase();
      const name = String(c?.name || c?.nom_pays || iso).trim();
      if (!iso) return;
      selCountry.appendChild(el('option', { value: iso, text: `${name} (${iso})` }));
    });
    if (current.iso) selCountry.value = current.iso;

    // Sector select
    const selSector = el('select', { class:'u-select' }, []);
    selSector.appendChild(el('option', { value:'', text:'All categories' }));
    (sectors || []).forEach(s => {
      const slug = String(s?.slug || '').trim();
      const name = String(s?.name || s?.label || slug).trim();
      if (!slug) return;
      selSector.appendChild(el('option', { value: slug, text: name }));
    });

    // Job input + datalist
    const dlId = 'u_job_dl_' + Math.random().toString(16).slice(2);
    const dl = el('datalist', { id: dlId }, []);
    const inpJob = el('input', { class:'u-input', placeholder:'Start typing a job…', list: dlId, value: current.jobName || '' });

    function repopulateJobOptions(){
      const iso = selCountry.value;
      const sector = selSector.value;
      dl.innerHTML = '';
      const filtered = (jobs || []).filter(j => {
        const jIso = String(j?.iso || j?.country || '').toUpperCase();
        const jSector = String(j?.sector_slug || j?.secteur_slug || '').trim();
        const okIso = !jIso || jIso === iso; // allow jobs list to be global
        const okSec = !sector || !jSector || jSector === sector;
        return okIso && okSec;
      });
      filtered.slice(0, 500).forEach(j => {
        const name = String(j?.name || j?.Nom || j?.title || '').trim();
        const slug = String(j?.slug || '').trim();
        if (!name || !slug) return;
        dl.appendChild(el('option', { value: name, 'data-slug': slug }));
      });
    }

    // Map typed name -> slug (best effort)
    function findSlugFromName(name){
      const n = String(name || '').trim().toLowerCase();
      if (!n) return '';
      // try exact match
      const exact = (jobs || []).find(j => String(j?.name || j?.Nom || j?.title || '').trim().toLowerCase() === n);
      if (exact && exact.slug) return exact.slug;
      // try contains
      const near = (jobs || []).find(j => String(j?.name || j?.Nom || j?.title || '').trim().toLowerCase().includes(n));
      return String(near?.slug || '').trim();
    }

    const btn = el('button', { class:'u-btn u-btn-primary', text:'Search' });

    async function doSearch(){
      const iso = selCountry.value;
      const slug = findSlugFromName(inpJob.value) || getMetierSlug();
      if (!slug) {
        alert('Choose a job (or type an existing one).');
        return;
      }
      const url = new URL(location.href);
      url.pathname = '/metier';
      url.searchParams.set('metier', slug);
      url.searchParams.set('country', iso);
      // keep preview params if any
      if (PREVIEW.on) url.searchParams.set('preview','1');
      location.href = url.toString();
    }

    // if country changes, refresh filters from server (jobs per country)
    selCountry.addEventListener('change', async () => {
      try{
        const iso = selCountry.value;
        const f = await loadFilters(iso);
        // replace sector options
        selSector.innerHTML = '';
        selSector.appendChild(el('option', { value:'', text:'All categories' }));
        (f.sectors || []).forEach(s => {
          const slug = String(s?.slug || '').trim();
          const name = String(s?.name || s?.label || slug).trim();
          if (!slug) return;
          selSector.appendChild(el('option', { value: slug, text: name }));
        });
        // update jobs list in-place
        jobs = f.jobs || [];
        repopulateJobOptions();
      }catch(e){
        console.warn('[metier-page] filters refresh failed', e);
        repopulateJobOptions();
      }
    });
    selSector.addEventListener('change', repopulateJobOptions);
    btn.addEventListener('click', doSearch);
    inpJob.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') doSearch(); });

    repopulateJobOptions();

    row.appendChild(el('div', { class:'u-field' }, [ el('div', { class:'u-label', text:'Country' }), selCountry ]));
    row.appendChild(el('div', { class:'u-field' }, [ el('div', { class:'u-label', text:'Category' }), selSector ]));
    row.appendChild(el('div', { class:'u-field' }, [ el('div', { class:'u-label', text:'Job' }), inpJob, dl ]));
    row.appendChild(btn);

    return card;
  }

  // -----------------------------
  // Data loading
  // -----------------------------
  async function loadMetierPage(slug, iso){
    const url = new URL(WORKER_URL + '/v1/metier-page');
    if (slug) url.searchParams.set('metier', slug);
    if (iso) url.searchParams.set('country', iso);
    if (PREVIEW.on) url.searchParams.set('preview', '1');
    // preview assets are handled client-side (we only override banners in render)
    return await fetchJSON(url.toString());
  }

  async function loadFilters(iso){
    const url = new URL(WORKER_URL + '/v1/filters');
    if (iso) url.searchParams.set('country', iso);
    return await fetchJSON(url.toString());
  }

  // -----------------------------
  // Main render
  // -----------------------------
  async function main(){
    injectCSS();
    renderLoading();

    const iso = PREVIEW.on && PREVIEW.country ? PREVIEW.country : (await detectCountryISO());
    const slug = getMetierSlug();

    const [data, filters] = await Promise.all([
      loadMetierPage(slug, iso),
      loadFilters(iso).catch(() => ({ countries:[], sectors:[], jobs:[] }))
    ]);

    const metier = data?.metier || {};
    const pays = data?.pays || {};
    const sponsor = data?.sponsor || {};
    const blocs = Array.isArray(data?.blocs_pays) ? data.blocs_pays : [];
    const faq = Array.isArray(data?.faq) ? data.faq : [];

    // Title + tagline
    const title = pickFirstNonEmpty(metier.Nom, metier['Nom du métier'], metier.title, metier.name, humanizeSlug(metier.slug), humanizeSlug(slug));
    const tagline = pickFirstNonEmpty(metier.accroche, metier.tagline, metier.subtitle);

    // Determine sponsor active
    const sponsorActive = String(sponsor?.status || sponsor?.state || '').toLowerCase() === 'active'
      || sponsor?.active === true
      || metier.est_sponsorisee === true;

    // Banner selection
    const fallbackWide = pickFirstNonEmpty(
      pays.banniere_sponsorisation_image_2_url,
      pays.banniere_sponsorisation_image_2,
      pays.banner_wide,
      pays.banner_landscape
    );
    const fallbackSquare = pickFirstNonEmpty(
      pays.banniere_sponsorisation_image_1_url,
      pays.banniere_sponsorisation_image_1,
      pays.banner_square
    );

    const wideUrl = sponsorActive
      ? pickFirstNonEmpty(sponsor.logo_2, sponsor.sponsor_logo_2, metier.sponsor_logo_2, metier.sponsor_logo_2_url)
      : fallbackWide;
    const squareUrl = sponsorActive
      ? pickFirstNonEmpty(sponsor.logo_1, sponsor.sponsor_logo_1, metier.sponsor_logo_1, metier.sponsor_logo_1_url)
      : fallbackSquare;

    const sponsorLink = sponsorActive
      ? pickFirstNonEmpty(sponsor.link, sponsor.sponsor_link, metier.lien_sponsor, metier.sponsor_link)
      : '';

    // Preview overrides (do NOT break banner logic)
    const finalWide = PREVIEW.on && isHttpUrl(PREVIEW.landscape) ? withCacheBust(PREVIEW.landscape) : wideUrl;
    const finalSquare = PREVIEW.on && isHttpUrl(PREVIEW.square) ? withCacheBust(PREVIEW.square) : squareUrl;
    const finalLink = PREVIEW.on && isHttpUrl(PREVIEW.link) ? PREVIEW.link : sponsorLink;

    // Sections (rich text)
    const sections = [
      ['Overview', metier.description],
      ['Missions', metier.missions],
      ['Compétences', metier['Compétences'] || metier.competences || metier.competences_bloc],
      ['Environnements', metier.environnements],
      ['Profil recherché', metier.profil_recherche],
      ['Évolutions possibles', metier.evolutions_possibles],
    ];

    // Build UI
    ROOT.innerHTML = '';
    const wrap = el('div', { class:'u-wrap' }, []);

    // Hero
    wrap.appendChild(
      el('div', { class:'u-hero' }, [
        el('h1', { class:'u-title', text: title || humanizeSlug(slug) || 'Job' }),
        tagline ? el('p', { class:'u-tagline', text: tagline }) : el('div'),
        el('p', { class:'u-sub', text: `Country: ${iso} · Language: ${String(pays?.langue_defaut || metier?.lang || '').trim() || '—'}${PREVIEW.on ? ' · Preview' : ''}` })
      ])
    );

    // Filters
    wrap.appendChild(renderFiltersUI(filters || {}, { iso, jobName: title }));

    // Wide banner
    const wideNode = bannerAnchorWide(finalWide, finalLink);
    if (wideNode) {
      wrap.appendChild(el('div', { class:'u-wideWrap' }, [ wideNode ]));
    }

    // Grid
    const grid = el('div', { class:'u-grid' }, []);
    const mainCol = el('div', { class:'u-stack' }, []);
    const sideCol = el('div', { class:'u-stack' }, []);

    // Content sections
    let anySection = false;
    sections.forEach(([t, html]) => {
      const s = buildSection(t, asHtml(html));
      if (s) { mainCol.appendChild(s); anySection = true; }
    });

    // If nothing yet, show keys
    if (!anySection) {
      const keys = Object.keys(metier || {});
      mainCol.appendChild(el('div', { class:'u-card' }, [
        el('div', { class:'u-card-h' }, [ el('p', { class:'u-card-t', text:'Content' }) ]),
        el('div', { class:'u-card-b' }, [
          el('p', { class:'u-p u-muted', text:'No job sections found in the CMS for this page yet.' }),
          DEBUG ? el('pre', { class:'u-note', html: asHtml(JSON.stringify({ keys, sample: metier }, null, 2)).replace(/</g,'&lt;') }) : el('div')
        ])
      ]));
    }

    // Country-specific bloc (if exists)
    const blocCard = renderMetierPaysBloc(blocs);
    if (blocCard) mainCol.appendChild(blocCard);

    // FAQ
    const faqCard = renderFAQ(faq);
    if (faqCard) mainCol.appendChild(faqCard);

    // Sidebar: Sponsor card
    const sponsorCard = el('div', { class:'u-card' }, [
      el('div', { class:'u-card-h' }, [
        el('p', { class:'u-card-t', text:'Sponsor' }),
        el('span', { class: 'u-pill ' + (sponsorActive ? 'u-pill-ok' : ''), text: sponsorActive ? 'Active' : 'Not sponsored' })
      ]),
      el('div', { class:'u-card-b' }, [])
    ]);
    const sponsorBody = sponsorCard.querySelector('.u-card-b');
    const sq = bannerAnchorSquare(finalSquare, finalLink);
    if (sq) sponsorBody.appendChild(sq);
    if (sponsorActive && finalLink) {
      sponsorBody.appendChild(el('div', { style:'height:12px' }));
      sponsorBody.appendChild(el('a', { class:'u-btn u-btn-primary', href: safeUrl(finalLink), target:'_blank', rel:'noopener', text:'Visit sponsor' }));
    }
    if (!sponsorActive) {
      sponsorBody.appendChild(el('div', { style:'height:10px' }));
      sponsorBody.appendChild(el('p', { class:'u-note', text: String(pays?.banniere_sponsorisation_texte || 'This page can be sponsored.').trim() }));
    }
    sideCol.appendChild(sponsorCard);

    // Sidebar: Country card
    const countryCard = el('div', { class:'u-card' }, [
      el('div', { class:'u-card-h' }, [ el('p', { class:'u-card-t', text:'Country' }) ]),
      el('div', { class:'u-card-b' }, [
        el('p', { class:'u-p', html: `<strong>ISO:</strong> <span class="u-muted">${iso}</span>` }),
        el('p', { class:'u-note', text: String(pays?.nom_pays || pays?.name || '').trim() })
      ])
    ]);
    sideCol.appendChild(countryCard);

    grid.appendChild(mainCol);
    grid.appendChild(sideCol);

    wrap.appendChild(grid);
    ROOT.appendChild(wrap);

    // Optional: SEO meta tags from CMS
    try{
      const mt = String(metier.meta_title || '').trim();
      const md = String(metier.meta_description || '').trim();
      if (mt) document.title = mt;
      if (md) {
        let elMeta = document.querySelector('meta[name="description"]');
        if (!elMeta) { elMeta = document.createElement('meta'); elMeta.setAttribute('name','description'); document.head.appendChild(elMeta); }
        elMeta.setAttribute('content', md);
      }
      const schema = String(metier.schema_json_ld || '').trim();
      if (schema) {
        const id = 'ul_schema_jsonld';
        let s = document.getElementById(id);
        if (!s) { s = document.createElement('script'); s.id = id; s.type = 'application/ld+json'; document.head.appendChild(s); }
        s.textContent = schema;
      }
    }catch(e){ log('seo inject failed', e); }
  }

  main().catch((e)=>{
    console.error('[metier-page] fatal', e);
    renderError(e?.message || String(e));
  });
})();
