/**
 * ULYDIA - RNCP PAGE (MONO)
 * Version: v2026-02-19.FINAL.LEFT-DESC+RIGHT-INFOS+PROGRAMMES
 *
 * Expected Webflow structure (minimal):
 *  - Left column container:  .rncp-left-column   (long content)
 *  - Right column container: .rncp-right-column  (key infos + programmes list)
 *
 * Data source:
 *  - GET /v1/formation-rncp?id=<rncp_id_fiche>&iso=<ISO2>
 *
 * Notes:
 *  - Safe to include site-wide: it only runs when ?id= is present.
 *  - Injects its own lightweight CSS (scoped by .ulydia-rncp).
 */

(() => {
  if (window.__ULYDIA_RNCP_PAGE_MONO_V1__) return;
  window.__ULYDIA_RNCP_PAGE_MONO_V1__ = true;

  const $ = (sel, root = document) => root.querySelector(sel);

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function nl2p(text) {
    const t = String(text || "").trim();
    if (!t) return "";
    const parts = t.split(/\n\s*\n+/g).map(p => p.trim()).filter(Boolean);
    return parts.map(p => `<p class="ulydia-p">${escapeHtml(p).replaceAll(/\n/g, "<br>")}</p>`).join("");
  }

  function tryJsonParse(x) { try { return JSON.parse(x); } catch { return null; } }

  function injectCssOnce() {
    if (document.getElementById("ulydia-rncp-css")) return;
    const style = document.createElement("style");
    style.id = "ulydia-rncp-css";
    style.textContent = `
/* ===== ULYDIA RNCP (scoped) ===== */
.ulydia-rncp { font-family: inherit; }
.ulydia-rncp .ulydia-card {
  background: #fff;
  border: 1px solid rgba(17,24,39,.10);
  border-radius: 16px;
  padding: 18px 18px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
}
.ulydia-rncp .ulydia-card + .ulydia-card { margin-top: 14px; }

.ulydia-rncp .ulydia-h1 {
  font-size: 28px;
  line-height: 1.15;
  margin: 0 0 10px 0;
  letter-spacing: -0.02em;
}
.ulydia-rncp .ulydia-sub {
  font-size: 14px;
  opacity: .75;
  margin: 0;
}

.ulydia-rncp .ulydia-h3 {
  font-size: 16px;
  margin: 0 0 10px 0;
}
.ulydia-rncp .ulydia-p {
  font-size: 15px;
  line-height: 1.55;
  margin: 10px 0 0 0;
}
.ulydia-rncp .ulydia-kv {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.ulydia-rncp .ulydia-kv-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  align-items: start;
}
.ulydia-rncp .ulydia-k {
  font-size: 12px;
  opacity: .65;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.ulydia-rncp .ulydia-v {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
}
.ulydia-rncp .ulydia-badges { display: flex; flex-wrap: wrap; gap: 8px; }
.ulydia-rncp .ulydia-badge {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(17,24,39,.10);
  background: rgba(17,24,39,.03);
}
.ulydia-rncp .ulydia-prog-list { display: grid; gap: 10px; margin-top: 10px; }
.ulydia-rncp .ulydia-prog {
  border: 1px solid rgba(17,24,39,.10);
  border-radius: 14px;
  padding: 12px;
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 10px;
}
.ulydia-rncp .ulydia-prog .logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(17,24,39,.04);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ulydia-rncp .ulydia-prog .logo img { width: 100%; height: 100%; object-fit: cover; }
.ulydia-rncp .ulydia-prog .school { font-size: 12px; opacity: .7; margin-bottom: 2px; }
.ulydia-rncp .ulydia-prog .title { font-size: 14px; font-weight: 700; margin: 0 0 6px 0; }
.ulydia-rncp .ulydia-prog .meta { font-size: 12px; opacity: .7; }
.ulydia-rncp .ulydia-prog .cta {
  margin-top: 8px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  color: inherit;
  opacity: .9;
}
.ulydia-rncp .ulydia-prog .cta:hover { opacity: 1; text-decoration: underline; }

@media (max-width: 991px) {
  .ulydia-rncp .ulydia-kv-row { grid-template-columns: 1fr; gap: 4px; }
}
`;
    document.head.appendChild(style);
  }

  function getLang() {
    const p = window.location.pathname || "";
    const m = p.match(/^\/(fr|en|de|es|it)\b/i);
    return (m?.[1] || document.documentElement.lang || "fr").toLowerCase();
  }

  const I18N = {
    fr: {
      titleInfos: "Infos clés",
      titleDomains: "Domaines (NSF)",
      titleProgrammes: "Écoles & programmes",
      objectifs: "Objectifs & contexte",
      prerequis: "Prérequis",
      rncpCode: "Code",
      fiche: "Fiche",
      actif: "Actif",
      pays: "Pays",
      none: "—",
      viewProgramme: "Voir le programme"
    },
    en: {
      titleInfos: "Key info",
      titleDomains: "Domains (NSF)",
      titleProgrammes: "Schools & programmes",
      objectifs: "Objectives & context",
      prerequis: "Prerequisites",
      rncpCode: "Code",
      fiche: "File",
      actif: "Active",
      pays: "Country",
      none: "—",
      viewProgramme: "View programme"
    }
  };

  function t(key) {
    const lang = getLang();
    return (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key;
  }

  async function run() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const iso = (params.get("iso") || "FR").toUpperCase();

    if (!id) return;

    const left = $(".rncp-left-column");
    const right = $(".rncp-right-column");
    if (!left && !right) return;

    injectCssOnce();

    const endpoint = `/v1/formation-rncp?id=${encodeURIComponent(id)}&iso=${encodeURIComponent(iso)}`;
    let payload = null;

    try {
      const res = await fetch(endpoint, { headers: { "accept": "application/json" } });
      payload = await res.json();
    } catch (e) {
      console.warn("[RNCP] fetch failed", e);
      return;
    }

    if (!payload?.ok || !payload?.formation) return;

    const f = payload.formation;
    const programmes = Array.isArray(payload.programmes) ? payload.programmes : [];

    if (left) left.classList.add("ulydia-rncp");
    if (right) right.classList.add("ulydia-rncp");

    // ===== LEFT COLUMN (long content) =====
    if (left) {
      left.innerHTML = "";

      const header = document.createElement("div");
      header.className = "ulydia-card";
      header.innerHTML = `
        <h1 class="ulydia-h1">${escapeHtml(f.intitule || f.intitule_norm || "RNCP")}</h1>
        <p class="ulydia-sub">${escapeHtml((f.rncp_code_norm || f.rncp_code || "").toString())} • ${escapeHtml(iso)}</p>
      `;
      left.appendChild(header);

      if (f.objectifs_contexte) {
        const card = document.createElement("div");
        card.className = "ulydia-card";
        card.innerHTML = `
          <h3 class="ulydia-h3">${escapeHtml(t("objectifs"))}</h3>
          ${nl2p(f.objectifs_contexte)}
        `;
        left.appendChild(card);
      }

      if (f.prerequis_entree_formation) {
        const card = document.createElement("div");
        card.className = "ulydia-card";
        card.innerHTML = `
          <h3 class="ulydia-h3">${escapeHtml(t("prerequis"))}</h3>
          ${nl2p(f.prerequis_entree_formation)}
        `;
        left.appendChild(card);
      }
    }

    // ===== RIGHT COLUMN (short infos + lists) =====
    if (right) {
      right.innerHTML = "";

      const infoCard = document.createElement("div");
      infoCard.className = "ulydia-card";
      const actif = (f.actif_bool === true) ? "Yes" : (f.actif_bool === false ? "No" : t("none"));

      infoCard.innerHTML = `
        <h3 class="ulydia-h3">${escapeHtml(t("titleInfos"))}</h3>
        <div class="ulydia-kv">
          <div class="ulydia-kv-row">
            <div class="ulydia-k">${escapeHtml(t("rncpCode"))}</div>
            <div class="ulydia-v">${escapeHtml(f.rncp_code_norm || f.rncp_code || t("none"))}</div>
          </div>
          <div class="ulydia-kv-row">
            <div class="ulydia-k">${escapeHtml(t("fiche"))}</div>
            <div class="ulydia-v">${escapeHtml(f.id_fiche ?? f.numero_fiche ?? f.num_fiche ?? t("none"))}</div>
          </div>
          <div class="ulydia-kv-row">
            <div class="ulydia-k">${escapeHtml(t("pays"))}</div>
            <div class="ulydia-v">${escapeHtml(iso)}</div>
          </div>
          <div class="ulydia-kv-row">
            <div class="ulydia-k">${escapeHtml(t("actif"))}</div>
            <div class="ulydia-v">${escapeHtml(actif)}</div>
          </div>
        </div>
      `;
      right.appendChild(infoCard);

      // NSF domains
      const nsfRaw = Array.isArray(f.nsf_codes) ? f.nsf_codes : [];
      const nsf = nsfRaw.map(x => {
        const obj = (typeof x === "string") ? tryJsonParse(x) : x;
        const n = obj?.NSF || obj?.nsf || null;
        const code = n?.CODE || n?.code || "";
        const lib = n?.LIBELLE || n?.libelle || "";
        if (!code && !lib) return null;
        return { code: String(code || "").trim(), label: String(lib || "").trim() };
      }).filter(Boolean);

      if (nsf.length) {
        const nsfCard = document.createElement("div");
        nsfCard.className = "ulydia-card";
        nsfCard.innerHTML = `
          <h3 class="ulydia-h3">${escapeHtml(t("titleDomains"))}</h3>
          <div class="ulydia-badges">
            ${nsf.map(n => `<span class="ulydia-badge">${escapeHtml(n.code)}${n.label ? " • " + escapeHtml(n.label) : ""}</span>`).join("")}
          </div>
        `;
        right.appendChild(nsfCard);
      }

      // Programmes (published only)
      const progs = programmes.filter(p => (p?.status || "published") === "published");
      if (progs.length) {
        const progCard = document.createElement("div");
        progCard.className = "ulydia-card";
        progCard.innerHTML = `
          <h3 class="ulydia-h3">${escapeHtml(t("titleProgrammes"))}</h3>
          <div class="ulydia-prog-list"></div>
        `;

        const list = $(".ulydia-prog-list", progCard);

        progs.forEach(p => {
          const div = document.createElement("div");
          div.className = "ulydia-prog";
          const schoolName = p.company?.name || "";
          const logo = p.company?.logo_url || ""; // optional (if your schema has it)
          const metaBits = [
            p.city_name ? String(p.city_name) : "",
            p.duration_months ? `${p.duration_months} months` : ""
          ].filter(Boolean).join(" • ");

          div.innerHTML = `
            <div class="logo">${logo ? `<img src="${escapeHtml(logo)}" alt="">` : ""}</div>
            <div class="content">
              ${schoolName ? `<div class="school">${escapeHtml(schoolName)}</div>` : ""}
              <div class="title">${escapeHtml(p.title || "")}</div>
              ${metaBits ? `<div class="meta">${escapeHtml(metaBits)}</div>` : ""}
              ${p.tuition_amount ? `<div class="meta">${escapeHtml(String(p.tuition_amount))} ${escapeHtml(p.tuition_currency || "")}</div>` : ""}
              <a class="cta" href="/programme/${encodeURIComponent(p.id)}">${escapeHtml(t("viewProgramme"))}</a>
            </div>
          `;
          list.appendChild(div);
        });

        right.appendChild(progCard);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();