/**
 * ULYDIA — Formation RNCP Page (MONO-like, SEO country-path)
 * Version: v2026-02-18.RNCP-FORMATION-MONO.V1
 *
 * Public URL (SEO):
 *   /formation/<iso2>/<slug>-<id_fiche>
 * Examples:
 *   /formation/fr/cybersecurite-informatique-et-reseaux-23864
 *
 * API:
 *   GET /v1/rncp-page?id_fiche=<id>&country=FR
 *
 * Notes:
 * - Does NOT touch metier scripts.
 * - Coexists with programme-page MONO which uses /formation?programme=<uuid>&country=<ISO2>
 */
(() => {
  if (window.__ULYDIA_RNCP_FORMATION_V1__) return;
  window.__ULYDIA_RNCP_FORMATION_V1__ = true;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
  const workerBase = () => (window.__ULYDIA_WORKER_BASE__ || window.ULYDIA_WORKER_BASE_URL || "").toString().trim().replace(/\/+$/,"");

  function getRoot() {
    return (
      document.getElementById("ulydia-formation-root") ||
      document.getElementById("ulydia-programme-root") ||
      document.getElementById("ulydia-metier-root") ||
      document.querySelector("[data-ulydia-root]") ||
      document.body
    );
  }

  function ensureCss() {
    if (document.getElementById("ulydia-rncp-v1-css")) return;
    const css = `
      .ul-formation-wrap{max-width:1100px;margin:0 auto;padding:0 14px 18px}
      .ul-hero{background:#fff;border:1px solid rgba(148,163,184,.22);border-radius:22px;box-shadow:0 18px 46px rgba(15,23,42,.10);padding:18px 18px 14px}
      .ul-kicker{font-weight:800;font-size:12px;letter-spacing:.02em;color:#64748b;margin-bottom:8px;text-transform:uppercase}
      .ul-title{font-weight:900;font-size:26px;line-height:1.15;color:#0f172a;margin:0 0 10px}
      .ul-meta{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:center;color:#0f172a}
      .ul-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.22);background:rgba(248,250,252,.9);font-weight:800;font-size:12px}
      .ul-chip strong{font-weight:900}
      .ul-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:14px}
      @media (max-width: 900px){.ul-grid{grid-template-columns:1fr}}
      .ul-card{background:#fff;border:1px solid rgba(148,163,184,.22);border-radius:22px;box-shadow:0 18px 46px rgba(15,23,42,.08);padding:16px}
      .ul-card h3{margin:0 0 10px;font-weight:900;font-size:16px;color:#0f172a}
      .ul-p{margin:0;color:#0f172a;opacity:.9;font-weight:600;font-size:14px;line-height:1.55}
      .ul-kv{display:flex;flex-direction:column;gap:10px}
      .ul-kvrow{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:16px;border:1px solid rgba(148,163,184,.18);background:rgba(248,250,252,.8)}
      .ul-kvrow span{color:#64748b;font-weight:800;font-size:12px}
      .ul-kvrow b{color:#0f172a;font-weight:900;font-size:12px}
      .ul-na{max-width:1100px;margin:18px auto;padding:18px;border-radius:22px;border:1px solid rgba(148,163,184,.22);background:#fff;box-shadow:0 18px 46px rgba(15,23,42,.10)}
      .ul-na h2{margin:0 0 6px;font-weight:900;font-size:16px;color:#0f172a}
      .ul-na p{margin:0;color:#64748b;font-weight:700;font-size:13px;line-height:1.55}
    `;
    const style = document.createElement("style");
    style.id = "ulydia-rncp-v1-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function setCanonical(href) {
    try {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    } catch(_) {}
  }

  function setMeta(name, content) {
    try {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    } catch(_) {}
  }

  function parseRncpFromPath() {
    // Expect: /formation/<iso2>/<slug>-<id>
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length < 3) return null;
    if (parts[0] !== "formation") return null;

    const iso2 = String(parts[1] || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso2)) return null;

    const tail = parts.slice(2).join("/"); // allow nested, but last contains id
    const m = tail.match(/-(\d+)\s*$/);
    if (!m) return null;
    const id = parseInt(m[1], 10);
    if (!Number.isFinite(id) || id <= 0) return null;

    return { iso2, id };
  }

  function renderNotFound() {
    ensureCss();
    const root = getRoot();
    root.innerHTML = `
      <div class="ul-na">
        <h2>Formation introuvable</h2>
        <p>Cette formation n’existe pas (ou n’est plus disponible).</p>
      </div>
    `;
  }

  async function main() {
    // If programme-page query is present, do nothing (programme-page MONO owns it).
    const usp = new URLSearchParams(location.search);
    if (usp.get("programme") || usp.get("id")) return;

    const parsed = parseRncpFromPath();
    if (!parsed) return;

    // RNCP is FR-only for now
    if (parsed.iso2 !== "FR") {
      renderNotFound();
      return;
    }

    ensureCss();

    const base = workerBase();
    const api = (base ? base : "") + `/v1/rncp-page?id_fiche=${encodeURIComponent(parsed.id)}&country=FR`;

    const res = await fetch(api, { cache: "no-store" });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = null; }

    if (!data || !data.ok || !data.rncp) {
      renderNotFound();
      return;
    }

    const r = data.rncp;

    // SEO
    const canonical = (location.origin || "") + (data.seo && data.seo.canonical ? data.seo.canonical : location.pathname);
    setCanonical(canonical);
    if (data.seo && data.seo.title) document.title = data.seo.title;
    if (data.seo && data.seo.description) setMeta("description", data.seo.description);

    const root = getRoot();
    root.innerHTML = `
      <div class="ul-formation-wrap">
        <div class="ul-hero">
          <div class="ul-kicker">Formation (RNCP)</div>
          <h1 class="ul-title">${esc(r.intitule || "Formation")}</h1>
          <div class="ul-meta">
            ${r.rncp_code ? `<span class="ul-chip"><strong>Type</strong> ${esc(r.rncp_code)}</span>` : ``}
            <span class="ul-chip"><strong>ID</strong> ${esc(r.id_fiche)}</span>
          </div>
        </div>

        <div class="ul-grid">
          <div class="ul-card">
            <h3>Objectifs & contexte</h3>
            <p class="ul-p">${esc(r.objectifs_contexte || "—")}</p>
          </div>

          <div class="ul-card">
            <h3>Infos clés</h3>
            <div class="ul-kv">
              <div class="ul-kvrow"><span>Pays</span><b>FR</b></div>
              <div class="ul-kvrow"><span>Type de diplôme</span><b>${esc(r.rncp_code || "—")}</b></div>
              <div class="ul-kvrow"><span>Date d’enregistrement</span><b>${esc(r.date_enregistrement || "—")}</b></div>
            </div>
          </div>

          <div class="ul-card">
            <h3>Prérequis d’entrée</h3>
            <p class="ul-p">${esc(r.prerequis_entree_formation || "—")}</p>
          </div>

          <div class="ul-card">
            <h3>Activités visées</h3>
            <p class="ul-p">${esc(r.activites_visees || "—")}</p>
          </div>
        </div>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    try { main(); } catch(_) {}
  });
})();
