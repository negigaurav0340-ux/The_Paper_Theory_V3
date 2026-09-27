window.TPT_CATALOGUE_READY = (async () => {
  'use strict';
  const published = window.TPT_CATALOGUE_UPDATES || {stickers:[],reels:[]};
  window.TPT_BASE_CATALOGUE = [...(window.STICKER_CATALOGUE || [])];
  let local = {stickers:[],reels:[]};
  try { local = JSON.parse(localStorage.getItem('tpt-owner-catalogue-v1')) || local; } catch {}
  let live = null;
  if (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    try { const response = await fetch('/api/catalogue', {cache:'no-store'}); if (response.ok) live = (await response.json()).data; } catch {}
  }
  window.TPT_LIVE_CATALOGUE = Boolean(live);
  window.TPT_PUBLISHED_UPDATES = live || published;
  const updates = live || {...published,stickers:[...(published.stickers||[]),...(local.stickers||[])],reels:[...(published.reels||[]),...(local.reels||[])],hiddenCodes:[...(published.hiddenCodes||[]),...(local.hiddenCodes||[])]};
  const merged = new Map();
  for (const item of updates.stickers || []) {
    if (!/^[A-Z0-9-]{3,24}$/.test(item.code || '') || typeof item.image !== 'string') continue;
    merged.set(item.code, {code:item.code,category:String(item.category || 'New'),pack:String(item.pack || 'New Arrivals'),pack_id:'PACK-OWNER',image:item.image,name:String(item.name || item.code)});
  }
  const base = window.TPT_BASE_CATALOGUE;
  const hidden = new Set(updates.hiddenCodes || []);
  window.STICKER_CATALOGUE = [...base.map(item => merged.get(item.code) ? {...item,...merged.get(item.code),pack_id:item.pack_id,pack:item.pack} : item), ...[...merged.values()].filter(item => !base.some(original => original.code === item.code))].filter(item => !hidden.has(item.code));
  window.TPT_REELS = (updates.reels || []).filter(item => /^https:\/\/(www\.)?instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+\/?(?:\?.*)?$/.test(item.url || ''));
  return updates;
})();
