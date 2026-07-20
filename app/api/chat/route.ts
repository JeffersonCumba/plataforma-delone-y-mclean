import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { type AnalyticsData } from "@/types/analytics";
import {
  createClient,
  createStreamResponse,
  validateCourseAccess,
} from "@/lib/ai-stream";
import { requireSession, badRequest } from "@/lib/auth";

interface ChatRequestBody {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

const OPENROUTER_MODEL = "openai/gpt-oss-120b";

export async function POST(request: Request): Promise<Response> {
  const session = await requireSession();
  if (session instanceof Response) return session;

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

  const accessError = await validateCourseAccess(session.userId, courseId);
  if (accessError) return accessError;

  const sanitizedHistory = messages
    .filter(
      (entry) =>
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        entry.content.trim().length > 0,
    )
    .slice(-12)
    .map((entry) => ({ role: entry.role, content: entry.content.trim() }));

  const clientResult = createClient();
  if (clientResult instanceof Response) return clientResult;

  const completion = await clientResult.client.chat.completions.create({
    model: OPENROUTER_MODEL,
    stream: true,
    temperature: 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt(courseName, analytics) },
      ...sanitizedHistory,
    ],
  });

  return createStreamResponse(completion);
}
