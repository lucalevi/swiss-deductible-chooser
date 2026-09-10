/**
 * Insurek — il motore di calcolo.
 *
 * Volutamente separato dal resto: qui dentro non si tocca il DOM, non si
 * legge niente dalla pagina e non si sa niente della lingua. Sono funzioni
 * pure che prendono numeri e restituiscono numeri, e questa e' la ragione per
 * cui il file esiste da solo — se un giorno Insurek tornasse ad avere un
 * backend, o diventasse una libreria, questo file si porta via com'e'.
 *
 * La regola svizzera, per l'assicurazione obbligatoria delle cure
 * medico-sanitarie (LAMal), per un adulto:
 *
 *   1. il premio si paga comunque, dodici volte l'anno;
 *   2. le prime spese sono a carico dell'assicurato fino alla franchigia;
 *   3. oltre la franchigia l'assicurato paga il 10% (l'aliquota percentuale),
 *      ma non piu' di 700 franchi l'anno.
 *
 * Da cui il costo totale annuo, che e' tutto quello che serve sapere:
 *
 *   costo(spesa) = premio×12 + min(spesa, franchigia)
 *                            + min(10% × (spesa − franchigia), 700)
 *
 * Sotto una certa spesa vince sempre la franchigia piu' alta, sopra vince
 * sempre la piu' bassa, e il punto in cui le due si scambiano il posto e'
 * quello che il sito chiama soglia di convenienza (break-even, in gergo).
 * Le franchigie intermedie, di norma, non vincono mai: la loro
 * curva sta sopra a una delle due estreme per ogni livello di spesa. Insurek
 * e' nato per far vedere questo, e continua a farlo — solo che adesso lo fa
 * per tutte le combinazioni disponibili, non per una sola.
 */
