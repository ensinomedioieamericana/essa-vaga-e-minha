# Migração do Banco de Provas para o servidor do Instituto

## O que foi preparado
- O link dos seis vestibulares no aplicativo abre `acervo.html?prova=fuvest` (e os demais IDs).
- A página mostra os anos **somente quando há PDFs correspondentes no catálogo**.
- Os documentos são abertos e baixados pelo domínio onde o aplicativo estiver instalado.
- O link antigo do Drive é apresentado apenas enquanto não houver PDFs migrados naquele acervo.
- Bernoulli Resolve continua externo, pois é uma plataforma independente.

## Como migrar os materiais originais

1. Baixe cada pasta do Google Drive em ZIP e extraia os documentos. **Não considere os PDFs migrados até que estejam fisicamente no servidor.**
2. Organize no projeto da seguinte forma:

```text
acervo/
  fuvest/
    2026/
      prova-1a-fase.pdf
      gabarito-1a-fase.pdf
      2a-fase/
        prova-dia-1.pdf
  enem/
    2025/
      prova-amarela.pdf
      gabarito-amarelo.pdf
  unesp/
    2026/
      prova.pdf
  unicamp/
    2026/
      prova.pdf
  famerp/
    2025/
      prova.pdf
  famema/
    2025/
      prova.pdf
```

Os nomes acima são **somente exemplos da organização esperada** e não representam arquivos que já foram importados.

3. Execute no diretório do projeto:

```bash
python scripts/gerar_acervo.py
```

4. O script examina os arquivos existentes, verifica o cabeçalho PDF e gera `acervo-dados.js` com nomes, anos, categorias e caminhos. Não altera os documentos.
5. Publique o catálogo atualizado e os arquivos na **mesma estrutura de pastas** da hospedagem do Instituto. Confirme que o servidor entrega arquivos `.pdf` com o tipo correto.
6. Teste a seleção do ano, a visualização e o download no celular e no computador.

## Caso os PDFs sejam muito grandes

O GitHub bloqueia uploads de arquivos individuais acima de 100 MB e não é ideal para armazenar acervos muito volumosos. Para um lote grande, envie os PDFs **diretamente ao servidor do colégio**, mas mantenha a mesma estrutura `acervo/vestibular/ano/`. Execute o gerador numa cópia local que contenha os documentos, e publique no GitHub apenas o catálogo `acervo-dados.js` e o código. Assim, o mesmo site funciona na hospedagem do Instituto sem exigir que os PDFs estejam hospedados no GitHub Pages.

## Atenção

- O site ainda não possui a autenticação por RA: tudo que for publicado agora no GitHub Pages ou em um diretório público poderá ser acessado por quem tiver o endereço. A proteção real dos PDFs precisará ser validada no servidor quando o login for implementado.
- Confirme as permissões de republicação e as condições de uso de provas, gabaritos e materiais de terceiros antes de hospedar os PDFs no servidor.
- Não envie RAs, senhas ou dados dos alunos como parte deste acervo.
- Após cada importação, revise se o número de PDFs por vestibular e por ano confere com as pastas originais.

## Endereços relativos

Não use links fixos com o domínio do GitHub. Arquivos como `./acervo/fuvest/2026/prova.pdf` funcionam tanto no GitHub Pages quanto no diretório `https://umaescolacompleta.com.br/essavagaeminha/` desde que todos os caminhos sejam copiados juntos.
