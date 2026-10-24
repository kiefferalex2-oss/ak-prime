/* AK PRIME : espace client complémentaire d'Optitrainer.
 * Objectifs macro publiés par le coach ; recommandations PDF facultatives.
 */
(function(){
 'use strict';
 const sleepEligible=c=>
   c?.current_pole==='Performance'&&c?.current_offer==='P3';
 const macroEligible=c=>(c?.current_pole==='Performance'&&c?.current_offer==='P3')||
   (c?.current_pole==='Forme & Santé'&&c?.current_offer==='Renforcé');
 const sleepDateValue=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const nextSleepDate=day=>new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const sleepWakeEntries=row=>Array.isArray(row?.awakenings)?row.awakenings:[];
 function sleepWakeSummary(row){
  if(row?.awakenings_count==null)return 'Réveils nocturnes : non renseignés';
  const n=Number(row.awakenings_count);
  const items=sleepWakeEntries(row).map(x=>safe(x.time)+(x.minutes==null?'':' ('+safe(x.minutes)+' min)'));
  return n+' réveil'+(n===1?'':'s')+' nocturne'+(n===1?'':'s')+(items.length?' · '+items.join(', '):'');
 }
 function awakeningFields(count,entries=[]){
  if(count===''||count===null||count===undefined)return '<div class="muted tiny" style="margin-top:7px">Sélectionne le nombre de réveils nocturnes, même si tu n’en as eu aucun.</div>';
  const n=Math.max(0,Math.min(12,Number(count)||0));
  if(!n)return '<div class="muted tiny" style="margin-top:7px">Aucun réveil signalé.</div>';
  return '<div class="akSleepWakeGrid">'+Array.from({length:n},(_,i)=>{
   const item=entries[i]||{};
   return '<div class="akSleepWakeItem akAwakeningEntry">'+
    '<div class="akSleepWakeNumber">Réveil '+(i+1)+'</div><div class="grid2">'+
    '<div class="field"><label>Heure du réveil</label><input type="time" class="input akWakeTime" required value="'+safe(String(item.time||'').slice(0,5))+'"></div>'+
    '<div class="field"><label>Temps éveillé (min, facultatif)</label><input type="number" class="input akWakeMinutes" min="0" max="180" step="1" placeholder="Ex. 10" value="'+safe(item.minutes??'')+'"></div>'+
    '</div></div>';
  }).join('')+'</div>';
 }
 function sleepInputs(day,record=null){
  const isEdit=!!record,n=record?.awakenings_count??'';
  return '<div id="akSleepEntryForm" class="akSleepEntryForm">'+
    (isEdit?'<div class="akSleepEditBanner"><strong>Correction du '+safe(fmtDate(day))+'</strong><button class="btn ghost small" type="button" id="akCancelSleepEdit">Annuler</button></div>':'')+
    '<div class="grid2">'+
    '<div class="field"><label for="akSleepDate">Date du réveil</label><input id="akSleepDate" type="date" class="input" readonly value="'+safe(day)+'"></div>'+
    '<div class="field"><label for="akSleepHours">Sommeil total (heures)</label><input id="akSleepHours" type="number" class="input" step="0.25" min="0.25" max="24" required placeholder="7.5" value="'+safe(record?.duration_hours??'')+'"></div>'+
    '<div class="field"><label for="akSleepBedtime">Heure du coucher</label><input id="akSleepBedtime" type="time" class="input" value="'+safe(String(record?.bedtime||'').slice(0,5))+'"></div>'+
    '<div class="field"><label for="akSleepWakeup">Heure du réveil</label><input id="akSleepWakeup" type="time" class="input" value="'+safe(String(record?.wakeup||'').slice(0,5))+'"></div>'+
    '<div class="field"><label for="akSleepQuality">Qualité ressentie</label><select id="akSleepQuality" class="select" required><option value="">Choisis une note</option>'+
    [1,2,3,4,5].map(i=>'<option value="'+i+'" '+(Number(record?.quality)===i?'selected':'')+'>'+i+' / 5</option>').join('')+'</select></div>'+
    '<div class="field"><label for="akSleepAwakeningsCount">Nombre de réveils intra-nocturnes</label><select id="akSleepAwakeningsCount" class="select">'+
    '<option value="" '+(n===''?'selected':'')+'>Sélectionne le nombre</option>'+ 
    Array.from({length:13},(_,i)=>'<option value="'+i+'" '+(n!==''&&Number(n)===i?'selected':'')+'>'+i+(i===0?' — aucun':'')+'</option>').join('')+
    '</select></div></div>'+
    '<div id="akSleepAwakeningFields" aria-live="polite">'+awakeningFields(n,sleepWakeEntries(record))+'</div>'+
    '<div class="field" style="margin-top:16px"><label for="akSleepNotes">Observations (facultatif)</label>'+
    '<textarea id="akSleepNotes" class="textarea" maxlength="1200" placeholder="Difficulté à te rendormir, stress, récupération…">'+safe(record?.notes||'')+'</textarea></div>'+
    '<button type="button" id="akSaveSleep" class="btn primary">'+(isEdit?'Enregistrer la correction':'Enregistrer ma nuit')+'</button>'+
    '</div>';
 }
 const safe=(v)=>esc(String(v??''));
 const oldEnterClientPortal=enterClientPortal;
 enterClientPortal=async function(...args){
   await oldEnterClientPortal.apply(this,args);
   const session=clientPortalState;
   if(!session?.client||!authUser||authProfile?.role!=='client')return;
   const relevant=sleepEligible(session.client);
   const results=await Promise.all([
     relevant?supa.from('client_sleep_diary').select('*').eq('client_id',session.client.id)
       .order('sleep_date',{ascending:false}).limit(90):
       Promise.resolve({data:[],error:null}),
     macroEligible(session.client)?supa.rpc('my_published_macro_budget'):
       Promise.resolve({data:null,error:null})
   ]);
   if(clientPortalState!==session)return;
   session.akSleepRows=results[0].data||[];
   session.akMacro=results[1].data||null;
   session.akExtrasError=results.find(x=>x.error)?.error?.message||'';
   renderClientPortal();
 };
 function sleepForm(s){
  if(!sleepEligible(s.client))return '';
  const rows=s.akSleepRows||[],today=sleepDateValue(),current=rows.find(x=>x.sleep_date===today);
  const editDay=s.akSleepEditingDate,editing=editDay?rows.find(x=>x.sleep_date===editDay):null;
  const completion=current?'<div class="akSleepCompleted" role="status">'+
    '<span class="akSleepCompletedIcon">✓</span><div><strong>Ta nuit est enregistrée pour aujourd’hui.</strong>'+
    '<p>'+safe(fmtDate(today))+' · '+safe(current.duration_hours)+' h · Qualité '+safe(current.quality)+'/5</p>'+
    '<p>'+sleepWakeSummary(current)+'</p>'+
    '<small>Le formulaire reviendra le '+safe(fmtDate(nextSleepDate(today)))+'. Pour corriger une saisie, utilise l’historique.</small></div></div>':
    (editing?'':'<div class="akSleepToday"><span>NUIT DU JOUR</span><strong>'+safe(fmtDate(today))+'</strong>'+
     '<small>Après l’enregistrement, le formulaire se ferme automatiquement.</small></div>');
  const form=editing?sleepInputs(editDay,editing):(current?'':sleepInputs(today));
  const history=rows.length?'<details class="akSleepHistory" '+(editing?'open':'')+'>'+
    '<summary>Historique des nuits <span>'+rows.length+' enregistrée'+(rows.length>1?'s':'')+'</span></summary>'+
    '<div class="list">'+rows.slice(0,30).map(x=>'<div class="item akSleepHistoryRow">'+
      '<div><strong>'+safe(fmtDate(x.sleep_date))+'</strong>'+
      '<div class="muted tiny">'+safe(x.duration_hours)+' h · Qualité '+safe(x.quality)+'/5</div>'+
      '<div class="muted tiny">'+sleepWakeSummary(x)+(x.notes?' · '+safe(x.notes):'')+'</div></div>'+
      '<button type="button" class="btn ghost small akEditSleep" data-date="'+safe(x.sleep_date)+'">Corriger</button></div>').join('')+
    '</div></details>':'';
  return '<section class="client-section-card akSleepCard" id="akSleepDiary" style="margin-top:13px">'+
    '<div class="row between akSleepHeader"><div><h3>Mon agenda de sommeil</h3>'+
    '<p class="muted tiny">Saisis la nuit correspondant à ta date de réveil. Ce journal est distinct du suivi Optitrainer.</p></div>'+
    '<span class="status blue">'+rows.length+' nuit(s)</span></div>'+
    completion+form+history+'</section>';
 }
 function macroPanel(s){
   if(!macroEligible(s.client))return '';
   const item=s.akMacro;
   if(!item)return '<div class="client-section-card" style="margin-top:13px"><h3>Mon budget macronutritionnel</h3>'+
     '<div class="muted tiny">Tes objectifs nutritionnels personnalisés apparaîtront ici lorsque ton coach les aura publiés.</div></div>';
   return '<div class="client-section-card" style="margin-top:13px"><h3>Mon budget macronutritionnel</h3>'+
     '<div class="muted tiny">'+safe(item.title||'Budget personnalisé')+' · '+safe(fmtDate(item.entry_date))+'</div>'+
     '<div class="client-summary-grid" style="margin:12px 0">'+
       [['kcal','Énergie','kcal / jour'],['protein','Protéines','g / jour'],
       ['carbs','Glucides','g / jour'],['fats','Lipides','g / jour']].map(([k,l,u])=>
         '<div class="client-summary-card"><div class="lab">'+l+'</div><div class="value">'+
         safe(item[k]??'—')+'</div><div class="sub">'+u+'</div></div>').join('')+'</div>'+
     (item.notes?'<div class="muted tiny" style="white-space:pre-wrap;margin:10px 0">'+safe(item.notes)+'</div>':'')+
     [['food_guidance','Mes recommandations alimentaires'],
       ['meal_timing','Mes apports autour des séances'],
       ['hydration','Hydratation et récupération']].filter(([k])=>String(item[k]||'').trim())
       .map(([k,label])=>'<section style="margin:14px 0;padding:13px 16px;background:#f7fafc;border:1px solid #e0e9ef;border-radius:10px">'+
         '<h4 style="margin:0 0 7px;color:#25445d">'+label+'</h4>'+
         '<div style="white-space:pre-wrap;line-height:1.65;font-size:13px">'+safe(item[k])+'</div></section>').join('')+
     (item.pdf_path?'<button class="btn ghost" id="akDownloadMacro">Consulter les recommandations alimentaires (PDF)</button>':'')+
     '<div class="muted tiny" style="margin-top:8px">Repères journaliers individualisés · communiqués par ton coach AK PRIME.</div></div>';
 }
 function trainingLinksCard(s){
   const c=s.client||{},cfg=s.appSettings||{};
   const opti=safeOptitrainerLink(c.optitrainer_url||'');
   const whatsAppNum=normalizeWhatsAppNumber(cfg.whatsapp_number||'');
   const msg=(cfg.whatsapp_default_message||'Bonjour Alex, je te contacte concernant mon accompagnement AK PRIME.')+
     ((c.first_name||'').trim()?'\n\n'+c.first_name.trim():'');
   const wa=whatsAppNum?whatsappUrl(cfg.whatsapp_number,msg):'';
   const optiCard=opti?
     '<a class="akTrainingService akTrainingServiceOpti" href="'+safe(opti)+'" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir Optitrainer dans un nouvel onglet">'+
       '<span class="akTrainingMark akTrainingMarkOpti" aria-hidden="true">O</span>'+
       '<span class="akTrainingServiceCopy"><strong>Optitrainer</strong><small>Programme, séances et suivi de charge</small></span>'+
       '<span class="akTrainingServiceAction">Ouvrir <span aria-hidden="true">↗</span></span></a>':
     '<div class="akTrainingService akTrainingServiceInactive"><span class="akTrainingMark akTrainingMarkOpti" aria-hidden="true">O</span>'+
       '<span class="akTrainingServiceCopy"><strong>Optitrainer</strong><small>Ton lien sera ajouté par ton coach</small></span>'+
       '<span class="akTrainingPending">À venir</span></div>';
   const waCard=wa?
     '<a class="akTrainingService akTrainingServiceWhatsApp" href="'+safe(wa)+'" target="_blank" rel="noopener noreferrer" aria-label="Contacter Alex sur WhatsApp dans un nouvel onglet">'+
       '<span class="akTrainingMark akTrainingMarkWhatsApp" aria-hidden="true">W</span>'+
       '<span class="akTrainingServiceCopy"><strong>WhatsApp</strong><small>Échanges avec Alex et analyses vidéo</small></span>'+
       '<span class="akTrainingServiceAction">Contacter <span aria-hidden="true">↗</span></span></a>':
     '<div class="akTrainingService akTrainingServiceInactive"><span class="akTrainingMark akTrainingMarkWhatsApp" aria-hidden="true">W</span>'+
       '<span class="akTrainingServiceCopy"><strong>WhatsApp</strong><small>Contact en cours de configuration</small></span>'+
       '<span class="akTrainingPending">À venir</span></div>';
   return '<section class="client-section-card akClientTrainingCard">'+
     '<div class="akTrainingHeader"><div><h3>Mon entraînement et mes échanges</h3>'+
     '<p>Retrouve ici ton programme et le contact avec ton coach.</p></div></div>'+
     '<div class="akTrainingServices">'+optiCard+waCard+'</div>'+
     '<p class="akTrainingFootnote">Les vidéos des mouvements sont envoyées sur WhatsApp, sans hébergement sur AK PRIME.</p>'+
     '</section>';
 }
 const oldClientSuivi=renderClientSuivi;
 renderClientSuivi=function(s){
   if(!s?.client)return oldClientSuivi(s);
   const mental=s.client.current_pole==='Mental';
   return '<div class="client-main akWowFollowPage"><div class="client-page-head"><div>'+
     '<h2>Ton accompagnement, à ton image.</h2>'+
     '<p>Des outils pensés pour ton objectif, avec un suivi humain à chaque étape.</p></div>'+
     '<span class="status blue">'+safe(s.client.current_offer||'Suivi personnalisé')+'</span></div>'+
     (mental?'<div class="client-section-card" style="margin-top:13px"><h3>Préparation mentale</h3>'+
       '<p class="muted tiny">Les exercices, routines et séances sont individualisés avec ton coach. '+
       'Les notes internes du coach ne sont pas visibles dans cet espace.</p></div>':'')+
     macroPanel(s)+sleepForm(s)+
     (s.akExtrasError?'<div class="alert" style="margin-top:12px">Certains outils sont temporairement indisponibles : '+safe(s.akExtrasError)+'</div>':'')+
     trainingLinksCard(s)+'</div>';
 };
 const originalClientHome=renderClientHome;
 renderClientHome=function(s){
   const wrapper=document.createElement('div');
   wrapper.innerHTML=originalClientHome(s);
   // Pas de formulaire de forme / check-in dupliqué : Optitrainer s'en charge.
   wrapper.querySelectorAll('.client-summary-card').forEach(item=>{
     const title=item.querySelector('.lab')?.textContent?.trim();
     if(title==='Bilan hebdo'||title==='Cycle actuel')item.remove();
   });
   wrapper.querySelectorAll('.client-action-card').forEach(item=>{
     if(item.querySelector('strong')?.textContent?.trim()==='Bilan hebdomadaire')item.remove();
   });
   wrapper.querySelectorAll('.section-title').forEach(header=>{
     if(header.textContent.trim()!=='À faire')return;
     const grid=header.nextElementSibling;
     if(grid?.classList.contains('grid2')&&!grid.querySelector('.client-action-card')){
       grid.remove();header.remove();
     }
   });
   return wrapper.innerHTML;
 };
 // Si la page reste ouverte après minuit, actualiser le formulaire pour
 // la nouvelle date de réveil (Europe/Paris), sans recharger le navigateur.
 if(!window.__akSleepDayTicker){
  let last=sleepDateValue();
  window.__akSleepDayTicker=setInterval(()=>{
   const now=sleepDateValue();
   if(now===last)return;
   last=now;
   const s=clientPortalState;
   if(s?.client&&sleepEligible(s.client)&&clientPortalView==='suivi'){
    s.akSleepEditingDate=null;renderClientPortal();
   }
  },60000);
 }
 document.addEventListener('change',event=>{
  if(event.target?.id!=='akSleepAwakeningsCount')return;
  const existing=Array.from(document.querySelectorAll('#akSleepAwakeningFields .akAwakeningEntry')).map(row=>{
   const min=row.querySelector('.akWakeMinutes')?.value??'';
   return {time:row.querySelector('.akWakeTime')?.value||'',minutes:min===''?null:Number(min)};
  });
  const target=document.getElementById('akSleepAwakeningFields');
  if(target)target.innerHTML=awakeningFields(event.target.value,existing);
 },true);
 document.addEventListener('click',async event=>{
  const s=clientPortalState,edit=event.target.closest?.('.akEditSleep');
  if(edit&&s){
   event.preventDefault();
   if(!sleepEligible(s.client))return;
   s.akSleepEditingDate=edit.dataset.date;
   renderClientPortal();
   document.getElementById('akSleepDiary')?.scrollIntoView({behavior:'smooth',block:'start'});
   return;
  }
  if(event.target.closest?.('#akCancelSleepEdit')&&s){
   event.preventDefault();s.akSleepEditingDate=null;renderClientPortal();return;
  }
  if(event.target.closest?.('#akDownloadMacro')){
   event.preventDefault();
   const path=s?.akMacro?.pdf_path;
   if(!path)return alert('Document non disponible pour le moment.');
   const target=window.open('about:blank','_blank');
   const {data,error}=await supa.storage.from('akprime-macro-pdfs').createSignedUrl(path,90);
   if(error||!data?.signedUrl){target?.close();return alert('Téléchargement impossible : '+(error?.message||'accès refusé'))}
   if(target)target.location.href=data.signedUrl;
   else{const a=document.createElement('a');a.href=data.signedUrl;a.target='_blank';a.rel='noopener';a.click()}
   return;
  }
  const button=event.target.closest?.('#akSaveSleep');
  if(!button)return;
  event.preventDefault();
  if(!s?.client||!sleepEligible(s.client))return alert('Agenda indisponible pour cette offre.');
  const val=id=>document.getElementById(id)?.value?.trim()||'';
  const day=val('akSleepDate'),hours=Number(val('akSleepHours')),quality=Number(val('akSleepQuality'));
  const bedtime=val('akSleepBedtime'),wakeup=val('akSleepWakeup'),notes=val('akSleepNotes');
  const today=sleepDateValue(),existing=(s.akSleepRows||[]).find(x=>x.sleep_date===day);
  const editing=s.akSleepEditingDate===day&&!!existing;
  if(day>today||(!editing&&day!==today))return alert('Le journal du jour s’ouvre à chaque nouvelle date de réveil.');
  if(!editing&&existing)return alert('Cette nuit est déjà enregistrée. Utilise l’historique pour la corriger.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(hours)||hours<=0||hours>24||
   !Number.isInteger(quality)||quality<1||quality>5)return alert('Date, durée et qualité du sommeil requises.');
  if(notes.length>1200)return alert('Observations trop longues.');
  const countRaw=val('akSleepAwakeningsCount');
  if(countRaw==='')return alert('Indique le nombre de réveils nocturnes, même si c’est zéro.');
  const count=Number(countRaw);
  if(!Number.isInteger(count)||count<0||count>12)return alert('Indique le nombre de réveils nocturnes, entre 0 et 12.');
  const awakeningRows=Array.from(document.querySelectorAll('#akSleepAwakeningFields .akAwakeningEntry'));
  if(awakeningRows.length!==count)return alert('Le détail des réveils est incomplet.');
  const awakenings=[];
  for(const row of awakeningRows){
   const time=row.querySelector('.akWakeTime')?.value||'';
   const duration=row.querySelector('.akWakeMinutes')?.value?.trim()??'';
   const minutes=duration===''?null:Number(duration);
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    return alert('Renseigne l’heure de chaque réveil intra-nocturne.');
   if(minutes!==null&&(!Number.isInteger(minutes)||minutes<0||minutes>180))
    return alert('La durée d’un réveil doit être comprise entre 0 et 180 minutes.');
   awakenings.push({time,minutes});
  }
  if(new Set(awakenings.map(a=>a.time)).size!==awakenings.length)
   return alert('Deux réveils ne peuvent pas avoir exactement le même horaire.');
  const payload={client_id:s.client.id,sleep_date:day,bedtime:bedtime||null,
    wakeup:wakeup||null,duration_hours:hours,quality,notes,
    awakenings_count:count,awakenings};
  button.disabled=true;
  try{
   const query=editing?supa.from('client_sleep_diary').update(payload).eq('id',existing.id).eq('client_id',s.client.id):
     supa.from('client_sleep_diary').insert(payload);
   const {data,error}=await query.select('*').single();
   if(error)throw error;
   s.akSleepRows=[data,...(s.akSleepRows||[]).filter(x=>x.sleep_date!==day)]
    .sort((a,b)=>String(b.sleep_date).localeCompare(String(a.sleep_date)));
   s.akSleepEditingDate=null;
   renderClientPortal();
   toast(editing?'La correction a été enregistrée.':'Ta nuit est enregistrée. À demain pour la suivante !');
  }catch(error){
   if(error?.code==='23505'){
    const {data}=await supa.from('client_sleep_diary').select('*').eq('client_id',s.client.id).eq('sleep_date',day).maybeSingle();
    if(data){
     s.akSleepRows=[data,...(s.akSleepRows||[]).filter(x=>x.sleep_date!==day)]
      .sort((a,b)=>String(b.sleep_date).localeCompare(String(a.sleep_date)));
     s.akSleepEditingDate=null;renderClientPortal();
    }
    alert('Cette nuit a déjà été enregistrée sur ton compte. Elle figure maintenant dans ton historique.');
   }else{
    alert('Impossible d’enregistrer cette nuit : '+(error?.message||String(error)));
    if(button.isConnected)button.disabled=false;
   }
  }
 },true);
 window.AKP_CLIENT_ESSENTIALS_READY=true;
})();
