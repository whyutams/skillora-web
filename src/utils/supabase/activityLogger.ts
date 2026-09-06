import { createAdminClient } from "./server";

export interface LogActivityParams {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("activity_logs").insert({
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      user_role: params.userRole || null,
      action: params.action,
      table_name: params.tableName,
      record_id: params.recordId || null,
      details: params.details || {},
      ip_address: params.ipAddress || null,
    });

    if (error) {
      console.error("Failed to insert into activity_logs:", error);
    }
  } catch (err) {
    console.error("Exception during logActivity:", err);
  }
}
