/* Gestão demonstrativa da senha coletiva dos alunos.
 * Apenas administradores do login de teste enxergam esta aba.
 * A escrita no GitHub exige token com Contents: read/write.
 * O arquivo guarda PBKDF2 + salt, nunca a senha em texto aberto.
 * Acesso dos alunos NÃO está ativado; autenticação real requer servidor. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const KEY = 'evm-painel-sessao-teste-v1';
  const PATH = 'acesso-alunos.json';
  const API = 'https://api.github.com/repos/ensinomedioieamericana/essa-vaga-e-minha/contents/' + PATH;
  const ITERATIONS = 210000;
  const MAX_SESSION = 2 * 60 * 60 * 1000;
  const tab = document.querySelector('[data-tab="acesso"]');
  const form = $('student-password-form');
  const newInput = $('student-password');
  const confirmInput = $('student-password-confirm');
  const toggle = $('student-password-visibility');
  const save = $('student-password-publish');
  const currentStatus = $('student-access-status');
  const updated = $('student-access-updated');
  const feedback = $('student-access-message');
  const dialog = $('student-password-dialog');
  const tokenForm = $('student-password-token-form');
  const tokenInput = $('student-password-token');
  const tokenError = $('student-password-token-error');
  const tokenSubmit = $('student-password-token-submit');

  if (!tab || !form || !dialog) return;

  function getAdmin() {
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY));
      const now = Date.now();
      if (s?.version === 1 &&
          (s.usuario === 'ricardo_admin' || s.usuario === 'felipe_admin') &&
          s.perfil === 'Administrador' &&
          Number.isFinite(s.inicio) && Number.isFinite(s.expira) &&
          s.inicio <= now && s.expira > now &&
          s.expira - s.inicio <= MAX_SESSION) return s;
    } catch (_) {}
    return null;
  }

  // Esta checagem é apenas visual. A verificação real da escrita fica no GitHub.
  if (!getAdmin()) {
    tab.hidden = true;
    return;
  }

  let loadedConfig = null;

  function message(value, error = false) {
    feedback.textContent = value;
    feedback.classList.toggle('error', error);
    feedback.classList.toggle('ok', !error && !!value);
  }
  function validConfig(value) {
    return value && value.version === 1 &&
      value.purpose === 'senha-coletiva-alunos' &&
      value.algorithm === 'PBKDF2-SHA256' &&
      value.iterations === ITERATIONS &&
      value.student_login_enabled === false &&
      typeof value.configured === 'boolean' &&
      (value.hash == null || /^[a-f0-9]{64}$/i.test(value.hash)) &&
      (value.salt == null || /^[a-f0-9]{32}$/i.test(value.salt));
  }
  function showConfig(conf) {
    currentStatus.textContent = conf.configured ?
      'Senha coletiva cadastrada no GitHub' :
      'Nenhuma senha coletiva cadastrada ainda';
    if (conf.updated_at) {
      const date = new Date(conf.updated_at);
      const dateText = Number.isNaN(date.getTime()) ? 'data não disponível' :
        date.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
      updated.textContent = 'Última alteração: ' + dateText +
        (conf.updated_by ? ' · por ' + conf.updated_by : '');
    } else {
      updated.textContent = 'A senha dos alunos ainda não foi definida.';
    }
  }

  async function loadConfig() {
    save.disabled = true;
    currentStatus.textContent = 'Consultando configuração no GitHub…';
    updated.textContent = '';
    try {
      const response = await fetch('./' + PATH + '?v=' + Date.now(), {cache:'no-store'});
      if (!response.ok) throw new Error('Arquivo de configuração ainda não disponível nesta publicação.');
      const data = await response.json();
      if (!validConfig(data)) throw new Error('Formato da configuração incompatível. Consulte o responsável pelo aplicativo.');
      loadedConfig = data;
      showConfig(data);
      save.disabled = false;
      message('');
    } catch (error) {
      loadedConfig = null;
      currentStatus.textContent = 'Não foi possível carregar a configuração';
      message(error.message || 'Falha ao consultar configuração.', true);
    }
  }

  toggle.addEventListener('click', () => {
    const reveal = newInput.type === 'password';
    newInput.type = confirmInput.type = reveal ? 'text' : 'password';
    toggle.textContent = reveal ? '🙈 Ocultar senhas' : '👁 Mostrar senhas';
    toggle.setAttribute('aria-pressed', String(reveal));
    toggle.setAttribute('aria-label', reveal ? 'Ocultar senhas' : 'Mostrar senhas');
  });

  function checkPassword() {
    if (!getAdmin()) return 'Sua sessão do Painel expirou. Entre novamente.';
    if (!loadedConfig) return 'Aguarde o carregamento da configuração.';
    const value = newInput.value;
    if (value.length < 10 || value.length > 100)
      return 'Escolha uma senha de 10 a 100 caracteres.';
    if (value.trim() !== value)
      return 'Retire espaços no início ou no final da senha.';
    if (value !== confirmInput.value)
      return 'A confirmação não corresponde à nova senha.';
    return '';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const error = checkPassword();
    if (error) { message(error, true); return; }
    tokenError.textContent = '';
    tokenInput.value = '';
    message('');
    dialog.showModal();
    tokenInput.focus();
  });

  function closeDialog() {
    tokenInput.value = '';
    tokenError.textContent = '';
    if (dialog.open) dialog.close();
  }
  $('student-password-token-cancel').addEventListener('click', closeDialog);
  dialog.addEventListener('close', () => {
    tokenInput.value = '';
    tokenError.textContent = '';
  });

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let result = '';
    for (let i = 0; i < bytes.length; i += 8192)
      result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(result);
  }
  function decodeBase64(text) {
    const raw = atob(text.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(raw, char => char.charCodeAt(0)));
  }
  function toHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function derive(password, salt) {
    if (!crypto?.subtle) throw new Error('Este recurso exige um endereço HTTPS.');
    const baseKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits({
      name:'PBKDF2', hash:'SHA-256', salt, iterations:ITERATIONS
    }, baseKey, 256);
    return toHex(new Uint8Array(bits));
  }

  tokenForm.addEventListener('submit', async event => {
    event.preventDefault();
    tokenError.textContent = '';
    const token = tokenInput.value.trim();
    const admin = getAdmin();
    if (!admin) {
      tokenError.textContent = 'Sua sessão expirou. Entre no Painel novamente.';
      return;
    }
    if (token.length < 15) {
      tokenError.textContent = 'Informe um token GitHub válido, não a senha de login.';
      return;
    }
    const error = checkPassword();
    if (error) { tokenError.textContent = error; return; }
    tokenSubmit.disabled = true;
    tokenSubmit.textContent = 'Publicando…';
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Authorization': 'Bearer ' + token
    };
    try {
      const response = await fetch(API + '?ref=main', {headers,cache:'no-store'});
      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          throw new Error('Token sem permissão de escrita no repositório.');
        throw new Error('Falha ao consultar configuração remota (HTTP ' + response.status + ').');
      }
      const remote = await response.json();
      if (!remote.sha || !remote.content)
        throw new Error('O GitHub não retornou a versão remota da configuração.');
      const latest = JSON.parse(decodeBase64(remote.content));
      if (!validConfig(latest)) throw new Error('Configuração remota incompatível.');
      if (JSON.stringify(latest) !== JSON.stringify(loadedConfig)) {
        throw new Error('Outro administrador alterou a configuração depois que você abriu esta tela. Recarregue antes de publicar.');
      }

      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const nextConfig = {
        version:1,
        purpose:'senha-coletiva-alunos',
        configured:true,
        student_login_enabled:false,
        algorithm:'PBKDF2-SHA256',
        iterations:ITERATIONS,
        salt:toHex(saltBytes),
        hash:await derive(newInput.value,saltBytes),
        updated_at:new Date().toISOString(),
        updated_by:admin.usuario
      };

      const put = await fetch(API, {
        method:'PUT',
        headers:{...headers, 'Content-Type':'application/json'},
        body:JSON.stringify({
          message:'Atualizar senha coletiva de acesso dos alunos pelo Painel',
          content:encodeBase64(JSON.stringify(nextConfig,null,2) + '\n'),
          sha:remote.sha,
          branch:'main'
        })
      });
      if (!put.ok) {
        if (put.status === 401 || put.status === 403)
          throw new Error('Token sem acesso Contents: Read and write.');
        if (put.status === 409 || put.status === 422)
          throw new Error('Outra edição foi publicada durante esta operação. Recarregue a página.');
        throw new Error('O GitHub recusou a publicação (HTTP ' + put.status + ').');
      }
      const result = await put.json();
      if (!result.commit?.sha)
        throw new Error('O GitHub não confirmou a atualização. Confira o histórico de commits.');
      loadedConfig = nextConfig;
      showConfig(nextConfig);
      newInput.value = '';
      confirmInput.value = '';
      newInput.type = confirmInput.type = 'password';
      toggle.textContent = '👁 Mostrar senhas';
      toggle.setAttribute('aria-pressed','false');
      closeDialog();
      message('Nova senha coletiva cadastrada no GitHub. O acesso dos alunos ainda não está bloqueado: a tela de login dos alunos será criada em outra etapa.');
    } catch (failure) {
      tokenError.textContent = failure.message || 'Não foi possível concluir a publicação.';
      message('Publicação não confirmada. Nenhuma alteração local foi aplicada.', true);
    } finally {
      tokenInput.value = '';
      tokenSubmit.disabled = false;
      tokenSubmit.textContent = 'Confirmar alteração';
    }
  });

  loadConfig();
})();