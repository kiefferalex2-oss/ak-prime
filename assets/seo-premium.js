/* AK PRIME - navigation accessible des pages SEO premium */
(function(){
  "use strict";
  const button=document.getElementById("mobileMenuBtn");
  const nav=document.getElementById("mainNav");
  if(!button||!nav)return;
  function close(){
    nav.classList.remove("open");
    button.setAttribute("aria-expanded","false");
    button.setAttribute("aria-label","Ouvrir le menu");
    const glyph=button.querySelector("span:first-child");
    if(glyph)glyph.textContent="☰";
    document.body.classList.remove("menu-open");
  }
  button.setAttribute("aria-label","Ouvrir le menu");
  button.addEventListener("click",()=>{
    const opening=!nav.classList.contains("open");
    if(!opening){close();return}
    nav.classList.add("open");
    button.setAttribute("aria-expanded","true");
    button.setAttribute("aria-label","Fermer le menu");
    const glyph=button.querySelector("span:first-child");
    if(glyph)glyph.textContent="×";
    document.body.classList.add("menu-open");
  });
  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  document.addEventListener("pointerdown",e=>{if(nav.classList.contains("open")&&!nav.contains(e.target)&&!button.contains(e.target))close()});
  window.addEventListener("resize",()=>{if(window.innerWidth>740)close()});
})();