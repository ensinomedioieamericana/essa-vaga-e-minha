/* Gerenciamento de pastas e PDFs no GitHub. Token apenas na memória durante cada publicação. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const API='https://api.github.com/repos/ensinomedioieamericana/essa-vaga-e-minha';
const MAX_FILE=20*1024*1024,MAX_TOTAL=60*1024*1024;
const TYPES=new Set(['prova','gabarito','resolucao','outro']);
const STAGE_LABELS={'1a-fase':'1ª fase','2a-fase':'2ª fase','especificas':'Habilidades específicas','dia-1':'1º dia','dia-2':'2º dia'};
let catalog=window.EVM_ACERVO;
if(!catalog||catalog.version!==1||!Array.isArray(catalog.institutions))return;
let action=null,busy=false;

const element=(tag,cls,text)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
};
const option=(value,label)=>{const e=element('option','',label);e.value=value;return e};
const slug=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'');
const folderName=p=>p?p.split('/').map(s=>STAGE_LABELS[s]||s.replace(/-/g,' ')).join(' / '):'Raiz do ano (sem pasta)';
const formatSize=n=>(n/(1024*1024)).toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB';
const inst=()=>catalog.institutions.find(i=>i.id===$('pdf-institution').value);
const year=()=>{
 const y=String($('pdf-year').value).trim();
 if(!/^(19|20)\d{2}$/.test(y)||Number(y)<1990||Number(y)>2099)throw Error('Informe um ano válido entre 1990 e 2099.');
 return y;
};
const normalizeFolder=text=>{
 if(!text||!text.trim())throw Error('Informe o nome da pasta.');
 const pieces=text.replace(/\\/g,'/').split('/');
 if(pieces.length>4||pieces.some(p=>!p.trim()||p==='.'||p==='..'))throw Error('Use até quatro níveis de pastas, sem espaços vazios entre barras.');
 const parts=pieces.map(slug);
 if(parts.some(p=>!p))throw Error('Nome de pasta inválido.');
 return parts.join('/');
};
const allFolders=(i,y)=>{
 const found=new Set();
 const add=p=>{
  if(!p)return;
  const segments=p.split('/');
  for(let n=1;n<=segments.length;n++)found.add(segments.slice(0,n).join('/'));
 };
 const docs=i?.years?.[y]||[];
 for(const d of docs){
  const parts=String(d.file||'').split('/');
  if(parts.length>4)add(parts.slice(3,-1).join('/'));
 }
 for(const f of i?.folders?.[y]||[])add(f);
 return [...found].sort((a,b)=>{
  const standard=['dia-1','dia-2','1a-fase','2a-fase','especificas'];
  const ai=standard.indexOf(a),bi=standard.indexOf(b);
  if(ai!==-1||bi!==-1)return (ai===-1?99:ai)-(bi===-1?99:bi);
  return a.localeCompare(b,'pt-BR',{numeric:true});
 });
};
function message(text,error=false){
 const s=$('pdf-status');s.textContent=text;s.className='status-result '+(error?'error':'ok');
}
function refreshInstitutions(){
 const sel=$('pdf-institution'),old=sel.value;
 sel.replaceChildren();
 for(const i of catalog.institutions)sel.append(option(i.id,i.name));
 sel.value=catalog.institutions.some(x=>x.id===old)?old:'fuvest';
 refreshYears();
}
function refreshYears(){
 const i=inst();if(!i)return;
 const existing=[...new Set([...Object.keys(i.years||{}),...Object.keys(i.folders||{})])].sort((a,b)=>Number(b)-Number(a));
 const hints=$('pdf-year-list');hints.replaceChildren();
 existing.forEach(y=>hints.append(option(y,y)));
 if(!$('pdf-year').value)$('pdf-year').value=existing[0]||String(new Date().getFullYear());
 refreshFolders();
}
function refreshFolders(preferred){
 const i=inst(),y=$('pdf-year').value,select=$('pdf-folder'),before=preferred===undefined?(select.options.length?select.value:null):preferred;
 select.replaceChildren(option('','Diretamente no ano (sem pasta)'));
 const available=allFolders(i,y);
 const presets=i?.id==='enem'?['dia-1','dia-2']:['1a-fase','2a-fase','especificas'];
 for(const p of [...new Set([...presets,...available])])select.append(option(p,folderName(p)));
 select.value=before!==null&&[...select.options].some(x=>x.value===before)?before:(available[0]||presets[0]||'');
 updateDestination();renderRecords();
}
function updateDestination(){
 const i=inst(),yearText=$('pdf-year').value||'ANO',folder=$('pdf-folder').value;
 $('pdf-destination').textContent='Destino: acervo/'+(i?.id||'vestibular')+'/'+yearText+'/'+(folder?folder+'/':'')+' — '+(i?.name||'');
 preview();
}
function preview(){
 const files=[...$('pdf-files').files],out=$('pdf-upload-preview');out.replaceChildren();
 if(!files.length){out.textContent='Nenhum PDF selecionado.';return}
 out.append(element('strong','',files.length+' arquivo(s) · '+formatSize(files.reduce((n,f)=>n+f.size,0))));
 const list=element('ul');
 const folder=$('pdf-folder').value;
 for(const f of files){
  const name=slug(f.name.replace(/\.pdf$/i,''))||'documento';
  list.append(element('li','',f.name+' → '+(folder?folder+'/':'')+name+'.pdf ('+formatSize(f.size)+')'));
 }
 out.append(list);
}
function renderRecords(){
 const list=$('pdf-record-list');list.replaceChildren();
 const i=inst(),y=$('pdf-year').value,docs=i?.years?.[y]||[];
 $('pdf-record-count').textContent=docs.length+' PDF(s)';
 if(!docs.length){list.append(element('p','field-help','Nenhum documento cadastrado nesse ano. Escolha uma pasta e envie os primeiros PDFs.'));return}
 for(const doc of docs){
  const row=element('div','pdf-record-row'),info=element('div'),title=element('strong','',doc.title||doc.file.split('/').pop());
  info.append(title,element('small','',doc.file));
  row.append(info);
  if(doc.pending){row.append(element('span','pdf-wait','Pendente no GitHub'))}
  else{
   const link=element('a','', 'Ver arquivo ↗');
   link.href='https://github.com/ensinomedioieamericana/essa-vaga-e-minha/blob/main/'+doc.file.split('/').map(encodeURIComponent).join('/');
   link.target='_blank';link.rel='noopener noreferrer';row.append(link);
  }
  list.append(row);
 }
}
function validateFiles(){
 const files=[...$('pdf-files').files];
 if(!files.length)throw Error('Selecione pelo menos um arquivo PDF.');
 let total=0;
 for(const file of files){
  if(!/\.pdf$/i.test(file.name))throw Error('Somente arquivos com extensão .pdf: '+file.name);
  if(!file.size||file.size>MAX_FILE)throw Error('O PDF '+file.name+' deve ter até 20 MB.');
  total+=file.size;
 }
 if(total>MAX_TOTAL)throw Error('O envio completo excede 60 MB. Divida-o em grupos menores.');
 const paths=files.map(file=>{
  const name=slug(file.name.replace(/\.pdf$/i,''));
  if(!name)throw Error('Nome do arquivo inválido: '+file.name);
  return 'acervo/'+inst().id+'/'+year()+'/'+($('pdf-folder').value?$('pdf-folder').value+'/':'')+name+'.pdf';
 });
 if(new Set(paths).size!==paths.length)throw Error('Dois PDFs possuem o mesmo nome após a padronização. Renomeie um deles.');
 return files.map((file,n)=>({file,path:paths[n]}));
}
function detectType(name){
 const n=slug(name);
 if(n.includes('gabarito'))return 'gabarito';
 if(n.includes('resposta')||n.includes('resolucao')||n.includes('comentario')||n.includes('correcao'))return 'resolucao';
 return 'prova';
}
function statusStep(t){message(t);$('pdf-auth-progress').textContent=t}
function ghError(response,details){
 if(response.status===401||response.status===403)return new Error('Token recusado ou sem permissão Contents: Read and write. '+(details?.message||''));
 if(response.status===404)return new Error('Repositório ou arquivo não encontrado no GitHub.');
 return new Error('Erro do GitHub '+response.status+': '+(details?.message||'tente novamente.'));
}
async function gh(token,path,method='GET',data,optional=false){
 const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization='Bearer '+token;
 if(data!==undefined)headers['Content-Type']='application/json';
 const r=await fetch(API+path,{method,headers,cache:'no-store',body:data===undefined?undefined:JSON.stringify(data)});
 if(optional&&r.status===404)return null;
 const json=await r.json().catch(()=>null);
 if(!r.ok)throw ghError(r,json);
 return json;
}
function decodeBase64(text){
 const binary=atob(text.replace(/\s/g,'')),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 return new TextDecoder().decode(bytes);
}
function encodeText(text){
 const bytes=new TextEncoder().encode(text);let str='';
 for(let n=0;n<bytes.length;n+=8192)str+=String.fromCharCode(...bytes.subarray(n,n+8192));
 return btoa(str);
}
function parseCatalog(content){
 const m=content.match(/window\.EVM_ACERVO\s*=\s*(\{[\s\S]*\})\s*;\s*$/);
 if(!m)throw Error('O catálogo remoto não está no formato esperado.');
 const c=JSON.parse(m[1]);if(c.version!==1||!Array.isArray(c.institutions))throw Error('Catálogo remoto incompatível.');
 return c;
}
async function latestCatalog(token,sha){
 const path='/contents/acervo-dados.js'+(sha?'?ref='+encodeURIComponent(sha):'?ref=main');
 const data=await gh(token,path);
 if(!data.content)throw Error('O GitHub não retornou o catálogo.');
 return parseCatalog(decodeBase64(data.content));
}
async function blob(token,base64){
 const b=await gh(token,'/git/blobs','POST',{content:base64,encoding:'base64'});
 if(!b.sha)throw Error('O GitHub não confirmou o arquivo binário.');
 return b.sha;
}
async function fileBase64(file){
 const prefix=new TextDecoder('ascii').decode(await file.slice(0,5).arrayBuffer());
 if(prefix!=='%PDF-')throw Error('Arquivo sem cabeçalho PDF válido: '+file.name);
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('Não foi possível ler '+file.name));
  reader.onload=()=>{
   const value=String(reader.result||'');
   const position=value.indexOf(',');
   if(position<0)reject(new Error('Formato de leitura inesperado: '+file.name));
   else resolve(value.slice(position+1));
  };
  reader.readAsDataURL(file);
 });
}
function addFolder(c,i,y,path){
 const target=c.institutions.find(x=>x.id===i);
 if(!target)throw Error('Vestibular não encontrado no catálogo remoto.');
 if(!target.folders)target.folders={};
 if(!Array.isArray(target.folders[y]))target.folders[y]=[];
 const set=new Set(target.folders[y]);
 const parts=path.split('/');
 for(let a=1;a<=parts.length;a++)set.add(parts.slice(0,a).join('/'));
 target.folders[y]=[...set].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function mutateCatalog(c,items,i,y,folder,selectedType,customTitle){
 const target=c.institutions.find(x=>x.id===i);
 if(!target)throw Error('Vestibular não encontrado no catálogo.');
 if(!target.years)target.years={};
 if(!target.years[y])target.years[y]=[];
 if(folder)addFolder(c,i,y,folder);
 for(const item of items){
  const duplicates=target.years[y].some(d=>d.file===item.path);
  if(duplicates)throw Error('Já há um PDF cadastrado com o mesmo caminho: '+item.path+'. Renomeie o arquivo.');
  const type=TYPES.has(selectedType)?selectedType:detectType(item.file.name);
  const name=items.length===1&&customTitle?customTitle:item.file.name.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').trim();
  target.years[y].push({title:target.name+' '+y+' · '+(folder?folderName(folder)+' · ':'')+name,type,file:item.path,size:item.file.size});
 }
 target.years=Object.fromEntries(Object.entries(target.years).sort((a,b)=>Number(b[0])-Number(a[0])));
}
function catalogSource(c){
 return '/* Catálogo local do Banco de Provas. PDFs administrados pelo Painel do Desenvolvedor. */\nwindow.EVM_ACERVO = '+JSON.stringify(c,null,2)+';\n';
}
async function ensureNewPaths(token,paths,ref){
 for(const path of paths){
  const p='/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(ref);
  const existing=await gh(token,p,'GET',undefined,true);
  if(existing)throw Error('Este arquivo já existe no GitHub: '+path+'. Renomeie antes de publicar.');
 }
}
async function publish(token,task){
 // Os blobs podem ser reutilizados se outra publicação atualizar a branch durante esta operação.
 const changes=[];
 if(task.kind==='folder'){
  const path='acervo/'+task.institution+'/'+task.year+'/'+task.folder+'/.gitkeep';
  statusStep('Preparando a nova pasta…');
  changes.push({path,sha:await blob(token,encodeText('Pasta criada pelo Painel do Desenvolvedor.\n'))});
 }else{
  for(let n=0;n<task.items.length;n++){
   const item=task.items[n];
   statusStep('Enviando PDF '+(n+1)+' de '+task.items.length+': '+item.file.name);
   changes.push({path:item.path,sha:await blob(token,await fileBase64(item.file))});
  }
 }
 for(let attempt=0;attempt<3;attempt++){
  statusStep('Conferindo a versão mais recente do catálogo no GitHub…');
  const head=await gh(token,'/git/ref/heads/main');
  const commitSha=head.object?.sha;
  if(!commitSha)throw Error('Não foi possível identificar a versão principal do GitHub.');
  const [commit,c]=await Promise.all([gh(token,'/git/commits/'+commitSha),latestCatalog(token,commitSha)]);
  const existing=task.kind==='folder' && (c.institutions.find(x=>x.id===task.institution)?.folders?.[task.year]||[]).includes(task.folder);
  if(existing)throw Error('Essa pasta já foi criada. Atualize o catálogo e selecione-a na lista.');
  await ensureNewPaths(token,changes.map(x=>x.path),commitSha);
  if(task.kind==='folder')addFolder(c,task.institution,task.year,task.folder);
  else mutateCatalog(c,task.items,task.institution,task.year,task.folder,task.type,task.title);
  statusStep('Atualizando o catálogo e criando um único commit…');
  const catalogSha=await blob(token,encodeText(catalogSource(c)));
  const entries=[...changes,{path:'acervo-dados.js',sha:catalogSha}].map(x=>({path:x.path,mode:'100644',type:'blob',sha:x.sha}));
  const newTree=await gh(token,'/git/trees','POST',{base_tree:commit.tree.sha,tree:entries});
  const title=task.kind==='folder'?'Criar pasta do Banco de Provas: '+task.institution+' '+task.year+'/'+task.folder:'Publicar '+task.items.length+' PDF(s) no Banco de Provas: '+task.institution+' '+task.year;
  const newCommit=await gh(token,'/git/commits','POST',{message:title,tree:newTree.sha,parents:[commitSha]});
  try{
   await gh(token,'/git/refs/heads/main','PATCH',{sha:newCommit.sha,force:false});
   catalog=c;refreshInstitutions();
   $('pdf-institution').value=task.institution;$('pdf-year').value=task.year;
   refreshFolders(task.folder);
   if(task.kind==='files'){$('pdf-files').value='';$('pdf-custom-title').value='';preview()}
   return newCommit.sha;
  }catch(error){
   // Uma ação de importação ou outra edição pode ter avançado a branch.
   if(attempt<2&&/Erro do GitHub (409|422)/.test(error.message))continue;
   throw error;
  }
 }
 throw Error('O repositório recebeu alterações simultâneas. Tente novamente.');
}
function requestAuth(kind){
 if(busy)return;
 try{
  const i=inst(),y=year();
  if(!i)throw Error('Selecione um vestibular.');
  if(kind==='folder'){
   const folder=normalizeFolder($('pdf-new-folder').value);
   if((i.folders?.[y]||[]).includes(folder))throw Error('Essa pasta já existe no catálogo.');
   action={kind,institution:i.id,year:y,folder};
  }else{
   const items=validateFiles(),folder=$('pdf-folder').value;
   const customTitle=$('pdf-custom-title').value.trim();
   if(customTitle&&items.length!==1)throw Error('Use um título personalizado somente para envios de um PDF.');
   action={kind:'files',institution:i.id,year:y,folder,items,type:$('pdf-type').value,title:customTitle};
  }
  $('pdf-auth-error').textContent='';$('pdf-auth-progress').textContent='';$('pdf-github-token').value='';
  $('pdf-auth-dialog').showModal();$('pdf-github-token').focus();
 }catch(err){message(err.message,true)}
}
function closeDialog(){
 $('pdf-github-token').value='';$('pdf-auth-dialog').close();
}
$('pdf-create-folder').addEventListener('click',()=>requestAuth('folder'));
$('pdf-publish').addEventListener('click',()=>requestAuth('files'));
$('pdf-auth-cancel').addEventListener('click',closeDialog);
$('pdf-auth-dialog').addEventListener('close',()=>{$('pdf-github-token').value='';if(!busy)action=null});
$('pdf-auth-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!action)return;
 const token=$('pdf-github-token').value.trim();
 if(token.length<15){$('pdf-auth-error').textContent='Informe um token válido; não use sua senha.';return}
 busy=true;
 const btn=$('pdf-auth-submit');btn.disabled=true;
 $('pdf-create-folder').disabled=true;$('pdf-publish').disabled=true;
 try{
  const kind=action.kind;
  const commit=await publish(token,action);
  closeDialog();
  $('pdf-new-folder').value='';
  message((kind==='folder'?'Pasta criada':'PDF(s) publicados')+' com sucesso no GitHub. Commit '+commit.slice(0,10)+'. Para aparecer no site do colégio, publique a versão atualizada do repositório.');
 }catch(err){
  $('pdf-auth-error').textContent=err.message||'Não foi possível concluir a publicação.';
  message('Publicação não concluída: '+(err.message||'erro desconhecido'),true);
 }finally{
  $('pdf-github-token').value='';
  busy=false;action=null;btn.disabled=false;
  $('pdf-create-folder').disabled=false;$('pdf-publish').disabled=false;
 }
});
$('pdf-refresh').addEventListener('click',async()=>{
 const btn=$('pdf-refresh');btn.disabled=true;
 try{
  const i=$('pdf-institution').value,y=$('pdf-year').value;
  catalog=await latestCatalog('');
  refreshInstitutions();$('pdf-institution').value=i;$('pdf-year').value=y;refreshFolders();
  message('Catálogo atualizado a partir da versão mais recente do GitHub.');
 }catch(err){message('Não foi possível atualizar o catálogo: '+err.message,true)}
 finally{btn.disabled=false}
});
$('pdf-institution').addEventListener('change',()=>{$('pdf-year').value='';refreshYears()});
$('pdf-year').addEventListener('change',()=>refreshFolders());
$('pdf-year').addEventListener('input',()=>refreshFolders());
$('pdf-folder').addEventListener('change',updateDestination);
$('pdf-files').addEventListener('change',preview);
refreshInstitutions();
})();
