/* ============================================================================
 * Ulydia — Users & Roles (Supabase-first, legacy-token compatible)
 * - No URL token required if user is authenticated
 * - Resolves company + manage_token via RLS
 * - Does NOT assume company_members.id exists
 * ========================================================================== */
(() => {
  if (window.__ULYDIA_USERS_ROLES_V1__) return;
  window.__ULYDIA_USERS_ROLES_V1__ = true;

  // ----------------------------
  // Default CONFIG (can be overridden by window.ULYDIA_USERS_ROLES_CONFIG)
  // ----------------------------
  const DEFAULTS = {
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    TOKEN_KEYS: ["ULYDIA_MANAGE_TOKEN", "ulydia_manage_token_v1"],
    // Optional: selector of the button that opens the modal
    OPEN_BUTTON_SELECTOR: '[data-ulydia-action="manage-users"], .u-manage-users, #u_manage_users',
    // Optional: where to append modal
    MODAL_APPEND_TO: "body",
    // If your dashboard uses this worker token for other calls, we expose it on window
    EXPOSE_TOKEN_ON_WINDOW: true,
    DEBUG: false,
  };

  const CFG = { ...DEFAULTS, ...(window.ULYDIA_USERS_ROLES_CONFIG || {}) };

  // ----------------------------
  // Utilities
  // ----------------------------
  const log = (...a) => CFG.DEBUG && console.log("[Users&Roles]", ...a);
  const warn = (...a) => console.warn("[Users&Roles]", ...a);

  const qp = (name) => new URLSearchParams(location.search).get(name);

  function must(val, name) {
    if (!val) throw new Error(`Missing config: ${name}`);
    return val;
  }

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
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    });
    return n;
  }

  function cssOnce() {
    if (document.getElementById("u_users_roles_css")) return;
    const style = el("style", { id: "u_users_roles_css" });
    style.textContent = `
      .u-ur-overlay{ position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:999999; display:none; align-items:center; justify-content:center; padding:24px;}
      .u-ur-modal{ width:min(1100px, 96vw); background:#fff; border-radius:18px; box-shadow:0 25px 70px rgba(0,0,0,.25); overflow:hidden; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .u-ur-head{ display:flex; align-items:flex-start; justify-content:space-between; padding:26px 28px 18px; border-bottom:1px solid #e5e7eb;}
      .u-ur-title{ font-size:40px; line-height:1.05; letter-spacing:-.02em; font-weight:800; margin:0; color:#0f172a;}
      .u-ur-sub{ margin:8px 0 0; color:#64748b; font-weight:600;}
      .u-ur-x{ width:48px; height:48px; border-radius:14px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;}
      .u-ur-body{ padding:22px 28px 26px;}
      .u-ur-card{ border:1px solid #e5e7eb; border-radius:18px; overflow:hidden; }
      .u-ur-cardhead{ display:flex; align-items:center; justify-content:space-between; padding:18px 18px; border-bottom:1px solid #eef2f7;}
      .u-ur-cardtitle{ font-size:22px; font-weight:800; color:#0f172a; }
      .u-ur-tabs{ display:flex; gap:10px; }
      .u-ur-tab{ padding:10px 16px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; font-weight:800; cursor:pointer; color:#0f172a; }
      .u-ur-tab.is-active{ background:#2563eb; color:#fff; border-color:#2563eb; }
      .u-ur-section{ padding:18px; }
      .u-ur-banner{ margin:14px 0; padding:14px 14px; border-radius:14px; border:1px solid #fecaca; background:#fef2f2; color:#991b1b; font-weight:800; }
      .u-ur-row{ display:grid; grid-template-columns: 1.8fr .7fr .8fr; gap:12px; align-items:center; padding:12px 12px; border:1px solid #eef2f7; border-radius:14px; margin:10px 0; }
      .u-ur-row strong{ color:#0f172a;}
      .u-ur-pill{ display:inline-flex; padding:6px 10px; border-radius:999px; border:1px solid #e5e7eb; font-weight:800; color:#0f172a; background:#fff; }
      .u-ur-actions{ display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap; }
      .u-ur-btn{ padding:10px 12px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; font-weight:800; }
      .u-ur-btn.primary{ background:#2563eb; color:#fff; border-color:#2563eb; }
      .u-ur-btn.danger{ background:#fff; color:#b91c1c; border-color:#fecaca; }
      .u-ur-form{ display:flex; gap:10px; flex-wrap:wrap; margin:10px 0 6px;}
      .u-ur-input, .u-ur-select{ padding:10px 12px; border-radius:12px; border:1px solid #e5e7eb; outline:none; font-weight:700; }
      .u-ur-input{ min-width:280px; flex:1; }
      .u-ur-muted{ color:#64748b; font-weight:700; }
      .u-ur-kv{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin:14px 0 8px; }
      .u-ur-kvbox{ border:1px solid #eef2f7; border-radius:16px; padding:16px; }
      .u-ur-kvbox h4{ margin:0 0 6px; font-size:14px; letter-spacing:.02em; color:#64748b; text-transform:uppercase; }
      .u-ur-kvbox .val{ font-size:16px; font-weight:900; color:#0f172a; word-break:break-all;}
      @media (max-width: 760px){
        .u-ur-title{ font-size:30px; }
        .u-ur-row{ grid-template-columns: 1fr; }
        .u-ur-actions{ justify-content:flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  // ----------------------------
  // Supabase loader (if not already present)
  // ----------------------------
  async function ensureSupabaseClient() {
    must(CFG.SUPABASE_URL, "SUPABASE_URL");
    must(CFG.SUPABASE_ANON_KEY, "SUPABASE_ANON_KEY");

    // If user already included supabase-js v2
    if (window.supabase && typeof window.supabase.createClient === "function") {
      return window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    }

    // Load from CDN (safe fallback)
    await new Promise((resolve, reject) => {
      const id = "u_supabase_js_v2";
      if (document.getElementById(id)) return resolve();
      const s = el("script", {
        id,
        src: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
        async: true,
        onload: resolve,
        onerror: () => reject(new Error("Failed to load supabase-js v2 from CDN")),
      });
      document.head.appendChild(s);
    });

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("supabase-js not available after load");
    }
    return window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  }

  // ----------------------------
  // Token resolver (legacy OR Supabase)
  // ----------------------------
  async function resolveDashboardToken({ supabase }) {
    // 1) Legacy: querystring or localStorage
    let token =
      (qp("token") || "").trim() ||
      CFG.TOKEN_KEYS.map((k) => (localStorage.getItem(k) || "").trim()).find(Boolean) ||
      "";

    if (token) return { token, source: "legacy" };

    // 2) Supabase: authenticated -> RLS fetch company + manage_token
    const { data: sessData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) return { token: "", source: "none", error: sessErr };
    const session = sessData?.session;
    if (!session?.user?.id) return { token: "", source: "none" };

    const { data: companyIds, error: rpcErr } = await supabase.rpc("my_company_ids");
    if (rpcErr) return { token: "", source: "none", error: rpcErr };

    const ids = Array.isArray(companyIds) ? companyIds : [];
    if (!ids.length) return { token: "", source: "none" };

    const { data: companies, error: compErr } = await supabase
      .from("companies")
      .select("id,name,manage_token,stripe_customer_id,created_at")
      .in("id", ids);

    if (compErr) return { token: "", source: "none", error: compErr };

    const list = Array.isArray(companies) ? companies : [];

    // choose best company (stripe_customer_id first, then has manage_token, then newest)
    list.sort((a, b) => {
      const aStripe = a?.stripe_customer_id ? 1 : 0;
      const bStripe = b?.stripe_customer_id ? 1 : 0;
      if (aStripe !== bStripe) return bStripe - aStripe;

      const aTok = a?.manage_token ? 1 : 0;
      const bTok = b?.manage_token ? 1 : 0;
      if (aTok !== bTok) return bTok - aTok;

      const ad = a?.created_at ? Date.parse(a.created_at) : 0;
      const bd = b?.created_at ? Date.parse(b.created_at) : 0;
      return bd - ad;
    });

    const chosen = list[0];
    token = (chosen?.manage_token || "").trim();
    if (!token) return { token: "", source: "none", company: chosen };

    try {
      CFG.TOKEN_KEYS.forEach((k) => localStorage.setItem(k, token));
    } catch (_) {}

    return { token, source: "supabase", company: chosen };
  }

  // ----------------------------
  // Company resolution (Supabase)
  // ----------------------------
  async function resolveActiveCompany({ supabase }) {
    const { data: sessData } = await supabase.auth.getSession();
    const user = sessData?.session?.user || null;
    if (!user?.id) return { user: null, company: null, isAdmin: false, companyIds: [] };

    const { data: companyIds, error: rpcErr } = await supabase.rpc("my_company_ids");
    if (rpcErr) return { user, company: null, isAdmin: false, companyIds: [], error: rpcErr };

    const ids = Array.isArray(companyIds) ? companyIds : [];
    if (!ids.length) return { user, company: null, isAdmin: false, companyIds: [] };

    const { data: companies, error: compErr } = await supabase
      .from("companies")
      .select("id,name,manage_token,stripe_customer_id,created_at")
      .in("id", ids);

    if (compErr) return { user, company: null, isAdmin: false, companyIds: ids, error: compErr };

    const list = Array.isArray(companies) ? companies : [];
    list.sort((a, b) => {
      const aStripe = a?.stripe_customer_id ? 1 : 0;
      const bStripe = b?.stripe_customer_id ? 1 : 0;
      if (aStripe !== bStripe) return bStripe - aStripe;
      const aTok = a?.manage_token ? 1 : 0;
      const bTok = b?.manage_token ? 1 : 0;
      if (aTok !== bTok) return bTok - aTok;
      const ad = a?.created_at ? Date.parse(a.created_at) : 0;
      const bd = b?.created_at ? Date.parse(b.created_at) : 0;
      return bd - ad;
    });

    const company = list[0] || null;

    let isAdmin = false;
    if (company?.id) {
      const { data: adminVal, error: admErr } = await supabase.rpc("is_company_admin", {
        p_company_id: company.id,
      });
      if (!admErr) isAdmin = !!adminVal;
    }

    return { user, company, isAdmin, companyIds: ids };
  }

  // ----------------------------
  // Data operations
  // ----------------------------
  async function fetchMembers({ supabase, companyId }) {
    // NOTE: no company_members.id assumed
    const { data, error } = await supabase
      .from("company_members")
      .select("company_id,user_id,role,user_email,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function updateMemberRole({ supabase, companyId, userId, role }) {
    const { error } = await supabase
      .from("company_members")
      .update({ role })
      .eq("company_id", companyId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async function removeMember({ supabase, companyId, userId }) {
    const { error } = await supabase
      .from("company_members")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async function fetchInvites({ supabase, companyId }) {
    const { data, error } = await supabase
      .from("company_invites")
      .select("id,company_id,email,role,status,invited_by,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function createInvite({ supabase, companyId, email, role }) {
    const { data: sessData } = await supabase.auth.getSession();
    const invitedBy = sessData?.session?.user?.id || null;

    const payload = {
      company_id: companyId,
      email: String(email || "").trim().toLowerCase(),
      role: role || "member",
      status: "pending",
      invited_by: invitedBy,
    };

    const { error } = await supabase.from("company_invites").insert(payload);
    if (error) throw error;
  }

  async function revokeInvite({ supabase, inviteId }) {
    const { error } = await supabase.from("company_invites").delete().eq("id", inviteId);
    if (error) throw error;
  }

  // ----------------------------
  // UI
  // ----------------------------
  function makeUI() {
    cssOnce();

    const overlay = el("div", { class: "u-ur-overlay", id: "u_users_roles_overlay" });
    const modal = el("div", { class: "u-ur-modal", role: "dialog", "aria-modal": "true" });

    const head = el("div", { class: "u-ur-head" }, [
      el("div", {}, [
        el("h2", { class: "u-ur-title" }, "Users & Roles"),
        el("div", { class: "u-ur-sub" }, "Manage access for your company"),
      ]),
      el(
        "button",
        {
          class: "u-ur-x",
          type: "button",
          onClick: () => close(),
          "aria-label": "Close",
        },
        "✕"
      ),
    ]);

    const body = el("div", { class: "u-ur-body" });

    // Session / context cards (simple)
    const kv = el("div", { class: "u-ur-kv" });
    const kvSession = el("div", { class: "u-ur-kvbox" }, [
      el("h4", {}, "Session"),
      el("div", { class: "val", id: "u_ur_signed_in_as" }, "—"),
    ]);
    const kvToken = el("div", { class: "u-ur-kvbox" }, [
      el("h4", {}, "Dashboard token"),
      el("div", { class: "val", id: "u_ur_token" }, "—"),
    ]);
    kv.appendChild(kvSession);
    kv.appendChild(kvToken);

    const card = el("div", { class: "u-ur-card" });

    const tabs = el("div", { class: "u-ur-tabs" }, [
      el("button", { class: "u-ur-tab is-active", type: "button", id: "u_ur_tab_members" }, "Members"),
      el("button", { class: "u-ur-tab", type: "button", id: "u_ur_tab_invites" }, "Invites"),
    ]);

    const cardHead = el("div", { class: "u-ur-cardhead" }, [
      el("div", {}, [
        el("div", { class: "u-ur-cardtitle" }, "Manage"),
        el("div", { class: "u-ur-muted" }, "Members list and invitations"),
      ]),
      tabs,
    ]);

    const section = el("div", { class: "u-ur-section" });

    const banner = el("div", { class: "u-ur-banner", id: "u_ur_banner", style: "display:none" }, "");

    const membersWrap = el("div", { id: "u_ur_members_wrap" });
    const invitesWrap = el("div", { id: "u_ur_invites_wrap", style: "display:none" });

    section.appendChild(banner);
    section.appendChild(membersWrap);
    section.appendChild(invitesWrap);

    card.appendChild(cardHead);
    card.appendChild(section);

    body.appendChild(kv);
    body.appendChild(card);

    modal.appendChild(head);
    modal.appendChild(body);
    overlay.appendChild(modal);

    const root = document.querySelector(CFG.MODAL_APPEND_TO) || document.body;
    root.appendChild(overlay);

    // Tab switching
    const tabMembers = card.querySelector("#u_ur_tab_members");
    const tabInvites = card.querySelector("#u_ur_tab_invites");

    function setTab(which) {
      const isMembers = which === "members";
      tabMembers.classList.toggle("is-active", isMembers);
      tabInvites.classList.toggle("is-active", !isMembers);
      membersWrap.style.display = isMembers ? "" : "none";
      invitesWrap.style.display = !isMembers ? "" : "none";
    }

    tabMembers.addEventListener("click", () => setTab("members"));
    tabInvites.addEventListener("click", () => setTab("invites"));

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    function open() {
      overlay.style.display = "flex";
      document.documentElement.style.overflow = "hidden";
    }
    function close() {
      overlay.style.display = "none";
      document.documentElement.style.overflow = "";
    }

    function showError(msg) {
      banner.textContent = msg || "Error";
      banner.style.display = "";
    }
    function clearError() {
      banner.textContent = "";
      banner.style.display = "none";
    }

    return {
      open,
      close,
      showError,
      clearError,
      setTab,
      membersWrap,
      invitesWrap,
      signedInEl: kvSession.querySelector("#u_ur_signed_in_as"),
      tokenEl: kvToken.querySelector("#u_ur_token"),
    };
  }

  function renderMembers({ ui, members, isAdmin, onRoleChange, onRemove }) {
    ui.membersWrap.innerHTML = "";

    if (!members.length) {
      ui.membersWrap.appendChild(el("div", { class: "u-ur-muted" }, "No members found."));
      return;
    }

    members.forEach((m) => {
      const email = m.user_email || "(email unknown)";
      const role = (m.role || "member").toLowerCase();

      const roleSelect = el(
        "select",
        { class: "u-ur-select", ...(isAdmin ? {} : { disabled: "true" }) },
        [
          el("option", { value: "owner", ...(role === "owner" ? { selected: "true" } : {}) }, "owner"),
          el("option", { value: "admin", ...(role === "admin" ? { selected: "true" } : {}) }, "admin"),
          el("option", { value: "member", ...(role === "member" ? { selected: "true" } : {}) }, "member"),
        ]
      );

      roleSelect.addEventListener("change", () => onRoleChange(m, roleSelect.value));

      const removeBtn = el(
        "button",
        {
          class: "u-ur-btn danger",
          type: "button",
          ...(isAdmin ? {} : { disabled: "true" }),
        },
        "Remove"
      );
      removeBtn.addEventListener("click", () => onRemove(m));

      const row = el("div", { class: "u-ur-row" }, [
        el("div", {}, [
          el("div", {}, [el("strong", {}, email)]),
          el("div", { class: "u-ur-muted" }, `user_id: ${m.user_id}`),
        ]),
        el("div", {}, [el("span", { class: "u-ur-pill" }, "Role"), el("div", { style: "height:8px" }), roleSelect]),
        el("div", { class: "u-ur-actions" }, [removeBtn]),
      ]);

      ui.membersWrap.appendChild(row);
    });
  }

  function renderInvites({ ui, invites, isAdmin, onCreate, onRevoke }) {
    ui.invitesWrap.innerHTML = "";

    if (!isAdmin) {
      ui.invitesWrap.appendChild(
        el("div", { class: "u-ur-banner" }, "You must be admin/owner to manage invites.")
      );
      return;
    }

    const emailInput = el("input", {
      class: "u-ur-input",
      type: "email",
      placeholder: "Invite email (e.g. user@company.com)",
    });

    const roleSelect = el("select", { class: "u-ur-select" }, [
      el("option", { value: "member" }, "member"),
      el("option", { value: "admin" }, "admin"),
    ]);

    const addBtn = el("button", { class: "u-ur-btn primary", type: "button" }, "Send invite");

    const form = el("div", { class: "u-ur-form" }, [emailInput, roleSelect, addBtn]);
    ui.invitesWrap.appendChild(form);

    addBtn.addEventListener("click", () => {
      const email = (emailInput.value || "").trim();
      const role = roleSelect.value;
      onCreate(email, role);
    });

    if (!invites.length) {
      ui.invitesWrap.appendChild(el("div", { class: "u-ur-muted" }, "No invites yet."));
      return;
    }

    invites.forEach((inv) => {
      const row = el("div", { class: "u-ur-row" }, [
        el("div", {}, [
          el("div", {}, [el("strong", {}, inv.email)]),
          el("div", { class: "u-ur-muted" }, `status: ${inv.status || "—"} • role: ${inv.role || "member"}`),
        ]),
        el("div", {}, [el("span", { class: "u-ur-pill" }, "Invite"), el("div", { style: "height:8px" }), el("div", { class: "u-ur-muted" }, inv.id)]),
        el("div", { class: "u-ur-actions" }, [
          el("button", { class: "u-ur-btn danger", type: "button", onClick: () => onRevoke(inv) }, "Revoke"),
        ]),
      ]);
      ui.invitesWrap.appendChild(row);
    });
  }

  // ----------------------------
  // Main init
  // ----------------------------
  async function init() {
    const ui = makeUI();

    let supabase;
    try {
      supabase = await ensureSupabaseClient();
    } catch (e) {
      warn(e);
      ui.showError("Failed to load Supabase client.");
      return;
    }

    // Resolve token (not mandatory anymore, but nice for dashboard / worker bridges)
    const tokenRes = await resolveDashboardToken({ supabase });
    const token = (tokenRes?.token || "").trim();

    if (CFG.EXPOSE_TOKEN_ON_WINDOW) {
      window.ULYDIA_DASHBOARD_TOKEN = token || "";
    }

    // Resolve active company & admin status
    const ctx = await resolveActiveCompany({ supabase });
    const email = ctx.user?.email || "Not signed in";
    ui.signedInEl.textContent = `Signed in as ${email}`;
    ui.tokenEl.textContent = token ? token : "(auto via Supabase — no URL token required)";

    // If user is not signed in at all
    if (!ctx.user?.id) {
      ui.showError("You are not signed in. Please log in to manage users.");
      bindOpen(ui, () => ui.open()); // still openable
      return;
    }

    // If user is signed in but no company
    if (!ctx.company?.id) {
      ui.showError("No company found for this user (membership missing).");
      bindOpen(ui, () => ui.open());
      return;
    }

    ui.clearError();

    async function refreshAll() {
      ui.clearError();
      try {
        const [members, invites] = await Promise.all([
          fetchMembers({ supabase, companyId: ctx.company.id }),
          fetchInvites({ supabase, companyId: ctx.company.id }),
        ]);

        renderMembers({
          ui,
          members,
          isAdmin: ctx.isAdmin,
          onRoleChange: async (m, newRole) => {
            try {
              await updateMemberRole({ supabase, companyId: ctx.company.id, userId: m.user_id, role: newRole });
              await refreshAll();
            } catch (e) {
              warn(e);
              ui.showError(e?.message || "Failed to update role.");
            }
          },
          onRemove: async (m) => {
            // prevent removing yourself if owner/admin? keep simple:
            if (m.user_id === ctx.user.id) {
              ui.showError("You cannot remove yourself.");
              return;
            }
            try {
              await removeMember({ supabase, companyId: ctx.company.id, userId: m.user_id });
              await refreshAll();
            } catch (e) {
              warn(e);
              ui.showError(e?.message || "Failed to remove member.");
            }
          },
        });

        renderInvites({
          ui,
          invites,
          isAdmin: ctx.isAdmin,
          onCreate: async (email, role) => {
            if (!email || !email.includes("@")) {
              ui.showError("Please enter a valid email.");
              return;
            }
            try {
              await createInvite({ supabase, companyId: ctx.company.id, email, role });
              ui.clearError();
              await refreshAll();
            } catch (e) {
              warn(e);
              ui.showError(e?.message || "Failed to create invite.");
            }
          },
          onRevoke: async (inv) => {
            try {
              await revokeInvite({ supabase, inviteId: inv.id });
              await refreshAll();
            } catch (e) {
              warn(e);
              ui.showError(e?.message || "Failed to revoke invite.");
            }
          },
        });
      } catch (e) {
        warn(e);
        ui.showError("Failed to connect. Check RLS and table names.");
      }
    }

    // Open handler: refresh before showing
    bindOpen(ui, async () => {
      await refreshAll();
      ui.open();
      ui.setTab("members");
    });

    // Auto-refresh when auth changes (optional)
    supabase.auth.onAuthStateChange(async () => {
      try {
        const nextCtx = await resolveActiveCompany({ supabase });
        if (nextCtx.user?.email) ui.signedInEl.textContent = `Signed in as ${nextCtx.user.email}`;
      } catch (_) {}
    });

    log("Users&Roles ready", { tokenRes, ctx });
  }

  function bindOpen(ui, openFn) {
    const hook = () => {
      try {
        openFn();
      } catch (e) {
        warn(e);
        ui.showError(e?.message || "Init error");
        ui.open();
      }
    };

    // attach click to any matching buttons
    const bind = () => {
      const btns = Array.from(document.querySelectorAll(CFG.OPEN_BUTTON_SELECTOR));
      btns.forEach((b) => {
        if (b.__ULYDIA_BOUND_USERS_ROLES__) return;
        b.__ULYDIA_BOUND_USERS_ROLES__ = true;
        b.addEventListener("click", (e) => {
          e.preventDefault();
          hook();
        });
      });
    };

    bind();
    // observe later-inserted buttons
    const mo = new MutationObserver(() => bind());
    mo.observe(document.documentElement, { subtree: true, childList: true });
  }

  // Expose an API if needed
  window.UlydiaUsersRoles = {
    init,
  };

  // Auto-init
  try {
    init().catch((e) => warn(e));
  } catch (e) {
    warn(e);
  }
})();

