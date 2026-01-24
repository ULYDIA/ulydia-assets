/* metier-page.js — Ulydia — FIX34.1 (ROOT FIX + ALWAYS RENDER + MATCH + BANNERS)
   Critical fixes vs FIX34:
   - Detects BOTH root ids: #ulydia-metier-root and #ulydia-metier-root
   - Renders immediately (loading shell) so you never see a blank page
   - Logs a clear console line when running
   - Keeps robust matching + non-blocking worker banner fetch
*/

(() => {
  if (window.__ULYDIA_METIER_PAGE_FIX341__) return;
  window.__ULYDIA_METIER_PAGE_FIX341__ = true;

  const DEBUG = true; // keep true for now, you can set to false later
  const log = (...a) => DEBUG && console.log("[metier-page:FIX34.1]", ...a);

  // =========================
  // CONFIG — Worker (optional)
  // =========================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // =========================
  // Root (FIX)
  // =========================
  function getRoot() {
    return document.getElementById("ulydia-metier-root")
        || document.getElementById("ulydia-metier-root");
  }

  let ROOT = getRoot();
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
    log("root auto-created as #ulydia-metier-root");
  } else {
    log("root found:", "#" + ROOT.id);
  }

  // =========================
  // CSS
  // =========================
  function injectCSS() {
    if (document.getElementById("ul-metier-css-fix341")) return;
    const css = `
      :root{
        --ul-bg:#f6f8fb; --ul-card:#fff; --ul-text:#0f172a; --ul-muted:#64748b;
        --ul-border:#e6edf5; --ul-radius:16px; --ul-shadow:0 10px 30px rgba(15,23,42,.08);
        --ul-soft:#eef2ff; --ul-soft2:#f3f6ff;
      }
      #ulydia-metier-root, #ulydia-metier-root{ font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ul-text); }
      .ul-wrap{ background:var(--ul-bg); min-height:100vh; padding:18px 0 48px; }
      .ul-container{ width:min(1200px, calc(100% - 32px)); margin:0 auto; }
      .ul-header{ background:linear-gradient(180deg,#fff 0%, var(--ul-soft2) 100%); border:1px solid var(--ul-border); border-radius:var(--ul-radius); box-shadow:var(--ul-shadow); padding:18px; }
      .ul-pill{ display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:var(--ul-soft); color:#3730a3; font-weight:800; font-size:12px; }
      .ul-h1{ font-size:22px; margin:10px 0 6px; }
      .ul-sub{ margin:0; color:var(--ul-muted); font-size:13px; line-height:1.4; }
      .ul-grid{ display:grid; grid-template-columns: 2fr 1fr; gap:16px; margin-top:16px; }
      @media (max-width: 980px){ .ul-grid{ grid-template-columns:1fr; } }
      .ul-card{ background:var(--ul-card); border:1px solid var(--ul-border); border-radius:var(--ul-radius); box-shadow:var(--ul-shadow); padding:14px; }
      .ul-card h2{ font-size:14px; margin:0 0 10px; }
      .ul-muted{ color:var(--ul-muted); font-size:13px; }
      .ul-rich{ font-size:13px; color:#111827; line-height:1.55; }
      .ul-banner{ margin-top:14px; border-radius:14px; border:1px solid var(--ul-border); background:#fff; overflow:hidden; }
      .ul-banner img{ display:block; width:100%; height:auto; }
      .ul-banner-fallback{ padding:14px; background:var(--ul-soft); border-top:1px dashed #c7d2fe; display:flex; justify-content:space-between; gap:12px; }
      .ul-chips{ display:flex; flex-wrap:wrap; gap:8px; }
      .ul-chip{ display:inline-flex; align-items:center; padding:6px 10px; border-radius:999px; border:1px solid var(--ul-border); background:#fff; font-size:12px; color:#111827; }
      .ul-chip b{ margin-right:6px; color:var(--ul-muted); font-weight:800; }
      .ul-salary-row{ display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid var(--ul-border); }
      .ul-salary-row:last-child{ border-bottom:0; }
      .ul-error{ padding:14px; border-radius:14px; border:1px solid #fecaca; background:#fff1f2; color:#7f1d1d; }
      .ul-small{ font-size:12px; color:var(--ul-muted); }
    `;
    const style = document.createElement("style");
    style.id = "ul-metier-css-fix341";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function escapeHtml(s){
    return String(s || "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
  function normalize(s){
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function getParams(){
    const u = new URL(location.href);
    const metier = (u.searchParams.get("metier") || u.searchParams.get("slug") || "").trim();
    const iso = (u.searchParams.get("country") || u.searchParams.get("iso") || "").trim().toUpperCase();
    return { metier, iso };
  }
  function prettyFromSlug(slug){
    return String(slug||"").replace(/[-_]+/g," ").replace(/\b\w/g, c => c.toUpperCase());
  }
  function pickUrl(u){
    u = String(u || "").trim();
    if (!u) return "";
    if (u.startsWith("//")) return "https:" + u;
    return u;
  }
  function moneyRange(min, max, cur){
    const c = cur || "";
    if (min == null && max == null) return "—";
    if (min != null && max != null) return `${Number(min).toLocaleString("fr-FR")}–${Number(max).toLocaleString("fr-FR")} ${c}`.trim();
    if (min != null) return `≥ ${Number(min).toLocaleString("fr-FR")} ${c}`.trim();
    return `≤ ${Number(max).toLocaleString("fr-FR")} ${c}`.trim();
  }

  function renderLoading({ metier, iso }) {
    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-container">
          <div class="ul-header">
            <div class="ul-pill">Ulydia • Loading</div>
            <h1 class="ul-h1">${escapeHtml(prettyFromSlug(metier || "metier"))}</h1>
            <p class="ul-sub">Chargement des données (CMS + bannières)…</p>
            <div class="ul-banner">
              <div class="ul-banner-fallback">
                <div class="ul-small">metier=${escapeHtml(metier||"")} • iso=${escapeHtml(iso||"")}</div>
                <div class="ul-small">script=FIX34.1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderError(msg, details){
    ROOT.innerHTML = `
      <div class="ul-wrap"><div class="ul-container">
        <div class="ul-error">
          <div style="font-weight:900;margin-bottom:6px">metier-page.js (FIX34.1)</div>
          <div>${escapeHtml(msg || "Erreur inconnue")}</div>
          ${details ? `<pre style="white-space:pre-wrap;margin-top:10px">${escapeHtml(details)}</pre>` : ""}
        </div>
      </div></div>
    `;
  }

  function getAllBlocs(){ return Array.isArray(window.__ULYDIA_METIER_PAYS_BLOCS__) ? window.__ULYDIA_METIER_PAYS_BLOCS__ : []; }
  function getAllFaqs(){ return Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : []; }

  function findBlocBySlugISO(metierSlug, iso){
    const all = getAllBlocs();
    const slugNorm = normalize(metierSlug.replace(/[-_]+/g," "));
    return all.find(x => String(x?.iso||"").toUpperCase() === iso && normalize(x?.metier||"") === slugNorm) || null;
  }
  function findFaqsBySlugISO(metierSlug, iso){
    const all = getAllFaqs();
    const slugNorm = normalize(metierSlug.replace(/[-_]+/g," "));
    return all.filter(f => normalize(f?.metier||"") === slugNorm && (!f?.iso || String(f.iso).toUpperCase() === iso));
  }

  async function fetchBanners({ slug, iso }){
    if (!WORKER_URL) return null;
    try{
      const url = new URL(WORKER_URL.replace(/\/+$/,"") + "/v1/metier-page");
      url.searchParams.set("slug", slug);
      url.searchParams.set("iso", iso);

      const headers = {
        "accept":"application/json",
        "x-ulydia-proxy-secret": PROXY_SECRET,
        "x-proxy-secret": PROXY_SECRET
      };

      const res = await fetch(url.toString(), { method:"GET", headers, credentials:"omit" });
      const ct = (res.headers.get("content-type") || "");
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (!ct.includes("application/json")) throw new Error("Non-JSON response");
      return await res.json();
    }catch(e){
      log("banners fetch failed (non-fatal)", e);
      return null;
    }
  }

  function renderPage({ metierTitle, iso, bloc, banner }) {
    const chips = bloc?.chips || {};
    const currency = chips?.Currency || "";

    const sections = Array.isArray(bloc?.sections) ? bloc.sections : [];
    const mainCardsHtml = sections.length
      ? sections.map(s => `
          <div class="ul-card" style="margin-top:12px">
            <h2>${escapeHtml(s.label || s.key || "Section")}</h2>
            <div class="ul-rich">${s.type === "html" ? (s.value || "") : escapeHtml(s.value || "")}</div>
          </div>
        `).join("")
      : `<div class="ul-card"><h2>Contenu pays</h2><p class="ul-muted">Aucun bloc spécifique trouvé pour ce métier/pays (ou champs vides).</p></div>`;

    const chipItems = [
      chips.Status_generation ? `<span class="ul-chip"><b>Status</b>${escapeHtml(chips.Status_generation)}</span>` : "",
      chips.Remote_level ? `<span class="ul-chip"><b>Remote</b>${escapeHtml(chips.Remote_level)}</span>` : "",
      chips.Automation_risk ? `<span class="ul-chip"><b>Automation</b>${escapeHtml(chips.Automation_risk)}</span>` : "",
      chips.Currency ? `<span class="ul-chip"><b>Devise</b>${escapeHtml(chips.Currency)}</span>` : ""
    ].filter(Boolean).join("");

    const salary = bloc?.salary || {};
    const salHtml = `
      <div class="ul-salary-row"><div><b>Junior</b></div><div>${escapeHtml(moneyRange(salary?.junior?.min, salary?.junior?.max, currency))}</div></div>
      <div class="ul-salary-row"><div><b>Mid</b></div><div>${escapeHtml(moneyRange(salary?.mid?.min, salary?.mid?.max, currency))}</div></div>
      <div class="ul-salary-row"><div><b>Senior</b></div><div>${escapeHtml(moneyRange(salary?.senior?.min, salary?.senior?.max, currency))}</div></div>
      <div class="ul-salary-row"><div><b>Variable</b></div><div>${salary?.variable_share_pct != null ? escapeHtml(String(salary.variable_share_pct) + " %") : "—"}</div></div>
    `;

    const wideUrl = pickUrl(banner?.wide || "");
    const wideLink = pickUrl(banner?.link || "");

    const bannerHtml = wideUrl
      ? `
        <div class="ul-banner">
          <a href="${escapeHtml(wideLink || "#")}" ${wideLink ? `target="_blank" rel="noopener"` : `onclick="return false;"`}>
            <img src="${escapeHtml(wideUrl)}" alt="Bannière sponsorisation" loading="lazy" />
          </a>
          <div class="ul-banner-fallback">
            <div class="ul-small">${escapeHtml(banner?.kind === "sponsor" ? "Bannière sponsor" : "Bannière attente sponsorisation")}</div>
            <div class="ul-small">${escapeHtml(banner?.debug || "")}</div>
          </div>
        </div>
      `
      : `
        <div class="ul-banner">
          <div class="ul-banner-fallback">
            <div class="ul-small">Bannière non disponible</div>
            <div class="ul-small">${escapeHtml(banner?.debug || "")}</div>
          </div>
        </div>
      `;

    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-container">
          <div class="ul-header">
            <div class="ul-pill">Fiche métier</div>
            <h1 class="ul-h1">${escapeHtml(metierTitle)}</h1>
            <p class="ul-sub">iso=${escapeHtml(iso)} • script=FIX34.1</p>
            ${bannerHtml}
          </div>

          <div class="ul-grid">
            <div>${mainCardsHtml}</div>

            <div>
              <div class="ul-card">
                <h2>Indicateurs</h2>
                <div class="ul-chips">${chipItems || `<span class="ul-muted">Aucun KPI.</span>`}</div>
                ${!bloc ? `<div style="margin-top:10px" class="ul-small">⚠️ Aucun record Metier_Pays_Bloc trouvé (matching slug/name).</div>` : ``}
              </div>

              <div class="ul-card" style="margin-top:12px">
                <h2>Salaires</h2>
                ${salHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function main(){
    injectCSS();
    const { metier, iso } = getParams();
    renderLoading({ metier, iso });

    if (!metier || !iso) {
      renderError("Paramètres manquants", "Attendu: /metier?metier=SLUG&country=FR");
      return;
    }

    // wait briefly for CMS readers
    const start = Date.now();
    while (Date.now() - start < 1200) {
      if (window.__ULYDIA_METIER_PAYS_BLOCS__ || window.__ULYDIA_FAQS__) break;
      await new Promise(r => setTimeout(r, 50));
    }

    const bloc = findBlocBySlugISO(metier, iso);

    // banners (non-blocking with timeout)
    let banner = { kind:"none", wide:"", link:"", debug:"worker timeout/disabled" };
    const workerData = await Promise.race([
      fetchBanners({ slug: metier, iso }),
      new Promise(res => setTimeout(() => res(null), 1200))
    ]);

    if (workerData && workerData.ok) {
      const sponsor = workerData?.metier?.sponsor || workerData?.sponsor || null;
      const pays = workerData?.pays || null;

      const sponsorWide = pickUrl(sponsor?.logo_2 || sponsor?.logo_wide || sponsor?.wide || "");
      const sponsorLink = pickUrl(sponsor?.link || sponsor?.website || sponsor?.url || "");
      const fallbackWide = pickUrl(pays?.banners?.wide || pays?.banner?.wide || "");

      if (sponsorWide) banner = { kind:"sponsor", wide:sponsorWide, link:sponsorLink||"", debug:"worker sponsor wide" };
      else if (fallbackWide) banner = { kind:"fallback", wide:fallbackWide, link:"", debug:"worker fallback wide" };
      else banner = { kind:"none", wide:"", link:"", debug:"worker ok but no banner url" };
    } else {
      banner = { kind:"none", wide:"", link:"", debug:"worker not used / timeout / error" };
    }

    log("params", { metier, iso });
    log("bloc?", !!bloc, bloc);
    log("banner", banner);

    renderPage({ metierTitle: prettyFromSlug(metier), iso, bloc, banner });
  }

  main().catch(e => {
    console.error("[metier-page:FIX34.1] fatal", e);
    renderError("Crash JS", String(e && (e.stack || e.message || e)));
  });
})();
