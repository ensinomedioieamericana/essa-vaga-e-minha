/* Editor visual local para gestao-dados.js.
   Esta página NÃO possui permissão de escrita; somente uma conta GitHub autorizada pode publicar. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const DRAFT_KEY='evm-gestao-rascunho-v1';
let base=clone(window.EVM_GESTAO||{});
const sourceNotes={USP:window.USP_NOTAS,UNESP:window.UNESP_NOTAS,UNICAMP:window.UNICAMP_NOTAS};
const institutions=['unicamp','usp','enem','unesp'];
const names={unicamp:'UNICAMP',usp:'USP',enem:'ENEM',unesp:'UNESP'};
const routes=['notas','calendario','provas','biblioteca','inicio','favoritos'];
const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
let state=clone(base),calendarUni='unicamp',noteUni='UNICAMP',noteYear=null,notesSearch='';
let draftFound=false;
try{const saved=JSON.parse(localStorage.getItem(DRAFT_KEY));if(saved&&saved.version===1){state=saved;draftFound=true}}catch{}
if(!state.calendar||!Array.isArray(state.events)||!Array.isArray(state.notices)||!state.notes){
 alert('Os dados de gestão ainda não estão disponíveis. Recarregue esta página.');return;
}
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x}
function opt(value,title){const x=el('option','',title);x.value=value;return x}
function field(label,value,attrs={}){
 const lab=el('label','field');lab.append(el('span','',label));
 const input=el(attrs.tag||'input');
 if(attrs.type)input.type=attrs.type;
 if(attrs.maxLength)input.maxLength=attrs.maxLength;
 input.value=value==null?'':value;
 if(attrs.placeholder)input.placeholder=attrs.placeholder;
 lab.append(input);return {lab,input};
}
function status(msg,error=false){const x=$('publish-result');x.textContent=msg;x.className=error?'error':'ok'}
function markDirty(){
 try{localStorage.setItem(DRAFT_KEY,JSON.stringify(state))}catch{}
 const x=$('save-status');x.textContent='Rascunho salvo neste navegador • ainda não publicado';x.classList.add('dirty');
}
function selectedTab(name){
 document.querySelectorAll('.tab').forEach(b=>{
  const active=b.dataset.tab===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));
 });
 for(const nameKey of ['calendario','notas','novidades','acervo'])$('tab-'+nameKey).hidden=nameKey!==name;
 $('publish').hidden=name==='acervo';
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>selectedTab(b.dataset.tab)));

// CALENDÁRIO
const calendarSelect=$('calendar-uni');
for(const id of institutions)calendarSelect.append(opt(id,names[id]));
calendarSelect.addEventListener('change',()=>{calendarUni=calendarSelect.value;renderCalendar()});
function calendarRecord(){return state.calendar.find(x=>x.id===calendarUni)}
function renderCalendar(){
 const record=calendarRecord();if(!record)return;
 $('cal-sort').value=record.sortDate||'';
 $('cal-note-title').value=record.noteTitle||'';
 $('cal-notes').value=(record.notes||[]).join('\n');
 const list=$('calendar-details');list.replaceChildren();
 (record.details||[]).forEach((detail,index)=>{
  const row=el('div','calendar-detail-row');
  const name=el('input');name.value=detail.label||'';name.placeholder='Nome da etapa';name.setAttribute('aria-label','Nome da etapa '+(index+1));
  const value=el('input');value.value=detail.text||'';value.placeholder='Data ou descrição';value.setAttribute('aria-label','Valor da etapa '+(index+1));
  const label=el('label');const checked=el('input');checked.type='checkbox';checked.checked=!!detail.principal;label.append(checked,el('span','','Destaque'));
  name.addEventListener('input',()=>{detail.label=name.value;markDirty()});
  value.addEventListener('input',()=>{detail.text=value.value;markDirty()});
  checked.addEventListener('change',()=>{detail.principal=checked.checked;markDirty()});
  row.append(name,value,label);list.append(row);
 });
}
$('cal-sort').addEventListener('change',()=>{calendarRecord().sortDate=$('cal-sort').value;markDirty()});
$('cal-note-title').addEventListener('input',()=>{calendarRecord().noteTitle=$('cal-note-title').value;markDirty()});
$('cal-notes').addEventListener('input',()=>{
 calendarRecord().notes=$('cal-notes').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);markDirty()
});
function renderEvents(){
 const list=$('event-list');list.replaceChildren();
 state.events.forEach((entry,i)=>{
  const row=el('div','event-row');
  const date=el('input');date.type='date';date.value=entry.date||'';date.dataset.eventField='date';date.setAttribute('aria-label','Data do evento '+(i+1));
  const uni=el('select');uni.setAttribute('aria-label','Instituição do evento '+(i+1));
  for(const id of institutions)uni.append(opt(id,names[id]));
  uni.value=entry.uni||'unicamp';
  const detail=el('input');detail.value=entry.detail||'';detail.placeholder='Ex.: 1ª fase';detail.dataset.eventField='detail';detail.setAttribute('aria-label','Descrição do evento '+(i+1));
  const del=el('button','delete-btn','×');del.type='button';del.title='Excluir evento';del.setAttribute('aria-label','Excluir evento '+(i+1));
  date.addEventListener('change',()=>{entry.date=date.value;markDirty()});
  uni.addEventListener('change',()=>{entry.uni=uni.value;entry.name=names[uni.value];markDirty()});
  detail.addEventListener('input',()=>{entry.detail=detail.value;markDirty()});
  del.addEventListener('click',()=>{state.events.splice(i,1);markDirty();renderEvents()});
  row.append(date,uni,detail,del);list.append(row);
 });
}
$('add-event').addEventListener('click',()=>{state.events.push({date:'',name:'UNICAMP',detail:'',uni:'unicamp'});markDirty();renderEvents()});

// NOTAS DE CORTE
function currentNotes(){return state.notes[noteUni]||sourceNotes[noteUni]}
function editableNotes(){if(!state.notes[noteUni])state.notes[noteUni]=clone(sourceNotes[noteUni]);return state.notes[noteUni]}
function selectedYear(){return Number($('notes-year').value)||noteYear}
function denominator(d,year){
 if(d.denominador?.[year]!=null)return Number(d.denominador[year]);
 return noteUni==='UNICAMP'?(Number(year)===2020?90:72):90;
}
function renderYears(preferred){
 const d=currentNotes();
 const years=[...new Set(d.anos.map(Number))].sort((a,b)=>b-a);
 const sel=$('notes-year');sel.replaceChildren();
 years.forEach(y=>sel.append(opt(String(y),String(y))));
 const n=years.includes(Number(preferred))?Number(preferred):years[0];
 noteYear=n;sel.value=String(n);
 renderNoteMeta();renderNoteRows();
}
function renderNoteMeta(){
 const d=currentNotes(),year=selectedYear();
 $('notes-max').value=denominator(d,year);
 $('notes-source').value=String(d.fontes?.[year]||'');
 $('note-year-heading').textContent='Acertos '+year;
}
$('notes-uni').addEventListener('change',()=>{noteUni=$('notes-uni').value;notesSearch='';$('notes-search').value='';renderYears()});
$('notes-year').addEventListener('change',()=>{noteYear=selectedYear();renderNoteMeta();renderNoteRows()});
$('notes-add-year-btn').addEventListener('click',()=>{
 const year=Number($('notes-add-year').value),d=currentNotes();
 if(!Number.isInteger(year)||year<2020||year>2100){status('Informe um ano válido entre 2020 e 2100.',true);return}
 if(d.anos.includes(year)){renderYears(year);status('Esse ano já estava cadastrado.');return}
 const n=editableNotes();n.anos.push(year);n.anos.sort((a,b)=>a-b);
 for(const c of n.carreiras)c.notas[year]=null;
 if(!n.denominador)n.denominador={};
 // O total é configurável na tela; é preciso conferi-lo no documento oficial.
 n.denominador[year]=denominator(d,Math.max(...d.anos));
 if(!n.fontes)n.fontes={};
 n.fontes[year]='';
 markDirty();renderYears(year);$('notes-add-year').value='';
 status('Ano '+year+' adicionado ao rascunho. Confira o total de questões, a fonte e a modalidade antes de importar notas.');
});
$('notes-max').addEventListener('change',()=>{
 const n=Number($('notes-max').value);
 if(!Number.isInteger(n)||n<1||n>200){status('O total de questões deve estar entre 1 e 200.',true);renderNoteMeta();return}
 const d=editableNotes();if(!d.denominador)d.denominador={};
 d.denominador[selectedYear()]=n;markDirty();renderNoteRows();
});
$('notes-source').addEventListener('input',()=>{
 const d=editableNotes();if(!d.fontes)d.fontes={};
 d.fontes[selectedYear()]=$('notes-source').value;markDirty();
});
$('notes-search').addEventListener('input',()=>{notesSearch=$('notes-search').value;renderNoteRows()});
function renderNoteRows(){
 const d=currentNotes(),year=selectedYear(),max=denominator(d,year),list=$('notes-tbody');
 list.replaceChildren();
 const matching=d.carreiras.map((x,i)=>({x,i})).filter(({x})=>normalize(x.curso).includes(normalize(notesSearch)));
 for(const {x,i} of matching){
  const tr=el('tr'),name=el('td'),v=el('td');
  name.append(el('strong','',x.curso));
  const input=el('input');input.type='number';input.min=0;input.max=max;input.step=1;
  input.value=x.notas?.[year]==null?'':String(x.notas[year]);
  input.setAttribute('aria-label',year+' — '+x.curso);
  input.addEventListener('change',()=>{
   const num=input.value.trim()===''?null:Number(input.value);
   if(num!==null&&(!Number.isInteger(num)||num<0||num>denominator(currentNotes(),year))){
    status('Nota inválida para '+x.curso+'. Use um valor inteiro de 0 a '+max+'.',true);
    input.value=x.notas?.[year]==null?'':String(x.notas[year]);return;
   }
   const notes=editableNotes();notes.carreiras[i].notas[year]=num;markDirty();
  });
  v.append(input);tr.append(name,v);list.append(tr);
 }
 $('notes-count').textContent=matching.length+' de '+d.carreiras.length+' cursos';
}
$('notes-add-course-btn').addEventListener('click',()=>{
 const name=$('notes-add-course').value.trim();
 if(name.length<3){status('Digite o nome completo do curso.',true);return}
 if(currentNotes().carreiras.some(c=>normalize(c.curso)===normalize(name))){status('Esse curso já está na lista.',true);return}
 const d=editableNotes();const notas=Object.fromEntries(d.anos.map(y=>[y,null]));
 d.carreiras.push({id:'editor-'+noteUni.toLowerCase()+'-'+normalize(name),curso:name,notas,observacao:'Curso acrescentado pelo Painel do Desenvolvedor; verificar equivalência histórica.'});
 $('notes-add-course').value='';notesSearch=name;$('notes-search').value=name;
 markDirty();renderNoteRows();status('Curso adicionado. Preencha a nota correspondente ao ano selecionado.');
});
$('notes-file').addEventListener('change',async()=>{
 const file=$('notes-file').files[0];if(!file)return;
 if(file.size>2*1024*1024){status('Arquivo muito grande. Utilize um CSV de até 2 MB.',true);return}
 try{$('notes-csv').value=(await file.text()).replace(/^\uFEFF/,'');status('CSV carregado. Clique em “Aplicar dados da lista” para importar.')}catch{status('Não foi possível ler o arquivo.',true)}
});
function parseCSVRow(line){
 const sep=line.includes(';')?';':line.includes('\t')?'\t':',';
 const cells=[];let out='',quoted=false;
 for(let i=0;i<line.length;i++){
  const ch=line[i];
  if(ch==='"'&&line[i+1]==='"'&&quoted){out+='"';i++;continue}
  if(ch==='"'){quoted=!quoted;continue}
  if(ch===sep&&!quoted){cells.push(out.trim());out='';continue}
  out+=ch;
 }
 cells.push(out.trim());
 return cells;
}
$('notes-import').addEventListener('click',()=>{
 const text=$('notes-csv').value.replace(/^\uFEFF/,'');
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const max=denominator(currentNotes(),selectedYear());
 const imported=[],unknown=[],invalid=[],seen=new Set();
 for(const line of lines){
  const cells=parseCSVRow(line);const title=cells[0]?.trim(),raw=cells[1]?.trim();
  if(!title||!raw){invalid.push(line);continue}
  if(normalize(title)==='curso'&&(/^(nota|[12][0-9]{3})/i.test(raw)))continue;
  const value=Number(raw);
  if(!Number.isInteger(value)||value<0||value>max){invalid.push(title+': '+raw);continue}
  const key=normalize(title);
  if(seen.has(key)){invalid.push('Curso repetido: '+title);continue}
  seen.add(key);imported.push({title,key,value});
 }
 if(invalid.length){status('Importação cancelada: revise '+invalid.length+' linha(s), por exemplo: '+invalid.slice(0,3).join(' | '),true);return}
 if(!imported.length){status('Nenhuma nota válida encontrada. Use o formato Curso;Acertos.',true);return}
 const d=currentNotes(),keys=new Set(d.carreiras.map(x=>normalize(x.curso)));
 imported.forEach(x=>{if(!keys.has(x.key))unknown.push(x)});
 if(unknown.length&&!$('notes-create-missing').checked){
  status('Importação cancelada: '+unknown.length+' curso(s) não correspondem ao histórico: '+unknown.slice(0,6).map(x=>x.title).join(', ')+'. Corrija os nomes ou marque a opção de cadastrar cursos novos.',true);
  return;
 }
 if(!confirm('Importar '+imported.length+' notas de '+selectedYear()+' para '+noteUni+'? Os demais anos serão preservados.'))return;
 const current=editableNotes(),lookup=new Map(current.carreiras.map(x=>[normalize(x.curso),x]));
 for(const r of imported){
  let c=lookup.get(r.key);
  if(!c){
   const notas=Object.fromEntries(current.anos.map(y=>[y,null]));
   c={id:'editor-'+noteUni.toLowerCase()+'-'+r.key,curso:r.title,notas,observacao:'Curso incluído pelo Painel do Desenvolvedor; confirmar equivalência histórica.'};
   current.carreiras.push(c);lookup.set(r.key,c);
  }
  c.notas[selectedYear()]=r.value;
 }
 markDirty();renderNoteRows();
 status('Importados '+imported.length+' registros de '+noteUni+' '+selectedYear()+'. '+unknown.length+' curso(s) novos. Confira os valores antes de publicar.');
});

// NOVIDADES
function renderNews(){
 const list=$('news-list');list.replaceChildren();
 state.notices.forEach((n,i)=>{
  const entry=el('article','news-entry');
  const head=el('div','news-entry-head');head.append(el('strong','',n.title||'Novo comunicado'));
  const actions=el('div','news-entry-actions');
  for(const [symbol,dir] of [['↑',-1],['↓',1]]){
   const btn=el('button','order-btn',symbol);btn.type='button';btn.disabled=i+dir<0||i+dir>=state.notices.length;
   btn.title=dir===-1?'Mover para cima':'Mover para baixo';
   btn.addEventListener('click',()=>{const other=state.notices[i+dir];state.notices[i+dir]=state.notices[i];state.notices[i]=other;markDirty();renderNews()});
   actions.append(btn);
  }
  const del=el('button','delete-btn','×');del.type='button';del.title='Excluir novidade';
  del.addEventListener('click',()=>{if(!confirm('Excluir esta novidade do rascunho?'))return;state.notices.splice(i,1);markDirty();renderNews()});
  actions.append(del);head.append(actions);
  const grid=el('div','news-form');
  const fields=[
   ['label','Chamada / selo','JÁ SAIU!'],['date','Data da publicação (dd/mm/aaaa)','12/11/2026'],
   ['title','Título da novidade','NOTAS DE CORTE DA UNICAMP 2027'],['action','Texto do botão','Clique aqui e confira'],
   ['description','Descrição','Texto do comunicado']
  ];
  for(const [key,label,placeholder] of fields){
   const f=field(label,n[key]||'',{placeholder,tag:key==='description'?'textarea':'input'});
   if(key==='description')f.lab.classList.add('wide');
   f.input.addEventListener('input',()=>{n[key]=f.input.value;markDirty();if(key==='title')head.firstChild.textContent=f.input.value||'Novo comunicado'});
   grid.append(f.lab);
  }
  const route=el('label','field');route.append(el('span','','Destino do botão'));
  const routeSel=el('select');
  for(const r of routes)routeSel.append(opt(r,({notas:'Notas de corte',calendario:'Calendário',provas:'Banco de provas',biblioteca:'Biblioteca e Serviços',inicio:'Página inicial',favoritos:'Favoritos'})[r]));
  routeSel.value=n.route==='recursos'?'biblioteca':(n.route||'notas');
  routeSel.addEventListener('change',()=>{n.route=routeSel.value;markDirty()});route.append(routeSel);grid.append(route);
  const uni=el('label','field');uni.append(el('span','','Universidade (quando destino é Notas)'));
  const uniSel=el('select');uniSel.append(opt('','Não selecionar automaticamente'));
  for(const u of ['UNICAMP','USP','UNESP'])uniSel.append(opt(u,u));
  uniSel.value=n.university||'';
  uniSel.addEventListener('change',()=>{n.university=uniSel.value;markDirty()});uni.append(uniSel);grid.append(uni);
  const featured=el('label','check-field');const check=el('input');check.type='checkbox';check.checked=!!n.featured;
  check.addEventListener('change',()=>{n.featured=check.checked;markDirty()});
  featured.append(check,el('span','','Dar destaque a este aviso'));grid.append(featured);
  entry.append(head,grid);list.append(entry);
 });
 if(!state.notices.length)list.append(el('p','field-help','Nenhum aviso cadastrado. Clique em “+ Nova novidade” para começar.'));
}
$('news-add').addEventListener('click',()=>{
 state.notices.unshift({id:'aviso-'+Date.now(),label:'NOVIDADE',date:'',title:'',description:'',action:'Saiba mais',route:'notas',university:'',featured:false});
 markDirty();renderNews();
});

// PUBLICAÇÃO
function validate(){
 if(state.version!==1||state.calendar.length!==4)return 'Os quatro calendários precisam estar cadastrados.';
 const ids=state.calendar.map(x=>x.id);
 if(institutions.some(id=>!ids.includes(id))||new Set(ids).size!==4)return 'Há instituições ausentes ou duplicadas no calendário.';
 for(const c of state.calendar){
  if(!/^\d{4}-\d\d-\d\d$/.test(c.sortDate||''))return 'Informe a primeira data de prova de '+c.name+'.';
  for(const detail of c.details||[])if(!detail.label?.trim()||!detail.text?.trim())return 'Complete todas as etapas do calendário da '+c.name+'.';
 }
 for(const e of state.events)if(!/^\d{4}-\d\d-\d\d$/.test(e.date||'')||!institutions.includes(e.uni)||!e.detail?.trim())return 'Complete as datas e descrições de todos os eventos da página inicial.';
 for(const n of state.notices)if(!n.title?.trim()||!routes.includes(n.route))return 'Complete o título e o destino dos comunicados.';
 for(const [uni,data] of Object.entries(state.notes)){
  if(!sourceNotes[uni]||!Array.isArray(data.carreiras)||!Array.isArray(data.anos))return 'Dados inválidos de '+uni;
  const years=new Set(data.anos.map(Number));
  if(years.size!==data.anos.length)return 'Anos repetidos nas notas de '+uni;
  for(const course of data.carreiras){
   if(!course.curso?.trim())return 'Há um curso sem nome em '+uni;
   for(const y of years){
    const v=course.notas?.[y],max=data.denominador?.[y]??(uni==='UNICAMP'?(y===2020?90:72):90);
    if(v!=null&&(!Number.isInteger(v)||v<0||v>Number(max)))return 'Valor fora do limite em '+course.curso+' ('+y+').';
   }
  }
 }
 return '';
}
function publishedFile(){
 return '/* Dados públicos editados no Painel do Desenvolvedor. Nunca incluir senhas, RAs ou dados pessoais. */\nwindow.EVM_GESTAO = '+JSON.stringify(state,null,2)+';\n';
}
function encodeContent(source){
 const bytes=new TextEncoder().encode(source);
 let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
function decodeContent(content){
 const binary=atob(content.replace(/\s/g,''));
 const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
 return new TextDecoder().decode(bytes);
}
function parsePublishedData(content){
 const match=content.match(/window\.EVM_GESTAO\s*=\s*(\{[\s\S]*\})\s*;\s*$/);
 if(!match)throw new Error('O arquivo remoto não está no formato esperado.');
 const parsed=JSON.parse(match[1]);
 if(parsed?.version!==1)throw new Error('A versão remota dos dados não é compatível.');
 return parsed;
}
const directDialog=$('publish-dialog'),tokenInput=$('github-token');
function closeAuth(){tokenInput.value='';$('auth-error').textContent='';directDialog.close()}
$('publish-direct').addEventListener('click',()=>{
 const error=validate();
 if(error){status('Não foi possível publicar: '+error,true);return}
 if(JSON.stringify(state)===JSON.stringify(base)){status('Não há alterações novas para publicar.');return}
 $('auth-error').textContent='';
 tokenInput.value='';
 directDialog.showModal();
 tokenInput.focus();
});
$('auth-cancel').addEventListener('click',closeAuth);
directDialog.addEventListener('close',()=>{tokenInput.value='';$('auth-error').textContent=''});
$('publish-form').addEventListener('submit',async e=>{
 e.preventDefault();
 const token=tokenInput.value.trim();
 const btn=$('auth-submit');
 if(!token||token.length<15){$('auth-error').textContent='Informe um token de acesso válido, não sua senha.';return}
 btn.disabled=true;btn.textContent='Publicando...';
 $('auth-error').textContent='';
 const endpoint='https://api.github.com/repos/ensinomedioieamericana/essa-vaga-e-minha/contents/gestao-dados.js';
 const headers={'Accept':'application/vnd.github+json','Authorization':'Bearer '+token};
 try{
  const res=await fetch(endpoint+'?ref=main',{headers,cache:'no-store'});
  if(!res.ok){
   if(res.status===401||res.status===403)throw new Error('A autorização foi recusada. Confira as permissões do token.');
   if(res.status===404)throw new Error('Arquivo ou repositório indisponível para este token. Confira o repositório selecionado.');
   throw new Error('Não foi possível consultar o GitHub (erro '+res.status+').');
  }
  const remote=await res.json();
  if(!remote.sha||!remote.content)throw new Error('O GitHub não retornou os dados necessários para a publicação.');
  const latest=parsePublishedData(decodeContent(remote.content));
  if(JSON.stringify(latest)!==JSON.stringify(base))throw new Error('O conteúdo foi atualizado no GitHub depois que você abriu o painel. Copie seu rascunho, recarregue a página e revise antes de publicar, para não sobrescrever outra atualização.');
  const put=await fetch(endpoint,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({
   message:'Atualiza Calendário, Notas de Corte e Novidades pelo Painel do Desenvolvedor',
   content:encodeContent(publishedFile()),sha:remote.sha,branch:'main'
  })});
  if(!put.ok){
   if(put.status===401||put.status===403)throw new Error('O token não tem permissão de escrita neste repositório. Verifique Contents: Read and write.');
   if(put.status===409||put.status===422)throw new Error('Houve um conflito ou rejeição da atualização. Recarregue o painel antes de tentar novamente.');
   throw new Error('O GitHub não aceitou a publicação (erro '+put.status+').');
  }
  const response=await put.json();
  if(!response.commit?.sha)throw new Error('O GitHub não confirmou o commit. Confira o histórico do repositório.');
  base=clone(state);
  try{localStorage.removeItem(DRAFT_KEY)}catch{}
  $('save-status').textContent='Alterações enviadas ao GitHub';$('save-status').classList.remove('dirty');
  closeAuth();
  status('Alterações salvas no GitHub! O aplicativo será atualizado quando a publicação do GitHub Pages terminar.');
 }catch(err){
  $('auth-error').textContent=err.message||'Falha ao publicar. Nenhuma confirmação recebida do GitHub.';
  status('Publicação não confirmada. Seu rascunho continua salvo neste navegador.',true);
 }finally{
  // Não persistimos o token em memória para outras publicações.
  tokenInput.value='';
  btn.disabled=false;btn.textContent='Confirmar e publicar';
 }
});
$('download').addEventListener('click',()=>{
 const err=validate();if(err){status('Não foi possível gerar o arquivo: '+err,true);return}
 const file=publishedFile();
 const url=URL.createObjectURL(new Blob([file],{type:'text/javascript;charset=utf-8'}));
 const a=el('a');a.href=url;a.download='gestao-dados.js';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 status('Arquivo gestao-dados.js gerado. Próximo passo: enviá-lo ao GitHub por sua conta autorizada. O download sozinho não publica as mudanças.');
});
$('discard').addEventListener('click',()=>{
 if(!confirm('Descartar as alterações deste navegador e voltar aos dados publicados?'))return;
 try{localStorage.removeItem(DRAFT_KEY)}catch{}
 state=clone(base);calendarUni='unicamp';noteUni='UNICAMP';noteYear=null;
 calendarSelect.value=calendarUni;$('notes-uni').value=noteUni;$('notes-search').value='';
 renderCalendar();renderEvents();renderYears();renderNews();
 $('save-status').textContent='Conteúdo publicado carregado';$('save-status').classList.remove('dirty');
 status('Rascunho local descartado. Dados da versão publicada restaurados.');
});
renderCalendar();renderEvents();renderYears();renderNews();
if(draftFound){$('save-status').textContent='Rascunho anterior recuperado deste navegador';$('save-status').classList.add('dirty')}
})();