/*!
ULYDIA — BASE WRAPPER — FIX16 — SAFEURL PATCH — 2026-01-29
Goal:
- Prevent `/undefined/v1/metier-page` fetches (hard fail early if config missing)
- Freeze critical config so it can't be overwritten by legacy scripts
- Add a minimal fetch guard ONLY for `/v1/metier-page` to avoid "Unexpected token '<'" JSON crashes
- Then inject the real base (FIX15) exactly once
*/

(function(){
  // =========================================================
  // 0) Hard preflight: config must exist BEFORE anything boots
  // =========================================================
  var required = [
    "ULYDIA_WORKER_URL",
    "ULYDIA_PROXY_SECRET"
  ];

  function isNonEmptyString(v){
    return typeof v === "string" && v.trim().length > 0;
  }

  function showFatal(msg){
    try{
      console.error(msg);
      // minimal inline overlay (no dependency on ulydia-ui)
      var id = "ulydia-fatal-overlay";
      if (document.getElementById(id)) return;
      var d = document.createElement("div");
      d.id = id;
      d.setAttribute("style",
        "position:fixed;inset:0;z-index:2147483647;background:#fff;" +
        "display:flex;align-items:center;justify-content:center;padding:24px;" +
        "font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      );
      d.innerHTML =
        "<div style='max-width:760px;width:100%;border:1px solid #eee;border-radius:14px;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.06)'>" +
          "<div style='font-size:16px;font-weight:700;margin-bottom:8px'>Ulydia — configuration missing</div>" +
          "<div style='font-size:14px;line-height:1.5;color:#444;margin-bottom:12px'>" +
            "The page scripts stopped intentionally to avoid fetching <b>/undefined/v1/metier-page</b>.<br/>" +
            "Fix: ensure the global config script runs before any metier-page scripts." +
          "</div>" +
          "<pre style='white-space:pre-wrap;font-size:12px;background:#fafafa;border:1px solid #eee;border-radius:10px;padding:12px;margin:0;color:#222'>" +
            (String(msg || "")).replace(/</g,"&lt;").replace(/>/g,"&gt;") +
          "</pre>" +
        "</div>";
      document.documentElement.appendChild(d);
    }catch(e){}
  }

  // Collect missing keys
  var missing = [];
  for (var i=0;i<required.length;i++){
    var k = required[i];
    if (!isNonEmptyString(window[k])) missing.push(k);
  }

  // If missing, STOP NOW (do not set any boot flags)
  if (missing.length){
    showFatal("[ULYDIA] Missing required globals: " + missing.join(", ") + "\n" +
      "Expected e.g. window.ULYDIA_WORKER_URL = \"https://...workers.dev\";");
    return;
  }

  // =========================================================
  // 1) Freeze critical globals (prevents accidental overwrite)
  // =========================================================
  function freezeKey(key){
    try{
      if (window["__ULYDIA_LOCKED__" + key]) return;
      var v = window[key];
      if (!isNonEmptyString(v)) return;

      // If already non-writable, just mark as locked
      var desc = Object.getOwnPropertyDescriptor(window, key);
      if (desc && desc.writable === false) {
        window["__ULYDIA_LOCKED__" + key] = true;
        return;
      }

      Object.defineProperty(window, key, {
        value: v,
        writable: false,
        configurable: false,
        enumerable: true
      });
      window["__ULYDIA_LOCKED__" + key] = true;
    }catch(e){}
  }

  freezeKey("ULYDIA_WORKER_URL");
  freezeKey("ULYDIA_PROXY_SECRET");
  freezeKey("ULYDIA_IPINFO_TOKEN"); // optional, but freezing doesn't hurt if set

  // =========================================================
  // 2) Fetch guard ONLY for /v1/metier-page
  //    (prevents JSON parse crash on HTML 404 pages)
  // =========================================================
  try{
    if (!window.__ULYDIA_FETCH_GUARD_V1__ && typeof window.fetch === "function"){
      window.__ULYDIA_FETCH_GUARD_V1__ = true;

      var _fetch = window.fetch.bind(window);

      window.fetch = function(input, init){
        var url = "";
        try{
          if (typeof input === "string") url = input;
          else if (input && typeof input.url === "string") url = input.url;
        }catch(e){}

        // Only guard the metier-page API calls
        var isMetierApi = url.indexOf("/v1/metier-page") !== -1;

        if (!isMetierApi) return _fetch(input, init);

        // If URL somehow contains "/undefined/", hard fail
        if (url.indexOf("/undefined/") !== -1){
          return Promise.reject(new Error("[ULYDIA] Fetch blocked: URL contains /undefined/ => " + url));
        }

        return _fetch(input, init).then(function(res){
          try{
            var ct = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
            var isJson = ct.toLowerCase().indexOf("application/json") !== -1;

            if (!isJson){
              // Read a small snippet for debugging (without consuming original stream for callers)
              return res.clone().text().then(function(txt){
                var head = (txt || "").slice(0, 180).replace(/\s+/g," ").trim();
                throw new Error(
                  "[ULYDIA] Invalid API response (expected JSON). " +
                  "status=" + res.status + " ct=" + ct + " url=" + url +
                  (head ? (" head=\"" + head + "\"") : "")
                );
              });
            }

            return res;
          }catch(e){
            // If any header access fails, still return res (caller may handle)
            return res;
          }
        });
      };
    }
  }catch(e){}

})();


(function(){
  // =========================================================
  // 3) FIX16 wrapper boot (inject FIX15 exactly once)
  // =========================================================
  if (window.__ULYDIA_BASE_FIX16__) return;
  window.__ULYDIA_BASE_FIX16__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG && console && console.log) console.log.apply(console, arguments); }
  function warn(){ if(console && console.warn) console.warn.apply(console, arguments); }

  // Ensure there is only ONE root in DOM
  try{
    var roots = document.querySelectorAll("#ulydia-metier-root");
    if (roots && roots.length > 1){
      for (var i=1;i<roots.length;i++){
        try{ roots[i].parentNode && roots[i].parentNode.removeChild(roots[i]); }catch(e){}
      }
      warn("[ULYDIA] removed duplicate #ulydia-metier-root nodes:", roots.length-1);
    }
  }catch(e){}

  // Anti-loop: do not re-run if another base already started
  if (window.__ULYDIA_METIER_PAGE_BOOTING__){
    warn("[ULYDIA] base already booting — abort FIX16");
    return;
  }
  window.__ULYDIA_METIER_PAGE_BOOTING__ = true;

  // Load the real base (FIX15)
  var BASE_SRC = "https://ulydia-assets.pages.dev/assets/metier-page.v2026-01-29.FINAL.BASE.FIX15.ANTILOOP.RESPONSESAFE.js";

  function inject(){
    try{
      // If it's already present, don't inject again
      var existing = Array.prototype.slice.call(document.scripts||[]).some(function(s){
        return s && s.src && s.src.indexOf("FINAL.BASE.FIX15.ANTILOOP.RESPONSESAFE.js") !== -1;
      });
      if (existing){
        warn("[ULYDIA] FIX15 already present — skip inject");
        return;
      }
      var s = document.createElement("script");
      s.src = BASE_SRC;
      s.defer = true;
      s.onload = function(){ log("[ULYDIA] FIX15 loaded"); };
      s.onerror = function(){ warn("[ULYDIA] cannot load FIX15 base:", BASE_SRC); };
      document.head.appendChild(s);
    }catch(e){
      warn("[ULYDIA] inject failed", e);
    }
  }

  // Keep a short delay so UI can be ready
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
