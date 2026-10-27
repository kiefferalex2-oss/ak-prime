import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const cors={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
};
function reply(body:unknown,status=200){
 return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
}
const bytes=(n:number)=>crypto.getRandomValues(new Uint8Array(n));
const hex=(v:Uint8Array)=>Array.from(v,x=>x.toString(16).padStart(2,"0")).join("");
const generatePassword=()=>{
 const groups=[
  "ABCDEFGHJKLMNPQRSTUVWXYZ","abcdefghijkmnopqrstuvwxyz","23456789","!@#_%+"
 ];
 const chars=groups.map(g=>g[bytes(1)[0]%g.length]);
 const alphabet=groups.join("");
 chars.push(...Array.from(bytes(36),x=>alphabet[x%alphabet.length]));
 const shuffle=bytes(chars.length);
 for(let i=chars.length-1;i>0;i--){
  const j=shuffle[i]%(i+1);
  [chars[i],chars[j]]=[chars[j],chars[i]];
 }
 return chars.join("");
};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply({error:"Méthode non autorisée."},405);
 const token=req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return reply({error:"Connexion propriétaire requise."},401);
 const url=Deno.env.get("SUPABASE_URL"),
  publicKey=Deno.env.get("SUPABASE_ANON_KEY"),
  serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!publicKey||!serviceKey)return reply({error:"Configuration indisponible."},503);
 const actor=createClient(url,publicKey,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{Authorization:"Bearer "+token}},
 });
 const verified=await actor.auth.getUser(token);
 if(verified.error||!verified.data.user)return reply({error:"Session expirée ou invalide."},401);
 const {data:profile,error:profileErr}=await actor.from("profiles").select("role").eq("id",verified.data.user.id).single();
 if(profileErr||profile?.role!=="owner")return reply({error:"Action réservée au propriétaire AK PRIME."},403);
 let obj:Record<string,unknown>;
 try{
  const raw=await req.text();if(raw.length>1024)return reply({error:"Données trop volumineuses."},413);
  obj=JSON.parse(raw);
  if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error();
 }catch{return reply({error:"Données invalides."},400)}
 const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const paidOrderId=typeof obj.paidOrderId==="string"?obj.paidOrderId:null;
 let offerCode=obj.offerCode;
 let fullName=typeof obj.fullName==="string"?obj.fullName.trim():"Client Test AK PRIME";
 if(paidOrderId!==null){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paidOrderId))
   return reply({error:"Commande de paiement TEST invalide."},400);
  const {data:order,error:orderError}=await admin.from("stripe_test_orders")
    .select("offer_code,full_name,status,paid_at,test_client_id")
    .eq("id",paidOrderId).eq("owner_user_id",verified.data.user.id).maybeSingle();
  if(orderError||!order||order.status!=="paid"||!order.paid_at)
   return reply({error:"Paiement Stripe TEST non confirmé par le webhook."},409);
  if(order.test_client_id)
   return reply({error:"Un compte client TEST a déjà été associé à cette commande."},409);
  offerCode=order.offer_code;
  fullName=order.full_name;
 }
 if(typeof offerCode!=="string"||!/^[a-z0-9_]{3,50}$/.test(offerCode)
    ||fullName.length<3||fullName.length>100||/[<>]/.test(fullName)){
  return reply({error:"Formule ou nom invalide."},400);
 }
 const email="akprime-test-"+hex(bytes(8))+"@example.com";
 const password=generatePassword();
 const {data:created,error:authError}=await admin.auth.admin.createUser({
  email,password,email_confirm:true,user_metadata:{full_name:fullName},
 });
 if(authError||!created?.user)return reply({error:"Création du compte impossible : "+(authError?.message||"Erreur.")},500);
 const {data:clientId,error:provisionErr}=paidOrderId
  ? await actor.rpc("owner_provision_paid_test_client",{
      p_auth_user_id:created.user.id,p_order_id:paidOrderId
    })
  : await actor.rpc("owner_provision_test_client",{
      p_auth_user_id:created.user.id,p_offer_code:offerCode,p_full_name:fullName
    });
 if(provisionErr||!clientId){
  const cleanup=await admin.auth.admin.deleteUser(created.user.id);
  if(cleanup.error){
   return reply({error:"Compte non lié au dossier et nettoyage non confirmé. Contactez l’administrateur avant de réessayer."},500);
  }
  return reply({error:"Création du dossier refusée : "+(provisionErr?.message||"Erreur.")},400);
 }
 return reply({
  success:true,
  clientId,
  email,
  password,
  message:paidOrderId
    ?"Paiement Stripe TEST confirmé. Compte de démonstration créé pour poursuivre l'onboarding ; aucune facturation réelle. Note ce mot de passe, affiché une seule fois."
    :"Compte TEST : aucun paiement, aucune facture. Enregistre ce mot de passe maintenant, il n’est affiché qu’une fois.",
 },201);
});