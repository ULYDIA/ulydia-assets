/*!
 * =========================================================
 * ULYDIA — METIER PAGE — FINAL PROPAL (DESIGN-DRIVEN • ONE FILE)
 * File: metier-page.v2026-01-30.FINAL.PROPAL.DESIGNDRIVEN.BUNDLE.js
 * Date: 2026-01-30
 *
 * ✅ Webflow CMS = source of truth (via Code Embed readers -> window.__ULYDIA_*__)
 * ✅ ONE JS file in prod (no stack of patches)
 * ✅ Does NOT generate a new layout — injects into PROPAL design already in the page
 * ✅ No injected "base" scripts, no dynamic script injection
 * ✅ Never duplicates #ulydia-metier-root, never recreates page containers
 *
 * Expected:
 * - Your page contains the PROPAL HTML design (cards, sidebar, FAQ, sponsor blocks...)
 * - Your CMS embeds fill window.__ULYDIA_*__ (or at minimum DOM has .js-* and your embed pushes globals)
 *
 * This bundle:
 * - Resolves current context (?metier + ?country [+ ?lang])
 * - Finds MPB record (metier + iso) and injects:
 *   - Formation / Accès / Marché / Salaire
 *   - Sidebar: indicators, salary grid, skills/tools/certs/schools/portfolio
 *   - FAQ: renders accordions from window.__ULYDIA_FAQS__ (if present)
 * - Handles banners:
 *   - top wide banner
 *   - sidebar square banner
 *   - "before FAQ" wide banner (optional slot #ulydia-banner-before-faq-slot; else inserted before FAQ card)
 * - Hides empty cards automatically (no empty blocks)
 * =========================================================
 */
