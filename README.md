# K. Fabrics Storefront

Nuxt storefront for ready-to-wear, custom fit and standalone tailoring. The backend owns catalog availability, quoted prices, checkout, payments and tracking.

## Local development

Use Node.js 24 and the matching Laravel backend branch. Run the storefront and the API on the same local hostname (for example `localhost` on ports 3000 and 8000); do not mix `localhost` and `127.0.0.1` for browser sessions.

```sh
cp .env.example .env
npm ci
npm run dev
```

The default setup expects the API at `http://localhost:8000/api/v1`.

```sh
npm test
npm run typecheck
npm run build
npm run test:smoke
npm run preview
npm audit --omit=dev
```

## Deployment

- Deploy the matching API and storefront together. Set `NUXT_PUBLIC_API_BASE` to the API URL ending in `/api/v1` and `NUXT_PUBLIC_SITE_URL` to the canonical storefront URL. Configure HTTPS, the exact CORS origin and Sanctum session domains on the API.
- Set `NUXT_PUBLIC_SUPPORT_EMAIL` and/or `NUXT_PUBLIC_SUPPORT_WHATSAPP` to business-verified public support details before launch. Unconfigured channels are hidden.
- Payment availability comes from the API. Do not place merchant account details or provider secrets in storefront source or public runtime configuration.
- Staging sign-off: verify browsing and sorting, stock changes at checkout, custom fitting totals, multiple tailoring bookings, retry without double ordering, sign-in/logout, and status-only guest tracking. Confirm tracking secrets never enter URL parameters or analytics. Test on a narrow viewport with keyboard navigation and confirm image optimization on the production runtime.
- Keep unattended recovery campaigns and unfinished catalog add-ons off until the backend contracts and customer controls have been implemented and verified.

### Catalog content before launch

Replace demo photography with the actual garments: front, back, fabric detail and an accurate on-model view where available. Set `NUXT_PUBLIC_HERO_IMAGE` to an approved local asset path or public HTTPS image for the current collection. In the admin, attach image descriptions and verified article-specific fit, sizing and care data. Missing charts are shown as unavailable; the storefront does not substitute made-up measurements. The local placeholder is for failures, not a replacement for product photography.

Tailoring forms and carts warn before closing or refreshing when they contain unsubmitted private details. Measurements, notes and reference photos are not stored in the browser; signed-in customers can reapply their saved measurement profiles, but the unsent booking is not restored automatically. Checkout lets the customer download or print the private receipt before leaving.

New launch flows should be tested against the matching API and migrations. In staging, run a ready-to-wear COD order through confirmation and dispatch, then open a private return case. Test the disabled tailoring flow and the approved bank-transfer fixture (advance before work, remaining balance before dispatch). Test account and guest tracking recovery with a test mailbox, never real customer addresses.
