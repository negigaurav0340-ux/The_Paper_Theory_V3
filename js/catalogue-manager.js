(async () => {
  'use strict';
  await window.TPT_CATALOGUE_READY;
  const key='tpt-owner-catalogue-v1', base=window.TPT_BASE_CATALOGUE || window.STICKER_CATALOGUE || [], published=window.TPT_PUBLISHED_UPDATES || {stickers:[],reels:[],hiddenCodes:[]};
  let data;
  try { data=window.TPT_LIVE_CATALOGUE && localStorage.getItem('tpt-owner-unsynced') !== '1' ? structuredClone(published) : JSON.parse(localStorage.getItem(key)) || structuredClone(published); } catch { data=structuredClone(published); }
  if (!Array.isArray(data.stickers)) data.stickers=[]; if (!Array.isArray(data.reels)) data.reels=[]; if (!Array.isArray(data.hiddenCodes)) data.hiddenCodes=[];
  const $=selector=>document.querySelector(selector), safe=text=>String(text||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const reelPattern=/^https:\/\/(www\.)?instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+\/?(?:\?.*)?$/;
  const originalCodes=new Set(base.map(item=>item.code));
  function refreshCategories(){ const values=[...new Set(base.map(item=>item.category).concat(data.stickers.map(item=>item.category)))].sort();$('#stickerCategory').innerHTML='<option value="">Choose category</option>'+values.map(value=>`<option value="${safe(value)}">${safe(value)}</option>`).join('')+'<option value="__other__">Other — create a new category</option>'; }
  function saveLocal(){try{localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('tpt-owner-unsynced','1');return true}catch{$('#exportStatus').textContent='Browser storage is full. Download a backup before adding more images.';return false}}
  async function publish(){
    if (!window.TPT_LIVE_CATALOGUE){$('#connectionStatus').textContent='Preview mode · live API needs one-time setup';return false;}
    const password=$('#managerPassword').value;
    if (!password){$('#connectionStatus').textContent='Enter the manager password to publish';return false;}
    $('#connectionStatus').textContent='Publishing…';
    try {const response=await fetch('/api/catalogue',{method:'POST',headers:{'Content-Type':'application/json','x-catalogue-secret':password},body:JSON.stringify(data),cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not publish');data=result.data;saveLocal();localStorage.removeItem('tpt-owner-unsynced');$('#connectionStatus').textContent='Live · saved for every visitor';return true;}catch(error){$('#connectionStatus').textContent=`Not published · ${error.message}`;return false;}
  }
  async function commit(messageId,message){if(!saveLocal()){ $(messageId).textContent='Could not save in this browser. Export a backup.';return;}render();const live=await publish();$(messageId).textContent=live?`${message} Live on the website.`:`${message} Saved here; enter the password and publish when live hosting is configured.`;}
  function allStickers(){
    const overrides=new Map(data.stickers.map(item=>[item.code,item]));
    return [...base.map(item=>({...item,...(overrides.get(item.code)||{}),pack:item.pack,pack_id:item.pack_id})),...data.stickers.filter(item=>!originalCodes.has(item.code))];
  }
  function renderAll(){
    const query=$('#manageSearch').value.trim().toLowerCase();
    const filtered=allStickers().filter(item=>`${item.code} ${item.name||''} ${item.category}`.toLowerCase().includes(query));
    $('#allCounts').textContent=`${filtered.length} found · ${data.hiddenCodes.length} hidden`;
    $('#allEntries').innerHTML=filtered.slice(0,query?100:48).map(item=>{
      const hidden=data.hiddenCodes.includes(item.code);
      return `<div class="entry ${hidden?'is-hidden':''}"><img src="${safe(item.image)}" alt="" loading="lazy"><div><b>${safe(item.name||item.code)}</b><br><span>${safe(item.code)} · ${safe(item.category)}${hidden?' · hidden':''}</span></div><button data-action="edit" data-code="${safe(item.code)}" type="button">Edit</button><button data-action="${hidden?'restore':'delete'}" data-code="${safe(item.code)}" type="button">${hidden?'Restore':originalCodes.has(item.code)?'Hide':'Delete'}</button></div>`;
    }).join('')+`<p class="fine">${filtered.length> (query?100:48)?'Showing the first results. Search for a specific code to edit it.':''}</p>`;
  }
  function render(){refreshCategories();$('#counts').textContent=`${data.stickers.length} sticker updates · ${data.reels.length} posts`;$('#entries').innerHTML=data.reels.map((item,i)=>`<div class="entry"><div><b>${safe(item.title||'Instagram post')}</b><br><span>${safe(item.url)}</span></div><button data-type="reel" data-index="${i}" type="button">Remove</button></div>`).join('');renderAll();}
  $('#replaceCode').innerHTML='<option value="">Choose a design</option>'+base.filter(item=>!item.code.startsWith('NEW-')).map(item=>`<option value="${safe(item.code)}">${safe(item.code)} · ${safe(item.name||item.pack)}</option>`).join('');
  $('#stickerCategory').addEventListener('change',()=>{$('#newCategoryLabel').hidden=$('#stickerCategory').value!=='__other__';$('#newCategory').required=!$('#newCategoryLabel').hidden;});
  $('#manageSearch').addEventListener('input',renderAll);
  $('#allEntries').addEventListener('click',async event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    const code=button.dataset.code, item=allStickers().find(entry=>entry.code===code);
    if(!item)return;
    if(button.dataset.action==='edit'){
      $('#editCode').value=code;$('#editCodeLabel').textContent=code;$('#editName').value=item.name||code;$('#editCategory').value=item.category;$('#editImage').value='';
      $('#editStickerForm').hidden=false;$('#editStickerForm').scrollIntoView({behavior:'smooth',block:'center'});return;
    }
    if(button.dataset.action==='restore')data.hiddenCodes=data.hiddenCodes.filter(value=>value!==code);
    else if(originalCodes.has(code)){data.hiddenCodes=[...new Set([...data.hiddenCodes,code])];}
    else data.stickers=data.stickers.filter(entry=>entry.code!==code);
    await commit('#manageStatus',`${code} ${button.dataset.action==='restore'?'restored':originalCodes.has(code)?'hidden':'deleted'}.`);
  });
  $('#cancelEdit').addEventListener('click',()=>{$('#editStickerForm').hidden=true;});
  $('#editStickerForm').addEventListener('submit',async event=>{
    event.preventDefault();
    try{
      const code=$('#editCode').value,existing=allStickers().find(item=>item.code===code);
      if(!existing)throw Error('Design no longer exists.');
      const name=$('#editName').value.trim(),category=$('#editCategory').value.trim();
      if(!name||!category)throw Error('Add a name and category.');
      const image=$('#editImage').files[0]?await compress($('#editImage').files[0]):existing.image;
      data.stickers=data.stickers.filter(item=>item.code!==code).concat({code,name,category,image,pack:existing.pack,pack_id:existing.pack_id});
      data.hiddenCodes=data.hiddenCodes.filter(value=>value!==code);
      $('#editStickerForm').hidden=true;
      await commit('#manageStatus',`${code} updated.`);
    }catch(error){$('#manageStatus').textContent=error.message;}
  });
  async function compress(file){if(!file||file.size>8*1024*1024)throw Error('Choose an image under 8 MB.');return new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{const canvas=document.createElement('canvas'),scale=Math.min(1,720/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/webp',.82));};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Could not read that image.'));};image.src=url;});}
  $('#stickerForm').addEventListener('submit',async event=>{event.preventDefault();try{const name=$('#stickerName').value.trim(),category=$('#stickerCategory').value==='__other__'?$('#newCategory').value.trim():$('#stickerCategory').value;if(!name||!category)throw Error('Add a name and category.');const image=await compress($('#stickerImage').files[0]),used=new Set(base.map(item=>item.code).concat(data.stickers.map(item=>item.code)));let n=1,code;do{code=`NEW-${String(n++).padStart(3,'0')}`}while(used.has(code));data.stickers.push({code,name,category,pack:'New Arrivals',pack_id:'PACK-OWNER',image});event.target.reset();$('#newCategoryLabel').hidden=true;$('#newCategory').required=false;await commit('#stickerStatus',`${code} added.`);}catch(error){$('#stickerStatus').textContent=error.message;}});
  $('#replaceForm').addEventListener('submit',async event=>{event.preventDefault();try{const code=$('#replaceCode').value,original=allStickers().find(item=>item.code===code);if(!original)throw Error('Choose a code.');const image=await compress($('#replaceImage').files[0]),next={code,name:original.name||original.code,category:original.category,pack:original.pack,pack_id:original.pack_id,image};data.stickers=data.stickers.filter(item=>item.code!==code).concat(next);data.hiddenCodes=data.hiddenCodes.filter(value=>value!==code);event.target.reset();await commit('#replaceStatus',`${code} image replaced.`);}catch(error){$('#replaceStatus').textContent=error.message;}});
  $('#reelForm').addEventListener('submit',async event=>{event.preventDefault();const url=$('#reelUrl').value.trim(),title=$('#reelTitle').value.trim();if(!reelPattern.test(url)){$('#reelStatus').textContent='Use a public Instagram Reel or post URL.';return;}if(data.reels.some(item=>item.url.split('?')[0]===url.split('?')[0])){$('#reelStatus').textContent='Already listed.';return;}data.reels.push({url:url.split('?')[0],title});event.target.reset();await commit('#reelStatus','Post added.');});
  $('#entries').addEventListener('click',async event=>{const button=event.target.closest('button[data-type]');if(!button)return;data[button.dataset.type==='sticker'?'stickers':'reels'].splice(Number(button.dataset.index),1);await commit('#exportStatus','Entry removed.');});
  $('#publishButton').addEventListener('click',async()=>{await publish();});
  $('#exportButton').addEventListener('click',()=>{const blob=new Blob(['/* The Paper Theory owner catalogue update */\nwindow.TPT_CATALOGUE_UPDATES = '+JSON.stringify(data,null,2)+';\n'],{type:'text/javascript'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='catalogue-updates.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#exportStatus').textContent='Backup downloaded.';});
  $('#importFile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{const raw=await file.text(),match=raw.match(/window\.TPT_CATALOGUE_UPDATES\s*=\s*([\s\S]*);\s*$/),next=JSON.parse(match?match[1]:raw);if(!Array.isArray(next.stickers)||!Array.isArray(next.reels))throw Error('Invalid backup');data=next;data.hiddenCodes=Array.isArray(data.hiddenCodes)?data.hiddenCodes:[];saveLocal();render();$('#exportStatus').textContent='Backup restored. Click Publish saved changes to send it to the website.';}catch(error){$('#exportStatus').textContent=error.message;}});
  $('#connectionStatus').textContent=window.TPT_LIVE_CATALOGUE?'Live connection ready · enter password to save':'Preview mode · configure live API once';render();
})();
