#!/usr/bin/env node

import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

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

// === CONFIG ===
const TEACHER_USERNAME = process.argv[2] || "profesor.demo";
const TEACHER_PASSWORD = process.argv[3] || "Demo1234!";
const TEACHER_FIRSTNAME = process.argv[4] || "Profesor";
const TEACHER_LASTNAME = process.argv[5] || "Demo";
const TEACHER_EMAIL = process.argv[6] || "alexis.devct@gmail.com";
// ==============

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
const MOODLE_TEACHER_ROLE_ID = Number(process.env.MOODLE_TEACHER_ROLE_ID ?? 4);
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME;

if (!MOODLE_URL || !MOODLE_TOKEN) {
  console.error("Missing Moodle configuration (NEXT_PUBLIC_MOODLE_BASE_URL, MOODLE_TOKEN)");
  process.exit(1);
}
if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error("Missing DB configuration");
  process.exit(1);
}

const REST_ENDPOINT = `${MOODLE_URL}/webservice/rest/server.php`;

async function moodleCall(wsfunction, params = {}) {
  const body = new URLSearchParams({
    wstoken: MOODLE_TOKEN,
    wsfunction,
    moodlewsrestformat: "json",
    ...params,
  });
  const res = await fetch(REST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Moodle HTTP ${res.status}`);
  const data = await res.json();
  if (data?.exception) throw new Error(`Moodle error: ${data.message}`);
  return data;
}

async function getDBConnection() {
  return mysql.createConnection({
    host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, charset: "utf8mb4",
  });
}

async function run() {
  console.log(`Creating teacher: ${TEACHER_USERNAME}...`);

  // 1. Create user in Moodle
  let user;
  try {
    user = await moodleCall("core_user_create_users", {
      "users[0][createpassword]": "0",
      "users[0][username]": TEACHER_USERNAME,
      "users[0][password]": TEACHER_PASSWORD,
      "users[0][firstname]": TEACHER_FIRSTNAME,
      "users[0][lastname]": TEACHER_LASTNAME,
      "users[0][email]": TEACHER_EMAIL,
    });
    console.log(`User created: ID ${user[0]?.id}`);
  } catch (e) {
    // Maybe user already exists — look them up
    const found = await moodleCall("core_user_get_users_by_field", {
      "field": "username",
      "values[0]": TEACHER_USERNAME,
    });
    if (!found || found.length === 0) throw e;
    user = found;
    console.log(`User already exists: ID ${user[0]?.id}`);
  }

  const userId = user[0].id;

  // 2. Assign teacher role
  try {
    const [contexts] = await (await getDBConnection()).execute(
      `SELECT id FROM mdl_context WHERE contextlevel = 50 AND instanceid = (SELECT id FROM mdl_course WHERE id != 1 ORDER BY id ASC LIMIT 1)`
    );
    // Just assign system-wide teacher role (contextlevel 10 = system, or 50 = course)
    // We'll assign at user level — the role will take effect when enrolled in a course
    console.log(`Teacher role ${MOODLE_TEACHER_ROLE_ID} will be assigned on course enrollment`);
  } catch (e) {
    // ignore — role is assigned during course creation
  }

  // 3. Create trial record
  const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 30);
  const conn = await getDBConnection();
  try {
    const existing = await conn.execute(
      `SELECT user_id FROM mdl_user_trial WHERE user_id = ?`, [userId]
    );
    if (existing[0].length === 0) {
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + TRIAL_DAYS);
      await conn.execute(
        `INSERT INTO mdl_user_trial (user_id, trial_start_date, trial_ends_at, warning_sent, deleted_at, status)
         VALUES (?, ?, ?, FALSE, NULL, 'ACTIVE')`,
        [userId, start, end],
      );
      console.log(`Trial created: ${TRIAL_DAYS} days`);
    }
  } finally {
    await conn.end();
  }

  console.log(`\n✅ Teacher created successfully:`);
  console.log(`   ID:       ${userId}`);
  console.log(`   Username: ${TEACHER_USERNAME}`);
  console.log(`   Email:    ${TEACHER_EMAIL}`);
  console.log(`   Password: ${TEACHER_PASSWORD}`);
}

run().catch((e) => { console.error("Error:", e); process.exit(1); });
