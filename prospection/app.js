/* Owner authorization is enforced again by RLS; no private key in this page. */
'use strict';
const db=window.supabase.createClient('https://gptvgldboqarfklorjip.supabase.co','sb_publishable_wvFEmkJCeJxDw8HhTmipaw_z2J9a8sx');
const $=id=>document.getElementById(id);
let rows=[];
const labels={new:'À examiner',ready:'Prêt à envoyer',sending:'Envoi en cours',sent:'Envoyé',replied:'Réponse reçue',opted_out:'Ne plus contacter',failed:'À vérifier',uncertain:'Envoi à vérifier'};
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el}
function say(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error)}
function link(url,text){try{const u=new URL(url);if(u.protocol!=='https:')throw Error();const a=node('a',text);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a}catch{return node('span','Source indisponible')}}
async function load(){
 const {data:{session},error:sessionError}=await db.auth.getSession();
 if(sessionError||!session){$('workspace').hidden=true;$('login').hidden=false;$('agentBadge').textContent='Non connecté';say('Connectez-vous avec votre compte propriétaire AK PRIME.');return}
 const {data:profile,error:profileError}=await db.from('profiles').select('role').eq('id',session.user.id).single();
 if(profileError||profile?.role!=='owner'){$('workspace').hidden=true;$('login').hidden=true;say('Cet espace est réservé au propriétaire AK PRIME.',true);return}
 $('login').hidden=true;
 const [settings,leads]=await Promise.all([db.from('prospection_settings').select('*').eq('singleton',true).single(),db.from('prospection_leads').select('*').order('created_at',{ascending:false}).limit(500)]);
 if(settings.error||leads.error){say('Le module de prospection n’est pas encore disponible. Vérifiez son installation dans Supabase.',true);return}
 $('workspace').hidden=false;const s=settings.data;rows=leads.data;
 $('enabled').checked=s.enabled;$('researchEnabled').checked=s.research_enabled;$('creativeEnabled').checked=s.creative_enabled;$('sendingEnabled').checked=s.sending_enabled;$('autonomousEmail').checked=!!s.autonomous_email_enabled;$('dailyLimit').value=s.daily_limit;
 $('agentBadge').textContent=s.enabled?'Agent activé':'Agent en pause';$('agentBadge').classList.toggle('active',s.enabled);
 $('heartbeat').textContent=s.last_run_at?new Date(s.last_run_at).toLocaleString('fr-FR')+' — '+s.last_status:'Aucun passage enregistré. Connectez les accès, puis lancez une vérification GitHub.';
 for(const [id,statuses] of [['newCount',['new']],['readyCount',['ready']],['sentCount',['sent','replied']],['replyCount',['replied']]])$(id).textContent=(id==='sentCount'?rows.filter(r=>!!r.sent_at):rows.filter(r=>statuses.includes(r.stage))).length;
 window.dispatchEvent(new Event('akprime-owner-ready'));say(rows.length===500?'Les 500 prospects les plus récents sont affichés.':'Suivi synchronisé.');render();
}
function render(){
 const target=$('leads');target.replaceChildren();const filtered=rows.filter(r=>$('filter').value==='all'||r.stage===$('filter').value);
 if(!filtered.length){const box=node('div',undefined,'empty');box.append(node('h3','Aucun prospect à afficher'),node('p','Les recherches connectées alimenteront cette liste avec des besoins récents et leurs sources. Vous pouvez aussi ajouter un contact dont vous avez déjà vérifié le besoin.'));target.append(box);return}
 for(const lead of filtered){
  const card=node('article',undefined,'lead'),details=node('div'),actions=node('div',undefined,'actions');
  details.append(node('h3',lead.name),node('div',(({club:'Club',association:'Association',professional:'Professionnel',individual:'Sportif / particulier'}[lead.kind]||lead.kind))+' · '+(labels[lead.stage]||lead.stage)+' · '+(lead.email||'E-mail à compléter'),'meta'),node('blockquote',lead.evidence),node('p',lead.professional_relevance?'Pourquoi ce contact : '+lead.professional_relevance:'Pertinence commerciale à vérifier.','small muted'),node('p',lead.verification_note||'', 'small muted'),link(lead.source_url,'Voir la source officielle ↗'));
  if(lead.autonomous_authorized_at)details.append(node('p','Message autorisé par le mode autonome professionnel, sans validation individuelle.','small muted'));
  const edit=node('button','Examiner le message','secondary');edit.onclick=()=>editLead(lead);actions.append(edit);
  if(!['opted_out'].includes(lead.stage)){const stop=node('button','Ne plus contacter','secondary');stop.onclick=async()=>{const {error}=await db.from('prospection_leads').update({stage:'opted_out',approved:false}).eq('id',lead.id);if(error)say('Impossible d’enregistrer l’opposition.',true);else await load()};actions.append(stop)}
  if(['sending','uncertain'].includes(lead.stage))details.append(node('p','Vérifier la boîte mail avant toute intervention. Cet envoi ne sera pas retenté automatiquement.','small error'));
  card.append(details,actions);target.append(card);
 }
}
function editLead(lead={}){
 const form=$('leadForm');form.reset();$('editorError').textContent='';
 for(const el of form.elements){if(!el.name)continue;if(el.type==='checkbox')el.checked=!!lead[el.name];else if(lead[el.name]!==undefined&&lead[el.name]!==null)el.value=lead[el.name]}
 form.elements.id.value=lead.id||'';
 const locked=!!lead.message_id||lead.stage==='opted_out';
 for(const el of form.elements)if(!['button','hidden'].includes(el.type))el.disabled=locked;
 if(locked)$('editorError').textContent='Contact déjà traité : le message et son état ne peuvent pas être remis en envoi ici.';
 $('editorTitle').textContent=lead.id?'Examiner le prospect':'Ajouter un contact';$('editor').showModal();
}
$('leadForm').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));
 const data={};for(const key of ['name','kind','source_url','contact_url','opportunity_date','evidence','professional_relevance','consent_note','subject','body'])data[key]=(values[key]||'').trim();
 data.email=(values.email||'').trim().toLowerCase()||null;data.consent=!!values.consent;data.source_verified=!!values.source_verified;data.approved=!!values.approved;
 if(data.approved){
  const days=(Date.now()-new Date(data.opportunity_date+'T00:00:00Z'))/86400000;
  if(!data.email||!data.source_verified||days<0||days>=31){$('editorError').textContent='Vérifiez l’e-mail, la source et une publication datant de moins de 31 jours.';return}
  if(data.kind==='individual'&&(!data.consent||data.consent_note.length<10)){$('editorError').textContent='L’accord du particulier et sa preuve sont nécessaires avant l’envoi.';return}
  if(['club','association','professional'].includes(data.kind)&&data.professional_relevance.length<10){$('editorError').textContent='Précisez le lien entre le message et l’activité du club.';return}
 }
 data.stage=data.approved?'ready':'new';
 let result;
 if(values.id)result=await db.from('prospection_leads').update(data).eq('id',values.id).is('message_id',null).not('stage','eq','opted_out').select('id');
 else{const bytes=new TextEncoder().encode(data.name.toLowerCase()+'|'+data.source_url);const digest=await crypto.subtle.digest('SHA-256',bytes);data.fingerprint=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');result=await db.from('prospection_leads').insert(data).select('id')}
 if(result.error||!result.data?.length){$('editorError').textContent='Enregistrement impossible : contact déjà présent, déjà traité ou données incomplètes.';return}
 $('editor').close();await load();
};
$('settingsForm').onsubmit=async event=>{event.preventDefault();const {error}=await db.from('prospection_settings').update({enabled:$('enabled').checked,research_enabled:$('researchEnabled').checked,creative_enabled:false,sending_enabled:$('sendingEnabled').checked,autonomous_email_enabled:$('autonomousEmail').checked,daily_limit:Number($('dailyLimit').value)}).eq('singleton',true);if(error)say('Impossible d’enregistrer les réglages.',true);else await load()};
$('pause').onclick=async()=>{const {error}=await db.from('prospection_settings').update({enabled:false,sending_enabled:false}).eq('singleton',true);if(error)say('La mise en pause a échoué. Réessayez.',true);else await load()};
$('loginForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;try{const {error}=await db.auth.signInWithPassword({email:form.elements.email.value,password:form.elements.password.value});form.elements.password.value='';if(error){say('Connexion impossible. Vérifiez vos identifiants.',true);return}await load()}finally{button.disabled=false}};
$('close').onclick=()=>$('editor').close();$('add').onclick=()=>editLead();$('refresh').onclick=()=>load().catch(()=>say('Connexion indisponible.',true));$('filter').onchange=render;window.addEventListener('akprime-refresh-leads',()=>load().catch(()=>{}));
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){window.dispatchEvent(new Event('akprime-owner-logout'));$('workspace').hidden=true;$('login').hidden=false;rows=[];$('leads').replaceChildren();$('editor').close();say('Session terminée.')}});
load().catch(()=>say('Connexion indisponible. Réessayez dans un instant.',true));
