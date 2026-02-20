import { query } from "../connection";

export async function getWelcomeConfig(chatId: number) {
  const res = await query("SELECT * FROM welcome_goodbye_config WHERE chat_id = $1 LIMIT 1", [chatId]);
  return res.rows[0] || null;
}

export async function upsertWelcomeConfig(chatId: number, payload: Partial<{ is_welcome_enabled: boolean; is_goodbye_enabled: boolean; welcome_message: string; goodbye_message: string; background_image: string; text_color: string; font_family: string; updated_by: number }>) {
  const keys = Object.keys(payload || {});
  if (!keys.length) {
    const existing = await query("SELECT * FROM welcome_goodbye_config WHERE chat_id = $1", [chatId]);
    if (existing.rows[0]) return existing.rows[0];
    const ins = await query("INSERT INTO welcome_goodbye_config(chat_id, updated_at) VALUES($1,NOW()) RETURNING *", [chatId]);
    return ins.rows[0];
  }
  const cols = keys.join(',');
  const vals = keys.map((_, i) => `$${i + 1}`).join(',');
  const params = keys.map((k) => (payload as any)[k]);
  params.push(chatId);
  const insertCols = `${cols}, updated_at`;
  const insertVals = `${vals}, NOW()`;
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const text = `INSERT INTO welcome_goodbye_config(chat_id, ${insertCols}) VALUES($${keys.length + 1}, ${insertVals}) ON CONFLICT (chat_id) DO UPDATE SET ${setClause}, updated_at = NOW() RETURNING *`;
  const res = await query(text, params.reverse());
  return res.rows[0];
}

export async function resetWelcomeConfig(chatId: number) {
  await query("DELETE FROM welcome_goodbye_config WHERE chat_id = $1", [chatId]);
  return true;
}
