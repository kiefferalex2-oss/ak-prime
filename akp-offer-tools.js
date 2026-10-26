/* AK PRIME : formulaire d'engagement initial et espaces d'outils conditionnés par l'offre. */
(function(){
 'use strict';
 const TOOL_SPEC={
  mental_session:{label:'Séance de préparation mentale',hint:'Objectif, technique, exercices, retour et travail entre les séances.',fields:[
   ['duration','Durée (minutes)','number'],['objective','Objectif de la séance','textarea'],
   ['method','Technique ou méthode utilisée','text'],['exercises','Exercices et déroulé','textarea'],
   ['observation','Observations / évolution','textarea'],['homework','Travail à réaliser','textarea'],
   ['next_step','Prochaine étape','textarea']]},
  mental_homework:{label:'Exercice entre les séances',hint:'Exercice transmis et progression au fil de la préparation mentale.',fields:[
   ['exercise','Exercice confié','textarea'],['frequency','Fréquence prévue','text'],
   ['result','Retour du client','textarea'],['adjustment','Ajustement / prochaine consigne','textarea']]},
  mental_practice:{label:'Routine et techniques mentales',hint:'Respiration, mot-clé, recentrage ou routine personnalisée.',fields:[
   ['goal','Situation ou objectif','text'],['technique','Technique / routine','textarea'],
   ['execution','Consignes de mise en pratique','textarea'],['assessment','Évolution observée','textarea']]},
  video_review:{label:'Analyse vidéo',hint:'Mouvement observé, corrections et lien vers la vidéo.',fields:[
   ['movement','Mouvement / exercice','text'],['video_url','Lien de la vidéo (facultatif)','url'],
   ['analysis','Analyse du mouvement','textarea'],['corrections','Corrections et consignes','textarea']]},
  wellness:{label:'Bien-être et état de forme',hint:'Suivi fatigue, stress, douleurs musculaires et qualité du sommeil.',fields:[
   ['fatigue','Fatigue (1 à 7)','number'],['stress','Stress (1 à 7)','number'],
   ['soreness','Douleurs musculaires (1 à 7)','number'],['sleep_quality','Sommeil ressenti (1 à 7)','number'],
   ['notes','Analyse coach / décision','textarea']]},
  training_adjustment:{label:'Adaptation de la charge',hint:'Décision prise selon le bilan et les contraintes du client.',fields:[
   ['trigger','Motif / état de forme','textarea'],['decision','Modification de la charge ou de la séance','textarea'],
   ['followup','Réévaluation prévue','textarea']]},
  recovery_session:{label:'Séance dédiée de récupération',hint:'Récupération ajoutée à la planification Premium.',fields:[
   ['method','Type de récupération','text'],['duration','Durée (minutes)','number'],
   ['program','Contenu détaillé','textarea'],['outcome','Réponse du client','textarea']]},
  sleep_entry:{label:'Agenda de sommeil',hint:'Heures de sommeil, qualité et observations quotidiennes.',fields:[
   ['bedtime','Heure de coucher','time'],['wakeup','Heure de réveil','time'],
   ['hours','Sommeil total (heures)','number'],['quality','Qualité ressentie (1 à 5)','number'],
   ['notes','Réveils, contexte et observations','textarea']]},
  macro_budget:{label:'Budget macronutritionnel',hint:'Objectifs journaliers personnalisés, sans menus alimentaires.',fields:[
   ['kcal','Objectif calorique (kcal / jour)','number'],['protein','Protéines (g / jour)','number'],
   ['carbs','Glucides (g / jour)','number'],['fats','Lipides (g / jour)','number'],
   ['notes','Justification et ajustements','textarea'],
    ['food_guidance','Recommandations alimentaires à transmettre au client','textarea'],
    ['meal_timing','Répartition des prises et apports autour des séances','textarea'],
    ['hydration','Hydratation et repères de récupération','textarea']]},
  lifestyle:{label:'Habitudes de vie et activité',hint:'Objectifs concrets de santé, régularité et activité physique.',fields:[
   ['objective','Objectif','textarea'],['habit','Habitude à travailler','textarea'],
   ['constraints','Contraintes','textarea'],['actions','Actions prévues','textarea']]},
  habit_review:{label:'Bilan de régularité',hint:'Observance, difficultés et prochaines priorités.',fields:[
   ['adherence','Régularité / séances réalisées','text'],['progress','Progrès observés','textarea'],
   ['barriers','Freins rencontrés','textarea'],['next_steps','Priorités suivantes','textarea']]}
 };
 const LABEL_SECTIONS={
  mental:'Préparation mentale',
  p1:'Analyses vidéo',
  p2:'Analyses vidéo P2',
  p3:'Sommeil, budget macro & analyses vidéo P3',
  forme:'Nutrition & analyses vidéo'
 };

 function hasVideoReviews(c){
   return (c?.pole==='Performance'&&['P1','P2','P3'].includes(c?.offer))||
      (c?.pole==='Forme & Santé'&&['Standard','Renforcé'].includes(c?.offer));
 }
 function videoPlan(c){
   if(c?.pole==='Performance'){
     if(c.offer==='P1')return {mode:'month',n:2,label:'2 analyses par mois'};
     if(c.offer==='P2')return {mode:'week',n:1,label:'1 analyse par semaine'};
     if(c.offer==='P3')return {mode:'needs',n:null,label:'Selon les besoins (sans quota fixe)'};
   }
   if(c?.pole==='Forme & Santé'){
     if(c.offer==='Standard')return {mode:'month',n:1,label:'1 analyse par mois'};
     if(c.offer==='Renforcé')return {mode:'week',n:1,label:'Jusqu’à 1 analyse par semaine'};
   }
   return null;
 }
 function isoAddMonths(date,months){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return '';
   const [y,m,d]=date.split('-').map(Number);
   const t=new Date(Date.UTC(y,m-1+months,1,12));
   const max=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0,12)).getUTCDate();
   t.setUTCDate(Math.min(d,max));
   return t.toISOString().slice(0,10);
 }
 function coachingMonth(c,today){
   const anchor=String(c?.start||'').slice(0,10);
   const d=String(today||localDateISO()).slice(0,10);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(anchor)||anchor>d){
     // Date de début absente : mois civil de repli, avec mention explicite.
     return {start:d.slice(0,7)+'-01',
        end:isoAddMonths(d.slice(0,7)+'-01',1),
        index:null,estimated:true};
   }
   const [ay,am]=anchor.split('-').map(Number),[dy,dm]=d.split('-').map(Number);
   let diff=(dy-ay)*12+(dm-am);
   while(isoAddMonths(anchor,diff)>d)diff--;
   while(isoAddMonths(anchor,diff+1)<=d)diff++;
   return {start:isoAddMonths(anchor,diff),end:isoAddMonths(anchor,diff+1),
      index:diff+1,estimated:false};
 }
 function videoMarkupFor(c){
   if(!hasVideoReviews(c))return '';
   const now=localDateISO(),period=coachingMonth(c,now),plan=videoPlan(c);
   const rows=(db.videoReceipts||[]).filter(x=>x.client_id===c.id);
   const current=rows.filter(x=>!x.voided_at&&x.received_on>=period.start&&x.received_on<period.end);
   const before=rows.filter(x=>!x.voided_at&&x.received_on<period.start);
   const weekNow=new Date(now+'T12:00:00Z');
   const dow=(weekNow.getUTCDay()+6)%7;
   weekNow.setUTCDate(weekNow.getUTCDate()-dow);
   const monday=weekNow.toISOString().slice(0,10);
   const weekReceipts=rows.filter(x=>!x.voided_at&&x.received_on>=monday&&x.received_on<=now);
   const whatsappDigits=String(c.phone||'').replace(/\D/g,'');
   const whatsappHref=whatsappDigits.length>=9&&whatsappDigits.length<=15?
      'https://wa.me/'+(whatsappDigits.startsWith('0')?'33'+whatsappDigits.slice(1):whatsappDigits):'';
   const cap=plan.mode==='month'?'Sur '+plan.n+' prévues dans le mois':
      plan.mode==='week'?'Cette semaine : '+weekReceipts.length+'/'+plan.n+' · '+plan.label:
      'Réceptions enregistrées (pas de plafond défini)';
   const message=plan.mode==='month'&&current.length>plan.n?' • Quota dépassé':'';
   const available=plan.mode==='month'?Math.max(0,plan.n-current.length):null;
   const count=(list)=>list.length+' vidéo'+(list.length>1?'s':'');
   return '<div class="card panel" style="margin-bottom:13px">'+
     '<div class="row between"><div><h3>Analyses vidéo — WhatsApp</h3>'+
     '<p class="muted tiny">Aucune vidéo n’est hébergée sur AK PRIME. Tu coches uniquement les vidéos effectivement reçues sur WhatsApp.</p></div>'+
     '<span class="status blue">'+esc(plan.label)+'</span></div>'+
     '<div class="grid2" style="margin:13px 0">'+
       '<div class="item"><div class="muted tiny">Mois d’accompagnement'+(period.index?' n°'+period.index:'')+'</div>'+
       '<strong style="font-size:22px">'+current.length+'</strong>'+
       '<div class="tiny">'+esc(fmtDate(period.start))+' au '+esc(fmtDate(new Date(new Date(period.end+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10)))+'</div></div>'+
       '<div class="item"><div class="muted tiny">Repère de l’offre</div><strong>'+esc(cap)+esc(message)+'</strong>'+
       '<div class="tiny">'+(available!==null?'Restantes : '+available:'Total avant cette période : '+before.length)+'</div></div>'+
     '</div>'+
     (period.estimated?'<div class="alert">Date de début absente ou future : compteur affiché sur le mois civil provisoirement.</div>':'')+
     '<div class="row" style="gap:9px;flex-wrap:wrap">'+
      '<button class="btn primary small akAddVideo" data-client="'+esc(c.id)+'">+ Vidéo reçue</button>'+
      (whatsappHref?'<a class="btn ghost small" href="'+whatsappHref+'" target="_blank" rel="noopener noreferrer">Contacter sur WhatsApp</a>':'<span class="muted tiny">Ajoute le téléphone du client pour lui écrire sur WhatsApp.</span>')+
     '</div>'+
     (current.length?'<div class="section-title">Réceptions de ce mois</div>'+
       '<div class="list">'+current.slice().sort((a,b)=>String(b.received_on).localeCompare(String(a.received_on))).map(x=>
       '<div class="item row between"><div><strong>'+esc(fmtDate(x.received_on))+'</strong>'+
       (x.notes?'<div class="muted tiny">'+esc(x.notes)+'</div>':'')+'</div>'+
       (authProfile?.role==='owner'?'<button class="btn ghost small akVoidVideo" data-id="'+esc(x.id)+'">Annuler</button>':'')+
       '</div>').join('')+'</div>':'<div class="muted tiny" style="margin-top:12px">Aucune vidéo reçue pour ce mois d’accompagnement.</div>')+
     '</div>';
 }
 function hasSleepDiary(c){
   return c?.pole==='Performance'&&c?.offer==='P3';
 }
 function toolKeys(c){
   const p=String(c?.pole||''),o=String(c?.offer||'').trim().toLowerCase();
   if(p==='Mental')return ['mental_session','mental_homework','mental_practice'];
   if(p==='Performance'&&o==='p3')return ['macro_budget'];
   if(p==='Forme & Santé'&&o==='renforcé')return ['macro_budget'];
   // Aucun module mental dans les fiches Performance : toute préparation mentale
   // intégrée se traite dans les échanges/Optitrainer, pas dans un onglet séparé.
   return []; // Séances, charges, forme, adaptations, vidéo, échauffements : Optitrainer.
 }
 function workspaceLabel(c){
   const p=String(c?.pole||''),o=String(c?.offer||'');
   if(p==='Mental')return LABEL_SECTIONS.mental;
   if(p==='Performance')return LABEL_SECTIONS[o.toLowerCase()]||'Outils Performance';
   return LABEL_SECTIONS.forme;
 }
 function monthlyEnd(start,months){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return '';
   const [y,m,d]=start.split('-').map(Number);
   const base=new Date(Date.UTC(y,m-1+months,1,12));
   if(Number.isNaN(base.getTime()))return '';
   const max=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0,12)).getUTCDate();
   base.setUTCDate(Math.min(d,max));
   return base.toISOString().slice(0,10);
 }
 const earlierLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
   const result=await earlierLoad.apply(this,args);
   if(!authUser?.id||!['owner','coach'].includes(authProfile?.role))return result;
   const [entries,commitments,sleepEntries,videoReceipts]=await Promise.all([
     supa.from('client_offer_entries').select('*').order('entry_date',{ascending:false}).order('created_at',{ascending:false}),
     supa.from('clients').select('id,initial_commitment_months'),
     supa.from('client_sleep_diary').select('*').order('sleep_date',{ascending:false}).limit(800),
     supa.from('client_video_receipts').select('*').order('received_on',{ascending:false}).limit(2000)
   ]);
   if(entries.error||commitments.error||sleepEntries.error||videoReceipts.error)
     throw Error('Chargement des outils de prestation : '+(entries.error||commitments.error||sleepEntries.error||videoReceipts.error).message);
   db.offerEntries=entries.data||[];
   db.clientSleepDiary=sleepEntries.data||[];
   db.videoReceipts=videoReceipts.data||[];
   const map=new Map((commitments.data||[]).map(c=>[c.id,c.initial_commitment_months]));
   (db.clients||[]).forEach(c=>c.initialCommitmentMonths=map.get(c.id)||null);
   return result;
 };
 // La création se fait dans une RPC atomique : dossier, onboarding et cycle ensemble.
 openNewClient=function(){
   if(authProfile?.role!=='owner')return alert('La création des dossiers est réservée au propriétaire.');
   modal('Nouveau client',
     '<div class="grid2">'+
     '<div class="field"><label>Nom et prénom</label><input id="mName" class="input" maxlength="200" autocomplete="name"></div>'+
     '<div class="field"><label>E-mail</label><input id="mEmail" type="email" class="input" maxlength="255" autocomplete="email"></div>'+
     '<div class="field"><label>Téléphone <span class="muted tiny">(facultatif)</span></label><input id="mPhone" type="tel" class="input" maxlength="40" autocomplete="tel" placeholder="06 12 34 56 78"></div>'+
     '<div class="field"><label>Pôle</label><select id="mPole" class="select"><option>Performance</option><option>Forme & Santé</option><option>Mental</option></select></div>'+
     '<div class="field"><label>Offre</label><select id="mOffer" class="select">'+newClientOfferOptions('Performance')+'</select></div>'+
     '<div class="field"><label>Date de début</label><input id="mStart" type="date" class="input" value="'+localDateISO()+'"></div>'+
     '<div class="field"><label>Engagement initial</label><select id="mDuration" class="select"><option value="3">3 mois</option><option value="6">6 mois</option></select></div>'+
     '<div class="field"><label>Fin de l’engagement (calcul automatique)</label><input id="mEnd" type="date" class="input" readonly></div>'+
     '<div class="field"><label>Statut paiement (saisie manuelle)</label><select id="mPayment" class="select"><option>En attente</option><option>À jour</option></select></div></div>'+
     '<div class="alert blue" style="margin-top:8px"><div class="tiny">Engagement initial : 3 ou 6 mois. Le mensuel d’un mois est proposé lors du renouvellement, pas à l’inscription. La date de fin est calculée automatiquement. L’accès au portail reste désactivé.</div></div>'+
     '<div class="muted tiny" style="margin-top:7px">Le statut « À jour » est une indication manuelle, pas une confirmation bancaire Stripe.</div>',
     '<button class="btn ghost" id="cancelM">Annuler</button>'+
     '<button class="btn primary" id="saveM">Créer le dossier</button>');
   const $=id=>document.getElementById(id);
   const sync=()=>{$('mEnd').value=monthlyEnd($('mStart').value,Number($('mDuration').value))};
   $('cancelM').onclick=closeModal;
   $('mPole').onchange=()=>{$('mOffer').innerHTML=newClientOfferOptions($('mPole').value)};
   $('mStart').onchange=sync;$('mDuration').onchange=sync;sync();
   $('saveM').onclick=async()=>{
     const full=$('mName').value.trim(),start=$('mStart').value;
     const dur=Number($('mDuration').value),email=$('mEmail').value.trim(),phone=$('mPhone').value.trim();
     if(!full||full.length<2)return alert('Renseigne le nom et le prénom du client.');
     if(email&&!$('mEmail').checkValidity())return alert('Adresse e-mail invalide.');
     if(phone&&(!/^[+0-9 ().-]+$/.test(phone)||phone.replace(/[^0-9]/g,'').length<8||phone.replace(/[^0-9]/g,'').length>15))return alert('Numéro de téléphone invalide.');
     if(!start||!monthlyEnd(start,dur))return alert('Date de début requise.');
     if(![3,6].includes(dur))return alert('Engagement initial invalide.');
     if($('mPayment').value==='À jour'&&!confirm('Ce statut est manuel et ne prouve pas un encaissement Stripe. Confirmer ?'))return;
     const nm=splitName(full);
     const button=$('saveM');button.disabled=true;
     try{
       const {data,error}=await supa.rpc('owner_create_client_with_phone',{
         p_first_name:nm.first_name,p_last_name:nm.last_name,p_email:email||null,p_phone:phone||null,
         p_pole:$('mPole').value,p_offer:$('mOffer').value,p_start_date:start,
         p_initial_months:dur,p_payment_status:$('mPayment').value
       });
       if(error)throw Error(error.message);
       closeModal();await loadSupabaseData();
       state.clientId=data;state.view='client';state.tab='overview';render();
       toast('Client créé : engagement '+dur+' mois jusqu’au '+fmtDate(monthlyEnd(start,dur))+'.');
     }catch(e){alert('Création impossible : '+e.message);button.disabled=false}
   };
 };


