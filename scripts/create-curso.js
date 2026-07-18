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
const TEACHER_ID = Number(process.argv[2]);
const COURSE_FULLNAME = process.argv[3] || "Curso de Prueba D&M";
const COURSE_SHORTNAME = process.argv[4] || "curso-demo";
const COURSE_SUMMARY = process.argv[5] || "Curso creado para pruebas del modelo DeLone y McLean.";
// ==============

if (!TEACHER_ID || !Number.isInteger(TEACHER_ID)) {
  console.error("Usage: node scripts/create-curso.js <teacherId> [fullname] [shortname] [summary]");
  console.error("Example: node scripts/create-curso.js 3 \"Mi Curso\" \"mi-curso\"");
  process.exit(1);
}

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
const MOODLE_TEACHER_ROLE_ID = Number(process.env.MOODLE_TEACHER_ROLE_ID ?? 4);
const CATEGORY_ID = Number(process.env.MOODLE_DEFAULT_CATEGORY_ID ?? 1);
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

const LIKERT_PRESENTATION =
  "r>>>>>1>>Totalmente en desacuerdo\r|2>>En desacuerdo\r|3>>Ni de acuerdo ni en desacuerdo\r|4>>De acuerdo\r|5>>Totalmente de acuerdo";

const DEFAULT_QUESTIONS = [
  { dimension: "calidad_sys", text: "¿Es el sistema fácil de usar?" },
  { dimension: "calidad_sys", text: "¿Es el sistema amigable para el usuario?" },
  { dimension: "calidad_sys", text: "¿El sistema responde rápidamente a las solicitudes?" },
  { dimension: "calidad_sys", text: "¿El sistema está disponible siempre que se necesita?" },
  { dimension: "calidad_info", text: "¿Es la información proporcionada por el sistema precisa?" },
  { dimension: "calidad_info", text: "¿Es la información completa para realizar mis tareas?" },
  { dimension: "calidad_info", text: "¿Está la información actualizada y es oportuna?" },
  { dimension: "calidad_info", text: "¿Se presenta la información en un formato útil?" },
  { dimension: "calidad_serv", text: "¿El personal de soporte tiene los conocimientos técnicos necesarios?" },
  { dimension: "calidad_serv", text: "¿El soporte responde rápidamente ante los problemas detectados?" },
  { dimension: "calidad_serv", text: "¿El soporte muestra un interés genuino en resolver las dudas?" },
  { dimension: "calidad_serv", text: "¿El sistema cuenta con manuales o materiales de ayuda claros?" },
  { dimension: "uso_sistema", text: "¿Tengo la intención de seguir usando el sistema en el futuro?" },
  { dimension: "uso_sistema", text: "¿Utilizo el sistema frecuentemente para realizar mis labores?" },
  { dimension: "uso_sistema", text: "¿Es el sistema una parte esencial de mi flujo de trabajo diario?" },
  { dimension: "satis_user", text: "¿Estoy satisfecho con el funcionamiento general del sistema?" },
  { dimension: "satis_user", text: "¿El sistema cumple con mis expectativas iniciales de uso?" },
  { dimension: "satis_user", text: "¿Siento que el sistema es eficaz para cubrir mis necesidades?" },
  { dimension: "benef_netos", text: "¿El sistema mejora mi productividad en el trabajo?" },
  { dimension: "benef_netos", text: "¿El sistema me ayuda a tomar decisiones de manera más eficiente?" },
  { dimension: "benef_netos", text: "¿El sistema facilita el cumplimiento de mis objetivos laborales?" },
];

async function getDBConnection() {
  return mysql.createConnection({
    host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, charset: "utf8mb4",
  });
}

