#!/usr/bin/env python3
"""Mette la firma del contenuto negli indirizzi di CSS e JavaScript.

Perche' serve. Il sito e' statico e i fogli di stile si chiamano sempre
/assets/styles.css: se il contenuto cambia ma il nome no, il browser non ha
modo di accorgersene e continua a mostrare la versione che ha in cache. Con
un server che non manda intestazioni di cache — `python3 -m http.server`, ma
anche certi hosting mal configurati — il file vecchio puo' restare li' per
ore. Il risultato e' un sito che a te sembra rotto e sul disco e' giusto.

Cosa fa. Riscrive ogni .html del sito mettendo la firma del file accanto al
suo indirizzo:

    /assets/styles.css   ->   /assets/styles.css?v=8f2c1a4b

La firma sono le prime otto cifre dello SHA-256 del file. Se il file cambia
cambia la firma, quindi cambia l'indirizzo, quindi il browser lo riscarica.
Se non cambia niente, non cambia niente: lo script si puo' rilanciare quante
volte si vuole.

Si esegue dopo aver toccato un CSS o un JavaScript, e comunque prima di
pubblicare:

    python3 strumenti/versiona.py

E' lo stesso strumento di lucalevi.com: se si corregge uno, si corregge l'altro.
"""
import hashlib
import os
import re
import sys

# La radice servita e' sito/: il repository contiene anche etl/ e i dati grezzi.
RADICE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sito")

# Solo i file nostri: i font non cambiano mai e le fotografie hanno gia' un
# nome diverso per ogni immagine.
SCHEMA = re.compile(r'(?P<attr>href|src)="(?P<url>/assets/[^"?#]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"')


def firma(percorso):
    with open(percorso, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:8]


def html_del_sito():
    for cartella, sottocartelle, file in os.walk(RADICE):
        # niente da fare dentro le cartelle generate o di servizio
        sottocartelle[:] = [d for d in sottocartelle if d not in {"fonts", "dati"}]
        for nome in file:
            if nome.endswith(".html"):
                yield os.path.join(cartella, nome)


def main():
    mancanti = []
    toccati = 0

    for pagina in sorted(html_del_sito()):
        testo = open(pagina, encoding="utf-8").read()

        def sostituisci(m):
            relativo = m.group("url").lstrip("/")
            file = os.path.join(RADICE, relativo)
            if not os.path.exists(file):
                mancanti.append((os.path.relpath(pagina, RADICE), m.group("url")))
                return m.group(0)
            return f'{m.group("attr")}="{m.group("url")}?v={firma(file)}"'

        nuovo = SCHEMA.sub(sostituisci, testo)
        if nuovo != testo:
            open(pagina, "w", encoding="utf-8").write(nuovo)
            toccati += 1
        print(f"  {os.path.relpath(pagina, RADICE)}" + ("  aggiornato" if nuovo != testo else "  gia' a posto"))

    if mancanti:
        print("\nATTENZIONE: indirizzi che non corrispondono a nessun file:", file=sys.stderr)
        for pagina, url in mancanti:
            print(f"  {pagina} -> {url}", file=sys.stderr)
        return 1

    print(f"\n{toccati} pagine aggiornate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
