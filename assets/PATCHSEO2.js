<script>
(function(){
  if (window.__ULYDIA_SEO_HOOK__) return;
  window.__ULYDIA_SEO_HOOK__ = true;

  const norm = s => String(s||"").trim();
  const getParam = (k)=> new URLSearchParams(location.search).get(k);

  function setCanonical(slug, iso){
    slug = norm(slug);
    iso  = (norm(iso)||"FR").toUpperCase();
    if(!slug) return;

    const href = `${location.origin}${location.pathname}?metier=${encodeURIComponent(slug)}&country=${encodeURIComponent(iso)}`;
    let l = document.querySelector('link[rel="canonical"]');
    if(!l){
      l = document.createElement("link");
      l.rel = "canonical";
      document.head.appendChild(l);
    }
    l.href = href;
  }

  function setMeta(name, content){
    content = norm(content);
    if(!content) return;
    let m = document.querySelector(`meta[name="${name}"]`);
    if(!m){
      m = document.createElement("meta");
      m.setAttribute("name", name);
      document.head.appendChild(m);
    }
    m.setAttribute("content", content);
  }

  function injectJsonLd(raw){
    if(!raw) return;

    // nettoie anciens tags Ulydia (évite doublons)
    document.querySelectorAll('script[type="application/ld+json"][data-ulydia="1"]').forEach(n=>n.remove());

    let obj = raw;
    if (typeof raw === "string") {
      const txt = raw.trim();
      if(!txt) return;
      try { obj = JSON.parse(txt); } catch(e) {
        console.warn("[ULYDIA SEO] jsonld invalid JSON (skipped)", e);
        return;
      }
    }

    try{
      const tag = document.createElement("script");
      tag.type = "application/ld+json";
      tag.setAttribute("data-ulydia","1");
      tag.textContent = JSON.stringify(obj);
      document.head.appendChild(tag);
    }catch(e){
      console.warn("[ULYDIA SEO] jsonld inject failed", e);
    }
  }

  function applySEOFromMetier(m){
    if(!m || typeof m !== "object") return;

    const slug = m.slug_clean || m.slug || m.metier_slug || getParam("metier");
    const iso  = getParam("country") || getParam("iso") || m.iso || "FR";

    // Airtable fields (d’après tes captures)
    const metaTitle = m.Meta_title || m.meta_title;
    const metaDesc  = m.Meta_description || m.meta_description;
    const jsonld    = m.jsonld || m.JSONLD;

    if (metaTitle) document.title = String(metaTitle);
    if (metaDesc)  setMeta("description", metaDesc);

    setCanonical(slug, iso);
    injectJsonLd(jsonld);
  }

  // Hook fetch
  const _fetch = window.fetch;
  window.fetch = async function(input, init){
    const res = await _fetch.apply(this, arguments);
    try{
      const url = (typeof input === "string") ? input : (input && input.url) ? input.url : "";
      // On écoute UNIQUEMENT la réponse de ton endpoint métier
      if (url && url.includes("/v1/metier-page")) {
        const clone = res.clone();
        clone.json().then(data=>{
          // Selon ton worker payload: { ok:true, metier:{...}, iso, lang, ... }
          if(data && data.ok === true){
            applySEOFromMetier(data.metier || data.job || data.fiche || null);
          }
        }).catch(()=>{});
      }
    }catch(e){}
    return res;
  };

})();
</script>
