/* AK PRIME — Première page du Passeport : portrait de l'athlète et référentiels.
 * Questionnaires = sources automatiques ; modifications coach indépendantes.
 * Suivi journalier et sRPE restent dans Optitrainer.
 */
(function(){
 'use strict';
 const empty={profile_overrides:{},reference_stats:{},weight_history:[],nutrition_history:[],sleep_reference:{}};
 const fields={
  practice:[
   ['birth_date','Date de naissance'],['sport','Sport / discipline'],['position','Poste / spécialité'],['level','Niveau'],['club','Club / structure'],
   ['height_cm','Taille (cm)'],['dominant_side','Latéralité / côté dominant'],
   ['training_experience','Expérience sportive'],['current_week','Semaine d’entraînement et matchs'],
   ['current_activity','Activité actuelle'],['previous_pp','Préparation physique antérieure'],
   ['recent_tests','Tests déjà réalisés'],['club_data','Données disponibles (GPS, VBT…)']
  ],
  goals:[
   ['main_goal','Objectif principal'],['goal_detail','Objectif détaillé'],['deadline','Échéance / compétition'],
   ['expectations','Attentes vis-à-vis du suivi']
  ],
  safety:[
   ['injury_history','Antécédents de blessures / opérations'],
   ['current_pain','Gênes ou limitations actuelles'],
   ['health_restrictions','Restrictions / recommandations connues']
  ],
  exercise:[
   ['liked_exercises','Exercices appréciés'],
   ['disliked_exercises','Exercices mal appréciés ou posant problème'],
   ['well_tolerated','Exercices et charges très bien tolérés (coach)'],
   ['poorly_tolerated','Exercices et charges mal tolérés (coach)'],
   ['technique_notes','Points techniques / adaptations utiles (coach)']
  ],
  life:[
   ['availability','Disponibilités'],['facilities','Matériel et installations'],
   ['training_place','Lieu de pratique'],['equipment','Matériel disponible'],
   ['life_constraints','Contraintes de vie'],['other_info','Autres éléments à connaître']
  ],
  mental:[
   ['birth_date','Date de naissance'],['context','Contexte de la préparation mentale'],['difficult_situations','Situations difficiles'],
   ['duration','Depuis quand'],['impact','Conséquences ressenties'],
   ['previous_mental_prep','Techniques déjà utilisées'],
   ['other_mental_aspects','Autres compétences à développer'],
   ['lack_confidence','Confiance'],['focus_difficulty','Attention / concentration'],
   ['stress_emotions','Stress et émotions'],['motivation_drop','Motivation'],
   ['health_professional','Suivi éventuel par un professionnel'],
   ['mental_tools','Routines et techniques efficaces (coach)']
  ]
 };
 const titles={practice:'Profil & pratique sportive',goals:'Objectifs & échéances',safety:'Antécédents, gênes & précautions',
  exercise:'Préférences, exercices & tolérance',life:'Organisation & environnement',mental:'Préparation mentale'};
 const styles=document.createElement('style');
 styles.textContent=[
  '.akProfHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px}',
  '.akProfHead h2{font-size:24px;margin:5px 0}.akProfGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px}',
  '.akProfPanel{background:#fff;border:1px solid #dfe5ed;border-radius:13px;padding:17px;min-width:0}',
  '.akProfPanel h3{font-size:15px;margin:0 0 12px}.akProfData{display:grid;gap:11px}',
  '.akProfData>div{border-bottom:1px solid #eff2f5;padding-bottom:9px;overflow-wrap:anywhere}',
  '.akProfData>div:last-child{border-bottom:0;padding-bottom:0}',
  '.akProfData label{font-size:11px;font-weight:750;display:block;color:#68778a;margin-bottom:5px}',
  '.akProfData strong{font-size:13px;white-space:pre-wrap;font-weight:650;line-height:1.55}',
  '.akProfMuted{font-size:12px;color:#78879a}.akProfPoints{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 14px}',
  '.akProfPoints>div{border:1px solid #dfe5ed;border-radius:12px;background:#fff;padding:13px}',
  '.akProfPoints small{display:block;color:#65768a;font-size:11px;margin-bottom:5px}',
  '.akProfPoints strong{font-size:17px;overflow-wrap:anywhere}',
  '.akProfHistory{display:grid;gap:7px;margin-top:12px}',
  '.akProfHistory>div{border:1px solid #edf0f4;border-radius:9px;padding:9px 11px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}',
  '.akProfButtons{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
  '.akProfEditGroup{border:1px solid #e0e6ed;border-radius:10px;margin-top:9px;padding:10px 13px}',
  '.akProfEditGroup summary{cursor:pointer;font-weight:800}',
  '.akProfEditFields{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}',
  '.akProfEditFields .field label{font-size:12px}.akProfEditFields .field textarea{min-height:75px}',
  '.akProfStatsIntro{font-size:12px;color:#6b7d8f;line-height:1.6}',
  '.akProfCardNote{font-size:12px;color:#64778b;margin-top:10px}',
  '@media(max-width:850px){.akProfGrid{grid-template-columns:1fr}.akProfPoints{grid-template-columns:1fr 1fr}}',
  '@media(max-width:590px){.akProfPoints,.akProfEditFields{grid-template-columns:1fr}}',
  '@media print{.akProfButtons{display:none!important}.akProfGrid{grid-template-columns:1fr 1fr}}'
 ].join('\n');
 document.head.appendChild(styles);
 const num=v=>v!==''&&v!=null&&Number.isFinite(Number(v))?Number(v):null;
 const text=v=>Array.isArray(v)?v.map(x=>String(x)).join(', '):v===true?'Oui':v===false?'Non':v==null?'':String(v).trim();
 const date=v=>v?String(v).slice(0,10):'';
 const cleanRows=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
 function rights(m){
  const pole=String(m.pole||'').toLowerCase(),offer=String(m.offer||'').toLowerCase();
  const physical=pole.includes('performance')||pole.includes('forme');
  const advanced=(pole.includes('performance')&&['p2','p3'].includes(offer))||(pole.includes('forme')&&offer==='renforcé');
  const nutrition=(pole.includes('performance')&&offer==='p3')||(pole.includes('forme')&&offer==='renforcé');
  return {physical,load:physical,hooper:advanced,weight:physical,nutrition,sleep:pole.includes('performance')&&offer==='p3',mental:pole.includes('mental')};
 }
 function groups(m){
  const r=rights(m);
  return r.mental?['goals','mental','life']:['practice','goals','safety','exercise','life'];
 }
 function rawAnswers(m){return m.akProfileAnswers||{};}
 function automatic(m,key){
  const q=rawAnswers(m);
  if(Object.prototype.hasOwnProperty.call(q,key)&&text(q[key]))return text(q[key]);
  const fallbacks={sport:m.sport,position:m.specialty,level:m.level,training_experience:q.training_experience};
  return text(fallbacks[key]);
 }
 function effective(m,key){
  const over=m.akPassportProfile?.profile_overrides||{};
  return Object.prototype.hasOwnProperty.call(over,key)?text(over[key]):automatic(m,key);
 }
 function stateFor(m){return {...empty,...(m.akPassportProfile||{})};}
 const display=v=>text(v)||'À renseigner';
 function line(label,value){
  const v=text(value);
  return v?'<div><label>'+esc(label)+'</label><strong>'+esc(v)+'</strong></div>':'';
 }
 function panel(name,items,custom=''){
  return '<section class="akProfPanel"><h3>'+esc(name)+'</h3>'+
   '<div class="akProfData">'+(items||'<p class="akProfMuted">Aucun élément renseigné.</p>')+'</div>'+
   custom+'</section>';
 }
 function statsCards(m){
  const r=rights(m),p=stateFor(m),ref=p.reference_stats||{};
  const weights=cleanRows(p.weight_history).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const base=[
   ['Discipline / contexte',effective(m,'sport')||effective(m,'context')||m.pole||'—'],
   ['Objectif principal',effective(m,'main_goal')||'À définir'],
   ['Dernier poids',r.weight&&weights.length?weights[0].kg+' kg':'Non renseigné']
  ];
  if(!r.weight)base.pop();
  if(effective(m,'birth_date'))base.push(['Date de naissance',effective(m,'birth_date')]);
  return '<div class="akProfPoints">'+base.map(([l,v])=>
   '<div><small>'+esc(l)+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div>';
 }
 function referenceBlock(m){
  const r=rights(m);if(!r.load)return '';
  const ref=stateFor(m).reference_stats||{};
  const c=[];
  c.push(['Charge hebdomadaire moyenne',num(ref.weekly_load)==null?'Non renseignée':ref.weekly_load+' UA']);
  if(r.hooper)c.push(['Hooper moyen',num(ref.hooper_mean)==null?'Non renseigné':ref.hooper_mean+' / 28']);
  let period=ref.period_start||ref.period_end?'Période : '+(ref.period_start?fmtDate(ref.period_start):'—')+
   ' → '+(ref.period_end?fmtDate(ref.period_end):'—'):'Aucune période de référence encore renseignée';
  return panel('Références de charge & état de forme',
   c.map(([label,v])=>line(label,v)).join('')+line('Période',period)+line('Source',ref.source||'Non précisée')+
   line('Précisions',ref.notes||''),'<p class="akProfCardNote">Moyennes de référence saisies par le coach depuis ses relevés. '+
   'Pas de synchronisation automatique avec Optitrainer.</p>'+editButton(m,'metrics','Modifier les références'));
 }
 function editButton(m,action,label,more=''){
  if(m.akPassportRole!=='coach')return '';
  return '<div class="akProfButtons"><button class="btn ghost small akProfAction" data-action="'+action+
   '" '+more+'>'+esc(label)+'</button></div>';
 }
 function weightBlock(m){
  if(!rights(m).weight)return '';
  const rows=cleanRows(stateFor(m).weight_history).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const latest=rows[0],first=rows[rows.length-1];
  const delta=latest&&first&&num(latest.kg)!=null&&num(first.kg)!=null&&rows.length>1?
   Math.round((Number(latest.kg)-Number(first.kg))*100)/100:null;
  // Ne pas inventer une composition corporelle à partir du poids seul.
  const measurements=x=>[
   num(x.kg)!=null?x.kg+' kg':'',
   num(x.fat_pct)!=null?'Masse grasse : '+x.fat_pct+' %':'',
   num(x.lean_kg)!=null?'Masse maigre : '+x.lean_kg+' kg':''
  ].filter(Boolean).join(' · ');
  const history=rows.slice(0,10).map(x=>
   '<div><span><strong>'+esc(fmtDate(x.date))+'</strong> · '+esc(measurements(x))+
   (x.notes?' <span class="akProfMuted">'+esc(x.notes)+'</span>':'')+'</span>'+
   (m.akPassportRole==='coach'?'<button class="link akProfAction" data-action="weight" data-date="'+esc(x.date)+'">Modifier</button>':'')+
   '</div>').join('');
  return panel('Poids & composition corporelle',
    (latest?line('Dernière mesure',measurements(latest)+' · '+fmtDate(latest.date)):'')+
    (delta!==null?line('Évolution du poids depuis la première mesure',(delta>0?'+':'')+delta+' kg'):'')+
    (rows.length?'<details style="margin-top:8px"><summary style="cursor:pointer">Historique des mesures ('+rows.length+')</summary>'+
      '<div class="akProfHistory">'+history+'</div></details>':'<p class="akProfMuted">Aucune mesure enregistrée.</p>'),
    '<p class="akProfCardNote">Le poids est obligatoire ; masse grasse et masse maigre sont facultatives et ne sont jamais estimées automatiquement.</p>'+
    editButton(m,'weight','+ Ajouter une mesure'));
 }
 function macroSource(m){
  if(m.akPassportMacro)return m.akPassportMacro;
  return null;
 }
 function nutritionBlock(m){
  if(!rights(m).nutrition)return '';
  const rows=cleanRows(stateFor(m).nutrition_history).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const macro=macroSource(m),detail=macro?.details||macro||{};
  const known=(k)=>num(detail[k])!=null?detail[k]:'—';
  const published=macro&&[detail.kcal,detail.protein,detail.carbs,detail.fats].some(x=>num(x)!=null);
  const last=rows[0];
  let entry='';
  if(published)entry+=line('Budget macro de référence',
   known('kcal')+' kcal · P '+known('protein')+' g · G '+known('carbs')+' g · L '+known('fats')+' g');
  if(last)entry+=line('Dernier point nutritionnel',fmtDate(last.date)+' · '+
   [last.kcal&&last.kcal+' kcal',last.protein&&'P '+last.protein+' g',last.carbs&&'G '+last.carbs+' g',
   last.fats&&'L '+last.fats+' g'].filter(Boolean).join(' · '))+line('Observation',last.notes);
  let log=rows.length?'<details style="margin-top:8px"><summary style="cursor:pointer">Historique nutrition ('+
   rows.length+')</summary><div class="akProfHistory">'+rows.slice(0,10).map(x=>
   '<div><span><b>'+fmtDate(x.date)+'</b> · '+esc(x.notes||[x.kcal&&x.kcal+' kcal',
   x.protein&&'P '+x.protein+' g'].filter(Boolean).join(' · ')||'Point nutritionnel')+'</span>'+
   (m.akPassportRole==='coach'?'<button class="link akProfAction" data-action="nutrition" data-date="'+esc(x.date)+'">Modifier</button>':'')+
   '</div>').join('')+'</div></details>':'';
  return panel('Nutrition & repères personnalisés',entry||'<p class="akProfMuted">Aucun repère nutritionnel publié.</p>',
   log+'<p class="akProfCardNote">Synthèses et repères, sans menus détaillés. Le budget macro publié est repris automatiquement.</p>'+
   editButton(m,'nutrition','+ Point nutritionnel'));
 }
 function sleepBlock(m){
  if(!rights(m).sleep)return '';
  const rows=cleanRows(m.akPassportSleep).slice().sort((a,b)=>String(b.sleep_date).localeCompare(String(a.sleep_date)));
  const cutoff=new Date();cutoff.setUTCDate(cutoff.getUTCDate()-30);
  const cutoffISO=cutoff.toISOString().slice(0,10);
  const recent=rows.filter(x=>x.sleep_date>=cutoffISO&&num(x.duration_hours)!=null);
  const hours=recent.length?(recent.reduce((sum,x)=>sum+Number(x.duration_hours),0)/recent.length).toFixed(1):'';
  const ratings=recent.map(x=>num(x.quality)).filter(x=>x!=null);
  const quality=ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1):'';
  const saved=stateFor(m).sleep_reference||{};
  const ref=hours||saved.hours||'';
  const rating=quality||saved.quality||'';
  return panel('Sommeil & récupération',
   line('Durée moyenne sur 30 jours',ref?ref+' h':'')+
   line('Qualité moyenne',rating?rating+' / 5':'')+
   line('Nuits enregistrées sur 30 jours',recent.length?recent.length+' nuits':'')+
   line('Contexte et observations',saved.notes)+
   (ref?'':'<p class="akProfMuted">Aucun relevé de sommeil enregistré pour le moment.</p>'),
   '<p class="akProfCardNote">'+(recent.length?'Moyennes calculées automatiquement à partir du journal de sommeil AK PRIME.':
   'Tu peux renseigner une valeur de référence manuelle en l’absence de nuits saisies.')+'</p>'+
   editButton(m,'sleep','Référence / observations sommeil'));
 }
 function otherQuestionnaire(m){
  const q=rawAnswers(m),exclude=new Set(['full_name','birth_date','email','phone','legal_guardian','consent']);
  const listed=new Set(groups(m).flatMap(x=>fields[x].map(r=>r[0])));
  const rows=Object.entries(q).filter(([k,v])=>!exclude.has(k)&&!listed.has(k)&&text(v));
  if(!rows.length)return '';
  return '<details class="akProfPanel" style="margin-top:13px"><summary style="cursor:pointer;font-weight:750">'+
   'Autres réponses du questionnaire initial ('+rows.length+')</summary>'+
   '<div class="akProfData" style="margin-top:13px">'+rows.map(([k,v])=>
   line((typeof questionLabel==='function'?questionLabel(k):k),v)).join('')+'</div></details>';
 }
 function athletePage(m){
  const r=rights(m),g=groups(m),all=stateFor(m).profile_overrides||{};
  const header='<div class="akProfHead"><div><span class="akp-label">IDENTITÉ & PROFIL</span>'+
   '<h2>Fiche de l’athlète</h2><p class="akProfStatsIntro">Réponses initiales reprises automatiquement et complétées par le coach. '+
   'Les observations restent datées lorsque nécessaire. Aucun diagnostic médical n’est déduit des réponses.</p></div>'+
   (m.akPassportRole==='coach'?'<button class="btn primary small akProfAction" data-action="profile">Modifier / compléter la fiche</button>':'')+
   '</div>';
  const cards=g.map(group=>{
   const rows=fields[group].map(([k,l])=>line(l,effective(m,k))).filter(Boolean).join('');
   return panel(titles[group],rows);
  }).join('');
  const full='<div class="akProfGrid">'+cards+'</div>'+otherQuestionnaire(m);
  const p=header+statsCards(m)+full;
  const related=r.physical?'<div class="akProfGrid" style="margin-top:13px">'+
   referenceBlock(m)+weightBlock(m)+nutritionBlock(m)+sleepBlock(m)+'</div>':'';
  return '<div class="akp-page akProfPage">'+p+related+'</div>';
 }
 // La fiche sportive prime sur les courbes dans la première page,
 // tandis que la vue d'ensemble historique reste accessible en seconde partie.
 // La progression a désormais sa propre synthèse dans l'onglet Sommaire.
 // Le Profil sportif conserve uniquement la fiche et les historiques du sportif.
 passportOverviewPage=function(m){return athletePage(m);};
 function attachCoachModel(c,m){
  const row=(db.akPassportProfileRows||[]).find(x=>x.client_id===c.id);
  m.akPassportProfile=row||empty;
  m.akProfileAnswers=c.questionnaire||{};
  m.akPassportRole='coach';
  m.akPassportSleep=(db.akPassportSleepRows||[]).filter(x=>x.client_id===c.id);
  m.akPassportMacro=(db.offerEntries||[]).filter(x=>x.client_id===c.id&&x.tool_type==='macro_budget'&&
   !x.archived_at&&x.client_visible).sort((a,b)=>String(b.entry_date).localeCompare(String(a.entry_date)))[0]||null;
  return m;
 }
 const priorCoachModel=passportModelFromCoach;
 passportModelFromCoach=function(c){return attachCoachModel(c,priorCoachModel(c));};
 const priorClientModel=passportModelFromClient;
 passportModelFromClient=function(s){
  const m=priorClientModel(s);
  m.akPassportProfile=s.akPassportProfile||empty;
  m.akProfileAnswers=s.response?.answers||{};
  m.akPassportRole='client';
  m.akPassportSleep=s.akSleepRows||[];
  m.akPassportMacro=s.akMacro||null;
  return m;
 };
 const loadOld=loadSupabaseData;
 loadSupabaseData=async function(...args){
  const ret=await loadOld.apply(this,args);
  if(!authUser?.id||!['owner','coach'].includes(authProfile?.role))return ret;
  const [prof,sleep]=await Promise.all([
   supa.from('client_passport_profiles').select('*').limit(2000),
   supa.from('client_sleep_diary').select('client_id,sleep_date,duration_hours,quality,notes,bedtime,wakeup,awakenings_count,awakenings')
    .order('sleep_date',{ascending:false}).limit(3000)
  ]);
  if(prof.error)throw Error('Passeport — chargement du profil : '+prof.error.message);
  db.akPassportProfileRows=prof.data||[];
  db.akPassportSleepRows=sleep.error?[]:sleep.data||[];
  if(sleep.error)console.warn('Sommeil non chargé :',sleep.error.message);
  return ret;
 };
 const enterOld=enterClientPortal;
 enterClientPortal=async function(...args){
  await enterOld.apply(this,args);
  const session=clientPortalState;
  if(!session?.client||authProfile?.role!=='client')return;
  const {data,error}=await supa.from('client_passport_profiles').select('*')
   .eq('client_id',session.client.id).maybeSingle();
  if(clientPortalState!==session)return;
  if(error)console.warn('Profil Passeport non disponible :',error.message);
  session.akPassportProfile=data||empty;
  renderClientPortal();
 };
 function modalBase(title,content,onSave){
  modal(title,content,
   '<button class="btn ghost" id="akProfCancel">Annuler</button>'+
   '<button class="btn primary" id="akProfSave">Enregistrer</button>');
  document.getElementById('akProfCancel').onclick=closeModal;
  document.getElementById('akProfSave').onclick=onSave;
 }
 function currentCoach(){const c=currentClient();return c&&authProfile&&['owner','coach'].includes(authProfile.role)?c:null;}
 function profileFor(c){
  return (db.akPassportProfileRows||[]).find(p=>p.client_id===c.id)||{...empty,client_id:c.id};
 }
 async function persist(c,changes){
  const saved=profileFor(c);
  const data={client_id:c.id,profile_overrides:saved.profile_overrides||{},
    reference_stats:saved.reference_stats||{},weight_history:cleanRows(saved.weight_history),
    nutrition_history:cleanRows(saved.nutrition_history),sleep_reference:saved.sleep_reference||{},
    ...changes,updated_at:new Date().toISOString(),updated_by:authUser.id};
  const {error}=await supa.from('client_passport_profiles').upsert(data,{onConflict:'client_id'});
  if(error)throw Error(error.message);
  const index=(db.akPassportProfileRows||[]).findIndex(p=>p.client_id===c.id);
  if(index<0){db.akPassportProfileRows=db.akPassportProfileRows||[];db.akPassportProfileRows.push(data);}
  else db.akPassportProfileRows[index]=data;
  closeModal();render();toast('Passeport mis à jour.');
 }
 function saveForm(c,make){
  const b=document.getElementById('akProfSave');b.disabled=true;
  Promise.resolve().then(make).then(data=>persist(c,data)).catch(e=>{b.disabled=false;alert('Enregistrement impossible : '+e.message)});
 }
 function profileEdit(c){
  const model=attachCoachModel(c,passportModelFromCoach(c)),base=profileFor(c);
  const sections=groups(model).map((g,index)=>
   '<details class="akProfEditGroup" '+(index===0?'open':'')+'><summary>'+esc(titles[g])+'</summary>'+
   '<div class="akProfEditFields">'+fields[g].map(([k,label])=>{
    const value=effective(model,k),auto=automatic(model,k);
    return '<div class="field"><label>'+esc(label)+
     (Object.prototype.hasOwnProperty.call(base.profile_overrides||{},k)?' · Modifié par coach':'')+'</label>'+
     '<textarea class="textarea akProfText" data-key="'+esc(k)+'" maxlength="3500" rows="3">'+esc(value)+'</textarea>'+
     (auto?'<div class="muted tiny">Questionnaire : '+esc(auto.slice(0,155))+(auto.length>155?'…':'')+'</div>':
       '<div class="muted tiny">À compléter lors des échanges</div>')+'</div>';
   }).join('')+'</div></details>').join('');
  modalBase('Fiche sportive — '+esc(c.name),
   '<p class="muted tiny">Les réponses du questionnaire sont proposées automatiquement. Corrige-les ou enrichis-les ; '+
   'tes modifications restent prioritaires lors des prochains chargements.</p>'+sections+
   '<p class="muted tiny">Pour restaurer la valeur automatique d’un champ, remets exactement la réponse du questionnaire indiquée sous ce champ.</p>',
   ()=>saveForm(c,()=>{
    const overrides={...(base.profile_overrides||{})};
    document.querySelectorAll('.akProfText').forEach(el=>{
     const key=el.dataset.key,value=el.value.trim(),automaticValue=automatic(model,key);
     if(value===automaticValue)delete overrides[key];
     else overrides[key]=value;
    });
    return {profile_overrides:overrides};
   }));
 }
 function val(id){return document.getElementById(id)?.value.trim()||'';}
 function input(id,label,kind='text',value='',hint=''){
  const numinput=kind==='number',formKind=numinput?'type="number" step="0.1" min="0"':kind==='date'?'type="date"':'type="text"';
  return '<div class="field"><label>'+esc(label)+'</label><input class="input" id="'+id+'" '+formKind+
   ' value="'+esc(value??'')+'" '+(numinput?'max="30000"':'maxlength="550"')+'>'+
   (hint?'<div class="muted tiny">'+esc(hint)+'</div>':'')+'</div>';
 }
 function number(id,min,max,required=false){
  const raw=val(id);if(!raw){if(required)throw Error('Renseigne '+id+'.');return null;}
  const v=Number(raw);
  if(!Number.isFinite(v)||v<min||v>max)throw Error('Valeur incorrecte ('+id+') : '+min+' à '+max+'.');
  return v;
 }
 function referenceEdit(c){
  const m=attachCoachModel(c,passportModelFromCoach(c)),r=rights(m),raw=profileFor(c).reference_stats||{};
  modalBase('Références de suivi — '+esc(c.name),
   '<p class="muted tiny">Moyennes consolidées à partir de tes relevés Optitrainer ou d’une source précisée. '+
   'Le Passeport ne lit pas automatiquement Optitrainer.</p>'+
   input('akRefLoad','Charge hebdomadaire moyenne (UA)', 'number',raw.weekly_load,'Moyenne en unités arbitraires, pour une période représentative.')+
   (r.hooper?input('akRefHooper','Hooper moyen / 28 (somme de 4 items à 1–7)','number',raw.hooper_mean):'')+
   '<div class="grid2">'+input('akRefStart','Début de la période','date',raw.period_start)+
   input('akRefEnd','Fin de la période','date',raw.period_end)+'</div>'+
   input('akRefSource','Source des données','text',raw.source||'Optitrainer')+
   '<div class="field"><label>Contexte / interprétation</label><textarea class="textarea" id="akRefNotes" maxlength="1800">'+esc(raw.notes||'')+'</textarea></div>',
   ()=>saveForm(c,()=>{
    const load=number('akRefLoad',0,30000),hooper=r.hooper?number('akRefHooper',4,28):null,
     start=val('akRefStart'),end=val('akRefEnd');
    if(start&&end&&end<start)throw Error('La date de fin précède le début.');
    return {reference_stats:{weekly_load:load,hooper_mean:hooper,period_start:start,period_end:end,
      source:val('akRefSource'),notes:val('akRefNotes')}};
   }));
 }
 function historyEdit(c,kind,day=''){
  const existing=profileFor(c),weight=kind==='weight',
    rows=cleanRows(weight?existing.weight_history:existing.nutrition_history),
    found=rows.find(x=>x.date===day);
  const d=found?.date||localDateISO();
  const content=weight?
   input('akPointDate','Date de la mesure','date',d)+
   '<p class="muted tiny">Seul le poids est obligatoire. La masse grasse et la masse maigre ne sont renseignées que si elles ont été mesurées.</p>'+
   input('akPointKg','Poids (kg) — obligatoire','number',found?.kg)+
   '<div class="grid2">'+
   input('akPointFatPct','Masse grasse (%) — facultatif','number',found?.fat_pct)+
   input('akPointLeanKg','Masse maigre (kg) — facultatif','number',found?.lean_kg)+
   '</div>'+
   '<div class="field"><label>Contexte / méthode de mesure (facultatif)</label><textarea id="akPointNotes" class="textarea" maxlength="700">'+
    esc(found?.notes||'')+'</textarea></div>':
   input('akPointDate','Date du point nutrition','date',d)+
   '<div class="grid2">'+[
     ['kcal','Énergie (kcal/j)'],['protein','Protéines (g/j)'],['carbs','Glucides (g/j)'],['fats','Lipides (g/j)']
   ].map(([key,l])=>input('akNutrition_'+key,l,'number',found?.[key])).join('')+'</div>'+
   '<div class="field"><label>Habitudes / évolution / remarques</label><textarea id="akPointNotes" class="textarea" maxlength="1200">'+
    esc(found?.notes||'')+'</textarea></div>';
  modalBase(weight?'Poids & composition corporelle — '+esc(c.name):'Point nutritionnel — '+esc(c.name),content,
   ()=>saveForm(c,()=>{
    const dayValue=val('akPointDate');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dayValue))throw Error('Date invalide.');
    const kg=weight?number('akPointKg',20,500,true):null;
    const fatPct=weight?number('akPointFatPct',0,100):null;
    const leanKg=weight?number('akPointLeanKg',0,500):null;
    if(weight&&leanKg!==null&&leanKg>kg)throw Error('La masse maigre ne peut pas dépasser le poids total.');
    const row=weight?{date:dayValue,kg,fat_pct:fatPct,lean_kg:leanKg,notes:val('akPointNotes')}:
     {date:dayValue,kcal:number('akNutrition_kcal',0,10000),
      protein:number('akNutrition_protein',0,1000),
      carbs:number('akNutrition_carbs',0,2000),fats:number('akNutrition_fats',0,1000),notes:val('akPointNotes')};
    if(!weight&&!row.notes&&[row.kcal,row.protein,row.carbs,row.fats].every(x=>x===null))
     throw Error('Ajoute au moins un repère ou une remarque.');
    const current=rows.filter(x=>x.date!==day&&x.date!==dayValue);
    const updated=[...current,row].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,150);
    return {[weight?'weight_history':'nutrition_history']:updated};
   }));
 }
 function sleepEdit(c){
  const old=profileFor(c).sleep_reference||{};
  modalBase('Référence de sommeil — '+esc(c.name),
   '<p class="muted tiny">Si le client utilise le journal AK PRIME, les moyennes réelles sur 30 jours remplacent '+
   'automatiquement ces valeurs manuelles à l’affichage.</p>'+
   input('akSleepRefHours','Durée moyenne indicative (h)','number',old.hours)+
   input('akSleepRefQuality','Qualité indicative / 5','number',old.quality)+
   '<div class="field"><label>Observations récupération / sommeil</label>'+
   '<textarea class="textarea" id="akSleepRefNotes" maxlength="1800">'+esc(old.notes||'')+'</textarea></div>',
   ()=>saveForm(c,()=>({sleep_reference:{hours:number('akSleepRefHours',0,24),
    quality:number('akSleepRefQuality',1,5),notes:val('akSleepRefNotes')}})));
 }
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('.akProfAction');if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();
  const c=currentCoach();if(!c||state.view!=='client'||state.tab!=='passport')return;
  if(c.archivedAt){alert('Restaure le dossier avant de modifier le Passeport.');return;}
  const action=button.dataset.action;
  if(action==='profile')return profileEdit(c);
  if(action==='metrics')return referenceEdit(c);
  if(action==='weight'||action==='nutrition')return historyEdit(c,action,button.dataset.date||'');
  if(action==='sleep')return sleepEdit(c);
 },true);
 window.AKP_ATHLETE_PASSPORT_READY=true;
})();