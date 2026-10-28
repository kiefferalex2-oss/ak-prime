import Stripe from "npm:stripe@22.0.0";
import {createClient} from "npm:@supabase/supabase-js@2.95.0";
const url=Deno.env.get("SUPABASE_URL")||"";
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const key=Deno.env.get("STRIPE_SECRET_KEY")||"";
const enabled=Deno.env.get("AKP_STRIPE_TEST_ENABLED")==="true"&&key.startsWith("sk_test_");
const validOrigins=["https://akprime.fr","https://www.akprime.fr"];
const reply=(body:unknown,status=200,origin="https://akprime.fr")=>
 new Response(JSON.stringify(body),{status,headers:{
  "Content-Type":"application/json","Cache-Control":"no-store",
  "Access-Control-Allow-Origin":origin,"Vary":"Origin",
  "Access-Control-Allow-Headers":"authorization,content-type,apikey,x-client-info",
  "Access-Control-Allow-Methods":"POST,OPTIONS"
 }});
Deno.serve(async(request)=>{
 const origin=request.headers.get("origin")||"";
 const allowedOrigin=validOrigins.includes(origin)?origin:validOrigins[0];
 if(request.method==="OPTIONS")return reply({},200,allowedOrigin);
 if(request.method!=="POST"||(origin&&!validOrigins.includes(origin)))return reply({error:"Accès refusé"},403,allowedOrigin);
 if(!enabled||!url||!service)return reply({error:"Facturation TEST indisponible"},503,allowedOrigin);
 const bearer=request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!bearer)return reply({error:"Connexion à votre espace requise"},401,allowedOrigin);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=await admin.auth.getUser(bearer);
 const user=auth.data?.user;
 if(auth.error||!user)return reply({error:"Session expirée"},401,allowedOrigin);
 const record=await admin.from("clients").select("id,is_test,auth_user_id").eq("auth_user_id",user.id).maybeSingle();
 if(record.error||!record.data||record.data.is_test!==true)return reply({error:"Aucun dossier de simulation associé"},403,allowedOrigin);
 const c=record.data;
 const orders=await admin.from("stripe_test_orders")
  .select("id,stripe_customer_id,paid_at,offer_code,commitment_months,payment_mode,status")
  .eq("test_client_id",c.id).eq("status","paid").order("paid_at",{ascending:false}).limit(50);
 if(orders.error)return reply({error:"Commandes indisponibles"},503,allowedOrigin);
 const stripe=new Stripe(key);
 const invoices:Record<string,unknown>[]=[];
 const seen=new Set<string>();
 for(const order of orders.data||[]){
  if(!order.stripe_customer_id||!/^cus_[A-Za-z0-9]+$/.test(order.stripe_customer_id))continue;
  let items;
  try{
   items=await stripe.invoices.list({customer:order.stripe_customer_id,limit:100});
  }catch(err){
   console.error("AK PRIME Stripe TEST invoice retrieval failed",String(err).slice(0,180));
   return reply({error:"Service Stripe TEST momentanément indisponible. Réessaie l'actualisation."},503,allowedOrigin);
  }
  for(const inv of items.data){
    if(inv.livemode!==false||inv.status!=="paid"||seen.has(inv.id))continue;
    seen.add(inv.id);
    invoices.push({
      id:inv.id,number:inv.number||"Stripe TEST",created:inv.created,
      amount_paid:inv.amount_paid,currency:inv.currency,status:inv.status,
      pdf:inv.invoice_pdf||null,url:inv.hosted_invoice_url||null,
      offer_code:order.offer_code,commitment_months:order.commitment_months,
      payment_mode:order.payment_mode
    });
  }
 }
 return reply({
  invoices:invoices.sort((a,b)=>Number(b.created)-Number(a.created)),
  paid_order_count:(orders.data||[]).length,
  environment:"test"
 },200,allowedOrigin);
});