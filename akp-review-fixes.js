/* AK PRIME — Corrections première revue : affichage fiable, modifications tracées. */
(function(){
 'use strict';
 const oldDashboard=dashboard;
 dashboard=function(){
   const all=db.clients;
   let output;
   try{
     db.clients=all.filter(c=>!c.isTest);
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
   let html=oldOverview(c);
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
   const ahead=(c.tests||[]).filter(t=>t.date&&String(t.date).slice(0,10)>localDateISO()).length;
   if(ahead)html='<div class="alert blue" style="margin-bottom:12px"><strong>'+
     ahead+' résultat(s) daté(s) dans le futur.</strong> Ils restent dans les enregistrements, mais sont exclus des statistiques d’évolution actuelles.</div>'+html;
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
   if(enable&&enable.dataset.enable==='1'&&state.view==='client'){
     const c=currentClient();
     if(!c?.isTest){
       if(!confirm('Activation manuelle exceptionnelle : aucun paiement Stripe n’a encore été vérifié automatiquement. Confirmer que tu autorises explicitement cet accès ?')){
         e.preventDefault();e.stopImmediatePropagation();
       }
     }
   }
 },true);
})();
