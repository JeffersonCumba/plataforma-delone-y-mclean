import OpenAI from "openai";

import type { Locale } from "@/i18n/locales";
import { type AnalyticsData } from "@/types/analytics";
import { obtenerCursosProfesor } from "@/services/courseService";
import { translateError } from "@/lib/errors";
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
  locale: Locale,
): Promise<Response | null> {
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return badRequest(translateError(locale, "ai.invalidCourseId"));
  }
  const courses = await obtenerCursosProfesor(userId, locale);
  if (!courses.some((course) => course.id === courseId)) {
    return forbidden(translateError(locale, "ai.noCourseAccess"));
  }
  return null;
}

export function createClient(
  locale: Locale,
): { apiKey: string; client: OpenAI } | Response {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return serverError(translateError(locale, "ai.openRouterNotConfigured"));
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
  locale: Locale,
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
          error instanceof Error
            ? error.message
            : translateError(locale, "ai.unknownError");
        controller.enqueue(
          encoder.encode(
            `\n\n[${translateError(locale, "ai.modelError", { message })}]`,
          ),
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
