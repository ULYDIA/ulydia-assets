/* metier-page.v2026-01-25.FINAL.TEXTCLEAN.STYLE.PATCH1.js
   ULYDIA — Text cleanup + LEFT typography (SAFE)

   ✅ Removes &nbsp; / &#160; / NBSP (\u00A0) artifacts in injected HTML
   ✅ Makes LEFT column text dark gray, while bold/strong stays near-black
   ✅ No changes to your HTML structure; only sanitizes content + injects CSS

   Targets:
   - LEFT bloc containers: #js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire
   - RIGHT chips wraps (optional): #js-skills-wrap, #js-softskills-wrap, #js-tools-wrap, #js-bf-certifications, #js-bf-schools_or_paths, #js-bf-portfolio_projects
*/
(() => {
  if (window.__ULYDIA_TEXTCLEAN_STYLE_PATCH1__) return;
  window.__ULYDIA_TEXTCLEAN_STYLE_PATCH1__ = true;

  const DEBUG = !!window.__METIER_PAGE_DEBUG__;
  const log = (...a) => DEBUG && console.log("[textclean.style.patch1]", ...a);

  const IDS = [
    "js-bf-formation","js-bf-acces","js-bf-marche","js-bf-salaire",
    "js-skills-wrap","js-softskills-wrap","js-tools-wrap",
    "js-bf-certifications","js-bf-schools_or_paths","js-bf-portfolio_projects"
  ];

  function ensureStyle(){
    if (document.getElementById("ulydia-left-typography-patch1")) return;
    const css = `
/* LEFT column: readable gray text, strong in black-ish */
#js-bf-formation, #js-bf-acces, #js-bf-marche, #js-bf-salaire{
  color: #4b5563; /* dark gray */
}
#js-bf-formation strong, #js-bf-acces strong, #js-bf-marche strong, #js-bf-salaire strong,
#js-bf-formation b, #js-bf-acces b, #js-bf-marche b, #js-bf-salaire b{
  color: #111827; /* near-black */
}
/* Make paragraphs a bit more comfortable */
#js-bf-formation p, #js-bf-acces p, #js-bf-marche p, #js-bf-salaire p{
  margin: 0.35rem 0;
}
#js-bf-formation ul, #js-bf-acces ul, #js-bf-marche ul, #js-bf-salaire ul{
  margin: 0.35rem 0 0.35rem 1.1rem;
}
#js-bf-formation li, #js-bf-acces li, #js-bf-marche li, #js-bf-salaire li{
  margin: 0.2rem 0;
}
    `.trim();
    const st = document.createElement("style");
    st.id = "ulydia-left-typography-patch1";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function cleanHTML(html){
    if (!html) return html;
    return String(html)
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\s{2,}/g, " ");
  }

  function sanitizeEl(el){
    if (!el) return false;
    // Clean innerHTML (covers &nbsp; and NBSP from string sources)
    const before = el.innerHTML;
    const after = cleanHTML(before);
    if (after !== before) el.innerHTML = after;

    // Also clean text nodes to be safe
    try {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let node, changed = false;
      while ((node = walker.nextNode())) {
        const t0 = node.nodeValue || "";
        const t1 = cleanHTML(t0);
        if (t1 !== t0) { node.nodeValue = t1; changed = true; }
      }
      return (after !== before) || changed;
    } catch(e){
      return (after !== before);
    }
  }

  function run(){
    ensureStyle();

    let found = 0, changed = 0;
    IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      found++;
      if (sanitizeEl(el)) changed++;
    });

    log("sanitize done", { found, changed });
  }

  function onReady(){
    // run once now
    run();

    // run again after METIER_READY (content injection)
    if (window.__ULYDIA_METIER_BUS__?.on) {
      window.__ULYDIA_METIER_BUS__.on("ULYDIA:METIER_READY", () => {
        // small delay to let patches render
        setTimeout(run, 30);
        setTimeout(run, 150);
      });
      return;
    }

    // fallback: try a few times
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      run();
      if (tries > 20) clearInterval(t);
    }, 200);
  }

  onReady();
})();
