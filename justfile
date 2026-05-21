default:
    @just --list

# Start the app with the local Supabase settings from .env.
local:
    npm run dev:local

# Start the app with the remote Supabase settings from .env.production.local.
remote:
    npm run dev:remote

# Start the local Supabase stack.
up:
    supabase start

# Stop the local Supabase stack.
down:
    supabase stop

# Reset the local Supabase database and reapply migrations.
reset:
    supabase db reset

# Show local Supabase service URLs and keys.
status:
    supabase status

check:
    npm run check

lint:
    npm run lint

test:
    npm run test

e2e:
    npm run test:e2e

all:
    npm run test:all

build:
    npm run build

preview:
    npm run preview

types:
    npm run db:types

format:
    npm run format
