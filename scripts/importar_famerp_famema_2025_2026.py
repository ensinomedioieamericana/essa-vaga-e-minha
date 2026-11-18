#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Importa provas publicadas pela banca Vunesp, disponíveis em páginas Etapa Resolve.

Vestibular FAMERP: prova 1º dia, gabarito 1º dia e prova 2º dia.
Vestibular FAMEMA: prova I, prova II e gabarito da prova II.
Somente PDFs validados por ano, nome da instituição e tipo são publicados.
O catálogo retém pending para PDFs que não foram encontrados/validados.
"""
from __future__ import annotations

import hashlib
import re
import time
import unicodedata
from pathlib import Path

import fitz
import requests

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 14 * 1024 * 1024
HOST = "https://filescol.grupoetapa.com.br/etaparesolve/etaparesolve/etaparesolve"
OBJETIVO = "https://www.curso-objetivo.br/vestibular/resolucao-comentada"

# file, origem (URLs verificadas em páginas públicas de provas), ano, instituição,
# texto característico da capa, intervalo de páginas seguro.
DOCS = [
 ("acervo/famerp/2025/dia-1/famerp-2025-dia-1-prova-conhecimentos-gerais.pdf",
  [f"{HOST}/2025/FAMERP/FaseUnica_674/prova/prova.pdf",
   f"{OBJETIVO}/famerp/2025/1dia/famerp2025_1dia_prova.pdf"],
  "2025","FAMERP","CONHECIMENTOS GERAIS",(10,60)),
 ("acervo/famerp/2025/dia-1/famerp-2025-dia-1-gabarito.pdf",
  [f"{HOST}/2025/FAMERP/FaseUnica_674/gabarito/gabarito.pdf",
   f"{OBJETIVO}/famerp/2025/1dia/famerp2025_1dia_gabarito.pdf"],
  "2025","FAMERP","GABARITO",(1,5)),
 ("acervo/famerp/2025/dia-2/famerp-2025-dia-2-prova-especificos-redacao.pdf",
  [f"{HOST}/2025/FAMERP/FaseUnica_675/prova/prova.pdf",
   f"{OBJETIVO}/famerp/2025/2dia/famerp2025_2dia_prova.pdf"],
  "2025","FAMERP","CONHECIMENTOS ESPECIFICOS",(10,65)),
 ("acervo/famerp/2026/dia-1/famerp-2026-dia-1-prova-conhecimentos-gerais.pdf",
  [f"{HOST}/2026/FAMERP/FaseUnica_740/prova/prova.pdf",
   f"{OBJETIVO}/famerp/2026/1dia/famerp2026_1dia_prova.pdf"],
  "2026","FAMERP","CONHECIMENTOS GERAIS",(10,60)),
 ("acervo/famerp/2026/dia-1/famerp-2026-dia-1-gabarito.pdf",
  [f"{HOST}/2026/FAMERP/FaseUnica_740/gabarito/FMRP2026_gabarito.pdf",
   f"{OBJETIVO}/famerp/2026/1dia/famerp2026_1dia_gabarito.pdf"],
  "2026","FAMERP","GABARITO",(1,5)),
 ("acervo/famerp/2026/dia-2/famerp-2026-dia-2-prova-especificos-redacao.pdf",
  [f"{HOST}/2026/FAMERP/FaseUnica_741/prova/Prova.pdf",
   f"{OBJETIVO}/famerp/2026/2dia/famerp2026_2dia_prova.pdf"],
  "2026","FAMERP","CONHECIMENTOS ESPECIFICOS",(10,65)),
 ("acervo/famema/2025/famema-2025-prova-i-discursiva.pdf",
  [f"{HOST}/2025/FAMEMA/FaseUnica_666/prova/provaI.pdf"],
  "2025","FAMEMA","PROVA I",(5,40)),
 ("acervo/famema/2025/famema-2025-prova-ii-objetiva-redacao.pdf",
  [f"{HOST}/2025/FAMEMA/FaseUnica_667/prova/provaII.pdf"],
  "2025","FAMEMA","PROVA II",(5,40)),
 ("acervo/famema/2025/famema-2025-gabarito-prova-ii-versao-1.pdf",
  [f"{HOST}/2025/FAMEMA/FaseUnica_667/gabarito/gabarito.pdf",
   f"{OBJETIVO}/famema/2025/famema2025_gabarito.pdf"],
  "2025","FAMEMA","PROVA II",(1,5)),
 ("acervo/famema/2026/famema-2026-prova-i-discursiva.pdf",
  [f"{HOST}/2026/FAMEMA/FaseUnica_728/prova/FAMEMA%20P1%2026.pdf.pdf"],
  "2026","FAMEMA","PROVA I",(5,40)),
 ("acervo/famema/2026/famema-2026-prova-ii-objetiva-redacao.pdf",
  [f"{HOST}/2026/FAMEMA/FaseUnica_729/prova/FAMEMA%20P2%2026.pdf%20%281%29.pdf"],
  "2026","FAMEMA","PROVA II",(5,40)),
 ("acervo/famema/2026/famema-2026-gabarito-prova-ii-versao-1.pdf",
  [f"{HOST}/2026/FAMEMA/FaseUnica_729/gabarito/FAMEMA%20gab.pdf",
   f"{OBJETIVO}/famema/2026/famema2026_gabarito.pdf"],
  "2026","FAMEMA","PROVA II",(1,5)),
]

def plain(txt: str) -> str:
    return "".join(x for x in unicodedata.normalize("NFKD", txt.upper()) if not unicodedata.combining(x))

def validate(raw: bytes, year: str, school: str, marker: str, pages: tuple[int, int], file: str):
    if not raw.startswith(b"%PDF-") or len(raw) < 4000:
        raise ValueError("Resposta não parece PDF")
    with fitz.open(stream=raw, filetype="pdf") as pdf:
        if not pages[0] <= pdf.page_count <= pages[1]:
            raise ValueError(f"Contagem de páginas inesperada: {pdf.page_count}")
        # Os brasões são imagens; o código da banca aparece com frequência
        # SOMENTE no rodapé da 2ª/3ª página, não na capa.
        text = plain(" ".join(pdf[n].get_text() for n in range(min(5, pdf.page_count))))
        compact = " ".join(text.split())
        if year not in compact:
            raise ValueError(f"Vestibular {year} não encontrado no caderno: {file}")
        if school == "FAMERP":
            brand = any(x in compact for x in ("FMRP", "FAMERP", "FACULDADE DE MEDICINA", "SAO JOSE DO RIO PRETO"))
        else:
            brand = any(x in compact for x in ("FMMA", "FAMEMA", "FACULDADE DE MEDICINA DE MARILIA"))
        # Quando logotipo e códigos são convertidos em vetores não extraíveis,
        # exigimos sinais de caderno da banca + URL específica já aprovada.
        if not brand and "VUNESP" not in compact:
            raise ValueError("Identificação institucional não encontrada nas cinco páginas iniciais")
        if marker == "GABARITO":
            if not ("GABARITO" in text or "VERSAO 1" in text or "1 - " in text):
                raise ValueError("Documento não parece ser gabarito objetivo")
        elif plain(marker) not in text:
            raise ValueError(f"Marcador de prova ausente: {marker}")
        if "GABARITO" not in file and "gabarito" not in file and pdf.page_count <= 5:
            raise ValueError("Caderno de prova curto demais")
        print(f"Validado: {school} {year}, {marker}, {pdf.page_count} páginas, {len(raw)} bytes",flush=True)

def acquire(path: str, urls: list[str], year: str, school: str, marker: str, pages: tuple[int,int]) -> bool:
    target = ROOT / path
    if target.is_file():
        try:
            validate(target.read_bytes(), year,school,marker,pages,path)
            return True
        except Exception as exc:
            raise RuntimeError(f"Arquivo existente não corresponde à descrição (não sobrescrever): {path}: {exc}")
    last = ""
    for url in urls:
        for attempt in range(1,3):
            try:
                with requests.get(url,headers={"User-Agent":"Mozilla/5.0","Accept":"application/pdf,*/*"},
                                  timeout=(15,60),stream=True) as resp:
                    resp.raise_for_status()
                    parts=[]; size=0
                    for block in resp.iter_content(131072):
                        if not block: continue
                        size += len(block)
                        if size>LIMIT: raise ValueError("PDF maior que 14 MB")
                        parts.append(block)
                data=b"".join(parts)
                validate(data,year,school,marker,pages,path)
                target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes(data)
                print(f"GRAVADO {path} SHA256 {hashlib.sha256(data).hexdigest()} (fonte: {url})",flush=True)
                return True
            except (requests.RequestException, ValueError, RuntimeError) as exc:
                last=str(exc)
                print(f"Falhou {path} ({attempt}/2) URL={url}: {last}",flush=True)
                if attempt==1:time.sleep(2)
    print(f"PENDENTE {path}: {last}",flush=True)
    return False

def main() -> int:
    done=0
    for file,urls,year,school,marker,pages in DOCS:
        if acquire(file,urls,year,school,marker,pages):
            done+=1
    print(f"RESULTADO: {done}/{len(DOCS)} PDFs validados e presentes. Os restantes continuam pendentes no catálogo.",flush=True)
    if done==0:return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
