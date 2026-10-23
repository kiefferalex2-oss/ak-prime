/* AK PRIME — Onboarding initial isolé, questionnaires par pôle ET formule.
 * L'acceptation commerciale reste celle du tunnel de commande.
 * Les confirmations de lecture et le consentement sensible sont enregistrés
 * séparément à la soumission (voir migration questionnaire_legal_acknowledgments).
 */
(function(){
'use strict';
const KEY='AKP_INITIAL_QUESTIONNAIRE_READY';
const labels={
 performance_p1:'Performance · Essentiel P1',
 performance_p2:'Performance · Avancé P2',
 performance_p3:'Performance · Premium P3',
 forme_standard:'Forme & Santé · Standard',
 forme_renforce:'Forme & Santé · Renforcé',
 mental_particulier:'Préparation mentale · Particulier',
 mental_sportif:'Préparation mentale · Sportif'
};
const q=(key,label,type='textarea',required=false,group='Complément de formule',opts={})=>
 ({key,label,type,required,group,...opts});
const EXTRA={
 performance_p1:[
  q('p1_sessions','Combien de séances physiques hebdomadaires souhaites-tu planifier ?','select',true,'Organisation',{options:['1','2','3','4','5','6 ou plus']}),
  q('p1_video_priority','Quel mouvement aimerais-tu faire analyser en vidéo en priorité ?','textarea',false,'Organisation')],
 performance_p2:[
  q('p2_energy','Comment évoluent habituellement ton énergie et ta fatigue au fil de la semaine ?','textarea',true,'Récupération & bien-être'),
  q('p2_stress','Quelles situations sportives ou personnelles influencent le plus ta récupération ?','textarea',false,'Récupération & bien-être'),
  q('p2_warmup','As-tu des besoins particuliers concernant l’échauffement ?','textarea',false,'Organisation'),
  q('p2_cycle','Si tu souhaites en parler, ton cycle menstruel influence-t-il tes sensations ou ton entraînement ?','textarea',false,'Récupération & bien-être')],
 performance_p3:[
  q('p3_sleep_hours','Combien d’heures dors-tu habituellement par nuit ?','number',true,'Sommeil'),
  q('p3_sleep_quality','Comment évalues-tu généralement la qualité de ton sommeil ?','select',true,'Sommeil',{options:['Très mauvaise','Mauvaise','Moyenne','Bonne','Très bonne']}),
  q('p3_sleep_obstacles','Qu’est-ce qui perturbe ton sommeil ou ton réveil ?','textarea',false,'Sommeil'),
  q('p3_nutrition_goal','Quel objectif souhaites-tu privilégier sur le plan nutritionnel ?','select',true,'Nutrition',{options:['Maintenir mon poids','Favoriser la récupération','Prise de masse','Perte de masse grasse','Optimiser les apports autour des séances','À définir avec le coach']}),
  q('p3_nutrition_weight','Poids actuel en kg (facultatif, utile pour les besoins énergétiques)','number',false,'Nutrition'),
  q('p3_nutrition_habits','Décris une journée habituelle d’alimentation (horaires, contraintes, préférences).','textarea',false,'Nutrition'),
  q('p3_nutrition_constraints','Y a-t-il des préférences, intolérances ou restrictions alimentaires à prendre en compte ?','textarea',false,'Nutrition'),
  q('p3_recovery','Quelles stratégies de récupération utilises-tu déjà ?','textarea',false,'Récupération & bien-être')],
 forme_standard:[
  q('fs_standard_routine','À quels moments de la semaine peux-tu réellement placer tes entraînements ?','textarea',true,'Organisation'),
  q('fs_standard_motivation','Qu’est-ce qui pourrait rendre ta pratique plus régulière ?','textarea',false,'Objectifs')],
 forme_renforce:[
  q('fs_renforce_energy','Décris ton niveau d’énergie et ta récupération pendant une semaine typique.','textarea',true,'Récupération & bien-être'),
  q('fs_renforce_sleep_hours','Combien d’heures dors-tu habituellement par nuit ?','number',false,'Sommeil'),
  q('fs_renforce_sleep_issue','Rencontres-tu des difficultés de sommeil ou de récupération ?','textarea',false,'Sommeil'),
  q('fs_renforce_nutrition_goal','Quel est ton objectif en matière d’alimentation ?','select',true,'Nutrition',{options:['Maintien','Prise de masse','Perte de masse grasse','Mieux répartir mes apports','À définir ensemble']}),
  q('fs_renforce_weight','Poids actuel en kg (facultatif)','number',false,'Nutrition'),
  q('fs_renforce_food_habits','Quels sont tes horaires et habitudes alimentaires, tes préférences et contraintes ?','textarea',false,'Nutrition')],
 mental_particulier:[
  q('mental_private_context','Dans quelle situation du quotidien souhaiterais-tu progresser en priorité ?','textarea',true,'Préparation mentale'),
  q('mental_private_tools','As-tu déjà essayé des exercices de respiration, visualisation ou recentrage ?','textarea',false,'Préparation mentale'),
  q('mental_private_practice','Combien de temps pourrais-tu consacrer aux exercices entre deux rendez-vous ?','select',true,'Organisation',{options:['5 minutes','10 minutes','15 à 20 minutes','À définir']})],
 mental_sportif:[
  q('mental_sport_event','Quelle situation sportive te met le plus en difficulté (compétition, sélection, entraînement…) ?','textarea',true,'Préparation mentale'),
  q('mental_sport_prestart','Que fais-tu mentalement avant une rencontre ou une performance importante ?','textarea',false,'Préparation mentale'),
  q('mental_sport_routine','As-tu déjà une routine de performance ou de retour au calme ?','textarea',false,'Préparation mentale'),
  q('mental_sport_calendar','Quelles sont tes principales échéances sportives à venir ?','textarea',false,'Objectifs')]
};
// Question commune aux sept formules : la demande du client ne modifie pas
// automatiquement la date contractuelle, qui doit être confirmée par le coach.
const START_QUESTION=q('preferred_start_date',
 'À quelle date souhaites-tu commencer ton accompagnement ?',
 'date',true,'Démarrage');
QUESTION_LABELS[START_QUESTION.key]=START_QUESTION.label;
Object.assign(QUESTION_LABELS,Object.fromEntries(Object.values(EXTRA).flat().map(x=>[x.key,x.label])));
const LEGAL=[
 q('ak_cgv_ack','Je confirme avoir consulté les conditions générales de vente et compris les modalités de l’accompagnement. Sur un compte TEST, cette confirmation est une simulation et ne constitue pas une commande payante.','consent',true,'Confirmations'),
 q('ak_privacy_ack','J’ai pris connaissance de la politique de confidentialité et de l’utilisation de mes réponses pour préparer mon suivi.','consent',true,'Confirmations'),
 q('ak_health_ack','J’accepte explicitement le traitement des informations sensibles que je communique volontairement (douleurs, blessures, santé ou sommeil), uniquement pour individualiser et sécuriser mon accompagnement.','consent',true,'Confirmations')
]; 
Object.assign(QUESTION_LABELS,Object.fromEntries(LEGAL.map(x=>[x.key,x.label])));
function offerCode(c){
 if(c.current_pole==='Performance')return 'performance_'+String(c.current_offer||'').toLowerCase();
 if(c.current_pole==='Forme & Santé')return /renfor/i.test(c.current_offer||'')?'forme_renforce':'forme_standard';
 if(c.current_pole==='Mental')return /sportif/i.test(c.current_offer||'')?'mental_sportif':'mental_particulier';
 return '';
}
function baseGroup(qn){
 const k=qn.key;
 if(['full_name','birth_date','email','phone','legal_guardian'].includes(k))return 'Identité et contact';
 if(k==='consent')return 'Confirmations';
 if(/pain|injury|health|restriction|limitation|professional/.test(k))return 'Santé et précautions';
 if(/goal|expectation|deadline|motivation|impact|difficult_situations/.test(k))return 'Objectifs';
 if(/training|availability|equipment|facilit|current_week|activity|place|constraints/.test(k))return 'Pratique et organisation';
 if(/stress|focus|confidence|mental|emotion/.test(k))return 'Préparation mentale';
 return 'Profil et expérience';
}
const style=document.createElement('style');
style.textContent=[
 '.akIntroPage{min-height:100vh;background:#f3f6fa;padding:26px 18px 80px;color:#18314a}',
 '.akIntroLayout{max-width:880px;margin:auto}',
 '.akIntroTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:23px;flex-wrap:wrap}',
 '.akIntroBrand{font-weight:950;letter-spacing:.10em;color:#20354a;font-size:14px}',
 '.akIntroHero{border-radius:17px;background:#152e44;color:#fff;padding:27px 29px;margin-bottom:15px}',
 '.akIntroHero small{color:#dcb779;font-weight:900;letter-spacing:.1em;font-size:10px}',
 '.akIntroHero h1{color:#fff;font-size:clamp(23px,3.6vw,32px);line-height:1.18;margin:8px 0}',
 '.akIntroHero p{color:#c2cfdd;font-size:13px;line-height:1.6;margin:0}',
 '.akIntroSection{border:1px solid #dce5eb;background:#fff;border-radius:13px;margin:12px 0;overflow:hidden}',
 '.akIntroSection h2{font-size:15px;padding:16px 22px;margin:0;background:#f9fbfd;border-bottom:1px solid #e6edf1;color:#254359}',
 '.akIntroFields{padding:7px 22px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px 17px}',
 '.akIntroFields .qblock{margin:7px 0;min-width:0}',
 '.akIntroFields .qblock:has(textarea),.akIntroFields .qblock:has(.choices),.akIntroFields .qblock:has(.qconsent){grid-column:span 2}',
 '.akIntroLegal{padding:8px 22px 14px}',
 '.akIntroLegal .qblock{padding:8px 0;border-bottom:1px solid #e8eef1}',
 '.akIntroLegal .qblock:last-child{border-bottom:0}',
 '.akIntroLegalLinks{display:flex;gap:9px;flex-wrap:wrap;margin:10px 0 13px}',
 '.akIntroStartHelp{font-size:12px;line-height:1.65;color:#576f85;padding:13px 22px 0;margin:0}',
 '.akIntroVisio{padding:17px 22px}.akIntroVisio p{margin:5px 0 14px;font-size:12px;color:#60798e;line-height:1.6}',
 '.akIntroVisioTop{display:flex;justify-content:space-between;align-items:start;gap:10px;flex-wrap:wrap}',
 '.akIntroVisioTop h3{font-size:15px;margin:0;color:#18354e}.akIntroVisioTag{font-size:11px;font-weight:850;color:#3e7159;background:#edf7f1;padding:6px 10px;border-radius:50px}',
 '.akIntroVisioTimeGrid{display:flex;flex-wrap:wrap;gap:9px;margin-top:13px}',
 '.akIntroVisioTimeGrid button{border:1px solid #bfcedb;background:#fff;color:#1a4667;font-weight:800;padding:10px 14px;border-radius:9px;cursor:pointer}',
 '.akIntroVisioTimeGrid button:hover{border-color:#24608e;background:#f3f8fc}',
 '.akIntroVisioDay{width:100%;max-width:340px;margin-top:7px}',
 '.akIntroVisioBooked{border-radius:9px;background:#f1f8f4;padding:13px;color:#25523e;font-size:13px}',

 '.akIntroSection .qblock:has([data-key="preferred_start_date"]){grid-column:1 / -1;max-width:420px}',
 '@media(max-width:680px){.akIntroStartHelp{padding:12px 14px 0}}',
 '.akIntroLegalLinks button{background:#f7fafc;color:#29536c;border:1px solid #d8e5ec;border-radius:8px;font-size:11px;padding:8px 11px;font-weight:850;cursor:pointer}',
 '.akIntroActions{background:#fff;border-radius:12px;border:1px solid #dee7ed;padding:16px 22px;display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:10px}',
 '.akIntroInfo{font-size:12px;line-height:1.6;color:#73889c;margin-right:auto;max-width:410px}',
 '.akIntroDone{background:#fff;border:1px solid #dce6ec;padding:22px;border-radius:13px}',
 '@media(max-width:680px){.akIntroPage{padding:13px 10px 35px}.akIntroHero{padding:19px}.akIntroFields{grid-template-columns:1fr;padding:10px 14px}.akIntroFields .qblock{grid-column:1!important}.akIntroSection h2,.akIntroLegal{padding:14px}.akIntroActions{padding:14px}}'
].join('\n');
document.head.appendChild(style);
function initialVisioBooked(s){
 const records=(s.appointments||[]).filter(a=>a.appointment_type==='Visio initiale')
   .sort((a,b)=>String(b.created_at||b.starts_at).localeCompare(String(a.created_at||a.starts_at)));
 return records.find(a=>a.status!=='cancelled')||null;
}
function initialVisioMarkup(s){
 const booked=initialVisioBooked(s),rows=s.akInitialSlots||[],client=s.client||{};
 const isComplete=booked?.status==='completed'||!!s.akInitialVisioCompleted;
 let inner='';
 if(booked&&['scheduled','confirmed'].includes(booked.status)){
  inner='<div class="akIntroVisioBooked"><strong>✓ Ta première visio est réservée</strong>'+
    '<div style="margin-top:5px">'+esc(fmtDateTime(booked.starts_at))+' · '+esc(booked.duration_minutes||30)+' min · Hors quota</div>'+
    '<div style="margin-top:7px;color:#60798e;font-size:12px">Pour déplacer ou annuler cette visio, ouvre l’onglet Visios de ton espace.</div>'+
    '<button type="button" class="btn ghost small" id="akInitialOpenVisios" style="margin-top:12px">Gérer cette visio</button></div>';
 }else if(isComplete){
  inner='<div class="akIntroVisioBooked"><strong>✓ Visio initiale déjà réalisée</strong><div style="margin-top:5px">Elle ne décompte aucune visio de ta formule.</div></div>';
 }else if(booked){
  inner='<div class="alert">La visio initiale a déjà été utilisée ou annulée tardivement. Contacte ton coach pour organiser la suite, sans décompte sur le quota de ta formule.</div>';
 }else if(s.akInitialSlotError){
  inner='<div class="alert">Impossible de lire les disponibilités : '+esc(s.akInitialSlotError)+'</div>'+
    '<button type="button" class="btn ghost small" id="akInitialReload">Réessayer</button>';
 }else if(!rows.length){
  inner='<div class="muted tiny">Aucun créneau disponible sur les trois prochaines semaines. Tu peux réessayer ou demander au coach d’ouvrir des disponibilités.</div>'+
    '<button type="button" class="btn ghost small" id="akInitialReload" style="margin-top:12px">Actualiser les disponibilités</button>';
 }else{
  const byDate={};
  rows.forEach(slot=>{
   const key=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(slot.starts_at));
   (byDate[key]||(byDate[key]=[])).push(slot);
  });
  const dates=Object.keys(byDate).sort();
  if(!dates.includes(s.akInitialDay))s.akInitialDay=dates[0];
  inner='<label for="akInitialDay" class="qtitle">Choisis un jour</label>'+
   '<select class="select akIntroVisioDay" id="akInitialDay">'+dates.map(day=>
    '<option value="'+esc(day)+'" '+(day===s.akInitialDay?'selected':'')+'>'+
    esc(new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Paris'}).format(new Date(day+'T12:00:00Z')))+'</option>').join('')+'</select>'+
   '<div class="section-title" style="margin-top:14px">Horaires disponibles (heure de Paris)</div>'+
   '<div class="akIntroVisioTimeGrid" id="akInitialTimes">'+
   (byDate[s.akInitialDay]||[]).map(sl=>'<button type="button" class="akInitialBookSlot" data-start="'+esc(sl.starts_at)+'">'+esc(fmtTime(sl.starts_at))+'</button>').join('')+
   '</div><button class="btn ghost small" id="akInitialReload" type="button" style="margin-top:15px">Actualiser les créneaux</button>';
 }
 return '<section class="akIntroSection" id="akInitialVisioWrap"><div class="akIntroVisio">'+
   '<div class="akIntroVisioTop"><div><h3>Réserver ma première visio initiale</h3>'+
   '<p>Choisis directement un créneau de '+(s.bookingPolicy?.duration_minutes|| (client.current_pole==='Mental'?45:30))+
   ' minutes. Cette visio de démarrage est incluse en plus de tes visios habituelles.</p></div>'+
   '<span class="akIntroVisioTag">HORS QUOTA · INCLUSE</span></div>'+
   inner+'</div></section>';
}
async function reloadInitialVisioSlots(s,button){
 if(button)button.disabled=true;
 const from=localDateISO(),until=new Date(Date.parse(from+'T12:00:00Z')+20*86400000).toISOString().slice(0,10);
 const {data,error}=await supa.rpc('get_my_initial_visio_slots',{p_from:from,p_to:until});
 if(clientPortalState!==s)return;
 s.akInitialSlots=data||[];
 s.akInitialSlotError=error?.message||'';
 const wrap=document.getElementById('akInitialVisioWrap');
 if(wrap){wrap.outerHTML=initialVisioMarkup(s);bindInitialVisio(s)}
}
function bindInitialVisio(s){
 const wrapper=document.getElementById('akInitialVisioWrap');
 if(!wrapper)return;
 wrapper.querySelector('#akInitialDay')?.addEventListener('change',event=>{
  s.akInitialDay=event.target.value;
  const day=s.akInitialDay;
  const filtered=(s.akInitialSlots||[]).filter(sl=>
   new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(sl.starts_at))===day);
  const grid=wrapper.querySelector('#akInitialTimes');
  if(grid)grid.innerHTML=filtered.map(sl=>'<button type="button" class="akInitialBookSlot" data-start="'+esc(sl.starts_at)+'">'+esc(fmtTime(sl.starts_at))+'</button>').join('');
 });
 wrapper.querySelector('#akInitialReload')?.addEventListener('click',e=>reloadInitialVisioSlots(s,e.currentTarget));
 wrapper.querySelector('#akInitialOpenVisios')?.addEventListener('click',async e=>{
  const was=clientPortalView;
  await exitInitialQuestionnaire(e);
  if(clientPortalView==='home'&&was==='onboarding'){
   clientPortalView='visios';renderClientPortal();
  }
 });
 wrapper.addEventListener('click',async e=>{
  const button=e.target.closest('.akInitialBookSlot');if(!button||button.disabled)return;
  const start=button.dataset.start;
  if(!confirm('Confirmer ta visio initiale du '+fmtDateTime(start)+' ?\nCette visio ne sera pas décomptée de ton quota mensuel ou hebdomadaire.'))return;
  button.disabled=true;
  const {error}=await supa.rpc('book_my_initial_visio',{p_starts_at:start});
  if(error){button.disabled=false;alert(error.message||'Ce créneau n’est plus disponible.');return}
  const {data, error:readError}=await supa.from('appointments').select('*')
    .eq('client_id',s.client.id).order('starts_at',{ascending:true});
  if(!readError){
   s.appointments=data||[];
   const node=document.getElementById('akInitialVisioWrap');
   if(node){node.outerHTML=initialVisioMarkup(s);bindInitialVisio(s)}
  }
  toast('Visio initiale réservée : hors quota de la formule.');
  if(readError)alert('Réservation enregistrée. Recharge ton espace pour consulter les détails : '+readError.message);
 });
}
function groupQuestions(template,answers,s){
 const groups=new Map();
 template.questions.forEach(question=>{
  const group=question.group||baseGroup(question);
  if(!groups.has(group))groups.set(group,[]);
  groups.get(group).push(question);
 });
 const order=['Identité et contact','Démarrage','Profil et expérience','Pratique et organisation','Objectifs',
  'Préparation mentale','Santé et précautions','Récupération & bien-être','Sommeil','Nutrition','Organisation','Complément de formule','Confirmations'];
 return [...groups].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0])).map(([name,qs])=>
  '<section class="akIntroSection"><h2>'+esc(name)+'</h2>'+
  '<div class="'+(name==='Confirmations'?'akIntroLegal':'akIntroFields')+'">'+
  (name==='Démarrage'?'<p class="akIntroStartHelp">Choisis la date souhaitée pour commencer ton accompagnement. Ton coach vérifiera la possibilité de ce démarrage et te confirmera la date effective. Une date déjà fixée dans une commande ou un contrat ne change pas automatiquement.</p>':'')+
  (name==='Confirmations'?'<div class="akIntroLegalLinks">'+
    '<button type="button" data-ak-legal="cgv">Lire les CGV</button>'+
    '<button type="button" data-ak-legal="privacy">Lire la confidentialité</button>'+
    '<button type="button" data-ak-legal="withdrawal">Lire la rétractation</button></div>':'')+
  qs.map(qn=>renderQuestion(qn,answers?.[qn.key])).join('')+'</div></section>'+ (name==='Démarrage'?initialVisioMarkup(s):'')).join('');
}
// Sortie volontaire : sauvegarde uniquement les modifications non enregistrées.
// Aucune soumission, aucun consentement enregistré comme accepté à cette étape.
async function exitInitialQuestionnaire(event){
 const button=event?.currentTarget;
 const s=clientPortalState;
 if(!s?.akInitialReady){return;}
 if(s.response?.status!=='submitted'){
  const form=document.getElementById('clientQuestionnaire');
  if(form){
   const {answers}=collectQuestionnaire(s.template);
   const existing=s.response?.answers||{};
   const blankFor=q=>q.type==='multiselect'?[]:q.type==='consent'?false:'';
   const changed=s.template.questions.some(q=>{
    const a=answers[q.key],b=existing[q.key]??blankFor(q);
    return JSON.stringify(a)!==JSON.stringify(b);
   });
   if(changed){
    if(button)button.disabled=true;
    const row={
     client_id:s.client.id,questionnaire_type:s.template.template_key,
     questionnaire_version:s.template.version,answers,
     status:'draft',submitted_at:null
    };
    const {data,error}=await supa.from('questionnaire_responses')
      .upsert(row,{onConflict:'client_id,questionnaire_type,questionnaire_version'})
      .select().single();
    if(error){
     if(button)button.disabled=false;
     alert('Impossible de sauvegarder le brouillon : '+error.message+
       '\\nTes réponses sont toujours affichées. Réessaie avant de quitter.');
     return;
    }
    s.response=data;
    toast('Ton brouillon a été enregistré.');
   }
  }
 }
 clientPortalView='home';
 renderClientPortal();
}
function standalone(s){
 const c=s.client,t=s.template,received=s.response?.status==='submitted';
 // La date déjà renseignée lors de la commande est proposée si elle est à venir,
 // sans écraser une préférence enregistrée dans un brouillon existant.
 const stored=s.response?.answers||{};
 const dateFromOrder=/^\d{4}-\d{2}-\d{2}$/.test(c.start_date||'') &&
   c.start_date>=localDateISO()?c.start_date:'';
 const answers={...stored,preferred_start_date:stored.preferred_start_date??dateFromOrder};
 const html='<div class="akIntroPage"><div class="akIntroLayout">'+
  '<div class="akIntroTop"><div class="akIntroBrand">AK PRIME <span style="font-size:10px;color:#8798a8">/ QUESTIONNAIRE INITIAL</span></div>'+
  '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">'+
  '<button type="button" class="btn ghost small" id="akIntroExit">← Accéder à mon espace</button>'+
  (c.is_test?'<span style="font-size:10px;font-weight:850;color:#9f7944">COMPTE TEST · SANS PAIEMENT</span>'+
   '<select class="select" id="akIntroDemoOffer" aria-label="Offre à tester">'+
   Object.keys(labels).map(key=>'<option value="'+key+'" '+(key===offerCode(c)?'selected':'')+'>'+esc(labels[key])+'</option>').join('')+'</select>'+
   '<button type="button" class="btn ghost small" id="akIntroChangeOffer">Changer de formule test</button>':'')+
   '<button class="btn ghost small" id="akIntroLogout">Déconnexion</button></div></div>'+
  '<header class="akIntroHero"><small>PRÉPARATION PERSONNALISÉE</small>'+
  '<h1>'+esc(received?'Ton questionnaire initial':'Préparons ton accompagnement')+'</h1>'+
  '<p>'+esc(labels[offerCode(c)]||c.current_pole)+' · '+
  esc(received?'Réponses enregistrées dans ton dossier.':"Prends le temps de répondre : cet espace est réservé au questionnaire, sans autres outils de suivi.")+
  '</p></header>'+
  (received?initialVisioMarkup(s)+'<div class="akIntroDone"><strong>Questionnaire transmis au coach</strong>'+
   '<div class="muted tiny" style="margin:8px 0">Tes réponses restent accessibles ici, en lecture seule.</div>'+
   renderQuestionnaireAnswers(t,answers)+
   '<button class="btn primary" style="margin-top:18px" id="akIntroContinue">Retour à mon espace</button></div>':
  '<form id="clientQuestionnaire" class="qform">'+groupQuestions(t,answers,s)+
   '<div class="akIntroActions"><div class="akIntroInfo">Tu peux conserver un brouillon et revenir plus tard. L’envoi final communique tes réponses et ta date de démarrage souhaitée au coach.</div>'+
   '<button class="btn ghost" type="button" id="saveQuestionnaireDraft">Enregistrer mon brouillon</button>'+
   '<button class="btn ghost" type="button" id="akIntroLeave">Enregistrer et quitter</button>'+
   '<button class="btn primary" type="button" id="submitQuestionnaire">Envoyer au coach</button></div></form>')+
  '</div></div>';
 document.getElementById('root').innerHTML=html;
 document.getElementById('akIntroLogout').onclick=async()=>{await supa.auth.signOut();authUser=null;authProfile=null;clientPortalState=null;clientPortalView='home';showAuth();};
 document.getElementById('akIntroContinue')?.addEventListener('click',()=>{clientPortalView='home';renderClientPortal()});
 document.getElementById('akIntroExit')?.addEventListener('click',exitInitialQuestionnaire);
 document.getElementById('akIntroLeave')?.addEventListener('click',exitInitialQuestionnaire);
 bindInitialVisio(s);
 document.getElementById('akIntroChangeOffer')?.addEventListener('click',async()=>{
   const btn=document.getElementById('akIntroChangeOffer');
   const next=document.getElementById('akIntroDemoOffer')?.value;
   if(!next||next===offerCode(clientPortalState.client))return;
   btn.disabled=true;
   try{
    const {data,error}=await supa.rpc('change_my_test_offer',{p_offer_code:next});
    if(error||!data?.length)throw Error(error?.message||'Changement impossible');
    await enterClientPortal(authUser,authProfile);
    toast('Nouvelle formule test appliquée : '+labels[next]);
   }catch(e){btn.disabled=false;alert('Impossible de changer de formule : '+e.message);}
 });
 document.getElementById('saveQuestionnaireDraft')?.addEventListener('click',()=>saveClientQuestionnaire('draft'));
 document.getElementById('submitQuestionnaire')?.addEventListener('click',()=>saveClientQuestionnaire('submitted'));
 const startPicker=document.querySelector('[data-key="preferred_start_date"]');
 if(startPicker){
   const today=localDateISO();
   const maxDate=new Date(Date.parse(today+'T12:00:00Z')+120*86400000).toISOString().slice(0,10);
   startPicker.min=today;
   startPicker.max=maxDate;
   startPicker.setAttribute('aria-label','Date de début souhaitée pour mon accompagnement');
 }
 document.querySelectorAll('[data-ak-legal]').forEach(b=>b.onclick=()=>openPublicLegal(b.dataset.akLegal));
}
const oldEnter=enterClientPortal;
enterClientPortal=async function(...args){
 await oldEnter.apply(this,args);
 const s=clientPortalState;
 if(!s?.client||!s?.template||authProfile?.role!=='client')return;
 const code=offerCode(s.client);
 if(!EXTRA[code])return;
 const base=s.template;
 const virtual={...base,template_key:base.template_key+'__'+code,version:2,
  description:'Questionnaire personnalisé : '+(labels[code]||code),
  questions:[
   ...base.questions.map(x=>({...x,group:baseGroup(x)})),
   START_QUESTION,
   ...EXTRA[code],
   ...LEGAL
  ]};
 Object.assign(QUESTION_LABELS,Object.fromEntries(virtual.questions.map(q=>[q.key,q.label])));
 s.template=virtual;
 const {data,error}=await supa.from('questionnaire_responses').select('*')
  .eq('client_id',s.client.id)
  .eq('questionnaire_type',virtual.template_key)
  .eq('questionnaire_version',virtual.version).maybeSingle();
 if(error){console.error('Questionnaire initial :',error);s.akInitialError=error.message;return}
 s.response=data||null;
 s.akInitialReady=true;
 const from=localDateISO(),until=new Date(Date.parse(from+'T12:00:00Z')+20*86400000).toISOString().slice(0,10);
 const [initialSlots,initialOnboarding]=await Promise.all([
  supa.rpc('get_my_initial_visio_slots',{p_from:from,p_to:until}),
  supa.from('onboarding').select('visio_completed_at').eq('client_id',s.client.id).maybeSingle()
 ]);
 if(clientPortalState!==s)return;
 s.akInitialSlots=initialSlots.data||[];
 s.akInitialSlotError=initialSlots.error?.message||'';
 s.akInitialVisioCompleted=!!initialOnboarding.data?.visio_completed_at;
 // Une connexion ouvre toujours l'accueil : le questionnaire reste
 // accessible depuis l'onglet Questionnaire et le rappel « À faire ».
 // L'onboarding n'empêche pas de consulter les autres rubriques.
 clientPortalView='home';
 renderClientPortal();
};
const oldRender=renderClientPortal;
renderClientPortal=function(...args){
 const s=clientPortalState;
 if(s?.akInitialReady&&clientPortalView==='onboarding'){
  standalone(s);return;
 }
 return oldRender.apply(this,args);
};
const originalNav=clientNavMarkup;
clientNavMarkup=function(...args){
 const output=originalNav.apply(this,args);
 // Lien non intrusif vers le questionnaire, même après l'envoi.
 const action='<button class="clientNavBtn '+(clientPortalView==='onboarding'?'on':'')+
  '" data-view="onboarding"><span>▤</span>Questionnaire</button>';
 output.top=output.top.replace(/<\/div>$/,action+'</div>');
 output.mobile=output.mobile.replace(/<\/div>$/,action+'</div>');

 return output;
};
const originalSave=saveClientQuestionnaire;
saveClientQuestionnaire=async function(...args){
 const wasSubmitting=args[0]==='submitted';
 // Validation explicite de la plage des dates, au-delà du simple champ obligatoire.
 if(wasSubmitting&&clientPortalState?.akInitialReady){
   const el=document.querySelector('[data-key="preferred_start_date"]');
   const date=el?.value||'',today=localDateISO();
   const upper=new Date(Date.parse(today+'T12:00:00Z')+120*86400000).toISOString().slice(0,10);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<today||date>upper){
     alert('Choisis une date de début comprise entre aujourd’hui et les 120 prochains jours.');
     el?.focus();
     return;
   }
 }
 await originalSave.apply(this,args);
 if(wasSubmitting&&clientPortalState?.response?.status==='submitted'){
  clientPortalView='home';renderClientPortal();
 }
};
document.addEventListener('click',event=>{
 const button=event.target.closest?.('.clientGoInitial');
 if(!button||!clientPortalState?.akInitialReady)return;
 event.preventDefault();event.stopImmediatePropagation();
 clientPortalView='onboarding';
 renderClientPortal();
},true);
window[KEY]=true;
})();