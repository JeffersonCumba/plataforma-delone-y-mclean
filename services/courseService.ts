import "server-only";

import { cache } from "react";
import { z } from "zod";
import { type PoolConnection } from "mysql2/promise";
import { type ResultSetHeader, type RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import {
  createCourseSchema,
  type CreateCourseInput,
} from "@/lib/validations/course";
import { fetchMoodle, MoodleApiError } from "@/lib/moodle";
import type { MoodleCourse } from "@/types/course";
import type { DimensionKey } from "@/types/analytics";

interface CreatedCourseResponse {
  id: number;
  fullname: string;
  shortname: string;
  summary?: string;
  idnumber?: string;
}

interface CourseContextRow extends RowDataPacket {
  id: number;
  path: string | null;
  depth: number;
}

interface SectionRow extends RowDataPacket {
  id: number;
  sequence: string | null;
}

interface SectionData {
  id: number;
  sequence: string;
}

interface ModuleRow extends RowDataPacket {
  id: number;
}

interface DefaultQuestion {
  dimension: DimensionKey;
  text: string;
}

const LIKERT_PRESENTATION =
  "r>>>>>1>>Totalmente en desacuerdo\r|2>>En desacuerdo\r|3>>Ni de acuerdo ni en desacuerdo\r|4>>De acuerdo\r|5>>Totalmente de acuerdo";

const DEFAULT_QUESTIONS: DefaultQuestion[] = [
  { dimension: "calidad_sys", text: "¿Es el sistema fácil de usar?" },
  {
    dimension: "calidad_sys",
    text: "¿Es el sistema amigable para el usuario?",
  },
  {
    dimension: "calidad_sys",
    text: "¿El sistema responde rápidamente a las solicitudes?",
  },
  {
    dimension: "calidad_sys",
    text: "¿El sistema está disponible siempre que se necesita?",
  },
  {
    dimension: "calidad_info",
    text: "¿Es la información proporcionada por el sistema precisa?",
  },
  {
    dimension: "calidad_info",
    text: "¿Es la información completa para realizar mis tareas?",
  },
  {
    dimension: "calidad_info",
    text: "¿Está la información actualizada y es oportuna?",
  },
  {
    dimension: "calidad_info",
    text: "¿Se presenta la información en un formato útil?",
  },
  {
    dimension: "calidad_serv",
    text: "¿El personal de soporte tiene los conocimientos técnicos necesarios?",
  },
  {
    dimension: "calidad_serv",
    text: "¿El soporte responde rápidamente ante los problemas detectados?",
  },
  {
    dimension: "calidad_serv",
    text: "¿El soporte muestra un interés genuino en resolver las dudas?",
  },
  {
    dimension: "calidad_serv",
    text: "¿El sistema cuenta con manuales o materiales de ayuda claros?",
  },
  {
    dimension: "uso_sistema",
    text: "¿Tengo la intención de seguir usando el sistema en el futuro?",
  },
  {
    dimension: "uso_sistema",
    text: "¿Utilizo el sistema frecuentemente para realizar mis labores?",
  },
  {
    dimension: "uso_sistema",
    text: "¿Es el sistema una parte esencial de mi flujo de trabajo diario?",
  },
  {
    dimension: "satis_user",
    text: "¿Estoy satisfecho con el funcionamiento general del sistema?",
  },
  {
    dimension: "satis_user",
    text: "¿El sistema cumple con mis expectativas iniciales de uso?",
  },
  {
    dimension: "satis_user",
    text: "¿Siento que el sistema es eficaz para cubrir mis necesidades?",
  },
  {
    dimension: "benef_netos",
    text: "¿El sistema mejora mi productividad en el trabajo?",
  },
  {
    dimension: "benef_netos",
    text: "¿El sistema me ayuda a tomar decisiones de manera más eficiente?",
  },
  {
    dimension: "benef_netos",
    text: "¿El sistema facilita el cumplimiento de mis objetivos laborales?",
  },
];

function validateCreateCourseInput(
  input: CreateCourseInput,
): CreateCourseInput {
  try {
    return createCourseSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        error.issues[0]?.message ?? "Datos invalidos para crear curso",
      );
    }

    throw error;
  }
}

