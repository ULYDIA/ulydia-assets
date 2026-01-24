/* metier-page.js — Ulydia — FIX34 (SAFE + MATCH + BANNERS)
   Goals:
   - Never blank page (renders shell + errors in-page)
   - Robust matching slug ↔ Name (accents/case/punct)
   - Renders Metier_Pays_Blocs sections + KPI chips + salary
   - Tries to fetch sponsor/fallback banners from Worker (/v1/metier-page) but never blocks UI
   URL expected:
     /metier?metier=controleur-aerien&country=FR
     (also supports ?slug=... and ?iso=FR)
*/

(() => {
  if (window.__ULYDIA_METIER_PAGE_FIX34__) return;
  window.__ULYDIA_METIER_PAGE_FIX34__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page:FIX34]", ...a);

  // =========================
  // CONFIG — Worker (optional)
  // =========================
  // If you don't want banners via Worker, set WORKER_URL = "".
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // =========================
  // Root
  // =========================
  let ROOT = document.getElementById("ulydia-metier-root") || document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  // =========================
  // CSS (propal-like)
  // =========================
  function injectCSS() {
    if (document.getElementById("ul-metier-css-fix34")) return;
    const css = `
      :root{
        --ul-bg:#f6f8fb;
        --ul-card:#ffffff;
        --ul-text:#0f172a;
        --ul-muted:#64748b;
        --ul-border:#e6edf5;
        --ul-radius:16px;
        --ul-shadow:0 10px 30px rgba(15,23,42,.08);
        --ul-soft:#eef2ff;
        --ul-soft2:#f3f6ff;
      }
      #ulydia-metier-root{ font-family: Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ul-text); }
      .ul-wrap{ background:var(--ul-bg); min-height:100vh; padding:18px 0 48px; }
      .ul-container{ width:min(1200px, calc(100% - 32px)); margin:0 auto; }
      .ul-topbar{ display:flex; gap:12px; align-items:center; justify-content:space-between; padding:10px 0 16px; }
      .ul-filters{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .ul-select,.ul-input{
        height:40px; border:1px solid var(--ul-border); background:#fff; border-radius:10px;
        padding:0 12px; font-size:14px; outline:none;
      }
      .ul-input{ min-width:280px; }
      .ul-pill{
        display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px;
        background:var(--ul-soft); color:#3730a3; font-weight:700; font-size:12px;
      }
      .ul-header{
        background:linear-gradient(180deg,#ffffff 0%, var(--ul-soft2) 100%);
        border:1px solid var(--ul-border); border-radius:var(--ul-radius); box-shadow:var(--ul-shadow);
        padding:18px;
      }
      .ul-h1{ font-size:22px; margin:0 0 6px; }
      .ul-sub{ margin:0; color:var(--ul-muted); font-size:13px; line-height:1.4; }
      .ul-banner{
        margin-top:14px; border-radius:14px; border:1px solid var(--ul-border); background:#fff;
        overflow:hidden;
      }
      .ul-banner a{ display:block; text-decoration:none; }
      .ul-banner img{ display:block; width:100%; height:auto; }
      .ul-banner-fallback{
        padding:14px; background:var(--ul-soft); border-top:1px dashed #c7d2fe;
        display:flex; align-items:center; justify-content:space-between; gap:12px;
      }
      .ul-banner-note{ color:var(--ul-muted); font-size:12px; }
      .ul-grid{ display:grid; grid-template-columns: 2fr 1fr; gap:16px; margin-top:16px; }
      @media (max-width: 980px){ .ul-grid{ grid-template-columns:1fr; } .ul-input{ min-width:200px; } }
      .ul-card{
        background:var(--ul-card); border:1px solid var(--ul-border); border-radius:var(--ul-radius);
        box-shadow:var(--ul-shadow); padding:14px;
      }
      .ul-card h2{ font-size:14px; margin:0 0 10px; }
      .ul-muted{ color:var(--ul-muted); font-size:13px; }
      .ul-section{ margin-top:12px; }
      .ul-section-title{ font-size:13px; margin:0 0 8px; }
      .ul-rich{ font-size:13px; color:#111827; line-height:1.55; }
      .ul-rich p{ margin:8px 0; }
      .ul-chips{ display:flex; flex-wrap:wrap; gap:8px; }
      .ul-chip{
        display:inline-flex; align-items:center; padding:6px 10px; border-radius:999px;
        border:1px solid var(--ul-border); background:#fff; font-size:12px; color:#111827;
      }
      .ul-chip b{ margin-right:6px; color:var(--ul-muted); font-weight:700; }
      .ul-salary-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid var(--ul-border); }
      .ul-salary-row:last-child{ border-bottom:0; }
      .ul-salary-label{ font-weight:800; font-size:12px; color:#0f172a; }
      .ul-salary-val{ font-size:12px; color:#0f172a; white-space:nowrap; }
      .ul-accordion{ border-top:1px solid var(--ul-border); }
      .ul-qa{ border-bottom:1px solid var(--ul-border); padding:10px 0; }
      .ul-q{ display:flex; justify-content:space-between; gap:12px; cursor:pointer; user-select:none; }
      .ul-q span{ font-weight:800; font-size:13px; }
      .ul-a{ display:none; margin-top:8px; }
      .ul-qa.open .ul-a{ display:block; }
      .ul-error{ padding:14px; border-radius:14px; border:1px solid #fecaca; background:#fff1f2; color:#7f1d1d; }
      .ul-small{ font-size:12px; color:var(--ul-muted); }
      .ul-two{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
      @media (max-width: 980px){ .ul-two{ grid-template-columns:1fr; } }
    `;
    const style = document.createElement("style");
    style.id = "ul-metier-css-fix34";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // =========================
  // Utilities
  // =========================
  function escapeHtml(s){
    return String(s || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function normalize(s){
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getParams(){
    const u = new URL(location.href);
    const metier = (u.searchParams.get("metier") || u.searchParams.get("slug") || "").trim();
    const iso = (u.searchParams.get("country") || u.searchParams.get("iso") || "").trim().toUpperCase();
    return { metier, iso };
  }

  function prettyFromSlug(slug){
    if (!slug) return "";
    return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function moneyRange(min, max, cur){
    const c = cur || "";
    if (min == null && max == null) return "—";
    if (min != null && max != null) return `${Number(min).toLocaleString("fr-FR")}–${Number(max).toLocaleString("fr-FR")} ${c}`.trim();
    if (min != null) return `≥ ${Number(min).toLocaleString("fr-FR")} ${c}`.trim();
    return `≤ ${Number(max).toLocaleString("fr-FR")} ${c}`.trim();
  }

  // =========================
  // CMS data access
  // =========================
  function getAllBlocs(){
    return Array.isArray(window.__ULYDIA_METIER_PAYS_BLOCS__) ? window.__ULYDIA_METIER_PAYS_BLOCS__ : [];
  }

  function getAllFaqs(){
    return Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : [];
  }

  function findBlocBySlugISO(metierSlug, iso){
    const all = getAllBlocs();
    if (!metierSlug || !iso) return null;
    const slugNorm = normalize(metierSlug.replace(/[-_]+/g, " "));
    return all.find(x =>
      String(x?.iso || "").toUpperCase() === iso &&
      normalize(x?.metier || "") === slugNorm
    ) || null;
  }

  function findFaqsBySlugISO(metierSlug, iso){
    const all = getAllFaqs();
    const slugNorm = normalize(metierSlug.replace(/[-_]+/g, " "));
    return all.filter(f => {
      const okMetier = normalize(f?.metier || "") === slugNorm;
      const okIso = !iso || !f?.iso || String(f.iso).toUpperCase() === iso;
      return okMetier && okIso;
    });
  }

  // =========================
  // Worker fetch (optional)
  // =========================
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
      const data = await res.json();
      return data;
    }catch(e){
      log("banners fetch failed (non-fatal)", e);
      return null;
    }
  }

  function pickUrl(u){
    u = String(u || "").trim();
    if (!u) return "";
    if (u.startsWith("//")) return "https:" + u;
    return u;
  }

  // =========================
  // Render
  // =========================
  function renderError(msg, details){
    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-container">
          <div class="ul-error">
            <div style="font-weight:900;margin-bottom:6px">metier-page.js (FIX34)</div>
            <div>${escapeHtml(msg || "Erreur inconnue")}</div>
            ${details ? `<pre style="white-space:pre-wrap;margin-top:10px">${escapeHtml(details)}</pre>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  function renderShell({ metierTitle, iso, bloc, faqs, banner }) {
    const chips = bloc?.chips || {};
    const currency = chips?.Currency || "";

    const sections = Array.isArray(bloc?.sections) ? bloc.sections : [];
    const hasSections = sections.length > 0;

    const mainCardsHtml = hasSections
      ? sections.map(s => `
          <div class="ul-card ul-section">
            <h2>${escapeHtml(s.label || s.key || "Section")}</h2>
            <div class="ul-rich">${s.type === "html" ? (s.value || "") : escapeHtml(s.value || "")}</div>
          </div>
        `).join("")
      : `<div class="ul-card"><h2>Contenu pays</h2><p class="ul-muted">Aucun bloc spécifique n’a été trouvé pour ce métier et ce pays (ou les champs ne sont pas encore remplis).</p></div>`;

    const chipItems = [
      chips.Status_generation ? `<span class="ul-chip"><b>Status</b>${escapeHtml(chips.Status_generation)}</span>` : "",
      chips.Remote_level ? `<span class="ul-chip"><b>Remote</b>${escapeHtml(chips.Remote_level)}</span>` : "",
      chips.Automation_risk ? `<span class="ul-chip"><b>Automation</b>${escapeHtml(chips.Automation_risk)}</span>` : "",
      chips.Currency ? `<span class="ul-chip"><b>Devise</b>${escapeHtml(chips.Currency)}</span>` : ""
    ].filter(Boolean).join("");

    const salary = bloc?.salary || {};
    const salHtml = `
      <div class="ul-salary-row">
        <div class="ul-salary-label">Junior</div>
        <div class="ul-salary-val">${escapeHtml(moneyRange(salary?.junior?.min, salary?.junior?.max, currency))}</div>
      </div>
      <div class="ul-salary-row">
        <div class="ul-salary-label">Mid</div>
        <div class="ul-salary-val">${escapeHtml(moneyRange(salary?.mid?.min, salary?.mid?.max, currency))}</div>
      </div>
      <div class="ul-salary-row">
        <div class="ul-salary-label">Senior</div>
        <div class="ul-salary-val">${escapeHtml(moneyRange(salary?.senior?.min, salary?.senior?.max, currency))}</div>
      </div>
      <div class="ul-salary-row">
        <div class="ul-salary-label">Variable</div>
        <div class="ul-salary-val">${salary?.variable_share_pct != null ? escapeHtml(String(salary.variable_share_pct) + " %") : "—"}</div>
      </div>
    `;

    const faqHtml = (faqs && faqs.length)
      ? `
        <div class="ul-card">
          <h2>Questions fréquentes</h2>
          <div class="ul-accordion">
            ${faqs.map((f,i)=>`
              <div class="ul-qa" data-i="${i}">
                <div class="ul-q">
                  <span>${escapeHtml(f.question)}</span>
                  <span class="ul-small">+</span>
                </div>
                <div class="ul-a">
                  <div class="ul-rich">${(String(f.answer||"").includes("<") ? (f.answer||"") : escapeHtml(f.answer||""))}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `
      : `<div class="ul-card"><h2>Questions fréquentes</h2><p class="ul-muted">Aucune FAQ pour ce métier (pour l’instant).</p></div>`;

    // Banner block
    const wideUrl = pickUrl(banner?.wide || "");
    const wideLink = pickUrl(banner?.link || "");
    const bannerHtml = wideUrl
      ? `
        <div class="ul-banner">
          <a href="${escapeHtml(wideLink || "#")}" ${wideLink ? `target="_blank" rel="noopener"` : `onclick="return false;"`}>
            <img src="${escapeHtml(wideUrl)}" alt="Bannière sponsorisation" loading="lazy" />
          </a>
          <div class="ul-banner-fallback">
            <div class="ul-banner-note">
              ${banner?.kind === "sponsor" ? "Bannière sponsor (clic → sponsor)." : "Bannière attente sponsorisation (fallback pays/langue)."}
            </div>
            <div class="ul-small">${escapeHtml(banner?.debug || "")}</div>
          </div>
        </div>
      `
      : `
        <div class="ul-banner">
          <div class="ul-banner-fallback">
            <div class="ul-banner-note">Bannière non disponible (worker indisponible ou URLs manquantes).</div>
            <div class="ul-small">${escapeHtml(banner?.debug || "")}</div>
          </div>
        </div>
      `;

    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-container">
          <div class="ul-topbar">
            <div class="ul-filters">
              <span class="ul-pill">Pays: ${escapeHtml(iso || "—")}</span>
              <span class="ul-pill">Métier: ${escapeHtml(metierTitle || "—")}</span>
            </div>
          </div>

          <div class="ul-header">
            <div class="ul-pill">Fiche métier</div>
            <h1 class="ul-h1">${escapeHtml(metierTitle || "Métier")}</h1>
            <p class="ul-sub">Page générée par Ulydia. Sections = données spécifiques pays si disponibles.</p>
            ${bannerHtml}
          </div>

          <div class="ul-grid">
            <div>
              ${mainCardsHtml}
              <div style="margin-top:16px">${faqHtml}</div>
            </div>

            <div>
              <div class="ul-card">
                <h2>Indicateurs</h2>
                <div class="ul-chips">${chipItems || `<span class="ul-muted">Aucun KPI renseigné.</span>`}</div>
                ${(!bloc ? `<div style="margin-top:10px" class="ul-small">Note: aucun record Metier_Pays_Bloc trouvé pour ce métier/pays.</div>` : ``)}
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

    ROOT.querySelectorAll(".ul-qa .ul-q").forEach(q => {
      q.addEventListener("click", () => q.closest(".ul-qa")?.classList.toggle("open"));
    });
  }

  // =========================
  // Main
  // =========================
  async function main(){
    injectCSS();

    const { metier, iso } = getParams();
    if (!metier || !iso) {
      renderError("Paramètres manquants", "Attendu: /metier?metier=SLUG&country=FR");
      return;
    }

    // Wait briefly for CMS readers (non-blocking)
    const start = Date.now();
    while (Date.now() - start < 1200) {
      if (window.__ULYDIA_METIER_PAYS_BLOCS__ || window.__ULYDIA_FAQS__) break;
      await new Promise(r => setTimeout(r, 50));
    }

    const metierTitle = prettyFromSlug(metier);

    const bloc = findBlocBySlugISO(metier, iso);
    const faqs = findFaqsBySlugISO(metier, iso);

    // Banner: try Worker (non-blocking, but we will await with short timeout)
    let banner = { kind:"fallback", wide:"", link:"", debug:"" };

    const workerPromise = fetchBanners({ slug: metier, iso });
    let workerData = null;

    // Hard timeout 1200ms
    workerData = await Promise.race([
      workerPromise,
      new Promise(res => setTimeout(() => res(null), 1200))
    ]);

    if (workerData && workerData.ok) {
      // expected structure (best-effort)
      const sponsor = workerData?.metier?.sponsor || workerData?.sponsor || null;
      const pays = workerData?.pays || null;

      // sponsor wide
      const sponsorWide = pickUrl(sponsor?.logo_2 || sponsor?.logo_wide || sponsor?.wide || "");
      const sponsorLink = pickUrl(sponsor?.link || sponsor?.website || sponsor?.url || "");
      const fallbackWide = pickUrl(pays?.banners?.wide || pays?.banner?.wide || "");

      if (sponsorWide) {
        banner = {
          kind: "sponsor",
          wide: sponsorWide,
          link: sponsorLink || "",
          debug: "worker: sponsor wide"
        };
      } else if (fallbackWide) {
        banner = {
          kind: "fallback",
          wide: fallbackWide,
          link: "",
          debug: "worker: fallback wide"
        };
      } else {
        banner = { kind:"none", wide:"", link:"", debug:"worker ok but no banner url" };
      }
    } else {
      banner = { kind:"none", wide:"", link:"", debug:"worker not used / timeout / error" };
    }

    log("params", { metier, iso });
    log("bloc", bloc);
    log("faqs", faqs.length);
    log("banner", banner);

    renderShell({ metierTitle, iso, bloc, faqs, banner });
  }

  main().catch(e => {
    console.error("[metier-page:FIX34] fatal", e);
    renderError("Crash JS", String(e && (e.stack || e.message || e)));
  });
})();
