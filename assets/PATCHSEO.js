<script>
(function(){
  const WORKER = (window.ULYDIA_WORKER_URL || "").replace(/\/+$/,"");
  if(!WORKER){ console.warn("[ULYDIA SEO] Missing ULYDIA_WORKER_URL"); return; }

  const usp = new URLSearchParams(location.search);
  const metierSlug = (usp.get("metier") || "").trim();
  const iso = (usp.get("country") || "FR").toUpperCase();

  // ✅ Canonical STRICT demandé
  function buildCanonical(){
    if(!metierSlug) return location.origin + location.pathname;
    return `${location.origin}${location.pathname}?metier=${encodeURIComponent(metierSlug)}&country=${encodeURIComponent(iso)}`;
  }

  function setTitle(v){
    const t = String(v||"").trim();
    if(t) document.title = t;
  }

  function setMetaDescription(v){
    const d = String(v||"").trim();
    if(!d) return;
    let m = document.querySelector('meta[name="description"]');
    if(!m){
      m = document.createElement("meta");
      m.setAttribute("name","description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", d);
  }

  function setCanonical(href){
    if(!href) return;
    let l = document.querySelector('link[rel="canonical"]');
    if(!l){
      l = document.createElement("link");
      l.setAttribute("rel","canonical");
      document.head.appendChild(l);
    }
    l.setAttribute("href", href);
  }

  // ✅ JSON-LD robuste : parse -> stringify ; sinon skip
  function upsertJsonLd(raw){
    if(raw == null) return;

    // supprime l'ancien JSON-LD géré par Ulydia (si présent)
    document.querySelectorAll('script[type="application/ld+json"][data-ulydia="1"]').forEach(n=>n.remove());

    let obj = null;

    // cas 1: déjà un objet
    if(typeof raw === "object"){
      obj = raw;
    } else {
      let s = String(raw || "").trim();
      if(!s) return;

      // nettoyages courants (guillemets typographiques, etc.)
      s = s
        .replace(/\u201C|\u201D/g, '"')  // “ ”
        .replace(/\u2018|\u2019/g, "'"); // ‘ ’

      // si Airtable a mis des quotes autour : "\"{...}\""
      // => on tente parse une première fois (string JSON)
      try {
        const first = JSON.parse(s);
        if(typeof first === "string"){
          s = first.trim();
        } else {
          obj = first;
        }
      } catch(e){ /* ignore */ }

      // si pas encore obj, on tente parse normal
      if(!obj){
        try {
          obj = JSON.parse(s);
        } catch(e){
          console.warn("[ULYDIA SEO] Invalid JSON-LD (skipped)", e);
          return;
        }
      }
    }

    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.setAttribute("data-ulydia","1");
    tag.textContent = JSON.stringify(obj);
    document.head.appendChild(tag);
  }

  async function fetchMetier(){
    if(!metierSlug) return null;
    const url = `${WORKER}/v1/metier-page?slug=${encodeURIComponent(metierSlug)}&iso=${encodeURIComponent(iso)}`;
    const res = await fetch(url, { credentials:"omit" });
    const data = await res.json().catch(()=>null);
    if(!data || data.ok !== true) return null;
    return data;
  }

  (async function init(){
    const canonical = buildCanonical();
    setCanonical(canonical);

    if(!metierSlug) return;

    const payload = await fetchMetier();
    if(!payload) return;

    // ⚠️ adapte seulement si ton worker range ces champs ailleurs
    const m = payload.metier || payload.fiche || payload.job || {};

    setTitle(m.Meta_title);
    setMetaDescription(m.Meta_description);
    setCanonical(canonical);

    upsertJsonLd(m.jsonld);
  })();
})();
</script>

