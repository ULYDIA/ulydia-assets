/* users-roles.js — Ulydia (V4.4)
   - Tokenless + RLS
   - RPC create_company_invite
   - RPC resend_company_invite (resend/renew)
   - ✅ Resend cooldown with LIVE countdown (60s)
   - ✅ Copy invite link
   - ✅ Expiration (7 days) -> shows "expired" + renew
*/
(() => {
  if (window.__ULYDIA_USERS_ROLES_V44__) return;
  window.__ULYDIA_USERS_ROLES_V44__ = true;

  const NS = "[Users&Roles]";

  // =========================
  // CONFIG
  // =========================
  const INVITE_EXPIRE_DAYS = 7;
  const RESEND_COOLDOWN_SECONDS = 60;
  const INVITE_LINK_BASE = "https://www.ulydia.com/login";

  // ---------- Small helpers ----------
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const log = (...a) => console.log(NS, ...a);
  const err = (...a) => console.error(NS, ...a);

  function nowMs(){ return Date.now(); }
  function toMs(d){
    const t = Date.parse(String(d || ""));
    return Number.isFinite(t) ? t : NaN;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  async function copyToClipboard(text){
    const t = String(text || "");
    if (!t) throw new Error("Nothing to copy.");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("Copy failed.");
    return true;
  }

  function buildInviteUrl(token){
    const tok = String(token || "").trim();
    if (!tok) return "";
    const u = new URL(INVITE_LINK_BASE);
    u.searchParams.set("invite", tok);
    return u.toString();
  }

  function computeExpiryMs(inv){
    const exp = toMs(inv?.expires_at);
    if (Number.isFinite(exp)) return exp;

    const created = toMs(inv?.created_at);
    if (!Number.isFinite(created)) return NaN;
    return created + INVITE_EXPIRE_DAYS * 24 * 3600 * 1000;
  }

  function isExpired(inv){
    const expMs = computeExpiryMs(inv);
    if (!Number.isFinite(expMs)) return false;
    return nowMs() > expMs;
  }

  function cooldownLeftSeconds(inv){
    const lastSentMs = toMs(inv?.last_sent_at);
    if (!Number.isFinite(lastSentMs)) return 0;
    const elapsed = (nowMs() - lastSentMs) / 1000;
    const left = RESEND_COOLDOWN_SECONDS - elapsed;
    return left > 0 ? Math.ceil(left) : 0;
  }

  // ---------- Supabase client ----------
  function getSupabaseFrom(opts){
    if (opts?.supabase) return opts.supabase;

    if (window.__ULYDIA_SUPABASE__) return window.__ULYDIA_SUPABASE__;
    if (window._ULYDIA_SUPABASE_) return window._ULYDIA_SUPABASE_;

    const cfg = window.ULYDIA_USERS_ROLES_CONFIG || window.__ULYDIA_CONFIG__ || {};
    const SUPABASE_URL = cfg.SUPABASE_URL;
    const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase client missing. Provide opts.supabase or set global __ULYDIA_SUPABASE__.");
    if (!window.supabase?.createClient) throw new Error("Supabase JS not loaded (window.supabase.createClient missing).");

    const storageKey = cfg.STORAGE_KEY || "ulydia_auth_v1";
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

    window.__ULYDIA_SUPABASE__ = client;
    return client;
  }

  // ---------- UI Styles ----------
  function mountStyles() {
    if (document.getElementById("u_users_roles_css")) return;
    const s = document.createElement("style");
    s.id = "u_users_roles_css";
    s.textContent = `
:root{
  --ul-font: 'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Arial;
  --ul-red: #c00102;
  --ul-red-focus: rgba(192,1,2,.12);
  --ul-text: rgba(0,0,0,.88);
  --ul-border: rgba(0,0,0,.12);
  --ul-border-2: rgba(0,0,0,.18);
  --ul-bg: #fff;
  --ul-card-shadow: 0 10px 30px rgba(0,0,0,.08);
  --ul-radius-md: 12px;
}
.u-ur-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:999998; }
.u-ur-modal{
  position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);
  width:min(1120px,94vw); max-height:86vh; overflow:auto;
  background:var(--ul-bg); border:1px solid var(--ul-border); border-radius:24px;
  box-shadow:var(--ul-card-shadow); z-index:999999; padding:24px;
  font-family:var(--ul-font); color:var(--ul-text);
}
.u-ur-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding-bottom:14px; margin-bottom:18px; border-bottom:1px solid var(--ul-border); }
.u-ur-title{ margin:0; font-size:22px; font-weight:900; letter-spacing:-0.02em; }
.u-ur-sub{ margin:6px 0 0; font-size:13px; font-weight:700; color:var(--ul-red); }
.u-ur-close{ border:1px solid var(--ul-border-2); background:#fff; border-radius:14px; width:44px; height:44px; cursor:pointer; font-size:20px; font-weight:900; }
.u-ur-close:hover{ border-color:rgba(0,0,0,.35); }

.u-ur-card{ border:1px solid var(--ul-border); border-radius:20px; background:#fff; padding:18px; }
.u-ur-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.u-ur-h2{ font-size:18px; font-weight:900; margin:0; }
.u-ur-muted{ margin-top:4px; color:rgba(0,0,0,.55); font-size:13px; font-weight:700; }

.u-ur-tabs{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.u-ur-tab{
  border:1px solid var(--ul-border-2); background:#fff; border-radius:999px;
  padding:10px 16px; font-weight:900; font-size:14px; cursor:pointer;
  font-family:var(--ul-font); color:var(--ul-text);
}
.u-ur-tab[aria-selected="true"]{
  background:var(--ul-red); border-color:var(--ul-red); color:#fff;
  box-shadow:0 0 0 4px var(--ul-red-focus);
}

.u-ur-msg{
  margin-top:14px; border-radius:16px; padding:12px 14px; font-weight:800;
  border:1px solid var(--ul-border); background:rgba(0,0,0,.02); font-size:14px;
}
.u-ur-msg.err{ background:rgba(215,25,25,.08); border:1px solid rgba(215,25,25,.18); color:#a10f0f; }
.u-ur-msg.ok{ background:rgba(18,161,80,.10); border:1px solid rgba(18,161,80,.25); color:#0b6b37; }

.u-ur-table{ width:100%; border-collapse:collapse; margin-top:12px; }
.u-ur-table th, .u-ur-table td{
  border-bottom:1px solid rgba(0,0,0,.08); padding:12px 8px; text-align:left;
  font-size:14px; font-weight:600; vertical-align:middle;
}
.u-ur-table th{ font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.02em; color:rgba(0,0,0,.55); }

.u-ur-actions{ display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
.u-ur-btn{
  border:1px solid var(--ul-border-2); background:#fff; border-radius:var(--ul-radius-md);
  padding:10px 12px; font-weight:700; font-size:14px; cursor:pointer;
  font-family:var(--ul-font); color:var(--ul-text);
}
.u-ur-btn:hover{ border-color:rgba(0,0,0,.35); }
.u-ur-btn:disabled{ opacity:.55; cursor:not-allowed; }
.u-ur-btn.primary{ background:var(--ul-red); border-color:var(--ul-red); color:#fff; }
.u-ur-btn.danger{ background:#fff; border-color:rgba(215,25,25,.25); color:#b91c1c; }
.u-ur-btn.danger:hover{ border-color:rgba(215,25,25,.45); }

.u-ur-input{
  border:1px solid var(--ul-border-2); border-radius:var(--ul-radius-md); padding:12px 12px;
  font-weight:600; font-size:14px; width:min(420px,100%); font-family:var(--ul-font);
  color:var(--ul-text); outline:none; background:#fff;
}
.u-ur-input:focus{ border-color:rgba(192,1,2,.6); box-shadow:0 0 0 4px var(--ul-red-focus); }
.u-ur-inline{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:12px; }

.u-ur-pill{
  display:inline-block; font-size:12px; font-weight:800; padding:6px 10px; border-radius:999px;
  border:1px solid rgba(0,0,0,.12); background:rgba(0,0,0,.03); color:rgba(0,0,0,.75);
}
.u-ur-pill.expired{ border-color:rgba(215,25,25,.22); background:rgba(215,25,25,.08); color:#a10f0f; }

@media (max-width: 720px){
  .u-ur-modal{ padding:16px; width:min(96vw,1120px); }
  .u-ur-title{ font-size:20px; }
}
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
            <div class="u-ur-h2">Manage</div>
            <div class="u-ur-muted">Members list and invitations</div>
          </div>
          <div class="u-ur-tabs" role="tablist">
            <button class="u-ur-tab" role="tab" data-tab="members" aria-selected="true">Members</button>
            <button class="u-ur-tab" role="tab" data-tab="invites" aria-selected="false">Invites</button>
          </div>
        </div>

        <div id="u_ur_msg" class="u-ur-msg ok" style="display:none;"></div>

        <div id="u_ur_members_panel">
          <table class="u-ur-table">
            <thead><tr><th>Email</th><th>Role</th><th style="width:260px;">Actions</th></tr></thead>
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
            <thead><tr><th>Email</th><th>Role</th><th>Status</th><th style="width:360px;">Actions</th></tr></thead>
            <tbody id="u_ur_invites_tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    const close = () => {
      try { backdrop.remove(); } catch {}
      try { modal.remove(); } catch {}
      document.documentElement.style.overflow = "";
      try { window.UlydiaUsersRoles?.stopTick?.(); } catch {}
    };

    qs(".u-ur-close", modal).addEventListener("click", close);
    backdrop.addEventListener("click", close);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); }, { once: true });

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
    qsa(".u-ur-tab", modal).forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    qs("#u_ur_members_panel", modal).style.display = tab === "members" ? "block" : "none";
    qs("#u_ur_invites_panel", modal).style.display  = tab === "invites" ? "block" : "none";
  }

  // ---------- Data (RLS-first) ----------
  async function getContext(sb) {
    const { data: userRes, error: userErr } = await sb.auth.getUser();
    if (userErr) throw userErr;
    const user = userRes?.user;
    if (!user) return { user:null, company_id:null, is_admin:false };

    const { data: rows, error } = await sb
      .from("company_members")
      .select("company_id, role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const company_id = rows?.[0]?.company_id || null;
    const myRole = rows?.find(r => String(r.company_id) === String(company_id))?.role || null;
    const is_admin = (myRole === "admin");

    return { user, company_id, is_admin };
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
      .select("id, email, role, status, token, created_at, expires_at, last_sent_at, sent_count")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function upsertMemberRole(sb, company_id, user_id, role, user_email) {
    const payload = { company_id, user_id, role };
    if (user_email) payload.user_email = user_email;
    const { error } = await sb.from("company_members").upsert(payload, { onConflict: "company_id,user_id" });
    if (error) throw error;
  }

  async function removeMember(sb, company_id, user_id) {
    const { error } = await sb.from("company_members").delete().eq("company_id", company_id).eq("user_id", user_id);
    if (error) throw error;
  }

  async function createInviteRPC(sb, company_id, email, role) {
    const p_email = String(email || "").trim().toLowerCase();
    const p_role = String(role || "member").trim();
    const p_company_id = company_id;
    const { data, error } = await sb.rpc("create_company_invite", { p_email, p_role, p_company_id });
    if (error) throw error;
    return data;
  }

  async function resendInviteRPC(sb, invite_id) {
    const p_invite_id = invite_id;
    const { data, error } = await sb.rpc("resend_company_invite", { p_invite_id });
    if (error) throw error;
    return data;
  }

  async function cancelInvite(sb, invite_id) {
    const { error } = await sb.from("company_invites").delete().eq("id", invite_id);
    if (error) throw error;
  }

  // ---------- Render ----------
  function renderMembers(modal, ctx, members) {
    const tb = qs("#u_ur_members_tbody", modal);
    tb.innerHTML = "";

    const me = ctx.user?.id;

    if (!members.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="3" class="u-ur-muted">No members found.</td>`;
      tb.appendChild(tr);
      return;
    }

    members.forEach((m) => {
      const email = m.user_email || "(no email)";
      const tr = document.createElement("tr");
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

      const canEdit = !!ctx.is_admin;
      qsa("button", tr).forEach(b => { if (!canEdit) b.disabled = true; });

      if (String(m.user_id) === String(me)) {
        const btnRemove = qs('button[data-act="remove"]', tr);
        if (btnRemove) btnRemove.disabled = true;
      }

      tr.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        if (!ctx.is_admin) return;

        e.preventDefault(); e.stopPropagation();
        if (btn.dataset.loading === "1") return;
        btn.dataset.loading = "1";

        try {
          setMsg("ok", "");
          btn.disabled = true;

          const act = btn.dataset.act;
          if (act === "make_member") {
            await api._api.upsertMemberRole(m.user_id, "member", m.user_email);
            setMsg("ok", `Role updated: ${email} → member`);
          } else if (act === "make_admin") {
            await api._api.upsertMemberRole(m.user_id, "admin", m.user_email);
            setMsg("ok", `Role updated: ${email} → admin`);
          } else if (act === "remove") {
            await api._api.removeMember(m.user_id);
            setMsg("ok", `Removed: ${email}`);
          }

          await api.refresh();
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
  }

  function renderInvites(modal, ctx, invites) {
    const tb = qs("#u_ur_invites_tbody", modal);
    tb.innerHTML = "";

    if (!invites.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" class="u-ur-muted">No invites found.</td>`;
      tb.appendChild(tr);
      return;
    }

    invites.forEach((inv) => {
      const expired = isExpired(inv);
      const left = cooldownLeftSeconds(inv);
      const hasToken = !!String(inv.token || "").trim();

      const statusLabel = expired
        ? `<span class="u-ur-pill expired">expired</span>`
        : `<span class="u-ur-pill">${escapeHtml(inv.status || "pending")}</span>`;

      const resendLabel = expired ? "renew" : (left > 0 ? `resend (${left}s)` : "resend");

      const canCopy = (!expired && hasToken);
      const canResend = (left === 0);

      const tr = document.createElement("tr");
      tr.setAttribute("data-invite-id", inv.id);

      tr.innerHTML = `
        <td>${escapeHtml(inv.email || "")}</td>
        <td>${escapeHtml(inv.role || "")}</td>
        <td>${statusLabel}</td>
        <td>
          <div class="u-ur-actions">
            <button class="u-ur-btn" data-act="copy" ${canCopy ? "" : "disabled"}>copy link</button>
            <button class="u-ur-btn" data-act="resend" ${canResend ? "" : "disabled"}>${escapeHtml(resendLabel)}</button>
            <button class="u-ur-btn danger" data-act="cancel">cancel</button>
          </div>
        </td>
      `;

      qsa("button", tr).forEach(b => { if (!ctx.is_admin) b.disabled = true; });

      tr.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        if (!ctx.is_admin) return;

        e.preventDefault(); e.stopPropagation();
        if (btn.dataset.loading === "1") return;
        btn.dataset.loading = "1";

        try {
          setMsg("ok", "");
          btn.disabled = true;

          const act = btn.dataset.act;

          if (act === "cancel") {
            await api._api.cancelInvite(inv.id);
            setMsg("ok", `Invite cancelled: ${inv.email}`);
            await api.refresh();
            return;
          }

          if (act === "copy") {
            const link = buildInviteUrl(inv.token);
            if (!link) throw new Error("Invite link not available (missing token).");
            await copyToClipboard(link);
            setMsg("ok", "Invite link copied to clipboard.");
            return;
          }

          if (act === "resend") {
            const l = cooldownLeftSeconds(inv);
            if (l > 0) {
              setMsg("err", `Please wait ${l}s before resending.`);
              return;
            }

            const res = await api._api.resendInvite(inv.id);
            setMsg("ok", expired ? `Invitation renewed for ${inv.email}.` : `Invitation resent to ${inv.email}.`);

            await api.refresh();

            // optional: if backend returns token, refresh UI cache faster
            if (res?.token) {
              // noop; refresh already done
            }
            return;
          }
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
  }

  // ---------- Public API ----------
  const api = {
    _sb: null,
    _ctx: null,
    _modal: null,
    _api: null,

    // ✅ cache for LIVE countdown
    _invitesCache: [],
    _tick: null,

    startTick(){
      if (api._tick) clearInterval(api._tick);

      api._tick = setInterval(() => {
        if (!api._modal || !document.body.contains(api._modal)) {
          api.stopTick();
          return;
        }

        const tbody = qs("#u_ur_invites_tbody", api._modal);
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll("tr[data-invite-id]"));
        for (const tr of rows) {
          const inviteId = tr.getAttribute("data-invite-id");
          if (!inviteId) continue;

          const inv = (api._invitesCache || []).find(x => String(x.id) === String(inviteId));
          if (!inv) continue;

          const btn = tr.querySelector('button[data-act="resend"]');
          if (!btn) continue;

          const expired = isExpired(inv);
          const left = cooldownLeftSeconds(inv);

          btn.textContent = expired ? "renew" : (left > 0 ? `resend (${left}s)` : "resend");
          btn.disabled = (!!(left > 0)) || !api._ctx?.is_admin;
        }
      }, 1000);
    },

    stopTick(){
      if (api._tick) clearInterval(api._tick);
      api._tick = null;
    },

    async open(opts = {}) {
      const { modal } = createModal();

      qsa(".u-ur-tab", modal).forEach((b) => {
        b.addEventListener("click", () => setTab(modal, b.dataset.tab));
      });

      try {
        const sb = getSupabaseFrom(opts);
        api._sb = sb;
        api._modal = modal;

        const ctx = await getContext(sb);
        api._ctx = ctx;

        api._api = {
          upsertMemberRole: (user_id, role, user_email) => upsertMemberRole(sb, api._ctx.company_id, user_id, role, user_email),
          removeMember: (user_id) => removeMember(sb, api._ctx.company_id, user_id),
          cancelInvite: (invite_id) => cancelInvite(sb, invite_id),
          createInvite: (email, role) => createInviteRPC(sb, api._ctx.company_id, email, role),
          resendInvite: (invite_id) => resendInviteRPC(sb, invite_id),
        };

        if (!ctx.user) { setMsg("err", "You must be logged in to manage users."); return; }
        if (!ctx.company_id) { setMsg("err", "No company linked to this account (company_members empty)."); return; }

        setMsg("ok", ctx.is_admin ? "Admin access confirmed." : "You are a member (read-only). Ask an admin to change roles.");

        const inviteBtn  = qs("#u_ur_invite_btn", modal);
        const inviteMail = qs("#u_ur_invite_email", modal);
        const inviteRole = qs("#u_ur_invite_role", modal);

        if (!ctx.is_admin) {
          if (inviteBtn) inviteBtn.disabled = true;
          if (inviteMail) inviteMail.disabled = true;
          if (inviteRole) inviteRole.disabled = true;
        }

        if (inviteBtn && !inviteBtn.dataset.bound) {
          inviteBtn.dataset.bound = "1";
          let inflightKey = null;

          inviteBtn.addEventListener("click", async (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!ctx.is_admin) return;

            const email = (qs("#u_ur_invite_email", modal).value || "").trim().toLowerCase();
            const role  = (qs("#u_ur_invite_role", modal).value || "member").trim();
            if (!email) return setMsg("err", "Please enter an email.");

            const key = `${email}|${role}`;
            if (inflightKey === key) return;
            inflightKey = key;

            if (inviteBtn.dataset.loading === "1") return;
            inviteBtn.dataset.loading = "1";

            try {
              inviteBtn.disabled = true;
              setMsg("ok", "");

              await api._api.createInvite(email, role);

              setMsg("ok", `Invite sent to ${email} (${role}).`);
              qs("#u_ur_invite_email", modal).value = "";
              await api.refresh();
            } catch (ex) {
              err(ex);
              const msg = ex?.message || String(ex);
              if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already")) {
                setMsg("err", `Invite already exists for ${email}.`);
              } else {
                setMsg("err", msg);
              }
            } finally {
              inflightKey = null;
              inviteBtn.dataset.loading = "0";
              inviteBtn.disabled = false;
            }
          });
        }

        await api.refresh();
      } catch (ex) {
        err(ex);
        setMsg("err", ex?.message || String(ex));
      }
    },

    async refresh() {
      const sb = api._sb;
      const ctx = api._ctx;
      const modal = api._modal;
      if (!sb || !ctx || !modal || !ctx.company_id) return;

      try {
        const [members, invites] = await Promise.all([
          loadMembers(sb, ctx.company_id),
          loadInvites(sb, ctx.company_id),
        ]);

        api._invitesCache = invites || [];

        renderMembers(modal, ctx, members);
        renderInvites(modal, ctx, api._invitesCache);

        api.startTick(); // ✅ LIVE countdown
      } catch (ex) {
        err(ex);
        setMsg("err", ex?.message || String(ex));
      }
    },
  };

  window.UlydiaUsersRoles = api;
  window.UsersRoles = api;

  log("loaded (V4.4). Call UlydiaUsersRoles.open()");
})();
