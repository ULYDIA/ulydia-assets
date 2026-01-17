<script>
(() => {
  if (window.__ULYDIA_METIER_PAGE_V3__) return;
  window.__ULYDIA_METIER_PAGE_V3__ = true;

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  // Endpoint unique (on arrête de "probe" maintenant que c'est OK)
  const SPONSOR_ENDPOINT = "/sponsor-info";

  // Blocks
  const ID_SPONSORED_BLOCK     = "block-sponsored";
  const ID_NOT_SPONSORED_BLOCK = "block-not-sponsored";

  // =========================================================
  // HARD HIDE IMMEDIATELY (anti flash)
  // =========================================================
  const antiFlashCss = document.createElement("style");
  antiFlashCss.id = "ulydia-sponsor-antiflash";
  antiFlashCss.textContent = `
    /* On cache les 2 blocs tant que la décision n'est pas prise */
    #${ID_SPONSORED_BLOCK}, #${ID_NOT_SPONSORED_BLOCK}{ display:none !important; }
    html.ulydia-sponsor-loading #${ID_SPONSORED_BLOCK},
    html.ulydia-sponsor-loading #${ID_NOT_SPONSORED_BLOCK}{ display:none !important; }
  `;
  document.head.appendChild(antiFlashCss);
  try { document.documentElement.classList.add("ulydia-sponsor-loading"); } catch(e){}

  // =========================================================
  // HELPERS
  // =========================================================
  const qp = (name) => new URLSearchParams(location.search).get(name);
  const $  = (id) => document.getElementById(id);

  function apiBase(){ return String(WORKER_URL || "").replace(/\/$/, ""); }

  function normIso(v){
    return String(v || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  }
  function normLang(v){
    return String(v || "").trim().toLowerCase().split("-")[0];
  }

  function findMetierSlug(){
    const fromQP = (qp("metier") || "").trim();
    if (fromQP) return fromQP;

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
      normIso(document.getElementById("country-iso")?.textContent) ||
      "US"
    );
  }

  function getLang(){
    return (
      normLang(window.VISITOR_LANG) ||
      normLang(qp("lang")) ||
      normLang(document.getElementById("country-lang")?.textContent) ||
      "en"
    );
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
      imgEl.style.visibility = "";
      imgEl.style.opacity = "";
    }catch(e){}
  }

  function showBlock(which){
    const s = $(ID_SPONSORED_BLOCK);
    const n = $(ID_NOT_SPONSORED_BLOCK);
    if (s) s.style.display = (which === "sponsored") ? "" : "none";
    if (n) n.style.display = (which === "notsponsored") ? "" : "none";
  }

  function makeClickable(el, url){
    if (!el || !url) return;
    // si image dans un <a>, on met le href sur le <a>
    const a = el.closest("a");
    if (a){
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.pointerEvents = "auto";
      return;
    }
    // sinon on rend l'image cliquable
    el.style.cursor = "pointer";
    el.style.pointerEvents = "auto";
    el.addEventListener("click", () => window.open(url, "_blank", "noopener,noreferrer"));
  }

  function applySponsoredUI(info){
    const sponsor = info?.sponsor || {};
    const link = String(sponsor.link || "").trim();
    const logo1 = pickUrl(sponsor.logo_1);
    const logo2 = pickUrl(sponsor.logo_2);

    // Sélecteurs tolérants (car tes IDs changent selon pages Webflow)
    const imgSquare =
      document.getElementById("sponsor-logo-1") ||
      document.querySelector('[data-sponsor-img="square"]') ||
      document.querySelector("#block-sponsored img") ||
      null;

    const imgLandscape =
      document.getElementById("sponsor-logo-2") ||
      document.querySelector('[data-sponsor-img="landscape"]') ||
      document.querySelectorAll("#block-sponsored img")[1] ||
      null;

    if (logo1 && imgSquare) setImgHard(imgSquare, logo1);
    if (logo2 && imgLandscape) setImgHard(imgLandscape, logo2);

    if (link){
      if (imgSquare) makeClickable(imgSquare, link);
      if (imgLandscape) makeClickable(imgLandscape, link);

      // optionnel : tous les liens "sponsor" connus
      document.querySelectorAll('[data-role="sponsor-link"],[data-sponsor-link="true"],a[data-action="sponsor"]').forEach(a=>{
        try{
          a.href = link; a.target="_blank"; a.rel="noopener noreferrer";
          a.style.pointerEvents="auto";
        }catch(e){}
      });
    }
  }

  async function fetchSponsorInfo(metier, country, lang){
    const url = apiBase() + SPONSOR_ENDPOINT;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-proxy-secret": PROXY_SECRET
      },
      body: JSON.stringify({ metier, country, lang })
    });

    const data = await res.json().catch(()=>null);
    if (!res.ok) throw new Error((data && (data.error || data.message)) || ("HTTP " + res.status));
    return data;
  }

  function finish(){
    try { document.documentElement.classList.remove("ulydia-sponsor-loading"); } catch(e){}
    // on peut laisser le CSS antiflash, ou le retirer :
    // antiFlashCss.remove();
  }

  // =========================================================
  // BOOT
  // =========================================================
  (async function boot(){
    const metier = findMetierSlug();
    const country = getCountry();
    const lang = getLang();

    if (!metier){
      showBlock("notsponsored");
      finish();
      return;
    }

    try{
      const info = await fetchSponsorInfo(metier, country, lang);

      const sponsored = !!info?.sponsored;
      window.SPONSORED_ACTIVE = sponsored;

      if (sponsored){
        applySponsoredUI(info);
        showBlock("sponsored");
      } else {
        showBlock("notsponsored");
      }

      // event utile pour ton footer global si besoin
      try{
        window.dispatchEvent(new CustomEvent("ulydia:sponsor-ready", { detail: { sponsored, payload: info }}));
      }catch(e){}

    } catch(err){
      // fail-safe: on montre non sponsored
      console.warn("[metier-page] sponsor check failed:", err);
      showBlock("notsponsored");
    } finally {
      finish();
    }
  })();

})();
</script>

