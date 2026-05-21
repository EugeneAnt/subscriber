# Subscriber

Subscriber is a small SvelteKit app for tracking subscriptions, renewals, expirations, warranties, licenses, and similar dated commitments.

It uses Supabase for Auth, Postgres, PostgREST, and Row Level Security. The app talks to Supabase from SvelteKit server code only; the browser does not use a Supabase client directly.

## Features

- Email and password sign-in with Supabase Auth
- Unified tracked items for subscriptions, expiry-only items, and hybrid items
- Dashboard summary tiles, upcoming events, filters, desktop table, and mobile card list
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
SUPABASE_ANON_KEY=your-anon-or-publishable-key
ORIGIN=https://your-app.example.com
BODY_SIZE_LIMIT=524288
```

`SUPABASE_SERVICE_ROLE_KEY` is intentionally not used by the application runtime. Keep service-role or secret keys for local admin scripts and tests only.

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

Copy the local API URL and anon key from `supabase status` into `.env`:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<local anon key>
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
  -e SUPABASE_ANON_KEY="your-anon-or-publishable-key" \
  -e ORIGIN="http://localhost:3000" \
  -e BODY_SIZE_LIMIT="524288" \
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
- set `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- never expose service-role keys to the app runtime

## License

MIT