async function getCourseContextId(courseId: number): Promise<number> {
  const [rows] = await pool.execute<CourseContextRow[]>(
    "SELECT id, path, depth FROM mdl_context WHERE contextlevel = 50 AND instanceid = ? LIMIT 1",
    [courseId],
  );

  const contextId = rows[0]?.id;

  if (!contextId) {
    throw new Error("No se encontro el contexto del curso creado");
  }

  return contextId;
}

async function ensureSectionZero(
  connection: PoolConnection,
  courseId: number,
  now: number,
): Promise<SectionData> {
  const [sections] = await connection.execute<SectionRow[]>(
    "SELECT id, sequence FROM mdl_course_sections WHERE course = ? AND section = 0 LIMIT 1",
    [courseId],
  );

  if (sections[0]) {
    return {
      id: Number(sections[0].id),
      sequence: sections[0].sequence ?? "",
    };
  }

  const [insertResult] = await connection.execute(
    `INSERT INTO mdl_course_sections
      (course, section, name, summary, summaryformat, sequence, visible, timemodified)
     VALUES (?, 0, NULL, '', 1, '', 1, ?)`,
    [courseId, now],
  );

  const sectionId = Number((insertResult as ResultSetHeader).insertId);
  return { id: sectionId, sequence: "" };
}

