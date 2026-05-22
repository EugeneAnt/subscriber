# Subscriber

Subscriber is a small SvelteKit app for tracking subscriptions, renewals, expirations, warranties, licenses, and similar dated commitments.

It uses Supabase for Auth, Postgres, PostgREST, and Row Level Security. The app talks to Supabase from SvelteKit server code only; the browser does not use a Supabase client directly.

## Features

- Email and password sign-in with Supabase Auth
- Unified tracked items for subscriptions, expiry-only items, and hybrid items
- Dashboard summary tiles for active items, upcoming events, subscription burn, and pay-as-you-go spend
- Upcoming events, filters, desktop table, and mobile card list
- In-app payment reminders 7 days and 1 day before upcoming billing dates
- Optional OpenAI, Anthropic, xAI, and OpenRouter pay-as-you-go cost sync with current-month spend and local budget status
- Calendar-aware billing rollover in Postgres
- Per-currency monthly and annualized burn views
- Server-side validation with Valibot and sveltekit-superforms
- Supabase migrations and pgTAP database tests

## Requirements

- Node.js 22 or newer
- npm
- A standard Supabase-compatible project
- just, optional, for shorter local recipes
- Docker, if using the Docker image or local Supabase CLI stack
- Supabase CLI, if applying the included migrations yourself

The app expects standard Supabase behavior:

- migrations can reference `auth.users`
- RLS policies can call `auth.uid()`
- the Data API is enabled for the `public` schema
- email/password Auth is enabled

Hosted Supabase is the easiest production path. A normal self-hosted Supabase deployment also works. Restricted providers that block `auth.users`, `auth.uid()`, migrations, or Auth administration are not supported.

## Configuration

Runtime environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
ORIGIN=https://your-app.example.com
BODY_SIZE_LIMIT=524288

# Optional: enables pay-as-you-go provider cost cards.
OPENAI_ADMIN_KEY=<optional-openai-admin-key>
ANTHROPIC_ADMIN_KEY=<optional-anthropic-admin-key>
XAI_MANAGEMENT_KEY=<optional-xai-management-key>
OPENROUTER_MANAGEMENT_KEY=<optional-openrouter-management-key>
PROVIDER_COST_CACHE_MINUTES=60
```

`SUPABASE_ANON_KEY` is still accepted as a legacy fallback for local or self-hosted Supabase setups. `SUPABASE_SERVICE_ROLE_KEY` is intentionally not used by the application runtime. Keep service-role or secret keys for local admin scripts and tests only.

Provider admin keys are optional. The app starts without them and shows a configuration state on the Pay-as-you-go tab. Keys are read only by SvelteKit server code and are never sent to the browser or stored in Supabase.

Supported pay-as-you-go providers:

| Provider   | Environment variable        | What is synced                                                          | Notes                                                                                                                                                                    |
| ---------- | --------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenAI     | `OPENAI_ADMIN_KEY`          | Current UTC-month organization spend from the OpenAI Costs API          | Supports provider-side project filtering internally; the UI does not expose project filters yet. Remaining budget is local app math, not an OpenAI credit-balance value. |
| Anthropic  | `ANTHROPIC_ADMIN_KEY`       | Current UTC-month organization spend from the Anthropic Cost Report API | Requires an organization Admin API key. Individual Anthropic accounts and Claude Platform on AWS do not expose the required cost endpoint.                               |
| xAI        | `XAI_MANAGEMENT_KEY`        | Current UTC-month team spend from the xAI Billing Usage API             | Requires an xAI management key with Billing read access. Remaining budget is local app math; xAI prepaid balance is intentionally not synced in this slice.              |
| OpenRouter | `OPENROUTER_MANAGEMENT_KEY` | Current UTC-month API-key usage from the OpenRouter Management API      | Requires a Management API key. Spend is summed from listed API keys' `usage_monthly`; OpenRouter account credit balance is intentionally not synced in this slice.       |

Pay-as-you-go cards render cached database snapshots immediately. If a card is stale, the browser refreshes that provider in the background after the page opens; the refresh button still forces a manual update. `PROVIDER_COST_CACHE_MINUTES` controls both successful snapshot freshness and retry backoff after a failed sync attempt.

OpenAI cost sync reads organization spend from the OpenAI Costs API. OpenAI does not currently expose a documented remaining-credit balance through the Admin API, so Subscriber treats the budget fields as local tracking thresholds and calculates remaining budget from the synced current-month spend.

Anthropic cost sync reads organization spend from the Anthropic Usage and Cost Admin API. It requires an organization Admin API key (`sk-ant-admin...`) in `ANTHROPIC_ADMIN_KEY`; individual Anthropic accounts and Claude Platform on AWS do not expose the required programmatic cost endpoint.

xAI cost sync reads team spend from the xAI Management API. It requires an xAI management key in `XAI_MANAGEMENT_KEY`; grant Billing read access and keep the other management capabilities disabled unless you need them separately. If xAI reports that the billing usage result limit was reached, Subscriber treats the response as a sync error instead of storing a partial snapshot.

OpenRouter cost sync reads API key usage from the OpenRouter Management API. It requires a Management API key in `OPENROUTER_MANAGEMENT_KEY`; Subscriber includes disabled keys while summing current UTC-month `usage_monthly` so recently disabled keys still count toward the current month. OpenRouter exposes account credit totals separately, but Subscriber keeps the same local-budget model used by the other providers in this slice.

For local development, copy `.env.example`:

```bash
cp .env.example .env
```

## Supabase Setup

### Hosted Supabase

Create a Supabase project, then in the Dashboard:

- Enable the Data API.
- Keep automatic table exposure disabled if you want explicit grants only.
- You can leave automatic RLS disabled. The migrations enable RLS explicitly.
- Enable email/password Auth.
- Create your app user in Authentication -> Users.
- Configure Auth URLs:
  - Site URL: your deployed app origin
  - Redirect URLs: your deployed app origin and `http://localhost:5173`

