/**
 * ULYDIA — Fiche blocks fallback renderer (Worker-first)
 * Fixes: "FAQ visible but no métier blocks" even though Worker returns description/missions/etc.
 *
 * Drop AFTER your MONO script in Webflow (or as a separate <script src=... defer>).
 *
 * What it does:
 * - Ensures window.ULYDIA_WORKER_URL is never undefined (locks it).
 * - Hooks window.fetch to observe /v1/metier-page responses
 * - Injects "Aperçu / Missions / Environnement / Profil" blocks into the page
 *   when the dedicated placeholders (#metier-description, #metier-missions, etc.) are missing.
 */
(function(){
  if (window.__ULYDIA_FICHE_BLOCKS_FALLBACK__) return;
  window.__ULYDIA_FICHE_BLOCKS_FALLBACK__ = true;

  const DEFAULT_WORKER = "https://ulydia-data.contact-871.workers.dev";

  // ---- 1) Base URL guard + lock (prevents /undefined/v1/*)
  (function lockWorkerUrl(){
    try{
      const v = (typeof window.ULYDIA_WORKER_URL === "string" && window.ULYDIA_WORKER_URL.trim())
        ? window.ULYDIA_WORKER_URL.trim()
        : DEFAULT_WORKER;

      Object.defineProperty(window, "ULYDIA_WORKER_URL", {
        configurable: false,
        enumerable: true,
        get(){ return v; },
        set(){ /* ignore */ }
      });
    } catch(e){
      if (!window.ULYDIA_WORKER_URL) window.ULYDIA_WORKER_URL = DEFAULT_WORKER;
    }
  })();

  // ---- 2) Helpers
  const esc = (s)=> String(s||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");

  function pickHtml(m, keyHtml, keyTxt){
    const h = m && (m[keyHtml] || m[keyHtml?.toUpperCase?.()] || m[keyHtml?.toLowerCase?.()]);
    if (typeof h === "string" && h.trim()) return h;
    const t = m && (m[keyTxt] || m[keyTxt?.toUpperCase?.()] || m[keyTxt?.toLowerCase?.()]);
    if (typeof t === "string" && t.trim()) return `<p>${esc(t).replace(/\n+/g,"</p><p>")}</p>`;
    return "";
  }

  function ensureContainer(){
    // Prefer an existing content area
    const root =
      document.querySelector("#ulydia-metier-content") ||
      document.querySelector("#ulydia-metier-root") ||
      document.querySelector("[data-ulydia='metier-content']") ||
      document.body;

    // Create / reuse our own section
    let host = document.getElementById("ulydia-fiche-blocks-fallback");
    if (!host){
      host = document.createElement("section");
      host.id = "ulydia-fiche-blocks-fallback";
      host.setAttribute("data-ulydia","fiche-blocks");
      host.style.marginTop = "18px";
      host.style.display = "grid";
      host.style.gap = "14px";
      host.style.maxWidth = "920px";
      host.style.padding = "0 2px";

      // insert near top of content: after the banner if present, else at start
      const banner = document.querySelector("[data-ulydia-banner], .ulydia-banner, img[alt*='sponsoriser']");
      if (banner && banner.parentElement){
        banner.parentElement.insertAdjacentElement("afterend", host);
      } else {
        root.insertAdjacentElement("afterbegin", host);
      }
    }
    return host;
  }

  function card(title, html){
    const wrap = document.createElement("div");
    wrap.style.borderRadius = "16px";
    wrap.style.background = "white";
    wrap.style.boxShadow = "0 10px 30px rgba(0,0,0,.06)";
    wrap.style.overflow = "hidden";

    const head = document.createElement("div");
    head.style.padding = "14px 16px";
    head.style.fontWeight = "700";
    head.style.borderBottom = "1px solid rgba(0,0,0,.06)";
    head.textContent = title;

    const body = document.createElement("div");
    body.style.padding = "14px 16px";
    body.style.lineHeight = "1.55";
    body.style.color = "#1f2937";
    body.innerHTML = html;

    wrap.appendChild(head);
    wrap.appendChild(body);
    return wrap;
  }

  function hasAnyPlaceholders(){
    return !!(
      document.querySelector("#metier-description") ||
      document.querySelector("#metier-missions") ||
      document.querySelector("#metier-overview") ||
      document.querySelector("#metier-environment") ||
      document.querySelector("#metier-profile") ||
      document.querySelector("#metier-competences") ||
      document.querySelector("#metier-skills")
    );
  }

  function renderIfNeeded(m){
    if (!m || typeof m !== "object") return;

    // If placeholders exist, assume MONO renders them (don't duplicate)
    if (hasAnyPlaceholders()) return;

    const overview = pickHtml(m, "overview_html", "overview") || pickHtml(m, "description_html", "description");
    const missions = pickHtml(m, "missions_html", "missions");
    const env      = pickHtml(m, "environment_html", "environments") || pickHtml(m, "environments_html", "environments");
    const profile  = pickHtml(m, "profil_html", "profil_recherche") || pickHtml(m, "profile_html", "profil_recherche");

    // Only render if we have real content
    const parts = [
      ["Aperçu", overview],
      ["Missions", missions],
      ["Environnement", env],
      ["Profil recherché", profile],
    ].filter(([,html]) => typeof html === "string" && html.trim());

    if (!parts.length) return;

    const host = ensureContainer();

    // clear previous
    host.innerHTML = "";

    parts.forEach(([t,h]) => host.appendChild(card(t, h)));

    // debug
    if (window.__METIER_PAGE_DEBUG__) {
      console.log("[ULYDIA] Fiche blocks fallback rendered:", parts.map(p=>p[0]));
    }
  }

  // ---- 3) Hook fetch to capture /v1/metier-page responses
  const _fetch = window.fetch;
  window.fetch = async function(input, init){
    const res = await _fetch.apply(this, arguments);
    try{
      const url = (typeof input === "string") ? input : (input && input.url) ? input.url : "";
      if (!url) return res;

      // Normalize to detect metier-page endpoint even if rewritten
      if (url.includes("/v1/metier-page")) {
        const clone = res.clone();
        clone.json().then(data=>{
          if (data && data.ok === true) {
            const m = data.metier || data.job || data.fiche || null;
            renderIfNeeded(m);
          }
        }).catch(()=>{});
      }
    } catch(e){}
    return res;
  };

  // ---- 4) Also try once on DOM ready using last cached payload if MONO stores it (optional)
  window.addEventListener("DOMContentLoaded", function(){
    try{
      const m = window.__ULYDIA_LAST_METIER__ || null;
      if (m) renderIfNeeded(m);
    } catch(e){}
  });
})();
