import { fetchMoodle } from "@/lib/moodle";
import { requireSession, badRequest, serverError } from "@/lib/auth";

const SUPPORTED_LANGUAGES = new Set(["es", "en", "pt"]);

interface LanguageRequestBody {
  lang?: string;
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireSession();
  if (session instanceof Response) return session;

  let body: LanguageRequestBody;
  try {
    body = (await request.json()) as LanguageRequestBody;
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
    await fetchMoodle<unknown>("core_user_update_user_preferences", {
      userid: String(session.userId),
      "preferences[0][type]": "lang",
      "preferences[0][value]": lang,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[moodle/language] Error al sincronizar idioma:", err);
    return serverError("No se pudo sincronizar el idioma con Moodle");
  }
}