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
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
  });

  try {
    const [users] = await conn.execute(
      `SELECT id, username, email, firstname, lastname FROM mdl_user WHERE username = 'profesor.demo' LIMIT 1`,
    );
    if (users.length === 0) {
      console.error("User 'profesor.demo' not found");
      process.exit(1);
    }
    const user = users[0];
    console.log(`Usuario: ${user.firstname} ${user.lastname} (${user.username}) <${user.email}>`);

    const [trials] = await conn.execute(
      `SELECT id FROM mdl_user_trial WHERE user_id = ? LIMIT 1`,
      [user.id],
    );

    const warningEnd = new Date();
    warningEnd.setDate(warningEnd.getDate() + 3);

    if (trials.length === 0) {
      const start = new Date();
      const trialDays = Number(process.env.TRIAL_DAYS ?? 30);
      start.setDate(start.getDate() - trialDays + 3);
      await conn.execute(
        `INSERT INTO mdl_user_trial (user_id, trial_start_date, trial_ends_at, warning_sent, deleted_at, status)
         VALUES (?, ?, ?, FALSE, NULL, 'ACTIVE')`,
        [user.id, start, warningEnd],
      );
      console.log(`Trial creado: termina en 3 dias (${warningEnd.toISOString()})`);
    } else {
      await conn.execute(
        `UPDATE mdl_user_trial
            SET trial_ends_at = ?, warning_sent = FALSE, status = 'ACTIVE', deleted_at = NULL
          WHERE user_id = ?`,
        [warningEnd, user.id],
      );
      console.log(`Trial actualizado: termina en 3 dias (${warningEnd.toISOString()})`);
    }

    console.log("\nEjecutando cron de expiracion...\n");

    const headers = { "Content-Type": "application/json" };
    if (CRON_SECRET) {
      headers["x-cron-secret"] = CRON_SECRET;
    }

    const res = await fetch(`${APP_URL}/api/cron/trial-expiration`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Cron respondio con ${res.status}:`, text);
      process.exit(1);
    }

    const data = await res.json();
    console.log("Respuesta del cron:", JSON.stringify(data, null, 2));

    if (data.warningsSent > 0) {
      console.log(`\n✅ Email de advertencia enviado a ${user.email}`);
      console.log("Revisa la bandeja de entrada del usuario.");
    } else {
      console.log("\n⚠️ No se envio ningun email de advertencia.");
      console.log("Posibles causas:");
      console.log("  - El usuario 'profesor.demo' es admin y fue filtrado");
      console.log("  - El trial no esta dentro de la ventana de advertencia");
      console.log("  - El servidor SMTP no esta configurado");
    }

    const [after] = await conn.execute(
      `SELECT status, warning_sent, trial_ends_at FROM mdl_user_trial WHERE user_id = ?`,
      [user.id],
    );
    console.log("\nEstado final del trial:", JSON.stringify(after[0], null, 2));
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
