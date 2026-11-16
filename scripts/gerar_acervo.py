#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera acervo-dados.js a partir dos PDFs na pasta acervo/.
Uso: python scripts/gerar_acervo.py
Estrutura: acervo/<vestibular>/<ano>/[subpasta/]arquivo.pdf
Nenhum PDF é copiado/modificado, apenas listado.
"""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
CATALOG = BASE / "acervo-catalogo.json"
OUTPUT = BASE / "acervo-dados.js"
ACERVO = BASE / "acervo"
YEAR = re.compile(r"(19|20)\d{2}")


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    return "".join(char for char in text if not unicodedata.combining(char)).lower()


def classify(filename: str) -> str:
    name = normalize(filename)
    if "gabarito" in name or "respostas" in name:
        return "gabarito"
    if "resolu" in name or "comentad" in name or "correcao" in name:
        return "resolucao"
    if "prova" in name or "quest" in name or "caderno" in name:
        return "prova"
    return "outro"


def display_name(path: Path, year_dir: Path) -> str:
    rel = path.relative_to(year_dir)
    name = rel.stem.replace("_", " ").replace("-", " ")
    parents = [part.replace("_", " ").replace("-", " ") for part in rel.parts[:-1]]
    title = " · ".join([*parents, name])
    return re.sub(r"\s+", " ", title).strip()


def main() -> int:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    if catalog.get("version") != 1:
        raise SystemExit("Versão incompatível de acervo-catalogo.json")
    records = []
    total_files = 0
    for inst in catalog["institutions"]:
        slug = inst["id"]
        if not re.fullmatch(r"[a-z0-9-]+", slug):
            raise SystemExit(f"Identificador inválido: {slug!r}")
        folder = ACERVO / slug
        years = {}
        if folder.exists():
            for year_dir in sorted(folder.iterdir(), reverse=True):
                if not year_dir.is_dir() or year_dir.is_symlink() or not YEAR.fullmatch(year_dir.name):
                    continue
                files = []
                for pdf in sorted(year_dir.rglob("*"), key=lambda f: f.name.casefold()):
                    if not pdf.is_file() or pdf.is_symlink() or pdf.suffix.lower() != ".pdf":
                        continue
                    if not pdf.resolve().is_relative_to(ACERVO.resolve()):
                        print(f"Ignorando arquivo fora do acervo: {pdf}", file=sys.stderr)
                        continue
                    if pdf.open("rb").read(5) != b"%PDF-":
                        print(f"Aviso: arquivo não parece ser PDF válido: {pdf.relative_to(BASE)}", file=sys.stderr)
                        continue
                    rel = pdf.relative_to(BASE)
                    files.append({
                        "title": display_name(pdf, year_dir),
                        "type": classify(pdf.stem),
                        "file": rel.as_posix(),
                        "size": pdf.stat().st_size,
                    })
                files.sort(key=lambda x: (
                    {"prova": 0, "gabarito": 1, "resolucao": 2, "outro": 3}[x["type"]],
                    x["title"].casefold(),
                ))
                if files:
                    years[year_dir.name] = files
                    total_files += len(files)
        records.append({**inst, "years": years})
        print(f"{inst['name']:<16} {sum(map(len, years.values())):>4} PDF(s)  |  {len(years)} ano(s)")
    output = {
        "version": 1,
        "institutions": records,
    }
    OUTPUT.write_text(
        "/* Catálogo local do Banco de Provas. Gerado por scripts/gerar_acervo.py. */\n"
        "window.EVM_ACERVO = "
        + json.dumps(output, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"\nTotal: {total_files} PDF(s). Catálogo gerado em: {OUTPUT.relative_to(BASE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
