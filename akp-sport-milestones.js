/* AK PRIME — Calendrier sportif du cycle : retests, compétitions et vigilance modifiable.
 * Dates planifiées distinctes des résultats ; aucun événement administratif dans ce panneau.
 */
(function(){
 'use strict';
 const css=document.createElement('style');
 css.textContent=[
 '.akSportMilestones{margin-top:18px;border-top:1px solid #e7ebef;padding-top:17px}',
 '.akSportHeading{display:flex;justify-content:space-between;align-items:flex-start;gap:11px;flex-wrap:wrap;margin:0 0 13px}',
 '.akSportHeading>div .akp-label{display:block;margin-bottom:6px}',
 '.akSportHeading h4{font-size:16px;color:#1a3147;font-weight:850;margin:0 0 6px}',
 '.akSportHeading p{font-size:11px;color:#72859a;line-height:1.5;margin:0}',
 '.akSportAdd,.akSportEdit{border:1px solid #d8c6a6;border-radius:8px;background:#fff9ec;color:#946728;cursor:pointer;padding:8px 10px;font-size:11px;font-weight:800;white-space:nowrap}',
 '.akSportAdd:hover,.akSportEdit:hover{background:#f6eddb}',
 '.akSportRows{display:grid;gap:8px}',
 '.akSportRow{display:grid;grid-template-columns:48px minmax(91px,.8fr) minmax(0,1.7fr) minmax(72px,.5fr) auto;align-items:center;gap:10px;border:1px solid #e2e8ee;background:#fbfcfd;border-radius:10px;padding:11px}',
 '.akSportWeek{font-size:15px;color:#a67732;font-weight:900;text-align:center}',
 '.akSportRow .akSportDate{font-size:11px;color:#607589;font-weight:700}',
 '.akSportRow .akSportContent strong{font-size:12px;color:#172e43;display:block;line-height:1.4;overflow-wrap:anywhere}',
 '.akSportRow .akSportContent span{font-size:10px;color:#79899c;display:block;margin:3px 0 0;overflow-wrap:anywhere;line-height:1.5}',
 '.akSportRow .akSportType{font-size:9px;color:#28617a;background:#e9f5f9;padding:5px 8px;border-radius:6px;font-weight:850;text-align:center}',
 '.akSportRow.competition .akSportType{color:#8f6331;background:#faf0dd}',
 '.akSportRow.past{opacity:.74}',
 '.akSportRow .akSportEdit{padding:5px 8px;font-size:10px}',
 '.akSportEmpty{color:#728397;background:#f7f9fb;border:1px dashed #d9e0e8;border-radius:9px;padding:13px;font-size:12px;line-height:1.6}',
 '.akSportTips{font-size:11px;line-height:1.6;color:#7a8b9d;margin-top:11px}',
 '.akSportNext{background:#fff;border:1px solid #e0e7ee;border-radius:12px;padding:18px}',
 '.akSportNext>span{font-size:9px;font-weight:850;letter-spacing:.1em;color:#a27a48;display:block;margin:0 0 12px}',
 '.akSportNextItem{border-top:1px solid #eef1f4;padding-top:11px;margin-top:11px}',
 '.akSportNextItem:first-of-type{border-top:0;padding-top:0;margin-top:0}',
 '.akSportNextItem small{color:#7b8b9b;font-size:10px;font-weight:800;text-transform:uppercase}',
 '.akSportNextItem strong{display:block;color:#1f354a;font-size:13px;margin:5px 0;line-height:1.4;overflow-wrap:anywhere}',
 '.akSportNextItem div{color:#62768a;font-size:11px}',
 '.akSportVigilanceNote{font-size:11px;line-height:1.5;color:#76899b;margin-top:9px}',
 '.akSportVigilanceButtons{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}',
 '.akSportVigilanceButtons button{cursor:pointer;font-size:11px;font-weight:850;border:1px solid #dbe2e8;border-radius:8px;background:white;padding:8px 10px;color:#40566b}',
 '.akSportVigilanceButtons button.akSportClear{color:#975b32;border-color:#e7d4c2;background:#fff9f1}',
 '.akSportBadge{background:#f9edda;color:#8b672f;border-radius:7px;padding:5px 8px;font-size:10px;font-weight:850}',
 '@media(max-width:720px){.akSportRow{grid-template-columns:42px 1fr auto;gap:7px}.akSportRow .akSportDate{grid-column:2}.akSportRow .akSportContent{grid-column:2}.akSportRow .akSportType{grid-column:3;grid-row:1}.akSportRow .akSportEdit{grid-row:3;grid-column:3}}',
 '@media print{.akSportAdd,.akSportEdit,.akSportVigilanceButtons{display:none!important}}'
 ].join('\n');document.head.appendChild(css);
 const iso=v=>String(v||'').slice(0,10);
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const delta=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
 const startOf=m=>iso(m.cycle?.start);
 const endOf=m=>iso(m.cycle?.end);
 const isCoach=m=>m.akPassportRole==='coach'&&['owner','coach'].includes(authProfile?.role);
 const eventDate=e=>iso(e.date||e.event_date);
 const eventType=e=>e.eventType||e.event_type||'';
 const competition=e=>eventType(e)==='competition'||/\b(competition|championnat|match|tournoi|coupe|finale|meeting|course|epreuve|open|grand prix)\b/.test(norm(e.title));
 const testEvent=e=>/retest|re-test|evaluation|évaluation/i.test((e.title||'')+' '+(e.detail||''));
 function weekFor(m,d){
  const s=startOf(m);if(!s||!d)return null;
  const n=delta(d,s);return Number.isFinite(n)&&n>=0?Math.floor(n/7)+1:null;
 }
 function within(m,d){
  const begin=startOf(m),end=endOf(m);
  return !!d&&(!begin||d>=begin)&&(!end||d<=end);
 }
 function sources(m){
  const list=[];
  const assessments=(m.assessmentDates||[]).filter(p=>p.status==='planned'&&
    (p.phase==='retest'||p.phase==='cycle_end')&&within(m,iso(p.due_date)));
  for(const p of assessments){
   list.push({id:p.id||'',date:iso(p.due_date),type:p.phase==='retest'?'retest':'bilan',
    title:p.title|| (p.phase==='retest'?'Retest':'Bilan de fin de cycle'),
    detail:p.phase==='retest'?'Évaluation planifiée':'Bilan de cycle programmé',source:'assessment'});
  }
  const competitions=m.akSportEvents||m.events||[];
  for(const e of competitions){
   const d=eventDate(e);if(!within(m,d))continue;
   if(competition(e))list.push({id:e.id||'',date:d,type:'competition',title:e.title||'Compétition',
      detail:e.detail||'',source:'competition'});
   else if(testEvent(e)&&!list.some(p=>p.type==='retest'&&p.date===d))
     list.push({id:e.id||'',date:d,type:'retest',title:e.title||'Retest',detail:e.detail||'',source:'legacy'});
  }
  const seen=new Set();
  return list.filter(row=>{
   const key=[row.type,row.date,norm(row.title)].join('|');
   if(seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>a.date.localeCompare(b.date)||
   ({competition:0,retest:1,bilan:2}[a.type]-({competition:0,retest:1,bilan:2}[b.type])));
 }
 function milestoneMarkup(m){
  const data=sources(m),now=localDateISO();
  const rows=data.map(e=>{
   const w=weekFor(m,e.date),category=e.type==='competition'?'Compétition':e.type==='bilan'?'Bilan':'Retest';
   return '<div class="akSportRow '+(e.type==='competition'?'competition ':'')+(e.date<now?'past':'')+'">'+
    '<div class="akSportWeek">'+(w?'S'+w:'—')+'</div>'+
    '<div class="akSportDate">'+fmtDate(e.date)+'</div>'+
    '<div class="akSportContent"><strong>'+esc(e.title)+'</strong>'+
      (e.detail?'<span>'+esc(e.detail)+'</span>':'')+'</div>'+
    '<div class="akSportType">'+category+'</div>'+
    (isCoach(m)&&e.source==='competition'&&e.id?
      '<button type="button" class="akSportEdit" data-id="'+esc(e.id)+'">Modifier</button>':'')+
    '</div>';
  }).join('');
  return '<div class="akSportMilestones">'+
    '<div class="akSportHeading"><div><span class="akp-label">CALENDRIER SPORTIF DU CYCLE</span>'+
     '<h4>Compétitions & évaluations clés</h4>'+
     '<p>Chaque jalon est situé dans sa semaine de cycle, de S1 à la fin du cycle.</p></div>'+
     (isCoach(m)?'<button type="button" class="akSportAdd">+ Compétition importante</button>':'')+'</div>'+
    (rows?'<div class="akSportRows">'+rows+'</div>':
     '<div class="akSportEmpty">Aucune compétition ou évaluation programmée sur ce cycle. '+
      'Ajoute une compétition importante ou planifie un retest depuis les évaluations.</div>')+
    '<p class="akSportTips">Les renouvellements administratifs ne figurent plus dans ce calendrier. '+
     'Les retests proviennent des évaluations planifiées ; aucune mesure n’est considérée comme réalisée avant sa saisie.</p></div>';
 }
 function quickNext(m){
  const future=sources(m).filter(e=>e.date>=localDateISO());
  const competition=future.find(e=>e.type==='competition'),retest=future.find(e=>e.type==='retest');
  const data=[['Prochain retest',retest],['Prochaine compétition',competition]];
  return '<section class="akSportNext"><span>ÉCHÉANCES SPORTIVES</span>'+
   data.map(([label,e])=>
    '<div class="akSportNextItem"><small>'+label+'</small>'+
    '<strong>'+ (e?esc(e.title):'À planifier')+'</strong>'+
    '<div>'+(e?fmtDate(e.date)+' · S'+weekFor(m,e.date):
       'Aucune date enregistrée')+'</div></div>').join('')+'</section>';
 }
 function caution(m){
  const v=String(m.cycle?.vigilance||'').trim(),cycleId=m.cycle?.id||m.cycle?._id||'';
  const values=v.split(/[;\n]+/).map(x=>x.trim()).filter(Boolean);
  return '<section class="akp-panel warning"><span class="akp-label">VIGILANCE DU CYCLE</span>'+
   '<div class="akp-vigilance-list">'+(values.length?
     values.map(x=>'<div><i>!</i><span>'+esc(x)+'</span></div>').join(''):
     '<p>Aucune vigilance active renseignée sur ce cycle.</p>')+'</div>'+
   '<p class="akSportVigilanceNote">Ces points sont saisis par le coach dans le cycle en cours. '+
   'Ils restent visibles tant qu’ils ne sont pas modifiés ou levés ; ils ne sont pas des alertes automatiques.</p>'+
   (isCoach(m)&&cycleId?'<div class="akSportVigilanceButtons">'+
     '<button type="button" class="akCycleEdit" data-id="'+esc(cycleId)+'">Modifier la vigilance</button>'+
     (values.length?'<button type="button" class="akSportClear" data-id="'+esc(cycleId)+'">Lever la vigilance</button>':'')+
     '</div>':'')+'</section>';
 }
 function populatePage(m){
  const original=originalCycle(m);
  const root=document.createElement('div');root.innerHTML=original;
  // Conserver la frise du cycle, mais remplacer les jalons administratifs.
  const milestones=root.querySelector('.akp-cycle-milestones');
  if(milestones)milestones.outerHTML=milestoneMarkup(m);
  const aside=root.querySelector('.akp-cycle-side');
  if(aside){
   // Priorités déjà dans Gestion des cycles ; prochaine étape détaillée dans le calendrier.
   aside.innerHTML=quickNext(m)+caution(m);
  }
  // L'ancien tableau générique d'évaluations faisait double emploi avec les jalons datés.
  root.querySelectorAll('.akp-panel').forEach(panel=>{
    if(panel.textContent.includes('Tests, retests et bilans planifiés'))panel.remove();
  });
  return root.innerHTML;
 }
 const origCoach=passportModelFromCoach;
 passportModelFromCoach=function(c){
  const m=origCoach(c);
  m.akSportEvents=(c.events||[]).map(x=>({...x,eventType:x.eventType||''}));
  m.akPassportRole='coach';return m;
 };
 const origClient=passportModelFromClient;
 passportModelFromClient=function(s){
  const m=origClient(s);
  m.akSportEvents=(s.events||[]).map(x=>({...x,eventType:x.event_type||x.eventType||''}));
  m.akPassportRole='client';return m;
 };
 const originalCycle=passportCyclePage;
 passportCyclePage=function(m){return populatePage(m);};
 function findClient(){return currentClient();}
 function openCompetition(c,id=''){
  const data=(c.events||[]).find(x=>x.id===id);
  const date=iso(data?.date)||iso(c.cycle?.start)||localDateISO();
  modal(data?'Modifier une compétition':'Ajouter une compétition importante',
   '<p class="muted tiny">Ajoute les matchs ou compétitions importants pour la planification. '+
   'L’événement apparaîtra dans la semaine correspondante du cycle et dans le Passeport.</p>'+
   '<div class="field"><label>Date de compétition</label>'+
   '<input type="date" id="akSportCompDate" class="input" value="'+esc(date)+'"></div>'+
   '<div class="field"><label>Compétition / événement</label>'+
   '<input id="akSportCompTitle" class="input" maxlength="160" placeholder="Ex. Championnat de France" value="'+esc(data?.title||'')+'"></div>'+
   '<div class="field"><label>Enjeu / précision (facultatif)</label>'+
   '<textarea id="akSportCompDetail" class="textarea" rows="3" maxlength="1500">'+esc(data?.detail||'')+'</textarea></div>'+
   '<p class="muted tiny">Pour les retests, utilise la planification des évaluations : leurs dates apparaissent automatiquement ici.</p>',
   '<button class="btn ghost" id="akSportCompCancel">Annuler</button>'+
   (data?'<button class="btn ghost" id="akSportCompDelete" style="color:#9d4433">Supprimer</button>':'')+
   '<button class="btn primary" id="akSportCompSave">Enregistrer</button>');
  document.getElementById('akSportCompCancel').onclick=closeModal;
  const deletion=document.getElementById('akSportCompDelete');
  if(deletion)deletion.onclick=async()=>{
   if(!confirm('Supprimer définitivement cette compétition du calendrier et de la chronologie ?'))return;
   deletion.disabled=true;
   const {error}=await supa.from('passport_events').delete().eq('id',data.id).eq('client_id',c.id);
   if(error){deletion.disabled=false;alert('Suppression impossible : '+error.message);return;}
   closeModal();await loadSupabaseData();render();toast('Compétition supprimée.');
  };
  document.getElementById('akSportCompSave').onclick=async()=>{
   const date=iso(document.getElementById('akSportCompDate').value);
   const title=document.getElementById('akSportCompTitle').value.trim();
   const detail=document.getElementById('akSportCompDetail').value.trim();
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||title.length<3)return alert('Indique une date et un nom de compétition.');
   if(c.cycle?.start&&date<iso(c.cycle.start)||c.cycle?.end&&date>iso(c.cycle.end))
    if(!confirm('Cette date est hors du cycle actuel. La compétition restera enregistrée mais ne sera pas affichée dans ce cycle. Continuer ?'))return;
   const button=document.getElementById('akSportCompSave');button.disabled=true;
   const dataRow={client_id:c.id,event_date:date,event_type:'competition',title,detail:detail||null,client_visible:true};
   const req=data?supa.from('passport_events').update(dataRow).eq('id',data.id).eq('client_id',c.id):
    supa.from('passport_events').insert(dataRow);
   const {error}=await req;
   if(error){button.disabled=false;alert('Impossible d’enregistrer : '+error.message);return;}
   closeModal();await loadSupabaseData();render();
   toast('Compétition enregistrée dans le calendrier sportif.');
  };
 }
 // Capture pour traiter ces actions avant les handlers génériques de dossiers.
 document.addEventListener('click',async e=>{
  const add=e.target.closest?.('.akSportAdd,.akSportEdit,.akSportClear');if(!add)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!['owner','coach'].includes(authProfile?.role))return;
  const c=findClient();if(!c||c.archivedAt)return;
  if(add.classList.contains('akSportAdd'))return openCompetition(c);
  if(add.classList.contains('akSportEdit'))return openCompetition(c,add.dataset.id||'');
  if(add.classList.contains('akSportClear')){
    const id=add.dataset.id||'';if(!id)return;
    const record=(db.akAllCycles||[]).find(x=>x.id===id&&x.client_id===c.id);
    const old=record?.vigilance||c.cycle?.vigilance||'';
    if(!old.trim())return;
    if(!confirm('Lever la vigilance « '+old.slice(0,130)+' » pour ce cycle ? Les antécédents du profil sportif restent conservés.'))return;
    add.disabled=true;
    const {error}=await supa.from('cycles').update({vigilance:null}).eq('id',id).eq('client_id',c.id);
    if(error){add.disabled=false;alert('Modification impossible : '+error.message);return;}
    await loadSupabaseData();render();toast('Vigilance levée pour ce cycle.');
  }
 },true);
 window.AKP_SPORT_MILESTONES_READY=true;
})();