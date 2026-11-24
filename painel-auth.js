/* Proteção visual de demonstração; sem autenticação de servidor.
   Código do painel e dados do CSV são públicos. O token GitHub segue obrigatório para publicar. */
(() => {
  'use strict';
  const KEY = 'evm-painel-sessao-teste-v1';
  const VALID_USERS = ['ricardo_admin', 'felipe_admin'];
  const MAX_AGE = 2 * 60 * 60 * 1000;
  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem(KEY));
  } catch (_) {
    session = null;
  }
  const now = Date.now();
  const allowed = session &&
    session.version === 1 &&
    VALID_USERS.includes(session.usuario) &&
    session.perfil === 'Administrador' &&
    Number.isFinite(session.inicio) &&
    Number.isFinite(session.expira) &&
    session.inicio <= now &&
    session.expira > now &&
    session.expira - session.inicio <= MAX_AGE;
  if (!allowed) {
    try { sessionStorage.removeItem(KEY); } catch (_) {}
    window.location.replace('./painel-login.html');
    return;
  }
  document.documentElement.classList.remove('login-pendente');
  document.documentElement.setAttribute('data-painel-auth', 'teste');
  document.addEventListener('DOMContentLoaded', () => {
    const userLabel = document.getElementById('painel-usuario');
    const logoutButton = document.getElementById('painel-sair');
    if (userLabel) userLabel.textContent = session.usuario;
    if (logoutButton) logoutButton.addEventListener('click', () => {
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      window.location.replace('./painel-login.html');
    });
  });
})();