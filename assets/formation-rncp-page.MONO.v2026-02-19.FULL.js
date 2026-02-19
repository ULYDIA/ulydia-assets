/**
 * ULYDIA RNCP PAGE — MONO FULL STABLE
 * Version: v2026-02-19.MONO.FULL
 */

(function(){

if (window.__ULYDIA_RNCP_MONO__) return;
window.__ULYDIA_RNCP_MONO__ = true;

const WORKER = (window.__ULYDIA_WORKER_BASE__ || "").replace(/\/+$/,"");

function qs(name){
  return new URLSearchParams(location.search).get(name);
}

async function run(){

  const id = qs("id");
  const iso = (qs("iso") || "FR").toUpperCase();

  if (!id) return;

  const res = await fetch(WORKER + "/v1/formation-rncp?id=" + id + "&iso=" + iso);
  const data = await res.json();

  if (!data?.ok) {
    console.warn("RNCP API error", data);
    return;
  }

  renderProgrammes(data.programmes || []);
}

function renderProgrammes(programmes){

  const right = document.querySelector(".rncp-right-column");
  if (!right) return;

  const block = document.createElement("div");
  block.className = "ulydia-card";
  block.innerHTML = `
    <h3>Écoles & Programmes</h3>
    <div class="ulydia-programmes-list"></div>
  `;

  const list = block.querySelector(".ulydia-programmes-list");

  programmes.forEach(p => {
    const card = document.createElement("div");
    card.className = "ulydia-programme-card";
    card.innerHTML = `
      <div><strong>${p.title || ""}</strong></div>
      <div>${p.city_name || ""}</div>
      <div>${p.tuition_amount ? p.tuition_amount + " " + (p.tuition_currency||"") : ""}</div>
      <a href="/programme/${p.id}">Voir le programme</a>
    `;
    list.appendChild(card);
  });

  right.appendChild(block);
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", run)
  : run();

})();
