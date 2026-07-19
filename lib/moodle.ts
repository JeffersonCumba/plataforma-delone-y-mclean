import "server-only";

const MOODLE_URL = process.env.MOODLE_BASE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
const FETCH_TIMEOUT_MS = 15_000;

if (!MOODLE_URL) {
  throw new Error("Variable de entorno faltante: MOODLE_BASE_URL");
}
if (!MOODLE_TOKEN) {
  throw new Error("Variable de entorno faltante: MOODLE_TOKEN");
}

const wsToken = MOODLE_TOKEN as string;
const REST_ENDPOINT = `${MOODLE_URL}/webservice/rest/server.php`;

export interface MoodleError {
  exception: string;
  errorcode?: string;
  message: string;
}

export class MoodleApiError extends Error {
  constructor(
    public readonly wsFunction: string,
    public readonly exception: string,
    public readonly errorcode: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "MoodleApiError";
  }
}

const isMoodleError = (value: unknown): value is MoodleError => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<MoodleError>;
  return (
    typeof candidate.exception === "string" &&
    typeof candidate.message === "string"
  );
};

export async function fetchMoodle<T>(
  wsFunction: string,
  params: Record<string, string> = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const body = new URLSearchParams({
    wstoken: wsToken,
    wsfunction: wsFunction,
    moodlewsrestformat: "json",
    ...params,
  });

  try {
    const response = await fetch(REST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Moodle: estado ${response.status} ${response.statusText}`,
      );
    }

    let payload: unknown;

    try {
      payload = (await response.json()) as unknown;
    } catch {
      throw new Error("La respuesta de Moodle no es JSON valido");
    }

    if (isMoodleError(payload)) {
      throw new MoodleApiError(
        wsFunction,
        payload.exception,
        payload.errorcode,
        payload.message,
      );
    }

    return payload as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
