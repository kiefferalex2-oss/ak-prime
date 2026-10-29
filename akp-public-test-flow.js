/* Parcours de souscription simulée AK PRIME, depuis les véritables cartes d'offres.
   Le lien unique est généré depuis l'espace propriétaire du banc Stripe.
*/
(function(){
 'use strict';
 const query=new URLSearchParams(location.search);
 const ticket=query.get('akp_test')||query.get('ticket')||'';
 window.AKP_PUBLIC_TEST_TOKEN=/^[a-f0-9]{64}$/.test(ticket)?ticket:'';
 window.AKP_PUBLIC_TEST_MODE=true;
 // Public sandbox endpoint: use the publishable key on apikey, not as a bearer JWT.
 window.AKP_PUBLIC_TEST_REQUEST=async(payload)=>{
  const res=await fetch('https://gptvgldboqarfklorjip.supabase.co/functions/v1/public-checkout-test',{
   method:'POST',
   headers:{'Content-Type':'application/json',
    'apikey':'sb_publishable_wvFEmkJCeJxDw8HhTmipaw_z2J9a8sx'},
   body:JSON.stringify(payload),
   cache:'no-store'
  });
  const raw=await res.text();
  let result={};
  try{result=JSON.parse(raw)}catch{}
  if(!res.ok){
   const text=typeof result.error==='string'?result.error:
    typeof result.message==='string'?result.message:'Erreur HTTP '+res.status;
   const gateway=res.headers.get('sb-error-code');
   throw Error(text+(gateway?' ('+gateway+')':'')+' [HTTP '+res.status+']');
  }
  return result;
 };
 const result=query.get('akp_test_return')||'';
 const css=document.createElement('style');
 css.textContent='.akpt-banner{position:fixed;bottom:12px;left:12px;z-index:100000;background:#162942;color:#fff;border:1px solid #d9b56d;border-radius:11px;padding:10px 14px;font:700 12px system-ui;box-shadow:0 8px 30px #0003}.akpt-box{position:fixed;inset:0;z-index:110000;background:#06121dc9;display:grid;place-items:center;padding:18px}.akpt-panel{width:min(560px,100%);border-radius:18px;background:#172a42;color:#f2f6fa;padding:26px;box-shadow:0 25px 80px #0008;font-family:system-ui}.akpt-panel h2{font-size:27px;margin:0 0 12px}.akpt-panel p{font-size:14px;line-height:1.6}.akpt-panel button{padding:13px 17px;background:#d8b16d;color:#17202f;border:none;border-radius:9px;cursor:pointer;font-weight:800}.akpt-panel a{color:#f2d290}.akpt-small{font-size:12px;opacity:.8}.akpt-message{white-space:pre-wrap;padding:10px;background:#203850;border-radius:9px;margin:12px 0}';
 document.head.appendChild(css);
 const label=document.createElement('div');
 label.className='akpt-banner';
 label.textContent='AK PRIME · MODE TEST / AUCUN PAIEMENT RÉEL';
 if(window.AKP_PUBLIC_TEST_MODE)document.body.appendChild(label);
 if(!window.AKP_PUBLIC_TEST_TOKEN)return;
 if(result!=='success'&&result!=='cancelled')return;
 const backdrop=document.createElement('div');backdrop.className='akpt-box';
 const panel=document.createElement('div');panel.className='akpt-panel';backdrop.appendChild(panel);document.body.appendChild(backdrop);
 const heading=document.createElement('h2');heading.textContent='Ton parcours client AK PRIME — TEST';panel.appendChild(heading);
 const paragraph=document.createElement('p');paragraph.textContent=result==='cancelled'?'Le paiement a été annulé. Aucun compte client n’a été créé.':'Le retour depuis Stripe ne confirme pas le paiement. Vérifions la confirmation du webhook sécurisé.';panel.appendChild(paragraph);
 const status=document.createElement('div');status.className='akpt-message';status.textContent='Vérification en cours…';panel.appendChild(status);
 const details=document.createElement('div');panel.appendChild(details);
 const retry=document.createElement('button');retry.type='button';retry.textContent='Vérifier mon paiement TEST';panel.appendChild(retry);
 const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.style.marginLeft='10px';panel.appendChild(close);
 close.onclick=()=>backdrop.remove();
 const newTest=document.createElement('button');
 newTest.type='button';
 newTest.textContent='Recommencer une nouvelle souscription TEST';
 newTest.style.display='block';
 newTest.style.marginTop='14px';
 newTest.onclick=()=>location.assign('https://akprime.fr/#offres');
 panel.appendChild(newTest);
 const api=async(action)=>{
  return window.AKP_PUBLIC_TEST_REQUEST({action,ticket:window.AKP_PUBLIC_TEST_TOKEN});
 };
 const addLink=(label,url)=>{
  if(!/^https:\/\//.test(url||''))return;
  const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;
  const p=document.createElement('p');p.appendChild(a);details.appendChild(p);
 };
 let busy=false;
 async function verify(){
  if(busy)return;busy=true;retry.disabled=true;details.replaceChildren();
  try{
   const x=await api('status');
   if(x.status==='paid'){
    status.textContent='Paiement Stripe TEST confirmé. Préparation de ton e-mail d’inscription…';
    const done=await api('finish');
    status.textContent='Paiement TEST confirmé. '+done.message+' Vérifie également le dossier Courriers indésirables.';
    if(done.invoice){
     const inv=done.invoice;
     const p=document.createElement('p');p.textContent='Facture Stripe de simulation : '+(inv.invoiceNumber||'');details.appendChild(p);
     addLink('Consulter la facture TEST',inv.hostedUrl);
     addLink('Télécharger la facture TEST en PDF',inv.pdfUrl);
    }else{
     const p=document.createElement('p');p.className='akpt-small';p.textContent='La facture Stripe TEST peut prendre quelques instants avant d’être disponible. Revérifie après actualisation.';details.appendChild(p);
    }
    const p=document.createElement('p');p.textContent='Lorsque tu reçois l’e-mail AK PRIME, ouvre le lien sécurisé, définis ton mot de passe (12 caractères minimum), puis connecte-toi pour remplir ton questionnaire initial.';details.appendChild(p);
   }else{
    status.textContent='Statut Stripe TEST : '+x.status+'. Aucun compte ne sera ouvert avant confirmation du paiement.';
   }
  }catch(error){status.textContent=error.message||'Vérification indisponible';}
  finally{busy=false;retry.disabled=false;}
 }
 retry.onclick=verify;
 if(result==='success')verify();
 else status.textContent='Paiement annulé. Clique sur « Recommencer une nouvelle souscription TEST » pour générer une nouvelle commande depuis les offres.';
})();
