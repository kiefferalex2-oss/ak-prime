/* AK PRIME — Parcours client fictif après paiement Stripe TEST confirmé.
 * Réservé à la session propriétaire ; n'active aucune facturation.
 */
(function(){
'use strict';
let lastOrder=null;
async function loadPaidOrder(){
 const {data,error}=await supa.functions.invoke('stripe-test-checkout',{body:{action:'latest_paid'}});
 if(error||!data?.order)return;
 const o=data.order;
 lastOrder=o;
 e('journeyCard').classList.remove('hidden');
 e('provisionClient').classList.toggle('hidden',!!o.test_client_id);
 if(o.test_client_id&&!e('demoEmail').value){
  show('provisionStatus','Compte TEST déjà associé à cette transaction. Réutilise les identifiants conservés.');
 }
 if(!sessionId){
  e('resultCard').classList.remove('hidden');
  e('resultText').textContent='Dernier paiement Stripe TEST confirmé. Tu peux continuer le parcours.';
  show('resultDetails','Offre : '+o.offer_code+' · '+o.commitment_months+' mois · '+o.payment_mode);
 }
}
e('provisionClient').onclick=async()=>{
 if(!lastOrder||lastOrder.status!=='paid'||lastOrder.test_client_id)return;
 const button=e('provisionClient');
 button.disabled=true;
 try{
  const result=await supa.functions.invoke('owner-create-test-client',{body:{paidOrderId:lastOrder.id}});
  const data=result.data;
  if(result.error||!data?.success)throw Error(data?.error||result.error?.message||'Création impossible');
  e('demoEmail').value=data.email;
  e('demoPassword').value=data.password;
  e('credentialsCard').classList.remove('hidden');
  show('provisionStatus','Compte TEST créé. Conserve les identifiants et connecte-toi au portail en navigation privée.');
  await loadPaidOrder();
 }catch(err){
  show('provisionStatus',err.message||'Erreur de création',true);
 }finally{button.disabled=false}
};
e('copyDemo').onclick=async()=>{
 const text='AK PRIME · COMPTE TEST\nIdentifiant : '+e('demoEmail').value+'\nMot de passe : '+e('demoPassword').value;
 try{
  await navigator.clipboard.writeText(text);
  show('provisionStatus','Identifiants copiés.');
 }catch{
  show('provisionStatus','Sélectionne et copie les champs ci-dessus.',true);
 }
};
e('refresh').addEventListener('click',loadPaidOrder);
window.AKP_initStripeJourney=loadPaidOrder;
})();
