import Link from "next/link";
import { Button } from "@ecomlabs/ui";

export const metadata = {
  title: "Access forbidden"
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/20 p-6 text-center">
      <div className="max-w-md space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">403</p>
        <h1 className="text-3xl font-semibold">You do not have access to this tool</h1>
        <p className="text-sm text-muted-foreground">
          Reach out to an administrator if you believe you should have access to the requested resource.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Return to dashboard</Link>
      </Button>
    </div>
  );
}
