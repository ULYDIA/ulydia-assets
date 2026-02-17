/**
 * ULYDIA — Formations Catalogue (Facets left like Amazon)
 * Version: v2026-02-17.FIX01.FACETS-LEFT.PROD
 *
 * Page: /formations?country=FR&degree=...&domain=...&city=...&lang=...&mode=...&pace=...&deadline_before=YYYY-MM-DD&q=...
 * Worker:
 *  - /v1/programmes-facets?country=FR
 *  - /v1/programmes-search?... (same query params)
 *
 * Notes:
 * - No external deps
 * - Updates URL query params
 * - Mobile: facets panel collapsible
 */
(() => {
  if (window.__ULYDIA_FORMATIONS_CATALOG_V1__) return;
  window.__ULYDIA_FORMATIONS_CATALOG_V1__ = true;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
  const qs = () => new URLSearchParams(location.search);
  const setQs = (params) => {
    const url = new URL(location.href);
    url.search = params.toString();
    history.replaceState(null, "", url.toString());
  };
  const toArr = (v) => (v ? String(v).split(",").map(x=>x.trim()).filter(Boolean) : []);
  const fromArr = (arr) => (arr && arr.length ? arr.join(",") : "");

  function workerBase() {
    return (window.__ULYDIA_WORKER_BASE__ || window.ULYDIA_WORKER_BASE_URL || "").replace(/\/+$/,"");
  }

  function iso2(v) {
    const x = String(v || "").toUpperCase().trim();
    return /^[A-Z]{2}$/.test(x) ? x : "";
  }

  // i18n fallback
  function t(key, fallback) {
    try {
      const lang = window.__ULYDIA_FINAL_LANG__ || window.ULYDIA_FINAL_LANG || "";
      const labels = window.ULYDIA_I18N_LABELS || window.__ULYDIA_I18N_LABELS__ || null;
      if (labels && lang && labels[lang] && labels[lang][key]) return labels[lang][key];
      if (labels && labels[key]) return labels[key];
    } catch(_) {}
    return fallback;
  }

  function ensureCss() {
    if (document.getElementById("ulydia-formations-css")) return;
    const css = `
      .ul-formations-wrap{max-width:1180px;margin:0 auto;padding:0 14px 18px}
      .ul-formations-hero{margin:14px 0 14px;background:#fff;border:1px solid rgba(148,163,184,.22);border-radius:22px;box-shadow:0 18px 46px rgba(15,23,42,.10);padding:16px}
      .ul-formations-title{font-weight:900;font-size:22px;color:#0f172a;margin:0 0 10px}
      .ul-formations-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
      .ul-input{flex:1;min-width:180px;padding:10px 12px;border-radius:14px;border:1px solid rgba(15,23,42,.14);font-weight:700}
      .ul-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(15,23,42,.14);background:#0f172a;color:#fff;text-decoration:none;font-weight:900;font-size:13px;cursor:pointer}
      .ul-btn.secondary{background:#fff;color:#0f172a}
      .ul-layout{display:grid;grid-template-columns:320px 1fr;gap:14px}
      @media (max-width: 980px){.ul-layout{grid-template-columns:1fr}.ul-facets{position:fixed;inset:auto 0 0 0;top:0;display:none;z-index:99999;border-radius:0}.ul-facets.open{display:block}}
      .ul-facets,.ul-results{background:#fff;border:1px solid rgba(148,163,184,.22);border-radius:22px;box-shadow:0 18px 46px rgba(15,23,42,.08)}
      .ul-facets{padding:14px}
      .ul-facets-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      .ul-facets-title{font-weight:900;color:#0f172a}
      .ul-section{padding:10px 0;border-top:1px solid rgba(148,163,184,.18)}
      .ul-section:first-of-type{border-top:none}
      .ul-section h4{margin:0 0 8px;font-weight:900;font-size:13px;color:#0f172a}
      .ul-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}
      .ul-opt label{display:flex;align-items:center;gap:8px;font-weight:800;font-size:12px;color:#0f172a;cursor:pointer}
      .ul-opt small{font-weight:800;color:#64748b}
      .ul-results{padding:14px}
      .ul-results-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .ul-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.22);background:rgba(248,250,252,.9);font-weight:900;font-size:12px}
      .ul-list{display:flex;flex-direction:column;gap:10px}
      .ul-card{border:1px solid rgba(148,163,184,.18);border-radius:18px;padding:12px;display:flex;gap:12px;align-items:flex-start;background:rgba(248,250,252,.55)}
      .ul-card:hover{background:#fff}
      .ul-card a{color:inherit;text-decoration:none}
      .ul-card-title{font-weight:900;color:#0f172a;margin:0 0 4px}
      .ul-card-meta{display:flex;flex-wrap:wrap;gap:8px;color:#64748b;font-weight:800;font-size:12px}
      .ul-badge-s{font-size:11px;font-weight:900;padding:6px 9px;border-radius:999px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.22);color:#3730a3;display:inline-flex}
      .ul-pager{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}
      .ul-muted{color:#64748b;font-weight:800;font-size:12px}
      .ul-loading{padding:12px;border-radius:18px;border:1px dashed rgba(148,163,184,.35);color:#64748b;font-weight:900}
      .ul-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:99998;display:none}
      .ul-overlay.open{display:block}
    `;
    const s = document.createElement("style");
    s.id = "ulydia-formations-css";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function rootEl() {
    return document.getElementById("ulydia-formations-root") || document.getElementById("ulydia-metier-root") || document.body;
  }

  function buildCard(item, country) {
    const url = `/formation?programme=${encodeURIComponent(item.id)}&country=${encodeURIComponent(country)}`;
    const fee = (item.tuition_amount != null && item.tuition_amount !== "") ? `${item.tuition_amount} ${item.tuition_currency || ""}`.trim() : "";
    const deadline = item.application_deadline ? `Deadline: ${item.application_deadline}` : "";
    return `
      <div class="ul-card">
        <div style="flex:1">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            ${item.is_sponsored ? `<span class="ul-badge-s">Sponsored</span>` : ``}
            <a href="${esc(url)}"><div class="ul-card-title">${esc(item.title || "Programme")}</div></a>
          </div>
          <div class="ul-card-meta">
            ${item.city_name ? `<span>${esc(item.city_name)}</span>` : ``}
            ${item.degree_level ? `<span>${esc(item.degree_level)}</span>` : ``}
            ${item.domain ? `<span>${esc(item.domain)}</span>` : ``}
            ${item.delivery_mode ? `<span>${esc(item.delivery_mode)}</span>` : ``}
            ${item.pace ? `<span>${esc(item.pace)}</span>` : ``}
            ${item.language ? `<span>${esc(item.language)}</span>` : ``}
            ${fee ? `<span>${esc(fee)}</span>` : ``}
            ${deadline ? `<span>${esc(deadline)}</span>` : ``}
          </div>
        </div>
        <div style="align-self:center">
          <a class="ul-btn secondary" href="${esc(url)}">${esc(t("view_programme", "View"))}</a>
        </div>
      </div>
    `;
  }

  function facetSection(title, key, opts, state) {
    const selected = new Set(state[key] || []);
    const mkId = (v) => `ul-f-${key}-${String(v).replace(/[^a-z0-9]+/gi,"_")}`;
    return `
      <div class="ul-section" data-facet="${esc(key)}">
        <h4>${esc(title)}</h4>
        ${opts.map(o => {
          const id = mkId(o.value);
          const checked = selected.has(String(o.value)) ? "checked" : "";
          return `
            <div class="ul-opt">
              <label for="${esc(id)}">
                <input type="checkbox" id="${esc(id)}" data-facet-key="${esc(key)}" value="${esc(o.value)}" ${checked}/>
                <span>${esc(o.value)}</span>
              </label>
              <small>${esc(o.count)}</small>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function getStateFromUrl() {
    const p = qs();
    return {
      country: iso2(p.get("country")) || "FR",
      q: p.get("q") || "",
      degree: toArr(p.get("degree")),
      domain: toArr(p.get("domain")),
      city: toArr(p.get("city")),
      lang: toArr(p.get("lang")),
      mode: toArr(p.get("mode")),
      pace: toArr(p.get("pace")),
      deadline_before: p.get("deadline_before") || "",
      page: Math.max(1, parseInt(p.get("page") || "1", 10) || 1),
      page_size: Math.max(5, Math.min(50, parseInt(p.get("page_size") || "20", 10) || 20))
    };
  }

  function applyStateToUrl(state) {
    const p = new URLSearchParams();
    p.set("country", state.country);
    if (state.q) p.set("q", state.q);
    if (state.degree?.length) p.set("degree", fromArr(state.degree));
    if (state.domain?.length) p.set("domain", fromArr(state.domain));
    if (state.city?.length) p.set("city", fromArr(state.city));
    if (state.lang?.length) p.set("lang", fromArr(state.lang));
    if (state.mode?.length) p.set("mode", fromArr(state.mode));
    if (state.pace?.length) p.set("pace", fromArr(state.pace));
    if (state.deadline_before) p.set("deadline_before", state.deadline_before);
    p.set("page", String(state.page || 1));
    p.set("page_size", String(state.page_size || 20));
    setQs(p);
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const txt = await res.text();
    try { return txt ? JSON.parse(txt) : null; } catch { return null; }
  }

  async function main() {
    ensureCss();
    const root = rootEl();

    const state = getStateFromUrl();
    applyStateToUrl(state); // normalize URL

    root.innerHTML = `
      <div class="ul-formations-wrap">
        <div class="ul-formations-hero">
          <div class="ul-formations-title">${esc(t("formations_title", "Formations"))}</div>
          <div class="ul-formations-bar">
            <input class="ul-input" id="ul-q" placeholder="${esc(t("search_programmes", "Search programmes"))}" value="${esc(state.q)}"/>
            <button class="ul-btn secondary" id="ul-open-facets">${esc(t("filters", "Filters"))}</button>
            <button class="ul-btn" id="ul-reset">${esc(t("reset", "Reset"))}</button>
          </div>
          <div class="ul-muted" style="margin-top:8px">${esc(t("country", "Country"))}: <strong>${esc(state.country)}</strong></div>
        </div>

        <div class="ul-layout">
          <div class="ul-overlay" id="ul-overlay"></div>
          <div class="ul-facets" id="ul-facets">
            <div class="ul-facets-head">
              <div class="ul-facets-title">${esc(t("filters", "Filters"))}</div>
              <button class="ul-btn secondary" id="ul-close-facets">${esc(t("close", "Close"))}</button>
            </div>
            <div id="ul-facets-body"><div class="ul-loading">${esc(t("loading", "Loading…"))}</div></div>
          </div>

          <div class="ul-results">
            <div class="ul-results-top">
              <div class="ul-chip" id="ul-count">${esc(t("loading", "Loading…"))}</div>
              <div class="ul-muted">${esc(t("sorted_sponsored_first", "Sponsored first"))}</div>
            </div>
            <div class="ul-list" id="ul-list"><div class="ul-loading">${esc(t("loading", "Loading…"))}</div></div>
            <div class="ul-pager">
              <button class="ul-btn secondary" id="ul-prev">${esc(t("prev", "Prev"))}</button>
              <button class="ul-btn secondary" id="ul-next">${esc(t("next", "Next"))}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const base = workerBase();
    if (!base) {
      document.getElementById("ul-list").innerHTML = `<div class="ul-loading">Missing worker base. Set window.__ULYDIA_WORKER_BASE__</div>`;
      return;
    }

    const facetsUrl = `${base}/v1/programmes-facets?country=${encodeURIComponent(state.country)}`;
    const facets = await fetchJson(facetsUrl);

    const facetsBody = document.getElementById("ul-facets-body");
    if (!facets || !facets.ok) {
      facetsBody.innerHTML = `<div class="ul-loading">Failed to load facets.</div>`;
      return;
    }

    // Expose final_lang for label libs if needed
    window.__ULYDIA_FINAL_LANG__ = facets.final_lang || "";

    const facetHtml = []
    if (facets.facets.degree_levels?.length) facetHtml.push(facetSection(t("degree_level","Degree level"), "degree", facets.facets.degree_levels, state));
    if (facets.facets.domains?.length) facetHtml.push(facetSection(t("study_domain","Field of study"), "domain", facets.facets.domains, state));
    if (facets.facets.cities?.length) facetHtml.push(facetSection(t("city","City"), "city", facets.facets.cities, state));
    if (facets.facets.languages?.length) facetHtml.push(facetSection(t("language","Language"), "lang", facets.facets.languages, state));
    if (facets.facets.delivery_modes?.length) facetHtml.push(facetSection(t("study_format","Study format"), "mode", facets.facets.delivery_modes, state));
    if (facets.facets.pace?.length) facetHtml.push(facetSection(t("pace","Pace"), "pace", facets.facets.pace, state));

    // Deadline filter (simple input)
    facetHtml.push(`
      <div class="ul-section">
        <h4>${esc(t("application_deadline","Application deadline"))}</h4>
        <input class="ul-input" style="width:100%" type="date" id="ul-deadline" value="${esc(state.deadline_before)}"/>
        <div class="ul-muted" style="margin-top:6px">${esc(t("deadline_before_hint","Show programmes with a deadline on or before this date."))}</div>
      </div>
    `);

    facetsBody.innerHTML = facetHtml.join("");

    async function runSearch() {
      document.getElementById("ul-list").innerHTML = `<div class="ul-loading">${esc(t("loading","Loading…"))}</div>`;
      const p = new URLSearchParams(location.search);
      // Ensure correct country
      p.set("country", state.country);
      p.set("page", String(state.page));
      p.set("page_size", String(state.page_size));
      const url = `${base}/v1/programmes-search?${p.toString()}`;
      const data = await fetchJson(url);
      if (!data || !data.ok) {
        document.getElementById("ul-list").innerHTML = `<div class="ul-loading">Failed to load programmes.</div>`;
        return;
      }
      document.getElementById("ul-count").textContent = `${data.total} ${t("results","results")}`;
      const list = data.items || [];
      document.getElementById("ul-list").innerHTML = list.length
        ? list.map(it => buildCard(it, state.country)).join("")
        : `<div class="ul-loading">${esc(t("no_results","No results"))}</div>`;
      // pager buttons
      document.getElementById("ul-prev").disabled = state.page <= 1;
      document.getElementById("ul-next").disabled = (state.page * state.page_size) >= (data.total || 0);
    }

    function collectFacetState() {
      const p = qs();
      // reset arrays
      const keys = ["degree","domain","city","lang","mode","pace"];
      for (const k of keys) p.delete(k);
      // collect checkboxes
      document.querySelectorAll('#ul-facets input[type="checkbox"][data-facet-key]').forEach(inp => {
        if (!inp.checked) return;
        const k = inp.getAttribute("data-facet-key");
        const v = inp.value;
        const arr = toArr(p.get(k));
        if (!arr.includes(v)) arr.push(v);
        p.set(k, fromArr(arr));
      });
      const dl = document.getElementById("ul-deadline");
      if (dl && dl.value) p.set("deadline_before", dl.value);
      else p.delete("deadline_before");
      // q
      const qv = document.getElementById("ul-q").value.trim();
      if (qv) p.set("q", qv); else p.delete("q");

      // reset page when filters change
      p.set("page", "1");
      setQs(p);

      // sync state
      const s2 = getStateFromUrl();
      Object.assign(state, s2);
    }

    // Events: facets change
    root.addEventListener("change", (e) => {
      const el = e.target;
      if (el && (el.matches('#ul-facets input[type="checkbox"][data-facet-key]') || el.id === "ul-deadline")) {
        collectFacetState();
        runSearch();
      }
    });

    // Search input enter
    document.getElementById("ul-q").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        collectFacetState();
        runSearch();
      }
    });

    // Reset
    document.getElementById("ul-reset").addEventListener("click", () => {
      const p = new URLSearchParams();
      p.set("country", state.country);
      p.set("page","1");
      p.set("page_size", String(state.page_size));
      setQs(p);
      location.reload();
    });

    // Pager
    document.getElementById("ul-prev").addEventListener("click", () => {
      if (state.page <= 1) return;
      state.page -= 1;
      applyStateToUrl(state);
      runSearch();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.getElementById("ul-next").addEventListener("click", () => {
      state.page += 1;
      applyStateToUrl(state);
      runSearch();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Mobile facets open/close
    const facetsEl = document.getElementById("ul-facets");
    const overlayEl = document.getElementById("ul-overlay");
    const open = () => { facetsEl.classList.add("open"); overlayEl.classList.add("open"); };
    const close = () => { facetsEl.classList.remove("open"); overlayEl.classList.remove("open"); };

    document.getElementById("ul-open-facets").addEventListener("click", open);
    document.getElementById("ul-close-facets").addEventListener("click", close);
    overlayEl.addEventListener("click", close);

    await runSearch();
  }

  document.addEventListener("DOMContentLoaded", () => { try { main(); } catch(_) {} });
})();
