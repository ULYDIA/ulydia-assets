/* ============================================================
   ULYDIA — METIER PAGE (FULL RENDER)
   v11.9 — renders everything into #ulydia-metier-root
============================================================ */
(() => {
  if (window.__ULYDIA_METIER_V119__) return;
  window.__ULYDIA_METIER_V119__ = true;

  // ---------- SAFE READY/PENDING ----------
  function setReady(){
    try{
      document.documentElement.classList.remove("ul-metier-pending");
      document.documentElement.classList.add("ul-metier-ready");
    }catch(e){}
  }
  function setPending(){
    try{
      document.documentElement.classList.add("ul-metier-pending");
      document.documentElement.classList.remove("ul-metier-ready");
    }catch(e){}
  }

  // never allow permanent blank
  setTimeout(setReady, 2500);

  // ---------- CONFIG ----------
  const WORKER_URL = "https://ulydia-business.contact-871.workers.dev";
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a)=>{ if(DEBUG) console.log("[metier-page.v11.9]", ...a); };

  // ---------- HELPERS ----------
  const qs = (k)=> new URLSearchParams(location.search).get(k);
  const pickStr = (v)=> (typeof v === "string" && v.trim()) ? v.trim() : "";
  const pickUrl = (v)=> {
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "object") return pickStr(v.url || v.src || v.href);
    return "";
  };

  async function fetchJSON(url){
    const r = await fetch(url, { credentials:"omit" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  // ---------- ROOT ----------
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT){
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  // ---------- CSS ----------
  function injectCSS(){
    if (document.getElementById("ul-metier-css")) return;
    const st = document.createElement("style");
    st.id = "ul-metier-css";
    st.textContent = `
      #ulydia-metier-root{ font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; }
      .ul-wrap{ max-width:1180px; margin:0 auto; padding:24px 20px 60px; }
      .ul-top{ display:flex; align-items:center; justify-content:space-between; gap:16px; }
      .ul-brand{ display:flex; align-items:center; gap:12px; }
      .ul-brand img{ height:52px; width:auto; }
      .ul-actions{ font-size:13px; color:#2563eb; display:flex; gap:10px; }
      .ul-actions a{ color:inherit; text-decoration:none; }
      .ul-actions a:hover{ text-decoration:underline; }

      .ul-filters{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px; margin:18px 0 10px; }
      .ul-filter{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:12px 12px; box-shadow:0 10px 30px rgba(15,23,42,.06); }
      .ul-filter label{ display:block; font-size:12px; color:#334155; margin-bottom:6px; font-weight:600; }
      .ul-filter select,.ul-filter input{
        width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:10px 10px; outline:none;
        font-family:inherit; font-size:14px;
      }

      .ul-hero{ margin-top:14px; display:grid; grid-template-columns: 84px 1fr; gap:16px; align-items:flex-start; }
      .ul-back{ width:84px; height:84px; border-radius:22px; background: linear-gradient(145deg,#7c3aed,#4f46e5); display:flex; align-items:center; justify-content:center; color:#fff; font-size:30px; user-select:none; }
      .ul-kicker{ display:inline-flex; gap:8px; align-items:center; padding:6px 10px; border:1px solid #c7d2fe; border-radius:10px; background:#eef2ff; font-size:12px; font-weight:600; color:#4338ca; }
      .ul-h1{ margin:10px 0 6px; font-size:54px; line-height:1.03; letter-spacing:-.02em; }
      .ul-tagline{ margin:0; font-size:22px; color:#64748b; font-weight:600; }

      .ul-bannerWide{ margin:18px auto 0; max-width:720px; border-radius:18px; overflow:hidden; box-shadow:0 14px 45px rgba(15,23,42,.10); background:#fff; }
      .ul-bannerWide a{ display:block; }
      .ul-bannerWide img{ display:block; width:100%; height:auto; }

      .ul-grid{ margin-top:22px; display:grid; grid-template-columns: 1.6fr .9fr; gap:18px; }
      .ul-card{ background:#fff; border:1px solid #e5e7eb; border-radius:18px; box-shadow:0 12px 40px rgba(15,23,42,.06); overflow:hidden; }
      .ul-card-h{ padding:14px 16px; font-weight:800; display:flex; align-items:center; gap:10px; border-bottom:1px solid #eef2f7; }
      .ul-card-b{ padding:16px; color:#0f172a; font-size:15px; line-height:1.6; }
      .ul-muted{ color:#64748b; }

      .ul-side .ul-card{ margin-bottom:14px; }
      .ul-sponsorBox{ display:grid; gap:10px; }
      .ul-sponsorSquare{ border-radius:14px; overflow:hidden; border:1px solid #e5e7eb; background:#fff; }
      .ul-sponsorSquare img{ display:block; width:100%; height:auto; }
      .ul-cta{ display:inline-flex; align-items:center; justify-content:center; padding:10px 14px; border-radius:12px; background:#4f46e5; color:#fff; text-decoration:none; font-weight:800; font-size:13px; }
      .ul-cta:hover{ filter:brightness(.96); }

      .ul-hide{ display:none !important; }
      .ul-rich p{ margin:0 0 12px; }
      .ul-rich ul{ margin:0 0 12px 18px; }
      .ul-rich li{ margin:6px 0; }
    `;
    document.head.appendChild(st);
  }

  // ---------- SHELL ----------
  function renderShell(){
    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-top">
          <div class="ul-brand">
            <img src="https://cdn.prod.website-files.com/6942b6d9dc4d5a360322b0dd/6942b6d9dc4d5a360322b0dd_Logo%20Ulydia.png" alt="Ulydia">
          </div>
          <div class="ul-actions">
            <a href="/my-account">Sponsor Dashboard</a>
            <a href="/logout">Log out</a>
          </div>
        </div>

        <!-- Filters (UI only; wiring later) -->
        <div class="ul-filters">
          <div class="ul-filter">
            <label>🌍 Pays / Région</label>
            <select id="ulCountry"><option value="FR">France</option></select>
          </div>
          <div class="ul-filter">
            <label>🗂️ Secteur d'activité</label>
            <select id="ulSector"><option value="">Tous les secteurs</option></select>
          </div>
          <div class="ul-filter">
            <label>🔎 Rechercher un métier</label>
            <input id="ulSearch" placeholder="Ex: Développeur, Designer, Chef de projet..." />
          </div>
        </div>

        <div class="ul-hero">
          <div class="ul-back" title="Retour">‹›</div>
          <div>
            <div class="ul-kicker">💼 Fiche Métier</div>
            <div class="ul-h1" id="ulTitle">Chargement…</div>
            <p class="ul-tagline" id="ulTagline"></p>
          </div>
        </div>

        <div class="ul-bannerWide ul-hide" id="ulBannerWide"></div>

        <div class="ul-grid">
          <div class="ul-main">
            <div class="ul-card" id="secOverview">
              <div class="ul-card-h">📄 Vue d'ensemble</div>
              <div class="ul-card-b ul-rich" id="ulOverview"></div>
            </div>

            <div class="ul-card ul-hide" id="secMissions">
              <div class="ul-card-h">✅ Missions principales</div>
              <div class="ul-card-b ul-rich" id="ulMissions"></div>
            </div>

            <div class="ul-card ul-hide" id="secSkills">
              <div class="ul-card-h">🧠 Compétences clés</div>
              <div class="ul-card-b ul-rich" id="ulSkills"></div>
            </div>

            <div class="ul-card ul-hide" id="secEnv">
              <div class="ul-card-h">🧩 Environnements de travail</div>
              <div class="ul-card-b ul-rich" id="ulEnv"></div>
            </div>

            <div class="ul-card ul-hide" id="secProfile">
              <div class="ul-card-h">🧑‍💼 Profil recherché</div>
              <div class="ul-card-b ul-rich" id="ulProfile"></div>
            </div>

            <div class="ul-card ul-hide" id="secEvo">
              <div class="ul-card-h">📈 Évolutions possibles</div>
              <div class="ul-card-b ul-rich" id="ulEvo"></div>
            </div>

            <!-- Country-specific blocks: hidden by default -->
            <div class="ul-card ul-hide" id="secPaysBloc">
              <div class="ul-card-h">🌍 Informations locales</div>
              <div class="ul-card-b" id="ulPaysBloc"></div>
            </div>

            <div class="ul-card ul-hide" id="secFAQ">
              <div class="ul-card-h">❓ Questions fréquentes</div>
              <div class="ul-card-b" id="ulFAQ"></div>
            </div>
          </div>

          <div class="ul-side ul-side">
            <div class="ul-card" id="sideSponsor">
              <div class="ul-card-h">🤝 Partenaire</div>
              <div class="ul-card-b">
                <div class="ul-sponsorBox">
                  <div class="ul-sponsorSquare ul-hide" id="ulBannerSquare"></div>
                  <div class="ul-muted" id="ulSponsorName"></div>
                  <a class="ul-cta ul-hide" id="ulSponsorCTA" target="_blank" rel="noopener">Découvrir</a>
                </div>
              </div>
            </div>

            <div class="ul-card">
              <div class="ul-card-h">ℹ️ Infos</div>
              <div class="ul-card-b ul-muted" id="ulInfos"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- DATA APPLY ----------
  function setHTML(id, val){
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = val || "";
  }
  function show(id){
    const el = document.getElementById(id);
    if (el) el.classList.remove("ul-hide");
  }
  function hide(id){
    const el = document.getElementById(id);
    if (el) el.classList.add("ul-hide");
  }

  function applySponsorFromMetierFields(fields){
    const wide = pickUrl(fields.sponsor_logo_2);
    const square = pickUrl(fields.sponsor_logo_1);
    const link = pickStr(fields.lien_sponsor);
    const name = pickStr(fields.sponsor_name);

    // reset to avoid double images
    const wideBox = document.getElementById("ulBannerWide");
    const sqBox = document.getElementById("ulBannerSquare");
    const cta = document.getElementById("ulSponsorCTA");
    const nm = document.getElementById("ulSponsorName");
    if (nm) nm.textContent = name || "";

    if (wideBox){
      wideBox.innerHTML = "";
      if (wide){
        const img = document.createElement("img");
        img.src = wide;
        img.alt = name || "";
        if (link){
          const a = document.createElement("a");
          a.href = link; a.target="_blank"; a.rel="noopener";
          a.appendChild(img);
          wideBox.appendChild(a);
        } else {
          wideBox.appendChild(img);
        }
        show("ulBannerWide");
      } else {
        hide("ulBannerWide");
      }
    }

    if (sqBox){
      sqBox.innerHTML = "";
      if (square){
        const img = document.createElement("img");
        img.src = square;
        img.alt = name || "";
        sqBox.appendChild(img);
        show("ulBannerSquare");
      } else {
        hide("ulBannerSquare");
      }
    }

    if (cta){
      if (link){
        cta.href = link;
        show("ulSponsorCTA");
      } else {
        hide("ulSponsorCTA");
      }
    }

    return { hasSponsor: !!(wide || square), sponsorLink: link };
  }

  function applyFallbackBannerFromCountry(pays){
    // only if no sponsor wide is set
    const wideBox = document.getElementById("ulBannerWide");
    if (!wideBox) return;

    const alreadyHas = wideBox.querySelector("img");
    if (alreadyHas) return;

    const img1 = pickUrl(pays?.banners?.image_1);
    const img2 = pickUrl(pays?.banners?.image_2);

    // In your catalog: image_2 often is wide. We'll try image_2 first.
    const wide = img2 || img1;
    if (!wide) return;

    wideBox.innerHTML = "";
    const img = document.createElement("img");
    img.src = wide;
    img.alt = "";
    wideBox.appendChild(img);
    show("ulBannerWide");
  }

  function matchPaysBloc(blocs, slug, iso){
    if (!Array.isArray(blocs) || !slug || !iso) return null;
    const norm = (s)=> String(s||"").trim().toLowerCase();

    return blocs.find(b => {
      const cc = (b.country_code || b.code_iso || "").toUpperCase();
      if (cc && cc !== iso.toUpperCase()) return false;

      const js = norm(b.job_slug || b.slug || "");
      if (js && js === norm(slug)) return true;

      const m = b.metier_lie || b["métier lié"] || b.metier || null;
      if (m && typeof m === "object"){
        const ms = norm(m.slug || m.Slug || m.name || "");
        if (ms && ms === norm(slug)) return true;
      }
      return false;
    }) || null;
  }

  function applyFAQ(faqs){
    if (!Array.isArray(faqs) || !faqs.length) { hide("secFAQ"); return; }
    // simple list rendering
    const out = faqs.map(x => {
      const q = pickStr(x.question || x.Question || x.fieldData?.Question);
      const a = (x.reponse || x.Réponse || x.fieldData?.["Réponse"] || "");
      if (!q || !a) return "";
      return `
        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:12px 12px; margin:0 0 10px;">
          <div style="font-weight:800; margin-bottom:6px;">${q}</div>
          <div class="ul-rich">${a}</div>
        </div>
      `;
    }).filter(Boolean).join("");
    if (!out) { hide("secFAQ"); return; }
    setHTML("ulFAQ", out);
    show("secFAQ");
  }

  function applyMetier(payload, slug, iso){
    const fields = payload?.metier?.fieldData || payload?.metier?.fields || payload?.metier || {};

    const nom = pickStr(fields.Nom || fields["Nom du métier"] || fields.name);
    const accroche = pickStr(fields.accroche);
    const description = fields.description || "";
    const missions = fields.missions || "";
    const competences = fields.Compétences || fields.competences || "";
    const environnements = fields.environnements || "";
    const profil = fields.profil_recherche || "";
    const evo = fields.evolutions_possibles || "";

    document.getElementById("ulTitle").textContent = nom || slug || "Fiche métier";
    document.getElementById("ulTagline").textContent = accroche || "";

    setHTML("ulOverview", description || "<span class='ul-muted'>—</span>");

    if (missions) { setHTML("ulMissions", missions); show("secMissions"); } else hide("secMissions");
    if (competences) { setHTML("ulSkills", competences); show("secSkills"); } else hide("secSkills");
    if (environnements) { setHTML("ulEnv", environnements); show("secEnv"); } else hide("secEnv");
    if (profil) { setHTML("ulProfile", profil); show("secProfile"); } else hide("secProfile");
    if (evo) { setHTML("ulEvo", evo); show("secEvo"); } else hide("secEvo");

    // Sponsor first, then fallback
    const { hasSponsor } = applySponsorFromMetierFields(fields);
    if (!hasSponsor) {
      applyFallbackBannerFromCountry(payload?.pays);
    }

    // Pays bloc ONLY if matching record exists
    const bloc = matchPaysBloc(payload?.metier_pays_blocs, slug, iso);
    if (bloc) {
      // We do NOT render all fields here; only prove presence safely.
      // You can extend later field by field.
      const safe = `<div class="ul-muted">Données locales disponibles pour ${iso}. (Record trouvé)</div>`;
      setHTML("ulPaysBloc", safe);
      show("secPaysBloc");
    } else {
      hide("secPaysBloc");
    }

    // FAQ
    applyFAQ(payload?.faqs || []);

    // Infos
    const infos = [
      `ISO: <b>${iso}</b>`,
      `Slug: <b>${slug}</b>`
    ].join("<br>");
    setHTML("ulInfos", infos);
  }

  // ---------- BOOT ----------
  async function boot(){
    setPending();
    injectCSS();
    renderShell();

    const slug = qs("metier") || qs("slug") || "";
    const iso = (qs("country") || qs("iso") || "FR").toUpperCase();
    if (!slug) throw new Error("Missing ?metier=SLUG");

    const api = `${WORKER_URL}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
    log("fetch", api);
    const payload = await fetchJSON(api);
    log("payload keys", Object.keys(payload||{}));

    applyMetier(payload, slug, iso);
  }

  boot().catch(err => {
    console.error("[metier-page.v11.9] fatal", err);
    // show something minimal instead of blank
    try{
      ROOT.innerHTML = `<div style="font-family:Montserrat;padding:24px">
        <b>Erreur metier-page.js</b><br><span style="color:#64748b">${String(err && err.message || err)}</span>
      </div>`;
    }catch(e){}
  }).finally(setReady);

})();
