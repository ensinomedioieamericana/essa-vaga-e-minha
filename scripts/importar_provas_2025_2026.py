#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Importa PDFs de ENEM 2025 / UNESP 2026 / UNICAMP 2026 por SHA-256.
Fontes: URLs públicas oficiais quando conhecidas; pastas públicas do Instituto
como alternativa. Só publica bytes idênticos aos ZIPs enviados pelo Instituto.
Os registros não encontrados permanecem pendentes.
"""
from __future__ import annotations
import hashlib
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import gdown
import requests

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "acervo-dados.js"
ORIGINS = ROOT / "acervo-catalogo.json"

# Caminho | tamanho em bytes | SHA256 do PDF original fornecido.
RECORDS = """
acervo/enem/2025/dia-1/enem-2025-dia-1-gabarito-caderno-1-azul.pdf 132331 583ac1950cd1927c42c971c270f96c0e33816844084fd5866a13bf94d8e08a81
acervo/enem/2025/dia-1/enem-2025-dia-1-prova-caderno-1-azul.pdf 3306874 cdda0ab286292f592573089d54c4c60750b2bbaf77890035a411bcf8bbcf4fac
acervo/enem/2025/dia-1/enem-2025-dia-1-prova-caderno-2-amarelo.pdf 2784620 fc5afca9bb3c168c9e1ddc97005736a461104b2552bac02bf0f1386af2164ed3
acervo/enem/2025/dia-2/enem-2025-dia-2-gabarito-caderno-5-amarelo.pdf 294764 4feea3658a94e20fa226028824b22538cb1b7e405a6a6e547d6a7131e5c97c22
acervo/unesp/2026/1a-fase/unesp-2026-1a-fase-gabarito.pdf 311048 6fb7957cffb60cc75dcc705629d4e49fdc5092d382a31a84e4edd04dfd00519a
acervo/unesp/2026/1a-fase/unesp-2026-1a-fase-prova.pdf 4018639 fda4e93aa4b1db96dd07fca3905fd7a254262087da5ddfd44b0f26f742a8a8d0
acervo/unesp/2026/2a-fase/unesp-2026-2a-fase-dia-1-prova.pdf 2100199 4896768161349a21599113e9eec6b4b0a0a42852cf9071e88bcc4a778171ae66
acervo/unesp/2026/2a-fase/unesp-2026-2a-fase-dia-2-prova.pdf 1382183 ad8a838cc7f992a1408231e20ac374d0db238ac45d5029b159e5aef6629851d9
acervo/unicamp/2026/1a-fase/unicamp-2026-1a-fase-gabarito.pdf 60513 13c5e846462f6bfd2eee2ba7bdc8fab35c57ea80aeacf1c405a99889f464dc24
acervo/unicamp/2026/1a-fase/unicamp-2026-1a-fase-prova.pdf 8732984 8f6955a3d2b373bfdfa872c6dfbf1396e0bf15a938d1eaedf14c626c7e12b253
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-dia-1-redacao-portugues-ingles.pdf 1690844 c626089c1b77d8bfb104add89bb6feb0622d760a8b50995d2e8e11384e83f098
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-dia-2-biologicas-saude.pdf 2378543 16f6fa8f3e081e80773f04f22a44cf726ad18db91dd64c714172588919f37cb5
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-dia-2-exatas-tecnologicas.pdf 2453082 b4813994178832969077d82aa166b6573d41820be453f8330503bba99228206b
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-dia-2-humanas-artes.pdf 2931036 fe9f7cf28466df31738360531510247b2d04769aba4f045b621d4f3fa47650f4
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-expectativas-banca-redacao.pdf 183372 809e0a57ec2b6d156b9feba6af94edb8a1e31efc33129c9dd642447568fe876c
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-respostas-esperadas-dia-1.pdf 248206 a5bcf084d5c7cd58e13a9b3913b8630d08519577b89f19ebe1b9e1269afca28a
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-respostas-esperadas-dia-2-biologicas-saude.pdf 381041 c68f827ae8148095f74a3099e917897c2fa510facfd3103eb964bbfa1a96d316
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-respostas-esperadas-dia-2-exatas-tecnologicas.pdf 646311 0a298c97d7727a901b34dca5e1fad05c68ff61986700c53c3aecb2dd43789220
acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-respostas-esperadas-dia-2-humanas-artes.pdf 348735 6a15fa1f0968502f3b4b2bc008a4de4a200b676730ec3076cb2ef1f7f2ace26d
"""
EXPECTED = {path: (int(size), sha) for path,size,sha in (r.split() for r in RECORDS.splitlines() if r.strip())}
BY_DIGEST = {(size, sha): path for path,(size,sha) in EXPECTED.items()}
assert len(EXPECTED) == 19 and len(BY_DIGEST) == 19

# URLs públicas verificadas como correspondentes aos mesmos cadernos/temas.
# SHA-256 evita que uma edição diferente seja aceita acidentalmente.
URLS = {
 "acervo/enem/2025/dia-1/enem-2025-dia-1-prova-caderno-1-azul.pdf":
  "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_PV_impresso_D1_CD1.pdf",
 "acervo/enem/2025/dia-1/enem-2025-dia-1-gabarito-caderno-1-azul.pdf":
  "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_GB_impresso_D1_CD1.pdf",
 "acervo/enem/2025/dia-1/enem-2025-dia-1-prova-caderno-2-amarelo.pdf":
  "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_PV_impresso_D1_CD2.pdf",
 "acervo/enem/2025/dia-2/enem-2025-dia-2-gabarito-caderno-5-amarelo.pdf":
  "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_GB_impresso_D2_CD5.pdf",
 "acervo/unesp/2026/1a-fase/unesp-2026-1a-fase-gabarito.pdf":
  "https://documento.vunesp.com.br/documento/stream/NzQ2NDIxNg%3D%3D",
 "acervo/unicamp/2026/1a-fase/unicamp-2026-1a-fase-prova.pdf":
  "https://www.comvest.unicamp.br/vest2026/F1/f12026Q_X.pdf",
 "acervo/unicamp/2026/1a-fase/unicamp-2026-1a-fase-gabarito.pdf":
  "https://www.comvest.unicamp.br/wp-content/uploads/2025/10/Q_X-gabarito.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-dia-1-redacao-portugues-ingles.pdf":
  "https://www.comvest.unicamp.br/vest2026/F2/provas/2026F2redporingcn.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-dia-2-biologicas-saude.pdf":
  "https://www.comvest.unicamp.br/vest2026/F2/provas/2026F2CB.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-dia-2-exatas-tecnologicas.pdf":
  "https://www.comvest.unicamp.br/vest2026/F2/provas/2026F2CE.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-dia-2-humanas-artes.pdf":
  "https://www.comvest.unicamp.br/vest2026/F2/provas/2026F2CH.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-expectativas-banca-redacao.pdf":
  "https://www.comvest.unicamp.br/wp-content/uploads/2025/12/Expectativa-Banca_RED_FINAL.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-respostas-esperadas-dia-1.pdf":
  "https://www.comvest.unicamp.br/wp-content/uploads/2025/12/Respostas-Esperadas_Dia-1.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-respostas-esperadas-dia-2-biologicas-saude.pdf":
  "https://www.comvest.unicamp.br/wp-content/uploads/2025/12/Respostas-Esperadas_Dia-2_CBS.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-respostas-esperadas-dia-2-exatas-tecnologicas.pdf":
  "https://www.comvest.unicamp.br/wp-content/uploads/2025/12/Respostas-Esperadas_Dia-2_CET.pdf",
 "acervo/unicamp/2026/2a-fase/unicamp-2026-2a-fase-respostas-esperadas-dia-2-humanas-artes.pdf":
  "https://www.comvest.unicamp.br/wp-content/uploads/2025/12/Respostas-Esperadas_Dia-2_CHA.pdf",
}

def parse_catalog():
 raw = CATALOG.read_text(encoding="utf-8")
 m = re.search(r"window\.EVM_ACERVO\s*=\s*(\{[\s\S]*\})\s*;",raw)
 if m is None:
  raise RuntimeError("Catálogo não encontrado")
 return json.loads(m.group(1))

def digest_file(path):
 if not path.is_file():
  return None
 with path.open("rb") as f:
  if f.read(5) != b"%PDF-":
   return None
  f.seek(0)
  h = hashlib.sha256()
  for part in iter(lambda:f.read(1024*1024),b""):
   h.update(part)
 return path.stat().st_size,h.hexdigest()

def download_public(url,location,maximum=20_000_000):
 with requests.get(url,headers={"User-Agent":"Mozilla/5.0"},stream=True,timeout=(15,70)) as r:
  r.raise_for_status()
  with location.open("wb") as f:
   for part in r.iter_content(1024*1024):
    if not part:
     continue
    f.write(part)
    if f.tell()>maximum:
     raise RuntimeError("Arquivo acima do limite previsto")

def record_result(found,source,key,temp_path):
 if key is None or key not in BY_DIGEST:
  return False
 dest=BY_DIGEST[key]
 if dest in found:
  return False
 target=ROOT/dest
 if target.is_file():
  if digest_file(target)!=EXPECTED[dest]:
   raise RuntimeError("Arquivo existente diverge do original: "+dest)
 else:
  target.parent.mkdir(parents=True,exist_ok=True)
  shutil.copyfile(temp_path,target)
 found.add(dest)
 print("Verificado: ",dest,"("+source+")",flush=True)
 return True

def main():
 data=parse_catalog()
 current={d.get("file"):d for inst in data["institutions"]
          for docs in inst.get("years",{}).values()
          for d in docs}
 if not all(p in current for p in EXPECTED):
  raise RuntimeError("O catálogo não contém os 19 registros a importar.")
 found={p for p in EXPECTED if digest_file(ROOT/p)==EXPECTED[p]}
 print("Já verificados:",len(found),"/ 19",flush=True)
 with tempfile.TemporaryDirectory(prefix="acervo-2026-") as tmp:
  temp=Path(tmp)
  # Primeiro tenta documentos oficiais com URLs conhecidas.
  for path,url in URLS.items():
   if path in found:
    continue
   try:
    local=temp/"site.pdf"
    download_public(url,local)
    key=digest_file(local)
    if key!=EXPECTED[path]:
     print("Versão oficial não coincide byte a byte:",path,
           str(key)[:95],flush=True)
     continue
    record_result(found,"fonte oficial",key,local)
   except Exception as e:
    print("Aviso: não foi possível obter",path,":",str(e)[:120],flush=True)

  # Demais arquivos: pastas públicas já cadastradas do Instituto.
  origins=json.loads(ORIGINS.read_text(encoding="utf-8"))
  for slug in ("enem","unesp","unicamp"):
   if all(p in found for p in EXPECTED if p.startswith(f"acervo/{slug}/")):
    continue
   info=next((x for x in origins["institutions"] if x["id"]==slug),None)
   link=(info or {}).get("legacy","")
   m=re.search(r"/folders/([A-Za-z0-9_-]+)",link)
   if m is None:
    continue
   loc=temp/slug
   loc.mkdir(exist_ok=True)
   try:
    listing=gdown.download_folder(id=m.group(1),output=str(loc),
                                   quiet=True,remaining_ok=True,use_cookies=False,
                                   skip_download=True) or []
   except Exception as e:
    print("Drive indisponível:",slug,str(e)[:150],flush=True)
    continue
   print("Drive",slug,":",len(listing),"arquivos listados",flush=True)
   for remote in listing:
    if not str(remote.path).lower().endswith(".pdf"):
     continue
    # Somente anos alvo deste ciclo. Se nomes não contêm ano, filtrar por checksum.
    years=re.findall(r"(?<!\d)(?:19|20)\d{2}(?!\d)",str(remote.path))
    wanted={"enem":"2025","unesp":"2026","unicamp":"2026"}[slug]
    if years and wanted not in years:
     continue
    output=loc/(remote.id+".download")
    try:
     url=gdown.download(id=remote.id,output=str(output),quiet=True,use_cookies=False)
     if not url or not output.is_file():
      # Endpoint alternativo usado com pastas públicas.
      download_public("https://drive.usercontent.google.com/download?id="+remote.id+"&export=download&confirm=t",output)
     key=digest_file(output)
     dest=BY_DIGEST.get(key)
     if dest and dest.startswith(f"acervo/{slug}/"):
      record_result(found,"Google Drive",key,output)
    except Exception as e:
     print("Arquivo ignorado:",str(remote.path)[:70],str(e)[:80],flush=True)
    finally:
     output.unlink(missing_ok=True)

 for path in found:
  current[path].pop("pending",None)
 CATALOG.write_text("/* Catálogo local do Banco de Provas. */\nwindow.EVM_ACERVO = "+
                   json.dumps(data,ensure_ascii=False,indent=2)+";\n",encoding="utf-8")
 print("Novos PDFs verificados:",len(found),"/ 19; pendentes:",19-len(found),flush=True)
 return 0 if found else 1

if __name__=="__main__":
 sys.exit(main())
