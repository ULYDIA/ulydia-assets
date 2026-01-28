
/* sponsorship-page.v2.3.js — Ulydia
   Fixes:
   - Preview job page always uses latest chosen images (preview_* params + cache-bust)
   - No undefined vars (curLandscapeUrl / curSquareUrl)
   - No URL inputs for images (only buttons + preview)
   - Better error surfaces
*/
(() => {
  const WORKER_URL    = "https://ulydia-business.contact-871.workers.dev";
  const PROXY_SECRET  = "ulydia_2026_proxy_Y4b364u2wsFsQL";
  const JOB_BASE_PATH = "/fiche-metiers/"; // ✅ ton chemin

  const qp = (name) => new URLSearchParams(location.search).get(name);

  if (window.__ULYDIA_SPONSORSHIP_PAGE_V23__) return;
  window.__ULYDIA_SPONSORSHIP_PAGE_V23__ = true;

  // ---------------- helpers ----------------
  function apiBase(){ return WORKER_URL.replace(/\/$/, ""); }

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "style") n.style.cssText = v;
      else if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = String(v ?? "");
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, String(v));
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c === null || c === undefined) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function esc(s){
    return String(s ?? "").replace(/[<>&]/g, ch => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[ch]));
  }

  function injectStylesOnce() {
    if (document.getElementById("ulydia_sponsorship_css")) return;
    const css = `
:root{
  --ul-font:'Montserrat',system-ui,-apple-system,Segoe UI,Roboto,Arial;
  --ul-red:#c00102;
  --ul-ink:#0f172a;
  --ul-border:#cbd5e1;
  --ul-bg:#ffffff;
  --ul-soft:#f8fafc;
}
body{ font-family:var(--ul-font); }

.u-wrap{max-width:1200px;margin:32px auto;padding:0}
.u-card{border:1px solid var(--ul-border);border-radius:18px;background:var(--ul-bg);overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.u-top{display:flex;gap:16px;justify-content:space-between;align-items:flex-start;padding:18px;border-bottom:1px solid var(--ul-border);background:var(--ul-soft)}
.u-title{font-size:18px;font-weight:900;margin:0;color:var(--ul-ink)}
.u-sub{font-size:13px;opacity:.75;margin-top:4px}
.u-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}

.u-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:14px;text-decoration:none;font-weight:900;font-size:13px;border:1px solid transparent;cursor:pointer}
.u-btnPrimary{background:var(--ul-red);color:#fff;border-color:var(--ul-red)}
.u-btnPrimary:hover{filter:brightness(.95)}
.u-btnGhost{background:#fff;color:var(--ul-ink);border-color:var(--ul-border)}
.u-btn:disabled{opacity:.6;cursor:not-allowed}

.u-detailGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:14px 18px}
.u-mini{border:1px solid #e5e7eb;border-radius:18px;padding:14px;background:#fff}
.u-miniLabel{font-size:12px;opacity:.6;text-transform:uppercase;letter-spacing:.02em;margin-bottom:8px}
.u-miniVal{font-size:16px;font-weight:800;color:var(--ul-ink);line-height:1.2}

.u-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px 18px}
.u-box{border:1px solid var(--ul-border);border-radius:16px;background:#fff;padding:12px}
.u-boxTitle{font-size:12px;opacity:.65;margin-bottom:8px;text-transform:uppercase;letter-spacing:.02em}
.u-input{width:100%;border:1px solid var(--ul-border);border-radius:14px;padding:10px 12px;font-weight:800;font-size:13px;outline:none}

.u-previewWrap{border:1px dashed var(--ul-border);border-radius:16px;padding:10px;margin-top:10px;background:var(--ul-soft);min-height:140px}
.u-previewImg{display:block;width:100%;height:auto;border-radius:14px;border:1px solid #e2e8f0;background:#fff}
.u-previewSquare{width:300px;height:300px;object-fit:contain;margin:0 auto}
.u-previewLandscape{max-width:680px;margin:0 auto}

.u-rowActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}

.u-head,.u-row{display:grid;grid-template-columns:1fr .7fr .7fr .7fr;gap:12px;align-items:center}
.u-head{padding:12px 18px;font-size:12px;text-transform:uppercase;letter-spacing:.02em;opacity:.75;border-top:1px solid var(--ul-border);border-bottom:1px solid var(--ul-border);background:#fff}
.u-row{padding:14px 18px;border-top:1px solid #e2e8f0;background:#fff}
.u-row:hover{background:#f9fafb}
.u-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:900}
.u-ok{background:#ecfdf5;color:#065f46}
.u-warn{background:#fffbeb;color:#92400e}
.u-bad{background:#fef2f2;color:#991b1b}
.u-muted{background:#f1f5f9;color:#334155}

.u-empty{padding:18px;opacity:.8}
.u-error{padding:18px;color:#991b1b;background:#fef2f2}
.u-debug{padding:12px 18px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:12px;white-space:pre-wrap;background:#0b1220;color:#e2e8f0}

@media (max-width: 980px){ .u-grid2{grid-template-columns:1fr} .u-detailGrid{grid-template-columns:repeat(2,minmax(0,1fr))} }
@media (max-width: 860px){ .u-head{display:none} .u-row{grid-template-columns:1fr 1fr;grid-auto-rows:auto} }
    `;
    const style = document.createElement("style");
    style.id = "ulydia_sponsorship_css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // overlay loader (utilise ton CSS HEAD si présent, sinon fallback simple)
  function ensureOverlayCss(){
    if (document.getElementById("ulydia_overlay_fallback_css")) return;
    const css = `
.u-overlay{position:fixed; inset:0; z-index:999999; background:rgba(255,255,255,.92); display:flex; align-items:center; justify-content:center; padding:18px;}
.u-overlayCard{width:min(640px,92vw); border:1px solid #e5e7eb; border-radius:18px; background:#fff; box-shadow:0 14px 40px rgba(15,23,42,.10); padding:18px;}
.u-overlayRow{display:flex;align-items:center;gap:12px}
.u-spinner{width:18px;height:18px;border-radius:50%; border:2px solid rgba(15,23,42,.18); border-top-color:#c00102; animation:uSpin .75s linear infinite;}
@keyframes uSpin{to{transform:rotate(360deg)}}
.u-overlayTitle{font-weight:900;color:#0f172a;font-size:14px}
.u-overlaySub{font-size:13px;opacity:.7;margin-top:6px;line-height:1.35}
    `;
    const st = document.createElement("style");
    st.id = "ulydia_overlay_fallback_css";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function showLoaderOverlay(message){
    injectStylesOnce();
    ensureOverlayCss();

    let ov = document.getElementById("ulydia_overlay_loader");
    if (!ov){
      ov = el("div", { id:"ulydia_overlay_loader", class:"u-overlay" }, [
        el("div", { class:"u-overlayCard" }, [
          el("div", { class:"u-overlayRow" }, [
            el("div", { class:"u-spinner" }),
            el("div", {}, [
              el("div", { class:"u-overlayTitle", id:"ulydia_overlay_title" }, message || "Loading…"),
              el("div", { class:"u-overlaySub" }, "Please wait a moment.")
            ])
          ])
        ])
      ]);
      document.body.appendChild(ov);
    }
    const t = document.getElementById("ulydia_overlay_title");
    if (t) t.textContent = message || "Loading…";
  }

  function hideLoaderOverlay(){
    const ov = document.getElementById("ulydia_overlay_loader");
    if (ov) ov.remove();
  }

  function isHttpUrl(u){ return /^https?:\/\//i.test(String(u||"").trim()); }

  function fmtDateFromUnix(ts) {
    const n = Number(ts || 0);
    if (!n) return "—";
    return new Intl.DateTimeFormat("fr-FR", { year:"numeric", month:"short", day:"2-digit" })
      .format(new Date(n * 1000));
  }

  function fmtMoney(cents, currency) {
    if (cents == null) return "—";
    const cur = String(currency || "usd").toUpperCase();
    return new Intl.NumberFormat(undefined, { style:"currency", currency: cur })
      .format(Number(cents)/100);
  }

  function statusBadge(v) {
    const s = String(v||"").toLowerCase();
    if (s === "paid") return { cls:"u-ok", text:"Paid" };
    if (s === "open") return { cls:"u-warn", text:"Open" };
    if (s === "void" || s === "uncollectible") return { cls:"u-bad", text:s };
    return { cls:"u-muted", text:(s||"unknown") };
  }

  function metierSlugToTitle(slug) {
    const s = String(slug || "").trim();
    if (!s) return "";
    const lowerWords = new Set(["de","du","des","la","le","les","d","et","à","au","aux","en","pour","sur"]);
    return s
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w, i) => {
        const lw = w.toLowerCase();
        if (i > 0 && lowerWords.has(lw)) return lw;
        return lw.charAt(0).toUpperCase() + lw.slice(1);
      })
      .join(" ");
  }

  function addIntervalDate(startUnix, interval, intervalCount) {
    const s = Number(startUnix || 0);
    if (!s) return null;
    const d = new Date(s * 1000);
    const count = Number(intervalCount || 1);
    if (interval === "year") d.setFullYear(d.getFullYear() + count);
    else d.setMonth(d.getMonth() + count);
    return Math.floor(d.getTime() / 1000);
  }

  // Uploadcare
  function ensureUploadcare() {
    if (!window.UPLOADCARE_PUBLIC_KEY) throw new Error("Missing UPLOADCARE_PUBLIC_KEY (in <head>)");
    if (!window.uploadcare || !window.uploadcare.openDialog) throw new Error("Uploadcare not loaded");
  }
  function openUploadcareDialog({ crop }) {
    ensureUploadcare();
    const dialog = window.uploadcare.openDialog(null, { imagesOnly: true, crop: crop || "" });
    return new Promise((resolve) => {
      dialog
        .done((file) => file.done((info) => resolve(info?.cdnUrl || "")).fail(() => resolve("")))
        .fail(() => resolve(""));
    });
  }

  async function getJson(path) {
    const url = apiBase() + path;
    const res = await fetch(url, { method:"GET", cache:"no-store" });

    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!res.ok) {
      const msg = data?.error || data?.message || `API error (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.url = url;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function postJson(path, payload) {
    const url = apiBase() + path;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": PROXY_SECRET
      },
      body: JSON.stringify(payload || {}),
      cache:"no-store"
    });

    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!res.ok) {
      const msg = data?.error || data?.message || `API error (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.url = url;
      err.data = data;
      throw err;
    }
    return data;
  }

  function addCacheBust(u){
    const raw = String(u||"").trim();
    if (!isHttpUrl(raw)) return "";
    try {
      const x = new URL(raw);
      x.searchParams.set("ul_preview", String(Date.now()));
      return x.toString();
    } catch {
      // fallback
      const sep = raw.includes("?") ? "&" : "?";
      return raw + sep + "ul_preview=" + Date.now();
    }
  }

  function buildPreviewUrl({ token, metierSlug, country, landscapeUrl, squareUrl, linkUrl }) {
    const slug = String(metierSlug || "").trim().replace(/^\/+|\/+$/g, "");
    if (!slug) return "";

    const base = window.location.origin.replace(/\/$/, "");
    const u = new URL(base + JOB_BASE_PATH + encodeURIComponent(slug));

    u.searchParams.set("preview", "1");
    u.searchParams.set("preview_ts", String(Date.now())); // ✅ utile côté metier-page.js si tu veux

    if (country) u.searchParams.set("country", String(country).toUpperCase());
    if (isHttpUrl(landscapeUrl)) u.searchParams.set("preview_landscape", addCacheBust(landscapeUrl));
    if (isHttpUrl(squareUrl))   u.searchParams.set("preview_square", addCacheBust(squareUrl));
    if (isHttpUrl(linkUrl))     u.searchParams.set("preview_link", linkUrl);
    if (token) u.searchParams.set("from_token", token);

    return u.toString();
  }

  function mapManage(raw){
    const d = raw || {};
    return {
      metier: String(d.metier || d.job || d.metier_slug || "").trim(),
      metierTitle: String(d.metier_title || d.metierTitle || "").trim(),
      country: String(d.country || d.pays || d.PAYS || "").trim(),
      status: String(d.status || d.stripe_status || "unknown").trim().toLowerCase(),
      sponsorLink: String(d.sponsor_link || d.link || "").trim(),
      squareUrl: String(d.logo_1_url || d.sponsor_logo_1_url || d.sponsor_logo_1 || "").trim(),
      landscapeUrl: String(d.logo_2_url || d.sponsor_logo_2_url || d.sponsor_logo_2 || "").trim()
    };
  }

  function extractStripeParts(detailRaw){
    const base = (detailRaw && detailRaw.stripe) ? detailRaw.stripe : (detailRaw || {});
    const sub = base.subscription || base.sub || {};
    const pm = base.payment_method || base.default_payment_method || sub.default_payment_method || null;
    const price = base.price || (sub.items?.data?.[0]?.price || null);
    return { sub, pm, price };
  }

  function formatPayment(pm){
    if (!pm) return "—";
    const type = pm.type || "";
    const card = pm.card || null;
    const sepa = pm.sepa_debit || null;
    const link = (type === "link");

    if (card) {
      const brand = String(card.brand || "").toUpperCase() || "CARD";
      const last4 = card.last4 ? `•••• ${card.last4}` : "";
      const exp = (card.exp_month && card.exp_year) ? `(${card.exp_month}/${card.exp_year})` : "";
      return [brand, last4, exp].filter(Boolean).join(" ") || "—";
    }
    if (sepa) {
      const last4 = sepa.last4 ? `•••• ${sepa.last4}` : "";
      return ("SEPA " + last4).trim() || "SEPA";
    }
    if (link) return "Stripe Link";
    if (type) return String(type).toUpperCase();
    return "—";
  }

  function setImg(imgEl, url){
    imgEl.src = isHttpUrl(url) ? url : "";
  }

  // ------------ UI ------------
  function buildUI(root, manageRaw, stripeDetailRaw, invoicesRaw, token, debugText) {
    injectStylesOnce();
    root.innerHTML = "";

    const manage = mapManage(manageRaw);

    // ✅ état “live” (modifié par Uploadcare)
    let curLandscapeUrl = (manage.landscapeUrl || "").trim();
    let curSquareUrl    = (manage.squareUrl || "").trim();

    const metierDisplay = manage.metierTitle || metierSlugToTitle(manage.metier);
    const { sub, pm, price } = extractStripeParts(stripeDetailRaw);

    const startUnix = sub.current_period_start || sub.created || null;
    let endUnix = sub.current_period_end || null;

    if (!endUnix || (startUnix && endUnix <= startUnix)) {
      endUnix = addIntervalDate(
        startUnix,
        price?.recurring?.interval || price?.interval || "month",
        price?.recurring?.interval_count || price?.interval_count || 1
      );
    }

    const start = fmtDateFromUnix(startUnix);
    const periodTxt = (startUnix && endUnix) ? `${fmtDateFromUnix(startUnix)} – ${fmtDateFromUnix(endUnix)}` : "—";

    const interval = price?.recurring?.interval || price?.interval || "month";
    const priceTxt = (price && price.unit_amount != null)
      ? `${fmtMoney(price.unit_amount, price.currency)} / ${interval}`
      : "—";

    const cardTxt = formatPayment(pm);
    const cancelTxt = (sub.cancel_at_period_end === true) ? "Yes" : "No";
    const statusTxt = String(sub.status || manage.status || "unknown");

    const wrap = el("div", { class: "u-wrap u-card" });

    const topLeft = el("div", {}, [
      el("div", { class:"u-title" }, `Sponsorship — ${metierDisplay || "—"} / ${manage.country || "—"}`),
      el("div", { class:"u-sub" }, `Status: ${statusTxt}`)
    ]);

    const btnBack = el("a", {
      class:"u-btn u-btnGhost",
      href: "/my-account?token=" + encodeURIComponent(token || "")
    }, "Back to dashboard");

    wrap.appendChild(el("div", { class:"u-top" }, [
      topLeft,
      el("div", { class:"u-actions" }, [btnBack])
    ]));

    wrap.appendChild(el("div", { class:"u-detailGrid" }, [
      el("div", { class:"u-mini" }, [el("div", { class:"u-miniLabel" }, "Start"),          el("div", { class:"u-miniVal" }, start)]),
      el("div", { class:"u-mini" }, [el("div", { class:"u-miniLabel" }, "Current period"), el("div", { class:"u-miniVal" }, periodTxt)]),
      el("div", { class:"u-mini" }, [el("div", { class:"u-miniLabel" }, "Price"),          el("div", { class:"u-miniVal" }, priceTxt)]),
      el("div", { class:"u-mini" }, [el("div", { class:"u-miniLabel" }, "Card"),           el("div", { class:"u-miniVal" }, cardTxt)]),
      el("div", { class:"u-mini" }, [el("div", { class:"u-miniLabel" }, "Status"),         el("div", { class:"u-miniVal" }, statusTxt reminderSafe(statusTxt))]),
      el("div", { class:"u-mini" }, [el("div", { class:"u-miniLabel" }, "Cancellation"),   el("div", { class:"u-miniVal" }, cancelTxt)])
    ]));

    // Sponsor link input (OK à garder)
    const inputLink = el("input", { class:"u-input", value: manage.sponsorLink, placeholder:"https://example.com" });

    // Preview imgs
    const imgLandscape = el("img", { class:"u-previewImg u-previewLandscape", alt:"Landscape preview" });
    const imgSquare    = el("img", { class:"u-previewImg u-previewSquare", alt:"Square preview" });
    setImg(imgLandscape, curLandscapeUrl);
    setImg(imgSquare, curSquareUrl);

    const btnUploadLandscape = el("button", { class:"u-btn u-btnGhost", type:"button" }, "Change landscape");
    const btnUploadSquare    = el("button", { class:"u-btn u-btnGhost", type:"button" }, "Change square");

    const previewLink = el("a", {
      class:"u-btn u-btnGhost",
      target:"_blank",
      rel:"noopener",
      href:"#",
      style:"opacity:.6;pointer-events:none"
    }, "Preview job page");

    function refreshPreview() {
      const url = buildPreviewUrl({
        token,
        metierSlug: manage.metier,
        country: manage.country,
        landscapeUrl: curLandscapeUrl,
        squareUrl: curSquareUrl,
        linkUrl: inputLink.value.trim()
      });

      if (url) {
        previewLink.href = url;
        previewLink.style.opacity = "1";
        previewLink.style.pointerEvents = "";
      } else {
        previewLink.href = "#";
        previewLink.style.opacity = ".6";
        previewLink.style.pointerEvents = "none";
      }
    }

    inputLink.addEventListener("input", refreshPreview);

    btnUploadLandscape.addEventListener("click", async (e) => {
      e.preventDefault();
      btnUploadLandscape.disabled = true;
      btnUploadLandscape.textContent = "Opening…";
      try {
        const url = await openUploadcareDialog({ crop: "680x120" });
        if (!url) return;
        curLandscapeUrl = String(url).trim();
        setImg(imgLandscape, curLandscapeUrl);
        refreshPreview();
      } catch (err) {
        console.warn(err);
      } finally {
        btnUploadLandscape.disabled = false;
        btnUploadLandscape.textContent = "Change landscape";
      }
    });

    btnUploadSquare.addEventListener("click", async (e) => {
      e.preventDefault();
      btnUploadSquare.disabled = true;
      btnUploadSquare.textContent = "Opening…";
      try {
        const url = await openUploadcareDialog({ crop: "300x300" });
        if (!url) return;
        curSquareUrl = String(url).trim();
        setImg(imgSquare, curSquareUrl);
        refreshPreview();
      } catch (err) {
        console.warn(err);
      } finally {
        btnUploadSquare.disabled = false;
        btnUploadSquare.textContent = "Change square";
      }
    });

    const btnSave = el("button", { class:"u-btn u-btnPrimary", type:"button" }, "Save changes");
    btnSave.addEventListener("click", async () => {
      const linkUrl = inputLink.value.trim();

      if (linkUrl && !isHttpUrl(linkUrl)) return alert("Sponsor link must be a valid https URL.");
      if (curLandscapeUrl && !isHttpUrl(curLandscapeUrl)) return alert("Landscape must be a valid https image URL.");
      if (curSquareUrl && !isHttpUrl(curSquareUrl)) return alert("Square must be a valid https image URL.");

      try {
        btnSave.disabled = true;
        btnSave.textContent = "Saving…";

        await postJson("/sponsor-update", {
          token,
          sponsor_link: linkUrl,
          sponsor_logo_1_url: curSquareUrl,
          sponsor_logo_2_url: curLandscapeUrl,

          // compat si tu veux (safe)
          sponsor_logo_square_url: curSquareUrl,
          sponsor_logo_landscape_url: curLandscapeUrl
        });

        alert("Saved ✅");
        location.reload();
      } catch (e) {
        console.warn(e);
        alert("Save failed: " + (e?.message || "unknown error"));
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = "Save changes";
      }
    });

    // Images section (no URL inputs)
    wrap.appendChild(el("div", { class:"u-grid2" }, [
      el("div", { class:"u-box" }, [
        el("div", { class:"u-boxTitle" }, "Landscape banner"),
        el("div", { class:"u-rowActions" }, [btnUploadLandscape]),
        el("div", { class:"u-previewWrap" }, [imgLandscape])
      ]),
      el("div", { class:"u-box" }, [
        el("div", { class:"u-boxTitle" }, "Square logo"),
        el("div", { class:"u-rowActions" }, [btnUploadSquare]),
        el("div", { class:"u-previewWrap" }, [imgSquare])
      ])
    ]));

    wrap.appendChild(el("div", { class:"u-box", style:"margin:14px 18px 18px 18px" }, [
      el("div", { class:"u-boxTitle" }, "Sponsor link (redirect)"),
      inputLink,
      el("div", { class:"u-rowActions" }, [previewLink, btnSave])
    ]));

    // Invoices
    const inv = Array.isArray(invoicesRaw?.invoices) ? invoicesRaw.invoices : (Array.isArray(invoicesRaw) ? invoicesRaw : []);
    wrap.appendChild(el("div", { class:"u-head" }, [
      el("div", {}, "Date"),
      el("div", {}, "Amount"),
      el("div", {}, "Status"),
      el("div", {}, "")
    ]));

    const list = el("div", {});
    if (!inv.length) {
      list.appendChild(el("div", { class:"u-empty" }, "No invoices for this sponsorship."));
    } else {
      const rows = inv.slice().sort((a,b) => Number(b.created||0) - Number(a.created||0));
      rows.forEach(x => {
        const b = statusBadge(x.status);
        const date = fmtDateFromUnix(x.created);
        const amount = (x.amount_paid != null) ? fmtMoney(x.amount_paid, x.currency) : fmtMoney(x.amount_due || 0, x.currency);
        const link = x.invoice_pdf || x.hosted_invoice_url || "";

        const btn = el("a", { class:"u-btn u-btnPrimary", href: link || "#", target:"_blank", rel:"noopener" }, "Open PDF");
        if (!link) { btn.style.pointerEvents = "none"; btn.style.opacity = ".6"; }

        list.appendChild(el("div", { class:"u-row" }, [
          el("div", {}, date),
          el("div", {}, amount),
          el("div", {}, el("span", { class:`u-badge ${b.cls}` }, b.text)),
          el("div", {}, btn)
        ]));
      });
    }
    wrap.appendChild(list);

    if (debugText) wrap.appendChild(el("div", { class:"u-debug" }, debugText));

    root.appendChild(wrap);
    refreshPreview();
  }

  // tiny helper (avoid undefined in template)
  function reminderSafe(x){ return x ? "" : ""; }

  function renderError(root, title, err) {
    injectStylesOnce();
    const msg = [
      title,
      err?.message ? `message: ${err.message}` : "",
      err?.status ? `status: ${err.status}` : "",
      err?.url ? `url: ${err.url}` : "",
      err?.data ? `data: ${JSON.stringify(err.data, null, 2)}` : ""
    ].filter(Boolean).join("\n");

    console.warn("[ULYDIA] Sponsorship load error:", err);

    root.innerHTML = `
      <div class="u-wrap u-card">
        <div class="u-error"><b>Unable to load sponsorship.</b><br/>Check debug below.</div>
        <div class="u-debug">${esc(msg)}</div>
      </div>
    `;
  }

  // ---------------- boot ----------------
  document.addEventListener("DOMContentLoaded", async () => {
    const token = (qp("token") || "").trim();
    const root = document.querySelector('[data-sponsorship-root="1"],[data-sponsorship-root]');
    if (!root) return;

    injectStylesOnce();
    showLoaderOverlay("Loading sponsorship…");

    if (!token) {
      hideLoaderOverlay();
      root.innerHTML = `<div class="u-wrap u-card"><div class="u-error"><b>Token missing</b> — use <code>?token=...</code></div></div>`;
      return;
    }

    try {
      showLoaderOverlay("Loading sponsorship data…");

      const manage = await getJson("/sponsor-manage?token=" + encodeURIComponent(token));

      let stripeDetail = {};
      let invoices = {};
      let debug = "";

      try { stripeDetail = await getJson("/sponsorship/detail?token=" + encodeURIComponent(token)); }
      catch (e){ debug += `DETAIL failed: ${e.message}\n`; }

      try { invoices = await getJson("/sponsorship/invoices?token=" + encodeURIComponent(token)); }
      catch (e){ debug += `INVOICES failed: ${e.message}\n`; }

      buildUI(root, manage || {}, stripeDetail || {}, invoices || {}, token, debug.trim());
    } catch (e) {
      renderError(root, "MANAGE failed", e);
    } finally {
      hideLoaderOverlay();
    }
  });
})();



</script>





<Script>

// SIGNIN OBLIGATOIRE POUR ACCEDER A LA PAGE

(() => {
  const SUPABASE_URL = "https://zwnkscepqwujkcxusknn.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bmtzY2VwcXd1amtjeHVza25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDY1OTIsImV4cCI6MjA4MzgyMjU5Mn0.WALx2WeXlCDWhD0JA8L0inPBDtlJOlh9UQm7Z-U2D38";

  const LOGIN_URL = "/login";

  // 1) Anti-flash: hide page immediately
  try {
    document.documentElement.style.opacity = "0";
  } catch(e){}

  function redirectToLogin() {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(`${LOGIN_URL}?next=${next}`);
  }

  // 2) Fail-closed: if SDK missing -> redirect
  if (!window.supabase?.createClient) {
    redirectToLogin();
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 3) Check session
  supabase.auth.getSession().then(({ data }) => {
    if (!data?.session) {
      redirectToLogin();
      return;
    }
    // Logged in -> show page
    try {
      document.documentElement.style.opacity = "1";
    } catch(e){}
  }).catch(() => {
    // Any error -> redirect
    redirectToLogin();
  });
})();


