/**
 * Insurek — l’applicazione.
 *
 * Tutto quello che succede succede qui, nel browser di chi usa il sito.
 * Non c’e' un server applicativo: la pagina scarica tre cose statiche —
 * l’anagrafica (meta.json), la tabella dei NPA (npa.json) e il file dei premi
 * della sola zona in cui abita chi sta guardando — e da li' in poi calcola
 * da sola. Nessun dato di chi usa il sito viene inviato da nessuna parte,
 * perche' non c’e' nessuna parte a cui inviarlo.
 *
 * La divisione del lavoro: calcolo.js sa la matematica e non sa niente della
 * pagina; lingua.js sa le lingue e non sa niente dei premi; questo file mette
 * insieme le due cose e disegna.
 */
(function (window, document) {
  "use strict";

  var DATI = "/dati/";

  /* Le fasce di spesa. I valori sono indicativi e dichiarati: chi conosce la
     propria cifra la scrive, e allora vale quella. Servono a dare una
     risposta a chi non ha idea di quanto spende, che e' quasi tutti. */
  var FASCE = {
    rara:      500,
    regolare:  2000,
    continua:  6000
  };

  var TIPI = ["BASE", "HAM", "HMO", "DIV"];

  /* Il testo che nasce da JavaScript. Quello che sta nell’HTML e' tradotto
     dagli attributi data-de/fr/en; questo no, perche' non esiste finche' non
     lo si costruisce. */
  var T = {
    it: {
      tipo: { BASE: "Base", HAM: "Medico di famiglia", HMO: "HMO", DIV: "Telemedicina e altri" },
      conInfortuni: "con infortuni", senzaInfortuni: "senza infortuni",
      classeE: "adulto", classeJ: "giovane adulto",
      etichettaRisposta: "La franchigia giusta per te",
      franchigiaCHF: "Franchigia {f} CHF",
      percheSvolta: "Con {s} di spese sanitarie all’anno conviene la franchigia da {f} franchi. La soglia di convenienza è intorno a {b}: sotto conviene la {alta}, sopra la {bassa}.",
      percheUnica: "Con questi premi la franchigia da {f} franchi conviene a qualsiasi livello di spesa.",
      combinazioneEtichetta: "La combinazione che costa meno nella tua zona",
      premiAnnui: "Premi, dodici mesi",
      tascaPropria: "Franchigia e partecipazione",
      totaleAnno: "Costo totale dell’anno",
      risparmio: "Sono <strong>{x}</strong> all’anno in meno della combinazione più cara della tua zona, e <strong>{y}</strong> in meno della media.",
      classificaTitolo: "Le dieci più convenienti",
      classificaNota: "Una riga per ogni cassa e modello, con la franchigia che per quella combinazione costa meno. Le altre franchigie della prima combinazione si vedono nel grafico qui sotto.",
      colPosizione: "#", colCassa: "Cassa malati", colModello: "Modello",
      colFranchigia: "Franchigia", colPremio: "Premio/mese", colTasca: "Di tasca", colTotale: "Totale anno",
      graficoTitolo: "E se le tue spese fossero diverse?",
      graficoNota: "Le sei franchigie di {nome}, modello {modello}, {inf}. La linea verticale è la spesa che hai indicato. Si vede a occhio perché le franchigie intermedie non vincono quasi mai: le loro curve restano sopra a una delle due estreme a ogni livello di spesa.",
      assiSpesa: "Spese sanitarie nell’anno (CHF)",
      assiCosto: "Costo totale dell’anno (CHF)",
      minorenne: "Insurek per ora vale solo per gli adulti. Per i minorenni le franchigie vanno da 0 a 600 CHF, il tetto della partecipazione è 350 CHF e ci sono gli sconti famiglia: sono regole diverse, e trattarle male sarebbe peggio che non trattarle.",
      annoStrano: "Controlla l’anno di nascita.",
      npaIgnoto: "Questo NPA non è nella tabella federale delle regioni di premio. Prova con il nome del comune.",
      nessunRisultato: "Con questi filtri non resta nessuna combinazione. Prova a riaprire qualche tipo di modello.",
      caricamento: "Carico i premi della tua zona…",
      erroreDati: "Non riesco a caricare i dati. Ricarica la pagina.",
      regione: "regione",
      giovaneAdulto: "Fino all’anno in cui compi 25 anni paghi il premio da giovane adulto, che è più basso: è quello che vedi qui."
    },
    de: {
      tipo: { BASE: "Standard", HAM: "Hausarzt", HMO: "HMO", DIV: "Telmed und andere" },
      conInfortuni: "mit Unfall", senzaInfortuni: "ohne Unfall",
      classeE: "Erwachsene", classeJ: "junge Erwachsene",
      etichettaRisposta: "Ihre richtige Franchise",
      franchigiaCHF: "Franchise {f} CHF",
      percheSvolta: "Bei {s} Gesundheitskosten im Jahr lohnt sich die Franchise von {f} Franken. Die Schwelle liegt bei rund {b}: darunter die {alta}, darüber die {bassa}.",
      percheUnica: "Mit diesen Prämien lohnt sich die Franchise von {f} Franken bei jedem Kostenniveau.",
      combinazioneEtichetta: "Die günstigste Kombination in Ihrer Region",
      premiAnnui: "Prämien, zwölf Monate",
      tascaPropria: "Franchise und Selbstbehalt",
      totaleAnno: "Gesamtkosten des Jahres",
      risparmio: "Das sind <strong>{x}</strong> pro Jahr weniger als die teuerste Kombination Ihrer Region und <strong>{y}</strong> weniger als der Durchschnitt.",
      classificaTitolo: "Die zehn günstigsten",
      classificaNota: "Eine Zeile pro Kasse und Modell, mit der Franchise, die für diese Kombination am günstigsten ist. Die übrigen Franchisen der ersten Kombination zeigt die Grafik unten.",
      colPosizione: "#", colCassa: "Krankenkasse", colModello: "Modell",
      colFranchigia: "Franchise", colPremio: "Prämie/Monat", colTasca: "Selbst", colTotale: "Jahr total",
      graficoTitolo: "Und wenn Ihre Kosten anders wären?",
      graficoNota: "Die sechs Franchisen von {nome}, Modell {modello}, {inf}. Die senkrechte Linie sind Ihre angegebenen Kosten. Man sieht, warum mittlere Franchisen fast nie gewinnen: ihre Kurven bleiben auf jedem Niveau über einer der beiden äusseren.",
      assiSpesa: "Gesundheitskosten im Jahr (CHF)",
      assiCosto: "Gesamtkosten des Jahres (CHF)",
      minorenne: "Insurek gilt vorerst nur für Erwachsene. Für Kinder gehen die Franchisen von 0 bis 600 CHF, der Selbstbehalt ist auf 350 CHF begrenzt und es gibt Familienrabatte: andere Regeln, die halb behandelt schlimmer wären als gar nicht.",
      annoStrano: "Bitte das Geburtsjahr prüfen.",
      npaIgnoto: "Diese PLZ steht nicht in der Bundestabelle der Prämienregionen. Versuchen Sie es mit dem Gemeindenamen.",
      nessunRisultato: "Mit diesen Filtern bleibt keine Kombination übrig. Öffnen Sie wieder ein paar Modelltypen.",
      caricamento: "Ich lade die Prämien Ihrer Region…",
      erroreDati: "Die Daten lassen sich nicht laden. Bitte die Seite neu laden.",
      regione: "Region",
      giovaneAdulto: "Bis zum Jahr, in dem Sie 25 werden, zahlen Sie die tiefere Prämie für junge Erwachsene: die sehen Sie hier."
    },
    /* Tipografia francese: prima di ; : ? ! e dentro le virgolette c’e' uno
       spazio unificatore (U+00A0), non uno normale. Con quello normale il
       segno di punteggiatura puo' andare a capo da solo, e a un lettore
       francese salta all’occhio. Non si vede nel codice: si misura. */
    fr: {
      tipo: { BASE: "Standard", HAM: "Médecin de famille", HMO: "HMO", DIV: "Télémédecine et autres" },
      conInfortuni: "avec accidents", senzaInfortuni: "sans accidents",
      classeE: "adulte", classeJ: "jeune adulte",
      etichettaRisposta: "La franchise qu’il vous faut",
      franchigiaCHF: "Franchise {f} CHF",
      percheSvolta: "Avec {s} de frais de santé par an, la franchise de {f} francs est la bonne. Le seuil de bascule est vers {b} : en dessous la {alta}, au-dessus la {bassa}.",
      percheUnica: "Avec ces primes, la franchise de {f} francs est la meilleure à tous les niveaux de frais.",
      combinazioneEtichetta: "La combinaison la moins chère de votre région",
      premiAnnui: "Primes, douze mois",
      tascaPropria: "Franchise et quote-part",
      totaleAnno: "Coût total de l’année",
      risparmio: "Soit <strong>{x}</strong> de moins par an que la combinaison la plus chère de votre région, et <strong>{y}</strong> de moins que la moyenne.",
      classificaTitolo: "Les dix moins chères",
      classificaNota: "Une ligne par caisse et par modèle, avec la franchise la moins chère pour cette combinaison. Les autres franchises de la première combinaison sont dans le graphique ci-dessous.",
      colPosizione: "#", colCassa: "Caisse maladie", colModello: "Modèle",
      colFranchigia: "Franchise", colPremio: "Prime/mois", colTasca: "À charge", colTotale: "Total année",
      graficoTitolo: "Et si vos frais étaient différents ?",
      graficoNota: "Les six franchises de {nome}, modèle {modello}, {inf}. La ligne verticale correspond aux frais que vous avez indiqués. On voit pourquoi les franchises intermédiaires ne gagnent presque jamais : leurs courbes restent au-dessus de l’une des deux extrêmes à tous les niveaux.",
      assiSpesa: "Frais de santé dans l’année (CHF)",
      assiCosto: "Coût total de l’année (CHF)",
      minorenne: "Insurek ne vaut pour l’instant que pour les adultes. Pour les enfants les franchises vont de 0 à 600 CHF, la quote-part est plafonnée à 350 CHF et il y a les rabais de famille : d’autres règles, qu’il vaut mieux ne pas traiter que mal traiter.",
      annoStrano: "Vérifiez l’année de naissance.",
      npaIgnoto: "Ce NPA ne figure pas dans la table fédérale des régions de primes. Essayez avec le nom de la commune.",
      nessunRisultato: "Avec ces filtres il ne reste aucune combinaison. Rouvrez quelques types de modèle.",
      caricamento: "Je charge les primes de votre région…",
      erroreDati: "Impossible de charger les données. Rechargez la page.",
      regione: "région",
      giovaneAdulto: "Jusqu’à l’année de vos 25 ans vous payez la prime de jeune adulte, plus basse : c’est celle affichée ici."
    },
    en: {
      tipo: { BASE: "Standard", HAM: "Family doctor", HMO: "HMO", DIV: "Telemedicine and others" },
      conInfortuni: "with accident cover", senzaInfortuni: "without accident cover",
      classeE: "adult", classeJ: "young adult",
      etichettaRisposta: "The deductible that fits you",
      franchigiaCHF: "CHF {f} deductible",
      percheSvolta: "At {s} of health costs a year the {f}-franc deductible wins. The tipping point is around {b}: below it the {alta}, above it the {bassa}.",
      percheUnica: "With these premiums the {f}-franc deductible wins at every level of health costs.",
      combinazioneEtichetta: "The cheapest combination in your area",
      premiAnnui: "Premiums, twelve months",
      tascaPropria: "Deductible and co-insurance",
      totaleAnno: "Total cost for the year",
      risparmio: "That is <strong>{x}</strong> a year less than the most expensive combination in your area, and <strong>{y}</strong> less than the average.",
      classificaTitolo: "The ten cheapest",
      classificaNota: "One row per insurer and model, showing the deductible that costs least for that combination. The other deductibles of the top combination are in the chart below.",
      colPosizione: "#", colCassa: "Insurer", colModello: "Model",
      colFranchigia: "Deductible", colPremio: "Premium/month", colTasca: "Out of pocket", colTotale: "Year total",
      graficoTitolo: "What if your costs were different?",
      graficoNota: "The six deductibles of {nome}, {modello} model, {inf}. The vertical line is the spending you entered. You can see why the middle deductibles almost never win: their curves stay above one of the two extremes at every level.",
      assiSpesa: "Health costs in the year (CHF)",
      assiCosto: "Total cost for the year (CHF)",
      minorenne: "Insurek covers adults only for now. For children the deductibles run from 0 to 600 CHF, co-insurance is capped at 350 CHF and family discounts apply: different rules, and handling them badly would be worse than not handling them.",
      annoStrano: "Please check the year of birth.",
      npaIgnoto: "This postcode is not in the federal premium-region table. Try the name of the town instead.",
      nessunRisultato: "No combination is left with these filters. Try switching some model types back on.",
      caricamento: "Loading the premiums for your area…",
      erroreDati: "The data will not load. Please reload the page.",
      regione: "region",
      giovaneAdulto: "Until the year you turn 25 you pay the lower young-adult premium: that is what you see here."
    }
  };

  function t() { return T[window.Lingua.get()] || T.it; }

  var stato = {
    meta: null,
    npa: null,
    indice: null,      // per la ricerca: [npa, localita, cantone, regione, comune]
    luogo: null,
    offerte: null,
    areaCaricata: null,
    annoNascita: null,
    fascia: "regolare",
    spesa: FASCE.regolare,
    spesaEsatta: null,
    /* 0 = senza infortuni, la variante di chi e' dipendente per almeno otto
       ore a settimana: gli infortuni glieli copre gia' il datore di lavoro
       (LAINF), e il premio scende. E' il caso della maggior parte delle
       persone, quindi e' la predefinita. Deve restare d’accordo con
       l’aria-pressed delle tessere [data-infortuni] nell’HTML. */
    infortuni: 0,
    tipi: TIPI.slice()
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------ formati */

  var formatoCHF = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 });
  var formatoCHF2 = new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function chf(v) { return "CHF " + formatoCHF.format(Math.round(v)); }
  function chf2(v) { return formatoCHF2.format(v); }

  function riempi(modello, valori) {
    return modello.replace(/\{(\w+)\}/g, function (_, chiave) {
      return valori[chiave] === undefined ? "" : valori[chiave];
    });
  }

  function testo(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ------------------------------------------------------- anagrafiche */

  function assicuratore(numero) {
    var a = stato.meta.assicuratori[String(numero)];
    return a || { n: "—", r: "", g: "" };
  }

  function modello(numero, tariffa) {
    var m = stato.meta.modelli[numero + "|" + tariffa];
    if (!m) return { nome: tariffa, tipo: "DIV" };
    var lingua = window.Lingua.get();
    var nome = m[lingua] || m.de;   // in inglese i modelli non esistono: resta il tedesco
    return { nome: nome, tipo: m.t, base: m.b === 1 };
  }

  function tipoDi(numero, tariffa) { return modello(numero, tariffa).tipo; }

  /* ------------------------------------------------------------ caricamento */

  function prendi(percorso) {
    return fetch(DATI + percorso, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(percorso + ": " + r.status);
      return r.json();
    });
  }

  function costruisciIndice() {
    var indice = [];
    Object.keys(stato.npa).forEach(function (codice) {
      stato.npa[codice].forEach(function (v) {
        indice.push({
          npa: codice, localita: v[0], cantone: v[1], regione: v[2], comune: v[3],
          cerca: (codice + " " + v[0] + " " + v[3]).toLowerCase()
        });
      });
    });
    return indice;
  }

  /* ------------------------------------------------------- ricerca del NPA */

  function cerca(query) {
    var q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    var esatti = [], parziali = [];
    for (var i = 0; i < stato.indice.length && esatti.length + parziali.length < 400; i++) {
      var v = stato.indice[i];
      if (v.npa.indexOf(q) === 0 || v.localita.toLowerCase().indexOf(q) === 0) esatti.push(v);
      else if (v.cerca.indexOf(q) !== -1) parziali.push(v);
    }
    var tutti = esatti.concat(parziali);
    // Una localita' puo' comparire piu' volte con lo stesso esito: si tiene
    // una voce per ogni combinazione davvero diversa di zona.
    var visti = {}, unici = [];
    for (var j = 0; j < tutti.length && unici.length < 12; j++) {
      var chiave = tutti[j].npa + "|" + tutti[j].localita + "|" + tutti[j].cantone + "|" + tutti[j].regione;
      if (visti[chiave]) continue;
      visti[chiave] = true;
      unici.push(tutti[j]);
    }
    return unici;
  }

  /** Quanti luoghi sono comparsi: lo dice solo il lettore di schermo. */
  function annunciaLuoghi(n) {
    var p = $("conta-luoghi");
    if (!p) return;
    var frasi = {
      it: n === 0 ? "Nessun luogo trovato" : n === 1 ? "Un luogo trovato" : n + " luoghi trovati",
      de: n === 0 ? "Kein Ort gefunden" : n === 1 ? "Ein Ort gefunden" : n + " Orte gefunden",
      fr: n === 0 ? "Aucun lieu trouv\u00e9" : n === 1 ? "Un lieu trouv\u00e9" : n + " lieux trouv\u00e9s",
      en: n === 0 ? "No place found" : n === 1 ? "One place found" : n + " places found",
    };
    p.textContent = frasi[window.Lingua.get()] || frasi.it;
  }

  function disegnaSuggerimenti(voci) {
    var lista = $("suggerimenti");
    annunciaLuoghi(voci.length);
    if (!voci.length) { lista.hidden = true; lista.innerHTML = ""; return; }
    var html = voci.map(function (v, i) {
      var zona = v.cantone + (v.regione !== "0" ? " · " + t().regione + " " + v.regione : "");
      return '<li><button type="button" data-voce="' + i + '">' +
             '<span><span class="luogo-npa">' + testo(v.npa) + '</span> ' + testo(v.localita) + '</span>' +
             '<span class="luogo-regione">' + testo(zona) + "</span></button></li>";
    }).join("");
    lista.innerHTML = html;
    lista.hidden = false;
    Array.prototype.forEach.call(lista.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () {
        scegliLuogo(voci[parseInt(b.getAttribute("data-voce"), 10)]);
      });
    });
  }

  function scegliLuogo(voce) {
    stato.luogo = voce;
    $("suggerimenti").hidden = true;
    if ($("conta-luoghi")) $("conta-luoghi").textContent = "";
    $("cerca-npa").value = "";
    $("cerca-guscio").hidden = true;
    var zona = voce.cantone + (voce.regione !== "0" ? " · " + t().regione + " " + voce.regione : "");
    $("luogo-scelto").innerHTML =
      "<span>" + testo(voce.npa + " " + voce.localita) + " <span class=\"luogo-regione\">" + testo(zona) + "</span></span>" +
      '<button type="button" id="cambia-luogo">' +
      testo({ it: "cambia", de: "ändern", fr: "changer", en: "change" }[window.Lingua.get()]) + "</button>";
    $("luogo-scelto").hidden = false;
    $("cambia-luogo").addEventListener("click", function () {
      stato.luogo = null;
      $("luogo-scelto").hidden = true;
      $("cerca-guscio").hidden = false;
      $("cerca-npa").focus();
      aggiorna();
    });
    caricaArea();
  }

  function caricaArea() {
    if (!stato.luogo) return;
    var area = stato.luogo.cantone + "-" + stato.luogo.regione;
    if (stato.areaCaricata === area) { aggiorna(); return; }
    mostraAvviso(t().caricamento);
    prendi("premi/" + area + ".json").then(function (dati) {
      stato.offerte = dati.o;
      stato.areaCaricata = area;
      aggiorna();
    }).catch(function () { mostraAvviso(t().erroreDati); });
  }

  /* ------------------------------------------------------------- risultati */

  function mostraAvviso(messaggio) {
    $("risultati").innerHTML = '<p class="avviso">' + testo(messaggio) + "</p>";
  }

  function pronti() {
    return stato.luogo && stato.offerte && stato.annoNascita && stato.classe && stato.classe !== "K";
  }

  function aggiorna() {
    var anno = stato.meta ? stato.meta.anno : new Date().getFullYear();
    stato.classe = stato.annoNascita ? Calcolo.classeEta(stato.annoNascita, anno) : null;

    var nota = $("nota-eta");
    nota.hidden = true;
    if (stato.annoNascita) {
      if (stato.annoNascita < 1900 || stato.annoNascita > anno) { nota.textContent = t().annoStrano; nota.hidden = false; }
      else if (stato.classe === "K") { nota.textContent = t().minorenne; nota.hidden = false; }
      else if (stato.classe === "J") { nota.textContent = t().giovaneAdulto; nota.hidden = false; }
    }

    if (!pronti()) {
      $("risultati").innerHTML = "";
      $("sezione-risultati").hidden = true;
      return;
    }

    var esiti = Calcolo.classifica(stato.offerte, stato.spesa, {
      classe: stato.classe,
      infortuni: stato.infortuni,
      tipi: stato.tipi,
      tipoDi: tipoDi
    });

    $("sezione-risultati").hidden = false;
    if (!esiti.length) { mostraAvviso(t().nessunRisultato); return; }

    disegnaRisposta(esiti);
  }

  function disegnaRisposta(esiti) {
    var v = esiti[0];
    var l = t();
    var totali = esiti.map(function (e) { return e.totale; });
    var peggiore = Math.max.apply(null, totali);
    var media = totali.reduce(function (a, b) { return a + b; }, 0) / totali.length;

    var svolte = Calcolo.puntiDiSvolta(v.premi);
    var perche;
    if (!svolte.length) {
      perche = riempi(l.percheUnica, { f: formatoCHF.format(v.franchigia) });
    } else {
      var s = svolte[0];
      perche = riempi(l.percheSvolta, {
        s: chf(stato.spesa), f: formatoCHF.format(v.franchigia), b: chf(s.spesa),
        alta: formatoCHF.format(Math.max(s.da, s.a)), bassa: formatoCHF.format(Math.min(s.da, s.a))
      });
    }

    var ass = assicuratore(v.assicuratore);
    var mod = modello(v.assicuratore, v.tariffa);
    var inf = v.infortuni ? l.conInfortuni : l.senzaInfortuni;

    var html = '<div class="risposta reveal visibile">' +
      '<div class="risposta-testa">' +
        '<p class="risposta-etichetta">' + testo(l.etichettaRisposta) + "</p>" +
        '<p class="risposta-franchigia">' + testo(riempi(l.franchigiaCHF, { f: formatoCHF.format(v.franchigia) })) + "</p>" +
        '<p class="risposta-perche">' + testo(perche) + "</p>" +
      "</div>" +
      '<div class="risposta-corpo">' +
        '<div class="combinazione">' +
          '<p class="eyebrow muted">' + testo(l.combinazioneEtichetta) + "</p>" +
          '<p class="combinazione-nome">' + testo(ass.n) + " — " + testo(mod.nome) + "</p>" +
          '<p class="combinazione-riga">' +
            (mod.nome.toLowerCase() === l.tipo[mod.tipo].toLowerCase() ? "" :
              '<span class="tipo-modello">' + testo(l.tipo[mod.tipo]) + "</span> &nbsp;") +
            testo(inf) + " · CHF " + testo(chf2(v.premioMensile)) + "/" +
            testo({ it: "mese", de: "Monat", fr: "mois", en: "month" }[window.Lingua.get()]) + "</p>" +
        "</div>" +
        '<div class="conti">' +
          '<div class="conto"><span class="conto-etichetta">' + testo(l.premiAnnui) + '</span><span class="conto-valore">' + testo(chf(v.premiAnnui)) + "</span></div>" +
          '<div class="conto"><span class="conto-etichetta">' + testo(l.tascaPropria) + '</span><span class="conto-valore">' + testo(chf(v.diTasca)) + "</span></div>" +
          '<div class="conto totale"><span class="conto-etichetta">' + testo(l.totaleAnno) + '</span><span class="conto-valore">' + testo(chf(v.totale)) + "</span></div>" +
        "</div>" +
        '<p class="risparmio">' + riempi(l.risparmio, { x: testo(chf(peggiore - v.totale)), y: testo(chf(media - v.totale)) }) + "</p>" +
      "</div></div>" +
      disegnaClassifica(esiti) +
      disegnaGrafico(v);

    $("risultati").innerHTML = html;
  }

  /**
   * Una riga per ogni combinazione cassa + modello, con la franchigia che per
   * quella combinazione costa meno. Senza questo la classifica si riempirebbe
   * dello stesso modello ripetuto con le sei franchigie, che e' informazione
   * che il grafico gia' da' meglio: qui servono dieci scelte diverse.
   */
  function unaPerModello(esiti) {
    var visti = {}, unici = [];
    for (var i = 0; i < esiti.length; i++) {
      var chiave = esiti[i].assicuratore + "|" + esiti[i].tariffa;
      if (visti[chiave]) continue;
      visti[chiave] = true;
      unici.push(esiti[i]);          // gia' ordinati per costo: il primo e' il migliore
    }
    return unici;
  }

  /**
   * La classifica. Su schermo largo e' una tabella di sette colonne; sotto i
   * 700 px ogni riga diventa una scheda (lo fa il foglio di stile), perche' a
   * 390 px la tabella era larga 883 px e il totale — la colonna che conta —
   * finiva fuori dallo schermo.
   *
   * Due accorgimenti perche' la scheda non costi accessibilita':
   *   - i ruoli sono scritti a mano (role="table", "row", "cell"...): con
   *     display:block il browser perde da solo quelli impliciti, e chi legge
   *     con un lettore di schermo si troverebbe un elenco di testi sciolti;
   *   - l'etichetta visibile dentro la cella («Franchigia 300») e'
   *     aria-hidden: l'intestazione di colonna c'e' gia' e la direbbe due
   *     volte.
   */
  function disegnaClassifica(esiti) {
    var l = t();
    function cella(etichetta, valore) {
      return '<td class="col-num" role="cell">' +
        '<span class="et-mobile" aria-hidden="true">' + testo(etichetta) + "</span>" +
        '<span class="va-mobile">' + valore + "</span></td>";
    }
    var righe = unaPerModello(esiti).slice(0, 10).map(function (e, i) {
      var ass = assicuratore(e.assicuratore);
      var mod = modello(e.assicuratore, e.tariffa);
      return '<tr role="row"' + (i === 0 ? ' data-vincente="true"' : "") + ">" +
        '<td class="posizione" role="cell">' + (i + 1) + "</td>" +
        '<td class="nome-assicuratore" role="cell" data-posizione="' + (i + 1) + '">' + testo(ass.n) + "</td>" +
        '<td class="col-modello" role="cell">' + testo(mod.nome) +
          (mod.nome.toLowerCase() === l.tipo[mod.tipo].toLowerCase() ? "" :
            '<br><span class="tipo-modello">' + testo(l.tipo[mod.tipo]) + "</span>") + "</td>" +
        cella(l.colFranchigia, formatoCHF.format(e.franchigia)) +
        cella(l.colPremio, chf2(e.premioMensile)) +
        cella(l.colTasca, formatoCHF.format(Math.round(e.diTasca))) +
        cella(l.colTotale, formatoCHF.format(Math.round(e.totale))) +
        "</tr>";
    }).join("");

    return '<div class="reveal visibile" style="margin-top:2.5rem">' +
      '<h3 style="margin-bottom:1rem">' + testo(l.classificaTitolo) + "</h3>" +
      '<div class="tabella-guscio"><table class="classifica" role="table"><thead role="rowgroup"><tr role="row">' +
        '<th role="columnheader">' + testo(l.colPosizione) + '</th><th role="columnheader">' + testo(l.colCassa) + '</th><th role="columnheader">' + testo(l.colModello) + "</th>" +
        '<th class="col-num" role="columnheader">' + testo(l.colFranchigia) + '</th><th class="col-num" role="columnheader">' + testo(l.colPremio) + "</th>" +
        '<th class="col-num" role="columnheader">' + testo(l.colTasca) + '</th><th class="col-num" role="columnheader">' + testo(l.colTotale) + "</th>" +
      '</tr></thead><tbody role="rowgroup">' + righe + "</tbody></table></div>" +
      '<p class="legenda-grafico">' + testo(l.classificaNota) + "</p></div>";
  }

  /* --------------------------------------------------------------- grafico */

  function disegnaGrafico(vincente) {
    var l = t();
    var limite = Math.max(6000, Math.min(Calcolo.SPESA_MASSIMA, stato.spesa * 2.2));
    var serie = Calcolo.curve(vincente.premi, limite).filter(Boolean);
    if (!serie.length) return "";

    // Margine sinistro largo: ci stanno i valori dell’asse e, ruotato, il suo
    // titolo. Senza titolo il lettore deve indovinare che quei numeri sono
    // franchi all’anno, e sono la meta' del senso del grafico.
    var L = 86, R = 16, S = 14, G = 46;      // margini
    var larghezza = 760, altezza = 380;
    var x0 = L, x1 = larghezza - R, y0 = S, y1 = altezza - G;

    var costi = [];
    serie.forEach(function (s) { s.punti.forEach(function (p) { costi.push(p[1]); }); });
    var minCosto = Math.min.apply(null, costi) * 0.97;
    var maxCosto = Math.max.apply(null, costi) * 1.02;

    var sx = function (v) { return x0 + (v / limite) * (x1 - x0); };
    var sy = function (v) { return y1 - ((v - minCosto) / (maxCosto - minCosto)) * (y1 - y0); };

    var pezzi = [];

    // griglia orizzontale e valori sull’asse dei costi
    var passi = 5;
    for (var i = 0; i <= passi; i++) {
      var valore = minCosto + (maxCosto - minCosto) * (i / passi);
      var y = sy(valore);
      pezzi.push('<line class="griglia" x1="' + x0 + '" y1="' + y.toFixed(1) + '" x2="' + x1 + '" y2="' + y.toFixed(1) + '"/>');
      pezzi.push('<text x="' + (x0 - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' +
                 formatoCHF.format(Math.round(valore / 100) * 100) + "</text>");
    }
    // valori sull’asse delle spese
    for (var k = 0; k <= 4; k++) {
      var spesa = (limite / 4) * k;
      pezzi.push('<text x="' + sx(spesa).toFixed(1) + '" y="' + (y1 + 18) + '" text-anchor="middle">' +
                 formatoCHF.format(Math.round(spesa)) + "</text>");
    }
    pezzi.push('<line class="asse" x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '"/>');

    // le curve; quella scelta e' nera, le altre grigie
    serie.forEach(function (s) {
      var viva = s.franchigia === vincente.franchigia;
      var d = s.punti.map(function (p, idx) {
        return (idx ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1);
      }).join(" ");
      pezzi.push('<path class="curva' + (viva ? " viva" : "") + '" d="' + d + '"/>');
    });

    // Le etichette delle sei franchigie finiscono tutte contro il bordo
    // destro, dove le curve sono vicinissime: senza spingerle via si
    // sovrappongono. Si parte dall’ordinata vera e si tiene una distanza
    // minima fra una e l’altra, dal basso verso l’alto.
    var etichette = serie.map(function (s) {
      var ultimo = s.punti[s.punti.length - 1];
      return { franchigia: s.franchigia, y: sy(ultimo[1]), viva: s.franchigia === vincente.franchigia };
    }).sort(function (a, b) { return b.y - a.y; });
    var minimo = 13;
    for (var e = 1; e < etichette.length; e++) {
      if (etichette[e - 1].y - etichette[e].y < minimo) etichette[e].y = etichette[e - 1].y - minimo;
    }
    etichette.forEach(function (et) {
      pezzi.push('<text class="etichetta-curva' + (et.viva ? " viva" : "") + '" x="' + (x1 - 2).toFixed(1) +
                 '" y="' + (et.y + 3.5).toFixed(1) + '" text-anchor="end">' +
                 formatoCHF.format(et.franchigia) + "</text>");
    });

    // dove sta chi guarda
    var xs = sx(Math.min(stato.spesa, limite));
    pezzi.push('<line class="marcatore" x1="' + xs.toFixed(1) + '" y1="' + y0 + '" x2="' + xs.toFixed(1) + '" y2="' + y1 + '"/>');

    pezzi.push('<text x="' + ((x0 + x1) / 2).toFixed(1) + '" y="' + (altezza - 8) + '" text-anchor="middle">' +
               testo(l.assiSpesa) + "</text>");
    pezzi.push('<text transform="rotate(-90)" x="' + (-(y0 + y1) / 2).toFixed(1) +
               '" y="14" text-anchor="middle">' + testo(l.assiCosto) + "</text>");

    var ass = assicuratore(vincente.assicuratore);
    var mod = modello(vincente.assicuratore, vincente.tariffa);

    return '<div class="reveal visibile" style="margin-top:2.5rem">' +
      '<h3 style="margin-bottom:1rem">' + testo(l.graficoTitolo) + "</h3>" +
      '<div class="grafico-guscio">' +
      '<div class="grafico-scorrevole"><svg class="grafico" viewBox="0 0 ' + larghezza + " " + altezza +
        '" role="img" aria-label="' + testo(l.graficoTitolo) + '">' + pezzi.join("") + "</svg></div>" +
      '<p class="legenda-grafico">' + testo(riempi(l.graficoNota, {
        nome: ass.n, modello: mod.nome, inf: vincente.infortuni ? l.conInfortuni : l.senzaInfortuni
      })) + "</p></div></div>";
  }

  /* ------------------------------------------------------------- controlli */

  function collegaControlli() {
    var campo = $("cerca-npa");
    campo.addEventListener("input", function () { disegnaSuggerimenti(cerca(campo.value)); });
    campo.addEventListener("focus", function () { if (campo.value) disegnaSuggerimenti(cerca(campo.value)); });
    document.addEventListener("click", function (e) {
      if (!$("cerca-guscio").contains(e.target)) $("suggerimenti").hidden = true;
    });

    $("anno-nascita").addEventListener("input", function () {
      var v = parseInt(this.value, 10);
      stato.annoNascita = isNaN(v) ? null : v;
      aggiorna();
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-fascia]"), function (b) {
      b.addEventListener("click", function () {
        stato.fascia = b.getAttribute("data-fascia");
        stato.spesa = FASCE[stato.fascia];
        stato.spesaEsatta = null;
        $("spesa-esatta").value = "";
        segnaTessere("data-fascia", stato.fascia);
        aggiorna();
      });
    });

    $("spesa-esatta").addEventListener("input", function () {
      var v = parseFloat(this.value);
      if (isNaN(v) || v < 0) {
        stato.spesaEsatta = null;
        stato.spesa = FASCE[stato.fascia];
        segnaTessere("data-fascia", stato.fascia);
      } else {
        stato.spesaEsatta = v;
        stato.spesa = v;
        segnaTessere("data-fascia", null);
      }
      aggiorna();
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-infortuni]"), function (b) {
      b.addEventListener("click", function () {
        stato.infortuni = parseInt(b.getAttribute("data-infortuni"), 10);
        segnaTessere("data-infortuni", String(stato.infortuni));
        aggiorna();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-tipo]"), function (c) {
      c.addEventListener("change", function () {
        stato.tipi = Array.prototype.filter
          .call(document.querySelectorAll("[data-tipo]"), function (x) { return x.checked; })
          .map(function (x) { return x.getAttribute("data-tipo"); });
        aggiorna();
      });
    });
  }

  function segnaTessere(attributo, valore) {
    Array.prototype.forEach.call(document.querySelectorAll("[" + attributo + "]"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute(attributo) === valore ? "true" : "false");
    });
  }

  /* ------------------------------------------------------------------ avvio */

  /* L’anno di premio sta nell’HTML come segnaposto e viene riscritto da
     meta.json: cosi' a settembre, quando escono i premi dell’anno dopo, basta
     rifare girare l’ETL e nessuna pagina va toccata a mano. Va riscritto anche
     a ogni cambio di lingua, perche' la traduzione rifa' l’innerHTML. */
  function scriviAnno() {
    if (!stato.meta) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-anno-premio]"), function (n) {
      n.textContent = stato.meta.anno;
    });
  }

  function avvia() {
    window.Lingua.avvia();
    window.Lingua.quandoCambia(function () {
      scriviAnno();
      if (stato.luogo) {
        var voce = stato.luogo;
        stato.luogo = null;
        scegliLuogo(voce);
      } else {
        aggiorna();
      }
    });

    segnaTessere("data-fascia", stato.fascia);
    segnaTessere("data-infortuni", String(stato.infortuni));

    Promise.all([prendi("meta.json"), prendi("npa.json")]).then(function (r) {
      stato.meta = r[0];
      stato.npa = r[1];
      stato.indice = costruisciIndice();
      collegaControlli();
      $("cerca-npa").disabled = false;
      scriviAnno();
      $("stato-dati").hidden = true;
    }).catch(function () {
      $("stato-dati").textContent = t().erroreDati;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia);
  else avvia();
})(window, document);
