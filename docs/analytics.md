# Analytics and the admin dashboard

How the website measures itself, and how to set up the admin dashboard
(`/dev.html`).

## What is tracked, and why

**Website traffic: Plausible.** It's cookieless and hosted in the EU (by
default on plausible.io, or on a self-hosted instance through
`VITE_PLAUSIBLE_HOST`). The script stores nothing in the browser, and the IP
address is not kept: unique visitors are counted with a daily-rotating hash.
So no consent banner is needed. The cookie and privacy policies describe it
(`#statistici` on both pages).

- The script (`script.outbound-links.js`, which also counts clicks on outbound
  links) is added to every page except `dev.html` by the `docvex-plausible`
  plugin in `vite.config.js`. `npm run dev` leaves it out unless
  `VITE_ANALYTICS_IN_DEV=true`.
- Custom events go through `track(event, props)` in `src/analytics.js`.
  `trackThen` waits up to 300 ms for an event fired just before the page
  navigates away. No event carries personal data.

**Subscriptions: Stripe → `stripe-events` → `billing_events` and
`subscriptions`.** These are the record of subscriptions. They are linked to
accounts, and the privacy policy's payment paragraph describes them.

**The desktop app: its own anonymous telemetry.** Since 1.2.0 the app sends
usage events to the `events` function (in the app's repository, documented in
its `docs/telemetry.md`). The dashboard's **App** section reads the app's
views (`app_active_users_daily`, `app_feature_usage_daily`, `ai_usage_daily`,
`app_versions_current`, `app_update_funnel_daily`, `app_errors_recent`,
`app_users_overview`, …) through the `admin` function's `app` action, with the
admin's token. Emails are joined in from the Admin API; they never enter the
app's tables.

**Key metrics** (the dashboard's first section) join these sources through
the `admin` function's `insights` action and the SQL functions in
`supabase/migrations/003_admin_insights.sql`:

- **The path to paying:** website visitors, Download clicks and new installs
  for the range, then the accounts created in the range and how many opened
  the app, asked the AI and subscribed.
- **Retention by start week:** installs grouped by their first week, and the
  share active in each week after (the last 8 weeks).
- **AI cost per plan:** tokens per model at Claude's list prices (`PRICES` in
  the function; update it when prices or models change), converted at the
  National Bank of Romania's daily USD rate, against each plan's MRR
  prorated to the range.
