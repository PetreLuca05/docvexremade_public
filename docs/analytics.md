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

**Accounts and downloads** are read when needed: from Supabase Auth and from
GitHub Releases' download counts. Nothing new is collected for them.

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
- **The globe's hover** shows the country nearest the pointer among those
  facing you. Hovering the country list turns the globe to that country.
