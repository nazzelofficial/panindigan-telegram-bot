import { query } from '../connection';

export async function addQuote(chatId: number, messageId: number, authorId: number | null, authorName: string | null, quoteText: string, createdBy?: number) {
  const res = await query('INSERT INTO quotes(chat_id, message_id, author_id, author_name, quote_text, created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [chatId, messageId, authorId || null, authorName || null, quoteText, createdBy || null]);
  return res.rows[0];
}

export async function listQuotes(chatId: number, limit = 10, offset = 0) {
  const res = await query('SELECT * FROM quotes WHERE chat_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [chatId, limit, offset]);
  return res.rows;
}

export async function getRandomQuote(chatId: number) {
  const res = await query('SELECT * FROM quotes WHERE chat_id = $1 ORDER BY RANDOM() LIMIT 1', [chatId]);
  return res.rows[0] || null;
}
