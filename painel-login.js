/* Login demonstrativo para o Painel do Editor.
   CSV público com hashes PBKDF2, sem senhas em texto aberto.
   IMPORTANTE: validação no navegador NÃO substitui autenticação no servidor.
   Publicações reais continuam exigindo token autorizado do GitHub. */
(() => {
  'use strict';
  const KEY = 'evm-painel-sessao-teste-v1';
  const MAX_SESSION_MS = 2 * 60 * 60 * 1000;
  const form = document.getElementById('login-form');
  const userField = document.getElementById('login-user');
  const passwordField = document.getElementById('login-password');
  const eyeButton = document.getElementById('toggle-password');
  const submitButton = document.getElementById('login-submit');
  const errorBox = document.getElementById('login-error');
  const statusBox = document.getElementById('login-status');

  if (!form || !userField || !passwordField || !eyeButton || !submitButton) return;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
    statusBox.textContent = '';
  }

  eyeButton.addEventListener('click', () => {
    const show = passwordField.type === 'password';
    passwordField.type = show ? 'text' : 'password';
    eyeButton.classList.toggle('is-visible', show);
    eyeButton.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    eyeButton.setAttribute('aria-pressed', String(show));
    eyeButton.title = show ? 'Ocultar senha' : 'Mostrar senha';
    passwordField.focus();
  });

  function hexToBytes(hex) {
    if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) throw new Error('Hash ou salt inválido no CSV.');
    return Uint8Array.from(hex.match(/.{2}/g).map(part => parseInt(part, 16)));
  }
  function bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function sameHash(actual, expected) {
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    return difference === 0;
  }
  async function getAccounts() {
    const response = await fetch('./usuarios-teste.csv', { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível carregar o CSV de teste.');
    const lines = (await response.text()).replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    if (lines.shift() !== 'usuario,perfil,salt,hash,iteracoes') throw new Error('Estrutura do CSV de teste incorreta.');
    return lines.map(line => {
      const [usuario, perfil, salt, hash, iterations] = line.trim().split(',');
      if (!usuario || !perfil || !salt || !hash || !iterations) throw new Error('Registro inválido no CSV.');
      return { usuario, perfil, salt, hash, iterations: Number(iterations) };
    });
  }
  async function deriveHash(password, salt, iterations) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('Este teste requer HTTPS para verificar a senha.');
    if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) throw new Error('Parâmetro PBKDF2 inválido.');
    const rawKey = new TextEncoder().encode(password);
    const imported = await crypto.subtle.importKey('raw', rawKey, 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(salt), iterations, hash: 'SHA-256' }, imported, 256);
    return bytesToHex(derived);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const usuario = userField.value.trim().toLowerCase();
    const senha = passwordField.value;
    showError('');
    if (!usuario || !senha) {
      showError('Informe o usuário e a senha para continuar.');
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = 'Verificando acesso…';
    statusBox.textContent = 'Conferindo usuário e senha no arquivo de teste…';
    try {
      const accounts = await getAccounts();
      const account = accounts.find(item => item.usuario === usuario && item.perfil === 'Administrador');
      let valid = false;
      if (account) {
        const calculated = await deriveHash(senha, account.salt, account.iterations);
        valid = sameHash(calculated, account.hash);
      }
      if (!valid) {
        passwordField.value = '';
        showError('Usuário ou senha incorretos. Confira os dados e tente novamente.');
        passwordField.focus();
        return;
      }
      const now = Date.now();
      sessionStorage.setItem(KEY, JSON.stringify({
        version: 1,
        usuario: account.usuario,
        perfil: account.perfil,
        inicio: now,
        expira: now + MAX_SESSION_MS
      }));
      statusBox.textContent = 'Acesso de teste confirmado. Abrindo o Painel…';
      window.location.replace('./painel.html');
    } catch (error) {
      showError(error.message || 'Não foi possível validar o acesso de teste.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Entrar no Painel';
    }
  });
})();