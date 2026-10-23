/* AK PRIME — Compte test connecté : création propriétaire et changement de formule en libre-service.
 * Jamais de paiement ni facturation réels.
 */
(function(){
'use strict';
const OFFERS=[
 ['performance_p1','Performance — P1'],['performance_p2','Performance — P2'],['performance_p3','Performance — P3'],
 ['forme_standard','Forme & Santé — Standard'],['forme_renforce','Forme & Santé — Renforcé'],
 ['mental_particulier','Préparation mentale — Particulier'],['mental_sportif','Préparation mentale — Sportif']
];
const css=document.createElement('style');
css.textContent=[
 '.akTestPortalBand{background:#f4f8fc;border:1px solid #cfdeea;border-radius:13px;padding:15px 18px;margin:0 0 15px;color:#233d54}',
 '.akTestPortalTitle{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}',
 '.akTestPortalBand strong{font-size:14px}.akTestPortalBand p{font-size:12px;color:#6c8092;line-height:1.55;margin:5px 0 9px}',
 '.akTestPortalControls{display:flex;align-items:center;gap:9px;flex-wrap:wrap}',
 '.akTestPortalControls select{max-width:350px;min-width:180px;flex:1}',
 '.akTestPill{background:#e8edf4;color:#41617b;padding:4px 9px;border-radius:99px;font-weight:850;font-size:10px}',
 '.akDemoOwnerBtn{border-color:#d7c39d!important;color:#85622f!important}',
 '.akDemoCredential{background:#f7f9fb;padding:12px;border-radius:8px;border:1px solid #dfe7ee;overflow-wrap:anywhere;margin:8px 0}',
 '.akDemoCredential code{font-size:13px;user-select:all}',
 '@media(max-width:650px){.akTestPortalControls{display:grid;grid-template-columns:1fr}.akTestPortalControls select{max-width:none}}'
].join('\n');document.head.appendChild(css);

function options(selected='performance_p1'){
 return OFFERS.map(([key,label])=>'<option value="'+key+'" '+(key===selected?'selected':'')+'>'+esc(label)+'</option>').join('');
}
function testOfferCode(c){
 const matched=OFFERS.find(([_,label])=>{
  const parts=label.split(' — ');
  return (parts[0]==='Préparation mentale'?'Mental':parts[0])===c.current_pole&&parts[1]===c.current_offer;
 });
 return matched?.[0]||'performance_p1';
}
function insertOwnerAction(){
 if(authProfile?.role!=='owner'||state.view!=='clients')return;
 const toolbar=document.querySelector('.toolbar');
 if(!toolbar||toolbar.querySelector('#akMakeLinkedTestClient'))return;
 const btn=document.createElement('button');btn.type='button';btn.className='btn ghost small akDemoOwnerBtn';
 btn.id='akMakeLinkedTestClient';btn.textContent='+ Compte client TEST avec connexion';
 toolbar.appendChild(btn);
 btn.onclick=openTestCreation;
 if(!toolbar.querySelector('#akRefreshTestClients')){
  const refresh=document.createElement('button');
  refresh.type='button';refresh.className='btn ghost small';
  refresh.id='akRefreshTestClients';refresh.textContent='↻ Actualiser les dossiers';
  toolbar.appendChild(refresh);
  refresh.onclick=async()=>{
   refresh.disabled=true;
   try{await loadSupabaseData();render();toast('Dossiers actualisés depuis Supabase.')}
   catch(e){refresh.disabled=false;alert('Actualisation impossible : '+e.message)}
  };
 }
}
const originalRender=render;
render=function(...args){
 const result=originalRender.apply(this,args);
 insertOwnerAction();
 return result;
};
function openTestCreation(){
 if(authProfile?.role!=='owner')return;
 modal('Créer un véritable compte client TEST',
  '<div class="alert blue"><strong>Simulation sans paiement.</strong>'+
   '<div class="tiny" style="margin-top:6px">Ce compte aura un identifiant et un mot de passe Supabase, sera visible dans ton back-office, mais ne pourra pas être facturé comme un vrai client. L’accompagnement sera simulé comme actif, pour tester toutes les rubriques.</div></div>'+
   '<div class="field" style="margin-top:13px"><label>Nom de démonstration</label>'+
    '<input class="input" id="akTestAccountName" value="Client Test AK PRIME" maxlength="100"></div>'+
   '<div class="field"><label>Formule au premier démarrage</label><select class="select" id="akTestAccountOffer">'+options()+'</select></div>'+
   '<p class="muted tiny">Tu pourras modifier la formule librement depuis son espace client. Chaque changement remet à zéro la visio initiale du compte TEST en conservant son historique, sans modifier les factures ni les contrats.</p>',
  '<button class="btn ghost" id="akTestCancel">Annuler</button>'+
  '<button class="btn primary" id="akTestConfirm">Créer et générer les identifiants</button>');
 document.getElementById('akTestCancel').onclick=closeModal;
 document.getElementById('akTestConfirm').onclick=async()=>{
  const btn=document.getElementById('akTestConfirm');
  const fullName=document.getElementById('akTestAccountName').value.trim();
  const offerCode=document.getElementById('akTestAccountOffer').value;
  if(fullName.length<3){alert('Indique un nom pour ce client test.');return;}
  btn.disabled=true;btn.textContent='Création sécurisée…';
  try{
   const {data,error}=await supa.functions.invoke('owner-create-test-client',{body:{fullName,offerCode}});
   if(error||!data?.success||!data?.email||!data?.password)
    throw Error(data?.error||error?.message||'Compte non créé');
   const email=data.email,password=data.password;
   await loadSupabaseData();
   state.view='clients';render();
   modal('Compte TEST prêt — identifiants à conserver',
    '<div class="alert green"><strong>Le compte test est prêt.</strong>'+
     '<div class="tiny" style="margin-top:5px">Il apparaît dans ton back-office sous le statut TEST. Aucun règlement n’a été effectué.</div></div>'+
     '<div class="muted tiny" style="margin-top:14px">Identifiant (e-mail)</div>'+
     '<div class="akDemoCredential"><code>'+esc(email)+'</code></div>'+
     '<div class="muted tiny">Mot de passe temporaire</div>'+
     '<div class="akDemoCredential"><code>'+esc(password)+'</code></div>'+
     '<div class="alert" style="margin-top:11px"><strong>Copie ces identifiants maintenant.</strong>'+
      '<div class="tiny" style="margin-top:5px">Le mot de passe n’est pas conservé dans le back-office et ne pourra pas y être récupéré. Ouvre une fenêtre de navigation privée, puis connecte-toi sur le site AK PRIME avec ces identifiants. Garde ta session coach ouverte dans la fenêtre normale.</div></div>',
     '<button class="btn ghost" id="akTestCloseCredentials">Fermer</button>'+
     '<button class="btn primary" id="akTestCopyCredentials">Copier les identifiants</button>');
   document.getElementById('akTestCloseCredentials').onclick=closeModal;
   document.getElementById('akTestCopyCredentials').onclick=async()=>{
    const content='Compte test AK PRIME\nIdentifiant : '+email+'\nMot de passe : '+password;
    try{await navigator.clipboard.writeText(content);toast('Identifiants copiés.')}
    catch{prompt('Copie ces identifiants :',content)}
   };
  }catch(err){
   const active=document.getElementById('akTestConfirm');
   if(active){active.disabled=false;active.textContent='Créer et générer les identifiants';}
   alert('Impossible de créer ce compte : '+(err?.message||'Erreur inconnue'));
  }
 };
}

const renderOriginalPortal=renderClientPortal;
renderClientPortal=function(...args){
 const result=renderOriginalPortal.apply(this,args);
 const c=clientPortalState?.client;
 if(!c?.is_test)return result;
 const main=document.querySelector('.client-portal .client-main');
 if(!main)return result;
 if(main.querySelector('#akClientDemoBanner'))return result;
 const banner=document.createElement('div');banner.className='akTestPortalBand';banner.id='akClientDemoBanner';
 banner.innerHTML='<div class="akTestPortalTitle"><strong>Compte de démonstration AK PRIME</strong><span class="akTestPill">MODE TEST · AUCUN PAIEMENT</span></div>'+
  '<p>Explore les différentes formules et vérifie ton suivi. À chaque changement de formule TEST, l’ancienne visio initiale est annulée dans la simulation et tu peux en réserver une nouvelle. Les factures et contrats ne changent pas.</p>'+
  '<div class="akTestPortalControls"><label for="akDemoSwitchOffer" class="muted tiny">Formule simulée</label>'+
   '<select class="select" id="akDemoSwitchOffer">'+options(testOfferCode(c))+'</select>'+
   '<button type="button" class="btn primary small" id="akDemoApplyOffer">Appliquer cette formule</button>'+
   '<button type="button" class="btn ghost small" id="akDemoRefreshClient">↻ Actualiser mes données</button></div>';
 main.prepend(banner);
 const refresh=banner.querySelector('#akDemoRefreshClient');
 refresh.onclick=async()=>{
  refresh.disabled=true;
  try{
   const previousView=clientPortalView;
   await enterClientPortal(authUser,authProfile);
   clientPortalView=previousView;
   renderClientPortal();
   toast('Données actualisées depuis le dossier coach.');
  }catch(err){refresh.disabled=false;alert('Actualisation indisponible : '+(err?.message||'Erreur'))}
 };
 const btn=banner.querySelector('#akDemoApplyOffer');
 btn.onclick=async()=>{
  const offerCode=banner.querySelector('#akDemoSwitchOffer').value;
  if(offerCode===testOfferCode(c)){toast('Cette formule est déjà sélectionnée.');return}
  btn.disabled=true;btn.textContent='Mise à jour…';
  try{
   const {data,error}=await supa.rpc('change_my_test_offer',{p_offer_code:offerCode});
   if(error||!data?.length)throw Error(error?.message||'Modification refusée');
   const previousView=clientPortalView;
   await enterClientPortal(authUser,authProfile);
   clientPortalView=previousView;
   renderClientPortal();
   toast('Formule TEST modifiée : tes anciennes visios de simulation ont été neutralisées. Ton quota repart de zéro, et tu peux réserver une nouvelle visio initiale.');
  }catch(err){
   btn.disabled=false;btn.textContent='Appliquer cette formule';
   alert('Impossible de modifier la formule test : '+(err?.message||'Erreur.'));
  }
 };
 return result;
};
window.AKP_TEST_ACCOUNT_PORTAL_READY=true;
})();