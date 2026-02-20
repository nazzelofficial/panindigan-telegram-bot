import { query } from "../connection";

export async function createSuggestion(userId: number, category: string, content: string) {
  const res = await query(
    `INSERT INTO suggestions(user_id, category, content, status, upvote_count, created_at)
     VALUES($1,$2,$3,'pending',0,NOW()) RETURNING *`,
    [userId, category, content]
  );
  const row = res.rows[0];
  // set reference number
  const ref = `SUG-${String(row.id).padStart(5, '0')}`;
  await query(`UPDATE suggestions SET reference_number = $1 WHERE id = $2`, [ref, row.id]);
  return { ...row, reference_number: ref };
}

export async function listSuggestionsByUser(userId: number) {
  const res = await query(`SELECT * FROM suggestions WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return res.rows;
}

export async function getSuggestionByRef(ref: string) {
  const res = await query(`SELECT * FROM suggestions WHERE reference_number = $1 LIMIT 1`, [ref]);
  return res.rows[0] || null;
}

export async function upvoteSuggestionByRef(ref: string, userId: number) {
  // ensure single upvote
  const s = await query(`SELECT id FROM suggestions WHERE reference_number = $1`, [ref]);
  if (!s.rows[0]) return null;
  const suggestionId = s.rows[0].id;
  try {
    await query(`INSERT INTO suggestion_upvotes(suggestion_id, user_id, created_at) VALUES($1,$2,NOW())`, [suggestionId, userId]);
    await query(`UPDATE suggestions SET upvote_count = upvote_count + 1 WHERE id = $1`, [suggestionId]);
    return true;
  } catch (err) {
    return false;
  }
}

export async function listTopSuggestions(limit = 10) {
  const res = await query(`SELECT * FROM suggestions ORDER BY upvote_count DESC LIMIT $1`, [limit]);
  return res.rows;
}

export async function listPendingSuggestions() {
  const res = await query(`SELECT * FROM suggestions WHERE status = 'pending' ORDER BY upvote_count DESC`);
  return res.rows;
}

export async function approveSuggestion(ref: string, adminId: number, message?: string) {
  await query(`UPDATE suggestions SET status = 'approved', admin_reply = $1 WHERE reference_number = $2`, [message || null, ref]);
}

export async function rejectSuggestion(ref: string, adminId: number, reason?: string) {
  await query(`UPDATE suggestions SET status = 'rejected', admin_reply = $1 WHERE reference_number = $2`, [reason || null, ref]);
}
