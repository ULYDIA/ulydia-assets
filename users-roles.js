/* users-roles.js — Ulydia (PATCHED v3.1, tokenless, single Supabase client)
   - Reuses existing global Supabase client (prevents "Multiple GoTrueClient instances")
   - Works WITHOUT dashboard token when user is authenticated (RLS-driven)
   - Always releases overlay (no more frozen page)
   - Uses RPC create_company_invite (as requested)
   - Adds hard anti-duplicate guard for invites (prevents "rafale")
   - Fixes getContext() (companyId typo, RPC param names, RPC fallback)
   - Exposes window.UlydiaUsersRoles.open() + window.UsersRoles.open() (compat)
*/
(() => {
    if (window.__ULYDIA_USERS_ROLES_V4__) return;
    window.__ULYDIA_USERS_ROLES_V4__ = true;


  const NS = "[Users&Roles]";

  // ---------- Small helpers ----------
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function log(...a){ console.log(NS, ...a); }
  function warn(...a){ console.warn(NS, ...a); }
  function err(...a){ console.error(NS, ...a); }

  // ---------- Get the SINGLE Supabase client ----------
  function getSupabase() {
    // 1) Prefer the client created by your my-account script
    if (window.__ULYDIA_SUPABASE__) return window.__ULYDIA_SUPABASE__;

    // 2) Common alternates (if you named it differently)
    if (window._ULYDIA_SUPABASE_) return window._ULYDIA_SUPABASE_;

    // 3) Last resort: create one ONLY IF config is provided
    const cfg = window.ULYDIA_USERS_ROLES_CONFIG || window.__ULYDIA_CONFIG__ || {};
    const SUPABASE_URL = cfg.SUPABASE_URL;
    const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL) throw new Error("Missing config: SUPABASE_URL (create global __ULYDIA_SUPABASE__ or set window.ULYDIA_USERS_ROLES_CONFIG.SUPABASE_URL)");
    if (!SUPABASE_ANON_KEY) throw new Error("Missing config: SUPABASE_ANON_KEY (create global __ULYDIA_SUPABASE__ or set window.ULYDIA_USERS_ROLES_CONFIG.SUPABASE_ANON_KEY)");
    if (!window.supabase?.createClient) throw new Error("Supabase JS not loaded (window.supabase.createClient missing).");

    const storageKey = cfg.STORAGE_KEY || "ulydia_auth_v1";
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

    window.__ULYDIA_SUPABASE__ = client;
    return client;
  }

  // ---------- UI (modal + overlay) ----------
  function mountStyles() {
    if (document.getElementById("u_users_roles_css")) return;
    const s = document.createElement("style");
    s.id = "u_users_roles_css";
    s.textContent = `
      .u-ur-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:999998;}
      .u-ur-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,92vw);max-height:86vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);z-index:999999;padding:24px;}
      .u-ur-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #edf0f5;padding-bottom:14px;margin-bottom:18px;}
      .u-ur-title{font-size:32px;line-height:1.1;margin:0;color:#101828;font-weight:800;}
      .u-ur-sub{margin:6px 0 0;color:#667085;font-size:15px;font-weight:600;}
      .u-ur-close{border:1px solid #e4e7ec;background:#fff;border-radius:14px;width:44px;height:44px;cursor:pointer;font-size:22px;line-height:1;}
      .u-ur-card{border:1px solid #e6ebf2;border-radius:18px;padding:18px;}
      .u-ur-row{display:flex;align-items:center;justify-content:space-between;gap:12px;}
      .u-ur-tabs{display:flex;gap:10px;}
      .u-ur-tab{border:1px solid #d0d5dd;background:#fff;border-radius:999px;padding:10px 16px;font-weight:800;cursor:pointer;color:#101828;}
      .u-ur-tab[aria-selected="true"]{background:#2563eb;border-color:#2563eb;color:#fff;}
      .u-ur-msg{margin-top:14px;border-radius:14px;padding:12px 14px;font-weight:800;}
      .u-ur-msg.err{background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;}
      .u-ur-msg.ok{background:#ecfdf3;border:1px solid #abefc6;color:#027a48;}
      .u-ur-table{width:100%;border-collapse:collapse;margin-top:12px;}
      .u-ur-table th,.u-ur-table td{border-bottom:1px solid #eef2f7;padding:10px 8px;text-align:left;font-size:14px;}
      .u-ur-table th{color:#667085;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:.04em;}
      .u-ur-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
      .u-ur-btn{border:1px solid #d0d5dd;background:#fff;border-radius:12px;padding:8px 12px;font-weight:900;cursor:pointer;}
      .u-ur-btn.primary{background:#111827;color:#fff;border-color:#111827;}
      .u-ur-btn.danger{background:#fff;border-color:#fecaca;color:#b91c1c;}
      .u-ur-input{border:1px solid #d0d5dd;border-radius:12px;padding:10px 12px;font-weight:700;width:min(420px,100%);}
      .u-ur-inline{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px;}
      .u-ur-muted{color:#667085;font-weight:700;}
    `;
    document.head.appendChild(s);
  }

  function createModal() {
    mountStyles();

    const backdrop = document.createElement("div");
    backdrop.className = "u-ur-backdrop";
    backdrop.id = "u_ur_backdrop";

    const modal = document.createElement("div");
    modal.className = "u-ur-modal";
    modal.id = "u_ur_modal";

    modal.innerHTML = `
      <div class="u-ur-head">
        <div>
          <h2 class="u-ur-title">Users & Roles</h2>
          <div class="u-ur-sub">Manage access for your company</div>
        </div>
        <button class="u-ur-close" aria-label="Close">×</button>
      </div>

      <div class="u-ur-card">
        <div class="u-ur-row">
          <div>
            <div style="font-size:22px;font-weight:900;color:#101828;">Manage</div>
            <div class="u-ur-muted" style="margin-top:4px;">Members list and invitations</div>
          </div>
          <div class="u-ur-tabs" role="tablist">
            <button class="u-ur-tab" role="tab" data-tab="members" aria-selected="true">Members</button>
            <button class="u-ur-tab" role="tab" data-tab="invites" aria-selected="false">Invites</button>
          </div>
        </div>

        <div id="u_ur_msg" class="u-ur-msg ok" style="display:none;"></div>

        <div id="u_ur_members_panel">
          <table class="u-ur-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th style="width:220px;">Actions</th></tr>
            </thead>
            <tbody id="u_ur_members_tbody"></tbody>
          </table>
        </div>

        <div id="u_ur_invites_panel" style="display:none;">
          <div class="u-ur-inline">
            <input id="u_ur_invite_email" class="u-ur-input" placeholder="email@domain.com" />
            <select id="u_ur_invite_role" class="u-ur-input" style="width:180px;">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button id="u_ur_invite_btn" class="u-ur-btn primary">Send invite</button>
          </div>

          <table class="u-ur-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Status</th><th style="width:220px;">Actions</th></tr>
            </thead>
            <tbody id="u_ur_invites_tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    const close = () => {
      try { backdrop.remove(); } catch {}
      try { modal.remove(); } catch {}
      document.documentElement.style.overflow = "";
    };

    qs(".u-ur-close", modal).addEventListener("click", close);
    backdrop.addEventListener("click", close);

    // ESC
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey, { once: true });

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    document.documentElement.style.overflow = "hidden";

    return { modal, close };
  }

  function setMsg(type, text) {
    const box = qs("#u_ur_msg");
    if (!box) return;
    box.style.display = text ? "block" : "none";
    box.className = "u-ur-msg " + (type === "err" ? "err" : "ok");
    box.textContent = text || "";
  }

  function setTab(modal, tab) {
    const tabs = qsa(".u-ur-tab", modal);
    tabs.forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    qs("#u_ur_members_panel", modal).style.display = tab === "members" ? "block" : "none";
    qs("#u_ur_invites_panel", modal).style.display  = tab === "invites" ? "block" : "none";
  }

  // ---------- Data layer (RLS-first, tokenless) ----------
async function rpcMyCompanyIds(sb, user) {
  // 1) Try RPCs (if exposed in PostgREST)
  let lastErr = null;
  for (const fn of ["my_company_ids_arr", "my_company_ids"]) {
    try {
      const { data, error } = await sb.rpc(fn);
      if (error) throw error;

      if (Array.isArray(data)) return data.filter(Boolean);
      if (data == null) return [];
      return [data];
    } catch (e) {
      lastErr = e;
    }
  }

  // 2) ✅ Fallback (NO RPC): read from company_members (RLS-driven)
  // Requires a SELECT policy on company_members allowing user to see their own rows.
  try {
    const { data, error } = await sb
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    const ids = (data || []).map(r => r.company_id).filter(Boolean);
    // unique
    return Array.from(new Set(ids));
  } catch (e2) {
    // Keep the original RPC error as context if useful
    throw lastErr || e2;
  }
}

async function getMyCompanyRows(sb, userId) {
  const { data, error } = await sb
    .from("company_members")
    .select("company_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function rpcIsCompanyAdmin(sb, company_id) {
  // Optionnel : si tu as la RPC exposée, on l’utilise.
  // Sinon, on retourne null (et on ne bloque jamais)
  try {
    // IMPORTANT: ton paramètre côté SQL doit être p_company_id (pas cid)
    const { data, error } = await sb.rpc("is_company_admin", { p_company_id: company_id });
    if (error) throw error;
    return !!data;
  } catch (e) {
    return null;
  }
}




async function getContext(sb) {
  const { data: { user }, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!user) return { user: null, company_id: null, is_admin: false, my_companies: [] };

  // ✅ Source of truth: company_members
  const rows = await getMyCompanyRows(sb, user.id);

  const my_companies = rows.map(r => r.company_id).filter(Boolean);
  const company_id = my_companies[0] || null;

  // ✅ Admin simple & robuste (sans RPC) : rôle dans company_members
  const myRole = rows.find(r => String(r.company_id) === String(company_id))?.role || null;
  let is_admin = (myRole === "admin");

  // (optionnel) si RPC dispo, elle peut confirmer (sans casser si absente)
  if (company_id) {
    const rpcVal = await rpcIsCompanyAdmin(sb, company_id);
    if (rpcVal !== null) is_admin = rpcVal;
  }

  return { user, company_id, is_admin, my_companies };
}


  async function loadMembers(sb, company_id) {
    const { data, error } = await sb
      .from("company_members")
      .select("user_id, user_email, role, created_at")
      .eq("company_id", company_id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function loadInvites(sb, company_id) {
    const { data, error } = await sb
      .from("company_invites")
      .select("id, email, role, status, created_at")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function upsertMemberRole(sb, company_id, user_id, role, user_email) {
    const payload = { company_id, user_id, role };
    if (user_email) payload.user_email = user_email;

    const { error } = await sb
      .from("company_members")
      .upsert(payload, { onConflict: "company_id,user_id" });

    if (error) throw error;
  }

  async function removeMember(sb, company_id, user_id) {
    const { error } = await sb
      .from("company_members")
      .delete()
      .eq("company_id", company_id)
      .eq("user_id", user_id);

    if (error) throw error;
  }

  // ✅ Uses RPC create_company_invite (as requested)
  async function createInviteRPC(sb, company_id, email, role) {
    const p_email = String(email || "").trim().toLowerCase();
    const p_role = String(role || "member").trim();
    const p_company_id = company_id;

    const { data, error } = await sb.rpc("create_company_invite", { p_email, p_role, p_company_id });
    if (error) throw error;

    // data may be token/uuid or null depending on your function
    return data;
  }

  async function cancelInvite(sb, invite_id) {
    const { error } = await sb
      .from("company_invites")
      .delete()
      .eq("id", invite_id);

    if (error) throw error;
  }

  // ---------- Render ----------
  function renderMembers(modal, ctx, members) {
    const tb = qs("#u_ur_members_tbody", modal);
    tb.innerHTML = "";

    const me = ctx.user?.id;

    members.forEach((m) => {
      const tr = document.createElement("tr");
      const email = m.user_email || "(no email)";
      tr.innerHTML = `
        <td>${escapeHtml(email)}</td>
        <td>${escapeHtml(m.role || "")}</td>
        <td>
          <div class="u-ur-actions">
            <button class="u-ur-btn" data-act="make_member">member</button>
            <button class="u-ur-btn" data-act="make_admin">admin</button>
            <button class="u-ur-btn danger" data-act="remove">remove</button>
          </div>
        </td>
      `;

      const canEdit = ctx.is_admin;
      qsa("button", tr).forEach((b) => { if (!canEdit) b.disabled = true; });

      // You can’t remove yourself
      if (String(m.user_id) === String(me)) {
        const btnRemove = qs('button[data-act="remove"]', tr);
        if (btnRemove) btnRemove.disabled = true;
      }

      tr.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        if (!ctx.is_admin) return;

        // ✅ stop bubbling to avoid weird double-trigger in some layouts
        e.preventDefault();
        e.stopPropagation();

        // ✅ anti double click on action buttons
        if (btn.dataset.loading === "1") return;
        btn.dataset.loading = "1";

        const act = btn.dataset.act;

        try {
          setMsg("ok", "");
          btn.disabled = true;

          if (act === "make_member") {
            await window.UlydiaUsersRoles._api.upsertMemberRole(m.user_id, "member", m.user_email);
            setMsg("ok", `Role updated: ${email} → member`);
          } else if (act === "make_admin") {
            await window.UlydiaUsersRoles._api.upsertMemberRole(m.user_id, "admin", m.user_email);
            setMsg("ok", `Role updated: ${email} → admin`);
          } else if (act === "remove") {
            await window.UlydiaUsersRoles._api.removeMember(m.user_id);
            setMsg("ok", `Removed: ${email}`);
          }

          await window.UlydiaUsersRoles.refresh();
        } catch (ex) {
          err(ex);
          setMsg("err", ex?.message || String(ex));
        } finally {
          btn.dataset.loading = "0";
          btn.disabled = false;
        }
      });

      tb.appendChild(tr);
    });

    if (!members.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="3" class="u-ur-muted">No members found.</td>`;
      tb.appendChild(tr);
    }
  }

  function renderInvites(modal, ctx, invites) {
    const tb = qs("#u_ur_invites_tbody", modal);
    tb.innerHTML = "";

    invites.forEach((inv) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(inv.email || "")}</td>
        <td>${escapeHtml(inv.role || "")}</td>
        <td>${escapeHtml(inv.status || "")}</td>
        <td>
          <div class="u-ur-actions">
            <button class="u-ur-btn danger" data-act="cancel">cancel</button>
          </div>
        </td>
      `;

      const canEdit = ctx.is_admin;
      qsa("button", tr).forEach((b) => { if (!canEdit) b.disabled = true; });

      tr.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        if (!ctx.is_admin) return;

        e.preventDefault();
        e.stopPropagation();

        if (btn.dataset.loading === "1") return;
        btn.dataset.loading = "1";

        try {
          setMsg("ok", "");
          btn.disabled = true;
          await window.UlydiaUsersRoles._api.cancelInvite(inv.id);
          setMsg("ok", `Invite cancelled: ${inv.email}`);
          await window.UlydiaUsersRoles.refresh();
        } catch (ex) {
          err(ex);
          setMsg("err", ex?.message || String(ex));
        } finally {
          btn.dataset.loading = "0";
          btn.disabled = false;
        }
      });

      tb.appendChild(tr);
    });

    if (!invites.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" class="u-ur-muted">No invites found.</td>`;
      tb.appendChild(tr);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Main open() ----------
  async function open() {
    const { modal, close } = createModal();

    qsa(".u-ur-tab", modal).forEach((b) => {
      b.addEventListener("click", () => setTab(modal, b.dataset.tab));
    });

    try {
      const sb = getSupabase();

      // Load ctx (tokenless, auth-based)
      const ctx = await getContext(sb);
      window.UlydiaUsersRoles._sb = sb;
      window.UlydiaUsersRoles._ctx = ctx;
      window.UlydiaUsersRoles._modal = modal;

      // Store api bindings for render handlers
      window.UlydiaUsersRoles._api = {
        upsertMemberRole: (user_id, role, user_email) =>
          upsertMemberRole(sb, window.UlydiaUsersRoles._ctx.company_id, user_id, role, user_email),
        removeMember: (user_id) =>
          removeMember(sb, window.UlydiaUsersRoles._ctx.company_id, user_id),
        cancelInvite: (invite_id) =>
          cancelInvite(sb, invite_id),

        // ✅ expose createInvite too (debug)
        createInvite: (email, role) =>
          createInviteRPC(sb, window.UlydiaUsersRoles._ctx.company_id, email, role),
      };

      // ✅ HARD GUARD (anti “rafale”) at API level
      if (!window.UlydiaUsersRoles._api.__inviteGuardPatched) {
        window.UlydiaUsersRoles._api.__inviteGuardPatched = true;

        const original = window.UlydiaUsersRoles._api.createInvite.bind(window.UlydiaUsersRoles._api);
        let inFlightKey = null;

        window.UlydiaUsersRoles._api.createInvite = async (email, role) => {
          const e = String(email || "").trim().toLowerCase();
          const r = String(role || "").trim();
          const key = `${e}|${r}`;

          if (inFlightKey === key) return null; // ignore duplicate in-flight
          inFlightKey = key;
          try {
            return await original(e, r);
          } finally {
            inFlightKey = null;
          }
        };
      }

      if (!ctx.user) {
        setMsg("err", "You must be logged in to manage users.");
        return;
      }

      if (!ctx.company_id) {
        setMsg("err", "No company linked to this account (company_members empty).");
        return;
      }

      if (!ctx.is_admin) {
        setMsg("ok", "You are a member (read-only). Ask an admin to change roles.");
      } else {
        setMsg("ok", "Admin access confirmed.");
      }

      // Invite button
      const inviteBtn = qs("#u_ur_invite_btn", modal);

      // ✅ bind once per modal instance
      if (!inviteBtn.dataset.bound) {
        inviteBtn.dataset.bound = "1";

        inviteBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (!ctx.is_admin) return;

          // ✅ anti double click
          if (inviteBtn.dataset.loading === "1") return;
          inviteBtn.dataset.loading = "1";

          const email = (qs("#u_ur_invite_email", modal).value || "").trim().toLowerCase();
          const role  = (qs("#u_ur_invite_role", modal).value || "member").trim();

          if (!email) {
            inviteBtn.dataset.loading = "0";
            return setMsg("err", "Please enter an email.");
          }

          try {
            inviteBtn.disabled = true;
            setMsg("ok", "");

            const result = await window.UlydiaUsersRoles._api.createInvite(email, role);

            // result may be token/uuid or null depending on your RPC
            setMsg("ok", `Invite sent to ${email} (${role}).`);
            qs("#u_ur_invite_email", modal).value = "";

            await window.UlydiaUsersRoles.refresh();
          } catch (ex) {
            err(ex);

            // Friendly duplicate message
            const msg = ex?.message || String(ex);
            if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists")) {
              setMsg("err", `Invite already exists for ${email}.`);
            } else {
              setMsg("err", msg);
            }
          } finally {
            inviteBtn.dataset.loading = "0";
            inviteBtn.disabled = false;
          }
        });
      }

      // Initial load
      await window.UlydiaUsersRoles.refresh();

    } catch (ex) {
      err(ex);
      setMsg("err", ex?.message || String(ex));
      // keep modal open so user can close manually
    }

    return { close };
  }

  async function refresh() {
    const sb = window.UlydiaUsersRoles._sb;
    const ctx = window.UlydiaUsersRoles._ctx;
    const modal = window.UlydiaUsersRoles._modal;
    if (!sb || !ctx || !modal) return;

    try {
      const [members, invites] = await Promise.all([
        ctx.company_id ? loadMembers(sb, ctx.company_id) : Promise.resolve([]),
        ctx.company_id ? loadInvites(sb, ctx.company_id) : Promise.resolve([]),
      ]);

      renderMembers(modal, ctx, members);
      renderInvites(modal, ctx, invites);
    } catch (ex) {
      err(ex);
      setMsg("err", ex?.message || String(ex));
    }
  }

  // ---------- Public API ----------
  const api = {
    open,
    refresh,
    _sb: null,
    _ctx: null,
    _modal: null,
    _api: null,
  };

  window.UlydiaUsersRoles = api;
  window.UsersRoles = api;

  log("loaded (v3.1). Call UlydiaUsersRoles.open()");
})();
