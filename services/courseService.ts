import "server-only";

import { cache } from "react";
import { z } from "zod";
import { type PoolConnection } from "mysql2/promise";
import { type ResultSetHeader, type RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { translateError } from "@/lib/errors";
import {
  createCourseSchema,
  type CreateCourseInput,
} from "@/lib/validations/course";
import { fetchMoodle, MoodleApiError } from "@/lib/moodle";
import type { Locale } from "@/i18n/locales";
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

type SurveyLanguage = "es" | "en" | "pt";

const LIKERT_PRESENTATION_ES =
  "r>>>>>1>>Totalmente en desacuerdo\r|2>>En desacuerdo\r|3>>Ni de acuerdo ni en desacuerdo\r|4>>De acuerdo\r|5>>Totalmente de acuerdo";

const LIKERT_PRESENTATION_EN =
  "r>>>>>1>>Strongly disagree\r|2>>Disagree\r|3>>Neither agree nor disagree\r|4>>Agree\r|5>>Strongly agree";

const LIKERT_PRESENTATION_PT =
  "r>>>>>1>>Discordo totalmente\r|2>>Discordo\r|3>>Nem concordo nem discordo\r|4>>Concordo\r|5>>Concordo totalmente";

const LIKERT_PRESENTATION: Record<SurveyLanguage, string> = {
  es: LIKERT_PRESENTATION_ES,
  en: LIKERT_PRESENTATION_EN,
  pt: LIKERT_PRESENTATION_PT,
};

const ES_QUESTIONS: DefaultQuestion[] = [
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

const EN_QUESTIONS: DefaultQuestion[] = [
  { dimension: "calidad_sys", text: "Is the system easy to use?" },
  {
    dimension: "calidad_sys",
    text: "Is the system user-friendly?",
  },
  {
    dimension: "calidad_sys",
    text: "Does the system respond quickly to requests?",
  },
  {
    dimension: "calidad_sys",
    text: "Is the system available whenever needed?",
  },
  {
    dimension: "calidad_info",
    text: "Is the information provided by the system accurate?",
  },
  {
    dimension: "calidad_info",
    text: "Is the information complete enough to perform my tasks?",
  },
  {
    dimension: "calidad_info",
    text: "Is the information up to date and timely?",
  },
  {
    dimension: "calidad_info",
    text: "Is the information presented in a useful format?",
  },
  {
    dimension: "calidad_serv",
    text: "Does the support staff have the necessary technical knowledge?",
  },
  {
    dimension: "calidad_serv",
    text: "Does support respond quickly to identified issues?",
  },
  {
    dimension: "calidad_serv",
    text: "Does support show genuine interest in resolving doubts?",
  },
  {
    dimension: "calidad_serv",
    text: "Does the system have clear manuals or help materials?",
  },
  {
    dimension: "uso_sistema",
    text: "Do I intend to keep using the system in the future?",
  },
  {
    dimension: "uso_sistema",
    text: "Do I use the system frequently to carry out my tasks?",
  },
  {
    dimension: "uso_sistema",
    text: "Is the system an essential part of my daily workflow?",
  },
  {
    dimension: "satis_user",
    text: "Am I satisfied with the overall functioning of the system?",
  },
  {
    dimension: "satis_user",
    text: "Does the system meet my initial use expectations?",
  },
  {
    dimension: "satis_user",
    text: "Do I feel the system is effective for meeting my needs?",
  },
  {
    dimension: "benef_netos",
    text: "Does the system improve my productivity at work?",
  },
  {
    dimension: "benef_netos",
    text: "Does the system help me make decisions more efficiently?",
  },
  {
    dimension: "benef_netos",
    text: "Does the system facilitate the achievement of my work objectives?",
  },
];

const PT_QUESTIONS: DefaultQuestion[] = [
  { dimension: "calidad_sys", text: "O sistema é fácil de usar?" },
  {
    dimension: "calidad_sys",
    text: "O sistema é amigável para o usuário?",
  },
  {
    dimension: "calidad_sys",
    text: "O sistema responde rapidamente às solicitações?",
  },
  {
    dimension: "calidad_sys",
    text: "O sistema está disponível sempre que necessário?",
  },
  {
    dimension: "calidad_info",
    text: "A informação fornecida pelo sistema é precisa?",
  },
  {
    dimension: "calidad_info",
    text: "A informação é completa para realizar minhas tarefas?",
  },
  {
    dimension: "calidad_info",
    text: "A informação está atualizada e é oportuna?",
  },
  {
    dimension: "calidad_info",
    text: "A informação é apresentada em um formato útil?",
  },
  {
    dimension: "calidad_serv",
    text: "A equipe de suporte tem os conhecimentos técnicos necessários?",
  },
  {
    dimension: "calidad_serv",
    text: "O suporte responde rapidamente aos problemas detectados?",
  },
  {
    dimension: "calidad_serv",
    text: "O suporte demonstra interesse genuíno em resolver as dúvidas?",
  },
  {
    dimension: "calidad_serv",
    text: "O sistema possui manuais ou materiais de ajuda claros?",
  },
  {
    dimension: "uso_sistema",
    text: "Tenho a intenção de continuar usando o sistema no futuro?",
  },
  {
    dimension: "uso_sistema",
    text: "Uso o sistema com frequência para realizar minhas tarefas?",
  },
  {
    dimension: "uso_sistema",
    text: "O sistema é uma parte essencial do meu fluxo de trabalho diário?",
  },
  {
    dimension: "satis_user",
    text: "Estou satisfeito com o funcionamento geral do sistema?",
  },
  {
    dimension: "satis_user",
    text: "O sistema atende às minhas expectativas iniciais de uso?",
  },
  {
    dimension: "satis_user",
    text: "Sinto que o sistema é eficaz para atender às minhas necessidades?",
  },
  {
    dimension: "benef_netos",
    text: "O sistema melhora minha produtividade no trabalho?",
  },
  {
    dimension: "benef_netos",
    text: "O sistema me ajuda a tomar decisões de forma mais eficiente?",
  },
  {
    dimension: "benef_netos",
    text: "O sistema facilita o cumprimento dos meus objetivos de trabalho?",
  },
];

const SURVEY_QUESTIONS: Record<SurveyLanguage, DefaultQuestion[]> = {
  es: ES_QUESTIONS,
  en: EN_QUESTIONS,
  pt: PT_QUESTIONS,
};

function getSurveyQuestions(lang: string): DefaultQuestion[] {
  const language: SurveyLanguage =
    lang === "en" || lang === "pt" ? lang : "es";
  return SURVEY_QUESTIONS[language];
}

function getSurveyPresentation(lang: string): string {
  const language: SurveyLanguage =
    lang === "en" || lang === "pt" ? lang : "es";
  return LIKERT_PRESENTATION[language];
}

function validateCreateCourseInput(
  input: CreateCourseInput,
  locale: Locale,
): CreateCourseInput {
  try {
    return createCourseSchema(locale).parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        error.issues[0]?.message ?? translateError(locale, "course.invalidData"),
      );
    }

    throw error;
  }
}

