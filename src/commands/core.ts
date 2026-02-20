import { Bot, InlineKeyboard } from "grammy";
import config, { ADMIN_IDS } from "../config";
import { upsertUser, findUserByTelegramId, banUserByTelegramId, unbanUserByTelegramId, setNotificationsByTelegramId, setLanguageByTelegramId, getAllUsers } from "../database/queries/users.queries";
import { setUserDateOfBirth, markUserAgeVerified, markUserAgeRejected } from "../database/queries/users.queries";
import { getOrCreateUserLevel, getTopUsers, setLevel, addXpAndGet } from "../database/queries/user_levels.queries";
import { query } from "../database/connection";
import { adminOnly } from "../guards";
import { addWarning, listWarnings, clearWarnings } from "../database/queries/warnings.queries";
import { renderWelcomeCard } from "../utils/welcome";
import { createSuggestion, listSuggestionsByUser, getSuggestionByRef, upvoteSuggestionByRef, listTopSuggestions, listPendingSuggestions, approveSuggestion, rejectSuggestion } from "../database/queries/suggestions.queries";
import { createBroadcastRecord, updateBroadcastProgress, listBroadcasts, getBroadcastById, setBroadcastStatus } from "../database/queries/broadcasts.queries";
import { addMute, unmute as unmuteUser, listActiveMutes } from "../database/queries/mutes.queries";
import { getMaintenanceState, setMaintenance, scheduleMaintenance, cancelMaintenanceSchedule } from "../database/queries/maintenance.queries";
import { getLastDailyClaim, addDailyClaim } from "../database/queries/daily.queries";
import { listFaqCategories, listFaqByCategory, getFaqById, addFaq, deleteFaq, listAllFaq } from "../database/queries/faq.queries";
import { createReport, listReportsByUser, listPendingReports, getReportById, updateReportStatus } from "../database/queries/reports.queries";
import { getWelcomeConfig, upsertWelcomeConfig, resetWelcomeConfig } from "../database/queries/welcome.queries";
import fs from 'fs';
import path from 'path';
import { getUserBadges } from "../database/queries/badges.queries";
import { getGroupRules, upsertGroupRules } from "../database/queries/rules.queries";
import { addQuote, listQuotes, getRandomQuote } from "../database/queries/quotes.queries";
import { createAudit } from "../database/queries/audit.queries";
import { superAdminOnly } from "../guards";
import verifyService from "../services/verify.service";

type HelpCategory = {
  id: string;
  title: string;
  commands: { cmd: string; desc: string; admin?: boolean }[];
};

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "general",
    title: "👤 General",
    commands: [
      { cmd: "/start", desc: "Welcome and register" },
      { cmd: "/help", desc: "Show help categories" },
      { cmd: "/me", desc: "Show your profile" },
      { cmd: "/ping", desc: "Latency check" },
      { cmd: "/status", desc: "Bot status" },
      { cmd: "/about", desc: "About the bot" },
      { cmd: "/suggest", desc: "Create a suggestion" },
      { cmd: "/mysuggestions", desc: "List your suggestions" },
      { cmd: "/tracksuggestion", desc: "Track a suggestion by ref" },
      { cmd: "/upvote", desc: "Upvote a suggestion" },
      { cmd: "/topsuggestions", desc: "Top suggestions" }
    ]
  },
  {
    id: "levels",
    title: "🏆 Levels",
    commands: [
      { cmd: "/rank", desc: "Show rank card" },
      { cmd: "/leaderboard", desc: "Top users in this chat" },
      { cmd: "/levels", desc: "Level tiers chart" }
    ]
  },
  {
    id: "settings",
    title: "🔔 Settings",
    commands: [
      { cmd: "/notify", desc: "Toggle notifications (on/off)" },
      { cmd: "/language", desc: "Set language (e.g. fil, en)" }
    ]
  },
  {
    id: "faq",
    title: "❓ FAQ",
    commands: [{ cmd: "/faq", desc: "Browse FAQs" }]
  },
  {
    id: "moderation",
    title: "🛡️ Moderation",
    commands: [
      { cmd: "/ban", desc: "Ban a user by Telegram ID", admin: true },
      { cmd: "/unban", desc: "Unban a user by Telegram ID", admin: true },
      { cmd: "/warn", desc: "Warn a user", admin: true },
      { cmd: "/warnings", desc: "List warnings for a user", admin: true },
      { cmd: "/clearwarnings", desc: "Clear warnings for a user", admin: true }
    ]
  },
  {
    id: "welcome",
    title: "🎨 Welcome/Goodbye",
    commands: [
      { cmd: "/setwelcome", desc: "Configure welcome card", admin: true },
      { cmd: "/previewwelcome", desc: "Preview welcome card", admin: true },
      { cmd: "/setgoodbye", desc: "Configure goodbye card", admin: true },
      { cmd: "/previewgoodbye", desc: "Preview goodbye card", admin: true },
      { cmd: "/resetwelcome", desc: "Reset welcome config to defaults", admin: true },
      { cmd: "/resetgoodbye", desc: "Reset goodbye config to defaults", admin: true },
      { cmd: "/togglewelcome", desc: "Enable/disable welcome messages", admin: true },
      { cmd: "/togglegoodbye", desc: "Enable/disable goodbye messages", admin: true }
    ]
  },
  {
    id: "suggestions_admin",
    title: "📬 Suggestions (Admin)",
    commands: [
      { cmd: "/suggestions", desc: "List pending suggestions", admin: true },
      { cmd: "/approvesuggestion", desc: "Approve a suggestion", admin: true },
      { cmd: "/rejectsuggestion", desc: "Reject a suggestion", admin: true }
    ]
  },
  {
    id: "nsfw",
    title: "🔞 NSFW",
    commands: [
      { cmd: "/nsfwlogs", desc: "View NSFW detection logs", admin: true },
      { cmd: "/clearnsfwlog", desc: "Clear NSFW logs for a user", admin: true },
      { cmd: "/togglensfw", desc: "Toggle NSFW scanning", admin: true },
      { cmd: "/nsfwconfig", desc: "Set chat NSFW options", admin: true },
      { cmd: "/nsfwstatus", desc: "Show NSFW status for chat", admin: true }
    ]
  },
  {
    id: "prefix",
    title: "🔤 Prefix",
    commands: [
      { cmd: "/setprefix", desc: "Set chat command prefix (admin)", admin: true },
      { cmd: "/listprefix", desc: "Show chat or global prefixes" }
    ]
  }
  ,
  {
    id: "admin_tools",
    title: "🧰 Admin Tools",
    commands: [
      { cmd: "/users", desc: "List recently active users", admin: true },
      { cmd: "/userinfo", desc: "Detailed user info", admin: true },
      { cmd: "/lookup", desc: "Find user by username", admin: true },
      { cmd: "/setlevel", desc: "Manually set a user's level (chat-scoped)", admin: true },
      { cmd: "/addxp", desc: "Add XP to a user (chat-scoped)", admin: true },
      { cmd: "/synccommands", desc: "Sync slash commands to Telegram", admin: true },
      { cmd: "/restart", desc: "Graceful restart (super admin)", admin: true }
    ]
  }
  ,
  {
    id: "broadcasts",
    title: "📣 Broadcasts",
    commands: [
      { cmd: "/broadcast", desc: "Start interactive broadcast (admin)", admin: true },
      { cmd: "/broadcaststatus", desc: "Status of latest broadcast", admin: true },
      { cmd: "/broadcasthistory", desc: "Recent broadcasts", admin: true },
      { cmd: "/broadcastcancel", desc: "Cancel an in-progress broadcast", admin: true }
    ]
  },

  {
    id: "reports",
    title: "🚨 Reports",
    commands: [
      { cmd: "/report", desc: "Report a message to admins" },
      { cmd: "/myreports", desc: "List your reports" },
      { cmd: "/reports", desc: "List pending reports", admin: true },
      { cmd: "/dismissreport", desc: "Dismiss a report", admin: true },
      { cmd: "/actionreport", desc: "Take action on a report (warn|ban)", admin: true }
    ]
  },
  {
    id: "maintenance",
    title: "🔧 Maintenance",
    commands: [
      { cmd: "/maintenance", desc: "Maintenance control: on/off/schedule/status", admin: true }
    ]
  },
  {
    id: "rewards",
    title: "🎁 Daily & Badges",
    commands: [
      { cmd: "/daily", desc: "Claim daily reward" },
      { cmd: "/streak", desc: "Show daily streak" },
      { cmd: "/badges", desc: "Show your badges" }
    ]
  }
  ,
  {
    id: "community",
    title: "🤝 Community",
    commands: [
      { cmd: "/shoutout", desc: "Send a shoutout to a member" },
      { cmd: "/rules", desc: "Show group rules" },
      { cmd: "/setrules", desc: "Set group rules (admin)", admin: true },
      { cmd: "/quote", desc: "Save a quoted message as a quote" },
      { cmd: "/quotes", desc: "List saved quotes" },
      { cmd: "/whois", desc: "Public profile lookup" },
      { cmd: "/afk", desc: "Set yourself as AFK" },
      { cmd: "/trivia", desc: "Start a trivia round" }
    ]
  }
];

