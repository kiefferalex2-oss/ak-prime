'use strict';
(()=>{
 const ids=id=>document.getElementById(id);
 const api=db;
 const names={performance:'Performance sportive',forme_sante:'Forme & santé',mental:'Préparation mentale'};
 const statuses={draft:'À valider',approved:'Version validée · publication non effectuée',rejected:'Refusé',publishing:'Publication en cours',published:'Publié',uncertain:'Résultat à vérifier'};
 let current=null,previewURLs=[],dirty=false;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 function preview(d){const url=URL.createObjectURL(new Blob([window.AKPrimeStudio.svg(d)],{type:'image/svg+xml'}));previewURLs.push(url);return url}
 async function refresh(){
  const {data,error}=await api.from('prospection_drafts').select('*').order('created_at',{ascending:false}).limit(100);
  for(const url of previewURLs)URL.revokeObjectURL(url);previewURLs=[];
  for(const id of ['campaignDrafts','commercialSuggestions'])ids(id).replaceChildren();
  if(error){ids('campaignDrafts').textContent='Le studio commercial est en cours de connexion.';return}
  for(const d of data){
   const card=el('article',undefined,'campaignCard');const description=el('div');
   if(d.kind==='publication'){const image=el('img');image.alt='Visuel proposé : '+d.title;try{image.src=preview(d)}catch{image.alt='Texte du visuel à raccourcir'}card.append(image)}
   description.append(el('h3',d.title),el('p',(d.kind==='publication'?d.channel+' · ':'')+names[d.pole]+' · '+statuses[d.status],'small muted'),el('pre',d.body));
   const button=el('button','Examiner la proposition','secondary');button.onclick=()=>open(d);description.append(button);card.append(description);
   ids(d.kind==='publication'?'campaignDrafts':'commercialSuggestions').append(card);
  }
  if(current?.kind==='publication'&&ids('campaignEditor').open)ids('campaignVisual').src=preview(current);
  if(!ids('campaignDrafts').children.length)ids('campaignDrafts').textContent='Aucune publication préparée. Activez la préparation de contenus une fois la clé IA connectée.';
  if(!ids('commercialSuggestions').children.length)ids('commercialSuggestions').textContent='Les suggestions de développement apparaîtront ici.';
 }
 function open(d){
  current={...d};dirty=false;ids('campaignBody').value=d.body;ids('campaignVisualTitle').value=d.visual_title;ids('campaignVisualPoints').value=d.visual_points;
  ids('campaignDestination').textContent=(d.kind==='publication'?d.channel+' · compte '+d.target_label:'Suggestion, sans exécution automatique')+' · '+names[d.pole];
  ids('campaignReason').textContent=d.rationale;ids('campaignVisual').hidden=d.kind!=='publication';
  ids('downloadCampaign').hidden=d.kind!=='publication';
  const locked=['publishing','published','uncertain'].includes(d.status);
  for(const id of ['campaignBody','campaignVisualTitle','campaignVisualPoints','saveCampaign','rejectCampaign','approveCampaign'])ids(id).disabled=locked;
  ids('campaignStatus').textContent=statuses[d.status];
  if(d.kind==='publication')try{ids('campaignVisual').src=preview(d)}catch(e){ids('campaignStatus').textContent=e.message;ids('approveCampaign').disabled=true}
  ids('campaignEditor').showModal();
 }
 function edited(){return {...current,body:ids('campaignBody').value.trim(),visual_title:ids('campaignVisualTitle').value.trim(),visual_points:ids('campaignVisualPoints').value.trim()}}
 async function update(changes){
  const {data,error}=await api.from('prospection_drafts').update(changes).eq('id',current.id).eq('updated_at',current.updated_at).select('*');
  if(error||!data?.length)throw Error('La proposition a changé ou n’a pas pu être enregistrée. Actualisez avant de valider.');
  current=data[0];return current;
 }
 for(const id of ['campaignBody','campaignVisualTitle','campaignVisualPoints'])ids(id).oninput=()=>{
  dirty=true;ids('approveCampaign').disabled=true;ids('campaignStatus').textContent='Modifications non enregistrées. Enregistrez avant de valider.';
  if(current?.kind==='publication')try{ids('campaignVisual').src=preview(edited())}catch(e){ids('campaignStatus').textContent=e.message}
 };
 ids('saveCampaign').onclick=async()=>{
  try{const d=edited();if(d.kind==='publication')window.AKPrimeStudio.svg(d);
   if(d.body.length<40)throw Error('Le message est trop court.');
   await update({body:d.body,visual_title:d.visual_title,visual_points:d.visual_points,status:'draft',asset_url:null});dirty=false;ids('approveCampaign').disabled=false;ids('campaignStatus').textContent='Modifications enregistrées. Relisez puis validez cette version.';
  }catch(e){ids('campaignStatus').textContent=e.message}
 };
 ids('approveCampaign').onclick=async()=>{
  if(dirty||!current)return;ids('approveCampaign').disabled=true;
  try{
   if(current.kind==='publication'&&!current.asset_url){
    const image=await window.AKPrimeStudio.jpeg(current);const path=current.id+'/'+crypto.randomUUID()+'.jpg';
    const {error}=await api.storage.from('akprime-promotion').upload(path,image,{contentType:'image/jpeg',upsert:false});
    if(error)throw Error('Impossible d’enregistrer le visuel. Rien n’est publié sur les réseaux.');
    const {data}=api.storage.from('akprime-promotion').getPublicUrl(path);
    await update({asset_url:data.publicUrl});
   }
   await update({status:'approved'});
   ids('campaignStatus').textContent=current.kind==='suggestion'?'Piste retenue. Aucune action ni dépense n’a été engagée.':'Version exacte validée. Le visuel est prêt ; aucune publication sociale n’a encore été effectuée.';
   await refresh();
  }catch(e){ids('campaignStatus').textContent=e.message}finally{ids('approveCampaign').disabled=false}
 };
 ids('rejectCampaign').onclick=async()=>{try{await update({status:'rejected'});ids('campaignEditor').close();await refresh()}catch(e){ids('campaignStatus').textContent=e.message}};
 ids('downloadCampaign').onclick=async()=>{try{const blob=await window.AKPrimeStudio.jpeg(edited());const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download='AK_PRIME_'+current.pole+'.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){ids('campaignStatus').textContent=e.message}};
 ids('closeCampaign').onclick=()=>ids('campaignEditor').close();ids('refreshDrafts').onclick=refresh;
 window.addEventListener('akprime-owner-ready',refresh);
 window.addEventListener('akprime-owner-logout',()=>{ids('campaignEditor').close();ids('campaignDrafts').replaceChildren();ids('commercialSuggestions').replaceChildren();current=null});
 if(!ids('workspace').hidden)refresh();
})();
