# Novas provas — ENEM 2025, UNESP 2026 e UNICAMP 2026

## Arquivos verificados dos ZIPs fornecidos

| Instituição | Ano | PDFs originais únicos | Organização |
|---|---:|---:|---|
| ENEM | 2025 | 4 | 1º dia e 2º dia |
| UNESP | 2026 | 4 | 1ª fase e 2ª fase |
| UNICAMP | 2026 | 11 | 1ª fase e 2ª fase |
| **Total** | | **19** | |

Foram verificados cabeçalhos, legibilidade e número de páginas dos PDFs e gerado inventário de SHA-256 por arquivo. Nenhum documento é regravado ou editado. Os caminhos são `acervo/enem/2025/`, `acervo/unesp/2026/`, `acervo/unicamp/2026/`.

### Atenção — divergência no ZIP do ENEM

O arquivo originalmente chamado `ENEM 2025 P2.pdf` **não é a prova do 2º dia**. Sua capa identifica: **1º dia, Caderno 2, amarelo** (90 questões 1–90 e proposta de redação). Ele foi corretamente cadastrado na pasta `dia-1`.

O arquivo `ENEM 2025 P2 GABARITO.pdf` **é** o gabarito do **2º dia, Caderno 5, amarelo** (questões 91–180). O ZIP **não contém o caderno correspondente a esse gabarito**. Não anunciar que a prova do 2º dia foi fornecida.

### UNICAMP — arquivo duplicado

O arquivo `Expectativa-Banca_RED_FINAL.pdf` e a cópia `Expectativa-Banca_RED_FINAL (1).pdf` têm bytes idênticos. Foi preservada apenas uma cópia como `unicamp-2026-2a-fase-expectativas-banca-redacao.pdf`.

### Publicação no GitHub

- Registros incluídos em `acervo-dados.js` com `pending: true` até a verificação da existência dos PDFs no repositório.
- Importador em `scripts/importar_provas_2025_2026.py` tenta fontes oficiais conhecidas e pastas públicas do Instituto, mas **somente aceita arquivos idênticos ao ZIP fornecido (mesmo tamanho e SHA-256)**. Arquivos diferentes são recusados.
- Automação `.github/workflows/importar-provas-2025-2026.yml` executa o importador e publica os PDFs efetivamente verificados. Se for bem-sucedida, outra automação solicita o build do GitHub Pages.
- Caso alguma prova não possa ser obtida automaticamente das fontes públicas, usar o pacote local `ENEM2025_UNESP2026_UNICAMP2026_PRONTO_SERVIDOR.zip` entregue no chat. Ele já contém **todos os 19 PDFs com estrutura pronta** para extrair na raiz do aplicativo. **Não apagar a pasta `acervo/` existente**.

**Importante:** o ZIP local não é automaticamente incluído no GitHub só porque foi criado. Os arquivos que falharem no processo continuam marcados como pendentes no catálogo; devem ser inseridos via Painel do Desenvolvedor ou enviados manualmente ao repositório antes de serem anunciados como disponíveis no GitHub.

O GitHub e o site do colégio são ambientes distintos. Alterações no GitHub não atualizam automaticamente a hospedagem do Instituto.
