/* AK PRIME — Bandeau d'identité du passeport.
 * Barre claire compacte : ne concurrence plus la couverture du Sommaire.
 * La discipline, la spécialité et le niveau utilisent les mêmes sources que le Profil sportif.
 * Calcul de semaine sur jours calendaires pour éviter les S+1 déclenchées dans la journée.
 */
(function(){
 'use strict';
 const css=document.createElement('style');
 css.textContent=[
  '.akp-passport .akPHead{display:flex!important;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:13px 22px;min-height:82px;grid-template-columns:none!important;padding:14px 25px!important;background:#fff!important;border-bottom:1px solid #e2e8ee;color:#21374b!important;box-shadow:none;overflow:visible}',
  '.akp-passport .akPHead:after{display:none!important}',
  '.akPHeadIdentity{display:flex;align-items:center;min-width:0;gap:12px}',
  '.akPHeadMonogram{display:grid;place-items:center;border-radius:10px;background:#f2e5cd;color:#85602e;width:40px;height:40px;min-width:40px;font-size:16px;font-weight:900}',
  '.akPHeadPerson{min-width:0}.akPHeadPerson>span{display:block;color:#9a713e;text-transform:uppercase;letter-spacing:.10em;font-size:9px;font-weight:900}',
  '.akPHeadPerson>strong{display:block;color:#1c3448;font-size:17px;font-weight:850;line-height:1.2;margin-top:3px;overflow-wrap:anywhere}',
  '.akPHeadPerson>small{display:block;color:#778b9c;font-size:11px;font-weight:650;margin-top:3px;line-height:1.35}',
  '.akPHeadInfo{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:8px}',
  '.akPHeadTag{display:inline-flex;align-items:center;gap:5px;border-radius:7px;border:1px solid #e0e8ef;background:#f6f9fb;color:#476074;padding:7px 9px;font-size:10px;font-weight:800;white-space:nowrap}',
  '.akPHeadTag.active{background:#eff7f2;border-color:#d7eadf;color:#367358}',
  '.akPHeadTag.summary{background:#fcf7ef;border-color:#efe2cc;color:#94703a}',
  '.akPHeadTag small{font-size:10px;font-weight:600;color:#7c90a2}',
  '.akPHeadTag .akPHeadDot{color:#ba9354;font-weight:900}',
  '@media(max-width:880px){.akp-passport .akPHead{align-items:flex-start;padding:13px 17px!important}.akPHeadInfo{justify-content:flex-start}}',
  '@media(max-width:480px){.akPHeadInfo{gap:6px}.akPHeadTag{font-size:9px;padding:6px 7px}.akPHeadPerson>strong{font-size:15px}.akPHeadPerson>small{font-size:10px}}',
  '@media print{.akp-passport .akPHead{border-bottom:1px solid #dce3ea;break-inside:avoid}}'
 ].join('\n');document.head.appendChild(css);
 function value(v){
  if(Array.isArray(v))return v.map(x=>String(x||'').trim()).filter(Boolean).join(', ');
  return v==null?'':String(v).trim();
 }
 function profile(m,key,fallback=''){
  const overrides=m.akPassportProfile?.profile_overrides||{};
  const answers=m.akProfileAnswers||{};
  if(Object.prototype.hasOwnProperty.call(overrides,key))return value(overrides[key]);
  return value(answers[key])||value(fallback);
 }
 function parisToday(){
  const parts=new Intl.DateTimeFormat('en-GB',
   {timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=k=>parts.find(p=>p.type===k)?.value||'';
  return part('year')+'-'+part('month')+'-'+part('day');
 }
 const time=d=>Date.parse(String(d||'').slice(0,10)+'T12:00:00Z');
 const DAY=86400000;
 function cycleInfo(cycle){
  if(!cycle?.start||!cycle?.end)return {pct:0,weekNow:null,weeks:null,remaining:null};
  const start=time(cycle.start),end=time(cycle.end),now=time(parisToday());
  if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(now)||end<=start)
   return {pct:0,weekNow:null,weeks:null,remaining:null};
  const total=Math.round((end-start)/DAY);
  const days=Math.round((now-start)/DAY);
  const weeks=Math.max(1,Math.ceil(total/7));
  const weekNow=Math.max(1,Math.min(weeks,Math.floor(Math.max(0,days)/7)+1));
  const pct=Math.min(100,Math.max(0,Math.round((days/total)*100)));
  return {pct,weekNow,weeks,remaining:Math.round((end-now)/DAY)};
 }
 cycleProgressPct=function(cycle){return cycleInfo(cycle).pct;};
 passportCycleStats=function(cycle){return cycleInfo(cycle);};
 passportHeader=function(m){
  const cs=passportCycleStats(m.cycle),deadline=passportNextDeadline(m);
  const sport=profile(m,'sport',m.sport),position=profile(m,'position',m.specialty),
   level=profile(m,'level',m.level);
  const profileLine=[sport,position,level].filter(Boolean).join(' · ');
  const status=passportStatusLabel(m.status);
  const cycle=cs.weekNow&&cs.weeks?'<span class="akPHeadTag summary">S'+cs.weekNow+' / '+cs.weeks+
   ' <small>· '+cs.pct+' % du cycle</small></span>':'';
  const deadlineHtml=deadline?'<span class="akPHeadTag">'+esc(deadline.label)+
    ' <span class="akPHeadDot">·</span> '+fmtDate(deadline.date)+'</span>':'';
  return '<header class="akp-athlete-head akPHead">'+
   '<div class="akPHeadIdentity"><div class="akPHeadMonogram" aria-hidden="true">'+
    esc(m.initials||'AK')+'</div><div class="akPHeadPerson">'+
     '<span>Passeport athlète · AK PRIME</span>'+
     '<strong>'+esc(m.name||'Client AK PRIME')+'</strong>'+
     (profileLine?'<small>'+esc(profileLine)+'</small>':'')+
    '</div></div>'+
    '<div class="akPHeadInfo">'+
     (m.pole||m.offer?'<span class="akPHeadTag">'+esc([m.pole,m.offer].filter(Boolean).join(' · '))+'</span>':'')+
     '<span class="akPHeadTag '+(['Suivi actif'].includes(status)?'active':'')+'">'+esc(status)+'</span>'+
     cycle+deadlineHtml+
    '</div></header>';
 };
 window.AKP_PASSPORT_HEADER_CLEAN_READY=true;
})();