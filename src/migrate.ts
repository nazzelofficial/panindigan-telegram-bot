import fs from "fs";
import path from "path";
import { testConnection, query } from "./database/connection";
import logger from "./logger";

async function run() {
  try {
    await testConnection();
    const sqlDir = path.join(__dirname, "..", "sql");
    const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const full = path.join(sqlDir, file);
      logger.info(`Running migration ${file}`);
      const sql = fs.readFileSync(full, 'utf8');
      await query(sql);
    }
    logger.info("Migrations complete.");
    process.exit(0);
  } catch (err) {
    logger.error("Migration failed: " + (err as Error).message);
    process.exit(1);
  }
}

run();
