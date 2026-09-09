#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Insurek — scarica i file sorgente dell'UFSP in dati-fonte/.

    python3 etl/scarica.py

Esiste per due ragioni. La prima e' che quattro download a mano, una volta
l'anno, si sbagliano: si scarica il file dell'anno prima, o si dimentica il
registro degli assicuratori, e l'errore si scopre tardi. La seconda e' che
l'aggiornamento annuale gira da solo su GitHub Actions, e li' nessuno puo'
cliccare.

Se un anno l'UFSP sposta un file, e' qui che si mette la mano: gli indirizzi
stanno tutti in FONTI, in chiaro.
"""

from __future__ import annotations

import base64
import datetime as dt
import sys
import urllib.parse
import urllib.request
from pathlib import Path

FONTE = Path(__file__).resolve().parent.parent / "dati-fonte"

# opendata.swiss serve i file dell'UFSP attraverso un endpoint che prende il
# percorso dentro l'archivio codificato in base64. Lo costruiamo qui invece di
# incollare l'URL gia' cifrato: cosi' si legge che file si sta chiedendo.
BAGNET = "https://opendata.bagnet.ch/?r=/download&path="
PRIMINFO = "https://www.priminfo.admin.ch/downloads/"


def da_bagnet(percorso_interno: str) -> str:
    codificato = base64.b64encode(percorso_interno.encode("utf-8")).decode("ascii")
    return BAGNET + urllib.parse.quote(codificato, safe="")


FONTI = [
    ("Prämien_CH.csv", da_bagnet("/Praemien/Prämien_CH.csv"), True),
    ("Tarife.csv", da_bagnet("/Praemien/Tarife.csv"), True),
    ("Erläuterungen zu den Prämiendaten.xlsx",
     da_bagnet("/Praemien/Erläuterungen zu den Prämiendaten.xlsx"), False),
    ("praemienregionen.xlsx", PRIMINFO + "praemienregionen.xlsx", True),
]

# Il registro degli assicuratori ha la data nel nome del file. L'anno di premio
# e' quello dopo quello in corso da settembre in poi, ma a gennaio e' l'anno in
# corso: si provano tutti e due invece di indovinare.
def fonti_registro() -> list[tuple[str, str]]:
    oggi = dt.date.today()
    anni = [oggi.year + 1, oggi.year] if oggi.month >= 9 else [oggi.year, oggi.year + 1]
    return [(f"zugelassene-krankenversicherer-{a}-01-01.xlsx",
             PRIMINFO + f"zugelassene-krankenversicherer-{a}-01-01.xlsx") for a in anni]


def scarica(nome: str, url: str) -> int:
    destinazione = FONTE / nome
    provvisorio = FONTE / (nome + ".parziale")
    richiesta = urllib.request.Request(url, headers={"User-Agent": "insurek/1.0 (+https://insurek.lucalevi.com)"})
    with urllib.request.urlopen(richiesta, timeout=180) as risposta, provvisorio.open("wb") as f:
        while True:
            pezzo = risposta.read(1 << 16)
            if not pezzo:
                break
            f.write(pezzo)
    peso = provvisorio.stat().st_size
    if peso < 4096:
        provvisorio.unlink()
        raise OSError(f"{nome}: solo {peso} byte, non e' il file giusto")
    provvisorio.replace(destinazione)
    return peso


def main() -> None:
    FONTE.mkdir(parents=True, exist_ok=True)
    problemi = []

    for nome, url, obbligatorio in FONTI:
        try:
            peso = scarica(nome, url)
            print(f"  {nome:<44} {peso/1024:>8.0f} KB")
        except Exception as errore:
            print(f"  {nome:<44} FALLITO: {errore}")
            if obbligatorio:
                problemi.append(nome)

    # il registro: si tiene il primo anno che risponde
    for nome, url in fonti_registro():
        try:
            peso = scarica(nome, url)
            print(f"  {nome:<44} {peso/1024:>8.0f} KB")
            break
        except Exception:
            continue
    else:
        problemi.append("zugelassene-krankenversicherer-*.xlsx")
        print("  registro degli assicuratori                   FALLITO per tutti gli anni provati")

    # I file vecchi con un altro anno nel nome vanno tolti di mezzo: costruisci.py
    # prende l'ultimo in ordine alfabetico, e un residuo lo confonderebbe.
    registri = sorted(FONTE.glob("zugelassene-krankenversicherer-*.xlsx"))
    for vecchio in registri[:-1]:
        try:
            vecchio.unlink()
            print(f"  tolto il registro vecchio: {vecchio.name}")
        except OSError:
            print(f"  ATTENZIONE: {vecchio.name} e' di un anno vecchio e va tolto a mano")

    if problemi:
        sys.exit("\nMancano file obbligatori: " + ", ".join(problemi) +
                 "\nControllare gli indirizzi in FONTI: l'UFSP potrebbe averli spostati.")

    print("\nFatto. Adesso: python3 etl/costruisci.py")


if __name__ == "__main__":
    main()
