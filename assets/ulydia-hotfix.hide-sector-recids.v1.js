
/**
 * ULYDIA HOTFIX — hide Airtable record IDs displayed as sector labels under title
 * If the "Secteur:" chip value looks like an Airtable record id (recXXXXXXXXXXXXXXX),
 * replace it with an empty string and hide the chip.
 */
(function(){
  function isRecId(s){ return /^rec[a-zA-Z0-9]{12,}$/i.test(String(s||"").trim()); }

  function run(){
    try{
      const chips = document.querySelectorAll(".uf-chip, .ulydia-chip, .chip, [data-uf-chip]");
      chips.forEach(chip=>{
        const txt = (chip.textContent||"").trim();
        // look for "Secteur:" pattern
        if(/secteur\s*:/i.test(txt)){
          // try extract value after colon
          const parts = txt.split(":");
          const val = (parts.slice(1).join(":")||"").trim();
          if(isRecId(val)){
            chip.style.display = "none";
          }
        }
      });
    }catch(e){}
  }

  // run a few times because UI renders async
  window.addEventListener("load", run);
  setTimeout(run, 500);
  setTimeout(run, 1500);
  setTimeout(run, 3000);
})();
