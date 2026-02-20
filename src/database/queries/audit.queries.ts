import { query } from "../connection";

export async function createAudit(adminId: number | null, action: string, details: object = {}) {
  const res = await query("INSERT INTO audit_logs(admin_id, action, details) VALUES($1,$2,$3) RETURNING *", [adminId, action, details]);
  return res.rows[0];
}
