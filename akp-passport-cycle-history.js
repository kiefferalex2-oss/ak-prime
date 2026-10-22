/* AK PRIME — Historique des cycles dans le Passeport.
 * Référentiel : Supabase.cycles. Aucune duplication de la programmation Optitrainer.
 */
(function(){
 'use strict';
 const foldCSS=document.createElement('style');
 foldCSS.textContent="\n.akp-cycle-fold{background:#fff;border:1px solid #dce3e9;border-radius:12px;overflow:hidden}\n.akp-cycle-fold .akp-cycle-fold-head{display:flex;gap:15px;justify-content:space-between;align-items:center;cursor:pointer;list-style:none;padding:15px 17px}\n.akp-cycle-fold .akp-cycle-fold-head::-webkit-details-marker{display:none}\n.akp-cycle-fold .akp-cycle-fold-head:hover{background:#f9fbfc}\n.akp-cycle-fold .akp-cycle-fold-title{display:grid;gap:6px;min-width:0}\n.akp-cycle-fold .akp-cycle-fold-title>span{font-size:9px;letter-spacing:.12em;font-weight:850;color:#a67c46}\n.akp-cycle-fold .akp-cycle-fold-title>strong{font-size:16px;line-height:1.3;font-weight:850;color:#1d3348}\n.akp-cycle-fold .akp-cycle-fold-controls{display:flex;align-items:center;gap:13px;flex-shrink:0}\n.akp-cycle-fold .akp-cycle-fold-controls>span:first-child{font-size:11px;font-weight:800;color:#577087;background:#edf3f8;padding:7px 11px;border-radius:999px;white-space:nowrap}\n.akp-cycle-fold .akp-cycle-fold-arrow{color:#8b9aaa;font-size:20px;line-height:1;transform-origin:center;transition:transform .16s}\n.akp-cycle-fold[open] .akp-cycle-fold-arrow{transform:rotate(180deg)}\n.akp-cycle-fold .akp-cycle-fold-body{border-top:1px solid #e8edf1;padding:15px 17px 17px}\n.akp-cycle-fold .akp-cycle-fold-body>p:first-child{margin-top:0}\n@media(max-width:620px){\n .akp-cycle-fold .akp-cycle-fold-head{padding:13px 12px;gap:7px}\n .akp-cycle-fold .akp-cycle-fold-title>strong{font-size:14px}\n .akp-cycle-fold .akp-cycle-fold-controls{gap:6px}\n .akp-cycle-fold .akp-cycle-fold-controls>span:first-child{font-size:9px;padding:6px 8px}\n .akp-cycle-fold .akp-cycle-fold-body{padding:12px}\n}\n";
 document.head.appendChild(foldCSS);
 function iso(v){return v?String(v).slice(0,10):''}
 function normalized(row){
   return {
     id:row.id||'',
     title:row.title||'Cycle sans intitulé',
     start:iso(row.start_date||row.start),
     end:iso(row.end_date||row.end),
     status:String(row.status||''),
     priorities:String(row.priorities||'').trim(),
   };
 }
 function allCycles(list,current){
   const rows=Array.isArray(list)?list.map(normalized):[];
   const cur=normalized(current||{});
   if((cur.start||cur.end)&&!rows.some(r=>
     (r.id&&cur.id&&r.id===cur.id)||
     (r.start===cur.start&&r.end===cur.end&&r.title===cur.title))){
     rows.push(cur);
   }
   return rows.sort((a,b)=>String(b.start).localeCompare(String(a.start))||
      String(b.end).localeCompare(String(a.end)));
 }
 function duration(c){
   if(!c.start||!c.end)return null;
   const d1=new Date(c.start+'T12:00:00Z');
   const d2=new Date(c.end+'T12:00:00Z');
   if(!Number.isFinite(d1.getTime())||!Number.isFinite(d2.getTime()))return null;
   const count=Math.round((d2-d1)/86400000)+1; // premier et dernier jours compris
   if(count<=0)return null;
   const weeks=Math.floor(count/7),days=count%7;
   return {
     days:count,
     label:weeks&&days?weeks+' semaine'+(weeks>1?'s':'')+' et '+days+' jour'+(days>1?'s':''):
       weeks?weeks+' semaine'+(weeks>1?'s':''):count+' jour'+(count>1?'s':'')
   };
 }
 function cycleStatus(c){
   const today=localDateISO(),s=c.status.toLowerCase();
   if(['cancelled','canceled','annulé','annule'].includes(s))return {label:'Annulé',css:'amber'};
   if(['completed','complete','finished','done','closed','terminé','termine'].includes(s))
     return {label:'Terminé',css:'green'};
   if(c.start&&c.start>today)return {label:'À venir',css:'blue'};
   if(c.end&&c.end<today)return {label:'Période écoulée',css:'green'};
   if(c.start&&c.start<=today&&(!c.end||c.end>=today))return {label:'En cours',css:'blue'};
   return {label:'À dater',css:'amber'};
 }
 function cycleRows(m){
   return allCycles(m.cycleHistory||[],m.cycle);
 }
 function durationBlock(m){
   const cycles=cycleRows(m);
   const completed=cycles.filter(c=>c.end&&c.end<localDateISO()||
      ['completed','complete','finished','done','closed','terminé','termine'].includes(c.status.toLowerCase())).length;
   return '<details class="akp-cycle-fold" style="margin-top:16px">'+
      '<summary class="akp-cycle-fold-head">'+
      '<span class="akp-cycle-fold-title"><span>HISTORIQUE DES CYCLES</span>'+
      '<strong>Cycles réalisés et durées</strong></span>'+
      '<span class="akp-cycle-fold-controls"><span>'+cycles.length+
      ' cycle'+(cycles.length>1?'s':'')+'</span>'+
      '<span class="akp-cycle-fold-arrow" aria-hidden="true">⌄</span></span></summary>'+
      '<div class="akp-cycle-fold-body">'+
      '<p class="muted tiny" style="margin:7px 0 16px">Historique des périodes suivies chez AK PRIME. '+
      'Les séances et les contenus de programmation restent consultables dans Optitrainer. '+
      'La durée est calculée du premier au dernier jour inclus.</p>'+
      (cycles.length?'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'+
       '<thead><tr><th scope="col">Cycle</th><th scope="col">Période</th><th scope="col">Durée</th><th scope="col">État</th></tr></thead><tbody>'+
       cycles.map(c=>{
          const d=duration(c),st=cycleStatus(c);
          return '<tr><td><strong>'+esc(c.title)+'</strong>'+
           '<div class="muted tiny" style="margin-top:6px;white-space:pre-wrap">'+
           '<b>Objectif du cycle :</b> '+esc(c.priorities||'À définir')+'</div></td>'+
           '<td>'+esc(c.start?fmtDate(c.start):'Début à compléter')+
           ' → '+esc(c.end?fmtDate(c.end):'Fin à compléter')+'</td>'+
           '<td>'+esc(d?.label||'À déterminer')+'</td>'+
           '<td><span class="status '+st.css+'">'+esc(st.label)+'</span></td></tr>';
       }).join('')+'</tbody></table></div>':
       '<div class="akp-empty-inline">Aucun cycle enregistré dans le dossier.</div>')+
      '</div></details>';
 }
 const legacyLoad=loadSupabaseData;
 loadSupabaseData=async function(...args){
   const result=await legacyLoad.apply(this,args);
   if(!authUser?.id||!['owner','coach'].includes(authProfile?.role))return result;
   const {data,error}=await supa.from('cycles')
       .select('id,client_id,title,start_date,end_date,status,priorities')
       .order('start_date',{ascending:false});
   if(error)throw Error('Historique des cycles indisponible : '+error.message);
   db.passportCycleHistory=data||[];
   return result;
 };
 const legacyEnterPortal=enterClientPortal;
 enterClientPortal=async function(...args){
   await legacyEnterPortal.apply(this,args);
   const session=clientPortalState;
   if(!session?.client||authProfile?.role!=='client')return;
   const {data,error}=await supa.from('cycles')
      .select('id,client_id,title,start_date,end_date,status,priorities')
      .eq('client_id',session.client.id)
      .order('start_date',{ascending:false});
   if(clientPortalState!==session)return;
   session.passportCycleHistory=data||[];
   session.passportCycleHistoryError=error?.message||'';
   if(error)console.warn('Historique des cycles AK PRIME :',error.message);
   renderClientPortal();
 };
 const oldCoachModel=passportModelFromCoach;
 passportModelFromCoach=function(c){
   const m=oldCoachModel(c);
   m.cycleHistory=(db.passportCycleHistory||[]).filter(x=>x.client_id===c.id);
   if(c.cycle?._id)m.cycle.id=c.cycle._id;
   return m;
 };
 const oldClientModel=passportModelFromClient;
 passportModelFromClient=function(s){
   const m=oldClientModel(s);
   m.cycleHistory=s.passportCycleHistory||[];
   if(s.cycle?.id)m.cycle.id=s.cycle.id;
   return m;
 };
 const oldCyclePage=passportCyclePage;
 passportCyclePage=function(m){
   const original=oldCyclePage(m);
   const insertion=durationBlock(m);
   const closing=original.lastIndexOf('</div>');
   if(closing<0)return original+insertion;
   return original.slice(0,closing)+insertion+original.slice(closing);
 };
 const oldTimeline=passportTimelinePage;
 passportTimelinePage=function(m){
   const curr=normalized(m.cycle||{});
   const existing=(m.events||[]).slice();
   const seen=new Set(existing.map(e=>iso(e.date)+'|'+String(e.title).toLowerCase()));
   for(const cycle of cycleRows(m)){
     if(!cycle.end)continue;
     if((curr.id&&cycle.id&&curr.id===cycle.id)||
       (curr.start===cycle.start&&curr.end===cycle.end&&curr.title===cycle.title))continue;
     const period=duration(cycle);
     const title='Fin de cycle — '+cycle.title;
     const key=cycle.end+'|'+title.toLowerCase();
     if(seen.has(key))continue;
     seen.add(key);
     existing.push({date:cycle.end,title,
       detail:'Du '+(cycle.start?fmtDate(cycle.start):'début à préciser')+' au '+
         fmtDate(cycle.end)+(period?' · Durée : '+period.label:'')+
         ' · Objectif : '+(cycle.priorities||'À définir')});
   }
   return oldTimeline({...m,events:existing});
 };
 window.AKP_CYCLE_HISTORY_READY=true;
})();
