/* AK PRIME — notifications d'activité client et pause d'accompagnement.
   Les événements sont enregistrés en base même lorsque le coach est déconnecté.
   La cloche se rafraîchit lorsque le back-office est ouvert. */
(function(){
  'use strict';
  const POLL_INTERVAL=25000;
  const actorIsCoach=()=>!!authUser?.id&&['owner','coach'].includes(authProfile?.role);
  const eventsDescription={
    questionnaire_submitted:['Questionnaire envoyé','onboarding',5],
    visio_booked:['Nouvelle visio réservée','calendar',5],
    visio_rescheduled:['Visio déplacée par le client','calendar',4],
    visio_cancelled:['Visio annulée par le client','calendar',4],
    sleep_submitted:['Nouvelle nuit renseignée','offer-tools',3],
    checkin_submitted:['Bilan hebdomadaire envoyé','follow',4],
    renewal_submitted:['Choix de renouvellement reçu','admin',5]
  };
  let lastActivityKeys=null;
  let lastActor='';
  let refreshing=false;
  let realtimeChannel=null;
  let realtimeActor='';
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
    const checkinsWithEvents=new Set((db.coachActivityEvents||[])
      .filter(e=>e.event_type==='checkin_submitted')
      .map(e=>String(e.event_key||'').split(':')[1]));
    return [...persisted,...legacy.filter(n=>
      !(n.key?.startsWith('coach:questionnaire:')&&persistedQuestionnaires.has(n.clientId))&&
      !(n.key?.startsWith('coach:checkin:')&&checkinsWithEvents.has(n.key.slice('coach:checkin:'.length)))
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
    if(lastActor!==authUser.id){
      lastActor=authUser.id;
      lastActivityKeys=new Set((db.coachActivityEvents||[]).map(e=>e.event_key));
    }
    // Notifications instantanées si le flux temps réel est disponible.
    if(!realtimeChannel&&typeof supa.channel==='function'){
      realtimeActor=authUser.id;
      realtimeChannel=supa.channel('akprime-activity-'+authUser.id)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'coach_activity_events'},
          ()=>refreshActivity()).subscribe();
    }
    if(window.__AKP_ACTIVITY_POLL)return;
    window.__AKP_ACTIVITY_POLL=window.setInterval(()=>{
      if(!actorIsCoach()){
        window.clearInterval(window.__AKP_ACTIVITY_POLL);
        window.__AKP_ACTIVITY_POLL=null;lastActor='';lastActivityKeys=null;
        if(realtimeChannel){supa.removeChannel(realtimeChannel);realtimeChannel=null;realtimeActor='';}
        return;
      }
      if(realtimeActor&&realtimeActor!==authUser.id&&realtimeChannel){
        supa.removeChannel(realtimeChannel);realtimeChannel=null;realtimeActor='';
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
  const oldClientNotifications=clientNotifications;
  clientNotifications=function(s){
    const result=oldClientNotifications(s);
    if(s?.client?.status!=='paused')return result;
    return result.filter(n=>!String(n.key||'').startsWith('client:checkin:'));
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

  // Actualités envoyées au client : déclenchées par la base à la publication
  // de résultats, programmes, retours, échéances ou documents visibles.
  // Elles survivent à la déconnexion : elles ne dépendent pas d'une session ouverte.
  const CLIENT_POLL_INTERVAL=25000;
  const clientEventLabels={
    feedback_posted:['Ton coach a répondu à ton bilan','checkin',5],
    test_published:['Un résultat de test est disponible','passport',4],
    cycle_updated:['Ton cycle de suivi a été mis à jour','passport',3],
    macro_published:['Ton budget nutritionnel est disponible','suivi',4],
    content_published:['Nouveau contenu de ton coach','suivi',3],
    passport_updated:['Ton Passeport a été enrichi','passport',3],
    visio_updated:['Ton rendez-vous a été mis à jour','visios',5],
    assessment_planned:['Une nouvelle évaluation est planifiée','passport',4],
    invoice_published:['Une nouvelle facture est disponible','billing',4]
  };
  function clientEventNotifications(session){
    if(!session?.client)return [];
    const seen=notificationReadSet(session.notificationReads);
    return (session.activityEvents||[]).map(e=>{
      const info=clientEventLabels[e.event_type];
      if(!info)return null;
      const key='client:activity:'+e.event_key;
      return {key,title:info[0],detail:'Mis à jour le '+fmtDateTime(e.created_at),
        target:info[1],priority:info[2],eventDate:e.created_at,read:seen.has(key)};
    }).filter(Boolean);
  }
  const existingClientNotifications=clientNotifications;
  clientNotifications=function(session){
    const incoming=clientEventNotifications(session);
    const recordedCheckins=new Set((session?.activityEvents||[])
      .filter(e=>e.event_type==='feedback_posted')
      .map(e=>String(e.event_key||'').split(':')[1]));
    const old=existingClientNotifications(session)
      .filter(n=>!(String(n.key||'').startsWith('client:feedback:')&&
        recordedCheckins.has(String(n.key).slice('client:feedback:'.length))));
    return [...incoming,...old].sort((a,b)=>
      Number(!!a.read)-Number(!!b.read)||
      (b.priority||0)-(a.priority||0)||
      String(b.eventDate||'').localeCompare(String(a.eventDate||'')));
  };
  let clientLastActor='';
  let clientLastKeys=null;
  let clientLoading=false;
  let clientRealtime=null;
  let clientRealtimeId='';
  let clientPollTimer=null;
  const actorIsClient=()=>authProfile?.role==='client'&&!!authUser?.id&&
    !!clientPortalState?.client?.id;
  function updateClientBell(){
    if(!actorIsClient())return;
    const count=clientNotifications(clientPortalState).filter(x=>!x.read).length;
    document.querySelectorAll('.notificationBell[data-mode="client"]').forEach(b=>{
      let node=b.querySelector('.notification-badge');
      if(!count){node?.remove();b.title='Notifications';return;}
      if(!node){node=document.createElement('span');node.className='notification-badge';b.appendChild(node);}
      node.textContent=count>99?'99+':String(count);
      b.title=count+' notification(s) non lue(s)';
    });
  }
  async function clientActivityRefresh(showToast=true){
    if(clientLoading||!actorIsClient())return;
    const actor=authUser.id,session=clientPortalState;
    clientLoading=true;
    try{
      const [activity,readRows]=await Promise.all([
        supa.from('client_activity_events').select('client_id,event_key,event_type,created_at')
          .eq('client_id',session.client.id).order('created_at',{ascending:false}).limit(250),
        supa.from('notification_reads').select('notification_key,read_at').eq('user_id',actor)
      ]);
      if(activity.error||readRows.error)throw Error((activity.error||readRows.error).message);
      if(!actorIsClient()||authUser.id!==actor||clientPortalState!==session)return;
      const next=activity.data||[];
      const nowKeys=new Set(next.map(row=>row.event_key));
      if(clientLastActor!==actor){clientLastActor=actor;clientLastKeys=null;}
      const fresh=clientLastKeys?next.filter(row=>!clientLastKeys.has(row.event_key)):[];
      session.activityEvents=next;
      session.notificationReads=readRows.data||[];
      clientLastKeys=nowKeys;
      updateClientBell();
      if(showToast&&fresh.length)toast(fresh.length+' nouvelle(s) information(s) de ton coach 🔔');
    }catch(error){
      console.warn('Notifications du client indisponibles :',error?.message||error);
    }finally{clientLoading=false;}
  }
  function startClientNotifications(){
    if(!actorIsClient())return;
    const id=authUser.id,clId=clientPortalState.client.id;
    if(clientLastActor!==id){
      clientLastActor=id;
      clientLastKeys=new Set((clientPortalState.activityEvents||[]).map(e=>e.event_key));
    }
    if(clientRealtimeId!==id+':'+clId){
      if(clientRealtime){supa.removeChannel(clientRealtime);clientRealtime=null;}
      clientRealtimeId=id+':'+clId;
      if(typeof supa.channel==='function'){
        clientRealtime=supa.channel('akprime-client-activity-'+id)
          .on('postgres_changes',{event:'INSERT',schema:'public',
            table:'client_activity_events',filter:'client_id=eq.'+clId},
            ()=>clientActivityRefresh()).subscribe();
      }
    }
    if(clientPollTimer)return;
    clientPollTimer=window.setInterval(()=>{
      if(!actorIsClient()){
        window.clearInterval(clientPollTimer);clientPollTimer=null;
        clientLastActor='';clientLastKeys=null;
        if(clientRealtime){supa.removeChannel(clientRealtime);clientRealtime=null;clientRealtimeId='';}
        return;
      }
      clientActivityRefresh();
    },CLIENT_POLL_INTERVAL);
    window.addEventListener('focus',()=>{
      if(actorIsClient())clientActivityRefresh(false);
    });
  }
  // Raccordement au parcours client réel, y compris lors d'un changement
  // de formule TEST. Les autres modules pourront continuer à envelopper ce rendu.
  const beforeClientNotificationsPortal=renderClientPortal;
  renderClientPortal=function(...args){
    const result=beforeClientNotificationsPortal.apply(this,args);
    if(actorIsClient())startClientNotifications();
    return result;
  };
  const beforeClientNotificationsEnter=enterClientPortal;
  enterClientPortal=async function(...args){
    const result=await beforeClientNotificationsEnter.apply(this,args);
    if(actorIsClient())await clientActivityRefresh(false);
    return result;
  };
  const beforeClientNotificationsRefresh=refreshClientNotificationData;
  refreshClientNotificationData=async function(...args){
    const result=await beforeClientNotificationsRefresh.apply(this,args);
    if(!actorIsClient())return result;
    await clientActivityRefresh(false);
    // Quand une notification ouvre le Passeport, recharger les données utiles :
    // test, cycle, événements et contenu publié.
    const session=clientPortalState,id=session.client.id;
    const [tests,cycles,events,macro]=await Promise.all([
      supa.from('tests').select('*').eq('client_id',id).order('performed_at',{ascending:false}),
      supa.from('cycles').select('*').eq('client_id',id).order('start_date',{ascending:false}).limit(1).maybeSingle(),
      supa.from('passport_events').select('*').eq('client_id',id).eq('client_visible',true).order('event_date',{ascending:false}),
      (session.client.current_pole==='Performance'&&session.client.current_offer==='P3'||
       session.client.current_pole==='Forme & Santé'&&session.client.current_offer==='Renforcé')
        ?supa.rpc('my_published_macro_budget'):Promise.resolve({data:null,error:null})
    ]);
    if(clientPortalState!==session)return result;
    if(!tests.error)session.tests=tests.data||[];
    if(!cycles.error)session.cycle=cycles.data||null;
    if(!events.error)session.events=events.data||[];
    if(!macro.error&&macro.data)session.akMacro=macro.data;
    return result;
  };

  window.AKP_ACTIVITY_PAUSE_READY=true;
})();