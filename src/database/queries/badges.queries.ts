import { query } from "../connection";

export async function findBadgeByKey(key: string) {
  const res = await query("SELECT * FROM badges WHERE badge_key = $1 LIMIT 1", [key]);
  return res.rows[0] || null;
}

export async function createBadge(key: string, name: string, description: string, icon: string) {
  const res = await query("INSERT INTO badges(badge_key, name, description, icon) VALUES($1,$2,$3,$4) ON CONFLICT (badge_key) DO UPDATE SET name = EXCLUDED.name RETURNING *", [key, name, description, icon]);
  return res.rows[0];
}

export async function awardBadgeToUser(userId: number, badgeId: number, awardedBy?: number) {
  const res = await query("INSERT INTO user_badges(user_id, badge_id, awarded_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *", [userId, badgeId, awardedBy || null]);
  return res.rows[0] || null;
}

export async function getUserBadges(userId: number) {
  const res = await query("SELECT b.* FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = $1 ORDER BY ub.awarded_at DESC", [userId]);
  return res.rows;
}
