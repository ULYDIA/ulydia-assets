(function () {
  // ULYDIA — RIGHT COLUMN HOVER EFFECTS (Indicators + Salary)
  // Adds "card-like" hover on the blocks + subtle hover on inner rows/items.

  if (window.__ULYDIA_RIGHT_HOVER_PATCH1__) return;
  window.__ULYDIA_RIGHT_HOVER_PATCH1__ = true;

  function injectStyle() {
    if (document.getElementById("ulydia-right-hover-patch1")) return;

    var css = `
/* =========================
   RIGHT blocks (Injected)
   ========================= */

/* Same feel as .card */
.ul-ind-card[data-ulydia-indicators],
.ul-salary-card[data-ulydia-salary]{
  border-radius: 16px;
  border: 1px solid var(--border, rgba(226,232,240,1));
  box-shadow: var(--shadow-card, 0 4px 20px rgba(0,0,0,.08));
  background: var(--card, #f8fafc);
  transition: transform .3s ease, box-shadow .3s ease, border-color .2s ease;
  will-change: transform, box-shadow;
}

.ul-ind-card[data-ulydia-indicators]:hover,
.ul-salary-card[data-ulydia-salary]:hover{
  box-shadow: 0 8px 30px rgba(0,0,0,.12);
  transform: translateY(-2px);
}

/* Inner items: same feel as .kpi-box hover */
.ul-ind-card .ul-ind-item,
.ul-salary-card .ul-salary-row{
  background: #fff;
  border: 1px solid var(--border, rgba(226,232,240,1));
  border-radius: 12px;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}

.ul-ind-card .ul-ind-item:hover,
.ul-salary-card .ul-salary-row:hover{
  border-color: var(--primary, #6366f1);
  box-shadow: 0 4px 16px rgba(99,102,241,0.15);
  transform: translateY(-1px);
}

/* If salary rows are not wrapped in .ul-salary-row, fallback to hover on top line */
.ul-salary-card .ul-salary-top{
  border-radius: 12px;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.ul-salary-card .ul-salary-top:hover{
  box-shadow: 0 4px 16px rgba(99,102,241,0.12);
  transform: translateY(-1px);
}

/* Optional: avoid ugly focus outlines on click */
.ul-ind-card *:focus,
.ul-salary-card *:focus{
  outline: none;
}
`;

    var style = document.createElement("style");
    style.id = "ulydia-right-hover-patch1";
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  function boot() {
    injectStyle();
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);



})();
