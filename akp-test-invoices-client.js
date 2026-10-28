/* Documents Stripe TEST accessibles uniquement dans l'espace client authentifié. */
(function(){
 'use strict';
 const escapeValue=x=>esc(String(x??''));
 const safeStripeLink=x=>{
  if(typeof x!=='string')return '';
  try{
   const u=new URL(x);
   return u.protocol==='https:'&&
     (u.hostname==='invoice.stripe.com'||u.hostname==='pay.stripe.com')?u.href:'';
  }catch{return ''}
 };
 const originalEnter=enterClientPortal;
 enterClientPortal=async function(...args){
  await originalEnter.apply(this,args);
  const stateNow=clientPortalState;
  if(!stateNow?.client?.is_test||stateNow.client.auth_user_id!==authUser?.id)return;
  const {data:{session}}=await supa.auth.getSession();
  if(!session?.access_token)return;
  try{
   const res=await fetch('https://gptvgldboqarfklorjip.supabase.co/functions/v1/client-test-invoices',{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':'sb_publishable_wvFEmkJCeJxDw8HhTmipaw_z2J9a8sx',
     'Authorization':'Bearer '+session.access_token},
    body:'{}',cache:'no-store'
   });
   const data=await res.json();
   if(!res.ok)throw Error(data.error||'Erreur HTTP '+res.status);
   if(clientPortalState!==stateNow)return;
   stateNow.akStripeTestInvoices=Array.isArray(data.invoices)?data.invoices:[];
   stateNow.akStripeInvoicesError='';
  }catch(err){
   if(clientPortalState!==stateNow)return;
   stateNow.akStripeTestInvoices=[];
   stateNow.akStripeInvoicesError=err.message||'Factures TEST indisponibles';
  }
  if(clientPortalState===stateNow)renderClientPortal();
 };
 const originalBilling=renderClientBilling;
 renderClientBilling=function(s){
  const testInvoices=s.akStripeTestInvoices||[];
  if(!s.client?.is_test)return originalBilling(s);
  if(!testInvoices.length){
   const base=originalBilling(s);
   if(s.akStripeInvoicesError)return base.replace(
    '<div class="akWowBillingList">',
    '<div class="alert">Chargement des factures Stripe TEST indisponible : '+escapeValue(s.akStripeInvoicesError)+'</div><div class="akWowBillingList">');
   return base;
  }
  const rows=testInvoices.map(inv=>{
   const amount=Number(inv.amount_paid||0)/100;
   const stamp=inv.created?new Date(Number(inv.created)*1000).toLocaleDateString('fr-FR'):'—';
   const hosted=safeStripeLink(inv.url),pdf=safeStripeLink(inv.pdf);
   return '<section class="client-section-card" style="margin-top:15px">'+
    '<div class="row between" style="gap:15px;flex-wrap:wrap">'+
    '<div><div class="muted tiny">FACTURE STRIPE · SIMULATION</div>'+
    '<h3 style="margin:5px 0">'+escapeValue(inv.number||'Facture TEST')+'</h3>'+
    '<div class="muted tiny">Émise le '+escapeValue(stamp)+' · '+
       escapeValue(inv.offer_code||'Accompagnement AK PRIME')+'</div></div>'+
    '<div><strong style="font-size:20px">'+escapeValue(amount.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}))+'</strong>'+
    '<div><span class="status amber">Payé · TEST</span></div></div></div>'+
    '<div class="row" style="margin-top:15px;flex-wrap:wrap;gap:9px">'+
    (hosted?'<a class="btn primary" target="_blank" rel="noopener noreferrer" href="'+escapeValue(hosted)+'">Consulter la facture</a>':'')+
    (pdf?'<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="'+escapeValue(pdf)+'">Télécharger le PDF</a>':'')+
    '</div><p class="muted tiny" style="margin-top:11px">Facture de simulation Stripe. Aucun débit réel ni pièce comptable AK PRIME.</p></section>';
  }).join('');
  const real=(s.invoices||[]).length?originalBilling(s):'';
  return '<div class="client-main akWowBillingPage">'+
    '<div class="client-page-head"><div><h2>Mes factures.</h2>'+
    '<p>Retrouve les documents émis pendant ton parcours de simulation.</p></div>'+
    '<span class="status amber">STRIPE TEST</span></div>'+
    rows+(real?'<details style="margin-top:18px"><summary>Autres documents du dossier</summary>'+real+'</details>':'')+
    '</div>';
 };
 window.AKP_TEST_INVOICES_READY=true;
})();