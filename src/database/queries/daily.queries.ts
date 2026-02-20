import { query } from "../connection";

export async function getLastDailyClaim(userId: number) {
  const res = await query("SELECT * FROM daily_rewards WHERE user_id = $1 ORDER BY claimed_at DESC LIMIT 1", [userId]);
  return res.rows[0] || null;
}

export async function addDailyClaim(userId: number, xpEarned: number, streakCount: number) {
  const res = await query("INSERT INTO daily_rewards(user_id, claimed_at, xp_earned, streak_count) VALUES($1,NOW(),$2,$3) RETURNING *", [userId, xpEarned, streakCount]);
  return res.rows[0];
}
