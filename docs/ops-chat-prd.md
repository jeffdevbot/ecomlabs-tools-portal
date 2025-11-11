# PRD — Ecomlabs Ops Chat (/tools/ops/chat)

## ✅ Launch Checklist (Milestone 1: Read-Only, ClickUp Only)

- **Auth & RBAC:** Admin-only access (Supabase Google SSO, `profiles.role = 'admin'`).
- **Client Selector:** Dropdown bound to synced ClickUp Spaces.
- **ClickUp Sync (structure):** Nightly and on-demand sync of Spaces, Lists, and Users into Supabase.
- **Chat Orchestrator:** GPT-5-nano, sliding window, and per-client summary memory.
- **ClickUp Fetcher:** Server API to fetch status for selected client (columns, top tasks, due soon).
- **Context Pane UI:** Read-only mini board (Open/Ready/In Progress/Review/On Hold/Completed/Closed) plus due-soon strips.
- **SOP Librarian (browse/match only):** Nominate-by-link → neutralize preview → save canonical/client-specific; fuzzy match in chat.
- **Caching:** Five-minute per-client task snapshot cache; live fetch fallback.
- **Observability:** Audit log of chat requests, agent calls, external API latency/errors.
- **Security:** Server-side ClickUp token; Zod validation on all inputs; rate-limit API routes.

## 🎯 Goals (M1)

- Ask questions in natural language and see the current status for a selected client (from ClickUp).
- Nominate SOPs by link: neutralize client specifics (or save client-specific canonical) with name and aliases.
- Keep costs low and UX snappy (minimal tokens; fetch only what is needed).

## 🚫 Out of Scope (M1)

- Creating or updating tasks in ClickUp.
- Mentions/nudges, Slack/Gmail/Drive/Calendar connectors.
- Time-tracking views.

## 🧱 Architecture (M1)

```
+-------------------------------------------------------------+
|  Web App (Next.js App Router)                               |
|  - /tools/ops/chat  (admin only)                            |
|  - Client selector | Chat thread | Context pane (mini board)|
+-------------------------------|-----------------------------+
                                |
                                v
+-------------------------------------------------------------+
|  Ops API (Server Routes, Node)                              |
|  - /api/ops/chat    (orchestrator endpoint)                 |
|  - /api/ops/status  (ClickUp Fetcher, read-only)            |
|  - /api/ops/sync    (on-demand: spaces, lists, users)       |
|  - /api/ops/sops/nominate  (preview neutralized SOP)        |
|  - /api/ops/sops/confirm   (persist SOP)                    |
|  - /api/ops/clients        (list/search clients)            |
+-------------------------------|-----------------------------+
                                |
                   +------------+------------+
                   |                         |
                   v                         v
+--------------------------+     +----------------------------+
|  Agents (in-process)     |     |  Integrations              |
|                          |     |                            |
|  1) Chat Orchestrator    |     |  ClickUp REST API          |
|     - GPT-5-nano         |     |   - teams/spaces/lists     |
|     - sliding window     |     |   - list tasks (+subtasks) |
|     - uses Librarian &   |     |   - users                  |
|       Fetcher            |     |                            |
|                          |     |  (Future: Slack/Drive/...) |
|  2) ClickUp Fetcher      |     +----------------------------+
|     - deterministic code |
|     - minimal, filtered  |
|       queries per client |
|                          |
|  3) SOP Librarian        |
|     - SQL retrieval      |
|     - fuzzy match (nano) |
|     - nomination by link |
|     - neutralize (regex  |
|       + constrained LLM) |
+--------------------------+
                                |
                                v
+-------------------------------------------------------------+
|  Supabase (DB + Auth)                                       |
|  - profiles (role=admin)                                    |
|  - clickup_spaces, clickup_lists, clickup_users             |
|  - sops, sop_subtasks, sop_aliases, sop_history             |
|  - clients (friendly overlay), team_members (optional)      |
|  - ops_chat_sessions, ops_chat_messages, ops_client_summary |
|  - audit_logs                                               |
+-------------------------------------------------------------+
```

## 🧠 Agents (MVP behavior)

### 1. Chat Orchestrator (GPT-5-nano)

