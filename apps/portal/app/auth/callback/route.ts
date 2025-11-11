import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { DomainEmailSchema } from "@ecomlabs/types";
import { type SupabaseServerClient, upsertProfile } from "@ecomlabs/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    DomainEmailSchema.parse(user.email);
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=domain", request.url));
  }

  await upsertProfile(supabase as SupabaseServerClient);

  return NextResponse.redirect(new URL(next, request.url));
}
