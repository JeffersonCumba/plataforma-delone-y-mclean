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
  console.error("Faltan variables de entorno de la base de datos");
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  console.log("Agregando columna attempts a mdl_user_email_verification...");
  await conn.execute(`
    ALTER TABLE mdl_user_email_verification
    ADD COLUMN attempts TINYINT UNSIGNED NOT NULL DEFAULT 0
    AFTER code_expires_at
  `);
  console.log("Migración v3 completada.");
  await conn.end();
}

main().catch((err) => {
  console.error("Error en migración v3:", err);
  process.exit(1);
});
