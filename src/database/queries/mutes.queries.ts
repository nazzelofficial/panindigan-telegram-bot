import { query } from "../connection";

export async function addMute(userId: number, chatId: number, mutedBy: number | null, reason: string | null, mutedUntil: string | null) {
  const res = await query("INSERT INTO mutes(user_id, chat_id, muted_by, reason, muted_until, is_active) VALUES($1,$2,$3,$4,$5,TRUE) RETURNING *", [userId, chatId, mutedBy, reason, mutedUntil]);
  return res.rows[0];
}

export async function unmute(userId: number, chatId: number) {
  const res = await query("UPDATE mutes SET is_active = FALSE WHERE user_id = $1 AND chat_id = $2 AND is_active = TRUE RETURNING *", [userId, chatId]);
  return res.rows[0] || null;
}

export async function isUserMuted(userId: number, chatId: number) {
  const res = await query("SELECT 1 FROM mutes WHERE user_id = $1 AND chat_id = $2 AND is_active = TRUE LIMIT 1", [userId, chatId]);
  return !!res.rows[0];
}

export async function listActiveMutes(chatId: number) {
  const res = await query("SELECT m.*, u.username FROM mutes m LEFT JOIN users u ON u.id = m.user_id WHERE m.chat_id = $1 AND m.is_active = TRUE ORDER BY m.muted_until NULLS LAST", [chatId]);
  return res.rows;
}
