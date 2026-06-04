import OpenAI from "openai";
import { cookies } from "next/headers";

import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { type AnalyticsData } from "@/types/analytics";
import { obtenerCursosProfesor } from "@/services/courseService";

interface InterpretRequestBody {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  prompt: string;
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = "openai/gpt-oss-120b";
const APP_REFERER =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const APP_TITLE = "Plataforma DeLone y McLean";

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

  let body: InterpretRequestBody;
  try {
    body = (await request.json()) as InterpretRequestBody;
  } catch {
    return badRequest("Cuerpo de la solicitud invalido");
  }

  const { courseId, courseName, analytics, prompt } = body;

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return badRequest("courseId invalido");
  }

  if (typeof courseName !== "string" || courseName.length === 0) {
    return badRequest("courseName requerido");
  }

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return badRequest("prompt requerido");
  }

  if (!analytics) {
    return badRequest("analytics requerido");
  }

  const courses = await obtenerCursosProfesor(userId);
  if (!courses.some((course) => course.id === courseId)) {
    return forbidden("No tienes acceso a este curso");
  }

  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ message: "OPEN_ROUTER_API_KEY no configurada" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": APP_REFERER,
      "X-Title": APP_TITLE,
    },
  });

  const completion = await client.chat.completions.create({
    model: OPENROUTER_MODEL,
    stream: true,
    temperature: 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt(courseName, analytics) },
      { role: "user", content: prompt.trim() },
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
