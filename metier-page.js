<script>
(() => {
  if (window.__ULYDIA_METIER_PAGE_V5__) return;
  window.__ULYDIA_METIER_PAGE_V5__ = true;

  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const ENDPOINT     = "/sponsor-info";

  const ID_SPONSORED_BLOCK     = "block-sponsored";
  const ID_NOT_SPONSORED_BLOCK = "block-not-sponsored";

  const qp = (name) => new URLSearchParams(location.search).get(name);
  const apiBase = () => String(WORKER_URL || "").replace(/\/$/, "");
  const $id = (id) => document.getElementById(id);

  function normIso(v){ return String(v || "").trim().toUpperCase().replace(/[^A-Z]/g, ""); }
  function normLang(v){ return String(v || "").trim().toLowerCase().split("-")[0]; }

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
      ...document.querySelectorAll("#block-sponsored a"),
      ...document.querySelectorAll('[data-role="sponsor-link"]'),
      ...document.querySelectorAll('[data-sponsor-link="true"]'),
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

  function ensurePlaceholder(){
    if (document.getElementById("ul_sponsor_placeholder")) return;

    const sp = $id(ID_SPONSORED_BLOCK);
    const ns = $id(ID_NOT_SPONSORED_BLOCK);
    const parent = (sp && sp.parentNode) || (ns && ns.parentNode) || document.body;

    const ph = document.createElement("div");
    ph.id = "ul_sponsor_placeholder";
    ph.innerHTML = `<div class="ph-row"></div><div class="ph-row"></div>`;

    try{
      if (sp) parent.insertBefore(ph, sp);
      else if (ns) parent.insertBefore(ph, ns);
      else parent.prepend(ph);
    }catch(e){
      parent.prepend(ph);
    }
  }

  function hidePlaceholder(){
    const ph = document.getElementById("ul_sponsor_placeholder");
    if (ph) ph.style.display = "none";
  }

  function decided(){
    hidePlaceholder();
    try { document.documentElement.classList.remove("ul-sponsor-loading"); } catch(e){}
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

  function getCountryInstant(){
    // IMPORTANT: on regarde aussi DOM/param pour éviter US fallback
    return (
      normIso(window.VISITOR_COUNTRY) ||
      normIso(qp("country")) ||
      normIso($id("country-iso")?.textContent) ||
      ""
    );
  }

  function getLang(){
    return normLang(window.VISITOR_LANG) || normLang(qp("lang")) || normLang($id("country-lang")?.textContent) || "en";
  }

  async function waitForCountry(maxMs=1200){
    const t0 = Date.now();
    let c = getCountryInstant();
    while (!c && (Date.now() - t0) < maxMs){
      await new Promise(r => setTimeout(r, 60));
      c = getCountryInstant();
    }
    return c || "US"; // dernier recours
  }

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

    if (!res.ok || !data) return null;

    const sponsored = !!data.sponsored;
    const sponsorObj = data.sponsor || {};
    return {
      sponsored,
      sponsor: {
        link:   String(sponsorObj.link || "").trim(),
        logo_1: pickUrl(sponsorObj.logo_1),
        logo_2: pickUrl(sponsorObj.logo_2),
        name:   String(sponsorObj.name || "").trim(),
      }
    };
  }

  function apply(info){
    const sp = $id(ID_SPONSORED_BLOCK);
    const ns = $id(ID_NOT_SPONSORED_BLOCK);

    const sponsored = !!info?.sponsored;

    if (sponsored){
      show(ns, false);
      show(sp, true);

      const sponsor = info.sponsor || {};
      const link = String(sponsor.link || "").trim();

      // tes <img> n'ont pas d'id sponsor-logo-1/2 => on prend les images du block sponsor
      const imgs = sp ? Array.from(sp.querySelectorAll("img")) : [];
      const img1 = imgs[0] || null;
      const img2 = imgs[1] || imgs[0] || null;

      if (sponsor.logo_1 && img1) setImgHard(img1, sponsor.logo_1);
      if (sponsor.logo_2 && img2) setImgHard(img2, sponsor.logo_2);

      if (link) setLinkOnSponsorAnchors(link);
    } else {
      show(sp, false);
      show(ns, true);
    }

    decided();
  }

  function onReady(fn){
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once:true });
    else fn();
  }

  onReady(async () => {
    ensurePlaceholder();

    const metier = findMetierSlug();
    const lang   = getLang();

    if (!metier){
      apply({ sponsored:false, sponsor:{} });
      return;
    }

    // ✅ attend le country (FR) avant de décider
    let country = await waitForCountry(1200);

    // 1) fetch normal
    let info = await fetchSponsorInfo(metier, country, lang);

    // ✅ si on a dû fallback US et que ça dit non sponsor -> re-essaye quand VISITOR_COUNTRY arrive
    if ((!info || !info.sponsored) && country === "US"){
      // petit délai pour laisser VISITOR_COUNTRY se remplir
      await new Promise(r => setTimeout(r, 450));
      const late = getCountryInstant();
      if (late && late !== "US"){
        country = late;
        info = await fetchSponsorInfo(metier, country, lang);
      }
    }

    if (!info){
      apply({ sponsored:false, sponsor:{} });
      return;
    }

    apply(info);
  });

})();
</script>
