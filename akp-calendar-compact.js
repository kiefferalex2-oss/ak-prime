/* AK PRIME — Calendrier du coach compact, scalable sur 30+ clients par jour.
 * Les sections historiques, leurs champs et identifiants sont conservés intacts.
 * Aucune modification des réservations ni des politiques métier.
 */
(function(){
 'use strict';
 const style=document.createElement('style');
 style.textContent=[
 '.akCalV2{display:grid;gap:13px;color:#193047}',
 '.akCalV2Head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}',
 '.akCalV2Head h1{margin:0 0 4px;font-size:clamp(23px,2.8vw,30px);letter-spacing:-.035em}',
 '.akCalV2Head p{margin:0;color:#788a9d;font-size:12px;line-height:1.55}',
 '.akCalV2Panel{border:1px solid #e0e7ed;border-radius:14px;background:#fff;padding:17px 19px;box-shadow:0 7px 22px rgba(20,43,62,.035)}',
 '.akCalV2Toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px}',
 '.akCalV2Toolbar h2{margin:0;font-size:17px;color:#19334a}',
 '.akCalV2Toolbar small{display:block;margin-top:4px;font-size:11px;color:#8090a2}',
 '.akCalV2Nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
 '.akCalV2Nav button{border:1px solid #dce5eb;background:#fff;color:#23405a;border-radius:8px;font-weight:800;cursor:pointer;padding:7px 10px;font-size:12px}',
 '.akCalV2Nav button:hover{background:#f4f8fb}',
 '.akCalV2WeekLabels,.akCalV2Days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}',
 '.akCalV2WeekLabels{margin:0 0 7px;text-align:center;color:#74879a;font-size:11px;font-weight:850}',
 '.akCalV2Day{min-height:65px;background:#f9fbfc;border:1px solid #e2e9ee;border-radius:10px;padding:9px 7px;text-align:left;color:#294258;cursor:pointer;min-width:0;position:relative;transition:background .12s,border-color .12s}',
 '.akCalV2Day:hover{background:#eef5f9;border-color:#aec7d8}',
 '.akCalV2Day.selected{border:2px solid #bd8a46;background:#fdf8ef;padding:8px 6px}',
 '.akCalV2Day.today .akCalV2Num{color:#9a6833}',
 '.akCalV2Day.hasEvents .akCalV2Count{background:#e7f0f5;color:#315c78}',
 '.akCalV2Num{display:block;font-size:12px;font-weight:900}',
 '.akCalV2Count{display:inline-block;padding:3px 6px;margin-top:8px;font-size:10px;font-weight:800;color:#a4b0b9;border-radius:5px}',
 '.akCalV2Day.selected .akCalV2Count{background:#efd7b4;color:#83572d}',
 '.akCalV2Day.inactive{opacity:.58}',
 '.akCalV2Summary{margin-top:12px;color:#8493a1;font-size:11px;line-height:1.5}',
 '.akCalV2Chosen{border-top:1px solid #e8edf1;margin-top:15px;padding-top:15px}',
 '.akCalV2ChosenTitle{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
 '.akCalV2ChosenTitle strong{font-size:14px;font-weight:850;color:#203b52}',
 '.akCalV2ChosenTitle span{font-size:11px;color:#8091a0}',
 '.akCalV2Group{border:1px solid #e1e8ee;border-radius:9px;overflow:hidden;margin-top:8px;background:#fff}',
 '.akCalV2Group>summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;padding:11px 12px;font-size:12px;font-weight:850;color:#28455d;background:#f9fafb}',
 '.akCalV2Group>summary::-webkit-details-marker{display:none}',
 '.akCalV2Group>summary .akCalV2Pill{font-size:10px;background:#e6eef3;color:#42667f;border-radius:6px;padding:3px 7px}',
 '.akCalV2Group>summary .akCalV2Chevron{margin-left:auto;color:#a47a43}',
 '.akCalV2Event{display:grid;grid-template-columns:minmax(110px,.32fr) minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border-top:1px solid #edf1f4;font-size:12px}',
 '.akCalV2Event>strong{color:#183248;overflow-wrap:anywhere}',
 '.akCalV2Event>span{color:#6f8191;overflow-wrap:anywhere}',
 '.akCalV2Event button{background:#fff;border:1px solid #dbe5ea;border-radius:7px;padding:6px 9px;cursor:pointer;font-size:11px;font-weight:850;color:#946d38}',
 '.akCalV2Event button:hover{background:#fff9f1}',
 '.akCalV2More{margin:0 10px 8px;border:1px solid #e5edf2;border-radius:8px}',
 '.akCalV2More>summary{padding:9px 12px;cursor:pointer;font-size:11px;font-weight:800;color:#906634}',
 '.akCalV2More .akCalV2Event{padding-left:12px;padding-right:12px}',
 '.akCalV2Empty{color:#8193a1;font-size:12px;padding:13px 2px}',
 '.akCalV2Acc{border:1px solid #dfe7ed;border-radius:12px;background:#fff;overflow:hidden}',
 '.akCalV2Acc>summary{padding:15px 18px;display:flex;align-items:center;gap:12px;cursor:pointer;list-style:none}',
 '.akCalV2Acc>summary::-webkit-details-marker{display:none}',
 '.akCalV2AccTitle{font-weight:850;font-size:13px;color:#1a344a;flex:1}',
 '.akCalV2AccMeta{font-size:11px;color:#8091a1}',
 '.akCalV2AccArrow{font-size:15px;color:#bd904d;transition:transform .13s}',
 '.akCalV2Acc[open] .akCalV2AccArrow{transform:rotate(180deg)}',
 '.akCalV2AccBody{border-top:1px solid #e7eef3;padding:14px 16px}',
 '.akCalV2AccBody>.card.panel{margin:0!important;border:0!important;box-shadow:none!important;padding:0!important}',
 '.akCalV2AccBody>.card.panel>.row:first-child h3{font-size:15px}',
 '.akCalV2AccBody .grid2{grid-template-columns:repeat(2,minmax(0,1fr))}',
 '.akCalV2AccBody .card.panel{max-width:none}',
 '@media(max-width:720px){.akCalV2Panel{padding:13px}.akCalV2Day{min-height:58px;padding:7px 4px}.akCalV2Day.selected{padding:6px 3px}.akCalV2Days,.akCalV2WeekLabels{gap:4px}.akCalV2Count{font-size:9px;margin-top:6px;padding:3px}.akCalV2Event{grid-template-columns:1fr auto;gap:3px 8px}.akCalV2Event>strong{grid-column:1}.akCalV2Event>span{grid-column:1;grid-row:2}.akCalV2Event button{grid-column:2;grid-row:1/3}.akCalV2Acc>summary{padding:12px}.akCalV2AccMeta{display:none}.akCalV2AccBody{padding:10px}}',
 '@media(prefers-reduced-motion:reduce){.akCalV2Day,.akCalV2AccArrow{transition:none}}'
 ].join('\n');document.head.appendChild(style);
 const openSections=new Map();
 let weekOffset=0,chosen='',panelClient='',selectedEvent='',initialised=false;
 const toIso=x=>String(x||'').slice(0,10);
 const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00Z');if(!Number.isFinite(d.getTime()))return '';d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const dateToday=()=>localDateISO();
 const monday=date=>{const d=new Date(date+'T12:00:00Z'),offset=(d.getUTCDay()+6)%7;return addDays(date,-offset)};
 const formatDate=iso=>fmtDate(iso);
 const safe=x=>esc(String(x==null?'':x));
 function eventList(){
  const clients=(db.clients||[]).filter(c=>!c.archivedAt&&!['Inactif'].includes(c.status));
  const byId=new Map(clients.map(c=>[c.id,c])),events=[];
  const add=(obj)=>{
   if(!obj.date||!byId.has(obj.clientId))return;
   const client=byId.get(obj.clientId);
   events.push({...obj,clientName:client.name||'Client',clientId:client.id});
  };
  (db.assessmentPlans||[]).filter(p=>p.status==='planned').forEach(p=>
   add({date:toIso(p.due_date),group:'Évaluation',label:p.title||'Évaluation prévue',
    info:'Évaluation planifiée · '+(p.phase||'À préciser'),clientId:p.client_id,
    key:'assessment-'+p.id,tab:'passport',passportPage:'cycle'}));
  for(const c of clients){
   if(c.end)add({date:toIso(c.end),group:'Engagement',label:'Fin d’engagement / renouvellement',
     info:'Consulter le renouvellement du dossier administratif',clientId:c.id,
     key:'engagement-'+c.id,tab:'admin'});
   (c.events||[]).forEach((ev,j)=>{
    if(ev.date)add({date:toIso(ev.date),group:'Jalon',label:ev.title||'Jalon sportif',
     info:ev.detail||ev.description||'Étape du parcours du sportif',clientId:c.id,
     key:'jalon-'+c.id+'-'+(ev.id||j)+'-'+toIso(ev.date),tab:'passport',passportPage:'timeline'});
   });
  }
  (db.appointments||[]).filter(a=>['scheduled','confirmed'].includes(a.status)).forEach(a=>{
   const date=a.starts_at?new Intl.DateTimeFormat('sv-SE',{
    timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'
   }).format(new Date(a.starts_at)):'';
   add({date,group:'Visio',label:'Visio '+fmtDateTime(a.starts_at),
    info:'Rendez-vous réservé',clientId:a.client_id,key:'visio-'+a.id,tab:'visio_notes'});
  });
  (db.visioTasks||[]).filter(t=>t.status==='todo').forEach(t=>
   add({date:toIso(t.due_date),group:'Action',label:t.title||'Action de suivi',
    info:t.details||t.description||'Action à préparer',clientId:t.client_id,
    key:'task-'+t.id,tab:'visio_notes'}));
  const order={'Évaluation':0,'Visio':1,'Action':2,'Jalon':3,'Engagement':4};
  return events.sort((a,b)=>a.date.localeCompare(b.date)||(order[a.group]??9)-(order[b.group]??9)||
   a.clientName.localeCompare(b.clientName,'fr'));
 }
 function row(ev){
  return '<div class="akCalV2Event"><strong>'+safe(ev.clientName)+'</strong><span>'+safe(ev.label)+'</span>'+
   '<button type="button" class="akCalV2Inspect" data-key="'+safe(ev.key)+'">Détails</button></div>';
 }
 function groupedDay(dayEvents){
  if(!dayEvents.length)return '<p class="akCalV2Empty">Aucun événement pour cette date.</p>';
  const groups=['Évaluation','Visio','Action','Jalon','Engagement'];
  return groups.filter(g=>dayEvents.some(e=>e.group===g)).map(g=>{
   const items=dayEvents.filter(e=>e.group===g),first=items.slice(0,5),other=items.slice(5);
   return '<details class="akCalV2Group" '+(items.length<=5?'open':'')+'><summary>'+
    safe(g)+' <span class="akCalV2Pill">'+items.length+'</span>'+
    '<span class="akCalV2Chevron">⌄</span></summary>'+
    first.map(row).join('')+
    (other.length?'<details class="akCalV2More"><summary>Afficher '+other.length+' autre'+(other.length>1?'s':'')+
       ' événement'+(other.length>1?'s':'')+' ↓</summary>'+other.map(row).join('')+'</details>':'')+
    '</details>';
  }).join('');
 }
 function agenda(events){
  const today=dateToday(),start=addDays(monday(today),weekOffset*7);
  const days=Array.from({length:21},(_,i)=>addDays(start,i));
  if(!chosen||chosen<start||chosen>days[20]||!initialised){chosen=(today>=start&&today<=days[20])?today:days[0];initialised=true;}
  const byDate=new Map();
  for(const ev of events){
   if(!byDate.has(ev.date))byDate.set(ev.date,[]);
   byDate.get(ev.date).push(ev);
  }
  const dayEvents=byDate.get(chosen)||[],total=days.reduce((n,d)=>n+(byDate.get(d)||[]).length,0);
  const overdue=events.filter(e=>e.group==='Évaluation'&&e.date<today);
  const labels=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const weeks=Array.from({length:3},(_,week)=>
   '<div class="akCalV2Days" '+(week?'style="margin-top:7px"':'')+'>'+
    days.slice(week*7,(week+1)*7).map(day=>{
      const count=(byDate.get(day)||[]).length;
      const num=Number(day.slice(-2)),month=day.slice(5,7);
      const label=num===1||day===days[0]?num+'/'+month:String(num);
      return '<button type="button" data-day="'+day+'" class="akCalV2Day'+
       (day===chosen?' selected':'')+(day===today?' today':'')+(count?' hasEvents':'')+
       '" aria-label="'+safe(formatDate(day))+' : '+count+' événement'+(count!==1?'s':'')+
       '" aria-pressed="'+(day===chosen?'true':'false')+'"><span class="akCalV2Num">'+
       safe(label)+'</span><span class="akCalV2Count">'+(count?count+' événement'+(count>1?'s':''):'—')+
       '</span></button>';
    }).join('')+'</div>').join('');
  const groups=groupedDay(dayEvents);
  return '<section class="akCalV2Panel"><div class="akCalV2Toolbar"><div><h2>Agenda des clients</h2>'+
   '<small>Trois semaines · un seul compteur par jour, quel que soit le nombre de clients</small></div>'+
   '<div class="akCalV2Nav"><button type="button" data-ak-cal-nav="-3" title="Trois semaines précédentes" aria-label="Trois semaines précédentes">«</button>'+
   '<button type="button" data-ak-cal-nav="0">Aujourd’hui</button>'+
   '<button type="button" data-ak-cal-nav="3" title="Trois semaines suivantes" aria-label="Trois semaines suivantes">»</button></div></div>'+
   '<div class="akCalV2WeekLabels">'+labels.map(l=>'<span>'+l+'</span>').join('')+'</div>'+weeks+
   '<div class="akCalV2Summary">'+total+' événement'+(total!==1?'s':'')+
   ' sur la période · '+formatDate(days[0])+' → '+formatDate(days[20])+
   (overdue.length?' · '+overdue.length+' évaluation'+(overdue.length!==1?'s':'')+' en retard':'')+
   '</div>'+
   '<div class="akCalV2Chosen"><div class="akCalV2ChosenTitle"><strong>'+safe(formatDate(chosen))+
    '</strong><span>'+dayEvents.length+' événement'+(dayEvents.length!==1?'s':'')+'</span></div>'+
   groups+'</div></section>';
 }
 function collapsible(node,label,meta,index,clientId){
  const holder=document.createElement('details');holder.className='akCalV2Acc';
  const key=label+'-'+index;holder.dataset.akCalSection=key;
  holder.open=openSections.get(key)===true;
  const summary=document.createElement('summary');
  summary.innerHTML='<span class="akCalV2AccTitle">'+safe(label)+'</span>'+
   '<span class="akCalV2AccMeta">'+safe(meta||'')+'</span>'+
   '<span class="akCalV2AccArrow" aria-hidden="true">⌄</span>';
  const body=document.createElement('div');body.className='akCalV2AccBody';
  body.appendChild(node);
  holder.append(summary,body);
  return holder;
 }
 function olderSections(){
  // Génère les panneaux existants via le code original. Tous les boutons et leurs IDs
  // restent identiques et continuent d'être câblés par render().
  const legacy=document.createElement('div');
  legacy.innerHTML=originalCalendar();
  const out=document.createElement('div');
  const topNodes=[...legacy.children];let n=0;
  for(const node of topNodes){
    const title=(node.querySelector('h3')?.textContent||'').trim();
    if(node.matches('.page-title'))continue; // remplacé par l'en-tête compact
    if(title==='Calendrier des échéances clients')continue; // ancien grand calendrier supprimé
    if(node.matches('.card.panel')){
      const map={
       'Actions à préparer':['Actions de suivi','Échéances et tâches issues des visios'],
       'Planning des 3 prochaines semaines':['Disponibilités par date','Créneaux précis pour les 21 prochains jours'],
       'Planning hebdomadaire habituel':['Horaires habituels','Disponibilités récurrentes']
      };
      const desc=map[title]||[title||'Autres informations','Détails et actions'];
      out.appendChild(collapsible(node,desc[0],desc[1],++n));continue;
    }
    if(node.matches('.grid2')){
      const cards=[...node.children].filter(e=>e.matches('.card.panel'));
      if(cards.length===node.children.length&&cards.length){
        cards.forEach(card=>{
          const h=(card.querySelector('h3')?.textContent||'').trim();
          const names={
           'Indisponibilités ponctuelles':'Absences et indisponibilités',
           'Rendez-vous à venir':'Visios réservées',
           'Visios à clôturer':'Visios à clôturer',
           'Historique des visios':'Historique des visios'
          };
          out.appendChild(collapsible(card,names[h]||h||'Gestion des créneaux',
           h==='Rendez-vous à venir'?'Annulation et dossier client':
           h==='Visios à clôturer'?'Marquer réalisée ou absent':
           h==='Historique des visios'?'Rendez-vous passés':'Périodes bloquées et exceptions',++n));
        });
        continue;
      }
    }
    // Des modules supplémentaires peuvent étendre le calendrier :
    // conserver leurs éléments plutôt que risquer de les perdre.
    out.appendChild(collapsible(node,title||'Informations complémentaires','Consulter le détail',++n));
  }
  return out.innerHTML;
 }
 const originalCalendar=calendarPage;
 calendarPage=function(){
  const active=eventList(),now=dateToday();
  const result='<div class="akCalV2"><div class="akCalV2Head"><div><h1>Calendrier & disponibilités</h1>'+
   '<p>Échéances clients, visios, jalons et gestion des créneaux, sans surcharge visuelle.</p></div>'+
   '<button class="btn primary" id="addException">Bloquer une période / un créneau</button></div>'+
   agenda(active)+olderSections()+'</div>';
  // L'ancien écran des disponibilités avait déjà un bouton #addException.
  // Il a été supprimé avec l'ancien en-tête, afin d'éviter les doublons.
  return result;
 };
 function getEvent(key){return eventList().find(e=>e.key===key)}
 function openDetails(event){
  const hint={
   'Jalon':'Le jalon est un repère du parcours. Le Passeport permet de consulter sa chronologie.',
   'Évaluation':'Cette évaluation est planifiée. Son résultat n’est pas encore enregistré.',
   'Visio':'Rendez-vous planifié. Les notes sont disponibles dans le suivi du dossier.',
   'Engagement':'Échéance contractuelle. Consulter l’onglet Administratif pour le renouvellement.',
   'Action':'Action de suivi enregistrée après un échange avec le client.'
  }[event.group]||'';
  const go={
   Jalon:'Voir la chronologie du client',
   'Évaluation':'Voir le cycle du client',
   Visio:'Voir les notes de visio',
   Engagement:'Ouvrir son administratif',
   Action:'Voir les actions de suivi'
  }[event.group]||'Ouvrir le dossier';
  modal(event.group+' — '+safe(event.clientName),
   '<div class="muted tiny">'+safe(formatDate(event.date))+'</div>'+
   '<div style="font-size:17px;font-weight:850;line-height:1.5;margin:12px 0 7px">'+safe(event.label)+'</div>'+
   '<p style="line-height:1.6;white-space:pre-wrap">'+safe(event.info||'')+'</p>'+
   '<div class="alert blue" style="margin-top:12px">'+safe(hint)+'</div>',
   '<button type="button" class="btn ghost" id="akCalDetailsClose">Fermer</button>'+
   '<button type="button" class="btn primary" id="akCalDetailsGo">'+safe(go)+'</button>');
  document.getElementById('akCalDetailsClose').onclick=closeModal;
  document.getElementById('akCalDetailsGo').onclick=()=>{
   closeModal();state.view='client';state.clientId=event.clientId;state.tab=event.tab||'overview';
   if(event.passportPage)passportBookPage=event.passportPage;
   render();
  };
 }
 document.addEventListener('click',e=>{
  const btn=e.target.closest?.('.akCalV2 [data-ak-cal-nav],.akCalV2 [data-day],.akCalV2 .akCalV2Inspect');
  if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(btn.hasAttribute('data-ak-cal-nav')){
    const delta=Number(btn.dataset.akCalNav);
    weekOffset=delta===0?0:weekOffset+delta;
    chosen='';
    render();return;
  }
  if(btn.hasAttribute('data-day')){
    chosen=btn.dataset.day;render();return;
  }
  const event=getEvent(btn.dataset.key);
  if(event)openDetails(event);
 },true);
 document.addEventListener('toggle',e=>{
  const section=e.target;
  if(!section?.matches?.('.akCalV2Acc'))return;
  openSections.set(section.dataset.akCalSection,section.open);
 },true);
 window.AKP_CALENDAR_COMPACT_READY=true;
})();