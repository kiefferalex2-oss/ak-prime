// AK PRIME: secure contract archive bridge (2026-10-20)
// Runs before the legacy delegated button handler to enforce saved-file verification.
document.addEventListener('click', async function(event) {
 const button=event.target.closest?.('.archiveContractEvidence');
 if(!button)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(button.disabled)return;
 const record=(typeof contractEvidence!=='undefined'?contractEvidence:[]).find(x=>x.id===button.dataset.id);
 if(!record?.contract_snapshot)return alert('Preuve indisponible.');
 downloadContractJSON(record,'ak-prime-preuve-'+record.id+'.json');
 alert('Sauvegarde JSON téléchargée. Faites une seconde copie sécurisée, puis choisissez le fichier JSON pour en vérifier le contenu avant archivage.');
 const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';
 picker.onchange=async()=>{
  const file=picker.files?.[0];if(!file)return;
  try{
   if(file.size>2000000)throw Error('Fichier trop volumineux.');
   const copy=JSON.parse(await file.text());
   if(copy.id!==record.id||!copy.contract_snapshot||JSON.stringify(copy.contract_snapshot)!==JSON.stringify(record.contract_snapshot))throw Error('Fichier différent de la preuve enregistrée.');
   if(!confirm('Confirmez-vous disposer de deux copies privées du fichier JSON et vouloir archiver cette preuve ?'))return;
   button.disabled=true;
   const {error}=await supa.rpc('owner_archive_contract_evidence',{p_order_id:record.id,p_snapshot:copy.contract_snapshot});
   if(error)throw Error(error.message);
   await loadContractEvidence();render();
   alert('Archivage terminé. Le fichier JSON reste nécessaire à la restauration.');
  }catch(err){button.disabled=false;alert('Archivage annulé : '+err.message)}
 };
 picker.click();
},true);


// AK PRIME — Mot de passe oublié dans la fenêtre de connexion.
(function(){
 const originalLogin=openPublicLogin;
 openPublicLogin=function(...args){
  originalLogin(...args);
  const password=document.getElementById('authPassword');
  if(!password||document.getElementById('forgotPassword'))return;
  const link=document.createElement('button');
  link.type='button';link.id='forgotPassword';link.className='link';
  link.textContent='Mot de passe oublié ?';
  link.style.cssText='display:block;margin:8px 0 14px;padding:0;text-align:left';
  password.closest('.field')?.after(link);
  link.addEventListener('click',async()=>{
   const email=document.getElementById('authEmail')?.value.trim()||'';
   if(!email||!document.getElementById('authEmail').checkValidity()){
    setAuthMsg('Renseigne d’abord ton adresse e-mail valide.',true);return;
   }
   link.disabled=true;
   try{
    const {error}=await supa.auth.resetPasswordForEmail(email,{
     redirectTo:window.location.origin+'/reinitialiser-mot-de-passe.html'
    });
    if(error)throw error;
    setAuthMsg('Si cette adresse correspond à un compte AK PRIME, tu recevras un e-mail pour définir un nouveau mot de passe.',false);
   }catch(err){setAuthMsg('Envoi impossible : '+err.message,true)}
   finally{link.disabled=false}
  });
 };
})();

