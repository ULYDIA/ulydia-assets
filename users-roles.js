/* users-roles.js — Ulydia Users & Roles (v1)
   Usage: window.UlydiaUsersRoles.open({ supabase, token })
*/
(function () {
  if (window.UlydiaUsersRoles?.open) return;

  const UI = {
    overlayId: "u_ur_overlay",
    styleId: "u_ur_style",
  };

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

  function injectStylesOnce() {
    if (document.getElementById(UI.styleId)) return;
    const css = `
      #${UI.overlayId}{position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px}
      #${UI.overlayId} .card{width:min(1180px,96vw);background:#fff;border:1px solid #e5e7eb;border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.25);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
      #${UI.overlayId} .top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 18px;border-bottom:1px solid #eef2f7}
      #${UI.overlayId} .title{font-size:28px;font-weight:900;letter-spacing:-.02em}
      #${UI.overlayId} .xbtn{width:44px;height:44px;border-radius:14px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
      #${UI.overlayId} .xbtn:hover{background:#f8fafc}
      #${UI.overlayId} .body{padding:18px}
      #${UI.overlayId} .grid{display:grid;grid-template-columns:1fr;gap:14px}
      #${UI.overlayId} .panel{border:1px solid #e5e7eb;border-radius:18px;background:#fff;overflow:hidden}
      #${UI.overlayId} .panel .ph{padding:14px 16px;border-bottom:1px solid #eef2f7;font-weight:900;font-size:18px}
      #${UI.overlayId} .panel .pc{padding:14px 16px}
      #${UI.overlayId} .muted{opacity:.75}
      #${UI.overlayId} .row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #${UI.overlayId} .tabs{display:flex;gap:10px;flex-wrap:wrap}
      #${UI.overlayId} .tab{padding:10px 12px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;font-weight:900;cursor:pointer}
      #${UI.overlayId} .tab[data-active="1"]{background:#2563eb;border-color:#2563eb;color:#fff}
      #${UI.overlayId} .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border-radius:12px;border:1px solid transparent;font-weight:900;cursor:pointer;background:#2563eb;color:#fff}
      #${UI.overlayId} .btnGhost{background:#fff;color:#0f172a;border-color:#e5e7eb}
      #${UI.overlayId} .btnDanger{background:#fff;color:#991b1b;border-color:#fecaca}
      #${UI.overlayId} input, #${UI.overlayId} select{height:44px;border-radius:12px;border:1px solid #e5e7eb;padding:0 12px;font-weight:800;outline:none}
      #${UI.overlayId} input:focus, #${UI.overlayId} select:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
      #${UI.overlayId} table{width:100%;border-collapse:collapse}
      #${UI.overlayId} th{font-size:12px;text-transform:uppercase;letter-spacing:.02em;opacity:.7;text-align:left;padding:12px 0;border-bottom:1px solid #eef2f7}
      #${UI.overlayId} td{padding:14px 0;border-bottom:1px solid #f1f5f9;vertical-align:middle}
      #${UI.overlayId} .pill{display:inline-flex;padding:6px 10px;border-radius:999px;border:1px solid #e5e7eb;font-weight:900;font-size:12px}
      #${UI.overlayId} .err{padding:12px 14px;border-radius:14px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-weight:900}
      #${UI.overlayId} .ok{padding:12px 14px;border-radius:14px;background:#ecfdf5;border:1px solid #bbf7d0;color:#065f46;font-weight:900}
      @media (min-width: 980px){ #${UI.overlayId} .grid{grid-template-columns:1.1fr .9fr} }
    `;
    const st = document.createElement("style");
    st.id = UI.styleId;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function iconX() {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
      </svg>`;
  }

  function normEmail(s){ return String(s||"").trim().toLowerCase(); }

  async function safeSession(sb){
    try{
      const { data, error } = await sb.auth.getSession();
      if (error) return { session:null, error };
      return { session:data?.session || null, error:null };
    } catch(e){
      return { session:null, error:e };
    }
  }

  async function getCompanyByToken(sb, token){
    const t = String(token||"").trim();
    if (!t) throw new Error("Missing token");
    const res = await sb
      .from("companies")
      .select("id,name,slug,manage_token,created_at")
      .eq("manage_token", t)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data?.id) throw new Error("Company not found for token");
    return res.data;
  }

  async function listMembers(sb, companyId){
    // Try to pick email if you have it; fallback on user_id.
    // Recommended column: company_members.user_email
    const res = await sb
      .from("company_members")
      .select("id,user_id,user_email,role,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (res.error) throw res.error;
    return Array.isArray(res