// Les alertes de check-ins internes deviennent historiques, pas des tâches du jour :
 // Optitrainer centralise désormais l'état de forme et la charge.
 const earlierDashboard=dashboard;
 dashboard=function(){
   const all=db.clients;
   try{
     db.clients=all.map(c=>({...c,checkins:[]}));
     const wrapper=document.createElement('div');
     wrapper.innerHTML=earlierDashboard();
     wrapper.querySelectorAll('.card').forEach(card=>{
       if(card.querySelector('h3')?.textContent?.trim()==='Check-ins à traiter')card.remove();
     });
     return wrapper.innerHTML;
   }finally{db.clients=all;}
 };
 const earlierCoachNotifications=coachNotifications;
 coachNotifications=function(){
   const all=db.clients;
   try{
     db.clients=all.map(c=>({...c,checkins:[]}));
     return earlierCoachNotifications();
   }finally{db.clients=all;}
 };
 const legacyFollow=follow;
 // Archives AK PRIME : lecture compacte et progressive ; aucun doublon avec Optitrainer.
 const checkinArchiveStyle=document.createElement('style');
 checkinArchiveStyle.textContent=[
  '.akOldWeeks{display:grid;gap:8px;margin-top:12px}',
  '.akOldWeeks details{border:1px solid #e1e7ee;border-radius:11px;background:#fbfcfe;overflow:hidden}',
  '.akOldWeeks summary{cursor:pointer;display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;padding:11px 13px;list-style:none}',
  '.akOldWeeks summary::-webkit-details-marker{display:none}',
  '.akOldWeeks summary::before{content:"›";font-size:20px;font-weight:bold;line-height:1;color:#40617a}',
  '.akOldWeeks details[open]>summary::before{transform:rotate(90deg)}',
  '.akOldWeeks summary strong{flex:1;min-width:120px}',
  '.akOldWeeks .akOldDetail{border-top:1px solid #e1e7ee;padding:12px 14px;display:grid;gap:9px}',
  '.akOldWeeks .akOldField{display:grid;grid-template-columns:minmax(110px,.28fr) 1fr;gap:8px;align-items:start}',
  '.akOldWeeks .akOldField>span{font-size:12px;color:#64768a}',
  '.akOldWeeks .akOldField>div{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}',
  '.akOldIntro{font-size:12px;color:#63758b;margin:8px 0}',
  '.akArchiveBadges{display:flex;gap:6px;flex-wrap:wrap}',
  '@media(max-width:620px){.akOldWeeks .akOldField{grid-template-columns:1fr;gap:2px}}'
 ].join('\n');
 document.head.appendChild(checkinArchiveStyle);
 function legacyCheckinArchive(c){
   const rows=(c.checkins||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
   if(!rows.length)return '';
   const clean=value=>String(value??'').trim();
 function akpPainReported(value){
  const norm=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[’]/g,"'").replace(/[.,!?;:]+/g,' ')
   .replace(/\s+/g,' ').trim();
  if(!norm)return false;
  if(/^(?:non|nan|r\s*a\s*s|rien|neant|aucun|aucune|0|n\/a|sans objet|non rien|non ras)$/.test(norm))return false;
  if(/^(?:(?:non\s+)?rien (?:a signaler|de particulier|a declarer)|(?:non\s+)?(?:pas de|aucun(?:e)?) (?:douleur|gene|souci|probleme|blessure|symptome)s?(?: a signaler)?|aucune douleur (?:ni|et) (?:aucune )?gene|tout (?:va|est) bien|pas de souci particulier)$/.test(norm))return false;
  return true;
 }

   const hasPain=w=>akpPainReported(w.pain);
   const painCount=rows.filter(hasPain).length;
   const decisionCount=rows.filter(w=>clean(w.coach)).length;
   const items=rows.map(w=>{
     const entries=[
       ['Ressenti général',w.feeling],
       ['Séances non réalisées',w.missed],
       ['Problèmes de séance / exercice',w.problem],
       ['Gêne ou douleur signalée',w.pain],
       ['Contraintes de la semaine suivante',w.nextConstraint],
       ['Autres informations',w.other],
       ['Retour / décision du coach',w.coach]
     ].filter(([label,value])=>clean(value));
     const badges=[
       hasPain(w)?'<span class="status amber">Gêne signalée</span>':'',
       clean(w.coach)?'<span class="status green">Décision notée</span>':'',
       !entries.length?'<span class="status blue">Sans informations</span>':''
     ].join('');
     return '<details><summary><strong>'+esc(fmtDate(w.date))+'</strong>'+
       '<span class="akArchiveBadges">'+badges+'</span></summary>'+
       '<div class="akOldDetail">'+
       (entries.length?entries.map(([label,value])=>
          '<div class="akOldField"><span>'+esc(label)+'</span><div>'+esc(value)+'</div></div>').join(''):
         '<p class="muted tiny" style="margin:0">Aucune réponse exploitable n’avait été renseignée pour cette semaine.</p>')+
       '</div></details>';
   }).join('');
   return '<details class="card panel" style="margin-top:13px">'+
     '<summary style="cursor:pointer"><strong>Archives des anciens bilans AK PRIME</strong> '+
     '<span class="status blue">'+rows.length+' semaine'+(rows.length>1?'s':'')+'</span>'+
     (painCount?' <span class="status amber">'+painCount+' gêne'+(painCount>1?'s':'')+'</span>':'')+
     '</summary>'+
     '<p class="akOldIntro">Bilans historiques en lecture seule, antérieurs au suivi centralisé dans Optitrainer. Ouvre seulement la semaine à consulter. '+
     (decisionCount?decisionCount+' décision(s) de coach conservée(s).':'Aucune décision coach enregistrée dans ces archives.')+
     '</p>'+
     '<div class="akOldWeeks">'+items+'</div></details>';
 }
 follow=function(c){
   const historic=legacyCheckinArchive(c);
   if(c.pole==='Mental')return '<div class="page-title"><h1>Historique & suivi mental</h1></div>'+
     '<div class="card panel"><h3>Préparation mentale</h3>'+
     '<p>Les séances, routines et exercices sont dans l’onglet Préparation mentale du client. '+
     'Les comptes rendus de visio et le travail à prévoir sont dans « Visios & notes ».</p>'+
     '<div class="row" style="gap:8px;flex-wrap:wrap">'+
     '<button class="btn primary small quickTab" data-tab="offer-tools">Ouvrir les séances mentales</button>'+
     '<button class="btn ghost small quickTab" data-tab="visio_notes">Visios & notes</button></div></div>'+historic;
   return '<div class="page-title"><div><h1>Suivi hebdomadaire — Optitrainer</h1>'+
     '<p>Retrouve les questionnaires d’état de forme, la charge, la récupération et les séances dans Optitrainer. '+
     'AK PRIME n’envoie pas lui-même un formulaire hebdomadaire automatique.</p></div></div>'+
     '<div class="card panel"><div class="row between" style="flex-wrap:wrap;gap:12px;align-items:start">'+
     '<div><h3 style="margin:0 0 6px">Suivi actuel du client</h3>'+
     '<p class="muted tiny" style="margin:0">Les nouveaux check-ins se consultent sur Optitrainer ; les conclusions utiles et actions se conservent dans « Visios & notes ».</p></div>'+
     (c.cycle?.optitrainer&&/^https:\/\//i.test(c.cycle.optitrainer)?
       '<a class="btn primary" href="'+esc(c.cycle.optitrainer)+'" target="_blank" rel="noopener noreferrer">Ouvrir Optitrainer ↗</a>':
       '<span class="status amber">Lien Optitrainer à renseigner</span>')+
     '</div>'+
     '<button class="btn ghost small quickTab" data-tab="visio_notes" style="margin-top:12px">Consigner une décision / action</button></div>'+
     historic;
 };