- **Input:** `{ userId, clientId, message, lastNMessages, clientSummary }`
- **Intent routes:**
  - Status intent → ClickUp Fetcher → returns `TaskSummary`.
  - SOP intent:
    - “nominate by link …” → SOP Librarian (preview) → user confirm.
    - “find SOP …” → SOP Librarian (ranked matches).
- **Output:** Human reply and context-pane payload.
- **Context handling:**
  - Keep last 8–10 turns per client in memory.
  - Maintain one per-client rolling summary (short bullet points). Summarizer updates after each exchange (nano).

### 2. ClickUp Fetcher (deterministic)

- Resolves Space → Lists (cached).
- Fetches open tasks for those Lists with filters for statuses.
- Shapes `TaskSummary` for UI.
- Five-minute cache per client to keep responses snappy.

### 3. SOP Librarian

- **Nomination by link:**
  - Fetch ClickUp task (+subtasks/checklists/description).
  - Normalize → detect slots via regex (ASINs, locales, dates, brands, emails/domains).
  - Neutralize mode (default): remove brand/products/competitors; use constrained LLM to finalize slot replacements; produce diff preview.
  - Client-specific mode: retain brand nouns; still slot generic pieces.
  - Require name; auto-generate slug; aliases auto-seeded from title n-grams; user can edit before save.
- **Browse/Match:** SQL plus fuzzy rank (nano) over name, slug, aliases.

## 🖥️ UX / Flows

### A. Status query (read-only)

1. User selects Client at top.
2. Types: “what’s happening this week?” or “show In Progress”.
3. Orchestrator → Fetcher → `TaskSummary`.
4. Chat reply (counts and bullets) and context pane renders:
   - Columns: Open / Ready / In Progress / Review / On Hold / Completed / Closed (counts plus top few cards).
   - Due-soon strips: Today / Tomorrow / This Week / Overdue.
   - Cards link Open in ClickUp.

### B. Nominate SOP by link (neutral, default)

1. “Make this canonical named KW Master List: <ClickUp link>”.
2. Librarian fetches and neutralizes → Preview:
   - Summary header (slots detected, edited counts).
   - Collapsible sections (Title & Description diff; Slots table; Subtasks list with filters: edited, slots, unchanged).
3. User edits name/aliases if needed → Save.
4. Database stores `sops`, `sop_subtasks`, `sop_aliases`, `sop_history`.

### C. Nominate client-specific canonical

1. “Make this canonical – Revant named KW Master List (Revant): <link>”.
2. Same preview, but `scope = client`, `client_id = revant` and brand nouns retained.

## 📦 Data Model (Supabase) — DDL Sketch

```sql
-- Auth / RBAC
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  display_name text,
  role text not null default 'admin',  -- admin-only for now
  created_at timestamptz default now()
);

-- ClickUp structure cache
create table clickup_spaces (
  space_id text primary key,
  name text not null,
  status text,
  last_sync timestamptz
);

create table clickup_lists (
  list_id text primary key,
  space_id text references clickup_spaces(space_id) on delete cascade,
  name text not null
);

create table clickup_users (
  user_id text primary key,
  username text,
  email text,
  avatar text,
  role text,
  last_sync timestamptz
);

-- Optional friendly overlay
create table clients (
  id uuid primary key default gen_random_uuid(),
  space_id text references clickup_spaces(space_id),
  alias text unique,                 -- e.g., "Revant"
  notes text
);

-- Chat memory
create table ops_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  owner uuid references profiles(id),
  created_at timestamptz default now()
);

create table ops_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ops_chat_sessions(id) on delete cascade,
  role text check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

create table ops_client_summary (
  client_id uuid primary key references clients(id) on delete cascade,
  summary text,              -- short bullets kept up to date
  updated_at timestamptz default now()
);

-- SOPs
create table sops (
  id uuid primary key default gen_random_uuid(),
  key text,                  -- optional internal identifier
  name text not null,        -- "KW Master List"
  slug text unique not null, -- "kw-master-list"
  scope text not null check (scope in ('canonical','client')),
  client_id uuid null references clients(id),
  template jsonb not null,   -- normalized structure (name, summary, labels, fields, subtasks)
  version int not null default 1,
  content_fingerprint text,
  source_clickup_task_id text,
  aliases text[] default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table sop_subtasks (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid references sops(id) on delete cascade,
  order_index int,
  title text,
  notes text,
  flags text[] default '{}'  -- e.g., ['edited','slot','unchanged']
);

create table sop_history (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid references sops(id) on delete cascade,
  version int,
  diff jsonb,
  created_at timestamptz default now()
);

-- Audit
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid references profiles(id),
  event text,     -- "status.query" | "sop.nominate.preview" | ...
  payload jsonb,
  created_at timestamptz default now()
);
```

