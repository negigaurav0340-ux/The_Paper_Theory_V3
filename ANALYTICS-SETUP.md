# Live analytics setup

The admin dashboard at `/admin.html` shows genuine events from the current browser by default. For cross-visitor reporting, deploy this site on Vercel with the `api/analytics.js` function and connect an Upstash Redis database.

In Vercel Environment Variables add:

- `UPSTASH_REDIS_REST_URL`: the HTTPS REST endpoint from your Upstash Redis database.
- `UPSTASH_REDIS_REST_TOKEN`: its REST token, kept server-side only.
- `CATALOGUE_ADMIN_PASSWORD`: the same strong password already used by the catalogue and product managers.

Redeploy. Open `/admin.html`, enter the password and press **Load live data**. The dashboard shows the latest 5,000 anonymous events across visitors, including daily visitors, weekday activity, sources, devices, product interest, funnel events and anonymous session journeys. Use preset periods or select From and To dates (IST); sort the date table by newest, oldest, visitors or actions. The selected range filters every report and the CSV export. If the connection is unavailable it clearly falls back to this browser's genuine event history.

The public analytics endpoint stores only a random session ID, event name, timestamp, source, page path, device class and product/variant IDs. It does not store names, phone numbers, email addresses, delivery details or IP addresses. A daily hashed IP rate key is used only to limit public event submissions and expires automatically. The dashboard is protected by the manager password; do not put that password in website files.

The current checkout downloads an order PDF and opens WhatsApp. It has no authenticated payment/order backend, so **checkout starts are not paid orders**. Orders and revenue stay zero until a verified order integration is added. Do not treat anonymous session IDs as customer identities.
