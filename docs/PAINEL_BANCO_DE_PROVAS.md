# Painel do Desenvolvedor — gerenciamento do Banco de Provas

## Recurso adicionado em 16/11/2026

Acesse `painel.html` → aba **Banco de Provas**.

É possível:
1. Escolher entre **FUVEST/USP, ENEM, UNESP, UNICAMP, FAMERP e FAMEMA**.
2. Selecionar um **ano já existente** ou digitar um novo ano (1990–2099).
3. Escolher uma pasta existente ou **criar uma pasta/subpasta personalizada**, por exemplo `2a-fase/matematica`.
4. Escolher **um ou vários PDFs**, classificar como prova, gabarito, resolução ou material complementar e, opcionalmente, definir o título de um único PDF.
5. Publicar os PDFs no **repositório GitHub** e atualizar **`acervo-dados.js` no mesmo commit**.
6. Consultar os registros existentes no catálogo e atualizar a listagem a partir da versão mais recente do repositório.

O painel cria as pastas em `acervo/<vestibular>/<ano>/<pasta>/`. Uma pasta vazia recebe um arquivo de controle `.gitkeep` para poder existir no GitHub. O catálogo mantém `folders[ano]` para que **as pastas vazias também apareçam aos alunos**.

O Banco de Provas público, em `acervo.html`, suporta a navegação **vestibular → ano → fase/pasta → subpastas → PDF**. O ENEM mantém as opções *1º dia* e *2º dia*, e os outros vestibulares preservam *1ª fase* e *2ª fase*, além das pastas personalizadas. O gerador `scripts/gerar_acervo.py` foi atualizado para preservar a lista de pastas criadas no painel.

## Como publicar

1. No painel, escolha o destino e selecione os arquivos.
2. Clique em **Publicar PDFs no GitHub**, ou em **Criar pasta no GitHub**.
3. Insira um **token fine-grained do GitHub** que tenha acesso apenas ao repositório `ensinomedioieamericana/essa-vaga-e-minha` com permissão **Contents: Read and write**.
4. Aguarde a confirmação do commit. Em caso de rejeição ou conflito, a tela informa o motivo. O token não é persistido no navegador.
5. Se o site do colégio for atualizado **manualmente**, exporte/publice novamente o **repositório completo atualizado**, incluindo `acervo/`, `acervo-dados.js`, `acervo.js`, `acervo.html`, `painel.html`, `painel.js`, `painel-acervo.js` e `painel.css`.

**Importante:** publicar no GitHub **não** copia imediatamente o PDF para `umaescolacompleta.com.br`. A sincronização do repositório com a hospedagem do Instituto é um processo independente.

## Segurança e limitações

- A aba **não tem login próprio**. Ela exige um token do GitHub com permissão de escrita em **cada operação**. Sem esse token, ninguém consegue publicar no repositório a partir da interface.
- O token é usado **apenas em memória**, não é armazenado em `localStorage`, `sessionStorage` ou em arquivos do projeto.
- **Todos os arquivos do repositório são públicos**, incluindo os novos PDFs; não enviar provas sigilosas, dados de alunos nem informações pessoais.
- Uploads limitados, na interface, a **20 MiB por arquivo** e **60 MiB por operação** para controlar memória do navegador e limitações de publicação do GitHub. Documentos maiores exigem fluxo de envio alternativo.
- O painel **não sobrescreve caminhos já existentes**. Para trocar um arquivo, renomeie a nova versão ou faça revisão manual.
- PDFs são conferidos por extensão `.pdf` e pelo cabeçalho `%PDF-`. Isso não substitui antivírus e revisão editorial.
- O envio de PDFs e a atualização do catálogo são efetuados em **um único commit Git** via Git Data API; o painel tenta novamente se outra edição avançar a branch no meio da publicação.
- A publicação no repositório não foi executada a partir desta tela de autoria com um token real de administrador; a primeira publicação pelo painel deverá ser testada com um PDF de exemplo.
- O processo externo `scripts/importar_pdfs_drive.py` não é requisito para futuras publicações feitas pela nova aba.

## Estrutura ilustrativa

```text
acervo/
  fuvest/
    2027/
      1a-fase/
        prova-2027.pdf
        gabarito-2027.pdf
      2a-fase/
        matematica/
          prova-dia-2.pdf
  enem/
    2027/
      dia-1/
        caderno-azul.pdf
        gabarito.pdf
      dia-2/
        caderno-amarelo.pdf
```

A lista dos documentos publicados e suas pastas é registrada em `acervo-dados.js`. Os antigos documentos ainda marcados `pending: true` continuarão assim até que os PDFs originais correspondentes sejam efetivamente importados para o GitHub ou para o servidor, conforme o processo legado.
