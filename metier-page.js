/* metier-page.js — Ulydia (V2)
   - Shell page /metier
   - Rendu full-code (style dashboard/login)
   - Sponsor banners wide/square (click -> sponsor link)
   - Fallback non sponsor: banners by pays.langue_finale
   - Blocs “metier_pays_bloc” (optional)
   - FAQ (optional)
*/
(() => {
  if (window.__ULYDIA_METIER_PAGE_V2__) return;
  window.__ULYDIA_METIER_PAGE_V2__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // -----------------------------
  // CONFIG
  // -----------------------------
  const WORKER_URL   = window.ULYDIA_WORKER_URL || "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = window.ULYDIA_PROXY_SECRET || "";
  const IPINFO_TOKEN = window.ULYDIA_IPINFO_TOKEN || "";

  const qp = (k) => new URLSearchParams(location.search).get(k);

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
  // STYLE
  // -----------------------------
  function injectCSS(){
    if (document.getElementById("ul_metier_css")) return;
    const style = document.createElement("style");
    style.id = "ul_metier_css";
    style.textContent = `
      :root{
        --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
        --ul-red:#c00102;
        --ul-bg:#0b0b0c;
        --ul-card:#121214;
        --ul-card2:#0f0f11;
        --ul-border: rgba(255,255,255,.10);
        --ul-text: rgba(255,255,255,.92);
        --ul-muted: rgba(255,255,255,.68);
        --ul-soft: rgba(255,255,255,.06);
        --ul-shadow: 0 10px 30px rgba(0,0,0,.35);
        --ul-radius: 18px;
      }

      html,body{ background: var(--ul-bg); color: var(--ul-text); }
      #ulydia-metier-root{ font-family: var(--ul-font); }

      .u-wrap{ max-width: 1120px; margin: 0 auto; padding: 28px 16px 80px; }
      .u-topbar{ display:flex; gap:12px; align-items:center; justify-content:space-between; margin-bottom: 16px; }
      .u-brand{ display:flex; flex-direction:column; gap:2px; }
      .u-title{ font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin:0; }
      .u-sub{ font-size: 13px; color: var(--ul-muted); margin:0; }

      .u-grid{ display:grid; grid-template-columns: 1.15fr .85fr; gap: 16px; margin-top: 14px; }
      @media (max-width: 980px){ .u-grid{ grid-template-columns: 1fr; } }

      .u-card{
        background: linear-gradient(180deg, var(--ul-card), var(--ul-card2));
        border: 1px solid var(--ul-border);
        border-radius: var(--ul-radius);
        box-shadow: var(--ul-shadow);
        overflow:hidden;
      }
      .u-card-h{ padding: 16px 18px; border-bottom: 1px solid var(--ul-border); display:flex; gap:10px; align-items:center; justify-content:space-between; }
      .u-card-t{ font-size: 14px; font-weight: 700; margin:0; }
      .u-card-b{ padding: 16px 18px; }

      .u-badges{ display:flex; flex-wrap:wrap; gap:8px; }
      .u-badge{
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--ul-soft);
        border: 1px solid var(--ul-border);
        color: var(--ul-muted);
      }

      .u-btn{
        appearance:none; border:1px solid var(--ul-border);
        background: rgba(255,255,255,.06);
        color: var(--ul-text);
        padding: 10px 12px; border-radius: 12px;
        cursor:pointer; font-weight: 600; font-size: 13px;
        transition: transform .12s ease, background .12s ease;
        text-decoration:none; display:inline-flex; gap:8px; align-items:center;
      }
      .u-btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.085); }
      .u-btn-primary{ border-color: rgba(192,1,2,.55); background: rgba(192,1,2,.14); }
      .u-btn-primary:hover{ background: rgba(192,1,2,.20); }

      .u-banner{
        display:block;
        border-radius: 16px;
        overflow:hidden;
        border: 1px solid var(--ul-border);
        background: rgba(255,255,255,.03);
        box-shadow: 0 12px 28px rgba(0,0,0,.25);
      }
      .u-banner img{ display:block; width:100%; height:auto; }

      .u-stack{ display:flex; flex-direction:column; gap: 12px; }
      .u-sep{ height:1px; background: var(--ul-border); margin: 14px 0; }
      .u-p{ margin:0; color: var(--ul-muted); line-height: 1.55; font-size: 14px; }
      .u-h2{ margin:0; font-size: 18px; font-weight: 800; letter-spacing: -.01em; }
      .u-h3{ margin:0; font-size: 14px; font-weight: 800; }

      .u-skel{
        border-radius: 14px; background: rgba(255,255,255,.05);
        border: 1px solid var(--ul-border);
        height: 14px;
        position: relative;
        overflow: hidden;
      }
      .u-skel:before{
        content:""; position:absolute; inset:-40% -30%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
        transform: translateX(-40%);
        animation: uShimmer 1.1s infinite;
      }
      @keyframes uShimmer{ to{ transform: translateX(40%);} }

      details.u-faq{ border:1px solid var(--ul-border); border-radius: 14px; background: rgba(255,255,255,.03); padding: 10px 12px; }
      details.u-faq summary{ cursor:pointer; font-weight:700; color: var(--ul-text); }
      details.u-faq .u-p{ margin-top: 8px; }
      .u-note{ font-size: 12px; color: var(--ul-muted); }
      .u-err{ border-color: rgba(192,1,2,.55)!important; background: rgba(192,1,2,.10)!important; }
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // UI helpers
  // -----------------------------
  function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs || {})){
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    (children || []).forEach(c => n.appendChild(c));
    return n;
  }

  function renderLoading(){
    ROOT.innerHTML = "";
    const wrap = el("div", { class:"u-wrap" }, [
      el("div", { class:"u-topbar" }, [
        el("div", { class:"u-brand" }, [
          el("h1", { class:"u-title", html:"Loading…" }),
          el("p", { class:"u-sub", html:"Fetching CMS data & sponsor banners" })
        ]),
        el("a", { class:"u-btn", href:"/", html:"Home" })
      ]),
      el("div", { class:"u-grid" }, [
        el("div", { class:"u-card" }, [
          el("div", { class:"u-card-h" }, [
            el("p", { class:"u-card-t", html:"Overview" }),
            el("span", { class:"u-note", html:"" })
          ]),
          el("div", { class:"u-card-b u-stack" }, [
            el("div", { class:"u-skel", style:"width:70%" }),
            el("div", { class:"u-skel", style:"width:95%" }),
            el("div", { class:"u-skel", style:"width:88%" }),
          ])
        ]),
        el("div", { class:"u-stack" }, [
          el("div", { class:"u-skel", style:"height:120px" }),
          el("div", { class:"u-skel", style:"height:120px" })
        ])
      ])
    ]);
    ROOT.appendChild(wrap);
  }

  function safeUrl(u){
    try{
      if (!u) return "";
      const x = new URL(u, location.origin);
      return x.href;
    }catch{ return ""; }
  }

  function bannerAnchor(imgUrl, linkUrl){
    const href = safeUrl(linkUrl || "");
    const src = safeUrl(imgUrl || "");
    if (!src) return el("div", { class:"u-banner", html:"" });
    const a = el("a", { class:"u-banner", href: href || "#", target: href ? "_blank" : "_self", rel:"noopener" }, [
      el("img", { src, alt:"banner" })
    ]);
    if (!href) a.addEventListener("click", (e)=>e.preventDefault());
    return a;
  }

  function renderError(msg){
    ROOT.innerHTML = "";
    const wrap = el("div", { class:"u-wrap" }, [
      el("div", { class:"u-card u-err" }, [
        el("div", { class:"u-card-h" }, [
          el("p", { class:"u-card-t", html:"Could not render this job page" }),
          el("span", { class:"u-note", html:"metier-page.js" })
        ]),
        el("div", { class:"u-card-b u-stack" }, [
          el("p", { class:"u-p", html: String(msg || "Unknown error") }),
          el("p", { class:"u-note", html:"Tip: try /metier?slug=...&iso=FR (or /metier?metier=...&country=FR)" })
        ])
      ])
    ]);
    ROOT.appendChild(wrap);
  }


// =======================
// PREVIEW OVERRIDES
// =======================
const PREVIEW = (() => {
  const q = new URLSearchParams(location.search);
  const on = q.get("preview") === "1";
  return {
    on,
    country: (q.get("country") || "").toUpperCase(),
    landscape: q.get("preview_landscape") || "",
    square: q.get("preview_square") || "",
    link: q.get("preview_link") || "",
  };
})();
const isHttpUrl = (u) => /^https?:\/\//i




  // -----------------------------
  // ISO detection
  // -----------------------------
  async function detectISO(){
    const isoQP = (qp("iso") || qp("country") || "").trim().toUpperCase();
    if (isoQP) return isoQP;

    if (!IPINFO_TOKEN) return "FR";
    try{
      const r = await fetch(`https://ipinfo.io/json?token=${encodeURIComponent(IPINFO_TOKEN)}`, { cache: "no-store" });
      const j = await r.json();
      const iso = (j && j.country ? String(j.country).toUpperCase() : "") || "FR";
      return iso;
    }catch(e){
      log("ipinfo failed", e);
      return "FR";
    }
  }

  // ✅ slug detection (supports ?metier=)
  function detectSlug(){
    const s = (qp("slug") || qp("metier") || "").trim();
    if (s) return s;

    const parts = location.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("metiers");
    if (i >= 0 && parts[i+1]) return parts[i+1];

    return "";
  }

  // -----------------------------
  // Data fetch
  // -----------------------------
  async function fetchMetierPage({ slug, iso }){
    const url = `${WORKER_URL.replace(/\/$/,"")}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
    const headers = {};
    if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

    const r = await fetch(url, { headers, cache: "no-store" });
    const j = await r.json().catch(()=>null);
    if (!r.ok || !j || j.ok !== true) {
      const msg = (j && (j.error || j.message)) ? (j.error || j.message) : `HTTP ${r.status}`;
      throw new Error(msg);
    }
    return j;
  }

  // -----------------------------
  // Render
  // -----------------------------
  function renderPage(data){
    const metier = data.metier || {};
    const pays = data.pays || {};
    const sponsor = data.sponsor || {};

    // ✅ sponsor active can be true/"true"/1/"1"
    const sponsorActive =
      sponsor.active === true ||
      sponsor.active === "true" ||
      sponsor.active === 1 ||
      sponsor.active === "1";

    const title = metier.name || metier.titre || metier.title || "Job";
    const desc  = metier.description || metier.desc || metier.summary || "";
    const tags  = metier.tags || metier.keywords || [];

    // Banner logic
    const sponsorWide = sponsorActive ? (sponsor.logo_wide || sponsor.logo_2) : (pays?.banners?.wide || "");
    const sponsorSq   = sponsorActive ? (sponsor.logo_square || sponsor.logo_1) : (pays?.banners?.square || "");
    const clickLink   = sponsorActive ? (sponsor.link || sponsor.url) : (pays?.banners?.link || "/sponsorship");

    ROOT.innerHTML = "";

    const wrap = el("div", { class:"u-wrap" });

    // header
    const top = el("div", { class:"u-topbar" }, [
      el("div", { class:"u-brand" }, [
        el("h1", { class:"u-title", html: title }),
        el("p", { class:"u-sub", html: `Country: <b>${(data.iso || pays.iso || "").toString()}</b> • Language: <b>${(data.lang || pays.langue_finale || "").toString()}</b>` })
      ]),
      el("div", { style:"display:flex; gap:10px; align-items:center; flex-wrap:wrap;" }, [
        el("a", { class:"u-btn", href:"/my-account", html:"My account" }),
        el("a", { class:"u-btn u-btn-primary", href:"/sponsorship", html:"Sponsor this page" })
      ])
    ]);

    // wide banner under title
    const wide = bannerAnchor(sponsorWide, clickLink);

    // layout
    const leftCard = el("div", { class:"u-card" }, [
      el("div", { class:"u-card-h" }, [
        el("p", { class:"u-card-t", html:"Overview" }),
        el("span", { class:"u-note", html: sponsorActive ? `Sponsored by ${sponsor.name || "partner"}` : "Not sponsored" })
      ]),
      el("div", { class:"u-card-b u-stack" }, [
        (tags && tags.length)
          ? el("div", { class:"u-badges" }, tags.slice(0,12).map(t => el("span", { class:"u-badge", html: String(t) })))
          : el("p", { class:"u-p", html:"" }),
        desc ? el("p", { class:"u-p", html: desc }) : el("p", { class:"u-p", html:"" }),

        el("div", { class:"u-sep" }),

        el("div", { class:"u-stack" }, [
          el("p", { class:"u-h2", html:"Country-specific blocks" }),
          ...(Array.isArray(data.blocs_pays) && data.blocs_pays.length
            ? data.blocs_pays
                .sort((a,b)=>(a.order||0)-(b.order||0))
                .map(b => el("div", { class:"u-card", style:"box-shadow:none; border-radius:16px;" }, [
                  el("div", { class:"u-card-h" }, [
                    el("p", { class:"u-card-t", html: b.title || "Block" }),
                    el("span", { class:"u-note", html:"" })
                  ]),
                  el("div", { class:"u-card-b" }, [
                    el("div", { class:"u-p", html: b.html || b.text || "" })
                  ])
                ]))
            : [ el("p", { class:"u-p", html:"No country-specific blocks available yet for this job in this country." }) ]
          )
        ]),

        el("div", { class:"u-sep" }),

        el("div", { class:"u-stack" }, [
          el("p", { class:"u-h2", html:"FAQ" }),
          ...(Array.isArray(data.faq) && data.faq.length
            ? data.faq.map(item => {
                const q = item.q || item.question || "Question";
                const a = item.a || item.answer || "";
                const d = el("details", { class:"u-faq" }, [
                  el("summary", { html: q }),
                  el("div", { class:"u-p", html: a })
                ]);
                return d;
              })
            : [ el("p", { class:"u-p", html:"No FAQ for now." }) ]
          )
        ])
      ])
    ]);

    const right = el("div", { class:"u-stack" }, [
      el("div", { class:"u-card" }, [
        el("div", { class:"u-card-h" }, [
          el("p", { class:"u-card-t", html:"Sponsor banner (square)" }),
          el("span", { class:"u-note", html:"Clickable" })
        ]),
        el("div", { class:"u-card-b" }, [
          bannerAnchor(sponsorSq, clickLink)
        ])
      ]),
      el("div", { class:"u-card" }, [
        el("div", { class:"u-card-h" }, [
          el("p", { class:"u-card-t", html:"About sponsorship" }),
          el("span", { class:"u-note", html:"" })
        ]),
        el("div", { class:"u-card-b u-stack" }, [
          el("p", { class:"u-p", html: sponsorActive
            ? "This page is currently sponsored. Click the banner to visit the sponsor."
            : "This page is not sponsored yet. If you want your company displayed here, you can sponsor this job page."
          }),
          el("a", { class:"u-btn u-btn-primary", href:"/sponsorship", html:"Start sponsorship" })
        ])
      ])
    ]);

    const grid = el("div", { class:"u-grid" }, [ leftCard, right ]);

    wrap.appendChild(top);
    wrap.appendChild(wide);
    wrap.appendChild(grid);

    ROOT.appendChild(wrap);
  }

  // -----------------------------
  // MAIN
  // -----------------------------
  async function main(){
    injectCSS();
    renderLoading();

    const slug = detectSlug();
    if (!slug) throw new Error("Missing slug. Use /metier?slug=YOUR_SLUG&iso=FR (or /metier?metier=YOUR_SLUG&country=FR)");

    const iso = await detectISO();
    log("slug/iso", slug, iso);

    const data = await fetchMetierPage({ slug, iso });
    log("data", data);

    renderPage(data);
  }

  main().catch((e) => {
    console.error("[metier-page] fatal", e);
    renderError(e && e.message ? e.message : e);
  });
})();