// Démarrage explicite des modules du back-office (une seule chaîne contrôlée).
// Les versions de fichiers sont ajoutées aux URL pour éviter un ancien cache navigateur.
(function(){
  const sequence=[
    ['akp-phase1-security.js','AKP_PHASE1_READY'],
    ['akp-review-fixes.js','AKP_REVIEW_READY'],
    ['akp-offer-tools.js','AKP_OFFER_TOOLS_READY'],
    ['akp-client-essentials.js','AKP_CLIENT_ESSENTIALS_READY'],
    ['akp-passport-cycle-history.js','AKP_CYCLE_HISTORY_READY'],
    ['akp-client-archive.js','AKP_CLIENT_ARCHIVE_READY'],
    ['akp-notifications-pause.js','AKP_ACTIVITY_PAUSE_READY'],
    ['akp-client-management.js','AKP_CLIENT_MANAGEMENT_READY'],
    ['akp-assessments-calendar.js','AKP_ASSESSMENT_CALENDAR_READY'],
    ['akp-visio-notes.js','AKP_VISIO_NOTES_READY'],
    ['akp-cycle-management.js','AKP_CYCLES_READY'],
    ['akp-questionnaire-ux.js','AKP_QUESTIONNAIRE_UX_READY'],
    ['akp-weekly-checkin.js','AKP_WEEKLY_CHECKIN_READY'],
    ['akp-athlete-passport.js','AKP_ATHLETE_PASSPORT_READY'],
    ['akp-passport-premium.js','AKP_PASSPORT_PREMIUM_READY'],
    ['akp-passport-header-clean.js','AKP_PASSPORT_HEADER_CLEAN_READY'],
    ['akp-sport-milestones.js','AKP_SPORT_MILESTONES_READY'],
    ['akp-progress-premium.js','AKP_PASSPORT_PROGRESSION_READY'],
    ['akp-timeline-compact.js','AKP_COMPACT_TIMELINE_READY'],
    ['akp-followup-qualitative.js','AKP_QUALITATIVE_FOLLOWUP_READY'],
    ['akp-admin-accordions.js','AKP_ADMIN_ACCORDIONS_READY'],
    ['akp-calendar-compact.js','AKP_CALENDAR_COMPACT_READY'],
    ['akp-test-account-portal.js','AKP_TEST_ACCOUNT_PORTAL_READY']
  ];
  window.AKP_MODULE_FAILURE='';
  window.AKP_MODULE_READY=false;
  function fail(file,why){
    window.AKP_MODULE_FAILURE=file+' : '+why;
    console.error('AK PRIME — chargement du back-office :',window.AKP_MODULE_FAILURE);
    if(['owner','coach'].includes(authProfile?.role)){
      let warning=document.getElementById('akpModuleWarning');
      if(!warning){
        warning=document.createElement('div');
        warning.id='akpModuleWarning';
        warning.style.cssText='position:fixed;z-index:999999;bottom:15px;left:15px;right:15px;background:#fff1e8;color:#7a2600;border:1px solid #e6a07a;border-radius:12px;padding:14px;box-shadow:0 10px 30px #0002;font:14px Arial,sans-serif';
        document.body.appendChild(warning);
      }
      warning.textContent='AK PRIME : un module du back-office n’a pas chargé ('+file+'). Recharge la page. Si cela persiste, transmets cette erreur : '+why;
    }
  }
  function next(i){
    if(i===sequence.length){
      window.AKP_MODULE_READY=true;
      if(authUser&&['owner','coach'].includes(authProfile?.role)){
        loadSupabaseData().then(()=>render()).catch(e=>fail('actualisation Supabase',e.message));
      }else if(authUser&&authProfile?.role==='client'){
        // Réinitialise l’espace client si le module a été chargé après la session.
        enterClientPortal(authUser,authProfile).catch(e=>
          console.error('AK PRIME : affichage des outils client',e));
      }
      return;
    }
    const [file,flag]=sequence[i];
    const script=document.createElement('script');
    script.src='./'+file+'?rev=20261023-connected-test-client-v57';
    script.onload=()=>{
      if(window[flag]!==true){fail(file,'le module n’a pas terminé son initialisation');return;}
      next(i+1);
    };
    script.onerror=()=>fail(file,'fichier inaccessible ou non publié');
    document.body.appendChild(script);
  }
  document.addEventListener('click',event=>{
    if(!window.AKP_MODULE_FAILURE||!event.target.closest?.('#newClient'))return;
    event.preventDefault();event.stopImmediatePropagation();
    alert('Le nouveau formulaire n’est pas disponible : '+window.AKP_MODULE_FAILURE);
  },true);
  next(0);
})();


