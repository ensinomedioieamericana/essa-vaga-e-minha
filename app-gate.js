/* Controle de acesso demonstrativo no navegador.
   GitHub Pages e seus arquivos continuam públicos. Não é controle de acesso real.
   Para proteção real, migrar validação e entrega dos arquivos ao servidor do Instituto. */
(() => {
  'use strict';
  const KEY = 'evm-acesso-coletivo-v1';
  const FILE = './acesso-alunos.json';
  const MAX_CHECK_INTERVAL_MS = 5 * 60 * 1000;
  const SESSION_MAX_AGE_MS = 30 * 60 * 1000;
  const LOCAL_CHECK_INTERVAL_MS = 15 * 1000;
  let lastCheck = 0;
  let running = false;

  function readSession() {
    try {
      const session = JSON.parse(localStorage.getItem(KEY));
      if (!session || session.version !== 1) return {session:null,expired:false};
      // A validade e calculada desde o ultimo login; navegacao nao renova o prazo.
      const age = Date.now() - session.created_at;
      if (!Number.isFinite(session.created_at) || !Number.isFinite(age) ||
          age < 0 || age >= SESSION_MAX_AGE_MS)
        return {session:null,expired:true};
      return {session,expired:false};
    } catch (_) { return {session:null,expired:false}; }
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
    // Capturar o endereco no momento da expiracao, nao na abertura da pagina.
    // Assim, a rota atual (#/notas, por exemplo) e os filtros na URL retornam corretamente.
    const current = window.location.pathname + window.location.search + window.location.hash;
    const target = './alunos-login.html?next=' + encodeURIComponent(current) +
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
    const local = readSession();
    if (local.expired) { goLogin('expirada'); return; }
    if (!force && Date.now() - lastCheck < MAX_CHECK_INTERVAL_MS) return;
    running = true;
    try {
      const response = await fetch(FILE + '?v=' + Date.now(), {cache:'no-store'});
      if (!response.ok) throw new Error('Falha na configuração');
      const config = await response.json();
      if (!looksValid(config)) throw new Error('Configuração inválida');
      if (!config.student_login_enabled) { showApp(); return; }
      if (!config.configured || !/^[0-9a-f]{64}$/i.test(config.hash || '')) {
        goLogin('indisponivel');
        return;
      }
      const checked = readSession();
      if (checked.expired) { goLogin('expirada'); return; }
      if (!checked.session || checked.session.hash !== config.hash) {
        goLogin(checked.session ? 'alterada' : '');
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
  // Enquanto o aplicativo permanecer aberto, encerrar o acesso ao completar 30 min.
  // Um navegador em segundo plano pode suspender timers; ao retornar, conferir novamente.
  setInterval(() => check(), LOCAL_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check(true);
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) check(true);
  });
})();