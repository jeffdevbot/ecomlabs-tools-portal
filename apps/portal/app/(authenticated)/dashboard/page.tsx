import { getUserProfile } from "@ecomlabs/auth";

export default async function DashboardPage() {
  const profile = await getUserProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Hi {profile?.display_name ?? profile?.email ?? "there"}</h1>
        <p className="text-sm text-muted-foreground">Welcome to the Ecomlabs tools portal.</p>
      </div>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Ops Tools</h2>
          <p className="text-sm text-muted-foreground">
            Access internal operations automation including ClickUp status insights.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">N-gram Analyzer</h2>
          <p className="text-sm text-muted-foreground">
            Coming soon: the migrated keyword N-gram research tool.
          </p>
        </div>
      </section>
    </div>
  );
}
