#!/usr/bin/env python3
"""Il server per guardare il sito in locale.

`python3 -m http.server` non manda nessuna intestazione di cache. Il browser
allora si arrangia: siccome il file risulta modificato giorni fa, decide da
solo di tenerlo buono per ore e non chiede piu' niente al server. Cosi' si
finisce a guardare il CSS di ieri convinti di guardare quello di adesso.

Questo server e' identico a quello, con una riga in piu': dice al browser di
non conservare niente. Quello che si vede e' sempre quello che c'e' sul disco.

    python3 strumenti/servi.py          # poi http://localhost:8000
    python3 strumenti/servi.py 8080     # su un'altra porta

Vale solo per lo sviluppo. Online conviene il contrario — cache lunga sui file
firmati da strumenti/versiona.py — ma quello lo decide l'hosting.
"""
import functools
import http.server
import os
import socketserver
import sys

RADICE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sito")


class SenzaCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # Il browser puo' comunque chiedere "e' cambiato?" con
        # If-Modified-Since: qui la risposta e' sempre si', altrimenti si
        # tornerebbe al punto di partenza con un 304.
        self.headers.replace_header("If-Modified-Since", "Thu, 01 Jan 1970 00:00:00 GMT") \
            if "If-Modified-Since" in self.headers else None
        if "If-None-Match" in self.headers:
            del self.headers["If-None-Match"]
        return super().send_head()


def main():
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    socketserver.TCPServer.allow_reuse_address = True
    gestore = functools.partial(SenzaCache, directory=RADICE)
    with socketserver.TCPServer(("127.0.0.1", porta), gestore) as srv:
        print(f"Insurek su http://localhost:{porta}  (niente cache — Ctrl+C per fermare)")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nfermato.")


if __name__ == "__main__":
    main()
