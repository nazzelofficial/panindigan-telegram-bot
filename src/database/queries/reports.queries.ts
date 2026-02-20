import { query } from "../connection";

export async function createReport(reporterId: number, reportedUserId: number | null, chatId: number | null, messageId: number | null, category: string, reason: string) {
  const res = await query("INSERT INTO reports(reporter_id, reported_user_id, chat_id, message_id, category, reason) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [reporterId, reportedUserId, chatId, messageId, category, reason]);
  return res.rows[0];
}

export async function listReportsByUser(reporterId: number) {
  const res = await query("SELECT r.*, u.username as reported_username FROM reports r LEFT JOIN users u ON u.id = r.reported_user_id WHERE r.reporter_id = $1 ORDER BY r.created_at DESC", [reporterId]);
  return res.rows;
}

export async function listPendingReports(limit = 20, offset = 0) {
  const res = await query("SELECT r.*, ru.username as reported_username, rep.username as reporter_username FROM reports r LEFT JOIN users ru ON ru.id = r.reported_user_id LEFT JOIN users rep ON rep.id = r.reporter_id WHERE r.status = 'pending' ORDER BY r.created_at DESC LIMIT $1 OFFSET $2", [limit, offset]);
  return res.rows;
}

export async function getReportById(id: number) {
  const res = await query("SELECT r.*, ru.username as reported_username, rep.username as reporter_username FROM reports r LEFT JOIN users ru ON ru.id = r.reported_user_id LEFT JOIN users rep ON rep.id = r.reporter_id WHERE r.id = $1", [id]);
  return res.rows[0] || null;
}

export async function updateReportStatus(id: number, status: string) {
  const res = await query("UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [status, id]);
  return res.rows[0];
}
