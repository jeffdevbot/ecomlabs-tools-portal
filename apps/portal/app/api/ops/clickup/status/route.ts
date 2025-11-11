import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";
import { requireRole, getUserProfile, type SupabaseServerClient } from "@ecomlabs/auth";
import { OpsStatusSummarySchema } from "@ecomlabs/types";

const QuerySchema = z.object({
  client: z.string().min(1),
  scope: z.string().min(1)
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry) {
    rateLimitStore.set(key, { count: 1, timestamp: now });
    return false;
  }

  if (now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, timestamp: now });
    return false;
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return entry.count > RATE_LIMIT_MAX;
}

function createMockSummary(client: string, scope: string) {
  return OpsStatusSummarySchema.parse({
    columns: [
      {
        name: "Ready",
        count: 3,
        tasks: [
          {
            id: `${client}-${scope}-1`,
            name: `Audit ${client} account structure`,
            assignees: ["Alex"],
            due: "2024-05-15"
          }
        ]
      },
      {
        name: "In progress",
        count: 2,
        tasks: [
          {
            id: `${client}-${scope}-2`,
            name: "Launch experiment set B",
            assignees: ["Jordan", "Priya"],
            due: "2024-05-13",
            hoursThisWeek: 6.5
          }
        ]
      },
      {
        name: "Review",
        count: 1,
        tasks: [
          {
            id: `${client}-${scope}-3`,
            name: "QA refreshed ad copy",
            assignees: ["Morgan"],
            due: "2024-05-12"
          }
        ]
      },
      {
        name: "Blocked",
        count: 1,
        tasks: [
          {
            id: `${client}-${scope}-4`,
            name: "Awaiting client assets",
            assignees: ["Taylor"],
            due: "2024-05-18"
          }
        ]
      }
    ],
    dueSoon: [
      {
        bucket: "Due this week",
        tasks: [
          {
            id: `${client}-${scope}-2`,
            name: "Launch experiment set B",
            assignees: ["Jordan", "Priya"],
            due: "2024-05-13",
            hoursThisWeek: 6.5
          }
        ]
      }
    ],
    assigneeLoad: [
      { name: "Jordan", hours: 18, expected: 24 },
      { name: "Priya", hours: 22, expected: 24 },
      { name: "Alex", hours: 12, expected: 24 }
    ]
  });
}

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  await requireRole("admin", supabase as SupabaseServerClient);

  const url = new URL(request.url);
  const result = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!result.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const profile = await getUserProfile(supabase as SupabaseServerClient);
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = `${profile.id}`;
  if (isRateLimited(key)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const summary = createMockSummary(result.data.client, result.data.scope);
  return NextResponse.json({ summary });
}
