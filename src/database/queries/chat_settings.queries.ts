import { query } from "../connection";

export async function getChatNsfwEnabled(chatId: number) {
  const res = await query("SELECT nsfw_enabled FROM chat_settings WHERE chat_id = $1", [chatId]);
  if (!res.rows.length) return null;
  return res.rows[0].nsfw_enabled;
}

export async function setChatNsfwEnabled(chatId: number, enabled: boolean) {
  const res = await updateChatSettings(chatId, { nsfw_enabled: enabled });
  return res;
}

export async function getChatSettings(chatId: number) {
  const res = await query("SELECT * FROM chat_settings WHERE chat_id = $1", [chatId]);
  return res.rows[0] || null;
}

export async function updateChatSettings(chatId: number, payload: Record<string, any>) {
  // Build dynamic SET clause
  const keys = Object.keys(payload || {});
  if (!keys.length) {
    const existing = await query("SELECT * FROM chat_settings WHERE chat_id = $1", [chatId]);
    if (existing.rows[0]) return existing.rows[0];
    const ins = await query("INSERT INTO chat_settings(chat_id, updated_at) VALUES($1,NOW()) RETURNING *", [chatId]);
    return ins.rows[0];
  }
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;
  for (const k of keys) {
    sets.push(`${k} = $${idx}`);
    // @ts-ignore
    params.push((payload as any)[k]);
    idx++;
  }
  params.push(chatId);
  const text = `INSERT INTO chat_settings(chat_id, ${keys.join(',')}, updated_at) VALUES(${["$"+idx].concat(keys.map((_,i) => "$"+(i+1))).join(',')}, NOW()) ON CONFLICT (chat_id) DO UPDATE SET ${sets.join(',')}, updated_at = NOW() RETURNING *`;
  const res = await query(text, params.reverse());
  return res.rows[0];
}
