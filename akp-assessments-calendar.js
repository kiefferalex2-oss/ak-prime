/* AK PRIME — Évaluations initiales / retests / bilans de cycles, calendrier et rappels.
 * La programmation et les charges restent dans Optitrainer.
 * Les résultats historiques non typés ne sont jamais reclassés automatiquement.
 */
(function(){
 'use strict';
 const LABEL={initial:'Évaluation initiale',retest:'Retest',cycle_end:'Fin de cycle',unclassified:'Ancien résultat non classé'};
 const COLOR={initial:'blue',retest:'amber',cycle_end:'green',unclassified:'amber'};
 const MAX_TESTS=5000;
 let horizon=60;
 function localISO(v){return String(v||'').slice(0,10);}
 function addDays(date,n){
   const d=new Date(localISO(date)+'T12:00:00Z');
   if(!Number.isFinite(d.getTime()))return '';
   d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);
 }
 function diffDays(then,now=localDateISO()){
   const a=Date.parse(localISO(then)+'T12:00:00Z'),b=Date.parse(localISO(now)+'T12:00:00Z');
   return Number.isFinite(a)&&Number.isFinite(b)?Math.round((a-b)/86400000):9999;
 }
 function activeClients(includeTests=false){
   return (db.clients||[]).filter(c=>!c.archivedAt&&(!c.isTest||includeTests)&&
      ['Actif','Onboarding'].includes(c.status)&&(!c.end||c.end>=localDateISO()));
 }
 function assessmentItems(clientId){
   return (db.assessmentPlans||[]).filter(p=>p.client_id===clientId)
     .sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));
 }
 function readyForCoach(c){
   return !!c&&!c.archivedAt&&!c.isTest&&!['Inactif','Pause','Prospect'].includes(c.status);
 }
 function phaseChip(phase){
   return '<span class="status '+(COLOR[phase]||'blue')+'">'+esc(LABEL[phase]||'Évaluation')+'</span>';
 }
 const originalLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
   const result=await originalLoad.apply(this,args);
   if(!authUser?.id||!['owner','coach'].includes(authProfile?.role))return result;
   if(authProfile.role==='owner'){
     const generated=await supa.rpc('owner_sync_assessment_calendar');
     if(generated.error)throw Error('Planification automatique des évaluations : '+generated.error.message);
   }
   const [plans,results]=await Promise.all([
     supa.from('client_assessment_plans').select('*').order('due_date',{ascending:true}).limit(2000),
     supa.from('tests').select('id,client_id,assessment_phase,assessment_plan_id').limit(MAX_TESTS)
   ]);
   if(plans.error||results.error)throw Error('Chargement des échéances : '+(plans.error||results.error).message);
   db.assessmentPlans=plans.data||[];
   const map=new Map((results.data||[]).map(t=>[t.id,t]));
   (db.clients||[]).forEach(c=>{
     (c.tests||[]).forEach(t=>{
       const extra=map.get(t.id);
       t.assessmentPhase=extra?.assessment_phase||'unclassified';
       t.assessmentPlanId=extra?.assessment_plan_id||null;
     });
   });
   return result;
 };
 function scheduledNotifications(){
   const reads=notificationReadSet(db.notificationReads);
   const byId=new Map(activeClients().map(c=>[c.id,c]));
   return (db.assessmentPlans||[]).filter(p=>p.status==='planned'&&byId.has(p.client_id)).map(p=>{
     const days=diffDays(p.due_date);
     if(days>7)return null;
     const c=byId.get(p.client_id),overdue=days<0;
     const alertType=overdue?'retard':days<=2?'urgent':'préparation';
     const key='coach:assessment:'+p.id+':'+alertType;
     return {
       key,title:(overdue?'Évaluation en retard — ':days<=2?'Évaluation imminente — ':'Préparer l’évaluation — ')+c.name,
       detail:(LABEL[p.phase]||'Évaluation')+' · '+p.title+' · '+fmtDate(p.due_date)+
         (days<0?' ('+Math.abs(days)+' j de retard)':days===0?' (aujourd’hui)':' (dans '+days+' j)'),
       target:'client',clientId:c.id,tab:'passport',priority:overdue?6:5,
       read:reads.has(key),eventDate:p.due_date
     };
   }).filter(Boolean);
 }
 const oldNotifications=coachNotifications;
 coachNotifications=function(){
   return [...scheduledNotifications(),...oldNotifications()].sort((a,b)=>
     Number(!!a.read)-Number(!!b.read)||(b.priority||0)-(a.priority||0));
 };
 function planRows(c,phase,limit=20){
   const rows=assessmentItems(c.id).filter(p=>p.phase===phase).sort((a,b)=>
     Number(a.status!=='planned')-Number(b.status!=='planned')||
     String(a.due_date).localeCompare(String(b.due_date)));
   return rows.slice(0,limit).map(p=>{
     const outcome=p.status==='completed'?'Réalisée':p.status==='cancelled'?'Annulée':
       diffDays(p.due_date)<0?'En retard':diffDays(p.due_date)<=7?'À préparer':'Planifiée';
     const tone=p.status==='completed'?'green':p.status==='cancelled'?'red':diffDays(p.due_date)<=7?'amber':'blue';
     const linked=(c.tests||[]).filter(t=>t.assessmentPlanId===p.id);
     const action=p.status==='planned'?
       '<div class="row" style="gap:6px;flex-wrap:wrap">'+
       (p.phase!=='cycle_end'?'<button class="btn ghost small akAssessmentResult" data-id="'+esc(p.id)+'">+ Résultat</button>':'')+
       '<button class="btn ghost small akAssessmentDone" data-id="'+esc(p.id)+'">Clôturer</button>'+
       '<button class="link akAssessmentCancel" data-id="'+esc(p.id)+'">Annuler</button></div>':'';
     return '<div class="item" style="padding:12px"><div class="row between" style="gap:12px;flex-wrap:wrap">'+
       '<div>'+phaseChip(p.phase)+' <strong>'+esc(p.title)+'</strong>'+
       '<div class="tiny muted" style="margin-top:4px">'+esc(fmtDate(p.due_date))+
       ' • '+linked.length+' résultat(s) rattaché(s)'+(p.test_names?.length?' • À prévoir : '+esc(p.test_names.join(', ')):'')+
       '</div></div><span class="status '+tone+'">'+outcome+'</span></div>'+
       (p.notes?'<div class="muted tiny">'+esc(p.notes)+'</div>':'')+
       (action?'<div style="margin-top:10px">'+action+'</div>':'')+'</div>';
   }).join('');
 }
 function plannedPanel(c){
   const count=assessmentItems(c.id).filter(p=>p.status==='planned').length;
   const mentally=c.pole==='Mental';
   const sections=(mentally?['cycle_end']:['initial','retest','cycle_end']).map(phase=>{
     const rows=assessmentItems(c.id).filter(p=>p.phase===phase);
     const pending=rows.filter(p=>p.status==='planned').length;
     return '<details class="card panel" style="margin:9px 0">'+
       '<summary style="cursor:pointer"><strong>'+esc(LABEL[phase])+'</strong> '+
       '<span class="status '+(pending?'amber':'blue')+'">'+pending+' à traiter</span> '+
       '<span class="muted tiny">('+rows.length+' au total)</span></summary>'+
       '<div class="list" style="margin-top:9px">'+
       (planRows(c,phase,12)||'<p class="muted tiny">Aucune échéance pour cette étape.</p>')+
       '</div></details>';
   }).join('');
   return '<div class="card panel" id="akAssessments" style="margin:14px 0">'+
     '<div class="row between" style="gap:12px;flex-wrap:wrap"><div><h3>Évaluations & échéances</h3>'+
     '<p class="muted tiny">'+(mentally?'Préparation mentale : bilans de fin de cycle, sans batterie physique automatique.':
       c.pole==='Performance'?'Retests à six semaines + bilans de fin de cycle, selon les dates du dossier.':
       'Évaluations selon les objectifs et bilans de fin de cycle ; pas de retest sportif automatique.')+
     ' Chaque évaluation peut être renseignée puis clôturée indépendamment de l’onboarding.</p></div>'+
     '<span class="status blue">'+count+' à venir / à traiter</span></div>'+
     '<div class="row" style="gap:8px;flex-wrap:wrap;margin:9px 0 12px">'+
     (authProfile?.role==='owner'&&!c.archivedAt?
       '<button class="btn primary small akNewAssessment">+ Planifier une évaluation</button>'+
       '<button class="btn ghost small akRefreshAssessments">Mettre à jour les échéances</button>':'')+
     '<button class="btn ghost small akAssessmentToCalendar">Voir le calendrier</button></div>'+
     '<div>'+sections+'</div></div>';
 }
 function compactOnboarding(c){
   let html=oldOnboarding(c);
   const finished=c.onboarding?.currentStep==='active';
   if(finished&&c.status!=='Actif')
     html=html.replaceAll('Accompagnement actif','Onboarding terminé');
   const wrapper=document.createElement('div');
   wrapper.innerHTML=html;
   const header=[...wrapper.querySelectorAll('.section-title')]
     .find(x=>x.textContent.trim()==='Tests requis avant programmation');
   if(header){
     // L'ancienne saisie "tests requis" reste disponible pendant l'onboarding,
     // mais ne monopolise plus l'écran ni ne confond initial, retest et fin de cycle.
     const panel=document.createElement('details');
     panel.style.cssText='margin:10px 0;padding:10px;border:1px solid #d7e0eb;border-radius:10px';
     const summary=document.createElement('summary');
     summary.style.cssText='cursor:pointer;font-weight:600';
     summary.textContent='Gérer les tests requis du démarrage (ancienne sélection)';
     header.parentNode.insertBefore(panel,header);
     panel.appendChild(summary);panel.appendChild(header);
     let next=panel.nextElementSibling;
     while(next&&!next.classList.contains('alert')){
       const after=next.nextElementSibling;panel.appendChild(next);next=after;
     }
     if(finished)panel.remove();
   }
   const green=[...wrapper.querySelectorAll('.alert.green')]
     .find(x=>x.textContent.includes('Onboarding terminé'));
   if(green)green.innerHTML='<strong>Onboarding terminé.</strong> Statut actuel du dossier : <strong>'+
      esc(c.status)+'</strong>. Les prochaines évaluations se préparent dans le Passeport et le calendrier.';
   const workflow=wrapper.firstElementChild;
   if(workflow&&finished){
     const historical=document.createElement('details');
     historical.className='card panel';
     historical.style.marginBottom='12px';
     historical.innerHTML='<summary style="cursor:pointer;font-weight:700">Parcours de démarrage terminé — afficher l’historique</summary>';
     workflow.replaceWith(historical);
     historical.appendChild(workflow);
     wrapper.insertAdjacentHTML('afterbegin',plannedPanel(c));
   }else if(workflow){
     workflow.insertAdjacentHTML('afterend',plannedPanel(c));
   }else return html+plannedPanel(c);
   return wrapper.innerHTML;
 }
 const oldOnboarding=onboarding;
 onboarding=compactOnboarding;
 const oldTestManager=passportCoachTestManager;
 passportCoachTestManager=function(c){
   if(c.pole==='Mental')
     return '<div class="card panel no-print"><h3>Bilans de préparation mentale</h3>'+
       '<p class="muted tiny">Les évaluations mentales sont spécifiques à l’accompagnement. '+
       'Aucune batterie CMJ, sprint ou 6RM n’est imposée ici.</p>'+
       '<button class="btn ghost small akNewAssessment">Planifier un bilan de fin de cycle</button></div>'+
       plannedPanel(c);
   const results=(c.tests||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
   const byPhase=['initial','retest','cycle_end','unclassified'].map(phase=>{
     const arr=results.filter(x=>(x.assessmentPhase||'unclassified')===phase);
     return '<details class="card panel" style="margin:9px 0">'+
       '<summary style="cursor:pointer"><strong>'+esc(LABEL[phase])+'</strong> <span class="status blue">'+arr.length+'</span></summary>'+
       '<div class="muted tiny" style="margin:8px 0">'+(phase==='unclassified'?
        'Résultats enregistrés avant la nouvelle classification : à classer manuellement si tu connais leur contexte.':
        'Résultats conservés dans le Passeport et comparables dans le temps.')+'</div>'+
       (arr.length?'<div class="list">'+arr.map(t=>
         '<div class="item row between" style="gap:8px;flex-wrap:wrap"><div><strong>'+esc(t.name)+'</strong>'+
         '<div class="tiny muted">'+fmtDate(t.date)+' • '+esc(t.value)+' '+esc(t.unit||'')+
          (t.context?' • '+esc(t.context):'')+'</div></div>'+
         '<div class="row" style="gap:6px">'+(phase==='unclassified'?
            '<button class="btn ghost small akClassifyResult" data-id="'+esc(t.id)+'">Classer</button>':'')+
          '<button class="link deleteTest" data-id="'+esc(t.id)+'">Supprimer</button></div></div>'
       ).join('')+'</div>':'<div class="muted tiny">Aucun résultat dans cette catégorie.</div>')+
       '</details>';
   }).join('');
   const oldMarkup=document.createElement('div');
   oldMarkup.innerHTML=oldTestManager(c);
   const eventControls=oldMarkup.querySelector('.passport-event-manager')?.outerHTML||'';
   return '<div class="passport-manager-grid no-print"><div>'+
     '<div class="card panel"><div class="row between" style="gap:10px"><div><h3>Tests & retests</h3>'+
     '<p class="muted tiny">Choisis clairement initial, retest ou fin de cycle à chaque nouvelle saisie. Les anciens résultats restent visibles.</p></div>'+
     '<button class="btn primary small" id="addTest">+ Saisir un résultat</button></div></div>'+
     byPhase+'</div>'+(eventControls?'<div>'+eventControls+'</div>':'')+
     '</div>'+plannedPanel(c);
 };
 function plansByClient(c){
   return assessmentItems(c.id).filter(p=>p.status==='planned');
 }
 function testModal(c,{prefill='',planId='',date=''}={}){
   const plan=assessmentItems(c.id).find(p=>p.id===planId);
   const options=plansByClient(c);
   const phase=plan?.phase||(c.onboarding?.currentStep==='active'?'retest':'initial');
   modal('Enregistrer un résultat — '+esc(c.name),
    '<div class="alert blue"><strong>À quelle évaluation appartient ce résultat ?</strong>'+
    '<p class="tiny">Cette information sera visible dans le Passeport et évitera de mélanger les tests initiaux et les retests.</p></div>'+
    '<div class="grid2">'+
    '<div class="field"><label>Type d’évaluation</label><select class="select" id="akTestPhase">'+
    [['initial','Évaluation initiale'],['retest','Retest'],['cycle_end','Bilan fin de cycle']].map(([k,v])=>
      '<option value="'+k+'" '+(phase===k?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'+
    '<div class="field"><label>Échéance planifiée (si applicable)</label><select class="select" id="akTestPlan">'+
      '<option value="">Résultat hors planning</option>'+
      options.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===planId?'selected':'')+'>'+
         esc(LABEL[p.phase])+' · '+esc(fmtDate(p.due_date))+' — '+esc(p.title)+'</option>').join('')+'</select></div>'+
    '<div class="field"><label>Test</label><select id="tLibrary" class="select">'+testLibraryOptions(prefill)+'</select></div>'+
    '<div class="field"><label>Date de réalisation</label><input id="tDate" type="date" class="input" value="'+esc(date||localDateISO())+'"></div>'+
    '<div class="field" id="tCustomWrap" style="display:none"><label>Nom du test personnalisé</label>'+
      '<input id="tCustomName" class="input" placeholder="Ex. Force adducteurs" value="'+esc(prefill&&!testLibraryItem(prefill)?prefill:'')+'"></div>'+
    '<div class="field"><label>Résultat</label><input id="tValue" class="input" type="number" step="any" required placeholder="Ex. 42,5"></div>'+
    '<div class="field"><label>Unité</label><input id="tUnit" class="input" value="'+esc(testLibraryItem(prefill)?.unit||'')+'"></div></div>'+
    '<div class="field"><label>Contexte / protocole (facultatif)</label><input id="tContext" class="input" maxlength="300" placeholder="Ex. CMJ, mêmes conditions que la mesure initiale"></div>'+
    '<div class="field"><label>Interprétation du coach (facultatif)</label><textarea id="tNote" class="textarea" rows="3"></textarea></div>'+
    '<div class="alert blue tiny" id="tHint">'+esc(testLibraryItem(prefill)?.hint||'Choisis un test : son unité sera proposée automatiquement.')+'</div>',
    '<button class="btn ghost" id="cancelM">Annuler</button><button class="btn primary" id="saveM">Enregistrer au Passeport</button>');
   const get=id=>document.getElementById(id);
   get('cancelM').onclick=closeModal;
   function syncPlan(){
     const chosen=options.find(p=>p.id===get('akTestPlan').value);
     if(chosen)get('akTestPhase').value=chosen.phase;
   }
   get('akTestPlan').onchange=syncPlan;
   get('akTestPhase').onchange=()=>{
     if(get('akTestPlan').value&&options.find(p=>p.id===get('akTestPlan').value)?.phase!==get('akTestPhase').value){
       get('akTestPlan').value='';
     }
   };
   get('tLibrary').onchange=()=>{
     const chosen=get('tLibrary').value,item=testLibraryItem(chosen),custom=chosen==='__custom__';
     get('tCustomWrap').style.display=custom?'':'none';
     get('tUnit').value=item?.unit||'';
     get('tHint').textContent=item?.hint||'Test personnalisé : renseigne un nom et une unité.';
   };
   if(prefill&&!testLibraryItem(prefill))get('tLibrary').value='__custom__';
   get('tLibrary').onchange();
   get('saveM').onclick=async()=>{
     const raw=get('tLibrary').value;
     const name=raw==='__custom__'?get('tCustomName').value.trim():raw;
     const value=get('tValue').value;
     const day=get('tDate').value,selectedPlan=options.find(p=>p.id===get('akTestPlan').value);
     if(!name||value===''||!day)return alert('Le test, sa valeur et la date sont obligatoires.');
     if(selectedPlan&&selectedPlan.phase!==get('akTestPhase').value)
       return alert('L’évaluation sélectionnée ne correspond pas au type de test.');
     const button=get('saveM');button.disabled=true;
     try{
       const {error}=await supa.from('tests').insert({
        client_id:c.id,test_name:name,performed_at:day+'T12:00:00Z',
        result_value:Number(value),unit:get('tUnit').value.trim()||null,
        context:get('tContext').value.trim()||null,
        coach_interpretation:get('tNote').value.trim()||null,
        assessment_phase:get('akTestPhase').value,
        assessment_plan_id:selectedPlan?.id||null,
        include_in_passport:true,created_by:authUser.id
       });
       if(error)throw Error(error.message);
       closeModal();await loadSupabaseData();state.tab='passport';render();
       toast('Résultat classé et enregistré dans le Passeport.');
     }catch(e){alert('Résultat non enregistré : '+e.message);button.disabled=false;}
   };
 }
 openAddTest=function(prefillName=''){
   const c=currentClient();if(!c)return;
   return testModal(c,{prefill:prefillName});
 };
 function createPlan(c){
   const isMental=c.pole==='Mental';
   const phases=isMental?[['cycle_end','Bilan de fin de cycle']]:
     [['initial','Évaluation initiale'],['retest','Retest'],['cycle_end','Fin de cycle']];
   modal('Planifier une évaluation — '+esc(c.name),
     '<div class="grid2"><div class="field"><label>Type d’évaluation</label><select id="akPlanPhase" class="select">'+
     phases.map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></div>'+
     '<div class="field"><label>Échéance</label><input type="date" id="akPlanDate" class="input" value="'+localDateISO()+'"></div></div>'+
     '<div class="field"><label>Objectif de l’évaluation</label><input id="akPlanTitle" class="input" maxlength="180" placeholder="Ex. Bilan du cycle de force"></div>'+
     '<div class="field"><label>Tests envisagés (facultatif, séparés par une virgule)</label>'+
     '<input id="akPlanTests" class="input" placeholder="CMJ, sprint 10 m, 6RM"></div>'+
     '<div class="muted tiny">Le planning est individualisé. Rien n’est ajouté dans Optitrainer ni dans le Passeport avant la saisie de vrais résultats.</div>',
     '<button class="btn ghost" id="cancelM">Annuler</button><button class="btn primary" id="saveM">Planifier</button>');
   document.getElementById('cancelM').onclick=closeModal;
   document.getElementById('saveM').onclick=async()=>{
     const get=id=>document.getElementById(id).value;
     const phase=get('akPlanPhase'),day=get('akPlanDate');
     const title=get('akPlanTitle').trim();
     const names=[...new Set(get('akPlanTests').split(',').map(x=>x.trim()).filter(Boolean))].slice(0,15);
     if(title.length<3||!day)return alert('Choisis un type, une date et un intitulé.');
     const button=document.getElementById('saveM');button.disabled=true;
     const {error}=await supa.rpc('owner_add_assessment',{
       p_client_id:c.id,p_phase:phase,p_date:day,p_title:title,
       p_tests:names,p_cycle_id:null
     });
     if(error){button.disabled=false;return alert('Planification refusée : '+error.message)}
     closeModal();await loadSupabaseData();render();toast('Évaluation ajoutée au calendrier.');
   };
 }
 async function setPlanStatus(c,p,status){
   const reason=prompt(status==='completed'?'Compte rendu de clôture (minimum 10 caractères) :':
     'Motif d’annulation (minimum 10 caractères) :');
   if(!reason||reason.trim().length<10)return;
   const {error}=await supa.rpc('owner_update_assessment',{
     p_plan_id:p.id,p_status:status,p_reason:reason.trim()
   });
   if(error)return alert('Modification refusée : '+error.message);
   await loadSupabaseData();render();toast(status==='completed'?'Évaluation clôturée.':'Échéance annulée.');
 }
 async function classifyOld(c,id){
   const t=(c.tests||[]).find(x=>x.id===id);
   if(!t)return;
   modal('Classer un ancien résultat — '+esc(t.name),
     '<p class="muted tiny">Choisis son étape. La valeur et la date ne seront pas modifiées.</p>'+
     '<div class="field"><label>Étape de l’évaluation</label><select class="select" id="akLegacyPhase">'+
     [['initial','Évaluation initiale'],['retest','Retest'],['cycle_end','Bilan fin de cycle']].map(([phase,label])=>
       '<option value="'+phase+'">'+label+'</option>').join('')+'</select></div>',
     '<button class="btn ghost" id="akLegacyCancel">Annuler</button>'+
     '<button class="btn primary" id="akLegacySave">Classer le résultat</button>');
   document.getElementById('akLegacyCancel').onclick=closeModal;
   document.getElementById('akLegacySave').onclick=async()=>{
     const phase=document.getElementById('akLegacyPhase').value;
     const button=document.getElementById('akLegacySave');button.disabled=true;
     const {error}=await supa.from('tests').update({assessment_phase:phase}).eq('id',id).eq('client_id',c.id);
     if(error){button.disabled=false;return alert('Classement impossible : '+error.message);}
     closeModal();await loadSupabaseData();render();toast('Ancien test classé comme '+LABEL[phase]+'.');
   };
 }
 function calendarEntries(){
   const active=activeClients(true),clients=new Map(active.map(c=>[c.id,c]));
   const due=[];
   (db.assessmentPlans||[]).filter(p=>p.status==='planned'&&clients.has(p.client_id))
     .forEach(p=>due.push({date:localISO(p.due_date),label:p.title,client:clients.get(p.client_id),
       group:'Évaluation',key:'assessment-'+p.id,phase:p.phase,action:'passport'}));
   for(const c of active){
     if(c.end)due.push({date:localISO(c.end),label:'Fin d’engagement / renouvellement',client:c,group:'Contrat',key:'contract-'+c.id,action:'admin'});
     for(const event of c.events||[]){
       if(event.date)due.push({date:localISO(event.date),label:event.title||'Jalon',client:c,
         group:'Jalon',key:'event-'+event.id,action:'passport'});
     }
   }
   (db.appointments||[]).filter(a=>['scheduled','confirmed'].includes(a.status)&&clients.has(a.client_id))
     .forEach(a=>due.push({date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(a.starts_at)),
      label:'Visio '+fmtDateTime(a.starts_at),
      client:clients.get(a.client_id),group:'Visio',key:'visio-'+a.id,action:'onboarding'}));
   return due.sort((a,b)=>a.date.localeCompare(b.date));
 }
 function calendarPanel(){
   const today=localDateISO(),until=addDays(today,horizon),events=calendarEntries();
   const overdue=events.filter(x=>x.date&&x.date<today&&x.group==='Évaluation');
   const future=events.filter(x=>x.date>=today&&x.date<=until);
   const start=new Date(today+'T12:00:00Z'),offset=(start.getUTCDay()+6)%7;
   start.setUTCDate(start.getUTCDate()-offset);
   const weeks=Math.ceil((horizon+offset+1)/7);
   const matrix=Array.from({length:weeks},(_,wi)=>{
     const cells=Array.from({length:7},(_,di)=>{
       const day=addDays(start.toISOString().slice(0,10),wi*7+di);
       const dayEvents=future.filter(x=>x.date===day);
       const notIn=day<today||day>until;
       return '<div class="item" style="padding:8px;min-height:84px;'+(notIn?'opacity:.45;':'')+
         (day===today?'border:2px solid #335d84;':'')+'"><strong class="tiny">'+esc(fmtDate(day))+'</strong>'+
         dayEvents.slice(0,3).map(x=>
          '<div class="tiny" style="margin-top:4px"><button class="link akOpenAssessmentClient" data-client="'+esc(x.client.id)+
          '" data-tab="'+esc(x.action)+'" title="'+esc(x.label)+'">'+
          esc(x.group)+': '+esc(x.client.name)+'</button></div>').join('')+
         (dayEvents.length>3?'<div class="muted tiny">+'+(dayEvents.length-3)+' autres</div>':'')+'</div>';
     }).join('');
     return '<div style="display:grid;grid-template-columns:repeat(7,minmax(135px,1fr));gap:6px;margin-bottom:6px">'+cells+'</div>';
   }).join('');
   const renderDeadlineRows=list=>list.slice(0,85).map(x=>{
     const late=x.date<today;
     return '<div class="item row between" style="gap:10px;flex-wrap:wrap"><div><span class="status '+
       (late?'amber':'blue')+'">'+esc(fmtDate(x.date))+'</span> <strong>'+esc(x.group)+
       '</strong> • '+esc(x.client.name)+
       '<div class="tiny muted">'+esc(x.label)+(late?' • Échéance passée':'')+'</div></div>'+
       '<button class="btn ghost small akOpenAssessmentClient" data-client="'+esc(x.client.id)+
       '" data-tab="'+esc(x.action)+'">Dossier</button></div>';
   }).join('');
   const overdueRows=renderDeadlineRows(overdue),futureRows=renderDeadlineRows(future);
   return '<div class="card panel" style="margin-bottom:14px">'+
     '<div class="row between" style="gap:12px;flex-wrap:wrap"><div>'+
     '<h3>Calendrier des échéances clients</h3>'+
     '<p class="muted tiny">Évaluations, retests, fins de cycle, visios, jalons et renouvellements. '+
     'Les séances d’entraînement et leur charge restent dans Optitrainer.</p></div>'+
     '<div class="row" style="gap:7px"><button class="btn '+(horizon===21?'primary':'ghost')+
       ' small akCalendarHorizon" data-days="21">21 jours</button><button class="btn '+
       (horizon===60?'primary':'ghost')+' small akCalendarHorizon" data-days="60">60 jours</button></div></div>'+
     '<div style="overflow:auto;margin-top:12px"><div style="min-width:990px">'+
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:5px">'+
       ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(x=>'<strong class="tiny muted" style="padding:7px">'+x+'</strong>').join('')+
       '</div>'+matrix+'</div></div>'+
     (overdue.length?'<details style="margin-top:12px" open><summary><strong>Évaluations en retard ('+
       overdue.length+')</strong></summary><p class="muted tiny">Évaluations non clôturées uniquement.</p>'+
       '<div class="list">'+overdueRows+'</div></details>':'')+
     '<details style="margin-top:12px" open><summary><strong>Prochaines échéances ('+future.length+
       ')</strong></summary><div class="list">'+
       (futureRows||'<div class="muted tiny">Aucune échéance dans les '+horizon+' prochains jours.</div>')+
       '</div></details></div>';
 }
 const previousCalendar=calendarPage;
 calendarPage=function(){return calendarPanel()+previousCalendar();};
 const previousDashboard=dashboard;
 dashboard=function(){
   const html=previousDashboard();
   const next=scheduledNotifications().filter(x=>!x.read).slice(0,5);
   if(!next.length)return html;
   return '<div class="card panel" style="margin-bottom:12px"><div class="row between"><h3>Évaluations à préparer</h3>'+
     '<button class="btn ghost small akAssessmentToCalendar">Calendrier</button></div>'+
     '<div class="list">'+next.map(x=>'<div class="item"><strong>'+esc(x.title)+'</strong>'+
       '<div class="tiny muted">'+esc(x.detail)+'</div><button class="btn ghost small akOpenAssessmentClient" '+
       'data-client="'+esc(x.clientId)+'" data-tab="passport">Ouvrir le Passeport</button></div>').join('')+
     '</div></div>'+html;
 };
 document.addEventListener('click',e=>{
   const target=e.target.closest?.(
     '.akAssessmentResult,.akNewAssessment,.akAssessmentDone,.akAssessmentCancel,'+
     '.akClassifyResult,.akRefreshAssessments,.akAssessmentToCalendar,'+
     '.akOpenAssessmentClient,.akCalendarHorizon');
   if(!target)return;
   e.preventDefault();e.stopImmediatePropagation();
   if(target.classList.contains('akAssessmentToCalendar')){state.view='calendar';render();return;}
   if(target.classList.contains('akOpenAssessmentClient')){
     state.view='client';state.clientId=target.dataset.client;
     state.tab=target.dataset.tab||'passport';render();return;
   }
   if(target.classList.contains('akCalendarHorizon')){
     horizon=Number(target.dataset.days)===21?21:60;render();return;
   }
   const c=currentClient();if(!c||!['owner','coach'].includes(authProfile?.role))return;
   if(target.classList.contains('akNewAssessment')){
     if(authProfile?.role!=='owner')return alert('Cette action est réservée au propriétaire.');
     return createPlan(c);
   }
   if(target.classList.contains('akAssessmentResult')){
     const p=assessmentItems(c.id).find(x=>x.id===target.dataset.id);
     return testModal(c,{planId:p?.id||'',date:localDateISO()});
   }
   if(target.classList.contains('akClassifyResult'))return classifyOld(c,target.dataset.id);
   if(authProfile?.role!=='owner')return alert('Cette action est réservée au propriétaire.');
   if(target.classList.contains('akAssessmentDone')||target.classList.contains('akAssessmentCancel')){
     const p=assessmentItems(c.id).find(x=>x.id===target.dataset.id);
     if(p)return setPlanStatus(c,p,target.classList.contains('akAssessmentDone')?'completed':'cancelled');
   }
   if(target.classList.contains('akRefreshAssessments')){
     supa.rpc('owner_plan_assessments',{p_client_id:c.id}).then(async result=>{
       if(result.error)return alert(result.error.message);
       await loadSupabaseData();render();toast('Échéances mises à jour.');
     });return;
   }
 },true);
 window.AKP_ASSESSMENT_CALENDAR_READY=true;
})();