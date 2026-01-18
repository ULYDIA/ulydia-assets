<script>
(() => {
  if (window.__ULYDIA_METIER_PAGE_V3__) return;
  window.__ULYDIA_METIER_PAGE_V3__ = true;

  // =========================
  // CONFIG
  // =========================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const ENDPOINT = "/sponsor-info"; // ton endpoint OK

  // Cache (évite attente et évite flash non-sponsor)
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
  const CACHE_PREFIX = "ul_sponsor_v1:";

  // Blocks (présents dans ta page)
  const ID_SPONSORED_BLOCK     = "block-sponsored";
  const ID_NOT_SPONSORED_BLOCK = "block-not-sponsored";

  // =========================
  // HELPERS
  // =========================
  const qp = (name) => new URLSearchParams(location.search).get(name);
  const apiBase = () => String(WORKER_URL || "").replace(/\/$/, "");
  const $id = (id) => document.getElementById(id);

  function normIso(v){
    return String(v || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  }
  function normLang(v){
    return String(v || "").trim().toLowerCase().split("-")[0];
  }

  function show(el, yes){
    if (!el) return;
    el.style.display = yes ? "" : "none";
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

  function setLinkOnSponsorAnchors(url){
    if (!url) return;
    const nodes = [
      ...document.querySelectorAll('#block-sponsored a'),
      ...document.querySelectorAll('[data-role="sponsor-link"]'),
      ...document.querySelectorAll('[data-sponsor-link="true"]'),
      ...document.querySelectorAll('a[data-action="sponsor"]'),
    ];
    nodes.forEach(a => {
      try{
        a.setAttribute("href", url);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.style.pointerEvents = "auto";
      }catch(e){}
    });
  }

  function decided(){
    window.__ULYDIA_SPONSOR_DECIDED__ = true;
    try { document.documentElement.classList.remove("ul-sponsor-loading"); } catch(e){}
    hidePlaceholder();
  }

  // =========================
  // Placeholder neutre (pas de non-sponsor flash)
  // =========================
  function ensurePlaceholder(){
    if (document.getElementById("ul_sponsor_placeholder")) return;

    const sp = $id(ID_SPONSORED_BLOCK);
    const ns = $id(ID_NOT_SPONSORED_BLOCK);
    const parent = (sp && sp.parentNode) || (ns && ns.parentNode) || document.body;

    const ph = document.createElement("div");
    ph.id = "ul_sponsor_placeholder";
    ph.innerHTML = `
      <div class="ph-row"></div>
      <div class="ph-row"></div>
    `;
    // on le met avant les blocks si possible
    try{
      if (sp) parent.insertBefore(ph, sp);
      else parent.insertBefore(ph, ns);
    }catch(e){
      parent.prepend(ph);
    }
  }

  function hidePlaceholder(){
    const ph = document.getElementById("ul_sponsor_placeholder");
    if (ph) ph.style.display = "none";
  }

  // =========================
  // CONTEXT
  // =========================
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

  // =========================
  // CACHE
  // =========================
  function cacheKey(metier, country){
    return `${CACHE_PREFIX}${metier}::${country}`;
  }

  function readCache(metier, country){
    try{
      const raw = sessionStorage.getItem(cacheKey(metier, country));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts) return null;
      if ((Date.now() - obj.ts) > CACHE_TTL_MS) return null;
      return obj;
    }catch(e){
      return null;
    }
  }

  function writeCache(metier, country, info){
    try{
      sessionStorage.setItem(cacheKey(metier, country), JSON.stringify({
        ts: Date.now(),
        sponsored: !!info?.sponsored,
        sponsor: info?.sponsor || {}
      }));
    }catch(e){}
  }

  // =========================
  // FETCH sponsor info (POST JSON)
  // =========================
  async function fetchSponsorInfo(metier, country, lang){
    const url = apiBase() + ENDPOINT;
    const headers = { "content-type":"application/json" };
    if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ metier, country, lang }),
      cache: "no-store"
    });

    const txt = await res.text();
    let data = null;
    try { data = JSON.parse(txt); } catch(e){}

    if (!res.ok) return null;
    if (!data || typeof data !== "object") return null;

    const sponsored = !!data.sponsored;
    const sponsorObj = data.sponsor || {};
    return {
      sponsored,
      sponsor: {
        link: String(sponsorObj.link || "").trim(),
        logo_1: pickUrl(sponsorObj.logo_1),
        logo_2: pickUrl(sponsorObj.logo_2),
        name: String(sponsorObj.name || "").trim()
      }
    };
  }

  // =========================
  // APPLY UI
  // =========================
  function apply(info){
    const blockSponsored    = $id(ID_SPONSORED_BLOCK);
    const blockNotSponsored = $id(ID_NOT_SPONSORED_BLOCK);

    const sponsored = !!info?.sponsored;

    if (sponsored) {
      // sponsor
      show(blockNotSponsored, false);
      show(blockSponsored, true);

      const sponsor = info.sponsor || {};
      const link = String(sponsor.link || "").trim();

      // ⚠️ tes images n'ont pas ids sponsor-logo-1/2 => on cible les images dans le block sponsor
      // 1) on prend 2 images distinctes dans le block sponsor (ordre DOM)
      const imgs = blockSponsored ? Array.from(blockSponsored.querySelectorAll("img")) : [];
      const img1 = imgs[0] || null;
      const img2 = imgs[1] || imgs[0] || null;

      if (sponsor.logo_1 && img1) setImgHard(img1, sponsor.logo_1);
      if (sponsor.logo_2 && img2) setImgHard(img2, sponsor.logo_2);

      if (link) setLinkOnSponsorAnchors(link);

    } else {
      // non sponsor
      show(blockSponsored, false);
      show(blockNotSponsored, true);
    }

    decided();
  }

  // =========================
  // BOOT
  // =========================
  (async function boot(){
    const metier = findMetierSlug();
    const country = getCountry();
    const lang = getLang();

    // Toujours : on met un placeholder neutre (pas la non-sponsor)
    ensurePlaceholder();

    // 1) Cache instantané (évite le délai ET évite flash non-sponsor)
    const cached = readCache(metier, country);
    if (cached) {
      apply({ sponsored: cached.sponsored, sponsor: cached.sponsor });
      // refresh silencieux en arrière-plan
      fetchSponsorInfo(metier, country, lang).then(fresh => {
        if (!fresh) return;
        writeCache(metier, country, fresh);
        // Si c'est différent, on met à jour (rare)
        if (!!fresh.sponsored !== !!cached.sponsored || String(fresh?.sponsor?.logo_2||"") !== String(cached?.sponsor?.logo_2||"")) {
          apply(fresh);
        }
      }).catch(()=>{});
      return;
    }

    // 2) Pas de cache : on fetch et on affiche DIRECT la bonne (sans montrer non-sponsor avant)
    const timeout = setTimeout(() => {
      // fallback rare : si Worker trop lent -> on montre non-sponsor (mais après 2.5s)
      if (window.__ULYDIA_SPONSOR_DECIDED__) return;
      apply({ sponsored:false, sponsor:{} });
    }, 2500);

    try{
      const info = await fetchSponsorInfo(metier, country, lang);
      clearTimeout(timeout);

      if (!info) {
        apply({ sponsored:false, sponsor:{} });
        return;
      }

      writeCache(metier, country, info);
      apply(info);

    }catch(e){
      clearTimeout(timeout);
      apply({ sponsored:false, sponsor:{} });
    }
  })();

})();
</script>