async function getCourseContextId(
  courseId: number,
  locale: Locale,
): Promise<number> {
  const [rows] = await pool.execute<CourseContextRow[]>(
    "SELECT id, path, depth FROM mdl_context WHERE contextlevel = 50 AND instanceid = ? LIMIT 1",
    [courseId],
  );

  const contextId = rows[0]?.id;

  if (!contextId) {
    throw new Error(translateError(locale, "course.contextNotFound"));
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
  lang: Locale,
): Promise<void> {
  const connection = await pool.getConnection();
  const now = Math.floor(Date.now() / 1000);
  const questions = getSurveyQuestions(lang);
  const presentation = getSurveyPresentation(lang);

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
    for (const question of questions) {
      await connection.execute(
        `INSERT INTO mdl_feedback_item
          (feedback, template, name, label, presentation, typ, hasvalue, position,
           required, dependitem, dependvalue, options)
         VALUES (?, 0, ?, ?, ?, 'multichoice', 1, ?, 0, 0, '', 'h')`,
        [
          feedbackId,
          question.text,
          question.dimension,
          presentation,
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
      throw new Error(translateError(lang, "course.feedbackModuleNotFound"));
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
      throw new Error(translateError(lang, "course.feedbackContextNotFound"));
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
  lang: Locale,
): Promise<MoodleCourse> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(translateError(lang, "course.invalidSession"));
  }

  const data = validateCreateCourseInput(input, lang);
  const categoryId = Number(process.env.MOODLE_DEFAULT_CATEGORY_ID ?? 1);
  const teacherRoleId = Number(process.env.MOODLE_TEACHER_ROLE_ID ?? 4);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error(
      translateError(lang, "course.categoryNotConfigured"),
    );
  }

  if (!Number.isInteger(teacherRoleId) || teacherRoleId <= 0) {
    throw new Error(translateError(lang, "course.teacherRoleNotConfigured"));
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
      throw new Error(translateError(lang, "course.notReturned"));
    }
    console.log("[crearCursoProfesor] Moodle response:", JSON.stringify(createdCourse));

    await fetchMoodle<unknown>("enrol_manual_enrol_users", {
      "enrolments[0][roleid]": String(teacherRoleId),
      "enrolments[0][userid]": String(userId),
      "enrolments[0][courseid]": String(createdCourse.id),
    });

    const courseContextId = await getCourseContextId(createdCourse.id, lang);

    await fetchMoodle<unknown>("core_role_assign_roles", {
      "assignments[0][roleid]": String(teacherRoleId),
      "assignments[0][userid]": String(userId),
      "assignments[0][contextid]": String(courseContextId),
    });

    await createDefaultFeedbackInCourse(
      createdCourse.id,
      createdCourse.shortname,
      lang,
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
      throw new Error(translateError(lang, "course.createFailed"));
    }
    throw error;
  }
}

