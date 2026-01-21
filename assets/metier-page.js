/* metier-page.js — Ulydia (V5.2)
   - Cascading search: Country → Sector → Job
   - Default country from visitor (IPinfo) + country.langue_finale drives sector language (if available)
   - Job list filtered by selected sector (+ search box)
   - Detail view: /metier?metier=SLUG&country=XX
     - Sponsor banner if sponsored, else fallback non-sponsored banners by country language
   - Safe/idempotent
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V52__) return;
  window.__ULYDIA_METIER_PAGE_V52__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier-page.v5.2]", ...a); };

  const WORKER_URL   = window.ULYDIA_WORKER_URL   || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "";
  const IPINFO_TOKEN = window.ULYDIA_IPINFO_TOKEN || "";

  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const debounce = (fn, ms=150) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  function lastScriptById(id){
    const all = qsa(`script#${CSS.escape(id)}`);
    return all.length ? all[all.length - 1] : null;
  }
  function readJsonScript(id, fallback=[]){
    const el = lastScriptById(id);
    if (!el) return fallback;
    try { return JSON.parse(el.textContent || "[]") || fallback; }
    catch(e){ log("bad json in", id, e); return fallback; }
  }

  function getURLParams(){
    const u = new URL(location.href);
    const metier = (u.searchParams.get("metier") || u.searchParams.get("slug") || "").trim();
    const country = (u.searchParams.get("country") || u.searchParams.get("iso") || "").trim().toUpperCase();
    return { metier, country };
  }

  function pick(obj, keys){
    for (const k of keys){
      if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
    }
    return "";
  }

  async function detectVisitorISO(){
    const u = new URL(location.href);
    const forced = u.searchParams.get("country") || u.searchParams.get("iso");
    if (forced) return String(forced).toUpperCase();

    if (!IPINFO_TOKEN) return "";
    try{
      const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`, { cache: "no-store" });
      if (!r.ok) return "";
      const j = await r.json();
      return String(j?.country || "").toUpperCase();
    }catch(e){
      return "";
    }
  }

  async function fetchMetierMeta({ slug, iso }){
    const url = new URL(WORKER_URL.replace(/\/$/, "") + "/v1/metier-page");
    url.searchParams.set("slug", slug);
    url.searchParams.set("iso", iso);
    const headers = {};
    if (PROXY_SECRET) {
      headers["x-proxy-secret"] = PROXY_SECRET;
      headers["x-ulydia-proxy-secret"] = PROXY_SECRET;
    }
    const r = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!r.ok) throw new Error("metier meta fetch failed: " + r.status);
    return await r.json();
  }

  function ensureRoot(){
    let root = document.getElementById("ulydia-metier-root");
    if (!root){
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.prepend(root);
    }
    return root;
  }

  function hideCmsScaffolding(){
    qsa('[data-ul-hide-cms="1"], .ulydia-hide-cms, [data-metier-cms="1"]').forEach(el => {
      el.style.display = "none";
    });
  }

  function injectCSS(){
    if (document.getElementById("ulydia-metier-css-v52")) return;
    const css = document.createElement("style");
    css.id = "ulydia-metier-css-v52";
    css.textContent = `
      #ulydia-metier-root{ font-family: var(--ul-font, Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial); }
      .ul-wrap{ max-width: 1060px; margin: 0 auto; padding: 28px 18px 80px; }
      .ul-card{ background: var(--ul-surface, #fff); border: 1px solid var(--ul-border, #e7e7ee); border-radius: 16px; box-shadow: var(--ul-shadow, 0 14px 40px rgba(20,20,30,.06)); }
      .ul-card.pad{ padding: 18px; }
      .ul-h1{ font-size: 30px; letter-spacing: -0.02em; margin: 0 0 10px; color: var(--ul-text, #0f172a); }
      .ul-muted{ color: var(--ul-muted, #64748b); font-size: 14px; }
      .ul-grid{ display:grid; grid-template-columns: 1.25fr .75fr; gap: 18px; align-items:start; }
      @media (max-width: 920px){ .ul-grid{ grid-template-columns: 1fr; } }
      .ul-row{ display:flex; gap: 12px; flex-wrap: wrap; }
      .ul-field{ display:flex; flex-direction:column; gap: 6px; min-width: 220px; flex: 1; }
      .ul-label{ font-size: 12px; color: var(--ul-muted, #64748b); }
      .ul-input, .ul-select{
        height: 44px; padding: 0 12px; border-radius: 12px;
        border: 1px solid var(--ul-border, #e7e7ee);
        background: #fff; font-size: 14px; outline: none;
      }
      .ul-input:focus, .ul-select:focus{ border-color: var(--ul-primary, #c00102); box-shadow: 0 0 0 3px rgba(192,1,2,.12); }
      .ul-divider{ height: 1px; background: var(--ul-border, #e7e7ee); margin: 14px 0; }
      .ul-list{ display:flex; flex-direction:column; gap: 10px; margin-top: 14px; }
      .ul-item{ display:flex; justify-content:space-between; gap: 12px; align-items:center; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--ul-border, #e7e7ee); background:#fff; }
      .ul-item:hover{ border-color: rgba(192,1,2,.35); }
      .ul-item h3{ margin:0; font-size: 16px; }
      .ul-item p{ margin: 2px 0 0; font-size: 13px; color: var(--ul-muted, #64748b); }
      .ul-btn{
        display:inline-flex; align-items:center; gap:8px;
        padding: 10px 12px; border-radius: 12px;
        border: 1px solid var(--ul-border, #e7e7ee);
        background: #fff; cursor: pointer;
        font-weight: 600; font-size: 13px;
      }
      .ul-banner-wide{ width: 680px; max-width: 100%; height: 120px; border-radius: 14px; overflow:hidden; border: 1px solid var(--ul-border, #e7e7ee); background:#f6f7fb; }
      .ul-banner-wide img{ width:100%; height:100%; object-fit: cover; display:block; }
      .ul-banner-square{ width: 100%; aspect-ratio: 1/1; border-radius: 16px; overflow:hidden; border: 1px solid var(--ul-border, #e7e7ee); background:#f6f7fb; }
      .ul-banner-square img{ width:100%; height:100%; object-fit: cover; display:block; }
      .ul-section-title{ margin: 0 0 10px; font-size: 16px; }
      .ul-rich p{ line-height: 1.6; margin: 0 0 10px; }
      .ul-badges{ display:flex; gap:8px; flex-wrap:wrap; margin-top: 10px; }
      .ul-badge{ font-size: 12px; padding: 6px 10px; border-radius: 999px; border: 1px solid var(--ul-border, #e7e7ee); background:#fff; color: var(--ul-text, #0f172a); }
    `;
    document.head.appendChild(css);
  }

  function renderShell(root){
    root.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-card pad" id="ul-search-card">
          <div class="ul-row">
            <div class="ul-field">
              <div class="ul-label">Country</div>
              <select class="ul-select" id="ulCountry"></select>
            </div>
            <div class="ul-field">
              <div class="ul-label">Sector</div>
              <select class="ul-select" id="ulSector" disabled></select>
            </div>
            <div class="ul-field" style="min-width:260px">
              <div class="ul-label">Job</div>
              <input class="ul-input" id="ulSearch" placeholder="Search a job (e.g., Directeur financier)" disabled />
            </div>
          </div>
          <div class="ul-divider"></div>
          <div class="ul-muted" id="ulHint">Choose a country, then a sector, then a job.</div>
          <div class="ul-list" id="ulResults"></div>
        </div>

        <div style="height: 16px"></div>

        <div id="ulDetail"></div>
      </div>
    `;
  }

  function optionHtml(value, label){
    return `<option value="${esc(value)}">${esc(label || value)}</option>`;
  }

  function buildCountrySelect(countries){
    const opts = [optionHtml("", "Select a country")];
    for (const c of countries){
      const iso = String(pick(c, ["iso","ISO","code","country"]) || "").toUpperCase();
      if (!iso) continue;
      const name = pick(c, ["name","nom","label","pays"]) || iso;
      opts.push(optionHtml(iso, name));
    }
    return opts.join("");
  }

  function computeLangFinal(country){
    return String(pick(country, ["langue_finale","langFinal","lang","language"]) || "").toLowerCase();
  }

  function buildSectorOptions(sectors, langFinal){
    const filtered = sectors.filter(s => {
      const sLang = String(pick(s, ["lang","language","langue"]) || "").toLowerCase();
      return !sLang || !langFinal || sLang === langFinal;
    });
    const seen = new Set();
    const out = [];
    for (const s of filtered){
      const slug = String(pick(s, ["slug","id","value"]) || "").trim();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const name = pick(s, ["name","nom","label","title"]) || slug;
      out.push({ slug, name });
    }
    out.sort((a,b)=>a.name.localeCompare(b.name, "fr", { sensitivity:"base" }));
    return out;
  }

  function normalizeMetiers(metiers){
    return (metiers || []).map(m => {
      const slug = String(pick(m, ["slug","id"]) || "").trim();
      const secteur = String(pick(m, ["secteur","sector","secteur_slug"]) || "").trim();
      const name = pick(m, ["name","nom","title","titre"]) || slug;
      return { slug, secteur, name: String(name) };
    }).filter(x => x.slug);
  }

  function filterMetiers(metiers, { secteurSlug, q }){
    const qq = String(q || "").toLowerCase().trim();
    return metiers.filter(m => {
      if (secteurSlug && m.secteur !== secteurSlug) return false;
      if (!qq) return true;
      return m.name.toLowerCase().includes(qq) || m.slug.toLowerCase().includes(qq);
    }).slice(0, 80);
  }

  function renderResults(listEl, items, { iso }){
    if (!items.length){
      listEl.innerHTML = `<div class="ul-muted" style="padding:10px 2px">No results.</div>`;
      return;
    }
    listEl.innerHTML = items.map(m => `
      <div class="ul-item">
        <div>
          <h3>${esc(m.name)}</h3>
          <p>${esc(m.slug)}</p>
        </div>
        <button class="ul-btn" data-open="${esc(m.slug)}">Open →</button>
      </div>
    `).join("");
    listEl.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", () => {
        const slug = btn.getAttribute("data-open") || "";
        if (!slug) return;
        const url = new URL(location.origin + "/metier");
        url.searchParams.set("metier", slug);
        if (iso) url.searchParams.set("country", iso);
        location.href = url.toString();
      });
    });
  }

  function setBanner(el, imgUrl, linkUrl){
    if (!el) return;
    const safeImg = String(imgUrl || "").trim();
    const safeLink = String(linkUrl || "").trim();
    el.innerHTML = safeImg ? `<img alt="" src="${esc(safeImg)}" />` : "";
    if (safeLink){
      el.style.cursor = "pointer";
      el.onclick = () => window.open(safeLink, "_blank", "noopener");
    } else {
      el.style.cursor = "default";
      el.onclick = null;
    }
  }

  function renderDetail(detailRoot, { metierObj, iso, meta }){
    if (!metierObj){
      detailRoot.innerHTML = "";
      return;
    }

    const title = metierObj.name || metierObj.slug;
    const desc = String(pick(meta?.metier, ["description","desc"]) || "").trim();

    const sponsor = meta?.sponsor || meta?.meta?.sponsor || null;
    const pays = meta?.pays || meta?.country || null;

    const sponsorLink = sponsor ? (pick(sponsor, ["link","url","website"]) || "") : "";
    const wideUrl = sponsor
      ? (pick(sponsor, ["logo_2","logo_wide","wide","banner_wide"]) || "")
      : (pays ? pick(pays?.banners, ["wide","banner_wide","logo_2"]) : "");
    const squareUrl = sponsor
      ? (pick(sponsor, ["logo_1","logo_square","square","banner_square"]) || "")
      : (pays ? pick(pays?.banners, ["square","banner_square","logo_1"]) : "");

    detailRoot.innerHTML = `
      <div class="ul-grid">
        <div class="ul-card pad">
          <div class="ul-muted" style="margin-bottom:6px">${esc(iso || "")}</div>
          <h1 class="ul-h1">${esc(title)}</h1>

          <div style="margin: 10px 0 14px">
            <div class="ul-banner-wide" id="ulWide"></div>
          </div>

          <div class="ul-divider"></div>

          <h2 class="ul-section-title">Overview</h2>
          <div class="ul-rich">
            ${desc ? `<p>${esc(desc)}</p>` : `<p class="ul-muted">No description yet.</p>`}
          </div>

          <div id="ulBlocs"></div>
          <div id="ulFaq"></div>
        </div>

        <div class="ul-card pad">
          <h2 class="ul-section-title">Sponsor</h2>
          <div class="ul-banner-square" id="ulSquare"></div>
          <div class="ul-muted" style="margin-top:10px">
            ${sponsor ? "Sponsored content" : "Non-sponsored banner (language-based fallback)"}
          </div>
        </div>
      </div>
    `;

    setBanner(qs("#ulWide", detailRoot), wideUrl, sponsorLink);
    setBanner(qs("#ulSquare", detailRoot), squareUrl, sponsorLink);
  }

  async function main(){
    injectCSS();

    // IMPORTANT: keep CMS wrappers visible in Designer, but hide them on the real page
    hideCmsScaffolding();

    const root = ensureRoot();
    renderShell(root);

    const countries = readJsonScript("countriesData", []);
    const sectors   = readJsonScript("sectorsData", []);
    const metiers   = normalizeMetiers(readJsonScript("metiersData", []));

    log("cms loaded", { countries: countries.length, sectors: sectors.length, metiers: metiers.length });

    const elCountry = qs("#ulCountry", root);
    const elSector  = qs("#ulSector", root);
    const elSearch  = qs("#ulSearch", root);
    const elResults = qs("#ulResults", root);
    const elDetail  = qs("#ulDetail", root);
    const elHint    = qs("#ulHint", root);

    const { metier: paramMetier, country: paramCountry } = getURLParams();

    let iso = paramCountry || (await detectVisitorISO()) || "";
    if (!iso && countries.length) iso = String(pick(countries[0], ["iso","ISO","code"]) || "").toUpperCase();

    elCountry.innerHTML = buildCountrySelect(countries);
    elCountry.value = iso || "";

    let langFinal = "";
    let sectorOptions = [];
    let selectedSector = "";

    function refreshSectors(){
      iso = String(elCountry.value || "").toUpperCase();
      const c = countries.find(x => String(pick(x, ["iso","ISO","code","country"]) || "").toUpperCase() === iso) || null;
      langFinal = computeLangFinal(c);
      sectorOptions = buildSectorOptions(sectors, langFinal);

      elSector.innerHTML = optionHtml("", "Select a sector") + sectorOptions.map(s => optionHtml(s.slug, s.name)).join("");
      elSector.disabled = false;
      elSector.value = selectedSector && sectorOptions.some(s=>s.slug===selectedSector) ? selectedSector : "";

      if (!elSector.value){
        elSearch.value = "";
        elSearch.disabled = true;
        elResults.innerHTML = "";
        elHint.textContent = "Select a sector to see jobs.";
      } else {
        elSearch.disabled = false;
        elHint.textContent = "Search and select a job to open the detail page.";
      }
    }

    function refreshJobs(){
      selectedSector = String(elSector.value || "");
      if (!selectedSector){
        elSearch.disabled = true;
        elResults.innerHTML = "";
        elHint.textContent = "Select a sector to see jobs.";
        return;
      }
      elSearch.disabled = false;
      const list = filterMetiers(metiers, { secteurSlug: selectedSector, q: elSearch.value });
      renderResults(elResults, list, { iso });
      elHint.textContent = list.length ? "Select a job to open the detail page (banner + blocs + FAQ)." : "No jobs found for this sector.";
    }

    elCountry.addEventListener("change", () => {
      selectedSector = "";
      refreshSectors();
      refreshJobs();
    });
    elSector.addEventListener("change", () => refreshJobs());
    elSearch.addEventListener("input", debounce(()=>refreshJobs(), 120));

    refreshSectors();
    refreshJobs();

    if (paramMetier && iso){
      try{
        const meta = await fetchMetierMeta({ slug: paramMetier, iso });
        const metierObj = metiers.find(m => m.slug === paramMetier) || { slug: paramMetier, name: paramMetier, secteur: "" };
        renderDetail(elDetail, { metierObj, iso, meta });
      }catch(e){
        console.error("[metier-page.v5.2] detail fetch failed", e);
      }
    }
  }

  main().catch(e => console.error("[metier-page.v5.2] fatal", e));
})();