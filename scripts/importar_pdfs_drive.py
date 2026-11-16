#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Importa PDFs das quatro pastas Drive divulgadas pelo Instituto para o repositório.

Por segurança, só aceita o conteúdo exato de cada PDF previamente recebido e
cadastrado, validado por tamanho e CRC32 extraído dos ZIPs de origem.
Não inventa provas ou altera os PDFs. Os arquivos permanecem pending se não
forem encontrados na pasta pública.
"""
from __future__ import annotations
import json
import os
import re
import shutil
import sys
import tempfile
import zlib
from pathlib import Path
import gdown

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "acervo-dados.js"
ORIGINS = ROOT / "acervo-catalogo.json"
# CRC32 de cada arquivo nos ZIPs fornecidos, ordenados pelo caminho de destino.
# Correspondem a 149 PDFs: ENEM 24; FUVEST 36; UNESP 24; UNICAMP 65.
CRC32_HEX = """
103f3f1f 63f58c33 94720a9f 29f51121 0cc5390a edbf999d 1aa76bdd 9c452775 b9dfe153 1069ba1c d00135d5 29a68249 a30f0970 1f2bb611 716b9512 f57c3c7e cb72da65 49d688c7 12877cd3 cf4675d8 783aa5b0 d3fb132d 3124008d 88b1b349 1d0a3970 0f1b5ccf e39d9382 c2d039a8 dd074155 b00fe38a fb90d8ae dc88a338 bc85a9f7 9db3845e 12f527d9 61b13d42 e18988cc 1f89c570 c04d3585 d949c88a 55c8c833 88aeab99 c5c53f10 702b2251 8c764ee7 51b3313f 1becf920 0f7431be a635dd47 7ab08311 43da9c92 7d7fdba8 4939ca70 038b0de2 0249ce31 c4690095 65151de8 86289e18 ebf2399c 110f185b ee665cc7 ceab3f92 335a0864 3b36bc93 70a7d0d4 d811938b 5994a253 6ee3eef9 1384dd54 1ff4e38c ec7eb2de dd346ee6 bb5c7f70 96d5d5bc 80c91d0d 47f79010 be20c745 c174ce98 9ffc6e75 0dbc848d 319134b5 477127de f2ee87e3 1a28a010 5ba55880 e1377279 596ea3be 9662ea36 9fff0ac0 561cd30b 3a48ee2b 49603a82 fa07c0e9 1848c813 fd32f8a6 44f5c1d4 795ff7f4 e23bc450 3c5e9b0e 064e369a d62a8537 4cbce6ae 090c6160 e2d48258 780256f5 c041b360 3f7198db b27b70d1 086280ab 753d8282 4f72943c 4fb2c0b5 d815be95 e829c029 17110abb a1ad108b 57db681f 84fc2927 ad50e562 ac866fac 4956a616 1ea3d2c3 a451ce9e 657e852b 6c8ae363 a3b57f72 9402535d e0bae7c7 1b8ec2cd a94547d2 275049d0 bf3cc76f 9bc91a1a 7f6102a8 31b7beb1 0090f763 3403ae82 b8ac1fe3 03a62a71 75283426 8b0fa036 cafa4aaa 84953ce6 723a20ca 8c557077 58e34b07 0d39cf95 426e2325 f39d4883
"""

def read_catalog():
    raw = CATALOG.read_text(encoding="utf-8")
    match = re.search(r"window\.EVM_ACERVO\s*=\s*(\{[\s\S]*\})\s*;", raw)
    if match is None:
        raise RuntimeError("Catálogo acervo-dados.js não encontrado")
    return json.loads(match.group(1))

def crc32_file(path):
    checksum = 0
    with path.open("rb") as file:
        if file.read(5) != b"%PDF-":
            return None
        file.seek(0)
        while chunk := file.read(1024 * 1024):
            checksum = zlib.crc32(chunk, checksum)
    return checksum & 0xffffffff

def main():
    data = read_catalog()
    ranges = {
        "fuvest": range(2020, 2026), "unesp": range(2020, 2026),
        "unicamp": range(2020, 2026), "enem": range(2019, 2025),
    }
    target_docs = sorted(
        (doc for inst in data["institutions"] if inst["id"] in ranges
         for year, docs in inst["years"].items() if int(year) in ranges[inst["id"]]
         for doc in docs),
        key=lambda doc: doc["file"],
    )
    checksums = CRC32_HEX.split()
    if len(target_docs) != 149 or len(checksums) != len(target_docs):
        raise RuntimeError(f"Esperados 149 PDFs no catálogo/CRCs; encontrados {len(target_docs)}/{len(checksums)}")
    origins = json.loads(ORIGINS.read_text(encoding="utf-8"))["institutions"]
    selected = {i["id"]: i for i in origins if i["id"] in {"fuvest","unesp","unicamp","enem"}}
    # Evita aceitar outro arquivo por coincidência de nome ou tipo.
    expected = {(int(doc["size"]), int(hexcrc, 16)): doc for doc, hexcrc in zip(target_docs, checksums)}
    if len(expected) != len(target_docs):
        raise RuntimeError("Assinaturas repetidas; revise o inventário")
    matched = set()
    with tempfile.TemporaryDirectory(prefix="evm-import-") as temp:
        for slug, origin in selected.items():
            url = origin.get("legacy", "")
            m = re.search(r"/folders/([A-Za-z0-9_-]+)", url)
            if m is None:
                print("Pasta sem URL configurada:", slug, flush=True)
                continue
            destination = Path(temp) / slug
            destination.mkdir(parents=True, exist_ok=True)
            # Primeiro obtém a lista de arquivos sem baixar nada. Depois faz
            # cada download independentemente; falha em 1 PDF não bloqueia os demais.
            try:
                print(f"Listando pasta Drive: {slug}", flush=True)
                listing = gdown.download_folder(
                    id=m.group(1), output=str(destination),
                    quiet=True, remaining_ok=True, use_cookies=False,
                    skip_download=True
                ) or []
            except Exception as exc:
                print(f"Não foi possível listar a pasta {slug}: {exc}", flush=True)
                listing = []
            found_this = 0
            for remote in listing:
                # Evita baixar provas adicionais fora dos anos recebidos.
                names = set(re.findall(r"(?<!\\d)(?:19|20)\\d{2}(?!\\d)", remote.path))
                if names and not any(int(y) in ranges[slug] for y in names):
                    continue
                raw = destination / (remote.id + ".download")
                try:
                    result = gdown.download(
                        id=remote.id, output=str(raw), quiet=True,
                        use_cookies=False
                    )
                    if not result or not raw.is_file():
                        raise RuntimeError("Drive não retornou o arquivo")
                except Exception as exc:
                    # Alternativa para links públicos que falham no endpoint uc.
                    try:
                        import requests
                        link = "https://drive.usercontent.google.com/download"
                        with requests.get(link, params={
                            "id": remote.id, "export": "download", "confirm": "t"
                        }, stream=True, timeout=(10, 35)) as resp:
                            resp.raise_for_status()
                            with raw.open("wb") as stream:
                                for chunk in resp.iter_content(1024 * 1024):
                                    if chunk:
                                        stream.write(chunk)
                                    if stream.tell() > 32_000_000:
                                        raise RuntimeError("Arquivo maior que o esperado")
                    except Exception:
                        print(f"Não foi possível baixar: {remote.path} ({str(exc)[:70]})", flush=True)
                        raw.unlink(missing_ok=True)
                        continue
                key = (raw.stat().st_size, crc32_file(raw))
                doc = expected.get(key)
                if doc is not None and doc["file"].startswith(f"acervo/{slug}/"):
                    target = ROOT / doc["file"]
                    if not target.is_file():
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(raw, target)
                        found_this += 1
                    matched.add(doc["file"])
                raw.unlink(missing_ok=True)
            print(f"{slug}: {found_this} arquivos importados neste ciclo", flush=True)
    # Mantém pending nos arquivos que não foram transferidos.
    imported = 0
    for inst in data["institutions"]:
        for docs in inst["years"].values():
            for doc in docs:
                if doc.get("pending") and doc["file"] in matched:
                    del doc["pending"]
                    imported += 1
    CATALOG.write_text(
        "/* Catálogo local do Banco de Provas. */\nwindow.EVM_ACERVO = "
        + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Importados {imported} de 149 PDFs. Restam {149-imported} pendentes.", flush=True)
    if not imported:
        print("Nenhum arquivo disponível por acesso público às pastas Drive.", flush=True)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
