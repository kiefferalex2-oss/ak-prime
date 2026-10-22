/* AK PRIME — Onglet Administratif compact.
 * Transforme uniquement les cartes de premier niveau en menus repliables ;
 * conserve les formulaires, IDs, boutons et gestionnaires d'événements.
 */
(function(){
 'use strict';
 const css=document.createElement('style');
 css.textContent=[
  '.akAdminAcc{display:grid;gap:10px;max-width:1200px;margin:0 auto}',
  '.akAdminAccHead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:5px}',
  '.akAdminAccHead strong{font-size:17px;color:#1b3045;font-weight:850}',
  '.akAdminAccHead p{margin:4px 0 0;color:#7c8b99;font-size:11px;line-height:1.5}',
  '.akAdminAccTools{display:flex;gap:8px;flex-wrap:wrap}',
  '.akAdminAccTools button{border:1px solid #dfe7ee;border-radius:8px;background:#fff;color:#806033;padding:7px 10px;font-size:11px;font-weight:850;cursor:pointer}',
  '.akAdminAccTools button:hover{background:#fdf7ef}',
  '.akAdminAcc .akAdminSection{display:block;background:#fff;border:1px solid #dce5ec;border-radius:12px;box-shadow:0 4px 14px rgba(26,46,66,.025);margin:0!important;overflow:hidden;padding:0!important}',
  '.akAdminAcc .akAdminSection>summary{display:flex;align-items:center;gap:12px;cursor:pointer;list-style:none;min-height:66px;padding:14px 17px;outline-offset:-3px}',
  '.akAdminAcc .akAdminSection>summary::-webkit-details-marker{display:none}',
  '.akAdminAcc .akAdminSection>summary:hover{background:#fafbfd}',
  '.akAdminAcc .akAdminSection[open]>summary{background:#fcfbf9;border-bottom:1px solid #e6edf2}',
  '.akAdminAcc .akAdminSection>summary .akAdminTitle{flex:1;min-width:0;font-size:14px;line-height:1.4;color:#1d3449;font-weight:850}',
  '.akAdminAcc .akAdminSection>summary .akAdminMeta{color:#788a9b;font-size:11px;line-height:1.4;text-align:right;max-width:min(45%,460px)}',
  '.akAdminAcc .akAdminSection>summary .akAdminMeta.attention{color:#a76536;font-weight:850}',
  '.akAdminAcc .akAdminChevron{color:#a47b44;font-size:17px;font-weight:750;transform:rotate(0deg);transition:transform .15s ease;flex-shrink:0}',
  '.akAdminAcc .akAdminSection[open]>summary .akAdminChevron{transform:rotate(180deg)}',
  '.akAdminAcc .akAdminBody{padding:16px 18px 20px;min-width:0}',
  '.akAdminAcc .akAdminBody>.card.panel{margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;border-radius:0!important;background:transparent!important}',
  '.akAdminAcc .akAdminBody>.card.panel>.row:first-child:empty{display:none}',
  '.akAdminAcc .akAdminSectionNative>summary{font-size:14px!important;font-weight:850!important;color:#1d3449}',
  '.akAdminAcc>.alert{margin:0!important}',
  '.akAdminAcc .akAdminLegacyGrid{display:grid;grid-template-columns:1fr;gap:10px}',
  '@media(max-width:700px){.akAdminAcc .akAdminSection>summary{padding:12px;gap:8px;flex-wrap:wrap}.akAdminAcc .akAdminSection>summary .akAdminTitle{font-size:13px}.akAdminAcc .akAdminSection>summary .akAdminMeta{max-width:100%;text-align:left;flex-basis:100%;order:3}.akAdminAcc .akAdminBody{padding:14px}.akAdminAccHead{align-items:start}}',
  '@media(prefers-reduced-motion:reduce){.akAdminAcc .akAdminChevron{transition:none}}'
 ].join('\n');
 document.head.appendChild(css);
 const openState=new Map();
 const text=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
 const safe=x=>esc(text(x));
 const key=x=>text(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const statusInfo=c=>text(c?.status||'À définir')+' · '+text([c?.pole,c?.offer].filter(Boolean).join(' / '));
 function panelLabel(card){
  const h=card.querySelector('h3');
  return text(h?.textContent)||'Informations complémentaires';
 }
 function summaryInfo(c,label){
  const k=key(label);
  if(k.includes('gerer-le-dossier')||k.includes('gestion-du-dossier'))return statusInfo(c);
  if(k==='engagement')return [c.start?fmtDate(c.start):'Début à préciser',c.end?fmtDate(c.end):'Fin à préciser'].join(' → ');
  if(k==='administratif')return c.authUserId?(c.portalAccessEnabled?'Compte lié · Accès actif':'Compte lié · Accès à activer'):'Coordonnées · Accès client · Notes';
  if(k.includes('renouvellement'))return c.end?'Échéance du '+fmtDate(c.end):'Date de fin à renseigner';
  if(k.includes('facturation'))return (c.invoices||[]).length+' facture'+((c.invoices||[]).length>1?'s':'');
  if(k.includes('archivage'))return c.archivedAt?'Dossier archivé · Sauvegardes et reprise':'PDF · Conservation du dossier';
  if(k.includes('reprise'))return 'Historique conservé';
  if(k.includes('pause'))return c.status==='Pause'?'Accompagnement suspendu':'Mise en pause et reprise';
  if(k.includes('historique'))return 'Décisions, changements et justificatifs';
  return 'Afficher les informations et actions';
 }
 function needsAttention(c,label){
  const k=key(label);
  if(k.includes('renouvellement')){
   const end=String(c.end||'').slice(0,10);
   if(!end)return false;
   const due=Date.parse(end+'T12:00:00Z'),now=Date.parse(localDateISO()+'T12:00:00Z');
   return Number.isFinite(due)&&Number.isFinite(now)&&(due-now)/86400000<=14&&
     !(c.renewals||[]).some(r=>r.dueDate===c.end);
  }
  return false;
 }
 function buildSection(card,c,index){
  const label=panelLabel(card);
  const section=document.createElement('details');
  section.className='akAdminSection';
  section.dataset.akAdminFold=key(label)+'-'+index;
  section.dataset.akAdminClient=c.id||'';
  section.open===false;
  const summary=document.createElement('summary');
  const title=document.createElement('span');title.className='akAdminTitle';title.textContent=label;
  const meta=document.createElement('span');meta.className='akAdminMeta'+(needsAttention(c,label)?' attention':'');
  meta.textContent=summaryInfo(c,label);
  const arrow=document.createElement('span');arrow.className='akAdminChevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';
  summary.append(title,meta,arrow);
  const body=document.createElement('div');body.className='akAdminBody';
  const heading=card.querySelector('h3');
  if(heading)heading.remove();
  body.appendChild(card);
  section.append(summary,body);
  section.open=openState.get(c.id+':'+section.dataset.akAdminFold)===true;
  return section;
 }
 function existingSection(section,c,index){
  const label=text(section.querySelector(':scope > summary')?.textContent)||'Historique';
  section.classList.add('akAdminSection','akAdminSectionNative');
  section.dataset.akAdminFold=key(label).slice(0,50)+'-'+index;
  section.dataset.akAdminClient=c.id||'';
  const summary=section.querySelector(':scope > summary');
  if(summary&&!summary.querySelector('.akAdminChevron')){
   const arrow=document.createElement('span');
   arrow.className='akAdminChevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';
   summary.appendChild(arrow);
  }
  section.open=openState.get(c.id+':'+section.dataset.akAdminFold)===true;
  return section;
 }
 const originalAdmin=admin;
 admin=function(c){
  const original=originalAdmin(c);
  if(!c||!original||typeof document==='undefined')return original;
  const source=document.createElement('div');
  source.innerHTML=original;
  const output=document.createElement('div');
  output.className='akAdminAcc';
  output.dataset.clientId=c.id||'';
  const top=document.createElement('div');top.className='akAdminAccHead';
  top.innerHTML='<div><strong>Gestion administrative</strong><p>Choisis une rubrique pour consulter ou modifier ses informations.</p></div>'+
   '<div class="akAdminAccTools"><button type="button" data-ak-all="open">Tout ouvrir</button>'+
   '<button type="button" data-ak-all="close">Tout fermer</button></div>';
  output.appendChild(top);
  let index=0;
  // Seuls les blocs de premier niveau sont transformés.
  // Les détails internes (PDF, sauvegarde, historique) restent inchangés.
  [...source.children].forEach(el=>{
   if(el.matches('.grid2')&&[...el.children].length&&
       [...el.children].every(child=>child.matches('.card.panel'))){
    [...el.children].forEach(child=>output.appendChild(buildSection(child,c,++index)));
    return;
   }
   if(el.matches('details.card.panel')){
    output.appendChild(existingSection(el,c,++index));
    return;
   }
   if(el.matches('.card.panel')){
    output.appendChild(buildSection(el,c,++index));
    return;
   }
   output.appendChild(el);
  });
  return output.outerHTML;
 };
 document.addEventListener('toggle',e=>{
  const section=e.target;
  if(!section?.matches?.('.akAdminAcc > .akAdminSection'))return;
  if(section.dataset.akAdminClient&&section.dataset.akAdminFold){
   openState.set(section.dataset.akAdminClient+':'+section.dataset.akAdminFold,section.open);
  }
 },true);
 document.addEventListener('click',e=>{
  const btn=e.target.closest?.('.akAdminAccTools [data-ak-all]');
  if(!btn)return;
  const wrapper=btn.closest('.akAdminAcc');
  if(!wrapper)return;
  e.preventDefault();
  const expanded=btn.dataset.akAll==='open';
  wrapper.querySelectorAll(':scope > .akAdminSection').forEach(section=>{
   section.open=expanded;
   if(section.dataset.akAdminFold){
    openState.set((section.dataset.akAdminClient||'')+':'+section.dataset.akAdminFold,expanded);
   }
  });
 });
 window.AKP_ADMIN_ACCORDIONS_READY=true;
})();
