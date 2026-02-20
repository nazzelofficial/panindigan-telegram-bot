import { PoolClient } from "pg";
import { query, withTransaction } from "../connection";

export async function upsertUser(payload: {
  telegram_id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  const text = `INSERT INTO users(telegram_id, username, first_name, last_name)
    VALUES($1,$2,$3,$4)
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = NOW()
    RETURNING *`;
  const params = [payload.telegram_id, payload.username, payload.first_name, payload.last_name];
  const res = await query(text, params);
  return res.rows[0];
}

export async function setUserDateOfBirth(telegramId: number, dob: string) {
  const res = await query("UPDATE users SET date_of_birth = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *", [dob, telegramId]);
  return res.rows[0] || null;
}

export async function markUserAgeVerified(telegramId: number) {
  const res = await query("UPDATE users SET is_age_verified = TRUE, age_verified_at = NOW(), updated_at = NOW() WHERE telegram_id = $1 RETURNING *", [telegramId]);
  return res.rows[0] || null;
}

export async function markUserAgeRejected(telegramId: number) {
  const res = await query("UPDATE users SET is_age_verified = FALSE, age_verified_at = NULL, updated_at = NOW() WHERE telegram_id = $1 RETURNING *", [telegramId]);
  return res.rows[0] || null;
}

export async function findUserByTelegramId(telegramId: number) {
  const res = await query("SELECT * FROM users WHERE telegram_id = $1", [telegramId]);
  return res.rows[0] || null;
}

export async function isBannedByTelegramId(telegramId: number) {
  const res = await query("SELECT is_banned FROM users WHERE telegram_id = $1", [telegramId]);
  return res.rows[0] ? res.rows[0].is_banned : false;
}

export async function updateLastActive(userId: number) {
  await query("UPDATE users SET last_active = NOW(), updated_at = NOW() WHERE id = $1", [userId]);
}

export async function findUserById(id: number) {
  const res = await query("SELECT * FROM users WHERE id = $1", [id]);
  return res.rows[0] || null;
}

export async function banUserByTelegramId(telegramId: number, reason?: string) {
  const res = await query("UPDATE users SET is_banned = TRUE, updated_at = NOW() WHERE telegram_id = $1 RETURNING *", [telegramId]);
  return res.rows[0] || null;
}

export async function unbanUserByTelegramId(telegramId: number) {
  const res = await query("UPDATE users SET is_banned = FALSE, updated_at = NOW() WHERE telegram_id = $1 RETURNING *", [telegramId]);
  return res.rows[0] || null;
}

export async function setNotificationsByTelegramId(telegramId: number, enabled: boolean) {
  const res = await query("UPDATE users SET notifications_enabled = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *", [enabled, telegramId]);
  return res.rows[0] || null;
}

export async function setLanguageByTelegramId(telegramId: number, lang: string) {
  const res = await query("UPDATE users SET language = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *", [lang, telegramId]);
  return res.rows[0] || null;
}

export async function getAllUsers(limit = 100, offset = 0) {
  const res = await query("SELECT * FROM users ORDER BY last_active DESC LIMIT $1 OFFSET $2", [limit, offset]);
  return res.rows;
}

export async function findUserByUsername(username: string) {
  const res = await query("SELECT * FROM users WHERE username = $1 LIMIT 1", [username]);
  return res.rows[0] || null;
}
