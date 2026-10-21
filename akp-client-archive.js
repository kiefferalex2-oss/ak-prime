/* AK PRIME — Archivage local chiffré des dossiers et suppression contrôlée.
 * L'archivage conserve le dossier en Supabase (factures/contrats intactes).
 * Seuls des dossiers TEST non activés, vides de preuves et préalablement sauvegardés
 * peuvent être supprimés définitivement via une RPC propriétaire.
 */
(function(){
 'use strict';
 let archiveListMode='active';
 const verified=new Set();
 const pdfConfirmed=new Set();
 let archiveLoadingError='';
 const beforeLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
   const output=await beforeLoad.apply(this,args);
   if(authProfile?.role!=='owner'&&authProfile?.role!=='coach')return output;
   const [flagsRes,resumeRes]=await Promise.all([
     supa.from('clients').select('id,archived_at,archive_reason,is_test'),
     supa.from('client_archive_resume').select('*')
   ]);
   const {data,error}=flagsRes;
   if(resumeRes.error)throw Error('Fiches de reprise indisponibles : '+resumeRes.error.message);
   db.clientArchiveResume=resumeRes.data||[];
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
     const core=archiveListMode==='archived'?
       '<div class="grid2">'+db.clients.map(c=>{
         const snapshot=(db.clientArchiveResume||[]).find(x=>x.client_id===c.id);
         const cycle=snapshot?.last_cycle||{};
         const tests=(Array.isArray(snapshot?.last_tests)?snapshot.last_tests:[]).slice(0,3);
         return '<div class="card panel"><div class="row between"><div><h3>'+esc(c.name)+'</h3>'+
           '<div class="muted tiny">'+esc(c.pole)+' • '+esc(c.offer)+' • Archivé le '+
           esc(fmtDate(String(c.archivedAt||'').slice(0,10)))+'</div></div>'+
           '<span class="status amber">ARCHIVÉ</span></div>'+
           '<div style="margin-top:12px"><strong>Dernier cycle : </strong>'+esc(cycle.title||'Non renseigné')+'</div>'+
           '<div class="tiny" style="margin-top:7px"><strong>Objectifs :</strong> '+esc(snapshot?.goal_summary||'À compléter')+'</div>'+
           '<div class="tiny" style="margin-top:7px"><strong>Vigilance :</strong> '+esc(snapshot?.attention_points||'Aucune enregistrée')+'</div>'+
           '<div class="tiny muted" style="margin-top:7px"><strong>Derniers tests :</strong> '+
             (tests.length?tests.map(t=>esc(t.test_name)+': '+esc(t.result_value??t.result_text??'—')+
               ' '+esc(t.unit||'')).join(' • '):'Aucun')+'</div>'+
           '<button class="btn primary small openClient" data-id="'+esc(c.id)+
           '" data-tab-target="admin" style="margin-top:13px">Ouvrir / réactiver le dossier</button></div>';
       }).join('')+'</div>':olderClientsPage();
     return '<div class="card panel" style="margin-bottom:12px"><div class="row between" style="gap:12px;flex-wrap:wrap">'+
       '<div><strong>Gestion des dossiers</strong><p class="muted tiny">Les dossiers archivés sont conservés mais masqués de la liste active.</p></div>'+
       '<div class="row" style="gap:8px">'+
       '<button class="btn '+(archiveListMode==='active'?'primary':'ghost')+' small akViewClients" data-mode="active">Clients non archivés</button>'+
       '<button class="btn '+(archiveListMode==='archived'?'primary':'ghost')+' small akViewClients" data-mode="archived">Archives ('+count+')</button>'+
       '</div></div></div>'+core;
   }finally{db.clients=all}
 };

 const originalPassportModel=passportModelFromCoach;
 passportModelFromCoach=function(c){
   const model=originalPassportModel(c);
   model.archiveResume=(db.clientArchiveResume||[]).find(x=>x.client_id===c.id)||null;
   return model;
 };
 const originalPassportOverview=passportOverviewPage;
 passportOverviewPage=function(m){
   const original=originalPassportOverview(m);
   const resume=m.archiveResume;
   if(!resume)return original;
   const tests=Array.isArray(resume.last_tests)?resume.last_tests.slice(0,6):[];
   const lastCycle=resume.last_cycle||{};
   const intro='<div class="akp-panel" style="margin-bottom:14px;padding:18px">'+
     '<div class="akp-label">POINT DE REPRISE • DERNIER ARCHIVAGE</div>'+
     '<h3>Reprendre là où le Passeport s’était arrêté</h3>'+
     '<p class="muted tiny">Repères conservés le '+esc(fmtDate(String(resume.saved_at||'').slice(0,10)))+
     '. Le Passeport et ses évaluations historiques restent accessibles ci-dessous.</p>'+
     '<div class="grid2">'+
     '<div><strong>Dernier cycle</strong><div class="tiny">'+esc(lastCycle.title||'À définir')+
     ' · '+esc(fmtDate(lastCycle.start))+' → '+esc(fmtDate(lastCycle.end))+'</div></div>'+
     '<div><strong>Priorité précédente</strong><div class="tiny">'+esc(resume.goal_summary||'Non renseignée')+'</div></div>'+
     '<div><strong>Points de vigilance</strong><div class="tiny">'+esc(resume.attention_points||'Non renseignés')+'</div></div>'+
     '<div><strong>Derniers tests</strong><div class="tiny">'+
       (tests.length?tests.map(t=>esc(t.test_name)+' : '+esc(t.result_value??t.result_text??'—')+' '+esc(t.unit||'')).join(' • '):
         'Aucun test enregistré')+'</div></div></div></div>';
   return original.replace('<div class="akp-page">','<div class="akp-page">'+intro);
 };
 const oldAdmin=admin;
 admin=function(c){
   const base=oldAdmin(c);
   if(authProfile?.role!=='owner')return base;
   const isArchived=!!c.archivedAt,hasFile=verified.has(c.id),hasPdf=pdfConfirmed.has(c.id);
   const summary=(db.clientArchiveResume||[]).find(x=>x.client_id===c.id);
   const pdfInstructions='<div class="alert blue" style="margin-top:10px">'+
     '<strong>Archive lisible :</strong> le bouton ouvre le Passeport complet dans une fenêtre adaptée à l’impression. '+
     'Choisis ensuite « Imprimer » puis « Enregistrer au format PDF » pour conserver le fichier sur ton PC.</div>';
   return base+
    '<div class="card panel" style="margin-top:14px" id="akClientArchiveActions">'+
      '<h3>Archivage du client</h3>'+
      '<p class="muted tiny">Conserve le Passeport en PDF sur ton PC. AK PRIME garde une fiche de reprise synthétique : '+
      'objectifs, vigilance, derniers résultats, cycles et jalons. Le dossier complet reste préservé en base '+
      'pour permettre une réouverture sans perdre l’historique ni les documents légaux.</p>'+
      '<div class="row" style="gap:9px;flex-wrap:wrap;margin:12px 0">'+
      '<button class="btn primary small" id="akPrintClientPassport">1. Exporter le Passeport en PDF</button>'+
      '</div>'+pdfInstructions+
      '<label class="field" style="display:flex;gap:9px;align-items:flex-start;margin:14px 0 7px">'+
       '<input type="checkbox" id="akPdfSavedConfirm" '+(hasPdf?'checked':'')+'>'+
       '<span>J’ai bien enregistré et vérifié le PDF sur mon ordinateur.</span></label>'+
      (hasPdf?'<div class="alert green">Archivage PDF confirmé pour cette session.</div>':'')+
      (isArchived?
       '<div class="alert blue" style="margin-top:12px"><strong>Client archivé</strong> · '+esc(fmtDate(c.archivedAt))+
       '. Son accès client est désactivé ; la fiche de reprise et les historiques restent disponibles.</div>'+
       '<button class="btn primary small" id="akRestoreArchivedClient">Réactiver le dossier et reprendre le Passeport</button>':
       '<button class="btn ghost small" id="akArchiveClient" '+(!hasPdf?'disabled':'')+
       '>2. Archiver le client dans AK PRIME</button>')+
      (summary?resumePanel(summary):'')+
      '<details style="margin-top:17px"><summary style="cursor:pointer;font-weight:600">Sauvegarde technique complémentaire (facultative)</summary>'+
      '<p class="muted tiny" style="margin-top:9px">Ce fichier chiffré n’est pas destiné à être lu comme un document. '+
      'Il sauvegarde les enregistrements techniques pour une récupération spécifique. '+
      'Il reste requis avant la suppression définitive d’un dossier TEST, qui est irréversible.</p>'+
      '<div class="row" style="gap:9px;flex-wrap:wrap">'+
      '<button class="btn ghost small" id="akExportClientDossier">Sauvegarder les données chiffrées</button>'+
      '<button class="btn ghost small" id="akVerifyClientDossier">Vérifier la sauvegarde</button></div>'+
      '<input type="file" id="akVerifyClientFile" accept=".json,application/json" style="display:none">'+
      (c.isTest&&!isArchived?'<button class="btn danger small" style="margin-top:10px" id="akDeleteTestClient" '+
          (!hasFile?'disabled':'')+'>Supprimer définitivement ce dossier TEST</button>':'')+
      '</details>'+
      '<p class="muted tiny" style="margin-top:12px">Les PDF de budgets macro stockés séparément doivent être téléchargés à part. '+
      'Les vidéos WhatsApp ne sont jamais hébergées ici. Archiver n’efface pas les factures ni les preuves contractuelles.</p>'+
    '</div>';
 };

 function resumePanel(s){
   const cycles=(Array.isArray(s.cycles)?s.cycles:[]);
   const tests=(Array.isArray(s.last_tests)?s.last_tests:[]);
   const milestones=(Array.isArray(s.recent_milestones)?s.recent_milestones:[]);
   const cycleRows=cycles.slice(0,8).map(x=>
     '<div class="item"><strong>'+esc(x.title||'Cycle')+'</strong>'+
     '<div class="muted tiny">'+esc(fmtDate(x.start_date))+' → '+esc(fmtDate(x.end_date))+
     (x.outcome_summary?' • '+esc(x.outcome_summary):'')+'</div></div>').join('');
   const testRows=tests.slice(0,12).map(x=>
     '<div class="item"><strong>'+esc(x.test_name||'Test')+'</strong>'+
     '<div class="muted tiny">'+esc(fmtDate(String(x.performed_at||'').slice(0,10)))+
     ' • '+esc(x.result_value??x.result_text??'—')+' '+esc(x.unit||'')+'</div></div>').join('');
   return '<div class="card panel" style="margin-top:14px"><h3>Fiche de reprise AK PRIME</h3>'+
     '<p class="muted tiny">Derniers repères enregistrés lors de l’archivage du '+
       esc(fmtDate(String(s.saved_at||'').slice(0,10)))+'. Ils resteront visibles après réactivation.</p>'+
     '<div class="grid2">'+
     '<div><strong>Derniers objectifs</strong><p class="tiny">'+esc(s.goal_summary||'Non renseignés')+'</p></div>'+
     '<div><strong>Points de vigilance</strong><p class="tiny">'+esc(s.attention_points||'Aucun renseigné')+'</p></div></div>'+
     '<details style="margin:9px 0"><summary style="cursor:pointer">Cycles précédents ('+cycles.length+')</summary>'+
       (cycleRows||'<p class="muted tiny">Aucun cycle disponible.</p>')+'</details>'+
     '<details style="margin:9px 0"><summary style="cursor:pointer">Derniers tests ('+tests.length+')</summary>'+
       (testRows||'<p class="muted tiny">Aucun test enregistré.</p>')+'</details>'+
     '<p class="muted tiny">Jalons conservés : '+milestones.length+
       '. Le Passeport complet et l’historique restent accessibles dans leur onglet.</p>'+
     '</div>';
 }
 function safePDFText(v){return esc(String(v??'')).replaceAll('\\n','<br>')}
 function passportPrintableHTML(c){
   const model=passportModelFromCoach(c);
   const cycles=(db.passportCycleHistory||[]).filter(x=>x.client_id===c.id)
       .sort((a,b)=>String(a.start_date||'').localeCompare(String(b.start_date||'')));
   const tests=(model.tests||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
   const events=(model.events||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
   const checkins=(model.checkins||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
   const fmt=(d)=>d?fmtDate(d):'—';
   const lines=(items)=>items.map(x=>'<tr>'+x.map(t=>'<td>'+safePDFText(t)+'</td>').join('')+'</tr>').join('');
   const table=(headers,items)=>items.length?
       '<table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
         lines(items)+'</tbody></table>':'<p class="empty">Aucun renseignement enregistré.</p>';
   const info=(label,value)=>'<div class="fact"><span>'+esc(label)+'</span><strong>'+safePDFText(value||'—')+'</strong></div>';
   const cycleMs=(x)=>{
     const start=x.start_date||x.start,end=x.end_date||x.end;
     if(!start||!end)return '—';
     const days=Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000)+1;
     if(!Number.isFinite(days)||days<1)return '—';
     const w=Math.floor(days/7),d=days%7;
     return (w?w+' sem. ':'')+(d?d+' j':'')||'—';
   };
   const allCycles=cycles.length?cycles:
      (model.cycle?.start?[{
       title:model.cycle.title,start_date:model.cycle.start,end_date:model.cycle.end,
       priorities:model.cycle.priorities,vigilance:model.cycle.vigilance
      }]:[]);
   const sport=model.sport||'Non renseigné';
   const section=(title,inner)=>'<section><h2>'+esc(title)+'</h2>'+inner+'</section>';
   return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+
     esc('AK PRIME - Passeport - '+c.name+' - '+localDateISO())+
     '</title><style>'+
     '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#183048;margin:0;background:#fff;font-size:11px;line-height:1.55}'+
     'header{padding:15px 0 22px;border-bottom:3px solid #b18b54;margin-bottom:18px}'+
     '.brand{font-size:20px;font-weight:800;letter-spacing:1px}header h1{margin:8px 0 4px;font-size:24px}'+
     '.subtitle{color:#5b6877}section{margin:17px 0 20px;break-inside:auto}section h2{font-size:15px;margin:0 0 9px;border-bottom:1px solid #ddd;padding-bottom:6px;color:#6e512f}'+
     '.facts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:13px}.fact{padding:8px;border:1px solid #e1e4e8;border-radius:5px;break-inside:avoid}'+
     '.fact span{display:block;font-size:10px;color:#64748b}.fact strong{white-space:pre-wrap}'+
     'table{width:100%;border-collapse:collapse;font-size:10px;margin-top:5px;table-layout:fixed}'+
     'th{text-align:left;color:#334155;background:#eef1f4;padding:7px;border-bottom:1px solid #cbd5e1}'+
     'td{padding:7px;border-bottom:1px solid #e4e7eb;overflow-wrap:anywhere;vertical-align:top}tr{break-inside:avoid}'+
     '.empty{color:#718096;font-style:italic}.stamp{font-size:10px;color:#64748b;margin:8px 0 13px}.notice{padding:8px 11px;border-left:3px solid #b18b54;background:#f9f7f2}'+
     '.actions{padding:12px;background:#ecf3fa;margin-bottom:15px;border:1px solid #ccdbea;border-radius:6px}'+
     'button{background:#183048;border:0;border-radius:5px;color:white;padding:9px 14px;cursor:pointer;font-weight:600}'+
     '@media print{.actions{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
     '</style></head><body>'+
     '<div class="actions"><strong>Enregistre ce Passeport sur ton ordinateur :</strong> '+
     'clique sur le bouton, puis choisis « Enregistrer au format PDF » comme destination. '+
     '<button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>'+
     '<header><div class="brand">AK PRIME</div><h1>Passeport d’accompagnement</h1>'+
     '<div class="subtitle">'+esc(model.name)+' • '+esc(model.pole)+' — '+esc(model.offer)+'</div>'+
     '<div class="stamp">Édité le '+esc(fmt(localDateISO()))+' • Archive personnelle du coach</div></header>'+
     section('Profil et accompagnement','<div class="facts">'+
       info('Sport / activité',sport)+info('Spécialité / poste',model.specialty||'—')+
       info('Niveau',model.level||'—')+info('Formule',model.offer)+
       info('Début de suivi',fmt(model.start))+info('Fin de suivi',fmt(model.end))+'</div>')+
     section('Dernier cycle et points de reprise','<div class="facts">'+
       info('Cycle de référence',model.cycle?.title||'À définir')+
       info('Période',fmt(model.cycle?.start)+' → '+fmt(model.cycle?.end))+
       info('Objectifs / priorités',model.cycle?.priorities||'Non renseignés')+
       info('Vigilance',model.cycle?.vigilance||'Aucune renseignée')+'</div>')+
     section('Historique des cycles ('+allCycles.length+')',table(
       ['Cycle','Début','Fin','Durée','Bilan'],
       allCycles.map(x=>[x.title||'Cycle',fmt(x.start_date||x.start),fmt(x.end_date||x.end),
         cycleMs(x),x.outcome_summary||x.status||'—'])))+
     section('Tests et retests ('+tests.length+')',table(
       ['Date','Test','Résultat','Contexte / interprétation'],
       tests.map(t=>[fmt(t.date),t.name,(t.value??'—')+' '+(t.unit||''),
         [t.context,t.note].filter(Boolean).join(' — ')])))+
     section('Jalons du Passeport ('+events.length+')',table(
       ['Date','Événement','Détail'],events.map(x=>[fmt(x.date),x.title,x.detail||'—'])))+
     section('Bilan qualitatif et suites','<div class="facts">'+
       info('Décisions du coach',model.observations?.decisions||'—')+
       info('Synthèse de visio',model.observations?.visio||'—')+'</div>')+
     (checkins.length?section('Bilans historiques ('+checkins.length+')',table(
       ['Date','État / bilan','Retour du coach'],
       checkins.map(x=>[fmt(x.date),x.feeling||x.pain||x.problem||'—',x.coach||'—']))):'')+
     '<p class="notice">Ce document conserve le Passeport d’accompagnement à la date indiquée. '+
     'Les séances et les charges d’entraînement restent dans Optitrainer, les vidéos sur WhatsApp. '+
     'Les contrats, factures et éventuels documents PDF nutritionnels ne sont pas inclus ici.</p>'+
     '</body></html>';
 }
 function exportPassportPDF(c){
   const popup=window.open('','_blank');
   if(!popup){alert('Le navigateur bloque la nouvelle fenêtre. Autorise les pop-ups pour AK PRIME, puis réessaie.');return;}
   try{
     popup.document.open();popup.document.write(passportPrintableHTML(c));popup.document.close();
     popup.focus();
   }catch(error){popup.close();alert('Ouverture du Passeport impossible : '+error.message)}
 }
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
     return exportPassportPDF(c);
   }
   if(e.target.closest?.('#akArchiveClient')){
     if(!pdfConfirmed.has(c.id))return alert('Enregistre d’abord le Passeport en PDF sur ton PC et confirme l’avoir vérifié.');
     const reason=prompt('Motif d’archivage (minimum 10 caractères) :');
     if(!reason||reason.trim().length<10)return;
     if(!confirm('Archiver '+c.name+' ? Son accès client sera désactivé et le dossier retiré de la liste active. Les pièces légales restent en Supabase.'))return;
     const {error}=await supa.rpc('owner_archive_client',{p_client_id:c.id,p_reason:reason.trim()});
     if(error)return alert('Archivage refusé : '+error.message);
     verified.delete(c.id);pdfConfirmed.delete(c.id);
     archiveListMode='archived';state.view='clients';state.tab='overview';
     await loadSupabaseData();render();toast('Dossier archivé et conservé.');
   }
   if(e.target.closest?.('#akRestoreArchivedClient')){
     const reason=prompt('Motif de restauration (minimum 10 caractères) :');
     if(!reason||reason.trim().length<10)return;
     const {error}=await supa.rpc('owner_restore_client_archive',{p_client_id:c.id,p_reason:reason.trim()});
     if(error)return alert('Restauration refusée : '+error.message);
     archiveListMode='active';state.view='client';state.clientId=c.id;state.tab='passport';
     await loadSupabaseData();render();toast('Dossier restauré : Passeport ouvert au dernier état. Accès client toujours désactivé.');
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
   if(e.target?.id==='akPdfSavedConfirm'){
     const c=currentClient();
     if(!c)return;
     if(e.target.checked)pdfConfirmed.add(c.id);else pdfConfirmed.delete(c.id);
     render();return;
   }
   if(e.target?.id!=='akVerifyClientFile')return;
   const file=e.target.files?.[0],c=currentClient();
   e.target.value='';
   if(c&&file)verifyFile(c,file);
 },true);
 window.AKP_CLIENT_ARCHIVE_READY=true;
})();
