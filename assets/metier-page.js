/* ============================================================
   ULYDIA — METIER PAGE
   Version: SAFE v1.0 (white-screen proof)
============================================================ */

(function(){

/* =========================
   SAFETY GUARDS
========================= */
if (window.__ULYDIA_METIER_SAFE__) return;
window.__ULYDIA_METIER_SAFE__ = true;

function setReady(){
  try {
    document.documentElement.classList.remove("ul-metier-pending");
    document.documentElement.classList.add("ul-metier-ready");
  } catch(e){}
}
function setPending(){
  try {
    document.documentElement.classList.add("ul-metier-pending");
    document.documentElement.classList.remove("ul-metier-ready");
  } catch(e){}
}

/* Ensure page is never stuck invisible */
setTimeout(setReady, 2500);

/* =========================
   CONFIG
========================= */
const WORKER_URL = "https://ulydia-business.contact-871.workers.dev";

/* =========================
   UTILS
========================= */
function qs(k){
  return new URLSearchParams(location.search).get(k);
}
function safeText(v){
  return (typeof v === "string" && v.trim()) ? v : "";
}
function hide(el){
  if (el) el.style.display = "none";
}
function show(el){
  if (el) el.style.display = "";
}
function html(el, value){
  if (el) el.innerHTML = value || "";
}

/* =========================
   DOM TARGETS (SAFE)
========================= */
const DOM = {
  title: document.querySelector("h1"),
  accroche: document.querySelector(".metier-accroche"),
  overview: document.querySelector("[data-section='overview']"),
  missions: document.querySelector("[data-section='missions']"),
  competences: document.querySelector("[data-section='competences']"),
  environnements: document.querySelector("[data-section='environnements']"),
  profil: document.querySelector("[data-section='profil']"),
  evolutions: document.querySelector("[data-section='evolutions']"),

  bannerWide: document.querySelector("[data-banner='wide']"),
  bannerSquare: document.querySelector("[data-banner='square']"),
  sponsorName: document.querySelector("[data-sponsor-name]"),

  faq: document.querySelector("[data-section='faq']"),
  paysBlocks: document.querySelectorAll("[data-pays-bloc]")
};

/* Hide everything country-specific immediately */
DOM.paysBlocks.forEach(hide);
hide(DOM.faq);

/* =========================
   FETCH METIER
========================= */
async function fetchMetier(slug, iso){
  const url = `${WORKER_URL}/v1/metier-page?slug=${encodeURIComponent(slug)}&iso=${encodeURIComponent(iso)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

/* =========================
   APPLY METIER DATA
========================= */
function applyMetier(data){
  const f = data?.metier?.fieldData || data?.metier?.fields || {};

  html(DOM.title, safeText(f.Nom || f["Nom du métier"]));
  html(DOM.accroche, safeText(f.accroche));

  html(DOM.overview, f.description);
  html(DOM.missions, f.missions);
  html(DOM.competences, f.Compétences);
  html(DOM.environnements, f.environnements);
  html(DOM.profil, f.profil_recherche);
  html(DOM.evolutions, f.evolutions_possibles);
}

/* =========================
   APPLY SPONSOR
========================= */
function applySponsor(data){
  const f = data?.metier?.fieldData || {};
  const wide = f.sponsor_logo_2;
  const square = f.sponsor_logo_1;
  const link = safeText(f.lien_sponsor);
  const name = safeText(f.sponsor_name);

  if (!wide && !square) return;

  if (name && DOM.sponsorName) DOM.sponsorName.textContent = name;

  if (DOM.bannerWide && wide){
    DOM.bannerWide.innerHTML = "";
    const img = document.createElement("img");
    img.src = wide.url || wide;
    img.alt = name || "";
    if (link) {
      const a = document.createElement("a");
      a.href = link;
      a.target = "_blank";
      a.appendChild(img);
      DOM.bannerWide.appendChild(a);
    } else {
      DOM.bannerWide.appendChild(img);
    }
  }

  if (DOM.bannerSquare && square){
    DOM.bannerSquare.innerHTML = "";
    const img = document.createElement("img");
    img.src = square.url || square;
    img.alt = name || "";
    DOM.bannerSquare.appendChild(img);
  }
}

/* =========================
   APPLY COUNTRY BLOCKS
========================= */
function applyPaysBloc(data, slug, iso){
  const blocs = data?.metier_pays_blocs;
  if (!Array.isArray(blocs)) return;

  const bloc = blocs.find(b =>
    (b.job_slug === slug || b.metier_lie?.slug === slug) &&
    b.country_code === iso
  );
  if (!bloc) return;

  document.querySelectorAll("[data-pays-bloc]").forEach(show);
}

/* =========================
   APPLY FAQ
========================= */
function applyFAQ(data){
  const faqs = data?.faqs;
  if (!Array.isArray(faqs) || !faqs.length) return;
  show(DOM.faq);
}

/* =========================
   BOOT
========================= */
(async function boot(){
  try {
    setPending();

    const slug = qs("metier") || qs("slug");
    const iso = qs("country") || "FR";
    if (!slug) throw new Error("Missing slug");

    const data = await fetchMetier(slug, iso);

    applyMetier(data);
    applySponsor(data);
    applyPaysBloc(data, slug, iso);
    applyFAQ(data);

  } catch (e) {
    console.error("[metier-page] fatal", e);
  } finally {
    setReady();
  }
})();

})();