export const obtenerCursosProfesor = cache(async function obtenerCursosProfesor(
  userId: number,
  locale: Locale = "es",
): Promise<MoodleCourse[]> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(translateError(locale, "course.invalidUserId"));
  }

  const courses = await fetchMoodle<MoodleCourse[]>(
    "core_enrol_get_users_courses",
    {
      userid: String(userId),
    },
  );

  return Array.isArray(courses) ? courses : [];
});

interface FeedbackItemRow extends RowDataPacket {
  id: number;
  label: string;
  position: number;
}

export async function syncFeedbackLanguageInCourse(
  courseId: number,
  lang: string,
): Promise<number> {
  const connection = await pool.getConnection();
  const questions = getSurveyQuestions(lang ?? "es");
  const presentation = getSurveyPresentation(lang ?? "es");

  try {
    await connection.beginTransaction();

    const [feedbacks] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM mdl_feedback WHERE course = ?",
      [courseId],
    );

    let updated = 0;

    for (const feedback of feedbacks as Array<{ id: number }>) {
      const [items] = await connection.execute<FeedbackItemRow[]>(
        `SELECT id, label, position FROM mdl_feedback_item
         WHERE feedback = ? ORDER BY position ASC`,
        [feedback.id],
      );

      for (const item of items) {
        const expected = questions[item.position - 1];
        if (!expected) continue;
        if (item.label !== expected.dimension) continue;
        await connection.execute(
          "UPDATE mdl_feedback_item SET name = ?, presentation = ? WHERE id = ?",
          [expected.text, presentation, item.id],
        );
        updated += 1;
      }
    }

    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function syncFeedbackLanguageForTeacher(
  userId: number,
  lang: string,
): Promise<number> {
  const courses = await obtenerCursosProfesor(userId);
  let total = 0;

  for (const course of courses) {
    total += await syncFeedbackLanguageInCourse(course.id, lang);
  }

  return total;
}
