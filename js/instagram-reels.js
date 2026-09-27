(async () => {
  await window.TPT_CATALOGUE_READY;
  const host = document.getElementById('instagramReelTrack'); if (!host) return;
  const posts = (window.TPT_REELS || []).slice(0,6);
  if (!posts.length) return;
  const escape = text => String(text || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  host.innerHTML = posts.map((post,index) => `<article class="reel-card"><div class="reel-head"><b>@thepapertheory.in</b><span>Reel ${index+1}</span></div><div class="reel-frame" data-url="${escape(post.url.split('?')[0])}"><button type="button" aria-label="Play Instagram post ${index+1}">▶ Play on this page</button></div><p>${escape(post.title || 'From our Instagram')}</p><a href="${escape(post.url)}" target="_blank" rel="noopener noreferrer">Open on Instagram ↗</a></article>`).join('');
  host.addEventListener('click',event => {
    const button = event.target.closest('.reel-frame button'); if (!button) return;
    const frame = button.parentElement, url = new URL(frame.dataset.url);
    if (!/^\/(reel|p)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) return;
    const iframe = document.createElement('iframe'); iframe.src = `https://www.instagram.com${url.pathname.replace(/\/$/,'')}/embed/`; iframe.title = 'The Paper Theory Instagram post'; iframe.loading = 'lazy'; iframe.allow = 'autoplay; encrypted-media; picture-in-picture'; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; frame.replaceChildren(iframe);
  });
})();
