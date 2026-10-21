/* AK PRIME — notifications d'activité client et pause d'accompagnement.
   Les événements sont enregistrés en base même lorsque le coach est déconnecté.
   La cloche se rafraîchit lorsque le back-office est ouvert. */
(function(){
  'use strict';
  const POLL_INTERVAL=45000;
  const actorIsCoach=()=>!!authUser?.id&&['owner','coach'].includes(authProfile?.role);
  const eventsDescription={
    questionnaire_submitted:['Questionnaire envoyé','onboarding',5],
    visio_booked:['Nouvelle visio réservée','calendar',5],
    visio_rescheduled:['Visio déplacée par le client','calendar',4],
    visio_cancelled:['Visio annulée par le client','calendar',4],
    sleep_submitted:['Agenda de sommeil complété','offer-tools',3],
    renewal_submitted:['Choix de renouvellement reçu','admin',5]
  };
  let lastActivityKeys=null;
  let lastActor='';
  let refreshing=false;
  function mappedEvents(events){
    const reads=notificationReadSet(db.notificationReads);
    const clientIndex=new Map((db.clients||[]).map(c=>[c.id,c]));
    return (events||[]).map(e=>{
      const kind=eventsDescription[e.event_type];
      if(!kind)return null;
      const cl=clientIndex.get(e.client_id);
      const key='coach:activity:'+e.event_key;
      const label=kind[0];
      return {
        key,title:label+' — '+(cl?.name||'Client'),
        detail:'Reçu le '+fmtDateTime(e.created_at)+' • '+(cl?.offer||'Dossier client'),
        target:kind[1]==='calendar'?'calendar':'client',
        clientId:e.client_id,tab:kind[1],priority:kind[2],read:reads.has(key),
        eventDate:e.created_at
      };
    }).filter(Boolean);
  }
  const inheritedLoad=loadSupabaseData;
  loadSupabaseData=async function(...args){
    const result=await inheritedLoad.apply(this,args);
    if(!actorIsCoach())return result;
    const {data,error}=await supa.from('coach_activity_events').select('event_key,event_type,client_id,created_at')
       .order('created_at',{ascending:false}).limit(400);
    if(error)throw Error('Notifications clients indisponibles : '+error.message);
    db.coachActivityEvents=data||[];
    return result;
  };
  const previousNotifications=coachNotifications;
  coachNotifications=function(){
    const legacy=previousNotifications();
    const persisted=mappedEvents(db.coachActivityEvents);
    const persistedQuestionnaires=new Set((db.coachActivityEvents||[])
      .filter(e=>e.event_type==='questionnaire_submitted').map(e=>e.client_id));
    return [...persisted,...legacy.filter(n=>
      !(n.key?.startsWith('coach:questionnaire:')&&persistedQuestionnaires.has(n.clientId))
    )].sort((a,b)=>(Number(a.read)-Number(b.read))||((b.priority||0)-(a.priority||0))||
      String(b.eventDate||'').localeCompare(String(a.eventDate||'')));
  };
  function updateBellCounter(){
    const count=coachNotifications().filter(n=>!n.read).length;
    document.querySelectorAll('.notificationBell[data-mode="coach"]').forEach(b=>{
      let node=b.querySelector('.notification-badge');
      if(!count){node?.remove();return;}
      if(!node){node=document.createElement('span');node.className='notification-badge';b.appendChild(node);}
      node.textContent=count>99?'99+':String(count);
      b.title=count+' notification(s) non lue(s)';
    });
  }
  async function refreshActivity(){
    if(refreshing||!actorIsCoach())return;
    refreshing=true;
    try{
      const currentActor=authUser.id;
      const [events,reads]=await Promise.all([
        supa.from('coach_activity_events').select('event_key,event_type,client_id,created_at')
          .order('created_at',{ascending:false}).limit(400),
        supa.from('notification_reads').select('notification_key,read_at').eq('user_id',currentActor)
      ]);
      if(events.error||reads.error)throw Error((events.error||reads.error).message);
      if(!actorIsCoach()||authUser.id!==currentActor)return;
      const next=events.data||[],keys=new Set(next.map(e=>e.event_key));
      if(lastActor!==currentActor){lastActivityKeys=null;lastActor=currentActor;}
      const newly=lastActivityKeys?[...keys].filter(k=>!lastActivityKeys.has(k)):[],
        newRows=next.filter(e=>newly.includes(e.event_key));
      db.coachActivityEvents=next;
      db.notificationReads=reads.data||[];
      lastActivityKeys=keys;
      updateBellCounter();
      if(newRows.length){
        toast(newRows.length+' nouvelle(s) activité(s) client(s) • ouvre la cloche 🔔');
      }
    }catch(e){console.warn('Notifications AK PRIME : '+e.message)}
    finally{refreshing=false;}
  }
  function startWatcher(){
    if(!actorIsCoach())return;
    if(window.__AKP_ACTIVITY_POLL)return;
    lastActor=authUser.id;
    lastActivityKeys=new Set((db.coachActivityEvents||[]).map(e=>e.event_key));
    window.__AKP_ACTIVITY_POLL=window.setInterval(()=>{
      if(!actorIsCoach()){
        window.clearInterval(window.__AKP_ACTIVITY_POLL);
        window.__AKP_ACTIVITY_POLL=null;lastActor='';lastActivityKeys=null;return;
      }
      refreshActivity();
    },POLL_INTERVAL);
  }
  const oldCoachShell=shell;
  shell=function(inner){
    const html=oldCoachShell(inner);
    if(actorIsCoach())startWatcher();
    return html;
  };
  const oldAdmin=admin;
  admin=function(c){
    let html=oldAdmin(c);
    if(!c||!actorIsCoach())return html;
    // Le menu libre permettait des transitions de statut sans justification.
    // Il est remplacé par des commandes explicites, contrôlées par Supabase.
    html=html.replace(/<div class="field"><label>Statut<\/label><select class="select pathSave" data-path="status">[\s\S]*?<\/select><\/div>/,
      '<div class="field"><label>Statut du dossier</label><div class="alert blue">'+esc(c.status)+
      ' — passage en pause ou reprise via les actions dédiées ci-dessous.</div></div>');
    const paused=c.status==='Pause';
    const allowed=['Actif','Onboarding'].includes(c.status);
    const next=paused?'<div class="alert" style="margin:9px 0">'+
      '<strong>Accompagnement en pause</strong>'+
      '<div class="tiny">Motif : '+esc(c.pauseReason||'Non précisé')+'</div>'+
      '<div class="tiny">Depuis : '+esc(fmtDate(String(c.pausedAt||'').slice(0,10)))+
      (c.pauseUntil?' • Reprise envisagée : '+esc(fmtDate(c.pauseUntil)):'')+'</div>'+
      '<div class="tiny">Nouvelles réservations bloquées, historique préservé. Aucune prolongation ni suspension de paiement automatique.</div></div>'+
      (authProfile?.role==='owner'?'<button class="btn primary small akResumeClient" data-id="'+esc(c.id)+'">Reprendre l’accompagnement</button>':''):
      (allowed&&authProfile?.role==='owner'?
       '<button class="btn ghost small akPauseClient" data-id="'+esc(c.id)+'">Mettre en pause l’accompagnement</button>':
       '<div class="muted tiny">La mise en pause est possible depuis un dossier actif ou en onboarding.</div>');
    return html+'<div class="card panel" style="margin-top:13px">'+
      '<h3>Pause de l’accompagnement</h3>'+
      '<p class="muted tiny">Une pause suspend les nouvelles réservations de visio et le suivi opérationnel. '+
      'Elle ne modifie pas les engagements, la facturation ou les rendez-vous déjà réservés ; '+
      'ces situations sont à traiter individuellement si nécessaire.</p>'+next+'</div>';
  };
  function showPause(c){
    const existing=(db.appointments||[]).filter(a=>a.client_id===c.id&&
      ['scheduled','confirmed'].includes(a.status)&&new Date(a.starts_at)>new Date()).length;
    modal('Mettre en pause — '+esc(c.name),
      '<div class="alert blue">La mise en pause conserve le Passeport, les tests, les cycles et les contrats. '+
      'Le client ne pourra plus réserver ni déplacer de visio tant que la pause est active.</div>'+
      (existing?'<div class="alert" style="margin-top:9px">'+existing+
        ' visio(s) déjà réservée(s) : elles ne seront PAS automatiquement annulées.</div>':'')+
      '<div class="field" style="margin-top:12px"><label>Motif de la pause (obligatoire)</label>'+
      '<textarea class="textarea" id="akPauseReason" maxlength="700" rows="3" placeholder="Ex. Indisponibilité temporaire sur demande du client"></textarea></div>'+
      '<div class="field"><label>Reprise envisagée (facultative, sans réactivation automatique)</label>'+
      '<input type="date" class="input" id="akPauseUntil" min="'+localDateISO()+'"></div>'+
      '<div class="muted tiny">Attention : aucun report de contrat ni arrêt de prélèvement n’est déclenché.</div>',
      '<button class="btn ghost" id="akCancelPause">Annuler</button>'+
      '<button class="btn primary" id="akConfirmPause">Confirmer la pause</button>');
    document.getElementById('akCancelPause').onclick=closeModal;
    document.getElementById('akConfirmPause').onclick=async()=>{
      const reason=document.getElementById('akPauseReason').value.trim();
      const until=document.getElementById('akPauseUntil').value;
      if(reason.length<10)return alert('Renseigne un motif de 10 caractères minimum.');
      if(!confirm('Confirmer la pause de '+c.name+' sans modifier la facturation ni la fin du contrat ?'))return;
      const button=document.getElementById('akConfirmPause');button.disabled=true;
      const {error}=await supa.rpc('owner_set_client_pause',{
        p_client_id:c.id,p_pause:true,p_reason:reason,p_until:until||null
      });
      if(error){button.disabled=false;return alert('Pause impossible : '+error.message);}
      closeModal();await loadSupabaseData();render();toast('Accompagnement en pause.');
    };
  }
  document.addEventListener('click',async e=>{
    const pause=e.target.closest?.('.akPauseClient');
    const resume=e.target.closest?.('.akResumeClient');
    if(!pause&&!resume||state.view!=='client'||authProfile?.role!=='owner')return;
    e.preventDefault();e.stopImmediatePropagation();
    const c=currentClient();if(!c)return;
    if(pause)return showPause(c);
    const reason=prompt('Motif de reprise du dossier (10 caractères minimum) :');
    if(!reason||reason.trim().length<10)return;
    if(!confirm('Reprendre '+c.name+' ? Les nouvelles réservations redeviendront possibles. '+
       'Le paiement, la date de fin et les droits d’accès ne changent pas automatiquement.'))return;
    const {error}=await supa.rpc('owner_set_client_pause',{
      p_client_id:c.id,p_pause:false,p_reason:reason.trim(),p_until:null
    });
    if(error)return alert('Reprise impossible : '+error.message);
    await loadSupabaseData();render();toast('Dossier repris.');
  },true);
  const originalRenderVisios=renderClientVisios;
  renderClientVisios=function(s){
    if(s?.client?.status!=='paused')return originalRenderVisios(s);
    const current=(s.appointments||[]).filter(a=>['scheduled','confirmed'].includes(a.status)&&
      new Date(a.starts_at)>new Date());
    return '<div class="client-main"><div class="client-page-head"><h2>Mes visios</h2></div>'+
      '<div class="client-section-card"><h3>Accompagnement temporairement en pause</h3>'+
      '<p>Les nouvelles réservations et modifications de rendez-vous sont suspendues. '+
      'Contacte ton coach pour organiser la reprise. La pause ne modifie pas automatiquement le contrat.</p>'+
      (current.length?'<div class="alert">'+current.length+' visio(s) déjà réservée(s) : '+
       current.map(a=>esc(fmtDateTime(a.starts_at))).join(', ')+
       '. Contacte ton coach si ces créneaux doivent être annulés.</div>':'')+
      '</div></div>';
  };
  const originalClientHome=renderClientHome;
  renderClientHome=function(s){
    const html=originalClientHome(s);
    if(s?.client?.status!=='paused')return html;
    return '<div class="client-section-card"><h3>Accompagnement en pause</h3>'+
      '<p>Ton Passeport et tes documents restent consultables. '+
      'Les nouvelles visios sont suspendues jusqu’à la reprise avec ton coach.</p></div>'+html;
  };
  // Rafraîchir aussi les métadonnées de pause chargées depuis Supabase.
  const prevLoad=loadSupabaseData;
  loadSupabaseData=async function(...args){
    const result=await prevLoad.apply(this,args);
    if(!actorIsCoach())return result;
    const {data,error}=await supa.from('clients')
      .select('id,paused_at,pause_until,pause_reason');
    if(error)throw Error('Informations de pause indisponibles : '+error.message);
    const map=new Map((data||[]).map(x=>[x.id,x]));
    (db.clients||[]).forEach(c=>{
      const item=map.get(c.id)||{};
      c.pausedAt=item.paused_at||null;
      c.pauseUntil=item.pause_until||null;
      c.pauseReason=item.pause_reason||'';
    });
    return result;
  };
  window.AKP_ACTIVITY_PAUSE_READY=true;
})();