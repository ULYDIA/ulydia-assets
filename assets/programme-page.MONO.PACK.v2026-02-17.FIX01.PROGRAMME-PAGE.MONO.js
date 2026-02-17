/**
 * ULYDIA — Programme Page (Formation) MONO
 * Version: v2026-02-17.FIX01.PROGRAMME-PAGE.MONO
 * Renders a single programme fiche from Supabase via Cloudflare Worker.
 *
 * URL:
 *   /formation?programme=<UUID>&country=<ISO2>
 *
 * Worker endpoint:
 *   /v1/programme-page?programme=<UUID>&country=<ISO2>
 *
 * Feature flag (worker):
 *   FEATURE_FORMATIONS=1
 */
(() => {
  if (window.__ULYDIA_PROGRAMME_PAGE_MONO_V1__) return;
  window.__ULYDIA_PROGRAMME_PAGE_MONO_V1__ = true;

  const $ = (sel, root = document) => root.querySelector(sel);

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getParam(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name);
  }

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt ?? "";
  }

  function formatMoney(amount, currency) {
    if (amount == null || amount === "") return "";
    const n = Number(amount);
    if (!Number.isFinite(n)) return String(amount);
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR" }).format(n);
    } catch {
      return `${n} ${currency || ""}`.trim();
    }
  }

  function badge(text) {
    return `<span class="u-prog-badge">${esc(text)}</span>`;
  }

  function ensureStyles() {
    if (document.getElementById("ulydia-programme-page-styles")) return;
    const st = document.createElement("style");
    st.id = "ulydia-programme-page-styles";
    st.textContent = `
      .u-prog-wrap{max-width:1040px;margin:0 auto;padding:0 20px 80px;}
      .u-prog-hero{background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:24px;box-shadow:0 18px 60px rgba(31,41,55,.10);padding:28px;margin-top:18px;}
      .u-prog-title{font-size:40px;line-height:1.1;margin:0 0 6px;font-weight:800;letter-spacing:-0.02em;}
      .u-prog-sub{display:flex;flex-wrap:wrap;gap:10px;align-items:center;color:#6b7280;font-size:14px;margin-top:10px;}
      .u-prog-badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
      .u-prog-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(99,102,241,.10);color:#4338ca;font-weight:700;font-size:12px;}
      .u-prog-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:18px;margin-top:18px;}
      @media(max-width:900px){.u-prog-grid{grid-template-columns:1fr;}}
      .u-prog-card{background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:22px;box-shadow:0 18px 60px rgba(31,41,55,.08);padding:20px;}
      .u-prog-card h3{margin:0 0 10px;font-size:16px;font-weight:800;color:#111827;}
      .u-prog-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;}
      @media(max-width:520px){.u-prog-meta{grid-template-columns:1fr;}}
      .u-prog-meta-item{border:1px solid rgba(0,0,0,.06);border-radius:18px;padding:12px 14px;background:rgba(243,244,246,.7);}
      .u-prog-meta-k{font-size:12px;color:#6b7280;font-weight:700;}
      .u-prog-meta-v{font-size:14px;color:#111827;font-weight:800;margin-top:2px;}
      .u-prog-cta{display:flex;flex-direction:column;gap:10px;}
      .u-prog-btn{display:inline-flex;justify-content:center;align-items:center;border-radius:16px;padding:12px 14px;font-weight:800;text-decoration:none;border:1px solid rgba(0,0,0,.06);background:#111827;color:#fff;}
      .u-prog-btn:hover{opacity:.92;}
      .u-prog-muted{color:#6b7280;font-size:13px;line-height:1.4;}
      .u-prog-section{margin-top:18px;}
      .u-prog-loader{display:flex;align-items:center;justify-content:center;padding:60px 0;color:#6b7280;}
      .u-prog-error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#991b1b;border-radius:18px;padding:14px 16px;font-weight:800;}
    `;
    document.head.appendChild(st);
  }

  function getApiBase() {
    return (window.ULYDIA_DATA_API || window.__ULYDIA_WORKER_BASE__ || "https://ulydia-data.contact-871.workers.dev").replace(/\/+$/, "");
  }

  function label(key, fallback) {
    // Optional integration with ulydia-i18n.labels.v1.js if present
    try {
      const lang = (window.__ULYDIA_FINAL_LANG__ || "").toLowerCase();
      const dict = window.ULYDIA_I18N_LABELS || window.__ULYDIA_I18N_LABELS__ || null;
      if (dict && lang && dict[lang] && dict[lang][key]) return dict[lang][key];
      if (dict && dict["en"] && dict["en"][key]) return dict["en"][key];
    } catch {}
    return fallback;
  }

  async function run() {
    ensureStyles();

    const root = $("#ulydia-programme-root") || document.body;
    root.innerHTML = `<div class="u-prog-wrap"><div class="u-prog-loader">${esc(label("loading", "Loading…"))}</div></div>`;

    const programme = (getParam("programme") || "").trim();
    const country = (getParam("country") || "").trim().toUpperCase();

    if (!programme) {
      root.innerHTML = `<div class="u-prog-wrap"><div class="u-prog-error">Missing programme id.</div></div>`;
      return;
    }
    if (!country) {
      root.innerHTML = `<div class="u-prog-wrap"><div class="u-prog-error">Missing country.</div></div>`;
      return;
    }

    const api = getApiBase();
    const url = `${api}/v1/programme-page?programme=${encodeURIComponent(programme)}&country=${encodeURIComponent(country)}`;

    let data = null;
    try {
      const res = await fetch(url, { headers: { "accept": "application/json" } });
      const txt = await res.text();
      try { data = txt ? JSON.parse(txt) : null; } catch { data = { ok:false, error:"bad_json", detail: txt }; }
    } catch (e) {
      root.innerHTML = `<div class="u-prog-wrap"><div class="u-prog-error">${esc(label("network_error", "Network error"))}</div></div>`;
      return;
    }

    // If worker returns a "not available" message, show it as-is (English required)
    if (!data || data.ok === false) {
      const msg = data?.message || data?.error || "This programme is not yet available in this country";
      root.innerHTML = `<div class="u-prog-wrap"><div class="u-prog-error">${esc(msg)}</div></div>`;
      return;
    }

    // Store final lang for labels
    window.__ULYDIA_FINAL_LANG__ = data.final_lang || "";

    const p = data.programme || {};
    const s = data.school || {};
    const money = formatMoney(p.tuition_amount, p.tuition_currency);
    const duration = p.duration_months ? `${p.duration_months} months` : "";
    const delivery = p.delivery_mode ? String(p.delivery_mode).replace(/_/g, " ") : "";
    const city = p.city_name || "";
    const lang = p.language || "";

    const sponsored = data.is_sponsored ? badge(label("sponsored", "Sponsored")) : "";
    const badges = [sponsored].filter(Boolean).join("");

    // CTA best-effort
    const ctaUrl = s.admissions_url || s.website_url || s.url || "";
    const ctaLabel = label("contact_school", "Contact school");

    root.innerHTML = `
      <div class="u-prog-wrap">
        <div class="u-prog-hero">
          <h1 class="u-prog-title">${esc(p.title || "Programme")}</h1>
          <div class="u-prog-sub">
            ${city ? `<span>${esc(city)}</span>` : ""}
            ${country ? `<span>•</span><span>${esc(country)}</span>` : ""}
            ${lang ? `<span>•</span><span>${esc(lang.toUpperCase())}</span>` : ""}
          </div>
          <div class="u-prog-badges">${badges}</div>

          <div class="u-prog-grid">
            <div class="u-prog-card">
              <h3>${esc(label("about_programme", "About this programme"))}</h3>
              <div class="u-prog-muted">${esc(p.description || "")}</div>

              <div class="u-prog-meta">
                <div class="u-prog-meta-item">
                  <div class="u-prog-meta-k">${esc(label("duration", "Duration"))}</div>
                  <div class="u-prog-meta-v">${esc(duration || "—")}</div>
                </div>
                <div class="u-prog-meta-item">
                  <div class="u-prog-meta-k">${esc(label("delivery_mode", "Delivery mode"))}</div>
                  <div class="u-prog-meta-v">${esc(delivery || "—")}</div>
                </div>
                <div class="u-prog-meta-item">
                  <div class="u-prog-meta-k">${esc(label("tuition", "Tuition"))}</div>
                  <div class="u-prog-meta-v">${esc(money || "—")}</div>
                </div>
                <div class="u-prog-meta-item">
                  <div class="u-prog-meta-k">${esc(label("school", "School"))}</div>
                  <div class="u-prog-meta-v">${esc(s.name || s.company_name || "—")}</div>
                </div>
              </div>
            </div>

            <div class="u-prog-card u-prog-cta">
              <h3>${esc(label("school_info", "School"))}</h3>
              <div class="u-prog-muted">${esc(s.short_description || s.tagline || "")}</div>
              ${ctaUrl ? `<a class="u-prog-btn" href="${esc(ctaUrl)}" target="_blank" rel="noopener">${esc(ctaLabel)}</a>` : ""}
              <div class="u-prog-muted">${esc(label("cta_hint", "This link opens the school's website."))}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