(function(){
  "use strict";
  if (window.__ULYDIA_PROPAL_FINAL_BUNDLE__) return;
  window.__ULYDIA_PROPAL_FINAL_BUNDLE__ = true;

  // -----------------------
  // Helpers / guards
  // -----------------------
  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG && console && console.log) console.log.apply(console, ["[ULYDIA:PROPAL:FINAL]"].concat([].slice.call(arguments))); }

  function qsParam(k){
    try { return new URLSearchParams(location.search||"").get(k) || ""; }
    catch(e){ return ""; }
  }
  function normText(s){
    return String(s||"")
      .replace(/\u00a0/g," ")
      .replace(/\s+/g," ")
      .trim();
  }
  function normSlug(s){
    return normText(s).toLowerCase().replace(/\s+/g,"-");
  }
  function normIso(s){
    s = normText(s).toUpperCase();
    return (s.length===2) ? s : "";
  }
  function normLang(l){
    l = normText(l).toLowerCase();
    if (!l) return "";
    if (l.indexOf("-")>0) l = l.split("-")[0];
    if (l.indexOf("_")>0) l = l.split("_")[0];
    return (/^(fr|en|de|es|it)$/).test(l) ? l : "";
  }

  function isEmptyRich(html){
    var s = String(html||"")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,"")
      .replace(/<[^>]+>/g," ")
      .replace(/\u00a0/g," ")
      .replace(/\s+/g," ")
      .trim();
    return !s;
  }
  function sanitizeHTML(html){
    var s = String(html||"");
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    s = s.replace(/\son\w+="[^"]*"/gi, "");
    s = s.replace(/\son\w+='[^']*'/gi, "");
    s = s.replace(/\son\w+=\S+/gi, "");
    return s.trim();
  }

  function parseNum(x){
    if (x===null || x===undefined) return null;
    var s = String(x).trim();
    if (!s) return null;
    s = s.toLowerCase().replace(/\s+/g,"").replace(/,/g,".");
    var mult = 1;
    if (s.endsWith("k")) { mult=1000; s=s.slice(0,-1); }
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    return Math.round(n*mult);
  }
  function fmtInt(n){
    if (n===null || n===undefined) return "";
    var s = String(n);
    try { return s.replace(/\B(?=(\d{3})+(?!\d))/g, " "); } catch(e){ return s; }
  }
  function fmtRange(min,max,currency){
    var n1=parseNum(min), n2=parseNum(max);
    if (n1===null && n2===null) return "";
    var cur = normText(currency||"");
    if (n1!==null && n2!==null) return fmtInt(n1)+" - "+fmtInt(n2)+(cur?(" "+cur):"");
    return fmtInt(n1!==null?n1:n2)+(cur?(" "+cur):"");
  }

  function show(el){
    if (!el) return;
    el.style.display = "";
    el.hidden = false;
    el.classList && el.classList.remove("hidden");
  }
  function hide(el){
    if (!el) return;
    el.style.display = "none";
    el.hidden = true;
  }

  // Find the nearest ".card" from a heading
  function closestCard(node){
    if (!node) return null;
    try { return node.closest(".card"); } catch(e){}
    var el=node;
    for (var i=0;i<8 && el;i++){
      if (el.classList && el.classList.contains("card")) return el;
      el = el.parentElement;
    }
    return null;
  }

  function findCardByTitleIncludes(text){
    text = normText(text).toLowerCase();
    if (!text) return null;
    var titles = document.querySelectorAll(".section-title");
    for (var i=0;i<titles.length;i++){
      var t = normText(titles[i].textContent).toLowerCase();
      if (t && t.indexOf(text) >= 0){
        return closestCard(titles[i]);
      }
    }
    return null;
  }

  function getCardBody(card){
    if (!card) return null;
    // typical propal: card-header then a body div (rich-content / space-y-4 / flex ...)
    var kids = card.children;
    if (!kids || kids.length < 2) return null;
    // body is last child most of the time
    return kids[kids.length-1];
  }

  // -----------------------
  // Language resolution (single source)
  // -----------------------
  var LANG = (function(){
    var l1 = normLang(qsParam("lang"));
    var l2 = normLang(window.__ULYDIA_LANG__);
    var l3 = normLang(document.documentElement && document.documentElement.getAttribute("lang"));
    var l4 = normLang(navigator.language || "");
    var l = l1 || l2 || l3 || l4 || "fr";
    // Do not fight user: never overwrite if ?lang present
    if (!l1) {
      try { window.__ULYDIA_LANG__ = l; } catch(e){}
      try { document.documentElement.setAttribute("lang", l); } catch(e){}
    }
    // reduce Chrome translate noise
    try { document.documentElement.setAttribute("translate","no"); } catch(e){}
    try{
      if (!document.querySelector('meta[name="google"][content="notranslate"]')){
        var m = document.createElement("meta");
        m.setAttribute("name","google"); m.setAttribute("content","notranslate");
        document.head && document.head.appendChild(m);
      }
    }catch(e){}
    return l;
  })();

  // -----------------------
  // Data access (globals only)
  // -----------------------
  function getMetiers(){ return Array.isArray(window.__ULYDIA_METIERS__) ? window.__ULYDIA_METIERS__ : []; }
  function getCountries(){ return Array.isArray(window.__ULYDIA_COUNTRIES__) ? window.__ULYDIA_COUNTRIES__ : []; }
  function getMPB(){ return Array.isArray(window.__ULYDIA_MPB__) ? window.__ULYDIA_MPB__ : []; }
  function getFaqs(){ return Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : []; }

  function getSponsorInfo(){
    return (
      window.__ULYDIA_SPONSOR_INFO__ ||
      window.__ULYDIA_SPONSOR__ ||
      window.__ULYDIA_SPONSOR_DATA__ ||
      (window.__ULYDIA_STATE__ && window.__ULYDIA_STATE__.sponsor) ||
      null
    );
  }
  function getCountryInfoByIso(iso){
    iso = normIso(iso);
    if (!iso) return null;
    var cs = getCountries();
    for (var i=0;i<cs.length;i++){
      if (normIso(cs[i] && cs[i].iso) === iso) return cs[i];
    }
    return null;
  }

  // Catalog optional: window.__ULYDIA_CATALOG__.countries could be array or map
  function getCatalogCountry(iso){
    iso = normIso(iso);
    var cat = window.__ULYDIA_CATALOG__ || window.__ULYDIA_CATALOG_JSON__ || null;
    if (!iso || !cat) return null;
    var c = cat.countries;
    if (!c) return null;
    if (Array.isArray(c)){
      for (var i=0;i<c.length;i++){
        if (normIso(c[i] && c[i].iso) === iso) return c[i];
      }
    } else if (typeof c === "object") {
      return c[iso] || c[iso.toLowerCase()] || null;
    }
    return null;
  }

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return v.url || v.src || v.href || v.download || "";
    return "";
  }

  // Wide = banner_1 / image_1 / logo_1 ; Square = banner_2 / image_2 / logo_2
  function resolveBanners(iso){
    var s = getSponsorInfo();
    if (s){
      var wide = pickUrl(s.banner_1 || s.bannerWide || s.banner_wide || s.image_1 || s.image1 || s.logo_1 || s.logo1 || (s.banners && (s.banners.wide || s.banners.banner_1 || s.banners.image_1)));
      var square = pickUrl(s.banner_2 || s.bannerSquare || s.banner_square || s.image_2 || s.image2 || s.logo_2 || s.logo2 || (s.banners && (s.banners.square || s.banners.banner_2 || s.banners.image_2)));
      var href = pickUrl(s.url || s.href || s.link || s.cta_url || s.ctaUrl);
      var name = normText(s.name || s.title || "");
      if (wide || square) return { kind:"sponsor", wide:wide, square:square, href:href, name:name };
    }

    // fallback country banners
    var c = getCountryInfoByIso(iso) || getCatalogCountry(iso) || {};
    var banners = c.banners || c.banner || c.fallback_banners || c.fallback || {};
    var wide2 = pickUrl(banners.banner_1 || banners.image_1 || banners.wide || banners.landscape || banners.banner1);
    var square2 = pickUrl(banners.banner_2 || banners.image_2 || banners.square || banners.banner2);
    var href2 = pickUrl(banners.cta || banners.href || banners.link || "");
    return { kind:(wide2||square2)?"fallback":"none", wide:wide2, square:square2, href:href2, name:"" };
  }

  function sanitizeHref(href){
    href = normText(href);
    if (!href) return "#";
    // allow mailto / tel
    if (/^(mailto:|tel:)/i.test(href)) return href;
    if (!/^https?:\/\//i.test(href)){
      // if it's a relative internal link, keep it
      if (href.startsWith("/")) return href;
      return "https://" + href.replace(/^\/+/, "");
    }
    return href;
  }

  function defaultSponsorCtaHref(metier, iso){
    // Internal sponsor page (you can change this if needed)
    metier = encodeURIComponent(normSlug(metier||""));
    iso = encodeURIComponent(normIso(iso||""));
    return "/sponsor?metier=" + metier + "&country=" + iso;
  }

  // -----------------------
  // Inject into PROPAL design
  // -----------------------
  function setRichCard(cardTitleId, html){
    var title = document.getElementById(cardTitleId);
    var card = closestCard(title);
    if (!card) return { ok:false, reason:"no-card" };
    var body = getCardBody(card);
    if (!body) return { ok:false, reason:"no-body" };

    if (!html || isEmptyRich(html)){
      hide(card);
      return { ok:false, hidden:true };
    }
    show(card);
    body.innerHTML = sanitizeHTML(html);
    return { ok:true };
  }

  function setSalaryCard(bloc){
    var title = document.getElementById("salaire-title");
    var card = closestCard(title);
    if (!card) return { ok:false, reason:"no-card" };
    var body = getCardBody(card);
    if (!body) return { ok:false, reason:"no-body" };

    var cur = normText(bloc.currency || ""); // can be "EUR", "€", "EUR (€)" etc.
    var rJ = fmtRange(bloc.junior_min, bloc.junior_max, cur);
    var rM = fmtRange(bloc.mid_min, bloc.mid_max, cur);
    var rS = fmtRange(bloc.senior_min, bloc.senior_max, cur);
    var varShare = normText(bloc.variable_share || "");
    var notes = bloc.salary_notes || "";

    var hasAny = !!(rJ || rM || rS || varShare || (notes && !isEmptyRich(notes)));
    if (!hasAny){
      hide(card);
      return { ok:false, hidden:true };
    }
    show(card);

    // compute bar width based on max value
    var maxAll = Math.max(
      parseNum(bloc.junior_max)||0,
      parseNum(bloc.mid_max)||0,
      parseNum(bloc.senior_max)||0,
      parseNum(bloc.senior_min)||0
    ) || 1;

    function pct(max){
      var m = parseNum(max);
      if (!m) return 0;
      var p = Math.round((m / maxAll) * 100);
      return Math.max(10, Math.min(100, p));
    }

    // Build body keeping propal visual language
    var parts = [];
    function row(label, range, width){
      if (!range) return;
      parts.push(
        '<div>' +
          '<div class="progress-label">' +
            '<span class="text-xs font-semibold" style="color: var(--text);">'+label+'</span>' +
            '<span class="text-xs font-bold" style="color: var(--primary);">'+range+'</span>' +
          '</div>' +
          '<div class="salary-bar-container">' +
            '<div class="salary-bar-fill gradient-primary" style="width: '+width+'%;"></div>' +
          '</div>' +
        '</div>'
      );
    }
    row("Junior", rJ, pct(bloc.junior_max));
    row("Confirmé", rM, pct(bloc.mid_max));
    row("Senior", rS, pct(bloc.senior_max));

    var infoLines = [];
    if (varShare) infoLines.push("<strong>Variable :</strong> "+varShare);
    if (notes && !isEmptyRich(notes)) infoLines.push(sanitizeHTML(notes));

    if (infoLines.length){
      parts.push(
        '<div class="mt-4 p-3 rounded-lg" style="background: rgba(99,102,241,0.1);">' +
          '<p class="text-xs font-semibold mb-2" style="color: var(--primary);">💡 Informations complémentaires</p>' +
          '<div class="text-xs" style="color: var(--text); line-height: 1.5;">' + infoLines.join("<br>") + '</div>' +
        '</div>'
      );
    }

    body.className = "space-y-4";
    body.innerHTML = parts.join("\n");
    return { ok:true };
  }

  // Sidebar cards (by title) — replaces body content
  function setChipsCard(titleIncludes, items){
    var card = findCardByTitleIncludes(titleIncludes);
    if (!card) return { ok:false, reason:"no-card" };
    var body = getCardBody(card);
    if (!body) return { ok:false, reason:"no-body" };
    items = (items||[]).map(normText).filter(Boolean);
    if (!items.length){ hide(card); return { ok:false, hidden:true }; }
    show(card);
    body.className = "flex flex-wrap gap-2";
    body.innerHTML = items.slice(0,12).map(function(t){
      return '<span class="chip badge-primary">'+escapeHtml(t)+'</span>';
    }).join(" ");
    return { ok:true, count:items.length };
  }

  function setBadgesCard(titleIncludes, items){
    var card = findCardByTitleIncludes(titleIncludes);
    if (!card) return { ok:false, reason:"no-card" };
    var body = getCardBody(card);
    if (!body) return { ok:false, reason:"no-body" };
    items = (items||[]).map(normText).filter(Boolean);
    if (!items.length){ hide(card); return { ok:false, hidden:true }; }
    show(card);
    body.className = "flex flex-wrap gap-2";
    body.innerHTML = items.slice(0,12).map(function(t){
      return '<span class="badge badge-primary">'+escapeHtml(t)+'</span>';
    }).join(" ");
    return { ok:true, count:items.length };
  }

  function setSoftSkillsCard(titleIncludes, items){
    var card = findCardByTitleIncludes(titleIncludes);
    if (!card) return { ok:false, reason:"no-card" };
    var body = getCardBody(card);
    if (!body) return { ok:false, reason:"no-body" };
    items = (items||[]).map(normText).filter(Boolean);
    if (!items.length){ hide(card); return { ok:false, hidden:true }; }
    show(card);
    body.innerHTML = items.slice(0,8).map(function(t){
      return '<div class="skill-tag"><span class="text-lg">🧩</span><span class="text-sm font-semibold" style="color: var(--text);">'+escapeHtml(t)+'</span></div>';
    }).join("");
    return { ok:true, count:items.length };
  }

  function setRichSidebarCard(titleIncludes, html){
    var card = findCardByTitleIncludes(titleIncludes);
    if (!card) return { ok:false, reason:"no-card" };
    var body = getCardBody(card);
    if (!body) return { ok:false, reason:"no-body" };
    if (!html || isEmptyRich(html)){ hide(card); return { ok:false, hidden:true }; }
    show(card);
    body.innerHTML = sanitizeHTML(html);
    return { ok:true };
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function extractItems(htmlOrText){
    var s = String(htmlOrText || "").trim();
    if (!s) return [];
    if (/<li[\s>]/i.test(s)) {
      var items = [];
      var m = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      for (var i=0;i<m.length;i++){
        var t = m[i]
          .replace(/<li[^>]*>/i,"").replace(/<\/li>/i,"")
          .replace(/<[^>]+>/g,"").replace(/\u00a0/g," ")
          .replace(/[ \t\r\n]+/g," ")
          .trim();
        if (t) items.push(t);
      }
      return items;
    }
    return s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "\n")
      .split(/[\n,]+/)
      .map(function(x){ return normText(x); })
      .filter(Boolean);
  }

  // -----------------------
  // FAQ render (accordion)
  // -----------------------
  function findFaqCard(){
    var title = document.getElementById("faq-title");
    return closestCard(title);
  }

  function renderFAQ(metierSlugOrName){
    var card = findFaqCard();
    if (!card) return { ok:false, reason:"no-faq-card" };
    var body = getCardBody(card);
    if (!body) return { ok:false, reason:"no-body" };

    var faqs = getFaqs();

    // Best effort matching:
    // - Prefer explicit "metier" name match if provided in FAQ records
    // - Else accept all if FAQ list is already filtered upstream
    var keySlug = normSlug(metierSlugOrName || "");
    var filtered = faqs.filter(function(f){
      var m = normText(f && (f.metier || f.job || f.role || f.metier_name || f.metierName || ""));
      if (!m) return true; // assume already filtered
      return normSlug(m) === keySlug;
    });

    if (!filtered.length){
      // if no FAQ data, keep existing design FAQ or hide? we hide to avoid wrong FAQ
      hide(card);
      return { ok:false, hidden:true };
    }

    show(card);
    body.className = "space-y-3";

    body.innerHTML = filtered.map(function(f, idx){
      var q = normText(f.question || f.q || "");
      var a = String(f.answer || f.a || f.reponse || "").trim();
      if (!q || isEmptyRich(a)) return "";
      return (
        '<div class="faq-item">' +
          '<button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);" data-ul-faq-btn="'+idx+'">' +
            '<div class="flex items-start gap-3 flex-1">' +
              '<span class="text-xl flex-shrink-0">❓</span>' +
              '<span class="font-semibold text-sm" style="color: var(--text);">'+escapeHtml(q)+'</span>' +
            '</div>' +
            '<svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<polyline points="6 9 12 15 18 9"></polyline>' +
            '</svg>' +
          '</button>' +
          '<div class="faq-answer hidden p-4 mt-2 rounded-lg" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2);" data-ul-faq-ans="'+idx+'">' +
            '<div class="text-sm" style="color: var(--text); line-height: 1.6;">'+sanitizeHTML(a)+'</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    // bind once
    if (!card.__ul_faq_bound){
      card.__ul_faq_bound = true;
      card.addEventListener("click", function(ev){
        var btn = ev.target && (ev.target.closest ? ev.target.closest("[data-ul-faq-btn]") : null);
        if (!btn) return;
        ev.preventDefault();
        var idx = btn.getAttribute("data-ul-faq-btn");
        var ans = card.querySelector('[data-ul-faq-ans="'+idx+'"]');
        if (!ans) return;
        var isHidden = ans.classList.contains("hidden");
        // close others (simple UX)
        card.querySelectorAll(".faq-answer").forEach(function(x){ x.classList.add("hidden"); });
        card.querySelectorAll(".faq-icon").forEach(function(x){ x.style.transform = ""; });
        if (isHidden){
          ans.classList.remove("hidden");
          var icon = btn.querySelector(".faq-icon");
          if (icon) icon.style.transform = "rotate(180deg)";
        }
      }, true);
    }

    return { ok:true, count: filtered.length };
  }

  // -----------------------
  // Banner injection (top wide, sidebar square, before FAQ)
  // -----------------------
  function ensureImgInside(container, kind){
    // Returns <img> (creates once)
    if (!container) return null;
    var sel = kind==="wide" ? "img[data-ul-banner-wide='1']" : "img[data-ul-banner-square='1']";
    var img = container.querySelector(sel);
    if (img) return img;

    img = document.createElement("img");
    img.setAttribute(kind==="wide" ? "data-ul-banner-wide" : "data-ul-banner-square", "1");
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.display = "block";

    // wide anchor already has content; overlay image behind text
    if (kind === "wide"){
      container.style.position = container.style.position || "relative";
      img.style.position = "absolute";
      img.style.inset = "0";
      img.style.zIndex = "0";
      // ensure text overlay is on top
      var kids = container.children;
      for (var i=0;i<kids.length;i++){
        kids[i].style.position = kids[i].style.position || "relative";
        kids[i].style.zIndex = "1";
      }
      container.insertBefore(img, container.firstChild);
    } else {
      // square goes inside .sponsor-logo-square if exists
      var box = container.querySelector(".sponsor-logo-square") || container;
      box.innerHTML = ""; // replace placeholder icon
      box.appendChild(img);
    }
    return img;
  }

  function applyBanners(ctx){
    var iso = normIso(ctx.iso);
    var metier = ctx.metierSlug || ctx.metierName || "";
    var info = resolveBanners(iso);

    // anchors in propal
    var topA = document.getElementById("sponsor-banner-link");
    var topName = document.getElementById("sponsor-name-banner");
    var sideA = document.getElementById("sponsor-logo-link");
    var sideName = document.getElementById("sponsor-name-sidebar");
    var cta = document.getElementById("sponsor-cta");

    var href = sanitizeHref(info.href || "");
    if (href === "#" || !href){
      // fallback CTA for non-sponsored
      href = defaultSponsorCtaHref(metier, iso);
    }

    // TOP WIDE
    if (topA){
      if (info.wide){
        ensureImgInside(topA, "wide").src = info.wide;
        topA.href = href;
        topA.target = (href.startsWith("/") ? "_self" : "_blank");
        if (topName && info.name) topName.textContent = info.name;
        show(topA);
      } else {
        // if no wide banner, keep propal gradient block visible but set CTA to sponsor
        topA.href = href;
        topA.target = (href.startsWith("/") ? "_self" : "_blank");
        show(topA);
      }
    }

    // SIDEBAR SQUARE
    if (sideA){
      if (info.square){
        ensureImgInside(sideA, "square").src = info.square;
        sideA.href = href;
        sideA.target = (href.startsWith("/") ? "_self" : "_blank");
        if (sideName && info.name) sideName.textContent = info.name;
        show(sideA);
      } else {
        // If no square, keep placeholder but link to sponsor
        sideA.href = href;
        sideA.target = (href.startsWith("/") ? "_self" : "_blank");
        show(sideA);
      }
    }

    // CTA button
    if (cta){
      cta.href = href;
      cta.target = (href.startsWith("/") ? "_self" : "_blank");
    }

    // BEFORE FAQ — prefer explicit slot, else insert before FAQ card
    var beforeSlot = document.getElementById("ulydia-banner-before-faq-slot");
    var faqCard = findFaqCard();
    var ensureBefore = function(){
      var container = beforeSlot;
      if (!container){
        if (!faqCard || !faqCard.parentElement) return null;
        // create container once
        container = document.getElementById("ulydia-beforefaq-banner");
        if (!container){
          container = document.createElement("div");
          container.id = "ulydia-beforefaq-banner";
          container.style.margin = "18px 0";
          container.style.borderRadius = "14px";
          container.style.overflow = "hidden";
          container.style.border = "1px solid rgba(226,232,240,1)";
          container.style.boxShadow = "0 8px 24px rgba(17,24,39,.10)";
          faqCard.parentElement.insertBefore(container, faqCard);
        }
      }
      // make it a link with image
      var a = container.querySelector("a[data-ul-beforefaq='1']");
      var img = container.querySelector("img[data-ul-beforefaq-img='1']");
      if (!a){
        a = document.createElement("a");
        a.setAttribute("data-ul-beforefaq","1");
        a.style.display="block";
        a.style.textDecoration="none";
        container.innerHTML="";
        container.appendChild(a);
      }
      if (!img){
        img = document.createElement("img");
        img.setAttribute("data-ul-beforefaq-img","1");
        img.style.width="100%";
        img.style.height="auto";
        img.style.display="block";
        img.style.objectFit="cover";
        a.appendChild(img);
      }
      return {container:container, a:a, img:img};
    };

    var bf = ensureBefore();
    if (bf){
      if (info.wide){
        bf.img.src = info.wide;
        bf.a.href = href;
        bf.a.target = (href.startsWith("/") ? "_self" : "_blank");
        show(bf.container);
      } else {
        hide(bf.container);
      }
    }
  }

  // -----------------------
  // Main render pipeline (bounded retries)
  // -----------------------
  function computeCtx(){
    var metierSlug = normSlug(qsParam("metier"));
    var iso = normIso(qsParam("country") || qsParam("iso"));

    var metiers = getMetiers();
    var m = null;
    for (var i=0;i<metiers.length;i++){
      if (normSlug(metiers[i] && metiers[i].slug) === metierSlug) { m = metiers[i]; break; }
    }

    var countries = getCountries();
    var c = null;
    for (var j=0;j<countries.length;j++){
      if (normIso(countries[j] && countries[j].iso) === iso) { c = countries[j]; break; }
    }

    // optional: if no ?lang and country.language_finale is set, use it
    if (!normLang(qsParam("lang")) && c && normLang(c.language_finale)){
      LANG = normLang(c.language_finale) || LANG;
      try { window.__ULYDIA_LANG__ = LANG; document.documentElement.setAttribute("lang", LANG); } catch(e){}
    }

    return {
      metierSlug: metierSlug,
      metierName: m ? (m.name || m.slug || metierSlug) : metierSlug,
      sector: m ? (m.sector || "") : "",
      iso: iso,
      countryName: c ? (c.name || iso) : iso
    };
  }

  function setHeader(ctx){
    // update job name / tagline if present in propal
    var nameEl = document.getElementById("nom-metier");
    if (nameEl) nameEl.textContent = ctx.metierName || ctx.metierSlug || "";

    var accroche = document.getElementById("accroche-metier");
    // If you later expose a CMS "accroche" field, you can wire it here. For now keep existing if empty.
    if (accroche && !normText(accroche.textContent)) {
      accroche.textContent = "";
    }

    // update filter selects if present
    var fp = document.getElementById("filter-pays");
    if (fp && ctx.iso) fp.value = ctx.iso;
    // sector / metier selects are managed elsewhere (Finsweet) — do not override aggressively
  }

  function findBloc(ctx){
    var mpb = getMPB();
    for (var i=0;i<mpb.length;i++){
      var b = mpb[i];
      if (normSlug(b && b.metier) === ctx.metierSlug && normIso(b && b.iso) === ctx.iso) return b;
    }
    return null;
  }

  function renderOnce(){
    // Ensure propal design exists
    if (!document.getElementById("description-title") || !document.getElementById("sponsor-banner-link")){
      return { ok:false, reason:"propal-not-present" };
    }

    var ctx = computeCtx();
    if (!ctx.metierSlug || !ctx.iso){
      // Missing query params -> do not crash; show minimal message in root if exists
      log("missing params", ctx);
    }

    setHeader(ctx);

    var bloc = findBloc(ctx);
    // If MPB is missing, hide MPB cards, keep rest
    if (!bloc){
      // hide the 4 MPB cards
      ["formation-title","acces-title","marche-title","salaire-title"].forEach(function(id){
        var card = closestCard(document.getElementById(id));
        hide(card);
      });
      // hide sidebar cards that depend on MPB
      ["Indicateurs clés","Grille salariale","Compétences incontournables","Soft Skills essentiels","Stack Technique","Certifications utiles","Écoles & Parcours","Projets Portfolio"].forEach(function(t){
        hide(findCardByTitleIncludes(t));
      });
      // hide FAQ (avoid wrong content)
      hide(findFaqCard());
      // banners still should show (fallback)
      applyBanners(ctx);
      return { ok:true, noMPB:true };
    }

    // Left column (MPB)
    setRichCard("formation-title", bloc.formation);
    setRichCard("acces-title", bloc.acces);
    setRichCard("marche-title", bloc.marche);
    setSalaryCard(bloc);

    // Sidebar (MPB)
    // Indicators card: map from MPB fields (remote/automation/statut + market indicators)
    (function(){
      var card = findCardByTitleIncludes("Indicateurs clés");
      if (!card) return;
      var body = getCardBody(card);
      if (!body) return;

      var rows = [];
      function add(icon, k, v){
        v = normText(v);
        if (!v) return;
        rows.push(
          '<div class="kpi-box" style="display:flex;align-items:center;gap:12px;">' +
            '<div style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(99,102,241,0.10);font-size:18px;">'+icon+'</div>' +
            '<div style="min-width:0">' +
              '<div class="text-xs font-semibold" style="color: var(--muted);">'+escapeHtml(k)+'</div>' +
              '<div class="text-sm font-bold" style="color: var(--text);">'+escapeHtml(v)+'</div>' +
            '</div>' +
          '</div>'
        );
      }

      add("🏠","Télétravail", bloc.remote_level);
      add("🤖","Risque d’automatisation", bloc.automation_risk);
      add("⏱️","Délai d’employabilité", bloc.time_to_employability);
      add("📈","Perspectives", bloc.growth_outlook);
      add("🔥","Demande marché", bloc.market_demand);
      add("🧾","Statut", bloc.statut_generation);

      if (!rows.length){ hide(card); return; }
      show(card);
      body.className = "space-y-3";
      body.innerHTML = rows.join("");
    })();

    // Sidebar skills/tools/certs/schools/portfolio
    setChipsCard("Compétences incontournables", extractItems(bloc.skills_must_have));
    setSoftSkillsCard("Soft Skills essentiels", extractItems(bloc.soft_skills));
    setBadgesCard("Stack Technique Populaire", extractItems(bloc.tools_stack));
    setRichSidebarCard("Certifications utiles", bloc.certifications);
    setRichSidebarCard("Écoles & Parcours recommandés", bloc.schools_or_paths);
    setRichSidebarCard("Projets Portfolio essentiels", bloc.portfolio_projects);

    // FAQ (safe: only if data present for current metier name/slug)
    renderFAQ(ctx.metierName || ctx.metierSlug);

    // Banners
    applyBanners(ctx);

    // Signal
    try { window.dispatchEvent(new Event("ULYDIA:METIER_READY")); } catch(e){}
    return { ok:true };
  }

  function bootBounded(){
    var t0 = Date.now();
    var MAX = 4000; // bounded retry window
    var done = false;

    function tick(){
      if (done) return;
      var res;
      try { res = renderOnce(); } catch(e){
        done = true;
        log("render error", e && e.message ? e.message : e);
        return;
      }
      if (res && res.ok){
        done = true;
        log("render ok", res);
        return;
      }
      if (Date.now() - t0 > MAX){
        done = true;
        log("render timeout", res);
        return;
      }
      setTimeout(tick, 80);
    }
    tick();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootBounded);
  else bootBounded();

})();