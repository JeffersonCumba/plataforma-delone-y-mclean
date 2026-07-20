import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { type AnalyticsData } from "@/types/analytics";
import {
  createClient,
  createStreamResponse,
  validateCourseAccess,
} from "@/lib/ai-stream";
import { requireSession, badRequest } from "@/lib/auth";

interface InterpretRequestBody {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  prompt: string;
}

const OPENROUTER_MODEL = "openai/gpt-oss-120b";

export async function POST(request: Request): Promise<Response> {
  const session = await requireSession();
  if (session instanceof Response) return session;

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

  const accessError = await validateCourseAccess(session.userId, courseId);
  if (accessError) return accessError;

  const clientResult = createClient();
  if (clientResult instanceof Response) return clientResult;

  const completion = await clientResult.client.chat.completions.create({
    model: OPENROUTER_MODEL,
    stream: true,
    temperature: 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt(courseName, analytics) },
      { role: "user", content: prompt.trim() },
    ],
  });

  return createStreamResponse(completion);
}
