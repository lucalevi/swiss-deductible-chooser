#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Insurek — verifica che i JSON generati dicano esattamente quel che dice il CSV
federale.

    python3 etl/verifica.py

Rilegge la sorgente e il prodotto e li confronta combinazione per combinazione.
Non e' una formalita': l'ETL fa un pivot (sei righe del CSV diventano una
riga di sei premi) e un pivot sbagliato non si vede a occhio — i numeri
sembrerebbero comunque plausibili, solo attribuiti alla franchigia sbagliata.
Il controllo che i premi calino al crescere della franchigia serve proprio a
quello.

Esce con stato diverso da zero se qualcosa non torna: cosi' l'aggiornamento
automatico di settembre si ferma invece di pubblicare dati storti.
"""

from __future__ import annotations

import collections
import csv
import json
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
FONTE = RADICE / "dati-fonte"
USCITA = RADICE / "sito" / "dati"

FRANCHIGIE = [300, 500, 1000, 1500, 2000, 2500]
INDICE = {f"FRA-{f}": i for i, f in enumerate(FRANCHIGIE)}
CLASSI = {"AKL-ERW": "E", "AKL-JUG": "J"}


def main() -> None:
    guasti = []

    meta = json.loads((USCITA / "meta.json").read_text(encoding="utf-8"))
    cantoni = set(meta["cantoni"])

    atteso: dict[tuple, list] = {}
    with (FONTE / "Prämien_CH.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            classe = CLASSI.get(r["Altersklasse"])
            indice = INDICE.get(r["Franchise"])
            if classe is None or indice is None or r["Kanton"] not in cantoni:
                continue
            chiave = (r["Kanton"], r["Region"].replace("PR-REG CH", ""),
                      int(r["Versicherer"]), r["Tarif"], classe,
                      1 if r["Unfalleinschluss"] == "MIT-UNF" else 0)
            atteso.setdefault(chiave, [None] * 6)[indice] = round(float(r["Prämie"]), 2)

    letto: dict[tuple, list] = {}
    for percorso in sorted((USCITA / "premi").glob("*.json")):
        area = json.loads(percorso.read_text(encoding="utf-8"))
        if area["a"] != meta["anno"]:
            guasti.append(f"{percorso.name}: anno {area['a']}, ma meta.json dice {meta['anno']}")
        for o in area["o"]:
            letto[(area["k"], area["r"], o[0], o[1], o[2], o[3])] = o[4]

    mancanti = set(atteso) - set(letto)
    in_piu = set(letto) - set(atteso)
    if mancanti:
        guasti.append(f"{len(mancanti)} combinazioni del CSV non sono nei JSON, es. {sorted(mancanti)[0]}")
    if in_piu:
        guasti.append(f"{len(in_piu)} combinazioni nei JSON non stanno nel CSV, es. {sorted(in_piu)[0]}")

    diverse = [k for k in atteso if k in letto and letto[k] != atteso[k]]
    if diverse:
        guasti.append(f"{len(diverse)} combinazioni hanno premi diversi dal CSV, es. {diverse[0]}: "
                      f"CSV {atteso[diverse[0]]} contro JSON {letto[diverse[0]]}")

    storte = [k for k, v in letto.items()
              if [x for x in v if x is not None] != sorted([x for x in v if x is not None], reverse=True)]
    if storte:
        guasti.append(f"{len(storte)} offerte hanno premi che non calano al crescere della franchigia "
                      f"(pivot sbagliato?), es. {storte[0]}")

    # ogni assicuratore e ogni modello citati nelle aree devono avere un nome
    senza_nome = {str(o) for k in letto for o in [k[2]] if str(k[2]) not in meta["assicuratori"]}
    if senza_nome:
        guasti.append("assicuratori senza anagrafica: " + ", ".join(sorted(senza_nome)))
    senza_modello = {f"{k[2]}|{k[3]}" for k in letto if f"{k[2]}|{k[3]}" not in meta["modelli"]}
    if senza_modello:
        guasti.append(f"{len(senza_modello)} modelli senza nome, es. {sorted(senza_modello)[0]}")

    # ogni NPA deve puntare a un'area che esiste
    npa = json.loads((USCITA / "npa.json").read_text(encoding="utf-8"))
    aree = {p.stem for p in (USCITA / "premi").glob("*.json")}
    orfani = {v[1] + "-" + v[2] for voci in npa.values() for v in voci} - aree
    if orfani:
        guasti.append("NPA che puntano ad aree senza file di premi: " + ", ".join(sorted(orfani)))

    conteggio = collections.Counter(len([x for x in v if x is not None]) for v in letto.values())

    print(f"  anno di premio        : {meta['anno']}")
    print(f"  combinazioni nel CSV  : {len(atteso)}")
    print(f"  combinazioni nei JSON : {len(letto)}")
    print(f"  franchigie per offerta: {dict(sorted(conteggio.items()))}")
    print(f"  aree                  : {len(aree)}   NPA: {len(npa)}   "
          f"assicuratori: {len(meta['assicuratori'])}")

    if guasti:
        print("\nNON TORNA:")
        for g in guasti:
            print("  - " + g)
        sys.exit(1)
    print("\nTutto torna.")


if __name__ == "__main__":
    main()
