# Insurek

**Which Swiss health insurance costs you least?**
Give it a postcode and a year of birth, say whether you rarely see a doctor,
see one regularly, or are in ongoing treatment — and Insurek compares every
insurer, every model and every deductible available where you live, using the
official premium data of the Swiss Federal Office of Public Health.

→ **[insurek.lucalevi.com](https://insurek.lucalevi.com)** · Italian, German,
French, English

Insurek sells nothing, refers no one and stores nothing. It is not advice: it
is arithmetic on public numbers, and the numbers and the formula are both in
this repository.

## Why it exists

Under Swiss compulsory health insurance (KVG/LAMal) an adult pays three
things: the premium, twelve times a year; their own costs up to the deductible
they chose; and above that 10% of what follows, capped at 700 francs a year.
The benefits are fixed by law and identical at every insurer. So the whole
question of what a year costs is one line of arithmetic:

```
cost(spending) = premium × 12
               + min(spending, deductible)
               + min(10% × (spending − deductible), 700)
```

Run that over real premiums and two things fall out. First, of the six adult
deductibles only **300 and 2500** ever win — across every offer in a region
and every level of spending, the four in the middle never come out cheapest.
Second, and larger: for benefits the law makes identical, the gap between the
cheapest and the dearest insurer in the same region can exceed a thousand
francs a year.

Insurek answers both at once.

## How it works

There is no application server, no database and no third-party request while
anyone uses the site. A Python script runs **once a year** on the maintainer's
machine, turns the federal data files into static JSON, and that is the whole
backend. The browser downloads the index, the postcode table and **one**
premium file — the one for the area the visitor lives in — under 250 KB in
total, and does the arithmetic itself.

```
etl/scarica.py        downloads the federal source files
etl/costruisci.py     turns them into the site's JSON
etl/verifica.py       checks the JSON against the federal CSV, row by row
sito/                 the site — plain HTML, CSS and JavaScript, no build
sito/dati/            generated; do not edit by hand
```

Run it locally:

```bash
cd sito && python3 -m http.server 8000     # then http://localhost:8000
```

A real server, not a double-click: the paths are absolute and `fetch` does not
work from `file://`.

## Where the data comes from

The Federal Office of Public Health (FOPH/BAG) publishes every approved
premium of every insurer — by canton, premium region, age class, model,
accident cover and deductible — in the **[Krankenversicherungsprämien
dataset](https://opendata.swiss/en/dataset/health-insurance-premiums)** on
opendata.swiss, under an open-use licence. Two more federal files turn a
postcode into a canton and a premium region, and an insurer number into a
name.

This is the same source the federal premium calculator at
[priminfo.admin.ch](https://www.priminfo.admin.ch/) is built on — which is why
Insurek does **not** scrape it. Scraping would mean parsing fragile HTML for
numbers that are already published as CSV, carrying every redesign of a
government site and putting load on a public service, to arrive at identical
figures. (Priminfo also has no JSON API for premiums: it is a server-rendered
form.)

The data is refreshed once a year, in late September, when the FOPH approves
the following year's premiums. A GitHub Action does the download, the rebuild
and the verification, and opens a pull request when anything changed.

## Scope

**Covered**: adults (26+) and young adults (19–25), every canton and premium
region, every insurer and model, with and without accident cover, all six
deductibles — including the roughly 1 000 combinations out of 20 000 where an
insurer does not offer one of them.

**Not covered**, deliberately: minors (deductibles from 0 to 600, co-insurance
capped at 350, family discounts — different rules, and handling them badly
would be worse than not handling them), premiums for people insured in the
EU/EFTA, and cantonal premium reductions.

## History

Insurek began as a Flask app that asked you to copy six premiums by hand out
of Priminfo and told you which deductible was cheapest. The arithmetic was
right; the work was on you. This version keeps the arithmetic, does the
copying itself, and widens the question from one insurer's deductibles to
every insurer in your area. The Python survived — it just moved from serving
requests to preparing data once a year.

## Licence

Code: GNU GPL-2.0, see [`LICENSE`](LICENSE).
Data: Federal Office of Public Health, open use with attribution.

Maintainer's notes, in Italian: [`LEGGIMI.md`](LEGGIMI.md).
