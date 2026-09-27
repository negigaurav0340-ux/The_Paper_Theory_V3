(async () => {
  'use strict';
  await Promise.all([window.TPT_CATALOGUE_READY, window.TPT_PRODUCTS_READY]);
  const packs = window.STICKER_PACKS || [];
  const catalogue = window.STICKER_CATALOGUE || [];
  const quality = 'assets/stickers/quality-card.svg';
  const track = document.getElementById('stickerPackTrack');
  const designs = document.getElementById('allStickerTrack');
  if (!track || !packs.length) return;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const product = id => window.CATALOGUE.products.find(item => item.id === id);
  const price = (id, finish, fallback) => product(id)?.variants.find(v => v.finish.toLowerCase().includes(finish) && Number.isInteger(v.price))?.price ?? fallback;
  const money = value => `₹${value.toLocaleString('en-IN')}`;
  const regular = price('PACK-ANIME-01','regular',99), holo = price('PACK-ANIME-01','holographic',199);
  const custom = price('PACK-CUSTOM','regular',129), customHolo = price('PACK-CUSTOM','holographic',229), upload = price('PACK-UPLOAD','regular',199);
  document.querySelectorAll('.price-rule').forEach((rule,i) => { const amount=[regular,holo,custom,customHolo,upload][i]; if(rule.querySelector('b')) rule.querySelector('b').textContent=money(amount); });
  const packIntro=document.querySelector('.sticker-pack-head > div > p:last-child');
  if(packIntro) packIntro.textContent=`Ready-made regular sheets from ${money(regular)}; holographic from ${money(holo)}. Mix your own catalogue codes from ${money(custom)} regular or ${money(customHolo)} holographic, or supply your artwork from ${money(upload)} per sheet. Select 4 × 4 one-inch, 3 × 4 two-inch, or 2 × 3 three-inch designs.`;
  const galleries = new Map(packs.map(p => [p.id, [
    {image:product(p.id)?.images?.[0] || `assets/lifestyle/${p.slug}.webp`, label:'Laptop preview · illustrative placement'},
    {image:p.image, label:`${p.name} · full sticker sheet`},
    ...catalogue.filter(item => item.pack_id === p.id).map(item => ({image:item.image,label:`${item.code} · ${item.name || p.name}`})),
    {image:quality,label:'Laminated · tear proof · waterproof · scratch proof'}
  ]]));
  const renderFrame = (visual, index) => {
    const frames = galleries.get(visual.dataset.packCarousel);
    const next = (index + frames.length) % frames.length;
    const frame = frames[next];
    visual.dataset.index = next;
    visual.querySelector('img').src = frame.image;
    visual.querySelector('img').alt = frame.label;
    visual.querySelector('.visual-note').textContent = frame.label;
    visual.querySelector('.pack-count').textContent = `${next + 1} / ${frames.length}`;
  };
  track.innerHTML = packs.map((p,i) => `<article class="pack-slide" data-pack="${safe(p.id)}">
    <div class="pack-visual" data-pack-carousel="${safe(p.id)}" data-index="0">
      <img src="${safe(product(p.id)?.images?.[0] || `assets/lifestyle/${p.slug}.webp`)}" alt="Illustrative sticker placement on a laptop for ${safe(p.name)}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">
      <small class="visual-note">Laptop preview · illustrative placement</small>
      <div class="pack-image-controls"><button type="button" data-frame="-1" aria-label="Previous design in ${safe(p.name)}">←</button><span class="pack-count">1 / ${galleries.get(p.id).length}</span><button type="button" data-frame="1" aria-label="Next design in ${safe(p.name)}">→</button></div>
    </div>
    <div class="pack-copy"><p class="eyebrow">${safe(p.theme)} / ${safe(p.codes)}</p><h3>${safe(p.name)}</h3>
      <p>${p.count} stickers · ${safe(p.layout)} sheet · use arrows to see each design</p>
      <div class="pack-prices"><div class="pack-price-item"><del>₹299</del><b>${money(price(p.id,'regular',99))}</b><span>Regular</span></div><div class="pack-price-item"><i>${money(price(p.id,'holographic',199))}</i><span>Holographic · +${money(price(p.id,'holographic',199)-price(p.id,'regular',99))}</span></div></div><label class="pack-finish">Finish <select aria-label="Choose sticker finish"><option value="regular">Regular</option><option value="holo">Holographic</option></select></label>
      <div class="pack-actions"><button type="button" data-open-pack="${safe(p.id)}">Choose pack</button><a href="catalogue.html#${safe(p.slug)}">See sticker codes</a><button class="share-pack" type="button" data-share-pack="${safe(p.id)}">Share pack ↗</button></div>
    </div></article>`).join('');
  track.addEventListener('click', event => {
    const frameButton = event.target.closest('[data-frame]');
    if (frameButton) {
      const visual = frameButton.closest('[data-pack-carousel]');
      renderFrame(visual, Number(visual.dataset.index) + Number(frameButton.dataset.frame));
      return;
    }
    const open = event.target.closest('[data-open-pack]');
    if (open) {
      const p = window.TPTStore?.byId(open.dataset.openPack);
      if (!p) return;
      document.querySelector(`[data-id="${p.id}"] [data-view]`)?.click();
      if (open.closest('.pack-slide').querySelector('select').value === 'holo') {
        const finish = document.getElementById('detailFinish');
        if (finish) { finish.value = 'Holographic'; finish.dispatchEvent(new Event('change')); }
      }
    }
    const share = event.target.closest('[data-share-pack]');
    if (share) {
      const pack = packs.find(item => item.id === share.dataset.sharePack);
      if (!pack) return;
      const data = {title:`${pack.name} | The Paper Theory`,text:`${pack.name}: laminated sticker sheet ${money(price(pack.id,'regular',99))} regular, ${money(price(pack.id,'holographic',199))} holographic. Browse the designs.`,url:new URL(`catalogue.html#${pack.slug}`,location.href).href};
      (async () => {try {if(navigator.share) await navigator.share(data);else {await navigator.clipboard.writeText(data.url);share.textContent='Link copied ✓';setTimeout(()=>share.textContent='Share pack ↗',2500);}} catch {}})();
    }
  });
  track.addEventListener('change', event => {
    if (event.target.matches('.pack-finish select')) event.target.closest('.pack-slide').querySelector('.pack-visual').classList.toggle('holo-selected', event.target.value === 'holo');
  });
  document.getElementById('packPrev')?.addEventListener('click', () => track.scrollBy({left:-Math.min(track.clientWidth * .85,520),behavior:'smooth'}));
  document.getElementById('packNext')?.addEventListener('click', () => track.scrollBy({left:Math.min(track.clientWidth * .85,520),behavior:'smooth'}));
  const sheets=document.getElementById('allSheetTrack');
  if(sheets){
    sheets.innerHTML=packs.map(p=>`<a class="design-slide sheet-slide" href="catalogue.html#${safe(p.slug)}" aria-label="Choose designs from ${safe(p.name)}"><img src="${safe(p.image)}" alt="Complete ${safe(p.name)} sheet with ${p.count} stickers" loading="lazy" decoding="async"><b>${safe(p.name)}</b><small>${p.count} complete sticker designs · ${safe(p.layout)} grid</small></a>`).join('');
    document.getElementById('sheetPrev')?.addEventListener('click',()=>sheets.scrollBy({left:-Math.min(sheets.clientWidth*.85,650),behavior:'smooth'}));
    document.getElementById('sheetNext')?.addEventListener('click',()=>sheets.scrollBy({left:Math.min(sheets.clientWidth*.85,650),behavior:'smooth'}));
  }
  if (designs) {
    designs.innerHTML = catalogue.map(item => `<a class="design-slide" href="catalogue.html#${safe(packs.find(p => p.id === item.pack_id)?.slug || 'PACK-NEW-ORIGINALS')}" aria-label="Browse ${safe(item.code)} in the catalogue"><img src="${safe(item.image)}" alt="${safe(item.name || item.category)} sticker design" loading="lazy" decoding="async"><b>${safe(item.code)}</b><small>${safe(item.name || item.category)}</small></a>`).join('') + `<div class="design-slide quality-slide"><img src="${quality}" alt="Laminated, tear proof, waterproof and scratch proof stickers" loading="lazy"><b>Made to stick</b><small>Quality in every pack</small></div>`;
    document.getElementById('designPrev')?.addEventListener('click', () => designs.scrollBy({left:-Math.min(designs.clientWidth * .8,620),behavior:'smooth'}));
    document.getElementById('designNext')?.addEventListener('click', () => designs.scrollBy({left:Math.min(designs.clientWidth * .8,620),behavior:'smooth'}));
  }
})();
