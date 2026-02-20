import raw from "../config.json";

const env = process.env;

export interface Config {
  bot: typeof raw.bot & { token?: string };
  prefix: typeof raw.prefix;
  database: typeof raw.database;
  levels: typeof raw.levels;
  moderation: typeof raw.moderation;
  rateLimit: typeof raw.rateLimit;
  maintenance: typeof raw.maintenance;
  welcome: typeof raw.welcome;
  goodbye: typeof raw.goodbye;
  help: typeof raw.help;
  nsfw: typeof raw.nsfw;
}

const config: Config = {
  bot: {
    ...raw.bot,
    token: env.BOT_TOKEN
  },
  prefix: raw.prefix,
  database: raw.database,
  levels: raw.levels,
  moderation: raw.moderation,
  rateLimit: raw.rateLimit,
  maintenance: raw.maintenance,
  welcome: raw.welcome,
  goodbye: raw.goodbye,
  help: raw.help,
  nsfw: raw.nsfw
};

export const ADMIN_IDS: number[] = env.ADMIN_IDS
  ? env.ADMIN_IDS.split(",").map((s) => Number(s.trim())).filter(Boolean)
  : [];

export const DATABASE_URL: string | undefined = env.DATABASE_URL;

export default config;
