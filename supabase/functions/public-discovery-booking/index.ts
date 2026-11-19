import {createClient} from "npm:@supabase/supabase-js@2.95.0";

const URL=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const RESEND=Deno.env.get("RESEND_API_KEY")||"";
const allowed=new Set(["https://akprime.fr","https://www.akprime.fr"]);
function json(data:unknown,status=200,origin="https://akprime.fr"){
 return new Response(JSON.stringify(data),{status,headers:{
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store","Access-Control-Allow-Origin":origin,
  "Vary":"Origin","Access-Control-Allow-Headers":"authorization,apikey,content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
 }});
}
function localToday(){
 return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function addDays(iso:string,n:number){
 const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);
}
function h(s:string){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function discoveryMailStyle(kind:"client"|"coach", name:string, date:string, email:string, goal:string){
 const coach=kind==="coach";
 const label=coach?"ESPACE COACH":"BILAN OFFERT";
 const title=coach?"Un nouveau bilan est réservé.":"Votre rendez-vous est confirmé.";
 const category=coach?"NOUVELLE RÉSERVATION":"BILAN DÉCOUVERTE OFFERT";
 const intro=coach?"Bonjour,":"Bonjour "+h(name)+",";
 const details=coach?'<tr><td style="padding:15px 0 0;border-top:1px solid #38516a;color:#dce8f5;font:400 14px/1.7 Arial,sans-serif"><strong style="color:#e8bf78">PROSPECT</strong><p style="margin:6px 0 2px;color:#fff;font-weight:800">'+h(name)+'</p><p style="margin:0">'+h(email)+'</p>'+(goal?'<p style="margin:10px 0 0">Objectif : '+h(goal)+'</p>':'')+'</td></tr>':"";
 const follow=coach?"Pensez à transmettre le lien de visioconférence au prospect avant le rendez-vous.":"Votre coach vous communiquera les informations de connexion avant le rendez-vous. Au plaisir d’échanger avec vous !";
 const url=coach?"https://akprime.fr/?connexion=1":"https://akprime.fr/";
 const cta=coach?"ACCÉDER À MON ESPACE COACH":"DÉCOUVRIR AK PRIME";
 const foot=coach?"Cette notification concerne une nouvelle réservation depuis le site AK PRIME. Retrouvez le détail dans votre calendrier coach.":"Ce bilan découverte est gratuit et sans engagement. Vos coordonnées sont utilisées uniquement pour organiser cet échange et communiquer à son sujet.";
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><style>@media(max-width:640px){.ak-wrap{padding:12px 6px!important}.ak-pad{padding-left:24px!important;padding-right:24px!important}.ak-title{font-size:31px!important}.ak-detail{padding-left:21px!important;padding-right:21px!important}}</style></head>'+
 '<body style="margin:0;padding:0;background:#ebf0f6"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#ebf0f6"><tr><td class="ak-wrap" align="center" style="padding:35px 12px">'+
 '<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;border-collapse:separate;border-spacing:0;border-radius:18px;overflow:hidden;border:1px solid #dbe4ef;background:#0b1727">'+
 '<tr><td style="background:#d8b16d;height:5px;font-size:1px;line-height:5px">&nbsp;</td></tr>'+
 '<tr><td class="ak-pad" style="padding:28px 39px;background:#091521"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'+
 '<td valign="middle"><a href="https://akprime.fr/"><img src="https://akprime.fr/assets/ak-prime-wordmark-email.png?v=20261030-email-png" alt="AK PRIME" width="216" height="29" style="display:block;width:216px;max-width:100%;height:auto;border:0;color:#fff;font:bold 24px Arial,sans-serif"></a></td>'+
 '<td valign="middle" align="right" style="font:800 10px/1.65 Arial,sans-serif;letter-spacing:2px;color:#9aaec3">'+label+'</td></tr></table></td></tr>'+
 '<tr><td class="ak-pad" style="padding:42px 39px 28px;background:#0d1b2c;background-image:linear-gradient(138deg,#0b1727,#10223a 72%,#193456)">'+
 '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 23px"><tr><td style="border:1px solid #806e4d;border-radius:20px;background:#232a2c;padding:8px 13px;font:900 10px/1.5 Arial,sans-serif;letter-spacing:1px;color:#e7c17c">'+category+'</td></tr></table>'+
 '<p style="margin:0 0 14px;font:400 15px/1.65 Arial,sans-serif;color:#b9c8da">'+intro+'</p><h1 class="ak-title" style="margin:0 0 26px;color:#f7f9fd;font:900 37px/1.18 Arial,sans-serif;letter-spacing:-1px">'+title+'</h1>'+
 '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#192f4b;background-image:linear-gradient(145deg,#1c3554,#132740);border:1px solid #39506a;border-collapse:separate;border-spacing:0;border-radius:19px">'+
 '<tr><td class="ak-detail" style="padding:25px 27px 26px"><p style="font:900 11px/1.6 Arial,sans-serif;letter-spacing:1.5px;color:#d8b16d;margin:0 0 12px">VOTRE BILAN DÉCOUVERTE</p>'+
 '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td><p style="margin:0 0 6px;color:#d1dcea;font:400 12px/1.5 Arial,sans-serif">DATE ET HEURE · HEURE DE PARIS</p>'+
 '<p style="margin:0;color:#fff;font:800 24px/1.4 Arial,sans-serif">'+h(date)+'</p></td></tr>'+
 '<tr><td style="padding:13px 0 0;border-top:1px solid #354f6b"><p style="margin:0;color:#e1e9f4;font:500 14px/1.7 Arial,sans-serif"><strong style="color:#d8b16d">20 MINUTES</strong> · Visioconférence · '+(coach?"Prospect AK PRIME":"Gratuit et sans engagement")+'</p></td></tr>'+
 details+'</table></td></tr></table>'+
 '<p style="margin:22px 0 0;color:#c6d3e2;font:400 14px/1.75 Arial,sans-serif">'+follow+'</p>'+
 '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px"><tr><td style="border-radius:11px;background:#d3ab62;text-align:center"><a href="'+url+'" style="display:block;background:#d3ab62;border-radius:11px;padding:18px 16px;font:900 15px/1.45 Arial,sans-serif;color:#091521;text-decoration:none">'+cta+' &nbsp; &#8594;</a></td></tr></table>'+
 '</td></tr><tr><td class="ak-pad" style="background:#091521;border-top:1px solid #253850;padding:26px 39px 30px"><p style="margin:0 0 12px;color:#aec0d0;font:400 12px/1.65 Arial,sans-serif">'+foot+'</p>'+
 '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font:400 12px/1.65 Arial,sans-serif"><a href="https://akprime.fr/" style="color:#d8b16d;text-decoration:none;font-weight:800">akprime.fr</a></td>'+
 '<td align="right" style="font:400 12px/1.65 Arial,sans-serif"><a href="mailto:contact@akprime.fr" style="color:#cbd7e4;text-decoration:none">contact@akprime.fr</a></td></tr></table>'+
 '</td></tr></table></td></tr></table></body></html>';
}

async function notify(to:string,subject:string,html:string){
 if(!RESEND)return false;
 try{
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",headers:{"Authorization":"Bearer "+RESEND,"Content-Type":"application/json"},
   body:JSON.stringify({from:"AK PRIME <contact@akprime.fr>",to:[to],subject,html})
  });
  if(!response.ok){console.error("Discovery mail delivery failed",response.status);return false;}
  return true;
 }catch(error){console.error("Discovery mail network error",String(error));return false;}
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const cors=allowed.has(origin)?origin:"https://akprime.fr";
 if(req.method==="OPTIONS")return json({},200,cors);
 if(origin&&!allowed.has(origin))return json({error:"Origine non autorisée."},403,cors);
 if(!URL||!KEY)return json({error:"Agenda temporairement indisponible."},503,cors);
 const admin=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 if(req.method==="GET"){
  const from=localToday(),to=addDays(from,20);
  const result=await admin.rpc("akp_discovery_slots",{p_from:from,p_to:to});
  if(result.error){console.error("Discovery availability",result.error.code);return json({error:"Impossible de charger les créneaux."},503,cors);}
  return json({timezone:"Europe/Paris",durationMinutes:20,minNoticeHours:4,
   slots:(result.data||[]).map((x:{starts_at:string})=>x.starts_at)},200,cors);
 }
 if(req.method!=="POST")return json({error:"Méthode non autorisée."},405,cors);
 const len=Number(req.headers.get("content-length")||0);
 if(len>4000)return json({error:"Demande trop volumineuse."},413,cors);
 let data:any;
 try{data=await req.json();if(!data||Array.isArray(data)||typeof data!=="object")throw Error();}catch{
  return json({error:"Demande invalide."},400,cors);
 }
 if(data.website||data.acceptedPrivacy!==true)return json({error:"Merci de confirmer la confidentialité de votre demande."},400,cors);
 const name=String(data.name||"").trim(),email=String(data.email||"").trim().toLowerCase(),
  goal=String(data.goal||"").trim(),phone=String(data.phone||"").trim(),startsAt=String(data.startsAt||"");
 if(name.length<2||name.length>120||email.length>254||!  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
  goal.length>600||phone.length<9||phone.length>26||! /^[+0-9 ().-]{9,26}$/.test(phone)||phone.replace(/[^0-9]/g,"").length<9||phone.replace(/[^0-9]/g,"").length>15||! /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(startsAt)||
  !Number.isFinite(Date.parse(startsAt)))return json({error:"Vérifiez votre nom, votre e-mail et le créneau."},400,cors);
 const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip+"|"+KEY.slice(-20)));
 const ipHash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
 const saved=await admin.rpc("akp_book_discovery_call",{
  p_starts_at:startsAt,p_name:name,p_email:email,p_goal:goal,p_ip_hash:ipHash,p_phone:phone
 });
 if(saved.error){
  const message=saved.error.message||"Ce créneau n'est plus disponible.";
  const expected=/déjà|réserv|dispon|informations|connexion|Trop de/i.test(message);
  if(!expected)console.error("Discovery booking DB error",saved.error.code);
  return json({error:expected?message:"La réservation est momentanément indisponible."},409,cors);
 }
 const pretty=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(startsAt));
 const subject="Votre bilan découverte AK PRIME • "+pretty;
 const clientBody=discoveryMailStyle("client",name,pretty,email,goal);
 const ownerBody=discoveryMailStyle("coach",name,pretty,email+" · Téléphone : "+phone,goal);
 const queued=await admin.rpc("akp_send_discovery_emails",{p_booking_id:saved.data});
 if(queued.error)console.error("Discovery email queue",queued.error.code||"failed");
 const delivered=queued.data||{};
 const owner=delivered.coachQueued?null:await admin.from("profiles").select("email").eq("role","owner").limit(1).maybeSingle();
 const ownerEmail=typeof owner?.data?.email==="string"&&owner.data.email.includes("@")?owner.data.email:"";
 const results=await Promise.all([
  delivered.clientQueued?Promise.resolve(true):notify(email,subject,clientBody),
  delivered.coachQueued?Promise.resolve(true):(ownerEmail?notify(ownerEmail,"AK PRIME • Nouveau bilan découverte : "+pretty,ownerBody):Promise.resolve(false))
 ]);
 return json({success:true,bookingId:saved.data,emailSent:results[0],timezone:"Europe/Paris",startsAt},201,cors);
});