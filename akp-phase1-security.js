/* AK PRIME — Phase 1 : dossier test, suivi contractuel, sauvegardes propriétaires.
 * La sauvegarde est chiffrée localement avant écriture sur le disque.
 * Les comptes Supabase Auth, fichiers Storage et configurations projet restent hors export.
 */
(function(){
 'use strict';
 let testFilter='all';
 let testLoadingError='';
 const oldLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
   const result=await oldLoad.apply(this,args);
   const [clients,settings]=await Promise.all([
     supa.from('clients').select('id,is_test'),
     supa.from('app_settings').select('optitrainer_base_url').eq('id',1).maybeSingle()
   ]);
   if(clients.error){testLoadingError=clients.error.message;console.warn('Indicateurs test indisponibles',clients.error)}
   else{
     testLoadingError='';
     const flags=new Map((clients.data||[]).map(x=>[x.id,!!x.is_test]));
     for(const c of db.clients||[])c.isTest=flags.get(c.id)||false;
   }
   if(!settings.error&&settings.data?.optitrainer_base_url){
     db.settings=db.settings||{};
     db.settings.optitrainerBase=settings.data.optitrainer_base_url;
   }
   return result;
 };
 const originalBackupPage=backupPage;
 backupPage=function(){
   if(authProfile?.role!=='owner')return '<div class="page-title"><h1>Sauvegardes</h1></div><div class="alert">Les exports contenant des données clients sont réservés au propriétaire.</div>';
   return '<div class="page-title"><div><h1>Sauvegardes sécurisées</h1><p>Export propriétaire de la base AK PRIME, avec chiffrement local.</p></div></div>'+
     '<div class="grid2">'+
       '<div class="card panel"><h3>Créer une sauvegarde chiffrée</h3><p class="muted">Exporte les tables métier Supabase. Le fichier est chiffré AES-GCM avant téléchargement avec une phrase secrète que tu choisis.</p>'+
       '<button class="btn primary" id="exportOwnerEncrypted">Télécharger la sauvegarde chiffrée</button></div>'+
       '<div class="card panel"><h3>Vérifier une sauvegarde</h3><p class="muted">Déchiffre et contrôle localement un fichier, sans rien modifier dans Supabase.</p>'+
       '<button class="btn ghost" id="verifyOwnerEncrypted">Vérifier un fichier</button><input type="file" accept=".json,application/json" id="verifyOwnerInput" style="display:none"></div>'+
     '</div><div class="alert" style="margin-top:13px"><strong>Portée et limites :</strong> cet export contient des données personnelles et potentiellement des données de santé ; le fichier doit rester privé. Il ne contient ni les mots de passe Supabase Auth, ni les fichiers Storage, ni la configuration du projet. La restauration automatique est volontairement désactivée : une restauration doit d’abord être préparée et testée sans écraser les données en production. Perdre la phrase secrète rend le fichier inutilisable.</div>';
 };
 const oldRender=render;
 render=function(...args){
   const out=oldRender.apply(this,args);
   if(authProfile?.role==='owner'||authProfile?.role==='coach')enhancePhase1();
   return out;
 };
 const feedback=(s)=>{if(typeof toast==='function')toast(s);else alert(s)};
 function enhancePhase1(){
   if(state.view==='clients'){
     const toolbar=document.querySelector('.toolbar');
     if(toolbar&&!document.getElementById('testClientFilter')){
       const sel=document.createElement('select');sel.className='select';sel.id='testClientFilter';
       sel.innerHTML='<option value="all">Réels et tests</option><option value="real">Clients réels</option><option value="test">Comptes test</option>';
       sel.value=testFilter;toolbar.appendChild(sel);sel.onchange=()=>{testFilter=sel.value;filterRows()};
     }
     for(const btn of document.querySelectorAll('tr .openClient')){
       const c=(db.clients||[]).find(x=>x.id===btn.dataset.id);
       const tr=btn.closest('tr');if(!tr||!c)continue;
       tr.dataset.test=String(!!c.isTest);
       if(c.isTest&&!tr.querySelector('.akp-test-tag')){
         const tag=document.createElement('span');tag.className='status amber akp-test-tag';
         tag.textContent='TEST';tag.style.marginLeft='8px';
         tr.querySelector('td strong')?.after(tag);
       }
     }
     filterRows();
   }
   if(state.view==='dashboard'&&testLoadingError){
     const panel=document.querySelector('.content');
     if(panel&&!panel.querySelector('.testLoadError'))panel.insertAdjacentHTML('afterbegin','<div class="alert testLoadError">Le statut des dossiers tests n’a pas été chargé : '+esc(testLoadingError)+'</div>');
   }
   if(state.view==='client'){
     const c=(db.clients||[]).find(x=>x.id===state.clientId);
     if(c?.isTest){
       const heading=document.querySelector('.client-head .person .row');
       if(heading&&!heading.querySelector('.akp-test-tag'))heading.insertAdjacentHTML('beforeend','<span class="status amber akp-test-tag">DOSSIER TEST</span>');
     }
     if(state.tab==='admin'&&c&&authProfile?.role==='owner'){
       const container=document.querySelector('.content .grid2');
       if(container&&!document.getElementById('testClientActions')){
         const box=document.createElement('div');box.className='card panel';box.id='testClientActions';box.style.cssText='margin-top:13px';
         box.innerHTML='<h3>Protection du dossier</h3><p class="muted tiny">Les dossiers tests doivent être clairement identifiés ; ils ne doivent pas générer de facturation réelle.</p>'+
           '<button class="btn ghost small" id="toggleTestClient">'+(c.isTest?'Retirer le statut TEST':'Marquer comme dossier TEST')+'</button>'+
           '<button class="btn ghost small" style="margin-left:8px" id="auditClientHistory">Historique des modifications sensibles</button>';
         container.after(box);
         document.getElementById('toggleTestClient').onclick=async()=>{
           if(!confirm(c.isTest?'Ce dossier sera considéré comme un client réel. Confirmer ?':'Marquer ce dossier comme fictif / de test ?'))return;
           const {error}=await supa.from('clients').update({is_test:!c.isTest}).eq('id',c.id);
           if(error)return feedback('Erreur : '+error.message);
           await loadSupabaseData();render();feedback('Statut du dossier actualisé.');
         };
         document.getElementById('auditClientHistory').onclick=()=>showAudit(c.id);
       }
     }
   }
   if(state.view==='backup'&&authProfile?.role==='owner'){
     document.getElementById('exportOwnerEncrypted')?.addEventListener('click',encryptedExport);
     const input=document.getElementById('verifyOwnerInput');
     document.getElementById('verifyOwnerEncrypted')?.addEventListener('click',()=>input?.click());
     if(input)input.onchange=()=>verifyLocalBackup(input.files?.[0]);
   }
 }
 function filterRows(){
   document.querySelectorAll('tr[data-test]').forEach(tr=>{
     tr.hidden=(testFilter==='test'&&tr.dataset.test!=='true')||(testFilter==='real'&&tr.dataset.test==='true');
   });
 }
 async function showAudit(id){
   const {data,error}=await supa.from('client_change_audit').select('changed_at,changed_by,old_values,new_values').eq('client_id',id).order('changed_at',{ascending:false}).limit(60);
   if(error)return feedback('Historique indisponible : '+error.message);
   const rows=(data||[]).map(row=>{
     const old=row.old_values||{},next=row.new_values||{};
     const differences=Object.keys(next).filter(k=>JSON.stringify(old[k])!==JSON.stringify(next[k]));
     return '<div class="item"><strong>'+esc(new Date(row.changed_at).toLocaleString('fr-FR'))+'</strong><div class="muted tiny">Modifications : '+esc(differences.join(' • ')||'—')+'</div><div class="muted tiny">Auteur : '+esc(row.changed_by?'Utilisateur connecté':'Système')+'</div></div>';
   }).join('');
   modal('Historique des modifications',rows||'<p class="muted">Aucune modification sensible enregistrée depuis l’activation du journal.</p>','<button class="btn primary" id="phase1CloseAudit">Fermer</button>');
   document.getElementById('phase1CloseAudit').onclick=closeModal;
 }
 function bytesToBase64(bytes){
   let b='';for(let i=0;i<bytes.length;i+=32768)b+=String.fromCharCode(...bytes.subarray(i,i+32768));
   return btoa(b);
 }
 function base64ToBytes(str){const raw=atob(str);const a=new Uint8Array(raw.length);for(let i=0;i<a.length;i++)a[i]=raw.charCodeAt(i);return a}
 async function deriveKey(pass,salt){
   const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
   return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }
 function downloadJSON(payload,name){
   const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 async function encryptedExport(){
   const pass=prompt('Choisis une phrase secrète de sauvegarde (minimum 14 caractères). Ne la communique à personne : sans elle, la restauration du fichier sera impossible.');
   if(pass===null)return;
   if(pass.length<14)return feedback('Phrase secrète trop courte.');
   const confirmation=prompt('Confirme la phrase secrète pour éviter une erreur de saisie :');
   if(confirmation!==pass)return feedback('Les phrases secrètes ne correspondent pas.');
   const button=document.getElementById('exportOwnerEncrypted');if(button)button.disabled=true;
   try{
     const {data,error}=await supa.rpc('owner_export_backup');
     if(error)throw Error(error.message);
     if(!data||data.product!=='AK PRIME'||!data.tables)throw Error('Contenu de sauvegarde invalide.');
     const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
     const key=await deriveKey(pass,salt);
     const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data)));
     const result={format:'akprime-encrypted-backup',version:1,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:310000,exported_at:data.exported_at,salt:bytesToBase64(salt),iv:bytesToBase64(iv),ciphertext:bytesToBase64(new Uint8Array(ciphertext))};
     downloadJSON(result,'akprime-sauvegarde-chiffree-'+new Date().toISOString().slice(0,10)+'.json');
     feedback('Sauvegarde chiffrée téléchargée. Conserve deux copies privées et vérifie le fichier avec le bouton prévu.');
   }catch(e){feedback('Échec de sauvegarde : '+e.message)}
   finally{if(button)button.disabled=false}
 }
 async function verifyLocalBackup(file){
   if(!file)return;
   try{
     const payload=JSON.parse(await file.text());
     if(payload.format!=='akprime-encrypted-backup'||payload.version!==1||payload.cipher!=='AES-256-GCM'||payload.kdf!=='PBKDF2-SHA256'||payload.iterations!==310000)throw Error('Format ou version non pris en charge.');
     const pass=prompt('Phrase secrète du fichier de sauvegarde :');if(pass===null)return;
     const key=await deriveKey(pass,base64ToBytes(payload.salt));
     const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(payload.iv)},key,base64ToBytes(payload.ciphertext));
     const data=JSON.parse(new TextDecoder().decode(clear));
     if(data.product!=='AK PRIME'||data.schema_version!==1||!data.tables)throw Error('Format interne invalide.');
     const count=Object.keys(data.tables).length;
     feedback('Fichier vérifié avec succès : '+count+' tables, sauvegarde du '+new Date(data.exported_at).toLocaleString('fr-FR')+'. Aucune donnée modifiée.');
   }catch(e){feedback('Vérification impossible : mot de passe incorrect, fichier endommagé ou format inconnu. '+e.message)}
 }
})();
