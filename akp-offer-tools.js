/* AK PRIME : formulaire d'engagement initial et espaces d'outils conditionnés par l'offre. */
(function(){
 'use strict';
 const TOOL_SPEC={
  mental_session:{label:'Séance de préparation mentale',hint:'Objectif, technique, exercices, retour et travail entre les séances.',fields:[
   ['duration','Durée (minutes)','number'],['objective','Objectif de la séance','textarea'],
   ['method','Technique ou méthode utilisée','text'],['exercises','Exercices et déroulé','textarea'],
   ['observation','Observations / évolution','textarea'],['homework','Travail à réaliser','textarea'],
   ['next_step','Prochaine étape','textarea']]},
  mental_homework:{label:'Exercice entre les séances',hint:'Exercice transmis et progression au fil de la préparation mentale.',fields:[
   ['exercise','Exercice confié','textarea'],['frequency','Fréquence prévue','text'],
   ['result','Retour du client','textarea'],['adjustment','Ajustement / prochaine consigne','textarea']]},
  mental_practice:{label:'Routine et techniques mentales',hint:'Respiration, mot-clé, recentrage ou routine personnalisée.',fields:[
   ['goal','Situation ou objectif','text'],['technique','Technique / routine','textarea'],
   ['execution','Consignes de mise en pratique','textarea'],['assessment','Évolution observée','textarea']]},
  video_review:{label:'Analyse vidéo',hint:'Mouvement observé, corrections et lien vers la vidéo.',fields:[
   ['movement','Mouvement / exercice','text'],['video_url','Lien de la vidéo (facultatif)','url'],
   ['analysis','Analyse du mouvement','textarea'],['corrections','Corrections et consignes','textarea']]},
  wellness:{label:'Bien-être et état de forme',hint:'Suivi fatigue, stress, douleurs musculaires et qualité du sommeil.',fields:[
   ['fatigue','Fatigue (1 à 7)','number'],['stress','Stress (1 à 7)','number'],
   ['soreness','Douleurs musculaires (1 à 7)','number'],['sleep_quality','Sommeil ressenti (1 à 7)','number'],
   ['notes','Analyse coach / décision','textarea']]},
  training_adjustment:{label:'Adaptation de la charge',hint:'Décision prise selon le bilan et les contraintes du client.',fields:[
   ['trigger','Motif / état de forme','textarea'],['decision','Modification de la charge ou de la séance','textarea'],
   ['followup','Réévaluation prévue','textarea']]},
  recovery_session:{label:'Séance dédiée de récupération',hint:'Récupération ajoutée à la planification Premium.',fields:[
   ['method','Type de récupération','text'],['duration','Durée (minutes)','number'],
   ['program','Contenu détaillé','textarea'],['outcome','Réponse du client','textarea']]},
  sleep_entry:{label:'Agenda de sommeil',hint:'Heures de sommeil, qualité et observations quotidiennes.',fields:[
   ['bedtime','Heure de coucher','time'],['wakeup','Heure de réveil','time'],
   ['hours','Sommeil total (heures)','number'],['quality','Qualité ressentie (1 à 5)','number'],
   ['notes','Réveils, contexte et observations','textarea']]},
  macro_budget:{label:'Budget macronutritionnel',hint:'Objectifs journaliers personnalisés, sans menus alimentaires.',fields:[
   ['kcal','Objectif calorique (kcal / jour)','number'],['protein','Protéines (g / jour)','number'],
   ['carbs','Glucides (g / jour)','number'],['fats','Lipides (g / jour)','number'],
   ['notes','Justification et ajustements','textarea']]},
  lifestyle:{label:'Habitudes de vie et activité',hint:'Objectifs concrets de santé, régularité et activité physique.',fields:[
   ['objective','Objectif','textarea'],['habit','Habitude à travailler','textarea'],
   ['constraints','Contraintes','textarea'],['actions','Actions prévues','textarea']]},
  habit_review:{label:'Bilan de régularité',hint:'Observance, difficultés et prochaines priorités.',fields:[
   ['adherence','Régularité / séances réalisées','text'],['progress','Progrès observés','textarea'],
   ['barriers','Freins rencontrés','textarea'],['next_steps','Priorités suivantes','textarea']]}
 };
 const LABEL_SECTIONS={
  mental:'Séances & outils de préparation mentale',
  p1:'Suivi de l’offre Performance P1',
  p2:'Suivi de l’offre Performance P2',
  p3:'Outils Premium Performance P3',
  forme:'Outils Forme & Santé'
 };
 function toolKeys(c){
   const p=String(c?.pole||''),o=String(c?.offer||'').trim().toLowerCase();
   if(p==='Mental')return ['mental_session','mental_homework','mental_practice'];
   if(p==='Performance'){
     if(o==='p3')return ['video_review','wellness','training_adjustment','mental_practice','sleep_entry','macro_budget','recovery_session'];
     if(o==='p2')return ['video_review','wellness','training_adjustment','mental_practice'];
     return ['video_review'];
   }
   if(p==='Forme & Santé'){
     return o==='renforcé'?['lifestyle','habit_review','wellness','training_adjustment']:['lifestyle','habit_review'];
   }
   return [];
 }
 function workspaceLabel(c){
   const p=String(c?.pole||''),o=String(c?.offer||'');
   if(p==='Mental')return LABEL_SECTIONS.mental;
   if(p==='Performance')return LABEL_SECTIONS[o.toLowerCase()]||'Outils Performance';
   return LABEL_SECTIONS.forme;
 }
 function monthlyEnd(start,months){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return '';
   const [y,m,d]=start.split('-').map(Number);
   const base=new Date(Date.UTC(y,m-1+months,1,12));
   if(Number.isNaN(base.getTime()))return '';
   const max=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0,12)).getUTCDate();
   base.setUTCDate(Math.min(d,max));
   return base.toISOString().slice(0,10);
 }
 const earlierLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
   const result=await earlierLoad.apply(this,args);
   if(!authUser?.id||!['owner','coach'].includes(authProfile?.role))return result;
   const [entries,commitments]=await Promise.all([
     supa.from('client_offer_entries').select('*').order('entry_date',{ascending:false}).order('created_at',{ascending:false}),
     supa.from('clients').select('id,initial_commitment_months')
   ]);
   if(entries.error||commitments.error)throw Error('Chargement des outils de prestation : '+(entries.error||commitments.error).message);
   db.offerEntries=entries.data||[];
   const map=new Map((commitments.data||[]).map(c=>[c.id,c.initial_commitment_months]));
   (db.clients||[]).forEach(c=>c.initialCommitmentMonths=map.get(c.id)||null);
   return result;
 };
 // La création se fait dans une RPC atomique : dossier, onboarding et cycle ensemble.
 openNewClient=function(){
   if(authProfile?.role!=='owner')return alert('La création des dossiers est réservée au propriétaire.');
   modal('Nouveau client',
     '<div class="grid2">'+
     '<div class="field"><label>Nom et prénom</label><input id="mName" class="input" maxlength="200" autocomplete="name"></div>'+
     '<div class="field"><label>E-mail</label><input id="mEmail" type="email" class="input" maxlength="255" autocomplete="email"></div>'+
     '<div class="field"><label>Téléphone <span class="muted tiny">(facultatif)</span></label><input id="mPhone" type="tel" class="input" maxlength="40" autocomplete="tel" placeholder="06 12 34 56 78"></div>'+
     '<div class="field"><label>Pôle</label><select id="mPole" class="select"><option>Performance</option><option>Forme & Santé</option><option>Mental</option></select></div>'+
     '<div class="field"><label>Offre</label><select id="mOffer" class="select">'+newClientOfferOptions('Performance')+'</select></div>'+
     '<div class="field"><label>Date de début</label><input id="mStart" type="date" class="input" value="'+localDateISO()+'"></div>'+
     '<div class="field"><label>Engagement initial</label><select id="mDuration" class="select"><option value="3">3 mois</option><option value="6">6 mois</option></select></div>'+
     '<div class="field"><label>Fin de l’engagement (calcul automatique)</label><input id="mEnd" type="date" class="input" readonly></div>'+
     '<div class="field"><label>Statut paiement (saisie manuelle)</label><select id="mPayment" class="select"><option>En attente</option><option>À jour</option></select></div></div>'+
     '<div class="alert blue" style="margin-top:8px"><div class="tiny">Engagement initial : 3 ou 6 mois. Le mensuel d’un mois est proposé lors du renouvellement, pas à l’inscription. La date de fin est calculée automatiquement. L’accès au portail reste désactivé.</div></div>'+
     '<div class="muted tiny" style="margin-top:7px">Le statut « À jour » est une indication manuelle, pas une confirmation bancaire Stripe.</div>',
     '<button class="btn ghost" id="cancelM">Annuler</button>'+
     '<button class="btn primary" id="saveM">Créer le dossier</button>');
   const $=id=>document.getElementById(id);
   const sync=()=>{$('mEnd').value=monthlyEnd($('mStart').value,Number($('mDuration').value))};
   $('cancelM').onclick=closeModal;
   $('mPole').onchange=()=>{$('mOffer').innerHTML=newClientOfferOptions($('mPole').value)};
   $('mStart').onchange=sync;$('mDuration').onchange=sync;sync();
   $('saveM').onclick=async()=>{
     const full=$('mName').value.trim(),start=$('mStart').value;
     const dur=Number($('mDuration').value),email=$('mEmail').value.trim(),phone=$('mPhone').value.trim();
     if(!full||full.length<2)return alert('Renseigne le nom et le prénom du client.');
     if(email&&!$('mEmail').checkValidity())return alert('Adresse e-mail invalide.');
     if(phone&&(!/^[+0-9 ().-]+$/.test(phone)||phone.replace(/[^0-9]/g,'').length<8||phone.replace(/[^0-9]/g,'').length>15))return alert('Numéro de téléphone invalide.');
     if(!start||!monthlyEnd(start,dur))return alert('Date de début requise.');
     if(![3,6].includes(dur))return alert('Engagement initial invalide.');
     if($('mPayment').value==='À jour'&&!confirm('Ce statut est manuel et ne prouve pas un encaissement Stripe. Confirmer ?'))return;
     const nm=splitName(full);
     const button=$('saveM');button.disabled=true;
     try{
       const {data,error}=await supa.rpc('owner_create_client_with_phone',{
         p_first_name:nm.first_name,p_last_name:nm.last_name,p_email:email||null,p_phone:phone||null,
         p_pole:$('mPole').value,p_offer:$('mOffer').value,p_start_date:start,
         p_initial_months:dur,p_payment_status:$('mPayment').value
       });
       if(error)throw Error(error.message);
       closeModal();await loadSupabaseData();
       state.clientId=data;state.view='client';state.tab='overview';render();
       toast('Client créé : engagement '+dur+' mois jusqu’au '+fmtDate(monthlyEnd(start,dur))+'.');
     }catch(e){alert('Création impossible : '+e.message);button.disabled=false}
   };
 };
 const oldClientTab=clientTab;
 clientTab=function(c){
   if(state.tab==='offer-tools')return offerToolsPage(c);
   return oldClientTab(c);
 };
 const oldClientPage=clientPage;
 clientPage=function(){
   const c=currentClient(),html=oldClientPage();
   if(!c)return html;
   const keys=toolKeys(c);
   if(!keys.length)return html;
   const active=state.tab==='offer-tools';
   const tab='<button data-tab="offer-tools" class="'+(active?'on':'')+'">'+esc(c.pole==='Mental'?'Séances mentales':c.offer==='P3'?'Outils P3':'Outils de l’offre')+'</button>';
   return html.replace(/(<div class="card tabs no-print">[\s\S]*?)(<\/div>)/,(_,before,end)=>before+tab+end);
 };
 const oldOverview=overview;
 overview=function(c){
   const original=oldOverview(c);
   const keys=toolKeys(c);
   if(!keys.length)return original;
   const chips=keys.map(key=>'<span class="status blue" style="margin:3px 4px 3px 0">'+esc(TOOL_SPEC[key].label)+'</span>').join('');
   const intro='<div class="card panel" style="margin-bottom:13px;border-left:4px solid #bc955a">'+
     '<div class="row between"><div><div class="muted tiny">Prestations incluses dans le dossier</div>'+
     '<h3 style="margin:5px 0">'+esc(c.pole)+' — '+esc(c.offer)+'</h3>'+
     '<div class="tiny muted">'+(c.initialCommitmentMonths?'Engagement initial : '+c.initialCommitmentMonths+' mois • ':'')+
     'Fin actuelle : '+esc(fmtDate(c.end))+'</div></div>'+
     '<button class="btn primary small quickTab" data-tab="offer-tools">Ouvrir les outils</button></div>'+
     '<div style="margin-top:10px">'+chips+'</div></div>';
   return intro+original;
 };
 function entryList(c,type,archived=false){
   const rows=(db.offerEntries||[]).filter(x=>x.client_id===c.id&&x.tool_type===type&&!!x.archived_at===archived);
   if(!rows.length)return '<div class="muted tiny">'+(archived?'Aucune archive.':'Aucun enregistrement pour le moment.')+'</div>';
   return rows.map(x=>{
     const spec=TOOL_SPEC[type];
     const lines=spec.fields.map(([key,label])=>x.details?.[key]!==undefined&&String(x.details[key]).trim()
        ? '<div class="tiny" style="margin-top:5px"><strong>'+esc(label)+' :</strong> '+esc(String(x.details[key]))+'</div>':'').join('');
     return '<details class="item" style="margin-bottom:8px"><summary style="cursor:pointer"><strong>'+
       esc(x.title)+'</strong> <span class="muted tiny">• '+esc(fmtDate(x.entry_date))+
       (archived?' • Archivé':'')+'</span></summary>'+
       '<div style="margin-top:9px">'+lines+'</div>'+
       '<div class="row" style="margin-top:12px;gap:9px">'+
       (archived?'<button class="btn ghost small offerToolRestore" data-id="'+esc(x.id)+'">Restaurer</button>':
        '<button class="btn ghost small offerToolEdit" data-id="'+esc(x.id)+'">Modifier</button>'+
        '<button class="btn ghost small offerToolArchive" data-id="'+esc(x.id)+'">Archiver</button>')+
       '</div></details>';
   }).join('');
 }
 function offerToolsPage(c){
   const keys=toolKeys(c),all=(db.offerEntries||[]).filter(x=>x.client_id===c.id);
   const regular=keys.map(type=>{
     const spec=TOOL_SPEC[type],qty=all.filter(x=>x.tool_type===type&&!x.archived_at).length;
     return '<div class="card panel" style="margin-bottom:13px">'+
       '<div class="row between" style="gap:12px"><div><h3 style="margin-bottom:4px">'+esc(spec.label)+
       '</h3><div class="muted tiny">'+esc(spec.hint)+'</div></div>'+
       '<button class="btn primary small offerToolAdd" data-type="'+type+'">+ Ajouter</button></div>'+
       '<div class="section-title" style="margin-top:14px">'+qty+' entrée(s) enregistrée(s)</div>'+
       '<div class="list">'+entryList(c,type)+'</div></div>';
   }).join('');
   const retired=all.filter(e=>!keys.includes(e.tool_type));
   const archive=all.filter(e=>keys.includes(e.tool_type)&&e.archived_at);
   return '<div class="page-title"><div><h1>'+esc(workspaceLabel(c))+'</h1>'+
     '<p>Outils disponibles uniquement pour '+esc(c.pole)+' — '+esc(c.offer)+'. Les données sont enregistrées dans Supabase.</p></div></div>'+
     '<div class="alert blue" style="margin-bottom:13px"><strong>Offre '+esc(c.offer)+
     ' :</strong> '+keys.map(t=>esc(TOOL_SPEC[t].label)).join(' • ')+
     '. Les informations de cet espace sont réservées à l’équipe de coaching et ne sont pas publiées dans le portail client.</div>'+
     regular+
     (archive.length?'<div class="card panel"><h3>Enregistrements archivés</h3>'+
       archive.map(x=>'<div class="section-title">'+esc(TOOL_SPEC[x.tool_type]?.label||x.tool_type)+'</div>'+
         entryList(c,x.tool_type,true)).join('')+'</div>':'')+
     (retired.length?'<div class="card panel" style="margin-top:13px"><h3>Historique d’une ancienne offre</h3>'+
       '<p class="muted tiny">Conservé en lecture seule après changement de prestation.</p>'+
       retired.map(x=>'<div class="item" style="margin-bottom:7px"><strong>'+esc(TOOL_SPEC[x.tool_type]?.label||x.tool_type)+
         '</strong> — '+esc(x.title)+' <span class="muted tiny">'+esc(fmtDate(x.entry_date))+'</span></div>').join('')+
       '</div>':'');
 }
 function fieldHtml(key,label,kind,old){
   const id='offerField_'+key,v=String(old===null||old===undefined?'':old),base='class="input" id="'+id+'"';
   if(kind==='textarea')return '<div class="field"><label>'+esc(label)+'</label><textarea class="textarea" id="'+id+'" maxlength="2500" rows="3">'+esc(v)+'</textarea></div>';
   const attrs=kind==='number'?'type="number" step="0.1" min="0" max="10000"':kind==='time'?'type="time"':kind==='url'?'type="url" maxlength="500"':'type="text" maxlength="500"';
   return '<div class="field"><label>'+esc(label)+'</label><input '+base+' '+attrs+' value="'+esc(v)+'"></div>';
 }
 function editEntry(c,type,row){
   if(!toolKeys(c).includes(type))return alert('Cet outil ne fait plus partie de l’offre de ce client.');
   const spec=TOOL_SPEC[type],details=row?.details||{};
   modal((row?'Modifier : ':'Ajouter : ')+esc(spec.label),
    '<p class="muted tiny">'+esc(spec.hint)+'</p>'+
    '<div class="grid2"><div class="field"><label>Date</label><input id="offerEntryDate" type="date" class="input" value="'+esc(row?.entry_date||localDateISO())+'"></div>'+
    '<div class="field"><label>Intitulé</label><input id="offerEntryTitle" class="input" maxlength="180" value="'+esc(row?.title||spec.label)+'"></div></div>'+
    '<div class="grid2">'+spec.fields.map(([key,label,kind])=>fieldHtml(key,label,kind,details[key])).join('')+'</div>'+
    (type==='macro_budget'?'<div class="alert blue tiny">Repère : protéines et glucides = 4 kcal/g ; lipides = 9 kcal/g. Les objectifs sont personnalisés par le coach, sans menus détaillés.</div>':''),
    '<button class="btn ghost" id="cancelM">Annuler</button><button class="btn primary" id="saveM">Enregistrer</button>');
   document.getElementById('cancelM').onclick=closeModal;
   document.getElementById('saveM').onclick=async()=>{
     const title=document.getElementById('offerEntryTitle').value.trim();
     const date=document.getElementById('offerEntryDate').value;
     if(title.length<2||!date)return alert('Indique une date et un intitulé.');
     const out={};
     for(const [key,label,kind] of spec.fields){
       const input=document.getElementById('offerField_'+key);
       const value=input.value.trim();
       if(kind==='url'&&value){if(!input.checkValidity()||!/^https:\/\//i.test(value))return alert('Le lien vidéo doit être une adresse HTTPS valide.')}
       if(kind==='number'&&value!==''){
         const n=Number(value);
         const maximum=key==='duration'?600:key==='hours'?24:
            ['fatigue','stress','soreness','sleep_quality'].includes(key)?7:key==='quality'?5:10000;
         if(!Number.isFinite(n)||n<0||n>maximum)return alert(label+' : valeur invalide.');
         if(['fatigue','stress','soreness','sleep_quality','quality'].includes(key)&&n<1)return alert(label+' : minimum 1.');
         out[key]=n;
       }else out[key]=value;
     }
     if(type==='macro_budget'){
       const sum=4*Number(out.protein||0)+4*Number(out.carbs||0)+9*Number(out.fats||0);
       if(!Number(out.kcal)||!sum)return alert('Saisis le budget calorique et les trois macronutriments.');
       if(Math.abs(sum-Number(out.kcal))>150&&!confirm('Les macros représentent environ '+Math.round(sum)+' kcal, différent de l’objectif '+out.kcal+' kcal. Continuer ?'))return;
     }
     if(type==='sleep_entry'&&(!out.hours||!out.quality))return alert('Renseigne la durée et la qualité du sommeil.');
     const save=document.getElementById('saveM');save.disabled=true;
     try{
       const data={client_id:c.id,tool_type:type,entry_date:date,title,details:out};
       let res;
       if(row)res=await supa.from('client_offer_entries').update({entry_date:date,title,details:out}).eq('id',row.id).eq('client_id',c.id);
       else res=await supa.from('client_offer_entries').insert({...data,created_by:authUser.id});
       if(res.error)throw Error(res.error.message);
       closeModal();await loadSupabaseData();render();toast('Outil enregistré dans Supabase.');
     }catch(e){alert('Enregistrement impossible : '+e.message);save.disabled=false}
   };
 }
 document.addEventListener('click',async e=>{
   if(state.view!=='client'||state.tab!=='offer-tools')return;
   const add=e.target.closest('.offerToolAdd'),edit=e.target.closest('.offerToolEdit');
   const archive=e.target.closest('.offerToolArchive'),restore=e.target.closest('.offerToolRestore');
   const c=currentClient();
   if(add){editEntry(c,add.dataset.type,null);return}
   if(edit){const row=(db.offerEntries||[]).find(x=>x.id===edit.dataset.id&&x.client_id===c.id);
     if(row)editEntry(c,row.tool_type,row);return}
   const trigger=archive||restore;if(!trigger)return;
   const row=(db.offerEntries||[]).find(x=>x.id===trigger.dataset.id&&x.client_id===c.id);
   if(!row)return;
   const isRestore=!!restore;
   if(!confirm(isRestore?'Restaurer cet enregistrement ?':'Archiver cet enregistrement sans supprimer son historique ?'))return;
   const {error}=await supa.from('client_offer_entries').update({archived_at:isRestore?null:new Date().toISOString()}).eq('id',row.id).eq('client_id',c.id);
   if(error)return alert('Modification impossible : '+error.message);
   await loadSupabaseData();render();toast(isRestore?'Enregistrement restauré.':'Enregistrement archivé.');
 },true);
window.AKP_OFFER_TOOLS_READY=true;
})();
