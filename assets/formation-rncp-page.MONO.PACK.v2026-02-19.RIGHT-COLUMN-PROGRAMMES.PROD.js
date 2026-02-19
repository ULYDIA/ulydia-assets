/**
 * ULYDIA — Formation RNCP page (MONO) with RIGHT column "Écoles & programmes"
 * Version: v2026-02-19.RIGHT-COLUMN-PROGRAMMES.PROD
 *
 * Requires:
 *  - window.__ULYDIA_WORKER_BASE__ set BEFORE this script, e.g.:
 *      <script>window.__ULYDIA_WORKER_BASE__="https://ulydia-data.contact-871.workers.dev";</script>
 *
 * Works on:
 *  - /formation?iso=FR&id=23864&slug=...
 *  - /formation/fr/<slug>-23864   (via front-router rewrite)
 *
 * Data:
 *  - GET {WORKER_BASE}/v1/formation-rncp?id=...&iso=...
 */

(function () {
  if (window.__ULYDIA_FORMATION_RNCP_V20260219__) return;
  window.__ULYDIA_FORMATION_RNCP_V20260219__ = true;

  const WORKER_BASE = (window.__ULYDIA_WORKER_BASE__ || "").replace(/\/$/, "");
  if (!WORKER_BASE) {
    console.warn("[ULYDIA] Missing window.__ULYDIA_WORKER_BASE__");
    return;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getParams() {
    const u = new URL(location.href);

    // Prefer query params (Webflow /formation)
    let iso = (u.searchParams.get("iso") || "").toUpperCase();
    let id = u.searchParams.get("id") || "";
    let slug = u.searchParams.get("slug") || "";

    // Fallback: SEO path /formation/<lang>/<slug>-<id>
    if (!id) {
      const m = u.pathname.match(/^\/formation\/([a-z]{2})\/(.+)-(\d+)$/i);
      if (m) {
        iso = (m[1] || "FR").toUpperCase();
        slug = m[2] || "";
        id = m[3] || "";
      }
    }

    if (!iso) iso = "FR";
    return { iso, id, slug };
  }

  function injectCSS() {
    if (document.getElementById("ulydia-formation-css-v20260219")) return;
    const css = document.createElement("style");
    css.id = "ulydia-formation-css-v20260219";
    css.textContent = `
      :root{
        --u-bg:#f5f7ff;
        --u-card:#ffffff;
        --u-text:#111827;
        --u-muted:#6b7280;
        --u-border:#e5e7eb;
        --u-shadow:0 10px 30px rgba(17,24,39,.08);
        --u-radius:18px;
      }
      body{ background:var(--u-bg); }
      .u-wrap{ max-width:1060px; margin:0 auto; padding:28px 18px 70px; }
      .u-hero{ background:var(--u-card); border-radius:24px; box-shadow:var(--u-shadow); padding:22px 22px 18px; }
      .u-hero-top{ font-size:12px; color:var(--u-muted); font-weight:700; letter-spacing:.04em; }
      .u-title{ margin:8px 0 14px; font-size:32px; line-height:1.08; font-weight:900; color:var(--u-text); }
      .u-tags{ display:flex; gap:10px; flex-wrap:wrap; }
      .u-tag{ display:inline-flex; align-items:center; gap:8px; border:1px solid var(--u-border); border-radius:999px; padding:8px 12px; background:#fff; font-size:12px; color:#111827; font-weight:800; }
      .u-tag b{ font-weight:900; }
      .u-grid{ display:grid; grid-template-columns: 1.35fr .85fr; gap:18px; margin-top:18px; align-items:start; }
      .u-col{ display:flex; flex-direction:column; gap:18px; }
      .u-card{ background:var(--u-card); border-radius:var(--u-radius); box-shadow:var(--u-shadow); padding:18px; }
      .u-card h3{ margin:0 0 10px; font-size:16px; font-weight:900; color:var(--u-text); }
      .u-card p{ margin:0; color:var(--u-text); font-size:14px; line-height:1.65; }
      .u-kv{ display:flex; align-items:center; justify-content:space-between; padding:12px 12px; border-radius:12px; border:1px solid #eef0f6; background:#fbfcff; margin-top:10px; }
      .u-kv span{ color:var(--u-muted); font-weight:700; font-size:13px; }
      .u-kv b{ color:var(--u-text); font-weight:900; font-size:13px; }
      .u-bullets{ margin:0; padding-left:18px; color:var(--u-text); font-size:14px; line-height:1.55; }
      .u-bullets li{ margin:6px 0; }
      .u-prog{ display:flex; flex-direction:column; gap:10px; }
      .u-prog-card{ border:1px solid #eef0f6; background:#fff; border-radius:14px; padding:12px; display:grid; grid-template-columns: 44px 1fr; gap:10px; }
      .u-logo{ width:44px; height:44px; border-radius:12px; background:#f3f4f6; overflow:hidden; display:flex; align-items:center; justify-content:center; }
      .u-logo img{ width:100%; height:100%; object-fit:cover; }
      .u-prog-title{ margin:0; font-size:13px; font-weight:900; color:var(--u-text); line-height:1.25; }
      .u-prog-meta{ margin-top:4px; font-size:12px; color:var(--u-muted); font-weight:700; display:flex; flex-wrap:wrap; gap:8px; }
      .u-pill{ display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:999px; border:1px solid #e9ecf6; background:#fbfcff; }
      .u-cta{ margin-top:10px; display:flex; justify-content:flex-end; }
      .u-btn{ appearance:none; border:1px solid #e6e9f5; background:#111827; color:#fff; border-radius:12px; padding:10px 12px; font-weight:900; font-size:12px; text-decoration:none; }
      .u-btn:hover{ filter:brightness(1.05); }
      .u-note{ font-size:12px; color:var(--u-muted); margin-top:8px; }
      @media (max-width: 900px){
        .u-grid{ grid-template-columns:1fr; }
      }
    `;
    document.head.appendChild(css);
  }

  function ensureRoot() {
    injectCSS();
    // Replace only main content; keep navbar/header from Webflow if present.
    let mount = document.getElementById("ulydia-formation-root");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "ulydia-formation-root";
      // put it after the first section if present, else at end of body
      const first = document.querySelector("main") || document.body;
      first.appendChild(mount);
    }
    return mount;
  }

  function formatMoney(amount, currency) {
    if (amount == null || amount === "") return "";
    const n = Number(amount);
    if (!isFinite(n)) return String(amount);
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${Math.round(n)} ${currency || ""}`.trim();
    }
  }

  function programmeCard(p) {
    const company = p.companies || p.company || null;
    const name = company?.name || p.school_name || p.ecole_name || "École";
    const logo = company?.logo_url || p.logo_url || "";
    const city = p.city_name || "";
    const iso = p.country_iso || "";
    const dur = p.duration_months ? `${p.duration_months} mois` : "";
    const tuition = p.tuition_amount ? formatMoney(p.tuition_amount, p.tuition_currency) : "";
    const sponsored = p.is_sponsored ? `<span class="u-pill">⭐ Sponsor</span>` : "";

    // programme page url: /programme/<uuid> or /programme/<slug> (you can adapt later)
    const href = p.slug ? `/programme/${encodeURIComponent(p.slug)}` : (p.id ? `/programme/${encodeURIComponent(p.id)}` : "#");

    const metaBits = [city, iso, dur, tuition].filter(Boolean).map(x => `<span class="u-pill">${esc(x)}</span>`).join("");

    return `
      <div class="u-prog-card">
        <div class="u-logo">${logo ? `<img src="${esc(logo)}" alt="${esc(name)}">` : ""}</div>
        <div>
          <p class="u-prog-title">${esc(p.title || p.name || "Programme")}</p>
          <div class="u-prog-meta">
            <span class="u-pill">${esc(name)}</span>
            ${sponsored}
            ${metaBits}
          </div>
          <div class="u-cta">
            <a class="u-btn" href="${esc(href)}">Voir le programme</a>
          </div>
        </div>
      </div>
    `;
  }

  function render({ rncp, programmes, iso, id }) {
    const root = ensureRoot();

    const title = rncp?.intitule || rncp?.title || rncp?.nom || `Formation ${id}`;
    const type = rncp?.type || rncp?.niveau || rncp?.diplome_type || "RNCP";
    const date = rncp?.date_enregistrement || rncp?.date || rncp?.registered_at || "—";
    const obj = rncp?.objectifs || rncp?.objectif || rncp?.objectif_et_contexte || rncp?.resume || rncp?.description || "";
    const prereq = rncp?.prerequis || rncp?.prerequis_entree || rncp?.conditions_acces || "—";
    const acts = rncp?.activites_visees || rncp?.activites || rncp?.activites_principales || "";
    const comp = rncp?.competences || rncp?.competences_attestees || rncp?.competences_visees || "";

    const programmesHtml = (programmes && programmes.length)
      ? programmes.slice(0, 8).map(programmeCard).join("")
      : `<p class="u-note">Aucun programme d’école publié pour l’instant pour cette formation.</p>`;

    root.innerHTML = `
      <div class="u-wrap">
        <section class="u-hero">
          <div class="u-hero-top">FORMATION (RNCP)</div>
          <div class="u-title">${esc(title)}</div>
          <div class="u-tags">
            <span class="u-tag"><b>Type</b> ${esc(type)}</span>
            <span class="u-tag"><b>ID</b> ${esc(id)}</span>
          </div>
        </section>

        <section class="u-grid">
          <div class="u-col">
            <div class="u-card">
              <h3>Objectifs & contexte</h3>
              <p>${esc(obj || "—")}</p>
            </div>

            <div class="u-card">
              <h3>Prérequis d’entrée</h3>
              <p>${esc(prereq || "—")}</p>
            </div>

            <div class="u-card">
              <h3>Activités visées</h3>
              ${acts ? `<ul class="u-bullets">${String(acts).split(/\n+/).filter(Boolean).slice(0,20).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>` : `<p>—</p>`}
            </div>

            <div class="u-card">
              <h3>Compétences attestées</h3>
              ${comp ? `<ul class="u-bullets">${String(comp).split(/\n+/).filter(Boolean).slice(0,20).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>` : `<p>—</p>`}
            </div>
          </div>

          <div class="u-col">
            <div class="u-card">
              <h3>Infos clés</h3>
              <div class="u-kv"><span>Pays</span><b>${esc(iso)}</b></div>
              <div class="u-kv"><span>Type de diplôme</span><b>${esc(type)}</b></div>
              <div class="u-kv"><span>Date d’enregistrement</span><b>${esc(date)}</b></div>
            </div>

            <div class="u-card" id="ulydia-programmes-card">
              <h3>Écoles & programmes</h3>
              <div class="u-prog">
                ${programmesHtml}
              </div>
              <div class="u-note">Les écoles peuvent enrichir ce bloc avec logo, photos et vidéo sur leur page programme.</div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  async function run() {
    const { iso, id } = getParams();
    if (!id) return;

    // Small loader (non-blocking)
    const root = ensureRoot();
    root.innerHTML = `<div class="u-wrap"><div class="u-card"><h3>Chargement…</h3><p>Nous récupérons les informations de la formation.</p></div></div>`;

    const api = `${WORKER_BASE}/v1/formation-rncp?id=${encodeURIComponent(id)}&iso=${encodeURIComponent(iso)}`;
    const res = await fetch(api, { headers: { "accept": "application/json" } });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.ok) {
      console.warn("[ULYDIA] formation-rncp API error", data);
      root.innerHTML = `<div class="u-wrap"><div class="u-card"><h3>Erreur</h3><p>Impossible de charger la formation.</p></div></div>`;
      return;
    }

    render({ rncp: data.rncp, programmes: data.programmes || [], iso, id });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
