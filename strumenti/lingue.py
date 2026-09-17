#!/usr/bin/env python3
"""Genera le pagine tedesche, francesi e inglesi di Insurek dall'italiano.

Perche' esiste. Insurek parla quattro lingue — sono le lingue in cui si
vive in Svizzera, ed e' meta' del senso del sito — ma fino al 14 settembre
2026 le parlava tutte allo stesso indirizzo: il tedesco e il francese stavano
dentro gli attributi `data-de` e `data-fr` e comparivano premendo un bottone.
Per chi legge funzionava. Per un motore di ricerca no: Google indicizza
indirizzi, non attributi, e 463 parole di tedesco dentro una pagina italiana
non sono una pagina tedesca. Chi in Svizzera cerca «Krankenkasse vergleichen»
non poteva trovare Insurek, ed e' il pubblico piu' grosso dei quattro.

Cosa fa. Da ogni pagina italiana scrive le tre gemelle:

    index.html         ->  de/index.html     fr/index.html     en/index.html
    metodo/index.html  ->  de/methode/       fr/methode/       en/method/

Nella pagina generata il testo della lingua prende il posto dell'italiano, gli
attributi di traduzione spariscono, `<html lang>` diventa quello giusto, e i
collegamenti interni restano dentro la lingua. Ogni pagina dichiara con
`hreflang` le altre tre, piu' `x-default` sull'italiano.

    python3 strumenti/lingue.py

Da rilanciare dopo ogni modifica alle pagine italiane, e comunque prima di
`versiona.py`, che firma anche le pagine generate.
"""
import os
import re
import sys
from html.parser import HTMLParser

RADICE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sito")

# Unica riga da cambiare se cambia il dominio.
SITO = "https://insurek.lucalevi.com"

# L'italiano e' la lingua scritta a mano nell'HTML; le altre tre si generano.
# `lang` e' quello che finisce in <html lang>: de-CH e fr-CH e non de e fr,
# perche' qui si parla a chi vive in Svizzera, e i premi sono quelli svizzeri.
LINGUE = {
    "it": {"lang": "it-CH", "og": "it_CH", "radice": "/"},
    "de": {"lang": "de-CH", "og": "de_CH", "radice": "/de/"},
    "fr": {"lang": "fr-CH", "og": "fr_CH", "radice": "/fr/"},
    "en": {"lang": "en-GB", "og": "en_GB", "radice": "/en/"},
}
SORGENTE = "it"

# Le due pagine, con il nome che la cartella prende in ogni lingua. Il nome
# tradotto non e' vezzo: un indirizzo si legge, e /de/metodo/ in una pagina
# tedesca stona quanto un titolo in italiano.
PAGINE = [
    {"sorgente": "index.html", "cartelle": {"it": "", "de": "", "fr": "", "en": ""}},
    {
        "sorgente": "metodo/index.html",
        "cartelle": {"it": "metodo/", "de": "methode/", "fr": "methode/", "en": "method/"},
    },
    # La 404 non va in sitemap e non ha indirizzo canonico, ma una copia per
    # lingua serve lo stesso: Cloudflare Pages serve la 404 piu' vicina, quindi
    # chi sbaglia indirizzo dentro /de/ trova una pagina in tedesco.
    {
        "sorgente": "404.html",
        "file": "404.html",
        "cartelle": {"it": "", "de": "", "fr": "", "en": ""},
        "fuori_sitemap": True,
    },
]

VUOTI = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

# Gli attributi con cui il sito porta le traduzioni accanto all'originale.
# La chiave e' il suffisso, il valore l'attributo che la traduzione sostituisce
# (None = il contenuto dell'elemento).
BERSAGLI = {"data-": None, "data-aria-": "aria-label", "data-ph-": "placeholder", "data-alt-": "alt"}


def indirizzo(pagina, codice):
    return LINGUE[codice]["radice"] + pagina["cartelle"][codice]


