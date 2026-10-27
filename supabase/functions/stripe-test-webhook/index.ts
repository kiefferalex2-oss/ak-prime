import Stripe from "npm:stripe@22.0.0";
import {createClient} from "npm:@supabase/supabase-js@2.95.0";

const key=Deno.env.get("STRIPE_SECRET_KEY")??"";
const signingSecret=Deno.env.get("STRIPE_WEBHOOK_SECRET")??"";
const enabled=Deno.env.get("AKP_STRIPE_TEST_ENABLED")==="true";
const projectUrl=Deno.env.get("SUPABASE_URL")??"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const admin=projectUrl && serviceKey?createClient(projectUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const stripe=key.startsWith("sk_test_")?new Stripe(key):null;
const cryptoProvider=Stripe.createSubtleCryptoProvider();
const response=(text:string,status=200)=>new Response(text,{status,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
const onlyId=(x:unknown):string|null=>typeof x==="string"?x:x&&typeof x==="object"&&"id"in x?String((x as {id:string}).id):null;
const addMonths=(unixSeconds:number,monthCount:number)=>{
  const start=new Date(unixSeconds*1000),year=start.getUTCFullYear(),month=start.getUTCMonth()+monthCount;
  const target=new Date(Date.UTC(year,month,1,start.getUTCHours(),start.getUTCMinutes(),start.getUTCSeconds()));
  const maxDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  target.setUTCDate(Math.min(start.getUTCDate(),maxDay));
  return Math.floor(target.getTime()/1000);
};
Deno.serve(async(request:Request)=>{
 if(request.method!=="POST")return response("Method not allowed",405);
 if(!enabled||!stripe||!signingSecret.startsWith("whsec_")||!admin)
   return response("Stripe test webhook unavailable",503);
 const sig=request.headers.get("stripe-signature");
 if(!sig)return response("Missing signature",400);
 const raw=await request.text();
 if(raw.length>150000)return response("Payload too large",413);
 let event:Stripe.Event;
 try{
   event=await stripe.webhooks.constructEventAsync(raw,sig,signingSecret,undefined,cryptoProvider);
 }catch(error){
   console.warn("Stripe signature verification failed",String(error).slice(0,170));
   return response("Invalid signature",400);
 }
 if(event.livemode!==false)return response("Live events rejected",403);
 if(!/^evt_[A-Za-z0-9_]+$/.test(event.id))return response("Unexpected event id",400);
 const relevant=new Set(["checkout.session.completed","checkout.session.expired"]);
 const shouldIgnore=!relevant.has(event.type);
 const {data:created,error:insertError}=await admin.from("stripe_test_webhook_events").insert({
  stripe_event_id:event.id,event_type:event.type,
  event_status:shouldIgnore?"ignored":"processing"
 }).select("stripe_event_id").maybeSingle();
 if(insertError){
   if(insertError.code!=="23505")return response("Event store temporarily unavailable",503);
   const prior=await admin.from("stripe_test_webhook_events").select("event_status,attempt_count")
     .eq("stripe_event_id",event.id).single();
   if(prior.error)return response("Unable to read event state",503);
   if(["processed","ignored"].includes(prior.data?.event_status||""))return response("Already processed",200);
   if(prior.data?.event_status==="processing")return response("Event is still processing",409);
   const retry=await admin.from("stripe_test_webhook_events")
    .update({event_status:"processing",attempt_count:(prior.data?.attempt_count||1)+1,error_message:null})
    .eq("stripe_event_id",event.id).eq("event_status","failed");
   if(retry.error)return response("Event retry unavailable",503);
 }
 if(shouldIgnore)return response("Ignored",200);
 let failure="";
 try{
   const session=event.data.object as Stripe.Checkout.Session;
   if(!session.id.startsWith("cs_test_"))throw Error("Checkout session was not in test mode");
   const orderId=session.metadata?.akprime_order_id??"";
   if(!/^[0-9a-f-]{36}$/i.test(orderId))throw Error("Order reference absent");
   const {data:order,error:orderError}=await admin.from("stripe_test_orders")
    .select("id,status,email,commitment_months,payment_mode,monthly_cents,total_cents,stripe_session_id")
    .eq("id",orderId).eq("stripe_session_id",session.id).maybeSingle();
   if(orderError||!order)throw Error("Order and Stripe session do not match");
   if(session.currency!=="eur")throw Error("Currency mismatch");
   const expected=order.payment_mode==="monthly"?order.monthly_cents:order.total_cents;
   if(event.type==="checkout.session.expired"){
     if(order.status!=="paid"){
       const {error:e}=await admin.from("stripe_test_orders")
        .update({status:"expired",updated_at:new Date().toISOString()}).eq("id",order.id).neq("status","paid");
       if(e)throw Error("Unable to expire order");
     }
   }else if(event.type==="checkout.session.completed"){
     if(session.payment_status!=="paid")throw Error("Payment is not confirmed");
     if(session.amount_total!==expected)throw Error("Price changed after server quote");
     const paidEmail=(session.customer_details?.email??session.customer_email??"").toLowerCase();
     if(paidEmail && paidEmail!==order.email.toLowerCase())throw Error("Email mismatch");
     if(session.mode!==(order.payment_mode==="monthly"?"subscription":"payment"))
       throw Error("Checkout mode mismatch");
     let cancelAt:string|null=null;
     let subscriptionId:string|null=null;
     if(order.payment_mode==="monthly"){
       subscriptionId=onlyId(session.subscription);
       if(!subscriptionId)throw Error("Subscription reference unavailable");
       const sub=await stripe.subscriptions.retrieve(subscriptionId);
       if(sub.status!=="active"&&sub.status!=="trialing")throw Error("Subscription is not active");
       const timestamp=addMonths(sub.billing_cycle_anchor,Number(order.commitment_months));
       await stripe.subscriptions.update(subscriptionId,{cancel_at:timestamp,proration_behavior:"none"},
         {idempotencyKey:"akprime-test-term-"+order.id});
       cancelAt=new Date(timestamp*1000).toISOString();
     }
     const {error:saveError}=await admin.from("stripe_test_orders").update({
       status:"paid",paid_at:new Date().toISOString(),
       stripe_amount_paid_cents:session.amount_total,stripe_customer_id:onlyId(session.customer),
       stripe_subscription_id:subscriptionId,stripe_payment_intent_id:onlyId(session.payment_intent),
       subscription_cancel_at:cancelAt,updated_at:new Date().toISOString(),last_error:null
     }).eq("id",order.id);
     if(saveError)throw Error("Unable to confirm test payment");
   }
 }catch(error){
   failure=String(error).slice(0,480);
   console.error("Stripe TEST webhook processing failed:",failure);
 }
 const update=await admin.from("stripe_test_webhook_events").update({
   event_status:failure?"failed":"processed",
   error_message:failure||null,processed_at:failure?null:new Date().toISOString()
 }).eq("stripe_event_id",event.id);
 if(update.error)return response("Event log write failed",503);
 return failure?response("Stripe event processing failed",500):response("ok");
});
