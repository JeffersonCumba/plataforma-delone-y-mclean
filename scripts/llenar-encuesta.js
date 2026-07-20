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
// Optional: comma-separated list of user IDs to fill surveys for.
// If omitted, fills for ALL enrolled students.
const SPECIFIC_USERS = process.argv[3]
  ? process.argv[3].split(",").map(Number)
  : null;
// ==============

if (!COURSE_ID || !Number.isInteger(COURSE_ID)) {
  console.error("Usage: node scripts/llenar-encuesta.js <courseId> [userId1,userId2,...]");
  console.error("Example: node scripts/llenar-encuesta.js 4");
  console.error("         node scripts/llenar-encuesta.js 4 7,8,9,10,11");
  process.exit(1);
}

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error("Missing DB configuration");
  process.exit(1);
}

async function getDBConnection() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
  });
}

// Realistic answer profiles to simulate different respondent types
const ANSWER_PROFILES = [
  // Entusiasta — todo puntúa 4-5
  { label: "Entusiasta", weights: () => [5, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5] },
  // Satisfecho — mayoría 4, algunos 3
  { label: "Satisfecho", weights: () => [4, 4, 3, 4, 4, 3, 4, 4, 4, 3, 4, 3, 4, 4, 3, 4, 4, 4, 3, 4, 4] },
  // Neutral — mezcla 3 y 4
  { label: "Neutral", weights: () => [3, 4, 3, 3, 4, 3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3, 4, 3, 3] },
  // Crítico — mayoría 2-3
  { label: "Crítico", weights: () => [2, 3, 2, 2, 3, 2, 2, 3, 2, 3, 2, 2, 3, 2, 2, 3, 2, 2, 2, 3, 2] },
  // Insatisfecho — puntuaciones bajas 1-2
  { label: "Insatisfecho", weights: () => [1, 2, 1, 1, 2, 1, 1, 2, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1] },
];

const LABEL_MAP = {
  1: "Totalmente en desacuerdo",
  2: "En desacuerdo",
  3: "Ni de acuerdo ni en desacuerdo",
  4: "De acuerdo",
  5: "Totalmente de acuerdo",
};

async function run() {
  const conn = await getDBConnection();

  try {
    // 1. Find the feedback for this course
    const [fbRows] = await conn.execute(
      `SELECT id, name FROM mdl_feedback WHERE course = ? ORDER BY id DESC LIMIT 1`,
      [COURSE_ID],
    );
    if (fbRows.length === 0) {
      throw new Error(`No feedback found for course ${COURSE_ID}`);
    }
    const feedbackId = fbRows[0].id;
    console.log(`Feedback ID: ${feedbackId} — "${fbRows[0].name}"`);

    // 2. Get all feedback items (questions)
    const [items] = await conn.execute(
      `SELECT id, label, position FROM mdl_feedback_item WHERE feedback = ? ORDER BY position ASC`,
      [feedbackId],
    );
    if (items.length !== 21) {
      console.warn(`Warning: Expected 21 items, found ${items.length}`);
    }
    console.log(`Questions: ${items.length}`);

    // 3. Get enrolled students
    let studentIds;
    if (SPECIFIC_USERS) {
      studentIds = SPECIFIC_USERS;
      console.log(`Using specific users: [${studentIds.join(", ")}]`);
    } else {
      const [students] = await conn.execute(
        `SELECT DISTINCT ue.userid FROM mdl_user_enrolments ue
         JOIN mdl_enrol e ON e.id = ue.enrolid
         WHERE e.courseid = ? AND e.status = 0`,
        [COURSE_ID],
      );
      studentIds = students.map((r) => r.userid);
      console.log(`Found ${studentIds.length} enrolled students`);
    }

    if (studentIds.length === 0) {
      console.log("No students to fill surveys for.");
      return;
    }

    // 4. For each student, create completed + values
    let totalCompleted = 0;
    for (let sIdx = 0; sIdx < studentIds.length; sIdx++) {
      const userId = studentIds[sIdx];
      const profile = ANSWER_PROFILES[sIdx % ANSWER_PROFILES.length];
      const answers = profile.weights();

      // Check if student already has a completed survey
      const [existing] = await conn.execute(
        `SELECT id FROM mdl_feedback_completed WHERE feedback = ? AND userid = ? LIMIT 1`,
        [feedbackId, userId],
      );
      if (existing.length > 0) {
        console.log(`[${sIdx + 1}/${studentIds.length}] User ${userId}: already completed, skipping`);
        continue;
      }

      const now = Math.floor(Date.now() / 1000);

      // Insert completed row
      const [compResult] = await conn.execute(
        `INSERT INTO mdl_feedback_completed (feedback, userid, timemodified, random_response, anonymous_response, courseid)
         VALUES (?, ?, ?, 0, 0, ?)`,
        [feedbackId, userId, now, COURSE_ID],
      );
      const completedId = compResult.insertId;

      // Insert 21 value rows
      const valuesData = items.map((item, i) => {
        const val = answers[i % answers.length];
        const label = LABEL_MAP[val] || "De acuerdo";
        return [completedId, item.id, `${val}>>${label}`, item.position];
      });

      for (const [completed, item, valueText, pos] of valuesData) {
        await conn.execute(
          `INSERT INTO mdl_feedback_value (completed, item, value, course_id)
           VALUES (?, ?, ?, ?)`,
          [completed, item, valueText, COURSE_ID],
        );
      }

      totalCompleted++;
      console.log(`[${sIdx + 1}/${studentIds.length}] User ${userId}: ${profile.label} — ${answers.slice(0, 5).join(",")}... ✓`);
    }

    console.log(`\n✅ ${totalCompleted} surveys completed for course ${COURSE_ID}`);
    console.log(`   Profiles used: ${ANSWER_PROFILES.map((p) => p.label).join(", ")}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
