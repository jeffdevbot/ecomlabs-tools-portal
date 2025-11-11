import { requireRole } from "@ecomlabs/auth";

export async function requireAdmin() {
  return requireRole("admin");
}
