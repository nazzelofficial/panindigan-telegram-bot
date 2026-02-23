import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Professional color scheme for console
const colors = {
  error: "\x1b[31m",    // Red
  warn: "\x1b[33m",     // Yellow
  info: "\x1b[36m",     // Cyan
  debug: "\x1b[35m",    // Magenta
  reset: "\x1b[0m"      // Reset
};

// Custom format for professional logging
const professionalFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const levelUpper = level.toUpperCase().padEnd(7);
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${levelUpper}] ${message}${metaStr}`;
});

const coloredFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const levelUpper = level.toUpperCase().padEnd(7);
  const color = (colors as any)[level] || "";
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : "";
  return `${color}${timestamp} [${levelUpper}]${colors.reset} ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: "panindigan-bot",
    instance: process.env.INSTANCE_ID || process.env.HOSTNAME || "unknown"
  },
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        coloredFormat
      )
    }),
    // File output for all logs
    new winston.transports.File({
      filename: path.join(logsDir, "bot.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        professionalFormat
      )
    }),
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        professionalFormat
      )
    })
  ]
});

export default logger;
