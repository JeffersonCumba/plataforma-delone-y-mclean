import { requireSession, badRequest, serverError } from "@/lib/auth";
import { syncFeedbackLanguageForTeacher } from "@/services/courseService";

const SUPPORTED_LANGUAGES = new Set(["es", "en", "pt"]);

interface FeedbackLanguageRequestBody {
  lang?: string;
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireSession();
  if (session instanceof Response) return session;

  let body: FeedbackLanguageRequestBody;
  try {
    body = (await request.json()) as FeedbackLanguageRequestBody;
  } catch {
    return badRequest("Cuerpo de la solicitud invalido");
  }

  const lang = body.lang?.trim().toLowerCase();

  if (!lang) {
    return badRequest("lang requerido");
  }

  if (!SUPPORTED_LANGUAGES.has(lang)) {
    return badRequest(`idioma no soportado: ${lang}`);
  }

  try {
    const updated = await syncFeedbackLanguageForTeacher(
      session.userId,
      lang,
    );

    return new Response(JSON.stringify({ ok: true, updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(
      "[feedback-language] Error al retraducir encuestas:",
      err,
    );
    return serverError("No se pudieron retraducir las encuestas");
  }
}