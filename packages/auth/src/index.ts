import { cookies } from "next/headers";
import { createServerComponentClient, createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type Role, RoleSchema, type UserProfile, UserProfileSchema } from "@ecomlabs/types";

export interface ServerContextOptions {
  request?: NextRequest;
  response?: NextResponse;
}

export type SupabaseServerClient = SupabaseClient;

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return { url, anonKey };
}

export function createServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = cookies();

  return createServerComponentClient({
    cookies: () => cookieStore,
    supabaseUrl: url,
    supabaseKey: anonKey
  });
}

export function createMiddlewareSupabaseClient(req: NextRequest, res: NextResponse) {
  const { url, anonKey } = getSupabaseEnv();
  return createMiddlewareClient({
    supabaseUrl: url,
    supabaseKey: anonKey,
    req,
    res
  });
}

export async function getUserProfile(client?: SupabaseServerClient): Promise<UserProfile | null> {
  const supabase = client ?? createServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error("Failed to load profile", error);
    return null;
  }

  const result = UserProfileSchema.safeParse(data);
  if (!result.success) {
    console.error("Invalid profile shape", result.error);
    return null;
  }

  return result.data;
}

export async function requireRole(role: Role, client?: SupabaseServerClient): Promise<UserProfile> {
  const profile = await getUserProfile(client);
  if (!profile) {
    throw new Error("Unauthenticated");
  }

  const allowedRoles: Record<Role, Role[]> = {
    admin: ["admin"],
    member: ["admin", "member"]
  };

  const permitted = allowedRoles[role];
  if (!permitted.includes(profile.role)) {
    throw new Error("Forbidden");
  }

  return profile;
}

export function assertRole(role: string): role is Role {
  return RoleSchema.safeParse(role).success;
}

export async function upsertProfile(client?: SupabaseServerClient) {
  const supabase = client ?? createServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const displayName = user.user_metadata.full_name || user.user_metadata.name || user.email;
  const email = user.email ?? "";

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        display_name: displayName,
        role: "member"
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to upsert profile", error);
    return null;
  }

  const parsed = UserProfileSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Invalid profile after upsert", parsed.error);
    return null;
  }

  return parsed.data;
}
