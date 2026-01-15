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
    return Array.isArray(res.data) ? res.data : [];
  }

  async function listInvites(sb, companyId){
    const res = await sb
      .from("company_invites")
      .select("id,email,role,status,created_at,invited_by")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (res.error) throw res.error;
    return Array.isArray(res.data) ? res.data : [];
  }

  async function inviteUser(sb, companyId, email, role){
    const e = normEmail(email);
    if (!e || !e.includes("@")) throw new Error("Invalid email");
    const r = String(role||"member").trim() || "member";
    const res = await sb.from("company_invites").insert({
      company_id: companyId,
      email: e,
      role: r,
      status: "pending"
    }).select("id").maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  }

  async function updateMemberRole(sb, memberId, role){
    const r = String(role||"member").trim() || "member";
    const res = await sb.from("company_members").update({ role: r }).eq("id", memberId);
    if (res.error) throw res.error;
    return true;
  }

  async function removeMember(sb, memberId){
    const res = await sb.from("company_members").delete().eq("id", memberId);
    if (res.error) throw res.error;
    return true;
  }

  async function cancelInvite(sb, inviteId){
    const res = await sb.from("company_invites").delete().eq("id", inviteId);
    if (res.error) throw res.error;
    return true;
  }

  // Optional: "resend" by setting status back to pending + bump updated_at if you have it
  async function resendInvite(sb, inviteId){
    const res = await sb.from("company_invites").update({ status: "pending" }).eq("id", inviteId);
    if (res.error) throw res.error;
    return true;
  }

  function fmtDate(d){
    try{
      return new Intl.DateTimeFormat("en-US", { year:"numeric", month:"short", day:"2-digit" }).format(new Date(d));
    } catch { return "—"; }
  }

  function buildModalShell(){
    injectStylesOnce();

    const overlay = el("div", { id: UI.overlayId });
    const card = el("div", { class: "card" });

    const closeBtn = el("button", { class:"xbtn", type:"button" });
    closeBtn.innerHTML = iconX();

    const top = el("div", { class:"top" }, [
      el("div", { class:"title" }, "Users & Roles"),
      closeBtn
    ]);

    const body = el("div", { class:"body" });
    card.appendChild(top);
    card.appendChild(body);
    overlay.appendChild(card);

    function close(){
      try { overlay.remove(); } catch {}
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e){ if (e.key === "Escape") close(); }

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", onKey);

    document.body.appendChild(overlay);

    return { overlay, body, close };
  }

  function renderInfoPanel({ sessionEmail, token, msgNode }) {
    return el("div", { class:"panel" }, [
      el("div", { class:"ph" }, "Session"),
      el("div", { class:"pc" }, [
        el("div", { class:"muted", style:"font-weight:900" }, `Signed in as ${sessionEmail || "—"}`),
      ]),
      el("div", { class:"ph" }, "Dashboard token"),
      el("div", { class:"pc" }, [
        el("div", { style:"font-weight:900;word-break:break-all" }, token || "—"),
      ]),
      el("div", { class:"ph" }, "Status"),
      el("div", { class:"pc" }, msgNode),
    ]);
  }

  function renderMainPanel(){
    const tabs = el("div", { class:"tabs" }, [
      el("button", { class:"tab", type:"button", "data-tab":"members", "data-active":"1" }, "Members"),
      el("button", { class:"tab", type:"button", "data-tab":"invites" }, "Invites"),
    ]);

    const slot = el("div", { style:"margin-top:14px" });
    const panel = el("div", { class:"panel" }, [
      el("div", { class:"ph" }, "Manage"),
      el("div", { class:"pc" }, [tabs, slot]),
    ]);

    return { panel, tabs, slot };
  }

  function setActiveTab(tabsEl, name){
    Array.from(tabsEl.querySelectorAll(".tab")).forEach(b => {
      b.dataset.active = (b.dataset.tab === name) ? "1" : "0";
    });
  }

  function renderMembers(slot, members, onRoleChange, onRemove){
    const table = el("table", {}, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "User"),
        el("th", {}, "Role"),
        el("th", {}, "Added"),
        el("th", {}, "Actions"),
      ])),
      el("tbody", {}, members.map(m => {
        const userText = (m.user_email && String(m.user_email).includes("@")) ? m.user_email : (m.user_id || "—");
        const roleSel = el("select", {}, [
          el("option", { value:"owner", selected: String(m.role||"") === "owner" ? "selected" : null }, "owner"),
          el("option", { value:"admin", selected: String(m.role||"") === "admin" ? "selected" : null }, "admin"),
          el("option", { value:"member", selected: (!m.role || String(m.role) === "member") ? "selected" : null }, "member"),
        ]);
        roleSel.addEventListener("change", () => onRoleChange(m, roleSel.value));

        const rm = el("button", { class:"btn btnDanger", type:"button" }, "Remove");
        rm.addEventListener("click", () => onRemove(m));

        return el("tr", {}, [
          el("td", {}, el("div", { style:"font-weight:900;word-break:break-all" }, userText)),
          el("td", {}, roleSel),
          el("td", {}, el("span", { class:"pill" }, fmtDate(m.created_at))),
          el("td", {}, rm),
        ]);
      }))
    ]);

    slot.innerHTML = "";
    if (!members.length){
      slot.appendChild(el("div", { class:"muted", style:"font-weight:900" }, "No members found."));
      return;
    }
    slot.appendChild(table);

    // Note if emails missing
    const missingEmails = members.some(m => !m.user_email);
    if (missingEmails){
      slot.appendChild(el("div", { class:"muted", style:"margin-top:10px;font-weight:900" },
        "Note: member emails are not available (missing company_members.user_email). Showing user_id instead."
      ));
    }
  }

  function renderInvites(slot, invites, onInvite, onCancel, onResend){
    const email = el("input", { placeholder:"email@company.com", type:"email", style:"width:320px;max-width:100%" });
    const role  = el("select", {}, [
      el("option", { value:"member" }, "member"),
      el("option", { value:"admin" }, "admin"),
    ]);
    const btn = el("button", { class:"btn", type:"button" }, "Send invite");

    const formRow = el("div", { class:"row", style:"gap:10px" }, [
      el("div", { style:"display:flex;gap:10px;flex-wrap:wrap;align-items:center" }, [email, role, btn]),
      el("div", { class:"muted", style:"font-weight:900" }, "Invites create a pending row; acceptance flow handled by your app.")
    ]);

    btn.addEventListener("click", () => onInvite(email.value, role.value));

    const table = el("table", { style:"margin-top:14px" }, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "Email"),
        el("th", {}, "Role"),
        el("th", {}, "Status"),
        el("th", {}, "Created"),
        el("th", {}, "Actions"),
      ])),
      el("tbody", {}, invites.map(inv => {
        const cancel = el("button", { class:"btn btnDanger", type:"button" }, "Delete");
        cancel.addEventListener("click", () => onCancel(inv));

        const resend = el("button", { class:"btn btnGhost", type:"button" }, "Resend");
        resend.addEventListener("click", () => onResend(inv));

        return el("tr", {}, [
          el("td", {}, el("div", { style:"font-weight:900;word-break:break-all" }, inv.email || "—")),
          el("td", {}, el("span", { class:"pill" }, inv.role || "member")),
          el("td", {}, el("span", { class:"pill" }, inv.status || "pending")),
          el("td", {}, el("span", { class:"pill" }, fmtDate(inv.created_at))),
          el("td", {}, el("div", { style:"display:flex;gap:10px;flex-wrap:wrap" }, [resend, cancel])),
        ]);
      }))
    ]);

    slot.innerHTML = "";
    slot.appendChild(formRow);

    if (!invites.length){
      slot.appendChild(el("div", { class:"muted", style:"margin-top:12px;font-weight:900" }, "No invites yet."));
      return;
    }
    slot.appendChild(table);
  }

  async function open({ supabase, token }) {
    const sb = supabase;
    const tkn = String(token || "").trim();
    const modal = buildModalShell();

    const msgNode = el("div", { class:"muted", style:"font-weight:900" }, "Loading…");

    // Left info panel
    const { session } = await safeSession(sb || { auth:{ getSession: async()=>({data:{session:null}}) } });
    const sessionEmail = session?.user?.email || "";

    // Main right panel
    const main = renderMainPanel();

    const root = el("div", { class:"grid" }, [
      renderInfoPanel({ sessionEmail, token: tkn, msgNode }),
      main.panel
    ]);

    modal.body.appendChild(root);

    if (!sb || !sb.from) {
      msgNode.className = "err";
      msgNode.textContent = "Supabase client missing. Please open from dashboard script with { supabase }.";
      main.slot.innerHTML = "";
      main.slot.appendChild(el("div", { class:"err" }, "Cannot continue without Supabase."));
      return;
    }

    if (!tkn) {
      msgNode.className = "err";
      msgNode.textContent = "Missing dashboard token.";
      main.slot.innerHTML = "";
      main.slot.appendChild(el("div", { class:"err" }, "Cannot continue without token."));
      return;
    }

    let company = null;
    let members = [];
    let invites = [];

    async function refreshAll(){
      msgNode.className = "muted";
      msgNode.textContent = "Loading company & lists…";

      company = await getCompanyByToken(sb, tkn);
      members = await listMembers(sb, company.id);
      invites = await listInvites(sb, company.id);

      msgNode.className = "ok";
      msgNode.textContent = `Connected to company: ${company.name || company.slug || company.id}`;

      // render current tab
      const active = main.tabs.querySelector('.tab[data-active="1"]')?.dataset?.tab || "members";
      renderTab(active);
    }

    function renderTab(name){
      setActiveTab(main.tabs, name);
      if (name === "members") {
        renderMembers(
          main.slot,
          members,
          async (m, newRole) => {
            try{
              await updateMemberRole(sb, m.id, newRole);
              await refreshAll();
            }catch(e){
              alert("Role update failed: " + (e?.message || e));
            }
          },
          async (m) => {
            const ok = confirm("Remove this member from the company?");
            if (!ok) return;
            try{
              await removeMember(sb, m.id);
              await refreshAll();
            }catch(e){
              alert("Remove failed: " + (e?.message || e));
            }
          }
        );
      } else {
        renderInvites(
          main.slot,
          invites,
          async (email, role) => {
            try{
              await inviteUser(sb, company.id, email, role);
              await refreshAll();
            }catch(e){
              alert("Invite failed: " + (e?.message || e));
            }
          },
          async (inv) => {
            const ok = confirm("Delete this invite?");
            if (!ok) return;
            try{
              await cancelInvite(sb, inv.id);
              await refreshAll();
            }catch(e){
              alert("Delete invite failed: " + (e?.message || e));
            }
          },
          async (inv) => {
            try{
              await resendInvite(sb, inv.id);
              await refreshAll();
            }catch(e){
              alert("Resend failed: " + (e?.message || e));
            }
          }
        );
      }
    }

    main.tabs.addEventListener("click", (e) => {
      const b = e.target.closest(".tab");
      if (!b) return;
      const tab = b.dataset.tab;
      renderTab(tab);
    });

    try{
      await refreshAll();
    }catch(e){
      console.warn("[Users&Roles] init error:", e);
      msgNode.className = "err";
      msgNode.textContent = "Failed to connect. Check RLS and table names.";
      main.slot.innerHTML = "";
      main.slot.appendChild(el("div", { class:"err" }, String(e?.message || e)));
    }
  }

  window.UlydiaUsersRoles = { open };
})();

