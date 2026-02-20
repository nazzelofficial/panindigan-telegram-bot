import { Context } from "grammy";
import { ADMIN_IDS } from "./config";
import { findUserByTelegramId } from "./database/queries/users.queries";

export async function adminOnly(ctx: Context) {
  const from = ctx.from;
  if (!from) return false;
  if (ADMIN_IDS.includes(from.id)) return true;
  const user = await findUserByTelegramId(from.id);
  return !!user && user.role === 'admin';
}

export async function superAdminOnly(ctx: Context) {
  const from = ctx.from;
  if (!from) return false;
  if (!ADMIN_IDS.length) return false;
  return from.id === ADMIN_IDS[0];
}

export function groupOnly(ctx: Context) {
  return ctx.chat && ctx.chat.type !== 'private';
}

export function privateOnly(ctx: Context) {
  return ctx.chat && ctx.chat.type === 'private';
}
