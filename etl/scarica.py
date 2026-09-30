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
import re
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

# Il registro degli assicuratori ha la data nel nome del file, e l'UFSP ne ha
# cambiato la forma: fino al 2026 era "zugelassene-krankenversicherer-AAAA-01-01.xlsx",
# da settembre 2026 e' "zugelassene-krankenversicherer-AAAA-MM.xlsx" (2026-10) e
# il vecchio indirizzo da' 404. Invece di indovinare il nome, lo si legge dalla
# pagina dei download di Priminfo, che lo elenca sempre; l'elenco di nomi
# ipotizzati serve solo se la pagina non risponde o cambia struttura.
PAGINA_DOWNLOAD = "https://www.priminfo.admin.ch/de/downloads/aktuell"
NOME_REGISTRO = re.compile(r"zugelassene-krankenversicherer-\d{4}-\d{2}(?:-\d{2})?\.xlsx")


def fonti_registro() -> list[tuple[str, str]]:
    nomi: list[str] = []
    try:
        richiesta = urllib.request.Request(
            PAGINA_DOWNLOAD, headers={"User-Agent": "insurek/1.0 (+https://insurek.lucalevi.com)"})
        with urllib.request.urlopen(richiesta, timeout=60) as risposta:
            html = risposta.read().decode("utf-8", "replace")
        nomi += sorted(set(NOME_REGISTRO.findall(html)), reverse=True)
    except Exception as errore:
        print(f"  pagina dei download non leggibile ({errore}): provo i nomi noti")

    # ripiego: le due forme note del nome, per l'anno in arrivo e per quello in corso
    oggi = dt.date.today()
    for a in (oggi.year + 1, oggi.year):
        for coda in ("10", "09", "01-01"):
            nomi.append(f"zugelassene-krankenversicherer-{a}-{coda}.xlsx")
    visti: set[str] = set()
    return [(n, PRIMINFO + n) for n in nomi if not (n in visti or visti.add(n))]


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
