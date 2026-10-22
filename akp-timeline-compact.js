/* AK PRIME — Chronologie compacte : un jalon visuel par date, événements regroupés.
 * Mise en forme uniquement : les données et l'ancienne génération d'événements restent intactes.
 */
(function(){
 'use strict';
 const css=document.createElement('style');
 css.textContent=[
 '.akTimelineCompact{max-width:1160px;margin:0 auto}',
 '.akTimelineCompactHead{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:19px}',
 '.akTimelineCompactHead>div>span{display:block;font-size:10px;letter-spacing:.14em;color:#ad8047;font-weight:900;margin-bottom:7px}',
 '.akTimelineCompactHead h2{font-size:clamp(24px,3vw,30px);margin:0;color:#182f44;font-weight:900;letter-spacing:-.03em}',
 '.akTimelineCompactHead p{color:#71859a;font-size:12px;margin:7px 0 0;line-height:1.6}',
 '.akTimelineCompactCounter{padding:9px 13px;border:1px solid #dbe3ea;background:#fff;border-radius:10px;color:#637b91;font-size:11px;font-weight:750;white-space:nowrap}',
 '.akTimelineCompactRail{position:relative;display:grid;gap:12px;padding-left:4px}',
 '.akTimelineCompactRail:before{content:"";position:absolute;left:105px;top:21px;bottom:22px;width:2px;background:#e7ebf0}',
 '.akTimelineDay{position:relative;display:grid;grid-template-columns:91px 12px minmax(0,1fr);align-items:start;gap:9px}',
 '.akTimelineDate{font-size:12px;color:#233a4c;font-weight:850;padding:14px 0 0;line-height:1.4;white-space:nowrap;text-align:right}',
 '.akTimelineDate small{display:block;margin-top:3px;font-size:10px;color:#94a2ae;font-weight:700}',
 '.akTimelinePin{background:#cba15e;box-shadow:0 0 0 4px #f7f2e8;border:2px solid #fff;width:12px;height:12px;border-radius:50%;margin-top:16px;z-index:1}',
 '.akTimelineDay.past .akTimelinePin{background:#9eafbb;box-shadow:0 0 0 4px #eff2f5}',
 '.akTimelineGroup{min-width:0;background:#fff;border:1px solid #e1e7ed;box-shadow:0 7px 22px rgba(19,42,62,.03);border-radius:12px;padding:10px 14px}',
 '.akTimelineGroupTop{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:9px}',
 '.akTimelineGroupTop strong{color:#21384d;font-size:12px;font-weight:850}',
 '.akTimelineGroupTop span{font-size:10px;background:#edf2f6;color:#617b92;padding:5px 8px;border-radius:999px;font-weight:800}',
 '.akTimelineEvents{display:grid;gap:0}',
 '.akTimelineEvent{display:grid;grid-template-columns:minmax(84px,112px) minmax(0,1fr);gap:11px;align-items:center;padding:7px 0;border-top:1px solid #eef1f5}',
 '.akTimelineEvent:first-child{border-top:none;padding-top:0}',
 '.akTimelineType{font-size:10px;color:#718295;background:#f0f4f7;border-radius:6px;display:inline-block;padding:5px 7px;font-weight:800;line-height:1.25;max-width:100%;overflow-wrap:anywhere}',
 '.akTimelineType.competition{background:#fbf0dd;color:#98713b}',
 '.akTimelineType.test{background:#e8f3f8;color:#306883}',
 '.akTimelineType.cycle{background:#e8f4ec;color:#3f7657}',
 '.akTimelineType.medical{background:#fceee9;color:#ad5f4d}',
 '.akTimelineEventContent{min-width:0}',
 '.akTimelineEventTests{grid-template-columns:max-content minmax(0,1fr);gap:12px;align-items:center}',
 '.akTimelineEventTests .akTimelineType{white-space:nowrap;overflow-wrap:normal}',
 '.akTimelineResultLine{color:#334b60;font-size:12px;line-height:1.6;min-width:0;overflow-wrap:anywhere;font-weight:700}',
 '.akTimelineExtra[open]>summary{margin-bottom:4px}',
 '.akTimelineEventContent>strong{display:block;color:#21374a;font-size:12px;font-weight:850;line-height:1.45;overflow-wrap:anywhere}',
 '.akTimelineEventContent>p{margin:3px 0 0;color:#77899a;font-size:11px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}',
 '.akTimelineAuto{margin-left:6px;color:#99a5b2;font-size:9px;font-weight:800}',
 '.akTimelineExtra{border-top:1px solid #e9edf1;padding-top:3px;margin-top:7px}',
 '.akTimelineExtra>summary{cursor:pointer;list-style:none;padding:9px 0 3px;font-size:11px;color:#946b36;font-weight:850}',
 '.akTimelineExtra>summary::-webkit-details-marker{display:none}',
 '.akTimelineExtra[open]>summary{padding-bottom:10px}',
 '.akTimelineEmpty{border:1px dashed #d9e1e8;border-radius:12px;background:#fff;padding:25px;color:#76899a;text-align:center;font-size:12px}',
 '@media(max-width:640px){.akTimelineCompactRail:before{left:11px}.akTimelineDay{grid-template-columns:13px minmax(0,1fr);gap:10px}.akTimelineDate{grid-column:2;grid-row:1;text-align:left;padding:0 0 1px;color:#b08348}.akTimelinePin{grid-column:1;grid-row:1;margin-top:2px}.akTimelineGroup{grid-column:2;grid-row:2;padding:12px}.akTimelineEvent:not(.akTimelineEventTests){grid-template-columns:1fr;gap:5px}.akTimelineEventTests{grid-template-columns:max-content minmax(0,1fr);gap:8px}.akTimelineType{font-size:9px}.akTimelineCompactHead{align-items:flex-start}}',
 '@media print{.akTimelineGroup{box-shadow:none}.akTimelineExtra>summary{display:none!important}.akTimelineExtra .akTimelineEvent{display:grid!important}.akTimelineDay{break-inside:avoid}}'
 ].join('\n');document.head.appendChild(css);
 const original=passportTimelinePage;
 function dateKey(display){
  const s=String(display||'').trim();
  const match=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match?match[3]+'-'+match[2]+'-'+match[1]:s;
 }
 function groupTimeline(source){
  const wrapper=document.createElement('div');
  wrapper.innerHTML=source;
  const events=wrapper.querySelectorAll('.akp-timeline-item');
  const days=new Map(),today=localDateISO();
  events.forEach(item=>{
   const date=item.querySelector('.akp-timeline-date strong')?.textContent?.trim()||'';
   const title=item.querySelector('.akp-timeline-card h3')?.textContent?.trim()||'';
   if(!date||!title)return;
   const key=dateKey(date);
   const detail=item.querySelector('.akp-timeline-card p')?.textContent?.trim()||'';
   const category=item.querySelector('.akp-type')?.textContent?.trim()||'Jalon';
   const keyClass=Array.from(item.classList).find(c=>['test','cycle','competition','visio','medical','contract','milestone'].includes(c))||'milestone';
   const auto=!!item.querySelector('.akp-auto');
   if(!days.has(key))days.set(key,{date,key,events:[],seen:new Set()});
   const day=days.get(key),identity=(title+'|'+detail).toLocaleLowerCase('fr-FR').replace(/\s+/g,' ').trim();
   // Seuls les vrais doublons (même intitulé ET mêmes détails) sont fusionnés.
   // Deux résultats de test différents le même jour restent visibles séparément.
   if(!day.seen.has(identity)){
    day.seen.add(identity);day.events.push({identity,title,detail,category,keyClass,auto});
   }
  });
  return [...days.values()].sort((a,b)=>a.key.localeCompare(b.key))
   .map(d=>({date:d.date,key:d.key,entries:d.events,past:d.key<=today}));
 }
 function completedTest(e){
  // Seuls les résultats réellement saisis sont regroupés, pas les évaluations prévues.
  const matched=String(e.title||'').match(/^(.+?)\s+r[eé]alis[eé]e?\s*[—–-]\s*(.+)$/i);
  if(!matched||!/^(?:évaluation|evaluation|retest|re-test|test|mesure|bilan|fin de cycle)/i.test(matched[1].trim()))return null;
  const name=matched[2].trim();
  if(!name)return null;
  const parts=String(e.detail||'').replace(/^Résultat\s*:\s*/i,'').trim().split(/\s+·\s+/);
  const value=parts.shift()||'Non renseigné',context=parts.join(' · ').trim();
  return {name,phase:matched[1].trim(),value:value+
    (context&&!name.toLocaleLowerCase('fr-FR').includes(context.toLocaleLowerCase('fr-FR'))?' ('+context+')':'')};
 }
 function compactEntries(entries){
  const tests=[],others=[];
  entries.forEach(e=>{
   const test=completedTest(e);
   if(test)tests.push(test);else others.push(e);
  });
  const rank={competition:0,medical:1,visio:2,cycle:3,milestone:4,contract:5,test:6};
  // Mettre les étapes importantes avant les repères administratifs automatiques.
  others.sort((a,b)=>(Number(!!a.auto)-Number(!!b.auto))||
    ((rank[a.keyClass]??7)-(rank[b.keyClass]??7)));
  if(!tests.length)return others;
  const labels=new Map();
  tests.forEach(t=>labels.set(t.name,(labels.get(t.name)||0)+1));
  const phaseNames=tests.map(t=>t.phase.toLocaleLowerCase('fr-FR'));
  let kind='Tests';
  if(phaseNames.every(x=>x.startsWith('évaluation initiale')||x.startsWith('evaluation initiale')))kind='Éval. initiale';
  else if(phaseNames.every(x=>x.startsWith('retest')||x.startsWith('re-test')))kind='Retest';
  else if(phaseNames.every(x=>x.startsWith('bilan')||x.startsWith('fin de cycle')))kind='Bilan';
  else if(phaseNames.every(x=>x.startsWith('mesure')))kind='Mesures';
  const inline=tests.map(t=>(labels.get(t.name)>1?t.phase+' — ':'')+t.name+' : '+t.value).join('  ·  ');
  return [{category:kind+(tests.length>1?' ('+tests.length+')':''),keyClass:'test',
   title:'Tests réalisés',detail:inline,isTestSummary:true},...others];
 }
 function eventRow(e){
  if(e.isTestSummary)return '<div class="akTimelineEvent akTimelineEventTests">'+
   '<span class="akTimelineType test">'+esc(e.category)+'</span>'+
   '<div class="akTimelineResultLine">'+esc(e.detail)+'</div></div>';
  return '<div class="akTimelineEvent">'+
   '<div><span class="akTimelineType '+esc(e.keyClass)+'">'+esc(e.category)+'</span></div>'+
   '<div class="akTimelineEventContent"><strong>'+esc(e.title)+
     (e.auto?'<small class="akTimelineAuto">AUTO</small>':'')+'</strong>'+
     (e.detail?'<p>'+esc(e.detail)+'</p>':'')+'</div></div>';
 }
 function page(days){
  const count=days.reduce((n,x)=>n+x.entries.length,0);
  const timeline=days.map(day=>{
   // Une seule ligne visible par date ; toute autre étape est accessible à la demande.
   const entries=compactEntries(day.entries);
   const visible=entries.slice(0,1),extra=entries.slice(1);
   return '<div class="akTimelineDay '+(day.past?'past':'future')+'">'+
    '<div class="akTimelineDate">'+esc(day.date)+'</div><span class="akTimelinePin" aria-hidden="true"></span>'+
    '<article class="akTimelineGroup">'+
    '<div class="akTimelineEvents">'+visible.map(eventRow).join('')+'</div>'+
    (extra.length?'<details class="akTimelineExtra"><summary>Afficher '+extra.length+
      ' autre'+(extra.length>1?'s':'')+' événement'+(extra.length>1?'s':'')+' ↓</summary>'+
     '<div class="akTimelineEvents">'+extra.map(eventRow).join('')+'</div></details>':'')+
    '</article></div>';
  }).join('');
  return '<div class="akp-page akTimelineCompact">'+
   '<header class="akTimelineCompactHead"><div><span>CHRONOLOGIE / PARCOURS</span>'+
    '<h2>Les étapes du sportif</h2>'+
    '<p>Les moments importants en un coup d’œil. Dépliez une date pour voir le reste.</p></div>'+
    '<span class="akTimelineCompactCounter">'+days.length+' date'+(days.length>1?'s':'')+
     ' · '+count+' événement'+(count>1?'s':'')+'</span></header>'+
    (days.length?'<div class="akTimelineCompactRail">'+timeline+'</div>':
     '<div class="akTimelineEmpty">Aucun événement enregistré pour le moment.</div>')+'</div>';
 }
 passportTimelinePage=function(m){
  return page(groupTimeline(original(m)));
 };
 window.AKP_COMPACT_TIMELINE_READY=true;
})();
