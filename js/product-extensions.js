window.TPT_PRODUCTS_READY = (async () => {
  'use strict';
  const base = window.CATALOGUE?.products || [];
  window.TPT_BASE_PRODUCTS = structuredClone(base);
  const published = window.TPT_PRODUCT_UPDATES || {upserts:[],hiddenIds:[]};
  let local = {upserts:[],hiddenIds:[]};
  try { local = JSON.parse(localStorage.getItem('tpt-product-draft-v1')) || local; } catch {}
  let live = null;
  if (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    try {
      const response = await fetch('/api/products', {cache:'no-store'});
      if (response.ok) live = (await response.json()).data;
    } catch {}
  }
  window.TPT_LIVE_PRODUCTS = Boolean(live);
  window.TPT_PUBLISHED_PRODUCTS = live || published;
  const updates = live || {
    upserts:[...(published.upserts || []),...(local.upserts || [])],
    hiddenIds:[...(published.hiddenIds || []),...(local.hiddenIds || [])]
  };
  const overrides = new Map((updates.upserts || []).map(item => [item.id,item]));
  const hidden = new Set(updates.hiddenIds || []);
  const merged = [
    ...base.map(item => overrides.has(item.id) ? {...item,...overrides.get(item.id)} : item),
    ...[...overrides.values()].filter(item => !base.some(original => original.id === item.id))
  ];
  window.CATALOGUE.products = merged.filter(item => !hidden.has(item.id));
  return updates;
})();
