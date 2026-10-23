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
 '.akIntroLegalLinks button{background:#f7fafc;color:#29536c;border:1px solid #d8e5ec;border-radius:8px;font-size:11px;padding:8px 11px;font-weight:850;cursor:pointer}',
 '.akIntroActions{background:#fff;border-radius:12px;border:1px solid #dee7ed;padding:16px 22px;display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:10px}',
 '.akIntroInfo{font-size:12px;line-height:1.6;color:#73889c;margin-right:auto;max-width:410px}',
 '.akIntroDone{background:#fff;border:1px solid #dce6ec;padding:22px;border-radius:13px}',
 '@media(max-width:680px){.akIntroPage{padding:13px 10px 35px}.akIntroHero{padding:19px}.akIntroFields{grid-template-columns:1fr;padding:10px 14px}.akIntroFields .qblock{grid-column:1!important}.akIntroSection h2,.akIntroLegal{padding:14px}.akIntroActions{padding:14px}}'
].join('\n');
document.head.appendChild(style);
function groupQuestions(template,answers){
 const groups=new Map();
 template.questions.forEach(question=>{
  const group=question.group||baseGroup(question);
  if(!groups.has(group))groups.set(group,[]);
  groups.get(group).push(question);
 });
 const order=['Identité et contact','Profil et expérience','Pratique et organisation','Objectifs',
  'Préparation mentale','Santé et précautions','Récupération & bien-être','Sommeil','Nutrition','Organisation','Complément de formule','Confirmations'];
 return [...groups].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0])).map(([name,qs])=>
  '<section class="akIntroSection"><h2>'+esc(name)+'</h2>'+
  '<div class="'+(name==='Confirmations'?'akIntroLegal':'akIntroFields')+'">'+
  (name==='Confirmations'?'<div class="akIntroLegalLinks">'+
    '<button type="button" data-ak-legal="cgv">Lire les CGV</button>'+
    '<button type="button" data-ak-legal="privacy">Lire la confidentialité</button>'+
    '<button type="button" data-ak-legal="withdrawal">Lire la rétractation</button></div>':'')+
  qs.map(qn=>renderQuestion(qn,answers?.[qn.key])).join('')+'</div></section>').join('');
}
function standalone(s){
 const c=s.client,t=s.template,received=s.response?.status==='submitted',answers=s.response?.answers||{};
 const html='<div class="akIntroPage"><div class="akIntroLayout">'+
  '<div class="akIntroTop"><div class="akIntroBrand">AK PRIME <span style="font-size:10px;color:#8798a8">/ QUESTIONNAIRE INITIAL</span></div>'+
  '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">'+
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
  (received?'<div class="akIntroDone"><strong>Questionnaire transmis au coach</strong>'+
   '<div class="muted tiny" style="margin:8px 0">Tes réponses restent accessibles ici, en lecture seule.</div>'+
   renderQuestionnaireAnswers(t,answers)+
   '<button class="btn primary" style="margin-top:18px" id="akIntroContinue">Retour à mon espace</button></div>':
  '<form id="clientQuestionnaire" class="qform">'+groupQuestions(t,answers)+
   '<div class="akIntroActions"><div class="akIntroInfo">Tu peux conserver un brouillon et revenir plus tard. L’envoi final communique tes réponses au coach. La date de début a été choisie lors de la commande, pas dans ce questionnaire.</div>'+
   '<button class="btn ghost" type="button" id="saveQuestionnaireDraft">Enregistrer mon brouillon</button>'+
   '<button class="btn primary" type="button" id="submitQuestionnaire">Envoyer au coach</button></div></form>')+
  '</div></div>';
 document.getElementById('root').innerHTML=html;
 document.getElementById('akIntroLogout').onclick=async()=>{await supa.auth.signOut();authUser=null;authProfile=null;clientPortalState=null;clientPortalView='home';showAuth();};
 document.getElementById('akIntroContinue')?.addEventListener('click',()=>{clientPortalView='home';renderClientPortal()});
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
 if(!data||data.status!=='submitted'){
  if(s.client.is_test||s.client.status==='onboarding')clientPortalView='onboarding';
 }
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