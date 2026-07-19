"use server";

import { type RowDataPacket } from "mysql2";
import { z } from "zod";

import { pool } from "@/lib/db";
import { fetchMoodle, MoodleApiError } from "@/lib/moodle";
import { initializeTrialForTeacher } from "@/services/trialService";
import {
  registerUserSchema,
  studentInputSchema,
  type StudentInput,
  type RegisterUserInput,
} from "@/lib/validations/user";
import type { MoodleUserSummary } from "@/types/encuestado";

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

export type IndividualEnrollmentStatus =
  | "created_and_enrolled"
  | "enrolled"
  | "already_enrolled"
  | "error";

export interface IndividualEnrollmentResult {
  status: IndividualEnrollmentStatus;
  message: string;
  user: MoodleUserSummary;
  courseId: number;
}

interface MoodleUserSearchRow extends RowDataPacket {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface UserEnrolmentRow extends RowDataPacket {
  id: number;
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
        error.issues[0]?.message ?? "Datos del estudiante inválidos",
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
        error.issues[0]?.message ?? "Datos de registro inválidos",
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

async function findUserByUsername(
  username: string,
): Promise<MoodleUserRow | null> {
  const [rows] = await pool.execute<MoodleUserRow[]>(
    "SELECT id, email, username FROM mdl_user WHERE username = ? AND deleted = 0 LIMIT 1",
    [username],
  );

  return rows[0] ?? null;
}

async function checkUserExistsByField(
  field: "username" | "email",
  value: string,
): Promise<boolean> {
  try {
    const result = await fetchMoodle<{ users?: Array<{ id: number }> }>(
      "core_user_get_users",
      {
        "criteria[0][key]": field,
        "criteria[0][value]": value,
      },
    );
    if (result?.users && result.users.length > 0) {
      return true;
    }
  } catch (err) {
    console.error(
      `[checkUserExistsByField] WS falló para ${field}=${value}:`,
      err,
    );
  }

  try {
    const column = field === "username" ? "username" : "email";
    const [rows] = await pool.execute<MoodleUserRow[]>(
      `SELECT id FROM mdl_user WHERE ${column} = ? AND deleted = 0 LIMIT 1`,
      [value],
    );
    return rows.length > 0;
  } catch (err) {
    console.error(
      `[checkUserExistsByField] DB falló para ${field}=${value}:`,
      err,
    );
    return false;
  }
}

async function deleteMoodleUser(userId: number): Promise<void> {
  try {
    await fetchMoodle<unknown>("core_user_update_users", {
      "users[0][id]": String(userId),
      "users[0][suspended]": "1",
    });
  } catch (err) {
    console.error(
      `[deleteMoodleUser] No se pudo suspender al usuario ${userId}:`,
      err,
    );
  }
}

function parseRegistroError(error: unknown): string | null {
  if (!(error instanceof MoodleApiError)) {
    return null;
  }

  const msg = error.message.toLowerCase();
  const isCreateUser = error.wsFunction === "core_user_create_users";

  if (isCreateUser) {
    if (
      msg.includes("username already exists") ||
      msg.includes("nombre de usuario ya existe") ||
      msg.includes("ya existe") ||
      msg.includes("already exists") ||
      msg.includes("duplicado") ||
      msg.includes("duplicate")
    ) {
      return "Ese nombre de usuario ya está en uso. Elige otro.";
    }

    if (
      msg.includes("email already exists") ||
      msg.includes("correo ya existe") ||
      msg.includes("correo electrónico ya existe") ||
      msg.includes("email already registered") ||
      msg.includes("mail ya existe")
    ) {
      return "Ese correo electrónico ya está registrado. Usa otro o inicia sesión.";
    }
  }

  return null;
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
      console.error("[registrarEstudianteCsv]", error);
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

async function crearCursoInicialProfesor(
  userId: number,
  firstname: string,
  lastname: string,
): Promise<number> {
  const categoryId = Number(process.env.MOODLE_DEFAULT_CATEGORY_ID ?? 1);
  const teacherRoleId = Number(process.env.MOODLE_TEACHER_ROLE_ID ?? 4);
  const timestamp = Date.now().toString().slice(-6);
  const shortname = `curso-${firstname.toLowerCase().replace(/\s+/g, "-")}-${timestamp}`;

  const createdCourses = await fetchMoodle<Array<{ id: number }>>(
    "core_course_create_courses",
    {
      "courses[0][fullname]": `Curso de ${firstname} ${lastname}`,
      "courses[0][shortname]": shortname,
      "courses[0][categoryid]": String(categoryId),
      "courses[0][summary]": "Curso inicial creado automaticamente al registrarse en la plataforma.",
      "courses[0][summaryformat]": "1",
      "courses[0][visible]": "1",
      "courses[0][format]": "topics",
    },
  );

  const createdCourse = createdCourses?.[0];
  if (!createdCourse?.id) {
    throw new Error("No se pudo crear el curso inicial en Moodle");
  }

  await fetchMoodle<unknown>("enrol_manual_enrol_users", {
    "enrolments[0][roleid]": String(teacherRoleId),
    "enrolments[0][userid]": String(userId),
    "enrolments[0][courseid]": String(createdCourse.id),
  });

  return createdCourse.id;
}

export async function registrarUsuario(
  input: RegisterUserInput,
): Promise<number> {
  const data = validateRegisterInput(input);

  const usernameExists = await checkUserExistsByField(
    "username",
    data.username,
  );

  if (usernameExists) {
    throw new Error("Ese nombre de usuario ya está en uso. Elige otro.");
  }

  const emailExists = await checkUserExistsByField("email", data.email);
  
  if (emailExists) {
    throw new Error(
      "Ese correo electrónico ya está registrado. Usa otro o inicia sesión.",
    );
  }

  let userId = 0;

  try {
    userId = await createMoodleUser(data);

    await crearCursoInicialProfesor(userId, data.firstname, data.lastname);

    await initializeTrialForTeacher(userId);

    return userId;
  } catch (error) {
    console.error("[registrarUsuario] Error:", error);

    if (error instanceof MoodleApiError) {
      console.error(
        `[registrarUsuario] Moodle ws="${error.wsFunction}" code="${error.errorcode}" msg="${error.message}"`,
      );
    }

    if (userId > 0) {
      await deleteMoodleUser(userId);
    }

    const friendly = parseRegistroError(error);
    if (friendly) {
      throw new Error(friendly);
    }

    if (userId === 0) {
      try {
        const usernameInDb = await findUserByUsername(data.username);
        if (usernameInDb) {
          throw new Error("Ese nombre de usuario ya está en uso. Elige otro.");
        }
        const emailInDb = await findUserByEmail(data.email);
        if (emailInDb) {
          throw new Error(
            "Ese correo electrónico ya está registrado. Usa otro o inicia sesión.",
          );
        }
      } catch (err) {
        if (err instanceof Error) throw err;
      }
    }

    throw new Error(
      "No se pudo completar el registro. Verifica los datos e inténtalo de nuevo.",
    );
  }
}

export async function buscarUsuariosMoodle(
  query: string,
): Promise<MoodleUserSummary[]> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return [];
  }

