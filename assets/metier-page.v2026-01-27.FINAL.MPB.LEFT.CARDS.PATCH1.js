(function(){
  // =========================================================
  // ULYDIA — MPB Left Cards (titles + clean typography)
  // Renders ONLY if MPB matched for current job+country.
  // Injects 2 blocks (like other blocks) after "Compétences clés"
  // - 📚 Niveau d’études & diplômes  (education_level, degrees_examples)
  // - 🧭 Débouchés & premiers postes (first_job_titles, typical_employers, hiring_sectors)
  // Notes:
  // - Removes &nbsp;
  // - Each item on its own line / bullet
  // =========================================================
  var W = window;

  function norm(s){ return String(s||"").replace(/\u00a0/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim(); }
  function toArr(v){
    if (Array.isArray(v)) return v.map(norm).filter(Boolean);
    var s = norm(v);
    if (!s) return [];
    // split by common separators
    return s.split(/\n|•|\u2022|;|,|\r/).map(norm).filter(Boolean);
  }

  function getMPB(){
    return W.__ULYDIA_MPB__ || null;
  }

  function matched(){
    return !!(W.__ULYDIA_MPB_MATCHED__ || (W.__ULYDIA_MPB_VISIBILITY__ && W.__ULYDIA_MPB_VISIBILITY__.matched));
  }

  // find anchor: the "Compétences clés" block (left column)
  function findAnchor(){
    // try a few known headings/classes
    var candidates = [
      '[data-ul-section="competences"]',
      '.u-block-competences',
      '.js-block-competences',
      'section',
      'div'
    ];
    // heuristic: find element whose text includes "Compétences clés"
    for (var i=0;i<candidates.length;i++){
      var els = document.querySelectorAll(candidates[i]);
      for (var j=0;j<els.length;j++){
        var el = els[j];
        var t = norm(el.textContent||"");
        if (t && t.indexOf("Compétences clés") !== -1) return el;
      }
    }
    return null;
  }

  function ensureZone(afterEl){
    // Create an injection zone right after the anchor block
    var id = "ul-mpb-left-zone";
    var z = document.getElementById(id);
    if (z) return z;
    z = document.createElement("div");
    z.id = id;
    z.setAttribute("data-ul-mpb-zone","left");
    z.setAttribute("data-ul-mpb-injected","1");
    // preserve layout: same width rules as other blocks
    z.style.display = "grid";
    z.style.gridTemplateColumns = "1fr";
    z.style.gap = "14px";
    z.style.marginTop = "14px";
    if (afterEl && afterEl.parentNode) {
      afterEl.parentNode.insertBefore(z, afterEl.nextSibling);
    }
    return z;
  }

  function blockCard(opts){
    var icon = opts.icon || "📌";
    var title = opts.title || "";
    var items = opts.items || [];
    var bg = opts.bg || "#EAF2FF";     // header background
    var bodyBg = "#FFFFFF";
    var border = "rgba(17, 24, 39, 0.08)";

    var wrap = document.createElement("div");
    wrap.className = "js-ul-mpb-card";
    wrap.setAttribute("data-ul-mpb-injected","1");
    // mimic existing cards: rounded + shadow light
    wrap.style.border = "1px solid " + border;
    wrap.style.borderRadius = "14px";
    wrap.style.overflow = "hidden";
    wrap.style.background = bodyBg;
    wrap.style.boxShadow = "0 10px 30px rgba(17,24,39,0.06)";

    var head = document.createElement("div");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.gap = "10px";
    head.style.padding = "12px 14px";
    head.style.background = bg;

    var h = document.createElement("div");
    // Let font family inherit; only align size/weight with other headers
    h.style.fontWeight = "700";
    h.style.fontSize = "16px";
    h.style.lineHeight = "20px";
    h.textContent = icon + " " + title;

    head.appendChild(h);

    var body = document.createElement("div");
    body.style.padding = "12px 14px";

    if (!items || items.length === 0){
      var p = document.createElement("div");
      p.style.opacity = "0.75";
      p.style.fontSize = "13px";
      p.style.lineHeight = "18px";
      p.textContent = "—";
      body.appendChild(p);
    } else {
      var ul = document.createElement("ul");
      ul.style.margin = "0";
      ul.style.paddingLeft = "18px";
      ul.style.display = "grid";
      ul.style.gap = "6px";
      ul.style.fontSize = "13px";
      ul.style.lineHeight = "18px";

      items.forEach(function(it){
        var li = document.createElement("li");
        li.textContent = it;
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }

    wrap.appendChild(head);
    wrap.appendChild(body);
    return wrap;
  }

  function render(){
    // If not matched, remove injected zone
    var existing = document.getElementById("ul-mpb-left-zone");
    if (!matched()){
      if (existing) { try{ existing.remove(); }catch(e){} }
      return;
    }

    var mpb = getMPB();
    if (!mpb) return;

    // Build items from MPB fields (tolerant keys)
    var educationLevel = norm(mpb.education_level_local || mpb.education_level || mpb["education_level_local"] || mpb["education_level"]);
    var degrees = toArr(mpb.degrees_examples || mpb["degrees_examples"]);
    var entry = toArr(mpb.entry_routes || mpb["entry_routes"]);
    var equiv = toArr(mpb.equivalences_reconversion || mpb["equivalences_reconversion"]);

    var firstJobs = toArr(mpb.first_job_titles || mpb["first_job_titles"]);
    var employers = toArr(mpb.typical_employers || mpb["typical_employers"]);
    var sectors = toArr(mpb.hiring_sectors || mpb["hiring_sectors"]);

    // Compose with minimal duplicates
    function uniq(arr){
      var seen = {};
      var out = [];
      (arr||[]).forEach(function(x){
        var k = norm(x).toLowerCase();
        if (!k || seen[k]) return;
        seen[k]=1; out.push(norm(x));
      });
      return out;
    }

    var eduItems = [];
    if (educationLevel) eduItems.push("Niveau requis : " + educationLevel);
    if (degrees.length) eduItems = eduItems.concat(degrees.map(function(x){ return "Diplôme : " + x; }));
    if (entry.length) eduItems = eduItems.concat(entry.map(function(x){ return "Accès : " + x; }));
    if (equiv.length) eduItems = eduItems.concat(equiv.map(function(x){ return "Équivalences / reconversion : " + x; }));
    eduItems = uniq(eduItems);

    var outItems = [];
    if (firstJobs.length) outItems = outItems.concat(firstJobs.map(function(x){ return "Premier poste : " + x; }));
    if (employers.length) outItems = outItems.concat(employers.map(function(x){ return "Employeur : " + x; }));
    if (sectors.length) outItems = outItems.concat(sectors.map(function(x){ return "Secteur : " + x; }));
    outItems = uniq(outItems);

    var anchor = findAnchor();
    if (!anchor) return;

    var zone = ensureZone(anchor);
    zone.innerHTML = "";

    zone.appendChild(blockCard({
      icon: "📚",
      title: "Niveau d’études & diplômes",
      items: eduItems,
      bg: "#DFF3EA" // different from others, softer green
    }));

    zone.appendChild(blockCard({
      icon: "🧭",
      title: "Débouchés & premiers postes",
      items: outItems,
      bg: "#E7F0FF" // soft blue
    }));
  }

  // Initial render after DOM
  function boot(){
    render();
    // rerender on mpb changes
    window.addEventListener("ulydia:mpb:change", function(){ setTimeout(render, 0); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();