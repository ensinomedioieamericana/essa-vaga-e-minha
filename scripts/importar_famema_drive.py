#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Importa somente os 9 PDFs originais FAMEMA 2021-2024 por validação SHA-256.
A origem é a pasta pública FAMEMA já cadastrada em acervo-catalogo.json.
Não substitui PDFs de outras instituições nem aceita conteúdo diferente do ZIP.
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

# Caminhos, bytes e SHA-256 obtidos dos nove PDFs originais enviados em FAMEMA.zip.
FILES = {
    "acervo/famema/2021/famema-2021-gabarito-prova-ii-versao-1.pdf":
        (550396, "abcd3f90cd03f782a3262c3fb4e6a8c632d011fe7612247ad289258c0b0b0703"),
    "acervo/famema/2021/famema-2021-provas-i-e-ii.pdf":
        (1048991, "400870ce2ec7aa90c2fd278f9f2911405966e7dbc526832cd91a1d0ff18c545f"),
    "acervo/famema/2022/famema-2022-gabarito-preliminar.pdf":
        (71806, "49e4a58521ca292e5d78617674b1dc615544697b90644b578b84e90144887a40"),
    "acervo/famema/2022/famema-2022-prova-tipo-1.pdf":
        (1024000, "7c75f1507f70bef3ade37aacd885e18955af8089c8e73546c3cee1746be92a5c"),
    "acervo/famema/2023/famema-2023-gabarito-prova-ii-versao-3.pdf":
        (791618, "0ca17e513165e6097addb106510767d5c9a1be55f285b8f85045ef2f809a1bab"),
    "acervo/famema/2023/famema-2023-prova-i-discursiva.pdf":
        (1368562, "666e71ffa5ce669e5df4f2e163865483567ed709fff57a639c2e0a71ebfddca5"),
    "acervo/famema/2023/famema-2023-prova-ii-objetiva-redacao.pdf":
        (685573, "310ccb516322cd8d0193cafb313514a22fa8038dcd6828a2421190fbce5fb0a8"),
    "acervo/famema/2024/famema-2024-gabarito-prova-ii-versao-1.pdf":
        (306402, "9988ef08e5c4d53b6fe3627f958e3225202a24098c8242c60b15ae69e2467f1b"),
    "acervo/famema/2024/famema-2024-provas-i-e-ii.pdf":
        (1658175, "ed10b7eb6a2b9d28eb02631cba31020dd8138d7591febf12f8aa8016b9e183b9"),
}
BY_DIGEST = {(size, digest): filename for filename, (size, digest) in FILES.items()}


def read_catalog():
    raw = CATALOG.read_text(encoding="utf-8")
    m = re.search(r"window\.EVM_ACERVO\s*=\s*(\{[\s\S]*\})\s*;", raw)
    if not m:
        raise RuntimeError("Catálogo inválido")
    return json.loads(m.group(1))


def checksum(path):
    with path.open("rb") as stream:
        if stream.read(5) != b"%PDF-":
            return None
        stream.seek(0)
        digest = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return path.stat().st_size, digest.hexdigest()


def fetch_one(file_id, target):
    output = gdown.download(id=file_id, output=str(target), quiet=True, use_cookies=False)
    if output and target.is_file():
        return True
    # Alguns IDs públicos exigem o endpoint alternativo.
    import requests
    address = "https://drive.usercontent.google.com/download"
    with requests.get(address, params={"id": file_id, "export": "download", "confirm": "t"},
                      timeout=(10, 50), stream=True) as response:
        response.raise_for_status()
        with target.open("wb") as stream:
            for chunk in response.iter_content(1024 * 1024):
                if chunk:
                    stream.write(chunk)
                if stream.tell() > 8_000_000:
                    raise RuntimeError("Download ultrapassou 8 MB; rejeitando arquivo")
    return target.exists()


def main():
    data = read_catalog()
    inst = next((i for i in data.get("institutions", []) if i.get("id") == "famema"), None)
    if inst is None:
        raise RuntimeError("FAMEMA ausente do catálogo")
    registered = {d.get("file"): d for ds in inst.get("years", {}).values() for d in ds}
    if not all(name in registered for name in FILES):
        raise RuntimeError("Catálogo não contém todos os nove registros FAMEMA")

    origin = json.loads(ORIGINS.read_text(encoding="utf-8"))
    record = next(i for i in origin["institutions"] if i["id"] == "famema")
    m = re.search(r"/folders/([A-Za-z0-9_-]+)", record["legacy"])
    if m is None:
        raise RuntimeError("Pasta pública FAMEMA sem ID válido")

    found = set()
    for path in FILES:
        target = ROOT / path
        if target.is_file() and checksum(target) == FILES[path]:
            found.add(path)

    with tempfile.TemporaryDirectory(prefix="famema-") as temp:
        folder = Path(temp)
        print("Listando PDFs na pasta pública FAMEMA...", flush=True)
        listing = gdown.download_folder(
            id=m.group(1), output=str(folder), quiet=True,
            remaining_ok=True, use_cookies=False, skip_download=True,
        ) or []
        print(f"{len(listing)} arquivos listados.", flush=True)
        for remote in listing:
            name = str(remote.path)
            if not name.lower().endswith(".pdf"):
                continue
            years = re.findall(r"(?<!\d)(?:19|20)\d{2}(?!\d)", name)
            if years and not any(y in {"2021", "2022", "2023", "2024"} for y in years):
                continue
            temp_file = folder / (remote.id + ".pdf")
            try:
                if not fetch_one(remote.id, temp_file):
                    continue
                key = checksum(temp_file)
                destination = BY_DIGEST.get(key)
                if destination is None or destination in found:
                    continue
                target = ROOT / destination
                if target.exists() and checksum(target) != FILES[destination]:
                    raise RuntimeError(f"PDF com conteúdo divergente já existe: {destination}")
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(temp_file, target)
                found.add(destination)
                print(f"Importado: {destination}", flush=True)
            except Exception as exc:
                print(f"Aviso: não foi possível importar {name}: {exc}", flush=True)
            finally:
                temp_file.unlink(missing_ok=True)

    for name in found:
        registered[name].pop("pending", None)

    CATALOG.write_text(
        "/* Catálogo local do Banco de Provas. */\nwindow.EVM_ACERVO = "
        + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"FAMEMA: {len(found)} / {len(FILES)} arquivos originais disponíveis.", flush=True)
    if len(found) < len(FILES):
        print("Arquivos faltantes não foram encontrados com integridade idêntica "
              "na pasta pública. O pacote PRONTO_SERVIDOR pode ser usado para completar.", flush=True)
        # Publicar o que de fato foi verificado; os demais continuam pending.
        return 0 if found else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
