/* metier-page.js — Ulydia — FIX35 (Propal boxes + hide empty + blocs CMS + optional banner)
   - Reads Metier_Pays_Blocs from hidden Webflow Collection List: .ul-cms-blocs-source .w-dyn-item
   - Matches: iso == .js-bloc-iso AND metierName == .js-bloc-metier
   - Builds sections for all fields listed (renders ONLY if non-empty)
   - Sidebar chips: Remote_level / Automation_risk / Status_generation / Currency
   - Salary ranges: salary_* fields
   - Banner: optional fetch (non-blocking) from WORKER_URL if available; otherwise hidden
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_FIX351__) return;
  window.__ULYDIA_METIER_PAGE_FIX351__ = true;

  const DEBUG = true;
  const log = (...a) => { if (DEBUG) console.log("[metier-page FIX35.1.1]", ...a); };

  // ----------------------------
  // ROOT
  // ----------------------------
  let ROOT = document.getElementById("ulydia-metier-root") || document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  // ----------------------------
  // CONFIG (optional worker)
  // ----------------------------
  const WORKER_URL = window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev"; // override if needed
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || ""; // optional; if your worker requires it
  const WORKER_TIMEOUT_MS = 2800;

  // ----------------------------
  // CSS
  // ----------------------------
  function injectCSS(){
    if (document.getElementById("ul-metier-css-fix35")) return;
    const st = document.createElement("style");
    st.id = "ul-metier-css-fix35";
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
.ul-metier{ font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: var(--text); background: #f6f8fb; min-height: 100vh; padding: 18px 0 56px; }
.ul-metier .ul-container{ width: min(1200px, calc(100% - 32px)); margin: 0 auto; }
.ul-metier .ul-top{ background: linear-gradient(180deg,#ffffff 0%, rgba(99,102,241,0.06) 100%); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-card); margin-bottom: 22px; }
.ul-metier .ul-pill{ display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius: 999px; font-weight:700; font-size: 12px; background: rgba(99,102,241,0.1); color: var(--primary); border: 1px solid rgba(99,102,241,0.25); }
.ul-metier .ul-title{ margin: 12px 0 6px; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
.ul-metier .ul-sub{ margin: 0 0 18px; font-size: 13px; color: var(--muted); }
.ul-metier .ul-grid{ display: grid; grid-template-columns: 2fr 1fr; gap: 24px; align-items: start; }
@media (max-width: 980px){ .ul-metier .ul-grid{ grid-template-columns: 1fr; } }
.ul-metier .ul-stack > * + *{ margin-top: 16px; }
.ul-metier .ul-side > * + *{ margin-top: 16px; }
.ul-metier .ul-muted{ color: var(--muted); }
.ul-metier .ul-hide{ display:none !important; }
`;
    document.head.appendChild(st);
  }

  // ----------------------------
  // Helpers
  // ----------------------------
  function escapeHtml(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
  }
  function pickUrl(u){
    u = String(u || "").trim();
    if (!u) return "";
    // basic validation
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return u;
  }
  function stripHtml(html){
    return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  function hasContent(v){
    const s = String(v ?? "").trim();
    if (!s) return false;
    if (s === "-" || s === "—" || s.toLowerCase() === "null") return false;
    return stripHtml(s).length > 0;
  }
  function prettyFromSlug(slug){
    return String(slug||"").replace(/[-_]+/g," ").replace(/\b\w/g, m => m.toUpperCase()).trim();
  }
  function moneyRange(min, max, currency){
    const cur = (currency || "").trim();
    const fmt = (n) => {
      if (n == null || n === "") return "";
      const x = Number(n);
      if (!isFinite(x)) return "";
      // no locales to keep stable
      return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };
    const a = fmt(min), b = fmt(max);
    if (a && b) return `${a}–${b} ${cur}`.trim();
    if (a) return `${a} ${cur}`.trim();
    if (b) return `${b} ${cur}`.trim();
    return "";
  }
  function getParam(name){
    try {
      const u = new URL(location.href);
      return (u.searchParams.get(name) || "").trim();
    } catch(e){ return ""; }
  }

  function normalizeSlug(s){
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // ----------------------------
  // Read blocs from CMS
  // ----------------------------
  const FIELDS = [
    ["formation_bloc","🎓 Formation","pastel-blue"],
    ["acces_bloc","🚪 Accès","pastel-green"],
    ["marche_bloc","📈 Marché","pastel-orange"],
    ["salaire_bloc","💰 Salaire","pastel-purple"],
    ["education_level_local","🎓 Niveau local","pastel-cyan"],
    ["Top_fields","🏷️ Domaines","pastel-cyan"],
    ["Certifications","✅ Certifications","pastel-purple"],
    ["Schools_or_paths","🏫 Écoles / Parcours","pastel-blue"],
    ["Equivalences_reconversion","🔁 Équivalences / reconversion","pastel-orange"],
    ["Entry_routes","🛣️ Voies d’entrée","pastel-green"],
    ["First_job_titles","🚀 Premiers postes","pastel-green"],
    ["Typical_employers","🏢 Employeurs typiques","pastel-orange"],
    ["Portfolio_projects","🧩 Projets portfolio","pastel-purple"],
    ["Skills_must_have","⚡ Compétences indispensables","pastel-purple"],
    ["Soft_skills","🧠 Soft skills","pastel-pink"],
    ["Tools_stack","🛠️ Stack & outils","pastel-cyan"],
    ["Time_to_employability","⏱️ Temps vers l’employabilité","pastel-blue"],
    ["Hiring_sectors","🎯 Secteurs qui recrutent","pastel-orange"],
    ["Degrees_examples","🎓 Exemples de diplômes","pastel-blue"],
    ["Growth_outlook","📊 Perspectives","pastel-green"],
    ["Market_demand","🔥 Demande marché","pastel-orange"],
    ["salary_notes","📝 Notes salaire","pastel-purple"],
    ["education_level","🎓 Niveau d’études","pastel-cyan"],
  ];

  function readCMSBlocs(){
    const wrap = document.querySelector(".ul-cms-blocs-source");
    if (!wrap) return [];
    const items = wrap.querySelectorAll(".w-dyn-item");
    const out = [];
    items.forEach(it => {
      const iso = (it.querySelector(".js-bloc-iso")?.textContent || "").trim().toUpperCase();
      const metier = (it.querySelector(".js-bloc-metier")?.textContent || "").trim();
      const metier_slug = (it.querySelector(".js-bloc-metier-slug")?.textContent || "").trim();
      const status = (it.querySelector(".js-statut-generation")?.textContent || "").trim();

      // sections (rich text)
      const sections = [];
      for (const [key,label,pastel] of FIELDS){
        const el = it.querySelector(".js-bf-" + key.replace(/_/g,'-')) || it.querySelector(".js-bf-" + key) || it.querySelector(".js-bf-" + key.toLowerCase());
        // IMPORTANT: your classes are js-bf-formation, js-bf-acces, etc. For new fields, create: js-bf-<fieldname>
        // Best: class uses original field key in lower snake: js-bf-education_level_local
        // We'll support both: js-bf-education-level-local and js-bf-education_level_local
        const html = el ? el.innerHTML : "";
        if (hasContent(html)) sections.push({ key, label, pastel, type:"html", value: html });
      }

      // chips
      const chips = {
        Remote_level: (it.querySelector(".js-remote-level")?.textContent || "").trim(),
        Automation_risk: (it.querySelector(".js-automation-risk")?.textContent || "").trim(),
        Status_generation: status || (it.querySelector(".js-status-generation")?.textContent || "").trim(),
        Currency: (it.querySelector(".js-currency")?.textContent || "").trim(),
      };

      // salary
      const num = (cls) => {
        const t = (it.querySelector(cls)?.textContent || "").trim().replace(/\s+/g,'');
        if (!t) return null;
        const v = Number(t.replace(",","."));
        return isFinite(v) ? v : null;
      };
      const pct = (cls) => {
        const t = (it.querySelector(cls)?.textContent || "").trim();
        if (!t) return null;
        const v = Number(t.replace(",","."));
        return isFinite(v) ? v : null;
      };
      const salary = {
        junior: { min: num(".js-salary-junior-min"), max: num(".js-salary-junior-max") },
        mid:    { min: num(".js-salary-mid-min"),    max: num(".js-salary-mid-max") },
        senior: { min: num(".js-salary-senior-min"), max: num(".js-salary-senior-max") },
        variable_share_pct: pct(".js-salary-variable-share"),
      };

      out.push({ iso, metier, metier_slug, sections, chips, salary });
    });
    return out;
  }

  function waitForCMS(cb){
    let tries = 0;
    (function loop(){
      tries++;
      const items = document.querySelectorAll(".ul-cms-blocs-source .w-dyn-item");
      if (items && items.length) return cb();
      if (tries > 80) return cb(); // give up silently
      setTimeout(loop, 50);
    })();
  }

  function findBlocFor(metierSlug, iso){
    const all = readCMSBlocs();
    const target = normalizeSlug(metierSlug);

    const hit = all.find(x => {
      const isoOk = (x.iso || "").toUpperCase() === (iso || "").toUpperCase();
      const cmsSlug = normalizeSlug(x.metier_slug || x.metier || "");
      // Backward compatibility: if cmsSlug empty, we try to derive from Name by normalizing to slug-ish
      const cmsSlug2 = cmsSlug || normalizeSlug(String(x.metier || ""));
      return isoOk && (cmsSlug2 === target);
    });

    return { all, hit };
  }

  // ----------------------------
  // Banner fetch (optional)
  // ----------------------------
  function fetchWithTimeout(url, opts, ms){
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error("timeout")), ms);
      fetch(url, opts).then(r => {
        clearTimeout(id);
        resolve(r);
      }).catch(e => {
        clearTimeout(id);
        reject(e);
      });
    });
  }

  async function tryFetchBanner({ metier, iso }){
    if (!WORKER_URL) return null;
    try {
      const u = new URL(WORKER_URL.replace(/\/$/,"") + "/v1/metier-page");
      u.searchParams.set("metier", metier);
      u.searchParams.set("country", iso);
      const headers = {};
      if (PROXY_SECRET) headers["x-ul-proxy-secret"] = PROXY_SECRET;
      const r = await fetchWithTimeout(String(u), { headers }, WORKER_TIMEOUT_MS);
      if (!r.ok) throw new Error("http " + r.status);
      const j = await r.json();
      // Expected: j.pays.banners.wide + optional sponsor link (adapt if needed)
      const wide = pickUrl(j?.pays?.banners?.wide || j?.pays?.banners?.banner_wide || "");
      const link = pickUrl(j?.metier?.sponsor?.link || j?.sponsor?.link || "");
      return wide ? { wide, link, debug: "worker ok" } : null;
    } catch(e) {
      return null;
    }
  }

  // ----------------------------
  // Render
  // ----------------------------
  function renderLoading({ metier, iso }){
    ROOT.innerHTML = `
      <div class="ul-metier">
        <div class="ul-container">
          <div class="ul-top">
            <div class="ul-pill">Fiche métier</div>
            <div class="ul-title">${escapeHtml(prettyFromSlug(metier||""))}</div>
            <div class="ul-sub">iso=${escapeHtml(iso)} • script=FIX35.1 • chargement…</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPage({ metierTitle, iso, bloc, banner }){
    const cards = [];
    for (const s of (bloc?.sections || [])) {
      if (!hasContent(s.value)) continue;
      cards.push(`
        <div class="card">
          <div class="card-header ${escapeHtml(s.pastel || "pastel-blue")}">
            <h3 class="section-title text-sm">${escapeHtml(s.label || s.key || "Section")}</h3>
          </div>
          <div class="rich-content">${String(s.value || "")}</div>
        </div>
      `);
    }

    // KPI boxes
    function kpi(icon, label, value){
      if (!hasContent(value)) return "";
      return `
        <div class="kpi-box">
          <div class="kpi-icon" style="background: rgba(99,102,241,0.1);"><span>${icon}</span></div>
          <div class="flex-1">
            <p class="text-xs font-semibold" style="color: var(--muted);">${escapeHtml(label)}</p>
            <p class="text-sm font-bold" style="color: var(--text);">${escapeHtml(String(value))}</p>
          </div>
        </div>
      `;
    }
    const chips = bloc?.chips || {};
    const kpisHtml = [
      kpi("🏠","Télétravail",chips.Remote_level),
      kpi("🤖","Risque d'automatisation",chips.Automation_risk),
      kpi("🧪","Statut génération",chips.Status_generation),
      kpi("💰","Devise",chips.Currency),
    ].filter(Boolean).join("");

    // Salary
    const currency = (chips.Currency || "").trim();
    const sal = bloc?.salary || {};
    const salaryRows = [
      ["Junior",  moneyRange(sal?.junior?.min, sal?.junior?.max, currency)],
      ["Mid",     moneyRange(sal?.mid?.min, sal?.mid?.max, currency)],
      ["Senior",  moneyRange(sal?.senior?.min, sal?.senior?.max, currency)],
      ["Variable", sal?.variable_share_pct != null ? String(sal.variable_share_pct) + " %" : ""],
    ].filter(([_,v]) => hasContent(v));
    const salaryHtml = salaryRows.length ? `
      <div class="card">
        <div class="card-header gradient-success" style="color:white;">
          <h3 class="section-title text-sm" style="color:white;">💵 Salaires</h3>
        </div>
        <div class="space-y-3">
          ${salaryRows.map(([k,v]) => `
            <div class="flex justify-between items-center">
              <span class="text-sm font-semibold" style="color: var(--text);">${escapeHtml(k)}</span>
              <span class="text-sm font-bold" style="color: var(--text);">${escapeHtml(v)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : "";

    // Banner (only if we have URL)
    const wideUrl = pickUrl(banner?.wide || "");
    const wideLink = pickUrl(banner?.link || "");
    const bannerHtml = wideUrl ? `
      <a class="sponsor-banner-wide" href="${escapeHtml(wideLink || "#")}" ${wideLink ? `target="_blank" rel="noopener noreferrer"` : `onclick="return false;"`}>
        <img src="${escapeHtml(wideUrl)}" alt="Bannière sponsorisation" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>
      </a>
    ` : "";

    ROOT.innerHTML = `
      <div class="ul-metier">
        <div class="ul-container">
          <div class="ul-top">
            <div class="ul-pill">Fiche métier</div>
            <div class="ul-title">${escapeHtml(metierTitle || "")}</div>
            <div class="ul-sub">iso=${escapeHtml(iso)} • script=FIX35.1</div>
            ${bannerHtml}
          </div>

          <div class="ul-grid">
            <div class="ul-stack">
              ${cards.length ? cards.join("") : `
                <div class="card">
                  <div class="card-header pastel-orange">
                    <h3 class="section-title text-sm">ℹ️ Contenu non disponible</h3>
                  </div>
                  <div class="rich-content"><p class="ul-muted">Aucun bloc spécifique trouvé pour ce métier et ce pays (ou tous les champs sont vides).</p></div>
                </div>
              `}
            </div>

            <div class="ul-side">
              ${kpisHtml ? `
                <div class="card">
                  <div class="card-header gradient-primary" style="color:white;">
                    <h3 class="section-title text-sm" style="color:white;">📊 Indicateurs clés</h3>
                  </div>
                  <div class="space-y-3">${kpisHtml}</div>
                </div>
              ` : ""}
              ${salaryHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ----------------------------
  // MAIN
  // ----------------------------
  function main(){
    injectCSS();

    const metierSlug = getParam("metier") || getParam("slug") || "";
    const iso = (getParam("country") || getParam("iso") || "FR").toUpperCase();
    const metierTitle = prettyFromSlug(metierSlug);

    renderLoading({ metier: metierSlug, iso });

    // Wait CMS, then render with CMS blocs
    waitForCMS(async () => {
      const { all, hit } = findBlocFor(metierSlug, iso);
      log("cms items", all.length, "match?", !!hit, "metierTitle", metierTitle, "iso", iso);

      const bloc = hit || { sections: [], chips: {}, salary: {} };
      renderPage({ metierTitle, iso, bloc, banner: null });

      // Non-blocking banner fetch: update page when/if available
      const banner = await tryFetchBanner({ metier: metierSlug, iso });
      if (banner && hasContent(banner.wide)) {
        renderPage({ metierTitle, iso, bloc, banner });
      }
    });
  }

  try { main(); } catch(e) { console.error("[metier-page FIX35.1.1] fatal", e); }
})();
