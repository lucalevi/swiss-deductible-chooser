# insurek.lucalevi.com — quale assicurazione malattia costa meno

Insurek risponde a una domanda sola: **fra tutte le casse malati, tutti i
modelli e tutte le franchigie disponibili dove abito, quale combinazione mi
costa meno in un anno?**

Chi arriva dà due indicazioni — il NPA e l'anno di nascita — dice se va dal
medico raramente, regolarmente o di continuo, e ha la risposta. Niente da
ricopiare da Priminfo.

Quadrilingue (italiano, tedesco, francese, inglese), in scala di grigi, stesso
sistema visivo di `lucalevi.com` e di `way.lucalevi.com`.

## Com'è fatto

HTML, CSS e JavaScript scritti a mano, **nessuna build, nessun
`node_modules`**: la cartella `sito/` è già il sito, e si può servire da
qualsiasi hosting statico. Non c'è un server applicativo, non c'è un database
e non c'è nessuna chiamata a terzi mentre qualcuno usa la pagina: i premi sono
file JSON statici, il calcolo gira nel browser di chi guarda.

Prima Insurek era un'app Flask su PythonAnywhere che chiedeva all'utente di
copiare a mano sei premi da Priminfo. Il Python è rimasto, ma è passato dalla
parte giusta: adesso è uno script che gira **una volta l'anno** sul computer
di chi mantiene il sito, non a ogni visita.

```
dati-fonte/           i file dell'UFSP, scaricati a mano una volta l'anno
etl/scarica.py        scarica i file dell'UFSP
etl/costruisci.py     li trasforma nei JSON del sito
etl/verifica.py       ricontrolla i JSON contro il CSV federale
sito/                 QUESTO è il sito da pubblicare

sito/index.html       il calcolatore, col testo italiano dentro
sito/metodo/          la formula, le fonti, cosa Insurek non fa
sito/assets/calcolo.js   solo matematica: nessun DOM, nessuna lingua
sito/assets/insurek.js   l'applicazione: campi, classifica, grafico
sito/assets/lingua.js    le quattro lingue, l'intestazione, le comparse
sito/assets/styles.css   token, tipografia, campi, tabella, grafico
sito/assets/fonts.css    le regole @font-face (copia identica a lucalevi.com)
sito/fonts/           EB Garamond e Inter in woff2, con le licenze OFL
sito/dati/            GENERATI dall'ETL — non modificare a mano
  meta.json             anno, assicuratori, modelli, cantoni  (18 KB)
  npa.json              NPA → cantone e regione di premio    (182 KB)
  premi/<CT>-<R>.json   un file per area, il piu' grande      (31 KB)
.github/workflows/    l'aggiornamento annuale automatico
_to_delete/           il vecchio progetto Flask e il notebook (fuori dal repo)
```

Il browser scarica `meta.json`, `npa.json` e **un solo** file di premi: quello
della zona in cui abita chi sta guardando. In tutto meno di 250 KB.

## Guardarlo in locale

```bash
cd siti/insurek/sito && python3 -m http.server 8000   # poi http://localhost:8000
```

Serve un server vero, non il doppio clic sul file: i percorsi sono assoluti
(`/assets/...`, `/dati/...`) e `fetch` non funziona da `file://`.

## Rifare i dati — una volta l'anno, a fine settembre

L'UFSP approva e pubblica i premi dell'anno dopo verso il 22-23 settembre.
**Di norma non c'è niente da fare**: una GitHub Action gira di lunedì,
mercoledì e venerdì in settembre e ottobre, scarica, ricostruisce, verifica e
apre una pull request quando qualcosa è cambiato. La pull request va guardata
e fusa a mano — quello sì.

A mano, se serve:

```bash
python3 etl/scarica.py      # scarica i quattro file dell'UFSP in dati-fonte/
python3 etl/costruisci.py   # li trasforma nei JSON di sito/dati/
python3 etl/verifica.py     # li ricontrolla contro il CSV federale
```

`verifica.py` esce con errore se qualcosa non torna: combinazioni che
mancano, premi diversi da quelli del CSV, premi che non calano al crescere
della franchigia (il segnale che il pivot è andato storto), modelli senza
nome, NPA che puntano a un'area inesistente. È il passo che impedisce
all'aggiornamento automatico di pubblicare dati sbagliati, e vale la pena
lanciarlo anche a mano.

Poi si pubblica `sito/`. Nessuna pagina va toccata: l'anno di premio sta
nell'HTML come segnaposto e viene riscritto da `meta.json`.

Se un anno l'UFSP sposta un file, `scarica.py` fallisce dicendo quale: gli
indirizzi stanno in chiaro in cima al file, in `FONTI`. Vale la pena aprire
anche `Erläuterungen zu den Prämiendaten.xlsx`, che è la documentazione
ufficiale delle colonne: se cambia il tracciato, è lì che si scopre.

## Due repository, una cartella

Questa cartella **è** il clone di
`github.com/lucalevi/swiss-deductible-chooser`: ha il suo `.git`, il suo
`README.md` in inglese per chi arriva da GitHub, e questo LEGGIMI per chi ci
mette le mani. Il repository grande (`lucalevi-website`) la ignora, quindi non
ci sono due copie della stessa cosa e non serve nessun sottomodulo o subtree.

```bash
cd siti/insurek && git pull      # prende i dati nuovi che l'Action ha fuso
cd siti/insurek && git push      # pubblica le modifiche al sito
```

## Perché non uno scraper di Priminfo

Perché i premi di Priminfo **sono** questo dataset: il calcolatore federale è
costruito sopra gli stessi file, che l'UFSP pubblica con licenza di uso
libero. Fare lo scraping vorrebbe dire leggere in HTML fragile dei numeri che
sono già in CSV, reggere ogni restyling del sito federale, mettere carico su
un servizio pubblico e stare in una zona grigia — per ottenere le stesse
cifre. Fra l'altro Priminfo non ha nessuna API JSON per i premi: è un form che
rende HTML lato server.

## Cosa c'è dentro e cosa no

**C'è**: adulti (26+) e giovani adulti (19-25), tutti i cantoni e tutte le
regioni di premio, tutti gli assicuratori e tutti i modelli, con e senza
copertura infortuni, tutte e sei le franchigie — comprese le combinazioni in
cui una franchigia non esiste, che sono circa mille su ventimila.

**Non c'è**, per scelta: i minorenni (franchigie 0-600, tetto di
partecipazione 350, sconti famiglia: regole diverse, e trattarle male sarebbe
peggio che non trattarle), i premi UE/AELS, la riduzione cantonale dei premi.

## Fonte e licenza

Dati: Ufficio federale della sanità pubblica (UFSP), dataset
«Krankenversicherungsprämien» su opendata.swiss, uso libero con indicazione
della fonte. Codice: GNU GPL-2.0, vedi `LICENSE`.