class Traduttore(HTMLParser):
    """Riscrive la pagina in una lingua, un pezzo alla volta.

    Quando incontra un elemento che porta la traduzione, ne emette il tag di
    apertura ripulito, poi il testo tradotto al posto dell'originale, e salta
    fino al tag di chiusura. Nessun elemento tradotto ne contiene un altro
    (verificato sulle pagine vere), quindi per ritrovare la chiusura basta
    contare le aperture dello stesso tag.
    """

    def __init__(self, codice):
        # convert_charrefs=False: &rsquo; e &middot; restano come sono scritti.
        super().__init__(convert_charrefs=False)
        self.codice = codice
        self.fuori = []
        self.salta = None

    def emetti(self, pezzo):
        if self.salta is None:
            self.fuori.append(pezzo)

    def ripulisci(self, tag, attributi):
        tenuti, tradotti = [], {}
        for nome, valore in attributi:
            suffisso = None
            for prefisso, bersaglio in BERSAGLI.items():
                if nome.startswith(prefisso) and len(nome) == len(prefisso) + 2:
                    suffisso = (prefisso, bersaglio, nome[-2:])
                    break
            if suffisso is None:
                tenuti.append((nome, valore))
                continue
            prefisso, bersaglio, lingua = suffisso
            if lingua != self.codice:
                continue                      # la traduzione di un'altra lingua
            if bersaglio is None and tag == "meta":
                bersaglio = "content"         # su <meta> non c'e' contenuto
            if bersaglio:
                tradotti[bersaglio] = valore
        pezzi = []
        for nome, valore in tenuti:
            if nome in tradotti:
                valore = tradotti.pop(nome)
            pezzi.append(nome if valore is None else f'{nome}="{valore}"')
        for nome, valore in tradotti.items():
            pezzi.append(f'{nome}="{valore}"')
        dentro = (" " + " ".join(pezzi)) if pezzi else ""
        return f"<{tag}{dentro}{' /' if tag in VUOTI else ''}>"

    def contenuto(self, attributi):
        """Il testo che sostituisce quello dell'elemento, se c'e'."""
        for nome, valore in attributi:
            if nome == "data-" + self.codice:
                return valore
        return None

    def handle_starttag(self, tag, attributi):
        if self.salta is not None:
            if tag == self.salta[0] and tag not in VUOTI:
                self.salta = (self.salta[0], self.salta[1] + 1)
            return
        self.fuori.append(self.ripulisci(tag, attributi))
        testo = self.contenuto(attributi)
        if testo is not None and tag not in VUOTI:
            self.fuori.append(testo)
            self.salta = (tag, 1)

    def handle_startendtag(self, tag, attributi):
        if self.salta is not None:
            return
        pezzo = self.ripulisci(tag, attributi)
        if tag not in VUOTI:
            pezzo = pezzo[:-1] + " />"
        self.fuori.append(pezzo)

    def handle_endtag(self, tag):
        if self.salta is not None:
            if tag == self.salta[0]:
                rimaste = self.salta[1] - 1
                self.salta = None if rimaste == 0 else (tag, rimaste)
                if self.salta is None:
                    self.fuori.append(f"</{tag}>")
            return
        self.fuori.append(f"</{tag}>")

    def handle_data(self, d): self.emetti(d)
    def handle_entityref(self, n): self.emetti(f"&{n};")
    def handle_charref(self, n): self.emetti(f"&#{n};")
    def handle_comment(self, d): self.emetti(f"<!--{d}-->")
    def handle_decl(self, d): self.emetti(f"<!{d}>")
    def unknown_decl(self, d): self.emetti(f"<![{d}]>")
    def handle_pi(self, d): self.emetti(f"<?{d}>")


def traduci(html, codice):
    t = Traduttore(codice)
    t.feed(html)
    t.close()
    if t.salta is not None:
        raise SystemExit(f"[lingue] tag non chiuso: {t.salta[0]}")
    return "".join(t.fuori)


# ------------------------------------------------------------------- testa

