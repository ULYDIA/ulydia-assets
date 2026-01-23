/* metier-page.v12.9.js — Ulydia
   Fixes requested:
   ✅ Sponsor mapping STRICT:
      - sponsor_logo_2 => wide (top)
      - sponsor_logo_1 => square (sidebar)
      - lien_sponsor => click on both + CTA
   ✅ If no sponsor images, fallback to country banners from catalog.json
   ✅ If a banner image fails to load => auto fallback (avoid broken image frame)
   ✅ Metier_Pays_Bloc:
      - Hide ALL pays-bloc UI by default (KPI, salary grid, chips, etc.)
      - Show only if we find a bloc matching (slug, iso) (and optionally lang)
      - If no matching bloc => nothing from pays-bloc is shown (prevents wrong job data)
   ✅ FAQ: no flicker (hard hidden + cleared, shown only with data)
*/
window.__METIER_PAGE_BUILD__ = "metier-page v2026-01-23 FIX9 (unified loader + hide CMS sources + FAQ filter by metier)";
try { console.log("[metier-page]", window.__METIER_PAGE_BUILD__); } catch(e){}

(() => {
  // Version guard: allows new deploy to run even if an old script set a generic boot flag
  if (window.__ULYDIA_METIER_BOOT_VER__ === "2026-01-23-2205") return;
  window.__ULYDIA_METIER_BOOT_VER__ = "2026-01-23-2205";
  // Keep legacy flag for debugging only (do not block)
  window.__ULYDIA_METIER_BOOT__ = true;


  
  // =========================================================
  // HIDE CMS SOURCE LISTS (Webflow collection lists used as data feeders)
  // - Prevents raw items (e.g. all FAQs) from displaying on the page
  // - Looks for elements with helper classes like:
  //   js-metier-*, js-sector-*, js-country-*, js-faq-*
  // =========================================================
  function hideCmsSources(){
    try{
      const selectors = [
        "[class*='js-metier-']",
        "[class*='js-sector-']",
        "[class*='js-country-']",
        "[class*='js-faq-']"
      ];
      const nodes = document.querySelectorAll(selectors.join(","));
      const hidden = new Set();
      nodes.forEach(n=>{
        // Prefer to hide the whole CMS list wrapper
        const wrap =
          n.closest(".w-dyn-list-wrapper") ||
          n.closest(".w-dyn-list") ||
          n.closest(".w-dyn-items") ||
          n.closest(".w-dyn-item") ||
          null;
        if (wrap && !hidden.has(wrap)){
          wrap.style.display = "none";
          hidden.add(wrap);
        } else {
          // Fallback: hide the node itself
          n.style.display = "none";
        }
      });
    }catch(e){}
  }

// =========================================================
  // BOOT (anti-FOUC + unified loader)
  // - Avoids white screen: body stays visible; content hidden until ready
  // - Uses existing ulydia-ui.v2.js loader if present (showLoaderOverlay/hideLoaderOverlay)
  // =========================================================
  try { document.documentElement.classList.add("ul-metier-loading"); } catch(_){}

  (function injectBootStyle(){
    try{
      if (document.getElementById("ul-metier-boot-style")) return;
      var st = document.createElement("style");
      st.id = "ul-metier-boot-style";
      st.textContent =
        'body{opacity:1 !important;}' +'html.ul-metier-loading #ulydia-metier-root{opacity:0 !important;}' +'html.ul-metier-loading .ul-hide-while-loading{opacity:0 !important;}';
      document.head.appendChild(st);
    }catch(_){}
  })();

  // ---------------------------------------------------------
  // Loader (prefer ulydia-ui.v2.js overlay; fallback spinner if not ready)
  // ---------------------------------------------------------
  function ensureFallbackLoader(){
    try{
      if (document.getElementById("ul-metier-fallback-loader")) return;
      var st = document.getElementById("ul-metier-fallback-style");
      if (!st){
        st = document.createElement("style");
        st.id = "ul-metier-fallback-style";
        st.textContent =
          '.ul-metier-fallback{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.55);backdrop-filter:blur(2px);z-index:99999;}'+
          '.ul-metier-spinner{width:44px;height:44px;border-radius:999px;border:4px solid rgba(225,29,46,.18);border-top-color:#e11d2e;animation:ulspin .9s linear infinite;}'+
          '@keyframes ulspin{to{transform:rotate(360deg);}}';
        document.head.appendChild(st);
      }
      var d = document.createElement("div");
      d.id = "ul-metier-fallback-loader";
      d.className = "ul-metier-fallback";
      d.innerHTML = '<div class="ul-metier-spinner" aria-label="Loading"></div>';
      document.body.appendChild(d);
    }catch(_){}
  }

  function showLoader(){
    try{
      if (typeof showLoaderOverlay === "function") { showLoaderOverlay(); return; }
    }catch(_){}
    ensureFallbackLoader();
  }

  function hideLoader(){
    try{
      if (typeof hideLoaderOverlay === "function") { hideLoaderOverlay(); }
    }catch(_){}
    try{
      var d = document.getElementById("ul-metier-fallback-loader");
      if (d) d.remove();
    }catch(_){}
  }

  // show immediately once this script starts
  showLoader();

const ASSETS_BASE = "https://ulydia-assets.pages.dev/assets";
  const CATALOG_URL = `${ASSETS_BASE}/catalog.json`;

  const WORKER_URL   = (window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev").replace(/\/$/, "");
  const PROXY_SECRET = (window.ULYDIA_PROXY_SECRET || "ulydia_2026_proxy_Y4b364u2wsFsQL");

  const $ = (sel, root=document) => root.querySelector(sel);
  const $all = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function ensureLink(id, href) {
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet"; l.href = href;
    document.head.appendChild(l);
  }
  function ensureStyle(id, cssText) {
    let st = document.getElementById(id);
    if (!st) { st = document.createElement("style"); st.id = id; document.head.appendChild(st); }
    if (!st.textContent || st.textContent.length < 50) st.textContent = cssText;
  }
  function ensureScript(id, src) {
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id; s.src = src; s.async = true;
    s.onerror = () => console.warn("[metier.v12.4] failed to load", src);
    document.head.appendChild(s);
  }

  function overlayError(title, err) {
    try {
      const msg = err ? (err.stack || err.message || String(err)) : "";
      console.error("[metier.v12.4]", title, err);
      try{ hideLoader(); }catch(_){}
      try{ try{ var r=document.getElementById("ulydia-metier-root"); if(r) r.style.opacity="1"; }catch(_){ }
    document.documentElement.classList.remove("ul-metier-loading"); try{ var r=document.getElementById("ulydia-metier-root"); if(r) r.style.opacity="1"; }catch(_){ } }catch(_){ }

try {
  const h1 = document.getElementById("metier-title") || document.querySelector("h1");
  if (h1) h1.textContent = "Erreur de chargement";
  const a = document.getElementById("accroche-metier");
  if (a) a.textContent = "Impossible de charger la fiche métier. Ouvre la console / Network pour voir la cause (CORS, token, API Webflow…).";
} catch (_) {}
      let box = document.getElementById("ulydia-metier-error");
      if (!box) {
        box = document.createElement("pre");
        box.id = "ulydia-metier-error";
        box.style.position = "fixed";
        box.style.left = "12px";
        box.style.right = "12px";
        box.style.bottom = "12px";
        box.style.maxHeight = "40vh";
        box.style.overflow = "auto";
        box.style.zIndex = "999999";
        box.style.background = "rgba(17,24,39,.95)";
        box.style.color = "#fff";
        box.style.padding = "12px";
        box.style.borderRadius = "12px";
        box.style.font = "12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
        document.body.appendChild(box);
      }
      box.textContent = `[metier-page.v12.8] ${title}\n\n${msg}`;
    } catch(_) {}
  }


  // ---------------------------------------------------------
  // Centered loader overlay (white page background)
  // ---------------------------------------------------------
  function injectOverlayStylesOnce(){
    if (document.getElementById("ulydia_loader_styles")) return;
    const st = document.createElement("style");
    st.id = "ulydia_loader_styles";
    st.textContent = `
      .u-overlay{position:fixed;inset:0;z-index:999998;background:#fff;display:flex;align-items:center;justify-content:center}
      .u-overlayCard{display:flex;align-items:center;gap:14px;padding:18px 22px;border:1px solid rgba(15,23,42,.12);border-radius:16px;box-shadow:0 10px 30px rgba(2,6,23,.08);background:#fff}
      .u-spinner{width:22px;height:22px;border-radius:999px;border:3px solid rgba(225,29,46,.20);border-top-color:rgba(225,29,46,1);animation:uSpin 900ms linear infinite}
      .u-overlayTitle{font-weight:700;color:#0f172a;font-family:var(--font-family, system-ui, -apple-system, Segoe UI, Roboto, Arial)}
      .u-overlaySub{margin-top:2px;font-size:12px;color:#64748b;font-family:var(--font-family, system-ui, -apple-system, Segoe UI, Roboto, Arial)}
      @keyframes uSpin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(st);
  }

  function showLoaderOverlay(message){
    injectOverlayStylesOnce();
    let ov = document.getElementById("ulydia_overlay_loader");
    if (!ov){
      ov = document.createElement("div");
      ov.id = "ulydia_overlay_loader";
      ov.className = "u-overlay";
      ov.innerHTML = `
        <div class="u-overlayCard">
          <div class="u-spinner"></div>
          <div>
            <div class="u-overlayTitle" id="ulydia_overlay_title"></div>
            <div class="u-overlaySub">Please wait a moment.</div>
          </div>
        </div>`;
      document.body.appendChild(ov);
    }
    const t = document.getElementById("ulydia_overlay_title");
    if (t) t.textContent = message || "Loading…";
  }

function showMessageOverlay(message, sub){
  try{ try{ var r=document.getElementById("ulydia-metier-root"); if(r) r.style.opacity="1"; }catch(_){ }
    document.documentElement.classList.remove("ul-metier-loading"); try{ var r=document.getElementById("ulydia-metier-root"); if(r) r.style.opacity="1"; }catch(_){ } }catch(_){ }
  injectOverlayStylesOnce();
  let ov = document.getElementById("ulydia_overlay_message");
  if (!ov){
    ov = document.createElement("div");
    ov.id = "ulydia_overlay_message";
    ov.className = "u-overlay";
    ov.innerHTML = meaningfullyTrim(`
      <div class="u-overlayCard">
        <div>
          <div class="u-overlayTitle" id="ulydia_message_title"></div>
          <div class="u-overlaySub" id="ulydia_message_sub"></div>
        </div>
      </div>
    `);
    document.body.appendChild(ov);
  }
  const t = document.getElementById("ulydia_message_title");
  const s = document.getElementById("ulydia_message_sub");
  if (t) t.textContent = message || "";
  if (s) s.textContent = sub || "";
}

  function hideLoader(){
    const ov = document.getElementById("ulydia_overlay_loader");
    if (ov) ov.remove();
  }



  // ---------- Catalog cache (countries) ----------
  let __UL_CATALOG_CACHE = null; // { countries: [...] }

  function isoToFlag(iso){
    iso = String(iso||"").toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) return "";
    const A = 0x1F1E6;
    const code = (c) => A + (c.charCodeAt(0) - 65);
    return String.fromCodePoint(code(iso[0]), code(iso[1]));
  }

  async function loadCatalogCountries(){
    if (__UL_CATALOG_CACHE && Array.isArray(__UL_CATALOG_CACHE.countries)) return __UL_CATALOG_CACHE.countries;
    const data = await fetchJSON(`${CATALOG_URL}?v=${Date.now()}`).catch(()=>null);
    const countries = (
      data?.countries ||
      data?.pays ||
      data?.items ||
      data?.data?.countries ||
      data?.data?.pays ||
      []
    );
    __UL_CATALOG_CACHE = { countries: Array.isArray(countries) ? countries : [] };
    return __UL_CATALOG_CACHE.countries;
  }

  function getCountryLabel(item){
    const o = item?.fieldData || item?.fields || item || {};
    return String(o.label || o.nom || o.name || o.titre || o.title || o.slug || "").trim();
  }

  function getCountryIso(item){
    const o = item?.fieldData || item?.fields || item || {};
    return String(o.iso || o.code || o.code_iso || o.codeIso || o.iso2 || o.ISO || o["Code ISO"] || o["ISO"] || "").trim().toUpperCase();
  }

  async function hydratePaysSelect(root, currentIso){
    const sel = root && root.querySelector ? root.querySelector("#filter-pays") : null;
    if (!sel) return;

    const countries = await loadCatalogCountries();

    // Preserve current value if any
    const wanted = String(currentIso || sel.value || "").toUpperCase();

    // Rebuild options
    sel.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Tous les pays";
    sel.appendChild(optAll);

    (countries || [])
      .map(c => ({ iso: getCountryIso(c), label: getCountryLabel(c) }))
      .filter(x => x.iso && x.label)
      .sort((a,b)=>a.label.localeCompare(b.label, "fr"))
      .forEach(x => {
        const opt = document.createElement("option");
        opt.value = x.iso;
        const flag = isoToFlag(x.iso);
        opt.textContent = (flag ? (flag + " ") : "") + x.label;
        sel.appendChild(opt);
      });

    if (wanted) sel.value = wanted;
  }


  function qp() { return new URL(location.href).searchParams; }
  function getISO() {
    const p = qp();
    const iso = String(p.get("country") || p.get("iso") || "").trim().toUpperCase();
    return iso || "FR";
  }
  function getSlug() {
    const p = qp();
    return String(p.get("metier") || p.get("slug") || "").trim();
  }

  function pickFirst(...vals) {
    for (const v of vals) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
      return v;
    }
    return "";
  }
  function pickUrl(v) {
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v)) {
      for (const it of v) { const u = pickUrl(it); if (u) return u; }
      return "";
    }
    if (typeof v === "object") {
      const u = pickFirst(
        v.url, v.src, v.href, v.original, v.originalUrl, v.assetUrl, v.cdnUrl,
        v?.file?.url, v?.file?.src,
        v?.image?.url, v?.image?.src
      );
      return typeof u === "string" ? u.trim() : "";
    }
    return "";
  }
  function isEmptyRich(v) {
    if (v === undefined || v === null) return true;
    const s = String(v).replace(/\s+/g, " ").trim();
    if (!s) return true;
    const stripped = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return !stripped;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  

  // Remove leading indentation in template literals (safe helper)
  function meaningfullyTrim(s){
    const str = String(s || "");
    const lines = str.replace(/^\n/, "").split(/\n/);
    // compute common indentation (ignore empty lines)
    let min = null;
    for (const line of lines){
      if (!line.trim()) continue;
      const m = line.match(/^\s+/);
      const ind = m ? m[0].length : 0;
      if (min === null || ind < min) min = ind;
    }
    if (!min) return str.trim();
    const out = lines.map(l => l.slice(0, min).trim() ? l.slice(min) : l.trimEnd()).join("\n");
    return out.trim();
  }

}


  // Convert **bold** or __bold__ in plain text to <strong>bold</strong> safely (escapes everything else).
  function formatInlineBold(s){
    const esc = escapeHtml(String(s || ""));
    // Replace escaped **...** and __...__
    return esc
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>");
  }
  async function fetchJSON(url, opt={}) {
  const timeoutMs = Number(opt.timeoutMs || 10000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", ...opt, signal: ctrl.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Fetch failed ${res.status} for ${url} :: ${txt.slice(0,160)}`);
    }
    return await res.json();
  } catch (e) {
    if (e && e.name === "AbortError") {
      throw new Error(`Fetch timeout after ${timeoutMs}ms for ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}


  function ensureRoot() {
    // Prefer the placeholder already present in Webflow
    let root = document.getElementById("ulydia-metier-root");
    if (root) return root;

    // If missing, create it but DO NOT prepend (would push Webflow header to the bottom)
    root = document.createElement("div");
    root.id = "ulydia-metier-root";

    const host =
      document.querySelector("[data-ulydia-metier-host]") ||
      document.querySelector("main") ||
      document.querySelector(".w-dyn-list, .w-dyn-items") ||
      document.body;

    host.appendChild(root);
    return root;
  }
  function renderPlaceholder(root) {
    root.innerHTML = `
      <div style="padding:16px;font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:10px;height:10px;border-radius:999px;background:#7c3aed"></div>
          <div style="font-weight:700">Ulydia — loading metier page…</div>
        </div>
        <div style="margin-top:6px;color:#6b7280;font-size:13px">If this stays visible, check Console for errors.</div>
      </div>
    `;
  }
  function renderShell(root) { root.innerHTML = `<div class="w-full h-full" style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);"><!-- Barre de Filtres -->
   <div class="w-full" style="background: white; border-bottom: 2px solid var(--border); box-shadow: 0 2px 8px rgba(0,0,0,.05);">
    <div class="max-w-[1200px] mx-auto px-6 py-4">
     <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><!-- Filtre Pays -->
      <div class="relative"><label for="filter-pays" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🌍 Pays / Région </label>
       <div class="relative"><select id="filter-pays" class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer transition-all" style="border-color: var(--border); color: var(--text); background: white;"> <option value="">Tous les pays</option> <option value="FR" selected>🇫🇷 France</option> <option value="BE">🇧🇪 Belgique</option> <option value="CH">🇨🇭 Suisse</option> <option value="CA">🇨🇦 Canada</option> <option value="LU">🇱🇺 Luxembourg</option> <option value="UK">🇬🇧 Royaume-Uni</option> <option value="US">🇺🇸 États-Unis</option> <option value="DE">🇩🇪 Allemagne</option> <option value="ES">🇪🇸 Espagne</option> <option value="IT">🇮🇹 Italie</option> <option value="PT">🇵🇹 Portugal</option> <option value="NL">��🇱 Pays-Bas</option> </select>
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
         <svg width="20" height="20" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
         </svg>
        </div>
       </div>
      </div><!-- Filtre Secteur d'activité -->
      <div class="relative"><label for="filter-secteur" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🏢 Secteur d'activité </label>
       <div class="relative"><select id="filter-secteur" class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer transition-all" style="border-color: var(--border); color: var(--text); background: white;"> <option value="">Tous les secteurs</option> <option value="tech" selected>💻 Technologies &amp; Numérique</option> <option value="finance">💰 Finance &amp; Banque</option> <option value="sante">🏥 Santé &amp; Médical</option> <option value="commerce">🛍️ Commerce &amp; Distribution</option> <option value="industrie">🏭 Industrie &amp; Manufacturing</option> <option value="construction">🏗️ BTP &amp; Construction</option> <option value="transport">����� Transport &amp; Logistique</option> <option value="education">📚 Éducation &amp; Formation</option> <option value="communication">📢 Communication &amp; Marketing</option> <option value="juridique">⚖️ Juridique &amp; Droit</option> <option value="rh">👥 Ressources Humaines</option> <option value="hotellerie">🏨 Hôtellerie &amp; Restauration</option> <option value="environnement">🌱 Environnement &amp; Énergie</option> <option value="art">🎨 Arts &amp; Culture</option> <option value="securite">🔒 Sécurité &amp; Défense</option> </select>
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
         <svg width="20" height="20" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
         </svg>
        </div>
       </div>
      </div><!-- Recherche Métier (Saisie Assistée) -->
      <div class="relative"><label for="filter-metier" class="block text-xs font-semibold mb-2" style="color: var(--text);"> 🔍 Rechercher un métier </label>
       <div class="relative"><input type="text" id="filter-metier" placeholder="Ex: Développeur, Designer, Chef de projet..." class="w-full px-4 py-3 pr-10 rounded-lg border-2 text-sm font-medium transition-all" style="border-color: var(--border); color: var(--text); background: white;" autocomplete="off">
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
         <svg width="20" height="20" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /> <path d="m21 21-4.35-4.35" />
         </svg>
        </div><!-- Dropdown Suggestions -->
        <div id="metier-suggestions" class="absolute top-full left-0 right-0 mt-2 rounded-lg border-2 overflow-hidden z-50 hidden" style="border-color: var(--border); background: white; box-shadow: 0 8px 24px rgba(0,0,0,.12); max-height: 320px; overflow-y: auto;"><!-- Suggestions dynamiques -->
        </div>
       </div>
      </div>
     </div><!-- Bouton Réinitialiser -->
     <div class="mt-4 flex items-center justify-between"><button id="reset-filters" class="text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-lg transition-all" style="color: var(--muted);">
       <svg width="16" height="16" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /> <path d="M21 3v5h-5" /> <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /> <path d="M3 21v-5h5" />
       </svg> Réinitialiser les filtres </button>
      <div class="text-xs font-semibold" style="color: var(--muted);"><span id="result-count">1</span> fiche(s) métier trouvée(s)
      </div>
     </div>
    </div>
   </div><!-- Header Métier -->
   <header class="w-full" style="border-bottom: 2px solid var(--border); background: white;">
    <div class="max-w-[1200px] mx-auto px-6 py-10">
     <div class="flex items-start gap-5 mb-5">
      <div class="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 gradient-primary">
       <svg width="40" height="40" viewbox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="16 18 22 12 16 6" /> <polyline points="8 6 2 12 8 18" />
       </svg>
      </div>
      <div class="flex-1"><span class="badge badge-primary">💼 Fiche Métier</span>
       <h1 id="nom-metier" class="text-5xl font-bold mt-4 mb-3 tracking-tight" style="color: var(--text);">Chargement…</h1>
       <p id="accroche-metier" class="text-xl" style="color: var(--muted);">Créez des applications web modernes de A à Z, maîtrisez le front-end et le back-end</p>
      </div>
     </div><!-- Sponsor Banner Wide (Centré sous l'accroche) -->
     <div class="flex justify-center mt-8"><a id="sponsor-banner-link" href="#" target="_blank" rel="noopener noreferrer" class="sponsor-banner-wide gradient-primary block">
       <div class="w-full h-full flex items-center justify-center text-white">
        <div class="text-center">
         <div class="mb-3">
          <svg width="56" height="56" viewbox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /> <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
         </div>
         <p class="text-sm font-semibold mb-2 opacity-90">Formation sponsorisée par</p>
         <h3 id="sponsor-name-banner" class="text-3xl font-bold">École 42</h3>
         <p class="text-sm mt-2 opacity-80">Formation intensive • 100% gratuite • Reconnu par l'État</p>
        </div>
       </div></a>
     </div>
    </div>
   </header><!-- Main Content -->
   <main class="max-w-[1200px] mx-auto px-6 py-10">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><!-- Main Content Column (2/3) -->
     <div class="lg:col-span-2 space-y-8"><!-- Vue d'ensemble / Description -->
      <div class="card">
       <div class="card-header pastel-blue">
        <h2 id="description-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /> <polyline points="14 2 14 8 20 8" /> <line x1="16" y1="13" x2="8" y2="13" /> <line x1="16" y1="17" x2="8" y2="17" /> <polyline points="10 9 9 9 8 9" />
         </svg> Vue d'ensemble</h2>
       </div>
       <div class="rich-content">
        <p>Le <strong></strong> est un professionnel polyvalent capable de travailler sur l'ensemble des couches d'une application web : l'interface utilisateur (front-end), la logique métier et les bases de données (back-end), ainsi que l'infrastructure et le déploiement.</p>
        <p>Ce métier requiert une expertise technique large et une capacité d'adaptation constante aux nouvelles technologies. Le développeur Full-Stack intervient sur toutes les phases du cycle de développement, de la conception à la mise en production.</p>
        <p>Très recherché sur le marché, ce profil permet de comprendre l'ensemble d'un projet web et d'avoir une vision globale des enjeux techniques et fonctionnels.</p>
       </div>
      </div><!-- Missions principales -->
      <div class="card">
       <div class="card-header pastel-green">
        <h2 id="missions-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /> <polyline points="22 4 12 14.01 9 11.01" />
         </svg> Missions principales</h2>
       </div>
       <div class="rich-content">
        <h4>Développement Front-End</h4>
        <ul>
         <li>Créer des interfaces utilisateur modernes, responsive et accessibles</li>
         <li>Intégrer des maquettes design en HTML/CSS/JavaScript</li>
         <li>Développer avec des frameworks modernes (React, Vue.js, Angular)</li>
         <li>Optimiser les performances front-end et l'expérience utilisateur</li>
        </ul>
        <h4>Développement Back-End</h4>
        <ul>
         <li>Concevoir et développer des API RESTful ou GraphQL</li>
         <li>Gérer la logique métier et les flux de données</li>
         <li>Administrer les bases de données (SQL et NoSQL)</li>
         <li>Impl��menter l'authentification et la sécurité des applications</li>
        </ul>
        <h4>DevOps &amp; Déploiement</h4>
        <ul>
         <li>Configurer et maintenir l'infrastructure cloud (AWS, Azure, GCP)</li>
         <li>Mettre en place des pipelines CI/CD</li>
         <li>Assurer le monitoring et la scalabilité des applications</li>
         <li>Gérer le versioning du code avec Git</li>
        </ul>
       </div>
      </div><!-- Compétences clés -->
      <div class="card">
       <div class="card-header pastel-purple">
        <h2 id="competences-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M12 20h9" /> <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
         </svg> Compétences clés</h2>
       </div>
       <div class="rich-content">
        <h4>🎨 Technologies Front-End</h4>
        <ul>
         <li><strong>Langages :</strong> HTML5, CSS3, JavaScript ES6+, TypeScript</li>
         <li><strong>Frameworks :</strong> React, Vue.js, Angular, Svelte</li>
         <li><strong>Styling :</strong> Tailwind CSS, Sass, CSS-in-JS, Styled Components</li>
         <li><strong>Build Tools :</strong> Webpack, Vite, Parcel</li>
        </ul>
        <h4>⚙️ Technologies Back-End</h4>
        <ul>
         <li><strong>Langages :</strong> Node.js, Python, PHP, Java, Ruby, Go</li>
         <li><strong>Frameworks :</strong> Express, NestJS, Django, Laravel, Spring Boot</li>
         <li><strong>API :</strong> REST, GraphQL, WebSockets</li>
         <li><strong>Authentification :</strong> JWT, OAuth2, Sessions</li>
        </ul>
        <h4>🗄️ Bases de données</h4>
        <ul>
         <li><strong>SQL :</strong> PostgreSQL, MySQL, SQL Server</li>
         <li><strong>NoSQL :</strong> MongoDB, Redis, Elasticsearch</li>
         <li><strong>ORM :</strong> Prisma, Sequelize, TypeORM, SQLAlchemy</li>
        </ul>
        <h4>☁️ DevOps &amp; Infrastructure</h4>
        <ul>
         <li><strong>Cloud :</strong> AWS, Google Cloud, Azure, Vercel, Netlify</li>
         <li><strong>Containers :</strong> Docker, Kubernetes</li>
         <li><strong>CI/CD :</strong> GitHub Actions, GitLab CI, Jenkins</li>
         <li><strong>Monitoring :</strong> Prometheus, Grafana, Sentry</li>
        </ul>
       </div>
      </div><!-- Environnements de travail -->
      <div class="card">
       <div class="card-header pastel-orange">
        <h2 id="environnements-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" /> <line x1="8" y1="21" x2="16" y2="21" /> <line x1="12" y1="17" x2="12" y2="21" />
         </svg> Environnements de travail</h2>
       </div>
       <div class="rich-content">
        <ul>
         <li><strong>Start-ups tech :</strong> Environnement agile, forte polyvalence, impact direct sur le produit, stack moderne, equity possible</li>
         <li><strong>Scale-ups :</strong> Croissance rapide, équipes structurées, défis de scalabilité, culture tech forte</li>
         <li><strong>ESN / Agences digitales :</strong> Diversité de projets clients, montée en compétences rapide, méthodologies variées</li>
         <li><strong>Grandes entreprises / Corporates :</strong> Projets d'envergure, processus établis, équipes spécialisées, avantages solides</li>
         <li><strong>Freelance / Consultant :</strong> Autonomie totale, choix des missions, tarifs journaliers élevés (400-800€/jour), gestion administrative</li>
         <li><strong>Remote / Hybride :</strong> Télétravail très fréquent (70-100%), flexibilité horaire, outils collaboratifs, présence occasionnelle</li>
        </ul>
       </div>
      </div><!-- Profil recherché -->
      <div class="card">
       <div class="card-header pastel-pink">
        <h2 id="profil-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /> <circle cx="12" cy="7" r="4" />
         </svg> Profil recherché</h2>
       </div>
       <div class="rich-content">
        <h4>🎯 Qualités techniques</h4>
        <ul>
         <li>Maîtrise de plusieurs langages et frameworks front-end et back-end</li>
         <li>Compréhension des architectures logicielles (MVC, microservices, serverless)</li>
         <li>Capacité à écrire du code propre, maintenable et testé</li>
         <li>Connaissance des bonnes pratiques de sécurité web</li>
         <li>Compétences en optimisation des performances</li>
        </ul>
        <h4>💡 Soft skills</h4>
        <ul>
         <li><strong>Polyvalence :</strong> Capacité à jongler entre front-end, back-end et infrastructure</li>
         <li><strong>Apprentissage continu :</strong> Curiosité et veille technologique active</li>
         <li><strong>Résolution de problèmes :</strong> Approche analytique et débogage méthodique</li>
         <li><strong>Communication :</strong> Collaboration avec designers, product managers, et autres développeurs</li>
         <li><strong>Autonomie :</strong> Gestion de projets de bout en bout</li>
         <li><strong>Adaptabilité :</strong> Flexibilité face aux changements technologiques</li>
        </ul>
        <h4>📚 Formation</h4>
        <ul>
         <li>Niveau Bac+2 à Bac+5 en informatique (ou équivalent autodidacte)</li>
         <li>Bootcamps intensifs (Le Wagon, Ironhack, Wild Code School)</li>
         <li>Écoles d'ingénieurs (Epitech, 42, EPITA)</li>
         <li>Formation autodidacte avec portfolio conséquent</li>
        </ul>
       </div>
      </div><!-- Évolutions possibles -->
      <div class="card">
       <div class="card-header pastel-cyan">
        <h2 id="evolutions-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5" /> <polyline points="5 12 12 5 19 12" />
         </svg> Évolutions possibles</h2>
       </div>
       <div class="rich-content">
        <h4>🚀 Évolution technique</h4>
        <ul>
         <li><strong>Lead Developer / Tech Lead (3-5 ans) :</strong> Encadrement technique d'équipe, architecture logicielle, choix technologiques</li>
         <li><strong>Architecte Logiciel (5-8 ans) :</strong> Conception de systèmes complexes, stratégie technique, scalabilité</li>
         <li><strong>Staff Engineer / Principal Engineer (8+ ans) :</strong> Expertise technique de haut niveau, influence transverse</li>
        </ul>
        <h4>📊 Évolution managériale</h4>
        <ul>
         <li><strong>Engineering Manager (4-6 ans) :</strong> Management d'équipe tech, recrutement, développement des talents</li>
         <li><strong>CTO / VP Engineering (8+ ans) :</strong> Direction technique de l'entreprise, stratégie tech, budget</li>
        </ul>
        <h4>🎨 Spécialisations</h4>
        <ul>
         <li><strong>DevOps Engineer :</strong> Focus infrastructure, CI/CD, automatisation</li>
         <li><strong>Security Engineer :</strong> Sécurité applicative, pentesting, conformité</li>
         <li><strong>Product Manager technique :</strong> Vision produit avec expertise technique</li>
         <li><strong>Solutions Architect :</strong> Conseil en architecture pour clients</li>
        </ul>
        <h4>💼 Indépendance</h4>
        <ul>
         <li><strong>Freelance / Consultant senior (3+ ans) :</strong> TJM 500-800€, missions diversifiées</li>
         <li><strong>Entrepreneur tech :</strong> Création de startup, développement de SaaS</li>
         <li><strong>Tech Content Creator :</strong> Formation, tutoriels, consulting</li>
        </ul>
       </div>
      </div><!-- FAQ -->
      <div class="card">
       <div class="card-header" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
        <h2 id="faq-title" class="section-title">
         <svg width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10" /> <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /> <line x1="12" y1="17" x2="12.01" y2="17" />
         </svg> Questions fréquentes</h2>
       </div>
       <div class="space-y-3">
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Quelle est la différence entre un développeur Full-Stack et un développeur spécialisé ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p>Le développeur Full-Stack maîtrise à la fois le <strong>front-end</strong> (interface utilisateur) et le <strong>back-end</strong> (logique serveur, bases de données). Un développeur spécialisé se concentre sur un seul de ces domaines. Le Full-Stack a une vision globale du projet, peut intervenir sur toutes les couches, et est particulièrement recherché dans les start-ups et petites structures. En revanche, un développeur spécialisé (front ou back) aura une expertise plus pointue dans son domaine.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Peut-on devenir développeur Full-Stack sans diplôme ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p><strong>Oui, absolument !</strong> Le secteur tech valorise énormément les compétences pratiques et le portfolio. Beaucoup de développeurs Full-Stack sont autodidactes ou issus de bootcamps (Le Wagon, Ironhack, Wild Code School). L'essentiel est de démontrer vos compétences via un <strong>portfolio GitHub solide</strong> avec des projets fonctionnels, des contributions open-source, et des applications déployées. Les recruteurs regardent davantage votre code et vos réalisations que votre diplôme.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Combien de temps faut-il pour devenir développeur Full-Stack ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p>La durée varie selon votre parcours : un <strong>bootcamp intensif</strong> dure 3 à 6 mois et vous rend opérationnel pour un poste junior. En <strong>autodidacte</strong>, comptez 6 à 12 mois d'apprentissage intensif (20-30h/semaine). Une <strong>formation universitaire</strong> (Bac+3 à Bac+5) prend 3 à 5 ans mais offre des bases théoriques solides. L'important est la régularité : mieux vaut coder 2h par jour que 14h le week-end. Après 6-12 mois, vous pouvez prétendre à un poste junior.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Quels langages de programmation faut-il absolument maîtriser ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p>Les <strong>indispensables</strong> : <strong>JavaScript</strong> (langage universel du web, front et back avec Node.js), <strong>HTML/CSS</strong> (structure et style des pages). Ensuite, choisissez une stack cohérente : <strong>TypeScript</strong> (JavaScript typé), <strong>React</strong> ou <strong>Vue.js</strong> pour le front-end, <strong>Node.js/Express</strong> ou <strong>Python/Django</strong> pour le back-end. Ajoutez <strong>SQL</strong> (PostgreSQL/MySQL) et <strong>Git</strong> pour le versioning. La stack JavaScript (JS/TS + React + Node.js) est la plus demandée actuellement (70% des offres).</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Est-ce que le télétravail est vraiment possible en tant que développeur Full-Stack ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p><strong>Oui, et c'est même la norme !</strong> Environ <strong>70% des postes</strong> de développeur Full-Stack proposent du full remote ou de l'hybride (2-3 jours/semaine au bureau). Les outils collaboratifs (Slack, GitHub, Figma, Jira) permettent de travailler efficacement à distance. Certaines entreprises recrutent même à l'international en remote. En freelance, le remote est quasi systématique. C'est l'un des métiers les plus compatibles avec le télétravail, ce qui permet de vivre en province avec un salaire parisien.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">Quel est le salaire moyen d'un développeur Full-Stack en freelance ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p>En freelance, les développeurs Full-Stack facturent entre <strong>400€ et 800€ par jour</strong> (TJM - Taux Journalier Moyen) selon leur expérience. Un <strong>junior</strong> (2-3 ans) facture 400-500€/jour, un <strong>confirmé</strong> (4-6 ans) 500-650€/jour, et un <strong>senior</strong> (7+ ans) 650-800€/jour. Sur une base de 18 jours facturables par mois (après congés, prospection, administration), cela représente <strong>7 200€ à 14 400€ de CA mensuel</strong>. Après charges (environ 45%), le revenu net varie de 50K€ à 95K€ annuel, soit nettement plus qu'en salariat.</p>
         </div>
        </div>
        <div class="faq-item"><button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
          <div class="flex items-start gap-3 flex-1"><span class="text-xl flex-shrink-0">❓</span> <span class="font-semibold text-sm" style="color: var(--text);">L'intelligence artificielle va-t-elle remplacer les développeurs Full-Stack ?</span>
          </div>
          <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" />
          </svg></button>
         <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
          <p><strong>Non, l'IA est un outil, pas un remplaçant.</strong> L'IA (GitHub Copilot, ChatGPT) assiste les développeurs en générant du code boilerplate, en debuggant, et en accélérant certaines tâches répétitives. Mais elle ne remplace pas la <strong>compréhension métier</strong>, l'<strong>architecture logicielle</strong>, les <strong>choix techniques stratégiques</strong>, et la <strong>résolution de problèmes complexes</strong>. L'IA rend les développeurs plus productifs (+30-40%), ce qui augmente la demande pour créer encore plus d'applications. Le risque d'automatisation est estimé à seulement <strong>12%</strong>, l'un des plus faibles du marché.</p>
         </div>
        </div>
       </div>
      </div><!-- Sections Pays (France example) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"><!-- Formation -->
       <div class="card">
        <div class="card-header pastel-blue">
         <h3 id="formation-title" class="section-title text-base">🎓 Formation</h3>
        </div>
        <div class="rich-content text-sm">
         <h4>Diplômes recommandés</h4>
         <ul>
          <li>Bac+2 : BTS SIO, DUT Informatique</li>
          <li>Bac+3 : Licence Pro Développement Web</li>
          <li>Bac+5 : Master Informatique, Diplôme d'ingénieur</li>
         </ul>
         <h4>Bootcamps (3-6 mois)</h4>
         <ul>
          <li>Le Wagon (9 semaines)</li>
          <li>Ironhack (9 semaines)</li>
          <li>Wild Code School (5 mois)</li>
          <li>OpenClassrooms (6-12 mois)</li>
         </ul>
         <h4>Écoles spécialisées</h4>
         <ul>
          <li>École 42 (gratuite, peer-learning)</li>
          <li>Epitech, EPITA, Supinfo</li>
         </ul>
        </div>
       </div><!-- Accès au métier -->
       <div class="card">
        <div class="card-header pastel-green">
         <h3 id="acces-title" class="section-title text-base">🚪 Accès au métier</h3>
        </div>
        <div class="rich-content text-sm">
         <h4>Voies d'accès</h4>
         <ul>
          <li><strong>Formation initiale :</strong> École d'ingénieur, université</li>
          <li><strong>Bootcamp :</strong> Reconversion rapide (3-6 mois)</li>
          <li><strong>Autodidacte :</strong> Apprentissage en ligne + portfolio</li>
          <li><strong>Alternance :</strong> Très prisée, facilite l'embauche</li>
         </ul>
         <h4>Prérequis</h4>
         <ul>
          <li>Portfolio GitHub actif avec projets personnels</li>
          <li>Contribution open-source (bonus)</li>
          <li>Stage ou 1ère expérience professionnelle</li>
          <li>Veille technologique régulière</li>
         </ul>
         <h4>Premiers postes</h4>
         <ul>
          <li>Junior Full-Stack Developer</li>
          <li>Full-Stack Developer (alternance)</li>
          <li>Développeur Web Junior</li>
         </ul>
        </div>
       </div><!-- Marché du travail -->
       <div class="card">
        <div class="card-header pastel-purple">
         <h3 id="marche-title" class="section-title text-base">📈 Marché du travail</h3>
        </div>
        <div class="rich-content text-sm">
         <h4>Demande</h4>
         <ul>
          <li><strong>Très forte demande</strong> : Pénurie de profils qualifiés</li>
          <li>+20 000 postes à pourvoir en France en 2024</li>
          <li>Croissance continue du secteur tech (+15% /an)</li>
         </ul>
         <h4>Secteurs recruteurs</h4>
         <ul>
          <li>Tech / SaaS / Scale-ups</li>
          <li>E-commerce &amp; Marketplaces</li>
          <li>Fintech / Banking</li>
          <li>Santé digitale / HealthTech</li>
          <li>ESN &amp; Agences digitales</li>
         </ul>
         <h4>Tendances</h4>
         <ul>
          <li>Remote first : 70% des postes en full remote</li>
          <li>Freelance en hausse : +25% depuis 2020</li>
          <li>Stack moderne privilégiée (React, Node.js, TypeScript)</li>
         </ul>
        </div>
       </div><!-- Rémunération -->
       <div class="card">
        <div class="card-header pastel-orange">
         <h3 id="salaire-title" class="section-title text-base">💰 Rémunération</h3>
        </div>
        <div class="space-y-4">
         <div>
          <div class="progress-label"><span class="text-xs font-semibold" style="color: var(--text);">Junior (0-2 ans)</span> <span class="text-xs font-bold" style="color: var(--primary);">35 000 - 45 000 €</span>
          </div>
          <div class="salary-bar-container">
           <div class="salary-bar-fill gradient-primary" style="width: 40%;"></div>
          </div>
         </div>
         <div>
          <div class="progress-label"><span class="text-xs font-semibold" style="color: var(--text);">Confirmé (3-5 ans)</span> <span class="text-xs font-bold" style="color: var(--primary);">45 000 - 60 000 €</span>
          </div>
          <div class="salary-bar-container">
           <div class="salary-bar-fill gradient-primary" style="width: 60%;"></div>
          </div>
         </div>
         <div>
          <div class="progress-label"><span class="text-xs font-semibold" style="color: var(--text);">Senior (5+ ans)</span> <span class="text-xs font-bold" style="color: var(--primary);">60 000 - 85 000 €</span>
          </div>
          <div class="salary-bar-container">
           <div class="salary-bar-fill gradient-primary" style="width: 80%;"></div>
          </div>
         </div>
         <div class="mt-4 p-3 rounded-lg" style="background: rgba(99,102,241,0.1);">
          <p class="text-xs font-semibold mb-2" style="color: var(--primary);">💡 Informations complémentaires</p>
          <p class="text-xs" style="color: var(--text);"><strong>Variable :</strong> 5-15% du salaire fixe<br><strong>Freelance TJM :</strong> 400-800€/jour (selon expérience)<br><strong>Paris :</strong> Salaires +15-20% par rapport à la province<br><strong>Remote :</strong> Possible de négocier salaire Paris en province</p>
         </div>
        </div>
       </div>
      </div>
     </div><!-- Sidebar (1/3) -->
     <div class="space-y-6"><!-- Sponsor Logo Square + CTA -->
      <div class="card">
       <div class="card-header" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
        <h3 class="section-title text-sm">🤝 Partenaire</h3>
       </div><a id="sponsor-logo-link" href="#" target="_blank" rel="noopener noreferrer" style="display: block;">
        <div class="sponsor-logo-square">
         <svg width="80" height="80" viewbox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /> <path d="M6 12v5c3 3 9 3 12 0v-5" />
         </svg>
        </div>
        <div class="text-center mt-4">
         <p id="sponsor-name-sidebar" class="font-bold text-base" style="color: var(--text);">École 42</p>
         <p class="text-sm mt-1" style="color: var(--muted);">Formation intensive • 100% gratuite</p>
         <p class="text-xs mt-2" style="color: var(--muted);">Cursus peer-learning reconnu par l'État</p>
        </div></a> <a id="sponsor-cta" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-primary w-full mt-5">
        <svg width="20" height="20" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /> <polyline points="15 3 21 3 21 9" /> <line x1="10" y1="14" x2="21" y2="3" />
        </svg> En savoir plus </a>
      </div><!-- KPIs Indicateurs -->
      <div class="card">
       <div class="card-header gradient-primary" style="color: white;">
        <h3 class="section-title text-sm" style="color: white;">📊 Indicateurs clés</h3>
       </div>
       <div class="space-y-3">
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(16,185,129,0.1);"><span>🏠</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Télétravail</p>
          <p class="text-sm font-bold" style="color: var(--text);">Full Remote / Hybride</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(16,185,129,0.1);"><span>🤖</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Risque d'automatisation</p>
          <p class="text-sm font-bold" style="color: #10b981;">Faible (12%)</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(99,102,241,0.1);"><span>💰</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Devise</p>
          <p class="text-sm font-bold" style="color: var(--text);">EUR (€)</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(245,158,11,0.1);"><span>⏱️</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Délai d'employabilité</p>
          <p class="text-sm font-bold" style="color: var(--text);">6-12 mois</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(99,102,241,0.1);"><span>📈</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Croissance du marché</p>
          <p class="text-sm font-bold" style="color: var(--success);">+15% / an</p>
         </div>
        </div>
        <div class="kpi-box">
         <div class="kpi-icon" style="background: rgba(239,68,68,0.1);"><span>🔥</span>
         </div>
         <div class="flex-1">
          <p class="text-xs font-semibold" style="color: var(--muted);">Demande du marché</p>
          <p class="text-sm font-bold" style="color: #ef4444;">Très forte</p>
         </div>
        </div>
       </div>
      </div><!-- Salaires détaillés -->
      <div class="card">
       <div class="card-header gradient-success" style="color: white;">
        <h3 class="section-title text-sm" style="color: white;">💵 Grille salariale (France)</h3>
       </div>
       <div class="space-y-4">
        <div>
         <div class="flex justify-between items-center mb-2"><span class="text-xs font-semibold" style="color: var(--muted);">💼 Junior</span> <span class="text-xs font-bold" style="color: var(--text);">35-45K€</span>
         </div>
         <div class="salary-bar-container">
          <div class="salary-bar-fill gradient-success" style="width: 40%;"></div>
         </div>
         <p class="text-xs mt-1" style="color: var(--muted);">0-2 ans d'expérience</p>
        </div>
        <div>
         <div class="flex justify-between items-center mb-2"><span class="text-xs font-semibold" style="color: var(--muted);">🚀 Confirmé</span> <span class="text-xs font-bold" style="color: var(--text);">45-60K€</span>
         </div>
         <div class="salary-bar-container">
          <div class="salary-bar-fill gradient-success" style="width: 60%;"></div>
         </div>
         <p class="text-xs mt-1" style="color: var(--muted);">3-5 ans d'expérience</p>
        </div>
        <div>
         <div class="flex justify-between items-center mb-2"><span class="text-xs font-semibold" style="color: var(--muted);">⭐ Senior</span> <span class="text-xs font-bold" style="color: var(--text);">60-85K€</span>
         </div>
         <div class="salary-bar-container">
          <div class="salary-bar-fill gradient-success" style="width: 80%;"></div>
         </div>
         <p class="text-xs mt-1" style="color: var(--muted);">5+ ans d'expérience</p>
        </div>
        <div class="pt-3 mt-3" style="border-top: 1px solid var(--border);">
         <p class="text-xs font-semibold mb-2" style="color: var(--text);">📌 Part variable</p>
         <div class="flex items-center gap-2">
          <div class="flex-1 h-2 rounded-full" style="background: var(--border);"></div><span class="text-xs font-bold" style="color: var(--accent);">5-15%</span>
         </div>
         <p class="text-xs mt-2" style="color: var(--muted);">Bonus, intéressement, participation</p>
        </div>
       </div>
      </div><!-- Compétences must-have (chips) -->
      <div class="card">
       <div class="card-header pastel-purple">
        <h3 class="section-title text-sm">⚡ Compétences incontournables</h3>
       </div>
       <div class="flex flex-wrap gap-2"><span class="chip badge-primary">JavaScript</span> <span class="chip badge-primary">TypeScript</span> <span class="chip badge-success">React</span> <span class="chip badge-success">Node.js</span> <span class="chip badge-warning">PostgreSQL</span> <span class="chip badge-warning">MongoDB</span> <span class="chip badge-danger">Git</span> <span class="chip badge-danger">Docker</span> <span class="chip badge-primary">API REST</span> <span class="chip badge-success">HTML/CSS</span> <span class="chip badge-warning">AWS/GCP</span> <span class="chip badge-danger">CI/CD</span>
       </div>
      </div><!-- Soft Skills -->
      <div class="card">
       <div class="card-header pastel-pink">
        <h3 class="section-title text-sm">🧠 Soft Skills essentiels</h3>
       </div>
       <div class="space-y-3">
        <div class="skill-tag"><span class="text-lg">🧩</span> <span class="text-sm">Résolution de problèmes</span>
        </div>
        <div class="skill-tag"><span class="text-lg">🤝</span> <span class="text-sm">Travail en équipe</span>
        </div>
        <div class="skill-tag"><span class="text-lg">📚</span> <span class="text-sm">Apprentissage continu</span>
        </div>
        <div class="skill-tag"><span class="text-lg">💬</span> <span class="text-sm">Communication efficace</span>
        </div>
        <div class="skill-tag"><span class="text-lg">🎯</span> <span class="text-sm">Autonomie &amp; rigueur</span>
        </div>
        <div class="skill-tag"><span class="text-lg">🔄</span> <span class="text-sm">Adaptabilité</span>
        </div>
       </div>
      </div><!-- Tech Stack -->
      <div class="card">
       <div class="card-header pastel-cyan">
        <h3 class="section-title text-sm">🛠️ Stack Technique Populaire</h3>
       </div>
       <div class="space-y-3 text-sm">
        <div>
         <p class="font-semibold mb-2" style="color: var(--text);">🎨 Front-End</p>
         <div class="flex flex-wrap gap-2"><span class="badge badge-primary">React</span> <span class="badge badge-primary">Next.js</span> <span class="badge badge-primary">Tailwind</span>
         </div>
        </div>
        <div>
         <p class="font-semibold mb-2" style="color: var(--text);">⚙️ Back-End</p>
         <div class="flex flex-wrap gap-2"><span class="badge badge-success">Node.js</span> <span class="badge badge-success">Express</span> <span class="badge badge-success">NestJS</span>
         </div>
        </div>
        <div>
         <p class="font-semibold mb-2" style="color: var(--text);">🗄️ Database</p>
         <div class="flex flex-wrap gap-2"><span class="badge badge-warning">PostgreSQL</span> <span class="badge badge-warning">MongoDB</span> <span class="badge badge-warning">Redis</span>
         </div>
        </div>
        <div>
         <p class="font-semibold mb-2" style="color: var(--text);">☁️ Cloud &amp; DevOps</p>
         <div class="flex flex-wrap gap-2"><span class="badge badge-danger">AWS</span> <span class="badge badge-danger">Docker</span> <span class="badge badge-danger">GitHub Actions</span>
         </div>
        </div>
       </div>
      </div><!-- Certifications -->
      <div class="card">
       <div class="card-header pastel-orange">
        <h3 class="section-title text-sm">🎓 Certifications utiles</h3>
       </div>
       <div class="space-y-3 text-sm">
        <div class="flex items-start gap-3"><span class="text-2xl">🏆</span>
         <div>
          <p class="font-semibold" style="color: var(--text);">AWS Certified Developer</p>
          <p class="text-xs" style="color: var(--muted);">Cloud computing &amp; infrastructure</p>
         </div>
        </div>
        <div class="flex items-start gap-3"><span class="text-2xl">🏆</span>
         <div>
          <p class="font-semibold" style="color: var(--text);">MongoDB Certified Developer</p>
          <p class="text-xs" style="color: var(--muted);">Bases de données NoSQL</p>
         </div>
        </div>
        <div class="flex items-start gap-3"><span class="text-2xl">🏆</span>
         <div>
          <p class="font-semibold" style="color: var(--text);">Google Professional Cloud Developer</p>
          <p class="text-xs" style="color: var(--muted);">GCP &amp; services Google</p>
         </div>
        </div>
        <div class="flex items-start gap-3"><span class="text-2xl">🏆</span>
         <div>
          <p class="font-semibold" style="color: var(--text);">Microsoft Azure Developer</p>
          <p class="text-xs" style="color: var(--muted);">Développement cloud Azure</p>
         </div>
        </div>
       </div>
      </div><!-- Écoles & Formations -->
      <div class="card">
       <div class="card-header pastel-blue">
        <h3 class="section-title text-sm">🏫 Écoles &amp; Parcours recommandés</h3>
       </div>
       <div class="space-y-3 text-sm">
        <div>
         <p class="font-semibold" style="color: var(--text);">🎯 Bootcamps</p>
         <ul class="mt-2 space-y-1" style="color: var(--muted);">
          <li class="text-xs">• Le Wagon (9 semaines)</li>
          <li class="text-xs">• Ironhack (9 semaines)</li>
          <li class="text-xs">• Wild Code School (5 mois)</li>
         </ul>
        </div>
        <div>
         <p class="font-semibold" style="color: var(--text);">🏛️ Écoles d'ingénieurs</p>
         <ul class="mt-2 space-y-1" style="color: var(--muted);">
          <li class="text-xs">• École 42 (gratuite)</li>
          <li class="text-xs">• Epitech, EPITA</li>
          <li class="text-xs">• Centrale, Mines</li>
         </ul>
        </div>
        <div>
         <p class="font-semibold" style="color: var(--text);">����� Formations en ligne</p>
         <ul class="mt-2 space-y-1" style="color: var(--muted);">
          <li class="text-xs">• OpenClassrooms</li>
          <li class="text-xs">• freeCodeCamp</li>
          <li class="text-xs">• The Odin Project</li>
         </ul>
        </div>
       </div>
      </div><!-- Projets Portfolio -->
      <div class="card">
       <div class="card-header pastel-green">
        <h3 class="section-title text-sm">💼 Projets Portfolio essentiels</h3>
       </div>
       <div class="space-y-2 text-sm">
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">Application CRUD complète</p>
          <p class="text-xs" style="color: var(--muted);">Front + Back + BDD + Auth</p>
         </div>
        </div>
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">API REST documentée</p>
          <p class="text-xs" style="color: var(--muted);">Avec tests &amp; documentation</p>
         </div>
        </div>
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">Clone de site populaire</p>
          <p class="text-xs" style="color: var(--muted);">Twitter, Airbnb, Netflix...</p>
         </div>
        </div>
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">Application en temps réel</p>
          <p class="text-xs" style="color: var(--muted);">Chat, dashboard, notifications</p>
         </div>
        </div>
        <div class="flex items-start gap-2"><span class="text-lg">✅</span>
         <div>
          <p class="font-semibold text-xs" style="color: var(--text);">Projet déployé en production</p>
          <p class="text-xs" style="color: var(--muted);">Sur Vercel, Netlify ou AWS</p>
         </div>
        </div>
       </div>
      </div>
     </div>
    </div>
   </main><!-- Footer -->
   <footer class="w-full py-8 mt-12" style="background: var(--card); border-top: 2px solid var(--border);">
    <div class="max-w-[1200px] mx-auto px-6">
     <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
       <p class="text-sm font-semibold" style="color: var(--text);">© 2024 Plateforme B2B • Fiches Métiers &amp; Écoles</p>
       <p class="text-xs mt-1" style="color: var(--muted);">Données actualisées • Sources : APEC, France Travail, LinkedIn</p>
      </div>
      <div class="flex items-center gap-6 text-sm"><a href="#" class="hover:underline" style="color: var(--muted);">Mentions légales</a> <span style="color: var(--border);">•</span> <a href="#" class="hover:underline" style="color: var(--muted);">CGU</a> <span style="color: var(--border);">•</span> <a href="#" class="hover:underline" style="color: var(--muted);">Contact</a>
      </div>
     </div>
    </div>
   </footer>
  </div>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": "",
    "description": "Le  est un professionnel polyvalent capable de travailler sur l'ensemble des couches d'une application web : front-end, back-end et infrastructure.",
    "datePosted": "2024-01-01",
    "employmentType": ["FULL_TIME", "CONTRACT", "PART_TIME"],
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Plateforme B2B Métiers"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "FR"
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "EUR",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": 35000,
        "maxValue": 85000,
        "unitText": "YEAR"
      }
    }
  }
  </script>
  <script>
    const defaultConfig = {
      nom: '',
      accroche: 'Créez des applications web modernes de A à Z, maîtrisez le front-end et le back-end',
      sponsor_name: 'École 42',
      lien_sponsor: 'https://www.42.fr',
      description_title: "Vue d'ensemble",
      missions_title: 'Missions principales',
      competences_title: 'Compétences clés',
      environnements_title: 'Environnements de travail',
      profil_title: 'Profil recherché',
      evolutions_title: 'Évolutions possibles',
      faq_title: 'Questions fréquentes',
      formation_title: 'Formation',
      acces_title: 'Accès au métier',
      marche_title: 'Marché du travail',
      salaire_title: 'Rémunération',
      background_color: '#ffffff',
      card_color: '#f8fafc',
      text_color: '#0f172a',
      primary_color: '#6366f1',
      accent_color: '#f59e0b',
      font_family: 'Outfit',
      font_size: 15
    };
    
    // Base de données de métiers pour l'autocomplétion
    const metiersDatabase = [
      { nom: '', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA', 'LU', 'UK', 'US'] },
      { nom: 'Développeur Front-End', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Développeur Back-End', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Data Scientist', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'UK', 'US'] },
      { nom: 'DevOps Engineer', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA', 'UK'] },
      { nom: 'Chef de Projet Digital', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'LU'] },
      { nom: 'UX/UI Designer', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'CA', 'UK'] },
      { nom: 'Product Manager', secteur: 'tech', pays: ['FR', 'BE', 'CH', 'UK', 'US'] },
      { nom: 'Analyste Financier', secteur: 'finance', pays: ['FR', 'BE', 'CH', 'LU', 'UK'] },
      { nom: 'Trader', secteur: 'finance', pays: ['FR', 'UK', 'US', 'CH'] },
      { nom: 'Comptable', secteur: 'finance', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Infirmier', secteur: 'sante', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Médecin Généraliste', secteur: 'sante', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Pharmacien', secteur: 'sante', pays: ['FR', 'BE', 'CH', 'LU'] },
      { nom: 'Chef de Projet Construction', secteur: 'construction', pays: ['FR', 'BE', 'CH', 'LU'] },
      { nom: 'Architecte', secteur: 'construction', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Conducteur de Travaux', secteur: 'construction', pays: ['FR', 'BE', 'LU'] },
      { nom: 'Commercial', secteur: 'commerce', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Chef de Produit', secteur: 'commerce', pays: ['FR', 'BE', 'CH', 'UK'] },
      { nom: 'Responsable Marketing', secteur: 'communication', pays: ['FR', 'BE', 'CH', 'CA', 'UK'] },
      { nom: 'Community Manager', secteur: 'communication', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Professeur', secteur: 'education', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Formateur', secteur: 'education', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Avocat', secteur: 'juridique', pays: ['FR', 'BE', 'CH', 'LU', 'CA'] },
      { nom: 'Juriste', secteur: 'juridique', pays: ['FR', 'BE', 'CH', 'LU'] },
      { nom: 'Responsable RH', secteur: 'rh', pays: ['FR', 'BE', 'CH', 'CA', 'LU'] },
      { nom: 'Recruteur', secteur: 'rh', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Ingénieur Logistique', secteur: 'transport', pays: ['FR', 'BE', 'LU', 'DE'] },
      { nom: 'Chef de Cuisine', secteur: 'hotellerie', pays: ['FR', 'BE', 'CH', 'CA'] },
      { nom: 'Ingénieur Environnement', secteur: 'environnement', pays: ['FR', 'BE', 'CH', 'CA'] }
    ];
    
    // Gestion de l'autocomplétion
    const metierInput = document.getElementById('filter-metier');
    const suggestionsContainer = document.getElementById('metier-suggestions');
    
    function filterMetiers(query, selectedPays, selectedSecteur) {
      if (!query || query.length < 2) return [];
      
      const lowerQuery = query.toLowerCase();
      return metiersDatabase.filter(metier => {
        const matchesQuery = metier.nom.toLowerCase().includes(lowerQuery);
        const matchesPays = !selectedPays || selectedPays === '' || metier.pays.includes(selectedPays);
        const matchesSecteur = !selectedSecteur || selectedSecteur === '' || metier.secteur === selectedSecteur;
        
        return matchesQuery && matchesPays && matchesSecteur;
      });
    }
    
    function renderSuggestions(metiers) {
      if (metiers.length === 0) {
        suggestionsContainer.innerHTML = '<div class="px-4 py-3 text-sm" style="color: var(--muted);">Aucun métier trouvé</div>';
        suggestionsContainer.classList.remove('hidden');
        return;
      }
      
      suggestionsContainer.innerHTML = metiers.map(metier => \`
        <div class="suggestion-item px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 text-sm font-medium" style="color: var(--text); border-bottom: 1px solid var(--border);" data-metier="\${metier.nom}">
          <div class="flex items-center justify-between">
            <span>\${metier.nom}</span>
            <span class="text-xs px-2 py-1 rounded" style="background: rgba(99,102,241,0.1); color: var(--primary);">\${getSecteurLabel(metier.secteur)}</span>
          </div>
        </div>
      \`).join('');
      
      suggestionsContainer.classList.remove('hidden');
      
      // Ajouter les event listeners sur les suggestions
      document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
          metierInput.value = this.dataset.metier;
          suggestionsContainer.classList.add('hidden');
          applyFilters();
        });
      });
    }
    
    function getSecteurLabel(secteur) {
      const labels = {
        'tech': 'Tech',
        'finance': 'Finance',
        'sante': 'Santé',
        'commerce': 'Commerce',
        'industrie': 'Industrie',
        'construction': 'BTP',
        'transport': 'Transport',
        'education': 'Éducation',
        'communication': 'Marketing',
        'juridique': 'Juridique',
        'rh': 'RH',
        'hotellerie': 'Hôtellerie',
        'environnement': 'Environnement',
        'art': 'Arts',
        'securite': 'Sécurité'
      };
      return labels[secteur] || secteur;
    }
    
    metierInput.addEventListener('input', function(e) {
      const query = e.target.value;
      const selectedPays = document.getElementById('filter-pays').value;
      const selectedSecteur = document.getElementById('filter-secteur').value;
      
      if (query.length < 2) {
        suggestionsContainer.classList.add('hidden');
        return;
      }
      
      const filteredMetiers = filterMetiers(query, selectedPays, selectedSecteur);
      renderSuggestions(filteredMetiers);
    });
    
    // Fermer les suggestions au clic extérieur
    document.addEventListener('click', function(e) {
      if (!metierInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        suggestionsContainer.classList.add('hidden');
      }
    });
    
    // Gestion du focus sur les selects
    const filterPays = document.getElementById('filter-pays');
    const filterSecteur = document.getElementById('filter-secteur');
    
    [filterPays, filterSecteur, metierInput].forEach(element => {
      element.addEventListener('focus', function() {
        this.style.borderColor = 'var(--primary)';
        this.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
      });
      
      element.addEventListener('blur', function() {
        this.style.borderColor = 'var(--border)';
        this.style.boxShadow = 'none';
      });
    });
    
    // Gestion de l'application des filtres
    function applyFilters() {
      const pays = filterPays.value;
      const secteur = filterSecteur.value;
      const metier = metierInput.value;
      
      // Ici vous pourriez faire une requête API ou filtrer des données
      console.log('Filtres appliqués:', { pays, secteur, metier });
      
      // Mise à jour du compteur (exemple)
      const resultCount = document.getElementById('result-count');
      if (metier && metiersDatabase.some(m => m.nom.toLowerCase() === metier.toLowerCase())) {
        resultCount.textContent = '1';
      } else {
        resultCount.textContent = metiersDatabase.length;
      }
    }
    
    filterPays.addEventListener('change', applyFilters);
    filterSecteur.addEventListener('change', applyFilters);
    
    // Réinitialiser les filtres
    document.getElementById('reset-filters').addEventListener('click', function() {
      filterPays.value = 'FR';
      filterSecteur.value = 'tech';
      metierInput.value = '';
      suggestionsContainer.classList.add('hidden');
      applyFilters();
    });
    
    // FAQ Accordion functionality
    document.querySelectorAll('.faq-question').forEach(button => {
      button.addEventListener('click', function() {
        const faqItem = this.closest('.faq-item');
        const answer = faqItem.querySelector('.faq-answer');
        const icon = this.querySelector('.faq-icon');
        const isOpen = !answer.classList.contains('hidden');
        
        // Close all other FAQs
        document.querySelectorAll('.faq-item').forEach(item => {
          if (item !== faqItem) {
            item.querySelector('.faq-answer').classList.add('hidden');
            item.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
            item.querySelector('.faq-question').style.borderColor = 'var(--border)';
          }
        });
        
        // Toggle current FAQ
        if (isOpen) {
          answer.classList.add('hidden');
          icon.style.transform = 'rotate(0deg)';
          this.style.borderColor = 'var(--border)';
        } else {
          answer.classList.remove('hidden');
          icon.style.transform = 'rotate(180deg)';
          this.style.borderColor = 'var(--primary)';
        }
      });
    });
    
    async function onConfigChange(config) {
      // Update text content
      const nomMetier = document.getElementById('nom-metier');
      const accrocheMetier = document.getElementById('accroche-metier');
      const sponsorNameBanner = document.getElementById('sponsor-name-banner');
      const sponsorNameSidebar = document.getElementById('sponsor-name-sidebar');
      const sponsorBannerLink = document.getElementById('sponsor-banner-link');
      const sponsorLogoLink = document.getElementById('sponsor-logo-link');
      const sponsorCta = document.getElementById('sponsor-cta');
      
      if (nomMetier) nomMetier.textContent = config.nom || defaultConfig.nom;
      if (accrocheMetier) accrocheMetier.textContent = config.accroche || defaultConfig.accroche;
      if (sponsorNameBanner) sponsorNameBanner.textContent = config.sponsor_name || defaultConfig.sponsor_name;
      if (sponsorNameSidebar) sponsorNameSidebar.textContent = config.sponsor_name || defaultConfig.sponsor_name;
      
      const sponsorLink = config.lien_sponsor || defaultConfig.lien_sponsor;
      if (sponsorBannerLink) sponsorBannerLink.href = sponsorLink;
      if (sponsorLogoLink) sponsorLogoLink.href = sponsorLink;
      if (sponsorCta) sponsorCta.href = sponsorLink;
      
      // Update section titles
      const titleMap = {
        'description-title': 'description_title',
        'missions-title': 'missions_title',
        'competences-title': 'competences_title',
        'environnements-title': 'environnements_title',
        'profil-title': 'profil_title',
        'evolutions-title': 'evolutions_title',
        'faq-title': 'faq_title',
        'formation-title': 'formation_title',
        'acces-title': 'acces_title',
        'marche-title': 'marche_title',
        'salaire-title': 'salaire_title'
      };
      
      for (const [elementId, configKey] of Object.entries(titleMap)) {
        const element = document.getElementById(elementId);
        if (element) {
          const icon = element.querySelector('svg') || element.querySelector('span');
          const currentText = config[configKey] || defaultConfig[configKey];
          element.textContent = currentText;
          if (icon) {
            element.insertBefore(icon, element.firstChild);
          }
        }
      }
      
      // Apply colors
      document.documentElement.style.setProperty('--bg', config.background_color || defaultConfig.background_color);
      document.documentElement.style.setProperty('--card', config.card_color || defaultConfig.card_color);
      document.documentElement.style.setProperty('--text', config.text_color || defaultConfig.text_color);
      document.documentElement.style.setProperty('--primary', config.primary_color || defaultConfig.primary_color);
      document.documentElement.style.setProperty('--accent', config.accent_color || defaultConfig.accent_color);
      
      // Apply font
      const customFont = config.font_family || defaultConfig.font_family;
      document.documentElement.style.setProperty('--font-family', \`'\${customFont}', sans-serif\`);
      
      // Apply font size
      const baseSize = config.font_size || defaultConfig.font_size;
      document.documentElement.style.setProperty('--font-base', \`\${baseSize}px\`);
      document.body.style.fontSize = \`\${baseSize}px\`;
    // Hydrate pays select from catalog.json (249 pays)
    try{ hydratePaysSelect(root, getISO()); }catch(_){}

    }
    
    function mapToCapabilities(config) {
      return {
        recolorables: [
          {
            get: () => config.background_color || defaultConfig.background_color,
            set: (value) => {
              config.background_color = value;
              window.elementSdk.setConfig({ background_color: value });
            }
          },
          {
            get: () => config.card_color || defaultConfig.card_color,
            set: (value) => {
              config.card_color = value;
              window.elementSdk.setConfig({ card_color: value });
            }
          },
          {
            get: () => config.text_color || defaultConfig.text_color,
            set: (value) => {
              config.text_color = value;
              window.elementSdk.setConfig({ text_color: value });
            }
          },
          {
            get: () => config.primary_color || defaultConfig.primary_color,
            set: (value) => {
              config.primary_color = value;
              window.elementSdk.setConfig({ primary_color: value });
            }
          },
          {
            get: () => config.accent_color || defaultConfig.accent_color,
            set: (value) => {
              config.accent_color = value;
              window.elementSdk.setConfig({ accent_color: value });
            }
          }
        ],
        borderables: [],
        fontEditable: {
          get: () => config.font_family || defaultConfig.font_family,
          set: (value) => {
            config.font_family = value;
            window.elementSdk.setConfig({ font_family: value });
          }
        },
        fontSizeable: {
          get: () => config.font_size || defaultConfig.font_size,
          set: (value) => {
            config.font_size = value;
            window.elementSdk.setConfig({ font_size: value });
          }
        }
      };
    }
    
    function mapToEditPanelValues(config) {
      return new Map([
        ['nom', config.nom || defaultConfig.nom],
        ['accroche', config.accroche || defaultConfig.accroche],
        ['sponsor_name', config.sponsor_name || defaultConfig.sponsor_name],
        ['lien_sponsor', config.lien_sponsor || defaultConfig.lien_sponsor],
        ['description_title', config.description_title || defaultConfig.description_title],
        ['missions_title', config.missions_title || defaultConfig.missions_title],
        ['competences_title', config.competences_title || defaultConfig.competences_title],
        ['environnements_title', config.environnements_title || defaultConfig.environnements_title],
        ['profil_title', config.profil_title || defaultConfig.profil_title],
        ['evolutions_title', config.evolutions_title || defaultConfig.evolutions_title],
        ['faq_title', config.faq_title || defaultConfig.faq_title],
        ['formation_title', config.formation_title || defaultConfig.formation_title],
        ['acces_title', config.acces_title || defaultConfig.acces_title],
        ['marche_title', config.marche_title || defaultConfig.marche_title],
        ['salaire_title', config.salaire_title || defaultConfig.salaire_title]
      ]);
    }
    
    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities,
        mapToEditPanelValues
      });
    }
  </script>
 <script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9c15a4f745056984',t:'MTc2ODk4NjI2OS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>`; }

  // ---------- Cards helpers ----------
  function cardByTitleId(titleId) {
    const h = document.getElementById(titleId);
    if (!h) return null;
    return h.closest(".card") || h.closest("section") || h.parentElement || null;
  }
  function hideCard(titleId) { const c = cardByTitleId(titleId); if (c) c.style.display = "none"; }
  function showCard(titleId) { const c = cardByTitleId(titleId); if (c) c.style.display = ""; }
  function sectionContentNode(titleId) {
    const h = document.getElementById(titleId);
    if (!h) return null;
    const c = cardByTitleId(titleId);
    if (!c) return null;
    return c.querySelector(".rich-content") || c.querySelector(".space-y-4") || c;
  }
  function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = (txt == null) ? "" : String(txt); }
  function setRich(titleId, htmlOrText) {
    const node = sectionContentNode(titleId);
    if (!node) return;
    if (isEmptyRich(htmlOrText)) { hideCard(titleId); return; }
    showCard(titleId);
    const s = String(htmlOrText);
    if (/<[a-z][\s\S]*>/i.test(s)) node.innerHTML = s;
    else node.innerHTML = `<p>${formatInlineBold(s).replace(/\n+/g, "<br/>")}</p>`;
  }

  // ---------- Hide pays-bloc UI by header text (no IDs in template) ----------
  const PAYS_HEADERS = [
    "Indicateurs clés",
    "Grille salariale",
    "Compétences incontournables",
    "Soft Skills essentielles",
    "Stack Technique Populaire",
    "Certifications utiles",
    "Écoles & Parcours recommandés",
    "Projets Portfolio essentiels",
    "Projets Portfolio",
    "Écoles & Parcours",
  ];
  function hidePaysCardsByHeader() {
    const headers = $all(".card-header .section-title");
    headers.forEach(h => {
      const t = (h.textContent || "").trim();
      if (!t) return;
      const hit = PAYS_HEADERS.some(k => t.includes(k));
      if (!hit) return;
      const card = h.closest(".card") || h.closest("section") || h.parentElement;
      if (card) card.style.display = "none";
    });
  }

  function killTemplatePlaceholdersNow() {
    // sponsor placeholders
    const nb = document.getElementById("sponsor-name-banner");
    const ns = document.getElementById("sponsor-name-sidebar");
    if (nb) nb.textContent = "";
    if (ns) ns.textContent = "";
    // FAQ: keep template visible by default (renderFAQ will replace only when payload provides relevant items)
// Metier_Pays_Bloc rich sections in template: hide + clear
    ["acces-title","marche-title","salaire-title","formation-title"].forEach(id => {
      const c = cardByTitleId(id);
      if (c) {
        c.style.display = "none";
        const node = sectionContentNode(id);
        if (node) node.innerHTML = "";
      }
    });

    // All pays-bloc UI (KPI, salary grid, chips, etc.)
    hidePaysCardsByHeader();
  }

  // ---------- Worker ----------
  async function fetchMetierPayload({ iso, slug }) {
    if (!slug) return null;
    const url = new URL(`${WORKER_URL}/v1/metier-page`);
    url.searchParams.set("iso", iso);
    url.searchParams.set("slug", slug);
    url.searchParams.set("proxy_secret", PROXY_SECRET);
    return fetchJSON(url.toString()).catch((e) => {
      console.warn("[metier.v12.4] worker payload failed", e);
      return null;
    });
  }

  // ---------- Sponsor rendering (single <img>, no overlay) ----------
  function replaceWideBannerWithImg(wideA, wideUrl, fallbackUrl) {
    if (!wideA) return;
    // Force same dimensions for sponsor & non-sponsor
    try{
      wideA.style.width = "100%";
      wideA.style.maxWidth = "680px";
      wideA.style.height = "120px";
      wideA.style.borderRadius = "16px";
      wideA.style.overflow = "hidden";
      wideA.style.display = "block";
      wideA.style.marginLeft = "auto";
      wideA.style.marginRight = "auto";
    }catch(_){}
    wideA.classList.add("ul-has-banner-img");
    wideA.style.backgroundImage = "none";
    if (!wideUrl) {
      wideA.innerHTML = "";
      return;
    }
    const safe = wideUrl.replace(/"/g, "&quot;");
    wideA.innerHTML = `
      <img alt="" src="${safe}"
           style="width:100%;height:100%;object-fit:cover;display:block" />
    `;
    const img = wideA.querySelector("img");
    if (img && fallbackUrl) {
      img.onerror = () => {
        // avoid broken-image frame
        img.onerror = null;
        img.src = fallbackUrl;
      };
    }
  }
  function replaceSquareWithImg(logoBox, squareUrl, fallbackUrl) {
    if (!logoBox) return;
    // Force same dimensions for sponsor & non-sponsor
    try{
      logoBox.style.width = "100%";
      logoBox.style.maxWidth = "300px";
      logoBox.style.height = "300px";
      logoBox.style.borderRadius = "16px";
      logoBox.style.overflow = "hidden";
      logoBox.style.marginLeft = "auto";
      logoBox.style.marginRight = "auto";
    }catch(_){}
    logoBox.style.backgroundImage = "none";
    if (!squareUrl) { logoBox.innerHTML = ""; return; }
    const safe = squareUrl.replace(/"/g, "&quot;");
    logoBox.innerHTML = `
      <img alt="" src="${safe}"
           style="width:100%;height:100%;object-fit:cover;border-radius:16px;display:block" />
    `;
    const img = logoBox.querySelector("img");
    if (img && fallbackUrl) {
      img.onerror = () => {
        img.onerror = null;
        img.src = fallbackUrl;
      };
    }
  }

  
async function resolveCountryBanners(iso, payload) {
  // 1) Prefer banners coming from the Worker payload (STRICT mapping, no guessing)
// banner_1 = 680x120 (wide), banner_2 = 300x300 (square)
{
  const pPays = (payload && payload.pays) ? payload.pays : {};
  const pB = (pPays && pPays.banners) ? pPays.banners : {};

  const pickU = (...xs) => {
    for (const x of xs) {
      const u = pickUrl(x);
      if (u) return u;
    }
    return "";
  };

  const wide = pickU(
    pB.banner_1, pB.banniere_1, pB.image_1, pB.wide, pB.logo_2,
    pPays.banner_1, pPays.banniere_1, pPays.image_1, pPays.wide
  );
  const square = pickU(
    pB.banner_2, pB.banniere_2, pB.image_2, pB.square, pB.logo_1,
    pPays.banner_2, pPays.banniere_2, pPays.image_2, pPays.square
  );
  const cta = pickFirst(
    pB.cta, pPays.cta, payload && payload.cta
  );

  if (wide || square) {
    if (DEBUG) console.log("[banners] from payload (strict)", { wide, square, cta });
    return { wide: wide || "", square: square || "", cta: cta || "" };
  }
}
// 2) Fallback to catalog.json countries map (STRICT)
// IMPORTANT mapping (confirmed specs):
//  - banner_1 : 680x120  => WIDE (horizontal)
//  - banner_2 : 300x300  => SQUARE

// Robustly read catalog structure (countries/pays/items)
const data = await fetchJSON(`${CATALOG_URL}?v=${Date.now()}`).catch(() => null);
const countries = (
  data?.countries ||
  data?.pays ||
  data?.items ||
  data?.data?.countries ||
  data?.data?.pays ||
  []
);

function getObj(x){ return x?.fieldData || x?.fields || x || {}; }
function getIso(x){
  const o = getObj(x);
  return String(
    o.iso || o.code || o.code_iso || o.codeIso || o.iso2 || o.ISO || o["Code ISO"] || o["ISO"] || ""
  ).trim().toUpperCase();
}
const c = (Array.isArray(countries) ? countries : []).find(x => getIso(x) === iso) || null;
if (!c) return { wide:"", square:"", cta:"" };

// Support multiple naming conventions (strict mapping)
const o = getObj(c);
const b = o?.banners || o?.banner || o || {};

// STRICT mapping (no guessing)
// IMPORTANT mapping (confirmed specs):
//  - banner_1 / image_1 / logo_2 : 680x120  => WIDE (horizontal)
//  - banner_2 / image_2 / logo_1 : 300x300  => SQUARE
const wide = pickUrl(pickFirst(
  b?.banner_1, b?.banniere_1, b?.image_1, b?.wide, b?.banner_wide, b?.image_wide, b?.logo_2,
  o?.banner_1, o?.banniere_1, o?.image_1, o?.wide, o?.banners?.banner_1, o?.banners?.image_1, o?.banners?.logo_2
));
const square = pickUrl(pickFirst(
  b?.banner_2, b?.banniere_2, b?.image_2, b?.square, b?.banner_square, b?.image_square, b?.logo_1,
  o?.banner_2, o?.banniere_2, o?.image_2, o?.square, o?.banners?.banner_2, o?.banners?.image_2, o?.banners?.logo_1
));
const cta = String(b?.cta || o?.cta || "").trim();
  return { wide, square, cta };
}


  // Render a graceful "unavailable" state while keeping the search/filter bar.
  function renderUnavailableState(message, sub){
    const root = ensureRoot();
    renderShell(root);

    // Keep filters/search bar visible, but remove ALL job-specific content.
    const headerEl = root.querySelector("header");
    if (headerEl) headerEl.style.display = "none";

    const mainEl = root.querySelector("main");
    if (mainEl) mainEl.innerHTML = "";

    // Build centered card (replaces the "Chargement…" area)
    const card = document.createElement("div");
    card.className = "card";
    card.style.maxWidth = "760px";
    card.style.margin = "40px auto";
    card.style.boxShadow = "0 12px 32px rgba(0,0,0,.10)";
    card.style.border = "1px solid var(--border)";
    card.style.borderRadius = "16px";
    card.style.padding = "22px";
    card.style.textAlign = "center";

    card.innerHTML = `
      <div data-ul="unavailable-message" style="font-size:18px;font-weight:800;color:#e11d2e;margin-bottom:6px">
        ${escapeHtml(message || "Sorry, this job is not available in your country at the moment.")}
      </div>
      <div style="color:var(--muted);font-size:14px;line-height:1.45">
        ${escapeHtml(sub || "Please select another country or search for another job.")}
      </div>
    `;

    // Put the card where the content normally starts
    (mainEl || root).appendChild(card);

    // Ensure page is visible even with anti-FOUC
    try{ hideLoader(); }catch(_){}
    try{ try{ var r=document.getElementById("ulydia-metier-root"); if(r) r.style.opacity="1"; }catch(_){ }
    document.documentElement.classList.remove("ul-metier-loading"); try{ var r=document.getElementById("ulydia-metier-root"); if(r) r.style.opacity="1"; }catch(_){ } }catch(_){}
  }

  async function applySponsor({ iso, slug, payload }) {
    const p = qp();
    const isPreview = String(p.get("preview") || "") === "1";

    const root = document.getElementById("ulydia-metier-root") || document.body;

    // Prefer the shell IDs, but support alt hooks or auto-inject if missing
    // NOTE: In some Webflow templates the classes were swapped.
    // We therefore map:
    // - WIDE (horizontal) banner -> .ul-banner-square (legacy template)
    // - SQUARE logo banner       -> .ul-banner-wide   (legacy template)
    let wideA = document.getElementById("sponsor-banner-link")
      || root.querySelector('.ul-banner-square')
      || root.querySelector('[data-ul-banner="wide"]');

    let logoA = document.getElementById("sponsor-logo-link")
      || root.querySelector('.ul-banner-wide')
      || root.querySelector('[data-ul-banner="square"]');

    // If the template doesn't contain placeholders, inject them (so banners always work)
    if (!wideA) {
      const anchor = document.createElement("a");
      anchor.id = "sponsor-banner-link";
      anchor.setAttribute("data-ul-banner", "wide");
      anchor.href = "#";
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.style.display = "block";
      anchor.style.width = "100%";
      anchor.style.marginTop = "12px";
      // insert after H1 if possible
      const h1 = document.getElementById("nom-metier")?.closest("h1") || document.getElementById("nom-metier");
      if (h1 && h1.parentNode) h1.parentNode.insertBefore(anchor, h1.nextSibling);
      else root.prepend(anchor);
      wideA = anchor;
    }

    if (!logoA) {
      const anchor = document.createElement("a");
      anchor.id = "sponsor-logo-link";
      anchor.setAttribute("data-ul-banner", "square");
      anchor.href = "#";
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.style.display = "block";
      anchor.style.width = "100%";

      const box = document.createElement("div");
      box.className = "sponsor-logo-square";
      box.style.width = "100%";
      box.style.borderRadius = "16px";
      box.style.overflow = "hidden";
      box.style.border = "2px solid var(--border)";
      box.style.background = "#fff";
      anchor.appendChild(box);

      // Try to insert into right sidebar if exists
      const sidebar = root.querySelector('.right-panel') || root.querySelector('[data-ul-sidebar]') || root;
      sidebar.appendChild(anchor);
      logoA = anchor;
    }

    const logoBox = logoA ? (logoA.querySelector(".sponsor-logo-square") || logoA) : null;
    const ctaBtn = document.getElementById("sponsor-cta") || document.getElementById("sponsor-cta-btn");
function setLinks(linkUrl){
      if (!linkUrl) return;
      if (wideA) wideA.href = linkUrl;
      if (logoA) logoA.href = linkUrl;
      if (ctaBtn) ctaBtn.href = linkUrl;
    }
    function setNames(name){
      const nb = document.getElementById("sponsor-name-banner");
      const ns = document.getElementById("sponsor-name-sidebar");
      if (nb) nb.textContent = name || "";
      if (ns) ns.textContent = name || "";
    }

    // fallback banners (always available)
    
    function hideNonSponsorBanners(){
      // Hide any non-sponsor placeholders that might be in the template
      $all('[data-ul-banner-fallback], .ul-banner-fallback, [data-ul-nonsponsor]').forEach(el=>{
        try{ el.style.display = "none"; }catch(_){}
      });
    }
    function showNonSponsorBanners(){
      $all('[data-ul-banner-fallback], .ul-banner-fallback, [data-ul-nonsponsor]').forEach(el=>{
        try{ el.style.display = ""; }catch(_){}
      });
    }

const fb = await resolveCountryBanners(iso, payload);
    const fallbackLink = `/sponsor?country=${encodeURIComponent(iso)}&metier=${encodeURIComponent(slug || "")}`;

    // 1) Preview
    if (isPreview) {
      const wide = decodeURIComponent(String(p.get("preview_landscape") || p.get("preview_wide") || "").trim());
      const square = decodeURIComponent(String(p.get("preview_square") || "").trim());
      const link = decodeURIComponent(String(p.get("preview_link") || "").trim());
      const sname = decodeURIComponent(String(p.get("preview_name") || "").trim());

      replaceWideBannerWithImg(wideA, wide, fb.wide);
      replaceSquareWithImg(logoBox, square, fb.square);
      setLinks(link || fallbackLink);
      setNames(sname);
      if (fb.cta && ctaBtn) ctaBtn.textContent = fb.cta;
      return;
    }

    // 2) Webflow metier fields (ROBUST mapping: supports Webflow slugged keys)
    const m = payload?.metier || payload?.job || payload?.item || payload || {};
    const f = m?.fieldData || m?.fields || m || {};

    function pickFirst(obj, keys){
      for (const k of keys){
        if (!obj) continue;
        const v = obj[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
      return "";
    }

    // Webflow API often returns slugged keys like "sponsor-logo-2" etc.
    const wfNameRaw = pickFirst(f, ["sponsor_name","sponsorName","sponsor-name","Sponsor_name","Sponsor Name"]);
    const wfLinkRaw = pickFirst(f, ["lien_sponsor","lienSponsor","lien-sponsor","Lien_sponsor","Lien Sponsor"]);

    const wfName = String(wfNameRaw || "").trim();
    const wfLink = String(
      wfLinkRaw?.url || wfLinkRaw?.href || wfLinkRaw?.link || wfLinkRaw || ""
    ).trim();

    const wideUrl = pickUrl(pickFirst(f, ["sponsor_logo_2","sponsorLogo2","sponsor-logo-2","Sponsor_logo_2","Sponsor logo 2","Sponsor_logo_2 (wide)"])); // wide
    const squareUrl = pickUrl(pickFirst(f, ["sponsor_logo_1","sponsorLogo1","sponsor-logo-1","Sponsor_logo_1","Sponsor logo 1","Sponsor_logo_1 (square)"])); // square

    // Also accept nested sponsor object if present
    const sObj = payload?.sponsor || f?.sponsor || null;
    const wideUrl2 = wideUrl || pickUrl(sObj?.logo_2 || sObj?.logo2 || sObj?.wide || sObj?.banner_wide || "");
    const squareUrl2 = squareUrl || pickUrl(sObj?.logo_1 || sObj?.logo1 || sObj?.square || sObj?.banner_square || "");
    const link2 = wfLink || String(sObj?.link || sObj?.url || "").trim();
    const name2 = wfName || String(sObj?.name || "").trim();

    const hasSponsor = (payload?.sponsor?.active === true) || !!(wideUrl2 || squareUrl2);
if (hasSponsor) {
      hideNonSponsorBanners();
      // IMPORTANT: if sponsor exists, do NOT show fallback banners
      replaceWideBannerWithImg(wideA, wideUrl2, "");        // no fallback
      replaceSquareWithImg(logoBox, squareUrl2, "");        // no fallback
      setLinks(link2 || fallbackLink);
      setNames(name2);
      if (ctaBtn) ctaBtn.style.display = ""; // keep
      return;
    }

    // 3) Fallback country banners (no sponsor)

    showNonSponsorBanners();

    const swapFallback = String(p.get("swap_fallback") || "") === "1";
    const compareFallback = String(p.get("compare_fallback") || "") === "1";

    let fw = fb.wide || "";
    let fs = fb.square || "";
    if (swapFallback) { const tmp = fw; fw = fs; fs = tmp; }

    // Default fallback rendering
    replaceWideBannerWithImg(wideA, fw, "");
    replaceSquareWithImg(logoBox, fs, "");
    setLinks(fallbackLink);
    setNames("");
    if (fb.cta && ctaBtn) ctaBtn.textContent = fb.cta;

    // Optional comparison mode: duplicate + render swapped mapping to visually confirm
    if (compareFallback) {
      try{
        // --- Wide duplicate (below the main wide banner) ---
        const wideWrap = wideA.parentElement;
        if (wideWrap && !document.getElementById("ulydia-wide-compare")) {
          const lab = document.createElement("div");
          lab.id = "ulydia-wide-compare";
          lab.style.marginTop = "10px";
          lab.style.fontSize = "12px";
          lab.style.color = "var(--muted,#64748b)";
          lab.textContent = "Comparaison fallback: mapping inversé (debug)";
          wideWrap.insertBefore(lab, wideA.nextSibling);

          const wideA2 = wideA.cloneNode(false);
          wideA2.id = "sponsor-banner-link-fallback-swap";
          wideWrap.insertBefore(wideA2, lab.nextSibling);

          // swapped rendering for compare (always the opposite)
          const w2 = fs || "";
          replaceWideBannerWithImg(wideA2, w2, "");
          // keep same click target
          wideA2.href = fallbackLink;
        }

        // --- Square duplicate (below the main square box) ---
        const side = logoBox.parentElement;
        if (side && !document.getElementById("ulydia-square-compare")) {
          const lab2 = document.createElement("div");
          lab2.id = "ulydia-square-compare";
          lab2.style.marginTop = "10px";
          lab2.style.fontSize = "12px";
          lab2.style.color = "var(--muted,#64748b)";
          lab2.textContent = "Comparaison fallback: mapping inversé (debug)";
          side.appendChild(lab2);

          const box2 = document.createElement("div");
          box2.style.width = "100%";
          box2.style.maxWidth = "300px";
          box2.style.height = "300px";
          box2.style.borderRadius = "16px";
          box2.style.overflow = "hidden";
          box2.style.margin = "10px auto 0";
          side.appendChild(box2);

          const s2 = fw || "";
          replaceSquareWithImg(box2, s2, "");
        }
      }catch(_){}
    }
  }

  
  function slugify(str){
    return String(str||"")
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/(^-|-$)/g,"")
      .trim();
  }

// ---------- FAQ ----------
  function wireFAQToggles() {
    $all(".faq-question").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        if (!item) return;
        const ans = $(".faq-answer", item);
        const icon = $(".faq-icon", item);
        if (!ans) return;
        const open = !ans.classList.contains("hidden");
        if (open) { ans.classList.add("hidden"); if (icon) icon.style.transform = "rotate(0deg)"; }
        else { ans.classList.remove("hidden"); if (icon) icon.style.transform = "rotate(180deg)"; }
      });
    });
  }
  function renderFAQ(list) {
    let faqCard = cardByTitleId("faq-title");
    let created = false;

    // If template doesn't include a FAQ card, create one (full-code mode)
    if (!faqCard) {
      const root = document.getElementById("ulydia-metier-root") || document.body;
      const host = root.querySelector(".left-panel") || root.querySelector(".main-content") || root;
      const wrap = document.createElement("section");
      wrap.className = "card mt-6";
      wrap.innerHTML = `
        <div class="card-header">
          <div class="icon-badge">❓</div>
          <div>
            <div class="section-title" id="faq-title">FAQ</div>
            <div class="section-subtitle">Questions fréquentes</div>
          </div>
        </div>
        <div class="card-body">
          <div class="space-y-3" data-ul-faqs></div>
        </div>
      `;
      host.appendChild(wrap);
      faqCard = wrap;
      created = true;
    }

    if (!Array.isArray(list) || list.length === 0) {
      // No matching FAQs => hide the whole section (avoid showing irrelevant template content)
      const wrap0 = faqCard.querySelector(".space-y-3");
      if (wrap0) wrap0.innerHTML = "";
      faqCard.style.display = "none";
      return;
    }
    faqCard.style.display = "";

    const wrap = faqCard.querySelector(".space-y-3");
    if (!wrap) return;

    wrap.innerHTML = list.map(item => {
      const q = String(item.question || item.q || item["Question"] || item.name || item["Name"] || item.title || item["Titre"] || "").trim();
      const a = String(item.answer || item.a || item["Réponse"] || item["Reponse"] || item.reponse || item.response || item["Response"] || "").trim();
      const qSafe = formatInlineBold(q || "—");
      const aHtml = /<[a-z][\s\S]*>/i.test(a) ? a : `<p>${formatInlineBold(a)}</p>`;
      return `
        <div class="faq-item">
          <button class="faq-question w-full text-left p-4 rounded-lg transition-all flex items-start justify-between gap-3" style="background: white; border: 2px solid var(--border);">
            <div class="flex items-start gap-3 flex-1">
              <span class="text-xl flex-shrink-0">❓</span>
              <span class="font-semibold text-sm" style="color: var(--text);">${qSafe}</span>
            </div>
            <svg class="faq-icon w-5 h-5 flex-shrink-0 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="faq-answer hidden mt-2 px-4 py-3 rounded-lg text-sm" style="background: rgba(99,102,241,0.05); color: var(--text); border-left: 3px solid var(--primary); margin-left: 20px;">
            ${aHtml}
          </div>
        </div>
      `;
    }).join("");
    wireFAQToggles();
  }

  // ---------- Metier_Pays_Bloc (strict match by slug+iso) ----------
  function norm(s){ return String(s || "").trim().toLowerCase(); }
  function getFrom(obj, ...keys){
    for (const k of keys){
      const v = obj && obj[k];
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      return v;
    }
    return undefined;
  }

  
function blocMatches(bloc, slug, iso) {
  const b = bloc?.fieldData || bloc?.fields || bloc || {};

  const isoCand = pickFirst(
    getFrom(b, "country_code", "Country_code", "code_iso", "Code ISO", "iso", "ISO"),
    // sometimes inside a linked Pays reference
    (Array.isArray(b.Pays) ? b.Pays[0]?.iso : b.Pays?.iso),
    (Array.isArray(b.pays) ? b.pays[0]?.iso : b.pays?.iso),
    b?.pays_ref?.iso
  );
  const bIso = String(isoCand || "").trim().toUpperCase();

  // slug can be stored directly, or as a reference to the Metier item
  const refJob = getFrom(b, "job_slug", "Job_slug", "Job slug", "metier", "metier_lie", "métier lié", "metier lié", "job") || null;

  const refJobSlug =
    (typeof refJob === "string" ? refJob : null) ||
    refJob?.slug ||
    refJob?.fieldData?.slug ||
    refJob?.fields?.slug ||
    refJob?.fieldData?.Slug ||
    refJob?.fields?.Slug ||
    "";

  const directSlug = pickFirst(
    getFrom(b, "metier_slug", "metierSlug", "jobSlug", "slug"),
    getFrom(b, "Job_slug_slug", "job_slug_slug")
  );

  const bSlug = String(directSlug || refJobSlug || "").trim();

  // Also accept when only the job NAME is stored in "métier lié" (no slug)
  const refJobName =
    refJob?.name || refJob?.fieldData?.name || refJob?.fields?.name || "";

  const okIso = !bIso || bIso === iso;
  const okSlug =
    (!!bSlug && norm(bSlug) === norm(slug)) ||
    (!!bSlug && norm(bSlug).startsWith(norm(slug))) || // tolerate suffix like "-47b49"
    (!!refJobName && norm(refJobName).includes(norm(slug))); // last-resort

  return okIso && okSlug;
}

  function findBloc(payload, slug, iso) {
    const candidates =
      payload?.metier_pays_blocs ||
      payload?.metier_pays_bloc ||
      payload?.metierPaysBlocs ||
      payload?.metierPaysBloc ||
      payload?.blocs ||
      payload?.bloc ||
      null;

    if (!candidates) return null;
    const arr = Array.isArray(candidates) ? candidates : [candidates];

    // strict: first match
    for (const it of arr) {
      if (blocMatches(it, slug, iso)) return it;
    }
    return null;
  }

  function showPaysCardsByHeader() {
    const headers = $all(".card-header .section-title");
    headers.forEach(h => {
      const t = (h.textContent || "").trim();
      if (!t) return;
      const hit = PAYS_HEADERS.some(k => t.includes(k));
      if (!hit) return;
      const card = h.closest(".card") || h.closest("section") || h.parentElement;
      if (card) card.style.display = "";
    });
  }

  function applyPaysBloc(payload, slug, iso) {
    const bloc0 = findBloc(payload, slug, iso);
    if (!bloc0) return false;

    const b = bloc0?.fieldData || bloc0?.fields || bloc0;

    // Show pays cards only now (since we have the right record)
    showPaysCardsByHeader();

    // Rich sections if present
    if (!isEmptyRich(b.acces_bloc)) setRich("acces-title", b.acces_bloc);
    if (!isEmptyRich(b.marche_bloc)) setRich("marche-title", b.marche_bloc);
    if (!isEmptyRich(b.salaire_bloc)) setRich("salaire-title", b.salaire_bloc);
    if (!isEmptyRich(b.formation_bloc)) setRich("formation-title", b.formation_bloc);

    // If those rich sections are empty, keep them hidden (setRich already hides)
    return true;
  }

  // ---------- Boot ----------
  async function boot() {
    hideCmsSources();

    try{ document.documentElement.classList.add('ul-metier-loading'); }catch(_){}
    const root = ensureRoot();
    // Keep page blank + show centered loader
    try{ root.innerHTML = ""; }catch(_){}
    showLoaderOverlay("Chargement de la fiche métier…");

    ensureLink("ulydia-font-outfit", "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap");
    ensureScript("ulydia-tailwind", "https://cdn.tailwindcss.com");
    ensureStyle("ulydia-metier-fouc", `html.ul-metier-loading body{opacity:0 !important;} html.ul-metier-loading #ulydia-metier-root{opacity:1 !important;}`);

    ensureStyle("ulydia-propal-style", `body {
      box-sizing: border-box;
    }
    
    :root {
      --primary: #6366f1;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --bg: #ffffff;
      --card: #f8fafc;
      --accent: #f59e0b;
      --success: #10b981;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --shadow-card: 0 4px 20px rgba(0,0,0,.08);
      --font-family: 'Outfit', sans-serif;
      --font-base: 15px;
    }
    
    * {
      font-family: var(--font-family);
    }
    
    .gradient-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    }
    
    .gradient-accent {
      background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    }
    
    .gradient-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .pastel-blue {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    }
    
    .pastel-purple {
      background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
    }
    
    .pastel-green {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    }
    
    .pastel-orange {
      background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    }
    
    .pastel-pink {
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
    }
    
    .pastel-cyan {
      background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
    }
    
    .card {
      background: var(--card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border);
      padding: 24px;
      transition: all 0.3s ease;
    }
    
    .card:hover {
      box-shadow: 0 8px 30px rgba(0,0,0,.12);
      transform: translateY(-2px);
    }
    
    .card-header {
      padding: 16px 20px;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      margin: -24px -24px 20px -24px;
    }
    
    .section-title {
      font-weight: 700;
      font-size: 17px;
      color: var(--text);
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .sponsor-banner-wide {
      width: 680px;
      height: 120px;
      max-width: 100%;
      border-radius: var(--radius-lg);
      overflow: hidden;
      position: relative;
      cursor: pointer;
      transition: transform 0.3s ease;
      margin-bottom: 32px;
    }
    
    .sponsor-banner-wide:hover {
      transform: scale(1.02);
    }
    
    .sponsor-logo-square {
      width: 300px;
      height: 300px;
      max-width: 100%;
      border-radius: var(--radius-lg);
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border);
    }
    
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid;
    }
    
    .badge-primary {
      background: rgba(99,102,241,0.1);
      border-color: rgba(99,102,241,0.3);
      color: #6366f1;
    }
    
    .badge-success {
      background: rgba(16,185,129,0.1);
      border-color: rgba(16,185,129,0.3);
      color: #10b981;
    }
    
    .badge-warning {
      background: rgba(245,158,11,0.1);
      border-color: rgba(245,158,11,0.3);
      color: #f59e0b;
    }
    
    .badge-danger {
      background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.3);
      color: #ef4444;
    }
    
    .kpi-box {
      background: white;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
    }
    
    .kpi-box:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 16px rgba(99,102,241,0.15);
    }
    
    .kpi-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    
    .salary-bar-container {
      height: 10px;
      background: var(--border);
      border-radius: 5px;
      overflow: hidden;
      position: relative;
    }
    
    .salary-bar-fill {
      height: 100%;
      border-radius: 5px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      border: 1px solid;
      transition: all 0.2s ease;
    }
    
    .chip:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,.1);
    }
    
    .rich-content {
      color: var(--text);
      line-height: 1.7;
    }
    
    .rich-content h3 {
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0 12px 0;
      color: var(--text);
    }
    
    .rich-content h4 {
      font-weight: 600;
      font-size: 15px;
      margin: 16px 0 10px 0;
      color: var(--text);
    }
    
    .rich-content p {
      margin: 10px 0;
    }
    
    .rich-content ul {
      list-style: none;
      margin: 12px 0;
      padding: 0;
    }
    
    .rich-content li {
      margin: 8px 0;
      padding-left: 24px;
      position: relative;
    }
    
    .rich-content li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: var(--primary);
      font-weight: 700;
    }
    
    .rich-content strong {
      font-weight: 600;
      color: var(--text);
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 24px;
      height: 48px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 15px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    
    .btn-primary:hover {
      background: #4f46e5;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(99,102,241,0.3);
    }
    
    .skill-tag {
      background: white;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    
    .skill-tag:hover {
      border-color: var(--primary);
      background: rgba(99,102,241,0.05);
    }
    
    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .faq-question {
      cursor: pointer;
    }
    
    .faq-question:hover {
      border-color: var(--primary) !important;
      box-shadow: 0 2px 8px rgba(99,102,241,0.15);
    }
    
    .faq-icon {
      transition: transform 0.3s ease;
    }
    
    .faq-answer {
      animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }`);
    ensureStyle("ulydia-metier-v118-css", `
      .ul-has-banner-img { background: none !important; }
      .ul-has-banner-img > img { display:block !important; }
    `);

    const iso = getISO();
    const slug = getSlug();
    console.log("[metier-page] v12.9 boot", { iso, slug });

    try { renderShell(root); }
    catch (e) { overlayError("Render shell failed", e); return; }

    // MUST happen immediately after shell render (prevents placeholders)
    killTemplatePlaceholdersNow();

    const payload = await fetchMetierPayload({ iso, slug });

    const lang = String(payload?.lang || payload?.pays?.langue_finale || payload?.pays?.lang || "").trim().toLowerCase();

    // Sponsor
    applySponsor({ iso, slug, payload }).catch(e => overlayError("Apply sponsor failed", e));

    // Standard metier content
    const m = payload?.metier || payload?.job || payload?.item || payload || null;
    const f = m ? (m.fieldData || m.fields || m) : {};

    if (m) {
      setText("nom-metier", f.Nom || f.nom || f.title || f.name || slug);
      setText("accroche-metier", f.accroche || f.tagline || f.subtitle || f.summary || "");

      // -------------------------------------------------------
      // ✅ Country language availability (if only FR content exists)
      // -------------------------------------------------------
      try {
        const desiredLang = String(payload?.pays?.langue_finale || payload?.pays?.lang || payload?.lang || "fr").trim().toLowerCase();
        const contentLang = String(m?.lang || m?.locale || m?.language || payload?.metier?.lang || payload?.lang || "fr").trim().toLowerCase();

        const msgByLang = {
          en: "Sorry, this job profile is not available yet for this country.",
          fr: "Désolé, cette fiche n'est pas encore disponible pour ce pays.",
          es: "Lo sentimos, esta ficha aún no está disponible para este país.",
          de: "Leider ist dieses Profil für dieses Land derzeit noch nicht verfügbar.",
          it: "Spiacenti, questa scheda non è ancora disponibile per questo Paese."
        };

        // If the requested country language isn't available in the CMS yet,
// block the page with a loader-style message (requested UX).
// Default CMS available languages can be configured via:
//   window.ULYDIA_CMS_LANGS = "fr,en"  (comma-separated)
// If not set, we assume only "fr" exists for now.
const CMS_LANGS = String(window.ULYDIA_CMS_LANGS || "fr")
  .split(",")
  .map(s => String(s || "").trim().toLowerCase())
  .filter(Boolean);

// Normalize language tags ("fr-FR" -> "fr", "EN" -> "en")
function normLang(x){
  const s = String(x || "").trim().toLowerCase();
  if (!s) return "";
  const base = s.split(/[-_]/)[0] || "";
  return base.length >= 2 ? base.slice(0,2) : base;
}

const desired = normLang(desiredLang);
const actual  = normLang(contentLang);

// 1) If desired language is not supported in CMS, block immediately
if (desired && CMS_LANGS.length && !CMS_LANGS.includes(desired)) {
  try {
    hideLoader();
    renderUnavailableState("Sorry, this job is not available in your country at the moment.", "Please select another country.");
  } catch(e) {}
  return;
}

// 2) If CMS returns content in a different language than desired, block as well
//    (example: desired=es but CMS served fr as fallback)
if (desired && actual && desired !== actual) {
  try {
    renderUnavailableState("Sorry, this job is not available in your country at the moment.", "Please select another country.");
  } catch(e) {}
  return;
}


  } catch(e) { try { console.warn('[metier-page] lang availability check failed', e); } catch(_){} }

setRich("description-title", f.description || "");
      setRich("missions-title", f.missions || "");
      setRich("competences-title", f["Compétences"] || f.competences || "");
      setRich("environnements-title", f.environnements || "");
      setRich("profil-title", f.profil_recherche || "");
      setRich("evolutions-title", f.evolutions_possibles || "");
    } else {
      ["description-title","missions-title","competences-title","environnements-title","profil-title","evolutions-title"].forEach(hideCard);
    }

    // Pays bloc (STRICT match)
    const okBloc = applyPaysBloc(payload || {}, slug, iso);
    if (!okBloc) {
      // keep all pays sections hidden
      hidePaysCardsByHeader();
    }

    // FAQ (prefer payload, otherwise try dedicated endpoints)
    let faqList = payload?.faq || payload?.faqs || payload?.FAQ || null;
    const faqFromPayload = Array.isArray(payload?.faq) && payload.faq.length > 0;


    async function tryFetchFaqs(){
      const base = WORKER_URL.replace(/\/$/, "");
      const qs = new URLSearchParams({ iso, slug, proxy_secret: PROXY_SECRET });
      const candidates = [
        `${base}/v1/faqs?${qs.toString()}`,
        `${base}/v1/faq?${qs.toString()}`,
        `${base}/v1/metier-faqs?${qs.toString()}`,
        `${base}/v1/metier-page/faqs?${qs.toString()}`
      ];
      for (const u of candidates){
        try{
          const j = await fetchJSON(u);
          const list = j?.faq || j?.faqs || j?.items || j?.data || null;
          if (Array.isArray(list) && list.length) return list;
        }catch(e){}
      }
      return [];
    }

    if (!Array.isArray(faqList) || faqList.length === 0) {
      faqList = await tryFetchFaqs();
    }

    // DOM fallback (Webflow embed): <script id="faqData" type="application/json">[...]</script> or window.__ULYDIA_FAQS__
    if (!Array.isArray(faqList) || faqList.length === 0) {
      try{
        const w = window.__ULYDIA_FAQS__ || window.__ULYDIA_FAQ__ || null;
        if (Array.isArray(w) && w.length) faqList = w;
      }catch(_){}
    }
    if (!Array.isArray(faqList) || faqList.length === 0) {
      try{
        const el = document.getElementById("faqData");
        if (el) {
          const j = JSON.parse(el.textContent || "[]");
          if (Array.isArray(j) && j.length) faqList = j;
        }
      }catch(_){}
    }

    // ✅ Safety: if Worker returns "all FAQs", filter client-side by (slug, iso, lang)
    function faqMatches(item){
      if (!item) return false;

      const iso2 = String(item.iso || item.country_code || item.code_iso || item.country || "").trim().toUpperCase();
      const lang2 = String(item.lang || item.langue || item.language || "").trim().toLowerCase();

      // We require a job/metier slug match. Otherwise we DO NOT display (prevents "Full-Stack" FAQ everywhere).
      const s2 = String(
        item.job_slug || item.metier_slug || item.slug || item.metier || item.job ||
        // common Webflow reference field shapes
        item.metier_ref?.slug || item.metier_ref?.name ||
        item.metier_lie?.slug || item.metier_lie?.name ||
        item["Métier lié"]?.slug || item["Métier lié"]?.name || item["Métier lié"] ||
        item["Metier lié"]?.slug || item["Metier lié"]?.name || item["Metier lié"] ||
        item.job_ref?.slug || item.job_ref?.name ||
        ""
      ).trim();

      if (!s2) {
        // last resort: sometimes the FAQ slug itself starts with the job slug (e.g. "analyste-juridique-6445a")
        const selfSlug = String(item.slug || item.Slug || "").trim();
        if (selfSlug) return selfSlug.toLowerCase().startsWith(String(slug||"").trim().toLowerCase());
        return false;
      }

      // Accept common variations (some sources store full URL or "slug|FR")
      const s2Norm = s2.replace(/^https?:\/\/[^/]+\//, "").split(/[?#]/)[0].split("|")[0].trim();
      // accept exact slug OR slugified label OR list of slugs
      const s2Parts = s2Norm.split(/[,;\s]+/).map(x=>x.trim()).filter(Boolean);
      const want = String(slug||"").trim();
      const wantS = slugify(want);
      const ok = s2Parts.some(p => p === want || slugify(p) === wantS || p.startsWith(want + "-") || slugify(p).startsWith(wantS + "-"));
      if (!ok) return false;

      // If iso/lang are present on the FAQ, enforce them
      if (iso2 && iso2 !== iso) return false;
      if (lang2 && lang2 !== lang) return false;

      return true;
    }

    let faqFiltered = [];

    // Default: always filter by metier slug (prevents showing all FAQs everywhere)
    const baseList = Array.isArray(faqList) ? faqList : [];
    faqFiltered = baseList.filter(faqMatches);

    // Heuristic:
    // - If payload provided FAQs but none match (because payload lacks link fields),
    //   and the payload list is "small", assume it's already metier-specific and show it.
    // - If payload list is large, NEVER show unfiltered (would spam unrelated FAQs).
    if (faqFromPayload && faqFiltered.length === 0) {
      const pList = Array.isArray(payload?.faq) ? payload.faq : [];
      if (pList.length > 0 && pList.length <= 12) {
        faqFiltered = pList; // already scoped
      }
    }

    renderFAQ(faqFiltered);
  
    // Done
    hideLoader();
    try{ document.documentElement.classList.remove('ul-metier-loading'); }catch(_){}
}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot().catch(e => overlayError("Boot failed", e)));
  else boot().catch(e => overlayError("Boot failed", e));
})();