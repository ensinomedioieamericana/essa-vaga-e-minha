/* Recupera exclusivamente a posicao de leitura apos revalidar a senha.
   Dados temporarios em sessionStorage; sem cadastro ou dados individuais. */
(() => {
  'use strict';
  const KEY = 'evm-retorno-rolagem-v1';
  window.addEventListener('load', () => {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(KEY));
      sessionStorage.removeItem(KEY);
    } catch (_) {}
    if (!saved || saved.path !== location.pathname ||
        saved.search !== location.search || saved.hash !== location.hash ||
        !Number.isFinite(saved.scrollY) || saved.scrollY < 0 ||
        !Number.isFinite(saved.capturedAt) ||
        Date.now() - saved.capturedAt > 60 * 60 * 1000 ||
        saved.capturedAt > Date.now()) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo({top:saved.scrollY,behavior:'instant'});
    }));
  }, {once:true});
})();