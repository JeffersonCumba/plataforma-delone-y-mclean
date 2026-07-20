#!/usr/bin/env node

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    });
  }
}

async function main() {
  loadEnv();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "moodle",
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS mdl_user_email_verification (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE,
      email VARCHAR(254) NOT NULL,
      verification_code VARCHAR(6) NULL,
      code_expires_at DATETIME NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES mdl_user(id) ON DELETE CASCADE
    )
  `);

  console.log("Table mdl_user_email_verification ready.");
  await conn.end();
}

main().catch(console.error);
