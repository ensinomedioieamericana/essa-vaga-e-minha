#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Importa FAMERP 2021–2024 da pasta pública do Drive por identidade SHA-256.
Somente aceita os 12 PDFs exatos recebidos no ZIP FAMERP.zip. Os demais
vestibulares, pastas e documentos não são alterados por este script.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

import gdown

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "acervo-dados.js"
ORIGINS = ROOT / "acervo-catalogo.json"

FILES = {
    "acervo/famerp/2021/dia-1/famerp-2021-dia-1-prova-conhecimentos-gerais.pdf": (2062613, "e3657f853e362f218b4908dce322a4839d6924461c87fc4cf8aa3924e1c8342a"),
    "acervo/famerp/2021/dia-2/famerp-2021-dia-2-prova-especificos-redacao.pdf": (1543438, "5c63ad409eb160363d76f82d04624b486e3182d2094e9b9191d0fa34c758400c"),
    "acervo/famerp/2021/dia-1/famerp-2021-dia-1-gabarito.pdf": (551551, "c6c9b71deb22ad4395ad68766260818aed0eec8732903916e45462c400837704"),
    "acervo/famerp/2022/dia-1/famerp-2022-dia-1-prova-conhecimentos-gerais.pdf": (1643296, "ec409208fa188221cc91e5258183d9bc5e6857e83d16f2a510fa71e633e4daa2"),
    "acervo/famerp/2022/dia-2/famerp-2022-dia-2-prova-especificos-redacao.pdf": (1597682, "a3faa48f8a9f574184fcd150776bf5d59978b6c0a4eed0923cef6150cb3215f5"),
    "acervo/famerp/2022/dia-1/famerp-2022-dia-1-gabarito.pdf": (551679, "e15f9d81c4b1404a6406c2fc332a327cc45498aa2e3aee97e4afc7dac1ef5a26"),
    "acervo/famerp/2023/dia-1/famerp-2023-dia-1-prova-conhecimentos-gerais.pdf": (1811896, "8dbb5d717ec77b239c0a938da810fd64fcfa3967f3e657864abdec5c89cc00ff"),
    "acervo/famerp/2023/dia-2/famerp-2023-dia-2-prova-especificos-redacao.pdf": (1651367, "448a1916aa2d98bafee7511bf057d03175856e4aee85e976e1f33faf8d0ae907"),
    "acervo/famerp/2023/dia-1/famerp-2023-dia-1-gabarito.pdf": (787075, "dd67becfd994d214e32d3c9aaa8a2f0ead1d596096b2c3d0f9fa58c971d0d40a"),
    "acervo/famerp/2024/dia-1/famerp-2024-dia-1-prova-conhecimentos-gerais.pdf": (1535595, "65e326c89905f51905849066a3b9f5ba38b214da34c49345d475c4010efa4112"),
    "acervo/famerp/2024/dia-2/famerp-2024-dia-2-prova-especificos-redacao.pdf": (1578165, "0fb7d76d1947728e390cfaf217316cd36d31b2039f6856dddb91fec25d80c6e5"),
    "acervo/famerp/2024/dia-1/famerp-2024-dia-1-gabarito.pdf": (110533, "057a2b59f4924ba5f412b0f05ed72161dd91cd4e37a83c7889d035f78f18e20b"),
}
BY_DIGEST = {(size, sha): path for path, (size, sha) in FILES.items()}


def checksum(file: Path):
    with file.open("rb") as stream:
        if stream.read(5) != b"%PDF-":
            return None
        stream.seek(0)
        digest = hashlib.sha256()
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return file.stat().st_size, digest.hexdigest()


def retrieve(file_id: str, target: Path) -> bool:
    try:
        downloaded = gdown.download(id=file_id, output=str(target), quiet=True, use_cookies=False)
        if downloaded and target.exists():
            return True
    except Exception as error:
        print(f"gdown falhou ({file_id}): {error}", flush=True)
    import requests
    with requests.get("https://drive.usercontent.google.com/download",
                      params={"id": file_id, "export": "download", "confirm": "t"},
                      timeout=(20, 55), stream=True) as response:
        response.raise_for_status()
        with target.open("wb") as out:
            for chunk in response.iter_content(128 * 1024):
                if chunk:
                    out.write(chunk)
                if out.tell() > 7_000_000:
                    raise ValueError("Arquivo acima do limite; rejeitando download")
    return target.exists()


def main() -> int:
    txt = CATALOG.read_text(encoding="utf-8")
    matched = re.search(r"window\.EVM_ACERVO\s*=\s*(\{[\s\S]*\})\s*;", txt)
    if not matched:
        raise RuntimeError("Catálogo acervo-dados.js incompatível")
    catalog = json.loads(matched.group(1))
    inst = next((i for i in catalog["institutions"] if i["id"] == "famerp"), None)
    if inst is None:
        raise RuntimeError("FAMERP ausente do catálogo")
    by_file = {d["file"]: d for year_docs in inst["years"].values() for d in year_docs}
    if not all(file in by_file for file in FILES):
        raise RuntimeError("É necessário cadastrar os doze documentos antes de importar")

    origin = json.loads(ORIGINS.read_text(encoding="utf-8"))
    info = next((i for i in origin["institutions"] if i["id"] == "famerp"), None)
    if info is None:
        raise RuntimeError("Pasta pública FAMERP ausente")
    m = re.search(r"/folders/([A-Za-z0-9_-]+)", info["legacy"])
    if m is None:
        raise RuntimeError("ID da pasta pública FAMERP inválido")

    found = set()
    for path, wanted in FILES.items():
        dest = ROOT / path
        if dest.is_file():
            if checksum(dest) != wanted:
                raise RuntimeError(f"Arquivo já existente diverge do original: {path}")
            found.add(path)

    if len(found) < len(FILES):
        with tempfile.TemporaryDirectory(prefix="famerp-") as dirname:
            folder = Path(dirname)
            print("Lendo o Drive público da FAMERP...", flush=True)
            listing = gdown.download_folder(
                id=m.group(1), output=str(folder), quiet=True,
                remaining_ok=True, use_cookies=False, skip_download=True,
            ) or []
            print(f"{len(listing)} itens encontrados para conferência.", flush=True)
            for remote in listing:
                remote_name = str(remote.path)
                if not remote_name.lower().endswith(".pdf"):
                    continue
                if len(found) == len(FILES):
                    break
                temp = folder / (str(remote.id) + ".pdf")
                try:
                    if not retrieve(str(remote.id), temp):
                        continue
                    key = checksum(temp)
                    expected = BY_DIGEST.get(key)
                    if not expected:
                        print(f"PDF público não idêntico ao enviado: {remote_name}", flush=True)
                        continue
                    if expected in found:
                        continue
                    dest = ROOT / expected
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(temp, dest)
                    found.add(expected)
                    print(f"Importado: {expected}", flush=True)
                except Exception as error:
                    print(f"Não foi possível conferir {remote_name}: {error}", flush=True)
                finally:
                    temp.unlink(missing_ok=True)
    else:
        print("Todos os PDFs já existiam e foram validados.", flush=True)

    for file in found:
        by_file[file].pop("pending", None)
    CATALOG.write_text(
        "/* Catálogo local do Banco de Provas. */\nwindow.EVM_ACERVO = "
        + json.dumps(catalog, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    missing = sorted(set(FILES) - found)
    print(f"FAMERP: {len(found)} / {len(FILES)} PDFs originais disponíveis no repositório.", flush=True)
    if missing:
        print("Ainda pendentes:", *missing, sep="\n  ", flush=True)
        if not found:
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
