import Stripe from "npm:stripe@22.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const allowedOrigins = new Set(["https://akprime.fr","https://www.akprime.fr"]);
const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const isTestReady = Deno.env.get("AKP_STRIPE_TEST_ENABLED") === "true" && stripeKey.startsWith("sk_test_");
const admin = projectUrl && serviceKey ? createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }}) : null;

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://akprime.fr",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  const respond = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: corsHeaders });
  if (request.method === "OPTIONS") return new Response(null, {status: 204, headers: corsHeaders});
  if (request.method !== "POST") return respond({error:"Méthode refusée"},405);
  if (origin && !allowedOrigins.has(origin)) return respond({error:"Origine non autorisée"},403);
  if (!admin || !publicKey) return respond({error:"Configuration Supabase manquante"},503);
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return respond({error:"Connexion propriétaire requise"},401);
  const auth = createClient(projectUrl, publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError} = await auth.auth.getUser(bearer);
  if (userError || !user) return respond({error:"Session non valide"},401);
  const {data:profile,error:profileError} = await admin.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if (profileError || profile?.role !== "owner") return respond({error:"Accès réservé au propriétaire"},403);
  let body: Record<string,unknown>;
  try {
    const text=await request.text();
    if (text.length>3072) return respond({error:"Requête trop volumineuse"},413);
    const parsed=JSON.parse(text);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return respond({error:"Données incorrectes"},400);
    body=parsed as Record<string,unknown>;
  } catch { return respond({error:"Données incorrectes"},400) }
  if (body.action==="status") {
    const sessionId=String(body.sessionId||"");
    if (!/^cs_test_[A-Za-z0-9_]{8,300}$/.test(sessionId)) return respond({error:"Identifiant de session invalide"},400);
    const {data,error}=await admin.from("stripe_test_orders")
      .select("id,status,offer_code,commitment_months,payment_mode,total_cents,monthly_cents,created_at,paid_at,subscription_cancel_at,last_error,test_client_id,stripe_session_id")
      .eq("owner_user_id",user.id).eq("stripe_session_id",sessionId).maybeSingle();
    if (error) return respond({error:"Statut indisponible"},500);
    return respond({order:data||null,mode:"test"});
  }
  if (body.action==="latest_paid") {
    const {data,error}=await admin.from("stripe_test_orders")
      .select("id,status,offer_code,commitment_months,payment_mode,total_cents,monthly_cents,created_at,paid_at,subscription_cancel_at,last_error,test_client_id,stripe_session_id")
      .eq("owner_user_id",user.id).eq("status","paid")
      .order("paid_at",{ascending:false}).limit(1).maybeSingle();
    if(error)return respond({error:"Dernier paiement TEST indisponible"},500);
    return respond({order:data||null,mode:"test"});
  }
  if (body.action!=="create") return respond({error:"Action non reconnue"},400);
  if (!isTestReady) return respond({
    error:"Stripe en mode test n'est pas encore configuré. Ajoutez STRIPE_SECRET_KEY (sk_test_...) et AKP_STRIPE_TEST_ENABLED=true aux secrets Supabase.",
    code:"STRIPE_TEST_NOT_CONFIGURED"
  },503);
  const offerCode=String(body.offerCode||"");
  const duration=Number(body.duration);
  const paymentMode=String(body.paymentMode||"");
  const fullName=String(body.fullName||"").trim().replace(/\s+/g," ");
  const email=String(body.email||"").trim().toLowerCase();
  const acceptedTerms=body.acceptedTerms===true;
  const acceptedPrivacy=body.acceptedPrivacy===true;
  const healthConsent=body.healthConsent===true;
  const earlyStart=body.earlyStart===true;
  const startDate=body.startDate==null||body.startDate===""?null:String(body.startDate);
  if (!/^[a-z0-9_]{5,50}$/.test(offerCode)||![3,6].includes(duration)||
      !["monthly","upfront"].includes(paymentMode)||fullName.length<3||fullName.length>160||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||
      !acceptedTerms||!acceptedPrivacy||!healthConsent||
      (startDate!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(startDate)))
    return respond({error:"Vérifiez la formule, les coordonnées et les consentements."},400);
  const today=new Date();
  const startLimit=new Date(today.getTime()+120*86400*1000);
  if(startDate){
    const d=new Date(startDate+"T12:00:00Z");
    if(!Number.isFinite(d.getTime())||d.getTime()<Date.parse(today.toISOString().slice(0,10)+"T00:00:00Z")||
      d.getTime()>startLimit.getTime())return respond({error:"Date hors des 120 jours"},400);
    if((d.getTime()-today.getTime())<14*86400*1000&&!earlyStart) return respond({error:"Démarrage avant 14 jours : consentement exprès requis"},400);
  }
  const {data:quoteData,error:quoteError}=await admin.rpc("quote_offer",{
    p_offer_code:offerCode,p_commitment_months:duration,p_payment_mode:paymentMode
  });
  const quote=Array.isArray(quoteData)?quoteData[0]:quoteData;
  if(quoteError||!quote || quote.currency!=="eur" || quote.total_cents<1 ||
    quote.monthly_equivalent_cents<1) return respond({error:"Tarif serveur indisponible"},503);
  const monthPrice=Number(quote.monthly_equivalent_cents),total=Number(quote.total_cents);
  if(paymentMode==="monthly" && monthPrice*duration!==total) return respond({error:"Incohérence de prix serveur"},503);

  const now=new Date().toISOString();
  const {data:order,error:orderError}=await admin.from("stripe_test_orders").insert({
    owner_user_id:user.id,offer_code:offerCode,commitment_months:duration,
    payment_mode:paymentMode,full_name:fullName,email,
    monthly_cents:monthPrice,total_cents:total,currency:"eur",
    cgv_version:"akprime-cgv-2026-10-20-firm-commitment",
    accepted_terms_at:now,privacy_version:"akprime-privacy-2026-10-20",
    privacy_accepted_at:now,health_consent_at:now,requested_start_date:startDate,
    explicit_early_start:earlyStart,early_start_at:earlyStart?now:null,
    status:"pending"
  }).select("id").single();
  if(orderError||!order?.id)return respond({error:"Enregistrement de la commande test impossible"},500);
  const stripe=new Stripe(stripeKey);
  try {
    const lookupKey="akp_"+offerCode+"_"+duration+"_"+paymentMode;
    const prices=await stripe.prices.list({lookup_keys:[lookupKey],active:true,limit:1});
    const stripePrice=prices.data[0];
    const expectedAmount=paymentMode==="monthly"?monthPrice:total;
    const isRecurring=!!stripePrice?.recurring && stripePrice.recurring.interval==="month" && stripePrice.recurring.interval_count===1;
    if (!stripePrice || stripePrice.lookup_key!==lookupKey || stripePrice.livemode ||
        stripePrice.currency!=="eur" || stripePrice.unit_amount!==expectedAmount ||
        (paymentMode==="monthly"?!isRecurring:!!stripePrice.recurring))
      throw Error("Le prix Stripe TEST ne correspond pas au devis serveur.");
    const params: Stripe.Checkout.SessionCreateParams = {
      mode:paymentMode==="monthly"?"subscription":"payment",
      customer_email:email,
      client_reference_id:order.id,
      locale:"fr",
      billing_address_collection:"required",
      success_url:"https://akprime.fr/stripe-test.html?result=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url:"https://akprime.fr/stripe-test.html?result=cancelled",
      // Prix Stripe prédéfini et contrôlé contre le devis calculé dans Supabase.
      // Aucune somme provenant du navigateur n'est utilisée.
      line_items:[{price:stripePrice.id,quantity:1}],
      metadata:{akprime_order_id:order.id,environment:"test",commitment_months:String(duration),
        payment_mode:paymentMode},
      ...(paymentMode==="monthly"?{subscription_data:{metadata:{akprime_order_id:order.id}}}:
        {payment_intent_data:{metadata:{akprime_order_id:order.id}}})
    };
    const session=await stripe.checkout.sessions.create(params,{idempotencyKey:"akprime-test-"+order.id});
    if(session.livemode||!session.id.startsWith("cs_test_")||!session.url)throw Error("Stripe a retourné une session non-test");
    const {error:updateError}=await admin.from("stripe_test_orders")
      .update({status:"checkout_created",stripe_session_id:session.id,updated_at:new Date().toISOString()})
      .eq("id",order.id).eq("status","pending");
    if(updateError)throw Error("La session n'a pas pu être enregistrée");
    return respond({url:session.url,orderId:order.id,mode:"test"});
  } catch (error) {
    await admin.from("stripe_test_orders")
      .update({status:"failed",last_error:String(error).slice(0,400),updated_at:new Date().toISOString()}).eq("id",order.id);
    console.error("Stripe Checkout test failed:",error);
    return respond({error:"Impossible d'ouvrir Stripe Checkout en mode test"},503);
  }
});
