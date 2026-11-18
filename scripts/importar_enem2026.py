#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Importação verificável ENEM 2026 do Inep (1º dia azul, 2º dia amarelo).

Os quatro PDFs fornecidos no ZIP ENEM 2026.zip foram examinados localmente.
A publicação por GitHub Actions baixa os PDFs diretamente da origem oficial,
aceitando SOMENTE bytes cujo SHA-256 seja idêntico ao anexo original.
A origem do INEP tem certificado TLS incompleto em alguns runners;
em fallback, verify=False é usado exclusivamente com hash SHA-256 fixado.
"""
from __future__ import annotations

import hashlib
import sys
import time
from pathlib import Path

import fitz
import requests

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://download.inep.gov.br/enem/provas_e_gabaritos/"
MAX_BYTES = 9_000_000
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; BancoDeProvasIEA/1.0)"}

# Arquivo oficial, destino no repositório, bytes, SHA-256 do ZIP, páginas,
# dia, caderno e cor.
DOCUMENTS = [
    ("2026_PV_impresso_D1_CD1.pdf",
     "acervo/enem/2026/dia-1/enem-2026-dia-1-prova-caderno-1-azul.pdf",
     3400792, "a3619d4d70cf62e47c07a5b53d3319de8b34d5766a90e0e690db5a2c2647d9ea",
     32, 1, 1, "AZUL"),
    ("2026_GB_impresso_D1_CD1.pdf",
     "acervo/enem/2026/dia-1/enem-2026-dia-1-gabarito-caderno-1-azul.pdf",
     169274, "fa646f7a4ba5a43e1202f720572092b70d225eca420bed891153e93c3f6c887e",
     1, 1, 1, "AZUL"),
    ("2026_PV_impresso_D2_CD5.pdf",
     "acervo/enem/2026/dia-2/enem-2026-dia-2-prova-caderno-5-amarelo.pdf",
     2803997, "5bbe113129239f10ab4c1533a73826067855b25e02fddad2096c4de82d1b640c",
     32, 2, 5, "AMARELO"),
    ("2026_GB_impresso_D2_CD5.pdf",
     "acervo/enem/2026/dia-2/enem-2026-dia-2-gabarito-caderno-5-amarelo.pdf",
     173656, "ea01fef4a83b0a76b5d90536a912f82e79f5b0f0c80115ad4f1269c6a7bf85f5",
     1, 2, 5, "AMARELO"),
]


def verify(data: bytes, name: str, size: int, sha: str, pages: int,
           day: int, book: int, color: str) -> None:
    if not data.startswith(b"%PDF-") or len(data) != size:
        raise ValueError("PDF ou número de bytes diferente do arquivo original")
    if hashlib.sha256(data).hexdigest() != sha:
        raise ValueError("SHA-256 não corresponde aos bytes do ZIP enviado")
    with fitz.open(stream=data, filetype="pdf") as pdf:
        if pdf.page_count != pages:
            raise ValueError("Contagem de páginas incompatível")
        cover = pdf[0].get_text().upper().replace(" ", "").replace("\n", "")
        if color not in cover or "CADERNO" + str(book) not in cover:
            raise ValueError("Caderno ou cor incompatível")
        if name.startswith("2026_GB"):
            if "GABARITO2026" not in cover or "DIA" not in cover:
                raise ValueError("Gabarito ou ano não identificado")
        else:
            if day == 1 and ("01A90" not in cover and "01A45" not in cover):
                raise ValueError("Caderno 1 não contém questões 01–90")
            if day == 2 and "91A180" not in cover:
                raise ValueError("Caderno 5 não contém questões 91–180")


def get_exact(filename: str, size: int, sha: str, pages: int,
              day: int, book: int, color: str) -> bytes:
    source = BASE + filename
    last = None
    for verify_tls in (True, False):
        for attempt in range(1, 3):
            try:
                if not verify_tls:
                    import urllib3
                    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                print(f"Origem oficial: {source}; TLS={verify_tls}; tentativa={attempt}", flush=True)
                with requests.get(source, headers=HEADERS, verify=verify_tls,
                                  timeout=(15, 50), stream=True) as resp:
                    resp.raise_for_status()
                    parts = []
                    count = 0
                    for block in resp.iter_content(131072):
                        if not block:
                            continue
                        count += len(block)
                        if count > MAX_BYTES:
                            raise ValueError("Arquivo ultrapassou limite de 9 MB")
                        parts.append(block)
                contents = b"".join(parts)
                # Fornece integridade criptográfica mesmo sem cadeia TLS válida.
                verify(contents, filename, size, sha, pages, day, book, color)
                return contents
            except (requests.RequestException, ValueError, RuntimeError) as exc:
                last = exc
                print(f"Falha ao baixar/conferir: {type(exc).__name__}: {exc}", flush=True)
                if attempt < 2:
                    time.sleep(2)
    raise RuntimeError(f"Não foi possível validar {filename}: {last}")


def main():
    for filename, rel, size, sha, pages, day, book, color in DOCUMENTS:
        destination = ROOT / rel
        if destination.is_file():
            verify(destination.read_bytes(), filename, size, sha, pages, day, book, color)
            print(f"Já disponível e idêntico ao ZIP: {rel}", flush=True)
            continue
        data = get_exact(filename, size, sha, pages, day, book, color)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        print(f"PUBLICADO {rel}: {len(data)} bytes (SHA-256 {sha})", flush=True)
    print("ENEM 2026: os quatro PDFs originais foram verificados", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
