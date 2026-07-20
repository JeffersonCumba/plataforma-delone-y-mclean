import OpenAI from "openai";

import { type AnalyticsData } from "@/types/analytics";
import { obtenerCursosProfesor } from "@/services/courseService";
import {
  unauthorized,
  badRequest,
  forbidden,
  serverError,
} from "@/lib/auth";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const APP_REFERER =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const APP_TITLE = "Plataforma DeLone y McLean";

export async function validateCourseAccess(
  userId: number,
  courseId: number,
): Promise<Response | null> {
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return badRequest("courseId invalido");
  }
  const courses = await obtenerCursosProfesor(userId);
  if (!courses.some((course) => course.id === courseId)) {
    return forbidden("No tienes acceso a este curso");
  }
  return null;
}

export function createClient(): { apiKey: string; client: OpenAI } | Response {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return serverError("OPEN_ROUTER_API_KEY no configurada");
  }
  const client = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": APP_REFERER,
      "X-Title": APP_TITLE,
    },
  });
  return { apiKey, client };
}

export function createStreamResponse(
  completion: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
): Response {
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
