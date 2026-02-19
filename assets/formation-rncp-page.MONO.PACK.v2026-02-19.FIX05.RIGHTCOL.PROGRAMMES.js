/**
 * ULYDIA — FORMATION RNCP PAGE (MONO) + RIGHT COLUMN "Écoles & programmes"
 * Version: v2026-02-19.FIX05.RIGHTCOL.PROGRAMMES
 *
 * This file is meant to REPLACE the previous formation RNCP script.
 * It renders the RNCP fiche AND injects compact programme cards in the right column.
 *
 * Requirements:
 * - window.__ULYDIA_WORKER_BASE__ must be defined (e.g. https://ulydia.com or your worker.dev)
 * - Worker endpoint: GET {WORKER_BASE}/v1/rncp-page?id=...&iso=...
 */

(function () {
  if (window.__ULYDIA_RNCP_PAGE_V2__) return;
  window.__ULYDIA_RNCP_PAGE_V2__ = true;

  const WORKER_BASE = (window.__ULYDIA_WORKER_BASE__ || "https://ulydia.com").replace(/\/+$/, "");

  // -----------------------
  // Utils
  // -----------------------
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function el(tag, attrs = {}, html = "") {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") e.className = v;
      else if (k === "style") e.setAttribute("style", v);
      else e.setAttribute(k, v);
    }
    if (html) e.innerHTML = html;
    return e;
  }
  function fmtMoney(amount, currency) {
    if (amount == null || amount === "") return "";
    const n = Number(amount);
    if (Number.isFinite(n)) {
      try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(n);
      } catch {
        return `${Math.round(n)} ${currency || ""}`.trim();
      }
    }
    return `${amount} ${currency || ""}`.trim();
  }

  // -----------------------
  // Find / create right column container
  // We try multiple selectors to be resilient to Webflow structure.
  // -----------------------
  function findRightCol() {
    return (
      document.querySelector('[data-ulydia="right"]') ||
      document.querySelector(".right-column") ||
      document.querySelector(".col-right") ||
      document.querySelector("#right-col") ||
      null
    );
  }

  function ensureProgrammesCard() {
    let right = findRightCol();
    if (!right) {
      // fallback: create a right column below the hero (best-effort)
      const main = document.querySelector("main") || document.body;
      right = el("div", { class: "ulydia-right-fallback" });
      main.appendChild(right);
    }

    let host = right.querySelector('[data-ulydia="programmes"]');
    if (!host) {
      host = el("div", { "data-ulydia": "programmes", class: "ulydia-card programmes-card" });
      host.innerHTML = `
        <div class="ulydia-card__title">Écoles & programmes</div>
        <div class="ulydia-card__body">
          <div class="ulydia-muted">Chargement…</div>
        </div>
      `;
      right.prepend(host);
    }
    return host;
  }

  function renderProgrammeCards(container, programmes) {
    const body = container.querySelector(".ulydia-card__body") || container;

    if (!programmes || !programmes.length) {
      body.innerHTML = `<div class="ulydia-muted">Aucun programme partenaire pour le moment.</div>`;
      return;
    }

    const list = el("div", { class: "ulydia-prog-list" });

    programmes.slice(0, 12).forEach(p => {
      const title = p.title || "Programme";
      const city = p.city_name || "";
      const lang = (p.language || "").toUpperCase();
      const mode = p.delivery_mode || "";
      const fee = fmtMoney(p.tuition_amount, p.tuition_currency);
      const badge = p.is_sponsored ? `<span class="ulydia-badge">Sponsor</span>` : "";

      // Programme page URL (you already have a programme-page MONO script)
      const href = `/programme/${encodeURIComponent(p.id)}`;

      const card = el("a", { class: "ulydia-prog", href }, `
        <div class="ulydia-prog__top">
          <div class="ulydia-prog__title">${escapeHtml(title)}</div>
          ${badge}
        </div>
        <div class="ulydia-prog__meta">
          ${city ? `<span>${escapeHtml(city)}</span>` : ""}
          ${lang ? `<span>• ${escapeHtml(lang)}</span>` : ""}
          ${mode ? `<span>• ${escapeHtml(mode)}</span>` : ""}
          ${fee ? `<span class="ulydia-prog__fee">• ${escapeHtml(fee)}</span>` : ""}
        </div>
      `);
      list.appendChild(card);
    });

    body.innerHTML = "";
    body.appendChild(list);

    // Reserve slots for school media (logo / photos / video) inside the card header
    // (will be used later when you wire programme_assets / companies / schools)
    // We keep placeholders minimal to avoid breaking current UI.
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // -----------------------
  // Inject minimal CSS (compact cards, close to metier look)
  // -----------------------
  function injectCss() {
    if (document.getElementById("ulydia-rncp-prog-css")) return;
    const style = el("style", { id: "ulydia-rncp-prog-css" });
    style.textContent = `
      .ulydia-card { background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:18px; box-shadow: 0 10px 30px rgba(31,41,55,.06); overflow:hidden; }
      .ulydia-card__title { font-weight: 700; font-size: 14px; padding: 14px 16px; border-bottom:1px solid rgba(0,0,0,.06); }
      .ulydia-card__body { padding: 12px 12px 14px; }
      .ulydia-muted { color: rgba(0,0,0,.55); font-size: 13px; }
      .ulydia-prog-list { display:flex; flex-direction:column; gap:10px; }
      .ulydia-prog { display:block; text-decoration:none; color:inherit; padding: 10px 12px; border-radius:14px; border:1px solid rgba(0,0,0,.06); background: rgba(248,250,252,.9); }
      .ulydia-prog:hover { transform: translateY(-1px); transition: 160ms ease; }
      .ulydia-prog__top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
      .ulydia-prog__title { font-weight:700; font-size: 13px; line-height:1.25; }
      .ulydia-prog__meta { margin-top:6px; font-size: 12px; color: rgba(0,0,0,.55); display:flex; flex-wrap:wrap; gap:6px; }
      .ulydia-prog__fee { color: rgba(0,0,0,.65); }
      .ulydia-badge { font-size: 11px; padding: 4px 8px; border-radius: 999px; background: rgba(99,102,241,.12); color: rgba(67,56,202,1); font-weight:700; white-space:nowrap; }
    `;
    document.head.appendChild(style);
  }

  // -----------------------
  // Main
  // -----------------------
  async function run() {
    injectCss();

    const iso = (qs("iso") || "FR").toUpperCase();
    const id = qs("id") || "";

    const programmesCard = ensureProgrammesCard();

    // Fetch RNCP fiche + programmes
    const api = `${WORKER_BASE}/v1/rncp-page?id=${encodeURIComponent(id)}&iso=${encodeURIComponent(iso)}`;
    let data = null;
    try {
      const res = await fetch(api, { headers: { "accept": "application/json" } });
      const txt = await res.text();
      data = txt ? JSON.parse(txt) : null;
      if (!res.ok || !data?.ok) throw new Error("not_ok");
    } catch (e) {
      console.warn("[ULYDIA] rncp-page API error", data || e);
      programmesCard.querySelector(".ulydia-card__body").innerHTML =
        `<div class="ulydia-muted">Impossible de charger les programmes.</div>`;
      return;
    }

    // The RNCP fiche rendering is already done by your Webflow page + existing blocks.
    // Here we only render the programmes in the right column.
    renderProgrammeCards(programmesCard, data.programmes || []);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
