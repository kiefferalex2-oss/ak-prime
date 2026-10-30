import Stripe from "npm:stripe@22.0.0";
import {createClient} from "npm:@supabase/supabase-js@2.95.0";
const url=Deno.env.get("SUPABASE_URL")||"";
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const key=Deno.env.get("STRIPE_LIVE_SECRET_KEY")||"";
const enabled=(key.startsWith("sk_live_")||key.startsWith("rk_live_"))&&(Deno.env.get("STRIPE_LIVE_WEBHOOK_SECRET")||"").startsWith("whsec_");
const allowed=new Set(["https://akprime.fr","https://www.akprime.fr"]);
const respond=(data:unknown,status=200,origin="https://akprime.fr")=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}});
const id=(a:unknown)=>typeof a==="string"?a:a&&typeof a==="object"&&"id"in a?String((a as {id:string}).id):null;
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 const cors=allowed.has(origin)?origin:"https://akprime.fr";
 if(req.method==="OPTIONS")return respond({},200,cors);
 if(req.method!=="POST"||(origin&&!allowed.has(origin)))return respond({error:"Access denied"},403,cors);
 if(!enabled||!url||!service)return respond({error:"Le paiement en production n'est pas encore ouvert."},503,cors);
 let x:any;
 try{x=await req.json();if(!x||typeof x!=="object"||Array.isArray(x))throw Error();}catch{return respond({error:"Invalid payload"},400,cors)}
 const name=String(x.fullName||"").trim(),email=String(x.email||"").trim().toLowerCase(),offer=String(x.offerCode||""),months=Number(x.duration),mode=String(x.paymentMode||"");
 const start=typeof x.startDate==="string"?x.startDate:null;
 if(name.length<3||name.length>160||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!["monthly","upfront"].includes(mode)||![3,6].includes(months)||!/^((performance_p[123])|(forme_(standard|renforce))|(mental_(particulier|sportif)))$/.test(offer)||x.acceptedTerms!==true||x.acceptedPrivacy!==true||x.healthConsent!==true||!x.cgvVersion||String(x.cgvVersion).length>100)return respond({error:"Informations ou consentements incomplets"},400,cors);
 if(start&&!/^\d{4}-\d{2}-\d{2}$/.test(start))return respond({error:"Date invalide"},400,cors);
 const today=new Date().toISOString().slice(0,10);
 if(start){const delta=(Date.parse(start+"T12:00:00Z")-Date.parse(today+"T12:00:00Z"))/86400000;if(!Number.isFinite(delta)||delta<0||delta>120||(delta<14&&x.earlyStart!==true))return respond({error:"Date de début ou consentement de démarrage anticipé invalide"},400,cors)}
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 // Ne jamais encaisser avant validation de la RC Pro et de la médiation.
 const launch=await admin.from("akp_launch_control")
   .select("insurance_verified,mediation_verified").eq("singleton",true).maybeSingle();
 if(launch.error||!launch.data||launch.data.insurance_verified!==true||launch.data.mediation_verified!==true)
   return respond({error:"Les souscriptions seront ouvertes prochainement. Aucun paiement n'a été effectué."},503,cors);
 const te=new TextEncoder();
 const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",te.encode(value)))).map(b=>b.toString(16).padStart(2,"0")).join("");
 const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown";
 const limit=await admin.rpc("reserve_stripe_live_checkout",{p_key_hash:await hash(ip+"|"+email)});
 if(limit.error||limit.data!==true)return respond({error:"Trop de demandes, réessaie plus tard."},429,cors);
 const quote=await admin.rpc("quote_offer",{p_offer_code:offer,p_commitment_months:months,p_payment_mode:mode});
 const q=Array.isArray(quote.data)?quote.data[0]:quote.data;
 if(quote.error||!q||q.currency!=="eur"||q.monthly_equivalent_cents<=0||q.total_cents<=0)return respond({error:"Tarif indisponible"},503,cors);
 const amount=mode==="monthly"?q.monthly_equivalent_cents:q.total_cents;
 try{
  const stripe=new Stripe(key);
  const lookup="akp_"+offer+"_"+months+"_"+mode;
  const prices=await stripe.prices.list({lookup_keys:[lookup],active:true,limit:1});
  const price=prices.data[0];
  if(!price||price.livemode!==true||price.lookup_key!==lookup||price.currency!=="eur"||price.unit_amount!==amount||Boolean(price.recurring)!==(mode==="monthly"))return respond({error:"Tarif Stripe incohérent, commande bloquée"},503,cors);
  // Chaque nouvelle facture doit conserver les coordonnées légales du vendeur.
  const billing=await admin.from("billing_settings")
    .select("legal_name,legal_address,siren,siret,vat_exempt,vat_mention")
    .limit(1).maybeSingle();
  const b=billing.data;
  if(billing.error||!b||!b.legal_name?.trim()||!b.legal_address?.trim()||
     !/^\d{9}$/.test(String(b.siren||"").replace(/\s/g,""))||
     !/^\d{14}$/.test(String(b.siret||"").replace(/\s/g,""))||
     b.vat_exempt!==true||!b.vat_mention?.trim())
    return respond({error:"Identité de facturation à vérifier avant la vente"},503,cors);
  const legalName=/\bEI\b|entrepreneur individuel/i.test(b.legal_name)
    ?b.legal_name.trim():b.legal_name.trim()+" EI";
  const legalFooter=[
    legalName, String(b.legal_address).trim(),
    "SIREN "+String(b.siren).replace(/\s/g,""),
    "SIRET "+String(b.siret).replace(/\s/g,""),
    String(b.vat_mention).trim(),
    "Prestations de services à distance",
    "contact@akprime.fr"
  ].join(" | ").slice(0,500);
  const legalFields=[
    {name:"SIREN",value:String(b.siren).replace(/\s/g,"")},
    {name:"SIRET",value:String(b.siret).replace(/\s/g,"")}
  ];
  const stamp=new Date().toISOString();
  const inserted=await admin.from("stripe_live_checkout_orders").insert({offer_code:offer,commitment_months:months,payment_mode:mode,full_name:name,email,monthly_cents:q.monthly_equivalent_cents,total_cents:q.total_cents,requested_start_date:start,early_start_at:x.earlyStart?stamp:null,accepted_terms_at:stamp,privacy_accepted_at:stamp,health_consent_at:stamp,cgv_version:String(x.cgvVersion),status:"pending"}).select("id").single();
  if(inserted.error||!inserted.data)throw Error("Cannot save order");
  const orderId=inserted.data.id;
  const customer=await stripe.customers.create({email,name,preferred_locales:["fr"],invoice_settings:{footer:legalFooter,custom_fields:legalFields},metadata:{akprime_live_order_id:orderId}},{idempotencyKey:"akp-live-customer-"+orderId});
  if(!customer.livemode)throw Error("Wrong Stripe environment");
  const session=await stripe.checkout.sessions.create({
   mode:mode==="monthly"?"subscription":"payment",customer:customer.id,
   client_reference_id:orderId,billing_address_collection:"required",customer_update:{address:"auto",name:"auto"},locale:"fr",
   success_url:"https://akprime.fr/?akp_live_return=success&session_id={CHECKOUT_SESSION_ID}",
   cancel_url:"https://akprime.fr/?akp_live_return=cancel",
   line_items:[{price:price.id,quantity:1}],metadata:{akprime_live_order_id:orderId,environment:"live"},
   ...(mode==="monthly"?{subscription_data:{metadata:{akprime_live_order_id:orderId}}}:{invoice_creation:{enabled:true,invoice_data:{description:"AK PRIME — "+offer+" — "+months+" mois",footer:legalFooter,custom_fields:legalFields}}})
  },{idempotencyKey:"akp-live-checkout-"+orderId});
  if(!session.id.startsWith("cs_live_")||!session.url)return respond({error:"Session Stripe invalide"},503,cors);
  await admin.from("stripe_live_checkout_orders").update({status:"checkout_created",stripe_session_id:session.id,stripe_customer_id:customer.id,updated_at:new Date().toISOString()}).eq("id",orderId);
  return respond({url:session.url,mode:"live"},200,cors);
 }catch(err){console.error("Live checkout initialization failed",String(err).slice(0,150));return respond({error:"Impossible de préparer le paiement. Aucun débit effectué."},503,cors)}
});