def testa(html, pagina, codice):
    """Lingua, indirizzo canonico, hreflang e og:* della pagina."""
    html = html.replace(
        f'<html lang="{LINGUE[SORGENTE]["lang"]}">', f'<html lang="{LINGUE[codice]["lang"]}">', 1
    )

    titolo = re.search(r"<title[^>]*>(.*?)</title>", html, re.S)
    titolo = titolo.group(1).strip() if titolo else ""
    descrizione = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html, re.S)
    descrizione = descrizione.group(1).strip() if descrizione else ""

    def meta(chiave, valore, attributo="property"):
        nonlocal html
        html = re.sub(
            rf'(<meta\s+{attributo}="{re.escape(chiave)}"\s+content=")[^"]*(")',
            lambda m: m.group(1) + valore + m.group(2), html,
        )

    qui = SITO + indirizzo(pagina, codice)
    meta("og:title", titolo)
    meta("og:description", descrizione)
    meta("og:url", qui)
    meta("og:locale", LINGUE[codice]["og"])
    meta("twitter:title", titolo, attributo="name")

    # L'anteprima social, una per lingua: e' l'unica cosa che si vede quando
    # l'indirizzo viene incollato in una chat. Si rigenerano con
    # `python3 materiali/og/genera.py`.
    html = html.replace(f"/assets/og-insurek-{SORGENTE}.png", f"/assets/og-insurek-{codice}.png")

    # og:locale:alternate: una riga per ciascuna delle altre tre lingue
    html = re.sub(r'^[ \t]*<meta property="og:locale:alternate"[^>]*>\n?', "", html, flags=re.M)
    altre = "".join(
        f'    <meta property="og:locale:alternate" content="{LINGUE[c]["og"]}" />\n'
        for c in LINGUE if c != codice
    )
    html = html.replace(
        f'    <meta property="og:locale" content="{LINGUE[codice]["og"]}" />\n',
        f'    <meta property="og:locale" content="{LINGUE[codice]["og"]}" />\n' + altre,
        1,
    )

    # canonical e hreflang: si rifanno da zero, cosi' non si accumulano
    html = re.sub(r'^[ \t]*<link rel="(?:canonical|alternate)"[^>]*>\n?', "", html, flags=re.M)
    # Una 404 non e' una pagina: non ha un indirizzo canonico (l'indirizzo che
    # l'ha prodotta e' sbagliato per definizione) e non va dichiarata a nessuno.
    if pagina.get("fuori_sitemap"):
        return html
    righe = f'    <link rel="canonical" href="{qui}" />\n'
    for c in LINGUE:
        righe += f'    <link rel="alternate" hreflang="{LINGUE[c]["lang"]}" href="{SITO}{indirizzo(pagina, c)}" />\n'
    righe += f'    <link rel="alternate" hreflang="x-default" href="{SITO}{indirizzo(pagina, SORGENTE)}" />\n'
    return html.replace("  </head>", righe + "  </head>", 1)


def sposta_collegamenti(html, codice):
    """Gli indirizzi interni restano dentro la lingua della pagina.

    Fuori restano gli assets, i font, gli indirizzi assoluti, le ancore, e i
    quattro collegamenti dell'interruttore, marcati con `data-lingua`: quelli
    devono puntare ognuno alla lingua sua.
    """
    mappa = {}
    for pagina in PAGINE:
        mappa[indirizzo(pagina, SORGENTE)] = indirizzo(pagina, codice)
    # prima i piu' lunghi: "/" non deve mangiare "/metodo/"
    ordine = sorted(mappa.items(), key=lambda kv: -len(kv[0]))

    def riscrivi(m):
        prima, url, dopo = m.group(1), m.group(2), m.group(3)
        if url.startswith(("/assets/", "/fonts/", "/dati/")):
            return m.group(0)
        for da, a in ordine:
            if url == da:
                return prima + a + dopo
            if url.startswith(da + "#"):
                return prima + a + url[len(da):] + dopo
        return m.group(0)

    pezzi = re.split(r'(<a[^>]*\bdata-lingua="[^"]*"[^>]*>)', html)
    for i, pezzo in enumerate(pezzi):
        if pezzo.startswith("<a") and "data-lingua=" in pezzo:
            continue
        pezzi[i] = re.sub(r'(href=")(/[^"#]*(?:#[^"]*)?)(")', riscrivi, pezzo)
    html = "".join(pezzi)
    # Informativa e dichiarazione di accessibilita' stanno su www.lucalevi.com,
    # una pagina a quattro lingue ciascuna: si apre nella lingua di chi legge.
    for pagina in ("privacy", "accessibilita"):
        html = html.replace(
            f'href="https://www.lucalevi.com/{pagina}/"',
            f'href="https://www.lucalevi.com/{pagina}/?lang={codice}"',
        )
    return html


