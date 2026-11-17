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
let currentPhase=null;
let currentFolder='';
let currentFiles=[];
const create=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
const norm=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const typeName=type=>({'prova':'Prova','gabarito':'Gabarito','resolucao':'Resolução','outro':'Material complementar'})[type]||'PDF';
function validPdf(inst,year,doc){
 if(!doc||typeof doc.file!=='string')return false;
 const prefix='acervo/'+inst.id+'/'+year+'/';
 const safe=path=>typeof path==='string'&&path.startsWith(prefix)&&!path.includes('..')&&!path.includes('//')&&path.split('/').every(p=>!!p&&p!=='.'&&p!=='..'&&!/[?#%\\]/.test(p));
 if(!safe(doc.file)||!doc.file.toLowerCase().endsWith('.pdf'))return false;
 if(doc.parts===undefined)return true;
 return Array.isArray(doc.parts)&&doc.parts.length>0&&doc.parts.length<=100&&doc.parts.every(p=>safe(p)&&/\.pdf\.part\d{2,3}$/i.test(p));
}
function pdfUrl(file){return './'+file.replace(/\\/g,'/').split('/').map(encodeURIComponent).join('/')}
function updateQuery(){
 const params=new URLSearchParams(location.search);
 params.set('prova',current.id);
 if(currentYear)params.set('ano',currentYear);else params.delete('ano');
 if(currentPhase)params.set('fase',currentPhase);else params.delete('fase');
 if(currentFolder)params.set('pasta',currentFolder);else params.delete('pasta');
 history.replaceState(null,'',location.pathname+'?'+params.toString()+location.hash);
}
function yearsOf(inst){
 const ys=new Set([...Object.keys(inst.years||{}),...Object.keys(inst.folders||{})]);
 return [...ys].filter(year=>/^(?:19|20)\d\d$/.test(year)&&((inst.years?.[year]||[]).some(d=>validPdf(inst,year,d))||(inst.folders?.[year]||[]).length>0)).sort((a,b)=>Number(b)-Number(a));
}
function selectInstitution(id,requestedYear){
 const match=validId(id);if(!match)return;
 current=match;const years=yearsOf(current);
 currentYear=years.includes(String(requestedYear))?String(requestedYear):years[0]||null;
 currentPhase=current.id==='enem'?(stagesOf(current,currentYear)[0]||null):null;
 currentFolder='';
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
  btn.addEventListener('click',()=>{currentYear=y;currentPhase=current.id==='enem'?(stagesOf(current,currentYear)[0]||null):null;currentFolder='';$('file-search').value='';renderYears();renderPhases();renderFolders();renderFiles();updateQuery()});
  wrap.append(btn);
 }
}

const PHASE_LABELS={'1a-fase':'1ª fase','2a-fase':'2ª fase','especificas':'Habilidades específicas','dia-1':'1º dia','dia-2':'2º dia','raiz':'Documentos gerais'};
const folderLabel=folder=>PHASE_LABELS[folder]||String(folder).replace(/-/g,' ');
const fileFolder=doc=>String(doc.file||'').split('/').slice(3,-1).join('/');
function phaseOf(doc){
 const parts=String(doc.file||'').split('/');
 return parts.length>4?parts[3]:'raiz';
}
function folderPaths(inst,year){
 const found=new Set();
 const add=p=>{
  if(typeof p!=='string'||!p||p.split('/').some(x=>!/^[a-z0-9-]+$/.test(x)))return;
  const parts=p.split('/');
  for(let n=1;n<=parts.length;n++)found.add(parts.slice(0,n).join('/'));
 };
 for(const p of inst?.folders?.[year]||[])add(p);
 for(const d of inst?.years?.[year]||[])if(validPdf(inst,year,d))add(fileFolder(d));
 return [...found];
}
function stagesOf(inst,year){
 const docs=(inst?.years?.[year]||[]).filter(d=>validPdf(inst,year,d));
 const all=new Set(docs.map(phaseOf));
 for(const p of folderPaths(inst,year))all.add(p.split('/')[0]);
 // Se todos os PDFs estão diretamente dentro do ano, mostrar a lista sem uma etapa extra de seleção.
 if(all.size===1&&all.has('raiz'))return [];
 const standard=inst?.id==='enem'?['dia-1','dia-2']:['1a-fase','2a-fase','especificas'];
 return [...all].sort((a,b)=>{
  const ai=standard.indexOf(a),bi=standard.indexOf(b);
  if(ai>=0||bi>=0)return (ai<0?99:ai)-(bi<0?99:bi);
  if(a==='raiz')return -1;
  if(b==='raiz')return 1;
  return a.localeCompare(b,'pt-BR');
 });
}
function selectedPath(){
 if(!currentPhase)return null;
 return (currentPhase==='raiz'?'':currentPhase)+(currentFolder?'/'+currentFolder:'');
}
function nestedFolders(){
 if(!currentYear||!currentPhase||currentPhase==='raiz')return [];
 const root=selectedPath();
 const prefix=root?root+'/':'';
 const children=new Set();
 for(const path of folderPaths(current,currentYear)){
  if(path.startsWith(prefix)&&path.length>prefix.length){
   const child=path.slice(prefix.length).split('/')[0];
   if(child)children.add(child);
  }
 }
 return [...children].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));
}
function renderPhases(){
 const wrap=$('phase-tabs');wrap.replaceChildren();
 const stages=currentYear?stagesOf(current,currentYear):[];
 $('phase-section').hidden=!stages.length;
 if(!stages.length){currentPhase=null;currentFolder='';return}
 if(currentPhase&&!stages.includes(currentPhase)){currentPhase=null;currentFolder=''}
 const enem=current.id==='enem';
 $('phase-step-eyebrow').textContent=enem?'03 / ESCOLHA O DIA':'03 / ESCOLHA A PASTA';
 $('phase-title').textContent=enem?'Qual dia deseja estudar?':'Qual fase ou pasta deseja estudar?';
 $('phase-subtitle').textContent=enem?'ENEM · '+currentYear+' · escolha o dia para consultar provas e gabaritos.':current.name+' · '+currentYear+' · selecione uma fase ou pasta para localizar os documentos.';
 for(const stage of stages){
  const count=(current.years?.[currentYear]||[]).filter(doc=>validPdf(current,currentYear,doc)&&phaseOf(doc)===stage).length;
  const label=folderLabel(stage)+(count?' · '+count+(count===1?' documento':' documentos'):' · pasta');
  const btn=create('button','phase-tab'+(currentPhase===stage?' selected':''),label);
  btn.type='button';btn.setAttribute('aria-pressed',String(currentPhase===stage));
  btn.addEventListener('click',()=>{currentPhase=stage;currentFolder='';$('file-search').value='';renderPhases();renderFolders();renderFiles();updateQuery()});
  wrap.append(btn);
 }
}
function renderFolders(){
 const section=$('folder-section'),container=$('folder-tabs'),children=nestedFolders();
 container.replaceChildren();
 section.hidden=(!currentFolder&&!children.length)||!currentPhase;
 if(section.hidden)return;
 $('folder-title').textContent=currentFolder?'Dentro de '+folderLabel(currentFolder.split('/').pop()):'Subpastas disponíveis';
 $('folder-subtitle').textContent='Abra uma pasta para ver os PDFs organizados nela.';
 const back=$('folder-back');back.hidden=!currentFolder;
 if(!back.hidden)back.textContent='← Voltar para '+(currentFolder.includes('/')?folderLabel(currentFolder.split('/').slice(-2,-1)[0]):folderLabel(currentPhase));
 for(const name of children){
  const btn=create('button','folder-tab','▤ '+folderLabel(name));
  btn.type='button';
  btn.addEventListener('click',()=>{
   currentFolder=(currentFolder?currentFolder+'/':'')+name;
   $('file-search').value='';renderFolders();renderFiles();updateQuery();
  });
  container.append(btn);
 }
}
$('folder-back').addEventListener('click',()=>{
 if(!currentFolder)return;
 currentFolder=currentFolder.split('/').slice(0,-1).join('/');
 $('file-search').value='';renderFolders();renderFiles();updateQuery();
});

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
 const stages=currentYear?stagesOf(current,currentYear):[];
 $('files-title').textContent=currentYear?'Arquivos de '+currentYear+(currentPhase?' · '+folderLabel(currentPhase):'')+(currentFolder?' / '+currentFolder.split('/').map(folderLabel).join(' / '):''):'Arquivos disponíveis';
 const term=norm($('file-search').value.trim());
 const docs=(currentYear?current.years[currentYear]:[])||[];
 currentFiles=docs.filter(d=>validPdf(current,currentYear,d)&&(!stages.length||fileFolder(d)===selectedPath()));
 const matching=currentFiles.filter(doc=>norm((doc.title||'')+' '+typeName(doc.type)).includes(term));
 $('files-subtitle').textContent=currentYear?current.name+' · '+currentYear+' · '+currentFiles.length+(currentFiles.length===1?' documento cadastrado':' documentos cadastrados')+(current.id==='enem'?' · Cadernos por dia, disponíveis após publicação dos PDFs no servidor.':''):'Aguardando os PDFs originais para organizar as provas por ano.';
 $('file-search').disabled=!currentYear||(stages.length&&!currentPhase);
 if(stages.length&&!currentPhase){
  empty(current.id==='enem'?'Escolha o dia da prova':'Escolha uma fase ou pasta',current.id==='enem'?'Selecione 1º dia ou 2º dia para visualizar os arquivos.':'Selecione uma das pastas acima para visualizar os arquivos deste ano.',null);
  return;
 }
 if(!currentFiles.length){
  if(nestedFolders().length)empty('Escolha uma subpasta','Selecione uma das pastas acima para acessar os documentos disponíveis.',null);
  else empty('Nenhum PDF nesta pasta','Esta pasta ainda não possui PDFs publicados no servidor do Instituto.',current.legacy);
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
  const fillActions=()=>{
   const view=create('button','pdf-action primary','Visualizar');view.type='button';
   view.addEventListener('click',()=>openPDF(doc,href));
   let dl;
   if(Array.isArray(doc.parts)){
    dl=create('button','pdf-action secondary','↓ Baixar');
    dl.type='button';dl.addEventListener('click',()=>downloadPDF(doc,href,dl));
   }else{
    dl=create('a','pdf-action secondary','↓ Baixar');dl.href=href;dl.download=doc.file.split('/').pop();
   }
   actions.append(view,dl);
  };
  if(doc.pending===true){
   card.classList.add('pdf-pending');
   actions.append(create('span','pdf-pending-label','Aguardando publicação do PDF no servidor'));
   fetch(href,{method:'HEAD',cache:'no-store'}).then(response=>{
    const kind=response.headers.get('content-type')||'';
    if(!response.ok||!/pdf|octet-stream/i.test(kind)||!card.isConnected)return;
    card.classList.remove('pdf-pending');actions.replaceChildren();fillActions();
   }).catch(()=>{});
  }else fillActions();
  card.append(ico,info,actions);list.append(card);
 }
}
function formatSize(n){
 const m=n/(1024*1024);
 return m>=1?m.toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB':Math.round(n/1024)+' KB';
}
let lastBlob=null;
let pdfRequest=0;
async function pdfResource(doc,href){
 if(!Array.isArray(doc.parts))return href;
 if(lastBlob?.key===doc.file)return lastBlob.url;
 const segments=[];
 for(let i=0;i<doc.parts.length;i+=4){
  const batch=doc.parts.slice(i,i+4);
  const blobs=await Promise.all(batch.map(async file=>{
   const response=await fetch(pdfUrl(file));
   if(!response.ok)throw new Error('Não foi possível carregar uma parte do PDF ('+response.status+').');
   return response.blob();
  }));
  segments.push(...blobs);
  const loading=$('pdf-loading');
  if(loading&&!loading.hidden)loading.textContent='Preparando PDF… '+Math.min(i+batch.length,doc.parts.length)+' de '+doc.parts.length+' partes';
 }
 const url=URL.createObjectURL(new Blob(segments,{type:'application/pdf'}));
 if(lastBlob)URL.revokeObjectURL(lastBlob.url);
 lastBlob={key:doc.file,url};
 return url;
}
async function downloadPDF(doc,href,button){
 button.disabled=true;
 const label=button.textContent;button.textContent='Preparando…';
 try{
  const url=await pdfResource(doc,href);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=doc.file.split('/').pop();
  document.body.append(anchor);anchor.click();anchor.remove();
 }catch(error){window.alert('Não foi possível baixar este PDF. Tente novamente. '+error.message)}
 finally{button.disabled=false;button.textContent=label}
}
async function openPDF(doc,href){
 const dialog=$('pdf-dialog'),frame=$('pdf-frame'),loading=$('pdf-loading'),req=++pdfRequest;
 $('pdf-dialog-title').textContent=doc.title||'Documento PDF';
 $('pdf-download').download=doc.file.split('/').pop();
 $('pdf-download').removeAttribute('href');
 $('pdf-external').removeAttribute('href');
 frame.hidden=true;frame.removeAttribute('src');
 loading.hidden=false;loading.textContent='Preparando documento PDF…';
 dialog.showModal();
 try{
  const url=await pdfResource(doc,href);
  if(req!==pdfRequest||!dialog.open)return;
  $('pdf-download').href=url;
  $('pdf-external').href=url;
  frame.src=url;frame.hidden=false;loading.hidden=true;
 }catch(error){
  if(req===pdfRequest&&dialog.open)loading.textContent='Não foi possível carregar este PDF. Tente fechar e abrir novamente.';
 }
}
function closePDF(){pdfRequest++;const d=$('pdf-dialog');if(d.open)d.close();$('pdf-frame').removeAttribute('src')}
$('pdf-close').addEventListener('click',closePDF);
$('pdf-dialog').addEventListener('close',()=>{pdfRequest++;$('pdf-frame').removeAttribute('src')});
$('pdf-dialog').addEventListener('click',event=>{
 if(event.target===$('pdf-dialog'))closePDF();
});
const moreDialog=$('acervo-more-dialog');
$('acervo-more-open').addEventListener('click',()=>moreDialog.showModal());
$('acervo-more-close').addEventListener('click',()=>moreDialog.close());
moreDialog.addEventListener('click',event=>{if(event.target===moreDialog)moreDialog.close()});
$('file-search').addEventListener('input',renderFiles);
function render(){
 $('breadcrumb-name').textContent=current.name;
 $('acervo-subtitle').textContent=current.id==='enem'?'Explore o acervo do ENEM. Selecione o ano e escolha o 1º ou o 2º dia para consultar provas e gabaritos.':'Explore o acervo de '+current.name+'. Selecione o ano e a fase para acessar provas, gabaritos e materiais PDF dentro do site.';
 renderInstitutions();renderYears();renderPhases();renderFolders();renderFiles();
}
const initialYears=yearsOf(current);
currentYear=initialYears.includes(q.get('ano'))?q.get('ano'):initialYears[0]||null;
const allowedInitialStages=stagesOf(current,currentYear);
currentPhase=allowedInitialStages.includes(q.get('fase'))?q.get('fase'):(current.id==='enem'?(allowedInitialStages[0]||null):null);
const requestedFolder=q.get('pasta')||'';
currentFolder=currentPhase&&/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(requestedFolder)&&folderPaths(current,currentYear).includes((currentPhase==='raiz'?'':currentPhase+'/')+requestedFolder)?requestedFolder:'';
render();updateQuery();
})();