import { requireSession, badRequest, serverError } from "@/lib/auth";
import { syncFeedbackLanguageForTeacher } from "@/services/courseService";
import { translateError } from "@/lib/errors";
import { getServerLocale } from "@/lib/server-locale";

const SUPPORTED_LANGUAGES = new Set(["es", "en", "pt"]);

interface FeedbackLanguageRequestBody {
  lang?: string;
}

export async function POST(request: Request): Promise<Response> {
  const locale = await getServerLocale();
  const session = await requireSession();
  if (session instanceof Response) return session;

  let body: FeedbackLanguageRequestBody;
  try {
    body = (await request.json()) as FeedbackLanguageRequestBody;
  } catch {
    return badRequest(translateError(locale, "api.invalidBody"));
  }

  const lang = body.lang?.trim().toLowerCase();

  if (!lang) {
    return badRequest(translateError(locale, "api.langRequired"));
  }

  if (!SUPPORTED_LANGUAGES.has(lang)) {
    return badRequest(translateError(locale, "api.unsupportedLang", { lang }));
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
    return serverError(translateError(locale, "api.retranslateFailed"));
  }
}