'use strict';
window.AKPrimeStudio=(()=>{
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function wrap(text,limit,maxLines){
  const lines=[];let current='';
  for(const word of String(text).split(/\s+/).filter(Boolean)){
   if((current+' '+word).trim().length>limit&&current){lines.push(current);current=word}else current=(current+' '+word).trim();
  }
  if(current)lines.push(current);
  if(lines.length>maxLines)throw Error('Texte trop long pour le visuel : raccourcissez le titre ou les points.');
  if(lines.some(line=>line.length>limit+5))throw Error('Un mot est trop long pour le visuel.');
  return lines;
 }
 function svg(draft){
  const title=wrap(draft.visual_title||draft.title,27,3);
  const rawPoints=String(draft.visual_points||'').split('\n').filter(Boolean);
  if(rawPoints.length>3)throw Error('Le visuel accepte trois points maximum.');
  const points=rawPoints.flatMap(p=>wrap(p,43,2));
  if(points.length>6)throw Error('Raccourcissez les points du visuel.');
  const pole={performance:'PERFORMANCE SPORTIVE',forme_sante:'FORME & SANTÉ',mental:'PRÉPARATION MENTALE'}[draft.pole]||'AK PRIME';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#0d233b"/><circle cx="1060" cy="80" r="420" fill="#132d48"/><path d="M750 0L1080 340M850 0L1080 230" stroke="#c8a463" stroke-opacity=".18" stroke-width="2"/><rect x="70" y="90" width="7" height="62" fill="#c8a463"/><g font-family="Arial,Helvetica,sans-serif"><text x="100" y="140" font-size="56" letter-spacing="8" font-weight="700" fill="#ffffff">AK <tspan fill="#c8a463">PRIME</tspan></text><text x="75" y="240" font-size="24" letter-spacing="4" fill="#c8a463">${escape(pole)}</text>${title.map((line,i)=>`<text x="70" y="${360+i*82}" font-size="64" font-weight="700" fill="#ffffff">${escape(line)}</text>`).join('')}<rect x="75" y="610" width="100" height="4" fill="#c8a463"/>${points.map((line,i)=>`<text x="75" y="${695+i*56}" font-size="33" fill="#d5deea">${escape(line)}</text>`).join('')}<rect x="70" y="1090" width="940" height="165" rx="15" fill="#c8a463"/><text x="110" y="1156" font-size="43" font-weight="700" fill="#0d233b">Premier bilan offert · 20 min</text><text x="110" y="1210" font-size="30" fill="#0d233b">En visio · Accompagnement à distance</text><text x="75" y="1310" font-size="27" letter-spacing="4" fill="#ffffff">AKPRIME.FR</text></g></svg>`;
 }
 async function jpeg(draft){
  const blob=new Blob([svg(draft)],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);
  try{
   const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
   canvas.getContext('2d').drawImage(img,0,0);
   return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Export impossible')),'image/jpeg',.94));
  }finally{URL.revokeObjectURL(url)}
 }
 return {svg,jpeg,wrap};
})();
