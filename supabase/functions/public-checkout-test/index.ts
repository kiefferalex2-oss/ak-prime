import Stripe from "npm:stripe@22.0.0";
import {createClient} from "npm:@supabase/supabase-js@2.95.0";

const url=Deno.env.get("SUPABASE_URL")||"";
const key=Deno.env.get("SUPABASE_ANON_KEY")||"";
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const secret=Deno.env.get("STRIPE_SECRET_KEY")||"";
const enabled=Deno.env.get("AKP_STRIPE_TEST_ENABLED")==="true"&&secret.startsWith("sk_test_");
const admin=url&&service?createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const stripe=enabled?new Stripe(secret):null;
const allowed=new Set(["https://akprime.fr","https://www.akprime.fr"]);
const allowedHeaders="authorization,apikey,content-type,x-client-info";
const hex=(arr:Uint8Array)=>Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");
const digest=async(token:string)=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))));
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const reply=(value:unknown,status=200,origin="https://akprime.fr")=>new Response(JSON.stringify(value),{
 status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin",
 "Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":allowedHeaders,
 "Access-Control-Allow-Methods":"POST,OPTIONS"}});
const onlyId=(x:unknown):string|null=>typeof x==="string"?x:x&&typeof x==="object"&&"id"in x?String((x as {id:string}).id):null;
async function paidInvoice(order:{stripe_session_id:string,payment_mode:string,stripe_subscription_id?:string}){
 if(!stripe)return null;
 const sess=await stripe.checkout.sessions.retrieve(order.stripe_session_id);
 let id=onlyId(sess.invoice);
 if(!id&&order.payment_mode==="monthly"&&order.stripe_subscription_id){
  const sub=await stripe.subscriptions.retrieve(order.stripe_subscription_id);
  id=onlyId(sub.latest_invoice);
 }
 if(!id)return null;
 const inv=await stripe.invoices.retrieve(id);
 if(inv.livemode||inv.status!=="paid")return null;
 return {invoiceNumber:inv.number||"FACTURE-TEST",hostedUrl:inv.hosted_invoice_url||null,pdfUrl:inv.invoice_pdf||null};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const cors=allowed.has(origin)?origin:"https://akprime.fr";
 if(req.method==="OPTIONS")return reply({},200,cors);
 if(req.method!=="POST")return reply({error:"Méthode refusée"},405,cors);
 if(origin&&!allowed.has(origin))return reply({error:"Origine interdite"},403,cors);
 if(!admin||!stripe)return reply({error:"Simulations Stripe indisponibles"},503,cors);
 let body:Record<string,unknown>={};
 try{const raw=await req.text();if(raw.length>3500)throw Error();body=JSON.parse(raw);
   if(!body||Array.isArray(body)||typeof body!=="object")throw Error();
 }catch{return reply({error:"Données invalides"},400,cors)}
 const action=String(body.action||"");
 if(action==="issue"){
  const bearer=req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if(!bearer)return reply({error:"Session propriétaire requise"},401,cors);
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const user=await auth.auth.getUser(bearer);
  if(user.error||!user.data.user)return reply({error:"Session invalide"},401,cors);
  const owner=user.data.user.id;
  const role=await admin.from("profiles").select("role").eq("id",owner).single();
  if(role.error||role.data?.role!=="owner")return reply({error:"Accès propriétaire uniquement"},403,cors);
  const count=await admin.from("stripe_test_invites").select("id",{count:"exact",head:true}).eq("owner_user_id",owner)
    .gte("created_at",new Date(Date.now()-86400000).toISOString());
  if(count.error||Number(count.count)>7)return reply({error:"Nombre quotidien de simulations atteint"},429,cors);
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  const hashed=await digest(token);
  const created=await admin.from("stripe_test_invites").insert({owner_user_id:owner,token_hash:hashed}).select("id").single();
  if(created.error)return reply({error:"Impossible de créer le lien privé"},500,cors);
  return reply({url:"https://akprime.fr/?akp_test="+token,expiresInMinutes:180},200,cors);
 }
 let token=String(body.ticket||"");
 if(action==="direct_create"){
   const customerEmail=String(body.email||"").trim().toLowerCase();
   const name=String(body.fullName||"").trim();
   const months=Number(body.duration);
   const mode=String(body.paymentMode||"");
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)||name.length<3||name.length>160||
      ![3,6].includes(months)||!["monthly","upfront"].includes(mode)||
      body.acceptedTerms!==true||body.acceptedPrivacy!==true||body.healthConsent!==true)
     return reply({error:"Informations ou consentements de la commande incomplets"},400,cors);
   token=hex(crypto.getRandomValues(new Uint8Array(32)));
   const issued=await admin.rpc("issue_direct_stripe_test_invite",{
      p_token_hash:await digest(token),p_email:customerEmail
   });
   if(issued.error||!issued.data)
      return reply({error:issued.error?.message||"Tests publics temporairement indisponibles"},429,cors);
 }
 if(!/^[0-9a-f]{64}$/.test(token))return reply({error:"Lien de simulation invalide"},401,cors);
 const tokenHash=await digest(token);
 const passQuery=await admin.from("stripe_test_invites").select("*").eq("token_hash",tokenHash).maybeSingle();
 const pass=passQuery.data;
 if(passQuery.error||!pass)return reply({error:"Lien test non reconnu"},403,cors);
 if(new Date(pass.expires_at).getTime()<Date.now())return reply({error:"Lien de test expiré : crée un nouveau lien propriétaire"},410,cors);
 if(action==="check")return reply({valid:!pass.stripe_order_id,paid:!!pass.activated_at},200,cors);
 if(action==="create"||action==="direct_create"){
  if(pass.stripe_order_id)return reply({error:"Lien de test déjà utilisé"},409,cors);
  const offerCode=String(body.offerCode||"");
  const duration=Number(body.duration);
  const paymentMode=String(body.paymentMode||"");
  const fullName=String(body.fullName||"").trim().replace(/\s+/g," ");
  const email=String(body.email||"").trim().toLowerCase();
  const startDate=body.startDate?String(body.startDate):null;
  const earlyStart=body.earlyStart===true;
  if(!/^[a-z0-9_]{5,50}$/.test(offerCode)||![3,6].includes(duration)||
     !["monthly","upfront"].includes(paymentMode)||fullName.length<3||fullName.length>160||
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||
     body.acceptedTerms!==true||body.acceptedPrivacy!==true||body.healthConsent!==true||
     (startDate!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(startDate)))
   return reply({error:"Vérifie le choix, les coordonnées et les consentements"},400,cors);
  if(startDate){
    const days=(Date.parse(startDate+"T12:00:00Z")-Date.parse(new Date().toISOString().slice(0,10)+"T12:00:00Z"))/86400000;
    if(!Number.isFinite(days)||days<0||days>120||(days<14&&!earlyStart))
      return reply({error:"Date ou consentement de démarrage anticipé non valide"},400,cors);
  }
  const query=await admin.rpc("quote_offer",{p_offer_code:offerCode,p_commitment_months:duration,p_payment_mode:paymentMode});
  const quote=Array.isArray(query.data)?query.data[0]:query.data;
  if(query.error||!quote||quote.currency!=="eur")return reply({error:"Devis sécurisé indisponible"},503,cors);
  const amount=paymentMode==="monthly"?quote.monthly_equivalent_cents:quote.total_cents;
  if(paymentMode==="monthly"&&quote.monthly_equivalent_cents*duration!==quote.total_cents)
    return reply({error:"Tarif incohérent"},503,cors);
  const lookup="akp_"+offerCode+"_"+duration+"_"+paymentMode;
  const prices=await stripe.prices.list({lookup_keys:[lookup],active:true,limit:1});
  const price=prices.data[0];
  if(!price||price.livemode||price.currency!=="eur"||price.unit_amount!==amount||
    Boolean(price.recurring)!==(paymentMode==="monthly"))
    return reply({error:"Prix Stripe TEST incohérent"},503,cors);
  const now=new Date().toISOString();
  const inserted=await admin.from("stripe_test_orders").insert({
    owner_user_id:pass.owner_user_id,offer_code:offerCode,commitment_months:duration,
    payment_mode:paymentMode,full_name:fullName,email,monthly_cents:quote.monthly_equivalent_cents,
    total_cents:quote.total_cents,currency:"eur",
    cgv_version:"akprime-cgv-2026-10-20-firm-commitment",accepted_terms_at:now,
    privacy_version:"akprime-privacy-2026-10-20",privacy_accepted_at:now,health_consent_at:now,
    requested_start_date:startDate,explicit_early_start:earlyStart,early_start_at:earlyStart?now:null
  }).select("id").single();
  if(inserted.error||!inserted.data)return reply({error:"Commande de simulation non enregistrée"},500,cors);
  const claim=await admin.from("stripe_test_invites").update({stripe_order_id:inserted.data.id})
    .eq("id",pass.id).is("stripe_order_id",null).select("id").maybeSingle();
  if(claim.error||!claim.data)return reply({error:"Lien utilisé simultanément"},409,cors);
  try{
    const params:Stripe.Checkout.SessionCreateParams={
      mode:paymentMode==="monthly"?"subscription":"payment",
      customer_email:email,client_reference_id:inserted.data.id,
      billing_address_collection:"required",locale:"fr",
      success_url:"https://akprime.fr/?akp_test_return=success&ticket="+token+"&session_id={CHECKOUT_SESSION_ID}",
      cancel_url:"https://akprime.fr/?akp_test_return=cancelled&ticket="+token,
      line_items:[{price:price.id,quantity:1}],
      metadata:{akprime_order_id:inserted.data.id,environment:"test",payment_mode:paymentMode},
      ...(paymentMode==="monthly"?{subscription_data:{metadata:{akprime_order_id:inserted.data.id}}}:{
         invoice_creation:{enabled:true,invoice_data:{metadata:{akprime_test_order_id:inserted.data.id}}},
         payment_intent_data:{metadata:{akprime_order_id:inserted.data.id}}
      })
    };
    const session=await stripe.checkout.sessions.create(params,{idempotencyKey:"akp-public-test-"+inserted.data.id});
    if(!session.url||session.livemode||!session.id.startsWith("cs_test_"))throw Error("Réponse Stripe non conforme");
    const save=await admin.from("stripe_test_orders").update({status:"checkout_created",stripe_session_id:session.id,updated_at:new Date().toISOString()}).eq("id",inserted.data.id);
    if(save.error)throw save.error;
    return reply({url:session.url,mode:"test"},200,cors);
  }catch(error){
    await admin.from("stripe_test_orders").update({status:"failed",last_error:String(error).slice(0,300)}).eq("id",inserted.data.id);
    return reply({error:"Impossible d'ouvrir Checkout TEST. Génère un nouveau lien pour réessayer."},503,cors);
  }
 }
 if(action!=="status"&&action!=="finish")return reply({error:"Action inconnue"},400,cors);
 if(!pass.stripe_order_id)return reply({error:"Aucune commande associée"},404,cors);
 const got=await admin.from("stripe_test_orders").select("*").eq("id",pass.stripe_order_id).single();
 const order=got.data;
 if(got.error||!order)return reply({error:"Commande inconnue"},404,cors);
 const paid=order.status==="paid"&&!!order.paid_at;
 if(action==="status")return reply({
  status:order.status,offerCode:order.offer_code,commitmentMonths:order.commitment_months,
  accountInvited:!!pass.test_client_id,invoiceEmailQueued:!!pass.invoice_email_queued_at
 },200,cors);
 if(!paid||!order.stripe_session_id)return reply({error:"Webhook Stripe TEST non encore confirmé"},409,cors);
 // Supabase generates the signed invitation link without sending its default email.
 // The existing Resend transport sends the AK PRIME branded invitation instead.
 let activationLink:string|null=null;
 let brandedRequired=pass.auth_branded_required===true;
 if(!pass.test_client_id){
   brandedRequired=true;
   let userId=pass.test_auth_user_id as string|null;
   if(!userId){
     const generated=await admin.auth.admin.generateLink({
       type:"invite",email:order.email,
       options:{redirectTo:"https://akprime.fr/reinitialiser-mot-de-passe.html",
        data:{full_name:order.full_name,akprime_test:true}}
     });
     if(generated.error||!generated.data?.user?.id||!generated.data?.properties?.action_link)
       return reply({error:"Impossible de préparer l'invitation sécurisée AK PRIME.",
         details:generated.error?.message||"Lien d'activation absent"},503,cors);
     userId=generated.data.user.id;
     activationLink=generated.data.properties.action_link;
     const saved=await admin.from("stripe_test_invites").update({
       test_auth_user_id:userId,auth_branded_required:true
     })
       .eq("id",pass.id).is("test_auth_user_id",null);
     if(saved.error)return reply({error:"Impossible d'enregistrer l'identité client TEST."},503,cors);
   }
   if(!pass.auth_branded_required && pass.test_auth_user_id){
     const marker=await admin.from("stripe_test_invites").update({
       auth_branded_required:true
     }).eq("id",pass.id);
     if(marker.error)return reply({error:"Impossible de préparer l'invitation AK PRIME."},503,cors);
   }
   const linked=await admin.rpc("provision_invited_stripe_test_client",{
     p_invite_id:pass.id,p_auth_user_id:userId
   });
   if(linked.error)return reply({
     error:"Le compte d'essai a été préparé mais son dossier n'a pas pu être créé.",
     details:linked.error.message
   },503,cors);
 }
 if(brandedRequired && !pass.auth_invite_email_queued_at){
   // If an earlier attempt created the Auth user but email delivery failed, use
   // a fresh recovery link to let that user create their password safely.
   if(!activationLink){
     const recovery=await admin.auth.admin.generateLink({
       type:"recovery",email:order.email,
       options:{redirectTo:"https://akprime.fr/reinitialiser-mot-de-passe.html"}
     });
     if(recovery.error||!recovery.data?.properties?.action_link)
       return reply({error:"Lien de reprise de compte AK PRIME indisponible.",
         details:recovery.error?.message||"Lien manquant"},503,cors);
     activationLink=recovery.data.properties.action_link;
   }
   const sent=await admin.rpc("send_invited_stripe_test_auth_email",{
     p_invite_id:pass.id,p_action_link:activationLink
   });
   if(sent.error)return reply({
     error:"Le compte TEST est créé, mais l'envoi de l'invitation AK PRIME a échoué. Réessaie « Vérifier mon paiement TEST ».",
     details:sent.error.message
   },503,cors);
 }
 let invoice:null|{invoiceNumber:string,hostedUrl:string|null,pdfUrl:string|null}=null;
 try{invoice=await paidInvoice(order)}catch(e){console.warn("Invoice TEST pending",String(e).slice(0,200))}
 if(invoice?.hostedUrl&&!pass.invoice_email_queued_at){
   try{
     const mailed=await admin.rpc("send_invited_stripe_test_invoice",{
       p_invite_id:pass.id,p_invoice_number:invoice.invoiceNumber,p_invoice_url:invoice.hostedUrl
     });
     if(mailed.error)console.warn("Test invoice email queue failed",mailed.error.message.slice(0,160));
   }catch(e){console.warn("Test invoice mail unavailable",String(e).slice(0,140))}
 }
 return reply({
    status:"paid",invited:true,
    message:"Invitation AK PRIME personnalisée préparée pour envoi : vérifie tes e-mails et crée ton mot de passe.",
    invoice:invoice
 },200,cors);
});
