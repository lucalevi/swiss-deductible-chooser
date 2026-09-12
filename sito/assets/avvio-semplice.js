/**
 * L'avvio per le pagine che non hanno altro JavaScript: per ora la 404.
 *
 * Sulle altre pagine e' insurek.js a chiamare Lingua.avvia(). Qui non c'e'
 * calcolo da fare, ma le quattro lingue servono lo stesso.
 *
 * Sta in un file e non in un <script> dentro la pagina perche' cosi' la
 * politica dei contenuti (vedi _headers) puo' restare senza 'unsafe-inline'.
 */
(function () {
  "use strict";
  function avvia() {
    if (window.Lingua) window.Lingua.avvia();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    avvia();
  }
})();
