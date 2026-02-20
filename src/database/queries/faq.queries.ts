import { query } from "../connection";

export async function listFaqCategories() {
  const res = await query("SELECT DISTINCT category FROM faq WHERE is_active = TRUE ORDER BY category");
  return res.rows.map((r: any) => r.category);
}

export async function listFaqByCategory(category: string) {
  const res = await query("SELECT id, question FROM faq WHERE category = $1 AND is_active = TRUE ORDER BY sort_order, id", [category]);
  return res.rows;
}

export async function getFaqById(id: number) {
  const res = await query("SELECT * FROM faq WHERE id = $1", [id]);
  return res.rows[0] || null;
}

export async function addFaq(question: string, answer: string, keywords: string[] = [], category: string = 'general') {
  const res = await query("INSERT INTO faq(question, answer, keywords, category) VALUES($1,$2,$3,$4) RETURNING *", [question, answer, keywords, category]);
  return res.rows[0];
}

export async function deleteFaq(id: number) {
  const res = await query("UPDATE faq SET is_active = FALSE WHERE id = $1 RETURNING *", [id]);
  return res.rows[0];
}

export async function listAllFaq() {
  const res = await query("SELECT * FROM faq ORDER BY category, sort_order, id");
  return res.rows;
}
