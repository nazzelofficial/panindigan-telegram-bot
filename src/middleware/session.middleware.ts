import { Context, NextFunction } from "grammy";

const store = new Map<number, any>();

export function sessionMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    const id = ctx.from?.id;
    if (!id) return next();
    if (!store.has(id)) store.set(id, {});
    (ctx as any).session = store.get(id);
    await next();
    store.set(id, (ctx as any).session);
  };
}
