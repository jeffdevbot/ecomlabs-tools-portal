import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@ecomlabs/auth";
import { RoleSchema } from "@ecomlabs/types";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/_next", "/favicon.ico", "/api/ops/clickup/status"];
const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase() ?? "ecomlabs.ca";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function applyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(req, res);
  const pathname = req.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    if (pathname.startsWith("/login")) {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session) {
        return applyCookies(res, NextResponse.redirect(new URL("/dashboard", req.url)));
      }
    }
    return res;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return applyCookies(res, NextResponse.redirect(new URL("/login", req.url)));
  }

  const email = session.user.email?.toLowerCase() ?? "";
  if (!email.endsWith(`@${allowedDomain}`)) {
    await supabase.auth.signOut();
    return applyCookies(res, NextResponse.redirect(new URL("/login?error=domain", req.url)));
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", session.user.id)
    .maybeSingle();

  const role = profileData?.role && RoleSchema.safeParse(profileData.role).success ? profileData.role : "member";

  if (!profileData) {
    await supabase.from("profiles").upsert({
      id: session.user.id,
      email: session.user.email ?? "",
      display_name: session.user.user_metadata.full_name ?? session.user.user_metadata.name ?? session.user.email ?? "",
      role
    });
  }

  if (pathname.startsWith("/tools/ops")) {
    if (role !== "admin") {
      return applyCookies(res, NextResponse.rewrite(new URL("/forbidden", req.url), { status: 403 }));
    }
  }

  return res;
}

export const config = {
  matcher: ["/(.*)"]
};
