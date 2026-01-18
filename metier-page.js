<script>
(() => {
  if (window.__ULYDIA_METIER_FULLCODE_PRO_V1__) return;
  window.__ULYDIA_METIER_FULLCODE_PRO_V1__ = true;

  // =========================
  // CONFIG
  // =========================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const IPINFO_TOKEN = "941b787cc13473";

  // Enable debug by: window.__METIER_PAGE_DEBUG__=true
  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log  = (...a) => DEBUG && console.log("[metier-fullcode]", ...a);
  const warn = (...a) => console.warn("[metier-fullcode]", ...a);

  // DOM
  const ROOT_ID = "ulydia-metier-root";
  const PAYLOAD_ID = "ul_cms_payload";
  const COUNTRY_BLOCKS_ID = "ul_cms_country_blocks";
  const FAQ_ID = "ul_cms_faq";

  // Sponsor CTA fallback (when NOT sponsored)
  const SPONSOR_FALLBACK_URL = (slug) => `/sponsor?metier=${encodeURIComponent(slug)}`;

  // =========================
  // HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);

  function apiBase(){ return String(WORKER_URL || "").replace(/\/$/, ""); }

  function getPayload(){
    const box = $(PAYLOAD_ID);
    if (!box) return {};
    const out = {};
    box.querySelectorAll("[data-ul-f]").forEach(n => {
      const k = (n.getAttribute("data-ul-f") || "").trim();
      if (!k) return;
      // if rich text wrapper exists, take innerHTML
      const isRT = n.classList.contains("rt") || n.querySelector(".w-richtext");
      out[k] = isRT ? (n.innerHTML || "").trim() : (n.textContent || "").trim();
    });
    return out;
  }

  function sanitizeHTML(html){
    // Basic safety: remove script tags
    return String(html || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  }

  function el(tag, attrs = {}, children = []){
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== "") n.setAttribute(k, String(v));
    });
    children.forEach(c => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }

  function rt(html){
    const d = el("div", { class:"ul-rt" });
    d.innerHTML = sanitizeHTML(html);
    return d;
  }

  function num(v){
    const x = Number(String(v || "").replace(",", "."));
    return Number.isFinite(x) ? x : null;
  }

  function formatMoney(n, currency){
    if (n === null) return "";
    // simple FR formatting
    return n.toLocaleString("fr-FR") + (currency ? ` ${currency}` : "");
  }

  async function preload(url){
    return new Promise((resolve) => {
      if (!url) return resolve(false);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  async function getCountryFromIP(){
    try{
      const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`);
      const j = await r.json();
      return (j?.country || "").trim() || "FR";
    }catch(e){
      return "FR";
    }
  }

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v) && v[0]?.url) return String(v[0].url).trim();
    if (v.url) return String(v.url).trim();
    return "";
  }

  async function fetchSponsorInfo({ metier, country, lang }){
    const r = await fetch(`${apiBase()}/sponsor-info`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-proxy-secret": PROXY_SECRET,
        "x-ulydia-proxy-secret": PROXY_SECRET,
      },
      body: JSON.stringify({ metier, country, lang })
    });
    return r.json();
  }

  function isReallySponsored(info){
    const l1 = pickUrl(info?.sponsor?.logo_1);
    const l2 = pickUrl(info?.sponsor?.logo_2);
    return info?.sponsored === true && (!!l1 || !!l2);
  }

  function injectCSS(){
    if (document.getElementById("ul_metier_fullcode_css_v1")) return;
    const css = `
:root{
  --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
  --ul-ink:#0f172a;
  --ul-muted:#475569;
  --ul-line: rgba(15,23,42,.10);
  --ul-card:#fff;
  --ul-bg:#fff;
  --ul-shadow: 0 16px 46px rgba(2,8,23,.10);
  --ul-radius: 18px;
  --ul-blue:#0b2a6a;
  --ul-red:#c00102;
}
#${ROOT_ID}{ font-family:var(--ul-font); color:var(--ul-ink); }
.ul-wrap{ max-width:1160px; margin:0 auto; padding:44px 18px 90px; }
.ul-hero{ text-align:center; margin-bottom: 18px; }
.ul-title{
  font-weight: 900;
  font-size: clamp(34px, 5vw, 62px);
  line-height: 1.05;
  letter-spacing: .6px;
  margin: 0 0 10px;
  color:#1f2a3a;
}
.ul-subtitle{
  font-weight: 800;
  font-size: 18px;
  color:#334155;
  margin: 0 0 12px;
}
.ul-accroche{
  color:#6d28d9;
  font-size: 16px;
  line-height: 1.75;
  max-width: 900px;
  margin: 0 auto 18px;
}
.ul-banner-top{
  display:block;
  width:100%;
  border-radius: 16px;
  border: 1px solid var(--ul-line);
  box-shadow: var(--ul-shadow);
  overflow:hidden;
  background:#f8fafc;
  height: 160px;
  margin: 16px auto 26px;
  text-decoration:none;
}
@media(max-width: 520px){
  .ul-banner-top{ height: 120px; }
}

.ul-grid{
  display:grid;
  grid-template-columns: 1.65fr 0.95fr;
  gap: 18px;
  align-items:start;
}
@media(max-width: 980px){
  .ul-grid{ grid-template-columns: 1fr; }
}

.ul-card{
  background:var(--ul-card);
  border:1px solid var(--ul-line);
  border-radius: var(--ul-radius);
  box-shadow: var(--ul-shadow);
  overflow:hidden;
}
.ul-card-h{
  padding: 14px 18px;
  border-bottom:1px solid var(--ul-line);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--ul-blue);
}
.ul-card-b{ padding: 18px; }

.ul-tabs{
  display:flex; flex-wrap:wrap;
  gap: 10px;
  padding: 12px 18px;
  border-bottom:1px solid var(--ul-line);
  background: #fff;
}
.ul-tab{
  padding: 9px 12px;
  border-radius: 999px;
  border: 1px solid rgba(11,42,106,.18);
  background:#fff;
  cursor:pointer;
  font-weight: 800;
  color: var(--ul-blue);
  font-size: 13px;
}
.ul-tab[aria-selected="true"]{
  background: rgba(11,42,106,.08);
  border-color: rgba(11,42,106,.35);
}
.ul-panel{ padding: 18px; }

.ul-rt h2, .ul-rt h3{
  color: var(--ul-blue);
  font-weight: 900;
  letter-spacing: .2px;
}
.ul-rt p, .ul-rt li{
  color:#334155;
  line-height: 1.85;
  font-size: 15px;
}
.ul-rt strong{ color: var(--ul-red); }

.ul-kpis{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.ul-kpi{
  border:1px solid var(--ul-line);
  border-radius: 14px;
  padding: 10px 12px;
  background:#fff;
}
.ul-kpi .t{ font-size: 11px; font-weight: 900; letter-spacing:.4px; color:#64748b; text-transform:uppercase; }
.ul-kpi .v{ font-size: 14px; font-weight: 900; color:#0f172a; margin-top: 2px; }

.ul-banner-side{
  display:block;
  border-radius: 16px;
  border:1px solid var(--ul-line);
  box-shadow: var(--ul-shadow);
  overflow:hidden;
  background:#f8fafc;
  height: 320px;
  margin-top: 12px;
  text-decoration:none;
}

.ul-actions{ display:flex; gap:10px; margin-top: 12px; flex-wrap:wrap; }
.ul-btn{
  border-radius: 999px;
  padding: 11px 14px;
  font-weight: 900;
  border: 1px solid rgba(192,1,2,.35);
  background:#fff;
  color: var(--ul-red);
  cursor:pointer;
}
.ul-btn-primary{
  background: var(--ul-red);
  border-color: var(--ul-red);
  color:#fff;
}

.ul-faq .item{
  border:1px solid var(--ul-line);
  border-radius: 14px;
  overflow:hidden;
  margin-bottom: 10px;
}
.ul-faq button{
  width:100%;
  text-align:left;
  padding: 12px 14px;
  font-weight: 900;
  background:#fff;
  border:0;
  cursor:pointer;
  color:#0f172a;
}
.ul-faq .a{ padding: 0 14px 14px; display:none; }
.ul-faq .item[open] .a{ display:block; }
`;
    const style = document.createElement("style");
    style.id = "ul_metier_fullcode_css_v1";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildTabs(panels){
    const tabs = el("div", { class:"ul-tabs", role:"tablist" });
    const panelWrap = el("div", { class:"ul-panel" });

    function select(key){
      tabs.querySelectorAll(".ul-tab").forEach(b => b.setAttribute("aria-selected", b.dataset.key === key ? "true" : "false"));
      panelWrap.innerHTML = "";
      panelWrap.appendChild(panels[key]);
    }

    Object.keys(panels).forEach((key, i) => {
      const btn = el("button", {
        class:"ul-tab",
        type:"button",
        role:"tab",
        "aria-selected": i===0 ? "true" : "false",
        "data-key": key
      }, [key]);
      btn.addEventListener("click", () => select(key));
      tabs.appendChild(btn);
    });

    // default first
    const firstKey = Object.keys(panels)[0];
    if (firstKey) panelWrap.appendChild(panels[firstKey]);

    return { tabs, panelWrap };
  }

  function readCountryBlocks(){
    const wrap = $(COUNTRY_BLOCKS_ID);
    if (!wrap) return [];
    const items = Array.from(wrap.querySelectorAll(".ul_cms_country_block"));
    const out = items.map(n => ({
      title: (n.getAttribute("data-title") || "Bloc pays").trim(),
      order: Number(n.getAttribute("data-order") || "999"),
      html: sanitizeHTML(n.querySelector(".rt")?.innerHTML || n.innerHTML || "")
    }));
    out.sort((a,b)=> (a.order-b.order));
    return out.filter(x => x.html.replace(/\s+/g,"").length > 0);
  }

  function readFAQ(){
    const wrap = $(FAQ_ID);
    if (!wrap) return [];
    const items = Array.from(wrap.querySelectorAll(".ul_cms_faq_item"));
    return items.map(n => ({
      q: (n.querySelector(".q")?.textContent || "").trim(),
      a: sanitizeHTML(n.querySelector(".a")?.innerHTML || "")
    })).filter(x => x.q && x.a);
  }

  // =========================
  // MAIN
  // =========================
  async function boot(){
    const root = $(ROOT_ID);
    if (!root) return warn("Missing #ulydia-metier-root");

    // Important: prevent other scripts from messing with sponsor on this page
    window.__ULYDIA_DISABLE_GLOBAL_SPONSOR__ = true;

    injectCSS();

    const p = getPayload();
    const slug = p.slug || location.pathname.split("/").filter(Boolean).pop() || "";
    const lang = (p.lang || "fr").toLowerCase();

    // header data
    const title = p.nom || "Fiche métier";
    const subtitle = p.secteur || "";
    const accroche = p.accroche || "";

    // standard rich texts
    const sections = {
      "Description": p.description ? rt(p.description) : rt("<p>—</p>"),
      "Missions": p.missions ? rt(p.missions) : rt("<p>—</p>"),
      "Compétences": p.competences ? rt(p.competences) : rt("<p>—</p>"),
      "Environnements": p.environnements ? rt(p.environnements) : rt("<p>—</p>"),
      "Évolutions": p.evolutions ? rt(p.evolutions) : rt("<p>—</p>")
    };

    // country blocks (optional)
    const countryBlocks = readCountryBlocks();
    if (countryBlocks.length){
      // Add a single tab that contains all country blocks in order
      const wrap = el("div");
      countryBlocks.forEach(b => {
        wrap.appendChild(el("h3", {}, [b.title]));
        const block = el("div", { class:"ul-rt" });
        block.innerHTML = b.html;
        wrap.appendChild(block);
      });
      sections["Spécifique pays"] = wrap;
    }

    // build sponsor URLs + banners
    const country = await getCountryFromIP();

    let sponsorInfo = {};
    try{
      sponsorInfo = await fetchSponsorInfo({ metier: slug, country, lang });
      log("sponsor-info", sponsorInfo);
    }catch(e){
      warn("sponsor-info failed", e);
      sponsorInfo = {};
    }

    const sponsored = isReallySponsored(sponsorInfo);
    const sponsorLink = sponsored
      ? String(sponsorInfo?.sponsor?.link || "").trim()
      : SPONSOR_FALLBACK_URL(slug);

    const bannerTopUrl = sponsored
      ? pickUrl(sponsorInfo?.sponsor?.logo_2)
      : ""; // we’ll keep top banner as “non sponsor” image if you later add it in CMS pays
    const bannerSideUrl = sponsored
      ? pickUrl(sponsorInfo?.sponsor?.logo_1)
      : "";

    // If not sponsored, we can use country banners from CMS (if you want)
    // Right now you said “non sponsor banners must be correct language”
    // → best: use country banners from Metier_pays_bloc or Pays collection; for now we fallback to nothing if absent.
    const countryBanner1 = ""; // optional if you add in payload later
    const countryBanner2 = ""; // optional if you add in payload later

    // KPIs (optional)
    const currency = p.currency || "";
    const kpiRows = [];
    const jrMin = num(p.salary_junior_min), jrMax = num(p.salary_junior_max);
    const mdMin = num(p.salary_mid_min),   mdMax = num(p.salary_mid_max);
    const srMin = num(p.salary_senior_min),srMax = num(p.salary_senior_max);

    function range(a,b){
      if (a===null && b===null) return "";
      if (a!==null && b!==null) return `${formatMoney(a,currency)} – ${formatMoney(b,currency)}`;
      return formatMoney(a ?? b, currency);
    }
    const rJ = range(jrMin, jrMax);
    const rM = range(mdMin, mdMax);
    const rS = range(srMin, srMax);

    if (rJ) kpiRows.push({ t:"Junior", v:rJ });
    if (rM) kpiRows.push({ t:"Confirmé", v:rM });
    if (rS) kpiRows.push({ t:"Senior", v:rS });
    if (p.remote_level) kpiRows.push({ t:"Remote", v:p.remote_level });
    if (p.automation_risk) kpiRows.push({ t:"Automation", v:p.automation_risk });

    // FAQ
    const faq = readFAQ();

    // =========================
    // RENDER
    // =========================
    root.innerHTML = "";

    const topBanner = el("a", {
      class:"ul-banner-top",
      href: sponsorLink || "#",
      target: sponsorLink ? "_blank" : null,
      rel: sponsorLink ? "noopener" : null,
      "aria-label": sponsored ? "Sponsor" : "Sponsoriser"
    });

    // always clickable
    // background set later

    const { tabs, panelWrap } = buildTabs(sections);

    const mainCard = el("div", { class:"ul-card" }, [
      el("div", { class:"ul-card-h" }, ["Contenu"]),
      tabs,
      panelWrap
    ]);

    const kpis = el("div", { class:"ul-kpis" },
      kpiRows.map(x =>
        el("div", { class:"ul-kpi" }, [
          el("div", { class:"t" }, [x.t]),
          el("div", { class:"v" }, [x.v])
        ])
      )
    );

    const sideBanner = el("a", {
      class:"ul-banner-side",
      href: sponsorLink || "#",
      target: sponsorLink ? "_blank" : null,
      rel: sponsorLink ? "noopener" : null,
      "aria-label": sponsored ? "Sponsor" : "Sponsoriser"
    });

    const sponsorBox = el("div", { class:"ul-card" }, [
      el("div", { class:"ul-card-h" }, ["Sponsor"]),
      el("div", { class:"ul-card-b" }, [
        kpiRows.length ? kpis : el("div", { class:"ul-rt" }, [el("p", {}, ["—"])]),
        sideBanner,
        el("div", { class:"ul-actions" }, [
          el("button", { class:"ul-btn ul-btn-primary", type:"button", onclick: () => location.href = SPONSOR_FALLBACK_URL(slug) }, ["Sponsoriser"]),
          el("button", { class:"ul-btn", type:"button", onclick: () => location.href = "/my-account" }, ["Dashboard"])
        ])
      ])
    ]);

    const faqBox = faq.length ? el("div", { class:"ul-card" }, [
      el("div", { class:"ul-card-h" }, ["FAQ"]),
      el("div", { class:"ul-card-b ul-faq" },
        faq.map(item => {
          const wrap = el("div", { class:"item" });
          const btn = el("button", { type:"button" }, [item.q]);
          const ans = el("div", { class:"a" });
          ans.innerHTML = item.a;

          btn.addEventListener("click", () => {
            const isOpen = wrap.hasAttribute("open");
            if (isOpen) wrap.removeAttribute("open");
            else wrap.setAttribute("open", "true");
          });

          wrap.appendChild(btn);
          wrap.appendChild(ans);
          return wrap;
        })
      )
    ]) : null;

    const wrap = el("div", { class:"ul-wrap" }, [
      el("div", { class:"ul-hero" }, [
        el("div", { class:"ul-title" }, [title]),
        subtitle ? el("div", { class:"ul-subtitle" }, [subtitle]) : el("div"),
        accroche ? el("div", { class:"ul-accroche" }, [accroche]) : el("div"),
        topBanner
      ]),
      el("div", { class:"ul-grid" }, [
        el("div", {}, [mainCard, faqBox].filter(Boolean)),
        el("div", {}, [sponsorBox])
      ])
    ]);

    root.appendChild(wrap);

    // Apply banner images
    const landscapeUrl = sponsored ? bannerTopUrl : (countryBanner1 || bannerTopUrl);
    const squareUrl    = sponsored ? bannerSideUrl : (countryBanner2 || bannerSideUrl);

    await Promise.all([preload(landscapeUrl), preload(squareUrl)]);

    if (landscapeUrl) topBanner.style.backgroundImage = `url("${landscapeUrl}")`;
    topBanner.style.backgroundSize = "cover";
    topBanner.style.backgroundPosition = "center";
    topBanner.style.backgroundRepeat = "no-repeat";

    if (squareUrl) sideBanner.style.backgroundImage = `url("${squareUrl}")`;
    sideBanner.style.backgroundSize = "cover";
    sideBanner.style.backgroundPosition = "center";
    sideBanner.style.backgroundRepeat = "no-repeat";

    window.SPONSORED_ACTIVE = sponsored;
    log("rendered", { slug, lang, country, sponsored, sponsorLink });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", boot)
    : boot();

})();
</script>


