(() => {
  if (window.__ULYDIA_METIER_PAGE__) return;
  window.__ULYDIA_METIER_PAGE__ = true;
  window.__METIER_PAGE_VERSION__ = "v4.9";

  // Kill legacy scripts that still run on the page
  window.__ULYDIA_METIER_SPONSOR_FINAL__ = true;
  window.__ULYDIA_SPONSOR_BOOT__ = true;
  window.__ULYDIA_PAGE_SPONSOR_SCRIPT__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);
  const qp = (name) => new URLSearchParams(location.search).get(name);

  const CFG = {
    WORKER_URL: "https://ulydia-business.contact-871.workers.dev",
    PROXY_SECRET: "ulydia_2026_proxy_Y4b364u2wsFsQL",
    IPINFO_TOKEN: "941b787cc13473",
    DEFAULT_LANG: "en",
    JOB_SEGMENT: "fiche-metiers",
    SHELL_MODE: true,
    COUNTRIES_DATA_ID: "countriesData",
    CMS_PAYLOAD_ID: "ul_cms_payload",
    WAIT_COUNTRIES_MS: 9000,
    WAIT_IMG_MS: 3500,
  };

  console.log("[metier-page] v4.9 active - legacy killed");

  function safeUrl(u) {
    try {
      const s = String(u || "").trim();
      if (!s) return "";
      const url = new URL(s, location.origin);
      if (/^javascript:/i.test(url.href)) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function pickUrl(v) {
    if (!v) return "";
    if (typeof v === "string") return safeUrl(v);
    if (typeof v === "object") return safeUrl(v.url || v.value || "");
    return "";
  }

  function normalizeLang(l) {
    const s = String(l || "").trim().toLowerCase();
    return s ? (s.split("-")[0] || CFG.DEFAULT_LANG) : CFG.DEFAULT_LANG;
  }

  function getFinalLang() {
    return normalizeLang(
      qp("lang") ||
        document.body?.getAttribute("data-lang") ||
        document.documentElement?.lang ||
        CFG.DEFAULT_LANG
    );
  }

  function normIso(v) {
    return String(v || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .trim();
  }

  function slugFromPath() {
    const p = location.pathname.replace(/\/+$/, "");
    const parts = p.split("/").filter(Boolean);
    const idx = parts.findIndex((x) => x === CFG.JOB_SEGMENT);
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1] || "";
  }

  function getImgSrc(el) {
    if (!el) return "";
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!img) return "";
    const src =
      img.currentSrc ||
      img.getAttribute("src") ||
      img.getAttribute("data-src") ||
      img.getAttribute("srcset") ||
      "";
    return safeUrl(src);
  }

  async function waitForSrc(el, timeoutMs = CFG.WAIT_IMG_MS) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const u = getImgSrc(el);
      if (u) return u;
      await new Promise((r) => setTimeout(r, 80));
    }
    return "";
  }

  function extractBgUrl(el) {
    if (!el) return "";
    const bg = getComputedStyle(el).backgroundImage || "";
    const m = bg.match(/url\(["']?(.*?)["']?\)/i);
    return m ? safeUrl(m[1]) : "";
  }

  function ensureRoot() {
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.prepend(root);
    }
    return root;
  }

  // ---- CSS (dark dashboard feel)
  const cssId = "ul_metier_css_v49";
  if (!document.getElementById(cssId)) {
    const s = document.createElement("style");
    s.id = cssId;
    s.textContent = `
html.ul-metier-dark, html.ul-metier-dark body{
  background: radial-gradient(1200px 600px at 20% -10%, rgba(100,108,253,0.22), transparent 55%),
              radial-gradient(900px 500px at 95% 10%, rgba(255,255,255,0.06), transparent 60%),
              linear-gradient(180deg, #0b1020, #070b16) !important;
}
#ulydia-metier-root{ color:#fff; font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial; }
.ul-wrap{ max-width:1120px; margin:0 auto; padding:22px 14px 26px; }
.ul-hero{ display:grid; grid-template-columns:1.55fr 1fr; gap:16px; align-items:stretch; }
@media(max-width:960px){ .ul-hero{ grid-template-columns:1fr; } }
.ul-card{ background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:22px; box-shadow:0 16px 50px rgba(0,0,0,.35); overflow:hidden; backdrop-filter: blur(10px); }
.ul-card-pad{ padding:18px; }
.ul-title{ font-size:34px; font-weight:850; letter-spacing:-.02em; margin:0 0 10px; line-height:1.12; text-transform:uppercase; }
.ul-sub{ color:rgba(255,255,255,.72); font-size:14.5px; line-height:1.65; margin:0 0 14px; }
.ul-meta{ display:flex; flex-wrap:wrap; gap:10px; color:rgba(255,255,255,.72); font-size:13px; font-weight:750; }
.ul-pill{ padding:8px 10px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.04); border-radius:999px; }
.ul-banners{ display:grid; grid-template-columns:1fr; gap:12px; }
.ul-banner{ position:relative; border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.03); display:block; }
.ul-banner img{ width:100%; height:100%; display:block; object-fit:cover; }
.ul-banner-wide{ aspect-ratio:16/5; }
.ul-banner-square{ aspect-ratio:1/1; }
.ul-banner.is-hidden{ display:none !important; }
.ul-banner-label{ position:absolute; left:10px; bottom:10px; padding:8px 10px; border-radius:12px; background:rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.14); color:#fff; font-size:12px; font-weight:800; backdrop-filter: blur(6px); }
`;
    document.head.appendChild(s);
  }
  document.documentElement.classList.add("ul-metier-dark");

  // ---- Shell mode (hide Webflow sections but keep needed nodes)
  function applyShellMode() {
    if (!CFG.SHELL_MODE) return;

    const keep = new Set();
    const root = document.getElementById("ulydia-metier-root");
    const countriesData = document.getElementById(CFG.COUNTRIES_DATA_ID);
    const cmsPayload = document.getElementById(CFG.CMS_PAYLOAD_ID);
    if (root) keep.add(root);
    if (countriesData) keep.add(countriesData);
    if (cmsPayload) keep.add(cmsPayload);

    const nav = document.querySelector("header,.w-nav,.navbar,[data-ul-keep='nav']");
    const foot = document.querySelector("footer,.footer,[data-ul-keep='footer']");
    if (nav) keep.add(nav);
    if (foot) keep.add(foot);

    document
      .querySelectorAll("main,.w-section,.section,.wf-section,[data-ul-shell-hide='1']")
      .forEach((el) => {
        for (const k of keep) {
          if (k && (el === k || el.contains(k))) return;
        }
        if (nav && (el === nav || el.contains(nav))) return;
        if (foot && (el === foot || el.contains(foot))) return;
        el.style.display = "none";
      });
  }

  async function waitForCountriesData(timeoutMs = CFG.WAIT_COUNTRIES_MS) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const root = document.getElementById(CFG.COUNTRIES_DATA_ID);
      if (root) {
        const items = root.querySelectorAll(".w-dyn-item,[role='listitem'],.w-dyn-items > *");
        if (items.length > 0) return true; // images may be lazy; don't wait on them here
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    return false;
  }

  function getCountriesItems() {
    const root = document.getElementById(CFG.COUNTRIES_DATA_ID);
    if (!root) return [];
    return Array.from(
      root.querySelectorAll(".w-dyn-item,[role='listitem'],.w-dyn-items > *")
    );
  }

  function itemIso(it) {
    // In your published HTML, iso is on the item attribute: data-iso="AX"
    const a = normIso(it?.getAttribute("data-iso"));
    if (a) return a;

    // fallback if you ever use a visible text node
    const t = normIso(it?.querySelector(".iso-code")?.textContent);
    return t || "";
  }

  function itemLang(it) {
    // you confirmed only data-role="lang" exists in production
    const el = it?.querySelector('[data-role="lang"], .lang-code');
    return normalizeLang(el?.textContent || "");
  }

  async function itemImages(it) {
    // Best: two <img> inside the item, in order
    const imgs = Array.from(it.querySelectorAll("img"));
    let wideEl = imgs[0] || null;
    let squareEl = imgs[1] || null;

    // fallback: background-images (if you switch to div bg later)
    let wide = getImgSrc(wideEl) || extractBgUrl(wideEl);
    let square = getImgSrc(squareEl) || extractBgUrl(squareEl);

    if (!wide) wide = await waitForSrc(wideEl, CFG.WAIT_IMG_MS);
    if (!square) square = await waitForSrc(squareEl, CFG.WAIT_IMG_MS);

    return { wide: pickUrl(wide), square: pickUrl(square) };
  }

  async function getNonSponsorBanners({ iso, lang }) {
    const items = getCountriesItems();
    const keyIso = normIso(iso);
    const keyLang = normalizeLang(lang);

    // 1) Try ISO match
    let hit = items.find((it) => itemIso(it) === keyIso) || null;

    // 2) Fallback: try language match (because your list is filtered and can miss FR)
    if (!hit) hit = items.find((it) => itemLang(it) === keyLang) || null;

    if (!hit) return null;

    const imgs = await itemImages(hit);

    const bannerText = String(hit.getAttribute("data-banner-text") || "").trim();
    const bannerCta = String(hit.getAttribute("data-banner-cta") || "").trim();

    return { iso: itemIso(hit), lang: itemLang(hit), ...imgs, bannerText, bannerCta };
  }

  // Expose a debug helper (uses cache)
  const __cache = { last: null };
  window.getCountryBanner = (iso, kind) => {
    const row = __cache.last;
    if (!row) return "";
    if (normIso(iso) !== row.iso) return "";
    return kind === "wide" ? row.wide : row.square;
  };

  function readCmsDescription() {
    const root = document.getElementById(CFG.CMS_PAYLOAD_ID) || document;
    const d = root.querySelector('[data-ul-f="description"]')?.textContent?.trim();
    return d || "";
  }

  async function main() {
    const root = ensureRoot();
    applyShellMode();

    const slug = slugFromPath();
    const finalLang = getFinalLang();
    const country = normIso(window.VISITOR_COUNTRY) || "FR";

    const ready = await waitForCountriesData();
    log("countriesData ready?", ready);

    const desc = readCmsDescription();

    // ---- NON-SPONSOR banners (from countriesData)
    const row = ready ? await getNonSponsorBanners({ iso: country, lang: finalLang }) : null;
    __cache.last = row || null;

    log("non-sponsor banners row", row);

    const wide = pickUrl(row?.wide || "");
    const square = pickUrl(row?.square || "");

    const wideHidden = !wide ? "is-hidden" : "";
    const squareHidden = !square ? "is-hidden" : "";

    // NOTE: link target - keep yours
    const sponsorHref = "/sponsorship";

    root.innerHTML = `
      <div class="ul-wrap">
        <div class="ul-hero">
          <div class="ul-card ul-card-pad">
            <h1 class="ul-title">${(slug || "").replace(/-/g, " ")}</h1>
            ${desc ? `<p class="ul-sub">${desc}</p>` : ""}
            <div class="ul-meta">
              <span class="ul-pill">ISO: ${country}</span>
              <span class="ul-pill">Lang: ${finalLang}</span>
              ${row?.iso ? `<span class="ul-pill">Banner source: ${row.iso}${row.lang ? ` (${row.lang})` : ""}</span>` : ""}
            </div>
          </div>

          <div class="ul-banners">
            <a class="ul-banner ul-banner-wide ${wideHidden}" href="${sponsorHref}">
              ${wide ? `<img src="${wide}" alt="Sponsor banner" loading="eager" decoding="async" />` : ""}
              ${row?.bannerText ? `<div class="ul-banner-label">${row.bannerText}</div>` : ""}
            </a>

            <a class="ul-banner ul-banner-square ${squareHidden}" href="${sponsorHref}">
              ${square ? `<img src="${square}" alt="Sponsor banner" loading="eager" decoding="async" />` : ""}
              ${row?.bannerCta ? `<div class="ul-banner-label">${row.bannerCta}</div>` : ""}
            </a>
          </div>
        </div>
      </div>
    `;
  }

  main().catch((e) => console.error("[metier-page] fatal", e));
})();