function buildCategoriesKeyboard() {
  const kb = new InlineKeyboard();
  for (const cat of HELP_CATEGORIES) {
    kb.text(cat.title, `help:cat:${cat.id}`).row();
  }
  return kb;
}

function buildCommandsPage(categoryId: string, page = 0, perPage = 6) {
  const category = HELP_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return { text: "Kategorya hindi matagpuan.", keyboard: new InlineKeyboard() };
  const start = page * perPage;
  const slice = category.commands.slice(start, start + perPage);
  const lines = slice.map((c) => `${c.cmd} — ${c.desc}${c.admin ? ' (admin)' : ''}`);
  const text = `**${category.title}**\n\n${lines.join("\n")}\n\n${config.help.footer}`;
  const kb = new InlineKeyboard();
  if (page > 0) kb.text("◀ Prev", `help:page:${categoryId}:${page - 1}`);
  if (start + perPage < category.commands.length) kb.text("Next ▶", `help:page:${categoryId}:${page + 1}`);
  kb.row().text("Back", `help:back`);
  return { text, keyboard: kb };
}

export function registerCoreCommands(bot: Bot) {
  // In-memory quick state
  const shoutoutCooldown = new Map<number, number>(); // userId -> last shoutout ts
  const afkMap = new Map<number, { reason: string; since: number }>();
  const triviaSessions = new Map<number, { answer: string; expires: number; question: string; prizeXp: number }>();

  bot.command("start", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    await upsertUser({ telegram_id: from.id, username: from.username || null, first_name: from.first_name || null, last_name: from.last_name || null });
    // If user has no DOB or not verified, ask privately for DOB (YYYY-MM-DD)
    const dbUser = await findUserByTelegramId(from.id);
    if (!dbUser?.date_of_birth || !dbUser?.is_age_verified) {
      await ctx.reply('Maligayang pagdating! Bago magpatuloy, kailangan naming i-verify ang iyong edad (14+). Paki-type ang iyong petsa ng kapanganakan dito sa grupong ito sa format YYYY-MM-DD. Ang impormasyon ay mananatiling pribado.');
      // mark in session to expect DOB
      (ctx as any).session = (ctx as any).session || {};
      (ctx as any).session._awaiting_dob = true;
      return;
    }
    const kb = new InlineKeyboard().text("FAQ", "faq").text("Help", "help").row().text("My Profile", "myprofile");
    await ctx.reply(`Maligayang pagdating, ${from.first_name || ''}!`, { reply_markup: kb });
  });

  bot.command("help", async (ctx) => {
    const kb = buildCategoriesKeyboard();
    await ctx.reply("Pumili ng category:", { reply_markup: kb });
  });

  bot.callbackQuery("help:cat:*", async (ctx) => {
    const data = ctx.callbackQuery.data || "";
    const [, , catId] = data.split(":");
    const page = buildCommandsPage(catId, 0);
    await ctx.api.editMessageText(ctx.chat!.id, ctx.callbackQuery.message!.message_id, page.text, { parse_mode: "Markdown", reply_markup: page.keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("help:page:*", async (ctx) => {
    const data = ctx.callbackQuery.data || "";
    const [, , catId, pageStr] = data.split(":");
    const pageNum = Number(pageStr || 0);
    const page = buildCommandsPage(catId, pageNum);
    await ctx.api.editMessageText(ctx.chat!.id, ctx.callbackQuery.message!.message_id, page.text, { parse_mode: "Markdown", reply_markup: page.keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("help:back", async (ctx) => {
    const kb = buildCategoriesKeyboard();
    await ctx.api.editMessageText(ctx.chat!.id, ctx.callbackQuery.message!.message_id, "Pumili ng category:", { reply_markup: kb });
    await ctx.answerCallbackQuery();
  });

  bot.command("ping", async (ctx) => {
    const sent = await ctx.reply("Pinging...");
    const latency = Date.now() - (sent.date * 1000);
    try {
      await ctx.api.editMessageText(ctx.chat!.id, sent.message_id, `Pong — ${latency} ms`);
    } catch {}
  });

  bot.command("status", async (ctx) => {
    const uptime = Math.floor(process.uptime());
    let dbLatency = "N/A";
    try {
      const start = Date.now();
      await query("SELECT 1");
      dbLatency = `${Date.now() - start} ms`;
    } catch {}
    // naive admin count: admins with last_active within 5 minutes
    let onlineAdmins = 0;
    try {
      const res = await query("SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND last_active > NOW() - INTERVAL '5 minutes'");
      onlineAdmins = Number(res.rows[0].c || 0);
    } catch {}
    const totalUsersRes = await query("SELECT COUNT(*) as c FROM users");
    const totalUsers = Number(totalUsersRes.rows[0].c || 0);
    const mem = process.memoryUsage();
    const memMb = Math.round((mem.rss / 1024 / 1024) * 10) / 10;
    const latencyIndicator = '🟢';
    await ctx.reply(`Uptime: ${uptime}s\nAPI Latency: ${latencyIndicator} \nDB Latency: ${dbLatency}\nOnline Admins: ${onlineAdmins}\nTotal Users: ${totalUsers}\nMemory: ${memMb} MB`);
  });

  bot.command("verifystatus", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const allowed = verifyService.isVerified();
    const last = verifyService.getLastVerificationResponse();
    await ctx.reply(`Verified: ${allowed}\nEndpoint: ${process.env.API_VERIFY_URL || 'https://api.panindigan.com/verify'}\nInstance: ${process.env.INSTANCE_ID || process.env.HOSTNAME || 'n/a'}\nResponse: ${JSON.stringify(last)}`);
  });

  bot.command("me", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const dbUser = await findUserByTelegramId(from.id);
    const level = await getOrCreateUserLevel(dbUser?.id || 0, undefined);
    const tier = config.levels.tiers.slice().reverse().find((t) => level.level >= t.level) || config.levels.tiers[0];
    const nextTier = config.levels.tiers.find((t) => t.level > level.level);
    const xpNeeded = nextTier ? (nextTier.xpRequired - level.xp) : 0;
    const progress = nextTier ? Math.floor((level.xp / nextTier.xpRequired) * 100) : 100;
    let profile = `ID: ${from.id}\nUsername: ${from.username || '—'}\nName: ${from.first_name || ''} ${from.last_name || ''}\nLevel: ${level.level} (${tier.name})\nXP: ${level.xp}\nNext Level In: ${xpNeeded} XP\nProgress: ${progress}%`;
    if (dbUser?.date_of_birth) {
      try {
        const dob = new Date(dbUser.date_of_birth);
        const ageNow = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        profile += `\nDOB: ${dbUser.date_of_birth} — Edad: ${ageNow}`;
      } catch {}
    }
    await ctx.reply(profile);
  });

  bot.command("rank", async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/) || [];
    let targetId: number | undefined;
    if (args[1]) targetId = Number(args[1]);
    const from = ctx.from;
    const idToUse = targetId || (from && from.id) || undefined;
    if (!idToUse) return;
    const dbUser = await findUserByTelegramId(idToUse);
    const level = await getOrCreateUserLevel(dbUser?.id || 0, ctx.chat?.id);
    await ctx.reply(`${dbUser?.first_name || 'User'} — Level ${level.level}\nXP: ${level.xp}\nTotal Messages: ${level.total_messages}`);
  });

  bot.command("leaderboard", async (ctx) => {
    const top = await getTopUsers(10, ctx.chat?.id);
    const lines = top.map((t: any, i: number) => `#${i + 1} ${t.username || '—'} — L${t.level} (${t.xp} XP)`);
    await ctx.reply(`Top ${top.length} Users:\n\n${lines.join("\n")}`);
  });

  bot.command("levels", async (ctx) => {
    const lines = config.levels.tiers.map((t: any) => `Level ${t.level} — ${t.name} — ${t.xpRequired} XP`);
    await ctx.reply(`Level Tiers:\n\n${lines.join("\n")}`);
  });

  // --- Member settings: notifications & language
  bot.command('notify', async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const user = await findUserByTelegramId(from.id);
    if (!user) return ctx.reply('Please register first with /start');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const val = args[1]?.toLowerCase();
    if (val === 'on' || val === 'off') {
      const enabled = val === 'on';
      await setNotificationsByTelegramId(from.id, enabled);
      return ctx.reply(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
    }
    // toggle if no arg
    const current = !!user.notifications_enabled;
    const newVal = !current;
    await setNotificationsByTelegramId(from.id, newVal);
    await ctx.reply(`Notifications ${newVal ? 'enabled' : 'disabled'}`);
  });

  bot.command('language', async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const user = await findUserByTelegramId(from.id);
    if (!user) return ctx.reply('Please register first with /start');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const code = args[1];
    if (!code) {
      const current = user.language || config.bot.defaultLanguage || 'fil';
      return ctx.reply(`Current language: ${current}\nTo change: /language <code> (e.g. fil, en)`);
    }
    await setLanguageByTelegramId(from.id, code);
    await ctx.reply(`Language set to ${code}`);
  });

  // --- Admin commands merged here ---
  bot.command("ban", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    const reason = args.slice(2).join(' ') || 'No reason provided';
    if (!id) return ctx.reply('Usage: /ban <user_telegram_id> <reason>');
    await banUserByTelegramId(id, reason);
    await ctx.reply(`User ${id} has been banned. Reason: ${reason}`);
  });

  bot.command("unban", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    if (!id) return ctx.reply('Usage: /unban <user_telegram_id>');
    await unbanUserByTelegramId(id);
    await ctx.reply(`User ${id} has been unbanned.`);
  });

  bot.command("warn", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    const reason = args.slice(2).join(' ') || 'No reason provided';
    if (!id) return ctx.reply('Usage: /warn <user_telegram_id> <reason>');
    const user = await findUserByTelegramId(id);
    if (!user) return ctx.reply('User not found');
    await addWarning(user.id, ctx.from!.id, reason);
    await ctx.reply(`Warned user ${id}. Reason: ${reason}`);
  });

  bot.command("warnings", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    if (!id) return ctx.reply('Usage: /warnings <user_telegram_id>');
    const user = await findUserByTelegramId(id);
    if (!user) return ctx.reply('User not found');
    const warns = await listWarnings(user.id);
    if (!warns.length) return ctx.reply('No warnings found');
    const lines = warns.map((w: any) => `${w.created_at} — ${w.reason} — active:${w.is_active}`);
    await ctx.reply(lines.join('\n'));
  });

  bot.command("clearwarnings", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    if (!id) return ctx.reply('Usage: /clearwarnings <user_telegram_id>');
    const user = await findUserByTelegramId(id);
    if (!user) return ctx.reply('User not found');
    await clearWarnings(user.id);
    await ctx.reply('Warnings cleared.');
  });

  bot.command("setwelcome", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const from = ctx.from;
    if (!from) return;
    (ctx as any).session = (ctx as any).session || {};
    (ctx as any).session._setwelcome = { step: 1, chatId: ctx.chat?.id };
    await ctx.reply('Send the welcome message text (you can use {name}, {group}, {count})');
  });

  bot.command("previewwelcome", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const from = ctx.from;
    if (!from) return;
    const chatId = ctx.chat?.id;
    let cfg: any = null;
    if (chatId) cfg = await getWelcomeConfig(chatId as number);
    const msg = cfg?.welcome_message || config.welcome.defaultMessage;
    const color = cfg?.text_color || config.welcome.defaultTextColor;
    const bg = cfg?.background_image || config.welcome.defaultBackground;
    const buf = await renderWelcomeCard({ name: from.first_name || 'Guest', group: ctx.chat?.title || 'Group', count: 123, textColor: color, backgroundPath: bg });
    await ctx.replyWithPhoto(buf as any, { caption: 'Preview' });
  });

  bot.command('setgoodbye', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied.');
    const from = ctx.from;
    if (!from) return;
    (ctx as any).session = (ctx as any).session || {};
    (ctx as any).session._setgoodbye = { step: 1, chatId: ctx.chat?.id };
    await ctx.reply('Send the goodbye message text (you can use {name}, {group})');
  });

  bot.command('previewgoodbye', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied.');
    const from = ctx.from; if (!from) return;
    const chatId = ctx.chat?.id;
    let cfg: any = null;
    if (chatId) cfg = await getWelcomeConfig(chatId as number);
    const msg = cfg?.goodbye_message || config.goodbye.defaultMessage;
    const color = cfg?.text_color || config.goodbye.defaultTextColor || config.welcome.defaultTextColor;
    const bg = cfg?.background_image || config.goodbye.defaultBackground || config.welcome.defaultBackground;
    const buf = await renderWelcomeCard({ name: from.first_name || 'Guest', group: ctx.chat?.title || 'Group', count: 0, textColor: color, backgroundPath: bg });
    await ctx.replyWithPhoto(buf as any, { caption: 'Preview Goodbye' });
  });

  bot.command('resetwelcome', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const chatId = ctx.chat?.id; if (!chatId) return ctx.reply('Use inside group');
    await resetWelcomeConfig(chatId as number);
    await createAudit(ctx.from?.id || null, 'reset_welcome', { chat_id: chatId });
    await ctx.reply('Welcome configuration reset to defaults.');
  });

  bot.command('resetgoodbye', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const chatId = ctx.chat?.id; if (!chatId) return ctx.reply('Use inside group');
    await resetWelcomeConfig(chatId as number);
    await createAudit(ctx.from?.id || null, 'reset_goodbye', { chat_id: chatId });
    await ctx.reply('Goodbye configuration reset to defaults.');
  });

  bot.command('togglegoodbye', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const val = args[1];
    if (!val || !['on','off'].includes(val)) return ctx.reply('Usage: /togglegoodbye <on|off> (use inside the group)');
    const chatId = ctx.chat?.id; if (!chatId) return ctx.reply('Use inside a group');
    const enabled = val === 'on';
    await upsertWelcomeConfig(chatId as number, { is_goodbye_enabled: enabled, updated_by: ctx.from?.id || undefined });
    await createAudit(ctx.from?.id || null, 'toggle_goodbye', { chat_id: chatId, enabled });
    await ctx.reply(`Goodbye messages for this chat are now ${enabled ? 'ENABLED' : 'DISABLED'}`);
  });

  // --- Rules ---
  bot.command('setrules', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const chatId = ctx.chat?.id; if (!chatId) return ctx.reply('Use inside a group');
    const text = ctx.message?.text?.split(/\s+/).slice(1).join(' ') || '';
    if (!text) return ctx.reply('Usage: /setrules <rules text>');
    await upsertGroupRules(chatId as number, text, ctx.from?.id || undefined);
    await createAudit(ctx.from?.id || null, 'set_rules', { chat_id: chatId });
    await ctx.reply('Group rules updated.');
  });

  bot.command('rules', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('Use inside a group');
    const r = await getGroupRules(chatId as number);
    if (!r || !r.rules_text) return ctx.reply('No rules set for this group.');
    await ctx.reply(`Group Rules:\n\n${r.rules_text}`);
  });

  // --- Quotes ---
  bot.command('quote', async (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (!reply) return ctx.reply('Reply to a message with /quote to save it.');
    const chatId = ctx.chat?.id; if (!chatId) return ctx.reply('Use inside a group');
    const quoteText = reply.text || reply.caption || (reply.sticker ? '[sticker]' : '');
    const authorId = reply.from?.id || null;
    const authorName = reply.from ? `${reply.from.first_name || ''} ${reply.from.last_name || ''}`.trim() : null;
    const rec = await addQuote(chatId as number, reply.message_id, authorId as any, authorName, quoteText, ctx.from?.id ?? undefined);                                                                                                                                                     
    await createAudit(ctx.from?.id || null, 'add_quote', { chat_id: chatId, quote_id: rec.id });
    await ctx.reply(`Quote saved as #${rec.id}`);
  });

  bot.command('quotes', async (ctx) => {
    const chatId = ctx.chat?.id; if (!chatId) return ctx.reply('Use inside a group');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const page = Math.max(0, Number(args[1] || 0));
    const rows = await listQuotes(chatId as number, 10, page * 10);
    if (!rows.length) return ctx.reply('No quotes found.');
    const lines = rows.map((r: any) => `#${r.id} — ${r.quote_text} — by ${r.author_name || 'unknown'}`);
    await ctx.reply(lines.join('\n\n'));
  });

  // --- Whois (public) ---
  bot.command('whois', async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/) || [];
    const target = args[1];
    if (!target) return ctx.reply('Usage: /whois <telegram_id|@username>');
    let user: any = null;
    if (target.startsWith('@')) {
      const res = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [target.slice(1)]);
      user = res.rows[0];
    } else if (/^\d+$/.test(target)) {
      user = await findUserByTelegramId(Number(target));
    } else {
      const res = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [target]);
      user = res.rows[0];
    }
    if (!user) return ctx.reply('User not found');
    const level = await getOrCreateUserLevel(user.id, ctx.chat?.id);
    await ctx.reply(`User: ${user.telegram_id}\nUsername: ${user.username || '—'}\nName: ${user.first_name || ''} ${user.last_name || ''}\nLevel: ${level.level} — XP: ${level.xp}`);
  });

  // --- Shoutout ---
  bot.command('shoutout', async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    const message = args.slice(2).join(' ') || '';
    if (!id) return ctx.reply('Usage: /shoutout <user_id> [message]');
    const now = Date.now();
    const last = shoutoutCooldown.get(ctx.from!.id) || 0;
    if (now - last < 6 * 60 * 60 * 1000) return ctx.reply('Shoutout cooldown: 6 hours');
    shoutoutCooldown.set(ctx.from!.id, now);
    const name = `tg://user?id=${id}`;
    try {
      await ctx.api.sendMessage(ctx.chat!.id, `<a href="tg://user?id=${id}">Member</a> — ${message || 'Shoutout!'} `, { parse_mode: 'HTML' });
      await ctx.reply('Shoutout sent.');
    } catch (err) {
      await ctx.reply('Failed to send shoutout.');
    }
  });

  // --- AFK ---
  bot.command('afk', async (ctx) => {
    const reason = ctx.message?.text?.split(/\s+/).slice(1).join(' ') || 'AFK';
    afkMap.set(ctx.from!.id, { reason, since: Date.now() });
    await ctx.reply(`You are now AFK: ${reason}`);
  });

  // --- Trivia (simple) ---
  bot.command('trivia', async (ctx) => {
    const questions = [
      { q: 'What is the capital of the Philippines?', a: 'manila' },
      { q: 'What is 2+2?', a: '4' },
      { q: 'What color is the sky on a clear day?', a: 'blue' }
    ];
    const pick = questions[Math.floor(Math.random() * questions.length)];
    triviaSessions.set(ctx.chat!.id, { answer: pick.a.toLowerCase(), expires: Date.now() + 30000, question: pick.q, prizeXp: 20 });
    await ctx.reply(`Trivia: ${pick.q} (First correct answer wins ${20} XP). You have 30 seconds.`);
  });

  bot.command("togglewelcome", async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply("Access denied.");
    const args = ctx.message?.text?.split(/\s+/) || [];
    const val = args[1];
    if (!val || !['on', 'off'].includes(val)) return ctx.reply('Usage: /togglewelcome <on|off>');
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('This command must be used in a group chat');
    if (val === 'on') {
      await ctx.reply('Welcome enabled (note: persistence not fully implemented in this simplified build)');
    } else {
      await ctx.reply('Welcome disabled (note: persistence not fully implemented in this simplified build)');
    }
  });

  // --- Mute / Unmute / Mutelist
  bot.command('mute', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    const dur = args[2] ? Number(args[2]) : undefined; // minutes
    const reason = args.slice(3).join(' ') || null;
    if (!id) return ctx.reply('Usage: /mute <user_telegram_id> [minutes] [reason]');
    const u = await findUserByTelegramId(id);
    if (!u) return ctx.reply('User not found');
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('This command must be used in a group chat');
    const until = dur ? new Date(Date.now() + dur * 60 * 1000).toISOString() : null;
    await addMute(u.id, chatId as number, ctx.from?.id || null, reason, until);
    await createAudit(ctx.from?.id || null, 'mute', { user_id: u.id, chat_id: chatId, until, reason });
    await ctx.reply(`User ${id} muted ${dur ? `for ${dur} minutes` : 'indefinitely'}.`);
  });

  bot.command('unmute', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    if (!id) return ctx.reply('Usage: /unmute <user_telegram_id>');
    const u = await findUserByTelegramId(id);
    if (!u) return ctx.reply('User not found');
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('This command must be used in a group chat');
    await unmuteUser(u.id, chatId as number);
    await createAudit(ctx.from?.id || null, 'unmute', { user_id: u.id, chat_id: chatId });
    await ctx.reply(`User ${id} unmuted.`);
  });

  bot.command('mutelist', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('Use inside a group');
    const rows = await listActiveMutes(chatId as number);
    if (!rows.length) return ctx.reply('No active mutes');
    const lines = rows.map((r: any) => `${r.user_id} (${r.username || '—'}) — until: ${r.muted_until || '∞'} — by: ${r.muted_by}`);
    await ctx.reply(lines.join('\n'));
  });

  // --- Suggestions (member + admin)
  bot.command("suggest", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    (ctx as any).session = (ctx as any).session || {};
    (ctx as any).session._suggest = { step: 1 };
    await ctx.reply('Pumili ng kategorya: feature, content, bug, general');
  });

  bot.on('message', async (ctx) => {
    const s = (ctx as any).session || {};
    if (s._suggest) {
      const step = s._suggest.step;
      if (step === 1) {
        s._suggest.category = ctx.message?.text || 'general';
        s._suggest.step = 2;
        await ctx.reply('I-type ang detalye ng suggestion:');
        return;
      }
      if (step === 2) {
        const content = ctx.message?.text || '';
        const from = ctx.from!;
        const user = await findUserByTelegramId(from.id);
        const created = await createSuggestion(user.id, s._suggest.category, content);
        delete s._suggest;
        await ctx.reply(`Salamat! Reference: ${created.reference_number}`);
        return;
      }
    }

    // handle setwelcome multi-step
    if (s._setwelcome) {
      const step = s._setwelcome.step;
      if (step === 1) {
        s._setwelcome.message = ctx.message?.text || '';
        s._setwelcome.step = 2;
        await ctx.reply('Now send a text color in hex (e.g. #FFFFFF) or type "skip" to use default.');
        return;
      }
      if (step === 2) {
        const txt = (ctx.message?.text || '').trim();
        if (txt.toLowerCase() === 'skip') s._setwelcome.textColor = config.welcome.defaultTextColor;
        else if (/^#([0-9A-Fa-f]{6})$/.test(txt)) s._setwelcome.textColor = txt;
        else { await ctx.reply('Invalid color. Use hex like #RRGGBB or type "skip".'); return; }
        s._setwelcome.step = 3;
        await ctx.reply('Send background image (attach photo), provide a direct image URL, or type "default" to use built-in background.');
        return;
      }
      if (step === 3) {
        const chatId = s._setwelcome.chatId;
        let bgPath: string | null = null;
        try {
          if (ctx.message?.photo && ctx.message.photo.length) {
            const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            const f = await ctx.api.getFile(fileId);
            const filePath = f.file_path;
            const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
            const assetsDir = path.join(process.cwd(), 'assets');
            await fs.promises.mkdir(assetsDir, { recursive: true });
            const dest = path.join(assetsDir, `welcome_bg_${chatId}.jpg`);
            const res = await fetch(url);
            const buf = Buffer.from(await res.arrayBuffer());
            await fs.promises.writeFile(dest, buf);
            bgPath = dest;
          } else if (typeof ctx.message?.text === 'string' && ctx.message.text.trim().startsWith('http')) {
            const url = ctx.message.text.trim();
            const assetsDir = path.join(process.cwd(), 'assets');
            await fs.promises.mkdir(assetsDir, { recursive: true });
            const dest = path.join(assetsDir, `welcome_bg_${chatId}.jpg`);
            const res = await fetch(url);
            const buf = Buffer.from(await res.arrayBuffer());
            await fs.promises.writeFile(dest, buf);
            bgPath = dest;
          } else if (typeof ctx.message?.text === 'string' && ctx.message.text.trim().toLowerCase() === 'default') {
            bgPath = config.welcome.defaultBackground;
          } else {
            await ctx.reply('No valid image provided. Please attach a photo or provide a URL.');
            return;
          }
          // persist
          await upsertWelcomeConfig(chatId, { welcome_message: s._setwelcome.message, text_color: s._setwelcome.textColor, background_image: bgPath, updated_by: ctx.from?.id ?? undefined });                                                                                                                                                                                            
          await createAudit(ctx.from?.id || null, 'set_welcome', { chat_id: chatId, message: s._setwelcome.message });
          const buf = await renderWelcomeCard({ name: ctx.from?.first_name || 'Guest', group: ctx.chat?.title || 'Group', count: 123, textColor: s._setwelcome.textColor, backgroundPath: bgPath || undefined });
          await ctx.replyWithPhoto(buf as any, { caption: 'Saved welcome configuration. Preview above.' });
          delete s._setwelcome;
        } catch (err) {
          await ctx.reply('Failed to process background image — please try again.');
        }
        return;
      }
    }

    // handle setgoodbye multi-step
    if (s._setgoodbye) {
      const step = s._setgoodbye.step;
      if (step === 1) {
        s._setgoodbye.message = ctx.message?.text || '';
        s._setgoodbye.step = 2;
        await ctx.reply('Now send a text color in hex (e.g. #FFFFFF) or type "skip" to use default.');
        return;
      }
      if (step === 2) {
        const txt = (ctx.message?.text || '').trim();
        if (txt.toLowerCase() === 'skip') s._setgoodbye.textColor = config.goodbye.defaultTextColor || config.welcome.defaultTextColor;
        else if (/^#([0-9A-Fa-f]{6})$/.test(txt)) s._setgoodbye.textColor = txt;
        else { await ctx.reply('Invalid color. Use hex like #RRGGBB or type "skip".'); return; }
        s._setgoodbye.step = 3;
        await ctx.reply('Send background image (attach photo), provide a direct image URL, or type "default" to use built-in background.');
        return;
      }
      if (step === 3) {
        const chatId = s._setgoodbye.chatId;
        let bgPath: string | null = null;
        try {
          if (ctx.message?.photo && ctx.message.photo.length) {
            const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            const f = await ctx.api.getFile(fileId);
            const filePath = f.file_path;
            const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
            const assetsDir = path.join(process.cwd(), 'assets');
            await fs.promises.mkdir(assetsDir, { recursive: true });
            const dest = path.join(assetsDir, `goodbye_bg_${chatId}.jpg`);
            const res = await fetch(url);
            const buf = Buffer.from(await res.arrayBuffer());
            await fs.promises.writeFile(dest, buf);
            bgPath = dest;
          } else if (typeof ctx.message?.text === 'string' && ctx.message.text.trim().startsWith('http')) {
            const url = ctx.message.text.trim();
            const assetsDir = path.join(process.cwd(), 'assets');
            await fs.promises.mkdir(assetsDir, { recursive: true });
            const dest = path.join(assetsDir, `goodbye_bg_${chatId}.jpg`);
            const res = await fetch(url);
            const buf = Buffer.from(await res.arrayBuffer());
            await fs.promises.writeFile(dest, buf);
            bgPath = dest;
          } else if (typeof ctx.message?.text === 'string' && ctx.message.text.trim().toLowerCase() === 'default') {
            bgPath = config.goodbye.defaultBackground || config.welcome.defaultBackground;
          } else {
            await ctx.reply('No valid image provided. Please attach a photo or provide a URL.');
            return;
          }
          // persist
          await upsertWelcomeConfig(chatId, { goodbye_message: s._setgoodbye.message, text_color: s._setgoodbye.textColor, background_image: bgPath, updated_by: ctx.from?.id ?? undefined });                                                                                                                                                                                            
          await createAudit(ctx.from?.id || null, 'set_goodbye', { chat_id: chatId, message: s._setgoodbye.message });
          const buf = await renderWelcomeCard({ name: ctx.from?.first_name || 'Guest', group: ctx.chat?.title || 'Group', count: 0, textColor: s._setgoodbye.textColor, backgroundPath: bgPath || undefined });
          await ctx.replyWithPhoto(buf as any, { caption: 'Saved goodbye configuration. Preview above.' });
          delete s._setgoodbye;
        } catch (err) {
          await ctx.reply('Failed to process background image — please try again.');
        }
        return;
      }
    }

    // allow other message handlers to proceed
  });

  // global message handler for AFK and trivia answers
  bot.on('message', async (ctx) => {
    // If session awaiting DOB, try to parse message as YYYY-MM-DD
    const s = (ctx as any).session || {};
    if (s._awaiting_dob && ctx.message?.text && ctx.from) {
      const txt = ctx.message.text.trim();
      const m = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) {
        await ctx.reply('Mali ang format. Paki-type ang petsa sa format YYYY-MM-DD (hal.: 2008-02-20).');
        return;
      }
      const dob = new Date(txt + 'T00:00:00Z');
      if (isNaN(dob.getTime())) {
        await ctx.reply('Hindi valid ang petsa. Pakisubukang muli.');
        return;
      }
      const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      // persist DOB
      await setUserDateOfBirth(ctx.from.id, txt).catch(() => {});
      if (age >= 14) {
        await markUserAgeVerified(ctx.from.id).catch(() => {});
        await ctx.reply('Salamat — na-verify ang iyong edad. Maaari ka nang gumamit ng lahat ng features.');
      } else {
        await markUserAgeRejected(ctx.from.id).catch(() => {});
        await ctx.reply('Paumanhin—kinakailangan ang edad na 14+ para magamit ang bot. Kung mali ang petsa, i-type muli ang /start upang magbigay ng tamang petsa.');
      }
      s._awaiting_dob = false;
      (ctx as any).session = s;
      return;
    }

    // clear AFK when user sends a message
    if (ctx.from && afkMap.has(ctx.from.id)) {
      afkMap.delete(ctx.from.id);
      await ctx.reply('Welcome back — your AFK status has been removed.');
    }

    // notify when replying to an AFK user
    const reply = ctx.message?.reply_to_message;
    if (reply && reply.from && afkMap.has(reply.from.id)) {
      const a = afkMap.get(reply.from.id)!;
      await ctx.reply(`${reply.from.first_name || 'User'} is AFK: ${a.reason} (since ${new Date(a.since).toLocaleString()})`);
    }

    // trivia answer check
    if (ctx.chat && triviaSessions.has(ctx.chat.id) && ctx.message?.text) {
      const sess = triviaSessions.get(ctx.chat.id)!;
      if (Date.now() > sess.expires) { triviaSessions.delete(ctx.chat.id); return; }
      const txt = ctx.message.text.toLowerCase().trim();
      if (txt === sess.answer) {
        // award xp if possible
        const user = await findUserByTelegramId(ctx.from!.id);
        if (user) {
          try { await addXpAndGet(user.id, sess.prizeXp, ctx.chat?.id); } catch {}
        }
        triviaSessions.delete(ctx.chat.id);
        await ctx.reply(`${ctx.from!.first_name || 'User'} answered correctly and won ${sess.prizeXp} XP!`);
      }
    }
  });

  bot.command('mysuggestions', async (ctx) => {
    const from = ctx.from; if (!from) return;
    const user = await findUserByTelegramId(from.id);
    if (!user) return ctx.reply('I-register muna: /start');
    const rows = await listSuggestionsByUser(user.id);
    if (!rows.length) return ctx.reply('Walang suggestions');
    const lines = rows.map((r: any) => `${r.reference_number} — ${r.category} — ${r.status}`);
    await ctx.reply(lines.join('\n'));
  });

  bot.command('tracksuggestion', async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/) || [];
    const ref = args[1];
    if (!ref) return ctx.reply('Usage: /tracksuggestion <reference>');
    const s = await getSuggestionByRef(ref);
    if (!s) return ctx.reply('Not found');
    await ctx.reply(`${s.reference_number} — ${s.status} — Upvotes: ${s.upvote_count} \n${s.admin_reply || ''}`);
  });

  bot.command('upvote', async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/) || [];
    const ref = args[1];
    if (!ref) return ctx.reply('Usage: /upvote <reference>');
    const ok = await upvoteSuggestionByRef(ref, ctx.from!.id);
    if (!ok) return ctx.reply('You have already upvoted or invalid reference');
    await ctx.reply('Upvoted!');
  });

  bot.command('topsuggestions', async (ctx) => {
    const top = await listTopSuggestions(10);
    if (!top.length) return ctx.reply('No suggestions yet');
    const lines = top.map((t: any) => `${t.reference_number} — ${t.category} — ${t.upvote_count} votes`);
    await ctx.reply(lines.join('\n'));
  });

  bot.command('suggestions', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const pending = await listPendingSuggestions();
    if (!pending.length) return ctx.reply('No pending suggestions');
    const lines = pending.map((p: any) => `${p.reference_number} — ${p.category} — ${p.upvote_count} votes`);
    await ctx.reply(lines.join('\n'));
  });

  bot.command('approvesuggestion', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const ref = args[1];
    const msg = args.slice(2).join(' ') || '';
    if (!ref) return ctx.reply('Usage: /approvesuggestion <ref> [message]');
    await approveSuggestion(ref, ctx.from!.id, msg);
    await ctx.reply('Suggestion approved');
  });

  bot.command('rejectsuggestion', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const ref = args[1];
    const reason = args.slice(2).join(' ') || '';
    if (!ref) return ctx.reply('Usage: /rejectsuggestion <ref> [reason]');
    await rejectSuggestion(ref, ctx.from!.id, reason);
    await ctx.reply('Suggestion rejected');
  });

  // --- NSFW admin ---
  bot.command('nsfwlogs', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const page = Number(args[1] || 1);
    const perPage = 10;
    const offset = (page - 1) * perPage;
    const res = await query(`SELECT nl.*, u.username FROM nsfw_logs nl LEFT JOIN users u ON u.id = nl.user_id ORDER BY detected_at DESC LIMIT $1 OFFSET $2`, [perPage, offset]);
    if (!res.rows.length) return ctx.reply('No NSFW logs');
    const lines = res.rows.map((r: any) => `${r.detected_at} — ${r.username || r.user_id} — ${r.confidence_score} — ${r.action_taken}`);
    await ctx.reply(lines.join('\n'));
  });

  bot.command('clearnsfwlog', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    if (!id) return ctx.reply('Usage: /clearnsfwlog <user_telegram_id>');
    await query(`DELETE FROM nsfw_logs WHERE user_id = (SELECT id FROM users WHERE telegram_id = $1)`, [id]);
    await ctx.reply('Cleared NSFW logs for user');
  });

  bot.command('togglensfw', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const val = args[1];
    if (!val || !['on','off'].includes(val)) return ctx.reply('Usage: /togglensfw <on|off> (use inside the group)');
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('This command must be used in a group chat');
    const enabled = val === 'on';
    try {
      const { updateChatSettings } = await import("../database/queries/chat_settings.queries");
      await updateChatSettings(chatId as number, { nsfw_enabled: enabled });
      await ctx.reply(`NSFW scanning for this chat is now ${enabled ? 'ENABLED' : 'DISABLED'}`);
    } catch (err) {
      await ctx.reply('Failed to update setting — check logs');
    }
  });

  bot.command('nsfwconfig', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const key = args[1];
    const val = args[2];
    if (!key) return ctx.reply('Usage: /nsfwconfig <setting> <value> — available: threshold, deleteOnDetect, notifyUser, autoWarn, autoBanAfterWarnings');
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('Use inside a group to set chat-level NSFW config');
    const map: any = {
      'threshold': 'nsfw_threshold',
      'deleteOnDetect': 'nsfw_delete_on_detect',
      'notifyUser': 'nsfw_notify_user',
      'autoWarn': 'nsfw_auto_warn',
      'autoBanAfterWarnings': 'nsfw_auto_ban_after_warnings'
    };
    const dbKey = map[key];
    if (!dbKey) return ctx.reply('Unknown setting');
    let parsed: any = val;
    if (dbKey === 'nsfw_threshold') parsed = Number(val);
    if (dbKey === 'nsfw_delete_on_detect' || dbKey === 'nsfw_notify_user' || dbKey === 'nsfw_auto_warn') parsed = (val === 'true' || val === 'on' || val === '1');
    if (dbKey === 'nsfw_auto_ban_after_warnings') parsed = Number(val);
    try {
      const { updateChatSettings } = await import('../database/queries/chat_settings.queries');
      await updateChatSettings(chatId as number, { [dbKey]: parsed });
      await createAudit(ctx.from?.id || null, 'nsfw_config', { chat_id: chatId, key: dbKey, value: parsed });
      await ctx.reply('NSFW setting updated for this chat.');
    } catch (err) {
      await ctx.reply('Failed to update setting');
    }
  });

  bot.command('nsfwstatus', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('Use inside a group to view chat-level NSFW status');
    const { getChatSettings } = await import('../database/queries/chat_settings.queries');
    const s = await getChatSettings(chatId as number);
    const lines = [
      `Global enabled: ${config.nsfw.enabled}`,
      `Chat enabled: ${s?.nsfw_enabled ?? 'inherit'}`,
      `Threshold: ${s?.nsfw_threshold ?? config.nsfw.threshold}`,
      `Delete on detect: ${s?.nsfw_delete_on_detect ?? config.nsfw.deleteOnDetect}`,
      `Notify user: ${s?.nsfw_notify_user ?? config.nsfw.notifyUser}`
    ];
    await ctx.reply(lines.join('\n'));
  });

  // --- FAQ browsing (multi-step via callback queries)
  bot.command('faq', async (ctx) => {
    const cats = await listFaqCategories();
    if (!cats.length) return ctx.reply('Walang FAQ entries.');
    const kb = new InlineKeyboard();
    for (const c of cats) kb.text(c, `faq:cat:${c}`).row();
    await ctx.reply('Pumili ng FAQ category:', { reply_markup: kb });
  });

  bot.callbackQuery('faq:cat:*', async (ctx) => {
    const data = ctx.callbackQuery.data || '';
    const [, , cat] = data.split(':');
    const rows = await listFaqByCategory(cat);
    if (!rows.length) return ctx.answerCallbackQuery({ text: 'Walang tanong sa category na ito.' });
    const kb = new InlineKeyboard();
    for (const r of rows) kb.text(r.question, `faq:q:${r.id}`).row();
    kb.text('Back', 'faq:back');
    await ctx.api.editMessageText(ctx.chat!.id, ctx.callbackQuery.message!.message_id, `**${cat} FAQs**\n\nPumili ng tanong:`, { parse_mode: 'Markdown', reply_markup: kb });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('faq:q:*', async (ctx) => {
    const data = ctx.callbackQuery.data || '';
    const [, , idStr] = data.split(':');
    const id = Number(idStr);
    const row = await getFaqById(id);
    if (!row) return ctx.answerCallbackQuery({ text: 'FAQ not found.' });
    const kb = new InlineKeyboard().text('Back', 'faq:cat:' + row.category);
    await ctx.api.editMessageText(ctx.chat!.id, ctx.callbackQuery.message!.message_id, `**Q:** ${row.question}\n\n**A:** ${row.answer}\n\n${config.help.footer}`, { parse_mode: 'Markdown', reply_markup: kb });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('faq:back', async (ctx) => {
    const cats = await listFaqCategories();
    const kb = new InlineKeyboard();
    for (const c of cats) kb.text(c, `faq:cat:${c}`).row();
    await ctx.api.editMessageText(ctx.chat!.id, ctx.callbackQuery.message!.message_id, 'Pumili ng FAQ category:', { reply_markup: kb });
    await ctx.answerCallbackQuery();
  });

  // --- About, Cancel, Feedback
  bot.command('about', async (ctx) => {
    await ctx.reply(`${config.bot.name} — v${config.bot.version}\n${config.bot.description}\nSupport: ${config.bot.supportGroupLink}\n${config.bot.developerCredit}`);
  });

  bot.command('cancel', async (ctx) => {
    (ctx as any).session = {};
    await ctx.reply('Ano mang kasalukuyang aksyon ay kinansela.');
  });

  bot.command('feedback', async (ctx) => {
    const text = ctx.message?.text?.split(/\s+/).slice(1).join(' ') || '';
    if (!text) return ctx.reply('Usage: /feedback <your message>');
    const from = ctx.from!;
    // notify admins
    const admins = ADMIN_IDS || [];
    for (const aid of admins) {
      try { await ctx.api.sendMessage(aid, `Feedback from ${from.first_name} (${from.id}):\n${text}`); } catch {}
    }
    await ctx.reply('Salamat sa feedback — ipapadala ko ito sa admin.');
  });

  // --- Reports (member -> admin review)
  bot.command('report', async (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (!reply) return ctx.reply('Reply to a message and use /report <category> [reason]');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const category = args[1] || 'other';
    const reason = args.slice(2).join(' ') || '';
    const reporter = await findUserByTelegramId(ctx.from!.id);
    const reportedTelegramId = reply.from?.id as number | undefined;
    const reportedUser = reportedTelegramId ? await findUserByTelegramId(reportedTelegramId) : null;
    const rep = await createReport(reporter.id, reportedUser?.id || null, ctx.chat?.id || null, reply.message_id || null, category, reason);
    // notify admins
    const admins = ADMIN_IDS || [];
    for (const aid of admins) {
      try {
        await ctx.api.sendMessage(aid, `New report #${rep.id}: category=${rep.category}\nReporter: ${reporter.username || reporter.first_name} (${reporter.telegram_id})\nReported: ${reportedUser ? (reportedUser.username || reportedUser.telegram_id) : 'unknown'}\nChat: ${ctx.chat?.id}\nReason: ${rep.reason}`);
      } catch {}
    }
    await ctx.reply('Report submitted — salamat sa pag-report.');
  });

  bot.command('myreports', async (ctx) => {
    const user = await findUserByTelegramId(ctx.from!.id);
    if (!user) return ctx.reply('Please /start to register first');
    const rows = await listReportsByUser(user.id);
    if (!rows.length) return ctx.reply('Wala kang mga reports.');
    const lines = rows.map((r: any) => `#${r.id} — ${r.category} — ${r.status} — ${r.created_at}`);
    await ctx.reply(lines.join('\n'));
  });

  // Admin: list pending reports
  bot.command('reports', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const pending = await listPendingReports(50, 0);
    if (!pending.length) return ctx.reply('No pending reports');
    for (const p of pending) {
      const kb = new InlineKeyboard().text('Dismiss', `report:action:${p.id}:dismiss`).text('Warn', `report:action:${p.id}:warn`).text('Ban', `report:action:${p.id}:ban`).row().text('View Message', `report:view:${p.id}`);
      const text = `#${p.id} — ${p.category}\nReporter: ${p.reporter_username || ''}\nReported: ${p.reported_username || ''}\nReason: ${p.reason || ''}\nCreated: ${p.created_at}`;
      await ctx.reply(text, { reply_markup: kb });
    }
  });

  bot.command('dismissreport', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = Number(args[1]);
    if (!id) return ctx.reply('Usage: /dismissreport <report_id>');
    await updateReportStatus(id, 'dismissed');
    await createAudit(ctx.from?.id || null, 'dismiss_report', { report_id: id });
    await ctx.reply('Report dismissed');
  });

  bot.command('actionreport', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = Number(args[1]);
    const action = args[2];
    if (!id || !action || !['warn','ban'].includes(action)) return ctx.reply('Usage: /actionreport <report_id> <warn|ban>');
    const rep = await getReportById(id);
    if (!rep) return ctx.reply('Report not found');
    if (action === 'warn') {
      if (rep.reported_user_id) {
        await addWarning(rep.reported_user_id, ctx.from!.id, `Action from report #${id}`);
      }
      await updateReportStatus(id, 'actioned');
      await createAudit(ctx.from?.id || null, 'action_report_warn', { report_id: id });
      await ctx.reply('User warned and report marked as actioned');
    } else if (action === 'ban') {
      // ban by telegram id if available
      if (rep.reported_user_id) {
        const u = await query('SELECT telegram_id FROM users WHERE id = $1', [rep.reported_user_id]);
        const tId = u.rows[0]?.telegram_id;
        if (tId) {
          await banUserByTelegramId(tId, `Action from report #${id}`);
        }
      }
      await updateReportStatus(id, 'actioned');
      await createAudit(ctx.from?.id || null, 'action_report_ban', { report_id: id });
      await ctx.reply('User banned and report marked as actioned');
    }
  });

  // Report action callbacks
  bot.callbackQuery('report:action:*', async (ctx) => {
    const data = ctx.callbackQuery.data || '';
    const [, , idStr, action] = data.split(':');
    const id = Number(idStr);
    if (!(await adminOnly(ctx))) return ctx.answerCallbackQuery({ text: 'Access denied' });
    if (action === 'dismiss') {
      await updateReportStatus(id, 'dismissed');
      await createAudit(ctx.from?.id || null, 'dismiss_report', { report_id: id });
      await ctx.api.editMessageReplyMarkup(ctx.chat!.id, ctx.callbackQuery.message!.message_id, undefined);
      await ctx.answerCallbackQuery({ text: 'Report dismissed' });
      return;
    }
    if (action === 'warn') {
      const rep = await getReportById(id);
      if (rep && rep.reported_user_id) {
        await addWarning(rep.reported_user_id, ctx.from!.id, `Action from report #${id}`);
      }
      await updateReportStatus(id, 'actioned');
      await createAudit(ctx.from?.id || null, 'action_report_warn', { report_id: id });
      await ctx.answerCallbackQuery({ text: 'User warned' });
      return;
    }
    if (action === 'ban') {
      const rep = await getReportById(id);
      if (rep && rep.reported_user_id) {
        const u = await query('SELECT telegram_id FROM users WHERE id = $1', [rep.reported_user_id]);
        const tId = u.rows[0]?.telegram_id;
        if (tId) await banUserByTelegramId(tId, `Action from report #${id}`);
      }
      await updateReportStatus(id, 'actioned');
      await createAudit(ctx.from?.id || null, 'action_report_ban', { report_id: id });
      await ctx.answerCallbackQuery({ text: 'User banned' });
      return;
    }
  });

  bot.callbackQuery('report:view:*', async (ctx) => {
    const data = ctx.callbackQuery.data || '';
    const [, , idStr] = data.split(':');
    const id = Number(idStr);
    if (!(await adminOnly(ctx))) return ctx.answerCallbackQuery({ text: 'Access denied' });
    const rep = await getReportById(id);
    if (!rep) return ctx.answerCallbackQuery({ text: 'Report not found' });
    await ctx.answerCallbackQuery();
    await ctx.reply(`Report #${id}:\nCategory: ${rep.category}\nReason: ${rep.reason}\nChat: ${rep.chat_id}\nMessage ID: ${rep.message_id}`);
  });

  // --- Broadcasts (interactive simplified flow)
  bot.command('broadcast', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    (ctx as any).session = (ctx as any).session || {};
    (ctx as any).session._broadcast = { step: 1 };
    await ctx.reply('Broadcast flow started. Step 1: Send the header/title for the broadcast.');
  });

  bot.command('broadcaststatus', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const rows = await listBroadcasts(1, 0);
    if (!rows.length) return ctx.reply('No broadcasts found');
    const b = rows[0];
    await ctx.reply(`Broadcast #${b.id} — status: ${b.status} — sent: ${b.sent_count} failed: ${b.failed_count} — created: ${b.created_at}`);
  });

  bot.command('broadcasthistory', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const rows = await listBroadcasts(10, 0);
    if (!rows.length) return ctx.reply('No broadcasts');
    const lines = rows.map((r: any) => `#${r.id} — ${r.status} — ${r.sent_count}/${r.failed_count} — ${r.created_at}`);
    await ctx.reply(lines.join('\n'));
  });

  bot.command('broadcastcancel', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    if (!id) return ctx.reply('Usage: /broadcastcancel <broadcast_id>');
    await setBroadcastStatus(id, 'cancelled');
    await createAudit(ctx.from?.id || null, 'broadcast_cancel', { id });
    await ctx.reply(`Broadcast #${id} cancelled.`);
  });

  // handle broadcast steps in main message handler
  bot.on('message', async (ctx) => {
    const s = (ctx as any).session || {};
    if (s._broadcast) {
      const step = s._broadcast.step;
      if (step === 1) {
        s._broadcast.header = ctx.message?.text || '';
        s._broadcast.step = 2;
        await ctx.reply('Step 2: Send broadcast message content (plain text).');
        return;
      }
      if (step === 2) {
        s._broadcast.message = ctx.message?.text || '';
        s._broadcast.step = 3;
        await ctx.reply(`Preview:\n---\n${s._broadcast.header}\n\n${s._broadcast.message}\n---\nType 'confirm' to send or 'cancel' to abort.`);
        return;
      }
      if (step === 3) {
        const txt = ctx.message?.text?.toLowerCase() || '';
        if (txt === 'confirm') {
          const rec = await createBroadcastRecord(s._broadcast.header || '', s._broadcast.message || '', ctx.from?.id || null);
          await ctx.reply('Sending broadcast...');
          let offset = 0;
          const batch = 100;
          let sent = 0;
          let failed = 0;
          while (true) {
            const users = await getAllUsers(batch, offset);
            if (!users.length) break;
            // check for cancellation
            const current = await getBroadcastById(rec.id);
            if (current && current.status === 'cancelled') {
              await updateBroadcastProgress(rec.id, sent, failed, 'cancelled');
              break;
            }
            for (const u of users) {
              try {
                await ctx.api.sendMessage(u.telegram_id, `📣 ${s._broadcast.header}\n\n${s._broadcast.message}\n\n${config.help.footer}`);
                sent++;
              } catch (err) {
                failed++;
              }
            }
            offset += users.length;
            await updateBroadcastProgress(rec.id, sent, failed, 'sending');
          }
          await updateBroadcastProgress(rec.id, sent, failed, 'completed');
          delete s._broadcast;
          await ctx.reply(`Broadcast completed. Sent: ${sent}, Failed: ${failed}`);
        } else {
          delete s._broadcast;
          await ctx.reply('Broadcast cancelled.');
        }
        return;
      }
    }
  });

  // --- Maintenance commands
  bot.command('maintenance', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const sub = args[1];
    if (!sub) return ctx.reply('Usage: /maintenance <on|off|schedule|cancel|status> [args]');
    if (sub === 'on' || sub === 'off') {
      const enabled = sub === 'on';
      await setMaintenance(enabled);
      await createAudit(ctx.from?.id || null, 'maintenance_toggle', { enabled });
      return ctx.reply(`Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
    if (sub === 'schedule') {
      const start = args[2];
      const end = args[3];
      if (!start || !end) return ctx.reply('Usage: /maintenance schedule <start> <end> (ISO datetime or HH:MM)');
      await scheduleMaintenance(start, end);
      await createAudit(ctx.from?.id || null, 'maintenance_schedule', { start, end });
      return ctx.reply(`Maintenance scheduled from ${start} to ${end}`);
    }
    if (sub === 'cancel') {
      await cancelMaintenanceSchedule();
      await createAudit(ctx.from?.id || null, 'maintenance_schedule_cancel', {});
      return ctx.reply('Maintenance schedule canceled');
    }
    if (sub === 'status') {
      const s = await getMaintenanceState();
      if (!s) return ctx.reply('No maintenance state');
      const lines = [`Enabled: ${s.is_enabled}`, `Message: ${s.message || '—'}`, `Scheduled: ${s.scheduled_start || '—'} -> ${s.scheduled_end || '—'}`];
      return ctx.reply(lines.join('\n'));
    }
    return ctx.reply('Unknown subcommand');
  });

  // --- Daily rewards
  bot.command('daily', async (ctx) => {
    const from = ctx.from; if (!from) return;
    const user = await findUserByTelegramId(from.id);
    if (!user) return ctx.reply('Please /start to register first');
    const last = await getLastDailyClaim(user.id);
    const now = new Date();
    if (last && (new Date(last.claimed_at).getTime() + 24*60*60*1000) > now.getTime()) {
      return ctx.reply('You have already claimed your daily reward in the last 24 hours.');
    }
    let streak = 1;
    if (last) {
      const diff = now.getTime() - new Date(last.claimed_at).getTime();
      if (diff <= 48*60*60*1000) streak = (last.streak_count || 0) + 1;
    }
    const xp = Math.max(10, Math.floor(50 * Math.min(1 + (streak/10), 3))); // simple formula
    await addDailyClaim(user.id, xp, streak);
    await ctx.reply(`Daily claimed! You received ${xp} XP. Current streak: ${streak} day(s).`);
  });

  bot.command('streak', async (ctx) => {
    const from = ctx.from; if (!from) return;
    const user = await findUserByTelegramId(from.id);
    if (!user) return ctx.reply('Please /start to register first');
    const last = await getLastDailyClaim(user.id);
    const streak = last?.streak_count || 0;
    await ctx.reply(`Your current daily streak: ${streak} day(s).`);
  });

  bot.command('badges', async (ctx) => {
    const from = ctx.from; if (!from) return;
    const user = await findUserByTelegramId(from.id);
    if (!user) return ctx.reply('Please /start to register first');
    const rows = await getUserBadges(user.id);
    if (!rows || !rows.length) return ctx.reply('Wala ka pang badges.');
    const lines = rows.map((b: any) => `${b.icon || ''} ${b.name} — ${b.description || ''}`);
    await ctx.reply(lines.join('\n'));
  });

  // --- Prefix management
  bot.command('setprefix', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const pref = args[1];
    if (!pref) return ctx.reply('Usage: /setprefix <prefix> (use inside group)');
    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('Use inside a group to set chat prefix');
    try {
      const { updateChatSettings } = await import('../database/queries/chat_settings.queries');
      await updateChatSettings(chatId as number, { command_prefix: pref });
      await createAudit(ctx.from?.id || null, 'set_prefix', { chat_id: chatId, prefix: pref });
      await ctx.reply(`Command prefix for this chat set to: ${pref}`);
    } catch (err) {
      await ctx.reply('Failed to set prefix — check logs');
    }
  });

  bot.command('listprefix', async (ctx) => {
    const chatId = ctx.chat?.id;
    let chatPref = null;
    if (chatId) {
      const { getChatSettings } = await import('../database/queries/chat_settings.queries');
      const s = await getChatSettings(chatId as number);
      chatPref = s?.command_prefix || null;
    }
    if (chatPref) {
      await ctx.reply(`This chat prefix: ${chatPref}`);
      return;
    }
    await ctx.reply(`Global prefixes: ${config.prefix.values.join(', ')}`);
  });

  // --- Admin: user management utilities
  bot.command('users', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const rows = await getAllUsers(20, 0);
    if (!rows.length) return ctx.reply('No users');
    const lines = rows.map((u: any) => `${u.telegram_id} — ${u.username || '—'} — last active: ${u.last_active}`);
    await ctx.reply(lines.join('\n'));
  });

  bot.command('userinfo', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const target = args[1];
    if (!target) return ctx.reply('Usage: /userinfo <telegram_id|username>');
    let user = null;
    if (target.startsWith('@')) {
      user = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [target.slice(1)]);
      user = user.rows[0];
    } else if (/^\d+$/.test(target)) {
      user = await findUserByTelegramId(Number(target));
    } else {
      const res = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [target]);
      user = res.rows[0];
    }
    if (!user) return ctx.reply('User not found');
    const level = await getOrCreateUserLevel(user.id, undefined);
    await ctx.reply(`User: ${user.telegram_id}\nUsername: ${user.username || '—'}\nName: ${user.first_name || ''} ${user.last_name || ''}\nRole: ${user.role}\nBanned: ${user.is_banned}\nLanguage: ${user.language}\nNotifications: ${user.notifications_enabled}\nLevel: ${level.level} — XP: ${level.xp}\nLast active: ${user.last_active}`);
  });

  bot.command('lookup', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const name = args[1];
    if (!name) return ctx.reply('Usage: /lookup <username>');
    const res = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [name.replace(/^@/, '')]);
    if (!res.rows.length) return ctx.reply('Not found');
    const u = res.rows[0];
    await ctx.reply(`Found: ${u.telegram_id} — ${u.username || '—'} — ${u.first_name || ''}`);
  });

  bot.command('setlevel', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    const lvl = args[2] ? Number(args[2]) : undefined;
    if (!id || typeof lvl !== 'number') return ctx.reply('Usage: /setlevel <user_telegram_id> <level>');
    const u = await findUserByTelegramId(id);
    if (!u) return ctx.reply('User not found');
    await setLevel(u.id, lvl, ctx.chat?.id);
    await createAudit(ctx.from?.id || null, 'set_level', { user_id: u.id, level: lvl });
    await ctx.reply(`Set level of ${id} to ${lvl}`);
  });

  bot.command('addxp', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const args = ctx.message?.text?.split(/\s+/) || [];
    const id = args[1] ? Number(args[1]) : undefined;
    const amt = args[2] ? Number(args[2]) : undefined;
    if (!id || typeof amt !== 'number') return ctx.reply('Usage: /addxp <user_telegram_id> <amount>');
    const u = await findUserByTelegramId(id);
    if (!u) return ctx.reply('User not found');
    const newRow = await addXpAndGet(u.id, amt, ctx.chat?.id);
    await createAudit(ctx.from?.id || null, 'add_xp', { user_id: u.id, amount: amt });
    await ctx.reply(`Added ${amt} XP to ${id}. New XP: ${newRow.xp}, Level: ${newRow.level}`);
  });

  bot.command('synccommands', async (ctx) => {
    if (!(await adminOnly(ctx))) return ctx.reply('Access denied');
    const commands = [
      { command: 'start', description: 'Welcome and register' },
      { command: 'help', description: 'Show help categories' },
      { command: 'about', description: 'About the bot' },
      { command: 'ping', description: 'Latency check' },
      { command: 'status', description: 'Bot status' },
      { command: 'me', description: 'Show your profile' },
      { command: 'rank', description: 'Show rank' },
      { command: 'leaderboard', description: 'Top users' },
      { command: 'faq', description: 'Browse FAQs' }
    ];
    try {
      await ctx.api.setMyCommands(commands as any);
      await ctx.reply('Commands synced to Telegram.');
    } catch (err) {
      await ctx.reply('Failed to sync commands.');
    }
  });

  bot.command('restart', async (ctx) => {
    if (!(await superAdminOnly(ctx))) return ctx.reply('Access denied');
    await createAudit(ctx.from?.id || null, 'restart', {});
    await ctx.reply('Restarting...');
    process.exit(0);
  });
}
