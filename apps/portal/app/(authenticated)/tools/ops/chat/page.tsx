import { requireAdmin } from "@/lib/rbac";
import { OpsChat } from "./ops-chat";

export const metadata = {
  title: "Ops Chat"
};

export default async function OpsChatPage() {
  try {
    await requireAdmin();
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Forbidden</h1>
        <p className="text-sm text-muted-foreground">You do not have permission to access this tool.</p>
      </div>
    );
  }

  return <OpsChat />;
}
