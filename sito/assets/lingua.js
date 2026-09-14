/**
 * Insurek — lingua, intestazione, comparsa allo scorrimento.
 *
 * Quattro lingue: italiano, tedesco, francese, inglese. L'italiano sta
 * nell'HTML, le altre tre negli attributi data-de, data-fr, data-en. Il
 * motivo e' lo stesso di lucalevi.com: la pagina si legge anche con
 * JavaScript spento, e chi la indicizza trova del testo vero invece di un
 * guscio vuoto.
 *
 *   data-de / data-fr / data-en           contenuto dell'elemento
 *   data-aria-de / data-aria-fr / ...      aria-label
 *   data-ph-de / data-ph-fr / ...          placeholder di un campo
 *
 * Le tre lingue nazionali contano piu' dell'inglese, qui: i nomi dei modelli
 * assicurativi arrivano gia' tradotti in tedesco, francese e italiano dal
 * dataset dell'UFSP, mentre in inglese non esistono e restano in tedesco.
 *
 * Chi usa il sito lo apre quasi sempre nella lingua in cui vive, quindi la
 * prima scelta la fa il browser; da li' in poi vale quella dell'utente,
 * ricordata nel solo archivio locale (nessun cookie, niente che parta da qui).
 */
(function (window, document) {
  "use strict";

  var CHIAVE = "insurek-lingua";
  var LINGUE = ["it", "de", "fr", "en"];

  var META = {
    calcolatore: {
      it: {
        titolo: "Insurek — La cassa malati che ti costa meno",
        descrizione: "Dimmi dove abiti e quanto spendi in salute: Insurek confronta tutte le casse malati e tutte le franchigie della tua zona con i dati ufficiali dell'UFSP, e ti dice quale combinazione costa meno."
      },
      de: {
        titolo: "Insurek — Die Krankenkasse, die Sie am wenigsten kostet",
        descrizione: "Wohnort und Gesundheitskosten eingeben: Insurek vergleicht alle Krankenkassen und alle Franchisen Ihrer Region mit den offiziellen BAG-Daten und zeigt, welche Kombination am günstigsten ist."
      },
      fr: {
        titolo: "Insurek — L'assurance maladie qui vous coûte le moins",
        descrizione: "Indiquez où vous habitez et vos frais de santé : Insurek compare toutes les caisses et toutes les franchises de votre région avec les données officielles de l'OFSP et vous dit quelle combinaison coûte le moins."
      },
      en: {
        titolo: "Insurek — The Swiss health insurance that costs you least",
        descrizione: "Tell it where you live and what you spend on health care: Insurek compares every insurer and every deductible in your area using the official FOPH data, and names the cheapest combination."
      }
    },
    metodo: {
      it: { titolo: "Come funziona il calcolo — Insurek", descrizione: "La regola svizzera in tre righe, la formula del costo totale annuo, da dove vengono i dati e cosa Insurek non fa." },
      de: { titolo: "Wie gerechnet wird — Insurek", descrizione: "Die Schweizer Regel in drei Zeilen, die Formel der jährlichen Gesamtkosten, woher die Daten kommen und was Insurek nicht tut." },
      fr: { titolo: "Comment le calcul fonctionne — Insurek", descrizione: "La règle suisse en trois lignes, la formule du coût annuel total, d'où viennent les données et ce qu'Insurek ne fait pas." },
      en: { titolo: "How the calculation works — Insurek", descrizione: "The Swiss rule in three lines, the total annual cost formula, where the data comes from and what Insurek does not do." }
    }
  };

  // it-CH e non it: il sito parla a chi vive in Svizzera, come de-CH e fr-CH.
  var LOCALE = { it: "it-CH", de: "de-CH", fr: "fr-CH", en: "en-GB" };

  var corrente = "it";
  var ascoltatori = [];

  /**
   * La lingua la decide l'indirizzo, e nient'altro.
   *
   * Da settembre 2026 ogni lingua ha una pagina sua — / , /de/ , /fr/ , /en/ —
   * e ciascuna nasce gia' scritta nella sua lingua, con <html lang> che lo
   * dichiara. Leggere qui l'archivio locale o la lingua del browser vorrebbe
   * dire avere due verita' per la stessa pagina, e i casi in cui non vanno
   * d'accordo sono proprio quelli che fanno danno: apri un collegamento
   * tedesco e ti ritrovi in italiano perche' un mese fa avevi premuto IT.
   *
   * Chi arriva sulla radice in una lingua che non e' l'italiano lo vede
   * dall'interruttore in alto, che ora e' fatto di collegamenti veri.
   */
  function linguaIniziale() {
    try {
      var dichiarata = (document.documentElement.getAttribute("lang") || "").slice(0, 2).toLowerCase();
      if (LINGUE.indexOf(dichiarata) !== -1) return dichiarata;
    } catch (e) { /* nessun documento: impossibile, ma non si sa mai */ }
    return "it";
  }

  /** Il valore per la lingua chiesta, con l'italiano dell'HTML come base. */
  function valore(elemento, prefisso, lingua, base) {
    if (lingua === "it") return base;
    var attributo = elemento.getAttribute(prefisso + lingua);
    return attributo === null ? base : attributo;
  }

  function traduci(radice, lingua) {
    var nodi = radice.querySelectorAll("[data-de],[data-fr],[data-en]");
    for (var i = 0; i < nodi.length; i++) {
      var n = nodi[i];
      if (n.getAttribute("data-it") === null) n.setAttribute("data-it", n.innerHTML);
      n.innerHTML = valore(n, "data-", lingua, n.getAttribute("data-it"));
    }
    var etichette = radice.querySelectorAll("[data-aria-de],[data-aria-fr],[data-aria-en]");
    for (var j = 0; j < etichette.length; j++) {
      var e = etichette[j];
      if (e.getAttribute("data-aria-it") === null) e.setAttribute("data-aria-it", e.getAttribute("aria-label") || "");
      e.setAttribute("aria-label", valore(e, "data-aria-", lingua, e.getAttribute("data-aria-it")));
    }
    var campi = radice.querySelectorAll("[data-ph-de],[data-ph-fr],[data-ph-en]");
    for (var k = 0; k < campi.length; k++) {
      var c = campi[k];
      if (c.getAttribute("data-ph-it") === null) c.setAttribute("data-ph-it", c.getAttribute("placeholder") || "");
      c.setAttribute("placeholder", valore(c, "data-ph-", lingua, c.getAttribute("data-ph-it")));
    }
  }

  function applica(lingua) {
    corrente = lingua;
    document.documentElement.setAttribute("lang", LOCALE[lingua] || lingua);
    traduci(document, lingua);

    var pagina = document.body.getAttribute("data-pagina");
    var meta = META[pagina] && META[pagina][lingua];
    if (meta) {
      document.title = meta.titolo;
      var descrizione = document.querySelector('meta[name="description"]');
      if (descrizione) descrizione.setAttribute("content", meta.descrizione);
    }

    var bottoni = document.querySelectorAll(".lang-switch button[data-lang]");
    for (var i = 0; i < bottoni.length; i++) {
      bottoni[i].setAttribute("aria-pressed", bottoni[i].getAttribute("data-lang") === lingua ? "true" : "false");
    }

    for (var j = 0; j < ascoltatori.length; j++) ascoltatori[j](lingua);
  }

  function imposta(lingua) {
    if (LINGUE.indexOf(lingua) === -1 || lingua === corrente) return;
    try { window.localStorage.setItem(CHIAVE, lingua); } catch (e) { /* pazienza */ }
    applica(lingua);
  }

  function intestazione() {
    var testa = document.querySelector(".site-header");
    if (!testa) return;
    var aggiorna = function () {
      testa.setAttribute("data-bordered", window.scrollY > 8 ? "true" : "false");
    };
    aggiorna();
    window.addEventListener("scroll", aggiorna, { passive: true });
  }

  function comparsa() {
    var elementi = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < elementi.length; i++) elementi[i].classList.add("visibile");
      return;
    }
    var osservatore = new IntersectionObserver(function (voci) {
      for (var j = 0; j < voci.length; j++) {
        if (voci[j].isIntersecting) {
          voci[j].target.classList.add("visibile");
          osservatore.unobserve(voci[j].target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    for (var k = 0; k < elementi.length; k++) osservatore.observe(elementi[k]);
  }

  window.Lingua = {
    LINGUE: LINGUE,
    get: function () { return corrente; },
    imposta: imposta,
    /** Ritraduce un pezzo di pagina appena costruito da JavaScript. */
    ritraduci: function (radice) { traduci(radice || document, corrente); },
    /** Chiamata a ogni cambio di lingua: serve a ridisegnare i risultati. */
    quandoCambia: function (fn) { ascoltatori.push(fn); },
    avvia: function () {
      applica(linguaIniziale());
      var bottoni = document.querySelectorAll(".lang-switch button[data-lang]");
      for (var i = 0; i < bottoni.length; i++) {
        bottoni[i].addEventListener("click", function () {
          imposta(this.getAttribute("data-lang"));
        });
      }
      intestazione();
      comparsa();
    }
  };
})(window, document);
