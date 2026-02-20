import { query } from "../connection";

export async function getOrCreateUserLevel(userId: number, chatId?: number) {
  const res = await query(
    `SELECT * FROM user_levels WHERE user_id = $1 AND ($2 IS NULL OR chat_id = $2) LIMIT 1`,
    [userId, chatId]
  );
  if (res.rows[0]) return res.rows[0];

  const insert = await query(
    `INSERT INTO user_levels(user_id, chat_id, level, xp, total_messages, rank, updated_at)
     VALUES($1,$2,1,0,0,0,NOW()) RETURNING *`,
    [userId, chatId]
  );
  return insert.rows[0];
}

export async function addXp(userId: number, amount: number, chatId?: number) {
  const res = await query(
    `UPDATE user_levels SET xp = xp + $1, total_messages = total_messages + 1, last_xp_gained = NOW(), updated_at = NOW()
     WHERE user_id = $2 AND ($3 IS NULL OR chat_id = $3) RETURNING *`,
    [amount, userId, chatId]
  );
  return res.rows[0];
}

export async function setLevel(userId: number, level: number, chatId?: number) {
  const res = await query(
    `UPDATE user_levels SET level = $1, updated_at = NOW() WHERE user_id = $2 AND ($3 IS NULL OR chat_id = $3) RETURNING *`,
    [level, userId, chatId]
  );
  return res.rows[0];
}

export async function addXpAndGet(userId: number, amount: number, chatId?: number) {
  await addXp(userId, amount, chatId);
  const res = await query(`SELECT * FROM user_levels WHERE user_id = $1 AND ($2 IS NULL OR chat_id = $2) LIMIT 1`, [userId, chatId]);
  return res.rows[0];
}

export async function getTopUsers(limit = 10, chatId?: number) {
  const res = await query(
    `SELECT ul.*, u.username FROM user_levels ul JOIN users u ON u.id = ul.user_id
     ${chatId ? "WHERE ul.chat_id = $2" : ""}
     ORDER BY xp DESC LIMIT $1`,
    chatId ? [limit, chatId] : [limit]
  );
  return res.rows;
}
