import { Context, NextFunction } from "grammy";
import config from "../config";
// use global fetch provided by Node 18+
import logger from "../logger";
import { query } from "../database/connection";
import { getChatSettings } from "../database/queries/chat_settings.queries";

// Use a lightweight, non-AI heuristic based on skin-tone pixel ratio via Jimp.
const tryRequire = (name: string) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(name);
  } catch (e) {
    return null;
  }
};
const Jimp = tryRequire('jimp');

async function estimateSkinRatio(buffer: Buffer) {
  if (!Jimp) return 0;
  try {
    const img = await Jimp.read(buffer as any);
    const { width, height } = img.bitmap;
    const total = Math.min(width * height, 20000);
    const step = Math.max(1, Math.floor((width * height) / total));
    let skinCount = 0;
    let sampled = 0;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) << 2;
        const pixel = img.bitmap.data;
        const r = pixel[idx];
        const g = pixel[idx + 1];
        const b = pixel[idx + 2];
        // simple rule-based skin detection
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const isSkin = r > 95 && g > 40 && b > 20 && (max - min) > 15 && r > g && r > b && (r - g) > 15;
        if (isSkin) skinCount++;
        sampled++;
        if (sampled >= total) break;
      }
      if ((sampled) >= total) break;
    }
    return sampled > 0 ? skinCount / sampled : 0;
  } catch (e) {
    return 0;
  }
}

// No AI model used; we rely on heuristic estimateSkinRatio

export function nsfwMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    if (!config.nsfw.enabled) return next();
    // check chat-level override (if set, it wins)
    const chatId = ctx.chat?.id;
    if (chatId) {
      try {
        const chatSetting = await getChatSettings(chatId as number);
        if (chatSetting && chatSetting.nsfw_enabled === false) return next();
        // override thresholds and flags from chat settings if present
        if (chatSetting) {
          // @ts-ignore
          if (typeof chatSetting.nsfw_threshold === 'number') config.nsfw.threshold = chatSetting.nsfw_threshold;
          // @ts-ignore
          if (typeof chatSetting.nsfw_delete_on_detect === 'boolean') config.nsfw.deleteOnDetect = chatSetting.nsfw_delete_on_detect;
          // @ts-ignore
          if (typeof chatSetting.nsfw_notify_user === 'boolean') config.nsfw.notifyUser = chatSetting.nsfw_notify_user;
        }
      } catch (err) {
        logger.warn("Failed to read chat nsfw setting: " + (err as Error).message);
      }
    }
    if (!ctx.message) return next();
    const photos = (ctx.message as any).photo;
    if (!photos || !photos.length) return next();

    const fileId = photos[photos.length - 1].file_id;
    try {
      const botFile = await ctx.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${botFile.file_path}`;
      const res = await fetch(fileUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      const skinRatio = await estimateSkinRatio(buffer);
      // Map skinRatio (0..1) to approximate confidence (0..1)
      const combined = skinRatio; 
      if (combined >= config.nsfw.threshold) {
        // delete message
        if (config.nsfw.deleteOnDetect) {
          try { await ctx.deleteMessage(); } catch {}
        }
        // log
        await query(`INSERT INTO nsfw_logs(user_id, chat_id, file_id, confidence_score, action_taken) VALUES($1,$2,$3,$4,$5)`, [ctx.from?.id || null, ctx.chat?.id || null, fileId, combined, config.nsfw.deleteOnDetect ? 'deleted' : 'warned']);
        if (config.nsfw.notifyUser && ctx.from) {
          try { await ctx.api.sendMessage(ctx.from.id, "⚠️ Ang ipinadalang larawan ay na-tag bilang hindi angkop at na-delete."); } catch {}
        }
        return;
      }
    } catch (err) {
      logger.error("NSFW check failed: " + (err as Error).message);
    }
    return next();
  };
}
