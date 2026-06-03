import OpenAI from "openai";
import { cookies } from "next/headers";

import {
  DIMENSIONS_MAP,
  type AnalyticsData,
} from "@/types/analytics";
import { obtenerCursosProfesor } from "@/services/courseService";

interface ChatRequestBody {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

interface UpstashChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const OPENAI_MODEL = "gpt-4o-mini";

function buildSystemPrompt(
  courseName: string,
  analytics: AnalyticsData,
): string {
  const criticalBlock = analytics.criticalQuestions
    .map(
      (item) =>
        `- "${item.question}" (${DIMENSIONS_MAP[item.dimension]}) -> ${item.average.toFixed(2)}/5`,
    )
    .join("\n");

  const betaBlock = analytics.betaCoefficients
    .map((beta) => `- ${beta.name}: beta = ${beta.value.toFixed(3)}`)
    .join("\n");

  const dimensionBlock = analytics.dimensionChartData
    .map((dim) => `- ${dim.name}: ${dim.score.toFixed(2)}/5`)
    .join("\n");

  const satisfactionBlock = analytics.satisfactionDistribution
    .map(
      (item) =>
        `- ${item.name}: ${item.value} alumnos (${item.percentage.toFixed(1)}%)`,
    )
    .join("\n");

  const frequenciesBlock = analytics.questionFrequencies
    .map((q) => {
      const total =
        q["Totalmente en desacuerdo"] +
        q["En desacuerdo"] +
        q.Neutral +
        q["De acuerdo"] +
        q["Totalmente de acuerdo"];
      const mean =
        total > 0
          ? (
              (q["Totalmente en desacuerdo"] * 1 +
                q["En desacuerdo"] * 2 +
                q.Neutral * 3 +
                q["De acuerdo"] * 4 +
                q["Totalmente de acuerdo"] * 5) /
              total
            ).toFixed(2)
          : "0.00";
      return `- ${q.pregunta} [${DIMENSIONS_MAP[q.dimension]}] (n=${total}, media=${mean}/5)`;
    })
    .join("\n");

  return [
    "Eres un analista experto en el Modelo de Exito de Sistemas de Informacion de DeLone y McLean.",
    "Asistes a un profesor interpretando los resultados analiticos de su curso en Moodle.",
    "",
    "### Reglas de respuesta (estrictas)",
    "- Responde SIEMPRE en espanol.",
    "- Se extremadamente conciso: usa 1 frase de titulo + maximo 3 a 5 viñetas cortas.",
    "- Cada viñeta: una sola idea, maximo 1-2 lineas. Sin parrafos largos.",
    "- Ve directo al punto: que significa el dato, por que importa, que hacer.",
    "- Prioriza lo mas importante: primero alertas criticas, luego conductores causales, luego el resto.",
    "- Cita numeros especificos del contexto cuando refuercen la conclusion.",
    "- Si sugieren acciones, alinealas a las 6 dimensiones DeLone y McLean.",
    "- Si el usuario pide algo que no esta en los datos, indicalo brevemente sin inventar.",
    "- Evita introducciones, conclusiones largas, relleno y cortesia innecesaria.",
    "",
    "### Contexto del curso",
    `Curso: ${courseName}`,
    `Encuestas respondidas: ${analytics.totalSurveys} de ${analytics.totalRespondents} (${analytics.responseRate.toFixed(1)}%)`,
    `Alfa de Cronbach (fiabilidad global): ${analytics.cronbachAlpha.toFixed(3)}`,
    "",
    "### Promedio por dimension (Likert 1-5)",
    dimensionBlock,
    "",
    "### Distribucion de satisfaccion global",
    satisfactionBlock,
    "",
    "### Betas de regresion (impacto sobre la satisfaccion)",
    betaBlock,
    "",
    "### Preguntas criticas (promedio < 3.0)",
    criticalBlock || "Sin preguntas criticas detectadas.",
    "",
    "### Frecuencias por pregunta (resumen)",
    frequenciesBlock,
  ].join("\n");
}

function unauthorized(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function forbidden(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get("user_id")?.value);

  if (!Number.isInteger(userId) || userId <= 0) {
    return unauthorized("Sesion invalida");
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return badRequest("Cuerpo de la solicitud invalido");
  }

  const { courseId, courseName, analytics, messages } = body;

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return badRequest("courseId invalido");
  }

  if (typeof courseName !== "string" || courseName.length === 0) {
    return badRequest("courseName requerido");
  }

  if (!analytics || !Array.isArray(messages)) {
    return badRequest("messages y analytics son requeridos");
  }

  const courses = await obtenerCursosProfesor(userId);
  if (!courses.some((course) => course.id === courseId)) {
    return forbidden("No tienes acceso a este curso");
  }

  const sanitizedHistory: UpstashChatMessage[] = messages
    .filter(
      (entry) =>
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        entry.content.trim().length > 0,
    )
    .slice(-12)
    .map((entry) => ({ role: entry.role, content: entry.content.trim() }));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ message: "OPENAI_API_KEY no configurada" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    stream: true,
    temperature: 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt(courseName, analytics) },
      ...sanitizedHistory,
    ],
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error desconocido";
        controller.enqueue(
          encoder.encode(`\n\n[Error del modelo: ${message}]`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
