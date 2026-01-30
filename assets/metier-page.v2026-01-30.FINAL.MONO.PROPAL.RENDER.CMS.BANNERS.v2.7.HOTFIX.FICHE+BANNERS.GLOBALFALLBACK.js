
(function(){
  "use strict";
  // =========================================================
  // ULYDIA — Metier Page — MONO BUNDLE — v2.7 HOTFIX
  // - Tolerant globals:
  //   countries: __ULYDIA_COUNTRIES__ or __ULYDIA_PAYS__
  //   metiers:   __ULYDIA_METIERS__  or __ULYDIA_METIERS
  //   fiche:     __ULYDIA_FICHE_METIERS__ (preferred) OR derive from __ULYDIA_METIERS__ extra fields
  // - MPB:       __ULYDIA_METIER_PAYS_BLOCS__ (array)
  // - FAQ:       __ULYDIA_FAQS__ (array) (metier match by NAME preferred, fallback slug-normalized)
  // - Banners:
  //   non-sponsor: from countries fields (banner_wide/banner_square + text/cta)
  //   sponsor: from Worker endpoint /v1/metier-page OR /v1/sponsor-info (best-effort)
  // - No template required (mounts into #ulydia-metier-root)
  // =========================================================

  if (window.__ULYDIA_METIER_PAGE_V27__) return;
  window.__ULYDIA_METIER_PAGE_V27__ = true;

  var DEBUG = !!window.__METIER_PAGE_DEBUG__;
  function log(){ if(DEBUG) console.log.apply(console, arguments); }
  function warn(){ console.warn.apply(console, arguments); }

  // ----------------------------
  // Utils
  // ----------------------------
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function norm(s){ return String(s||"").trim().replace(/\s+/g," "); }
  function slugify(s){
    s = String(s||"").trim().toLowerCase();
    s = s.normalize ? s.normalize("NFD").replace(/[\u0300-\u036f]/g,"") : s;
    s = s.replace(/&nbsp;/g," ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    return s;
  }
  function getParam(name){
    try{
      var u = new URL(window.location.href);
      return u.searchParams.get(name);
    }catch(e){ return null; }
  }
  function pickUrl(v){
    if (!v) return "";
    if (typeof v === "string") return v;
    if (v.url) return v.url;
    if (v.src) return v.src;
    return "";
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

  // ----------------------------
  // Data sources (tolerant)
  // ----------------------------
  function getCountries(){
    return window.__ULYDIA_COUNTRIES__ || window.__ULYDIA_PAYS__ || [];
  }
  function getMetiers(){
    return window.__ULYDIA_METIERS__ || window.__ULYDIA_METIERS || [];
  }
  function getFicheMetiers(){
    // preferred dedicated global if you decide to create it later
    if (Array.isArray(window.__ULYDIA_FICHE_METIERS__)) return window.__ULYDIA_FICHE_METIERS__;
    // else try to reuse __ULYDIA_METIERS__ if it already contains fiche fields
    var arr = getMetiers();
    if (!Array.isArray(arr)) return [];
    // detect by presence of a fiche field
    var has = arr.some(function(x){ return x && (x.description || x.missions || x.competences || x.environnements || x.accroche); });
    return has ? arr : [];
  }
  function getMPB(){
    return window.__ULYDIA_METIER_PAYS_BLOCS__ || [];
  }
  function getFaqs(){
    return window.__ULYDIA_FAQS__ || [];
  }

  // ----------------------------
  // Worker (Airtable sponsors)
  // ----------------------------
  function getWorkerBase(){
    return (window.ULYDIA_WORKER_URL || "").trim();
  }
  function getProxySecret(){
    // historically: ULYDIA_PROXY_SECRET
    return (window.ULYDIA_PROXY_SECRET || window.ULYDIA_PROXY_KEY || window.ULYDIA_PROXY || "").trim();
  }
  function wfFetch(path){
    var base = getWorkerBase();
    if (!base) return Promise.reject(new Error("ULYDIA_WORKER_URL missing"));
    var url = base.replace(/\/$/,"") + path;
    var headers = {};
    var secret = getProxySecret();
    if (secret) headers["x-ulydia-proxy-secret"] = secret;
    return fetch(url, { headers: headers, credentials: "omit" }).then(function(r){
      return r.json().catch(function(){
        return r.text().then(function(t){ throw new Error("Non-JSON response: " + (t||"").slice(0,120)); });
      });
    });
  }
  function fetchSponsor(meta){
    // best effort: try /v1/metier-page first (if implemented), else /v1/sponsor-info
    var q = "?metier=" + encodeURIComponent(meta.slug||"") + "&country=" + encodeURIComponent(meta.iso||"");
    return wfFetch("/v1/metier-page" + q)
      .catch(function(){ return wfFetch("/v1/sponsor-info" + q); })
      .then(function(j){
        // normalize
        // expected either {ok:true, sponsor:{...}} or {ok:true, data:{sponsor:{...}}} etc.
        var s = (j && (j.sponsor || (j.data && j.data.sponsor) || (j.info && j.info.sponsor))) || null;
        if (!s) return null;
        return {
          name: s.name || s.sponsor_name || "",
          wide: pickUrl(s.logo_1 || s.sponsor_logo_1 || s.wide || s.banner_wide),
          square: pickUrl(s.logo_2 || s.sponsor_logo_2 || s.square || s.banner_square),
          link: s.link || s.lien || s.url || s.sponsor_link || ""
        };
      })
      .catch(function(err){
        log("[sponsor] fetch failed", err && err.message);
        return null;
      });
  }

  // ----------------------------
  // Matching logic
  // ----------------------------
  function resolveMeta(){
    var slug = (getParam("metier") || "").trim();
    var iso = (getParam("country") || "").trim().toUpperCase();

    // fallback: if missing iso, try from URL path or default
    if (!iso) iso = (window.__ULYDIA_ISO__ || "").toUpperCase() || "FR";

    return { slug: slug, iso: iso };
  }

  function findCountry(iso){
    var arr = getCountries();
    iso = (iso||"").toUpperCase();
    if (!Array.isArray(arr)) return null;
    return arr.find(function(c){
      var x = (c && (c.iso || c.code_iso || c.country_code || c.code || c.country)) || "";
      return String(x).toUpperCase() === iso;
    }) || null;
  }

  function findMetierBySlug(slug){
    var arr = getMetiers();
    if (!Array.isArray(arr) || !slug) return null;
    var s0 = slugify(slug);
    return arr.find(function(m){
      var s = m && (m.slug || m.metier_slug || m.job_slug);
      if (!s) return false;
      return slugify(s) === s0;
    }) || null;
  }

  function findFiche(meta){
    // prefer dedicated FICHE collection object by slug + iso/lang if present
    var arr = getFicheMetiers();
    if (!Array.isArray(arr) || !meta.slug) return null;
    var s0 = slugify(meta.slug);

    // first try strict slug match
    var hit = arr.find(function(x){
      var s = x && (x.slug || x.metier_slug || x.job_slug);
      if (!s) return false;
      return slugify(s) === s0;
    });
    if (hit) return hit;

    // fallback: try name match if slug differs (spaces vs -)
    var m = findMetierBySlug(meta.slug);
    var name = m && (m.name || m.nom || m.metier || m.title);
    if (name){
      var n0 = norm(name).toLowerCase();
      hit = arr.find(function(x){
        var n = x && (x.name || x.nom || x.metier || x.title);
        return n && norm(n).toLowerCase() === n0;
      });
      if (hit) return hit;
    }
    return null;
  }

  function findMPB(meta){
    var arr = getMPB();
    if (!Array.isArray(arr)) return null;
    var iso = (meta.iso||"").toUpperCase();
    var slug = slugify(meta.slug||"");

    // MPB metier is stored as NAME (Orthophoniste) in your current reader.
    // So we match by metier NAME if possible, otherwise by slug-normalized.
    var m = findMetierBySlug(meta.slug);
    var name = m && (m.name || m.nom || m.metier || m.title);
    var name0 = name ? norm(name).toLowerCase() : null;

    var hit = arr.find(function(b){
      if (!b) return false;
      var bIso = String(b.iso||b.country||"").toUpperCase();
      if (iso && bIso && bIso !== iso) return false;

      var bMet = norm(b.metier||b.name||"");
      if (!bMet) return false;

      if (name0 && norm(bMet).toLowerCase() === name0) return true;
      return slugify(bMet) === slug; // fallback
    });

    return hit || null;
  }

  function filterFaqs(meta){
    var arr = getFaqs();
    if (!Array.isArray(arr)) return [];
    var iso = (meta.iso||"").toUpperCase();
    var slug = slugify(meta.slug||"");
    var m = findMetierBySlug(meta.slug);
    var name = m && (m.name || m.nom || m.metier || m.title);
    var name0 = name ? norm(name).toLowerCase() : null;

    return arr.filter(function(f){
      if (!f) return false;
      if (f.iso && String(f.iso).toUpperCase() !== iso) return false;
      var fm = norm(f.metier || f.name || "");
      if (!fm) return false;

      // ✅ better: match by Name of FAQ collection
      if (name0 && norm(fm).toLowerCase() === name0) return true;
      return slugify(fm) === slug;
    });
  }

  // ----------------------------
  // Rendering (Designfull-ish)
  // ----------------------------
  function cssOnce(){
    if (document.getElementById("ulydia-v27-css")) return;
    var st = document.createElement("style");
    st.id = "ulydia-v27-css";
    st.textContent = `
      #ulydia-metier-root{max-width:1100px;margin:0 auto;padding:28px 18px 60px;font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .u-head{display:flex;gap:16px;align-items:flex-end;justify-content:space-between;margin-bottom:18px}
      .u-title{font-size:44px;line-height:1.1;margin:0;color:#6a63ff;font-weight:800;text-transform:none}
      .u-meta{display:flex;gap:10px;align-items:center;margin-top:10px}
      .u-pill{display:inline-flex;gap:6px;align-items:center;border:1px solid rgba(20,20,35,.12);border-radius:999px;padding:8px 12px;font-size:12px;color:#4a4a60;background:#fff}
      .u-grid{display:grid;grid-template-columns:1.7fr 1fr;gap:18px;align-items:start}
      .u-card{background:#fff;border:1px solid rgba(20,20,35,.08);border-radius:14px;box-shadow:0 10px 28px rgba(20,20,35,.06);overflow:hidden}
      .u-card-h{padding:12px 14px;font-weight:800;font-size:13px;color:#1b1b2a;background:linear-gradient(90deg, rgba(106,99,255,.16), rgba(106,99,255,.08))}
      .u-card-b{padding:14px;font-size:13px;color:#2b2b3a;line-height:1.55}
      .u-rt p{margin:0 0 10px}
      .u-rt ul{margin:8px 0 8px 18px}
      .u-banner{display:flex;align-items:center;justify-content:space-between;gap:14px;background:linear-gradient(90deg, #5b55ff, #7f5bff);border-radius:16px;padding:16px 18px;color:#fff;margin:8px 0 18px}
      .u-banner .t1{font-weight:900;font-size:14px}
      .u-banner .t2{opacity:.92;font-size:12px;margin-top:3px}
      .u-banner .cta{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.22);color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:800;font-size:12px}
      .u-banner img{height:40px;width:auto;max-width:140px;object-fit:contain;border-radius:10px;background:rgba(255,255,255,.12);padding:6px}
      .u-side .u-card{margin-bottom:14px}
      .u-faq{margin-top:18px}
      .u-faq .u-card-h{background:linear-gradient(90deg, rgba(255,172,86,.28), rgba(255,172,86,.12))}
      details.u-qa{border-top:1px solid rgba(20,20,35,.08);padding:12px 0}
      details.u-qa:first-of-type{border-top:none}
      summary.u-q{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:10px;font-weight:800;color:#1b1b2a}
      summary.u-q::-webkit-details-marker{display:none}
      .u-a{margin-top:8px;color:#2b2b3a}
      .u-empty{background:#fff3e6;border:1px solid rgba(255,172,86,.35);border-radius:16px;padding:16px 18px}
      .u-empty .t{font-weight:900}
      @media (max-width: 900px){ .u-grid{grid-template-columns:1fr} .u-title{font-size:34px} }
    `;
    document.head.appendChild(st);
  }

  function blockCard(title, html){
    return `
      <section class="u-card">
        <div class="u-card-h">${esc(title)}</div>
        <div class="u-card-b u-rt">${html || "<p>—</p>"}</div>
      </section>
    `;
  }

  function bannerHtml(opts){
    var img = opts.img ? `<img alt="" src="${esc(opts.img)}">` : "";
    var cta = opts.ctaText ? esc(opts.ctaText) : "En savoir plus →";
    var href = opts.href || "#";
    return `
      <div class="u-banner">
        <div>
          <div class="t1">${esc(opts.title||"Sponsor")}</div>
          <div class="t2">${esc(opts.subtitle||"Découvrez nos offres partenaires")}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${img}
          <a class="cta" href="${esc(href)}">${cta}</a>
        </div>
      </div>
    `;
  }

  function render(meta, metier, fiche, mpb, faqs, country, sponsor){
    cssOnce();
    var root = ensureRoot();

    var title = (metier && (metier.name||metier.nom||metier.title)) || (fiche && (fiche.name||fiche.nom||fiche.title)) || meta.slug || "Métier";
    var sector = (metier && (metier.secteur||metier.sector||metier.metier_sector)) || "—";

    // Decide banner (wide)
    var nonSponsorWide = country && (pickUrl(country.banner_wide || country.banniere_sponsoring_image_1 || country.banniere_sponsorisation_image_1 || country.js_country_banner_wide || country.banner_1));
    var nonSponsorSquare = country && (pickUrl(country.banner_square || country.banniere_sponsoring_image_2 || country.banniere_sponsorisation_image_2 || country.js_country_banner_square || country.banner_2));
    var nonSponsorText = (country && (country.banner_text || country.banniere_sponsorisation_texte || country.banniere_sponsoring_texte)) || "Découvrez nos offres partenaires";
    var nonSponsorCta = (country && (country.banner_cta || country.banniere_sponsorisation_cta)) || "En savoir plus →";
    var nonSponsorHref = "/sponsor?metier=" + encodeURIComponent(meta.slug||"") + "&country=" + encodeURIComponent(meta.iso||"");

    var wideImg = (sponsor && sponsor.wide) ? sponsor.wide : nonSponsorWide;
    var squareImg = (sponsor && sponsor.square) ? sponsor.square : nonSponsorSquare;
    var sponsorHref = (sponsor && sponsor.link) ? sponsor.link : nonSponsorHref;

    // Main content blocks:
    // If MPB exists => use its sections for formation/acces/marche/salaire + the right column chips/cards.
    // Else => show Fiche Metier blocks only (description/missions/competences/environnements/profil/evolutions)
    var left = "";
    var right = "";

    // Always show banner at top of content
    var bannerTop = bannerHtml({
      title: "Sponsor",
      subtitle: nonSponsorText,
      img: wideImg,
      ctaText: nonSponsorCta,
      href: sponsorHref
    });

    if (mpb){
      // MPB expected shape (from your reader): {formation, acces, marche, salary fields, chips, ...}
      if (mpb.formation) left += blockCard("Training", mpb.formation);
      if (mpb.acces) left += blockCard("Access to the role", mpb.acces);
      if (mpb.marche) left += blockCard("Market", mpb.marche);

      // Salary card (simple, since your MPB already provides ranges)
      var cur = (mpb.currency || (mpb.chips && (mpb.chips.Currency || mpb.chips.currency))) || (country && (country.currency || country.devise)) || "€";
      function fmtRange(min,max){
        if (min==null && max==null) return "—";
        if (min!=null && max!=null) return (min + " - " + max + " " + cur);
        if (min!=null) return (min + "+ " + cur);
        return ("≤ " + max + " " + cur);
      }
      var sHtml = `
        <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:center">
          <div style="font-weight:800">Junior</div><div style="text-align:right;font-weight:900;color:#5b55ff">${esc(fmtRange(mpb.junior_min, mpb.junior_max))}</div>
          <div style="font-weight:800">Mid</div><div style="text-align:right;font-weight:900;color:#5b55ff">${esc(fmtRange(mpb.mid_min, mpb.mid_max))}</div>
          <div style="font-weight:800">Senior</div><div style="text-align:right;font-weight:900;color:#5b55ff">${esc(fmtRange(mpb.senior_min, mpb.senior_max))}</div>
        </div>
        <div style="margin-top:10px;color:#4a4a60">${esc(mpb.salary_notes || "")}</div>
      `;
      left += blockCard("Salary", sHtml);

      // Right column: key indicators + skills/path + certifications + schools + portfolio
      var ind = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="u-card" style="box-shadow:none">
            <div class="u-card-b" style="padding:12px">
              <div style="font-size:11px;color:#6b6b80">Remote</div>
              <div style="font-weight:900">${esc(mpb.remote_level || "")}</div>
            </div>
          </div>
          <div class="u-card" style="box-shadow:none">
            <div class="u-card-b" style="padding:12px">
              <div style="font-size:11px;color:#6b6b80">Automation risk</div>
              <div style="font-weight:900">${esc(mpb.automation_risk || "")}</div>
            </div>
          </div>
        </div>
        <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="u-card" style="box-shadow:none">
            <div class="u-card-b" style="padding:12px">
              <div style="font-size:11px;color:#6b6b80">Time to employability</div>
              <div style="font-weight:900">${esc(mpb.entry_routes || "")}</div>
            </div>
          </div>
          <div class="u-card" style="box-shadow:none">
            <div class="u-card-b" style="padding:12px">
              <div style="font-size:11px;color:#6b6b80">Growth outlook</div>
              <div style="font-weight:900">${esc(mpb.growth_outlook || "")}</div>
            </div>
          </div>
        </div>
        <div style="margin-top:10px;color:#4a4a60">${esc(mpb.market_demand || "")}</div>
      `;
      right += `
        <section class="u-card">
          <div class="u-card-h">Key indicators</div>
          <div class="u-card-b">${ind}</div>
        </section>
      `;

      function pillsFrom(str){
        var t = String(str||"").replace(/&nbsp;/g," ").trim();
        if(!t) return "";
        // split on commas or bullets or line breaks
        var parts = t.split(/[,;\n•]+/).map(function(x){ return norm(x); }).filter(Boolean);
        return parts.map(function(p){
          return `<span class="u-pill" style="border-color:rgba(106,99,255,.18);background:rgba(106,99,255,.06);color:#514bff;font-weight:800">${esc(p)}</span>`;
        }).join(" ");
      }

      right += `
        <section class="u-card">
          <div class="u-card-h" style="background:linear-gradient(90deg, rgba(160,210,255,.4), rgba(160,210,255,.16))">Skills & path</div>
          <div class="u-card-b">
            <div style="font-weight:900;margin-bottom:8px">Key fields</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${pillsFrom(mpb.hiring_sectors)}</div>

            <div style="font-weight:900;margin-bottom:8px">Must-have skills</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${pillsFrom(mpb.skills_must_have)}</div>

            <div style="font-weight:900;margin-bottom:8px">Soft skills</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${pillsFrom(mpb.soft_skills)}</div>

            <div style="font-weight:900;margin-bottom:8px">Tools / stack</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${pillsFrom(mpb.tools_stack)}</div>
          </div>
        </section>
      `;

      if (mpb.certifications) right += blockCard("Certifications", "<p>"+esc(mpb.certifications).replace(/\n/g,"<br>")+"</p>");
      if (mpb.schools_or_paths || mpb.schools_or_paths === "") right += blockCard("Schools & paths", "<p>"+esc(mpb.schools_or_paths||"")+"</p>");
      if (mpb.portfolio_projects || mpb.portfolio_projects === "") right += blockCard("Portfolio projects", "<p>"+esc(mpb.portfolio_projects||"")+"</p>");

      // Square banner in sidebar if we have a square image
      if (squareImg){
        right = `
          <section class="u-card">
            <div class="u-card-h" style="background:linear-gradient(90deg, rgba(255,255,255,.0), rgba(255,255,255,.0));border-bottom:1px solid rgba(20,20,35,.08)">Premium</div>
            <div class="u-card-b" style="display:flex;gap:12px;align-items:center">
              <img alt="" src="${esc(squareImg)}" style="width:64px;height:64px;object-fit:contain;border-radius:14px;background:rgba(20,20,35,.03);padding:8px;border:1px solid rgba(20,20,35,.08)">
              <div>
                <div style="font-weight:900">${esc((sponsor && sponsor.name) ? sponsor.name : "Partenaire")}</div>
                <div style="font-size:12px;color:#6b6b80">${esc(meta.iso||"")}</div>
                <div style="margin-top:10px"><a class="u-pill" href="${esc(sponsorHref)}" style="text-decoration:none;background:rgba(106,99,255,.08);border-color:rgba(106,99,255,.22);color:#514bff;font-weight:900">En savoir plus</a></div>
              </div>
            </div>
          </section>
        ` + right;
      }
    } else {
      // No MPB: show fiche only blocks
      function fieldHtml(key){
        var v = fiche && (fiche[key] || fiche["js_fiche_" + key] || fiche["fiche_" + key]);
        if (!v) return "";
        // rich text already
        return String(v);
      }
      left += blockCard("Overview", fieldHtml("description") || "<p>—</p>");
      left += blockCard("Missions", fieldHtml("missions") || "<p>—</p>");
      left += blockCard("Skills", fieldHtml("competences") || "<p>—</p>");
      left += blockCard("Work environment", fieldHtml("environnements") || "<p>—</p>");
      left += blockCard("Profile sought", fieldHtml("profil_recherche") || "<p>—</p>");
      left += blockCard("Career path", fieldHtml("evolutions_possibles") || "<p>—</p>");
      right += blockCard("Info", "<p>MPB indisponible pour ce pays — affichage Fiche Métiers uniquement.</p>");
    }

    // FAQ
    var faqHtml = "";
    if (faqs && faqs.length){
      faqHtml = `
        <section class="u-card u-faq">
          <div class="u-card-h">Questions fréquentes</div>
          <div class="u-card-b">
            ${faqs.map(function(f){
              return `
                <details class="u-qa">
                  <summary class="u-q"><span>${esc(f.question||"")}</span><span>▾</span></summary>
                  <div class="u-a u-rt">${String(f.answer||"")}</div>
                </details>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }

    root.innerHTML = `
      <div class="u-head">
        <div>
          <h1 class="u-title">${esc(title)}</h1>
          <div class="u-meta">
            <span class="u-pill">Sector: ${esc(sector||"—")}</span>
            <span class="u-pill">Country: ${esc(meta.iso||"")}</span>
          </div>
        </div>
      </div>

      ${bannerTop}

      <div class="u-grid">
        <div class="u-main">${left || ""}</div>
        <div class="u-side">${right || ""}</div>
      </div>

      ${faqHtml}
    `;
  }

  // ----------------------------
  // Bootstrap: wait for globals
  // ----------------------------
  function ready(){
    var meta = resolveMeta();

    var metier = findMetierBySlug(meta.slug);
    var fiche = findFiche(meta);
    var mpb = findMPB(meta);
    var country = findCountry(meta.iso);
    var faqs = filterFaqs(meta);

    // Sponsor fetch async then render
    fetchSponsor(meta).then(function(sponsor){
      // If no MPB for (slug+iso) => should still render fiche only (per your spec)
      render(meta, metier, fiche, mpb, faqs, country, sponsor);
    });
  }

  // Retry because CMS embeds may fill globals slightly after DOMContentLoaded
  var tries = 0;
  (function loop(){
    tries++;
    var okCountries = Array.isArray(getCountries()) && getCountries().length > 0;
    var okMetiers = Array.isArray(getMetiers()) && getMetiers().length > 0;
    var okMPB = Array.isArray(getMPB()); // can be empty, but should exist
    if (okMetiers && okCountries && okMPB){
      log("[v2.7] globals ready", {countries:getCountries().length, metiers:getMetiers().length, mpb:getMPB().length});
      ready();
      return;
    }
    if (tries > 120){
      warn("[v2.7] globals not ready (rendering anyway)", {countries:(getCountries()||[]).length, metiers:(getMetiers()||[]).length, mpb:(getMPB()||[]).length});
      ready();
      return;
    }
    setTimeout(loop, 50);
  })();

})();
