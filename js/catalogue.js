(async () => {
  'use strict';
  await Promise.all([window.TPT_CATALOGUE_READY, window.TPT_PRODUCTS_READY]);
  const packs = window.STICKER_PACKS || [], catalogue = window.STICKER_CATALOGUE || [];
  const main = document.getElementById('catalogueRoot'), filters = document.getElementById('catalogueFilters');
  const valid = new Set(catalogue.map(item => item.code)), storageKey = 'tpt-selected-sticker-codes';
  let remembered = []; try { remembered = JSON.parse(localStorage.getItem(storageKey)) || []; } catch {}
  const selected = new Set(remembered.filter(code => valid.has(code)));
  const layout = document.getElementById('sheetLayout'), finish = document.getElementById('sheetFinish');
  const search = document.getElementById('catalogueSearch'), resultCount = document.getElementById('catalogueResultCount');
  const safe = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const mixed = window.CATALOGUE.products.find(item => item.id === 'PACK-CUSTOM');
  const sheetPrice = (size, finish) => mixed?.variants.find(v => v.id === `${finish === 'holo' ? 'HOLO' : 'REG'}-${size}`)?.price ?? (finish === 'holo' ? 229 : 129);
  const format = value => `₹${value.toLocaleString('en-IN')}`;
  const ready=window.CATALOGUE.products.find(item=>item.id==='PACK-ANIME-01');
  const readyPrice=finish=>ready?.variants.find(v=>v.finish.toLowerCase().includes(finish))?.price ?? (finish==='regular'?99:199);
  const artwork=window.CATALOGUE.products.find(item=>item.id==='PACK-UPLOAD')?.variants[0]?.price ?? 199;
  const intro=document.querySelector('.intro > div > p:last-child');
  if(intro)intro.textContent=`Add any number of designs below. Then choose a 4 × 4 sheet of 1-inch stickers (16), a 3 × 4 sheet of 2-inch stickers (12), or a 2 × 3 sheet of 3-inch stickers (6). Each sheet costs the same within its finish: ready-made regular ${format(readyPrice('regular'))}, ready-made holographic ${format(readyPrice('holographic'))}; catalogue selections from ${format(sheetPrice(16,'regular'))} regular. Your own artwork is from ${format(artwork)} per sheet.`;
  const preset=document.querySelector('.pricebox p');if(preset)preset.textContent=`Preset sheets · from ${format(readyPrice('regular'))} regular`;
  const ownArt=document.querySelector('.sheet-config > a');if(ownArt)ownArt.textContent=`Using your own artwork? From ${format(artwork)} per sheet ↗`;
  finish.querySelector('[value="regular"]').textContent=`Regular laminated · ${format(sheetPrice(16,'regular'))} mixed sheet`;
  finish.querySelector('[value="holo"]').textContent=`Holographic · ${format(sheetPrice(16,'holo'))} mixed sheet`;
  const groups = [...new Set(catalogue.map(item => item.category))];
  let currentFilter = 'All', expanded = false;
  filters.innerHTML = ['All', ...groups].map((name,index) => `<button class="${index ? '' : 'active'}" data-filter="${safe(name)}" aria-pressed="${!index}">${safe(name)}</button>`).join('');
  function updateSelection() {
    const capacity = Number(layout.value), count = selected.size, sheets = Math.floor(count / capacity), remaining = count % capacity;
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('selectionHint').textContent = sheets ? `${sheets} complete sheet${sheets === 1 ? '' : 's'}${remaining ? ` · ${remaining} designs remain for another sheet` : ''}` : `Add ${capacity - count} more design${capacity - count === 1 ? '' : 's'} for this sheet`;
    document.getElementById('sheetSummary').textContent = `${capacity} per sheet · ${format(sheetPrice(capacity,finish.value))} ${finish.value === 'holo' ? 'holographic' : 'regular'} when picked from the catalogue. ${count} selected; ${sheets} complete sheet${sheets === 1 ? '' : 's'}.`;
    document.getElementById('shopSelection').disabled = count < capacity;
    document.body.classList.toggle('holo-selected', finish.value === 'holo');
    localStorage.setItem(storageKey, JSON.stringify([...selected]));
  }
  function render() {
    const query = search.value.trim().toLowerCase();
    const items = catalogue.filter(item => (currentFilter === 'All' || item.category === currentFilter) && (!query || `${item.code} ${item.name || ''} ${item.category} ${item.pack}`.toLowerCase().includes(query)));
    resultCount.textContent = `${items.length} design${items.length === 1 ? '' : 's'} found`;
    main.innerHTML = items.length ? [...new Set(items.map(item => item.pack_id))].map(id => {
      const stickers = items.filter(item => item.pack_id === id), pack = packs.find(item => item.id === id);
      return `<details class="pack-section" id="${safe(pack?.slug || id)}" ${expanded || query || currentFilter !== 'All' || location.hash.slice(1) === (pack?.slug || id) ? 'open' : ''}><summary class="pack-head"><div><p>${safe(pack?.theme || stickers[0].category)}</p><h2>${safe(pack?.name || stickers[0].pack)}</h2></div><div><b>${stickers.length} designs ↘</b><p>${safe(pack?.codes || '')}</p></div></summary><div class="grid">${stickers.map(item => `<label class="sticker"><input type="checkbox" value="${safe(item.code)}" aria-label="Select ${safe(item.code)}" ${selected.has(item.code) ? 'checked' : ''}><img src="${safe(item.image)}" alt="${safe(item.name || item.code)}" loading="lazy" decoding="async"><span class="code">${safe(item.code)}<small>${safe(item.name || item.category)}</small></span></label>`).join('')}</div></details>`;
    }).join('') : '<p class="catalogue-empty">No designs match. Try another name or category.</p>';
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }
  filters.addEventListener('click', event => { const button = event.target.closest('button[data-filter]'); if (!button) return; currentFilter = button.dataset.filter; filters.querySelectorAll('button').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); }); render(); });
  search.addEventListener('input', render);
  document.getElementById('togglePacks').addEventListener('click', event => { expanded = !expanded; event.target.textContent = expanded ? 'Collapse all packs' : 'Expand all packs'; main.querySelectorAll('details').forEach(details => { details.open = expanded; }); });
  main.addEventListener('change', event => { const box = event.target.closest('input[type="checkbox"]'); if (!box) return; box.checked ? selected.add(box.value) : selected.delete(box.value); updateSelection(); });
  layout.addEventListener('change', () => { finish.querySelector('[value="regular"]').textContent=`Regular laminated · ${format(sheetPrice(Number(layout.value),'regular'))} mixed sheet`; finish.querySelector('[value="holo"]').textContent=`Holographic · ${format(sheetPrice(Number(layout.value),'holo'))} mixed sheet`; updateSelection(); }); finish.addEventListener('change', updateSelection);
  document.getElementById('clearCodes').addEventListener('click', () => { selected.clear(); main.querySelectorAll('input:checked').forEach(box => { box.checked = false; }); updateSelection(); });
  document.getElementById('shopSelection').addEventListener('click', () => {
    const codes = [...selected], capacity = Number(layout.value), sheetCount = Math.floor(codes.length / capacity);
    if (!sheetCount) return;
    const sheets = Array.from({length:sheetCount}, (_,i) => ({codes:codes.slice(i*capacity,(i+1)*capacity),finish:finish.value}));
    localStorage.setItem(storageKey, JSON.stringify(codes.slice(sheetCount*capacity)));
    location.href = `index.html?stickerSheets=${encodeURIComponent(JSON.stringify(sheets))}#shop`;
  });
  document.getElementById('copyCodes').addEventListener('click', async () => { if (!selected.size) return; const codes = [...selected].join(', '); try { await navigator.clipboard.writeText(codes); document.getElementById('selectionHint').textContent = 'Codes copied'; } catch { window.prompt('Copy your sticker codes:', codes); } });
  document.getElementById('printCatalogue').addEventListener('click', () => window.print());
  render(); updateSelection();
})();
