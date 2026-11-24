# Login demonstrativo do Painel do Editor

## Objetivo
Testar o fluxo de usuário/senha e o layout do Painel, usando um arquivo CSV no repositório. **Não é autenticação segura.** O código do site, o CSV e a interface são públicos; a checagem ocorre no navegador e pode ser contornada.

## Testar
1. Abra `painel-login.html` na versão publicada do projeto (ou abra `painel.html`, que redireciona quando não há sessão).
2. Use a conta **ricardo_admin** ou **felipe_admin**, ambas com perfil **Administrador** e a senha de teste compartilhada pela equipe por canal privado.
3. Clique no olhinho para visualizar/ocultar a senha, depois em **Entrar no Painel**.
4. Confira no cabeçalho o usuário conectado e teste **Sair**.
5. Confirme que o aplicativo dos alunos continua acessível sem login.

## Arquivos
- `painel-login.html` — tela visual alinhada ao design do projeto.
- `painel-login.css` — estilos responsivos do login.
- `painel-login.js` — leitura do CSV e comparação do hash usando PBKDF2-SHA256.
- `usuarios-teste.csv` — apenas nomes, papéis, salts, hashes e número de iterações (sem senha legível).
- `painel-auth.js` — redirecionamento visual para o login, sessão em `sessionStorage` (válida por até duas horas) e botão de saída.
- `painel.html`, `painel.css` — identificação da sessão de teste, botão Sair e aviso de limitações.

## Segurança e migração futura
- **Não usar** para proteger notas, dados pessoais, RAs ou outros conteúdos sensíveis.
- Não reutilizar a senha de teste em qualquer serviço real.
- Mesmo com sessão ativa, **publicações continuam exigindo um token de acesso GitHub** com permissão de escrita. A validação de login atual não fornece esse token.
- Quando houver backend PHP/Node (ou outro serviço autorizado), substituir a validação local por autenticação **no servidor**, sessões autenticadas via cookie `HttpOnly`/`Secure`/`SameSite`, limite de tentativas e senhas com hash adequado; o MySQL pode substituir o CSV.
- A API de publicação deverá usar credenciais de serviço armazenadas **somente no servidor**, com controle de permissões. Não colocar PAT, segredo ou token no HTML/JS público.
- O servidor próprio do Instituto só será atualizado quando a equipe de TI sincronizar os arquivos do GitHub.

**Escopo:** teste restrito ao Painel do Editor. O aplicativo público permanece sem login.
