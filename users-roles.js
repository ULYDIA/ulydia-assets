// users-roles.js
// ✅ JS pur (aucune balise <script> / </script>)
// ✅ Une seule IIFE + un seul guard
// ✅ Fonctionne si supabase-js v2 est déjà chargé dans le <head> Webflow
//    (https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2)
// ✅ Injecte automatiquement : CSS + HTML modal + bouton si absent

(() => {
  if (window.__ULYDIA_USERS_ROLES_MODAL__) return;
  window.__ULYDIA_USERS_ROLES_MODAL__ = true;

  // =============================
  // CONFIG (à adapter)
  // =============================
  const SUPABASE_URL = "https://zwnkscepqwujkcxusknn.supabase.co";

  // 👉 Mets ta clé anon ici OU expose-la via window.ULYDIA_SUPABASE_ANON_KEY
  // (pratique si tu veux éviter d’éditer le fichier)
  const SUPABASE_ANON_KEY =
    (window.ULYDIA_SUPABASE_ANON_KEY || "").trim() || "PASTE_YOUR_ANON_KEY";

  // =============================
  // Small helpers
  // =============================
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = (str) =>
    String(str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[c]));

  function warn(...args) {
    console.warn("[Ulydia Users/Roles]", ...args);
  }

  // =============================
  // Ensure Supabase library is present
  // =============================
  function ensureSupabaseLoaded() {
    if (window.supabase && typeof window.supabase.createClient === "function") return true;
    return false;
  }

  // =============================
  // Inject CSS
  // =============================
  function ensureCSS() {
    if (document.getElementById("u_users_roles_css")) return;
    const style = document.createElement("style");
    style.id = "u_users_roles_css";
    style.textContent = `
#u_users_modal_root{display:none}
#u_users_modal_overlay{
  position:fixed; inset:0; background:rgba(0,0,0,.45);
  z-index:999998;
}
#u_users_modal{
  position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);
  width:min(920px, calc(100vw - 28px));
  max-height:min(80vh, 720px);
  overflow:auto;
  background:#fff; border-radius:16px;
  box-shadow:0 20px 60px rgba(0,0,0,.25);
  z-index:999999;
  padding:18px;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}
#u_users_modal_header{
  display:flex; align-items:flex-start; justify-content:space-between;
  gap:14px; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,.08);
}
#u_users_modal_title{ font-size:18px; font-weight:700; }
#u_users_modal_subtitle{ font-size:13px; opacity:.7; margin-top:2px; }
#u_users_modal_close{
  border:0; background:rgba(0,0,0,.06);
  width:36px; height:36px; border-radius:10px; cursor:pointer;
}
#u_users_modal_tabs{ display:flex; gap:10px; margin:14px 0 10px; }
.u_tab{
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
  padding:8px 12px; border-radius:999px; cursor:pointer;
  font-size:13px;
}
.u_tab.is-active{
  border-color: rgba(0,0,0,.22);
  background: rgba(0,0,0,.04);
}
#u_members_actions{
  display:flex; gap:10px; flex-wrap:wrap;
  padding:12px; border:1px solid rgba(0,0,0,.08); border-radius:14px;
  margin-bottom:12px;
}
#u_members_actions input, #u_members_actions select{
  padding:10px 12px; border-radius:12px;
  border:1px solid rgba(0,0,0,.12);
  min-width: 220px;
}
#u_members_actions button{
  padding:10px 14px; border-radius:12px; border:0;
  background:#111; color:#fff; cursor:pointer;
}
#u_members_actions button:disabled{ opacity:.5; cursor:not-allowed; }

.u_row{
  display:grid;
  grid-template-columns: 1fr 140px 160px 120px;
  gap:10px;
  align-items:center;
  padding:12px;
  border:1px solid rgba(0,0,0,.08);
  border-radius:14px;
  margin-bottom:10px;
}
.u_row .u_email{ font-weight:600; }
.u_row .u_meta{ font-size:12px; opacity:.7; word-break:break-all; }
.u_row select{
  padding:10px 12px; border-radius:12px;
  border:1px solid rgba(0,0,0,.12);
  width:100%;
}
.u_row button{
  padding:10px 12px; border-radius:12px; border:1px solid rgba(0,0,0,.12);
  background:#fff; cursor:pointer;
}
.u_row button:disabled{ opacity:.5; cursor:not-allowed; }
.u_row button.danger{
  border-color: rgba(255,0,0,.25);
  background: rgba(255,0,0,.06);
}
#u_users_modal_footer{
  margin-top:10px; padding-top:12px;
  border-top:1px solid rgba(0,0,0,.08);
}
#u_users_modal_msg{ font-size:13px; opacity:.85; }
`;
    document.head.appendChild(style);
  }

  // =============================
  // Inject Modal HTML (if missing)
  // =============================
  function ensureModalHTML() {
    if (document.getElementById("u_users_modal_root")) return;

    const root = document.createElement("div");
    root.id = "u_users_modal_root";
    root.innerHTML = `
  <div id="u_users_modal_overlay"></div>
  <div id="u_users_modal" role="dialog" aria-modal="true" aria-labelledby="u_users_modal_title">
    <div id="u_users_modal_header">
      <div>
        <div id="u_users_modal_title">Users & Roles</div>
        <div id="u_users_modal_subtitle">Manage members and invitations</div>
      </div>
      <button id="u_users_modal_close" aria-label="Close">✕</button>
    </div>

    <div id="u_users_modal_tabs">
      <button class="u_tab is-active" data-tab="members" type="button">Members</button>
      <button class="u_tab" data-tab="invites" type="button">Invitations</button>
    </div>

    <div id="u_users_modal_body">
      <div class="u_tab_panel" data-panel="members">
        <div id="u_members_actions">
          <input id="u_invite_email" type="email" placeholder="Email to invite" />
          <select id="u_invite_role">
            <option value="viewer">viewer</option>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button id="u_invite_btn" type="button">Invite</button>
        </div>
        <div id="u_members_list"></div>
      </div>

      <div class="u_tab_panel" data-panel="invites" style="display:none">
        <div id="u_invites_list"></div>
      </div>
    </div>

    <div id="u_users_modal_footer">
      <div id="u_users_modal_msg"></div>
    </div>
  </div>
`;
    // inject at end of body
    document.body.appendChild(root);
  }

  // =============================
  // Ensure button exists
  // =============================
  function ensureManageButton() {
    let b = document.getElementById("u_manage_users_btn");
    if (b) return b;

    b = document.createElement("button");
    b.id = "u_manage_users_btn";
    b.type = "button";
    b.textContent = "Gérer les utilisateurs";
    b.style.cssText =
      "padding:10px 14px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;cursor:pointer;";

    // Try to place near existing dashboard header/actions if you have a hook.
    const target =
      document.querySelector("[data-ulydia-dashboard-actions]") ||
      document.querySelector(".dashboard-actions") ||
      document.querySelector(".my-account-actions") ||
      document.body;

    target.appendChild(b);
    return b;
  }

  // =============================
  // Main (Supabase + UI)
  // =============================
  function main() {
    if (!ensureSupabaseLoaded()) {
      warn(
        "Supabase lib not found. Add in Webflow Head:",
        '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
      );
      return;
    }

    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "PASTE_YOUR_ANON_KEY") {
      warn("SUPABASE_ANON_KEY is not set. Set it in users-roles.js or window.ULYDIA_SUPABASE_ANON_KEY");
      // We continue anyway; operations will fail with a clear message.
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    ensureCSS();
    ensureModalHTML();
    const btn = ensureManageButton();

    // DOM refs (after injection)
    const root = $("#u_users_modal_root");
    const overlay = $("#u_users_modal_overlay");
    const btnClose = $("#u_users_modal_close");
    const msgEl = $("#u_users_modal_msg");

    function setMsg(t, type) {
      if (!msgEl) return;
      msgEl.textContent = t || "";
      msgEl.style.color = type === "error" ? "crimson" : "";
    }

    function showRoot(on) {
      if (!root) return;
      root.style.display = on ? "block" : "none";
      document.documentElement.style.overflow = on ? "hidden" : "";
    }

    function setTab(name) {
      $$(".u_tab").forEach((t) => {
        t.classList.toggle("is-active", t.getAttribute("data-tab") === name);
      });
      $$(".u_tab_panel").forEach((p) => {
        p.style.display = p.getAttribute("data-panel") === name ? "block" : "none";
      });
    }

    // Context
    const ctx = {
      user: null,
      company_id: null,
      my_role: "viewer",
    };

    function canManage() {
      return ctx.my_role === "owner" || ctx.my_role === "admin";
    }

    function disableInviteUI(disabled) {
      const email = $("#u_invite_email");
      const role = $("#u_invite_role");
      const btnInvite = $("#u_invite_btn");
      [email, role, btnInvite].forEach((x) => {
        if (x) x.disabled = !!disabled;
      });
    }

    async function loadContext() {
      setMsg("");
      const { data: auth, error: authErr } = await sb.auth.getUser();
      if (authErr) throw authErr;

      ctx.user = auth?.user || null;
      if (!ctx.user) throw new Error("Not logged in.");

      const { data: m, error: mErr } = await sb
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (mErr) throw mErr;

      if (!m?.company_id) {
        ctx.company_id = null;
        ctx.my_role = "viewer";
        return;
      }

      ctx.company_id = m.company_id;
      ctx.my_role = m.role || "viewer";
    }

    async function renderMembers() {
      const list = $("#u_members_list");
      if (!list) return;
      list.innerHTML = "";

      if (!ctx.company_id) {
        list.innerHTML = `
          <div class="u_row" style="grid-template-columns:1fr">
            <div>
              <div class="u_email">No company linked</div>
              <div class="u_meta">This account can access the dashboard, but isn’t attached to a company yet.</div>
            </div>
          </div>`;
        disableInviteUI(true);
        return;
      }

      disableInviteUI(!canManage());

      // Prefer a view with email; fallback to raw table.
      let rows = null;

      const tryView = await sb
        .from("company_members_with_email")
        .select("id, user_id, email, role, created_at")
        .eq("company_id", ctx.company_id)
        .order("created_at", { ascending: true });

      if (!tryView.error) rows = tryView.data;

      if (!rows) {
        const raw = await sb
          .from("company_members")
          .select("id, user_id, role, created_at")
          .eq("company_id", ctx.company_id)
          .order("created_at", { ascending: true });

        if (raw.error) throw raw.error;

        rows = (raw.data || []).map((r) => ({ ...r, email: r.user_id }));
      }

      rows.forEach((r) => {
        const isMe = r.user_id === ctx.user.id;

        const row = document.createElement("div");
        row.className = "u_row";

        row.innerHTML = `
          <div>
            <div class="u_email">${esc(r.email || "")}${isMe ? " (you)" : ""}</div>
            <div class="u_meta">Member since ${r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</div>
          </div>

          <div class="u_meta">${esc(r.user_id || "")}</div>

          <div>
            <select data-action="role" ${(!canManage() ? "disabled" : "")}>
              ${["viewer", "member", "admin", "owner"]
                .map((role) => {
                  const selected = role === r.role ? "selected" : "";
                  const isOwnerTarget = r.role === "owner";
                  const disableOwnerMgmt = isOwnerTarget && ctx.my_role !== "owner";
                  return `<option value="${role}" ${selected} ${disableOwnerMgmt ? "disabled" : ""}>${role}</option>`;
                })
                .join("")}
            </select>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button data-action="remove" class="danger" ${(!canManage() || isMe) ? "disabled" : ""}>Remove</button>
          </div>
        `;

        const select = row.querySelector('select[data-action="role"]');
        if (select) {
          select.addEventListener("change", async () => {
            try {
              if (!canManage()) return;
              if (r.role === "owner" && ctx.my_role !== "owner") return;

              const newRole = select.value;
              setMsg("Updating role…");
              const { error } = await sb.from("company_members").update({ role: newRole }).eq("id", r.id);
              if (error) throw error;

              setMsg("Role updated.");
              await refreshAll();
            } catch (e) {
              setMsg(e?.message || "Role update failed.", "error");
              await refreshAll();
            }
          });
        }

        const btnRemove = row.querySelector('button[data-action="remove"]');
        if (btnRemove) {
          btnRemove.addEventListener("click", async () => {
            try {
              if (!canManage() || isMe) return;
              setMsg("Removing member…");

              const { error } = await sb.from("company_members").delete().eq("id", r.id);
              if (error) throw error;

              setMsg("Member removed.");
              await refreshAll();
            } catch (e) {
              setMsg(e?.message || "Remove failed.", "error");
            }
          });
        }

        list.appendChild(row);
      });
    }

    async function renderInvites() {
      const list = $("#u_invites_list");
      if (!list) return;
      list.innerHTML = "";

      if (!ctx.company_id) {
        list.innerHTML = `
          <div class="u_row" style="grid-template-columns:1fr">
            <div>
              <div class="u_email">No company linked</div>
              <div class="u_meta">No invitations available.</div>
            </div>
          </div>`;
        return;
      }

      const { data, error } = await sb
        .from("company_invites")
        .select("id, email, role, status, created_at")
        .eq("company_id", ctx.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      (data || []).forEach((inv) => {
        const row = document.createElement("div");
        row.className = "u_row";
        row.style.gridTemplateColumns = "1fr 140px 160px 120px";

        const isPending = inv.status === "pending";

        row.innerHTML = `
          <div>
            <div class="u_email">${esc(inv.email)}</div>
            <div class="u_meta">Created ${inv.created_at ? new Date(inv.created_at).toLocaleString() : ""}</div>
          </div>
          <div class="u_meta">${esc(inv.status)}</div>
          <div class="u_meta">role: <b>${esc(inv.role)}</b></div>
          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button data-action="cancel" class="danger" ${(!canManage() || !isPending) ? "disabled" : ""}>Cancel</button>
          </div>
        `;

        const btnCancel = row.querySelector('button[data-action="cancel"]');
        if (btnCancel) {
          btnCancel.addEventListener("click", async () => {
            try {
              if (!canManage() || !isPending) return;
              setMsg("Cancelling invite…");

              const { error } = await sb.from("company_invites").update({ status: "cancelled" }).eq("id", inv.id);
              if (error) throw error;

              setMsg("Invitation cancelled.");
              await renderInvites();
            } catch (e) {
              setMsg(e?.message || "Cancel failed.", "error");
            }
          });
        }

        list.appendChild(row);
      });
    }

    async function inviteMember() {
      try {
        if (!ctx.company_id) throw new Error("No company linked.");
        if (!canManage()) throw new Error("Not allowed.");

        const email = ($("#u_invite_email")?.value || "").trim().toLowerCase();
        const role = ($("#u_invite_role")?.value || "viewer").trim();

        if (!email) throw new Error("Please enter an email.");

        setMsg("Creating invitation…");

        const { error } = await sb.from("company_invites").insert({
          company_id: ctx.company_id,
          email,
          role,
          status: "pending",
        });

        if (error) throw error;

        setMsg("Invitation created.");
        const emailEl = $("#u_invite_email");
        if (emailEl) emailEl.value = "";
        await renderInvites();
      } catch (e) {
        setMsg(e?.message || "Invite failed.", "error");
      }
    }

    async function refreshAll() {
      await loadContext();
      await renderMembers();
      await renderInvites();
    }

    function wireModal() {
      // overlay/close
      overlay?.addEventListener("click", () => showRoot(false));
      btnClose?.addEventListener("click", () => showRoot(false));

      // esc key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && root?.style.display !== "none") showRoot(false);
      });

      // tabs
      $$(".u_tab").forEach((t) => {
        t.addEventListener("click", () => setTab(t.getAttribute("data-tab")));
      });

      // invite
      $("#u_invite_btn")?.addEventListener("click", inviteMember);
    }

    // Hook button
    wireModal();

    btn.addEventListener("click", async () => {
      try {
        showRoot(true);
        setTab("members");
        setMsg("Loading…");
        await refreshAll();
        setMsg("");
      } catch (e) {
        setMsg(e?.message || "Load failed.", "error");
      }
    });

    // Small log
    console.log("[Ulydia] Users & Roles ready");
  }

  // Run when DOM is ready
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  onReady(main);
})();
