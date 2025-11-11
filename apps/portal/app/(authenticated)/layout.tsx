import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@ecomlabs/ui";
import { getUserProfile } from "@ecomlabs/auth";

async function signOut() {
  "use server";
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-foreground transition hover:text-primary">
              Dashboard
            </Link>
            <Link href="/tools/ops/chat" className="text-foreground transition hover:text-primary">
              Ops Chat
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{profile.display_name ?? profile.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-10">{children}</main>
    </div>
  );
}
