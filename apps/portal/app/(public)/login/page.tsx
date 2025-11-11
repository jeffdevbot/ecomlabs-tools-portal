import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecomlabs/ui";
import { getUserProfile } from "@ecomlabs/auth";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "ecomlabs.ca";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function signInWithGoogle() {
  "use server";
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`
    }
  });
  if (error) {
    throw error;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const profile = await getUserProfile();
  if (profile) {
    redirect("/dashboard");
  }

  const errorMessage =
    searchParams.error === "domain"
      ? `Please sign in with your @${allowedDomain} Google account.`
      : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Ecomlabs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Use your Google Workspace account to access the tools portal.
          </p>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <form action={signInWithGoogle}>
            <Button type="submit" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
