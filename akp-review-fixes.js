/* AK PRIME — Corrections première revue : affichage fiable, modifications tracées. */
(function(){
 'use strict';
 function nextScheduledVisioDate(c){
   const next=(db.appointments||[]).filter(a=>a.client_id===c.id&&
     ['scheduled','confirmed'].includes(a.status)&&new Date(a.starts_at)>new Date())
     .sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0];
   if(!next)return '';
   return new Intl.DateTimeFormat('sv-SE',{
     timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'
   }).format(new Date(next.starts_at));
 }

 function normalizeReviewState(c){
   return {...c,checkins:(c.checkins||[]).map(w=>
     w.reviewedAt&&!String(w.coach||'').trim()?{...w,reviewedAt:''}:w)};
 }
 const originalFollow=follow;
 follow=function(c){
   const oldBlank=(c.checkins||[]).filter(w=>w.reviewedAt&&!String(w.coach||'').trim());
   const html=originalFollow(normalizeReviewState(c));
   if(!oldBlank.length)return html;
   return '<div class="alert" style="margin-bottom:12px"><strong>'+oldBlank.length+
     ' bilan(s) marqué(s) traité(s) sans retour du coach.</strong> Ajoute une décision ou un commentaire pour clôturer correctement ces suivis.</div>'+html;
 };
 const originalCoachNotifications=coachNotifications;
 coachNotifications=function(){
   const old=db.clients;
   try{db.clients=old.map(normalizeReviewState);return originalCoachNotifications()}
   finally{db.clients=old}
 };
 const oldDashboard=dashboard;
 dashboard=function(){
   const all=db.clients;
   let output;
   try{
     db.clients=all.filter(c=>!c.isTest).map(c=>normalizeReviewState({...c,next:nextScheduledVisioDate(c)}));
     output=oldDashboard();
   }finally{db.clients=all}
   const real=all.filter(c=>!c.isTest);
   const late=real.filter(c=>c.status==='Actif'&&c.end&&daysUntil(c.end)<0&&
      !(c.renewals||[]).some(r=>r.dueDate===c.end));
   const upcoming=real.filter(c=>c.status==='Actif'&&c.end&&daysUntil(c.end)>=0&&daysUntil(c.end)<=14&&
      !(c.renewals||[]).some(r=>r.dueDate===c.end));
   output=output.replace('Renouvellements J-14','Renouvellements à traiter');
   if(!late.length&&!upcoming.length)return output;
   const lateItems=late.slice().sort((a,b)=>a.end.localeCompare(b.end)).map(c=>
     '<div class="item row between"><div><strong>'+esc(c.name)+'</strong>'+
     '<div class="tiny">Engagement dépassé de '+Math.abs(daysUntil(c.end))+' jour(s) — '+fmtDate(c.end)+'</div></div>'+
     '<button class="link openClient" data-id="'+esc(c.id)+'" data-tab-target="admin">Traiter</button></div>').join('');
   const head='<div class="card panel" style="margin-bottom:13px;border-left:4px solid #d97706">'+
    '<h3>Échéances d’engagement</h3>'+
    (late.length?'<div class="alert" style="margin-bottom:8px"><strong>'+late.length+' engagement(s) dépassé(s)</strong> — à traiter en priorité, même si les bilans sont à jour.</div>':'')+
    (lateItems?'<div class="list">'+lateItems+'</div>':'')+
    (upcoming.length?'<div class="muted tiny" style="margin-top:10px">'+upcoming.length+' engagement(s) arrivent à échéance dans les 14 jours.</div>':'')+
    '</div>';
   return output.replace('<div class="kpis">',head+'<div class="kpis">');
 };
 const oldOverview=overview;
 overview=function(c){
   let html=oldOverview({...c,next:nextScheduledVisioDate(c)});
   const d=c.end?daysUntil(c.end):null;
   if(d!==null&&d<0&&c.status==='Actif'){
     const hasCurrent=(c.renewals||[]).some(r=>r.dueDate===c.end);
     if(!hasCurrent){
       html=html.replace('Aucune action urgente','Engagement dépassé de '+Math.abs(d)+' jour(s)');
       html=html.replace('class="btn primary small quickTab" data-tab="passport"','class="btn primary small quickTab" data-tab="admin"');
       html='<div class="alert" style="margin-bottom:13px"><strong>Échéance dépassée de '+
         Math.abs(d)+' jour(s).</strong> Vérifie le renouvellement et le contrat actif. '+
         '<button class="btn ghost small quickTab" data-tab="admin">Ouvrir Administratif</button></div>'+html;
     }
   }
   if(!c.cycle?.start||!c.cycle?.end||c.cycle.end<=c.cycle.start){
     html=html.replace(/<small>0 % du cycle<\/small>/,
       '<small class="account-wait">Dates du cycle à compléter ou à corriger</small>');
   }
   return html;
 };
 const originalRenewalPanel=renewalPanel;
 renewalPanel=function(c){
   let html=originalRenewalPanel(c);
   const mismatches=(c.renewals||[]).filter(r=>r.newEndDate&&c.end&&r.newEndDate>c.end&&r.decision!=='stop');
   if(mismatches.length){
     const message='<div class="alert" style="margin-top:12px"><strong>Incohérence à vérifier :</strong> '+
       mismatches.length+' renouvellement(s) historique(s) indiquent une nouvelle échéance postérieure au contrat actuellement affiché ('+
       esc(fmtDate(c.end))+'). Ils ne prouvent pas à eux seuls qu’un nouvel engagement est applicable ou payé. '+
       'Vérifie la preuve d’acceptation et le paiement avant toute correction de date.</div>';
     html=html.replace('<div class="section-title">Historique finalisé</div>',message+'<div class="section-title">Historique finalisé</div>');
   }
   return html;
 };
 const oldGroups=passportTestGroups;
 passportTestGroups=function(rows){
   const today=localDateISO();
   return oldGroups((rows||[]).filter(r=>!r.date||String(r.date).slice(0,10)<=today));
 };
 const oldPassport=passport;
 passport=function(c){
   let html=oldPassport(c);
   if(!c.cycle?.start||!c.cycle?.end||c.cycle.end<=c.cycle.start)
     html='<div class="alert blue" style="margin-bottom:12px">Les dates du cycle sont incomplètes ou incohérentes : le pourcentage de progression ne peut pas être interprété.</div>'+html;
   return html;
 };

 const originalRenewalModal=openRenewalModal;
 openRenewalModal=function(c){
   originalRenewalModal(c);
   if(!c)return;
   const notes=document.getElementById('renewNotes');
   const save=document.getElementById('saveM');
   if(!notes||!save)return;
   notes.insertAdjacentHTML('beforebegin',c.isTest
     ? '<div class="alert blue" style="margin:10px 0">Dossier de test : renouvellement simulé, sans paiement réel.</div>'
     : '<div class="alert" style="margin:10px 0"><strong>Renouvellement réel :</strong> le choix client ne vaut pas paiement. '+
       'En l’absence de Stripe, justifie l’accord et le règlement hors ligne. Décris les justificatifs dans les notes.</div>');
   save.onclick=async function(){
     const decision=document.getElementById('renewDecision').value;
     const review=document.getElementById('renewReview').checked;
     const retestsRequired=document.getElementById('renewRetestsRequired').checked;
     const retestsDone=document.getElementById('renewRetestsDone').checked;
     const objectives=document.getElementById('renewObjectives').checked;
     const noteText=notes.value.trim();
     if(!c.isTest&&noteText.length<25){
       alert('Décris dans les notes le consentement du client, les justificatifs vérifiés et le motif de la finalisation manuelle (25 caractères minimum).');
       notes.focus();return;
     }
     if(retestsRequired&&!retestsDone&&!confirm('Retests nécessaires mais non réalisés : finaliser malgré tout ?'))return;
     if(!c.isTest&&!confirm('Tu confirmes personnellement que le contrat peut être renouvelé sans paiement Stripe automatiquement vérifié ?'))return;
     save.disabled=true;
     try{
       const {error}=await supa.rpc('owner_finalize_client_renewal',{
         p_client_id:c.id,p_due_date:c.end,p_decision:decision,
         p_cycle_review_done:review,p_retests_required:retestsRequired,p_retests_done:retestsDone,
         p_objectives_updated:objectives,p_notes:noteText||null,
         p_manual_exception_confirmed:!c.isTest
       });
       if(error)throw Error(error.message);
       const renewalLabel=decision==='3_months'?'3 mois':decision==='6_months'?'6 mois':
         decision==='monthly'?'Mensuel':'Arrêt';
       c.renewal=renewalLabel;
       try{await saveWorkspace(c)}catch(err){console.warn('Note d’option non synchronisée',err)}
       closeModal();await loadSupabaseData();render();
       toast('Renouvellement enregistré et contrat mis à jour ensemble.');
     }catch(err){
       alert('Renouvellement non appliqué : '+err.message);
       save.disabled=false;
     }
   };
 };

 const originalAdmin=admin;
 admin=function(c){
   let html=originalAdmin(c);
   const hasRecordedPayment=(db.paymentTransactions||[]).some(p=>p.client_id===c.id&&p.status==='paid');
   if(!c.isTest&&!hasRecordedPayment&&String(c.payment||'').toLowerCase()==='à jour'){
     html='<div class="alert" style="margin-bottom:13px"><strong>Statut de paiement non vérifié :</strong> le dossier indique « À jour », mais aucune transaction confirmée n’est associée à ce client dans AK PRIME. Cette information ne prouve pas un règlement réel.</div>'+html;
   }
   return html;
 };
 const originalAccountBlock=clientAccountBlock;
 clientAccountBlock=function(c){
   let html=originalAccountBlock(c);
   if(c.isTest) return '<div class="alert blue"><strong>Dossier TEST.</strong> Tout accès manuel est réservé aux essais ; aucun paiement réel ne doit être simulé comme encaissé.</div>'+html;
   if(!c.portalAccessEnabled&&c.authUserId){
     html='<div class="alert"><strong>Accès commercial à valider.</strong> « À jour » saisi manuellement ne constitue pas une preuve de paiement Stripe.</div>'+html;
   }
   return html;
 };


 const originalBookingPanel=renderBookingPanel;
 renderBookingPanel=function(portal){
   const out=originalBookingPanel(portal);
   const p=portal?.bookingPolicy;
   if(!p||!p.quota_count)return out;
   const quota=Math.max(0,Number(p.quota_count)||0);
   const period=p.quota_period==='week'?'week':'month';
   const localIso=(d)=>new Intl.DateTimeFormat('sv-SE',{
     timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'
   }).format(d);
   const key=(d)=>{
     const str=localIso(d);
     if(period==='month')return str.slice(0,7);
     const utc=new Date(str+'T12:00:00Z');
     const days=(utc.getUTCDay()+6)%7;
     utc.setUTCDate(utc.getUTCDate()-days);
     return utc.toISOString().slice(0,10);
   };
   const nowKey=key(new Date());
   const statuses=new Set(['scheduled','confirmed','completed','cancelled_late','no_show']);
   const used=(portal.appointments||[]).filter(a=>{
     // Les visios initiales sont incluses en plus de la formule et ne
     // consomment jamais les visios mensuelles ou hebdomadaires.
     if(a.appointment_type==='Visio initiale')return false;
     if(!statuses.has(a.status)||!a.starts_at)return false;
     const d=new Date(a.starts_at);
     return Number.isFinite(d.getTime())&&key(d)===nowKey;
   }).length;
   const remaining=Math.max(0,quota-used);
   const periodLabel=period==='week'?'semaine':'mois';
   const summary='<div class="client-section-card" style="margin-bottom:13px">'+
     '<strong>Visios du '+periodLabel+' : '+used+' / '+quota+' utilisée(s)</strong>'+
     '<div class="muted tiny" style="margin-top:5px">'+remaining+
     ' disponible(s) pour la période en cours. Les absences et annulations tardives comptent dans le quota.</div>'+
     '</div>';
   return summary+out;
 };
 const oldBillingReady=billingReady;
 billingReady=function(){
   const b=db.billingSettings||{};
   const siren=String(b.siren||'').replace(/\s/g,'');
   const siret=String(b.siret||'').replace(/\s/g,'');
   if(!/^\d{9}$/.test(siren)||!/^\d{14}$/.test(siret)||siret.slice(0,9)!==siren)return false;
   if(!String(b.legal_name||'').trim()||!String(b.legal_address||'').trim())return false;
   return oldBillingReady();
 };
 document.addEventListener('click',e=>{
   const btn=e.target.closest?.('#saveSettings');
   if(!btn||state.view!=='settings')return;
   e.preventDefault();e.stopImmediatePropagation();
   const url=document.getElementById('optiBase')?.value.trim()||'';
   if(url&&(!/^https:\/\//i.test(url)||url.length>500)){
     alert('Entre une URL Optitrainer HTTPS valide (500 caractères maximum).');return;
   }
   btn.disabled=true;
   supa.from('app_settings').upsert({id:1,optitrainer_base_url:url||null,updated_at:new Date().toISOString()},{onConflict:'id'})
     .then(async({error})=>{if(error)throw Error(error.message);db.settings.optitrainerBase=url;toast('Lien Optitrainer enregistré dans Supabase.')})
     .catch(err=>alert('Enregistrement impossible : '+err.message))
     .finally(()=>{btn.disabled=false});
 },true);
 document.addEventListener('change',async e=>{
   const input=e.target;
   if(!input?.classList?.contains('pathSave')||state.view!=='client'||state.tab!=='admin')return;
   const field=input.dataset.path;
   if(!['offer','start','end','status','payment'].includes(field))return;
   // L'ancien onchange sauvegardait sans motif ; le présent traitement est propriétaire et journalisé.
   e.stopImmediatePropagation();
   const c=currentClient();
   if(authProfile?.role!=='owner'){
     alert('Cette modification contractuelle est réservée au propriétaire.');
     await loadSupabaseData();render();return;
   }
   const reason=prompt('Motif de la modification de '+field+' (au moins 10 caractères). Ce motif sera conservé dans l’historique :');
   if(!reason||reason.trim().length<10){
     alert('Modification annulée : motif obligatoire.');
     await loadSupabaseData();render();return;
   }
   input.disabled=true;
   try{
     const {error}=await supa.rpc('owner_update_client_contract',{
       p_client_id:c.id,p_field:field,p_value:input.value,p_reason:reason.trim()
     });
     if(error)throw Error(error.message);
     await loadSupabaseData();render();
     toast('Modification enregistrée avec son motif.');
   }catch(err){
     alert('Modification non enregistrée : '+err.message);
     await loadSupabaseData();render();
   }
 },true);
 document.addEventListener('click',e=>{
   const review=e.target.closest?.('.reviewCheckin');
   if(review&&state.view==='client'&&state.tab==='follow'){
     const ta=document.querySelector('.coachCheckinFeedback[data-id="'+review.dataset.id+'"]');
     if(!ta?.value.trim()){
       e.preventDefault();e.stopImmediatePropagation();
       alert('Ajoute un retour ou une décision coach avant de marquer ce bilan comme traité.');
       ta?.focus();return;
     }
   }
   const deletion=e.target.closest?.('.deleteCheckin');
   if(deletion&&state.view==='client'){
     if(!confirm('Supprimer ce bilan de la fiche ? Une copie sera conservée dans une archive réservée au propriétaire.')){
       e.preventDefault();e.stopImmediatePropagation();
     }
   }
   const enable=e.target.closest?.('.togglePortalAccess');
   if(enable&&state.view==='client'){
     e.preventDefault();e.stopImmediatePropagation();
     const c=currentClient(),turnOn=enable.dataset.enable==='1';
     if(authProfile?.role!=='owner')return alert('Seul le propriétaire peut modifier les accès.');
     const intro=turnOn&&!c?.isTest
       ? 'ACTIVATION EXCEPTIONNELLE sans validation Stripe automatique. Précise le motif et la preuve de ton autorisation :'
       : turnOn?'Motif de l’accès de test (au moins 15 caractères) :'
       :'Motif de la désactivation (au moins 15 caractères) :';
     const reason=prompt(intro);
     if(!reason||reason.trim().length<15)return alert('Modification annulée : motif obligatoire.');
     if(turnOn&&!c?.isTest&&!confirm('Confirmer ton autorisation exceptionnelle pour ce client réel, sans présumer un paiement Stripe ?'))return;
     supa.rpc('owner_set_portal_access',{p_client_id:c.id,p_enabled:turnOn,p_reason:reason.trim()})
       .then(async({error})=>{if(error)throw Error(error.message);await loadSupabaseData();render();toast(turnOn?'Accès activé (motif conservé).':'Accès désactivé (motif conservé).')})
       .catch(async err=>{alert('Accès inchangé : '+err.message);await loadSupabaseData();render()});
   }
 },true);
window.AKP_REVIEW_READY=true;
})();
