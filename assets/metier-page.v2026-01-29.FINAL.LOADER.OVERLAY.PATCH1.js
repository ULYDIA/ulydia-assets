(function(){
  // ULYDIA — LOADER OVERLAY — PATCH1 — 2026-01-29
  // Affiche un loader plein écran pendant le rendu JS, puis le masque.
  if (window.__ULYDIA_LOADER_PATCH1__) return;
  window.__ULYDIA_LOADER_PATCH1__ = true;

  function add(){
    if (document.getElementById("ulydia_overlay_loader")) return;
    var st = document.createElement("style");
    st.id = "ulydia_loader_styles";
    st.textContent =
      ".u-overlay{position:fixed;inset:0;z-index:999999;background:#fff;display:flex;align-items:center;justify-content:center}" +
      ".u-overlayCard{display:flex;align-items:center;gap:14px;padding:18px 22px;border:1px solid rgba(15,23,42,.12);border-radius:16px;box-shadow:0 10px 30px rgba(2,6,23,.08);background:#fff;font-family:Montserrat,system-ui}" +
      ".u-spinner{width:22px;height:22px;border-radius:999px;border:3px solid rgba(2,6,23,.15);border-top-color:rgba(2,6,23,.75);animation:uSpin 0.9s linear infinite}" +
      "@keyframes uSpin{to{transform:rotate(360deg)}}";
    document.head.appendChild(st);

    var ov = document.createElement("div");
    ov.id = "ulydia_overlay_loader";
    ov.className = "u-overlay";
    ov.innerHTML =
      '<div class="u-overlayCard">' +
        '<div class="u-spinner"></div>' +
        '<div>' +
          '<div style="font-weight:900;font-size:13px;color:#0f172a">Loading…</div>' +
          '<div style="font-size:12px;opacity:.7;margin-top:2px">Please wait a moment.</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
  }

  function hide(){
    var ov = document.getElementById("ulydia_overlay_loader");
    if (ov) ov.remove();
  }

  function isRendered(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root) return false;
    if (root.querySelector("#ulydia_overlay_loader")) return false;
    // contenu significatif ?
    var txt = (root.textContent||"").replace(/\s+/g," ").trim();
    return (root.children && root.children.length > 0) && txt.length > 60;
  }

  function tick(start){
    if (isRendered()) return hide();
    if (Date.now() - start > 12000) return hide(); // fail-safe
    requestAnimationFrame(function(){ tick(start); });
  }

  function boot(){
    add();
    tick(Date.now());
    window.addEventListener("ULYDIA:PAGE_READY", hide, { once:true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();