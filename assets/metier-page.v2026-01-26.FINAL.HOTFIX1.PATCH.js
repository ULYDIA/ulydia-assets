/*
ULYDIA — HOTFIX1 (SAFE)
- Indicators (currency/remote/automation)
- Salary card
- Duplicate horizontal sponsor/non-sponsor banner just before FAQ

Important:
- This patch is defensive: it MUST NOT break rendering.
- It only fills existing placeholders (it does not change your main HTML).

Use it INSTEAD OF these 3 patches (remove them):
- metier-page.v2026-01-26.FINAL.INDICATORS.*
- metier-page.v2026-01-26.FINAL.SALARY.*
- metier-page.v2026-01-26.FINAL.BANNER.BEFOREFAQ.*
*/
(function(){
  'use strict';

  function safe(label, fn){
    try { fn(); }
    catch (e) {
      try { console.warn('[ULYDIA][HOTFIX1] '+label+' skipped:', e); } catch(_){ }
    }
  }

  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
  function pick(v){ return norm(v); }
  function pickUrl(v){
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v.url || v.src || (Array.isArray(v) && v[0] && (v[0].url||v[0].src)) || '';
    return '';
  }

  // ---- base context reader
  function getCtx(){
    return (window.__ULYDIA_CTX__ || window.__ULYDIA_METIER_CTX__ || window.__ULYDIA_STATE__ || {});
  }

  function getBloc(){
    var ctx = getCtx();
    return (window.__ULYDIA_BLOC__ || (ctx && ctx.bloc) || (ctx && ctx.data && ctx.data.bloc) || window.__ULYDIA_METIER_PAYS_BLOCS__ || {});
  }

  function getMetier(){
    var ctx = getCtx();
    return (window.__ULYDIA_METIER__ || (ctx && ctx.metier) || (ctx && ctx.data && ctx.data.metier) || {});
  }

  // ---- HTML helpers
  function setText(sel, v){
    var el = document.querySelector(sel);
    if (!el) return false;
    el.textContent = v;
    return true;
  }
  function setHTML(sel, v){
    var el = document.querySelector(sel);
    if (!el) return false;
    el.innerHTML = v;
    return true;
  }
  function show(sel){ var el=document.querySelector(sel); if (el) el.style.display=''; }
  function hide(sel){ var el=document.querySelector(sel); if (el) el.style.display='none'; }

  // ---- &nbsp cleanup
  function cleanNbsp(s){
    return String(s||'').replace(/&nbsp;/g,' ').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim();
  }

  // ---- Currency formatter: outputs like "EUR (€)" when possible
  function fmtCurrencyLabel(code){
    code = String(code||'').trim().toUpperCase();
    if (!code) return '';
    var map = {
      'EUR':'€','USD':'$','GBP':'£','CHF':'CHF','CAD':'$','AUD':'$','NZD':'$','JPY':'¥','CNY':'¥','HKD':'$','SGD':'$','SEK':'kr','NOK':'kr','DKK':'kr','PLN':'zł','CZK':'Kč','HUF':'Ft','RON':'lei','BRL':'R$','MXN':'$','ZAR':'R','INR':'₹'
    };
    var sym = map[code] || '';
    return sym ? (code + ' (' + sym + ')') : code;
  }

  // ---- Format salary range with K + currency sign when possible
  function fmtK(n, currencyCode){
    var x = Number(n);
    if (!isFinite(x) || x <= 0) return '';
    // input in monthly? you store 2000..4500 etc. You want 35-45K€ style:
    // We'll assume values are monthly gross and annualize (x*12) then format to K.
    var annual = x * 12;
    var k = Math.round(annual / 1000);
    var code = String(currencyCode||'').trim().toUpperCase();
    var symMap = { 'EUR':'€','USD':'$','GBP':'£','CHF':'CHF','CAD':'$','AUD':'$','NZD':'$','JPY':'¥','CNY':'¥','HKD':'$','SGD':'$' };
    var sym = symMap[code] || (code ? code : '');
    return String(k) + 'K' + (sym ? sym : '');
  }

  // ---- 1) INDICATORS
  function applyIndicators(){
    safe('indicators', function(){
      var bloc = getBloc();
      var metier = getMetier();

      // Currency: take from bloc.currency OR metier.currency
      var currency = pick(bloc.currency || metier.currency || metier.currency_code || (metier.fieldData && (metier.fieldData.currency || metier.fieldData.currency_code)));
      if (currency) setText('.js-ind-currency', fmtCurrencyLabel(currency));

      // Remote work
      var remote = pick(bloc.teletravail || bloc.remote_work || bloc.remote || metier.teletravail || metier.remote_work || (metier.fieldData && (metier.fieldData.teletravail || metier.fieldData.remote_work)));
      if (remote) setText('.js-ind-remote', cleanNbsp(remote));

      // Automation risk
      var autoRisk = pick(bloc.risk_automation || bloc.risque_automatisation || bloc.automation_risk || metier.risk_automation || metier.risque_automatisation || (metier.fieldData && (metier.fieldData.risk_automation || metier.fieldData.risque_automatisation)));
      if (autoRisk) setText('.js-ind-automation', cleanNbsp(autoRisk));

      // Hide rows if empty
      if (!currency) hide('.js-ind-row-currency'); else show('.js-ind-row-currency');
      if (!remote) hide('.js-ind-row-remote'); else show('.js-ind-row-remote');
      if (!autoRisk) hide('.js-ind-row-automation'); else show('.js-ind-row-automation');

      // If none -> hide whole card
      if (!currency && !remote && !autoRisk) hide('.js-indicators-card'); else show('.js-indicators-card');
    });
  }

  // ---- 2) SALARY
  function applySalary(){
    safe('salary', function(){
      var bloc = getBloc();
      var metier = getMetier();

      // Currency
      var cur = pick(bloc.currency || metier.currency || metier.currency_code || (metier.fieldData && (metier.fieldData.currency || metier.fieldData.currency_code)));

      // Salary values (monthly min/max per level)
      var jmin = bloc.salary_junior_min, jmax = bloc.salary_junior_max;
      var mmin = bloc.salary_mid_min,    mmax = bloc.salary_mid_max;
      var smin = bloc.salary_senior_min, smax = bloc.salary_senior_max;
      var vshare = bloc.salary_variable_share;

      // Some datasets might store as strings
      function num(v){ var x = Number(String(v||'').replace(',','.')); return isFinite(x)?x:null; }
      jmin=num(jmin); jmax=num(jmax); mmin=num(mmin); mmax=num(mmax); smin=num(smin); smax=num(smax);
      var hasAny = (jmin||jmax||mmin||mmax||smin||smax);

      // If no salary at all -> hide card
      if (!hasAny) { hide('.js-salary-card'); return; }
      show('.js-salary-card');

      // Title (optionally with country)
      var country = pick(bloc.country_name || bloc.country || (window.__ULYDIA_COUNTRY__ && (window.__ULYDIA_COUNTRY__.name || window.__ULYDIA_COUNTRY__.label)));
      var title = 'Grille salariale' + (country ? (' ('+country+')') : '');
      setText('.js-salary-title', title);

      // Labels: show ranges in K
      if (jmin || jmax) setText('.js-salary-junior-range', (fmtK(jmin,cur) + (jmax?('-'+fmtK(jmax,cur)):'')).replace(/^-/,''));
      else setText('.js-salary-junior-range','');

      if (mmin || mmax) setText('.js-salary-mid-range', (fmtK(mmin,cur) + (mmax?('-'+fmtK(mmax,cur)):'')).replace(/^-/,''));
      else setText('.js-salary-mid-range','');

      if (smin || smax) setText('.js-salary-senior-range', (fmtK(smin,cur) + (smax?('-'+fmtK(smax,cur)):'')).replace(/^-/,''));
      else setText('.js-salary-senior-range','');

      // Variable share %
      var vs = num(vshare);
      if (vs && vs > 0) {
        setText('.js-salary-variable-range', vs + '%');
        show('.js-salary-variable');
      } else {
        hide('.js-salary-variable');
      }

      // Progress bars (relative widths)
      var maxVal = Math.max(jmax||0,jmin||0,mmax||0,mmin||0,smax||0,smin||0) || 1;
      function pct(v){ return Math.max(5, Math.min(100, Math.round((v/maxVal)*100))); }
      var bj = document.querySelector('.js-salary-bar-junior');
      var bm = document.querySelector('.js-salary-bar-mid');
      var bs = document.querySelector('.js-salary-bar-senior');
      if (bj) bj.style.width = pct(jmax||jmin||0) + '%';
      if (bm) bm.style.width = pct(mmax||mmin||0) + '%';
      if (bs) bs.style.width = pct(smax||smin||0) + '%';
    });
  }

  // ---- 3) BANNER before FAQ
  function applyBannerBeforeFAQ(){
    safe('banner', function(){
      // already inserted?
      if (document.getElementById('ulydia-banner-before-faq')) return;

      // Use current banner1 URL from whatever base rendered (preferred)
      var imgEl = document.querySelector('img.js-banner-landscape, img[data-ulydia-banner="landscape"], img[data-ulydia-banner="banner1"], .js-banner-landscape img');
      var src = imgEl ? (imgEl.getAttribute('src')||'') : '';

      // fallback: from ctx sponsor info if available
      if (!src) {
        var ctx = getCtx();
        var info = (ctx && (ctx.sponsorInfo || ctx.sponsor || ctx.info)) || window.__ULYDIA_SPONSOR_INFO__ || window.__ULYDIA_SPONSOR__ || {};
        // try common fields
        src = pickUrl(info.logo_1 || info.banner_1 || info.landscape || info.bannerLandscape || info.banner1);
      }

      if (!src) return; // nothing to render

      // find FAQ host
      var faqHost = document.querySelector('.ul-cms-source') || document.getElementById('ul-cms-source') || document.querySelector('[data-ulydia-section="faq"]') || document.querySelector('.js-faq-wrap');
      if (!faqHost || !faqHost.parentNode) return;

      // create wrapper
      var wrap = document.createElement('div');
      wrap.id = 'ulydia-banner-before-faq';
      wrap.style.width = '100%';
      wrap.style.display = 'flex';
      wrap.style.justifyContent = 'center';
      wrap.style.margin = '24px 0 18px';

      var img = document.createElement('img');
      img.src = src;
      img.alt = 'Sponsor banner';
      img.style.maxWidth = '720px';
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '12px';
      img.style.display = 'block';

      wrap.appendChild(img);

      // insert before FAQ block
      faqHost.parentNode.insertBefore(wrap, faqHost);
    });
  }

  // ---- Scheduler: wait for base to render, then apply; retry a few times
  function boot(){
    var tries = 0;
    var maxTries = 80; // ~8s
    var t = setInterval(function(){
      tries++;

      // base is considered ready if at least one of these exists
      var ready = !!(
        document.querySelector('.js-salary-card, .js-indicators-card, .ul-cms-source, .js-faq-wrap, .js-banner-landscape') ||
        window.__ULYDIA_METIER__ || window.__ULYDIA_BLOC__ || window.__ULYDIA_CTX__
      );

      if (ready) {
        applyIndicators();
        applySalary();
        applyBannerBeforeFAQ();
      }

      if (tries >= maxTries) clearInterval(t);
    }, 100);
  }

  safe('boot', boot);
})();
