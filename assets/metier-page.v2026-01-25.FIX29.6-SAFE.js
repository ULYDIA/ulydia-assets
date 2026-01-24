/* metier-page.v2026-01-25.FIX29.6-SAFE.js
   ULYDIA — SAFE PATCH
   ----------------------------------------------
   GOAL:
   - Do NOT change existing render pipeline
   - Only:
     1) Clean &nbsp; in texts
     2) Inject FAQ section if data exists
   - Zero risk of blank page

   DEPENDS ON:
   - Existing FIX29.4 working render
   - window.__ULYDIA_FAQS__
*/

(() => {
  if (window.__ULYDIA_METIER_FIX296__) return;
  window.__ULYDIA_METIER_FIX296__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[FIX29.6]", ...a);

  function cleanHTML(html){
    if (!html) return html;
    return html
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/\s+,/g, ",")
      .replace(/,\s+/g, ", ")
      .trim();
  }

  // ----------------------------------------------
  // 1) Clean existing text nodes (&nbsp;)
  // ----------------------------------------------
  function cleanTextNodes(){
    document.querySelectorAll("#ulydia-metier-root *").forEach(el => {
      if (el.children.length === 0 && el.innerHTML && el.innerHTML.includes("&nbsp;")) {
        el.innerHTML = cleanHTML(el.innerHTML);
      }
    });
  }

  // ----------------------------------------------
  // 2) Render FAQ if data exists
  // ----------------------------------------------
  function renderFAQ(){
    const faqs = Array.isArray(window.__ULYDIA_FAQS__) ? window.__ULYDIA_FAQS__ : [];
    if (!faqs.length) {
      log("no FAQ data");
      return;
    }

    const root = document.getElementById("ulydia-metier-root");
    if (!root) return;

    if (root.querySelector(".ul-metier-faq")) return;

    const items = faqs.map(f => `
      <details class="ul-faq-item">
        <summary>${cleanHTML(f.question)}</summary>
        <div class="ul-faq-answer">${cleanHTML(f.answer)}</div>
      </details>
    `).join("");

    const section = document.createElement("section");
    section.className = "ul-metier-faq";
    section.innerHTML = `
      <h2>Questions fréquentes</h2>
      ${items}
    `;

    root.appendChild(section);
    log("FAQ rendered", faqs.length);
  }

  // ----------------------------------------------
  // Boot (wait for base render)
  // ----------------------------------------------
  let tries = 0;
  (function wait(){
    tries++;
    const root = document.getElementById("ulydia-metier-root");
    if (root && root.children.length > 0) {
      cleanTextNodes();
      renderFAQ();
      return;
    }
    if (tries > 40) return;
    setTimeout(wait, 100);
  })();
})();