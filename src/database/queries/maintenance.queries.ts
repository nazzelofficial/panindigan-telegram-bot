import { query } from "../connection";

export async function getMaintenanceState() {
  const res = await query("SELECT * FROM maintenance_state WHERE id = 1");
  return res.rows[0] || null;
}

export async function setMaintenance(enabled: boolean, message?: string) {
  const res = await query("UPDATE maintenance_state SET is_enabled = $1, message = COALESCE($2, message), updated_at = NOW() WHERE id = 1 RETURNING *", [enabled, message || null]);
  return res.rows[0];
}

export async function scheduleMaintenance(start: string, end: string, message?: string) {
  const res = await query("UPDATE maintenance_state SET scheduled_start = $1, scheduled_end = $2, message = COALESCE($3, message), updated_at = NOW() WHERE id = 1 RETURNING *", [start, end, message || null]);
  return res.rows[0];
}

export async function cancelMaintenanceSchedule() {
  const res = await query("UPDATE maintenance_state SET scheduled_start = NULL, scheduled_end = NULL, updated_at = NOW() WHERE id = 1 RETURNING *");
  return res.rows[0];
}
