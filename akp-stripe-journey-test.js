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
window.AKP_initStripeJourney=loadPaidOrder;
})();
