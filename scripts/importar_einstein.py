#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Importar 12 PDFs Albert Einstein 2024–2027, com SHA-256 do ZIP original.

Os documentos públicos do Curso Objetivo têm nomes idênticos aos originais.
Nenhum PDF é aceito sem a confirmação de bytes, tamanho e páginas. O workflow
baixa e grava somente os PDFs exatos recebidos em EINSTEIN.zip.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from pathlib import Path

import fitz
import requests

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "acervo-dados.js"
BASE_URL = "https://www.curso-objetivo.br/vestibular/resolucao-comentada/alberteinstein"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; BancoDeProvasIEA/1.0)"}
LIMIT = 7_000_000
# (Ano, nome original no site, nome local, tamanho, sha256, páginas).
ROWS = [
    ("2024","alberteinstein2024_gabarito.pdf","einstein-2024-gabarito-prova-i.pdf",279189,"0d08a7bb5685356a398a8355d117e1ad2314ed2ba8adf3cef4a079160affd7e2",1),
    ("2024","alberteinstein2024_prova_I.pdf","einstein-2024-prova-i.pdf",1068433,"5bc64aa3c4ca5f471df5531e15d48c9fa5b7cd18401666732db5895cfba359f6",20),
    ("2024","alberteinstein2024_prova_II.pdf","einstein-2024-prova-ii.pdf",345744,"a2b5d64d509dec710fcfcd7d942efdb5d5a3ac164e381ab7b7556a1a53d021c4",12),
    ("2025","alberteinstein2025_gabarito.pdf","einstein-2025-gabarito-prova-i.pdf",124984,"a93b0395d97d9930a2a40f0d5eed8902e40f5ba8a9bce41b4044834201fadb94",1),
    ("2025","alberteinstein2025_prova_I.pdf","einstein-2025-prova-i.pdf",2010091,"c56e87b5fc91da0b4854877fea9b99d03b31d55b299ea4fba0b729fbefa15427",20),
    ("2025","alberteinstein2025_prova_II.pdf","einstein-2025-prova-ii.pdf",1957511,"fca7c77e38932cc75006319cafc18ec1583c92c35487143367fb50ed621e5686",12),
    ("2026","alberteinstein2026_gabarito.pdf","einstein-2026-gabarito-prova-i.pdf",700375,"f4b3ffb3368f2781041937b067ed7fe262a0ce8468b1f9113995353659654bd6",1),
    ("2026","alberteinstein2026_prova_I.pdf","einstein-2026-prova-i.pdf",1943235,"f17e165f7ca1d22ed71199a2b4535fe1b3b538f6c458ccae22e13457f56f050b",20),
    ("2026","alberteinstein2026_prova_II.pdf","einstein-2026-prova-ii.pdf",2020447,"2e2c424ec59a14cf1b3044c16f92d2454f34dd76e53254fbb39c8ea1456674bd",12),
    ("2027","alberteinstein2027_gabarito.pdf","einstein-2027-gabarito-prova-i.pdf",700316,"8749900ddafffdefc2574d4a4ec4f1ada0ba856885b769848557923b5902eb71",1),
    ("2027","alberteinstein2027_prova_I.pdf","einstein-2027-prova-i.pdf",1154429,"0c5536d7315a5b5f5e559345f9f6d249aad66880e373ed226994811831de3721",20),
    ("2027","alberteinstein2027_prova_II.pdf","einstein-2027-prova-ii.pdf",740983,"1172ae7f18b3275f00862858016dc1451c30c958a8e54efe16585f2756a71448",12),
]


def verify(contents: bytes, size: int, sha: str, pages: int):
    if not contents.startswith(b"%PDF-") or len(contents) != size:
        raise ValueError("Cabeçalho ou tamanho do PDF não corresponde ao ZIP.")
    digest = hashlib.sha256(contents).hexdigest()
    if digest != sha:
        raise ValueError(f"SHA-256 diferente do ZIP; obtido {digest}.")
    with fitz.open(stream=contents, filetype="pdf") as pdf:
        if len(pdf) != pages:
            raise ValueError(f"Número inesperado de páginas: {len(pdf)}.")
    return True


def download(url: str, size: int, sha: str, pages: int) -> bytes:
    error = None
    for attempt in range(1, 4):
        try:
            with requests.get(url, headers=HEADERS, timeout=(20, 65), stream=True) as resp:
                resp.raise_for_status()
                chunks = []
                total = 0
                for block in resp.iter_content(chunk_size=131072):
                    if not block:
                        continue
                    total += len(block)
                    if total > LIMIT:
                        raise ValueError("Download ultrapassou limite seguro por PDF.")
                    chunks.append(block)
                contents = b"".join(chunks)
            verify(contents, size, sha, pages)
            return contents
        except (requests.RequestException, ValueError, RuntimeError) as exc:
            error = exc
            print(f"Não validado ({attempt}/3): {url}: {exc}", flush=True)
            if attempt < 3:
                time.sleep(attempt * 3)
    raise RuntimeError(f"Falha após três tentativas: {error}")


def main() -> int:
    found = set()
    for year, basename, newname, size, sha, pages in ROWS:
        rel = "acervo/einstein/" + year + "/" + newname
        path = ROOT / rel
        try:
            if path.exists():
                verify(path.read_bytes(), size, sha, pages)
                print("Já existente e validado:", rel, flush=True)
            else:
                url = BASE_URL + "/" + year + "/" + basename
                contents = download(url, size, sha, pages)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(contents)
                print("Baixado e conferido:", rel, flush=True)
            found.add(rel)
        except Exception as exc:
            print(f"PENDENTE {rel}: {exc}", flush=True)
    raw = CATALOG.read_text(encoding="utf-8")
    match = re.search(r"window\.EVM_ACERVO\s*=\s*(\{[\s\S]*\})\s*;", raw)
    if not match:
        raise RuntimeError("Catálogo de PDFs não reconhecido.")
    catalog = json.loads(match.group(1))
    inst = next((item for item in catalog["institutions"] if item["id"] == "einstein"), None)
    if inst is None:
        raise RuntimeError("Albert Einstein ainda não está cadastrado.")
    registered = {doc["file"]: doc for docs in inst["years"].values() for doc in docs}
    for file in found:
        if file not in registered:
            raise RuntimeError("Arquivo não cadastrado: " + file)
        registered[file].pop("pending", None)
    CATALOG.write_text(
        "/* Catálogo local do Banco de Provas. */\nwindow.EVM_ACERVO = "
        + json.dumps(catalog, indent=2, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    missing = sorted(set("acervo/einstein/" + y + "/" + n for y, _, n, *_ in ROWS) - found)
    print(f"Albert Einstein: {len(found)}/{len(ROWS)} PDFs originais disponíveis.", flush=True)
    if missing:
        print("Faltantes (sem aceitação de bytes divergentes):", *missing, sep="\n - ", flush=True)
    return 0 if found else 1


if __name__ == "__main__":
    sys.exit(main())
