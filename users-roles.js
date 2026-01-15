/* users-roles.js — Ulydia Users & Roles (v2)
   - Clean UI (no token shown)
   - Works even if company_members has no "id" column
   - Debug mode: add ?debug=1 to current page to display token/session
*/
(function () {
  if (window.UlydiaUsersRoles?.open) return;

  const UI = {
    overlayId: "u_ur_overlay",
    styleId: "u_ur_style",
  };

  const ROLES = ["owner", "admin", "member"];

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

  function qp(k){ return new URLSearchParams(location.search).get(k); }
  function isDebug(){ return String(qp("debug") || "").trim() === "1"; }

  function injectStylesOnce() {
    if (document.getElementById(UI.styleId)) return;

    // Style proche de ton dashboard (cards + boutons + typographie system)
    const css = `
      #${UI.overlayId}{
        position:fixed; inset:0; z-index:999999;
        background:rgba(15,23,42,.45);
        display:flex; align-items:center; justify-content:center;
        padding:18px;
        font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      }
      #${UI.overlayId} .card{
        width:min(1040px, 96vw);
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:18px;
        box-shadow:0 14px 40px rgba(15,23,42,.18);
        overflow:hidden;
      }
      #${UI.overlayId} .top{
        display:flex; align-items:center; justify-content:space-between; gap:12px;
        padding:16px 16px;
        border-bottom:1px solid #eef2f7;
        background:#fafafa;
      }
      #${UI.overlayId} .title{
        font-size:20px; font-weight:900; letter-spacing:-.01em;
        color:#0f172a;
      }
      #${UI.overlayId} .sub{
        font-size:12px; font-weight:800; opacity:.7; margin-top:2px;
      }
      #${UI.overlayId} .xbtn{
        width:42px;height:42px;border-radius:14px;
        border:1px solid #e5e7eb;background:#fff;cursor:pointer;
        display:inline-flex;align-items:center;justify-content:center;
      }
      #${UI.overlayId} .xbtn:hover{ background:#f8fafc; }
      #${UI.overlayId} .body{ padding:16px; }

      #${UI.overlayId} .tabs{ display:flex; gap:10px; flex-wrap:wrap; }
      #${UI.overlayId} .tab{
        padding:10px 14px; border-radius:999px;
        border:1px solid #e5e7eb; background:#fff;
        font-weight:900; cursor:pointer;
        color:#0f172a;
      }
      #${UI.overlayId} .tab[data-active="1"]{
        background:#2563eb; border-color:#2563eb; color:#fff;
      }

      #${UI.overlayId} .panel{
        border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;
        background:#fff;
      }
      #${UI.overlayId} .ph{
        padding:14px 16px;
        border-bottom:1px solid #eef2f7;
        background:#fff;
        display:flex; align-items:flex-end; justify-content:space-between; gap:12px;
      }
      #${UI.overlayId} .phL .h{
        font-weight:900; font-size:16px; color:#0f172a;
      }
      #${UI.overlayId} .phL .p{
        font-weight:800; font-size:12px; opacity:.7; margin-top:3px;
      }
      #${UI.overlayId} .pc{ padding:14px 16px; }

      #${UI.overlayId} .btn{
        display:inline-flex; align-items:center; justify-content:center;
        padding:10px 12px; border-radius:12px;
        font-weight:900; font-size:13px;
        border:1px solid transparent; cursor:pointer;
        user-select:none;
      }
      #${UI.overlayId} .btnPrimary{ background:#2563eb; color:#fff; }
      #${UI.overlayId} .btnGhost{ background:#fff; color:#0f172a; border-color:#e5e7eb; }
      #${UI.overlayId} .btnDanger{ background:#fff; color:#991b1b; border-color:#fecaca; }

      #${UI.overlayId} input, #${UI.overlayId} select{
        height:44px; border-radius:12px;
        border:1px solid #e5e7eb;
        padding:0 12px;
        font-weight:800;
        outline:none;
      }
      #${UI.overlayId} input:focus, #${UI.overlayId} select:focus{
        border-color:#2563eb;
        box-shadow:0 0 0 3px rgba(37,99,235,.15);
      }

      #${UI.overlayId} table{ width:100%; border-collapse:collapse; }
      #${UI.overlayId} th{
        font-size:12px; text-transform:uppercase; letter-spacing:.02em;
        opacity:.7; text-align:left;
        padding:12px 0;
        border-bottom:1px solid #eef2f7;
      }
      #${UI.overlayId} td{
        padding:14px 0;
        border-bottom:1px solid #f1f5f9;
        vertical-align:middle;
      }
      #${UI.overlayId} .pill{
        display:inline-flex;
        padding:6px 10px;
        border-radius:999px;
        border:1px solid #e5e7eb;
        font-weight:900;
        font-size:12px;
      }
      #${UI.overlayId} .err{
        padding:12px 14px;
        border-radius:14px;
        background:#fef2f2;
        border:1px solid #fecaca;
        color:#991b1b;
        font-weight:900;
      }
      #${UI.overlayId} .muted{
        opacity:.75;
        font-weight:800;
      }

      #${UI.overlayId} .row{
        display:flex; gap:10px; flex-wrap:wrap;
        align-items:center; justify-content:space-between;
      }

      @media (max-width: 780px){
        #${UI.overlayId} .ph{ align-items:flex-start; flex-direction:column; }
      }
    `;

    const st = document.createElement("style");
    st.id = UI.styleId;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function iconX() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
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
    }catch(e){
      return { session:null, error:e };
    }
  }

  async function getCompanyByToken(sb, token){
    const t = String(token||"").trim();
    if (!t) throw new Error("Missing token");
    const res = await sb
      .from("companies")
      .select("id,name,slug,manage_token")
      .eq("manage_token", t)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data?.id) throw new Error("Company not found for token");
    return res.data;
  }

  // ✅ IMPORTANT: no "id" here
  async function listMembers(sb, companyId){
    const res = await sb
      .from("company_members")
      .select("company_id,user_id,user_email,role,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending:true });
    if (res.error) throw res.error;
    return Array.isArray(res.data) ? res.data : [];
  }

  async function listInvites(sb, companyId){
    const res = await sb
      .from("company_invites")
      .select("id,company_id,email,role,status,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending:false });
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
    });
    if (res.error) throw res.error;
    return true;
  }

  // ✅ Update using (company_id + user_id) instead of id
  async function updateMemberRole(sb, companyId, userId, role){
    const r = String(role||"member").trim() || "member";
    const res = await sb
      .from("company_members")
      .update({ role: r })
      .eq("company_id", companyId)
      .eq("user_id", userId);
    if (res.error) throw res.error;
    return true;
  }

  async function removeMember(sb, companyId, userId){
    const res = await sb
      .from("company_members")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", userId);
    if (res.error) throw res.error;
    return true;
  }

  async function deleteInvite(sb, inviteId){
    const res = await sb.from("company_invites").delete().eq("id", inviteId);
    if (res.error) throw res.error;
    return true;
  }

  async function resendInvite(sb, inviteId){
    // Simple resend marker: set status back to pending
    const res = await sb.from("company_invites").update({ status:"pending" }).eq("id", inviteId);
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
    const card = el("div", { class:"card" });

    const closeBtn = el("button", { class:"xbtn", type:"button" });
    closeBtn.innerHTML = iconX();

    const left = el("div", {}, [
      el("div", { class:"title" }, "Users & Roles"),
      el("div", { class:"sub" }, "Manage access for your company")
    ]);

    const top = el("div", { class:"top" }, [ left, closeBtn ]);
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

  function setActiveTab(tabsEl, name){
    Array.from(tabsEl.querySelectorAll(".tab")).forEach(b => {
      b.dataset.active = (b.dataset.tab === name) ? "1" : "0";
    });
  }

  function renderMembers(slot, companyId, members, onRoleChange, onRemove){
    const table = el("table", {}, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "User"),
        el("th", {}, "Role"),
        el("th", {}, "Added"),
        el("th", {}, "Actions"),
      ])),
      el("tbody", {}, members.map(m => {
        const userText = (m.user_email && String(m.user_email).includes("@")) ? m.user_email : (m.user_id || "—");
        const roleSel = el("select", {}, ROLES.map(r => el("option", {
          value:r,
          selected: String(m.role||"member") === r ? "selected" : null
        }, r)));

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
      slot.appendChild(el("div", { class:"muted" }, "No members found."));
      return;
    }
    slot.appendChild(table);

    const missingEmails = members.some(m => !m.user_email);
    if (missingEmails){
      slot.appendChild(el("div", { class:"muted", style:"margin-top:10px" },
        "Note: emails are not stored for members yet (showing user_id)."
      ));
    }
  }

  function renderInvites(slot, invites, onInvite, onDelete, onResend){
    const email = el("input", { placeholder:"email@company.com", type:"email", style:"width:320px;max-width:100%" });
    const role  = el("select", {}, [
      el("option", { value:"member" }, "member"),
      el("option", { value:"admin" }, "admin"),
    ]);
    const btn = el("button", { class:"btn btnPrimary", type:"button" }, "Send invite");

    btn.addEventListener("click", () => onInvite(email.value, role.value));

    const form = el("div", { class:"row" }, [
      el("div", { style:"display:flex;gap:10px;flex-wrap:wrap;align-items:center" }, [email, role, btn]),
      el("div", { class:"muted" }, "Invites create a pending access request.")
    ]);

    const table = el("table", { style:"margin-top:14px" }, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "Email"),
        el("th", {}, "Role"),
        el("th", {}, "Status"),
        el("th", {}, "Created"),
        el("th", {}, "Actions"),
      ])),
      el("tbody", {}, invites.map(inv => {
        const del = el("button", { class:"btn btnDanger", type:"button" }, "Delete");
        del.addEventListener("click", () => onDelete(inv));

        const resend = el("button", { class:"btn btnGhost", type:"button" }, "Resend");
        resend.addEventListener("click", () => onResend(inv));

        return el("tr", {}, [
          el("td", {}, el("div", { style:"font-weight:900;word-break:break-all" }, inv.email || "—")),
          el("td", {}, el("span", { class:"pill" }, inv.role || "member")),
          el("td", {}, el("span", { class:"pill" }, inv.status || "pending")),
          el("td", {}, el("span", { class:"pill" }, fmtDate(inv.created_at))),
          el("td", {}, el("div", { style:"display:flex;gap:10px;flex-wrap:wrap" }, [resend, del])),
        ]);
      }))
    ]);

    slot.innerHTML = "";
    slot.appendChild(form);

    if (!invites.length){
      slot.appendChild(el("div", { class:"muted", style:"margin-top:12px" }, "No invites yet."));
      return;
    }
    slot.appendChild(table);
  }

  async function open({ supabase, token }) {
    const sb = supabase;
    const tkn = String(token || "").trim();
    const modal = buildModalShell();

    const panel = el("div", { class:"panel" });
    const header = el("div", { class:"ph" });
    const headerLeft = el("div", { class:"phL" });
    const headerRight = el("div", { style:"display:flex;gap:10px;flex-wrap:wrap;align-items:center" });

    const tabs = el("div", { class:"tabs" }, [
      el("button", { class:"tab", type:"button", "data-tab":"members", "data-active":"1" }, "Members"),
      el("button", { class:"tab", type:"button", "data-tab":"invites" }, "Invites"),
    ]);

    const statusLine = el("div", { class:"muted" }, "Connecting…");
    const slot = el("div", {});

    headerLeft.appendChild(el("div", { class:"h" }, "Manage"));
    headerLeft.appendChild(el("div", { class:"p" }, "Members list and invitations"));
    headerRight.appendChild(tabs);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);

    const content = el("div", { class:"pc" }, [statusLine, el("div", { style:"height:12px" }), slot]);
    panel.appendChild(header);
    panel.appendChild(content);

    modal.body.appendChild(panel);

    if (!sb || !sb.from) {
      statusLine.className = "err";
      statusLine.textContent = "Supabase client missing. Open from dashboard with { supabase }.";
      return;
    }
    if (!tkn) {
      statusLine.className = "err";
      statusLine.textContent = "Missing dashboard token.";
      return;
    }

    // Optional debug block (hidden by default)
    if (isDebug()) {
      const { session } = await safeSession(sb);
      const dbg = el("div", { class:"panel", style:"margin-top:14px" }, [
        el("div", { class:"ph" }, [
          el("div", { class:"phL" }, [
            el("div", { class:"h" }, "Debug"),
            el("div", { class:"p" }, "Visible only with ?debug=1"),
          ]),
        ]),
        el("div", { class:"pc" }, [
          el("div", { class:"muted", style:"font-weight:900" }, `Signed in: ${session?.user?.email || "—"}`),
          el("div", { class:"muted", style:"margin-top:8px;font-weight:900;word-break:break-all" }, `Token: ${tkn}`),
        ])
      ]);
      modal.body.appendChild(dbg);
    }

    let company = null;
    let members = [];
    let invites = [];

    async function refreshAll(){
      statusLine.className = "muted";
      statusLine.textContent = "Loading…";

      company = await getCompanyByToken(sb, tkn);
      members = await listMembers(sb, company.id);
      invites = await listInvites(sb, company.id);

      statusLine.className = "muted";
      statusLine.textContent = `Company: ${company.name || company.slug || company.id}`;
      renderTab(tabs.querySelector('.tab[data-active="1"]')?.dataset?.tab || "members");
    }

    function renderTab(name){
      setActiveTab(tabs, name);
      slot.innerHTML = "";

      if (name === "members") {
        renderMembers(
          slot,
          company.id,
          members,
          async (m, newRole) => {
            try{
              await updateMemberRole(sb, company.id, m.user_id, newRole);
              await refreshAll();
            }catch(e){
              alert("Role update failed: " + (e?.message || e));
            }
          },
          async (m) => {
            const ok = confirm("Remove this member from the company?");
            if (!ok) return;
            try{
              await removeMember(sb, company.id, m.user_id);
              await refreshAll();
            }catch(e){
              alert("Remove failed: " + (e?.message || e));
            }
          }
        );
      } else {
        renderInvites(
          slot,
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
              await deleteInvite(sb, inv.id);
              await refreshAll();
            }catch(e){
              alert("Delete failed: " + (e?.message || e));
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

    tabs.addEventListener("click", (e) => {
      const b = e.target.closest(".tab");
      if (!b) return;
      renderTab(b.dataset.tab);
    });

    try{
      await refreshAll();
    }catch(e){
      console.warn("[Users&Roles] init error:", e);
      statusLine.className = "err";
      statusLine.textContent = "Failed to connect. Check RLS and table names.";
      slot.innerHTML = "";
      slot.appendChild(el("div", { class:"err" }, String(e?.message || e)));
    }
  }

  window.UlydiaUsersRoles = { open };
})();

