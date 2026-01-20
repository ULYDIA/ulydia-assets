/* ulydia-ui.v2.js — Design tokens loader + small UI helpers
   - Loads tokens JSON (default: /design-tokens/ulydia.design-tokens.v2.json)
   - Injects CSS variables + utility classes used by metier-page
   - Safe to include on any Webflow page (idempotent)
*/
(() => {
  if (window.__ULYDIA_UI_V2__) return;
  window.__ULYDIA_UI_V2__ = true;

  const DEFAULT_TOKENS_URL = "/design-tokens/ulydia.design-tokens.v2.json";

  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function ensureStyle(id, css){
    let s = document.getElementById(id);
    if (!s){
      s = document.createElement('style');
      s.id = id;
      document.head.appendChild(s);
    }
    s.textContent = css;
  }

  function cssEscape(str){
    return (str || "").replace(/[\n\r\t]/g, " ");
  }

  async function loadTokens(url){
    const finalUrl = url || DEFAULT_TOKENS_URL;
    try {
      const res = await fetch(finalUrl, { cache: "force-cache" });
      if (!res.ok) throw new Error(`tokens fetch failed: ${res.status}`);
      return await res.json();
    } catch (e){
      // Fallback minimal tokens (keeps pages readable)
      return {
        colors: {
          primary: "#c00102",
          primaryHover: "#a00001",
          text: "#1a1a1a",
          muted: "#6b7280",
          border: "#e5e7eb",
          bg: "#ffffff",
          card: "#fafafa",
          white: "#ffffff"
        },
        typography: { fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial", basePx: 14 },
        radii: { sm: 6, md: 8, lg: 10, xl: 12, card: 22 },
        shadows: { card: "0 10px 30px rgba(0,0,0,.06)", cardHover: "0 15px 40px rgba(0,0,0,.10)" },
        gradients: { redSlow: "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 35%, #ffd6d6 70%, #ffffff 100%)" },
        components: { buttonHeight: 44, bannerWide: { width: 680, height: 120 }, bannerSquare: { width: 220, height: 220 } }
      };
    }
  }

  function applyTokens(t){
    const c = t.colors || {};
    const r = t.radii || {};
    const s = t.shadows || {};
    const g = t.gradients || {};
    const ty = t.typography || {};

    const rootVars = {
      "--ul-primary": c.primary,
      "--ul-primary-hover": c.primaryHover || c.primary,
      "--ul-text": c.text,
      "--ul-muted": c.muted,
      "--ul-border": c.border,
      "--ul-bg": c.bg,
      "--ul-card": c.card,
      "--ul-white": c.white || "#fff",
      "--ul-radius-sm": (r.sm ?? 6) + "px",
      "--ul-radius-md": (r.md ?? 8) + "px",
      "--ul-radius-lg": (r.lg ?? 10) + "px",
      "--ul-radius-xl": (r.xl ?? 12) + "px",
      "--ul-radius-card": (r.card ?? 22) + "px",
      "--ul-shadow-card": s.card || "0 10px 30px rgba(0,0,0,.06)",
      "--ul-shadow-card-hover": s.cardHover || "0 15px 40px rgba(0,0,0,.10)",
      "--ul-gradient-header": g.redSlow || g.red || "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 35%, #ffd6d6 70%, #ffffff 100%)",
      "--ul-font": ty.fontFamily || "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial",
      "--ul-base": (ty.basePx ?? 14) + "px"
    };

    const varLines = Object.entries(rootVars)
      .filter(([,v]) => v != null && v !== "undefined")
      .map(([k,v]) => `${k}: ${cssEscape(String(v))};`)
      .join("\n");

    const css = `:root{\n${varLines}\n}

/* Base */
.ulydia-ui{font-family:var(--ul-font); font-size:var(--ul-base); color:var(--ul-text);} 
.ul-page-bg{background:var(--ul-bg);} 

/* Layout */
.ul-container{max-width:1140px; margin:0 auto; padding:28px 18px 90px;} 
.ul-grid{display:grid; gap:18px;} 
.ul-grid.two{grid-template-columns: minmax(0,1fr) 360px;} 
@media (max-width: 980px){.ul-grid.two{grid-template-columns:1fr;}}

/* Card */
.ul-card{background:var(--ul-white); border:1px solid var(--ul-border); border-radius:var(--ul-radius-card); box-shadow:var(--ul-shadow-card); overflow:hidden;} 
.ul-card:hover{box-shadow:var(--ul-shadow-card-hover);} 
.ul-card-h{padding:16px 18px; background:var(--ul-gradient-header); border-bottom:1px solid var(--ul-border);} 
.ul-card-t{margin:0; font-weight:800; letter-spacing:-0.01em;} 
.ul-card-b{padding:16px 18px;} 

/* Title + tagline */
.ul-h1{margin:0; font-size:40px; line-height:1.05; font-weight:800; color:var(--ul-primary); letter-spacing:-0.02em;} 
@media (max-width: 720px){.ul-h1{font-size:32px;}}
.ul-tagline{margin:10px 0 0; color:var(--ul-muted); font-size:15px;} 

/* Buttons */
.ul-btn{display:inline-flex; align-items:center; justify-content:center; height:44px; padding:0 18px; border-radius:14px; border:1px solid var(--ul-border); background:var(--ul-white); color:var(--ul-text); font-weight:700; text-decoration:none; cursor:pointer;} 
.ul-btn:hover{box-shadow:0 6px 20px rgba(0,0,0,.06);} 
.ul-btn.primary{background:var(--ul-primary); border-color:var(--ul-primary); color:white;} 
.ul-btn.primary:hover{background:var(--ul-primary-hover);} 

/* Inputs */
.ul-input, .ul-select{height:44px; border:1px solid var(--ul-border); border-radius:14px; padding:0 14px; background:var(--ul-white); font-weight:600; color:var(--ul-text); outline:none;} 
.ul-input:focus, .ul-select:focus{border-color:rgba(192,1,2,.35); box-shadow:0 0 0 4px rgba(192,1,2,.10);} 

/* Banner */
.ul-banner-wide{width:100%; max-width:680px; height:auto; display:block; border-radius:18px; overflow:hidden; border:1px solid var(--ul-border); box-shadow:0 10px 30px rgba(0,0,0,.08);} 
.ul-banner-wide img{width:100%; height:auto; display:block;}

/* Rich text */
.ul-rich p{margin:0 0 10px;} 
.ul-rich ul{margin:8px 0 0 18px;} 
.ul-rich li{margin:6px 0;} 
.ul-rich h3,.ul-rich h4{margin:16px 0 10px;} 
.ul-rich a{color:var(--ul-primary); font-weight:700;}
`;

    ensureStyle("ulydia_ui_v2_css", css);
  }

  // Public API
  window.UlydiaUI = {
    version: "2.0",
    load: async (url) => {
      const t = await loadTokens(url);
      applyTokens(t);
      return t;
    },
    ensureStyle,
    qs,
    qsa
  };
})();