// La même grille sert au site public, aux comparatifs et à chacun des dossiers.
 function offerRightsFor(c){
   const key=(String(c.pole||'')+'|'+String(c.offer||'')).toLowerCase();
   return window.AKP_OFFER_RIGHTS?.[key]||null;
 }
 function includedBenefitsPage(c){
   const rights=offerRightsFor(c);
   if(!rights)return '<div class="page-title"><h1>Prestations de la formule</h1></div>'+
      '<div class="alert">Cette association pôle/formule ne figure pas dans le catalogue public. Vérifie la fiche avant de confirmer des prestations.</div>';
   const groups=Object.entries(rights.groups);
   const count=groups.reduce((total,[_,items])=>total+items.length,0);
   const optiConfigured=!!c.cycle?.optitrainer;
   const portalConfigured=!!c.portalAccessEnabled;
   const videoConfigured=!!c.phone;
   const macros=rights.groups['AK PRIME']?.some(x=>x.toLowerCase().includes('macro'))||false;
   const publishedMacro=macros&&(db.offerEntries||[]).some(e=>
      e.client_id===c.id&&e.tool_type==='macro_budget'&&e.client_visible&&
      Number(e.details?.kcal)>0&&!e.archived_at);
   const metrics=[
     ...(c.pole!=='Mental'?[['Optitrainer',optiConfigured?'Lien renseigné':'Lien à renseigner',optiConfigured]]:[]),
     ['Compte client',portalConfigured?'Accès autorisé':'Accès non autorisé',portalConfigured],
     ...(hasVideoReviews(c)?[['WhatsApp',videoConfigured?'Numéro renseigné':'Numéro manquant',videoConfigured]]:[]),
     ...(macros?[['Budget macronutritionnel',publishedMacro?'Publié au client':'À préparer / publier',publishedMacro]]:[])
   ];
   return '<div class="page-title"><div><h1>Prestations de la formule</h1>'+
      '<p>Contenu prévu pour '+esc(c.name)+' • '+esc(rights.label)+'. '+
      'Cette liste est issue de la même grille que les offres du site public.</p></div></div>'+
      '<div class="card panel" style="margin-bottom:12px">'+
      '<div class="row between" style="gap:12px;flex-wrap:wrap"><div><span class="muted tiny">Formule prévue au contrat</span>'+
      '<h3>'+esc(rights.label)+'</h3>'+
      '<div class="muted tiny">Début : '+esc(fmtDate(c.start))+' • Fin : '+esc(fmtDate(c.end))+
      (c.initialCommitmentMonths?' • Engagement initial : '+c.initialCommitmentMonths+' mois':'')+
      '</div></div><span class="status blue">'+count+' prestations / repères</span></div>'+
      '<div class="alert blue" style="margin-top:12px">Les éléments ci-dessous sont <strong>inclus dans la formule</strong>. '+
      'Leur présence dans cette liste ne confirme ni un paiement, ni une visio réalisée, ni l’activation de tous les accès.</div></div>'+
      '<div class="grid2" style="align-items:start">'+
      groups.map(([group,items])=>'<section class="card panel" style="height:100%">'+
        '<div class="row between"><h3>'+esc(group)+'</h3><span class="status blue">'+items.length+'</span></div>'+
        '<ul style="list-style:none;padding:0;margin:12px 0 0">'+
        items.map(item=>'<li style="padding:9px 0;border-bottom:1px solid #d0d7df55;display:flex;gap:9px">'+
         '<span style="color:#257857;font-weight:bold">✓</span><span>'+esc(item)+'</span></li>').join('')+
        '</ul></section>').join('')+'</div>'+
      '<div class="card panel" style="margin-top:13px"><h3>État des accès et des documents</h3>'+
      '<p class="muted tiny">Indicateurs techniques du dossier, indépendants des droits prévus par la formule.</p>'+
      '<div class="grid2">'+metrics.map(([label,statusText,ready])=>
        '<div class="item"><strong>'+esc(label)+'</strong>'+
        '<div class="tiny"><span class="status '+(ready?'green':'amber')+'">'+esc(statusText)+'</span></div></div>'
      ).join('')+'</div>'+
      '<p class="muted tiny" style="margin-top:12px">Les charges, questionnaires d’état de forme et séances physiques restent sur Optitrainer. '+
      'Les analyses vidéo sont envoyées sur WhatsApp ; AK PRIME n’en garde que le compteur.</p></div>';
 }
 const oldClientTab=clientTab;
 clientTab=function(c){
   if(state.tab==='offer-tools')return offerToolsPage(c);
   if(state.tab==='entitlements')return includedBenefitsPage(c);
   return oldClientTab(c);
 };
 const oldClientPage=clientPage;
 clientPage=function(){
   const c=currentClient(),html=oldClientPage();
   if(!c)return html;
   // L'ancien "Suivi" est désormais un accès Optitrainer et à l'historique conservé.
   const labelled=html.replace(/(<button data-tab="follow"[^>]*>)Suivi(<\/button>)/,
     '$1'+(c.pole==='Mental'?'Historique':'Optitrainer & historique')+'$2');
   const keys=toolKeys(c);
   const hasTools=keys.length||hasSleepDiary(c)||hasVideoReviews(c);
   const toolsTab=hasTools?'<button data-tab="offer-tools" class="'+(state.tab==='offer-tools'?'on':'')+'">'+
     esc(c.pole==='Mental'?'Préparation mentale':c.offer==='P3'?'Sommeil, macros & vidéos':c.pole==='Forme & Santé'&&c.offer==='Renforcé'?'Nutrition & vidéos':hasSleepDiary(c)?'Sommeil & vidéos':'Analyses vidéo')+'</button>':'';
   const rightsTab='<button data-tab="entitlements" class="'+(state.tab==='entitlements'?'on':'')+'">Prestations incluses</button>';
   return labelled.replace(/(<div class="card tabs no-print">[\s\S]*?)(<\/div>)/,
     (_,before,end)=>before+rightsTab+toolsTab+end);
 };
 const oldOverview=overview;
 overview=function(c){
   const original=oldOverview(c);
   const keys=toolKeys(c);
   const chips=keys.map(key=>'<span class="status blue" style="margin:3px 4px 3px 0">'+esc(TOOL_SPEC[key].label)+'</span>').join('')+
     (hasSleepDiary(c)?'<span class="status blue" style="margin:3px 4px 3px 0">Agenda de sommeil (client)</span>':'')+
     (hasVideoReviews(c)?'<span class="status blue" style="margin:3px 4px 3px 0">Analyses vidéo WhatsApp</span>':'');
   const intro='<div class="card panel" style="margin-bottom:13px;border-left:4px solid #bc955a">'+
     '<div class="row between"><div><div class="muted tiny">Prestations incluses dans le dossier</div>'+
     '<h3 style="margin:5px 0">'+esc(c.pole)+' — '+esc(c.offer)+'</h3>'+
     '<div class="tiny muted">'+(c.initialCommitmentMonths?'Engagement initial : '+c.initialCommitmentMonths+' mois • ':'')+
     'Fin actuelle : '+esc(fmtDate(c.end))+'</div></div>'+
     '<div class="row" style="gap:8px;flex-wrap:wrap">'+
     '<button class="btn primary small quickTab" data-tab="entitlements">Voir tout ce qui est inclus</button>'+
     ((keys.length||hasSleepDiary(c)||hasVideoReviews(c))?
       '<button class="btn ghost small quickTab" data-tab="offer-tools">Ouvrir les outils</button>':'')+'</div></div>'+
     '<div style="margin-top:10px">'+chips+'</div></div>';
   return intro+original;
 };
 function printMacroGuide(c,row){
   // Fiche entièrement générée depuis les champs coach : aucun fichier stocké.
   const d=row?.details||{};
   const topics=[
     ['Recommandations alimentaires',d.food_guidance],
     ['Répartition autour des séances',d.meal_timing],
     ['Hydratation et récupération',d.hydration]
   ].filter(([_,value])=>String(value||'').trim());
   if(!topics.length){alert('Renseigne au moins une recommandation dans le budget macro.');return;}
   const win=window.open('','_blank');
   if(!win){alert('Autorise la fenêtre de prévisualisation pour imprimer la fiche.');return;}
   const summary=[['Énergie',d.kcal,'kcal / jour'],['Protéines',d.protein,'g / jour'],
     ['Glucides',d.carbs,'g / jour'],['Lipides',d.fats,'g / jour']].map(([label,value,unit])=>
     '<div class="macro"><small>'+esc(label)+'</small><strong>'+esc(value??'—')+
     '</strong><span>'+esc(unit)+'</span></div>').join('');
   const sections=topics.map(([label,value])=>'<section><h2>'+esc(label)+
     '</h2><p>'+esc(value)+'</p></section>').join('');
   win.document.open();win.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
     '<title>AK PRIME — Recommandations alimentaires</title><style>'+
     'body{font:14px/1.6 Arial,sans-serif;color:#163247;max-width:780px;margin:40px auto;padding:0 24px}'+
     'header{border-bottom:3px solid #bc975d;padding-bottom:16px;margin-bottom:24px}'+
     'h1{margin:8px 0;font-size:28px}h2{font-size:17px;margin-bottom:8px}'+
     'section{border-bottom:1px solid #dde5eb;padding:12px 0}section p{white-space:pre-wrap}'+
     '.budget{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}'+
     '.macro{border:1px solid #dce4ec;padding:14px;min-width:120px;flex:1;display:grid}'+
     '.macro strong{font-size:22px}.macro small,.macro span{color:#596c7e}'+
     'footer{font-size:11px;color:#76899a;margin-top:30px}@media print{body{margin:12mm auto}}'+
     '</style></head><body><header><b>AK PRIME</b><h1>Recommandations alimentaires</h1>'+
     '<div>'+esc(c.name||'Client')+' · '+esc(fmtDate(row.entry_date))+'</div></header>'+
     '<div class="budget">'+summary+'</div>'+sections+
     (d.notes?'<section><h2>Repères et ajustements</h2><p>'+esc(d.notes)+'</p></section>':'')+
     '<footer>Conseils généraux individualisés, sans prescription de menu ni prise en charge médicale.</footer>'+
     '</body></html>');win.addEventListener('load',()=>{win.focus();win.print()},{once:true});
   win.document.close();
 }
 function entryList(c,type,archived=false){
   const rows=(db.offerEntries||[]).filter(x=>x.client_id===c.id&&x.tool_type===type&&!!x.archived_at===archived);
   if(!rows.length)return '<div class="muted tiny">'+(archived?'Aucune archive.':'Aucun enregistrement pour le moment.')+'</div>';
   return rows.map(x=>{
     const spec=TOOL_SPEC[type];
     const lines=spec.fields.map(([key,label])=>x.details?.[key]!==undefined&&String(x.details[key]).trim()
        ? '<div class="tiny" style="margin-top:5px"><strong>'+esc(label)+' :</strong> '+esc(String(x.details[key]))+'</div>':'').join('');
     return '<details class="item" style="margin-bottom:8px"><summary style="cursor:pointer"><strong>'+
       esc(x.title)+'</strong> <span class="muted tiny">• '+esc(fmtDate(x.entry_date))+
       (archived?' • Archivé':'')+'</span></summary>'+
       '<div style="margin-top:9px">'+lines+'</div>'+
       (type==='macro_budget'?
          '<div class="tiny" style="margin-top:9px"><strong>Recommandations PDF :</strong> '+(x.details?.pdf_path?'Jointes':'Facultatives')+
          ' • <strong>Accès client :</strong> '+(x.client_visible?'Publié':'Brouillon')+'</div>':'')+
       '<div class="row" style="margin-top:12px;gap:9px">'+
       (type==='macro_budget'&&x.details?.pdf_path?
         '<button class="btn ghost small offerMacroPdf" data-id="'+esc(x.id)+'">Ouvrir le PDF externe</button>':'')+
       (type==='macro_budget'&&[x.details?.food_guidance,x.details?.meal_timing,x.details?.hydration].some(Boolean)?
         '<button type="button" class="btn ghost small offerMacroPrint" data-id="'+esc(x.id)+'">Fiche conseils / PDF</button>':'')+
       (archived?'<button class="btn ghost small offerToolRestore" data-id="'+esc(x.id)+'">Restaurer</button>':
        '<button class="btn ghost small offerToolEdit" data-id="'+esc(x.id)+'">Modifier</button>'+
        '<button class="btn ghost small offerToolArchive" data-id="'+esc(x.id)+'">Archiver</button>')+
       '</div></details>';
   }).join('');
 }

 // Tableau de bord sommeil : calcul uniquement sur les nuits saisies par le client.
 // Les graphiques n'inventent aucune valeur pour les nuits ou champs manquants.
 let akSleepDashboardRange=14;
 const akSleepPremiumCSS=document.createElement('style');
 akSleepPremiumCSS.textContent=[
  '.akSleepPremium{background:#fff;border:1px solid #dbe4ec;border-radius:23px;overflow:hidden;margin-bottom:14px;box-shadow:0 16px 38px rgba(16,40,62,.075);min-width:0}',
  '.akSleepPremium *{box-sizing:border-box}',
  '.akSleepPremiumHero{background:radial-gradient(ellipse at 90% 0%,rgba(221,180,116,.18),transparent 44%),linear-gradient(127deg,#0b1b2b 0%,#193b53 100%);padding:26px 28px 24px;color:#fff}',
  '.akSleepPremiumTop{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}',
  '.akSleepPremiumEyebrow{font-size:10px;color:#e9c891;letter-spacing:.16em;font-weight:900;margin-bottom:7px}',
  '.akSleepPremiumTop h3{font-size:clamp(22px,2.5vw,30px);line-height:1.2;color:#fff;margin:0 0 9px;letter-spacing:-.025em}',
  '.akSleepPremiumTop p{font-size:12px;color:#c5d6e1;line-height:1.6;margin:0;max-width:580px}',
  '.akSleepPremiumPeriods{display:flex;align-items:center;gap:5px;flex-wrap:wrap;border:1px solid #446176;border-radius:13px;padding:5px;background:rgba(255,255,255,.07)}',
  '.akSleepPremiumPeriods button{background:transparent;color:#cbdce6;border:0;border-radius:9px;padding:9px 10px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}',
  '.akSleepPremiumPeriods button.is-active{background:#e9c58a;color:#173047;box-shadow:0 3px 9px #0003}',
  '.akSleepPremiumPeriods button:focus-visible{outline:3px solid #f6dca8;outline-offset:2px}',
  '.akSleepPremiumKPIs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:24px}',
  '.akSleepPremiumKPI{padding:16px 16px 15px;border:1px solid rgba(217,233,241,.2);border-radius:15px;background:rgba(255,255,255,.065);min-width:0}',
  '.akSleepPremiumKPI span{display:block;font-size:11px;color:#b8cedc;line-height:1.5}',
  '.akSleepPremiumKPI strong{display:block;font-size:clamp(22px,2.5vw,29px);line-height:1.35;letter-spacing:-.045em;color:#fff;margin:5px 0 3px;font-variant-numeric:tabular-nums}',
  '.akSleepPremiumKPI small{display:block;font-size:10px;line-height:1.5;color:#d8b982}',
  '.akSleepPremiumBody{padding:23px 27px 25px;background:linear-gradient(180deg,#fff,#fafbfd)}',
  '.akSleepPremiumCharts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}',
  '.akSleepPremiumGraph{min-width:0;padding:17px 18px 12px;border:1px solid #e0e8f0;border-radius:17px;background:#fff}',
  '.akSleepPremiumGraphHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}',
  '.akSleepPremiumGraphHead h4{color:#17354a;font-size:14px;line-height:1.4;margin:0}',
  '.akSleepPremiumGraphHead p{font-size:11px;color:#778a9b;margin:4px 0 0;line-height:1.5}',
  '.akSleepPremiumGraphValue{font-size:16px;font-weight:900;white-space:nowrap;color:#183c58;font-variant-numeric:tabular-nums}',
  '.akSleepPremiumGraph.gold .akSleepPremiumGraphValue{color:#ac7836}',
  '.akSleepPremiumSVG{width:100%;height:auto;display:block;margin-top:13px;overflow:visible}',
  '.akSleepPremiumEmpty{height:200px;display:flex;align-items:center;justify-content:center;text-align:center;color:#778a9b;font-size:12px}',
  '.akSleepPremiumBottom{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:15px}',
  '.akSleepPremiumStat{padding:15px 17px;border:1px solid #e0e8f0;border-radius:14px;background:#f5f8fb;min-width:0}',
  '.akSleepPremiumStat span{display:block;font-size:11px;color:#6e8091;margin-bottom:5px}',
  '.akSleepPremiumStat strong{display:block;font-size:16px;line-height:1.4;font-weight:850;color:#18354c;font-variant-numeric:tabular-nums}',
  '.akSleepPremiumStat small{display:block;font-size:10px;color:#8393a0;margin-top:5px;line-height:1.5}',
  '.akSleepPremiumFoot{font-size:10px;color:#8494a1;line-height:1.6;margin:13px 2px 0}',
  '@media(max-width:860px){.akSleepPremiumKPIs{grid-template-columns:repeat(2,minmax(0,1fr))}.akSleepPremiumCharts{grid-template-columns:1fr}}',
  '@media(max-width:550px){.akSleepPremiumHero{padding:19px 17px}.akSleepPremiumBody{padding:14px}.akSleepPremiumKPI{padding:12px}.akSleepPremiumKPI strong{font-size:24px}.akSleepPremiumGraph{padding:12px}.akSleepPremiumBottom{grid-template-columns:1fr}.akSleepPremiumPeriods{width:100%;justify-content:space-between}.akSleepPremiumPeriods button{flex:1;padding:8px 3px}}'
 ].join('\n');
 document.head.appendChild(akSleepPremiumCSS);
 function akSleepNumber(value,min=0,max=1000){
   if(value===null||value===undefined||String(value).trim()==='')return null;
   const num=Number(value);
   return Number.isFinite(num)&&num>=min&&num<=max?num:null;
 }
 function akSleepAverage(values){
   const valid=values.filter(x=>x!==null&&Number.isFinite(x));
   return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;
 }
 function akSleepHours(value){
   if(value===null)return '—';
   const total=Math.round(value*60);
   return Math.floor(total/60)+' h '+String(total%60).padStart(2,'0');
 }
 function akSleepClock(records,key,bedtime=false){
   const points=records.map(row=>{
     const match=/^(\d{2}):(\d{2})/.exec(String(row[key]||''));
     if(!match)return null;
     const h=Number(match[1]),m=Number(match[2]);
     if(h>23||m>59)return null;
     const minutes=h*60+m;
     return bedtime&&h<12?minutes+1440:minutes;
   });
   const mean=akSleepAverage(points);
   if(mean===null)return '—';
   const total=((Math.round(mean)%1440)+1440)%1440;
   return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
 }
 function akSleepCurve(rows,key,title,opts){
   const values=rows.map(row=>({
     date:String(row.sleep_date||''),
     value:akSleepNumber(row[key],opts.minValid,opts.maxValid)
   }));
   const filtered=values.filter(row=>row.value!==null);
   if(!filtered.length)return '<div class="akSleepPremiumEmpty">Aucune donnée de '+esc(title.toLowerCase())+' sur cette sélection.</div>';
   const width=650,height=235,left=44,right=19,top=17,bottom=38;
   const bottomY=height-bottom,plotW=width-left-right,plotH=bottomY-top;
   const vals=filtered.map(x=>x.value);
   const min=opts.fixedMin??Math.max(0,Math.floor(Math.min(...vals)-.5));
   let max=opts.fixedMax??Math.ceil(Math.max(...vals)+.5);
   if(max<=min)max=min+1;
   const range=max-min;
   const xAt=i=>left+(values.length===1?plotW/2:i*plotW/(values.length-1));
   const yAt=v=>top+(max-v)*plotH/range;
   const plot=values.map((v,i)=>v.value===null?null:{x:xAt(i),y:yAt(v.value),v:v.value,date:v.date});
   const spans=[];let part=[];
   plot.forEach(point=>{
     if(!point){if(part.length)spans.push(part);part=[];}
     else part.push(point);
   });
   if(part.length)spans.push(part);
   const gradient='akSleepFill'+key;
   const grid=Array.from({length:5},(_,i)=>{
     const val=min+(range*i/4),y=yAt(val);
     const label=opts.fixedMax!==undefined?String(Math.round(val)):String(Number(val.toFixed(1)));
     return '<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y.toFixed(2)+'" y2="'+y.toFixed(2)+'" stroke="#e9eef3" stroke-dasharray="4 5"/>'+
       '<text x="'+(left-11)+'" y="'+(y+4).toFixed(2)+'" font-size="12" fill="#8292a3" text-anchor="end">'+label+'</text>';
   }).join('');
   const shapes=spans.map(group=>{
     const path=group.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');
     const first=group[0],last=group[group.length-1];
     const area=path+' L'+last.x.toFixed(2)+' '+bottomY+' L'+first.x.toFixed(2)+' '+bottomY+' Z';
     return '<path d="'+area+'" fill="url(#'+gradient+')" opacity=".76"/>'+
       '<path d="'+path+'" fill="none" stroke="'+opts.color+'" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
   }).join('');
   const dots=plot.filter(Boolean).map(p=>
     '<circle cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="4.1" fill="'+opts.color+'" stroke="#fff" stroke-width="2">'+
       '<title>'+esc(fmtDate(p.date))+' : '+p.v.toFixed(1)+' '+esc(opts.unit)+'</title></circle>'
   ).join('');
   const every=Math.max(1,Math.ceil((values.length-1)/5));
   const ticks=values.map((p,i)=>(i===0||i===values.length-1||i%every===0)?
     '<text x="'+xAt(i).toFixed(2)+'" y="'+(height-11)+'" font-size="11" fill="#8494a4" text-anchor="middle">'+
       esc(p.date.slice(8,10)+'/'+p.date.slice(5,7))+'</text>':'').join('');
   return '<svg class="akSleepPremiumSVG" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(title)+' sur les '+values.length+' nuits renseignées">'+
     '<defs><linearGradient id="'+gradient+'" x1="0" y1="0" x2="0" y2="1">'+
     '<stop offset="0%" stop-color="'+opts.color+'" stop-opacity=".21"/>'+
     '<stop offset="100%" stop-color="'+opts.color+'" stop-opacity="0"/></linearGradient></defs>'+
     grid+shapes+dots+ticks+'</svg>';
 }
 function renderSleepPremiumDashboard(history){
   if(!history.length)return '';
   const recent=history.slice(0,akSleepDashboardRange).slice().reverse();
   const latest=history[0];
   const durations=recent.map(x=>akSleepNumber(x.duration_hours,.25,24));
   const qualities=recent.map(x=>akSleepNumber(x.quality,1,5));
   const durationAverage=akSleepAverage(durations),qualityAverage=akSleepAverage(qualities);
   const awakeningCounts=recent.map(x=>akSleepNumber(x.awakenings_count,0,12));
   const countAverage=akSleepAverage(awakeningCounts);
   const awakeTimes=recent.map(row=>{
     const count=akSleepNumber(row.awakenings_count,0,12);
     if(count===0)return 0;
     const times=Array.isArray(row.awakenings)?row.awakenings:[];
     if(count===null||count>times.length)return null;
     const minutes=times.slice(0,count).map(x=>akSleepNumber(x.minutes,0,180));
     return minutes.some(x=>x===null)?null:minutes.reduce((a,b)=>a+b,0);
   });
   const awakeAvg=akSleepAverage(awakeTimes);
   const valid=durations.filter(x=>x!==null);
   const regularity=valid.length>=3?
     Math.round(valid.filter(v=>Math.abs(v-durationAverage)<=.5).length/valid.length*100):null;
   const last7=history.slice(0,7).map(x=>akSleepNumber(x.duration_hours,.25,24));
   const prior7=history.slice(7,14).map(x=>akSleepNumber(x.duration_hours,.25,24));
   const currentAvg=akSleepAverage(last7),previousAvg=akSleepAverage(prior7);
   const delta=currentAvg!==null&&previousAvg!==null&&
     last7.filter(x=>x!==null).length>=3&&prior7.filter(x=>x!==null).length>=3?
     Math.round((currentAvg-previousAvg)*60):null;
   const trend=delta===null?'Comparaison disponible dès 10 nuits':
     delta===0?'Stable sur les 7 dernières nuits':
     (delta>0?'+':'−')+Math.abs(delta)+' min vs 7 nuits précédentes';
   const subtitle='Dernière saisie le '+fmtDate(latest.sleep_date)+' · '+recent.length+' nuit'+(recent.length>1?'s':'')+' affichée'+(recent.length>1?'s':'');
   const kpi=(label,value,detail)=>'<div class="akSleepPremiumKPI"><span>'+label+'</span>'+
     '<strong>'+esc(value)+'</strong><small>'+esc(detail)+'</small></div>';
   const stat=(label,value,detail)=>'<div class="akSleepPremiumStat"><span>'+label+'</span>'+
     '<strong>'+esc(value)+'</strong><small>'+esc(detail)+'</small></div>';
   return '<section class="akSleepPremium" aria-label="Progression du sommeil du client">'+
    '<div class="akSleepPremiumHero"><div class="akSleepPremiumTop"><div>'+
     '<div class="akSleepPremiumEyebrow">AK PRIME · SUIVI DU SOMMEIL</div>'+
     '<h3>La progression, nuit après nuit</h3>'+
     '<p>'+esc(subtitle)+'. Indicateurs calculés à partir des déclarations du client.</p></div>'+
     '<div class="akSleepPremiumPeriods" aria-label="Choisir le nombre de nuits">'+
     [7,14,30,90].map(n=>'<button type="button" class="akSleepRangeBtn '+(akSleepDashboardRange===n?'is-active':'')+
       '" data-nights="'+n+'" aria-pressed="'+(akSleepDashboardRange===n?'true':'false')+'">'+n+' nuits</button>').join('')+
     '</div></div>'+
     '<div class="akSleepPremiumKPIs">'+
       kpi('Durée moyenne',akSleepHours(durationAverage),trend)+
       kpi('Qualité moyenne',qualityAverage!==null?qualityAverage.toFixed(1)+' / 5':'—','Qualité déclarée par le client')+
       kpi('Réveils nocturnes',countAverage!==null?countAverage.toFixed(1):'—','Nombre moyen par nuit renseignée')+
       kpi('Régularité de la durée',regularity!==null?regularity+' %':'—','Nuits à ± 30 min de la moyenne')+
     '</div></div>'+
     '<div class="akSleepPremiumBody">'+
       '<div class="akSleepPremiumCharts">'+
         '<div class="akSleepPremiumGraph"><div class="akSleepPremiumGraphHead"><div><h4>Durée de sommeil</h4>'+
           '<p>Évolution de la durée renseignée</p></div><div class="akSleepPremiumGraphValue">'+esc(akSleepHours(durationAverage))+'</div></div>'+
           akSleepCurve(recent,'duration_hours','Durée de sommeil',{minValid:.25,maxValid:24,color:'#417eae',unit:'h'})+'</div>'+
         '<div class="akSleepPremiumGraph gold"><div class="akSleepPremiumGraphHead"><div><h4>Qualité ressentie</h4>'+
           '<p>Note donnée par le client, de 1 à 5</p></div><div class="akSleepPremiumGraphValue">'+
           esc(qualityAverage!==null?qualityAverage.toFixed(1)+' / 5':'—')+'</div></div>'+
           akSleepCurve(recent,'quality','Qualité ressentie',{minValid:1,maxValid:5,fixedMin:1,fixedMax:5,color:'#c2934d',unit:'/5'})+'</div>'+
       '</div>'+
       '<div class="akSleepPremiumBottom">'+
         stat('Heure de coucher moyenne',akSleepClock(recent,'bedtime',true),'Calculée sur les horaires disponibles')+
         stat('Heure de réveil moyenne',akSleepClock(recent,'wakeup'),'Calculée sur les horaires disponibles')+
         stat('Temps éveillé la nuit',awakeAvg!==null?Math.round(awakeAvg)+' min':'—','Moyenne des durées nocturnes documentées')+
       '</div>'+
       '<p class="akSleepPremiumFoot">Les dates correspondent aux nuits renseignées, sans interpolation des jours manquants. Données déclaratives : les tendances sont descriptives, pas un diagnostic médical. Les observations détaillées restent accessibles dans l’agenda ci-dessous.</p>'+
     '</div></section>';
 }
 function offerToolsPage(c){
   const keys=toolKeys(c),all=(db.offerEntries||[]).filter(x=>x.client_id===c.id);
   const sleepHistory=(db.clientSleepDiary||[])
     .filter(x=>x.client_id===c.id)
     .sort((a,b)=>String(b.sleep_date||'').localeCompare(String(a.sleep_date||'')))
     .slice(0,90);
   const videoMarkup=videoMarkupFor(c);
   const sleepEntry=x=>'<details class="item"><summary style="cursor:pointer"><strong>'+esc(fmtDate(x.sleep_date))+'</strong> • '+
     esc(x.duration_hours)+' h • qualité '+esc(x.quality)+'/5</summary><div class="tiny" style="margin-top:6px">'+
     (x.bedtime?'Coucher : '+esc(String(x.bedtime).slice(0,5))+' • ':'')+
     (x.wakeup?'Réveil : '+esc(String(x.wakeup).slice(0,5))+' • ':'')+
     esc(x.notes||'Aucune observation')+'</div></details>';
   const sleepMarkup=hasSleepDiary(c)?'<div class="card panel" style="margin-bottom:13px">'+
     '<h3>Agenda de sommeil — rempli par le client</h3>'+
     '<div class="muted tiny">Le client renseigne ses nuits depuis son espace personnel. Optitrainer conserve le suivi de forme et de charge.</div>'+
     (sleepHistory.length?'<div class="list" style="margin-top:10px">'+
       sleepEntry(sleepHistory[0])+
       (sleepHistory.length>1?'<details style="margin-top:10px">'+
         '<summary style="cursor:pointer;font-size:12px;font-weight:800;color:#315b7d;padding:9px 4px">Voir l’historique des nuits précédentes ('+(sleepHistory.length-1)+')</summary>'+
         '<div class="list" style="margin-top:9px">'+sleepHistory.slice(1).map(sleepEntry).join('')+'</div></details>':'')+
       '</div>':
       '<div class="muted" style="margin-top:10px">Aucune nuit encore renseignée.</div>')+
     '</div>':'';
   const regular=keys.map(type=>{
     const spec=TOOL_SPEC[type],qty=all.filter(x=>x.tool_type===type&&!x.archived_at).length;
     return '<div class="card panel" style="margin-bottom:13px">'+
       '<div class="row between" style="gap:12px"><div><h3 style="margin-bottom:4px">'+esc(spec.label)+
       '</h3><div class="muted tiny">'+esc(spec.hint)+'</div></div>'+
       '<button class="btn primary small offerToolAdd" data-type="'+type+'">+ Ajouter</button></div>'+
       '<div class="section-title" style="margin-top:14px">'+qty+' entrée(s) enregistrée(s)</div>'+
       '<div class="list">'+entryList(c,type)+'</div></div>';
   }).join('');
   const retired=all.filter(e=>!keys.includes(e.tool_type));
   const archive=all.filter(e=>keys.includes(e.tool_type)&&e.archived_at);
   return '<div class="page-title"><div><h1>'+esc(workspaceLabel(c))+'</h1>'+
     '<p>AK PRIME : préparation mentale, sommeil et budgets macro. Entraînement, forme et charge : Optitrainer.</p></div></div>'+
     '<div class="alert blue" style="margin-bottom:13px"><strong>Répartition :</strong> '+
      'Optitrainer gère la programmation, les séances, la charge, la récupération et les échauffements. '+
      'AK PRIME conserve ici les analyses vidéo reçues, le sommeil et les budgets macro selon ta formule.</div>'+
     videoMarkup+(hasSleepDiary(c)?renderSleepPremiumDashboard(sleepHistory):'')+sleepMarkup+regular+
     (archive.length?'<div class="card panel"><h3>Enregistrements archivés</h3>'+
       archive.map(x=>'<div class="section-title">'+esc(TOOL_SPEC[x.tool_type]?.label||x.tool_type)+'</div>'+
         entryList(c,x.tool_type,true)).join('')+'</div>':'')+
     (retired.length?'<div class="card panel" style="margin-top:13px"><h3>Historique d’une ancienne offre</h3>'+
       '<p class="muted tiny">Conservé en lecture seule après changement de prestation.</p>'+
       retired.map(x=>'<div class="item" style="margin-bottom:7px"><strong>'+esc(TOOL_SPEC[x.tool_type]?.label||x.tool_type)+
         '</strong> — '+esc(x.title)+' <span class="muted tiny">'+esc(fmtDate(x.entry_date))+'</span></div>').join('')+
       '</div>':'');
 }
 function fieldHtml(key,label,kind,old){
   const id='offerField_'+key,v=String(old===null||old===undefined?'':old),base='class="input" id="'+id+'"';
   if(kind==='textarea')return '<div class="field" '+(['food_guidance','meal_timing','hydration'].includes(key)?'style="grid-column:1 / -1"':'')+'><label>'+esc(label)+'</label><textarea class="textarea" id="'+id+'" maxlength="2500" rows="4">'+esc(v)+'</textarea></div>';
   const attrs=kind==='number'?'type="number" step="0.1" min="0" max="10000"':kind==='time'?'type="time"':kind==='url'?'type="url" maxlength="500"':'type="text" maxlength="500"';
   return '<div class="field"><label>'+esc(label)+'</label><input '+base+' '+attrs+' value="'+esc(v)+'"></div>';
 }
 function editEntry(c,type,row){
   if(!toolKeys(c).includes(type))return alert('Cet outil ne fait plus partie de l’offre de ce client.');
   const spec=TOOL_SPEC[type],details=row?.details||{};
   modal((row?'Modifier : ':'Ajouter : ')+esc(spec.label),
    '<p class="muted tiny">'+esc(spec.hint)+'</p>'+
    '<div class="grid2"><div class="field"><label>Date</label><input id="offerEntryDate" type="date" class="input" value="'+esc(row?.entry_date||localDateISO())+'"></div>'+
    '<div class="field"><label>Intitulé</label><input id="offerEntryTitle" class="input" maxlength="180" value="'+esc(row?.title||spec.label)+'"></div></div>'+
    '<div class="grid2">'+spec.fields.map(([key,label,kind])=>fieldHtml(key,label,kind,details[key])).join('')+'</div>'+
    (type==='macro_budget'?'<div class="alert blue tiny">Repère : protéines et glucides = 4 kcal/g ; lipides = 9 kcal/g. Objectifs journaliers sans menus détaillés.</div>'+
     '<div class="muted tiny" style="margin:8px 0">Les recommandations saisies ci-dessus apparaissent directement dans l’espace client une fois publiées. Une version imprimable peut également être enregistrée en PDF depuis le dossier coach, sans pièce jointe obligatoire.</div>'+
     '<div class="field" style="margin-top:12px"><label>PDF externe de recommandations (facultatif, 5 Mo maximum)</label><input id="offerMacroPdfFile" class="input" type="file" accept=".pdf,application/pdf"></div>'+
     '<label class="check"><input id="offerMacroPublish" type="checkbox" '+(row?.client_visible?'checked':'')+'> Publier les objectifs de calories et macronutriments dans l’espace client</label>'+
     (details.pdf_path?'<div class="muted tiny">PDF déjà enregistré : tu peux le conserver ou le remplacer.</div>':'<div class="muted tiny">Les valeurs peuvent être publiées seules. Le PDF sert uniquement de recommandations complémentaires.</div>'):''),

    '<button class="btn ghost" id="cancelM">Annuler</button><button class="btn primary" id="saveM">Enregistrer</button>');
   document.getElementById('cancelM').onclick=closeModal;
   document.getElementById('saveM').onclick=async()=>{
     const title=document.getElementById('offerEntryTitle').value.trim();
     const date=document.getElementById('offerEntryDate').value;
     if(title.length<2||!date)return alert('Indique une date et un intitulé.');
     const out={};
     for(const [key,label,kind] of spec.fields){
       const input=document.getElementById('offerField_'+key);
       const value=input.value.trim();
       if(kind==='url'&&value){if(!input.checkValidity()||!/^https:\/\//i.test(value))return alert('Le lien vidéo doit être une adresse HTTPS valide.')}
       if(kind==='number'&&value!==''){
         const n=Number(value);
         const maximum=key==='duration'?600:key==='hours'?24:
            ['fatigue','stress','soreness','sleep_quality'].includes(key)?7:key==='quality'?5:10000;
         if(!Number.isFinite(n)||n<0||n>maximum)return alert(label+' : valeur invalide.');
         if(['fatigue','stress','soreness','sleep_quality','quality'].includes(key)&&n<1)return alert(label+' : minimum 1.');
         out[key]=n;
       }else out[key]=value;
     }
     if(type==='macro_budget'){
       const sum=4*Number(out.protein||0)+4*Number(out.carbs||0)+9*Number(out.fats||0);
       if(!Number(out.kcal)||!sum)return alert('Saisis le budget calorique et les trois macronutriments.');
       if(Math.abs(sum-Number(out.kcal))>150&&!confirm('Les macros représentent environ '+Math.round(sum)+' kcal, différent de l’objectif '+out.kcal+' kcal. Continuer ?'))return;
     }
     if(type==='sleep_entry'&&(!out.hours||!out.quality))return alert('Renseigne la durée et la qualité du sommeil.');
     const macro=type==='macro_budget';
     const pdf=macro?document.getElementById('offerMacroPdfFile')?.files?.[0]:null;
     const publish=macro&&!!document.getElementById('offerMacroPublish')?.checked;
     if(pdf&&(pdf.size>5242880||pdf.size===0||!(/\.pdf$/i.test(pdf.name)&&pdf.type==='application/pdf')))
       return alert('Sélectionne un PDF valide de 5 Mo maximum.');
     const save=document.getElementById('saveM');save.disabled=true;
     let uploadedPath='';
     try{
       const details={...out};
       if(macro&&row?.details?.pdf_path)details.pdf_path=row.details.pdf_path;
       if(pdf){
         uploadedPath=c.id+'/'+crypto.randomUUID()+'.pdf';
         const result=await supa.storage.from('akprime-macro-pdfs').upload(uploadedPath,pdf,{cacheControl:'3600',contentType:'application/pdf',upsert:false});
         if(result.error)throw Error('PDF : '+result.error.message);
         details.pdf_path=uploadedPath;
       }
       const data={client_id:c.id,tool_type:type,entry_date:date,title,details};
       let res;
       if(row)res=await supa.from('client_offer_entries').update({
         entry_date:date,title,details,client_visible:publish
       }).eq('id',row.id).eq('client_id',c.id);
       else res=await supa.from('client_offer_entries').insert({...data,
          client_visible:publish,created_by:authUser.id});
       if(res.error)throw Error(res.error.message);
       closeModal();await loadSupabaseData();render();
       toast(macro?(publish?'Objectifs nutritionnels publiés au client.':'Budget enregistré en brouillon.'):'Outil enregistré dans Supabase.');
     }catch(e){
       if(uploadedPath)await supa.storage.from('akprime-macro-pdfs').remove([uploadedPath]);
       alert('Enregistrement impossible : '+e.message);save.disabled=false
     }
   };
 }

 document.addEventListener('click',async e=>{
   const plus=e.target.closest?.('.akAddVideo'),minus=e.target.closest?.('.akVoidVideo');
   if(!plus&&!minus||state.view!=='client'||state.tab!=='offer-tools')return;
   e.preventDefault();e.stopImmediatePropagation();
   const c=currentClient();
   if(!c||!hasVideoReviews(c))return;
   if(plus){
     modal('Enregistrer une vidéo reçue sur WhatsApp',
      '<div class="alert blue">Cette action enregistre seulement la date et une note. Aucune vidéo ni pièce jointe n’est stockée sur AK PRIME.</div>'+
      '<div class="field"><label>Date de réception</label><input id="videoReceiveDate" class="input" type="date" max="'+localDateISO()+'" value="'+localDateISO()+'"></div>'+
      '<div class="field"><label>Note facultative (exercice analysé)</label><input id="videoReceiveNote" class="input" maxlength="220" placeholder="Ex. Squat : analyse technique"></div>',
      '<button class="btn ghost" id="cancelVideoM">Annuler</button><button class="btn primary" id="saveVideoM">Comptabiliser +1</button>');
     document.getElementById('cancelVideoM').onclick=closeModal;
     document.getElementById('saveVideoM').onclick=async()=>{
       const date=document.getElementById('videoReceiveDate').value,notes=document.getElementById('videoReceiveNote').value.trim();
       if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>localDateISO())return alert('Date de réception invalide.');
       const button=document.getElementById('saveVideoM');button.disabled=true;
       const {error}=await supa.from('client_video_receipts').insert({
         client_id:c.id,received_on:date,notes,channel:'whatsapp',recorded_by:authUser.id});
       if(error){button.disabled=false;return alert('Erreur : '+error.message)}
       closeModal();await loadSupabaseData();render();toast('Vidéo reçue comptabilisée.');
     };
     return;
   }
   if(minus){
     if(authProfile?.role!=='owner')return alert('Seul le propriétaire peut annuler une réception.');
     const row=(db.videoReceipts||[]).find(x=>x.id===minus.dataset.id&&x.client_id===c.id);
     if(!row)return;
     const reason=prompt('Motif de correction (8 caractères minimum) :');
     if(!reason||reason.trim().length<8)return;
     const {error}=await supa.rpc('owner_void_video_receipt',{p_id:row.id,p_reason:reason.trim()});
     if(error)return alert('Correction refusée : '+error.message);
     await loadSupabaseData();render();toast('Réception annulée, historique conservé.');
   }
 },true);
 document.addEventListener('click',async e=>{
   if(state.view!=='client'||state.tab!=='offer-tools')return;
   const add=e.target.closest('.offerToolAdd'),edit=e.target.closest('.offerToolEdit');
   const archive=e.target.closest('.offerToolArchive'),restore=e.target.closest('.offerToolRestore');
   const pdfButton=e.target.closest('.offerMacroPdf');
   const printButton=e.target.closest('.offerMacroPrint');
   const c=currentClient();
   if(printButton){
     const row=(db.offerEntries||[]).find(x=>x.id===printButton.dataset.id&&x.client_id===c.id);
     if(row)printMacroGuide(c,row);
     return;
   }
   if(pdfButton){
     const row=(db.offerEntries||[]).find(x=>x.id===pdfButton.dataset.id&&x.client_id===c.id);
     if(!row?.details?.pdf_path)return alert('Aucun PDF joint.');
     const {data,error}=await supa.storage.from('akprime-macro-pdfs').createSignedUrl(row.details.pdf_path,90);
     if(error||!data?.signedUrl)return alert('Impossible d’ouvrir le PDF : '+(error?.message||'lien indisponible'));
     window.open(data.signedUrl,'_blank','noopener');return;
   }
   if(add){editEntry(c,add.dataset.type,null);return}
   if(edit){const row=(db.offerEntries||[]).find(x=>x.id===edit.dataset.id&&x.client_id===c.id);
     if(row)editEntry(c,row.tool_type,row);return}
   const trigger=archive||restore;if(!trigger)return;
   const row=(db.offerEntries||[]).find(x=>x.id===trigger.dataset.id&&x.client_id===c.id);
   if(!row)return;
   const isRestore=!!restore;
   if(!confirm(isRestore?'Restaurer cet enregistrement ?':'Archiver cet enregistrement sans supprimer son historique ?'))return;
   const {error}=await supa.from('client_offer_entries').update({archived_at:isRestore?null:new Date().toISOString()}).eq('id',row.id).eq('client_id',c.id);
   if(error)return alert('Modification impossible : '+error.message);
   await loadSupabaseData();render();toast(isRestore?'Enregistrement restauré.':'Enregistrement archivé.');
 },true);
document.addEventListener('click',e=>{
   const period=e.target.closest?.('.akSleepRangeBtn');
   if(!period)return;
   const inCoach=state.view==='client'&&state.tab==='offer-tools';
   const inClientPassport=authProfile?.role==='client'&&clientPortalView==='passport'&&
     akSleepPassportEligible(passportActiveModel);
   if(!inCoach&&!inClientPassport)return;
   const days=Number(period.dataset.nights);
   if(![7,14,30,90].includes(days))return;
   e.preventDefault();
   akSleepDashboardRange=days;
   if(inClientPassport)renderClientPortal();
   else render();
 },true);

 // Le tableau de bord partagé devient une rubrique du Passeport uniquement
 // pour les clients Performance Premium (P3), y compris en compte TEST P3.
 function akSleepPassportEligible(model){
   return model?.akPassportRole==='client'&&model.pole==='Performance'&&
     String(model.offer||'').toUpperCase()==='P3';
 }
 const beforeSleepPassportNav=passportBookNav;
 passportBookNav=function(){
   const html=beforeSleepPassportNav();
   if(!akSleepPassportEligible(passportActiveModel))return html;
   const selected=passportBookPage==='sleep';
   const button='<button type="button" class="passportBookTab '+(selected?'on':'')+
     '" data-passport-page="sleep" aria-pressed="'+(selected?'true':'false')+'">'+
     '<span>Sommeil</span><span class="akp-tab-arrow" aria-hidden="true">›</span></button>';
   return html.replace('6 RUBRIQUES À EXPLORER','7 RUBRIQUES À EXPLORER')
     .replace('</nav>',button+'</nav>');
 };
 const beforeSleepPassportBody=renderPassportBookPage;
 renderPassportBookPage=function(model){
   if(passportBookPage!=='sleep')return beforeSleepPassportBody(model);
   if(!akSleepPassportEligible(model))return beforeSleepPassportBody(model);
   const rows=(Array.isArray(model.akPassportSleep)?model.akPassportSleep:[])
     .slice().sort((a,b)=>String(b.sleep_date||'').localeCompare(String(a.sleep_date||'')));
   const graph=rows.length?renderSleepPremiumDashboard(rows):
     '<section class="akSleepPassportEmpty"><div class="akSleepPassportEmptyIcon" aria-hidden="true">☾</div>'+
     '<h3>Votre suivi du sommeil commence ici</h3>'+
     '<p>Renseigne ta première nuit dans « Mon accompagnement ». Les graphiques de progression apparaîtront automatiquement dans ton Passeport.</p>'+
     '<button type="button" class="akSleepGoToDiary">Renseigner mon sommeil</button></section>';
   return '<div class="akp-page akSleepPassportPage">'+
     '<div class="akp-page-title"><div><span>SUIVI PERSONNALISÉ</span>'+
     '<h2>Mon sommeil</h2><p>La progression de tes nuits à partir de ton agenda AK PRIME.</p>'+
     '</div><div class="akp-date-chip">'+rows.length+' nuit'+(rows.length>1?'s':'')+' enregistrée'+(rows.length>1?'s':'')+'</div></div>'+
     graph+'</div>';
 };
 const akSleepPassportCSS=document.createElement('style');
 akSleepPassportCSS.textContent=[
   '.akSleepPassportPage{max-width:1220px;margin:0 auto}',
   '.akSleepPassportPage .akSleepPremium{margin:0}',
   '.akSleepPassportEmpty{text-align:center;background:#fff;border:1px solid #dce5ed;box-shadow:0 11px 25px #163a5320;border-radius:20px;padding:42px 24px;color:#15344b}',
   '.akSleepPassportEmptyIcon{width:68px;height:68px;border-radius:20px;background:#eaf0f6;color:#335c80;display:grid;place-items:center;font-size:34px;margin:0 auto 16px}',
   '.akSleepPassportEmpty h3{font-size:22px;font-weight:850;margin:0 0 8px}',
   '.akSleepPassportEmpty p{max-width:540px;margin:0 auto 18px;font-size:13px;color:#6b8092;line-height:1.65}',
   '.akSleepGoToDiary{background:#285577;color:#fff;border:0;padding:12px 18px;border-radius:11px;font-size:12px;font-weight:850;cursor:pointer}',
   '.akSleepGoToDiary:focus-visible{outline:3px solid #ce9d58;outline-offset:3px}'
 ].join('\n');
 document.head.appendChild(akSleepPassportCSS);
 document.addEventListener('click',event=>{
   const button=event.target.closest?.('.akSleepGoToDiary');
   if(!button||authProfile?.role!=='client'||clientPortalView!=='passport')return;
   event.preventDefault();
   clientPortalView='suivi';
   renderClientPortal();
   document.getElementById('akSleepDiary')?.scrollIntoView({behavior:'smooth',block:'start'});
 },true);

window.AKP_OFFER_TOOLS_READY=true;
})();
