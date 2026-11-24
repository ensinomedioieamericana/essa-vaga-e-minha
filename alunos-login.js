/* Login coletivo demonstrativo, sem contas individuais.
   ATENÇÃO: o navegador verifica um hash publicamente acessível; não há proteção
   de conteúdo real no GitHub Pages. Migrar autenticação para o servidor. */
(() => {
  'use strict';
  const KEY = 'evm-acesso-coletivo-v1';
  const $ = id => document.getElementById(id);
  const form = $('student-login-form');
  const password = $('student-login-password');
  const toggle = $('student-login-toggle');
  const submit = $('student-login-submit');
  const error = $('student-login-error');
  const status = $('student-login-status');
  if (!form || !password || !toggle || !submit) return;

  const params = new URLSearchParams(location.search);
  const reason = params.get('motivo');
  const tips = {
    alterada:'A senha de acesso foi atualizada. Utilize a nova senha informada pelo Instituto.',
    conexao:'Não foi possível verificar seu acesso. Conecte-se à internet e tente novamente.',
    indisponivel:'O acesso ainda está sendo configurado. Procure a equipe do Ensino Médio.'
  };
  if (tips[reason]) { error.textContent = tips[reason]; error.hidden = false; }

  function message(value) {
    error.textContent = value;
    error.hidden = !value;
    status.textContent = '';
  }
  function hexToBytes(value) {
    if (!/^[0-9a-f]+$/i.test(value) || value.length % 2) throw new Error('Arquivo de acesso inválido.');
    return Uint8Array.from(value.match(/.{2}/g), pair => parseInt(pair, 16));
  }
  function toHex(array) {
    return Array.from(new Uint8Array(array), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function hashesMatch(a,b) {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i=0;i<a.length;i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return mismatch === 0;
  }
  function validateConfig(c) {
    return c && c.version === 1 && c.purpose === 'senha-coletiva-alunos' &&
      c.algorithm === 'PBKDF2-SHA256' && c.configured === true &&
      c.student_login_enabled === true &&
      Number.isInteger(c.iterations) && c.iterations >= 100000 &&
      c.iterations <= 1000000 &&
      /^[0-9a-f]{32}$/i.test(c.salt || '') &&
      /^[0-9a-f]{64}$/i.test(c.hash || '');
  }
  async function verify(candidate, c) {
    if (!crypto?.subtle) throw new Error('Abra o aplicativo em HTTPS para acessar.');
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(candidate), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits({
      name:'PBKDF2', hash:'SHA-256',
      iterations:c.iterations, salt:hexToBytes(c.salt)
    }, key, 256);
    return hashesMatch(toHex(bits), c.hash);
  }
  function safeDestination() {
    const fallback = new URL('./',location.href);
    const requested = params.get('next');
    if (!requested) return fallback.href;
    try {
      const url = new URL(requested, location.href);
      const root = new URL('./', location.href);
      // Somente páginas internas do aplicativo; nunca painel de administração.
      const relativePath = url.pathname.startsWith(root.pathname) ?
        url.pathname.slice(root.pathname.length) : null;
      if (url.origin === location.origin &&
        (relativePath === '' || relativePath === 'index.html' || relativePath === 'acervo.html'))
        return url.href;
    } catch (_) {}
    return fallback.href;
  }
  toggle.addEventListener('click', () => {
    const reveal = password.type === 'password';
    password.type = reveal ? 'text' : 'password';
    toggle.setAttribute('aria-label', reveal ? 'Ocultar senha' : 'Mostrar senha');
    toggle.setAttribute('aria-pressed', String(reveal));
    toggle.title = reveal ? 'Ocultar senha' : 'Mostrar senha';
    toggle.classList.toggle('is-visible',reveal);
    password.focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const candidate = password.value;
    if (!candidate) { message('Digite a senha de acesso para continuar.');return; }
    submit.disabled = true;
    submit.textContent = 'Verificando senha…';
    message('');
    status.textContent = 'Conferindo a senha coletiva…';
    try {
      const response = await fetch('./acesso-alunos.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Não foi possível consultar a senha atual. Tente novamente.');
      const conf = await response.json();
      if (!validateConfig(conf)) throw new Error('O acesso coletivo ainda não está disponível. Procure a equipe do Ensino Médio.');
      if (!await verify(candidate,conf)) {
        password.value = '';
        message('Senha incorreta. Confira a senha informada pelo Instituto.');
        password.focus();
        return;
      }
      try { localStorage.setItem(KEY, JSON.stringify({version:1,hash:conf.hash,created_at:Date.now()})); }
      catch (_) { throw new Error('Seu navegador não permitiu registrar este acesso. Verifique as configurações de privacidade.'); }
      password.value = '';
      status.textContent = 'Senha confirmada. Abrindo o aplicativo…';
      window.location.replace(safeDestination());
    } catch (err) {
      message(err.message || 'Não foi possível validar a senha.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Acessar aplicativo';
    }
  });
})();