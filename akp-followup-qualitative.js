/* AK PRIME — Nouveau suivi qualitatif, sans doublon avec Cycle ou Progression.
 * Informations affichées : bilans hebdomadaires et retours coach déjà accessibles au client.
 * Les notes et décisions privées du dossier coach ne sont pas publiées.
 */
(function(){
 'use strict';
 const css=document.createElement('style');
 css.textContent=[
  '.akQFollow{max-width:1100px;margin:0 auto;color:#20374c}',
  '.akQFollowHeader{margin:0 0 19px}.akQFollowHeader>span{font-size:10px;letter-spacing:.13em;color:#ad8148;font-weight:900}',
  '.akQFollowHeader h2{margin:7px 0;font-size:clamp(24px,3vw,30px);line-height:1.22;letter-spacing:-.025em;font-weight:900;color:#1a3046}',
  '.akQFollowHeader p{margin:0;color:#738699;font-size:13px;line-height:1.6;max-width:740px}',
  '.akQFollowPanel{border:1px solid #dfe6ee;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 8px 25px rgba(24,47,71,.035)}',
  '.akQFollowTop{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:19px 23px 15px}',
  '.akQFollowTop strong{display:block;font-size:17px;font-weight:850;color:#213b50}.akQFollowTop small{font-size:11px;color:#8494a4;display:block;margin-top:5px}',
  '.akQFollowCount{border:1px solid #e0e7ed;border-radius:99px;padding:8px 11px;background:#fbfcfe;color:#6b8093;font-size:11px;font-weight:800}',
  '.akQFollowEntry{display:grid;grid-template-columns:125px minmax(0,1fr);gap:17px;padding:18px 23px;border-top:1px solid #e9edf1}',
  '.akQFollowDate{padding-top:2px;font-size:12px;font-weight:850;color:#a67940}.akQFollowBody{min-width:0}',
  '.akQFollowTags{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:7px}',
  '.akQFollowTag{font-size:10px;font-weight:850;background:#eaf3ec;color:#42765a;padding:4px 7px;border-radius:6px}',
  '.akQFollowTag.neutral{background:#edf2f5;color:#6c7e8f}.akQFollowTag.warning{background:#faeae5;color:#a75645}.akQFollowTag.problem{background:#fcf1de;color:#946d3c}',
  '.akQFollowText{font-weight:750;font-size:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;color:#21374a}',
  '.akQFollowClient{margin:5px 0 0;color:#778a9b;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}',
  '.akQFollowDetails{margin-top:9px}.akQFollowDetails>summary{cursor:pointer;list-style:none;color:#977040;font-weight:800;font-size:11px;padding:4px 0}',
  '.akQFollowDetails>summary::-webkit-details-marker{display:none}.akQFollowFacts{background:#fafcfe;border:1px solid #e6ebf0;border-radius:9px;padding:11px 13px;display:grid;gap:10px;margin-top:6px}',
  '.akQFollowFact{display:grid;grid-template-columns:150px 1fr;gap:10px;font-size:12px;line-height:1.5}.akQFollowFact strong{color:#708297;font-weight:800}.akQFollowFact span{color:#344c60;white-space:pre-wrap;overflow-wrap:anywhere}',
  '.akQFollowMore{border-top:1px solid #e9edf1;padding:0 23px}.akQFollowMore>summary{cursor:pointer;list-style:none;padding:16px 0;font-size:12px;color:#96703f;font-weight:850}',
  '.akQFollowMore>summary::-webkit-details-marker{display:none}.akQFollowMore .akQFollowEntry{padding-left:0;padding-right:0}',
  '.akQFollowEmpty{border-top:1px solid #e9edf1;padding:25px 23px;color:#8192a1;font-size:13px;line-height:1.6}',
  '@media(max-width:620px){.akQFollowEntry{grid-template-columns:1fr;gap:7px;padding:15px}.akQFollowTop{padding:16px}.akQFollowMore{padding:0 15px}.akQFollowMore .akQFollowEntry{padding-left:0;padding-right:0}.akQFollowFact{grid-template-columns:1fr;gap:3px}.akQFollowText{font-size:13px}}',
  '@media print{.akQFollowPanel{box-shadow:none}.akQFollowEntry{break-inside:avoid}}'
 ].join('\n');
 document.head.appendChild(css);
 function meaningful(v){
  const raw=String(v==null?'':v).trim();
  if(!raw||/^[.\-–—…\s]+$/.test(raw))return '';
  const n=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’]/g,"'").replace(/[.!?,;:]+$/g,'').replace(/\s+/g,' ').trim();
  if(/^(?:non|nan|ras|r a s|0|n\/a|neant|rien|aucun|aucune|rien a signaler|rien de particulier|non rien|pas de probleme|pas de souci|pas de douleur|pas de gene|pas de contrainte|aucun probleme|aucune douleur|aucune difficulte|tout est ok)$/.test(n))return '';
  if(/^(?:pas de|pas d'|aucun |aucune |sans |rien a )/.test(n)&&!/\bmais\b/.test(n))return '';
  return raw;
 }
 function fromCheckin(w){
  return {
   date:String(w.date||w.week_date||'').slice(0,10),
   coach:(w.reviewedAt||w.reviewed_at)?meaningful(w.coach||w.coach_feedback||w.coach_decision):'',
   feeling:meaningful(w.feeling||w.overall_week),
   pain:meaningful(w.pain||w.pain_or_discomfort),
   problem:meaningful(w.problem||w.exercise_problem),
   constraints:meaningful(w.nextConstraint||w.next_week_constraints),
   missed:meaningful(w.missed||w.missed_sessions),
   other:meaningful(w.other||w.other_info),
   reviewed:!!(w.reviewedAt||w.reviewed_at)
  };
 }
 function hasContent(r){return !!(r.coach||r.feeling||r.pain||r.problem||r.constraints||r.missed||r.other);}
 function tag(label,kind){return '<span class="akQFollowTag '+(kind||'')+'">'+esc(label)+'</span>';}
 function entry(r){
  const details=[['Gêne ou douleur',r.pain],['Difficulté rencontrée',r.problem],
   ['Contraintes à venir',r.constraints],['Séances manquées',r.missed],['Autres remarques',r.other]].filter(x=>x[1]);
  const status=tag(r.coach?'Retour du coach':r.reviewed?'Bilan traité':'Bilan transmis',r.coach?'':'neutral');
  const alerts=(r.pain?tag('Gêne signalée','warning'):'')+(r.problem?tag('Difficulté signalée','problem'):'');
  const text=r.coach||r.feeling||'Bilan enregistré';
  return '<article class="akQFollowEntry">'+
    '<div class="akQFollowDate">'+(r.date?fmtDate(r.date):'Date inconnue')+'</div>'+
    '<div class="akQFollowBody"><div class="akQFollowTags">'+status+alerts+'</div>'+
    '<div class="akQFollowText">'+esc(text)+'</div>'+
    (r.coach&&r.feeling?'<p class="akQFollowClient"><strong>Ton ressenti :</strong> '+esc(r.feeling)+'</p>':'')+
    (details.length?'<details class="akQFollowDetails"><summary>Voir les détails du bilan ↓</summary><div class="akQFollowFacts">'+
      details.map(([name,value])=>'<div class="akQFollowFact"><strong>'+esc(name)+'</strong><span>'+esc(value)+'</span></div>').join('')+
      '</div></details>':'')+
    '</div></article>';
 }
 passportFollowupPage=function(m){
  const all=(m.checkins||[]).map(fromCheckin).sort((a,b)=>b.date.localeCompare(a.date));
  const recent=all.filter(hasContent).slice(0,3),older=all.filter(x=>!recent.includes(x));
  const coaches=all.filter(x=>x.coach).length;
  return '<div class="akp-page akQFollow">'+
   '<div class="akQFollowHeader"><span>SUIVI / BILANS HEBDOMADAIRES</span><h2>Bilans et retours du coach</h2>'+
   '<p>Les informations utiles de ton suivi, semaine après semaine. Les objectifs du cycle et la progression de tes tests figurent déjà dans leurs onglets.</p></div>'+
   '<section class="akQFollowPanel"><div class="akQFollowTop"><div><strong>Ton historique de suivi</strong>'+
    '<small>Les derniers retours importants sont affichés en priorité.</small></div>'+
    '<span class="akQFollowCount">'+all.length+' bilan'+(all.length>1?'s':'')+
      (coaches?' · '+coaches+' retour'+(coaches>1?'s':'')+' du coach':'')+'</span></div>'+
    (recent.length?recent.map(entry).join(''):'<div class="akQFollowEmpty">'+
     (all.length?'Aucun retour détaillé à afficher pour le moment.':'Aucun bilan hebdomadaire pour le moment.')+'</div>')+
    (older.length?'<details class="akQFollowMore"><summary>Afficher '+older.length+
      ' autre'+(older.length>1?'s':'')+' bilan'+(older.length>1?'s':'')+' ↓</summary>'+
      older.map(entry).join('')+'</details>':'')+
   '</section></div>';
 };
 window.AKP_QUALITATIVE_FOLLOWUP_READY=true;
})();