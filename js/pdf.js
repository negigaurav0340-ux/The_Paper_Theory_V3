(() => {
  'use strict';
  const clean = value => String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, ' ');
  window.createOrderPdf = async function createOrderPdf(cart, products, customer = {}) {
    if (!window.PDFLib) throw new Error('PDF engine unavailable');
    const { PDFDocument, StandardFonts, rgb, PDFName, PDFString } = window.PDFLib;
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const W = 595.28, H = 841.89, left = 42, right = 553;
    const colours = { ink: rgb(.13,.14,.12), muted: rgb(.38,.40,.35), orange: rgb(.93,.36,.17), paper: rgb(.98,.97,.93), blue: rgb(.19,.29,.69), line: rgb(.84,.84,.77), white: rgb(1,1,1) };
    const orderId = `TPT-${Date.now().toString().slice(-8)}`;
    const cache = new Map(), links = new Map();
    const productById = id => products.find(product => product.id === id);
    async function embedImage(source) {
      if (!source) return null;
      if (cache.has(source)) return cache.get(source);
      try {
        const response = await fetch(source); if (!response.ok) throw new Error('Image unavailable');
        const blob = await response.blob(); let bytes = new Uint8Array(await blob.arrayBuffer()), image;
        if (blob.type.includes('png') || /^data:image\/png/.test(source) || /\.png$/i.test(source)) image = await pdf.embedPng(bytes);
        else if (blob.type.includes('jpeg') || /^data:image\/jpeg/.test(source) || /\.jpe?g$/i.test(source)) image = await pdf.embedJpg(bytes);
        else {
          const bitmap = await createImageBitmap(blob), canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
          canvas.getContext('2d').drawImage(bitmap, 0, 0); const converted = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          image = await pdf.embedPng(new Uint8Array(await converted.arrayBuffer()));
        }
        cache.set(source, image); return image;
      } catch { cache.set(source, null); return null; }
    }
    function text(page, value, x, top, size = 9, font = regular, colour = colours.ink) { page.drawText(clean(value), { x, y: H - top - size, size, font, color: colour }); }
    function wrap(value, font, size, width) {
      const paragraphs = clean(value).split(/\n/), output = [];
      paragraphs.forEach(paragraph => { let line = ''; paragraph.split(/\s+/).filter(Boolean).forEach(word => { const candidate = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(candidate, size) > width && line) { output.push(line); line = word; } else line = candidate; }); if (line) output.push(line); }); return output;
    }
    function link(page, url, x, top, width, height) {
      try { const ref = pdf.context.register(pdf.context.obj({ Type:'Annot', Subtype:'Link', Rect:[x,H-top-height,x+width,H-top], Border:[0,0,0], A:{ Type:'Action', S:'URI', URI:PDFString.of(url) } })); const refs = links.get(page) || []; refs.push(ref); links.set(page, refs); } catch {}
    }
    async function header(continued = false) {
      const page = pdf.addPage([W,H]); page.drawRectangle({ x:0, y:0, width:W, height:H, color:colours.paper });
      const logo = await embedImage(window.LOGO_DATA || 'assets/logo.jpg'); if (logo) page.drawImage(logo, { x:left, y:H-94, width:53, height:53 });
      text(page, 'THE PAPER THEORY', 108, 48, 17, bold); text(page, continued ? 'ORDER SUMMARY / CONTINUED' : 'PROVEN COOL. TESTED DAILY.', 108, 70, 7, bold, colours.orange);
      page.drawLine({ start:{x:left,y:H-109}, end:{x:right,y:H-109}, thickness:1, color:colours.line }); return page;
    }
    let page = await header(), top = 132;
    text(page, 'ORDER SUMMARY', left, top, 22, bold); text(page, orderId, 421, top+2, 10, bold, colours.orange); top += 31;
    text(page, `Created ${new Date().toLocaleString('en-IN')}`, left, top, 8, regular, colours.muted); top += 22;
    if (customer.name || customer.house || customer.street || customer.pin) {
      text(page, 'DELIVERY DETAILS', left, top, 9, bold, colours.blue); top += 15;
      const deliveryLines = [
        customer.name ? `Name: ${customer.name}` : '',
        customer.phone ? `Phone: ${customer.phone}` : '',
        customer.email ? `Email: ${customer.email}` : '',
        customer.house ? `House / Flat / Building: ${customer.house}` : '',
        customer.street ? `Street / Area / Locality: ${customer.street}` : '',
        customer.landmark ? `Landmark: ${customer.landmark}` : '',
        [customer.city, customer.state, customer.pin ? `PIN ${customer.pin}` : ''].filter(Boolean).join(', '),
        customer.country ? `Country: ${customer.country}` : ''
      ].filter(Boolean);
      for (const entry of deliveryLines) {
        for (const line of wrap(entry, regular, 8, 500)) { text(page, line, left, top, 8, regular, colours.muted); top += 11; }
      }
      top += 8;
    }
    let subtotal = 0;
    for (const item of cart) {
      if (top > 690) { page = await header(true); top = 132; }
      if (item.type === 'product') {
        const product = productById(item.productId), variant = product?.variants.find(entry => entry.id === item.variantId); if (!product || !variant) continue;
        const lineTotal = (variant.price || 0) * item.quantity; subtotal += lineTotal;
        page.drawRectangle({ x:left, y:H-top-84, width:right-left, height:84, color:colours.white, borderColor:colours.line, borderWidth:.7 });
        const image = await embedImage(variant.image || product.images?.[0]); if (image) { const scale = Math.min(64/image.width,64/image.height); page.drawImage(image,{x:left+10,y:H-top-74,width:image.width*scale,height:image.height*scale}); }
        else { page.drawRectangle({x:left+10,y:H-top-74,width:64,height:64,color:rgb(.92,.92,.88)}); text(page,'IMAGE',left+26,top+37,7,bold,colours.muted); }
        text(page, product.name, left+84, top+16, 11, bold); text(page, `${product.id} | ${variant.size} | ${variant.finish}`, left+84, top+36, 8, regular, colours.muted);
        if (item.selection) text(page, `Designs: ${clean(item.selection).slice(0, 78)}`, left+84, top+51, 7, regular, colours.muted);
        text(page, `Qty ${item.quantity} x Rs. ${Number(variant.price).toLocaleString('en-IN')}`, left+84, item.selection ? top+65 : top+57, 8, regular); text(page, `Rs. ${lineTotal.toLocaleString('en-IN')}`, right-82, top+35, 10, bold, colours.orange); top += 96;
      } else {
        page.drawRectangle({ x:left, y:H-top-126, width:right-left, height:126, color:colours.white, borderColor:colours.line, borderWidth:.7 });
        const preview = await embedImage(item.preview); if (preview) { const scale = Math.min(74/preview.width,74/preview.height); page.drawImage(preview,{x:right-88,y:H-top-88,width:preview.width*scale,height:preview.height*scale}); }
        text(page, `CUSTOM / ${item.name}`, left+12, top+14, 11, bold, colours.blue); text(page, `${item.productType} | ${item.size} | ${item.finish} | Qty ${item.quantity}`, left+12, top+34, 8, regular, colours.muted);
        let inner = top + 51; if (item.fileName) { text(page, `Local reference: ${item.fileName}`, left+12, inner, 8, regular); inner += 12; }
        if (item.notes) { for (const lineText of wrap(`Notes: ${item.notes}`, regular, 8, preview ? 385 : 485).slice(0,3)) { text(page,lineText,left+12,inner,8,regular,colours.muted); inner += 11; } }
        if (item.drive) { text(page,'OPEN GOOGLE DRIVE FILES',left+12,top+105,8,bold,colours.blue); link(page,item.drive,left+12,top+99,150,15); }
        top += 138;
      }
    }
    if (top > 655) { page = await header(true); top = 132; }
    page.drawLine({ start:{x:left,y:H-top}, end:{x:right,y:H-top}, thickness:1, color:colours.line }); top += 18;
    text(page, `PRODUCT SUBTOTAL: Rs. ${subtotal.toLocaleString('en-IN')}`, left, top, 13, bold); top += 22;
    const freeShippingThreshold = window.CATALOGUE?.freeShippingThreshold || 699;
    const freeShipping = subtotal >= freeShippingThreshold;
    text(page, freeShipping ? `SHIPPING: FREE - product subtotal reached Rs. ${freeShippingThreshold}.` : `SHIPPING: Calculated at order confirmation using the delivery PIN code. Free from Rs. ${freeShippingThreshold}.`, left, top, 8, regular, freeShipping ? colours.blue : colours.muted); top += 14;
    if (cart.some(item => item.type === 'custom')) { text(page, 'CUSTOM WORK: Final quote confirmed after artwork review.', left, top, 8, regular, colours.muted); top += 14; }
    text(page, freeShipping ? `PAYABLE PRODUCT TOTAL: Rs. ${subtotal.toLocaleString('en-IN')}${cart.some(item => item.type === 'custom') ? ' + approved custom quote' : ''}.` : 'Final payable total is confirmed after shipping and any custom quotes.', left, top, 8, bold, colours.orange); top += 14;
    text(page, 'LAUNCH GIFT: First 100 customers receive a laminated PVC anime card, while allocation lasts.', left, top, 7, regular, colours.muted); top += 24;
    page.drawRectangle({x:left,y:H-top-104,width:right-left,height:104,color:colours.ink}); text(page,'NEXT STEP',left+15,top+14,8,bold,colours.orange); text(page,'Send this PDF and original reference files in your WhatsApp order conversation.',left+15,top+34,8,regular,colours.white); text(page,'WhatsApp: +91 82195 78050',left+15,top+54,8,bold,colours.white); text(page,'Instagram: @thepapertheory.in',left+265,top+54,8,bold,colours.white); text(page,'Email: thepapertheory.in@gmail.com',left+15,top+74,8,bold,colours.white); text(page,'YouTube: @the_papertheory',left+265,top+74,8,bold,colours.white);
    links.forEach((refs, linkedPage) => linkedPage.node.set(PDFName.of('Annots'), pdf.context.obj(refs)));
    pdf.setTitle(`The Paper Theory Order ${orderId}`); pdf.setAuthor('The Paper Theory'); pdf.setSubject('Order enquiry summary');
    const bytes = await pdf.save(); const blob = new Blob([bytes], {type:'application/pdf'}); const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = `the-paper-theory-${orderId}.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
})();
