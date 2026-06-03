"use server";

import { type RowDataPacket } from "mysql2";
import { z } from "zod";

import { pool } from "@/lib/db";
import { fetchMoodle } from "@/lib/moodle";
import {
  registerUserSchema,
  studentInputSchema,
  type StudentInput,
  type RegisterUserInput,
} from "@/lib/validations/user";

interface CreateUsersResponse {
  id: number;
  username: string;
}

interface MoodleUserRow extends RowDataPacket {
  id: number;
  email: string;
  username: string;
}

export interface StudentRegistrationResult {
  email: string;
  username: string;
  userId: number;
  created: boolean;
  enrolled: boolean;
  skipped?: string;
}

export interface BatchRegistrationResult {
  total: number;
  processed: number;
  created: number;
  enrolled: number;
  skipped: number;
  failed: number;
  results: StudentRegistrationResult[];
  errors: Array<{ email: string; message: string }>;
}

function normalizeStudentInput(input: StudentInput): StudentInput {
  try {
    return studentInputSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        error.issues[0]?.message ?? "Datos del estudiante invalidos",
      );
    }

    throw error;
  }
}

function validateRegisterInput(input: RegisterUserInput): RegisterUserInput {
  try {
    return registerUserSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        error.issues[0]?.message ?? "Datos de registro invalidos",
      );
    }

    throw error;
  }
}

async function findUserByEmail(email: string): Promise<MoodleUserRow | null> {
  const [rows] = await pool.execute<MoodleUserRow[]>(
    "SELECT id, email, username FROM mdl_user WHERE email = ? AND deleted = 0 LIMIT 1",
    [email],
  );

  return rows[0] ?? null;
}

async function createMoodleUser(input: StudentInput): Promise<number> {
  const createdUsers = await fetchMoodle<CreateUsersResponse[]>(
    "core_user_create_users",
    {
      "users[0][username]": input.username,
      "users[0][firstname]": input.firstname,
      "users[0][lastname]": input.lastname,
      "users[0][email]": input.email,
      "users[0][password]": input.password,
      "users[0][auth]": "manual",
    },
  );

  const createdUserId = createdUsers?.[0]?.id;

  if (!createdUserId) {
    throw new Error("No fue posible crear el usuario en Moodle");
  }

  return createdUserId;
}

async function enrolUserInCourse(
  userId: number,
  courseId: number,
): Promise<void> {
  const studentRoleId = Number(process.env.MOODLE_STUDENT_ROLE_ID ?? 5);

  await fetchMoodle<unknown>("enrol_manual_enrol_users", {
    "enrolments[0][roleid]": String(studentRoleId),
    "enrolments[0][userid]": String(userId),
    "enrolments[0][courseid]": String(courseId),
  });
}

export async function registrarEstudianteCsv(
  input: StudentInput,
  courseId: number,
): Promise<StudentRegistrationResult> {
  const data = normalizeStudentInput(input);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error("El courseId no es valido para matricular estudiantes");
  }

  const existingUser = await findUserByEmail(data.email);
  const userId = existingUser?.id ?? (await createMoodleUser(data));

  await enrolUserInCourse(userId, courseId);

  return {
    email: data.email,
    username: existingUser?.username ?? data.username,
    userId,
    created: !existingUser,
    enrolled: true,
    skipped: existingUser
      ? "El usuario ya existia y se matriculo en el curso"
      : undefined,
  };
}

export async function registrarEstudiantesCvs(
  users: StudentInput[],
  courseId: number,
): Promise<BatchRegistrationResult> {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error("No hay estudiantes para registrar");
  }

  const results: StudentRegistrationResult[] = [];
  const errors: Array<{ email: string; message: string }> = [];

  let processed = 0;
  let created = 0;
  let enrolled = 0;
  let skipped = 0;

  for (const student of users) {
    try {
      const result = await registrarEstudianteCsv(student, courseId);
      results.push(result);
      processed += 1;
      if (result.created) {
        created += 1;
      }
      if (result.enrolled) {
        enrolled += 1;
      }
      if (result.skipped) {
        skipped += 1;
      }
    } catch (error) {
      processed += 1;
      const message =
        error instanceof Error ? error.message : "Error inesperado";
      errors.push({
        email: student.email,
        message,
      });
    }
  }

  return {
    total: users.length,
    processed,
    created,
    enrolled,
    skipped,
    failed: errors.length,
    results,
    errors,
  };
}

export async function registrarUsuario(
  input: RegisterUserInput,
): Promise<void> {
  const data = validateRegisterInput(input);
  await createMoodleUser(data);
}
