/* metier-page.js — Ulydia (v12.0)
   Full-code render for /metier
   - Uses catalog.json (countries + non-sponsor banners)
   - Uses metiers.json (standard fields + sponsor fields)
   - Optionally uses metier_pays_blocs.json and faq.json (only render if records exist)
   - No placeholder content: if data missing => section hidden
*/
(() => {
  "use strict";
  if (window.__ULYDIA_METIER_PAGE_V12__) return;
  window.__ULYDIA_METIER_PAGE_V12__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page.v12]", ...a);

  // ------------------------------------------------------------
  // CONFIG (edit only if your asset paths differ)
  // ------------------------------------------------------------
  const ASSET_BASE = "https://ulydia-assets.pages.dev/assets";
  const URL_CATALOG = `${ASSET_BASE}/catalog.json`;
  const URL_METIERS  = `${ASSET_BASE}/metiers.json`;
  const URL_SECTEURS = `${ASSET_BASE}/secteurs.json`;
  const URL_BLOCS    = `${ASSET_BASE}/metier_pays_blocs.json`;
  const URL_FAQ      = `${ASSET_BASE}/faq.json`;

  // Where to send non-sponsored CTA (adjust if needed)
  const NON_SPONSOR_CTA_URL = "/sponsorship";

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v)) {
      for (const x of v) {
        const u = pickUrl(x);
        if (u) return u;
      }
      return "";
    }
    if (typeof v === "object") {
      // Webflow image field is often { url, alt, ... } OR { file: { url } }
      return String(v.url || v.src || v.href || (v.file && v.file.url) || "").trim();
    }
    return "";
  }

  function pickLinkUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "object") return String(v.url || v.href || v.link || v.value || "").trim();
    return "";
  }

  function esc(s){ return String(s || "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

  function asText(html){
    const t = document.createElement("div");
    t.innerHTML = String(html || "");
    return (t.textContent || "").trim();
  }

  function isEmptyRich(v){
    const t = asText(v);
    return !t;
  }

  function readJSONScript(id){
    const el = document.getElementById(id);
    if (!el) return null;
    try { return JSON.parse(el.textContent || "null"); } catch(_){ return null; }
  }

  async function fetchJSON(url){
    const u = new URL(url, location.origin);
    // cache-bust with current loader querystring if any
    const v = (new URL(location.href)).searchParams.get("v") || "";
    if (v) u.searchParams.set("v", v);
    const res = await fetch(u.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  }

  function normalizeISO(iso){
    const s = String(iso || "").trim();
    if (!s) return "";
    return s.length === 2 ? s.toUpperCase() : s.toUpperCase().slice(0,2);
  }

  function getFlagEmoji(iso2){
    const iso = normalizeISO(iso2);
    if (!iso || iso.length !== 2) return "🌍";
    const A = 0x1F1E6;
    const c1 = iso.charCodeAt(0) - 65 + A;
    const c2 = iso.charCodeAt(1) - 65 + A;
    return String.fromCodePoint(c1, c2);
  }

  function getParams(){
    const u = new URL(location.href);
    const slug = (u.searchParams.get("metier") || u.searchParams.get("slug") || "").trim();
    const iso  = (u.searchParams.get("country") || u.searchParams.get("iso") || u.searchParams.get("code") || "").trim();
    const sector = (u.searchParams.get("secteur") || u.searchParams.get("sector") || "").trim();
    const previewWide = (u.searchParams.get("preview_landscape") || "").trim();
    const previewSquare = (u.searchParams.get("preview_square") || "").trim();
    return { slug, iso: normalizeISO(iso || "FR"), sector, previewWide, previewSquare };
  }

  function setReady(){
    document.documentElement.classList.remove("ul-metier-pending");
    document.documentElement.classList.add("ul-metier-ready");
  }

  function ensureRoot(){
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.prepend(root);
    }
    return root;
  }

  function injectCSS(){
    if (document.getElementById("ul-metier-css")) return;
    const css = `
/* scoped — Ulydia Metier v12 */
#ulydia-metier-root{ font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#0f172a; }
#ulydia-metier-root *{ box-sizing:border-box; }
#ulydia-metier-root a{ color:inherit; }

.ul-page{ min-height:100vh; background: linear-gradient(180deg,#f8fafc 0%,#ffffff 100%); }
.ul-topbar{ background:#fff; border-bottom:2px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,.05); }
.ul-container{ max-width:1200px; margin:0 auto; padding:16px 24px; }
.ul-grid3{ display:grid; grid-template-columns:1fr; gap:16px; }
@media (min-width: 900px){ .ul-grid3{ grid-template-columns:repeat(3,1fr);} }
.ul-label{ display:block; font-size:12px; font-weight:700; margin:0 0 8px 0; }
.ul-select,.ul-input{ width:100%; padding:12px 14px; border-radius:12px; border:2px solid #e2e8f0; outline:none; font-weight:600; background:#fff; }
.ul-input{ font-weight:500; }
.ul-select:focus,.ul-input:focus{ border-color:#6366f1; box-shadow:0 0 0 4px rgba(99,102,241,.12); }
.ul-resetRow{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0 0 0; color:#64748b; font-weight:600; font-size:13px; }
.ul-link{ text-decoration:none; }
.ul-link:hover{ text-decoration:underline; }

.ul-hero{ padding:26px 0 8px 0; border-bottom:2px solid #e2e8f0; }
.ul-heroRow{ display:flex; align-items:flex-start; gap:16px; }
.ul-back{ width:64px; height:64px; border-radius:16px; background:#6366f1; display:flex; align-items:center; justify-content:center; color:#fff; font-size:26px; box-shadow:0 10px 24px rgba(99,102,241,.25); user-select:none; }
.ul-chip{ display:inline-flex; align-items:center; gap:8px; padding:7px 10px; border-radius:12px; border:2px solid rgba(99,102,241,.25); color:#4f46e5; font-weight:800; font-size:12px; background:#f5f3ff; }
.ul-h1{ font-size:56px; line-height:1.02; margin:10px 0 8px 0; letter-spacing:-.02em; }
@media (max-width: 700px){ .ul-h1{ font-size:42px; } }
.ul-tagline{ font-size:20px; color:#64748b; font-weight:700; margin:0 0 14px 0; }

.ul-wideWrap{ display:flex; justify-content:center; padding:14px 0 18px 0; }
.ul-wideA{ display:block; width:min(820px, 100%); border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; background:#fff; box-shadow:0 4px 20px rgba(0,0,0,.08); }
.ul-wideImg{ display:block; width:100%; height:auto; background:#fff; }

.ul-main{ padding:24px 0 40px 0; }
.ul-gridMain{ display:grid; grid-template-columns:1fr; gap:20px; align-items:start; }
@media (min-width: 980px){ .ul-gridMain{ grid-template-columns: 2fr 1fr; } }

.ul-card{ background:#fff; border:1px solid #e2e8f0; border-radius:18px; box-shadow:0 4px 20px rgba(0,0,0,.08); overflow:hidden; }
.ul-cardHd{ display:flex; align-items:center; gap:10px; padding:14px 16px; font-weight:900; border-bottom:1px solid #e2e8f0; }
.ul-cardBd{ padding:16px; }
.ul-rich{ font-size:15px; line-height:1.65; color:#0f172a; }
.ul-rich p{ margin:0 0 10px 0; }
.ul-rich ul{ margin:10px 0 0 18px; padding:0; }
.ul-rich li{ margin:6px 0; }

.ul-sideStack{ display:flex; flex-direction:column; gap:18px; }
.ul-sponsorBox{ display:flex; flex-direction:column; align-items:center; gap:10px; padding:18px 16px; }
.ul-squareA{ display:block; width:min(260px,100%); border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; background:#fff; }
.ul-squareImg{ width:100%; height:auto; display:block; background:#fff; }
.ul-sponsorName{ font-weight:900; color:#0f172a; }
.ul-sponsorSub{ color:#64748b; font-weight:700; font-size:13px; text-align:center; }
.ul-btn{ display:inline-flex; align-items:center; justify-content:center; gap:10px; padding:12px 14px; border-radius:12px; border:0; cursor:pointer; text-decoration:none; font-weight:900; background:#6366f1; color:#fff; box-shadow:0 10px 24px rgba(99,102,241,.22); }
.ul-btn:hover{ filter:brightness(.98); }
.ul-btn:active{ transform:translateY(1px); }

.ul-kpiList{ display:flex; flex-direction:column; gap:12px; }
.ul-kpi{ display:flex; gap:12px; padding:14px; border-radius:16px; border:2px solid #e2e8f0; background:#fff; }
.ul-kpiIcon{ width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; background:#eef2ff; }
.ul-kpiLabel{ color:#64748b; font-weight:800; font-size:13px; }
.ul-kpiValue{ font-weight:950; font-size:20px; margin-top:2px; }

.ul-accordion{ display:flex; flex-direction:column; gap:10px; }
.ul-accItem{ border:2px solid #e2e8f0; border-radius:14px; overflow:hidden; background:#fff; }
.ul-accBtn{ width:100%; text-align:left; padding:14px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer; border:0; background:#fff; font-weight:900; }
.ul-accBody{ padding:0 14px 14px 14px; display:none; }
.ul-accItem[data-open="1"] .ul-accBody{ display:block; }
.ul-muted{ color:#64748b; }

.ul-skel{ padding:24px; font-weight:800; color:#0f172a; }
`;
    const st = document.createElement("style");
    st.id = "ul-metier-css";
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------
  // Data loaders (robust: try embedded JSON first, then assets)
  // ------------------------------------------------------------
  async function loadCatalog(){
    const embedded = readJSONScript("countriesData");
    if (embedded && Array.isArray(embedded) && embedded.length) return embedded;
    try { return await fetchJSON(URL_CATALOG); } catch(e){ log("catalog fetch fail", e); return []; }
  }

  async function loadMetiers(){
    const embedded = readJSONScript("metiersData");
    if (embedded && Array.isArray(embedded) && embedded.length) return embedded;
    try { return await fetchJSON(URL_METIERS); } catch(e){ log("metiers fetch fail", e); return []; }
  }

  async function loadSecteurs(){
    const embedded = readJSONScript("sectorsData");
    if (embedded && Array.isArray(embedded) && embedded.length) return embedded;
    try { return await fetchJSON(URL_SECTEURS); } catch(e){ log("secteurs fetch fail", e); return []; }
  }

  async function loadBlocs(){
    try { return await fetchJSON(URL_BLOCS); } catch(_){ return []; }
  }

  async function loadFAQ(){
    try { return await fetchJSON(URL_FAQ); } catch(_){ return []; }
  }

  // ------------------------------------------------------------
  // Matching logic
  // ------------------------------------------------------------
  function findCountry(catalog, iso){
    const ISO = normalizeISO(iso);
    return (catalog || []).find(x => normalizeISO(x.iso || x.code_iso || x.code || x.country_code) === ISO) || null;
  }

  function findMetier(metiers, slug){
    const s = String(slug || "").trim();
    if (!s) return null;
    return (metiers || []).find(x => {
      const f = x.fieldData || x.fields || x;
      const sl = String(x.slug || f.slug || f.Slug || f.job_slug || f.Job_slug || "").trim();
      return sl === s;
    }) || null;
  }

  function getMetierField(item, key){
    if (!item) return "";
    const f = item.fieldData || item.fields || item;
    // accept different casings
    return f[key] ?? f[key.toLowerCase()] ?? f[key.toUpperCase()] ?? "";
  }

  function getSecteurForMetier(item){
    const f = item?.fieldData || item?.fields || item || {};
    // Webflow reference can appear as string, object, or array of objects
    const v = f["Secteur d’activité"] || f.secteur || f.secteur_activite || f.secteurActivite || f.secteurs || f.sector;
    if (!v) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) {
      // take first label/slug/name
      const one = v[0] || {};
      return String(one.name || one.label || one.slug || one.id || "").trim();
    }
    if (typeof v === "object") return String(v.name || v.label || v.slug || v.id || "").trim();
    return "";
  }

  function matchBlocRecord(rec, slug, iso){
    if (!rec) return false;
    const f = rec.fieldData || rec.fields || rec;
    const ISO = normalizeISO(iso);
    const jobSlug =
      String(f.job_slug || f.Job_slug || f.slug || f.metier_slug || f.metier || f["métier lié"]?.slug || f["métier lié"]?.fieldData?.slug || "").trim();
    const cc =
      normalizeISO(f.country_code || f.code_iso || f.iso || f.Pays?.code_iso || f.Pays?.iso || "");
    const okSlug = jobSlug === String(slug || "").trim();
    const okIso = !ISO ? true : (cc === ISO || !cc);
    return okSlug && okIso;
  }

  function filterBlocRecords(blocs, slug, iso){
    return (blocs || []).filter(r => matchBlocRecord(r, slug, iso));
  }

  function matchFaqRecord(rec, slug, iso, lang){
    const f = rec.fieldData || rec.fields || rec;
    const qLang = String(f.Langue || f.lang || f.language || "").trim().toLowerCase();
    const okLang = !lang ? true : (qLang ? qLang === String(lang).toLowerCase() : true);
    const jobSlug = String(f["Métier lié"]?.slug || f.metier_lie?.slug || f.metier_slug || f.job_slug || "").trim();
    const okJob = !slug ? true : (jobSlug ? jobSlug === slug : false);

    // Pays can be multi-ref; in exports it might be array of objs; also allow country_code
    const ISO = normalizeISO(iso);
    let okIso = true;
    const cc = normalizeISO(f.country_code || f.code_iso || f.iso || "");
    if (ISO) {
      if (cc) okIso = (cc === ISO);
      else if (Array.isArray(f.Pays)) {
        okIso = f.Pays.some(p => normalizeISO(p.code_iso || p.iso || p.country_code) === ISO);
      } else if (typeof f.Pays === "object" && f.Pays) {
        okIso = normalizeISO(f.Pays.code_iso || f.Pays.iso || f.Pays.country_code) === ISO;
      }
    }
    return okLang && okJob && okIso;
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  function renderSkeleton(root){
    root.innerHTML = `
<div class="ul-page">
  <div class="ul-topbar">
    <div class="ul-container">
      <div class="ul-skel">Ulydia — loading metier page… <span class="ul-muted">If this stays visible, check Console for errors.</span></div>
    </div>
  </div>
</div>`;
  }

  function renderShell(root){
    root.innerHTML = `
<div class="ul-page">
  <div class="ul-topbar">
    <div class="ul-container">
      <div class="ul-grid3">
        <div>
          <label class="ul-label" for="ul-filter-country">🌍 Pays / Région</label>
          <select class="ul-select" id="ul-filter-country"></select>
        </div>
        <div>
          <label class="ul-label" for="ul-filter-sector">🗂️ Secteur d'activité</label>
          <select class="ul-select" id="ul-filter-sector"></select>
        </div>
        <div style="position:relative;">
          <label class="ul-label" for="ul-search-metier">🔎 Rechercher un métier</label>
          <input class="ul-input" id="ul-search-metier" placeholder="Ex: Développeur, Designer, Chef de projet…" autocomplete="off"/>
          <div id="ul-search-suggest" style="position:absolute; top:72px; left:0; right:0; z-index:50; display:none; background:#fff; border:2px solid #e2e8f0; border-radius:14px; box-shadow:0 10px 24px rgba(0,0,0,.10); overflow:hidden;"></div>
        </div>
      </div>
      <div class="ul-resetRow">
        <a class="ul-link" href="#" id="ul-reset">↻ Réinitialiser les filtres</a>
        <div id="ul-count"></div>
      </div>
    </div>
  </div>

  <div class="ul-container ul-hero">
    <div class="ul-heroRow">
      <div class="ul-back" id="ul-back" title="Retour">‹›</div>
      <div style="flex:1;">
        <div class="ul-chip">💼 Fiche Métier</div>
        <h1 class="ul-h1" id="ul-title">—</h1>
        <p class="ul-tagline" id="ul-tagline"></p>
        <div class="ul-wideWrap" id="ul-wideWrap" style="display:none;">
          <a class="ul-wideA" id="ul-wideA" href="#" target="_blank" rel="noopener">
            <img class="ul-wideImg" id="ul-wideImg" alt="Bannière sponsor"/>
          </a>
        </div>
      </div>
    </div>
  </div>

  <div class="ul-container ul-main">
    <div class="ul-gridMain">
      <div class="ul-left">
        <section class="ul-card" id="card-overview" style="display:none;">
          <div class="ul-cardHd">📄 Vue d'ensemble</div>
          <div class="ul-cardBd ul-rich" id="ul-overview"></div>
        </section>

        <section class="ul-card" id="card-missions" style="display:none; margin-top:18px;">
          <div class="ul-cardHd">✅ Missions principales</div>
          <div class="ul-cardBd ul-rich" id="ul-missions"></div>
        </section>

        <section class="ul-card" id="card-competences" style="display:none; margin-top:18px;">
          <div class="ul-cardHd">⚡ Compétences clés</div>
          <div class="ul-cardBd ul-rich" id="ul-competences"></div>
        </section>

        <section class="ul-card" id="card-environnements" style="display:none; margin-top:18px;">
          <div class="ul-cardHd">🧭 Environnements de travail</div>
          <div class="ul-cardBd ul-rich" id="ul-environnements"></div>
        </section>

        <section class="ul-card" id="card-profil" style="display:none; margin-top:18px;">
          <div class="ul-cardHd">👤 Profil recherché</div>
          <div class="ul-cardBd ul-rich" id="ul-profil"></div>
        </section>

        <section class="ul-card" id="card-evolutions" style="display:none; margin-top:18px;">
          <div class="ul-cardHd">📈 Évolutions possibles</div>
          <div class="ul-cardBd ul-rich" id="ul-evolutions"></div>
        </section>

        <div id="ul-blocs-area"></div>

        <section class="ul-card" id="card-faq" style="display:none; margin-top:18px;">
          <div class="ul-cardHd">❓ Questions fréquentes</div>
          <div class="ul-cardBd">
            <div class="ul-accordion" id="ul-faq"></div>
          </div>
        </section>
      </div>

      <aside class="ul-sideStack">
        <section class="ul-card" id="card-sponsor" style="display:none;">
          <div class="ul-cardHd">🤝 Partenaire</div>
          <div class="ul-sponsorBox">
            <a class="ul-squareA" id="ul-squareA" href="#" target="_blank" rel="noopener">
              <img class="ul-squareImg" id="ul-squareImg" alt="Logo sponsor"/>
            </a>
            <div class="ul-sponsorName" id="ul-sponsorName"></div>
            <div class="ul-sponsorSub" id="ul-sponsorSub"></div>
            <a class="ul-btn" id="ul-sponsorBtn" href="#" target="_blank" rel="noopener">Découvrir</a>
          </div>
        </section>

        <section class="ul-card" id="card-kpis" style="display:none;">
          <div class="ul-cardHd">📊 Indicateurs clés</div>
          <div class="ul-cardBd">
            <div class="ul-kpiList" id="ul-kpis"></div>
          </div>
        </section>

        <section class="ul-card" id="card-infos" style="display:none;">
          <div class="ul-cardHd">ℹ️ Infos</div>
          <div class="ul-cardBd ul-rich" id="ul-infos"></div>
        </section>
      </aside>
    </div>
  </div>
</div>`;
  }

  function showCard(id, show){
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function setHTML(id, html){
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = html || "";
  }

  function setText(id, txt){
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = txt || "";
  }

  function applyBanner({ wideUrl, squareUrl, linkUrl, wideAlt, squareAlt, wideEnabled, squareEnabled }){
    const wideWrap = document.getElementById("ul-wideWrap");
    const wideA = document.getElementById("ul-wideA");
    const wideImg = document.getElementById("ul-wideImg");
    const squareA = document.getElementById("ul-squareA");
    const squareImg = document.getElementById("ul-squareImg");

    // wide
    if (wideWrap && wideA && wideImg) {
      if (wideEnabled && wideUrl) {
        wideImg.src = wideUrl;
        wideImg.alt = wideAlt || "Bannière";
        if (linkUrl) wideA.href = linkUrl; else wideA.removeAttribute("href");
        wideWrap.style.display = "";
      } else {
        wideWrap.style.display = "none";
        wideImg.removeAttribute("src");
      }
    }

    // square
    if (squareA && squareImg) {
      if (squareEnabled && squareUrl) {
        squareImg.src = squareUrl;
        squareImg.alt = squareAlt || "Logo";
        if (linkUrl) squareA.href = linkUrl; else squareA.removeAttribute("href");
      } else {
        squareImg.removeAttribute("src");
      }
    }
  }

  function renderKpis(kpi){
    const wrap = document.getElementById("ul-kpis");
    if (!wrap) return;
    wrap.innerHTML = "";

    const items = [
      { key:"Remote_level", label:"Télétravail", icon:"🏠" },
      { key:"Automation_risk", label:"Risque d'automatisation", icon:"🤖" },
      { key:"Currency", label:"Devise", icon:"💰" },
      { key:"Time_to_employability", label:"Délai d'employabilité", icon:"⏱️" },
      { key:"Growth_outlook", label:"Croissance du marché", icon:"📈" },
      { key:"Market_demand", label:"Demande du marché", icon:"🔥" },
    ];

    let any = false;
    for (const it of items) {
      const v = (kpi && (kpi[it.key] ?? kpi[it.key.toLowerCase()])) || "";
      const val = String(v || "").trim();
      if (!val) continue;
      any = true;
      const div = document.createElement("div");
      div.className = "ul-kpi";
      div.innerHTML = `
        <div class="ul-kpiIcon">${it.icon}</div>
        <div>
          <div class="ul-kpiLabel">${esc(it.label)}</div>
          <div class="ul-kpiValue">${esc(val)}</div>
        </div>`;
      wrap.appendChild(div);
    }
    showCard("card-kpis", any);
  }

  function renderBlocsSection(bloc){
    const area = document.getElementById("ul-blocs-area");
    if (!area) return;

    // Only render if we truly have at least one meaningful bloc field
    const richFields = [
      ["formation_bloc", "🏫 Formations & Parcours recommandés"],
      ["acces_bloc", "🚪 Accès au métier"],
      ["marche_bloc", "📌 Marché de l'emploi"],
      ["salaire_bloc", "💰 Salaire"],
      ["education_level_local", "🎓 Niveau requis (local)"],
      ["Top_fields", "⭐ Domaines clés"],
      ["Certifications", "🏆 Certifications utiles"],
      ["Schools_or_paths", "🏫 Écoles & Parcours"],
      ["Equivalences_reconversion", "🔁 Équivalences & reconversion"],
      ["Entry_routes", "🛣️ Voies d’entrée"],
      ["First_job_titles", "🧑‍💼 Postes d’entrée"],
      ["Typical_employers", "🏢 Employeurs types"],
      ["Portfolio_projects", "🧰 Projets portfolio"],
      ["Skills_must_have", "⚡ Compétences incontournables"],
      ["Soft_skills", "🧠 Soft skills"],
      ["Tools_stack", "🛠️ Stack & outils"],
      ["Hiring_sectors", "🏭 Secteurs recruteurs"],
      ["Degrees_examples", "📚 Exemples de diplômes"],
      ["salary_notes", "📝 Notes salaire"],
      ["education_level", "🎓 Niveau d’études"],
    ];

    const f = bloc || {};
    const hasAny = richFields.some(([k]) => !isEmptyRich(f[k]));
    if (!hasAny) return;

    for (const [key, title] of richFields) {
      const html = f[key];
      if (isEmptyRich(html)) continue;
      const sec = document.createElement("section");
      sec.className = "ul-card";
      sec.style.marginTop = "18px";
      sec.innerHTML = `
        <div class="ul-cardHd">${esc(title)}</div>
        <div class="ul-cardBd ul-rich">${html}</div>`;
      area.appendChild(sec);
    }
  }

  function renderFAQ(items){
    const wrap = document.getElementById("ul-faq");
    if (!wrap) return;
    wrap.innerHTML = "";
    const list = (items || []).filter(x => x && (x.question || (x.fieldData||x.fields||x).Question));
    if (!list.length) {
      showCard("card-faq", false);
      return;
    }

    list.sort((a,b) => {
      const fa = a.fieldData||a.fields||a;
      const fb = b.fieldData||b.fields||b;
      const oa = Number(fa.Ordre || fa.ordre || 0);
      const ob = Number(fb.Ordre || fb.ordre || 0);
      return oa - ob;
    });

    list.forEach((rec, idx) => {
      const f = rec.fieldData || rec.fields || rec;
      const q = String(f.Question || f.question || "").trim();
      const a = String(f["Réponse"] || f.reponse || f.answer || "").trim();
      if (!q || !a) return;

      const item = document.createElement("div");
      item.className = "ul-accItem";
      item.dataset.open = "0";
      item.innerHTML = `
        <button class="ul-accBtn" type="button">
          <span>${esc(q)}</span>
          <span aria-hidden="true">▾</span>
        </button>
        <div class="ul-accBody ul-rich">${a}</div>
      `;
      const btn = item.querySelector(".ul-accBtn");
      btn.addEventListener("click", () => {
        item.dataset.open = item.dataset.open === "1" ? "0" : "1";
      });
      wrap.appendChild(item);
    });

    showCard("card-faq", true);
  }

  function buildSuggestions(container, metiers, filterText){
    const txt = String(filterText || "").trim().toLowerCase();
    const matches = (metiers || [])
      .map(item => {
        const f = item.fieldData || item.fields || item;
        return {
          slug: String(item.slug || f.slug || f.job_slug || "").trim(),
          name: String(f.Nom || f["Nom du métier"] || f.name || f.nom || f.Name || "").trim(),
        };
      })
      .filter(x => x.slug && x.name)
      .filter(x => !txt || x.name.toLowerCase().includes(txt) || x.slug.toLowerCase().includes(txt))
      .slice(0, 12);

    container.innerHTML = "";
    matches.forEach(m => {
      const row = document.createElement("div");
      row.style.padding = "10px 12px";
      row.style.cursor = "pointer";
      row.style.fontWeight = "800";
      row.textContent = m.name;
      row.addEventListener("mouseenter", () => row.style.background = "#f8fafc");
      row.addEventListener("mouseleave", () => row.style.background = "#fff");
      row.addEventListener("click", () => {
        const p = getParams();
        const u = new URL(location.href);
        u.searchParams.set("metier", m.slug);
        u.searchParams.set("slug", m.slug);
        u.searchParams.set("country", p.iso);
        u.searchParams.delete("preview_landscape");
        u.searchParams.delete("preview_square");
        location.href = u.toString();
      });
      container.appendChild(row);
    });
    return matches.length;
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  async function boot(){
    injectCSS();
    const root = ensureRoot();
    renderSkeleton(root);

    const params = getParams();
    const [catalog, metiers, secteurs, blocsAll, faqAll] = await Promise.all([
      loadCatalog(),
      loadMetiers(),
      loadSecteurs(),
      loadBlocs(),
      loadFAQ()
    ]);

    renderShell(root);

    // Fill filters
    const countrySel = document.getElementById("ul-filter-country");
    const sectorSel = document.getElementById("ul-filter-sector");
    const searchInput = document.getElementById("ul-search-metier");
    const suggest = document.getElementById("ul-search-suggest");
    const countEl = document.getElementById("ul-count");

    // Countries
    const countries = (catalog || []).slice().sort((a,b) => String(a.label||"").localeCompare(String(b.label||""), "fr"));
    if (countrySel) {
      countrySel.innerHTML = "";
      countries.forEach(c => {
        const opt = document.createElement("option");
        opt.value = normalizeISO(c.iso);
        opt.textContent = `${getFlagEmoji(c.iso)} ${c.label || c.iso}`;
        if (normalizeISO(c.iso) === normalizeISO(params.iso)) opt.selected = true;
        countrySel.appendChild(opt);
      });
      countrySel.addEventListener("change", () => {
        const u = new URL(location.href);
        u.searchParams.set("country", normalizeISO(countrySel.value));
        location.href = u.toString();
      });
    }

    // Sectors
    const sectorList = (secteurs || []).map(s => {
      const f = s.fieldData || s.fields || s;
      return {
        id: String(s.id || f.id || f._id || f.slug || "").trim(),
        label: String(f.Nom || f.name || f.nom || f.label || f.Name || "").trim(),
        slug: String(s.slug || f.slug || "").trim(),
      };
    }).filter(x => x.label);

    if (sectorSel) {
      sectorSel.innerHTML = "";
      const all = document.createElement("option");
      all.value = "";
      all.textContent = "Tous les secteurs";
      sectorSel.appendChild(all);

      sectorList.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.slug || s.id || s.label;
        opt.textContent = s.label;
        if (params.sector && (params.sector === opt.value)) opt.selected = true;
        sectorSel.appendChild(opt);
      });

      sectorSel.addEventListener("change", () => {
        const u = new URL(location.href);
        const v = String(sectorSel.value||"").trim();
        if (v) u.searchParams.set("secteur", v); else u.searchParams.delete("secteur");
        location.href = u.toString();
      });
    }

    // Suggestions
    function openSuggest(){
      if (!suggest) return;
      suggest.style.display = "block";
    }
    function closeSuggest(){
      if (!suggest) return;
      suggest.style.display = "none";
    }
    if (searchInput && suggest) {
      const update = () => {
        const shown = buildSuggestions(suggest, metiers, searchInput.value);
        if (shown) openSuggest(); else closeSuggest();
      };
      searchInput.addEventListener("input", update);
      searchInput.addEventListener("focus", update);
      document.addEventListener("click", (e) => {
        if (!suggest.contains(e.target) && e.target !== searchInput) closeSuggest();
      });
    }

    // Reset
    const reset = document.getElementById("ul-reset");
    if (reset) {
      reset.addEventListener("click", (e) => {
        e.preventDefault();
        const u = new URL(location.href);
        u.searchParams.delete("secteur");
        u.searchParams.delete("sector");
        searchInput && (searchInput.value = "");
        closeSuggest();
        location.href = u.toString();
      });
    }

    // Count
    if (countEl) countEl.textContent = `${(metiers||[]).length} métiers`;

    // Back button
    const back = document.getElementById("ul-back");
    if (back) back.addEventListener("click", () => history.back());

    // Resolve metier + country meta
    const countryMeta = findCountry(catalog, params.iso) || { iso: params.iso, label: params.iso, langue_finale: "fr", banners: {} };
    const metierItem = findMetier(metiers, params.slug);

    if (!metierItem) {
      setText("ul-title", "Métier introuvable");
      setText("ul-tagline", "Vérifie le paramètre ?metier=SLUG");
      showCard("card-infos", true);
      setHTML("ul-infos", `<p><strong>ISO:</strong> ${esc(params.iso)}<br/><strong>Slug:</strong> ${esc(params.slug)}</p>`);
      setReady();
      return;
    }

    const f = metierItem.fieldData || metierItem.fields || metierItem;

    // Standard fields
    const name = String(f.Nom || f["Nom du métier"] || f.name || f.nom || "").trim() || params.slug;
    const accroche = String(f.accroche || f.Accroche || "").trim();
    const description = f.description || f.Description || "";
    const missions = f.missions || f.Missions || "";
    const competences = f["Compétences"] || f.competences || f.Competences || "";
    const environnements = f.environnements || f.Environnements || "";
    const profil = f.profil_recherche || f.profil || f["profil recherché"] || "";
    const evolutions = f.evolutions_possibles || f.evolutions || "";

    setText("ul-title", name);
    setText("ul-tagline", accroche);

    if (!isEmptyRich(description)) { showCard("card-overview", true); setHTML("ul-overview", description); }
    if (!isEmptyRich(missions)) { showCard("card-missions", true); setHTML("ul-missions", missions); }
    if (!isEmptyRich(competences)) { showCard("card-competences", true); setHTML("ul-competences", competences); }
    if (!isEmptyRich(environnements)) { showCard("card-environnements", true); setHTML("ul-environnements", environnements); }
    if (!isEmptyRich(profil)) { showCard("card-profil", true); setHTML("ul-profil", profil); }
    if (!isEmptyRich(evolutions)) { showCard("card-evolutions", true); setHTML("ul-evolutions", evolutions); }

    // Sponsor fields
    const sponsorName = String(f.sponsor_name || f.sponsor || f.Sponsor || "").trim();
    const sponsorWide = pickUrl(f.sponsor_logo_2);
    const sponsorSquare = pickUrl(f.sponsor_logo_1);
    const sponsorLink = pickLinkUrl(f.lien_sponsor);

    const previewWide = pickUrl(params.previewWide);
    const previewSquare = pickUrl(params.previewSquare);

    // Non-sponsor country banners
    const countryWide = pickUrl(countryMeta?.banners?.image_2 || countryMeta?.banners?.image2 || countryMeta?.banners?.wide || "");
    const countrySquare = pickUrl(countryMeta?.banners?.image_1 || countryMeta?.banners?.image1 || countryMeta?.banners?.square || "");

    const isSponsored = !!(sponsorName || sponsorLink || sponsorWide || sponsorSquare);

    // Wide banner: sponsored => sponsor_logo_2, else country wide
    const wideUrl = previewWide || (isSponsored ? sponsorWide : countryWide);
    const squareUrl = previewSquare || (isSponsored ? sponsorSquare : countrySquare);

    // Link: if sponsored and link exists => link; else non sponsor CTA => sponsorship
    let linkUrl = "";
    if (isSponsored && sponsorLink) linkUrl = sponsorLink;
    else linkUrl = `${NON_SPONSOR_CTA_URL}?country=${encodeURIComponent(params.iso)}&metier=${encodeURIComponent(params.slug)}`;

    // Sponsor card visibility:
    // - show always, but content depends on sponsored/non-sponsored
    showCard("card-sponsor", true);
    setText("ul-sponsorName", isSponsored ? (sponsorName || "Partenaire") : "Sponsoriser ce métier");
    setText("ul-sponsorSub", isSponsored ? "Partenaire du métier" : "Vous désirez sponsoriser ce métier ?");
    const btn = document.getElementById("ul-sponsorBtn");
    if (btn) btn.textContent = isSponsored ? "Découvrir" : "Sponsoriser";
    if (btn) btn.href = linkUrl;

    // Apply banner images (ONLY 1 img each; no background)
    applyBanner({
      wideUrl,
      squareUrl,
      linkUrl,
      wideAlt: isSponsored ? "Bannière sponsor" : "Bannière sponsorisation",
      squareAlt: isSponsored ? "Logo sponsor" : "Sponsoriser ce métier",
      wideEnabled: !!wideUrl,
      squareEnabled: !!squareUrl
    });

    // If sponsored but sponsor wide missing, do NOT fallback to country banner (avoid mixing sponsor & non-sponsor).
    // Instead hide wide banner and keep sidebar square if present.
    if (isSponsored && !previewWide && !sponsorWide) {
      // hide wide banner
      applyBanner({ wideUrl:"", squareUrl, linkUrl, wideEnabled:false, squareEnabled:!!squareUrl });
    }

    // Metier_pays_bloc (only render if record exists for this job+country)
    const blocRecords = filterBlocRecords(blocsAll, params.slug, params.iso);
    const bloc = blocRecords.length ? (blocRecords[0].fieldData || blocRecords[0].fields || blocRecords[0]) : null;

    if (bloc) {
      renderKpis(bloc);
      renderBlocsSection(bloc);
    } else {
      showCard("card-kpis", false);
    }

    // FAQ (only render if matching items exist)
    const lang = String(countryMeta.langue_finale || countryMeta.lang || "fr").toLowerCase();
    const faqItems = (faqAll || []).filter(r => matchFaqRecord(r, params.slug, params.iso, lang));
    renderFAQ(faqItems);

    // Infos
    showCard("card-infos", true);
    setHTML("ul-infos", `<p><strong>ISO:</strong> ${esc(params.iso)}<br/><strong>Slug:</strong> ${esc(params.slug)}<br/><strong>Lang:</strong> ${esc(lang)}</p>`);

    // SEO (optional)
    const metaTitle = String(f.meta_title || "").trim();
    const metaDesc  = String(f.meta_description || "").trim();
    const schemaLd  = String(f.schema_json_ld || f.schema_json_ld_id || "").trim();
    if (metaTitle) document.title = metaTitle;
    if (metaDesc) {
      let md = document.querySelector('meta[name="description"]');
      if (!md) { md = document.createElement("meta"); md.setAttribute("name","description"); document.head.appendChild(md); }
      md.setAttribute("content", metaDesc);
    }
    if (schemaLd && schemaLd.startsWith("{")) {
      let s = document.getElementById("ul-schema-ld");
      if (!s) { s = document.createElement("script"); s.type="application/ld+json"; s.id="ul-schema-ld"; document.head.appendChild(s); }
      s.textContent = schemaLd;
    }

    setReady();
  }

  boot().catch((e) => {
    console.error("[metier-page.v12] fatal", e);
    // keep page visible for debugging
    document.documentElement.classList.remove("ul-metier-pending");
  });
})();
