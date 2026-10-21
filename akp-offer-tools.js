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
   ['notes','Justification et ajustements','textarea']]},
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
  forme:'Analyses vidéo & sommeil'
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
   if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(date||'')))return '';
   const [y,m,d]=date.split('-').map(Number);
   const t=new Date(Date.UTC(y,m-1+months,1,12));
   const max=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0,12)).getUTCDate();
   t.setUTCDate(Math.min(d,max));
   return t.toISOString().slice(0,10);
 }
 function coachingMonth(c,today){
   const anchor=String(c?.start||'').slice(0,10);
   const d=String(today||localDateISO()).slice(0,10);
   if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(anchor)||anchor>d){
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
   const whatsappDigits=String(c.phone||'').replace(/\\D/g,'');
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
   return (c?.pole==='Performance'&&c?.offer==='P3')||
     (c?.pole==='Forme & Santé'&&c?.offer==='Renforcé');
 }
 function toolKeys(c){
   const p=String(c?.pole||''),o=String(c?.offer||'').trim().toLowerCase();
   if(p==='Mental')return ['mental_session','mental_homework','mental_practice'];
   if(p==='Performance'&&o==='p3')return ['macro_budget'];
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
 follow=function(c){
   const rows=(c.checkins||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
   const historic=rows.length?'<details class="card panel" style="margin-top:12px">'+
     '<summary style="cursor:pointer"><strong>Historique des anciens bilans AK PRIME ('+
     rows.length+')</strong></summary><p class="muted tiny">Archives en lecture seule. Les nouveaux suivis de forme et de charge se font sur Optitrainer.</p>'+
     rows.map(w=>'<div class="item"><strong>'+esc(fmtDate(w.date))+'</strong>'+
       '<div class="muted tiny">Ressenti : '+esc(w.feeling||'—')+'</div>'+
       '<div class="muted tiny">Gêne : '+esc(w.pain||'—')+'</div>'+
       '<div class="muted tiny">Décision coach : '+esc(w.coach||'—')+'</div></div>').join('')+
     '</details>':'';
   if(c.pole==='Mental')return '<div class="page-title"><h1>Historique</h1></div>'+
     '<div class="card panel"><h3>Préparation mentale</h3>'+
     '<p>Les séances, routines et exercices sont dans l’onglet Préparation mentale de ce client.</p>'+
     '<button class="btn primary small quickTab" data-tab="offer-tools">Ouvrir les séances mentales</button></div>'+historic;
   return '<div class="page-title"><div><h1>Suivi physique — Optitrainer</h1>'+
     '<p>La programmation, les séances, les échauffements, la charge, la récupération et l’état de forme sont gérés dans Optitrainer.</p></div></div>'+
     '<div class="card panel"><h3>Accéder à la programmation du client</h3>'+
     (c.cycle?.optitrainer&&/^https:\/\//i.test(c.cycle.optitrainer)?
      '<a class="btn primary" href="'+esc(c.cycle.optitrainer)+'" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Ouvrir Optitrainer</a>':
      '<div class="alert">Renseigne le lien Optitrainer du client depuis sa fiche administrative ou ses paramètres de suivi.</div>')+
     '<p class="muted tiny" style="margin-top:9px">Aucun bilan de forme ni séance physique n’est créé en double dans AK PRIME.</p></div>'+historic;
 };
 const oldClientTab=clientTab;
 clientTab=function(c){
   if(state.tab==='offer-tools')return offerToolsPage(c);
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
   if(!keys.length&&!hasSleepDiary(c)&&!hasVideoReviews(c))return labelled;
   const active=state.tab==='offer-tools';
   const tab='<button data-tab="offer-tools" class="'+(active?'on':'')+'">'+
     esc(c.pole==='Mental'?'Préparation mentale':c.offer==='P3'?'Sommeil, macros & vidéos':hasSleepDiary(c)?'Sommeil & vidéos':'Analyses vidéo')+'</button>';
   return labelled.replace(/(<div class="card tabs no-print">[\s\S]*?)(<\/div>)/,(_,before,end)=>before+tab+end);
 };
 const oldOverview=overview;
 overview=function(c){
   const original=oldOverview(c);
   const keys=toolKeys(c);
   if(!keys.length&&!hasSleepDiary(c)&&!hasVideoReviews(c))return original;
   const chips=keys.map(key=>'<span class="status blue" style="margin:3px 4px 3px 0">'+esc(TOOL_SPEC[key].label)+'</span>').join('')+
     (hasSleepDiary(c)?'<span class="status blue" style="margin:3px 4px 3px 0">Agenda de sommeil (client)</span>':'')+
     (hasVideoReviews(c)?'<span class="status blue" style="margin:3px 4px 3px 0">Analyses vidéo WhatsApp</span>':'');
   const intro='<div class="card panel" style="margin-bottom:13px;border-left:4px solid #bc955a">'+
     '<div class="row between"><div><div class="muted tiny">Prestations incluses dans le dossier</div>'+
     '<h3 style="margin:5px 0">'+esc(c.pole)+' — '+esc(c.offer)+'</h3>'+
     '<div class="tiny muted">'+(c.initialCommitmentMonths?'Engagement initial : '+c.initialCommitmentMonths+' mois • ':'')+
     'Fin actuelle : '+esc(fmtDate(c.end))+'</div></div>'+
     '<button class="btn primary small quickTab" data-tab="offer-tools">Ouvrir les outils</button></div>'+
     '<div style="margin-top:10px">'+chips+'</div></div>';
   return intro+original;
 };
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
          '<div class="tiny" style="margin-top:9px"><strong>PDF :</strong> '+(x.details?.pdf_path?'Joint et sécurisé':'À ajouter')+
          ' • <strong>Accès client :</strong> '+(x.client_visible?'Publié':'Brouillon')+'</div>':'')+
       '<div class="row" style="margin-top:12px;gap:9px">'+
       (type==='macro_budget'&&x.details?.pdf_path?
         '<button class="btn ghost small offerMacroPdf" data-id="'+esc(x.id)+'">Ouvrir le PDF</button>':'')+
       (archived?'<button class="btn ghost small offerToolRestore" data-id="'+esc(x.id)+'">Restaurer</button>':
        '<button class="btn ghost small offerToolEdit" data-id="'+esc(x.id)+'">Modifier</button>'+
        '<button class="btn ghost small offerToolArchive" data-id="'+esc(x.id)+'">Archiver</button>')+
       '</div></details>';
   }).join('');
 }
 function offerToolsPage(c){
   const keys=toolKeys(c),all=(db.offerEntries||[]).filter(x=>x.client_id===c.id);
   const sleepHistory=(db.clientSleepDiary||[]).filter(x=>x.client_id===c.id).slice(0,50);
   const videoMarkup=videoMarkupFor(c);
   const sleepMarkup=hasSleepDiary(c)?'<div class="card panel" style="margin-bottom:13px">'+
     '<h3>Agenda de sommeil — rempli par le client</h3>'+
     '<div class="muted tiny">Le client renseigne ses nuits depuis son espace personnel. Optitrainer conserve le suivi de forme et de charge.</div>'+
     (sleepHistory.length?'<div class="list" style="margin-top:10px">'+
       sleepHistory.map(x=>'<details class="item"><summary style="cursor:pointer"><strong>'+esc(fmtDate(x.sleep_date))+'</strong> • '+
         esc(x.duration_hours)+' h • qualité '+esc(x.quality)+'/5</summary><div class="tiny" style="margin-top:6px">'+
         (x.bedtime?'Coucher : '+esc(String(x.bedtime).slice(0,5))+' • ':'')+
         (x.wakeup?'Réveil : '+esc(String(x.wakeup).slice(0,5))+' • ':'')+
         esc(x.notes||'Aucune observation')+'</div></details>').join('')+'</div>':
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
     videoMarkup+sleepMarkup+regular+
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
   if(kind==='textarea')return '<div class="field"><label>'+esc(label)+'</label><textarea class="textarea" id="'+id+'" maxlength="2500" rows="3">'+esc(v)+'</textarea></div>';
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
     '<div class="field" style="margin-top:12px"><label>Fichier PDF du budget macro (5 Mo maximum)</label><input id="offerMacroPdfFile" class="input" type="file" accept=".pdf,application/pdf"></div>'+
     '<label class="check"><input id="offerMacroPublish" type="checkbox" '+(row?.client_visible?'checked':'')+'> Rendre ce budget et son PDF accessibles au client</label>'+
     (details.pdf_path?'<div class="muted tiny">PDF déjà enregistré : tu peux le conserver ou le remplacer.</div>':'<div class="muted tiny">Sans PDF joint, le budget reste un brouillon privé.</div>'):''),

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
     if(publish&&!pdf&&!row?.details?.pdf_path)return alert('Joins d’abord un PDF pour publier le budget.');
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
       toast(macro?(publish?'Budget macro et PDF publiés au client.':'Budget enregistré en brouillon.'):'Outil enregistré dans Supabase.');
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
       if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||date>localDateISO())return alert('Date de réception invalide.');
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
   const c=currentClient();
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
window.AKP_OFFER_TOOLS_READY=true;
})();
