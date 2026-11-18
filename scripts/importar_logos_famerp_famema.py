#!/usr/bin/env python3
"""Localiza e salva logotipos institucionais já usados nos cards do aplicativo.
Mantém a proporção e os elementos originais, sem recriar as marcas.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import requests
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
LOGOS=[
 ("FAMERP",
  "https://storage.googleapis.com/locus-bucket-prd/instituicao-ensino/faculdade-de-medicina-de-sao-jose-do-rio-preto.png",
  ROOT/"assets/logo-famerp.png", (400,400)),
 ("FAMEMA",
  "https://jucoracini.github.io/E-book-antibioticoterapia/assets/capa/famema.png",
  ROOT/"assets/logo-famema.png", (560,400))
]

for name,url,output,max_size in LOGOS:
    print(f"{name}: baixando imagem institucional...",flush=True)
    with requests.get(url,timeout=(20,60),headers={"User-Agent":"Mozilla/5.0","Accept":"image/png,image/*"},stream=True) as response:
        response.raise_for_status()
        buffer=BytesIO()
        for block in response.iter_content(64*1024):
            if block: buffer.write(block)
            if buffer.tell()>10*1024*1024:raise RuntimeError(f"{name}: imagem excedeu limite de 10 MB")
    data=buffer.getvalue()
    with Image.open(BytesIO(data)) as src:
        src.load()
        if src.width<180 or src.height<120:raise RuntimeError(f"{name}: dimensões inválidas {src.size}")
        if src.format not in ("PNG","JPEG","WEBP"):raise RuntimeError(f"{name}: formato não permitido {src.format}")
        img=ImageOps.exif_transpose(src)
        img.thumbnail(max_size,Image.Resampling.LANCZOS)
        if img.mode not in ("RGB","RGBA"):img=img.convert("RGBA")
        output.parent.mkdir(parents=True,exist_ok=True)
        img.save(output,format="PNG",optimize=True)
    with Image.open(output) as check:
        check.verify()
    if output.stat().st_size<1000:raise RuntimeError(f"{name}: arquivo gerado está pequeno demais")
    print(f"{name}: {output.relative_to(ROOT)} ({output.stat().st_size} bytes, sha256 {hashlib.sha256(output.read_bytes()).hexdigest()})",flush=True)
print("Ambos os logotipos locais gerados e conferidos.")
