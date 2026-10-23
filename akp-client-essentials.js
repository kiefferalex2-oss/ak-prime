/* AK PRIME : espace client complémentaire d'Optitrainer.
 * Objectifs macro publiés par le coach ; recommandations PDF facultatives.
 */
(function(){
 'use strict';
 const sleepEligible=c=>
   c?.current_pole==='Performance'&&c?.current_offer==='P3';
 const macroEligible=c=>(c?.current_pole==='Performance'&&c?.current_offer==='P3')||
   (c?.current_pole==='Forme & Santé'&&c?.current_offer==='Renforcé');
 const sleepDateValue=()=>localDateISO();
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
   const c=s.client;
   if(!sleepEligible(c))return '';
   const rows=s.akSleepRows||[];
   return '<div class="client-section-card" id="akSleepDiary" style="margin-top:13px">'+
     '<div class="row between"><div><h3>Mon agenda de sommeil</h3>'+
     '<p class="muted tiny">Indique la nuit correspondant à ta date de réveil. Ce journal est distinct des questionnaires de forme Optitrainer.</p></div>'+
     '<span class="status blue">'+rows.length+' nuit(s)</span></div>'+
     '<div class="grid2">'+
       '<div class="field"><label>Date du réveil</label><input class="input" id="akSleepDate" type="date" value="'+safe(sleepDateValue())+'"></div>'+
       '<div class="field"><label>Durée de sommeil (heures)</label><input class="input" id="akSleepHours" type="number" step="0.25" min="0.25" max="24" placeholder="7.5"></div>'+
       '<div class="field"><label>Heure de coucher</label><input class="input" id="akSleepBedtime" type="time"></div>'+
       '<div class="field"><label>Heure de réveil</label><input class="input" id="akSleepWakeup" type="time"></div>'+
       '<div class="field"><label>Qualité ressentie</label><select class="select" id="akSleepQuality">'+
         '<option value="">Sélectionne une note</option>'+
         [1,2,3,4,5].map(n=>'<option value="'+n+'">'+n+' / 5</option>').join('')+
       '</select></div></div>'+
     '<div class="field"><label>Observations (facultatif)</label>'+
       '<textarea class="textarea" id="akSleepNotes" maxlength="1200" placeholder="Réveils, perturbations, contexte..."></textarea></div>'+
     '<button class="btn primary" id="akSaveSleep">Enregistrer ma nuit</button>'+
     (rows.length?'<div class="section-title">Dernières nuits</div>'+
       '<div class="list">'+rows.slice(0,14).map(x=>
        '<div class="item row between"><div><strong>'+safe(fmtDate(x.sleep_date))+
        '</strong><div class="muted tiny">'+safe(x.duration_hours)+' h · Qualité '+safe(x.quality)+
        '/5'+(x.notes?' · '+safe(x.notes):'')+'</div></div>'+
        '<button class="btn ghost small akEditSleep" data-date="'+safe(x.sleep_date)+'">Modifier</button></div>').join('')+
        '</div>':'<div class="muted tiny" style="margin-top:10px">Aucune nuit enregistrée pour le moment.</div>')+
     '</div>';
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
 const oldClientSuivi=renderClientSuivi;
 renderClientSuivi=function(s){
   if(!s?.client)return oldClientSuivi(s);
   const mental=s.client.current_pole==='Mental';
   return '<div class="client-main"><div class="client-page-head"><div>'+
     '<h2>Mon accompagnement AK PRIME</h2>'+
     '<p>Questionnaire initial, préparation mentale et prestations complémentaires selon ta formule.</p></div></div>'+
     (mental?'<div class="client-section-card" style="margin-top:13px"><h3>Préparation mentale</h3>'+
       '<p class="muted tiny">Les exercices, routines et séances sont individualisés avec ton coach. '+
       'Les notes internes du coach ne sont pas visibles dans cet espace.</p></div>':'')+
     macroPanel(s)+sleepForm(s)+
     (s.akExtrasError?'<div class="alert" style="margin-top:12px">Certains outils sont temporairement indisponibles : '+safe(s.akExtrasError)+'</div>':'')+
     '<div class="client-section-card" style="margin-top:13px"><h3>Mon entraînement et mes échanges</h3>'+
       '<p class="muted tiny">Programmation, séances, charge et état de forme : Optitrainer. '+ 
       'Si ta formule prévoit des analyses vidéo, envoie les vidéos de tes mouvements directement sur WhatsApp. '+ 
       'AK PRIME n’héberge pas les fichiers vidéo.</p>'+
       (s.client.optitrainer_url?'<button class="btn primary" id="clientOpti">Ouvrir Optitrainer</button>':
        '<div class="muted tiny">Ton lien Optitrainer sera ajouté par ton coach.</div>')+
       renderClientWhatsAppButton(s,s.client)+'</div></div>';
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
 function prefillSleep(s,day){
   const row=(s.akSleepRows||[]).find(x=>x.sleep_date===day);
   document.getElementById('akSleepDate').value=day;
   document.getElementById('akSleepHours').value=row?.duration_hours||'';
   document.getElementById('akSleepBedtime').value=String(row?.bedtime||'').slice(0,5);
   document.getElementById('akSleepWakeup').value=String(row?.wakeup||'').slice(0,5);
   document.getElementById('akSleepQuality').value=row?.quality||'';
   document.getElementById('akSleepNotes').value=row?.notes||'';
 }
 document.addEventListener('change',e=>{
   if(e.target?.id==='akSleepDate'&&clientPortalState){
     const value=e.target.value;
     if(value)prefillSleep(clientPortalState,value);
   }
 },true);
 document.addEventListener('click',async e=>{
   const edit=e.target.closest?.('.akEditSleep');
   if(edit&&clientPortalState){
     e.preventDefault();prefillSleep(clientPortalState,edit.dataset.date);
     document.getElementById('akSleepDiary')?.scrollIntoView({behavior:'smooth',block:'start'});
     return;
   }
   if(e.target.closest?.('#akDownloadMacro')){
     e.preventDefault();
     const s=clientPortalState,path=s?.akMacro?.pdf_path;
     if(!path)return alert('Document non disponible pour le moment.');
     // L'ouverture anticipée évite les bloqueurs de fenêtres après l'appel réseau.
     const target=window.open('about:blank','_blank');
     const {data,error}=await supa.storage.from('akprime-macro-pdfs').createSignedUrl(path,90);
     if(error||!data?.signedUrl){
       target?.close();return alert('Téléchargement impossible : '+(error?.message||'accès refusé'));
     }
     if(target)target.location.href=data.signedUrl;
     else{const a=document.createElement('a');a.href=data.signedUrl;a.target='_blank';a.rel='noopener';a.click()}
     return;
   }
   if(!e.target.closest?.('#akSaveSleep'))return;
   e.preventDefault();
   const s=clientPortalState;
   if(!s?.client||!sleepEligible(s.client))return alert('Agenda indisponible pour cette offre.');
   const get=id=>document.getElementById(id)?.value?.trim()||'';
   const day=get('akSleepDate'),hours=Number(get('akSleepHours')),quality=Number(get('akSleepQuality'));
   const bedtime=get('akSleepBedtime'),wakeup=get('akSleepWakeup'),notes=get('akSleepNotes');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(hours)||hours<=0||hours>24||
     !Number.isInteger(quality)||quality<1||quality>5)return alert('Date, durée et qualité du sommeil requises.');
   if(notes.length>1200)return alert('Observation trop longue.');
   const button=e.target.closest('#akSaveSleep');button.disabled=true;
   const payload={client_id:s.client.id,sleep_date:day,bedtime:bedtime||null,
     wakeup:wakeup||null,duration_hours:hours,quality,notes};
   try{
     const {data,error}=await supa.from('client_sleep_diary').upsert(payload,{
       onConflict:'client_id,sleep_date'}).select().single();
     if(error)throw Error(error.message);
     s.akSleepRows=[data,...(s.akSleepRows||[]).filter(x=>x.sleep_date!==day)]
       .sort((a,b)=>String(b.sleep_date).localeCompare(String(a.sleep_date)));
     renderClientPortal();
     alert('Ta nuit a été enregistrée dans ton espace AK PRIME.');
   }catch(err){alert('Impossible d’enregistrer cette nuit : '+err.message);button.disabled=false}
 },true);
 window.AKP_CLIENT_ESSENTIALS_READY=true;
})();
