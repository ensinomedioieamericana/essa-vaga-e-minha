#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baixa o caderno oficial ENEM 2025, 2º dia, caderno 5 (amarelo) do Inep.

O PDF anexado à conversa foi conferido (32 páginas, SHA-256:
0a59697676989b55e6f3e40636fad164c1c26868ddba37d04e4fffc101168298).
O GitHub Actions não tem acesso aos anexos privados da conversa. Por isso
este fluxo baixa a versão oficial equivalente diretamente do Inep e valida
seu conteúdo antes de incluí-la no repositório.
"""
from __future__ import annotations

import hashlib
import sys
import time
from pathlib import Path

import fitz
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "acervo/enem/2025/dia-2/enem-2025-dia-2-prova-caderno-5-amarelo.pdf"
URL = "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_PV_impresso_D2_CD5.pdf"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ArquivoVestibularesIEA/1.0)"}
MAX_BYTES = 12 * 1024 * 1024


def verify(data: bytes) -> None:
    if not data.startswith(b"%PDF-") or len(data) < 100_000:
        raise ValueError("Arquivo recebido não é um PDF de prova.")
    with fitz.open(stream=data, filetype="pdf") as pdf:
        if len(pdf) != 32:
            raise ValueError(f"Número inesperado de páginas: {len(pdf)}.")
        cover = pdf[0].get_text().upper().replace(" ", "")
        if "2ºDIA" not in cover and "2°DIA" not in cover:
            raise ValueError("O PDF recebido não é o 2º dia.")
        if "CADERNO5" not in cover or "AMARELO" not in cover:
            raise ValueError("Caderno ou cor incorretos.")
        text = pdf[0].get_text()
        if "91 a 180" not in text:
            raise ValueError("Numeração das questões não corresponde ao 2º dia.")
        print("Verificação: 32 páginas, 2º dia, Caderno 5 Amarelo, questões 91 a 180.")


def download() -> bytes:
    last = None
    for attempt in range(1, 5):
        try:
            with requests.get(URL, headers=HEADERS, timeout=(20, 90), stream=True) as response:
                response.raise_for_status()
                chunks = []
                total = 0
                for chunk in response.iter_content(65536):
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > MAX_BYTES:
                        raise ValueError("Download do PDF ultrapassou o limite.")
                    chunks.append(chunk)
                data = b"".join(chunks)
            verify(data)
            return data
        except (requests.RequestException, ValueError, RuntimeError) as exc:
            last = exc
            print(f"Falha de download/validação ({attempt}/4): {exc}", flush=True)
            if attempt < 4:
                time.sleep(4 * attempt)
    raise RuntimeError(f"Não foi possível validar o PDF oficial: {last}")


def main() -> int:
    if DEST.is_file():
        existing = DEST.read_bytes()
        verify(existing)
        print(f"PDF já disponível: {DEST.relative_to(ROOT)}")
        return 0

    data = download()
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    print(f"Publicado {DEST.relative_to(ROOT)} ({len(data)} bytes; sha256 {digest})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
