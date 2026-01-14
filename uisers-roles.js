/* users-roles.js — Ulydia (public asset)
   - Expose: window.UlydiaUsersRoles.open({ token })
   - No auto button injection
   - Uses existing window.supabase (supabase-js v2) if present
*/
(() => {
  if (window.__ULYDIA_USERS_ROLES_V1__) return;
  window.__ULYDIA_USERS_ROLES_V1__ = true;

  const SUPABASE_URL = "https://zwnkscepqwujkcxusknn.supabase.co";

  // ✅ Put your anon key here OR set it before loading script:
  // window.ULYDIA_SUPABASE_ANON_KEY = "....";
  const SUPABASE_ANON_KEY =
    (window.ULYDIA_SUPABASE_ANON_KEY || "").trim() ||
    (window.__ULYDIA_SUPABASE_ANON_KEY || "").trim() ||
    ""; // keep empty if you already create the client elsewhere

  const STORAGE_KEY = "ulydia_auth_v1";

  // ---------------- tiny helpers ----------------
  const $ = (s, r = document) => r.querySelector(s);

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

  function ensureCSS() {
    if ($("#u_users_roles_css")) return;
    const style = el("style", { id: "u_users_roles_css" });
    style.textContent = `
      .uUR_overlay{position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:18px}
      .uUR_card{width:min(980px,96vw);background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 14px 40px rgba(15,23,42,.18);overflow:hidden}
      .uUR_top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e5e7eb}
      .uUR_title{font-size:20px;font-weight:900;color:#0f172a}
      .uUR_close{width:44px;height:44px;border-radius:14px;border:1px solid #d1d5db;background:#fff;color:#2563eb;cursor:pointer}
      .uUR_body{padding:18px}
      .uUR_h{font-size:14px;font-weight:900;margin:0 0 10px;color:#0f172a}
      .uUR_p{margin:0;opacity:.8;line-height:1.45}
      .uUR_box{margin-top:14px;border:1px solid #e5e7eb;border-radius:14px;padding:14px;background:#fafafa}
      .uUR_row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
      .uUR_btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:12px;border:1px solid #d1d5db;background:#fff;color:#0f172a;font-weight:900;font-size:13px;cursor:pointer}
      .uUR_btnPrimary{background:#2563eb;color:#fff;border-color:#2563eb}
      .uUR_err{padding:12px 14px;border-radius:12px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;font-weight:800}
      .uUR_code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;opacity:.85;word-break:break-all}
    `;
    document.head.appendChild(style);
  }

  function getSb() {
    // Reuse the client created in your my-account script if available
    if (window.__ULYDIA_SUPABASE__) return window.__ULYDIA_SUPABASE__;

    // Or reuse an existing one
    if (window.__ULYDIA_SUPABASE_CLIENT__) return window.__ULYDIA_SUPABASE_CLIENT__;

    // Or create if supabase-js v2 is loaded and anon key is provided
    if (window.supabase?.createClient && SUPABASE_ANON_KEY) {
      window.__ULYDIA_SUPABASE_CLIENT__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: STORAGE_KEY }
      });
      return window.__ULYDIA_SUPABASE_CLIENT__;
    }
    return null;
  }

  function openModal() {
    ensureCSS();

    // close existing
    const old = $("#u_users_roles_overlay");
    if (old) old.remove();

    const overlay = el("div", { class: "uUR_overlay", id: "u_users_roles_overlay" });
    const card = el("div", { class: "uUR_card" });

    const close = () => overlay.remove();

    const top = el("div", { class: "uUR_top" }, [
      el("div", { class: "uUR_title" }, "Users & Roles"),
      (() => {
        const b = el("button", { class: "uUR_close", type: "button" }, "✕");
        b.addEventListener("click", close);
        return b;
      })()
    ]);

    const body = el("div", { class: "uUR_body" }, [
      el("div", { class: "uUR_box" }, [
        el("div", { class: "uUR_h" }, "Loading…"),
        el("div", { class: "uUR_p" }, "Fetching session & company context.")
      ])
    ]);

    card.appendChild(top);
    card.appendChild(body);
    overlay.appendChild(card);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function onKey(e){
      if (e.key === "Escape") {
        document.removeEventListener("keydown", onKey);
        close();
      }
    });

    document.body.appendChild(overlay);
    return { overlay, body, close };
  }

  async function open(ctx = {}) {
    const modal = openModal();
    const token = String(ctx.token || "").trim();

    const sb = getSb();
    if (!sb) {
      modal.body.innerHTML = "";
      modal.body.appendChild(el("div", { class: "uUR_err" }, "Supabase client not available. Load supabase-js v2 + provide anon key."));
      modal.body.appendChild(el("div", { class: "uUR_box" }, [
        el("div", { class: "uUR_h" }, "Debug"),
        el("div", { class: "uUR_code" }, "window.supabase?.createClient is missing OR anon key not set."),
      ]));
      return;
    }

    try {
      const { data } = await sb.auth.getSession();
      const session = data?.session;

      modal.body.innerHTML = "";
      modal.body.appendChild(el("div", { class: "uUR_box" }, [
        el("div", { class: "uUR_h" }, "Session"),
        el("div", { class: "uUR_p" }, session?.user?.email ? `Logged in as ${session.user.email}` : "No session found."),
      ]));

      modal.body.appendChild(el("div", { class: "uUR_box" }, [
        el("div", { class: "uUR_h" }, "Dashboard token"),
        el("div", { class: "uUR_code" }, token || "—")
      ]));

      modal.body.appendChild(el("div", { class: "uUR_box" }, [
        el("div", { class: "uUR_row" }, [
          el("div", {}, [
            el("div", { class: "uUR_h" }, "Next step"),
            el("div", { class: "uUR_p" }, "Now we can plug: members list + invites + roles.")
          ]),
          el("button", { class: "uUR_btn uUR_btnPrimary", type:"button", onclick: () => modal.close() }, "Close")
        ])
      ]));

    } catch (e) {
      modal.body.innerHTML = "";
      modal.body.appendChild(el("div", { class: "uUR_err" }, "Failed to load Users & Roles."));
      modal.body.appendChild(el("div", { class: "uUR_box" }, [
        el("div", { class: "uUR_h" }, "Error"),
        el("div", { class: "uUR_code" }, String(e?.message || e))
      ]));
    }
  }

  // ✅ Expose API
  window.UlydiaUsersRoles = { open };
})();
