(function(){

  var WORKER =
    (window.__ULYDIA_WORKER_BASE__ ||
     window.ULYDIA_WORKER_URL ||
     "https://api.ulydia.com")
    .replace(/\/+$/,"");

  function qs(){ return new URLSearchParams(location.search); }

  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function kebabToSnake(s){
    return String(s||"").trim().replace(/-/g,"_");
  }

  async function fetchJSON(url){
    var r = await fetch(url, { headers:{accept:"application/json"}});
    var txt = await r.text();
    try { return JSON.parse(txt); }
    catch(e){ return null; }
  }

  async function main(){

    var root = document.getElementById("ulydia-formation-root");
    if(!root) return;

    var q = qs();
    var slug = q.get("slug");
    var country = (q.get("country")||"").toUpperCase();
    var lang = (q.get("lang")||"").toLowerCase();

    if(!slug){
      root.innerHTML = "<div class='wrap'><h1>Formation not found</h1></div>";
      return;
    }

    slug = kebabToSnake(slug);

    var url =
      WORKER +
      "/v1/formation-page/" +
      encodeURIComponent(slug) +
      "?country=" + encodeURIComponent(country) +
      "&lang=" + encodeURIComponent(lang);

    var data = await fetchJSON(url);

    if(!data || !data.ok){
      root.innerHTML = "<div class='wrap'><h1>Formation not available</h1></div>";
      return;
    }

    var f = data.formation || {};
    var programmes = data.programmes || [];

    root.innerHTML =
      "<div class='wrap'>" +
        "<h1>" + esc(f.label || f.ref_slug) + "</h1>" +
        "<div class='grid'>" +

          "<div class='card sec-overview'>" +
            "<div class='cardHeader'>Aperçu</div>" +
            "<div class='pad'>" +
              "<div class='lead'>" +
                esc(f.description || "Description coming soon.") +
              "</div>" +
            "</div>" +
          "</div>" +

          "<div class='card sec-programs'>" +
            "<div class='cardHeader'>Programmes disponibles</div>" +
            "<div class='pad'>" +
              (programmes.length
                ? "<div class='list'>" +
                    programmes.map(function(p){
                      return "<div class='item'>" +
                        "<strong>" + esc(p.title) + "</strong><br/>" +
                        esc(p.city_name || "") +
                      "</div>";
                    }).join("") +
                  "</div>"
                : "<div class='lead'>No programs available.</div>"
              ) +
            "</div>" +
          "</div>" +

        "</div>" +
      "</div>";
  }

  if(document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", main);
  else
    main();

})();