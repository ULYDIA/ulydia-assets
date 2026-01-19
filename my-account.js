(() => {
  // ============================================================================
  // Ulydia — My Account Dashboard (V13 CLEAN)
  // ✅ Adds Billing module loader + opens billing.js on Credit Card button
  // ✅ Keeps everything else identical
  // ============================================================================
  if (window.__ULYDIA_MY_ACCOUNT_V13__) return;
  window.__ULYDIA_MY_ACCOUNT_V13__ = true;

  // =========================================================
  // CONFIG
  // =========================================================
  const WORKER_URL   = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET = "ulydia_2026_proxy_Y4b364u2wsFsQL";

  const SUPABASE_URL = "https://zwnkscepqwujkcxusknn.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bmtzY2VwcXd1amtjeHVza25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDY1OTIsImV4cCI6MjA4MzgyMjU5Mn0.WALx2WeXlCDWhD0JA8L0inPBDtlJOlh9UQm7Z-U2D38";
  const STORAGE_KEY = "ulydia_auth_v1";

  const LOGIN_URL = "/login";
  const DASHBOARD_PATH = "/my-account";

  const USERS_ROLES_JS_URL = "https://ulydia-assets.pages.dev/users-roles.js";

  // ✅ NEW: Billing module (Cloudflare Pages)
  const BILLING_JS_URL = "https://ulydia-assets.pages.dev/billing.js";
  // ✅ your Stripe publishable key (public)
  const STRIPE_PUBLISHABLE_KEY = "pk_live_xxx";

  const TOKEN_KEYS = ["ULYDIA_MANAGE_TOKEN","ulydia_manage_token_v1"];
  const qp = (k)=> new URLSearchParams(location.search).get(k);
  const DEBUG = String(qp('debug')||'').trim() === '1';
  function dlog(...a){ if (DEBUG) console.log('[my-account]', ...a); }
  function apiBase(){ return WORKER_URL.replace(/\/$/, ""); }

  // =========================================================
  // Token store
  // =========================================================
  function rememberToken(token){
    try{
      const t = String(token || "").trim();
      if (!t) return;
      TOKEN_KEYS.forEach(k => localStorage.setItem(k, t));
    }catch(_){}
  }
  function getTokenFromURLorLS(){
    const urlToken = String(qp("token") || "").trim();
    if (urlToken) return urlToken;
    try{
      for (const k of TOKEN_KEYS){
        const v = String(localStorage.getItem(k) || "").trim();
        if (v) return v;
      }
    }catch(_){}
    return "";
  }

  // =========================================================
  // Global loader (comme avant)
  // =========================================================
  function setPending(on){
    if (!on){
      const ov = document.getElementById("u_global_loader");
      if (ov) ov.remove();
      return;
    }
    if (document.getElementById("u_global_loader")) return;

    const overlay = document.createElement("div");
    overlay.id = "u_global_loader";
    overlay.className = "u-overlay";
    overlay.innerHTML = `
      <div class="u-overlayCard">
        <div class="u-overlayRow">
          <span class="u-spinner"></span>
          <div>
            <div class="u-overlayTitle">Loading dashboard…</div>
            <div class="u-overlaySub">Fetching your sponsorships and billing info.</div>
          </div>
        </div>
        <div class="u-skelGrid">
          <div class="u-skel"></div><div class="u-skel"></div><div class="u-skel"></div><div class="u-skel"></div>
        </div>
      </div>
    `;
    (document.body || document.documentElement).appendChild(overlay);
  }

  // =========================================================
  // DOM helper
  // =========================================================
  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "style") n.style.cssText = v;
      else if (k === "class") n.className = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, String(v));
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c === null || c === undefined) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  // =========================================================
  // HTTP helpers (V13 CLEAN)
  // - Adds Supabase Authorization bearer automatically
  // - Retry for /account/* when token invalid: retries once without token (worker uses supaUser)
  // - Better error messages
  // =========================================================
  async function getAccessToken() {
    try {
      const sb = getSb();
      if (!sb) return "";
      const { data } = await sb.auth.getSession();
      return String(data?.session?.access_token || "");
    } catch (e) {
      return "";
    }
  }

  function stripTokenParam(path){
    try{
      const u = new URL(apiBase() + path);
      u.searchParams.delete("token");
      return u.pathname + (u.search ? u.search : "");
    }catch(_){
      return String(path||"").replace(/([?&])token=[^&]+&?/,"$1").replace(/[?&]$/,"");
    }
  }

  async function requestJson(path, opts={}) {
    const method = opts.method || "GET";
    const headers = Object.assign({}, opts.headers || {});

    const access = await getAccessToken();
    if (access) headers["Authorization"] = "Bearer " + access;

    const res = await fetch(apiBase() + path, {
      method,
      headers,
      body: opts.body
    });

    const txt = await res.text().catch(() => "");
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }

    // Retry logic: only for /account/* with token param
    if (!res.ok && res.status === 403 && method === "GET") {
      const isAccount = String(path||"").startsWith("/account/");
      const hasToken = /[?&]token=/.test(String(path||""));
      if (isAccount && hasToken) {
        const retryPath = stripTokenParam(path);
        dlog("403 on account endpoint, retry without token", { path, retryPath });
        const res2 = await fetch(apiBase() + retryPath, { method, headers });
        const txt2 = await res2.text().catch(() => "");
        let data2 = {};
        try { data2 = txt2 ? JSON.parse(txt2) : {}; } catch { data2 = { raw: txt2 }; }
        if (!res2.ok) {
          const msg = data2.error || data2.message || `API error (${res2.status})`;
          throw new Error(msg);
        }
        return data2;
      }
    }

    if (!res.ok) {
      const msg = data.error || data.message || `API error (${res.status})`;
      if (res.status === 403 && /invalid token/i.test(String(msg))) {
        throw new Error("Invalid manage token. Please open your dashboard link again, or logout/login.");
      }
      throw new Error(msg);
    }

    return data;
  }

  async function getJson(path) {
    return requestJson(path, { method: "GET" });
  }

  async function postJson(path, payload) {
    const res = await fetch(apiBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-proxy-secret": PROXY_SECRET },
      body: JSON.stringify(payload || {})
    });
    const txt = await res.text().catch(() => "");
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }
    if (!res.ok) throw new Error(data.error || data.message || `API error (${res.status})`);
    return data;
  }

  // =========================================================
  // Supabase client
  // =========================================================
  function getSb(){
    if (!window.supabase?.createClient) return null;
    window.__ULYDIA_SUPABASE__ ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, storageKey: STORAGE_KEY }
    });
    return window.__ULYDIA_SUPABASE__;
  }

  async function resolveTokenViaSupabasePatched(){
    const sb = getSb();
    if (!sb) return "";

    const { data: userRes } = await sb.auth.getUser();
    const user = userRes?.user;
    if (!user) return "__LOGIN__";

    // Optional RPC shortcut
    try{
      const rpc = await sb.rpc("get_my_manage_token");
      const t = String(rpc?.data || "").trim();
      if (t) return t;
    }catch(_){}

    const { data: mems, error: memErr } = await sb
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id);

    if (memErr) return "";
    const companyIds = (mems || []).map(r => r.company_id).filter(Boolean);
    if (!companyIds.length) return "";

    const { data: companies, error: coErr } = await sb
      .from("companies")
      .select("id, manage_token, created_at")
      .in("id", companyIds)
      .order("created_at", { ascending: false });

    if (coErr) return "";
    return String(companies?.[0]?.manage_token || "").trim();
  }

  async function resolveTokenViaWorkerLookup(sb){
    try{
      if (!PROXY_SECRET) return "";
      if (!sb) sb = getSb();
      if (!sb) return "";

      const { data: { user } } = await sb.auth.getUser();
      const email = String(user?.email || "").trim().toLowerCase();
      if (!email) return "";

      const res = await fetch(apiBase() + "/lookup-customer", {
        method: "POST",
        headers: { "content-type":"application/json", "x-proxy-secret": PROXY_SECRET },
        body: JSON.stringify({
          email,
          billing_email: email,
          user_email: email,
          supabase_user_id: String(user?.id || "").trim(),
        }),
      });
      if (!res.ok) return "";
      const j = await res.json().catch(() => ({}));
      return String(j?.token || j?.manage_token || j?.manageToken || j?.data?.manage_token || "").trim();
    }catch(_){
      return "";
    }
  }

  // =========================================================
  // Users & Roles module
  // =========================================================
  function loadScriptOnceById(id, src){
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) return resolve(true);
      const s = document.createElement("script");
      s.id = id;
      s.src = src;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  async function openUsersRoles(){
    try{
      if (!window.UlydiaUsersRoles) await loadScriptOnceById("u_users_roles_script", USERS_ROLES_JS_URL);
      if (!window.UlydiaUsersRoles?.open) return alert("Users & Roles module not ready. Please refresh.");
      const sb = getSb();
      const token = String(window.__ULYDIA_DASH_TOKEN__ || "").trim();
      window.UlydiaUsersRoles.open({ supabase: sb || null, token });
    }catch(e){
      console.warn("[Users&Roles] open error:", e);
      alert("Users & Roles module failed to load.");
    }
  }

  // =========================================================
  // ✅ Billing module (NEW)
  // =========================================================
  async function openBillingModal(){
    try{
      const token = String(window.__ULYDIA_DASH_TOKEN__ || "").trim();
      if (!token) return alert("Missing token");

      await loadScriptOnceById("u_billing_script", BILLING_JS_URL);

      if (!window.UlydiaBilling?.open) {
        alert("Billing module not ready. Please refresh.");
        return;
      }

      window.UlydiaBilling.open({
        token,
        workerUrl: WORKER_URL,
        proxySecret: PROXY_SECRET,
        stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
        openModal: typeof openModal === "function" ? openModal : null,
      });
    }catch(e){
      console.warn("[Billing] open error:", e);
      alert("Billing module failed to load.");
    }
  }

  // =========================================================
  // Fonts + CSS
  // =========================================================
  function injectMontserratOnce(){
    if (document.getElementById("ul_montserrat")) return;
    const l1 = document.createElement("link");
    l1.id = "ul_montserrat";
    l1.rel = "preconnect";
    l1.href = "https://fonts.googleapis.com";
    document.head.appendChild(l1);

    const l2 = document.createElement("link");
    l2.rel = "preconnect";
    l2.href = "https://fonts.gstatic.com";
    l2.crossOrigin = "anonymous";
    document.head.appendChild(l2);

    const l3 = document.createElement("link");
    l3.rel = "stylesheet";
    l3.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap";
    document.head.appendChild(l3);
  }

  function injectStylesOnce(){
    if (document.getElementById("ulydia_dash_css_v13")) return;

    const css = `
:root{
  --ul-font:'Montserrat',system-ui,-apple-system,Segoe UI,Roboto,Arial;
  --ul-red:#c00102;
  --ul-red-focus:rgba(192,1,2,.12);
  --ul-text:rgba(0,0,0,.88);
  --ul-muted:rgba(0,0,0,.55);
  --ul-border:rgba(0,0,0,.12);
  --ul-border2:rgba(0,0,0,.18);
  --ul-bg:#fff;
  --ul-shadow:0 10px 30px rgba(0,0,0,.08);
  --ul-r-lg:16px;
  --ul-r-md:12px;
}

/* ===== Page ===== */
.u-wrap{
  min-height:70vh;
  display:flex;
  justify-content:center;
  padding:32px 16px;
  font-family:var(--ul-font);
  color:var(--ul-text);
}
.u-card{
  width:min(1200px,100%);
  background:#fff;
  border:1px solid var(--ul-border);
  border-radius:var(--ul-r-lg);
  box-shadow:var(--ul-shadow);
  overflow:hidden;
}

/* ===== Header ===== */
.u-top{
  padding:22px 24px;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
  border-bottom:1px solid var(--ul-border);
  background:#fff;
}
.u-title{font-size:24px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.u-sub{margin-top:6px;font-size:13px;font-weight:700;color:var(--ul-red)}
.u-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}

/* ===== Buttons ===== */
.u-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:10px 14px;
  border-radius:12px;
  font-weight:800;
  font-size:13px;
  border:1px solid var(--ul-border2);
  background:#fff;
  cursor:pointer;
  text-decoration:none;
  color:var(--ul-text);
}
.u-btnPrimary{background:var(--ul-red);color:#fff;border-color:var(--ul-red)}
.u-btnGhost:hover{border-color:rgba(0,0,0,.35)}
.u-btn:disabled{opacity:.6;cursor:not-allowed}

/* ===== Stats ===== */
.u-detailGrid{
  display:grid;
  grid-template-columns:repeat(5,minmax(0,1fr));
  gap:12px;
  padding:16px 24px;
  border-bottom:1px solid var(--ul-border);
  background:#fff;
}
.u-mini{
  border:1px solid var(--ul-border);
  border-radius:14px;
  padding:12px;
  background:#fff;
}
.u-miniLabel{
  font-size:11px;
  font-weight:900;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:var(--ul-muted);
}
.u-miniVal{margin-top:6px;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ===== Filters ===== */
.u-filterRow{
  padding:12px 24px;
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center;
  border-bottom:1px solid var(--ul-border);
  background:#fff;
  flex-wrap:wrap;
}
.u-pill{
  padding:8px 12px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
  border:1px solid var(--ul-border);
  background:#fff;
  color:rgba(0,0,0,.72);
}
.u-select{
  padding:10px 12px;
  border-radius:12px;
  border:1px solid var(--ul-border2);
  font-weight:700;
  font-family:var(--ul-font);
  background:#fff;
}
.u-select:focus{outline:none;border-color:rgba(192,1,2,.6);box-shadow:0 0 0 4px var(--ul-red-focus)}

/* ============================================================================
   TABLE – FIXED LEFT / SCROLL MIDDLE / FIXED RIGHT
   ========================================================================== */
.u-table{background:#fff}

/* header row */
.u-headFixed{
  display:grid;
  grid-template-columns:300px 1fr 220px;
  border-top:1px solid var(--ul-border);
  border-bottom:1px solid var(--ul-border);
  background:#fff;
}
.u-headFixed > div{
  padding:12px 20px;
  font-size:11px;
  font-weight:900;
  letter-spacing:.10em;
  text-transform:uppercase;
  color:rgba(0,0,0,.45);
}
.u-headLeft{border-right:1px solid rgba(0,0,0,.06)}
.u-headRight{border-left:1px solid rgba(0,0,0,.06); text-align:right}

/* middle header that scrolls with middle rows */
.u-midHead{overflow-x:auto; scrollbar-gutter:stable;}
.u-midHeadInner{
  min-width:740px;
  display:grid;
  grid-template-columns:
    80px   /* Country */
    95px   /* Plan */
    110px  /* Status */
    240px  /* Banners */
    190px; /* Period */
  gap:12px;
  align-items:center;
}

/* body row */
.u-fixedRow{
  display:grid;
  grid-template-columns:300px 1fr 220px;
  border-bottom:1px solid rgba(0,0,0,.06);
  background:#fff;
}
.u-fixedRow:hover{background:rgba(0,0,0,.012)}

/* left cell */
.u-left{
  padding:12px 20px;
  display:flex;
  align-items:center;
  font-size:14px;
  font-weight:900;
  border-right:1px solid rgba(0,0,0,.06);
}
.u-metier{
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
  line-height:1.25;
}

/* middle scroll area */
.u-mid{overflow-x:auto; scrollbar-gutter:stable;}
.u-midInner{
  min-width:740px;
  display:grid;
  grid-template-columns:
    80px
    95px
    110px
    240px
    190px;
  gap:12px;
  padding:12px 16px;
  align-items:center;
}
.u-midInner > div{
  font-size:13px;
  font-weight:700;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  color:rgba(0,0,0,.78);
}

/* badge */
.u-badge{
  height:26px;
  padding:0 10px;
  border-radius:999px;
  font-size:11px;
  font-weight:900;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:1px solid var(--ul-border);
  white-space:nowrap;
}
.u-ok{background:rgba(18,161,80,.12);border-color:rgba(18,161,80,.22);color:#0b6b37}
.u-warn{background:rgba(255,170,0,.12);border-color:rgba(255,170,0,.22);color:#8a4b00}
.u-bad{background:rgba(215,25,25,.12);border-color:rgba(215,25,25,.22);color:#a10f0f}

/* banners */
.u-banners{display:flex;gap:8px;align-items:center}
.u-logoWide{
  width:170px;
  height:32px;
  object-fit:cover;
  border-radius:10px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
}
.u-logoSq{
  width:32px;
  height:32px;
  object-fit:cover;
  border-radius:10px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
}
.u-logoPlaceholder{
  height:32px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:10px;
  border:1px dashed rgba(0,0,0,.20);
  background:rgba(0,0,0,.02);
  color:rgba(0,0,0,.45);
  font-size:12px;
  font-weight:900;
}
.u-logoPlaceholderWide{width:170px}
.u-logoPlaceholderSq{width:32px}

/* period */
.u-period{
  font-size:12.5px;
  font-weight:800;
  color:rgba(0,0,0,.60);
}

/* right actions */
.u-right{
  padding:12px 20px;
  display:flex;
  gap:6px;
  justify-content:flex-end;
  align-items:center;
  border-left:1px solid rgba(0,0,0,.06);
}
.u-iconBtn{
  width:30px;
  height:30px;
  border-radius:10px;
  border:1px solid rgba(0,0,0,.12);
  background:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  padding:0;
}
.u-iconBtn svg{width:15px;height:15px}
.u-iconBtn:active{transform:translateY(1px)}
.u-iconBtn.u-disabled{opacity:.55;pointer-events:none}

/* colored backgrounds */
.icon-edit{background:#eef1ff;}
.icon-invoice{background:#e9f8f1;}
.icon-pay{background:#fff7ed;}
.icon-stop{background:#fdecec;}
.icon-toggle{background:#edf6ff;}

/* empty / error */
.u-empty{padding:18px 24px;color:rgba(0,0,0,.55);font-weight:900}
.u-error{padding:18px 24px;color:#a10f0f;background:rgba(215,25,25,.08);border:1px solid rgba(215,25,25,.18);border-radius:14px;margin:18px 24px;font-weight:900}

/* overlay loader */
.u-overlay{
  position:fixed; inset:0; z-index:999999;
  background:rgba(255,255,255,.92);
  display:flex; align-items:center; justify-content:center;
  padding:18px; font-family:var(--ul-font);
}
.u-overlayCard{
  width:min(560px, 92vw);
  border:1px solid var(--ul-border);
  border-radius:var(--ul-r-lg);
  background:#fff;
  box-shadow:var(--ul-shadow);
  padding:18px;
}
.u-overlayRow{display:flex;align-items:center;gap:12px}
.u-spinner{
  width:18px;height:18px;border-radius:50%;
  border:2px solid rgba(0,0,0,.14);
  border-top-color:var(--ul-red);
  animation:uSpin .75s linear infinite;
}
@keyframes uSpin{to{transform:rotate(360deg)}}
.u-overlayTitle{font-weight:900;color:var(--ul-text);font-size:14px}
.u-overlaySub{font-size:13px;color:rgba(0,0,0,.55);margin-top:6px;line-height:1.35}
.u-skelGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}
.u-skel{
  height:70px;border-radius:14px;border:1px solid var(--ul-border);
  background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.07) 37%,rgba(0,0,0,.04) 63%);
  background-size:400% 100%;
  animation:uShimmer 1.1s ease-in-out infinite;
}
@keyframes uShimmer{0%{background-position:100% 0} 100%{background-position:0 0}}

@media(max-width:980px){
  .u-detailGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:860px){
  .u-headFixed{display:none}
  .u-fixedRow{grid-template-columns:1fr}
  .u-left{border-right:none;border-bottom:1px solid rgba(0,0,0,.06)}
  .u-right{border-left:none;border-top:1px solid rgba(0,0,0,.06);justify-content:flex-start}
  .u-midHeadInner,.u-midInner{min-width:720px}
}

/* --- FIX: remove the “2 grey bars” (hide header scrollbar) --- */
.u-midHead{
  overflow-x:auto;
  scrollbar-gutter: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.u-midHead::-webkit-scrollbar{
  height: 0 !important;
}

/* Optional: make the body scrollbar thinner (keep only ONE bar visible) */
.u-mid{
  overflow-x:auto;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}
.u-mid::-webkit-scrollbar{
  height: 10px;
}
.u-mid::-webkit-scrollbar-track{
  background: rgba(0,0,0,.06);
  border-radius: 999px;
}
.u-mid::-webkit-scrollbar-thumb{
  background: rgba(0,0,0,.20);
  border-radius: 999px;
}

/* ===== ACTION ICONS: restore bubbles + tooltips ===== */
.u-actionsRow{ gap:8px; }

.u-iconBtn{
  position:relative;
  width:34px;
  height:34px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  padding:0;
}
.u-iconBtn svg{ width:16px; height:16px; }
.u-iconBtn:active{ transform: translateY(1px); }
.u-iconBtn[disabled],
.u-iconBtn.u-disabled{ opacity:.55; pointer-events:none; }

/* soft colored bubbles */
.icon-edit{ background:#eef1ff; }
.icon-invoice{ background:#e9f8f1; }
.icon-pay{ background:#fff7ed; }
.icon-stop{ background:#fdecec; }
.icon-toggle{ background:#edf6ff; }

.icon-edit:hover{ background:#dfe4ff; }
.icon-invoice:hover{ background:#d4f3e6; }
.icon-pay:hover{ background:#ffedd5; }
.icon-stop:hover{ background:#f9d3d3; }
.icon-toggle:hover{ background:#d6ecff; }

/* tooltip bubble using the existing title="" */
.u-iconBtn:hover::after{
  content: attr(title);
  position:absolute;
  left:50%;
  bottom:calc(100% + 10px);
  transform:translateX(-50%);
  white-space:nowrap;
  padding:8px 10px;
  border-radius:999px;
  background:rgba(17,24,39,.92);
  color:#fff;
  font-size:12px;
  font-weight:800;
  letter-spacing:.01em;
  box-shadow:0 10px 25px rgba(0,0,0,.18);
  z-index:9999;
  pointer-events:none;
}
.u-iconBtn:hover::before{
  content:"";
  position:absolute;
  left:50%;
  bottom:calc(100% + 4px);
  transform:translateX(-50%);
  border:6px solid transparent;
  border-top-color:rgba(17,24,39,.92);
  z-index:9999;
  pointer-events:none;
}

/* hide tooltip on touch */
@media (hover: none){
  .u-iconBtn:hover::after,
  .u-iconBtn:hover::before{ display:none; }
}
`;

    const style = document.createElement("style");
    style.id = "ulydia_dash_css_v13";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // =========================================================
  // Formatting + labels
  // =========================================================
  function statusMeta(s) {
    const v = String(s || "").toLowerCase();
    if (!v) return { text: "unknown", cls: "" };
    if (v === "active") return { text: "active", cls: "u-ok" };
    if (v === "trialing") return { text: "trialing", cls: "u-warn" };
    if (v === "past_due") return { text: "past due", cls: "u-bad" };
    if (v === "canceled" || v === "cancelled") return { text: "canceled", cls: "" };
    return { text: v.replace(/_/g, " "), cls: "" };
  }

  function toUnixSeconds(x){
    const n = Number(x || 0);
    if (!n) return 0;
    return n > 2e10 ? Math.round(n/1000) : n;
  }

  function fmtDateFRFromUnix(ts){
    const s = toUnixSeconds(ts);
    if (!s) return "—";
    return new Intl.DateTimeFormat("fr-FR", { year:"numeric", month:"short", day:"2-digit" })
      .format(new Date(s * 1000));
  }

  function addIntervalDate(startUnix, interval, intervalCount){
    const s = toUnixSeconds(startUnix);
    if (!s) return 0;
    const d = new Date(s * 1000);
    const count = Math.max(1, Number(intervalCount || 1));
    const it = String(interval || "month").toLowerCase();

    if (it === "year" || it === "annual") d.setMonth(d.getMonth() + 12 * count);
    else if (it === "week") d.setDate(d.getDate() + 7 * count);
    else if (it === "day") d.setDate(d.getDate() + 1 * count);
    else d.setMonth(d.getMonth() + 1 * count);

    return Math.round(d.getTime() / 1000);
  }

  function humanizeSlug(s){
    const v = String(s || "").trim();
    if (!v) return "";
    return v.replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  }

  function jobLabel(item){
    const nice = item.metier_name || item.metier_title || item.job_name || item.job_title || "";
    if (String(nice || "").trim()) return String(nice).trim();
    return humanizeSlug(item.metier || "");
  }

  function pickContact(payload){
    const c = payload?.customer || {};
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const first = c.first_name || c.firstname || c.prenom || (items.find(x => x.first_name || x.firstname || x.prenom) || {}).first_name || "";
    const last  = c.last_name  || c.lastname  || c.nom    || (items.find(x => x.last_name  || x.lastname  || x.nom) || {}).last_name  || "";
    const email = c.email || (items.find(x => x.email) || {}).email || "";
    const company = payload?.company?.name || c.company_name || c.company || (items.find(x => x.company_name || x.company) || {}).company_name || "Ulydia";
    return { first_name:String(first||"").trim(), last_name:String(last||"").trim(), email:String(email||"").trim(), company_name:String(company||"").trim() };
  }

  // =========================================================
  // Stripe detail cache + per row period
  // =========================================================
  const __DETAIL_CACHE__ = new Map();

  async function getSponsorshipDetailCached(token){
    const t = String(token || "").trim();
    if (!t) return null;
    if (__DETAIL_CACHE__.has(t)) return __DETAIL_CACHE__.get(t);
    const p = getJson("/sponsorship/detail?token=" + encodeURIComponent(t))
      .then(d => (d || null))
      .catch(() => null);
    __DETAIL_CACHE__.set(t, p);
    return p;
  }

  function extractPeriodFromDetail(detail){
    const sub = detail?.stripe?.subscription || detail?.subscription || null;
    const price = detail?.stripe?.price || detail?.price || sub?.items?.data?.[0]?.price || null;
    if (!sub) return "—";

    const startUnix = sub.current_period_start || sub.created || null;
    let endUnix = sub.current_period_end || null;

    if (!endUnix || (startUnix && endUnix <= startUnix)) {
      endUnix = addIntervalDate(
        startUnix,
        price?.recurring?.interval || price?.interval || "month",
        price?.recurring?.interval_count || price?.interval_count || 1
      );
    }

    return (startUnix && endUnix)
      ? `${fmtDateFRFromUnix(startUnix)} – ${fmtDateFRFromUnix(endUnix)}`
      : "—";
  }

  // =========================================================
  // Actions
  // =========================================================
  async function safeAction(item, kind){
    const token = String(item.manage_token || window.__ULYDIA_DASH_TOKEN__ || "").trim();
    if (!token) return;

    try{
      if (kind === "cancel"){
        await postJson("/sponsorship/stop", { token });
        location.reload();
      }
      if (kind === "resume"){
        await postJson("/sponsorship/resume", { token });
        location.reload();
      }
    }catch(e){
      console.warn("[Action] error:", e);
      alert("Action failed: " + (e?.message || "unknown error"));
    }
  }

  // =========================================================
  // Icons
  // =========================================================
  function iconSvg(name){
    const common = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    if (name === "edit") return `<svg ${common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
    if (name === "invoices") return `<svg ${common}><path d="M14 2H6a2 2 0 0 0-2 2v16l2-1 2 1 2-1 2 1 2-1 2 1V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>`;
    if (name === "trash") return `<svg ${common}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
    if (name === "play") return `<svg ${common}><path d="M8 5v14l11-7Z"/></svg>`;
    if (name === "card") return `<svg ${common}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>`;
    return "";
  }

  // =========================================================
  // UI helpers
  // =========================================================
  function findContainer(){
    return document.querySelector('[data-sponsorship-list="1"],[data-sponsorship-list]');
  }

  function computeCountryOptions(items){
    const set = new Set();
    (items || []).forEach(it => {
      const c = String(it.pays || it.country || "").trim().toUpperCase();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }

  function syncScroll(headerEl, bodyEl){
    if (!headerEl || !bodyEl) return;
    let lock = false;

    headerEl.addEventListener("scroll", () => {
      if (lock) return;
      lock = true;
      bodyEl.scrollLeft = headerEl.scrollLeft;
      lock = false;
    });

    bodyEl.addEventListener("scroll", () => {
      if (lock) return;
      lock = true;
      headerEl.scrollLeft = bodyEl.scrollLeft;
      lock = false;
    });
  }

  // =========================================================
  // Invoices modal
  // =========================================================
  function openModal({ title, content }){
    const overlay = el("div", { class:"u-overlay", style:"background:rgba(15,23,42,.45)" });
    const card = el("div", { class:"u-overlayCard", style:"width:min(980px,96vw)" });

    const top = el("div", { style:"display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--ul-border)" }, [
      el("div", { style:"font-size:14px;font-weight:900;color:var(--ul-text)" }, title || ""),
      el("button", { type:"button", class:"u-btn u-btnGhost", onclick: close, style:"padding:10px 12px" }, "Close")
    ]);

    const body = el("div", { style:"padding:16px" }, content || "");
    card.appendChild(top);
    card.appendChild(body);
    overlay.appendChild(card);

    function onClick(e){ if (e.target === overlay) close(); }
    function onKey(e){ if (e.key === "Escape") close(); }
    function close(){
      document.removeEventListener("keydown", onKey);
      overlay.removeEventListener("click", onClick);
      overlay.remove();
    }

    overlay.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);

    return { close, body };
  }

  async function openInvoices(item){
    const m = openModal({
      title: `Invoices — ${jobLabel(item)} / ${item.pays || ""}`,
      content: el("div", { style:"font-weight:800;color:rgba(0,0,0,.55)" }, "Loading invoices…")
    });

    try{
      const t = String(item.manage_token || window.__ULYDIA_DASH_TOKEN__ || "").trim();
      if (!t) throw new Error("Missing token");

      const data = await getJson("/sponsorship/invoices?token=" + encodeURIComponent(t));
      const invoices = Array.isArray(data.invoices) ? data.invoices : [];

      if (!invoices.length){
        m.body.innerHTML = "";
        m.body.appendChild(el("div", { class:"u-empty" }, "No invoices found for this sponsorship."));
        return;
      }

      const table = el("table", { style:"width:100%;border-collapse:collapse;font-family:var(--ul-font)" });
      const thead = el("thead", {}, el("tr", {}, [
        el("th", { style:"text-align:left;padding:10px 0;border-bottom:1px solid var(--ul-border);font-size:12px;color:rgba(0,0,0,.55);font-weight:900;text-transform:uppercase;letter-spacing:.08em" }, "Date"),
        el("th", { style:"text-align:left;padding:10px 0;border-bottom:1px solid var(--ul-border);font-size:12px;color:rgba(0,0,0,.55);font-weight:900;text-transform:uppercase;letter-spacing:.08em" }, "Status"),
        el("th", { style:"text-align:left;padding:10px 0;border-bottom:1px solid var(--ul-border);font-size:12px;color:rgba(0,0,0,.55);font-weight:900;text-transform:uppercase;letter-spacing:.08em" }, "Amount"),
        el("th", { style:"text-align:left;padding:10px 0;border-bottom:1px solid var(--ul-border);font-size:12px;color:rgba(0,0,0,.55);font-weight:900;text-transform:uppercase;letter-spacing:.08em" }, "Invoice")
      ]));
      table.appendChild(thead);

      const tbody = el("tbody");
      invoices.forEach(inv => {
        const created = Number(inv.created || 0);
        const dateTxt = created ? fmtDateFRFromUnix(created) : "—";
        const openPdf = inv.invoice_pdf || inv.hosted_invoice_url || "";
        const btn = openPdf
          ? el("a", { class:"u-btn u-btnPrimary", href: openPdf, target:"_blank", rel:"noopener", style:"padding:10px 12px;border-radius:12px;text-decoration:none" }, "Open PDF")
          : el("span", { style:"color:rgba(0,0,0,.55);font-weight:900" }, "—");

        tbody.appendChild(el("tr", {}, [
          el("td", { style:"padding:12px 0;border-bottom:1px solid rgba(0,0,0,.05);font-weight:800" }, dateTxt),
          el("td", { style:"padding:12px 0;border-bottom:1px solid rgba(0,0,0,.05);font-weight:800" }, String(inv.status || "—")),
          el("td", { style:"padding:12px 0;border-bottom:1px solid rgba(0,0,0,.05);font-weight:800" }, inv.amount_paid != null ? `${(Number(inv.amount_paid)/100).toFixed(2)} ${(String(inv.currency||"usd")).toUpperCase()}` : "—"),
          el("td", { style:"padding:12px 0;border-bottom:1px solid rgba(0,0,0,.05)" }, btn)
        ]));
      });
      table.appendChild(tbody);

      m.body.innerHTML = "";
      m.body.appendChild(table);

    }catch(e){
      console.warn("[Invoices] error:", e);
      m.body.innerHTML = "";
      m.body.appendChild(el("div", { class:"u-error" }, "Unable to load invoices."));
    }
  }

  // =========================================================
  // Build UI
  // =========================================================
  function buildUI(container, payload){
    injectMontserratOnce();
    injectStylesOnce();

    container.innerHTML = "";

    const allItems = Array.isArray(payload.items) ? payload.items : [];
    const contact = pickContact(payload);
    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();

    const wrap = el("div", { class:"u-wrap" }, el("div", { class:"u-card" }));
    const card = wrap.firstChild;

    // Header actions
    const topActions = el("div", { class:"u-actions" }, [
      el("a", { class:"u-btn u-btnGhost", href:"/sponsor" }, "Sponsor a new job"),
      el("button", { class:"u-btn u-btnPrimary", type:"button", onclick: (e) => { e.preventDefault(); openUsersRoles(); } }, "Manage users")
    ]);

    card.appendChild(el("div", { class:"u-top" }, [
      el("div", {}, [
        el("div", { class:"u-title" }, contact.company_name || "Ulydia"),
        el("div", { class:"u-sub" }, (fullName ? `Contact: ${fullName} — ` : "Contact: ") + (contact.email || "—"))
      ]),
      topActions
    ]));

    // Stats (NO token card)
    const totalCount = allItems.length;
    const activeCount = allItems.filter(i => ["active","trialing"].includes(String(i.status||"").toLowerCase())).length;
    const countriesCount = new Set(allItems.map(i => String(i.pays||"").toUpperCase()).filter(Boolean)).size;

    card.appendChild(el("div", { class:"u-detailGrid" }, [
      el("div", { class:"u-mini" }, [ el("div", { class:"u-miniLabel" }, "Sponsorships"), el("div", { class:"u-miniVal" }, String(totalCount)) ]),
      el("div", { class:"u-mini" }, [ el("div", { class:"u-miniLabel" }, "Active"), el("div", { class:"u-miniVal" }, String(activeCount)) ]),
      el("div", { class:"u-mini" }, [ el("div", { class:"u-miniLabel" }, "Countries"), el("div", { class:"u-miniVal" }, String(countriesCount)) ]),
      el("div", { class:"u-mini" }, [ el("div", { class:"u-miniLabel" }, "Billing"), el("div", { class:"u-miniVal" }, payload?.customer?.customer_id ? "Stripe Customer" : "—") ]),
      el("div", { class:"u-mini" }, [ el("div", { class:"u-miniLabel" }, "Account"), el("div", { class:"u-miniVal" }, contact.email || "—") ]),
    ]));

    // Filters
    const countrySelect = el("select", { class:"u-select", id:"u_country_filter" }, [
      el("option", { value:"ALL" }, "All countries"),
      ...computeCountryOptions(allItems).map(c => el("option", { value:c }, c))
    ]);

    card.appendChild(el("div", { class:"u-filterRow" }, [
      el("div", { style:"display:flex;gap:10px;flex-wrap:wrap;align-items:center" }, [
        el("span", { class:"u-pill" }, `Sponsorships: ${totalCount}`),
        el("span", { class:"u-pill" }, `Active: ${activeCount}`),
        countrySelect
      ]),
      el("div", { style:"font-size:12px;font-weight:900;color:rgba(0,0,0,.45);letter-spacing:.02em" }, "Tip: use filters to find a country faster.")
    ]));

    // Table wrapper
    const table = el("div", { class:"u-table" });
    card.appendChild(table);

    // HEADER (fixed left / scroll middle / fixed right)
    const headMidInner = el("div", { class:"u-midHeadInner" }, [
      el("div", {}, "Country"),
      el("div", {}, "Plan"),
      el("div", {}, "Status"),
      el("div", {}, "Banners"),
      el("div", {}, "Period"),
    ]);

    const head = el("div", { class:"u-headFixed" }, [
      el("div", { class:"u-headLeft" }, "Job"),
      el("div", { class:"u-midHead" }, headMidInner),
      el("div", { class:"u-headRight" }, "Actions"),
    ]);
    table.appendChild(head);

    // Body list
    const list = el("div", { id:"u_list" });
    table.appendChild(list);

    container.appendChild(wrap);

    function filteredItems(){
      const c = String(countrySelect.value || "ALL").toUpperCase();
      if (c === "ALL") return allItems.slice();
      return allItems.filter(it => String(it.pays || "").toUpperCase() === c);
    }

    function renderRows(){
      list.innerHTML = "";
      const items = filteredItems();

      if (!items.length){
        list.appendChild(el("div", { class:"u-empty" }, "No sponsorships for this filter."));
        return;
      }

      items.forEach(item => {
        const st = statusMeta(item.status);
        const token = String(item.manage_token || "").trim();

        // banners
        const bannerWide = item.sponsor_logo_2
          ? el("img", { class:"u-logoWide", src: item.sponsor_logo_2, alt:"Banner wide" })
          : el("div", { class:"u-logoPlaceholder u-logoPlaceholderWide" }, "—");

        const bannerSq = item.sponsor_logo_1
          ? el("img", { class:"u-logoSq", src: item.sponsor_logo_1, alt:"Banner square" })
          : el("div", { class:"u-logoPlaceholder u-logoPlaceholderSq" }, "—");

        const bannersCell = el("div", { class:"u-banners" }, [bannerWide, bannerSq]);

        // period cell (async fill)
        const periodId = `u_period_${token || Math.random().toString(16).slice(2)}`;
        const periodCell = el("div", { class:"u-period", id: periodId }, token ? "Loading…" : "—");

        // actions
        const manageHref = token ? ("/sponsorship?token=" + encodeURIComponent(token)) : "#";
        const btnManage = el("a", { class:"u-iconBtn icon-edit", href: manageHref, title:"Manage (logos / link)" });
        btnManage.innerHTML = iconSvg("edit");
        if (!token) btnManage.classList.add("u-disabled");

        const btnInv = el("button", { class:"u-iconBtn icon-invoice", type:"button", title:"Invoices", onclick: (e) => { e.preventDefault(); e.stopPropagation(); openInvoices(item); } });
        btnInv.innerHTML = iconSvg("invoices");

        // ✅ UPDATED: Credit card -> open billing.js modal (NO redirect)
        const btnPay = el("button", {
          class:"u-iconBtn icon-pay",
          type:"button",
          title:"Change payment method",
          onclick:(e)=>{ e.preventDefault(); e.stopPropagation(); openBillingModal(); }
        });
        btnPay.innerHTML = iconSvg("card");
        if (!token) btnPay.classList.add("u-disabled");

        const statusLower = String(item.status || "").toLowerCase();
        const isCanceled = (statusLower === "canceled" || statusLower === "cancelled");
        const isActiveish = (statusLower === "active" || statusLower === "trialing" || statusLower === "past_due");

        const btnCancel = el("button", { class:"u-iconBtn icon-stop", type:"button", title:"Stop at period end", onclick: (e) => { e.preventDefault(); e.stopPropagation(); safeAction(item, "cancel"); } });
        btnCancel.innerHTML = iconSvg("trash");
        if (!isActiveish || !token) btnCancel.classList.add("u-disabled");

        const btnResume = el("button", { class:"u-iconBtn icon-toggle", type:"button", title:"Resume subscription", onclick: (e) => { e.preventDefault(); e.stopPropagation(); safeAction(item, "resume"); } });
        btnResume.innerHTML = iconSvg("play");
        if (!isCanceled || !token) btnResume.classList.add("u-disabled");

        const right = el("div", { class:"u-right" }, [btnManage, btnInv, btnPay, btnCancel, btnResume]);

        // middle row (scroll)
        const midInner = el("div", { class:"u-midInner" }, [
          el("div", {}, item.pays || "—"),
          el("div", {}, item.plan || "—"),
          el("div", {}, el("span", { class:`u-badge ${st.cls}` }, st.text)),
          el("div", {}, bannersCell),
          el("div", {}, periodCell),
        ]);

        const mid = el("div", { class:"u-mid" }, midInner);

        const row = el("div", { class:"u-fixedRow" }, [
          el("div", { class:"u-left" }, el("div", { class:"u-metier" }, jobLabel(item))),
          mid,
          right
        ]);

        list.appendChild(row);

        // sync header scroll with this row scroll
        const headMid = card.querySelector(".u-midHead");
        syncScroll(headMid, mid);

        // fill period async
        if (token){
          getSponsorshipDetailCached(token).then(detail => {
            const cell = document.getElementById(periodId);
            if (!cell) return;
            if (!detail) { cell.textContent = "—"; return; }
            cell.textContent = extractPeriodFromDetail(detail);
          });
        }
      });
    }

    countrySelect.addEventListener("change", renderRows);
    renderRows();
  }

  // =========================================================
  // BOOT
  // =========================================================
  async function boot(){
    const container = findContainer();
    if (!container) return false;

    setPending(true);

    try{
      injectMontserratOnce();
      injectStylesOnce();

      const urlToken = String(qp("token") || "").trim();
      if (urlToken) rememberToken(urlToken);

      let token = getTokenFromURLorLS();

      // Resolve if missing / not mgt_
      if (!token || !/^mgt_/i.test(token)) {
        const sb = getSb();

        const resolved = await resolveTokenViaSupabasePatched();
        if (resolved === "__LOGIN__") {
          location.replace(LOGIN_URL + "?next=" + encodeURIComponent(DASHBOARD_PATH));
          return true;
        }
        if (resolved && /^mgt_/i.test(resolved)) {
          rememberToken(resolved);
          const u = new URL(location.href);
          u.searchParams.set("token", resolved);
          history.replaceState({}, "", u.toString());
          token = resolved;
        }

        if (!token || !/^mgt_/i.test(token)) {
          const t = await resolveTokenViaWorkerLookup(sb);
          if (t && /^mgt_/i.test(t)) {
            rememberToken(t);
            const u = new URL(location.href);
            u.searchParams.set("token", t);
            history.replaceState({}, "", u.toString());
            token = t;
          }
        }
      }

      if (!token){
        container.innerHTML = `
          <div class="u-wrap">
            <div class="u-card">
              <div class="u-top">
                <div>
                  <div class="u-title">Ulydia</div>
                  <div class="u-sub">Your account is ready.</div>
                </div>
                <div class="u-actions">
                  <a class="u-btn u-btnGhost" href="/sponsor">Sponsor a new job</a>
                  <button class="u-btn u-btnPrimary" type="button" id="u_manage_users_shell">Manage users</button>
                </div>
              </div>
              <div class="u-empty">Once you sponsor a job, it will appear here.</div>
            </div>
          </div>
        `;
        const b = document.getElementById("u_manage_users_shell");
        if (b) b.addEventListener("click", (e) => { e.preventDefault(); openUsersRoles(); });
        return true;
      }

      window.__ULYDIA_DASH_TOKEN__ = token;

      const data = await getJson("/account/sponsorships?token=" + encodeURIComponent(token));
      buildUI(container, data || {});
      return true;

    } catch(e){
      console.warn("[Ulydia boot] error:", e);
      if (container){
        injectMontserratOnce();
        injectStylesOnce();
        container.innerHTML = `
          <div class="u-wrap">
            <div class="u-card">
              <div class="u-error">Unable to load your dashboard.</div>
            </div>
          </div>
        `;
      }
      return true;
    } finally {
      setPending(false);
    }
  }

  // =========================================================
  // Start
  // =========================================================
  function start(){
    boot().then((done) => {
      if (done) return;
      const obs = new MutationObserver(() => {
        boot().then((ok) => { if (ok) obs.disconnect(); });
      });
      obs.observe(document.documentElement, { childList:true, subtree:true });
      setTimeout(() => { try{ obs.disconnect(); }catch(_){} }, 15000);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
