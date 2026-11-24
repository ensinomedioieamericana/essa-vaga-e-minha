(() => {
'use strict';
const original=window.APP_LINKS;
const ROUTES=['inicio','provas','calendario','olimpiadas','notas','biblioteca'];
const normalizeRoute=route=>route==='agenda'?'calendario':route==='recursos'?'biblioteca':route==='favoritos'?'inicio':route;
// Navegação interna: o calendário precisa ficar disponível mesmo após atualizações do PWA.
const cats={provas:['Provas','▤','q-blue'],agenda:['Datas','▦','q-orange'],notas:['Notas','▥','q-mint'],biblioteca:['Biblioteca e Serviços','▧','q-lilac'],recursos:['Bernoulli','✧','q-blue'],servicos:['Serviços','⚙','q-orange']};
const views={
 inicio:['COMECE POR AQUI','Explore seu caminho para a aprovação','Tudo o que você precisa para estudar está a poucos toques.','Materiais para seus estudos'],
 provas:['TREINE COM PROVAS REAIS','Banco de provas','Acervos e resoluções para praticar.','Provas e resoluções'],
 calendario:['ORGANIZE SEU ANO','Calendário de vestibulares 2027','Consulte diretamente no aplicativo as datas de inscrição, provas e resultados.','Calendário por exame'],
 olimpiadas:['VÁ ALÉM DA SALA DE AULA','Olimpíadas Acadêmicas','Inscrições, fases, formatos e resultados das competições do Instituto.','Calendário olímpico'],
 notas:['PESQUISA HISTÓRICA','Notas de corte','Compare o desempenho exigido nos vestibulares, ano a ano.','Notas por universidade'],
 biblioteca:['ESTUDE E ACESSE SERVIÇOS','Biblioteca e Serviços','Tutoriais, literatura, olimpíadas, gabaritos e serviços úteis do Ensino Médio.','Materiais e serviços']
};
const $=id=>document.getElementById(id);
const node=(tag,cls,text)=>{let e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const S={links:original.map(x=>({...x})),route:'inicio',search:'',filter:'todos'};
// Filtros de consulta na URL, sem cadastro ou personalizacao individual.
const restoredParams=new URLSearchParams(location.search);
const restoredUni=restoredParams.get('nc_uni');
const restoredSort=restoredParams.get('nc_sort');
const N={
 uni:['USP','UNESP','UNICAMP'].includes(restoredUni)?restoredUni:'USP',
 query:(restoredParams.get('nc_busca')||'').slice(0,160),
 sort:restoredSort==='az'||/^\d{4}-(?:asc|desc)$/.test(restoredSort||'')?restoredSort:'az',
 onlyFull:restoredParams.get('nc_completos')==='1'
};
function syncCutoffLocation(){
 if(S.route!=='notas')return;
 const url=new URL(location.href);
 url.searchParams.set('nc_uni',N.uni);
 if(N.query)url.searchParams.set('nc_busca',N.query);else url.searchParams.delete('nc_busca');
 if(N.sort!=='az')url.searchParams.set('nc_sort',N.sort);else url.searchParams.delete('nc_sort');
 if(N.onlyFull)url.searchParams.set('nc_completos','1');else url.searchParams.delete('nc_completos');
 history.replaceState(null,'',url.pathname+url.search+url.hash);
}
let installPrompt;
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const count=n=>`${n} ${n===1?'recurso':'recursos'}`;
function go(route){route=normalizeRoute(route);if(!ROUTES.includes(route))return;S.route=route;S.filter='todos';S.search='';$('search').value='';$('clear-search').hidden=true;if(location.hash!=='#/'+route)location.hash='/'+route;render();syncCutoffLocation();window.scrollTo({top:0,behavior:'smooth'})}
function shown(){let a=S.links.slice();if(S.search.trim()){let q=normal(S.search.trim());return a.filter(x=>normal([x.title,x.description,x.tag,cats[x.category]?.[0]].join(' ')).includes(q))}if(S.route!=='inicio')return a.filter(x=>x.category===S.route);if(S.filter!=='todos')return a.filter(x=>x.category===S.filter);return a}
const PROVA_LOGOS={
 fuvest:{name:'USP',src:'./assets/logo-usp.svg?v=11'},
 enem:{name:'ENEM',src:'./assets/logo-enem.svg'},
 unesp:{name:'UNESP',src:'./assets/logo-unesp.svg'},
 unicamp:{name:'UNICAMP',src:'./assets/logo-unicamp.svg'},
 famerp:{name:'FAMERP',src:'./assets/logo-famerp.png?v=1'},
 famema:{name:'FAMEMA',src:'./assets/logo-famema.png?v=1'},
 einstein:{name:'Albert Einstein',src:'./assets/logo-einstein.png?v=1'},
 'bernoulli-resolve':{name:'Bernoulli Educação',src:'./assets/logo-bernoulli.webp'}
};
function card(item){
 const [_,symbol,color]=cats[item.category],brand=item.category==='provas'?PROVA_LOGOS[item.id]:null;
 const box=node('article','resource-card'+(brand?' prova-institution-card prova-'+item.id:''));
 const top=node('div','resource-top');
 if(brand){
  const logo=node('div','institution-logo');
  logo.append(node('span','institution-logo-fallback',brand.name));
  const img=node('img','institution-logo-image');
  img.src=brand.src;img.alt='Logotipo de '+brand.name;img.loading='lazy';img.decoding='async';
  img.addEventListener('error',()=>{img.remove();logo.classList.add('logo-fallback-active')});
  logo.append(img);top.append(logo);
 }else{
  const ico=node('div','card-icon '+color,symbol);ico.setAttribute('aria-hidden','true');top.append(ico);
 }
 const internalExam=item.category==='provas'&&['fuvest','enem','unesp','unicamp','famerp','famema','einstein'].includes(item.id);
 const foot=node('div','resource-bottom');const a=node('a','',internalExam?'Escolher ano':'Abrir material');
 a.href=item.url;a.target=internalExam?'_self':'_blank';a.rel='noopener noreferrer';
 a.setAttribute('aria-label',internalExam?'Escolher ano e consultar provas de '+item.title:'Abrir '+item.title+' em uma nova aba');a.append(node('span','',internalExam?'→':'↗'));foot.append(a);
 box.append(top,node('div','card-tag',item.tag),node('h3','',item.title),node('p','',item.description),foot);
 return box;
}
function quick(){
 const q=$('quick-actions');q.replaceChildren();
 const icons={
  calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  notas:'<path d="M4 20V10M10 20V5M16 20v-9M22 20V3"/><path d="M2 21h21"/>',
  provas:'<path d="M8 3h8l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3z"/><path d="M8 12h8M8 16h8M16 3v5h5"/>',
  biblioteca:'<path d="M12 6c-2.5-2-5.5-2-9-1v15c3.5-1 6.5-1 9 1 2.5-2 5.5-2 9-1V5c-3.5-1-6.5-1-9 1z"/><path d="M12 6v15"/>',
  olimpiadas:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>'
 };
 const opts=[
  ['calendario','Calendário 2027','Datas e etapas da seleção'],
  ['olimpiadas','Olimpíadas','Competições acadêmicas 2027'],
  ['notas','Notas de corte','Compare os últimos anos'],
  ['provas','Banco de provas','Pratique com provas reais'],
  ['biblioteca','Biblioteca e Serviços','Materiais e serviços úteis']
 ];
 for(const [route,title,description] of opts){
  const button=node('button','quick-card quick-'+route);button.type='button';button.dataset.jump=route;
  const icon=node('span','quick-icon');icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">'+icons[route]+'</svg>';
  const words=node('span','quick-words');words.append(node('strong','',title),node('small','',description));
  const arrow=node('span','quick-arrow','↗');arrow.setAttribute('aria-hidden','true');
  button.append(icon,words,arrow);q.append(button);
 }
}
function filters(){const q=$('category-filter');q.replaceChildren();for(const [key,title] of [['todos','Todos'],['provas','Provas'],['notas','Notas'],['biblioteca','Biblioteca e Serviços']]){const b=node('button',S.filter===key?'active':'',title);b.type='button';b.addEventListener('click',()=>{S.filter=key;render()});q.append(b)}}
const HOME_EVENTS=[
 {date:'2026-11-15',day:'15',month:'NOV',name:'ENEM',detail:'Segundo dia de prova',uni:'enem'},
 {date:'2026-11-22',day:'22',month:'NOV',name:'UNESP',detail:'Primeira fase',uni:'unesp'},
 {date:'2026-11-29',day:'29',month:'NOV',name:'UNICAMP',detail:'Segunda fase • início',uni:'unicamp'},
 {date:'2026-12-02',day:'02',month:'DEZ',name:'UNICAMP',detail:'Habilidades específicas • início',uni:'unicamp'},
 {date:'2026-12-06',day:'06',month:'DEZ',name:'USP',detail:'Segunda fase • início',uni:'usp'},
 {date:'2026-12-13',day:'13',month:'DEZ',name:'UNESP',detail:'Segunda fase • início',uni:'unesp'},
 {date:'2027-01-25',day:'25',month:'JAN',name:'UNICAMP',detail:'Primeira chamada',uni:'unicamp'},
 {date:'2027-01-26',day:'26',month:'JAN',name:'USP',detail:'Primeira chamada',uni:'usp'},
 {date:'2027-01-29',day:'29',month:'JAN',name:'UNESP',detail:'Resultado final',uni:'unesp'}
];
function renderHomeDates(){
 const list=$('home-date-list');if(!list)return;
 list.replaceChildren();
 const today=new Date();today.setHours(0,0,0,0);
 const source=Array.isArray(window.EVM_GESTAO?.events)?window.EVM_GESTAO.events:HOME_EVENTS;
 const next=source.filter(e=>e.date&&new Date(e.date+'T12:00:00')>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
 if(!next.length){list.append(node('p','premium-no-dates','As datas deste calendário já passaram. Consulte o calendário completo para novas informações.'));return}
 for(const event of next){
  const row=node('button','premium-date-row');row.type='button';row.dataset.jump='calendario';row.dataset.calendarFocus=event.uni;
  const date=node('span','premium-date-box');date.append(node('strong','',event.date.slice(8,10)),node('small','',new Date(event.date+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase()));
  const info=node('span','premium-date-copy');info.append(node('strong','',event.name),node('small','',event.detail));
  const arr=node('span','premium-date-arrow','›');arr.setAttribute('aria-hidden','true');
  row.append(date,info,arr);list.append(row);
 }
}


// Carrossel de novidades: 5 segundos por notícia, navegação manual e pausa ao interagir.
const NOVIDADES_INTERVAL=5000;
let novidadesIndex=0,novidadesCards=[],novidadesTimer=null,novidadesHover=false,novidadesFocus=false;
function pararRotacaoNovidades(){
 if(novidadesTimer!==null){window.clearInterval(novidadesTimer);novidadesTimer=null}
}
function noticiasVisiveis(){
 return S.route==='inicio'&&!S.search.trim()&&!document.hidden&&!$('novidades-section').hidden;
}
function iniciarRotacaoNovidades(){
 pararRotacaoNovidades();
 if(novidadesCards.length<2||!noticiasVisiveis()||novidadesHover||novidadesFocus)return;
 if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 novidadesTimer=window.setInterval(()=>{
  if(!noticiasVisiveis()){pararRotacaoNovidades();return}
  atualizarNovidade(novidadesIndex+1,false);
 },NOVIDADES_INTERVAL);
}
function atualizarNovidade(index,restart=true){
 const total=novidadesCards.length;if(!total)return;
 novidadesIndex=((index%total)+total)%total;
 novidadesCards.forEach((card,i)=>{
  const active=i===novidadesIndex;
  card.hidden=!active;card.setAttribute('aria-hidden',String(!active));card.tabIndex=active?0:-1;
 });
 $('novidades-counter').textContent=(novidadesIndex+1)+' de '+total;
 $('novidades-dots').querySelectorAll('[data-novidade-index]').forEach((dot,i)=>{
  const selected=i===novidadesIndex;
  dot.classList.toggle('active',selected);
  if(selected)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');
 });
 if(restart)iniciarRotacaoNovidades();
}
function urlDiretaNovidade(value){
 if(typeof value!=='string')return '';
 const url=value.trim();
 if(/^\.\/acervo\.html\?[a-z0-9_=%&-]+$/i.test(url))return url;
 if(/^https:\/\/[a-z0-9.-]+(?:[/?#][^\s]*)?$/i.test(url))return url;
 return '';
}
function renderNovidades(){
 const section=$('novidades-section'),list=$('novidades-list'),dots=$('novidades-dots');
 if(!section||!list||!dots)return;
 pararRotacaoNovidades();
 const notices=Array.isArray(window.EVM_NOVIDADES)
  ?window.EVM_NOVIDADES.filter(x=>x&&x.title&&ROUTES.includes(normalizeRoute(x.route)))
  :[];
 list.replaceChildren();dots.replaceChildren();novidadesCards=[];
 if(!notices.length){section.hidden=true;$('novidades-footer').hidden=true;return}
 section.hidden=false;
 notices.forEach((notice,i)=>{
  const direct=urlDiretaNovidade(notice.url);
  const b=node(direct?'a':'button','novidade-card'+(notice.featured?' novidade-featured':''));
  if(direct){
   b.href=direct;
   if(direct.startsWith('https://')){b.target='_blank';b.rel='noopener noreferrer'}
  }else{
   b.type='button';b.dataset.jump=normalizeRoute(notice.route);
   if(notice.university)b.dataset.cutoffFocus=notice.university;
  }
  b.setAttribute('aria-label',(notice.label||'Novidade')+' '+notice.title+'. '+(notice.action||'Saiba mais'));
  const icon=node('span','novidade-icon');icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a2 2 0 0 0 2 2h2l2 5h3l-2-5 8-3V7l-8 3H5a2 2 0 0 0-2 1z"/><path d="M18 6v8M21 9v3"/></svg>';
  const body=node('span','novidade-content');
  const meta=node('span','novidade-meta');
  meta.append(node('span','novidade-label',notice.label||'NOVIDADE'),node('time','novidade-date',notice.date||''));
  const headline=node('strong','novidade-title',notice.title);
  const desc=node('span','novidade-description',notice.description||'');
  const cta=node('span','novidade-cta',notice.action||'Saiba mais');
  const arrow=node('span','novidade-arrow','↗');arrow.setAttribute('aria-hidden','true');cta.append(arrow);
  body.append(meta,headline,desc,cta);b.append(icon,body);list.append(b);
  novidadesCards.push(b);
  if(notices.length>1){
   const dot=node('button','novidades-dot');dot.type='button';dot.dataset.novidadeIndex=String(i);
   dot.setAttribute('aria-label','Mostrar novidade '+(i+1)+': '+notice.title);
   dots.append(dot);
  }
 });
 const multiple=notices.length>1;
 $('novidades-carousel').classList.toggle('is-single',!multiple);
 $('novidades-prev').hidden=!multiple;$('novidades-next').hidden=!multiple;
 $('novidades-footer').hidden=!multiple;
 atualizarNovidade(Math.min(novidadesIndex,notices.length-1));
}
function iniciarControlesNovidades(){
 const section=$('novidades-section');
 $('novidades-prev').addEventListener('click',()=>atualizarNovidade(novidadesIndex-1));
 $('novidades-next').addEventListener('click',()=>atualizarNovidade(novidadesIndex+1));
 $('novidades-dots').addEventListener('click',e=>{
  const dot=e.target.closest('[data-novidade-index]');
  if(dot)atualizarNovidade(Number(dot.dataset.novidadeIndex));
 });
 section.addEventListener('mouseenter',()=>{novidadesHover=true;pararRotacaoNovidades()});
 section.addEventListener('mouseleave',()=>{novidadesHover=false;iniciarRotacaoNovidades()});
 section.addEventListener('focusin',()=>{novidadesFocus=true;pararRotacaoNovidades()});
 section.addEventListener('focusout',e=>{
  if(!section.contains(e.relatedTarget)){novidadesFocus=false;iniciarRotacaoNovidades()}
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)pararRotacaoNovidades();else iniciarRotacaoNovidades();
 });
}

/* Conteúdo administrado via painel.html; as regras de acesso continuam no GitHub. */
function applyGestao(){
 const g=window.EVM_GESTAO;
 if(!g||g.version!==1)return;
 if(Array.isArray(g.notices))window.EVM_NOVIDADES=g.notices;
 if(g.notes&&typeof g.notes==='object'){
  if(g.notes.USP)window.USP_NOTAS=g.notes.USP;
  if(g.notes.UNESP)window.UNESP_NOTAS=g.notes.UNESP;
  if(g.notes.UNICAMP)window.UNICAMP_NOTAS=g.notes.UNICAMP;
 }
 if(!Array.isArray(g.calendar))return;
 const grid=document.querySelector('.calendar-grid');
 if(!grid)return;
 grid.replaceChildren();
 for(const entry of [...g.calendar].sort((a,b)=>String(a.sortDate||'9999').localeCompare(String(b.sortDate||'9999')))){
  if(!['unicamp','usp','enem','unesp'].includes(entry.id))continue;
  const card=node('article','calendar-card calendar-'+entry.id);
  card.dataset.calendarInstitution=entry.id;
  const head=node('div','calendar-card-head'),identity=node('div');
  identity.append(node('span','calendar-card-kind',entry.kind||''),node('h4','',entry.name||entry.id.toUpperCase()));
  const mark=node('span','calendar-card-mark'),logo=node('img','calendar-card-logo');
  logo.src=entry.logo||'';logo.alt='Logotipo da '+(entry.name||entry.id);logo.loading='lazy';logo.decoding='async';
  mark.append(logo);head.append(identity,mark);
  const dl=node('dl','calendar-details');
  for(const line of entry.details||[]){
   const row=node('div'),dt=node('dt','',line.label||''),dd=node('dd');
   if(line.principal)dd.append(node('strong','',line.text||''));else dd.textContent=line.text||'';
   row.append(dt,dd);dl.append(row);
  }
  const notes=node('div','calendar-card-notes');
  notes.append(node('strong','',entry.noteTitle||'Outras informações'));
  for(const note of entry.notes||[]){
   const p=node('p'),textValue=String(note||'');
   const colon=textValue.indexOf(':');
   if(colon>=0&&colon<55){
    p.append(document.createTextNode(textValue.slice(0,colon+1)+' '));
    p.append(node('b','',textValue.slice(colon+1).trim()));
   }else p.textContent=textValue;
   notes.append(p);
  }
  card.append(head,dl,notes);grid.append(card);
 }
 const countLabel=grid.children.length+' calendários';
 const countEl=$('calendar-count');if(countEl)countEl.textContent=countLabel;
}

function render(){let cutoff=S.route==='notas',calendar=S.route==='calendario',olympiad=S.route==='olimpiadas';let search=!cutoff&&!calendar&&!olympiad&&!!S.search.trim();let v=search?['RESULTADOS DA BUSCA','Sua pesquisa','Resultados de todas as seções.','Materiais encontrados']:views[S.route];$('hero').hidden=S.route!=='inicio'||search;$('novidades-section').hidden=S.route!=='inicio'||search;$('view-kicker').textContent=v[0];$('view-title').textContent=v[1];$('view-description').textContent=v[2];$('results-title').textContent=v[3];$('quick-actions').hidden=S.route!=='inicio'||search;$('home-showcase').hidden=S.route!=='inicio'||search;$('cutoff-app').hidden=!cutoff;$('calendar-app').hidden=!calendar;$('olympiad-app').hidden=!olympiad;$('results-section').hidden=cutoff||calendar||olympiad;$('search').closest('.finder').hidden=cutoff||calendar||olympiad;$('tips').hidden=S.route!=='inicio'||search;$('category-filter').hidden=S.route!=='inicio'||search;$('library-tutorials').hidden=S.route!=='biblioteca'||search;if(S.route==='inicio'&&!search){renderNovidades();quick();filters();renderHomeDates()}else{pararRotacaoNovidades()}
if(cutoff){renderCutoffs();const d=getCutoffData();$('total-pill').textContent=d?`${d.carreiras.length} ${N.uni==='USP'?'carreiras':'cursos'}`:'Em preparação';}if(olympiad)window.EVM_OLIMPIADAS_UI?.render();const a=shown();if(calendar)$('total-pill').textContent=$('calendar-count').textContent;else if(!cutoff&&!olympiad)$('total-pill').textContent=count(a.length+(S.route==='biblioteca'&&!search?3:0));$('results-counter').textContent=count(a.length);const grid=$('card-grid');grid.replaceChildren();a.forEach(i=>grid.append(card(i)));$('empty-state').hidden=a.length!==0;
$('empty-state').querySelector('h3').textContent='Nenhum material encontrado';$('empty-state').querySelector('p').textContent='Experimente outra busca ou escolha uma seção diferente.';
document.querySelectorAll('[data-route]').forEach(b=>{const yes=b.dataset.route===S.route&&!search;b.classList.toggle('active',yes);if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
}
function getCutoffData(){return N.uni==='USP'?window.USP_NOTAS:N.uni==='UNICAMP'?window.UNICAMP_NOTAS:N.uni==='UNESP'?window.UNESP_NOTAS:null}
const orderedYears=d=>[...d.anos].sort((a,b)=>Number(b)-Number(a));
function getCutoffRows(){
 const d=getCutoffData();if(!d)return [];
 let a=d.carreiras.filter(r=>normal(r.curso).includes(normal(N.query)));
 if(N.onlyFull)a=a.filter(r=>d.anos.every(y=>r.notas[y]!==null&&r.notas[y]!==undefined));
 const scoreSort=N.sort.match(/^(\d{4})-(asc|desc)$/);
 if(scoreSort)a.sort((a,b)=>{const year=scoreSort[1],direction=scoreSort[2];const av=a.notas[year],bv=b.notas[year];if(av==null&&bv==null)return a.curso.localeCompare(b.curso,'pt-BR');if(av==null)return 1;if(bv==null)return -1;return (direction==='desc'?bv-av:av-bv)||a.curso.localeCompare(b.curso,'pt-BR')});
 else a.sort((a,b)=>a.curso.localeCompare(b.curso,'pt-BR'));
 return a;
}
const USP_INFO='<strong>Atenção à comparação entre anos.</strong> A FUVEST alterou códigos e agrupamentos de carreiras. Quando não houve equivalência direta e segura entre uma carreira antiga e outra recente, mantivemos os registros separados, sem completar artificialmente as células vazias. Algumas carreiras reúnem vários cursos ou campi. Estes valores representam o corte da 1ª fase para convocação à 2ª fase, não a classificação final.';
const UNESP_INFO='<strong>Sistema Universal (SU):</strong> em 2025 e 2026 utilizamos somente a coluna SU, sem as notas de SRVEBP e SRVEBP+PPI. A tabela de 2020 a 2024 é uma <strong>compilação fornecida pelo Instituto que não identifica explicitamente a modalidade</strong>, portanto a equivalência com o SU ainda exige confirmação. Diferentes campi e turnos são apresentados separadamente. Alterações na denominação ou no turno sem correspondência segura não foram forçadas em uma única série. São os acertos mínimos da 1ª fase para convocação à 2ª fase, não notas finais de aprovação.';
const UNICAMP_INFO='<strong>Compare com atenção:</strong> em 2020 a primeira fase da UNICAMP tinha <strong>90 questões</strong>; de 2021 a 2027, <strong>72 questões</strong>. Por isso, as notas brutas de 2020 não são diretamente comparáveis às demais. Para 2025, 2026 e 2027 foi considerada apenas a coluna <strong>Não Cotistas / PAAIS 0 (sem bônus)</strong>. A tabela histórica enviada para 2020–2024 <strong>não identifica expressamente a modalidade</strong>; confirme-a antes de utilizar esses anos como comparação de ampla concorrência. São acertos para convocação à segunda fase, não notas finais para ingresso.';
function renderCutoffs(){
 document.querySelectorAll('[data-uni]').forEach(b=>{const active=b.dataset.uni===N.uni;b.classList.toggle('selected',active);b.setAttribute('aria-selected',active?'true':'false')});
 const d=getCutoffData(),unicamp=N.uni==='UNICAMP',unesp=N.uni==='UNESP';
 $('cutoff-records').hidden=!d;$('cutoff-other').hidden=!!d;
 $('cutoff-exam-change').hidden=!(d&&N.uni==='USP'&&d.anos.includes(2027));
 if(!d){$('cutoff-other-title').textContent=N.uni;return}
 $('cutoff-kicker').textContent=unicamp?'COMVEST • DADOS HISTÓRICOS':unesp?'UNESP / VUNESP • DADOS HISTÓRICOS':'FUVEST • DADOS HISTÓRICOS';
 $('cutoff-heading').textContent='Notas de corte — '+N.uni;
 const latestYear=Math.max(...d.anos);
 const updateBadge=$('cutoff-update');updateBadge.hidden=!(unicamp||(N.uni==='USP'&&latestYear>=2027));
 if(!updateBadge.hidden)updateBadge.textContent='Atualização '+latestYear;
 const yearsDisplay=Math.min(...d.anos)+'–'+latestYear;
 const description=$('cutoff-description');
 description.innerHTML=description.innerHTML.replace(/2020–20\d\d/g,yearsDisplay);
 const sortSelect=$('cutoff-sort');
 for(const direction of ['desc','asc']){
  const option=sortSelect.querySelector('option[value$="-'+direction+'"]');
  if(option){option.value=latestYear+'-'+direction;option.textContent=(direction==='desc'?'Maior':'Menor')+' nota em '+latestYear}
 }
 const heading=document.querySelector('.cutoff-table thead tr');
 heading.querySelectorAll('th:not(.course-col)').forEach(th=>th.remove());
 for(const year of orderedYears(d)){
  const th=document.createElement('th');th.scope='col';th.textContent=N.uni==='USP'&&year===2027?'2027 (80q)':String(year);
  if(N.uni==='USP'){const total=d.denominador?.[year]??90;th.title=`FUVEST ${year}: primeira fase com ${total} questões`;th.setAttribute('aria-label',`${year}, prova de ${total} questões`)}
  if(year===latestYear)th.classList.add('latest-year');heading.append(th);
 }
 $('cutoff-description').innerHTML=unicamp?'Acertos da <strong>1ª fase</strong> para convocação à <strong>2ª fase</strong> • <strong>Não Cotistas / PAAIS 0 (2025–2027)</strong> • 2020–2027':unesp?'Acertos mínimos para convocação à <strong>2ª fase</strong> • <strong>Sistema Universal (SU) verificado em 2025 e 2026</strong> • Histórico 2020–2024 com modalidade não identificada na compilação':'Nota mínima na <strong>1ª fase</strong> para convocação à <strong>2ª fase</strong> • <strong>Ampla Concorrência</strong> • '+yearsDisplay;
 $('cutoff-mark').innerHTML=unicamp?'NC <small>PAAIS 0</small>':unesp?'SU <small>2025–26</small>':'AC <small>somente</small>';
 $('cutoff-course-header').textContent=unicamp?'Curso / turno':unesp?'Curso / cidade / turno':'Carreira / curso';
 $('cutoff-search').placeholder=unesp?'Ex.: Medicina, Franca, Psicologia, Bauru...':unicamp?'Ex.: Medicina, História, Engenharia...':'Ex.: Medicina, Direito, Arquitetura...';
 $('cutoff-full-label').textContent=(unicamp||unesp?'Apenas cursos':'Apenas carreiras')+' com todos os '+d.anos.length+' anos';
 $('cutoff-legend-missing').textContent=unicamp||unesp?'— : curso ou valor sem correspondência segura no ano':'— : sem informação equivalente nesta carreira / ano';
 $('cutoff-legend-units').textContent=unicamp?'Acertos: 2020 (0–90); 2021–2027 (0–72) • Não são notas finais de ingresso.':unesp?'Acertos na primeira fase (90 questões) • Não são notas finais de ingresso.':'FUVEST 2020–2026: 90 questões • FUVEST 2027: 80 questões • Acertos absolutos não são diretamente comparáveis.';
 if(latestYear>2027)$('cutoff-legend-units').textContent='Acertos da 1ª fase: o total de questões pode variar conforme o ano. Confira o valor correspondente a cada célula • Não são notas finais de ingresso.';
 $('cutoff-info').innerHTML=unicamp?UNICAMP_INFO:unesp?UNESP_INFO:USP_INFO;
 $('cutoff-sources-usp').hidden=unicamp||unesp;
 $('cutoff-sources-unicamp').hidden=!unicamp;
 $('cutoff-sources-unesp').hidden=!unesp;
 document.querySelector('.cutoff-table-wrap').setAttribute('aria-label',`Tabela de notas de corte da ${N.uni}, com rolagem horizontal`);
 const rows=getCutoffRows(),tbody=$('cutoff-tbody');tbody.replaceChildren();
 for(const r of rows){const tr=document.createElement('tr');const name=node('th','course-col');name.scope='row';name.append(node('span','course-label',r.curso));if(!unicamp){const code=r.codigo2027||r.codigo2026||r.codigo2025||r.codigoHistorico;if(code)name.append(node('small','course-code',unesp?`Curso VUNESP · ${code} · SU em 2025/26`:`Carreira FUVEST · ${code}`));}
 name.title=r.observacao||'';tr.append(name);
 for(const y of orderedYears(d)){const value=r.notas[y];const td=node('td',(y===latestYear?'latest-year ':'')+(value==null?'missing':''),value==null?'—':String(value));const max=d.denominador?.[y]??(unicamp?(y===2020?90:72):90);td.setAttribute('aria-label',`${y}: ${value==null?'sem dado':value+' acertos de '+max}`);tr.append(td)}tbody.append(tr)}
 $('cutoff-count').textContent=`${rows.length} ${rows.length===1?(unicamp||unesp?'curso':'carreira'):(unicamp||unesp?'cursos':'carreiras')} exibidos`; $('cutoff-empty').hidden=rows.length!==0;
}
function initCutoffs(){
 document.querySelectorAll('[data-uni]').forEach(b=>b.addEventListener('click',()=>{N.uni=b.dataset.uni;N.query='';N.sort='az';N.onlyFull=false;$('cutoff-search').value='';$('cutoff-sort').value='az';$('cutoff-full').checked=false;renderCutoffs();syncCutoffLocation();const d=getCutoffData();$('total-pill').textContent=d?`${d.carreiras.length} ${N.uni==='USP'?'carreiras':'cursos'}`:'Em preparação'}));
 $('cutoff-search').addEventListener('input',e=>{N.query=e.target.value.slice(0,160);renderCutoffs();syncCutoffLocation()});
 $('cutoff-sort').addEventListener('change',e=>{N.sort=e.target.value;renderCutoffs();syncCutoffLocation()});
 $('cutoff-full').addEventListener('change',e=>{N.onlyFull=e.target.checked;renderCutoffs();syncCutoffLocation()});
 $('cutoff-export').addEventListener('click',()=>{
  const d=getCutoffData();if(!d)return;
  const years=orderedYears(d);const header=['Curso',...years.map(String)];const rows=[header,...getCutoffRows().map(r=>[r.curso,...years.map(y=>r.notas[y]??'')])];
  const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`notas-de-corte-${N.uni.toLowerCase()}-${Math.min(...d.anos)}-${Math.max(...d.anos)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
const open=id=>{if(!$(id).open)$(id).showModal()};const close=id=>{if($(id).open)$(id).close()};

function initCalendar(){
 const buttons=[...document.querySelectorAll('[data-calendar-filter]')];
 const cards=[...document.querySelectorAll('[data-calendar-institution]')];
 buttons.forEach(b=>b.addEventListener('click',()=>{
  const value=b.dataset.calendarFilter;
  buttons.forEach(x=>{const active=x===b;x.classList.toggle('selected',active);x.setAttribute('aria-pressed',active?'true':'false')});
  let visible=0;
  cards.forEach(card=>{const show=value==='todos'||card.dataset.calendarInstitution===value;card.hidden=!show;if(show)visible++});
  const label=visible===1?'1 calendário':visible+' calendários';
  $('calendar-count').textContent=label;
  if(S.route==='calendario')$('total-pill').textContent=label;
 }));
}
function init(){applyGestao();iniciarControlesNovidades();window.EVM_OLIMPIADAS_UI?.init();S.route=(()=>{const r=normalizeRoute(location.hash.replace(/^#\/?/,''));return ROUTES.includes(r)?r:'inicio'})();if(['#/agenda','#agenda','#/recursos','#recursos','#/favoritos','#favoritos'].includes(location.hash))history.replaceState(null,'',location.pathname+location.search+'#/'+S.route);$('cutoff-search').value=N.query;$('cutoff-full').checked=N.onlyFull;render();$('cutoff-sort').value=N.sort;if(!$('cutoff-sort').value){N.sort='az';$('cutoff-sort').value='az'}initCutoffs();initCalendar();document.addEventListener('click',e=>{const route=e.target.closest('[data-route],[data-jump]');if(route){
  if(route.dataset.jump)close('more-dialog');
  const focus=route.dataset.cutoffFocus;
  if(focus&&['USP','UNESP','UNICAMP'].includes(focus)){
   N.uni=focus;N.query='';N.sort='az';N.onlyFull=false;
   $('cutoff-search').value='';$('cutoff-sort').value='az';$('cutoff-full').checked=false;
  }
  go(route.dataset.route||route.dataset.jump);
  if(route.dataset.calendarFocus){const chosen=document.querySelector('[data-calendar-filter="'+route.dataset.calendarFocus+'"]');if(chosen)chosen.click()}
 }const closer=e.target.closest('[data-close]');if(closer)close(closer.dataset.close)});
$('search').addEventListener('input',e=>{S.search=e.target.value;$('clear-search').hidden=!S.search;render()});$('clear-search').addEventListener('click',()=>{$('search').value='';S.search='';$('clear-search').hidden=true;render();$('search').focus()});$('reset-search').addEventListener('click',()=>{S.search='';S.filter='todos';$('search').value='';$('clear-search').hidden=true;render()});
$('more-open').addEventListener('click',()=>open('more-dialog'));$('install-open').addEventListener('click',()=>open('install-dialog'));
$('native-install').addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('native-install').hidden=true});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('native-install').hidden=false});window.addEventListener('hashchange',()=>{const raw=location.hash.replace(/^#\/?/,'');const r=normalizeRoute(raw);if(raw!==r)history.replaceState(null,'',location.pathname+location.search+'#/'+r);if(ROUTES.includes(r)&&r!==S.route){S.route=r;S.search='';S.filter='todos';$('search').value='';render()}});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus()}});
if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js?v=43').catch(()=>{});
}
init();
})();
