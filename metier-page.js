/* metier-page.js — Ulydia (V3.0)
   - Page /metier (shell) + support /fiche-metiers/<slug>
   - Rendu full-code (WHITE theme like login/signup)
   - ✅ Keeps existing sponsor banner logic (wide + square, click -> sponsor link)
   - Fallback non sponsor: banners by pays.langue_finale
   - ✅ Metier fields integration (rich text sections)
   - ✅ Metier_Pays_Bloc (optional, only if present for job+iso)
   - ✅ FAQ (optional)
   - ✅ Preview overrides via query:
        ?preview=1
        &country=FR
        &preview_landscape=https://...
        &preview_square=https://...
        &preview_link=https://...
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V30__) return;
  window.__ULYDIA_METIER_PAGE_V30__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // -----------------------------
  // CONFIG
  // -----------------------------
  const WORKER_URL   = window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "";
  const IPINFO_TOKEN = window.ULYDIA_IPINFO_TOKEN || "";

  const qp = (k) => new URLSearchParams(location.search).get(k);

  // -----------------------------
  // PREVIEW OVERRIDES
  // -----------------------------
  const isHttpUrl = (u) => /^https?:\/\//i.test(String(u || "").trim());

  const PREVIEW = (() => {
    const q = new URLSearchParams(location.search);
    const on = q.get("preview") === "1";
    return {
      on,
      country: (q.get("country") || "").toUpperCase(),
      landscape: (q.get("preview_landscape") || "").trim(),
      square: (q.get("preview_square") || "").trim(),
      link: (q.get("preview_link") || "").trim(),
    };
  })();

  // cache-bust only in preview mode (prevents browser showing old image)
  function withCacheBust(u) {
    const s = String(u || "").trim();
    if (!PREVIEW.on || !isHttpUrl(s)) return s;
    try {
      const x = new URL(s);
      x.searchParams.set("ulprev", String(Date.now()));
      return x.toString();
    } catch {
      return s + (s.includes("?") ? "&" : "?") + "ulprev=" + Date.now();
    }
  }

  // -----------------------------
  // ROOT
  // -----------------------------
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
    log("root auto-created");
  }

  // -----------------------------
  // STYLE (white theme like login/signup)
  // -----------------------------
  function injectCSS(){
    if (document.getElementById("ul_metier_css_v30")) return;
    const style = document.createElement("style");
    style.id = "ul_metier_css_v30";
    style.textContent = `
      :root{
        --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
        --ul-red:#c00102;
        --ul-bg:#f6f7fb;
        --ul-card:#ffffff;
        --ul-border: rgba(20,20,20,.14);
        --ul-text: #111827;
        --ul-muted: #6b7280;
        --ul-soft: rgba(17,24,39,.06);
        --ul-shadow: 0 14px 38px rgba(17,24,39,.10);
        --ul-radius: 18px;
      }

      html,body{ background: var(--ul-bg); color: var(--ul-text); }
      #ulydia-metier-root{ font-family: var(--ul-font); }

      .u-wrap{ max-width: 1120px; margin: 0 auto; padding: 36px 16px 90px; }

      /* “card container” like login/signup */
      .u-shell{
        background: var(--ul-card);
        border: 2px solid rgba(17,24,39,.10);
        border-radius: 26px;
        box-shadow: 0 18px 55px rgba(17,24,39,.10);
        padding: 22px;
      }

      .u-topbar{ display:flex; gap:14px; align-items:flex-start; justify-content:space-between; margin-bottom: 16px; flex-wrap:wrap; }
      .u-brand{ display:flex; flex-direction:column; gap:6px; }
      .u-title{ font-size: 34px; font-weight: 800; letter-spacing: -0.03em; margin:0; color: var(--ul-text); }
      .u-title .u-red{ color: var(--ul-red); }
      .u-tagline{ font-size: 15px; color: var(--ul-muted); margin:0; line-height:1.55; max-width: 820px; }
      .u-sub{ font-size: 12px; color: var(--ul-muted); margin:0; }

      .u-actions{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

      .u-grid{ display:grid; grid-template-columns: 1.20fr .80fr; gap: 16px; margin-top: 14px; }
      @media (max-width: 980px){ .u-grid{ grid-template-columns: 1fr; } }

      .u-card{
        background: var(--ul-card);
        border: 2px solid rgba(17,24,39,.08);
        border-radius: var(--ul-radius);
        box-shadow: var(--ul-shadow);
        overflow:hidden;
      }
      .u-card-h{ padding: 16px 18px; border-bottom: 1px solid rgba(17,24,39,.10); display:flex; gap:10px; align-items:center; justify-content:space-between; }
      .u-card-t{ font-size: 13px; font-weight: 800; margin:0; letter-spacing:.02em; text-transform:uppercase; color: #374151; }
      .u-card-b{ padding: 16px 18px; }

      .u-btn{
        appearance:none; border:2px solid rgba(17,24,39,.18);
        background: #fff;
        color: #374151;
        padding: 12px 14px; border-radius: 16px;
        cursor:pointer; font-weight: 800; font-size: 13px;
        transition: transform .10s ease, box-shadow .10s ease;
        text-decoration:none; display:inline-flex; gap:8px; align-items:center;
      }
      .u-btn:hover{ transform: translateY(-1px); box-shadow: 0 10px 24px rgba(17,24,39,.10); }
      .u-btn-primary{
        border-color: rgba(192,1,2,.45);
        background: var(--ul-red);
        color: #fff;
      }
      .u-btn-primary:hover{ filter: brightness(1.03); }

      .u-banner{
        display:block;
        border-radius: 18px;
        overflow:hidden;
        border: 2px solid rgba(17,24,39,.08);
        background: #fff;
        box-shadow: 0 14px 38px rgba(17,24,39,.10);
      }
      .u-banner img{ display:block; width:100%; height:auto; }

      .u-stack{ display:flex; flex-direction:column; gap: 12px; }
      .u-sep{ height:1px; background: rgba(17,24,39,.10); margin: 12px 0; }
      .u-note{ font-size: 12px; color: var(--ul-muted); }

      /* Rich text rendering (Airtable/Webflow) */
      .u-rich{ color: #374151; font-size: 14px; line-height: 1.75; }
      .u-rich p{ margin: 0 0 10px; }
      .u-rich p:last-child{ margin-bottom: 0; }
      .u-rich ul, .u-rich ol{ margin: 8px 0 12px 20px; }
      .u-rich li{ margin: 6px 0; }
      .u-rich a{ color: var(--ul-red); font-weight: 800; text-decoration: none; }
      .u-rich a:hover{ text-decoration: underline; }
      .u-rich h3{ margin: 14px 0 8px; font-size: 15px; }

      .u-kpis{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
      .u-kpi{
        border: 2px solid rgba(17,24,39,.08);
        border-radius: 16px;
        padding: 12px;
        background: #fff;
      }
      .u-kpi .k{ font-size: 12px; color: var(--ul-muted); font-weight: 800; letter-spacing:.02em; text-transform:uppercase; }
      .u-kpi .v{ font-size: 16px; font-weight: 900; color: var(--ul-text); margin-top: 6px; }

      details.u-faq{ border:2px solid rgba(17,24,39,.08); border-radius: 16px; background: #fff; padding: 10px 12px; }
      details.u-faq summary{ cursor:pointer; font-weight:900; color: #111827; }
      details.u-faq .u-rich{ margin-top: 8px; }

      .u-err{ border-color: rgba(192,1,2,.45)!important; background: rgba(192,1,2,.06)!important; }
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // UI helpers
  // -----------------------------
  function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs || {})){
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    (children || []).forEach(c => n.appendChild(c));
    return n;
  }

  function isFilled(v){
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.filter(Boolean).length > 0;
    if (typeof v === "number") return true;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return !!v;
  }

  function pick(obj, ...keys){
    for (const k of keys){
      if (!k) continue;
      const v = obj && obj[k];
      if (isFilled(v)) return v;
    }
    return "";
  }

  function safeUrl(u){
    try{
      if (!u) return "";
      const x = new URL(u, location.origin);
      return x.href;
    }catch{ return ""; }
  }

  function bannerAnchor(imgUrl, linkUrl){
    const href = safeUrl(linkUrl || "");
    const src = safeUrl(imgUrl || "");
    if (!src) return el("div", { class:"u-banner", html:"" });
    const a = el("a", { class:"u-banner", href: href || "#", target: href ? "_blank" : "_self", rel:"noopener" }, [
      el("img", { src, alt:"banner" })
    ]);
    if (!href) a.addEventListener("click", (e)=>e.preventDefault());
    return a;
  }

  function sectionCard(title, html){
    if (!isFilled(html)) return null;
    return el("div", { class:"u-card" }, [
      el("div", { class:"u-card-h" }, [
        el("p", { class:"u-card-t", html: title })
      ]),
      el("div", { class:"u-card-b" }, [
        el("div", { class:"u-rich", html: String(html) })
      ])
    ]);
  }

  function renderLoading(){
    ROOT.innerHTML = "";
    const wrap = el("div", { class:"u-wrap" }, [
      el("div", { class:"u-shell" }, [
        el("div", { class:"u-topbar" }, [
          el("div", { class:"u-brand" }, [
            el("h1", { class:"u-title", html:"<span class='u-red'>Loading</span> job…" }),
            el("p", { class:"u-tagline", html:"Fetching CMS data & sponsor banners" })
          ])
        ]),
        el("div", { class:"u-grid" }, [
          el("div", { class:"u-card" }, [
            el("div", { class:"u-card-h" }, [ el("p", { class:"u-card-t", html:"Overview" }) ]),
            el("div", { class:"u-card-b" }, [
              el("p", { class:"u-note", html:"Please wait…" })
            ])
          ]),
          el("div", { class:"u-card" }, [
            el("div", { class:"u-card-h" }, [ el("p", { class:"u-card-t", html:"Sponsor" }) ]),
            el("div", { class:"u-card-b" }, [ el("p", { class:"u-note", html:"Loading banners…" }) ])
          ])
        ])
      ])
    ]);
    ROOT.appendChild(wrap);
  }

  function renderError(msg){
    ROOT.innerHTML = "";
    const wrap = el("div", { class:"u-wrap" }, [
      el("div", { class:"u-shell" }, [
        el("div", { class:"u-card u-err" }, [
          el("div", { class:"u-card-h" }, [
            el("p", { class:"u-card-t", html:"Could not render this job page" }),
            el("span", { class:"u-note", html:"metier-page.js" })
          ]),
          el("div", { class:"u-card-b u-stack" }, [
            el("div", { class:"u-rich", html: String(msg || "Unknown error") }),
            el("div", { class:"u-note", html:"Tip: /metier?metier=SLUG&country=FR (preview: add &preview=1)" })
          ])
        ])
      ])
    ]);
    ROOT.appendChild(wrap);
  }

  // -----------------------------
  // ISO detection
  // -----------------------------
  async function detectISO(){
    if (PREVIEW.on && PREVIEW.country) return PREVIEW.country;

    const isoQP = (qp("iso") || qp("country") || "").trim().toUpperCase();
    if (isoQP) return isoQP;

    if (!IPINFO_TOKEN) return "FR";
    try{
      const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`, { cache: "no-store" });
      const j = await r.json();
      const iso = (j && j.country ? String(j.country).toUpperCase() : "") || "FR";
      return iso;
    }catch(e){
      log("ipinfo failed", e);
      return "FR";
    }
  }

  // slug detection:
  // - /metier?metier=slug
  // - /metier?slug=slug
  // - /fiche-metiers/slug
  function detectSlug(){
    const s = (qp("metier") || qp("slug") || "").trim();
    if (s) return s;

    const parts = location.pathname.split("/").filter(Boolean);
    const i1 = parts.indexOf("fiche-metiers");
    if (i1 >= 0 && parts[i1+1]) return parts[i1+1];

    const i2 = parts.indexOf("metiers");
    if (i2 >= 0 && parts[i2+1]) return parts[i2+1];

    return "";
  }

  // -----------------------------
  // Data fetch
  // -----------------------------
  async function fetchMetierPage({ slug, iso }){
    const url = `${WORKER_URL.replace(/\/$/,"")}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
    const headers = {};
    if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

    const r = await fetch(url, { headers, cache: "no-store" });
    const j = await r.json().catch(()=>null);
    if (!r.ok || !j || j.ok !== true) {
      const msg = (j && (j.error || j.message)) ? (j.error || j.message) : `HTTP ${r.status}`;
      throw new Error(msg);
    }
    return j;
  }

  // -----------------------------
  // Rendering helpers for Metier_Pays_Bloc
  // -----------------------------
  function formatMoneyRange(min, max, currency){
    const cur = currency || "";
    const hasMin = typeof min === "number" && !Number.isNaN(min);
    const hasMax = typeof max === "number" && !Number.isNaN(max);
    if (!hasMin && !hasMax) return "";
    const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (hasMin && hasMax) return `${fmt(min)}–${fmt(max)} ${cur}`.trim();
    if (hasMin) return `From ${fmt(min)} ${cur}`.trim();
    return `Up to ${fmt(max)} ${cur}`.trim();
  }

  function renderPaysBlocCards(paysBloc){
    if (!paysBloc || !isFilled(paysBloc)) return [];

    // Rich text blocks (only if filled)
    const fields = [
      ["Formation", "formation_bloc"],
      ["Accès", "acces_bloc"],
      ["Salaire", "salaire_bloc"],
      ["Marché", "marche_bloc"],
      ["Education level (local)", "Education_level_local"],
      ["Top fields", "Top_fields"],
      ["Certifications", "Certifications"],
      ["Schools or paths", "Schools_or_paths"],
      ["Equivalences / reconversion", "Equivalences_reconversion"],
      ["Entry routes", "Entry_routes"],
      ["First job titles", "First_job_titles"],
      ["Typical employers", "Typical_employers"],
      ["Portfolio projects", "Portfolio_projects"],
      ["Skills (must-have)", "Skills_must_have"],
      ["Soft skills", "Soft_skills"],
      ["Tools stack", "Tools_stack"],
      ["Time to employability", "Time_to_employability"],
      ["Hiring sectors", "Hiring_sectors"],
      ["Degrees examples", "Degrees_examples"],
      ["Growth outlook", "Growth_outlook"],
      ["Market demand", "Market_demand"],
      ["Education level", "education_level"],
      ["Salary notes", "salary_notes"],
    ];

    const out = [];
    for (const [label, key] of fields){
      const html = pick(paysBloc, key, key.toLowerCase());
      if (isFilled(html)) out.push({ label, html });
    }
    return out;
  }

  // -----------------------------
  // Render
  // -----------------------------
  function renderPage(data){
    const metier  = data.metier || {};
    const pays    = data.pays || {};
    const sponsor = data.sponsor || {};

    const sponsorActive =
      sponsor.active === true ||
      sponsor.active === "true" ||
      sponsor.active === 1 ||
      sponsor.active === "1";

    // --- Metier fields (your real names)
    const title   = pick(metier, "Nom", "name", "title", "titre") || (detectSlug() || "Metier");
    const accroche = pick(metier, "accroche", "tagline", "summary");

    const htmlDescription = pick(metier, "description");
    const htmlMissions    = pick(metier, "missions");
    const htmlCompetences = pick(metier, "Compétences", "Competences", "competences");
    const htmlEnv         = pick(metier, "environnements");
    const htmlProfil      = pick(metier, "profil_recherche");
    const htmlEvol        = pick(metier, "evolutions_possibles");

    // --- Banner logic (KEEP AS-IS)
    let wideUrl = sponsorActive ? (sponsor.logo_wide || sponsor.logo_2 || sponsor.sponsor_logo_2) : (pays?.banners?.wide || "");
    let sqUrl   = sponsorActive ? (sponsor.logo_square || sponsor.logo_1 || sponsor.sponsor_logo_1) : (pays?.banners?.square || "");
    let linkUrl = sponsorActive ? (sponsor.link || sponsor.url || sponsor.lien_sponsor) : (pays?.banners?.link || "/sponsorship");

    // Preview overrides (preview=1 only)
    if (PREVIEW.on) {
      if (isHttpUrl(PREVIEW.landscape)) wideUrl = PREVIEW.landscape;
      if (isHttpUrl(PREVIEW.square))    sqUrl   = PREVIEW.square;
      if (isHttpUrl(PREVIEW.link))      linkUrl = PREVIEW.link;
    }

    // cache-bust preview images
    wideUrl = withCacheBust(wideUrl);
    sqUrl   = withCacheBust(sqUrl);

    // --- Metier_Pays_Bloc (optional)
    const bloc = Array.isArray(data.blocs_pays) && data.blocs_pays.length ? data.blocs_pays[0] : null;
    const blocExists = !!bloc;

    // Sidebar KPIs (from bloc)
    const currency = pick(bloc || {}, "Currency", "currency") || "";
    const salaryJunior = formatMoneyRange(bloc?.salary_junior_min, bloc?.salary_junior_max, currency);
    const salaryMid    = formatMoneyRange(bloc?.salary_mid_min,    bloc?.salary_mid_max,    currency);
    const salarySenior = formatMoneyRange(bloc?.salary_senior_min, bloc?.salary_senior_max, currency);
    const variableShare = (typeof bloc?.salary_variable_share === "number") ? `${bloc.salary_variable_share}%` : "";

    const remoteLevel   = pick(bloc || {}, "Remote_level", "remote_level");
    const automationRisk = pick(bloc || {}, "Automation_risk", "automation_risk");

    // Build country-block rich cards
    const paysCards = blocExists ? renderPaysBlocCards(bloc) : [];

    // ------------------
    // Build DOM
    // ------------------
    ROOT.innerHTML = "";

    const wrap = el("div", { class:"u-wrap" });
    const shell = el("div", { class:"u-shell" });

    const top = el("div", { class:"u-topbar" }, [
      el("div", { class:"u-brand" }, [
        el("h1", { class:"u-title", html: `${title}` }),
        accroche ? el("p", { class:"u-tagline", html: accroche }) : el("p", { class:"u-tagline", html: "" }),
        el("p", { class:"u-sub", html:
          `Country: <b>${String(data.iso || pays.code_iso || pays.iso || "").toUpperCase()}</b>` +
          ` • Language: <b>${String(data.lang || pays.langue_finale || bloc?.lang || "").toLowerCase()}</b>` +
          (PREVIEW.on ? ` • <b style="color:var(--ul-red)">Preview</b>` : ``)
        })
      ]),
      el("div", { class:"u-actions" }, [
        el("a", { class:"u-btn", href:"/", html:"Home" }),
        el("a", { class:"u-btn", href:"/my-account", html:"My account" }),
        el("a", { class:"u-btn u-btn-primary", href:"/sponsorship", html:"Sponsor this job" })
      ])
    ]);

    const wide = isFilled(wideUrl) ? bannerAnchor(wideUrl, linkUrl) : null;

    // LEFT CONTENT
    const leftStack = el("div", { class:"u-stack" });

    // Overview card (description)
    if (isFilled(htmlDescription)) leftStack.appendChild(sectionCard("Overview", htmlDescription));

    // Metier rich sections
    const secMap = [
      ["Missions", htmlMissions],
      ["Compétences", htmlCompetences],
      ["Environnements", htmlEnv],
      ["Profil recherché", htmlProfil],
      ["Évolutions possibles", htmlEvol],
    ];
    for (const [label, html] of secMap){
      if (isFilled(html)) leftStack.appendChild(sectionCard(label, html));
    }

    // Country specifics (only if bloc exists)
    if (blocExists && paysCards.length){
      const countryWrap = el("div", { class:"u-card" }, [
        el("div", { class:"u-card-h" }, [
          el("p", { class:"u-card-t", html:"Country specifics" }),
          el("span", { class:"u-note", html: `${String(data.iso || bloc?.country_code || "").toUpperCase()}` })
        ]),
        el("div", { class:"u-card-b u-stack" })
      ]);
      const body = countryWrap.querySelector(".u-card-b");
      paysCards.forEach(({ label, html }) => {
        body.appendChild(
          el("div", { class:"u-card", style:"box-shadow:none;" }, [
            el("div", { class:"u-card-h" }, [ el("p", { class:"u-card-t", html: label }) ]),
            el("div", { class:"u-card-b" }, [ el("div", { class:"u-rich", html: String(html) }) ])
          ])
        );
      });
      leftStack.appendChild(countryWrap);
    }

    // FAQ (optional)
    if (Array.isArray(data.faq) && data.faq.length){
      const faqCard = el("div", { class:"u-card" }, [
        el("div", { class:"u-card-h" }, [ el("p", { class:"u-card-t", html:"FAQ" }) ]),
        el("div", { class:"u-card-b u-stack" })
      ]);
      const faqBody = faqCard.querySelector(".u-card-b");
      data.faq.forEach(item => {
        const q = item.q || item.question || "Question";
        const a = item.a || item.answer || "";
        if (!isFilled(q) || !isFilled(a)) return;
        faqBody.appendChild(
          el("details", { class:"u-faq" }, [
            el("summary", { html: q }),
            el("div", { class:"u-rich", html: String(a) })
          ])
        );
      });
      leftStack.appendChild(faqCard);
    }

    // RIGHT SIDEBAR
    const rightStack = el("div", { class:"u-stack" });

    // Sponsor card
    const sponsorName = pick(sponsor, "name", "sponsor_name", "sponsor") || pick(metier, "sponsor_name") || "";
    const sponsorCard = el("div", { class:"u-card" }, [
      el("div", { class:"u-card-h" }, [
        el("p", { class:"u-card-t", html:"Sponsor" }),
        el("span", { class:"u-note", html: sponsorActive ? "Active" : "Available" })
      ]),
      el("div", { class:"u-card-b u-stack" }, [
        isFilled(sqUrl) ? bannerAnchor(sqUrl, linkUrl) : el("div", { class:"u-note", html:"No sponsor logo" }),
        isFilled(sponsorName) ? el("div", { class:"u-note", html:`<b>${sponsorName}</b>` }) : el("div", { class:"u-note", html:"" }),
        el("a", { class: sponsorActive ? "u-btn u-btn-primary" : "u-btn u-btn-primary", href: sponsorActive ? (safeUrl(linkUrl) || "#") : "/sponsorship", target: sponsorActive ? "_blank" : "_self", rel:"noopener", html: sponsorActive ? "Visit sponsor" : "Sponsor this job" })
      ])
    ]);

    // KPIs card (only if bloc exists and has values)
    const anyKpi = isFilled(salaryJunior) || isFilled(salaryMid) || isFilled(salarySenior) || isFilled(remoteLevel) || isFilled(automationRisk) || isFilled(variableShare);
    let kpiCard = null;
    if (blocExists && anyKpi) {
      const kpis = el("div", { class:"u-kpis" });
      const addKpi = (k, v) => { if (isFilled(v)) kpis.appendChild(el("div", { class:"u-kpi" }, [ el("div", { class:"k", html: k }), el("div", { class:"v", html: v }) ])); };

      addKpi("Junior", salaryJunior);
      addKpi("Mid", salaryMid);
      addKpi("Senior", salarySenior);
      addKpi("Variable", variableShare);
      addKpi("Remote", remoteLevel);
      addKpi("Automation", automationRisk);

      kpiCard = el("div", { class:"u-card" }, [
        el("div", { class:"u-card-h" }, [
          el("p", { class:"u-card-t", html:"Key figures" }),
          el("span", { class:"u-note", html: currency ? esc(currency) : "" })
        ]),
        el("div", { class:"u-card-b" }, [ kpis ])
      ]);
    }

    // Country info card
    const countryInfo = el("div", { class:"u-card" }, [
      el("div", { class:"u-card-h" }, [ el("p", { class:"u-card-t", html:"Country" }) ]),
      el("div", { class:"u-card-b" }, [
        el("div", { class:"u-note", html:
          `<div><b>${esc(String(pays.Nom || pays.name || pays.country || ""))}</b></div>` +
          `<div>ISO: <b>${esc(String(data.iso || pays.code_iso || pays.iso || "").toUpperCase())}</b></div>` +
          (blocExists ? `<div style="margin-top:6px">Has country-specific data ✅</div>` : `<div style="margin-top:6px">No country-specific data yet</div>`)
        })
      ])
    ]);

    rightStack.appendChild(sponsorCard);
    if (kpiCard) rightStack.appendChild(kpiCard);
    rightStack.appendChild(countryInfo);

    const grid = el("div", { class:"u-grid" }, [ leftStack, rightStack ]);

    shell.appendChild(top);
    if (wide) shell.appendChild(wide);
    shell.appendChild(grid);

    wrap.appendChild(shell);
    ROOT.appendChild(wrap);

    // Optional: SEO inject (front-only) if provided
    // Note: Webflow might override title/meta server-side; this helps for share/preview.
    try{
      const mt = pick(metier, "meta_title");
      const md = pick(metier, "meta_description");
      if (isFilled(mt)) document.title = String(mt);
      if (isFilled(md)) {
        let elMeta = document.querySelector('meta[name="description"]');
        if (!elMeta) {
          elMeta = document.createElement('meta');
          elMeta.setAttribute('name','description');
          document.head.appendChild(elMeta);
        }
        elMeta.setAttribute('content', String(md));
      }
      const jsonld = pick(metier, "schema_json_ld");
      if (isFilled(jsonld)){
        let s = document.getElementById("ul_metier_jsonld");
        if (!s) {
          s = document.createElement('script');
          s.id = 'ul_metier_jsonld';
          s.type = 'application/ld+json';
          document.head.appendChild(s);
        }
        s.textContent = String(jsonld);
      }
    }catch(e){ log("seo inject skipped", e); }
  }

  // -----------------------------
  // MAIN
  // -----------------------------
  async function main(){
    injectCSS();
    renderLoading();

    const slug = detectSlug();
    if (!slug) throw new Error("Missing slug. Use /metier?metier=SLUG&country=FR (preview: add &preview=1)");

    const iso = await detectISO();
    log("metier-page v3.0", { slug, iso, preview: PREVIEW });

    const data = await fetchMetierPage({ slug, iso });
    renderPage(data);
  }

  main().catch((e) => {
    console.error("[metier-page] fatal", e);
    renderError(e && e.message ? e.message : e);
  });
})();
