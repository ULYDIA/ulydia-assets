/*!
 * ULYDIA — METIER PAGE — FINAL MONO (Design-driven + Banners)
 * Build: 2026-01-30
 * - ✅ One root: #ulydia-metier-root (no duplicate)
 * - ✅ No dynamic injection of other metier-page scripts
 * - ✅ Reads CMS globals (preferred) + DOM-scan fallback
 * - ✅ Propal-inspired design + sponsor/non-sponsor banners mapping (strict)
 */
(function() {
  "use strict";

  // -----------------------------
  // Guards
  // -----------------------------
  if (window.__ULYDIA_METIER_FINAL_MONO__) return;
  window.__ULYDIA_METIER_FINAL_MONO__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;

  function log() { if (DEBUG) console.log.apply(console, arguments); }
  function warn() { console.warn.apply(console, arguments); }

  // -----------------------------
  // Helpers
  // -----------------------------
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function esc(s) {
    return String(s||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function toUpper2(s) { s = norm(s).toUpperCase(); return s.length===2 ? s : s; }
  function parseNumber(s) {
    s = String(s || "").toLowerCase().trim();
    if (!s) return null;
    var mult = 1;
    if (s.endsWith("k")) { mult = 1000; s = s.slice(0, -1); }
    s = s.replace(/\s/g,"").replace(/,/g,".").replace(/[^0-9.]/g,"");
    if (!s) return null;
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    return Math.round(n * mult);
  }
  function formatMoney(n, cur) {
    if (n===null || n===undefined || !isFinite(n)) return "—";
    // monthly if small? here assume annual values from CMS. Keep raw.
    var s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return s + (cur ? (" " + cur) : "");
  }
  function pickFirst(obj, keys) {
    if (!obj) return null;
    for (var i=0;i<keys.length;i++) {
      var k = keys[i];
      if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null && obj[k] !== "") return obj[k];
    }
    return null;
  }
  function pickUrl(x) {
    if (!x) return "";
    if (typeof x === "string") return x.trim();
    if (typeof x === "object") {
      return String(x.url || x.src || x.href || "").trim();
    }
    return "";
  }
  function normalizeHref(href) {
    href = String(href || "").trim();
    if (!href) return "";
    if (href.startsWith("http://") || href.startsWith("https://")) return href;
    if (href.startsWith("//")) return "https:" + href;
    // allow mailto/tel
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return href;
    // otherwise, treat as absolute path
    if (href.startsWith("/")) return href;
    return "https://" + href.replace(/^https?:\/\//i,"");
  }

  function getParam(name) {
    try {
      var u = new URL(window.location.href);
      return u.searchParams.get(name) || "";
    } catch(_) {
      return "";
    }
  }

  function injectStyleOnce() {
    if (document.getElementById("ulydia-propal-style")) return;
    var st = document.createElement("style");
    st.id = "ulydia-propal-style";
    st.textContent = "\n:root{\n  --primary:#6366f1;\n  --text:#0f172a;\n  --muted:#64748b;\n  --border:#e2e8f0;\n  --bg:#ffffff;\n  --card:#ffffff;\n  --shadow:0 6px 18px rgba(15,23,42,.08);\n  --radius:16px;\n}\n#ulydia-metier-root{min-height:240px;}\n.ul-page{background:var(--bg); color:var(--text); font-family: Outfit, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;}\n.ul-container{max-width:1120px;margin:0 auto;padding:32px 18px 64px;}\n.ul-hero{margin-top:12px;margin-bottom:18px;}\n.ul-title{font-size:42px;line-height:1.1;margin:0 0 10px;font-weight:800;letter-spacing:-.02em;}\n.ul-badges{display:flex;gap:10px;flex-wrap:wrap;}\n.ul-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-weight:600;background:#fff;}\n.ul-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:22px;align-items:start;margin-top:18px;}\n@media (max-width: 980px){.ul-grid{grid-template-columns:1fr;}.ul-right{order:2}}\n.ul-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}\n.ul-card-h{padding:14px 18px;font-weight:800;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);}\n.ul-card-b{padding:16px 18px;color:var(--text);font-size:15px;line-height:1.55;}\n.ul-card-b p{margin:0 0 10px;}\n.ul-card-b ul{margin:8px 0 0 18px;}\n.ul-stack{display:flex;flex-direction:column;gap:14px;}\n/* section header colors (close to propal) */\n.h-train{background:linear-gradient(90deg,#e0e7ff,#f5d0fe);}\n.h-access{background:linear-gradient(90deg,#fce7f3,#fde68a);}\n.h-market{background:linear-gradient(90deg,#dcfce7,#cffafe);}\n.h-salary{background:linear-gradient(90deg,#e9d5ff,#ddd6fe);}\n.h-partner{background:linear-gradient(90deg,#dbeafe,#e0f2fe);}\n.h-indicators{background:linear-gradient(90deg,#d1fae5,#dcfce7);}\n.h-skills{background:linear-gradient(90deg,#fee2e2,#ffe4e6);}\n.h-faq{background:linear-gradient(90deg,#fde68a,#fed7aa);}\n/* Sponsor banner */\n.sponsor-banner-wide{width:100%;height:120px;border-radius:var(--radius);overflow:hidden;display:block;border:1px solid var(--border);box-shadow:var(--shadow);background:linear-gradient(90deg,var(--primary),#8b5cf6);position:relative;text-decoration:none;}\n.sponsor-banner-wide .ul-sb-inner{height:100%;display:flex;align-items:center;justify-content:space-between;padding:18px 20px;color:#fff;}\n.sponsor-banner-wide .ul-sb-title{font-weight:800;font-size:18px;margin:0;}\n.sponsor-banner-wide .ul-sb-sub{opacity:.9;font-weight:600;font-size:13px;margin-top:4px;}\n.sponsor-banner-wide .ul-sb-cta{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);padding:10px 14px;border-radius:999px;font-weight:800;}\n.sponsor-logo-square{width:100%;max-width:300px;height:300px;margin:14px auto 0;border-radius:var(--radius);border:1px solid var(--border);box-shadow:var(--shadow);background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;}\n.sponsor-logo-square img{width:100%;height:100%;object-fit:cover;display:block;}\n.ul-kv{display:grid;grid-template-columns:1fr 1fr;gap:10px;}\n.ul-kv .kv{background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 12px;}\n.ul-kv .k{color:var(--muted);font-weight:800;font-size:12px;margin-bottom:6px;}\n.ul-kv .v{font-weight:800;}\n.ul-pillrow{display:flex;flex-wrap:wrap;gap:8px;}\n.ul-pill{padding:7px 10px;border-radius:999px;background:#eef2ff;border:1px solid #e0e7ff;color:#3730a3;font-weight:700;font-size:12px;}\n/* Salary bars */\n.ul-sal-row{display:grid;grid-template-columns:64px 1fr 94px;gap:10px;align-items:center;margin:10px 0;}\n.ul-sal-bar{height:10px;border-radius:999px;background:#eef2ff;overflow:hidden;border:1px solid #e0e7ff;}\n.ul-sal-bar > div{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:999px;}\n.ul-sal-label{font-weight:900;color:#0f172a;}\n.ul-sal-val{font-weight:900;color:#3730a3;text-align:right;}\n/* FAQ accordion */\n.ul-faq-item{background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-top:10px;}\n.ul-faq-q{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;font-weight:900;cursor:pointer;}\n.ul-faq-a{padding:0 16px 14px;color:var(--text);line-height:1.6;display:none;}\n.ul-faq-item[data-open=\"1\"] .ul-faq-a{display:block;}\n.ul-muted{color:var(--muted);}\n";
    document.head.appendChild(st);
    // Ensure Outfit font (optional)
    if (!document.getElementById("ulydia-font-outfit")) {
      var l = document.createElement("link");
      l.id = "ulydia-font-outfit";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
  }

  // -----------------------------
  // CMS sources (preferred) + DOM-scan fallback
  // -----------------------------
  var MPB_SECTIONS = [
    // Accept both old and new class names (_bloc vs non)
    { key: "formation", sel: [".js-bf-formation", ".js-bf-formation_bloc"] },
    { key: "acces", sel: [".js-bf-acces", ".js-bf-acces_bloc"] },
    { key: "marche", sel: [".js-bf-marche", ".js-bf-marche_bloc"] },
    { key: "salaire_bloc", sel: [".js-bf-salaire", ".js-bf-salaire_bloc"] },
    { key: "education_level_local", sel: [".js-bf-education_level_local"] },
    { key: "education_level", sel: [".js-bf-education_level"] },
    { key: "top_fields", sel: [".js-bf-top_fields"] },
    { key: "certifications", sel: [".js-bf-certifications"] },
    { key: "schools_or_paths", sel: [".js-bf-schools_or_paths"] },
    { key: "equivalences_reconversion", sel: [".js-bf-equivalences_reconversion"] },
    { key: "entry_routes", sel: [".js-bf-entry_routes"] },
    { key: "first_job_titles", sel: [".js-bf-first_job_titles"] },
    { key: "typical_employers", sel: [".js-bf-typical_employers"] },
    { key: "portfolio_projects", sel: [".js-bf-portfolio_projects"] },
    { key: "skills_must_have", sel: [".js-bf-skills_must_have"] },
    { key: "soft_skills", sel: [".js-bf-soft_skills"] },
    { key: "tools_stack", sel: [".js-bf-tools_stack"] },
    { key: "time_to_employability", sel: [".js-bf-time_to_employability"] },
    { key: "hiring_sectors", sel: [".js-bf-hiring_sectors"] },
    { key: "degrees_examples", sel: [".js-bf-degrees_examples"] },
    { key: "growth_outlook", sel: [".js-bf-growth_outlook"] },
    { key: "market_demand", sel: [".js-bf-market_demand"] },
    { key: "salary_notes", sel: [".js-bf-salary_notes"] }
  ];

  function getText(el) { return el ? norm(el.textContent || "") : ""; }
  function getHTML(el) { return el ? String(el.innerHTML || "").trim() : ""; }

  function readMPBFromDOM() {
    // Find any dyn items containing the key identifiers
    var metierEls = qsa(".js-bloc-metier");
    if (!metierEls.length) return [];
    var seen = new Set();
    var out = [];
    metierEls.forEach(function(mEl) {
      var item = mEl.closest(".w-dyn-item") || mEl.parentElement;
      if (!item) return;
      var key = item;
      // de-dupe by element
      if (seen.has(item)) return;
      seen.add(item);

      var iso = toUpper2(getText(qs(".js-bloc-iso", item)));
      var metier = getText(qs(".js-bloc-metier", item));
      if (!iso || !metier) return;

      // chips
      var chips = {
        remote_level: getText(qs(".js-chip-remote_level", item)) || null,
        automation_risk: getText(qs(".js-chip-automation_risk", item)) || null,
        statut_generation: getText(qs(".js-statut-generation", item)) || null,
        currency: getText(qs(".js-chip-currency", item)) || null
      };

      // salary numbers
      var salary = {
        currency: chips.currency || null,
        junior: {
          min: parseNumber(getText(qs(".js-sal-junior-min", item))),
          max: parseNumber(getText(qs(".js-sal-junior-max", item)))
        },
        mid: {
          min: parseNumber(getText(qs(".js-sal-mid-min", item))),
          max: parseNumber(getText(qs(".js-sal-mid-max", item)))
        },
        senior: {
          min: parseNumber(getText(qs(".js-sal-senior-min", item))),
          max: parseNumber(getText(qs(".js-sal-senior-max", item)))
        },
        variable_share: parseNumber(getText(qs(".js-sal-variable-share", item)))
      };

      var fields = {};
      MPB_SECTIONS.forEach(function(def) {
        var el = null;
        for (var i=0;i<def.sel.length;i++) {
          el = qs(def.sel[i], item);
          if (el) break;
        }
        if (!el) return;
        var html = getHTML(el);
        var txt = getText(el);
        var v = html || txt;
        if (!v) return;
        fields[def.key] = html ? v : esc(v).replace(/\n/g,"<br/>");
        fields[def.key + "__is_html"] = !!html;
      });

      out.push({
        metier: metier,
        iso: iso,
        fields: fields,
        chips: chips,
        salaire: salary
      });
    });
    return out;
  }

  function readFaqFromDOM() {
    // Find elements by .js-faq-q or .js-faq-name
    var qEls = qsa(".js-faq-q, .js-faq-name");
    if (!qEls.length) return [];
    var out = [];
    var seen = new Set();
    qEls.forEach(function(qEl) {
      var item = qEl.closest(".w-dyn-item") || qEl.parentElement;
      if (!item || seen.has(item)) return;
      seen.add(item);

      var metier = getText(qs(".js-faq-metier", item));
      var iso = toUpper2(getText(qs(".js-faq-iso", item)));
      var q = getText(qs(".js-faq-q", item)) || getText(qs(".js-faq-name", item));
      var aHtml = getHTML(qs(".js-faq-a", item));
      var aTxt = getText(qs(".js-faq-a", item));
      var a = aHtml || esc(aTxt).replace(/\n/g,"<br/>");

      if (!metier || !q || !a) return;
      out.push({ metier: metier, iso: iso || null, question: q, answer: a });
    });
    return out;
  }

  function getCMS() {
    var metiers = window.__ULYDIA_METIERS__ || window.__ULYDIA_JOBS__ || [];
    var countries = window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || [];
    var sectors = window.__ULYDIA_SECTEURS__ || window.__ULYDIA_SECTORS__ || [];

    // MPB naming differences
    var mpb = window.__ULYDIA_METIER_PAYS_BLOCS__ || window.__ULYDIA_MPB__ || window.__ULYDIA_METIER_PAYS_BLOC__ || null;
    if (!Array.isArray(mpb)) {
      // fallback DOM scan
      mpb = readMPBFromDOM();
    }

    var faqs = window.__ULYDIA_FAQS__ || window.__ULYDIA_FAQ__ || null;
    if (!Array.isArray(faqs)) {
      faqs = readFaqFromDOM();
    }

    return {
      metiers: Array.isArray(metiers) ? metiers : [],
      countries: Array.isArray(countries) ? countries : [],
      sectors: Array.isArray(sectors) ? sectors : [],
      mpb: Array.isArray(mpb) ? mpb : [],
      faqs: Array.isArray(faqs) ? faqs : []
    };
  }

  // -----------------------------
  // Sponsor / Banners (strict mapping from FIX13)
  // -----------------------------
  function replaceWideBannerWithImg(wideA, wideUrl, fallbackUrl) {
    if (!wideA) return;
    wideA.style.background = "none";
    wideA.innerHTML = "";
    if (!wideUrl) return;
    var img = document.createElement("img");
    img.alt = "";
    img.src = wideUrl;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.display = "block";
    wideA.appendChild(img);
    if (fallbackUrl) {
      img.onerror = function() {
        img.onerror = null;
        img.src = fallbackUrl;
      };
    }
  }
  function replaceSquareWithImg(logoBox, squareUrl, fallbackUrl) {
    if (!logoBox) return;
    logoBox.innerHTML = "";
    if (!squareUrl) return;
    var img = document.createElement("img");
    img.alt = "";
    img.src = squareUrl;
    logoBox.appendChild(img);
    if (fallbackUrl) {
      img.onerror = function() {
        img.onerror = null;
        img.src = fallbackUrl;
      };
    }
  }

  async function fetchWorkerPayload(metierSlug, iso) {
    var base = window.ULYDIA_WORKER_URL || "";
    var secret = window.ULYDIA_PROXY_SECRET || "";
    if (!base) return null;

    // Try known endpoint variants (keep silent)
    var endpoints = [
      "/v1/metier-page",
      "/metier-page",
      "/v1/metier",
      "/metier"
    ];
    var lastErr = null;
    for (var i=0;i<endpoints.length;i++) {
      var url = base.replace(/\/$/,"") + endpoints[i] + "?metier=" + encodeURIComponent(metierSlug) + "&country=" + encodeURIComponent(iso);
      try {
        var ctrl = new AbortController();
        var t = setTimeout(function(){ try{ctrl.abort();}catch(_){} }, 7000);
        var r = await fetch(url, {
          method: "GET",
          headers: secret ? { "x-ulydia-proxy-secret": secret } : {},
          signal: ctrl.signal,
          cache: "no-store"
        });
        clearTimeout(t);
        if (!r.ok) {
          lastErr = new Error("HTTP " + r.status);
          continue;
        }
        var j = await r.json();
        if (j && j.ok === false) {
          lastErr = new Error(j.error || "worker error");
          continue;
        }
        return j;
      } catch(e) {
        lastErr = e;
      }
    }
    if (DEBUG && lastErr) warn("[worker] payload failed", lastErr);
    return null;
  }

  async function applyBanners(metierSlug, iso) {
    var wideA = document.getElementById("sponsor-banner-link");
    var logoA = document.getElementById("sponsor-logo-link");
    var logoBox = document.getElementById("sponsor-logo-box");

    if (!wideA || !logoA || !logoBox) return;

    // default banner content (gradient with text)
    function setDefaultWideText() {
      if (wideA.querySelector("img")) return;
      wideA.innerHTML = '<div class="ul-sb-inner"><div><div class="ul-sb-title">Sponsor</div><div class="ul-sb-sub ul-muted" style="color:rgba(255,255,255,.85)">Découvrez nos offres partenaires</div></div><div class="ul-sb-cta">En savoir plus →</div></div>';
    }
    setDefaultWideText();

    var fallbackLink = "/sponsor?metier=" + encodeURIComponent(metierSlug) + "&country=" + encodeURIComponent(iso);

    function setLinks(href) {
      href = normalizeHref(href || "");
      if (!href) href = fallbackLink;
      wideA.href = href;
      logoA.href = href;
    }

    setLinks(fallbackLink);

    // get payload from worker if any
    var payload = await fetchWorkerPayload(metierSlug, iso);

    // Extract sponsor (strict mapping)
    var f = payload && payload.fields ? payload.fields : (payload && payload.data ? payload.data : payload || {});
    var wfLinkRaw = pickFirst(f, ["lien_sponsor","lienSponsor","lien-sponsor","Lien_sponsor","Lien Sponsor"]);
    var wfLink = normalizeHref((wfLinkRaw && (wfLinkRaw.url || wfLinkRaw.href)) || wfLinkRaw || "");

    var wideUrl = pickUrl(pickFirst(f, ["sponsor_logo_2","sponsorLogo2","sponsor-logo-2","Sponsor_logo_2","Sponsor logo 2","Sponsor_logo_2 (wide)"]));
    var squareUrl = pickUrl(pickFirst(f, ["sponsor_logo_1","sponsorLogo1","sponsor-logo-1","Sponsor_logo_1","Sponsor logo 1","Sponsor_logo_1 (square)"]));

    var sObj = (payload && payload.sponsor) ? payload.sponsor : (f && f.sponsor) ? f.sponsor : null;
    var wideUrl2 = wideUrl || pickUrl(sObj && (sObj.logo_2 || sObj.logo2 || sObj.wide || sObj.banner_wide));
    var squareUrl2 = squareUrl || pickUrl(sObj && (sObj.logo_1 || sObj.logo1 || sObj.square || sObj.banner_square));
    var link2 = wfLink || normalizeHref(sObj && (sObj.link || sObj.url || sObj.href));

    var hasSponsor = (sObj && sObj.active === true) || !!(wideUrl2 || squareUrl2);

    if (hasSponsor) {
      replaceWideBannerWithImg(wideA, wideUrl2, "");
      replaceSquareWithImg(logoBox, squareUrl2, "");
      setLinks(link2 || fallbackLink);
      return;
    }

    // Fallback country banners (from payload.pays.banners if available)
    var pPays = payload && payload.pays ? payload.pays : {};
    var pB = pPays && pPays.banners ? pPays.banners : {};

    function pickU() {
      for (var i=0;i<arguments.length;i++) {
        var u = pickUrl(arguments[i]);
        if (u) return u;
      }
      return "";
    }
    var fbWide = pickU(pB.banner_1, pB.banniere_1, pB.image_1, pB.wide, pPays.banner_1, pPays.banniere_1, pPays.image_1, pPays.wide);
    var fbSquare = pickU(pB.banner_2, pB.banniere_2, pB.image_2, pB.square, pPays.banner_2, pPays.banniere_2, pPays.image_2, pPays.square);

    replaceWideBannerWithImg(wideA, fbWide, "");
    replaceSquareWithImg(logoBox, fbSquare, "");
    setLinks(fallbackLink);
  }

  // -----------------------------
  // Rendering
  // -----------------------------
  function card(title, headerClass, bodyHtml) {
    return (
      '<div class="ul-card">' +
        '<div class="ul-card-h ' + headerClass + '">' + esc(title) + '</div>' +
        '<div class="ul-card-b">' + (bodyHtml || '<span class="ul-muted">—</span>') + '</div>' +
      '</div>'
    );
  }

  function listPillsFromRich(html) {
    // Convert basic <li> items into pills; fallback split by commas/lines
    var tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    var lis = tmp.querySelectorAll("li");
    var items = [];
    if (lis && lis.length) {
      lis.forEach(function(li){
        var t = norm(li.textContent || "");
        if (t) items.push(t);
      });
    } else {
      var t = norm(tmp.textContent || "");
      if (t) {
        t.split(/\n|,|·|•/g).forEach(function(x){ x = norm(x); if (x) items.push(x); });
      }
    }
    items = items.slice(0, 16);
    if (!items.length) return '<span class="ul-muted">—</span>';
    return '<div class="ul-pillrow">' + items.map(function(x){ return '<span class="ul-pill">' + esc(x) + '</span>'; }).join("") + '</div>';
  }

  function renderSalary(sal) {
    if (!sal) return '<span class="ul-muted">—</span>';
    var cur = sal.currency || "";
    var rows = [
      { label:"Junior", min: sal.junior && sal.junior.min, max: sal.junior && sal.junior.max },
      { label:"Mid", min: sal.mid && sal.mid.min, max: sal.mid && sal.mid.max },
      { label:"Senior", min: sal.senior && sal.senior.min, max: sal.senior && sal.senior.max }
    ];
    var vals = [];
    rows.forEach(function(r){ if (isFinite(r.max)) vals.push(r.max); if (isFinite(r.min)) vals.push(r.min); });
    var maxAll = vals.length ? Math.max.apply(Math, vals) : 0;
    if (!maxAll) maxAll = 1;
    var html = "";
    rows.forEach(function(r) {
      var min = isFinite(r.min) ? r.min : null;
      var max = isFinite(r.max) ? r.max : null;
      var width = max ? Math.min(100, Math.round((max / maxAll)*100)) : 0;
      html += '<div class="ul-sal-row">' +
        '<div class="ul-sal-label">' + esc(r.label) + '</div>' +
        '<div class="ul-sal-bar"><div style="width:' + width + '%"></div></div>' +
        '<div class="ul-sal-val">' + esc(formatMoney(min, cur) + " - " + formatMoney(max, cur)) + '</div>' +
      '</div>';
    });
    if (sal.variable_share != null) {
      html += '<div class="ul-sal-row"><div class="ul-sal-label">Variable</div><div></div><div class="ul-sal-val">' + esc(String(sal.variable_share)) + '%</div></div>';
    }
    return html;
  }

  function renderFaq(faqs) {
    if (!faqs || !faqs.length) {
      return card("Questions fréquentes", "h-faq", '<span class="ul-muted">—</span>');
    }
    var items = faqs.slice(0, 12).map(function(f, idx) {
      return (
        '<div class="ul-faq-item" data-open="0">' +
          '<div class="ul-faq-q" data-idx="' + idx + '">' +
            '<span>' + esc(f.question) + '</span>' +
            '<span class="ul-muted">▾</span>' +
          '</div>' +
          '<div class="ul-faq-a">' + (f.answer || "") + '</div>' +
        '</div>'
      );
    }).join("");
    return (
      '<div class="ul-card">' +
        '<div class="ul-card-h h-faq">Questions fréquentes</div>' +
        '<div class="ul-card-b">' + items + '</div>' +
      '</div>'
    );
  }

  function findMPBRecord(mpb, metierSlug, iso) {
    var m = String(metierSlug||"").toLowerCase();
    var c = String(iso||"").toUpperCase();
    // try direct match
    for (var i=0;i<mpb.length;i++) {
      var r = mpb[i];
      var rm = String(r.metier || r.job_slug || r.slug || "").toLowerCase();
      var ri = String(r.iso || r.country_code || r.country || "").toUpperCase();
      if (rm === m && ri === c) return r;
    }
    // sometimes metier stored as name => loose match
    for (var j=0;j<mpb.length;j++) {
      var r2 = mpb[j];
      var rm2 = String(r2.metier || "").toLowerCase().replace(/\s+/g,"-");
      var ri2 = String(r2.iso || "").toUpperCase();
      if (rm2 === m && ri2 === c) return r2;
    }
    return null;
  }

  function findMetier(metiers, slug) {
    slug = String(slug||"").toLowerCase();
    for (var i=0;i<metiers.length;i++) {
      var r = metiers[i];
      if (String(r.slug||"").toLowerCase() === slug) return r;
    }
    return null;
  }
  function findCountry(countries, iso) {
    iso = String(iso||"").toUpperCase();
    for (var i=0;i<countries.length;i++) {
      var r = countries[i];
      if (String(r.iso||"").toUpperCase() === iso) return r;
    }
    return null;
  }

  function render(root, cms, metierSlug, iso) {
    var metier = findMetier(cms.metiers, metierSlug) || { slug: metierSlug, name: metierSlug, sector: "" };
    var country = findCountry(cms.countries, iso) || { iso: iso, name: iso, language_finale: "" };
    var rec = findMPBRecord(cms.mpb, metierSlug, iso);

    root.innerHTML =
      '<div class="ul-page">' +
        '<div class="ul-container">' +
          '<div class="ul-hero">' +
            '<h1 class="ul-title" id="job-title">' + esc(metier.name || metierSlug) + '</h1>' +
            '<div class="ul-badges">' +
              '<span class="ul-badge">Sector: <strong>' + esc(metier.sector || "—") + '</strong></span>' +
              '<span class="ul-badge">Country: <strong>' + esc(iso) + '</strong></span>' +
            '</div>' +
          '</div>' +

          '<a id="sponsor-banner-link" class="sponsor-banner-wide" href="#" target="_blank" rel="noopener noreferrer">' +
            '<div class="ul-sb-inner"><div><div class="ul-sb-title">Sponsor</div><div class="ul-sb-sub">Découvrez nos offres partenaires</div></div><div class="ul-sb-cta">En savoir plus →</div></div>' +
          '</a>' +

          '<div class="ul-grid">' +
            '<div class="ul-left"><div class="ul-stack" id="left-col"></div></div>' +
            '<div class="ul-right"><div class="ul-stack" id="right-col">' +

              '<div class="ul-card">' +
                '<div class="ul-card-h h-partner">🤝 Partenaire</div>' +
                '<div class="ul-card-b">' +
                  '<div class="ul-muted" style="font-weight:800">Partenaire</div>' +
                  '<div class="ul-muted" style="margin-top:6px"> ' + esc(iso) + '</div>' +
                  '<a id="sponsor-logo-link" href="#" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block;">' +
                    '<div id="sponsor-logo-box" class="sponsor-logo-square"></div>' +
                  '</a>' +
                '</div>' +
              '</div>' +

              '<div class="ul-card" id="indicators-card"></div>' +
              '<div class="ul-card" id="skills-card"></div>' +

            '</div></div>' +
          '</div>' +

          '<div style="margin-top:22px" id="faq-slot"></div>' +
        '</div>' +
      '</div>';

    if (!rec) {
      // show message inside left-col
      qs("#left-col", root).innerHTML = card("Fiche introuvable", "h-market", '<strong>Impossible de charger la fiche métier.</strong><br/><span class="ul-muted">Vérifie l\'URL : metier=' + esc(metierSlug) + ' • country=' + esc(iso) + '</span>');
      qs("#indicators-card", root).outerHTML = "";
      qs("#skills-card", root).outerHTML = "";
      qs("#faq-slot", root).innerHTML = "";
      return;
    }

    // Normalize record shapes
    var fields = rec.fields || rec;
    var chips = rec.chips || rec.indicators || rec;
    var sal = rec.salaire || rec.salary || fields.salaire || null;

    // Left column core blocks
    var left = [];
    left.push(card("Training", "h-train", fields.formation || fields.formation_bloc || '<span class="ul-muted">—</span>'));
    left.push(card("Access to the role", "h-access", fields.acces || fields.acces_bloc || '<span class="ul-muted">—</span>'));
    left.push(card("Market", "h-market", fields.marche || fields.marche_bloc || fields.market_demand || '<span class="ul-muted">—</span>'));
    left.push(card("Salary", "h-salary", renderSalary(sal) + (fields.salary_notes ? ('<div style="margin-top:10px">' + fields.salary_notes + '</div>') : "")));

    // Add extra blocks if present (similar to propal right extended, but keep minimal)
    qs("#left-col", root).innerHTML = left.join("");

    // Indicators card (right)
    var indicatorsHtml =
      '<div class="ul-card-h h-indicators">📌 Key indicators</div>' +
      '<div class="ul-card-b">' +
        '<div class="ul-kv">' +
          '<div class="kv"><div class="k">Remote</div><div class="v">' + esc(chips.remote_level || chips.Remote_level || "—") + '</div></div>' +
          '<div class="kv"><div class="k">Automation risk</div><div class="v">' + esc(chips.automation_risk || chips.Automation_risk || "—") + '</div></div>' +
          '<div class="kv" style="grid-column:1 / -1"><div class="k">Growth outlook</div><div class="v">' + esc(norm(String(fields.growth_outlook||"")).slice(0,120) || "—") + '</div></div>' +
          '<div class="kv" style="grid-column:1 / -1"><div class="k">Market demand</div><div class="v">' + esc(norm(String(fields.market_demand||"")).slice(0,120) || "—") + '</div></div>' +
        '</div>' +
      '</div>';
    qs("#indicators-card", root).innerHTML = indicatorsHtml;

    // Skills & path card (right)
    var skillsHtml =
      '<div class="ul-card-h h-skills">🧩 Skills & path</div>' +
      '<div class="ul-card-b">' +
        '<div style="margin-bottom:10px"><div class="ul-muted" style="font-weight:900;margin-bottom:6px">Key fields</div>' +
          listPillsFromRich(fields.top_fields || "") +
        '</div>' +
        '<div style="margin-bottom:10px"><div class="ul-muted" style="font-weight:900;margin-bottom:6px">Must-have skills</div>' +
          listPillsFromRich(fields.skills_must_have || "") +
        '</div>' +
        '<div style="margin-bottom:10px"><div class="ul-muted" style="font-weight:900;margin-bottom:6px">Soft skills</div>' +
          listPillsFromRich(fields.soft_skills || "") +
        '</div>' +
        '<div><div class="ul-muted" style="font-weight:900;margin-bottom:6px">Tools / stack</div>' +
          listPillsFromRich(fields.tools_stack || "") +
        '</div>' +
      '</div>';
    qs("#skills-card", root).innerHTML = skillsHtml;

    // FAQ
    var faqList = cms.faqs.filter(function(f) {
      var fm = String(f.metier||"").toLowerCase();
      var fi = String(f.iso||"").toUpperCase();
      return fm === String(metierSlug).toLowerCase() && (!fi || fi === String(iso).toUpperCase());
    });
    qs("#faq-slot", root).innerHTML = renderFaq(faqList);

    // FAQ accordion behavior
    qsa(".ul-faq-q", root).forEach(function(btn) {
      btn.addEventListener("click", function() {
        var item = btn.closest(".ul-faq-item");
        if (!item) return;
        var open = item.getAttribute("data-open")==="1";
        item.setAttribute("data-open", open ? "0" : "1");
      });
    });
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    injectStyleOnce();

    var root = document.getElementById("ulydia-metier-root");
    if (!root) {
      warn("[Ulydia] missing #ulydia-metier-root");
      return;
    }

    var metierSlug = getParam("metier");
    var iso = getParam("country") || getParam("iso") || "FR";
    iso = toUpper2(iso || "FR");

    if (!metierSlug) {
      root.innerHTML = '<div class="ul-page"><div class="ul-container">' + card("Fiche introuvable", "h-market", '<strong>Impossible de charger la fiche métier.</strong><br/><span class="ul-muted">Paramètre manquant : ?metier=...</span>') + '</div></div>';
      return;
    }

    // Wait a bit for CMS embeds (but never block forever)
    var tries = 0;
    (function loop() {
      tries++;
      var cms = getCMS();

      // if we have at least MPB items or tried enough, render
      if ((cms.mpb && cms.mpb.length) || tries > 40) {
        log("[CMS] used — mpb:", cms.mpb.length, "faqs:", cms.faqs.length);
        render(root, cms, metierSlug, iso);
        // Apply banners async (non-blocking)
        applyBanners(metierSlug, iso);
        return;
      }
      setTimeout(loop, 50);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
