# Supabase (website)

The website's part of the DocVex Supabase project: migrations in
`migrations/`, Edge Functions in `functions/`. The same project also holds
tables and functions from the desktop app's repository (`ai_usage`,
`ai_sessions`, `ai_usage_totals`, and the `ai`, `billing` and `stripe-webhook`
functions). Nothing here changes them.

| Migration                         | What it adds                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001_ask_usage.sql`               | `ask_usage`, `ask_take`, `ask_give` (the FAQ assistant's daily limits)                                                                                                  |
| `002_admin_billing_analytics.sql` | `is_admin()`, `billing_events`, `subscriptions`, the views `subscriptions_summary`, `billing_events_daily`, `subscription_lifecycle_daily`, and `admin_signups_daily()` |

| Function        | Purpose                                                           | Deploy                                                    |
| --------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| `ask-docvex`    | The FAQ's AI assistant                                            | `supabase functions deploy ask-docvex --no-verify-jwt`    |
| `stripe-events` | Logs every Stripe event; links Payment Link checkouts to accounts | `supabase functions deploy stripe-events --no-verify-jwt` |
| `admin`         | The admin dashboard's data (admins only)                          | `supabase functions deploy admin --no-verify-jwt`         |

`--no-verify-jwt`: each function checks its caller itself (Stripe's signature,
or the admin's token), and answers CORS preflights without a token.

## Applying the migrations

With the [Supabase CLI](https://supabase.com/docs/guides/cli), from the
repository root:

```sh
supabase login                      # once, opens the browser
supabase link --project-ref <ref>   # the project's id, from VITE_SUPABASE_URL
supabase db push                    # applies what is in supabase/migrations
```

`db push` keeps track of what it has applied in
`supabase_migrations.schema_migrations`. `001_ask_usage.sql` was applied by
hand before that existed. If `db push` offers to apply it again, mark it as
applied instead:

```sh
supabase migration repair --status applied 001_ask_usage
```

Without the CLI, paste the file into the dashboard's SQL editor (Database →
SQL). Every statement is written to be safe to run twice.

## Making someone an admin

`app_metadata` can only be written with the service role, so nothing in the
site can grant this. In the SQL editor:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'
where email = 'you@example.com';
```

And to take it away:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'is_admin'
where email = 'you@example.com';
```

The claim reaches the user's token only when the token is renewed. **Sign out
and back in**, or wait for the session to refresh (at most an hour), before
opening `/dev.html`.

## Secrets

```sh
# stripe-events: its own endpoint's signing secret (whsec_…), from the Stripe dashboard
supabase secrets set STRIPE_EVENTS_WEBHOOK_SECRET=whsec_…
# STRIPE_SECRET_KEY is already set for the app's functions; secrets are project-wide.

# admin
supabase secrets set PLAUSIBLE_API_KEY=… PLAUSIBLE_SITE_ID=docvex.ro
supabase secrets set PLAUSIBLE_HOST=https://plausible.io   # optional; a self-hosted instance
supabase secrets set GITHUB_TOKEN=…                         # optional; a read-only token, for GitHub's rate limit
```

## Registering the `stripe-events` webhook

In the Stripe dashboard (test mode first): **Developers → Webhooks → Add
endpoint**.

- **URL:** `https://<ref>.supabase.co/functions/v1/stripe-events`
- **Events:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `invoice.payment_action_required`
  - `customer.created`
  - `customer.deleted`

Copy the endpoint's signing secret into `STRIPE_EVENTS_WEBHOOK_SECRET`. This
is a second endpoint: keep the app's `stripe-webhook` endpoint as it is.

With the Stripe CLI instead:

```sh
stripe webhook_endpoints create \
  --url https://<ref>.supabase.co/functions/v1/stripe-events \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=customer.subscription.trial_will_end" \
  -d "enabled_events[]=invoice.paid" \
  -d "enabled_events[]=invoice.payment_failed" \
  -d "enabled_events[]=invoice.payment_action_required" \
  -d "enabled_events[]=customer.created" \
  -d "enabled_events[]=customer.deleted"
```

The response's `secret` is the signing secret.

To test: `stripe trigger customer.subscription.created`, then check that a row
appears in `billing_events` and in `subscriptions`.