Apply the schema:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push --dry-run
supabase db push
```

Regenerate types after schema changes:

```bash
supabase gen types typescript --linked --schema public,graphql_public > src/lib/types/database.ts
```

### Local Supabase

Start the local Supabase stack:

```bash
supabase start
supabase db reset
```

Copy the local API URL and anon key from `supabase status` into `.env`. The local CLI still prints a legacy anon key; put that value under `SUPABASE_PUBLISHABLE_KEY`:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<local anon key>
ORIGIN=http://localhost:5173
BODY_SIZE_LIMIT=524288
```

Create a local user in the local Studio at `http://127.0.0.1:54323`, then run the app.

### Self-Hosted Supabase

Use the same migrations with a normal self-hosted Supabase deployment:

```bash
supabase db push --db-url "$SUPABASE_DB_URL" --dry-run
supabase db push --db-url "$SUPABASE_DB_URL"
```

Self-hosted deployments must expose the standard Auth and PostgREST behavior listed above.

## Development

Install dependencies:

```bash
npm ci
```

Optional `just` recipes are available for the common development commands:

```bash
just local   # app + local Supabase settings from .env
just remote  # app + remote Supabase settings from .env.production.local
just up      # start local Supabase
just reset   # reset local Supabase database
just test
```

Run the app:

```bash
npm run dev
```

`npm run dev` uses the local Supabase settings from `.env`.

Choose a specific Supabase environment:

```bash
npm run dev:local
npm run dev:remote
npm run dev:env -- local
npm run dev:env -- remote
```

`local` reads `.env`. `remote` reads `.env.production.local`, which is ignored by Git.

Build and preview:

```bash
npm run build
npm run preview
```

Run checks and tests:

```bash
npm run check
npm run lint
npm run test
npm run test:e2e
```

Integration and E2E tests need Supabase credentials in `.env.test`.

## Docker

Build the image:

```bash
docker build -t subscriber .
```

Run it:

```bash
docker run --rm \
  -p 3000:3000 \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_PUBLISHABLE_KEY="your-publishable-key" \
  -e ORIGIN="http://localhost:3000" \
  -e BODY_SIZE_LIMIT="524288" \
  -e PROVIDER_COST_CACHE_MINUTES="60" \
  subscriber
```

Then open `http://localhost:3000`.

You can also start from the Compose example:

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up --build
```

Do not commit real secrets to `docker-compose.yml`.

## Deployment Notes

The Docker image is the portable deployment target. It expects Supabase to be provided separately.

For any reverse proxy or hosted runtime:

- route traffic to container port `3000`
- set `ORIGIN` to the public app URL
- set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`
- optionally set provider admin keys such as `OPENAI_ADMIN_KEY`, `ANTHROPIC_ADMIN_KEY`, `XAI_MANAGEMENT_KEY`, or `OPENROUTER_MANAGEMENT_KEY` for pay-as-you-go cost sync
- never expose service-role keys to the app runtime

## License

MIT