`template` JSON shape (stored in `sops.template`):

```json
{
  "summary": "23-step keyword research & setup.",
  "labels": ["advertising"],
  "fields": { "store": "slot", "locale": "slot", "due_offset_days": 7 },
  "subtasks": [
    { "title": "Extract Data - {{store}}", "notes": "" },
    { "title": "Relevant KW Selection - {{locale}}", "notes": "" }
  ]
}
```

## 🧪 API Contracts (concise)

### `GET /api/ops/clients`

Returns `{ id, alias, spaceId }[]`.

### `GET /api/ops/status?clientId=…&scope=all|ppc&fresh=true|false`

Returns `TaskSummary`:

```json
{
  "client": "Revant",
  "asOf": "2025-11-11T21:33:00Z",
  "columns": [
    {"name":"Open","count":1,"tasks":[{"id":"t1","name":"Advertising Optimizations - Monthly","assignees":["VB"],"due":null,"subtasks":8}]},
    {"name":"Ready","count":8,"tasks":[...]},
    {"name":"In Progress","count":5,"tasks":[...]}
  ],
  "dueSoon": [{"bucket":"This Week","tasks":[{"id":"t9","name":"FBA Restock Request","due":"2025-11-14"}]}]
}
```

### `POST /api/ops/sops/nominate`

```json
{ "url": "https://app.clickup.com/t/86d...", "name": "KW Master List", "mode": "neutral", "aliases": ["Keyword Master Template"] }
```

Returns preview (summary, diffs, slots; virtualizable list).

### `POST /api/ops/sops/confirm`

```json
{ "previewId": "uuid", "name": "KW Master List", "slug": "kw-master-list", "aliases": ["KW ML", "Keyword Build"] }
```

Writes `sops/*`, returns `{ sopId, slug }`.

### `POST /api/ops/sync`

Triggers spaces/lists/users sync from ClickUp (admin only).

## 🧩 Caching & Freshness

- Five-minute per-client task snapshot cache (Supabase or in-memory plus `updated_at` watermark).
- `fresh=true` query parameter bypasses cache.
- Nightly structure sync; “Sync now” button for admin.

## 🔒 Security & Guardrails

- Admin-only gating via middleware; domain-restricted Google login.
- All ClickUp calls server-side; tokens in server environment.
- Zod validation on every API input.
- Rate-limit: e.g., 20 requests per minute per user on status route.
- Full audit trail of agent invocations.

## 📈 Metrics (M1)

- P50/P95 latency for `/status`.
- Cache hit rate.
- Token usage (orchestrator and librarian).
- Errors/timeouts from ClickUp.
- SOP nominations saved; average subtasks per SOP.

## ✅ Acceptance Criteria (M1)

- Admin can log in → select a client → ask: “what’s happening this week?” and receive a correct summary and visual board.
- “Nominate this as canonical named X: <link>” produces a preview with slots/diffs; Save stores the SOP with aliases.
- Searching SOPs in chat (“find KW Master List”) returns the saved canonical/client-specific entries.
- No task writes occur; all endpoints validated and rate-limited; logs present.

## 🛣️ Next Milestones (brief)

- **M2 (Read + Create):** SOP matching → slot fill → dry-run compose; confirm → publish to ClickUp (status Ready).
- **M3 (Actions):** @mention nudges; status flips; Slack unfurls.
- **M4 (Connectors):** Gmail/Drive/Calendar search; Slack DM/channel posts.
- **M5 (Analytics):** Weekly client digests; SOP performance reports.
