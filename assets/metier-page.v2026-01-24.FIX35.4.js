/* metier-page.js — Ulydia — FIX35.4 (Propal layout without Tailwind + slug matching + hide empty boxes)
*/
(() => {
  // 🔒 ANTI DOUBLE / MULTI LOAD — CRITIQUE
  if (window.__ULYDIA_METIER_PAGE_LOADED__) {
    console.warn("[metier-page] already loaded, abort");
    return;
  }
  window.__ULYDIA_METIER_PAGE_LOADED__ = true;
  if (window.__ULYDIA_METIER_PAGE_FIX354__) return;
  window.__ULYDIA_METIER_PAGE_FIX354__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page FIX35.4]", ...a);

  let ROOT = document.getElementById("ulydia-metier-root") || document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  const WORKER_URL = window.ULYDIA_WORKER_URL || "";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "";
  const WORKER_TIMEOUT_MS = 2500;

  function injectCSS(){
    if (document.getElementById("ul-metier-css-fix352")) return;
    const st = document.createElement("style");
    st.id = "ul-metier-css-fix352";
    st.textContent = `:root{--primary: #6366f1;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --bg: #ffffff;
      --card: #f8fafc;
      --accent: #f59e0b;
      --success: #10b981;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --shadow-card: 0 4px 20px rgba(0,0,0,.08);
      --font-family: 'Outfit', sans-serif;
      --font-base: 15px;}}
.ul-metier *{font-family: var(--font-family);}}
.ul-metier .gradient-primary{background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);}}
.ul-metier .gradient-accent{background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);}}
.ul-metier .gradient-success{background: linear-gradient(135deg, #10b981 0%, #059669 100%);}}
.ul-metier .pastel-blue{background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);}}
.ul-metier .pastel-purple{background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);}}
.ul-metier .pastel-green{background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);}}
.ul-metier .pastel-orange{background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);}}
.ul-metier .pastel-pink{background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);}}
.ul-metier .pastel-cyan{background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);}}
.ul-metier .card{background: var(--card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border);
      padding: 24px;
      transition: all 0.3s ease;}}
.ul-metier .card:hover{box-shadow: 0 8px 30px rgba(0,0,0,.12);
      transform: translateY(-2px);}}
.ul-metier .card-header{padding: 16px 20px;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      margin: -24px -24px 20px -24px;}}
.ul-metier .section-title{font-weight: 700;
      font-size: 17px;
      color: var(--text);
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;}}
.ul-metier .sponsor-banner-wide{width: 680px;
      height: 120px;
      max-width: 100%;
      border-radius: var(--radius-lg);
      overflow: hidden;
      position: relative;
      cursor: pointer;
      transition: transform 0.3s ease;
      margin-bottom: 32px;}}
.ul-metier .sponsor-banner-wide:hover{transform: scale(1.02);}}
.ul-metier .sponsor-logo-square{width: 300px;
      height: 300px;
      max-width: 100%;
      border-radius: var(--radius-lg);
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border);}}
.ul-metier .badge{display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid;}}
.ul-metier .badge-primary{background: rgba(99,102,241,0.1);
      border-color: rgba(99,102,241,0.3);
      color: #6366f1;}}
.ul-metier .badge-success{background: rgba(16,185,129,0.1);
      border-color: rgba(16,185,129,0.3);
      color: #10b981;}}
.ul-metier .badge-warning{background: rgba(245,158,11,0.1);
      border-color: rgba(245,158,11,0.3);
      color: #f59e0b;}}
.ul-metier .badge-danger{background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.3);
      color: #ef4444;}}
.ul-metier .kpi-box{background: white;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;}}
.ul-metier .kpi-box:hover{border-color: var(--primary);
      box-shadow: 0 4px 16px rgba(99,102,241,0.15);}}
.ul-metier .kpi-icon{width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;}}
.ul-metier .salary-bar-container{height: 10px;
      background: var(--border);
      border-radius: 5px;
      overflow: hidden;
      position: relative;}}
.ul-metier .salary-bar-fill{height: 100%;
      border-radius: 5px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);}}
.ul-metier .chip{display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      border: 1px solid;
      transition: all 0.2s ease;}}
.ul-metier .chip:hover{transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,.1);}}
.ul-metier .rich-content{color: var(--text);
      line-height: 1.7;}}
.ul-metier .rich-content h3{font-weight: 700;
      font-size: 16px;
      margin: 20px 0 12px 0;
      color: var(--text);}}
.ul-metier .rich-content h4{font-weight: 600;
      font-size: 15px;
      margin: 16px 0 10px 0;
      color: var(--text);}}
.ul-metier .rich-content p{margin: 10px 0;}}
.ul-metier .rich-content ul{list-style: none;
      margin: 12px 0;
      padding: 0;}}
.ul-metier .rich-content li{margin: 8px 0;
      padding-left: 24px;
      position: relative;}}
.ul-metier .rich-content li:before{content: "→";
      position: absolute;
      left: 0;
      color: var(--primary);
      font-weight: 700;}}
.ul-metier .rich-content strong{font-weight: 600;
      color: var(--text);}}
.ul-metier .btn{display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 24px;
      height: 48px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 15px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;}}
.ul-metier .btn-primary{background: var(--primary);
      color: white;}}
.ul-metier .btn-primary:hover{background: #4f46e5;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(99,102,241,0.3);}}
.ul-metier .skill-tag{background: white;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;}}
.ul-metier .skill-tag:hover{border-color: var(--primary);
      background: rgba(99,102,241,0.05);}}
.ul-metier .progress-label{display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;}}
.ul-metier .faq-question{cursor: pointer;}}
.ul-metier .faq-question:hover{border-color: var(--primary) !important;
      box-shadow: 0 2px 8px rgba(99,102,241,0.15);}}
.ul-metier .faq-icon{transition: transform 0.3s ease;}}
.ul-metier .faq-answer{animation: slideDown 0.3s ease-out;}}
@keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);}
.ul-metier to{opacity: 1;
        transform: translateY(0);}}\n
.ul-metier{
  font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  background: #f6f8fb;
  min-height: 100vh;
}
.ul-metier .ul-topbar{
  background:#fff;
  border-bottom: 1px solid rgba(226,232,240,.8);
  padding: 14px 0;
}
.ul-metier .ul-container{
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
}
@media (max-width: 640px){
  .ul-metier .ul-container{ width: calc(100% - 28px); }
}
.ul-metier .ul-header{
  padding: 28px 0 18px;
}
.ul-metier .ul-header-row{
  display:flex; align-items:flex-start; justify-content:space-between; gap:18px;
}
@media (max-width: 980px){
  .ul-metier .ul-header-row{ flex-direction:column; }
}
.ul-metier .ul-title-wrap{ flex: 1; min-width: 260px; }
.ul-metier .ul-breadcrumb{ display:flex; gap:10px; align-items:center; font-size: 13px; color: var(--muted); }
.ul-metier .ul-h1{ font-size: 34px; line-height: 1.1; font-weight: 800; color: var(--text); margin-top: 12px; letter-spacing:-0.03em; }
.ul-metier .ul-sub{ margin-top: 8px; font-size: 14px; color: var(--muted); max-width: 780px; }
.ul-metier .ul-sponsor-wide-wrap{ margin-top: 18px; }
.ul-metier .ul-main{
  padding: 18px 0 48px;
}
.ul-metier .ul-grid{
  display:grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
  align-items: start;
}
@media (max-width: 980px){
  .ul-metier .ul-grid{ grid-template-columns: 1fr; }
}
.ul-metier .ul-stack > * + *{ margin-top: 26px; }
.ul-metier .ul-side > * + *{ margin-top: 22px; }
.ul-metier .ul-note{
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  color: var(--muted);
}
.ul-metier .ul-divider{ height:1px; background: var(--border); margin: 14px 0; }
.ul-metier .ul-salary-rows > * + *{ margin-top: 12px; }
.ul-metier .ul-salary-row{ display:flex; justify-content:space-between; align-items:center; }
.ul-metier .ul-salary-row span{ color: var(--text); }
.ul-metier .ul-salary-row .k{ font-weight:700; }
.ul-metier .ul-salary-row .v{ font-weight:800; }
`;
    document.head.appendChild(st);
  }

  function escapeHtml(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
  }
  function stripHtml(html){ return String(html||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim(); }
  function hasContent(v){
    const s = String(v ?? "").trim();
    if (!s) return false;
    if (s === "-" || s === "—" || s.toLowerCase() === "null") return false;
    return stripHtml(s).length > 0;
  }
  function pickUrl(u){
    u = String(u || "").trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("//")) return "https:" + u;
    return "";
  }
  function getParam(name){
    try {
      const u = new URL(location.href);
      return (u.searchParams.get(name) || "").trim();
    } catch(e) { return ""; }
  }
  function normalizeSlug(s){
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  function prettyFromSlug(slug){
    return String(slug||"").replace(/[-_]+/g," ").replace(/\b\w/g, m => m.toUpperCase()).trim();
  }
  function moneyRange(min, max, currency){
    const cur = (currency || "").trim();
    const fmt = (n) => {
      if (n == null || n === "") return "";
      const x = Number(String(n).replace(",","."));
      if (!isFinite(x)) return "";
      return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };
    const a = fmt(min), b = fmt(max);
    if (a && b) return `${a}–${b} ${cur}`.trim();
    if (a) return `${a} ${cur}`.trim();
    if (b) return `${b} ${cur}`.trim();
    return "";
  }

  // Fields mapping: expects Rich Text element with class "js-bf-<fieldKey>" OR "js-bf-<fieldKey-with-dashes>"
  const FIELDS = [
    ["formation_bloc","Vue d'ensemble","pastel-blue"],
    ["acces_bloc","Missions principales","pastel-green"],
    ["marche_bloc","Compétences clés","pastel-purple"],
    ["salaire_bloc","Environnement de travail","pastel-orange"],

    ["education_level_local","Niveau local","pastel-cyan"],
    ["Top_fields","Domaines","pastel-cyan"],
    ["Certifications","Certifications","pastel-purple"],
    ["Schools_or_paths","Écoles / Parcours","pastel-blue"],
    ["Equivalences_reconversion","Équivalences / reconversion","pastel-orange"],
    ["Entry_routes","Voies d’entrée","pastel-green"],
    ["First_job_titles","Premiers postes","pastel-green"],
    ["Typical_employers","Employeurs typiques","pastel-orange"],
    ["Portfolio_projects","Projets portfolio","pastel-purple"],
    ["Skills_must_have","Compétences indispensables","pastel-purple"],
    ["Soft_skills","Soft skills","pastel-pink"],
    ["Tools_stack","Stack & outils","pastel-cyan"],
    ["Time_to_employability","Temps vers l’employabilité","pastel-blue"],
    ["Hiring_sectors","Secteurs qui recrutent","pastel-orange"],
    ["Degrees_examples","Exemples de diplômes","pastel-blue"],
    ["Growth_outlook","Perspectives","pastel-green"],
    ["Market_demand","Demande marché","pastel-orange"],
    ["salary_notes","Notes salaire","pastel-purple"],
    ["education_level","Niveau d’études","pastel-cyan"],
  ];

  function q(it, cls){ return (it.querySelector(cls)?.textContent || "").trim(); }
  function qn(it, cls){
    const t = (it.querySelector(cls)?.textContent || "").trim().replace(/\s+/g,'');
    if (!t) return null;
    const v = Number(t.replace(",","."));
    return isFinite(v) ? v : null;
  }

  function readCMSBlocs(){
    const wrap = document.querySelector(".ul-cms-blocs-source");
    if (!wrap) return [];
    const items = wrap.querySelectorAll(".w-dyn-item");
    const out = [];
    items.forEach(it => {
      const iso = q(it, ".js-bloc-iso").toUpperCase();
      const metierName = q(it, ".js-bloc-metier");
      const metierSlug = q(it, ".js-bloc-metier-slug");
      const status = q(it, ".js-statut-generation");

      const sections = [];
      for (const [key,label,pastel] of FIELDS){
        const cls1 = ".js-bf-" + key;
        const cls2 = ".js-bf-" + key.replace(/_/g,'-');
        const el = it.querySelector(cls1) || it.querySelector(cls2);
        const html = el ? el.innerHTML : "";
        if (hasContent(html)) sections.push({ key, label, pastel, html });
      }

      const chips = {
        Remote_level: q(it, ".js-remote-level"),
        Automation_risk: q(it, ".js-automation-risk"),
        Status_generation: status || q(it, ".js-status-generation"),
        Currency: q(it, ".js-currency"),
      };

      const salary = {
        junior: { min: qn(it, ".js-salary-junior-min"), max: qn(it, ".js-salary-junior-max") },
        mid:    { min: qn(it, ".js-salary-mid-min"),    max: qn(it, ".js-salary-mid-max") },
        senior: { min: qn(it, ".js-salary-senior-min"), max: qn(it, ".js-salary-senior-max") },
        variable_share_pct: qn(it, ".js-salary-variable-share"),
      };

      out.push({ iso, metierName, metierSlug, sections, chips, salary });
    });
    return out;
  }

  function waitForCMS(cb){
    let tries = 0;
    (function loop(){
      tries++;
      const n = document.querySelectorAll(".ul-cms-blocs-source .w-dyn-item").length;
      if (n) return cb();
      if (tries > 90) return cb();
      setTimeout(loop, 50);
    })();
  }

  function findBlocFor(metierSlug, iso){
    const all = readCMSBlocs();
    const target = normalizeSlug(metierSlug);
    const hit = all.find(x => {
      const isoOk = (x.iso || "").toUpperCase() === (iso || "").toUpperCase();
      const cmsSlug = normalizeSlug(x.metierSlug || x.metierName || "");
      return isoOk && cmsSlug === target;
    });
    return { all, hit };
  }

  function fetchWithTimeout(url, opts, ms){
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error("timeout")), ms);
      fetch(url, opts).then(r => { clearTimeout(id); resolve(r); }).catch(e => { clearTimeout(id); reject(e); });
    });
  }

  async function tryFetchBanner({ slug, iso }){
    if (!WORKER_URL) return null;

    const base = WORKER_URL.replace(/\/$/,"");
    const candidates = [
      { path: "/v1/metier-page", params: { slug, iso } },
      { path: "/v1/metier-page", params: { metier: slug, country: iso } },
      { path: "/v1/metier-page", params: { metier: slug, iso } },
      { path: "/v1/metier-page", params: { slug, country: iso } },
    ];

    for (const c of candidates){
      try{
        const u = new URL(base + c.path);
        for (const [k,v] of Object.entries(c.params||{})){
          if (v != null && String(v).trim()) u.searchParams.set(k, String(v).trim());
        }

        const headers = { "accept": "application/json" };
        if (PROXY_SECRET){
          headers["x-ulydia-proxy-secret"] = PROXY_SECRET;
          headers["x-proxy-secret"] = PROXY_SECRET;
        }

        const r = await fetchWithTimeout(String(u), { headers, credentials:"omit" }, WORKER_TIMEOUT_MS);
        if (!r.ok) throw new Error("http " + r.status);
        const j = await r.json();

        const sponsor = j?.metier?.sponsor || j?.sponsor || null;
        const pays = j?.pays || null;

        const wide = pickUrl(sponsor?.logo_2 || sponsor?.logo_wide || pays?.banners?.wide || "");
        const square = pickUrl(sponsor?.logo_1 || sponsor?.logo_square || pays?.banners?.square || "");
        const link = pickUrl(sponsor?.link || sponsor?.website || sponsor?.url || "");
        const partnerName = (sponsor?.name || sponsor?.company || sponsor?.title || "").toString().trim();

        if (!wide && !square) continue;
        return { wide, square, link, partnerName, raw: j };
      } catch(e){
        log("banner fetch attempt failed", c, e);
        continue;
      }
    }
    return null;
  }

  function badgeForStatus(status){
    const s = String(status||"").toLowerCase();
    if (!s) return "";
    let cls = "badge-primary";
    if (s.includes("done") || s.includes("ok") || s.includes("final") || s.includes("complete")) cls = "badge-success";
    if (s.includes("wip") || s.includes("draft") || s.includes("todo") || s.includes("en cours")) cls = "badge-warning";
    if (s.includes("error") || s.includes("ko")) cls = "badge-danger";
    return `<span class="badge ${cls}">🧪 ${escapeHtml(status)}</span>`;
  }

  function render({ title, iso, bloc, banner }){
    const chips = bloc?.chips || {};
    const currency = chips.Currency || "";

    // sections cards (hide empty by construction)
    const cards = (bloc?.sections || []).map(s => `
      <section class="card">
        <div class="card-header ${escapeHtml(s.pastel)}">
          <h2 class="section-title">${escapeHtml(s.label)}</h2>
        </div>
        <div class="rich-content">${s.html}</div>
      </section>
    `);

    const emptyMain = !cards.length ? `
      <div class="ul-note">Aucun bloc spécifique trouvé pour ce métier et ce pays (ou tous les champs sont vides).</div>
    ` : cards.join("");

    // KPI (only show if at least one exists)
    const kpis = [];
    const pushKpi = (icon, label, value, bg) => {
      if (!hasContent(value)) return;
      kpis.push(`
        <div class="kpi-box">
          <div class="kpi-icon" style="background:${bg}">${icon}</div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;color:var(--muted)">${escapeHtml(label)}</div>
            <div style="font-size:14px;font-weight:800;color:var(--text)">${escapeHtml(value)}</div>
          </div>
        </div>
      `);
    };
    pushKpi("🏠","Télétravail",chips.Remote_level,"rgba(99,102,241,0.12)");
    pushKpi("🤖","Automatisation",chips.Automation_risk,"rgba(245,158,11,0.14)");
    pushKpi("💱","Devise",chips.Currency,"rgba(16,185,129,0.12)");
    pushKpi("🧪","Statut",chips.Status_generation,"rgba(139,92,246,0.12)");

    const kpiCard = kpis.length ? `
      <section class="card">
        <div class="card-header gradient-primary">
          <h2 class="section-title" style="color:white">📊 Indicateurs clés</h2>
        </div>
        <div class="ul-stack" style="margin-top:10px">${kpis.join("")}</div>
      </section>
    ` : "";

    // Salary card (only if at least one value)
    const sal = bloc?.salary || {};
    const rows = [
      ["Junior", moneyRange(sal?.junior?.min, sal?.junior?.max, currency)],
      ["Mid", moneyRange(sal?.mid?.min, sal?.mid?.max, currency)],
      ["Senior", moneyRange(sal?.senior?.min, sal?.senior?.max, currency)],
      ["Variable", sal?.variable_share_pct != null ? String(sal.variable_share_pct) + " %" : ""],
    ].filter(r => hasContent(r[1]));
    const salaryCard = rows.length ? `
      <section class="card">
        <div class="card-header gradient-success">
          <h2 class="section-title" style="color:white">💵 Salaires</h2>
        </div>
        <div class="ul-salary-rows">
          ${rows.map(([k,v]) => `
            <div class="ul-salary-row">
              <span class="k">${escapeHtml(k)}</span>
              <span class="v">${escapeHtml(v)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    ` : "";
    // Banner blocks (only if URLs)
    const wide = pickUrl(banner?.wide || "");
    const square = pickUrl(banner?.square || "");
    const link = pickUrl(banner?.link || "");
    const wideHtml = wide ? `
      <div class="ul-sponsor-wide-wrap">
        <a class="sponsor-banner-wide" href="${escapeHtml(link || "#")}" ${link ? `target="_blank" rel="noopener noreferrer"` : `onclick="return false;"`}>
          <img src="${escapeHtml(wide)}" alt="Sponsor" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>
        </a>
      </div>` : "";
    const squareHtml = square ? `
      <div class="sponsor-logo-square">
        <a href="${escapeHtml(link || "#")}" ${link ? `target="_blank" rel="noopener noreferrer"` : `onclick="return false;"`} style="display:block;width:100%;height:100%">
          <img src="${escapeHtml(square)}" alt="Sponsor" style="width:100%;height:100%;object-fit:contain" loading="lazy"/>
        </a>
      </div>` : "";

    // Partner card (uses banner.square as partner image)
    const partnerCard = (square || wide) ? `
      <section class="card">
        <div class="card-header pastel-blue">
          <h2 class="section-title">🤝 Partenaire</h2>
        </div>
        <div style="display:flex; gap:14px; align-items:flex-start; margin-top:12px">
          ${square ? `<div style="width:88px;height:88px;border-radius:16px;border:1px solid var(--border);background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img src="${escapeHtml(square)}" alt="Partenaire" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>
          </div>` : ``}
          <div style="flex:1">
            <div style="font-weight:800;color:var(--text)">${escapeHtml(banner?.partnerName || "Partenaire")}</div>
            <div style="margin-top:6px;color:var(--muted);font-size:13px">Formation / contenu sponsorisé (selon pays).</div>
            ${link ? `<a class="btn btn-primary" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" style="margin-top:10px;display:inline-flex;gap:8px;align-items:center">En savoir plus</a>` : ``}
          </div>
        </div>
      </section>
    ` : "";

    // Soft skills essentials (from bloc section "Soft_skills" if present)
    function extractListFromSection(key){
      const sec = (bloc?.sections || []).find(s => s.key === key);
      if (!sec) return [];
      const txt = stripHtml(sec.html || "");
      if (!txt) return [];
      return txt.split(/[,;\n•]+/).map(x => x.trim()).filter(Boolean).slice(0, 8);
    }
    const soft = extractListFromSection("Soft_skills");
    const softSkillsCard = soft.length ? `
      <section class="card">
        <div class="card-header pastel-pink">
          <h2 class="section-title">🧠 Soft skills essentiels</h2>
        </div>
        <div class="ul-stack" style="margin-top:12px">
          ${soft.map(s => `
            <div class="kpi-box" style="align-items:center">
              <div class="kpi-icon" style="background:rgba(236,72,153,0.12)">✓</div>
              <div style="font-weight:700;color:var(--text)">${escapeHtml(s)}</div>
            </div>
          `).join("")}
        </div>
      </section>
    ` : "";



    ROOT.innerHTML = `
      <div class="ul-metier">
        <div class="ul-topbar">
          <div class="ul-container"></div>
        </div>

        <header class="ul-header">
          <div class="ul-container">
            <div class="ul-header-row">
              <div class="ul-title-wrap">
                <div class="badge badge-primary">🎯 Fiche métier</div>
                <div class="ul-h1">${escapeHtml(title)}</div>
                <div class="ul-sub">Pays : <b>${escapeHtml(iso)}</b> • script=FIX35.4</div>
                ${chips.Status_generation ? `<div style="margin-top:12px">${badgeForStatus(chips.Status_generation)}</div>` : ""}
                ${wideHtml}
              </div>
              <div style="display:flex;flex-direction:column;gap:16px;align-items:flex-end">
                ${squareHtml}
              </div>
            </div>
          </div>
        </header>

        <main class="ul-main">
          <div class="ul-container">
            <div class="ul-grid">
              <div class="ul-stack">${emptyMain}</div>
              <aside class="ul-side">
                ${partnerCard}
                ${kpiCard}
                ${softSkillsCard}
                ${salaryCard}
              </aside>
            </div>
          </div>
        </main>
      </div>
    `;
  }

  function renderLoading(title, iso){
    ROOT.innerHTML = `
      <div class="ul-metier">
        <header class="ul-header">
          <div class="ul-container">
            <div class="badge badge-primary">🎯 Fiche métier</div>
            <div class="ul-h1">${escapeHtml(title)}</div>
            <div class="ul-sub">Chargement… • Pays : <b>${escapeHtml(iso)}</b> • script=FIX35.4</div>
          </div>
        </header>
      </div>
    `;
  }

  function main(){
    injectCSS();
    const slug = getParam("metier") || getParam("slug") || "";
    const iso = (getParam("country") || getParam("iso") || "FR").toUpperCase();
    const title = prettyFromSlug(slug);
    renderLoading(title, iso);

    waitForCMS(async () => {
      const { all, hit } = findBlocFor(slug, iso);
      log("cms items", all.length, "match?", !!hit, "slug", slug, "iso", iso);

      const bloc = hit || { sections: [], chips: {}, salary: {} };
      render({ title, iso, bloc, banner: null });

      // banner fetch (optional)
      const banner = await tryFetchBanner({ slug, iso });
      if (banner) render({ title, iso, bloc, banner });
    });
  }

  try { main(); } catch(e) { console.error("[metier-page FIX35.4] fatal", e); }
})();
