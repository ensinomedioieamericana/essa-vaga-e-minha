# Essa Vaga É Minha! — Versão 4.0

Aplicativo web progressivo do Instituto Educacional de Americana. Identidade visual azul/vermelho/branco com logos originais fornecidos.

## Recursos

- 17 referências do Linktree original, navegação responsiva, pesquisa e favoritos locais.
- **Notas de Corte → USP:** 2020 a 2026, Ampla Concorrência, busca, ordenação, série histórica e exportação CSV.
- **Notas de Corte → UNICAMP:** 2020 a 2026, tabela de cursos/turnos, busca, ordenação, filtro de histórico completo e exportação CSV.
- **Notas de Corte → UNESP:** 2020–2026, cidade e turno preservados; para 2025/2026 somente SU (Sistema Universal), busca, ordenação, filtro de histórico completo e exportação CSV.
- Código-fonte HTML/CSS/JavaScript, aplicativo instalável como PWA quando hospedado via HTTPS.

## UNESP: como ler os dados

- **2025–2026:** usada exclusivamente a coluna **SU (Sistema Universal)** dos documentos de convocação para a 2ª fase da UNESP/VUNESP. As colunas SRVEBP e SRVEBP+PPI foram excluídas.
- **2020–2024:** valores da compilação histórica enviada pelo Instituto; o arquivo **não identifica explicitamente a modalidade**. Esses anos não devem ser apresentados como SU confirmado sem auditoria adicional das fontes originais.
- **Critério:** total mínimo de acertos na primeira fase, com 90 questões, para convocação à segunda fase; não é pontuação de classificação final.
- **Granularidade:** campus e turno são preservados para impedir a mistura de concorrências distintas. Títulos ou turnos alterados sem correspondência segura ficam em séries diferentes, com células ausentes marcadas por travessão.
- **Códigos VUNESP:** podem ser reordenados de um ano para o outro; os dados foram relacionados por nome de carreira, cidade e turno, e não apenas por número de código.
- Fonte 2026 primária: https://documento.vunesp.com.br/documento/stream/NzQ4OTk4Ng%3D%3D
- Fonte 2026 alternativa fornecida pelo usuário: https://www.curso-objetivo.br/vestibular/assets/download/notas-corte/unesp-nota-de-corte-2026.pdf
- 2025: `fontes/unesp-2025.pdf`. 2020–24: `fontes/unesp-2020-2024.pdf`.

## UNICAMP: como ler os dados

- **2025 e 2026:** somente **Não Cotistas / PAAIS 0** (sem bônus PAAIS), a primeira coluna do grupo Não Cotistas nas tabelas COMVEST. Não incluímos as demais combinações PAAIS nem as colunas de cotistas.
- **2020 a 2024:** valores transcritos da compilação enviada pelo Instituto. O documento NÃO discrimina a modalidade/categoria: não é possível confirmar apenas com ele se correspondem ao mesmo perfil de 2025–2026. Recomenda-se revisão antes de publicação institucional.
- **Escala:** em 2020 a prova da primeira fase teve **90 questões**; de 2021 a 2026 **72 questões**. Comparação direta de números absolutos de 2020 com outros anos é enganosa.
- **Significado:** total de acertos do último convocado à **2ª fase** na prova da 1ª fase. NÃO é nota final de aprovação, e não representa desempenho necessário para matrícula.
- I: Integral; N: Noturno. Os seis cursos de Música e Treineiros não constam da tabela histórica entregue para 2020–2024 e estão com traço nesses anos. O traço não representa nota zero.

### Fontes UNICAMP

- `fontes/unicamp-2020-2024.pdf`: compilação fornecida pelo Instituto.
- `fontes/unicamp-2025.pdf`: tabela COMVEST 2025 fornecida pelo Instituto (Não Cotistas, PAAIS 0).
- 2026: https://www.comvest.unicamp.br/ingresso-2026/vestibular-2026/numero-de-acertos-para-2a-fase/

### Fontes USP

- `fontes/usp-2020-2024.pdf`: compilação fornecida pelo Instituto.
- `fontes/usp-2025.pdf`: PDF fornecido.
- 2026: https://www.fuvest.br/wp-content/uploads/fuvest2026_notas_de_corte.pdf
- Nota: códigos e agrupamentos de carreiras da FUVEST mudaram; a versão foi organizada com ausência de dados quando não havia equivalência segura. Revisão institucional recomendada antes de publicação.

## Publicação

1. Extraia o ZIP.
2. Hospede os arquivos da pasta `essa-vaga-e-minha/` em servidor HTTPS; `index.html` é a página principal.
3. O navegador poderá oferecer instalação por meio do manifesto e do service worker.
4. A demonstração HTML de arquivo único é destinada a avaliação local; ela não é instalada como PWA e não sincroniza o painel de links entre usuários.

## Atualização dos dados

- `unesp-notas.json` contém a base UNESP, e `unesp-notas.js` carrega os dados no aplicativo.
- `unicamp-notas.json` é a base estruturada, e `unicamp-notas.js` carrega seu conteúdo para a aplicação.
- `usp-notas.json` e `usp-notas.js` são equivalentes para USP.
- CSVs prontos em `notas-unicamp-2020-2026.csv` e `notas-usp-ampla-concorrencia-2020-2026.csv`.
- O gerenciamento de links dentro do app é **local** (armazenado somente no navegador). Atualizações globais exigem backend/painel autenticado.

Última integração: 06/11/2026 — UNESP.
