/*!ULYDIA — METIER PAGE — FINAL ONEFILE (CMS wrappers → data → render)
Version: v2026-01-30.FINAL.ONEFILE.MPB.I18N.RENDER1

- Single-file, no modules
- Uses existing Webflow CMS wrappers/classes only (no new required wrappers)
- Reads:
  - window.__ULYDIA_METIERS__  (or #metiersData JSON)
  - window.__ULYDIA_SECTEURS__ (or #sectorsData JSON)
  - window.__ULYDIA_COUNTRIES__/window.__ULYDIA_PAYS__ (or #paysData JSON)
  - Metier_Pays_Blocs from CMS wrapper "ul-cms-blocs-source" with the classes you already have
- Chooses current record by URL params: ?metier=<slug>&country=<ISO>&lang=<fr|en|de|es|it>
- Sets window.__ULYDIA_LANG__ deterministically (param lang > country language_finale > browser)
- Renders cards into #ulydia-metier-root (does not require Webflow template markup)
*/

(function () {
  "use strict";

  if (window.__ULYDIA_METIER_FINAL_ONEFILE__) return;
  window.__ULYDIA_METIER_FINAL_ONEFILE__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if (DEBUG && console && console.log) console.log.apply(console, arguments); }
  function warn(){ if (console && console.warn) console.warn.apply(console, arguments); }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }
  function getText(el){ return el ? norm(el.textContent||"") : ""; }
  function getHTML(el){ return el ? String(el.innerHTML||"").trim() : ""; }

  function parseNumberLoose(s){
    s = String(s||"").trim();
    if (!s) return null;
    var cleaned = s.replace(/[^\d\-,.]/g,"");
    if (!cleaned) return null;
    if (cleaned.indexOf(",") !== -1 && cleaned.indexOf(".") !== -1){
      cleaned = cleaned.replace(/,/g,"");
    } else if (cleaned.indexOf(",") !== -1 && cleaned.indexOf(".") === -1){
      cleaned = cleaned.replace(/,/g,".");
    }
    var n = Number(cleaned);
    return isFinite(n) ? n : null;
  }

  function qsParam(name){
    try { return new URLSearchParams(location.search).get(name); }
    catch(e){ return null; }
  }

  function guessLangFromBrowser(){
    var l = (navigator.language || "en").toLowerCase();
    if (l.indexOf("fr")===0) return "fr";
    if (l.indexOf("de")===0) return "de";
    if (l.indexOf("es")===0) return "es";
    if (l.indexOf("it")===0) return "it";
    return "en";
  }

  function safeJSONFromScriptTag(id){
    try{
      var el = document.getElementById(id);
      if (!el) return null;
      var txt = (el.textContent||"").trim();
      if (!txt) return null;
      return JSON.parse(txt);
    }catch(e){
      return null;
    }
  }

  function uniqBy(arr, keyFn){
    var seen = Object.create(null);
    var out = [];
    for (var i=0;i<(arr||[]).length;i++){
      var it = arr[i];
      var k = keyFn(it);
      if (!k) continue;
      if (seen[k]) continue;
      seen[k] = 1;
      out.push(it);
    }
    return out;
  }

  function ensureRoot(){
    var root = document.getElementById("ulydia-metier-root");
    if (!root){
      root = document.createElement("div");
      root.id = "ulydia-metier-root";
      document.body.appendChild(root);
    }
    return root;
  }

  function injectBaseStylesOnce(){
    if (document.getElementById("ulydia-metier-final-styles")) return;
    var css = ""
      + "#ulydia-metier-root{max-width:1180px;margin:0 auto;padding:24px 16px;font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}"
      + ".ul-card{background:#fff;border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden;margin:14px 0;}"
      + ".ul-card-hd{padding:18px 20px;background:linear-gradient(90deg, rgba(160,120,255,.25), rgba(200,160,255,.25));font-weight:800;font-size:20px;}"
      + ".ul-card-bd{padding:18px 20px;}"
      + ".ul-h1{font-size:44px;line-height:1.05;margin:8px 0 10px;font-weight:900;letter-spacing:-.02em;}"
      + ".ul-sub{color:#54606f;font-size:16px;margin:0 0 14px;}"
      + ".ul-kv{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 0;}"
      + ".ul-chip{display:inline-flex;align-items:center;gap:8px;padding:10px 12px;border-radius:999px;background:#f4f6fb;color:#2b3440;font-weight:700;font-size:13px;}"
      + ".ul-rt p{margin:10px 0;}"
      + ".ul-rt ul{margin:10px 0 10px 20px;}"
      + ".ul-rt li{margin:6px 0;}"
      + ".ul-muted{color:#6b7280;font-size:13px;}"
      + ".ul-salary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px;}"
      + "@media(max-width:780px){.ul-salary-grid{grid-template-columns:1fr;}}"
      + ".ul-salary-box{border:1px solid #eef2f7;border-radius:18px;padding:12px 12px;}"
      + ".ul-salary-lbl{font-weight:900;margin-bottom:6px;}"
      + ".ul-salary-val{font-weight:800;font-size:18px;}"
      + ".ul-badge{font-weight:900;color:#6d28d9;}"
    ;
    var st = document.createElement("style");
    st.id = "ulydia-metier-final-styles";
    st.type = "text/css";
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  function setDocumentLang(lang){
    try{ document.documentElement.setAttribute("lang", lang); }catch(e){}
    try{
      var meta = document.querySelector('meta[name="google"]');
      if (!meta){
        meta = document.createElement("meta");
        meta.setAttribute("name","google");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content","notranslate");
    }catch(e){}
  }

  var I18N = {
    fr: { overview:"Vue d'ensemble", blocks:"Blocs pays", formation:"Formation", acces:"Accès", marche:"Marché", competences:"Compétences clés", salaires:"Rémunération", indicateurs:"Indicateurs",
          no_data:"Aucune donnée Metier_Pays_Blocs pour ce métier/pays.", salary_junior:"Junior", salary_mid:"Confirmé", salary_senior:"Senior", currency:"Devise", variable:"Variable",
          remote_level:"Télétravail", automation_risk:"Risque d'automatisation", generation:"Statut / génération" },
    en: { overview:"Overview", blocks:"Country blocks", formation:"Education & training", acces:"Entry requirements", marche:"Market", competences:"Key skills", salaires:"Compensation", indicateurs:"Indicators",
          no_data:"No Metier_Pays_Blocs data for this job/country.", salary_junior:"Junior", salary_mid:"Mid-level", salary_senior:"Senior", currency:"Currency", variable:"Variable",
          remote_level:"Remote level", automation_risk:"Automation risk", generation:"Status / generation" },
    de: { overview:"Überblick", blocks:"Länderspezifische Blöcke", formation:"Ausbildung", acces:"Zugang", marche:"Markt", competences:"Schlüsselkompetenzen", salaires:"Vergütung", indicateurs:"Indikatoren",
          no_data:"Keine Metier_Pays_Blocs-Daten für Beruf/Land.", salary_junior:"Junior", salary_mid:"Erfahren", salary_senior:"Senior", currency:"Währung", variable:"Variabel",
          remote_level:"Homeoffice", automation_risk:"Automatisierungsrisiko", generation:"Status / Generation" },
    es: { overview:"Resumen", blocks:"Bloques por país", formation:"Formación", acces:"Acceso", marche:"Mercado", competences:"Competencias clave", salaires:"Remuneración", indicateurs:"Indicadores",
          no_data:"No hay datos Metier_Pays_Blocs para este oficio/país.", salary_junior:"Junior", salary_mid:"Intermedio", salary_senior:"Senior", currency:"Moneda", variable:"Variable",
          remote_level:"Teletrabajo", automation_risk:"Riesgo de automatización", generation:"Estatus / generación" },
    it: { overview:"Panoramica", blocks:"Blocchi per paese", formation:"Formazione", acces:"Accesso", marche:"Mercato", competences:"Competenze chiave", salaires:"Retribuzione", indicateurs:"Indicatori",
          no_data:"Nessun dato Metier_Pays_Blocs per lavoro/paese.", salary_junior:"Junior", salary_mid:"Intermedio", salary_senior:"Senior", currency:"Valuta", variable:"Variabile",
          remote_level:"Lavoro da remoto", automation_risk:"Rischio automazione", generation:"Stato / generazione" }
  };

  function t(key){
    var lang = window.__ULYDIA_LANG__ || "en";
    var dict = I18N[lang] || I18N.en;
    return dict[key] || (I18N.en[key] || key);
  }

  function readMetiers(){
    var fromTag = safeJSONFromScriptTag("metiersData");
    if (Array.isArray(fromTag)) return fromTag;
    if (Array.isArray(window.__ULYDIA_METIERS__)) return window.__ULYDIA_METIERS__;
    return [];
  }
  function readCountries(){
    var fromTag = safeJSONFromScriptTag("paysData");
    if (Array.isArray(fromTag)) return fromTag;
    if (Array.isArray(window.__ULYDIA_COUNTRIES__)) return window.__ULYDIA_COUNTRIES__;
    if (Array.isArray(window.__ULYDIA_PAYS__)) return window.__ULYDIA_PAYS__;
    return [];
  }

  var MPB_FIELDS = ["formation","acces","salaire","marche","education_level_local","top_fields","certifications","schools_or_paths","equivalences_reconversion","entry_routes","first_job_titles","typical_employers","portfolio_projects","skills_must_have","soft_skills","tools_stack","time_to_employability","hiring_sectors","degrees_examples","growth_outlook","market_demand","salary_notes","education_level"];

  function readMPBAll(){
    var wrapper = document.querySelector(".ul-cms-blocs-source") || document.querySelector("[data-ul='cms-blocs-source']") || document.querySelector("[data-ul-cms='blocs']");
    if (!wrapper) return [];

    var items = wrapper.querySelectorAll(".w-dyn-item");
    if (!items || !items.length) items = wrapper.querySelectorAll("[role='listitem']");
    if (!items || !items.length) items = wrapper.children;

    var out = [];
    for (var i=0;i<items.length;i++){
      var it = items[i];
      if (!it || it.nodeType !== 1) continue;

      var metier = getText(it.querySelector(".js-bloc-metier"));
      var iso = getText(it.querySelector(".js-bloc-iso"));
      if (!metier || !iso) continue;

      var rec = { metier: metier, iso: iso };

      for (var f=0; f<MPB_FIELDS.length; f++){
        var key = MPB_FIELDS[f];
        var el = it.querySelector(".js-bf-" + key);
        if (!el) continue;
        rec[key] = { text: getText(el), html: getHTML(el) };
      }

      rec._salary = {
        currency: getText(it.querySelector(".js-chip-currency")) || null,
        junior: { min: parseNumberLoose(getText(it.querySelector(".js-sal-junior-min"))), max: parseNumberLoose(getText(it.querySelector(".js-sal-junior-max"))) },
        mid:    { min: parseNumberLoose(getText(it.querySelector(".js-sal-mid-min"))),    max: parseNumberLoose(getText(it.querySelector(".js-sal-mid-max"))) },
        senior: { min: parseNumberLoose(getText(it.querySelector(".js-sal-senior-min"))), max: parseNumberLoose(getText(it.querySelector(".js-sal-senior-max"))) },
        variable_share: getText(it.querySelector(".js-sal-variable-share")) || null
      };

      rec._indicators = {
        remote_level: getText(it.querySelector(".js-chip-remote_level")) || null,
        automation_risk: getText(it.querySelector(".js-chip-automation_risk")) || null,
        statut_generation: getText(it.querySelector(".js-statut-generation")) || null
      };

      out.push(rec);
    }

    return uniqBy(out, function(r){ return (r.metier+"|"+r.iso).toLowerCase(); });
  }

  function pickMPB(metierSlug, iso){
    var all = window.__ULYDIA_MPB_ALL__;
    if (!Array.isArray(all) || !all.length){
      all = readMPBAll();
      window.__ULYDIA_MPB_ALL__ = all;
    }
    metierSlug = String(metierSlug||"").trim().toLowerCase();
    iso = String(iso||"").trim().toUpperCase();
    for (var i=0;i<all.length;i++){
      var r = all[i];
      if (!r) continue;
      if (String(r.metier||"").trim().toLowerCase() === metierSlug &&
          String(r.iso||"").trim().toUpperCase() === iso){
        return r;
      }
    }
    return null;
  }

  function resolveLang(iso){
    var param = (qsParam("lang")||"").trim().toLowerCase();
    if (param && I18N[param]) return param;

    var countries = readCountries();
    iso = String(iso||"").trim().toUpperCase();
    for (var i=0;i<countries.length;i++){
      var c = countries[i];
      var cIso = String(c.iso||c.code_iso||c.code||"").trim().toUpperCase();
      if (cIso === iso){
        var lf = String(c.language_finale||c.lang||c.language||"").trim().toLowerCase();
        if (lf && I18N[lf]) return lf;
      }
    }
    return guessLangFromBrowser();
  }

  function escapeHTML(s){
    s = String(s||"");
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
            .replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function rtFromField(field){
    if (!field) return "";
    if (typeof field === "string") return field;
    if (field.html) return field.html;
    if (field.text) return "<p>"+escapeHTML(field.text)+"</p>";
    return "";
  }

  function hasAnyField(mpb){
    if (!mpb) return false;
    for (var i=0;i<MPB_FIELDS.length;i++){
      var k = MPB_FIELDS[i];
      var v = mpb[k];
      if (!v) continue;
      if ((v.text && v.text.trim()) || (v.html && v.html.trim())) return true;
    }
    var s = mpb._salary || {};
    if (s.currency || s.variable_share ||
        (s.junior && (s.junior.min!=null || s.junior.max!=null)) ||
        (s.mid && (s.mid.min!=null || s.mid.max!=null)) ||
        (s.senior && (s.senior.min!=null || s.senior.max!=null))) return true;

    var ind = mpb._indicators || {};
    if (ind.remote_level || ind.automation_risk || ind.statut_generation) return true;
    return false;
  }

  function fmtRange(min,max,currency){
    if (min==null && max==null) return "—";
    function f(n){
      if (n==null) return "";
      try{ return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n); }
      catch(e){ return String(n); }
    }
    var a = f(min), b = f(max);
    if (a && b) return a + " – " + b + (currency ? " " + currency : "");
    if (a) return a + (currency ? " " + currency : "");
    if (b) return b + (currency ? " " + currency : "");
    return "—";
  }

  function render(metierSlug, iso){
    injectBaseStylesOnce();
    var root = ensureRoot();
    root.innerHTML = "";

    var metiers = readMetiers();
    var metierName = metierSlug || "Métier";
    var metierSector = "";
    for (var i=0;i<metiers.length;i++){
      var m = metiers[i];
      if (m && String(m.slug||"").trim().toLowerCase() === String(metierSlug||"").trim().toLowerCase()){
        metierName = m.name || metierName;
        metierSector = m.secteur || m.sector || "";
        break;
      }
    }

    var header = document.createElement("div");
    header.innerHTML =
      '<div class="ul-h1" translate="no">' + escapeHTML(metierName) + '</div>' +
      '<div class="ul-sub">' +
        (metierSector ? ('<span class="ul-badge" translate="no">'+escapeHTML(metierSector)+'</span> · ') : '') +
        '<span translate="no">'+escapeHTML(String(iso||"").toUpperCase())+'</span>' +
      '</div>';
    root.appendChild(header);

    var mpb = pickMPB(metierSlug, iso);

    var chips = [];
    if (mpb && mpb._indicators){
      if (mpb._indicators.remote_level) chips.push({k:t("remote_level"), v: mpb._indicators.remote_level});
      if (mpb._indicators.automation_risk) chips.push({k:t("automation_risk"), v: mpb._indicators.automation_risk});
      if (mpb._indicators.statut_generation) chips.push({k:t("generation"), v: mpb._indicators.statut_generation});
    }

    var cOverview = document.createElement("div");
    cOverview.className = "ul-card";
    cOverview.innerHTML =
      '<div class="ul-card-hd">'+escapeHTML(t("overview"))+'</div>' +
      '<div class="ul-card-bd">' +
        (chips.length ? ('<div class="ul-kv">' + chips.map(function(c){
          return '<span class="ul-chip"><span class="ul-muted">'+escapeHTML(c.k)+':</span> <span translate="no">'+escapeHTML(c.v)+'</span></span>';
        }).join("") + '</div>') : '<div class="ul-muted">'+escapeHTML(t("blocks"))+'</div>') +
      '</div>';
    root.appendChild(cOverview);

    if (!mpb || !hasAnyField(mpb)){
      var empty = document.createElement("div");
      empty.className = "ul-card";
      empty.innerHTML =
        '<div class="ul-card-hd">'+escapeHTML(t("blocks"))+'</div>' +
        '<div class="ul-card-bd"><div class="ul-muted">'+escapeHTML(t("no_data"))+'</div></div>';
      root.appendChild(empty);
      return;
    }

    var hasSalary = mpb._salary && (
      mpb._salary.currency || mpb._salary.variable_share ||
      (mpb._salary.junior && (mpb._salary.junior.min!=null || mpb._salary.junior.max!=null)) ||
      (mpb._salary.mid && (mpb._salary.mid.min!=null || mpb._salary.mid.max!=null)) ||
      (mpb._salary.senior && (mpb._salary.senior.min!=null || mpb._salary.senior.max!=null))
    );

    if (hasSalary){
      var cur = mpb._salary.currency || "";
      var salary = document.createElement("div");
      salary.className = "ul-card";
      salary.innerHTML =
        '<div class="ul-card-hd">'+escapeHTML(t("salaires"))+'</div>' +
        '<div class="ul-card-bd">' +
          '<div class="ul-kv">' +
            (cur ? ('<span class="ul-chip"><span class="ul-muted">'+escapeHTML(t("currency"))+':</span> <span translate="no">'+escapeHTML(cur)+'</span></span>') : '') +
            (mpb._salary.variable_share ? ('<span class="ul-chip"><span class="ul-muted">'+escapeHTML(t("variable"))+':</span> <span translate="no">'+escapeHTML(mpb._salary.variable_share)+'</span></span>') : '') +
          '</div>' +
          '<div class="ul-salary-grid">' +
            '<div class="ul-salary-box"><div class="ul-salary-lbl">'+escapeHTML(t("salary_junior"))+'</div><div class="ul-salary-val" translate="no">'+escapeHTML(fmtRange(mpb._salary.junior.min, mpb._salary.junior.max, cur))+'</div></div>' +
            '<div class="ul-salary-box"><div class="ul-salary-lbl">'+escapeHTML(t("salary_mid"))+'</div><div class="ul-salary-val" translate="no">'+escapeHTML(fmtRange(mpb._salary.mid.min, mpb._salary.mid.max, cur))+'</div></div>' +
            '<div class="ul-salary-box"><div class="ul-salary-lbl">'+escapeHTML(t("salary_senior"))+'</div><div class="ul-salary-val" translate="no">'+escapeHTML(fmtRange(mpb._salary.senior.min, mpb._salary.senior.max, cur))+'</div></div>' +
          '</div>' +
        '</div>';
      root.appendChild(salary);
    }

    function addBlock(titleKey, fieldKey){
      var fld = mpb[fieldKey];
      if (!fld) return;
      var html = rtFromField(fld);
      if (!html || !String(html).trim()) return;
      var card = document.createElement("div");
      card.className = "ul-card";
      card.innerHTML = '<div class="ul-card-hd">'+escapeHTML(t(titleKey))+'</div><div class="ul-card-bd ul-rt">'+html+'</div>';
      root.appendChild(card);
    }

    addBlock("formation","formation");
    addBlock("acces","acces");
    addBlock("marche","marche");
    addBlock("competences","skills_must_have");

    var already = { formation:1, acces:1, marche:1, skills_must_have:1 };
    for (var f=0; f<MPB_FIELDS.length; f++){
      var k = MPB_FIELDS[f];
      if (already[k]) continue;
      var fld = mpb[k];
      if (!fld) continue;
      var html = rtFromField(fld);
      if (!html || !String(html).trim()) continue;

      var nice = k.replace(/_/g," ").replace(/\b\w/g,function(m){ return m.toUpperCase(); });
      var card = document.createElement("div");
      card.className = "ul-card";
      card.innerHTML = '<div class="ul-card-hd">'+escapeHTML(nice)+'</div><div class="ul-card-bd ul-rt">'+html+'</div>';
      root.appendChild(card);
    }

    var ind = mpb._indicators || {};
    if (ind.remote_level || ind.automation_risk || ind.statut_generation){
      var c = document.createElement("div");
      c.className = "ul-card";
      c.innerHTML =
        '<div class="ul-card-hd">'+escapeHTML(t("indicateurs"))+'</div>' +
        '<div class="ul-card-bd"><div class="ul-kv">' +
          (ind.remote_level ? ('<span class="ul-chip"><span class="ul-muted">'+escapeHTML(t("remote_level"))+':</span> <span translate="no">'+escapeHTML(ind.remote_level)+'</span></span>') : '') +
          (ind.automation_risk ? ('<span class="ul-chip"><span class="ul-muted">'+escapeHTML(t("automation_risk"))+':</span> <span translate="no">'+escapeHTML(ind.automation_risk)+'</span></span>') : '') +
          (ind.statut_generation ? ('<span class="ul-chip"><span class="ul-muted">'+escapeHTML(t("generation"))+':</span> <span translate="no">'+escapeHTML(ind.statut_generation)+'</span></span>') : '') +
        '</div></div>';
      root.appendChild(c);
    }
  }

  function boot(){
    var metier = (qsParam("metier")||"").trim();
    var iso = (qsParam("country")||qsParam("iso")||"").trim() || "FR";

    if (!metier) warn("[ULYDIA] Missing ?metier= in URL");

    var lang = resolveLang(iso);
    window.__ULYDIA_LANG__ = lang;
    setDocumentLang(lang);

    window.__ULYDIA_CURRENT__ = { metier: metier, iso: iso, lang: lang };
    log("[ULYDIA] boot", window.__ULYDIA_CURRENT__);

    render(metier, iso);
  }

  if (document.readyState === "complete" || document.readyState === "interactive"){
    setTimeout(boot, 0);
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