var Calcolo = (function () {
  "use strict";

  var FRANCHIGIE = [300, 500, 1000, 1500, 2000, 2500];
  var TETTO_PARTECIPAZIONE = 700;   // CHF l'anno, adulti
  var QUOTA_PARTECIPAZIONE = 0.10;  // 10% oltre la franchigia
  var SPESA_MASSIMA = 12000;        // oltre, tutte le curve sono parallele

  /** Quanto esce di tasca in un anno, franchigia e aliquota insieme. */
  function diTasca(franchigia, spesa) {
    if (spesa <= 0) return 0;
    var sottoFranchigia = Math.min(spesa, franchigia);
    var oltre = Math.max(0, spesa - franchigia);
    return sottoFranchigia + Math.min(oltre * QUOTA_PARTECIPAZIONE, TETTO_PARTECIPAZIONE);
  }

  /** Costo totale di un anno: premi + quel che si paga di tasca propria. */
  function costoAnnuo(premioMensile, franchigia, spesa) {
    return premioMensile * 12 + diTasca(franchigia, spesa);
  }

  /**
   * Classifica tutte le combinazioni disponibili in una zona.
   *
   * offerte: righe [assicuratore, tariffa, classe, infortuni, [6 premi]]
   *          come le scrive l'ETL; un premio a null vuol dire che quella
   *          franchigia da quell'assicuratore non esiste, e allora quella
   *          combinazione semplicemente non entra in classifica. Non e' un
   *          caso raro: su circa 9 900 combinazioni adulte, 500 hanno cinque
   *          franchigie invece di sei.
   */
  function classifica(offerte, spesa, filtri) {
    filtri = filtri || {};
    var esiti = [];
    for (var i = 0; i < offerte.length; i++) {
      var o = offerte[i];
      var assicuratore = o[0], tariffa = o[1], classe = o[2], infortuni = o[3], premi = o[4];

      if (filtri.classe && classe !== filtri.classe) continue;
      if (filtri.infortuni !== undefined && infortuni !== filtri.infortuni) continue;
      if (filtri.tipi && filtri.tipi.indexOf(filtri.tipoDi(assicuratore, tariffa)) === -1) continue;
      if (filtri.assicuratori && filtri.assicuratori.indexOf(assicuratore) === -1) continue;

      for (var f = 0; f < FRANCHIGIE.length; f++) {
        var premio = premi[f];
        if (premio === null || premio === undefined) continue;
        var annui = premio * 12;
        var tasca = diTasca(FRANCHIGIE[f], spesa);
        esiti.push({
          assicuratore: assicuratore,
          tariffa: tariffa,
          classe: classe,
          infortuni: infortuni,
          franchigia: FRANCHIGIE[f],
          indiceFranchigia: f,
          premioMensile: premio,
          premiAnnui: annui,
          diTasca: tasca,
          totale: annui + tasca,
          premi: premi
        });
      }
    }
    esiti.sort(function (a, b) {
      if (a.totale !== b.totale) return a.totale - b.totale;
      // A parita' di costo totale meglio la franchigia bassa: stesso prezzo,
      // meno rischio se l'anno va peggio del previsto.
      return a.franchigia - b.franchigia;
    });
    return esiti;
  }

  /**
   * Le soglie di convenienza di una singola offerta: i punti in cui cambia la
   * franchigia migliore. Restituisce [{spesa, da, a}] con gli importi.
   */
  function puntiDiSvolta(premi) {
    var svolte = [];
    var precedente = migliorFranchigia(premi, 0);
    if (precedente === null) return svolte;
    for (var spesa = 1; spesa <= SPESA_MASSIMA; spesa += 1) {
      var attuale = migliorFranchigia(premi, spesa);
      if (attuale !== precedente) {
        svolte.push({ spesa: spesa, da: FRANCHIGIE[precedente], a: FRANCHIGIE[attuale] });
        precedente = attuale;
      }
    }
    return svolte;
  }

  /** Indice della franchigia con il costo totale piu' basso a quella spesa. */
  function migliorFranchigia(premi, spesa) {
    var miglior = null, minimo = Infinity;
    for (var f = 0; f < FRANCHIGIE.length; f++) {
      if (premi[f] === null || premi[f] === undefined) continue;
      var costo = costoAnnuo(premi[f], FRANCHIGIE[f], spesa);
      if (costo < minimo - 0.0001) { minimo = costo; miglior = f; }
    }
    return miglior;
  }

  /**
   * Le sei curve di costo, per il grafico. Passi radi: le curve sono
   * spezzate con due soli ginocchi (la franchigia e il tetto), quindi bastano
   * i punti agli angoli piu' una griglia grossolana.
   */
  function curve(premi, spesaMassima) {
    var limite = spesaMassima || 8000;
    var ascisse = [];
    for (var x = 0; x <= limite; x += Math.max(25, Math.round(limite / 160))) ascisse.push(x);
    ascisse.push(limite);
    for (var f = 0; f < FRANCHIGIE.length; f++) {
      ascisse.push(FRANCHIGIE[f]);
      ascisse.push(FRANCHIGIE[f] + TETTO_PARTECIPAZIONE / QUOTA_PARTECIPAZIONE);
    }
    ascisse = ascisse
      .filter(function (v) { return v >= 0 && v <= limite; })
      .sort(function (a, b) { return a - b; })
      .filter(function (v, i, a) { return i === 0 || v !== a[i - 1]; });

    var risultato = [];
    for (var g = 0; g < FRANCHIGIE.length; g++) {
      if (premi[g] === null || premi[g] === undefined) { risultato.push(null); continue; }
      var punti = [];
      for (var k = 0; k < ascisse.length; k++) {
        punti.push([ascisse[k], costoAnnuo(premi[g], FRANCHIGIE[g], ascisse[k])]);
      }
      risultato.push({ franchigia: FRANCHIGIE[g], punti: punti });
    }
    return risultato;
  }

  /** Classe d'eta' dell'UFSP a partire dall'anno di nascita. */
  function classeEta(annoNascita, annoPremio) {
    var eta = annoPremio - annoNascita;
    if (eta <= 18) return "K";   // minorenni: fuori da questa versione
    if (eta <= 25) return "J";   // giovani adulti
    return "E";                  // adulti
  }

  return {
    FRANCHIGIE: FRANCHIGIE,
    TETTO_PARTECIPAZIONE: TETTO_PARTECIPAZIONE,
    QUOTA_PARTECIPAZIONE: QUOTA_PARTECIPAZIONE,
    SPESA_MASSIMA: SPESA_MASSIMA,
    diTasca: diTasca,
    costoAnnuo: costoAnnuo,
    classifica: classifica,
    puntiDiSvolta: puntiDiSvolta,
    migliorFranchigia: migliorFranchigia,
    curve: curve,
    classeEta: classeEta
  };
})();

if (typeof module !== "undefined" && module.exports) { module.exports = Calcolo; }
