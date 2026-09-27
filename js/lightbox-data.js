(() => {
  'use strict';
  const catalogue = window.CATALOGUE;
  if (!catalogue?.products) return;
  const product = catalogue.products.find(item => item.id === 'LIT-001');
  if (!product) return;

  const shared = {
    categories: ['Light Boxes'],
    description: 'Artwork by day and a colour-changing centrepiece after dark. A real A4 display with built-in lighting and remote controller included.',
    video: 'assets/lightbox/lightbox-demo.mp4',
    unit: '1 A4 Light Box · remote included',
    contents: ['A4 Light Box', 'Built-in colour-changing lighting', 'Remote controller'],
    status: 'order',
    application: 'Place on a stable indoor surface. Use the included remote to change colours and lighting modes. Power connection details are confirmed with the order.',
    care: 'Handle carefully, keep away from moisture, clean with a soft dry microfibre cloth, avoid harsh chemicals and disconnect power before cleaning.',
    quality: 'A4 format · 210 × 297 mm. Real product footage is shown in the Light Box showcase.'
  };

  Object.assign(product, shared, {
    name: 'Eren · A4 Anime Light Box',
    theme: 'Attack on Titan',
    images: ['assets/lightbox/lightbox-eren-on.webp', 'assets/lightbox/lightbox-eren-off.webp'],
    variants: [{ id: 'LIT-EREN-A4', size: 'A4 · 210 × 297 mm', finish: 'Eren · Colour-changing', price: 1199, image: 'assets/lightbox/lightbox-eren-on.webp' }]
  });

  const lightBoxDesigns = [
    { id: 'LIT-GOKU', name: 'Goku · A4 Anime Light Box', theme: 'Dragon Ball', slug: 'goku' },
    { id: 'LIT-LUFFY', name: 'Luffy · A4 Anime Light Box', theme: 'One Piece', slug: 'luffy' }
  ];
  lightBoxDesigns.forEach(item => {
    if (catalogue.products.some(existing => existing.id === item.id)) return;
    catalogue.products.push({
      ...shared,
      id: item.id,
      name: item.name,
      theme: item.theme,
      images: [`assets/lightbox/lightbox-${item.slug}-on.webp`, `assets/lightbox/lightbox-${item.slug}-off.webp`],
      variants: [{ id: `${item.id}-A4`, size: 'A4 · 210 × 297 mm', finish: `${item.name.split(' · ')[0]} · Colour-changing`, price: 1199, image: `assets/lightbox/lightbox-${item.slug}-on.webp` }]
    });
  });


})();
