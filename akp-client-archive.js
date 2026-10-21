/* AK PRIME — Archivage local chiffré des dossiers et suppression contrôlée.
 * L'archivage conserve le dossier en Supabase (factures/contrats intactes).
 * Seuls des dossiers TEST non activés, vides de preuves et préalablement sauvegardés
 * peuvent être supprimés définitivement via une RPC propriétaire.
 */
(function(){
 'use strict';
 let archiveListMode='active';
 const verified=new Set();
 let archiveLoadingError='';
 const beforeLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
   const output=await beforeLoad.apply(this,args);
   if(authProfile?.role!=='owner'&&authProfile?.role!=='coach')return output;
   const {data,error}=await supa.from('clients')
     .select('id,archived_at,archive_reason,is_test');
   if(error){archiveLoadingError=error.message;throw Error('Statut d’archivage indisponible : '+error.message)}
   archiveLoadingError='';
   const flags=new Map((data||[]).map(x=>[x.id,x]));
   (db.clients||[]).forEach(c=>{
     const item=flags.get(c.id)||{};
     c.archivedAt=item.archived_at||'';
     c.archiveReason=item.archive_reason||'';
     c.isTest=!!item.is_test;
   });
   return output;
 };
 const olderClientsPage=clientsPage;
 clientsPage=function(){
   const all=db.clients||[];
   const count=all.filter(x=>!!x.archivedAt).length;
   try{
     db.clients=all.filter(x=>archiveListMode==='archived'?!!x.archivedAt:!x.archivedAt);
     const core=olderClientsPage();
     return '<div class="card panel" style="margin-bottom:12px"><div class="row between" style="gap:12px;flex-wrap:wrap">'+
       '<div><strong>Gestion des dossiers</strong><p class="muted tiny">Les dossiers archivés sont conservés mais masqués de la liste active.</p></div>'+
       '<div class="row" style="gap:8px">'+
       '<button class="btn '+(archiveListMode==='active'?'primary':'ghost')+' small akViewClients" data-mode="active">Clients non archivés</button>'+
       '<button class="btn '+(archiveListMode==='archived'?'primary':'ghost')+' small akViewClients" data-mode="archived">Archives ('+count+')</button>'+
       '</div></div></div>'+core;
   }finally{db.clients=all}
 };
 const oldAdmin=admin;
 admin=function(c){
   const base=oldAdmin(c);
   if(authProfile?.role!=='owner')return base;
   const isArchived=!!c.archivedAt,hasFile=verified.has(c.id);
   return base+
    '<div class="card panel" style="margin-top:14px" id="akClientArchiveActions">'+
      '<h3>Archivage et conservation du dossier</h3>'+
      '<p class="muted tiny">Télécharge une copie chiffrée des données de ce client (Passeport, cycles, tests, questionnaire, séances mentales et documents en base), puis ouvre ce fichier pour le vérifier. '+
      'Les PDF privés et les vidéos WhatsApp ne sont pas inclus dans le fichier : sauvegarde les PDF séparément.</p>'+
      '<div class="row" style="gap:9px;flex-wrap:wrap;margin:12px 0">'+
      '<button class="btn primary small" id="akExportClientDossier">1. Exporter le dossier chiffré</button>'+
      '<button class="btn ghost small" id="akVerifyClientDossier">2. Vérifier le fichier</button>'+
      '<button class="btn ghost small" id="akPrintClientPassport">Passeport en PDF</button>'+
      '</div>'+
      '<input type="file" id="akVerifyClientFile" accept=".json,application/json" style="display:none">'+
      (hasFile?'<div class="alert green">Dossier chiffré vérifié dans cette session. Tu peux procéder à son archivage.</div>':
       '<div class="alert">Vérifie le fichier enregistré sur ton ordinateur avant toute action irréversible.</div>')+
      (isArchived?
       '<div class="alert blue" style="margin-top:12px"><strong>Client archivé</strong> · '+esc(fmtDate(c.archivedAt))+
       '. Son accès client est désactivé et ses documents restent conservés dans Supabase.</div>'+
       '<button class="btn primary small" id="akRestoreArchivedClient">Restaurer dans la liste des clients</button>':
       '<div class="row" style="gap:9px;flex-wrap:wrap;margin-top:12px">'+
       '<button class="btn ghost small" id="akArchiveClient" '+(!hasFile?'disabled':'')+
       '>3. Archiver le client dans AK PRIME</button>'+
       (c.isTest?'<button class="btn danger small" id="akDeleteTestClient" '+(!hasFile?'disabled':'')+
        '>Supprimer définitivement ce dossier TEST</button>':'')+
       '</div>')+
      '<p class="muted tiny" style="margin-top:12px"><strong>Important :</strong> archiver ne supprime pas les données Supabase. '+
      'La suppression définitive est limitée aux dossiers TEST non reliés à un compte et sans pièces financières ou données à conserver.</p>'+
    '</div>';
 };
 function bytesToB64(bytes){
   let chars='';for(let i=0;i<bytes.length;i+=0x4000)
     chars+=String.fromCharCode(...bytes.subarray(i,i+0x4000));
   return btoa(chars);
 }
 function b64ToBytes(str){
   const chars=atob(str),a=new Uint8Array(chars.length);
   for(let i=0;i<a.length;i++)a[i]=chars.charCodeAt(i);
   return a;
 }
 async function derive(pass,salt){
   const seed=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
   return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},
     seed,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }
 function nameFor(c){
   const safe=String(c.name||'client').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')
     .replace(/[^A-Za-z0-9-]+/g,'-').replace(/-+/g,'-').slice(0,65)||'client';
   return 'AKPRIME-dossier-'+safe+'-'+localDateISO()+'.json';
 }
 function saveFile(object,name){
   const blob=new Blob([JSON.stringify(object)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),5000);
 }
 async function exportOne(c){
   const pass=prompt('Phrase secrète du dossier (minimum 14 caractères). Sans elle, le fichier sera illisible.');
   if(pass===null)return;
   if(pass.length<14)return alert('Utilise une phrase secrète d’au moins 14 caractères.');
   const confirmation=prompt('Confirme exactement cette phrase secrète :');
   if(confirmation!==pass)return alert('Les phrases secrètes ne correspondent pas.');
   const button=document.getElementById('akExportClientDossier');if(button)button.disabled=true;
   try{
     const {data,error}=await supa.rpc('owner_export_client_dossier',{p_client_id:c.id});
     if(error)throw Error(error.message);
     if(data?.format!=='akprime-client-dossier'||data.client_id!==c.id)
       throw Error('Données de sauvegarde invalides ou dossier incorrect.');
     const iv=crypto.getRandomValues(new Uint8Array(12)),salt=crypto.getRandomValues(new Uint8Array(16));
     const key=await derive(pass,salt);
     const bytes=new TextEncoder().encode(JSON.stringify(data));
     const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);
     const envelope={
       format:'akprime-encrypted-client',version:1,cipher:'AES-256-GCM',
       kdf:'PBKDF2-SHA256',iterations:310000,exported_at:data.exported_at,
       salt:bytesToB64(salt),iv:bytesToB64(iv),ciphertext:bytesToB64(new Uint8Array(encrypted))
     };
     saveFile(envelope,nameFor(c));
     alert('Téléchargement lancé. Enregistre le fichier en lieu sûr, puis utilise « Vérifier le fichier ». '+
       'Pour une copie lisible du Passeport, utilise aussi « Passeport en PDF ».');
   }catch(e){alert('Export impossible : '+e.message)}
   finally{if(button)button.disabled=false}
 }

 function openSavedClientViewer(data){
   const tables=data.tables||{};
   const names=Object.keys(tables).filter(k=>Array.isArray(tables[k])).sort();
   const labels={
     clients:'Fiche client',cycles:'Historique des cycles',tests:'Tests du Passeport',
     passport_events:'Événements du Passeport',questionnaire_responses:'Questionnaires',
     client_workspace:'Notes',client_video_receipts:'Vidéos WhatsApp reçues',
     client_sleep_diary:'Agenda de sommeil',client_offer_entries:'Prestations et budgets macro',
     renewals:'Renouvellements',appointments:'Visios',invoices:'Factures',
     checkout_orders:'Contrats',checkout_intents:'Parcours de commande'
   };
   modal('Dossier client sauvegardé',
     '<div class="alert green"><strong>Fichier vérifié, consultable en lecture seule.</strong>'+
     '<div class="tiny">Le fichier chiffré reste sur ton PC, aucune donnée n’est restaurée dans Supabase.</div></div>'+
     '<div class="field"><label>Partie du dossier</label><select class="select" id="akSavedArchivePart">'+
     names.map(n=>'<option value="'+esc(n)+'">'+esc(labels[n]||n.replaceAll('_',' '))+
        ' ('+tables[n].length+')</option>').join('')+'</select></div>'+
     '<div class="field"><label>Recherche</label><input class="input" id="akSavedArchiveSearch" placeholder="Cycle, test, date…"></div>'+
     '<div id="akSavedArchiveRows" class="list" style="max-height:390px;overflow:auto"></div>'+
     '<div class="alert" style="margin-top:10px">Cet export n’inclut pas le contenu des PDF privés ni les vidéos WhatsApp. '+
     'Les fichiers PDF doivent être sauvegardés séparément.</div>',
     '<button class="btn primary" id="akCloseArchiveViewer">Fermer</button>');
   const selector=document.getElementById('akSavedArchivePart');
   const search=document.getElementById('akSavedArchiveSearch');
   const area=document.getElementById('akSavedArchiveRows');
   if(names.includes('cycles'))selector.value='cycles';
   else if(names.includes('clients'))selector.value='clients';
   function refresh(){
     const rows=tables[selector.value]||[],q=search.value.trim().toLocaleLowerCase('fr');
     const matched=q?rows.filter(x=>JSON.stringify(x).toLocaleLowerCase('fr').includes(q)):rows;
     area.innerHTML='<div class="muted tiny">'+matched.length+' résultat(s) • 30 affichés maximum</div>'+
       (matched.slice(0,30).map((row,i)=>{
         const title=row?.title||row?.test_name||row?.start_date||row?.entry_date||
           row?.invoice_number||row?.first_name||'Élément '+(i+1);
         const raw=JSON.stringify(row,null,2);
         return '<details class="item" style="margin-top:8px"><summary><strong>'+esc(String(title))+
           '</strong></summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:290px;overflow:auto;font-size:12px">'+
           esc(raw.length>15000?raw.slice(0,15000)+'…':raw)+'</pre></details>';
       }).join('')||'<div class="muted tiny">Aucun élément.</div>');
   }
   selector.onchange=()=>{search.value='';refresh()};
   search.oninput=refresh;
   document.getElementById('akCloseArchiveViewer').onclick=closeModal;
   refresh();
 }
 async function verifyFile(c,file){
   if(!file)return;
   try{
     if(file.size>32000000)throw Error('Fichier trop volumineux.');
     const payload=JSON.parse(await file.text());
     if(payload.format!=='akprime-encrypted-client'||payload.version!==1
        ||payload.cipher!=='AES-256-GCM'||payload.kdf!=='PBKDF2-SHA256'
        ||payload.iterations!==310000)throw Error('Format de sauvegarde inconnu.');
     const pass=prompt('Phrase secrète utilisée pour ce fichier :');
     if(pass===null)return;
     const key=await derive(pass,b64ToBytes(payload.salt));
     const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(payload.iv)},
       key,b64ToBytes(payload.ciphertext));
     const data=JSON.parse(new TextDecoder().decode(decoded));
     if(data.product!=='AK PRIME'||data.format!=='akprime-client-dossier'||
       data.client_id!==c.id||!Array.isArray(data.tables?.clients)||
       data.tables.clients[0]?.id!==c.id)throw Error('Le fichier ne correspond pas à ce client.');
     verified.add(c.id);
     render();
     openSavedClientViewer(data);
   }catch(e){alert('Fichier non vérifié : '+e.message)}
 }
 document.addEventListener('click',async e=>{
   const view=e.target.closest?.('.akViewClients');
   if(view){archiveListMode=view.dataset.mode==='archived'?'archived':'active';render();return;}
   if(state.view!=='client'||state.tab!=='admin'||authProfile?.role!=='owner')return;
   const c=currentClient();if(!c)return;
   if(e.target.closest?.('#akExportClientDossier'))return exportOne(c);
   if(e.target.closest?.('#akVerifyClientDossier')){
     document.getElementById('akVerifyClientFile')?.click();return;
   }
   if(e.target.closest?.('#akPrintClientPassport')){
     state.tab='passport';render();window.print();return;
   }
   if(e.target.closest?.('#akArchiveClient')){
     if(!verified.has(c.id))return alert('Vérifie d’abord le fichier chiffré téléchargé.');
     const reason=prompt('Motif d’archivage (minimum 10 caractères) :');
     if(!reason||reason.trim().length<10)return;
     if(!confirm('Archiver '+c.name+' ? Son accès client sera désactivé et le dossier retiré de la liste active. Les pièces légales restent en Supabase.'))return;
     const {error}=await supa.rpc('owner_archive_client',{p_client_id:c.id,p_reason:reason.trim()});
     if(error)return alert('Archivage refusé : '+error.message);
     verified.delete(c.id);
     archiveListMode='archived';state.view='clients';state.tab='overview';
     await loadSupabaseData();render();toast('Dossier archivé et conservé.');
   }
   if(e.target.closest?.('#akRestoreArchivedClient')){
     const reason=prompt('Motif de restauration (minimum 10 caractères) :');
     if(!reason||reason.trim().length<10)return;
     const {error}=await supa.rpc('owner_restore_client_archive',{p_client_id:c.id,p_reason:reason.trim()});
     if(error)return alert('Restauration refusée : '+error.message);
     archiveListMode='active';state.view='clients';state.tab='overview';
     await loadSupabaseData();render();toast('Dossier restauré dans la liste. Son accès reste désactivé.');
   }
   if(e.target.closest?.('#akDeleteTestClient')){
     if(!verified.has(c.id))return alert('Fichier chiffré non vérifié.');
     if(!c.isTest)return alert('La suppression définitive est réservée aux dossiers TEST.');
     const word=prompt('SUPPRESSION IRRÉVERSIBLE : saisis exactement le nom complet « '+c.name+' » pour confirmer :');
     if(word!==c.name)return alert('Suppression annulée.');
     if(!confirm('Dernière confirmation : supprimer définitivement ce dossier TEST et ses données opérationnelles ?'))return;
     const {error}=await supa.rpc('owner_delete_unused_test_client',{p_client_id:c.id,p_confirm_name:word});
     if(error)return alert('Suppression interdite : '+error.message);
     verified.delete(c.id);archiveListMode='active';state.view='clients';state.tab='overview';
     state.clientId=null;await loadSupabaseData();render();toast('Dossier de test supprimé définitivement.');
   }
 },true);
 document.addEventListener('change',e=>{
   if(e.target?.id!=='akVerifyClientFile')return;
   const file=e.target.files?.[0],c=currentClient();
   e.target.value='';
   if(c&&file)verifyFile(c,file);
 },true);
 window.AKP_CLIENT_ARCHIVE_READY=true;
})();
