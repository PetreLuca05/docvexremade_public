// Stripe events, logged: a second Stripe webhook endpoint, next to the app's
// stripe-webhook (which sets the account's plan and is left unchanged). This
// one only records: every event once in public.billing_events, and the
// current state of each subscription in public.subscriptions, for the admin
// dashboard (dev.html). It never writes app_metadata.
//
// It also closes a gap: a Payment Link checkout from the website carries the
// account id only as client_reference_id, which stripe-webhook does not read.
// On checkout.session.completed it copies it into the customer's and the
// subscription's metadata.user_id; the subscription update that follows lets
// stripe-webhook find the account and set its plan.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_EVENTS_WEBHOOK_SECRET (this endpoint's
// own signing secret); SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come with
// the function. Deployed with --no-verify-jwt: Stripe signs its requests.
//   supabase functions deploy stripe-events --no-verify-jwt

import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const stripe = new Stripe(env('STRIPE_SECRET_KEY'), {
  httpClient: Stripe.createFetchHttpClient(),
});
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

// ---- plans ----------------------------------------------------------------

// The site's plan names. The app tags prices with docvex_plan (standard: Solo,
// pro: Firm); the site's own tag, plan (pro: Solo, cabinet: Firm), is the
// fallback.
const PLAN_ORDER = { solo: 1, firm: 2 } as const;
type Plan = keyof typeof PLAN_ORDER;

function planOfPrice(price?: Stripe.Price | null): Plan | null {
  const meta = price?.metadata ?? {};
  if (meta.docvex_plan === 'standard') return 'solo';
  if (meta.docvex_plan === 'pro') return 'firm';
  if (meta.plan === 'pro') return 'solo';
  if (meta.plan === 'cabinet') return 'firm';
  return null;
}

// ---- helpers --------------------------------------------------------------

const ts = (seconds?: number | null) => (seconds ? new Date(seconds * 1000).toISOString() : null);
const idOf = (ref: string | { id: string } | null | undefined) =>
  typeof ref === 'string' ? ref : (ref?.id ?? null);

// The subscription's billing period: on the subscription in older API
// versions, on its items in newer ones.
function periodOf(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0] as
    (Stripe.SubscriptionItem & Record<string, number>) | undefined;
  const s = sub as Stripe.Subscription & Record<string, number>;
  return {
    start: ts(s.current_period_start ?? item?.current_period_start),
    end: ts(s.current_period_end ?? item?.current_period_end),
  };
}

function amountOf(sub: Stripe.Subscription) {
  return sub.items.data.reduce(
    (sum, item) => sum + (item.price?.unit_amount ?? 0) * (item.quantity ?? 1),
    0,
  );
}

// The account a customer belongs to, from its metadata (null when deleted or
// unknown).
async function userOfCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer.deleted ? null : (customer.metadata?.user_id ?? null);
  } catch {
    return null;
  }
}

// What changed on a customer.subscription.updated event, from the fields
// Stripe lists as previous_attributes.
function lifecycleOf(sub: Stripe.Subscription, previous: Record<string, unknown> | undefined) {
  if (!previous) return null;
  if ('cancel_at_period_end' in previous) {
    if (sub.cancel_at_period_end && !previous.cancel_at_period_end) return 'cancel_requested';
    if (!sub.cancel_at_period_end && previous.cancel_at_period_end) return 'reactivated';
  }
  const before = (previous.items as { data?: { price?: Stripe.Price }[] } | undefined)?.data?.[0]
    ?.price;
  if (before) {
    const from = planOfPrice(before);
    const to = planOfPrice(sub.items.data[0]?.price);
    if (from && to && from !== to) {
      return PLAN_ORDER[to] > PLAN_ORDER[from] ? 'upgraded' : 'downgraded';
    }
    const amountBefore = before.unit_amount ?? 0;
    const amountNow = sub.items.data[0]?.price?.unit_amount ?? 0;
    if (amountNow !== amountBefore) return amountNow > amountBefore ? 'upgraded' : 'downgraded';
  }
  if (previous.status === 'past_due' && sub.status === 'active') return 'recovered';
  return null;
}

// ---- the row for each event type --------------------------------------------

