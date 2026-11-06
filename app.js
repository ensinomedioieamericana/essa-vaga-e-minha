(() => {
'use strict';
const original=window.APP_LINKS;
const ROUTES=['inicio','provas','calendario','notas','biblioteca','recursos','favoritos'];
const normalizeRoute=route=>route==='agenda'?'calendario':route;
// Navegação interna: o calendário precisa ficar disponível mesmo após atualizações do PWA.
const cats={provas:['Provas','▤','q-blue'],agenda:['Datas','▦','q-orange'],notas:['Notas','▥','q-mint'],biblioteca:['Biblioteca','▧','q-lilac'],recursos:['Bernoulli','✧','q-blue'],servicos:['Serviços','⚙','q-orange']};
const views={
 inicio:['COMECE POR AQUI','Tudo para sua aprovação','Escolha uma área e acesse os materiais que você precisa.','Todos os materiais'],
 provas:['TREINE COM PROVAS REAIS','Banco de provas','Acervos e resoluções para praticar.','Provas e resoluções'],
 calendario:['ORGANIZE SEU ANO','Calendário de vestibulares 2027','Consulte diretamente no aplicativo as datas de inscrição, provas e resultados.','Calendário por exame'],
 notas:['PESQUISA HISTÓRICA','Notas de corte','Compare o desempenho exigido nos vestibulares, ano a ano.','Notas por universidade'],
 biblioteca:['AMPLIE SEU REPERTÓRIO','Biblioteca de estudos','Literatura, olimpíadas e recursos complementares.','Materiais da biblioteca'],
 recursos:['APOIO AO ESTUDANTE','Bernoulli e serviços','Gabaritos, tutoriais e serviços úteis.','Recursos de apoio'],
 favoritos:['SEUS MATERIAIS SALVOS','Meus favoritos','Links marcados como favoritos neste dispositivo.','Itens salvos']
};
const $=id=>document.getElementById(id);
const node=(tag,cls,text)=>{let e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
const set=(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
function loadFav(){try{const a=JSON.parse(get('evm-favorites-v1'));return Array.isArray(a)?new Set(a):new Set()}catch{return new Set()}}
const S={links:original.map(x=>({...x})),fav:loadFav(),route:'inicio',search:'',filter:'todos'};
const N={uni:'USP',query:'',sort:'az',onlyFull:false};
let toastTimeout,installPrompt;
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const count=n=>`${n} ${n===1?'recurso':'recursos'}`;
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.remove('show'),3000)}
function go(route){route=normalizeRoute(route);if(!ROUTES.includes(route))return;S.route=route;S.filter='todos';S.search='';$('search').value='';$('clear-search').hidden=true;if(location.hash!=='#/'+route)location.hash='/'+route;render();window.scrollTo({top:0,behavior:'smooth'})}
function shown(){let a=S.links.slice();if(S.search.trim()){let q=normal(S.search.trim());return a.filter(x=>normal([x.title,x.description,x.tag,cats[x.category]?.[0]].join(' ')).includes(q))}if(S.route==='favoritos')return a.filter(x=>S.fav.has(x.id));if(S.route==='recursos')return a.filter(x=>['recursos','servicos'].includes(x.category));if(S.route!=='inicio')return a.filter(x=>x.category===S.route);if(S.filter!=='todos')return a.filter(x=>x.category===S.filter);return a}
function favorite(id){if(S.fav.has(id))S.fav.delete(id);else S.fav.add(id);set('evm-favorites-v1',JSON.stringify([...S.fav]));toast(S.fav.has(id)?'Adicionado aos favoritos.':'Removido dos favoritos.');render()}
function card(item){const [_,symbol,color]=cats[item.category];const box=node('article','resource-card');const top=node('div','resource-top');const ico=node('div','card-icon '+color,symbol);ico.setAttribute('aria-hidden','true');const b=node('button','card-save'+(S.fav.has(item.id)?' saved':''),S.fav.has(item.id)?'♥':'♡');b.type='button';b.title=S.fav.has(item.id)?'Remover dos favoritos':'Adicionar aos favoritos';b.setAttribute('aria-label',b.title);b.addEventListener('click',()=>favorite(item.id));top.append(ico,b);
 const foot=node('div','resource-bottom');const a=node('a','','Abrir material');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Abrir '+item.title+' em uma nova aba');a.append(node('span','','↗'));foot.append(a);
 box.append(top,node('div','card-tag',item.tag),node('h3','',item.title),node('p','',item.description),foot);return box}
function quick(){const q=$('quick-actions');q.replaceChildren();for(const [route,title,sub,icon,color] of [['provas','Provas anteriores','Acesse os acervos','▤','q-blue'],['calendario','Calendário 2027','Datas de inscrições e provas','▦','q-orange'],['notas','Notas de corte','USP • UNESP • UNICAMP','▥','q-mint'],['biblioteca','Biblioteca','Leituras e mais','▧','q-lilac']]){const b=node('button','quick-card');b.type='button';b.dataset.jump=route;let i=node('span','quick-icon '+color,icon);i.setAttribute('aria-hidden','true');let d=node('div');d.append(node('strong','',title),node('small','',sub));b.append(i,d);q.append(b)}}
function filters(){const q=$('category-filter');q.replaceChildren();for(const [key,title] of [['todos','Todos'],['provas','Provas'],['notas','Notas'],['biblioteca','Biblioteca'],['recursos','Bernoulli'],['servicos','Serviços']]){const b=node('button',S.filter===key?'active':'',title);b.type='button';b.addEventListener('click',()=>{S.filter=key;render()});q.append(b)}}
function render(){let cutoff=S.route==='notas',calendar=S.route==='calendario';let search=!cutoff&&!calendar&&!!S.search.trim();let v=search?['RESULTADOS DA BUSCA','Sua pesquisa','Resultados de todas as seções.','Materiais encontrados']:views[S.route];$('hero').hidden=S.route!=='inicio'||search;$('view-kicker').textContent=v[0];$('view-title').textContent=v[1];$('view-description').textContent=v[2];$('results-title').textContent=v[3];$('quick-actions').hidden=S.route!=='inicio'||search;$('cutoff-app').hidden=!cutoff;$('calendar-app').hidden=!calendar;$('results-section').hidden=cutoff||calendar;$('search').closest('.finder').hidden=cutoff||calendar;$('tips').hidden=S.route!=='inicio'||search;$('category-filter').hidden=S.route!=='inicio'||search;if(S.route==='inicio'&&!search){quick();filters()}
if(cutoff){renderCutoffs();const d=getCutoffData();$('total-pill').textContent=d?`${d.carreiras.length} ${N.uni==='USP'?'carreiras':'cursos'}`:'Em preparação';}const a=shown();if(calendar)$('total-pill').textContent=$('calendar-count').textContent;else if(!cutoff)$('total-pill').textContent=count(a.length);$('results-counter').textContent=count(a.length);const grid=$('card-grid');grid.replaceChildren();a.forEach(i=>grid.append(card(i)));$('empty-state').hidden=a.length!==0;
$('empty-state').querySelector('h3').textContent=S.route==='favoritos'&&!search?'Você ainda não salvou materiais':'Nenhum material encontrado';$('empty-state').querySelector('p').textContent=S.route==='favoritos'&&!search?'Use o coração para salvar seus materiais favoritos.':'Experimente outra busca ou escolha uma seção diferente.';
document.querySelectorAll('[data-route]').forEach(b=>{const yes=b.dataset.route===S.route&&!search;b.classList.toggle('active',yes);if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});$('fav-count').textContent=S.fav.size;$('fav-count').hidden=!S.fav.size}
function getCutoffData(){return N.uni==='USP'?window.USP_NOTAS:N.uni==='UNICAMP'?window.UNICAMP_NOTAS:N.uni==='UNESP'?window.UNESP_NOTAS:null}
const orderedYears=d=>[...d.anos].sort((a,b)=>Number(b)-Number(a));
function getCutoffRows(){
 const d=getCutoffData();if(!d)return [];
 let a=d.carreiras.filter(r=>normal(r.curso).includes(normal(N.query)));
 if(N.onlyFull)a=a.filter(r=>d.anos.every(y=>r.notas[y]!==null&&r.notas[y]!==undefined));
 if(N.sort==='2026-desc'||N.sort==='2026-asc')a.sort((a,b)=>{const av=a.notas['2026'],bv=b.notas['2026'];if(av==null&&bv==null)return a.curso.localeCompare(b.curso,'pt-BR');if(av==null)return 1;if(bv==null)return -1;return (N.sort==='2026-desc'?bv-av:av-bv)||a.curso.localeCompare(b.curso,'pt-BR')});
 else a.sort((a,b)=>a.curso.localeCompare(b.curso,'pt-BR'));
 return a;
}
const USP_INFO='<strong>Atenção à comparação entre anos.</strong> A FUVEST alterou códigos e agrupamentos de carreiras. Quando não houve equivalência direta e segura entre uma carreira antiga e outra recente, mantivemos os registros separados, sem completar artificialmente as células vazias. Algumas carreiras reúnem vários cursos ou campi. Estes valores representam o corte da 1ª fase para convocação à 2ª fase, não a classificação final.';
const UNESP_INFO='<strong>Sistema Universal (SU):</strong> em 2025 e 2026 utilizamos somente a coluna SU, sem as notas de SRVEBP e SRVEBP+PPI. A tabela de 2020 a 2024 é uma <strong>compilação fornecida pelo Instituto que não identifica explicitamente a modalidade</strong>, portanto a equivalência com o SU ainda exige confirmação. Diferentes campi e turnos são apresentados separadamente. Alterações na denominação ou no turno sem correspondência segura não foram forçadas em uma única série. São os acertos mínimos da 1ª fase para convocação à 2ª fase, não notas finais de aprovação.';
const UNICAMP_INFO='<strong>Compare com atenção:</strong> em 2020 a primeira fase da UNICAMP tinha <strong>90 questões</strong>; de 2021 a 2026, <strong>72 questões</strong>. Por isso, as notas brutas de 2020 não são diretamente comparáveis às demais. Para 2025 e 2026 foi considerada apenas a coluna <strong>Não Cotistas / PAAIS 0 (sem bônus)</strong>. A tabela histórica enviada para 2020–2024 <strong>não identifica expressamente a modalidade</strong>; confirme-a antes de utilizar esses anos como comparação de ampla concorrência. São acertos para convocação à segunda fase, não notas finais para ingresso.';
function renderCutoffs(){
 document.querySelectorAll('[data-uni]').forEach(b=>{const active=b.dataset.uni===N.uni;b.classList.toggle('selected',active);b.setAttribute('aria-selected',active?'true':'false')});
 const d=getCutoffData(),unicamp=N.uni==='UNICAMP',unesp=N.uni==='UNESP';
 $('cutoff-records').hidden=!d;$('cutoff-other').hidden=!!d;
 if(!d){$('cutoff-other-title').textContent=N.uni;return}
 $('cutoff-kicker').textContent=unicamp?'COMVEST • DADOS HISTÓRICOS':unesp?'UNESP / VUNESP • DADOS HISTÓRICOS':'FUVEST • DADOS HISTÓRICOS';
 $('cutoff-heading').textContent='Notas de corte — '+N.uni;
 $('cutoff-description').innerHTML=unicamp?'Acertos da <strong>1ª fase</strong> para convocação à <strong>2ª fase</strong> • <strong>Não Cotistas / PAAIS 0 (2025–2026)</strong> • 2020–2026':unesp?'Acertos mínimos para convocação à <strong>2ª fase</strong> • <strong>Sistema Universal (SU) verificado em 2025 e 2026</strong> • Histórico 2020–2024 com modalidade não identificada na compilação':'Nota mínima na <strong>1ª fase</strong> para convocação à <strong>2ª fase</strong> • <strong>Ampla Concorrência</strong> • 2020–2026';
 $('cutoff-mark').innerHTML=unicamp?'NC <small>PAAIS 0</small>':unesp?'SU <small>2025–26</small>':'AC <small>somente</small>';
 $('cutoff-course-header').textContent=unicamp?'Curso / turno':unesp?'Curso / cidade / turno':'Carreira / curso';
 $('cutoff-search').placeholder=unesp?'Ex.: Medicina, Franca, Psicologia, Bauru...':unicamp?'Ex.: Medicina, História, Engenharia...':'Ex.: Medicina, Direito, Arquitetura...';
 $('cutoff-full-label').textContent=unicamp||unesp?'Apenas cursos com os sete anos':'Apenas carreiras com os sete anos';
 $('cutoff-legend-missing').textContent=unicamp||unesp?'— : curso ou valor sem correspondência segura no ano':'— : sem informação equivalente nesta carreira / ano';
 $('cutoff-legend-units').textContent=unicamp?'Acertos: 2020 (0–90); 2021–2026 (0–72) • Não são notas finais de ingresso.':unesp?'Acertos na primeira fase (90 questões) • Não são notas finais de ingresso.':'Notas em pontos (0–90) • Não são notas finais de ingresso.';
 $('cutoff-info').innerHTML=unicamp?UNICAMP_INFO:unesp?UNESP_INFO:USP_INFO;
 $('cutoff-sources-usp').hidden=unicamp||unesp;
 $('cutoff-sources-unicamp').hidden=!unicamp;
 $('cutoff-sources-unesp').hidden=!unesp;
 document.querySelector('.cutoff-table-wrap').setAttribute('aria-label',`Tabela de notas de corte da ${N.uni}, com rolagem horizontal`);
 const rows=getCutoffRows(),tbody=$('cutoff-tbody');tbody.replaceChildren();
 for(const r of rows){const tr=document.createElement('tr');const name=node('th','course-col');name.scope='row';name.append(node('span','course-label',r.curso));if(!unicamp){const code=r.codigo2026||r.codigo2025||r.codigoHistorico;if(code)name.append(node('small','course-code',unesp?`Curso VUNESP · ${code} · SU em 2025/26`:`Carreira FUVEST · ${code}`));}
 name.title=r.observacao||'';tr.append(name);
 for(const y of orderedYears(d)){const value=r.notas[y];const td=node('td',(y===2026?'latest-year ':'')+(value==null?'missing':''),value==null?'—':String(value));const max=unicamp?(y===2020?90:72):90;td.setAttribute('aria-label',`${y}: ${value==null?'sem dado':value+' acertos de '+max}`);tr.append(td)}tbody.append(tr)}
 $('cutoff-count').textContent=`${rows.length} ${rows.length===1?(unicamp||unesp?'curso':'carreira'):(unicamp||unesp?'cursos':'carreiras')} exibidos`; $('cutoff-empty').hidden=rows.length!==0;
}
function initCutoffs(){
 document.querySelectorAll('[data-uni]').forEach(b=>b.addEventListener('click',()=>{N.uni=b.dataset.uni;N.query='';N.sort='az';N.onlyFull=false;$('cutoff-search').value='';$('cutoff-sort').value='az';$('cutoff-full').checked=false;renderCutoffs();const d=getCutoffData();$('total-pill').textContent=d?`${d.carreiras.length} ${N.uni==='USP'?'carreiras':'cursos'}`:'Em preparação'}));
 $('cutoff-search').addEventListener('input',e=>{N.query=e.target.value;renderCutoffs()});
 $('cutoff-sort').addEventListener('change',e=>{N.sort=e.target.value;renderCutoffs()});
 $('cutoff-full').addEventListener('change',e=>{N.onlyFull=e.target.checked;renderCutoffs()});
 $('cutoff-export').addEventListener('click',()=>{
  const d=getCutoffData();if(!d)return;
  const years=orderedYears(d);const header=['Curso',...years.map(String)];const rows=[header,...getCutoffRows().map(r=>[r.curso,...years.map(y=>r.notas[y]??'')])];
  const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`notas-de-corte-${N.uni.toLowerCase()}-2020-2026.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
function init(){S.route=(()=>{const r=normalizeRoute(location.hash.replace(/^#\/?/,''));return ROUTES.includes(r)?r:'inicio'})();if(location.hash==='#/agenda'||location.hash==='#agenda')history.replaceState(null,'',location.pathname+location.search+'#/calendario');render();initCutoffs();initCalendar();document.addEventListener('click',e=>{const route=e.target.closest('[data-route],[data-jump]');if(route){if(route.dataset.jump)close('more-dialog');go(route.dataset.route||route.dataset.jump)}const closer=e.target.closest('[data-close]');if(closer)close(closer.dataset.close)});
$('search').addEventListener('input',e=>{S.search=e.target.value;$('clear-search').hidden=!S.search;render()});$('clear-search').addEventListener('click',()=>{$('search').value='';S.search='';$('clear-search').hidden=true;render();$('search').focus()});$('reset-search').addEventListener('click',()=>{S.search='';S.filter='todos';$('search').value='';$('clear-search').hidden=true;render()});
$('top-fav').addEventListener('click',()=>go('favoritos'));$('more-open').addEventListener('click',()=>open('more-dialog'));$('install-open').addEventListener('click',()=>open('install-dialog'));
$('native-install').addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('native-install').hidden=true});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('native-install').hidden=false});window.addEventListener('hashchange',()=>{const raw=location.hash.replace(/^#\/?/,'');const r=normalizeRoute(raw);if(raw!==r)history.replaceState(null,'',location.pathname+location.search+'#/'+r);if(ROUTES.includes(r)&&r!==S.route){S.route=r;S.search='';S.filter='todos';$('search').value='';render()}});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus()}});
if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();
})();
