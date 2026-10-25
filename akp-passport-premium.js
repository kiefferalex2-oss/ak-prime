/* AK PRIME — Passeport / Portrait athlète premium. Présentation uniquement. */
(function(){
 'use strict';
 const style=document.createElement('style');
 style.textContent=[
 '.akLux{--ink:#1c3044;--gold:#d8ac66;--muted:#76879b;max-width:1220px;margin:auto;color:var(--ink)}',
 '.akLuxHero{position:relative;overflow:hidden;background:radial-gradient(circle at 98% 0%,#3a4b57 0%,transparent 34%),linear-gradient(120deg,#101e2f,#1d364d);color:white;padding:30px 32px 25px;border-radius:18px;box-shadow:0 19px 40px rgba(16,36,55,.14)}',
 '.akLuxHero:after{position:absolute;content:"";width:350px;height:350px;border:1px solid rgba(227,188,121,.23);border-radius:50%;right:-130px;bottom:-230px;box-shadow:0 0 0 64px rgba(227,188,121,.035),0 0 0 125px rgba(227,188,121,.025);pointer-events:none}',
 '.akLuxHeroTop,.akLuxHeroBody,.akLuxHeroBottom{position:relative;z-index:1}',
 '.akLuxHeroTop{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:10px;letter-spacing:.15em;font-weight:850;color:#f0c88c}',
 '.akLuxHeroBody{display:grid;grid-template-columns:1.4fr .6fr;gap:25px;align-items:end;padding:34px 0 24px}',
 '.akLuxHeroMain>span,.akLuxHeroNext>span{display:block;font-size:10px;font-weight:850;letter-spacing:.13em;color:#e8bc7b}',
 '.akLuxHero h2{font-size:clamp(26px,3vw,39px);line-height:1.17;letter-spacing:-.04em;color:#fff;margin:12px 0 13px;font-weight:860;overflow-wrap:anywhere}',
 '.akLuxHero p{color:#cbd8e3;font-size:13px;line-height:1.65;white-space:pre-wrap;margin:0;max-width:680px}',
 '.akLuxHeroNext{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);border-radius:11px;padding:15px;margin-top:10px}',
 '.akLuxHeroNext strong{font-size:14px;color:#fff;display:block;margin:6px 0;line-height:1.45}',
 '.akLuxHeroNext small{font-size:11px;color:#c6d4e1}',
 '.akLuxHeroBottom{display:flex;gap:12px;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid rgba(255,255,255,.15)}',
 '.akLuxTags{display:flex;flex-wrap:wrap;gap:7px}.akLuxTags span{border:1px solid rgba(255,255,255,.17);background:rgba(255,255,255,.05);border-radius:7px;padding:7px 9px;font-size:11px;color:#edf4fa}.akLuxTags b{color:#e9bf82;font-weight:800;margin-right:6px;font-size:10px}',
 '.akLuxHeroBtn{background:#e9c38a;color:#203246;border:0;border-radius:9px;padding:11px 15px;font-size:12px;font-weight:850;white-space:nowrap;cursor:pointer}.akLuxHeroBtn:hover{background:#f5d49f}',
 '.akLuxSection{margin-top:25px}.akLuxSectionTitle{display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:13px}',
 '.akLuxSectionTitle span{display:block;color:#b58951;font-size:10px;font-weight:850;letter-spacing:.13em;margin-bottom:5px}.akLuxSectionTitle h3{color:#1b3145;font-size:19px;font-weight:850;letter-spacing:-.025em;margin:0}.akLuxSectionTitle small{color:#8190a1;font-size:11px}',
 '.akLuxKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:11px}',
 '.akLuxKpi{background:#fff;border:1px solid #e1e7ec;border-radius:12px;min-width:0;padding:17px;box-shadow:0 9px 20px rgba(30,53,73,.035);min-height:128px;display:flex;flex-direction:column}',
 '.akLuxKpi:first-child{background:#fff9ef;border-color:#ead7b8}.akLuxKpiTop{display:flex;align-items:center;justify-content:space-between;gap:8px}',
 '.akLuxKpiTop>span{font-size:9px;color:#75879b;font-weight:850;letter-spacing:.08em}.akLuxKpi>strong{font-size:clamp(19px,2vw,26px);color:#1b3144;margin:15px 0 5px;font-weight:870;line-height:1.2;letter-spacing:-.035em;overflow-wrap:anywhere}',
 '.akLuxKpi>small{color:#7b8b9b;font-size:11px;line-height:1.5;margin-top:auto}.akLuxAction{background:transparent;border:0;color:#a87c43;font-size:10px;font-weight:800;cursor:pointer}.akLuxAction:hover{text-decoration:underline}',
 '.akLuxFootnote{font-size:11px;color:#8190a0;line-height:1.55;margin:10px 0 0}',
 '.akLuxCols{display:grid;grid-template-columns:minmax(0,1.13fr) minmax(270px,.87fr);gap:14px;align-items:start;margin-top:26px}.akLuxStack{display:grid;gap:14px;min-width:0}',
 '.akLuxCard{background:#fff;border:1px solid #e0e7ef;border-radius:14px;padding:21px;box-shadow:0 8px 25px rgba(26,51,76,.025);min-width:0}',
 '.akLuxCard .akLuxSectionTitle{margin-bottom:16px}.akLuxCard .akLuxSectionTitle h3{font-size:17px}',
 '.akLuxFact{display:grid;grid-template-columns:minmax(115px,.36fr) 1fr;gap:14px;border-bottom:1px solid #edf0f4;padding:11px 0}',
 '.akLuxFact:first-child{padding-top:0}.akLuxFact:last-child{border-bottom:0;padding-bottom:0}.akLuxFact span{color:#7a8999;font-size:11px;font-weight:700}.akLuxFact strong{color:#24394c;font-size:12px;font-weight:660;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}',
 '.akLuxFavs{display:grid;grid-template-columns:1fr 1fr;gap:9px}.akLuxFav{padding:13px;border-radius:10px;background:#f8fafc;border:1px solid #e9edf1}',
 '.akLuxFav.good{background:#f3f8f4;border-color:#dce9e0}.akLuxFav.care{background:#fdf8f0;border-color:#efe3d1}',
 '.akLuxFav>span{display:block;font-size:9px;color:#7c8c9c;letter-spacing:.075em;font-weight:850}.akLuxFav.good>span{color:#587e60}.akLuxFav.care>span{color:#a27b43}',
 '.akLuxFav p{color:#263b4e;font-size:12px;line-height:1.55;font-weight:650;white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0 0}',
 '.akLuxCard.warn{border-top:3px solid #d6ae74}.akLuxWarnItem{display:grid;grid-template-columns:24px 1fr;gap:10px;padding:12px 0;border-bottom:1px solid #edf0f3}',
 '.akLuxWarnItem:last-child{border-bottom:0}.akLuxWarnItem i{font-style:normal;background:#f8f0e3;color:#986b33;border-radius:50%;font-size:12px;width:23px;height:23px;display:grid;place-items:center;font-weight:850}',
 '.akLuxWarnItem span{display:block;color:#92744d;font-size:11px;font-weight:800;margin-bottom:6px}.akLuxWarnItem p{font-size:12px;line-height:1.55;color:#314153;white-space:pre-wrap;margin:0}',
 '.akLuxClear{font-size:12px;border-radius:9px;padding:12px;background:#f6f8fa;color:#6f8090;font-weight:650}',
 '.akLuxFold{border-radius:12px;border:1px solid #e2e8ed;background:#fff;overflow:hidden;margin-bottom:9px}',
 '.akLuxFold summary{display:flex;gap:12px;align-items:center;padding:16px;cursor:pointer;list-style:none}.akLuxFold summary::-webkit-details-marker{display:none}.akLuxFold summary:hover{background:#fafbfd}',
 '.akLuxFoldIcon{width:35px;height:35px;border-radius:8px;display:grid;place-items:center;background:#f5efe6;color:#b48749;font-size:19px;font-weight:850;flex:0 0 35px}',
 '.akLuxFoldLabel{flex:1;display:grid;gap:4px}.akLuxFoldLabel strong{font-size:13px;color:#26394a}.akLuxFoldLabel small{font-size:11px;color:#8291a0}.akLuxFold summary>b{color:#8b9aac;font-size:20px}.akLuxFold[open] summary>b{transform:rotate(180deg)}',
 '.akLuxFoldInner{border-top:1px solid #e9edf1;padding:15px;min-width:0}.akLuxFoldInner .akp-page{padding:0}.akLuxFoldInner .akProfHead{margin-top:10px}',
 '@media(max-width:930px){.akLuxCols{grid-template-columns:1fr}.akLuxHeroBody{grid-template-columns:1fr 200px}}',
 '@media(max-width:720px){.akLuxHero{padding:23px 20px}.akLuxHeroBody{grid-template-columns:1fr;gap:14px;padding:25px 0 20px}.akLuxHeroNext{margin:0}.akLuxHeroAside{display:grid;grid-template-columns:1fr 1fr;gap:9px}}',
 '@media(max-width:520px){.akLuxHeroAside,.akLuxFavs{grid-template-columns:1fr}.akLuxHeroBottom{align-items:flex-start;flex-direction:column}.akLuxFact{grid-template-columns:1fr;gap:3px}.akLuxSectionTitle{align-items:flex-start;flex-direction:column}.akLuxKpis{grid-template-columns:1fr 1fr}}',
 '@media(max-width:365px){.akLuxKpis{grid-template-columns:1fr}}',
 '@media print{.akLuxHero{print-color-adjust:exact;-webkit-print-color-adjust:exact}.akLuxHeroBtn,.akLuxAction{display:none!important}.akLuxCols{grid-template-columns:1fr 1fr}.akLuxFoldInner{display:block!important}.akLuxFold summary{display:none!important}}'
 ].join('\n');
 document.head.appendChild(style);
 const compact=document.createElement('style');
 compact.textContent="\n.akLuxCover .akLuxHero{padding:22px 27px 20px}\n.akLuxCover .akLuxHeroBody{padding:18px 0 15px;align-items:center;gap:18px;grid-template-columns:minmax(0,1.6fr) minmax(205px,.4fr)}\n.akLuxCover .akLuxHeroMain h2{font-size:clamp(25px,2.7vw,35px);margin:8px 0 9px}\n.akLuxCover .akLuxHeroMain p{font-size:12px;line-height:1.5}\n.akLuxCover .akLuxHeroNext{padding:10px 13px;margin-top:7px}\n.akLuxCover .akLuxHeroNext strong{margin:3px 0;font-size:13px}\n.akLuxCover .akLuxHeroBottom{padding-top:12px}\n.akLuxCover .akLuxHeroTop{font-size:9px}\n.akLuxHomeShortcut{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:19px 0 11px}\n.akLuxHomeShortcut>span{font-size:10px;font-weight:850;letter-spacing:.12em;color:#a27b44}\n.akLuxHomeShortcut button,.akLuxProfileTools button{background:#18334b;color:#fff;border:0;border-radius:9px;padding:10px 13px;cursor:pointer;font-size:12px;font-weight:800}\n.akLuxHomeShortcut button:hover,.akLuxProfileTools button:hover{background:#284b68}\n.akLuxCover .akp-page{padding:0!important}\n.akLuxCover .akp-page-title{margin-top:0;padding-top:0}\n.akLuxCover .akp-overview-main{margin-top:12px}\n.akLuxProfileTop{display:flex;justify-content:space-between;align-items:end;gap:18px;padding:7px 0 3px;flex-wrap:wrap}\n.akLuxProfileTop span{color:#ab7e43;font-size:10px;font-weight:900;letter-spacing:.14em}\n.akLuxProfileTop h2{color:#1a3045;font-size:clamp(23px,2.6vw,32px);line-height:1.15;letter-spacing:-.03em;margin:9px 0}\n.akLuxProfileTop p{color:#75879a;font-size:12px;line-height:1.6;max-width:670px}\n.akLuxProfileTools{display:flex;gap:8px}\n.akLuxProfilePage .akLuxSection{margin-top:18px}\n@media(max-width:720px){.akLuxCover .akLuxHeroBody{grid-template-columns:1fr;gap:9px}.akLuxCover .akLuxHero{padding:21px 19px}.akLuxCover .akLuxHeroAside{grid-template-columns:1fr 1fr}.akLuxProfileTop{align-items:start}}\n@media(max-width:520px){.akLuxCover .akLuxHeroAside{grid-template-columns:1fr}.akLuxHomeShortcut button{width:100%}}\n";
 document.head.appendChild(compact);
 const denseStyle=document.createElement('style');
 denseStyle.textContent="\n/* Passeport v38 : le sommaire est un portrait compact et non une large zone vide. */\n.akLuxCover .akLuxHeroV2{padding:23px 27px 17px}\n.akLuxCover .akLuxHeroV2 .akLuxHeroBody{grid-template-columns:minmax(190px,.85fr) minmax(220px,1.1fr) minmax(340px,1.2fr);align-items:center;gap:25px;padding:26px 0 21px}\n.akLuxAthleteIntro{display:flex;align-items:center;gap:14px;min-width:0}\n.akLuxAthleteMark{width:66px;height:66px;flex:0 0 66px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#edcc8d,#b68a4a);color:#15283b;box-shadow:0 6px 22px #0002;font-weight:900;font-size:21px;letter-spacing:-.03em}\n.akLuxEyebrow{display:block;font-size:9px;letter-spacing:.12em;font-weight:850;color:#ddb378}\n.akLuxAthleteIntro h3{font-size:clamp(19px,1.8vw,25px);font-weight:850;color:#fff;margin:6px 0 5px;line-height:1.17;overflow-wrap:anywhere}\n.akLuxAthleteIntro p{font-size:11px;color:#c8d6e3;line-height:1.4;margin:0;white-space:normal}\n.akLuxAthleteIntro small{display:block;font-size:10px;color:#aebecf;margin-top:8px;line-height:1.5}\n.akLuxCover .akLuxHeroV2 .akLuxHeroMain{padding-left:22px;border-left:1px solid rgba(233,197,138,.2);min-width:0}\n.akLuxCover .akLuxHeroV2 .akLuxHeroMain h2{font-size:clamp(25px,2.6vw,35px);margin:7px 0 10px;line-height:1.12}\n.akLuxCover .akLuxHeroV2 .akLuxHeroAside{display:grid;grid-template-columns:1fr 1fr;gap:9px;min-width:0}\n.akLuxCover .akLuxHeroV2 .akLuxHeroNext{margin:0;min-width:0;min-height:106px;padding:14px;display:flex;flex-direction:column;justify-content:center}\n.akLuxCover .akLuxHeroV2 .akLuxHeroNext strong{overflow-wrap:anywhere;font-size:14px;margin:8px 0 5px}\n.akLuxCover .akLuxHeroV2 .akLuxHeroNext small{font-size:10px;line-height:1.5}\n.akLuxCover .akLuxHeroV2 .akLuxHeroBottom{padding-top:14px}\n.akLuxCover .akLuxHeroV2 .akLuxTags>span{background:rgba(255,255,255,.055)}\n@media(max-width:1080px){\n.akLuxCover .akLuxHeroV2 .akLuxHeroBody{grid-template-columns:minmax(180px,1fr) minmax(180px,1fr);gap:17px;padding:18px 0}\n.akLuxCover .akLuxHeroV2 .akLuxHeroAside{grid-column:1/-1}\n.akLuxCover .akLuxHeroV2 .akLuxHeroNext{min-height:80px}\n}\n@media(max-width:670px){\n.akLuxCover .akLuxHeroV2 .akLuxHeroBody{grid-template-columns:1fr;gap:18px;padding:20px 0}\n.akLuxCover .akLuxHeroV2 .akLuxHeroMain{padding-left:0;border-left:0;border-top:1px solid rgba(233,197,138,.19);padding-top:15px}\n.akLuxCover .akLuxHeroV2 .akLuxHeroAside{grid-column:auto;grid-template-columns:1fr 1fr}\n.akLuxCover .akLuxHeroV2 .akLuxHeroNext{padding:12px;min-height:0}\n}\n@media(max-width:430px){\n.akLuxCover .akLuxHeroV2 .akLuxHeroAside{grid-template-columns:1fr}\n.akLuxCover .akLuxHeroV2 .akLuxHeroBottom{align-items:stretch}\n.akLuxCover .akLuxHeroV2 .akLuxHeroBtn{width:100%}\n}\n@media print{\n.akLuxCover .akLuxHeroV2 .akLuxHeroBody{grid-template-columns:1fr 1.1fr 1.3fr}\n}\n";
 document.head.appendChild(denseStyle);
 const tx=x=>Array.isArray(x)?x.join(', '):x===false?'Non':x===true?'Oui':String(x??'').trim();
 const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
 const rows=x=>Array.isArray(x)?x:[];
 const nonReport=x=>/^(?:non|rien|ras|r a s|aucun|aucune|néant|neant|pas de douleur|pas de gêne|aucune douleur|aucune gêne|rien à signaler)$/i.test(tx(x).trim());
 function rights(m){
  const pole=(m.pole||'').toLowerCase(),offer=(m.offer||'').toLowerCase();
  const phys=pole.includes('performance')||pole.includes('forme');
  return {phys,mental:pole.includes('mental'),hooper:(pole.includes('performance')&&['p2','p3'].includes(offer))||(pole.includes('forme')&&offer==='renforcé'),
   sleep:pole.includes('performance')&&offer==='p3',macro:(pole.includes('performance')&&offer==='p3')||(pole.includes('forme')&&offer==='renforcé')};
 }
 function info(m,k){
  const overrides=m.akPassportProfile?.profile_overrides||{},answer=m.akProfileAnswers||{};
  if(Object.prototype.hasOwnProperty.call(overrides,k))return tx(overrides[k]);
  if(tx(answer[k]))return tx(answer[k]);
  return tx(({sport:m.sport,position:m.specialty,level:m.level})[k]);
 }
 const plain=x=>esc(tx(x));
 function title(step,name,meta=''){
  return '<div class="akLuxSectionTitle"><div><span>'+step+'</span><h3>'+name+'</h3></div>'+
   (meta?'<small>'+plain(meta)+'</small>':'')+'</div>';
 }
 function action(m,name,label='Modifier'){
  return m.akPassportRole==='coach'?'<button class="akProfAction akLuxAction" type="button" data-action="'+name+'">'+label+' ↗</button>':'';
 }
 function card(m,label,value,subtitle,kind=''){
  return '<div class="akLuxKpi"><div class="akLuxKpiTop"><span>'+label+'</span>'+action(m,kind)+'</div>'+
   '<strong>'+plain(value||'—')+'</strong><small>'+plain(subtitle||'')+'</small></div>';
 }
 function fact(label,value){
  return tx(value)?'<div class="akLuxFact"><span>'+plain(label)+'</span><strong>'+plain(value)+'</strong></div>':'';
 }
 function group(m,items){
  const data=items.map(([label,k])=>fact(label,info(m,k))).filter(Boolean).join('');
  return data||'<p class="akLuxClear">Aucune information renseignée pour le moment.</p>';
 }
 function box(step,head,body,extra=''){
  return '<section class="akLuxCard '+extra+'">'+title(step,head)+body+'</section>';
 }
 function hero(m){
  const goal=info(m,'main_goal')||'Objectif à définir avec le coach';
  const detail=info(m,'goal_detail');
  const discipline=info(m,'sport')||m.sport||'Discipline à préciser';
  const specialty=info(m,'position')||m.specialty||'';
  const club=info(m,'club'),level=info(m,'level')||m.level||'';
  const dueRaw=info(m,'deadline');
  // Les réponses libres (« demain », « dans un mois ») ne sont pas des dates stables.
  // Elles restent lisibles en sous-texte, sans être présentées comme une échéance calculée.
  const rawDate=tx(dueRaw);
  const isoMatch=rawDate.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  const frMatch=rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const candidate=isoMatch?isoMatch[1]+'-'+isoMatch[2]+'-'+isoMatch[3]:
   frMatch?frMatch[3]+'-'+frMatch[2]+'-'+frMatch[1]:'';
  const d=candidate?new Date(candidate+'T12:00:00Z'):null;
  const isValidDate=!!d&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===candidate;
  const due=isValidDate?fmtDate(candidate):'À dater';
  const dueHelp=isValidDate?'Objectif de l’athlète':
   rawDate?'Échéance saisie : '+rawDate:'Date à préciser avec l’athlète';
  const cycle=tx(m.cycle?.title)||'Cycle à définir';
  const cycleEnd=m.cycle?.end?fmtDate(m.cycle.end):'Date de fin à définir';
  const subject=tx(m.name)||'Athlète AK PRIME';
  const initials=tx(m.initials)||subject.split(/\s+/).slice(0,2).map(s=>s.charAt(0)).join('').toUpperCase()||'AK';
  const meta=[
    ['Discipline',discipline],['Poste / spécialité',specialty],
    ['Niveau',level],['Club',club]
  ].filter(([,v])=>tx(v)).map(([k,v])=>
    '<span><b>'+plain(k)+'</b>'+plain(v)+'</span>').join('');
  return '<section class="akLuxHero akLuxHeroV2">'+
   '<div class="akLuxHeroTop"><span>✦ &nbsp; AK PRIME / DOSSIER ATHLÈTE</span>'+
   '<span>'+plain(m.pole||'ACCOMPAGNEMENT')+(m.offer?' · '+plain(m.offer):'')+'</span></div>'+
   '<div class="akLuxHeroBody">'+
     '<div class="akLuxAthleteIntro">'+
      '<div class="akLuxAthleteMark" aria-hidden="true">'+plain(initials)+'</div>'+
      '<div><span class="akLuxEyebrow">L’ATHLÈTE</span>'+
       '<h3>'+plain(subject)+'</h3>'+
       '<p>'+plain(discipline)+(specialty?' · '+plain(specialty):'')+'</p>'+
       (m.start?'<small>Accompagnement depuis le '+plain(fmtDate(m.start))+'</small>':'')+
      '</div></div>'+
     '<div class="akLuxHeroMain"><span>OBJECTIF PRIORITAIRE</span>'+
       '<h2>'+plain(goal)+'</h2>'+
       '<p>'+plain(detail||'À approfondir avec l’athlète dans le profil détaillé.')+'</p></div>'+
     '<div class="akLuxHeroAside">'+
       '<div class="akLuxHeroNext"><span>CYCLE ACTUEL</span>'+
         '<strong>'+plain(cycle)+'</strong>'+
         '<small>'+plain(cycleEnd)+'</small></div>'+
       '<div class="akLuxHeroNext"><span>ÉCHÉANCE CIBLE</span>'+
         '<strong>'+plain(due)+'</strong>'+
         '<small>'+plain(dueHelp)+'</small></div>'+
     '</div></div>'+
   '<div class="akLuxHeroBottom"><div class="akLuxTags">'+(meta||'<span>Profil à enrichir</span>')+'</div>'+
    (m.akPassportRole==='coach'?'<button class="akProfAction akLuxHeroBtn" type="button" data-action="profile">'+
      '✎ &nbsp; Modifier le profil</button>':'')+
   '</div></section>';
 }
 function metrics(m){
  const r=rights(m),p=m.akPassportProfile||{},ref=p.reference_stats||{};
  const weightHistory=rows(p.weight_history).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const weight=weightHistory[0],firstWeight=weightHistory.slice().reverse().find(x=>valid(x.kg));
  const lastFat=weightHistory.find(x=>valid(x.fat_pct));
  const firstFat=weightHistory.slice().reverse().find(x=>valid(x.fat_pct));
  const lastLean=weightHistory.find(x=>valid(x.lean_kg));
  const firstLean=weightHistory.slice().reverse().find(x=>valid(x.lean_kg));
  const number=v=>Number(v).toLocaleString('fr-FR',{maximumFractionDigits:1});
  const evolution=(last,first,unit)=>{
   if(!last||!first||last===first)return '';
   const diff=Math.round((Number(last[unit])-Number(first[unit]))*10)/10;
   return Number.isFinite(diff)?' · '+(diff>0?'+':'')+number(diff)+(unit==='fat_pct'?' pts':' kg')+' depuis la 1re mesure':'';
  };
  const period=ref.period_start&&ref.period_end?fmtDate(ref.period_start)+' – '+fmtDate(ref.period_end):
   'Valeur saisie par le coach';
  let out='';
  if(r.phys){
   out+=card(m,'CHARGE MOYENNE / SEMAINE',valid(ref.weekly_load)?Number(ref.weekly_load).toLocaleString('fr-FR')+' UA':'—',
     valid(ref.weekly_load)?period:'Référence à renseigner','metrics');
   if(r.hooper)out+=card(m,'HOOPER MOYEN',valid(ref.hooper_mean)?ref.hooper_mean+' / 28':'—','État de forme de référence','metrics');
   out+=card(m,'POIDS ACTUEL',weight&&valid(weight.kg)?number(weight.kg)+' kg':'—',
    weight&&valid(weight.kg)?'Mesure du '+fmtDate(weight.date)+evolution(weight,firstWeight,'kg'):'À renseigner','weight');
   if(lastFat)out+=card(m,'MASSE GRASSE (%MG)',number(lastFat.fat_pct)+' %',
    'Mesure du '+fmtDate(lastFat.date)+evolution(lastFat,firstFat,'fat_pct'),'weight');
   if(lastLean)out+=card(m,'MASSE MAIGRE',number(lastLean.lean_kg)+' kg',
    'Mesure du '+fmtDate(lastLean.date)+evolution(lastLean,firstLean,'lean_kg'),'weight');
   if(r.sleep){
    const cutoff=new Date();cutoff.setUTCDate(cutoff.getUTCDate()-30);
    const night=rows(m.akPassportSleep).filter(n=>n.sleep_date>=cutoff.toISOString().slice(0,10)&&valid(n.duration_hours));
    const avg=night.length?(night.reduce((a,b)=>a+Number(b.duration_hours),0)/night.length).toFixed(1):p.sleep_reference?.hours;
    out+=card(m,'SOMMEIL MOYEN',avg?avg+' h':'—',night.length?night.length+' nuits · 30 derniers jours':'Référence sommeil','sleep');
   }
   if(r.macro){const macro=m.akPassportMacro?.details||m.akPassportMacro||{};
    out+=card(m,'BUDGET ÉNERGÉTIQUE',valid(macro.kcal)?macro.kcal+' kcal':'—',
      valid(macro.kcal)?'Repère nutritionnel publié':'À définir avec le coach');
   }
  }else{
   out+=card(m,'CONTEXTE',info(m,'context')||'—','Situation de référence');
   out+=card(m,'SITUATIONS À TRAVAILLER',info(m,'difficult_situations')||'—','Points de travail');
   out+=card(m,'ÉCHÉANCE',info(m,'deadline')||'—','Repère du suivi');
  }
  return '<section class="akLuxSection">'+title('01 / REPÈRES CLÉS','Les indicateurs essentiels',r.phys?'Selon la formule '+(m.offer||''):'Préparation mentale')+
    '<div class="akLuxKpis">'+out+'</div>'+
    (r.phys?'<p class="akLuxFootnote">Moyennes de référence enregistrées dans AK PRIME. Les données quotidiennes restent dans Optitrainer.</p>':'')+'</section>';
 }
 function favorites(m){
  const list=rights(m).mental?[
   ['STRATÉGIES EFFICACES','mental_tools','good'],['SITUATIONS DIFFICILES','difficult_situations','care']]:
   [['EXERCICES APPRÉCIÉS','liked_exercises','good'],['TRÈS BIEN TOLÉRÉS','well_tolerated','good'],
    ['PEU APPRÉCIÉS','disliked_exercises','care'],['MAL TOLÉRÉS','poorly_tolerated','care']];
  return '<div class="akLuxFavs">'+list.map(([label,k,tone])=>
   '<div class="akLuxFav '+tone+'"><span>'+label+'</span><p>'+plain(info(m,k)||'À préciser avec le coach')+'</p></div>').join('')+'</div>'+
   (info(m,'technique_notes')?'<div style="margin-top:12px">'+fact('Consignes techniques',info(m,'technique_notes'))+'</div>':'');
 }
 function safety(m){
  const items=rights(m).mental?[['Accompagnement spécifique','health_professional'],['Impact ressenti','impact']]:
   [['Gêne ou limitation actuelle','current_pain'],['Antécédents de blessure','injury_history'],
    ['Restrictions / recommandations','health_restrictions']];
  const hits=items.map(([label,k])=>[label,info(m,k)]).filter(([,v])=>tx(v)&&!nonReport(v));
  const desc=hits.map(([label,v])=>
   '<div class="akLuxWarnItem"><i>!</i><div><span>'+plain(label)+'</span><p>'+plain(v)+'</p></div></div>').join('');
  return box('04 / ATTENTION','Antécédents & vigilance',
    desc||'<div class="akLuxClear">Aucun signalement précis dans les réponses disponibles.</div>'+
    '<p class="akLuxFootnote">Les déclarations sont à vérifier et à actualiser avec l’athlète. Elles ne constituent pas un avis médical.</p>','warn');
 }
 function deeper(m,legacy){
  return '<section class="akLuxSection">'+title('05 / DOCUMENTATION','Approfondir le dossier','Informations complètes')+
    '<details class="akLuxFold"><summary><span class="akLuxFoldIcon">≡</span>'+
    '<span class="akLuxFoldLabel"><strong>Questionnaire, observations et historiques complets</strong>'+
    '<small>Réponses originales, mesures détaillées et édition du suivi</small></span><b aria-hidden="true">⌄</b></summary>'+
    '<div class="akLuxFoldInner">'+legacy+'</div></details></section>';
 }
 const previous=passportOverviewPage;
 window.AKP_PREMIUM_PROFILE_PAGE=function(m){
  const mental=rights(m).mental;
  const body='<div class="akLuxCols"><div class="akLuxStack">'+
    box('02 / PARCOURS',mental?'Le profil de suivi':'L’environnement sportif',
      group(m,mental?[['Techniques déjà explorées','previous_mental_prep'],['Habiletés à travailler','other_mental_aspects'],
       ['Impact rapporté','impact']]:
       [['Semaine d’entraînement','current_week'],['Activité actuelle','current_activity'],
        ['Expérience','training_experience'],['Préparation antérieure','previous_pp']]))+
    box('03 / TERRAIN',mental?'Routines & méthodes':'Préférences et tolérances',favorites(m))+
    '</div><div class="akLuxStack">'+safety(m)+
    box('LE CADRE','Organisation & contraintes',
     group(m,[['Disponibilités','availability'],['Installations','facilities'],['Lieu de pratique','training_place'],
       ['Matériel','equipment'],['Contraintes personnelles','life_constraints']]))+
    '</div></div>';
  return '<div class="akp-page akLux akLuxProfilePage">'+
   '<header class="akLuxProfileTop"><div><span>02 / PROFIL ATHLÈTE</span>'+
   '<h2>Le profil, au-delà des résultats</h2>'+
   '<p>Pratique, préférences, tolérances et vigilance : toutes les informations qui permettent de personnaliser le suivi.</p></div>'+
   (m.akPassportRole==='coach'?'<div class="akLuxProfileTools">'+
    '<button type="button" class="akProfAction" data-action="profile">✎ Modifier la fiche</button></div>':'')+
   '</header>'+metrics(m)+body+deeper(m,previous(m))+'</div>';
 };
passportOverviewPage=function(m){
  const summary=typeof window.AKP_PASSPORT_ORIGINAL_OVERVIEW==='function'?
    window.AKP_PASSPORT_ORIGINAL_OVERVIEW(m):
    '<div class="akp-page"><p>Les repères du suivi apparaîtront ici.</p></div>';
  return '<div class="akp-page akLux akLuxCover">'+hero(m)+
   '<div class="akLuxHomeShortcut"><span>LE PARCOURS EN UN COUP D’ŒIL</span>'+
   '<button class="passportInlineNav" type="button" data-passport-page="profile">Découvrir le profil sportif →</button></div>'+
   summary+'</div>';
 };
  window.AKP_PASSPORT_PREMIUM_READY=true;
})();