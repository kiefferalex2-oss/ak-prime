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
    ['akp-offer-tools.js','AKP_OFFER_TOOLS_READY']
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
      }
      return;
    }
    const [file,flag]=sequence[i];
    const script=document.createElement('script');
    script.src='./'+file+'?rev=20261021-engagement-2';
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
