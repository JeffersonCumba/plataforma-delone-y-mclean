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
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.TRIAL_CRON_SECRET;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error("Missing DB configuration");
  process.exit(1);
}

async function run() {
  const conn = await mysql.createConnection({
    host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, charset: "utf8mb4",
  });

  try {
    // Find profesor.demo
    const [users] = await conn.execute(
      `SELECT id, username, email FROM mdl_user WHERE username = 'profesor.demo' LIMIT 1`,
    );
    if (users.length === 0) {
      console.error("User 'profesor.demo' not found");
      process.exit(1);
    }
    const user = users[0];

    // Find trial record
    const [trials] = await conn.execute(
      `SELECT id, trial_ends_at FROM mdl_user_trial WHERE user_id = ? LIMIT 1`,
      [user.id],
    );

    if (trials.length === 0) {
      console.log(`No trial record found for ${user.username} (ID ${user.id}). Creating one...`);
      const start = new Date();
      const end = new Date("2024-01-01");
      await conn.execute(
        `INSERT INTO mdl_user_trial (user_id, trial_start_date, trial_ends_at, warning_sent, deleted_at, status)
         VALUES (?, ?, ?, FALSE, NULL, 'ACTIVE')`,
        [user.id, start, end],
      );
      console.log("Trial record created with past date");
    } else {
      // Set trial as expired
      await conn.execute(
        `UPDATE mdl_user_trial SET trial_ends_at = '2024-01-01 00:00:00', warning_sent = FALSE, status = 'ACTIVE', deleted_at = NULL WHERE user_id = ?`,
        [user.id],
      );
      console.log(`Trial for ${user.username} (ID ${user.id}) set to expired`);
    }

    console.log("\nNow triggering cron...");

    // Trigger cron
    const headers = { "Content-Type": "application/json" };
    if (CRON_SECRET) headers["x-cron-secret"] = CRON_SECRET;

    const res = await fetch(`${APP_URL}/api/cron/trial-expiration`, {
      method: "GET",
      headers,
    });

    const data = await res.json();
    console.log("Cron response:", JSON.stringify(data, null, 2));

    // Check trial status after cron
    const [after] = await conn.execute(
      `SELECT status, deleted_at, trial_ends_at FROM mdl_user_trial WHERE user_id = ?`,
      [user.id],
    );
    console.log("\nFinal trial state:", JSON.stringify(after[0], null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await conn.end();
  }
}

run();
