/* AK PRIME — suivi GA4 public, uniquement après consentement explicite. */
(function(){
  'use strict';
  const MEASUREMENT_ID='G-R3871LKQY9';
  const CONSENT_KEY='akp-analytics-consent-v1';
  let choice=null;
  let publicActive=false;
  let googleLoaded=false;
  let lastPageView='';
  let banner=null;

  try {
    const stored=localStorage.getItem(CONSENT_KEY);
    if(stored==='accepted'||stored==='refused')choice=stored;
  } catch(error){ /* Navigation privée : aucun consentement implicite. */ }

  function googleCommand(){
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    return window.gtag;
  }
  function deniedState(){
    return {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
  }
  function setConsent(granted){
    if(!googleLoaded)return;
    const gtag=googleCommand();
    gtag('consent','update',Object.assign(deniedState(),{analytics_storage:granted?'granted':'denied'}));
    window['ga-disable-'+MEASUREMENT_ID]=!granted;
  }
  function loadGoogle(){
    if(googleLoaded)return;
    if(choice!=='accepted'||!publicActive)return;
    googleLoaded=true;
    window['ga-disable-'+MEASUREMENT_ID]=false;
    const gtag=googleCommand();
    // Consentement avancé désactivé : aucun script Google avant l'accord.
    gtag('consent','default',deniedState());
    gtag('set','allow_google_signals',false);
    gtag('set','allow_ad_personalization_signals',false);
    // Ne pas transmettre les tokens et informations potentiellement sensibles des URL.
    gtag('set','page_location',safeLocation());
    gtag('consent','update',Object.assign(deniedState(),{analytics_storage:'granted'}));
    gtag('js',new Date());
    gtag('config',MEASUREMENT_ID,{
      send_page_view:false,
      allow_google_signals:false,
      allow_ad_personalization_signals:false,
      page_location:safeLocation(),
      page_path:location.pathname
    });
    const script=document.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(MEASUREMENT_ID);
    script.referrerPolicy='strict-origin-when-cross-origin';
    document.head.appendChild(script);
  }
  function safeLocation(){
    // Ne jamais envoyer les paramètres des URL (tokens, IDs client ou paiements).
    return location.origin+location.pathname;
  }
  function pageView(){
    if(choice!=='accepted'||!publicActive)return;
    loadGoogle();
    setConsent(true);
    const page=safeLocation();
    if(page===lastPageView)return;
    lastPageView=page;
    window.gtag('event','page_view',{
      page_title:document.title,
      page_location:page,
      page_path:location.pathname
    });
  }
  function forgetGoogleCookies(){
    // Retrait : purge best-effort des cookies GA accessibles sur ce domaine.
    const names=document.cookie.split(';').map(x=>x.trim().split('=')[0]).filter(x=>/^_ga(?:_|$)/.test(x));
    const hosts=[location.hostname,'.'+location.hostname];
    for(const name of names){
      for(const host of hosts){
        document.cookie=name+'=; Max-Age=0; path=/; domain='+host+'; SameSite=Lax';
      }
      document.cookie=name+'=; Max-Age=0; path=/; SameSite=Lax';
    }
  }
  function removeBanner(){
    if(banner){banner.remove();banner=null;}
  }
  function saveChoice(next){
    choice=next;
    try{localStorage.setItem(CONSENT_KEY,choice);}catch(error){}
    removeBanner();
    lastPageView='';
    if(choice==='accepted'){
      if(publicActive){loadGoogle();setConsent(true);pageView();}
    }else{
      setConsent(false);
      forgetGoogleCookies();
    }
  }
  function openPreferences(){
    if(!publicActive)return;
    removeBanner();
    banner=document.createElement('section');
    banner.className='akp-consent-banner';
    banner.setAttribute('role','region');
    banner.setAttribute('aria-label','Choix des cookies de mesure d’audience');
    banner.innerHTML=
      '<div class="akp-consent-text"><strong>Respect de votre vie privée</strong>'+
      '<p>AK PRIME utilise Google Analytics uniquement avec votre accord pour mesurer les visites et les interactions avec les offres. Aucun suivi analytique des espaces privés ni des informations de santé. Vous pouvez refuser et revenir sur votre choix à tout moment.</p>'+
      '<button type="button" class="akp-consent-privacy">Lire notre politique de confidentialité</button></div>'+
      '<div class="akp-consent-actions"><button type="button" data-akp-consent="refused">Refuser</button>'+
      '<button type="button" data-akp-consent="accepted">Accepter</button></div>';
    banner.querySelectorAll('[data-akp-consent]').forEach(button=>{
      button.addEventListener('click',()=>saveChoice(button.dataset.akpConsent));
    });
    banner.querySelector('.akp-consent-privacy').addEventListener('click',()=>{
      const privacy=document.querySelector('.publicLegalBtn[data-legal="privacy"]');
      if(privacy)privacy.click();
      else window.location.href='https://akprime.fr/?confidentialite=1';
    });
    document.body.appendChild(banner);
  }
  function start(){
    publicActive=true;
    if(choice===null)openPreferences();
    else if(choice==='accepted')pageView();
    else removeBanner();
  }
  function pause(){
    publicActive=false;
    lastPageView='';
    removeBanner();
    setConsent(false);
  }
  function track(event,params){
    // Les simulations Stripe TEST ne doivent jamais biaiser les statistiques publiques.
    if(!publicActive||choice!=='accepted'||window.AKP_PUBLIC_TEST_MODE===true)return;
    if(!/^(view_offer_list|view_offer_details|view_service_details|begin_checkout|checkout_redirect)$/.test(event))return;
    // Paramètres strictement bornés : aucun nom, e-mail, paiement, URL de retour ou contenu client.
    const safe={};
    const allowedCodes=['forme_standard','forme_renforce','performance_p1','performance_p2','performance_p3','mental_particulier','mental_sportif'];
    if(params&&typeof params.offer_code==='string'&&allowedCodes.includes(params.offer_code))safe.offer_code=params.offer_code;
    if(params&&typeof params.service_group==='string'&&['forme','performance','mental'].includes(params.service_group))safe.service_group=params.service_group;
    loadGoogle();
    window.gtag('event',event,safe);
  }
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('button,a,[role="button"]'):null;
    if(!target)return;
    if(target.classList.contains('akpCookieSettings')){
      event.preventDefault();
      openPreferences();
      return;
    }
    if(choice!=='accepted'||!publicActive)return;
    if(target.matches('a[href="#offres"]')&&target.closest('.public-site'))track('view_offer_list');
    if(target.matches('.publicPoleBtn')){
      const group=target.dataset.pole;
      if(['forme','performance','mental'].includes(group))track('view_service_details',{service_group:group});
    }
  },true);
  window.akprimeAnalytics={start,pause,track,openPreferences};
})();
