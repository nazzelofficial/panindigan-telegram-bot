import { query } from "../connection";

export async function addWarning(userId: number, adminId: number, reason: string) {
  const res = await query("INSERT INTO warnings(user_id, admin_id, reason, is_active, created_at) VALUES($1,$2,$3,TRUE,NOW()) RETURNING *", [userId, adminId, reason]);
  return res.rows[0];
}

export async function listWarnings(userId: number) {
  const res = await query("SELECT w.*, a.username as admin_username FROM warnings w LEFT JOIN users a ON a.id = w.admin_id WHERE w.user_id = $1 ORDER BY w.created_at DESC", [userId]);
  return res.rows;
}

export async function clearWarnings(userId: number) {
  await query("UPDATE warnings SET is_active = FALSE WHERE user_id = $1", [userId]);
}