  try {
    const response = await fetchMoodle<{
      users?: Array<{
        id: number;
        username: string;
        firstname: string;
        lastname: string;
        email: string;
      }>;
    }>("core_user_get_users", {
      "criteria[0][key]": "username",
      "criteria[0][value]": trimmed,
    });

    const users = Array.isArray(response?.users) ? response.users : [];

    return users
      .filter(
        (user) =>
          !user.username?.startsWith("guest") &&
          !user.username?.startsWith("admin"),
      )
      .map<MoodleUserSummary>((user) => ({
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        fullname: `${user.firstname} ${user.lastname}`.trim(),
        email: user.email,
      }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible buscar usuarios en Moodle";
    throw new Error(message);
  }
}

async function isUserEnrolledInCourse(
  userId: number,
  courseId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<UserEnrolmentRow[]>(
    `SELECT ue.id
       FROM mdl_user_enrolments ue
       JOIN mdl_enrol e ON e.id = ue.enrolid
      WHERE ue.userid = ? AND e.courseid = ?
      LIMIT 1`,
    [userId, courseId],
  );

  return rows.length > 0;
}

async function getMoodleUserById(
  userId: number,
): Promise<MoodleUserSummary | null> {
  const [rows] = await pool.execute<MoodleUserSearchRow[]>(
    "SELECT id, username, firstname, lastname, email FROM mdl_user WHERE id = ? AND deleted = 0 LIMIT 1",
    [userId],
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    firstname: row.firstname,
    lastname: row.lastname,
    fullname: `${row.firstname} ${row.lastname}`.trim(),
    email: row.email,
  };
}

export async function matricularUsuarioIndividual(input: {
  courseId: number;
  mode: "existing" | "new";
  existingUserId?: number;
  newUser?: StudentInput;
}): Promise<IndividualEnrollmentResult> {
  if (!Number.isInteger(input.courseId) || input.courseId <= 0) {
    throw new Error("El courseId no es valido para matricular");
  }

  if (input.mode === "existing") {
    if (!input.existingUserId) {
      throw new Error("El existingUserId es obligatorio para el modo 'existing'");
    }

    const existingUserId: number = input.existingUserId;

    if (!Number.isInteger(existingUserId) || existingUserId <= 0) {
      throw new Error("Selecciona un usuario existente para matricular");
    }

    const user = await getMoodleUserById(existingUserId);
    if (!user) {
      throw new Error("El usuario seleccionado no existe o fue eliminado");
    }

    if (await isUserEnrolledInCourse(user.id, input.courseId)) {
      return {
        status: "already_enrolled",
        message: `${user.fullname || user.username} ya esta matriculado en este curso`,
        user,
        courseId: input.courseId,
      };
    }

    await enrolUserInCourse(user.id, input.courseId);

    return {
      status: "enrolled",
      message: `${user.fullname || user.username} matriculado correctamente`,
      user,
      courseId: input.courseId,
    };
  }

  if (input.mode === "new") {
    if (!input.newUser) {
      throw new Error("Datos del nuevo usuario son obligatorios");
    }

    const data = normalizeStudentInput(input.newUser);

    const existing = await findUserByEmail(data.email);
    let user: MoodleUserSummary;

    if (existing) {
      const summary = await getMoodleUserById(existing.id);
      if (!summary) {
        throw new Error("Usuario existente en BD pero no se pudo recuperar");
      }
      user = summary;
    } else {
      const createdId = await createMoodleUser(data);
      const summary = await getMoodleUserById(createdId);
      if (!summary) {
        throw new Error("Usuario creado pero no se pudo recuperar");
      }
      user = summary;
    }

    if (await isUserEnrolledInCourse(user.id, input.courseId)) {
      return {
        status: "already_enrolled",
        message: `${user.fullname || user.username} ya esta matriculado en este curso`,
        user,
        courseId: input.courseId,
      };
    }

    await enrolUserInCourse(user.id, input.courseId);

    return {
      status: existing ? "enrolled" : "created_and_enrolled",
      message: existing
        ? `${user.fullname || user.username} ya existia y fue matriculado`
        : `${user.fullname || user.username} creado y matriculado correctamente`,
      user,
      courseId: input.courseId,
    };
  }

  throw new Error("Modo de matriculacion invalido");
}
