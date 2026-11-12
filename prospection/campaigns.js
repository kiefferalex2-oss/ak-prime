'use strict';
(()=>{
 const $=id=>document.getElementById(id),api=db;
 const labels={draft:'À valider',approved:'Validé · en attente du prochain passage',rejected:'Refusé',publishing:'Publication en cours',published:'Publié',uncertain:'À vérifier, aucune relance automatique'};
 let current=null,blob=null,previewURL=null,dirty=false,busy=false;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 const assetAllowed=url=>typeof url==='string'&&url.startsWith('https://gptvgldboqarfklorjip.supabase.co/storage/v1/object/public/akprime-promotion/');
 function status(text){$('campaignStatus').textContent=text}
 function preview(url){$('campaignVisual').hidden=!url;if(url)$('campaignVisual').src=url;else $('campaignVisual').removeAttribute('src')}
 function clearBlob(){if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;blob=null}
 async function refresh(){
  const {data,error}=await api.from('prospection_drafts').select('*').order('created_at',{ascending:false}).limit(100);
  for(const id of ['campaignDrafts','commercialSuggestions'])$(id).replaceChildren();
  if(error){$('campaignDrafts').textContent='Impossible de charger les propositions.';return}
  for(const d of data){
   if(d.status==='rejected')continue;
   const card=el('article',undefined,'campaignCard'),description=el('div');
   if(d.kind==='publication'&&assetAllowed(d.asset_url)){const image=el('img');image.src=d.asset_url;image.alt='Visuel de '+d.title;card.append(image)}
   description.append(el('h3',d.title),el('p',(d.kind==='publication'?d.channel+' · ':'')+labels[d.status],'small muted'),el('pre',d.body));
   const button=el('button','Examiner','secondary');button.onclick=()=>open(d);description.append(button);
   if(d.published_url){try{const u=new URL(d.published_url);if(u.protocol==='https:'){const a=el('a','Voir la publication');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';description.append(a)}}catch{}}
   card.append(description);$(d.kind==='publication'?'campaignDrafts':'commercialSuggestions').append(card);
  }
  if(!$('campaignDrafts').children.length)$('campaignDrafts').textContent='Aucune publication en attente. Ajoutez votre visuel et le texte validé ensemble.';
  if(!$('commercialSuggestions').children.length)$('commercialSuggestions').textContent='Aucune suggestion en attente.';
 }
 function open(d=null){
  clearBlob();current=d?{...d}:null;dirty=false;
  $('campaignTitle').value=d?.title||'';$('campaignBody').value=d?.body||'';$('campaignFile').value='';
  $('campaignChannel').value=d?.channel==='instagram'?'instagram':'facebook';$('campaignPole').value=d?.pole||'performance';
  const suggestion=d?.kind==='suggestion',locked=d&&['publishing','published','uncertain'].includes(d.status);
  $('campaignDestination').textContent=suggestion?'Suggestion : aucune action ni dépense automatique.':'Facebook : AK PRIME · Instagram : akprime.fr. Rien ne part avant votre validation.';
  $('campaignReason').textContent=d?.rationale||'';
  for(const id of ['campaignTitle','campaignBody','campaignFile','campaignChannel','campaignPole','saveCampaign','rejectCampaign','approveCampaign'])$(id).disabled=!!locked;
  $('campaignChannel').disabled=!!locked||suggestion;$('campaignPole').disabled=!!d;
  $('campaignFile').hidden=suggestion;$('downloadCampaign').hidden=suggestion||!assetAllowed(d?.asset_url);
  preview(assetAllowed(d?.asset_url)?d.asset_url:null);status(d?labels[d.status]:'Ajoutez un texte et un visuel. Enregistrez puis validez cette version.');
  $('campaignEditor').showModal();
 }
 async function update(changes){
  const {data,error}=await api.from('prospection_drafts').update(changes).eq('id',current.id).eq('updated_at',current.updated_at).select('*');
  if(error||!data?.length)throw Error('Cette proposition a changé ou n’a pas pu être enregistrée. Actualisez avant de poursuivre.');
  current=data[0];return current;
 }
 async function save(){
  const title=$('campaignTitle').value.trim(),body=$('campaignBody').value.trim();
  if(title.length<4||body.length<40)throw Error('Indiquez un titre (4 caractères minimum) et le texte complet (40 caractères minimum).');
  const channel=current?.kind==='suggestion'?'strategy':$('campaignChannel').value;
  if(current)await update({title,body,channel,status:'draft'});
  else{
   const row={batch_key:'manual-'+crypto.randomUUID(),kind:'publication',channel,pole:$('campaignPole').value,target_label:'AK PRIME',title,body,visual_title:'',visual_points:'',rationale:'Texte et visuel fournis puis validés par le propriétaire.'};
   const {data,error}=await api.from('prospection_drafts').insert(row).select('*').single();
   if(error)throw Error('Impossible de créer la publication.');current=data;
  }
  dirty=false;await refresh();status('Enregistré. Relisez le texte et l’aperçu avant de valider.');
 }
 for(const id of ['campaignTitle','campaignBody','campaignChannel'])$(id).oninput=()=>{dirty=true;status('Modifications non enregistrées : la validation précédente sera annulée à l’enregistrement.');$('approveCampaign').disabled=false};
 $('campaignFile').onchange=async()=>{
  const file=$('campaignFile').files[0];if(!file)return;
  if(busy)return;busy=true;$('approveCampaign').disabled=true;
  try{
   if(current)await update({status:'draft',asset_url:null});
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15000000)throw Error('Choisissez une image JPEG, PNG ou WebP de moins de 15 Mo.');
   const bitmap=await createImageBitmap(file),ratio=bitmap.width/bitmap.height;
   if(ratio<.8||ratio>1.91){bitmap.close();throw Error('Le visuel doit être entre le format 4:5 et le format paysage 1,91:1 pour une publication Instagram.');}
   const scale=Math.min(1,1440/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
   canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
   if(!jpeg||jpeg.size>3000000)throw Error('Le fichier préparé est trop lourd. Réduisez la taille de votre image.');
   // Revoke any previous approval immediately, even before uploading a replacement.
   clearBlob();blob=jpeg;previewURL=URL.createObjectURL(jpeg);preview(previewURL);$('approveCampaign').disabled=false;
   status('Votre visuel est chargé. L’aperçu est le JPEG exact prévu pour la publication.');
  }catch(e){status(e.message);$('campaignFile').value=''}finally{busy=false;$('approveCampaign').disabled=false}
 };
 $('saveCampaign').onclick=async()=>{if(busy)return;busy=true;try{await save()}catch(e){status(e.message)}finally{busy=false}};
 $('approveCampaign').onclick=async()=>{
  if(busy)return;busy=true;$('approveCampaign').disabled=true;
  try{
   if(dirty||!current)await save();
   if(current.kind==='publication'){
    if(blob){const path=current.id+'/'+crypto.randomUUID()+'.jpg';const {error}=await api.storage.from('akprime-promotion').upload(path,blob,{contentType:'image/jpeg',upsert:false});
     if(error)throw Error('Enregistrement du visuel impossible. Rien n’a été publié.');
     const {data}=api.storage.from('akprime-promotion').getPublicUrl(path);await update({asset_url:data.publicUrl});clearBlob();preview(data.publicUrl);
    }
    if(!assetAllowed(current.asset_url))throw Error('Ajoutez votre visuel avant de valider.');
   }
   await update({status:'approved'});await refresh();
   status(current.kind==='suggestion'?'Suggestion retenue, sans exécution automatique.':'Version validée. Publication prévue au prochain passage automatique, dans un délai indicatif d’une heure.');
  }catch(e){status(e.message)}finally{busy=false;$('approveCampaign').disabled=false}
 };
 $('rejectCampaign').onclick=async()=>{try{if(current)await update({status:'rejected'});$('campaignEditor').close();clearBlob();await refresh()}catch(e){status(e.message)}};
 $('downloadCampaign').onclick=()=>{if(!assetAllowed(current?.asset_url))return;const a=el('a');a.href=current.asset_url;a.target='_blank';a.rel='noopener noreferrer';a.click()};
 $('closeCampaign').onclick=()=>{$('campaignEditor').close();clearBlob()};$('newCampaign').onclick=()=>open();$('refreshDrafts').onclick=refresh;
 window.addEventListener('akprime-owner-ready',refresh);
 window.addEventListener('akprime-owner-logout',()=>{$('campaignEditor').close();clearBlob();current=null;$('campaignDrafts').replaceChildren();$('commercialSuggestions').replaceChildren()});
 if(!$('workspace').hidden)refresh();
})();
