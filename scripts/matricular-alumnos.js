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
const COURSE_ID = Number(process.argv[2]);
const COUNT = Number(process.argv[3] ?? 5);
const PREFIX = process.argv[4] || "alumno";
const PASSWORD = process.argv[5] || "Demo1234!";
// ==============

if (!COURSE_ID || !Number.isInteger(COURSE_ID)) {
  console.error("Usage: node scripts/matricular-alumnos.js <courseId> [count=5] [prefix=alumno] [password]");
  console.error("Example: node scripts/matricular-alumnos.js 4 5 alumno");
  process.exit(1);
}

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
const MOODLE_STUDENT_ROLE_ID = Number(process.env.MOODLE_STUDENT_ROLE_ID ?? 5);
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME;

if (!MOODLE_URL || !MOODLE_TOKEN) {
  console.error("Missing Moodle configuration"); process.exit(1);
}
if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error("Missing DB configuration"); process.exit(1);
}

const REST_ENDPOINT = `${MOODLE_URL}/webservice/rest/server.php`;

async function moodleCall(wsfunction, params = {}) {
  const body = new URLSearchParams({
    wstoken: MOODLE_TOKEN, wsfunction, moodlewsrestformat: "json", ...params,
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
  const createdIds = [];

  for (let i = 1; i <= COUNT; i++) {
    const username = `${PREFIX}${i}`;
    const email = `${PREFIX}${i}@example.com`;
    const firstname = `${PREFIX.charAt(0).toUpperCase() + PREFIX.slice(1)} ${i}`;
    const lastname = "Estudiante";

    console.log(`[${i}/${COUNT}] Processing ${username}...`);

    // Create user if not exists
    let userId;
    try {
      const created = await moodleCall("core_user_create_users", {
        "users[0][createpassword]": "0",
        "users[0][username]": username,
        "users[0][password]": PASSWORD,
        "users[0][firstname]": firstname,
        "users[0][lastname]": lastname,
        "users[0][email]": email,
      });
      userId = created[0]?.id;
      console.log(`   Created user ID ${userId}`);
    } catch {
      // User may already exist — look them up
      const found = await moodleCall("core_user_get_users_by_field", {
        field: "username", "values[0]": username,
      });
      if (!found || found.length === 0) {
        console.error(`   Failed to create/lookup ${username}`);
        continue;
      }
      userId = found[0].id;
      console.log(`   User already exists: ID ${userId}`);
    }

    // Enrol in course
    try {
      await moodleCall("enrol_manual_enrol_users", {
        "enrolments[0][roleid]": String(MOODLE_STUDENT_ROLE_ID),
        "enrolments[0][userid]": String(userId),
        "enrolments[0][courseid]": String(COURSE_ID),
      });
      console.log(`   Enrolled in course ${COURSE_ID}`);
    } catch (e) {
      console.error(`   Enrolment failed: ${e.message}`);
      continue;
    }

    createdIds.push(userId);
  }

  console.log(`\n✅ ${createdIds.length} students enrolled in course ${COURSE_ID}`);
  console.log(`   User IDs: [${createdIds.join(", ")}]`);
  console.log(`   Passwords: ${PASSWORD}`);
}

run().catch((e) => { console.error("Error:", e); process.exit(1); });
