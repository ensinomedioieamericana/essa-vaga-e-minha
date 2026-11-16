(() => {
'use strict';
const $=id=>document.getElementById(id);
const catalog=window.EVM_ACERVO;
if(!catalog||catalog.version!==1||!Array.isArray(catalog.institutions)){document.body.append(document.createTextNode('Não foi possível carregar o catálogo de provas.'));return}
const institutions=catalog.institutions;
const q=new URLSearchParams(location.search);
const validId=id=>institutions.find(x=>x.id===id);
let current=validId(q.get('prova'))||institutions[0];
let currentYear=null;
let currentFiles=[];
const create=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
const norm=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const typeName=type=>({'prova':'Prova','gabarito':'Gabarito','resolucao':'Resolução','outro':'Material complementar'})[type]||'PDF';
function validPdf(inst,year,doc){
 if(!doc||typeof doc.file!=='string')return false;
 const path=doc.file.replace(/\\/g,'/');
 const prefix='acervo/'+inst.id+'/'+year+'/';
 if(!path.startsWith(prefix)||!path.toLowerCase().endsWith('.pdf')||path.includes('..')||path.includes('//'))return false;
 const parts=path.split('/');
 return parts.every(p=>!!p&&p!=='.'&&p!=='..'&& !/[?#%]/.test(p));
}
function pdfUrl(file){return './'+file.replace(/\\/g,'/').split('/').map(encodeURIComponent).join('/')}
function updateQuery(){
 const params=new URLSearchParams(location.search);
 params.set('prova',current.id);
 if(currentYear)params.set('ano',currentYear);else params.delete('ano');
 history.replaceState(null,'',location.pathname+'?'+params.toString()+location.hash);
}
function yearsOf(inst){
 return Object.entries(inst.years||{}).filter(([year,docs])=>/^(?:19|20)\d\d$/.test(year)&&Array.isArray(docs)&&docs.some(d=>validPdf(inst,year,d))).sort((a,b)=>Number(b[0])-Number(a[0])).map(([year])=>year);
}
function selectInstitution(id,requestedYear){
 const match=validId(id);if(!match)return;
 current=match;const years=yearsOf(current);
 currentYear=years.includes(String(requestedYear))?String(requestedYear):years[0]||null;
 $('file-search').value='';
 render();updateQuery();
}
function renderInstitutions(){
 const list=$('institution-tabs');list.replaceChildren();
 for(const inst of institutions){
  const btn=create('button','institution-tab'+(current.id===inst.id?' selected':''));
  btn.type='button';btn.setAttribute('aria-pressed',String(current.id===inst.id));
  const imgBox=create('span','institution-symbol');
  if(inst.logo){
   const img=create('img');img.src=inst.logo;img.alt='';img.loading='lazy';
   img.addEventListener('error',()=>{img.remove();imgBox.textContent='▤'});
   imgBox.append(img);
  }else imgBox.textContent='▤';
  const name=create('span','institution-tab-name',inst.name);
  btn.append(imgBox,name);
  btn.addEventListener('click',()=>selectInstitution(inst.id));
  list.append(btn);
 }
 $('institution-count').textContent=institutions.length+' instituições';
}
function renderYears(){
 const years=yearsOf(current);
 const wrap=$('year-tabs');wrap.replaceChildren();
 $('year-count').textContent=years.length?years.length+(years.length===1?' ano disponível':' anos disponíveis'):'Nenhum PDF importado';
 $('year-title').textContent='Provas por ano · '+current.name;
 if(!years.length){
  wrap.append(create('p','no-years','Os anos aparecerão aqui à medida que os PDFs forem importados para o site.'));
  return;
 }
 for(const y of years){
  const btn=create('button','year-tab'+(currentYear===y?' selected':''),y);
  btn.type='button';btn.setAttribute('aria-pressed',String(currentYear===y));
  btn.addEventListener('click',()=>{currentYear=y;$('file-search').value='';renderYears();renderFiles();updateQuery()});
  wrap.append(btn);
 }
}
function empty(title,description,legacy){
 $('empty-state').hidden=false;
 $('empty-title').textContent=title;
 $('empty-description').textContent=description;
 const link=$('legacy-link');
 const allowed=typeof legacy==='string'&&/^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]+/.test(legacy);
 link.hidden=!allowed;if(allowed)link.href=legacy;
}
function renderFiles(){
 const list=$('files-list');list.replaceChildren();
 $('empty-state').hidden=true;
 $('files-title').textContent=currentYear?'Arquivos de '+currentYear:'Arquivos disponíveis';
 const term=norm($('file-search').value.trim());
 const docs=(currentYear?current.years[currentYear]:[])||[];
 currentFiles=docs.filter(d=>validPdf(current,currentYear,d));
 const matching=currentFiles.filter(doc=>norm((doc.title||'')+' '+typeName(doc.type)).includes(term));
 $('files-subtitle').textContent=currentYear?current.name+' · '+currentYear+' · '+currentFiles.length+(currentFiles.length===1?' documento PDF':' documentos PDF'):'Aguardando os PDFs originais para organizar as provas por ano.';
 $('file-search').disabled=!currentYear;
 if(!currentFiles.length){
  empty('Estamos preparando o acervo da '+current.name,'Os PDFs originais ainda precisam ser copiados para a hospedagem do Instituto. Até a conclusão dessa transferência, você pode consultar a pasta já utilizada pelos alunos.',current.legacy);
  return;
 }
 if(!matching.length){
  empty('Nenhum PDF encontrado na pesquisa','Experimente outro termo para localizar a prova ou o gabarito.',null);
  return;
 }
 for(const doc of matching){
  const href=pdfUrl(doc.file);
  const card=create('article','pdf-card');
  const ico=create('span','pdf-icon','PDF');ico.setAttribute('aria-hidden','true');
  const info=create('div','pdf-info');
  info.append(create('span','pdf-kind',typeName(doc.type)),create('h3','pdf-name',doc.title||'Documento PDF'));
  const small=create('span','pdf-meta',current.name+' · '+currentYear+(Number(doc.size)>0?' · '+formatSize(doc.size):''));
  info.append(small);
  const actions=create('div','pdf-actions');
  const view=create('button','pdf-action primary','Visualizar');view.type='button';
  view.addEventListener('click',()=>openPDF(doc,href));
  const dl=create('a','pdf-action secondary','↓ Baixar');dl.href=href;dl.download=doc.file.split('/').pop();
  actions.append(view,dl);card.append(ico,info,actions);list.append(card);
 }
}
function formatSize(n){
 const m=n/(1024*1024);
 return m>=1?m.toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB':Math.round(n/1024)+' KB';
}
function openPDF(doc,href){
 const dialog=$('pdf-dialog'),frame=$('pdf-frame');
 $('pdf-dialog-title').textContent=doc.title||'Documento PDF';
 $('pdf-download').href=href;
 $('pdf-download').download=doc.file.split('/').pop();
 $('pdf-external').href=href;
 frame.src=href;
 dialog.showModal();
}
function closePDF(){const d=$('pdf-dialog');if(d.open)d.close();$('pdf-frame').removeAttribute('src')}
$('pdf-close').addEventListener('click',closePDF);
$('pdf-dialog').addEventListener('close',()=>{$('pdf-frame').removeAttribute('src')});
$('pdf-dialog').addEventListener('click',event=>{
 if(event.target===$('pdf-dialog'))closePDF();
});
$('file-search').addEventListener('input',renderFiles);
function render(){
 $('breadcrumb-name').textContent=current.name;
 $('acervo-subtitle').textContent='Explore o acervo de '+current.name+'. Selecione o ano para acessar provas, gabaritos e materiais PDF dentro do site.';
 renderInstitutions();renderYears();renderFiles();
}
const initialYears=yearsOf(current);
currentYear=initialYears.includes(q.get('ano'))?q.get('ano'):initialYears[0]||null;
render();updateQuery();
})();