// Création client fiable : route prioritaire déclenchée directement depuis ce
// script déjà inclus par index.html (sans dépendre de modules optionnels).
(function(){
 'use strict';
 const RELEASE='engagement-direct-20261021-v1';
 window.AKP_CLIENT_CREATE_RELEASE=RELEASE;
 const options={
   'Performance':['P1','P2','P3'],
   'Forme & Santé':['Standard','Renforcé'],
   'Mental':['Particulier','Sportif']
 };
 function monthEnd(date,months){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return '';
   const [year,month,day]=date.split('-').map(Number);
   const test=new Date(Date.UTC(year,month-1,day,12));
   if(Number.isNaN(test.getTime())||test.getUTCFullYear()!==year||
      test.getUTCMonth()!==month-1||test.getUTCDate()!==day)return '';
   const shifted=new Date(Date.UTC(year,month-1+months,1,12));
   const maximum=new Date(Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth()+1,0,12)).getUTCDate();
   shifted.setUTCDate(Math.min(day,maximum));
   return shifted.toISOString().slice(0,10);
 }
 function openDirectForm(){
   if(authProfile?.role!=='owner')return alert('Création réservée au propriétaire AK PRIME.');
   if(typeof modal!=='function'||!supa?.rpc){
     return alert('Le back-office n’est pas totalement chargé. Actualise et reconnecte-toi.');
   }
   modal('Nouveau client',
     '<div class="grid2">'+
     '<div class="field"><label>Nom et prénom</label><input id="mName" class="input" autocomplete="name" maxlength="200"></div>'+
     '<div class="field"><label>E-mail</label><input id="mEmail" class="input" type="email" autocomplete="email" maxlength="255"></div>'+
     '<div class="field"><label>Téléphone <span class="muted tiny">(facultatif)</span></label><input id="mPhone" class="input" type="tel" autocomplete="tel" maxlength="40" placeholder="06 12 34 56 78 ou +33 6..."></div>'+
     '<div class="field"><label>Pôle</label><select id="mPole" class="select"><option>Performance</option><option>Forme & Santé</option><option>Mental</option></select></div>'+
     '<div class="field"><label>Offre</label><select id="mOffer" class="select"></select></div>'+
     '<div class="field"><label>Date de début</label><input id="mStart" type="date" class="input" value="'+localDateISO()+'"></div>'+
     '<div class="field"><label>Engagement initial</label><select id="mDuration" class="select">'+
     '<option value="3">3 mois</option><option value="6">6 mois</option></select></div>'+
     '<div class="field"><label>Date de fin automatique</label><input id="mEnd" type="date" class="input" readonly></div>'+
     '<div class="field"><label>Statut paiement (manuel)</label><select id="mPayment" class="select">'+
     '<option>En attente</option><option>À jour</option></select></div></div>'+
     '<div class="alert blue" style="margin-top:10px">La durée initiale est de 3 ou 6 mois. Le mensuel est proposé au renouvellement. '+
     'La fin est calculée automatiquement et le portail reste désactivé avant validation.</div>'+
     '<div class="muted tiny" style="margin-top:7px">Version du formulaire : '+RELEASE+'</div>',
     '<button class="btn ghost" id="cancelM">Annuler</button>'+
     '<button class="btn primary" id="saveM">Créer dans Supabase</button>');
   const get=id=>document.getElementById(id);
   function syncOffers(){
     const pole=get('mPole')?.value;
     get('mOffer').innerHTML=(options[pole]||[]).map(x=>'<option>'+x+'</option>').join('');
   }
   function syncEnd(){
     get('mEnd').value=monthEnd(get('mStart').value,Number(get('mDuration').value));
   }
   get('mPole').onchange=syncOffers;
   get('mStart').onchange=syncEnd;
   get('mDuration').onchange=syncEnd;
   get('cancelM').onclick=closeModal;
   syncOffers();syncEnd();
   get('saveM').onclick=async()=>{
     const name=get('mName').value.trim();
     const email=get('mEmail').value.trim(),phone=get('mPhone').value.trim();
     const pole=get('mPole').value,offer=get('mOffer').value;
     const start=get('mStart').value,duration=Number(get('mDuration').value);
     const end=monthEnd(start,duration);
     if(name.length<2)return alert('Renseigne le nom et le prénom.');
     if(email&&!get('mEmail').checkValidity())return alert('E-mail invalide.');
     if(phone&&(!/^[+0-9 ().-]+$/.test(phone)||phone.replace(/[^0-9]/g,'').length<8||phone.replace(/[^0-9]/g,'').length>15))return alert('Numéro de téléphone invalide.');
     if(!end||![3,6].includes(duration))return alert('Date de début ou engagement invalide.');
     if(get('mPayment').value==='À jour'&&!confirm('Ce statut est manuel et ne prouve pas un paiement Stripe. Confirmer ?'))return;
     const words=name.split(/\s+/);
     const first=words.shift()||'',last=words.join(' ')||'-';
     const btn=get('saveM');btn.disabled=true;
     try{
       const {data,error}=await supa.rpc('owner_create_client_with_phone',{
         p_first_name:first,p_last_name:last,p_email:email||null,p_phone:phone||null,
         p_pole:pole,p_offer:offer,p_start_date:start,p_initial_months:duration,
         p_payment_status:get('mPayment').value
       });
       if(error)throw Error(error.message);
       closeModal();
       await loadSupabaseData();
       state.view='client';state.clientId=data;state.tab='overview';render();
       toast('Dossier créé : engagement '+duration+' mois, échéance '+fmtDate(end));
     }catch(err){
       alert('Le dossier n’a pas pu être créé : '+err.message);
       btn.disabled=false;
     }
   };
 }
 // Capture de l'action avant le handler historique d'index.html.
 document.addEventListener('click',event=>{
   const button=event.target.closest?.('#newClient');
   if(!button)return;
   event.preventDefault();
   event.stopImmediatePropagation();
   event.stopPropagation();
   openDirectForm();
 },true);
})();

// Le numéro demandé dans chacun des trois questionnaires initiaux est prérempli
// lorsqu'il a déjà été saisi par le coach à la création du dossier.
(function(){
 'use strict';
 if(typeof renderClientQuestionnaire!=='function')return;
 const original=renderClientQuestionnaire;
 renderClientQuestionnaire=function(template,answers){
   if(!template?.questions?.some(q=>q.key==='phone'))return original(template,answers);
   const fromDossier=clientPortalState?.client?.phone||'';
   const safeAnswers={...(answers||{})};
   if(!safeAnswers.phone&&fromDossier)safeAnswers.phone=fromDossier;
   return original(template,safeAnswers);
 };
})();