async function run() {
  console.log(`Creating course "${COURSE_FULLNAME}" for teacher ID ${TEACHER_ID}...`);

  // 1. Create course via Moodle API
  const courses = await moodleCall("core_course_create_courses", {
    "courses[0][fullname]": COURSE_FULLNAME,
    "courses[0][shortname]": COURSE_SHORTNAME,
    "courses[0][categoryid]": String(CATEGORY_ID),
    "courses[0][summary]": COURSE_SUMMARY,
    "courses[0][summaryformat]": "1",
    "courses[0][visible]": "1",
    "courses[0][format]": "topics",
  });
  const courseId = courses[0]?.id;
  if (!courseId) throw new Error("Course creation returned no ID");
  console.log(`Course created: ID ${courseId}`);

  // 2. Enrol teacher
  await moodleCall("enrol_manual_enrol_users", {
    "enrolments[0][roleid]": String(MOODLE_TEACHER_ROLE_ID),
    "enrolments[0][userid]": String(TEACHER_ID),
    "enrolments[0][courseid]": String(courseId),
  });
  console.log(`Teacher ${TEACHER_ID} enrolled`);

  // 3. Assign teacher role at course context
  const conn = await getDBConnection();
  try {
    const [ctxRows] = await conn.execute(
      `SELECT id, path, depth FROM mdl_context WHERE contextlevel = 50 AND instanceid = ? LIMIT 1`,
      [courseId],
    );
    const courseCtx = ctxRows[0];
    if (courseCtx) {
      await moodleCall("core_role_assign_roles", {
        "assignments[0][roleid]": String(MOODLE_TEACHER_ROLE_ID),
        "assignments[0][userid]": String(TEACHER_ID),
        "assignments[0][contextid]": String(courseCtx.id),
      });
      console.log(`Teacher role assigned at context ${courseCtx.id}`);
    }

    // 4. Create feedback with 21 questions
    const now = Math.floor(Date.now() / 1000);

    await conn.beginTransaction();

    const [fbResult] = await conn.execute(
      `INSERT INTO mdl_feedback (course, name, intro, introformat, anonymous, email_notification,
        multiple_submit, autonumbering, site_after_submit, page_after_submit,
        page_after_submitformat, publish_stats, timeopen, timeclose, timemodified, completionsubmit)
       VALUES (?, ?, '', 1, 1, 0, 0, 0, '', '', 1, 0, 0, 0, ?, 0)`,
      [courseId, `Cuestionario DeLone y McLean - ${COURSE_SHORTNAME}`, now],
    );
    const feedbackId = fbResult.insertId;
    console.log(`Feedback created: ID ${feedbackId}`);

    let position = 1;
    for (const q of DEFAULT_QUESTIONS) {
      await conn.execute(
        `INSERT INTO mdl_feedback_item (feedback, template, name, label, presentation, typ, hasvalue, position,
          required, dependitem, dependvalue, options)
         VALUES (?, 0, ?, ?, ?, 'multichoice', 1, ?, 0, 0, '', 'h')`,
        [feedbackId, q.text, q.dimension, LIKERT_PRESENTATION, position],
      );
      position++;
    }
    console.log(`21 questions created`);

    // 5. Link feedback module to course section
    const [modRows] = await conn.execute(
      `SELECT id FROM mdl_modules WHERE name = 'feedback' LIMIT 1`,
    );
    const feedbackModuleId = modRows[0]?.id;
    if (!feedbackModuleId) throw new Error("Feedback module not found in Moodle");

    // Ensure section 0 exists
    const [secRows] = await conn.execute(
      `SELECT id, sequence FROM mdl_course_sections WHERE course = ? AND section = 0 LIMIT 1`,
      [courseId],
    );
    let sectionId, sectionSeq;
    if (secRows[0]) {
      sectionId = secRows[0].id;
      sectionSeq = secRows[0].sequence ?? "";
    } else {
      const [secResult] = await conn.execute(
        `INSERT INTO mdl_course_sections (course, section, name, summary, summaryformat, sequence, visible, timemodified)
         VALUES (?, 0, NULL, '', 1, '', 1, ?)`,
        [courseId, now],
      );
      sectionId = secResult.insertId;
      sectionSeq = "";
    }

    const [cmResult] = await conn.execute(
      `INSERT INTO mdl_course_modules (course, module, instance, section, idnumber, added, score, indent, visible,
        visibleoncoursepage, visibleold, groupmode, groupingid, completion,
        completiongradeitemnumber, completionview, completionexpected,
        completionpassgrade, showdescription, availability, deletioninprogress, downloadcontent)
       VALUES (?, ?, ?, ?, '', ?, 0, 0, 1, 1, 1, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, 0, 1)`,
      [courseId, feedbackModuleId, feedbackId, sectionId, now],
    );
    const courseModuleId = cmResult.insertId;

    const nextSeq = sectionSeq ? `${sectionSeq},${courseModuleId}` : String(courseModuleId);
    await conn.execute(
      `UPDATE mdl_course_sections SET sequence = ?, timemodified = ? WHERE id = ?`,
      [nextSeq, now, sectionId],
    );

    // Create module context
    if (courseCtx) {
      const [modCtxResult] = await conn.execute(
        `INSERT INTO mdl_context (contextlevel, instanceid, path, depth, locked) VALUES (70, ?, NULL, 0, 0)`,
        [courseModuleId],
      );
      const modCtxId = modCtxResult.insertId;
      const modCtxPath = `${courseCtx.path}/${modCtxId}`;
      const modCtxDepth = courseCtx.depth + 1;
      await conn.execute(
        `UPDATE mdl_context SET path = ?, depth = ? WHERE id = ?`,
        [modCtxPath, modCtxDepth, modCtxId],
      );
    }

    await conn.commit();
    console.log(`Survey (feedback) linked to course module ${courseModuleId}`);

    console.log(`\n✅ Course created successfully:`);
    console.log(`   ID:        ${courseId}`);
    console.log(`   Fullname:  ${COURSE_FULLNAME}`);
    console.log(`   Shortname: ${COURSE_SHORTNAME}`);
    console.log(`   Teacher:   ${TEACHER_ID}`);
    console.log(`   Feedback:  ${feedbackId}`);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error("Error:", e); process.exit(1); });
