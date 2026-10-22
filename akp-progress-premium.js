/* AK PRIME — Passeport : progression premium v44.
 * Remplace uniquement la présentation de l'onglet Progression.
 * Réutilise les groupes, sens de progression et sélection existants.
 */
(function(){
 'use strict';
 const style=document.createElement('style');
 style.textContent=[
 '.akProg2{--p-ink:#172d42;--p-muted:#738598;--p-gold:#c49958;--p-line:#e2e8ee;max-width:1220px;margin:0 auto;color:var(--p-ink)}',
 '.akProg2Head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:19px}',
 '.akProg2Eyebrow{display:block;font-size:10px;letter-spacing:.14em;color:#ae8145;font-weight:900;margin-bottom:7px}',
 '.akProg2Head h2{font-size:clamp(24px,3vw,31px);letter-spacing:-.04em;font-weight:900;margin:0;line-height:1.16;color:#172d42}',
 '.akProg2Head p{font-size:12px;line-height:1.65;color:#758599;margin:7px 0 0;max-width:630px}',
 '.akProg2HeadCount{flex:0 0 auto;display:flex;align-items:center;gap:10px;border:1px solid #dfe6ed;padding:11px 16px;border-radius:12px;background:#fff}',
 '.akProg2HeadCount b{font-size:26px;color:#152d42;line-height:1;font-weight:900}.akProg2HeadCount span{color:#8391a1;letter-spacing:.04em;text-transform:uppercase;font-size:9px;line-height:1.5;font-weight:850}',
 '.akProg2Box{background:#fff;border:1px solid var(--p-line);border-radius:16px;box-shadow:0 9px 24px rgba(20,41,60,.035);padding:20px;margin-bottom:14px}',
 '.akProg2TitleRow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:17px}',
 '.akProg2TitleRow>div>small{font-size:9px;letter-spacing:.13em;font-weight:900;color:#ad8040;display:block;margin-bottom:7px}',
 '.akProg2TitleRow h3{font-size:18px;margin:0;letter-spacing:-.02em;font-weight:900;color:#1a3146}',
 '.akProg2TitleRow p{font-size:11px;color:#8292a3;line-height:1.5;margin:5px 0 0}',
 '.akProg2Legend{display:flex;gap:12px;flex-wrap:wrap;align-items:center;color:#79899b;font-size:10px;margin-top:3px}',
 '.akProg2Legend>span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
 '.akProg2Legend i{width:7px;height:7px;border-radius:50%;display:inline-block;background:#93a2b2}',
 '.akProg2Legend i.up{background:#3f8867}.akProg2Legend i.down{background:#bd654d}',
 '.akProg2Cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}',
 '.akProg2Card{background:#fcfdfe;border:1px solid #e1e7ed;border-radius:12px;padding:16px;cursor:pointer;text-align:left;display:flex;flex-direction:column;min-width:0;min-height:150px;gap:0;transition:transform .16s,box-shadow .16s,border-color .16s,background .16s}',
 '.akProg2Card:hover{transform:translateY(-2px);border-color:#c1cfda;box-shadow:0 10px 24px rgba(20,46,68,.065)}',
 '.akProg2Card:focus-visible{outline:3px solid #d4af70;outline-offset:3px}',
 '.akProg2Card.selected{border-color:#c99e5d;background:#fffaf2;box-shadow:0 0 0 2px rgba(201,158,93,.11),0 9px 25px rgba(65,42,12,.05)}',
 '.akProg2CardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:9px}',
 '.akProg2CardTop>strong{color:#193249;font-size:13px;font-weight:850;line-height:1.35;overflow-wrap:anywhere}',
 '.akProg2CardTop small{font-size:10px;color:#92a0ad;white-space:nowrap}',
 '.akProg2CardValue{margin:17px 0 10px;font-size:24px;color:#142f44;line-height:1.1;font-weight:900;letter-spacing:-.035em;overflow-wrap:anywhere}',
 '.akProg2CardValue em{font-style:normal;font-size:12px;color:#77889a;font-weight:700;letter-spacing:0}',
 '.akProg2CardBottom{display:flex;justify-content:space-between;align-items:center;gap:7px;flex-wrap:wrap;margin-top:auto}',
 '.akProg2Chip{font-size:10px;font-weight:850;border-radius:7px;padding:6px 8px;background:#edf1f5;color:#677a8b;white-space:nowrap}',
 '.akProg2Chip.up{background:#e5f4ea;color:#28764f}.akProg2Chip.down{background:#fff0ea;color:#b4543b}',
 '.akProg2Selected{font-size:9px;font-weight:850;color:#a47b40;letter-spacing:.05em}',
 '.akProg2Focus{padding:0;overflow:hidden}',
 '.akProg2FocusTop{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:23px 24px 18px}',
 '.akProg2FocusEyebrow{font-size:10px;letter-spacing:.13em;color:#aa7b3a;font-weight:900}',
 '.akProg2FocusTop h3{font-size:clamp(23px,3vw,29px);font-weight:900;color:#1c344b;letter-spacing:-.035em;margin:6px 0 5px;line-height:1.2}',
 '.akProg2FocusTop p{font-size:12px;color:#788a9b;line-height:1.6;margin:0}',
 '.akProg2FocusProgress{border:1px solid #dfe8e2;background:#f2f8f4;border-radius:11px;padding:11px 16px;min-width:132px;text-align:right}',
 '.akProg2FocusProgress.down{background:#fff5ef;border-color:#f0ded4}.akProg2FocusProgress.neutral{background:#f5f7f9;border-color:#e2e7ec}',
 '.akProg2FocusProgress span{display:block;color:#73879a;font-size:9px;font-weight:850;letter-spacing:.06em}',
 '.akProg2FocusProgress strong{color:#35795c;font-size:21px;display:block;margin-top:5px;letter-spacing:-.025em}',
 '.akProg2FocusProgress.down strong{color:#ad5741}.akProg2FocusProgress.neutral strong{color:#526e83}',
 '.akProg2Facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:0 24px 24px}',
 '.akProg2Fact{background:#f8fafc;border:1px solid #e7ebef;border-radius:10px;padding:13px;min-width:0}',
 '.akProg2Fact>span{font-size:9px;text-transform:uppercase;letter-spacing:.07em;font-weight:850;color:#8493a1;display:block}',
 '.akProg2Fact strong{display:block;color:#1b344c;font-size:20px;margin:7px 0 5px;font-weight:900;line-height:1.25;overflow-wrap:anywhere}',
 '.akProg2Fact strong em{font-size:12px;font-weight:700;font-style:normal;color:#8b9aaa}',
 '.akProg2Fact small{font-size:10px;color:#8292a2;display:block;line-height:1.4}',
 '.akProg2ChartBox{margin:0 24px;border:1px solid #e4ebf1;background:#fcfdfe;border-radius:13px;padding:19px 19px 13px}',
 '.akProg2ChartHeader{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:9px}',
 '.akProg2ChartHeader strong{font-size:13px;color:#1e354b;display:block;font-weight:850}',
 '.akProg2ChartHeader small{font-size:10px;color:#77899b;line-height:1.6;display:block;margin-top:3px}',
 '.akProg2ChartDirection{border:1px solid #e9e3da;background:#fffaf0;color:#987444;border-radius:7px;padding:7px 9px;font-size:10px;font-weight:800;white-space:nowrap}',
 '.akProg2Svg{display:block;width:100%;height:auto;max-height:280px;overflow:visible}',
 '.akProg2Svg .akProg2Grid{stroke:#e8edf2;stroke-width:1}',
 '.akProg2Svg .akProg2Axis{font-size:10px;fill:#8699aa;font-weight:650}',
 '.akProg2Svg .akProg2PointLabel{font-size:12px;fill:#2c455e;font-weight:850}',
 '.akProg2Svg .akProg2Line{fill:none;stroke:#c69a56;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}',
 '.akProg2Svg .akProg2Point{fill:#fff;stroke:#ba8b46;stroke-width:3.5}',
 '.akProg2Svg .akProg2Point.end{fill:#ba8b46}',
 '.akProg2ChartNote{font-size:10px;line-height:1.55;color:#8291a1;margin:8px 0 0}',
 '.akProg2History{padding:23px 24px 25px}',
 '.akProg2HistoryTitle{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:11px}',
 '.akProg2HistoryTitle h4{font-size:15px;margin:0;color:#20394f;font-weight:850}',
 '.akProg2HistoryTitle span{font-size:10px;color:#8493a2}',
 '.akProg2TableWrap{border:1px solid #e4eaf0;border-radius:11px;overflow-x:auto}',
 '.akProg2Table{border-collapse:collapse;width:100%;table-layout:fixed;text-align:left}',
 '.akProg2Table th{font-size:10px;text-transform:uppercase;letter-spacing:.055em;font-weight:850;color:#718396;background:#f3f6f9;padding:12px 13px;white-space:nowrap}',
 '.akProg2Table td{font-size:12px;line-height:1.55;color:#425970;padding:13px;vertical-align:top;overflow-wrap:anywhere;border-top:1px solid #e9eef2}',
 '.akProg2Table tr:nth-child(even) td{background:#fafcfe}',
 '.akProg2Table td b{color:#1a3045;font-size:12px}.akProg2Table td small{color:#91a0ad;font-size:10px}',
 '.akProg2Table th:nth-child(1){width:17%}.akProg2Table th:nth-child(2){width:18%}.akProg2Table th:nth-child(3){width:30%}.akProg2Table th:nth-child(4){width:35%}',
 '.akProg2Empty{padding:25px;text-align:center;color:#8493a2;font-size:12px;line-height:1.6}',
 '@media(max-width:1000px){.akProg2Cards{grid-template-columns:repeat(3,minmax(0,1fr))}}',
 '@media(max-width:750px){.akProg2Cards{grid-template-columns:repeat(2,minmax(0,1fr))}.akProg2FocusTop{padding:18px}.akProg2Facts{padding:0 18px 18px}.akProg2ChartBox{margin:0 18px}.akProg2History{padding:20px 18px}.akProg2HeadCount{padding:9px 12px}}',
 '@media(max-width:540px){.akProg2Head{align-items:flex-start}.akProg2HeadCount{padding:8px 10px}.akProg2HeadCount b{font-size:20px}.akProg2Cards{gap:8px}.akProg2Card{padding:12px;min-height:137px}.akProg2CardValue{font-size:21px}.akProg2FocusTop{flex-direction:column;align-items:stretch}.akProg2FocusProgress{text-align:left}.akProg2Facts{grid-template-columns:1fr 1fr;gap:8px}.akProg2Fact{padding:11px}.akProg2Fact strong{font-size:17px}.akProg2ChartBox{padding:14px 9px 11px}.akProg2ChartHeader{flex-wrap:wrap}.akProg2ChartDirection{white-space:normal}.akProg2Table{min-width:580px}}',
 '@media print{.akProg2Card{break-inside:avoid;box-shadow:none}.akProg2Box{box-shadow:none}.akProg2Focus{break-inside:avoid}.akProg2ChartBox{break-inside:avoid}}'
 ].join('\n');
 document.head.appendChild(style);

 const number=x=>Number.isFinite(Number(x))?Number(x):null;
 const rowDates=(r)=>String(r.date||'').slice(0,10);
 const unit=r=>r.unit||'';
 const val=r=>String(r.value??r.num??'');
 const labelDate=d=>fmtDate(d);
 function directionFor(group){
   const better=testLibraryItem(group.name)?.better||'neutral';
   return better==='lower'?'lower':better==='higher'?'higher':'neutral';
 }
 const measureWord=n=>n+' mesure'+(n>1?'s':'');
 function toneFor(d){return d?.improved===true?'up':d?.improved===false?'down':'neutral';}
 function growthFor(d){
   const percent=sportPerformancePct(d);
   if(d?.count>=2&&Number.isFinite(percent)){
     return passportSigned(percent)+' %';
   }
   return 'Référence';
 }
 function statusFor(d){
   return d?.improved===true?'Progression':d?.improved===false?'À surveiller':
     (d?.count>=2&&Math.abs(d.raw||0)<1e-9?'Stable':'Référence');
 }
 function kpi(title,row,caption){
   return '<div class="akProg2Fact"><span>'+esc(title)+'</span>'+
    '<strong>'+esc(row?val(row):'—')+' <em>'+esc(row?unit(row):'')+'</em></strong>'+
    '<small>'+esc(caption||'')+'</small></div>';
 }
 function chart(group){
   const data=group?.rows||[];
   if(!data.length)return '<div class="akProg2Empty">Aucune mesure disponible pour ce test.</div>';
   const values=data.map(x=>Number(x.num));
   if(values.some(x=>!Number.isFinite(x)))return '<div class="akProg2Empty">Les valeurs numériques doivent être vérifiées.</div>';
   const W=900,H=285,left=65,right=36,top=38,bottom=47;
   const width=W-left-right,height=H-top-bottom;
   const low=Math.min(...values),high=Math.max(...values),spread=high-low;
   const pad=spread?Math.max(spread*.16,Math.abs(high)*.005):Math.max(Math.abs(high)*.08,.5);
   const vMin=low-pad,vMax=high+pad,extent=vMax-vMin;
   const spots=data.map((r,i)=>{
     const x=left+(data.length===1?width/2:i*width/(data.length-1));
     const y=top+(vMax-Number(r.num))/extent*height;
     return {x,y,row:r};
   });
   const N=v=>Number(v).toFixed(2);
   const line=spots.map(x=>N(x.x)+','+N(x.y)).join(' ');
   const closed=[left+','+(top+height),line,(left+width)+','+(top+height)].join(' ');
   const grid=Array.from({length:5},(_,i)=>{
     const y=top+height*i/4,v=vMax-extent*i/4;
     const tick=Number(v.toFixed(2)).toLocaleString('fr-FR',{maximumFractionDigits:2});
     return '<g><line class="akProg2Grid" x1="'+left+'" y1="'+N(y)+'" x2="'+(W-right)+'" y2="'+N(y)+'"/>'+
       '<text class="akProg2Axis" x="'+(left-14)+'" y="'+N(y+4)+'" text-anchor="end">'+esc(tick)+'</text></g>';
   }).join('');
   const dateCount=new Set(data.map(x=>rowDates(x))).size;
   const showDate=(i)=>{
     if(data.length===1)return true;
     if(data.length<=4)return true;
     return i===0||i===data.length-1||(data.length<9&&i===Math.floor(data.length/2));
   };
   const labels=spots.map((p,i)=>{
     const isLast=i===spots.length-1;
     const name=val(p.row)+' '+unit(p.row);
     const showValue=data.length<=9||i===0||isLast||i%Math.ceil(data.length/8)===0;
     const x=N(p.x),y=N(p.y);
     const valueY=p.y<top+27?p.y+24:p.y-15;
     const axisLabel=dateCount===1&&data.length>1?'Mesure '+(i+1):labelDate(rowDates(p.row));
     const hover='Mesure '+(i+1)+' — '+labelDate(rowDates(p.row))+' : '+name;
     return '<g><circle class="akProg2Point '+(isLast?'end':'')+'" cx="'+x+'" cy="'+y+'" r="'+(isLast?6.2:5.4)+'">'+
       '<title>'+esc(hover)+'</title></circle>'+
       (showValue?'<text class="akProg2PointLabel" text-anchor="middle" x="'+x+'" y="'+N(valueY)+'">'+esc(name)+'</text>':'')+
       (showDate(i)?'<text class="akProg2Axis" text-anchor="middle" x="'+x+'" y="'+(H-13)+'">'+esc(axisLabel)+'</text>':'')+
       '</g>';
   }).join('');
   const curve=data.length>1?
     '<polygon points="'+closed+'" fill="url(#akProg2Gradient)"/>'+
     '<polyline class="akProg2Line" points="'+line+'"/>':'';
   const gridCaption=dateCount===1&&data.length>1?
     'Plusieurs mesures sont datées du même jour : elles sont affichées dans leur ordre d’enregistrement.':
     'Les mesures sont réparties par ordre de saisie, et non proportionnellement au nombre de jours écoulés.';
   return '<svg class="akProg2Svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+
     '" role="img" aria-label="Évolution du test '+esc(group.name)+' : '+measureWord(data.length)+'">'+
     '<defs><linearGradient id="akProg2Gradient" x1="0" y1="0" x2="0" y2="1">'+
     '<stop offset="0%" stop-color="#c99e64" stop-opacity=".20"/>'+
     '<stop offset="100%" stop-color="#c99e64" stop-opacity=".01"/></linearGradient></defs>'+
     grid+curve+labels+'</svg>'+
     '<p class="akProg2ChartNote">'+esc(gridCaption)+'</p>';
 }
 passportLineChart=function(group){return chart(group);};

 passportProgressPage=function(model){
   const groups=passportTestGroups(model.tests),selected=passportSelectedGroup(groups);
   if(!selected)return '<div class="akp-page akProg2">'+
     '<div class="akProg2Head"><div><span class="akProg2Eyebrow">PROGRESSION</span>'+
     '<h2>Les performances, en perspective.</h2>'+
     '<p>Les résultats apparaîtront ici dès les premières évaluations.</p></div></div>'+
     '<div class="akProg2Box akProg2Empty">Aucune mesure numérique enregistrée.</div></div>';
   const d=passportMetricDelta(selected),tone=toneFor(d),progress=growthFor(d);
   const rows=selected.rows,first=rows[0],last=rows[rows.length-1];
   const direction=directionFor(selected);
   const best=direction==='neutral'?null:passportGroupBest(selected);
   const mainCard=(g)=>{
     const m=passportMetricDelta(g),t=toneFor(m),latest=g.rows[g.rows.length-1];
     const selectedCard=normalizeTestName(g.name)===normalizeTestName(selected.name);
     return '<button type="button" class="akProg2Card passportMetricBtn '+(selectedCard?'selected':'')+
       '" aria-pressed="'+(selectedCard?'true':'false')+'" data-test-key="'+esc(normalizeTestName(g.name))+'">'+
       '<div class="akProg2CardTop"><strong>'+esc(g.name)+'</strong><small>'+measureWord(g.rows.length)+'</small></div>'+
       '<div class="akProg2CardValue">'+esc(val(latest))+' <em>'+esc(unit(latest)||g.unit||'')+'</em></div>'+
       '<div class="akProg2CardBottom"><span class="akProg2Chip '+t+'">'+esc(growthFor(m))+'</span>'+
       (selectedCard?'<span class="akProg2Selected">SÉLECTIONNÉ ✓</span>':'<span class="akProg2Selected">Voir le détail ↗</span>')+
       '</div></button>';
   };
   const factBest=best?kpi('Meilleur',best,labelDate(rowDates(best))):
      '<div class="akProg2Fact"><span>Meilleur</span><strong>—</strong>'+
        '<small>Sens de performance non défini pour ce test</small></div>';
   const history=rows.slice().reverse().map((r,i)=>{
      const date=rowDates(r);
      const occursSameDay=rows.filter(k=>rowDates(k)===date).length>1;
      return '<tr><td>'+esc(labelDate(date))+
       (occursSameDay?'<small> · '+esc('Mesure '+(rows.indexOf(r)+1))+'</small>':'')+'</td>'+
       '<td><b>'+esc(val(r))+' '+esc(unit(r)||selected.unit||'')+'</b></td>'+
       '<td>'+esc(r.context||'—')+'</td><td>'+esc(r.note||'—')+'</td></tr>';
   }).join('');
   const compare='<section class="akProg2Box">'+
     '<div class="akProg2TitleRow"><div><small>01 / VUE COMPARATIVE</small><h3>Tous les tests</h3>'+
       '<p>Sélectionne un test pour afficher sa courbe et l’historique de ses mesures.</p></div>'+
     '<div class="akProg2Legend"><span><i class="up"></i>Progression</span>'+
       '<span><i></i>Référence</span><span><i class="down"></i>Vigilance</span></div></div>'+
     '<div class="akProg2Cards">'+groups.map(mainCard).join('')+'</div></section>';
   const sense=direction==='lower'?'Plus bas = mieux':
     direction==='higher'?'Plus haut = mieux':'Sens de progression non défini';
   const focus='<section class="akProg2Box akProg2Focus">'+
      '<div class="akProg2FocusTop"><div><span class="akProg2FocusEyebrow">02 / TEST SÉLECTIONNÉ</span>'+
        '<h3>'+esc(selected.name)+'</h3><p>'+esc(measureWord(rows.length))+
        ' enregistrée'+(rows.length>1?'s':'')+' · '+esc(statusFor(d))+
        '</p></div><div class="akProg2FocusProgress '+tone+'">'+
         '<span>ÉVOLUTION PERFORMANCE</span><strong>'+esc(progress)+'</strong></div></div>'+
      '<div class="akProg2Facts">'+
        kpi('Initial',first,labelDate(rowDates(first)))+
        kpi('Actuel',last,labelDate(rowDates(last)))+
        factBest+
        '<div class="akProg2Fact"><span>Nombre de mesures</span><strong>'+rows.length+'</strong>'+
           '<small>Enregistrées dans le Passeport</small></div></div>'+
      '<div class="akProg2ChartBox"><div class="akProg2ChartHeader"><div>'+
        '<strong>Courbe des résultats</strong><small>Valeurs réelles du test, en '+esc(unit(last)||selected.unit||'unité renseignée')+
        '</small></div><span class="akProg2ChartDirection">'+esc(sense)+'</span></div>'+
        passportLineChart(selected)+'</div>'+
      '<div class="akProg2History"><div class="akProg2HistoryTitle"><h4>Historique des mesures</h4>'+
      '<span>'+measureWord(rows.length)+' · de la plus récente à la première</span></div>'+
      '<div class="akProg2TableWrap"><table class="akProg2Table"><thead><tr><th>Date</th><th>Résultat</th>'+
       '<th>Contexte</th><th>Observation coach</th></tr></thead><tbody>'+history+'</tbody></table></div></div>'+
     '</section>';
   return '<div class="akp-page akProg2">'+
     '<div class="akProg2Head"><div><span class="akProg2Eyebrow">PROGRESSION / ANALYSE</span>'+
       '<h2>Une lecture claire de chaque progrès.</h2>'+
       '<p>Tous les repères restent accessibles. Choisis un test pour comparer ses mesures dans le temps.</p>'+
      '</div><div class="akProg2HeadCount"><b>'+groups.length+'</b><span>Repères<br/>suivis</span></div></div>'+
     compare+focus+'</div>';
 };
 window.AKP_PASSPORT_PROGRESSION_READY=true;
})();