/* Controle de acesso demonstrativo no navegador.
   GitHub Pages e seus arquivos continuam públicos. Não é controle de acesso real.
   Para proteção real, migrar validação e entrega dos arquivos ao servidor do Instituto. */
(() => {
  'use strict';
  const KEY = 'evm-acesso-coletivo-v1';
  const FILE = './acesso-alunos.json';
  const MAX_CHECK_INTERVAL_MS = 5 * 60 * 1000;
  const next = window.location.pathname + window.location.search + window.location.hash;
  let lastCheck = 0;
  let running = false;

  function readSession() {
    try {
      const session = JSON.parse(localStorage.getItem(KEY));
      return session && session.version === 1 ? session : null;
    } catch (_) { return null; }
  }
  function clearSession() {
    try { localStorage.removeItem(KEY); } catch (_) {}
  }
  function showApp() {
    document.documentElement.classList.remove('acesso-pendente');
    document.documentElement.setAttribute('data-acesso-coletivo', 'liberado');
  }
  function goLogin(reason) {
    clearSession();
    const target = './alunos-login.html?next=' + encodeURIComponent(next) +
      (reason ? '&motivo=' + encodeURIComponent(reason) : '');
    window.location.replace(target);
  }
  function looksValid(config) {
    return config && config.version === 1 &&
      config.purpose === 'senha-coletiva-alunos' &&
      typeof config.student_login_enabled === 'boolean' &&
      typeof config.configured === 'boolean' &&
      config.algorithm === 'PBKDF2-SHA256' &&
      Number.isInteger(config.iterations) &&
      config.iterations >= 100000 && config.iterations <= 1000000;
  }
  async function check(force = false) {
    if (running) return;
    if (!force && Date.now() - lastCheck < MAX_CHECK_INTERVAL_MS) return;
    running = true;
    try {
      const response = await fetch(FILE, {cache:'no-store'});
      if (!response.ok) throw new Error('Falha na configuração');
      const config = await response.json();
      if (!looksValid(config)) throw new Error('Configuração inválida');
      if (!config.student_login_enabled) { showApp(); return; }
      if (!config.configured || !/^[0-9a-f]{64}$/i.test(config.hash || '')) {
        goLogin('indisponivel');
        return;
      }
      const session = readSession();
      if (!session || session.hash !== config.hash) {
        goLogin(session ? 'alterada' : '');
        return;
      }
      lastCheck = Date.now();
      showApp();
    } catch (_) {
      // Sem confirmação atual não presumimos que a senha anterior ainda serve.
      goLogin('conexao');
    } finally {
      running = false;
    }
  }
  // Executado no head: body permanece oculto até a checagem terminar.
  check(true);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) check(true);
  });
})();