type Row = {
  customer_id: string | null;
  subscription_id: string | null;
  user_id: string | null;
  plan: Plan | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  period_start: string | null;
  period_end: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  derived: Record<string, unknown>;
};

const empty = (): Row => ({
  customer_id: null,
  subscription_id: null,
  user_id: null,
  plan: null,
  status: null,
  amount: null,
  currency: null,
  period_start: null,
  period_end: null,
  cancel_at: null,
  canceled_at: null,
  derived: {},
});

async function fromSubscription(event: Stripe.Event, sub: Stripe.Subscription): Promise<Row> {
  const row = empty();
  const price = sub.items.data[0]?.price;
  const period = periodOf(sub);
  row.customer_id = idOf(sub.customer);
  row.subscription_id = sub.id;
  row.user_id = sub.metadata?.user_id ?? (await userOfCustomer(row.customer_id));
  row.plan = planOfPrice(price);
  row.status = sub.status;
  row.amount = amountOf(sub);
  row.currency = price?.currency ?? null;
  row.period_start = period.start;
  row.period_end = period.end;
  row.cancel_at = ts(sub.cancel_at);
  row.canceled_at = ts(sub.canceled_at);
  row.derived.price_id = price?.id ?? null;
  if (event.type === 'customer.subscription.updated') {
    const previous = (event.data as { previous_attributes?: Record<string, unknown> })
      .previous_attributes;
    const lifecycle = lifecycleOf(sub, previous);
    if (lifecycle) row.derived.lifecycle = lifecycle;
    if (lifecycle === 'upgraded' || lifecycle === 'downgraded') {
      const before = (previous?.items as { data?: { price?: Stripe.Price }[] } | undefined)
        ?.data?.[0]?.price;
      row.derived.plan_from = planOfPrice(before);
      row.derived.plan_to = row.plan;
    }
  }
  return row;
}

async function fromInvoice(invoice: Stripe.Invoice): Promise<Row> {
  const row = empty();
  const inv = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null;
    parent?: {
      subscription_details?: { subscription?: string; metadata?: Record<string, string> };
    };
  };
  const line = invoice.lines?.data?.[0] as
    (Stripe.InvoiceLineItem & { price?: Stripe.Price | null }) | undefined;
  row.customer_id = idOf(invoice.customer);
  row.subscription_id =
    idOf(inv.subscription) ?? inv.parent?.subscription_details?.subscription ?? null;
  row.user_id =
    inv.parent?.subscription_details?.metadata?.user_id ??
    invoice.subscription_details?.metadata?.user_id ??
    (await userOfCustomer(row.customer_id));
  row.plan = planOfPrice(line?.price ?? null);
  row.status = invoice.status ?? null;
  row.amount = invoice.amount_paid || invoice.amount_due || 0;
  row.currency = invoice.currency ?? null;
  row.period_start = ts(line?.period?.start ?? invoice.period_start);
  row.period_end = ts(line?.period?.end ?? invoice.period_end);
  row.derived.price_id = line?.price?.id ?? null;
  return row;
}

// A Payment Link checkout: remember the account on the customer and the
// subscription, so the app's stripe-webhook finds it from now on.
async function fromCheckout(session: Stripe.Checkout.Session): Promise<Row> {
  const row = empty();
  row.customer_id = idOf(session.customer);
  row.subscription_id = idOf(session.subscription);
  row.status = session.payment_status ?? session.status ?? null;
  row.amount = session.amount_total ?? null;
  row.currency = session.currency ?? null;
  row.derived.payment_link = idOf(session.payment_link);
  const fromCustomer = await userOfCustomer(row.customer_id);
  const reference = session.client_reference_id ?? null;
  row.user_id = fromCustomer ?? reference;
  if (!fromCustomer && reference && row.customer_id) {
    await stripe.customers.update(row.customer_id, { metadata: { user_id: reference } });
    row.derived.linked_customer = true;
    if (row.subscription_id) {
      // Also fires customer.subscription.updated, so stripe-webhook runs again
      // and now finds the account.
      await stripe.subscriptions.update(row.subscription_id, {
        metadata: { user_id: reference },
      });
      row.derived.linked_subscription = true;
    }
  }
  if (row.subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(row.subscription_id);
      row.plan = planOfPrice(sub.items.data[0]?.price);
      row.derived.price_id = sub.items.data[0]?.price?.id ?? null;
    } catch {
      // The plan stays unknown on this row; the subscription events carry it.
    }
  }
  return row;
}

