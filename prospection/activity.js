'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const names={starting:'Démarrage du passage',checking_replies:'Lecture des réponses',sending:'Traitement des messages autorisés',researching:'Recherche de nouvelles structures',verifying:'Vérification des sources',finished:'Dernier passage terminé',error:'Un traitement nécessite une vérification',waiting:'En attente du prochain passage'};
 const time=v=>v?new Date(v).toLocaleString('fr-FR',{timeZone:'Europe/Paris'}):'non planifiée';
 let running=false;
 async function refresh(){
  if(running||$('workspace').hidden||document.hidden)return;
  running=true;
  try{
   const [s,r]=await Promise.all([db.from('prospection_settings').select('*').eq('singleton',true).single(),db.from('prospection_runs').select('*').order('started_at',{ascending:false}).limit(15)]);
   if(s.error||r.error)return;
   const cfg=s.data;
   $('livePhase').textContent=(cfg.enabled?(names[cfg.current_phase]||cfg.current_phase):'Agent en pause')+' — '+cfg.last_status;
   $('researchBudget').textContent=((cfg.month_reserved_cents||0)/100).toFixed(2)+' $ réservés sur '+((cfg.research_monthly_budget_cents||0)/100).toFixed(2)+' $ ce mois-ci. '+(cfg.research_note||'');
   $('researchNext').textContent='Prochaine recherche IA possible : '+time(cfg.next_research_at)+'. Les vérifications et messages autorisés continuent entre les recherches.';
   const target=$('agentHistory');target.replaceChildren();
   if(!r.data.length){target.textContent='Le prochain passage apparaîtra ici.';return}
   for(const run of r.data){
    const box=document.createElement('div');box.className='item';
    const title=document.createElement('strong');title.textContent=time(run.started_at)+' · '+(names[run.phase]||run.phase);
    const counts=document.createElement('p');counts.className='small';counts.textContent=run.candidates+' propositions · '+run.added+' nouveaux contacts · '+run.checked+' vérifications · '+run.verified+' sources confirmées · '+run.sent+' mails envoyés';
    const note=document.createElement('p');note.className='small muted';note.textContent=run.note;
    box.append(title,counts,note);target.append(box);
   }
  }finally{running=false}
 }
 window.addEventListener('akprime-owner-ready',()=>refresh().catch(()=>{}));
 window.addEventListener('akprime-owner-logout',()=>{$('agentHistory').replaceChildren();$('livePhase').textContent='Session terminée.'});
 setInterval(()=>{
  refresh().catch(()=>{});
  const editing=document.activeElement?.matches('input,textarea,select')||$('editor').open||$('campaignEditor').open;
  if(!document.hidden&&!$('workspace').hidden&&!editing)window.dispatchEvent(new Event('akprime-refresh-leads'));
 },30000);
 if(!$('workspace').hidden)refresh().catch(()=>{});
})();
