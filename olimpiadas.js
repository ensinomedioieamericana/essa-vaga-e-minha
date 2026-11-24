/* Tabela pública de Olimpíadas Acadêmicas — dados editáveis em gestao-dados.js. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const el = (tag,cls,text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const two = n => String(n).padStart(2,'0');
const localToday = () => {const d=new Date();return d.getFullYear()+'-'+two(d.getMonth()+1)+'-'+two(d.getDate())};
const day = s => /^\d{4}-\d{2}-\d{2}$/.test(s||'') ? s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4) : '';
const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const validHttps = value => typeof value==='string' && /^https:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(value);
const labels={abertas:'Inscrições abertas',futuras:'Em breve',encerradas:'Inscrições encerradas','a-confirmar':'A confirmar'};
const statusNames={'a-confirmar':'A confirmar',aguardando:'Aguardando divulgação',divulgado:'Divulgado'};
function records(){return Array.isArray(window.EVM_GESTAO?.olympiads)?window.EVM_GESTAO.olympiads.filter(x=>x&&x.name):[]}
function registrationState(entry,today){
 const start=entry.registrationStart||'',end=entry.registrationEnd||'';
 if(!day(start)||!day(end))return 'a-confirmar';
 return today<start?'futuras':today<=end?'abertas':'encerradas';
}
function upcoming(entry,today){
 const dates=(entry.phases||[]).map(p=>p.date).filter(d=>day(d));
 const future=dates.filter(d=>d>=today).sort();
 return future[0]||null;
}
function ordering(a,b,today){
 const upcomingA=upcoming(a,today),upcomingB=upcoming(b,today);
 if(upcomingA&&upcomingB)return upcomingA.localeCompare(upcomingB)||a.name.localeCompare(b.name,'pt-BR');
 if(upcomingA)return -1;if(upcomingB)return 1;
 const anyA=(a.phases||[]).map(p=>p.date).filter(d=>day(d)).sort()[0];
 const anyB=(b.phases||[]).map(p=>p.date).filter(d=>day(d)).sort()[0];
 if(anyA&&!anyB)return -1;if(anyB&&!anyA)return 1;
 if(anyA&&anyB)return anyB.localeCompare(anyA);
 return a.name.localeCompare(b.name,'pt-BR');
}
function put(parent,tag,cls,txt){const x=el(tag,cls,txt);parent.append(x);return x}
function safeLink(parent,label,href,cls){
 if(!validHttps(href))return false;
 const a=put(parent,'a',cls,label+' ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';return true;
}
// Cartões expansíveis para celular, com as mesmas informações da tabela.
function mobileField(parent,label){
 const item=put(parent,'div','olympiad-mobile-field');
 put(item,'strong','olympiad-mobile-field-label',label);
 return put(item,'div','olympiad-mobile-field-value');
}
function mobileCard(entry,today){
 const status=registrationState(entry,today);
 const details=el('details','olympiad-mobile-card');
 const summary=put(details,'summary','olympiad-mobile-summary');
 const heading=put(summary,'span','olympiad-mobile-heading');
 put(heading,'strong','olympiad-mobile-title',entry.name);
 put(heading,'span','olympiad-mobile-area',entry.area||'Área a confirmar');
 const meta=put(summary,'span','olympiad-mobile-meta');
 put(meta,'span','olympiad-reg-state olympiad-reg-'+status,labels[status]);
 const arrow=put(meta,'span','olympiad-mobile-chevron','⌄');
 arrow.setAttribute('aria-hidden','true');

 const body=put(details,'div','olympiad-mobile-body');
 const phases=mobileField(body,'Etapas e datas');
 if(!Array.isArray(entry.phases)||entry.phases.length===0){
  put(phases,'span','olympiad-muted','A confirmar');
 }else{
  for(const phase of entry.phases){
   const row=put(phases,'div','olympiad-phase');
   put(row,'strong','',phase.label||'Etapa');
   put(row,'span','',day(phase.date)||'Data a confirmar');
  }
 }
 const format=mobileField(body,'Formato');
 put(format,'span','',entry.format?.trim()||'A confirmar');

 const registrations=mobileField(body,'Período de inscrições');
 put(registrations,'span','olympiad-reg-state olympiad-reg-'+status,labels[status]);
 const start=day(entry.registrationStart),end=day(entry.registrationEnd);
 put(registrations,'span','olympiad-muted',
  start&&end?start+' a '+end:start?'A partir de '+start:end?'Até '+end:'Período a confirmar');

 const enroll=mobileField(body,'Como participar');
 if(entry.registrationMode==='coordenacao'){
  put(enroll,'span','olympiad-coordination','Inscreva-se na Coordenação');
 }else if(entry.registrationMode==='link'){
  if(!safeLink(enroll,'Inscrever-se',entry.registrationUrl,'olympiad-action'))
   put(enroll,'span','olympiad-muted','Link a confirmar');
 }else put(enroll,'span','olympiad-muted','Procedimento a confirmar');

 const result=mobileField(body,'Resultado');
 put(result,'span','olympiad-result-state',statusNames[entry.resultStatus]||'A confirmar');
 if(day(entry.resultDate))put(result,'span','olympiad-muted',day(entry.resultDate));
 if(entry.resultStatus==='divulgado')
  safeLink(result,'Ver resultado',entry.resultUrl,'olympiad-result-link');

 // Uma olimpíada aberta por vez, mantendo o restante da lista compacto.
 details.addEventListener('toggle',()=>{
  if(!details.open)return;
  for(const other of details.parentElement?.querySelectorAll('details[open]')||[]){
   if(other!==details)other.open=false;
  }
 });
 return details;
}
function render(){
 const data=records();
 const today=localToday();
 const selectedArea=$('olympiad-area').value;
 const filter=$('olympiad-status').value;
 const search=norm($('olympiad-search').value.trim());
 const selected=data.filter(entry=>{
  if(selectedArea!=='todas'&&entry.area!==selectedArea)return false;
  if(filter!=='todas'&&registrationState(entry,today)!==filter)return false;
  return !search||norm([entry.name,entry.area,entry.format].join(' ')).includes(search);
 }).sort((a,b)=>ordering(a,b,today));
 const tbody=$('olympiad-tbody'),mobile=$('olympiad-mobile-list');
 tbody.replaceChildren();mobile.replaceChildren();
 for(const entry of selected){
  const tr=el('tr');
  const name=put(tr,'td','olympiad-name');
  put(name,'strong','',entry.name);
  put(name,'span','olympiad-area-tag',entry.area||'Área a confirmar');

  const phases=put(tr,'td','olympiad-dates');
  if(!Array.isArray(entry.phases)||entry.phases.length===0){
   put(phases,'span','olympiad-muted','A confirmar');
  }else{
   for(const phase of entry.phases){
    const row=put(phases,'div','olympiad-phase');
    put(row,'strong','',phase.label||'Etapa');
    put(row,'span','',day(phase.date)||'Data a confirmar');
   }
  }

  const format=put(tr,'td','olympiad-format');
  put(format,'span','',entry.format?.trim()||'A confirmar');

  const dates=put(tr,'td','olympiad-registration');
  const start=day(entry.registrationStart),end=day(entry.registrationEnd);
  const status=registrationState(entry,today);
  put(dates,'span','olympiad-reg-state olympiad-reg-'+status,labels[status]);
  put(dates,'span','olympiad-muted',start&&end?start+' a '+end:start?'A partir de '+start:end?'Até '+end:'Período a confirmar');

  const enroll=put(tr,'td','olympiad-enrollment');
  if(entry.registrationMode==='coordenacao'){
   put(enroll,'span','olympiad-coordination','Inscreva-se na Coordenação');
  }else if(entry.registrationMode==='link'){
   if(!safeLink(enroll,'Inscrever-se',entry.registrationUrl,'olympiad-action'))put(enroll,'span','olympiad-muted','Link a confirmar');
  }else put(enroll,'span','olympiad-muted','Procedimento a confirmar');

  const result=put(tr,'td','olympiad-result');
  put(result,'span','olympiad-result-state',statusNames[entry.resultStatus]||'A confirmar');
  if(day(entry.resultDate))put(result,'span','olympiad-muted',day(entry.resultDate));
  if(entry.resultStatus==='divulgado')safeLink(result,'Ver resultado',entry.resultUrl,'olympiad-result-link');
  tbody.append(tr);
  mobile.append(mobileCard(entry,today));
 }
 $('olympiad-count').textContent=selected.length+' de '+data.length+' olimpíadas';
 $('olympiad-empty').hidden=selected.length>0;
 $('olympiad-year').textContent=String(window.EVM_GESTAO?.olympiadYear||2027);
 $('total-pill').textContent=data.length+' olimpíadas';
}
function init(){
 const area=$('olympiad-area'),statuses=$('olympiad-status');
 if(!area||!statuses)return;
 const previous=area.value||'todas',areas=[...new Set(records().map(x=>x.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 area.replaceChildren();const all=el('option','', 'Todas as áreas');all.value='todas';area.append(all);
 for(const name of areas){const opt=el('option','',name);opt.value=name;area.append(opt)}
 if(areas.includes(previous))area.value=previous;
 for(const id of ['olympiad-search','olympiad-area','olympiad-status'])$(id).addEventListener(id==='olympiad-search'?'input':'change',render);
 $('olympiad-reset').addEventListener('click',()=>{$('olympiad-search').value='';area.value='todas';statuses.value='todas';render()});
 render();
}
window.EVM_OLIMPIADAS_UI={init,render};
})();
