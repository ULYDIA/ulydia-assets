(function(){
  // =========================================================
  // ULYDIA — MPB 3 BLOCS (LEFT) — PATCH3 — 2026-01-29
  // - Lit les datas depuis la CollectionList "u-cms-bloc-source"
  // - Rend 3 cartes (Education / Career / Access) AVANT "Environnements de travail"
  // - Cache automatiquement si aucune donnée
  // =========================================================
  if (window.__ULYDIA_MPB_THREEBLOCKS_PATCH3__) return;
  window.__ULYDIA_MPB_THREEBLOCKS_PATCH3__ = true;

  function norm(s){ return String(s||"").toLowerCase().replace(/\s+/g," ").trim(); }
  function qp(k){
    try { return new URLSearchParams(location.search).get(k) || ""; }
    catch(e){ return ""; }
  }
  function getLang(){
    var l = (window.__ULYDIA_LANG__ || window.__ULYDIA_LANG || "").toString().toLowerCase();
    if (!l) l = (document.documentElement.getAttribute("lang")||"").toLowerCase();
    return (l || "fr").slice(0,2);
  }

  var slug = qp("metier");
  var iso  = (qp("country") || qp("iso") || "").toUpperCase();

  // fallback : certaines pages sont en /metier/<slug> ?
  if (!slug) {
    var m = location.pathname.match(/\/metier\/([^\/?#]+)/i);
    if (m) slug = m[1];
  }

  function pickText(root, cls){
    var el = root && root.querySelector("." + cls);
    if (!el) return "";
    return String(el.textContent||"").replace(/\s+/g," ").trim();
  }

  function splitList(s){
    s = String(s||"").trim();
    if (!s) return [];
    // support virgules + retours ligne
    var parts = s.split(/\n|•|\u2022|,|;|\|/g).map(function(x){
      return String(x||"").replace(/\s+/g," ").trim();
    }).filter(Boolean);
    // dédoublonne
    var out = [], seen = {};
    parts.forEach(function(x){
      var k = norm(x);
      if (!seen[k]) { seen[k]=1; out.push(x); }
    });
    return out;
  }

  function findCMSItem(){
    var src = document.querySelector(".u-cms-bloc-source");
    if (!src) return null;
    var items = src.querySelectorAll(".w-dyn-item, .collection-item, .w-dyn-items > div");
    if (!items || !items.length) items = src.children;
    var wantSlug = norm(slug);
    var wantIso  = norm(iso);

    for (var i=0;i<items.length;i++){
      var it = items[i];
      var itSlug = norm(pickText(it, "js-blc-metier") || pickText(it, "js-metier-slug"));
      var itIso  = norm((pickText(it, "js-blc-iso") || pickText(it, "js-country-iso")).toUpperCase());
      if (wantSlug && itSlug && itSlug === wantSlug && (!wantIso || itIso === wantIso)) return it;
    }
    // fallback: si iso manque
    for (var j=0;j<items.length;j++){
      var it2 = items[j];
      var it2Slug = norm(pickText(it2, "js-blc-metier") || pickText(it2, "js-metier-slug"));
      if (wantSlug && it2Slug && it2Slug === wantSlug) return it2;
    }
    return null;
  }

  function t(dict){
    var l = getLang();
    return dict[l] || dict.fr || dict.en || "";
  }

  function makeCard(title, icon, sections){
    // sections: [{label, items[]}] ; ignore vides
    var hasAny = false;
    sections = (sections||[]).map(function(s){
      var items = (s.items||[]).filter(Boolean);
      if (items.length) hasAny = true;
      return { label: s.label, items: items };
    }).filter(function(s){ return s.items.length; });
    if (!hasAny) return null;

    var card = document.createElement("div");
    card.className = "ul-card ul-card--mpb";
    card.style.borderRadius = "18px";
    card.style.overflow = "hidden";
    card.style.background = "#fff";
    card.style.boxShadow = "0 10px 30px rgba(2,6,23,.08)";
    card.style.border = "1px solid rgba(15,23,42,.06)";
    card.style.marginBottom = "18px";

    var head = document.createElement("div");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.gap = "10px";
    head.style.padding = "14px 16px";
    head.style.fontWeight = "900";
    head.style.fontFamily = "Montserrat, system-ui";
    head.style.background = "rgba(59,130,246,.12)";
    head.style.color = "#0f172a";

    var ic = document.createElement("div");
    ic.textContent = icon || "📌";
    ic.style.fontSize = "16px";
    var h = document.createElement("div");
    h.textContent = title;

    head.appendChild(ic); head.appendChild(h);

    var body = document.createElement("div");
    body.style.padding = "14px 16px";

    sections.forEach(function(s){
      var lab = document.createElement("div");
      lab.textContent = s.label;
      lab.style.fontWeight = "800";
      lab.style.fontSize = "12px";
      lab.style.opacity = ".75";
      lab.style.margin = "8px 0 6px";
      lab.style.fontFamily = "Montserrat, system-ui";
      body.appendChild(lab);

      var ul = document.createElement("ul");
      ul.style.margin = "0";
      ul.style.paddingLeft = "18px";
      ul.style.display = "grid";
      ul.style.gap = "6px";

      s.items.forEach(function(x){
        var li = document.createElement("li");
        li.textContent = x;
        li.style.fontFamily = "Montserrat, system-ui";
        li.style.fontSize = "14px";
        li.style.color = "#0f172a";
        li.style.opacity = ".9";
        ul.appendChild(li);
      });

      body.appendChild(ul);
    });

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  function findInsertBefore(){
    // essaie de trouver le bloc "Environnements de travail" (FR/EN/DE/ES/IT)
    var targets = [
      "environnements de travail",
      "work environments",
      "arbeitsumgebungen",
      "entornos de trabajo",
      "ambienti di lavoro"
    ];
    var nodes = document.querySelectorAll("h1,h2,h3,h4,.ul-cardTitle,.u-block-title,.js-bloc-title");
    for (var i=0;i<nodes.length;i++){
      var txt = norm(nodes[i].textContent);
      for (var k=0;k<targets.length;k++){
        if (txt.includes(targets[k])) return nodes[i].closest(".ul-card, section, div") || nodes[i];
      }
    }
    return null;
  }

  function findLeftColumn(){
    return document.querySelector("#ulydia-left, .ul-col-left, .u-metier-left, .metier-left") || document.body;
  }

  function hideEmptySoftSkillsCard(){
    var cards = document.querySelectorAll(".ul-card, .u-card, .card");
    for (var i=0;i<cards.length;i++){
      var c = cards[i];
      var headTxt = norm((c.querySelector("h2,h3,h4,.ul-cardTitle,.u-card-title,.card-title")||{}).textContent||"");
      if (!headTxt.includes("soft skills")) continue;
      var bodyTxt = norm((c.textContent||"").replace(/soft skills essentiels/i,""));
      if (bodyTxt.length < 20) c.style.display = "none";
    }
  }

  function run(){
    var cmsItem = findCMSItem();
    if (!cmsItem) { hideEmptySoftSkillsCard(); return; }

    var edu_local = splitList(pickText(cmsItem, "js-blc-education_level_local"));
    var edu_req   = splitList(pickText(cmsItem, "js-blc-education_level"));
    var degrees   = splitList(pickText(cmsItem, "js-blc-degrees_examples"));

    var first_roles = splitList(pickText(cmsItem, "js-blc-first_routes"));
    var job_titles  = splitList(pickText(cmsItem, "js-blc-job_titles"));
    var employers   = splitList(pickText(cmsItem, "js-blc-physical_employers"));
    var sectors     = splitList(pickText(cmsItem, "js-blc-hiring_sectors"));

    var equiv = splitList(pickText(cmsItem, "js-blc-equivalences_reconversion"));
    var top_fields = splitList(pickText(cmsItem, "js-blc-top_fields"));

    var cards = [];

    var c1 = makeCard(
      t({fr:"Niveau d’études & diplômes", en:"Education & qualifications", de:"Bildung & Abschlüsse", es:"Educación y titulaciones", it:"Formazione e qualifiche"}),
      "🎓",
      [
        { label: t({fr:"Niveau requis (local)", en:"Required level (local)", de:"Niveau (lokal)", es:"Nivel (local)", it:"Livello (locale)"}), items: edu_local },
        { label: t({fr:"Niveau requis", en:"Required level", de:"Erforderliches Niveau", es:"Nivel requerido", it:"Livello richiesto"}), items: edu_req },
        { label: t({fr:"Diplômes (exemples)", en:"Degrees (examples)", de:"Abschlüsse (Beispiele)", es:"Títulos (ejemplos)", it:"Titoli (esempi)"}), items: degrees }
      ]
    );
    if (c1) cards.push(c1);

    var c2 = makeCard(
      t({fr:"Débouchés & premiers postes", en:"Career outcomes & first roles", de:"Karriere & erste Rollen", es:"Salidas y primeros puestos", it:"Sbocchi e primi ruoli"}),
      "🧭",
      [
        { label: t({fr:"Premiers postes", en:"First roles", de:"Erste Rollen", es:"Primeros puestos", it:"Primi ruoli"}), items: first_roles.length ? first_roles : job_titles },
        { label: t({fr:"Employeurs types", en:"Typical employers", de:"Typische Arbeitgeber", es:"Empleadores típicos", it:"Datori di lavoro tipici"}), items: employers },
        { label: t({fr:"Secteurs qui recrutent", en:"Hiring sectors", de:"Einstellende Branchen", es:"Sectores que contratan", it:"Settori che assumono"}), items: sectors }
      ]
    );
    if (c2) cards.push(c2);

    var c3 = makeCard(
      t({fr:"Accès & reconversion", en:"Access & career change", de:"Einstieg & Quereinstieg", es:"Acceso y reconversión", it:"Accesso e riconversione"}),
      "🔁",
      [
        { label: t({fr:"Voies d’accès", en:"Entry routes", de:"Einstiegswege", es:"Vías de acceso", it:"Percorsi di accesso"}), items: top_fields },
        { label: t({fr:"Équivalences / reconversion", en:"Equivalences / career change", de:"Äquivalenzen / Quereinstieg", es:"Equivalencias / reconversión", it:"Equivalenze / riconversione"}), items: equiv }
      ]
    );
    if (c3) cards.push(c3);

    if (!cards.length) { hideEmptySoftSkillsCard(); return; }

    var container = document.createElement("div");
    container.id = "ulydia-mpb-threeblocks";
    container.style.marginTop = "18px";

    cards.forEach(function(c){ container.appendChild(c); });

    var left = findLeftColumn();
    var before = findInsertBefore();
    if (before && before.parentNode) before.parentNode.insertBefore(container, before);
    else left.appendChild(container);

    hideEmptySoftSkillsCard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(run, 0); });
  } else {
    setTimeout(run, 0);
  }
})();