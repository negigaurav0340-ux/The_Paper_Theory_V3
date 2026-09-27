# Verification record

- Product data parsed successfully: 33 products and 13 categories.
- Every product has a unique stable ID and at least one variant.
- Every numeric variant price is valid.
- Regular and holographic versions of the same character are grouped under finish variants.
- Every fridge magnet offers four variants: 3 × 4 Plain, 3 × 4 Bubble, 4 × 5 Plain and 4 × 5 Bubble.
- Regular and Matte stickers use ₹6 / ₹10 / ₹13 / ₹15 for 1 / 2 / 3 / 4 inches; Holographic uses only 2 inches at ₹30 and 4 inches at ₹40.
- Free shipping activates at a ₹699 product subtotal in the bag, WhatsApp summary and PDF.
- Shadow boxes remain launch-enquiry-only even where launch prices are displayed.
- Direct purchase controls are limited to stickers, Memoroids and suncatchers; acrylic displays and magnets are enquiry-only.
- The embedded dynamic store tour is 30 seconds, H.264/AAC at 1280 × 720, and continuously animates the browser, scrolling, cursor, glow and petals.
- The catalogue includes labelled AI-generated concept images for acrylic display, Memoroids, suncatchers and shadow boxes.
- Motion respects the visitor's reduced-motion setting.
- JavaScript syntax checked for the catalogue, storefront and PDF modules.
- HTML parsed successfully.
- Local image, video, PDF-library and licence files are present.
- PDF library was exercised separately with the Paper Theory logo and an A4 page.

Automated browser rendering was unavailable in the packaging environment, so the final ZIP should receive a quick click-through in Chrome after extraction: add two variants of one sticker, open a video gallery, add a custom request, and download its PDF.

## September 27 integrated update

- Checked syntax for every JavaScript file in `js`, `api` and the dashboard.
- Validated all 158 catalogue image paths and restored 146 legacy sticker images, 11 original preset sheets and their laptop previews. Several legacy source crops still contain incomplete artwork.
- Confirmed the customer catalogue still supports 16, 12 and six sticker selections per sheet. The production print studio has been removed.
- Tested analytics event sanitization, password validation and mocked live POST/GET storage flow. Live multi-visitor reporting remains contingent on the owner adding Upstash credentials; no customer identity is collected.
- Checked local HTML file references, `sitemap.xml` parsing and JSON catalogue exports. Search ranking cannot be confirmed until the new build is deployed and Search Console has crawled it.

## Final draft checks

- Removed the A4/Cricut builder files and every public link to them. Sticker catalogue selection and the original 11 preset sheet carousel remain.
- Tested admin custom From/To date filtering and date report sorting with sample events; checked that all reports use the same filtered event set.
- Validated local HTML links, JSON-LD parse, sitemap XML and JavaScript syntax.