def interruttore(html, pagina, codice):
    """I quattro collegamenti: ognuno alla stessa pagina, nella sua lingua.
    Quello in cui sei si marca con aria-current, non e' un collegamento a se'."""
    def sistema(m):
        tag = m.group(0)
        quale = re.search(r'data-lingua="([^"]*)"', tag).group(1)
        tag = re.sub(r'\s*aria-current="[^"]*"', "", tag)
        tag = re.sub(r'href="[^"]*"', f'href="{indirizzo(pagina, quale)}"', tag)
        if quale == codice:
            tag = tag[:-1] + ' aria-current="true">'
        return tag

    return re.sub(r'<a[^>]*\bdata-lingua="[^"]*"[^>]*>', sistema, html)


# ------------------------------------------------------------------ sitemap

def scrivi_sitemap():
    voci = []
    for pagina in PAGINE:
        if pagina.get("fuori_sitemap"):
            continue
        alternative = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{LINGUE[c]["lang"]}" href="{SITO}{indirizzo(pagina, c)}" />'
            for c in LINGUE
        ) + f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{SITO}{indirizzo(pagina, SORGENTE)}" />'
        for c in LINGUE:
            priorita = "1.0" if pagina["sorgente"] == "index.html" else "0.6"
            if c != SORGENTE:
                priorita = str(round(float(priorita) - 0.1, 1))
            voci.append(
                f'  <url>\n    <loc>{SITO}{indirizzo(pagina, c)}</loc>{alternative}\n'
                f'    <changefreq>yearly</changefreq>\n    <priority>{priorita}</priority>\n  </url>'
            )
    testo = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(voci) + "\n</urlset>\n"
    )
    open(os.path.join(RADICE, "sitemap.xml"), "w", encoding="utf-8").write(testo)
    print(f"  sitemap.xml  ({len(voci)} indirizzi)")


# ---------------------------------------------------------------- esecuzione

def main():
    scritte = 0
    for pagina in PAGINE:
        percorso = os.path.join(RADICE, pagina["sorgente"])
        if not os.path.exists(percorso):
            print(f"[lingue] manca {pagina['sorgente']}: saltata.", file=sys.stderr)
            continue
        originale = open(percorso, encoding="utf-8").read()

        # l'italiano riceve canonical, hreflang e l'interruttore aggiornato
        italiano = interruttore(testa(originale, pagina, SORGENTE), pagina, SORGENTE)
        if italiano != originale:
            open(percorso, "w", encoding="utf-8").write(italiano)
            print(f"  {pagina['sorgente']}  canonical + hreflang")

        for codice in LINGUE:
            if codice == SORGENTE:
                continue
            fuori = traduci(italiano, codice)
            fuori = testa(fuori, pagina, codice)
            fuori = sposta_collegamenti(fuori, codice)
            fuori = interruttore(fuori, pagina, codice)
            destinazione = os.path.join(
                RADICE,
                LINGUE[codice]["radice"].strip("/"),
                pagina["cartelle"][codice],
                pagina.get("file", "index.html"),
            )
            os.makedirs(os.path.dirname(destinazione), exist_ok=True)
            open(destinazione, "w", encoding="utf-8").write(fuori)
            parole = len(re.sub(r"<[^>]+>", " ", fuori).split())
            print(f"  {os.path.relpath(destinazione, RADICE)}  ({parole} parole)")
            scritte += 1

    scrivi_sitemap()
    print(f"\n{scritte} pagine generate. Ora: python3 strumenti/versiona.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
