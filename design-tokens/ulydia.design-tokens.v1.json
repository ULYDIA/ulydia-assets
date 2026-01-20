/* ulydia-ui.v1.js — Ulydia Core UI (v1.0.0)
   - Injects tokens + base CSS once
   - Provides small helpers for consistent UI construction
   - Source aligned with design01.html
*/
(() => {
  if (window.__ULYDIA_UI_V1__) return;
  window.__ULYDIA_UI_V1__ = true;

  const TOKENS = {
    name: "Ulydia Core UI",
    version: "1.0.0",
    font: {
      family: "Montserrat",
      fallback: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      baseSizePx: 14,
    },
    colors: {
      primary: "#c00102",
      primaryHover: "#a00001",
      text: "#1a1a1a",
      muted: "#6b7280",
      border: "#e5e7eb",
      bg: "#ffffff",
      card: "#fafafa",
    },
    radius: { sm: "6px", md: "8px", lg: "10px", xl: "12px" },
    shadow: {
      card: "0 10px 30px rgba(0,0,0,.06)",
      cardHover: "0 15px 40px rgba(0,0,0,.10)",
    },
    layout: { maxWidth: "1100px", pagePadding: "24px", gridGap: "24px", sectionSpacing: "40px" },
  };

  function ensureGoogleFontLoaded() {
    // Avoid duplicate <link>
    const id = "ul_font_montserrat_link";
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }

  function injectCSSOnce() {
    const id = "ulydia_ui_v1_css";
    if (document.getElementById(id)) return;

    const css = `
:root{
  --ul-primary:${TOKENS.colors.primary};
  --ul-primary-hover:${TOKENS.colors.primaryHover};
  --ul-text:${TOKENS.colors.text};
  --ul-muted:${TOKENS.colors.muted};
  --ul-border:${TOKENS.colors.border};
  --ul-bg:${TOKENS.colors.bg};
  --ul-card:${TOKENS.colors.card};

  --ul-radius-sm:${TOKENS.radius.sm};
  --ul-radius-md:${TOKENS.radius.md};
  --ul-radius-lg:${TOKENS.radius.lg};
  --ul-radius-xl:${TOKENS.radius.xl};

  --ul-shadow-card:${TOKENS.shadow.card};
  --ul-shadow-card-hover:${TOKENS.shadow.cardHover};

  --ul-font:'${TOKENS.font.family}', ${TOKENS.font.fallback};
  --ul-font-base:${TOKENS.font.baseSizePx}px;

  --ul-maxw:${TOKENS.layout.maxWidth};
  --ul-pad:${TOKENS.layout.pagePadding};
  --ul-gap:${TOKENS.layout.gridGap};
  --ul-section:${TOKENS.layout.sectionSpacing};
}

*{ font-family: var(--ul-font); }
html{ font-size: var(--ul-font-base); }
body{ background: var(--ul-bg); color: var(--ul-text); }

/* Containers */
.u-container{ max-width: var(--ul-maxw); margin: 0 auto; padding: 0 var(--ul-pad); }
.u-stack{ display:flex; flex-direction:column; gap: var(--ul-gap); }
.u-row{ display:flex; gap: var(--ul-gap); align-items:center; flex-wrap:wrap; }

/* Card */
.u-card{
  background: var(--ul-card);
  border: 1px solid var(--ul-border);
  border-radius: var(--ul-radius-lg);
  box-shadow: var(--ul-shadow-card);
  padding: 24px;
  transition: transform .2s ease, box-shadow .2s ease;
}
.u-card:hover{
  box-shadow: var(--ul-shadow-card-hover);
  transform: translateY(-2px);
}

/* Section header */
.u-sectionHeader{
  padding: 16px 20px;
  border-radius: var(--ul-radius-lg) var(--ul-radius-lg) 0 0;
  margin: -24px -24px 20px -24px;
}
.u-sectionTitle{
  font-weight: 700;
  font-size: 16px;
  color: var(--ul-text);
  letter-spacing: -0.02em;
}

/* Buttons */
.u-btn{
  height: 44px;
  border-radius: var(--ul-radius-md);
  font-weight: 600;
  padding: 0 24px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items:center;
  justify-content:center;
  gap: 8px;
  transition: transform .15s ease, background .15s ease, border-color .15s ease, opacity .15s ease;
  user-select:none;
  text-decoration:none;
}
.u-btn:disabled{ opacity:.5; cursor:not-allowed; transform:none; }
.u-btn--primary{ background: var(--ul-primary); color:#fff; }
.u-btn--primary:hover{ background: var(--ul-primary-hover); transform: translateY(-1px); }
.u-btn--secondary{
  background: #fff;
  color: var(--ul-text);
  border: 1px solid var(--ul-border);
}
.u-btn--secondary:hover{
  background: var(--ul-card);
  border-color: var(--ul-muted);
}

/* Banners */
.u-banner{
  border-radius: var(--ul-radius-lg);
  overflow:hidden;
  border: 1px solid var(--ul-border);
  box-shadow: var(--ul-shadow-card);
  background: #fff;
}
.u-banner--wide{ aspect-ratio: 3 / 1; }
.u-banner--square{ aspect-ratio: 1 / 1; }

`;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Small DOM helpers
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children || [])) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  };

  function ensure() {
    ensureGoogleFontLoaded();
    injectCSSOnce();
    return TOKENS;
  }

  // Public API
  window.UlydiaUI = {
    TOKENS,
    ensure,
    el,
    // Ready-made builders (optional but handy)
    card: (title, headerClass = "") => {
      ensure();
      const card = el("div", { class: "u-card" });
      if (title) {
        const header = el("div", { class: `u-sectionHeader ${headerClass}` });
        header.appendChild(el("div", { class: "u-sectionTitle", text: title }));
        card.appendChild(header);
      }
      return card;
    },
    btnPrimary: (label, attrs = {}) => el("button", { class: "u-btn u-btn--primary", text: label, ...attrs }),
    btnSecondary: (label, attrs = {}) => el("button", { class: "u-btn u-btn--secondary", text: label, ...attrs }),
    bannerWide: (attrs = {}) => el("a", { class: "u-banner u-banner--wide", ...attrs }),
    bannerSquare: (attrs = {}) => el("a", { class: "u-banner u-banner--square", ...attrs }),
  };
})();
