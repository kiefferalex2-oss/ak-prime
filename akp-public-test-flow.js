/* Parcours de souscription simulée AK PRIME, depuis les véritables cartes d'offres.
   Le lien unique est généré depuis l'espace propriétaire du banc Stripe.
*/
(function(){
 'use strict';
 const query=new URLSearchParams(location.search);
 const ticket=query.get('akp_test')||query.get('ticket')||'';
 window.AKP_PUBLIC_TEST_TOKEN=/^[a-f0-9]{64}$/.test(ticket)?ticket:'';
 // Ne jamais ecraser le mode TEST deja conserve dans cet onglet par le site principal.
 window.AKP_PUBLIC_TEST_MODE=!!window.AKP_PUBLIC_TEST_TOKEN||window.AKP_PUBLIC_TEST_MODE===true;
 window.AKP_LIVE_CHECKOUT_MODE=!window.AKP_PUBLIC_TEST_MODE;
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
 css.textContent=[
 '.akpt-banner{position:fixed;bottom:12px;left:12px;z-index:100000;background:#162942;color:#fff;border:1px solid #d9b56d;border-radius:11px;padding:10px 14px;font:700 12px system-ui;box-shadow:0 8px 30px #0003}',
 '.akpt-box{position:fixed;inset:0;z-index:110000;background:#06121de0;display:grid;place-items:center;padding:18px;backdrop-filter:blur(9px)}',
 '.akpt-panel{width:min(520px,100%);border:1px solid #d8b16d99;border-radius:23px;background:linear-gradient(155deg,#1b304a,#0f1e32);color:#eef5fc;padding:clamp(24px,5vw,39px);box-shadow:0 25px 80px #0008;font:14px/1.7 system-ui;text-align:center}',
 '.akpt-panel h2{font-size:clamp(22px,5vw,29px);line-height:1.25;margin:0 0 10px;color:#fff}',
 '.akpt-panel p{font-size:14px;line-height:1.65;color:#c4d4e3;margin:0 0 17px}',
 '.akpt-panel .akpt-mark{display:grid;place-items:center;margin:0 auto 19px;border:1px solid #d9b56d;border-radius:50%;width:58px;height:58px;color:#eac987;font-size:28px;background:#ffffff08}',
 '.akpt-panel .akpt-logo{display:block;width:192px;max-width:75%;height:auto;margin:0 auto 27px}',
 '.akpt-panel .akpt-label{color:#e7c17c;font-size:10px;letter-spacing:.13em;font-weight:900;margin:0 0 16px}',
 '.akpt-panel .akpt-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:18px}',
 '.akpt-panel a,.akpt-panel button{display:inline-flex;align-items:center;justify-content:center;padding:11px 17px;border:1px solid #d5b477;border-radius:11px;background:#d8b16d;color:#14253b;text-decoration:none;font-size:13px;font-weight:850;cursor:pointer}',
 '.akpt-panel a.akpt-secondary,.akpt-panel button.akpt-secondary{background:transparent;color:#f0d7a8}',
 '.akpt-panel .akpt-invoice{font-size:12px;color:#b6c9dc;margin-top:19px}',
 '@media(prefers-reduced-motion:reduce){.akpt-box{backdrop-filter:none}}'
 ].join('');
 document.head.appendChild(css);
 const label=document.createElement('div');label.className='akpt-banner';
 label.textContent='AK PRIME · MODE TEST / AUCUN PAIEMENT RÉEL';
 if(window.AKP_PUBLIC_TEST_MODE)document.body.append(label);
 if(!window.AKP_PUBLIC_TEST_TOKEN||!['success','cancelled'].includes(result))return;
 const backdrop=document.createElement('div');backdrop.className='akpt-box';backdrop.setAttribute('role','status');backdrop.setAttribute('aria-live','polite');
 const panel=document.createElement('section');panel.className='akpt-panel';
 const logo=document.createElement('img');logo.className='akpt-logo';logo.alt='AK PRIME';logo.src='/assets/ak-prime-wordmark-white-gold.svg';
 const labelText=document.createElement('div');labelText.className='akpt-label';labelText.textContent='SIMULATION · AUCUN PAIEMENT RÉEL';
 const mark=document.createElement('div');mark.className='akpt-mark';mark.textContent=result==='cancelled'?'×':'✓';
 const heading=document.createElement('h2');
 const paragraph=document.createElement('p');
 const details=document.createElement('div');
 const actions=document.createElement('div');actions.className='akpt-actions';
 const close=document.createElement('button');close.textContent='Retour à AK PRIME';close.type='button';
 close.onclick=()=>{backdrop.remove();history.replaceState(null,'',location.pathname+location.hash)};
 actions.append(close);panel.append(logo,labelText,mark,heading,paragraph,details,actions);backdrop.append(panel);document.body.append(backdrop);
 const api=action=>window.AKP_PUBLIC_TEST_REQUEST({action,ticket:window.AKP_PUBLIC_TEST_TOKEN});
 const addInvoiceLink=(label,url)=>{
   if(typeof url!=='string'||!/^https:\/\/[^/]+/.test(url))return;
   const link=document.createElement('a');link.className='akpt-secondary';link.href=url;
   link.target='_blank';link.rel='noopener noreferrer';link.textContent=label;actions.prepend(link);
 };
 if(result==='cancelled'){
   heading.textContent='Paiement annulé';
   paragraph.textContent='La simulation a été interrompue. Aucun paiement n’a été effectué.';
   return;
 }
 heading.textContent='Merci pour ta confiance';
 paragraph.textContent='Nous préparons ton espace AK PRIME. Tu vas recevoir un e-mail pour créer ton mot de passe.';
 let busy=false,finished=false;
 const showIssue=message=>{
   heading.textContent='Ton inscription est en cours';
   mark.textContent='…';
   paragraph.textContent=message;
   if(!details.querySelector('button')){
     const retry=document.createElement('button');retry.type='button';retry.className='akpt-secondary';
     retry.textContent='Réessayer';retry.onclick=()=>{retry.remove();void finalize(0)};
     details.append(retry);
   }
 };
 async function finalize(attempt){
   if(busy||finished)return;busy=true;
   try{
     const status=await api('status');
     if(status.status==='paid'){
       // Le paiement est confirme par Stripe via le serveur; la finalisation
       // du compte et des e-mails ne s'effectue jamais sur un simple retour URL.
       const done=await api('finish');
       if(!done||done.ok===false||done.error)throw Error('finalisation');
       finished=true;
       mark.textContent='✓';heading.textContent='Bienvenue chez AK PRIME !';
       paragraph.textContent='Ta souscription de simulation est confirmée. Consulte ton e-mail pour créer ton mot de passe et compléter ton profil. Vérifie aussi les courriers indésirables.';
       details.replaceChildren();
       if(done.invoice){
         const inv=done.invoice;
         const note=document.createElement('div');note.className='akpt-invoice';
         note.textContent='Ta facture de simulation est disponible ci-dessous.';
         details.append(note);
         addInvoiceLink('Voir la facture TEST',inv.hostedUrl);
         addInvoiceLink('Télécharger le PDF',inv.pdfUrl);
       }
       history.replaceState(null,'',location.pathname+location.hash);
       return;
     }
     if(['pending','created','open','unpaid','processing'].includes(status.status)&&attempt<8){
       busy=false;
       setTimeout(()=>void finalize(attempt+1),Math.min(2200,900+attempt*200));
       return;
     }
     showIssue('Nous attendons encore la confirmation de ta simulation. Ne recommence pas le paiement : tu peux réessayer ici ou contacter contact@akprime.fr.');
   }catch(error){
     showIssue('Le paiement fictif a peut-être été enregistré, mais la préparation de ton compte n’est pas terminée. Ne repaie pas. Tu peux réessayer ici ou nous écrire à contact@akprime.fr.');
   }finally{busy=false}
 }
 void finalize(0);
})();