/* AK PRIME — Avis publics ouverts : depot sans compte, suppression reservee au proprietaire. */
(function(){
  'use strict';
  if(typeof renderPublicSite!=='function' || typeof reviewAdminPage!=='function')return;

  let publicFormReadyAt=0;
  let ownerOpenReviews=null;
  const oldRenderPublicSite=renderPublicSite;
  const oldLoadPublishedReviews=akpLoadPublishedReviews;
  const oldReviewAdminPage=reviewAdminPage;
  const oldLoadOwnerReviews=akpLoadOwnerReviews;

  function formMarkup(){
    return '<details class="akpOpenReviewWrite" id="akpOpenReviewWrite">'+
      '<summary><span><strong>Partager votre avis sur AK PRIME</strong><small>Accès libre, sans inscription ni compte client.</small></span><span class="akpOpenReviewCta">Déposer un avis</span></summary>'+
      '<form id="akpOpenReviewForm" class="akpOpenReviewForm">'+
      '<div class="akpOpenReviewFields">'+
      '<label>Prénom ou pseudonyme public <input name="public_name" type="text" minlength="2" maxlength="48" autocomplete="nickname" required placeholder="Ex. Camille L."></label>'+
      '<label>Votre relation avec AK PRIME <select name="experience_type" required>'+
      '<option value="">Choisir une option</option>'+
      '<option value="accompagnement">J’ai bénéficié d’un accompagnement</option>'+
      '<option value="decouverte">J’ai découvert les services ou le site</option>'+
      '<option value="autre">Autre retour d’expérience</option>'+
      '</select></label>'+
      '<label>Votre note <select name="rating" required><option value="">Choisir une note</option>'+
      '<option value="5">★★★★★ — 5/5</option><option value="4">★★★★☆ — 4/5</option>'+
      '<option value="3">★★★☆☆ — 3/5</option><option value="2">★★☆☆☆ — 2/5</option>'+
      '<option value="1">★☆☆☆☆ — 1/5</option></select></label>'+
      '<label class="akpOpenReviewMessage">Votre avis <textarea name="review_text" minlength="30" maxlength="1200" rows="4" required placeholder="Décrivez honnêtement votre expérience. Pas de lien, numéro de téléphone ni information médicale."></textarea><small>30 à 1 200 caractères. Les avis négatifs sont acceptés.</small></label>'+
      '</div>'+
      '<label class="akpOpenReviewConsent"><input type="checkbox" name="consent_publication" required> J’accepte la publication de mon pseudonyme, de ma note et de mon commentaire sur AK PRIME. Je sais que mon avis sera visible publiquement et pourra être signalé ou retiré en écrivant à contact@akprime.fr.</label>'+
      '<div class="akpOpenReviewHoney" aria-hidden="true"><label>Ne pas remplir ce champ<input name="website" tabindex="-1" autocomplete="off"></label></div>'+
      '<div class="akpOpenReviewActions"><button class="akpOpenReviewSubmit" type="submit">Publier mon avis</button><p id="akpOpenReviewResult" role="status" aria-live="polite"></p></div>'+
      '<p class="akpOpenReviewLegal">Les avis déposés ici ne sont pas vérifiés comme des achats ou accompagnements. Ils sont indiqués comme tels. Seuls les contenus abusifs, illicites ou hors sujet peuvent être modérés, indépendamment de leur note.</p>'+
      '</form></details>';
  }

  renderPublicSite=function(){
    let html=oldRenderPublicSite();
    html=html.replace(
      '<div class="akpReviewsCompactHead"><h2>Avis clients</h2><p>Des retours vérifiés de personnes réellement accompagnées par AK PRIME.</p></div>',
      '<div class="akpReviewsCompactHead"><h2>Avis & retours d’expérience</h2><p>Découvrez les retours des clients et visiteurs, puis partagez le vôtre.</p></div>'
    );
    html=html.replace('<div id="akpReviewsPublicList"',formMarkup()+'<div id="akpReviewsPublicList"');
    html=html.replace(
      /<details class="akpReviewInfo">[\s\S]*?<\/details>/,
      '<details class="akpReviewInfo"><summary>Comment fonctionnent les avis ?</summary><p>Tout visiteur peut déposer librement un avis, sans compte client. Ces avis sont clairement identifiés comme non vérifiés. Les témoignages de clients ayant suivi AK PRIME restent distingués. Les avis positifs et négatifs sont acceptés. Les contenus injurieux, publicitaires, illicites ou hors sujet peuvent être retirés avec un motif, sans sélection selon la note. Pour signaler un avis ou demander son retrait : <a href="mailto:contact@akprime.fr">contact@akprime.fr</a>.</p></details>'
    );
    publicFormReadyAt=Date.now();
    return html;
  };

  function dateLabel(v){
    const t=new Date(v);
    return Number.isFinite(t.getTime())?new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(t):'';
  }
  function relationshipLabel(type){
    return type==='accompagnement'?'Accompagnement déclaré (non vérifié)':
      type==='decouverte'?'Visiteur du site (non vérifié)':'Retour libre (non vérifié)';
  }

  akpLoadPublishedReviews=async function(){
    const box=document.getElementById('akpReviewsPublicList');
    if(!box)return;
    const since=new Date(Date.now()-730*86400000).toISOString();
    const [verified,open]=await Promise.all([
      supa.from('akp_published_reviews')
        .select('public_name,rating,review_text,experience_date,pole_label,offer_label,created_at,published_at')
        .gte('published_at',since).order('published_at',{ascending:false}).limit(20),
      supa.from('akp_public_reviews')
        .select('public_name,rating,review_text,experience_type,published_at')
        .eq('moderation_status','published')
        .gte('published_at',since).order('published_at',{ascending:false}).limit(20)
    ]);
    if(!box.isConnected)return;
    if(verified.error&&open.error){
      box.innerHTML='<p class="akpReviewEmpty">Impossible de charger les avis pour le moment.</p>';return;
    }
    const rows=[
      ...(verified.data||[]).map(x=>({...x,verified:true})),
      ...(open.data||[]).map(x=>({...x,verified:false}))
    ].sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)).slice(0,6);
    if(!rows.length){
      box.innerHTML='<p class="akpReviewEmpty">Aucun avis publié pour le moment. Soyez la première personne à partager votre retour.</p>';return;
    }
    box.innerHTML='<div class="akpReviewsGrid">'+rows.map(x=>{
      const rating=Math.min(5,Math.max(1,Number(x.rating)||1));
      const stamp=dateLabel(x.published_at);
      const source=x.verified?'Client AK PRIME vérifié':relationshipLabel(x.experience_type);
      const extra=x.verified?[x.pole_label,x.offer_label].filter(Boolean).join(' · '):'';
      return '<article class="akpReviewCard"><div class="akpReviewStars" aria-label="'+rating+' étoiles sur 5">'+
        '★'.repeat(rating)+'☆'.repeat(5-rating)+'</div>'+
        '<blockquote>'+esc(x.review_text)+'</blockquote><div class="akpReviewMeta"><strong>'+esc(x.public_name)+
        '</strong><span>'+esc(source)+'</span>'+(extra?'<small>'+esc(extra)+'</small>':'')+
        '<small>Publié le '+esc(stamp)+'</small></div></article>';
    }).join('')+'</div>';
  };

  function ownerOpenMarkup(){
    if(authProfile?.role!=='owner')return '';
    if(ownerOpenReviews===null)return '<section class="card panel" style="margin-top:20px"><h3>Avis libres déposés sur le site</h3><p>Chargement…</p></section>';
    return '<section class="card panel" style="margin-top:20px"><h3>Avis libres déposés sur le site ('+ownerOpenReviews.length+')</h3>'+
      '<p class="muted tiny">Visiteurs sans compte, publication immédiate et mention « non vérifié ». Toi seul peux masquer, réafficher ou supprimer ces avis. Ne retire pas un avis pour sa note défavorable.</p>'+
      (!ownerOpenReviews.length?'<p class="muted">Aucun avis libre reçu.</p>':
      ownerOpenReviews.map(x=>{
        const hidden=x.moderation_status==='hidden';
        return '<article class="akpOpenAdminReview">'+
          '<div class="row between" style="gap:12px;flex-wrap:wrap"><strong>'+esc(x.public_name)+' · '+Number(x.rating)+'/5</strong>'+
          '<span class="status '+(hidden?'amber':'green')+'">'+(hidden?'Masqué':'En ligne')+'</span></div>'+
          '<div class="muted tiny">'+esc(relationshipLabel(x.experience_type))+' · '+esc(dateLabel(x.created_at))+'</div>'+
          '<p style="white-space:pre-wrap;margin:12px 0">'+esc(x.review_text)+'</p>'+
          (hidden?'<p class="muted tiny">Motif : '+esc(x.moderation_reason||'')+'</p>':'')+
          '<div class="row" style="gap:8px;flex-wrap:wrap">'+
          (hidden?'<button class="btn ghost small akpOpenReviewAction" data-action="show" data-id="'+esc(x.id)+'">Réafficher</button>':
            '<button class="btn ghost small akpOpenReviewAction" data-action="hide" data-id="'+esc(x.id)+'">Masquer avec motif</button>')+
          '<button class="btn ghost small akpOpenReviewAction" data-action="delete" data-id="'+esc(x.id)+'">Supprimer définitivement</button>'+
          '</div></article>';
      }).join(''))+'</section>';
  }

  reviewAdminPage=function(){
    return oldReviewAdminPage().replace(
      'Retours de clients réels, sans modification du contenu ni sélection selon la note.',
      'Avis de clients suivis et retours libres des visiteurs, sans sélection selon la note.'
    )+ownerOpenMarkup();
  };

  akpLoadOwnerReviews=async function(){
    if(authProfile?.role!=='owner')return;
    const {data,error}=await supa.from('akp_public_reviews')
      .select('id,public_name,rating,review_text,experience_type,created_at,moderation_status,moderation_reason')
      .order('created_at',{ascending:false}).limit(100);
    if(error)console.warn('Avis libres indisponibles',error);
    ownerOpenReviews=error?[]:(data||[]);
    return oldLoadOwnerReviews();
  };

  function formResult(message,failed){
    const output=document.getElementById('akpOpenReviewResult');
    if(output){output.textContent=message;output.className=failed?'error':'success';}
  }

  document.addEventListener('submit',async function(event){
    if(event.target?.id!=='akpOpenReviewForm')return;
    event.preventDefault();
    const form=event.target;
    if(!form.reportValidity())return;
    if(form.elements.website?.value)return formResult('Envoi impossible. Réessayez.',true);
    if(Date.now()-publicFormReadyAt<2500)return formResult('Veuillez relire votre avis avant de l’envoyer.',true);
    try{
      const prior=Number(localStorage.getItem('akp-open-review-sent-at')||0);
      if(prior&&Date.now()-prior<60000)return formResult('Patientez une minute avant de déposer un autre avis.',true);
    }catch(_){}
    const public_name=String(form.elements.public_name.value||'').trim();
    const review_text=String(form.elements.review_text.value||'').trim();
    const rating=Number(form.elements.rating.value);
    const experience_type=String(form.elements.experience_type.value||'');
    if(public_name.length<2||public_name.length>48||review_text.length<30||review_text.length>1200||
       /https?:\/\/|www\./i.test(review_text)||rating<1||rating>5||
       !['accompagnement','decouverte','autre'].includes(experience_type)||
       !form.elements.consent_publication.checked){
      return formResult('Vérifiez les champs : 30 caractères minimum, aucun lien et consentement obligatoire.',true);
    }
    const submit=form.querySelector('[type="submit"]');
    submit.disabled=true;
    submit.textContent='Publication…';
    try{
      const {error}=await supa.from('akp_public_reviews').insert({
        public_name,rating,review_text,experience_type,consent_publication:true
      });
      if(error)throw error;
      try{localStorage.setItem('akp-open-review-sent-at',String(Date.now()))}catch(_){}
      form.reset();
      formResult('Merci ! Votre avis est publié. Il est identifié comme non vérifié.',false);
      await akpLoadPublishedReviews();
    }catch(error){
      console.error('Échec dépôt avis public',error);
      formResult('Votre avis n’a pas pu être enregistré. Réessayez ou écrivez à contact@akprime.fr.',true);
    }finally{
      submit.disabled=false;
      submit.textContent='Publier mon avis';
    }
  });

  document.addEventListener('click',async function(event){
    const btn=event.target?.closest?.('.akpOpenReviewAction');
    if(!btn||authProfile?.role!=='owner')return;
    const id=btn.dataset.id, action=btn.dataset.action;
    if(!/^[0-9a-f-]{36}$/i.test(id))return;
    const row=(ownerOpenReviews||[]).find(x=>x.id===id);
    if(!row)return;
    let error=null;
    btn.disabled=true;
    try{
      if(action==='delete'){
        if(!confirm('Supprimer définitivement cet avis ? Cette action est irréversible. Un avis négatif légitime ne doit pas être supprimé pour sa note.'))return;
        ({error}=await supa.from('akp_public_reviews').delete().eq('id',id));
      }else if(action==='hide'){
        const reason=prompt('Indique le motif objectif de retrait (spam, injure, données personnelles, publicité ou hors sujet) :');
        if(!reason||reason.trim().length<10){formResult('Motif insuffisant.',true);return}
        ({error}=await supa.from('akp_public_reviews').update({
          moderation_status:'hidden',moderation_reason:reason.trim().slice(0,500)
        }).eq('id',id));
      }else if(action==='show'){
        if(!confirm('Réafficher cet avis tel qu’il a été écrit ?'))return;
        ({error}=await supa.from('akp_public_reviews').update({
          moderation_status:'published',moderation_reason:null
        }).eq('id',id));
      }
      if(error)throw error;
      await akpLoadOwnerReviews();
      toast(action==='delete'?'Avis supprimé':action==='hide'?'Avis masqué':'Avis réaffiché');
    }catch(error){
      alert('Action impossible : '+String(error.message||error));
    }finally{btn.disabled=false;}
  });
})();
