/* ULYDIA — Banner 1 (landscape) duplicate just before FAQ — PATCH9 SAFE
   - Never throws (try/catch)
   - Inserts ONLY the banner image (no extra texts)
   - Works even if wrappers differ (no js-faq-wrap required)
*/
(function(){
  try{
    if (window.__ULYDIA_BANNER_BEFOREFAQ_DONE__) return;
    window.__ULYDIA_BANNER_BEFOREFAQ_DONE__ = true;

    function pickUrl(x){
      if (!x) return "";
      if (typeof x === "string") return x;
      return (x.url || x.src || x.downloadUrl || x.directUrl || x.fileUrl || x.value || "");
    }

    function findLandscapeUrl(){
      var info = window.__ULYDIA_SPONSOR_INFO__ || window.__ULYDIA_SPONSOR__ || window.__ULYDIA_SPONSOR_DATA__ || null;
      var u = pickUrl(info && (info.landscape || info.banner_landscape || info.logo_1 || info.logo1 || info.banner1 || info.banner_1));
      if (u) return u;

      var p = window.__ULYDIA_PAGE__ || window.__ULYDIA_METIER_PAGE__ || null;
      u = pickUrl(p && (p.banner_landscape || p.landscapeUrl || p.banner1 || p.banner_1));
      if (u) return u;

      var imgs = Array.prototype.slice.call(document.querySelectorAll("img"));
      for (var i=0;i<imgs.length;i++){
        var im = imgs[i];
        var src = im.currentSrc || im.src || "";
        if (!src) continue;
        var w = im.naturalWidth || im.width || 0;
        var h = im.naturalHeight || im.height || 0;
        if (w && h && w >= 500 && h <= 250) return src;
        if (/sponsor|banni|banner/i.test(src)) return src;
      }
      return "";
    }

    var bannerUrl = findLandscapeUrl();
    if (!bannerUrl) return;

    function findFaqAnchor(){
      var anyFaq = document.querySelector('[id*="faq" i], [class*="faq" i]');
      var nodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,div,span"));
      var best = null;
      for (var i=0;i<nodes.length;i++){
        var t = (nodes[i].textContent || "").replace(/\s+/g," ").trim().toLowerCase();
        if (!t) continue;
        if (t.indexOf("questions fréquentes") >= 0 || t.indexOf("questions frequentes") >= 0){
          best = nodes[i];
          break;
        }
      }
      return best || anyFaq || null;
    }

    var anchor = findFaqAnchor();
    if (!anchor) return;

    var container = anchor.closest ? (anchor.closest("section") || anchor.closest(".u-card") || anchor.closest("div")) : null;
    var insertBeforeEl = container || anchor;

    if (document.querySelector("[data-ulydia='banner-before-faq']")) return;

    var wrap = document.createElement("div");
    wrap.setAttribute("data-ulydia","banner-before-faq");
    wrap.style.width = "100%";
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    wrap.style.margin = "26px 0 18px";

    var img = document.createElement("img");
    img.alt = "Banner";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = bannerUrl;
    img.style.width = "100%";
    img.style.maxWidth = "720px";
    img.style.height = "auto";
    img.style.borderRadius = "14px";
    img.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)";

    wrap.appendChild(img);

    if (insertBeforeEl && insertBeforeEl.parentNode){
      insertBeforeEl.parentNode.insertBefore(wrap, insertBeforeEl);
    }
  }catch(e){
    try{ console.warn("[ULYDIA][BANNER BEFORE FAQ][PATCH9] skipped:", e); }catch(_){}
  }
})();