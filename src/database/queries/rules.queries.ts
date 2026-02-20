import { query } from '../connection';

export async function getGroupRules(chatId: number) {
  const res = await query('SELECT * FROM group_rules WHERE chat_id = $1 LIMIT 1', [chatId]);
  return res.rows[0] || null;
}

export async function upsertGroupRules(chatId: number, rulesText: string, updatedBy?: number) {
  const res = await query("INSERT INTO group_rules(chat_id, rules_text, updated_by, updated_at) VALUES($1,$2,$3,NOW()) ON CONFLICT (chat_id) DO UPDATE SET rules_text = $2, updated_by = $3, updated_at = NOW() RETURNING *", [chatId, rulesText, updatedBy || null]);
  return res.rows[0];
}
