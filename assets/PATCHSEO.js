<script>
(function(){
  // --- CONFIG (adapte si besoin)
  const WORKER = (window.ULYDIA_WORKER_URL || "").replace(/\/+$/,"");
  if(!WORKER){ console.warn("[ULYDIA SEO] Missing ULYDIA_WORKER_URL"); return; }

  const usp = new URLSearchParams(location.search);
  const slug = (usp.get("metier") || "").trim();
  const iso  = (usp.get("country") || "FR").toUpperCase();

  // Canonical strict demandé
  function canonicalUrl(){
    if(!slug) return location.origin + location.pathname;
    return `${location.origin}${location.pathname}?metier=${encodeURIComponent(slug)}&country=${encodeURIComponent(iso)}`;
  }

  function setTitle(t){
    if(t && typeof t === "string") document.title = t.trim();
  }

  function upsertMetaDescription(content){
    if(!content) return;
    const c = String(content).trim();
    if(!c) return;
    let tag = document.querySelector('meta[name="description"]');
    if(!tag){
      tag = document.createElement("meta");
      tag.setAttribute("name","description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", c);
  }

  function upsertCanonical(href){
    if(!href) return;
    let link = document.querySelector('link[rel="canonical"]');
    if(!link){
      link = document.createElement("link");
      link.setAttribute("rel","canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
  }

  // JSON-LD: injecte uniquement si JSON valide
  function upsertJsonLd(jsonLike){
    if(!jsonLike) return;

    // accepte: objet, ou string JSON
    let obj = null;
    if(typeof jsonLike === "object"){
      obj = jsonLike;
    } else {
      const raw = String(jsonLike).trim();
      if(!raw) return;

      // nettoyage minimal (sans prendre de risques)
      const cleaned = raw
        .replace(/\u201C|\u201D/g, '"')  // “ ”
        .replace(/\u2018|\u2019/g, "'"); // ‘ ’

      try {
        obj = JSON.parse(cleaned);
      } catch(e){
        console.warn("[ULYDIA SEO] Invalid JSON-LD (skipped)", e);
        return;
      }
    }

    // supprime les anciens jsonld Ulydia
    document.querySelectorAll('script[type="application/ld+json"][data-ulydia="1"]').forEach(n=>n.remove());

    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-ulydia","1");
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  async function fetchMetierPayload(){
    if(!slug) return null;
    const url = `${WORKER}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
    const res = await fetch(url, { credentials:"omit" });
    const data = await res.json().catch(()=>null);
    if(!data || data.ok !== true) return null;
    return data;
  }

  (async function init(){
    // Canonical toujours (même si pas de slug)
    upsertCanonical(canonicalUrl());

    // Si pas de métier sélectionné, on ne met pas meta/jsonld
    if(!slug) return;

    const payload = await fetchMetierPayload();
    if(!payload) return;

    // Selon ton worker: adapte les chemins si besoin
    // (je mets plusieurs fallback pour être robuste)
    const metier = payload.metier || payload.fiche || payload.job || {};
    const seoTitle = metier.Meta_title || metier.meta_title || metier.metaTitle || metier.LLM_canonical_label || null;
    const seoDesc  = metier.Meta_description || metier.meta_description || metier.metaDescription || null;
    const jsonld   = metier.jsonld || metier.jsonLd || metier.JSONLD || payload.jsonld || null;

    setTitle(seoTitle);
    upsertMetaDescription(seoDesc);
    upsertCanonical(canonicalUrl());
    upsertJsonLd(jsonld);
  })();

})();
</script>
