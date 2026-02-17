/**
 * ULYDIA — Programme Page (MONO-like)
 * Version: v2026-02-17.FIX03.ROOT+UUID-LOOSE.PROD
 *
 * Page: /formation?programme=<UUID>&country=<ISO2>
 * Worker: /v1/programme-page?programme=<UUID>&country=<ISO2>
 *
 * Fixes vs FIX02:
 * - Accept Postgres UUID strings even if not RFC-versioned (looser uuid regex)
 * - Prefer #ulydia-programme-root (so /formation can have its own root)
 * - Keep metier-root fallback
 */
(() => {
  if (window.__ULYDIA_PROGRAMME_PAGE_V3__) return;
  window.__ULYDIA_PROGRAMME_PAGE_V3__ = true;

  const qs = (k) => new URLSearchParams(location.search).get(k);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));

  // Looser than RFC4122 validation: Postgres accepts any 128-bit hex in uuid format.
  const isUuidLoose = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s||"").trim());

  function getRoot() {
    return (
      document.getElementById("ulydia-programme-root") ||
      document.getElementById("ulydia-metier-root") ||
      document.getElementById("ulydia-metier-page") ||
      document.querySelector("[data-ulydia-root]") ||
      document.body
    );
  }

  function workerBase() {
    const b = (window.__ULYDIA_WORKER_BASE__ || window.ULYDIA_WORKER_BASE_URL || "").toString().trim();
    return b.replace(/\/+$/,"");
  }

  function showLoader() {
    try { window.showMetierLoader && window.showMetierLoader(); } catch(_) {}
    if (document.getElementById("ulydia-loader-overlay")) return;
    const el = document.createElement("div");
    el.id = "ulydia-loader-overlay";
    el.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.72);backdrop-filter:blur(6px);z-index:99999";
    el.innerHTML = '<div style="font:700 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;color:#0f172a;padding:12px 14px;border-radius:14px;border:1px solid rgba(15,23,42,.12);box-shadow:0 18px 46px rgba(15,23,42,.12);background:#fff">Loading…</div>';
    document.body.appendChild(el);
  }
  function hideLoader() {
    try { window.hideMetierLoader && window.hideMetierLoader(); } catch(_) {}
    const el = document.getElementById("ulydia-loader-overlay");
    if (el) el.remove();
  }

  function ensureCss() {
    if (document.getElementById("ulydia-programme-v3-css")) return;
    const css = `
      .ul-programme-wrap{max-width:1100px;margin:0 auto;padding:0 14px 18px}
      .ul-programme-hero{background:#fff;border:1px solid rgba(148,163,184,.22);border-radius:22px;box-shadow:0 18px 46px rgba(15,23,42,.10);padding:18px 18px 14px}
      .ul-programme-kicker{font-weight:800;font-size:12px;letter-spacing:.02em;color:#64748b;margin-bottom:8px;text-transform:uppercase}
      .ul-programme-title{font-weight:900;font-size:26px;line-height:1.15;color:#0f172a;margin:0 0 10px}
      .ul-programme-meta{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:center;color:#0f172a}
      .ul-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.22);background:rgba(248,250,252,.9);font-weight:800;font-size:12px}
      .ul-chip strong{font-weight:900}
      .ul-badge-s{font-size:11px;font-weight:900;padding:6px 9px;border-radius:999px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.22);color:#3730a3}
      .ul-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:14px}
      @media (max-width: 900px){.ul-grid{grid-template-columns:1fr}}
      .ul-card{background:#fff;border:1px solid rgba(148,163,184,.22);border-radius:22px;box-shadow:0 18px 46px rgba(15,23,42,.08);padding:16px}
      .ul-card h3{margin:0 0 10px;font-weight:900;font-size:16px;color:#0f172a}
      .ul-p{margin:0;color:#0f172a;opacity:.9;font-weight:600;font-size:14px;line-height:1.55}
      .ul-kv{display:flex;flex-direction:column;gap:10px}
      .ul-kvrow{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:16px;border:1px solid rgba(148,163,184,.18);background:rgba(248,250,252,.8)}
      .ul-kvrow span{color:#64748b;font-weight:800;font-size:12px}
      .ul-kvrow b{color:#0f172a;font-weight:900;font-size:12px}
      .ul-school{display:flex;gap:12px;align-items:flex-start}
      .ul-school-logo{width:48px;height:48px;border-radius:14px;border:1px solid rgba(148,163,184,.22);background:#fff;object-fit:contain}
      .ul-school-name{font-weight:900;color:#0f172a}
      .ul-school-links{margin-top:8px;display:flex;gap:10px;flex-wrap:wrap}
      .ul-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(15,23,42,.14);background:#0f172a;color:#fff;text-decoration:none;font-weight:900;font-size:13px}
      .ul-btn.secondary{background:#fff;color:#0f172a}
      .ul-muted{color:#64748b;font-weight:700;font-size:12px}
      .ul-na-card{max-width:1100px;margin:18px auto;padding:18px;border-radius:22px;border:1px solid rgba(148,163,184,.22);background:#fff;box-shadow:0 18px 46px rgba(15,23,42,.10)}
      .ul-na-title{font-weight:900;font-size:16px;color:#0f172a;margin:6px 0 6px}
      .ul-na-text{color:#64748b;font-weight:700;font-size:13px;line-height:1.55}
      .ul-na-badge{display:inline-flex;align-items:center;gap:8px;font-weight:900;font-size:11px;padding:6px 9px;border-radius:999px;background:rgba(14,165,233,.10);border:1px solid rgba(14,165,233,.22);color:#075985}
    `;
    const style = document.createElement("style");
    style.id = "ulydia-programme-v3-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function fmtFee(amount, currency) {
    if (amount == null || amount === "") return "";
    const a = String(amount);
    const c = String(currency || "").trim();
    return (c ? `${a} ${c}` : a).trim();
  }

  function renderNotAvailable(message) {
    ensureCss();
    const root = getRoot();
    root.innerHTML = `
      <div class="ul-na-card">
        <span class="ul-na-badge">✨ Not available</span>
        <div class="ul-na-title">${esc(message || "This programme is not yet available in this country.")}</div>
        <div class="ul-na-text">Try another country or come back later.</div>
      </div>
    `;
  }

  async function main() {
    const programme = qs("programme") || qs("id");
    const country = (qs("country") || qs("iso") || "").toUpperCase().trim();

    if (!programme || !isUuidLoose(programme) || !/^[A-Z]{2}$/.test(country)) return;

    ensureCss();
    showLoader();

    const base = workerBase();
    const api = (base ? base : "") + `/v1/programme-page?programme=${encodeURIComponent(programme)}&country=${encodeURIComponent(country)}`;

    const res = await fetch(api, { cache: "no-store" });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = null; }

    hideLoader();

    if (!data || !data.ok) {
      renderNotAvailable("This programme is not yet available in this country.");
      return;
    }

    if (data.not_available) {
      renderNotAvailable(data.message || "This programme is not yet available in this country.");
      return;
    }

    const p = data.programme || {};
    const s = data.school || {};
    const isSponsored = !!data.is_sponsored;

    const root = getRoot();
    root.innerHTML = `
      <div class="ul-programme-wrap">
        <div class="ul-programme-hero">
          <div class="ul-programme-kicker">Programme</div>
          <h1 class="ul-programme-title">${esc(p.title || "Programme")}</h1>

          <div class="ul-programme-meta">
            ${isSponsored ? `<span class="ul-badge-s">Sponsored</span>` : ``}
            ${p.city_name ? `<span class="ul-chip"><strong>City</strong> ${esc(p.city_name)}</span>` : ``}
            ${p.delivery_mode ? `<span class="ul-chip"><strong>Mode</strong> ${esc(p.delivery_mode)}</span>` : ``}
            ${p.duration_months ? `<span class="ul-chip"><strong>Duration</strong> ${esc(p.duration_months)} months</span>` : ``}
            ${fmtFee(p.tuition_amount, p.tuition_currency) ? `<span class="ul-chip"><strong>Tuition</strong> ${esc(fmtFee(p.tuition_amount, p.tuition_currency))}</span>` : ``}
            ${p.language ? `<span class="ul-chip"><strong>Language</strong> ${esc(p.language)}</span>` : ``}
          </div>
        </div>

        <div class="ul-grid">
          <div class="ul-card">
            <h3>Description</h3>
            <p class="ul-p">${esc(p.description || "—")}</p>
          </div>

          <div class="ul-card">
            <h3>School</h3>
            <div class="ul-school">
              ${s.logo_url ? `<img class="ul-school-logo" src="${esc(s.logo_url)}" alt="${esc(s.name || "School")}" />` : `<div class="ul-school-logo"></div>`}
              <div style="flex:1">
                <div class="ul-school-name">${esc(s.name || "—")}</div>
                <div class="ul-muted">${esc(s.city || "")}</div>
                <div class="ul-school-links">
                  ${s.website_url ? `<a class="ul-btn secondary" href="${esc(s.website_url)}" target="_blank" rel="noopener">Website</a>` : ``}
                  ${s.admissions_url ? `<a class="ul-btn" href="${esc(s.admissions_url)}" target="_blank" rel="noopener">Admissions</a>` : ``}
                </div>
              </div>
            </div>
          </div>

          <div class="ul-card">
            <h3>Key information</h3>
            <div class="ul-kv">
              <div class="ul-kvrow"><span>Country</span><b>${esc(data.country || country)}</b></div>
              <div class="ul-kvrow"><span>Final language</span><b>${esc(data.final_lang || "")}</b></div>
              <div class="ul-kvrow"><span>Sponsoring</span><b>${isSponsored ? "Sponsored" : "Not sponsored"}</b></div>
            </div>
          </div>

          <div class="ul-card">
            <h3>Related professions</h3>
            <p class="ul-p">Coming soon.</p>
          </div>
        </div>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    try { main(); } catch(_) {}
  });
})();