- **Subscription health:** paying subscribers, MRR, revenue per subscriber,
  monthly churn, lifetime value, new and ended subscriptions, and Stripe's
  cancellation reasons (turn them on in the customer portal's settings).
- **Reliability per release:** sessions per version, the share with no
  error, and window crashes (`supabase/migrations/004_admin_reliability.sql`).
- **Legal sources:** the AI's searches per source, with failures and slow
  calls, failures per day, and failed AI requests by kind.

**Gender and age** are optional, given by the account holder at sign-up
(the "About you" step, between Password and Plan), on the account page or in
the app, and kept in the Supabase user's `user_metadata`: `gender`
(`female` / `male` / `other`), `birth_date` (`YYYY-MM-DD`, an age from 16 to 100) and `demographics_at` (when given). "Prefer not to say" stores nothing
(or removes what was there). An earlier `birth_year` is still read and is
cleared when the date is saved. The dashboard's Accounts section counts
accounts by gender and by age group (16-24 … 65+), each split into paying
and not paying, and says how many accounts gave either. Legal basis:
consent (the privacy policy's `#demografie`). Shared code:
`src/demographics.js`, `src/components/Demographics.jsx`.

**Accounts and downloads** are read when needed: from Supabase Auth and from
GitHub Releases' download counts. Nothing new is collected for them.

## Phone alerts

The `alerts` function runs every 10 minutes (pg_cron) and pushes to the
admin's phone through [ntfy](https://ntfy.sh): install the ntfy app and
subscribe to the topic shown in the dashboard's Health section, then press
"Send a test alert". It sends each of these once:

| Alert           | When                                                         |
| --------------- | ------------------------------------------------------------ |
| App errors      | `ALERT_ERRORS_PER_HOUR` (10) or more error events in an hour |
| Payment failed  | a Stripe `invoice.payment_failed` event                      |
| Stripe delivery | Stripe could not deliver an event for over 30 minutes        |
| A legal source  | half or more of a source's searches failed in an hour (5+)   |
| AI limits       | `ALERT_LIMIT_USERS` (5) or more users hit a limit in a day   |
| A function down | an Edge Function answers with a 5xx                          |

## Push notifications on the installed dashboard

`dev.html` installs as an app ("Docvex Dev") and receives Web Push, with our
own VAPID keys and no third party. Only `dev.html` links the manifest
(`public/dev.webmanifest`) and registers the service worker
(`public/dev-sw.js`, scope `/dev.html`), so no public page is controlled or
cached by it.

**Turning it on**

- **iPhone / iPad** (iOS 16.4+): open docvex.ro/dev.html in Safari → Share →
  Add to Home Screen → open Docvex Dev from the icon → sign in → Settings →
  "Enable on this device" → Allow. Safari only offers push to a dashboard
  opened from the Home Screen.
- **Android:** open it in Chrome → ⋮ → Install app (or Add to Home screen) →
  Settings → "Enable on this device" → Allow.
- **Desktop** (Chrome, Edge, Firefox, Safari): Settings → "Enable on this
  device".

Then "Send a test notification". Tapping a notification opens the dashboard
at its link (`#/settings`, `#insights`, later `#/reports/R-0042`).

**The `admin` actions** (admins only, with the admin's token; the table's
policy also requires `is_admin()` and the caller's own rows):

| Action             | Body                             | Does                                                   |
| ------------------ | -------------------------------- | ------------------------------------------------------ |
| `push.subscribe`   | `{ subscription, device_label }` | saves this browser's subscription (upsert by endpoint) |
| `push.unsubscribe` | `{ endpoint }`                   | removes one device                                     |
| `push.list`        | —                                | the caller's devices                                   |
| `push.test`        | `{ lang? }`                      | a test push to the caller's devices                    |

The `alerts` function sends every alert to all devices too, as well as to
ntfy.

**Keys.** `VITE_VAPID_PUBLIC_KEY` (Actions variable `VAPID_PUBLIC_KEY`, and
`.env.local`) is the public key the browser subscribes with. The functions'
secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`
(`https://docvex.ro`) sign the pushes. To rotate them, make a new P-256 pair,
set all four, redeploy the site, and delete the rows of
`admin_push_subscriptions`: every subscription was made for the old key, so
each device has to press "Enable on this device" again.

**Sending a push from another function** (the app's `report-dossier`):

1. Copy `supabase/functions/_shared/push.ts` (Web Crypto only, no
   dependencies) and give the function the three VAPID secrets.
2. With the service role, read `admin_push_subscriptions`
   (`endpoint, p256dh, auth`), or call
   `pushToAdmins(db, payload, vapidFromEnv(Deno.env.get))`, which does steps
   2 to 4.
3. Send the payload `{ title, body, url, urgent?, tag? }`: `url` a full
   dashboard link (`https://docvex.ro/dev.html#/reports/R-0042`), `urgent`
   for a notification that stays on screen and vibrates, `tag` so a newer
   push about the same thing replaces the older one.
4. On 404 or 410 from the push service, delete that row (the device
   unsubscribed). On success set `last_used_at` (and `failures` to 0); on
   another error add 1 to `failures`.

## Asking about the metrics

The dashboard's "Ask about the metrics" box sends the question, the
conversation so far and a fresh snapshot of every section for the selected
range to Claude (`claude-opus-5-5`) through the `admin` function's `ask`
action. Email addresses are removed from the snapshot. It uses the project's
`ANTHROPIC_API_KEY`; each question costs a few cents.

## Search terms (Google Search Console)

docvex.ro's DNS (Cloudflare) has a Google site-verification record. To see
the Google searches that bring visitors, link Search Console in Plausible:
Site settings → Integrations → Google Search Console. The terms then appear
in Plausible's own dashboard (Sources → Google), after a few days.

## Goals to create in Plausible

Site settings → Goals → Add goal → **Custom event**, with exactly these names
(Pageview goals are not needed):

| Goal (custom event)        | Fired                                                 | Properties                                                                                                        |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Download Click`           | A download link on `instalare.html`                   | `platform` (windows / mac), `arch` (x64 / arm64 / universal), `version`, `location` (hero / hero-other / history) |
| `Signup Started`           | The sign-up's first step is shown                     | none                                                                                                              |
| `Signup Completed`         | An account was created                                | `plan` (start / pro / cabinet)                                                                                    |
| `Signin`                   | Signed in with email, or left for Google              | `provider` (email / google)                                                                                       |
| `Password Reset Requested` | A reset link was sent                                 | none                                                                                                              |
| `Checkout Redirect`        | Sent to a Stripe Payment Link                         | `plan`                                                                                                            |
| `Payment Return`           | Back from Stripe (`?plata=ok`)                        | none                                                                                                              |
| `Ask DocVex Question`      | The FAQ assistant answered                            | none                                                                                                              |
| `Ask DocVex Limit`         | The assistant's daily limit was reached               | none                                                                                                              |
| `Language Switch`          | RO / EN changed                                       | `to` (ro / en)                                                                                                    |
| `404`                      | A missing page was opened                             | `path`                                                                                                            |
| `Outbound Link: Click`     | A link to another site was followed (Plausible's own) | `url`                                                                                                             |

For the properties to show up in breakdowns, also add `platform`, `arch`,
`version`, `location`, `plan`, `provider`, `to` and `path` under Site settings →
Custom properties.

The dashboard's funnel uses `Checkout Redirect` → `Payment Return` → the
subscriptions Stripe created, and its "Missing pages" card uses `404` with
`path`.

## Setting it up

1. **Plausible.** Add the site `docvex.ro` (or your domain), and create the
   goals and properties above. Then create a **Stats API key**: Account
   settings → API keys.
2. **Database.** Apply `supabase/migrations/002_admin_billing_analytics.sql`
   (see `supabase/README.md`).
3. **Functions.** Deploy `stripe-events` and `admin` with `--no-verify-jwt`,
   and set their secrets:
   - `stripe-events`: `STRIPE_SECRET_KEY` (already set for the app),
     `STRIPE_EVENTS_WEBHOOK_SECRET`
   - `admin`: `PLAUSIBLE_API_KEY`, `PLAUSIBLE_SITE_ID` (the site's domain in
     Plausible), optionally `PLAUSIBLE_HOST` and `GITHUB_TOKEN`
4. **Stripe.** Register the second webhook endpoint for `stripe-events`, with
   the events listed in `supabase/README.md`. Keep the app's `stripe-webhook`
   as it is.
5. **Admin.** Set `is_admin` on your account (`supabase/README.md`), then sign
   out and back in.
6. **Site variables** (GitHub → Settings → Secrets and variables → Actions →
   Variables): `PLAUSIBLE_DOMAIN` and `PLAUSIBLE_HOST` if they differ from
   `docvex.ro` and `https://plausible.io`.

## Running the dashboard locally

```sh
npm run dev
# open http://localhost:5173/dev.html, signed in as an admin
```

The `admin` function accepts requests from `http://localhost:5173` and
`https://docvex.ro`. Locally, the site's own Plausible script stays off, but
the dashboard still reads the real Plausible stats through the function.

## What the dashboard can't show

- **New vs returning visitors.** Plausible can't tell them apart without
  cookies, and the dashboard says so where that chart would be.
- **Screen sizes.** In Plausible these are the device categories (Desktop,
  Laptop, Tablet, Mobile), shown under Devices.
- **Downloads today.** GitHub keeps only running totals, so this is the total
  now less the total first seen today in that browser
  (`localStorage['docvex:dev-downloads']`).
- **MRR history.** Rebuilt from each subscription's start and end dates. Every
  price is monthly today; a yearly price would need dividing by 12.
- **The audience map** is the world by country, drawn with `d3-geo` from
  [Natural Earth](https://www.naturalearthdata.com) (public domain). Clicking
  a country, on the map or in the list, zooms into it and shows its
  first-level regions (counties, states, provinces) with their visitors (the
  `admin` function's `regions` action: Plausible's `visit:region` for that
  country). Regions are matched by ISO 3166-2 code, else by name or by the
  larger region they belong to, for countries where Plausible counts a
  coarser level (France, Italy, the UK). Esc, "← World" or a click on the sea
  zooms out. Romania by county is also the "Romania, by county" card.

  The map files are static TopoJSON: `public/geo/world.json` (countries,
  1:50m) and `public/geo/regions/<code>.json` (regions, 1:10m), fetched only
  by the dashboard, and a country's file only when it is clicked. To rebuild
  them from Natural Earth's GeoJSON with
  [mapshaper](https://github.com/mbloch/mapshaper):

  ```sh
  mapshaper ne_50m_admin_0_countries.geojson \
    -filter 'ISO_A2_EH !== "AQ" && ISO_A2_EH !== "-99"' \
    -each 'id=ISO_A2_EH, name=NAME' -filter-fields id,name -simplify 20% keep-shapes \
    -o format=topojson id-field=id quantization=20000 public/geo/world.json
  mapshaper ne_10m_admin_1_states_provinces.geojson \
    -filter '/^[A-Z]{2}$/.test(iso_a2) && iso_a2 !== "AQ"' \
    -each 'code=iso_3166_2, name=name || name_en, group=region || ""' \
    -filter-fields iso_a2,code,name,group -simplify 6% keep-shapes -split iso_a2 \
    -o format=topojson singles quantization=20000 public/geo/regions/
  ```
