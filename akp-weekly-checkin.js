/* AK PRIME — bilans qualitatifs hebdomadaires (séparés d'Optitrainer). */
(function(){
 'use strict';
 const css=document.createElement('style');
 css.textContent=[
  '.akWeekDetails{border:1px solid #dfe6ef;border-radius:11px;padding:11px 13px;margin:9px 0;background:#fcfdff}',
  '.akWeekDetails summary{cursor:pointer;font-weight:750}',
  '.akWeekFact{display:grid;grid-template-columns:minmax(125px,.34fr) 1fr;gap:9px;margin:9px 0}',
  '.akWeekFact span{font-size:12px;color:#697e8b}',
  '.akWeekFact div{white-space:pre-wrap;overflow-wrap:anywhere}',
  '.akWeekColumns{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(260px,.7fr);gap:13px;align-items:start}',
  '.akWeekInput .field{margin-top:12px}.akWeekInput textarea{min-height:65px}',
  '@media(max-width:780px){.akWeekColumns{grid-template-columns:1fr}.akWeekFact{grid-template-columns:1fr;gap:2px}}'
 ].join('\n');
 document.head.appendChild(css);
 const iso=x=>x?String(x).slice(0,10):'';
 const present=x=>String(x??'').trim();
 function akpPainReported(value){
  const norm=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[’]/g,"'").replace(/[.,!?;:]+/g,' ')
   .replace(/\s+/g,' ').trim();
  if(!norm)return false;
  if(/^(?:non|nan|r\s*a\s*s|rien|neant|aucun|aucune|0|n\/a|sans objet|non rien|non ras)$/.test(norm))return false;
  if(/^(?:(?:non\s+)?rien (?:a signaler|de particulier|a declarer)|(?:non\s+)?(?:pas de|aucun(?:e)?) (?:douleur|gene|souci|probleme|blessure|symptome)s?(?: a signaler)?|aucune douleur (?:ni|et) (?:aucune )?gene|tout (?:va|est) bien|pas de souci particulier)$/.test(norm))return false;
  return true;
 }

 function paris(){
  const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const k=s=>p.find(t=>t.type===s)?.value||'';
  return {day:k('year')+'-'+k('month')+'-'+k('day'),hour:Number(k('hour'))||0};
 }
 function plus(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
 function windowWeek(){
  const t=paris(),weekday=new Date(t.day+'T12:00:00Z').getUTCDay();
  const last=plus(t.day,-((weekday-5+7)%7));
  const open=t.day>last||(t.day===last&&t.hour>=18);
  return {now:t.day,due:open?last:plus(last,-7),next:open?plus(last,7):last};
 }
 currentWeekFriday=function(){return windowWeek().due;};
 function current(s){
  const w=windowWeek(),from=iso(s?.client?.start_date);
  const active=s?.client?.status==='active';
  const due=active&&from&&w.due>=from&&w.due<=w.now;
  const answer=(s?.checkins||[]).find(x=>iso(x.week_date)===w.due);
  return {...w,due,answer};
 }
 function clientBlock(s){
  const w=current(s),active=s?.client?.status==='active';
  if(!active)return '<div class="client-section-card"><h3>Bilan hebdomadaire AK PRIME</h3><p class="muted tiny">Disponible lorsque ton accompagnement est actif.</p></div>';
  if(w.answer){
   const a=w.answer;
   const fields=[['Semaine',a.overall_week],['Difficultés',a.exercise_problem],
     ['Séances manquées',a.missed_sessions],['Gênes',a.pain_or_discomfort],
     ['Changements souhaités',a.other_info],['Contraintes',a.next_week_constraints]];
   return '<div class="client-section-card"><div class="row between"><div><h3>Bilan hebdomadaire AK PRIME</h3>'+
    '<p class="muted tiny">Semaine du '+fmtDate(w.due)+'</p></div>'+
    '<span class="status '+(a.reviewed_at?'green':'blue')+'">'+(a.reviewed_at?'Traité':'Envoyé')+'</span></div>'+
    '<details style="margin-top:10px"><summary style="cursor:pointer">Consulter mes réponses</summary>'+
    fields.filter(([,v])=>present(v)).map(([name,v])=>
     '<div class="akWeekFact"><span>'+esc(name)+'</span><div>'+esc(v)+'</div></div>').join('')+'</details>'+
    (a.reviewed_at&&(a.coach_feedback||a.coach_decision)?'<div class="alert green" style="margin-top:10px">'+
     '<strong>Retour du coach</strong><p style="white-space:pre-wrap">'+esc(a.coach_feedback||a.coach_decision)+'</p></div>':
     '<p class="muted tiny">Ton bilan est bien enregistré et consultable par ton coach.</p>')+
    '</div>';
  }
  if(!w.due)return '<div class="client-section-card"><div class="row between"><div>'+
    '<h3>Bilan hebdomadaire AK PRIME</h3><p class="muted tiny">Prochain questionnaire disponible vendredi '+
    fmtDate(w.next)+' à 18 h.</p></div><span class="status blue">À venir</span></div>'+
    '<p class="muted tiny">Le suivi quotidien autour des séances reste sur Optitrainer.</p></div>';
  return '<div class="client-section-card akWeekInput"><div class="row between"><div>'+
    '<h3>Bilan hebdomadaire AK PRIME</h3>'+
    '<p class="muted tiny">Semaine du '+fmtDate(w.due)+' · 2 minutes, distinct du suivi quotidien Optitrainer.</p></div>'+
    '<span class="status amber">À remplir</span></div>'+
    '<div class="field"><label>Comment s’est passée ta semaine ? *</label>'+
    '<textarea id="ciOverall" class="textarea" maxlength="1500" placeholder="Bien, mitigée, difficile… pourquoi ?"></textarea></div>'+
    '<div class="field"><label>Des difficultés avec les séances ou la programmation ?</label>'+
    '<textarea id="ciProblem" class="textarea" maxlength="1500" placeholder="Non, ou explique ce qui t’a posé problème"></textarea></div>'+
    '<div class="field"><label>Gêne ou douleur particulière ?</label>'+
    '<textarea id="ciPain" class="textarea" maxlength="1500" placeholder="Non, ou détaille"></textarea></div>'+
    '<div class="field"><label>Quelque chose qui te gêne dans l’accompagnement ou que tu voudrais changer ?</label>'+
    '<textarea id="ciOther" class="textarea" maxlength="1500" placeholder="Non, ou ce que tu aimerais améliorer"></textarea></div>'+
    '<div class="field"><label>Des contraintes la semaine prochaine ?</label>'+
    '<textarea id="ciConstraint" class="textarea" maxlength="1500" placeholder="Non, ou précise"></textarea></div>'+
    '<button class="btn primary" id="submitWeeklyCheckin">Envoyer mon bilan au coach</button>'+
    '<p class="muted tiny">Tes réponses sont consultées dans ton dossier AK PRIME.</p></div>';
 }
 // L'onglet dédié est le seul endroit où le formulaire complet est affiché.
 renderClientWeeklyCheckin=function(s){return clientBlock(s);};
 const origSuivi=renderClientSuivi;
 renderClientSuivi=function(s){
  const wrapper=document.createElement('div');wrapper.innerHTML=origSuivi(s);
  const page=wrapper.querySelector('.client-main');
  if(!page)return wrapper.innerHTML;
  const card='<div class="client-section-card"><div class="row between" style="gap:10px;flex-wrap:wrap"><div>'+
   '<h3 style="margin:0">Bilan hebdomadaire AK PRIME</h3>'+
   '<p class="muted tiny" style="margin:6px 0 0">Ressenti de la semaine, difficultés, gênes et ajustements souhaités, une fois par semaine.</p></div>'+
   '<button class="btn primary small clientGoCheckin">Ouvrir le bilan hebdo</button></div></div>';
  const head=page.querySelector('.client-page-head');
  (head||page).insertAdjacentHTML(head?'afterend':'afterbegin',card);
  return wrapper.innerHTML;
 };
 const origHome=renderClientHome;
 renderClientHome=function(s){
  const html=origHome(s);if(s?.client?.status!=='active')return html;
  const w=current(s),pending=w.due&&!w.answer;
  const card='<div class="client-action-card '+(pending?'urgent':'')+'" style="margin:12px 0"><strong>'+
    (pending?'Ton bilan hebdomadaire est disponible':'Prochain bilan hebdomadaire AK PRIME')+'</strong>'+
    '<div class="muted tiny" style="margin:6px 0">'+
    (pending?'Décris comment s’est passée ta semaine.':'Disponible vendredi '+fmtDate(w.next)+' à 18 h.')+'</div>'+
    (pending?'<button class="btn primary small clientGoCheckin">Compléter mon bilan</button>':'')+'</div>';
  const root=document.createElement('div');root.innerHTML=html;
  const main=root.querySelector('.client-main');
  if(main){
   const nav=main.querySelector('.client-home-actions');
   if(nav)nav.insertAdjacentHTML('beforebegin',card);
   else main.insertAdjacentHTML('beforeend',card);
  }
  return root.innerHTML;
 };
 const origClientNotif=clientNotifications;
 clientNotifications=function(s){
  const prev=origClientNotif(s).filter(x=>!String(x.key||'').startsWith('client:checkin:'));
  if(s?.client?.status!=='active')return prev;
  const w=current(s);if(!w.due||w.answer)return prev;
  const key='client:checkin:'+w.due,reads=new Set((s.notificationReads||[]).map(x=>x.notification_key));
  return [{key,title:'Bilan hebdomadaire AK PRIME à compléter',
    detail:'Ton court questionnaire de fin de semaine est disponible dans Mon suivi.',
    target:'checkin',priority:4,read:reads.has(key)},...prev];
 };
 function pending(w){return !w.reviewedAt||!present(w.coach);}
 const oldCoachNotifications=coachNotifications;
 coachNotifications=function(){
  const existing=oldCoachNotifications().filter(n=>!String(n.key||'').startsWith('coach:checkin:'));
  const reads=new Set((db.notificationReads||[]).map(x=>x.notification_key));
  const loggedCheckins=new Set((db.coachActivityEvents||[])
    .filter(e=>e.event_type==='checkin_submitted')
    .map(e=>String(e.event_key||'').split(':')[1]));
  const notifications=(db.clients||[]).flatMap(c=>(c.checkins||[])
    .filter(w=>pending(w)&&!loggedCheckins.has(w.id)).map(w=>{
   const key='coach:checkin:'+w.id;
   return {key,title:'Bilan hebdomadaire reçu — '+c.name,
     detail:'Semaine du '+fmtDate(w.date)+' · réponse à traiter.',
     target:'client',clientId:c.id,tab:'follow',priority:5,read:reads.has(key)};
  }));
  return [...notifications,...existing].sort((a,b)=>Number(!!a.read)-Number(!!b.read)||(b.priority||0)-(a.priority||0));
 };
 const origDashboard=dashboard;
 dashboard=function(){
  const html=origDashboard();
  const todo=(db.clients||[]).filter(c=>!c.isTest&&!c.archivedAt)
   .flatMap(c=>(c.checkins||[]).filter(pending).map(w=>({c,w})));
  if(!todo.length)return html;
  return '<div class="card panel" style="margin-bottom:12px"><h3>Bilans hebdomadaires à traiter '+
   '<span class="status amber">'+todo.length+'</span></h3>'+
   '<div class="list">'+todo.slice(0,6).map(({c,w})=>
    '<div class="item row between"><div><strong>'+esc(c.name)+'</strong><div class="muted tiny">'+fmtDate(w.date)+
    (akpPainReported(w.pain)?' · Gêne signalée':'')+'</div></div>'+
    '<button class="btn ghost small openClient" data-id="'+esc(c.id)+'" data-tab-target="follow">Consulter</button></div>').join('')+
   '</div></div>'+html;
 };
 function rowsMarkup(rows){
  return rows.map(w=>{
   const answers=[['Ressenti général',w.feeling],['Séances non réalisées',w.missed],['Difficultés',w.problem],
    ['Gêne ou douleur',w.pain],['Ce qui gêne / à améliorer',w.other],
    ['Contraintes prochaines',w.nextConstraint]].filter(([,value])=>present(value));
   return '<details class="akWeekDetails"><summary><span>Semaine du '+fmtDate(w.date)+'</span> '+
    (akpPainReported(w.pain)?'<span class="status amber">Gêne signalée</span> ':'')+
    '<span class="status '+(pending(w)?'amber':'green')+'">'+(pending(w)?'À traiter':'Traité')+'</span></summary>'+
    '<div style="margin-top:12px">'+(answers.length?answers.map(([label,val])=>
     '<div class="akWeekFact"><span>'+esc(label)+'</span><div>'+esc(val)+'</div></div>').join(''):
     '<p class="muted tiny">Ancien bilan sans réponse renseignée.</p>')+
    '<div class="field"><label>Retour / décision du coach</label>'+
    '<textarea class="textarea coachCheckinFeedback" rows="3" data-id="'+esc(w.id)+'">'+esc(w.coach||'')+'</textarea></div>'+
    '<button class="btn primary small reviewCheckin" data-id="'+esc(w.id)+'">'+
    (pending(w)?'Enregistrer et traiter':'Modifier mon retour')+'</button></div></details>';
  }).join('');
 }
 follow=function(c){
  const all=(c.checkins||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const todo=all.filter(pending),done=all.filter(w=>!pending(w));
  return '<div class="page-title"><div><h1>Bilans hebdomadaires AK PRIME</h1>'+
   '<p>Retours qualitatifs du client chaque semaine, sans recopier la charge ni l’état de forme quotidien d’Optitrainer.</p></div>'+
   '<button class="btn ghost small akRefreshWeek">Actualiser</button></div>'+
   '<div class="akWeekColumns"><div>'+
   '<div class="card panel"><div class="row between"><h3>À traiter</h3><span class="status '+(todo.length?'amber':'green')+'">'+todo.length+'</span></div>'+
   (todo.length?rowsMarkup(todo):'<p class="muted tiny">Aucun bilan en attente.</p>')+'</div>'+
   '<details class="card panel" style="margin-top:13px"><summary style="cursor:pointer"><strong>Historique des bilans traités</strong> '+
    '<span class="status blue">'+done.length+'</span></summary>'+
   '<div style="margin-top:10px">'+(done.length?rowsMarkup(done):'<p class="muted tiny">Aucun ancien bilan.</p>')+'</div></details></div>'+
   '<div><div class="card panel"><h3>Comment fonctionne le suivi ?</h3>'+
   '<p><strong>Vendredi à 18 h :</strong> questionnaire disponible dans l’espace client, avec rappel interne.</p>'+
   '<p><strong>Client :</strong> ressenti, problèmes, gênes, besoins d’ajustement et contraintes.</p>'+
   '<p><strong>Coach :</strong> lecture ici, retour / décision conservé dans l’historique.</p>'+
   '<p class="muted tiny">Aucun e-mail automatique configuré pour le moment.</p></div>'+
   (c.pole!=='Mental'?'<div class="card panel" style="margin-top:13px"><h3>Suivi quotidien Optitrainer</h3>'+
    (c.cycle?.optitrainer&&/^https:\/\//i.test(c.cycle.optitrainer)?
     '<a class="btn primary small" target="_blank" rel="noopener noreferrer" href="'+esc(c.cycle.optitrainer)+'">Ouvrir Optitrainer</a>':
     '<p class="muted tiny">Lien Optitrainer à renseigner dans le dossier.</p>')+'</div>':'')+
   '<div class="card panel" style="margin-top:13px"><h3>Suite de l’accompagnement</h3>'+
   '<button class="btn ghost small quickTab" data-tab="visio_notes">Ouvrir Visios & notes</button></div></div></div>';
 };
 document.addEventListener('click',async e=>{
  const b=e.target.closest?.('.akRefreshWeek');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();b.disabled=true;
  try{await loadSupabaseData();render();toast('Bilans actualisés.')}
  catch(err){b.disabled=false;alert('Impossible d’actualiser : '+err.message)}
 },true);
 window.AKP_WEEKLY_CHECKIN_READY=true;
})();