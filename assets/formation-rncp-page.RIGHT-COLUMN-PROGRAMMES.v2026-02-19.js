/**
 * ULYDIA RNCP PAGE — Right Column Programmes Block
 * Version: v2026-02-19.RIGHT-COLUMN-PROGRAMMES
 */

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const iso = params.get("iso") || "FR";

  if (!id) return;

  const res = await fetch(`/v1/formation-rncp?id=${id}&iso=${iso}`);
  const data = await res.json();

  if (!data?.programmes?.length) return;

  const rightCol = document.querySelector(".rncp-right-column");
  if (!rightCol) return;

  const block = document.createElement("div");
  block.className = "ulydia-programmes-block";
  block.innerHTML = `
    <div class="ulydia-card">
      <h3>Écoles & Programmes</h3>
      <div class="ulydia-programmes-list"></div>
    </div>
  `;

  const list = block.querySelector(".ulydia-programmes-list");

  data.programmes.forEach(p => {
    const card = document.createElement("div");
    card.className = "ulydia-programme-card";
    card.innerHTML = `
      <div class="logo">
        ${p.company?.logo_url ? `<img src="${p.company.logo_url}" alt="">` : ""}
      </div>
      <div class="content">
        <div class="school">${p.company?.name || ""}</div>
        <div class="title">${p.title || ""}</div>
        <div class="meta">
          ${p.city_name || ""} • ${p.duration_months || ""} mois
        </div>
        <div class="price">
          ${p.tuition_amount ? p.tuition_amount + " " + (p.tuition_currency || "") : ""}
        </div>
        <a href="/programme/${p.id}" class="cta">Voir le programme</a>
      </div>
    `;
    list.appendChild(card);
  });

  rightCol.appendChild(block);
});
