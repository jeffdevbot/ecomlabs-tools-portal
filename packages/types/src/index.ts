import { z } from "zod";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase() ?? "ecomlabs.ca";

export const RoleSchema = z.enum(["admin", "member"]);
export type Role = z.infer<typeof RoleSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().min(1).optional(),
  role: RoleSchema,
  created_at: z.string().optional()
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const OpsCommandSchema = z.object({
  type: z.literal("status"),
  client: z.string().min(1),
  scope: z.string().min(1)
});
export type OpsCommand = z.infer<typeof OpsCommandSchema>;

export const OpsStatusTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  assignees: z.array(z.string()),
  due: z.string(),
  hoursThisWeek: z.number().optional()
});
export type OpsStatusTask = z.infer<typeof OpsStatusTaskSchema>;

export const OpsStatusColumnSchema = z.object({
  name: z.string(),
  count: z.number(),
  tasks: z.array(OpsStatusTaskSchema)
});
export type OpsStatusColumn = z.infer<typeof OpsStatusColumnSchema>;

export const OpsStatusSummarySchema = z.object({
  columns: z.array(OpsStatusColumnSchema),
  dueSoon: z.array(
    z.object({
      bucket: z.string(),
      tasks: z.array(OpsStatusTaskSchema)
    })
  ),
  assigneeLoad: z.array(
    z.object({
      name: z.string(),
      hours: z.number(),
      expected: z.number()
    })
  )
});
export type OpsStatusSummary = z.infer<typeof OpsStatusSummarySchema>;

export const DomainEmailSchema = z.string().email().refine((value) => value.toLowerCase().endsWith(`@${allowedDomain}`), {
  message: `Only ${allowedDomain} accounts are allowed`
});