async function rowOf(event: Stripe.Event): Promise<Row> {
  const object = event.data.object as unknown;
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end':
      return fromSubscription(event, object as Stripe.Subscription);
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.payment_action_required':
      return fromInvoice(object as Stripe.Invoice);
    case 'checkout.session.completed':
      return fromCheckout(object as Stripe.Checkout.Session);
    case 'customer.created':
    case 'customer.deleted': {
      const customer = object as Stripe.Customer;
      const row = empty();
      row.customer_id = customer.id;
      row.user_id = customer.metadata?.user_id ?? null;
      return row;
    }
    default: {
      // Logged as it came, with what can be read off any object.
      const any = object as { customer?: string | { id: string }; id?: string };
      const row = empty();
      row.customer_id = idOf(any.customer ?? null);
      return row;
    }
  }
}

// ---- saving ---------------------------------------------------------------

// Inserts the event once; false when it was already there. A user_id that no
// longer exists is stored as null rather than failing the event.
async function logEvent(event: Stripe.Event, row: Row): Promise<boolean> {
  const record = {
    stripe_event_id: event.id,
    type: event.type,
    created_at: ts(event.created),
    customer_id: row.customer_id,
    subscription_id: row.subscription_id,
    user_id: row.user_id,
    plan: row.plan,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    period_start: row.period_start,
    period_end: row.period_end,
    cancel_at: row.cancel_at,
    canceled_at: row.canceled_at,
    payload: { ...event, derived: row.derived },
  };
  let result = await db
    .from('billing_events')
    .upsert(record, { onConflict: 'stripe_event_id', ignoreDuplicates: true })
    .select('id');
  if (result.error?.code === '23503') {
    result = await db
      .from('billing_events')
      .upsert(
        { ...record, user_id: null },
        { onConflict: 'stripe_event_id', ignoreDuplicates: true },
      )
      .select('id');
  }
  if (result.error) throw result.error;
  return (result.data ?? []).length > 0;
}

// The subscription as it is now (asked of Stripe: events can arrive late or
// out of order), upserted into public.subscriptions.
async function saveSubscription(subscriptionId: string, userId: string | null) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const period = periodOf(sub);
  const price = sub.items.data[0]?.price;
  const record = {
    subscription_id: sub.id,
    customer_id: idOf(sub.customer)!,
    user_id: sub.metadata?.user_id ?? userId,
    plan: planOfPrice(price),
    status: sub.status,
    started_at: ts(sub.start_date),
    current_period_start: period.start,
    current_period_end: period.end,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    cancel_at: ts(sub.cancel_at),
    canceled_at: ts(sub.canceled_at),
    ended_at: ts(sub.ended_at),
    amount: amountOf(sub),
    currency: price?.currency ?? null,
    updated_at: new Date().toISOString(),
  };
  let result = await db.from('subscriptions').upsert(record, { onConflict: 'subscription_id' });
  if (result.error?.code === '23503') {
    result = await db
      .from('subscriptions')
      .upsert({ ...record, user_id: null }, { onConflict: 'subscription_id' });
  }
  if (result.error) throw result.error;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      req.headers.get('Stripe-Signature') ?? '',
      env('STRIPE_EVENTS_WEBHOOK_SECRET'),
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error('Bad signature', error);
    return new Response('Bad signature', { status: 400 });
  }

  try {
    const row = await rowOf(event);
    const isNew = await logEvent(event, row);
    // Always (also for a repeat): the upsert is idempotent, and a retry after a
    // failed save must still save.
    if (event.type.startsWith('customer.subscription.') && row.subscription_id) {
      await saveSubscription(row.subscription_id, row.user_id);
    }
    return new Response(isNew ? 'OK' : 'Already logged', { status: 200 });
  } catch (error) {
    // Stripe retries a failure.
    console.error(event.type, event.id, error);
    return new Response('Could not log', { status: 500 });
  }
});
