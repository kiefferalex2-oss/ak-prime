/* AK PRIME — Gestion explicite des statuts, des offres et de leur historique.
 * Les fonctions RPC gèrent les modifications réelles ; aucun prix, contrat ni
 * paiement n'est modifié automatiquement lors d'un changement de formule. */
(function(){
 'use strict';
 const OWNER=()=>authProfile?.role==='owner';
 const labels={active:'Actif',inactive:'Inactif',onboarding:'Onboarding',paused:'Pause',prospect:'Prospect'};
 const catalog={
  'Performance':['P1','P2','P3'],
  'Forme & Santé':['Standard','Renforcé'],
  'Mental':['Particulier','Sportif']
 };
 const archived=c=>!!c.archivedAt;
 const oldLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
   const result=await oldLoad.apply(this,args);
   if(!authUser?.id||!OWNER())return result;
   const {data,error}=await supa.from('client_change_audit')
    .select('id,client_id,changed_at,changed_by,change_source,old_values,new_values,reason')
    .order('changed_at',{ascending:false}).limit(1500);
   if(error)throw Error('Historique des décisions indisponible : '+error.message);
   db.clientDecisionHistory=data||[];
   return result;
 };
 function changeDescription(row){
   const before=row.old_values||{},after=row.new_values||{};
   if(before.current_offer!==after.current_offer)
     return 'Formule : '+String(before.current_offer||'—')+' → '+String(after.current_offer||'—');
   if(before.status!==after.status)
     return 'Statut : '+(labels[before.status]||before.status||'—')+
       ' → '+(labels[after.status]||after.status||'—');
   if(before.portal_access_enabled!==after.portal_access_enabled)
     return 'Accès portail : '+(after.portal_access_enabled?'activé':'désactivé');
   if(before.payment_status!==after.payment_status)
     return 'Paiement indiqué : '+String(before.payment_status||'—')+' → '+String(after.payment_status||'—');
   return 'Mise à jour administrative';
 }
 function decisionHistory(c){
   const entries=(db.clientDecisionHistory||[]).filter(x=>x.client_id===c.id)
     .filter(x=>x.old_values?.status!==x.new_values?.status||
       x.old_values?.current_offer!==x.new_values?.current_offer||
       x.old_values?.portal_access_enabled!==x.new_values?.portal_access_enabled||
       x.old_values?.payment_status!==x.new_values?.payment_status);
   if(!OWNER())return '';
   return '<details class="card panel" style="margin-top:14px" open>'+
     '<summary style="cursor:pointer;font-weight:700">Historique des statuts, offres et motifs ('+entries.length+')</summary>'+
     '<div class="muted tiny" style="margin:8px 0">Les motifs sont conservés dans Supabase et associés à la décision. '+
     'Pour certains changements anciens, aucun motif n’avait été enregistré.</div>'+
     (entries.length?'<div class="list">'+entries.slice(0,45).map(x=>
       '<div class="item"><div class="row between"><strong>'+esc(changeDescription(x))+'</strong>'+
       '<span class="muted tiny">'+esc(fmtDateTime(x.changed_at))+'</span></div>'+
       '<div class="tiny" style="margin-top:7px"><strong>Motif :</strong> '+esc(x.reason||'Aucun motif enregistré à cette date')+'</div></div>'
     ).join('')+'</div>':'<div class="muted">Aucun changement de statut ou de formule enregistré.</div>')+
     '</details>';
 }
 function buttons(c){
   if(archived(c))return '<p class="muted tiny">Ce dossier est archivé. Restaure-le avant de modifier son statut ou sa formule.</p>';
   let ops='';
   if(c.status==='Pause'){
     ops='<button class="btn primary small akResumeClient" data-id="'+esc(c.id)+'">Reprendre l’accompagnement</button>';
   }else{
     if(c.status!=='Actif')ops+='<button class="btn primary small akManageStatus" data-to="active">Passer en Actif</button>';
     if(c.status!=='Onboarding'&&c.status!=='Actif'&&c.status!=='Inactif')
       ops+='<button class="btn ghost small akManageStatus" data-to="onboarding">Remettre en Onboarding</button>';
     if(c.status!=='Inactif')ops+='<button class="btn ghost small akManageStatus" data-to="inactive">Passer en Inactif</button>';
     if(['Actif','Onboarding'].includes(c.status))
       ops+='<button class="btn ghost small akPauseClient" data-id="'+esc(c.id)+'">Mettre en pause</button>';
     if(c.status==='Inactif')ops+='<span class="muted tiny">Pour mettre ce dossier en pause, réactive-le d’abord. Pause et inactivité sont deux situations différentes.</span>';
   }
   return ops;
 }
 const oldAdmin=admin;
 admin=function(c){
   let html=oldAdmin(c);
   if(!c||!OWNER())return html;
   // Remplacer les anciennes modifications libres par des actions tracées.
   html=html.replace(/<div class="field"><label>Offre<\/label><input class="input pathSave" data-path="offer"[^>]*><\/div>/,
     '<div class="field"><label>Formule actuelle</label>'+
     '<div class="alert blue">'+esc(c.pole)+' — '+esc(c.offer)+'</div></div>');
   html=html.replace(/<button class="btn danger small" id="archiveClient"[^>]*>[^<]*<\/button>/g,'');
   // L'ancien bouton TEST dépendait d'un fichier JSON chiffré : la suppression
   // sûre d'un dossier TEST vide est désormais accessible directement ici.
   html=html.replace(/<button class="btn danger small" style="margin-top:10px" id="akDeleteTestClient"[^>]*>[^<]*<\/button>/g,'');
   const obsolete='<div class="card panel" style="margin-top:13px"><h3>Pause de l’accompagnement</h3>';
   const ix=html.lastIndexOf(obsolete);
   if(ix>=0)html=html.slice(0,ix); // ancienne section en fin de fiche, devenue redondante
   const options=(catalog[c.pole]||[]).filter(x=>x!==c.offer);
   const actions=buttons(c);
   const hint=c.status==='Inactif'?
     'Le client est inactif : utilise « Passer en Actif » si l’accompagnement reprend. Tu pourras ensuite le mettre en pause.':
     c.status==='Pause'?'Le dossier est en pause, sans prolongation ni arrêt de facturation automatique.':
     c.status==='Actif'?'Tu peux suspendre temporairement le suivi ou rendre le client inactif, avec un motif.':
     'Gère les changements ci-dessous ; une pause reste distincte d’un arrêt définitif.';
   const main='<div class="card panel" style="margin-bottom:14px" id="akClientManagement">'+
     '<h3>Gérer le dossier client</h3>'+
     '<p class="muted tiny">Statut actuel : <strong>'+esc(c.status)+'</strong>. '+esc(hint)+'</p>'+
     '<div class="row" style="gap:9px;flex-wrap:wrap;margin-top:12px">'+actions+'</div>'+
     '<div class="section-title">Modifier la formule</div>'+
     '<p class="muted tiny">Offre actuelle : <strong>'+esc(c.pole)+' — '+esc(c.offer)+'</strong>. '+
     'Le changement ne modifie jamais automatiquement les factures, paiements, engagements ou preuves contractuelles.</p>'+
     (options.length&&!archived(c)?
      '<button class="btn ghost small akChangeOffer">Changer de formule</button>':
      '<div class="muted tiny">Aucune autre formule disponible pour ce dossier.</div>')+
     '<div class="section-title">Archiver ou supprimer</div>'+
     '<div class="row" style="gap:9px;flex-wrap:wrap">'+
     (!archived(c)?'<button class="btn ghost small akGoArchive">Archiver le dossier (Passeport PDF)</button>':'')+
     (c.isTest&&!archived(c)?'<button class="btn danger small akDeleteEmptyTest">Supprimer définitivement ce dossier TEST vide</button>':
       !archived(c)&&['Inactif','Onboarding','Prospect'].includes(c.status)&&!c.authUserId?
       '<button class="btn danger small akDiscardDraft">Supprimer un brouillon créé par erreur</button>':'')+
     '</div>'+
     '<p class="muted tiny" style="margin-top:8px">'+
     (c.isTest?'La suppression définitive n’est autorisée que si aucun document, paiement, compte ou suivi n’est à conserver.':
       'Un dossier inactif / onboarding, sans contrat, compte ni suivi, peut être supprimé après confirmation. Pour un vrai client accompagné, on archive plutôt que supprimer.')+
     '</p></div>';
   return main+html+decisionHistory(c);
 };
 function statusModal(c,target){
   const targetLabels={active:'Actif',inactive:'Inactif',onboarding:'Onboarding'};
   modal('Changer le statut — '+esc(c.name),
    '<div class="alert blue">Statut : <strong>'+esc(c.status)+'</strong> → <strong>'+esc(targetLabels[target])+'</strong>. '+
    'Le contrat, la facturation, la fin d’engagement et l’accès au portail ne sont pas modifiés automatiquement.</div>'+
    '<div class="field" style="margin-top:12px"><label>Motif obligatoire</label>'+
    '<textarea id="akStatusReason" class="textarea" maxlength="1000" rows="3" placeholder="Ex. Fin de l’accompagnement à la demande du client"></textarea></div>',
    '<button class="btn ghost" id="akStatusCancel">Annuler</button>'+
    '<button class="btn primary" id="akStatusConfirm">Confirmer le statut</button>');
   document.getElementById('akStatusCancel').onclick=closeModal;
   document.getElementById('akStatusConfirm').onclick=async()=>{
     const reason=document.getElementById('akStatusReason').value.trim();
     if(reason.length<10)return alert('Saisis un motif de 10 caractères minimum.');
     const button=document.getElementById('akStatusConfirm');button.disabled=true;
     const {error}=await supa.rpc('owner_change_client_status',{
       p_client_id:c.id,p_status:target,p_reason:reason
     });
     if(error){button.disabled=false;return alert('Changement refusé : '+error.message)}
     closeModal();await loadSupabaseData();render();toast('Statut et motif enregistrés.');
   };
 }
 function offerModal(c){
   const choices=(catalog[c.pole]||[]).filter(o=>o!==c.offer);
   if(!choices.length)return alert('Aucune autre formule disponible dans ce pôle.');
   modal('Changer la formule — '+esc(c.name),
    '<div class="alert blue">Formule actuelle : <strong>'+esc(c.pole)+' — '+esc(c.offer)+'</strong>. '+
    'La nouvelle formule sera immédiatement affichée dans le dossier et ses droits AK PRIME seront adaptés. '+
    'Le prix facturé, les paiements, l’engagement et les documents contractuels ne changent pas automatiquement.</div>'+
    '<div class="field" style="margin-top:12px"><label>Nouvelle formule</label>'+
    '<select class="select" id="akNewOffer">'+choices.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></div>'+
    '<div class="field"><label>Motif et référence de l’accord du client</label>'+
    '<textarea class="textarea" id="akOfferReason" maxlength="1000" rows="3" placeholder="Ex. Accord écrit reçu par e-mail le… pour passage de P2 à P3"></textarea></div>'+
    '<label class="field" style="display:flex;gap:9px;align-items:flex-start">'+
    '<input type="checkbox" id="akOfferAgreed"><span>Je confirme que le client a donné son accord sur la nouvelle formule et que la régularisation contractuelle/financière sera traitée séparément si nécessaire.</span></label>'+
    '<div class="muted tiny">Pour un changement de pôle, établir un nouveau parcours adapté plutôt que modifier le pôle en silence.</div>',
    '<button class="btn ghost" id="akOfferCancel">Annuler</button>'+
    '<button class="btn primary" id="akOfferConfirm">Enregistrer la nouvelle formule</button>');
   document.getElementById('akOfferCancel').onclick=closeModal;
   document.getElementById('akOfferConfirm').onclick=async()=>{
     const offer=document.getElementById('akNewOffer').value;
     const reason=document.getElementById('akOfferReason').value.trim();
     const agreed=document.getElementById('akOfferAgreed').checked;
     if(reason.length<10)return alert('Renseigne le motif et une référence à l’accord du client.');
     if(!agreed)return alert('Confirme l’accord du client avant de modifier son offre.');
     if(!confirm('Confirmer la formule '+offer+' ? Cela change immédiatement les outils du dossier, mais pas les paiements ni les contrats.'))return;
     const button=document.getElementById('akOfferConfirm');button.disabled=true;
     const {error}=await supa.rpc('owner_change_client_offer',{
       p_client_id:c.id,p_offer:offer,p_reason:reason,p_agreement_confirmed:true
     });
     if(error){button.disabled=false;return alert('Changement d’offre refusé : '+error.message)}
     closeModal();await loadSupabaseData();render();
     toast('Nouvelle formule enregistrée. Vérifie les documents et la facturation.');
   };
 }
 document.addEventListener('click',async e=>{
   const st=e.target.closest?.('.akManageStatus'),
     off=e.target.closest?.('.akChangeOffer'),
     archive=e.target.closest?.('.akGoArchive'),
     del=e.target.closest?.('.akDeleteEmptyTest'),
     draft=e.target.closest?.('.akDiscardDraft');
   if(!st&&!off&&!archive&&!del&&!draft)return;
   if(state.view!=='client'||!OWNER())return;
   e.preventDefault();e.stopImmediatePropagation();
   const c=currentClient();if(!c)return;
   if(st)return statusModal(c,st.dataset.to);
   if(off)return offerModal(c);
   if(archive){
     document.getElementById('akClientArchiveActions')?.scrollIntoView({behavior:'smooth',block:'start'});
     return;
   }
   if(draft){
     if(!['Inactif','Onboarding','Prospect'].includes(c.status))
       return alert('Cette opération est réservée aux dossiers brouillons inactifs ou en onboarding.');
     if(c.authUserId||c.portalAccessEnabled)
       return alert('Ce dossier possède un compte client : archive-le plutôt que le supprimer.');
     const name=prompt('Suppression définitive du brouillon : saisis exactement « '+c.name+' » pour confirmer :');
     if(name!==c.name)return;
     if(!confirm('Confirme-tu qu’aucun contrat n’a été signé et qu’aucune prestation n’a été réalisée pour ce dossier ?'))return;
     if(!confirm('Dernière confirmation : supprimer définitivement ce brouillon ? Supabase bloquera toute suppression si des données importantes sont présentes.'))return;
     const {error}=await supa.rpc('owner_discard_empty_draft_client',{
       p_client_id:c.id,p_confirm_name:name,p_no_client_service:true
     });
     if(error)return alert('Suppression refusée : '+error.message+
       '\\nCe dossier peut être archivé à la place.');
     state.view='clients';state.clientId=null;state.tab='overview';
     await loadSupabaseData();render();toast('Brouillon vide supprimé.');
     return;
   }
   if(del){
     if(!c.isTest)return alert('La suppression définitive est réservée aux dossiers TEST non activés.');
     const name=prompt('Suppression irréversible : saisis le nom complet « '+c.name+' » pour confirmer :');
     if(name!==c.name)return;
     if(!confirm('Supprimer définitivement ce dossier TEST ? Supabase refusera si des données à conserver sont présentes.'))return;
     const {error}=await supa.rpc('owner_delete_unused_test_client',{
       p_client_id:c.id,p_confirm_name:name
     });
     if(error)return alert('Suppression bloquée : '+error.message+'\nTu peux toujours archiver ce dossier.');
     state.view='clients';state.clientId=null;state.tab='overview';
     await loadSupabaseData();render();toast('Dossier TEST vide supprimé.');
   }
 },true);
 window.AKP_CLIENT_MANAGEMENT_READY=true;
})();