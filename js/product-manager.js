(async () => {
  'use strict';
  await window.TPT_PRODUCTS_READY;
  const base=window.TPT_BASE_PRODUCTS || [];
  const published=window.TPT_PUBLISHED_PRODUCTS || {upserts:[],hiddenIds:[]};
  const key='tpt-product-draft-v1', unsynced='tpt-products-unsynced';
  const $=selector=>document.querySelector(selector);
  const safe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let data;
  try{data=window.TPT_LIVE_PRODUCTS && localStorage.getItem(unsynced)!=='1'?structuredClone(published):JSON.parse(localStorage.getItem(key)) || structuredClone(published);}catch{data=structuredClone(published);}
  if(!Array.isArray(data.upserts))data.upserts=[];
  if(!Array.isArray(data.hiddenIds))data.hiddenIds=[];
  const baseIds=new Set(base.map(item=>item.id));
  const categories=[...new Set((window.CATALOGUE.categories || []).filter(name=>name!=='All').concat(base.flatMap(p=>p.categories || [])))];
  $('#editCategory').innerHTML=categories.map(name=>`<option value="${safe(name)}">${safe(name)}</option>`).join('');
  const current=()=>{
    const map=new Map(data.upserts.map(item=>[item.id,item]));
    return [...base.map(item=>map.has(item.id)?{...item,...map.get(item.id)}:item),...data.upserts.filter(item=>!baseIds.has(item.id))];
  };
  function render(){
    const query=$('#productSearch').value.trim().toLowerCase();
    const card=p=>{
      const hidden=data.hiddenIds.includes(p.id), price=p.variants?.find(v=>Number.isInteger(v.price))?.price;
      const image=p.images?.[0] || p.variants?.[0]?.image || '';
      return `<article class="product ${hidden?'is-hidden':''}"><img src="${safe(image)}" alt="" loading="lazy"><div><b>${safe(p.name)}</b><small>${safe(p.id)} · ${safe(p.categories?.[0]||'Product')}${hidden?' · hidden':''}</small><small>${price==null?'Quote':'₹'+price.toLocaleString('en-IN')}</small></div><div class="controls"><button data-action="edit" data-id="${safe(p.id)}" type="button">Edit</button>${p.categories?.includes('Light Boxes')?'':`<button class="secondary" data-action="${hidden?'restore':'remove'}" data-id="${safe(p.id)}" type="button">${hidden?'Restore':baseIds.has(p.id)?'Hide':'Delete'}</button>`}</div></article>`;
    };
    const all=current();
    $('#lightboxProducts').innerHTML=all.filter(p=>p.categories?.includes('Light Boxes')).map(card).join('');
    const other=all.filter(p=>!p.categories?.includes('Light Boxes') && `${p.id} ${p.name} ${p.theme} ${p.categories?.join(' ')}`.toLowerCase().includes(query));
    $('#otherProducts').innerHTML=other.map(card).join('') || '<p>No matching products.</p>';
  }
  function variantRow(v){
    const host=document.createElement('div');
    host.className='variant-row';host.dataset.id=v.id || '';
    host.innerHTML=`<label>Size / pack<input class="v-size" required maxlength="100" value="${safe(v.size||'')}"></label><label>Finish / option<input class="v-finish" required maxlength="100" value="${safe(v.finish||'')}"></label><label>Price ₹<input class="v-price" type="number" min="0" max="1000000" placeholder="Quote" value="${v.price==null?'':v.price}"></label><button type="button" class="secondary" data-remove-variant>Remove</button>`;
    host.dataset.image=v.image || '';
    $('#variantRows').append(host);
  }
  function openEditor(product){
    const fresh=!product;
    const next=product || {id:'NEW-'+String(1+Math.max(0,...current().map(p=>Number(p.id.match(/^NEW-(\d+)$/)?.[1])||0))).padStart(3,'0'),name:'',theme:'Custom',description:'',categories:['Custom Packages / Bundles'],status:'enquire',images:[],variants:[{id:'',size:'One item',finish:'Custom',price:null,image:''}]};
    $('#editId').value=next.id;$('#editorTitle').textContent=`${fresh?'Add':'Edit'} ${next.name||'product'} · ${next.id}`;
    $('#editName').value=next.name;$('#editCategory').value=next.categories?.[0] || categories[0];$('#editTheme').value=next.theme;$('#editDescription').value=next.description;$('#editStatus').value=next.status;
    $('#editImage').value='';$('#editOffImage').value='';
    $('#variantRows').replaceChildren();next.variants.forEach(variantRow);
    $('#editorSection').hidden=false;$('#editorSection').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function saveLocal(){
    try{localStorage.setItem(key,JSON.stringify(data));localStorage.setItem(unsynced,'1');return true;}
    catch{$('#backupStatus').textContent='Storage is full. Download a backup and use smaller images.';return false;}
  }
  async function publish(){
    if(!window.TPT_LIVE_PRODUCTS){$('#connectionStatus').textContent='Preview mode · live setup needed';return false;}
    const password=$('#managerPassword').value;
    if(!password){$('#connectionStatus').textContent='Enter manager password to publish';return false;}
    $('#connectionStatus').textContent='Publishing…';
    try{
      const response=await fetch('/api/products',{method:'POST',headers:{'Content-Type':'application/json','x-catalogue-secret':password},body:JSON.stringify(data),cache:'no-store'});
      const result=await response.json();if(!response.ok)throw Error(result.error || 'Could not publish');
      data=result.data;saveLocal();localStorage.removeItem(unsynced);
      $('#connectionStatus').textContent='Live · changes visible to visitors on page refresh';return true;
    }catch(error){$('#connectionStatus').textContent=`Not published · ${error.message}`;return false;}
  }
  async function commit(message){
    if(!saveLocal())return;
    render();
    const live=await publish();
    $('#editStatusMessage').textContent=live?`${message} Published to the website.`:`${message} Saved as a draft here. Configure live publishing and enter the password to publish.`;
  }
  async function compress(file){
    if(!file || !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size>8*1024*1024)throw Error('Use a PNG, JPEG or WebP image under 8 MB.');
    return new Promise((resolve,reject)=>{
      const image=new Image(),url=URL.createObjectURL(file);
      image.onload=()=>{
        const canvas=document.createElement('canvas'),scale=Math.min(1,800/Math.max(image.width,image.height));
        canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        URL.revokeObjectURL(url);
        const output=[.82,.7,.55].map(q=>canvas.toDataURL('image/webp',q)).find(value=>value.length<390000);
        output?resolve(output):reject(Error('This image is too detailed. Choose a smaller file.'));
      };
      image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Could not read this image.'));};
      image.src=url;
    });
  }
  document.body.addEventListener('click',async event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    const product=current().find(item=>item.id===button.dataset.id);if(!product)return;
    if(button.dataset.action==='edit'){openEditor(product);return;}
    if(button.dataset.action==='restore')data.hiddenIds=data.hiddenIds.filter(id=>id!==product.id);
    else if(baseIds.has(product.id))data.hiddenIds=[...new Set([...data.hiddenIds,product.id])];
    else data.upserts=data.upserts.filter(item=>item.id!==product.id);
    await commit(`${product.name} ${button.dataset.action==='restore'?'restored':baseIds.has(product.id)?'hidden':'deleted'}.`);
  });
  $('#addProduct').addEventListener('click',()=>openEditor(null));
  $('#cancelEdit').addEventListener('click',()=>{$('#editorSection').hidden=true;});
  $('#productSearch').addEventListener('input',render);
  $('#addVariant').addEventListener('click',()=>variantRow({size:'',finish:'',price:null,image:''}));
  $('#variantRows').addEventListener('click',event=>{if(event.target.closest('[data-remove-variant]') && $('#variantRows').children.length>1)event.target.closest('.variant-row').remove();});
  $('#productForm').addEventListener('submit',async event=>{
    event.preventDefault();
    try{
      const id=$('#editId').value,previous=current().find(p=>p.id===id);
      const first=$('#editImage').files[0]?await compress($('#editImage').files[0]):previous?.images?.[0] || '';
      const second=$('#editOffImage').files[0]?await compress($('#editOffImage').files[0]):previous?.images?.[1] || '';
      const images=[first,second,...(previous?.images || []).slice(2)].filter(Boolean).slice(0,8);
      const variants=[...$('#variantRows').children].map((row,index)=>({
        id:row.dataset.id || `${id}-V${index+1}`,
        size:row.querySelector('.v-size').value.trim(),finish:row.querySelector('.v-finish').value.trim(),
        price:row.querySelector('.v-price').value===''?null:Number(row.querySelector('.v-price').value),
        image:row.dataset.image && row.dataset.image!==previous?.images?.[0]?row.dataset.image:first
      }));
      const item={id,name:$('#editName').value.trim(),theme:$('#editTheme').value.trim(),description:$('#editDescription').value.trim(),categories:previous?.categories?.includes('Holographic Packs') && $('#editCategory').value==='Sticker Packs'?['Sticker Packs','Holographic Packs']:[$('#editCategory').value],status:$('#editStatus').value,images,variants};
      if(!images.length && item.status==='order')throw Error('Add a product image before making a new item available.');
      if(!variants.length || variants.some(v=>!v.size || !v.finish || (v.price!==null && !Number.isInteger(v.price))))throw Error('Complete each product option and price.');
      data.upserts=data.upserts.filter(product=>product.id!==id).concat(item);
      data.hiddenIds=data.hiddenIds.filter(value=>value!==id);
      $('#editorSection').hidden=true;
      await commit(`${item.name} saved.`);
    }catch(error){$('#editStatusMessage').textContent=error.message;}
  });
  $('#publishButton').addEventListener('click',publish);
  $('#exportButton').addEventListener('click',()=>{
    const source='/* Product manager backup */\nwindow.TPT_PRODUCT_UPDATES = '+JSON.stringify(data,null,2)+';\n';
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'})),a=document.createElement('a');a.href=url;a.download='product-updates.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#backupStatus').textContent='Backup downloaded.';
  });
  $('#importFile').addEventListener('change',async event=>{
    try{
      const raw=await event.target.files[0].text(),match=raw.match(/window\.TPT_PRODUCT_UPDATES\s*=\s*([\s\S]*);\s*$/),next=JSON.parse(match?match[1]:raw);
      if(!Array.isArray(next.upserts)||!Array.isArray(next.hiddenIds))throw Error('Invalid backup');
      data=next;saveLocal();render();$('#backupStatus').textContent='Backup restored. Enter password and publish.';
    }catch(error){$('#backupStatus').textContent=error.message;}
  });
  $('#connectionStatus').textContent=window.TPT_LIVE_PRODUCTS?'Live connection ready · enter password to save':'Preview mode · configure live API once';
  render();
})();
