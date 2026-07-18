#!/usr/bin/env node

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function loadEnv() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(projectRoot, ".env"),
    path.join(scriptDir, ".env"),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join("=").trim();
        }
      });
      return;
    }
  }
}

loadEnv();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error("Missing required database environment variables");
  process.exit(1);
}

async function runMigration() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
  });

  try {
    console.log("Running migration v2...");

    try {
      await connection.execute(`
        ALTER TABLE mdl_user_trial
        ADD COLUMN status ENUM('ACTIVE', 'WARNING', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
        ADD COLUMN warning_sent_at DATETIME NULL,
        ADD COLUMN expired_at DATETIME NULL;
      `);
      console.log("Added columns: status, warning_sent_at, expired_at");
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("Columns already exist, skipping ALTER TABLE");
      } else {
        throw err;
      }
    }

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS mdl_trial_audit_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES mdl_user(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Created table: mdl_trial_audit_log");

    await connection.execute(`
      UPDATE mdl_user_trial
      SET status = 'EXPIRED'
      WHERE deleted_at IS NOT NULL AND status = 'ACTIVE';
    `);
    console.log("Backfilled status for expired records");

    console.log("Migration v2 completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
