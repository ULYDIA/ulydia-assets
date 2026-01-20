/* metier-page.v4.0.js — Ulydia
   - WHITE theme like login/signup via UlydiaUI (ulydia-ui.v1.js)
   - Full-code render of job page
   - ✅ Keeps banner logic: shows sponsor wide/square when sponsor active; otherwise shows fallback banners from pays.banners (already provided by Worker)
   - ✅ Renders CMS fields when present
   - ✅ Shows Metier_Pays_Bloc (optional) only if present
   - ✅ Debug helper: if no sections found, shows available metier field keys (to confirm payload)

   Expected Worker payload (already in your setup):
     GET /v1/metier-page -> { metier, pays, sponsor, blocs_pays, faq }

   Query params:
     /metier?metier=<slug>&country=FR
     /fiche-metiers/<slug>?country=FR
     Preview overrides:
       ?preview=1&preview_landscape=...&preview_square=...&preview_link=...
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V40__) return;
  window.__ULYDIA_METIER_PAGE_V40__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // -----------------------------
  // CONFIG
  // -----------------------------
  const WORKER_URL   = window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "";

  // Where ulydia-ui.v1.js lives (Cloudflare Pages assets)
  const ULYDIA_UI_URL = window.ULYDIA_UI_URL || "https://ulydia-assets.pages.dev/ulydia-ui.v1.js";

  const qp = (k) => new URLSearchParams(location.search).get(k);

  // -----------------------------
  // PREVIEW OVERRIDES
  // -----------------------------
  const isHttpUrl = (u) => /^https?:\/\//i.test(String(u || "").trim());

  const PREVIEW = (() => {
    const q = new URLSearchParams(location.search);
    const on = q.get("preview") === "1";
    return {
      on,
      country: (q.get("country") || "").toUpperCase(),
      landscape: (q.get("preview_landscape") || "").trim(),
      square: (q.get("preview_square") || "").trim(),
      link: (q.get("preview_link") || "").trim(),
    };
  })();

  function withCacheBust(u) {
    const s = String(u || "").trim();
    if (!PREVIEW.on || !isHttpUrl(s)) return s;
    try {
      const x = new URL(s);
      x.searchParams.set("ulprev", String(Date.now()));
      return x.toString();
    } catch {
      return s + (s.includes("?") ? "&" : "?") + "ulprev=" + Date.now();
    }
  }

  // -----------------------------
  // ROOT
  // -----------------------------
  let ROOT = document.getElementById("ulydia-metier-root");
  if (!ROOT) {
    ROOT = document.createElement("div");
    ROOT.id = "ulydia-metier-root";
    document.body.prepend(ROOT);
    log("root auto-created");
  }

  // -----------------------------
  // Load UlydiaUI (tokens + base CSS)
  // -----------------------------
  function loadScriptOnce(src, id) {
    return new Promise((resolve, reject) => {
      if (id && document.getElementById(id)) return resolve();
      const s = document.createElement("script");
      if (id) s.id = id;
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureUlydiaUI() {
    if (window.UlydiaUI && typeof window.UlydiaUI.ensure === "function") {
      window.UlydiaUI.ensure();
      return;
    }
    await loadScriptOnce(ULYDIA_UI_URL + (ULYDIA_UI_URL.includes("?") ? "&" : "?") + "v=" + Date.now(), "ulydia_ui_v1_js");
    if (!window.UlydiaUI) throw new Error("UlydiaUI not available after loading");
    window.UlydiaUI.ensure();
  }

  // Extra CSS specific to the metier page (keeps UI tokens as base)
  function injectMetierCSS() {
    if (document.getElementById("ul_metier_css_v40")) return;
    const style = document.createElement("style");
    style.id = "ul_metier_css_v40";
    style.textContent = `
      /* Page layout */
      #ulydia-metier-root{ background: var(--ul-bg); }
      #ulydia-metier-root .mp-wrap{ max-width: var(--ul-maxw); margin: 0 auto; padding: 28px var(--ul-pad) 80px; }

      /* Header */
      #ulydia-metier-root .mp-hero{ display:flex; justify-content:space-between; gap: 16px; flex-wrap:wrap; align-items:flex-start; }
      #ulydia-metier-root .mp-title{ font-weight: 900; font-size: 34px; letter-spacing: -0.03em; margin: 0; color: var(--ul-primary) !important; text-transform: none !important; }
      #ulydia-metier-root .mp-tagline{ margin: 10px 0 0; color: var(--ul-muted); font-size: 15px; line-height: 1.55; max-width: 820px; }
      #ulydia-metier-root .mp-meta{ margin: 8px 0 0; color: var(--ul-muted); font-size: 12px; }

      /* Grid */
      #ulydia-metier-root .mp-grid{ display:grid; grid-template-columns: 1.2fr .8fr; gap: var(--ul-gap); margin-top: 16px; }
      @media (max-width: 980px){ #ulydia-metier-root .mp-grid{ grid-template-columns: 1fr; } }

      /* Search bar */
      #ulydia-metier-root .mp-search{ display:flex; gap: 12px; align-items:center; justify-content:space-between; flex-wrap:wrap; padding: 14px; border: 1px solid var(--ul-border); border-radius: var(--ul-radius-lg); background:#fff; box-shadow: var(--ul-shadow-card); margin: 14px 0 16px; }
      #ulydia-metier-root .mp-pill{ display:inline-flex; align-items:center; gap: 8px; padding: 10px 14px; border: 1px solid var(--ul-border); border-radius: 999px; background:#fff; font-weight: 800; color: var(--ul-text); }
      #ulydia-metier-root .mp-input{ min-width: 320px; height: 44px; border-radius: var(--ul-radius-md); border: 1px solid var(--ul-border); padding: 0 14px; font-weight: 700; outline: none; }
      @media (max-width: 720px){ #ulydia-metier-root .mp-input{ min-width: 220px; } }

      /* Card header gradient like login blocks */
      #ulydia-metier-root .mp-grad{ background: linear-gradient(135deg, rgba(192,1,2,.12), rgba(255,255,255,1) 60%); }

      /* Rich text */
      #ulydia-metier-root .mp-rich{ color: var(--ul-text); line-height: 1.75; }
      #ulydia-metier-root .mp-rich p{ margin: 0 0 10px; }
      #ulydia-metier-root .mp-rich p:last-child{ margin-bottom: 0; }
      #ulydia-metier-root .mp-rich ul, #ulydia-metier-root .mp-rich ol{ margin: 8px 0 12px 20px; }
      #ulydia-metier-root .mp-rich a{ color: var(--ul-primary); font-weight: 700; }

      /* Wide banner sizing (full width + centered) */
      #ulydia-metier-root .u-banner{ display:block; width:100%; }
      #ulydia-metier-root .u-banner--wide{ width:100%; }
      #ulydia-metier-root .u-banner--wide img{ width:100%; height:100%; object-fit:cover; display:block; }

      /* Sponsor card image */
      #ulydia-metier-root .mp-sqimg{ width: 100%; height: auto; display:block; }

      /* Debug card */
      #ulydia-metier-root .mp-debug{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; white-space: pre-wrap; color: #111827; }
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // Data helpers
  // -----------------------------
  function isFilled(v){
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.filter(Boolean).length > 0;
    if (typeof v === "number") return true;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return !!v;
  }

  function esc(s = ""){
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Unwrap record shapes: {fields}, {record:{fields}}, {data:{fields}}, etc.
  function unwrap(x){
    let cur = x;
    for (let i=0; i<6; i++){
      if (!cur || typeof cur !== "object") break;
      if (cur.fields && typeof cur.fields === "object") return cur;
      if (cur.record) { cur = cur.record; continue; }
      if (cur.data) { cur = cur.data; continue; }
      if (cur.item) { cur = cur.item; continue; }
      break;
    }
    return cur || {};
  }

  function normKey(k){
    return String(k || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase();
  }

  function pickF(obj, ...keys){
    const base0 = unwrap(obj);
    const base = (base0 && base0.fields && typeof base0.fields === "object") ? base0.fields : (base0 || {});

    // direct
    for (const k of keys){
      if (!k) continue;
      const v = base[k];
      if (isFilled(v)) return v;
    }
    // normalized
    const wanted = new Set(keys.filter(Boolean).map(normKey));
    for (const [k,v] of Object.entries(base)){
      if (!isFilled(v)) continue;
      if (wanted.has(normKey(k))) return v;
    }
    return "";
  }

  function toHtml(v){
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.filter(Boolean).map(toHtml).join("\n");
    if (typeof v === "object"){
      if (typeof v.html === "string") return v.html;
      if (typeof v.value === "string") return v.value;
      if (typeof v.text === "string") return v.text;
      if (typeof v.markdown === "string") return v.markdown;
      if (typeof v.content === "string") return v.content;
      if (Array.isArray(v.children)) return v.children.map(toHtml).join("\n");
    }
    return String(v);
  }

  // Slug -> pretty title
  function slugToTitle(slug){
    const s = String(slug || "").trim();
    if (!s) return "";
    const lowerWords = new Set(["de","du","des","la","le","les","d","et","à","au","aux","en","pour","sur"]);
    return s
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w, i) => {
        const lw = w.toLowerCase();
        if (i > 0 && lowerWords.has(lw)) return lw;
        return lw.charAt(0).toUpperCase() + lw.slice(1);
      })
      .join(" ");
  }

  function detectSlug(){
    const q = new URLSearchParams(location.search);
    const fromQ = q.get("metier") || q.get("job") || q.get("slug") || "";
    if (fromQ) return fromQ;
    const path = location.pathname.split("/").filter(Boolean);
    const last = path[path.length - 1] || "";
    // /fiche-metiers/<slug>
    if (path.includes("fiche-metiers")) return last;
    // /metier (slug via query)
    return last;
  }

  function humanTitle(titleFromCMS, fallbackSlug){
    const raw = String(titleFromCMS || "").trim();
    const slug = String(fallbackSlug || "").trim();
    const candidate = raw || slug;
    if (!candidate) return "Metier";
    const looksSlug = (/[-_]/.test(candidate) && !/\s/.test(candidate)) || (slug && candidate === slug);
    return looksSlug ? slugToTitle(candidate) : candidate;
  }

  function safeUrl(u){
    try{
      if (!u) return "";
      return new URL(String(u), location.origin).href;
    }catch{ return ""; }
  }

  function sponsorIsActive(sponsor){
    const s = sponsor || {};
    const v = s.active ?? s.is_active ?? s.status;
    if (v === true || v === 1 || v === "1" || v === "true") return true;
    if (typeof v === "string" && v.toLowerCase() === "active") return true;
    // if there are sponsor logos, we consider it active for display purposes
    if (isFilled(s.logo_1 || s.sponsor_logo_1 || s.logo_square) || isFilled(s.logo_2 || s.sponsor_logo_2 || s.logo_wide)) return true;
    return false;
  }

  // -----------------------------
  // Worker fetch
  // -----------------------------
  async function fetchJSON(url, opts={}){
    const res = await fetch(url, opts);
    const text = await res.text();
    let json;
    try{ json = text ? JSON.parse(text) : {}; }catch{ json = { raw:text }; }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0,200)}`);
    return json;
  }

  async function getMetierData(){
    const slug = detectSlug();
    const country = (PREVIEW.country || qp("country") || qp("iso") || "").toUpperCase();

    if (!slug) throw new Error("Missing metier slug. Use /metier?metier=SLUG&country=FR");

    const url = new URL(WORKER_URL.replace(/\/$/, "") + "/v1/metier-page");
    url.searchParams.set("metier", slug);
    if (country) url.searchParams.set("country", country);
    if (PREVIEW.on) url.searchParams.set("preview", "1");

    const headers = { "accept": "application/json" };
    if (PROXY_SECRET) {
      headers["x-ulydia-proxy-secret"] = PROXY_SECRET;
      headers["x-proxy-secret"] = PROXY_SECRET;
    }

    log("fetch", url.toString());
    return fetchJSON(url.toString(), { method: "GET", headers });
  }

  // -----------------------------
  // Rendering helpers using UlydiaUI
  // -----------------------------
  function sectionCard(title, html){
    if (!isFilled(html)) return null;
    const card = window.UlydiaUI.card(title, "mp-grad");
    const body = document.createElement("div");
    body.className = "mp-rich";
    body.innerHTML = String(html);
    card.appendChild(body);
    return card;
  }

  function sponsorCard({ sponsorName, sqUrl, linkUrl, activeLabel }){
    const card = window.UlydiaUI.card("Sponsor", "mp-grad");

    // header right status
    if (activeLabel) {
      // u-sectionHeader is already the first child; we add a small badge to the header
      const header = card.firstElementChild;
      if (header) {
        const badge = document.createElement("div");
        badge.textContent = activeLabel;
        badge.style.fontWeight = "800";
        badge.style.fontSize = "12px";
        badge.style.color = "#1f2937";
        header.appendChild(badge);
      }
    }

    const body = document.createElement("div");
    body.className = "u-stack";

    if (isFilled(sqUrl)) {
      const a = window.UlydiaUI.bannerSquare({ href: safeUrl(linkUrl) || "#", target: "_blank", rel: "noopener" });
      const img = document.createElement("img");
      img.className = "mp-sqimg";
      img.alt = sponsorName ? `Sponsor: ${sponsorName}` : "Sponsor";
      img.src = safeUrl(sqUrl);
      a.appendChild(img);
      body.appendChild(a);
    }

    const btn = document.createElement("a");
    btn.className = "u-btn u-btn--primary";
    btn.textContent = "Visit sponsor";
    btn.href = safeUrl(linkUrl) || "#";
    btn.target = "_blank";
    btn.rel = "noopener";
    body.appendChild(btn);

    card.appendChild(body);
    return card;
  }

  function infoCard(countryIso, hasBloc){
    const card = window.UlydiaUI.card("Country", "mp-grad");
    const body = document.createElement("div");
    body.className = "u-stack";
    const p = document.createElement("div");
    p.innerHTML = `<div style="color:var(--ul-muted); font-size:12px">ISO: <b style="color:var(--ul-text)">${esc(countryIso || "—")}</b></div>`;
    const p2 = document.createElement("div");
    p2.style.color = "var(--ul-muted)";
    p2.style.fontSize = "12px";
    p2.textContent = hasBloc ? "Country-specific data available" : "No country-specific data yet";
    body.appendChild(p);
    body.appendChild(p2);
    card.appendChild(body);
    return card;
  }

  function debugCard(title, obj){
    const card = window.UlydiaUI.card(title, "mp-grad");
    const pre = document.createElement("div");
    pre.className = "mp-debug";
    try{
      const base = unwrap(obj);
      const fields = (base && base.fields && typeof base.fields === "object") ? base.fields : base;
      pre.textContent = JSON.stringify({ keys: Object.keys(fields || {}), sample: fields }, null, 2).slice(0, 8000);
    }catch(e){
      pre.textContent = String(e);
    }
    card.appendChild(pre);
    return card;
  }

  function renderPaysBlocCards(bloc){
    const b = unwrap(bloc);
    const base = (b && b.fields && typeof b.fields === "object") ? b.fields : b;

    const map = [
      ["Formation", "formation_bloc"],
      ["Access", "acces_bloc"],
      ["Salary", "salaire_bloc"],
      ["Market", "marche_bloc"],
      ["Top fields", "Top_fields"],
      ["Certifications", "Certifications"],
      ["Schools or paths", "Schools_or_paths"],
      ["Equivalences / reconversion", "Equivalences_reconversion"],
      ["Entry routes", "Entry_routes"],
      ["First job titles", "First_job_titles"],
      ["Typical employers", "Typical_employers"],
      ["Portfolio projects", "Portfolio_projects"],
      ["Skills (must-have)", "Skills_must_have"],
      ["Soft skills", "Soft_skills"],
      ["Tools stack", "Tools_stack"],
      ["Time to employability", "Time_to_employability"],
      ["Hiring sectors", "Hiring_sectors"],
      ["Degrees examples", "Degrees_examples"],
      ["Growth outlook", "Growth_outlook"],
      ["Market demand", "Market_demand"],
      ["Education level", "education_level"],
      ["Salary notes", "salary_notes"],
    ];

    const out = [];
    for (const [label, key] of map){
      const html = toHtml(base[key] ?? base[key.toLowerCase()]);
      if (isFilled(html)) out.push(sectionCard(label, html));
    }
    return out.filter(Boolean);
  }

  // -----------------------------
  // Main render
  // -----------------------------
  function render(data){
    const metier = unwrap(data.metier || {});
    const pays = unwrap(data.pays || {});
    const sponsor = unwrap(data.sponsor || {});

    const iso = String(data.iso || pays.code_iso || pays.iso || qp("country") || "").toUpperCase();
    const slug = detectSlug();

    // Title + tagline
    const titleCMS = pickF(metier, "Nom", "nom", "name", "title", "titre");
    const title = humanTitle(titleCMS, slug);
    const accroche = String(pickF(metier, "accroche", "tagline") || "").trim();

    // Rich fields
    const htmlDescription = toHtml(pickF(metier, "description", "Description"));
    const htmlMissions = toHtml(pickF(metier, "missions", "Missions"));
    const htmlCompetences = toHtml(pickF(metier, "Compétences", "Competences", "competences"));
    const htmlEnv = toHtml(pickF(metier, "environnements", "Environnements"));
    const htmlProfil = toHtml(pickF(metier, "profil_recherche", "Profil_recherche", "profilRecherche"));
    const htmlEvol = toHtml(pickF(metier, "evolutions_possibles", "Evolutions_possibles", "evolutions"));

    // Banner logic (compatible with existing Worker payload)
    const active = sponsorIsActive((sponsor && sponsor.fields) ? sponsor.fields : sponsor);

    // Sponsor URLs
    let wideUrl = active
      ? (pickF(sponsor, "sponsor_logo_2", "logo_2", "logo_wide", "sponsor_logo_2") || "")
      : (pays?.banners?.wide || pickF(pays, "banner_wide", "banniere_wide") || "");

    let sqUrl = active
      ? (pickF(sponsor, "sponsor_logo_1", "logo_1", "logo_square", "sponsor_logo_1") || "")
      : (pays?.banners?.square || pickF(pays, "banner_square", "banniere_square") || "");

    let linkUrl = active
      ? (pickF(sponsor, "lien_sponsor", "sponsor_link", "link", "url") || "")
      : (pays?.banners?.link || "/sponsorship");

    // Preview overrides
    if (PREVIEW.on) {
      if (isHttpUrl(PREVIEW.landscape)) wideUrl = PREVIEW.landscape;
      if (isHttpUrl(PREVIEW.square)) sqUrl = PREVIEW.square;
      if (isHttpUrl(PREVIEW.link)) linkUrl = PREVIEW.link;
    }

    wideUrl = withCacheBust(wideUrl);
    sqUrl = withCacheBust(sqUrl);

    // bloc pays optional
    const bloc0 = Array.isArray(data.blocs_pays) && data.blocs_pays.length ? data.blocs_pays[0] : null;
    const bloc = bloc0 ? unwrap(bloc0) : null;
    const blocExists = !!bloc0;

    // Build UI
    ROOT.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "mp-wrap";

    // Hero header
    const hero = document.createElement("div");
    hero.className = "mp-hero";

    const left = document.createElement("div");
    const h1 = document.createElement("h1");
    h1.className = "mp-title";
    h1.textContent = title;

    const tagline = document.createElement("div");
    tagline.className = "mp-tagline";
    tagline.textContent = accroche || "";

    const meta = document.createElement("div");
    meta.className = "mp-meta";
    meta.innerHTML = `Country: <b>${esc(iso || "—")}</b> · Language: <b>${esc(String(pickF(pays, "lang_finale", "lang", "language") || "").toLowerCase() || "—")}</b>`;

    left.appendChild(h1);
    if (isFilled(accroche)) left.appendChild(tagline);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "u-row";

    // optional quick actions
    const homeA = document.createElement("a");
    homeA.className = "u-btn u-btn--secondary";
    homeA.textContent = "Home";
    homeA.href = "/";

    const myA = document.createElement("a");
    myA.className = "u-btn u-btn--secondary";
    myA.textContent = "My account";
    myA.href = "/my-account";

    right.appendChild(homeA);
    right.appendChild(myA);

    hero.appendChild(left);
    hero.appendChild(right);

    // Search bar (country not selectable)
    const search = document.createElement("div");
    search.className = "mp-search";

    const pill = document.createElement("div");
    pill.className = "mp-pill";
    pill.innerHTML = `Country: <b>${esc(iso || "—")}</b>`;

    const input = document.createElement("input");
    input.className = "mp-input";
    input.type = "text";
    input.placeholder = "Search a job…";
    input.value = title;

    const btn = document.createElement("button");
    btn.className = "u-btn u-btn--primary";
    btn.textContent = "Search";
    btn.type = "button";
    btn.addEventListener("click", () => {
      // This is a UI-only stub. You can wire to your job list endpoint later.
      const v = (input.value || "").trim();
      if (!v) return;
      // If user typed a slug, go directly; otherwise keep same page.
      // (You can replace with an autocomplete list later.)
      const maybeSlug = v.toLowerCase().includes("-") ? v : "";
      if (maybeSlug) {
        const u = new URL(location.href);
        u.searchParams.set("metier", maybeSlug);
        if (iso) u.searchParams.set("country", iso);
        location.href = u.toString();
      }
    });

    search.appendChild(pill);
    search.appendChild(input);
    search.appendChild(btn);

    // Wide banner under search bar
    let wideBanner = null;
    if (isFilled(wideUrl)) {
      const a = window.UlydiaUI.bannerWide({ href: safeUrl(linkUrl) || "#", target: "_blank", rel: "noopener" });
      const img = document.createElement("img");
      img.alt = "Sponsor";
      img.src = safeUrl(wideUrl);
      a.appendChild(img);
      wideBanner = a;
    }

    // Main grid
    const grid = document.createElement("div");
    grid.className = "mp-grid";

    const colL = document.createElement("div");
    colL.className = "u-stack";

    const colR = document.createElement("div");
    colR.className = "u-stack";

    // Sections from CMS
    const sections = [];
    sections.push(sectionCard("Overview", htmlDescription));
    sections.push(sectionCard("Missions", htmlMissions));
    sections.push(sectionCard("Compétences", htmlCompetences));
    sections.push(sectionCard("Environnements", htmlEnv));
    sections.push(sectionCard("Profil recherché", htmlProfil));
    sections.push(sectionCard("Évolutions possibles", htmlEvol));

    const visibleSections = sections.filter(Boolean);
    if (visibleSections.length) {
      visibleSections.forEach(s => colL.appendChild(s));
    } else {
      // Show a single info card + optional debug keys
      const empty = window.UlydiaUI.card("Content", "mp-grad");
      const body = document.createElement("div");
      body.style.color = "var(--ul-muted)";
      body.textContent = "No job sections found in the CMS for this page yet.";
      empty.appendChild(body);
      colL.appendChild(empty);

      if (DEBUG) colL.appendChild(debugCard("Debug: metier keys", metier));
    }

    // Country-specific bloc cards (optional)
    if (blocExists) {
      const bc = window.UlydiaUI.card("Country specifics", "mp-grad");
      const body = document.createElement("div");
      body.style.color = "var(--ul-muted)";
      body.style.marginBottom = "10px";
      body.textContent = "Country-specific content for this job";
      bc.appendChild(body);
      colL.appendChild(bc);

      renderPaysBlocCards(bloc0).forEach(c => colL.appendChild(c));
    }

    // Right column
    const sponsorName = String(pickF(sponsor, "sponsor_name", "name") || "Sponsor").trim();
    colR.appendChild(sponsorCard({ sponsorName, sqUrl, linkUrl, activeLabel: active ? "Active" : "" }));
    colR.appendChild(infoCard(iso, blocExists));

    grid.appendChild(colL);
    grid.appendChild(colR);

    // Assemble
    wrap.appendChild(hero);
    wrap.appendChild(search);
    if (wideBanner) wrap.appendChild(wideBanner);
    wrap.appendChild(grid);

    ROOT.appendChild(wrap);
  }

  // -----------------------------
  // Error UI (reuses UlydiaUI if available)
  // -----------------------------
  function renderError(err){
    ROOT.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "mp-wrap";

    const title = document.createElement("div");
    title.style.fontWeight = "900";
    title.style.fontSize = "18px";
    title.style.color = "var(--ul-primary)";
    title.textContent = "Could not render this job page";

    const msg = document.createElement("div");
    msg.style.marginTop = "8px";
    msg.style.color = "#991b1b";
    msg.style.fontWeight = "800";
    msg.textContent = String(err && err.message ? err.message : err);

    const tip = document.createElement("div");
    tip.style.marginTop = "10px";
    tip.style.color = "var(--ul-muted)";
    tip.textContent = "Tip: /metier?metier=SLUG&country=FR (preview: add &preview=1)";

    const card = document.createElement("div");
    card.className = "u-card";
    card.appendChild(title);
    card.appendChild(msg);
    card.appendChild(tip);

    wrap.appendChild(card);
    ROOT.appendChild(wrap);

    console.error("[metier-page]", err);
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function main(){
    await ensureUlydiaUI();
    injectMetierCSS();

    // show a minimal loader
    ROOT.innerHTML = `<div class="mp-wrap"><div class="u-card"><div style="font-weight:900">Loading…</div><div style="color:var(--ul-muted); margin-top:6px">metier-page v4.0</div></div></div>`;

    const data = await getMetierData();
    log("payload keys", Object.keys(data || {}));
    render(data || {});
  }

  main().catch(renderError);
})();