export async function createDefaultFeedbackInCourse(
  courseId: number,
  courseShortname: string,
): Promise<void> {
  const connection = await pool.getConnection();
  const now = Math.floor(Date.now() / 1000);

  try {
    await connection.beginTransaction();

    const [feedbackResult] = await connection.execute(
      `INSERT INTO mdl_feedback
        (course, name, intro, introformat, anonymous, email_notification, multiple_submit,
         autonumbering, site_after_submit, page_after_submit, page_after_submitformat,
         publish_stats, timeopen, timeclose, timemodified, completionsubmit)
       VALUES (?, ?, '', 1, 1, 0, 0, 0, '', '', 1, 0, 0, 0, ?, 0)`,
      [courseId, `Cuestionario DeLone y McLean - ${courseShortname}`, now],
    );

    const feedbackId = Number((feedbackResult as ResultSetHeader).insertId);

    let position = 1;
    for (const question of DEFAULT_QUESTIONS) {
      await connection.execute(
        `INSERT INTO mdl_feedback_item
          (feedback, template, name, label, presentation, typ, hasvalue, position,
           required, dependitem, dependvalue, options)
         VALUES (?, 0, ?, ?, ?, 'multichoice', 1, ?, 0, 0, '', 'h')`,
        [
          feedbackId,
          question.text,
          question.dimension,
          LIKERT_PRESENTATION,
          position,
        ],
      );
      position += 1;
    }

    const [moduleRows] = await connection.execute<ModuleRow[]>(
      "SELECT id FROM mdl_modules WHERE name = 'feedback' LIMIT 1",
    );

    const feedbackModuleId = moduleRows[0]?.id;
    if (!feedbackModuleId) {
      throw new Error("No se encontro el modulo feedback en Moodle");
    }

    const section = await ensureSectionZero(connection, courseId, now);

    const [courseModuleResult] = await connection.execute(
      `INSERT INTO mdl_course_modules
        (course, module, instance, section, idnumber, added, score, indent, visible,
         visibleoncoursepage, visibleold, groupmode, groupingid, completion,
         completiongradeitemnumber, completionview, completionexpected,
         completionpassgrade, showdescription, availability, deletioninprogress,
         downloadcontent)
       VALUES (?, ?, ?, ?, '', ?, 0, 0, 1, 1, 1, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, 0, 1)`,
      [courseId, feedbackModuleId, feedbackId, section.id, now],
    );

    const courseModuleId = Number(
      (courseModuleResult as ResultSetHeader).insertId,
    );

    const nextSequence = section.sequence
      ? `${section.sequence},${courseModuleId}`
      : String(courseModuleId);

    await connection.execute(
      "UPDATE mdl_course_sections SET sequence = ?, timemodified = ? WHERE id = ?",
      [nextSequence, now, section.id],
    );

    const [courseContextRows] = await connection.execute<CourseContextRow[]>(
      "SELECT id, path, depth FROM mdl_context WHERE contextlevel = 50 AND instanceid = ? LIMIT 1",
      [courseId],
    );

    const courseContext = courseContextRows[0];
    if (!courseContext?.id || !courseContext.path || !courseContext.depth) {
      throw new Error("No se encontro el contexto del curso para el feedback");
    }

    const [moduleContextResult] = await connection.execute(
      "INSERT INTO mdl_context (contextlevel, instanceid, path, depth, locked) VALUES (70, ?, NULL, 0, 0)",
      [courseModuleId],
    );

    const moduleContextId = Number(
      (moduleContextResult as ResultSetHeader).insertId,
    );
    const moduleContextPath = `${courseContext.path}/${moduleContextId}`;
    const moduleContextDepth = courseContext.depth + 1;

    await connection.execute(
      "UPDATE mdl_context SET path = ?, depth = ? WHERE id = ?",
      [moduleContextPath, moduleContextDepth, moduleContextId],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function crearCursoProfesor(
  userId: number,
  input: CreateCourseInput,
): Promise<MoodleCourse> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Sesion invalida para crear curso");
  }

  const data = validateCreateCourseInput(input);
  const categoryId = Number(process.env.MOODLE_DEFAULT_CATEGORY_ID ?? 1);
  const teacherRoleId = Number(process.env.MOODLE_TEACHER_ROLE_ID ?? 4);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error(
      "MOODLE_DEFAULT_CATEGORY_ID no esta configurado correctamente",
    );
  }

  if (!Number.isInteger(teacherRoleId) || teacherRoleId <= 0) {
    throw new Error("MOODLE_TEACHER_ROLE_ID no esta configurado correctamente");
  }

  try {
    const createdCourses = await fetchMoodle<CreatedCourseResponse[]>(
      "core_course_create_courses",
      {
        "courses[0][fullname]": data.fullname,
        "courses[0][shortname]": data.shortname,
        "courses[0][categoryid]": String(categoryId),
        "courses[0][summary]": data.summary,
        "courses[0][summaryformat]": "1",
        "courses[0][visible]": "1",
        "courses[0][format]": "topics",
      },
    );

    const createdCourse = createdCourses?.[0];
    if (!createdCourse?.id) {
      throw new Error("Moodle no devolvio el curso creado");
    }
    console.log("[crearCursoProfesor] Moodle response:", JSON.stringify(createdCourse));

    await fetchMoodle<unknown>("enrol_manual_enrol_users", {
      "enrolments[0][roleid]": String(teacherRoleId),
      "enrolments[0][userid]": String(userId),
      "enrolments[0][courseid]": String(createdCourse.id),
    });

    const courseContextId = await getCourseContextId(createdCourse.id);

    await fetchMoodle<unknown>("core_role_assign_roles", {
      "assignments[0][roleid]": String(teacherRoleId),
      "assignments[0][userid]": String(userId),
      "assignments[0][contextid]": String(courseContextId),
    });

    await createDefaultFeedbackInCourse(
      createdCourse.id,
      createdCourse.shortname,
    );

    return {
      id: createdCourse.id,
      fullname: createdCourse.fullname ?? data.fullname,
      shortname: createdCourse.shortname ?? data.shortname,
      summary: createdCourse.summary ?? data.summary,
      idnumber: createdCourse.idnumber ?? "",
    };
  } catch (error) {
    console.error("[crearCursoProfesor]", error);
    if (error instanceof MoodleApiError) {
      throw new Error("Error al crear el curso en Moodle. Verifica los datos e intenta de nuevo.");
    }
    throw error;
  }
}

export const obtenerCursosProfesor = cache(async function obtenerCursosProfesor(
  userId: number,
): Promise<MoodleCourse[]> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("El userId no es valido para consultar cursos");
  }

  const courses = await fetchMoodle<MoodleCourse[]>(
    "core_enrol_get_users_courses",
    {
      userid: String(userId),
    },
  );

  return Array.isArray(courses) ? courses : [];
});
