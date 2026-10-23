/* AK PRIME — Questionnaire compact et préparation initiale des visios.
 * Les réponses et annotations sont privées au coach. Rien n'est dupliqué.
 */
(function(){
 'use strict';
 const css=[
 '.akQHeader{display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap}',
 '.akQTwoColumns{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(290px,.75fr);gap:14px;align-items:start}',
 '.akQGroup{margin:0 0 9px;padding:12px 15px}',
 '.akQGroup>summary{cursor:pointer;font-weight:800;font-size:14px;list-style:revert}',
 '.akQGroup>summary small{font-weight:500;color:#667785;margin-left:6px}',
 '.akQGroup[open]>summary{margin-bottom:11px}',
 '.akQuestion{border:1px solid #dce5ee;border-radius:11px;margin:8px 0;background:#fbfcfe}',
 '.akQuestion>summary{cursor:pointer;padding:11px 12px;display:flex;gap:7px;justify-content:space-between;align-items:center}',
 '.akQuestion>summary strong{font-size:13px;line-height:1.4;overflow-wrap:anywhere}',
 '.akQuestion[open]>summary{border-bottom:1px solid #e7ecf1}',
 '.akQAnswer{padding:13px;font-size:13px;overflow-wrap:anywhere}',
 '.akQAnswerText{white-space:pre-wrap;background:#fff;border:1px solid #e4eaf0;border-radius:8px;padding:10px;margin:8px 0 12px}',
 '.akQQuestionInput{margin-top:10px}',
 '.akQQuestionInput textarea{width:100%;min-height:100px;resize:vertical;margin-top:6px}',
 '.akQSide{position:sticky;top:12px}',
 '.akQFlag{border:1px solid #e1e8ef;background:#fcfdff;border-radius:10px;padding:11px;margin:8px 0}',
 '.akQFlag .link{display:block;text-align:left;white-space:normal}',
 '.akQSmall{font-size:12px;color:#5b6f80;margin:5px 0}',
 '.akQPrivate{margin-top:14px}.akQPrivate summary{cursor:pointer;font-weight:750}',
 '@media(max-width:920px){.akQTwoColumns{grid-template-columns:1fr}.akQSide{position:static}}'
 ].join('\n');
 const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
 const groups=[
  ['Nutrition',/nutrition|repas|apports?|calori|macros?|alimenta|p\d_nutrition|fs_renforce_food|fs_renforce_weight/],
  ['Sommeil & récupération',/sommeil|sleep|fatigue|récupération|recuperation|energy|énergie|wake/],
  ['Profil & coordonnées',/nom|pr[eé]nom|adresse|e.?mail|t[eé]l[eé]phone|naissance|contact|ville|profession/],
  ['Pratique sportive',/club|structure|sport|niveau|poste|discipline|comp[eé]tition|entra[iî]nement|saison|[eé]quipe|experience|exp[eé]rience/],
  ['Objectifs & échéances',/objectif|motivation|projet|[eé]ch[eé]ance|date importante|attente|performance recherch[eé]e/],
  ['Disponibilités & matériel',/disponibilit|horaire|mat[eé]riel|installation|[eé]quipement|salle|organisation|fr[eé]quence|cr[eé]neau/],
  ['Santé & précautions',/blessure|douleur|g[eê]ne|sant[eé]|restriction|limitation|patholog|ant[eé]c[eé]dent|traitement|m[eé]decin|sommeil|fatigue|op[eé]ration|grossesse/],
  ['Consentement & informations',/consentement|confirmation|rgpd|autorisation|r[eè]gle|condition|donn[eé]es personnelles/]
 ];
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const classify=(key,label)=>{
  const t=norm(key+' '+label);
  for(const [name,re] of groups){if(re.test(t))return name;}
  return 'Autres réponses';
 };
 function displayAnswer(value){
  if(value==null||value==='')return 'Non renseigné';
  if(Array.isArray(value))return value.map(displayAnswer).join(' • ');
  if(value===true)return 'Oui';
  if(value===false)return 'Non';
  if(typeof value==='object')return Object.entries(value).map(([key,val])=>key+' : '+displayAnswer(val)).join('\n');
  return String(value);
 }
 const keys=c=>Object.keys(c.questionnaire||{});
 const selectedKeys=c=>keys(c).filter(key=>Boolean(c.deep?.[key]));
 function questionnaireMarkup(c){
  const byGroup=new Map(),qs=keys(c);
  for(const key of qs){
   const label=questionLabel(key)||key,name=classify(key,label);
   if(!byGroup.has(name))byGroup.set(name,[]);
   byGroup.get(name).push({key,label,value:displayAnswer(c.questionnaire[key])});
  }
  const order=[...groups.map(g=>g[0]),'Autres réponses'];
  const cats=order.filter(name=>byGroup.has(name));
  const accordions=cats.map(group=>{
   const questions=byGroup.get(group);
   const count=questions.filter(x=>c.deep?.[x.key]).length;
   return '<details class="akQGroup card panel" data-group="'+esc(group)+'">'+
    '<summary>'+esc(group)+' <small>('+questions.length+' réponse'+(questions.length>1?'s':'')+
     (count?' · '+count+' à approfondir':'')+')</small></summary>'+
    questions.map(x=>{
     const chosen=Boolean(c.deep?.[x.key]),comment=c.focusComments?.[x.key]||'';
     return '<details class="akQuestion" data-question-key="'+esc(x.key)+'">'+
      '<summary><strong>'+esc(x.label)+'</strong>'+
      (chosen?'<span class="status amber akQChosen">À approfondir</span>':'<span class="muted tiny akQChosen">Voir la réponse</span>')+'</summary>'+
      '<div class="akQAnswer">'+
       '<span class="tiny muted">Réponse du client</span><div class="akQAnswerText">'+esc(x.value)+'</div>'+
       '<label class="check"><input class="deepCheck" type="checkbox" data-key="'+esc(x.key)+'" '+(chosen?'checked':'')+
       '> À approfondir en visio</label>'+
       '<div class="akQQuestionInput" '+(chosen?'':'hidden')+'>'+
        '<label class="tiny muted">Questions à poser / points à vérifier</label>'+
        '<textarea class="textarea akFocusInput" data-key="'+esc(x.key)+'" maxlength="6000" placeholder="Ex. Quelle fréquence ? Quels obstacles ? Quel objectif précis ?">'+esc(comment)+'</textarea>'+
        '<span class="akFocusStatus">Enregistrement en quittant le champ</span>'+
       '</div></div></details>';
    }).join('')+'</details>';
  }).join('');
  return '<div class="card panel" style="padding:16px">'+
   '<div class="akQHeader"><div><h3 style="margin:0">Questionnaire initial</h3>'+
   '<p class="muted tiny" style="margin:6px 0 12px">Ouvre uniquement la catégorie puis la question souhaitée. Les réponses restent identiques à celles du client.</p></div>'+
   '<span class="status blue">'+qs.length+' réponses</span></div>'+
   (accordions||'<p class="muted">Le client n’a pas encore rempli son questionnaire.</p>')+
   '</div>';
 }
 function flagsMarkup(c){
  const flagged=selectedKeys(c);
  if(!flagged.length)return '<p class="muted tiny">Aucune question cochée. Sélectionne « À approfondir en visio » dans le questionnaire.</p>';
  return flagged.map(key=>{
   const comment=String(c.focusComments?.[key]||'').trim();
   return '<div class="akQFlag"><strong>'+esc(questionLabel(key)||key)+'</strong>'+
    '<div class="akQSmall">'+(comment?'Questions préparées : '+esc(comment.slice(0,130))+
      (comment.length>130?'…':''):'Questions à rédiger')+'</div>'+
    '<button class="link akQJump" data-key="'+esc(key)+'">Ouvrir la réponse et les questions →</button></div>';
  }).join('');
 }
 function flaggedSide(c){
  const n=selectedKeys(c).length;
  return '<div class="card panel akQSide"><div class="akQHeader"><div>'+
   '<h3 style="margin:0">Points à approfondir</h3>'+
   '<p class="muted tiny" style="margin:6px 0">Clique sur un point pour écrire les questions directement sous la réponse.</p></div>'+
   '<span class="status amber akQCount">'+n+' point'+(n>1?'s':'')+'</span></div>'+
   '<div class="akQFlagList">'+flagsMarkup(c)+'</div>'+
   '<div style="margin-top:12px"><button class="btn primary small akFocusSave">Enregistrer les questions</button></div></div>';
 }
 function initialVisioNotes(c){
  return '<details class="card panel akQPrivate"><summary>Préparation de la visio initiale — synthèse et décisions</summary>'+
   '<p class="muted tiny" style="margin-top:12px">Les anciennes notes du dossier sont conservées et modifiables ici.</p>'+
   '<div class="field"><label>Notes et approfondissements de la visio initiale</label>'+
   '<textarea class="textarea workspaceDraft" data-field="visioNotes" rows="4">'+esc(c.visioNotes||'')+'</textarea></div>'+
   '<div class="field"><label>Décisions prises</label>'+
   '<textarea class="textarea workspaceDraft" data-field="decisions" rows="4">'+esc(c.decisions||'')+'</textarea></div>'+
   '<div class="field"><label>Informations nouvelles / notes privées</label>'+
   '<textarea class="textarea workspaceDraft" data-field="privateNote" rows="3">'+esc(c.privateNote||'')+'</textarea></div>'+
   '<button class="btn primary small saveWorkspaceNotes">Enregistrer les notes initiales</button></details>'+
   '<details class="card panel akQPrivate"><summary>Approfondissements propres à la formule '+esc(c.offer||'')+'</summary>'+
   '<div style="margin-top:12px">'+offerSpecificBlocks(c)+'</div></details>';
 }
 function questionnaireSection(c){
  return '<div class="card panel" style="margin-bottom:14px">'+
   '<div class="akQHeader"><div><h2 style="font-size:18px;margin:0">Préparation de la visio initiale</h2>'+
   '<p class="muted tiny" style="margin:6px 0 12px">Toutes les réponses et les questions à poser sont regroupées ici, en menus déroulants.</p></div>'+
   '<span class="status blue">Privé coach</span></div>'+
   '<div class="akQTwoColumns">'+questionnaireMarkup(c)+flaggedSide(c)+'</div>'+
   initialVisioNotes(c)+'</div>';
 }
 const previousOnboarding=onboarding;
 onboarding=function(c){
  const root=document.createElement('div');
  root.innerHTML=previousOnboarding(c);
  // Toute la préparation est déjà dans « Visios & notes » :
  // aucun résumé ni doublon du questionnaire ne doit rester ici.
  const giant=root.querySelector('.akFocusGrid');
  if(giant){
   const other=giant.nextElementSibling;
   giant.remove();
   if(other&&other.classList.contains('grid2')&&other.textContent.includes('Informations nouvelles'))other.remove();
  }else{
   root.querySelector('.grid31')?.remove();
  }
  return root.innerHTML;
 };
 const previousClientTab=clientTab;
 clientTab=function(c){
  const body=previousClientTab(c);
  if(state.tab!=='visio_notes')return body;
  return questionnaireSection(c)+body;
 };
 const oldBind=bind;
 bind=function(){
  oldBind();
  document.querySelectorAll('.deepCheck').forEach(check=>check.addEventListener('change',()=>{
   const question=check.closest('.akQuestion');
   if(question){
    const editor=question.querySelector('.akQQuestionInput'),badge=question.querySelector('.akQChosen');
    if(editor)editor.hidden=!check.checked;
    if(badge){
     badge.className=check.checked?'status amber akQChosen':'muted tiny akQChosen';
     badge.textContent=check.checked?'À approfondir':'Voir la réponse';
    }
   }
   const c=currentClient();
   if(!c)return;
   const flagList=document.querySelector('.akQFlagList');
   if(flagList)flagList.innerHTML=flagsMarkup(c);
   const count=document.querySelector('.akQCount'),n=selectedKeys(c).length;
   if(count)count.textContent=n+' point'+(n>1?'s':'');
  }));
 };
 document.addEventListener('click',event=>{
  const btn=event.target.closest?.('.akQJump');
  if(!btn)return;
  event.preventDefault();event.stopImmediatePropagation();
  const key=btn.dataset.key;
  const item=[...document.querySelectorAll('.akQuestion')].find(node=>node.dataset.questionKey===key);
  if(!item)return;
  const group=item.closest('.akQGroup');
  if(group)group.open=true;
  item.open=true;
  item.scrollIntoView({behavior:'smooth',block:'center'});
  item.querySelector('.akFocusInput')?.focus({preventScroll:true});
 },true);
 window.AKP_QUESTIONNAIRE_UX_READY=true;
})();