(async () => {
  'use strict';
  await Promise.all([window.TPT_CATALOGUE_READY,window.TPT_PRODUCTS_READY]);
  const catalogue = window.CATALOGUE;
  const products = catalogue.products;
  for (const product of products) {
    if (!product.id?.startsWith('PACK-')) continue;
    const designs = (window.STICKER_CATALOGUE || []).filter(item => item.pack_id === product.id).map(item => item.image);
    product.images = [...new Set([product.images?.[0], ...designs, 'assets/stickers/quality-card.svg'].filter(Boolean))];
  }
  const byId = id => products.find(product => product.id === id);
  const money = value => value == null ? 'Quote after review' : `₹${Number(value).toLocaleString('en-IN')}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const priceMarkup = (price, product) => { const old = price === 99 && product?.id?.startsWith('PACK-') ? 299 : price === 1199 && product?.categories?.includes('Light Boxes') ? 2599 : Number.isFinite(price) ? price * 2 + 99 : null; return `${old ? `<del class="old-price" aria-label="Earlier price ${money(old)}">${money(old)}</del>` : ''}${money(price)}`; };
  const magnetDesign = card => { const select = card.querySelector('[data-magnet-design]'); return select ? select.options[select.selectedIndex]?.textContent || '' : ''; };
  const safeParse = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  let cart = safeParse('tpt-cart-v4', []);
  let favourites = new Set(safeParse('tpt-favourites-v4', []));
  let state = { category: 'All', query: '', fandom: '', sort: 'featured', savedOnly: false };
  let currentProduct = null;
  let selectedUpload = null;
  const $ = selector => document.querySelector(selector);
  const grid = $('#productGrid');
  const categoryHost = $('#categories');
  const dialog = $('#productDialog');
  const cartDialog = $('#cartDialog');

  function saveState() {
    localStorage.setItem('tpt-cart-v4', JSON.stringify(cart));
    localStorage.setItem('tpt-favourites-v4', JSON.stringify([...favourites]));
  }
  function toast(message) {
    const node = $('#toast'); node.textContent = message; node.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  function productCategory(product) {
    if (state.category === 'All') return product.categories[0];
    return product.categories.includes(state.category) ? state.category : product.categories[0];
  }
  function applicableVariants(product) {
    if (state.category === 'Sticker Packs') return product.variants.filter(v => !String(v.finish).startsWith('Holographic'));
    if (state.category === 'Holographic Packs') return product.variants.filter(v => String(v.finish).startsWith('Holographic'));
    return product.variants;
  }
  function filteredProducts() {
    let list = products.filter(product => {
      if (state.category !== 'All' && !product.categories.includes(state.category)) return false;
      if (state.fandom && product.theme !== state.fandom) return false;
      if (state.savedOnly && !favourites.has(product.id)) return false;
      const haystack = `${product.name} ${product.theme} ${product.categories.join(' ')} ${product.description}`.toLowerCase();
      return haystack.includes(state.query.toLowerCase());
    });
    if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === 'low') list.sort((a, b) => lowest(a) - lowest(b));
    if (state.sort === 'high') list.sort((a, b) => lowest(b) - lowest(a));
    return list;
  }
  function lowest(product) {
    const prices = applicableVariants(product).map(v => v.price).filter(Number.isFinite);
    return prices.length ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
  }
  function fastImage(image) {
    const optimised = {
      'assets/products/suncatcher-design-collection.png': 'assets/products/suncatcher-design-collection.webp',
      'assets/products/memoroids-display-mockup.png': 'assets/products/memoroids-display-mockup.webp',
      'assets/products/acrylic-magnetic-display-mockup.png': 'assets/products/acrylic-magnetic-display-mockup.webp',
      'assets/products/shadow-box-trio-concept.png': 'assets/products/shadow-box-trio-concept.webp'
    };
    return optimised[image] || image;
  }
  function imageMarkup(product, image, alt = product.name) {
    return image ? `<img src="${fastImage(image)}" alt="${alt}" loading="lazy" decoding="async" onerror="this.parentElement.innerHTML='<div class=&quot;unpictured&quot;><span>✦</span><small>Product image unavailable</small></div>'">` : '<div class="unpictured"><span>✦</span><small>Custom piece · image confirmed with your request</small></div>';
  }
  function optionMarkup(values, selected) {
    return values.map(value => `<option${value === selected ? ' selected' : ''}>${value}</option>`).join('');
  }
  function initialVariant(product) {
    return applicableVariants(product)[0] || product.variants[0];
  }
  function canBuyDirectly(product) {
    const buyable = ['Sticker Packs','Holographic Packs','Suncatcher Stickers','Memoroids','Light Boxes'];
    return product.status === 'order' && product.categories.some(category => buyable.includes(category));
  }
  function cardMarkup(product) {
    const variant = initialVariant(product);
    const variants = applicableVariants(product);
    const sizes = [...new Set(variants.map(v => v.size))];
    const finishes = [...new Set(variants.map(v => v.finish))];
    const category = productCategory(product);
    const image = variant?.image || product.images?.[0];
    const status = product.status === 'soon' ? 'COMING SOON' : product.status === 'enquire' ? 'PREVIEW · ENQUIRE' : category.toUpperCase();
    return `<article class="card ${category.includes('Holographic') ? 'holo-card' : ''}" data-id="${product.id}">
      <div class="card-photo"><button class="image-button" data-view="${product.id}" aria-label="View ${product.name}">${imageMarkup(product, image)}</button><span class="badge ${category.includes('Holographic') ? 'holo' : ''}">${status}</span><button class="save ${favourites.has(product.id) ? 'saved' : ''}" data-save="${product.id}" aria-label="${favourites.has(product.id) ? 'Remove from' : 'Save to'} favourites">${favourites.has(product.id) ? '♥' : '♡'}</button></div>
      <div class="card-info"><p class="eyebrow">${product.theme} / ${product.id}</p><h3><button data-view="${product.id}">${product.name}</button></h3><p class="brief">${product.description}</p>
      ${product.designNames ? `<div class="magnet-carousel-controls"><button type="button" data-magnet-prev>←</button><span data-magnet-index>1 / ${product.images.length}</span><button type="button" data-magnet-next>→</button></div><select class="magnet-design" data-magnet-design aria-label="Magnet design">${product.designNames.map((name,i)=>`<option value="${i}">${name}</option>`).join('')}</select>` : ''}<div class="variant-controls"><label>Size<select data-size>${optionMarkup(sizes, variant?.size)}</select></label><label>Finish<select data-finish>${optionMarkup(finishes, variant?.finish)}</select></label></div>
      <div class="card-bottom"><strong data-price>${priceMarkup(variant?.price, product)}</strong><span>${product.status === 'soon' ? '<button class="add" data-custom="' + product.id + '">Ask about launch</button>' : product.requiresSelection ? '<button class="add" data-view="' + product.id + '">Choose codes</button>' : !canBuyDirectly(product) || variant?.price == null ? '<button class="add" data-custom="' + product.id + '">' + (product.status === 'enquire' ? 'Enquire' : 'Request quote') + '</button>' : '<button class="add" data-add="' + product.id + '">Add to bag</button>'}</span></div><small>${product.unit}</small></div></article>`;
  }
  function renderProducts() {
    const list = filteredProducts(); grid.innerHTML = list.map(cardMarkup).join('');
    $('#resultCount').textContent = `${list.length} ${list.length === 1 ? 'piece' : 'pieces'}`;
    $('#empty').hidden = list.length !== 0;
    requestAnimationFrame(watchReveals);
  }
  function renderCategories() {
    categoryHost.innerHTML = catalogue.categories.map(category => `<button class="${category === state.category ? 'active' : ''}" data-category="${category}" aria-pressed="${category === state.category}">${category}${category === 'Shadow Boxes' ? ' · Soon' : ''}</button>`).join('');
  }
  function selectVariant(card, prefer = 'size') {
    const product = byId(card.dataset.id);
    const size = card.querySelector('[data-size]').value;
    let finish = card.querySelector('[data-finish]').value;
    let variant = product.variants.find(v => v.size === size && v.finish === finish);
    if (!variant) variant = prefer === 'finish' ? product.variants.find(v => v.finish === finish) : product.variants.find(v => v.size === size);
    variant ||= product.variants[0];
    card.querySelector('[data-size]').value = variant.size; card.querySelector('[data-finish]').value = variant.finish;
    card.querySelector('[data-price]').innerHTML = priceMarkup(variant.price, product); card.classList.toggle('holo-card', String(variant.finish).startsWith('Holographic'));
    const image = card.querySelector('.card-photo img'); if (image && variant.image && !product.designNames) image.src = fastImage(variant.image);
    return variant;
  }
  function addProduct(product, variant, quantity = 1, selection = '') {
    const key = `${product.id}|${variant.id}|${selection}`;
    const existing = cart.find(item => item.key === key && item.type === 'product');
    if (existing) existing.quantity += quantity;
    else cart.push({ type: 'product', key, productId: product.id, variantId: variant.id, quantity, selection });
    saveState(); updateCartCount(); toast(`${product.name} added to your bag`);
    window.TPTAnalytics?.track('add_to_cart', { productId: product.id, variantId: variant.id });
  }
  function routeCustom(product, design = '') {
    $('#customType').value = product.categories[0]; updateCustomSelectors();
    $('#customName').value = design ? `${product.name} · ${design}` : product.name; location.hash = 'custom'; toast('Tell us how you want this piece made');
  }
  grid.addEventListener('click', event => {
    const arrow = event.target.closest('[data-magnet-prev],[data-magnet-next]'); if (!arrow) return;
    const card = arrow.closest('.card'), product = byId(card.dataset.id), select = card.querySelector('[data-magnet-design]');
    select.selectedIndex = (select.selectedIndex + (arrow.hasAttribute('data-magnet-next') ? 1 : -1) + product.images.length) % product.images.length;
    select.dispatchEvent(new Event('change', {bubbles:true}));
  });
  grid.addEventListener('change', event => { const card = event.target.closest('.card'); if (card) { selectVariant(card, event.target.hasAttribute('data-finish') ? 'finish' : 'size'); if (card.querySelector('[data-magnet-design]')) { const index = Number(card.querySelector('[data-magnet-design]').value); card.querySelector('.card-photo img').src = fastImage(byId(card.dataset.id).images[index]); card.querySelector('[data-magnet-index]').textContent = `${index+1} / ${byId(card.dataset.id).images.length}`; } } });
  grid.addEventListener('click', event => {
    const save = event.target.closest('[data-save]'); if (save) { const id = save.dataset.save; const added = !favourites.has(id); added ? favourites.add(id) : favourites.delete(id); saveState(); renderProducts(); if (added) window.TPTAnalytics?.track('wishlist_added', { productId: id }); return; }
    const view = event.target.closest('[data-view]'); if (view) { const card = view.closest('.card'); openProduct(byId(view.dataset.view), card?.querySelector('[data-magnet-design]')?.selectedIndex || 0); return; }
    const card = event.target.closest('.card'); if (!card) return;
    const product = byId(card.dataset.id); const variant = selectVariant(card);
    if (event.target.closest('[data-add]')) addProduct(product, variant);
    if (event.target.closest('[data-custom]')) routeCustom(product, magnetDesign(card));
  });
  categoryHost.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; state.category = button.dataset.category; renderCategories(); renderProducts(); });
  document.addEventListener('click', event => {
    const categoryLink = event.target.closest('a[data-category]'); if (categoryLink) { state.category = categoryLink.dataset.category; renderCategories(); renderProducts(); }
    const customLink = event.target.closest('[data-custom-type]'); if (customLink) { $('#customType').value = customLink.dataset.customType; updateCustomSelectors(); }
    const close = event.target.closest('[data-close]'); if (close) document.getElementById(close.dataset.close).close();
  });
  $('#search').addEventListener('input', event => { state.query = event.target.value.trim(); renderProducts(); });
  $('#fandom').addEventListener('change', event => { state.fandom = event.target.value; renderProducts(); });
  $('#sort').addEventListener('change', event => { state.sort = event.target.value; renderProducts(); });
  $('#favFilter').addEventListener('click', event => { state.savedOnly = !state.savedOnly; event.currentTarget.setAttribute('aria-pressed', state.savedOnly); renderProducts(); });
  $('#clearFilters').addEventListener('click', () => { state = { category: 'All', query: '', fandom: '', sort: 'featured', savedOnly: false }; $('#search').value = ''; $('#fandom').value = ''; $('#sort').value = 'featured'; $('#favFilter').setAttribute('aria-pressed', 'false'); renderCategories(); renderProducts(); });

  function openProduct(product, designIndex = 0) {
    currentProduct = product; const variant = product.variants[0]; const images = product.images || [];
    const recent = safeParse('tpt-recent-v1', []).filter(id => id !== product.id); recent.unshift(product.id); localStorage.setItem('tpt-recent-v1', JSON.stringify(recent.slice(0, 8)));
    window.TPTAnalytics?.track('product_view', { productId: product.id });
    $('#productDetail').innerHTML = `<div class="detail-layout"><div class="detail-media">${imageMarkup(product, product.designNames ? images[designIndex] : variant.image || images[0])}<div class="thumbs">${images.map((image, index) => `<button data-thumb="${fastImage(image)}" aria-label="Show image ${index + 1}"><img src="${fastImage(image)}" alt="" loading="lazy" decoding="async"></button>`).join('')}${product.video ? `<button data-video="${product.video}">▶ Product video</button>` : ''}</div></div><div class="detail-info"><p class="eyebrow">${product.theme} / ${product.id}</p><h2>${product.name}</h2><p>${product.description}</p><div class="variant-controls"><label>Size<select id="detailSize">${optionMarkup([...new Set(product.variants.map(v => v.size))], variant.size)}</select></label><label>Finish<select id="detailFinish">${optionMarkup([...new Set(product.variants.map(v => v.finish))], variant.finish)}</select></label></div><div class="card-bottom"><strong id="detailPrice">${priceMarkup(variant.price, product)}</strong><span id="detailAction"></span></div>${product.contents ? `<h4>Inside this package</h4><p>${product.contents.join(' · ')}</p>` : ''}${product.requiresUpload ? `<h4>Your artwork</h4><label class="selection-field"><span>Paste a shareable Drive link to your original designs. Or <a href="#custom" onclick="document.getElementById('productDialog').close()">use the custom request form</a> to select a local file. Original artwork is shared separately.</span><input id="detailArtwork" type="url" placeholder="https://drive.google.com/..."></label>` : ''}${product.requiresSelection ? `<h4>Sticker codes</h4><label class="selection-field"><span>Choose from <a href="catalogue.html" target="_blank">the catalogue</a></span><textarea id="detailSelection" rows="3" placeholder="${product.selectionPrompt || 'Enter selected codes'}"></textarea></label>` : ''}${product.quality ? `<h4>Quality</h4><p>${product.quality}</p>` : ''}<h4>How to use or display</h4><p>${product.application}</p><h4>Care</h4><p>${product.care}</p><p class="fine">${product.unit} · Select your exact variant before adding.</p></div></div>`;
    function syncDetail(prefer = 'size') {
      const size = $('#detailSize').value, finish = $('#detailFinish').value;
      let selected = product.variants.find(v => v.size === size && v.finish === finish);
      if (!selected) selected = prefer === 'finish' ? product.variants.find(v => v.finish === finish) : product.variants.find(v => v.size === size);
      selected ||= product.variants[0];
      $('#detailSize').value = selected.size; $('#detailFinish').value = selected.finish; $('#detailPrice').innerHTML = priceMarkup(selected.price, product); dialog.querySelector('.detail-media')?.classList.toggle('holo-selected', String(selected.finish).startsWith('Holographic'));
      $('#detailAction').innerHTML = product.status === 'soon' ? '<button class="add" id="detailCustom">Ask about launch</button>' : !canBuyDirectly(product) || selected.price == null ? `<button class="add" id="detailCustom">${product.status === 'enquire' ? 'Enquire' : 'Request quote'}</button>` : '<span class="detail-purchase"><button class="add" id="detailBuy">Buy now</button><button class="add secondary-add" id="detailAdd">Add to bag</button></span>';
      const photo = dialog.querySelector('.detail-main'); if (photo && selected.image && !product.designNames) photo.src = fastImage(selected.image);
      const checkedSelection = () => {
        if (product.requiresUpload) { const link = $('#detailArtwork')?.value.trim(); if (!link || !/^https?:\/\//i.test(link)) { toast('Add a shareable artwork link, or use the custom request form'); return null; } return `Artwork: ${link}`; }
        if (!product.requiresSelection) return '';
        const codes = ($('#detailSelection')?.value || '').toUpperCase().split(/[\s,;]+/).filter(Boolean);
        const expected = Number(selected.size.match(/^\d+/)?.[0]);
        const known = new Set((window.STICKER_CATALOGUE || []).map(item => item.code));
        if (codes.length !== expected || new Set(codes).size !== codes.length || codes.some(code => !known.has(code))) {
          toast(`Choose ${expected} different valid catalogue codes`); return null;
        }
        return codes.join(', ');
      };
      $('#detailAdd')?.addEventListener('click', () => { const selection = checkedSelection(); if (selection === null) return; addProduct(product, selected, 1, selection); });
      $('#detailBuy')?.addEventListener('click', () => { const selection = checkedSelection(); if (selection === null) return; addProduct(product, selected, 1, selection); window.TPTAnalytics?.track('buy_now_clicked', { productId: product.id, variantId: selected.id }); dialog.close(); renderCart(); cartDialog.showModal(); });
      $('#detailCustom')?.addEventListener('click', () => { dialog.close(); routeCustom(product, product.designNames?.[designIndex] || ''); });
    }
    const main = dialog.querySelector('.detail-media>img'); if (main) main.classList.add('detail-main');
    dialog.querySelectorAll('[data-thumb]').forEach(button => button.addEventListener('click', () => { const media = dialog.querySelector('.detail-media'); media.querySelector('video')?.remove(); const image = media.querySelector('.detail-main') || document.createElement('img'); image.className = 'detail-main'; image.src = button.dataset.thumb; if (product.designNames) designIndex = images.findIndex(src => fastImage(src) === button.dataset.thumb); image.alt = product.name; media.prepend(image); }));
    $('#detailSize').addEventListener('change', () => syncDetail('size')); $('#detailFinish').addEventListener('change', () => syncDetail('finish')); syncDetail(); dialog.showModal();
  }

  function cartLine(item) {
    if (item.type === 'custom') return `<article class="cart-item"><div class="unpictured"><span>✦</span></div><div><h3>${item.name}</h3><p>Custom · ${item.productType} · ${item.size} · ${item.finish} · Qty ${item.quantity}</p><p>Quote after review${item.fileName ? ` · Local reference: ${item.fileName}` : ''}</p><div class="quantity"><button class="remove" data-remove="${item.key}">Remove</button></div></div></article>`;
    const product = byId(item.productId), variant = product?.variants.find(v => v.id === item.variantId); if (!product || !variant) return '';
    return `<article class="cart-item">${variant.image ? `<img src="${variant.image}" alt="">` : '<div class="unpictured"><span>✦</span></div>'}<div><h3>${product.name}</h3><p>${product.id} · ${variant.size} · ${variant.finish}</p>${item.selection ? `<p>Selected designs: ${escapeHtml(item.selection)}</p>` : ''}<p>${money(variant.price)} each · <b>${money(variant.price * item.quantity)}</b></p><div class="quantity"><button data-qty="${item.key}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-qty="${item.key}" data-delta="1" aria-label="Increase quantity">+</button><button class="remove" data-remove="${item.key}">Remove</button></div></div></article>`;
  }
  function renderCart() {
    $('#cartItems').innerHTML = cart.length ? cart.map(cartLine).join('') : '<div class="empty"><h3>Your bag is waiting.</h3><p>Add a product or custom request to begin.</p></div>';
    const subtotal = cart.reduce((sum, item) => { if (item.type !== 'product') return sum; const product = byId(item.productId), variant = product?.variants.find(v => v.id === item.variantId); return sum + (variant?.price || 0) * item.quantity; }, 0);
    const freeShipping = subtotal >= catalogue.freeShippingThreshold;
    $('#cartTotal').textContent = money(subtotal);
    $('#shippingStatus').textContent = freeShipping ? 'FREE' : 'Calculated at confirmation';
    $('#shippingNote').textContent = freeShipping ? `You unlocked free shipping on product subtotals of ₹${catalogue.freeShippingThreshold}.` : `Add ${money(catalogue.freeShippingThreshold - subtotal)} more for free shipping. Otherwise shipping is calculated from your PIN code at order confirmation.`;
    $('#payableRow').hidden = !freeShipping; $('#payableTotal').textContent = money(subtotal);
    $('#downloadPdf').disabled = cart.length === 0; $('#continueWa').setAttribute('aria-disabled', cart.length === 0); $('#continueWa').href = buildWhatsApp();
  }
  function updateCartCount() { $('#cartCount').textContent = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0); }
  $('#openCart').addEventListener('click', () => { renderCart(); cartDialog.showModal(); });
  $('#cartItems').addEventListener('click', event => {
    const remove = event.target.closest('[data-remove]'); if (remove) cart = cart.filter(item => item.key !== remove.dataset.remove);
    const qty = event.target.closest('[data-qty]'); if (qty) { const item = cart.find(entry => entry.key === qty.dataset.qty); item.quantity = Math.max(1, item.quantity + Number(qty.dataset.delta)); }
    saveState(); updateCartCount(); renderCart();
  });
  function buildWhatsApp() {
    const lines = [`Hi The Paper Theory! I'd like to enquire about this order:`];
    cart.forEach(item => {
      if (item.type === 'custom') lines.push(`• CUSTOM ${item.name} — ${item.productType}, ${item.size}, ${item.finish}, Qty ${item.quantity}${item.drive ? `\n  Drive: ${item.drive}` : ''}`);
      else { const product = byId(item.productId), variant = product?.variants.find(v => v.id === item.variantId); if (product && variant) lines.push(`• ${product.name} (${product.id}) — ${variant.size}, ${variant.finish}, Qty ${item.quantity}, ${money(variant.price * item.quantity)}${item.selection ? `\n  Selected designs: ${item.selection}` : ''}`); }
    });
    const subtotal = cart.reduce((sum, item) => { if (item.type !== 'product') return sum; const product = byId(item.productId), variant = product?.variants.find(v => v.id === item.variantId); return sum + (variant?.price || 0) * item.quantity; }, 0);
    const customer = collectCustomer();
    const address = [customer.house, customer.street, customer.landmark, customer.city, customer.state, customer.pin, customer.country].filter(Boolean).join(', ');
    if (customer.name || address) lines.push('', `Delivery: ${customer.name || ''}${customer.phone ? ` · ${customer.phone}` : ''}`, address);
    lines.push('', subtotal >= catalogue.freeShippingThreshold ? `Free shipping applies: product subtotal is ${money(subtotal)}.` : 'Shipping will be calculated at order confirmation using my delivery PIN code.', 'Custom work is confirmed separately. I will send the order PDF and original reference files here.');
    return `https://wa.me/${catalogue.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  const customTypes = ['Matte Stickers','Glossy / Regular Stickers','Holographic Stickers','Suncatcher Stickers','Memoroids','Polaroids','Fridge Magnets','Acrylic Posters','Light Boxes','Shadow Boxes','Custom Packages / Bundles','Customer artwork sticker sheet'];
  $('#customType').innerHTML = customTypes.map(type => `<option>${type}</option>`).join('');
  function updateCustomSelectors() {
    const type = $('#customType').value; let sizes = ['1 inch','2 inches','3 inches','4 inches'], finishes = ['Matte'];
    if (type === 'Glossy / Regular Stickers') finishes = ['Glossy / Regular'];
    if (type === 'Holographic Stickers') { sizes = ['2 inches','4 inches']; finishes = ['Holographic']; }
    if (type === 'Suncatcher Stickers') { sizes = ['3 inches','4 inches','5 inches','4-piece shape pack']; finishes = ['Circular design','Heart','Cloud','Diamond','Star','Mixed shapes']; }
    if (type === 'Customer artwork sticker sheet') { sizes = ['16 stickers · 4 × 4 · 1 inch sheet','12 stickers · 3 × 4 · 2 inches sheet','6 stickers · 2 × 3 · 3 inches sheet']; finishes = ['Regular laminated · supplied artwork']; }
    if (type === 'Fridge Magnets') { sizes = ['3 × 4 inches','4 × 5 inches']; finishes = ['Plain','Bubble']; }
    if (type === 'Acrylic Posters') { sizes = ['A4 · 210 × 297 mm']; finishes = ['Acrylic']; }
    if (type === 'Light Boxes') { sizes = ['A4 · 210 × 297 mm']; finishes = ['Eren · Colour-changing','Goku · Colour-changing','Luffy · Colour-changing']; }
    if (['Memoroids','Polaroids'].includes(type)) { sizes = ['Pack of 6','Pack of 12']; finishes = ['Photo prints']; }
    if (type === 'Shadow Boxes') { sizes = ['10 × 4 inches','8 × 8 inches','10 × 8 inches']; finishes = ['Layered shadow box · coming soon']; }
    if (type === 'Custom Packages / Bundles') { sizes = ['To discuss']; finishes = ['To discuss']; }
    $('#customSize').innerHTML = sizes.map(size => `<option>${size}</option>`).join(''); $('#customFinish').innerHTML = finishes.map(finish => `<option>${finish}</option>`).join('');
  }
  $('#customType').addEventListener('change', updateCustomSelectors); updateCustomSelectors();
  $('#customFile').addEventListener('change', async event => {
    const file = event.target.files[0]; selectedUpload = null; $('#uploadPreview').hidden = true;
    if (!file) return; if (file.size > 10 * 1024 * 1024) { event.target.value = ''; $('#uploadStatus').textContent = 'Choose a file smaller than 10 MB.'; return; }
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    selectedUpload = { name: file.name, type: file.type, data: file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024 ? data : null };
    $('#uploadName').textContent = `${file.name} · local preview only`; $('#uploadImage').hidden = !selectedUpload.data; if (selectedUpload.data) $('#uploadImage').src = selectedUpload.data; $('#uploadPreview').hidden = false; $('#uploadStatus').textContent = 'Reference selected locally. Share the original through Drive or WhatsApp.';
  });
  $('#removeUpload').addEventListener('click', () => { selectedUpload = null; $('#customFile').value = ''; $('#uploadPreview').hidden = true; $('#uploadStatus').textContent = 'Reference removed.'; });
  $('#customForm').addEventListener('submit', event => {
    event.preventDefault(); const drive = $('#customDrive').value.trim();
    if (!drive && !selectedUpload) { $('#uploadStatus').textContent = 'Add a Drive link or choose a reference file.'; return; }
    if ($('#customType').value === 'Customer artwork sticker sheet') { const product = byId('PACK-UPLOAD'); const variant = product.variants.find(v => v.size === $('#customSize').value); addProduct(product, variant, Number($('#customQty').value), drive ? `Artwork: ${drive}` : `Original artwork to share: ${selectedUpload.name}`); }
    else cart.push({ type: 'custom', key: `custom-${Date.now()}`, productType: $('#customType').value, size: $('#customSize').value, finish: $('#customFinish').value, name: $('#customName').value.trim(), quantity: Number($('#customQty').value), drive, notes: $('#customNotes').value.trim(), fileName: selectedUpload?.name || '', preview: selectedUpload?.data || null });
    saveState(); updateCartCount(); event.target.reset(); selectedUpload = null; $('#uploadPreview').hidden = true; updateCustomSelectors(); $('#uploadStatus').textContent = 'Custom request added to your bag. Original files still need to be shared through Drive or WhatsApp.'; toast('Custom request added to your bag');
  });
  function collectCustomer() {
    return {
      name: $('#customerName').value.trim(), phone: $('#customerPhone').value.trim(), email: $('#customerEmail').value.trim(),
      house: $('#customerHouse').value.trim(), street: $('#customerStreet').value.trim(), landmark: $('#customerLandmark').value.trim(),
      city: $('#customerCity').value.trim(), state: $('#customerState').value.trim(), pin: $('#customerPin').value.trim(), country: $('#customerCountry').value.trim()
    };
  }
  function validateCustomer(customer) {
    const required = ['name','phone','house','street','city','state','pin','country'];
    const missing = required.filter(key => !customer[key]);
    if (missing.length) return 'Please complete every required delivery-address field before downloading the PDF.';
    if (!/^\d{6}$/.test(customer.pin)) return 'Please enter a valid 6-digit Indian PIN code.';
    return '';
  }
  $('#downloadPdf').addEventListener('click', async event => {
    const customer = collectCustomer(), addressError = validateCustomer(customer); $('#addressError').textContent = addressError;
    if (addressError) { toast(addressError); return; }
    const button = event.currentTarget, label = button.textContent; button.disabled = true; button.textContent = 'Creating PDF…';
    try { window.TPTAnalytics?.track('checkout_started', { itemCount: cart.length }); await window.createOrderPdf(cart, products, customer); toast('Order PDF downloaded'); }
    catch (error) { console.error(error); toast('PDF could not be created. Please try again.'); }
    finally { button.disabled = false; button.textContent = label; }
  });
  $('#continueWa').addEventListener('click', event => { if (!cart.length) { event.preventDefault(); toast('Your bag is empty'); } });

  const heroSlides = [
    { image:'assets/lightbox/lightbox-eren-on.webp', label:'FLAGSHIP · A4 · ₹1,199', title:'Eren Light Box.', link:'#lightboxExperience', text:'Experience Eren ↗', design:'eren' },
    { image:'assets/lightbox/lightbox-goku-on.webp', label:'FLAGSHIP · REMOTE INCLUDED', title:'Goku Light Box.', link:'#lightboxExperience', text:'Experience Goku ↗', design:'goku' },
    { image:'assets/lightbox/lightbox-luffy-on.webp', label:'FLAGSHIP · COLOUR-CHANGING', title:'Luffy Light Box.', link:'#lightboxExperience', text:'Experience Luffy ↗', design:'luffy' },
    { image:'assets/products/suncatcher-design-collection.webp', label:'SUNLIGHT, REIMAGINED', title:'A little window magic.', link:'#shop', text:'Explore suncatchers ↗', category:'Suncatcher Stickers' },
    { image:'assets/sticker-packs/anime-heroes.webp', label:'12–16 STICKERS · FROM ₹99', title:'Sticker packs, not clutter.', link:'#stickerPacks', text:'Explore sticker packs ↗' },
    { image:'assets/products/joey-how-you-doin.jpg', label:'FAVOURITE MOMENTS, FRAMED', title:'Your fridge, but happier.', link:'#shop', text:'Shop photo magnets ↗', category:'Fridge Magnets' },
    { image:'assets/products/acrylic-magnetic-display-mockup.webp', label:'A4 / MAGNETIC / ₹399', title:'Art that takes up space.', link:'#shop', text:'See acrylic displays ↗', category:'Acrylic Posters' }
  ]; let heroIndex = 0, heroPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function renderHero() { const slide = heroSlides[heroIndex], photo = $('#heroPhoto'), link = $('#heroLink'); photo.classList.remove('swap'); void photo.offsetWidth; photo.src = slide.image; photo.classList.add('swap'); photo.alt = slide.title; $('#heroLabel').textContent = slide.label; $('#heroTitle').textContent = slide.title; link.textContent = slide.text; link.href = slide.link; if (slide.category) link.dataset.category = slide.category; else delete link.dataset.category; if (slide.design) link.dataset.heroDesign = slide.design; else delete link.dataset.heroDesign; $('#heroIndex').textContent = `${String(heroIndex + 1).padStart(2,'0')} / ${String(heroSlides.length).padStart(2,'0')}`; $('#heroPause').textContent = heroPaused ? '▶' : 'Ⅱ'; $('#heroPause').setAttribute('aria-label', heroPaused ? 'Play carousel' : 'Pause carousel'); }
  function moveHero(delta) { heroIndex = (heroIndex + delta + heroSlides.length) % heroSlides.length; renderHero(); }
  $('#heroPrev').addEventListener('click', () => moveHero(-1)); $('#heroNext').addEventListener('click', () => moveHero(1)); $('#heroPause').addEventListener('click', () => { heroPaused = !heroPaused; renderHero(); }); setInterval(() => { if (!heroPaused) moveHero(1); }, 5500);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function createFallingMagic() {
    if (reduceMotion) return;
    const layer = document.createElement('div'); layer.className = 'falling-layer'; layer.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 28; index += 1) {
      const petal = document.createElement('span');
      petal.className = `falling-petal petal-tone-${index % 4}`;
      const drift = -45 + (index % 8) * 13, sway = 18 + (index % 6) * 8, size = 9 + (index % 5) * 3;
      petal.style.cssText = `--x:${(index * 37) % 101}%;--delay:${-(index * .79).toFixed(2)}s;--duration:${(11 + (index % 8) * 1.2).toFixed(2)}s;--size:${size}px;--petal-h:${Math.round(size * .72)}px;--drift:${drift}px;--drift-end:${Math.round(drift * -.45)}px;--sway:${sway}px;--sway-back:${Math.round(sway * -.7)}px;--spin:${220 + (index % 5) * 55}deg`;
      layer.appendChild(petal);
    }
    document.body.prepend(layer);
  }
  const revealObserver = !reduceMotion && matchMedia('(min-width: 701px)').matches && 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } }), { threshold: .04, rootMargin: '0px 0px 80px' }) : null;
  function watchReveals() { document.querySelectorAll('.section, .card').forEach((element, index) => { if (element.classList.contains('is-visible')) return; element.classList.add('reveal'); element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 65}ms`); if (revealObserver) revealObserver.observe(element); else element.classList.add('is-visible'); }); }
  if (!reduceMotion && matchMedia('(hover:hover)').matches) {
    const showcase = $('.hero-showcase'); document.querySelector('.hero').addEventListener('pointermove', event => { const bounds = event.currentTarget.getBoundingClientRect(), x = (event.clientX - bounds.left) / bounds.width - .5, y = (event.clientY - bounds.top) / bounds.height - .5; showcase.style.setProperty('--tilt-x', `${y * -2.2}deg`); showcase.style.setProperty('--tilt-y', `${x * 2.2}deg`); });
    document.querySelector('.hero').addEventListener('pointerleave', () => { showcase.style.setProperty('--tilt-x', '0deg'); showcase.style.setProperty('--tilt-y', '0deg'); });
  }
  const themes = [...new Set(products.map(product => product.theme))].sort(); $('#fandom').insertAdjacentHTML('beforeend', themes.map(theme => `<option>${theme}</option>`).join(''));
  window.TPTStore = { addProduct, byId, openCart: () => { renderCart(); cartDialog.showModal(); }, toast, renderProducts, setCategory: category => { state.category = category; renderCategories(); renderProducts(); location.hash = 'shop'; } };
  createFallingMagic(); renderCategories(); renderProducts(); updateCartCount(); renderHero(); watchReveals();
  const sheetsParam = new URLSearchParams(location.search).get('stickerSheets');
  if (sheetsParam) {
    try {
      const sheets = JSON.parse(sheetsParam), known = new Set((window.STICKER_CATALOGUE || []).map(item => item.code)), product = byId('PACK-CUSTOM');
      if (!Array.isArray(sheets) || !sheets.length || sheets.length > 100 || !sheets.every(sheet => [6,12,16].includes(sheet.codes?.length) && ['regular','holo'].includes(sheet.finish) && new Set(sheet.codes).size === sheet.codes.length && sheet.codes.every(code => known.has(code)))) throw Error('Invalid sheet selection');
      sheets.forEach(sheet => { const variant = product.variants.find(v => v.id === `${sheet.finish === 'holo' ? 'HOLO' : 'REG'}-${sheet.codes.length}`); addProduct(product, variant, 1, sheet.codes.join(', ')); });
      renderCart(); cartDialog.showModal();
    } catch (error) { toast('Could not add those sheets. Please choose designs again.'); }
    history.replaceState(null, '', location.pathname + location.hash);
  }
  if (new URLSearchParams(location.search).has('uploadSheet')) { $('#customType').value = 'Customer artwork sticker sheet'; updateCustomSelectors(); history.replaceState(null, '', location.pathname + location.hash); }
  const chosenCodes = new URLSearchParams(location.search).get('stickerCodes');
  if (chosenCodes) {
    const codes = chosenCodes.toUpperCase().split(',').map(code => code.trim()).filter(Boolean);
    const known = new Set((window.STICKER_CATALOGUE || []).map(item => item.code));
    if ([6, 12, 16].includes(codes.length) && new Set(codes).size === codes.length && codes.every(code => known.has(code))) {
      openProduct(byId('PACK-CUSTOM'));
      $('#detailSize').value = byId('PACK-CUSTOM').variants.find(v => v.id === `REG-${codes.length}`)?.size;
      $('#detailSize').dispatchEvent(new Event('change'));
      $('#detailSelection').value = codes.join(', ');
    }
    history.replaceState(null, '', location.pathname + location.hash);
  }
})();
