/* metier-page — Ulydia (FINAL FAQ PATCH)
   - Keeps your stable BASE renderer unchanged
   - Hides Webflow CMS sources (FAQ + Metier_pays_bloc) to avoid duplicates
   - Renders FAQ in the design with answers + working accordion
   - Removes "questions only" legacy blocks if present
   - Cleans &nbsp; / &#160; artifacts
   - Sets readable tone: dark-grey text + darker bold
*/
(() => {
  if (window.__ULYDIA_METIER_FINAL_FAQ_PATCH__) return;
  window.__ULYDIA_METIER_FINAL_FAQ_PATCH__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => { if (DEBUG) console.log("[metier FINAL PATCH]", ...a); };

  // ------------------------------------------------------------
  // CSS (safe, scoped)
  // ------------------------------------------------------------
  function injectCSS() {
    if (document.getElementById("ul-metier-final-patch-css")) return;
    const css = document.createElement("style");
    css.id = "ul-metier-final-patch-css";
    css.textContent = `
      /* Hide CMS sources (but keep them in DOM for readers) */
      .ul-cms-faq-source, .ul-cms-blocs-source, .ul-cms-source { display:none !important; visibility:hidden !important; height:0 !important; overflow:hidden !important; }

      /* Text tone */
      #ulydia-metier-root, #ulydia-metier-root p, #ulydia-metier-root li { color:#475569; } /* slate-600 */
      #ulydia-metier-root strong, #ulydia-metier-root b { color:#0f172a; font-weight:600; } /* slate-900 */

      /* FAQ */
      .ul-faq-card { background:#fff; border:1px solid rgba(15,23,42,.08); border-radius:14px; box-shadow:0 10px 22px rgba(15,23,42,.06); overflow:hidden; }
      .ul-faq-head { display:flex; align-items:center; gap:10px; padding:16px 16px; border-bottom:1px solid rgba(15,23,42,.06); background:rgba(99,102,241,.06); }
      .ul-faq-head .ul-faq-title { margin:0; font-size:14px; font-weight:700; color:#0f172a; }
      .ul-faq-list { padding:10px 12px 12px; }
      .ul-faq-item { border:1px solid rgba(15,23,42,.08); border-radius:12px; background:#fff; overflow:hidden; margin:10px 0; }
      .ul-faq-q { width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 12px; background:#fff; border:0; cursor:pointer; text-align:left; }
      .ul-faq-q .qtxt { font-weight:700; color:#0f172a; font-size:13px; line-height:1.3; }
      .ul-faq-q .chev { width:18px; height:18px; flex:0 0 auto; opacity:.65; transition:transform .2s ease; }
      .ul-faq-a { padding:0 12px; overflow:hidden; max-height:0; transition:max-height .25s ease; }
      .ul-faq-a .inner { padding:0 0 12px; color:#475569; font-size:13px; line-height:1.55; }
      .ul-faq-item.is-open .ul-faq-q { background:rgba(99,102,241,.06); }
      .ul-faq-item.is-open .ul-faq-q .chev { transform:rotate(180deg); }
      .ul-faq-item.is-open .ul-faq-a { margin-top:0; }

      /* ensure answers' inline HTML is readable */
      .ul-faq-a .inner p { margin:8px 0; }
      .ul-faq-a .inner ul { margin:8px 0 0 18px; }
    `;
    document.head.appendChild(css);
  }

  // ------------------------------------------------------------
  // Utils
  // ------------------------------------------------------------
  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function cleanNbspHtml(html){
    if (!html) return "";
    return String(html)
      .replace(/&nbsp;|&#160;|&amp;nbsp;/g, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  function stripTagsToText(html){
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return norm(div.textContent || "");
  }

  function getSlugFromURL(){
    const u = new URL(location.href);
    const m = u.searchParams.get("metier") || u.searchParams.get("slug") || "";
    return norm(m);
  }
  function getISOFromURL(){
    const u = new URL(location.href);
    const c = u.searchParams.get("country") || u.searchParams.get("iso") || "";
    return norm(c).toUpperCase();
  }

  // ------------------------------------------------------------
  // Find root + left column to insert FAQ
  // ------------------------------------------------------------
  function getRoot(){
    return document.getElementById("ulydia-metier-root") || document.getElementById("ulydia-metier-root".replace("-root","-root")) || document.getElementById("ulydia-metier-root") || document.body;
  }

  function findLeftColumn(root){
    // Try common containers (keep this flexible)
    return (
      root.querySelector(".ul-metier-col-left") ||
      root.querySelector(".ul-col-left") ||
      root.querySelector("[data-ul='left']") ||
      root.querySelector(".ul-metier-main-left") ||
      root.querySelector(".ul-metier-main .ul-left") ||
      root.querySelector(".ul-metier-grid > :first-child") ||
      root
    );
  }

  // ------------------------------------------------------------
  // Remove legacy "questions only" blocks
  // ------------------------------------------------------------
  function removeLegacyFaqQuestionsOnly(root){
    // common: a footer area showing only questions as plain list items
    // remove containers that look like "Questions fréquentes" but have no answers/accordion
    const candidates = [...root.querySelectorAll("section,div")].filter(el => {
      const t = (el.textContent || "").toLowerCase();
      return t.includes("questions fréquentes") && t.length < 800 && !el.querySelector(".ul-faq-a, .ul-faq-answer, details, summary");
    });

    candidates.forEach(el => {
      // keep the designed card if it contains our classes
      if (el.querySelector(".ul-faq-card, .ul-faq-item")) return;
      // if it is very close to the bottom and looks like a duplicate, remove
      if (el.querySelectorAll("li, a, p").length >= 3) {
        el.remove();
      }
    });
  }

  // ------------------------------------------------------------
  // Render FAQ (accordion with answers)
  // ------------------------------------------------------------
  function pickFaqsFor(slug, iso){
    const faqs = (window.__ULYDIA_FAQS__ || window.__ULYDIA_FAQ__ || window.__ULYDIA_FAQS || []).slice ? (window.__ULYDIA_FAQS__ || []) : [];
    const s = String(slug||"").toLowerCase();
    const I = String(iso||"").toUpperCase();

    // Match on "metier" field. Some CMS store slug; some store name.
    const out = faqs.filter(x => {
      const m = String(x?.metier || x?.slug || x?.job || "").toLowerCase();
      if (!m) return false;
      if (m !== s && !m.includes(s) && !s.includes(m)) return false;

      const xi = String(x?.iso || x?.country || "").toUpperCase();
      // if ISO provided, require it, else accept global FAQ
      if (xi && I && xi !== I) return false;
      return true;
    });

    return out;
  }

  function ensureFaqCard(root){
    // If there's already a designed FAQ area, reuse it (but we may replace content)
    let mount =
      root.querySelector("#ul-faq-mount") ||
      root.querySelector(".ul-faq-mount") ||
      root.querySelector("[data-ul='faq']");

    if (!mount) {
      mount = document.createElement("div");
      mount.id = "ul-faq-mount";
      // Insert after "Environnements de travail" card if found, else append to left column
      const left = findLeftColumn(root);
      const after =
        left.querySelector(".ul-card-env") ||
        [...left.querySelectorAll(".ul-card, .ul-section, section, div")].find(el => (el.textContent||"").toLowerCase().includes("environnements de travail")) ||
        null;

      if (after && after.parentElement) {
        after.parentElement.insertBefore(mount, after.nextSibling);
      } else {
        left.appendChild(mount);
      }
    }
    return mount;
  }

  function renderFaq(slug, iso){
    const root = getRoot();
    const mount = ensureFaqCard(root);

    const faqs = pickFaqsFor(slug, iso);

    if (!faqs || faqs.length === 0) {
      // If no FAQ, remove mount to avoid empty card
      mount.innerHTML = "";
      mount.style.display = "none";
      log("FAQ: none for", { slug, iso });
      return 0;
    }

    mount.style.display = "";

    const itemsHtml = faqs.map((f, idx) => {
      const q = cleanNbspHtml(f.question || f.q || "");
      const aRaw = f.answer || f.a || "";
      // answer may be HTML from rich text; clean &nbsp; and keep basic formatting
      const aHtml = cleanNbspHtml(aRaw);
      const aText = stripTagsToText(aRaw);
      const useHtml = !!aHtml && aHtml !== aText;

      return `
        <div class="ul-faq-item" data-i="${idx}">
          <button class="ul-faq-q" type="button" aria-expanded="false">
            <span class="qtxt">${q}</span>
            <svg class="chev" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="ul-faq-a" role="region">
            <div class="inner">${useHtml ? aHtml : aText}</div>
          </div>
        </div>
      `;
    }).join("");

    mount.innerHTML = `
      <div class="ul-faq-card">
        <div class="ul-faq-head">
          <span style="display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:7px;background:rgba(99,102,241,.14);color:#4f46e5;font-weight:800;">?</span>
          <h3 class="ul-faq-title">Questions fréquentes</h3>
        </div>
        <div class="ul-faq-list">${itemsHtml}</div>
      </div>
    `;

    // bind once via delegation
    if (!root.__ulFaqBound) {
      root.__ulFaqBound = true;
      root.addEventListener("click", (e) => {
        const btn = e.target.closest(".ul-faq-q");
        if (!btn) return;
        const item = btn.closest(".ul-faq-item");
        if (!item) return;

        const open = !item.classList.contains("is-open");
        // close siblings to behave like accordion (optional)
        const siblings = item.parentElement ? item.parentElement.querySelectorAll(".ul-faq-item") : [];
        siblings.forEach(s => {
          if (s !== item) {
            s.classList.remove("is-open");
            const b = s.querySelector(".ul-faq-q");
            if (b) b.setAttribute("aria-expanded", "false");
            const a = s.querySelector(".ul-faq-a");
            if (a) a.style.maxHeight = "0px";
          }
        });

        item.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");

        const ans = item.querySelector(".ul-faq-a");
        if (ans) {
          // set to scrollHeight for animation
          ans.style.maxHeight = open ? (ans.scrollHeight + "px") : "0px";
        }
      }, { passive: true });
    }

    // initialize maxHeight for open item (none)
    mount.querySelectorAll(".ul-faq-a").forEach(a => a.style.maxHeight = "0px");

    log("FAQ rendered:", faqs.length, { slug, iso });
    return faqs.length;
  }

  // ------------------------------------------------------------
  // Post-process: clean literal "&nbsp;" in rendered content
  // ------------------------------------------------------------
  function cleanRenderedArtifacts(root){
    // Replace literal &nbsp; strings in HTML (coming from CMS rich text)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    const els = [];
    while (walker.nextNode()) els.push(walker.currentNode);
    els.forEach(el => {
      if (!el || !el.innerHTML) return;
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
      if (el.innerHTML.includes("&nbsp;") || el.innerHTML.includes("&#160;") || el.innerHTML.includes("&amp;nbsp;")) {
        el.innerHTML = cleanNbspHtml(el.innerHTML);
      }
    });
    // Replace actual NBSP characters in text nodes
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(n => {
      if (n.nodeValue && n.nodeValue.includes("\u00A0")) n.nodeValue = n.nodeValue.replace(/\u00A0/g, " ");
    });
  }

  // ------------------------------------------------------------
  // Boot: wait until BASE rendered something
  // ------------------------------------------------------------
  injectCSS();

  const slug = getSlugFromURL();
  const iso = getISOFromURL();

  let tries = 0;
  (function waitForBase(){
    tries++;
    const root = getRoot();

    // Consider "rendered" if there are some cards or main title exists
    const rendered = !!(root.querySelector("h1, .ul-metier-title, .ul-title") || root.querySelector(".ul-card, .ul-section, .ul-metier-grid"));
    const faqsReady = Array.isArray(window.__ULYDIA_FAQS__) && window.__ULYDIA_FAQS__.length >= 0;

    if (rendered) {
      cleanRenderedArtifacts(root);
      removeLegacyFaqQuestionsOnly(root);
      renderFaq(slug, iso);
      return;
    }

    if (tries > 120) {
      log("gave up waiting for base render");
      return;
    }
    setTimeout(waitForBase, 50);
  })();
})();
