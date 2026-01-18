<script>
(() => {
  if (window.__ULYDIA_METIER_PAGE_PROD_V1__) return;
  window.__ULYDIA_METIER_PAGE_PROD_V1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[metier-page]", ...a);

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // Ton endpoint "vrai" (tu peux en laisser 1 seul maintenant)
  const SPONSOR_ENDPOINT = "/sponsor-info";

  // IDs de blocs (OK d’après tes screenshots)
  const ID_SPONSORED_BLOCK     = "block-sponsored";
  const ID_NOT_SPONSORED_BLOCK = "block-not-sponsored";

  // =========================================================
  // HELPERS
  // =========================================================
  const qp = (name) => new URLSearchParams(location.search).get(name);
  const normIso  = (v) => String(v || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  const normLang = (v) => String(v || "").trim().toLowerCase().split("-")[0];
  const apiBase  = () => String(WORKER_URL || "").replace(/\/$/, "");
  const $id = (id) => document.getElementById(id);

  function show(el, yes){
    if (!el) return;
    el.style.display = yes ? "" : "none";
  }

  // --- Anti flash: on cache les 2 blocs immédiatement
  function hideBothImmediately(){
    const a = $id(ID_SPONSORED_BLOCK);
    const b = $id(ID_NOT_SPONSORED_BLOCK);
    if (a) a.style.display = "none";
    if (b) b.style.display = "none";
  }

  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (Array.isArray(v)) return (v[0]?.url || v[0]?.thumbnails?.large?.url || v[0]?.thumbnails?.full?.url || "").trim();
    if (typeof v === "object") return (v.url || v.thumbnails?.large?.url || v.thumbnails?.full?.url || "").trim();
    return "";
  }

  function setImgHard(imgEl, url){
    if (!imgEl || !url) return;
    try{
      imgEl.removeAttribute("srcset");
      imgEl.removeAttribute("sizes");
      imgEl.setAttribute("src", url);
      imgEl.setAttribute("srcset", url);
    }catch(e){}
  }

  // Met un lien sur:
  // - l’anchor parent si existe
  // - sinon click handler sur l’image (fallback)
  function wireClick(el, url){
    if (!el || !url) return;
    const a = el.closest && el.closest("a");
    if (a){
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.pointerEvents = "auto";
      return;
    }
    // fallback
    try{
      el.style.cursor = "pointer";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
      }, { passive:false });
    }catch(e){}
  }

  function findMetierSlug(){
    const fromQP = (qp("metier") || "").trim();
    if (fromQP) return fromQP;

    const ms = $id("metier-slug");
    if (ms && ms.textContent.trim()) return ms.textContent.trim();

    const any = document.querySelector("[data-metier]");
    if (any){
      const v = (any.getAttribute("data-metier") || "").trim();
      if (v) return v;
    }

    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function getCountry(){
    // priorité : VISITOR_COUNTRY (global) -> query -> element -> default
    return (
      normIso(window.VISITOR_COUNTRY) ||
      normIso(qp("country")) ||
      normIso($id("country-iso")?.textContent) ||
      "US"
    );
  }

  function getLang(){
    return (
      normLang(window.VISITOR_LANG) ||
      normLang(qp("lang")) ||
      normLang($id("country-lang")?.textContent) ||
      "en"
    );
  }

  async function postJson(url, body){
    const headers = { "content-type":"application/json", "accept":"application/json" };
    if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

    const res = await fetch(url, { method:"POST", headers, body: JSON.stringify(body), cache:"no-store" });
    const txt = await res.text().catch(() => "");
    let data = null;
    try{ data = JSON.parse(txt); }catch(e){}
    return { ok: res.ok, status: res.status, data, txt };
  }

  function normalizeSponsorPayload(obj){
    const o = obj || {};
    const sponsored = !!o.sponsored;

    const s = o.sponsor || {};
    const sponsor = {
      link:   String(s.link || "").trim(),
      logo_1: pickUrl(s.logo_1),
      logo_2: pickUrl(s.logo_2),
      name:   String(s.name || "").trim(),
    };
    return { sponsored, sponsor, raw:o };
  }

  // Injecte images + lien dans le block sponsor:
  // - on prend les 2 premières <img> trouvées à l’intérieur du bloc
  //   (comme tes IDs sponsor-logo-1/2 n’existent pas)
  function applySponsorToDOM(info){
    const blockSponsored = $id(ID_SPONSORED_BLOCK);
    const blockNot = $id(ID_NOT_SPONSORED_BLOCK);

    const sponsored = !!info?.sponsored;
    window.SPONSORED_ACTIVE = sponsored;

    if (!blockSponsored || !blockNot){
      // si jamais un bloc manque, on n’explose pas
      return;
    }

    if (sponsored){
      // show sponsor only
      show(blockNot, false);
      show(blockSponsored, true);

      const imgs = Array.from(blockSponsored.querySelectorAll("img"));
      const img1 = imgs[0] || null; // square
      const img2 = imgs[1] || null; // landscape

      const link = String(info?.sponsor?.link || "").trim();
      const l1 = String(info?.sponsor?.logo_1 || "").trim();
      const l2 = String(info?.sponsor?.logo_2 || "").trim();

      if (img1 && l1) setImgHard(img1, l1);
      if (img2 && l2) setImgHard(img2, l2);

      if (link){
        if (img1) wireClick(img1, link);
        if (img2) wireClick(img2, link);

        // bonus: si tu as des anchors marqués
        document.querySelectorAll('[data-role="sponsor-link"], [data-sponsor-link="true"], a[data-action="sponsor"]').forEach(a => {
          try{
            a.href = link; a.target="_blank"; a.rel="noopener noreferrer";
            a.style.pointerEvents = "auto";
          }catch(e){}
        });
      }
    } else {
      // show non sponsor only
      show(blockSponsored, false);
      show(blockNot, true);
    }
  }

  function emitSponsorReady(sponsored, payload){
    try{
      window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", {
        detail: { sponsored: !!sponsored, payload: payload || null }
      }));
    }catch(e){}
  }

  // =========================================================
  // BOOT
  // =========================================================
  hideBothImmediately(); // ✅ crucial pour éviter le flash

  let decided = false;
  function finalize(info){
    if (decided) return;
    decided = true;

    const sponsored = !!info?.sponsored;
    window.__ULYDIA_SPONSOR_VERDICT__ = { sponsored };

    applySponsorToDOM(info || { sponsored:false, sponsor:{} });
    emitSponsorReady(sponsored, info || null);
  }

  async function run(){
    const metier = findMetierSlug();
    const country = getCountry();
    const lang = getLang();

    log("context", { metier, country, lang });

    if (!metier){
      finalize({ sponsored:false, sponsor:{}, error:"missing_metier" });
      return;
    }

    const url = apiBase() + SPONSOR_ENDPOINT;

    try{
      const r = await postJson(url, { metier, country });
      log("sponsor-info", r.status, r.data);

      if (r.ok && r.data && typeof r.data === "object"){
        finalize(normalizeSponsorPayload(r.data));
        return;
      }
    }catch(e){
      log("sponsor fetch error", e);
    }

    finalize({ sponsored:false, sponsor:{} });
  }

  // On attend max 700ms le geo (sinon fallback direct)
  let started = false;
  function startOnce(){
    if (started) return;
    started = true;
    run();
  }

  window.addEventListener("ulydia:geo-ready", () => startOnce(), { once:true });
  setTimeout(() => startOnce(), 700);

})();
</script>
