import { query } from "../connection";

export async function createBroadcastRecord(header: string, message: string, createdBy: number | null) {
  const res = await query("INSERT INTO broadcasts(header, message, status, created_at) VALUES($1,$2,$3,NOW()) RETURNING *", [header, message, 'pending']);
  return res.rows[0];
}

export async function updateBroadcastProgress(id: number, sentCount: number, failedCount: number, status: string) {
  const res = await query("UPDATE broadcasts SET sent_count = sent_count + $1, failed_count = failed_count + $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *", [sentCount, failedCount, status, id]);
  return res.rows[0];
}

export async function getBroadcastById(id: number) {
  const res = await query("SELECT * FROM broadcasts WHERE id = $1", [id]);
  return res.rows[0] || null;
}

export async function listBroadcasts(limit = 10, offset = 0) {
  const res = await query("SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, offset]);
  return res.rows;
}

export async function setBroadcastStatus(id: number, status: string) {
  const res = await query("UPDATE broadcasts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [status, id]);
  return res.rows[0];
}
