/* AK PRIME — Cycles pilotables, périodes historiques et retests visibles dans la chronologie.
 * Une échéance prévisionnelle n'est jamais présentée comme un test réalisé.
 */
(function(){
 'use strict';
 const toISO=v=>v?String(v).slice(0,10):'';
 const today=()=>localDateISO();
 const plusDay=v=>{const d=new Date(toISO(v)+'T12:00:00Z');if(isNaN(d.getTime()))return today();d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)};
 const statusName={planned:'Prévu',active:'En cours',completed:'Terminé',cancelled:'Annulé'};
 const phaseName={initial:'Évaluation initiale',retest:'Retest',cycle_end:'Bilan fin de cycle'};
 const rawCycles=id=>(db.akAllCycles||[]).filter(x=>x.client_id===id)
  .sort((a,b)=>String(b.start_date).localeCompare(String(a.start_date))||String(b.created_at).localeCompare(String(a.created_at)));
 function pickCurrent(rows){
  const sorted=rows.slice().sort((a,b)=>String(b.start_date).localeCompare(String(a.start_date)));
  const now=today();
  return sorted.find(r=>r.status!=='completed'&&r.status!=='cancelled'&&
      toISO(r.start_date)<=now&&(!r.end_date||toISO(r.end_date)>=now))||
   sorted.find(r=>toISO(r.start_date)<=now)||sorted.slice().reverse()[0]||null;
 }
 function toClientCycle(row,old={}){
  return {_id:row.id,title:row.title||'',start:toISO(row.start_date),end:toISO(row.end_date),
   priorities:row.priorities||'',vigilance:row.vigilance||'',outcome:row.outcome_summary||'',
   status:row.status||'planned',optitrainer:old.optitrainer||''};
 }
 const oldLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
  const value=await oldLoad.apply(this,args);
  if(!authUser?.id||!['owner','coach'].includes(authProfile?.role))return value;
  const {data,error}=await supa.from('cycles').select('*').order('start_date',{ascending:false}).limit(2000);
  if(error)throw Error('Gestion des cycles : '+error.message);
  db.akAllCycles=data||[];
  (db.clients||[]).forEach(c=>{
    const selected=pickCurrent(rawCycles(c.id));
    if(selected)c.cycle=toClientCycle(selected,c.cycle);
  });
  return value;
 };
 const oldEnter=enterClientPortal;
 enterClientPortal=async function(...args){
  await oldEnter.apply(this,args);
  const session=clientPortalState;
  if(!session?.client||authProfile?.role!=='client')return;
  const [cy,plans]=await Promise.all([
   supa.from('cycles').select('*').eq('client_id',session.client.id).order('start_date',{ascending:false}).limit(200),
   supa.rpc('my_passport_assessment_dates')
  ]);
  if(clientPortalState!==session)return;
  if(cy.error)console.warn('Historique des cycles non disponible :',cy.error.message);
  else{
    session.passportCycleHistory=cy.data||[];
    session.cycle=pickCurrent(cy.data||[]);
  }
  if(plans.error)console.warn('Dates des retests indisponibles :',plans.error.message);
  session.passportAssessmentDates=plans.data||[];
  renderClientPortal();
 };
 const oldCoachModel=passportModelFromCoach;
 passportModelFromCoach=function(c){
  const m=oldCoachModel(c);
  m.cycleHistory=rawCycles(c.id);
  m.assessmentDates=(db.assessmentPlans||[]).filter(p=>p.client_id===c.id);
  m.testMilestones=(c.tests||[]).map(t=>({
   name:t.name,date:toISO(t.date),value:t.value,unit:t.unit,
   phase:t.assessmentPhase||'unclassified',context:t.context||''
  }));
  return m;
 };
 const oldClientModel=passportModelFromClient;
 passportModelFromClient=function(s){
  const m=oldClientModel(s);
  m.assessmentDates=s.passportAssessmentDates||[];
  m.testMilestones=(s.tests||[]).filter(t=>t.include_in_passport!==false).map(t=>({
   name:t.test_name,date:toISO(t.performed_at),value:t.result_value??t.result_text??'',
   unit:t.unit||'',phase:t.assessment_phase||'unclassified',context:t.context||''
  }));
  return m;
 };
 // Un retest n'est annoncé que s'il est effectivement planifié.
 const oldNextRetest=passportNextRetest;
 passportNextRetest=function(m){
  const next=(m.assessmentDates||[]).filter(p=>p.phase==='retest'&&p.status==='planned'&&
      toISO(p.due_date)>=today()).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)))[0];
  if(next)return {date:toISO(next.due_date),title:next.title||'Retest prévu',detail:''};
  const explicit=(m.events||[]).filter(e=>toISO(e.date)>=today()&&
   /retest|re-test/i.test(e.title||'')).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
  return explicit?{date:toISO(explicit.date),title:explicit.title,detail:explicit.detail||''}:null;
 };
 const formerTimeline=passportTimelinePage;
 passportTimelinePage=function(m){
  const events=(m.events||[]).slice();
  const rows=Array.isArray(m.cycleHistory)?m.cycleHistory:[];
  const cycleIds=new Set();
  for(const c of rows){
   if(c.id)cycleIds.add(c.id);
   if(c.start_date)events.push({date:toISO(c.start_date),title:'Début du cycle — '+(c.title||'Sans nom'),
      detail:c.status==='planned'&&toISO(c.start_date)>today()?'Début prévu':'Cycle enregistré'});
   if(c.end_date&&c.id!==m.cycle?.id){
    const planned=toISO(c.end_date)>today()&&c.status!=='completed';
    events.push({date:toISO(c.end_date),title:(planned?'Fin prévue du cycle — ':'Fin de cycle — ')+(c.title||'Sans nom'),
       detail:'Du '+fmtDate(toISO(c.start_date))+' au '+fmtDate(toISO(c.end_date))});
   }
  }
  for(const p of m.assessmentDates||[]){
   if(!p.due_date||p.status==='cancelled')continue;
   const name=phaseName[p.phase]||'Évaluation';
   const label=p.status==='completed'?'Clôturé':'Prévu';
   const prefix=p.status==='completed'?name+' clôturé':name+' prévu';
   events.push({date:toISO(p.due_date),title:prefix+' — '+(p.title||name),
    detail:label+' · '+(p.status==='completed'?'Évaluation clôturée. Résultats présentés séparément.':'Échéance planifiée, sans résultat à ce stade.')});
  }
  for(const t of m.testMilestones||[]){
   if(!t.date||!t.name)continue;
   const phase=phaseName[t.phase]||'Mesure';
   const value=t.value==null||t.value===''?'Résultat non renseigné':'Résultat : '+t.value+(t.unit?' '+t.unit:'');
   events.push({date:t.date,title:phase+' réalisé — '+t.name,detail:value+
     (t.context?' · '+t.context:'')});
  }
  return formerTimeline({...m,events});
 };
 const formerCyclePage=passportCyclePage;
 passportCyclePage=function(m){
  const html=formerCyclePage(m),next=(m.assessmentDates||[])
    .filter(p=>p.status==='planned'&&['initial','retest','cycle_end'].includes(p.phase))
    .sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));
  const section='<section class="akp-panel" style="margin-top:14px"><div class="akp-section-head">'+
   '<div><span class="akp-label">ÉVALUATIONS DU PARCOURS</span><h3>Tests, retests et bilans planifiés</h3></div>'+
   '<span class="akp-mini-status">'+next.length+' à venir / à traiter</span></div>'+
   '<div class="list">'+(next.length?next.slice(0,15).map(p=>
    '<div class="item row between" style="gap:9px"><div><strong>'+esc(phaseName[p.phase]||'Évaluation')+
    '</strong><div class="muted tiny">'+esc(p.title||'')+'</div></div>'+
    '<span class="status '+(toISO(p.due_date)<today()?'amber':'blue')+'">'+esc(fmtDate(p.due_date))+'</span></div>').join(''):
    '<p class="muted tiny">Aucune évaluation à venir enregistrée. Les tests réellement effectués apparaissent dans la Chronologie et la Progression.</p>')+
   '</div></section>';
  const pos=html.lastIndexOf('</div>');return pos===-1?html+section:html.slice(0,pos)+section+html.slice(pos);
 };
 function statusLabel(c){
  if(c.status==='completed')return 'Terminé';
  if(c.status==='cancelled')return 'Annulé';
  if(toISO(c.start_date)>today())return 'À venir';
  if(c.end_date&&toISO(c.end_date)<today())return 'Période écoulée';
  return c.end_date?'En cours':'À dater';
 }
 function cycleWidget(c,compact=false){
  const cycles=rawCycles(c.id);
  const chosen=cycles.find(x=>x.id===c.cycle?._id)||cycles[0]||null;
  const none='<p class="muted tiny">Aucun cycle enregistré.</p>';
  const title=chosen?.title||'Cycle à définir';
  const actions='<div class="akMinutesActions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'+
   (chosen?'<button class="btn primary small akCycleEdit" data-id="'+esc(chosen.id)+'">Modifier ce cycle</button>':'')+
   '<button class="btn ghost small akCycleNew">+ Nouveau cycle</button>'+
   '<button class="btn ghost small akCyclePassport">Voir la chronologie</button></div>';
  const overview='<div class="row between" style="align-items:start;gap:10px"><div><h3 style="margin:0">'+
   esc(title)+'</h3><p class="muted tiny" style="margin-top:7px">'+
   (chosen?esc(fmtDate(chosen.start_date))+' → '+(chosen.end_date?esc(fmtDate(chosen.end_date)):'Date de fin à définir')+
    ' · '+esc(statusLabel(chosen)):'Crée ton premier cycle')+'</p></div>'+
   '<span class="status blue">'+cycles.length+' cycle(s)</span></div>'+actions;
  if(compact){
   // Vue compacte du Passeport : chaque cycle doit être visible et modifiable,
   // pas seulement le cycle sélectionné pour les statistiques courantes.
   const priority=cy=>{
    const status=statusLabel(cy);
    return status==='En cours'?0:status==='À venir'?1:status==='À dater'?2:3;
   };
   const ordered=cycles.slice().sort((a,b)=>
    priority(a)-priority(b)||
    (priority(a)===3?String(b.start_date).localeCompare(String(a.start_date)):
     String(a.start_date).localeCompare(String(b.start_date))));
   const entries=ordered.map(cy=>{
    const label=statusLabel(cy);
    const tone=label==='En cours'||label==='Terminé'?'green':
      label==='Période écoulée'?'amber':'blue';
    return '<div class="row between" style="gap:13px;align-items:center;flex-wrap:wrap;'+
     'padding:13px 15px;border:1px solid #e1e7ee;border-radius:12px;background:#fbfcfe">'+
     '<div style="flex:1;min-width:210px"><div class="row" style="gap:9px;align-items:center;flex-wrap:wrap">'+
     '<strong>'+esc(cy.title||'Cycle sans titre')+'</strong>'+
     '<span class="status '+tone+'">'+esc(label)+'</span></div>'+
     '<div class="muted tiny" style="margin-top:6px">'+esc(fmtDate(cy.start_date))+' → '+
     (cy.end_date?esc(fmtDate(cy.end_date)):'Date de fin à définir')+'</div>'+
     (cy.priorities?'<div class="muted tiny" style="margin-top:5px">Priorités : '+
        esc(String(cy.priorities).slice(0,150))+'</div>':'')+
     '</div><button class="btn ghost small akCycleEdit" data-id="'+esc(cy.id)+'">Modifier</button></div>';
   }).join('');
   return '<div class="card panel no-print" style="margin-bottom:12px">'+
    '<div class="row between" style="gap:10px;align-items:center;flex-wrap:wrap">'+
    '<div><div class="section-title" style="margin:0">Gestion des cycles</div>'+
    '<p class="muted tiny" style="margin:6px 0 0">Tous les cycles enregistrés pour ce client.</p></div>'+
    '<span class="status blue">'+cycles.length+' cycle(s)</span></div>'+
    '<div style="display:grid;gap:9px;margin-top:13px">'+(entries||none)+'</div>'+
    '<div class="akMinutesActions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:13px">'+
    '<button class="btn primary small akCycleNew">+ Nouveau cycle</button>'+
    '<button class="btn ghost small akCyclePassport">Voir la chronologie</button></div></div>';
  }
  const history=cycles.map(cy=>
    '<div class="item row between" style="gap:9px;flex-wrap:wrap"><div><strong>'+esc(cy.title)+'</strong>'+
    '<div class="muted tiny">'+esc(fmtDate(cy.start_date))+' → '+(cy.end_date?esc(fmtDate(cy.end_date)):'Fin à définir')+
    ' · '+esc(statusLabel(cy))+'</div>'+
    (cy.priorities?'<div class="muted tiny">Priorités : '+esc(cy.priorities.slice(0,180))+'</div>':'')+
    '</div><button class="btn ghost small akCycleEdit" data-id="'+esc(cy.id)+'">Modifier</button></div>'
  ).join('');
  return '<div class="section-title" style="margin-top:0">Cycles d’accompagnement</div>'+overview+
   '<div style="margin-top:16px"><strong>Historique et prochains cycles</strong><div class="list" style="margin-top:9px">'+
   (history||none)+'</div></div>'+
   '<p class="muted tiny" style="margin-top:10px">Les cycles terminés restent visibles dans le Passeport. Les séances demeurent dans Optitrainer.</p>'+
   (c.cycle?.optitrainer?'<button class="btn ghost small" id="openOpti">Ouvrir Optitrainer</button>':'');
 }
 const formerFollow=follow;
 follow=function(c){
  const dom=document.createElement('div');dom.innerHTML=formerFollow(c);
  const panel=dom.querySelector('.grid2 > div > .card.panel');
  if(panel&&panel.textContent.includes('Cycle actuel'))panel.innerHTML=cycleWidget(c);
  return dom.innerHTML;
 };
 const formerOverview=overview;
 overview=function(c){
  const dom=document.createElement('div');dom.innerHTML=formerOverview(c);
  const panel=dom.querySelector('.coach-overview-stats > .card.panel');
  if(panel)panel.insertAdjacentHTML('beforeend',
    '<div style="margin-top:8px"><button class="btn ghost small akCycleEdit" data-id="'+esc(c.cycle?._id||'')+
    '">Gérer les cycles</button></div>');
  return dom.innerHTML;
 };
 const formerPassport=passport;
 passport=function(c){return cycleWidget(c,true)+formerPassport(c)};
 function openCycle(c,id=''){
  const cycles=rawCycles(c.id),record=cycles.find(x=>x.id===id);
  const last=cycles.slice().sort((a,b)=>String(b.end_date||b.start_date).localeCompare(String(a.end_date||a.start_date)))[0];
  const start=record?toISO(record.start_date):last?.end_date?plusDay(last.end_date):c.start||today();
  const end=toISO(record?.end_date);
  const status=record?.status||'planned';
  modal((record?'Modifier':'Planifier')+' un cycle — '+esc(c.name),
   '<div class="alert blue tiny">Les dates et les objectifs apparaîtront dans le Passeport. Enregistrer le cycle ne signifie pas qu’un retest a été réalisé.</div>'+
   '<div class="field"><label>Nom du cycle</label><input class="input" id="akCycleTitle" maxlength="160" value="'+esc(record?.title||'')+
    '" placeholder="Ex. Développement de la force maximale"></div>'+
   '<div class="grid2"><div class="field"><label>Date de début</label><input id="akCycleStart" type="date" class="input" value="'+esc(start)+'"></div>'+
   '<div class="field"><label>Date de fin prévue / effective</label><input id="akCycleEnd" type="date" class="input" value="'+esc(end)+'"></div></div>'+
   '<div class="field"><label>État du cycle</label><select class="select" id="akCycleStatus">'+
    [['planned','À venir / planifié'],['active','En cours'],['completed','Terminé']].map(([key,label])=>
     '<option value="'+key+'" '+(status===key?'selected':'')+'>'+label+'</option>').join('')+'</select></div>'+
   '<div class="field"><label>Objectifs et priorités</label><textarea id="akCyclePriorities" class="textarea" rows="3" maxlength="6000">'+esc(record?.priorities||'')+'</textarea></div>'+
   '<div class="field"><label>Points de vigilance</label><textarea id="akCycleVigilance" class="textarea" rows="3" maxlength="6000">'+esc(record?.vigilance||'')+'</textarea></div>'+
   '<div class="field"><label>Bilan / constat final (facultatif)</label><textarea id="akCycleOutcome" class="textarea" rows="3" maxlength="6000">'+esc(record?.outcome_summary||'')+'</textarea></div>'+
   '<p class="muted tiny">Les cycles précédents ne sont jamais effacés lors de la création d’un nouveau. Les échéances de bilan non clôturées sont recalées si tu changes la date de fin.</p>',
   '<button class="btn ghost" id="akCycleCancel">Annuler</button><button class="btn primary" id="akCycleSave">Enregistrer le cycle</button>');
  document.getElementById('akCycleCancel').onclick=closeModal;
  document.getElementById('akCycleSave').onclick=async()=>{
   const get=id=>document.getElementById(id).value.trim();
   const title=get('akCycleTitle'),begin=get('akCycleStart'),finish=get('akCycleEnd');
   const stateValue=get('akCycleStatus');
   if(title.length<3||title.length>160||!/^\d{4}-\d{2}-\d{2}$/.test(begin)||
     !/^\d{4}-\d{2}-\d{2}$/.test(finish)||finish<begin)return alert('Renseigne un intitulé et des dates cohérentes (fin après début).');
   if(stateValue==='completed'&&finish>today())return alert('Tu ne peux pas clôturer comme terminé un cycle dont la date de fin est future.');
   const others=cycles.filter(x=>x.id!==record?.id&&x.end_date&&
      begin<=toISO(x.end_date)&&finish>=toISO(x.start_date)&&x.status!=='cancelled');
   if(others.length&&!confirm('Ce cycle chevauche '+others.length+' autre(s) cycle(s). Enregistrer malgré tout ?'))return;
   const data={client_id:c.id,title,start_date:begin,end_date:finish,status:stateValue,
    priorities:get('akCyclePriorities')||null,vigilance:get('akCycleVigilance')||null,
    outcome_summary:get('akCycleOutcome')||null};
   const button=document.getElementById('akCycleSave');button.disabled=true;
   try{
    const request=record?supa.from('cycles').update(data).eq('id',record.id).eq('client_id',c.id):
      supa.from('cycles').insert({...data,created_by:authUser.id});
    const {error}=await request;
    if(error)throw Error(error.message);
    if(authProfile?.role==='owner'){
     const result=await supa.rpc('owner_plan_assessments',{p_client_id:c.id});
     if(result.error)console.warn('Synchronisation des évaluations :',result.error.message);
    }
    closeModal();await loadSupabaseData();render();toast(record?'Cycle mis à jour.':'Nouveau cycle créé.');
   }catch(e){button.disabled=false;alert('Impossible d’enregistrer le cycle : '+e.message);}
  };
 }
 document.addEventListener('click',e=>{
  const action=e.target.closest?.('.akCycleEdit,.akCycleNew,.akCyclePassport');
  if(!action)return;
  e.preventDefault();e.stopImmediatePropagation();
  const c=currentClient();if(!c||!['owner','coach'].includes(authProfile?.role))return;
  if(action.classList.contains('akCyclePassport')){state.tab='passport';render();return;}
  if(c.archivedAt)return alert('Restaure le dossier avant de modifier ses cycles.');
  if(action.classList.contains('akCycleNew'))return openCycle(c);
  const id=action.dataset.id||c.cycle?._id||'';
  return openCycle(c,id);
 },true);
 window.AKP_CYCLES_READY=true;
})();