# Ecomlabs Tools Portal

Monorepo scaffold for the Ecomlabs internal tools portal. The project ships a Next.js App Router application with Supabase Google sign-in, role-based access control, and the first Ops chat tool stubbed against mocked ClickUp data. Future tools (such as the N-gram analyzer) can be added under the shared workspace structure.

## Monorepo layout

```
ecomlabs-tools-portal/
├─ apps/
│  └─ portal/                  # Next.js portal
│     ├─ app/(public)/login    # Public login route
│     ├─ app/dashboard         # Authenticated dashboard
│     ├─ app/tools/ops/chat    # Admin-only Ops chat
│     └─ app/api/ops           # Server APIs (ClickUp proxy)
├─ packages/
│  ├─ auth/                    # Supabase helpers & RBAC utils
│  ├─ clickup/                 # ClickUp REST client scaffold
│  ├─ types/                   # Shared Zod schemas & types
│  └─ ui/                      # Tailwind-based UI primitives
├─ turbo.json                  # Turborepo pipeline config
└─ pnpm-workspace.yaml         # Workspace definition
```

## Requirements

- Node.js 18+
- pnpm (`corepack enable` recommended)
- Supabase project with Google OAuth configured (reuse the existing N-gram project if possible)
- ClickUp API token (server-side only)

## Environment variables

| Name | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key used by the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | (Optional) Service role for privileged server actions |
| `CLICKUP_API_TOKEN` | Server token for ClickUp API requests |
| `ALLOWED_EMAIL_DOMAIN` | Domain restriction for Google sign-ins (defaults to `ecomlabs.ca`) |
| `NEXT_PUBLIC_SITE_URL` | Fully-qualified site URL used as the OAuth redirect fallback |

Configure these locally by creating `.env` files in `apps/portal` or via Vercel project settings. When deploying to Vercel, add the same variables to the project and mark secret values as encrypted.

## Getting started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Run database migrations**

   Ensure the `profiles` table exists in Supabase (create it manually if not already present):

   ```sql
   create table if not exists profiles (
     id uuid primary key references auth.users on delete cascade,
     email text unique not null,
     display_name text,
     role text not null default 'member',
     created_at timestamptz default now()
   );
   ```

3. **Start the portal**

   ```bash
   pnpm dev
   ```

   The portal runs on [http://localhost:3000](http://localhost:3000). Visiting `/login` will trigger the Supabase Google OAuth flow and redirect back to `/dashboard`.

## Authentication & roles

- Google sign-in is handled via Supabase Auth Helpers with server-side cookies.
- Only `@ecomlabs.ca` accounts are allowed. Non-matching domains are signed out with a friendly error.
- Profiles are upserted on first sign-in and default to the `member` role.
- Promote initial admins manually in Supabase:

  ```sql
  update profiles set role = 'admin' where email = 'you@ecomlabs.ca';
  ```

- The Ops chat tool under `/tools/ops/chat` requires the `admin` role. Members are redirected to a 403 page.

## Ops chat mock

- The chat UI supports the command `status <client> <scope>`.
- Requests go through `/api/ops/clickup/status`, which currently returns mocked summaries and enforces a lightweight in-memory rate limit (20 requests/min per user).
- The `packages/clickup` package already exposes a typed client to plug into real ClickUp endpoints when ready.

## Shared packages

- `@ecomlabs/ui`: Tailwind + shadcn-inspired primitives used across the portal.
- `@ecomlabs/auth`: Supabase server helpers (`createServerClient`, `requireRole`, `upsertProfile`, middleware support).
- `@ecomlabs/types`: Zod schemas shared across apps and APIs (profiles, ops commands, ClickUp summaries).
- `@ecomlabs/clickup`: Fetch wrapper for ClickUp with basic error handling.

## Testing & linting

Default Next.js linting is available via Turborepo:

```bash
pnpm lint
```

Additional tests can be added per package/app and will automatically run through Turbo (`pnpm test`).

## Deployment notes

- Deploy the `apps/portal` app to Vercel. The provided `turbo.json` works with Vercel’s Turborepo integration.
- Populate all environment variables via Vercel project settings.
- Configure Supabase’s OAuth redirect to include `https://tools.ecomlabs.ca/auth/callback` (and the local `http://localhost:3000/auth/callback`).

## Next steps

- Swap the mocked ClickUp response in `/api/ops/clickup/status` with real API calls using `@ecomlabs/clickup`.
- Store client configuration (e.g., list IDs) in a managed config file or Supabase table (e.g., `ops_clients`).
- Port the existing N-gram tool into `apps/portal/app/tools/ngram` using the shared auth and UI packages.
- Harden rate limiting with a persistent store (Upstash Redis or Supabase) before production launch.
