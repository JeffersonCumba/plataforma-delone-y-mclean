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

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error("Missing required database environment variables");
  process.exit(1);
}

async function getConnection() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
  });
}

async function getAdminId(conn) {
  const adminEmail = process.env.MOODLE_ADMIN_EMAIL?.trim().toLowerCase();
  const [rows] = await conn.execute(
    `SELECT id, username, email FROM mdl_user WHERE deleted = 0 AND (username = 'admin' OR (email = ? AND ? IS NOT NULL)) ORDER BY id ASC LIMIT 1`,
    [adminEmail, adminEmail],
  );
  if (rows.length === 0) {
    const [all] = await conn.execute(`SELECT id, username FROM mdl_user WHERE deleted = 0 ORDER BY id ASC LIMIT 5`);
    console.log("No admin found. First users:", all);
    throw new Error("No se pudo identificar el usuario admin");
  }
  return rows[0].id;
}

async function runCleanup() {
  const conn = await getConnection();

  try {
    const adminId = await getAdminId(conn);
    console.log(`Admin user ID: ${adminId}`);

    await conn.beginTransaction();

    // Find all non-admin users to delete (including previously "deleted" by Moodle)
    const [usersToDelete] = await conn.execute(
      `SELECT id FROM mdl_user WHERE id != ? AND id != 1 AND username NOT IN ('guest')`,
      [adminId],
    );
    const userIds = usersToDelete.map((r) => r.id);

    // Find all courses except site course
    const [courses] = await conn.execute(
      `SELECT id FROM mdl_course WHERE id != 1`,
    );
    const courseIds = courses.map((r) => r.id);

    console.log(`Users to delete: ${userIds.length}`);
    console.log(`Courses to delete: ${courseIds.length}`);

    if (courseIds.length > 0) {
      const placeholders = courseIds.map(() => "?").join(",");

      // Get feedback IDs for these courses
      const [feedbacks] = await conn.execute(
        `SELECT id FROM mdl_feedback WHERE course IN (${placeholders})`,
        courseIds,
      );
      const feedbackIds = feedbacks.map((r) => r.id);

      if (feedbackIds.length > 0) {
        const fPlaceholders = feedbackIds.map(() => "?").join(",");

        // Get item IDs
        const [items] = await conn.execute(
          `SELECT id FROM mdl_feedback_item WHERE feedback IN (${fPlaceholders})`,
          feedbackIds,
        );
        const itemIds = items.map((r) => r.id);

        if (itemIds.length > 0) {
          const iPlaceholders = itemIds.map(() => "?").join(",");
          await conn.execute(
            `DELETE FROM mdl_feedback_value WHERE item IN (${iPlaceholders})`,
            itemIds,
          );
          console.log(`Deleted feedback_values for ${itemIds.length} items`);
        }

        // Get completed IDs
        const [completeds] = await conn.execute(
          `SELECT id FROM mdl_feedback_completed WHERE feedback IN (${fPlaceholders})`,
          feedbackIds,
        );
        const completedIds = completeds.map((r) => r.id);

        if (completedIds.length > 0) {
          const cPlaceholders = completedIds.map(() => "?").join(",");
          await conn.execute(
            `DELETE FROM mdl_feedback_value WHERE completed IN (${cPlaceholders})`,
            completedIds,
          );
          await conn.execute(
            `DELETE FROM mdl_feedback_completed WHERE id IN (${cPlaceholders})`,
            completedIds,
          );
          console.log(`Deleted ${completedIds.length} completed surveys`);
        }

        await conn.execute(
          `DELETE FROM mdl_feedback_item WHERE feedback IN (${fPlaceholders})`,
          feedbackIds,
        );
        console.log(`Deleted ${items.length} feedback items`);
      }

      // Get course module IDs for these courses
      const [courseModules] = await conn.execute(
        `SELECT id FROM mdl_course_modules WHERE course IN (${placeholders})`,
        courseIds,
      );
      const moduleIds = courseModules.map((r) => r.id);

      if (moduleIds.length > 0) {
        const mPlaceholders = moduleIds.map(() => "?").join(",");
        await conn.execute(
          `DELETE FROM mdl_context WHERE contextlevel = 70 AND instanceid IN (${mPlaceholders})`,
          moduleIds,
        );
        await conn.execute(
          `DELETE FROM mdl_course_modules WHERE id IN (${mPlaceholders})`,
          moduleIds,
        );
        console.log(`Deleted ${moduleIds.length} course modules`);
      }

      // Update course sections to remove references
      await conn.execute(
        `UPDATE mdl_course_sections SET sequence = '' WHERE course IN (${placeholders})`,
        courseIds,
      );

      await conn.execute(
        `DELETE FROM mdl_feedback WHERE course IN (${placeholders})`,
        courseIds,
      );
      console.log(`Deleted ${feedbackIds.length} feedbacks`);
    }

    // Delete role assignments for non-admin users (except those on admin)
    if (userIds.length > 0) {
      const uPlaceholders = userIds.map(() => "?").join(",");

      // Get context IDs for non-site courses to clean role assignments
      const [courseContexts] = await conn.execute(
        `SELECT id FROM mdl_context WHERE contextlevel = 50 AND instanceid IN (SELECT id FROM mdl_course WHERE id != 1)`,
      );
      const contextIds = courseContexts.map((r) => r.id);

      if (contextIds.length > 0) {
        const ctxPlaceholders = contextIds.map(() => "?").join(",");
        await conn.execute(
          `DELETE FROM mdl_role_assignments WHERE roleid != 0 AND contextid IN (${ctxPlaceholders})`,
          contextIds,
        );
        await conn.execute(
          `DELETE FROM mdl_role_assignments WHERE userid IN (${uPlaceholders})`,
          userIds,
        );
        console.log(`Deleted role assignments for ${userIds.length} users`);
      }

      // Delete trial data
      await conn.execute(
        `DELETE FROM mdl_trial_audit_log WHERE user_id IN (${uPlaceholders})`,
        userIds,
      );
      await conn.execute(
        `DELETE FROM mdl_user_trial WHERE user_id IN (${uPlaceholders})`,
        userIds,
      );
      console.log(`Deleted trial data for ${userIds.length} users`);

      // Delete email verification records
      await conn.execute(
        `DELETE FROM mdl_user_email_verification WHERE user_id IN (${uPlaceholders})`,
        userIds,
      );
      console.log(`Deleted email verification for ${userIds.length} users`);

      // Delete user contexts
      await conn.execute(
        `DELETE FROM mdl_context WHERE contextlevel = 30 AND instanceid IN (${uPlaceholders})`,
        userIds,
      );

      // Delete user enrolments
      await conn.execute(
        `DELETE ue FROM mdl_user_enrolments ue JOIN mdl_enrol e ON e.id = ue.enrolid WHERE ue.userid IN (${uPlaceholders}) AND e.courseid != 1`,
        userIds,
      );

      // Delete users
      await conn.execute(
        `DELETE FROM mdl_user WHERE id IN (${uPlaceholders})`,
        userIds,
      );
      console.log(`Deleted ${userIds.length} users`);
    }

    // Delete courses
    if (courseIds.length > 0) {
      const cPlaceholders = courseIds.map(() => "?").join(",");

      await conn.execute(
        `DELETE FROM mdl_context WHERE contextlevel = 50 AND instanceid IN (${cPlaceholders})`,
        courseIds,
      );
      await conn.execute(
        `DELETE FROM mdl_course_sections WHERE course IN (${cPlaceholders})`,
        courseIds,
      );
      await conn.execute(
        `DELETE FROM mdl_enrol WHERE courseid IN (${cPlaceholders})`,
        courseIds,
      );
      await conn.execute(
        `DELETE FROM mdl_course WHERE id IN (${cPlaceholders})`,
        courseIds,
      );
      console.log(`Deleted ${courseIds.length} courses`);
    }

    await conn.commit();
    console.log("\n✅ DB cleaned successfully. Only admin user remains.");

    // Reset auto_increment outside transaction (DDL auto-commits)
    const tables = [
      { name: "mdl_user", value: adminId + 1 },
      { name: "mdl_course", value: 2 },
      { name: "mdl_feedback", value: 1 },
      { name: "mdl_feedback_item", value: 1 },
      { name: "mdl_feedback_completed", value: 1 },
      { name: "mdl_feedback_value", value: 1 },
      { name: "mdl_course_modules", value: 1 },
      { name: "mdl_course_sections", value: 1 },
      { name: "mdl_enrol", value: 1 },
      { name: "mdl_user_trial", value: 1 },
      { name: "mdl_user_email_verification", value: 1 },
      { name: "mdl_trial_audit_log", value: 1 },
      { name: "mdl_role_assignments", value: 1 },
    ];
    for (const t of tables) {
      await conn.execute(`ALTER TABLE ${t.name} AUTO_INCREMENT = ${t.value}`);
      console.log(`  ${t.name} → auto_increment = ${t.value}`);
    }
  } catch (error) {
    await conn.rollback();
    console.error("Cleanup failed:", error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runCleanup();
