#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Insurek — scarta la rigenerazione che cambia solo la data.

    python3 etl/ignora_data.py

meta.json contiene "generato", la data di oggi: costruisci.py la riscrive a ogni
esecuzione, quindi anche quando l'UFSP non ha pubblicato niente di nuovo i file
risultano "modificati" e l'aggiornamento annuale aprirebbe una pull request
inutile ad ogni giro. Questo script gira dopo la verifica e prima della pull
request: se l'UNICO file cambiato in sito/dati e' meta.json, e a parte la data
e' identico a quello gia' nel repository, lo ripristina. Cosi' "nessuna novita'"
significa davvero "nessuna differenza, nessuna pull request".

Se cambia qualsiasi altra cosa (un premio, un'area, l'anno, il registro) non
tocca niente: la data nuova va tenuta insieme ai dati nuovi.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
META = "sito/dati/meta.json"


def git(*argomenti: str) -> str:
    return subprocess.run(["git", *argomenti], cwd=RADICE, capture_output=True,
                          text=True, check=True).stdout


def senza_data(testo: str) -> dict:
    dati = json.loads(testo)
    dati.pop("generato", None)
    return dati


def main() -> None:
    stato = git("status", "--porcelain", "--untracked-files=all", "--", "sito/dati")
    cambiati = [riga[3:].strip() for riga in stato.splitlines()]

    if not cambiati:
        print("  nessuna differenza in sito/dati: nessuna pull request.")
        return
    if cambiati != [META]:
        print(f"  {len(cambiati)} file cambiati in sito/dati: si tiene tutto, data compresa.")
        return

    vecchio = senza_data(git("show", f"HEAD:{META}"))
    nuovo = senza_data((RADICE / META).read_text(encoding="utf-8"))
    if vecchio == nuovo:
        git("checkout", "--", META)
        print("  cambiata solo la data di generazione in meta.json: ripristinato, "
              "nessuna pull request.")
    else:
        print("  meta.json e' cambiato nei contenuti (anno, assicuratori, modelli...): "
              "si tiene.")


if __name__ == "__main__":
    main()
