/* metier-page.js — Ulydia — FIX32 SAFE
   - Zéro page blanche : affiche toujours un layout minimal
   - Lit metier + country depuis URL: /metier?metier=SLUG&country=FR (ou iso=FR)
   - Consomme:
     window.__ULYDIA_METIER_PAYS_BLOCS__
     window.__ULYDIA_FAQS__
*/

(() => {
  if (window.__ULYDIA_METIER_PAGE_FIX32__) return;
  window.__ULYDIA_METIER_PAGE_FIX32__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // ----------------------------
  // Root
  // ----------------------------
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
  }

  // ----------------------------
  // CSS (propal-like)
  // ----------------------------
  function injectCSS() {
    if (document.getElementById("ul-metier-css")) return;
    const css = `
      :root{
        --ul-bg:#f6f8fb;
        --ul-card:#ffffff;
        --ul-text:#0f172a;
        --ul-muted:#64748b;
        --ul-border:#e6edf5;
        --ul-radius:16px;
        --ul-shadow:0 10px 30px rgba(15,23,42,.08);
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
        background:#eef2ff; color:#3730a3; font-weight:600; font-size:12px;
      }
      .ul-header{
        background:linear-gradient(180deg,#ffffff 0%, #f3f6ff 100%);
        border:1px solid var(--ul-border); border-radius:var(--ul-radius); box-shadow:var(--ul-shadow);
        padding:18px;
      }
      .ul-h1{ font-size:22px; margin:0 0 6px; }
      .ul-sub{ margin:0; color:var(--ul-muted); font-size:13px; line-height:1.4; }
      .ul-banner{
        margin-top:14px; border-radius:14px; border:1px dashed #c7d2fe; background:#eef2ff;
        padding:14px; display:flex; align-items:center; justify-content:center; min-height:64px;
      }
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
      .ul-chip b{ margin-right:6px; color:var(--ul-muted); font-weight:600; }
      .ul-salary-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid var(--ul-border); }
      .ul-salary-row:last-child{ border-bottom:0; }
      .ul-salary-label{ font-weight:700; font-size:12px; color:#0f172a; }
      .ul-salary-val{ font-size:12px; color:#0f172a; white-space:nowrap; }
      .ul-accordion{ border-top:1px solid var(--ul-border); }
      .ul-qa{ border-bottom:1px solid var(--ul-border); padding:10px 0; }
      .ul-q{ display:flex; justify-content:space-between; gap:12px; cursor:pointer; user-select:none; }
      .ul-q span{ font-weight:700; font-size:13px; }
      .ul-a{ display:none; margin-top:8px; }
      .ul-qa.open .ul-a{ display:block; }
      .ul-error{ padding:14px; border-radius:14px; border:1px solid #fecaca; background:#fff1f2; color:#7f1d1d; }
    `;
    const style = document.createElement("style");
    style.id = "ul-metier-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ----------------------------
  // Helpers
  // ----------------------------
  function escapeHtml(s){
    return String(s || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function getParams(){
    const u = new URL(location.href);
    const metier = (u.searchParams.get("metier") || u.searchParams.get("slug") || "").trim();
    const iso = (u.searchParams.get("country") || u.searchParams.get("iso") || "").trim().toUpperCase();
    return { metier, iso };
  }

  function niceTitleFromSlug(slug){
    if (!slug) return "";
    return slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function findBloc(metierName, iso){
    const all = Array.isArray(window.__ULYDIA_METIER_PAYS_BLOCS__) ? window.__ULYDIA_METIER_PAYS_BLOCS__ : [];
    if (!metierName || !iso) return null;
    // match strict (case-insensitive on metier)
    const m = metierName.trim().toLowerCase();
    return all.find(x =>
      String(x?.iso || "").toUpperCase() === iso &&
      String(x?.metier || "").trim().toLowerCase() === m
    ) || null;
  }

  function findFaqs(metierName, iso){
    const all = Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : [];
    const m = (metierName || "").trim().toLowerCase();
    return all.filter(x => {
      const okMetier = String(x?.metier||"").trim().toLowerCase() === m;
      const okIso = !iso || !x?.iso || String(x.iso).toUpperCase() === iso;
      return okMetier && okIso;
    });
  }

  function moneyRange(min, max, cur){
    const c = cur || "";
    if (min == null && max == null) return "—";
    if (min != null && max != null) return `${min.toLocaleString("fr-FR")}–${max.toLocaleString("fr-FR")} ${c}`.trim();
    if (min != null) return `≥ ${min.toLocaleString("fr-FR")} ${c}`.trim();
    return `≤ ${max.toLocaleString("fr-FR")} ${c}`.trim();
  }

  // ----------------------------
  // Render
  // ----------------------------
  function renderShell({ metierTitle, iso, bloc, faqs }) {
    const chips = bloc?.chips || {};
    const currency = chips?.Currency || "";

    const sections = Array.isArray(bloc?.sections) ? bloc.sections : [];

    // Column main: cards in order, only if non-empty
    const mainCardsHtml = sections.length
      ? sections.map(s => `
          <div class="ul-card ul-section">
            <h2>${escapeHtml(s.label || s.key || "Section")}</h2>
            <div class="ul-rich">${s.type === "html" ? (s.value || "") : escapeHtml(s.value || "")}</div>
          </div>
        `).join("")
      : `<div class="ul-card"><h2>Contenu pays</h2><p class="ul-muted">Aucun bloc spécifique n’a été trouvé pour ce métier et ce pays (ou les champs ne sont pas encore remplis).</p></div>`;

    // Sidebar chips
    const chipItems = [
      chips.Remote_level ? `<span class="ul-chip"><b>Remote</b>${escapeHtml(chips.Remote_level)}</span>` : "",
      chips.Automation_risk ? `<span class="ul-chip"><b>Automation</b>${escapeHtml(chips.Automation_risk)}</span>` : "",
      chips.Status_generation ? `<span class="ul-chip"><b>Status</b>${escapeHtml(chips.Status_generation)}</span>` : "",
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
                  <span class="ul-muted">+</span>
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

    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-container">
          <div class="ul-topbar">
            <div class="ul-filters">
              <span class="ul-pill">Pays: ${escapeHtml(iso || "—")}</span>
              <input class="ul-input" id="ul-search" placeholder="Rechercher un métier…" />
            </div>
          </div>

          <div class="ul-header">
            <div class="ul-pill">Fiche métier</div>
            <h1 class="ul-h1">${escapeHtml(metierTitle || "Métier")}</h1>
            <p class="ul-sub">Page générée par Ulydia (full-code). Les sections affichées dépendent des données disponibles pour le pays sélectionné.</p>

            <div class="ul-banner">
              <div class="ul-muted">Bannière sponsor / attente sponsorisation (rendu dans FIX suivant)</div>
            </div>
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

    // accordion
    ROOT.querySelectorAll(".ul-qa .ul-q").forEach(q => {
      q.addEventListener("click", () => q.closest(".ul-qa")?.classList.toggle("open"));
    });
  }

  function renderError(msg, details){
    ROOT.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-container">
          <div class="ul-error">
            <div style="font-weight:800;margin-bottom:6px">metier-page.js a rencontré un problème</div>
            <div>${escapeHtml(msg || "Erreur inconnue")}</div>
            ${details ? `<pre style="white-space:pre-wrap;margin-top:10px">${escapeHtml(details)}</pre>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  // ----------------------------
  // Main
  // ----------------------------
  async function main(){
    injectCSS();

    const { metier, iso } = getParams();
    if (!metier || !iso) {
      renderError("Paramètres manquants", "Attendu: /metier?metier=SLUG&country=FR");
      return;
    }

    // title = slug pretty (pour l’instant, on branchera sur data metier ensuite)
    const metierTitle = niceTitleFromSlug(metier);

    // attendre un peu les CMS readers (sans bloquer)
    const start = Date.now();
    while (Date.now() - start < 1200) {
      // si au moins l’un des deux est prêt, on continue
      if (window.__ULYDIA_METIER_PAYS_BLOCS__ || window.__ULYDIA_FAQS__) break;
      await new Promise(r => setTimeout(r, 50));
    }

    // bloc match par Name — donc ici metierTitle (si ton Name diffère, on ajustera dans FIX suivant)
    // IMPORTANT: si ton "Name" Webflow n'est pas le slug prettifié, il faut faire correspondre avec un mapping.
    // Ici: fallback: essaie match sur title puis sur slug prettifié.
    const tryNames = [
      metierTitle,
      metierTitle.toLowerCase(),
      metier // parfois tu mets le slug en Name
    ];

    let bloc = null;
    for (const name of tryNames) {
      bloc = findBloc(name, iso);
      if (bloc) break;
    }

    // faqs
    let faqs = [];
    for (const name of tryNames) {
      const f = findFaqs(name, iso);
      if (f && f.length) { faqs = f; break; }
    }

    log("params", { metier, iso, metierTitle });
    log("bloc?", !!bloc, bloc);
    log("faqs", faqs.length);

    renderShell({ metierTitle, iso, bloc, faqs });
  }

  main().catch(e => {
    console.error("[metier-page] fatal", e);
    renderError("Crash JS", String(e && (e.stack || e.message || e)));
  });
})();
