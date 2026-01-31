/**
 * ULYDIA — METIER PAGE — MONO (Option A)
 * v2026-01-30 — v4.1 VISITOR COUNTRY (ipinfo) + i18n UI TITLES
 * - Default country = ipinfo (visitor), unless ?country=XX is explicitly set
 * - Loads banners + MPB for resolved country
 * - Translates UI titles / labels (non-CMS text) to the country's final language (from catalog.json)
 * - Keeps "job not available for country" message in EN (per requirement)
 *
 * Requires:
 *  - window.ULYDIA_WORKER_URL, window.ULYDIA_PROXY_SECRET, window.ULYDIA_IPINFO_TOKEN (optional but recommended)
 *  - window.__ULYDIA_FICHE_METIERS__ (fiche data export)
 *  - MPB source in DOM: .ul-cms-blocs-source .w-dyn-item with classes (.js-bloc-metier, .js-bloc-iso, .js-bf-* etc.)
 *  - catalog.json at https://ulydia-assets.pages.dev/assets/catalog.json
 */

(() => {
  if (window.__ULYDIA_METIER_MONO_V41__) return;
  window.__ULYDIA_METIER_MONO_V41__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;

  const WORKER_URL   = String(window.ULYDIA_WORKER_URL || "").trim();
  const PROXY_SECRET = String(window.ULYDIA_PROXY_SECRET || "").trim();
  const IPINFO_TOKEN = String(window.ULYDIA_IPINFO_TOKEN || "").trim();

  const CATALOG_URL  = "https://ulydia-assets.pages.dev/assets/catalog.json";

  const log = (...a) => DEBUG && console.log("[ULYDIA][MONO v4.1]", ...a);
  const warn = (...a) => console.warn("[ULYDIA][MONO v4.1]", ...a);

  // ------------------------
  // Helpers
  // ------------------------
  const norm = (s) => String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const slugify = (s) => norm(s).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

  const qs = (k) => {
    try { return new URLSearchParams(location.search).get(k); } catch(e){ return null; }
  };

  const fetchJSON = async (url, opts) => {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json();
  };

  const isNode = (x) => !!(x && typeof x === "object" && (x.nodeType === 1 || x.nodeType === 11));

  // ------------------------
  // i18n (UI titles / labels)
  // ------------------------
  const I18N = {
    en: {
      sector: "Sector",
      country: "Country",
      sponsor: "Sponsor",
      discoverPartners: "Discover our partner offers",
      learnMore: "Learn more →",
      overview: "Overview",
      missions: "Missions",
      skills: "Skills",
      workEnv: "Work environment",
      profile: "Profile",
      career: "Career path",
      faq: "Frequently asked questions",
      premium: "Premium",
      partner: "Partner",
      noFaq: "No questions available for this job.",
      notAvailable: (countryName) => `This job does not exist for the country "${countryName}".`
    },
    fr: {
      sector: "Secteur",
      country: "Pays",
      sponsor: "Sponsor",
      discoverPartners: "Découvrez nos offres partenaires",
      learnMore: "En savoir plus →",
      overview: "Aperçu",
      missions: "Missions",
      skills: "Compétences",
      workEnv: "Environnement de travail",
      profile: "Profil",
      career: "Parcours",
      faq: "Questions fréquentes",
      premium: "Premium",
      partner: "Partenaire",
      noFaq: "Aucune question disponible pour ce métier.",
      notAvailable: (countryName) => `This job does not exist for the country "${countryName}".`
    },
    de: {
      sector: "Branche",
      country: "Land",
      sponsor: "Sponsor",
      discoverPartners: "Entdecken Sie unsere Partnerangebote",
      learnMore: "Mehr erfahren →",
      overview: "Überblick",
      missions: "Aufgaben",
      skills: "Kompetenzen",
      workEnv: "Arbeitsumfeld",
      profile: "Profil",
      career: "Karriereweg",
      faq: "Häufige Fragen",
      premium: "Premium",
      partner: "Partner",
      noFaq: "Keine Fragen für diesen Beruf verfügbar.",
      notAvailable: (countryName) => `This job does not exist for the country "${countryName}".`
    },
    es: {
      sector: "Sector",
      country: "País",
      sponsor: "Patrocinador",
      discoverPartners: "Descubre nuestras ofertas de socios",
      learnMore: "Más información →",
      overview: "Resumen",
      missions: "Misiones",
      skills: "Habilidades",
      workEnv: "Entorno de trabajo",
      profile: "Perfil",
      career: "Trayectoria",
      faq: "Preguntas frecuentes",
      premium: "Premium",
      partner: "Socio",
      noFaq: "No hay preguntas disponibles para este empleo.",
      notAvailable: (countryName) => `This job does not exist for the country "${countryName}".`
    },
    it: {
      sector: "Settore",
      country: "Paese",
      sponsor: "Sponsor",
      discoverPartners: "Scopri le nostre offerte partner",
      learnMore: "Scopri di più →",
      overview: "Panoramica",
      missions: "Mansioni",
      skills: "Competenze",
      workEnv: "Ambiente di lavoro",
      profile: "Profilo",
      career: "Percorso",
      faq: "Domande frequenti",
      premium: "Premium",
      partner: "Partner",
      noFaq: "Nessuna domanda disponibile per questo lavoro.",
      notAvailable: (countryName) => `This job does not exist for the country "${countryName}".`
    }
  };

  const t = (lang, key) => {
    const L = I18N[lang] || I18N.en;
    const v = L[key] ?? I18N.en[key];
    return (typeof v === "function") ? v : String(v || "");
  };

  // ------------------------
  // Country resolution
  // ------------------------
  async function resolveVisitorCountryISO() {
    const urlIso = norm(qs("country")).toUpperCase();
    if (urlIso && /^[A-Z]{2}$/.test(urlIso)) return { iso: urlIso, source: "url" };

    // Default: ipinfo visitor country
    if (!IPINFO_TOKEN) return { iso: "US", source: "fallback" }; // safe default
    try {
      const info = await fetchJSON(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`);
      const iso = norm(info && info.country).toUpperCase();
      if (iso && /^[A-Z]{2}$/.test(iso)) return { iso, source: "ipinfo" };
    } catch (e) {
      warn("ipinfo failed", e);
    }
    return { iso: "US", source: "fallback" };
  }

  // ------------------------
  // Catalog
  // ------------------------
  async function loadCatalog() {
    if (window.__ULYDIA_CATALOG__ && window.__ULYDIA_CATALOG__.countries) return window.__ULYDIA_CATALOG__;
    try {
      const cat = await fetchJSON(CATALOG_URL, { cache: "force-cache" });
      window.__ULYDIA_CATALOG__ = cat;
      return cat;
    } catch (e) {
      warn("catalog load failed", e);
      return { countries: [] };
    }
  }

  function catalogCountry(cat, iso) {
    const arr = (cat && cat.countries) || [];
    return arr.find(c => norm(c.iso).toUpperCase() === iso) || null;
  }

  // ------------------------
  // Fiche + MPB + FAQ data
  // ------------------------
  function getFiche(slug) {
    const list = window.__ULYDIA_FICHE_METIERS__ || [];
    const bySlug = list.find(x => slugify(x.slug) === slugify(slug));
    if (bySlug) return bySlug;

    // fallback: match by name slugified
    const byName = list.find(x => slugify(x.name) === slugify(slug));
    return byName || null;
  }

  function parseNumber(s) {
    s = String(s || "").toLowerCase().trim();
    if (!s) return null;
    let mult = 1;
    if (s.endsWith("k")) { mult = 1000; s = s.slice(0,-1); }
    s = s.replace(/\s/g,"").replace(/,/g,".").replace(/[^0-9.]/g,"");
    if (!s) return null;
    const n = parseFloat(s);
    return isFinite(n) ? Math.round(n * mult) : null;
  }

  function readMPBFromDOM() {
    const wrap = document.querySelector(".ul-cms-blocs-source");
    if (!wrap) return [];

    const items = Array.from(wrap.querySelectorAll(".w-dyn-item"));
    if (!items.length) return [];

    const pickHTML = (root, sels) => {
      for (const sel of sels) {
        const el = root.querySelector(sel);
        if (!el) continue;
        const h = String(el.innerHTML || "").trim();
        const txt = norm(el.textContent || "");
        if (h) return { type: "html", value: h };
        if (txt) return { type: "text", value: txt };
      }
      return null;
    };

    const sectionDefs = [
      ["formation_bloc", "Formation", [".js-bf-formation_bloc",".js-bf-formation"]],
      ["acces_bloc", "Accès", [".js-bf-acces_bloc",".js-bf-acces"]],
      ["marche_bloc", "Marché", [".js-bf-marche_bloc",".js-bf-marche"]],
      ["salaire_bloc", "Salaire", [".js-bf-salaire_bloc",".js-bf-salaire"]],
      ["education_level_local", "Niveau local", [".js-bf-education_level_local"]],
      ["education_level", "Niveau d’études", [".js-bf-education_level"]],
      ["top_fields", "Domaines", [".js-bf-top_fields"]],
      ["certifications", "Certifications", [".js-bf-certifications"]],
      ["schools_or_paths", "Écoles / Parcours", [".js-bf-schools_or_paths"]],
      ["equivalences_reconversion", "Équivalences / reconversion", [".js-bf-equivalences_reconversion"]],
      ["entry_routes", "Voies d’entrée", [".js-bf-entry_routes"]],
      ["first_job_titles", "Premiers postes", [".js-bf-first_job_titles"]],
      ["typical_employers", "Employeurs typiques", [".js-bf-typical_employers"]],
      ["portfolio_projects", "Projets portfolio", [".js-bf-portfolio_projects"]],
      ["skills_must_have", "Compétences indispensables", [".js-bf-skills_must_have"]],
      ["soft_skills", "Soft skills", [".js-bf-soft_skills"]],
      ["tools_stack", "Stack & outils", [".js-bf-tools_stack"]],
      ["time_to_employability", "Temps vers l’employabilité", [".js-bf-time_to_employability"]],
      ["hiring_sectors", "Secteurs qui recrutent", [".js-bf-hiring_sectors"]],
      ["degrees_examples", "Exemples de diplômes", [".js-bf-degrees_examples"]],
      ["growth_outlook", "Perspectives", [".js-bf-growth_outlook"]],
      ["market_demand", "Demande marché", [".js-bf-market_demand"]],
      ["salary_notes", "Notes salaire", [".js-bf-salary_notes"]]
    ];

    const out = [];

    items.forEach(it => {
      const iso = norm(it.querySelector(".js-bloc-iso")?.textContent).toUpperCase();
      const metier = norm(it.querySelector(".js-bloc-metier")?.textContent);
      if (!iso || !metier) return;

      const sections = [];
      sectionDefs.forEach(([key,label,sels]) => {
        const v = pickHTML(it, sels);
        if (!v || !v.value) return;
        sections.push({ key, label, type: v.type, value: v.value });
      });

      const chips = {
        remote_level: norm(it.querySelector(".js-chip-remote_level")?.textContent) || null,
        automation_risk: norm(it.querySelector(".js-chip-automation_risk")?.textContent) || null,
        statut_generation: norm(it.querySelector(".js-statut-generation")?.textContent) || null,
        currency: norm(it.querySelector(".js-chip-currency")?.textContent) || null
      };

      const salary = {
        junior: {
          min: parseNumber(norm(it.querySelector(".js-sal-junior-min")?.textContent)),
          max: parseNumber(norm(it.querySelector(".js-sal-junior-max")?.textContent)),
        },
        mid: {
          min: parseNumber(norm(it.querySelector(".js-sal-mid-min")?.textContent)),
          max: parseNumber(norm(it.querySelector(".js-sal-mid-max")?.textContent)),
        },
        senior: {
          min: parseNumber(norm(it.querySelector(".js-sal-senior-min")?.textContent)),
          max: parseNumber(norm(it.querySelector(".js-sal-senior-max")?.textContent)),
        },
        variable_share_pct: parseNumber(norm(it.querySelector(".js-sal-variable-share")?.textContent))
      };

      out.push({ iso, metier, sections, chips, salary });
    });

    return out;
  }

  function pickMPBFor(ctx, mpbList) {
    const iso = ctx.iso;
    const targetSlug = slugify(ctx.fiche?.name || ctx.slug);
    return (mpbList || []).find(x => x && x.iso === iso && slugify(x.metier) === targetSlug) || null;
  }

  function getFAQList() {
    const faqs = window.__ULYDIA_FAQS__ || [];
    return Array.isArray(faqs) ? faqs : [];
  }

  function pickFAQsFor(ctx) {
    const targetName = norm(ctx.fiche?.name);
    const iso = ctx.iso;
    return getFAQList().filter(f => {
      if (!f) return false;
      const fIso = norm(f.iso).toUpperCase();
      const fMetier = norm(f.metier);
      return (!fIso || fIso === iso) && (!!targetName && fMetier === targetName);
    });
  }

  // ------------------------
  // Sponsor info
  // ------------------------
  async function fetchSponsorInfo(ctx) {
    if (!WORKER_URL) return null;

    const url = WORKER_URL.replace(/\/$/,"") + "/sponsor-info";
    const payload = {
      metier: ctx.slug,
      country: ctx.iso
    };

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ulydia-proxy-secret": PROXY_SECRET
        },
        body: JSON.stringify(payload)
      });
      if (!r.ok) return null;
      const data = await r.json();
      return data || null;
    } catch (e) {
      warn("sponsor-info failed", e);
      return null;
    }
  }

  function pickUrl(u) {
    u = String(u || "").trim();
    return u && u !== "null" && u !== "undefined" ? u : "";
  }

  function sponsorLink(info) {
    const s = info && info.sponsor;
    const url =
      pickUrl(s?.url) ||
      pickUrl(s?.website) ||
      pickUrl(s?.link) ||
      pickUrl(s?.cta_url) ||
      pickUrl(info?.url) ||
      "";
    return url;
  }

  // ------------------------
  // Rendering
  // ------------------------
  function injectStyles() {
    if (document.getElementById("ulydia-mono-v41-css")) return;
    const css = `
      #ulydia-metier-root *{box-sizing:border-box}
      .ul-hero-banner-wrap{position:relative; width:100%; max-width:680px; margin:18px auto 0; border-radius:14px; overflow:hidden;}
      .ul-hero-banner-wrap img{display:block; width:100%; height:120px; object-fit:cover;}
      .ul-hero-banner-wrap a{display:block; width:100%; height:100%;}
      .ul-premium-img{width:100%; max-width:300px; margin:0 auto; border-radius:12px; overflow:hidden;}
      .ul-premium-img img{display:block; width:100%; height:auto; object-fit:cover;}
      .ul-banner-before-faq{max-width:680px; margin:18px auto 0;}
      .ul-banner-before-faq img{display:block; width:100%; height:120px; object-fit:cover; border-radius:14px;}
      .ul-notavailable{max-width:980px; margin:26px auto; padding:18px 16px; border-radius:14px; background:#fff; box-shadow:0 6px 18px rgba(18,32,66,.08); font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial;}
    `;
    const style = document.createElement("style");
    style.id = "ulydia-mono-v41-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function el(tag, attrs, ...children) {
    const n = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k,v]) => {
        if (v === null || v === undefined) return;
        if (k === "class") n.className = v;
        else if (k === "html") n.innerHTML = v;
        else if (k === "text") n.textContent = v;
        else n.setAttribute(k, String(v));
      });
    }
    children.forEach(c => {
      if (c === null || c === undefined) return;
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else if (isNode(c)) n.appendChild(c);
    });
    return n;
  }

  function renderBanners(ctx) {
    const wrap = el("div", { class: "ul-hero-banner-wrap" });
    if (!ctx.bannerWideUrl) return wrap;

    const href = ctx.bannerLink || `/sponsor?metier=${encodeURIComponent(ctx.slug)}&country=${encodeURIComponent(ctx.iso)}`;
    const a = el("a", { href, target: "_self", rel: "noopener" },
      el("img", { src: ctx.bannerWideUrl, alt: "Sponsor banner" })
    );
    wrap.appendChild(a);
    return wrap;
  }

  function renderBannerBeforeFAQ(ctx) {
    const slot = document.getElementById("ulydia-banner-before-faq-slot");
    if (!slot) return;
    slot.innerHTML = "";
    if (!ctx.bannerWideUrl2) return;

    const href = ctx.bannerLink || `/sponsor?metier=${encodeURIComponent(ctx.slug)}&country=${encodeURIComponent(ctx.iso)}`;
    const box = el("div", { class: "ul-banner-before-faq" },
      el("a", { href, target: "_self", rel: "noopener" },
        el("img", { src: ctx.bannerWideUrl2, alt: "Sponsor banner" })
      )
    );
    slot.appendChild(box);
  }

  function renderPremiumCard(ctx) {
    const href = ctx.bannerLink || `/sponsor?metier=${encodeURIComponent(ctx.slug)}&country=${encodeURIComponent(ctx.iso)}`;

    const imgBox = el("div", { class: "ul-premium-img" },
      el("a", { href, target: "_self", rel: "noopener" },
        el("img", { src: ctx.bannerSquareUrl || "", alt: "Premium" })
      )
    );

    return el("div", { class: "ul-premium-card" },
      el("div", { class: "ul-premium-title", text: t(ctx.lang, "premium") }),
      imgBox,
      el("div", { class: "ul-partner-block" },
        el("div", { class: "ul-partner-title", text: t(ctx.lang, "partner") }),
        el("div", { class: "ul-partner-iso", text: ctx.iso })
      ),
      el("a", { class: "ul-btn", href, target: "_self", rel: "noopener", text: t(ctx.lang, "learnMore") })
    );
  }

  function renderNotAvailable(ctx) {
    const countryName = ctx.countryLabel || ctx.iso;
    return el("div", { class: "ul-notavailable" },
      el("div", { style: "font-weight:700; margin-bottom:6px;", text: "Not available" }),
      el("div", { text: I18N.en.notAvailable(countryName) })
    );
  }

  // Minimal mapping of existing propal-like layout (keeps your current structure)
  function renderPage(ctx) {
    const root = document.getElementById("ulydia-metier-root");
    if (!root) return;

    // Clear
    root.innerHTML = "";

    // If missing MPB for country => message
    if (!ctx.mpb) {
      root.appendChild(renderNotAvailable(ctx));
      return;
    }

    // NOTE: We intentionally keep your current layout minimal here.
    // The full design pass (cards colors, right column modules) can be layered next.
    const h1 = el("h1", { text: ctx.fiche?.name || ctx.slug });
    h1.style.fontSize = "56px";
    h1.style.margin = "20px 0 10px";
    h1.style.color = "#6a6ef6";

    const chips = el("div", { class: "ul-chips" });
    chips.appendChild(el("span", { class: "ul-chip", text: `${t(ctx.lang,"sector")}: —` }));
    chips.appendChild(el("span", { class: "ul-chip", text: `${t(ctx.lang,"country")}: ${ctx.iso}` }));

    const accroche = el("p", { text: norm(ctx.fiche?.accroche) });
    accroche.style.maxWidth = "860px";
    accroche.style.color = "#586070";

    const bannerTop = renderBanners(ctx);

    // Content columns wrapper
    const wrap = el("div", { class: "ul-wrap" });
    wrap.style.maxWidth = "980px";
    wrap.style.margin = "0 auto";
    wrap.style.padding = "10px 16px 60px";

    const grid = el("div", { class: "ul-grid" });
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr 320px";
    grid.style.gap = "18px";
    grid.style.alignItems = "start";

    const left = el("div", { class: "ul-left" });
    const right = el("div", { class: "ul-right" });

    // Overview
    const overviewCard = el("div", { class: "ul-card" });
    overviewCard.style.background = "#fff";
    overviewCard.style.borderRadius = "14px";
    overviewCard.style.boxShadow = "0 6px 18px rgba(18,32,66,.08)";
    overviewCard.style.overflow = "hidden";

    const ovH = el("div", { class: "ul-card-h", text: t(ctx.lang,"overview") });
    ovH.style.padding = "14px 16px";
    ovH.style.fontWeight = "700";
    ovH.style.background = "#f3f6ff";

    const ovB = el("div", { class: "ul-card-b", html: ctx.fiche?.description || "" });
    ovB.style.padding = "14px 16px";

    overviewCard.appendChild(ovH);
    overviewCard.appendChild(ovB);

    left.appendChild(overviewCard);

    // MPB sections (render first 3 core blocks in left for now)
    // You can extend layout in the design pass.
    const coreKeys = new Set(["formation_bloc","acces_bloc","marche_bloc","salaire_bloc"]);
    ctx.mpb.sections
      .filter(s => coreKeys.has(s.key))
      .forEach(sec => {
        const card = el("div", { class: "ul-card" });
        card.style.background = "#fff";
        card.style.borderRadius = "14px";
        card.style.boxShadow = "0 6px 18px rgba(18,32,66,.08)";
        card.style.overflow = "hidden";
        card.style.marginTop = "14px";

        const h = el("div", { class: "ul-card-h", text: sec.label });
        h.style.padding = "14px 16px";
        h.style.fontWeight = "700";
        h.style.background = "#f3f6ff";

        const b = el("div", { class: "ul-card-b", html: sec.type === "html" ? sec.value : `<p>${sec.value}</p>` });
        b.style.padding = "14px 16px";

        card.appendChild(h);
        card.appendChild(b);
        left.appendChild(card);
      });

    // Right: Premium card (square banner)
    const prem = renderPremiumCard(ctx);
    if (prem) {
      prem.style.background = "#fff";
      prem.style.borderRadius = "14px";
      prem.style.boxShadow = "0 6px 18px rgba(18,32,66,.08)";
      prem.style.padding = "14px";
      right.appendChild(prem);
    }

    grid.appendChild(left);
    grid.appendChild(right);

    wrap.appendChild(h1);
    wrap.appendChild(chips);
    if (accroche.textContent) wrap.appendChild(accroche);
    if (bannerTop) wrap.appendChild(bannerTop);
    wrap.appendChild(grid);

    root.appendChild(wrap);

    // 2nd wide banner before FAQ slot
    renderBannerBeforeFAQ(ctx);
  }

  // ------------------------
  // Main
  // ------------------------
  async function main() {
    injectStyles();

    const slug = norm(qs("metier")) || "";
    if (!slug) {
      warn("missing ?metier=");
      return;
    }

    const { iso, source } = await resolveVisitorCountryISO();

    const cat = await loadCatalog();
    const ctry = catalogCountry(cat, iso);

    const lang = norm(ctry?.langue_finale || ctry?.lang || "en").toLowerCase();
    const langFinal = I18N[lang] ? lang : "en";

    const fiche = getFiche(slug);

    // MPB from DOM (fallback). (Window export can be plugged later; DOM is most reliable for now.)
    const mpbList = readMPBFromDOM();
    const mpb = pickMPBFor({ iso, slug, fiche }, mpbList);

    // Banners (default non sponsor from catalog)
    const fallbackWide = pickUrl(ctry?.banners?.banner_1 || ctry?.banners?.banner_wide || ctry?.banner_wide);
    const fallbackSquare = pickUrl(ctry?.banners?.banner_2 || ctry?.banners?.banner_square || ctry?.banner_square);

    // Sponsor info
    let sponsorInfo = null;
    let bannerWideUrl = fallbackWide;
    let bannerWideUrl2 = fallbackWide;
    let bannerSquareUrl = fallbackSquare;
    let bannerLink = ""; // if sponsor, use sponsor link; else /sponsor

    sponsorInfo = await fetchSponsorInfo({ slug, iso });
    if (sponsorInfo && sponsorInfo.sponsor) {
      // Sponsor swap: wide=logo_1, square=logo_2
      const wide = pickUrl(sponsorInfo.sponsor.logo_1 || sponsorInfo.sponsor.banner_1 || sponsorInfo.logo_1);
      const square = pickUrl(sponsorInfo.sponsor.logo_2 || sponsorInfo.sponsor.banner_2 || sponsorInfo.logo_2);
      if (wide) { bannerWideUrl = wide; bannerWideUrl2 = wide; }
      if (square) bannerSquareUrl = square;

      const sLink = sponsorLink(sponsorInfo);
      if (sLink) bannerLink = sLink;
    }

    const ctx = {
      slug,
      iso,
      lang: langFinal,
      countryLabel: norm(ctry?.label || ctry?.name || iso),
      source,
      fiche,
      mpb,
      sponsorInfo,
      bannerWideUrl,
      bannerWideUrl2,
      bannerSquareUrl,
      bannerLink
    };

    // Render
    renderPage(ctx);

    log("ready", { metier: slug, iso, lang: langFinal, source, hasFiche: !!fiche, hasMPB: !!mpb, sponsor: !!(sponsorInfo && sponsorInfo.sponsor) });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();

})();