(() => {
  // ============================================================================
  // Ulydia — Metier Page (Full-code) v5.3
  // - Sponsor banners (from Worker) + Non-sponsor banners (from hidden countriesData CMS)
  // - Uses FINAL language from countriesData (per ISO) when available
  // - Robust: <img>, data-src/srcset, background-image
  // - Supports multiple countriesData roots: #countriesData, #countriesData2..6
  // ============================================================================

  if (window.__ULYDIA_METIER_PAGE__) return;
  window.__ULYDIA_METIER_PAGE__ = true;

  // Kill legacy metier sponsor scripts if still present
  window.__ULYDIA_METIER_SPONSOR_FINAL__ = true;
  window.__ULYDIA_METIER_SPONSOR_BRIDGE__ = true;
  window.__ULYDIA_PAGE_SPONSOR_SCRIPT__ = true;

  const VERSION = "v5.3";
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);
  const warn = (...a) => DEBUG && console.warn("[metier-page]", ...a);

  // -------------------------
  // CONFIG
  // -------------------------
  const WORKER_URL = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const SPONSOR_ENDPOINT = "/sponsor-info";

  // optional (non-sponsor) hard fallback if countriesData row missing
  const NONSPONSOR_FALLBACK = {
    wide: "",
    square: "",
    href: "/sponsor",
    text: "",
    cta: "",
  };

  // -------------------------
  // HELPERS
  // -------------------------
  const normIso = (v) => String(v || "").toUpperCase().replace(/[^A-Z]/g, "");
  const normLang = (v) => String(v || "").toLowerCase().split("-")[0];

  function ensureRoot() {
    let root = document.getElementById("ulydia-metier-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.prepend(root);
    }
    return root;
  }

  function shellModeEnabled(root) {
    return root?.getAttribute("data-shell") === "1" || root?.dataset?.shell === "1";
  }

  function hideEverythingExceptRoot(root) {
    const children = Array.from(document.body.children);
    for (const el of children) {
      if (el === root) continue;
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
      el.style.display = "none";
    }
  }

  function pickUrl(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    const m = s.match(/https?:\/\/[^\s"')]+/i);
    return m ? m[0] : s;
  }

  function getImgSrcFromImgTag(img) {
    if (!img) return "";
    const src = img.getAttribute("src") || "";
    if (src && !src.startsWith("data:")) return src;

    const dsrc = img.getAttribute("data-src") || img.getAttribute("data-lazy") || "";
    if (dsrc) return dsrc;

    const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
    if (srcset) {
      const first = srcset.split(",")[0]?.trim()?.split(" ")[0];
      if (first) return first;
    }
    return "";
  }

  function getBgUrl(el) {
    if (!el) return "";
    const bg = getComputedStyle(el).backgroundImage || "";
    if (!bg || bg === "none") return "";
    const m = bg.match(/url\(["']?([^"')]+)["']?\)/i);
    return m ? m[1] : "";
  }

  async function waitFor(predicate, timeoutMs = 5000, stepMs = 100) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      try {
        if (predicate()) return true;
      } catch (_) {}
      await new Promise((r) => setTimeout(r, stepMs));
    }
    return false;
  }

  async function waitForVisitorGeo() {
    // footer/global sets VISITOR_COUNTRY / VISITOR_LANG
    await waitFor(() => !!window.VISITOR_COUNTRY, 5000, 100);
    return {
      country: normIso(window.VISITOR_COUNTRY) || "US",
      lang: normLang(window.VISITOR_LANG) || "en",
    };
  }

  function metierSlug() {
    const dm = document.querySelector("[data-metier]")?.getAttribute("data-metier");
    if (dm) return dm.trim();
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function readTitleFallback(slug) {
    const h1 = document.querySelector("h1");
    const t = h1?.textContent?.trim();
    return t || slug.replace(/-/g, " ").toUpperCase();
  }

  function readCategoryFallback() {
    const el = document.querySelector("[data-metier-category], .metier-category, .category");
    const t = el?.textContent?.trim();
    return t || "";
  }

  // -------- countriesData (Webflow hidden CMS) --------
  function getCountriesRoots() {
    const roots = [];
    const main = document.getElementById("countriesData");
    if (main) roots.push(main);
    for (let i = 2; i <= 6; i++) {
      const el = document.getElementById(`countriesData${i}`);
      if (el) roots.push(el);
    }
    roots.push(...Array.from(document.querySelectorAll('[data-ul-countries="1"]')));
    return Array.from(new Set(roots)).filter(Boolean);
  }

  async function waitForCountriesDataAny(timeoutMs = 8000) {
    await waitFor(() => getCountriesRoots().length > 0, timeoutMs, 100);
    await waitFor(() => {
      const roots = getCountriesRoots();
      return roots.some((r) => r.querySelector(".w-dyn-item, [role='listitem']"));
    }, timeoutMs, 100);
    return getCountriesRoots();
  }

  function extractRowFromItem(it) {
    if (!it) return null;

    // IMPORTANT: your HTML already has these on the item:
    // <div class="w-dyn-item" data-iso="AX" data-banner-text="..." data-banner-cta="...">
    const iso = normIso(it.getAttribute("data-iso")) || "";
    const bannerText = (it.getAttribute("data-banner-text") || "").trim();
    const bannerCta = (it.getAttribute("data-banner-cta") || "").trim();

    // you currently have only data-role="lang" visible in DOM, so read it here
    const langNode = it.querySelector('[data-role="lang"], .lang-code');
    const lang = normLang(langNode?.textContent?.trim() || "");

    // Try <img> first
    const imgs = Array.from(it.querySelectorAll("img"));
    let wide = pickUrl(getImgSrcFromImgTag(imgs[0]));
    let square = pickUrl(getImgSrcFromImgTag(imgs[1]));

    // Then fallback to background-image (very common in Webflow)
    if (!wide || !square) {
      const bgEls = Array.from(it.querySelectorAll("*"));
      const bgUrls = bgEls
        .map((el) => getBgUrl(el))
        .filter(Boolean)
        .filter((u, idx, arr) => arr.indexOf(u) === idx);

      if (!wide && bgUrls[0]) wide = bgUrls[0];
      if (!square && bgUrls[1]) square = bgUrls[1];
    }

    return { iso, lang, wide, square, text: bannerText, cta: bannerCta };
  }

  function findCountryRow(iso) {
    const key = normIso(iso);
    if (!key) return null;

    const roots = getCountriesRoots();
    let total = 0;

    for (const root of roots) {
      const items = Array.from(root.querySelectorAll(".w-dyn-item, [role='listitem']"));
      total += items.length;
      for (const it of items) {
        const itIso = normIso(it.getAttribute("data-iso"));
        if (itIso === key) return extractRowFromItem(it);
      }
    }

    warn("no countriesData row for", key, "(likely Webflow list limit 100 — split into #countriesData2/#countriesData3)");
    return null;
  }

  // -------- Worker sponsor-info --------
  async function fetchSponsorInfo(slug, geo) {
    const url = WORKER_URL.replace(/\/$/, "") + SPONSOR_ENDPOINT;
    log("fetchSponsorInfo", url, { metier: slug, country: geo.country, lang: geo.lang });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": PROXY_SECRET,
      },
      body: JSON.stringify({ metier: slug, country: geo.country, lang: geo.lang }),
    });

    if (!res.ok) {
      warn("sponsor-info failed", res.status);
      return null;
    }
    return await res.json();
  }

  function normalizeSponsorPayload(p) {
    // Supports both:
    // - payload.sponsor_logo_1/2, payload.link
    // - payload.sponsor.logo_1/2, payload.sponsor.link
    const s =
      p && typeof p === "object" && p.sponsor && typeof p.sponsor === "object"
        ? p.sponsor
        : null;

    const sponsorUrl = pickUrl(
      p?.sponsor_url || p?.url || p?.link ||
      s?.sponsor_url || s?.url || s?.link || ""
    );

    // Your convention: logo_1 = SQUARE, logo_2 = LANDSCAPE
    const wide = pickUrl(
      p?.sponsor_logo_2 || p?.logo_2 || p?.banner_wide || p?.wide ||
      s?.sponsor_logo_2 || s?.logo_2 || s?.banner_wide || s?.wide || ""
    );

    const square = pickUrl(
      p?.sponsor_logo_1 || p?.logo_1 || p?.banner_square || p?.square ||
      s?.sponsor_logo_1 || s?.logo_1 || s?.banner_square || s?.square || ""
    );

    return { sponsorUrl, wide, square };
  }

  function buildSponsorHref(ctx) {
    const slug = metierSlug();
    const u = new URL("/sponsor", location.origin);
    if (slug) u.searchParams.set("metier", slug);
    if (ctx?.country) u.searchParams.set("country", ctx.country);
    if (ctx?.lang) u.searchParams.set("lang", ctx.lang);
    return u.pathname + u.search;
  }

  function applyCssOnce() {
    if (document.getElementById("ul_metier_css_v53")) return;
    const style = document.createElement("style");
    style.id = "ul_metier_css_v53";
    style.textContent = `
      :root{
        --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
        --ul-accent: #646cfd;
        --ul-navy: #3D3F6D;
        --ul-bg: #0b1020;
        --ul-card: rgba(255,255,255,0.06);
        --ul-border: rgba(255,255,255,0.10);
        --ul-text: rgba(255,255,255,0.92);
        --ul-muted: rgba(255,255,255,0.70);
        --ul-muted2: rgba(255,255,255,0.55);
        --ul-shadow: 0 18px 40px rgba(0,0,0,0.28);
        --ul-radius: 18px;
      }
      #ulydia-metier-root{ font-family: var(--ul-font); }
      .ul-m-wrap{ max-width: 1100px; margin: 0 auto; padding: 18px 18px 32px; }
      .ul-m-hero{ position: relative; border-radius: var(--ul-radius); overflow:hidden; box-shadow: var(--ul-shadow);
        background: radial-gradient(1200px 600px at 15% 15%, rgba(100,108,253,0.25), transparent 60%),
                    radial-gradient(900px 500px at 85% 25%, rgba(61,63,109,0.35), transparent 60%),
                    linear-gradient(180deg, rgba(11,16,32,0.90), rgba(11,16,32,0.98));
        border: 1px solid var(--ul-border);
      }
      .ul-m-hero-inner{ padding: 22px 22px 18px; display:flex; gap: 18px; align-items: stretch; }
      .ul-m-title{ margin:0; font-size: 34px; line-height: 1.1; color: var(--ul-text); letter-spacing: 0.3px; }
      .ul-m-sub{ margin: 10px 0 0; color: var(--ul-muted); font-size: 15px; line-height: 1.5; }
      .ul-m-pills{ margin-top: 14px; display:flex; gap: 8px; flex-wrap: wrap; }
      .ul-m-pill{ font-size: 12px; color: var(--ul-muted); border: 1px solid var(--ul-border);
        background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 999px; }

      .ul-m-side{ margin-left:auto; width: 360px; max-width: 40%; }
      .ul-m-card{ border:1px solid var(--ul-border); background: var(--ul-card); border-radius: 16px; overflow:hidden; }
      .ul-m-card-h{ padding: 12px 12px 0; color: var(--ul-muted2); font-size: 12px; }
      .ul-m-banner{ display:block; text-decoration:none; color: inherit; }
      .ul-m-banner img{ display:block; width:100%; height:auto; }
      .ul-m-banner-wide{ padding: 12px; }
      .ul-m-banner-wide img{ border-radius: 12px; border: 1px solid var(--ul-border); }
      .ul-m-banner-square{ padding: 0 12px 12px; display:flex; gap: 10px; align-items: center; }
      .ul-m-banner-square img{ width: 76px; height: 76px; object-fit: cover; border-radius: 14px; border: 1px solid var(--ul-border); }
      .ul-m-banner-txt{ flex: 1; }
      .ul-m-banner-txt .t{ font-size: 13px; color: var(--ul-text); line-height: 1.35; }
      .ul-m-banner-txt .c{ margin-top: 8px; display:inline-flex; align-items:center; gap: 8px;
        font-size: 12px; color: white; background: linear-gradient(90deg, var(--ul-accent), #7a56ff);
        padding: 8px 10px; border-radius: 12px; }

      .ul-m-grid{ display:grid; grid-template-columns: 1fr; gap: 14px; margin-top: 14px; }
      .ul-m-section{ border: 1px solid rgba(0,0,0,0.06); border-radius: 18px; padding: 18px; background: white; }
      .ul-m-section h2{ margin:0 0 10px; font-size: 16px; letter-spacing: 0.2px; }
      .ul-m-section .ul-m-body{ color: #1f2a44; font-size: 14px; line-height: 1.65; }

      @media (max-width: 860px){
        .ul-m-hero-inner{ flex-direction: column; }
        .ul-m-side{ width: 100%; max-width: 100%; }
        .ul-m-title{ font-size: 28px; }
      }
    `;
    document.head.appendChild(style);
  }

  function htmlEscape(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sectionFromExisting(selectorList) {
    for (const sel of selectorList) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 10) {
        return el.innerHTML;
      }
    }
    return "";
  }

  function render(root, state) {
    const {
      title,
      category,
      sponsored,
      finalLang,
      country,
      sponsorHref,
      wideBanner,
      squareBanner,
      bannerText,
      bannerCta,
      sections,
    } = state;

    const wideImg = wideBanner ? `<img alt="banner" src="${htmlEscape(wideBanner)}">` : "";
    const squareImg = squareBanner ? `<img alt="logo" src="${htmlEscape(squareBanner)}">` : "";

    const txt = bannerText || (sponsored ? "Sponsored content" : "Do you want to sponsor this profession?");
    const cta = bannerCta || (sponsored ? "Visit sponsor" : "Sponsor this profession");

    root.innerHTML = `
      <div class="ul-m-wrap">
        <div class="ul-m-hero">
          <div class="ul-m-hero-inner">
            <div>
              <h1 class="ul-m-title">${htmlEscape(title)}</h1>
              ${category ? `<p class="ul-m-sub">${htmlEscape(category)}</p>` : ""}
              <div class="ul-m-pills">
                <span class="ul-m-pill">ISO: ${htmlEscape(country)}</span>
                <span class="ul-m-pill">Lang: ${htmlEscape(finalLang)}</span>
                <span class="ul-m-pill">${sponsored ? "Sponsored" : "Not sponsored"}</span>
              </div>
            </div>

            <div class="ul-m-side">
              <div class="ul-m-card">
                <div class="ul-m-card-h">${sponsored ? "Sponsor" : "Sponsorship"}</div>
                <a class="ul-m-banner ul-m-banner-wide" href="${htmlEscape(sponsorHref)}" target="_blank" rel="noopener">${wideImg}</a>
                <a class="ul-m-banner ul-m-banner-square" href="${htmlEscape(sponsorHref)}" target="_blank" rel="noopener">
                  ${squareImg}
                  <div class="ul-m-banner-txt">
                    <div class="t">${htmlEscape(txt)}</div>
                    <div class="c">${htmlEscape(cta)} →</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="ul-m-grid">
          ${sections.map(s => `
            <section class="ul-m-section">
              <h2>${htmlEscape(s.title)}</h2>
              <div class="ul-m-body">${s.html}</div>
            </section>
          `).join("")}
        </div>
      </div>
    `;
  }

  // -------------------------
  // MAIN
  // -------------------------
  (async () => {
    log("version", VERSION);

    const root = ensureRoot();
    applyCssOnce();

    if (shellModeEnabled(root)) hideEverythingExceptRoot(root);

    root.innerHTML = `<div class="ul-m-wrap"><div class="ul-m-hero"><div class="ul-m-hero-inner"><div><h1 class="ul-m-title">Loading…</h1><p class="ul-m-sub">Please wait</p></div></div></div></div>`;

    const slug = metierSlug();
    const geo = await waitForVisitorGeo();

    // countriesData optional
    const roots = await waitForCountriesDataAny(8000);
    log("countriesData roots", roots.map(r => r.id));
    const row = findCountryRow(geo.country);

    // FINAL lang from countriesData if found, else visitor lang
    const finalLang = normLang(row?.lang || geo.lang || "en") || "en";

    // sponsor info
    let payload = null;
    try {
      payload = await fetchSponsorInfo(slug, { country: geo.country, lang: finalLang });
    } catch (e) {
      warn("fetchSponsorInfo error", e);
      payload = null;
    }

    const sponsored = !!payload?.sponsored;
    const sp = normalizeSponsorPayload(payload);

    let sponsorHref = "";
    let wideBanner = "";
    let squareBanner = "";
    let bannerText = "";
    let bannerCta = "";

    if (sponsored && (sp.wide || sp.square || sp.sponsorUrl)) {
      sponsorHref = sp.sponsorUrl || buildSponsorHref({ country: geo.country, lang: finalLang });
      wideBanner = sp.wide;
      squareBanner = sp.square;
      bannerText = payload?.sponsor_text || payload?.text || payload?.sponsor?.text || "";
      bannerCta = payload?.sponsor_cta || payload?.cta || payload?.sponsor?.cta || "";
    } else {
      sponsorHref = buildSponsorHref({ country: geo.country, lang: finalLang });
      wideBanner = row?.wide || NONSPONSOR_FALLBACK.wide;
      squareBanner = row?.square || NONSPONSOR_FALLBACK.square;
      bannerText = row?.text || NONSPONSOR_FALLBACK.text;
      bannerCta = row?.cta || NONSPONSOR_FALLBACK.cta;
    }

    // content sections (best-effort)
    const sections = [];
    const descriptionHtml = sectionFromExisting(['[data-ul-f="description"]', '#description', '.description', '.w-richtext']);
    const missionsHtml = sectionFromExisting(['[data-ul-f="missions"]', '#missions', '.missions']);
    if (descriptionHtml) sections.push({ title: "Description", html: descriptionHtml });
    if (missionsHtml) sections.push({ title: "Missions", html: missionsHtml });
    if (!sections.length) sections.push({ title: "Content", html: `<div style="color:#334155">No CMS section detected yet.</div>` });

    const title = readTitleFallback(slug);
    const category = readCategoryFallback();

    log("geo", geo);
    log("countriesRow", row);
    log("payload", payload);
    log("sponsored", sponsored, "sp", sp);
    log("banner", { sponsorHref, wideBanner: !!wideBanner, squareBanner: !!squareBanner, finalLang, country: geo.country });

    render(root, {
      title,
      category,
      sponsored,
      finalLang,
      country: geo.country,
      sponsorHref,
      wideBanner,
      squareBanner,
      bannerText,
      bannerCta,
      sections,
    });

    window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
      detail: { sponsored, payload, metier: slug, geo, countriesRow: row },
    }));
  })().catch((e) => console.error("[metier-page] fatal", e));
})();
