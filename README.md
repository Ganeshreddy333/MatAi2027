# MatAi 2027 — Conference Website

International Conference on Materials Science, Engineering & Artificial Intelligence
**October 13–14, 2027 · Berlin, Germany**

A fully functional multi-page conference website with a backend for editable content, form submissions, and payment management. It works two ways:

- **Open directly** — double-click any `.html` file. Forms still work and save submissions to the browser's `localStorage`.
- **Run the server** — serves the site and stores submissions in MySQL when configured, or in local JSON files for development without a database.

## Pages

| Page | File |
|------|------|
| Home | `frontend/index.html` |
| About the Conference | `frontend/about.html` |
| Scientific Committee | `frontend/committee.html` |
| Speakers | `frontend/speakers.html` |
| Abstract Submission | `frontend/abstract-submission.html` |
| Scientific Sessions (30) | `frontend/sessions.html` |
| Venue | `frontend/venue.html` |
| Information (guidelines, publication, awards, terms, refund, privacy, FAQ) | `frontend/information.html` |
| Sponsors & Exhibition | `frontend/sponsors.html` |
| Registration | `frontend/registration.html` |
| Contact | `frontend/contact.html` |

## Project structure

```
mat/
├── frontend/
│   ├── *.html            public pages and admin panel
│   ├── css/              design system (colors, layout, components)
│   └── js/               shared site behavior, forms, and admin UI
├── backend/
│   ├── server.js         Express API and static-site server
│   ├── storage.js        MySQL and legacy JSON storage
│   ├── setup-database.js MySQL schema setup and one-time JSON import
│   └── data/             private JSON files and uploaded documents
├── package.json
├── package-lock.json
├── .env.example
└── README.md
```

## Run the live server

Requires Node.js 18+ (tested on Node v24).

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

Set a custom port with `PORT=8080 npm start`.

## MySQL database

The server supports MySQL 8 for website content, registrations, abstracts, contact messages, brochure requests, and payment status. Uploaded abstract documents remain in the private `backend/data/uploads/` folder; only their metadata is stored in MySQL.

1. Install/start MySQL Server and create an application database and user:

   ```sql
   CREATE DATABASE matai_2027 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'matai_app'@'localhost' IDENTIFIED BY 'choose-a-private-password';
   GRANT ALL PRIVILEGES ON matai_2027.* TO 'matai_app'@'localhost';
   ```

2. Copy `.env.example` to `.env` in the project root. Set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`. Do not commit or share `.env`.
3. Run `npm run db:setup`. The backend creates its tables and imports the existing JSON content and submission files once. The original JSON files are kept unchanged as a backup. On later starts, the migration marker prevents deleted records from being imported again.
4. Run `npm start` as usual. If the MySQL settings are absent, the current JSON-file storage remains available; if MySQL is configured but unreachable, the server reports the connection error instead of silently switching stores.

Tables are created automatically: `matai_submissions`, `matai_site_content`, `matai_submission_locks`, and `matai_migrations`.

## Form submissions

The registration, contact, and brochure forms POST JSON to the backend. The abstract form sends multipart data so it can include an optional PDF or Word document:

- With MySQL configured, submissions are stored in `matai_submissions`.
- Without MySQL configured, submissions are stored in `backend/data/abstract.json`, `backend/data/register.json`, `backend/data/contact.json`, and `backend/data/brochure.json`; optional `.pdf`, `.doc`, or `.docx` attachments (maximum 5 MB) are stored in `backend/data/uploads/`.

Each submission gets a reference like `MATAI-XXXXXX` and a timestamp. Abstract attachments are downloadable only from the authenticated admin submission details. When the page is opened from `file://` (no server), `frontend/js/forms.js` automatically falls back to saving in `localStorage`; document files are not uploaded or persisted in that mode.

## Payment gateway setup

Online registration checkout supports Stripe Checkout, PayPal Orders, and Razorpay Standard Checkout. The server calculates the amount from saved registration prices, active period, coupon, and service charge; it does not trust the total sent by the browser. Configure credentials in the server environment (never in browser code or source control):

- `STRIPE_SECRET_KEY` — Stripe test or live secret key; never put this value in browser code or commit it.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the Stripe webhook endpoint `POST /api/stripe/webhook`.
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` — credentials from the PayPal developer dashboard.
- `PAYPAL_MODE` — `sandbox` (default) or `live`.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — API credentials from the Razorpay dashboard.
- `RAZORPAY_WEBHOOK_SECRET` — webhook signing secret for `POST /api/razorpay/webhook`.
- `PUBLIC_BASE_URL` — public HTTPS origin for provider redirects (for local test mode, use `http://localhost:3001`).

All providers charge in EUR, matching the published conference fees. Razorpay must have EUR/international payments enabled for the merchant account or its API will reject order creation. Configure Stripe webhook events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, and `checkout.session.async_payment_failed`. Configure Razorpay webhook events `payment.captured` and `payment.failed`. Stripe and PayPal payments are confirmed server-to-server; Razorpay signatures are checked server-side and the payment is independently fetched from Razorpay before marking it paid. If a provider is not configured, its option is disabled and bank-transfer registrations remain available for manual follow-up. Use test credentials and provider sandbox/test modes before enabling live checkout; Stripe live mode requires HTTPS.

## Security notes

- Submissions can contain **personal information** (names, emails, affiliations). The server deliberately provides **no public endpoint to read submissions back** — submissions are available only through the authenticated admin API or directly to the database/server administrator.
- Do **not** add an unauthenticated "view submissions" route. Any admin view must sit behind real authentication and access control.
- Do not commit the `backend/data/` submission files or expose them publicly.
- The server validates required fields, checks email format, caps JSON request bodies at 256 KB, and stores only string/boolean/number form fields. Abstract uploads are limited to one PDF, DOC, or DOCX file no larger than 5 MB and are checked against their file signatures.
- Placeholder content (speaker names, committee members, venue name/address, important dates) is intentionally marked `[…]` / "To Be Announced" and should be replaced as details are confirmed.

## Content source

All content and page/navigation structure follow the conference specification in `MatAi-2027-pdf.pdf` (extracted to `_extracted.txt`).
