# One-time live catalogue setup

This website is a static ZIP with Vercel Functions at `api/catalogue.js` and `api/products.js`. The first lets `catalogue-manager.html` save stickers and Instagram posts. The second lets `product-manager.html` update Light Boxes and all other products, including their names, images, availability, sizes and prices. Both publish changes for every visitor without editing code or uploading a replacement ZIP each time.

1. Put the contents of this ZIP in the GitHub repository connected to your Vercel project and deploy it. Keep the `api` folder at the project root.
2. In the Vercel project's Environment Variables, set:
   - `CATALOGUE_REPO`: `OWNER/REPOSITORY` for that GitHub repository.
   - `CATALOGUE_BRANCH`: the deployed branch, usually `main`.
   - `CATALOGUE_GITHUB_TOKEN`: a fine-grained GitHub token limited to that repository with **Contents: Read and write**. Add it only as a Vercel environment variable, never to the website files.
   - `CATALOGUE_ADMIN_PASSWORD`: a long, unique manager password. Add it only as a Vercel environment variable.
3. Redeploy once after adding the environment variables. Visit `/api/catalogue` and `/api/products`; both should return JSON with `"live":true`.
4. Open `/catalogue-manager.html` for sticker entries and `/product-manager.html` for Light Boxes and shop products. Enter the same manager password. Save publishes the respective update file to the repository; visitors read the latest version from the API on each page load. Your password stays in the current form field only.

The manager's password protects writes. The public GET endpoints expose catalogue entries, Reel links and product information. If an API is unavailable, its page clearly enters preview mode and keeps a local draft plus a downloadable backup. Preview-only changes are not public. Product image uploads are compressed in your browser and stored in the update file. Keep uploads reasonably small so the repository update stays manageable.

Large or incomplete source artwork should be replaced with complete individual sticker files. Existing sticker codes stay stable for orders. Instagram embeds require public Reel or post URLs. If your Vercel project is not linked to a GitHub repository, connect one before using this live workflow.
