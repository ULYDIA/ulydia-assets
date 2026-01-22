/* metier-page.v11.0.js — Ulydia
   - Full-code job page (design based on propal1-fiche metier.html)
   - Filters: country (catalog.json), sector (window.__ULYDIA_SECTEURS__), metier autocomplete (window.__ULYDIA_METIERS__)
   - Banners: sponsor if provided by API, else fallback per country from catalog.json
   - Auto-detect wide vs square by image aspect ratio (prevents inversion)
*/
(() => {
  "use strict";
  if (window.__ULYDIA_METIER_PAGE_V11__) return;
  window.__ULYDIA_METIER_PAGE_V11__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier-v11]", ...a); };

  // =========================
  // CONFIG
  // =========================
  const ASSETS_ORIGIN = "https://ulydia-assets.pages.dev";
  const CATALOG_URL = `${ASSETS_ORIGIN}/assets/catalog.json`;

  // Optional: if you have the worker endpoint already
  const WORKER_URL = window.__ULYDIA_WORKER_URL__ || "https://ulydia-business.contact-871.workers.dev";
  const METIER_API_PATH = "/v1/metier-page"; // GET ?slug=...&iso=...

  // =========================
  // Helpers
  // =========================
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const pickStr = (...vals) => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  const pickUrl = (v) => {
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v)) return pickUrl(v[0]);
    if (typeof v === "object") {
      // Webflow image field / CMS image objects often contain "url"
      return pickStr(v.url, v.src, v.href, v.file?.url, v.image?.url);
    }
    return "";
  };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function detectISO() {
    const u = new URL(location.href);
    const iso = pickStr(u.searchParams.get("iso"), window.__ULYDIA_ISO__, "");
    return (iso || "FR").toUpperCase();
  }
  function detectSlug() {
    const u = new URL(location.href);
    return pickStr(u.searchParams.get("slug"), "");
  }

  async function fetchJSON(url) {
    const r = await fetch(url, { credentials: "omit", cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
    return await r.json();
  }

  async function fetchMetierPayload({ slug, iso }) {
    if (!slug) return null;
    const url = `${WORKER_URL}${METIER_API_PATH}?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
    try {
      const data = await fetchJSON(url);
      return data;
    } catch (e) {
      log("metier api failed (using placeholders)", e);
      return null;
    }
  }

  // =========================
  // CSS + Shell HTML
  // =========================
  const CSS = `
:root{
  --bg:#ffffff;
  --card:#ffffff;
  --text:#0f172a;
  --muted:#64748b;
  --border:#e2e8f0;
  --primary:#6366f1;
  --radius-sm:10px;
  --radius-md:14px;
  --radius-lg:20px;
  --shadow-card:0 4px 20px rgba(0,0,0,0.08);
}
*{box-sizing:border-box}
.ul-hidden{display:none!important}
.card{background:var(--card);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);border:1px solid var(--border);padding:24px;transition:all .3s ease}
.card:hover{box-shadow:0 8px 30px rgba(0,0,0,0.12);transform:translateY(-2px)}
.card-header{padding:16px 20px;border-radius:var(--radius-md) var(--radius-md) 0 0;margin:-24px -24px 20px -24px}
.section-title{font-weight:700;font-size:17px;color:var(--text);letter-spacing:-.02em;display:flex;align-items:center;gap:10px}
.pastel-blue{background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)}
.pastel-green{background:linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%)}
.pastel-purple{background:linear-gradient(135deg,#e9d5ff 0%,#d8b4fe 100%)}
.pastel-orange{background:linear-gradient(135deg,#fed7aa 0%,#fdba74 100%)}
.pastel-pink{background:linear-gradient(135deg,#fce7f3 0%,#fbcfe8 100%)}
.pastel-cyan{background:linear-gradient(135deg,#cffafe 0%,#a5f3fc 100%)}
.sponsor-banner-wide{
  width:680px;height:120px;max-width:100%;
  border-radius:var(--radius-lg);overflow:hidden;position:relative;
  cursor:pointer;transition:transform .3s ease;margin-bottom:32px;
  border:1px solid var(--border);background:#f8fafc;
}
.sponsor-banner-wide:hover{transform:scale(1.02);}
.sponsor-banner-wide img{width:100%;height:100%;object-fit:cover;display:block}
.sponsor-logo-square{
  width:300px;height:300px;max-width:100%;
  border-radius:var(--radius-lg);background:#fff;
  display:flex;align-items:center;justify-content:center;
  padding:24px;box-shadow:var(--shadow-card);border:1px solid var(--border);
  overflow:hidden;
}
.sponsor-logo-square img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.rich-content p{margin:10px 0;color:var(--text);line-height:1.6}
.rich-content h4{margin:18px 0 10px;font-weight:700;color:var(--text)}
.rich-content ul{margin:12px 0;padding:0;list-style:none}
.rich-content li{margin:8px 0;padding-left:24px;position:relative;color:var(--text);line-height:1.55}
.rich-content li:before{content:"→";position:absolute;left:0;color:var(--primary);font-weight:700}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 24px;height:48px;border-radius:var(--radius-md);font-weight:600;font-size:15px;border:none;cursor:pointer;transition:all .2s ease;text-decoration:none}
.btn-primary{background:var(--primary);color:#fff}
.btn-primary:hover{background:#4f46e5;transform:translateY(-2px);box-shadow:0 8px 20px rgba(99,102,241,.3)}
.faq-icon{transition:transform .3s ease}
.faq-answer{animation:slideDown .3s ease-out}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
`;

  function injectCSS() {
    if (qs("#ul-metier-style")) return;
    const st = document.createElement("style");
    st.id = "ul-metier-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function ensureRoot() {
    let root = qs("#ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.prepend(root);
    }
    return root;
  }

  function renderShell(root) {
    // Tailwind-like utility classes are kept in markup, but we rely on our CSS variables for key styling.
    root.innerHTML = `
<div class="w-full h-full" style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);">
  <!-- Barre de Filtres -->
  <div class="w-full" style="background: white; border-bottom: 2px solid var(--border); box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <div class="max-w-[1200px] mx-auto px-6 py-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Filtre Pays -->
        <div class="relative">
          <label for="filter-pays" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🌍 Pays / Région </label>
          <div class="relative">
            <select id="filter-pays" class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer transition-all" style="border-color: var(--border); color: var(--text); background: white;">
              <option value="">Tous les pays</option>
            </select>
            <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        </div>

        <!-- Filtre Secteur -->
        <div class="relative">
          <label for="filter-secteur" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🏢 Secteur d'activité </label>
          <div class="relative">
            <select id="filter-secteur" class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer transition-all" style="border-color: var(--border); color: var(--text); background: white;">
              <option value="">Tous les secteurs</option>
            </select>
            <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        </div>

        <!-- Recherche Metier -->
        <div class="relative">
          <label for="filter-metier" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🔍 Rechercher un métier </label>
          <div class="relative">
            <input type="text" id="filter-metier" placeholder="Ex: Développeur, Designer, Chef de projet." class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium transition-all" style="border-color: var(--border); color: var(--text); background: white;" autocomplete="off">
            <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /> <path d="m21 21-4.35-4.35" /></svg>
            </div>
            <div id="metier-suggestions" class="absolute top-full left-0 right-0 mt-2 rounded-lg border-2 overflow-hidden z-50 ul-hidden" style="border-color: var(--border); background: white; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 320px; overflow-y: auto;"></div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <button id="reset-filters" class="text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-lg transition-all" style="color: var(--muted);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /> <path d="M21 3v5h-5" /> <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /> <path d="M8 16H3v5" /></svg>
          Réinitialiser
        </button>
        <div class="text-xs" style="color: var(--muted);">
          Résultats: <span id="result-count" class="font-bold" style="color: var(--text);">—</span>
        </div>
      </div>
    </div>
  </div>

  <main class="max-w-[1200px] mx-auto px-6 py-10">
    <!-- Top title + sponsor wide banner -->
    <div class="flex flex-col gap-3 mb-6">
      <h1 id="nom-metier" class="text-3xl font-extrabold" style="color: var(--text); letter-spacing: -0.02em;">—</h1>
      <p id="accroche-metier" class="text-base" style="color: var(--muted); max-width: 900px;">—</p>
    </div>

    <a id="sponsor-banner-link" href="#" target="_blank" rel="noopener noreferrer" class="sponsor-banner-wide ul-hidden">
      <img id="sponsor-banner-img" alt="Sponsor banner" />
    </a>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main content -->
      <div class="lg:col-span-2 space-y-8">
        <div class="card">
          <div class="card-header pastel-blue">
            <h2 id="description-title" class="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Vue d'ensemble
            </h2>
          </div>
          <div id="description-body" class="rich-content"><p>Chargement…</p></div>
        </div>

        <div class="card">
          <div class="card-header pastel-green">
            <h2 id="missions-title" class="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Missions principales
            </h2>
          </div>
          <div id="missions-body" class="rich-content"><p>—</p></div>
        </div>

        <div class="card">
          <div class="card-header pastel-purple">
            <h2 id="competences-title" class="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              Compétences clés
            </h2>
          </div>
          <div id="competences-body" class="rich-content"><p>—</p></div>
        </div>

        <div class="card">
          <div class="card-header pastel-orange">
            <h2 id="evolutions-title" class="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M3 3v18h18"></path><path d="M7 13l3 3 7-7"></path></svg>
              Évolutions possibles
            </h2>
          </div>
          <div id="evolutions-body" class="rich-content"><p>—</p></div>
        </div>

        <!-- FAQ -->
        <div class="card" id="faq-card">
          <div class="card-header" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
            <h2 id="faq-title" class="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Questions fréquentes
            </h2>
          </div>
          <div id="faq-body" class="space-y-3"></div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <div class="card">
          <div class="card-header" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
            <h3 class="section-title text-sm">🤝 Partenaire</h3>
          </div>

          <a id="sponsor-logo-link" href="#" target="_blank" rel="noopener noreferrer" style="display:block;">
            <div class="sponsor-logo-square">
              <img id="sponsor-logo-img" alt="Sponsor logo" />
            </div>
            <div class="text-center mt-4">
              <p id="sponsor-name-sidebar" class="font-bold text-base" style="color: var(--text);">—</p>
              <p class="text-sm mt-1" style="color: var(--muted);">Partenaire du métier</p>
            </div>
          </a>

          <div class="mt-5 text-center">
            <a id="sponsor-cta" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Découvrir</a>
          </div>
        </div>

        <div class="card">
          <div class="card-header pastel-cyan">
            <h3 class="section-title text-sm">📌 Infos</h3>
          </div>
          <div class="text-sm" style="color: var(--muted); line-height:1.6">
            <div>ISO: <strong id="sidebar-iso" style="color: var(--text);">—</strong></div>
            <div>Secteur: <strong id="sidebar-secteur" style="color: var(--text);">—</strong></div>
            <div>Slug: <strong id="sidebar-slug" style="color: var(--text);">—</strong></div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;
  }

  // =========================
  // Data sources
  // =========================
  function getMetiers() {
    const arr = window.__ULYDIA_METIERS__ || [];
    return Array.isArray(arr) ? arr : [];
  }
  function getSecteurs() {
    const arr = window.__ULYDIA_SECTEURS__ || [];
    return Array.isArray(arr) ? arr : [];
  }

  function metierLabel(m) {
    const f = m?.fieldData || m?.fields || m || {};
    return pickStr(f.nom, f.name, f.title, m.name, m.title, m.slug, "");
  }
  function metierSlug(m) {
    const f = m?.fieldData || m?.fields || m || {};
    return pickStr(m.slug, f.slug, "");
  }
  function metierSecteurSlug(m) {
    const f = m?.fieldData || m?.fields || m || {};
    return pickStr(f.secteur_slug, f["secteur-slug"], f.secteur, f["secteur"], "");
  }

  // =========================
  // UI helpers
  // =========================
  function setFocusRing(el, on) {
    if (!el) return;
    if (on) {
      el.style.borderColor = "var(--primary)";
      el.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
    } else {
      el.style.borderColor = "var(--border)";
      el.style.boxShadow = "none";
    }
  }

  function renderCountries(selectEl, countries, selectedISO) {
    // Keep "Tous les pays" at top
    const opts = countries
      .slice()
      .sort((a,b)=>String(a.label||"").localeCompare(String(b.label||""), "fr"))
      .map(c => `<option value="${esc(c.iso)}"${String(c.iso).toUpperCase()===selectedISO?" selected":""}>${esc(c.label||c.iso)}</option>`)
      .join("");
    selectEl.insertAdjacentHTML("beforeend", opts);
  }

  function renderSecteurs(selectEl, secteurs) {
    const opts = secteurs
      .slice()
      .sort((a,b)=>String(a.name||a.label||a.slug||"").localeCompare(String(b.name||b.label||b.slug||""), "fr"))
      .map(s => {
        const f = s?.fieldData || s?.fields || s || {};
        const slug = pickStr(s.slug, f.slug, "");
        const label = pickStr(f.nom, f.name, f.label, s.name, slug);
        return `<option value="${esc(slug)}">${esc(label)}</option>`;
      })
      .join("");
    selectEl.insertAdjacentHTML("beforeend", opts);
  }

  function filterMetiersForSuggest({ query, secteurSlug }) {
    const q = String(query||"").trim().toLowerCase();
    if (q.length < 2) return [];
    const items = getMetiers();
    let res = items.filter(m => metierLabel(m).toLowerCase().includes(q));
    if (secteurSlug) res = res.filter(m => String(metierSecteurSlug(m)||"") === String(secteurSlug));
    // de-dup by slug
    const seen = new Set();
    res = res.filter(m => {
      const s = metierSlug(m);
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    });
    return res.slice(0, 12);
  }

  function showSuggestions(container, items, onPick) {
    if (!container) return;
    if (!items || items.length === 0) {
      container.innerHTML = `<div class="px-4 py-3 text-sm" style="color: var(--muted);">Aucun métier trouvé</div>`;
      container.classList.remove("ul-hidden");
      return;
    }
    container.innerHTML = items.map(m => {
      const name = metierLabel(m);
      const slug = metierSlug(m);
      return `
      <div class="ul-suggestion px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 text-sm font-medium" style="color: var(--text); border-bottom: 1px solid var(--border);" data-slug="${esc(slug)}" data-name="${esc(name)}">
        <div class="flex items-center justify-between">
          <span>${esc(name)}</span>
        </div>
      </div>`;
    }).join("");
    container.classList.remove("ul-hidden");
    qsa(".ul-suggestion", container).forEach(el => {
      el.addEventListener("click", () => onPick(el.getAttribute("data-slug")||"", el.getAttribute("data-name")||""));
    });
  }

  function wireFAQ(root) {
    qsa(".faq-question", root).forEach(btn => {
      btn.addEventListener("click", function() {
        const item = this.closest(".faq-item");
        if (!item) return;
        const ans = qs(".faq-answer", item);
        const icon = qs(".faq-icon", item);
        const isOpen = ans && !ans.classList.contains("ul-hidden");

        // close others
        qsa(".faq-item", root).forEach(other => {
          if (other === item) return;
          const a = qs(".faq-answer", other);
          const i = qs(".faq-icon", other);
          const q = qs(".faq-question", other);
          if (a) a.classList.add("ul-hidden");
          if (i) i.style.transform = "rotate(0deg)";
          if (q) q.style.borderColor = "var(--border)";
        });

        if (!ans) return;
        if (isOpen) {
          ans.classList.add("ul-hidden");
          if (icon) icon.style.transform = "rotate(0deg)";
          this.style.borderColor = "var(--border)";
        } else {
          ans.classList.remove("ul-hidden");
          if (icon) icon.style.transform = "rotate(180deg)";
          this.style.borderColor = "var(--primary)";
        }
      });
    });
  }

  function renderFAQ(root, faqs) {
    const box = qs("#faq-body", root);
    const card = qs("#faq-card", root);
    if (!box || !card) return;
    if (!faqs || faqs.length === 0) {
      card.classList.add("ul-hidden");
      return;
    }
    card.classList.remove("ul-hidden");
    box.innerHTML = faqs.map(f => `
<div class="faq-item">
  <button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
    <div class="flex items-start gap-3 flex-1">
      <span class="text-xl flex-shrink-0">❓</span>
      <span class="font-semibold text-sm" style="color: var(--text);">${esc(f.q)}</span>
    </div>
    <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
  </button>
  <div class="faq-answer ul-hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
    ${f.a_html || `<p>${esc(f.a||"")}</p>`}
  </div>
</div>`).join("");
    wireFAQ(root);
  }

  // =========================
  // Banner logic (auto wide/square)
  // =========================
  async function loadImgMeta(url) {
    return await new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function resolveWideSquare(imgA, imgB) {
    const a = await loadImgMeta(imgA);
    const b = await loadImgMeta(imgB);
    const arA = a && a.h ? a.w / a.h : 0;
    const arB = b && b.h ? b.w / b.h : 0;

    // Choose wide = highest aspect ratio; square = lowest (fallback: keep given order)
    if (arA && arB) {
      if (arA >= arB) return { wide: imgA, square: imgB };
      return { wide: imgB, square: imgA };
    }
    // If only one has meta, pick it if it is wide-ish
    if (arA) return (arA > 1.2) ? { wide: imgA, square: imgB } : { wide: imgB, square: imgA };
    if (arB) return (arB > 1.2) ? { wide: imgB, square: imgA } : { wide: imgA, square: imgB };
    return { wide: imgA, square: imgB };
  }

  function applyBanners(root, { wideUrl, squareUrl, linkUrl, sponsorName }) {
    const bannerA = qs("#sponsor-banner-link", root);
    const bannerImg = qs("#sponsor-banner-img", root);
    const logoA = qs("#sponsor-logo-link", root);
    const logoImg = qs("#sponsor-logo-img", root);
    const cta = qs("#sponsor-cta", root);

    const sidebarName = qs("#sponsor-name-sidebar", root);
    if (sidebarName) sidebarName.textContent = sponsorName || "Partenaire";

    const href = linkUrl || "#";
    [bannerA, logoA, cta].forEach(a => { if (a) a.href = href; });

    if (bannerA && bannerImg && wideUrl) {
      bannerImg.src = wideUrl;
      bannerA.classList.remove("ul-hidden");
    } else if (bannerA) {
      bannerA.classList.add("ul-hidden");
    }

    if (logoA && logoImg && squareUrl) {
      logoImg.src = squareUrl;
      logoA.classList.remove("ul-hidden");
    } else if (logoA) {
      logoA.classList.add("ul-hidden");
    }
  }

  // =========================
  // Fill page content
  // =========================
  function setHTML(el, html) { if (el) el.innerHTML = html; }
  function setText(el, txt) { if (el) el.textContent = txt; }

  function toRichHTML(input) {
    // Accept either:
    // - already HTML
    // - plain text with line breaks -> paragraphs
    if (!input) return "";
    const s = String(input);
    if (/<[a-z][\s\S]*>/i.test(s)) return s; // contains HTML tags
    return s.split(/\n{2,}/).map(p => `<p>${esc(p.trim())}</p>`).join("");
  }

  function normalizePayload(payload) {
    // Support multiple shapes:
    // payload.metier, payload.pays, payload.faq
    const metier = payload?.metier || payload?.job || payload?.data?.metier || {};
    const pays = payload?.pays || payload?.country || payload?.data?.pays || {};
    const sponsor = payload?.sponsor || metier?.sponsor || payload?.data?.sponsor || {};
    const faqs = payload?.faq || payload?.faqs || metier?.faq || [];
    return { metier, pays, sponsor, faqs };
  }

  function extractSponsorBanners({ sponsor, paysCatalog }) {
    // Sponsor has priority if it contains logos
    const link = pickStr(sponsor?.link, sponsor?.url, sponsor?.website, sponsor?.cta, "");
    const sponsorName = pickStr(sponsor?.name, sponsor?.nom, sponsor?.company, "");

    const sWide = pickUrl(sponsor?.logo_2 || sponsor?.logo_wide || sponsor?.wide);
    const sSquare = pickUrl(sponsor?.logo_1 || sponsor?.logo_square || sponsor?.square);

    if (sWide || sSquare) {
      return { imgA: sWide, imgB: sSquare, linkUrl: link, sponsorName: sponsorName || "Sponsor" };
    }

    // Fallback: per-country banners from catalog
    const cWide = pickUrl(paysCatalog?.banners?.image_2 || paysCatalog?.banners?.wide);
    const cSquare = pickUrl(paysCatalog?.banners?.image_1 || paysCatalog?.banners?.square);
    const cta = pickStr(paysCatalog?.banners?.cta, "");
    const cText = pickStr(paysCatalog?.banners?.texte, "");
    const fallbackLink = pickStr(cta, link, "#");
    const fallbackName = pickStr(cText, sponsorName, "Sponsoriser ce métier");
    return { imgA: cWide, imgB: cSquare, linkUrl: fallbackLink, sponsorName: fallbackName };
  }

  // =========================
  // Main
  // =========================
  async function main() {
    injectCSS();
    const root = ensureRoot();
    renderShell(root);

    const iso = detectISO();
    const slug = detectSlug();
    setText(qs("#sidebar-iso", root), iso);
    setText(qs("#sidebar-slug", root), slug || "—");

    // Load catalog (countries + banners)
    let catalog = null;
    try {
      catalog = await fetchJSON(`${CATALOG_URL}?v=${Date.now()}`);
    } catch (e) {
      console.error("[metier-v11] catalog load failed", e);
      catalog = { countries: [] };
    }
    const countries = catalog?.countries || [];
    const selectedCountry = countries.find(c => String(c.iso||"").toUpperCase() === iso) || null;

    // Populate selects
    const filterPays = qs("#filter-pays", root);
    const filterSecteur = qs("#filter-secteur", root);
    const metierInput = qs("#filter-metier", root);
    const suggBox = qs("#metier-suggestions", root);

    if (filterPays) renderCountries(filterPays, countries, iso);
    if (filterSecteur) renderSecteurs(filterSecteur, getSecteurs());

    // Default sidebar secteur if possible from current metier
    if (slug) {
      const m = getMetiers().find(x => metierSlug(x) === slug);
      if (m) setText(qs("#sidebar-secteur", root), metierSecteurSlug(m) || "—");
    }

    // Focus rings
    [filterPays, filterSecteur, metierInput].forEach(el => {
      if (!el) return;
      el.addEventListener("focus", ()=>setFocusRing(el,true));
      el.addEventListener("blur", ()=>setFocusRing(el,false));
    });

    // Autocomplete
    if (metierInput) {
      metierInput.addEventListener("input", (e) => {
        const query = e.target.value;
        const secteur = filterSecteur ? filterSecteur.value : "";
        const items = filterMetiersForSuggest({ query, secteurSlug: secteur });
        showSuggestions(suggBox, items, (slugPick, namePick) => {
          metierInput.value = namePick;
          if (suggBox) suggBox.classList.add("ul-hidden");
          const isoPick = filterPays ? (filterPays.value || iso) : iso;
          const u = new URL(location.href);
          u.searchParams.set("iso", isoPick);
          u.searchParams.set("slug", slugPick);
          location.href = u.toString();
        });
      });

      document.addEventListener("click", (e) => {
        if (!suggBox || !metierInput) return;
        if (!metierInput.contains(e.target) && !suggBox.contains(e.target)) {
          suggBox.classList.add("ul-hidden");
        }
      });
    }

    // Apply filters actions
    function applyFiltersUI() {
      const pays = filterPays ? filterPays.value : iso;
      const secteur = filterSecteur ? filterSecteur.value : "";
      const query = metierInput ? metierInput.value : "";
      // result count: simply number of matching metiers (demo, but useful)
      let items = getMetiers();
      if (secteur) items = items.filter(m => String(metierSecteurSlug(m)||"") === String(secteur));
      // we do not have per-country availability in metiers dataset -> keep count as sector count
      const countEl = qs("#result-count", root);
      if (countEl) countEl.textContent = String(items.length || 0);
      log("filters", { pays, secteur, query });
    }

    if (filterPays) filterPays.addEventListener("change", () => {
      applyFiltersUI();
      const u = new URL(location.href);
      u.searchParams.set("iso", filterPays.value || iso);
      // do not change slug here (keep current page)
      history.replaceState({}, "", u.toString());
    });
    if (filterSecteur) filterSecteur.addEventListener("change", applyFiltersUI);

    const resetBtn = qs("#reset-filters", root);
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (filterPays) filterPays.value = iso;
        if (filterSecteur) filterSecteur.value = "";
        if (metierInput) metierInput.value = "";
        if (suggBox) suggBox.classList.add("ul-hidden");
        applyFiltersUI();
      });
    }

    applyFiltersUI();

    // Fetch job payload (optional)
    const payload = await fetchMetierPayload({ slug, iso });
    const normalized = payload ? normalizePayload(payload) : { metier:{}, pays:{}, sponsor:{}, faqs:[] };

    // Title + accroche
    const defaultName = slug ? slug.replace(/-/g, " ") : "Fiche métier";
    setText(qs("#nom-metier", root), pickStr(normalized.metier?.name, normalized.metier?.nom, defaultName));
    setText(qs("#accroche-metier", root), pickStr(normalized.metier?.accroche, normalized.metier?.tagline, normalized.metier?.short, "Découvrez les missions, compétences et perspectives de ce métier."));

    // Content blocks (use payload fields if present, else placeholders)
    setHTML(qs("#description-body", root), toRichHTML(pickStr(normalized.metier?.description_html, normalized.metier?.description, normalized.metier?.overview, "")) || `<p>Contenu en cours de chargement / à compléter dans le CMS.</p>`);
    setHTML(qs("#missions-body", root), toRichHTML(pickStr(normalized.metier?.missions_html, normalized.metier?.missions, "")) || `<p>—</p>`);
    setHTML(qs("#competences-body", root), toRichHTML(pickStr(normalized.metier?.competences_html, normalized.metier?.competences, normalized.metier?.skills, "")) || `<p>—</p>`);
    setHTML(qs("#evolutions-body", root), toRichHTML(pickStr(normalized.metier?.evolutions_html, normalized.metier?.evolutions, normalized.metier?.careers, "")) || `<p>—</p>`);

    // FAQ
    const faqs = Array.isArray(normalized.faqs) ? normalized.faqs : [];
    const faqNorm = faqs.map(x => ({
      q: pickStr(x.question, x.q, x.title, ""),
      a: pickStr(x.answer, x.a, x.text, ""),
      a_html: toRichHTML(pickStr(x.answer_html, x.html, "")) || ""
    })).filter(x => x.q);
    renderFAQ(root, faqNorm);

    // Banners
    const { imgA, imgB, linkUrl, sponsorName } = extractSponsorBanners({ sponsor: normalized.sponsor, paysCatalog: selectedCountry });
    const resolved = await resolveWideSquare(imgA, imgB);
    log("resolved banners", resolved);

    applyBanners(root, { wideUrl: resolved.wide, squareUrl: resolved.square, linkUrl, sponsorName });
  }

  main().catch((e) => {
    console.error("[metier-v11] fatal", e);
  });
})();
