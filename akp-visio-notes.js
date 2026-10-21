/* AK PRIME — Carnet privé de visios, commentaires d'entretien et tâches de suivi. */
(function(){
 'use strict';
 const types={initial:'Visio initiale',followup:'Visio de suivi',other:'Autre échange'};
 const css=[
 '.akFocusGrid,.akMinutesGrid{display:grid;grid-template-columns:minmax(320px,1fr) minmax(320px,1fr);gap:14px;align-items:start;margin:14px 0}',
 '.akFocusItem{padding:12px;border:1px solid #dce4ec;border-radius:10px;margin-top:10px;background:#fcfdff}',
 '.akFocusItem textarea{margin-top:8px;min-height:76px;width:100%;resize:vertical}',
 '.akFocusStatus{display:block;margin-top:5px;font-size:11px;color:#58796d}',
 '.akFocusSide{position:sticky;top:10px;max-height:79vh;overflow:auto}',
 '.akMinutesGrid .card{min-width:0}.akMinutesActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}',
 '.akMinutesItem{padding:12px;white-space:normal;overflow-wrap:anywhere}',
 '.akMinutesItem .akExcerpt{white-space:pre-wrap;font-size:12px;margin:7px 0}',
 '@media(max-width:880px){.akFocusGrid,.akMinutesGrid{grid-template-columns:1fr}.akFocusSide{position:static;max-height:none}}'
 ].join('\n');
 const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
 const noteRows=id=>(db.visioNotebook||[]).filter(n=>n.client_id===id)
  .sort((a,b)=>String(b.session_date).localeCompare(String(a.session_date))||String(b.created_at).localeCompare(String(a.created_at)));
 const taskRows=id=>(db.visioTasks||[]).filter(t=>t.client_id===id)
  .sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')||String(a.due_date||'9999').localeCompare(String(b.due_date||'9999')));
 const dayParis=v=>v?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v)):localDateISO();
 const oldLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
  const value=await oldLoad.apply(this,args);
  if(!authUser?.id||!['owner','coach'].includes(authProfile?.role))return value;
  const rs=await Promise.all([
   supa.from('client_workspace').select('client_id,focus_comments'),
   supa.from('client_visio_notes').select('*').order('session_date',{ascending:false}).limit(1500),
   supa.from('client_followup_tasks').select('*').order('created_at',{ascending:false}).limit(2000)
  ]);
  const failure=rs.find(x=>x.error)?.error;
  if(failure)throw Error('Chargement des notes : '+failure.message);
  const byClient=new Map((rs[0].data||[]).map(x=>[x.client_id,x.focus_comments||{}]));
  (db.clients||[]).forEach(c=>{c.focusComments=byClient.get(c.id)||{}});
  db.visioNotebook=rs[1].data||[];db.visioTasks=rs[2].data||[];
  return value;
 };
 function flaggedHtml(c){
  const flags=Object.keys(c.deep||{}).filter(k=>c.deep[k]);
  if(!flags.length)return '<p class="muted tiny">Coche « À approfondir en visio » sur une réponse pour afficher ici son commentaire.</p>';
  return flags.map(key=>{
   const raw=c.questionnaire?.[key],answer=Array.isArray(raw)?raw.join(', '):raw===true?'Oui':raw===false?'Non':raw??'—';
   return '<div class="akFocusItem"><strong>'+esc(questionLabel(key))+'</strong>'+
    '<div class="muted tiny" style="margin:5px 0">Réponse : '+esc(String(answer))+'</div>'+
    '<label class="tiny muted">Commentaire / questions à poser</label>'+
    '<textarea class="textarea akFocusInput" data-key="'+esc(key)+'" maxlength="6000" placeholder="À clarifier pendant la visio…">'+esc(c.focusComments?.[key]||'')+'</textarea>'+
    '<span class="akFocusStatus">Enregistrement à la sortie du champ</span></div>';
  }).join('');
 }
 function focusPanel(c){
  return '<div class="card panel akFocusSide"><div class="row between" style="gap:9px"><div><h3>Points à approfondir</h3>'+
   '<p class="muted tiny">Tes commentaires apparaissent ici dès qu’une réponse est cochée. Privés et conservés pour la prochaine visio.</p></div>'+
   '<span class="status amber akFocusCount">'+Object.values(c.deep||{}).filter(Boolean).length+' point(s)</span></div>'+
   '<div id="akFocusItems">'+flaggedHtml(c)+'</div>'+
   '<div class="akMinutesActions"><button class="btn primary small akFocusSave">Enregistrer les commentaires</button>'+
   '<button class="btn ghost small akGoMinutes">Visios & notes →</button></div></div>';
 }
 const formerOnboarding=onboarding;
 onboarding=function(c){
  const root=document.createElement('div');root.innerHTML=formerOnboarding(c);
  const grid=root.querySelector('.grid31');
  if(!grid||grid.children.length<3)return root.innerHTML;
  const responses=grid.children[0],middle=grid.children[1];
  const analysis=middle.querySelector('.card.panel');
  if(analysis&&analysis.textContent.includes('Analyse avant visio')){
   const title=analysis.querySelector('h3');if(title)title.textContent='Préparation et notes de la visio initiale';
   const oldList=analysis.querySelector('.item');if(oldList)oldList.remove();
  }
  const focus=document.createElement('div');focus.className='akFocusGrid';
  focus.appendChild(responses);
  const wrap=document.createElement('div');wrap.innerHTML=focusPanel(c);focus.appendChild(wrap.firstElementChild);
  grid.parentNode.insertBefore(focus,grid);grid.className='grid2';
  return root.innerHTML;
 };
 const previousClientTab=clientTab;
 clientTab=function(c){return state.tab==='visio_notes'?minutesPage(c):previousClientTab(c)};
 const previousClientPage=clientPage;
 clientPage=function(){
  const html=previousClientPage();
  const dom=document.createElement('div');dom.innerHTML=html;
  const tabs=dom.querySelector('.card.tabs');if(!tabs)return html;
  const btn=document.createElement('button');btn.dataset.tab='visio_notes';btn.textContent='Visios & notes';
  if(state.tab==='visio_notes')btn.className='on';
  tabs.appendChild(btn);return dom.innerHTML;
 };
 function appointmentList(c){
  const visios=(db.appointments||[]).filter(a=>a.client_id===c.id&&!['cancelled','cancelled_late','no_show'].includes(a.status))
   .sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at));
  if(!visios.length)return '<div class="muted tiny">Aucune visio réservée. Tu peux quand même créer une note libre.</div>';
  return visios.slice(0,20).map(a=>{
   const old=noteRows(c.id).find(n=>n.appointment_id===a.id);
   return '<div class="item row between akMinutesItem"><div><strong>'+esc(fmtDateTime(a.starts_at))+'</strong>'+
    '<div class="muted tiny">'+esc(a.appointment_type||'Visio')+' · '+esc(appointmentStatusLabel(a.status))+'</div></div>'+
    '<button class="btn ghost small akEditMinutes" data-id="'+esc(old?.id||'')+'" data-appointment="'+esc(a.id)+'">'+
    (old?'Reprendre les notes':'Préparer la fiche')+'</button></div>';
  }).join('');
 }
 function minutesList(c){
  const notes=noteRows(c.id);
  if(!notes.length)return '<p class="muted tiny">Aucune note enregistrée. Tu peux créer un brouillon dès maintenant.</p>';
  return notes.map(n=>'<div class="item akMinutesItem"><div class="row between"><div><strong>'+esc(n.title)+'</strong>'+
    '<div class="muted tiny">'+esc(fmtDate(n.session_date))+' · '+esc(types[n.session_type]||'Visio')+'</div></div>'+
    '<span class="status '+(n.status==='completed'?'green':'amber')+'">'+(n.status==='completed'?'Terminée':'Brouillon')+'</span></div>'+
    (n.working?'<div class="akExcerpt"><b>Ce qui fonctionne :</b> '+esc(n.working.slice(0,300))+'</div>':'')+
    (n.difficulties?'<div class="akExcerpt"><b>Difficultés :</b> '+esc(n.difficulties.slice(0,300))+'</div>':'')+
    (n.next_session?'<div class="akExcerpt"><b>À revoir :</b> '+esc(n.next_session.slice(0,300))+'</div>':'')+
    '<div class="akMinutesActions"><button class="btn ghost small akEditMinutes" data-id="'+esc(n.id)+'">Ouvrir / modifier</button>'+
    '<button class="btn ghost small akEditTask" data-note="'+esc(n.id)+'">+ Action</button>'+
    '<button class="link akRemoveMinutes" data-id="'+esc(n.id)+'">Supprimer</button></div></div>').join('');
 }
 function actionsList(c){
  const todos=taskRows(c.id),pending=todos.filter(t=>t.status==='todo'),done=todos.filter(t=>t.status==='done');
  const renderTask=t=>'<div class="item akMinutesItem"><div class="row between"><strong>'+esc(t.title)+'</strong>'+
    '<span class="status '+(t.status==='done'?'green':'amber')+'">'+(t.status==='done'?'Fait':'À faire')+'</span></div>'+
    '<div class="muted tiny">'+(t.due_date?'Échéance : '+esc(fmtDate(t.due_date)):'Sans date')+(t.detail?' · '+esc(t.detail):'')+'</div>'+
    '<div class="akMinutesActions"><button class="btn ghost small akToggleTask" data-id="'+esc(t.id)+'">'+
    (t.status==='done'?'Rouvrir':'Terminer')+'</button>'+
    '<button class="btn ghost small akEditTask" data-id="'+esc(t.id)+'">Modifier</button>'+
    '<button class="link akRemoveTask" data-id="'+esc(t.id)+'">Supprimer</button></div></div>';
  return '<div class="card panel"><div class="row between"><div><h3>Travail à réaliser</h3>'+
   '<p class="muted tiny">Les actions restent en attente jusqu’à validation. Échéance facultative, affichée au calendrier.</p></div>'+
   '<button class="btn primary small akEditTask">+ Action</button></div>'+
   '<div class="list">'+(pending.map(renderTask).join('')||'<div class="muted tiny">Aucune action en attente.</div>')+'</div>'+
   (done.length?'<details style="margin-top:12px"><summary>Actions terminées ('+done.length+')</summary>'+
     '<div class="list">'+done.map(renderTask).join('')+'</div></details>':'')+'</div>';
 }
 function minutesPage(c){
  return '<div class="page-title"><div><h2>Visios & notes</h2><p>Prépare chaque rendez-vous, garde son compte rendu et planifie les actions à réaliser.</p></div>'+
   '<button class="btn primary akEditMinutes">+ Nouvelle note</button></div>'+
   '<div class="akMinutesGrid"><div><div class="card panel" style="margin-bottom:13px"><h3>Comptes rendus</h3>'+
   '<div class="list">'+minutesList(c)+'</div></div>'+
   '<div class="card panel"><h3>Rendez-vous de ce client</h3><p class="muted tiny">Lier une fiche à une visio est facultatif.</p>'+
   '<div class="list">'+appointmentList(c)+'</div></div></div>'+
   '<div>'+actionsList(c)+'</div></div>';
 }
 function openMinutes(c,id,appointmentId){
  let n=noteRows(c.id).find(x=>x.id===id)||noteRows(c.id).find(x=>x.appointment_id===appointmentId&&appointmentId);
  const visios=(db.appointments||[]).filter(a=>a.client_id===c.id&&!['cancelled','cancelled_late','no_show'].includes(a.status));
  const chosen=visios.find(a=>a.id===(n?.appointment_id||appointmentId));
  const type=n?.session_type||(c.onboarding?.currentStep==='active'?'followup':'initial');
  modal('Compte rendu — '+esc(c.name),
   '<p class="muted tiny">Notes privées. Tu peux enregistrer un brouillon avant la visio, le compléter et le terminer après.</p>'+
   '<div class="grid2"><div class="field"><label>Date de la visio</label><input type="date" class="input" id="akMinuteDate" value="'+esc(n?.session_date||dayParis(chosen?.starts_at))+'"></div>'+
   '<div class="field"><label>Type</label><select class="select" id="akMinuteType">'+
    Object.entries(types).map(([v,label])=>'<option value="'+v+'" '+(type===v?'selected':'')+'>'+label+'</option>').join('')+
   '</select></div></div>'+
   '<div class="field"><label>Rendez-vous associé</label><select class="select" id="akMinuteAppointment">'+
   '<option value="">Note libre</option>'+visios.map(a=>'<option value="'+esc(a.id)+'" '+
     ((n?.appointment_id||appointmentId)===a.id?'selected':'')+'>'+esc(fmtDateTime(a.starts_at))+'</option>').join('')+'</select></div>'+
   '<div class="field"><label>Titre</label><input class="input" maxlength="160" id="akMinuteTitle" value="'+esc(n?.title||'Point de suivi')+'"></div>'+
   [['objectives','Sujets à aborder'],['working','Ce qui fonctionne / progrès'],['difficulties','Ce qui ne fonctionne pas / difficultés'],
    ['decisions','Décisions et ajustements'],['next_session','À reprendre à la prochaine visio']].map(([key,label])=>
     '<div class="field"><label>'+label+'</label><textarea class="textarea" rows="3" maxlength="6000" id="akMinute_'+key+'">'+esc(n?.[key]||'')+'</textarea></div>').join('')+
   '<div class="field"><label>État de la fiche</label><select id="akMinuteStatus" class="select">'+
     '<option value="draft" '+(n?.status!=='completed'?'selected':'')+'>Brouillon</option>'+
     '<option value="completed" '+(n?.status==='completed'?'selected':'')+'>Compte rendu terminé</option></select></div>',
   '<button class="btn ghost" id="akMinuteCancel">Annuler</button><button class="btn primary" id="akMinuteSave">Enregistrer</button>');
  document.getElementById('akMinuteCancel').onclick=closeModal;
  document.getElementById('akMinuteAppointment').onchange=e=>{
   const a=visios.find(x=>x.id===e.target.value);if(a)document.getElementById('akMinuteDate').value=dayParis(a.starts_at);
  };
  document.getElementById('akMinuteSave').onclick=async()=>{
   const get=k=>document.getElementById(k).value;
   const title=get('akMinuteTitle').trim(),date=get('akMinuteDate'),appt=get('akMinuteAppointment')||null;
   if(title.length<2||title.length>160||!/^\d{4}-\d{2}-\d{2}$/.test(date))return alert('Titre et date valides obligatoires.');
   if(appt&&noteRows(c.id).some(x=>x.appointment_id===appt&&x.id!==n?.id))
    return alert('Une autre fiche est déjà liée à cette visio. Ouvre-la plutôt.');
   const row={client_id:c.id,title,session_date:date,session_type:get('akMinuteType'),appointment_id:appt,
    status:get('akMinuteStatus')};
   for(const key of ['objectives','working','difficulties','decisions','next_session'])row[key]=get('akMinute_'+key).trim();
   const b=document.getElementById('akMinuteSave');b.disabled=true;
   const q=n?supa.from('client_visio_notes').update(row).eq('id',n.id).eq('client_id',c.id):
      supa.from('client_visio_notes').insert({...row,created_by:authUser.id});
   const {error}=await q;
   if(error){b.disabled=false;return alert('Enregistrement impossible : '+error.message);}
   closeModal();await loadSupabaseData();render();toast('Compte rendu enregistré.');
  };
 }
 function openTask(c,id,noteId){
  const t=taskRows(c.id).find(x=>x.id===id),notes=noteRows(c.id);
  modal((t?'Modifier':'Créer')+' une action — '+esc(c.name),
   '<div class="field"><label>Action à réaliser</label><input id="akTaskTitle" class="input" maxlength="240" value="'+esc(t?.title||'')+'" placeholder="Ex. Préparer un nouveau test"></div>'+
   '<div class="field"><label>Précisions</label><textarea id="akTaskDetail" class="textarea" maxlength="5000" rows="3">'+esc(t?.detail||'')+'</textarea></div>'+
   '<div class="grid2"><div class="field"><label>Échéance facultative</label><input type="date" id="akTaskDue" class="input" value="'+esc(t?.due_date||'')+'"></div>'+
   '<div class="field"><label>Note liée</label><select id="akTaskMinutes" class="select"><option value="">Aucune</option>'+
    notes.map(n=>'<option value="'+esc(n.id)+'" '+((t?.visio_note_id||noteId)===n.id?'selected':'')+'>'+esc(fmtDate(n.session_date))+' — '+esc(n.title)+'</option>').join('')+
   '</select></div></div>',
   '<button class="btn ghost" id="akTaskCancel">Annuler</button><button class="btn primary" id="akTaskSave">Enregistrer</button>');
  document.getElementById('akTaskCancel').onclick=closeModal;
  document.getElementById('akTaskSave').onclick=async()=>{
   const title=document.getElementById('akTaskTitle').value.trim(),due=document.getElementById('akTaskDue').value;
   if(title.length<2||title.length>240||due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))return alert('Action ou date invalide.');
   const row={client_id:c.id,title,detail:document.getElementById('akTaskDetail').value.trim(),
    due_date:due||null,visio_note_id:document.getElementById('akTaskMinutes').value||null};
   const b=document.getElementById('akTaskSave');b.disabled=true;
   const q=t?supa.from('client_followup_tasks').update(row).eq('id',t.id).eq('client_id',c.id):
       supa.from('client_followup_tasks').insert({...row,created_by:authUser.id});
   const {error}=await q;
   if(error){b.disabled=false;return alert('Action non enregistrée : '+error.message);}
   closeModal();await loadSupabaseData();render();toast('Action enregistrée.');
  };
 }
 async function saveFocus(c,element){
  const comments=Object.fromEntries(Object.entries(c.focusComments||{}).filter(([k,v])=>typeof v==='string'&&v.trim()));
  if(element)element.textContent='Enregistrement…';
  const {error}=await supa.from('client_workspace').upsert({client_id:c.id,focus_comments:comments},{onConflict:'client_id'});
  if(error){if(element)element.textContent='Erreur : '+error.message;else alert(error.message);return;}
  if(element)element.textContent='Enregistré';else toast('Commentaires enregistrés.');
 }
 const oldBind=bind;
 bind=function(){
  oldBind();
  document.querySelectorAll('.deepCheck').forEach(input=>input.addEventListener('change',()=>{
   const c=currentClient(),pane=document.getElementById('akFocusItems');if(!c||!pane)return;
   pane.innerHTML=flaggedHtml(c);
   const count=document.querySelector('.akFocusCount');if(count)count.textContent=Object.values(c.deep||{}).filter(Boolean).length+' point(s)';
  }));
 };
 document.addEventListener('input',e=>{
  const el=e.target.closest?.('.akFocusInput');if(!el)return;
  const c=currentClient();if(!c)return;
  c.focusComments=c.focusComments||{};c.focusComments[el.dataset.key]=el.value;
  const status=el.closest('.akFocusItem').querySelector('.akFocusStatus');
  if(status)status.textContent='Modifié, non enregistré…';
 });
 document.addEventListener('change',e=>{
  const el=e.target.closest?.('.akFocusInput');if(!el)return;
  const c=currentClient();if(!c)return;
  c.focusComments=c.focusComments||{};c.focusComments[el.dataset.key]=el.value;
  saveFocus(c,el.closest('.akFocusItem').querySelector('.akFocusStatus'));
 });
 document.addEventListener('click',async e=>{
  const t=e.target.closest?.('.akFocusSave,.akGoMinutes,.akEditMinutes,.akEditTask,.akToggleTask,.akRemoveTask,.akRemoveMinutes,.akOpenTaskClient');
  if(!t)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(t.classList.contains('akOpenTaskClient')){
   state.view='client';state.clientId=t.dataset.client;state.tab='visio_notes';render();return;
  }
  const c=currentClient();if(!c)return;
  if(t.classList.contains('akGoMinutes')){state.tab='visio_notes';render();return;}
  if(t.classList.contains('akFocusSave')){t.disabled=true;try{await saveFocus(c)}finally{t.disabled=false}return;}
  if(t.classList.contains('akEditMinutes'))return openMinutes(c,t.dataset.id||'',t.dataset.appointment||'');
  if(t.classList.contains('akEditTask'))return openTask(c,t.dataset.id||'',t.dataset.note||'');
  if(t.classList.contains('akToggleTask')){
   const row=taskRows(c.id).find(x=>x.id===t.dataset.id);if(!row)return;
   const {error}=await supa.from('client_followup_tasks').update({status:row.status==='done'?'todo':'done'}).eq('id',row.id).eq('client_id',c.id);
   if(error)return alert(error.message);
   await loadSupabaseData();render();toast('Action mise à jour.');return;
  }
  if(t.classList.contains('akRemoveMinutes')){
   if(!confirm('Supprimer définitivement cette note ? Les actions associées seront conservées.'))return;
   const {error}=await supa.from('client_visio_notes').delete().eq('id',t.dataset.id).eq('client_id',c.id);
   if(error)return alert(error.message);
   await loadSupabaseData();render();toast('Note supprimée.');return;
  }
  if(t.classList.contains('akRemoveTask')){
   if(!confirm('Supprimer définitivement cette action ?'))return;
   const {error}=await supa.from('client_followup_tasks').delete().eq('id',t.dataset.id).eq('client_id',c.id);
   if(error)return alert(error.message);
   await loadSupabaseData();render();toast('Action supprimée.');return;
  }
 },true);
 const formerCalendar=calendarPage;
 calendarPage=function(){
  const now=localDateISO(),until=new Date(Date.parse(now+'T12:00:00Z')+21*86400000).toISOString().slice(0,10);
  const list=(db.visioTasks||[]).filter(t=>t.status==='todo'&&t.due_date&&t.due_date<=until&&
   (db.clients||[]).some(c=>c.id===t.client_id&&!c.archivedAt)).sort((a,b)=>a.due_date.localeCompare(b.due_date));
  if(!list.length)return formerCalendar();
  const names=new Map((db.clients||[]).map(c=>[c.id,c.name]));
  return '<div class="card panel" style="margin-bottom:14px"><h3>Actions à préparer</h3>'+
   '<p class="muted tiny">Actions de suivi en retard ou attendues dans les 21 prochains jours.</p><div class="list">'+
    list.slice(0,30).map(t=>'<div class="item row between"><div><strong>'+esc(t.title)+'</strong>'+
     '<div class="muted tiny">'+esc(names.get(t.client_id)||'Client')+' · '+esc(fmtDate(t.due_date))+'</div></div>'+
     '<button class="btn ghost small akOpenTaskClient" data-client="'+esc(t.client_id)+'">Voir les notes</button></div>').join('')+
   '</div></div>'+formerCalendar();
 };
 const formerNotifications=coachNotifications;
 coachNotifications=function(){
  const now=localDateISO(),reads=new Set((db.notificationReads||[]).map(r=>r.notification_key));
  const due=(db.visioTasks||[]).filter(t=>t.status==='todo'&&t.due_date&&
   (db.clients||[]).some(c=>c.id===t.client_id&&!c.archivedAt)).map(t=>{
    const diff=Math.round((Date.parse(t.due_date+'T12:00:00Z')-Date.parse(now+'T12:00:00Z'))/86400000);
    if(diff>7)return null;
    const key='coach:task:'+t.id+':'+t.due_date+':'+(diff<0?'late':diff<=2?'soon':'prepare');
    const name=(db.clients||[]).find(c=>c.id===t.client_id)?.name||'Client';
    return {key,title:(diff<0?'Action en retard — ':diff<=2?'Action imminente — ':'À préparer — ')+t.title,
     detail:name+' · '+fmtDate(t.due_date),target:'client',clientId:t.client_id,tab:'visio_notes',
     priority:diff<0?6:5,read:reads.has(key)};
   }).filter(Boolean);
  return [...due,...formerNotifications()].sort((a,b)=>Number(!!a.read)-Number(!!b.read)||(b.priority||0)-(a.priority||0));
 };
 window.AKP_VISIO_NOTES_READY=true;
})();